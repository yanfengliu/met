/**
 * The View menu through real input (docs/design/spec.md, Page: View menu): every preset chosen in turn, marking itself and settling on its camera; the
 * presets moving the camera and the canvas; and the section cut (its toggle and its slider, dragged by mouse) changing the canvas and giving it back.
 * Facts come from `window.__met` and preset cameras from src/viewer/presets.ts; nothing names a step or chapter.
 * Bound: canvas checks compare coarse luminance grids, proving the drawing changed, not that the new view is right; a preset's camera is compared by
 * position, target and fov (look) or by target, direction and the model's corners in frame (fit), read from `window.__met.camera`.
 */
import { expect, test } from '@playwright/test';

import { DEFAULT_FOV, PRESETS } from '../../src/viewer/presets.js';
import { centreOf, changedCells, cornerCells, cornerReach, distance, facts, lumaGrid, open, openMenu, press, settle, settledCamera, watchErrors } from './helpers.js';

test.describe('the View menu', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('every preset, chosen through the view menu, marks itself and settles on its camera', async ({ page }) => {
    const f = await open(page);
    await openMenu(page, 'view-menu');
    const model = centreOf(f.bounds);
    const problems: string[] = [];
    for (const entry of f.presets) {
      const preset = PRESETS.find((p) => p.id === entry.id);
      if (preset === undefined) {
        problems.push(`${entry.id}: not in src/viewer/presets.ts`);
        continue;
      }
      await press(page, `preset-${entry.id}`);
      await expect(page.getByTestId(`preset-${entry.id}`)).toHaveAttribute('aria-pressed', 'true');
      const view = await page.evaluate(() => window.__met?.view);
      if (view !== entry.id) problems.push(`${entry.id}: __met.view is ${String(view)}`);
      const cam = await settledCamera(page);
      const c = preset.camera;
      if (c.kind === 'look') {
        // A look preset with an up stands a hair (1e-3 of its distance) beside its axis; see resolvePreset.
        const allowed = (c.up === undefined ? 0 : 1e-3 * distance(c.position, c.target)) + 1e-3;
        if (distance(cam.position, c.position) > allowed) problems.push(`${entry.id}: camera at ${cam.position.join(', ')}, preset ${c.position.join(', ')}`);
        if (distance(cam.target, c.target) > 1e-3) problems.push(`${entry.id}: target at ${cam.target.join(', ')}, preset ${c.target.join(', ')}`);
        if (Math.abs(cam.fov - (c.fov ?? DEFAULT_FOV)) > 1e-9) problems.push(`${entry.id}: fov ${String(cam.fov)}`);
      } else {
        const along = [cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]] as const;
        const cos = (along[0] * c.direction[0] + along[1] * c.direction[1] + along[2] * c.direction[2]) / (Math.hypot(...along) * Math.hypot(...c.direction));
        if (distance(cam.target, model) > 1e-3) problems.push(`${entry.id}: target ${cam.target.join(', ')} is not the model's centre ${model.join(', ')}`);
        if (!(cos > 1 - 1e-6)) problems.push(`${entry.id}: camera off the preset's direction (cos ${String(cos)})`);
        const reach = cornerReach(cam, f.bounds);
        if (reach > 1.001) problems.push(`${entry.id}: the model's corners reach |ndc| ${reach.toFixed(3)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('view presets move the camera and mark the chosen one', async ({ page }) => {
    const f = await open(page);
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

  test('the section cut toggles, its slider sets the height, and the canvas shows it', async ({ page }) => {
    await open(page);
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
  });
});
