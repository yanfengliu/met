/**
 * Facts the Roche south wings must keep, checked headless on the pieces their steps add (src/build/kit.ts collectStep).
 * Bounds: the Lehman pyramid's apex and eave, the Rockefeller glass wall's foot line, slope and rows, wall thickness on every limestone unit-box wall
 * taller than 3 m, and the wings' date order. Each check reads the geometry the steps place, not the constants they were built from, except where a
 * test names the constant it compares against.
 */
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import type { StepDef } from '../../build/types.js';
import { LEHMAN_PYRAMID_APEX_Y, ROCKEFELLER_GLASS_FACE_X, ROCKEFELLER_GLASS_RISE, ROCKEFELLER_GLASS_SLOPE_DEG } from '../frame.js';
import { palette } from '../palette.js';
import { lehmanSteps, rocheSouthSteps } from './index.js';
import { COURT_OCTAGON, LEHMAN_EAVE_Y } from './lehman-plan.js';
import { mat } from './materials.js';
import { GLASS_ROWS, RF_GLASS_FOOT_Y } from './rockefeller.js';
import { UNIT_BOX, UNIT_TRIANGLE } from './shapes.js';

function step(steps: readonly StepDef[], id: string): StepDef {
  const found = steps.find((s) => s.id === id);
  if (found === undefined) throw new Error(`no step ${id}`);
  return found;
}

/** World positions of every vertex of the pieces that use `material`. */
function vertices(def: StepDef, material: unknown): Vector3[] {
  const out: Vector3[] = [];
  for (const piece of collectStep(def).pieces) {
    if (piece.material !== material) continue;
    const position = piece.geometry.getAttribute('position');
    for (let k = 0; k < position.count; k++) out.push(new Vector3().fromBufferAttribute(position, k).applyMatrix4(piece.matrix));
  }
  return out;
}

describe('the Lehman pyramid', () => {
  const glass = vertices(step(lehmanSteps, 'lehman-pyramid'), mat.glass);

  it('has eight panes meeting at one apex at LEHMAN_PYRAMID_APEX_Y over the court centre', () => {
    const panes = collectStep(step(lehmanSteps, 'lehman-pyramid')).pieces.filter((p) => p.geometry === UNIT_TRIANGLE);
    expect(panes.length).toBe(8);
    const top = glass.reduce((a, v) => (v.y > a.y ? v : a), new Vector3(0, -Infinity, 0));
    expect(top.y).toBeCloseTo(LEHMAN_PYRAMID_APEX_Y, 1);
    const xs = COURT_OCTAGON.map((p) => p[0]);
    const zs = COURT_OCTAGON.map((p) => p[1]);
    expect(top.x).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2, 1);
    expect(top.z).toBeCloseTo((Math.min(...zs) + Math.max(...zs)) / 2, 1);
  });

  it('rises from the court octagon at the eave', () => {
    const low = glass.filter((v) => v.y < LEHMAN_EAVE_Y + 0.2);
    for (const [x, z] of COURT_OCTAGON) {
      expect(low.some((v) => Math.hypot(v.x - x, v.z - z) < 0.2), `a pane corner at the octagon vertex (${String(x)}, ${String(z)})`).toBe(true);
    }
  });
});

describe('the Rockefeller glass wall', () => {
  const def = step(rocheSouthSteps, 'rockefeller-glass-wall');
  const glass = vertices(def, mat.glassFritted);
  const run = 1 / Math.tan((ROCKEFELLER_GLASS_SLOPE_DEG * Math.PI) / 180);

  it('stands with its foot on X −151.6 and leans toward +X at the published slope', () => {
    expect(glass.length).toBeGreaterThan(0);
    const offPlane = glass.filter((v) => Math.abs(v.x - (ROCKEFELLER_GLASS_FACE_X + (v.y - RF_GLASS_FOOT_Y) * run)) > 0.05);
    expect(offPlane.length).toBe(0);
    expect(Math.min(...glass.map((v) => v.x))).toBeGreaterThanOrEqual(ROCKEFELLER_GLASS_FACE_X - 0.05);
  });

  it('is eight panels high: seven rows of glass under an opaque top row, reaching the published rise', () => {
    expect(GLASS_ROWS).toBe(8);
    const spandrel = vertices(def, mat.spandrel);
    const top = Math.max(...spandrel.map((v) => v.y));
    expect(top).toBeCloseTo(RF_GLASS_FOOT_Y + ROCKEFELLER_GLASS_RISE, 1);
    const glassTop = Math.max(...glass.map((v) => v.y));
    expect(glassTop).toBeCloseTo(RF_GLASS_FOOT_Y + (ROCKEFELLER_GLASS_RISE * 7) / 8, 1);
  });
});

describe('walls', () => {
  it('give every limestone unit-box wall taller than 3 m a thickness from 0.4 to 1.5 m', () => {
    const bad: string[] = [];
    for (const def of [...lehmanSteps, ...rocheSouthSteps]) {
      collectStep(def).pieces.forEach((piece, i) => {
        if (piece.geometry !== UNIT_BOX || piece.material !== palette.limestone) return;
        const sx = new Vector3().setFromMatrixColumn(piece.matrix, 0).length();
        const sy = new Vector3().setFromMatrixColumn(piece.matrix, 1).length();
        const sz = new Vector3().setFromMatrixColumn(piece.matrix, 2).length();
        const box = new Box3().setFromBufferAttribute(UNIT_BOX.getAttribute('position') as never).applyMatrix4(piece.matrix);
        const height = box.max.y - box.min.y;
        // Only upright boxes: a wall's local y is its height.
        if (height < 3 || Math.abs(sy - height) > 0.01) return;
        const thickness = Math.min(sx, sz);
        if (thickness < 0.4 || thickness > 1.5) bad.push(`${def.id} piece ${String(i)}: ${thickness.toFixed(2)} m`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('date order', () => {
  it('builds the south wings in date order: Rockefeller 1982, Wallace 1987, Kravis 1990', () => {
    const years = rocheSouthSteps.map((s) => Number(s.year));
    expect(years.every(Number.isFinite)).toBe(true);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(new Set(years)).toEqual(new Set([1982, 1987, 1990]));
    expect(lehmanSteps.every((s) => s.year === '1975')).toBe(true);
  });
});
