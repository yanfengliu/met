/**
 * The orbit view's click (src/viewer/click.ts; docs/design/spec.md, Collection: Labels) through its real handlers on a stand-in canvas and document
 * that pass each event as the page does to a captured pointer's target: the document's capture listeners, the canvas's, then the document's others.
 * - A press of the primary button, a pen or one finger released after travelling less than CLICK_SLOP pixels, summed over its moves as walk mode sums
 *   them, is a click at its release point; one that travels CLICK_SLOP or more is a drag and never a click, whatever way it comes back; so is a press of
 *   another button, one that a second pointer joins, one the browser cancels, and one pressed or released while walking.
 * - A click's moves never reach a listener after the click's own. A drag's latest held move goes on once, as the move or the release that passes the
 *   slop arrives, then every move after it; a second pointer landing sends the first's held move on before its own press.
 * - One table of presses on the real CameraRig (OrbitControls and the zoom's input): a tap, a drag, a sub-slop pinch, a drag then a pinch, a pinch
 *   with one finger lifted then a tap, an out-and-back drag, the right-button pan and a pen. Each makes the clicks worked out by hand and ends with the
 *   zoom's factors, the camera and its target where a rig with no click bound ends, sent the same events less a click's own moves; it reports a user
 *   move (which turns the follow camera off and clears the preset in view) only where it moves the view, and none from a click's press to its release.
 *   Red with the gate of 86bdf0c (the taps and the pen turned the camera 0.37 to 0.59 m and reported user moves, review 6, F25), of e06cc70 (the
 *   sub-slop pinch's first factor 44/39 for 40/39, review 7, F29) and of 1fd3a50 (the drag then a pinch zoomed first by 136/39 for 40/39, the camera
 *   75 m off: the move held before the drag passed the slop went on again as the second finger landed, review 10, F36); red too with the right
 *   button counted (the pan a click) and with the travel taken from the press point (the out-and-back drag a click).
 * Bound: the stand-in's listeners run in the order they were added within each phase; no layout, no WebGL; touch pointers carry page and client
 * coordinates alike, as on a page that does not scroll; the rig runs undamped, a frame after each event.
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

/** A pointer event as the listeners read it, with its target and the propagation flags the canvas's dispatch honours. */
interface Pointer {
  type: string;
  target: unknown;
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
  /** Sends `event`, its target the canvas, to the document's capture listeners, then the canvas's, then the document's others, as far as it is let through. */
  dispatchEvent(event: Pointer): boolean {
    event.target = this;
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
    type, target: null, pointerId: k.id ?? 1, pointerType: k.type ?? 'mouse', button, buttons: type === 'pointerup' ? 0 : k.button === 2 ? 2 : 1,
    isPrimary: k.primary ?? true, clientX: x, clientY: y, pageX: x, pageY: y, ctrlKey: false, metaKey: false, shiftKey: false, stopped: false, immediate: false,
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

/** One event of a row: a press, a move or a release of a pointer at (x, y); `kept` marks a click's own move, which no listener after the click's hears. */
interface Step {
  readonly type: 'pointerdown' | 'pointermove' | 'pointerup';
  readonly k: Kind;
  readonly x: number;
  readonly y: number;
  readonly kept: boolean;
}
const down = (k: Kind, x: number, y: number): Step => ({ type: 'pointerdown', k, x, y, kept: false });
const move = (k: Kind, x: number, y: number, kept = false): Step => ({ type: 'pointermove', k, x, y, kept });
const up = (k: Kind, x: number, y: number): Step => ({ type: 'pointerup', k, x, y, kept: false });

/** Presses on the rig, worked out by hand: the events, the clicks they make, whether they move the view, and the first zoom factor of their pinch. */
interface Row {
  readonly name: string;
  readonly events: readonly Step[];
  readonly clicks: readonly (readonly [number, number])[];
  readonly moves: boolean;
  /** The fingers' distance before the pinch's first move over the distance after it; null where no two fingers move. */
  readonly zoom: number | null;
}

const MOUSE: Kind = {};
const RIGHT: Kind = { button: 2 };
const PEN: Kind = { type: 'pen' };
/** A finger: the first down of a touch is the primary pointer, one landing while another is down is not. */
const finger = (id: number, primary: boolean): Kind => ({ type: 'touch', id, primary });
const ONE = finger(1, true);
const TWO = finger(2, false);
const THREE = finger(3, false);
const FOUR = finger(4, true);

const ROWS: readonly Row[] = [
  { name: 'a tap', events: [down(ONE, 640, 360), move(ONE, 641, 361, true), up(ONE, 641, 361)], clicks: [[641, 361]], moves: false, zoom: null },
  {
    name: 'a drag',
    events: [down(MOUSE, 640, 360), move(MOUSE, 643, 360), move(MOUSE, 646, 360), move(MOUSE, 680, 380), up(MOUSE, 680, 380)],
    clicks: [], moves: true, zoom: null,
  },
  {
    // The first finger moves 4 px, under the slop, before the second lands 40 px from it (review 7, F29).
    name: 'a sub-slop pinch',
    events: [
      down(ONE, 600, 360), move(ONE, 602, 360), move(ONE, 604, 360), down(TWO, 644, 360), move(ONE, 605, 360), move(TWO, 650, 362),
      move(ONE, 610, 366), up(TWO, 650, 362), up(ONE, 610, 366),
    ],
    clicks: [], moves: true, zoom: 40 / 39,
  },
  {
    // The first finger moves 4 px, held, then drags past the slop to 700 px; the second lands 40 px from it (review 10, F36).
    name: 'a drag then a pinch',
    events: [
      down(ONE, 600, 360), move(ONE, 604, 360), move(ONE, 700, 360), down(TWO, 740, 360), move(ONE, 701, 360), move(TWO, 745, 362),
      up(TWO, 745, 362), up(ONE, 701, 360),
    ],
    clicks: [], moves: true, zoom: 40 / 39,
  },
  {
    // Two fingers pinch; one lifts and the other turns the view; another finger's tap while it is down is no click, nor is its release; then a tap.
    name: 'a pinch, one finger lifted, then a tap',
    events: [
      down(ONE, 600, 360), down(TWO, 640, 360), move(ONE, 596, 360), move(TWO, 646, 360), up(TWO, 646, 360), move(ONE, 597, 360),
      down(THREE, 420, 300), up(THREE, 420, 300), up(ONE, 597, 360), down(FOUR, 300, 200), move(FOUR, 302, 200, true), up(FOUR, 302, 200),
    ],
    clicks: [[302, 200]], moves: true, zoom: 40 / 44,
  },
  {
    // Out 4 px and back, twice: never 5 px from the press, but 8 px of travel by the second move, so a drag (red with the travel taken from the press).
    name: 'an out-and-back drag',
    events: [down(MOUSE, 400, 300), move(MOUSE, 404, 300), move(MOUSE, 400, 300), move(MOUSE, 404, 300), up(MOUSE, 400, 300)],
    clicks: [], moves: true, zoom: null,
  },
  {
    name: 'the right-button pan',
    events: [down(RIGHT, 640, 360), move(RIGHT, 641, 360), move(RIGHT, 642, 361), up(RIGHT, 642, 361)],
    clicks: [], moves: true, zoom: null,
  },
  {
    name: 'a pen',
    events: [down(PEN, 500, 400), move(PEN, 501, 400, true), move(PEN, 502, 401, true), up(PEN, 502, 401)],
    clicks: [[502, 401]], moves: false, zoom: null,
  },
];

/** What a row did on a rig: the clicks, the zoom's factors, where the camera and its target ended, its user moves, and those within a click. */
interface Outcome {
  readonly clicks: readonly (readonly [number, number])[];
  readonly factors: readonly number[];
  readonly position: Vector3;
  readonly target: Vector3;
  readonly moves: number;
  readonly clickMoves: number;
}

/**
 * Plays `events` on a rig looking at the origin from 30 m, as src/main.ts makes it, a frame after each event as on the page: the rig's update, and
 * the camera's matrix brought up to date as a render does (the controls pan along that matrix, which three.js's lookAt leaves one turn behind until
 * then). Damping is off, so each move is spent in its frame: with it on, a held move is spent over later frames than an unheld one would be. With
 * `click`, bindClick is bound after the rig, as there, and every event is sent; without, the moves a click keeps are left out.
 */
function play(events: readonly Step[], click: boolean): Outcome {
  const canvas = new Canvas();
  const r = new CameraRig(canvas as unknown as HTMLElement, 0);
  r.resize(1280, 720, 0);
  r.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
  r.controls.enableDamping = false;
  let moves = 0;
  r.onUserMove = () => {
    moves += 1;
  };
  const factors: number[] = [];
  const dolly = r.dolly.bind(r);
  r.dolly = (x: number, y: number, factor: number): void => {
    factors.push(factor);
    dolly(x, y, factor);
  };
  const clicks: [number, number][] = [];
  if (click) bindClick(canvas as unknown as HTMLElement, (x, y) => clicks.push([x, y]), () => true);
  /** The user moves when each pointer pressed. */
  const pressed = new Map<number, number>();
  let clickMoves = 0;
  for (const e of events) {
    if (e.kept && !click) continue;
    const id = e.k.id ?? 1;
    if (e.type === 'pointerdown') pressed.set(id, moves);
    const before = clicks.length;
    fire(canvas, e.type, e.x, e.y, e.k);
    r.update();
    r.camera.updateMatrixWorld();
    if (clicks.length > before) clickMoves += moves - (pressed.get(id) ?? 0);
  }
  return { clicks, factors, position: r.camera.position.clone(), target: r.controls.target.clone(), moves, clickMoves };
}

const near = (a: number | undefined, b: number | undefined, tolerance: number): boolean => a !== undefined && b !== undefined && Math.abs(a - b) <= tolerance;
const shown = (f: number | undefined): string => (f === undefined ? 'none' : f.toFixed(4));

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

  it('is never a drag: CLICK_SLOP of travel or more, out and back, or straight to the release; a drag’s held move goes on once, then every move', () => {
    const c = clicking();
    press(c.canvas, [[400, 300], [403, 300], [400, 300]]);
    press(c.canvas, [[400, 300], [405, 300]]);
    press(c.canvas, [[400, 300], [440, 300], [440, 340]]);
    press(c.canvas, [[400, 300], [402, 300], [398, 299]]);
    expect(c.clicks).toEqual([]);
    expect(c.heard, 'the held moves the releases passing the slop sent on, and the 40 px move').toEqual([[403, 300], [440, 300], [402, 300]]);
    c.heard.length = 0;
    // 3 px held; the move to 6 px passes the slop: the held move goes on before it, and every move after it goes on.
    press(c.canvas, [[0, 0], [3, 0], [6, 0], [9, 0], [9, 0]]);
    expect(c.heard).toEqual([[3, 0], [6, 0], [9, 0]]);
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

  it('leaves the real rig as a rig with no click leaves it, but for a click’s own moves, which move nothing, over a table of presses', () => {
    const problems: string[] = [];
    for (const row of ROWS) {
      const plain = play(row.events, false);
      const clicked = play(row.events, true);
      const say = (text: string): void => {
        problems.push(`${row.name}: ${text}`);
      };
      // The row as worked out by hand, on the rig with no click: whether it moves the view, and the first factor of its pinch.
      if ((plain.moves > 0) !== row.moves) say(`the rig with no click reported ${String(plain.moves)} user moves`);
      if (row.zoom === null ? plain.factors.length > 0 : !near(plain.factors[0], row.zoom, 1e-12)) say(`the rig with no click zoomed first by ${shown(plain.factors[0])}`);
      // The rig with the click against it.
      if (JSON.stringify(clicked.clicks) !== JSON.stringify(row.clicks)) say(`clicks ${JSON.stringify(clicked.clicks)} for ${JSON.stringify(row.clicks)}`);
      if ((clicked.moves > 0) !== row.moves) say(`${String(clicked.moves)} user moves`);
      if (clicked.clickMoves > 0) say(`${String(clicked.clickMoves)} user moves from a click’s press to its release`);
      if (clicked.factors.length !== plain.factors.length) say(`${String(clicked.factors.length)} zoom steps for ${String(plain.factors.length)}`);
      clicked.factors.forEach((f, i) => {
        if (!near(f, plain.factors[i], 1e-12)) say(`zoom factor ${String(i)}: ${shown(f)} for ${shown(plain.factors[i])}`);
      });
      const camera = clicked.position.distanceTo(plain.position);
      if (!(camera <= 1e-9)) say(`the camera ${camera.toFixed(4)} m from the other rig’s`);
      const target = clicked.target.distanceTo(plain.target);
      if (!(target <= 1e-9)) say(`the target ${target.toFixed(4)} m from the other rig’s`);
    }
    expect(problems).toEqual([]);
  });
});
