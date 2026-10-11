/**
 * Headless checks of the core area's steps (src/model/core/): ids, titles and chapters, every piece inside the core blocks, the area budget
 * (350,000 triangles counting instances, 130 instanced meshes, 1 step light; coordinator's assignment, 2026-10-11) and finite matrices.
 * Bound: geometry is built in Node without WebGL, so counts and bounds are exact but nothing here looks at a rendered pixel.
 * Blocks: core-1880-a, core-1888-b and core-1894-c tile X −49.7..49.4, Z −138.3..−69.0 (exterior.md section 2). A piece may overstep that by
 * 0.3 m; trim (any non-brick piece) on the west face (into the Lehman court and the park) and on Weston's south face (into the Petrie Court)
 * may project up to 1.5 m (coordinator, 2026-10-11).
 */
import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { europeanPaintingsGlazing2023Steps, medievalHallSteps, vauxSteps, westonTuckermanSteps } from './index.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARRAYS: readonly (readonly [string, readonly StepDef[]])[] = [
  ['vaux-mould-1880', vauxSteps],
  ['weston-tuckerman-1894', westonTuckermanSteps],
  ['mckim-mead-white-1926', medievalHallSteps],
  ['koch-plaza-2014', europeanPaintingsGlazing2023Steps],
];
const ALL: readonly StepDef[] = ARRAYS.flatMap(([, steps]) => steps);
const BLOCKS = { x0: -49.7, x1: 49.4, z0: -138.3, z1: -69.0 } as const;
const SLACK = 0.3;
const TRIM = 1.5;
const BUDGET = { triangles: 350_000, meshes: 130, lights: 1 } as const;

describe('core steps', () => {
  it('have unique kebab-case ids, short titles and details, and name the chapter they are composed into', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
    for (const [chapter, steps] of ARRAYS) expect(steps.filter((s) => s.chapter !== chapter).map((s) => s.id)).toEqual([]);
    expect(vauxSteps.length).toBeGreaterThan(0);
  });

  it('keep every piece inside the core blocks (trim may reach into the Lehman and Petrie courts)', () => {
    const problems: string[] = [];
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, i) => {
        const g = piece.geometry;
        if (g.boundingBox === null) g.computeBoundingBox();
        const box = (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        const trim = piece.material !== palette.brick;
        const west = BLOCKS.z0 - box.min.z;
        const south = BLOCKS.x0 - box.min.x;
        const bad =
          box.max.x > BLOCKS.x1 + SLACK ||
          box.max.z > BLOCKS.z1 + SLACK ||
          west > (trim ? TRIM : SLACK) + 1e-6 ||
          south > (trim ? TRIM : SLACK) + 1e-6 ||
          box.min.y < -30 ||
          box.max.y > 60;
        if (bad) problems.push(`${step.id} piece ${String(i)} (${piece.material.name}): ${box.min.toArray().map((v) => v.toFixed(2)).join(', ')} to ${box.max.toArray().map((v) => v.toFixed(2)).join(', ')}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it('stay within the area budget with finite matrices', () => {
    const timeline = new Timeline(ALL);
    const stats = timeline.stats();
    expect(stats.triangles, 'triangles at t = N').toBeLessThanOrEqual(BUDGET.triangles);
    expect(stats.meshes, 'instanced meshes').toBeLessThanOrEqual(BUDGET.meshes);
    expect(stats.lights, 'step lights').toBeLessThanOrEqual(BUDGET.lights);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
    console.log(`core: ${String(stats.steps)} steps, ${String(stats.pieces)} pieces, ${String(stats.meshes)} meshes, ${String(stats.triangles)} triangles, ${String(stats.lights)} lights`);
  });
});
