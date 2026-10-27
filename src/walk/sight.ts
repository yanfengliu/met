/**
 * Lines of sight through the walk's solid pieces (work unit 2, M4; src/model/reach.test.ts): whether a segment passes clear of every solid piece by a
 * given clearance: it crosses no triangle (a ray-triangle test along it) and passes none nearer than the clearance (three-mesh-bvh ExtendedTriangle's
 * distance, which looks only at the segment's ends and the triangle's edges, so cannot see a crossing alone), in world space, for every triangle of
 * every piece whose box comes near it. The pieces are the walk collision's (./collision.ts `collisionMeshes`), each instance at its matrix, found through a grid over X and Z.
 * A capsule pushed out of what it overlaps (`CollisionWorld.resolveCapsule`) cannot say this: through the middle of a thick wall the wall's two faces
 * push it opposite ways and the pushes cancel, so a line through a 0.8 m wall read clear (work unit 2, review 12, F41).
 * Bound: a segment wholly inside one solid, meeting none of its faces, reads clear; the callers' segments run from a walker's eye, which stands clear
 * of every solid.
 */
import { Box3, Line3, Matrix4, Ray, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { ExtendedTriangle } from 'three-mesh-bvh';
import type { MeshBVH } from 'three-mesh-bvh';

import type { GeometryBvhs } from './bvh-cache.js';

/** Grid cell over X and Z, metres. */
const CELL = 8;
const key = (ix: number, iz: number): number => (ix + 4096) * 8192 + (iz + 4096);

export class SightLines {
  private readonly matrices: Matrix4[] = [];
  private readonly inverses: Matrix4[] = [];
  private readonly boxes: Box3[] = [];
  private readonly bvhs: MeshBVH[] = [];
  private readonly grid = new Map<number, number[]>();
  private stamps: Uint32Array;
  private visit = 0;
  private readonly segment = new Line3();
  private readonly box = new Box3();
  private readonly local = new Box3();
  private readonly tri = new ExtendedTriangle();
  private readonly onTri = new Vector3();
  private readonly onSegment = new Vector3();
  private readonly ray = new Ray();
  private readonly crossing = new Vector3();

  /** Every instance of `meshes` (the first `count` of each, at their instance matrices), with each geometry's BVH from `cache`. */
  constructor(meshes: readonly InstancedMesh[], cache: GeometryBvhs) {
    for (const mesh of meshes) {
      if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
      const own = mesh.geometry.boundingBox ?? new Box3();
      const bvh = cache.get(mesh.geometry);
      for (let i = 0; i < mesh.count; i += 1) {
        const matrix = new Matrix4().fromArray(mesh.instanceMatrix.array, i * 16);
        const k = this.boxes.length;
        this.matrices.push(matrix);
        this.inverses.push(matrix.clone().invert());
        const box = own.clone().applyMatrix4(matrix);
        this.boxes.push(box);
        this.bvhs.push(bvh);
        for (let ix = Math.floor(box.min.x / CELL); ix <= Math.floor(box.max.x / CELL); ix += 1) {
          for (let iz = Math.floor(box.min.z / CELL); iz <= Math.floor(box.max.z / CELL); iz += 1) {
            const list = this.grid.get(key(ix, iz));
            if (list === undefined) this.grid.set(key(ix, iz), [k]);
            else list.push(k);
          }
        }
      }
    }
    this.stamps = new Uint32Array(this.boxes.length);
  }

  /** Whether the segment from `a` to `b` passes every solid piece's triangles at `clearance` metres or more. */
  clear(a: Vector3, b: Vector3, clearance: number): boolean {
    const { segment, box, local, tri, onTri, onSegment, ray, crossing } = this;
    segment.set(a, b);
    const length = a.distanceTo(b);
    ray.origin.copy(a);
    ray.direction.subVectors(b, a).normalize();
    box.makeEmpty().expandByPoint(a).expandByPoint(b).expandByScalar(clearance);
    this.visit += 1;
    for (let ix = Math.floor(box.min.x / CELL); ix <= Math.floor(box.max.x / CELL); ix += 1) {
      for (let iz = Math.floor(box.min.z / CELL); iz <= Math.floor(box.max.z / CELL); iz += 1) {
        for (const k of this.grid.get(key(ix, iz)) ?? []) {
          if (this.stamps[k] === this.visit) continue;
          this.stamps[k] = this.visit;
          if (!(this.boxes[k]?.intersectsBox(box) ?? false)) continue;
          const matrix = this.matrices[k];
          const inverse = this.inverses[k];
          if (matrix === undefined || inverse === undefined) continue;
          local.copy(box).applyMatrix4(inverse);
          const met = this.bvhs[k]?.shapecast({
            intersectsBounds: (bounds: Box3): boolean => bounds.intersectsBox(local),
            intersectsTriangle: (t: ExtendedTriangle): boolean => {
              tri.a.copy(t.a).applyMatrix4(matrix);
              tri.b.copy(t.b).applyMatrix4(matrix);
              tri.c.copy(t.c).applyMatrix4(matrix);
              tri.needsUpdate = true;
              const through = ray.intersectTriangle(tri.a, tri.b, tri.c, false, crossing);
              if (through !== null && through.distanceTo(a) <= length) return true;
              return tri.closestPointToSegment(segment, onTri, onSegment) < clearance;
            },
          });
          if (met === true) return false;
        }
      }
    }
    return true;
  }
}
