/**
 * Plan geometry for the Roche south area: polygons in world (X, Z) metres, as the block polygons of docs/research/exterior.md section 2 give them.
 * Pure math, no three.js: signed area, edge normals, an inset that keeps chosen edges in place, a half-plane clip, point tests and the split of a
 * boundary that touches itself into simple loops.
 */

/** A plan point (X north, Z east), metres. */
export type P2 = readonly [number, number];

/** Twice the signed area in the (X, Z) plane; positive when the points run counter-clockwise with X to the right and Z up. */
export function signedArea2(points: readonly P2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, z0] = points[i] ?? [0, 0];
    const [x1, z1] = points[(i + 1) % points.length] ?? [0, 0];
    sum += x0 * z1 - x1 * z0;
  }
  return sum;
}

/** The points ordered counter-clockwise (positive signed area). */
export function ccw(points: readonly P2[]): P2[] {
  return signedArea2(points) >= 0 ? [...points] : [...points].reverse();
}

/** Unit normal of edge a→b pointing into a counter-clockwise polygon (its left side). */
export function inwardNormal(a: P2, b: P2): P2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  return [-dz / length, dx / length];
}

function intersectLines(p: P2, d: P2, q: P2, e: P2): P2 | null {
  const det = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(det) < 1e-12) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / det;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

/**
 * Moves each edge of a counter-clockwise polygon inward by its own distance (`offsets[i]` for edge i → i+1) and rejoins neighbours at the
 * intersections of the moved lines (mitred). An offset of 0 keeps that edge on its line. Good for the small insets of wall thicknesses.
 */
export function inset(points: readonly P2[], offsets: readonly number[]): P2[] {
  const n = points.length;
  const lines = points.map((a, i) => {
    const b = points[(i + 1) % n] ?? a;
    const normal = inwardNormal(a, b);
    const o = offsets[i] ?? 0;
    return { p: [a[0] + normal[0] * o, a[1] + normal[1] * o] as P2, d: [b[0] - a[0], b[1] - a[1]] as P2 };
  });
  return points.map((point, i) => {
    const prev = lines[(i - 1 + n) % n];
    const next = lines[i];
    if (prev === undefined || next === undefined) return point;
    return intersectLines(prev.p, prev.d, next.p, next.d) ?? next.p;
  });
}

/** Keeps the part of a polygon where `side(point) <= 0` (Sutherland–Hodgman against one straight line given by a linear function). */
export function clipHalfPlane(points: readonly P2[], side: (p: P2) => number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Whether a point lies inside a polygon (even-odd rule). */
export function contains(points: readonly P2[], p: P2): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i] ?? [0, 0];
    const [xj, zj] = points[j] ?? [0, 0];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the polygon's boundary. */
export function distanceToEdges(points: readonly P2[], p: P2): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t));
  }
  return best;
}

/**
 * A polygon whose boundary touches itself, a vertex on another edge or met twice, split there into simple loops; a simple polygon comes back as its one
 * loop, unchanged. A loop the polygon bounds runs the polygon's way; a notch its boundary pinches off runs the other way round, a hole of the loop that
 * holds it. Earcut, which triangulates the prisms' faces (./shapes.ts), drops or overlaps triangles at such a touch (the Lehman roof's top and bottom
 * each lost a triangle). Bound: touches within `tolerance` metres; a boundary that crosses itself is not mended.
 */
export function simpleLoops(points: readonly P2[], tolerance = 1e-6): P2[][] {
  const n = points.length;
  const ring: P2[] = [];
  points.forEach((a, i) => {
    const b = points[(i + 1) % n] ?? a;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length2 = dx * dx + dz * dz;
    ring.push(a);
    // The other vertices on this edge, from a toward b.
    const on: [number, P2][] = [];
    points.forEach((p, j) => {
      if (j === i || j === (i + 1) % n || length2 === 0) return;
      const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length2;
      if (t > 0 && t < 1 && Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]) <= tolerance) on.push([t, p]);
    });
    for (const [, p] of on.sort((u, v) => u[0] - v[0])) ring.push(p);
  });
  // Walk the boundary; on meeting a vertex already passed, the way round since then is a loop of its own, and the walk goes on from that vertex.
  const loops: P2[][] = [];
  const path: P2[] = [];
  for (const p of ring) {
    const k = path.findIndex((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tolerance);
    if (k < 0) path.push(p);
    else loops.push(path.splice(k));
    if (k >= 0) path.push(p);
  }
  loops.push(path);
  return loops.filter((loop) => loop.length >= 3 && Math.abs(signedArea2(loop)) > tolerance * tolerance);
}

/** Whether a point lies inside a polygon or within `tolerance` metres of it. */
export function within(points: readonly P2[], p: P2, tolerance: number): boolean {
  return contains(points, p) || distanceToEdges(points, p) <= tolerance;
}

/** The point a fraction `t` of the way from a to b. */
export function lerp2(a: P2, b: P2, t: number): P2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Mirror of a plan point across the line X = 0 (the entrance axis). */
export function mirrorX(p: P2): P2 {
  return [-p[0], p[1]];
}
