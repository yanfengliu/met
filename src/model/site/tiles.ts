/**
 * Shared unit shapes and placement for the site's paved surfaces, so every slab, tile, curb and marking of a step batches into one instanced mesh
 * (docs/design/spec.md, Batching). A piece is a unit shape scaled to its cell and turned to the surface's slope there; the surfaces are planar within each
 * grid cell (grid.ts puts the profile's breakpoints and the road's crown on grid lines), so neighbouring tiles meet edge to edge.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder, sheet } from '../lib/index.js';

/** A 1 × 1 m quad in XZ, centred on the origin, facing +Y: a sheet laid on a surface (paving, a gutter, paint; ../lib/sheet.ts). */
export const UNIT_TILE: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.polygon([new Vector3(-0.5, 0, 0.5), new Vector3(0.5, 0, 0.5), new Vector3(0.5, 0, -0.5), new Vector3(-0.5, 0, -0.5)]);
  return sheet(b.build());
})();

/** A 1 m cube hanging from its top face: x and z in ±0.5, y in [−1, 0]; scaled in y it is a slab of that thickness under its top. */
export const UNIT_SLAB: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.box([-0.5, -1, -0.5], [0.5, 0, 0.5]);
  return b.build();
})();

/** A 1 m cube standing on its base: x and z in ±0.5, y in [0, 1]. */
export const UNIT_BLOCK: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.5]);
  return b.build();
})();

export type Height = (x: number, z: number) => number;

const ax = new Vector3();
const ay = new Vector3();
const az = new Vector3();

/**
 * The matrix that lays a unit shape over the rectangle [x0, x1] × [z0, z1] on the surface `height`, lifted by `lift`, with `thickness` as its y scale.
 * The surface's slope comes from the rectangle's corners; the rectangle's plan size is kept to second order in the slope.
 */
export function surfaceMatrix(x0: number, x1: number, z0: number, z1: number, height: Height, lift = 0, thickness = 1): Matrix4 {
  const h00 = height(x0, z0);
  const h10 = height(x1, z0);
  const h01 = height(x0, z1);
  const h11 = height(x1, z1);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const sx = (h10 - h00 + h11 - h01) / (2 * dx);
  const sz = (h01 - h00 + h11 - h10) / (2 * dz);
  ax.set(1, sx, 0).normalize();
  az.set(0, sz, 1).normalize();
  ay.crossVectors(az, ax).normalize();
  az.crossVectors(ax, ay);
  const m = new Matrix4().makeBasis(ax.clone().multiplyScalar(dx * Math.hypot(1, sx)), ay.clone().multiplyScalar(thickness), az.clone().multiplyScalar(dz * Math.hypot(1, sz)));
  m.setPosition((x0 + x1) / 2, (h00 + h10 + h01 + h11) / 4 + lift, (z0 + z1) / 2);
  return m;
}

/**
 * A frame lying on the surface `height` at (x, z): its origin on the surface, its +Y the surface's normal from the slope over `span` metres round the point.
 * Compose a piece's own placement after it, so a fountain or a bed follows the plaza's slope instead of standing level and proud at one corner.
 */
export function planeMatrix(x: number, z: number, height: Height, span = 2): Matrix4 {
  const h = span / 2;
  const sx = (height(x + h, z) - height(x - h, z)) / span;
  const sz = (height(x, z + h) - height(x, z - h)) / span;
  ax.set(1, sx, 0).normalize();
  az.set(0, sz, 1).normalize();
  ay.crossVectors(az, ax).normalize();
  az.crossVectors(ax, ay);
  return new Matrix4().makeBasis(ax, ay, az).setPosition(x, height(x, z), z);
}

/** A block standing on (x, y, z), sized sx × sy × sz and turned `yaw` radians about +Y. */
export function blockMatrix(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0): Matrix4 {
  return new Matrix4().makeRotationY(yaw).scale(new Vector3(sx, sy, sz)).setPosition(x, y, z);
}

/** A unit block stretched from p to q (its length), `width` across and `height` tall, standing on the segment p → q (heights in p[1], q[1]). */
export function beamMatrix(p: readonly [number, number, number], q: readonly [number, number, number], width: number, height: number): Matrix4 {
  const d = new Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const length = d.length();
  ax.copy(d).normalize();
  // Keep the beam's width horizontal: its z axis is the horizontal perpendicular of the run.
  az.set(-ax.z, 0, ax.x);
  if (az.lengthSq() < 1e-12) az.set(0, 0, 1);
  az.normalize();
  ay.crossVectors(az, ax).normalize();
  az.crossVectors(ax, ay);
  const m = new Matrix4().makeBasis(ax.clone().multiplyScalar(length), ay.clone().multiplyScalar(height), az.clone().multiplyScalar(width));
  m.setPosition((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
  return m;
}
