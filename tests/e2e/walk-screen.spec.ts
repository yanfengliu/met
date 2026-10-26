/**
 * The screen while walking (docs/design/spec.md, Walk mode: The screen), through real input at 1280×720 and 390×844: entering by the Walk toggle shows
 * the view whole, a crosshair at its centre (where the projection is centred: the camera's aspect is the whole canvas's), the Chapters and View
 * buttons, and at the bottom right only the Timeline and Walk buttons; the label, scrubber, transport, speeds and floor picker are hidden; the status
 * line's hint shows until the walker first walks; Timeline brings the whole bar back, whose controls then work and step the build while walking, and
 * folds it again; the Walk toggle leaves, giving the orbit view its whole bar and no crosshair; F enters again with the bar folded. Every control in
 * view is inside the viewport, unclipped and apart from the others and from the crosshair, folded and unfolded.
 * Bound: pointer lock is not available headless, so Esc and the locked look are not driven here; walk.spec drives the drag and the click.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { facts, open, press, waitForT, watchErrors } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

/** The bar's controls a folded bar hides, and those every walking screen shows. */
const FOLDED_AWAY = ['step-label', 'step-detail', 'scrubber', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4'];
const ALWAYS = ['chapter-menu-button', 'view-menu-button', 'bar-toggle', 'walk-toggle'];

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

    test('a crosshair at the centre, the menus and the Timeline and Walk buttons; the hint goes at the first step; Timeline brings the bar back and folds it; Walk leaves', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page, '');
      await press(page, 'walk-toggle');
      await walking(page);
      const all = [...ALWAYS, ...FOLDED_AWAY, 'crosshair', 'walk-status', ...f.floors.map((floor) => `floor-${floor.id}`), 'floor-all'];
      expect((await shown(page, all)).sort(), 'what walking shows').toEqual([...ALWAYS, 'crosshair', 'walk-status'].sort());
      const cross = (await boxes(page, ['crosshair']))[0];
      if (cross === undefined) throw new Error('No crosshair box.');
      expect(Math.abs(cross.x + cross.w / 2 - viewport.width / 2), 'the crosshair across: at the centre').toBeLessThan(1);
      expect(Math.abs(cross.y + cross.h / 2 - viewport.height / 2), 'the crosshair down: at the centre').toBeLessThan(1);
      expect((await facts(page)).camera.aspect, 'the walking view is the whole canvas, centred on the crosshair').toBeCloseTo(viewport.width / viewport.height, 3);
      await expect(page.getByTestId('bar-toggle')).toHaveAttribute('aria-expanded', 'false');
      expectLaidOut(await boxes(page, [...ALWAYS, 'crosshair', 'walk-status']), viewport, 'walking, folded');
      // The hint goes at the first step.
      await page.keyboard.down('KeyW');
      await expect(page.getByTestId('walk-status')).toBeHidden();
      await page.keyboard.up('KeyW');
      // Timeline brings the whole bar back; its controls work while walking.
      await press(page, 'bar-toggle');
      await expect(page.getByTestId('bar-toggle')).toHaveAttribute('aria-expanded', 'true');
      expect((await shown(page, FOLDED_AWAY)).sort(), 'the unfolded bar').toEqual([...FOLDED_AWAY].sort());
      expectLaidOut(await boxes(page, [...ALWAYS, ...FOLDED_AWAY, 'crosshair']), viewport, 'walking, unfolded');
      await press(page, 'btn-step-back');
      await waitForT(page, f.n - 1);
      await press(page, 'btn-end');
      await waitForT(page, f.n);
      expect((await facts(page)).walk.mode, 'still walking').toBe('walk');
      await press(page, 'bar-toggle');
      expect(await shown(page, FOLDED_AWAY), 'folded again').toEqual([]);
      // The Walk toggle leaves: the orbit view's whole bar, no crosshair, no Timeline button.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      expect((await shown(page, [...ALWAYS, ...FOLDED_AWAY, 'crosshair', 'walk-status'])).sort(), 'the orbit view').toEqual([...ALWAYS.filter((id) => id !== 'bar-toggle'), ...FOLDED_AWAY].sort());
      // F enters again, folded again.
      await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
      await page.keyboard.press('KeyF');
      await walking(page);
      expect(await shown(page, FOLDED_AWAY), 'entering again starts folded').toEqual([]);
      await page.keyboard.press('KeyF');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      errors.expectClean();
    });
  });
}
