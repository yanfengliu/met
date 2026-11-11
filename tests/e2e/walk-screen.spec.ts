/**
 * The screen while walking (docs/design/spec.md, Walk mode: The screen; Page: Walk toggle), through real input at 1280×720 and 390×844. The orbit view
 * shows the View menu's button, the floor picker and, in the walk strip at the bottom right, the Walk toggle; entering by the Walk toggle shows the view
 * whole, a crosshair at its centre (where the projection is centred: the camera's aspect is the whole canvas's), the View button and the walk strip
 * holding the Walk toggle alone, pressed, the floor picker hidden; the status line's hint shows until the walker first walks; the Walk toggle leaves,
 * giving the orbit view its controls again with no crosshair and no status line; F enters again, the same screen, and F leaves.
 * Every control in view is inside the viewport, unclipped and apart from the others and from the crosshair, in each state.
 * A click takes effect on the page's next frame (src/main.ts `frame`), so each state is read once the page's next frame has applied it, waiting for the
 * attribute that frame sets, which reports it: the Walk toggle's `aria-pressed`.
 * Bound: the browser gives these tests no pointer lock (./helpers.ts `noPointerLock`), as one without it does, so the mouse reaches the walking
 * screen's controls: a locked pointer reaches none, and Esc leaves walk mode first (work unit 14). ./mouse-look.spec.ts drives the lock, the locked
 * look and Esc, ./walk.spec.ts the drag and the click.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { facts, noPointerLock, open, press, watchErrors } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

/** The controls every screen shows, walking or not: the View menu's button and the walk strip's Walk toggle. */
const ALWAYS = ['view-menu-button', 'walk-toggle'];

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly clipped: boolean;
}

/** Boxes of every visible element with a data-testid among `ids`, by layout. */
async function boxes(page: Page, ids: readonly string[]): Promise<Box[]> {
  return page.evaluate((list) => list.flatMap((id) => {
    const e = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (e === null || e.getClientRects().length === 0 || getComputedStyle(e).visibility === 'hidden') return [];
    const r = e.getBoundingClientRect();
    return [{ id, x: r.x, y: r.y, w: r.width, h: r.height, clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 }];
  }), ids);
}

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** Every box inside the viewport, unclipped and apart from every other. */
function expectLaidOut(list: readonly Box[], viewport: { width: number; height: number }, what: string): void {
  for (const b of list) {
    expect(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= viewport.width + 0.5 && b.y + b.h <= viewport.height + 0.5, `${what}: ${b.id} inside the viewport`).toBe(true);
    if (b.id !== 'crosshair') expect(b.clipped, `${what}: ${b.id} clips its content`).toBe(false);
  }
  const pairs = list.flatMap((a, i) => list.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id} / ${b.id}`));
  expect(pairs, `${what}: overlapping`).toEqual([]);
}

async function shown(page: Page, ids: readonly string[]): Promise<string[]> {
  return (await boxes(page, ids)).map((b) => b.id).sort();
}

/** The data-testids of what the walk strip holds. */
async function stripHolds(page: Page): Promise<string[]> {
  return page.getByTestId('walk-strip').locator('[data-testid]').evaluateAll((list) => list.map((e) => e.dataset['testid'] ?? '?'));
}

/** Waits until walk mode is on and prepared, the pointer free: the browser gave no lock (`noPointerLock`). */
async function walking(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
  expect((await facts(page)).walk.pointerLocked, 'walking with the pointer free').toBe(false);
}

for (const viewport of VIEWPORTS) {
  test.describe(`the walking screen at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('a crosshair at the centre, the View button and the walk strip’s Walk toggle alone; the hint goes at the first step; Walk leaves to the orbit view’s controls; F enters again', async ({ page }) => {
      const errors = watchErrors(page);
      await noPointerLock(page);
      const f = await open(page);
      const floors = ['floor-all', ...f.floors.map((floor) => `floor-${floor.id}`)];
      const all = [...ALWAYS, 'crosshair', 'walk-status', ...floors];
      const orbit = [...ALWAYS, ...floors].sort();
      expect(await shown(page, all), 'the orbit view at load').toEqual(orbit);
      expect(await stripHolds(page), 'the walk strip in the orbit view').toEqual(['walk-toggle']);
      await press(page, 'walk-toggle');
      await walking(page);
      await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'true');
      expect(await shown(page, all), 'what walking shows').toEqual([...ALWAYS, 'crosshair', 'walk-status'].sort());
      expect(await stripHolds(page), 'the walk strip while walking: the Walk toggle alone').toEqual(['walk-toggle']);
      const cross = (await boxes(page, ['crosshair']))[0];
      if (cross === undefined) throw new Error('No crosshair box.');
      expect(Math.abs(cross.x + cross.w / 2 - viewport.width / 2), 'the crosshair across: at the centre').toBeLessThan(1);
      expect(Math.abs(cross.y + cross.h / 2 - viewport.height / 2), 'the crosshair down: at the centre').toBeLessThan(1);
      expect((await facts(page)).camera.aspect, 'the walking view is the whole canvas, centred on the crosshair').toBeCloseTo(viewport.width / viewport.height, 3);
      expectLaidOut(await boxes(page, [...ALWAYS, 'crosshair', 'walk-status']), viewport, 'walking');
      // The hint goes at the first step.
      await page.keyboard.down('KeyW');
      await expect(page.getByTestId('walk-status')).toBeHidden();
      await page.keyboard.up('KeyW');
      expectLaidOut(await boxes(page, [...ALWAYS, 'crosshair']), viewport, 'walking, the hint gone');
      // The Walk toggle leaves: the orbit view's controls again, no crosshair and no status line.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
      expect(await shown(page, all), 'the orbit view').toEqual(orbit);
      expectLaidOut(await boxes(page, orbit), viewport, 'the orbit view');
      // F enters again, the same screen; F leaves.
      await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
      await page.keyboard.press('KeyF');
      await walking(page);
      expect(await shown(page, [...ALWAYS, 'crosshair', ...floors]), 'entering again').toEqual([...ALWAYS, 'crosshair'].sort());
      expect(await stripHolds(page), 'the walk strip, entering again').toEqual(['walk-toggle']);
      await page.keyboard.press('KeyF');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      errors.expectClean();
    });
  });
}
