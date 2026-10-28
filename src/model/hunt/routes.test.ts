/**
 * The public routes of plan docs/work/1_first-person-walk (M2, M2b), walked by the walk mode's own walker, headless: the whole sequence's Timeline at t = N,
 * its collision world built as the page builds it with the doors open (`doors=open`; src/walk/door-world.ts `walkWorld`, over three-mesh-bvh BVHs), and src/walk/walker.ts stepped at
 * 60 frames a second as the page steps it, running, turned each frame toward the next point of the route (routes.ts). R1 runs from the plaza through
 * the central doors into the Great Hall, R2 up the Grand Staircase to the second floor, R3 from the Great Hall through the Egyptian galleries into the
 * Temple of Dendur hall, R4 through the Greek galleries into the Leon Levy and Shelby White Court, R5 up the Grand Staircase and through the cross hall's
 * doorway into gallery 600 (work unit 2, M1), R6 through the Arms and Armor galleries and the passage from gallery 374 into the Engelhard Court (work unit
 * 2, M4), R7 through Exhibition Gallery 199 and the corridor through the party wall into gallery 549 and the Petrie Court (work unit 2, integration),
 * each both ways. The walker never leaves the ground (no drop over a step), never stalls (a wall, a face over a step, a slope over 40°) and ends on the route's floor; R1 keeps level behind the doors, R2
 * crosses its landing and walks the second floor on their levels, R3 and R4 cross the McKim, Mead & White seams on the main floor, R5 crosses the
 * doorway's passage and the core's east wall on the second floor's level into gallery 600, R6 crosses the passage on the main floor's level, and R7 the
 * corridor and the court wall's opening on it.
 * Bound: steering turns the walker directly (the e2e walks steer by real keys and drags, tests/e2e/routes.spec.ts); a stall is less than 5 cm of
 * progress in 1 s; heights are the feet's, not the eye's, which eases out of stair snaps; samples are per frame, so a dip that starts and ends within
 * one frame's two physics steps is not seen.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { DoorLayer } from '../../viewer/doors.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { walkWorld } from '../../walk/door-world.js';
import type { DoorWorld } from '../../walk/door-world.js';
import { DOORS } from '../doors.js';
import { doorLeavesOf } from '../lib/window.js';
import { BODY, NO_INPUT, Walker } from '../../walk/walker.js';
import { INNER_EAST_Z } from '../core/layout.js';
import { MORGAN, PARTY_WALL } from '../mmw/dims.js';
import { ENGELHARD_PASSAGE, PETRIE_PASSAGE } from '../mmw/party-walls.js';
import { ROMAN_COURT } from '../mmw/wings.js';
import { COURT_WALL, COURT_X0 } from '../roche-south/kravis.js';
import { COURT, DENDUR_FLOOR_Y, PLATFORM, SACKLER_BLOCK } from '../roche-north/plan.js';
import { CROSS_HALL_BACK_Z, EXT_NORTH_X, EXT_SOUTH_X, MAIN, SCREEN_Z, SECOND, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from './dims.js';
import { GALLERY_600_MID_Z, reversed, ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6, ROUTE_R7, COURT_OPENING_Z, WESTON_APPROACH } from './routes.js';
import type { Route } from './routes.js';
import { STAIR_LANDING_Y } from './stair.js';

const FPS = 60;
/** A route point counts as reached within this plan distance, metres. */
const REACH = 0.3;
/** The core's east wall's inner face, where gallery 600 begins (src/model/core/layout.ts INNER_EAST_Z). */
const CORE_INNER_EAST_Z = INNER_EAST_Z;

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

let world: DoorWorld;
/** The workspace ground under everything (docs/design/spec.md, Camera framing: 0.5 m below the lower of grade and the model's lowest point). */
let floorY: number;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  // The doors stand open (doors=open): R1 passes the central doorway as a visitor does once the door is opened (src/walk/door-world.test.ts walks
  // into the closed door, opens it and closes it behind).
  const doors = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf, 'open');
  doors.sync(timeline.n, 0, true);
  world = walkWorld(timeline.steps, timeline.n, doors, new GeometryBvhs());
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

  it.each([ROUTE_R1, reversed(ROUTE_R1), ROUTE_R2, reversed(ROUTE_R2), ROUTE_R3, reversed(ROUTE_R3), ROUTE_R4, reversed(ROUTE_R4), ROUTE_R5, reversed(ROUTE_R5), ROUTE_R6, reversed(ROUTE_R6), ROUTE_R7, reversed(ROUTE_R7)])('walks $id end to end on the ground and ends on its floor', (route) => {
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

  it('R3 crosses the north seam on the main floor and walks into the Temple of Dendur hall to beside the platform', () => {
    const { samples, end } = walked(ROUTE_R3);
    const seam = samples.filter((s) => s.x >= EXT_NORTH_X - 1.2 && s.x <= EXT_NORTH_X);
    expect(seam.length, 'samples in the seam wall').toBeGreaterThan(5);
    expect(heightsOff(seam, MAIN), 'feet off the main floor in the seam wall').toEqual([]);
    const hall = samples.filter((s) => s.x > SACKLER_BLOCK.minX && s.z < SACKLER_BLOCK.maxZ);
    expect(hall.length, 'samples inside the Sackler Wing').toBeGreaterThan(5);
    expect(heightsOff(hall, DENDUR_FLOOR_Y), 'feet off the Dendur walkways').toEqual([]);
    expect(end.x - PLATFORM.maxX, `metres from the platform's north side at ${where(end)}`).toBeLessThan(4);
    expect(end.z < PLATFORM.maxZ && end.z > PLATFORM.minZ, `beside the platform at ${where(end)}`).toBe(true);
  });

  it('R4 crosses the south seam on the main floor and walks into the Leon Levy and Shelby White Court', () => {
    const { samples, end } = walked(ROUTE_R4);
    const seam = samples.filter((s) => s.x >= EXT_SOUTH_X && s.x <= EXT_SOUTH_X + 1.2);
    expect(seam.length, 'samples in the seam wall').toBeGreaterThan(5);
    expect(heightsOff(seam, MAIN), 'feet off the main floor in the seam wall').toEqual([]);
    const [x0, z0, x1, z1] = ROMAN_COURT;
    expect(end.x > x0 && end.x < x1 && end.z > z0 && end.z < z1, `inside the court at ${where(end)}`).toBe(true);
  });

  it('R5 crosses the cross hall, its doorway and the core’s east wall on the second floor’s level into gallery 600', () => {
    const { samples, end } = walked(ROUTE_R5);
    const passage = between(samples, CROSS_HALL_BACK_Z + 1, CORE_INNER_EAST_Z - 1);
    expect(passage.length, 'samples from the cross hall through the doorway into the gallery').toBeGreaterThan(5);
    expect(heightsOff(passage, SECOND), 'feet off the second floor in the doorway').toEqual([]);
    expect(end.z < CORE_INNER_EAST_Z && end.z > GALLERY_600_MID_Z - 2.5, `in gallery 600 at ${where(end)}`).toBe(true);
  });

  it('R6 crosses the passage from gallery 374 on the main floor’s level into the Engelhard Court', () => {
    const { samples, end } = walked(ROUTE_R6);
    // Through the wall on Z −96.0 and a metre either side of it, between the passage's jambs.
    const passage = between(samples, MORGAN.z0 - 1, MORGAN.z0 + PARTY_WALL + 1).filter((s) => s.x > ENGELHARD_PASSAGE.a && s.x < ENGELHARD_PASSAGE.b);
    expect(passage.length, 'samples in the passage').toBeGreaterThan(5);
    expect(heightsOff(passage, MAIN), 'feet off the main floor in the passage').toEqual([]);
    expect(end.x > COURT.minX && end.x < COURT.maxX && end.z > COURT.minZ && end.z < COURT.maxZ, `in the court at ${where(end)}`).toBe(true);
  });

  it('R7 crosses the corridor through the party wall and the court wall’s opening on the main floor’s level into the Petrie Court, and back', () => {
    for (const route of [ROUTE_R7, reversed(ROUTE_R7)]) {
      const { samples, end } = walked(route);
      // Through the party wall on Z −69.0 and a metre either side of it, between the corridor's sides.
      const corridor = samples.filter((s) => s.z > -69 - 1 && s.z < -69 + PARTY_WALL + 1 && s.x > PETRIE_PASSAGE.a && s.x < PETRIE_PASSAGE.b);
      expect(corridor.length, `${route.id}: samples in the corridor`).toBeGreaterThan(5);
      expect(heightsOff(corridor, MAIN), `${route.id}: feet off the main floor in the corridor`).toEqual([]);
      // Through the court's limestone wall, a metre either side of it, in its 3.6 m opening.
      const opening = samples.filter((s) => s.x > COURT_X0 - COURT_WALL - 1 && s.x < COURT_X0 + 1 && Math.abs(s.z - COURT_OPENING_Z) < 1.8);
      expect(opening.length, `${route.id}: samples in the court wall's opening`).toBeGreaterThan(5);
      expect(heightsOff(opening, MAIN), `${route.id}: feet off the main floor in the opening`).toEqual([]);
      const [x, z] = route === ROUTE_R7 ? WESTON_APPROACH : (ROUTE_R7.points[0] ?? [0, 0]);
      expect(Math.hypot(end.x - x, end.z - z), `${route.id}: ends within 0.5 m of its last point at ${where(end)}`).toBeLessThan(0.5);
    }
  });
});
