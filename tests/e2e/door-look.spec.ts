/**
 * The door prompt where the eye looks between a pair's leaves (docs/design/spec.md, Doors: Use; work unit 2, review 17, F46), through real input on the
 * finished building. A door's leaves meet 8 mm apart and keep 4 mm off their frame, so the eye's one ray can slip between them; each closed door's
 * doorway, a box over its leaves and those gaps that the picker reads and no camera draws (src/viewer/doorways.ts), makes the door the look target there.
 * - From the plaza, where the Walk toggle puts the walker on the entrance's axis facing the facade, W alone, held at a walk and let go 1.3 m and a walk's
 *   coast before the middle doorway's leaves, brings the walker to rest with the crosshair on the line where the pair meet; with no drag the prompt says
 *   "E Open", and E opens the door.
 * - At the north link door, walked to by held keys (D, then W) and turned by drags until the crosshair lies within 2 mm of its leaves' meeting line, the
 *   prompt says "Locked", and E leaves the door shut.
 * Red at 0defda0, whose look target was the centre ray's alone: through the gap it met nothing, so neither prompt showed (the waits for them time out).
 * Bound: where the crosshair lies is worked out from the published eye and look and the door's pieces in the finished model built in the test process;
 * a drag turns the view LOOK_PER_PIXEL a pixel, so an aim is good to half a pixel, under 1 mm at the link door.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, Matrix4, Vector3 } from 'three';

import { SEQUENCE } from '../../src/build/sequence.js';
import { Timeline } from '../../src/build/timeline.js';
import type { Vec3 } from '../../src/build/types.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';
import { MOTION } from '../../src/walk/walker.js';
import { open, press, watchErrors } from './helpers.js';
import { doorFacts, doorIs, entranceLeaves, legs, looksAt, MIDDLE_DOOR, MINUS_Z, sample, still, walk, walking, wrap, yawOf } from './route-walk.js';
import type { Sample } from './route-walk.js';

/** Where the plaza spawn stands (src/walk/spawns.ts) and the north link's door (src/model/mmw/facade.ts: on X 69, its leaves at Z −2.38). */
const PLAZA: readonly [number, number] = [0, 24.46];
const LINK = 'mmw-north-link';
const LINK_X = 69;
/** How far a walk coasts once W is let go. */
const WALK_COAST = MOTION.walk * MOTION.groundTau;

/** Door `id`'s closed leaves in the finished model: the middle of their front face, on the line where a pair meet, its front laid level, and across. */
function leavesOf(id: string): { readonly middle: Vector3; readonly front: Vector3; readonly across: Vector3 } {
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
      return { middle, front, across: new Vector3(front.z, 0, -front.x) };
    }
  }
  throw new Error(`No piece of the finished model is tagged "${id}"; see src/model/doors.ts.`);
}

/** Where the eye's ray crosses the plane of the leaves' front face, across from their meeting line, metres. */
function offLine(at: Sample, leaves: ReturnType<typeof leavesOf>): number {
  const eye = new Vector3(...at.eye);
  const look = new Vector3(...at.look);
  const crossing = eye.clone().addScaledVector(look, leaves.middle.clone().sub(eye).dot(leaves.front) / look.dot(leaves.front));
  return crossing.sub(leaves.middle).dot(leaves.across);
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
async function aimAt(page: Page, p: Vec3): Promise<Sample> {
  for (let k = 0; k < 6; k += 1) {
    const now = await still(page);
    const [ex, ey, ez] = now.eye;
    const yaw = Math.atan2(-(p[0] - ex), -(p[2] - ez));
    const pitch = Math.atan2(p[1] - ey, Math.hypot(p[0] - ex, p[2] - ez));
    const dx = Math.round(-wrap(yaw - yawOf(now.look)) / LOOK_PER_PIXEL);
    const dy = Math.round(-(pitch - Math.asin(now.look[1])) / LOOK_PER_PIXEL);
    if (dx === 0 && dy === 0) return now;
    await drag(page, dx, dy);
  }
  return still(page);
}

test.describe('the door prompt between a pair’s leaves', () => {
  test('from the plaza spawn, W alone up to the entrance’s middle door: E Open with no turn, and E opens it', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '');
    await press(page, 'walk-toggle');
    const start = await walking(page);
    expect([start.eye[0], start.look[0]], 'the plaza spawn stands on the entrance axis, facing along it').toEqual([expect.closeTo(0, 9), expect.closeTo(0, 9)]);
    const front = entranceLeaves().front;
    await page.keyboard.down('KeyW');
    await page.waitForFunction((z) => (window.__met?.walk.eye?.[2] ?? Number.POSITIVE_INFINITY) <= z, front + 1.3 + WALK_COAST, { polling: 'raf', timeout: 30_000 });
    await page.keyboard.up('KeyW');
    const at = await still(page);
    expect(at.eye[2] - front, 'at rest about 1.3 m before the leaves').toBeGreaterThan(1);
    expect(at.eye[2] - front).toBeLessThan(1.6);
    expect(Math.abs(at.eye[0]) + Math.abs(at.look[0]), 'still on the axis, looking along it: the crosshair on the line where the leaves meet').toBeLessThan(1e-6);
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn into the building').toBe(90);
    errors.expectClean();
  });

  test('at the north link door, the crosshair on its leaves’ meeting line: Locked, and E leaves it shut', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '');
    await press(page, 'walk-toggle');
    await walking(page);
    const leaves = leavesOf(LINK);
    await walk(page, 'to the north link door', legs([PLAZA, [LINK_X, PLAZA[1]], [LINK_X, -0.9]], MINUS_Z), []);
    const at = await aimAt(page, [leaves.middle.x, leaves.middle.y, leaves.middle.z]);
    const off = offLine(await sample(page), leaves);
    expect(Math.abs(off), `the crosshair ${(off * 1000).toFixed(1)} mm off the leaves' meeting line, inside the 8 mm between them`).toBeLessThan(0.002);
    expect(Math.hypot(at.eye[0] - leaves.middle.x, at.eye[2] - leaves.middle.z), 'within a door’s reach').toBeLessThan(2);
    await looksAt(page, LINK, 'Locked');
    await page.keyboard.press('KeyE');
    expect(await doorFacts(page, LINK)).toEqual({ id: LINK, state: 'closed', angle: 0, locked: true, built: true });
    await looksAt(page, LINK, 'Locked');
    errors.expectClean();
  });
});
