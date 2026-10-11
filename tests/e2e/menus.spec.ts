/**
 * Chapter menu and view menu through real input (docs/design/spec.md, Page): chapters in order (empty ones disabled), presets, the follow camera
 * (a drag turns it off) and the section cut (toggle and slider). Facts come from `window.__met`; nothing names a demo step or chapter.
 * Bound: canvas checks compare coarse luminance grids, proving the drawing changed, not that the new view is right.
 */
import { expect, test } from '@playwright/test';

import { changedCells, cornerCells, currentT, facts, lumaGrid, open, openMenu, press, settle, waitForT, watchErrors } from './helpers.js';

test.describe('menus', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('the chapter menu lists every chapter in order, disables empty ones and moves to the start of the chosen one', async ({ page }) => {
    const f = await open(page);
    await openMenu(page, 'chapter-menu');
    const items = page.getByTestId('chapter-menu').getByRole('menuitem');
    await expect(items).toHaveCount(f.chapters.length);
    for (const [i, chapter] of f.chapters.entries()) {
      const item = items.nth(i);
      await expect(item).toHaveAttribute('data-testid', `chapter-${chapter.id}`);
      await expect(item).toContainText(chapter.title);
      if (chapter.count === 0) await expect(item).toBeDisabled();
      else await expect(item).toBeEnabled();
    }
    const target = [...f.chapters].filter((c) => c.count > 0).sort((a, b) => b.first - a.first)[0];
    if (target === undefined) throw new Error('No chapter has steps.');
    await page.keyboard.press('Escape');
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await openMenu(page, 'chapter-menu');
    await press(page, `chapter-${target.id}`);
    await waitForT(page, target.first);
    await expect(page.getByTestId('chapter-menu')).toBeHidden();
    await expect(page.getByTestId('scrubber')).toHaveValue(String(target.first));
    await openMenu(page, 'chapter-menu');
    await expect(page.getByTestId(`chapter-${target.id}`)).toHaveAttribute('aria-current', 'true');
  });

  test('view presets move the camera and mark the chosen one', async ({ page }) => {
    const f = await open(page);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await openMenu(page, 'view-menu');
    for (const preset of f.presets) await expect(page.getByTestId(`preset-${preset.id}`)).toBeVisible();
    const before = await lumaGrid(page);
    await press(page, 'preset-top');
    await expect(page.getByTestId('preset-top')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__met?.view)).toBe('top');
    const top = await lumaGrid(page);
    expect(changedCells(before, top).length).toBeGreaterThan(8);
    const interior = f.presets.find((p) => p.group === 'interior');
    if (interior !== undefined) {
      await press(page, `preset-${interior.id}`);
      expect(await page.evaluate(() => window.__met?.view)).toBe(interior.id);
      await expect(page.getByTestId('preset-top')).toHaveAttribute('aria-pressed', 'false');
      expect(changedCells(top, await lumaGrid(page)).length).toBeGreaterThan(8);
    }
  });

  test('the follow camera is on during autoplay, a drag turns it off and the toggle turns it back on', async ({ page }) => {
    await open(page, '');
    expect(await page.evaluate(() => window.__met?.follow)).toBe(true);
    await openMenu(page, 'view-menu');
    await expect(page.getByTestId('follow-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    const canvas = await page.getByTestId('canvas').boundingBox();
    if (canvas === null) throw new Error('The canvas has no box.');
    const x = canvas.x + canvas.width / 2;
    const y = canvas.y + canvas.height / 3;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k += 1) await page.mouse.move(x + k * 15, y + k * 4);
    await page.mouse.up();
    await page.waitForFunction(() => window.__met?.follow === false);
    expect(await page.evaluate(() => window.__met?.view)).toBeNull();
    await openMenu(page, 'view-menu');
    await expect(page.getByTestId('follow-toggle')).toHaveAttribute('aria-pressed', 'false');
    await press(page, 'follow-toggle');
    await expect(page.getByTestId('follow-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__met?.follow)).toBe(true);
  });

  test('the section cut toggles, its slider sets the height, and the canvas shows it', async ({ page }) => {
    const f = await open(page);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await openMenu(page, 'view-menu');
    await press(page, 'preset-front');
    await page.keyboard.press('Escape');
    const uncut = await lumaGrid(page, 32, 18);
    await openMenu(page, 'view-menu');
    await press(page, 'cut-toggle');
    await expect(page.getByTestId('cut-toggle')).toHaveAttribute('aria-pressed', 'true');
    const first = await facts(page);
    expect(first.cut.enabled).toBe(true);
    await expect(page.getByTestId('cut-value')).toHaveText(`${first.cut.height.toFixed(1)} m`);
    await page.keyboard.press('Escape');
    const cut = await lumaGrid(page, 32, 18);
    const changed = changedCells(uncut, cut);
    expect(changed.length, 'cells changed by the cut').toBeGreaterThan(3);
    expect(changed.filter((cell) => cornerCells(32, 18).includes(cell)), 'the far corners do not change').toEqual([]);
    // Drag the slider's thumb left: the cut comes down.
    await openMenu(page, 'view-menu');
    const slider = await page.getByTestId('cut-slider').boundingBox();
    if (slider === null) throw new Error('The cut slider has no box.');
    const fraction = first.cut.height / Number(await page.getByTestId('cut-slider').getAttribute('max'));
    const y = slider.y + slider.height / 2;
    const fromX = slider.x + 8 + (slider.width - 16) * fraction;
    await page.mouse.move(fromX, y);
    await page.mouse.down();
    for (let k = 1; k <= 6; k += 1) await page.mouse.move(fromX - k * 8, y);
    await page.mouse.up();
    await settle(page);
    const lowered = await facts(page);
    expect(lowered.cut.enabled).toBe(true);
    expect(lowered.cut.height).toBeLessThan(first.cut.height);
    await expect(page.getByTestId('cut-value')).toHaveText(`${lowered.cut.height.toFixed(1)} m`);
    await press(page, 'cut-toggle');
    await expect(page.getByTestId('cut-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('cut-value')).toHaveText('off');
    await page.keyboard.press('Escape');
    expect(changedCells(uncut, await lumaGrid(page, 32, 18)), 'with the cut off the canvas is as before').toEqual([]);
    expect(await currentT(page)).toBe(f.n);
  });
});
