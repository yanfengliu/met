/**
 * The artworks' cards through real input (docs/design/spec.md, Collection: Labels), on the finished building at 1280×720 and 390×844.
 * - Walking: from the view menu's "Walk from the top of the Grand Staircase", turned by drags to face the cross hall and walked with W through its
 *   doorway until Tiepolo's Triumph of Marius, on gallery 600's far wall, is the look target within 6 m: the card shows its title, maker, date, medium,
 *   gallery, size, the CC0 credit and a plain link to its page, at the bottom left above the folded bar (full width at 390×844), clear of every control,
 *   of the crosshair and of the door prompt's band under it, and above the whole bar when it is unfolded; a drag that looks down at the floor hides it
 *   and one that looks back up shows it again. At every frame drawn, the card shows exactly when the crosshair's one look target is an artwork (review
 *   6, F28); ./routes.spec.ts's short walk, from the entrance's door to the painting and by the view menu back to the door, shows it never shows
 *   beside the door prompt (review 7, F30). At 1280×720 a walking frame with the card showing keeps the 60 frames a second budget (the median work a
 *   frame and the mean GPU-synced render under 16.7 ms, the median frame interval under 18.37 ms: ./helpers.ts `expectWalkingBudget`), and the link,
 *   clicked, opens the object's page in a new tab, its request stopped in the test's browser so nothing leaves the machine.
 * - Orbit view, at gallery 600's preset (`int-european-paintings-600`): a drag that starts on the painting shows no card; a click on it shows the
 *   card, moving neither the camera nor the preset in view, as does a press that travels 4 px, under CLICK_SLOP (5 px), both pixels checked by a cast
 *   through the finished model in the test process; a click on a wall hides it; Esc hides it; the card sits above the bar, clear of the floor picker
 *   and every control. A clicked card goes when walk mode begins and does not come back when it ends.
 * The painting's place comes from the collection's placements (src/model/collection/spaces-b.ts), the pixel a click goes to from the published camera,
 * and both are checked apart from the page (./labels-helpers.ts). ./labels-view.spec.ts drives the card through the follow camera, presets and the cut.
 * Bound: pointer lock is not available headless, so the locked look and Esc freeing it are not driven (the walking pointer is free throughout); the
 * page's own requests are recorded for the whole test and none may go to metmuseum.org; frame times are this machine's; the frame-by-frame check reads
 * the page's DOM from a requestAnimationFrame loop beside the page's own, which runs after it in each frame and writes nothing.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { entryOf } from '../../src/model/collection/place.js';
import { cameraGap, choosePreset, expectWalkingBudget, facts, open, openMenu, press, settle, settledCamera, walkingBudget, watchErrors } from './helpers.js';
import { BAND, ORBIT_CONTROLS, PRESET, TRIUMPH, VIEWPORTS, WALK_CONTROLS, artworkBounds, boxes, drag, expectLaidOut, expectTriumphCard, onCanvas, overlaps, recordRequests, surfaceAt, triumphPixel } from './labels-helpers.js';
import type { Box } from './labels-helpers.js';
import { face, still, walking } from './route-walk.js';

/** Starts recording, at every frame the page draws, whether the card shows and the crosshair's look target kind (`data-target`). */
async function watchCard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { cardFrames?: [boolean, string | null][] };
    if (w.cardFrames !== undefined) return;
    const frames: [boolean, string | null][] = [];
    w.cardFrames = frames;
    const tick = (): void => {
      const card = document.querySelector<HTMLElement>('[data-testid="art-card"]');
      frames.push([card !== null && !card.hidden, document.querySelector('[data-testid="crosshair"]')?.getAttribute('data-target') ?? null]);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** The frames recorded since the last call, as [card shown, look target kind]. */
async function cardFrames(page: Page): Promise<[boolean, string | null][]> {
  return page.evaluate(() => (window as unknown as { cardFrames: [boolean, string | null][] }).cardFrames.splice(0));
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
      await watchCard(page);
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
      // At every frame since the turn at the top of the stair, the card showed exactly when the one look target was an artwork.
      const frames = await cardFrames(page);
      const apart = frames.flatMap(([shown, target], i) => (shown === (target === 'artwork') ? [] : [`frame ${String(i)}: card ${shown ? 'shown' : 'hidden'}, target ${String(target)}`]));
      expect(apart, 'frames where the card did not follow the look target').toEqual([]);
      expect(frames.some(([shown]) => shown) && frames.some(([shown]) => !shown), 'frames with the card and without it').toBe(true);

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
      const p = await triumphPixel(page, start);

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

    test('a clicked card goes when walk mode begins and does not come back when it ends', async ({ page }) => {
      const errors = watchErrors(page);
      await open(page, `autoplay=0&view=${PRESET}`);
      const p = await triumphPixel(page, await settledCamera(page));
      await page.mouse.click(p.x, p.y);
      await settle(page);
      expect((await facts(page)).label?.id, 'the clicked card').toBe(String(TRIUMPH));
      // Into walk mode by the Walk toggle: the walker stands on the plaza, looking at no artwork, and no card shows.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'walk' && !window.__met.walk.preparing && window.__met.walk.eye !== null);
      await settle(page);
      expect((await facts(page)).walk.target, 'the look target on the plaza').toBeNull();
      expect((await facts(page)).label, 'walking, the clicked card is gone').toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();
      // Out again by the toggle: the card clicked before walking does not come back.
      await press(page, 'walk-toggle');
      await page.waitForFunction(() => window.__met?.walk.mode === 'orbit');
      await settle(page);
      expect((await facts(page)).label, 'back in the orbit view').toBeNull();
      await expect(page.getByTestId('art-card')).toBeHidden();
      errors.expectClean();
    });
  });
}
