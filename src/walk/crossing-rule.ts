/**
 * Which hits of a vertical line with one piece's triangles are crossings, for the walk's line query (./collision.ts `crossings`; docs/design/spec.md,
 * Walk mode: When the build moves). Hits at one height that face one way and lie on one edge or one corner of their triangles, by the places of its
 * ends, count once, as a line through an edge or a corner that triangles of one surface share meets each of them. Every other hit counts on its own,
 * so two faces back to back (one part's top under the bottom of the part on it) are two crossings, and a closed piece is crossed an even number of
 * times (src/model/closure.test.ts). Where hits at one height facing one way lie on edges that are not one, as where the edges of two overlapping parts'
 * faces in one plane cross at the line, how many faces it meets there is in doubt (work unit 13, review 2, F8): the line is read again at the first of
 * OFF_EDGE's offsets where it meets no edge and keeps every crossing of the line's own reading, and every hit there counts. A crossing is kept by a hit
 * of the line read again that faces its way and lies on the plane of a face merged into it, each hit keeping one crossing, so a line along a piece's own
 * edge is not read off the piece (review 3, F10) and another face near the line keeps no crossing it does not lie on (review 4, F16 and F17).
 * Bound: hits facing one way whose triangles have the edge or corner they lie on at the same places count once, whatever their faces: a part doubled
 * reads once along an edge its copies' faces both have, and two overlapping parts once along a ridge or at an apex they share (review 3, F13). A line
 * read again reads its heights where it lies, tens of micrometres off, so a sloped face reads that much times its slope higher or lower, and what is
 * narrower than that is missed. Where no offset will do, as where the line grazes a face the line read again leaves, the line's own hits count, once at
 * one height facing one way on edges, as before review 2.
 */
import type { BufferAttribute, InterleavedBufferAttribute, Intersection } from 'three';

/** A hit with a barycentric coordinate under this lies on an edge or a corner of its triangle, where the next triangle of its surface meets it too. */
const ON_EDGE = 1e-9;
/** Hits nearer than this in height, metres, lie at one height. */
const SAME_HEIGHT = 1e-6;
/** A hit of the line read again lies on a face's plane within this of it, metres. */
const ON_PLANE = 1e-6;
/**
 * Where a line in doubt is read again, metres along X and Z: the first of these whose line meets no edge and keeps the line's crossings. About 30 to
 * 42 µm out along directions off the axes and diagonals the model is laid out on, so a line along an edge or a diagonal does not run on along it.
 */
const OFF_EDGE: readonly (readonly [number, number])[] = [
  [1.6e-5, 2.5e-5],
  [-3.3e-5, 1.1e-5],
  [8e-6, -4.1e-5],
];

/** One hit of a vertical line with one of a piece's triangles. */
export interface LineHit {
  /** Its height, world metres. */
  readonly y: number;
  /** Its face's world normal's Y, turned up. */
  readonly normalY: number;
  /** Which way its face looks: 1 up, −1 down. */
  readonly facing: number;
  /** Its face's unit world normal as drawn, which with the hit places the face's plane. */
  readonly normal: readonly [number, number, number];
  /** It lies on an edge or a corner of its triangle (or its triangle gave no barycentric coordinates). */
  readonly edge: boolean;
  /** On an edge, the triangle's corners there, by vertex index: the edge's two ends, or the one corner; none where they are not known. */
  readonly ends: readonly number[];
}

/** The vertices' places of a piece's geometry, in its own frame. */
export type Places = Pick<BufferAttribute | InterleavedBufferAttribute, 'getX' | 'getY' | 'getZ'>;

/** One piece's crossings along a line, lowest first: their heights, their faces' up-turned normals' Y, and which way each face looks. */
export interface PieceLine {
  readonly heights: number[];
  readonly normalYs: number[];
  readonly facings: number[];
}

/** The hit `hit` (three-mesh-bvh's, in the piece's frame) at world height `y` on a face whose unit world normal is `normal`. */
export function lineHit(y: number, normal: { readonly x: number; readonly y: number; readonly z: number }, hit: Intersection): LineHit {
  const weights = hit.barycoord ?? undefined;
  const face = hit.face ?? undefined;
  const edge = weights === undefined || Math.min(weights.x, weights.y, weights.z) < ON_EDGE;
  const corners = edge && weights !== undefined && face !== undefined ? ([[face.a, weights.x], [face.b, weights.y], [face.c, weights.z]] as const) : [];
  return { y, normalY: Math.abs(normal.y), facing: Math.sign(normal.y), normal: [normal.x, normal.y, normal.z], edge, ends: corners.filter(([, w]) => w >= ON_EDGE).map(([v]) => v) };
}

/**
 * The crossings of the vertical line through (x, z) with one piece, by the rule above: `read` gives the piece's hits along the vertical line through a
 * point, lowest first, and `places` its vertices' places, which tell whether hits lie on one edge or corner.
 */
export function crossingsAlong(read: (x: number, z: number) => readonly LineHit[], places: Places, x: number, z: number): PieceLine {
  const { line, merged, inDoubt } = counted(read(x, z), places);
  if (!inDoubt) return line;
  for (const [dx, dz] of OFF_EDGE) {
    const moved = read(x + dx, z + dz);
    if (!moved.some((hit) => hit.edge) && keeps(moved, merged, dx, dz)) return counted(moved, places).line;
  }
  return line;
}

/**
 * Whether `again`, the hits of the line read (dx, dz) off, keeps every crossing of the line's own reading, each given as the hits merged into it: a hit
 * facing its way on the plane of one of them, each hit keeping one crossing (a complete matching, found by augmenting paths).
 */
function keeps(again: readonly LineHit[], merged: readonly (readonly LineHit[])[], dx: number, dz: number): boolean {
  const lies = (hit: LineHit, crossing: readonly LineHit[]): boolean =>
    crossing.some((m) => m.facing === hit.facing && Math.abs(m.normal[0] * dx + m.normal[1] * (hit.y - m.y) + m.normal[2] * dz) <= ON_PLANE);
  const keeper = new Array<number>(again.length).fill(-1);
  const assign = (i: number, tried: boolean[]): boolean => {
    for (let j = 0; j < again.length; j += 1) {
      const hit = again[j];
      if (tried[j] === true || hit === undefined || !lies(hit, merged[i] ?? [])) continue;
      tried[j] = true;
      const held = keeper[j] ?? -1;
      if (held < 0 || assign(held, tried)) {
        keeper[j] = i;
        return true;
      }
    }
    return false;
  };
  return merged.every((_, i) => assign(i, new Array<boolean>(again.length).fill(false)));
}

/**
 * The crossings among `hits` (lowest first), the hits merged into each (its own first), and whether hits at one height facing one way lay on edges
 * that are not one.
 */
function counted(hits: readonly LineHit[], places: Places): { line: PieceLine; merged: LineHit[][]; inDoubt: boolean } {
  const line: PieceLine = { heights: [], normalYs: [], facings: [] };
  const merged: LineHit[][] = [];
  const into = new Map<LineHit, LineHit[]>();
  let inDoubt = false;
  // The hits kept at the height being read.
  let level: LineHit[] = [];
  for (const hit of hits) {
    if (level.length > 0 && hit.y - (level[0]?.y ?? 0) >= SAME_HEIGHT) level = [];
    const met = hit.edge ? level.filter((kept) => kept.edge && kept.facing === hit.facing) : [];
    if (met.length > 0) {
      const one = met.find((kept) => oneEdge(kept, hit, places));
      if (one === undefined) inDoubt = true;
      into.get(one ?? met[0] ?? hit)?.push(hit);
      continue;
    }
    level.push(hit);
    const crossing = [hit];
    into.set(hit, crossing);
    merged.push(crossing);
    line.heights.push(hit.y);
    line.normalYs.push(hit.normalY);
    line.facings.push(hit.facing);
  }
  return { line, merged, inDoubt };
}

/** Whether hits `p` and `q`, on edges or corners of their triangles, lie on one edge or one corner of them: corners at the same places. */
function oneEdge(p: LineHit, q: LineHit, places: Places): boolean {
  const at = (u: number, v: number): boolean => places.getX(u) === places.getX(v) && places.getY(u) === places.getY(v) && places.getZ(u) === places.getZ(v);
  return p.ends.length > 0 && p.ends.length === q.ends.length && p.ends.every((u) => q.ends.some((v) => at(u, v)));
}
