/**
 * The Petrie Court's columned doorways against the walker (src/model/roche-south/kravis.ts COURT_DOORWAYS; work unit 25, on the owner's choice of
 * 2026-11-06): the café's opening onto the court and the first, seventh and eighth doors into gallery 549, each two bays either side of a round column.
 * Headless, through the page's path on the real sequence at t = N: the whole sequence's Timeline, the page's door layer over it (src/viewer/doors.ts)
 * and the walk's world as walk mode builds it (src/walk/door-world.ts `walkWorld`), with the walk mode's own walker (src/walk/walker.ts) stepped at 60
 * frames a second. From 2.5 m out in the court the walker walks south through the middle of each bay to more than 2 m behind the wall, into the café or
 * gallery 549, and back north into the court, on the main floor all the way and keeping to its line. The lanes are numbers, the middle of each bay
 * between its jamb and its column's plinth as the map's spans and columns give them, not reckoned from the builder's data, so the walk reads the bays
 * rather than agreeing with them.
 * Red with the wall cut without the café's opening: both café lanes stopped at X −61.10, the wall's court face less the body's radius.
 * Bound: one line through each bay, its middle, whose body spans ±0.35 m of the bay's ±0.87 to ±0.88 m, so what stands within 0.52 m of a jamb or
 * a column's plinth is left to src/model/roche-south/roche-south.test.ts's line cast; walking, not running, at 60 frames a second; nothing over the
 * body's 1.75 m is read; positions are the feet's.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { DoorLayer } from '../../viewer/doors.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { walkWorld } from '../../walk/door-world.js';
import type { DoorWorld } from '../../walk/door-world.js';
import { Walker } from '../../walk/walker.js';
import type { WalkInput } from '../../walk/walker.js';
import { DOORS } from '../doors.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { doorLeavesOf } from '../lib/window.js';
import { COURT_WALL, COURT_X0 } from './kravis.js';

const FPS = 60;
const W: WalkInput = { forward: 1, right: 0, run: false };
/** Yaw facing −X, south through the wall, and +X, back north into the court (src/walk/walker.ts: yaw 0 faces −Z and grows turning left). */
const SOUTH = Math.PI / 2;
const NORTH = -Math.PI / 2;
/** The bays' middles, world Z: between each doorway's jamb and its column's plinth, 0.53 m either side of the column's middle. */
const LANES = [
  { name: "the café's west bay", z: -130.99 },
  { name: "the café's east bay", z: -128.18 },
  { name: "door 1's west bay", z: -124.68 },
  { name: "door 1's east bay", z: -121.85 },
  { name: "door 7's west bay", z: -80.07 },
  { name: "door 7's east bay", z: -77.25 },
  { name: "door 8's west bay", z: -73.75 },
  { name: "door 8's east bay", z: -70.94 },
] as const;
/** Where the walks start in the court and end behind the wall, world X. */
const IN_COURT = COURT_X0 + 2.5;
const BEHIND = COURT_X0 - COURT_WALL - 2;

let world: DoorWorld;
let floorY: number;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf, 'closed');
  layer.sync(timeline.n, 0, true);
  world = walkWorld(timeline.steps, timeline.n, layer, new GeometryBvhs());
  floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
}, 120_000);

/** Runs `seconds` of frames with `input` held; returns the lowest and highest the feet stood and the farthest they strayed from the lane. */
function hold(walker: Walker, seconds: number, input: WalkInput, lane: number): { low: number; high: number; stray: number } {
  let [low, high, stray] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0];
  for (let i = 0; i < Math.round(seconds * FPS); i += 1) {
    walker.update(1 / FPS, input);
    low = Math.min(low, walker.feet.y);
    high = Math.max(high, walker.feet.y);
    stray = Math.max(stray, Math.abs(walker.feet.z - lane));
  }
  return { low, high, stray };
}

const at = (walker: Walker): string => `(${walker.feet.x.toFixed(3)}, ${walker.feet.y.toFixed(3)}, ${walker.feet.z.toFixed(3)})`;

describe("the Petrie Court's columned doorways, walked through", () => {
  it.each(LANES)('let the walker walk south through $name and back north into the court, on the main floor all the way', ({ z: lane }) => {
    const walker = new Walker(world, floorY);
    walker.place(IN_COURT, MAIN_FLOOR_Y, lane, SOUTH);
    expect(walker.feet.y, `placed on the court's floor at ${at(walker)}`).toBeCloseTo(MAIN_FLOOR_Y, 3);
    const south = hold(walker, 5, W, lane);
    expect(walker.feet.x, `through the bay, 2 m behind the wall (X ${BEHIND.toFixed(2)}), at ${at(walker)}`).toBeLessThan(BEHIND);
    expect(walker.onGround).toBe(true);
    expect([south.low, south.high].map((y) => y - MAIN_FLOOR_Y), 'on the main floor all the way').toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    expect(south.stray, 'kept to its line').toBeLessThan(0.01);
    walker.turn(NORTH - walker.yaw, 0);
    const north = hold(walker, 6, W, lane);
    expect(walker.feet.x, `back through the bay into the court (X ${IN_COURT.toFixed(2)}), at ${at(walker)}`).toBeGreaterThan(IN_COURT);
    expect([north.low, north.high].map((y) => y - MAIN_FLOOR_Y), 'on the main floor all the way').toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    expect(north.stray, 'kept to its line').toBeLessThan(0.01);
  });
});
