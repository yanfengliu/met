/**
 * Shared helpers for the control tests. Tests drive the page only through real input (clicks, drags, keys); they read state from the read-only
 * `window.__met` and the canvas pixels, and never write either. Nothing here names a step or chapter: facts come from `window.__met`.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

import type { MetFacts } from '../../src/viewer/facts.js';

export type Facts = Omit<MetFacts, 'benchmark'>;

/** Collects console errors and uncaught exceptions; `expectClean` fails the test if any arrived. */
export function watchErrors(page: Page): { expectClean: () => void } {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`uncaught exception: ${error.message}`));
  return {
    expectClean: () => {
      expect(problems, 'console errors and uncaught exceptions').toEqual([]);
    },
  };
}

/** Opens the page with `query` (by default the page's own default: the finished building, paused) and waits for the capture contract's ready flag, at most 20 s times the CPU throttle. */
export async function open(page: Page, query = 'autoplay=0'): Promise<Facts> {
  await page.goto(`/?${query}`);
  const ms = 20_000 * throttleRate();
  await page.waitForFunction(() => window.__shotReady === true, undefined, { timeout: ms }).catch(() => {
    throw new Error(`The page /?${query} never set window.__shotReady within ${String(ms)} ms (src/main.ts sets it once the requested state has drawn 5 frames).`);
  });
  return facts(page);
}

/** The CPU throttle MET_CPU_THROTTLE asks for: a factor above 1, or 1. */
export function throttleRate(): number {
  const rate = Number(process.env['MET_CPU_THROTTLE'] ?? '1');
  return rate > 1 ? rate : 1;
}

/**
 * Slows the page's main thread by the factor MET_CPU_THROTTLE names (CDP Emulation.setCPUThrottlingRate), so a walk test can be shown to hold under load;
 * unset or 1 changes nothing. The CDP session stays open, as the emulation lasts only while it is attached.
 */
export async function throttle(page: Page): Promise<void> {
  const rate = throttleRate();
  if (rate === 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

export async function facts(page: Page): Promise<Facts> {
  return (await page.evaluate(() => JSON.parse(JSON.stringify(window.__met)) as unknown)) as Facts;
}

export async function currentT(page: Page): Promise<number> {
  return page.evaluate(() => window.__met?.t ?? Number.NaN);
}

/** Waits until `window.__met.t` equals `value` exactly (the player lands on integers exactly). */
export async function waitForT(page: Page, value: number, timeout = 20_000): Promise<void> {
  await page.waitForFunction((v) => window.__met?.t === v, value, { timeout });
}

/** Waits for two animation frames, so the frame after the last input has been drawn. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => { resolve(); }); }); }));
}

/** Mean luminance (0-255) of each cell of a `cols` x `rows` grid over the canvas, top row first, read from the drawing buffer. */
export async function lumaGrid(page: Page, cols = 16, rows = 9): Promise<number[]> {
  await settle(page);
  return page.evaluate(
    ([c, r]) => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2');
      if (!canvas || !gl) throw new Error('lumaGrid: the page has no WebGL2 canvas.');
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const sums = new Array<number>(c * r).fill(0);
      const counts = new Array<number>(c * r).fill(0);
      for (let y = 0; y < h; y += 2) {
        const row = Math.min(r - 1, Math.floor(((h - 1 - y) / h) * r));
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4;
          const cell = row * c + Math.min(c - 1, Math.floor((x / w) * c));
          sums[cell] = (sums[cell] ?? 0) + 0.2126 * (px[i] ?? 0) + 0.7152 * (px[i + 1] ?? 0) + 0.0722 * (px[i + 2] ?? 0);
          counts[cell] = (counts[cell] ?? 0) + 1;
        }
      }
      return sums.map((s, k) => s / Math.max(1, counts[k] ?? 1));
    },
    [cols, rows] as const,
  );
}

/** Indices of cells whose luminance differs by more than `threshold`. */
export function changedCells(a: readonly number[], b: readonly number[], threshold = 3): number[] {
  return a.flatMap((value, i) => (Math.abs(value - (b[i] ?? value)) > threshold ? [i] : []));
}

/** The four corner cells of a `cols` x `rows` grid. */
export function cornerCells(cols = 16, rows = 9): number[] {
  return [0, cols - 1, (rows - 1) * cols, rows * cols - 1];
}

/** Clicks a control the way a person does: moves there and presses the primary button. */
export async function press(page: Page, testid: string): Promise<void> {
  await page.getByTestId(testid).click();
}

/** Opens a menu by its button if it is closed. */
export async function openMenu(page: Page, menu: 'chapter-menu' | 'view-menu'): Promise<void> {
  if (await page.getByTestId(menu).isHidden()) await press(page, `${menu}-button`);
  await expect(page.getByTestId(menu)).toBeVisible();
}

/** The label's step number k from `Step k / N`. */
export async function labelStep(page: Page): Promise<number> {
  const text = (await page.getByTestId('step-label').textContent()) ?? '';
  const match = /^Step (\d+) \/ (\d+)/.exec(text);
  if (match === null) throw new Error(`The step label "${text}" does not start with "Step k / N".`);
  return Number(match[1]);
}

export type Camera = Facts['camera'];

type Triple = readonly [number, number, number];

export const distance = (p: Triple, q: Triple): number => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

export const centreOf = (b: { readonly min: Triple; readonly max: Triple }): [number, number, number] => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];

export async function camera(page: Page): Promise<Camera> {
  const value = await page.evaluate(() => (window.__met === undefined ? null : (JSON.parse(JSON.stringify(window.__met.camera)) as unknown)));
  if (value === null) throw new Error('window.__met is not published, so the camera cannot be read.');
  return value as Camera;
}

/** The larger of the distances between two cameras' positions and between their targets, in metres. */
export function cameraGap(a: Camera, b: Camera): number {
  const d = (p: readonly number[], q: readonly number[]): number => Math.hypot(...p.map((v, i) => v - (q[i] ?? Number.NaN)));
  return Math.max(d(a.position, b.position), d(a.target, b.target));
}

/** The camera once it has stopped: two reads 150 ms apart that agree within 0.1 mm. */
export async function settledCamera(page: Page, timeout = 6000): Promise<Camera> {
  const end = Date.now() + timeout;
  let last = await camera(page);
  for (;;) {
    await page.waitForTimeout(150);
    const now = await camera(page);
    if (cameraGap(now, last) < 1e-4) return now;
    if (Date.now() > end) throw new Error(`The camera did not settle within ${String(timeout)} ms; it last moved ${cameraGap(now, last).toFixed(4)} m in 150 ms.`);
    last = now;
  }
}

/**
 * The largest |x| or |y|, in normalized device coordinates, of the 8 corners of `bounds` seen from `cam` (its fov and aspect, +Y up as the orbit
 * controls keep it): at most 1 when the whole box is in frame; Infinity when a corner lies behind the camera.
 */
export function cornerReach(cam: Camera, bounds: Facts['bounds']): number {
  const c = new PerspectiveCamera(cam.fov, cam.aspect, cam.near, cam.far);
  c.position.set(...cam.position);
  c.lookAt(new Vector3(...cam.target));
  c.updateMatrixWorld();
  const forward = new Vector3(...cam.target).sub(c.position).normalize();
  let reach = 0;
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const corner = new Vector3(x, y, z);
        if (!(corner.clone().sub(c.position).dot(forward) > 0)) return Infinity;
        const p = corner.project(c);
        reach = Math.max(reach, Math.abs(p.x), Math.abs(p.y));
      }
    }
  }
  return reach;
}

/** Opens the view menu and clicks the preset's item. */
export async function choosePreset(page: Page, id: string): Promise<void> {
  await openMenu(page, 'view-menu');
  await press(page, `preset-${id}`);
}

/** A walking frame's cost where the walker stands: the median frame interval, the page's median work per walking frame, a GPU-synced render (ms). */
export interface WalkingBudget {
  readonly interval: number;
  readonly work: number;
  readonly gpu: number;
}

/**
 * Holds W (with Shift when `run`) for 120 frames where the walker stands, so every frame walks, runs the look target and renders, and reports the
 * frame interval's median over them, the page's median work per walking frame over the same window (`window.__met.walk.frameMs`: physics, the look
 * target, the camera and the render call) and the mean of 30 renders each synced with the GPU (`benchmark`).
 */
export async function walkingBudget(page: Page, run = false): Promise<WalkingBudget> {
  if (run) await page.keyboard.down('Shift');
  await page.keyboard.down('KeyW');
  const intervals = await page.evaluate(() => new Promise<number[]>((resolve) => {
    const times: number[] = [];
    const tick = (now: number): void => {
      times.push(now);
      if (times.length < 121) requestAnimationFrame(tick);
      else resolve(times.slice(1).map((t, i) => t - (times[i] ?? t)));
    };
    requestAnimationFrame(tick);
  }));
  const work = await page.evaluate(() => window.__met?.walk.frameMs ?? Number.NaN);
  await page.keyboard.up('KeyW');
  if (run) await page.keyboard.up('Shift');
  const gpu = await page.evaluate(() => window.__met?.benchmark(30) ?? Number.NaN);
  const sorted = [...intervals].sort((a, b) => a - b);
  return { interval: sorted[Math.floor(sorted.length / 2)] ?? Number.NaN, work, gpu };
}

/** The 60-frames-a-second budget a walking frame keeps on this machine: work and a GPU-synced render under 16.7 ms, the interval within 10% of it. */
export function expectWalkingBudget(budget: WalkingBudget, where: string): void {
  const report = `walking ${where}: frame interval median ${budget.interval.toFixed(2)} ms, work median ${budget.work.toFixed(2)} ms, render with GPU sync ${budget.gpu.toFixed(2)} ms`;
  console.log(report);
  expect(budget.work, report).toBeLessThan(16.7);
  expect(budget.gpu, report).toBeLessThan(16.7);
  expect(budget.interval, report).toBeLessThan(16.7 * 1.1);
}

/** Drags across the canvas with the primary button from its centre, `steps` moves of (dx, dy) pixels each, as a quick flick. */
export async function dragCanvas(page: Page, dx: number, dy: number, steps: number): Promise<void> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 3;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= steps; k += 1) await page.mouse.move(x + k * dx, y + k * dy);
  await page.mouse.up();
}
