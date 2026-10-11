/**
 * Geometry helpers of the Roche north area: one cached geometry per distinct shape (docs/design/spec.md, Batching), placed by matrices.
 * - `UNIT_BOX` is a closed 1 m cube centred on the origin; `boxAt` scales it onto a world box, so every plain block of a step batches into one mesh per material.
 * - `prismY` extrudes a plan outline (X, Z) upward; `prismZ` extrudes an elevation outline (X, Y) along Z. Both are closed solids, so the section cut reads them as solid.
 * Shapes made here are local to this folder; parts the library has (columns, glazing, stairs, fittings) come from src/model/lib/.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { MeshBuilder, type V2 } from '../lib/index.js';
import type { Kit, Vec3 } from '../../build/types.js';
import type { Material , BufferGeometry} from 'three';

const store = new Map<string, unknown>();

/** Returns the value cached under `key`, building it on the first call; keys name the shape and its parameters. */
export function memo<T>(key: string, build: () => T): T {
  if (store.has(key)) return store.get(key) as T;
  const made = build();
  store.set(key, made);
  return made;
}

/** A stable key for numeric parameters, rounded to 0.1 mm. */
export function keyOf(name: string, ...values: readonly (number | string | readonly number[])[]): string {
  const text = values.map((v) => (typeof v === 'number' ? v.toFixed(4) : typeof v === 'string' ? v : v.map((n) => n.toFixed(4)).join(','))).join('|');
  return `${name}|${text}`;
}

/** A closed 1 m cube centred on the origin. */
export const UNIT_BOX: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.box([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]);
  return b.build();
})();

/** A matrix that maps the unit box onto the world box `min`..`max`. */
export function boxMatrix(min: Vec3, max: Vec3): Matrix4 {
  return new Matrix4().compose(
    new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2),
    new Quaternion(),
    new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
  );
}

/** Adds a block spanning the world corners `min`..`max` (each axis must have positive extent). */
export function boxAt(kit: Kit, material: Material, min: Vec3, max: Vec3, order?: number): void {
  if (!(max[0] > min[0] && max[1] > min[1] && max[2] > min[2])) throw new Error(`boxAt: the box (${min.join(', ')}) to (${max.join(', ')}) has no volume; pass min below max on every axis.`);
  kit.add(UNIT_BOX, material, boxMatrix(min, max), order);
}

/** A translation, optionally turned about +Y by `turn` radians and scaled uniformly. */
export function at(x: number, y: number, z: number, turn = 0, scale = 1): Matrix4 {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), turn), new Vector3(scale, scale, scale));
}

/** Signed area of a plan outline in (a, b); positive when counter-clockwise with a right and b up. */
function signedArea(outline: readonly V2[]): number {
  let area = 0;
  for (let i = 0; i < outline.length; i++) {
    const [a0, b0] = outline[i] ?? [0, 0];
    const [a1, b1] = outline[(i + 1) % outline.length] ?? [0, 0];
    area += a0 * b1 - a1 * b0;
  }
  return area / 2;
}

/** Side quads of an extrusion: for each outline edge, a quad from `lo` to `hi` facing out of the solid. */
function sides(b: MeshBuilder, points: readonly Vector3[], lift: Vector3, outwardSign: number): void {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    if (p === undefined || q === undefined) continue;
    const quad = [p, q, q.clone().add(lift), p.clone().add(lift)];
    b.polygon(outwardSign > 0 ? quad : quad.reverse());
  }
}

/**
 * A closed solid: the plan outline [x, z] (any winding, concave allowed, no holes) from y = y0 to y = y1, in world coordinates (place it with an identity matrix).
 * Cached by its numbers, so the same outline is one geometry.
 */
export function prismY(outline: readonly V2[], y0: number, y1: number): BufferGeometry {
  return memo(keyOf('prismY', outline.flat(), y0, y1), () => {
    const b = new MeshBuilder();
    // Plan (x, z) with x right and z down the page: counter-clockwise seen from above means negative signed area in (x, z).
    const ccwFromAbove = signedArea(outline) < 0;
    const loop = ccwFromAbove ? [...outline] : [...outline].reverse();
    const flat = loop.map(([x, z]) => [x, -z] as const);
    b.planar(flat, [], new Vector3(0, y1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1));
    b.planar(flat.map(([u, v]) => [u, -v] as const), [], new Vector3(0, y0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1));
    const ring = loop.map(([x, z]) => new Vector3(x, y0, z));
    sides(b, ring, new Vector3(0, y1 - y0, 0), 1);
    return b.build();
  });
}

/**
 * A closed solid: the elevation outline [x, y] (any winding, concave allowed) from z = z0 to z = z1, optionally sheared so it leans:
 * each point moves by `lean` × (y − leanBase) along −Z (a positive lean tips the top back toward −Z). World coordinates.
 */
export function prismZ(outline: readonly V2[], z0: number, z1: number, lean = 0, leanBase = 0): BufferGeometry {
  return memo(keyOf('prismZ', outline.flat(), z0, z1, lean, leanBase), () => {
    const b = new MeshBuilder();
    const ccw = signedArea(outline) > 0;
    const loop = ccw ? [...outline] : [...outline].reverse();
    const shift = (y: number): number => -lean * (y - leanBase);
    const front = loop.map(([x, y]) => new Vector3(x, y, z1 + shift(y)));
    const back = loop.map(([x, y]) => new Vector3(x, y, z0 + shift(y)));
    // Front (+Z) and back faces: triangulate the outline once and reuse the triangles.
    const tris = triangulate(loop);
    for (const [i, j, k] of tris) {
      const a = front[i];
      const c = front[j];
      const d = front[k];
      const e = back[i];
      const f = back[j];
      const g = back[k];
      if (a !== undefined && c !== undefined && d !== undefined) b.polygon([a, c, d]);
      if (e !== undefined && f !== undefined && g !== undefined) b.polygon([e, g, f]);
    }
    for (let i = 0; i < loop.length; i++) {
      const p0 = back[i];
      const p1 = back[(i + 1) % loop.length];
      const q0 = front[i];
      const q1 = front[(i + 1) % loop.length];
      if (p0 && p1 && q0 && q1) b.polygon([p0, p1, q1, q0]);
    }
    return b.build();
  });
}

/** Ear-cut triangles of a counter-clockwise outline, as index triples. */
function triangulate(loop: readonly V2[]): [number, number, number][] {
  const index: number[] = loop.map((_, i) => i);
  const out: [number, number, number][] = [];
  const pt = (i: number): V2 => loop[i] ?? [0, 0];
  const cross = (a: V2, b: V2, c: V2): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: V2, a: V2, b: V2, c: V2): boolean => cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12;
  let guard = 0;
  while (index.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let k = 0; k < index.length; k++) {
      const i0 = index[(k + index.length - 1) % index.length] ?? 0;
      const i1 = index[k] ?? 0;
      const i2 = index[(k + 1) % index.length] ?? 0;
      const a = pt(i0);
      const b = pt(i1);
      const c = pt(i2);
      if (cross(a, b, c) <= 1e-12) continue;
      if (index.some((m) => m !== i0 && m !== i1 && m !== i2 && inside(pt(m), a, b, c))) continue;
      out.push([i0, i1, i2]);
      index.splice(k, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (index.length === 3) out.push([index[0] ?? 0, index[1] ?? 0, index[2] ?? 0]);
  return out;
}

/** World matrix of a piece whose local frame faces +Z, turned so its front faces `facing` ('+x', '-x', '+z' or '-z'), at `position`. */
export function facingMatrix(facing: '+x' | '-x' | '+z' | '-z', position: Vec3): Matrix4 {
  const turn = facing === '+z' ? 0 : facing === '+x' ? Math.PI / 2 : facing === '-z' ? Math.PI : -Math.PI / 2;
  return at(position[0], position[1], position[2], turn);
}
