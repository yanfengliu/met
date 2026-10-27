/**
 * The doors through real input (docs/design/spec.md, Doors): from the plaza, walked up the front steps by held keys and turned by drags to look at a leaf
 * of the entrance's middle doorway within 2 m, the prompt under the crosshair says "E Open"; E swings the doorway's leaves into the building, away from
 * the walker, in canvas pixels and in `window.__met.doors`; looking at an open leaf it says "E Close", and a click while the pointer is locked closes it;
 * the timeline's scrubber, moved into the doors' step and back, shows the closed leaf and then the door open again at once, and taken back before the
 * step, closed; a link door says "Locked" and stays shut by E and by a click; `doors=open` and `doors=closed` under `shot=1` stand at their angle in the
 * first frame drawn, as its render drew them, the doors set before the walker is placed and that before the first frame (the page's marks, read beside a
 * probe of the first drawn frame), and the captures stay still after ready; the prompt keeps to its band under the crosshair at 1280×720 and 390×844;
 * and with the look target on, facing into the Great Hall from the landing while the doorway opens and closes, and in the hall facing out while it
 * opens, the slowest frame of each swing takes under 16.7 ms of work, and a GPU-synced render facing into the hall through the open doorway under
 * 16.7 ms (review 0, F9; review 5, F23 and F24; review 8, F32).
 * Bound: pointer lock is not available headless, so for the locked click a probe makes the page see its canvas locked (it answers
 * `document.pointerLockElement` with the canvas and sends `pointerlockchange`) and the click itself is the real mouse's. A frame's work is timed by a
 * probe that wraps `requestAnimationFrame` before the page loads and times each callback, the page's frame among them; GPU time is the page's own
 * benchmark. The first frame drawn is read by a probe that wraps `requestAnimationFrame` and, writing nothing, reads `perf.lastDrawn` after the callback
 * that drew it: the doors as the page read them back from the meshes right after that render. Pixel checks compare coarse luminance grids: they prove
 * the drawing changed where the door is, not that it is right.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { changedCells, facts, lumaGrid, open, press, settle, watchErrors } from './helpers.js';
import { face, legs, MINUS_Z, still, walk, walking } from './route-walk.js';
import type { Sample } from './route-walk.js';
import { CLICK_SLOP, LOOK_PER_PIXEL } from '../../src/walk/walk-mode.js';

/**
 * The entrance's doors' leaves stand in the plane Z −1.724, behind the screen's columns (src/model/hunt/arches.ts `ENTRANCE_DOOR_Z`, their front face,
 * less 0.07); the middle door spans X −0.746..0.746, its right leaf X 0.004..0.652, which open into the building lies along X 0.582..0.652.
 */
const DOOR_Z = -1.724;
const MIDDLE = 'hunt-entrance-middle';
/** Where the plaza spawn stands (src/walk/spawns.ts) and the north link's door (src/model/mmw/facade.ts: X 69, its leaves at Z −2.38). */
const PLAZA: readonly [number, number] = [0, 24.46];
const LINK_X = 69;
/** The prompt's band about the crosshair, agreed with M3b's label card (docs/design/spec.md, Doors: Use). */
const BAND = { half: 160, above: 8, below: 80 } as const;

type Door = NonNullable<Awaited<ReturnType<typeof doorFacts>>>;

async function doorFacts(page: Page, id: string): Promise<{ id: string; state: string; angle: number; locked: boolean; built: boolean } | undefined> {
  return page.evaluate((door) => window.__met?.doors.find((d) => d.id === door), id);
}

/** Waits until door `id` is in `state`, at most `ms`. */
async function doorIs(page: Page, id: string, state: string, ms = 4000): Promise<Door> {
  await page.waitForFunction(([door, s]) => window.__met?.doors.find((d) => d.id === door)?.state === s, [id, state] as const, { timeout: ms });
  const found = await doorFacts(page, id);
  if (found === undefined) throw new Error(`No door ${id} in window.__met.doors.`);
  return found;
}

/** The yaw that faces the plan point (x, z) from the eye (src/walk/walker.ts: yaw 0 looks toward −Z, growing to the left). */
const toward = (eye: Vec3, x: number, z: number): number => Math.atan2(-(x - eye[0]), -(z - eye[2]));

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

/** Waits until the look target is door `id` and the prompt says `text`. */
async function looksAt(page: Page, id: string, text: string): Promise<void> {
  await page.waitForFunction((door) => window.__met?.walk.target?.kind === 'door' && window.__met.walk.target.id === door, id, { timeout: 3000 });
  await expect(page.getByTestId('door-prompt')).toHaveText(text);
  await expect(page.getByTestId('crosshair')).toHaveAttribute('data-target', 'door');
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

/** Walks from the plaza spawn, by the Walk toggle and held keys, up the front steps to stand on the axis 1.3 m before the doors. */
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
    expect((await doorIs(page, MIDDLE, 'opening', 1000)).angle, 'under way').toBeGreaterThan(0);
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
    await press(page, 'bar-toggle');
    const step = f.steps.findIndex((s) => s.id === 'hunt-windows');
    await scrubTo(page, step + 0.5, f.n);
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === false, MIDDLE);
    expect(await doorFacts(page, MIDDLE)).toMatchObject({ state: 'open', angle: 90, built: false });
    await press(page, 'btn-end');
    await page.waitForFunction((id) => window.__met?.doors.find((d) => d.id === id)?.built === true, MIDDLE);
    expect(await doorFacts(page, MIDDLE), 'open again at once, no swing').toMatchObject({ state: 'open', angle: 90 });
    await press(page, 'bar-toggle');
    // A click while the pointer is locked closes it.
    const before = await lumaGrid(page);
    await lockedClick(page);
    expect((await doorIs(page, MIDDLE, 'closing', 1000)).angle).toBeLessThan(90);
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

  test('facing into the Great Hall, opening and closing, and in it facing out, a swing’s slowest frame takes under 16.7 ms of work (review 0, F9; review 5, F23)', async ({ page }) => {
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
    /** Presses E and times every frame until the middle doorway stands `state`: the slowest frame's work, from more than 20 frames, under 16.7 ms. */
    const timedSwing = async (state: string, where: string): Promise<Door> => {
      const from = await page.evaluate(() => performance.now());
      await page.keyboard.press('KeyE');
      const door = await doorIs(page, MIDDLE, state);
      const to = await page.evaluate(() => performance.now());
      const frames = await page.evaluate(([a, b]) => (window as unknown as { frameWork: [number, number][] }).frameWork.filter(([t]) => t >= a && t <= b).map(([, ms]) => ms), [from, to] as const);
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
    // Through the doorway (its leaves are not yet solid) into the entrance bay, then turned back to the doors: in the hall, facing out.
    const ahead = await face(page, 0);
    const inside = await walk(page, 'into the hall', legs([[ahead.eye[0], ahead.eye[2]], [ahead.eye[0], DOOR_Z - 1.4]], MINUS_Z), []);
    expect(inside.eye[2], 'inside, behind the doors').toBeLessThan(DOOR_Z - 0.6);
    await face(page, toward(inside.eye, 0.35, DOOR_Z));
    await looksAt(page, MIDDLE, 'E Open');
    expect((await timedSwing('open', 'in the Great Hall, facing out')).angle, 'away from the walker inside: out toward the plaza').toBe(-90);
    errors.expectClean();
  });
});
