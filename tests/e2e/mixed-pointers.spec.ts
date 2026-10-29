/**
 * Mixed mouse and touch on the orbit view through the browser's own input (docs/design/spec.md, Camera; work unit 10; work unit 2, review 11, F39):
 * the mouse by Playwright's (CDP Input.dispatchMouseEvent), the fingers by CDP Input.dispatchTouchEvent, at the aerial-ne preset.
 * - A finger lands during a mouse drag, moves and lifts, and the mouse drags on: no uncaught exception or console error, and the camera ends where the
 *   same mouse drag alone puts it.
 * - A mouse presses during a finger's drag, the finger drags on and lifts first, and the mouse drags and is released: none either, and the camera ends
 *   where the same finger drag alone puts it.
 * Red proofs: docs/learning/gate-proofs.md ("Mixed pointer input reaches the orbit view's camera input").
 * Bound: 1280×720 with touch; each drag starts from the preset chosen again from the view menu; cameras compared within 1 cm once settled, where the
 * drags themselves move the camera hundreds of metres.
 */
import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

import { cameraGap, choosePreset, open, settledCamera, watchErrors } from './helpers.js';
import type { Camera } from './helpers.js';

const PRESET = 'aerial-ne';

/** One step of a drag: the mouse pressed, moved or released at (x, y), or the finger's touch started, moved or ended at (x, y). */
type Step = readonly ['mouse' | 'finger', 'down' | 'move' | 'up', number, number];

/** Chooses the preset again, plays `steps` and returns the settled camera. */
async function play(page: Page, cdp: CDPSession, steps: readonly Step[]): Promise<Camera> {
  await choosePreset(page, PRESET);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('view-menu')).toBeHidden();
  await settledCamera(page);
  for (const [who, what, x, y] of steps) {
    if (who === 'mouse') {
      await page.mouse.move(x, y);
      if (what === 'down') await page.mouse.down();
      if (what === 'up') await page.mouse.up();
    } else {
      const type = what === 'down' ? 'touchStart' : what === 'move' ? 'touchMove' : 'touchEnd';
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: what === 'up' ? [] : [{ id: 1, x, y }] });
    }
  }
  return settledCamera(page);
}

/** The mouse's drag: pressed at (640, 300) and moved 60 px right in six moves, released there. */
const mouseDrag = (from: number, to: number): Step[] => Array.from({ length: to - from }, (_, k): Step => ['mouse', 'move', 640 + 10 * (from + k + 1), 300]);
/** The finger's drag: touched at (300, 500) and moved 60 px right in six moves. */
const fingerDrag = (from: number, to: number): Step[] => Array.from({ length: to - from }, (_, k): Step => ['finger', 'move', 300 + 10 * (from + k + 1), 500]);

test.describe('mixed mouse and touch on the orbit view', () => {
  test.use({ hasTouch: true });
  test.setTimeout(90_000);

  test('a finger joining a mouse drag, and a mouse joining a finger’s drag that lifts first, throw nothing and turn the view as the pointer that holds it alone', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, `autoplay=0&view=${PRESET}`);
    const cdp = await page.context().newCDPSession(page);
    const start = await settledCamera(page);
    // A finger lands during a mouse drag, moves and lifts; the mouse drags on.
    const mouseAlone = await play(page, cdp, [['mouse', 'down', 640, 300], ...mouseDrag(0, 6), ['mouse', 'up', 700, 300]]);
    const fingerJoins = await play(page, cdp, [
      ['mouse', 'down', 640, 300], ...mouseDrag(0, 2), ['finger', 'down', 300, 500], ['finger', 'move', 340, 520], ...mouseDrag(2, 4), ['finger', 'up', 340, 520],
      ...mouseDrag(4, 6), ['mouse', 'up', 700, 300],
    ]);
    // A mouse presses during a finger's drag; the finger drags on and lifts first; the mouse drags and is released.
    const fingerAlone = await play(page, cdp, [['finger', 'down', 300, 500], ...fingerDrag(0, 6), ['finger', 'up', 360, 500]]);
    const mouseJoins = await play(page, cdp, [
      ['finger', 'down', 300, 500], ...fingerDrag(0, 3), ['mouse', 'down', 640, 300], ...fingerDrag(3, 6), ['finger', 'up', 360, 500], ['mouse', 'move', 700, 340],
      ['mouse', 'up', 700, 340],
    ]);
    await cdp.detach();
    errors.expectClean();
    expect(cameraGap(mouseAlone, start), 'metres the mouse drag alone moved the camera').toBeGreaterThan(10);
    expect(cameraGap(fingerAlone, start), 'metres the finger drag alone moved the camera').toBeGreaterThan(10);
    expect(cameraGap(fingerJoins, mouseAlone), 'metres from where the mouse drag alone put the camera, the finger joining it').toBeLessThan(0.01);
    expect(cameraGap(mouseJoins, fingerAlone), 'metres from where the finger drag alone put the camera, the mouse joining it').toBeLessThan(0.01);
  });
});
