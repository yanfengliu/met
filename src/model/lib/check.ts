/**
 * Geometry checks the part tests share. Each returns a list of problems (empty when the geometry passes), so a failing test prints what is wrong and where.
 * Bound: these read the attribute arrays only; they say nothing about how a part looks (the gallery captures are for that).
 */
import * as THREE from 'three';

export interface Box {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export function triangles(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  return (index !== null ? index.count : geometry.getAttribute('position').count) / 3;
}

/** No NaN or infinite position, a normal on every vertex, each of unit length, and indices in range. */
export function attributeProblems(geometry: THREE.BufferGeometry, name = 'geometry'): string[] {
  const problems: string[] = [];
  const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (position === undefined) return [`${name} has no position attribute`];
  if (normal === undefined) return [`${name} has no normal attribute`];
  if (position.count === 0) problems.push(`${name} has no vertices`);
  if (normal.count !== position.count) problems.push(`${name} has ${String(normal.count)} normals for ${String(position.count)} positions`);
  let badPosition = 0;
  let badNormal = 0;
  for (let k = 0; k < position.count; k++) {
    const x = position.getX(k);
    const y = position.getY(k);
    const z = position.getZ(k);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) badPosition++;
    const length = Math.hypot(normal.getX(k), normal.getY(k), normal.getZ(k));
    if (!(Math.abs(length - 1) < 1e-3)) badNormal++;
  }
  if (badPosition > 0) problems.push(`${name} has ${String(badPosition)} non-finite positions`);
  if (badNormal > 0) problems.push(`${name} has ${String(badNormal)} normals that are not unit length`);
  const index = geometry.getIndex();
  if (index !== null) {
    if (index.count % 3 !== 0) problems.push(`${name} index count ${String(index.count)} is not a multiple of 3`);
    for (let k = 0; k < index.count; k++) {
      const i = index.getX(k);
      if (i < 0 || i >= position.count) {
        problems.push(`${name} index ${String(k)} points at vertex ${String(i)} of ${String(position.count)}`);
        break;
      }
    }
  }
  if (triangles(geometry) === 0) problems.push(`${name} has no triangles`);
  return problems;
}

export function boxOf(geometry: THREE.BufferGeometry): Box {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
}

/** Compares a box with expected bounds per axis, within `tolerance` metres; `undefined` entries are not checked. */
export function boxProblems(
  actual: Box,
  expected: { min?: readonly (number | undefined)[]; max?: readonly (number | undefined)[] },
  tolerance = 1e-3,
  name = 'geometry',
): string[] {
  const problems: string[] = [];
  const axes = ['x', 'y', 'z'];
  for (let a = 0; a < 3; a++) {
    const wantMin = expected.min?.[a];
    const wantMax = expected.max?.[a];
    const gotMin = actual.min[a] ?? NaN;
    const gotMax = actual.max[a] ?? NaN;
    if (wantMin !== undefined && !(Math.abs(gotMin - wantMin) <= tolerance)) problems.push(`${name} min ${axes[a] ?? '?'} is ${gotMin.toFixed(4)}, expected ${wantMin.toFixed(4)}`);
    if (wantMax !== undefined && !(Math.abs(gotMax - wantMax) <= tolerance)) problems.push(`${name} max ${axes[a] ?? '?'} is ${gotMax.toFixed(4)}, expected ${wantMax.toFixed(4)}`);
  }
  return problems;
}

/** The box is centred on x = 0 and z = 0 (within tolerance). */
export function centredProblems(actual: Box, tolerance = 1e-3, name = 'geometry', axes: readonly ('x' | 'z')[] = ['x', 'z']): string[] {
  const problems: string[] = [];
  for (const axis of axes) {
    const a = axis === 'x' ? 0 : 2;
    const centre = (actual.min[a] + actual.max[a]) / 2;
    if (!(Math.abs(centre) <= tolerance)) problems.push(`${name} is not centred on ${axis}: its centre is at ${centre.toFixed(4)}`);
  }
  return problems;
}

/** All problems of a part's geometries, keyed by role. */
/** The geometries of a part: itself, or the BufferGeometry members of its role record (interfaces welcome). */
export function roleGeometries(part: object): [string, THREE.BufferGeometry][] {
  if (part instanceof THREE.BufferGeometry) return [['geometry', part as THREE.BufferGeometry]];
  const out: [string, THREE.BufferGeometry][] = [];
  for (const [role, value] of Object.entries(part as Record<string, unknown>)) if (value instanceof THREE.BufferGeometry) out.push([role, value as THREE.BufferGeometry]);
  return out;
}

export function partProblems(part: object, name: string): string[] {
  return roleGeometries(part).flatMap(([role, geometry]) => attributeProblems(geometry, `${name}.${role}`));
}

/** Union box of several geometries. */
export function unionBox(geometries: readonly (THREE.BufferGeometry | undefined)[]): Box {
  const box = new THREE.Box3();
  for (const geometry of geometries) {
    if (geometry === undefined) continue;
    geometry.computeBoundingBox();
    if (geometry.boundingBox !== null) box.union(geometry.boundingBox);
  }
  return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
}

export function totalTriangles(part: object): number {
  return roleGeometries(part).reduce((sum, [, geometry]) => sum + triangles(geometry), 0);
}

/**
 * Faces pointing the wrong way: for each triangle, its winding normal against the mean of its vertex normals.
 * A negative dot product means the triangle's front faces opposite its shading, which renders as a black or missing face.
 * Returns the fraction of such triangles.
 */
export function invertedFraction(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const index = geometry.getIndex();
  const count = triangles(geometry);
  if (count === 0) return 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const face = new THREE.Vector3();
  const shade = new THREE.Vector3();
  let bad = 0;
  for (let t = 0; t < count; t++) {
    const ia = index !== null ? index.getX(t * 3) : t * 3;
    const ib = index !== null ? index.getX(t * 3 + 1) : t * 3 + 1;
    const ic = index !== null ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);
    face.crossVectors(b.sub(a), c.sub(a));
    if (face.lengthSq() < 1e-16) continue;
    shade.set(0, 0, 0);
    for (const i of [ia, ib, ic]) shade.x += normal.getX(i);
    for (const i of [ia, ib, ic]) shade.y += normal.getY(i);
    for (const i of [ia, ib, ic]) shade.z += normal.getZ(i);
    if (face.dot(shade) < 0) bad++;
  }
  return bad / count;
}

/** The Y of the winding normal of each triangle lying in the plane at height `y`: −1 for a face looking down, 1 for one looking up. */
export function levelFaces(geometry: THREE.BufferGeometry, y: number, tolerance = 1e-6): number[] {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const out: number[] = [];
  for (let t = 0; t < triangles(geometry); t++) {
    a.fromBufferAttribute(position, index !== null ? index.getX(t * 3) : t * 3);
    b.fromBufferAttribute(position, index !== null ? index.getX(t * 3 + 1) : t * 3 + 1);
    c.fromBufferAttribute(position, index !== null ? index.getX(t * 3 + 2) : t * 3 + 2);
    if ([a, b, c].some((p) => Math.abs(p.y - y) > tolerance)) continue;
    const n = b.sub(a).cross(c.sub(a));
    if (n.lengthSq() > 0) out.push(n.normalize().y);
  }
  return out;
}

/** Small seeded PRNG (mulberry32), so ray samples repeat exactly. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shoots `rays` rays from outside the bounding sphere at random points inside it and returns the share of hits whose first triangle faces away from the ray
 * (by winding, which is what back-face culling uses). For a closed, outward-facing part this is 0: anything above 0 is a face that renders missing or dark.
 * Bound: it samples; a small wrongly wound patch can be missed, so tests pair it with `invertedFraction`. Glass panes and water sheets are seen from both sides and are not checked with it.
 */
export interface RayOptions {
  /** Skip rays arriving from below (the part stands on the ground with its foot left open). */
  notFromBelow?: boolean;
  /** Skip rays arriving from behind, the −Z side (the part lies against a wall with its back left open). */
  notFromBehind?: boolean;
  /** Skip rays arriving from above (its top is hidden under something). */
  notFromAbove?: boolean;
}

export function backfaceFraction(geometry: THREE.BufferGeometry, rays = 400, seed = 7, options: RayOptions = {}): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = triangles(geometry);
  geometry.computeBoundingSphere();
  const sphere = geometry.boundingSphere ?? new THREE.Sphere();
  const tris = new Float64Array(count * 9);
  for (let t = 0; t < count; t++) {
    for (let k = 0; k < 3; k++) {
      const i = index !== null ? index.getX(t * 3 + k) : t * 3 + k;
      tris[t * 9 + k * 3] = position.getX(i);
      tris[t * 9 + k * 3 + 1] = position.getY(i);
      tris[t * 9 + k * 3 + 2] = position.getZ(i);
    }
  }
  const random = prng(seed);
  let hits = 0;
  let back = 0;
  for (let r = 0; r < rays; r++) {
    const target = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).multiplyScalar(sphere.radius * 0.6).add(sphere.center);
    const u = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(phi), u, Math.sqrt(1 - u * u) * Math.sin(phi));
    if ((options.notFromBelow === true && dir.y > 0) || (options.notFromAbove === true && dir.y < 0) || (options.notFromBehind === true && dir.z > 0)) continue;
    const origin = target.clone().addScaledVector(dir, -sphere.radius * 3);
    let best = Infinity;
    let bestFacing = 0;
    for (let t = 0; t < count; t++) {
      const o = t * 9;
      const ax = tris[o] ?? 0, ay = tris[o + 1] ?? 0, az = tris[o + 2] ?? 0;
      const e1x = (tris[o + 3] ?? 0) - ax, e1y = (tris[o + 4] ?? 0) - ay, e1z = (tris[o + 5] ?? 0) - az;
      const e2x = (tris[o + 6] ?? 0) - ax, e2y = (tris[o + 7] ?? 0) - ay, e2z = (tris[o + 8] ?? 0) - az;
      const px = dir.y * e2z - dir.z * e2y, py = dir.z * e2x - dir.x * e2z, pz = dir.x * e2y - dir.y * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-14) continue;
      const inv = 1 / det;
      const tx = origin.x - ax, ty = origin.y - ay, tz = origin.z - az;
      const uu = (tx * px + ty * py + tz * pz) * inv;
      if (uu < 0 || uu > 1) continue;
      const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      const vv = (dir.x * qx + dir.y * qy + dir.z * qz) * inv;
      if (vv < 0 || uu + vv > 1) continue;
      const dist = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (dist > 1e-9 && dist < best) {
        best = dist;
        // Winding normal e1 × e2 against the ray: negative means the ray meets the front.
        bestFacing = (e1y * e2z - e1z * e2y) * dir.x + (e1z * e2x - e1x * e2z) * dir.y + (e1x * e2y - e1y * e2x) * dir.z;
      }
    }
    if (best < Infinity) {
      hits++;
      if (bestFacing > 0) back++;
    }
  }
  return hits === 0 ? 0 : back / hits;
}

/** Ends nearer than this in the plane across the lines are one end, and an end this near an edge's inside splits the edge, metres. */
const SNAP = 1e-4;
/** Open boundary shorter than this in all is rounding, not an opening, metres. */
const MIN_OPEN = 1e-3;
/** The cell of the grid that finds the ends near an edge, metres. */
const END_CELL = 0.05;

/** Where lines cross a geometry an odd number of times (`openAlong`): its open boundary's length, and a point on its longest stretch. */
export interface Opening {
  /** Metres, seen along the lines. */
  readonly length: number;
  /** In the geometry's frame, on the plane through its origin across the lines. */
  readonly at: THREE.Vector3;
}

/**
 * Whether lines parallel to `direction` (in the geometry's frame) cross the geometry an odd number of times anywhere: where they do, it has no inside by
 * the parity rule the walk's settle reads (docs/design/spec.md, Walk mode: When the build moves) and the section cut shows no cut face. Null when every
 * such line crosses it an even number of times, as a closed solid; a face along the lines (a wall's end, seen along vertical lines) changes nothing.
 * Method: the parity changes only across the projection of an edge that an odd number of triangles share (vertices joined by exact position), so it is
 * even everywhere exactly when those projected edges, each split at the others' ends on it, cover every stretch of the plane an even number of times.
 * Bound: lines through a projected edge or end are not counted. Ends nearer than SNAP are one, so an opening narrower than that is not seen, nor open
 * boundary shorter than MIN_OPEN in all.
 */
export function openAlong(geometry: THREE.BufferGeometry, direction: THREE.Vector3): Opening | null {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const ids = new Map<string, number>();
  const firsts: number[] = [];
  const vertex = Int32Array.from({ length: position.count }, (_, v) => {
    const key = `${String(position.getX(v))},${String(position.getY(v))},${String(position.getZ(v))}`;
    const known = ids.get(key);
    if (known !== undefined) return known;
    ids.set(key, firsts.length);
    firsts.push(v);
    return firsts.length - 1;
  });
  const n = firsts.length;
  const odd = new Set<number>();
  const corner = (c: number): number => vertex[index === null ? c : index.getX(c)] ?? 0;
  for (let c = 0; c + 2 < (index?.count ?? position.count); c += 3) {
    for (const [a, b] of [[corner(c), corner(c + 1)], [corner(c + 1), corner(c + 2)], [corner(c + 2), corner(c)]] as const) {
      if (a === b) continue;
      const key = Math.min(a, b) * n + Math.max(a, b);
      if (!odd.delete(key)) odd.add(key);
    }
  }
  if (odd.size === 0) return null;
  // The plane across the lines: (x, z) when they are the frame's Y, as for a piece stood upright.
  const d = direction.clone().normalize();
  const upright = Math.abs(d.y) > 1 - 1e-12;
  const u = upright ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(d).normalize();
  const w = upright ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3().crossVectors(d, u);
  const ends: [number, number][] = [];
  const near = new Map<string, number[]>();
  const cell = (x: number, y: number, size: number): string => `${String(Math.floor(x / size))},${String(Math.floor(y / size))}`;
  const file = (map: Map<string, number[]>, key: string, k: number): void => {
    const list = map.get(key);
    if (list === undefined) map.set(key, [k]);
    else list.push(k);
  };
  const endOf = (id: number): number => {
    const v = firsts[id] ?? 0;
    const p = new THREE.Vector3().fromBufferAttribute(position, v);
    const x = p.dot(u);
    const y = p.dot(w);
    const [cx, cy] = [Math.floor(x / SNAP), Math.floor(y / SNAP)];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const k of near.get(`${String(cx + i)},${String(cy + j)}`) ?? []) {
          const e = ends[k];
          if (e !== undefined && Math.hypot(e[0] - x, e[1] - y) < SNAP) return k;
        }
      }
    }
    file(near, cell(x, y, SNAP), ends.length);
    ends.push([x, y]);
    return ends.length - 1;
  };
  const edges: [number, number][] = [];
  for (const key of odd) {
    const a = endOf(Math.floor(key / n));
    const b = endOf(key % n);
    if (a !== b) edges.push([a, b]);
  }
  const grid = new Map<string, number[]>();
  ends.forEach(([x, y], k) => {
    file(grid, cell(x, y, END_CELL), k);
  });
  // Each edge split at the ends on its inside; a stretch between two ends is open while an odd number of edges cover it.
  const stretches = new Map<number, number>();
  const cover = (a: number, b: number): void => {
    const key = Math.min(a, b) * ends.length + Math.max(a, b);
    stretches.set(key, ((stretches.get(key) ?? 0) + 1) % 2);
  };
  for (const [a, b] of edges) {
    const [ax, ay] = ends[a] ?? [0, 0];
    const [bx, by] = ends[b] ?? [0, 0];
    const length = Math.hypot(bx - ax, by - ay);
    const [tx, ty] = [(bx - ax) / length, (by - ay) / length];
    const seen = new Set<string>();
    const on: [number, number][] = [];
    for (let s = 0; s <= Math.ceil((2 * length) / END_CELL); s++) {
      const along = Math.min(length, (s * END_CELL) / 2);
      const [cx, cy] = [Math.floor((ax + tx * along) / END_CELL), Math.floor((ay + ty * along) / END_CELL)];
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const key = `${String(cx + i)},${String(cy + j)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          for (const k of grid.get(key) ?? []) {
            const [px, py] = ends[k] ?? [0, 0];
            const t = (px - ax) * tx + (py - ay) * ty;
            if (k !== a && k !== b && t > SNAP && t < length - SNAP && Math.abs((px - ax) * ty - (py - ay) * tx) < SNAP) on.push([t, k]);
          }
        }
      }
    }
    on.sort((p, q) => p[0] - q[0]);
    let from = a;
    for (const [, k] of on) {
      cover(from, k);
      from = k;
    }
    cover(from, b);
  }
  let total = 0;
  let longest = 0;
  const at = new THREE.Vector3();
  for (const [key, parity] of stretches) {
    if (parity === 0) continue;
    const [ax, ay] = ends[Math.floor(key / ends.length)] ?? [0, 0];
    const [bx, by] = ends[key % ends.length] ?? [0, 0];
    const length = Math.hypot(bx - ax, by - ay);
    total += length;
    if (length <= longest) continue;
    longest = length;
    at.copy(u).multiplyScalar((ax + bx) / 2).addScaledVector(w, (ay + by) / 2);
  }
  return total < MIN_OPEN ? null : { length: total, at };
}
