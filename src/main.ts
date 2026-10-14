/**
 * Boot (docs/design/spec.md, Modules): query, sequence, timeline, viewer, player, UI, frame loop and the read-only `window.__met`.
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
import type { UiState } from './ui/ui.js';
import { publishFacts, snapshot } from './viewer/facts.js';
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

  // The section cut's cap pass leaves out transparent meshes and those whose material the cut does not clip (src/viewer/section-cut.ts).
  const capExcluded = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.isArray(m.material) && !cappedBySection(m.material));
  const viewer = new Viewer(viewport, { root: timeline.root, bounds: timeline.bounds, casterBounds: timeline.casterBounds, materials: timeline.materials, capExcluded });
  const rig = viewer.rig;
  const presetPose = (id: string): CameraPose | null => {
    const preset = presetById(id);
    return preset === undefined ? null : resolvePreset(preset, timeline.bounds, rig.camera.aspect);
  };
  // A view= that names no preset is ignored, as if absent: the default preset, and the follow camera as without a view.
  const namedView = query.view !== null && presetById(query.view) !== undefined ? query.view : null;
  if (query.view !== null && namedView === null) {
    warnings.push(`Query parameter view="${query.view}" names no preset; use one of ${PRESETS.map((p) => p.id).join(', ')}. It is ignored.`);
  }
  let view: string | null = query.cam !== null ? null : (namedView ?? DEFAULT_PRESET);
  let follow = !query.shot && namedView === null && query.cam === null;
  /** Whether the camera stands where the preset in view puts it, so a resize fits that preset again; false once the follow camera or the user moves it. */
  let atPreset = view !== null;

  const top = timeline.bounds.isEmpty() ? 20 : timeline.bounds.max.y;
  const cutMax = Math.ceil(top + 1);
  const defaultCut = Math.round(Math.max(1, top * 0.35) * 2) / 2;
  viewer.cut.set(query.cut !== null, query.cut ?? defaultCut);

  const player = new Player(steps.map((s) => s.weight ?? 1), start.t);
  if (shouldAutoplay(query, start)) player.playForward();

  let changed = true;
  let needsRender = true;
  const ranges = chapterRanges(steps);
  const state = (): UiState => ({
    t: player.t,
    mode: player.mode,
    direction: player.direction,
    speed: player.speed,
    preset: view,
    follow,
    cutEnabled: viewer.cut.enabled,
    cutHeight: viewer.cut.height,
  });
  const act = (action: () => void) => (): void => {
    action();
    changed = true;
  };
  const ui = createUi(
    app,
    {
      steps,
      chapters: ranges.map((r) => r.chapter),
      ranges: ranges.map((r) => ({ id: r.chapter.id, title: r.chapter.title, years: r.chapter.years, summary: r.chapter.summary, first: r.first, count: r.count })),
      presets: PRESETS,
      cutMax,
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
        follow = false;
        needsRender = true;
      },
      setFollow: (on: boolean) => {
        follow = on;
        if (on) {
          view = null;
          atPreset = false;
        }
        needsRender = true;
      },
      setCut: (enabled: boolean, height: number) => {
        viewer.cut.set(enabled, height);
        viewer.markShadowsDirty();
        needsRender = true;
      },
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
  rig.onUserMove = () => {
    follow = false;
    view = null;
    atPreset = false;
    needsRender = true;
  };
  const resized = new ResizeObserver(() => {
    viewer.resize();
    fitInset();
    // A fit preset depends on the canvas's shape, so the preset in view is fitted again (a look preset comes back unchanged).
    if (atPreset && view !== null) {
      const pose = presetPose(view);
      if (pose !== null) rig.setPose(pose);
    }
  });
  resized.observe(viewport);
  resized.observe(ui.bar);

  let frames = 0;
  let readyMs: number | null = null;
  let last = performance.now();
  /** The pose the follow camera headed for in the last frame, or null when it is not under way. */
  let followGoal: CameraPose | null = null;
  const frame = (now: number): void => {
    const seconds = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - last) / 1000));
    last = now;
    if (!query.shot && player.tick(seconds)) changed = true;
    if (changed) {
      changed = false;
      if (timeline.evaluate(player.t)) viewer.markShadowsDirty();
      needsRender = true;
    }
    followGoal = null;
    if (follow && player.moving) {
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
    get view() { return view; },
    get camera() {
      const c = rig.camera;
      return snapshot({ position: vec(c.position), target: vec(rig.controls.target), near: c.near, far: c.far, fov: c.fov, aspect: c.aspect });
    },
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
