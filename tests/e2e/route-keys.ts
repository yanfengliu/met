/**
 * The walk's keys held and let go where a walk means to stop, whatever the load (./route-holds.ts; work unit 2, close). A key let go from the test
 * reaches the page some frames after the frame that crossed the line it was let go at, and the walker drives on through those frames: at 4× CPU throttle
 * 5 to 7 frames, 0.23 to 0.33 s of the walk's time, 1.4 to 1.8 m at a run (a probe of R1's walk into the entrance bay, 2026-10-28), and more on a
 * loaded machine. So a line is watched in the page at every frame with no gap between watches, the movement keys go up before Shift, and where the walker
 * comes to rest past a line is bounded by the walk that holds the keys, not chosen (./routes.spec.ts, its Bound).
 */
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { throttleRate } from './helpers.js';
import type { Facing } from './route-walk.js';

/**
 * What a watch ended on: the line crossed, no progress for the stall time, walk mode left (the page's eye gone), or no end within the watch's ceiling;
 * the eye then, or the last one seen (null if none), and that frame's time (ms).
 */
export interface Watched {
  readonly kind: 'line' | 'stuck' | 'gone' | 'late';
  readonly eye: Vec3 | null;
  readonly t: number;
}

/**
 * The longest any watch waits, milliseconds times the CPU throttle: 100 m held at a run takes 20 s, at a walk 50 s, so a watch past it is lost.
 * Every watch ends when walk mode is left, and within 60 s times the throttle.
 */
const WATCH_MS = 60_000;
/** What a watch leaves of its test's time, milliseconds times the throttle, for its own failure to be the one reported; and its diagnostic read's bound. */
const MARGIN_MS = 15_000;
const READ_MS = 2000;

/** `work`'s result, or null once READ_MS pass first: what a failing watch still asks of a page that may be frozen (a read, letting go of the keys). */
export const bounded = <T>(work: Promise<T>): Promise<T | null> =>
  Promise.race([work.catch(() => null), new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, READ_MS))]);
/** When each test's first watch began (Playwright's TestInfo gives no start), which its page load comes before, within MARGIN_MS. */
const FIRST = new Map<string, number>();

/** A watch's ceiling: WATCH_MS times the throttle, or less, so it ends MARGIN_MS times the throttle before its test's timeout from the test's first watch. */
function ceiling(): number {
  const info = test.info();
  const now = Date.now();
  const first = FIRST.get(info.testId) ?? now;
  FIRST.set(info.testId, first);
  const left = info.timeout === 0 ? Number.POSITIVE_INFINITY : info.timeout - (now - first) - MARGIN_MS * throttleRate();
  return Math.max(1000, Math.min(WATCH_MS * throttleRate(), left));
}
/** How long a watch waits for the eye to come 5 cm nearer its line before it ends as stuck, milliseconds of the page's clock. */
const STALL_MS = 1500;

/**
 * Waits in the page, checking every frame, until the eye's place along the level `axis` passes `line` going `dir` (1 up, −1 down), or it has come no
 * 5 cm nearer the line for STALL_MS, or walk mode is left, or its `ceiling` passes, after which the eye last seen is read for at most READ_MS, so a
 * frozen page cannot hold it. One watch, so a key can change a round trip after the frame that asked for it.
 */
export async function watch(page: Page, axis: Facing, line: number, dir: 1 | -1): Promise<Watched> {
  const id = Math.random();
  const ms = ceiling();
  const polled = page
    .waitForFunction(
      ([ax, az, at, sense, stall, key]) => {
        const w = window as unknown as { lineWatch?: { id: number; best: number; since: number; last: number[] | null } };
        if (w.lineWatch?.id !== key) w.lineWatch = { id: key, best: Number.NEGATIVE_INFINITY, since: performance.now(), last: null };
        const seen = w.lineWatch;
        const frame = document.timeline.currentTime;
        const t = typeof frame === 'number' ? frame : performance.now();
        const eye = window.__met?.walk.eye;
        if (eye == null) return { kind: 'gone', eye: seen.last, t };
        seen.last = [...eye];
        const ahead = sense * (eye[0] * ax + eye[2] * az - at);
        if (ahead >= 0) return { kind: 'line', eye: [...eye], t };
        const now = performance.now();
        if (ahead > seen.best + 0.05) {
          seen.best = ahead;
          seen.since = now;
        }
        return now - seen.since > stall ? { kind: 'stuck', eye: [...eye], t } : false;
      },
      [axis[0], axis[1], line, dir, STALL_MS, id] as const,
      { polling: 'raf', timeout: ms + READ_MS },
    )
    .then(async (handle) => (await handle.jsonValue()) as unknown as Watched);
  // Playwright's own timeout does not fire while the page's main thread is frozen, so a timer in the test's process bounds the watch.
  const seen = await Promise.race([polled.catch(() => null), new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, ms))]);
  if (seen !== null) return seen;
  const last = await bounded(
    page.evaluate((key) => {
      const w = window as unknown as { lineWatch?: { id: number; last: number[] | null } };
      return w.lineWatch?.id === key ? w.lineWatch.last : null;
    }, id),
  );
  return { kind: 'late', eye: last === null ? null : [last[0] ?? Number.NaN, last[1] ?? Number.NaN, last[2] ?? Number.NaN], t: ms };
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
