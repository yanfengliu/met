/**
 * The artworks' cards through real input (docs/design/spec.md, Collection: Labels), on the finished building at 1280×720 and 390×844.
 * - Walking: from the view menu's "Walk from the top of the Grand Staircase", turned by drags to face the cross hall and walked with W through its
 *   doorway until Tiepolo's Triumph of Marius, on gallery 600's far wall, is the look target within 6 m: the card shows its title, maker, date, medium,
 *   gallery, size, the CC0 credit and a plain link to its page, at the bottom left above the folded bar (full width at 390×844), clear of every control,
 *   of the crosshair and of the door prompt's band under it, and above the whole bar when it is unfolded; a drag that looks down at the floor hides it
 *   and one that looks back up shows it again. At 1280×720 a walking frame with the card showing keeps the 60 frames a second budget, and the link,
 *   clicked, opens the object's page in a new tab, its request stopped in the test's browser so nothing leaves the machine.
 * - Orbit view, at gallery 600's preset: a drag that starts on the painting shows no card; a click on it shows the card, moving neither the camera nor
 *   the preset in view, as does a press that travels under CLICK_SLOP; a click on a wall hides it; Esc hides it; the card sits above the bar, clear of
 *   the floor picker and every control.
 * The painting's place comes from the collection's placements (src/model/collection/spaces-b.ts), the pixel a click goes to from the published camera,
 * and both are checked apart from the page: the first surface along that pixel's ray, cast through the finished model built in the test process
 * (./surface.ts), lies on the painting for the artwork click and outside every artwork's bounds for the wall click.
 * Bound: pointer lock is not available headless, so the locked look and Esc freeing it are not driven (the walking pointer is free throughout); the
 * page's own requests are recorded for the whole test and none may go to metmuseum.org; frame times are this machine's.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, PerspectiveCamera, Vector3 } from 'three';

import { entryOf, stepArtworks } from '../../src/model/collection/place.js';
import { SPACES_A } from '../../src/model/collection/spaces-a.js';
import { SPACES_B, europeanPaintingsSpace } from '../../src/model/collection/spaces-b.js';
import { ART_CREDIT, cardContent } from '../../src/ui/art-card.js';
import { cameraGap, choosePreset, expectWalkingBudget, facts, open, openMenu, press, settle, settledCamera, walkingBudget, watchErrors } from './helpers.js';
import type { Camera } from './helpers.js';
import { face, still, walking } from './route-walk.js';
import { firstSurface } from './surface.js';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;
const TRIUMPH = 437788;
const PRESET = 'int-european-paintings-600';
/** The door prompt's place under the crosshair, which the folded walking screen keeps clear (src/ui/styles.ts): from the centre down 80 px, 320 px wide. */
const BAND = { halfWidth: 160, above: 8, below: 80 } as const;

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly clipped: boolean;
}

/** Boxes of every visible element with a data-testid among `ids`, by layout, and whether each clips its content. */
async function boxes(page: Page, ids: readonly string[]): Promise<Box[]> {
  return page.evaluate((list) => list.flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)).flatMap((e) => {
    if (e.getClientRects().length === 0 || getComputedStyle(e).visibility === 'hidden') return [];
    const r = e.getBoundingClientRect();
    return [{ id, x: r.x, y: r.y, w: r.width, h: r.height, clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 }];
  })), ids);
}

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** The card's box among `list`, inside the viewport, unclipped (crosshair aside) and apart from every other box. */
function expectLaidOut(list: readonly Box[], viewport: { width: number; height: number }, what: string): Box {
  const card = list.find((b) => b.id === 'art-card');
  if (card === undefined) throw new Error(`${what}: the card is not shown.`);
  for (const b of list) {
    expect(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= viewport.width + 0.5 && b.y + b.h <= viewport.height + 0.5, `${what}: ${b.id} inside the viewport`).toBe(true);
    if (b.id !== 'crosshair') expect(b.clipped, `${what}: ${b.id} clips its content`).toBe(false);
  }
  const pairs = list.flatMap((a, i) => list.slice(i + 1).filter((b) => overlaps(a, b)).map((b) => `${a.id} / ${b.id}`));
  expect(pairs, `${what}: overlapping`).toEqual([]);
  return card;
}

/** The orbit view's controls, by data-testid, that the card must keep clear of, with the card. */
const ORBIT_CONTROLS = ['step-label', 'step-detail', 'scrubber', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4', 'walk-toggle', 'chapter-menu-button', 'view-menu-button', 'floor-all', 'floor-ground', 'floor-main', 'floor-second', 'floor-roof-garden', 'art-card'];
const WALK_CONTROLS = ['chapter-menu-button', 'view-menu-button', 'bar-toggle', 'walk-toggle', 'crosshair', 'walk-status', 'art-card'];

/** A projection of the published camera over the canvas as the page's covers it (src/viewer/camera-rig.ts `resize`; tests/e2e/zoom.spec.ts). */
async function projection(page: Page, c: Camera): Promise<{ readonly cam: PerspectiveCamera; readonly box: { x: number; y: number; width: number; height: number } }> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const cam = new PerspectiveCamera(c.fov, c.aspect, c.near, c.far);
  const visible = box.width / c.aspect;
  if (visible < box.height - 0.5) cam.setViewOffset(box.width, visible, 0, 0, box.width, box.height);
  cam.updateProjectionMatrix();
  cam.position.set(...c.position);
  cam.lookAt(new Vector3(...c.target));
  cam.updateMatrixWorld();
  return { cam, box };
}

/** The whole pixel a world point projects to, as the browser delivers a pointer. */
async function pixelOf(page: Page, c: Camera, p: Vector3): Promise<{ x: number; y: number }> {
  const { cam, box } = await projection(page, c);
  const ndc = p.clone().project(cam);
  return { x: Math.round(box.x + ((ndc.x + 1) / 2) * box.width), y: Math.round(box.y + ((1 - ndc.y) / 2) * box.height) };
}

/** Where the ray under pixel (x, y) first meets the finished model, cast in the test process (./surface.ts), or null over open sky. */
async function surfaceAt(page: Page, c: Camera, x: number, y: number): Promise<Vector3 | null> {
  const { cam, box } = await projection(page, c);
  const d = new Vector3(((x - box.x) / box.width) * 2 - 1, -((y - box.y) / box.height) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
  const t = firstSurface(c.position, [d.x, d.y, d.z]);
  return t === null ? null : new Vector3(...c.position).addScaledVector(d, t);
}

/** Every artwork's pieces' world bounds, by object ID: the unit boxes their forms fill (src/model/collection/kinds.ts), at their final matrices. */
function artworkBounds(): Map<number, Box3> {
  const out = new Map<number, Box3>();
  for (const def of [...SPACES_A, ...SPACES_B]) {
    const { pieces } = stepArtworks(def);
    def.placements.forEach((at, i) => {
      const box = new Box3();
      for (const piece of pieces[i] ?? []) box.union(new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5)).applyMatrix4(piece.matrix));
      out.set(at.id, box);
    });
  }
  return out;
}

/** The Triumph's canvas: its object piece's world box and the middle of its face. */
function triumph(): { readonly box: Box3; readonly middle: Vector3 } {
  const at = europeanPaintingsSpace.placements.findIndex((p) => p.id === TRIUMPH);
  const object = stepArtworks(europeanPaintingsSpace).pieces[at]?.[0];
  if (object === undefined) throw new Error(`No object piece for ${String(TRIUMPH)} in gallery 600's step.`);
  const box = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5)).applyMatrix4(object.matrix);
  return { box, middle: new Vector3(0, 0.5, 0.5).applyMatrix4(object.matrix) };
}

/** The element at (x, y) is the canvas: no control or card lies over the pixel a click goes to. */
async function onCanvas(page: Page, x: number, y: number): Promise<boolean> {
  return page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName === 'CANVAS', [x, y] as const);
}

/** The card's fields as the page shows them. */
async function cardText(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of ['art-title', 'art-maker', 'art-date', 'art-medium', 'art-gallery', 'art-size', 'art-credit', 'art-link']) out[id] = (await page.getByTestId(id).textContent()) ?? '';
  return out;
}

/** The card shows the Triumph of Marius, every field as its catalogue entry gives it, and its link is a plain anchor to its page in a new tab. */
async function expectTriumphCard(page: Page): Promise<void> {
  const entry = entryOf(TRIUMPH);
  const content = cardContent(entry);
  await expect(page.getByTestId('art-card')).toBeVisible();
  expect(await cardText(page)).toEqual({ 'art-title': entry.title, 'art-maker': entry.maker, 'art-date': entry.date, 'art-medium': entry.medium, 'art-gallery': `Gallery ${entry.gallery}`, 'art-size': content.size, 'art-credit': ART_CREDIT, 'art-link': 'View on metmuseum.org' });
  const link = page.getByTestId('art-link');
  await expect(link).toHaveAttribute('href', `https://www.metmuseum.org/art/collection/search/${String(TRIUMPH)}`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  // Nothing asks the browser to fetch it before it is clicked.
  expect(await page.evaluate(() => document.querySelectorAll('link[rel~="prefetch"], link[rel~="preload"], link[rel~="preconnect"], link[rel~="dns-prefetch"], link[rel~="prerender"], script[type="speculationrules"]').length)).toBe(0);
}

/** Every request the page makes from now on, to check none goes to metmuseum.org. */
function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

/** Drags across the canvas with the primary button from (x, y) by (dx, dy) in 20-pixel moves: a look in walk mode, an orbit in the orbit view. */
async function drag(page: Page, x: number, y: number, dx: number, dy: number): Promise<void> {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 20));
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= steps; k += 1) await page.mouse.move(x + (dx * k) / steps, y + (dy * k) / steps);
  await page.mouse.up();
}

for (const viewport of VIEWPORTS) {
  test.describe(`artwork cards at ${String(viewport.width)}x${String(viewport.height)}`, () => {
    test.use({ viewport });
    test.setTimeout(120_000);

    test('walking: the card shows while the eye looks at the Triumph of Marius within 6 m, and hides when it looks away', async ({ page }) => {
      const errors = watchErrors(page);
      const requests = recordRequests(page);
      await open(page, '');
      await openMenu(page, 'view-menu');
      await press(page, 'walk-spawn-second-floor');
      await page.waitForFunction(() => window.__met?.walk.spawn === 'second-floor');
      await walking(page);
      // Turned to face the cross hall and gallery 600 beyond it (yaw 0 faces −Z), 16 m from the painting: no card yet.
      await face(page, 0);
      expect((await facts(page)).label, 'no artwork within 6 m at the top of the stair').toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();
      await page.keyboard.down('KeyW');
      await page.waitForFunction(() => window.__met?.label != null, undefined, { polling: 'raf', timeout: 30_000 });
      await page.keyboard.up('KeyW');
      await still(page);
      await settle(page);
      const f = await facts(page);
      expect(f.label).toEqual({ id: String(TRIUMPH), title: entryOf(TRIUMPH).title });
      expect(f.walk.target?.kind, 'the look target').toBe('artwork');
      expect(f.walk.target?.id).toBe(String(TRIUMPH));
      expect(f.walk.target?.distance ?? Number.POSITIVE_INFINITY, 'within the artwork reach').toBeLessThanOrEqual(6);
      await expectTriumphCard(page);
      await expect(page.getByTestId('crosshair')).toHaveAttribute('data-target', 'artwork');

      // Its place on the quiet walking screen: above the folded bar, at the left or across the narrow screen, clear of the crosshair and the band under it.
      const folded = expectLaidOut(await boxes(page, WALK_CONTROLS), viewport, 'walking, folded');
      const strip = (await boxes(page, ['timeline-bar']))[0];
      if (strip === undefined) throw new Error('No folded bar.');
      expect(folded.y + folded.h, 'the card ends above the folded bar').toBeLessThanOrEqual(strip.y + 0.5);
      if (viewport.width > 640) expect(folded.x, 'at the bottom left').toBeCloseTo(12, 0);
      else expect([folded.x, folded.w], 'full width, 8 px in from each side').toEqual([8, viewport.width - 16]);
      const band: Box = { id: 'band', x: viewport.width / 2 - BAND.halfWidth, y: viewport.height / 2 - BAND.above, w: 2 * BAND.halfWidth, h: BAND.above + BAND.below, clipped: false };
      expect(overlaps(folded, band), 'the card stays out of the door prompt’s band under the crosshair').toBe(false);
      // Unfolded, the card stands above the whole bar, still clear of the crosshair; folded again it comes back down.
      await press(page, 'bar-toggle');
      await settle(page);
      const whole = expectLaidOut(await boxes(page, [...WALK_CONTROLS, ...ORBIT_CONTROLS.slice(0, 13)]), viewport, 'walking, unfolded');
      const bar = (await boxes(page, ['timeline-bar']))[0];
      if (bar === undefined) throw new Error('No timeline bar.');
      expect(whole.y + whole.h, 'the card ends above the unfolded bar').toBeLessThanOrEqual(bar.y + 0.5);
      await press(page, 'bar-toggle');

      // Looking down at the floor hides the card; looking back up shows it again.
      const box = await page.getByTestId('canvas').boundingBox();
      if (box === null) throw new Error('The canvas has no box.');
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 4;
      await drag(page, x, y, 0, 360);
      await page.waitForFunction(() => window.__met?.label === null, undefined, { polling: 'raf', timeout: 5000 });
      await expect(page.getByTestId('art-card')).toBeHidden();
      expect((await facts(page)).walk.target, 'looking at the floor').toBeNull();
      await drag(page, x, y + 360, 0, -360);
      await page.waitForFunction((id) => window.__met?.label?.id === id, String(TRIUMPH), { polling: 'raf', timeout: 5000 });
      await expect(page.getByTestId('art-title')).toHaveText(entryOf(TRIUMPH).title);

      if (viewport.width === 1280) {
        // A walking frame with the card showing, in the gallery: W held for 120 frames toward the painting, which stays the look target.
        expectWalkingBudget(await walkingBudget(page), 'in gallery 600 with the card showing');
        expect((await facts(page)).label?.id, 'the card still shows after the walk').toBe(String(TRIUMPH));
        // The link opens the object's page in a new tab; the test's browser stops its request, so nothing reaches metmuseum.org.
        const asked: string[] = [];
        await page.context().route(/metmuseum\.org/, async (route) => {
          asked.push(route.request().url());
          await route.abort();
        });
        const tab = page.context().waitForEvent('page');
        await page.getByTestId('art-link').click();
        const opened = await tab;
        await expect.poll(() => asked, { message: 'the new tab asks for the object page' }).toContain(`https://www.metmuseum.org/art/collection/search/${String(TRIUMPH)}`);
        expect(opened).not.toBe(page);
        await opened.close();
        await page.bringToFront();
        expect((await facts(page)).walk.mode, 'still walking after the link').toBe('walk');
      }
      expect(requests.filter((url) => /metmuseum\.org/i.test(url)), 'requests of the page itself to metmuseum.org').toEqual([]);
      errors.expectClean();
    });

    test('orbit view: a click on the Triumph of Marius shows its card, a drag does not, and a click on a wall or Esc hides it', async ({ page }) => {
      const errors = watchErrors(page);
      const requests = recordRequests(page);
      await open(page, `autoplay=0&view=${PRESET}`);
      const start = await settledCamera(page);
      const { box: painting, middle } = triumph();
      const p = await pixelOf(page, start, middle);
      expect(await onCanvas(page, p.x, p.y), 'nothing of the page covers the painting’s pixel').toBe(true);
      const met = await surfaceAt(page, start, p.x, p.y);
      expect(met !== null && painting.clone().expandByScalar(0.01).containsPoint(met), `the first surface under (${String(p.x)}, ${String(p.y)}) is the painting: met at ${met === null ? 'nothing' : met.toArray().map((v) => v.toFixed(2)).join(', ')}`).toBe(true);

      // A drag that starts on the painting orbits the view and shows no card.
      await drag(page, p.x, p.y, 40, 0);
      await settle(page);
      expect((await facts(page)).label, 'after a drag').toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();
      await choosePreset(page, PRESET);
      // The open menu covers the painting on a narrow screen; Esc closes it (there is no card yet for Esc to hide).
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('view-menu')).toBeHidden();
      const back = await settledCamera(page);
      expect(cameraGap(back, start), 'the preset again').toBeLessThan(1e-3);
      expect(await onCanvas(page, p.x, p.y), 'nothing of the page covers the painting’s pixel once the menu is closed').toBe(true);

      // A click on it shows its card and moves nothing.
      await page.mouse.click(p.x, p.y);
      await settle(page);
      expect((await facts(page)).label).toEqual({ id: String(TRIUMPH), title: entryOf(TRIUMPH).title });
      await expectTriumphCard(page);
      const after = await settledCamera(page);
      expect(cameraGap(after, back), 'a click moves no camera').toBeLessThan(1e-4);
      const f = await facts(page);
      expect([f.view, f.follow], 'the preset in view and the follow camera, as they were').toEqual([PRESET, false]);
      const card = expectLaidOut(await boxes(page, ORBIT_CONTROLS), viewport, 'orbit view');
      const bar = (await boxes(page, ['timeline-bar']))[0];
      const picker = (await boxes(page, ['floor-picker']))[0];
      if (bar === undefined || picker === undefined) throw new Error('No timeline bar or floor picker.');
      expect(card.y + card.h, 'the card ends above the bar').toBeLessThanOrEqual(bar.y + 0.5);
      expect(card.x, 'the card stands right of the floor picker').toBeGreaterThanOrEqual(picker.x + picker.w - 0.5);

      // A click on a wall, the first surface under its pixel lying outside every artwork's bounds, hides the card.
      const bounds = [...artworkBounds().values()].map((b) => b.clone().expandByScalar(0.05));
      let wall: { x: number; y: number } | null = null;
      for (let row = 0.3; row <= 0.6 && wall === null; row += 0.1) {
        for (let col = 0.04; col <= 0.96 && wall === null; col += 0.04) {
          const x = Math.round(viewport.width * col);
          const y = Math.round(viewport.height * row);
          if (!(await onCanvas(page, x, y))) continue;
          const hit = await surfaceAt(page, after, x, y);
          if (hit !== null && bounds.every((b) => !b.containsPoint(hit))) wall = { x, y };
        }
      }
      if (wall === null) throw new Error('No pixel of the view shows a surface that is no artwork’s.');
      await page.mouse.click(wall.x, wall.y);
      await settle(page);
      expect((await facts(page)).label, `after a click on a wall at (${String(wall.x)}, ${String(wall.y)})`).toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();

      // A press that travels under CLICK_SLOP (2 px out, 2 back) is a click too; Esc hides the card.
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.mouse.move(p.x + 2, p.y);
      await page.mouse.move(p.x, p.y);
      await page.mouse.up();
      await settle(page);
      expect((await facts(page)).label?.id, 'after a press that travelled 4 px').toBe(String(TRIUMPH));
      await page.keyboard.press('Escape');
      await settle(page);
      expect((await facts(page)).label, 'after Esc').toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();
      expect(requests.filter((url) => /metmuseum\.org/i.test(url)), 'requests of the page to metmuseum.org').toEqual([]);
      errors.expectClean();
    });
  });
}
