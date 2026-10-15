/**
 * The public routes of plan docs/work/1_first-person-walk (M2, M2b), walked through real input on the finished building. Walk mode is entered as a visitor
 * enters it (the F key, or the view menu's "Walk from the Great Hall"); then only held keys (W, A, S, D, Shift) and mouse drags move the walker, and its
 * eye is read from the read-only `window.__met.walk` on every frame or two. The routes are src/model/hunt/routes.ts's plan lines, whose segments run
 * along an axis or at 45° to one: facing along an axis, W, S, A or D walks a straight segment and two of them a diagonal one; drags turn the walker.
 * R1: from the plaza spawn up the front steps, through the central doors (level behind them), round the information desk at X 4.3 into the nave,
 * ending on the Great Hall floor. R2: from the Great Hall spawn to the desk, round it, up the Grand Staircase over its landing to the second floor and
 * a few metres into the cross hall, then turned round and back down to the hall floor. R3: from the Great Hall spawn north through the Egyptian
 * galleries and the seam into the Temple of Dendur hall, along its east and north walkways to beside the platform. R4: from the Great Hall spawn south
 * past the desk, through the seam and the Greek galleries into the Leon Levy and Shelby White Court.
 * Bound: a held key is let go once the eye passes the turn it walks to, early by the walker's coasting distance (src/walk/walker.ts, MOTION); at a
 * corner the walker then comes to rest and, if it coasted on more than 0.25 m (the keys can go up late when the machine is loaded), walks back onto the
 * corner at a walk. It rests 0.8 to 1.5 m past the end of a diagonal last leg (R1's), whose sideways motion builds up late. A leg that makes no
 * progress for 1.5 s fails with where the walker stands. Heights are read where the eye has eased out of the last stair snap. Frames of the doorways,
 * the passages, the stair's landing and each arrival go to each test's output folder for a person to inspect; nothing here judges them.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { EXT_NORTH_X, EXT_SOUTH_X, HALL_WEST_Z, HALL_X, NAVE_MID_Z, SCREEN_Z, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { reversed, ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4 } from '../../src/model/hunt/routes.js';
import { STAIR_LANDING_Y } from '../../src/model/hunt/stair.js';
import { ROMAN_COURT } from '../../src/model/mmw/wings.js';
import { DENDUR_FLOOR_Y, PLATFORM, SACKLER_BLOCK } from '../../src/model/roche-north/plan.js';
import { spawnById } from '../../src/walk/spawns.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { open, openMenu, press, watchErrors } from './helpers.js';

type XZ = readonly [number, number];
/** A level unit direction along an axis, as [x, z]. */
type Facing = readonly [number, number];
const MINUS_Z: Facing = [0, -1];
const PLUS_Z: Facing = [0, 1];
const MINUS_X: Facing = [-1, 0];
const PLUS_X: Facing = [1, 0];
/** The passages R3 and R4 take: the seam walls on X +49.4 and −49.7, the map's door from gallery 130 into the Dendur hall, and the court's opening. */
const SEAM_NORTH_X = EXT_NORTH_X;
const SEAM_SOUTH_X = EXT_SOUTH_X;
const DENDUR_DOOR_X = 114.36;
const COURT_DOOR_X = -99.36;
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

/** Opens the finished building and enters walk mode by the view menu's "Walk from the Great Hall"; the walker stands on the main floor there. */
async function walkFromGreatHall(page: Page): Promise<{ start: Sample; spawn: NonNullable<ReturnType<typeof spawnById>> }> {
  await open(page, '');
  await openMenu(page, 'view-menu');
  await press(page, 'walk-spawn-great-hall');
  await page.waitForFunction(() => window.__met?.walk.spawn === 'great-hall');
  const start = await walking(page);
  const spawn = spawnById('great-hall');
  if (spawn === undefined) throw new Error('No great-hall spawn in src/walk/spawns.ts.');
  expect(Math.abs(start.eye[1] - (MAIN_FLOOR_Y + EYE)), 'the Great Hall spawn stands on the main floor').toBeLessThan(0.03);
  return { start, spawn };
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

type Move = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD';

/** Where a leg turns a corner: the axis its stopping motion ran along, the corner, and the keys that walk along that axis and back. */
interface Corner {
  readonly axis: Facing;
  readonly end: Vec3;
  readonly on: Move;
  readonly back: Move;
}

/** One leg: the movement keys held with Shift, how far past its end the eye is along the axis it ends on (done at 0 or more), and its corner. */
interface Leg {
  readonly label: string;
  readonly keys: readonly Move[];
  readonly past: (eye: Vec3) => number;
  readonly length: number;
  readonly corner: Corner | undefined;
}

const scale = (v: Facing, k: number): Facing => [v[0] * k, v[1] * k];

/**
 * The legs that walk `points` facing `facing` (along an axis): each segment must run along the facing, across it or at 45° to them, so W, S, A or D, alone
 * or two together, walk it. A leg ends on the axis of the key the next leg lets go, early by that motion's coasting distance; one whose keys all stop, as
 * the last one's do, ends along its own direction a run's coast early; one whose keys all go on ends as the eye passes its end.
 */
function legs(points: readonly XZ[], facing: Facing): Leg[] {
  // The walker's right when it faces `facing` (src/walk/walker.ts: yaw 0 faces −Z, and its right is then +X).
  const right: Facing = [-facing[1], facing[0]];
  const level = (u: number): boolean => Math.abs(u) < 1e-6;
  const plan = points.slice(1).map((q, k) => {
    const p = points[k] ?? q;
    const d: Facing = [q[0] - p[0], q[1] - p[1]];
    const ahead = d[0] * facing[0] + d[1] * facing[1];
    const across = d[0] * right[0] + d[1] * right[1];
    const label = `(${p[0].toFixed(2)}, ${p[1].toFixed(2)}) to (${q[0].toFixed(2)}, ${q[1].toFixed(2)})`;
    if ((level(ahead) && level(across)) || (!level(ahead) && !level(across) && Math.abs(Math.abs(ahead) - Math.abs(across)) > 1e-6)) {
      throw new Error(`Segment ${label} runs neither along nor across [${facing.join(', ')}] nor at 45° to them; W, A, S and D walk only those.`);
    }
    const keys: Move[] = [];
    if (!level(ahead)) keys.push(ahead > 0 ? 'KeyW' : 'KeyS');
    if (!level(across)) keys.push(across > 0 ? 'KeyD' : 'KeyA');
    return { label, q, d, ahead, across, keys };
  });
  return plan.map((s, k) => {
    const next = plan[k + 1]?.keys ?? [];
    const dropped = s.keys.filter((key) => !next.includes(key));
    const length = Math.hypot(s.d[0], s.d[1]);
    let axis: Facing = [s.d[0] / length, s.d[1] / length];
    let coast = dropped.length === 0 ? 0 : COAST;
    if (s.keys.length === 2 && dropped.length === 1) {
      axis = dropped[0] === 'KeyW' || dropped[0] === 'KeyS' ? scale(facing, Math.sign(s.ahead)) : scale(right, Math.sign(s.across));
      coast = SIDE_COAST;
    }
    const end: Vec3 = [s.q[0], 0, s.q[1]];
    // A corner where one motion stops along an axis of the facing (every stop but a diagonal's last): the keys along that axis and back.
    const onFacing = Math.abs(along([axis[0], 0, axis[1]], facing)) > 0.99;
    const onRight = Math.abs(along([axis[0], 0, axis[1]], right)) > 0.99;
    const sense = along([axis[0], 0, axis[1]], onFacing ? facing : right) > 0;
    const keysOn: readonly [Move, Move] = onFacing ? ['KeyW', 'KeyS'] : ['KeyD', 'KeyA'];
    const corner: Corner | undefined = dropped.length > 0 && (onFacing || onRight) ? { axis, end, on: sense ? keysOn[0] : keysOn[1], back: sense ? keysOn[1] : keysOn[0] } : undefined;
    return { label: s.label, keys: s.keys, past: (eye: Vec3) => along(eye, axis) - along(end, axis) + coast, length, corner };
  });
}

/** A frame to write when the eye first meets `when`: the walker stops, the frame is taken, and the walk goes on. */
interface Stop {
  readonly name: string;
  readonly when: (eye: Vec3) => boolean;
}

/** Walks the legs at a run with real key presses, adding every sample to `samples`; stops for the frames asked for. */
async function walk(page: Page, route: string, list: readonly Leg[], samples: Sample[], stops: readonly Stop[] = []): Promise<Sample> {
  const pending = [...stops];
  const held = new Set<string>();
  /** Holds exactly `keys`: lets go of the others first, then presses the new ones. */
  const hold = async (keys: readonly string[]): Promise<void> => {
    for (const key of [...held]) {
      if (keys.includes(key)) continue;
      await page.keyboard.up(key);
      held.delete(key);
    }
    for (const key of keys) {
      if (held.has(key)) continue;
      await page.keyboard.down(key);
      held.add(key);
    }
  };
  let last = await sample(page);
  /** At a corner: lets the walker come to rest, then walks it back (or on) at a walk along the corner's axis until the eye is within 0.25 m of it. */
  const settle = async (c: Corner): Promise<void> => {
    await hold([]);
    for (let k = 0; k < 4; k++) {
      last = await still(page);
      const error = along(last.eye, c.axis) - along(c.end, c.axis);
      if (Math.abs(error) <= 0.25) return;
      await hold([error > 0 ? c.back : c.on]);
      const until = Date.now() + 3000;
      for (;;) {
        last = await sample(page);
        samples.push(last);
        const e = along(last.eye, c.axis) - along(c.end, c.axis);
        if (Math.abs(e) <= 0.2 || Math.sign(e) !== Math.sign(error) || Date.now() > until) break;
      }
      await hold([]);
    }
  };
  for (const leg of list) {
    let now = leg.past(last.eye);
    if (now >= 0) {
      if (leg.corner !== undefined) await settle(leg.corner);
      continue;
    }
    const deadline = Date.now() + (leg.length / MOTION.walk) * 1000 + 5000;
    let best = now;
    let improved = Date.now();
    await hold(['Shift', ...leg.keys]);
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
        await hold([]);
        last = await still(page);
        await page.screenshot({ path: test.info().outputPath(`${stop.name}.png`) });
        await hold(['Shift', ...leg.keys]);
        improved = Date.now();
      }
      if (now < 0 && (Date.now() - improved > 1500 || Date.now() > deadline)) {
        await hold([]);
        throw new Error(`${route}: stuck on the leg ${leg.label}, the eye at ${fmt(last.eye)} (on the ground: ${String(last.onGround)}), ${(-now).toFixed(2)} m short.`);
      }
    }
    if (leg.corner !== undefined) await settle(leg.corner);
  }
  await hold([]);
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
  test.setTimeout(120_000);
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
    const { start, spawn } = await walkFromGreatHall(page);
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

  test('R3: from the Great Hall through the Egyptian galleries into the Temple of Dendur hall, to beside the platform', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    expect(ROUTE_R3.points[0], 'R3 starts at the Great Hall spawn').toEqual([spawn.feet[0], spawn.feet[2]]);
    const samples: Sample[] = [start];
    // Turned north by drags, through the galleries to the hall's east walkway, then turned west down the north walkway by the glass.
    await face(page, -Math.PI / 2);
    await walk(page, 'R3 to the Dendur hall', legs(ROUTE_R3.points.slice(0, 9), PLUS_X), samples, [
      { name: 'r3-seam-north', when: (eye) => eye[0] >= SEAM_NORTH_X - 6.5 },
      { name: 'r3-dendur-door', when: (eye) => eye[0] >= DENDUR_DOOR_X - 4 && eye[2] < -35 },
    ]);
    await face(page, 0);
    await page.screenshot({ path: test.info().outputPath('r3-dendur-walkway.png') });
    const end = await walk(page, 'R3 along the north walkway', legs(ROUTE_R3.points.slice(8), MINUS_Z), samples);
    await page.screenshot({ path: test.info().outputPath('r3-arrival.png') });
    const report = `R3 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    const seam = samples.filter((s) => s.eye[0] >= SEAM_NORTH_X - 1.2 && s.eye[0] <= SEAM_NORTH_X);
    expect(seam.length, 'samples in the north seam wall').toBeGreaterThan(0);
    expect(off(seam, MAIN_FLOOR_Y + EYE, 0.05), 'eyes off the main floor in the seam wall').toEqual([]);
    expect(Math.abs(end.eye[1] - (DENDUR_FLOOR_Y + EYE)), `${report}: on the Dendur walkway`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(end.eye[0] > SACKLER_BLOCK.minX && end.eye[2] < SACKLER_BLOCK.maxZ, `${report}: inside the Sackler Wing`).toBe(true);
    expect(end.eye[0] - PLATFORM.maxX < 4 && end.eye[2] < PLATFORM.maxZ, `${report}: beside the platform`).toBe(true);
    expect(Date.now() - started, 'R3 milliseconds').toBeLessThan(75_000);
  });

  test('R4: from the Great Hall past the desk through the Greek galleries into the Leon Levy and Shelby White Court', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    expect(ROUTE_R4.points[0], 'R4 starts at the Great Hall spawn').toEqual([spawn.feet[0], spawn.feet[2]]);
    const samples: Sample[] = [start];
    // The spawn faces south (−X), the way R4 goes.
    const end = await walk(page, 'R4', legs(ROUTE_R4.points, MINUS_X), samples, [
      { name: 'r4-seam-south', when: (eye) => eye[0] <= SEAM_SOUTH_X + 7 },
      { name: 'r4-court-door', when: (eye) => eye[0] <= COURT_DOOR_X + 4 },
    ]);
    await page.screenshot({ path: test.info().outputPath('r4-arrival.png') });
    const report = `R4 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    const seam = samples.filter((s) => s.eye[0] >= SEAM_SOUTH_X && s.eye[0] <= SEAM_SOUTH_X + 1.2);
    expect(seam.length, 'samples in the south seam wall').toBeGreaterThan(0);
    expect(off(seam, MAIN_FLOOR_Y + EYE, 0.05), 'eyes off the main floor in the seam wall').toEqual([]);
    const [x0, z0, x1, z1] = ROMAN_COURT;
    expect(end.eye[0] > x0 && end.eye[0] < x1 && end.eye[2] > z0 && end.eye[2] < z1, `${report}: inside the court`).toBe(true);
    expect(Math.abs(end.eye[1] - (ROUTE_R4.endY + EYE)), `${report}: on the court's floor`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(Date.now() - started, 'R4 milliseconds').toBeLessThan(60_000);
  });
});
