/**
 * The Hunt chapter's own checks, headless (collectStep and Timeline, no WebGL): step ids, titles and order; every piece inside block hunt-d with the pavilion's
 * projection; the eight columns at the settled pair positions; the area's budget; finite matrices.
 * Bounds: the block test checks each piece's world bounding box (a box overstepping a corner of an L-shaped edge counts against the nearer edge only);
 * the wings' front allowance is the spec's moulding rule (up to 1.5 m beyond the line), and pieces of the walls step get 2 cm. Budgets are this area's share
 * from the coordinator (650,000 triangles counting instances, 170 instanced meshes, 2 step lights).
 */
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import { HUNT_COLUMN_AXIS_Z, HUNT_COLUMN_COUNT, HUNT_PAIR_AXIS_SPACING, HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_OUTER } from '../frame.js';
import { columnParts } from '../lib/index.js';
import { HUNT_COLUMN_DIAMETER_LOWER, HUNT_COLUMN_DIAMETER_UPPER, HUNT_COLUMN_HEIGHT } from '../frame.js';
import { huntSteps } from './index.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOLERANCE = 0.3;
/** Block hunt-d (exterior.md section 2) and the pavilion's allowed projection (coordinator, 2026-10-11). */
const BLOCK = { south: -49.7, north: 49.4, back: -69.0, wingFrontSouth: -1.9, wingFrontNorth: -2.0, pavilion: 30.4, pavilionFront: 1.2, projection: 3.5 } as const;
const MOULDING_ALLOWANCE = 1.5;
const BUDGET = { triangles: 650_000, meshes: 170, lights: 2 } as const;

function boxes(stepIndex: number): Box3[] {
  const step = huntSteps[stepIndex];
  if (step === undefined) return [];
  return collectStep(step).pieces.map((piece) => {
    const g = piece.geometry;
    if (g.boundingBox === null) g.computeBoundingBox();
    return (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
  });
}

/**
 * How far a world box oversteps the block's outline (0 when inside), and along which edge. On the building's outer outline (the wings' fronts and the
 * pavilion's sides in front of them) mouldings may project up to 1.5 m (spec, Build-step API); walls get the 0.3 m tolerance only. The seams on X −49.7
 * and +49.4 and the back on Z −69 get the tolerance only, and so does the pavilion's projection line at Z +3.5.
 */
function overstep(b: Box3, stepId: string): { by: number; edge: string } {
  const allowance = stepId === 'hunt-walls' ? 0 : MOULDING_ALLOWANCE - TOLERANCE;
  const out: { by: number; edge: string }[] = [
    { by: BLOCK.south - b.min.x, edge: 'south seam X −49.7' },
    { by: b.max.x - BLOCK.north, edge: 'north seam X +49.4' },
    { by: BLOCK.back - b.min.z, edge: 'back Z −69' },
    { by: b.max.z - BLOCK.projection, edge: 'pavilion projection Z +3.5' },
  ];
  for (const side of [-1, 1] as const) {
    const front = side < 0 ? BLOCK.wingFrontSouth : BLOCK.wingFrontNorth;
    const beyond = side < 0 ? -BLOCK.pavilion - b.min.x : b.max.x - BLOCK.pavilion;
    if (beyond <= TOLERANCE) continue;
    // Part of the box lies in front of a wing: either it stays behind the wing's face (with the allowance), or it is a moulding returning off the pavilion's side.
    const inFront = b.max.z - front - allowance;
    const offSide = beyond - allowance;
    out.push({ by: Math.min(inFront, offSide), edge: `${side < 0 ? 'south' : 'north'} wing front Z ${String(front)} / pavilion side X ${String(side * BLOCK.pavilion)}` });
  }
  return out.reduce((worst, o) => (o.by > worst.by ? o : worst), { by: 0, edge: '' });
}

describe('Hunt steps', () => {
  it('has unique kebab-case ids in chapter hunt-1902, titles of at most 48 characters and details of at most 200', () => {
    const ids = huntSteps.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(huntSteps.filter((s) => s.chapter !== 'hunt-1902').map((s) => s.id)).toEqual([]);
    expect(huntSteps.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(huntSteps.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
  });

  it('builds in constructional order: foundations first, the Great Hall and staircase before the roof, the roof last of 1902', () => {
    const ids = huntSteps.map((s) => s.id);
    expect(ids[0]).toBe('hunt-foundations');
    const roof = ids.indexOf('hunt-roof');
    for (const id of ['hunt-walls', 'hunt-columns', 'great-hall-floor', 'great-hall-domes', 'grand-stair-vault', 'hunt-galleries']) expect(ids.indexOf(id), id).toBeLessThan(roof);
    expect(huntSteps.slice(roof + 1).every((s) => s.year === '1970'), 'only the 1970 desk follows the roof').toBe(true);
  });

  it('keeps every piece inside block hunt-d, the pavilion front within Z +3.5', () => {
    const offenders: string[] = [];
    huntSteps.forEach((step, i) => {
      boxes(i).forEach((b, k) => {
        const o = overstep(b, step.id);
        if (o.by > TOLERANCE + 1e-6) offenders.push(`${step.id} piece ${String(k)}: ${o.by.toFixed(2)} m past the ${o.edge}`);
      });
    });
    expect(offenders).toEqual([]);
  });

  it(`raises ${String(HUNT_COLUMN_COUNT)} columns in four coupled pairs at the settled positions`, () => {
    const index = huntSteps.findIndex((s) => s.id === 'hunt-columns');
    const step = huntSteps[index];
    if (step === undefined) throw new Error('no hunt-columns step');
    const shaft = columnParts({ diameter: HUNT_COLUMN_DIAMETER_LOWER, height: HUNT_COLUMN_HEIGHT, taper: HUNT_COLUMN_DIAMETER_UPPER / HUNT_COLUMN_DIAMETER_LOWER, detail: 'medium' }).shaft;
    const axes = collectStep(step)
      .pieces.filter((p) => p.geometry === shaft)
      .map((p) => new Vector3().setFromMatrixPosition(p.matrix))
      .sort((a, b) => a.x - b.x);
    expect(axes).toHaveLength(HUNT_COLUMN_COUNT);
    const half = HUNT_PAIR_AXIS_SPACING / 2;
    const expected = [-HUNT_PAIR_CENTRE_X_OUTER, -HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_OUTER].flatMap((c) => [c - half, c + half]);
    axes.forEach((a, i) => {
      expect(a.x).toBeCloseTo(expected[i] ?? Number.NaN, 6);
      expect(a.z).toBeCloseTo(HUNT_COLUMN_AXIS_Z, 6);
    });
    // Equal bays and the photographed spacing (0.225 of a bay in S7).
    expect(HUNT_PAIR_CENTRE_X_OUTER / HUNT_PAIR_CENTRE_X_INNER).toBeCloseTo(3, 6);
    expect(HUNT_PAIR_AXIS_SPACING / (2 * HUNT_PAIR_CENTRE_X_INNER)).toBeCloseTo(0.2254, 2);
  });

  it(`stays within ${String(BUDGET.triangles)} triangles, ${String(BUDGET.meshes)} instanced meshes and ${String(BUDGET.lights)} step lights, with finite matrices`, () => {
    const timeline = new Timeline(huntSteps);
    const stats = timeline.stats();
    expect(stats.triangles).toBeLessThanOrEqual(BUDGET.triangles);
    expect(stats.meshes).toBeLessThanOrEqual(BUDGET.meshes);
    expect(stats.lights).toBeLessThanOrEqual(BUDGET.lights);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
  });
});
