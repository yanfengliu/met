/**
 * One bounding-volume hierarchy (three-mesh-bvh `MeshBVH`) per model geometry, in the geometry's own coordinates, built on first use and kept.
 * Pieces share geometries (docs/design/spec.md, Batching), so the model's 1.5 million instanced triangles need BVHs over its 0.2 million distinct
 * ones: the walk collision and the zoom pick both query a piece by taking the query into the piece's frame or its triangles out of it.
 * Each BVH is built over a proxy that shares the geometry's position and index buffers but has no groups (a piece draws every triangle with its
 * one material, whatever its groups say) and is `indirect`, so the model's geometry is never reordered, re-indexed or given a bounding box here.
 * Bound: a geometry is assumed not to change after its first query; the model's geometries never do once the timeline is built.
 */
import { BufferGeometry } from 'three';
import { CENTER, MeshBVH } from 'three-mesh-bvh';

export class GeometryBvhs {
  private readonly built = new WeakMap<BufferGeometry, MeshBVH>();
  /** Distinct geometries and triangles built so far, and the milliseconds spent building them. */
  geometries = 0;
  triangles = 0;
  ms = 0;

  /** The BVH of `geometry`, building it on first use. */
  get(geometry: BufferGeometry): MeshBVH {
    const known = this.built.get(geometry);
    if (known !== undefined) return known;
    const start = performance.now();
    const proxy = new BufferGeometry();
    proxy.setAttribute('position', geometry.getAttribute('position'));
    if (geometry.index !== null) proxy.setIndex(geometry.index);
    const bvh = new MeshBVH(proxy, { indirect: true, setBoundingBox: false, strategy: CENTER, verbose: false });
    this.built.set(geometry, bvh);
    this.geometries += 1;
    this.triangles += (geometry.index === null ? geometry.getAttribute('position').count : geometry.index.count) / 3;
    this.ms += performance.now() - start;
    return bvh;
  }
}
