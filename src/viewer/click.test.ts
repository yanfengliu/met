/**
 * The orbit view's click (src/viewer/click.ts; docs/design/spec.md, Collection: Labels) through its real handlers on a stand-in element: a press of the
 * primary button, a pen or one finger released after travelling less than CLICK_SLOP pixels, summed over its moves as walk mode sums them, is a click
 * at its release point; one that travels CLICK_SLOP or more is a drag and never a click, whatever way it comes back; so is a press of another button,
 * one that a second pointer joins, one the browser cancels, and one pressed or released while walking.
 * Bound: events as the browser dispatches them to the canvas (pointer capture sends the moves and the release there); no layout, no WebGL.
 */
import { describe, expect, it } from 'vitest';

import { CLICK_SLOP } from '../walk/walk-mode.js';
import { bindClick } from './click.js';

/** Dispatches a pointer event of `type` with `props` on `target`. */
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type), props));
}

interface Pointer {
  readonly id?: number;
  readonly type?: 'mouse' | 'pen' | 'touch';
  readonly button?: number;
  readonly primary?: boolean;
}

/** A stand-in canvas with bindClick on it, the clicks it reported, and a way to switch walk mode on (`active` false). */
function canvas(): { press: (path: readonly (readonly [number, number])[], pointer?: Pointer) => void; target: EventTarget; clicks: [number, number][]; walking: (on: boolean) => void } {
  const target = new EventTarget();
  const clicks: [number, number][] = [];
  let walk = false;
  bindClick(target as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => !walk);
  /** A press at the first point of `path`, moves through the rest, and the release at its last. */
  const press = (path: readonly (readonly [number, number])[], pointer: Pointer = {}): void => {
    const props = (x: number, y: number): Record<string, unknown> => ({ pointerId: pointer.id ?? 1, pointerType: pointer.type ?? 'mouse', button: pointer.button ?? 0, isPrimary: pointer.primary ?? true, clientX: x, clientY: y });
    const [first = [0, 0]] = path;
    fire(target, 'pointerdown', props(...first));
    for (const [x, y] of path.slice(1, -1)) fire(target, 'pointermove', props(x, y));
    const last = path.at(-1) ?? first;
    fire(target, 'pointerup', props(...last));
  };
  return { press, target, clicks, walking: (on) => { walk = on; } };
}

describe('the orbit view’s click', () => {
  it('is a press released where it was pressed, or within CLICK_SLOP of travel, at its release point', () => {
    const c = canvas();
    c.press([[400, 300]]);
    c.press([[400, 300], [401, 300], [402, 301]]);
    expect(CLICK_SLOP).toBe(5);
    // Out 2 px and back: 4 px of travel, under the slop, wherever it ends.
    c.press([[100, 100], [102, 100], [100, 100]]);
    expect(c.clicks).toEqual([[400, 300], [402, 301], [100, 100]]);
  });

  it('is never a drag: CLICK_SLOP of travel or more, out and back, or straight to the release', () => {
    const c = canvas();
    c.press([[400, 300], [403, 300], [400, 300]]);
    c.press([[400, 300], [405, 300]]);
    c.press([[400, 300], [440, 300], [440, 340]]);
    c.press([[400, 300], [402, 300], [398, 299]]);
    expect(c.clicks).toEqual([]);
  });

  it('counts a pen and one finger, and no other button, no non-primary pointer and no press another pointer joins or the browser cancels', () => {
    const c = canvas();
    c.press([[10, 10]], { type: 'pen' });
    c.press([[20, 20]], { type: 'touch', id: 7 });
    c.press([[30, 30]], { button: 2 });
    c.press([[40, 40]], { button: 1 });
    c.press([[50, 50]], { type: 'touch', id: 8, primary: false });
    // A pinch: a second finger goes down during the first one's press, and both lift where they went down.
    fire(c.target, 'pointerdown', { pointerId: 3, pointerType: 'touch', button: 0, isPrimary: true, clientX: 60, clientY: 60 });
    fire(c.target, 'pointerdown', { pointerId: 4, pointerType: 'touch', button: 0, isPrimary: false, clientX: 90, clientY: 60 });
    fire(c.target, 'pointerup', { pointerId: 4, pointerType: 'touch', button: 0, isPrimary: false, clientX: 90, clientY: 60 });
    fire(c.target, 'pointerup', { pointerId: 3, pointerType: 'touch', button: 0, isPrimary: true, clientX: 60, clientY: 60 });
    // A press the browser cancels.
    fire(c.target, 'pointerdown', { pointerId: 5, pointerType: 'touch', button: 0, isPrimary: true, clientX: 70, clientY: 70 });
    fire(c.target, 'pointercancel', { pointerId: 5, pointerType: 'touch', button: 0, isPrimary: true, clientX: 70, clientY: 70 });
    fire(c.target, 'pointerup', { pointerId: 5, pointerType: 'touch', button: 0, isPrimary: true, clientX: 70, clientY: 70 });
    expect(c.clicks).toEqual([[10, 10], [20, 20]]);
    // Each refused press left nothing behind: the next click counts.
    c.press([[80, 80]]);
    expect(c.clicks.at(-1)).toEqual([80, 80]);
  });

  it('is never one while walking, pressed or released then', () => {
    const c = canvas();
    c.walking(true);
    c.press([[10, 10]]);
    // Pressed in the orbit view, released after walk mode began.
    c.walking(false);
    fire(c.target, 'pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 20, clientY: 20 });
    c.walking(true);
    fire(c.target, 'pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 20, clientY: 20 });
    c.walking(false);
    c.press([[30, 30]]);
    expect(c.clicks).toEqual([[30, 30]]);
  });
});
