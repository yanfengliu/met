/**
 * Boot (docs/design/spec.md, Modules): query, sequence, timeline, viewer, player, walk mode, UI, frame loop and the read-only `window.__met`.
 * Frames render on demand: when t, the camera, the cut or the size changed, and for the first 5 frames, after which `window.__shotReady` is set.
 */
import { Ray, Vector3 } from 'three';

import { Player } from './build/player.js';
import type { Speed } from './build/player.js';
import { chapterRanges, selectSteps } from './build/select.js';
import { SEQUENCE } from './build/sequence.js';
import { Timeline } from './build/timeline.js';
import type { BuiltStep } from './build/timeline.js';
import { CATALOGUE } from './model/collection/catalogue.js';
import { DOORS } from './model/doors.js';
import { doorLeavesOf } from './model/lib/window.js';
import { cardContent } from './ui/art-card.js';
import type { ArtCardContent } from './ui/art-card.js';
import { showError } from './ui/error-panel.js';
import { installStyles } from './ui/styles.js';
import { createUi } from './ui/ui.js';
import type { UiState, WalkStatus } from './ui/ui.js';
import { GeometryBvhs } from './walk/bvh-cache.js';
import { DEFAULT_SPAWN, SPAWNS, spawnById } from './walk/spawns.js';
import { WalkMode } from './walk/walk-mode.js';
import { ARTWORK_QUERY, ArtLabel, artworkInstances } from './viewer/art-label.js';
import { bindClick } from './viewer/click.js';
import { DoorLayer } from './viewer/doors.js';
import type { DoorDrawn } from './viewer/doors.js';
import { publishFacts, snapshot } from './viewer/facts.js';
import { FloorMode } from './viewer/floor-mode.js';
import { FloorView } from './viewer/floor-view.js';
import { ALL_FLOORS, FLOORS, floorById, floorPose, floorStep, startFloor } from './viewer/floors.js';
import { orbitKeyMove, orbitKeys } from './viewer/orbit-keys.js';
import { ModelPicker } from './viewer/pick.js';
import { DEFAULT_FOV, DEFAULT_PRESET, PRESETS, presetById, resolvePreset } from './viewer/presets.js';
import type { CameraPose } from './viewer/presets.js';
import { opensReplay, readQuery, shouldAutoplay, startPosition } from './viewer/query.js';
import { capsMesh } from './viewer/section-cut.js';
import { Viewer } from './viewer/viewer.js';
import { pointerRay } from './viewer/zoom.js';

const READY_FRAMES = 5;
/** Longest wall-time step one frame may advance the player, so a stalled tab does not jump the build. */
const MAX_FRAME_SECONDS = 0.1;

/** The step the follow camera frames: the one playing, or about to play in the direction of travel. */
function stepInMotion(steps: readonly BuiltStep[], t: number, direction: 1 | -1): BuiltStep | undefined {
  const index = direction === 1 ? Math.floor(t) : Math.ceil(t) - 1;
  return steps[Math.min(Math.max(index, 0), steps.length - 1)];
}

const vec = (v: Vector3): [number, number, number] => [v.x, v.y, v.z];

function boot(): void {
  const query = readQuery();
  const warnings = [...query.warnings];
  let steps = selectSteps(SEQUENCE, query.solo);
  if (steps === null) {
    warnings.push(`Query parameter solo="${String(query.solo)}" names no chapter; use one of ${chapterRanges(SEQUENCE).map((r) => r.chapter.id).join(', ')}. It is ignored.`);
    steps = SEQUENCE;
  }

  // The timeline build alone: modules have already loaded, with whatever geometry they build on import. The 4 s budget gate times readyMs,
  // which runs from navigation start and so includes that (tests/e2e/layout.spec.ts).
  performance.mark('met:build-start');
  const timeline = new Timeline(steps);
  performance.mark('met:build-end');
  const buildMs = performance.measure('met:build', 'met:build-start', 'met:build-end').duration;

  const start = startPosition(query, steps.map((s) => s.id));
  warnings.push(...start.warnings);
  timeline.evaluate(start.t);

  installStyles();
  const app = document.createElement('div');
  app.className = query.noui ? 'met-app met-noui' : 'met-app';
  const viewport = document.createElement('div');
  viewport.className = 'met-viewport';
  app.appendChild(viewport);
  document.body.appendChild(app);

  // The section cut's cap pass leaves out transparent meshes, those whose material the cut does not clip and sheets (src/viewer/section-cut.ts
  // `capsMesh`); of the others, every one closed along vertical lines, it draws the pieces the cut passes through (src/viewer/cap-pass.ts).
  const meshes = timeline.steps.flatMap((s) => s.meshes);
  const capped = meshes.filter(capsMesh);
  // The door layer (src/viewer/doors.ts): once a door's step is complete, stand-ins turned about their hinges draw its leaves in place of the timeline's
  // closed ones, which it hides by their layer mask; the cap pass and the picker take the stand-ins too.
  const doors = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf, query.doors ?? 'closed');
  capped.push(...doors.meshes.filter((m) => !Array.isArray(m.material) && capsMesh(m)));
  const viewer = new Viewer(viewport, { root: timeline.root, bounds: timeline.bounds, casterBounds: timeline.casterBounds, materials: timeline.materials, capped });
  viewer.scene.add(doors.root);
  const rig = viewer.rig;
  // One BVH per geometry serves the zoom's pick, the hit query and the walk's collision (src/walk/bvh-cache.ts).
  const bvhs = new GeometryBvhs();
  const picker = new ModelPicker(meshes, bvhs, viewer.env.groundY, viewer.cut, rig.camera.layers, (mesh, instance) => timeline.tagOf(mesh, instance));
  rig.pick = (ray) => picker.distance(ray);
  // The stand-ins, and for the hit query alone the closed doors' doorways, which no camera draws, so the eye's ray finds a door between its leaves (Doors: Use).
  doors.registerWith(picker);
  // The walking eye's look target runs the hit query (src/walk/look.ts); an orbit-view pointer can run the same query on its own ray.
  // The doors that open are solid where the door layer stands them, and swing in the walker's physics steps while walking (src/walk/door-world.ts).
  const walk = new WalkMode({ canvas: viewer.renderer.domElement, rig, steps: timeline.steps, floorY: viewer.env.groundY, bvhs, hit: (ray, query) => picker.hit(ray, query), doors }, (message) => { console.warn(message); });
  // The artworks' cards (docs/design/spec.md, Collection: Labels): the look target's artwork while walking, the one a click meets in the orbit view.
  const cards = new Map<string, ArtCardContent>(CATALOGUE.map((entry) => [String(entry.id), cardContent(entry)]));
  // A click's card keeps to what the camera draws of its artwork, every piece of it (src/viewer/art-label.ts): each mesh's step finds the pieces.
  const stepOfMesh = new Map(timeline.steps.flatMap((s) => s.meshes.map((m) => [m, s] as const)));
  const artLabel = new ArtLabel((hit, id) => {
    const step = stepOfMesh.get(hit.mesh);
    return step === undefined ? [{ mesh: hit.mesh, instance: hit.instance }] : artworkInstances(step, id);
  });
  /** What the camera draws, for the card's check: the section cut (a floor view's included) and the camera's layers. */
  const drawnView = { cut: viewer.cut, layers: rig.camera.layers };
  /** The card the last frame showed, for the chrome and `window.__met.label`. */
  let shownArt: ArtCardContent | null = null;
  // Walking, walk mode's one look-target hook tells the card each new target, and null on entering and leaving (src/walk/walk-mode.ts `onLookTarget`).
  walk.onLookTarget((target) => { artLabel.look(target); });
  bindClick(viewer.renderer.domElement, (x, y) => {
    const canvas = viewer.renderer.domElement;
    artLabel.click(picker.hit(new Ray(rig.camera.position.clone(), pointerRay(canvas, rig.camera, x, y)), ARTWORK_QUERY));
  }, () => !walk.active);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') artLabel.dismiss();
  });
  /** The door the walking eye looks at within reach, as the look target last changed (`onLookTarget`), for the prompt under the crosshair. */
  let doorInView: string | null = null;
  walk.onLookTarget((target) => { doorInView = target?.kind === 'door' ? target.id : null; });
  const presetPose = (id: string): CameraPose | null => {
    const preset = presetById(id);
    return preset === undefined ? null : resolvePreset(preset, timeline.bounds, rig.camera.aspect);
  };
  // A view= that names no preset is ignored, as if absent: the default preset, and the follow camera as without a view.
  const namedView = query.view !== null && presetById(query.view) !== undefined ? query.view : null;
  if (query.view !== null && namedView === null) {
    warnings.push(`Query parameter view="${query.view}" names no preset; use one of ${PRESETS.map((p) => p.id).join(', ')}. It is ignored.`);
  }
  const floorAtLoad = startFloor(query.floor, query.walk);
  if (floorAtLoad.warning !== null) warnings.push(floorAtLoad.warning);
  let view: string | null = query.cam !== null ? null : (namedView ?? DEFAULT_PRESET);
  let follow = !query.shot && namedView === null && query.cam === null && floorAtLoad.floor === null;
  /** Whether the camera stands where the preset in view puts it, so a resize fits that preset again; false once the follow camera or the user moves it. */
  let atPreset = view !== null;

  const top = timeline.bounds.isEmpty() ? 20 : timeline.bounds.max.y;
  const cutMax = Math.ceil(top + 1);
  const defaultCut = Math.round(Math.max(1, top * 0.35) * 2) / 2;
  viewer.cut.set(query.cut !== null, query.cut ?? defaultCut);
  // The floor view (src/viewer/floor-mode.ts): a floor's cut, and the landscape over it hidden, a view filter like the cut.
  const floors = new FloorMode(viewer.cut, () => new FloorView(timeline.steps, (i) => timeline.restingPieces(i)));
  /** Whether the camera stands where the floor view framed it, so a resize frames the floor again; false once the user moves it. */
  let atFloor = false;

  const player = new Player(steps.map((s) => s.weight ?? 1), start.t);
  if (shouldAutoplay(query)) player.playForward();
  /** The build replay is open: the timeline shows. Closed, the page shows the finished building, paused (docs/design/spec.md, Page: Build replay). */
  let replay = opensReplay(query, start);
  if (query.spawn !== null && !query.walk) warnings.push(`Query parameter spawn="${query.spawn}" takes effect only with walk=1. It is ignored.`);

  let changed = true;
  let needsRender = true;
  /** While walking, whether the timeline bar is unfolded; each entry into walk mode starts with it folded. */
  let barOpen = false;
  const ranges = chapterRanges(steps);
  const walkStatus = (): WalkStatus => (!walk.active ? 'off' : walk.preparing ? 'preparing' : walk.pointerLocked ? 'locked' : 'free');
  const state = (): UiState => ({
    t: player.t,
    mode: player.mode,
    direction: player.direction,
    speed: player.speed,
    preset: view,
    follow,
    cutEnabled: viewer.cut.enabled,
    cutHeight: viewer.cut.height,
    walking: walk.active,
    barOpen,
    replay,
    walkStatus: walkStatus(),
    walkHint: walk.hint,
    walkTarget: walk.lastTarget?.kind ?? null,
    walkPrompt: doorInView === null ? null : doors.prompt(doorInView),
    floor: floors.id,
    artCard: shownArt,
  });
  /** E, or a click while the pointer is locked: opens or closes the door the walking eye looks at now, away from the walker (Doors). */
  const useDoor = (): void => {
    const target = walk.target();
    if (target?.kind === 'door' && doors.use(target.id, rig.camera.position)) needsRender = true;
  };
  viewer.renderer.domElement.addEventListener('pointerdown', (event) => {
    if (walk.active && walk.pointerLocked && event.button === 0) useDoor();
  });
  /** Opens the build replay at the `t` in view; walking, its bar shows whole, as the visitor asked for it. */
  const openReplay = (): void => {
    if (replay) return;
    replay = true;
    if (walk.active) barOpen = true;
  };
  /** Closes the build replay: the timeline hides and the page shows the finished building again, paused, so a part-built model shows only in the replay. */
  const closeReplay = (): void => {
    if (!replay) return;
    replay = false;
    player.toEnd();
    changed = true;
  };
  /** A timeline action, by the bar, a key or a chapter: it opens the build replay first, so a key on the default page acts there and shows the timeline. */
  const act = (action: () => void) => (): void => {
    openReplay();
    action();
    changed = true;
  };
  /** The cut or the landscape changed: shadows are drawn again on the next frame. */
  const cutChanged = (): void => {
    viewer.markShadowsDirty();
    needsRender = true;
  };
  /** Frames the floor in view from above, from the side the camera looks from now; like a preset, it turns the follow camera off. */
  const frameFloor = (): void => {
    const floor = floors.floor;
    if (floor === null) return;
    rig.setPose(floorPose(floor, rig.pose(), rig.camera.aspect));
    view = null;
    atPreset = false;
    follow = false;
    atFloor = true;
    needsRender = true;
  };
  /** The picker's choice `id` (`all` or a floor), in the orbit view only: a floor is framed, even when chosen again; All leaves the camera where it is. */
  const chooseFloor = (id: string): void => {
    if (walk.active) return;
    const next = id === ALL_FLOORS ? null : (floorById(id) ?? null);
    if (next === null && id !== ALL_FLOORS) return;
    if (floors.show(next)) cutChanged();
    if (next === null) atFloor = false;
    else frameFloor();
  };
  const stepFloor = (direction: 1 | -1): void => {
    const next = floorStep(floors.id, direction);
    if (next !== floors.id) chooseFloor(next);
  };
  /** Into walk mode (at `spawn`, or as walk-mode.ts decides): the floor view ends as with All, and the follow camera and the preset in view go off, as for a move by the user. */
  const enterWalk = (spawn: string | null): void => {
    if (floors.show(null)) cutChanged();
    atFloor = false;
    follow = false;
    view = null;
    atPreset = false;
    barOpen = false;
    walk.enter(spawn);
    needsRender = true;
  };
  const ui = createUi(
    app,
    {
      steps,
      chapters: ranges.map((r) => r.chapter),
      ranges: ranges.map((r) => ({ id: r.chapter.id, title: r.chapter.title, years: r.chapter.years, summary: r.chapter.summary, first: r.first, count: r.count })),
      presets: PRESETS,
      spawns: SPAWNS.map((spawn) => ({ id: spawn.id, label: spawn.label })),
      cutMax,
      floors: [{ id: ALL_FLOORS, label: 'All', name: 'All floors' }, ...[...FLOORS].reverse().map((f) => ({ id: f.id, label: f.label, name: f.name }))],
    },
    {
      toStart: act(() => { player.toStart(); }),
      stepBack: act(() => { player.stepBack(); }),
      togglePlayBackward: act(() => { player.togglePlayBackward(); }),
      togglePlay: act(() => { player.togglePlay(); }),
      stepForward: act(() => { player.stepForward(); }),
      toEnd: act(() => { player.toEnd(); }),
      setSpeed: (speed: Speed) => { player.setSpeed(speed); changed = true; },
      scrub: (t: number) => { player.scrub(t); changed = true; },
      goToChapter: (first: number) => { act(() => { player.scrub(first); })(); },
      toggleReplay: () => { if (replay) closeReplay(); else openReplay(); },
      closeReplay,
      applyPreset: (id: string) => {
        const pose = presetPose(id);
        if (pose === null) return;
        // A preset is an orbit-view camera: in walk mode it leaves walk mode first, or the walker would take the camera back on the next frame
        // while the preset stayed marked as in view, to be fitted again over the camera on the next resize.
        if (walk.active) walk.exit();
        // A preset is a new view: the card of an artwork clicked in the last one goes with it (docs/design/spec.md, Collection: Labels).
        artLabel.dismiss();
        rig.setPose(pose);
        view = id;
        atPreset = true;
        atFloor = false;
        follow = false;
        needsRender = true;
      },
      setFollow: (on: boolean) => {
        follow = on;
        if (on) {
          view = null;
          atPreset = false;
          atFloor = false;
        }
        needsRender = true;
      },
      // The cut set by hand (the slider or the toggle) ends a floor view and stands as the user's own.
      setCut: (enabled: boolean, height: number) => {
        if (floors.leaveForCut()) atFloor = false;
        viewer.cut.set(enabled, height);
        cutChanged();
      },
      chooseFloor,
      floorUp: () => { stepFloor(1); },
      floorDown: () => { stepFloor(-1); },
      toggleWalk: () => {
        if (walk.active) walk.exit();
        else enterWalk(null);
        needsRender = true;
      },
      walkFrom: (spawn: string) => { enterWalk(spawn); },
      jump: () => { walk.jump(); },
      act: () => { useDoor(); },
      toggleBar: () => { barOpen = !barOpen; },
    },
    state(),
    // The keys route by the mode now, not the mode the last frame drew: F and then Space in one frame jump rather than play.
    () => walk.active,
  );
  // The camera frames the canvas above the bar while the bar is whole (the replay open, in the orbit view), so set the inset before the first pose. Else
  // (noui, the replay closed, walking) the view is the whole canvas; walking, it is centred on the crosshair, so unfolding the bar never moves it.
  const fitInset = (): void => {
    viewer.setInsetBottom(query.noui || walk.active || !replay ? 0 : Math.round(ui.bar.getBoundingClientRect().height));
    needsRender = true;
  };
  fitInset();
  /** What the inset was last fitted for: walking, the whole bar or the replay closed. */
  let insetFor = replay ? 'bar' : 'closed';
  if (query.cam !== null) {
    const [px, py, pz, tx, ty, tz] = query.cam;
    rig.setPose({ position: new Vector3(px, py, pz), target: new Vector3(tx, ty, tz), fov: DEFAULT_FOV });
  } else {
    const pose = presetPose(view ?? DEFAULT_PRESET);
    if (pose !== null) rig.setPose(pose);
  }
  // floor= at load shows that floor, framed unless the query names a camera (view= or cam=), so captures can show a floor from any camera.
  if (floorAtLoad.floor !== null) {
    if (floors.show(floorAtLoad.floor)) cutChanged();
    if (query.cam === null && namedView === null) frameFloor();
  }
  // The doors stand at their state before the walker is placed, at once: so with shot=1 from the first frame (Doors). Marked for the order's check.
  doors.sync(player.t, 0, true);
  performance.mark('met:doors-set');
  if (query.walk) {
    const known = query.spawn === null || spawnById(query.spawn) !== undefined;
    if (!known) warnings.push(`Query parameter spawn="${query.spawn}" names no walk spawn; use one of ${SPAWNS.map((sp) => sp.id).join(', ')}. The walk starts at ${DEFAULT_SPAWN}.`);
    enterWalk(known ? query.spawn : null);
    // Capture mode shows the walker's view from its first frame.
    if (query.shot) walk.prepareNow(player.t);
    if (query.shot) performance.mark('met:walk-placed');
  }
  rig.onUserMove = () => {
    follow = false;
    view = null;
    atPreset = false;
    atFloor = false;
    needsRender = true;
  };
  /** A fit preset depends on the shape of the view, so the preset in view is fitted again (a look preset comes back unchanged); so is a floor's framing. */
  const refit = (): void => {
    if (atPreset && view !== null) {
      const pose = presetPose(view);
      if (pose !== null) rig.setPose(pose);
    }
    if (atFloor) frameFloor();
  };
  const resized = new ResizeObserver(() => {
    viewer.resize();
    fitInset();
    refit();
  });
  resized.observe(viewport);
  resized.observe(ui.bar);

  let frames = 0;
  /** The camera position the last drawn frame was rendered from, and its doors as the meshes drew them (`perf.lastDrawn`). */
  const drawnFrom = new Vector3();
  let drawnDoors: readonly DoorDrawn[] = [];
  let readyMs: number | null = null;
  let last = performance.now();
  /** The pose the follow camera headed for in the last frame, or null when it is not under way. */
  let followGoal: CameraPose | null = null;
  const frame = (now: number): void => {
    const work = performance.now();
    const seconds = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - last) / 1000));
    last = now;
    if (!query.shot && player.tick(seconds)) changed = true;
    if (changed) {
      changed = false;
      if (timeline.evaluate(player.t)) viewer.markShadowsDirty();
      needsRender = true;
    }
    // The doors follow the timeline and swing (Doors): each swap and every frame of a swing draws again, and redraws the shadows when what moved casts one.
    // While walking they swing in the walker's physics steps instead, against the walker (Doors: Walking).
    const doorChange = doors.sync(player.t, query.shot || walk.active ? 0 : seconds, query.shot);
    if (doorChange !== 'none') {
      if (doorChange === 'shadows') viewer.markShadowsDirty();
      needsRender = true;
    }
    if (walk.active) {
      if (walk.frame(query.shot ? 0 : seconds, player.t, ui.held)) needsRender = true;
    } else {
      // The orbit view's movement keys move the camera and its target together, like a pan, and turn the follow camera off like a drag.
      const up = new Vector3(0, 1, 0).applyQuaternion(rig.camera.quaternion);
      const move = orbitKeyMove(rig.camera.position, rig.controls.target, up, orbitKeys(ui.held), seconds);
      if (move.lengthSq() > 0 && rig.translate(move)) rig.onUserMove?.();
    }
    const swung = doors.takeChange();
    if (swung !== 'none') {
      if (swung === 'shadows') viewer.markShadowsDirty();
      needsRender = true;
    }
    followGoal = null;
    if (follow && player.moving && !walk.active) {
      const step = stepInMotion(timeline.steps, player.t, player.direction);
      followGoal = step === undefined ? null : rig.followGoal(step.def.focus, step.bounds, timeline.bounds);
      if (followGoal !== null && rig.approach(followGoal, seconds)) {
        needsRender = true;
        atPreset = false;
      }
    }
    if (rig.update()) needsRender = true;
    artLabel.frame(walk.active, drawnView);
    shownArt = artLabel.id === null ? null : (cards.get(artLabel.id) ?? null);
    ui.sync(state());
    // Into or out of walk mode, or the replay opened or closed: the inset changes with it, measured after the bar has changed, and the view is fitted again.
    const inset = walk.active ? 'walk' : replay ? 'bar' : 'closed';
    if (inset !== insetFor) {
      insetFor = inset;
      fitInset();
      refit();
    }
    if (needsRender || frames < READY_FRAMES) {
      viewer.render();
      frames += 1;
      drawnFrom.copy(rig.camera.position);
      drawnDoors = doors.drawn();
      needsRender = false;
    }
    walk.noteFrame(performance.now() - work);
    if (readyMs === null && frames >= READY_FRAMES) {
      performance.mark('met:ready');
      readyMs = performance.now();
      window.__shotReady = true;
    }
    requestAnimationFrame(frame);
  };

  for (const warning of warnings) console.warn(warning);
  const b = timeline.bounds;
  publishFacts({
    n: timeline.n,
    // Detached, deeply frozen snapshots: a step's focus is the step definition's own object, which the follow camera reads.
    steps: snapshot(steps.map((s, i) => {
      const sb = timeline.steps[i]?.bounds ?? b;
      return { id: s.id, title: s.title, chapter: s.chapter, year: s.year ?? null, detail: s.detail ?? null, weight: s.weight ?? 1, focus: s.focus ?? null, bounds: { min: vec(sb.min), max: vec(sb.max) } };
    })),
    chapters: snapshot(ranges.map((r) => ({ id: r.chapter.id, title: r.chapter.title, years: r.chapter.years, summary: r.chapter.summary, first: r.first, count: r.count }))),
    presets: snapshot(PRESETS.map((p) => ({ id: p.id, label: p.label, group: p.group }))),
    floors: snapshot(FLOORS.map((f) => ({ id: f.id, label: f.label, name: f.name, level: f.level, cut: f.cut }))),
    bounds: snapshot({ min: vec(b.min), max: vec(b.max) }),
    stats: snapshot(timeline.stats()),
    warnings: snapshot([...warnings]),
    gpu: viewer.gpu(),
    get t() { return player.t; },
    get mode() { return player.mode; },
    get direction() { return player.direction; },
    get speed() { return player.speed; },
    get follow() { return follow; },
    get replay() { return replay; },
    get followGoal() {
      const g = followGoal;
      return g === null ? null : snapshot({ position: vec(g.position), target: vec(g.target), fov: g.fov });
    },
    get cut() { return snapshot({ enabled: viewer.cut.enabled, height: viewer.cut.height }); },
    get floor() { return snapshot({ id: floors.id, hidden: floors.hidden, ownCut: floors.ownCut }); },
    get view() { return view; },
    get camera() {
      const c = rig.camera;
      return snapshot({ position: vec(c.position), target: vec(rig.controls.target), near: c.near, far: c.far, fov: c.fov, aspect: c.aspect });
    },
    get walk() { return snapshot(walk.facts()); },
    get label() { return shownArt === null ? null : snapshot({ id: shownArt.id, title: shownArt.title }); },
    get doors() { return snapshot(doors.facts()); },
    perf: Object.freeze({
      buildMs,
      get readyMs() { return readyMs; },
      get framesRendered() { return frames; },
      get lastDrawn() { return snapshot({ frame: frames, camera: vec(drawnFrom), doors: drawnDoors }); },
    }),
    benchmark: (count: number) => viewer.benchmark(count),
  });
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (error) {
  showError(error);
}
