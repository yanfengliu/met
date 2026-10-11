/**
 * Headless checks of the site area's steps (src/model/site/): ids, titles and years; nothing of the site inside the building's footprint except the
 * pad under it; the plaza's counts against frame.ts and exterior.md [P6]..[P8]; the area's budget; finite geometry.
 * Bound: built in Node through collectStep and Timeline, so it proves counts, extents and matrices, not how anything looks (the shots do that).
 */
import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import type { CollectedStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { ALLEE_TREES_PER_ROW, FOOTPRINT_AREA_M2, LANDING_Y, STEP_RISER, STEP_TREAD, STEPS_BOTTOM_Z, STEPS_HALF_WIDTH, STEPS_TOP_Z } from '../frame.js';
import { insideFootprint } from './footprint.js';
import { PAD_Y, groundGeometry } from './grid.js';
import { frontSteps1970, plaza2014Steps, siteSteps } from './index.js';
import { siteMaterials } from './materials.js';
import { stepRows } from './steps.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALL: readonly StepDef[] = [...siteSteps, ...frontSteps1970, ...plaza2014Steps];
const collected = new Map<string, CollectedStep>(ALL.map((s) => [s.id, collectStep(s)]));
const pieces = (id: string): CollectedStep['pieces'] => collected.get(id)?.pieces ?? [];

/** The site area's budget (the coordinator's assignment, 2026-10-11). */
const MAX_TRIANGLES = 400_000;
const MAX_MESHES = 120;

function triangles(geometry: BufferGeometry): number {
  return (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
}

describe('site steps', () => {
  it('have unique kebab-case ids, titles of at most 48 characters, details of at most 200, and their chapters and years', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
    expect(siteSteps.map((s) => s.chapter)).toEqual(siteSteps.map(() => 'site'));
    expect(frontSteps1970.map((s) => [s.chapter, s.year])).toEqual(frontSteps1970.map(() => ['roche-steps-lehman-1975', '1970']));
    expect(plaza2014Steps.map((s) => [s.chapter, s.year])).toEqual(plaza2014Steps.map(() => ['koch-plaza-2014', '2014']));
    expect(ids).toEqual([
      'site-terrain',
      'site-pad',
      'site-rock',
      'site-transverse-cuts',
      'site-fifth-avenue',
      'site-sidewalks',
      'site-east-sidewalk',
      'site-park-paths',
      'site-park-lamps',
      'site-trees-park',
      'steps-landing',
      'steps-flight',
      'steps-railings',
      'plaza-paving',
      'plaza-fountains',
      'plaza-fountain-water',
      'plaza-groves',
      'plaza-furniture',
      'plaza-grove-trees',
      'plaza-allees',
    ]);
  });

  it('builds every piece with finite positions and adds no lights', () => {
    for (const [id, step] of collected) {
      expect(step.lights, id).toEqual([]);
      for (const piece of step.pieces) {
        const position = piece.geometry.getAttribute('position');
        expect(Array.from(position.array as ArrayLike<number>).every(Number.isFinite), id).toBe(true);
      }
    }
  });

  it('puts nothing inside the footprint but the pad under it', () => {
    // A triangle intrudes when its centre lies at least 2 cm inside a block (faces on the outline itself are allowed).
    const deep = (x: number, z: number): boolean => [-0.02, 0.02].every((dx) => [-0.02, 0.02].every((dz) => insideFootprint(x + dx, z + dz)));
    const offenders: string[] = [];
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (const [id, step] of collected) {
      for (const piece of step.pieces) {
        if (piece.material === siteMaterials.pad) continue;
        const position = piece.geometry.getAttribute('position');
        const index = piece.geometry.index;
        const count = index === null ? position.count : index.count;
        for (let t = 0; t + 2 < count; t += 3) {
          const ia = index === null ? t : index.getX(t);
          const ib = index === null ? t + 1 : index.getX(t + 1);
          const ic = index === null ? t + 2 : index.getX(t + 2);
          a.fromBufferAttribute(position, ia).applyMatrix4(piece.matrix);
          b.fromBufferAttribute(position, ib).applyMatrix4(piece.matrix);
          c.fromBufferAttribute(position, ic).applyMatrix4(piece.matrix);
          const x = (a.x + b.x + c.x) / 3;
          const z = (a.z + b.z + c.z) / 3;
          if (deep(x, z)) offenders.push(`${id} at (${x.toFixed(2)}, ${z.toFixed(2)})`);
        }
      }
    }
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it('cuts the ground exactly on the footprint, with the pad covering its whole area below the ground floor', () => {
    const g = groundGeometry();
    const pad = g.pad.getAttribute('position');
    let area = 0;
    const index = g.pad.index;
    const count = index?.count ?? pad.count;
    const p0 = new Vector3();
    const p1 = new Vector3();
    const p2 = new Vector3();
    for (let t = 0; t + 2 < count; t += 3) {
      p0.fromBufferAttribute(pad, index?.getX(t) ?? t);
      p1.fromBufferAttribute(pad, index?.getX(t + 1) ?? t + 1);
      p2.fromBufferAttribute(pad, index?.getX(t + 2) ?? t + 2);
      area += Math.abs((p1.x - p0.x) * (p2.z - p0.z) - (p2.x - p0.x) * (p1.z - p0.z)) / 2;
    }
    // The blocks tile the OSM outline's 46,470 m² (exterior.md [B00]); the table's 0.1 m rounding leaves a few square metres either way.
    expect(Math.abs(area - FOOTPRINT_AREA_M2)).toBeLessThan(25);
    const box = new Box3().setFromBufferAttribute(pad as never);
    expect(box.max.y).toBeCloseTo(PAD_Y, 6);
    expect(box.min.y).toBeCloseTo(PAD_Y, 6);
  });
});

describe('front steps', () => {
  it('rise from the sidewalk to the landing in 22 risers between Z +3.5 and the foot, three-way and 47 m wide', () => {
    const rows = stepRows();
    expect(rows).toHaveLength(21);
    const last = rows[rows.length - 1];
    expect(last?.z).toBeCloseTo(STEPS_BOTTOM_Z, 6);
    expect(last?.x).toBeCloseTo(STEPS_HALF_WIDTH, 6);
    expect(rows[0]?.zIn).toBeCloseTo(STEPS_TOP_Z, 6);
    const risers = rows.map((r, i) => (i === 0 ? LANDING_Y : rows[i - 1]?.y ?? 0) - r.y);
    expect(Math.max(...risers) - Math.min(...risers)).toBeLessThan(1e-9);
    // frame.ts states the riser and the tread this flight is built with.
    expect(Math.abs((risers[0] ?? 0) - STEP_RISER)).toBeLessThan(0.001);
    const treads = rows.map((r) => r.z - r.zIn).filter((d) => d < 1);
    expect(treads).toHaveLength(19);
    expect(Math.abs((treads[0] ?? 0) - STEP_TREAD)).toBeLessThan(0.005);
    const box = new Box3();
    for (const piece of pieces('steps-flight')) {
      piece.geometry.computeBoundingBox();
      box.union((piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix));
    }
    // The bottom tread's 3 cm nosing passes the foot of its riser.
    expect(box.min.z).toBeCloseTo(3.5, 6);
    expect(box.max.z - STEPS_BOTTOM_Z).toBeGreaterThanOrEqual(0);
    expect(box.max.z - STEPS_BOTTOM_Z).toBeLessThan(0.05);
    expect(box.max.x - STEPS_HALF_WIDTH).toBeGreaterThanOrEqual(0);
    expect(box.max.x - STEPS_HALF_WIDTH).toBeLessThan(0.05);
  });
});

describe('plaza', () => {
  it('has two fountains with 48 jets each, four groves of 13 trees, 52 allée trees and 106 trees in all', () => {
    expect(pieces('plaza-fountains').filter((p) => p.material === siteMaterials.darkGranite)).toHaveLength(4);
    expect(pieces('plaza-fountain-water').filter((p) => p.material === siteMaterials.jet)).toHaveLength(2);
    expect(pieces('plaza-groves').filter((p) => p.material === siteMaterials.gravel)).toHaveLength(4);
    const crowns = (id: string): number => pieces(id).filter((p) => p.material.name.toLowerCase().includes('foliage')).length;
    expect(crowns('plaza-allees')).toBe(4 * ALLEE_TREES_PER_ROW);
    expect(crowns('plaza-grove-trees')).toBe(4 * 13 + 2);
    // exterior.md [P8]: the plaza has 106 trees in all.
    expect(crowns('plaza-allees') + crowns('plaza-grove-trees')).toBe(106);
  });
});

describe('site budget', () => {
  it(`stays within ${String(MAX_TRIANGLES)} triangles, ${String(MAX_MESHES)} instanced meshes and no step lights`, () => {
    const stats = new Timeline(ALL).stats();
    expect(stats.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
    expect(stats.meshes).toBeLessThanOrEqual(MAX_MESHES);
    expect(stats.lights).toBe(0);
    let total = 0;
    for (const step of collected.values()) for (const piece of step.pieces) total += triangles(piece.geometry);
    expect(total).toBe(stats.triangles);
  });
});
