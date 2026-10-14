/**
 * The camera through real input (docs/design/spec.md, Page: View menu): a preset lands where it says and stays there, even when it is chosen
 * while the orbit controls are still coasting from a drag; the follow camera stays on through a press without movement and goes off with a drag;
 * a fit preset is fitted again when the window changes shape; an unknown view= starts the page as no view would.
 * Facts come from `window.__met`; presets are named only where the query needs one.
 * Bound: cameras are compared by position and target within 1 mm, read from `window.__met.camera`; "in frame" projects the model's bounding box with
 * that camera's fov and aspect in Node; what the canvas shows is not checked here.
 */
import { expect, test } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { PRESETS } from '../../src/viewer/presets.js';
import { camera, cameraGap, centreOf, choosePreset, cornerReach, distance, dragCanvas, open, press, settledCamera, watchErrors } from './helpers.js';
import type { Facts } from './helpers.js';

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

  test('a fit preset is fitted again when the window changes shape', async ({ page }) => {
    const f = await open(page, 'autoplay=0&view=aerial-ne');
    const wide = await settledCamera(page);
    expect(cornerReach(wide, f.bounds), 'model corners in frame at 1280x720').toBeLessThanOrEqual(1.001);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction((before) => window.__met !== undefined && Math.abs(window.__met.camera.aspect - before) > 0.01, wide.aspect);
    const tall = await settledCamera(page);
    expect(await page.evaluate(() => window.__met?.view)).toBe('aerial-ne');
    expect(cornerReach(tall, f.bounds), 'model corners in frame after the resize to 390x844').toBeLessThanOrEqual(1.001);
  });

  test('an unknown view= is ignored: the camera and the follow camera start as with no view', async ({ page }) => {
    const plain = await open(page, '');
    const unknown = await open(page, 'view=no-such-view');
    expect(unknown.warnings.some((w) => w.includes('view="no-such-view" names no preset')), 'a warning names the bad view').toBe(true);
    expect([unknown.view, unknown.follow]).toEqual([plain.view, plain.follow]);
    expect(unknown.follow).toBe(true);
  });

  test('during playback the follow camera moves toward the framing of the step in motion', async ({ page }) => {
    const f = await open(page);
    // Start playing at the first step that frames its own pieces away from the opening view's target, so the camera has somewhere to go.
    const start = f.steps.findIndex((s) => s.focus === null && distance(centre(s.bounds), centre(f.bounds)) > 20);
    expect(start, 'a step framing its own pieces away from the model centre').toBeGreaterThanOrEqual(0);
    await open(page, `t=${String(start)}&autoplay=1`);
    await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.follow);
    const samples: { t: number; direction: 1 | -1; follow: boolean; target: Vec3 }[] = [];
    for (let k = 0; k < 25; k += 1) {
      samples.push(await page.evaluate(() => {
        const m = window.__met;
        if (m === undefined) throw new Error('window.__met is not published.');
        return { t: m.t, direction: m.direction, follow: m.follow, target: m.camera.target };
      }));
      await page.waitForTimeout(120);
    }
    expect(samples.every((s) => s.follow), 'follow stays on without input').toBe(true);
    // The goal's target for the step in motion, from the spec's CameraFocus: its pieces' bounds, a box, a view or a preset.
    const goal = (t: number, direction: 1 | -1): { step: number; target: Vec3 } => {
      const index = Math.min(Math.max(direction === 1 ? Math.floor(t) : Math.ceil(t) - 1, 0), f.n - 1);
      const step = f.steps[index];
      if (step === undefined) throw new Error(`No step ${String(index)}.`);
      return { step: index, target: focusTarget(step.focus, step.bounds, f.bounds) };
    };
    let approaches = 0;
    const away: string[] = [];
    for (let k = 1; k < samples.length; k += 1) {
      const a = samples[k - 1];
      const b = samples[k];
      if (a === undefined || b === undefined) continue;
      const ga = goal(a.t, a.direction);
      const gb = goal(b.t, b.direction);
      if (ga.step !== gb.step) continue;
      const before = distance(a.target, ga.target);
      const after = distance(b.target, gb.target);
      if (before < 0.05) continue;
      approaches += 1;
      if (!(after < before)) away.push(`step ${String(ga.step)} at t ${a.t.toFixed(2)}..${b.t.toFixed(2)}: ${before.toFixed(3)} m to ${after.toFixed(3)} m`);
    }
    expect(approaches, 'sample pairs within one step with the camera still under way').toBeGreaterThanOrEqual(3);
    expect(away, 'pairs where the camera target moved away from the step framing').toEqual([]);
  });
});

const centre = centreOf;

/** Where a step's framing looks (docs/design/spec.md, CameraFocus): its pieces' or the box's centre, the view's target, or the preset's target. */
function focusTarget(focus: Facts['steps'][number]['focus'], bounds: Facts['bounds'], model: Facts['bounds']): Vec3 {
  if (focus === null || focus.kind === 'pieces') return centre(bounds);
  if (focus.kind === 'box') return centre(focus);
  if (focus.kind === 'view') return focus.target;
  const preset = PRESETS.find((p) => p.id === focus.id);
  if (preset === undefined) return centre(bounds);
  return preset.camera.kind === 'look' ? preset.camera.target : centre(model);
}
