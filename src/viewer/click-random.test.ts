/**
 * Random pointer input on the real CameraRig, with the orbit view's click bound (src/viewer/click.ts) and without it: the class reviews 6 to 11 found
 * cases of (F25, F29, F36, F37, F38, and F39, mixed pointer types; src/viewer/pointer-arbiter.ts), by seeded sequences of a mouse (three buttons,
 * chorded), two pens (tip and barrel) and fingers, mixed in any order: pressing on the canvas or on another element, moving, hovering, changing
 * buttons, losing pointer capture, and released or cancelled on the canvas or, without capture, over another element, while the orbit view and walk
 * mode take turns. Every sequence leaves:
 * - no listener having thrown, OrbitControls' and the zoom's included;
 * - each consumer of the stream, OrbitControls and the zoom's input, as its own listeners hear it, having heard the press of every pointer that holds
 *   the camera once (pressed on the canvas in the orbit view with nothing holding it, or a finger while fingers hold it), then only its moves, then
 *   its release or cancel once, nothing of any other pointer, and every event in the order it was sent: no held move went on twice or late;
 * - each consumer, whenever it heard an event, having heard the latest move of every other pointer that holds the camera, so a pinch or a pan starts
 *   from where the fingers are, and a pointer's latest move before its release, but for a click's;
 * - the zoom zooming only in the orbit view, on a move of one of two fingers that hold the camera, or on a middle-button drag that holds it and still
 *   holds the middle button;
 * - with the click bound, a click only from a press on the canvas, pressed and released in the orbit view, with no other pointer down on the canvas
 *   from its press to its release, of the primary button, its buttons unchanged, its capture kept and its travel under CLICK_SLOP, at its release
 *   point; every such press a click; the camera and its target within 1 nm of where they were before its press (the controls' update rounds them by
 *   up to 1e-14 m).
 * A failure prints the failing seed, its first problems and its events up to the first. The red proofs, and why these sequences missed F39 before
 * work unit 10, are in docs/learning/gate-proofs.md under this test's name; the counts of each case they make, in work unit 10's review 1.
 * Bound: SEEDS (400) sequences of STEPS (40) actions, each with the click bound and without; the stand-in page's (src/viewer/pointer-testing.ts);
 * the controls' damping off and a frame after each event; a finger pressed on another element keeps its events there, as its capture does in the
 * browser; the mode changes by the rig's `setWalking` alone, no walk mode running, so walk mode's own listeners (which take a press's capture while
 * walking) are not in the page; each kind of case made more than 20 times over the 800 runs.
 */
import { Vector3 } from 'three';
import type * as Controls from 'three/addons/controls/OrbitControls.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { random } from '../build/testing.js';
import { CLICK_SLOP } from '../walk/walk-mode.js';
import { CameraRig } from './camera-rig.js';
import { bindClick } from './click.js';
import type { Hear } from './pointer-arbiter.js';
import { Page, Pointer } from './pointer-testing.js';
import type { PageElement, PointerInit } from './pointer-testing.js';
import type * as Zoom from './zoom.js';

/** The consumers of the stream. */
type Who = 'controls' | 'zoom';
/** Each consumer's own listeners tell what they hear, past the rig's arbiter. */
const heard = vi.hoisted(() => ({ by: null as ((who: Who, event: Pointer) => void) | null }));
// The zoom's listeners as bindZoomInput adds them, through the rig's filter.
vi.mock('./zoom.js', async (importOriginal) => {
  const real = await importOriginal<typeof Zoom>();
  return {
    ...real,
    bindZoomInput: (element: HTMLElement, zoom: (x: number, y: number, factor: number) => void, active: () => boolean, hear: Hear): void => {
      real.bindZoomInput(element, zoom, active, (listener) => hear((event) => {
        heard.by?.('zoom', event as unknown as Pointer);
        listener(event);
      }));
    },
  };
});
// The controls' three pointer listeners as OrbitControls binds them, before the rig puts them through its filter.
vi.mock('three/addons/controls/OrbitControls.js', async (importOriginal) => {
  const real = await importOriginal<typeof Controls>();
  class Heard extends real.OrbitControls {
    constructor(...args: ConstructorParameters<typeof real.OrbitControls>) {
      super(...args);
      const own = this as unknown as Record<string, ((event: PointerEvent) => void) | undefined>;
      for (const key of ['_onPointerDown', '_onPointerMove', '_onPointerUp']) {
        const listener = own[key];
        if (listener === undefined) throw new Error(`OrbitControls has no ${key} listener, so this test cannot hear what the controls hear: name here the pointer listener fields the three.js release adds, as CONTROLS_LISTENERS does (src/viewer/camera-rig.ts).`);
        own[key] = (event) => {
          heard.by?.('controls', event as unknown as Pointer);
          listener(event);
        };
      }
    }
  }
  return { ...real, OrbitControls: Heard };
});

beforeAll(() => {
  vi.stubGlobal('PointerEvent', Pointer);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

const SEEDS = 400;
const STEPS = 40;
type Device = 'mouse' | 'pen' | 'touch';
/** The `buttons` bit of each button (0 primary, 1 middle, 2 secondary), and the button of each bit. */
const BIT: Readonly<Record<number, number>> = { 0: 1, 1: 4, 2: 2 };
const BUTTON: Readonly<Record<number, number>> = { 1: 0, 4: 1, 2: 2 };
const bitsIn = (buttons: number): number => (buttons & 1) + ((buttons >> 1) & 1) + ((buttons >> 2) & 1);
const STREAM = new Set(['pointerdown', 'pointermove', 'pointerup', 'pointercancel']);

/** A pointer down: the button it pressed, whether it is the primary pointer, whether it holds the camera or pressed elsewhere, its buttons and place. */
interface Live {
  readonly id: number;
  readonly device: Device;
  readonly button: number;
  readonly primary: boolean;
  readonly holds: boolean;
  readonly elsewhere: boolean;
  buttons: number;
  x: number;
  y: number;
}
/** What a consumer heard: the last event's number, the pointers in a press, and the last move of each. */
interface Ear {
  last: number;
  readonly open: Set<number>;
  readonly moves: Map<number, number>;
}
/** A press on the canvas as sent: its down, its moves and capture losses, its end, and whether no other pointer was down on the canvas meanwhile. */
interface Press {
  readonly down: Pointer;
  readonly events: Pointer[];
  end: Pointer | null;
  alone: boolean;
}
interface Outcome {
  readonly problems: readonly { readonly kind: string; readonly text: string; readonly seq: number }[];
  readonly sent: readonly Pointer[];
  /** Each change of mode, after the event of this number. */
  readonly turns: readonly { readonly seq: number; readonly walking: boolean }[];
  readonly seen: Readonly<Record<string, number>>;
}

/** Why a press is no click, by the rules, `walking(seq)` telling whether the page walked at an event: none for a tap. */
function noClick(p: Press, walking: (seq: number) => boolean): string[] {
  const why: string[] = [];
  if (!p.alone) why.push('another pointer down');
  if (p.down.button !== 0 || !p.down.isPrimary) why.push('not the primary button of the primary pointer');
  if (p.end?.type !== 'pointerup') why.push('cancelled');
  if (walking(p.down.seq) || (p.end !== null && walking(p.end.seq))) why.push('pressed or released while walking');
  if (p.events.some((e) => e.type === 'lostpointercapture')) why.push('its capture lost');
  if (p.events.some((e) => e.type === 'pointermove' && e.buttons !== p.down.buttons)) why.push('its buttons changed');
  let travel = 0;
  let [x, y] = [p.down.clientX, p.down.clientY];
  for (const e of [...p.events.filter((m) => m.type === 'pointermove'), ...(p.end === null ? [] : [p.end])]) {
    travel += Math.abs(e.clientX - x) + Math.abs(e.clientY - y);
    [x, y] = [e.clientX, e.clientY];
  }
  if (travel >= CLICK_SLOP) why.push(`${String(travel)} px of travel`);
  return why;
}

/** One seeded sequence on a fresh page and rig, the click bound with `gate`, and every problem it showed. */
function play(seed: number, gate: boolean): Outcome {
  const rand = random(seed);
  const page = new Page();
  const canvas = page.canvas as unknown as HTMLElement;
  const rig = new CameraRig(canvas, 0);
  rig.resize(1280, 720, 0);
  rig.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
  rig.controls.enableDamping = false;
  let walking = false;
  /** Whether the page walked at each event sent, by its number, and each change of mode. */
  const walkingAt = new Map<number, boolean>();
  const turns: { seq: number; walking: boolean }[] = [];
  const clicks: { readonly seq: number; readonly x: number; readonly y: number }[] = [];
  /** The number of the release the last click was reported at. */
  let clicked = 0;
  if (gate) {
    bindClick(canvas, (x, y) => {
      clicked = page.current;
      clicks.push({ seq: clicked, x, y });
    }, () => !walking);
  }
  const problems: { kind: string; text: string; seq: number }[] = [];
  const problem = (kind: string, text: string, seq = page.current): void => {
    problems.push({ kind, text, seq });
  };
  const seen: Record<string, number> = { clicks: 0, chords: 0, losses: 0, outside: 0, cancels: 0, pinches: 0, middles: 0, nested: 0, refused: 0, second: 0, outlived: 0, elsewhere: 0, hovers: 0, walks: 0, walked: 0 };
  const count = (what: string): void => {
    seen[what] = (seen[what] ?? 0) + 1;
  };
  const live = new Map<number, Live>();
  /** The last move of each pointer sent since its press. */
  const lastMove = new Map<number, number>();
  const ears: Record<Who, Ear> = { controls: { last: 0, open: new Set(), moves: new Map() }, zoom: { last: 0, open: new Set(), moves: new Map() } };
  let hearing: Pointer | null = null;

  heard.by = (who, event) => {
    if (!STREAM.has(event.type)) return;
    hearing = event;
    const ear = ears[who];
    const id = event.pointerId;
    const what = `${who} heard ${event.type} ${String(event.seq)} of pointer ${String(id)}`;
    if (event.seq <= ear.last) problem('order', `${what} after ${String(ear.last)}`);
    ear.last = Math.max(ear.last, event.seq);
    for (const p of live.values()) {
      if (p.holds && p.id !== id && ear.moves.get(p.id) !== lastMove.get(p.id)) {
        problem('position', `${what} not having heard pointer ${String(p.id)}'s move ${String(lastMove.get(p.id))} (its last heard: ${String(ear.moves.get(p.id))})`);
      }
    }
    if (event.type === 'pointerdown') {
      if (live.get(id)?.holds !== true) problem('arbiter', `${what}, which does not hold the camera`);
      if (ear.open.has(id)) problem('stream', `${what} while it was down`);
      ear.open.add(id);
      ear.moves.delete(id);
    } else if (!ear.open.has(id)) {
      problem('stream', `${what} outside its press`);
    } else if (event.type === 'pointermove') {
      ear.moves.set(id, event.seq);
    } else {
      if (event.type === 'pointerup' && clicked !== event.seq && ear.moves.get(id) !== lastMove.get(id)) {
        problem('position', `${what} not having heard its move ${String(lastMove.get(id))} (its last heard: ${String(ear.moves.get(id))})`);
      }
      ear.open.delete(id);
      ear.moves.delete(id);
    }
  };
  const dolly = rig.dolly.bind(rig);
  rig.dolly = (x: number, y: number, factor: number): void => {
    const e = hearing;
    const p = e === null ? undefined : live.get(e.pointerId);
    const fingers = [...live.values()].filter((q) => q.holds && q.device === 'touch').length;
    const moving = !walking && e?.type === 'pointermove' && p?.holds === true;
    const pinch = moving && p.device === 'touch' && fingers === 2;
    const middle = moving && p.device === 'mouse' && p.button === 1 && (p.buttons & 4) !== 0;
    if (pinch) count('pinches');
    if (middle) count('middles');
    if (!pinch && !middle) problem('zoom', `zoomed by ${factor.toFixed(4)} on ${e?.type ?? 'nothing'} of pointer ${String(e?.pointerId)}, ${String(fingers)} fingers holding the camera${walking ? ', walking' : ''}`);
    dolly(x, y, factor);
  };

  const poses: { readonly seq: number; readonly position: Vector3; readonly target: Vector3 }[] = [];
  const frame = (): void => {
    rig.update();
    rig.camera.updateMatrixWorld();
    poses.push({ seq: page.current, position: rig.camera.position.clone(), target: rig.controls.target.clone() });
  };
  frame();
  /** Set once a listener threw: the sequence ends there. */
  const run = { broken: false };
  /** Sends one input event (or changes the mode), then a frame; an exception from a listener ends the sequence. */
  const sending = (make: () => Pointer | undefined): void => {
    if (run.broken) return;
    try {
      const event = make();
      if (event !== undefined) walkingAt.set(event.seq, walking);
      if (event?.type === 'pointermove') lastMove.set(event.pointerId, event.seq);
      frame();
    } catch (error) {
      run.broken = true;
      problem('threw', error instanceof Error ? `${error.message} at ${(error.stack ?? '').split(/\r?\n/).slice(1, 3).join(' /').trim()}` : String(error));
    }
  };
  const init = (p: Live, button: number, buttons: number): PointerInit => ({ pointerId: p.id, pointerType: p.device, isPrimary: p.primary, button, buttons, clientX: p.x, clientY: p.y });
  /** Where a pointer's event lands: the canvas while it holds the pointer's capture; a finger pressed elsewhere where it pressed; else either. */
  const where = (p: Live): PageElement => (page.canvas.captured.has(p.id) ? page.canvas : p.device === 'touch' && p.elsewhere ? page.outside : rand() < 0.5 ? page.canvas : page.outside);
  const send = (p: Live, type: string, button: number, buttons: number, target = where(p)): void => {
    if (target === page.outside && !p.elsewhere && (type === 'pointerup' || type === 'pointercancel')) count('outside');
    sending(() => page.send(target, type, init(p, button, buttons)));
  };
  const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(rand() * items.length)];
  const all = (keep: (p: Live) => boolean): Live[] => [...live.values()].filter(keep);
  const place = (): { x: number; y: number } => ({ x: Math.round(40 + rand() * 1200), y: Math.round(40 + rand() * 640) });
  let nextFinger = 10;

  /** A mouse (id 1), a pen (ids 2 and 3) or a finger presses, on the canvas or on another element; whether it holds the camera, by the rules. */
  const press = (): void => {
    const devices: Device[] = [];
    if (all((q) => q.device === 'touch').length < 3) devices.push('touch', 'touch');
    if (!live.has(1)) devices.push('mouse', 'mouse');
    if (!live.has(2) || !live.has(3)) devices.push('pen');
    const device = pick(devices);
    if (device === undefined) return;
    const elsewhere = rand() < 0.15;
    const button = device === 'mouse' ? (pick([0, 0, 0, 2, 2, 1]) ?? 0) : 0;
    const holders = all((q) => q.holds);
    const holds = !elsewhere && !walking && (holders.length === 0 || (device === 'touch' && holders.every((q) => q.device === 'touch')));
    if (live.size > 0) count('nested');
    if (elsewhere) count('elsewhere');
    else if (walking) count('walked');
    else if (!holds) count(holders.every((q) => q.device === device) ? 'second' : 'refused');
    if (holds && all((q) => !q.holds && !q.elsewhere).length > 0) count('outlived');
    const id = device === 'mouse' ? 1 : device === 'pen' ? (live.has(2) ? 3 : 2) : (nextFinger += 1);
    // The first pointer of its type down is the primary one: a mouse always, a pen or a finger with none of its type down.
    const primary = device === 'mouse' || all((q) => q.device === device).length === 0;
    const p: Live = { id, device, button, primary, holds, elsewhere, buttons: BIT[button] ?? 1, ...place() };
    live.set(p.id, p);
    lastMove.delete(p.id);
    send(p, 'pointerdown', button, p.buttons, elsewhere ? page.outside : page.canvas);
    for (const [who, ear] of Object.entries(ears)) {
      if (!run.broken && ear.open.has(id) !== holds) problem('arbiter', `${who} ${holds ? 'missed' : 'heard'} the press ${String(page.current)} of pointer ${String(id)}, which ${holds ? 'holds' : 'does not hold'} the camera`);
    }
  };
  const move = (): void => {
    const p = pick([...live.values()]);
    if (p === undefined) return;
    const r = rand();
    const size = r < 0.5 ? 1 : r < 0.8 ? 3 : 40;
    p.x += Math.round((rand() * 2 - 1) * size);
    p.y += Math.round((rand() * 2 - 1) * size);
    send(p, 'pointermove', -1, p.buttons);
  };
  /** A mouse or a pen that is not down moves over the canvas or another element. */
  const hover = (): void => {
    const id = pick([1, 2, 3]) ?? 1;
    if (live.has(id)) return;
    count('hovers');
    const target = rand() < 0.7 ? page.canvas : page.outside;
    sending(() => page.send(target, 'pointermove', { pointerId: id, pointerType: id === 1 ? 'mouse' : 'pen', isPrimary: true, button: -1, buttons: 0, clientX: place().x, clientY: place().y }));
  };
  /** A button of the mouse pressed or let go (one stays down), or a pen's barrel: a move with new buttons. */
  const chord = (p: Live | undefined = pick(all((q) => q.device !== 'touch')), only?: number): void => {
    if (p === undefined) return;
    const bit = only ?? pick(p.device === 'pen' ? [2] : [1, 2, 4].filter((b) => (p.buttons & b) === 0 || bitsIn(p.buttons) > 1));
    if (bit === undefined) return;
    p.buttons ^= bit;
    count('chords');
    send(p, 'pointermove', BUTTON[bit] ?? -1, p.buttons);
  };
  const end = (p: Live, type: 'pointerup' | 'pointercancel'): void => {
    live.delete(p.id);
    if (type === 'pointercancel') count('cancels');
    send(p, type, type === 'pointerup' ? (BUTTON[p.buttons] ?? 0) : -1, 0);
  };
  // A finger ends at any time; a mouse or a pen is released with one button left, and cancelled with any.
  const release = (type: 'pointerup' | 'pointercancel'): void => {
    const p = pick(all((q) => q.device === 'touch' || type === 'pointercancel' || bitsIn(q.buttons) === 1));
    if (p !== undefined) end(p, type);
  };
  const lose = (): void => {
    const p = pick(all((q) => page.canvas.captured.has(q.id)));
    if (p === undefined) return;
    count('losses');
    sending(() => {
      page.loseCapture({ ...init(p, -1, p.buttons), pointerId: p.id });
      return undefined;
    });
  };
  /** The orbit view gives way to walk mode, or walk mode to the orbit view. */
  const turn = (): void => {
    walking = !walking;
    turns.push({ seq: page.current, walking });
    count('walks');
    sending(() => {
      rig.setWalking(walking);
      return undefined;
    });
  };

  for (let i = 0; i < STEPS && !run.broken; i += 1) {
    const r = rand();
    if (r < 0.2) press();
    else if (r < 0.5) move();
    else if (r < 0.57) hover();
    else if (r < 0.65) chord();
    else if (r < 0.8) release('pointerup');
    else if (r < 0.86) release('pointercancel');
    else if (r < 0.95) lose();
    else turn();
  }
  // Every pointer ends, in any order: a mouse or a pen first lets its other buttons go one by one.
  const left = [...live.values()];
  for (let i = left.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [left[i], left[j]] = [left[j] as Live, left[i] as Live];
  }
  for (const p of left) {
    if (p.device !== 'touch') for (const bit of [2, 4, 1]) if (bitsIn(p.buttons) > 1 && (p.buttons & bit) !== 0) chord(p, bit);
    end(p, rand() < 0.7 ? 'pointerup' : 'pointercancel');
  }
  heard.by = null;
  if (run.broken) return { problems, sent: page.sent, turns, seen };

  for (const [who, ear] of Object.entries(ears)) for (const id of ear.open) problem('stream', `${who} never heard the end of pointer ${String(id)}`);
  if (!gate) return { problems, sent: page.sent, turns, seen };
  // The presses on the canvas as sent, and the clicks against them.
  const presses: Press[] = [];
  const open = new Map<number, Press>();
  for (const e of page.sent) {
    const p = open.get(e.pointerId);
    if (e.type === 'pointerdown') {
      if (e.target !== page.canvas) continue;
      for (const o of open.values()) o.alone = false;
      const fresh: Press = { down: e, events: [], end: null, alone: open.size === 0 };
      open.set(e.pointerId, fresh);
      presses.push(fresh);
    } else if (p !== undefined && (e.type === 'pointerup' || e.type === 'pointercancel')) {
      p.end = e;
      open.delete(e.pointerId);
    } else {
      p?.events.push(e);
    }
  }
  const before = (seq: number): (typeof poses)[number] | undefined => poses.filter((q) => q.seq < seq).at(-1);
  const after = (seq: number): (typeof poses)[number] | undefined => poses.find((q) => q.seq >= seq);
  for (const p of presses) {
    const end = p.end;
    if (end === null) continue;
    const why = noClick(p, (seq) => walkingAt.get(seq) === true);
    const click = clicks.find((k) => k.seq === end.seq);
    const of = `pointer ${String(end.pointerId)}'s release ${String(end.seq)}`;
    if (click === undefined) {
      if (why.length === 0) problem('click', `no click at ${of}, a tap`, end.seq);
      continue;
    }
    count('clicks');
    if (why.length > 0) problem('click', `a click at ${of} from a press with ${why.join(', ')}`, end.seq);
    if (click.x !== end.clientX || click.y !== end.clientY) problem('click', `the click at (${String(click.x)}, ${String(click.y)}) for ${of}`, end.seq);
    const [from, to] = [before(p.down.seq), after(end.seq)];
    const moved = from === undefined || to === undefined ? Number.NaN : from.position.distanceTo(to.position) + from.target.distanceTo(to.target);
    if (!(moved <= 1e-9)) problem('camera', `the click at ${of} moved the camera and its target ${moved.toExponential(2)} m`, end.seq);
  }
  for (const k of clicks) if (!presses.some((p) => p.end?.seq === k.seq)) problem('click', `a click at event ${String(k.seq)}, no release`, k.seq);
  return { problems, sent: page.sent, turns, seen };
}

/** The events of a sequence up to `seq`, short, and its changes of mode. */
function events(outcome: Outcome, seq: number): string {
  return outcome.sent
    .filter((e) => e.seq <= seq)
    .map((e) => {
      const kind = e.type.replace('pointer', '').replace('lostcapture', 'lost');
      const out = (e.target as { readonly captured?: unknown } | null)?.captured === undefined ? ' out' : '';
      const turns = outcome.turns.filter((t) => t.seq === e.seq).map((t) => (t.walking ? '; walk' : '; orbit'));
      return `${String(e.seq)} ${kind} ${e.pointerType} ${String(e.pointerId)} (${String(e.clientX)},${String(e.clientY)}) b${String(e.buttons)}${out}${turns.join('')}`;
    })
    .join('; ');
}

describe('the orbit view’s pointer input at random', () => {
  it('throws nowhere, keeps every consumer’s stream whole, current and to the pointers that hold the camera, zooms only on theirs, and makes every tap and only a tap a click that moves nothing', () => {
    const failures: string[] = [];
    const kinds: Record<string, number> = {};
    const seen: Record<string, number> = {};
    for (const gate of [true, false]) {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const outcome = play(seed, gate);
        for (const [what, n] of Object.entries(outcome.seen)) seen[what] = (seen[what] ?? 0) + n;
        if (outcome.problems.length === 0) continue;
        for (const kind of new Set(outcome.problems.map((p) => p.kind))) kinds[kind] = (kinds[kind] ?? 0) + 1;
        const first = Math.min(...outcome.problems.map((p) => p.seq));
        const shown = outcome.problems.slice(0, 3).map((p) => `${p.text} (at ${String(p.seq)})`);
        failures.push(`seed ${String(seed)}${gate ? '' : ', no click bound'}: ${shown.join('; ')}${outcome.problems.length > 3 ? `; and ${String(outcome.problems.length - 3)} more` : ''} | events: ${events(outcome, first)}`);
      }
    }
    // The instrument: the sequences made every case the checks are about.
    for (const what of Object.keys(seen)) expect(seen[what] ?? 0, `${what} made`).toBeGreaterThan(20);
    expect({ failing: failures.length, kinds, first: failures.slice(0, 4) }).toEqual({ failing: 0, kinds: {}, first: [] });
  });
});
