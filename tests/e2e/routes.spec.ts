/**
 * The public routes of plan docs/work/1_first-person-walk (M2), walked through real input on the finished building. Walk mode is entered as a visitor
 * enters it (the F key, or the view menu's "Walk from the Great Hall"); then only held keys (W, A, D, Shift) and mouse drags move the walker, and its
 * eye is read from the read-only `window.__met.walk` on every frame or two. The routes are src/model/hunt/routes.ts's plan lines, whose segments run
 * along an axis or at 45° to it: facing along an axis, W walks a straight segment and W with D or A a diagonal one; drags turn the walker between.
 * R1: from the plaza spawn up the front steps, through the central doors (level behind them), round the information desk at X 4.3 into the nave,
 * ending on the Great Hall floor. R2: from the Great Hall spawn to the desk, round it, up the Grand Staircase over its landing to the second floor and
 * a few metres into the cross hall, then turned round and back down to the hall floor.
 * Bound: a held key is let go once the eye passes the turn it walks to, early by the walker's coasting distance (src/walk/walker.ts, MOTION). On this
 * machine the keys go up 20 to 35 ms after that, and the walker comes to rest within 0.35 m of a straight leg's end. It rests 0.8 to 1.5 m past
 * the end of a diagonal last leg (R1's): its sideways motion builds up late. A leg that makes no progress for 1.5 s fails with where the walker stands.
 * Heights are read where the eye has eased out of the last stair snap. Frames of the doorway, the stair's landing and the arrival upstairs go to each
 * test's output folder for a person to inspect; nothing here judges them.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { HALL_WEST_Z, HALL_X, NAVE_MID_Z, SCREEN_Z, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { reversed, ROUTE_R1, ROUTE_R2 } from '../../src/model/hunt/routes.js';
import { STAIR_LANDING_Y } from '../../src/model/hunt/stair.js';
import { spawnById } from '../../src/walk/spawns.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { open, openMenu, press, watchErrors } from './helpers.js';

type XZ = readonly [number, number];
/** A level unit direction along an axis, as [x, z]. */
type Facing = readonly [number, number];
const MINUS_Z: Facing = [0, -1];
const PLUS_Z: Facing = [0, 1];
const MINUS_X: Facing = [-1, 0];
const EYE = BODY.eye;
/** How far the walker coasts once a key is let go at a run: straight ahead, and sideways on a diagonal. */
const COAST = MOTION.run * MOTION.groundTau;
const SIDE_COAST = (MOTION.run / Math.SQRT2) * MOTION.groundTau;

interface Sample {
  readonly eye: Vec3;
  readonly look: Vec3;
  readonly onGround: boolean;
}

/** The walk facts on the next frame; fails when walk mode is not walking. */
async function sample(page: Page): Promise<Sample> {
  const walk = await page.evaluate(
    () =>
      new Promise<{ eye: Vec3 | null; look: Vec3 | null; onGround: boolean } | null>((resolve) => {
        requestAnimationFrame(() => {
          const w = window.__met?.walk;
          resolve(w === undefined ? null : { eye: w.eye, look: w.look, onGround: w.onGround });
        });
      }),
  );
  if (walk?.eye == null || walk.look === null) throw new Error('Walk mode is not walking: window.__met.walk.eye is null.');
  return { eye: walk.eye, look: walk.look, onGround: walk.onGround };
}

async function walking(page: Page): Promise<Sample> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
  return sample(page);
}

/** Waits until the walker stands still (two frames with the eye within a millimetre), at most 2 s. */
async function still(page: Page): Promise<Sample> {
  let before = await sample(page);
  const until = Date.now() + 2000;
  for (;;) {
    const now = await sample(page);
    if (Math.hypot(now.eye[0] - before.eye[0], now.eye[1] - before.eye[1], now.eye[2] - before.eye[2]) < 1e-3 || Date.now() > until) return now;
    before = now;
  }
}

const fmt = (v: Vec3): string => `(${v.map((c) => c.toFixed(2)).join(', ')})`;
const along = (eye: Vec3, d: Facing): number => eye[0] * d[0] + eye[2] * d[1];

/** One leg: the side key held with Shift and W, and how far past its end the eye is (done at 0 or more). */
interface Leg {
  readonly label: string;
  readonly side: 'KeyA' | 'KeyD' | null;
  readonly past: (eye: Vec3) => number;
  readonly length: number;
}

/**
 * The legs that walk `points` facing `facing`: each segment must run forward, straight or at 45° to it. A straight one ends as the eye passes its end;
 * a diagonal one as it passes, a sideways coast early, its end across the facing; the last leg lets go a coast early, as the keys are then let go.
 */
function legs(points: readonly XZ[], facing: Facing): Leg[] {
  // The walker's right when it faces `facing` (src/walk/walker.ts: yaw 0 faces −Z, and its right is then +X).
  const right: Facing = [-facing[1], facing[0]];
  const out: Leg[] = [];
  for (let k = 1; k < points.length; k++) {
    const [x0, z0] = points[k - 1] ?? [0, 0];
    const [x1, z1] = points[k] ?? [0, 0];
    const d: Facing = [x1 - x0, z1 - z0];
    const ahead = d[0] * facing[0] + d[1] * facing[1];
    const across = d[0] * right[0] + d[1] * right[1];
    const label = `(${x0.toFixed(2)}, ${z0.toFixed(2)}) to (${x1.toFixed(2)}, ${z1.toFixed(2)})`;
    if (ahead <= 0) throw new Error(`Segment ${label} does not run forward along [${facing.join(', ')}]; the walk goes forward only.`);
    const straight = Math.abs(across) < 1e-6;
    if (!straight && Math.abs(Math.abs(across) - ahead) > 1e-6) throw new Error(`Segment ${label} is neither along [${facing.join(', ')}] nor at 45° to it; W, A and D walk only those.`);
    const end: Vec3 = [x1, 0, z1];
    const last = k === points.length - 1;
    const sideways: Facing = across > 0 ? right : [-right[0], -right[1]];
    out.push({
      label,
      side: straight ? null : across > 0 ? 'KeyD' : 'KeyA',
      past: straight ? (eye) => along(eye, facing) - along(end, facing) + (last ? COAST : 0) : (eye) => along(eye, sideways) - along(end, sideways) + SIDE_COAST,
      length: Math.hypot(d[0], d[1]),
    });
  }
  return out;
}

/** A frame to write when the eye first meets `when`: the walker stops, the frame is taken, and the walk goes on. */
interface Stop {
  readonly name: string;
  readonly when: (eye: Vec3) => boolean;
}

/** Walks the legs at a run with real key presses, adding every sample to `samples`; stops for the frames asked for. */
async function walk(page: Page, route: string, list: readonly Leg[], samples: Sample[], stops: readonly Stop[] = []): Promise<Sample> {
  const pending = [...stops];
  const hold = async (side: Leg['side']): Promise<void> => {
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyW');
    if (side !== null) await page.keyboard.down(side);
  };
  const release = async (): Promise<void> => {
    for (const key of ['KeyA', 'KeyD', 'KeyW', 'Shift']) await page.keyboard.up(key);
  };
  let last = await sample(page);
  for (const leg of list) {
    let now = leg.past(last.eye);
    if (now >= 0) continue;
    const deadline = Date.now() + (leg.length / MOTION.walk) * 1000 + 5000;
    let best = now;
    let improved = Date.now();
    await hold(leg.side);
    while (now < 0) {
      last = await sample(page);
      samples.push(last);
      now = leg.past(last.eye);
      if (now > best + 0.05) {
        best = now;
        improved = Date.now();
      }
      const stop = pending.find((s) => s.when(last.eye));
      if (now < 0 && stop !== undefined) {
        pending.splice(pending.indexOf(stop), 1);
        await release();
        last = await still(page);
        await page.screenshot({ path: test.info().outputPath(`${stop.name}.png`) });
        await hold(leg.side);
        improved = Date.now();
      }
      if (now < 0 && (Date.now() - improved > 1500 || Date.now() > deadline)) {
        await release();
        throw new Error(`${route}: stuck on the leg ${leg.label}, the eye at ${fmt(last.eye)} (on the ground: ${String(last.onGround)}), ${(-now).toFixed(2)} m short.`);
      }
    }
    if (leg.side !== null) await page.keyboard.up(leg.side);
  }
  await release();
  return still(page);
}

/** The walker's yaw from its look direction (src/walk/walker.ts: yaw 0 looks toward −Z and grows turning left). */
const yawOf = (look: Vec3): number => Math.atan2(-look[0], -look[2]);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Turns the walker to face `yaw` with mouse drags across the canvas: one to learn how far a pixel turns, then the rest, then corrections. */
async function face(page: Page, yaw: number): Promise<Sample> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const y = box.y + box.height / 3;
  const drag = async (dx: number): Promise<void> => {
    // A press that moves under 5 px is a click, which asks for pointer lock: a short turn goes out 20 px and back.
    const path = Math.abs(dx) < 10 ? [Math.sign(dx || 1) * 20, dx] : [dx];
    const x0 = box.x + box.width / 2 - dx / 2;
    let x = x0;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const target of path) {
      const from = x;
      const steps = Math.max(1, Math.ceil(Math.abs(x0 + target - from) / 20));
      for (let k = 1; k <= steps; k++) {
        x = from + ((x0 + target - from) * k) / steps;
        await page.mouse.move(x, y);
      }
    }
    await page.mouse.up();
  };
  let now = await sample(page);
  const before = yawOf(now.look);
  await drag(200);
  now = await sample(page);
  const perPixel = wrap(yawOf(now.look) - before) / 200;
  expect(perPixel, 'radians a pixel of drag to the right turns: to the right, so negative').toBeLessThan(0);
  for (let k = 0; k < 4; k++) {
    const error = wrap(yaw - yawOf(now.look));
    if (Math.abs(error) < 0.004) return now;
    let pixels = Math.round(error / perPixel);
    while (pixels !== 0) {
      const chunk = Math.sign(pixels) * Math.min(Math.abs(pixels), Math.floor(box.width * 0.6));
      await drag(chunk);
      pixels -= chunk;
    }
    now = await sample(page);
  }
  throw new Error(`The drags could not turn the walker to yaw ${yaw.toFixed(3)}: it faces ${yawOf(now.look).toFixed(3)} (look ${fmt(now.look)}).`);
}

/** The samples whose eye lies between `z0` and `z1` in Z. */
const between = (samples: readonly Sample[], z0: number, z1: number): Sample[] => samples.filter((s) => s.eye[2] >= Math.min(z0, z1) && s.eye[2] <= Math.max(z0, z1));
const off = (samples: readonly Sample[], level: number, tolerance: number): string[] => samples.filter((s) => Math.abs(s.eye[1] - level) > tolerance).map((s) => fmt(s.eye));
/**
 * Where the walker was off the ground. A route never jumps, so this is a fall: at a run the walker clears a shaft 0.8 m across with its eye only 8 cm
 * lower, but it is in the air all the way over.
 */
const airborne = (samples: readonly Sample[]): string[] => samples.filter((s) => !s.onGround).map((s) => fmt(s.eye));

test.describe('walk routes through real input', () => {
  test.setTimeout(60_000);
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('R1: from the plaza up the front steps, through the central doors and round the desk onto the Great Hall floor', async ({ page }) => {
    const started = Date.now();
    const f = await open(page, '');
    expect(f.t, 'the finished building').toBe(f.n);
    await page.keyboard.press('KeyF');
    const start = await walking(page);
    expect(await page.evaluate(() => window.__met?.walk.spawn), 'walk mode starts on the plaza').toBe('plaza');
    const samples: Sample[] = [start];
    const end = await walk(page, 'R1', legs(ROUTE_R1.points, MINUS_Z), samples, [
      { name: 'r1-doorway-outside', when: (eye) => eye[2] <= 2.6 },
      { name: 'r1-doorway-inside', when: (eye) => eye[2] <= WALL_BACK_Z + 0.5 },
    ]);
    const report = `R1 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(Math.abs(end.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: eye height off the main floor's`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(Math.abs(end.eye[0]) < HALL_X && end.eye[2] < WALL_BACK_Z && end.eye[2] > HALL_WEST_Z, `${report}: inside the Great Hall`).toBe(true);
    // Through the middle of the central doorway, level behind the doors (past 0.6 m, where the eye has eased out of the three steps), north of the desk.
    const doorway = between(samples, SCREEN_Z + 0.3, SCREEN_Z - 0.3);
    expect(doorway.length, 'samples in the central doorway').toBeGreaterThan(0);
    expect(Math.max(...doorway.map((s) => Math.abs(s.eye[0]))), 'metres off the axis in the doorway').toBeLessThan(0.3);
    const behind = between(samples, SCREEN_Z - 0.6, WALL_BACK_Z - 0.3);
    expect(behind.length, 'samples between the doors and the hall').toBeGreaterThan(0);
    expect(off(behind, MAIN_FLOOR_Y + EYE, 0.1), 'eyes off the main floor between the doors and the hall').toEqual([]);
    const desk = between(samples, NAVE_MID_Z + 0.5, NAVE_MID_Z - 0.5);
    expect(desk.length > 0 && desk.every((s) => s.eye[0] > 3.43), 'past the desk (3.08 m round, on the axis) on its north side').toBe(true);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    expect(Date.now() - started, 'R1 milliseconds').toBeLessThan(45_000);
  });

  test('R2: from the Great Hall up the Grand Staircase over its landing to the second floor, a few metres on, and back down', async ({ page }) => {
    const started = Date.now();
    await open(page, '');
    await openMenu(page, 'view-menu');
    await press(page, 'walk-spawn-great-hall');
    await page.waitForFunction(() => window.__met?.walk.spawn === 'great-hall');
    const start = await walking(page);
    const spawn = spawnById('great-hall');
    if (spawn === undefined) throw new Error('No great-hall spawn in src/walk/spawns.ts.');
    expect(Math.abs(start.eye[1] - (MAIN_FLOOR_Y + EYE)), 'the Great Hall spawn stands on the main floor').toBeLessThan(0.03);
    const samples: Sample[] = [start];
    // Down the nave to beside the desk, turned to face the staircase, round the desk as R1 goes, and up R2.
    const [deskX, besideFrom] = ROUTE_R1.points[2] ?? [0, 0];
    const besideTo = ROUTE_R1.points[3]?.[1] ?? 0;
    expect(spawn.feet[2] < besideFrom && spawn.feet[2] > besideTo, 'the spawn faces the stretch where R1 passes the desk').toBe(true);
    await walk(page, 'R2 to the desk', legs([[spawn.feet[0], spawn.feet[2]], [deskX, spawn.feet[2]]], MINUS_X), samples);
    await face(page, 0);
    const up: XZ[] = [[deskX, spawn.feet[2]], ...ROUTE_R1.points.slice(3), ...ROUTE_R2.points.slice(1)];
    const top = await walk(page, 'R2 up', legs(up, MINUS_Z), samples, [{ name: 'r2-landing', when: (eye) => eye[2] <= (STAIR_MID_FRONT_Z + STAIR_MID_BACK_Z) / 2 }]);
    await page.screenshot({ path: test.info().outputPath('r2-arrival.png') });
    // Heights from 1.4 m past the end of a flight, where the eye has eased out of its snaps (about 0.1 s, src/walk/walker.ts).
    expect(airborne(samples), 'eyes where the walker was off the ground on the way up').toEqual([]);
    const landing = between(samples, STAIR_MID_FRONT_Z - 1.4, STAIR_MID_BACK_Z + 0.5);
    expect(landing.length, 'samples on the landing').toBeGreaterThan(0);
    expect(off(landing, STAIR_LANDING_Y + EYE, 0.05), 'eyes off the landing').toEqual([]);
    const upstairs = between(samples, STAIR_TOP_Z - 2, top.eye[2]);
    expect(off(upstairs, SECOND_FLOOR_Y + EYE, 0.05), 'eyes off the second floor').toEqual([]);
    const zs = upstairs.map((s) => s.eye[2]);
    expect(Math.max(...zs) - Math.min(...zs), 'metres walked on the second floor').toBeGreaterThan(4);
    expect(Math.abs(top.eye[1] - (SECOND_FLOOR_Y + EYE)), `arrival: the eye at ${fmt(top.eye)}`).toBeLessThan(0.03);
    expect(top.onGround).toBe(true);
    // Turned round by drags, back down to the hall floor.
    const round = await face(page, Math.PI);
    expect(round.look[2], 'facing +Z after the turn').toBeGreaterThan(0.99);
    await page.screenshot({ path: test.info().outputPath('r2-arrival-back.png') });
    const down: Sample[] = [];
    const back = await walk(page, 'R2 down', legs(reversed(ROUTE_R2).points, PLUS_Z), down);
    const report = `R2 in ${((Date.now() - started) / 1000).toFixed(1)} s: up to ${fmt(top.eye)}, back to ${fmt(back.eye)}`;
    console.log(report);
    expect(airborne(down), `${report}: eyes where the walker was off the ground on the way down`).toEqual([]);
    expect(Math.abs(back.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: back on the main floor`).toBeLessThan(0.03);
    expect(back.onGround, report).toBe(true);
    expect(back.eye[2] > HALL_WEST_Z && back.eye[2] < WALL_BACK_Z, `${report}: back in the Great Hall`).toBe(true);
    expect(Date.now() - started, 'R2 milliseconds').toBeLessThan(45_000);
  });
});
