/**
 * The Valladolid choir screen's open gate against the walker (src/model/core/choir-screen.ts; the owner's call, 2026-10-28), headless, through the
 * page's path on the real sequence at t = N: the whole sequence's Timeline, the page's door layer over it (src/viewer/doors.ts) and the walk's world as
 * walk mode builds it (src/walk/door-world.ts `walkWorld`), with the walk mode's own walker (src/walk/walker.ts) stepped at 60 frames a second. From
 * 4 m west of the screen the walker walks east through the gate to more than 3 m past it and back, on the hall's axis and 0.63 m either side of
 * it, a body's radius and 5 cm inside the gate's jambs at 1.03 m (`GATE_CLEAR`, the opening the owner chose), on the hall's floor all the way. The
 * lines are numbers, not reckoned from `GATE_CLEAR`, so the walk reads the opening's width rather than agreeing with the constant.
 * Red with the gate closed as at 44ea7b7: all three stopped at Z −100.00, the base's west face less the body's radius. The axis lies on an 8 mm
 * joint of the floor's tiles: red with the walker of 897a4b4, which read only the line under the body's centre there, set the feet on the slab in
 * the joint, 6 cm down, and kept them there walking along it (work unit 4's F-owner-8; work unit 13).
 * Bound: three lines square to the screen, whose bodies together span ±0.98 m of the opening's ±1.03 m; walking, not running, at 60 frames a second;
 * nothing over the body's 1.75 m is read; positions are the feet's.
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
import { SCREEN_Z } from './constants.js';

const FPS = 60;
const W: WalkInput = { forward: 1, right: 0, run: false };
/** Yaw facing +Z, east through the screen, and −Z, back west (src/walk/walker.ts: yaw 0 faces −Z and grows turning left). */
const EAST = Math.PI;
const WEST = 0;
/** The walks' lines: the axis, on a joint of the floor's tiles, and either side of it a body's radius and 5 cm inside the jambs. */
const LANES = [
  { name: 'on the axis', x: 0 },
  { name: 'north of the axis by the jamb', x: 0.63 },
  { name: 'south of the axis by the jamb', x: -0.63 },
] as const;

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
    stray = Math.max(stray, Math.abs(walker.feet.x - lane));
  }
  return { low, high, stray };
}

const at = (walker: Walker): string => `(${walker.feet.x.toFixed(3)}, ${walker.feet.y.toFixed(3)}, ${walker.feet.z.toFixed(3)})`;

describe("the Valladolid choir screen's gate, walked through", () => {
  it.each(LANES)('lets the walker walk east through the gate and back $name, on the hall floor all the way', ({ x: lane }) => {
    const walker = new Walker(world, floorY);
    walker.place(lane, MAIN_FLOOR_Y, SCREEN_Z - 4, EAST);
    expect(walker.feet.y, `placed on the hall's floor at ${at(walker)}`).toBeCloseTo(MAIN_FLOOR_Y, 3);
    const east = hold(walker, 4, W, lane);
    expect(walker.feet.z, `through the gate, 3 m past the screen's plane (Z ${SCREEN_Z.toFixed(2)}), at ${at(walker)}`).toBeGreaterThan(SCREEN_Z + 3);
    expect(walker.onGround).toBe(true);
    expect([east.low, east.high].map((y) => y - MAIN_FLOOR_Y), 'on the hall floor all the way').toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    expect(east.stray, 'kept to its line').toBeLessThan(0.01);
    walker.turn(WEST - walker.yaw, 0);
    const west = hold(walker, 4, W, lane);
    expect(walker.feet.z, `back through the gate, 3 m west of the screen's plane, at ${at(walker)}`).toBeLessThan(SCREEN_Z - 3);
    expect([west.low, west.high].map((y) => y - MAIN_FLOOR_Y), 'on the hall floor all the way').toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
    expect(west.stray, 'kept to its line').toBeLessThan(0.01);
  });
});
