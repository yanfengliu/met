/**
 * What the zoom heads for (docs/design/spec.md, Camera): the distance along a ray to the first model surface drawn on screen, or to the workspace ground.
 * Only drawn instances count (the first `count` of a visible mesh), at their current matrices, so a piece still arriving is met where it is shown;
 * with the section cut on, a hit above the cut on a material the cut clips is passed through, as the eye sees through the removed part.
 * Each candidate instance is found by its bounding sphere, the ray taken into its frame and cast against its geometry's BVH (src/walk/bvh-cache.ts).
 * Reads the scene only. Bound: transparent pieces (glass) count as surfaces, so the zoom stops at a window as it does at a wall.
 */
import { DoubleSide, Matrix4, Ray, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Intersection, InstancedMesh } from 'three';

import type { GeometryBvhs } from '../walk/bvh-cache.js';
import { cutBySection } from './section-cut.js';

export interface PickCut {
  readonly enabled: boolean;
  readonly height: number;
}

export class ModelPicker {
  private readonly spheres = new WeakMap<BufferGeometry, Sphere>();
  private readonly matrix = new Matrix4();
  private readonly inverse = new Matrix4();
  private readonly sphere = new Sphere();
  private readonly local = new Ray();
  private readonly point = new Vector3();
  private readonly toCentre = new Vector3();
  private readonly hits: Intersection[] = [];

  constructor(
    private readonly meshes: readonly InstancedMesh[],
    private readonly bvhs: GeometryBvhs,
    private readonly groundY: number,
    private readonly cut: PickCut,
  ) {}

  /** The distance along `ray` (unit direction, world metres) to the first surface it meets, or null when it meets none. */
  distance(ray: Ray): number | null {
    let best = Number.POSITIVE_INFINITY;
    if (ray.direction.y < -1e-9) {
      const t = (this.groundY - ray.origin.y) / ray.direction.y;
      if (t > 0) best = t;
    }
    for (const mesh of this.meshes) {
      if (!mesh.visible || mesh.count === 0) continue;
      if (mesh.boundingSphere !== null && !ray.intersectsSphere(mesh.boundingSphere)) continue;
      const geometry = mesh.geometry;
      const local = this.localSphere(geometry);
      const material = mesh.material;
      const clipped = this.cut.enabled && !Array.isArray(material) && cutBySection(material);
      const array = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i += 1) {
        this.matrix.fromArray(array, i * 16);
        this.sphere.copy(local).applyMatrix4(this.matrix);
        if (!ray.intersectsSphere(this.sphere)) continue;
        // Nearer than the best so far, or the sphere cannot hold a better hit.
        const along = this.toCentre.subVectors(this.sphere.center, ray.origin).dot(ray.direction);
        if (along - this.sphere.radius > best) continue;
        best = Math.min(best, this.castInstance(ray, geometry, clipped, best));
      }
    }
    return Number.isFinite(best) ? best : null;
  }

  /** The nearest hit on one instance (matrix in `this.matrix`), or `best` when it has none nearer. */
  private castInstance(ray: Ray, geometry: BufferGeometry, clipped: boolean, best: number): number {
    const local = this.local;
    this.inverse.copy(this.matrix).invert();
    // Ray.applyMatrix4 moves the origin and turns and normalizes the direction.
    local.copy(ray).applyMatrix4(this.inverse);
    const bvh = this.bvhs.get(geometry);
    this.hits.length = 0;
    if (clipped) bvh.raycast(local, DoubleSide).forEach((h) => this.hits.push(h));
    else {
      const first = bvh.raycastFirst(local, DoubleSide);
      if (first !== null) this.hits.push(first);
    }
    let nearest = best;
    for (const hit of this.hits) {
      const p = this.point.copy(hit.point).applyMatrix4(this.matrix);
      if (clipped && p.y > this.cut.height) continue;
      const t = p.sub(ray.origin).dot(ray.direction);
      if (t > 1e-4 && t < nearest) nearest = t;
    }
    return nearest;
  }

  /** A sphere round the geometry's bounding box, kept per geometry; the geometry itself is not touched. */
  private localSphere(geometry: BufferGeometry): Sphere {
    const known = this.spheres.get(geometry);
    if (known !== undefined) return known;
    const box = geometry.boundingBox;
    const sphere = box === null ? new Sphere(new Vector3(), Number.POSITIVE_INFINITY) : box.getBoundingSphere(new Sphere());
    this.spheres.set(geometry, sphere);
    return sphere;
  }
}
