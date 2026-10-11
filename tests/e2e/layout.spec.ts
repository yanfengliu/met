/**
 * Page layout at 1280x720 and 390x844: every control is visible, inside the viewport, unclipped and clear of every other control, with each menu
 * open and closed; open panels stay above the timeline bar. Also the build-time budget (docs/design/spec.md, Budgets: all geometry in under 4 s).
 * Bound: boxes are compared as rectangles from layout, so a control hidden under a translucent sibling with no overlap of boxes is not caught.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { open, openMenu, watchErrors } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly clipped: boolean;
}

/** Boxes of visible controls (buttons and inputs with a data-testid) under `scope`, and whether any clips its own content. */
async function controlBoxes(page: Page, scope: string): Promise<Box[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (root === null) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('button[data-testid], input[data-testid], output[data-testid], [data-testid="step-label"], [data-testid="step-detail"]'))
      .filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { id: e.dataset['testid'] ?? '?', x: r.x, y: r.y, w: r.width, h: r.height, clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 };
      });
  }, scope);
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
}

function expectLaidOut(boxes: readonly Box[], viewport: { width: number; height: number }, what: string): void {
  expect(boxes.length, `${what}: controls found`).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.w * b.h, `${what}: ${b.id} has an empty box`).toBeGreaterThan(0);
    expect(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= viewport.width + 0.5 && b.y + b.h <= viewport.height + 0.5, `${what}: ${b.id} lies outside the viewport`).toBe(true);
    expect(b.clipped, `${what}: ${b.id} clips its content`).toBe(false);
  }
  const pairs = boxes.flatMap((a, i) => boxes.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id} / ${b.id}`));
  expect(pairs, `${what}: overlapping controls`).toEqual([]);
}

for (const viewport of VIEWPORTS) {
  test.describe(`layout at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('controls are visible, inside the viewport, unclipped and apart; panels stay above the bar', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page, 'autoplay=0&t=0.5');
      expectLaidOut([...(await controlBoxes(page, '.met-bar')), ...(await controlBoxes(page, '.met-menus'))], viewport, 'menus closed');
      const bar = await page.getByTestId('timeline-bar').boundingBox();
      if (bar === null) throw new Error('The timeline bar has no box.');
      expect(bar.y + bar.height).toBeLessThanOrEqual(viewport.height + 0.5);
      for (const menu of ['chapter-menu', 'view-menu'] as const) {
        await openMenu(page, menu);
        const panel = await page.getByTestId(menu).boundingBox();
        if (panel === null) throw new Error(`The ${menu} panel has no box.`);
        expect(panel.x >= 0 && panel.x + panel.width <= viewport.width, `${menu} fits the viewport width`).toBe(true);
        expect(panel.y + panel.height, `${menu} ends above the timeline bar`).toBeLessThanOrEqual(bar.y + 0.5);
        const inside = (await controlBoxes(page, `[data-testid="${menu}"]`)).filter((b) => b.y >= panel.y - 0.5 && b.y + b.h <= panel.y + panel.height + 0.5);
        expect(inside.length, `${menu}: controls in view`).toBeGreaterThan(0);
        expectLaidOut(inside, viewport, `${menu} open`);
        await page.keyboard.press('Escape');
      }
      expect(f.chapters.length).toBeGreaterThan(0);
      errors.expectClean();
    });
  });
}

test('the whole sequence builds within the 4 s budget', async ({ page }) => {
  const errors = watchErrors(page);
  const f = await open(page);
  expect(f.perf.buildMs, `build time ${f.perf.buildMs.toFixed(0)} ms`).toBeLessThan(4000);
  expect(f.stats.triangles).toBeLessThanOrEqual(3_000_000);
  expect(f.stats.meshes).toBeLessThanOrEqual(900);
  errors.expectClean();
});
