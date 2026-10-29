/**
 * The camera through real input (docs/design/spec.md, Page: View menu): a preset lands where it says and stays there, even when it is chosen
 * while the orbit controls are still coasting from a drag, or in walk mode, which it leaves first; the follow camera stays on through a press without movement and goes off with a drag;
 * a fit preset is fitted again when the window changes shape; an unknown view= starts the page as no view would.
 * Facts come from `window.__met`; presets are named only where the query needs one.
 * Also: walking again and leaving keeps the camera at the eye through a resize; during playback the follow camera's position, target and fov close on
 * each step's framing; and a nested write to `window.__met` cannot reach the follow camera.
 * Bound: cameras are compared by position and target within 1 mm, read from `window.__met.camera`; "in frame" projects the model's bounding box with
 * that camera's fov and aspect in Node; what the canvas shows is not checked here.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { DEFAULT_FOV, PRESETS } from '../../src/viewer/presets.js';
import { camera, cameraGap, centreOf, choosePreset, cornerReach, distance, dragCanvas, noPointerLock, open, press, settledCamera, watchErrors } from './helpers.js';
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
    await open(page, 'autoplay=1');
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

  test("a nested write to window.__met cannot reach the page: the follow camera still frames the step's own focus", async ({ page }) => {
    const f = await open(page);
    const k = f.steps.findIndex((s) => s.focus?.kind === 'view');
    const focus = f.steps[k]?.focus;
    if (focus?.kind !== 'view') throw new Error('No step frames an explicit view.');
    await open(page, `t=${String(k)}&autoplay=0`);
    const written = await page.evaluate((i) => {
      const own = window.__met?.steps[i]?.focus;
      if (own?.kind !== 'view') return null;
      try {
        (own.target as unknown as number[])[0] = 10000;
        (own.position as unknown as number[])[0] = 10000;
      } catch {
        // A frozen array throws in strict code; either way nothing may change.
      }
      return { frozen: Object.isFrozen(own) && Object.isFrozen(own.target), target: [...own.target] };
    }, k);
    await press(page, 'btn-play');
    await page.waitForFunction(() => window.__met?.followGoal != null);
    const goal = await page.evaluate(() => window.__met?.followGoal);
    expect(goal?.target, "the follow goal's target").toEqual([...focus.target]);
    expect(goal?.position, "the follow goal's position").toEqual([...focus.position]);
    expect(written?.target, 'the published focus after the write').toEqual([...focus.target]);
    expect(written?.frozen, "the step's published focus is frozen").toBe(true);
  });

  test('during playback the follow camera moves toward the framing of the step in motion: position, target and field of view', async ({ page }) => {
    const f = await open(page);
    // Two runs, each from a step whose framing the opening view is far from: one that frames its own pieces, one that frames a look preset with
    // its own field of view, so position, target and fov all have somewhere to go.
    const pieces = f.steps.findIndex((s) => s.focus === null && distance(centreOf(s.bounds), centreOf(f.bounds)) > 20);
    const preset = f.steps.findIndex((s) => {
      const focus = s.focus;
      if (focus?.kind !== 'preset') return false;
      const c = PRESETS.find((p) => p.id === focus.id)?.camera;
      return c?.kind === 'look' && c.fov !== undefined && Math.abs(c.fov - DEFAULT_FOV) > 2;
    });
    expect([pieces, preset].every((i) => i >= 0), 'steps to start from').toBe(true);
    for (const [start, what] of [[pieces, 'pieces'], [preset, 'preset']] as const) {
      const run = await followRun(page, f, start);
      expect(run.wrongGoals, `${what}: follow goals that do not look where the step's focus says`).toEqual([]);
      expect(run.approaches, `${what}: sample pairs within one step with the camera still under way`).toBeGreaterThanOrEqual(3);
      expect(run.away, `${what}: pairs where the camera moved away from the follow goal`).toEqual([]);
      if (what === 'preset') expect(run.fovApproaches, 'preset: pairs where the field of view closed on the goal').toBeGreaterThanOrEqual(3);
    }
  });
});

/**
 * Plays from step `start` with the follow camera on and samples it every 120 ms: goal targets the step's focus does not explain, pairs within one step
 * whose goal held still (and how many saw the fov close), and the pairs where the camera's position, target or fov moved away from that goal.
 */
async function followRun(page: Page, f: Facts, start: number): Promise<{ wrongGoals: string[]; approaches: number; fovApproaches: number; away: string[] }> {
  await open(page, `t=${String(start)}&autoplay=1`);
  await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.follow);
  const samples: { t: number; direction: 1 | -1; follow: boolean; camera: Facts['camera']; goal: Facts['followGoal'] }[] = [];
  for (let k = 0; k < 25; k += 1) {
    samples.push(await page.evaluate(() => {
      const m = window.__met;
      if (m === undefined) throw new Error('window.__met is not published.');
      return JSON.parse(JSON.stringify({ t: m.t, direction: m.direction, follow: m.follow, camera: m.camera, goal: m.followGoal })) as never;
    }));
    await page.waitForTimeout(120);
  }
  expect(samples.every((s) => s.follow), 'follow stays on without input').toBe(true);
  // Where the step in motion's framing looks, from the spec's CameraFocus (its pieces' bounds, a box, a view or a preset), independent of the rig.
  const framing = (t: number, direction: 1 | -1): { step: number; target: Vec3 } => {
    const index = Math.min(Math.max(direction === 1 ? Math.floor(t) : Math.ceil(t) - 1, 0), f.n - 1);
    const step = f.steps[index];
    if (step === undefined) throw new Error(`No step ${String(index)}.`);
    return { step: index, target: focusTarget(step.focus, step.bounds, f.bounds) };
  };
  const wrongGoals = samples.flatMap((s) => (s.goal !== null && distance(s.goal.target, framing(s.t, s.direction).target) > 1e-3 ? [`t ${s.t.toFixed(2)}: goal target ${s.goal.target.join(', ')}`] : []));
  // Within one step the goal holds still, and the camera's position, target and field of view each close on it.
  let approaches = 0;
  let fovApproaches = 0;
  const away: string[] = [];
  for (let k = 1; k < samples.length; k += 1) {
    const a = samples[k - 1];
    const b = samples[k];
    if (a?.goal == null || b?.goal == null || framing(a.t, a.direction).step !== framing(b.t, b.direction).step) continue;
    if (distance(a.goal.position, b.goal.position) > 1e-3 || a.goal.fov !== b.goal.fov) continue;
    const g = b.goal;
    const position = [distance(a.camera.position, g.position), distance(b.camera.position, g.position)] as const;
    const target = [distance(a.camera.target, g.target), distance(b.camera.target, g.target)] as const;
    const fov = [Math.abs(a.camera.fov - g.fov), Math.abs(b.camera.fov - g.fov)] as const;
    if (position[0] < 0.05) continue;
    approaches += 1;
    if (fov[0] > 0.05 && fov[1] < fov[0]) fovApproaches += 1;
    const at = `t ${a.t.toFixed(2)}..${b.t.toFixed(2)}`;
    if (!(position[1] < position[0])) away.push(`${at}: position ${position[0].toFixed(3)} m to ${position[1].toFixed(3)} m`);
    if (target[0] >= 0.05 && !(target[1] < target[0])) away.push(`${at}: target ${target[0].toFixed(3)} m to ${target[1].toFixed(3)} m`);
    if (fov[0] > 1e-6 && !(fov[1] < fov[0])) away.push(`${at}: fov ${fov[0].toFixed(3)} to ${fov[1].toFixed(3)} degrees off`);
  }
  return { wrongGoals, approaches, fovApproaches, away };
}

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
