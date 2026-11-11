/**
 * The landmark cards' browser checks (the last block of ./labels.spec.ts; docs/design/spec.md, Collection: Fit-out pieces): Saint-Gaudens's Diana and
 * the Temple of Dendur are built by their halls' own fit-out steps, not as placeholders, and carry their Met object IDs as artwork tags, so the page
 * shows the artworks' card for them, looked at while walking and clicked in the orbit view.
 * - Walking (`walkToCard`): the walker stands at a fixed place before the piece (`spawn=x,y,z,tx,ty,tz`), looking at it: the card shows, the look
 *   target is that artwork within 6 m, and a drag that looks down at the floor hides it and one that looks back up shows it again.
 * - Orbit view (`clickForCard`): at the camera preset that shows the piece, a click on a pixel of it shows the card and moves no camera; Esc hides it.
 *   The pixel comes from the published camera and is checked apart from the page: nothing of the page covers it, and the first surface on its ray,
 *   cast through the finished model in the test process, lies on the piece.
 * The places, the aims and the click points are src/model/collection/fit-out-testing.ts's, which a unit test holds against the finished model. The
 * card's text is compared with the catalogue's record and, written out here, with what The Met's record said when it was fetched (2026-11-11), so a
 * card that showed another record, or a record that changed unseen, fails.
 * Red (2026-11-11): with Diana's figure added untagged, as it was before work unit 29, the click on her fails as the live page did: the label stays null.
 * Bound: 1280×720; the card's layout at both sizes, its link's click and the locked pointer are ./labels.spec.ts's own tests on the Triumph of Marius,
 * the same card. Nothing here writes the page's state; clicks and drags are real input.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Vector3 } from 'three';

import { fitOutEntryOf } from '../../src/model/collection/fit-out.js';
import { EYE, FIT_OUT_VIEWS } from '../../src/model/collection/fit-out-testing.js';
import type { FitOutView } from '../../src/model/collection/fit-out-testing.js';
import { ART_CREDIT, cardContent } from '../../src/ui/art-card.js';
import { cameraGap, facts, open, settle, settledCamera, watchErrors } from './helpers.js';
import { drag, onCanvas, pixelOf, recordRequests, surfaceAt } from './labels-helpers.js';
import { still, walking } from './route-walk.js';

/** What a landmark's card says, as The Met's record gave it on 2026-11-11: the maker is null where the record names no artist and no culture. */
interface CardText {
  readonly title: string;
  readonly maker: string | null;
  readonly date: string;
  readonly medium: string;
  readonly gallery: string;
  readonly size: string;
}

export interface Landmark {
  readonly name: string;
  readonly view: FitOutView;
  readonly card: CardText;
}

function viewOf(name: string): FitOutView {
  const view = FIT_OUT_VIEWS.find((v) => v.name === name);
  if (view === undefined) throw new Error(`src/model/collection/fit-out-testing.ts has no view named "${name}".`);
  return view;
}

/** The two landmarks driven in the browser, each by the view that stands before it and is clicked from a camera preset. */
export const LANDMARKS: readonly Landmark[] = [
  {
    name: 'Saint-Gaudens’s Diana',
    view: viewOf('Diana’s pedestal, from the court’s floor'),
    card: { title: 'Diana', maker: 'Augustus Saint-Gaudens', date: '1892–93, cast 1928', medium: 'Bronze, gilt', gallery: 'Gallery 700', size: 'H 258.4 × W 135.9 × D 35.9 cm' },
  },
  {
    name: 'the Temple of Dendur',
    view: viewOf('the Temple of Dendur, from its forecourt'),
    // The record names no maker; its date reads "completed by 10 CE", which the card shows as given.
    card: { title: 'The Temple of Dendur', maker: null, date: 'completed by 10 CE', medium: 'Aeolian sandstone', gallery: 'Gallery 131', size: 'H 640.1 × W 640.1 × D 1249.7 cm' },
  },
];

/** The card shows `landmark`'s record: every field as written out here and as the catalogue's entry gives it, with a plain link to its page in a new tab. */
async function expectCard(page: Page, landmark: Landmark): Promise<void> {
  const id = landmark.view.id;
  const content = cardContent(fitOutEntryOf(id));
  expect({ title: content.title, maker: content.maker, date: content.date, medium: content.medium, gallery: content.gallery, size: content.size }, `${landmark.name}: the catalogue's record`).toEqual(landmark.card);
  await expect(page.getByTestId('art-card')).toBeVisible();
  const text = async (testid: string): Promise<string> => (await page.getByTestId(testid).textContent()) ?? '';
  expect({ title: await text('art-title'), date: await text('art-date'), medium: await text('art-medium'), gallery: await text('art-gallery'), size: await text('art-size') }, `${landmark.name}: the card's text`).toEqual({
    title: landmark.card.title,
    date: landmark.card.date,
    medium: landmark.card.medium,
    gallery: landmark.card.gallery,
    size: landmark.card.size,
  });
  // The maker beside the date, or for a record that names none the date alone.
  if (landmark.card.maker === null) await expect(page.getByTestId('art-maker')).toBeHidden();
  else await expect(page.getByTestId('art-maker')).toHaveText(landmark.card.maker);
  expect(await text('art-credit')).toBe(ART_CREDIT);
  const link = page.getByTestId('art-link');
  await expect(link).toHaveText('View on metmuseum.org');
  await expect(link).toHaveAttribute('href', `https://www.metmuseum.org/art/collection/search/${String(id)}`);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
}

const labelOf = (landmark: Landmark): { id: string; title: string } => ({ id: String(landmark.view.id), title: landmark.card.title });

/** Walking: placed before `landmark`, looking at it, the card shows; a drag that looks down at the floor hides it, and one back up shows it again. */
export async function walkToCard(page: Page, landmark: Landmark): Promise<void> {
  const errors = watchErrors(page);
  const requests = recordRequests(page);
  const { feet, aim, id } = landmark.view;
  const loaded = await open(page, `walk=1&spawn=${[...feet, ...aim].map((n) => n.toFixed(4)).join(',')}`);
  expect(loaded.warnings, `${landmark.name}: the page's warnings`).toEqual([]);
  await walking(page);
  const at = await still(page);
  // The walker stands where the view says, its eye over the floor the view names.
  expect(Math.hypot(at.eye[0] - feet[0], at.eye[2] - feet[2]), `${landmark.name}: metres across from the place`).toBeLessThan(0.01);
  expect(Math.abs(at.eye[1] - (feet[1] + EYE)), `${landmark.name}: metres off the eye's height over its floor`).toBeLessThan(0.03);
  await page.waitForFunction((want) => window.__met?.label?.id === want, String(id), { polling: 'raf', timeout: 5000 });
  const f = await facts(page);
  expect(f.label).toEqual(labelOf(landmark));
  expect([f.walk.target?.kind, f.walk.target?.id], `${landmark.name}: the look target`).toEqual(['artwork', String(id)]);
  expect(f.walk.target?.distance ?? Number.POSITIVE_INFINITY, `${landmark.name}: within an artwork's reach`).toBeLessThanOrEqual(6);
  await expectCard(page, landmark);
  await expect(page.getByTestId('crosshair')).toHaveAttribute('data-target', 'artwork');
  // 600 px down, 45°, the eye looks at the floor 1.6 m before its feet, which is no artwork's: the card goes. Back up, it shows again.
  const box = await page.getByTestId('canvas').boundingBox();
  if (box === null) throw new Error('The canvas has no box.');
  const x = box.x + box.width / 2;
  const y = box.y + 60;
  await drag(page, x, y, 0, 600);
  await page.waitForFunction(() => window.__met?.label === null, undefined, { polling: 'raf', timeout: 5000 });
  await expect(page.getByTestId('art-card')).toBeHidden();
  expect((await facts(page)).walk.target, `${landmark.name}: looking at the floor`).toBeNull();
  await drag(page, x, y + 600, 0, -600);
  await page.waitForFunction((want) => window.__met?.label?.id === want, String(id), { polling: 'raf', timeout: 5000 });
  await expectCard(page, landmark);
  expect(requests.filter((url) => /metmuseum\.org/i.test(url)), `${landmark.name}: requests of the page to metmuseum.org`).toEqual([]);
  errors.expectClean();
}

/** Orbit view: at the preset that shows `landmark`, a click on a pixel of it shows its card and moves no camera; Esc hides it. */
export async function clickForCard(page: Page, landmark: Landmark): Promise<void> {
  const errors = watchErrors(page);
  const requests = recordRequests(page);
  const { orbit, click } = landmark.view;
  if (!('preset' in orbit)) throw new Error(`${landmark.name}: its view names no camera preset to click from.`);
  await open(page, `view=${orbit.preset}`);
  const start = await settledCamera(page);
  expect((await facts(page)).label, `${landmark.name}: no card before the click`).toBeNull();
  // The pixel of the click point, checked apart from the page: on the canvas, and the first surface on its ray is the piece, at the point meant.
  const point = new Vector3(...click);
  const p = await pixelOf(page, start, point);
  expect(await onCanvas(page, p.x, p.y), `${landmark.name}: nothing of the page covers its pixel (${String(p.x)}, ${String(p.y)})`).toBe(true);
  const met = await surfaceAt(page, start, p.x, p.y);
  expect(met !== null && met.distanceTo(point) < 0.3, `${landmark.name}: the first surface under (${String(p.x)}, ${String(p.y)}) lies within 0.3 m of the point meant, met at ${met === null ? 'nothing' : met.toArray().map((n) => n.toFixed(2)).join(', ')}`).toBe(true);
  await page.mouse.click(p.x, p.y);
  await settle(page);
  expect((await facts(page)).label, `${landmark.name}: after the click`).toEqual(labelOf(landmark));
  await expectCard(page, landmark);
  const f = await facts(page);
  expect(cameraGap(await settledCamera(page), start), `${landmark.name}: metres the click moved the camera`).toBeLessThan(1e-4);
  expect(f.view, `${landmark.name}: the preset still in view`).toBe(orbit.preset);
  await page.keyboard.press('Escape');
  await settle(page);
  expect((await facts(page)).label, `${landmark.name}: after Esc`).toBeNull();
  await expect(page.getByTestId('art-card')).toBeHidden();
  expect(requests.filter((url) => /metmuseum\.org/i.test(url)), `${landmark.name}: requests of the page to metmuseum.org`).toEqual([]);
  errors.expectClean();
}
