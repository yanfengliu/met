/**
 * `window.__met`: read-only facts about the page for tests and capture scripts (docs/design/spec.md, Query contract).
 * Every value is a detached, deeply frozen snapshot (`snapshot`) or a getter that returns one; none is an object the page itself uses, so nothing
 * done to `window.__met`, however deep, reaches the page's state, and tests still drive it through its real controls.
 */
import type { PlayerMode, Speed } from '../build/player.js';
import type { CameraFocus, Vec3 } from '../build/types.js';

/** A detached copy of plain data `value`, frozen all the way down: no part of it is shared with the original. */
export function snapshot<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

export interface MetFacts {
  readonly n: number;
  /** Each step's own facts; `focus` is what the follow camera frames for it (null: its pieces) and `bounds` its pieces' world bounds at their final matrices. */
  readonly steps: readonly {
    readonly id: string;
    readonly title: string;
    readonly chapter: string;
    readonly year: string | null;
    readonly detail: string | null;
    readonly weight: number;
    readonly focus: CameraFocus | null;
    readonly bounds: { readonly min: Vec3; readonly max: Vec3 };
  }[];
  /** Every chapter of src/build/chapters.ts in order; `count` is 0 for a chapter with no steps (shown disabled), whose `first` is where its steps would start. */
  readonly chapters: readonly { readonly id: string; readonly title: string; readonly years: string; readonly summary: string; readonly first: number; readonly count: number }[];
  readonly presets: readonly { readonly id: string; readonly label: string; readonly group: string }[];
  /** World bounds of the built steps at their final matrices. */
  readonly bounds: { readonly min: Vec3; readonly max: Vec3 };
  readonly stats: { readonly steps: number; readonly pieces: number; readonly meshes: number; readonly triangles: number; readonly lights: number };
  /** Query warnings: parameters that were malformed or named nothing. */
  readonly warnings: readonly string[];
  /** The GPU WebGL reports. */
  readonly gpu: string;
  readonly t: number;
  readonly mode: PlayerMode;
  readonly direction: 1 | -1;
  readonly speed: Speed;
  readonly follow: boolean;
  /** The pose the follow camera headed for in the last frame (from the step in motion), or null when it is not under way. */
  readonly followGoal: { readonly position: Vec3; readonly target: Vec3; readonly fov: number } | null;
  readonly cut: { readonly enabled: boolean; readonly height: number };
  /** The preset in view, or null once the user moved the camera. */
  readonly view: string | null;
  /** `fov` is the vertical field of view in degrees and `aspect` the width over the height of the part of the canvas above the timeline bar, which the projection covers. */
  readonly camera: { readonly position: Vec3; readonly target: Vec3; readonly near: number; readonly far: number; readonly fov: number; readonly aspect: number };
  readonly perf: {
    /**
     * Milliseconds of the timeline build: every step's `build` and its meshes (performance marks met:build-start, met:build-end).
     * Geometry a module builds when it is imported comes before this and is not in it; `readyMs` covers it.
     */
    readonly buildMs: number;
    /** Milliseconds from navigation start to `__shotReady` (mark met:ready), or null before: module loading, the timeline build, renderer start and the first frames. */
    readonly readyMs: number | null;
    readonly framesRendered: number;
  };
  /** Renders `frames` frames with a shadow update and GPU sync each; returns mean milliseconds per frame. Leaves the model as it was. */
  benchmark(frames: number): number;
}

declare global {
  interface Window {
    /** Capture contract (docs/design/spec.md, Query contract): true once at least 5 frames have rendered at the requested state. */
    __shotReady?: boolean;
    readonly __met?: MetFacts;
  }
}

export function publishFacts(facts: MetFacts): void {
  Object.defineProperty(window, '__met', { value: Object.freeze(facts), writable: false, configurable: false, enumerable: true });
}
