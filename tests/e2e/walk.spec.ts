/**
 * Walk mode and the orbit view's movement keys through real input (docs/design/spec.md, Keyboard and Walk mode): the orbit keys move the camera and
 * its target together, and the preset in view goes off; the Walk toggle, the F key, a view-menu spawn and `?walk=1&spawn=` enter walk mode, the
 * first three locking the pointer, and F and Esc leave it; on the real model, holding W walks from the plaza up the front steps; entered at load,
 * the pointer free, a drag turns the view the way the pointer moves, LOOK_PER_PIXEL a pixel, and only a press that travels under CLICK_SLOP (5 px)
 * asks for pointer lock (a probe counts the requests; ./mouse-look.spec.ts drives the locked look); F returns to the orbit view where the walker stood;
 * a key right after F within one frame (sent back to back through CDP, a probe's frame count confirming they shared a frame) takes the new mode's
 * meaning, both ways: entering, Space (a jump) and ArrowLeft (a walk) are walk mode's, which keeps them from the browser, where the orbit view would
 * leave them to it; leaving, Page Down is the orbit view's, which goes down a floor, where walk mode would leave it alone.
 * Facts come from `window.__met.walk`, `window.__met.camera` and `window.__met.floor`; spawn positions from src/walk/spawns.ts; levels from
 * src/model/frame.ts.
 * On the finished building the collision builds within 2 s, and frames keep the median work and the mean GPU-synced render under 16.7 ms and the
 * median frame interval under 18.37 ms (16.7 ms plus 10%, ./helpers.ts `expectWalkingBudget`) with the look target on: walking on the plaza, running
 * up the front steps, walking from the Great Hall and second-floor spawns, and, unthrottled, walking and then running at the ends of R3 and R4 in the
 * Temple of Dendur hall and the Leon Levy and Shelby White Court (./routes.spec.ts). These timing budgets are asserted only under `npm run budgets`, which
 * runs the tests tagged `@budget` with MET_BUDGETS=1; `npm run verify` measures and prints them (./helpers.ts `budgetCheck`, work unit 30).
 * Bound: the walk goes up the front steps, not through the doors (work unit 1, M2), W held until the eye has climbed 2 m and the eye read once the
 * walker stands still, so a loaded machine changes how long it takes, not where it ends, within a timeout of 60 s times the CPU throttle; frame times are this machine's (an RTX 4090 in headless Chrome);
 * "the same frame" is checked by a probe's requestAnimationFrame count at each keydown, and a run whose keys never shared a frame fails, not passes;
 * which mode took Space or ArrowLeft is read from the page's answer to the key, whether it kept the key from the browser (`defaultPrevented`, as a
 * probe's listener that runs after the page's own sees it), since walk mode's jump waits for the walk to be ready and the orbit view has no meaning for
 * either key any more; each of the three first shows the probe the answer the wrong mode gives (the key alone in the mode before F), so it can fail.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { LANDING_Y, MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEPS_BOTTOM_Z } from '../../src/model/frame.js';
import { spawnById } from '../../src/walk/spawns.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { budgetCheck, camera, distance, expectWalkingBudget, facts, open, openMenu, press, settle, throttle, throttleRate, walkingBudget, watchErrors } from './helpers.js';
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
  PageDown: { key: 'PageDown', keyCode: 34 },
};

/** For each keydown the probe saw, in order: the frame it arrived in, and whether the page kept it from the browser. */
interface Downs {
  readonly frames: readonly number[];
  readonly prevented: readonly boolean[];
}

/**
 * Presses and releases each key of `codes` in order, as real input sent back to back, and returns the frame each keydown arrived in, counted by a
 * probe's own requestAnimationFrame loop installed beside the page's, and whether the page kept each from the browser (`defaultPrevented`, read by a
 * listener on the window added after the page's own, so it runs after them). The probe reads nothing of the page's state and writes none. Keys that
 * share a frame number arrived with no frame of the page between them.
 */
async function pressInOneGo(page: Page, codes: readonly string[]): Promise<Downs> {
  await page.evaluate(() => {
    const w = window as unknown as { keyProbe?: { frame: number; downs: [string, number][]; prevented: boolean[] } };
    if (w.keyProbe !== undefined) return;
    const probe = { frame: 0, downs: [] as [string, number][], prevented: [] as boolean[] };
    const tick = (): void => {
      probe.frame += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.addEventListener('keydown', (event) => { probe.downs.push([event.code, probe.frame]); }, true);
    window.addEventListener('keydown', (event) => { probe.prevented.push(event.defaultPrevented); });
    w.keyProbe = probe;
  });
  await page.evaluate(() => {
    const probe = (window as unknown as { keyProbe: { downs: unknown[]; prevented: unknown[] } }).keyProbe;
    probe.downs.length = 0;
    probe.prevented.length = 0;
  });
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
  const { downs, prevented } = await page.evaluate(() => (window as unknown as { keyProbe: { downs: [string, number][]; prevented: boolean[] } }).keyProbe);
  expect(downs.map(([code]) => code), 'the keydowns the page received').toEqual([...codes]);
  expect(prevented.length, 'keydowns that reached the listener after the page’s own').toBe(codes.length);
  return { frames: downs.map(([, frame]) => frame), prevented };
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

  test('W S A D move the camera and its target together over the ground, Q and E down and up, and the preset in view goes off', async ({ page }) => {
    const f = await open(page, '');
    expect(f.view, 'the preset in view at load').toBe('aerial-ne');
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
    expect((await facts(page)).view, 'the preset in view after the keys').toBeNull();
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

  test('the Walk toggle, the F key and a view-menu spawn enter walk mode, there, the pointer locked; F and Esc leave it', async ({ page }) => {
    await open(page, '');
    await press(page, 'walk-toggle');
    const first = await walking(page);
    // Entered by a mouse's click: the pointer locked to the view (./mouse-look.spec.ts drives the locked look).
    await page.waitForFunction(() => window.__met?.walk.pointerLocked === true);
    const plaza = spawnById('plaza');
    if (plaza === undefined) throw new Error('No plaza spawn.');
    expect(first.spawn).toBe('plaza');
    expect(first.spawns).toEqual(expect.arrayContaining(['plaza', 'great-hall', 'second-floor']));
    expect(Math.hypot((first.eye?.[0] ?? 0) - plaza.feet[0], (first.eye?.[2] ?? 0) - plaza.feet[2]), 'on the plaza spawn').toBeLessThan(0.05);
    // The toggle's click and the lock it took turned nothing: on the plaza spawn's line, the entrance axis, looking as the spawn does, along its facing at
    // its pitch, the look the walker's own in doubles (src/walk/walker.ts `look`; review 28, F84; review 29, F94).
    const locked = await rest(page);
    expect(plaza.facing, 'the plaza spawn faces −Z, along the entrance axis').toEqual([0, -1]);
    const pitch = (plaza.pitch * Math.PI) / 180;
    const view = [0, Math.sin(pitch), -Math.cos(pitch)].map((v) => expect.closeTo(v, 9));
    expect([locked.eye?.[0], ...(locked.look ?? [])], 'the pointer locked: on the plaza spawn’s line, looking as the spawn does').toEqual([expect.closeTo(plaza.feet[0], 9), ...view]);
    expect(first.onGround).toBe(true);
    expect(first.target, 'the look target: nothing tagged in reach on the plaza').toBeNull();
    await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('walk-status')).toBeVisible();
    // F leaves, with the orbit camera where the walker's eye was.
    await page.keyboard.press('KeyF');
    await orbiting(page);
    expect(distance((await camera(page)).position, first.eye ?? [0, 0, 0]), 'the orbit camera at the eye').toBeLessThan(0.01);
    await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('walk-status')).toBeHidden();
    // F enters again, where the walker stood; Esc leaves, as F does. The toggle leaves only a free pointer, which ./walk-screen.spec.ts drives: a locked one reaches no control.
    await page.keyboard.press('KeyF');
    const again = await walking(page);
    expect(distance(again.eye ?? [0, 0, 0], first.eye ?? [9, 9, 9]), 'back where it stood').toBeLessThan(0.01);
    await page.keyboard.press('Escape');
    await orbiting(page);
    // A spawn from the view menu, the pointer locked there too; Esc leaves, and the view menu is reached again.
    for (const [id, floor] of [['great-hall', MAIN_FLOOR_Y], ['second-floor', SECOND_FLOOR_Y]] as const) {
      await openMenu(page, 'view-menu');
      await press(page, `walk-spawn-${id}`);
      await page.waitForFunction((s) => window.__met?.walk.spawn === s && !window.__met.walk.preparing && window.__met.walk.eye !== null, id);
      const at = (await facts(page)).walk;
      expect(at.eye?.[1] ?? 0, `${id}: eye height`).toBeCloseTo(floor + EYE, 1);
      expect(at.onGround, `${id}: on the floor`).toBe(true);
      await page.waitForFunction(() => window.__met?.walk.pointerLocked === true);
      await page.keyboard.press('Escape');
      await orbiting(page);
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
    expect(turned[0], 'the look direction turned right, by about 200 × LOOK_PER_PIXEL').toBeGreaterThan(0.9 * Math.sin(200 * LOOK_PER_PIXEL));
    await page.keyboard.press('KeyF');
    await orbiting(page);
    const orbit = await camera(page);
    expect(distance(orbit.position, eye), 'the orbit camera starts where the walker stood').toBeLessThan(0.2);
    expect(dot(sub(orbit.target, orbit.position), turned), 'and looks where it looked').toBeGreaterThan(4.9);
  });

  test('a drag turns the view the way the pointer moves, LOOK_PER_PIXEL a pixel; a press that travels under 5 px is a click, which asks for pointer lock', async ({ page }) => {
    await open(page, 'walk=1&spawn=great-hall');
    await walking(page);
    // A probe that counts the page's requests for pointer lock and passes each on to the browser's own.
    await page.evaluate(() => {
      const w = window as unknown as { lockRequests: number };
      w.lockRequests = 0;
      const proto = HTMLCanvasElement.prototype;
      const own = Reflect.get(proto, 'requestPointerLock') as (this: HTMLCanvasElement, ...args: unknown[]) => Promise<void>;
      Reflect.set(proto, 'requestPointerLock', function (this: HTMLCanvasElement, ...args: unknown[]) {
        w.lockRequests += 1;
        return own.apply(this, args);
      });
    });
    const requests = (): Promise<number> => page.evaluate(() => (window as unknown as { lockRequests: number }).lockRequests);
    const angles = async (): Promise<{ yaw: number; pitch: number }> => {
      await settle(page);
      const l = (await facts(page)).walk.look ?? [0, 0, -1];
      return { yaw: Math.atan2(-l[0], -l[2]), pitch: Math.asin(l[1]) };
    };
    const box = await page.getByTestId('canvas').boundingBox();
    if (box === null) throw new Error('The canvas has no box.');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    /** A press at the centre that travels through `path` (offsets in pixels) and is released at its last point. */
    const press = async (path: readonly (readonly [number, number])[]): Promise<void> => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (const [dx, dy] of path) await page.mouse.move(x + dx, y + dy);
      await page.mouse.up();
    };
    const start = await angles();
    await press(Array.from({ length: 10 }, (_, k) => [20 * (k + 1), 0] as const));
    const right = await angles();
    expect(right.yaw - start.yaw, 'a drag 200 px to the right turns right by 200 × LOOK_PER_PIXEL').toBeCloseTo(-200 * LOOK_PER_PIXEL, 3);
    expect(right.pitch - start.pitch, 'and does not tilt').toBeCloseTo(0, 6);
    await press(Array.from({ length: 5 }, (_, k) => [0, 20 * (k + 1)] as const));
    const down = await angles();
    expect(down.pitch - right.pitch, 'a drag 100 px down looks down by 100 × LOOK_PER_PIXEL').toBeCloseTo(-100 * LOOK_PER_PIXEL, 3);
    expect(await requests(), 'a drag asks for no pointer lock').toBe(0);
    // A press that travels 6 px is a drag (it turns the view 6 × LOOK_PER_PIXEL); one that travels 3 px, out and back, is a click.
    await press([[3, 0], [6, 0]]);
    expect(await requests(), `a press that travels ${String(CLICK_SLOP + 1)} px asks for none`).toBe(0);
    await press([[1, 0], [2, 0], [1, 0]]);
    expect(await requests(), `a press that travels under ${String(CLICK_SLOP)} px is a click, which asks for pointer lock once`).toBe(1);
  });

  test('walking holds 60 frames a second with the look target on, on the plaza, in the Great Hall and at the top of the Grand Staircase; the collision builds within 2 s', { tag: '@budget' }, async ({ page }) => {
    // About 5 s here (4.7 to 9.2 s in the runs of 2026-11-11, frames slowed by plants among them); nine times that for a loaded machine (review 0, F10).
    test.setTimeout(45_000);
    const f = await open(page, '');
    await page.keyboard.press('KeyF');
    const ready = await walking(page);
    console.log(`collision of the finished building: ${String(ready.bvhMs)} ms for ${String(ready.collision?.triangles)} triangles`);
    budgetCheck('the collision’s build', ready.bvhMs ?? Number.NaN, () => { expect(ready.bvhMs ?? Number.POSITIVE_INFINITY, 'milliseconds to build the collision of the finished building').toBeLessThan(2000); });
    expect(ready.collision?.steps, 'every step is in the collision').toBe(f.steps.length);
    expect(ready.collision?.triangles ?? 0).toBeGreaterThan(1_000_000);
    // Walking and running from the plaza, then from the view menu's spawns in the populated interiors (the hall's desk, columns and domes; the stair's
    // colonnades and vault): each frame walks, finds the look target and renders.
    expectWalkingBudget(await walkingBudget(page), 'on the plaza');
    expectWalkingBudget(await walkingBudget(page, true), 'running up the front steps');
    for (const id of ['great-hall', 'second-floor']) {
      // F locked the pointer, which reaches no menu: Esc leaves walk mode first, as a visitor does, and the spawn enters it again.
      await page.keyboard.press('Escape');
      await orbiting(page);
      await openMenu(page, 'view-menu');
      await press(page, `walk-spawn-${id}`);
      await page.waitForFunction((s) => window.__met?.walk.spawn === s && !window.__met.walk.preparing && window.__met.walk.eye !== null, id);
      // Read at the spawn, before the sample walks on: how far its frames carry the walker hangs on the frame rate (work unit 30, review 0, F10).
      await settle(page);
      expect((await facts(page)).walk.target, `${id}: no door or artwork in reach of the spawn's view`).toBeNull();
      expectWalkingBudget(await walkingBudget(page), `from the ${id} spawn`);
    }
  });
});

/**
 * Opens the page with `query`, readies it with `prepare` and presses `codes` back to back, reopening until every keydown arrived in one frame (at
 * most 5 tries), so the keys after the first meet the mode the first one set before any frame has drawn it.
 */
async function pressedInOneFrame(page: Page, query: string, prepare: () => Promise<void>, codes: readonly string[]): Promise<{ readonly facts: Facts; readonly prevented: readonly boolean[] }> {
  const seen: string[] = [];
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const f = await open(page, query);
    await prepare();
    const { frames, prevented } = await pressInOneGo(page, codes);
    if (frames.every((frame) => frame === frames[0])) return { facts: f, prevented };
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

  /** Focuses the view, then presses `code` alone in the orbit view, which leaves it to the browser: the probe sees the answer the wrong mode would give. */
  const orbitLeaves = (page: Page, code: string) => async (): Promise<void> => {
    await focusView(page)();
    expect((await pressInOneGo(page, [code])).prevented, `${code} alone in the orbit view, left to the browser`).toEqual([false]);
  };

  test('F and then Space in one frame: walk mode takes Space, a jump, and keeps it from the browser, where the orbit view leaves it', async ({ page }) => {
    const { prevented } = await pressedInOneFrame(page, '', orbitLeaves(page, 'Space'), ['KeyF', 'Space']);
    await walking(page);
    expect(prevented, 'F and then Space kept from the browser: walk mode had Space').toEqual([true, true]);
    expect((await facts(page)).walk.mode, 'walking after F and Space').toBe('walk');
  });

  test('F and then ArrowLeft in one frame: walk mode takes the arrow, a walk, and keeps it from the browser, where the orbit view leaves it', async ({ page }) => {
    const { prevented } = await pressedInOneFrame(page, '', orbitLeaves(page, 'ArrowLeft'), ['KeyF', 'ArrowLeft']);
    await walking(page);
    expect(prevented, 'F and then ArrowLeft kept from the browser: walk mode had the arrow').toEqual([true, true]);
    expect((await facts(page)).walk.mode, 'walking after F and ArrowLeft').toBe('walk');
  });

  test('F and then Page Down in one frame while walking: the orbit view takes Page Down, which goes down a floor, where walk mode ignores it', async ({ page }) => {
    const ready = async (): Promise<void> => {
      await focusView(page)();
      await page.keyboard.press('KeyF');
      await walking(page);
      // Walking, Page Down alone is left to the browser and the floor stays All: the answer the wrong mode would give.
      expect((await pressInOneGo(page, ['PageDown'])).prevented, 'Page Down alone while walking, left to the browser').toEqual([false]);
      expect((await facts(page)).floor.id, 'the floor after Page Down alone while walking').toBe('all');
    };
    const { facts: f, prevented } = await pressedInOneFrame(page, '', ready, ['KeyF', 'PageDown']);
    await orbiting(page);
    // Page Down from All goes to the top floor (src/viewer/floors.ts `floorStep`).
    const top = f.floors.at(-1);
    if (top === undefined) throw new Error('No floor in window.__met.floors.');
    await page.waitForFunction((id) => window.__met?.floor.id === id, top.id, { timeout: 5000 });
    expect(prevented, 'F and then Page Down kept from the browser: the orbit view had Page Down').toEqual([true, true]);
    expect((await facts(page)).walk.mode).toBe('orbit');
  });
});
