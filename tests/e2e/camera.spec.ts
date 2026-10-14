/**
 * The camera through real input (docs/design/spec.md, Page: View menu): a preset lands where it says and stays there, even when it is chosen
 * while the orbit controls are still coasting from a drag. Facts come from `window.__met`; nothing names a preset, step or chapter.
 * Bound: cameras are compared by position and target within 1 mm, read from `window.__met.camera`; what the canvas shows is not checked here.
 */
import { expect, test } from '@playwright/test';

import { cameraGap, choosePreset, dragCanvas, open, settledCamera, watchErrors } from './helpers.js';

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
});
