/**
 * The walk collision world (docs/design/spec.md, Walk mode): every piece of every step complete at the current t (f = 1) whose material is solid
 * (`userData.solid !== false`), in world space, as instances of per-geometry BVHs (./bvh-cache.ts) found through a uniform grid over X and Z.
 * Two queries: push a capsule out of every triangle it overlaps (`resolveCapsule`), and find the first surface below a point (`groundBelow`).
 * A build reads the instance matrices of complete steps, which hold their final matrices (docs/design/spec.md, Timeline position), and never writes
 * the scene, so walking leaves the determinism contract alone. The section cut changes nothing here.
 * Bound: capsule-to-triangle distances are exact (three-mesh-bvh ExtendedTriangle) in world space for any affine piece matrix, because triangles are
 * taken out to world space rather than the capsule into a piece's frame; a capsule moved more than COLLISION_MARGIN by one query can miss a triangle
 * near its new place until the next query.
 */
import { Box3, DoubleSide, Material, Matrix4, Ray, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Line3 } from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';
import type { MeshBVH } from 'three-mesh-bvh';

import type { BuiltStep } from '../build/timeline.js';
import type { GeometryBvhs } from './bvh-cache.js';

/** Grid cell size over X and Z, in metres. */
const CELL = 4;
/** How far past the capsule a query looks for triangles, in metres. */
export const COLLISION_MARGIN = 0.05;
/** A contact whose push is closer to vertical than this (the horizontal part of a unit push) is a floor or ceiling, not a wall, for a horizontal push. */
const MIN_HORIZONTAL = 0.1;

/** Whether a material blocks walking: every one unless it says `userData.solid === false` (water, foliage, glass standing in for an open door). */
export function isSolid(material: Material | readonly Material[]): boolean {
  return (material instanceof Material ? [material] : material).some((m) => m.userData['solid'] !== false);
}

/** Steps complete at `t` (f = 1): the first ⌊t⌋ of `n`. */
export function completeSteps(t: number, n: number): number {
  return Math.max(0, Math.min(n, Math.floor(t)));
}

/** The meshes walking collides with at `t`: those of steps complete at `t`, visible, with a solid material. */
export function collisionMeshes(steps: readonly BuiltStep[], t: number): InstancedMesh[] {
  return steps.slice(0, completeSteps(t, steps.length)).flatMap((s) => s.meshes.filter((m) => m.visible && m.count > 0 && isSolid(m.material)));
}

export interface CollisionStats {
  readonly instances: number;
  readonly triangles: number;
  /** Milliseconds of the build, BVHs of geometries seen for the first time included. */
  readonly ms: number;
}

/** The first surface below a point: its height and its unit normal, turned to face up (normalY 1 for a level floor). */
export interface GroundHit {
  y: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

const tmpBox = new Box3();
const tmpMatrix = new Matrix4();
const tmpVector = new Vector3();

function transformPoint(e: Float64Array, o: number, v: Vector3, out: Vector3): Vector3 {
  const { x, y, z } = v;
  return out.set((e[o] ?? 0) * x + (e[o + 4] ?? 0) * y + (e[o + 8] ?? 0) * z + (e[o + 12] ?? 0), (e[o + 1] ?? 0) * x + (e[o + 5] ?? 0) * y + (e[o + 9] ?? 0) * z + (e[o + 13] ?? 0), (e[o + 2] ?? 0) * x + (e[o + 6] ?? 0) * y + (e[o + 10] ?? 0) * z + (e[o + 14] ?? 0));
}

/** `box` (world) taken into the frame whose matrix is `e[o..o+16]`: the axis-aligned box round the transformed one. */
function transformBox(e: Float64Array, o: number, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, out: Box3): Box3 {
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const hx = (maxX - minX) / 2;
  const hy = (maxY - minY) / 2;
  const hz = (maxZ - minZ) / 2;
  transformPoint(e, o, tmpVector.set(cx, cy, cz), out.min);
  const ex = Math.abs(e[o] ?? 0) * hx + Math.abs(e[o + 4] ?? 0) * hy + Math.abs(e[o + 8] ?? 0) * hz;
  const ey = Math.abs(e[o + 1] ?? 0) * hx + Math.abs(e[o + 5] ?? 0) * hy + Math.abs(e[o + 9] ?? 0) * hz;
  const ez = Math.abs(e[o + 2] ?? 0) * hx + Math.abs(e[o + 6] ?? 0) * hy + Math.abs(e[o + 10] ?? 0) * hz;
  out.max.set(out.min.x + ex, out.min.y + ey, out.min.z + ez);
  out.min.set(out.min.x - ex, out.min.y - ey, out.min.z - ez);
  return out;
}

export class CollisionWorld {
  private n = 0;
  /** Per instance: its world matrix, the inverse, its world box (min xyz, max xyz) and its geometry's BVH. */
  private matrices = new Float64Array(0);
  private inverses = new Float64Array(0);
  private boxes = new Float64Array(0);
  private bvhs: MeshBVH[] = [];
  private x0 = 0;
  private z0 = 0;
  private nx = 0;
  private nz = 0;
  /** The grid as compressed rows: the instances of cell c are cellItems[cellStart[c] .. cellStart[c + 1]). */
  private cellStart = new Int32Array(1);
  private cellItems = new Int32Array(0);
  private stamps = new Uint32Array(0);
  private visit = 0;
  private readonly found: number[] = [];
  // Scratch state for the shapecast callbacks, which are created once.
  private readonly localBox = new Box3();
  private readonly worldTri = new ExtendedTriangle();
  private readonly onTri = new Vector3();
  private readonly onSegment = new Vector3();
  private readonly direction = new Vector3();
  private readonly centre = new Vector3();
  private readonly ray = new Ray();
  private current = 0;
  private segment: Line3 | null = null;
  private radius = 0;
  private horizontal = false;
  private push = new Vector3();
  private readonly capsuleCast = {
    intersectsBounds: (box: Box3): boolean => box.intersectsBox(this.localBox),
    intersectsTriangle: (tri: ExtendedTriangle): boolean => {
      this.pushOut(tri);
      return false;
    },
  };

  constructor(private readonly cache: GeometryBvhs) {}

  /** Instances in the world. */
  get instances(): number {
    return this.n;
  }

  /** Replaces the world with every instance of `meshes` (from `collisionMeshes`): each mesh's first `count` instances at their current matrices. */
  build(meshes: readonly InstancedMesh[]): CollisionStats {
    const start = performance.now();
    const n = meshes.reduce((sum, m) => sum + m.count, 0);
    this.n = n;
    this.matrices = new Float64Array(n * 16);
    this.inverses = new Float64Array(n * 16);
    this.boxes = new Float64Array(n * 6);
    this.bvhs = [];
    this.stamps = new Uint32Array(n);
    this.visit = 0;
    let triangles = 0;
    let k = 0;
    const world = new Box3();
    for (const mesh of meshes) {
      const geometry: BufferGeometry = mesh.geometry;
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      const local = geometry.boundingBox ?? new Box3();
      const bvh = this.cache.get(geometry);
      const perInstance = (geometry.index === null ? geometry.getAttribute('position').count : geometry.index.count) / 3;
      const source = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i += 1, k += 1) {
        tmpMatrix.fromArray(source, i * 16);
        this.matrices.set(tmpMatrix.elements, k * 16);
        this.inverses.set(tmpMatrix.invert().elements, k * 16);
        tmpBox.copy(local).applyMatrix4(tmpMatrix.fromArray(source, i * 16));
        this.boxes.set([tmpBox.min.x, tmpBox.min.y, tmpBox.min.z, tmpBox.max.x, tmpBox.max.y, tmpBox.max.z], k * 6);
        world.union(tmpBox);
        this.bvhs.push(bvh);
        triangles += perInstance;
      }
    }
    this.buildGrid(world);
    return { instances: n, triangles, ms: performance.now() - start };
  }

  private buildGrid(world: Box3): void {
    const { n, boxes } = this;
    this.x0 = n === 0 ? 0 : world.min.x;
    this.z0 = n === 0 ? 0 : world.min.z;
    this.nx = n === 0 ? 1 : Math.max(1, Math.ceil((world.max.x - world.min.x) / CELL));
    this.nz = n === 0 ? 1 : Math.max(1, Math.ceil((world.max.z - world.min.z) / CELL));
    const counts = new Int32Array(this.nx * this.nz + 1);
    const span = (k: number): [number, number, number, number] => [this.cellX(boxes[k * 6] ?? 0), this.cellX(boxes[k * 6 + 3] ?? 0), this.cellZ(boxes[k * 6 + 2] ?? 0), this.cellZ(boxes[k * 6 + 5] ?? 0)];
    for (let k = 0; k < n; k += 1) {
      const [ax, bx, az, bz] = span(k);
      for (let z = az; z <= bz; z += 1) for (let x = ax; x <= bx; x += 1) counts[z * this.nx + x + 1] = (counts[z * this.nx + x + 1] ?? 0) + 1;
    }
    for (let c = 1; c < counts.length; c += 1) counts[c] = (counts[c] ?? 0) + (counts[c - 1] ?? 0);
    this.cellStart = counts.slice();
    this.cellItems = new Int32Array(counts[counts.length - 1] ?? 0);
    for (let k = 0; k < n; k += 1) {
      const [ax, bx, az, bz] = span(k);
      for (let z = az; z <= bz; z += 1) {
        for (let x = ax; x <= bx; x += 1) {
          const c = z * this.nx + x;
          this.cellItems[counts[c] ?? 0] = k;
          counts[c] = (counts[c] ?? 0) + 1;
        }
      }
    }
  }

  private cellX(x: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.x0) / CELL)));
  }

  private cellZ(z: number): number {
    return Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.z0) / CELL)));
  }

  /** Fills `found` with the instances whose world box overlaps the given one. */
  private candidates(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): number[] {
    const found = this.found;
    found.length = 0;
    if (this.n === 0) return found;
    this.visit = (this.visit + 1) >>> 0;
    if (this.visit === 0) {
      this.stamps.fill(0);
      this.visit = 1;
    }
    const { boxes, stamps, cellStart, cellItems } = this;
    const ax = this.cellX(minX);
    const bx = this.cellX(maxX);
    const az = this.cellZ(minZ);
    const bz = this.cellZ(maxZ);
    for (let z = az; z <= bz; z += 1) {
      for (let x = ax; x <= bx; x += 1) {
        const c = z * this.nx + x;
        for (let j = cellStart[c] ?? 0, end = cellStart[c + 1] ?? 0; j < end; j += 1) {
          const k = cellItems[j] ?? 0;
          if (stamps[k] === this.visit) continue;
          stamps[k] = this.visit;
          const o = k * 6;
          if ((boxes[o] ?? 0) > maxX || (boxes[o + 3] ?? 0) < minX || (boxes[o + 1] ?? 0) > maxY || (boxes[o + 4] ?? 0) < minY || (boxes[o + 2] ?? 0) > maxZ || (boxes[o + 5] ?? 0) < minZ) continue;
          found.push(k);
        }
      }
    }
    return found;
  }

  /**
   * Pushes the capsule round `segment` with `radius` out of every solid triangle it overlaps, moving `segment` as it goes, and returns the total
   * push in `out`. With `horizontal`, each push is level (a floor or ceiling contact is skipped) and long enough to clear its contact sideways.
   */
  resolveCapsule(segment: Line3, radius: number, horizontal: boolean, out: Vector3): Vector3 {
    out.set(0, 0, 0);
    this.segment = segment;
    this.radius = radius;
    this.horizontal = horizontal;
    this.push = out;
    const r = radius + COLLISION_MARGIN;
    const { start, end } = segment;
    const found = this.candidates(Math.min(start.x, end.x) - r, Math.min(start.y, end.y) - r, Math.min(start.z, end.z) - r, Math.max(start.x, end.x) + r, Math.max(start.y, end.y) + r, Math.max(start.z, end.z) + r);
    for (const k of found) {
      this.current = k;
      transformBox(this.inverses, k * 16, Math.min(start.x, end.x) - r, Math.min(start.y, end.y) - r, Math.min(start.z, end.z) - r, Math.max(start.x, end.x) + r, Math.max(start.y, end.y) + r, Math.max(start.z, end.z) + r, this.localBox);
      this.bvhs[k]?.shapecast(this.capsuleCast);
    }
    this.segment = null;
    return out;
  }

  /** One triangle (in its piece's frame) against the capsule under test. */
  private pushOut(tri: ExtendedTriangle): void {
    const segment = this.segment;
    if (segment === null) return;
    const o = this.current * 16;
    const w = this.worldTri;
    transformPoint(this.matrices, o, tri.a, w.a);
    transformPoint(this.matrices, o, tri.b, w.b);
    transformPoint(this.matrices, o, tri.c, w.c);
    w.needsUpdate = true;
    const d = w.closestPointToSegment(segment, this.onTri, this.onSegment);
    if (!(d < this.radius)) return;
    const dir = this.direction;
    if (d > 1e-7) {
      dir.subVectors(this.onSegment, this.onTri).divideScalar(d);
    } else {
      // The segment touches the triangle: push along its normal, toward the side the capsule's centre is on.
      w.getNormal(dir);
      segment.getCenter(this.centre).sub(this.onTri);
      if (dir.dot(this.centre) < 0) dir.negate();
    }
    let depth = this.radius - d;
    if (this.horizontal) {
      const h = Math.hypot(dir.x, dir.z);
      if (h < MIN_HORIZONTAL) return;
      depth = Math.min(depth / h, this.radius);
      dir.set(dir.x / h, 0, dir.z / h);
    }
    segment.start.addScaledVector(dir, depth);
    segment.end.addScaledVector(dir, depth);
    this.push.addScaledVector(dir, depth);
  }

  /** The highest solid surface on the vertical line through (x, z) from height `y` down to `y − length`, written to `hit`; false when there is none. */
  groundBelow(x: number, y: number, z: number, length: number, hit: GroundHit): boolean {
    let best = Number.NEGATIVE_INFINITY;
    let nx = 0;
    let ny = 1;
    let nz = 0;
    const found = this.candidates(x, y - length, z, x, y, z);
    const ray = this.ray;
    const point = this.onTri;
    const normal = this.direction;
    for (const k of found) {
      const o = k * 16;
      transformPoint(this.inverses, o, tmpVector.set(x, y, z), ray.origin);
      // The world direction (0, -1, 0) in the piece's frame: minus the inverse's second column.
      ray.direction.set(-(this.inverses[o + 4] ?? 0), -(this.inverses[o + 5] ?? 0), -(this.inverses[o + 6] ?? 0)).normalize();
      const local = this.bvhs[k]?.raycastFirst(ray, DoubleSide);
      if (local === undefined || local === null) continue;
      transformPoint(this.matrices, o, local.point, point);
      if (point.y > y + 1e-6 || point.y < y - length || point.y <= best) continue;
      best = point.y;
      const n = local.face?.normal;
      if (n === undefined) {
        [nx, ny, nz] = [0, 1, 0];
        continue;
      }
      // Normals go out by the inverse transpose: n_world = inverse^T n_local; a double-sided hit may face down, so it is turned up.
      const e = this.inverses;
      normal.set((e[o] ?? 0) * n.x + (e[o + 1] ?? 0) * n.y + (e[o + 2] ?? 0) * n.z, (e[o + 4] ?? 0) * n.x + (e[o + 5] ?? 0) * n.y + (e[o + 6] ?? 0) * n.z, (e[o + 8] ?? 0) * n.x + (e[o + 9] ?? 0) * n.y + (e[o + 10] ?? 0) * n.z).normalize();
      if (normal.y < 0) normal.negate();
      [nx, ny, nz] = [normal.x, normal.y, normal.z];
    }
    if (best === Number.NEGATIVE_INFINITY) return false;
    hit.y = best;
    hit.normalX = nx;
    hit.normalY = ny;
    hit.normalZ = nz;
    return true;
  }
}
