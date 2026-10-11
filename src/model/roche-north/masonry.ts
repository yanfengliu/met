/**
 * Ashlar masonry for the Temple of Dendur and its gate: walls laid course by course from one shared chamfered block, so a whole temple is one instanced mesh
 * and a `stagger: 'y'` step lays it course by course. Corners bond: on alternate courses the long walls or the end walls run through the corner.
 * Units metres; a `Course` plan is in the monument's local frame (origin at its base centre, front +Z), placed by `frame`.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { MeshBuilder } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import type { Material , BufferGeometry} from 'three';

const vec = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

/** A unit block (−0.5..0.5) with its edges chamfered by the given fraction of each side, so joints read as fine grooves when blocks touch. */
function chamferedBlock(chamfer: number): BufferGeometry {
  const h = 0.5;
  const i = h - chamfer;
  const b = new MeshBuilder();
  /** The block is convex and centred, so each face is wound to face away from the origin. */
  const face = (points: Vector3[]): void => {
    const n = new Vector3();
    const centre = new Vector3();
    points.forEach((p, k) => {
      const q = points[(k + 1) % points.length] ?? p;
      n.add(new Vector3().crossVectors(p, q));
      centre.add(p);
    });
    b.polygon(n.dot(centre) >= 0 ? points : [...points].reverse());
  };
  // Six inset faces.
  for (const s of [-1, 1]) {
    face([vec(s * h, -i, -i), vec(s * h, i, -i), vec(s * h, i, i), vec(s * h, -i, i)]);
    face([vec(-i, s * h, -i), vec(i, s * h, -i), vec(i, s * h, i), vec(-i, s * h, i)]);
    face([vec(-i, -i, s * h), vec(i, -i, s * h), vec(i, i, s * h), vec(-i, i, s * h)]);
  }
  // Twelve edge chamfers and eight corner triangles.
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      face([vec(s * h, t * i, -i), vec(s * h, t * i, i), vec(s * i, t * h, i), vec(s * i, t * h, -i)]);
      face([vec(s * h, -i, t * i), vec(s * h, i, t * i), vec(s * i, i, t * h), vec(s * i, -i, t * h)]);
      face([vec(-i, s * h, t * i), vec(i, s * h, t * i), vec(i, s * i, t * h), vec(-i, s * i, t * h)]);
      for (const u of [-1, 1]) face([vec(s * h, t * i, u * i), vec(s * i, t * h, u * i), vec(s * i, t * i, u * h)]);
    }
  }
  return b.build();
}

/** The temple's and gate's blocks: a 2.5% chamfer. */
export const ASHLAR_BLOCK = chamferedBlock(0.025);
/** Larger blocks of finer joints, for the gallery's back wall: a 0.4% chamfer. */
export const FINE_BLOCK = chamferedBlock(0.004);

/** A straight wall in plan: along `axis` from `from` to `to`, spanning `inner`..`outer` on the other axis; `outer` is the face that batters. */
export interface WallRun {
  readonly axis: 'x' | 'z';
  readonly from: number;
  readonly to: number;
  readonly inner: number;
  readonly outer: number;
  /** Gaps along the run (doorways), each `[a, b, top]`: no blocks between a and b on courses that start below `top`. */
  readonly gaps?: readonly (readonly [number, number, number])[];
  /** On odd courses the run shortens at both ends by this much (or lengthens, when negative), so walls bond through their corners. */
  readonly bond?: number;
}

export interface CourseSpec {
  /** Course height, metres. */
  readonly course: number;
  /** Number of courses. */
  readonly courses: number;
  /** Height of the first course's bed above the local origin. */
  readonly base?: number;
  /** Inward step of each battered outer face per course, metres. */
  readonly batter: number;
  /** Target block length, metres. */
  readonly block: number;
  /** Seed for the block-length variation. */
  readonly seed: number;
}

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
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

const JOINT = 0.01;

/** Splits [a, b] into blocks near `target` long, staggered by `phase` (0 or 0.5 of a block) with ±20% seeded variation. */
function blockEdges(a: number, b: number, target: number, phase: number, rand: () => number): number[] {
  const length = b - a;
  const n = Math.max(1, Math.round(length / target));
  const step = length / n;
  const edges = [a];
  let x = a + step * (phase > 0 ? 0.5 : 1) * (0.8 + 0.4 * rand());
  while (x < b - 0.35 * step) {
    edges.push(x);
    x += step * (0.8 + 0.4 * rand());
  }
  edges.push(b);
  return edges;
}

/**
 * Adds the courses of `runs` to the kit as chamfered blocks in `material`, in the monument frame `frame`.
 * Course k lies from base + k × course to base + (k + 1) × course; each run's outer face steps in by k × batter.
 */
export function layCourses(kit: Kit, material: Material, frame: Matrix4, runs: readonly WallRun[], spec: CourseSpec): void {
  const rand = seeded(spec.seed);
  const base = spec.base ?? 0;
  const q = new Quaternion();
  for (let k = 0; k < spec.courses; k++) {
    const y0 = base + k * spec.course;
    const y1 = y0 + spec.course;
    runs.forEach((run, r) => {
      const inset = k * spec.batter;
      const sign = Math.sign(run.outer - run.inner);
      const outer = run.outer - sign * inset;
      const lo = Math.min(run.inner, outer);
      const hi = Math.max(run.inner, outer);
      const give = k % 2 === 1 ? (run.bond ?? 0) : 0;
      let pieces: [number, number][] = [[run.from + give, run.to - give]];
      for (const [a, b, top] of run.gaps ?? []) {
        if (y0 >= top - 1e-6) continue;
        pieces = pieces.flatMap(([p0, p1]): [number, number][] => {
          if (b <= p0 || a >= p1) return [[p0, p1]];
          const out: [number, number][] = [];
          if (a > p0 + 0.05) out.push([p0, a]);
          if (b < p1 - 0.05) out.push([b, p1]);
          return out;
        });
      }
      for (const [p0, p1] of pieces) {
        const edges = blockEdges(p0, p1, spec.block, (k + r) % 2 === 0 ? 0 : 0.5, rand);
        for (let e = 0; e + 1 < edges.length; e++) {
          const a = edges[e] ?? p0;
          const b = edges[e + 1] ?? p1;
          const mid = (a + b) / 2;
          const across = (lo + hi) / 2;
          const position = run.axis === 'x' ? new Vector3(mid, (y0 + y1) / 2, across) : new Vector3(across, (y0 + y1) / 2, mid);
          const size = run.axis === 'x' ? new Vector3(b - a - JOINT, y1 - y0 - JOINT, hi - lo) : new Vector3(hi - lo, y1 - y0 - JOINT, b - a - JOINT);
          kit.add(ASHLAR_BLOCK, material, frame.clone().multiply(new Matrix4().compose(position, q, size)));
        }
      }
    });
  }
}

/** The four outer walls of a rectangle `hx` × `hz` (half sizes) with walls `t` thick, bonding at the corners; `skip` leaves out sides ('+x', '-x', '+z', '-z'). */
export function rectangleRuns(hx: number, hz: number, t: number, gaps: Partial<Record<'+x' | '-x' | '+z' | '-z', readonly (readonly [number, number, number])[]>> = {}, skip: readonly string[] = []): WallRun[] {
  const runs: WallRun[] = [];
  const add = (side: '+x' | '-x' | '+z' | '-z', run: WallRun): void => {
    if (!skip.includes(side)) runs.push(run);
  };
  add('+z', { axis: 'x', from: -hx, to: hx, inner: hz - t, outer: hz, gaps: gaps['+z'] ?? [], bond: t });
  add('-z', { axis: 'x', from: -hx, to: hx, inner: -hz + t, outer: -hz, gaps: gaps['-z'] ?? [], bond: t });
  add('+x', { axis: 'z', from: -hz + t, to: hz - t, inner: hx - t, outer: hx, gaps: gaps['+x'] ?? [], bond: -t });
  add('-x', { axis: 'z', from: -hz + t, to: hz - t, inner: -hx + t, outer: -hx, gaps: gaps['-x'] ?? [], bond: -t });
  return runs;
}
