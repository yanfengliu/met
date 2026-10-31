/**
 * The walker on the real model, read and moved through real input: its eye read from the read-only `window.__met.walk` at every frame, mouse drags that
 * turn it (`face`), and the doors (docs/design/spec.md, Doors) read from the read-only `window.__met.doors` and used by E, as a visitor uses them. Keys
 * are held by ./route-holds.ts, which bounds where a walker let go comes to rest; ./route-places.ts sets the fixed places walks start from.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Vec3 } from '../../src/build/types.js';
import { ENTRANCE_DOOR_Z, entranceDoor } from '../../src/model/hunt/arches.js';
import { LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { throttleRate } from './helpers.js';

export type XZ = readonly [number, number];
/** A level unit direction along an axis, as [x, z]. */
export type Facing = readonly [number, number];
export const MINUS_Z: Facing = [0, -1];
export const PLUS_Z: Facing = [0, 1];
export const MINUS_X: Facing = [-1, 0];
export const PLUS_X: Facing = [1, 0];

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

/** The walker's yaw from its look direction (src/walk/walker.ts: yaw 0 looks toward −Z and grows turning left). */
export const yawOf = (look: Vec3): number => Math.atan2(-look[0], -look[2]);
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The longest single mouse move of a drag, pixels: each move is a frame's turn, and a frame at 4× CPU throttle can take 50 ms or more. */
export const DRAG_STEP = 160;

/**
 * Turns the walker to face `yaw` with mouse drags across the canvas: a first drag of at most 300 px, which learns how far a pixel turns (it cannot turn
 * far enough to wrap round), then the rest at the rate the last long drag turned, then corrections, each drag up to 0.6 of the canvas's width in moves of
 * at most DRAG_STEP. A drag to the right must turn the walker to the right, and a drag's whole turn must stand by the next frame.
 */
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
      const steps = Math.max(1, Math.ceil(Math.abs(x0 + target - from) / DRAG_STEP));
      for (let k = 1; k <= steps; k++) {
        x = from + ((x0 + target - from) * k) / steps;
        await page.mouse.move(x, y);
      }
    }
    await page.mouse.up();
  };
  let now = await sample(page);
  // The spec's rate to start with (a drag to the right turns right, so the yaw falls), then the rate each drag of 50 px or more turned.
  let perPixel = -LOOK_PER_PIXEL;
  let learnt = false;
  for (let k = 0; k < 6; k++) {
    const error = wrap(yaw - yawOf(now.look));
    if (Math.abs(error) < 0.004) return now;
    let pixels = Math.round(error / perPixel);
    if (!learnt) pixels = Math.sign(pixels) * Math.min(Math.abs(pixels), 300);
    while (pixels !== 0) {
      const chunk = Math.sign(pixels) * Math.min(Math.abs(pixels), Math.floor(box.width * 0.6));
      const before = yawOf(now.look);
      await drag(chunk);
      now = await sample(page);
      pixels -= chunk;
      if (Math.abs(chunk) < 50) continue;
      perPixel = wrap(yawOf(now.look) - before) / chunk;
      if (!learnt) expect(perPixel, 'radians a pixel of drag to the right turns: to the right, so negative').toBeLessThan(0);
      learnt = true;
    }
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
