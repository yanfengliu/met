/**
 * Which hits of a vertical line with one piece's triangles are crossings, for the walk's line query (./collision.ts `crossings`; docs/design/spec.md,
 * Walk mode: When the build moves). Hits at one height that face one way and lie on one edge or one corner of their triangles, by the places of its
 * ends, count once, as a line through an edge or a corner that triangles of one surface share meets each of them. Every other hit counts on its own,
 * so two faces back to back (one part's top under the bottom of the part on it) are two crossings, and a closed piece is crossed an even number of
 * times (src/model/closure.test.ts). Where hits at one height facing one way lie on edges that are not one, as where the edges of two overlapping parts'
 * faces in one plane cross at the line, how many faces it meets there is in doubt (work unit 13, review 2, F8): the line is read again OFF_EDGE off,
 * where it meets no edge, and every hit there counts.
 * Bound: faces that lie on one another along an edge or at a corner they both have, as the faces of a part doubled, count once there. A line read again
 * reads its heights where it lies, tens of micrometres off, so a sloped face reads that much times its slope higher or lower, and what is narrower than
 * that is missed. Where every try meets an edge, the line's own hits count, once at one height facing one way on edges.
 */
import type { BufferAttribute, InterleavedBufferAttribute, Intersection } from 'three';

/** A hit with a barycentric coordinate under this lies on an edge or a corner of its triangle, where the next triangle of its surface meets it too. */
const ON_EDGE = 1e-9;
/** Hits nearer than this in height, metres, lie at one height. */
const SAME_HEIGHT = 1e-6;
/**
 * Where a line in doubt is read again, metres along X and Z: the first of these whose line meets no edge. About 30 to 42 µm out along directions off
 * the axes and diagonals the model is laid out on, so a line along an edge or a diagonal does not run on along it.
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

/** The hit `hit` (three-mesh-bvh's, in the piece's frame) at world height `y` on a face whose world normal's Y is `normalY`. */
export function lineHit(y: number, normalY: number, hit: Intersection): LineHit {
  const weights = hit.barycoord ?? undefined;
  const face = hit.face ?? undefined;
  const edge = weights === undefined || Math.min(weights.x, weights.y, weights.z) < ON_EDGE;
  const corners = edge && weights !== undefined && face !== undefined ? ([[face.a, weights.x], [face.b, weights.y], [face.c, weights.z]] as const) : [];
  return { y, normalY: Math.abs(normalY), facing: Math.sign(normalY), edge, ends: corners.filter(([, w]) => w >= ON_EDGE).map(([v]) => v) };
}

/**
 * The crossings of the vertical line through (x, z) with one piece, by the rule above: `read` gives the piece's hits along the vertical line through a
 * point, lowest first, and `places` its vertices' places, which tell whether hits lie on one edge or corner.
 */
export function crossingsAlong(read: (x: number, z: number) => readonly LineHit[], places: Places, x: number, z: number): PieceLine {
  const { line, inDoubt } = counted(read(x, z), places);
  if (!inDoubt) return line;
  for (const [dx, dz] of OFF_EDGE) {
    const moved = read(x + dx, z + dz);
    if (!moved.some((hit) => hit.edge)) return counted(moved, places).line;
  }
  return line;
}

/** The crossings among `hits` (lowest first), and whether hits at one height facing one way lay on edges that are not one. */
function counted(hits: readonly LineHit[], places: Places): { line: PieceLine; inDoubt: boolean } {
  const line: PieceLine = { heights: [], normalYs: [], facings: [] };
  let inDoubt = false;
  // The hits kept at the height being read.
  let level: LineHit[] = [];
  for (const hit of hits) {
    if (level.length > 0 && hit.y - (level[0]?.y ?? 0) >= SAME_HEIGHT) level = [];
    const met = hit.edge ? level.filter((kept) => kept.edge && kept.facing === hit.facing) : [];
    if (met.length > 0) {
      if (!met.some((kept) => oneEdge(kept, hit, places))) inDoubt = true;
      continue;
    }
    level.push(hit);
    line.heights.push(hit.y);
    line.normalYs.push(hit.normalY);
    line.facings.push(hit.facing);
  }
  return { line, inDoubt };
}

/** Whether hits `p` and `q`, on edges or corners of their triangles, lie on one edge or one corner of them: corners at the same places. */
function oneEdge(p: LineHit, q: LineHit, places: Places): boolean {
  const at = (u: number, v: number): boolean => places.getX(u) === places.getX(v) && places.getY(u) === places.getY(v) && places.getZ(u) === places.getZ(v);
  return p.ends.length > 0 && p.ends.length === q.ends.length && p.ends.every((u) => q.ends.some((v) => at(u, v)));
}
