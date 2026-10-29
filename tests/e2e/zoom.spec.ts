/**
 * The zoom through real wheel input, the gate for the class "camera input stops responding at a limit" (docs/learning/defect-register.md, "The
 * wheel stops zooming"; docs/design/spec.md, Camera). From two exterior presets, an interior one, after a move by the W key, and over the park toward
 * the workspace ground beyond the site, many notches of the wheel toward the middle of the view, then back:
 * - the surface under the pointer is found apart from the page: the pointer's ray rebuilt from the camera facts and the canvas, as the page's projection
 *   casts it, and cast through the finished model built in this process, triangle by triangle (./surface.ts), never through the page's pick or target;
 * - every notch in keeps the camera on that ray within 1 cm, moves it at least min(ZOOM.minStep, what is left to the bound) − 1 mm and never past
 *   the bound: ZOOM.stop before that surface or, if sooner, where the ray comes down to the camera floor (CAMERA_FLOOR over the workspace ground);
 *   the bound comes within 120 notches, and the camera stops there within 1 mm;
 * - at that bound a notch in moves nothing, and every one of 8 notches out moves at least ZOOM.minStep;
 * - from aerial-ne, notches out reach the far bound (the target ZOOM.maxDistance away), where a notch out moves nothing and a notch in moves again;
 * - lowered onto the camera floor by Q held: from the far bound looking down (both bounds at once), a notch in moves nothing and a notch out moves,
 *   and from there the zoom holds as above; looking up, a notch out moves nothing (the floor), a notch in moves, and the next notch out comes back
 *   onto the floor on the ray and stops there;
 * - under a footing on the floor, looking up, a right-drag that pans the camera under the floor and a wheel notch sent at once leave the view where
 *   it looked, and the camera on the floor. Chrome hands the page the notch a frame after the drag's move (its input router waits for each mouse
 *   event's answer), so the page lifts the camera between them; the two in one frame are src/viewer/camera-floor.test.ts, through the same handlers.
 * Bound: one pointer position (the middle of the view the projection covers: the whole canvas, as the page opens with the build replay closed), wheel
 * steps of 100 pixels, and the page at t = N with no cut and no floor view, which is the state ./surface.ts rebuilds.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

import { CAMERA_FLOOR } from '../../src/viewer/camera-rig.js';
import { ZOOM } from '../../src/viewer/zoom.js';
import { camera, choosePreset, distance, open, settle, settledCamera, throttleRate, watchErrors } from './helpers.js';
import type { Camera } from './helpers.js';
import { firstSurface, workspaceGround } from './surface.js';

type Triple = readonly [number, number, number];

const MAX_NOTCHES_IN = 120;
const NOTCHES_OUT = 8;
const MM = 1e-3;
/**
 * Over the park west of the building, 30 m up, looking west 4.3° under the horizon: the ray under the pointer passes over every crown (27.3 m at
 * most) and meets nothing until the workspace ground about 460 m away, beyond the site, so the camera floor comes before the stop 0.5 m before
 * that ground. After a long enough W move the front preset's ray does the same (work unit 1, review 2, U8).
 */
const OVER_THE_PARK = [0, 30, -240, 0, 15, -440] as const;
/** East of Fifth Avenue, 10 m up, looking west 45° up over the building into the sky: lowered onto the camera floor, a zoom out backs down the ray. */
const LOOKING_UP = [0, 10, 80, 0, 20, 70] as const;

/**
 * Over the Hunt pavilion's footing at X −11.2 to −6.0, Z −11.8 to −7.0 (src/model/hunt/podium.ts), whose underside at −4.54 m is the model's lowest
 * point, looking 45° up toward the west with the target 100 m away: lowered onto the floor by Q, the camera stands 10 cm under that footing.
 */
const UNDER_A_FOOTING = [-8.6, 10, -9.4, -8.6, 80.711, -80.111] as const;

/** The camera floor under the finished model: CAMERA_FLOOR over the workspace ground (src/viewer/camera-rig.ts). */
const floorY = (): number => workspaceGround() + CAMERA_FLOOR;

/** Holds Q (down, src/viewer/orbit-keys.ts) until the camera stands on the camera floor, then lets go, with the pointer back at (x, y). */
async function lowerOntoFloor(page: Page, x: number, y: number): Promise<Camera> {
  await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
  await page.keyboard.down('KeyQ');
  await page.waitForFunction((f) => (window.__met?.camera.position[1] ?? Number.POSITIVE_INFINITY) <= f + 1e-6, floorY(), { timeout: 20_000 * throttleRate() });
  await page.keyboard.up('KeyQ');
  await settle(page);
  await page.mouse.move(x, y);
  return camera(page);
}

/**
 * The middle of the part of the canvas the projection covers, where the view axis meets the screen: its height is the canvas width over the published
 * aspect, from the canvas's top (src/viewer/camera-rig.ts `resize`), the whole canvas while the build replay is closed and the part above the bar while
 * it is open.
 */
async function viewCentre(page: Page): Promise<{ x: number; y: number }> {
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('The canvas has no box.');
  const visible = canvas.width / (await camera(page)).aspect;
  return { x: canvas.x + canvas.width / 2, y: canvas.y + visible / 2 };
}

/** One wheel notch (deltaY ±100) at the pointer, and the camera once the frame after it has run. */
async function notch(page: Page, deltaY: number): Promise<Camera> {
  await page.mouse.wheel(0, deltaY);
  await settle(page);
  return camera(page);
}

const radius = (c: Camera): number => distance(c.position, c.target);

/**
 * The unit ray under the pointer at (x, y) from camera `c`, as the page casts it (src/viewer/zoom.ts `pointerRay`): the camera's projection covers the
 * canvas above the bar (src/viewer/camera-rig.ts `resize`, whose visible height is the canvas width over the published aspect), +Y up.
 */
async function pointerRay(page: Page, c: Camera, x: number, y: number): Promise<Triple> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const projection = new PerspectiveCamera(c.fov, c.aspect, c.near, c.far);
  const visible = box.width / c.aspect;
  if (visible < box.height - 0.5) projection.setViewOffset(box.width, visible, 0, 0, box.width, box.height);
  projection.updateProjectionMatrix();
  projection.position.set(...c.position);
  projection.lookAt(new Vector3(...c.target));
  projection.updateMatrixWorld();
  const d = new Vector3(((x - box.x) / box.width) * 2 - 1, -((y - box.y) / box.height) * 2 + 1, 0.5).unproject(projection).sub(projection.position).normalize();
  return [d.x, d.y, d.z];
}

/**
 * Zooms in to the near bound and back out, returning one message per notch that broke the gate. `bound` names the bound the ray must meet first when
 * the case is there to test that one.
 */
async function zoomInAndOut(page: Page, what: string, bound: 'surface' | 'floor' | 'either' = 'either'): Promise<string[]> {
  const problems: string[] = [];
  const centre = await viewCentre(page);
  // Whole pixels, as the browser delivers the pointer, so the ray rebuilt here is the one the page casts.
  const [x, y] = [Math.round(centre.x), Math.round(centre.y)];
  await page.mouse.move(x, y);
  const start = await camera(page);
  const ray = await pointerRay(page, start, x, y);
  const surface = firstSurface(start.position, ray);
  if (surface === null) return [`${what}: the ray under the pointer meets no surface of the finished model, so there is no stop to check`];
  // How far along the ray the camera may go: to ZOOM.stop before the surface, or to where the ray comes down to the camera floor if that is sooner.
  const toFloor = ray[1] < 0 ? (workspaceGround() + CAMERA_FLOOR - start.position[1]) / ray[1] : Number.POSITIVE_INFINITY;
  const atFloor = toFloor < surface - ZOOM.stop;
  if (bound !== 'either' && atFloor !== (bound === 'floor')) return [`${what}: the ray meets the ${atFloor ? 'camera floor' : 'surface'} first, so this case does not test the ${bound}`];
  const limit = Math.min(surface - ZOOM.stop, toFloor);
  const stop = atFloor ? `where the ray comes down to the camera floor, ${toFloor.toFixed(3)} m along it` : `${String(ZOOM.stop)} m before the first surface ${surface.toFixed(3)} m along the ray under the pointer`;
  const along = (c: Camera): number => (c.position[0] - start.position[0]) * ray[0] + (c.position[1] - start.position[1]) * ray[1] + (c.position[2] - start.position[2]) * ray[2];
  const off = (c: Camera): number => distance(c.position, [start.position[0] + along(c) * ray[0], start.position[1] + along(c) * ray[1], start.position[2] + along(c) * ray[2]]);
  let before = start;
  let atBound = false;
  for (let k = 1; k <= MAX_NOTCHES_IN && !atBound; k += 1) {
    const after = await notch(page, -100);
    const moved = distance(after.position, before.position);
    const left = limit - along(before);
    if (off(after) > 0.01) {
      problems.push(`${what}: notch ${String(k)} in moved the camera ${off(after).toFixed(3)} m off the ray under the pointer`);
      return problems;
    }
    if (along(after) > limit + MM) {
      problems.push(`${what}: notch ${String(k)} in put the camera ${(along(after) - limit).toFixed(3)} m past its stop, ${stop}`);
      return problems;
    }
    if (left <= MM) {
      atBound = true;
      if (moved > MM) problems.push(`${what}: notch ${String(k)} in, at the bound, moved ${moved.toFixed(4)} m`);
    } else if (moved < Math.min(ZOOM.minStep, left) - MM) {
      problems.push(`${what}: notch ${String(k)} in moved ${moved.toFixed(4)} m with ${left.toFixed(3)} m left to the stop (camera-to-target ${radius(before).toFixed(3)} m)`);
      return problems;
    }
    before = after;
  }
  if (!atBound) problems.push(`${what}: ${String(MAX_NOTCHES_IN)} notches in did not reach the stop; ${(limit - along(before)).toFixed(3)} m left to it, ${stop}`);
  for (let k = 1; k <= NOTCHES_OUT; k += 1) {
    const after = await notch(page, 100);
    const moved = distance(after.position, before.position);
    if (moved < ZOOM.minStep - MM) problems.push(`${what}: notch ${String(k)} out moved ${moved.toFixed(4)} m`);
    before = after;
  }
  return problems;
}

test.describe('zoom', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  for (const view of ['aerial-ne', 'front', 'int-grand-stair-west'] as const) {
    test(`from ${view}, every wheel notch moves the camera until it stops in front of a surface, and back out`, async ({ page }) => {
      await open(page, `view=${view}`);
      expect(await zoomInAndOut(page, view, 'surface')).toEqual([]);
    });
  }

  test('after a move by the W key, every wheel notch moves the camera until the bound, and back out', async ({ page }) => {
    await open(page, 'view=front');
    const start = await camera(page);
    await page.getByTestId('canvas').click({ position: { x: 20, y: 20 } });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    await settle(page);
    const moved = await camera(page);
    expect(distance(moved.position, start.position), 'the W key moved the camera').toBeGreaterThan(5);
    // How far W takes the camera depends on the frames in those 400 ms; a long enough move puts the workspace ground under the pointer, past the roofs.
    expect(await zoomInAndOut(page, 'after W')).toEqual([]);
  });

  test('over the park toward the workspace ground, every wheel notch keeps the camera on the ray until the camera floor stops it, and back out', async ({ page }) => {
    await open(page, `cam=${OVER_THE_PARK.join(',')}`);
    expect(await zoomInAndOut(page, 'toward the workspace ground', 'floor')).toEqual([]);
  });

  test('from aerial-ne the zoom out stops at its far bound and the next notch in moves again', async ({ page }) => {
    await open(page, 'view=aerial-ne');
    const centre = await viewCentre(page);
    await page.mouse.move(centre.x, centre.y);
    let before = await camera(page);
    let atBound = false;
    for (let k = 1; k <= 60 && !atBound; k += 1) {
      const after = await notch(page, 100);
      const moved = distance(after.position, before.position);
      if (radius(before) >= ZOOM.maxDistance - MM) {
        atBound = true;
        expect(moved, 'a notch out at the far bound').toBeLessThan(MM);
      } else {
        expect(moved, `notch ${String(k)} out, camera-to-target ${radius(before).toFixed(1)} m`).toBeGreaterThan(ZOOM.minStep - MM);
      }
      before = after;
    }
    expect(atBound, `reached ${String(ZOOM.maxDistance)} m from the target`).toBe(true);
    const back = await notch(page, -100);
    expect(distance(back.position, before.position), 'a notch in from the far bound').toBeGreaterThan(ZOOM.minStep);
  });

  test('zoomed out to the far bound and lowered onto the camera floor by Q, a notch in moves nothing, a notch out moves, and the zoom holds from there', async ({ page }) => {
    await open(page, 'view=aerial-ne');
    const centre = await viewCentre(page);
    const [x, y] = [Math.round(centre.x), Math.round(centre.y)];
    await page.mouse.move(x, y);
    let before = await camera(page);
    for (let k = 1; k <= 60 && radius(before) < ZOOM.maxDistance - MM; k += 1) before = await notch(page, 100);
    expect(radius(before), 'at the far bound').toBeGreaterThan(ZOOM.maxDistance - MM);
    const floored = await lowerOntoFloor(page, x, y);
    expect(radius(floored), 'still at the far bound on the floor').toBeGreaterThan(ZOOM.maxDistance - MM);
    expect(distance((await notch(page, -100)).position, floored.position), 'a notch in, on the floor').toBeLessThan(MM);
    const out = await notch(page, 100);
    expect(distance(out.position, floored.position), 'a notch out from both bounds at once').toBeGreaterThan(ZOOM.minStep - MM);
    expect(await zoomInAndOut(page, 'back from both bounds', 'floor')).toEqual([]);
  });

  test('looking up from the camera floor, a notch out moves nothing, a notch in moves, and the next out comes back onto the floor on the ray', async ({ page }) => {
    await open(page, `cam=${LOOKING_UP.join(',')}`);
    const centre = await viewCentre(page);
    const [x, y] = [Math.round(centre.x), Math.round(centre.y)];
    const floored = await lowerOntoFloor(page, x, y);
    const ray = await pointerRay(page, floored, x, y);
    const off = (c: Camera): number => {
      const along = (c.position[0] - floored.position[0]) * ray[0] + (c.position[1] - floored.position[1]) * ray[1] + (c.position[2] - floored.position[2]) * ray[2];
      return distance(c.position, [floored.position[0] + along * ray[0], floored.position[1] + along * ray[1], floored.position[2] + along * ray[2]]);
    };
    expect(ray[1], 'the ray under the pointer points up').toBeGreaterThan(0.5);
    const stuck = await notch(page, 100);
    expect(distance(stuck.position, floored.position), 'a notch out on the floor, looking up').toBeLessThan(MM);
    const up = await notch(page, -100);
    expect(distance(up.position, floored.position), 'a notch in from the floor').toBeGreaterThan(ZOOM.minStep - MM);
    expect(off(up), 'on the ray').toBeLessThan(0.01);
    const down = await notch(page, 100);
    expect(down.position[1], 'back on the floor').toBeCloseTo(floorY(), 3);
    expect(off(down), 'on the ray').toBeLessThan(0.01);
    expect(distance((await notch(page, 100)).position, down.position), 'a notch out on the floor again').toBeLessThan(MM);
  });

  test('a right-drag that pans the camera under the floor and a wheel notch sent at once leave the view where it looked', async ({ page }) => {
    await open(page, `cam=${UNDER_A_FOOTING.join(',')}`);
    const centre = await viewCentre(page);
    const [x, y] = [Math.round(centre.x), Math.round(centre.y)];
    const floored = await lowerOntoFloor(page, x, y);
    // The drag up and the notch in, sent back to back without waiting on one another.
    const cdp = await page.context().newCDPSession(page);
    const send = (params: Record<string, unknown>): Promise<unknown> => cdp.send('Input.dispatchMouseEvent', params as never);
    await Promise.all([
      send({ type: 'mousePressed', x, y, button: 'right', buttons: 2, clickCount: 1 }),
      send({ type: 'mouseMoved', x, y: y - 100, button: 'right', buttons: 2 }),
      send({ type: 'mouseWheel', x, y: y - 100, deltaX: 0, deltaY: -100 }),
      send({ type: 'mouseReleased', x, y: y - 100, button: 'right', buttons: 0, clickCount: 1 }),
    ]);
    await cdp.detach();
    // The drag's pan runs on over the frames after it (the controls' damping); wait until the camera has stopped.
    const after = await settledCamera(page);
    const view = (c: Camera): Vector3 => new Vector3(...c.target).sub(new Vector3(...c.position)).normalize();
    expect((view(after).angleTo(view(floored)) * 180) / Math.PI, 'degrees the view turned').toBeLessThan(0.01);
    expect(after.position[1], 'on the floor or over it').toBeGreaterThan(floorY() - 1e-4);
  });

  test('a preset chosen after zooming lands exactly, so the zoom leaves no state behind', async ({ page }) => {
    await open(page, 'view=front');
    const reference = await camera(page);
    const centre = await viewCentre(page);
    await page.mouse.move(centre.x, centre.y);
    for (let k = 0; k < 10; k += 1) await notch(page, -100);
    await choosePreset(page, 'front');
    await settle(page);
    const landed = await camera(page);
    expect(distance(landed.position, reference.position)).toBeLessThan(MM);
    expect(distance(landed.target, reference.target)).toBeLessThan(MM);
  });
});
