/**
 * Profiles, mouldings, cornice and entablature runs, modillions, dentils and `along` placements.
 * Bound: geometry arrays only (finite, unit normals, winding that agrees with normals and with rays from outside, bounds, cache identity, budgets); the look is judged on gallery captures.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import type { V3 } from './builder.js';
import { attributeProblems, backfaceFraction, boxOf, boxProblems, invertedFraction, triangles } from './check.js';
import { corniceRun, dentil, entablature, modillion, moulding, type ProfileName } from './cornice.js';
import { corniceProfile, parapetCapProfile, stackProfiles, architraveProfile, friezeProfile } from './profiles.js';
import { signedArea } from './profile.js';

const STRAIGHT: readonly V3[] = [
  [-3, 0, 0],
  [3, 0, 0],
];
const LOOP: readonly V3[] = [
  [-3, 0, 2],
  [3, 0, 2],
  [3, 0, -2],
  [-3, 0, -2],
];
/** A 1.2 m modillion cornice along 6 m: the mouldings stay small; modillions and dentils are instanced, so the moulding itself is cheap. */
const MOULDING_BUDGET = 600;
const MODILLION_BUDGET = 120;

function sound(geometry: THREE.BufferGeometry, name: string): void {
  expect(attributeProblems(geometry, name)).toEqual([]);
  expect(invertedFraction(geometry)).toBe(0);
}

describe('profiles', () => {
  it('are closed, counter-clockwise and as tall and deep as asked', () => {
    for (const profile of [corniceProfile({ height: 1.2 }), corniceProfile({ height: 1, modillions: false, dentils: false }), architraveProfile({ height: 1 }), friezeProfile({ height: 1 }), parapetCapProfile({})]) {
      expect(profile.closed).toBe(true);
      expect(signedArea(profile.points)).toBeGreaterThan(0);
    }
    const ys = corniceProfile({ height: 1.2, projection: 1.1 }).points.map(([, y]) => y);
    const ds = corniceProfile({ height: 1.2, projection: 1.1 }).points.map(([d]) => d);
    expect(Math.max(...ys)).toBeCloseTo(1.2, 9);
    expect(Math.max(...ds)).toBeCloseTo(1.1, 9);
    expect(Math.min(...ds)).toBeCloseTo(0, 9);
  });

  it('stack into one section whose height is the sum', () => {
    const stacked = stackProfiles([architraveProfile({ height: 1 }), friezeProfile({ height: 1 }), corniceProfile({ height: 1.3 })]);
    expect(Math.max(...stacked.points.map(([, y]) => y))).toBeCloseTo(3.3, 9);
    expect(signedArea(stacked.points)).toBeGreaterThan(0);
  });

  it('name the parameter when a size is not positive', () => {
    expect(() => corniceProfile({ height: 0 })).toThrow(/corniceProfile: height is 0; it must be a finite number above 0/);
  });
});

describe('moulding', () => {
  it.each(['cornice', 'architrave', 'frieze', 'string-course', 'base', 'plinth', 'parapet-cap'] as const satisfies readonly ProfileName[])('%s: sound, outward, mitred round a closed loop', (profile) => {
    const geometry = moulding({ profile, path: LOOP, closed: true, height: 0.5 });
    sound(geometry, profile);
    expect(backfaceFraction(geometry, 300)).toBe(0);
    const box = boxOf(geometry);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.max[1]).toBeCloseTo(0.5, 6);
    expect(triangles(geometry)).toBeLessThanOrEqual(MOULDING_BUDGET);
  });

  it('projects toward +Z from a path running +X, from the path line', () => {
    const box = boxOf(moulding({ profile: 'string-course', path: STRAIGHT, height: 0.3 }));
    expect(boxProblems(box, { min: [-3, 0, 0], max: [3, 0.3, 0.15] })).toEqual([]);
  });

  it('caches by profile, path and size', () => {
    expect(moulding({ profile: 'base', path: STRAIGHT })).toBe(moulding({ profile: 'base', path: STRAIGHT, height: 0.4, detail: 'medium' }));
    expect(moulding({ profile: 'base', path: STRAIGHT })).not.toBe(moulding({ profile: 'plinth', path: STRAIGHT }));
    expect(() => moulding({ path: [[0, 0, 0]] })).toThrow(/moulding: path has 1 point\(s\); it needs at least 2/);
  });
});

describe('cornice and entablature runs', () => {
  it('cornice: moulding, shared modillion and dentil geometry, placements along the run', () => {
    const run = corniceRun({ path: STRAIGHT, height: 1.2 });
    sound(run.moulding, 'cornice');
    expect(backfaceFraction(run.moulding, 300)).toBe(0);
    expect(boxProblems(boxOf(run.moulding), { min: [-3, 0, 0], max: [3, 1.2, 1.2] })).toEqual([]);
    expect(run.modillions.length).toBeGreaterThan(4);
    expect(run.dentils.length).toBeGreaterThan(20);
    // Every modillion hangs from the soffit, in front of the bed moulding, within the run.
    for (const matrix of run.modillions) {
      const p = new THREE.Vector3().setFromMatrixPosition(matrix);
      expect(p.y).toBeCloseTo(0.6, 6);
      expect(p.z).toBeGreaterThan(0);
      expect(Math.abs(p.x)).toBeLessThan(3);
    }
    expect(corniceRun({ path: STRAIGHT, height: 1.2 })).toBe(run);
    expect(corniceRun({ path: STRAIGHT, height: 1.3 }).modillion).not.toBe(run.modillion);
  });

  it('a closed loop gets one corner modillion per convex corner', () => {
    const open = corniceRun({ path: LOOP, closed: true, height: 0.8 });
    const along = corniceRun({ path: LOOP, closed: true, height: 0.8 }).modillions.length;
    expect(along).toBe(open.modillions.length);
    const diagonal = open.modillions.filter((m) => {
      const x = new THREE.Vector3(1, 0, 0).transformDirection(m);
      return Math.abs(Math.abs(x.x) - Math.abs(x.z)) < 1e-6;
    });
    expect(diagonal).toHaveLength(4);
  });

  it('entablature: architrave, frieze and cornice in one section, as tall as asked, cornice runs above them', () => {
    const run = entablature({ path: STRAIGHT, height: 3.2 });
    sound(run.moulding, 'entablature');
    expect(backfaceFraction(run.moulding, 300)).toBe(0);
    const box = boxOf(run.moulding);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(box.max[1]).toBeCloseTo(3.2, 6);
    const p = new THREE.Vector3().setFromMatrixPosition(run.modillions[0] ?? new THREE.Matrix4());
    expect(p.y).toBeCloseTo(3.2 * 0.6 + 3.2 * 0.4 * 0.5, 6);
  });

  it('modillion and dentil: sound, origin at the back-top, projecting +Z and hanging −Y, within budget', () => {
    const m = modillion({ length: 0.6 });
    sound(m, 'modillion');
    expect(backfaceFraction(m, 300, 7, { notFromBehind: true, notFromAbove: true })).toBe(0);
    // The front scroll is sampled, so its tip comes within a centimetre of the full length.
    expect(boxProblems(boxOf(m), { min: [-0.6 / 7, -0.2, 0], max: [0.6 / 7, 0, 0.6] }, 0.01)).toEqual([]);
    expect(triangles(m)).toBeLessThanOrEqual(MODILLION_BUDGET);
    const d = dentil({ width: 0.1 });
    sound(d, 'dentil');
    expect(boxProblems(boxOf(d), { min: [-0.05, -0.15, 0], max: [0.05, 0, 0.1] })).toEqual([]);
    expect(modillion({})).toBe(modillion({ length: 0.6 }));
  });
});
