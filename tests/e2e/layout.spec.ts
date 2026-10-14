/**
 * Page layout at 1280x720 and 390x844: every control the spec requires is on the page once and visible (checked by data-testid before any geometry,
 * so a hidden control fails rather than drops out), inside the viewport, unclipped and clear of every other control, with each menu open and closed;
 * open panels stay above the timeline bar and each of their controls can be scrolled into them. Also the build-time budget (docs/design/spec.md,
 * Budgets: all geometry in under 4 s).
 * Bound: boxes are compared as rectangles from layout, so a control hidden under a translucent sibling with no overlap of boxes is not caught.
 * Bound of the build budget: it times the whole interval from navigation start to `window.__shotReady` (perf.readyMs) on the Vite dev server in
 * headless Chrome on this machine, so it covers loading the modules (with every geometry they build on import), the timeline build, starting the
 * renderer and the first five frames. That makes it an upper bound on geometry build time, not a measure of it; perf.buildMs, the timeline build
 * alone, is reported beside it and misses geometry built at import.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { open, openMenu, watchErrors } from './helpers.js';
import type { Facts } from './helpers.js';

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

/**
 * The controls docs/design/spec.md (Page) requires, by data-testid: the timeline bar's and the two menu buttons with the menus closed, and each menu's
 * items when it is open. Chapters and presets come from `window.__met`; the rest is the spec's own list, not read from the page.
 */
function requiredControls(f: Facts): { readonly closed: readonly string[]; readonly 'chapter-menu': readonly string[]; readonly 'view-menu': readonly string[] } {
  return {
    closed: [
      'step-label', 'step-detail', 'scrubber',
      'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end',
      'speed-0.5', 'speed-1', 'speed-2', 'speed-4',
      'chapter-menu-button', 'view-menu-button',
    ],
    'chapter-menu': f.chapters.map((c) => `chapter-${c.id}`),
    'view-menu': [...f.presets.map((p) => `preset-${p.id}`), 'follow-toggle', 'cut-toggle', 'cut-slider', 'cut-value'],
  };
}

/**
 * Each control is on the page exactly once and visible as Playwright counts it (a box with area, not `visibility: hidden`); one message per control
 * that is not. One evaluation for the whole list, so the check stays fast.
 */
async function missingControls(page: Page, ids: readonly string[]): Promise<string[]> {
  return page.evaluate((list) => list.flatMap((id) => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[data-testid]')).filter((e) => e.dataset['testid'] === id);
    const [e] = found;
    if (found.length !== 1 || e === undefined) return [`${id}: found ${String(found.length)} times`];
    const r = e.getBoundingClientRect();
    return r.width * r.height > 0 && getComputedStyle(e).visibility !== 'hidden' ? [] : [`${id}: hidden`];
  }), ids);
}

/** Controls of an open panel that do not lie wholly inside it once scrolled into view (the panel scrolls when it is taller than the space). */
async function unreachable(page: Page, menu: string, ids: readonly string[]): Promise<string[]> {
  return page.evaluate(([panelId, list]) => {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('[data-testid]')).find((e) => e.dataset['testid'] === panelId);
    if (panel === undefined) return [`${panelId}: no panel`];
    const p = panel.getBoundingClientRect();
    const out = list.filter((id) => {
      const e = Array.from(panel.querySelectorAll<HTMLElement>('[data-testid]')).find((c) => c.dataset['testid'] === id);
      if (e === undefined) return true;
      e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = e.getBoundingClientRect();
      return r.top < p.top - 0.5 || r.bottom > p.bottom + 0.5 || r.left < p.left - 0.5 || r.right > p.right + 0.5;
    });
    panel.scrollTop = 0;
    return out;
  }, [menu, ids] as const);
}

/**
 * Chapters whose menu item does not show its summary as text (docs/design/spec.md, Page: the menu shows years and summary), as messages: the
 * item's `chapter-summary-<id>` element must hold the summary and, scrolled into view, be visible, unclipped and inside its item.
 */
async function missingSummaries(page: Page, chapters: Facts['chapters']): Promise<string[]> {
  return page.evaluate((list) => {
    const byId = (root: ParentNode, id: string): HTMLElement | undefined => Array.from(root.querySelectorAll<HTMLElement>('[data-testid]')).find((e) => e.dataset['testid'] === id);
    const out = list.flatMap(({ id, summary }) => {
      const item = byId(document, `chapter-${id}`);
      if (item === undefined) return [`chapter-${id}: no menu item`];
      const text = byId(item, `chapter-summary-${id}`);
      if (text === undefined) return [`chapter-${id}: no summary text in the item`];
      if (text.textContent !== summary) return [`chapter-${id}: summary reads "${text.textContent}"`];
      text.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = text.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      const style = getComputedStyle(text);
      if (!(r.width * r.height > 0) || style.visibility === 'hidden') return [`chapter-${id}: summary hidden`];
      if (text.scrollWidth > text.clientWidth + 1 || text.scrollHeight > text.clientHeight + 1) return [`chapter-${id}: summary clipped`];
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) return [`chapter-${id}: summary outside its item`];
      return [];
    });
    const panel = byId(document, 'chapter-menu');
    if (panel !== undefined) panel.scrollTop = 0;
    return out;
  }, chapters.map((c) => ({ id: c.id, summary: c.summary })));
}

for (const viewport of VIEWPORTS) {
  test.describe(`layout at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('every required control is there and visible, inside the viewport, unclipped and apart; panels stay above the bar', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page, 'autoplay=0&t=0.5');
      const required = requiredControls(f);
      expect(await missingControls(page, required.closed), 'required controls with the menus closed').toEqual([]);
      const closed = [...(await controlBoxes(page, '.met-bar')), ...(await controlBoxes(page, '.met-menus'))];
      expect(required.closed.filter((id) => !closed.some((b) => b.id === id)), 'required controls missing from the layout check').toEqual([]);
      expectLaidOut(closed, viewport, 'menus closed');
      const bar = await page.getByTestId('timeline-bar').boundingBox();
      if (bar === null) throw new Error('The timeline bar has no box.');
      expect(bar.y + bar.height).toBeLessThanOrEqual(viewport.height + 0.5);
      for (const menu of ['chapter-menu', 'view-menu'] as const) {
        await openMenu(page, menu);
        expect(await missingControls(page, required[menu]), `required controls in the open ${menu}`).toEqual([]);
        const panel = await page.getByTestId(menu).boundingBox();
        if (panel === null) throw new Error(`The ${menu} panel has no box.`);
        expect(panel.x >= 0 && panel.x + panel.width <= viewport.width, `${menu} fits the viewport width`).toBe(true);
        expect(panel.y + panel.height, `${menu} ends above the timeline bar`).toBeLessThanOrEqual(bar.y + 0.5);
        const inside = (await controlBoxes(page, `[data-testid="${menu}"]`)).filter((b) => b.y >= panel.y - 0.5 && b.y + b.h <= panel.y + panel.height + 0.5);
        expect(inside.length, `${menu}: controls in view`).toBeGreaterThan(0);
        expectLaidOut(inside, viewport, `${menu} open`);
        expect(await unreachable(page, menu, required[menu]), `${menu}: controls that cannot be scrolled into the panel`).toEqual([]);
        if (menu === 'chapter-menu') expect(await missingSummaries(page, f.chapters), 'chapter items that do not show their summary').toEqual([]);
        await page.keyboard.press('Escape');
      }
      expect(f.chapters.length).toBeGreaterThan(0);
      errors.expectClean();
    });
  });
}

test('the whole sequence builds within the 4 s budget, from navigation to ready', async ({ page }) => {
  const errors = watchErrors(page);
  const f = await open(page);
  const ready = f.perf.readyMs;
  if (ready === null) throw new Error('perf.readyMs is null after __shotReady: the page never marked met:ready, so the budget was not measured.');
  const build = f.perf.buildMs;
  // The ready interval contains the timeline build, so it cannot be shorter; if it were, the two clocks would not be the ones this test means.
  expect(ready, `ready ${ready.toFixed(0)} ms after navigation, timeline build ${build.toFixed(0)} ms`).toBeGreaterThan(build);
  expect(ready, `ready ${ready.toFixed(0)} ms after navigation (timeline build ${build.toFixed(0)} ms of it)`).toBeLessThan(4000);
  expect(f.stats.triangles).toBeLessThanOrEqual(3_000_000);
  expect(f.stats.meshes).toBeLessThanOrEqual(900);
  errors.expectClean();
});
