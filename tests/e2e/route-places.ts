/**
 * What the route walks (./routes.spec.ts) meet on their way, beside the walking itself (./route-walk.ts), each read apart from the page or used through
 * real input:
 * - a door's closed leaves where the finished model places them, read from the timeline built in the test's own process (./surface.ts): the planes of
 *   their faces, their hinges and how far a leaf reaches from a hinge, so a walk can be held at them, look at a leaf and stand clear of their swing;
 * - the eye aimed at a point by drags, across for its yaw and up or down for its pitch, `LOOK_PER_PIXEL` a pixel;
 * - an artwork approached at a walk until its card shows, then turned away from until the card goes;
 * - every frame's card, door prompt, look target and eye, recorded in the page by a requestAnimationFrame loop beside the page's own, which runs after it
 *   in each frame and writes nothing (docs/design/spec.md, Collection: Labels, Place; review 7, F30).
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, Matrix4, Vector3 } from 'three';

import type { Vec3 } from '../../src/build/types.js';
import { doorLeavesOf } from '../../src/model/lib/window.js';
import { LOOK_REACH } from '../../src/walk/look.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { BODY } from '../../src/walk/walker.js';
import { throttleRate } from './helpers.js';
import { artworkBounds } from './labels-helpers.js';
import { airborne, face, fmt, record, still, toward, wrap, yawOf } from './route-walk.js';
import type { Facing, Sample, XZ } from './route-walk.js';
import { finishedTimeline } from './surface.js';

/** A door's closed leaves in plan, where the finished model places them (docs/design/spec.md, Doors). */
export interface DoorPlan {
  readonly id: string;
  /** The level unit direction the door's front faces, [x, z]; its leaves open toward the back, against it, or the front. */
  readonly normal: Facing;
  /** Along `normal`, world metres: the closed leaves' front and back faces, at their hinges' points. */
  readonly front: number;
  readonly back: number;
  /** Along `normal`, how far the closed leaves reach toward the front, raised panels included (Weston's stand 18 mm proud of `front`). */
  readonly frontmost: number;
  /** The doorway's middle in plan, between its leaves. */
  readonly middle: XZ;
  /** Every leaf's two hinge points in plan: the edge it turns about opening toward the back, and toward the front. */
  readonly hinges: readonly XZ[];
  /** The farthest in plan any point of a leaf lies from a hinge it turns about, so whatever a swing sweeps lies within this of one. */
  readonly reach: number;
  /** The leaf on the +across side of the middle (`across` is `normal` turned a quarter left, [−nz, nx]): its hinge points in plan and its width. */
  readonly leaf: { readonly back: XZ; readonly front: XZ; readonly width: number };
}

const along = (p: XZ, d: Facing): number => p[0] * d[0] + p[1] * d[1];

/** Door `id`'s closed leaves from the timeline of the finished model built in the test's process: its tagged piece's matrix and its door unit's leaves. */
export function doorPlan(id: string): DoorPlan {
  for (const step of finishedTimeline().steps) {
    for (const [m, mesh] of step.meshes.entries()) {
      const slot = (step.tags[m] ?? []).findIndex((tag) => tag?.kind === 'door' && tag.id === id);
      const parts = doorLeavesOf(mesh.geometry);
      if (slot < 0 || parts === undefined || parts.length === 0) continue;
      mesh.updateMatrixWorld(true);
      const unit = new Matrix4();
      mesh.getMatrixAt(slot, unit);
      unit.premultiply(mesh.matrixWorld);
      const e = unit.elements;
      const level = Math.hypot(e[8], e[10]);
      const normal: Facing = [e[8] / level, e[10] / level];
      const across: Facing = [-normal[1], normal[0]];
      const plan = (p: readonly [number, number, number]): XZ => {
        const v = new Vector3(...p).applyMatrix4(unit);
        return [v.x, v.z];
      };
      let reach = 0;
      let frontmost = Number.NEGATIVE_INFINITY;
      for (const part of parts) {
        if (part.geometry.boundingBox === null) part.geometry.computeBoundingBox();
        const b = part.geometry.boundingBox ?? new Box3();
        for (const [x, , z] of [part.hinge.back, part.hinge.front]) for (const cx of [b.min.x, b.max.x]) for (const cz of [b.min.z, b.max.z]) reach = Math.max(reach, Math.hypot(cx - x, cz - z));
        for (const cx of [b.min.x, b.max.x]) for (const cz of [b.min.z, b.max.z]) frontmost = Math.max(frontmost, along(plan([cx, 0, cz]), normal));
      }
      const hinges = parts.flatMap((p) => [plan(p.hinge.back), plan(p.hinge.front)]);
      const middle: XZ = [hinges.reduce((s, h) => s + h[0], 0) / hinges.length, hinges.reduce((s, h) => s + h[1], 0) / hinges.length];
      const side = parts.map((p) => ({ back: plan(p.hinge.back), front: plan(p.hinge.front) })).reduce((a, b) => (along(b.back, across) > along(a.back, across) ? b : a));
      const width = along(side.back, across) - along(middle, across);
      return { id, normal, front: Math.max(...parts.map((p) => along(plan(p.hinge.front), normal))), back: Math.min(...parts.map((p) => along(plan(p.hinge.back), normal))), frontmost, middle, hinges, reach, leaf: { ...side, width } };
    }
  }
  throw new Error(`No piece of the finished model is tagged as door "${id}" with a door unit's leaves: place them with kit.addTagged(door.leaf, …, doorTag("${id}")) (src/model/doors.ts).`);
}

/** Metres the body standing at `eye` keeps clear of all door `door`'s leaves sweep: negative when a swing could reach into it. */
export function clearOfSwing(eye: Vec3, door: DoorPlan): number {
  return Math.min(...door.hinges.map(([x, z]) => Math.hypot(eye[0] - x, eye[2] - z) - BODY.radius - door.reach));
}

/** How far the eye may stand from a point of a leaf it looks at, metres: a door's 2 m reach (src/walk/look.ts) less what an aim may miss by. */
const LOOK = LOOK_REACH.door - 0.2;
/** How far clear of a swing the body stands to use a door, metres. */
const CLEAR = 0.15;

/**
 * Where on the doorway's axis, on its `side`, the walker stands to close the door open toward that side and to open it again closed: within LOOK of a
 * point of the leaf either way (`leafPoint`) and CLEAR of all its leaves sweep, the middle of the stretch of the axis that allows both, found in 1 cm
 * steps. Fails, naming the stretch tried, when there is none.
 */
export function standOff(door: DoorPlan, side: 'front' | 'back'): XZ {
  const out = side === 'front' ? 1 : -1;
  const face = side === 'front' ? door.front : door.back;
  const at = (s: number): XZ => {
    const k = face + out * s - along(door.middle, door.normal);
    return [door.middle[0] + door.normal[0] * k, door.middle[1] + door.normal[1] * k];
  };
  const fits = (p: XZ): boolean =>
    [leafPoint(door, 'closed', side), leafPoint(door, 'open', side)].every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= LOOK) && clearOfSwing([p[0], 0, p[1]], door) >= CLEAR;
  const good: number[] = [];
  for (let s = 0.3; s <= 3; s += 0.01) if (fits(at(s))) good.push(s);
  const first = good[0];
  const last = good.at(-1);
  if (first === undefined || last === undefined) throw new Error(`Door ${door.id}: no place on its axis 0.3 to 3 m out on its ${side} lies within ${String(LOOK)} m of its leaf closed and open and ${String(CLEAR)} m clear of their swing.`);
  return at((first + last) / 2);
}

/**
 * A plan point on the leaf on the +across side, for the eye to look at: closed, on the face toward `side` (`share` of its width from its hinge toward
 * the middle); open toward `side`, standing against its jamb, `share` of its width out from its hinge and 5 cm in from the hinge line, on its face.
 */
export function leafPoint(door: DoorPlan, state: 'closed' | 'open', side: 'front' | 'back', share = 0.6): XZ {
  const across: Facing = [-door.normal[1], door.normal[0]];
  const hinge = side === 'front' ? door.leaf.front : door.leaf.back;
  const out = side === 'front' ? 1 : -1;
  const k = door.leaf.width * share;
  if (state === 'closed') return [hinge[0] - across[0] * k, hinge[1] - across[1] * k];
  return [hinge[0] + door.normal[0] * out * k - across[0] * 0.05, hinge[1] + door.normal[1] * out * k - across[1] * 0.05];
}

/**
 * Where a walk from the eye toward `next` starts, so that its first leg runs exactly along an axis, as `legs` needs: the eye's own place along that leg,
 * `next`'s across it. The walker keeps its offset across the leg, a few centimetres after a corner's stop, until the corner at the leg's end.
 */
export function lineUp(s: Sample, next: XZ): XZ {
  return Math.abs(s.eye[0] - next[0]) < Math.abs(s.eye[2] - next[1]) ? [next[0], s.eye[2]] : [s.eye[0], next[1]];
}

/** Tilts the walker's view to `pitch` radians with a vertical drag at the canvas's middle, down for down, `LOOK_PER_PIXEL` a pixel; a tilt under a click's travel is left. */
export async function tilt(page: Page, pitch: number): Promise<void> {
  const now = await still(page);
  const dy = Math.round((Math.asin(now.look[1]) - pitch) / LOOK_PER_PIXEL);
  if (Math.abs(dy) < CLICK_SLOP + 1) return;
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('The canvas has no box.');
  const x = canvas.x + canvas.width / 2;
  const y = canvas.y + canvas.height / 2 - dy / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k += 1) await page.mouse.move(x, y + (dy * k) / 10);
  await page.mouse.up();
}

/** Aims the eye at the world point (x, y, z) by drags: across to face it, then up or down to look at its height. */
export async function aim(page: Page, x: number, y: number, z: number): Promise<void> {
  const at = await still(page);
  await face(page, toward(at.eye, x, z));
  const eye = (await still(page)).eye;
  await tilt(page, Math.atan2(y - eye[1], Math.hypot(x - eye[0], z - eye[2])));
}

/** One frame as the page drew it: whether the card and the door prompt show, the prompt's words, the crosshair's look target kind, the card's artwork (`window.__met.label`), the look target read then and the eye. */
export interface Screen {
  readonly card: boolean;
  readonly prompt: boolean;
  readonly words: string;
  readonly kind: string | null;
  readonly label: string | null;
  readonly target: { readonly kind: string; readonly id: string; readonly distance: number } | null;
  readonly eye: Vec3 | null;
}

/** Starts recording every frame the page draws (`Screen`), or empties the record if it runs. */
export async function watchScreens(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { screens?: unknown[] };
    if (w.screens !== undefined) {
      w.screens.splice(0);
      return;
    }
    const list: unknown[] = [];
    w.screens = list;
    const shown = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const tick = (): void => {
      if (w.screens !== list) return;
      const card = shown('art-card');
      const prompt = shown('door-prompt');
      const walk = window.__met?.walk;
      const target = walk?.target ?? null;
      list.push({
        card: card !== null && !card.hidden,
        prompt: prompt !== null && !prompt.hidden,
        words: prompt?.textContent ?? '',
        kind: shown('crosshair')?.getAttribute('data-target') ?? null,
        label: window.__met?.label?.id ?? null,
        target: target === null ? null : { kind: target.kind, id: target.id, distance: target.distance },
        eye: walk?.eye == null ? null : [...walk.eye],
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** The frames recorded since the last call; `stop` ends the recording. */
export async function screens(page: Page, stop = false): Promise<Screen[]> {
  return page.evaluate((end) => {
    const w = window as unknown as { screens?: Screen[] };
    const out = (w.screens ?? []).splice(0);
    if (end) delete w.screens;
    return out;
  }, stop);
}

/** How many frames the record holds now, to read those from here on with `screensSince`. */
export async function screenMark(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { screens?: unknown[] }).screens?.length ?? 0);
}

/** A copy of the frames recorded from index `from` on, leaving the record as it is. */
export async function screensSince(page: Page, from: number): Promise<Screen[]> {
  return page.evaluate((k) => ((window as unknown as { screens?: Screen[] }).screens ?? []).slice(k), from);
}

/** How far out from a closed door's leaves a walk straight at it must see its prompt: the door's 2 m reach (src/walk/look.ts) less a margin. */
const APPROACH = 1.9;

/**
 * The frames, among `frames`, in which the eye stands before door `door` on its `side`, within APPROACH of its closed leaves' face and inside the
 * doorway's width, as a walk straight at the closed door crosses them, and those of them that do not show `words` under the crosshair with the door as
 * the look target. On the axis of a pair the eye's ray runs between its leaves (work unit 2, final review, F46).
 */
export function promptOnApproach(frames: readonly Screen[], door: DoorPlan, side: 'front' | 'back', words: string): { readonly near: number; readonly apart: readonly string[] } {
  const across: Facing = [-door.normal[1], door.normal[0]];
  const face = side === 'front' ? door.front : door.back;
  const out = side === 'front' ? 1 : -1;
  const near = frames.filter((s) => {
    if (s.eye === null) return false;
    const d = out * (along([s.eye[0], s.eye[2]], door.normal) - face);
    return d >= BODY.radius - 0.02 && d <= APPROACH && Math.abs(along([s.eye[0], s.eye[2]], across) - along(door.middle, across)) < door.leaf.width;
  });
  const apart = near.filter((s) => !(s.prompt && s.words === words && s.kind === 'door' && s.target?.id === door.id)).map((s) => `${fmt(s.eye ?? [0, 0, 0])}: prompt ${s.prompt ? `"${s.words}"` : 'hidden'}, look target ${String(s.target?.id ?? s.kind)}`);
  return { near: near.length, apart };
}

/** The frames where the card does not follow the crosshair's look target: it shows exactly when that target is an artwork, and it is the card of the target read then. */
export function cardApart(frames: readonly Screen[]): string[] {
  return frames.flatMap((s, i) => {
    if (s.card !== (s.kind === 'artwork')) return [`frame ${String(i)}: card ${s.card ? 'shown' : 'hidden'}, look target ${String(s.kind)}`];
    if (s.card && (s.label === null || s.target?.id !== s.label)) return [`frame ${String(i)}: the card of ${String(s.label)}, the look target ${String(s.target?.id)}`];
    return [];
  });
}

/** The distance from `p` to the box, metres (0 inside it). */
export const boxDistance = (p: Vec3, box: Box3): number => box.distanceToPoint(new Vector3(...p));

/** How near the eye may come to an approached artwork's box before its card must have shown, metres. */
const NEAR = 3;
/** The spec's reach of an artwork's card, metres (docs/design/spec.md, Collection: Labels, Walking), held here, not read from src/walk/look.ts, so a change of the page's reach turns the approach red. */
const CARD_REACH = 6;

/**
 * Approaches artwork `id` (its Met object ID; its box from the collection's placements, ./labels-helpers.ts) as a visitor does: from where the eye stands,
 * farther from it than an artwork's 6 m reach (CARD_REACH), aimed at its box's middle by drags, and walked toward it at a walk with W held until its
 * card shows, watched in the page at every frame; then turned by drags to `away` (a yaw) until the card goes. At every frame recorded the card follows the
 * look target (`cardApart`), and no frame shows it while the eye stands farther than the spec's 6 m from the artwork's box. Fails unless the card
 * shows before the eye comes within NEAR (3 m) of the box, and went once the walker turned away. It records its own frames (`watchScreens`) and ends
 * the record when done; the walk's own frames (./route-walk.ts `record`), from before the aim to after the turn, go into `samples`, and none may be
 * off the ground, so the walk toward the artwork and the turn away keep the walker on it (review 20, F55: the next walk dropped them, so the airborne
 * check never saw this walk). Returns the first frame with the card.
 */
export async function approach(page: Page, id: number, away: number, where: string, samples: Sample[]): Promise<Screen> {
  const box = artworkBounds().get(id);
  if (box === undefined) throw new Error(`${where}: no artwork ${String(id)} among the collection's placements (src/model/collection/spaces-a.ts, spaces-b.ts).`);
  const reach = CARD_REACH;
  samples.push(...(await record(page)));
  const start = await still(page);
  const from = boxDistance(start.eye, box);
  if (from <= reach + 0.5) throw new Error(`${where}: the eye at ${fmt(start.eye)} stands ${from.toFixed(2)} m from artwork ${String(id)}, inside or near its ${String(reach)} m reach; an approach starts farther off.`);
  const middle = box.getCenter(new Vector3());
  await aim(page, middle.x, middle.y, middle.z);
  await watchScreens(page);
  await page.keyboard.down('KeyW');
  const how = await page
    .waitForFunction(
      ([want, x0, y0, z0, x1, y1, z1, near]) => {
        if (window.__met?.label?.id === want) return 'card';
        const eye = window.__met?.walk.eye;
        if (eye == null) return false;
        const d = Math.hypot(Math.max(x0 - eye[0], 0, eye[0] - x1), Math.max(y0 - eye[1], 0, eye[1] - y1), Math.max(z0 - eye[2], 0, eye[2] - z1));
        return d <= near ? 'near' : false;
      },
      [String(id), box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z, NEAR] as const,
      { polling: 'raf', timeout: 20_000 * throttleRate() },
    )
    .then(
      async (handle) => String(await handle.jsonValue()),
      () => 'stuck',
    );
  await page.keyboard.up('KeyW');
  const stopped = await still(page);
  const frames = await screens(page);
  const report = `${where}: walking toward artwork ${String(id)} from ${fmt(start.eye)}, ${from.toFixed(2)} m off, stopped at ${fmt(stopped.eye)} (${how})`;
  expect(how, `${report}: its card shows before the eye comes within ${String(NEAR)} m`).toBe('card');
  const first = frames.find((s) => s.card);
  if (first === undefined) throw new Error(`${report}: the label says ${String(id)} but no recorded frame showed its card.`);
  expect(frames[0]?.card, `${report}: no card as it set off`).toBe(false);
  expect(cardApart(frames), `${report}: frames where the card did not follow the look target`).toEqual([]);
  const far = frames.filter((s) => s.card && s.eye !== null && boxDistance(s.eye, box) > reach + 1e-3).map((s) => `${fmt(s.eye ?? [0, 0, 0])}: ${(s.eye === null ? 0 : boxDistance(s.eye, box)).toFixed(3)} m`);
  expect(far, `${report}: frames with its card while the eye stood farther than ${String(reach)} m from it`).toEqual([]);
  expect(first.label, report).toBe(String(id));
  expect(first.target?.distance ?? Number.POSITIVE_INFINITY, `${report}: the look target's distance as the card first shows`).toBeLessThanOrEqual(reach);
  console.log(`${report}: the card first shown with the look target ${(first.target?.distance ?? Number.NaN).toFixed(2)} m off, the eye ${first.eye === null ? '?' : boxDistance(first.eye, box).toFixed(2)} m from the artwork's box`);
  // Turned away, the card goes, and at every frame of the turn it still follows the look target.
  await face(page, wrap(away));
  await page.waitForFunction(() => window.__met?.label === null, undefined, { polling: 'raf', timeout: 5000 * throttleRate() });
  await expect(page.getByTestId('art-card')).toBeHidden();
  const turn = await screens(page, true);
  expect(cardApart(turn), `${where}: frames of the turn away where the card did not follow the look target`).toEqual([]);
  expect(turn.at(-1)?.card, `${where}: the card gone once turned away to yaw ${away.toFixed(2)} (facing ${yawOf((await still(page)).look).toFixed(2)})`).toBe(false);
  const walked = await record(page);
  expect(airborne(walked), `${report}: eyes where the walker was off the ground on the way to the artwork and turning away`).toEqual([]);
  samples.push(...walked);
  return first;
}
