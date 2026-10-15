/**
 * The public routes of plan docs/work/1_first-person-walk (M2), walked by the walk mode's own walker, headless: the whole sequence's Timeline at t = N,
 * its collision world built as the page builds it (`collisionMeshes`, `CollisionWorld` over three-mesh-bvh BVHs), and src/walk/walker.ts stepped at
 * 60 frames a second as the page steps it, running, turned each frame toward the next point of the route (routes.ts). R1 runs from the plaza through
 * the central doors into the Great Hall, R2 up the Grand Staircase to the second floor, each both ways. The walker never leaves the ground (no drop over
 * a step), never stalls (a wall, a face over a step, a slope over 40°), keeps level behind the doors, crosses R2's landing at its level, walks the
 * second floor on its level, and ends on the route's floor.
 * Bound: steering turns the walker directly (the e2e walks steer by real keys and drags, tests/e2e/routes.spec.ts); a stall is less than 5 cm of
 * progress in 1 s; heights are the feet's, not the eye's, which eases out of stair snaps; samples are per frame, so a dip that starts and ends within
 * one frame's two physics steps is not seen.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../../walk/collision.js';
import { BODY, NO_INPUT, Walker } from '../../walk/walker.js';
import { MAIN, SCREEN_Z, SECOND, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from './dims.js';
import { reversed, ROUTE_R1, ROUTE_R2 } from './routes.js';
import type { Route } from './routes.js';
import { STAIR_LANDING_Y } from './stair.js';

const FPS = 60;
/** A route point counts as reached within this plan distance, metres. */
const REACH = 0.3;

interface Sample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly onGround: boolean;
}

interface Drive {
  readonly samples: readonly Sample[];
  readonly end: Sample;
  readonly failure: string | undefined;
  readonly maxRise: number;
  readonly maxDrop: number;
}

let world: CollisionWorld;
/** The workspace ground under everything (docs/design/spec.md, Camera framing: 0.5 m below the lower of grade and the model's lowest point). */
let floorY: number;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  world = new CollisionWorld(new GeometryBvhs());
  world.build(collisionMeshes(timeline.steps, timeline.n));
  floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
});

const where = (s: Sample): string => `(${s.x.toFixed(2)}, ${s.y.toFixed(3)}, ${s.z.toFixed(2)})`;
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Runs `route` with the real walker, turned toward each next point in turn; stops at the first fall or stall. */
function drive(route: Route): Drive {
  const walker = new Walker(world, floorY);
  const [first, second] = route.points;
  if (first === undefined || second === undefined) throw new Error(`Route ${route.id} needs at least two points.`);
  walker.place(first[0], route.startY, first[1], Math.atan2(-(second[0] - first[0]), -(second[1] - first[1])));
  const sample = (): Sample => ({ x: walker.feet.x, y: walker.feet.y, z: walker.feet.z, onGround: walker.onGround });
  const samples: Sample[] = [sample()];
  let maxRise = 0;
  let maxDrop = 0;
  let target = 1;
  let best = Infinity;
  let stalled = 0;
  let failure: string | undefined;
  while (failure === undefined && target < route.points.length && samples.length < 120 * FPS) {
    const [tx, tz] = route.points[target] ?? [0, 0];
    const dx = tx - walker.feet.x;
    const dz = tz - walker.feet.z;
    const distance = Math.hypot(dx, dz);
    if (distance < REACH) {
      target += 1;
      best = Infinity;
      stalled = 0;
      continue;
    }
    walker.turn(wrap(Math.atan2(-dx, -dz) - walker.yaw), 0);
    walker.update(1 / FPS, { forward: 1, right: 0, run: true });
    const before = samples[samples.length - 1] ?? sample();
    const now = sample();
    samples.push(now);
    maxRise = Math.max(maxRise, now.y - before.y);
    maxDrop = Math.max(maxDrop, before.y - now.y);
    if (!now.onGround) failure = `${route.id}: left the ground at ${where(now)}, from ${where(before)}, heading for (${tx.toFixed(2)}, ${tz.toFixed(2)})`;
    if (distance < best - 0.05) {
      best = distance;
      stalled = 0;
    } else if ((stalled += 1 / FPS) > 1) {
      failure = `${route.id}: stalled at ${where(now)}, ${distance.toFixed(2)} m short of (${tx.toFixed(2)}, ${tz.toFixed(2)})`;
    }
  }
  if (failure === undefined && target < route.points.length) failure = `${route.id}: did not reach its end in ${String(samples.length / FPS)} s`;
  // Come to rest where the keys are let go.
  for (let k = 0; k < FPS && failure === undefined; k++) walker.update(1 / FPS, NO_INPUT);
  return { samples, end: sample(), failure, maxRise, maxDrop };
}

/** The samples whose Z lies between `z0` and `z1`. */
const between = (samples: readonly Sample[], z0: number, z1: number): Sample[] => samples.filter((s) => s.z >= Math.min(z0, z1) && s.z <= Math.max(z0, z1));
const heightsOff = (samples: readonly Sample[], level: number): string[] => samples.filter((s) => Math.abs(s.y - level) > 0.01).map(where);

describe('the walk routes, walked by the walk mode’s walker', () => {
  const walks = new Map<string, Drive>();
  const walked = (route: Route): Drive => {
    const known = walks.get(route.id);
    if (known !== undefined) return known;
    const made = drive(route);
    walks.set(route.id, made);
    return made;
  };

  it.each([ROUTE_R1, reversed(ROUTE_R1), ROUTE_R2, reversed(ROUTE_R2)])('walks $id end to end on the ground and ends on its floor', (route) => {
    const result = walked(route);
    expect(result.failure).toBeUndefined();
    expect(result.maxRise, `${route.id}: largest step up in a frame, metres`).toBeLessThanOrEqual(BODY.step);
    expect(result.maxDrop, `${route.id}: largest step down in a frame, metres`).toBeLessThanOrEqual(BODY.step);
    expect(result.end.onGround).toBe(true);
    expect(Math.abs(result.end.y - route.endY), `${route.id}: ends with the feet at ${where(result.end)}, not on Y ${route.endY.toFixed(3)}`).toBeLessThan(0.01);
  });

  it('R1 keeps level behind the central doors, from the screen to the hall', () => {
    const behind = between(walked(ROUTE_R1).samples, SCREEN_Z - 0.4, WALL_BACK_Z - 0.3);
    expect(behind.length, 'samples behind the doors').toBeGreaterThan(5);
    expect(heightsOff(behind, MAIN), 'feet off the main floor behind the doors').toEqual([]);
  });

  it('R2 crosses the Grand Staircase’s landing at its level and walks the second floor on its level', () => {
    const { samples } = walked(ROUTE_R2);
    const landing = between(samples, STAIR_MID_FRONT_Z - 0.4, STAIR_MID_BACK_Z + 0.4);
    expect(landing.length, 'samples on the landing').toBeGreaterThan(5);
    expect(heightsOff(landing, STAIR_LANDING_Y), 'feet off the landing').toEqual([]);
    const upstairs = between(samples, STAIR_TOP_Z - 0.4, -Infinity);
    expect(heightsOff(upstairs, SECOND), 'feet off the second floor past the top step').toEqual([]);
    const zs = upstairs.map((s) => s.z);
    expect(Math.max(...zs) - Math.min(...zs), 'metres walked on the second floor').toBeGreaterThan(4);
  });
});
