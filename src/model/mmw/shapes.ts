/**
 * Shared unit shapes and placement helpers for the McKim, Mead & White wings. One geometry per distinct shape, scaled by each piece's matrix,
 * so equal pieces batch into one InstancedMesh (docs/design/spec.md, Batching).
 * Frames: a facade element is modelled with its front toward +Z; `facing` turns it about Y so its front looks toward +Z, −Z, +X or −X.
 */
import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { Kit } from '../../build/types.js';

/** 1 m cube centred on the origin. */
export const UNIT_BOX: BufferGeometry = new BoxGeometry(1, 1, 1);
/** Cylinder of diameter 1 and height 1, centred on the origin, 16 sides. */
export const UNIT_CYLINDER: BufferGeometry = new CylinderGeometry(0.5, 0.5, 1, 16);

/** Which way a facade element's front looks. */
export type Facing = '+z' | '-z' | '+x' | '-x';

/** Rotation about Y that turns a front facing +Z to `facing`. */
export function facingAngle(facing: Facing): number {
  switch (facing) {
    case '+z':
      return 0;
    case '-z':
      return Math.PI;
    case '+x':
      return Math.PI / 2;
    case '-x':
      return -Math.PI / 2;
  }
}

const Y_AXIS = new Vector3(0, 1, 0);

/** A world matrix from a position, a rotation about Y in radians and a scale. */
export function placed(x: number, y: number, z: number, rotationY = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y_AXIS, rotationY), new Vector3(sx, sy, sz));
}

/** The matrix that places UNIT_BOX over the world box `min`..`max`. */
export function boxMatrix(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Matrix4 {
  return placed((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
}

/** Adds UNIT_BOX spanning the world corners; zero-size boxes are skipped. */
export function addBox(kit: Kit, material: Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, order?: number): void {
  if (Math.abs(x1 - x0) < 1e-6 || Math.abs(y1 - y0) < 1e-6 || Math.abs(z1 - z0) < 1e-6) return;
  kit.add(UNIT_BOX, material, boxMatrix(x0, y0, z0, x1, y1, z1), order);
}

/**
 * A straight run of wall face, in world metres: it starts at (x, z) on the face, runs `length` along the unit direction `dir`, and its face looks toward `facing`.
 * Positions on it are `along` (from the start), `out` (in front of the face; negative is into the wall) and `y` (height).
 */
export interface FacadeLine {
  readonly x: number;
  readonly z: number;
  readonly dir: readonly [number, number];
  readonly length: number;
  readonly facing: Facing;
}

/**
 * A facade line starting at (x, z). Its direction follows from its facing, so an element modelled facing +Z keeps its local +X along the line:
 * +Z faces run +X, −X faces run +Z, +X faces run −Z and −Z faces run −X (a counter-clockwise outline seen from above, as the parts library's sweeps expect).
 */
export function facadeLine(x: number, z: number, length: number, facing: Facing): FacadeLine {
  const dir: readonly [number, number] = facing === '+z' ? [1, 0] : facing === '-x' ? [0, 1] : facing === '+x' ? [0, -1] : [-1, 0];
  return { x, z, dir, length, facing };
}

/** World (x, z) of the point `along` the line and `out` in front of its face. */
export function onLine(line: FacadeLine, along: number, out: number): readonly [number, number] {
  const [dx, dz] = line.dir;
  const n = normalOf(line.facing);
  return [line.x + dx * along + n[0] * out, line.z + dz * along + n[1] * out];
}

/** The outward unit normal (x, z) of a facing. */
export function normalOf(facing: Facing): readonly [number, number] {
  switch (facing) {
    case '+z':
      return [0, 1];
    case '-z':
      return [0, -1];
    case '+x':
      return [1, 0];
    case '-x':
      return [-1, 0];
  }
}

/** A matrix that places an element modelled facing +Z (origin at its base centre on the wall face) at `along`, height `y`, `out` in front of the line's face. */
export function onFacade(line: FacadeLine, along: number, y: number, out = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  const [x, z] = onLine(line, along, out);
  return placed(x, y, z, facingAngle(line.facing), sx, sy, sz);
}

/** Adds a geometry modelled facing +Z at a facade position. */
export function addOnFacade(kit: Kit, geometry: BufferGeometry, material: Material, line: FacadeLine, along: number, y: number, out = 0, order?: number): void {
  kit.add(geometry, material, onFacade(line, along, y, out), order);
}

/** A box on a facade: `a0..a1` along the line, `y0..y1` up, `o0..o1` out from the face (negative is into the wall). */
export function addFacadeBox(kit: Kit, material: Material, line: FacadeLine, a0: number, a1: number, y0: number, y1: number, o0: number, o1: number, order?: number): void {
  const [xa, za] = onLine(line, a0, o0);
  const [xb, zb] = onLine(line, a1, o1);
  addBox(kit, material, Math.min(xa, xb), y0, Math.min(za, zb), Math.max(xa, xb), y1, Math.max(za, zb), order);
}
