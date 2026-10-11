/**
 * Profiles: 2D sections that sweeps and lathes carry along a path or around an axis.
 *
 * A profile is a polyline in a (d, y) plane: d is the projection (outward from the path, or the radius of a lathe), y is height.
 * Points run so that the solid is on the left and the visible surface faces right of the direction of travel; for a closed section that is counter-clockwise (bottom, out, up the face, back over the top).
 * A cornice profile, for example, starts at (0, 0) on the wall face, runs out and up the mouldings, and returns over the top to (0, height).
 */
import type { V2 } from './builder.js';

export interface Profile {
  readonly points: readonly V2[];
  /** The last point joins the first. */
  readonly closed: boolean;
}

/** Bends sharper than this (degrees) keep a hard edge; gentler ones shade smooth. */
export const DEFAULT_CREASE_DEG = 32;

/** One vertex of a profile ring: a position and the 2D normal it shades with, plus its arc length for uv. */
export interface RingVertex {
  readonly d: number;
  readonly y: number;
  readonly nd: number;
  readonly ny: number;
  readonly s: number;
}

/** A profile prepared for sweeping: crease points carry two vertices (one per side), and edges index into `verts`. */
export interface Ring {
  readonly verts: readonly RingVertex[];
  readonly edges: readonly (readonly [number, number])[];
}

function edgeNormal(a: V2, b: V2): [number, number] {
  const td = b[0] - a[0];
  const ty = b[1] - a[1];
  const length = Math.hypot(td, ty);
  return length > 0 ? [ty / length, -td / length] : [0, 0];
}

/** Drops repeated points (and a closing point equal to the first) so every edge has length. */
export function cleanPoints(points: readonly V2[], closed: boolean): V2[] {
  const out: V2[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last === undefined || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-9) out.push(p);
  }
  const first = out[0];
  const last = out.at(-1);
  if (closed && out.length > 1 && first !== undefined && last !== undefined && Math.hypot(first[0] - last[0], first[1] - last[1]) <= 1e-9) out.pop();
  return out;
}

/** Splits a profile into ring vertices with split normals at creases. */
export function ringOf(profile: Profile, creaseDeg = DEFAULT_CREASE_DEG): Ring {
  const pts = cleanPoints(profile.points, profile.closed);
  const n = pts.length;
  const edgeCount = profile.closed ? n : n - 1;
  const normals: [number, number][] = [];
  for (let e = 0; e < edgeCount; e++) normals.push(edgeNormal(pts[e] ?? [0, 0], pts[(e + 1) % n] ?? [0, 0]));
  const creaseCos = Math.cos((creaseDeg * Math.PI) / 180);
  const verts: RingVertex[] = [];
  // For each point, the ring vertex used by the edge arriving at it and by the edge leaving it.
  const arriving: number[] = [];
  const leaving: number[] = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i] ?? [0, 0];
    if (i > 0) {
      const prev = pts[i - 1] ?? p;
      s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    }
    const inEdge = i > 0 ? i - 1 : profile.closed ? edgeCount - 1 : -1;
    const outEdge = i < edgeCount ? i : -1;
    const nIn = inEdge >= 0 ? normals[inEdge] : undefined;
    const nOut = outEdge >= 0 ? normals[outEdge] : undefined;
    if (nIn !== undefined && nOut !== undefined && nIn[0] * nOut[0] + nIn[1] * nOut[1] >= creaseCos) {
      const md = nIn[0] + nOut[0];
      const my = nIn[1] + nOut[1];
      const length = Math.hypot(md, my) || 1;
      verts.push({ d: p[0], y: p[1], nd: md / length, ny: my / length, s });
      arriving[i] = verts.length - 1;
      leaving[i] = verts.length - 1;
    } else {
      if (nIn !== undefined) {
        verts.push({ d: p[0], y: p[1], nd: nIn[0], ny: nIn[1], s });
        arriving[i] = verts.length - 1;
      }
      if (nOut !== undefined) {
        verts.push({ d: p[0], y: p[1], nd: nOut[0], ny: nOut[1], s });
        leaving[i] = verts.length - 1;
      }
    }
  }
  const edges: [number, number][] = [];
  for (let e = 0; e < edgeCount; e++) edges.push([leaving[e] ?? 0, arriving[(e + 1) % n] ?? 0]);
  return { verts, edges };
}

/**
 * Pen for drawing profiles from the current point, each call adding one feature.
 * Curves bulge right of travel when `convex` (an ovolo, a torus), left when concave (a cavetto, a scotia).
 */
export class ProfilePen {
  private readonly pts: [number, number][] = [];

  constructor(d = 0, y = 0) {
    this.pts.push([d, y]);
  }

  get d(): number {
    return this.pts.at(-1)?.[0] ?? 0;
  }

  get y(): number {
    return this.pts.at(-1)?.[1] ?? 0;
  }

  to(d: number, y: number): this {
    this.pts.push([d, y]);
    return this;
  }

  by(dd: number, dy: number): this {
    return this.to(this.d + dd, this.y + dy);
  }

  /** A quarter ellipse to (d + dd, y + dy), `segments` straight pieces. */
  quarter(dd: number, dy: number, convex: boolean, segments = 4): this {
    const a: V2 = [this.d, this.y];
    const b: V2 = [a[0] + dd, a[1] + dy];
    // The two axis-aligned centres; keep the one whose arc bulges to the asked side.
    const pick = (c: V2): number => {
      const mx = c[0] + (a[0] - c[0] + b[0] - c[0]) * Math.SQRT1_2 - (a[0] + b[0]) / 2;
      const my = c[1] + (a[1] - c[1] + b[1] - c[1]) * Math.SQRT1_2 - (a[1] + b[1]) / 2;
      return dd * my - dy * mx; // > 0: bulge left of travel
    };
    const c1: V2 = [a[0], b[1]];
    const c2: V2 = [b[0], a[1]];
    const c = (pick(c1) < 0) === convex ? c1 : c2;
    for (let k = 1; k <= segments; k++) {
      const phi = (k / segments) * (Math.PI / 2);
      this.pts.push([c[0] + (a[0] - c[0]) * Math.cos(phi) + (b[0] - c[0]) * Math.sin(phi), c[1] + (a[1] - c[1]) * Math.cos(phi) + (b[1] - c[1]) * Math.sin(phi)]);
    }
    return this;
  }

  /** A half ellipse from the current point to (d + dd, y + dy), bulging `bulge` to the right of travel (negative bulges left). */
  half(dd: number, dy: number, bulge: number, segments = 6): this {
    const a: V2 = [this.d, this.y];
    const length = Math.hypot(dd, dy) || 1;
    const right: V2 = [dy / length, -dd / length];
    for (let k = 1; k <= segments; k++) {
      const phi = (k / segments) * Math.PI;
      const along = (1 - Math.cos(phi)) / 2;
      const out = Math.sin(phi) * bulge;
      this.pts.push([a[0] + dd * along + right[0] * out, a[1] + dy * along + right[1] * out]);
    }
    return this;
  }

  /** An ogee to (d + dd, y + dy): 'recta' is convex below and concave above when rising outward, 'reversa' the opposite. */
  cyma(dd: number, dy: number, kind: 'recta' | 'reversa', segments = 3): this {
    const first = kind === 'reversa';
    this.quarter(dd / 2, dy / 2, !first, segments);
    this.quarter(dd / 2, dy / 2, first, segments);
    return this;
  }

  /** The finished profile. */
  close(): Profile {
    return { points: cleanPoints(this.pts, true), closed: true };
  }

  open(): Profile {
    return { points: cleanPoints(this.pts, false), closed: false };
  }
}

/** Scales a profile: d by `sd`, y by `sy`, then shifts it. */
export function scaleProfile(profile: Profile, sd: number, sy: number, dd = 0, dy = 0): Profile {
  return { closed: profile.closed, points: profile.points.map(([d, y]) => [d * sd + dd, y * sy + dy] as const) };
}

/** The (d, y) bounds of a profile. */
export function profileBounds(profile: Profile): { minD: number; maxD: number; minY: number; maxY: number } {
  let minD = Infinity;
  let maxD = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [d, y] of profile.points) {
    minD = Math.min(minD, d);
    maxD = Math.max(maxD, d);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minD, maxD, minY, maxY };
}

/** Signed area of a closed 2D loop; positive when counter-clockwise. */
export function signedArea(points: readonly V2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}
