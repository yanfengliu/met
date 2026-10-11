/**
 * Sun direction and shadow fitting. Bound: geometry only; whether the rendered shadows look right is checked by looking at `npm run shots`.
 */
import { Box3, Matrix4, OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { fitShadow, sunDirection } from './sun.js';

describe('sunDirection', () => {
  it('maps true bearings to grid axes rotated by the grid bearing', () => {
    // True north is 29 degrees anticlockwise of grid north (+X), so it leans toward grid west (-Z).
    const north = sunDirection(0, 0, 29);
    expect(north.x).toBeCloseTo(Math.cos((29 * Math.PI) / 180), 9);
    expect(north.z).toBeCloseTo(-Math.sin((29 * Math.PI) / 180), 9);
    // Grid east (+Z, the way the facade faces) is true bearing 119.
    const facade = sunDirection(119, 0, 29);
    expect(facade.z).toBeCloseTo(1, 9);
    expect(sunDirection(140, 90).y).toBeCloseTo(1, 9);
  });
});

describe('fitShadow', () => {
  it('covers every caster corner and its shadow on the ground, for a box the size of the real building', () => {
    const casters = new Box3(new Vector3(-200, 0, -250), new Vector3(200, 40, 10));
    const toSun = sunDirection(140, 30);
    const fit = fitShadow(casters, toSun, -0.5);
    const camera = new OrthographicCamera(fit.left, fit.right, fit.top, fit.bottom, fit.near, fit.far);
    camera.position.copy(fit.position);
    camera.lookAt(fit.target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const clip = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    for (const x of [-200, 200]) {
      for (const y of [0, 40]) {
        for (const z of [-250, 10]) {
          const corner = new Vector3(x, y, z);
          const shadow = corner.clone().addScaledVector(toSun, -(y + 0.5) / toSun.y);
          for (const p of [corner, shadow]) {
            const ndc = p.clone().applyMatrix4(clip);
            expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
            expect(Math.abs(ndc.z)).toBeLessThanOrEqual(1);
          }
        }
      }
    }
    // It comes from the bounds, not a constant: a building twice as wide gets a wider frustum.
    const wider = fitShadow(new Box3(new Vector3(-400, 0, -250), new Vector3(400, 40, 10)), toSun, -0.5);
    expect(wider.right - wider.left).toBeGreaterThan(fit.right - fit.left);
  });
});
