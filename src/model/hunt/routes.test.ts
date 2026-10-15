/**
 * The public routes of plan docs/work/1_first-person-walk (M2) stay walkable in the finished model, headless (the whole sequence's Timeline at t = N, no
 * WebGL): R1 from the plaza through the central doors into the Great Hall and R2 up the Grand Staircase to the second floor, each both ways, by the walk
 * mode's capsule (walk-probe.ts: no drop or face over a step of 0.35 m, nothing solid in the capsule's way). The three places that once broke them have
 * their own checks in hunt.test.ts (the doors' glazing, the floor behind the screens, the stair's top landing).
 * Bound: the routes are the plan lines of routes.ts, sampled every 5 cm, against triangles within 10 m of the axis; walk-probe.ts states the walker's own.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { reversed, ROUTE_R1, ROUTE_R2 } from './routes.js';
import { Solids, walk, WALKER } from './walk-probe.js';

let solids: Solids;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  solids = new Solids(timeline, { min: [-10, -3, -70], max: [10, 16, 32] });
});

describe('the walk routes', () => {
  it.each([ROUTE_R1, reversed(ROUTE_R1), ROUTE_R2, reversed(ROUTE_R2)])('walks $id end to end with no gap, face or obstruction over a step', (route) => {
    const result = walk(solids, route.points, route.startY);
    expect(result.failure, `${route.id}: stopped after ${String(result.samples)} samples`).toBeUndefined();
    expect(result.maxRise, `${route.id}: largest step up, metres`).toBeLessThanOrEqual(WALKER.step);
    expect(result.maxDrop, `${route.id}: largest step down, metres`).toBeLessThanOrEqual(WALKER.step);
    expect(Math.abs(result.end.y - route.endY), `${route.id}: ends with the feet at Y ${result.end.y.toFixed(3)}, not on Y ${route.endY.toFixed(3)}`).toBeLessThan(0.02);
  });
});
