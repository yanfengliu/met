/**
 * Boot (docs/design/spec.md, Modules): query, sequence, timeline, viewer, player, walk mode, UI, frame loop and the read-only `window.__met`.
 * Frames render on demand: when t, the camera, the cut or the size changed, and for the first 5 frames, after which `window.__shotReady` is set.
 */
import { Vector3 } from 'three';

import { Player } from './build/player.js';
import type { Speed } from './build/player.js';
import { chapterRanges, selectSteps } from './build/select.js';
import { SEQUENCE } from './build/sequence.js';
import { Timeline } from './build/timeline.js';
import type { BuiltStep } from './build/timeline.js';
import { installStyles } from './ui/styles.js';
import { createUi } from './ui/ui.js';
import type { UiState, WalkStatus } from './ui/ui.js';
import { GeometryBvhs } from './walk/bvh-cache.js';
import { DEFAULT_SPAWN, SPAWNS, spawnById } from './walk/spawns.js';
import { WalkMode } from './walk/walk-mode.js';
import { publishFacts, snapshot } from './viewer/facts.js';
import { FloorMode } from './viewer/floor-mode.js';
import { FloorView } from './viewer/floor-view.js';
import { ALL_FLOORS, FLOORS, floorById, floorPose, floorStep, startFloor } from './viewer/floors.js';
import { orbitKeyMove, orbitKeys } from './viewer/orbit-keys.js';
import { ModelPicker } from './viewer/pick.js';
import { DEFAULT_FOV, DEFAULT_PRESET, PRESETS, presetById, resolvePreset } from './viewer/presets.js';
import type { CameraPose } from './viewer/presets.js';
import { readQuery, shouldAutoplay, startPosition } from './viewer/query.js';
import { RendererError } from './viewer/renderer-error.js';
import { cappedBySection } from './viewer/section-cut.js';
import { Viewer } from './viewer/viewer.js';

const READY_FRAMES = 5;
/** Longest wall-time step one frame may advance the player, so a stalled tab does not jump the build. */
const MAX_FRAME_SECONDS = 0.1;

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const panel = document.createElement('pre');
  panel.className = 'met-error';
  panel.dataset['testid'] = 'error';
  // Inline, because the failure may come before the page styles are installed.
  panel.style.cssText = 'position:fixed;inset:16px auto auto 16px;max-width:calc(100vw - 64px);margin:0;padding:14px 16px;border-radius:10px;background:#3a1514;color:#ffd9d4;white-space:pre-wrap;font:13px/1.4 ui-monospace,Consolas,monospace;';
  // A renderer that cannot start is not the model's fault; it says so, with what to do (src/viewer/renderer-error.ts).
  const heading = error instanceof RendererError ? 'WebGL 2 is not available.' : 'The model could not be built.';
  panel.textContent = `${heading}\n\n${message}`;
  document.body.appendChild(panel);
  console.error(error);
}

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

  // The section cut's cap pass leaves out transparent meshes and those whose material the cut does not clip (src/viewer/section-cut.ts); it draws
  // the others where the cut passes through them.
  const meshes = timeline.steps.flatMap((s) => s.meshes);
  const capExcluded = meshes.filter((m) => !Array.isArray(m.material) && !cappedBySection(m.material));
  const capped = meshes.filter((m) => Array.isArray(m.material) || cappedBySection(m.material));
  const viewer = new Viewer(viewport, { root: timeline.root, bounds: timeline.bounds, casterBounds: timeline.casterBounds, materials: timeline.materials, capExcluded, capped });
  const rig = viewer.rig;
  // One BVH per geometry serves the zoom's pick and the walk's collision (src/walk/bvh-cache.ts).
  const bvhs = new GeometryBvhs();
  const picker = new ModelPicker(meshes, bvhs, viewer.env.groundY, viewer.cut, rig.camera.layers);
  rig.pick = (ray) => picker.distance(ray);
  const walk = new WalkMode({ canvas: viewer.renderer.domElement, rig, steps: timeline.steps, floorY: viewer.env.groundY, bvhs }, (message) => { console.warn(message); });
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
  if (query.spawn !== null && !query.walk) warnings.push(`Query parameter spawn="${query.spawn}" takes effect only with walk=1. It is ignored.`);

  let changed = true;
  let needsRender = true;
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
    walkStatus: walkStatus(),
    floor: floors.id,
  });
  const act = (action: () => void) => (): void => {
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
      goToChapter: (first: number) => { player.scrub(first); changed = true; },
      applyPreset: (id: string) => {
        const pose = presetPose(id);
        if (pose === null) return;
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
    },
    state(),
  );
  // The camera frames the part of the canvas above the timeline bar (none with noui), so set the inset before the first pose.
  const fitInset = (): void => {
    viewer.setInsetBottom(query.noui ? 0 : Math.round(ui.bar.getBoundingClientRect().height));
    needsRender = true;
  };
  fitInset();
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
  if (query.walk) {
    const known = query.spawn === null || spawnById(query.spawn) !== undefined;
    if (!known) warnings.push(`Query parameter spawn="${query.spawn}" names no walk spawn; use one of ${SPAWNS.map((sp) => sp.id).join(', ')}. The walk starts at ${DEFAULT_SPAWN}.`);
    enterWalk(known ? query.spawn : null);
    // Capture mode shows the walker's view from its first frame.
    if (query.shot) walk.prepareNow(player.t);
  }
  rig.onUserMove = () => {
    follow = false;
    view = null;
    atPreset = false;
    atFloor = false;
    needsRender = true;
  };
  const resized = new ResizeObserver(() => {
    viewer.resize();
    fitInset();
    // A fit preset depends on the canvas's shape, so the preset in view is fitted again (a look preset comes back unchanged); so is a floor's framing.
    if (atPreset && view !== null) {
      const pose = presetPose(view);
      if (pose !== null) rig.setPose(pose);
    }
    if (atFloor) frameFloor();
  });
  resized.observe(viewport);
  resized.observe(ui.bar);

  let frames = 0;
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
    if (walk.active) {
      if (walk.frame(query.shot ? 0 : seconds, player.t, ui.held)) needsRender = true;
    } else {
      // The orbit view's movement keys move the camera and its target together, like a pan, and turn the follow camera off like a drag.
      const up = new Vector3(0, 1, 0).applyQuaternion(rig.camera.quaternion);
      const move = orbitKeyMove(rig.camera.position, rig.controls.target, up, orbitKeys(ui.held), seconds);
      if (move.lengthSq() > 0 && rig.translate(move)) rig.onUserMove?.();
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
    ui.sync(state());
    if (needsRender || frames < READY_FRAMES) {
      viewer.render();
      frames += 1;
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
    perf: Object.freeze({
      buildMs,
      get readyMs() { return readyMs; },
      get framesRendered() { return frames; },
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
