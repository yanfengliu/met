/**
 * The door layer's public types and the pure parts of its swing (src/viewer/doors.ts, which re-exports them all): how long a swing takes, how it eases,
 * and a leaf's turn about its hinge.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { SwingingPart } from '../model/lib/window.js';

/** Seconds a door takes to swing from closed to fully open, or back. */
export const SWING_SECONDS = 0.7;

/** A door the layer knows: its id (the tag's) and whether it is locked (src/model/doors.ts). */
export interface DoorDef {
  readonly id: string;
  readonly locked: boolean;
}

/** The leaves a door's closed piece is made of, by its geometry (src/model/lib/window.ts `doorLeavesOf`). */
export type LeavesOf = (geometry: BufferGeometry) => readonly SwingingPart[] | undefined;

/** What the walking eye's prompt says for a door: how to open or close it, or that it is locked. */
export type DoorPrompt = 'E Open' | 'E Close' | 'Locked';

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

/** What a sync changed for the page to draw again (`DoorLayer.sync`): nothing, the frame, or the frame and the shadows. */
export type DoorChange = 'none' | 'moved' | 'shadows';

/** One door for `window.__met.doors` (src/viewer/facts.ts). */
export interface DoorFacts {
  readonly id: string;
  readonly state: DoorState;
  /** Degrees its leaves stand open: positive toward the door's back (−Z of its unit: into the building for an entrance), negative toward its front. */
  readonly angle: number;
  readonly locked: boolean;
  /**
   * Whether its step is complete, so the door can be used. While it is not, the timeline's closed leaf stands in its place, and `state` and `angle` are
   * what the door shows again when the step completes.
   */
  readonly built: boolean;
}

/** One door as the meshes draw it (`DoorLayer.drawn`, `window.__met.perf.lastDrawn.doors`). */
export interface DoorDrawn {
  readonly id: string;
  /** Degrees its stand-ins draw its leaves open, read back from their instance matrices; null while the timeline's closed leaves are drawn instead. */
  readonly angle: number | null;
}

/** Smoothstep: eases in and out, 0 at 0 and 1 at 1. */
export function ease(p: number): number {
  const x = p <= 0 ? 0 : p >= 1 ? 1 : p;
  return x * x * (3 - 2 * x);
}

const turned = new Vector3();

/** The turn of a leaf by `angle` radians about the hinge through `pivot` along the unit `axis`, in the leaf's unit frame: T(pivot) R T(−pivot). */
export function hingeTurn(pivot: Vector3, axis: Vector3, angle: number, out = new Matrix4()): Matrix4 {
  out.makeRotationAxis(axis, angle);
  turned.copy(pivot).applyMatrix4(out);
  return out.setPosition(pivot.x - turned.x, pivot.y - turned.y, pivot.z - turned.z);
}
