/**
 * Shared shapes and placement helpers for the core area: a memo cache for local parts, a unit box placed by its world bounds, and a few
 * small solids (cylinder, disc, prism). One geometry per distinct shape, reused everywhere, so each step batches into few instanced meshes.
 * Unit solids have their origin at the bottom centre and span 1 m in X, Y and Z; a piece's matrix scales and places them.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder } from '../lib/index.js';

const memoStore = new Map<string, unknown>();

/** Returns the cached result for `key`, building it on first use: equal keys give the identical object, so the kit instances it. */
export function memo<T>(key: string, build: () => T): T {
  if (memoStore.has(key)) return memoStore.get(key) as T;
  const made = build();
  memoStore.set(key, made);
  return made;
}

/** A key part from numbers rounded to the millimetre, so float noise does not split a cache entry. */
export function keyOf(...values: readonly (number | string | boolean)[]): string {
  return values.map((v) => (typeof v === 'number' ? (Math.round(v * 1000) / 1000).toString() : String(v))).join(',');
}

/** The unit box: x and z from −0.5 to 0.5, y from 0 to 1. */
export const UNIT_BOX: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.5]);
  return b.build();
})();

/** A unit cylinder (radius 0.5, height 1, origin at the bottom centre) with `sides` facets, capped. */
export function cylinder(sides: number): BufferGeometry {
  return memo(`cylinder:${String(sides)}`, () => {
    const b = new MeshBuilder();
    const ring = (y: number): Vector3[] => Array.from({ length: sides }, (_, k) => new Vector3(0.5 * Math.cos((2 * Math.PI * k) / sides), y, -0.5 * Math.sin((2 * Math.PI * k) / sides)));
    b.grid([ring(0), ring(1)], { wrapU: true });
    b.polygon(ring(1));
    b.polygon(ring(0).reverse());
    return b.build();
  });
}

/**
 * A unit half cylinder (radius 0.5, height 1, origin at the bottom centre of its flat back in z = 0), its round side toward +Z, with `sides` facets
 * round the half turn, closed: a shaft standing against a face, so it does not overlap the solid behind it (the parity rule reads an overlap as outside).
 */
export function halfCylinder(sides: number): BufferGeometry {
  return memo(`halfCylinder:${String(sides)}`, () => {
    const b = new MeshBuilder();
    const ring = (y: number): Vector3[] => Array.from({ length: sides + 1 }, (_, k) => new Vector3(0.5 * Math.cos((Math.PI * k) / sides), y, 0.5 * Math.sin((Math.PI * k) / sides)));
    b.grid([ring(0), ring(1)], { flip: true });
    b.polygon(ring(1).reverse());
    b.polygon(ring(0));
    b.polygon([new Vector3(0.5, 0, 0), new Vector3(-0.5, 0, 0), new Vector3(-0.5, 1, 0), new Vector3(0.5, 1, 0)]);
    return b.build();
  });
}

/** Matrix of a unit box filling the world box [x0, x1] × [y0, y1] × [z0, z1] (any corner order). */
export function boxMatrix(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Matrix4 {
  const sx = Math.abs(x1 - x0);
  const sy = Math.abs(y1 - y0);
  const sz = Math.abs(z1 - z0);
  return new Matrix4().makeScale(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4)).setPosition((x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2);
}

/** Adds a unit box filling a world box. */
export function addBox(kit: Kit, material: Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, order?: number): void {
  kit.add(UNIT_BOX, material, boxMatrix(x0, y0, z0, x1, y1, z1), order);
}

/** A matrix placing a part at (x, y, z) turned `yaw` radians about +Y (0 keeps its front toward +Z), optionally scaled. */
export function placed(x: number, y: number, z: number, yaw = 0, scale: readonly [number, number, number] = [1, 1, 1]): Matrix4 {
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  return new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(...scale));
}

/** Facing of a wall face, as the yaw that turns a part's +Z front to point that way. */
export const FACING = Object.freeze({ east: 0, west: Math.PI, north: Math.PI / 2, south: -Math.PI / 2 });

/** Splits [lo, hi] into runs that avoid the given gaps (each [g0, g1]), dropping runs shorter than `min`. */
export function runsBetween(lo: number, hi: number, gaps: readonly (readonly [number, number])[], min = 0.05): [number, number][] {
  let pieces: [number, number][] = [[lo, hi]];
  for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
    const next: [number, number][] = [];
    for (const [a, b] of pieces) {
      if (g1 <= a || g0 >= b) next.push([a, b]);
      else {
        if (g0 > a) next.push([a, g0]);
        if (g1 < b) next.push([g1, b]);
      }
    }
    pieces = next;
  }
  return pieces.filter(([a, b]) => b - a >= min);
}
