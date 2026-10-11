/**
 * Headless checks of the Roche north area (src/model/roche-north/): its step ids, titles and chapters, every piece inside the area's blocks, its budget and finite matrices.
 * Blocks: `sackler` and `american-wing` of docs/research/exterior.md section 2, as unions of axis-aligned rectangles (the american-wing polygon's one slanted edge,
 * X 140.6 → 140.5, is taken at 140.55), each widened by the 0.3 m a piece's world box may overstep (the coordinator's rule).
 * Budget (the coordinator's brief): at most 450,000 triangles counting instances, 150 instanced meshes and 2 step lights at the finished state.
 * Bound: geometry is built in Node without WebGL; the boxes are world bounding boxes of each piece's geometry under its matrix, so a sheared or rotated piece is
 * judged by its box, which can only overstate how far it reaches.
 */
import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { americanWing1924Steps, rocheNorthSteps } from './index.js';

const TOLERANCE = 0.3;
const MAX_TRIANGLES = 450_000;
const MAX_MESHES = 150;
const MAX_LIGHTS = 2;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Rect = readonly [number, number, number, number];
/** The area in plan (x0, x1, z0, z1). */
const BLOCKS: readonly Rect[] = [
  [118.0, 153.1, -103.0, -41.3],
  [49.4, 118.0, -138.3, -96.0],
  [87.6, 140.55, -161.0, -103.0],
];
const AREA: readonly Rect[] = BLOCKS.map(([x0, x1, z0, z1]) => [x0 - TOLERANCE, x1 + TOLERANCE, z0 - TOLERANCE, z1 + TOLERANCE] as const);

/** What is left of `r` outside `cut`, as up to four rectangles. */
function subtract(r: Rect, cut: Rect): Rect[] {
  const [x0, x1, z0, z1] = r;
  const [a0, a1, b0, b1] = cut;
  if (a1 <= x0 || a0 >= x1 || b1 <= z0 || b0 >= z1) return [r];
  const out: Rect[] = [];
  if (a0 > x0) out.push([x0, a0, z0, z1]);
  if (a1 < x1) out.push([a1, x1, z0, z1]);
  const m0 = Math.max(x0, a0);
  const m1 = Math.min(x1, a1);
  if (b0 > z0) out.push([m0, m1, z0, b0]);
  if (b1 < z1) out.push([m0, m1, b1, z1]);
  return out;
}

function outsideArea(box: Box3): number {
  let rest: Rect[] = [[box.min.x, box.max.x, box.min.z, box.max.z]];
  for (const cut of AREA) rest = rest.flatMap((r) => subtract(r, cut));
  return rest.reduce((sum, [x0, x1, z0, z1]) => sum + Math.max(0, x1 - x0) * Math.max(0, z1 - z0), 0);
}

const ALL: readonly StepDef[] = [...americanWing1924Steps, ...rocheNorthSteps];

describe('roche-north steps', () => {
  it('names each step once, in kebab-case, with a title of at most 48 characters and a detail of at most 200', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
  });

  it('puts the 1924 core in the McKim, Mead & White chapter and the rest in roche-north-1980', () => {
    expect(americanWing1924Steps.filter((s) => s.chapter !== 'mckim-mead-white-1926').map((s) => s.id)).toEqual([]);
    expect(rocheNorthSteps.filter((s) => s.chapter !== 'roche-north-1980').map((s) => s.id)).toEqual([]);
  });

  it('builds the Sackler Wing before the American Wing, foundations first and glass last in each', () => {
    const ids = rocheNorthSteps.map((s) => s.id);
    const lastSackler = Math.max(...ids.map((id, i) => (id.startsWith('sackler') || id.startsWith('dendur') ? i : -1)));
    const firstAmerican = ids.findIndex((id) => id.startsWith('american') || id.startsWith('engelhard'));
    expect(ids[0]).toBe('sackler-foundations');
    expect(firstAmerican).toBeGreaterThan(lastSackler);
  });

  it('keeps every piece inside the sackler and american-wing blocks (0.3 m tolerance)', () => {
    const problems: string[] = [];
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, i) => {
        const geometry = piece.geometry;
        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        const box = (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        const area = outsideArea(box);
        if (area > 1e-6) problems.push(`${step.id} piece ${String(i)}: ${area.toFixed(3)} m² outside, box x ${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)} z ${box.min.z.toFixed(2)}..${box.max.z.toFixed(2)}`);
      });
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it(`stays within ${String(MAX_TRIANGLES)} triangles, ${String(MAX_MESHES)} instanced meshes and ${String(MAX_LIGHTS)} step lights, with finite matrices`, () => {
    const timeline = new Timeline(ALL);
    const stats = timeline.stats();
    expect(stats.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
    expect(stats.meshes).toBeLessThanOrEqual(MAX_MESHES);
    expect(stats.lights).toBeLessThanOrEqual(MAX_LIGHTS);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
    for (const step of timeline.steps) {
      const { min, max } = step.bounds;
      expect([min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite), step.def.id).toBe(true);
    }
  });
});
