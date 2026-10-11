/**
 * Seeded randomness and organic shapes shared by the landscape and fittings parts: a small PRNG, smooth value noise, icospheres, lumpy blobs, box fitting and tapered tubes.
 * Nothing here calls Math.random, so the same seed always gives the same numbers and equal part parameters give identical geometry.
 */
import * as THREE from 'three';

import type { MeshBuilder } from './builder.js';

/** A seeded generator (mulberry32) returning numbers in [0, 1); the same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = Math.imul(Math.trunc(seed) ^ 0x5bd1e995, 0x9e3779b1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A hash of one integer lattice point and a seed, in [0, 1). */
function lattice(ix: number, iy: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(iz, 0x1b873593) ^ Math.imul(Math.trunc(seed) + 0x632be5ab, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [−1, 1]: features about one unit apart, continuous everywhere, the same for the same seed. */
export function valueNoise(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  let sum = 0;
  for (let corner = 0; corner < 8; corner++) {
    const dx = corner & 1;
    const dy = (corner >> 1) & 1;
    const dz = (corner >> 2) & 1;
    const weight = (dx === 1 ? fx : 1 - fx) * (dy === 1 ? fy : 1 - fy) * (dz === 1 ? fz : 1 - fz);
    sum += weight * lattice(ix + dx, iy + dy, iz + dz, seed);
  }
  return sum * 2 - 1;
}

/** Points and triangles of a closed mesh, each triangle counter-clockwise seen from outside. */
export interface PolyMesh {
  readonly points: readonly THREE.Vector3[];
  readonly faces: readonly (readonly [number, number, number])[];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_POINTS: readonly (readonly [number, number, number])[] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
];
const ICO_FACES: readonly (readonly [number, number, number])[] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

const spheres = new Map<number, PolyMesh>();

/** A unit icosphere with 20 × 4^subdivisions triangles. Shared between callers: never mutate its points. */
export function icosphere(subdivisions: number): PolyMesh {
  const known = spheres.get(subdivisions);
  if (known !== undefined) return known;
  const points = ICO_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
  let faces: (readonly [number, number, number])[] = [...ICO_FACES];
  for (let s = 0; s < subdivisions; s++) {
    const midpoints = new Map<number, number>();
    const mid = (a: number, b: number): number => {
      const key = Math.min(a, b) * 1_000_000 + Math.max(a, b);
      const found = midpoints.get(key);
      if (found !== undefined) return found;
      const pa = points[a];
      const pb = points[b];
      if (pa === undefined || pb === undefined) throw new Error(`icosphere: face refers to missing point ${String(a)} or ${String(b)}.`);
      points.push(pa.clone().add(pb).normalize());
      midpoints.set(key, points.length - 1);
      return points.length - 1;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const mesh: PolyMesh = { points, faces };
  spheres.set(subdivisions, mesh);
  return mesh;
}

/** A lumpy blob: an icosphere pushed in and out along its radii by seeded noise, then stretched onto `radii` around `centre`. */
export interface LumpSpec {
  readonly centre: THREE.Vector3;
  /** Semi-axes in metres. */
  readonly radii: THREE.Vector3;
  /** Largest radial change as a fraction of the radius, from 0 to 0.5. */
  readonly roughness: number;
  /** Noise features per unit of the unit sphere; about 1.5 gives a few big lumps, 3 many small ones. */
  readonly frequency: number;
  readonly seed: number;
}

export function lumpyPoints(sphere: PolyMesh, spec: LumpSpec): THREE.Vector3[] {
  const f = spec.frequency;
  return sphere.points.map((p) => {
    const coarse = valueNoise(p.x * f + 17.3, p.y * f + 5.1, p.z * f + 11.7, spec.seed);
    const fine = valueNoise(p.x * f * 2.3 + 3.7, p.y * f * 2.3 + 29.1, p.z * f * 2.3 + 8.3, spec.seed + 101);
    const r = 1 + (spec.roughness * (coarse + 0.4 * fine)) / 1.4;
    return new THREE.Vector3(spec.centre.x + p.x * r * spec.radii.x, spec.centre.y + p.y * r * spec.radii.y, spec.centre.z + p.z * r * spec.radii.z);
  });
}

/** Adds the faces of a mesh flat shaded: one normal per triangle, taken from its winding. */
export function addFlatFaces(builder: MeshBuilder, points: readonly THREE.Vector3[], faces: PolyMesh['faces']): void {
  for (const [a, b, c] of faces) {
    const pa = points[a];
    const pb = points[b];
    const pc = points[c];
    if (pa === undefined || pb === undefined || pc === undefined) continue;
    builder.polygon([pa, pb, pc]);
  }
}

/** The joint axis-aligned bounds of several point sets. */
export function boundsOf(sets: readonly (readonly THREE.Vector3[])[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const set of sets) for (const p of set) box.expandByPoint(p);
  return box;
}

/** An affine stretch of a box onto exact bounds, with the scale per axis so normals can follow it. */
export interface Fit {
  readonly map: (p: THREE.Vector3) => THREE.Vector3;
  readonly scale: THREE.Vector3;
}

/**
 * Stretches `box` onto x in [−halfX, halfX], z in [−halfZ, halfZ] and y from its own bottom up to `top`.
 * Organic parts use it so that their bounding box is exactly what their parameters say, whatever the noise did.
 */
export function fitBox(box: THREE.Box3, halfX: number, halfZ: number, top: number): Fit {
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  const sx = (2 * halfX) / Math.max(box.max.x - box.min.x, 1e-9);
  const sz = (2 * halfZ) / Math.max(box.max.z - box.min.z, 1e-9);
  const sy = (top - box.min.y) / Math.max(box.max.y - box.min.y, 1e-9);
  const bottom = box.min.y;
  return {
    map: (p) => new THREE.Vector3((p.x - cx) * sx, bottom + (p.y - bottom) * sy, (p.z - cz) * sz),
    scale: new THREE.Vector3(sx, sy, sz),
  };
}

/**
 * A tapered tube along a polyline, `sides` facets round with smooth normals, capped flat at both ends.
 * `radii[i]` is the radius at `path[i]`; rings stay perpendicular to the path and do not twist.
 */
export function tubeInto(builder: MeshBuilder, path: readonly THREE.Vector3[], radii: readonly number[], sides: number): void {
  if (path.length < 2) return;
  const rings: THREE.Vector3[][] = [];
  const u = new THREE.Vector3();
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    if (p === undefined || prev === undefined || next === undefined) continue;
    const d = next.clone().sub(prev).normalize();
    if (i === 0) {
      const helper = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      u.crossVectors(helper, d).normalize();
    } else {
      u.addScaledVector(d, -u.dot(d)).normalize();
    }
    const v = new THREE.Vector3().crossVectors(d, u);
    const r = radii[i] ?? radii.at(-1) ?? 0;
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < sides; j++) {
      const theta = (2 * Math.PI * j) / sides;
      ring.push(p.clone().addScaledVector(u, r * Math.cos(theta)).addScaledVector(v, r * Math.sin(theta)));
    }
    rings.push(ring);
  }
  // Around the ring θ runs from u toward v and the rows run along the path, so the grid's front is outward.
  builder.grid(rings, { wrapU: true });
  const first = rings[0];
  const last = rings.at(-1);
  if (first !== undefined) builder.polygon([...first].reverse());
  if (last !== undefined) builder.polygon(last);
}
