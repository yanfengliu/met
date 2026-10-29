/**
 * The build-step contract (docs/design/spec.md, Build-step API). Chapter modules export `StepDef`s; the engine turns them into a timeline.
 * World frame: 1 unit = 1 metre, +Y up, +X Manhattan north, +Z Manhattan east (docs/design/spec.md, World frame).
 */
import type { BufferGeometry, Material, Matrix4, PointLight, SpotLight } from 'three';

import type { ChapterId } from './chapters.js';

/** A world-space vector or offset in metres. */
export type Vec3 = readonly [number, number, number];

/**
 * How a step's pieces arrive. Each piece moves through its own window of the step's progress and lands exactly on its final matrix.
 * - `rise`: slides up from below its final place by `distance` metres (default: the piece's own height, at least 3 m).
 * - `drop`: slides down from above by `distance` metres (same default).
 * - `grow`: scales up in world Y from the bottom of its world bounding box.
 * - `pop`: scales up from the centre of its world bounding box, with a slight overshoot.
 * - `slide`: arrives from this world offset in metres.
 */
export type Motion =
  | { readonly kind: 'rise'; readonly distance?: number }
  | { readonly kind: 'drop'; readonly distance?: number }
  | { readonly kind: 'grow' }
  | { readonly kind: 'pop' }
  | { readonly kind: 'slide'; readonly from: Vec3 };

/**
 * The order pieces arrive in within a step. Pieces with equal keys arrive together.
 * - `order`: by the `order` argument of `Kit.add` (default: the call's index within the step).
 * - `x`, `-x`, `z`, `-z`, `y`: by the world bounding-box centre along that axis, ascending (`-` descends); keys are rounded to 1 cm.
 * - `radial`: by horizontal (XZ) distance of the piece's centre from the centre of the step's bounds, inner first; rounded to 1 cm.
 * - `none`: every piece arrives over the whole step at once.
 */
export type Stagger = 'order' | 'x' | '-x' | 'z' | '-z' | 'y' | 'radial' | 'none';

/**
 * What the follow camera frames while a step plays. Default `{ kind: 'pieces' }`.
 * - `pieces`: the world bounds of this step's pieces, seen from the current viewing direction.
 * - `box`: this world box, seen from the current viewing direction.
 * - `view`: this exact camera position and orbit target.
 * - `preset`: a view preset from `src/viewer/presets.ts`, by id.
 */
export type CameraFocus =
  | { readonly kind: 'pieces' }
  | { readonly kind: 'box'; readonly min: Vec3; readonly max: Vec3 }
  | { readonly kind: 'view'; readonly position: Vec3; readonly target: Vec3 }
  | { readonly kind: 'preset'; readonly id: string };

/**
 * What a tagged piece is part of, for the page to find it by (docs/design/spec.md, Build-step API: Piece tags): a door or an artwork, and its id,
 * stable and unique within its kind (a door's own id; an artwork's Met object ID).
 */
export interface PieceTag {
  readonly kind: 'door' | 'artwork';
  readonly id: string;
}

/**
 * What a step's `build` receives.
 * Materials: a material whose `userData.castShadow === false`, or any `transparent` material, never casts shadows.
 * The engine adds the section-cut clipping plane to every material it receives, so builders never set `clippingPlanes` themselves.
 */
export interface Kit {
  /** One piece: a shared geometry, a shared material and its final world matrix. Pieces with equal `order` arrive together under the `order` stagger. */
  add(geometry: BufferGeometry, material: Material, matrix: Matrix4, order?: number): void;
  /**
   * One piece of a door or an artwork, as `add` but tagged: the timeline keeps the tag with the piece's instance (`Timeline.tagOf`), and the look
   * target and the hit query report it. A door's pieces get meshes of their own, one door per mesh; an artwork's batch as untagged pieces do.
   */
  addTagged(geometry: BufferGeometry, material: Material, matrix: Matrix4, tag: PieceTag, order?: number): void;
  /** A light that switches on with the step (its intensity follows the step's progress); at most 8 in the whole sequence, never shadow-casting. */
  light(light: PointLight | SpotLight): void;
}

export interface StepDef {
  /** Unique, stable, kebab-case: URLs and tests name it. */
  readonly id: string;
  /** From `src/build/chapters.ts`. */
  readonly chapter: ChapterId;
  /** At most 48 characters, shown in the timeline. */
  readonly title: string;
  /** At most 200 characters, shown under the title. */
  readonly detail?: string;
  /** Overrides the chapter's years in the label, e.g. '1975'. */
  readonly year?: string;
  /** How this step's pieces arrive. */
  readonly motion: Motion;
  /** The order pieces arrive in within the step; default 'order'. */
  readonly stagger?: Stagger;
  /** Playback duration multiplier; default 1; must be a finite number above 0. */
  readonly weight?: number;
  /** What the follow camera frames during this step; default `{ kind: 'pieces' }`. */
  readonly focus?: CameraFocus;
  /** Adds this step's pieces. Called once, when the timeline is built. */
  build(kit: Kit): void;
}

/** One historical era of the build, in `src/build/chapters.ts`. */
export interface Chapter {
  /** Unique, stable, kebab-case. */
  readonly id: string;
  /** Shown in the label and the Build menu. */
  readonly title: string;
  /** Shown in the label unless a step sets `year`, e.g. '1874–1880'. */
  readonly years: string;
  /** One sentence on what the chapter builds, shown with it in the Build menu. */
  readonly summary: string;
}
