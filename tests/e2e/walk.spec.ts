/**
 * Walk mode and the orbit view's movement keys through real input (docs/design/spec.md, Keyboard and Walk mode): the orbit keys move the camera and
 * its target together and leave the timeline keys alone; the Walk toggle, the F key, a view-menu spawn and `?walk=1&spawn=` enter walk mode; on the
 * real model, holding W walks from the plaza up the front steps; a drag turns the view; F returns to the orbit view where the walker stood; a key
 * pressed in the same frame as the F before it already has the new mode's meaning, both ways.
 * Facts come from `window.__met.walk` and `window.__met.camera`; spawn positions from src/walk/spawns.ts; levels from src/model/frame.ts.
 * Bound: the walk goes up the front steps, not through the doors (work unit 1, M2), W held until the eye has climbed 2 m and the eye read once the
 * walker stands still, so a loaded machine changes how long it takes, not where it ends, within a timeout of 60 s times the CPU throttle; frame times are this machine's (an RTX 4090 in headless Chrome);
 * "the same frame" is checked by a probe's requestAnimationFrame count at each keydown, and a run whose keys never shared a frame fails, not passes.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { LANDING_Y, MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEPS_BOTTOM_Z } from '../../src/model/frame.js';
import { spawnById } from '../../src/walk/spawns.js';
import { camera, currentT, distance, facts, open, openMenu, press, settle, throttle, throttleRate, waitForT, watchErrors } from './helpers.js';
import type { Camera, Facts } from './helpers.js';

const EYE = 1.6;

/** The walk facts once the eye has stood still from one frame to the next, within 0.1 mm; fails after 5 s times the CPU throttle. */
async function rest(page: Page): Promise<Facts['walk']> {
  const eye = (): Promise<number[]> => page.evaluate(() => new Promise<number[]>((resolve) => {
    requestAnimationFrame(() => { resolve([...(window.__met?.walk.eye ?? [Number.NaN, 0, 0])]); });
  }));
  let before = await eye();
  const limit = 5000 * throttleRate();
  const until = Date.now() + limit;
  for (;;) {
    const now = await eye();
    const moved = Math.hypot(...now.map((v, i) => v - (before[i] ?? 0)));
    if (moved < 1e-4) return (await facts(page)).walk;
    if (Date.now() > until) throw new Error(`The walker did not come to rest within ${String(limit / 1000)} s: its eye last moved ${moved.toFixed(4)} m from one frame to a later one.`);
    before = now;
  }
}

/** Waits until walk mode is on and prepared, within 15 s times the CPU throttle, and returns the walk facts. */
async function walking(page: Page): Promise<Facts['walk']> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 * throttleRate() });
  return (await facts(page)).walk;
}

async function orbiting(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
}

async function hold(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await settle(page);
}

const sub = (a: readonly number[], b: readonly number[]): Vec3 => [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)];
const dot = (a: readonly number[], b: readonly number[]): number => (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);

/** What the browser's input pipeline needs to press a key by its code, as Playwright's own keyboard sends it (CDP Input.dispatchKeyEvent). */
const KEYS: Readonly<Record<string, { key: string; keyCode: number; text?: string }>> = {
  KeyF: { key: 'f', keyCode: 70, text: 'f' },
  Space: { key: ' ', keyCode: 32, text: ' ' },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 },
};

/**
 * Presses and releases each key of `codes` in order, as real input sent back to back, and returns the frame each keydown arrived in, counted by a
 * probe's own requestAnimationFrame loop installed beside the page's (it reads nothing of the page and writes none of its state). Keys that share a
 * frame number arrived with no frame of the page between them.
 */
async function pressInOneGo(page: Page, codes: readonly string[]): Promise<number[]> {
  await page.evaluate(() => {
    const w = window as unknown as { keyProbe?: { frame: number; downs: [string, number][] } };
    if (w.keyProbe !== undefined) return;
    const probe = { frame: 0, downs: [] as [string, number][] };
    const tick = (): void => {
      probe.frame += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.addEventListener('keydown', (event) => { probe.downs.push([event.code, probe.frame]); }, true);
    w.keyProbe = probe;
  });
  await page.evaluate(() => { (window as unknown as { keyProbe: { downs: unknown[] } }).keyProbe.downs.length = 0; });
  const cdp = await page.context().newCDPSession(page);
  const sends = codes.flatMap((code) => {
    const k = KEYS[code];
    if (k === undefined) throw new Error(`pressInOneGo: no key description for ${code}; add it to KEYS.`);
    const down = { type: k.text === undefined ? 'rawKeyDown' : 'keyDown', key: k.key, code, windowsVirtualKeyCode: k.keyCode, ...(k.text === undefined ? {} : { text: k.text, unmodifiedText: k.text }) };
    return [down, { type: 'keyUp', key: k.key, code, windowsVirtualKeyCode: k.keyCode }];
  });
  // Sent without waiting for one another, so nothing of the test's own pace comes between them.
  await Promise.all(sends.map((params) => cdp.send('Input.dispatchKeyEvent', params as never)));
  await cdp.detach();
  await settle(page);
  const downs = await page.evaluate(() => (window as unknown as { keyProbe: { downs: [string, number][] } }).keyProbe.downs);
  expect(downs.map(([code]) => code), 'the keydowns the page received').toEqual([...codes]);
  return downs.map(([, frame]) => frame);
}

/** The camera's view direction laid flat, and the level direction to its right. */
function levelAxes(c: Camera): { forward: Vec3; right: Vec3 } {
  const d = sub(c.target, c.position);
  const length = Math.hypot(d[0], d[2]);
  const forward: Vec3 = [d[0] / length, 0, d[2] / length];
  return { forward, right: [-forward[2], 0, forward[0]] };
}

test.describe('orbit view keys', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('W S A D move the camera and its target together over the ground, Q and E down and up, and the follow camera goes off', async ({ page }) => {
    const f = await open(page, '');
    expect(f.follow, 'the follow camera at load').toBe(true);
    const moves: [string, (delta: Vec3, axes: { forward: Vec3; right: Vec3 }) => number][] = [
      ['KeyW', (d, a) => dot(d, a.forward)],
      ['KeyS', (d, a) => -dot(d, a.forward)],
      ['KeyD', (d, a) => dot(d, a.right)],
      ['KeyA', (d, a) => -dot(d, a.right)],
      ['KeyE', (d) => d[1]],
      ['KeyQ', (d) => -d[1]],
    ];
    for (const [key, along] of moves) {
      const before = await camera(page);
      await hold(page, key, 250);
      const after = await camera(page);
      const delta = sub(after.position, before.position);
      expect(along(delta, levelAxes(before)), `${key}: metres moved the way it should`).toBeGreaterThan(5);
      expect(distance(sub(after.target, before.target), delta), `${key}: the target moved with the camera`).toBeLessThan(1e-3);
      if (key !== 'KeyE' && key !== 'KeyQ') expect(Math.abs(delta[1]), `${key}: height kept`).toBeLessThan(1e-3);
    }
    const after = await facts(page);
    expect([after.follow, after.view]).toEqual([false, null]);
  });

  test('the arrows, Space, Home and End keep their timeline meaning in the orbit view', async ({ page }) => {
    // A view= keeps the follow camera off, so the camera stays put while the timeline moves.
    const f = await open(page, 'view=aerial-ne');
    await press(page, 'speed-4');
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    const cam = await camera(page);
    await page.keyboard.press('ArrowLeft');
    await waitForT(page, f.n - 1);
    await page.keyboard.press('ArrowRight');
    await waitForT(page, f.n);
    await page.keyboard.press('Home');
    await waitForT(page, 0);
    await page.keyboard.press('End');
    await waitForT(page, f.n);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'playing');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'paused');
    expect(distance((await camera(page)).position, cam.position), 'the camera did not move').toBeLessThan(1e-3);
    expect((await facts(page)).walk.mode).toBe('orbit');
  });
});

test.describe('walk mode', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('the Walk toggle and the F key enter and leave walk mode; a view-menu spawn enters it there', async ({ page }) => {
    await open(page, '');
    await press(page, 'walk-toggle');
    const first = await walking(page);
    const plaza = spawnById('plaza');
    if (plaza === undefined) throw new Error('No plaza spawn.');
    expect(first.spawn).toBe('plaza');
    expect(first.spawns).toEqual(expect.arrayContaining(['plaza', 'great-hall', 'second-floor']));
    expect(Math.hypot((first.eye?.[0] ?? 0) - plaza.feet[0], (first.eye?.[2] ?? 0) - plaza.feet[2]), 'on the plaza spawn').toBeLessThan(0.05);
    expect(first.onGround).toBe(true);
    await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('walk-status')).toBeVisible();
    expect((await facts(page)).follow, 'the follow camera is off while walking').toBe(false);
    // F leaves, with the orbit camera where the walker's eye was.
    await page.keyboard.press('KeyF');
    await orbiting(page);
    expect(distance((await camera(page)).position, first.eye ?? [0, 0, 0]), 'the orbit camera at the eye').toBeLessThan(0.01);
    await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('walk-status')).toBeHidden();
    // F enters again, where the walker stood; the toggle leaves.
    await page.keyboard.press('KeyF');
    const again = await walking(page);
    expect(distance(again.eye ?? [0, 0, 0], first.eye ?? [9, 9, 9]), 'back where it stood').toBeLessThan(0.01);
    await press(page, 'walk-toggle');
    await orbiting(page);
    // A spawn from the view menu.
    for (const [id, floor] of [['great-hall', MAIN_FLOOR_Y], ['second-floor', SECOND_FLOOR_Y]] as const) {
      await openMenu(page, 'view-menu');
      await press(page, `walk-spawn-${id}`);
      await page.waitForFunction((s) => window.__met?.walk.spawn === s && !window.__met.walk.preparing && window.__met.walk.eye !== null, id);
      const at = (await facts(page)).walk;
      expect(at.eye?.[1] ?? 0, `${id}: eye height`).toBeCloseTo(floor + EYE, 1);
      expect(at.onGround, `${id}: on the floor`).toBe(true);
    }
  });

  test('from the plaza, holding W walks forward and up the front steps; a drag turns the view; F returns to the orbit view', async ({ page }) => {
    // One deadline over the inner waits (the climb's 20 s, walking's 15 s, rest's 5 s, the page load), scaled as they are by the CPU throttle.
    test.setTimeout(60_000 * throttleRate());
    await open(page, 'walk=1&spawn=plaza');
    await throttle(page);
    const start = await walking(page);
    const ground = (start.eye?.[1] ?? Number.NaN) - EYE;
    expect(start.eye?.[2] ?? 0, 'standing in front of the steps').toBeGreaterThan(STEPS_BOTTOM_Z);
    // W is held until the eye has climbed 2 m up the steps, read from window.__met, not for a fixed time a loaded machine walks less in; then
    // the walker is let come to rest, so the eye read is the one F leaves from.
    await page.keyboard.down('KeyW');
    await page.waitForFunction((y) => (window.__met?.walk.eye?.[1] ?? 0) >= y, ground + EYE + 2, { timeout: 20_000 * throttleRate() });
    await page.keyboard.up('KeyW');
    const up = await rest(page);
    const eye = up.eye ?? [0, 0, 0];
    expect((start.eye?.[2] ?? 0) - eye[2], 'metres walked forward').toBeGreaterThan(8);
    expect(eye[1] - (ground + EYE), 'metres climbed up the front steps').toBeGreaterThan(1.5);
    expect(eye[1], 'no higher than the landing before the doors').toBeLessThan(LANDING_Y + EYE + 0.05);
    expect(up.onGround).toBe(true);
    // A drag to the right turns the view to the right (+X when facing −Z).
    const box = await page.getByTestId('canvas').boundingBox();
    if (box === null) throw new Error('The canvas has no box.');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k += 1) await page.mouse.move(x + k * 20, y);
    await page.mouse.up();
    await settle(page);
    const turned = (await facts(page)).walk.look ?? [0, 0, -1];
    expect(turned[0], 'the look direction turned right').toBeGreaterThan(0.3);
    await page.keyboard.press('KeyF');
    await orbiting(page);
    const orbit = await camera(page);
    expect(distance(orbit.position, eye), 'the orbit camera starts where the walker stood').toBeLessThan(0.2);
    expect(dot(sub(orbit.target, orbit.position), turned), 'and looks where it looked').toBeGreaterThan(4.9);
  });

  test('walking holds 60 frames a second, and the collision for the finished building builds within 2 s', async ({ page }) => {
    const f = await open(page, '');
    expect(f.t).toBe(f.n);
    await page.keyboard.press('KeyF');
    const ready = await walking(page);
    expect(ready.bvhMs ?? Number.POSITIVE_INFINITY, 'milliseconds to build the collision at t = N').toBeLessThan(2000);
    expect(ready.collision?.steps, 'every step is in the collision at t = N').toBe(f.n);
    expect(ready.collision?.triangles ?? 0).toBeGreaterThan(1_000_000);
    await page.keyboard.down('KeyW');
    const intervals = await page.evaluate(() => new Promise<number[]>((resolve) => {
      const times: number[] = [];
      const tick = (now: number): void => {
        times.push(now);
        if (times.length < 121) requestAnimationFrame(tick);
        else resolve(times.slice(1).map((t, i) => t - (times[i] ?? t)));
      };
      requestAnimationFrame(tick);
    }));
    await page.keyboard.up('KeyW');
    const median = (values: readonly number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? Number.NaN;
    const walked = (await facts(page)).walk;
    const gpu = await page.evaluate(() => window.__met?.benchmark(30) ?? Number.NaN);
    const report = `walking at t = N: collision ${String(ready.bvhMs)} ms for ${String(ready.collision?.triangles)} triangles; frame interval median ${median(intervals).toFixed(2)} ms, work median ${String(walked.frameMs)} ms, render with GPU sync ${gpu.toFixed(2)} ms`;
    console.log(report);
    expect(walked.frameMs ?? Number.POSITIVE_INFINITY, report).toBeLessThan(16.7);
    expect(gpu, report).toBeLessThan(16.7);
    expect(median(intervals), report).toBeLessThan(16.7 * 1.1);
    expect(await currentT(page)).toBe(f.n);
  });
});

/**
 * Opens the page with `query`, readies it with `prepare` and presses `codes` back to back, reopening until every keydown arrived in one frame (at
 * most 5 tries), so the keys after the first meet the mode the first one set before any frame has drawn it.
 */
async function pressedInOneFrame(page: Page, query: string, prepare: () => Promise<void>, codes: readonly string[]): Promise<Facts> {
  const seen: string[] = [];
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const f = await open(page, query);
    await prepare();
    const frames = await pressInOneGo(page, codes);
    if (frames.every((frame) => frame === frames[0])) return f;
    seen.push(frames.join('/'));
  }
  throw new Error(`The keys ${codes.join(', ')} never arrived within one frame in 5 tries (frames ${seen.join(', ')}), so nothing was tested.`);
}

test.describe('keys right after a key that changes the mode', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  const focusView = (page: Page) => async (): Promise<void> => {
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
  };

  test('F and then Space in one frame: walk mode takes Space, so the finished build stays paused at t = N', async ({ page }) => {
    const f = await pressedInOneFrame(page, '', focusView(page), ['KeyF', 'Space']);
    await walking(page);
    await settle(page);
    const after = await facts(page);
    expect([after.walk.mode, after.mode, after.t], 'walk mode, the player and t after F and Space').toEqual(['walk', 'paused', f.n]);
  });

  test('F and then ArrowLeft in one frame: the arrow walks instead of stepping the build back', async ({ page }) => {
    const f = await pressedInOneFrame(page, '', focusView(page), ['KeyF', 'ArrowLeft']);
    await walking(page);
    await settle(page);
    const after = await facts(page);
    expect([after.walk.mode, after.mode, after.t], 'walk mode, the player and t after F and ArrowLeft').toEqual(['walk', 'paused', f.n]);
  });

  test('F and then Space in one frame while walking: the orbit view takes Space, which plays the build', async ({ page }) => {
    const ready = async (): Promise<void> => {
      await focusView(page)();
      await page.keyboard.press('KeyF');
      await walking(page);
    };
    await pressedInOneFrame(page, '', ready, ['KeyF', 'Space']);
    await orbiting(page);
    await page.waitForFunction(() => window.__met?.mode === 'playing', undefined, { timeout: 5000 });
    expect((await facts(page)).walk.mode).toBe('orbit');
  });
});
