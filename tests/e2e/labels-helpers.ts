/**
 * Helpers of the artwork-card tests (./labels.spec.ts, ./labels-view.spec.ts): the Triumph of Marius in gallery 600 as the collection's placements put it
 * (src/model/collection/spaces-b.ts), the pixel a world point projects to under the published camera and the first surface under a pixel, cast through the
 * finished model built in the test process (./surface.ts) apart from the page; the card's fields and link as the page shows them; and the layout boxes the
 * card is checked against. Nothing here writes the page's state; clicks and drags are real input.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Box3, PerspectiveCamera, Vector3 } from 'three';

import { entryOf, stepArtworks } from '../../src/model/collection/place.js';
import { SPACES_A } from '../../src/model/collection/spaces-a.js';
import { SPACES_B, europeanPaintingsSpace } from '../../src/model/collection/spaces-b.js';
import { ART_CREDIT, cardContent } from '../../src/ui/art-card.js';
import type { Camera } from './helpers.js';
import { firstSurface } from './surface.js';

export const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;
export const TRIUMPH = 437788;
export const PRESET = 'int-european-paintings-600';
/** The door prompt's place under the crosshair, which the folded walking screen keeps clear (src/ui/styles.ts): from the centre down 80 px, 320 px wide. */
export const BAND = { halfWidth: 160, above: 8, below: 80 } as const;

export interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly clipped: boolean;
}

/** Boxes of every visible element with a data-testid among `ids`, by layout, and whether each clips its content. */
export async function boxes(page: Page, ids: readonly string[]): Promise<Box[]> {
  return page.evaluate((list) => list.flatMap((id) => Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)).flatMap((e) => {
    if (e.getClientRects().length === 0 || getComputedStyle(e).visibility === 'hidden') return [];
    const r = e.getBoundingClientRect();
    return [{ id, x: r.x, y: r.y, w: r.width, h: r.height, clipped: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 }];
  })), ids);
}

export const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** The card's box among `list`, inside the viewport, unclipped (crosshair aside) and apart from every other box. */
export function expectLaidOut(list: readonly Box[], viewport: { width: number; height: number }, what: string): Box {
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
export const ORBIT_CONTROLS = ['step-label', 'step-detail', 'scrubber', 'btn-start', 'btn-step-back', 'btn-play-backward', 'btn-play', 'btn-step-forward', 'btn-end', 'speed-0.5', 'speed-1', 'speed-2', 'speed-4', 'replay-close', 'walk-toggle', 'chapter-menu-button', 'view-menu-button', 'floor-all', 'floor-ground', 'floor-main', 'floor-second', 'floor-roof-garden', 'art-card'];
export const WALK_CONTROLS = ['chapter-menu-button', 'view-menu-button', 'bar-toggle', 'walk-toggle', 'crosshair', 'walk-status', 'art-card'];

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
export async function pixelOf(page: Page, c: Camera, p: Vector3): Promise<{ x: number; y: number }> {
  const { cam, box } = await projection(page, c);
  const ndc = p.clone().project(cam);
  return { x: Math.round(box.x + ((ndc.x + 1) / 2) * box.width), y: Math.round(box.y + ((1 - ndc.y) / 2) * box.height) };
}

/** Where the ray under pixel (x, y) first meets the finished model, cast in the test process (./surface.ts), or null over open sky. */
export async function surfaceAt(page: Page, c: Camera, x: number, y: number): Promise<Vector3 | null> {
  const { cam, box } = await projection(page, c);
  const d = new Vector3(((x - box.x) / box.width) * 2 - 1, -((y - box.y) / box.height) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
  const t = firstSurface(c.position, [d.x, d.y, d.z]);
  return t === null ? null : new Vector3(...c.position).addScaledVector(d, t);
}

/** Every artwork's pieces' world bounds, by object ID: the unit boxes their forms fill (src/model/collection/kinds.ts), at their final matrices. */
export function artworkBounds(): Map<number, Box3> {
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
export function triumph(): { readonly box: Box3; readonly middle: Vector3 } {
  const at = europeanPaintingsSpace.placements.findIndex((p) => p.id === TRIUMPH);
  const object = stepArtworks(europeanPaintingsSpace).pieces[at]?.[0];
  if (object === undefined) throw new Error(`No object piece for ${String(TRIUMPH)} in gallery 600's step.`);
  const box = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5)).applyMatrix4(object.matrix);
  return { box, middle: new Vector3(0, 0.5, 0.5).applyMatrix4(object.matrix) };
}

/**
 * A walk place `metres` straight out from the Triumph's face, on gallery 600's floor at `floorY`, looking at the middle of its face: the feet and the
 * target for `spawn=x,y,z,tx,ty,tz` (src/walk/spawns.ts `placeOf`). Out is from the canvas's middle through its face's middle, laid level.
 */
export function triumphFront(metres: number, floorY: number): { readonly feet: readonly number[]; readonly target: readonly number[] } {
  const { box, middle } = triumph();
  const out = middle.clone().sub(box.getCenter(new Vector3())).setY(0).normalize();
  const feet = middle.clone().addScaledVector(out, metres).setY(floorY);
  return { feet: feet.toArray(), target: middle.toArray() };
}

/**
 * The Triumph's pixel under camera `c`, checked apart from the page: nothing of the page covers it, and the first surface along its ray, cast through
 * the finished model in the test process, lies on the painting.
 */
export async function triumphPixel(page: Page, c: Camera): Promise<{ x: number; y: number }> {
  const { box: painting, middle } = triumph();
  const p = await pixelOf(page, c, middle);
  expect(await onCanvas(page, p.x, p.y), 'nothing of the page covers the painting’s pixel').toBe(true);
  const met = await surfaceAt(page, c, p.x, p.y);
  expect(met !== null && painting.clone().expandByScalar(0.01).containsPoint(met), `the first surface under (${String(p.x)}, ${String(p.y)}) is the painting: met at ${met === null ? 'nothing' : met.toArray().map((v) => v.toFixed(2)).join(', ')}`).toBe(true);
  return p;
}

/** The element at (x, y) is the canvas: no control or card lies over the pixel a click goes to. */
export async function onCanvas(page: Page, x: number, y: number): Promise<boolean> {
  return page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName === 'CANVAS', [x, y] as const);
}

/** The card's fields as the page shows them. */
async function cardText(page: Page): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of ['art-title', 'art-maker', 'art-date', 'art-medium', 'art-gallery', 'art-size', 'art-credit', 'art-link']) out[id] = (await page.getByTestId(id).textContent()) ?? '';
  return out;
}

/** The card shows the Triumph of Marius, every field as its catalogue entry gives it, and its link is a plain anchor to its page in a new tab. */
export async function expectTriumphCard(page: Page): Promise<void> {
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
export function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

/** Drags across the canvas with the primary button from (x, y) by (dx, dy) in 20-pixel moves: a look in walk mode, an orbit in the orbit view. */
export async function drag(page: Page, x: number, y: number, dx: number, dy: number): Promise<void> {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 20));
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let k = 1; k <= steps; k += 1) await page.mouse.move(x + (dx * k) / steps, y + (dy * k) / steps);
  await page.mouse.up();
}
