/**
 * The build-step contract (docs/design/spec.md, Build-step API). Area modules export `StepDef`s; the engine builds them into the timeline.
 * World frame: 1 unit = 1 metre, +Y up, +X Manhattan north, +Z Manhattan east (docs/design/spec.md, World frame).
 */
import type { BufferGeometry, Material, Matrix4, PointLight, SpotLight } from 'three';

import type { ChapterId } from './chapters.js';

/** A world-space vector or offset in metres. */
export type Vec3 = readonly [number, number, number];

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
  /** One piece: a shared geometry, a shared material and its final world matrix. */
  add(geometry: BufferGeometry, material: Material, matrix: Matrix4): void;
  /**
   * One piece of a door or an artwork, as `add` but tagged: the timeline keeps the tag with the piece's instance (`Timeline.tagOf`), and the look
   * target and the hit query report it. A door's pieces get meshes of their own, one door per mesh; an artwork's batch as untagged pieces do.
   */
  addTagged(geometry: BufferGeometry, material: Material, matrix: Matrix4, tag: PieceTag): void;
  /** A light the step adds, shining at its own intensity; at most 8 in the whole sequence, never shadow-casting. */
  light(light: PointLight | SpotLight): void;
}

export interface StepDef {
  /** Unique, stable, kebab-case: tests and `window.__met` name it. */
  readonly id: string;
  /** From `src/build/chapters.ts`. */
  readonly chapter: ChapterId;
  /** What the step builds, at most 48 characters. */
  readonly title: string;
  /** More on what it builds, at most 200 characters. */
  readonly detail?: string;
  /** When it was built, inside its chapter's years, e.g. '1975'. */
  readonly year?: string;
  /** Adds this step's pieces. Called once, when the timeline is built. */
  build(kit: Kit): void;
}

/** One historical era of the building, in `src/build/chapters.ts`. */
export interface Chapter {
  /** Unique, stable, kebab-case. */
  readonly id: string;
  /** The era's name. */
  readonly title: string;
  /** The years it spans, e.g. '1874–1880'; a step's `year` lies inside them. */
  readonly years: string;
  /** One sentence on what the chapter builds. */
  readonly summary: string;
}
