/**
 * Holding keys until something stops the walker or its eye passes a line, and no more (./routes.spec.ts), beside the walking of ./route-walk.ts: no lag
 * is learnt and no corner is settled on, so where a walker let go comes to rest is bounded by the caller, not chosen. Every wait that a page with a frozen
 * main thread could hold is bounded in the test's process (`inTime`).
 */
import type { Page } from '@playwright/test';

import { throttleRate } from './helpers.js';
import { bounded, Keys, watch } from './route-keys.js';
import { fmt, record, sample } from './route-walk.js';
import type { Facing, Sample } from './route-walk.js';

/**
 * `work`, or `'late'` once `ms` pass first, timed in the test's process: Playwright's own timeouts do not fire while the page's main thread is frozen
 * (./route-keys.ts `watch`), so every wait here that a frozen page could hold is bounded this way too.
 */
export async function inTime<T>(work: Promise<T>, ms: number): Promise<T | 'late'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<'late'>((resolve) => {
    timer = setTimeout(() => { resolve('late'); }, Math.max(0, ms));
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** How long one read of the page, or one key sent to it, may take, milliseconds times the CPU throttle: a frame at 4× throttle takes about 50 ms. */
const READ_MS = 2000;

/** `work`, a read of the page or a key sent to it, within READ_MS times the throttle; fails, saying what was asked, when a frozen page holds it longer. */
export async function promptly<T>(work: Promise<T>, what: string): Promise<T> {
  const ms = READ_MS * throttleRate();
  const got = await inTime(work, ms);
  if (got === 'late') throw new Error(`The page did not answer within ${String(ms)} ms ${what}: its main thread looks frozen.`);
  return got;
}

/** The walk facts on the next frame, at most `ms` away; fails, with where the eye was `last` seen, when the page draws none in time. */
async function sampleIn(page: Page, ms: number, last: Sample | null): Promise<Sample> {
  const got = await inTime(sample(page), ms);
  if (got === 'late') throw new Error(`The page drew no frame in ${String(Math.round(ms))} ms: the walker's eye last seen at ${last === null ? 'none' : fmt(last.eye)}.`);
  return got;
}

/**
 * Waits until the walker is at rest, its eye eased out of any stair snap: two reads 100 ms apart with the eye within 0.1 mm, at most 5 s times the CPU
 * throttle and a frame, else fails saying how far it last moved, or that the page drew no frame. `still`'s millimetre between frames can pass an eye
 * still easing by 2 cm at a high frame rate.
 */
export async function rest(page: Page): Promise<Sample> {
  const limit = 5000 * throttleRate();
  const until = Date.now() + limit;
  const frame = (): number => Math.max(2000, until - Date.now());
  let before = await sampleIn(page, frame(), null);
  for (;;) {
    await page.waitForTimeout(100);
    const now = await sampleIn(page, frame(), before);
    const moved = Math.hypot(now.eye[0] - before.eye[0], now.eye[1] - before.eye[1], now.eye[2] - before.eye[2]);
    if (moved < 1e-4) return now;
    if (Date.now() > until) throw new Error(`The walker did not come to rest within ${String(limit)} ms: its eye last moved ${(moved * 1000).toFixed(2)} mm in 100 ms, at ${fmt(now.eye)}.`);
    before = now;
  }
}

/**
 * Holds `keys` until something stops the walker past `edge` along the level `axis`: watched in the page at every frame, its eye stays within 1 mm of where
 * it stood 10 frames before, the keys still held, at most `ms`. With `runUntil`, Shift is held with them, at a run, until the eye's place along `axis`
 * passes it, and then let go, so the walker meets what stops it at a walk. Returns that eye and then lets go; every frame since the last record goes into
 * `samples`. Fails with where the walker stands when it does not stop there in time, as when nothing stops it; each wait is bounded in the test's
 * process (`inTime`).
 */
export async function into(page: Page, keys: readonly string[], axis: Facing, edge: number, samples: Sample[], ms: number, runUntil?: number): Promise<Sample> {
  // Frames from before (turns, a door's swing) go in too, so a check of the samples sees every frame.
  samples.push(...(await promptly(record(page), 'reading the walk’s frames')));
  await promptly(page.evaluate(() => { delete (window as unknown as { stillSince?: unknown }).stillSince; }), 'clearing the stop’s watch');
  const past = (at: number): Promise<boolean> =>
    page.waitForFunction(([ax, az, line]) => {
      const eye = window.__met?.walk.eye;
      return eye != null && eye[0] * ax + eye[2] * az >= line;
    }, [axis[0], axis[1], at] as const, { polling: 'raf', timeout: ms }).then(() => true, () => false);
  if (runUntil !== undefined) await promptly(page.keyboard.down('Shift'), 'pressing Shift');
  for (const key of keys) await promptly(page.keyboard.down(key), `pressing ${key}`);
  const ran = runUntil === undefined || (await inTime(past(runUntil), ms)) === true;
  if (runUntil !== undefined) await bounded(page.keyboard.up('Shift'));
  const stopped = ran && (await inTime(page.waitForFunction(
    ([ax, az, at]) => {
      const w = window as unknown as { stillSince?: { eye: readonly number[]; frames: number } };
      const eye = window.__met?.walk.eye;
      if (eye == null || eye[0] * ax + eye[2] * az < at) return false;
      const since = w.stillSince;
      if (since === undefined || Math.hypot(eye[0] - (since.eye[0] ?? 0), eye[1] - (since.eye[1] ?? 0), eye[2] - (since.eye[2] ?? 0)) >= 1e-3) {
        w.stillSince = { eye: [...eye], frames: 0 };
        return false;
      }
      since.frames += 1;
      return since.frames >= 10;
    },
    [axis[0], axis[1], edge] as const,
    { polling: 'raf', timeout: ms },
  ).then(
    () => true,
    () => false,
  ), ms)) === true;
  const held = await inTime(sample(page), READ_MS * throttleRate());
  for (const key of [...keys].reverse()) await bounded(page.keyboard.up(key));
  if (held === 'late') throw new Error(`Holding ${keys.join('+')} toward ${edge.toFixed(2)} m along [${axis.join(', ')}], the page drew no frame for ${String(READ_MS * throttleRate())} ms.`);
  samples.push(...(await promptly(record(page), 'reading the walk’s frames')));
  if (!ran) throw new Error(`Holding Shift+${keys.join('+')}, the eye never passed ${String(runUntil)} m along [${axis.join(', ')}] within ${String(ms)} ms, where the run was to end: it is at ${fmt(held.eye)}.`);
  if (!stopped) throw new Error(`Holding ${keys.join('+')}, the walker came to no stop past ${edge.toFixed(2)} m along [${axis.join(', ')}] within ${String(ms)} ms: the eye is at ${fmt(held.eye)}.`);
  return held;
}

/**
 * Holds `keys` until the eye's place along the level `axis` passes `line`, watched in the page at every frame (./route-keys.ts `watch`), lets go and waits
 * for the walker to rest (`rest`). It goes on past the line for its coast and for as long as the release takes to reach the page, so where it rests lies
 * past the line by a distance the caller must bound, not choose. Every frame since the last record goes into `samples`. Fails, naming where the walker
 * stood, when it makes no 5 cm of progress for 1.5 s, walk mode is left, or the watch runs out of time.
 */
export async function holdPast(page: Page, what: string, keys: readonly string[], axis: Facing, line: number, samples: Sample[]): Promise<Sample> {
  samples.push(...(await promptly(record(page), `${what}: reading the walk's frames`)));
  const held = new Keys(page);
  await promptly(held.hold(keys), `${what}: pressing ${keys.join('+')}`);
  const seen = await watch(page, axis, line, 1);
  await bounded(held.hold([]));
  if (seen.kind !== 'line') {
    samples.push(...((await bounded(record(page))) ?? []));
    const why = seen.kind === 'stuck' ? 'made no 5 cm of progress for 1.5 s' : seen.kind === 'gone' ? 'left walk mode' : `had not passed it after ${String(seen.t)} ms`;
    throw new Error(`${what}: holding ${keys.join('+')} until the eye passed ${line.toFixed(2)} m along [${axis.join(', ')}], the walker ${why}; the eye last seen at ${seen.eye === null ? 'none' : fmt(seen.eye)}.`);
  }
  const at = await rest(page);
  samples.push(...(await promptly(record(page), `${what}: reading the walk's frames`)));
  return at;
}
