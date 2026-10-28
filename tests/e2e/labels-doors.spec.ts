/**
 * The artwork's card and the door prompt never show at once (docs/design/spec.md, Collection: Labels, Place; review 7, F30), through real input on the
 * finished building. From the plaza, where the Walk toggle puts the walker, held keys at a run walk up the front steps to 1.3 m before the entrance's
 * middle doorway, and drags turn the eye onto its right leaf (straight ahead it looks between the pair's leaves), where the prompt says "E Open", and E
 * opens the door, whose leaves are solid (work unit 2, M2b). Then, turned back down the axis, the walker goes on through the doorway, across the Great
 * Hall on route R1 and up the Grand Staircase into gallery 600 on R5, before Tiepolo's Triumph of Marius, whose card shows. Turned round, it walks back
 * down to 1.3 m inside the same doorway, and drags turn the eye onto the right leaf, open against its jamb, where the prompt, "E Close", shows again. At every frame drawn, read from the page's
 * DOM, the card and the prompt never both show; there are frames with the prompt and no card before the card and after it, and frames with the card and
 * no prompt; the prompt shows only with a door under the crosshair, saying "E Open" or "E Close", and the card only with an artwork.
 * Bound: 1280×720; one doorway and one painting (the Engelhard Court's Bank door, the one other door near artworks, is locked, and stands at the end of
 * route R6, which this walk does not take); frames are read by a requestAnimationFrame loop beside the page's own,
 * which runs after it in each frame and writes nothing.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { Vec3 } from '../../src/build/types.js';
import { ENTRANCE_DOOR_Z } from '../../src/model/hunt/arches.js';
import { reversed, ROUTE_R1, ROUTE_R5 } from '../../src/model/hunt/routes.js';
import { facts, open, press, watchErrors } from './helpers.js';
import { doorIs, entranceLeaves, MIDDLE_DOOR } from './route-walk.js';
import { TRIUMPH } from './labels-helpers.js';
import { face, legs, MINUS_Z, PLUS_Z, walk, walking } from './route-walk.js';
import type { Sample, XZ } from './route-walk.js';

/** One frame as drawn: whether the card and the prompt show, the prompt's words, and the crosshair's look target kind. */
interface Screen {
  readonly card: boolean;
  readonly prompt: boolean;
  readonly words: string;
  readonly target: string | null;
}

/** Starts recording every frame the page draws (`Screen`). */
async function watchScreen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { screens?: Screen[] };
    const screens: Screen[] = [];
    w.screens = screens;
    const shown = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const tick = (): void => {
      const card = shown('art-card');
      const prompt = shown('door-prompt');
      screens.push({ card: card !== null && !card.hidden, prompt: prompt !== null && !prompt.hidden, words: prompt?.textContent ?? '', target: shown('crosshair')?.getAttribute('data-target') ?? null });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function screens(page: Page): Promise<Screen[]> {
  return page.evaluate(() => (window as unknown as { screens: Screen[] }).screens.splice(0));
}

/** The yaw that faces the plan point (x, z) from the eye (src/walk/walker.ts: yaw 0 looks toward −Z, growing to the left). */
const toward = (eye: Vec3, x: number, z: number): number => Math.atan2(-(x - eye[0]), -(z - eye[2]));

/** Turns by drags from `eye` onto the plan point (x, z) of the middle doorway's right leaf (closed: X 0.004..0.652), and waits for its prompt, `text`. */
async function lookAtTheDoor(page: Page, eye: Vec3, x: number, z: number, text: string): Promise<void> {
  await face(page, toward(eye, x, z));
  await page.waitForFunction(() => window.__met?.walk.target?.id === 'hunt-entrance-middle', undefined, { timeout: 3000 });
  await expect(page.getByTestId('door-prompt')).toHaveText(text);
}

test.describe('the card and the door prompt', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test.setTimeout(300_000);

  test('never show at once: from the plaza to the entrance’s middle doors, on to the Triumph of Marius, and back to the doors', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, '');
    await press(page, 'walk-toggle');
    const start = await walking(page);
    expect((await facts(page)).walk.spawn, 'the Walk toggle starts on the plaza').toBe('plaza');
    await watchScreen(page);
    const samples: Sample[] = [start];
    const outside: XZ = [0, ENTRANCE_DOOR_Z + 1.3];
    const inside: XZ = [0, ENTRANCE_DOOR_Z - 1.3];
    // Up the front steps to the doors, and onto the right leaf: the prompt.
    const before = await walk(page, 'up to the doors', legs([[start.eye[0], start.eye[2]], outside], MINUS_Z), samples);
    await lookAtTheDoor(page, before.eye, 0.35, ENTRANCE_DOOR_Z, 'E Open');
    await page.keyboard.press('KeyE');
    await doorIs(page, MIDDLE_DOOR, 'open');
    // Down the axis again, through the doorway, across the hall, up the Grand Staircase into gallery 600, facing its far wall: the card.
    await face(page, 0);
    await walk(page, 'to gallery 600', legs([outside, ...ROUTE_R1.points.slice(1), ...ROUTE_R5.points.slice(1)], MINUS_Z), samples);
    await page.waitForFunction((id) => window.__met?.label?.id === id, String(TRIUMPH), { polling: 'raf', timeout: 5000 });
    const there = await screens(page);
    // Turned round, back down the stair and across the hall to the doorway's inside, and onto the right leaf's back: the prompt again.
    await face(page, Math.PI);
    const back = await walk(page, 'back to the doors', legs([...reversed(ROUTE_R5).points, ...reversed(ROUTE_R1).points.slice(1, -1), inside], PLUS_Z), samples);
    // The open right leaf stands against its jamb, 0.3 m behind the leaves' back face along it.
    await lookAtTheDoor(page, back.eye, 0.6, entranceLeaves().back - 0.3, 'E Close');
    const after = await screens(page);
    const all = [...there, ...after];
    const both = all.flatMap((s, i) => (s.card && s.prompt ? [`frame ${String(i)}: the card and the prompt "${s.words}" both show, target ${String(s.target)}`] : []));
    expect(both.slice(0, 5), `frames where the card and the door prompt both show (${String(both.length)})`).toEqual([]);
    const promptOnly = (s: Screen): boolean => s.prompt && !s.card;
    const cardOnly = (s: Screen): boolean => s.card && !s.prompt;
    const firstCard = there.findIndex((s) => s.card);
    console.log(`the card and the prompt: ${String(all.length)} frames; the prompt alone in ${String(there.filter(promptOnly).length)} going in and ${String(after.filter(promptOnly).length)} coming back, the card alone in ${String(all.filter(cardOnly).length)}`);
    expect(firstCard, 'the card shows going in').toBeGreaterThan(-1);
    expect(there.slice(0, firstCard).some(promptOnly), 'frames with the prompt and no card before the card').toBe(true);
    expect(after.some(promptOnly), 'frames with the prompt and no card after the card').toBe(true);
    expect(all.some(cardOnly), 'frames with the card and no prompt').toBe(true);
    expect(all.filter((s) => s.prompt).every((s) => s.target === 'door' && /^E (Open|Close)$/.test(s.words)), 'the prompt only with a door under the crosshair, saying E Open or E Close').toBe(true);
    expect(all.filter((s) => s.card).every((s) => s.target === 'artwork'), 'the card only with an artwork under the crosshair').toBe(true);
    errors.expectClean();
  });
});
