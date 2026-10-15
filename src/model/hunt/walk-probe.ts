/**
 * A headless walk over the model's solid surfaces, for the route tests (imported only by `*.test.ts`; plan docs/work/1_first-person-walk, milestone M2).
 * The surfaces are the Timeline's own: every instance of every visible mesh at the position last evaluated, in world space, except meshes whose material
 * is passable (`userData.solid === false`), which the walk mode leaves out of its collision too.
 * The walker is the walk mode's capsule, carried upright along a plan polyline in 5 cm samples. At each sample it stands on the highest solid surface under
 * its footprint (the centre and 16 points round it) that is at most a step above its feet. It stops on a drop of more than a step (a gap or a ledge), on
 * no surface at all, and on any solid triangle reaching inside the capsule above step height, measured exactly: the triangle clipped to the cylinder's
 * band, in plan, against the radius, and clipped to the top hemisphere, in space, against its centre.
 * Bound: only the given line is walked, at its samples. Slopes are limited only by the step per sample (a 40° slope rises 4.2 cm per 5 cm sample, and
 * anything under 81° passes). A gap narrower than the footprint (0.7 m) is bridged, as a capsule bridges it. Jumping, the camera and the controller's own
 * integration are not modelled. Only triangles inside the given box are kept.
 */
import { Box3, Matrix4, Triangle, Vector3 } from 'three';

import type { Timeline } from '../../build/timeline.js';

/** The walk mode's capsule (plan 1_first-person-walk, M1): radius, height and the highest step it climbs, metres. */
export const WALKER = { radius: 0.35, height: 1.75, step: 0.35 } as const;
export type Walker = typeof WALKER;

/** Plan sample spacing along a route and the plan grid's cell, metres. */
const SAMPLE = 0.05;
const CELL = 0.5;
const EPS = 1e-9;

type P3 = readonly [number, number, number];

export interface Region {
  readonly min: P3;
  readonly max: P3;
}

export interface Hit {
  readonly y: number;
  /** The step and material of the piece hit. */
  readonly label: string;
}

/** The solid triangles of a timeline's visible meshes inside `region`, in world space, indexed by a plan grid. */
export class Solids {
  readonly triangles: number;
  private readonly v: Float64Array;
  private readonly yMin: Float64Array;
  private readonly yMax: Float64Array;
  private readonly labelOf: Uint32Array;
  private readonly labels: readonly string[];
  private readonly cells = new Map<number, number[]>();
  private readonly seen: Uint32Array;
  private visit = 0;

  constructor(timeline: Timeline, region: Region) {
    const [x0, y0, z0] = region.min;
    const [x1, y1, z1] = region.max;
    const keep = new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1));
    const v: number[] = [];
    const labelOf: number[] = [];
    const labels: string[] = [];
    const instance = new Matrix4();
    const world = new Matrix4();
    const box = new Box3();
    const p = new Vector3();
    timeline.root.updateMatrixWorld(true);
    for (const step of timeline.steps) {
      for (const mesh of step.meshes) {
        const material = mesh.material;
        if (Array.isArray(material)) throw new Error(`Solids: mesh ${mesh.name} of step ${step.def.id} has several materials; the kit's meshes have one each.`);
        if (!mesh.visible || mesh.count === 0 || material.userData['solid'] === false) continue;
        const geometry = mesh.geometry;
        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        const bounds = geometry.boundingBox ?? new Box3();
        const position = geometry.getAttribute('position');
        const index = geometry.index;
        const count = index?.count ?? position.count;
        const label = labels.push(`${step.def.id} / ${material.name}`) - 1;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance);
          world.multiplyMatrices(mesh.matrixWorld, instance);
          if (!box.copy(bounds).applyMatrix4(world).intersectsBox(keep)) continue;
          for (let c = 0; c + 2 < count; c += 3) {
            const corners: P3[] = [];
            for (let k = 0; k < 3; k++) {
              p.fromBufferAttribute(position, index === null ? c + k : index.getX(c + k)).applyMatrix4(world);
              corners.push([p.x, p.y, p.z]);
            }
            if (!meets(corners, region)) continue;
            for (const q of corners) v.push(...q);
            labelOf.push(label);
          }
        }
      }
    }
    this.v = Float64Array.from(v);
    this.triangles = labelOf.length;
    this.labelOf = Uint32Array.from(labelOf);
    this.labels = labels;
    this.yMin = new Float64Array(this.triangles);
    this.yMax = new Float64Array(this.triangles);
    this.seen = new Uint32Array(this.triangles);
    for (let t = 0; t < this.triangles; t++) {
      const [a, b, c] = this.corners(t);
      this.yMin[t] = Math.min(a[1], b[1], c[1]);
      this.yMax[t] = Math.max(a[1], b[1], c[1]);
      for (let i = cell(Math.max(Math.min(a[0], b[0], c[0]), x0)); i <= cell(Math.min(Math.max(a[0], b[0], c[0]), x1)); i++) {
        for (let j = cell(Math.max(Math.min(a[2], b[2], c[2]), z0)); j <= cell(Math.min(Math.max(a[2], b[2], c[2]), z1)); j++) {
          const key = cellKey(i, j);
          const list = this.cells.get(key);
          if (list === undefined) this.cells.set(key, [t]);
          else list.push(t);
        }
      }
    }
  }

  /** Every height at which the vertical line through (x, z) meets a solid triangle. */
  heights(x: number, z: number): Hit[] {
    const out: Hit[] = [];
    for (const t of this.cells.get(cellKey(cell(x), cell(z))) ?? []) {
      const y = heightOn(this.corners(t), x, z);
      if (y !== undefined) out.push({ y, label: this.label(t) });
    }
    return out;
  }

  /** The highest solid surface under (x, z) at or below `limit`, if any. */
  floor(x: number, z: number, limit: number): Hit | undefined {
    let best: Hit | undefined;
    for (const hit of this.heights(x, z)) if (hit.y <= limit + EPS && (best === undefined || hit.y > best.y)) best = hit;
    return best;
  }

  /**
   * A solid triangle reaching inside the walker standing at (x, z) with its feet at `feet`, above step height, if any; `y` is the lowest height at which
   * the part of it inside the capsule lies.
   */
  intrusion(x: number, z: number, feet: number, walker: Walker): Hit | undefined {
    const { radius: r, height: h, step } = walker;
    const low = feet + step + 1e-6;
    const centre = feet + h - r;
    this.visit += 1;
    for (let i = cell(x - r); i <= cell(x + r); i++) {
      for (let j = cell(z - r); j <= cell(z + r); j++) {
        for (const t of this.cells.get(cellKey(i, j)) ?? []) {
          if (this.seen[t] === this.visit) continue;
          this.seen[t] = this.visit;
          if ((this.yMax[t] ?? 0) <= low || (this.yMin[t] ?? 0) >= feet + h) continue;
          const corners = this.corners(t);
          const band = clipY(clipY(corners, low, 1), centre, -1);
          if (band.length > 0 && planDistance(x, z, band) < r) return { y: Math.min(...band.map((p) => p[1])), label: this.label(t) };
          const cap = clipY(corners, centre, 1);
          if (cap.length > 0 && spaceDistance([x, centre, z], cap) < r) return { y: Math.min(...cap.map((p) => p[1])), label: this.label(t) };
        }
      }
    }
    return undefined;
  }

  private label(t: number): string {
    return this.labels[this.labelOf[t] ?? 0] ?? '?';
  }

  private corners(t: number): [P3, P3, P3] {
    const at = (k: number): P3 => [this.v[9 * t + 3 * k] ?? 0, this.v[9 * t + 3 * k + 1] ?? 0, this.v[9 * t + 3 * k + 2] ?? 0];
    return [at(0), at(1), at(2)];
  }
}

/** Whether the bounding box of `points` meets `region`. */
function meets(points: readonly P3[], region: Region): boolean {
  for (let axis = 0; axis < 3; axis++) {
    const values = points.map((q) => q[axis] ?? 0);
    if (Math.max(...values) < (region.min[axis] ?? 0) || Math.min(...values) > (region.max[axis] ?? 0)) return false;
  }
  return true;
}

function cell(u: number): number {
  return Math.floor(u / CELL);
}

function cellKey(i: number, j: number): number {
  return (i + 100_000) * 200_000 + (j + 100_000);
}

/** The height of triangle `[a, b, c]` over (x, z), when (x, z) lies inside its plan (edges included). */
function heightOn([a, b, c]: readonly [P3, P3, P3], x: number, z: number): number | undefined {
  const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(d) < 1e-12) return undefined;
  const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
  const w = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
  if (u < -EPS || w < -EPS || 1 - u - w < -EPS) return undefined;
  return u * a[1] + w * b[1] + (1 - u - w) * c[1];
}

/** The part of the convex polygon `poly` above (`side` 1) or below (−1) the plane at height `c` (Sutherland–Hodgman). */
function clipY(poly: readonly P3[], c: number, side: 1 | -1): P3[] {
  const out: P3[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length] ?? p;
    const dp = side * (p[1] - c);
    const dq = side * (q[1] - c);
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const s = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * s, c, p[2] + (q[2] - p[2]) * s]);
    }
  });
  return out;
}

function segmentDistance(x: number, z: number, p: P3, q: P3): number {
  const dx = q[0] - p[0];
  const dz = q[2] - p[2];
  const length2 = dx * dx + dz * dz;
  const s = length2 < 1e-18 ? 0 : Math.min(1, Math.max(0, ((x - p[0]) * dx + (z - p[2]) * dz) / length2));
  return Math.hypot(x - (p[0] + s * dx), z - (p[2] + s * dz));
}

/** The plan distance from (x, z) to the plan of the convex polygon `poly`: 0 inside it, otherwise to its nearest edge. */
function planDistance(x: number, z: number, poly: readonly P3[]): number {
  let area = 0;
  for (const [i, p] of poly.entries()) {
    const q = poly[(i + 1) % poly.length] ?? p;
    area += p[0] * q[2] - q[0] * p[2];
  }
  let inside = Math.abs(area) > 1e-12;
  let nearest = Infinity;
  for (const [i, p] of poly.entries()) {
    const q = poly[(i + 1) % poly.length] ?? p;
    if (inside && ((q[0] - p[0]) * (z - p[2]) - (q[2] - p[2]) * (x - p[0])) * area < 0) inside = false;
    nearest = Math.min(nearest, segmentDistance(x, z, p, q));
  }
  return inside ? 0 : nearest;
}

const triangle = new Triangle();
const closest = new Vector3();
const point = new Vector3();
/** The distance in space from `centre` to the convex polygon `poly` (as a fan of triangles). */
function spaceDistance(centre: P3, poly: readonly P3[]): number {
  point.set(...centre);
  const first = poly[0];
  if (first === undefined) return Infinity;
  if (poly.length < 3) return Math.min(...poly.map((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2])));
  let nearest = Infinity;
  for (let k = 1; k + 1 < poly.length; k++) {
    triangle.a.set(...first);
    triangle.b.set(...(poly[k] ?? first));
    triangle.c.set(...(poly[k + 1] ?? first));
    nearest = Math.min(nearest, triangle.closestPointToPoint(point, closest).distanceTo(point));
  }
  return nearest;
}

export interface Walk {
  /** Where the walker stopped: the route's end, or the sample that failed (feet height in y). */
  readonly end: { readonly x: number; readonly y: number; readonly z: number };
  /** Why it stopped short of the end; undefined when it got there. */
  readonly failure: string | undefined;
  /** The largest step up and step down between two samples, metres. */
  readonly maxRise: number;
  readonly maxDrop: number;
  readonly samples: number;
}

/** The footprint's probe points as plan offsets: the centre, 8 at half the radius and 8 just inside it. */
function footprint(r: number): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [[0, 0]];
  for (const f of [0.5, 0.97]) for (let k = 0; k < 8; k++) out.push([f * r * Math.cos((k * Math.PI) / 4), f * r * Math.sin((k * Math.PI) / 4)]);
  return out;
}

const where = (x: number, z: number, y: number): string => `(${x.toFixed(2)}, ${z.toFixed(2)}) with the feet at Y ${y.toFixed(3)}`;

/** Carries the walker along `route` (plan points [x, z]), starting with its feet at most a step under `startY`. */
export function walk(solids: Solids, route: readonly (readonly [number, number])[], startY: number, walker: Walker = WALKER): Walk {
  const probes = footprint(walker.radius);
  const points: [number, number][] = [];
  for (const [i, [x, z]] of route.entries()) {
    const prev = route[i - 1];
    const n = prev === undefined ? 0 : Math.max(1, Math.ceil(Math.hypot(x - prev[0], z - prev[1]) / SAMPLE));
    if (prev === undefined) points.push([x, z]);
    else for (let k = 1; k <= n; k++) points.push([prev[0] + ((x - prev[0]) * k) / n, prev[1] + ((z - prev[1]) * k) / n]);
  }
  let feet = startY;
  let maxRise = 0;
  let maxDrop = 0;
  const stop = (x: number, z: number, failure: string | undefined, samples: number): Walk => ({ end: { x, y: feet, z }, failure, maxRise, maxDrop, samples });
  for (const [i, [x, z]] of points.entries()) {
    let support: Hit | undefined;
    for (const [dx, dz] of probes) {
      const hit = solids.floor(x + dx, z + dz, feet + walker.step);
      if (hit !== undefined && (support === undefined || hit.y > support.y)) support = hit;
    }
    if (support === undefined) return stop(x, z, `no solid surface under ${where(x, z, feet)} within a step (${String(walker.step)} m) above the feet`, i);
    if (i > 0) {
      const rise = support.y - feet;
      if (-rise > walker.step) return stop(x, z, `a drop of ${(-rise).toFixed(3)} m at ${where(x, z, feet)}, onto ${support.label} at Y ${support.y.toFixed(3)}`, i);
      maxRise = Math.max(maxRise, rise);
      maxDrop = Math.max(maxDrop, -rise);
    }
    feet = support.y;
    const hit = solids.intrusion(x, z, feet, walker);
    if (hit !== undefined) return stop(x, z, `blocked at ${where(x, z, feet)}: ${hit.label} reaches inside the walker from Y ${hit.y.toFixed(3)}`, i);
  }
  const [x, z] = points[points.length - 1] ?? [0, 0];
  return stop(x, z, undefined, points.length);
}
