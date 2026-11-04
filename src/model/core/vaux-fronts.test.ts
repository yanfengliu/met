/**
 * Work unit 15's gates on the 1880 fronts (exterior.md section 9). The Lehman Wing's court sees the west front's central arch whole, as exterior-images.md
 * #60 shows it: rays from the court-floor camera of [C7]'s renders to the arch's crown, the head's sides and its impost band meet no opaque piece of the
 * wing's structure or glass steps first. And each 1880 head arrives as one in the build: its light and dark pieces share a stagger key.
 * Bound: geometry is built in Node without WebGL, so these read ray hits on the built pieces and their bounds, not rendered pixels; the rays reach the
 * central arch only, since the wing's flat roof still hides the other four heads from this camera (section 9).
 * Red proofs (2026-11-04): with the court's east lintel back on the flat roof (12.0 m), and again with the strip's head back at 12.9 m, the ray to the
 * crown met the lintel at (0, 13.44, −139.20); with `vaux-openings` staggered by Z, the side walls' five heads cut by second-floor doors took light
 * and dark keys up to 0.64 m apart (−103.70 and −104.34).
 */
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { staggerKeys } from '../../build/stagger.js';
import { lehmanStructureSteps } from '../roche-south/lehman.js';
import { lehmanGlassSteps } from '../roche-south/lehman-glass.js';
import { VAUX_ARCH_RISE, VAUX_ARCH_SPAN, VAUX_VOUSSOIR, VAUX_VOUSSOIR_CROWN, WEST_Z } from './constants.js';
import { vauxSteps } from './vaux.js';
import { SPRING_Y, VOUSSOIR_PROUD } from './vaux-arch.js';

/** The court-floor camera of exterior.md [C7]'s renders, 1.5 m over the court's floor on the axis, under the pyramid. */
const COURT_CAMERA = new Vector3(0, -0.84, -158);

describe('the 1880 west front from the Lehman court', () => {
  it('shows its central arch whole, from the crown of its voussoirs down both sides of its head to its impost band (exterior-images.md #60)', () => {
    const meshes = [...lehmanStructureSteps, ...lehmanGlassSteps].flatMap((step) =>
      collectStep(step)
        .pieces.filter((piece) => !piece.material.transparent)
        .map((piece) => {
          const mesh = new Mesh(piece.geometry, piece.material);
          mesh.name = `${step.id}/${piece.material.name}`;
          mesh.matrixAutoUpdate = false;
          mesh.matrix.copy(piece.matrix);
          mesh.updateMatrixWorld(true);
          return mesh;
        }),
    );
    // Points on the voussoirs' face: the crown, the extrados halfway down each side, and the impost band under the doorway's head.
    const face = WEST_Z - VOUSSOIR_PROUD / 2;
    const crown = SPRING_Y + VAUX_ARCH_RISE + VAUX_VOUSSOIR_CROWN;
    const side = VAUX_ARCH_SPAN / 2 + VAUX_VOUSSOIR / 2;
    const targets = [new Vector3(0, crown - 0.1, face), new Vector3(-side, SPRING_Y + 1.2, face), new Vector3(side, SPRING_Y + 1.2, face), new Vector3(0, SPRING_Y - 0.25, WEST_Z - 0.04)];
    const blocked = targets.flatMap((target) => {
      const along = target.clone().sub(COURT_CAMERA);
      const ray = new Raycaster(COURT_CAMERA, along.clone().normalize(), 0, along.length() - 0.05);
      const hit = ray.intersectObjects(meshes, false)[0];
      return hit === undefined ? [] : [`to (${target.toArray().map((v) => v.toFixed(2)).join(', ')}): ${hit.object.name} at (${hit.point.toArray().map((v) => v.toFixed(2)).join(', ')})`];
    });
    expect(blocked).toEqual([]);
  });
});

describe('the 1880 heads in the build', () => {
  it("arrive as one: each head's light and dark pieces stand at one matrix and have one stagger key in their step", () => {
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
      });
    }
    expect(problems).toEqual([]);
    // Five on the west front, twelve on the side walls and four on the east front.
    expect(pairs).toBe(21);
  });
});
