/**
 * Walking the public routes through real input (tests/e2e/routes.spec.ts): walk mode entered as a visitor enters it, then only held keys (W, A, S, D,
 * Shift) and mouse drags move the walker, its eye read from the read-only `window.__met.walk` at every frame. The routes are src/model/hunt/routes.ts's
 * plan lines, whose segments run along an axis or at 45° to one: facing along an axis, W, S, A or D walks a straight segment and two of them a diagonal
 * one; drags turn the walker. See routes.spec.ts for the bounds.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { MAIN_FLOOR_Y } from '../../src/model/frame.js';
import { spawnById } from '../../src/walk/spawns.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { open, openMenu, press, throttle } from './helpers.js';

const EYE = BODY.eye;
export type XZ = readonly [number, number];
/** A level unit direction along an axis, as [x, z]. */
export type Facing = readonly [number, number];
export const MINUS_Z: Facing = [0, -1];
export const PLUS_Z: Facing = [0, 1];
export const MINUS_X: Facing = [-1, 0];
export const PLUS_X: Facing = [1, 0];
/** How far the walker coasts once a key is let go at a run: straight ahead, and sideways on a diagonal. */
export const COAST = MOTION.run * MOTION.groundTau;
export const SIDE_COAST = (MOTION.run / Math.SQRT2) * MOTION.groundTau;

export interface Sample {
  readonly eye: Vec3;
  readonly look: Vec3;
  readonly onGround: boolean;
}

/** The walk facts on the next frame; fails when walk mode is not walking. */
export async function sample(page: Page): Promise<Sample> {
  const walk = await page.evaluate(
    () =>
      new Promise<{ eye: Vec3 | null; look: Vec3 | null; onGround: boolean } | null>((resolve) => {
        requestAnimationFrame(() => {
          const w = window.__met?.walk;
          resolve(w === undefined ? null : { eye: w.eye, look: w.look, onGround: w.onGround });
        });
      }),
  );
  if (walk?.eye == null || walk.look === null) throw new Error('Walk mode is not walking: window.__met.walk.eye is null.');
  return { eye: walk.eye, look: walk.look, onGround: walk.onGround };
}

/**
 * Every frame's walk facts since the last call, recorded in the page by a requestAnimationFrame loop beside the page's own (it reads
 * `window.__met.walk` and writes nothing of the page), at least one frame; the first call starts the recording.
 */
export async function record(page: Page): Promise<Sample[]> {
  const frames = await page.evaluate(
    () =>
      new Promise<Sample[]>((resolve) => {
        const w = window as unknown as { walkFrames?: Sample[] };
        if (w.walkFrames === undefined) {
          const list: Sample[] = [];
          w.walkFrames = list;
          const tick = (): void => {
            const walk = window.__met?.walk;
            if (walk?.eye != null && walk.look !== null) list.push({ eye: [...walk.eye], look: [...walk.look], onGround: walk.onGround });
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(() => {
          resolve((w.walkFrames ?? []).splice(0));
        });
      }),
  );
  if (frames.length === 0) throw new Error('Walk mode is not walking: no frame had window.__met.walk.eye.');
  return frames;
}

export async function walking(page: Page): Promise<Sample> {
  await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null, undefined, { timeout: 15_000 });
  return sample(page);
}

/** Opens the finished building and enters walk mode by the view menu's "Walk from the Great Hall"; the walker stands on the main floor there. */
export async function walkFromGreatHall(page: Page): Promise<{ start: Sample; spawn: NonNullable<ReturnType<typeof spawnById>> }> {
  await open(page, '');
  await throttle(page);
  await openMenu(page, 'view-menu');
  await press(page, 'walk-spawn-great-hall');
  await page.waitForFunction(() => window.__met?.walk.spawn === 'great-hall');
  const start = await walking(page);
  const spawn = spawnById('great-hall');
  if (spawn === undefined) throw new Error('No great-hall spawn in src/walk/spawns.ts.');
  expect(Math.abs(start.eye[1] - (MAIN_FLOOR_Y + EYE)), 'the Great Hall spawn stands on the main floor').toBeLessThan(0.03);
  return { start, spawn };
}

/** Waits until the walker stands still (two frames with the eye within a millimetre), at most 2 s. */
export async function still(page: Page): Promise<Sample> {
  let before = await sample(page);
  const until = Date.now() + 2000;
  for (;;) {
    const now = await sample(page);
    if (Math.hypot(now.eye[0] - before.eye[0], now.eye[1] - before.eye[1], now.eye[2] - before.eye[2]) < 1e-3 || Date.now() > until) return now;
    before = now;
  }
}

export const fmt = (v: Vec3): string => `(${v.map((c) => c.toFixed(2)).join(', ')})`;
export const along = (eye: Vec3, d: Facing): number => eye[0] * d[0] + eye[2] * d[1];

export type Move = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD';

/** Where a leg turns a corner: the axis its stopping motion ran along, the corner, and the keys that walk along that axis and back. */
export interface Corner {
  readonly axis: Facing;
  readonly end: Vec3;
  readonly on: Move;
  readonly back: Move;
}

/** One leg: the movement keys held with Shift, how far past its end the eye is along the axis it ends on (done at 0 or more), and its corner. */
export interface Leg {
  readonly label: string;
  readonly keys: readonly Move[];
  readonly past: (eye: Vec3) => number;
  /** The level direction `past` measures along, and the position along it where the leg is done (`past` is 0). */
  readonly axis: Facing;
  readonly edge: number;
  readonly length: number;
  readonly corner: Corner | undefined;
}

export const scale = (v: Facing, k: number): Facing => [v[0] * k, v[1] * k];

/**
 * The legs that walk `points` facing `facing` (along an axis): each segment must run along the facing, across it or at 45° to them, so W, S, A or D, alone
 * or two together, walk it. A leg ends on the axis of the key the next leg lets go, early by that motion's coasting distance; one whose keys all stop, as
 * the last one's do, ends along its own direction a run's coast early; one whose keys all go on ends as the eye passes its end.
 */
export function legs(points: readonly XZ[], facing: Facing): Leg[] {
  // The walker's right when it faces `facing` (src/walk/walker.ts: yaw 0 faces −Z, and its right is then +X).
  const right: Facing = [-facing[1], facing[0]];
  const level = (u: number): boolean => Math.abs(u) < 1e-6;
  const plan = points.slice(1).map((q, k) => {
    const p = points[k] ?? q;
    const d: Facing = [q[0] - p[0], q[1] - p[1]];
    const ahead = d[0] * facing[0] + d[1] * facing[1];
    const across = d[0] * right[0] + d[1] * right[1];
    const label = `(${p[0].toFixed(2)}, ${p[1].toFixed(2)}) to (${q[0].toFixed(2)}, ${q[1].toFixed(2)})`;
    if ((level(ahead) && level(across)) || (!level(ahead) && !level(across) && Math.abs(Math.abs(ahead) - Math.abs(across)) > 1e-6)) {
      throw new Error(`Segment ${label} runs neither along nor across [${facing.join(', ')}] nor at 45° to them; W, A, S and D walk only those.`);
    }
    const keys: Move[] = [];
    if (!level(ahead)) keys.push(ahead > 0 ? 'KeyW' : 'KeyS');
    if (!level(across)) keys.push(across > 0 ? 'KeyD' : 'KeyA');
    return { label, q, d, ahead, across, keys };
  });
  return plan.map((s, k) => {
    const next = plan[k + 1]?.keys ?? [];
    const dropped = s.keys.filter((key) => !next.includes(key));
    const length = Math.hypot(s.d[0], s.d[1]);
    let axis: Facing = [s.d[0] / length, s.d[1] / length];
    let coast = dropped.length === 0 ? 0 : COAST;
    if (s.keys.length === 2 && dropped.length === 1) {
      axis = dropped[0] === 'KeyW' || dropped[0] === 'KeyS' ? scale(facing, Math.sign(s.ahead)) : scale(right, Math.sign(s.across));
      coast = SIDE_COAST;
    }
    const end: Vec3 = [s.q[0], 0, s.q[1]];
    // A corner where one motion stops along an axis of the facing (every stop but a diagonal's last): the keys along that axis and back.
    const onFacing = Math.abs(along([axis[0], 0, axis[1]], facing)) > 0.99;
    const onRight = Math.abs(along([axis[0], 0, axis[1]], right)) > 0.99;
    const sense = along([axis[0], 0, axis[1]], onFacing ? facing : right) > 0;
    const keysOn: readonly [Move, Move] = onFacing ? ['KeyW', 'KeyS'] : ['KeyD', 'KeyA'];
    const corner: Corner | undefined = dropped.length > 0 && (onFacing || onRight) ? { axis, end, on: sense ? keysOn[0] : keysOn[1], back: sense ? keysOn[1] : keysOn[0] } : undefined;
    const edge = along(end, axis) - coast;
    return { label: s.label, keys: s.keys, past: (eye: Vec3) => along(eye, axis) - edge, axis, edge, length, corner };
  });
}

/** A frame to write when the eye first meets `when`: the walker stops, the frame is taken, and the walk goes on. */
export interface Stop {
  readonly name: string;
  readonly when: (eye: Vec3) => boolean;
}

/**
 * Waits in the page, checking at every frame, until the eye's position along the level `axis` passes `edge` going up (`sense` 1) or down (-1), or
 * `ms` pass; returns whether it did. The keys can then change a round trip after the frame that passed it, not a round trip of polling later.
 */
export async function reached(page: Page, axis: Facing, edge: number, sense: 1 | -1, ms: number): Promise<boolean> {
  return page.waitForFunction(
    ([ax, az, at, s]) => {
      const eye = window.__met?.walk.eye;
      return eye != null && s * (eye[0] * ax + eye[2] * az - at) >= 0;
    },
    [axis[0], axis[1], edge, sense] as const,
    { polling: 'raf', timeout: ms },
  ).then(
    () => true,
    () => false,
  );
}

/** Walks the legs at a run with real key presses, adding every sample to `samples`; stops for the frames asked for. */
export async function walk(page: Page, route: string, list: readonly Leg[], samples: Sample[], stops: readonly Stop[] = []): Promise<Sample> {
  const pending = [...stops];
  const held = new Set<string>();
  /** Holds exactly `keys`: lets go of the others first, then presses the new ones. */
  const hold = async (keys: readonly string[]): Promise<void> => {
    for (const key of [...held]) {
      if (keys.includes(key)) continue;
      await page.keyboard.up(key);
      held.delete(key);
    }
    for (const key of keys) {
      if (held.has(key)) continue;
      await page.keyboard.down(key);
      held.add(key);
    }
  };
  // Frames from before this walk (turns, earlier walks) are not its own.
  let last = (await record(page)).at(-1) ?? (await sample(page));
  /** At a corner: lets the walker come to rest, then walks it back (or on) at a walk along the corner's axis until the eye is within 0.25 m of it. */
  const settle = async (c: Corner): Promise<void> => {
    await hold([]);
    for (let k = 0; k < 4; k++) {
      last = await still(page);
      const error = along(last.eye, c.axis) - along(c.end, c.axis);
      if (Math.abs(error) <= 0.25) return;
      await hold([error > 0 ? c.back : c.on]);
      // Let go once the eye comes within 0.2 m of the corner (or crosses it), at most 3 s.
      const at = along(c.end, c.axis);
      await reached(page, c.axis, error > 0 ? at + 0.2 : at - 0.2, error > 0 ? -1 : 1, 3000);
      await hold([]);
      const frames = await record(page);
      samples.push(...frames);
      last = frames.at(-1) ?? last;
    }
  };
  for (const [i, leg] of list.entries()) {
    let now = leg.past(last.eye);
    if (now >= 0) {
      if (leg.corner !== undefined) await settle(leg.corner);
      continue;
    }
    let best = now;
    let improved = Date.now();
    await hold(['Shift', ...leg.keys]);
    while (now < 0) {
      // The leg's end is watched in the page; once the eye passes it, the keys change at once to what comes next: none at a corner, else the next leg's.
      if (await reached(page, leg.axis, leg.edge, 1, 300)) await hold(leg.corner !== undefined ? [] : ['Shift', ...(list[i + 1]?.keys ?? [])]);
      const frames = await record(page);
      samples.push(...frames);
      last = frames.at(-1) ?? last;
      now = leg.past(last.eye);
      if (now > best + 0.05) {
        best = now;
        improved = Date.now();
      }
      const stop = pending.find((s) => frames.some((f) => s.when(f.eye)));
      if (now < 0 && stop !== undefined) {
        pending.splice(pending.indexOf(stop), 1);
        await hold([]);
        last = await still(page);
        await page.screenshot({ path: test.info().outputPath(`${stop.name}.png`) });
        await hold(['Shift', ...leg.keys]);
        improved = Date.now();
      }
      if (now < 0 && Date.now() - improved > 1500) {
        await hold([]);
        throw new Error(`${route}: stuck on the leg ${leg.label}, the eye at ${fmt(last.eye)} (on the ground: ${String(last.onGround)}), ${(-now).toFixed(2)} m short.`);
      }
    }
    if (leg.corner !== undefined) await settle(leg.corner);
  }
  await hold([]);
  return still(page);
}

/** The walker's yaw from its look direction (src/walk/walker.ts: yaw 0 looks toward −Z and grows turning left). */
export const yawOf = (look: Vec3): number => Math.atan2(-look[0], -look[2]);
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Turns the walker to face `yaw` with mouse drags across the canvas: one to learn how far a pixel turns, then the rest, then corrections. */
export async function face(page: Page, yaw: number): Promise<Sample> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const y = box.y + box.height / 3;
  const drag = async (dx: number): Promise<void> => {
    // A press that moves under 5 px is a click, which asks for pointer lock: a short turn goes out 20 px and back.
    const path = Math.abs(dx) < 10 ? [Math.sign(dx || 1) * 20, dx] : [dx];
    const x0 = box.x + box.width / 2 - dx / 2;
    let x = x0;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const target of path) {
      const from = x;
      const steps = Math.max(1, Math.ceil(Math.abs(x0 + target - from) / 20));
      for (let k = 1; k <= steps; k++) {
        x = from + ((x0 + target - from) * k) / steps;
        await page.mouse.move(x, y);
      }
    }
    await page.mouse.up();
  };
  let now = await sample(page);
  const before = yawOf(now.look);
  await drag(200);
  now = await sample(page);
  const perPixel = wrap(yawOf(now.look) - before) / 200;
  expect(perPixel, 'radians a pixel of drag to the right turns: to the right, so negative').toBeLessThan(0);
  for (let k = 0; k < 4; k++) {
    const error = wrap(yaw - yawOf(now.look));
    if (Math.abs(error) < 0.004) return now;
    let pixels = Math.round(error / perPixel);
    while (pixels !== 0) {
      const chunk = Math.sign(pixels) * Math.min(Math.abs(pixels), Math.floor(box.width * 0.6));
      await drag(chunk);
      pixels -= chunk;
    }
    now = await sample(page);
  }
  throw new Error(`The drags could not turn the walker to yaw ${yaw.toFixed(3)}: it faces ${yawOf(now.look).toFixed(3)} (look ${fmt(now.look)}).`);
}

/** The samples whose eye lies between `z0` and `z1` in Z. */
export const between = (samples: readonly Sample[], z0: number, z1: number): Sample[] => samples.filter((s) => s.eye[2] >= Math.min(z0, z1) && s.eye[2] <= Math.max(z0, z1));
export const off = (samples: readonly Sample[], level: number, tolerance: number): string[] => samples.filter((s) => Math.abs(s.eye[1] - level) > tolerance).map((s) => fmt(s.eye));
/**
 * Where the walker was off the ground. A route never jumps, so this is a fall: at a run the walker clears a shaft 0.8 m across with its eye only 8 cm
 * lower, but it is in the air all the way over.
 */
export const airborne = (samples: readonly Sample[]): string[] => samples.filter((s) => !s.onGround).map((s) => fmt(s.eye));
