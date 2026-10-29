/**
 * The screen while walking (docs/design/spec.md, Walk mode: The screen; Page: Build replay), through real input at 1280×720 and 390×844, with the build
 * replay closed and open:
 * - closed, as the page opens: entering by the Walk toggle shows the view whole, a crosshair at its centre (where the projection is centred: the
 *   camera's aspect is the whole canvas's), the Build and View buttons and at the bottom right the Walk toggle alone; the label, scrubber, transport,
 *   speeds and floor picker are hidden; the status line's hint shows until the walker first walks; the Build menu's Build replay opens the replay with
 *   the whole bar, whose controls then work and step the build while walking, the view still the whole canvas; its Timeline button folds it and
 *   unfolds it; its close button closes the replay at the finished building, the Walk toggle alone again; the Walk toggle leaves, giving the orbit view
 *   no timeline and no crosshair; F enters again, the Walk toggle alone;
 * - open, by the Build menu in the orbit view: entering by the Walk toggle shows only the Timeline and Walk buttons at the bottom right; Timeline brings
 *   the whole bar back, whose controls work while walking, and folds it again; the Walk toggle leaves, giving the orbit view its whole bar and no
 *   crosshair; F enters again with the bar folded.
 * Every control in view is inside the viewport, unclipped and apart from the others and from the crosshair, in each state.
 * A click takes effect on the page's next frame (src/main.ts `frame`), so each state is read once the page's next frame has applied it, waiting for
 * the attribute that frame sets, which reports it: the Timeline button's `aria-expanded`, the Walk toggle's `aria-pressed`, the Build replay item's
 * `aria-checked`.
 * Bound: pointer lock is not available headless, so Esc and the locked look are not driven here; walk.spec drives the drag and the click.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { facts, open, openReplay, press, waitForT, watchErrors } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

/** The bar's controls a folded bar hides, those every walking screen shows, and the Timeline button, which shows while the build replay is open. */
const FOLDED_AWAY = ['step-label', 'step-detail', 'scrubber', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4', 'replay-close'];
const ALWAYS = ['chapter-menu-button', 'view-menu-button', 'walk-toggle'];
const TIMELINE = 'bar-toggle';

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
  return (await boxes(page, ids)).map((b) => b.id);
}

async function walking(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
}

for (const viewport of VIEWPORTS) {
  test.describe(`the walking screen at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('the replay closed: a crosshair at the centre, the menus and the Walk toggle alone; the hint goes at the first step; Build replay brings the whole bar, Timeline folds it, its close button closes the replay; Walk leaves', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page, '');
      await press(page, 'walk-toggle');
      await walking(page);
      const all = [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair', 'walk-status', ...f.floors.map((floor) => `floor-${floor.id}`), 'floor-all'];
      expect((await shown(page, all)).sort(), 'what walking shows with the replay closed').toEqual([...ALWAYS, 'crosshair', 'walk-status'].sort());
      const cross = (await boxes(page, ['crosshair']))[0];
      if (cross === undefined) throw new Error('No crosshair box.');
      expect(Math.abs(cross.x + cross.w / 2 - viewport.width / 2), 'the crosshair across: at the centre').toBeLessThan(1);
      expect(Math.abs(cross.y + cross.h / 2 - viewport.height / 2), 'the crosshair down: at the centre').toBeLessThan(1);
      expect((await facts(page)).camera.aspect, 'the walking view is the whole canvas, centred on the crosshair').toBeCloseTo(viewport.width / viewport.height, 3);
      expectLaidOut(await boxes(page, [...ALWAYS, 'crosshair', 'walk-status']), viewport, 'walking, the replay closed');
      // The hint goes at the first step.
      await page.keyboard.down('KeyW');
      await expect(page.getByTestId('walk-status')).toBeHidden();
      await page.keyboard.up('KeyW');
      // Build replay opens the replay with the whole bar; its controls work while walking, and the view stays the whole canvas.
      await openReplay(page);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'true');
      expect((await shown(page, [...FOLDED_AWAY, TIMELINE])).sort(), 'the whole bar').toEqual([...FOLDED_AWAY, TIMELINE].sort());
      expectLaidOut(await boxes(page, [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair']), viewport, 'walking, the replay opened');
      expect((await facts(page)).camera.aspect, 'the view still the whole canvas').toBeCloseTo(viewport.width / viewport.height, 3);
      await press(page, 'btn-step-back');
      await waitForT(page, f.n - 1);
      await press(page, 'btn-end');
      await waitForT(page, f.n);
      expect((await facts(page)).walk.mode, 'still walking').toBe('walk');
      // Timeline folds it and unfolds it again.
      await press(page, TIMELINE);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'false');
      expect(await shown(page, FOLDED_AWAY), 'folded').toEqual([]);
      expectLaidOut(await boxes(page, [...ALWAYS, TIMELINE, 'crosshair']), viewport, 'walking, the replay folded');
      await press(page, TIMELINE);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'true');
      // Its close button closes the replay at the finished building: the Walk toggle alone again.
      await press(page, 'btn-step-back');
      await waitForT(page, f.n - 1);
      await press(page, 'replay-close');
      await expect(page.getByTestId(TIMELINE)).toBeHidden();
      const closed = await facts(page);
      expect([closed.replay, closed.t, closed.mode, closed.walk.mode], 'replay, t, mode and walk mode once closed').toEqual([false, f.n, 'paused', 'walk']);
      expect((await shown(page, [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair'])).sort(), 'closed, while walking').toEqual([...ALWAYS, 'crosshair'].sort());
      // The Walk toggle leaves: the orbit view with no timeline and no crosshair.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
      expect((await shown(page, [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair', 'walk-status'])).sort(), 'the orbit view').toEqual([...ALWAYS].sort());
      // F enters again, the Walk toggle alone.
      await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
      await page.keyboard.press('KeyF');
      await walking(page);
      expect(await shown(page, [TIMELINE, ...FOLDED_AWAY]), 'entering again, the replay closed').toEqual([]);
      await page.keyboard.press('KeyF');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      errors.expectClean();
    });

    test('the replay open: the menus and the Timeline and Walk buttons; Timeline brings the whole bar back and folds it; Walk leaves to the whole bar', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page, '');
      await openReplay(page);
      await press(page, 'walk-toggle');
      await walking(page);
      const all = [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair', 'walk-status', ...f.floors.map((floor) => `floor-${floor.id}`), 'floor-all'];
      expect((await shown(page, all)).sort(), 'what walking shows with the replay open').toEqual([...ALWAYS, TIMELINE, 'crosshair', 'walk-status'].sort());
      expect((await facts(page)).camera.aspect, 'the walking view is the whole canvas, centred on the crosshair').toBeCloseTo(viewport.width / viewport.height, 3);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'false');
      expectLaidOut(await boxes(page, [...ALWAYS, TIMELINE, 'crosshair', 'walk-status']), viewport, 'walking, folded');
      // Timeline brings the whole bar back; its controls work while walking.
      await press(page, TIMELINE);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'true');
      expect((await shown(page, FOLDED_AWAY)).sort(), 'the unfolded bar').toEqual([...FOLDED_AWAY].sort());
      expectLaidOut(await boxes(page, [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair']), viewport, 'walking, unfolded');
      await press(page, 'btn-step-back');
      await waitForT(page, f.n - 1);
      await press(page, 'btn-end');
      await waitForT(page, f.n);
      expect((await facts(page)).walk.mode, 'still walking').toBe('walk');
      await press(page, TIMELINE);
      await expect(page.getByTestId(TIMELINE)).toHaveAttribute('aria-expanded', 'false');
      expect(await shown(page, FOLDED_AWAY), 'folded again').toEqual([]);
      // The Walk toggle leaves: the orbit view's whole bar, no crosshair, no Timeline button.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      await expect(page.getByTestId('walk-toggle')).toHaveAttribute('aria-pressed', 'false');
      expect((await shown(page, [...ALWAYS, TIMELINE, ...FOLDED_AWAY, 'crosshair', 'walk-status'])).sort(), 'the orbit view').toEqual([...ALWAYS, ...FOLDED_AWAY].sort());
      // F enters again, folded again.
      await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
      await page.keyboard.press('KeyF');
      await walking(page);
      expect(await shown(page, FOLDED_AWAY), 'entering again starts folded').toEqual([]);
      expect(await shown(page, [TIMELINE]), 'the Timeline button').toEqual([TIMELINE]);
      await page.keyboard.press('KeyF');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      errors.expectClean();
    });
  });
}
