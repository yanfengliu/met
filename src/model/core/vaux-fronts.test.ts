/**
 * Work unit 15's gates on the 1880 fronts (exterior.md section 9). From the court-floor camera of [C7]'s renders, the Lehman Wing's court shows the west
 * front's central arch's head as exterior-images.md #60 shows it: every face of its voussoirs and inner order that looks out of the wall within 1.95 m of
 * the axis is the first thing a ray from the camera meets, among every opaque piece of the wing's structure and glass and of the west front itself. And
 * each 1880 head arrives and moves as one in the build: its light and dark pieces stand at one matrix with one stagger key and one bounding box, which the
 * build takes for their motion's pivot (src/build/timeline.ts).
 * Bound: geometry is built in Node without WebGL, so these read ray hits on the built pieces and their bounds, not rendered pixels. The court's ring walls
 * stand 0.29 m into its east opening, so from this camera they hide the head's faces beyond 2.01 m of the axis, the outer halves of its lowest stones,
 * which #60 shows (section 9); the gate stops at 1.95 m. It also starts 0.1 m over the springing, where the impost band's top, 5 cm prouder than the inner
 * order, hides the faces' lowest centimetres from below. The wing's flat roof hides the other four heads from this camera, so it reads the central one.
 * Red proofs (2026-11-04): with the court's east lintel back on the flat roof (12.0 m), 104 of the head's faces met it first, and with the strip's head
 * back at 12.9 m, 32 did; with the central head's light piece left out of the step, it found one piece of two; without the shared bounding box, every
 * pair's bounds differed (the west front's by 0.30 m) and the side walls' five heads cut by second-floor doors took light and dark keys up to 0.64 m
 * apart (−103.70 and −104.34).
 */
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import type { Material, Matrix4 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { staggerKeys } from '../../build/stagger.js';
import type { StepDef } from '../../build/types.js';
import { lehmanStructureSteps } from '../roche-south/lehman.js';
import { lehmanGlassSteps } from '../roche-south/lehman-glass.js';
import { WEST_Z } from './constants.js';
import { vauxSteps } from './vaux.js';
import { SPRING_Y } from './vaux-arch.js';

/** The court-floor camera of exterior.md [C7]'s renders, 1.5 m over the court's floor on the axis, under the pyramid. */
const COURT_CAMERA = new Vector3(0, -0.84, -158);
/** How far from the axis the court's east opening lets this camera see the front's face: 2.01 m, less a margin. */
const SEEN_HALF_WIDTH = 1.95;

/** A piece as a mesh at its world matrix, named by its step and material. */
function meshOf(step: StepDef, piece: { readonly geometry: BufferGeometry; readonly material: Material; readonly matrix: Matrix4 }): Mesh {
  const mesh = new Mesh(piece.geometry, piece.material);
  mesh.name = `${step.id}/${piece.material.name}/${piece.geometry.name}`;
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(piece.matrix);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** The centroids of a mesh's triangles that look out of the west front (world normal within 25° of −Z), in world metres. */
function frontCentroids(mesh: Mesh): Vector3[] {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const count = index === null ? position.count : index.count;
  const corner = (k: number): Vector3 => new Vector3().fromBufferAttribute(position, index === null ? k : index.getX(k)).applyMatrix4(mesh.matrixWorld);
  const out: Vector3[] = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const [a, b, c] = [corner(k), corner(k + 1), corner(k + 2)];
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (normal.length() < 1e-9) continue;
    if (normal.normalize().z < -0.9) out.push(a.add(b).add(c).divideScalar(3));
  }
  return out;
}

describe('the 1880 west front from the Lehman court', () => {
  it("shows its central arch's head as #60 does, every face of it that looks out within 1.95 m of the axis met first by its ray (exterior-images.md #60)", () => {
    const lehman = [...lehmanStructureSteps, ...lehmanGlassSteps].flatMap((step) => collectStep(step).pieces.filter((p) => !p.material.transparent).map((p) => meshOf(step, p)));
    const step = vauxSteps.find((s) => s.id === 'vaux-west-front');
    expect(step, 'the west front step').toBeDefined();
    if (step === undefined) return;
    const pieces = collectStep(step).pieces;
    const front = pieces.map((p) => meshOf(step, p));
    const heads = front.filter((_, i) => (pieces[i]?.geometry.name ?? '').startsWith('vauxHead:') && Math.abs(pieces[i]?.matrix.elements[12] ?? 1) < 1e-6);
    expect(heads.length, "the central head's light and dark pieces").toBe(2);
    const targets = heads.flatMap((mesh) => frontCentroids(mesh).filter((p) => Math.abs(p.x) <= SEEN_HALF_WIDTH && p.y >= SPRING_Y + 0.1 && p.z <= WEST_Z + 1e-3).map((point) => ({ mesh, point })));
    expect(targets.length, 'faces sampled').toBeGreaterThan(100);
    const scene = [...lehman, ...front];
    const hidden = targets.flatMap(({ mesh, point }) => {
      const along = point.clone().sub(COURT_CAMERA);
      const ray = new Raycaster(COURT_CAMERA, along.clone().normalize(), 0, along.length() + 0.05);
      const hit = ray.intersectObjects(scene, false)[0];
      if (hit !== undefined && hit.object === mesh && Math.abs(hit.distance - along.length()) < 0.01) return [];
      const at = (v: Vector3): string => v.toArray().map((x) => x.toFixed(2)).join(', ');
      return [`(${at(point)}): ${hit === undefined ? 'nothing' : `${hit.object.name} at (${at(hit.point)})`}`];
    });
    expect(hidden).toEqual([]);
  });
});

describe('the 1880 heads in the build', () => {
  it("arrive and move as one: each head's light and dark pieces stand at one matrix with one stagger key and one bounding box in their step", () => {
    const tone = (geometry: { readonly name: string }): string => geometry.name.split(':')[1] ?? '';
    const problems: string[] = [];
    let pairs = 0;
    for (const step of vauxSteps) {
      const { pieces } = collectStep(step);
      const inputs = pieces.map((piece) => {
        const geometry = piece.geometry;
        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        const centre = (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix).getCenter(new Vector3());
        return { cx: centre.x, cy: centre.y, cz: centre.z, order: piece.order };
      });
      const keys = staggerKeys(step.stagger ?? 'order', inputs, 0, 0);
      const head = (i: number, wanted: string): boolean => {
        const geometry = pieces[i]?.geometry;
        return geometry !== undefined && geometry.name.startsWith('vauxHead:') && tone(geometry) === wanted;
      };
      pieces.forEach((piece, i) => {
        if (!head(i, 'light')) return;
        const j = pieces.findIndex((other, k) => head(k, 'dark') && other.matrix.equals(piece.matrix));
        if (j < 0) {
          problems.push(`${step.id} piece ${String(i)} (${piece.geometry.name}): no dark piece at its matrix`);
          return;
        }
        pairs++;
        if (keys[i] !== keys[j]) problems.push(`${step.id} ${piece.geometry.name}: stagger keys ${String(keys[i])} (light) and ${String(keys[j])} (dark)`);
        const box = (k: number): Box3 => (pieces[k]?.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(pieces[k]?.matrix ?? piece.matrix);
        const [lit, dim] = [box(i), box(j)];
        if (lit.min.distanceTo(dim.min) > 1e-9 || lit.max.distanceTo(dim.max) > 1e-9) problems.push(`${step.id} ${piece.geometry.name}: bounds, so motion pivots, differ by ${lit.getCenter(new Vector3()).distanceTo(dim.getCenter(new Vector3())).toFixed(3)} m`);
      });
    }
    expect(problems).toEqual([]);
    // Five on the west front, twelve on the side walls and four on the east front.
    expect(pairs).toBe(21);
  });
});
