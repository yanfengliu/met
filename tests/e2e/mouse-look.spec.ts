/**
 * Looking in walk mode with the mouse, and leaving it by Esc (docs/design/spec.md, Walk mode: Looking; Page: Keyboard; work unit 14, the owner,
 * 2026-10-28: "in first person the camera moves as the mouse moves. Pressing ESC cancels first person mode."), through real input in the system
 * Chrome, which grants pointer lock to a request made in a user's gesture:
 * - entered by the Walk toggle, F or a view-menu spawn, the pointer is locked and the mouse turns the view as it moves with no button held,
 *   LOOK_PER_PIXEL a pixel, right for right and down for down, a move of up to 160 px taken whole by the next frame (CDP Input.dispatchMouseEvent;
 *   the browser gives a locked move's movementX and movementY from the mouse's travel); the status line says so;
 * - entered at load (`walk=1`), with no gesture, the pointer stays free and a move with no button held turns nothing, until a click locks it;
 * - Esc leaves walk mode to the orbit view at the eye, as F does, the pointer locked or free; the lock lost while walking leaves it too; with a menu
 *   open, Esc closes the menu and the walk goes on, and the next Esc leaves;
 * - by touch at 390×844, a tap on the Walk toggle walks with no request for the lock (a probe counts the page's requests and passes them on), and a
 *   finger's drag turns the view LOOK_PER_PIXEL a pixel the way it moves.
 * Bound: headless Chrome hands Esc to the page and keeps the lock, where a desktop Chrome frees the lock on Esc and tells the page only that the lock
 * went; so the browser's own release is stood in for by `document.exitPointerLock()`, which the browser answers with the same `pointerlockchange`.
 * Where a move first meets the locked view its travel from the mouse's last place turns it too, so each turn is read from the view after a first move.
 * Red proofs: docs/learning/gate-proofs.md.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { distance, facts, open, openMenu, press, settle, watchErrors } from './helpers.js';

/** Waits until walk mode is on and prepared, and returns the walk facts. */
async function walking(page: Page): Promise<Awaited<ReturnType<typeof facts>>['walk']> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
  return (await facts(page)).walk;
}

async function orbiting(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'orbit', undefined, { timeout: 5000 });
}

/** Waits until the page says the pointer is locked to its view, or free. */
async function lockedIs(page: Page, locked: boolean): Promise<void> {
  await page.waitForFunction((l) => window.__met?.walk.pointerLocked === l && (document.pointerLockElement !== null) === l, locked, { timeout: 5000 });
}

/** The walker's yaw and pitch, read on the frame after the last input (yaw 0 faces −Z and grows turning left). */
async function angles(page: Page): Promise<{ yaw: number; pitch: number }> {
  await settle(page);
  const l = (await facts(page)).walk.look ?? [0, 0, -1];
  return { yaw: Math.atan2(-l[0], -l[2]), pitch: Math.asin(l[1]) };
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Moves the mouse with no button held, from (x, y) by (dx, dy), in one move: under the lock its travel turns the view. */
async function moveBy(page: Page, x: number, y: number, dx: number, dy: number): Promise<void> {
  await page.mouse.move(x, y);
  const before = await angles(page);
  await page.mouse.move(x + dx, y + dy);
  const after = await angles(page);
  expect(wrap(after.yaw - before.yaw), `a move of ${String(dx)} px across turns the view by ${String(-dx)} × LOOK_PER_PIXEL: right for right`).toBeCloseTo(-dx * LOOK_PER_PIXEL, 3);
  expect(after.pitch - before.pitch, `and of ${String(dy)} px down tilts it by ${String(-dy)} × LOOK_PER_PIXEL: down for down`).toBeCloseTo(-dy * LOOK_PER_PIXEL, 3);
}

/** Esc, or the browser's release, leaves walk mode to the orbit view where the walker's eye stood, the pointer free and the walk screen gone. */
async function leftAt(page: Page, eye: Vec3 | null, how: string): Promise<void> {
  await orbiting(page);
  await lockedIs(page, false);
  expect(distance((await facts(page)).camera.position, eye ?? [Number.NaN, 0, 0]), `${how}: the orbit camera at the eye`).toBeLessThan(0.01);
  await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('crosshair')).toBeHidden();
}

test.describe('mouse-look and Esc', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('entered by the Walk toggle, F or a view-menu spawn, the pointer locks and the mouse turns the view as it moves, no button held', async ({ page }) => {
    await open(page, '');
    await press(page, 'walk-toggle');
    await walking(page);
    await lockedIs(page, true);
    await expect(page.getByTestId('walk-status')).toHaveText('Walk mode. Move the mouse to look. W A S D or the arrows walk, Shift runs, Space jumps, Esc or F leaves.');
    await moveBy(page, 640, 360, 120, 0);
    await moveBy(page, 760, 360, 0, 80);
    await moveBy(page, 760, 440, -160, -40);
    await page.keyboard.press('KeyF');
    await orbiting(page);
    await lockedIs(page, false);
    await page.keyboard.press('KeyF');
    await walking(page);
    await lockedIs(page, true);
    await moveBy(page, 600, 440, 100, -60);
    await page.keyboard.press('Escape');
    await orbiting(page);
    await openMenu(page, 'view-menu');
    await press(page, 'walk-spawn-great-hall');
    await page.waitForFunction(() => window.__met?.walk.spawn === 'great-hall');
    await walking(page);
    await lockedIs(page, true);
    await moveBy(page, 640, 360, -90, 30);
  });

  test('entered at load with walk=1 the pointer stays free and a move turns nothing, until a click of the view locks it', async ({ page }) => {
    await open(page, 'walk=1&spawn=great-hall');
    await walking(page);
    expect((await facts(page)).walk.pointerLocked, 'no gesture at load: the pointer free').toBe(false);
    await expect(page.getByTestId('walk-status')).toHaveText(/^Walk mode\. Click the view to look with the mouse, or drag\./);
    await page.mouse.move(640, 360);
    const before = await angles(page);
    await page.mouse.move(790, 300);
    const after = await angles(page);
    expect([after.yaw - before.yaw, after.pitch - before.pitch], 'a free move with no button held').toEqual([0, 0]);
    await page.mouse.down();
    await page.mouse.up();
    await lockedIs(page, true);
    await moveBy(page, 790, 300, 140, 20);
  });

  test('Esc leaves walk mode to the orbit view at the eye, locked or free; so does the lock lost while walking; an open menu takes Esc first', async ({ page }) => {
    // Locked: entered by F.
    await open(page, '');
    await page.keyboard.press('KeyF');
    let at = await walking(page);
    await lockedIs(page, true);
    await page.keyboard.press('Escape');
    await leftAt(page, at.eye, 'Esc, the pointer locked');
    // Free: entered at load.
    await open(page, 'walk=1&spawn=plaza');
    at = await walking(page);
    expect(at.pointerLocked).toBe(false);
    await page.keyboard.press('Escape');
    await leftAt(page, at.eye, 'Esc, the pointer free');
    // The lock lost while walking, as the browser frees it on Esc.
    await open(page, '');
    await page.keyboard.press('KeyF');
    at = await walking(page);
    await lockedIs(page, true);
    await page.evaluate(() => { document.exitPointerLock(); });
    await leftAt(page, at.eye, 'the lock lost');
    // With a menu open, Esc closes it and the walk goes on; the next Esc leaves.
    await open(page, 'walk=1&spawn=plaza');
    at = await walking(page);
    await openMenu(page, 'view-menu');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('view-menu')).toBeHidden();
    await settle(page);
    expect((await facts(page)).walk.mode, 'the menu closed, still walking').toBe('walk');
    await page.keyboard.press('Escape');
    await leftAt(page, at.eye, 'the second Esc');
  });
});

test.describe('by touch at 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('a tap on the Walk toggle walks with no request for the lock, and a finger’s drag turns the view the way it moves', async ({ page }) => {
    const errors = watchErrors(page);
    // A probe that counts the page's requests for pointer lock and passes each on to the browser's own.
    await page.addInitScript(() => {
      const w = window as unknown as { lockRequests: number };
      w.lockRequests = 0;
      const proto = Element.prototype;
      const own = Reflect.get(proto, 'requestPointerLock') as (this: Element, ...args: unknown[]) => Promise<void>;
      Reflect.set(proto, 'requestPointerLock', function counted(this: Element, ...args: unknown[]) {
        w.lockRequests += 1;
        return own.apply(this, args);
      });
    });
    await open(page, '');
    await page.getByTestId('walk-toggle').tap();
    await walking(page);
    await settle(page);
    expect(await page.evaluate(() => (window as unknown as { lockRequests: number }).lockRequests), 'requests for the lock after a tap').toBe(0);
    expect((await facts(page)).walk.pointerLocked).toBe(false);
    const cdp = await page.context().newCDPSession(page);
    /** A finger pressed at (x, y), moved by (dx, dy) in 20 px steps and lifted. */
    const swipe = async (x: number, y: number, dx: number, dy: number): Promise<void> => {
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 20));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let k = 1; k <= steps; k += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * k) / steps, y: y + (dy * k) / steps }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const start = await angles(page);
    await swipe(120, 420, 120, 0);
    const right = await angles(page);
    expect(right.yaw - start.yaw, 'a finger dragged 120 px to the right turns right by 120 × LOOK_PER_PIXEL').toBeCloseTo(-120 * LOOK_PER_PIXEL, 3);
    await swipe(200, 360, 0, 60);
    const down = await angles(page);
    expect(down.pitch - right.pitch, 'dragged 60 px down, it looks down by 60 × LOOK_PER_PIXEL').toBeCloseTo(-60 * LOOK_PER_PIXEL, 3);
    expect(await page.evaluate(() => (window as unknown as { lockRequests: number }).lockRequests), 'requests for the lock after the drags').toBe(0);
    await cdp.detach();
    errors.expectClean();
  });
});
