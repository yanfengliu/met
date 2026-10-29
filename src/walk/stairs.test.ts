/**
 * The eye on the real stairs (docs/design/spec.md, Walk mode: Looking): the walk mode's walker climbs and descends the front steps and the Grand Staircase
 * of the finished model, its collision world built as the page builds it with the doors open (`doors=open`), walking and running, at 30, 60 and 144 frames a second, and its eye is read
 * after every frame, as the page reads it. On a flight's own stretch the eye never drops while climbing and never rises while descending; on the whole
 * walk no frame moves it by more than the climb covers in that frame (`SLOPE` × speed × frame time) plus half the tallest riser, and it stays within
 * `LAG` (0.3 m) of the feet's height plus 1.6 m.
 * Red before the fix (work unit 2, M1): the eye dropped 10 to 16 cm for a frame at a riser, the full ease of a stair snap added to a height still partly
 * interpolated. Without the ease each riser is one frame's jump of the whole riser, which the per-frame bound refuses at every frame rate.
 * All 24 walks are red with the eye of db4cc47, from before the fix, and all 24 without the ease (a riser's jump in a frame).
 * Bound: straight walks on the axis (X 0), from the plaza spawn to the vestibule behind the central doors and from the nave's west side to the cross
 * hall, keys held throughout, no steering; frame times exactly 1/fps. A flight's stretch runs from its foot to the floor at its top (the front steps
 * with the three steps in the central doorway); off it the floors have small steps of their own (1 to 3 cm by the Grand Staircase's foot), which the
 * eye follows. The eye-height reference is the feet after the frame's last physics step, so `LAG` holds the ease and one frame's interpolation.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEP_RISER, STEPS_BOTTOM_Z } from '../model/frame.js';
import { CROSS_HALL_FRONT_Z, STAIR_FOOT_Z, WALL_BACK_Z } from '../model/hunt/dims.js';
import { PAVING_GAP, walkWestY } from '../model/site/ground.js';
import { DOORS } from '../model/doors.js';
import { doorLeavesOf } from '../model/lib/window.js';
import { DoorLayer } from '../viewer/doors.js';
import { GeometryBvhs } from './bvh-cache.js';
import { walkWorld } from './door-world.js';
import type { DoorWorld } from './door-world.js';
import { spawnById } from './spawns.js';
import { BODY, MOTION, Walker } from './walker.js';

/** The steepest flight walked: the front steps' 0.163 m risers on 0.377 m treads (src/model/site/steps.ts); the Grand Staircase's is 0.40. */
const SLOPE = 0.44;
/** The tallest riser walked, metres: the front steps' (frame.ts STEP_RISER); the Grand Staircase's are 0.149 m. */
const RISER = STEP_RISER;
/** How far the eye may trail or lead the feet's height plus 1.6 m, metres: the eased snaps of a run up a flight and one frame's interpolation. */
const LAG = 0.3;
/** Float noise allowed on a monotonic stretch, metres. */
const NOISE = 1e-4;

let world: DoorWorld;
let floorY: number;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  // The doors stand open (doors=open), so the walk passes the central doorway as a visitor does once the door is opened.
  const doors = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf, 'open');
  doors.sync(timeline.n, 0, true);
  world = walkWorld(timeline.steps, timeline.n, doors, new GeometryBvhs());
  floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
});

interface Flight {
  readonly name: string;
  /** Plan Z where the walk starts and ends, on the axis, and the floor levels there. */
  readonly from: number;
  readonly to: number;
  readonly startY: number;
  readonly endY: number;
  /** The flight's own stretch in plan Z, from its foot to the floor at its top: there the eye moves only one way. */
  readonly stretch: readonly [number, number];
}

const plaza = spawnById('plaza');
if (plaza === undefined) throw new Error('src/walk/spawns.ts has no plaza spawn.');
/** The plaza's granite at the spawn: a paving gap over the sidewalk's level (src/model/site/plaza.ts). */
const PLAZA_Y = walkWestY(0, plaza.feet[2]) + PAVING_GAP;

const UP: readonly Flight[] = [
  // From the plaza spawn up the 22 risers and the three steps in the central doorway, into the vestibule behind the doors.
  { name: 'the front steps', from: plaza.feet[2], to: WALL_BACK_Z - 2, startY: PLAZA_Y, endY: MAIN_FLOOR_Y, stretch: [STEPS_BOTTOM_Z, WALL_BACK_Z] },
  // From the nave's west side (where routes R2 and R5 start) up both flights and the landing into the cross hall.
  { name: 'the Grand Staircase', from: -24.7, to: -63, startY: MAIN_FLOOR_Y, endY: SECOND_FLOOR_Y, stretch: [STAIR_FOOT_Z, CROSS_HALL_FRONT_Z] },
];
const WALKS: readonly { readonly flight: Flight; readonly sense: 1 | -1 }[] = UP.flatMap((f) => [
  { flight: f, sense: 1 as const },
  { flight: { ...f, from: f.to, to: f.from, startY: f.endY, endY: f.startY }, sense: -1 as const },
]);

interface Frame {
  readonly z: number;
  readonly eye: number;
  readonly feet: number;
}

/** Walks `flight` on the axis with W (and Shift when `run`) held, at `fps`, until the feet pass its end, then 1 s at rest; the eye after every frame. */
function walkFlight(flight: Flight, run: boolean, fps: number): Frame[] {
  const walker = new Walker(world, floorY);
  const ahead = Math.sign(flight.to - flight.from);
  walker.place(0, flight.startY, flight.from, ahead < 0 ? 0 : Math.PI);
  const read = (): Frame => ({ z: walker.feet.z, eye: walker.eye().y, feet: walker.feet.y });
  const frames = [read()];
  for (let k = 0; k < 60 * fps && ahead * (flight.to - walker.feet.z) > 0; k += 1) {
    walker.update(1 / fps, { forward: 1, right: 0, run });
    frames.push(read());
  }
  for (let k = 0; k < fps; k += 1) {
    walker.update(1 / fps, { forward: 0, right: 0, run });
    frames.push(read());
  }
  return frames;
}

const fmt = (f: Frame): string => `Z ${f.z.toFixed(2)} eye ${f.eye.toFixed(3)} feet ${f.feet.toFixed(3)}`;
const within = (z: number, [a, b]: readonly [number, number]): boolean => z <= Math.max(a, b) && z >= Math.min(a, b);

describe('the eye on the real stairs, every frame', () => {
  for (const fps of [30, 60, 144]) {
    for (const run of [false, true]) {
      for (const { flight, sense } of WALKS) {
        const what = `${run ? 'running' : 'walking'} ${sense > 0 ? 'up' : 'down'} ${flight.name} at ${String(fps)} frames a second`;
        it(what, () => {
          const frames = walkFlight(flight, run, fps);
          const end = frames[frames.length - 1];
          if (end === undefined) throw new Error('No frame was walked.');
          expect(Math.abs(end.feet - flight.endY), `${what}: the walk ends on its floor, at ${fmt(end)}`).toBeLessThan(0.01);
          expect(Math.abs(end.eye - (end.feet + BODY.eye)), `${what}: the eye comes to rest 1.6 m over the feet, at ${fmt(end)}`).toBeLessThan(1e-3);
          const jump = SLOPE * (run ? MOTION.run : MOTION.walk) / fps + RISER / 2;
          const wrongWay: string[] = [];
          const jumps: string[] = [];
          const lags: string[] = [];
          let onStretch = 0;
          frames.forEach((f, i) => {
            const before = frames[i - 1];
            if (before !== undefined) {
              const change = f.eye - before.eye;
              const where = `${fmt(before)} to ${fmt(f)}: ${(change * 100).toFixed(1)} cm`;
              if (within(before.z, flight.stretch) && within(f.z, flight.stretch)) {
                onStretch += 1;
                if (sense * change < -NOISE) wrongWay.push(where);
              }
              if (Math.abs(change) > jump) jumps.push(where);
            }
            if (Math.abs(f.eye - (f.feet + BODY.eye)) > LAG) lags.push(fmt(f));
          });
          expect(onStretch, `${what}: frames on the flight`).toBeGreaterThan(fps);
          expect(wrongWay, `${what}: frames on the flight where the eye moved ${sense > 0 ? 'down' : 'up'}`).toEqual([]);
          expect(jumps, `${what}: frames whose eye moved more than the climb covers plus half a riser (${(jump * 100).toFixed(1)} cm)`).toEqual([]);
          expect(lags, `${what}: frames whose eye lay more than ${String(LAG)} m off the feet plus 1.6 m`).toEqual([]);
        });
      }
    }
  }
});
