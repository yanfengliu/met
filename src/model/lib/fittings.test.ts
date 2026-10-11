/**
 * Fittings (urn, lamp post, bench) and the Egyptian elements of the Temple of Dendur (cavetto cornice, pylon, papyriform column).
 * Bound: geometry arrays only (finite, unit normals, winding that agrees with normals and with rays from outside, bounds stated in each header, cache identity, budgets); the look is judged on gallery captures.
 */
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { attributeProblems, backfaceFraction, boxOf, boxProblems, centredProblems, invertedFraction, roleGeometries, totalTriangles, unionBox } from './check.js';
import { cavettoCorniceProfile, papyriformColumn, pylon } from './egyptian.js';
import { bench, lampPost, urn } from './fittings.js';
import { signedArea } from './profile.js';
import { sweep } from './sweep.js';

/** Urns line the steps and the roof garden by the dozen: a few thousand triangles with flowers. */
const URN_BUDGET = 2_500;
/** Lamp posts repeat along the plaza: well under a thousand triangles each. */
const LAMP_BUDGET = 1_500;
const BENCH_BUDGET = 1_200;
/** The Temple of Dendur has a pylon gate and two columns; they are seen close up inside the Sackler Wing. */
const PYLON_BUDGET = 2_500;
const PAPYRUS_BUDGET = 4_000;

function sound(part: object, name: string): void {
  for (const [role, geometry] of roleGeometries(part)) {
    expect(attributeProblems(geometry, `${name}.${role}`)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
  }
}

function outward(geometry: THREE.BufferGeometry, notFromBelow = false): void {
  expect(backfaceFraction(geometry, 300, 7, { notFromBelow })).toBe(0);
}

describe('urn', () => {
  it('stands on y = 0, rim at the height, flowers above, closed', () => {
    const part = urn({ height: 1.2 });
    sound(part, 'urn');
    outward(part.urn, true);
    expect(boxProblems(boxOf(part.urn), { min: [-0.3, 0, -0.3], max: [0.3, 1.2, 0.3] }, 1e-3)).toEqual([]);
    expect(part.flowers).toBeDefined();
    expect(boxOf(part.flowers ?? part.urn).max[1]).toBeCloseTo(1.2 * 1.15, 2);
    expect(totalTriangles(part)).toBeLessThanOrEqual(URN_BUDGET);
    expect(urn({ flowers: false }).flowers).toBeUndefined();
    expect(urn({})).toBe(urn({ height: 1.2, flowers: true, detail: 'medium' }));
  });
});

describe('lamp post', () => {
  it.each([0, 1, 2])('with %i arms: post and lamp sound, as tall as asked', (arms) => {
    const part = lampPost({ height: 4, arms });
    sound(part, `lamp${String(arms)}`);
    outward(part.post, true);
    const box = unionBox([part.post, part.lamp]);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.max[1]).toBeCloseTo(4, 2);
    if (arms !== 1) expect(centredProblems(box, 0.01)).toEqual([]);
    expect(totalTriangles(part)).toBeLessThanOrEqual(LAMP_BUDGET);
  });

  it('names a bad arm count', () => {
    expect(() => lampPost({ arms: 3 })).toThrow(/lampPost: arms is 3; it must be a whole number from 0 to 2/);
  });
});

describe('bench', () => {
  it('is length long, 0.86 m tall, 0.66 m deep, centred, closed', () => {
    const part = bench({ length: 2 });
    sound(part, 'bench');
    outward(part.frame, true);
    outward(part.seat);
    const box = unionBox([part.frame, part.seat]);
    expect(boxProblems(box, { min: [-1, 0, -0.33], max: [1, 0.86, 0.33] }, 0.005)).toEqual([]);
    expect(totalTriangles(part)).toBeLessThanOrEqual(BENCH_BUDGET);
    expect(bench({ length: 3 })).not.toBe(part);
  });
});

describe('Egyptian elements', () => {
  it('cavetto cornice profile is closed, counter-clockwise and sweeps to an outward-facing cornice', () => {
    const profile = cavettoCorniceProfile({ height: 0.8, projection: 0.6 });
    expect(profile.closed).toBe(true);
    expect(signedArea(profile.points)).toBeGreaterThan(0);
    const geometry = sweep(profile, [
      [-3, 0, 0],
      [3, 0, 0],
    ]);
    sound(geometry, 'cavetto');
    outward(geometry);
    expect(boxProblems(boxOf(geometry), { min: [-3, 0, 0], max: [3, 0.8, 0.6] }, 1e-3)).toEqual([]);
  });

  it('pylon: battered faces, footprint as asked, as tall as asked, with or without a door', () => {
    for (const door of [false as const, { width: 2, height: 4 }]) {
      const geometry = pylon({ width: 8, height: 9, depth: 3, door });
      sound(geometry, 'pylon');
      outward(geometry, true);
      const box = boxOf(geometry);
      expect(box.min[1]).toBeCloseTo(0, 6);
      expect(box.max[1]).toBeCloseTo(9, 3);
      expect(centredProblems(box, 0.01)).toEqual([]);
      expect(box.max[0]).toBeGreaterThanOrEqual(4 - 1e-3);
      expect(roleGeometries(geometry).length).toBe(1);
      expect(totalTriangles(geometry)).toBeLessThanOrEqual(PYLON_BUDGET);
    }
    expect(() => pylon({ width: 8, height: 9, depth: 3, batter: 30 })).toThrow(/batter is 30; it must be from 0 to 15/);
  });

  it.each(['bud', 'bell'] as const)('papyriform column with a %s capital: base on y = 0, height as asked, centred', (capital) => {
    const geometry = papyriformColumn({ height: 6, diameter: 0.9, capital });
    sound(geometry, capital);
    outward(geometry, true);
    const box = boxOf(geometry);
    const half = (capital === 'bud' ? 0.65 : 0.85) * 0.9;
    expect(boxProblems(box, { min: [-half, 0, -half], max: [half, 6, half] }, 0.01)).toEqual([]);
    expect(totalTriangles(geometry)).toBeLessThanOrEqual(PAPYRUS_BUDGET);
    expect(papyriformColumn({ height: 6, diameter: 0.9, capital })).toBe(geometry);
  });
});
