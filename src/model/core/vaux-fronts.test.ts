/**
 * Work unit 15's gates on the 1880 fronts (exterior.md section 9). From the court-floor camera of [C7]'s renders, the Lehman Wing's court shows the west
 * front's central arch's head as exterior-images.md #60 shows it: each face of its voussoirs and inner order that looks out of the wall is the first thing
 * a ray from the camera meets, at its centroid and at each of its corners drawn 2 cm in, among every opaque piece of the wing's structure and glass and of
 * the west front itself. And each 1880 head moves as one in the build: at five moments through its step, its light and dark pieces stand at one matrix and
 * are drawn or not alike.
 * Bound: geometry is built in Node without WebGL, so these read ray hits on the built pieces and the timeline's instance matrices, not rendered pixels.
 * The sightline samples points, not whole faces. The court's ring walls stand 0.29 m into its east opening, so from this camera they hide the head's faces
 * beyond 2.01 m of the axis, the outer halves of its lowest stones, which #60 shows (section 9); the samples stop at 1.95 m. They start 0.1 m over the
 * springing, where the impost band's top, 5 cm prouder than the inner order, hides the faces' lowest centimetres from below. The wing's flat roof hides
 * the other four heads from this camera, so it reads the central one. The motion is read at five moments, 0.2 apart, through each step that holds heads;
 * every piece's window lasts at least 0.25 of its step (src/build/stagger.ts), so each holds one, and a dropping piece is off its place until it lands.
 * Red proofs (2026-11-04): the sightline went red with the court's east lintel back on the flat roof (12.0 m; 398 points hidden), with the strip's head
 * back at 12.9 m (110) and with it at 13.8 m, where the lead flat cuts the crown (27), and with the central head's light piece left out of its step; the
 * motion, rerun with the drawn check (review 4), went red with `vaux-openings` popping its pieces about their own centres (25 problems), staggered by Z
 * (17: 15 of matrices, 2 of drawing), and dropping each piece by its own height (25). No model change fails the drawn check alone: a head's two pieces
 * share an order, so they are drawn alike unless a change gives them different windows, and then their matrices differ at the same moments (both of the
 * Z stagger's drawing problems). It went red alone only with the engine's state changed under it: a light head's mesh hidden, or its count zeroed (Codex,
 * review 4).
 */
import { Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
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
/** A sample corner is drawn this far toward its face's centroid. */
const INSET = 0.02;

/** A piece as a mesh at its world matrix, named by its step, material and geometry. */
function meshOf(step: StepDef, piece: { readonly geometry: BufferGeometry; readonly material: Material; readonly matrix: Matrix4 }): Mesh {
  const mesh = new Mesh(piece.geometry, piece.material);
  mesh.name = `${step.id}/${piece.material.name}/${piece.geometry.name}`;
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(piece.matrix);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** Points on a mesh's triangles that look out of the west front (world normal within 25° of −Z): each centroid and each corner drawn INSET toward it. */
function frontSamples(mesh: Mesh): Vector3[] {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const count = index === null ? position.count : index.count;
  const corner = (k: number): Vector3 => new Vector3().fromBufferAttribute(position, index === null ? k : index.getX(k)).applyMatrix4(mesh.matrixWorld);
  const out: Vector3[] = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const corners = [corner(k), corner(k + 1), corner(k + 2)] as const;
    const [a, b, c] = corners;
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (normal.length() < 1e-9 || normal.normalize().z > -0.9) continue;
    const centroid = a.clone().add(b).add(c).divideScalar(3);
    out.push(centroid, ...corners.map((p) => p.clone().add(centroid.clone().sub(p).setLength(Math.min(INSET, p.distanceTo(centroid))))));
  }
  return out;
}

function matrixAt(mesh: InstancedMesh, slot: number): Matrix4 {
  const m = new Matrix4();
  mesh.getMatrixAt(slot, m);
  return m;
}

describe('the 1880 west front from the Lehman court', () => {
  it("shows its central arch's head as #60 does: within 1.95 m of the axis, each of its faces that looks out is met first by the rays to its points", () => {
    const lehman = [...lehmanStructureSteps, ...lehmanGlassSteps].flatMap((step) => collectStep(step).pieces.filter((p) => !p.material.transparent).map((p) => meshOf(step, p)));
    const steps = vauxSteps.filter((s) => s.id === 'vaux-west-front' || s.id === 'vaux-openings');
    expect(steps.length, 'the west front and openings steps').toBe(2);
    const front = steps.flatMap((step) => collectStep(step).pieces.filter((p) => !p.material.transparent).map((p) => ({ mesh: meshOf(step, p), piece: p })));
    const heads = front.filter(({ piece }) => piece.geometry.name.includes(':west:') && Math.abs(piece.matrix.elements[12]) < 1e-6).map(({ mesh }) => mesh);
    expect(heads.length, "the central head's light and dark pieces").toBe(2);
    const targets = heads.flatMap((mesh) => frontSamples(mesh).filter((p) => Math.abs(p.x) <= SEEN_HALF_WIDTH && p.y >= SPRING_Y + 0.1 && p.z <= WEST_Z + 1e-3).map((point) => ({ mesh, point })));
    expect(targets.length, 'points sampled').toBeGreaterThan(400);
    const scene = [...lehman, ...front.map(({ mesh }) => mesh)];
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
  it("move as one: at five moments of their step, each head's light and dark pieces stand at one matrix and are drawn or not alike", () => {
    const timeline = new Timeline(vauxSteps);
    const problems: string[] = [];
    let pairs = 0;
    timeline.steps.forEach((step, i) => {
      // At rest, each head's instances stand at their final matrices: pair each light instance with the dark one at its matrix.
      timeline.evaluate(i + 1);
      const instances = step.meshes.flatMap((mesh) =>
        mesh.geometry.name.startsWith('vauxHead:') ? Array.from({ length: mesh.count }, (_, slot) => ({ mesh, slot, tone: mesh.geometry.name.split(':')[1] ?? '', rest: matrixAt(mesh, slot) })) : [],
      );
      const here = instances.filter((p) => p.tone === 'light').map((light) => ({ light, dark: instances.find((d) => d.tone === 'dark' && d.rest.equals(light.rest)) }));
      for (const { light, dark } of here) if (dark === undefined) problems.push(`${step.def.id} ${light.mesh.geometry.name} slot ${String(light.slot)}: no dark piece at its matrix`);
      pairs += here.length;
      for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        timeline.evaluate(i + f);
        for (const { light, dark } of here) {
          if (dark === undefined) continue;
          const [a, b] = [matrixAt(light.mesh, light.slot), matrixAt(dark.mesh, dark.slot)];
          const gap = a.elements.reduce((most, v, k) => Math.max(most, Math.abs(v - (b.elements[k] ?? 0))), 0);
          if (gap > 1e-6) problems.push(`${step.def.id} at f ${String(f)}: ${light.mesh.geometry.name} slot ${String(light.slot)} and its dark piece differ by ${gap.toFixed(3)}`);
          // A mesh draws its first `count` slots, in arrival order (src/build/timeline.ts).
          const drawn = (p: { readonly mesh: InstancedMesh; readonly slot: number }): boolean => p.mesh.visible && p.slot < p.mesh.count;
          if (drawn(light) !== drawn(dark)) problems.push(`${step.def.id} at f ${String(f)}: ${light.mesh.geometry.name} slot ${String(light.slot)} drawn ${String(drawn(light))}, its dark piece ${String(drawn(dark))}`);
        }
      }
    });
    expect(problems).toEqual([]);
    // Five on the west front, twelve on the side walls and four on the east front.
    expect(pairs).toBe(21);
  });
});
