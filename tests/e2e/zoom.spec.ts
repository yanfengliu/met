/**
 * The zoom through real wheel input, the gate for the class "camera input stops responding at a limit" (docs/learning/defect-register.md, "The
 * wheel stops zooming"; docs/design/spec.md, Camera). From two exterior presets, an interior one and after a move by the W key, many notches of
 * the wheel toward the middle of the view, then back:
 * - every notch in moves the camera at least min(ZOOM.minStep, what is left to the bound) − 1 mm, until the bound: the camera ZOOM.stop from the
 *   surface under the pointer, where the zoom puts the orbit target, so the camera-to-target distance reads it; the bound comes within 120 notches;
 * - at that bound a notch in moves nothing, and every one of 8 notches out moves at least ZOOM.minStep;
 * - from aerial-ne, notches out reach the far bound (the target ZOOM.maxDistance away), where a notch out moves nothing and a notch in moves again.
 * Bound: one pointer position (the middle of the view above the bar) and wheel steps of 100 pixels; whether the stop lies in front of the first
 * surface is the pick's unit-tested contract (src/viewer/zoom.test.ts), not measured against the scene here.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { ZOOM } from '../../src/viewer/zoom.js';
import { camera, choosePreset, distance, open, settle, watchErrors } from './helpers.js';
import type { Camera } from './helpers.js';

const MAX_NOTCHES_IN = 120;
const NOTCHES_OUT = 8;
const MM = 1e-3;

/** The middle of the canvas above the timeline bar, where the view axis meets the screen. */
async function viewCentre(page: Page): Promise<{ x: number; y: number }> {
  const canvas = await page.getByTestId('canvas').boundingBox();
  const bar = await page.getByTestId('timeline-bar').boundingBox();
  if (canvas === null || bar === null) throw new Error('The canvas or the timeline bar has no box.');
  return { x: canvas.x + canvas.width / 2, y: canvas.y + (bar.y - canvas.y) / 2 };
}

/** One wheel notch (deltaY ±100) at the pointer, and the camera once the frame after it has run. */
async function notch(page: Page, deltaY: number): Promise<Camera> {
  await page.mouse.wheel(0, deltaY);
  await settle(page);
  return camera(page);
}

const radius = (c: Camera): number => distance(c.position, c.target);

/** Zooms in to the near bound and back out, returning one message per notch that broke the gate. */
async function zoomInAndOut(page: Page, what: string): Promise<string[]> {
  const problems: string[] = [];
  const centre = await viewCentre(page);
  await page.mouse.move(centre.x, centre.y);
  let before = await camera(page);
  let atBound = false;
  for (let k = 1; k <= MAX_NOTCHES_IN && !atBound; k += 1) {
    const after = await notch(page, -100);
    const moved = distance(after.position, before.position);
    const left = radius(before) - ZOOM.stop;
    if (left <= MM) {
      atBound = true;
      if (moved > MM) problems.push(`${what}: notch ${String(k)} in, at the bound, moved ${moved.toFixed(4)} m`);
    } else if (moved < Math.min(ZOOM.minStep, left) - MM) {
      problems.push(`${what}: notch ${String(k)} in moved ${moved.toFixed(4)} m with ${left.toFixed(3)} m left to the bound (camera-to-target ${radius(before).toFixed(3)} m)`);
      return problems;
    }
    before = after;
  }
  if (!atBound) problems.push(`${what}: ${String(MAX_NOTCHES_IN)} notches in did not reach the bound; camera-to-target ${radius(before).toFixed(3)} m`);
  for (let k = 1; k <= NOTCHES_OUT; k += 1) {
    const after = await notch(page, 100);
    const moved = distance(after.position, before.position);
    if (moved < ZOOM.minStep - MM) problems.push(`${what}: notch ${String(k)} out moved ${moved.toFixed(4)} m`);
    before = after;
  }
  return problems;
}

test.describe('zoom', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  for (const view of ['aerial-ne', 'front', 'int-grand-stair-west'] as const) {
    test(`from ${view}, every wheel notch moves the camera until it stops in front of a surface, and back out`, async ({ page }) => {
      await open(page, `view=${view}`);
      expect(await zoomInAndOut(page, view)).toEqual([]);
    });
  }

  test('after a move by the W key, every wheel notch moves the camera until the bound, and back out', async ({ page }) => {
    await open(page, 'view=front');
    const start = await camera(page);
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    await settle(page);
    const moved = await camera(page);
    expect(distance(moved.position, start.position), 'the W key moved the camera').toBeGreaterThan(5);
    expect(await zoomInAndOut(page, 'after W')).toEqual([]);
  });

  test('from aerial-ne the zoom out stops at its far bound and the next notch in moves again', async ({ page }) => {
    await open(page, 'view=aerial-ne');
    const centre = await viewCentre(page);
    await page.mouse.move(centre.x, centre.y);
    let before = await camera(page);
    let atBound = false;
    for (let k = 1; k <= 60 && !atBound; k += 1) {
      const after = await notch(page, 100);
      const moved = distance(after.position, before.position);
      if (radius(before) >= ZOOM.maxDistance - MM) {
        atBound = true;
        expect(moved, 'a notch out at the far bound').toBeLessThan(MM);
      } else {
        expect(moved, `notch ${String(k)} out, camera-to-target ${radius(before).toFixed(1)} m`).toBeGreaterThan(ZOOM.minStep - MM);
      }
      before = after;
    }
    expect(atBound, `reached ${String(ZOOM.maxDistance)} m from the target`).toBe(true);
    const back = await notch(page, -100);
    expect(distance(back.position, before.position), 'a notch in from the far bound').toBeGreaterThan(ZOOM.minStep);
  });

  test('a preset chosen after zooming lands exactly, so the zoom leaves no state behind', async ({ page }) => {
    await open(page, 'view=front');
    const reference = await camera(page);
    const centre = await viewCentre(page);
    await page.mouse.move(centre.x, centre.y);
    for (let k = 0; k < 10; k += 1) await notch(page, -100);
    await choosePreset(page, 'front');
    await settle(page);
    const landed = await camera(page);
    expect(distance(landed.position, reference.position)).toBeLessThan(MM);
    expect(distance(landed.target, reference.target)).toBeLessThan(MM);
  });
});
