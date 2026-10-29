/**
 * The doors through real input (docs/design/spec.md, Doors): from the plaza, walked up the front steps by held keys and turned by drags to look at a leaf
 * of the entrance's middle doorway within 2 m, the prompt under the crosshair says "E Open"; E swings the doorway's leaves into the building, away from
 * the walker, in canvas pixels and in `window.__met.doors`; looking at an open leaf it says "E Close", and a click while the pointer is locked closes it;
 * the timeline's scrubber, moved into the doors' step and back, draws the closed leaf and then the door open again at once (read where the render drew
 * them, `perf.lastDrawn.doors`), and taken back before the step, closed (the build replay opened by the Build menu while walking, its bar folded and
 * unfolded by its Timeline button); a link door says "Locked" and stays shut by E and by a click; `doors=open` and `doors=closed` under `shot=1` stand at their angle in the
 * first frame drawn, as its render drew them, the doors set before the walker is placed and that before the first frame (the page's marks, read beside a
 * probe of the first drawn frame), and the captures stay still after ready; the prompt keeps to its band under the crosshair at 1280×720 and 390×844;
 * and with the look target on, facing into the Great Hall from the landing while the doorway opens and closes, standing and then walking to and fro
 * before it through two full open and close cycles (W and S held in turn, the eye moving), and in the hall facing out while it closes and opens, the
 * slowest frame of each swing, and of the walk, takes under 16.7 ms of work, and a GPU-synced render facing into the hall through the open doorway under
 * 16.7 ms (review 0, F9; review 5, F23 and F24; review 8, F32). The entrance's leaves are solid (Doors: Walking), so the walk into the hall opens the
 * door by E first, as a visitor does.
 * Bound: pointer lock is not available headless, so for the locked click a probe makes the page see its canvas locked (it answers
 * `document.pointerLockElement` with the canvas and sends `pointerlockchange`) and the click itself is the real mouse's. A frame's work is timed by a
 * probe that wraps `requestAnimationFrame` before the page loads and times each callback, the page's frame among them; GPU time is the page's own
 * benchmark. The first frame drawn is read by a probe that wraps `requestAnimationFrame` and, writing nothing, reads `perf.lastDrawn` after the callback
 * that drew it: the doors as the page read them back from the meshes right after that render. Pixel checks compare coarse luminance grids: they prove
 * the drawing changed where the door is, not that it is right. Walking to and fro, the walker turns round at least twice a cycle, where its speed
 * passes through nought, so a frame there may move the eye under 0.5 mm. The slowest frame is that of every callback timed, the test's own reads of
 * `window.__met` among them, so it bounds the page's own frame from above (a probe of the page's callback alone, 2026-10-27: the walked cycles' page
 * frames took 3.4 ms at the median and 9.1 ms at most, the slowest callback of all).
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { changedCells, facts, lumaGrid, open, openReplay, press, settle, watchErrors } from './helpers.js';
import { along, doorFacts, doorIs, entranceLeaves, face, legs, looksAt, MIDDLE_DOOR, MINUS_Z, record, still, toward, walk, walking } from './route-walk.js';
import type { DoorFact, Facing, Sample } from './route-walk.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';

/**
 * The entrance's doors' leaves stand in the plane Z −1.724, behind the screen's columns (src/model/hunt/arches.ts `ENTRANCE_DOOR_Z`, their front face,
 * less 0.07); the middle door spans X −0.746..0.746, its right leaf X 0.004..0.652, which open into the building lies along X 0.582..0.652.
 */
const DOOR_Z = -1.724;
const MIDDLE = MIDDLE_DOOR;
/** Where the plaza spawn stands (src/walk/spawns.ts) and the north link's door (src/model/mmw/facade.ts: X 69, its leaves at Z −2.38). */
const PLAZA: readonly [number, number] = [0, 24.46];
const LINK_X = 69;
/** The prompt's band about the crosshair, agreed with M3b's label card (docs/design/spec.md, Doors: Use). */
const BAND = { half: 160, above: 8, below: 80 } as const;

/** Tilts the walker's view to look at height `y` at the plan point (x, z) with a vertical drag: down for down, `LOOK_PER_PIXEL` a pixel. */
async function tiltToward(page: Page, x: number, y: number, z: number): Promise<void> {
  const now = await still(page);
  const pitch = Math.asin(now.look[1]);
  const want = Math.atan2(y - now.eye[1], Math.hypot(x - now.eye[0], z - now.eye[2]));
  const dy = Math.round((pitch - want) / LOOK_PER_PIXEL);
  if (Math.abs(dy) < CLICK_SLOP + 1) return;
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('The canvas has no box.');
  const cx = canvas.x + canvas.width / 2;
  const cy = canvas.y + canvas.height / 2 - dy / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let k = 1; k <= 10; k += 1) await page.mouse.move(cx, cy + (dy * k) / 10);
  await page.mouse.up();
}

/** The prompt keeps to its band under the crosshair, inside the viewport, apart from the crosshair. */
async function expectPromptInBand(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  const box = await page.getByTestId('door-prompt').boundingBox();
  const cross = await page.getByTestId('crosshair').boundingBox();
  if (viewport === null || box === null || cross === null) throw new Error('No viewport, prompt or crosshair box.');
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const where = `prompt (${box.x.toFixed(1)}, ${box.y.toFixed(1)}) ${box.width.toFixed(1)}×${box.height.toFixed(1)} at ${String(viewport.width)}×${String(viewport.height)}`;
  expect(box.x >= cx - BAND.half - 0.5 && box.x + box.width <= cx + BAND.half + 0.5, `${where}: across, within the band`).toBe(true);
  expect(box.y >= cy - BAND.above - 0.5 && box.y + box.height <= cy + BAND.below + 0.5, `${where}: down, within the band`).toBe(true);
  expect(box.y >= cross.y + cross.height - 0.5, `${where}: under the crosshair`).toBe(true);
  expect(Math.abs(box.x + box.width / 2 - cx), `${where}: centred`).toBeLessThan(1);
  const clipped = await page.getByTestId('door-prompt').evaluate((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1);
  expect(clipped, `${where}: its text unclipped`).toBe(false);
}

/**
 * Walks from the plaza spawn, by the Walk toggle and held keys, up the front steps to stand on the axis 1.3 m before the doors: the middle of where the
 * open right leaf, looked at 0.3 m behind the doors, lies within a door's 2 m reach (up to 1.62 m out) and the ray through the closed leaf's place at
 * X 0.35 passes the open leaf (from 1.08 m out; nearer, it meets the leaf 1.76 m off and the door stays the look target).
 */
async function toTheEntrance(page: Page): Promise<Sample> {
  await press(page, 'walk-toggle');
  await walking(page);
  const samples: Sample[] = [];
  return walk(page, 'up to the doors', legs([PLAZA, [0, DOOR_Z + 1.3]], MINUS_Z), samples);
}

/**
 * A click with the real mouse at the canvas's centre while the pointer is locked. The mouse goes there first (no button down, so the view does not turn);
 * then a probe makes the page see its canvas locked (pointer lock is not available headless), as after a click asked for it, and the button goes down and
 * up where the mouse stands, so the locked look, which turns by the mouse's movement, does not turn either.
 */
async function lockedClick(page: Page): Promise<void> {
  const canvas = await page.getByTestId('canvas').boundingBox();
  if (canvas === null) throw new Error('The canvas has no box.');
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.evaluate(() => {
    const element = document.querySelector('canvas');
    Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get: () => element });
    document.dispatchEvent(new Event('pointerlockchange'));
  });
  await page.waitForFunction(() => window.__met?.walk.pointerLocked === true);
  await page.mouse.down();
  await page.mouse.up();
}

/**
 * Waits until the middle door is `state` ('opening' or 'closing') and has turned off `from` degrees, at most 1 s. Walking, a swing moves in the walker's
 * physics steps of 1/120 s (Doors: Walking), so a frame drawn right after E may hold none and show the door begun at its start, at rest as its swing
 * eases out of it.
 */
async function underWay(page: Page, state: 'opening' | 'closing', from: number): Promise<DoorFact> {
  await page.waitForFunction(([id, s, a]) => {
    const door = window.__met?.doors.find((d) => d.id === id);
    return door?.state === s && door.angle !== a;
  }, [MIDDLE, state, from] as const, { timeout: 1000 });
  const found = await doorFacts(page, MIDDLE);
  if (found === undefined) throw new Error(`No door ${MIDDLE} in window.__met.doors.`);
  return found;
}

/** How far the walking eye may be from the door it opens or closes, by its look target (src/walk/look.ts `LOOK_REACH`), less what a walk back coasts. */
const WALK_REACH = 1.7;
/** How near the closed leaves' front face the walking eye turns back: with what a walk coasts (0.14 m), the body keeps about 0.35 m off them. */
const WALK_NEAR = 0.85;

/**
 * Walks to and fro along the line the walker faces, with S and W held in turn, from where its look target, the middle door, lies WALK_REACH away to
 * WALK_NEAR before the closed leaves' front face; each key is pressed before the other goes up, so one is always held. Once the walker moves, E opens the
 * door, and at each turn after the door has come to rest where the last E sent it, E sends it on: open, closed, open, closed. Returns the page's clock when
 * it first tries E and when the door was seen closed at the last, the walk facts of every frame between, the page's drawn frames over that time and the turns
 * at which the door stood at rest out of sight; the walker then walks on to where it began and lets go. Bound: the line must pass through the closed leaf
 * and the open leaf it looks at, which the caller chooses. E is pressed only while the look target is the door, so slow frames, which carry the walker
 * past its turns, delay the cycles and leave the verdict to the frames' times; after 60 turns it fails, saying at how many the door was out of sight.
 */
async function doorCycles(page: Page, front: number): Promise<{ from: number; to: number; frames: Sample[]; drawn: number; unseen: number }> {
  const line = await still(page);
  const level = Math.hypot(line.look[0], line.look[2]);
  const axis: Facing = [line.look[0] / level, line.look[2] / level];
  const start = along(line.eye, axis);
  const swings = ['open', 'closed', 'open', 'closed'] as const;
  let next = 0;
  let unseen = 0;
  /** E, if the look target is the middle door: the door starts its next swing at once. Counts a turn where it is not (`unseen`). */
  const use = async (): Promise<void> => {
    const target = await page.evaluate(() => window.__met?.walk.target ?? null);
    if (target?.kind !== 'door' || target.id !== MIDDLE) {
      unseen += 1;
      return;
    }
    await page.keyboard.press('KeyE');
    await doorIs(page, MIDDLE, swings[next] === 'open' ? 'opening' : 'closing', 1000);
    next += 1;
  };
  /** Waits in the page, at every frame, until it is time to turn: walking back, the door WALK_REACH away or out of sight; forward, WALK_NEAR before the leaves. */
  const turn = (back: boolean): Promise<boolean> =>
    page.waitForFunction(
      ([away, reach, near]) => {
        const walk = window.__met?.walk;
        if (walk?.eye == null) return false;
        return away ? walk.target === null || walk.target.distance >= reach : walk.eye[2] <= near;
      },
      [back, WALK_REACH, front + WALK_NEAR] as const,
      { polling: 'raf', timeout: 3000 },
    ).then(
      () => true,
      () => false,
    );
  let held: 'KeyS' | 'KeyW' = 'KeyS';
  await page.keyboard.down(held);
  await page.waitForFunction(([ax, az, at]) => {
    const eye = window.__met?.walk.eye;
    return eye != null && eye[0] * ax + eye[2] * az < at;
  }, [axis[0], axis[1], start - 0.05] as const, { polling: 'raf', timeout: 2000 });
  await record(page);
  const from = await page.evaluate(() => performance.now());
  const firstDrawn = await page.evaluate(() => window.__met?.perf.lastDrawn.frame ?? 0);
  await use();
  for (let turns = 0; ; turns += 1) {
    const back: boolean = held === 'KeyS';
    if (!(await turn(back))) throw new Error(`Walking ${back ? 'back' : 'forward'} through the door cycles (${String(next)} of ${String(swings.length)} begun), the walker came to no turn within 3 s.`);
    const other: 'KeyS' | 'KeyW' = back ? 'KeyW' : 'KeyS';
    await page.keyboard.down(other);
    await page.keyboard.up(held);
    held = other;
    const state = (await doorFacts(page, MIDDLE))?.state;
    if (next === 0 || state === swings[next - 1]) {
      if (next === swings.length) break;
      await use();
    }
    if (turns > 60) throw new Error(`Sixty turns walking to and fro, and the door has come through only ${String(next)} of ${String(swings.length)} swings; at ${String(unseen)} turns it stood at rest out of the look target's sight.`);
  }
  const to = await page.evaluate(() => performance.now());
  const drawn = (await page.evaluate(() => window.__met?.perf.lastDrawn.frame ?? 0)) - firstDrawn;
  const frames = await record(page);
  await page.waitForFunction(([ax, az, at, sense]) => {
    const eye = window.__met?.walk.eye;
    return eye != null && sense * (eye[0] * ax + eye[2] * az - at) >= 0;
  }, [axis[0], axis[1], start, held === 'KeyW' ? 1 : -1] as const, { polling: 'raf', timeout: 3000 });
  await page.keyboard.up(held);
  await still(page);
  return { from, to, frames, drawn, unseen };
}

/** Door `id` as the last frame drew it (`perf.lastDrawn.doors`): its first leaf's angle from its stand-in's matrix, or null while the timeline's closed leaves are drawn. */
const drawnAngle = (page: Page, id: string): Promise<number | null | undefined> => page.evaluate((door) => window.__met?.perf.lastDrawn.doors.find((d) => d.id === door)?.angle, id);

/** Moves the scrubber's thumb by mouse to timeline position `t`, as a person drags it. */
async function scrubTo(page: Page, t: number, n: number): Promise<void> {
  const box = await page.getByTestId('scrubber').boundingBox();
  if (box === null) throw new Error('The scrubber has no box.');
  const thumb = 8;
  const value = Number(await page.getByTestId('scrubber').inputValue());
  const xOf = (v: number): number => box.x + thumb + ((box.width - 2 * thumb) * v) / n;
  const y = box.y + box.height / 2;
  await page.mouse.move(xOf(value), y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k += 1) await page.mouse.move(xOf(value) + ((xOf(t) - xOf(value)) * k) / 8, y);
  await page.mouse.up();
}

test.describe('the doors', () => {
  test('the entrance: E Open, E swings it into the building; E Close on an open leaf, a locked click closes it; the scrubber shows the closed leaf, then the door as it was', async ({ page }) => {
    // 10 to 12 s here (three full runs, 2026-10-27; 15.4 s in one that took 20.5 min for 13.6); four times the slowest of those for a loaded machine.
    test.setTimeout(60_000);
    const errors = watchErrors(page);
    const f = await open(page, '');
    expect((await facts(page)).doors.map((d) => [d.id, d.state, d.built])).toEqual(expect.arrayContaining([[MIDDLE, 'closed', true]]));
    const at = await toTheEntrance(page);
    expect(at.eye[2], 'standing before the doors').toBeGreaterThan(DOOR_Z + 0.6);
    expect(at.eye[2]).toBeLessThan(DOOR_Z + 1.9);
    // Straight ahead the eye looks between the leaves of a pair; a little to the right it meets the right leaf.
    await face(page, toward(at.eye, 0.35, DOOR_Z));
    await looksAt(page, MIDDLE, 'E Open');
    await expectPromptInBand(page);
    const closed = await lumaGrid(page);
    await page.keyboard.press('KeyE');
    expect((await underWay(page, 'opening', 0)).angle, 'under way').toBeGreaterThan(0);
    const opened = await doorIs(page, MIDDLE, 'open');
    expect(opened.angle, 'a quarter turn into the building, away from the walker in front').toBe(90);
    const open1 = await lumaGrid(page);
    expect(changedCells(closed, open1).length, 'cells that changed as the leaves swung away').toBeGreaterThan(3);
    // Where the closed leaf stood the eye now looks through: no door there.
    await page.waitForFunction(() => window.__met?.walk.target === null, undefined, { timeout: 3000 });
    await expect(page.getByTestId('door-prompt')).toBeHidden();
    // The right leaf now stands against its jamb, back from the doorway: looked at there, it closes.
    const eye = (await still(page)).eye;
    await face(page, toward(eye, 0.62, DOOR_Z - 0.3));
    await looksAt(page, MIDDLE, 'E Close');
    // Scrubbed into the doors' step, the timeline's closed leaf stands there and the door keeps its state; scrubbed back to the end, it stands open at once.
    // The build replay, closed as the page opened, is opened by the Build menu, which shows its whole bar.
    await openReplay(page);
    const step = f.steps.findIndex((s) => s.id === 'hunt-windows');
    await scrubTo(page, step + 0.5, f.n);
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === false, MIDDLE);
    expect(await doorFacts(page, MIDDLE)).toMatchObject({ state: 'open', angle: 90, built: false });
    await settle(page);
    expect(await drawnAngle(page, MIDDLE), 'drawn: the timeline’s closed leaves, not a stand-in').toBeNull();
    await press(page, 'btn-end');
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === true, MIDDLE);
    expect(await doorFacts(page, MIDDLE), 'open again at once, no swing').toMatchObject({ state: 'open', angle: 90 });
    await settle(page);
    expect(await drawnAngle(page, MIDDLE), 'drawn open, by the stand-ins').toBeCloseTo(90, 1);
    await press(page, 'bar-toggle');
    // A click while the pointer is locked closes it.
    const before = await lumaGrid(page);
    await lockedClick(page);
    expect((await underWay(page, 'closing', 90)).angle).toBeLessThan(90);
    expect((await doorIs(page, MIDDLE, 'closed')).angle).toBe(0);
    expect(changedCells(before, await lumaGrid(page)).length, 'cells that changed as the leaf closed').toBeGreaterThan(3);
    // Closed, the right leaf stands across the same ray again: E opens it; taken back before the doors' step and built again, it is closed, its default.
    await looksAt(page, MIDDLE, 'E Open');
    await page.keyboard.press('KeyE');
    await doorIs(page, MIDDLE, 'open');
    await press(page, 'bar-toggle');
    await scrubTo(page, step - 0.5, f.n);
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === false, MIDDLE);
    expect(await doorFacts(page, MIDDLE), 'the step taken away: reset').toMatchObject({ state: 'closed', angle: 0, built: false });
    await press(page, 'btn-end');
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === true, MIDDLE);
    expect(await doorFacts(page, MIDDLE), 'built again: closed').toMatchObject({ state: 'closed', angle: 0 });
    errors.expectClean();
  });

  test('a link door says Locked and stays shut by E and by a locked click', async ({ page }) => {
    // About 22 s here (21.4 to 22.6 s in three full runs, 2026-10-27), most of it the 94 m walk along the plaza to the link door; it passed 30 s in a full
    // run that took 20.5 min for 13.6 (verify, 795956f). Four times the slowest green run for a loaded machine.
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await open(page, '');
    await press(page, 'walk-toggle');
    await walking(page);
    const at = await walk(page, 'to the north link door', legs([PLAZA, [LINK_X, PLAZA[1]], [LINK_X, -0.9]], MINUS_Z), []);
    await face(page, toward(at.eye, LINK_X + 0.4, -2.4));
    // The plaza spawn looks up 8°: down to the leaves' middle, under their top at 2.25 m.
    await tiltToward(page, LINK_X + 0.4, 1.3, -2.4);
    await looksAt(page, 'mmw-north-link', 'Locked');
    await settle(page);
    const shut = await lumaGrid(page);
    await page.keyboard.press('KeyE');
    await lockedClick(page);
    await settle(page);
    await settle(page);
    expect(await doorFacts(page, 'mmw-north-link')).toEqual({ id: 'mmw-north-link', state: 'closed', angle: 0, locked: true, built: true });
    expect(changedCells(shut, await lumaGrid(page)), 'nothing moved').toEqual([]);
    errors.expectClean();
  });

  test('doors=open and doors=closed under shot=1 stand at their angle from the first frame, before the walker is placed, and the capture stays still', async ({ page }) => {
    // A read-only probe from before the page's scripts run: once the page has drawn its first frame, the doors as that frame's render drew them, which
    // the page copies right after each render (`perf.lastDrawn.doors`, read back from the stand-ins' matrices and the closed leaves' layers), so a change
    // made later in the same callback is not taken for what was drawn (review 5, F24; review 8, F32).
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      const w = window as unknown as { firstDrawn?: { at: number; frame: number; doors: unknown } };
      window.requestAnimationFrame = (callback) => raf((now) => {
        callback(now);
        if (w.firstDrawn !== undefined) return;
        const drawn = window.__met?.perf.lastDrawn;
        if (drawn !== undefined && drawn.frame >= 1) w.firstDrawn = { at: performance.now(), frame: drawn.frame, doors: JSON.parse(JSON.stringify(drawn.doors)) as unknown };
      });
    });
    type Drawn = { id: string; angle: number | null }[];
    /** Angles to 0.01°, as float32 matrices give them back. */
    const angles = (doors: Drawn): (number | null)[] => doors.map((d) => (d.angle === null ? null : Math.round(d.angle * 100) / 100 + 0));
    /** The first drawn frame's number, time and doors as drawn, and the page's own marks of the door set-up and the walk placement, in their order. */
    const firstFrame = (): Promise<{ at: number; frame: number; doors: Drawn; marks: string[]; doorsSet: number | null; walkPlaced: number | null }> =>
      page.evaluate(() => {
        const w = window as unknown as { firstDrawn?: { at: number; frame: number; doors: { id: string; angle: number | null }[] } };
        const mark = (name: string): number | null => performance.getEntriesByName(name)[0]?.startTime ?? null;
        const first = w.firstDrawn ?? { at: Number.NaN, frame: 0, doors: [] };
        return { ...first, marks: performance.getEntriesByType('mark').map((e) => e.name).filter((n) => n === 'met:doors-set' || n === 'met:walk-placed'), doorsSet: mark('met:doors-set'), walkPlaced: mark('met:walk-placed') };
      });
    const lastDrawn = (): Promise<Drawn> => page.evaluate(() => (window.__met?.perf.lastDrawn.doors ?? []).map((d) => ({ id: d.id, angle: d.angle })));
    const cam = 'cam=1.5,5.2,9,0,6.4,-1.2';
    const grids: number[][] = [];
    for (const state of ['closed', 'open'] as const) {
      const f = await open(page, `shot=1&${cam}&doors=${state}`);
      const hunt = f.doors.filter((d) => d.id.startsWith('hunt-entrance-'));
      expect(hunt.map((d) => [d.state, d.angle]), `doors=${state}`).toEqual(hunt.map(() => (state === 'open' ? ['open', 90] : ['closed', 0])));
      expect(f.doors.filter((d) => d.locked).map((d) => [d.state, d.angle]), 'locked doors stay shut').toEqual(f.doors.filter((d) => d.locked).map(() => ['closed', 0]));
      // As drawn at ready: the entrance's stand-ins at the angle asked, the locked doors' closed leaves (null).
      const drawnAtReady = await lastDrawn();
      expect(drawnAtReady.map((d) => d.id), 'every door drawn, in step order').toEqual(f.doors.map((d) => d.id));
      expect(angles(drawnAtReady), `doors=${state}: as drawn at ready`).toEqual(f.doors.map((d) => (d.locked ? null : state === 'open' ? 90 : 0)));
      const first = await firstFrame();
      expect(first.frame, 'the probe read the first frame drawn').toBe(1);
      expect(angles(first.doors), `doors=${state}: the first frame drew the doors as at ready`).toEqual(angles(drawnAtReady));
      expect(first.doorsSet ?? Number.POSITIVE_INFINITY, 'the doors set before the first frame').toBeLessThan(first.at);
      const ready = await lumaGrid(page);
      for (let k = 0; k < 15; k += 1) await settle(page);
      expect(changedCells(ready, await lumaGrid(page)), `doors=${state}: still after ready`).toEqual([]);
      grids.push(ready);
    }
    expect(changedCells(grids[0] ?? [], grids[1] ?? []).length, 'open and closed differ on the canvas').toBeGreaterThan(3);
    // Walking under shot=1: the doors are set, then the walker is placed, then the first frame is drawn with the doors open.
    const w = await open(page, 'shot=1&walk=1&spawn=plaza&doors=open');
    expect(w.walk.eye, 'the walker placed by the first ready frame').not.toBeNull();
    expect(w.doors.filter((d) => d.id.startsWith('hunt-entrance-')).every((d) => d.state === 'open')).toBe(true);
    const walked = await firstFrame();
    expect(walked.marks, 'the page marks the door set-up, then the walk placement').toEqual(['met:doors-set', 'met:walk-placed']);
    expect(walked.doorsSet ?? Number.POSITIVE_INFINITY, 'the doors set before the walker is placed').toBeLessThanOrEqual(walked.walkPlaced ?? Number.NEGATIVE_INFINITY);
    expect(walked.walkPlaced ?? Number.POSITIVE_INFINITY, 'and the walker placed before the first frame').toBeLessThan(walked.at);
    expect(walked.frame, 'the probe read the first frame drawn').toBe(1);
    expect(angles(walked.doors.filter((d) => d.id.startsWith('hunt-entrance-'))), 'the first frame drew the entrance’s doors open').toEqual([90, 90, 90]);
    // Any other value warns and leaves the doors closed.
    const bad = await open(page, 'shot=1&doors=ajar');
    expect(bad.warnings).toContain('Query parameter doors="ajar" is not a door state; use doors=open or doors=closed. It is ignored.');
    expect(bad.doors.every((d) => d.state === 'closed')).toBe(true);
  });

  test.describe('at 390×844', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('the prompt keeps to its band under the crosshair', async ({ page }) => {
      const errors = watchErrors(page);
      await open(page, '');
      const at = await toTheEntrance(page);
      await face(page, toward(at.eye, 0.35, DOOR_Z));
      await looksAt(page, MIDDLE, 'E Open');
      await expectPromptInBand(page);
      await page.keyboard.press('KeyE');
      await doorIs(page, MIDDLE, 'open');
      errors.expectClean();
    });
  });

  test('facing into the Great Hall, standing and walking through two door cycles, and in it facing out, the slowest frame of a swing takes under 16.7 ms of work (review 0, F9; review 5, F23)', async ({ page }) => {
    // The walk to the doors, six swings, two cycles walked and the walk into the hall: about 20 s here.
    test.setTimeout(120_000);
    // Times every requestAnimationFrame callback, the page's frame among them, from before the page's own scripts run.
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      const log: [number, number][] = [];
      (window as unknown as { frameWork: [number, number][] }).frameWork = log;
      window.requestAnimationFrame = (callback) => raf((now) => {
        const start = performance.now();
        callback(now);
        log.push([start, performance.now() - start]);
      });
    });
    /** The work of every frame timed between the page's clock readings `from` and `to`, milliseconds. */
    const work = (from: number, to: number): Promise<number[]> =>
      page.evaluate(([a, b]) => (window as unknown as { frameWork: [number, number][] }).frameWork.filter(([t]) => t >= a && t <= b).map(([, ms]) => ms), [from, to] as const);
    /** Presses E and times every frame until the middle doorway stands `state`: the slowest frame's work, from more than 20 frames, under 16.7 ms. */
    const timedSwing = async (state: string, where: string): Promise<DoorFact> => {
      const from = await page.evaluate(() => performance.now());
      await page.keyboard.press('KeyE');
      const door = await doorIs(page, MIDDLE, state);
      const to = await page.evaluate(() => performance.now());
      const frames = await work(from, to);
      const slowest = Math.max(...frames);
      console.log(`a swing ${where}: ${String(frames.length)} frames, slowest ${slowest.toFixed(2)} ms of work`);
      expect(frames.length, `${where}: frames timed over the swing`).toBeGreaterThan(20);
      expect(slowest, `${where}: the slowest frame of the swing`).toBeLessThan(16.7);
      return door;
    };
    const errors = watchErrors(page);
    await open(page, '');
    // On the landing, facing into the Great Hall through the doorway, its hall in view: open, then close by the open leaf, each swing timed.
    const at = await toTheEntrance(page);
    await face(page, toward(at.eye, 0.35, DOOR_Z));
    await looksAt(page, MIDDLE, 'E Open');
    expect((await timedSwing('open', 'opening, facing into the Great Hall')).angle, 'into the building, away from the walker').toBe(90);
    // A GPU-synced render facing into the hall through the open doorway, its leaves drawn open by the layer, with a shadow pass on every frame: more than
    // a swing asks, since the entrance's leaves cast no shadow and a swing's frames redraw none (Doors: The layer).
    const gpu = await page.evaluate(() => window.__met?.benchmark(30) ?? Number.NaN);
    console.log(`render with GPU sync and a shadow pass, facing into the hall through the open doorway: ${gpu.toFixed(2)} ms`);
    expect(gpu).toBeLessThan(16.7);
    await face(page, toward(at.eye, 0.62, DOOR_Z - 0.3));
    await looksAt(page, MIDDLE, 'E Close');
    expect((await timedSwing('closed', 'closing, facing into the Great Hall')).angle).toBe(0);
    // Walking: to and fro on this line of sight, which meets the right leaf closed and open, through two full cycles of the door. Every frame from the
    // first E to the last close walks (W or S held, the eye moving), finds the look target and renders the hall through the doorway.
    const cycles = await doorCycles(page, entranceLeaves().front);
    const walkWork = await work(cycles.from, cycles.to);
    const slowestWalking = Math.max(...walkWork);
    const steps = cycles.frames.slice(1).map((s, i) => Math.hypot(...s.eye.map((c, k) => c - (cycles.frames[i]?.eye[k] ?? Number.NaN))));
    const moving = steps.filter((d) => d > 5e-4).length;
    const metres = steps.reduce((sum, d) => sum + d, 0);
    console.log(`two door cycles walked, facing into the Great Hall: ${String(cycles.drawn)} frames drawn in ${((cycles.to - cycles.from) / 1000).toFixed(2)} s, the eye moving in ${String(moving)} of ${String(steps.length)}, ${metres.toFixed(2)} m walked, the door out of sight at rest at ${String(cycles.unseen)} turns; ${String(walkWork.length)} callbacks timed, slowest ${slowestWalking.toFixed(2)} ms of work`);
    expect(slowestWalking, 'the slowest walking frame through two door cycles').toBeLessThan(16.7);
    expect(steps.length, 'walking frames recorded through the cycles').toBeGreaterThan(120);
    // Where the walk turns round its speed passes through nought, so a frame or so a turn moves the eye less than 0.5 mm (Bound, in the header).
    expect(moving / steps.length, 'the share of those frames in which the eye moved more than 0.5 mm').toBeGreaterThan(0.95);
    expect(metres, 'metres walked through the cycles').toBeGreaterThan(3);
    // Opened by E (its leaves are solid), through the doorway into the entrance bay; there, turned back to the doors, in the hall facing out: closed by
    // its open leaf, then opened out toward the plaza, each swing timed.
    await looksAt(page, MIDDLE, 'E Open');
    await page.keyboard.press('KeyE');
    await doorIs(page, MIDDLE, 'open');
    const ahead = await face(page, 0);
    const inside = await walk(page, 'into the hall', legs([[ahead.eye[0], ahead.eye[2]], [ahead.eye[0], DOOR_Z - 1.4]], MINUS_Z), []);
    expect(inside.eye[2], 'inside, behind the doors').toBeLessThan(DOOR_Z - 0.6);
    await face(page, toward(inside.eye, 0.62, DOOR_Z - 0.3));
    await looksAt(page, MIDDLE, 'E Close');
    expect((await timedSwing('closed', 'closing, in the Great Hall facing out')).angle).toBe(0);
    await face(page, toward(inside.eye, 0.35, DOOR_Z));
    await looksAt(page, MIDDLE, 'E Open');
    expect((await timedSwing('open', 'in the Great Hall, facing out')).angle, 'away from the walker inside: out toward the plaza').toBe(-90);
    errors.expectClean();
  });
});
