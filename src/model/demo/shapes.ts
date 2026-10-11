/**
 * Temporary demo (src/model/demo/): shared unit shapes and placement helpers for the toy building. Nothing outside src/model/demo/ may import this.
 * One geometry per distinct shape, scaled by each piece's matrix, so equal pieces batch into one InstancedMesh.
 */
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Matrix4, Quaternion, Shape, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { Kit, Vec3 } from '../../build/types.js';

/** 1 m cube centred on the origin. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1);
/** Cylinder of diameter 1 and height 1, centred on the origin. */
export const UNIT_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);
/** Tapered column shaft, base diameter 1, top diameter 0.88, height 1, centred. */
export const SHAFT = new CylinderGeometry(0.44, 0.5, 1, 24);
/** Sphere of diameter 1, centred. */
export const UNIT_SPHERE = new SphereGeometry(0.5, 24, 16);
/** Hemisphere of radius 1, base on the origin. */
export const DOME = new SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);

/** Triangular prism: base width 1 along X, height 1, depth 1 along Z, base centred on the origin. */
export const PEDIMENT: BufferGeometry = (() => {
  const triangle = new Shape();
  triangle.moveTo(-0.5, 0);
  triangle.lineTo(0.5, 0);
  triangle.lineTo(0, 1);
  triangle.closePath();
  const geometry = new ExtrudeGeometry(triangle, { depth: 1, bevelEnabled: false });
  geometry.translate(0, 0, -0.5);
  return geometry;
})();

/** A world matrix from a position, a rotation about Y in radians and a scale. */
export function placed(position: Vec3, scale: Vec3 = [1, 1, 1], rotationY = 0): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY),
    new Vector3(...scale),
  );
}

/** Adds a box spanning the world corners `min` to `max`. */
export function box(kit: Kit, material: Material, min: Vec3, max: Vec3, order?: number): void {
  const centre: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  kit.add(UNIT_BOX, material, placed(centre, size), order);
}

/** Adds a centred unit shape scaled to `size`, its base at `base` (the bottom centre). */
export function standing(kit: Kit, geometry: BufferGeometry, material: Material, base: Vec3, size: Vec3, order?: number): void {
  kit.add(geometry, material, placed([base[0], base[1] + size[1] / 2, base[2]], size), order);
}

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32), so the demo is the same on every load. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
