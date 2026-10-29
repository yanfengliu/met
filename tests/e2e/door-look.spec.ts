/**
 * The door prompt where the eye looks between a pair's leaves (docs/design/spec.md, Doors: Use; work unit 2, review 17, F46), through real input on the
 * finished building. A door's leaves meet 8 mm apart and keep 4 mm off their frame, so the eye's one ray can slip between them; each closed door's
 * doorway, a box over its leaves and those gaps that the picker reads and no camera draws (src/viewer/doorways.ts), makes the door the look target there.
 * - From the plaza, where the Walk toggle puts the walker on the entrance's axis facing the facade, W alone, held at a walk, let go 4 m before the middle
 *   doorway's leaves to learn how late a key goes up (./route-keys.ts) and held again and let go 1.3 m before them, early by a walk's coast and that lag's
 *   travel, brings the walker to rest with the crosshair on the line where the pair meet; with no drag the prompt says "E Open", and E opens the door.
 * - At the north link door, met on its axis: from the plaza spawn, entered at load (`walk=1`), with no gesture, so the pointer stays free and drags
 *   turn the view (the Walk toggle's click would lock it), walked by D out along the plaza to its line, 27 m off, turned there by drags toward its leaves' meeting line,
 *   run at by W and Shift to about 1.3 m before the leaves, let go early by a run's coast and the travel of the lag the walk out learnt, and turned again
 *   onto that line, the eye's ray crossing the leaves' whole depth within 3 mm of
 *   it, the prompt says "Locked", and E leaves the door shut.
 * Red at 0defda0, whose look target was the centre ray's alone: through the gap it met nothing, so neither prompt showed (the waits for them time out).
 * A ray more than about 4° off a door's axis meets a leaf's edge inside the gap, which is why the link door is run at from far out along its line.
 * Bound: where the ray crosses the leaves is worked out from the published eye and look and the door's pieces in the finished model built in the test
 * process; a drag turns the view LOOK_PER_PIXEL a pixel, so an aim is good to half a pixel, under 1 mm at the link door. The walk to the middle door
 * enters by the Walk toggle, which locks the pointer (work unit 14), and moves no mouse after it, so the view turns by nothing.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, Matrix4, Vector3 } from 'three';

import { SEQUENCE } from '../../src/build/sequence.js';
import { Timeline } from '../../src/build/timeline.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { MOTION } from '../../src/walk/walker.js';
import { open, press, watchErrors } from './helpers.js';
import { Keys, learnLag, startKeyLog, travel, watch } from './route-keys.js';
import { COAST, doorFacts, doorIs, entranceLeaves, fmt, legs, looksAt, MIDDLE_DOOR, MINUS_Z, still, walk, walking, wrap, yawOf } from './route-walk.js';
import type { Sample } from './route-walk.js';

/** Where the plaza spawn stands (src/walk/spawns.ts) and the north link's door (src/model/mmw/facade.ts: on X 69, its leaves at Z −2.38). */
const PLAZA: readonly [number, number] = [0, 24.46];
const LINK = 'mmw-north-link';
const LINK_X = 69;
/** How far a walk coasts once W is let go. */
const WALK_COAST = MOTION.walk * MOTION.groundTau;

/** Door `id`'s closed leaves in the finished model: their meeting line's middle on their front face, their depth, the door's front laid level, and across. */
interface Leaves {
  readonly middle: Vector3;
  readonly depth: number;
  readonly front: Vector3;
  readonly across: Vector3;
}

function leavesOf(id: string): Leaves {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  for (const step of timeline.steps) {
    for (const [m, tags] of step.tags.entries()) {
      const slot = tags?.findIndex((tag) => tag?.id === id) ?? -1;
      const mesh = step.meshes[m];
      if (slot < 0 || mesh === undefined) continue;
      const unit = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16);
      if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox ?? new Box3();
      const middle = new Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z).applyMatrix4(unit);
      const front = new Vector3().setFromMatrixColumn(unit, 2).setY(0).normalize();
      return { middle, depth: box.max.z - box.min.z, front, across: new Vector3(front.z, 0, -front.x) };
    }
  }
  throw new Error(`No piece of the finished model is tagged "${id}"; see src/model/doors.ts.`);
}

/** Where the eye's ray crosses the plane `back` metres behind the leaves' front face, across from their meeting line, metres. */
function offLine(at: Sample, leaves: Leaves, back = 0): number {
  const eye = new Vector3(...at.eye);
  const look = new Vector3(...at.look);
  const plane = leaves.middle.clone().addScaledVector(leaves.front, -back);
  const crossing = eye.clone().addScaledVector(look, plane.clone().sub(eye).dot(leaves.front) / look.dot(leaves.front));
  return crossing.sub(plane).dot(leaves.across);
}

/** A drag of (dx, dy) pixels on the canvas, which turns the walking view the way it moves; one that travels under CLICK_SLOP goes out 20 px and back. */
async function drag(page: Page, dx: number, dy: number): Promise<void> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (Math.abs(dx) + Math.abs(dy) < 2 * CLICK_SLOP) await page.mouse.move(x + 20, y);
  for (let k = 1; k <= 5; k += 1) await page.mouse.move(x + Math.round((dx * k) / 5), y + Math.round((dy * k) / 5));
  await page.mouse.up();
}

/** Turns the walker by drags until its eye's ray points at `p`, to the nearest pixel, at most six drags. */
async function aimAt(page: Page, p: Vector3): Promise<Sample> {
  for (let k = 0; k < 6; k += 1) {
    const now = await still(page);
    const [ex, ey, ez] = now.eye;
    const yaw = Math.atan2(-(p.x - ex), -(p.z - ez));
    const pitch = Math.atan2(p.y - ey, Math.hypot(p.x - ex, p.z - ez));
    const dx = Math.round(-wrap(yaw - yawOf(now.look)) / LOOK_PER_PIXEL);
    const dy = Math.round(-(pitch - Math.asin(now.look[1])) / LOOK_PER_PIXEL);
    if (dx === 0 && dy === 0) return now;
    await drag(page, dx, dy);
  }
  return still(page);
}

/** Waits in the page, at every frame, until the eye stands at most `d` metres in front of the leaves' front face. */
async function within(page: Page, leaves: Leaves, d: number): Promise<void> {
  await page.waitForFunction(
    ([x, z, fx, fz, most]) => {
      const eye = window.__met?.walk.eye;
      return eye != null && (eye[0] - x) * fx + (eye[2] - z) * fz <= most;
    },
    [leaves.middle.x, leaves.middle.z, leaves.front.x, leaves.front.z, d] as const,
    { polling: 'raf', timeout: 30_000 },
  );
}

test.describe('the door prompt between a pair’s leaves', () => {
  test('from the plaza spawn, W alone up to the entrance’s middle door: E Open with no turn, and E opens it', async ({ page }) => {
    // About 15 s here (14.7 to 15.0 s in three full runs, 2026-10-27); four times that for a loaded machine.
    test.setTimeout(60_000);
    const errors = watchErrors(page);
    await open(page, '');
    await press(page, 'walk-toggle');
    const start = await walking(page);
    expect([start.eye[0], start.look[0]], 'the plaza spawn stands on the entrance axis, facing along it').toEqual([expect.closeTo(0, 9), expect.closeTo(0, 9)]);
    const front = entranceLeaves().front;
    await startKeyLog(page);
    const keys = new Keys(page);
    for (const before of [4, 1.3]) {
      await keys.hold(['KeyW']);
      const seen = await watch(page, MINUS_Z, -(front + before + travel(page, MOTION.walk, WALK_COAST)), 1);
      await keys.hold([]);
      if (seen.kind !== 'line') throw new Error(`W held from the plaza spawn, the watch ended ${seen.kind} with the eye at ${seen.eye === null ? 'none' : fmt(seen.eye)}, short of ${String(before)} m before the leaves.`);
      await learnLag(page, seen.t);
      await still(page);
    }
    const at = await still(page);
    expect(at.eye[2] - front, 'at rest about 1.3 m before the leaves').toBeGreaterThan(1);
    expect(at.eye[2] - front).toBeLessThan(1.6);
    expect(Math.abs(at.eye[0]) + Math.abs(at.look[0]), 'still on the axis, looking along it: the crosshair on the line where the leaves meet').toBeLessThan(1e-6);
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn into the building').toBe(90);
    errors.expectClean();
  });

  test('at the north link door, met on its axis with the crosshair on its leaves’ meeting line: Locked, and E leaves it shut', async ({ page }) => {
    // About 22 s here (21.8 to 22.4 s in three full runs, 2026-10-27), most of it the walk out along the plaza; four times that for a loaded machine.
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await open(page, 'walk=1&spawn=plaza');
    await walking(page);
    const leaves = leavesOf(LINK);
    // The meeting line in the leaves' mid-plane, which the ray is aimed at so it crosses their depth evenly.
    const line = leaves.middle.clone().addScaledVector(leaves.front, -leaves.depth / 2);
    await walk(page, 'out to the north link door’s line', legs([PLAZA, [LINK_X, PLAZA[1]]], MINUS_Z), []);
    await aimAt(page, line);
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyW');
    await within(page, leaves, 1.3 + travel(page, MOTION.run, COAST));
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Shift');
    const at = await aimAt(page, line);
    const offs = [0, leaves.depth].map((back) => offLine(at, leaves, back));
    const mm = offs.map((o) => (o * 1000).toFixed(1)).join(' and ');
    expect(Math.max(...offs.map(Math.abs)), `the ray ${mm} mm off the meeting line at the leaves' front and back faces: within the 8 mm between them`).toBeLessThan(0.003);
    const away = new Vector3(...at.eye).sub(leaves.middle).dot(leaves.front);
    expect(away, 'before the leaves, within a door’s reach').toBeGreaterThan(0.6);
    expect(away).toBeLessThan(1.9);
    await looksAt(page, LINK, 'Locked');
    await page.keyboard.press('KeyE');
    expect(await doorFacts(page, LINK)).toEqual({ id: LINK, state: 'closed', angle: 0, locked: true, built: true });
    await looksAt(page, LINK, 'Locked');
    errors.expectClean();
  });
});
