/**
 * Gallery partitions from the Met floor map's rooms: a wall on every edge two rectangular rooms share, with a wide central opening, so the
 * interior reads as the map's enfilade of galleries. Rooms are plan rectangles [x0, z0, x1, z1] already on the world frame (blocks.ts MAP_Z).
 * Walls are unit-box pieces (one instanced mesh per material and step): two wall leaves and a lintel over the opening.
 */
import type { Matrix4 } from 'three';

import type { P2 } from './poly.js';
import { wallCentred } from './shapes.js';

export type Room = readonly [number, number, number, number];

export interface SharedEdge {
  readonly a: P2;
  readonly b: P2;
}

/** Clips axis-aligned edges to a plan rectangle [x0, z0, x1, z1] (the inside of a wing's outer walls), dropping those left under `minLength`. */
export function clipEdges(edges: readonly SharedEdge[], box: Room, minLength = 1.5): SharedEdge[] {
  const [x0, z0, x1, z1] = box;
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  return edges.flatMap((e) => {
    const alongZ = Math.abs(e.a[0] - e.b[0]) < 1e-9;
    const line = alongZ ? e.a[0] : e.a[1];
    const [lo, hi] = alongZ ? [x0, x1] : [z0, z1];
    if (line < lo || line > hi) return [];
    const a: P2 = [clamp(e.a[0], x0, x1), clamp(e.a[1], z0, z1)];
    const b: P2 = [clamp(e.b[0], x0, x1), clamp(e.b[1], z0, z1)];
    return Math.hypot(b[0] - a[0], b[1] - a[1]) >= minLength ? [{ a, b }] : [];
  });
}

/** Edges two rooms share, at least `minLength` long; rooms whose sides lie within `tolerance` metres count as touching. */
export function sharedEdges(rooms: readonly Room[], minLength = 1.5, tolerance = 0.25): SharedEdge[] {
  const edges: SharedEdge[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const r = rooms[i];
      const s = rooms[j];
      if (r === undefined || s === undefined) continue;
      // Sides on a line of constant X: r north of s or s north of r.
      for (const [x, other] of [
        [r[2], s[0]],
        [r[0], s[2]],
      ] as const) {
        if (Math.abs(x - other) > tolerance) continue;
        const z0 = Math.max(r[1], s[1]);
        const z1 = Math.min(r[3], s[3]);
        const line = (x + other) / 2;
        if (z1 - z0 >= minLength) edges.push({ a: [line, z0], b: [line, z1] });
      }
      // Sides on a line of constant Z.
      for (const [z, other] of [
        [r[3], s[1]],
        [r[1], s[3]],
      ] as const) {
        if (Math.abs(z - other) > tolerance) continue;
        const x0 = Math.max(r[0], s[0]);
        const x1 = Math.min(r[2], s[2]);
        const line = (z + other) / 2;
        if (x1 - x0 >= minLength) edges.push({ a: [x0, line], b: [x1, line] });
      }
    }
  }
  return edges;
}

export interface PartitionOptions {
  readonly y0: number;
  readonly y1: number;
  /** Wall thickness, metres. Default 0.4. */
  readonly thickness?: number;
  /** Opening height above y0, metres. Default 3.6. */
  readonly openingHeight?: number;
  /** Opening width as a share of the wall's length (at least 2 m, leaving 0.6 m each side). Default 0.4. */
  readonly openingShare?: number;
}

/** Unit-box matrices for a partition on edge a→b: the two leaves beside a central opening, and the lintel over it. */
export function partitionBoxes(edge: SharedEdge, options: PartitionOptions): Matrix4[] {
  const t = options.thickness ?? 0.4;
  const { a, b } = edge;
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const opening = Math.min(length - 1.2, Math.max(2, length * (options.openingShare ?? 0.4)));
  if (opening < 1.2) return [wallCentred(a, b, options.y0, options.y1, t)];
  const ux = (b[0] - a[0]) / length;
  const uz = (b[1] - a[1]) / length;
  const at = (s: number): P2 => [a[0] + ux * s, a[1] + uz * s];
  const leaf = (length - opening) / 2;
  const top = Math.min(options.y1, options.y0 + (options.openingHeight ?? 3.6));
  const boxes = [wallCentred(a, at(leaf), options.y0, options.y1, t), wallCentred(at(length - leaf), b, options.y0, options.y1, t)];
  if (top < options.y1 - 0.05) boxes.push(wallCentred(at(leaf), at(length - leaf), top, options.y1, t));
  return boxes;
}
