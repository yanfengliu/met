/**
 * The camera through real input (docs/design/spec.md, Page: View menu): a drag leaves the preset in view, and a preset lands where it says and stays
 * there, even when it is chosen while the orbit controls are still coasting from a drag, or in walk mode, which it leaves first; walking again and leaving
 * keeps the camera at the eye through a resize; a fit preset frames the whole canvas, the camera's aspect the canvas's, and is fitted to it again when
 * the window changes shape; an unknown view= starts the page as no view would, camera and all; and `window.__met` is frozen all the way down, so a
 * nested write to it changes nothing and cannot reach the page's framing.
 * Facts come from `window.__met`; presets are named only where the query needs one, and a fit preset's pose is resolved in Node from
 * src/viewer/presets.ts and the model's published bounds.
 * Bound: cameras are compared by position and target within 1 mm, read from `window.__met.camera`; "in frame" projects the model's bounding box with
 * that camera's fov and aspect in Node; what the canvas shows is not checked here.
 */
import { expect, test } from '@playwright/test';
import { Box3, Vector3 } from 'three';

import { presetById, resolvePreset } from '../../src/viewer/presets.js';
import type { CameraPose } from '../../src/viewer/presets.js';
import { cameraGap, choosePreset, cornerReach, distance, dragCanvas, noPointerLock, open, settledCamera, watchErrors } from './helpers.js';
import type { Camera, Facts } from './helpers.js';

/** The larger of the distances between the camera's position and target and a pose's, in metres. */
function poseGap(c: Camera, pose: CameraPose): number {
  return Math.max(new Vector3(...c.position).distanceTo(pose.position), new Vector3(...c.target).distanceTo(pose.target));
}

/** Where the preset `id` puts the camera for a view of `aspect` (src/viewer/presets.ts), the model's bounds as the page publishes them. */
function presetPose(f: Facts, id: string, aspect: number): CameraPose {
  const preset = presetById(id);
  if (preset === undefined) throw new Error(`No ${id} preset in src/viewer/presets.ts.`);
  return resolvePreset(preset, new Box3(new Vector3(...f.bounds.min), new Vector3(...f.bounds.max)), aspect);
}

test.describe('camera', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('a drag leaves the preset in view, and a preset chosen right after it lands on the preset and stays there', async ({ page }) => {
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
    expect(await page.evaluate(() => window.__met?.view), 'the preset in view after a drag').toBeNull();
    await choosePreset(page, interior.id);
    expect(await page.evaluate(() => window.__met?.view)).toBe(interior.id);
    const landed = await settledCamera(page);
    expect(cameraGap(landed, reference), `settled camera ${JSON.stringify(landed)} vs the preset ${JSON.stringify(reference)}`).toBeLessThan(1e-3);
  });

  test('a preset chosen from the menu in walk mode leaves walk mode and lands on it; walking again and leaving keeps the camera at the eye through a resize', async ({ page }) => {
    // F locks the pointer where the browser gives the lock, and a locked pointer reaches no menu (work unit 14): this browser gives none.
    await noPointerLock(page);
    await open(page);
    await choosePreset(page, 'front');
    const reference = await settledCamera(page);
    const walkMode = (mode: 'walk' | 'orbit') => page.waitForFunction((m) => window.__met?.walk.mode === m && !window.__met.walk.preparing, mode, { timeout: 15_000 });
    await page.keyboard.press('KeyF');
    await walkMode('walk');
    await choosePreset(page, 'front');
    await walkMode('orbit');
    const landed = await settledCamera(page);
    expect(cameraGap(landed, reference), `the camera ${JSON.stringify(landed)} vs the preset ${JSON.stringify(reference)}`).toBeLessThan(1e-3);
    expect(await page.evaluate(() => window.__met?.view), 'the preset in view').toBe('front');
    // Into walk mode where the walker last stood and out again: the orbit camera stands at the eye, and a resize must not fit a preset over it.
    await page.keyboard.press('KeyF');
    await walkMode('walk');
    await page.waitForFunction(() => window.__met?.walk.eye != null);
    const eye = await page.evaluate(() => window.__met?.walk.eye ?? null);
    if (eye === null) throw new Error('Walk mode reported no eye.');
    await page.keyboard.press('KeyF');
    await walkMode('orbit');
    const before = await settledCamera(page);
    expect(distance(before.position, eye), 'the orbit camera at the eye').toBeLessThan(0.01);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction((aspect) => window.__met !== undefined && Math.abs(window.__met.camera.aspect - aspect) > 0.01, before.aspect);
    const after = await settledCamera(page);
    expect(distance(after.position, eye), 'the orbit camera still at the eye after the resize').toBeLessThan(0.01);
    expect(await page.evaluate(() => window.__met?.view), 'no preset in view').toBeNull();
  });

  test('a fit preset frames the whole canvas and is fitted to it again when the window changes shape', async ({ page }) => {
    const f = await open(page, 'view=aerial-ne');
    const wide = await settledCamera(page);
    expect(wide.aspect, 'the whole canvas framed at 1280x720').toBeCloseTo(1280 / 720, 3);
    expect(poseGap(wide, presetPose(f, 'aerial-ne', wide.aspect)), 'metres from the preset fitted to the whole canvas at 1280x720').toBeLessThan(1e-3);
    expect(cornerReach(wide, f.bounds), 'model corners in frame at 1280x720').toBeLessThanOrEqual(1.001);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction((before) => window.__met !== undefined && Math.abs(window.__met.camera.aspect - before) > 0.01, wide.aspect);
    const tall = await settledCamera(page);
    expect(await page.evaluate(() => window.__met?.view)).toBe('aerial-ne');
    expect(tall.aspect, 'the whole canvas framed at 390x844').toBeCloseTo(390 / 844, 3);
    expect(poseGap(tall, presetPose(f, 'aerial-ne', tall.aspect)), 'metres from the preset fitted again to the whole canvas at 390x844').toBeLessThan(1e-3);
    expect(cornerReach(tall, f.bounds), 'model corners in frame after the resize to 390x844').toBeLessThanOrEqual(1.001);
  });

  test('an unknown view= is ignored: the camera starts as with no view', async ({ page }) => {
    const plain = await open(page, '');
    const plainCamera = await settledCamera(page);
    const unknown = await open(page, 'view=no-such-view');
    expect(unknown.warnings.some((w) => w.includes('view="no-such-view" names no preset')), 'a warning names the bad view').toBe(true);
    expect(unknown.view, 'the preset in view').toBe(plain.view);
    expect(cameraGap(await settledCamera(page), plainCamera), 'metres from the camera with no view').toBeLessThan(1e-3);
  });

  test('window.__met is frozen all the way down, so a nested write changes nothing and cannot reach the page: a fit preset still frames the model', async ({ page }) => {
    const f = await open(page);
    const written = await page.evaluate(() => {
      const m = window.__met;
      if (m === undefined) return null;
      /** Paths under `value` to objects that are not frozen; reading a getter gives its snapshot. */
      const unfrozen = (value: unknown, path: string): string[] => {
        if (typeof value !== 'object' || value === null) return [];
        return [...(Object.isFrozen(value) ? [] : [path]), ...Object.entries(value).flatMap(([k, v]) => unfrozen(v, `${path}.${k}`))];
      };
      const open = unfrozen(m, 'window.__met');
      // Writes deep into the model's bounds, a step's bounds, a floor's cut and the presets: a frozen object throws in strict code; either way nothing may change.
      const writes: (() => void)[] = [
        () => { (m.bounds.min as unknown as number[])[0] = 1e4; },
        () => {
          const max = m.steps[0]?.bounds.max as unknown as number[] | undefined;
          if (max !== undefined) max[1] = -1e4;
        },
        () => { (m.floors[0] as unknown as { cut: number }).cut = -1; },
        () => { (m.presets as unknown as unknown[]).length = 0; },
      ];
      for (const write of writes) {
        try {
          write();
        } catch {
          // A frozen object throws in strict code.
        }
      }
      return { open, bounds: m.bounds, step: m.steps[0]?.bounds ?? null, floor: m.floors[0] ?? null, presets: m.presets.length };
    });
    if (written === null) throw new Error('window.__met is not published.');
    expect(written.open, 'objects in window.__met that are not frozen').toEqual([]);
    expect(written.bounds, "the model's bounds after the writes").toEqual(f.bounds);
    expect(written.step, "the first step's bounds after the writes").toEqual(f.steps[0]?.bounds ?? null);
    expect(written.floor, 'the first floor after the writes').toEqual(f.floors[0] ?? null);
    expect(written.presets, 'the presets after the writes').toBe(f.presets.length);
    // The page frames from its own model: the default fit preset, chosen again, frames the bounds published at load.
    await choosePreset(page, 'aerial-ne');
    const cam = await settledCamera(page);
    expect(poseGap(cam, presetPose(f, 'aerial-ne', cam.aspect)), 'metres from the preset fitted to the bounds published at load').toBeLessThan(1e-3);
    expect(cornerReach(cam, f.bounds), 'model corners in frame').toBeLessThanOrEqual(1.001);
  });
});
