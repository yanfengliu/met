/**
 * The build replay through real input at 1280×720 and 390×844 (docs/design/spec.md, Page: Build replay; work unit 11, the owner's request of 2026-10-29:
 * "Lose the timeline on default rendering. It should only show if the user is interested in seeing a build replay. Hide the option behind some menu."):
 * - the page opens on the finished building, paused, with no timeline control in view, the menus, the floor picker and the Walk toggle in view, inside
 *   the viewport and apart, no follow-camera toggle in the View menu, and the view framing the whole canvas;
 * - the Build menu's Build replay item opens the replay at the finished building, paused, with every timeline control and the follow-camera toggle in
 *   view, and frames the part of the canvas above the bar, the preset in view fitted again; the bar's close button and then the menu item, after Play,
 *   close it: no timeline, the finished building, paused, the whole canvas framed and the preset where it was;
 * - a timeline key on the default page opens the replay and acts there (Space plays the build from the empty site, as Play does at the end), and none
 *   opens it while walking;
 * - autoplay=1 opens it playing from t = 0, framed above the bar; replay=1 opens it paused at the end; t= and step= open it at their position; shot=1
 *   opens it as the query does and plays nothing; no other query opens it;
 * - a floor's framing is fitted again when the replay opens and when it closes.
 * Facts come from the read-only `window.__met`; the controls are found by data-testid; the model's corners in frame are projected in Node (helpers.ts).
 * Bound: boxes are compared as layout rectangles; the bar's drawing is judged in the captures (.shots/replay/, npm run shots).
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, Vector3 } from 'three';

import { floorById, floorPose } from '../../src/viewer/floors.js';
import { presetById, resolvePreset } from '../../src/viewer/presets.js';
import type { CameraPose } from '../../src/viewer/presets.js';
import { camera, cameraGap, cornerReach, facts, labelStep, open, openMenu, openReplay, press, settledCamera, waitForT, watchErrors } from './helpers.js';
import type { Camera, Facts } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

/** Every control of the timeline: the bar's label, scrubber, transport and speeds, its close button and, walking, its Timeline button. */
const TIMELINE = ['step-label', 'step-detail', 'scrubber', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4', 'replay-close', 'bar-toggle'];
/** The controls that are not the timeline's, which every orbit view shows: the menus' buttons, the Walk toggle and the floor picker. */
const others = (f: Facts): string[] => ['chapter-menu-button', 'view-menu-button', 'walk-toggle', 'floor-all', ...f.floors.map((floor) => `floor-${floor.id}`)];

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Boxes of the visible elements among `ids`, by layout: those with a box and not `visibility: hidden`. */
async function boxes(page: Page, ids: readonly string[]): Promise<Box[]> {
  return page.evaluate((list) => list.flatMap((id) => {
    const e = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (e === null || e.getClientRects().length === 0 || getComputedStyle(e).visibility === 'hidden') return [];
    const r = e.getBoundingClientRect();
    return [{ id, x: r.x, y: r.y, w: r.width, h: r.height }];
  }), ids);
}

const shown = async (page: Page, ids: readonly string[]): Promise<string[]> => (await boxes(page, ids)).map((b) => b.id).sort();

/** Every box inside the viewport and apart from every other. */
function expectLaidOut(list: readonly Box[], viewport: { width: number; height: number }, what: string): void {
  for (const b of list) expect(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= viewport.width + 0.5 && b.y + b.h <= viewport.height + 0.5, `${what}: ${b.id} inside the viewport`).toBe(true);
  const pairs = list.flatMap((a, i) => list.slice(i + 1).filter((b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5).map((b) => `${a.id} / ${b.id}`));
  expect(pairs, `${what}: overlapping controls`).toEqual([]);
}

/** The aspect of the part of the canvas above the whole bar, as the page fits it (src/main.ts `fitInset`: the bar's height rounded to a pixel). */
async function aspectAboveBar(page: Page, viewport: { width: number; height: number }): Promise<number> {
  const bar = await page.getByTestId('timeline-bar').boundingBox();
  if (bar === null) throw new Error('The timeline bar has no box.');
  return viewport.width / (viewport.height - Math.round(bar.height));
}

/** The larger of the distances between the camera's position and target and a pose's, in metres. */
function poseGap(c: Camera, pose: CameraPose): number {
  return Math.max(new Vector3(...c.position).distanceTo(pose.position), new Vector3(...c.target).distanceTo(pose.target));
}

/** Where the default preset, aerial-ne, puts the camera for a view of `aspect` (src/viewer/presets.ts), the model's bounds as the page publishes them. */
function aerialNe(f: Facts, aspect: number): CameraPose {
  const preset = presetById('aerial-ne');
  if (preset === undefined) throw new Error('No aerial-ne preset in src/viewer/presets.ts.');
  return resolvePreset(preset, new Box3(new Vector3(...f.bounds.min), new Vector3(...f.bounds.max)), aspect);
}

/** The camera's elevation over the horizon and its azimuth about the target, in degrees. */
function orbitAngles(c: Camera): { elevation: number; azimuth: number } {
  const [dx, dy, dz] = [c.position[0] - c.target[0], c.position[1] - c.target[1], c.position[2] - c.target[2]];
  return { elevation: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI, azimuth: (Math.atan2(dz, dx) * 180) / Math.PI };
}

const replayOpen = (page: Page): Promise<boolean | undefined> => page.evaluate(() => window.__met?.replay);

for (const viewport of VIEWPORTS) {
  test.describe(`the build replay at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });
    let errors: { expectClean: () => void };
    test.beforeEach(({ page }) => {
      errors = watchErrors(page);
    });
    test.afterEach(() => {
      errors.expectClean();
    });

    test('the default page shows no timeline and every other control; Build replay opens it framed above the bar; its close button and the menu item close it at the finished building', async ({ page }) => {
      const f = await open(page, '');
      expect([f.replay, f.t, f.mode, f.walk.mode, f.view], 'replay, t, mode, walk mode and view at load').toEqual([false, f.n, 'paused', 'orbit', 'aerial-ne']);
      expect(await shown(page, TIMELINE), 'timeline controls on the default page').toEqual([]);
      expect(await shown(page, others(f)), 'the other controls on the default page').toEqual([...others(f)].sort());
      expectLaidOut(await boxes(page, others(f)), viewport, 'the default page');
      const closed = await settledCamera(page);
      expect(closed.aspect, 'the default page frames the whole canvas').toBeCloseTo(viewport.width / viewport.height, 3);
      expect(poseGap(closed, aerialNe(f, closed.aspect)), 'metres from the default preset fitted to the whole canvas').toBeLessThan(1e-3);
      expect(cornerReach(closed, f.bounds), 'the model in frame on the whole canvas').toBeLessThanOrEqual(1.001);
      await openMenu(page, 'view-menu');
      await expect(page.getByTestId('follow-toggle'), 'no follow-camera toggle with the replay closed').toBeHidden();
      await expect(page.getByTestId('cut-toggle')).toBeVisible();
      await page.keyboard.press('Escape');

      // Opened by the Build menu's item: every timeline control, at the finished building, paused, framed above the bar.
      await openReplay(page);
      const opened = await facts(page);
      expect([opened.replay, opened.t, opened.mode, opened.view], 'replay, t, mode and view once opened').toEqual([true, f.n, 'paused', 'aerial-ne']);
      expect(await shown(page, TIMELINE), 'timeline controls with the replay open').toEqual(TIMELINE.filter((id) => id !== 'bar-toggle').sort());
      expectLaidOut(await boxes(page, [...TIMELINE, ...others(f)]), viewport, 'the replay open');
      await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
      expect(await labelStep(page), 'the label at the end').toBe(f.n);
      await expect(page.getByTestId('scrubber')).toHaveValue(String(f.n));
      const above = await settledCamera(page);
      expect(above.aspect, 'the replay frames the part of the canvas above the bar').toBeCloseTo(await aspectAboveBar(page, viewport), 3);
      // A fit limited by the view's height stands where it stood; one limited by its width comes nearer as the view widens (390×844).
      expect(poseGap(above, aerialNe(f, above.aspect)), 'metres from the preset fitted again above the bar').toBeLessThan(1e-3);
      expect(cornerReach(above, f.bounds), 'the model in frame above the bar').toBeLessThanOrEqual(1.001);
      await openMenu(page, 'view-menu');
      await expect(page.getByTestId('follow-toggle'), 'the follow-camera toggle with the replay open').toBeVisible();
      await page.keyboard.press('Escape');

      // Closed by the bar's close button: no timeline, the finished building, the whole canvas, the preset where it was.
      await press(page, 'replay-close');
      await expect(page.getByTestId('btn-play')).toBeHidden();
      expect(await replayOpen(page)).toBe(false);
      expect(await shown(page, TIMELINE), 'timeline controls once closed').toEqual([]);
      const back = await settledCamera(page);
      expect(back.aspect, 'closed, the whole canvas again').toBeCloseTo(viewport.width / viewport.height, 3);
      expect(cameraGap(back, closed), 'metres from where the preset stood before').toBeLessThan(1e-3);

      // Opened again and played from the empty site, then closed by the menu item: back at the finished building, paused.
      await openReplay(page);
      await press(page, 'btn-play');
      await page.waitForFunction(() => window.__met?.mode === 'playing');
      expect(await page.evaluate(() => window.__met?.t), 'Play at the end runs the build from the empty site').toBeLessThan(1);
      await openMenu(page, 'chapter-menu');
      await expect(page.getByTestId('replay-toggle')).toHaveAttribute('aria-checked', 'true');
      await press(page, 'replay-toggle');
      await expect(page.getByTestId('btn-play')).toBeHidden();
      const shut = await facts(page);
      expect([shut.replay, shut.t, shut.mode], 'replay, t and mode once closed while playing').toEqual([false, f.n, 'paused']);
      await expect(page.getByTestId('replay-toggle')).toHaveAttribute('aria-checked', 'false');
      expect(await shown(page, TIMELINE), 'timeline controls once closed by the menu').toEqual([]);
    });

    test('a timeline key on the default page opens the replay and acts there; Space plays from the empty site; walking, none opens it', async ({ page }) => {
      const cases: readonly [string, (f: Facts) => Promise<void>][] = [
        ['Space', async () => { await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === 1 && window.__met.t < 1); }],
        ['Shift+Space', async () => { await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === -1); }],
        ['ArrowLeft', async (f) => { await waitForT(page, f.n - 1); }],
        ['ArrowRight', async (f) => { await waitForT(page, f.n); }],
        ['Home', async () => { await waitForT(page, 0); }],
        ['End', async (f) => { await waitForT(page, f.n); }],
      ];
      for (const [key, acted] of cases) {
        const f = await open(page, '');
        // A click on the canvas without a drag leaves focus on the page.
        await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
        await page.keyboard.press(key);
        await acted(f);
        await expect(page.getByTestId('btn-play'), `${key}: the timeline shows`).toBeVisible();
        expect(await replayOpen(page), `${key}: the replay open`).toBe(true);
      }
      // Walking, the timeline keys are off: they neither act nor open the replay.
      const f = await open(page, '');
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
      for (const key of ['Space', 'Shift+Space', 'Home', 'End']) await page.keyboard.press(key);
      for (const key of ['ArrowLeft', 'ArrowRight']) {
        await page.keyboard.down(key);
        await page.waitForTimeout(100);
        await page.keyboard.up(key);
      }
      await page.waitForTimeout(300);
      const after = await facts(page);
      expect([after.replay, after.t, after.mode, after.walk.mode], 'replay, t, mode and walk mode after the keys while walking').toEqual([false, f.n, 'paused', 'walk']);
      expect(await shown(page, TIMELINE), 'timeline controls while walking with the replay closed').toEqual([]);
    });

    test('autoplay=1 opens the replay playing from t = 0, replay=1 paused at the end, t= and step= at their position; shot=1 opens it as the query does and plays nothing', async ({ page }) => {
      const plain = await open(page, '');
      expect(plain.replay, 'no query').toBe(false);
      await page.goto('/?autoplay=1');
      await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.t > 0.05);
      const playing = await facts(page);
      expect([playing.replay, playing.follow], 'autoplay=1: replay and follow camera').toEqual([true, true]);
      expect(playing.t, 'autoplay=1 plays from the empty site').toBeLessThan(1.5);
      await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Pause');
      expect(playing.camera.aspect, 'autoplay=1: the follow camera frames the part above the bar').toBeCloseTo(await aspectAboveBar(page, viewport), 3);
      const step = plain.steps[4];
      if (step === undefined) throw new Error('The sequence has fewer than five steps.');
      const opened: readonly [string, number][] = [['replay=1', plain.n], ['t=3', 3], [`step=${step.id}`, 5], ['shot=1&t=3', 3], ['shot=1&replay=1', plain.n], ['shot=1&autoplay=1', 0]];
      for (const [query, t] of opened) {
        const f = await open(page, query);
        expect([f.replay, f.t, f.mode], `${query}: replay, t and mode`).toEqual([true, t, 'paused']);
        await expect(page.getByTestId('btn-play'), `${query}: the timeline shows`).toBeVisible();
        expect(await labelStep(page), `${query}: the label`).toBe(t);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => window.__met?.t), `${query}: still at its position`).toBe(t);
      }
      for (const query of ['shot=1', 'autoplay=0', 'replay=0', 'view=front', 'walk=1', 'floor=main', 'cut=8', 'doors=open', 't=abc']) {
        const f = await open(page, query);
        expect([f.replay, f.t], `${query}: replay and t`).toEqual([false, f.n]);
        await expect(page.getByTestId('btn-play'), `${query}: no timeline`).toBeHidden();
      }
    });

    test('a floor framed from above is framed again above the bar when the replay opens, and on the whole canvas when it closes', async ({ page }) => {
      const second = floorById('second');
      if (second === undefined) throw new Error('No second floor in src/viewer/floors.ts.');
      expect((await open(page, 'floor=second')).floor.id, 'the floor at load').toBe(second.id);
      const whole = await settledCamera(page);
      expect(whole.aspect).toBeCloseTo(viewport.width / viewport.height, 3);
      expect(orbitAngles(whole).elevation, 'framed from above at 65°').toBeCloseTo(65, 3);
      await openReplay(page);
      const above = await settledCamera(page);
      const now = await facts(page);
      expect([now.floor.id, now.cut], 'the floor view and its cut, kept').toEqual([second.id, { enabled: true, height: second.cut }]);
      expect(above.aspect, 'framed above the bar').toBeCloseTo(await aspectAboveBar(page, viewport), 3);
      expect(orbitAngles(above).elevation, 'still from above at 65°').toBeCloseTo(65, 3);
      expect(orbitAngles(above).azimuth, 'from the same side').toBeCloseTo(orbitAngles(whole).azimuth, 3);
      expect(above.target[1], 'the target in the storey').toBeGreaterThan(second.level);
      const framed = floorPose(second, { position: new Vector3(...whole.position), target: new Vector3(...whole.target) }, above.aspect);
      expect(poseGap(above, framed), 'metres from the floor framed again above the bar').toBeLessThan(1e-3);
      await press(page, 'replay-close');
      await expect(page.getByTestId('btn-play')).toBeHidden();
      const again = await camera(page);
      expect(again.aspect).toBeCloseTo(viewport.width / viewport.height, 3);
      expect(cameraGap(await settledCamera(page), whole), 'metres from the first framing').toBeLessThan(1e-3);
    });
  });
}
