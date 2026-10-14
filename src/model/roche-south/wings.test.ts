/**
 * Facts the Roche south wings must keep, checked headless on the pieces their steps add (src/build/kit.ts collectStep).
 * Bounds: the Lehman pyramid's apex and eave, the Lehman Wing's junction with the 1880 front (the skylight strip clear of the inner ring wall and the
 * brick face, the flat roof open over the court, sampled at fixed points), the Rockefeller glass wall's foot line, slope and rows, wall thickness on every limestone unit-box wall
 * taller than 3 m, and the wings' date order. Each check reads the geometry the steps place, not the constants they were built from, except where a
 * test names the constant it compares against.
 */
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import type { StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, LEHMAN_PYRAMID_APEX_Y, ROCKEFELLER_GLASS_FACE_X, ROCKEFELLER_GLASS_RISE, ROCKEFELLER_GLASS_SLOPE_DEG, WEST_FACE_Z_CORE } from '../frame.js';
import { palette } from '../palette.js';
import { lehmanSteps, rocheSouthSteps } from './index.js';
import { COURT_OCTAGON, COURT_OCTAGON_OUT, LEHMAN_EAVE_Y, LEHMAN_ROOF_Y } from './lehman-plan.js';
import { mat } from './materials.js';
import { contains } from './poly.js';
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

describe('the Lehman Wing against the 1880 front', () => {
  it('keeps the skylight strip along the old front out of the inner ring wall and short of the brick face', () => {
    // The court's east tip comes within 0.2 m of the front; the strip once ran through the ring wall that carries the pyramid's east eave.
    const bad = vertices(step(lehmanSteps, 'lehman-gallery-glass'), mat.steel)
      .concat(vertices(step(lehmanSteps, 'lehman-gallery-glass'), mat.glass))
      .filter((v) => v.z > -141 && (v.z > WEST_FACE_Z_CORE + 1e-6 || contains(COURT_OCTAGON_OUT, [v.x, v.z])));
    expect(bad.map((v) => v.toArray().map((c) => c.toFixed(2)).join(', '))).toEqual([]);
  });

  it('leaves the court open to its pyramid: the flat roof covers the rooms round it but nothing over the court octagon', () => {
    // The roof's opening for the court, a hole stopped 0.1 m short of the roof's edge, once left the slab's top face over the whole court (seen from
    // above through the pyramid) and a sliver across the top of the court's east opening (seen from the court).
    const court: [number, number][] = [[0, -139.4], [-1.9, -139.45], [1.9, -139.45], [0, -139.65], [0, -145], [6, -146], [-6, -146], [0, -150.8], [0, -158]];
    const rooms: [number, number][] = [[22, -160], [-22, -160], [0, -176], [10, -142]];
    const faces = { top: [] as [number, number][][], bottom: [] as [number, number][][] };
    for (const piece of collectStep(step(lehmanSteps, 'lehman-roof')).pieces) {
      if (piece.material !== mat.roof) continue;
      const position = piece.geometry.getAttribute('position');
      const index = piece.geometry.index;
      const count = index?.count ?? position.count;
      for (let t = 0; t + 2 < count; t += 3) {
        const tri = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index?.getX(t + k) ?? t + k).applyMatrix4(piece.matrix));
        const plan = tri.map((v): [number, number] => [v.x, v.z]);
        if (tri.every((v) => Math.abs(v.y - LEHMAN_ROOF_Y) < 1e-6)) faces.top.push(plan);
        if (tri.every((v) => Math.abs(v.y - (LEHMAN_ROOF_Y - 0.6)) < 1e-6)) faces.bottom.push(plan);
      }
    }
    const under = (p: [number, number], tris: [number, number][][]): boolean => tris.some((tri) => contains(tri, p));
    for (const [name, tris] of Object.entries(faces)) {
      expect(court.filter((p) => contains(COURT_OCTAGON, p) && under(p, tris)).map((p) => `${name} over the court at ${p.join(', ')}`)).toEqual([]);
      expect(rooms.filter((p) => !under(p, tris)).map((p) => `${name} missing over the rooms at ${p.join(', ')}`)).toEqual([]);
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

describe('exterior walls', () => {
  it('start at or below the excavated pad (GROUND_FLOOR_Y − 0.1) wherever they reach near the ground, so no gap shows under the terrain', () => {
    const ids = ['lehman-walls', 'rockefeller-walls', 'wallace-facades', 'kravis-park-face'];
    const bad: string[] = [];
    for (const def of [...lehmanSteps, ...rocheSouthSteps].filter((s) => ids.includes(s.id))) {
      collectStep(def).pieces.forEach((piece, i) => {
        if (piece.geometry.boundingBox === null) piece.geometry.computeBoundingBox();
        const box = (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        if (box.min.y < 3 && box.min.y > GROUND_FLOOR_Y - 0.1) bad.push(`${def.id} piece ${String(i)} starts at ${box.min.y.toFixed(2)}`);
      });
    }
    expect(ids.every((id) => [...lehmanSteps, ...rocheSouthSteps].some((s) => s.id === id))).toBe(true);
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
