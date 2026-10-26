/**
 * The placeholder forms (src/model/collection/kinds.ts): each fills the unit box exactly, X and Z −0.5..0.5 and Y 0..1, so a piece's matrix gives an
 * object its real width, height and depth, and its translation, the key of its colour in the shared material (material.ts), stays its plan centre under
 * the pop motion its step uses.
 * Bound: it checks the geometries' bounding boxes, not their look.
 */
import { describe, expect, it } from 'vitest';

import * as kinds from './kinds.js';

describe('placeholder forms', () => {
  it('fill the unit box exactly', () => {
    const forms = Object.entries(kinds);
    expect(forms.length).toBeGreaterThanOrEqual(10);
    for (const [name, make] of forms) {
      const geometry = make();
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      expect([box?.min.toArray(), box?.max.toArray()].flat().map((v) => Math.round((v ?? Number.NaN) * 1e6) / 1e6), name).toEqual([-0.5, 0, -0.5, 0.5, 1, 0.5]);
    }
  });
});
