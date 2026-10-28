/**
 * The walk's keys held and let go where a walk means to stop or turn, whatever the load (./route-walk.ts; work unit 2, close). A key let go from the test
 * reaches the page some frames after the frame that crossed the line it was let go at, and the walker drives on through those frames: at 4× CPU throttle
 * 5 to 7 frames, 0.23 to 0.33 s of the walk's time, 1.4 to 1.8 m at a run (a probe of R1's walk into the entrance bay, 2026-10-28), and more on a
 * loaded machine. So a line is watched in the page at every frame with no gap between watches, the movement keys go up before Shift, and a walk lets go
 * before its line by what the walker covers after it: its coast and its speed times the release lag, learnt in the page from the walk's own last
 * releases (the walk's time, frames capped at 0.1 s as src/main.ts caps them, from the frame that crossed a line to the next key event) and half a frame.
 * The page's frame times and key events are logged by a requestAnimationFrame loop and passive listeners beside the page's own, which write nothing of it.
 */
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { throttleRate } from './helpers.js';
import type { Facing } from './route-walk.js';

/** One axis's bounds, world metres, either end open (null). */
export type Span = readonly [number | null, number | null];
/** A box in plan, its X and Z spans: a frame to write when the eye first stands in it (./route-walk.ts `walk`). */
export interface Stop {
  readonly name: string;
  readonly x?: Span;
  readonly z?: Span;
}

/**
 * What a watch ended on: the line crossed, a stop's box entered (its index), no progress for the stall time, walk mode left (the page's eye gone), or no
 * end within the watch's ceiling; the eye then, or the last one seen (null if none), and that frame's time (ms).
 */
export interface Watched {
  readonly kind: 'line' | 'stop' | 'stuck' | 'gone' | 'late';
  readonly stop: number;
  readonly eye: Vec3 | null;
  readonly t: number;
}

/** The longest any watch waits, milliseconds times the CPU throttle: a 100 m leg at a run takes 20 s, at a walk 50 s, so a watch past it is lost. */
export const WATCH_MS = 60_000;
/** How long a watch waits for the eye to come 5 cm nearer its line before it ends as stuck, milliseconds of the page's clock. */
const STALL_MS = 1500;
/** The release lags learnt on each page, seconds of the walk's time. */
const LAGS = new WeakMap<Page, number[]>();

/** Starts the page's log of frame times and key events, once a page. */
export async function startKeyLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { walkLog?: { frames: number[]; keys: number[] } };
    if (w.walkLog !== undefined) return;
    const log = { frames: [] as number[], keys: [] as number[] };
    w.walkLog = log;
    const tick = (now: number): void => {
      log.frames.push(now);
      if (log.frames.length > 4000) log.frames.splice(0, 2000);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const heard = (): void => {
      log.keys.push(performance.now());
      if (log.keys.length > 1000) log.keys.splice(0, 500);
    };
    window.addEventListener('keydown', heard, { capture: true, passive: true });
    window.addEventListener('keyup', heard, { capture: true, passive: true });
  });
}

/** The lag a walk plans its releases with on `page`: the most of the last three learnt (a load can only have grown since), or 0 before the first. */
export function lag(page: Page): number {
  const lags = LAGS.get(page) ?? [];
  return lags.length === 0 ? 0 : Math.max(...lags.slice(-3));
}

/** How far a motion at `speed` m/s goes on past the line its keys are let go at on `page`: its `coast` and its speed times the lag. */
export const travel = (page: Page, speed: number, coast: number): number => coast + speed * lag(page);

/**
 * Learns the lag of a release on `page` from its log: the walk's time from the frame at `t` (a watch's crossing) to the first key event after it, frames
 * capped at 0.1 s, and half a frame interval (the crossing frame has gone past the line by up to a frame's travel). Returns it, or null without an event.
 */
export async function learnLag(page: Page, t: number): Promise<number | null> {
  const found = await page.evaluate((t0) => {
    const log = (window as unknown as { walkLog?: { frames: number[]; keys: number[] } }).walkLog;
    const key = log?.keys.find((k) => k > t0);
    if (log === undefined || key === undefined) return null;
    let walked = 0;
    let before = Number.NaN;
    const intervals: number[] = [];
    for (const f of log.frames) {
      if (!Number.isNaN(before)) {
        const dt = Math.min(0.1, (f - before) / 1000);
        if (f > t0 && f < key) walked += dt;
        if (f <= t0) intervals.push(dt);
      }
      before = f;
    }
    const recent = intervals.slice(-20).sort((a, b) => a - b);
    return walked + (recent[Math.floor(recent.length / 2)] ?? 0) / 2;
  }, t);
  if (found === null) return null;
  LAGS.set(page, [...(LAGS.get(page) ?? []), found].slice(-6));
  return found;
}

/**
 * Waits in the page, checking every frame, until the eye's place along the level `axis` passes `line` going `dir` (1 up, −1 down), or it enters one of
 * `stops`' boxes, or it has come no 5 cm nearer the line for STALL_MS, or walk mode is left, or WATCH_MS (times the throttle) pass. One watch, so a key can
 * change a round trip after the frame that asked for it.
 */
export async function watch(page: Page, axis: Facing, line: number, dir: 1 | -1, stops: readonly Stop[] = []): Promise<Watched> {
  const boxes = stops.map((s) => [s.x?.[0] ?? null, s.x?.[1] ?? null, s.z?.[0] ?? null, s.z?.[1] ?? null] as const);
  const id = Math.random();
  return page
    .waitForFunction(
      ([ax, az, at, sense, bs, stall, key]) => {
        const w = window as unknown as { lineWatch?: { id: number; best: number; since: number; last: number[] | null } };
        if (w.lineWatch?.id !== key) w.lineWatch = { id: key, best: Number.NEGATIVE_INFINITY, since: performance.now(), last: null };
        const seen = w.lineWatch;
        const frame = document.timeline.currentTime;
        const t = typeof frame === 'number' ? frame : performance.now();
        const eye = window.__met?.walk.eye;
        if (eye == null) return { kind: 'gone', stop: -1, eye: seen.last, t };
        seen.last = [...eye];
        const ahead = sense * (eye[0] * ax + eye[2] * az - at);
        if (ahead >= 0) return { kind: 'line', stop: -1, eye: [...eye], t };
        const within = (v: number, lo: number | null, hi: number | null): boolean => (lo === null || v >= lo) && (hi === null || v <= hi);
        const stop = bs.findIndex(([x0, x1, z0, z1]) => within(eye[0], x0, x1) && within(eye[2], z0, z1));
        if (stop >= 0) return { kind: 'stop', stop, eye: [...eye], t };
        const now = performance.now();
        if (ahead > seen.best + 0.05) {
          seen.best = ahead;
          seen.since = now;
        }
        return now - seen.since > stall ? { kind: 'stuck', stop: -1, eye: [...eye], t } : false;
      },
      [axis[0], axis[1], line, dir, boxes, STALL_MS, id] as const,
      { polling: 'raf', timeout: WATCH_MS * throttleRate() },
    )
    .then(
      async (handle) => (await handle.jsonValue()) as unknown as Watched,
      async (): Promise<Watched> => {
        const last = await page.evaluate((key) => {
          const w = window as unknown as { lineWatch?: { id: number; last: number[] | null } };
          return w.lineWatch?.id === key ? w.lineWatch.last : null;
        }, id);
        return { kind: 'late', stop: -1, eye: last === null ? null : [last[0] ?? Number.NaN, last[1] ?? Number.NaN, last[2] ?? Number.NaN], t: Number.NaN };
      },
    );
}

/** The keys a walk holds: `hold` lets go of the others first, the movement keys before Shift, so a run stops at once, then presses the new ones. */
export class Keys {
  private readonly held = new Set<string>();

  constructor(private readonly page: Page) {}

  async hold(keys: readonly string[]): Promise<void> {
    const up = [...this.held].filter((k) => !keys.includes(k)).sort((a, b) => Number(a === 'Shift') - Number(b === 'Shift'));
    for (const key of up) {
      await this.page.keyboard.up(key);
      this.held.delete(key);
    }
    for (const key of keys) {
      if (this.held.has(key)) continue;
      await this.page.keyboard.down(key);
      this.held.add(key);
    }
  }
}
