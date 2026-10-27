/**
 * The orbit view's click (src/viewer/click.ts; docs/design/spec.md, Collection: Labels) through its real handlers on a stand-in canvas and document:
 * - a press of the primary button, a pen or one finger released after travelling less than CLICK_SLOP pixels, summed over its moves as walk mode sums
 *   them, is a click at its release point; one that travels CLICK_SLOP or more is a drag and never a click, whatever way it comes back; so is a press of
 *   another button, one that a second pointer joins, one the browser cancels, and one pressed or released while walking;
 * - a click's moves never reach a listener on the document after its own, and a drag's do from the move that passes the slop on;
 * - through the real CameraRig (OrbitControls), a 2 px click leaves the camera where it was and reports no user move, which would turn the follow
 *   camera off and clear the preset in view, while a 6 px drag turns the camera and reports one (review 6, F25).
 * Bound: events as the browser dispatches them (pointer capture sends the moves and the release to the canvas, and through the document's capture
 * phase first); a listener added to the stand-in document after the click's own runs after it, as a bubbling one does in the page; no layout, no WebGL.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CLICK_SLOP } from '../walk/walk-mode.js';
import { CameraRig } from './camera-rig.js';
import { bindClick } from './click.js';

/** A canvas as far as the click, OrbitControls and the zoom's input read one: events, a size, a box and a document for the moves. */
class StandIn extends EventTarget {
  readonly style: Record<string, string> = {};
  readonly clientWidth = 1280;
  readonly clientHeight = 720;
  readonly ownerDocument = new EventTarget();
  getRootNode(): EventTarget {
    return this.ownerDocument;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number; x: number; y: number } {
    return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0 };
  }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

/** Dispatches a pointer event of `type` with `props` on `target`. */
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), props));
}

interface Pointer {
  readonly id?: number;
  readonly type?: 'mouse' | 'pen' | 'touch';
  readonly button?: number;
  readonly primary?: boolean;
}

const pointer = (x: number, y: number, p: Pointer = {}): Record<string, unknown> => ({ pointerId: p.id ?? 1, pointerType: p.type ?? 'mouse', button: p.button ?? 0, buttons: p.button === 2 ? 2 : 1, isPrimary: p.primary ?? true, clientX: x, clientY: y, ctrlKey: false, metaKey: false, shiftKey: false });

/**
 * A press at the first point of `path` on the canvas, moves through the rest on the document, and the release at its last on the canvas, then on the
 * document, where a release bubbles to.
 */
function press(element: StandIn, path: readonly (readonly [number, number])[], p: Pointer = {}): void {
  const [first = [0, 0]] = path;
  fire(element, 'pointerdown', pointer(...first, p));
  for (const [x, y] of path.slice(1, -1)) fire(element.ownerDocument, 'pointermove', pointer(x, y, p));
  const last = path.at(-1) ?? first;
  fire(element, 'pointerup', pointer(...last, p));
  fire(element.ownerDocument, 'pointerup', pointer(...last, p));
}

/** A stand-in canvas with bindClick on it, the clicks it reported, the moves a later document listener heard, and a switch for walk mode. */
function canvas(): { element: StandIn; clicks: [number, number][]; heard: [number, number][]; walking: (on: boolean) => void } {
  const element = new StandIn();
  const clicks: [number, number][] = [];
  const heard: [number, number][] = [];
  let walk = false;
  bindClick(element as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => !walk);
  element.ownerDocument.addEventListener('pointermove', (event) => {
    const e = event as unknown as { clientX: number; clientY: number };
    heard.push([e.clientX, e.clientY]);
  });
  return { element, clicks, heard, walking: (on) => { walk = on; } };
}

describe('the orbit view’s click', () => {
  it('is a press released where it was pressed, or within CLICK_SLOP of travel, at its release point', () => {
    const c = canvas();
    press(c.element, [[400, 300]]);
    press(c.element, [[400, 300], [401, 300], [402, 301]]);
    expect(CLICK_SLOP).toBe(5);
    // Out 2 px and back: 4 px of travel, under the slop, wherever it ends.
    press(c.element, [[100, 100], [102, 100], [100, 100]]);
    expect(c.clicks).toEqual([[400, 300], [402, 301], [100, 100]]);
    expect(c.heard, 'no move of a click reached the listener after it').toEqual([]);
  });

  it('is never a drag: CLICK_SLOP of travel or more, out and back, or straight to the release; a drag’s moves go on from the one that passes the slop', () => {
    const c = canvas();
    press(c.element, [[400, 300], [403, 300], [400, 300]]);
    press(c.element, [[400, 300], [405, 300]]);
    press(c.element, [[400, 300], [440, 300], [440, 340]]);
    press(c.element, [[400, 300], [402, 300], [398, 299]]);
    expect(c.clicks).toEqual([]);
    expect(c.heard, 'of these, only the 40 px move passed the slop').toEqual([[440, 300]]);
    c.heard.length = 0;
    // 3 px held, then the move to 6 px passes the slop and goes on, as does every move after it.
    press(c.element, [[0, 0], [3, 0], [6, 0], [9, 0], [9, 0]]);
    expect(c.heard).toEqual([[6, 0], [9, 0]]);
  });

  it('counts a pen and one finger, and no other button, no non-primary pointer and no press another pointer joins or the browser cancels', () => {
    const c = canvas();
    const e = c.element;
    press(e, [[10, 10]], { type: 'pen' });
    press(e, [[20, 20]], { type: 'touch', id: 7 });
    press(e, [[30, 30]], { button: 2 });
    press(e, [[40, 40]], { button: 1 });
    press(e, [[50, 50]], { type: 'touch', id: 8, primary: false });
    // A pinch: a second finger goes down during the first one's press, and both lift where they went down; its moves are never held.
    fire(e, 'pointerdown', pointer(60, 60, { type: 'touch', id: 3 }));
    fire(e, 'pointerdown', pointer(90, 60, { type: 'touch', id: 4, primary: false }));
    fire(e.ownerDocument, 'pointermove', pointer(61, 60, { type: 'touch', id: 3 }));
    fire(e, 'pointerup', pointer(90, 60, { type: 'touch', id: 4, primary: false }));
    fire(e, 'pointerup', pointer(61, 60, { type: 'touch', id: 3 }));
    expect(c.heard, 'the pinch’s move').toEqual([[61, 60]]);
    // A press the browser cancels.
    fire(e, 'pointerdown', pointer(70, 70, { type: 'touch', id: 5 }));
    fire(e, 'pointercancel', pointer(70, 70, { type: 'touch', id: 5 }));
    fire(e, 'pointerup', pointer(70, 70, { type: 'touch', id: 5 }));
    expect(c.clicks).toEqual([[10, 10], [20, 20]]);
    // Each refused press left nothing behind: the next click counts.
    press(e, [[80, 80]]);
    expect(c.clicks.at(-1)).toEqual([80, 80]);
  });

  it('is never one while walking, pressed or released then, and holds no move while walking', () => {
    const c = canvas();
    c.walking(true);
    press(c.element, [[10, 10], [11, 10], [11, 10]]);
    expect(c.heard, 'walk mode’s look hears every move').toEqual([[11, 10]]);
    // Pressed in the orbit view, released after walk mode began.
    c.walking(false);
    fire(c.element, 'pointerdown', pointer(20, 20));
    c.walking(true);
    fire(c.element, 'pointerup', pointer(20, 20));
    c.walking(false);
    press(c.element, [[30, 30]]);
    expect(c.clicks).toEqual([[30, 30]]);
  });

  it('moves no camera and reports no user move through the real rig, while a drag past the slop turns the camera', () => {
    const element = new StandIn();
    const rig = new CameraRig(element as unknown as HTMLElement, 0);
    rig.resize(1280, 720, 0);
    rig.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
    let moves = 0;
    rig.onUserMove = () => {
      moves += 1;
    };
    // Bound after the rig, as src/main.ts binds it: the controls' press listener runs first and adds their move listener to the document after this one.
    const clicks: [number, number][] = [];
    bindClick(element as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => true);
    const before = rig.camera.position.clone();
    press(element, [[640, 360], [641, 360], [642, 360], [642, 360]]);
    for (let frame = 0; frame < 30; frame += 1) rig.update();
    expect(clicks, 'a 2 px press is a click').toEqual([[642, 360]]);
    expect(rig.camera.position.distanceTo(before), 'metres the click moved the camera').toBe(0);
    expect(moves, 'user moves the click reported').toBe(0);
    press(element, [[640, 360], [643, 360], [646, 360], [646, 360]]);
    for (let frame = 0; frame < 30; frame += 1) rig.update();
    expect(clicks.length, 'a 6 px press is no click').toBe(1);
    expect(rig.camera.position.distanceTo(before), 'metres the drag turned the camera').toBeGreaterThan(0.05);
    expect(moves, 'user moves the drag reported').toBeGreaterThan(0);
  });
});
