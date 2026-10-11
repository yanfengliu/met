/**
 * Timeline controls through real input (docs/design/spec.md, Page): every transport button, speed, the scrubber by mouse drag, and every keyboard shortcut.
 * Each test checks the label, the scrubber value, the read-only `window.__met.t` and, where the scene must change, the canvas pixels.
 * Bound: pixel checks compare coarse luminance grids, so they prove that the drawing changed where the model is and not at the far corners, not that it is right.
 */
import { expect, test } from '@playwright/test';

import { changedCells, cornerCells, currentT, labelStep, lumaGrid, open, press, settle, waitForT, watchErrors } from './helpers.js';

test.describe('timeline controls', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('first load starts at t = 0 and plays forward with the follow camera on', async ({ page }) => {
    await open(page, '');
    await page.waitForFunction(() => (window.__met?.t ?? 0) > 0.05);
    expect(await page.evaluate(() => window.__met?.mode)).toBe('playing');
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Pause');
    expect(await page.evaluate(() => window.__met?.follow)).toBe(true);
  });

  test('end and start jump to N and 0, and the model appears where it stands', async ({ page }) => {
    const f = await open(page);
    const scrubber = page.getByTestId('scrubber');
    expect(await currentT(page)).toBe(0);
    expect(await labelStep(page)).toBe(0);
    await expect(scrubber).toHaveValue('0');
    const empty = await lumaGrid(page);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await expect(page.getByTestId('step-label')).toHaveText(new RegExp(`^Step ${String(f.n)} / ${String(f.n)} · `));
    await expect(scrubber).toHaveValue(String(f.n));
    const built = await lumaGrid(page);
    const changed = changedCells(empty, built);
    expect(changed.length, 'cells that changed between t = 0 and t = N').toBeGreaterThan(8);
    expect(changed.filter((cell) => cornerCells().includes(cell)), 'far corners stay workspace ground').toEqual([]);
    await press(page, 'btn-start');
    await waitForT(page, 0);
    expect(await labelStep(page)).toBe(0);
    expect(changedCells(empty, await lumaGrid(page)), 'back at t = 0 the canvas matches the empty site').toEqual([]);
  });

  test('step forward and step back animate to integers, and a second press retargets', async ({ page }) => {
    const f = await open(page);
    test.skip(f.n < 3, 'needs at least three steps');
    await press(page, 'speed-4');
    await press(page, 'btn-step-forward');
    await waitForT(page, 1);
    expect(await labelStep(page)).toBe(1);
    await expect(page.getByTestId('scrubber')).toHaveValue('1');
    await press(page, 'btn-step-forward');
    await press(page, 'btn-step-forward');
    await waitForT(page, 3);
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    await press(page, 'btn-step-back');
    await waitForT(page, 2);
    expect(await labelStep(page)).toBe(2);
  });

  test('play pauses and resumes; play backward runs t down; both stop at the ends', async ({ page }) => {
    const f = await open(page);
    await press(page, 'speed-4');
    await press(page, 'btn-play');
    await page.waitForFunction(() => (window.__met?.t ?? 0) > 0.3);
    await press(page, 'btn-play');
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
    const paused = await currentT(page);
    await page.waitForTimeout(300);
    expect(await currentT(page)).toBe(paused);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await press(page, 'btn-play-backward');
    await expect(page.getByTestId('btn-play-backward')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction((n) => (window.__met?.t ?? n) < n - 0.3, f.n);
    expect(await page.evaluate(() => window.__met?.direction)).toBe(-1);
    await press(page, 'btn-play-backward');
    await expect(page.getByTestId('btn-play-backward')).toHaveAttribute('aria-pressed', 'false');
    // Forward from one step before the end stops exactly at N.
    await press(page, 'btn-end');
    await press(page, 'btn-step-back');
    await waitForT(page, f.n - 1);
    await press(page, 'btn-play');
    await waitForT(page, f.n);
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
  });

  test('speed buttons set the rate: 4x plays about eight times as fast as 0.5x', async ({ page }) => {
    await open(page);
    const rate = async (speed: string): Promise<number> => {
      await press(page, 'btn-start');
      await press(page, `speed-${speed}`);
      await expect(page.getByTestId(`speed-${speed}`)).toHaveAttribute('aria-pressed', 'true');
      await press(page, 'btn-play');
      const t0 = await currentT(page);
      await page.waitForTimeout(1000);
      const t1 = await currentT(page);
      await press(page, 'btn-play');
      return t1 - t0;
    };
    const slow = await rate('0.5');
    const fast = await rate('4');
    expect(await page.evaluate(() => window.__met?.speed)).toBe(4);
    expect(slow).toBeGreaterThan(0);
    expect(fast / slow).toBeGreaterThan(4);
    expect(fast / slow).toBeLessThan(16);
  });

  test('the scrubber follows a mouse drag', async ({ page }) => {
    const f = await open(page);
    const before = await lumaGrid(page);
    const box = await page.getByTestId('scrubber').boundingBox();
    if (box === null) throw new Error('The scrubber has no box.');
    const thumb = 8;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + thumb, y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k += 1) await page.mouse.move(box.x + thumb + ((box.width - 2 * thumb) * 0.6 * k) / 10, y);
    await page.mouse.up();
    await settle(page);
    const t = await currentT(page);
    expect(t).toBeGreaterThan(f.n * 0.5);
    expect(t).toBeLessThan(f.n * 0.7);
    expect(Number(await page.getByTestId('scrubber').inputValue())).toBeCloseTo(t, 6);
    expect(await labelStep(page)).toBe(Math.ceil(t));
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    expect(changedCells(before, await lumaGrid(page)).length).toBeGreaterThan(4);
  });

  test('keyboard: Space, Shift+Space, arrows, Home and End', async ({ page }) => {
    const f = await open(page);
    test.skip(f.n < 2, 'needs at least two steps');
    await press(page, 'speed-4');
    // A click on the canvas without a drag leaves focus on the page.
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('End');
    await waitForT(page, f.n);
    await page.keyboard.press('Home');
    await waitForT(page, 0);
    await page.keyboard.press('ArrowRight');
    await waitForT(page, 1);
    await page.keyboard.press('ArrowRight');
    await waitForT(page, 2);
    await page.keyboard.press('ArrowLeft');
    await waitForT(page, 1);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === 1);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'paused');
    await page.keyboard.press('Shift+Space');
    await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === -1);
    await waitForT(page, 0);
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    await expect(page.getByTestId('scrubber')).toHaveValue('0');
  });
});
