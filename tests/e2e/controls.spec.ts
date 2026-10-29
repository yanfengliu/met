/**
 * Timeline controls through real input at 1280×720 and 390×844 (docs/design/spec.md, Page: Build replay and Timeline bar): the first load (the finished
 * building, paused, with no timeline; the Build menu's Build replay opens it there, and Play runs the build from the start), autoplay=1, every transport
 * button, speed, the scrubber by mouse drag, and every keyboard shortcut of the orbit view, each test opening the replay by the Build menu as a person does
 * (./replay.spec.ts drives the replay's opening and closing, its framing and the timeline keys on the default page).
 * Each test checks the label, the scrubber value, the read-only `window.__met.t` and, where the scene must change, the canvas pixels.
 * Bound: pixel checks compare coarse luminance grids, so they prove that the drawing changed where the model is and not at the far corners, not that it is right.
 * The speed ratio is read against the page's own frame timestamps, not a wall clock: it proves how fast `t` runs per second of frames at each speed, and
 * needs at least one frame in each 1 s window short enough that the page does not cap its time.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { changedCells, cornerCells, currentT, labelStep, lumaGrid, open, openReplay, press, settle, waitForT, watchErrors } from './helpers.js';
import type { Facts } from './helpers.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

/** Opens the page, then the build replay by the Build menu, and goes to the empty site by the bar's start button. */
async function openAtStart(page: Page): Promise<Facts> {
  const f = await open(page);
  await openReplay(page);
  await press(page, 'btn-start');
  await waitForT(page, 0);
  return f;
}

for (const viewport of VIEWPORTS) test.describe(`timeline controls at ${String(viewport.width)}x${String(viewport.height)}`, () => {
  test.use({ viewport });
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('first load shows the finished building, paused, in the orbit view, with no timeline; Build replay shows it there, and Play runs the build from the start', async ({ page }) => {
    const f = await open(page, '');
    expect(f.t).toBe(f.n);
    expect(f.mode).toBe('paused');
    expect(f.walk.mode).toBe('orbit');
    expect(f.view).toBe('aerial-ne');
    expect(f.replay, 'the build replay at load').toBe(false);
    for (const id of ['btn-play', 'step-label', 'scrubber']) await expect(page.getByTestId(id), `${id} at load`).toBeHidden();
    await page.waitForTimeout(300);
    expect(await currentT(page), 'still at the end without input').toBe(f.n);
    await openReplay(page);
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
    await expect(page.getByTestId('step-label')).toHaveText(new RegExp(`^Step ${String(f.n)} / ${String(f.n)} · `));
    await expect(page.getByTestId('scrubber')).toHaveValue(String(f.n));
    expect([await currentT(page), await page.evaluate(() => window.__met?.mode)], 'opening the replay moves nothing').toEqual([f.n, 'paused']);
    await press(page, 'btn-play');
    await page.waitForFunction(() => window.__met?.mode === 'playing');
    const t = await currentT(page);
    expect(t, 'Play at the end starts again from the empty site').toBeLessThan(1);
  });

  test('autoplay=1 opens the replay and plays the build from t = 0 with the follow camera on, and autoplay=0 opens as with no query', async ({ page }) => {
    const plain = await open(page, 'autoplay=0');
    expect([plain.t, plain.mode, plain.replay]).toEqual([plain.n, 'paused', false]);
    await page.goto('/?autoplay=1');
    await page.waitForFunction(() => window.__met?.mode === 'playing');
    await page.waitForFunction(() => (window.__met?.t ?? 0) > 0.05);
    expect(await currentT(page)).toBeLessThan(1.5);
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Pause');
    expect(await page.evaluate(() => [window.__met?.follow, window.__met?.replay])).toEqual([true, true]);
  });

  test('end and start jump to N and 0, and the model appears where it stands', async ({ page }) => {
    const f = await openAtStart(page);
    const scrubber = page.getByTestId('scrubber');
    expect(await currentT(page)).toBe(0);
    expect(await labelStep(page)).toBe(0);
    await expect(scrubber).toHaveValue('0');
    const empty = await lumaGrid(page);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await expect(page.getByTestId('step-label')).toHaveText(new RegExp(`^Step ${String(f.n)} / ${String(f.n)} · `));
    await expect(scrubber).toHaveValue(String(f.n));
    const built = await lumaGrid(page);
    const changed = changedCells(empty, built);
    expect(changed.length, 'cells that changed between t = 0 and t = N').toBeGreaterThan(8);
    expect(changed.filter((cell) => cornerCells().includes(cell)), 'far corners stay workspace ground').toEqual([]);
    await press(page, 'btn-start');
    await waitForT(page, 0);
    expect(await labelStep(page)).toBe(0);
    expect(changedCells(empty, await lumaGrid(page)), 'back at t = 0 the canvas matches the empty site').toEqual([]);
  });

  test('step forward and step back animate to integers, and a second press retargets', async ({ page }) => {
    const f = await openAtStart(page);
    test.skip(f.n < 3, 'needs at least three steps');
    await press(page, 'speed-4');
    await press(page, 'btn-step-forward');
    await waitForT(page, 1);
    expect(await labelStep(page)).toBe(1);
    await expect(page.getByTestId('scrubber')).toHaveValue('1');
    await press(page, 'btn-step-forward');
    await press(page, 'btn-step-forward');
    await waitForT(page, 3);
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    await press(page, 'btn-step-back');
    await waitForT(page, 2);
    expect(await labelStep(page)).toBe(2);
  });

  test('play pauses and resumes; play backward runs t down; both stop at the ends', async ({ page }) => {
    const f = await openAtStart(page);
    await press(page, 'speed-4');
    await press(page, 'btn-play');
    await page.waitForFunction(() => (window.__met?.t ?? 0) > 0.3);
    await press(page, 'btn-play');
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
    const paused = await currentT(page);
    await page.waitForTimeout(300);
    expect(await currentT(page)).toBe(paused);
    await press(page, 'btn-end');
    await waitForT(page, f.n);
    await press(page, 'btn-play-backward');
    await expect(page.getByTestId('btn-play-backward')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction((n) => (window.__met?.t ?? n) < n - 0.3, f.n);
    expect(await page.evaluate(() => window.__met?.direction)).toBe(-1);
    await press(page, 'btn-play-backward');
    await expect(page.getByTestId('btn-play-backward')).toHaveAttribute('aria-pressed', 'false');
    // Forward from one step before the end stops exactly at N.
    await press(page, 'btn-end');
    await press(page, 'btn-step-back');
    await waitForT(page, f.n - 1);
    await press(page, 'btn-play');
    await waitForT(page, f.n);
    await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
  });

  test('speed buttons set the rate: 4x plays about eight times as fast as 0.5x', async ({ page }) => {
    const f = await open(page);
    await openReplay(page);
    // Playback at 1x from 0 to t, in units of a weight-1 step: step i takes weight_i of them (spec, Playback), so the rate in these units is the
    // same in every step, and a window that crosses into a step of another weight measures the same rate.
    const played = (t: number): number => f.steps.reduce((sum, step, i) => sum + step.weight * Math.min(1, Math.max(0, t - i)), 0);
    // The rate is read frame by frame against the page's own frame timestamps, the clock the page feeds the player, not against this runner's
    // clock between two round trips. The page caps the time of a long frame (src/main.ts, MAX_FRAME_SECONDS), so a frame can play slower than the
    // speed but never faster, and the fastest frame of the window plays at the speed itself, however loaded the machine is.
    const rate = async (speed: string): Promise<number> => {
      await press(page, 'btn-start');
      await press(page, `speed-${speed}`);
      await expect(page.getByTestId(`speed-${speed}`)).toHaveAttribute('aria-pressed', 'true');
      await press(page, 'btn-play');
      // t at each animation frame for 1 s of frames, with the frame's timestamp; the page's own frame callback has run first in each frame.
      const frames = await page.evaluate(
        (ms) =>
          new Promise<[number, number][]>((resolve) => {
            const out: [number, number][] = [];
            const sample = (ts: number): void => {
              out.push([ts, window.__met?.t ?? Number.NaN]);
              if (ts - (out[0]?.[0] ?? ts) < ms) requestAnimationFrame(sample);
              else resolve(out);
            };
            requestAnimationFrame(sample);
          }),
        1000,
      );
      await press(page, 'btn-play');
      let fastest = 0;
      for (let i = 1; i < frames.length; i += 1) {
        const a = frames[i - 1];
        const b = frames[i];
        if (a === undefined || b === undefined || !(b[0] > a[0])) continue;
        fastest = Math.max(fastest, (played(b[1]) - played(a[1])) / ((b[0] - a[0]) / 1000));
      }
      return fastest;
    };
    const slow = await rate('0.5');
    const fast = await rate('4');
    expect(await page.evaluate(() => window.__met?.speed)).toBe(4);
    expect(slow).toBeGreaterThan(0);
    expect(fast / slow).toBeGreaterThan(4);
    expect(fast / slow).toBeLessThan(16);
  });

  test('every speed button sets its speed, marks only itself and plays at it', async ({ page }) => {
    await openAtStart(page);
    // The spec's speeds (docs/design/spec.md, Playback), not read from the page.
    const speeds = ['0.5', '1', '2', '4'] as const;
    for (const speed of speeds) {
      await press(page, `speed-${speed}`);
      for (const other of speeds) await expect(page.getByTestId(`speed-${other}`)).toHaveAttribute('aria-pressed', String(other === speed));
      expect(await page.evaluate(() => window.__met?.speed), `speed after pressing ${speed}x`).toBe(Number(speed));
      const t0 = await currentT(page);
      await press(page, 'btn-play');
      await page.waitForFunction((t) => (window.__met?.t ?? t) > t + 0.02, t0);
      expect(await page.evaluate(() => window.__met?.speed), `speed while playing at ${speed}x`).toBe(Number(speed));
      await press(page, 'btn-play');
      await expect(page.getByTestId('btn-play')).toHaveAttribute('aria-label', 'Play');
    }
  });

  test('the scrubber follows a mouse drag', async ({ page }) => {
    const f = await openAtStart(page);
    const before = await lumaGrid(page);
    const box = await page.getByTestId('scrubber').boundingBox();
    if (box === null) throw new Error('The scrubber has no box.');
    const thumb = 8;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + thumb, y);
    await page.mouse.down();
    for (let k = 1; k <= 10; k += 1) await page.mouse.move(box.x + thumb + ((box.width - 2 * thumb) * 0.6 * k) / 10, y);
    await page.mouse.up();
    await settle(page);
    const t = await currentT(page);
    expect(t).toBeGreaterThan(f.n * 0.5);
    expect(t).toBeLessThan(f.n * 0.7);
    expect(Number(await page.getByTestId('scrubber').inputValue())).toBeCloseTo(t, 6);
    expect(await labelStep(page)).toBe(Math.ceil(t));
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    // How much of the frame has changed by 0.6 N depends on where content sits in time and space, so the canvas check drags on to the end, where the whole model stands.
    const at = box.x + thumb + ((box.width - 2 * thumb) * t) / f.n;
    await page.mouse.move(at, y);
    await page.mouse.down();
    for (let k = 1; k <= 5; k += 1) await page.mouse.move(at + ((box.x + box.width - thumb - at) * k) / 5, y);
    await page.mouse.up();
    await settle(page);
    expect(await currentT(page)).toBeGreaterThan(f.n * 0.97);
    expect(changedCells(before, await lumaGrid(page)).length).toBeGreaterThan(4);
  });

  test('keyboard: Space, Shift+Space, arrows, Home and End', async ({ page }) => {
    const f = await openAtStart(page);
    test.skip(f.n < 2, 'needs at least two steps');
    await press(page, 'speed-4');
    // A click on the canvas without a drag leaves focus on the page.
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('End');
    await waitForT(page, f.n);
    await page.keyboard.press('Home');
    await waitForT(page, 0);
    await page.keyboard.press('ArrowRight');
    await waitForT(page, 1);
    await page.keyboard.press('ArrowRight');
    await waitForT(page, 2);
    await page.keyboard.press('ArrowLeft');
    await waitForT(page, 1);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === 1);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__met?.mode === 'paused');
    await page.keyboard.press('Shift+Space');
    await page.waitForFunction(() => window.__met?.mode === 'playing' && window.__met.direction === -1);
    await waitForT(page, 0);
    expect(await page.evaluate(() => window.__met?.mode)).toBe('paused');
    await expect(page.getByTestId('scrubber')).toHaveValue('0');
  });
});
