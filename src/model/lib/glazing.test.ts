/**
 * Glazing, stairs and balustrades.
 * Bound: geometry arrays only (finite, unit normals, winding against normals and against rays from outside for the solid roles, bounds, cache identity, budgets).
 * Glass panes are single sheets seen from both sides, so rays are not checked on them.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { baluster, balustrade } from './balustrade.js';
import { attributeProblems, backfaceFraction, boxOf, boxProblems, centredProblems, invertedFraction, roleGeometries, totalTriangles, triangles, unionBox } from './check.js';
import { curtainWall, hippedSkylight, laylight, oculusLight, pyramidSkylight, ridgeSkylight } from './glazing.js';
import { stairFlight, stairLanding } from './stair.js';

/** The brief caps a baluster at about 300 triangles: a roof line repeats it by the thousand. Closed, it has 324: the turned body's two end discs and the blocks' outer faces add 24. */
const BALUSTER_BUDGET = 330;
/** A skylight or wall of a few dozen bars is a few thousand triangles. */
const GLAZING_BUDGET = 3_000;
/** A 60 m wide flight of 12 steps is one extruded profile: under 300 triangles. */
const FLIGHT_BUDGET = 400;

function sound(part: object, name: string): void {
  for (const [role, geometry] of roleGeometries(part)) {
    expect(attributeProblems(geometry, `${name}.${role}`)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
  }
}

describe('skylights', () => {
  it.each([
    ['ridge', () => ridgeSkylight({ width: 6, length: 12 })],
    ['hipped', () => hippedSkylight({ width: 6, length: 12 })],
    ['pyramid', () => pyramidSkylight({ width: 8 })],
  ] as const)('%s: frame and glass sound, curb standing on y = 0, centred, frame closed', (name, make) => {
    const part = make();
    sound(part, name);
    expect(backfaceFraction(part.frame, 300, 7, { notFromBelow: true })).toBe(0);
    const box = unionBox([part.frame, part.glass]);
    expect(box.min[1]).toBeCloseTo(0, 6);
    expect(centredProblems(box, 0.05)).toEqual([]);
    expect(totalTriangles(part)).toBeLessThanOrEqual(GLAZING_BUDGET);
  });

  it('a ridge skylight rises width/2 × tan(pitch) above its curb', () => {
    const part = ridgeSkylight({ width: 6, length: 12, pitch: 30, curbHeight: 0.3 });
    expect(boxOf(part.glass).max[1]).toBeCloseTo(0.3 + 3 * Math.tan(Math.PI / 6), 1);
    expect(ridgeSkylight({ width: 6, length: 12 })).toBe(part);
    expect(() => ridgeSkylight({ width: 6, length: 12, pitch: 80 })).toThrow(/pitch is 80; it must be from 5 to 70/);
  });
});

describe('laylight, oculus light and curtain walls', () => {
  it('oculus light: ring, hub and bars over a disc facing down, radius as asked', () => {
    const part = oculusLight({ radius: 1.4 });
    sound(part, 'oculus');
    expect(backfaceFraction(part.frame, 300)).toBe(0);
    expect(boxProblems(boxOf(part.frame), { min: [-1.4, 0, -1.4], max: [1.4, 0.1, 1.4] }, 0.01)).toEqual([]);
    expect(part.glass.getAttribute('normal').getY(0)).toBeCloseTo(-1, 6);
    expect(totalTriangles(part)).toBeLessThanOrEqual(GLAZING_BUDGET);
    expect(oculusLight({ radius: 1.4 })).toBe(part);
  });

  it('laylight: a grid with its underside on y = 0 and its pane facing down', () => {
    const part = laylight({ width: 10, length: 20, cols: 5, rows: 10 });
    sound(part, 'laylight');
    expect(backfaceFraction(part.frame, 300)).toBe(0);
    expect(boxProblems(boxOf(part.frame), { min: [-5, 0, -10], max: [5, 0.1, 10] })).toEqual([]);
    const normal = part.glass.getAttribute('normal');
    expect(normal.getY(0)).toBeCloseTo(-1, 6);
  });

  it('curtain wall: vertical, as wide and tall as asked, glass facing +Z', () => {
    const part = curtainWall({ width: 12, height: 8 });
    sound(part, 'curtain');
    expect(backfaceFraction(part.frame, 300)).toBe(0);
    expect(boxProblems(boxOf(part.glass), { min: [-6, 0, undefined], max: [6, 8, undefined] }, 1e-3)).toEqual([]);
    expect(part.glass.getAttribute('normal').getZ(0)).toBeCloseTo(1, 6);
    expect(totalTriangles(part)).toBeLessThanOrEqual(GLAZING_BUDGET);
  });

  it('sloped curtain wall leans its top back toward −Z and keeps its height', () => {
    const part = curtainWall({ width: 12, height: 8, slope: 20 });
    sound(part, 'sloped');
    const glass = boxOf(part.glass);
    // The pane sits 4 mm behind the mullion line, so leaning drops its top edge by 4 mm × sin(slope).
    expect(glass.max[1]).toBeCloseTo(8, 2);
    expect(glass.min[2]).toBeCloseTo(-8 * Math.tan((20 * Math.PI) / 180), 1);
    expect(curtainWall({ width: 12, height: 8, slope: 20 })).toBe(part);
    expect(curtainWall({ width: 12, height: 8 })).not.toBe(part);
  });
});

describe('stairs', () => {
  it('flight: climbs toward −Z from the foot of its first riser, steps × riser tall, closed', () => {
    const flight = stairFlight({ width: 60, steps: 12 });
    sound(flight, 'flight');
    expect(backfaceFraction(flight.steps, 400, 7, { notFromBelow: true })).toBe(0);
    expect(boxProblems(boxOf(flight.steps), { min: [-30, 0, -4.8], max: [30, 1.8, 0.02] })).toEqual([]);
    expect(triangles(flight.steps)).toBeLessThanOrEqual(FLIGHT_BUDGET);
    expect(flight.cheeks).toBeUndefined();
  });

  it('cheek walls stand either side, above the nosings', () => {
    const flight = stairFlight({ width: 8, steps: 10, cheeks: { width: 0.6, height: 0.9 } });
    sound(flight, 'cheeks');
    const cheeks = flight.cheeks ?? flight.steps;
    expect(backfaceFraction(cheeks, 400, 7, { notFromBelow: true })).toBe(0);
    const box = boxOf(cheeks);
    expect(box.min[0]).toBeCloseTo(-4.6, 6);
    expect(box.max[0]).toBeCloseTo(4.6, 6);
    expect(box.max[1]).toBeCloseTo(10 * 0.15 + 0.9, 6);
  });

  it('landing: top at y = 0 from its front edge back to −depth', () => {
    const landing = stairLanding({ width: 60, depth: 4 });
    sound(landing, 'landing');
    expect(backfaceFraction(landing, 300)).toBe(0);
    expect(boxProblems(boxOf(landing), { min: [-30, -0.3, -4], max: [30, 0, 0] })).toEqual([]);
  });

  it('validates', () => {
    expect(() => stairFlight({ width: 4, steps: 0 })).toThrow(/steps is 0; it must be a whole number from 1 to 200/);
    expect(stairFlight({ width: 4, steps: 3 })).toBe(stairFlight({ width: 4, steps: 3, riser: 0.15, tread: 0.4 }));
  });
});

describe('balustrade', () => {
  it('baluster: sound, closed, base on y = 0, within budget', () => {
    const geometry = baluster({ height: 0.75, width: 0.2 });
    sound(geometry, 'baluster');
    expect(backfaceFraction(geometry, 300, 7, { notFromBelow: true, notFromAbove: true })).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-0.1, 0, -0.1], max: [0.1, 0.75, 0.1] })).toEqual([]);
    expect(triangles(geometry)).toBeLessThanOrEqual(BALUSTER_BUDGET);
    expect(baluster({})).toBe(geometry);
  });

  it('straight run: rail, plinth, posts and baluster placements between the posts', () => {
    const run = balustrade({ length: 10, height: 1 });
    sound({ rail: run.rail, plinth: run.plinth, posts: run.posts, baluster: run.baluster }, 'run');
    for (const g of [run.rail, run.plinth, run.posts]) expect(backfaceFraction(g, 300, 7, { notFromBelow: true })).toBe(0);
    expect(boxOf(run.rail).max[1]).toBeCloseTo(1, 6);
    expect(centredProblems(unionBox([run.rail, run.plinth, run.posts]), 0.01)).toEqual([]);
    // 10 m at 3.5 m between posts: 3 bays, 4 posts; each baluster stands on the plinth, clear of every post.
    expect(run.balusters.length).toBeGreaterThan(20);
    const posts = [-5, -5 / 3, 5 / 3, 5];
    for (const m of run.balusters) {
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      expect(p.y).toBeCloseTo(0.16, 6);
      for (const x of posts) expect(Math.abs(p.x - x)).toBeGreaterThan(0.35 / 2 + 0.05);
    }
    expect(balustrade({ length: 10, height: 1 })).toBe(run);
    expect(balustrade({ length: 10, height: 1 }).baluster).toBe(balustrade({ length: 6, height: 1 }).baluster);
  });

  it('closed loop: posts once per corner, rail mitred all round', () => {
    const run = balustrade({
      path: [
        [-4, 0, 3],
        [4, 0, 3],
        [4, 0, -3],
        [-4, 0, -3],
      ],
      closed: true,
    });
    expect(backfaceFraction(run.rail, 300, 7, { notFromBelow: true })).toBe(0);
    expect(boxProblems(boxOf(run.rail), { min: [-4.14, undefined, -3.14], max: [4.14, undefined, 3.14] }, 0.01)).toEqual([]);
  });

  it('names a height too low for its balusters', () => {
    expect(() => balustrade({ height: 0.5 })).toThrow(/leaves 0.190 m for the balusters/);
  });
});
