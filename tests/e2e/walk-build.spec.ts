/**
 * Walk mode while the build moves (docs/design/spec.md, Walk mode: When the build moves), through the timeline bar's real buttons with the walker
 * on the real model: at t = 0 it stands on the workspace ground; End builds the plaza over it and it stands where the plaza spawn stands at t = N;
 * Home lets it fall to the workspace ground and End lifts it again; playing the site chapter from its end while walking restarts the build under
 * the walker, which is never left under a surface once the step that built it completes and ends where the spawn stands; and the front steps built
 * through a walker standing in their place lift it onto its tread, from where it walks on up them.
 * Facts come from `window.__met.walk`; the workspace ground is the spec's (0.5 m under the lower of grade and the model's lowest point); the treads
 * from src/model/site/steps.ts `stepRows`. Frames of the walker after each lift go to the test's output folder for a person to inspect.
 * Bound: one place on the plaza and one on the front steps; the walk after the lift is checked by height, not by route.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { LANDING_Y } from '../../src/model/frame.js';
import { stepRows } from '../../src/model/site/steps.js';
import { distance, facts, open, press, settle, watchErrors } from './helpers.js';
import type { Facts } from './helpers.js';

const EYE = 1.6;
type Walk = Facts['walk'];

async function walking(page: Page): Promise<Walk & { eye: readonly [number, number, number] }> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
  const walk = (await facts(page)).walk;
  if (walk.eye === null) throw new Error('Walk mode reported no eye.');
  return { ...walk, eye: walk.eye };
}

/** The walk facts once the collision holds `steps` complete steps and the eye has eased out of any snap (0.3 s). */
async function builtTo(page: Page, steps: number): Promise<Walk & { eye: readonly [number, number, number] }> {
  await page.waitForFunction((n) => window.__met?.walk.collision?.steps === n, steps, { timeout: 15_000 });
  await page.waitForTimeout(300);
  await settle(page);
  return walking(page);
}

const workspaceGround = (f: Facts): number => Math.min(0, f.bounds.min[1]) - 0.5;

test.describe('walk mode while the build moves', () => {
  // Each test takes 10 to 15 s here; the deadline covers a loaded machine, which slows the walks and builds without changing where they end.
  test.setTimeout(60_000);
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('at t = 0 the walker stands on the workspace ground; End lifts it onto the plaza, Home drops it and End lifts it again', async ({ page }) => {
    await open(page, 'walk=1&spawn=plaza');
    const reference = await walking(page);
    const f = await open(page, 't=0&walk=1&spawn=plaza');
    const ground = workspaceGround(f);
    const start = await walking(page);
    expect(start.eye[1], 'at t = 0, on the workspace ground at once').toBeCloseTo(ground + EYE, 3);
    expect(start.onGround).toBe(true);
    for (const round of [1, 2]) {
      await press(page, 'btn-end');
      const lifted = await builtTo(page, f.n);
      await page.screenshot({ path: test.info().outputPath(`plaza-after-end-${String(round)}.png`) });
      expect(distance(lifted.eye, reference.eye), `End ${String(round)}: where the plaza spawn stands at t = N, eye ${lifted.eye.join(', ')}`).toBeLessThan(0.01);
      expect(lifted.onGround).toBe(true);
      await page.waitForTimeout(1000);
      expect(distance((await walking(page)).eye, reference.eye), `End ${String(round)}: still there a second later`).toBeLessThan(0.01);
      if (round === 2) break;
      await press(page, 'btn-start');
      await page.waitForFunction((y) => window.__met?.walk.onGround === true && Math.abs((window.__met.walk.eye?.[1] ?? 0) - y) < 1e-3, ground + EYE, { timeout: 10_000 });
    }
  });

  test('playing the site from its end while walking: the build restarts under the walker, which stands on each surface as it completes', async ({ page }) => {
    await open(page, 'solo=site&walk=1&spawn=plaza');
    const reference = await walking(page);
    const f = await facts(page);
    await press(page, 'speed-4');
    await press(page, 'btn-play');
    const samples = await page.evaluate((n) => new Promise<{ t: number; steps: number; eye: number[] }[]>((resolve, reject) => {
      const out: { t: number; steps: number; eye: number[] }[] = [];
      const started = performance.now();
      const tick = (): void => {
        const m = window.__met;
        if (m === undefined) return;
        if (m.walk.eye !== null && m.walk.collision !== null) out.push({ t: m.t, steps: m.walk.collision.steps, eye: [...m.walk.eye] });
        if (m.mode === 'paused' && m.t === n && out.length > 1) resolve(out);
        else if (performance.now() - started > 40_000) reject(new Error(`The site did not play to its end in 40 s; t ${String(m.t)}.`));
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), f.n);
    const counts = [...new Set(samples.map((s) => s.steps))];
    expect(counts, 'the collision was built for every number of complete steps from the restart to the end').toEqual(Array.from({ length: f.n + 1 }, (_, k) => k));
    const under = samples.filter((s) => s.steps >= 1 && s.eye[1] !== undefined && s.eye[1] < reference.eye[1] - 0.6);
    expect(under.map((s) => `t ${s.t.toFixed(2)}, ${String(s.steps)} steps: eye at ${String(s.eye[1])}`), 'samples with the walker under the ground once it was built').toEqual([]);
    const end = await builtTo(page, f.n);
    expect(distance(end.eye, reference.eye), `at the end, eye ${end.eye.join(', ')}`).toBeLessThan(0.01);
    expect(end.onGround).toBe(true);
  });

  test('the front steps built through a walker standing in their place lift it onto its tread, and it walks on up them', async ({ page }) => {
    const plain = await open(page);
    const before = plain.steps.findIndex((s) => s.id === 'steps-landing');
    expect(before, 'the step that starts the front steps').toBeGreaterThan(0);
    await open(page, `t=${String(before)}&walk=1&spawn=plaza`);
    await walking(page);
    // From the plaza toward the facade, into where the flight will stand (Z +8.5 to +20).
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => (window.__met?.walk.eye?.[2] ?? 99) < 16, undefined, { timeout: 10_000 });
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(400);
    const inside = await walking(page);
    expect(inside.eye[1] - EYE, 'at grade where the flight will stand').toBeLessThan(0.2);
    await press(page, 'btn-end');
    const lifted = await builtTo(page, plain.n);
    await page.screenshot({ path: test.info().outputPath('front-steps-after-end.png') });
    const feet = lifted.eye[1] - EYE;
    const z = lifted.eye[2];
    const tread = stepRows().find((r) => Math.abs(r.y - feet) < 0.01 && z >= r.zIn - 0.05 && z <= r.z + 0.05);
    expect(tread, `the feet at ${feet.toFixed(3)} m, Z ${z.toFixed(2)}, on the tread of the row there (${stepRows().map((r) => `${r.y.toFixed(2)} at Z ${r.zIn.toFixed(2)}..${r.z.toFixed(2)}`).join('; ')})`).toBeDefined();
    expect(Math.abs(z - inside.eye[2]), 'lifted straight up').toBeLessThan(0.05);
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    // W is held until the eye stands over the landing (a position, not a time, so the walking speed and a loaded machine change only how long).
    await page.keyboard.down('KeyW');
    const climbed = await page.waitForFunction((y) => (window.__met?.walk.eye?.[1] ?? 0) > y, LANDING_Y + EYE - 0.05, { timeout: 15_000 }).then(() => true, () => false);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(400);
    const up = await walking(page);
    expect(climbed, `walked on up the steps to the landing within 15 s; the eye at ${up.eye.join(', ')}`).toBe(true);
    expect(up.eye[1], 'on the landing').toBeGreaterThan(LANDING_Y + EYE - 0.05);
    expect(up.onGround).toBe(true);
  });
});
