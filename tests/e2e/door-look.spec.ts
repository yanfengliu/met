/**
 * The door prompt where the eye looks between a pair's leaves (docs/design/spec.md, Doors: Use; work unit 2, review 17, F46), through real input on the
 * finished building. A door's leaves meet 8 mm apart and keep 4 mm off their frame, so the eye's one ray can slip between them; each closed door's
 * doorway, a box over its leaves and those gaps that the picker reads and no camera draws (src/viewer/doorways.ts), makes the door the look target there.
 * The walker stands at fixed places set by the query (`walk=1&spawn=x,y,z,tx,ty,tz`, src/walk/spawns.ts `placeOf`; ./route-places.ts `standAt`):
 * - On the plaza spawn's line 1.3 m before the entrance's middle doorway, looking along it at the spawn's pitch, where W alone from the spawn would bring
 *   it (src/model/doors.test.ts walks there headless): the spawn standing on the entrance axis, facing along it, the crosshair is on the line where the
 *   pair meet. With the pointer locked by a click of the view, which turns nothing, and no drag, the prompt says "E Open", and E opens the door.
 * - On the north link door's axis 1.3 m before its leaves, looking at their meeting line in their mid-plane, the eye's ray crossing the leaves' whole
 *   depth within 3 mm of it: the prompt says "Locked", and E leaves the door shut.
 * Red at 0defda0, whose look target was the centre ray's alone: through the gap it met nothing, so neither prompt showed (the waits for them time out).
 * Planted again on these places (2026-10-30), the closed doors' doorways out of the hit query (src/viewer/doors.ts `registerWith`): both red, each door
 * "not the look target within 3000 ms", the look target found null (the entrance's eye at (0.00, 5.55, −0.42), the link door's at (69.00, 2.17, −1.03)).
 * A ray more than about 4° off a door's axis meets a leaf's edge inside the gap, which is why both places stand on their door's axis.
 * Bound: where the ray crosses the leaves is worked out from the published eye and look and the door's pieces in the finished model built in the test
 * process; the query sets the place to 0.1 mm. Each place enters walk mode at load, with no gesture, so the pointer stays free; at the middle door a click
 * of the view then locks it, after which the mouse moves no more, so the view turns by nothing (work unit 14).
 */
import { expect, test } from '@playwright/test';
import { Box3, Matrix4, Vector3 } from 'three';

import type { Vec3 } from '../../src/build/types.js';
import { GRADE_Y, MAIN_FLOOR_Y } from '../../src/model/frame.js';
import { spawnById } from '../../src/walk/spawns.js';
import { BODY } from '../../src/walk/walker.js';
import { lockPointer, watchErrors } from './helpers.js';
import { doorPlan, feetOn, standAt } from './route-places.js';
import { doorFacts, doorIs, entranceLeaves, looksAt, MIDDLE_DOOR, still } from './route-walk.js';
import type { Sample } from './route-walk.js';
import { finishedTimeline } from './surface.js';

const LINK = 'mmw-north-link';
/** How far before a door's leaves each place stands, metres: within a door's 2 m reach, clear of its leaves. */
const BEFORE = 1.3;

/** Door `id`'s closed leaves in the finished model: their meeting line's middle on their front face, their depth, the door's front laid level, and across. */
interface Leaves {
  readonly middle: Vector3;
  readonly depth: number;
  readonly front: Vector3;
  readonly across: Vector3;
}

function leavesOf(id: string): Leaves {
  for (const step of finishedTimeline().steps) {
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

test.describe('the door prompt between a pair’s leaves', () => {
  test('on the plaza spawn’s line before the entrance’s middle door, the pointer locked: E Open with no turn, and E opens it', async ({ page }) => {
    const errors = watchErrors(page);
    const plaza = spawnById('plaza');
    if (plaza === undefined) throw new Error('src/walk/spawns.ts has no plaza spawn.');
    const door = doorPlan(MIDDLE_DOOR);
    // The spawn's line, its feet's X and its facing, followed to BEFORE metres out from the leaves' middle plane, looking along it at the spawn's pitch.
    const level = Math.hypot(...plaza.facing);
    const ahead = [plaza.facing[0] / level, plaza.facing[1] / level] as const;
    const feet = feetOn(plaza.feet[0], door.middle[1] + door.normal[1] * BEFORE, MAIN_FLOOR_Y + 1);
    const target: Vec3 = [feet[0] + ahead[0] * BEFORE, feet[1] + BODY.eye + BEFORE * Math.tan((plaza.pitch * Math.PI) / 180), feet[2] + ahead[1] * BEFORE];
    const { at } = await standAt(page, 'on the plaza spawn’s line before the middle door', feet, target);
    const front = entranceLeaves().front;
    expect(at.eye[2] - front, 'about 1.3 m before the leaves').toBeGreaterThan(1);
    expect(at.eye[2] - front).toBeLessThan(1.6);
    const offAxis = (s: Sample): number => Math.abs(s.eye[0] - door.middle[0]) + Math.abs(s.look[0]);
    expect(offAxis(at), 'on the plaza spawn’s line, the entrance axis, looking along it: the crosshair on the line where the leaves meet').toBeLessThan(1e-6);
    await lockPointer(page);
    expect(offAxis(await still(page)), 'the pointer locked by a click that turned nothing: still on the axis, looking along it').toBeLessThan(1e-6);
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn into the building').toBe(90);
    errors.expectClean();
  });

  test('at the north link door, met on its axis with the crosshair on its leaves’ meeting line: Locked, and E leaves it shut', async ({ page }) => {
    const errors = watchErrors(page);
    const leaves = leavesOf(LINK);
    // The meeting line in the leaves' mid-plane, which the ray is aimed at so it crosses their depth evenly, from the door's axis BEFORE metres out.
    const line = leaves.middle.clone().addScaledVector(leaves.front, -leaves.depth / 2);
    const stand = leaves.middle.clone().addScaledVector(leaves.front, BEFORE);
    const { at } = await standAt(page, 'on the north link door’s axis', feetOn(stand.x, stand.z, GRADE_Y + 2), [line.x, line.y, line.z]);
    const offs = [0, leaves.depth].map((back) => offLine(at, leaves, back));
    const mm = offs.map((o) => (o * 1000).toFixed(1)).join(' and ');
    expect(Math.max(...offs.map(Math.abs)), `the ray ${mm} mm off the meeting line at the leaves' front and back faces: within the 8 mm between them`).toBeLessThan(0.003);
    const away = new Vector3(...at.eye).sub(leaves.middle).dot(leaves.front);
    expect(away, 'before the leaves, within a door’s reach').toBeGreaterThan(0.6);
    expect(away).toBeLessThan(1.9);
    await looksAt(page, LINK, 'Locked');
    await page.keyboard.press('KeyE');
    expect(await doorFacts(page, LINK)).toEqual({ id: LINK, state: 'closed', angle: 0, locked: true });
    await looksAt(page, LINK, 'Locked');
    errors.expectClean();
  });
});
