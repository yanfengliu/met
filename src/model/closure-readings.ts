/**
 * The readings src/model/closure.test.ts takes of each shape: its triangles in world metres, whether a face stands upright, the winding a vertical
 * line meets above a point, whether a face is one side of a two-sided membrane, and a line's crossings read by their winding.
 * Bound: helpers of that gate, which states their bounds and proves them red; `upright` is checked there on fixtures.
 */
import { DoubleSide, Ray, Vector3 } from 'three';
import type { BufferGeometry, Matrix4 } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';

/** A shape's triangles in world metres, as one of its pieces stands, nine numbers each. */
export function worldTriangles(geometry: BufferGeometry, world: Matrix4): Float64Array {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  const out = new Float64Array(count * 3);
  const v = new Vector3();
  for (let k = 0; k < count; k += 1) {
    v.fromBufferAttribute(position, index === null ? k : index.getX(k)).applyMatrix4(world);
    out.set([v.x, v.y, v.z], k * 3);
  }
  return out;
}

/** How far either side of an upright face its inside is looked for, and how narrow across vertical lines an upright face is, in its geometry's frame. */
export const BEHIND = 1e-4;

/**
 * Whether the face at `a`, `b`, `c` stands upright: lines along `vertical`, a unit direction in its frame, see it at most BEHIND wide, twice its area
 * in plan over its longest edge in plan (its height across that edge). A face that is a point or a segment in plan is upright.
 */
export function upright(a: Vector3, b: Vector3, c: Vector3, vertical: Vector3): boolean {
  const twice = Math.abs(new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).dot(vertical));
  const plan = (p: Vector3, q: Vector3): number => {
    const d = new Vector3().subVectors(q, p);
    return d.addScaledVector(vertical, -d.dot(vertical)).length();
  };
  return twice <= BEHIND * Math.max(plan(a, b), plan(b, c), plan(c, a));
}

/** Whether some face of `geometry` crosses lines along `vertical`, a unit direction in its frame: a face that does not stand upright. */
export function faceAcross(geometry: BufferGeometry, vertical: Vector3): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    const corner = (j: number): number => (index === null ? j : index.getX(j));
    a.fromBufferAttribute(position, corner(k));
    b.fromBufferAttribute(position, corner(k + 1));
    c.fromBufferAttribute(position, corner(k + 2));
    if (!upright(a, b, c, vertical)) return true;
  }
  return false;
}

/**
 * The winding at `q`, in a geometry's frame, of the faces that a line along `vertical`, a unit direction, meets above it, from `reach` above it: +1 for
 * each looking up and −1 for each looking down, so 1 inside a closed part wound outward and 0 outside. Hits at one height that lie on edges of their
 * triangles and face one way count once, one surface met through an edge, as the walk's crossing query reads them.
 */
export function windingAbove(bvh: MeshBVH, q: Vector3, vertical: Vector3, reach: number): number {
  const ray = new Ray(q.clone().addScaledVector(vertical, reach), vertical.clone().negate());
  const hits = bvh
    .raycast(ray, DoubleSide)
    .filter((h) => h.distance < reach)
    .map((h) => {
      const at = h.barycoord ?? undefined;
      return { d: h.distance, facing: Math.sign(h.face?.normal.dot(vertical) ?? 0), edge: at === undefined || Math.min(at.x, at.y, at.z) < 1e-9 };
    })
    .sort((p, r) => p.d - r.d);
  let winding = 0;
  let level: typeof hits = [];
  for (const hit of hits) {
    if (level.length > 0 && hit.d - (level[0]?.d ?? 0) >= 1e-6) level = [];
    if (hit.edge && level.some((l) => l.edge && l.facing === hit.facing)) continue;
    level.push(hit);
    winding += hit.facing;
  }
  return winding;
}

/** Whether another face of `geometry` lies back to back on face `face` at its point `p`: the face is one side of a two-sided membrane. */
export function backed(geometry: BufferGeometry, face: number, p: Vector3, normal: Vector3): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c, n, r] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    if (k === face * 3) continue;
    const corner = (j: number): number => (index === null ? j : index.getX(j));
    a.fromBufferAttribute(position, corner(k));
    b.fromBufferAttribute(position, corner(k + 1)).sub(a);
    c.fromBufferAttribute(position, corner(k + 2)).sub(a);
    n.crossVectors(b, c);
    const length = n.length();
    if (length < 1e-12 || n.dot(normal) / length > -0.999) continue;
    r.subVectors(p, a);
    if (Math.abs(r.dot(n)) / length > 1e-6) continue;
    // Barycentric coordinates of p in the other face.
    const [bb, bc, cc, rb, rc] = [b.dot(b), b.dot(c), c.dot(c), r.dot(b), r.dot(c)];
    const d = bb * cc - bc * bc;
    const u = (cc * rb - bc * rc) / d;
    const w = (bb * rc - bc * rb) / d;
    if (u >= -1e-9 && w >= -1e-9 && u + w <= 1 + 1e-9) return true;
  }
  return false;
}

/**
 * Along the vertical line through (x, z), the triangles' crossings read by their winding as drawn (faces looking up entering, those looking down
 * leaving): the sum of their facings, the length where their parity and their winding disagree on what is inside, where parts overlap, and the length
 * where more faces look down than up above it, wound inside out. Hits within 1 µm of height are read together.
 */
export function windingAlong(tris: Float64Array, x: number, z: number): { sum: number; overlap: number; inward: number } {
  const hits: [number, number][] = [];
  for (let o = 0; o < tris.length; o += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [tris[o] ?? 0, tris[o + 1] ?? 0, tris[o + 2] ?? 0, tris[o + 3] ?? 0, tris[o + 4] ?? 0, tris[o + 5] ?? 0, tris[o + 6] ?? 0, tris[o + 7] ?? 0, tris[o + 8] ?? 0];
    // The face's normal Y, and the barycentric coordinates of (x, z) in its plan.
    const d = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (Math.abs(d) < 1e-14) continue;
    const w = ((bz - az) * (x - ax) - (bx - ax) * (z - az)) / d;
    const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / -d;
    if (u < -1e-12 || w < -1e-12 || u + w > 1 + 1e-12) continue;
    hits.push([ay + u * (by - ay) + w * (cy - ay), Math.sign(d)]);
  }
  hits.sort((p, q) => q[0] - p[0]);
  let winding = 0;
  let parity = 0;
  let overlap = 0;
  let inward = 0;
  for (let k = 0; k < hits.length; ) {
    const top = hits[k]?.[0] ?? 0;
    let n = 0;
    for (; k < hits.length && top - (hits[k]?.[0] ?? 0) < 1e-6; k += 1, n += 1) winding += hits[k]?.[1] ?? 0;
    parity = (parity + n) % 2;
    const next = hits[k]?.[0];
    if (next !== undefined && winding !== 0 !== (parity === 1)) overlap += top - next;
    if (next !== undefined && winding < 0) inward += top - next;
  }
  return { sum: winding, overlap, inward };
}
