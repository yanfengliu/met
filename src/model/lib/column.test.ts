/**
 * Columns, pilasters and their pieces: sound attributes, outward winding, bounds that match the parameters, cache identity and triangle budgets.
 * Every Corinthian capital, round and flat, at every detail, is read on a grid of its own of 240 lines a side (`inwardAlong`, ./facing.ts), red with
 * the acanthus leaves' quads split along one diagonal (at medium, 29 lines through the round capital and 40 through the flat).
 * Bound: checks geometry arrays only; whether a capital reads as Corinthian is judged on the gallery captures against photographs.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { attributeProblems, boxOf, boxProblems, centredProblems, invertedFraction, triangles } from './check.js';
import { atticBase, column, columnParts, pedestal, shaft } from './column.js';
import { inwardAlong } from './facing.js';
import { pilaster, pilasterParts } from './pilaster.js';

/** The Met's facade columns at street distance: the brief caps a Corinthian column with capital at about 12,000 triangles. */
const CORINTHIAN_BUDGET = 12_000;
/** Ionic and Doric capitals are simpler; a full column of either stays well under the Corinthian one. */
const IONIC_BUDGET = 9_000;
const DORIC_BUDGET = 5_000;
/** Low detail is for distant or many-times-repeated columns: about half the medium cost. */
const LOW_BUDGET = 6_000;
/** A pilaster shows one face of a capital; it should cost no more than a column. */
const PILASTER_BUDGET = 9_000;

describe('column', () => {
  it.each(['corinthian', 'ionic', 'doric'] as const)('%s: sound geometry, outward faces, standing on y = 0, centred, height as asked', (order) => {
    const D = 1.2;
    const geometry = column({ order, diameter: D });
    expect(attributeProblems(geometry, order)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    const box = boxOf(geometry);
    const height = { corinthian: 10, ionic: 9, doric: 8 }[order] * D;
    expect(boxProblems(box, { min: [undefined, 0, undefined], max: [undefined, height, undefined] }, 1e-3, order)).toEqual([]);
    expect(centredProblems(box, 0.01, order)).toEqual([]);
    // The plinth is 1.5 D square; Corinthian volutes and horns reach to about D along the diagonal, so nothing exceeds 0.8 D from the axis on X or Z.
    expect(box.max[0]).toBeLessThan(0.8 * D + 1e-6);
    expect(box.max[2]).toBeLessThan(0.8 * D + 1e-6);
  });

  it('keeps each order within its triangle budget at medium detail', () => {
    expect(triangles(column({ order: 'corinthian' }))).toBeLessThanOrEqual(CORINTHIAN_BUDGET);
    expect(triangles(column({ order: 'ionic' }))).toBeLessThanOrEqual(IONIC_BUDGET);
    expect(triangles(column({ order: 'doric' }))).toBeLessThanOrEqual(DORIC_BUDGET);
    expect(triangles(column({ order: 'corinthian', detail: 'low' }))).toBeLessThanOrEqual(LOW_BUDGET);
    expect(triangles(column({ order: 'corinthian', detail: 'high' }))).toBeGreaterThan(triangles(column({ order: 'corinthian' })));
  });

  it('returns the identical geometry for equal parameters, defaults omitted or given, and a new one otherwise', () => {
    expect(column({})).toBe(column({ order: 'corinthian', diameter: 1, detail: 'medium' }));
    expect(column({ diameter: 1.2 })).toBe(column({ diameter: 1.2 }));
    expect(column({ diameter: 1.2 })).not.toBe(column({ diameter: 1.3 }));
    expect(column({ fluted: false })).not.toBe(column({}));
    expect(columnParts({ diameter: 1.2 })).toBe(columnParts({ diameter: 1.2 }));
  });

  it('stands on a pedestal when asked, with every piece in the column frame', () => {
    const parts = columnParts({ diameter: 1, pedestal: true });
    expect(parts.pedestal).toBeDefined();
    const pedestalBox = boxOf(parts.pedestal ?? shaft());
    expect(pedestalBox.min[1]).toBeCloseTo(0, 6);
    expect(pedestalBox.max[1]).toBeCloseTo(10 / 3, 6);
    expect(boxOf(parts.base ?? shaft()).min[1]).toBeCloseTo(10 / 3, 6);
    expect(boxOf(parts.capital).max[1]).toBeCloseTo(10 / 3 + 10, 6);
    expect(boxOf(column({ pedestal: true })).max[1]).toBeCloseTo(10 / 3 + 10, 6);
  });

  it('names the parameter and the accepted range when a value is out of bounds', () => {
    expect(() => column({ diameter: -1 })).toThrow(/column: diameter is -1; it must be a finite number above 0/);
    expect(() => column({ flutes: 3 })).toThrow(/flutes is 3; it must be a whole number from 8 to 48/);
    expect(() => column({ height: 2 })).toThrow(/leaves less than two diameters of shaft/);
  });
});

describe('column pieces', () => {
  it('base: 0.5 D tall on a 1.5 D plinth, centred', () => {
    const geometry = atticBase({ diameter: 2 });
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-1.5, 0, -1.5], max: [1.5, 1, 1.5] })).toEqual([]);
  });

  it('shaft: as tall as asked, diminishing, fluted or plain', () => {
    for (const fluted of [true, false]) {
      const geometry = shaft({ diameter: 1, height: 8, fluted });
      expect(attributeProblems(geometry)).toEqual([]);
      expect(invertedFraction(geometry)).toBe(0);
      const box = boxOf(geometry);
      expect(boxProblems(box, { min: [undefined, 0, undefined], max: [undefined, 8, undefined] })).toEqual([]);
      expect(centredProblems(box, 0.01)).toEqual([]);
    }
  });

  it('pedestal: die plus mouldings, as tall as asked', () => {
    const geometry = pedestal({ width: 3.2, depth: 1.6, height: 3 });
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    const box = boxOf(geometry);
    expect(boxProblems(box, { min: [undefined, 0, undefined], max: [undefined, 3, undefined] })).toEqual([]);
    expect(centredProblems(box)).toEqual([]);
    expect(box.max[0]).toBeGreaterThan(1.6);
  });
});

describe('pilaster', () => {
  it('stands on the wall face z = 0, projects toward +Z, centred on x, height as asked', () => {
    const geometry = pilaster({ width: 1, projection: 0.2 });
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    const box = boxOf(geometry);
    expect(boxProblems(box, { min: [undefined, 0, 0], max: [undefined, 10, undefined] }, 1e-3)).toEqual([]);
    expect(centredProblems(box, 0.01, 'pilaster', ['x'])).toEqual([]);
    expect(triangles(geometry)).toBeLessThanOrEqual(PILASTER_BUDGET);
  });

  it('splits into base, shaft and capital in one frame and caches them', () => {
    const parts = pilasterParts({ width: 1 });
    for (const piece of [parts.base, parts.shaft, parts.capital]) {
      if (piece === undefined) continue;
      expect(attributeProblems(piece)).toEqual([]);
      expect(invertedFraction(piece)).toBe(0);
    }
    expect(pilasterParts({ width: 1 })).toBe(parts);
    expect(pilaster({ width: 1, order: 'ionic' })).not.toBe(pilaster({ width: 1 }));
  });
});

describe('Corinthian capitals', () => {
  // The acanthus tips curl down past level, and split along one diagonal a tip's edge folded through itself: at medium detail, 29 lines here through the round capital and 40 through the flat one.
  it.each(['low', 'medium', 'high'] as const)('fold nowhere at %s detail, round and flat: no line along vertical crosses a pocket wound inside out', (detail) => {
    for (const capital of [columnParts({ order: 'corinthian', detail }).capital, pilasterParts({ order: 'corinthian', width: 1, detail }).capital]) {
      expect(inwardAlong(capital, new Vector3(0, 1, 0), 240)).toEqual({ lines: 0, worst: 0, at: null });
    }
  });
});
