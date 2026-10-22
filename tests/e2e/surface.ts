/**
 * The first surface along a ray in the finished model, found apart from the page, for the zoom gate (tests/e2e/zoom.spec.ts): the whole sequence's
 * timeline built and evaluated at t = N in the test's own process, then every drawn piece's triangles tested one by one at its final matrix, both faces
 * counting (as the page's pick counts them), plus the workspace ground 0.5 m under the lower of grade and the model's lowest point (docs/design/spec.md,
 * Camera framing). Nothing here uses src/viewer/pick.ts, a BVH, the orbit target or the page's state.
 * Bound: it holds for a page at t = N with no section cut and no floor view, where every mesh is drawn, which is the state the zoom gate opens.
 */
import { Matrix4, Ray, Sphere, Vector3 } from 'three';
import type { InstancedMesh } from 'three';

import { SEQUENCE } from '../../src/build/sequence.js';
import { Timeline } from '../../src/build/timeline.js';

type Triple = readonly [number, number, number];

let model: { readonly meshes: readonly InstancedMesh[]; readonly groundY: number } | null = null;

function finished(): { readonly meshes: readonly InstancedMesh[]; readonly groundY: number } {
  if (model !== null) return model;
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  const meshes = timeline.steps.flatMap((s) => s.meshes).filter((m) => m.visible && m.count > 0);
  model = { meshes, groundY: Math.min(0, timeline.bounds.min.y) - 0.5 };
  return model;
}

/** The workspace ground's height under the finished model, by the same rule (the camera floor stands CAMERA_FLOOR over it). */
export function workspaceGround(): number {
  return finished().groundY;
}

/** The distance from `origin` along the unit `direction` to the first surface of the finished model or the workspace ground, or null over open sky. */
export function firstSurface(origin: Triple, direction: Triple): number | null {
  const { meshes, groundY } = finished();
  const ray = new Ray(new Vector3(...origin), new Vector3(...direction).normalize());
  let best = Number.POSITIVE_INFINITY;
  if (ray.direction.y < 0) {
    const t = (groundY - ray.origin.y) / ray.direction.y;
    if (t > 0) best = t;
  }
  // Every instance whose bounding sphere the ray meets, nearest entry first, so the search stops once no sphere can hold a nearer hit.
  const matrix = new Matrix4();
  const sphere = new Sphere();
  const candidates: { readonly at: number; readonly mesh: InstancedMesh; readonly i: number }[] = [];
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
    const local = geometry.boundingSphere;
    if (local === null) continue;
    for (let i = 0; i < mesh.count; i += 1) {
      mesh.getMatrixAt(i, matrix);
      sphere.copy(local).applyMatrix4(matrix);
      if (!ray.intersectsSphere(sphere)) continue;
      candidates.push({ at: Math.max(0, sphere.center.clone().sub(ray.origin).dot(ray.direction) - sphere.radius), mesh, i });
    }
  }
  candidates.sort((a, b) => a.at - b.at);
  const inverse = new Matrix4();
  const localRay = new Ray();
  const [a, b, c, hit] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  for (const { at, mesh, i } of candidates) {
    if (at > best) break;
    mesh.getMatrixAt(i, matrix);
    inverse.copy(matrix).invert();
    localRay.copy(ray).applyMatrix4(inverse);
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.index;
    const count = index === null ? position.count : index.count;
    for (let k = 0; k + 2 < count; k += 3) {
      a.fromBufferAttribute(position, index === null ? k : index.getX(k));
      b.fromBufferAttribute(position, index === null ? k + 1 : index.getX(k + 1));
      c.fromBufferAttribute(position, index === null ? k + 2 : index.getX(k + 2));
      if (localRay.intersectTriangle(a, b, c, false, hit) === null) continue;
      const d = hit.applyMatrix4(matrix).sub(ray.origin).dot(ray.direction);
      if (d > 1e-4 && d < best) best = d;
    }
  }
  return Number.isFinite(best) ? best : null;
}
