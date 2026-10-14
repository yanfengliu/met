/**
 * The camera through real input (docs/design/spec.md, Page: View menu): a preset lands where it says and stays there, even when it is chosen
 * while the orbit controls are still coasting from a drag; the follow camera stays on through a press without movement and goes off with a drag.
 * Facts come from `window.__met`; nothing names a preset, step or chapter.
 * Bound: cameras are compared by position and target within 1 mm, read from `window.__met.camera`; what the canvas shows is not checked here.
 */
import { expect, test } from '@playwright/test';

import { camera, cameraGap, choosePreset, dragCanvas, open, press, settledCamera, watchErrors } from './helpers.js';

test.describe('camera', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('a preset chosen right after a drag lands on the preset and stays there', async ({ page }) => {
    const f = await open(page);
    const interior = f.presets.find((p) => p.group === 'interior');
    const exterior = f.presets.find((p) => p.group === 'exterior');
    if (interior === undefined || exterior === undefined) throw new Error('The page has no interior or no exterior preset.');
    await choosePreset(page, interior.id);
    const reference = await settledCamera(page);
    await choosePreset(page, exterior.id);
    await settledCamera(page);
    // A quick flick: the controls keep turning for a while after the release (damping inertia).
    await dragCanvas(page, 60, 10, 4);
    await choosePreset(page, interior.id);
    expect(await page.evaluate(() => window.__met?.view)).toBe(interior.id);
    const landed = await settledCamera(page);
    expect(cameraGap(landed, reference), `settled camera ${JSON.stringify(landed)} vs the preset ${JSON.stringify(reference)}`).toBeLessThan(1e-3);
  });

  test('a press without movement keeps the follow camera on during playback, and a drag turns it off', async ({ page }) => {
    await open(page, '');
    await page.waitForFunction(() => window.__met?.mode === 'playing');
    await press(page, 'speed-4');
    expect(await page.evaluate(() => window.__met?.follow)).toBe(true);
    const box = await page.getByTestId('canvas').boundingBox();
    if (box === null) throw new Error('The canvas has no box.');
    // Wait for a step whose framing moves the camera, so the press happens while the follow camera is under way.
    let before = await camera(page);
    for (let k = 0; k < 100; k += 1) {
      await page.waitForTimeout(100);
      const now = await camera(page);
      const moving = cameraGap(now, before) > 1e-2;
      before = now;
      if (moving) break;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.up();
    // The follow camera kept moving under the pressed button, which is what used to count as a drag.
    expect(cameraGap(await camera(page), before), 'the follow camera moved during the press').toBeGreaterThan(1e-3);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__met?.follow), 'follow after a press without movement').toBe(true);
    await dragCanvas(page, 15, 4, 8);
    await page.waitForFunction(() => window.__met?.follow === false);
    expect(await page.evaluate(() => window.__met?.view)).toBeNull();
  });
});
