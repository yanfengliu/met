/**
 * The floor view's state (src/viewer/floor-mode.ts) over a real SectionCut and a recording landscape filter: a floor sets its cut and keeps the user's
 * own; another floor keeps that own cut; All gives it back on or off at its height; a cut set by hand ends the floor view for good; the filter follows.
 * Bound: state only, no WebGL; the page's wiring of the picker, the slider and walk mode is driven in tests/e2e/floors.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { FloorMode } from './floor-mode.js';
import type { LandscapeFilter } from './floor-mode.js';
import { FLOORS, floorById } from './floors.js';
import type { Floor } from './floors.js';
import { SectionCut } from './section-cut.js';

function floor(id: string): Floor {
  const found = floorById(id);
  if (found === undefined) throw new Error(`No floor ${id} in src/viewer/floors.ts.`);
  return found;
}

/** A filter that records each height it is given and counts one hidden mesh per metre under 30 m above it, so tests can see what it was told. */
function recorder(): LandscapeFilter & { readonly heights: (number | null)[] } {
  const heights: (number | null)[] = [];
  let last: number | null = null;
  return {
    heights,
    apply(height) {
      heights.push(height);
      const changed = height !== last;
      last = height;
      return changed;
    },
    get hidden() {
      return last === null ? 0 : Math.max(0, Math.floor(30 - last));
    },
  };
}

const setting = (cut: SectionCut): { enabled: boolean; height: number } => ({ enabled: cut.enabled, height: cut.height });

describe('FloorMode', () => {
  it('sets a floor\'s cut, keeps the user\'s own through other floors, and gives it back with All, on at its height', () => {
    const cut = new SectionCut();
    cut.set(true, 5.5);
    const filter = recorder();
    const mode = new FloorMode(cut, () => filter);
    expect(mode.id).toBe('all');
    expect(mode.show(floor('main'))).toBe(true);
    expect(setting(cut)).toEqual({ enabled: true, height: floor('main').cut });
    expect(mode.ownCut).toEqual({ enabled: true, height: 5.5 });
    expect(mode.show(floor('main'))).toBe(false);
    for (const f of FLOORS) {
      mode.show(f);
      expect(mode.id).toBe(f.id);
      expect(setting(cut), f.id).toEqual({ enabled: true, height: f.cut });
      expect(mode.ownCut, `own cut kept at ${f.id}`).toEqual({ enabled: true, height: 5.5 });
    }
    expect(mode.hidden).toBeGreaterThan(0);
    expect(mode.show(null)).toBe(true);
    expect(setting(cut)).toEqual({ enabled: true, height: 5.5 });
    expect(mode.ownCut).toBeNull();
    expect(mode.id).toBe('all');
    expect(mode.hidden).toBe(0);
    expect(filter.heights).toEqual([floor('main').cut, ...FLOORS.map((f) => f.cut), null]);
  });

  it('gives back a cut that was off, with its height', () => {
    const cut = new SectionCut();
    cut.set(false, 9.5);
    const mode = new FloorMode(cut, recorder);
    mode.show(floor('ground'));
    expect(cut.enabled).toBe(true);
    mode.show(null);
    expect(setting(cut)).toEqual({ enabled: false, height: 9.5 });
  });

  it('ends the floor view for a cut set by hand, which then stands: a later All gives nothing back', () => {
    const cut = new SectionCut();
    cut.set(false, 9.5);
    const filter = recorder();
    const mode = new FloorMode(cut, () => filter);
    mode.show(floor('second'));
    expect(mode.leaveForCut()).toBe(true);
    cut.set(true, 4.2);
    expect(mode.id).toBe('all');
    expect(mode.hidden).toBe(0);
    expect(mode.ownCut).toBeNull();
    expect(mode.show(null)).toBe(false);
    expect(setting(cut)).toEqual({ enabled: true, height: 4.2 });
    expect(mode.leaveForCut()).toBe(false);
    expect(filter.heights).toEqual([floor('second').cut, null]);
  });

  it('builds the landscape filter only once a floor is chosen', () => {
    let built = 0;
    const mode = new FloorMode(new SectionCut(), () => {
      built += 1;
      return recorder();
    });
    mode.leaveForCut();
    mode.show(null);
    expect(built).toBe(0);
    mode.show(floor('main'));
    mode.show(floor('second'));
    expect(built).toBe(1);
  });
});
