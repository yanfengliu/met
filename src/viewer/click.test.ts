/**
 * The orbit view's click (src/viewer/click.ts; docs/design/spec.md, Collection: Labels) through its real handlers on a stand-in canvas and document
 * that pass each event as the page does to a captured pointer's target: the document's capture listeners, the canvas's, then the document's others.
 * - A press of the primary button, a pen or one finger released after travelling less than CLICK_SLOP pixels, summed over its moves as walk mode sums
 *   them, is a click at its release point; one that travels CLICK_SLOP or more is a drag and never a click, whatever way it comes back; so is a press of
 *   another button, one that a second pointer joins, one the browser cancels, and one pressed or released while walking.
 * - A click's moves never reach a listener after the click's own; a drag's do from the move that passes the slop on.
 * - Through the real CameraRig (OrbitControls and the zoom's input), a 2 px click leaves the camera where it was and reports no user move, which would
 *   turn the follow camera off and clear the preset in view, while a 6 px drag turns the camera and reports one (review 6, F25); and a pinch whose
 *   first finger moved under the slop before the second landed zooms by the same factors as on a rig with no click bound, and comes to rest with the
 *   camera where that rig's does, its first finger's held move sent on before the second finger's press (review 7, F29: at e06cc70 the first factor
 *   was 44/39 for 40/39).
 * Bound: the stand-in's listeners run in the order they were added within each phase; no layout, no WebGL; touch pointers carry page and client
 * coordinates alike, as on a page that does not scroll.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CLICK_SLOP } from '../walk/walk-mode.js';
import { CameraRig } from './camera-rig.js';
import { bindClick } from './click.js';

type Handler = (event: unknown) => void;
interface Entry {
  readonly type: string;
  readonly fn: Handler;
  readonly capture: boolean;
}
type Options = boolean | { readonly capture?: boolean; readonly passive?: boolean } | undefined;
const captureOf = (options: Options): boolean => (typeof options === 'boolean' ? options : options?.capture === true);

/** An event target that keeps its listeners in the order they were added, with their phase, for the canvas's dispatch to walk. */
class Target {
  readonly entries: Entry[] = [];
  addEventListener(type: string, fn: Handler, options?: Options): void {
    this.entries.push({ type, fn, capture: captureOf(options) });
  }
  removeEventListener(type: string, fn: Handler, options?: Options): void {
    const capture = captureOf(options);
    const i = this.entries.findIndex((e) => e.type === type && e.fn === fn && e.capture === capture);
    if (i !== -1) this.entries.splice(i, 1);
  }
}

/** A pointer event as the listeners read it, with the propagation flags the canvas's dispatch honours. */
interface Pointer {
  type: string;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly button: number;
  readonly buttons: number;
  readonly isPrimary: boolean;
  readonly clientX: number;
  readonly clientY: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly ctrlKey: false;
  readonly metaKey: false;
  readonly shiftKey: false;
  stopped: boolean;
  immediate: boolean;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  preventDefault(): void;
}

/** A canvas as far as the click, OrbitControls and the zoom's input read one: events with their phases, a size, a box and a document. */
class Canvas extends Target {
  readonly ownerDocument = new Target();
  readonly style: Record<string, string> = {};
  readonly clientWidth = 1280;
  readonly clientHeight = 720;
  getRootNode(): Target {
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
  /** Sends `event` to the document's capture listeners, then the canvas's, then the document's others, as far as it is let through. */
  dispatchEvent(event: Pointer): boolean {
    event.stopped = false;
    event.immediate = false;
    const run = (target: Target, keep: (e: Entry) => boolean): void => {
      for (const entry of [...target.entries]) {
        if (entry.type !== event.type || !keep(entry)) continue;
        entry.fn(event);
        if (event.immediate) return;
      }
    };
    // Read through a call: a listener may have stopped the event since.
    const stopped = (): boolean => event.stopped;
    run(this.ownerDocument, (e) => e.capture);
    if (!stopped()) run(this, () => true);
    if (!stopped()) run(this.ownerDocument, (e) => !e.capture);
    return true;
  }
}

interface Kind {
  readonly id?: number;
  readonly type?: 'mouse' | 'pen' | 'touch';
  readonly button?: number;
  readonly primary?: boolean;
}

function pointer(type: string, x: number, y: number, k: Kind = {}): Pointer {
  const button = type === 'pointermove' ? -1 : (k.button ?? 0);
  return {
    type, pointerId: k.id ?? 1, pointerType: k.type ?? 'mouse', button, buttons: type === 'pointerup' ? 0 : k.button === 2 ? 2 : 1, isPrimary: k.primary ?? true,
    clientX: x, clientY: y, pageX: x, pageY: y, ctrlKey: false, metaKey: false, shiftKey: false, stopped: false, immediate: false,
    stopPropagation() { this.stopped = true; },
    stopImmediatePropagation() { this.stopped = true; this.immediate = true; },
    preventDefault() {},
  };
}

const fire = (canvas: Canvas, type: string, x: number, y: number, k: Kind = {}): void => {
  canvas.dispatchEvent(pointer(type, x, y, k));
};

/** A press at the first point of `path`, moves through the rest, and the release at its last. */
function press(canvas: Canvas, path: readonly (readonly [number, number])[], k: Kind = {}): void {
  const [first = [0, 0]] = path;
  fire(canvas, 'pointerdown', ...first, k);
  for (const [x, y] of path.slice(1, -1)) fire(canvas, 'pointermove', x, y, k);
  const last = path.at(-1) ?? first;
  fire(canvas, 'pointerup', ...last, k);
}

/** A stand-in canvas with bindClick on it, the clicks it reported, the moves a later document listener heard, and a switch for walk mode. */
function clicking(): { canvas: Canvas; clicks: [number, number][]; heard: [number, number][]; walking: (on: boolean) => void } {
  const canvas = new Canvas();
  const clicks: [number, number][] = [];
  const heard: [number, number][] = [];
  let walk = false;
  bindClick(canvas as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => !walk);
  canvas.ownerDocument.addEventListener('pointermove', (event) => {
    const e = event as Pointer;
    heard.push([e.clientX, e.clientY]);
  });
  return { canvas, clicks, heard, walking: (on) => { walk = on; } };
}

/** A rig on a stand-in canvas, looking at the origin from 30 m, as src/main.ts makes it; with `click`, bindClick bound after it as there. */
function rig(click: boolean): { rig: CameraRig; canvas: Canvas; clicks: [number, number][]; moves: () => number } {
  const canvas = new Canvas();
  const r = new CameraRig(canvas as unknown as HTMLElement, 0);
  r.resize(1280, 720, 0);
  r.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
  let moves = 0;
  r.onUserMove = () => {
    moves += 1;
  };
  const clicks: [number, number][] = [];
  if (click) bindClick(canvas as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => true);
  return { rig: r, canvas, clicks, moves: () => moves };
}

describe('the orbit view’s click', () => {
  it('is a press released where it was pressed, or within CLICK_SLOP of travel, at its release point', () => {
    const c = clicking();
    press(c.canvas, [[400, 300]]);
    press(c.canvas, [[400, 300], [401, 300], [402, 301]]);
    expect(CLICK_SLOP).toBe(5);
    // Out 2 px and back: 4 px of travel, under the slop, wherever it ends.
    press(c.canvas, [[100, 100], [102, 100], [100, 100]]);
    expect(c.clicks).toEqual([[400, 300], [402, 301], [100, 100]]);
    expect(c.heard, 'no move of a click reached the listener after it').toEqual([]);
  });

  it('is never a drag: CLICK_SLOP of travel or more, out and back, or straight to the release; a drag’s moves go on from the one that passes the slop', () => {
    const c = clicking();
    press(c.canvas, [[400, 300], [403, 300], [400, 300]]);
    press(c.canvas, [[400, 300], [405, 300]]);
    press(c.canvas, [[400, 300], [440, 300], [440, 340]]);
    press(c.canvas, [[400, 300], [402, 300], [398, 299]]);
    expect(c.clicks).toEqual([]);
    expect(c.heard, 'of these, only the 40 px move passed the slop').toEqual([[440, 300]]);
    c.heard.length = 0;
    // 3 px held, then the move to 6 px passes the slop and goes on, as does every move after it.
    press(c.canvas, [[0, 0], [3, 0], [6, 0], [9, 0], [9, 0]]);
    expect(c.heard).toEqual([[6, 0], [9, 0]]);
  });

  it('counts a pen and one finger, and no other button, no non-primary pointer and no press another pointer joins or the browser cancels', () => {
    const c = clicking();
    const e = c.canvas;
    press(e, [[10, 10]], { type: 'pen' });
    press(e, [[20, 20]], { type: 'touch', id: 7 });
    press(e, [[30, 30]], { button: 2 });
    press(e, [[40, 40]], { button: 1 });
    press(e, [[50, 50]], { type: 'touch', id: 8, primary: false });
    // A pinch: a second finger goes down during the first one's press, and both lift where they went down; its moves are never held.
    fire(e, 'pointerdown', 60, 60, { type: 'touch', id: 3 });
    fire(e, 'pointerdown', 90, 60, { type: 'touch', id: 4, primary: false });
    fire(e, 'pointermove', 61, 60, { type: 'touch', id: 3 });
    fire(e, 'pointerup', 90, 60, { type: 'touch', id: 4, primary: false });
    fire(e, 'pointerup', 61, 60, { type: 'touch', id: 3 });
    expect(c.heard, 'the pinch’s move').toEqual([[61, 60]]);
    // A press the browser cancels.
    fire(e, 'pointerdown', 70, 70, { type: 'touch', id: 5 });
    fire(e, 'pointercancel', 70, 70, { type: 'touch', id: 5 });
    fire(e, 'pointerup', 70, 70, { type: 'touch', id: 5 });
    expect(c.clicks).toEqual([[10, 10], [20, 20]]);
    // Each refused press left nothing behind: the next click counts.
    press(e, [[80, 80]]);
    expect(c.clicks.at(-1)).toEqual([80, 80]);
  });

  it('sends a press’s last held move on when another finger joins, before that finger’s press, and holds nothing after', () => {
    const c = clicking();
    const order: string[] = [];
    c.canvas.addEventListener('pointerdown', (event) => order.push(`down ${String((event as Pointer).pointerId)}`));
    c.canvas.ownerDocument.addEventListener('pointermove', (event) => order.push(`move ${String((event as Pointer).pointerId)} at ${String((event as Pointer).clientX)}`));
    fire(c.canvas, 'pointerdown', 600, 360, { type: 'touch', id: 1 });
    fire(c.canvas, 'pointermove', 602, 360, { type: 'touch', id: 1 });
    fire(c.canvas, 'pointermove', 604, 360, { type: 'touch', id: 1 });
    expect(order, 'the held moves').toEqual(['down 1']);
    fire(c.canvas, 'pointerdown', 644, 360, { type: 'touch', id: 2, primary: false });
    fire(c.canvas, 'pointermove', 605, 360, { type: 'touch', id: 1 });
    expect(order).toEqual(['down 1', 'move 1 at 604', 'down 2', 'move 1 at 605']);
  });

  it('is never one while walking, pressed or released then, and holds no move while walking', () => {
    const c = clicking();
    c.walking(true);
    press(c.canvas, [[10, 10], [11, 10], [11, 10]]);
    expect(c.heard, 'walk mode’s look hears every move').toEqual([[11, 10]]);
    // Pressed in the orbit view, released after walk mode began.
    c.walking(false);
    fire(c.canvas, 'pointerdown', 20, 20);
    c.walking(true);
    fire(c.canvas, 'pointerup', 20, 20);
    c.walking(false);
    press(c.canvas, [[30, 30]]);
    expect(c.clicks).toEqual([[30, 30]]);
  });

  it('moves no camera and reports no user move through the real rig, while a drag past the slop turns the camera', () => {
    const { rig: r, canvas, clicks, moves } = rig(true);
    const before = r.camera.position.clone();
    press(canvas, [[640, 360], [641, 360], [642, 360], [642, 360]]);
    for (let frame = 0; frame < 30; frame += 1) r.update();
    expect(clicks, 'a 2 px press is a click').toEqual([[642, 360]]);
    expect(r.camera.position.distanceTo(before), 'metres the click moved the camera').toBe(0);
    expect(moves(), 'user moves the click reported').toBe(0);
    press(canvas, [[640, 360], [643, 360], [646, 360], [646, 360]]);
    for (let frame = 0; frame < 30; frame += 1) r.update();
    expect(clicks.length, 'a 6 px press is no click').toBe(1);
    expect(r.camera.position.distanceTo(before), 'metres the drag turned the camera').toBeGreaterThan(0.05);
    expect(moves(), 'user moves the drag reported').toBeGreaterThan(0);
  });

  it('pinches and pans from where the first finger is, as a rig with no click does, when the first finger moved under the slop before the second landed', () => {
    /**
     * The pinch: one finger presses and moves 4 px (under the slop), a second lands 40 px off, then both move, a frame after each event as on the page
     * (the rig's update, and the camera's matrix brought up to date as a render does: the controls pan along that matrix, which three.js's lookAt
     * leaves one turn behind until then). The zoom factors and the camera after it, with the controls' damping off, so each move is spent in its
     * frame: with it on, a held move is spent over later frames than an unheld one, and a pan's direction depends on how much of the turn is spent.
     */
    const pinch = (click: boolean): { factors: number[]; position: Vector3; target: Vector3 } => {
      const { rig: r, canvas } = rig(click);
      r.controls.enableDamping = false;
      const factors: number[] = [];
      r.dolly = (_x: number, _y: number, factor: number): void => {
        factors.push(factor);
      };
      const one = { type: 'touch', id: 1 } as const;
      const two = { type: 'touch', id: 2, primary: false } as const;
      const send = (type: string, x: number, y: number, k: Kind): void => {
        fire(canvas, type, x, y, k);
        r.update();
        r.camera.updateMatrixWorld();
      };
      send('pointerdown', 600, 360, one);
      send('pointermove', 602, 360, one);
      send('pointermove', 604, 360, one);
      send('pointerdown', 644, 360, two);
      send('pointermove', 605, 360, one);
      send('pointermove', 650, 362, two);
      send('pointermove', 610, 366, one);
      send('pointerup', 650, 362, two);
      send('pointerup', 610, 366, one);
      return { factors, position: r.camera.position.clone(), target: r.controls.target.clone() };
    };
    const plain = pinch(false);
    const clicked = pinch(true);
    expect(plain.factors[0], 'the pinch’s first factor: from 40 px apart to 39').toBeCloseTo(40 / 39, 12);
    expect(plain.target.distanceTo(new Vector3(0, 5, 0)), 'metres the pinch panned the target').toBeGreaterThan(1e-3);
    // Every way the pinch with the click bound differs from the one without: its zoom factors, and where its camera and target end.
    const problems = [
      ...(clicked.factors.length === plain.factors.length ? [] : [`${String(clicked.factors.length)} zoom steps for ${String(plain.factors.length)}`]),
      ...clicked.factors.flatMap((f, i) => (Math.abs(f - (plain.factors[i] ?? Number.NaN)) < 1e-12 ? [] : [`zoom factor ${String(i)}: ${f.toFixed(4)} for ${(plain.factors[i] ?? Number.NaN).toFixed(4)}`])),
      ...(clicked.position.distanceTo(plain.position) < 1e-9 ? [] : [`the camera ${clicked.position.distanceTo(plain.position).toFixed(4)} m from the other’s`]),
      ...(clicked.target.distanceTo(plain.target) < 1e-9 ? [] : [`the target ${clicked.target.distanceTo(plain.target).toFixed(4)} m from the other’s`]),
    ];
    expect(problems).toEqual([]);
  });
});
