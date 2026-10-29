/**
 * The orbit view's card against the view's own controls, through real input at gallery 600's preset (`int-european-paintings-600`) on the finished
 * building (docs/design/spec.md, Collection: Labels; review 6 of work unit 2, F25 to F27):
 * - F25: a 2 px click on the Triumph of Marius shows its card and moves nothing, at the preset (which stays in view) and with the follow camera on
 *   (which stays on): the camera is where it was, to 0.1 mm;
 * - F26: a camera preset chosen from the view menu hides the card, Esc never pressed;
 * - F27: the cut slider, dragged by hand under the painting, hides its card (a cut through it does not), and so does the main floor's view, whose cut
 *   lies under the second floor's painting;
 * - F29 (review 7): a real two-finger pinch, by touch through the browser's own input (CDP Input.dispatchTouchEvent), whose first finger moved 4 px
 *   (under the slop the click holds) before the second landed 40 px off, zooms by 40/39 when the first finger then moves 1 px closer, as the fingers
 *   now stand, not by 44/39 from where the first finger pressed (red at e06cc70).
 * The painting's pixel comes from the collection's placements and the published camera, checked apart from the page (./labels-helpers.ts).
 * Bound: 1280×720 (the layout at both sizes is ./labels.spec.ts's); the cut slider is dragged to its left end, as a person drags it; the pinch is read
 * from the camera-to-target distance, which a zoom out grows by about the distance times the factor less one (src/viewer/zoom.ts `dollyStep`) and the
 * pinch's turn and pan leave as it was.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { cameraGap, choosePreset, distance, facts, open, openMenu, press, settle, settledCamera, watchErrors } from './helpers.js';
import type { Camera } from './helpers.js';
import { PRESET, TRIUMPH, triumph, triumphPixel } from './labels-helpers.js';

/** A press at (x, y) that travels `px` pixels to the right, one at a time, and is released there. */
async function nudge(page: Page, x: number, y: number, px: number): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= px; k += 1) await page.mouse.move(x + k, y);
  await page.mouse.up();
  await settle(page);
}

/** Drags the cut slider's thumb from where it stands to the slider's left end, as a person does, with the view menu open. */
async function dragCutToBottom(page: Page): Promise<void> {
  const slider = page.getByTestId('cut-slider');
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (box === null) throw new Error('The cut slider has no box.');
  const fraction = Number(await slider.inputValue()) / Number(await slider.getAttribute('max'));
  const y = box.y + box.height / 2;
  const fromX = box.x + 8 + (box.width - 16) * fraction;
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k += 1) await page.mouse.move(fromX - (k * (fromX - box.x + 20)) / 8, y);
  await page.mouse.up();
  await settle(page);
}

const label = async (page: Page): Promise<string | null> => (await facts(page)).label?.id ?? null;

test.describe('the orbit view’s card and the view’s controls', () => {
  test.setTimeout(120_000);

  test('F25: a 2 px click on the painting shows its card and moves nothing, at the preset and with the follow camera on', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, `autoplay=0&view=${PRESET}`);
    const start = await settledCamera(page);
    const p = await triumphPixel(page, start);
    await nudge(page, p.x, p.y, 2);
    expect(await label(page), 'a 2 px press at the preset').toBe(String(TRIUMPH));
    expect(cameraGap(await settledCamera(page), start), 'metres the 2 px click moved the camera').toBeLessThan(1e-4);
    expect((await facts(page)).view, 'the preset still in view').toBe(PRESET);
    // The follow camera on, by its toggle in the view menu; Esc closes the menu before any card shows again.
    await page.keyboard.press('Escape');
    await openMenu(page, 'view-menu');
    await press(page, 'follow-toggle');
    await expect(page.getByTestId('follow-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('view-menu')).toBeHidden();
    const followed = await settledCamera(page);
    expect((await facts(page)).follow, 'the follow camera on').toBe(true);
    expect(await label(page), 'no card before the click').toBeNull();
    await nudge(page, p.x, p.y, 2);
    expect(await label(page), 'a 2 px press with the follow camera on').toBe(String(TRIUMPH));
    await expect(page.getByTestId('art-card')).toBeVisible();
    expect((await facts(page)).follow, 'the follow camera still on').toBe(true);
    expect(cameraGap(await settledCamera(page), followed), 'metres the 2 px click moved the camera').toBeLessThan(1e-4);
    errors.expectClean();
  });

  test('F26: a camera preset chosen from the view menu hides the clicked card, Esc never pressed', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, `autoplay=0&view=${PRESET}`);
    const p = await triumphPixel(page, await settledCamera(page));
    await page.mouse.click(p.x, p.y);
    await settle(page);
    expect(await label(page)).toBe(String(TRIUMPH));
    await choosePreset(page, 'front');
    await settle(page);
    expect((await facts(page)).view).toBe('front');
    expect(await label(page), 'after the front preset').toBeNull();
    await expect(page.getByTestId('art-card')).toBeHidden();
    errors.expectClean();
  });

  test('F27: the cut slider dragged under the painting, and the main floor’s view, hide its card; a cut through it does not', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, `autoplay=0&view=${PRESET}`);
    const start = await settledCamera(page);
    const p = await triumphPixel(page, start);
    const painting = triumph().box;
    await page.mouse.click(p.x, p.y);
    await settle(page);
    expect(await label(page)).toBe(String(TRIUMPH));
    // The cut on at its default height, through the painting (on the second floor, 0.02 m to 5.61 m over it): the card stays.
    await openMenu(page, 'view-menu');
    await press(page, 'cut-toggle');
    await settle(page);
    const through = (await facts(page)).cut;
    expect(through.enabled && through.height > painting.min.y && through.height < painting.max.y, `the default cut at ${through.height.toFixed(1)} m passes through the painting (${painting.min.y.toFixed(2)}..${painting.max.y.toFixed(2)} m)`).toBe(true);
    expect(await label(page), 'a cut through the painting').toBe(String(TRIUMPH));
    // The slider dragged by hand to its bottom: the cut lies under the painting, which the camera no longer draws, and its card goes.
    await dragCutToBottom(page);
    const under = (await facts(page)).cut;
    expect(under.enabled && under.height < painting.min.y, `the cut at ${under.height.toFixed(1)} m, under the painting`).toBe(true);
    expect(await label(page), 'a cut under the painting').toBeNull();
    await expect(page.getByTestId('art-card')).toBeHidden();
    // The cut off again and the painting clicked again, then the main floor's view, whose cut (under the second floor at SECOND_FLOOR_Y) removes it.
    await press(page, 'cut-toggle');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('view-menu')).toBeHidden();
    await settle(page);
    expect(cameraGap(await settledCamera(page), start), 'the cut moved no camera').toBeLessThan(1e-4);
    await page.mouse.click(p.x, p.y);
    await settle(page);
    expect(await label(page), 'clicked again with the cut off').toBe(String(TRIUMPH));
    await press(page, 'floor-main');
    await settle(page);
    const main = (await facts(page)).cut;
    expect(main.enabled && main.height < SECOND_FLOOR_Y, `the main floor's cut at ${main.height.toFixed(1)} m, under the second floor`).toBe(true);
    expect(await label(page), 'the main floor’s view').toBeNull();
    await expect(page.getByTestId('art-card')).toBeHidden();
    errors.expectClean();
  });
});

test.describe('a real pinch on a touch screen', () => {
  test.use({ hasTouch: true });

  test('F29: a pinch whose first finger moved under the slop before the second landed zooms from where the fingers are, 40/39, not 44/39', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'autoplay=0&view=aerial-ne');
    const before = await settledCamera(page);
    const cdp = await page.context().newCDPSession(page);
    /** Every finger down, as CDP takes them: one event per finger that changed since the last. */
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', fingers: readonly (readonly [number, number, number])[]): Promise<void> => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: fingers.map(([id, x, y]) => ({ id, x, y })) });
    };
    await touch('touchStart', [[1, 600, 300]]);
    await touch('touchMove', [[1, 604, 300]]);
    await touch('touchStart', [[1, 604, 300], [2, 644, 300]]);
    await touch('touchMove', [[1, 605, 300], [2, 644, 300]]);
    await touch('touchEnd', []);
    await cdp.detach();
    const after = await settledCamera(page);
    const radius = (c: Camera): number => distance(c.position, c.target);
    const grew = radius(after) / radius(before) - 1;
    // 40/39 grows the distance by 2.56% times the cosine between the pinch's ray and the view axis; 44/39, from where the first finger pressed, by 12.8%.
    expect(grew, `the camera-to-target distance grew ${(grew * 100).toFixed(2)}%`).toBeGreaterThan(0.015);
    expect(grew, `the camera-to-target distance grew ${(grew * 100).toFixed(2)}%`).toBeLessThan(0.035);
    errors.expectClean();
  });
});
