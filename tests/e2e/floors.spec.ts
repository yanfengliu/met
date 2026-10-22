/**
 * The floor picker through real input (docs/design/spec.md, Page: Floor picker): each floor clicked sets the cut to its height, hides the landscape
 * over it, frames the floor from above from the side the user orbited to and changes the canvas, and All gives back the cut the user had; Page Up and
 * Page Down go up and down a floor; moving the cut slider or pressing the cut toggle by hand leaves the floor view; walk mode leaves it too, with the
 * same collision; `floor=` at load; no floor view shows a plate of the cut colour; each of the four flights the Main floor view cuts through shows
 * the cut colour across its section, close up and a small orbit step away, where the cap pass once z-fought with the floor or landing it meets
 * (section-cut.ts, CAP_DEPTH_BIAS); a roof wholly under a cut keeps its own colour where the depth buffer is coarse (cap-pass.ts).
 * Facts come from `window.__met` (floors, floor, cut, camera, walk); nothing names a floor's height but the facts.
 * Bound: canvas checks compare coarse luminance grids (the drawing changed) and count pixels of the cut colour (no plate of it, all of a flight's
 * section, none of an intact roof); what each floor shows is judged in the floor captures (npm run shots). The close-ups are this machine's GPU (an RTX
 * 4090 through ANGLE's Direct3D 11 in headless Chrome, 1280x720): where coplanar faces' depths round apart, and so where they z-fight, depends on the GPU.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Vector3 } from 'three';

import { CUT_COLOUR } from '../../src/viewer/section-cut.js';
import { camera, changedCells, dragCanvas, facts, lumaGrid, open, openMenu, press, settle, settledCamera, watchErrors } from './helpers.js';
import type { Camera, Facts } from './helpers.js';

/** The camera's elevation over the horizon and its azimuth about the target, in degrees. */
function orbitAngles(c: Camera): { elevation: number; azimuth: number } {
  const [dx, dy, dz] = [c.position[0] - c.target[0], c.position[1] - c.target[1], c.position[2] - c.target[2]];
  return { elevation: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI, azimuth: (Math.atan2(dz, dx) * 180) / Math.PI };
}

/** The share of the canvas drawn in the section cut's flat colour, from the drawing buffer. */
async function cutColourShare(page: Page): Promise<number> {
  await settle(page);
  // The cut colour as the canvas holds it: sRGB bytes (the cap material is not tone-mapped).
  const hex = CUT_COLOUR.getHex();
  return page.evaluate(([cr, cg, cb]) => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    if (!gl) throw new Error('cutColourShare: the page has no WebGL2 canvas.');
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let hits = 0;
    for (let i = 0; i < px.length; i += 4) if (Math.abs((px[i] ?? 0) - cr) <= 6 && Math.abs((px[i + 1] ?? 0) - cg) <= 6 && Math.abs((px[i + 2] ?? 0) - cb) <= 6) hits += 1;
    return hits / (w * h);
  }, [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as const);
}

/** The share of the square `half` pixels each side of the canvas centre drawn in the section cut's flat colour, from the drawing buffer. */
async function cutColourAtCentre(page: Page, half: number): Promise<number> {
  await settle(page);
  const hex = CUT_COLOUR.getHex();
  return page.evaluate(([cr, cg, cb, n]) => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    if (!gl) throw new Error('cutColourAtCentre: the page has no WebGL2 canvas.');
    const size = 2 * n + 1;
    const px = new Uint8Array(size * size * 4);
    gl.readPixels(Math.floor(gl.drawingBufferWidth / 2) - n, Math.floor(gl.drawingBufferHeight / 2) - n, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let hits = 0;
    for (let i = 0; i < px.length; i += 4) if (Math.abs((px[i] ?? 0) - cr) <= 6 && Math.abs((px[i + 1] ?? 0) - cg) <= 6 && Math.abs((px[i + 2] ?? 0) - cb) <= 6) hits += 1;
    return hits / (size * size);
  }, [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, half] as const);
}

/**
 * The flights the Main floor view cuts through, each by the middle of its section at the cut (X, Z) and the way it climbs: Wing C's main stair
 * (src/model/core/wings-walls.ts, C_STAIR) and the Engelhard Court's stair to the mezzanine (src/model/roche-north/engelhard.ts), whose undersides lie
 * on the floor under them; the Grand Staircase's lower flight (src/model/hunt/stair.ts), whose top meets its landing and whose sides meet the
 * staircase's walls; and the upper flight of the north Vaux iron U-stair (src/model/core/vaux-shell.ts), whose underside stands over the main floor.
 * From 50 m above, the Grand flight's top riser, 19 cm over the cut and seen edge on, shows one antialiasing sample of its stone along a row across
 * the square, with or without the cap pass (the clip is tested once per pixel, not per sample), so that flight is framed from 15 m only (`farthest`).
 */
const CUT_FLIGHTS = [
  { name: "Wing C's stair", middle: [31.5, -117.375], climbs: [-1, 0], farthest: 50 },
  { name: 'the Engelhard mezzanine stair', middle: [54.74, -125.5], climbs: [0, -1], farthest: 50 },
  { name: "the Grand Staircase's lower flight", middle: [0, -46.445], climbs: [0, -1], farthest: 15 },
  { name: 'the north Vaux iron stair', middle: [12.55, -131.6], climbs: [0, 1], farthest: 50 },
] as const;
/** Cameras on a flight's middle at the cut: from above (from the side of its foot) and from over its top looking down it, with the square measured. */
const CLOSE_UPS = [
  { name: 'from above at 50 m', distance: 50, elevation: 88, toward: -1, half: 6 },
  { name: 'from above at 15 m', distance: 15, elevation: 88, toward: -1, half: 20 },
  { name: 'down the flight from 15 m', distance: 15, elevation: 40, toward: 1, half: 20 },
] as const;
/** The small orbit step taken from each close-up, degrees of azimuth and of elevation. */
const ORBIT_STEP = { azimuth: 1.5, elevation: 0.75 };
/**
 * The least share of a close-up's square in the cut colour. Measured on 2026-10-22: with the cap's depth bias every view reads 98.8 to 100% (the lowest,
 * the Engelhard stair from 50 m after the step, has 2 of 169 pixels holding one antialiasing sample of the lit floor, the same with a bias of 4, 6 or 8
 * steps); without it, 11 of the 22 views read 0 to 96% (Wing C's 4, the Engelhard stair's 5, the Grand flight's 2, the Vaux flight's none: its
 * underside stands clear of the floor, so the view checks only that the flight is closed).
 */
const FLIGHT_CUT_SHARE = 0.97;
/**
 * The Hunt galleries' flat roof, its 5 cm lead skin at 20.45 to 20.50 m, under a 27.4 m cut, seen from 100 m over it with the orbit target 1 m away,
 * so the near plane is 3 cm and the skin's two faces lie under 3 depth-buffer steps apart (work unit 1, review 3, U10), and from two cameras by it.
 */
const COARSE_DEPTH_VIEWS = ['30,120,-55,30,119,-55', '35,120,-55,35,119,-55', '30,100,-55,30,99,-55'] as const;

async function floorFacts(page: Page): Promise<Pick<Facts, 'floor' | 'cut'>> {
  const f = await facts(page);
  return { floor: f.floor, cut: f.cut };
}

/** Expects the picker to press `id` alone. */
async function expectPressed(page: Page, ids: readonly string[], id: string): Promise<void> {
  for (const other of ids) await expect(page.getByTestId(`floor-${other}`), `floor-${other} pressed`).toHaveAttribute('aria-pressed', String(other === id));
}

/** Drags the cut slider's thumb left by `pixels`, as a person does. */
async function dragCutSlider(page: Page, pixels: number): Promise<void> {
  await openMenu(page, 'view-menu');
  const slider = page.getByTestId('cut-slider');
  // The slider sits at the foot of the view menu, which scrolls when it is taller than the space.
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (box === null) throw new Error('The cut slider has no box.');
  const fraction = Number(await slider.inputValue()) / Number(await slider.getAttribute('max'));
  const y = box.y + box.height / 2;
  const fromX = box.x + 8 + (box.width - 16) * fraction;
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k += 1) await page.mouse.move(fromX - (k * pixels) / 6, y);
  await page.mouse.up();
  await settle(page);
}

const choices = (f: Facts): string[] => ['all', ...f.floors.map((fl) => fl.id)];

test.describe('floor picker', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('each floor, clicked, sets its cut, hides the landscape over it, frames it from above from the user\'s side and changes the canvas; All gives the cut back', async ({ page }) => {
    const f = await open(page);
    expect(f.floors.map((fl) => fl.id)).toEqual(['ground', 'main', 'second', 'roof-garden']);
    await expect(page.getByTestId('floor-picker')).toHaveAttribute('aria-label', 'Floor');
    await expectPressed(page, choices(f), 'all');
    // The user's own cut: on, then lowered by the slider.
    await openMenu(page, 'view-menu');
    await press(page, 'cut-toggle');
    await dragCutSlider(page, 30);
    await page.keyboard.press('Escape');
    const own = (await facts(page)).cut;
    expect(own.enabled).toBe(true);
    // An orbit of the user's own, so the side kept is theirs and not the preset's.
    await dragCanvas(page, 22, 0, 8);
    const { azimuth } = orbitAngles(await settledCamera(page));
    let before = await lumaGrid(page);
    for (const floor of f.floors) {
      await press(page, `floor-${floor.id}`);
      await expectPressed(page, choices(f), floor.id);
      const now = await floorFacts(page);
      expect(now.cut, `${floor.id}: the cut`).toEqual({ enabled: true, height: floor.cut });
      expect(now.floor.id).toBe(floor.id);
      expect(now.floor.ownCut, `${floor.id}: the user's cut kept`).toEqual(own);
      if (floor.id === 'roof-garden') expect(now.floor.hidden, 'landscape hidden at the roof garden, over every crown').toBe(0);
      else expect(now.floor.hidden, `${floor.id}: landscape meshes hidden`).toBeGreaterThan(0);
      const cam = await settledCamera(page);
      const angles = orbitAngles(cam);
      expect(angles.elevation, `${floor.id}: elevation`).toBeCloseTo(65, 3);
      expect(angles.azimuth, `${floor.id}: the orbit's side kept`).toBeCloseTo(azimuth, 3);
      expect(cam.target[1], `${floor.id}: target in the storey`).toBeGreaterThan(floor.level);
      expect(cam.target[1]).toBeLessThan(floor.cut);
      const grid = await lumaGrid(page);
      expect(changedCells(before, grid).length, `${floor.id}: canvas cells changed`).toBeGreaterThan(8);
      expect(await cutColourShare(page), `${floor.id}: share of the canvas in the cut colour`).toBeLessThan(0.03);
      before = grid;
    }
    const framed = await camera(page);
    await press(page, 'floor-all');
    await expectPressed(page, choices(f), 'all');
    const all = await floorFacts(page);
    expect(all.cut, 'the user\'s cut given back').toEqual(own);
    expect(all.floor).toEqual({ id: 'all', hidden: 0, ownCut: null });
    const after = await settledCamera(page);
    expect(after.position, 'All leaves the camera where it is').toEqual(framed.position);
    expect(changedCells(before, await lumaGrid(page)).length, 'canvas cells changed by All').toBeGreaterThan(8);
  });

  test('Page Up and Page Down go up and down a floor, All above the top floor, and stay put at either end', async ({ page }) => {
    const f = await open(page);
    const own = f.cut;
    expect(own.enabled).toBe(false);
    const order = [...f.floors].reverse().map((fl) => fl.id);
    let before = await lumaGrid(page);
    /** Presses `key` and expects `want` in view; `changes` says whether the canvas must change, and at either end it must not. */
    const step = async (key: 'PageUp' | 'PageDown', want: string, changes: boolean): Promise<void> => {
      const previous = (await floorFacts(page)).floor.id;
      await page.keyboard.press(key);
      await settle(page);
      await expectPressed(page, choices(f), want);
      const now = await floorFacts(page);
      expect(now.floor.id, `${key} to ${want}`).toBe(want);
      const floor = f.floors.find((fl) => fl.id === want);
      expect(now.cut, `${key} to ${want}: the cut`).toEqual(floor === undefined ? own : { enabled: true, height: floor.cut });
      const grid = await lumaGrid(page);
      const changed = changedCells(before, grid).length;
      if (changes) expect(changed, `${key} from ${previous} to ${want}: canvas cells changed`).toBeGreaterThan(8);
      if (previous === want) expect(changed, `${key} at the end, on ${want}: canvas cells changed`).toBe(0);
      before = grid;
    };
    for (const id of order) await step('PageDown', id, true);
    await step('PageDown', 'ground', false);
    for (const id of [...order].reverse().slice(1)) await step('PageUp', id, true);
    // From the roof garden's framing, All changes nothing in view: its cut takes only roof tops elsewhere. The facts still change.
    await step('PageUp', 'all', false);
    await step('PageUp', 'all', false);
  });

  test('moving the cut slider or pressing the cut toggle by hand leaves the floor view, which the picker shows, and the hand-set cut stands', async ({ page }) => {
    const f = await open(page);
    const main = f.floors.find((fl) => fl.id === 'main');
    if (main === undefined) throw new Error('No main floor in window.__met.floors.');
    await press(page, 'floor-main');
    const floorGrid = await lumaGrid(page);
    expect((await floorFacts(page)).floor.hidden).toBeGreaterThan(0);
    await dragCutSlider(page, 30);
    const moved = await floorFacts(page);
    expect(moved.floor, 'after the slider').toEqual({ id: 'all', hidden: 0, ownCut: null });
    expect(moved.cut.enabled).toBe(true);
    expect(moved.cut.height).toBeLessThan(main.cut);
    await expect(page.getByTestId('cut-value')).toHaveText(`${moved.cut.height.toFixed(1)} m`);
    await page.keyboard.press('Escape');
    await expectPressed(page, choices(f), 'all');
    expect(changedCells(floorGrid, await lumaGrid(page)).length, 'canvas cells changed by the slider').toBeGreaterThan(8);
    // All now gives nothing back: the hand-set cut is the user's own.
    await press(page, 'floor-all');
    expect((await floorFacts(page)).cut).toEqual(moved.cut);
    // The cut toggle by hand leaves the floor view too, with the cut off.
    await press(page, 'floor-second');
    await openMenu(page, 'view-menu');
    await press(page, 'cut-toggle');
    await expect(page.getByTestId('cut-toggle')).toHaveAttribute('aria-pressed', 'false');
    const toggled = await floorFacts(page);
    expect(toggled.floor).toEqual({ id: 'all', hidden: 0, ownCut: null });
    expect(toggled.cut.enabled).toBe(false);
    await page.keyboard.press('Escape');
    await expectPressed(page, choices(f), 'all');
  });

  test('walk mode leaves the floor view, giving the cut back, hides the picker, ignores Page Down and builds the same collision', async ({ page }) => {
    const f = await open(page);
    const walking = async (): Promise<Facts['walk']> => {
      await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.collision !== null, undefined, { timeout: 15_000 });
      return (await facts(page)).walk;
    };
    await press(page, 'floor-second');
    expect((await floorFacts(page)).floor.id).toBe('second');
    await press(page, 'walk-toggle');
    const walk = await walking();
    expect(await floorFacts(page), 'the floor view after entering walk mode').toEqual({ floor: { id: 'all', hidden: 0, ownCut: null }, cut: f.cut });
    await expect(page.getByTestId('floor-picker')).toBeHidden();
    await page.keyboard.press('PageDown');
    await settle(page);
    expect((await floorFacts(page)).floor.id, 'Page Down in walk mode').toBe('all');
    await page.keyboard.press('KeyF');
    await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
    await expect(page.getByTestId('floor-picker')).toBeVisible();
    await expectPressed(page, choices(f), 'all');
    // The same collision as a fresh page that never chose a floor (a fresh page, as the walk mode keeps its collision while t stays).
    await open(page);
    await press(page, 'walk-toggle');
    expect(walk.collision, 'collision after a floor view vs none').toEqual((await walking()).collision);
  });

  test('in the Main floor view each flight cut through shows the cut colour across its section, close up and a small orbit step away', async ({ page }) => {
    // 23 page loads, each building the model again: about 1.5 s apiece here, twice that on a loaded machine.
    test.setTimeout(120_000);
    const main = (await open(page)).floors.find((fl) => fl.id === 'main');
    if (main === undefined) throw new Error('No main floor in window.__met.floors.');
    const problems: string[] = [];
    for (const flight of CUT_FLIGHTS) {
      for (const view of CLOSE_UPS.filter((v) => v.distance <= flight.farthest)) {
        for (const step of [false, true]) {
          const target = new Vector3(flight.middle[0], main.cut, flight.middle[1]);
          const elevation = ((view.elevation + (step ? ORBIT_STEP.elevation : 0)) * Math.PI) / 180;
          const across = new Vector3(flight.climbs[0] * view.toward, 0, flight.climbs[1] * view.toward).applyAxisAngle(new Vector3(0, 1, 0), step ? (ORBIT_STEP.azimuth * Math.PI) / 180 : 0);
          const at = target.clone().addScaledVector(across, view.distance * Math.cos(elevation)).setY(target.y + view.distance * Math.sin(elevation));
          await open(page, `shot=1&noui=1&floor=main&cam=${[at.x, at.y, at.z, target.x, target.y, target.z].map((v) => v.toFixed(4)).join(',')}`);
          const share = await cutColourAtCentre(page, view.half);
          if (share < FLIGHT_CUT_SHARE) problems.push(`${flight.name}, ${view.name}${step ? ', after a small orbit step' : ''}: ${(share * 100).toFixed(1)}% of the middle of its section in the cut colour`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  test('a roof wholly under the cut keeps its own colour, even where the depth buffer is coarsest', async ({ page }) => {
    const problems: string[] = [];
    for (const cam of COARSE_DEPTH_VIEWS) {
      await open(page, `shot=1&noui=1&cut=27.4&cam=${cam}`);
      const share = await cutColourAtCentre(page, 40);
      if (share > 0) problems.push(`cam=${cam}: ${(share * 100).toFixed(1)}% of the roof under the camera in the cut colour`);
    }
    expect(problems).toEqual([]);
  });

  test('floor= at load shows that floor framed from above; one that names no floor, or comes with walk=1, is ignored with a warning', async ({ page }) => {
    const f = await open(page, 'floor=second');
    const second = f.floors.find((fl) => fl.id === 'second');
    expect(f.floor.id).toBe('second');
    expect(f.cut).toEqual({ enabled: true, height: second?.cut });
    expect(f.follow).toBe(false);
    expect(orbitAngles(f.camera).elevation).toBeCloseTo(65, 3);
    await expectPressed(page, choices(f), 'second');
    const unknown = await open(page, 'floor=attic');
    expect(unknown.floor.id).toBe('all');
    expect(unknown.warnings.some((w) => w.includes('floor="attic" names no floor'))).toBe(true);
    const walk = await open(page, 'walk=1&floor=main');
    expect(walk.floor.id).toBe('all');
    expect(walk.walk.mode).toBe('walk');
    expect(walk.warnings.some((w) => w.includes('floor="main" takes effect only in the orbit view'))).toBe(true);
  });
});
