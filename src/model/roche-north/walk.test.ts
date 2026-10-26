/**
 * The Temple of Dendur hall walked by the walk mode's walker (docs/design/spec.md, Walk mode; work unit 2, M1): the whole sequence's collision at t = N,
 * built as the page builds it, the walker stepped at 60 frames a second. No trap: put in the pool anywhere, the walker walks out onto the walkway
 * beside it without a jump, and walking off the walkway into the pool drops it one step, which it climbs back. The gate, as the real building has it
 * (interior.md, The gate's front and the forecourt): on its axis from the terrace the walker stops at the low rail before the gate's riser, never on it;
 * from the forecourt it walks into the gate's passage, level with the forecourt, and back; and the forecourt is reached from the terrace up the short
 * flight at the gate's north end.
 * Bound: start points 2 m apart over the pool's water, each walked straight toward the walkway on its nearer side; the gate is walked on its axis and
 * on the north flight's middle line only.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../../walk/collision.js';
import { BODY, NO_INPUT, Walker } from '../../walk/walker.js';
import type { WalkInput } from '../../walk/walker.js';
import { SACKLER_MAX_Z } from '../frame.js';
import { DAIS, DAIS_STEPS, DAIS_Y, DENDUR_FLOOR_Y, GATE_RAIL, GATE_THRESHOLD, PLATFORM_Y, POOL, POOL_FLOOR_Y, TEMPLE_AXIS_X } from './plan.js';

const FPS = 60;
const WALK: WalkInput = { forward: 1, right: 0, run: false };

let world: CollisionWorld;
let floorY: number;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  world = new CollisionWorld(new GeometryBvhs());
  world.build(collisionMeshes(timeline.steps, timeline.n));
  floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
});

/** Yaw that faces the level direction (x, z). */
const facing = (x: number, z: number): number => Math.atan2(-x, -z);
const where = (w: Walker): string => `(${w.feet.x.toFixed(2)}, ${w.feet.y.toFixed(3)}, ${w.feet.z.toFixed(2)})`;

/** Holds `input` for `seconds` at 60 frames a second; calls `each` after every frame. */
function hold(walker: Walker, seconds: number, input: WalkInput, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds * FPS); i += 1) {
    walker.update(1 / FPS, input);
    each?.();
  }
}

/** A walker standing at (x, z) on the first surface under `y`. */
function standAt(x: number, y: number, z: number, faceX: number, faceZ: number): Walker {
  const walker = new Walker(world, floorY);
  walker.place(x, y, z, facing(faceX, faceZ));
  hold(walker, 0.3, NO_INPUT);
  return walker;
}

/** The pool's water in plan, inset from its kerbs: the main basin and the two arms along the terrace. */
const WATER: readonly { readonly name: string; readonly x: readonly [number, number]; readonly z: readonly [number, number] }[] = [
  { name: 'the basin', x: [POOL.minX + 0.6, POOL.maxX - 0.6], z: [POOL.basinMinZ + 0.3, SACKLER_MAX_Z - 0.6] },
  { name: 'the south arm', x: [POOL.minX + 0.6, POOL.armSouthMaxX - 0.3], z: [POOL.armMinZ + 0.6, POOL.basinMinZ] },
  { name: 'the north arm', x: [POOL.armNorthMinX + 0.3, POOL.maxX - 0.6], z: [POOL.armMinZ + 0.6, POOL.basinMinZ] },
];

describe('the Temple of Dendur hall, walked', () => {
  it('lets a walker out of the pool from anywhere, onto the walkway beside it, at a walk', () => {
    const trapped: string[] = [];
    let starts = 0;
    for (const water of WATER) {
      for (let x = water.x[0]; x <= water.x[1] + 1e-6; x += 2) {
        for (let z = water.z[0]; z <= water.z[1] + 1e-6; z += 2) {
          starts += 1;
          const walker = standAt(x, DENDUR_FLOOR_Y, z, 0, 1);
          if (Math.abs(walker.feet.y - POOL_FLOOR_Y) > 0.01) {
            trapped.push(`${water.name} at (${x.toFixed(1)}, ${z.toFixed(1)}): stands at ${walker.feet.y.toFixed(3)}, not on the pool's bottom`);
            continue;
          }
          // Straight toward each side in turn, nearest first: one that ends on the walkway shows the walker was not trapped. The pool's south side is the
          // McKim, Mead & White wing's wall and its west side the terrace's face, so the way out is north, east, or past an arm's west end.
          const sides = ([[1, 0, POOL.maxX - x], [0, 1, SACKLER_MAX_Z - z], [0, -1, z - POOL.armMinZ], [-1, 0, x - POOL.minX]] as const).slice().sort((a, b) => a[2] - b[2]);
          const out = sides.find(([dx, dz]) => {
            const trial = standAt(x, DENDUR_FLOOR_Y, z, dx, dz);
            hold(trial, 10, WALK);
            hold(trial, 0.5, NO_INPUT);
            return Math.abs(trial.feet.y - DENDUR_FLOOR_Y) < 0.01 && trial.onGround;
          });
          if (out === undefined) trapped.push(`${water.name} at (${x.toFixed(1)}, ${z.toFixed(1)}): no straight walk out, from ${where(walker)}`);
        }
      }
    }
    expect(starts, 'start points in the water').toBeGreaterThan(40);
    expect(trapped, 'starts in the pool the walker could not walk out of').toEqual([]);
  });

  it('drops a walker that walks off the east walkway into the basin one step, and it walks back out', () => {
    const walker = standAt(133, DENDUR_FLOOR_Y + 0.5, SACKLER_MAX_Z + 2.5, 0, -1);
    expect(walker.feet.y).toBeCloseTo(DENDUR_FLOOR_Y, 2);
    let lowest = walker.feet.y;
    hold(walker, 2.5, WALK, () => {
      lowest = Math.min(lowest, walker.feet.y);
    });
    expect(lowest, 'into the pool, down to its bottom and no further').toBeCloseTo(POOL_FLOOR_Y, 2);
    expect(walker.feet.y).toBeCloseTo(POOL_FLOOR_Y, 2);
    walker.turn(Math.PI, 0);
    hold(walker, 3, WALK);
    expect(walker.feet.y, `back on the walkway at ${where(walker)}`).toBeCloseTo(DENDUR_FLOOR_Y, 2);
    expect(walker.feet.z).toBeGreaterThan(SACKLER_MAX_Z);
  });

  it('stops a walker on the gate’s axis from the terrace at the rail before its riser, never on it', () => {
    const walker = standAt(TEMPLE_AXIS_X, PLATFORM_Y + 0.5, -57, 0, -1);
    expect(walker.feet.y).toBeCloseTo(PLATFORM_Y, 2);
    let highest = walker.feet.y;
    hold(walker, 6, WALK, () => {
      highest = Math.max(highest, walker.feet.y);
    });
    expect(highest, 'never climbs onto the rail or the riser').toBeLessThan(PLATFORM_Y + 0.01);
    expect(walker.feet.z, `stopped before the rail at ${where(walker)}`).toBeGreaterThan(GATE_RAIL.z + BODY.radius - 0.1);
    expect(walker.feet.z).toBeLessThan(GATE_RAIL.z + BODY.radius + 0.3);
    expect(walker.onGround).toBe(true);
  });

  it('walks a walker from the forecourt into the gate’s passage on the forecourt’s level, and back', () => {
    const walker = standAt(TEMPLE_AXIS_X, DAIS_Y + 0.5, DAIS_STEPS.minZ - 1, 0, 1);
    const level = GATE_THRESHOLD.topY;
    expect(Math.abs(walker.feet.y - level), `on the forecourt at ${where(walker)}`).toBeLessThan(0.025);
    const off: string[] = [];
    hold(walker, 2.2, WALK, () => {
      if (Math.abs(walker.feet.y - level) > 0.025) off.push(where(walker));
    });
    hold(walker, 0.3, NO_INPUT);
    expect(off, 'feet off the forecourt\'s level on the way in').toEqual([]);
    expect(walker.feet.z, `in the passage at ${where(walker)}`).toBeGreaterThan(GATE_THRESHOLD.minZ + 0.5);
    expect(walker.feet.z).toBeLessThan(GATE_THRESHOLD.maxZ);
    walker.turn(Math.PI, 0);
    hold(walker, 2.5, WALK);
    expect(walker.feet.z, `back on the forecourt at ${where(walker)}`).toBeLessThan(DAIS.maxZ - 0.5);
    expect(Math.abs(walker.feet.y - level)).toBeLessThan(0.025);
  });

  it('climbs from the terrace onto the forecourt by the short flight at the gate’s north end', () => {
    const x = DAIS.maxX - DAIS_STEPS.width / 2;
    const walker = standAt(x, PLATFORM_Y + 0.5, -62, 0, -1);
    expect(walker.feet.y).toBeCloseTo(PLATFORM_Y, 2);
    hold(walker, 6, WALK);
    expect(walker.feet.z, `past the flight at ${where(walker)}`).toBeLessThan(DAIS_STEPS.minZ - 1);
    expect(Math.abs(walker.feet.y - (DAIS_Y + 0.04)), `on the forecourt at ${where(walker)}`).toBeLessThan(0.025);
    expect(walker.onGround).toBe(true);
  });
});
