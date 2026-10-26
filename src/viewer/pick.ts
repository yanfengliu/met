/**
 * What a ray meets in the drawn model (docs/design/spec.md, Camera and Walk mode: Look target). Two queries over the same pieces:
 * - `distance`, what the zoom heads for: the distance to the first model surface drawn on screen, or to the workspace ground. Every surface stops the
 *   ray, glass included, so the zoom stops at a window as it does at a wall.
 * - `hit`, what a visitor looks at or points to: the nearest piece a query accepts (by its tag, src/build/types.ts `PieceTag`, and its distance),
 *   with its mesh, instance, distance and tag. A surface the query does not accept stops the ray, unless the query passes through transparent pieces
 *   and it is an untagged one (glass, water): an artwork in a vitrine is found through the glass, never through a wall or a glass door the query
 *   rejects. The walking eye's look target
 *   (src/walk/look.ts) runs it every frame; a pointer ray from an orbit-view click runs it the same way.
 * Only drawn instances count (the first `count` of a visible mesh on a layer the camera draws), at their current matrices, so a piece still arriving
 * is met where it is shown and landscape a floor view hides (src/viewer/floor-view.ts) is passed through; with the section cut on, a hit above the
 * cut on a material the cut clips is passed through, as the eye sees through the removed part.
 * Each candidate instance is found by its bounding sphere, the ray taken into its frame and cast against its geometry's BVH (src/walk/bvh-cache.ts).
 * Reads the scene only.
 */
import { DoubleSide, Matrix4, Ray, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Intersection, InstancedMesh, Layers, Material } from 'three';

import type { PieceTag } from '../build/types.js';
import type { GeometryBvhs } from '../walk/bvh-cache.js';
import { cutBySection } from './section-cut.js';

export interface PickCut {
  readonly enabled: boolean;
  readonly height: number;
}

/** A piece's tag by its mesh and instance (src/build/timeline.ts `Timeline.tagOf`). */
export type TagOf = (mesh: InstancedMesh, instance: number) => PieceTag | null;

/** What `hit` looks for. */
export interface HitQuery {
  /** Pass through untagged transparent pieces (glass, water); a tagged piece the query does not accept and every other surface still stop the ray. Default false: every surface stops it. */
  readonly throughTransparent?: boolean;
  /** Only surfaces nearer than this count, metres. Default: no limit. */
  readonly far?: number;
  /** Whether the query looks for this piece, met at this distance. Default: every piece. */
  readonly accept?: (tag: PieceTag | null, distance: number) => boolean;
}

/** The nearest accepted piece: its mesh, its instance, its distance along the ray (unit direction) and its tag. */
export interface PickHit {
  readonly mesh: InstancedMesh;
  readonly instance: number;
  readonly distance: number;
  readonly tag: PieceTag | null;
}

const noTags: TagOf = () => null;
const acceptAll = (): boolean => true;
/**
 * Whether the ray goes on past a piece the query did not accept. Accepting a target and passing through are apart: only an untagged transparent piece
 * (glass, water) lets it on, and only when the query asks; a tagged piece the query rejects, a glass door out of reach for one, stops it as a wall does.
 */
const passes = (tag: PieceTag | null, material: Material, through: boolean): boolean => through && tag === null && material.transparent;

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
    /** The camera's layers: a mesh on none of them is not drawn, so the ray passes through it. */
    private readonly layers: Layers,
    private readonly tagOf: TagOf = noTags,
  ) {}

  /** The distance along `ray` (unit direction, world metres) to the first surface it meets, or null when it meets none. */
  distance(ray: Ray): number | null {
    let best = Number.POSITIVE_INFINITY;
    if (ray.direction.y < -1e-9) {
      const t = (this.groundY - ray.origin.y) / ray.direction.y;
      if (t > 0) best = t;
    }
    this.each(ray, () => best, (_mesh, _instance, t) => {
      best = Math.min(best, t);
    });
    return Number.isFinite(best) ? best : null;
  }

  /**
   * The nearest piece along `ray` (unit direction, world metres) that `query` accepts, before the ray stops: at the first surface it does not accept,
   * or with `throughTransparent` at the first such surface that is not an untagged transparent one. Null when there is none within `far`. The workspace
   * ground is no piece.
   */
  hit(ray: Ray, query: HitQuery = {}): PickHit | null {
    const accept = query.accept ?? acceptAll;
    const through = query.throughTransparent === true;
    // Where the ray stops (the nearest surface not accepted that it cannot pass), and the nearest accepted surface so far.
    const best: { stop: number; found: PickHit | null } = { stop: query.far ?? Number.POSITIVE_INFINITY, found: null };
    this.each(ray, () => Math.min(best.stop, best.found?.distance ?? Number.POSITIVE_INFINITY), (mesh, instance, t, material) => {
      const tag = this.tagOf(mesh, instance);
      if (accept(tag, t)) {
        if (best.found === null || t < best.found.distance) best.found = { mesh, instance, distance: t, tag };
      } else if (!passes(tag, material, through)) {
        best.stop = Math.min(best.stop, t);
      }
    });
    return best.found !== null && best.found.distance <= best.stop ? best.found : null;
  }

  /**
   * Calls `visit` with the nearest surface along `ray` of each drawn instance whose bounding sphere starts before `limit()` along it, nearer than that
   * limit, with its material.
   */
  private each(ray: Ray, limit: () => number, visit: (mesh: InstancedMesh, instance: number, distance: number, material: Material) => void): void {
    for (const mesh of this.meshes) {
      if (!mesh.visible || mesh.count === 0 || !mesh.layers.test(this.layers)) continue;
      if (mesh.boundingSphere !== null && !this.reaches(ray, mesh.boundingSphere, limit())) continue;
      const material = mesh.material;
      if (Array.isArray(material)) continue;
      const geometry = mesh.geometry;
      const local = this.localSphere(geometry);
      const clipped = this.cut.enabled && cutBySection(material);
      const array = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i += 1) {
        this.matrix.fromArray(array, i * 16);
        this.sphere.copy(local).applyMatrix4(this.matrix);
        const before = limit();
        if (!this.reaches(ray, this.sphere, before)) continue;
        const t = this.castInstance(ray, geometry, clipped, before);
        if (t < before) visit(mesh, i, t, material);
      }
    }
  }

  /** Whether `ray` passes through `sphere` with some of it nearer than `limit`. */
  private reaches(ray: Ray, sphere: Sphere, limit: number): boolean {
    if (!ray.intersectsSphere(sphere)) return false;
    const along = this.toCentre.subVectors(sphere.center, ray.origin).dot(ray.direction);
    return along - sphere.radius <= limit;
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
