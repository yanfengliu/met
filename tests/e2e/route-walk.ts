/**
 * Walking the public routes through real input (tests/e2e/routes.spec.ts): walk mode entered as a visitor enters it, then only held keys (W, A, S, D,
 * Shift) and mouse drags move the walker, its eye read from the read-only `window.__met.walk` at every frame. The routes are src/model/hunt/routes.ts's
 * plan lines, whose segments run along an axis or at 45° to one: facing along an axis, W, S, A or D walks a straight segment and two of them a diagonal
 * one; drags turn the walker. The doors on the way (docs/design/spec.md, Doors) are read from the read-only `window.__met.doors` and used by E, as a
 * visitor uses them. A leg lets go where the walker, going on for the release lag a key takes to reach the page under load, ends at its end (./route-keys.ts),
 * and at a corner it walks onto the corner until it rests within 0.25 m of it along the axis it stops on, or fails. See routes.spec.ts for the bounds.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Vec3 } from '../../src/build/types.js';
import { MAIN_FLOOR_Y } from '../../src/model/frame.js';
import { ENTRANCE_DOOR_Z, entranceDoor } from '../../src/model/hunt/arches.js';
import { spawnById } from '../../src/walk/spawns.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { open, openMenu, press, throttle, throttleRate } from './helpers.js';
import { bounded, Keys, lag, learnLag, startKeyLog, travel, watch, WATCH_MS } from './route-keys.js';
import type { Stop, Watched } from './route-keys.js';

export type { Stop } from './route-keys.js';

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
  const ms = 15_000 * throttleRate();
  await page.waitForFunction(() => window.__met?.walk.spawn === 'great-hall', undefined, { timeout: ms }).catch(async () => {
    throw new Error(`The view menu's "Walk from the Great Hall" never put the walker at its spawn within ${String(ms)} ms: window.__met.walk.spawn is ${String(await page.evaluate(() => window.__met?.walk.spawn).catch(() => 'unread'))}.`);
  });
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

/**
 * One leg: the movement keys held, with Shift at a run; the level axis it ends on and its end's place along it; what the motion along that axis does once
 * the keys change, its coast (0 when it goes on) and its speed, so a walk lets go `coast` and the speed times the release lag before `at`; its corner.
 */
export interface Leg {
  readonly label: string;
  readonly keys: readonly Move[];
  /** Whether Shift is held with the keys: a run, or else a walk. */
  readonly run: boolean;
  readonly axis: Facing;
  readonly at: number;
  readonly coast: number;
  readonly speed: number;
  readonly length: number;
  readonly corner: Corner | undefined;
}

export const scale = (v: Facing, k: number): Facing => [v[0] * k, v[1] * k];

/**
 * The legs that walk `points` facing `facing` (along an axis): each segment must run along the facing, across it or at 45° to them, so W, S, A or D, alone
 * or two together, walk it. A leg ends on the axis of the key the next leg lets go, early by that motion's coasting distance; one whose keys all stop, as
 * the last one's do, ends along its own direction a coast early; one whose keys all go on ends as the eye passes its end; and each lets go earlier again
 * by its speed times the release lag (./route-keys.ts). `pace` walks them at a run (Shift held) or at a walk, which coasts 0.14 m to a run's 0.35 m and
 * goes on 2.5 times less far over a lag, for corners near an unguarded edge.
 */
export function legs(points: readonly XZ[], facing: Facing, pace: 'run' | 'walk' = 'run'): Leg[] {
  const straight = pace === 'run' ? COAST : MOTION.walk * MOTION.groundTau;
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
    let coast = dropped.length === 0 ? 0 : straight;
    let speed = pace === 'run' ? MOTION.run : MOTION.walk;
    if (s.keys.length === 2 && dropped.length === 1) {
      axis = dropped[0] === 'KeyW' || dropped[0] === 'KeyS' ? scale(facing, Math.sign(s.ahead)) : scale(right, Math.sign(s.across));
      coast = pace === 'run' ? SIDE_COAST : straight / Math.SQRT2;
      speed /= Math.SQRT2;
    }
    const end: Vec3 = [s.q[0], 0, s.q[1]];
    // A corner where one motion stops along an axis of the facing (every stop but a diagonal's last): the keys along that axis and back.
    const onFacing = Math.abs(along([axis[0], 0, axis[1]], facing)) > 0.99;
    const onRight = Math.abs(along([axis[0], 0, axis[1]], right)) > 0.99;
    const sense = along([axis[0], 0, axis[1]], onFacing ? facing : right) > 0;
    const keysOn: readonly [Move, Move] = onFacing ? ['KeyW', 'KeyS'] : ['KeyD', 'KeyA'];
    const corner: Corner | undefined = dropped.length > 0 && (onFacing || onRight) ? { axis, end, on: sense ? keysOn[0] : keysOn[1], back: sense ? keysOn[1] : keysOn[0] } : undefined;
    return { label: s.label, keys: s.keys, run: pace === 'run', axis, at: along(end, axis), coast, speed, length, corner };
  });
}

/** Why a watch on `leg` of `route` ended without its line: walk mode left, or no end within its ceiling; with the eye last seen. */
const lost = (route: string, leg: string, seen: Watched): Error =>
  new Error(`${route}: on the leg ${leg}, ${seen.kind === 'gone' ? 'walk mode was left' : `no end came within ${String(seen.t)} ms (at most ${String(WATCH_MS)} ms times the throttle, less the test's margin)`}; the eye last seen at ${seen.eye === null ? 'none' : fmt(seen.eye)}.`);

/** How near its corner a walk brings the walker to rest before the next leg, metres along the corner's axis; the walks onto it it may take; and the run-up a walk onto it starts from, to come up to speed (95% in 0.29 m). */
const CORNER = 0.25;
const SETTLE_WALKS = 8;
const RUN_UP = 0.3;

/**
 * Walks the legs at their pace with real key presses, adding every sample to `samples`; stops for the frames asked for, the first time the eye stands in
 * each stop's box. Each leg's line is watched in the page at every frame; a leg that comes no 5 cm nearer its line for 1.5 s fails with where it stands.
 * At a corner the walker comes to rest and, if it rests more than CORNER off it, walks onto it at a walk, letting go its coast and lag before it; nearer
 * than a stop at a walk can make, it first walks back the way the leg came. It fails, naming every rest, if SETTLE_WALKS walks do not bring it there.
 */
export async function walk(page: Page, route: string, list: readonly Leg[], samples: Sample[], stops: readonly Stop[] = []): Promise<Sample> {
  await startKeyLog(page);
  const pending = [...stops];
  const keys = new Keys(page);
  /** The keys a leg holds: its movement keys, with Shift at a run. */
  const keysOf = (leg: Leg | undefined): string[] => (leg === undefined ? [] : leg.run ? ['Shift', ...leg.keys] : [...leg.keys]);
  /** Where along its axis a leg lets go: its end, early by what the walker covers once the keys change. */
  const lineOf = (leg: Leg): number => leg.at - travel(page, leg.speed, leg.coast);
  // Frames from before this walk (turns, earlier walks) are not its own.
  let last = (await record(page)).at(-1) ?? (await sample(page));
  const take = async (): Promise<void> => {
    const frames = await record(page);
    samples.push(...frames);
    last = frames.at(-1) ?? last;
  };
  const settle = async (c: Corner, label: string): Promise<void> => {
    await keys.hold([]);
    const rests: string[] = [];
    for (let k = 0; ; k += 1) {
      last = await still(page);
      const at = along(c.end, c.axis);
      const error = along(last.eye, c.axis) - at;
      rests.push(error.toFixed(2));
      if (Math.abs(error) <= CORNER) return;
      if (k === SETTLE_WALKS) {
        throw new Error(`${route}: after the leg ${label} the walker came to rest no nearer than ${String(CORNER)} m to its corner ${fmt(c.end)} along [${c.axis.join(', ')}] in ${String(SETTLE_WALKS)} walks onto it: it rested ${rests.join(', ')} m past it, the release lag taken ${lag(page).toFixed(3)} s.`);
      }
      // The leg came along +axis, so the way back is walkable: from past the corner, or too near it to stop on it, walk back that way first.
      const go = travel(page, MOTION.walk, MOTION.walk * MOTION.groundTau);
      const near = Math.abs(error) < go + RUN_UP;
      const dir: 1 | -1 = near || error > 0 ? -1 : 1;
      await keys.hold([dir === 1 ? c.on : c.back]);
      const seen = await watch(page, c.axis, near ? at - go - RUN_UP : at - dir * go, dir);
      if (seen.kind === 'gone' || seen.kind === 'late') {
        await bounded(keys.hold([]));
        throw lost(route, `${label}, walking onto its corner`, seen);
      }
      await keys.hold([]);
      if (seen.kind === 'line') await learnLag(page, seen.t);
      await take();
      if (seen.kind === 'stuck' && !near) throw new Error(`${route}: after the leg ${label}, walking onto its corner ${fmt(c.end)}, the walker stuck at ${seen.eye === null ? 'none' : fmt(seen.eye)}, ${error.toFixed(2)} m past it at the start.`);
    }
  };
  for (const [i, leg] of list.entries()) {
    if (along(last.eye, leg.axis) >= lineOf(leg)) {
      if (leg.corner !== undefined) await settle(leg.corner, leg.label);
      continue;
    }
    await keys.hold(keysOf(leg));
    for (;;) {
      // The leg's line is watched in the page; once the eye passes it, the keys change at once to what comes next: none at a corner, else the next leg's.
      const seen = await watch(page, leg.axis, lineOf(leg), 1, pending);
      if (seen.kind === 'line') {
        await keys.hold(leg.corner !== undefined ? [] : keysOf(list[i + 1]));
        await learnLag(page, seen.t);
        await take();
        break;
      }
      if (seen.kind === 'gone' || seen.kind === 'late') {
        await bounded(keys.hold([]));
        throw lost(route, leg.label, seen);
      }
      if (seen.kind === 'stuck' && seen.eye !== null) {
        await keys.hold([]);
        await take();
        throw new Error(`${route}: stuck on the leg ${leg.label}, the eye at ${fmt(seen.eye)} (on the ground: ${String(last.onGround)}), ${(lineOf(leg) - along(seen.eye, leg.axis)).toFixed(2)} m short.`);
      }
      const [stop] = pending.splice(seen.stop, 1);
      await keys.hold([]);
      await take();
      last = await still(page);
      await page.screenshot({ path: test.info().outputPath(`${stop?.name ?? 'stop'}.png`) });
      await keys.hold(keysOf(leg));
    }
    if (leg.corner !== undefined) await settle(leg.corner, leg.label);
  }
  await keys.hold([]);
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

/**
 * Holds `keys` until something stops the walker past `edge` along the level `axis`: watched in the page at every frame, its eye stays within 1 mm of where
 * it stood 10 frames before, the keys still held, at most `ms`. Returns that eye and then lets go; every frame goes into `samples`. Fails with where the
 * walker stands when it does not stop there in time, as when nothing stops it.
 */
export async function into(page: Page, keys: readonly string[], axis: Facing, edge: number, samples: Sample[], ms: number): Promise<Sample> {
  // Frames from before (turns, earlier walks) are not its own.
  await record(page);
  await page.evaluate(() => { delete (window as unknown as { stillSince?: unknown }).stillSince; });
  for (const key of keys) await page.keyboard.down(key);
  const stopped = await page.waitForFunction(
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
  );
  const held = await sample(page);
  for (const key of [...keys].reverse()) await page.keyboard.up(key);
  samples.push(...(await record(page)));
  if (!stopped) throw new Error(`Holding ${keys.join('+')}, the walker came to no stop past ${edge.toFixed(2)} m along [${axis.join(', ')}] within ${String(ms)} ms: the eye is at ${fmt(held.eye)}.`);
  return held;
}

/** The Fifth Avenue entrance's middle door, on the axis, which R1 passes (src/model/doors.ts). */
export const MIDDLE_DOOR = 'hunt-entrance-middle';

/** A door as `window.__met.doors` lists it (docs/design/spec.md, Doors: Facts). */
export interface DoorFact {
  readonly id: string;
  readonly state: string;
  readonly angle: number;
  readonly locked: boolean;
  readonly built: boolean;
}

export async function doorFacts(page: Page, id: string): Promise<DoorFact | undefined> {
  return page.evaluate((door) => window.__met?.doors.find((d) => d.id === door), id);
}

/** Waits until door `id` is in `state`, at most `ms` (4 s times the CPU throttle by default). */
export async function doorIs(page: Page, id: string, state: string, ms = 4000 * throttleRate()): Promise<DoorFact> {
  await page.waitForFunction(([door, s]) => window.__met?.doors.find((d) => d.id === door)?.state === s, [id, state] as const, { timeout: ms });
  const found = await doorFacts(page, id);
  if (found === undefined) throw new Error(`No door ${id} in window.__met.doors.`);
  return found;
}

/** Waits until the look target is door `id` and the prompt under the crosshair says `text`; fails with the eye, the look and the target it found instead. */
export async function looksAt(page: Page, id: string, text: string): Promise<void> {
  const ms = 3000 * throttleRate();
  const seen = await page.waitForFunction((door) => window.__met?.walk.target?.kind === 'door' && window.__met.walk.target.id === door, id, { timeout: ms }).then(
    () => true,
    () => false,
  );
  if (!seen) {
    const walk = await page.evaluate(() => ({ eye: window.__met?.walk.eye ?? null, look: window.__met?.walk.look ?? null, target: window.__met?.walk.target ?? null }));
    throw new Error(`Door ${id} was not the look target within ${String(ms)} ms: the eye at ${walk.eye === null ? 'none' : fmt(walk.eye)} looking along ${walk.look === null ? 'none' : fmt(walk.look)} found ${JSON.stringify(walk.target)} (a door's reach is 2 m, src/walk/look.ts).`);
  }
  await expect(page.getByTestId('door-prompt')).toHaveText(text);
  await expect(page.getByTestId('crosshair')).toHaveAttribute('data-target', 'door');
}

/** The yaw that faces the plan point (x, z) from the eye (src/walk/walker.ts: yaw 0 looks toward −Z, growing to the left). */
export const toward = (eye: Vec3, x: number, z: number): number => Math.atan2(-(x - eye[0]), -(z - eye[2]));

/**
 * The middle door's leaves where the model stands them (src/model/hunt/arches.ts: the door unit `entranceDoor`, its frame's front at `ENTRANCE_DOOR_Z`,
 * on the axis): the world Z of the closed leaves' front and back faces, each leaf's hinges in plan (the edge it turns about opening toward the back, and
 * toward the front), and the farthest in plan any point of a leaf lies from a hinge it turns about, so whatever a swing sweeps lies within that of one.
 */
export function entranceLeaves(): { front: number; back: number; hinges: readonly XZ[]; reach: number } {
  const unit = entranceDoor();
  const box = (g: BufferGeometry): Box3 => {
    if (g.boundingBox === null) g.computeBoundingBox();
    return g.boundingBox ?? new Box3();
  };
  const all = box(unit.leaf);
  const hinges: XZ[] = [];
  let reach = 0;
  for (const leaf of unit.leaves) {
    const b = box(leaf.panel);
    for (const [x, , z] of [leaf.hinge.back, leaf.hinge.front]) {
      hinges.push([x, ENTRANCE_DOOR_Z + z]);
      for (const cx of [b.min.x, b.max.x]) for (const cz of [b.min.z, b.max.z]) reach = Math.max(reach, Math.hypot(cx - x, cz - z));
    }
  }
  return { front: ENTRANCE_DOOR_Z + all.max.z, back: ENTRANCE_DOOR_Z + all.min.z, hinges, reach };
}
