/**
 * Landscape parts: tree, hedge and fountain, plus the seeded helpers under them (organic.ts).
 * Bound: geometry is checked through its attribute arrays (finite, unit normals, winding agrees with normals, bounds, cache identity, triangle budgets); how the parts look is the gallery's job.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { attributeProblems, boxOf, boxProblems, centredProblems, invertedFraction, totalTriangles, triangles, unionBox } from './check.js';
import { FOUNTAIN_FLOOR, fountain, hedge, tree, type Fountain, type Tree } from './landscape.js';
import { seededRandom, valueNoise } from './organic.js';

/** About fifty street trees line the frontage (docs/research/exterior.md P8), so a medium tree stays at or under 1,500 triangles. */
const TREE_MEDIUM_BUDGET = 1500;
/** A 3 m run of hedge at medium detail; hedges repeat round the plaza groves, so a few hundred triangles per run. */
const HEDGE_MEDIUM_BUDGET = 600;
/** The default 30 × 9 m basin with 24 jets: the stone is a handful of swept edges, each jet a 6-sided column of 36 triangles. */
const FOUNTAIN_MEDIUM_BUDGET = 1200;

function geometryProblems(record: Readonly<Record<string, THREE.BufferGeometry | undefined>>, name: string): string[] {
  return Object.entries(record).flatMap(([role, geometry]) => {
    if (geometry === undefined) return [];
    const problems = attributeProblems(geometry, `${name}.${role}`);
    const inverted = invertedFraction(geometry);
    if (inverted !== 0) problems.push(`${name}.${role} has ${String(inverted)} of its triangles facing against their normals`);
    return problems;
  });
}

/** The mean x and z (rounded to a millimetre) of the vertices on the ground: where the trunk stands. The limbs make the trunk's box lopsided, so its box centre says nothing. */
function footCentre(geometry: THREE.BufferGeometry): [number, number] {
  const position = geometry.getAttribute('position');
  let x = 0;
  let z = 0;
  let count = 0;
  for (let k = 0; k < position.count; k++) {
    if (Math.abs(position.getY(k)) > 1e-6) continue;
    x += position.getX(k);
    z += position.getZ(k);
    count++;
  }
  const round = (value: number): number => Math.round((value / Math.max(count, 1)) * 1000) / 1000 + 0;
  return [round(x), round(z)];
}

function asRecord(part: Tree | Fountain): Readonly<Record<string, THREE.BufferGeometry | undefined>> {
  return { ...part };
}

describe('seeded helpers', () => {
  it('repeat for the same seed and differ between seeds', () => {
    const a = seededRandom(3);
    const b = seededRandom(3);
    const c = seededRandom(4);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const value of first) expect(value >= 0 && value < 1).toBe(true);
  });

  it('noise is continuous and in [−1, 1]', () => {
    let largest = 0;
    for (let k = 0; k < 200; k++) {
      const x = k * 0.037;
      const v = valueNoise(x, 0.3, 0.7, 5);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      largest = Math.max(largest, Math.abs(valueNoise(x + 1e-4, 0.3, 0.7, 5) - v));
    }
    expect(largest).toBeLessThan(1e-2);
  });
});

describe('tree', () => {
  it('is well formed for several seeds and every detail level', () => {
    for (const seed of [0, 1, 2, 3, 17]) {
      for (const detail of ['low', 'medium', 'high'] as const) {
        expect(geometryProblems(asRecord(tree({ seed, detail })), `tree(${String(seed)}, ${detail})`)).toEqual([]);
      }
    }
  });

  it('fills exactly its height and spread, centred on the trunk foot', () => {
    for (const seed of [0, 1, 2]) {
      const part = tree({ height: 14, spread: 11, seed });
      const box = unionBox([part.trunk, part.foliage]);
      // The crown is fitted to its box after the noise, so the bounds are exact, not approximate.
      expect(boxProblems(box, { min: [-5.5, 0, -5.5], max: [5.5, 14, 5.5] }, 1e-3, `tree(${String(seed)})`)).toEqual([]);
      expect(boxOf(part.trunk).min[1]).toBeCloseTo(0, 6);
      expect(footCentre(part.trunk)).toEqual([0, 0]);
    }
  });

  it('defaults the spread to 0.75 × height and caches equal parameters', () => {
    expect(tree()).toBe(tree({ height: 12, spread: 9, seed: 0, detail: 'medium' }));
    expect(tree({ seed: 1 })).not.toBe(tree({ seed: 0 }));
    expect(tree({ height: 10 })).not.toBe(tree());
    const a = tree({ seed: 0 }).foliage.getAttribute('position').array;
    const b = tree({ seed: 1 }).foliage.getAttribute('position').array;
    expect(a.length === b.length && a.every((value, k) => value === b[k])).toBe(false);
    expect(Object.isFrozen(tree())).toBe(true);
  });

  it('stays within its triangle budget at medium detail', () => {
    for (let seed = 0; seed < 12; seed++) expect(totalTriangles(tree({ seed }))).toBeLessThanOrEqual(TREE_MEDIUM_BUDGET);
    expect(totalTriangles(tree({ detail: 'low' }))).toBeLessThan(totalTriangles(tree()));
  });

  it('names a bad parameter', () => {
    expect(() => tree({ height: -1 })).toThrow(/tree: height is -1/);
    expect(() => tree({ seed: 1.5 })).toThrow(/tree: seed is 1\.5; it must be a whole number from 0/);
    expect(() => tree({ height: 10, spread: 30 })).toThrow(/tree: spread is 30; it must be from 2 to 20/);
  });
});

describe('hedge', () => {
  it('is well formed at every detail level', () => {
    for (const detail of ['low', 'medium', 'high'] as const) {
      const geometry = hedge({ length: 4.2, height: 1.1, width: 0.6, seed: 3, detail });
      expect(attributeProblems(geometry, `hedge ${detail}`)).toEqual([]);
      expect(invertedFraction(geometry)).toBe(0);
    }
  });

  it('fills exactly its box with the base on the ground', () => {
    const geometry = hedge({ length: 4.2, height: 1.1, width: 0.6 });
    expect(boxProblems(boxOf(geometry), { min: [-2.1, 0, -0.3], max: [2.1, 1.1, 0.3] })).toEqual([]);
    expect(centredProblems(boxOf(geometry))).toEqual([]);
  });

  it('caches equal parameters and keeps different ones apart', () => {
    expect(hedge()).toBe(hedge({ length: 3, height: 0.9, width: 0.7, seed: 0, detail: 'medium' }));
    expect(hedge({ seed: 1 })).not.toBe(hedge());
    expect(hedge({ length: 5 })).not.toBe(hedge());
  });

  it('stays within its triangle budget', () => {
    expect(triangles(hedge())).toBeLessThanOrEqual(HEDGE_MEDIUM_BUDGET);
  });

  it('names a bad parameter', () => {
    expect(() => hedge({ width: 0 })).toThrow(/hedge: width is 0/);
  });
});

describe('fountain', () => {
  it('is well formed with and without jets', () => {
    expect(geometryProblems(asRecord(fountain()), 'fountain')).toEqual([]);
    expect(geometryProblems(asRecord(fountain({ length: 13.8, width: 13.8, jets: { cols: 7, rows: 7, ring: true }, detail: 'high' })), 'plaza fountain')).toEqual([]);
    expect(geometryProblems(asRecord(fountain({ jets: false, detail: 'low' })), 'fountain without jets')).toEqual([]);
  });

  it('puts the stone, water and jets where the parameters say', () => {
    const part = fountain();
    expect(boxProblems(boxOf(part.stone), { min: [-15, 0, -4.5], max: [15, 0.5, 4.5] }, 1e-4, 'stone')).toEqual([]);
    const water = boxOf(part.water);
    expect(water.min[1]).toBeCloseTo(0.35, 6);
    expect(water.max[1]).toBeCloseTo(0.35, 6);
    // The water meets the inside of the coping: 0.45 m in from the outer edge on every side.
    expect(boxProblems(water, { min: [-14.55, undefined, -4.05], max: [14.55, undefined, 4.05] }, 1e-4, 'water')).toEqual([]);
    const jets = part.jets;
    expect(jets).toBeDefined();
    if (jets === undefined) return;
    const box = boxOf(jets);
    expect(box.max[1]).toBeCloseTo(0.35 + 2.5, 6);
    expect(box.min[1]).toBeGreaterThan(FOUNTAIN_FLOOR);
    expect(centredProblems(box, 1e-4, 'jets')).toEqual([]);
  });

  it('places one jet per grid cell, or only the outer ring', () => {
    const perJet = triangles(fountain({ jets: { cols: 1, rows: 1 } }).jets ?? new THREE.BufferGeometry());
    expect(perJet).toBeGreaterThan(0);
    expect(triangles(fountain().jets ?? new THREE.BufferGeometry())).toBe(24 * perJet);
    const ring = fountain({ length: 13.8, width: 13.8, jets: { cols: 7, rows: 7, ring: true } }).jets;
    expect(triangles(ring ?? new THREE.BufferGeometry())).toBe(24 * perJet);
  });

  it('leaves the jets out when they are false', () => {
    const part = fountain({ jets: false });
    expect(part.jets).toBeUndefined();
    expect(Object.keys(part).sort()).toEqual(['stone', 'water']);
  });

  it('caches equal parameters and keeps different ones apart', () => {
    expect(fountain()).toBe(fountain({ length: 30, width: 9, copingWidth: 0.45, copingHeight: 0.5, waterDepth: 0.15, jets: { cols: 12, rows: 2, height: 2.5, ring: false }, detail: 'medium' }));
    expect(fountain({ jets: false })).not.toBe(fountain());
    expect(fountain({ waterDepth: 0.2 })).not.toBe(fountain());
    expect(Object.isFrozen(fountain())).toBe(true);
  });

  it('stays within its triangle budget', () => {
    expect(totalTriangles(fountain())).toBeLessThanOrEqual(FOUNTAIN_MEDIUM_BUDGET);
  });

  it('names a bad parameter', () => {
    expect(() => fountain({ copingWidth: 5 })).toThrow(/fountain: copingWidth is 5 for a 30 × 9 m basin/);
    expect(() => fountain({ waterDepth: 0.6 })).toThrow(/fountain: waterDepth is 0\.6; it must be from 0\.02 to 0\.43/);
    expect(() => fountain({ jets: { cols: 0, rows: 2 } })).toThrow(/fountain: jets\.cols is 0/);
  });
});
