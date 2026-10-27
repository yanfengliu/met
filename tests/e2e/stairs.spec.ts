/**
 * The eye on the real stairs in the page (docs/design/spec.md, Walk mode: Looking), through real keys: from the plaza spawn W walks up the front steps
 * into the vestibule behind the central doors and S walks back down to the plaza, then the same with Shift held; from the spawn at the top of the Grand
 * Staircase, which faces down it, W walks down to the Great Hall and S back up into the cross hall, then the same running. Every frame the page draws
 * is recorded by a requestAnimationFrame loop beside the page's own that reads `window.__met` and writes nothing: the frame's number and the camera
 * position it was rendered from (`perf.lastDrawn`, copied right after the render), the walker's eye then and the frame's time. A walk's drawn frames
 * all come in, their numbers running on by one, and each was drawn from the walker's eye; the checks then run on the rendered camera: on a flight's
 * stretch it never drops while climbing and never rises while descending, and no frame moves it more than the climb covers in that frame's time plus
 * half the tallest riser. src/walk/stairs.test.ts checks the same, and the eye's lag behind the feet, at 30, 60 and 144 frames a second.
 * Bound: walking backward with S stands in for turning round; the frame rate is the page's own (60 a second headless here), so other rates are the unit
 * test's; frame times come from requestAnimationFrame timestamps, one frame late when the loop runs before the page's, and are capped, as the page
 * caps them, at 0.1 s.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEP_RISER, STEPS_BOTTOM_Z } from '../../src/model/frame.js';
import { CROSS_HALL_FRONT_Z, STAIR_FOOT_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { open, throttle, throttleRate, watchErrors } from './helpers.js';

/** As in src/walk/stairs.test.ts: the steepest flight's slope and the tallest riser. */
const SLOPE = 0.44;
const RISER = STEP_RISER;
const NOISE = 1e-4;
/** The page's longest frame step, seconds (src/main.ts MAX_FRAME_SECONDS). */
const MAX_FRAME = 0.1;

/** A drawn frame: its number, when the loop saw it, the camera position it was rendered from and the walker's eye then. */
interface Frame {
  readonly frame: number;
  readonly time: number;
  readonly camera: Vec3;
  readonly eye: Vec3;
}

/** Every frame drawn since the last call, once each (the first call starts the recording). */
async function record(page: Page): Promise<Frame[]> {
  return page.evaluate(
    () =>
      new Promise<Frame[]>((resolve) => {
        const w = window as unknown as { drawnFrames?: Frame[] };
        if (w.drawnFrames === undefined) {
          const list: Frame[] = [];
          w.drawnFrames = list;
          let seen = -1;
          const tick = (time: number): void => {
            const drawn = window.__met?.perf.lastDrawn;
            const eye = window.__met?.walk.eye;
            if (drawn !== undefined && eye != null && drawn.frame !== seen) {
              seen = drawn.frame;
              list.push({ frame: drawn.frame, time, camera: [...drawn.camera], eye: [...eye] });
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(() => {
          resolve((w.drawnFrames ?? []).splice(0));
        });
      }),
  );
}

/** Waits in the page, checking at every frame, until the eye's Z passes `z` going the way of `sense` (1: toward +Z). */
async function pass(page: Page, z: number, sense: 1 | -1, timeout: number): Promise<void> {
  await page.waitForFunction(([at, s]) => {
    const eye = window.__met?.walk.eye;
    return eye != null && s * (eye[2] - at) >= 0;
  }, [z, sense] as const, { polling: 'raf', timeout });
}

/** Waits until two frames 100 ms apart show the eye within 0.1 mm. */
async function still(page: Page): Promise<void> {
  const eye = (): Promise<number[]> => page.evaluate(() => [...(window.__met?.walk.eye ?? [Number.NaN, 0, 0])]);
  let before = await eye();
  for (let k = 0; k < 100; k += 1) {
    await page.waitForTimeout(100);
    const now = await eye();
    if (Math.hypot(...now.map((v, i) => v - (before[i] ?? 0))) < 1e-4) return;
    before = now;
  }
  throw new Error('The walker did not come to rest within 10 s.');
}

const fmt = (f: Frame): string => `frame ${String(f.frame)} (${f.camera.map((c) => c.toFixed(3)).join(', ')})`;

/**
 * Holds `keys` until the eye passes `z` (toward `sense`), lets go and waits for rest; then checks every drawn frame of the walk: none missing, each
 * rendered from the walker's eye, and on `stretch` the rendered camera moves only up (`climb` 1) or only down (−1), no frame moving it more than the
 * climb covers in its time plus half a riser.
 */
async function walk(page: Page, what: string, keys: readonly string[], z: number, sense: 1 | -1, climb: 1 | -1, stretch: readonly [number, number], run: boolean): Promise<Frame> {
  await record(page);
  for (const key of keys) await page.keyboard.down(key);
  await pass(page, z, sense, 60_000 * throttleRate());
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  await still(page);
  const frames = await record(page);
  const speed = run ? MOTION.run : MOTION.walk;
  const inStretch = (f: Frame): boolean => f.camera[2] <= Math.max(...stretch) && f.camera[2] >= Math.min(...stretch);
  const missing: string[] = [];
  const apart: string[] = [];
  const wrongWay: string[] = [];
  const jumps: string[] = [];
  let onStretch = 0;
  frames.forEach((f, i) => {
    const off = Math.hypot(...f.camera.map((c, k) => c - (f.eye[k] ?? Number.NaN)));
    if (!(off < 1e-9)) apart.push(`${fmt(f)}: ${(off * 100).toFixed(2)} cm from the eye`);
    const before = frames[i - 1];
    if (before === undefined) return;
    if (f.frame !== before.frame + 1) missing.push(`frames ${String(before.frame + 1)} to ${String(f.frame - 1)}`);
    const change = f.camera[1] - before.camera[1];
    const where = `${fmt(before)} to ${fmt(f)}: ${(change * 100).toFixed(1)} cm`;
    if (inStretch(before) && inStretch(f)) {
      onStretch += 1;
      if (climb * change < -NOISE) wrongWay.push(where);
    }
    const dt = Math.min(MAX_FRAME, (f.time - before.time) / 1000);
    if (Math.abs(change) > SLOPE * speed * dt + RISER / 2) jumps.push(`${where} in ${(dt * 1000).toFixed(1)} ms`);
  });
  expect(missing, `${what}: drawn frames the recording missed`).toEqual([]);
  expect(apart, `${what}: frames drawn from somewhere other than the walker's eye`).toEqual([]);
  expect(onStretch, `${what}: frames on the flight`).toBeGreaterThan(30);
  expect(wrongWay, `${what}: frames on the flight where the rendered eye moved ${climb > 0 ? 'down' : 'up'}`).toEqual([]);
  expect(jumps, `${what}: frames whose rendered eye moved more than the climb covers plus half a riser`).toEqual([]);
  const end = frames[frames.length - 1];
  if (end === undefined) throw new Error(`${what}: no frame was recorded.`);
  return end;
}

test.describe('the eye on the real stairs, every frame, through real keys', () => {
  test.setTimeout(150_000 * throttleRate());
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('the front steps: up and back down, walking and running', async ({ page }) => {
    await open(page, 'walk=1&spawn=plaza');
    await throttle(page);
    await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null);
    const plaza = (await record(page)).at(-1);
    if (plaza === undefined) throw new Error('No frame from the plaza spawn.');
    // Up past the central doors into the vestibule, then back down past the spawn onto the plaza.
    const inside = WALL_BACK_Z - 1.5;
    const outside = plaza.camera[2] + 0.5;
    const stretch = [STEPS_BOTTOM_Z, WALL_BACK_Z] as const;
    for (const run of [false, true]) {
      const gait = run ? 'running' : 'walking';
      const shift = run ? ['Shift'] : [];
      const top = await walk(page, `${gait} up the front steps`, [...shift, 'KeyW'], inside, -1, 1, stretch, run);
      expect(Math.abs(top.camera[1] - (MAIN_FLOOR_Y + BODY.eye)), `${gait} up: the rendered eye on the main floor at ${fmt(top)}`).toBeLessThan(0.01);
      const foot = await walk(page, `${gait} down the front steps`, [...shift, 'KeyS'], outside, 1, -1, stretch, run);
      expect(Math.abs(foot.camera[1] - plaza.camera[1]), `${gait} down: the rendered eye back at the plaza's level at ${fmt(foot)}`).toBeLessThan(0.02);
    }
  });

  test('the Grand Staircase: down and back up, walking and running', async ({ page }) => {
    await open(page, 'walk=1&spawn=second-floor');
    await throttle(page);
    await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null);
    // The spawn faces down the flights (+Z): W walks down onto the hall floor, S back up into the cross hall.
    const hall = STAIR_FOOT_Z + 4;
    const crossHall = CROSS_HALL_FRONT_Z - 1.5;
    const stretch = [STAIR_FOOT_Z, CROSS_HALL_FRONT_Z] as const;
    for (const run of [false, true]) {
      const gait = run ? 'running' : 'walking';
      const shift = run ? ['Shift'] : [];
      const foot = await walk(page, `${gait} down the Grand Staircase`, [...shift, 'KeyW'], hall, 1, -1, stretch, run);
      expect(Math.abs(foot.camera[1] - (MAIN_FLOOR_Y + BODY.eye)), `${gait} down: the rendered eye over the hall floor at ${fmt(foot)}`).toBeLessThan(0.05);
      const top = await walk(page, `${gait} up the Grand Staircase`, [...shift, 'KeyS'], crossHall, -1, 1, stretch, run);
      expect(Math.abs(top.camera[1] - (SECOND_FLOOR_Y + BODY.eye)), `${gait} up: the rendered eye on the second floor at ${fmt(top)}`).toBeLessThan(0.01);
    }
  });
});
