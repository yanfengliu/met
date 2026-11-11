/**
 * Page layout at 1280x720 and 390x844 (docs/design/spec.md, Page): every control the spec requires, the View menu's button, the floor picker and the walk
 * strip's Walk toggle, is on the page once and visible (checked by data-testid before any geometry, so a hidden control fails rather than drops out),
 * inside the viewport, unclipped and clear of every other control, with the View menu closed and open; the walk strip stands at the bottom right, and the
 * open View menu's panel fits the viewport's width, ends above the strip and scrolls each of its controls into view.
 * The build replay is gone for good (work unit 26; the owner, 2026-11-11: "I don't need the animation of how the building came into being... we should
 * remove it."): the default page and the old links that opened the replay (`t=0`, `step=1`, `replay=1`, `autoplay=1`) show the finished building, every
 * door built, in the orbit view at the default preset, with no warning, the same camera and the same canvas as the default page, none of the replay's
 * controls in the DOM and none of its facts in `window.__met`; the default page stays still without input, and the replay's old keys (Space,
 * Shift+Space, the arrows, Home and End) change nothing in the orbit view. Also the build-time budget (docs/design/spec.md, Budgets: all geometry in
 * under 4 s).
 * Bound: boxes are compared as rectangles from layout, so a control hidden under a translucent sibling with no overlap of boxes is not caught; the old
 * links' canvas is compared with the default page's as coarse luminance grids, which shows the drawing is the same, not that it is right.
 * Bound of the build budget: it times the whole interval from navigation start to `window.__shotReady` (perf.readyMs) on the Vite dev server in
 * headless Chrome on this machine, so it covers loading the modules (with every geometry they build on import), the model's build, starting the
 * renderer and the first five frames. That makes it an upper bound on geometry build time, not a measure of it; perf.buildMs, the model's build
 * alone, is reported beside it and misses geometry built at import.
 * The 4 s is a timing budget, asserted only under `npm run budgets`, which runs its test, tagged `@budget`, with MET_BUDGETS=1; `npm run verify` measures
 * and prints it (./helpers.ts `budgetCheck`, work unit 30). The triangles and meshes, which no clock changes, are asserted in both.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { budgetCheck, cameraGap, changedCells, lumaGrid, open, openMenu, settle, settledCamera, watchErrors } from './helpers.js';
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

/** Boxes of visible controls (buttons, inputs and outputs with a data-testid) under `scope`, and whether any clips its own content. */
async function controlBoxes(page: Page, scope: string): Promise<Box[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (root === null) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('button[data-testid], input[data-testid], output[data-testid]'))
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
 * The controls docs/design/spec.md (Page) requires, by data-testid: with the View menu closed, the Walk toggle, the View menu's button and the floor
 * picker's; open, the menu's items. Presets, walk spawns and floors come from `window.__met`; the rest is the spec's own list, not read from the page.
 */
function requiredControls(f: Facts): { readonly closed: readonly string[]; readonly 'view-menu': readonly string[] } {
  return {
    closed: ['walk-toggle', 'view-menu-button', 'floor-all', ...f.floors.map((floor) => `floor-${floor.id}`)],
    'view-menu': [...f.presets.map((p) => `preset-${p.id}`), ...f.walk.spawns.map((id) => `walk-spawn-${id}`), 'cut-toggle', 'cut-slider', 'cut-value'],
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
 * Every control `requiredControls` names is there and visible, inside the viewport, unclipped and apart, with the View menu closed and open; the walk
 * strip stands at the bottom right, within 16 px of the viewport's right and bottom edges; the open panel fits the viewport's width, ends above the
 * strip and scrolls each of its controls into view.
 */
async function expectLayout(page: Page, f: Facts, viewport: { width: number; height: number }): Promise<void> {
  const required = requiredControls(f);
  expect(await missingControls(page, required.closed), 'required controls with the View menu closed').toEqual([]);
  const closed = [...(await controlBoxes(page, '.met-strip')), ...(await controlBoxes(page, '.met-menus')), ...(await controlBoxes(page, '.met-floors'))];
  expect(required.closed.filter((id) => !closed.some((b) => b.id === id)), 'required controls missing from the layout check').toEqual([]);
  expectLaidOut(closed, viewport, 'the View menu closed');
  const strip = await page.getByTestId('walk-strip').boundingBox();
  if (strip === null) throw new Error('The walk strip has no box.');
  const right = viewport.width - (strip.x + strip.width);
  const bottom = viewport.height - (strip.y + strip.height);
  expect(right >= -0.5 && right <= 16 && bottom >= -0.5 && bottom <= 16, `the walk strip at the bottom right: ${right.toFixed(1)} px from the right edge, ${bottom.toFixed(1)} px from the bottom`).toBe(true);
  await openMenu(page, 'view-menu');
  expect(await missingControls(page, required['view-menu']), 'required controls in the open View menu').toEqual([]);
  const panel = await page.getByTestId('view-menu').boundingBox();
  if (panel === null) throw new Error('The View menu panel has no box.');
  expect(panel.x >= 0 && panel.x + panel.width <= viewport.width, 'the View menu fits the viewport width').toBe(true);
  expect(panel.y + panel.height, 'the View menu ends above the walk strip').toBeLessThanOrEqual(strip.y + 0.5);
  const inside = (await controlBoxes(page, '[data-testid="view-menu"]')).filter((b) => b.y >= panel.y - 0.5 && b.y + b.h <= panel.y + panel.height + 0.5);
  expect(inside.length, 'the View menu: controls in view').toBeGreaterThan(0);
  expectLaidOut(inside, viewport, 'the View menu open');
  expect(await unreachable(page, 'view-menu', required['view-menu']), 'the View menu: controls that cannot be scrolled into the panel').toEqual([]);
  await page.keyboard.press('Escape');
}

for (const viewport of VIEWPORTS) {
  test.describe(`layout at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('the View menu button, the floor picker and the Walk toggle there and visible, inside the viewport, unclipped and apart; the walk strip at the bottom right; the View menu above it', async ({ page }) => {
      const errors = watchErrors(page);
      const f = await open(page);
      await expectLayout(page, f, viewport);
      errors.expectClean();
    });
  });
}

/** The build replay's controls by data-testid, as the page had them until work unit 26; its chapters' items were `chapter-<id>` and `chapter-summary-<id>`. */
const REPLAY_CONTROLS = ['chapter-menu', 'chapter-menu-button', 'replay-toggle', 'timeline-bar', 'step-label', 'step-detail', 'scrubber', 'chapter-mark', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4', 'bar-toggle', 'replay-close', 'follow-toggle'];
/** The build replay's facts in `window.__met`, and its steps' fields for playback and the follow camera. */
const REPLAY_FACTS = ['n', 't', 'mode', 'direction', 'speed', 'follow', 'replay', 'followGoal'];
const REPLAY_STEP_FACTS = ['weight', 'focus'];

/**
 * What is left of the build replay, one message each: a control of its in the DOM (by data-testid, named or by its chapters', transport buttons' and
 * speeds' prefixes), an element of its bar's classes, a fact of its in `window.__met` or in one of its steps.
 */
async function replayRemnants(page: Page): Promise<string[]> {
  return page.evaluate(([controls, keys, stepKeys]) => {
    const found = Array.from(document.querySelectorAll<HTMLElement>('[data-testid]')).map((e) => e.dataset['testid'] ?? '').filter((id) => controls.includes(id) || /^(chapter|btn|speed)-/.test(id)).map((id) => `control ${id}`);
    const bar = document.querySelectorAll('.met-bar, .met-scrubber').length;
    const m = window.__met;
    if (m === undefined) return [...found, 'no window.__met'];
    const facts = keys.filter((k) => k in m).map((k) => `window.__met.${k}`);
    const steps = m.steps.flatMap((s, i) => stepKeys.filter((k) => k in s).map((k) => `window.__met.steps[${String(i)}].${k}`));
    return [...found, ...(bar > 0 ? [`${String(bar)} elements of the timeline bar's classes`] : []), ...facts, ...steps];
  }, [REPLAY_CONTROLS, REPLAY_FACTS, REPLAY_STEP_FACTS] as const);
}

/** Doors not built: the finished building has every one built. */
const unbuilt = (f: Facts): string[] => f.doors.filter((d) => !d.built).map((d) => d.id);

test('the build replay is gone for good: the default page and its old links show the finished building, none of its controls or facts, and its old keys change nothing', async ({ page }) => {
  // Five page loads: 5.8 s here (2026-11-11); the deadline, ten times that, covers a loaded machine.
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  const f = await open(page);
  expect([f.walk.mode, f.view, f.warnings], 'the default page: the mode, the preset in view and the warnings').toEqual(['orbit', 'aerial-ne', []]);
  expect(unbuilt(f), 'the default page: doors not built').toEqual([]);
  expect(await replayRemnants(page), 'the build replay on the default page').toEqual([]);
  const cam = await settledCamera(page);
  const built = await lumaGrid(page);
  await page.waitForTimeout(300);
  expect(changedCells(built, await lumaGrid(page)), 'the default page: canvas cells changed in 300 ms without input').toEqual([]);
  // The replay's old keys of the orbit view: nothing opens, and the camera and the canvas stay.
  for (const key of ['Space', 'Shift+Space', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) await page.keyboard.press(key);
  await settle(page);
  expect(await replayRemnants(page), 'the build replay after its old keys').toEqual([]);
  expect(cameraGap(await settledCamera(page), cam), 'metres the old keys moved the camera').toBeLessThan(1e-4);
  expect(changedCells(built, await lumaGrid(page)), 'canvas cells the old keys changed').toEqual([]);
  expect(await page.evaluate(() => window.__met?.view), 'the preset in view after the old keys').toBe('aerial-ne');
  // The old links open the default page: the finished building, from the same camera and drawn the same, with no warning.
  for (const query of ['t=0', 'step=1', 'replay=1', 'autoplay=1']) {
    const old = await open(page, query);
    expect([old.walk.mode, old.view, old.warnings], `${query}: the mode, the preset in view and the warnings`).toEqual(['orbit', 'aerial-ne', []]);
    expect(unbuilt(old), `${query}: doors not built`).toEqual([]);
    expect(await replayRemnants(page), `${query}: the build replay`).toEqual([]);
    expect(cameraGap(await settledCamera(page), cam), `${query}: metres from the default page's camera`).toBeLessThan(1e-3);
    expect(changedCells(built, await lumaGrid(page)), `${query}: canvas cells that differ from the default page's`).toEqual([]);
  }
  errors.expectClean();
});

test('the whole sequence builds within the 4 s budget, from navigation to ready', { tag: '@budget' }, async ({ page }) => {
  const errors = watchErrors(page);
  const f = await open(page);
  const ready = f.perf.readyMs;
  if (ready === null) throw new Error('perf.readyMs is null after __shotReady: the page never marked met:ready, so the budget was not measured.');
  const build = f.perf.buildMs;
  console.log(`the whole sequence: ready ${ready.toFixed(0)} ms after navigation, the model's build ${build.toFixed(0)} ms of it`);
  // The ready interval contains the model's build, so it cannot be shorter; if it were, the two clocks would not be the ones this test means.
  expect(ready, `ready ${ready.toFixed(0)} ms after navigation, the model's build ${build.toFixed(0)} ms`).toBeGreaterThan(build);
  budgetCheck('the build, from navigation to ready', () => { expect(ready, `ready ${ready.toFixed(0)} ms after navigation (the model's build ${build.toFixed(0)} ms of it)`).toBeLessThan(4000); });
  expect(f.stats.triangles).toBeLessThanOrEqual(3_000_000);
  expect(f.stats.meshes).toBeLessThanOrEqual(900);
  errors.expectClean();
});
