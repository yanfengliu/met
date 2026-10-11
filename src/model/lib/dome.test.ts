/**
 * Domes, drums, pendentives and barrel vaults.
 * Bound: geometry arrays only; whether a saucer dome reads like the Great Hall's is judged on captures.
 */
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { attributeProblems, backfaceFraction, boxOf, boxProblems, centredProblems, invertedFraction, triangles } from './check.js';
import { barrelVault, dome, drum, pendentives } from './dome.js';

/** A 14 m saucer dome at medium detail: smooth enough at interior distances without dominating a step's budget. */
const DOME_BUDGET = 6_000;
const VAULT_BUDGET = 2_500;

function sound(geometry: THREE.BufferGeometry, name: string): void {
  expect(attributeProblems(geometry, name)).toEqual([]);
  expect(invertedFraction(geometry)).toBe(0);
}

describe('dome', () => {
  it('hemisphere: springs from y = 0, crown at radius + thickness, closed from every side', () => {
    const geometry = dome({ radius: 6, thickness: 0.4 });
    sound(geometry, 'dome');
    expect(backfaceFraction(geometry, 400)).toBe(0);
    const box = boxOf(geometry);
    expect(boxProblems(box, { min: [undefined, 0, undefined], max: [undefined, 6.4, undefined] }, 1e-3)).toEqual([]);
    expect(centredProblems(box, 0.01)).toEqual([]);
  });

  it('saucer with oculus and ribs, inside or out, stays sound and within budget', () => {
    for (const ribsInside of [false, true]) {
      const geometry = dome({ radius: 7, rise: 2.4, oculus: 1.4, ribs: { count: 12 }, ribsInside });
      sound(geometry, 'saucer');
      expect(backfaceFraction(geometry, 400)).toBe(0);
      expect(boxOf(geometry).min[1]).toBeCloseTo(0, 3);
      expect(triangles(geometry)).toBeLessThanOrEqual(DOME_BUDGET);
    }
  });

  it('drum: as tall as asked, outer radius at least radius + thickness', () => {
    const geometry = drum({ radius: 6, height: 3, thickness: 0.6 });
    sound(geometry, 'drum');
    expect(backfaceFraction(geometry, 300)).toBe(0);
    const box = boxOf(geometry);
    expect(box.max[1]).toBeCloseTo(3, 6);
    expect(box.max[0]).toBeGreaterThanOrEqual(6.6 - 0.02);
  });

  it('caches and validates', () => {
    expect(dome({ radius: 6 })).toBe(dome({ radius: 6, rise: 6, oculus: 0 }));
    expect(dome({ radius: 6 })).not.toBe(dome({ radius: 6, rise: 3 }));
    expect(() => dome({ radius: 4, rise: 5 })).toThrow(/rise 5 is more than the radius 4/);
  });
});

describe('pendentives', () => {
  it('rise from the bay corners at y = 0 to the dome ring at y = span / 2, inside the bay', () => {
    const geometry = pendentives({ span: 14 });
    sound(geometry, 'pendentives');
    // Rays that graze the arch edges meet facets of the sphere from behind; elsewhere every hit is a front face.
    expect(backfaceFraction(geometry, 400, 7, { notFromBelow: true })).toBeLessThan(0.12);
    expect(boxProblems(boxOf(geometry), { min: [-7, 0, -7], max: [7, 7, 7] }, 1e-3)).toEqual([]);
    expect(pendentives({ span: 14 })).toBe(geometry);
  });
});

describe('barrel vault', () => {
  it('plain and coffered: springing at y = 0, along Z, closed from every side', () => {
    for (const coffers of [false as const, { across: 9, along: 8 }]) {
      const geometry = barrelVault({ span: 8, length: 12, thickness: 0.4, coffers });
      sound(geometry, 'vault');
      expect(backfaceFraction(geometry, 400)).toBe(0);
      expect(boxProblems(boxOf(geometry), { min: [-4.4, 0, -6], max: [4.4, 4.4, 6] }, 0.05)).toEqual([]);
      expect(triangles(geometry)).toBeLessThanOrEqual(VAULT_BUDGET);
    }
    expect(() => barrelVault({ span: 4, length: 3, rise: 3 })).toThrow(/more than half the span/);
  });
});
