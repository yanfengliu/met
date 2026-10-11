/**
 * Outer walls on a block outline: one unit-box wall per edge, outer face on the edge, lengthened at reflex corners so the inside of each corner
 * closes (at convex corners neighbouring walls overlap). Edges on a line another block builds (an older neighbour) are skipped.
 */
import type { Matrix4 } from 'three';

import { inwardNormal, type P2 } from './poly.js';
import { wallAlong } from './shapes.js';

export interface WallSegment {
  readonly a: P2;
  readonly b: P2;
  /** Index of the edge in the outline. */
  readonly edge: number;
  readonly extendStart: number;
  readonly extendEnd: number;
}

/** Lengthening that closes the inside of a reflex corner of a counter-clockwise outline (0 at a convex one). */
export function reflexExtension(prev: P2, v: P2, next: P2, thickness: number): number {
  const d0x = v[0] - prev[0];
  const d0z = v[1] - prev[1];
  const d1x = next[0] - v[0];
  const d1z = next[1] - v[1];
  const cross = d0x * d1z - d0z * d1x;
  if (cross >= 0) return 0;
  const turn = Math.acos(Math.max(-1, Math.min(1, (d0x * d1x + d0z * d1z) / (Math.hypot(d0x, d0z) * Math.hypot(d1x, d1z)))));
  return thickness * Math.tan(turn / 2);
}

/** The wall segments of a counter-clockwise outline, leaving out the edges listed in `skip`. */
export function wallSegments(outline: readonly P2[], thickness: number, skip: readonly number[] = []): WallSegment[] {
  const n = outline.length;
  const out: WallSegment[] = [];
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const prev = outline[(i - 1 + n) % n] ?? [0, 0];
    const a = outline[i] ?? [0, 0];
    const b = outline[(i + 1) % n] ?? [0, 0];
    const next = outline[(i + 2) % n] ?? [0, 0];
    out.push({ a, b, edge: i, extendStart: reflexExtension(prev, a, b, thickness), extendEnd: reflexExtension(a, b, next, thickness) });
  }
  return out;
}

/** The unit-box matrix of a segment's wall from y0 to y1, `thickness` inward (scaled extensions for a thicker or thinner course). */
export function segmentWall(seg: WallSegment, y0: number, y1: number, thickness: number, reference: number): Matrix4 {
  const k = thickness / reference;
  return wallAlong(seg.a, seg.b, y0, y1, thickness, seg.extendStart * k, seg.extendEnd * k);
}

/** A coping on a segment: `proud` metres beyond the outer face (a moulding; docs/design/spec.md, World frame), from y0 to y1. */
export function segmentCoping(seg: WallSegment, y0: number, y1: number, thickness: number, proud: number): Matrix4 {
  const [nx, nz] = inwardNormal(seg.a, seg.b);
  const a: P2 = [seg.a[0] - nx * proud, seg.a[1] - nz * proud];
  const b: P2 = [seg.b[0] - nx * proud, seg.b[1] - nz * proud];
  return wallAlong(a, b, y0, y1, thickness + proud, seg.extendStart + proud, seg.extendEnd + proud);
}
