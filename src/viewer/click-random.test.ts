/**
 * Random pointer input on the real CameraRig with the orbit view's click bound (src/viewer/click.ts): the class reviews 6 to 11 found cases of (F25,
 * F29, F36, F37, F38), by seeded sequences of a mouse (three buttons, chorded), a pen (tip and barrel) and fingers pressing on the canvas, moving,
 * changing buttons, losing pointer capture, and released or cancelled on the canvas or, without capture, over another element. Every sequence leaves:
 * - each consumer of the stream, OrbitControls and the zoom's input, having heard every press on the canvas once, then only its moves, then its release
 *   or cancel once, nothing of a pointer outside its press, and every event in the order it was sent: no held move went on twice or late;
 * - each consumer, whenever it heard an event, having heard the latest move of every other pointer down, so a pinch or a pan starts from where the
 *   fingers are, and a pointer's latest move before its release, but for a click's;
 * - the zoom zooming only on a finger's move while two fingers are down, or on a middle-button drag that still holds the middle button;
 * - a click only from a press with no other pointer down from its press to its release, of the primary button, its buttons unchanged, its capture
 *   kept and its travel under CLICK_SLOP, at its release point; every such press a click; the camera and its target within 1 nm of where they were
 *   before its press (the controls' update rounds them by up to 1e-14 m).
 * A failure names the seed, its first problems and the events up to the first. Red with the gate, the zoom and the rig of 42722e9 (review 11), 308
 * of the 400 seeds failing; with each alone: its gate 44 (seed 29, a click from a press whose buttons changed, F38; seed 76, a mouse click while a
 * finger whose capture was lost was down, F37), its zoom 250 (seed 34, a zoom on one finger's move, a finger released over another element left
 * behind; seed 45, a zoom on a left drag, a cancelled middle drag left behind), its rig 145 (seed 1, the controls never hearing a finger's cancel
 * over another element; 61 seeds then threw in the controls). The sequences made 339 clicks, 695 button changes, 546 capture losses, 451 ends over
 * another element, 674 cancels, 337 pinch steps, 119 middle-drag steps and 357 presses of a mouse or pen while a finger was down.
 * Bound: SEEDS sequences of STEPS actions; the stand-in page's (src/viewer/pointer-testing.ts); the controls' damping off and a frame after each
 * event; no pointer mixing that throws inside three's OrbitControls with or without the click (review 11, F39, deferred): a finger pressing or ending
 * while a mouse or pen is down, a mouse and a pen down together, or a middle-button press while a finger is down (the controls keep the finger's
 * turn and read the mouse as a second finger).
 */
import { Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { random } from '../build/testing.js';
import { CLICK_SLOP } from '../walk/walk-mode.js';
import { CameraRig } from './camera-rig.js';
import { bindClick } from './click.js';
import { as, onHear, Page, Pointer } from './pointer-testing.js';
import type { PageElement, PointerInit } from './pointer-testing.js';
import type * as Zoom from './zoom.js';

// The zoom's listeners are told apart from the rest of the rig's by who added them.
vi.mock('./zoom.js', async (importOriginal) => {
  const real = await importOriginal<typeof Zoom>();
  const testing = await import('./pointer-testing.js');
  return {
    ...real,
    bindZoomInput: (...args: Parameters<typeof real.bindZoomInput>): void => {
      testing.as('zoom', () => {
        real.bindZoomInput(...args);
      });
    },
  };
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

/** A pointer down: the button it pressed, whether it is the primary pointer, its buttons now and where it is. */
interface Live {
  readonly id: number;
  readonly device: Device;
  readonly button: number;
  readonly primary: boolean;
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
/** A press as sent: its down, its moves and capture losses, its end, and whether no other pointer was down from its down to its end. */
interface Press {
  readonly down: Pointer;
  readonly events: Pointer[];
  end: Pointer | null;
  alone: boolean;
}
interface Outcome {
  readonly problems: readonly { readonly kind: string; readonly text: string; readonly seq: number }[];
  readonly sent: readonly Pointer[];
  readonly seen: Readonly<Record<string, number>>;
}

/** Why a press is no click, by the rules: none for a tap. */
function noClick(p: Press): string[] {
  const why: string[] = [];
  if (!p.alone) why.push('another pointer down');
  if (p.down.button !== 0 || !p.down.isPrimary) why.push('not the primary button of the primary pointer');
  if (p.end?.type !== 'pointerup') why.push('cancelled');
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

/** One seeded sequence on a fresh page and rig, and every problem it showed. */
function play(seed: number): Outcome {
  const rand = random(seed);
  const page = new Page();
  const canvas = page.canvas as unknown as HTMLElement;
  const rig = as('rig', () => new CameraRig(canvas, 0));
  rig.resize(1280, 720, 0);
  rig.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
  rig.controls.enableDamping = false;
  const c = rig.controls as unknown as Record<string, unknown>;
  const controls = new Set([c['_onPointerDown'], c['_onPointerMove'], c['_onPointerUp']]);
  const clicks: { readonly seq: number; readonly x: number; readonly y: number }[] = [];
  /** The number of the release the last click was reported at. */
  let clicked = 0;
  as('gate', () => {
    bindClick(canvas, (x, y) => {
      clicked = page.current;
      clicks.push({ seq: clicked, x, y });
    }, () => true);
  });
  const problems: { kind: string; text: string; seq: number }[] = [];
  const problem = (kind: string, text: string, seq = page.current): void => {
    problems.push({ kind, text, seq });
  };
  const seen: Record<string, number> = { clicks: 0, chords: 0, losses: 0, outside: 0, cancels: 0, pinches: 0, middles: 0, nested: 0 };
  const live = new Map<number, Live>();
  /** The last move of each pointer sent since its press. */
  const lastMove = new Map<number, number>();
  const ears: Record<string, Ear> = { controls: { last: 0, open: new Set(), moves: new Map() }, zoom: { last: 0, open: new Set(), moves: new Map() } };
  let hearing: Pointer | null = null;

  const hear = (who: string, ear: Ear, event: Pointer): void => {
    const id = event.pointerId;
    const what = `${who} heard ${event.type} ${String(event.seq)} of pointer ${String(id)}`;
    if (event.seq <= ear.last) problem('order', `${what} after ${String(ear.last)}`);
    ear.last = Math.max(ear.last, event.seq);
    for (const p of live.values()) {
      if (p.id !== id && ear.moves.get(p.id) !== lastMove.get(p.id)) {
        problem('position', `${what} not having heard pointer ${String(p.id)}'s move ${String(lastMove.get(p.id))} (its last heard: ${String(ear.moves.get(p.id))})`);
      }
    }
    if (event.type === 'pointerdown') {
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
  onHear((entry, event) => {
    const who = controls.has(entry.fn) ? 'controls' : entry.owner === 'zoom' ? 'zoom' : null;
    const ear = who === null ? undefined : ears[who];
    if (who === null || ear === undefined || !STREAM.has(event.type)) return;
    hearing = event;
    hear(who, ear, event);
  });
  const dolly = rig.dolly.bind(rig);
  rig.dolly = (x: number, y: number, factor: number): void => {
    const e = hearing;
    const p = e === null ? undefined : live.get(e.pointerId);
    const fingers = [...live.values()].filter((q) => q.device === 'touch').length;
    const pinch = e?.type === 'pointermove' && p?.device === 'touch' && fingers === 2;
    const middle = e?.type === 'pointermove' && p?.device === 'mouse' && p.button === 1 && (p.buttons & 4) !== 0;
    if (pinch) seen.pinches = (seen.pinches ?? 0) + 1;
    if (middle) seen.middles = (seen.middles ?? 0) + 1;
    if (!pinch && !middle) problem('zoom', `zoomed by ${factor.toFixed(4)} on ${e?.type ?? 'nothing'} of pointer ${String(e?.pointerId)}, ${String(fingers)} fingers down`);
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
  /** Sends one input event, then a frame; an exception from a listener ends the sequence. */
  const sending = (make: () => Pointer | undefined): void => {
    if (run.broken) return;
    try {
      const event = make();
      if (event?.type === 'pointermove') lastMove.set(event.pointerId, event.seq);
      frame();
    } catch (error) {
      run.broken = true;
      problem('threw', error instanceof Error ? `${error.message} at ${(error.stack ?? '').split(/\r?\n/).slice(1, 3).join(' /').trim()}` : String(error));
    }
  };
  const init = (p: Live, button: number, buttons: number): PointerInit => ({ pointerId: p.id, pointerType: p.device, isPrimary: p.primary, button, buttons, clientX: p.x, clientY: p.y });
  /** Where a pointer's event lands: the canvas while it holds the pointer's capture, else the canvas or another element. */
  const where = (p: Live): PageElement => (page.canvas.captured.has(p.id) || rand() < 0.5 ? page.canvas : page.outside);
  const send = (p: Live, type: string, button: number, buttons: number, target = where(p)): void => {
    if (target === page.outside && (type === 'pointerup' || type === 'pointercancel')) seen.outside = (seen.outside ?? 0) + 1;
    sending(() => page.send(target, type, init(p, button, buttons)));
  };
  const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(rand() * items.length)];
  const nonTouch = (): Live | undefined => [...live.values()].find((p) => p.device !== 'touch');
  const fingers = (): Live[] => [...live.values()].filter((p) => p.device === 'touch');
  let nextFinger = 10;

  // Nothing presses while a mouse or pen is down, neither the other of them nor a finger, and the middle button not while a finger is down (F39).
  const press = (): void => {
    if (nonTouch() !== undefined) return;
    const device = pick<Device>(fingers().length < 3 ? ['touch', 'touch', 'mouse', 'mouse', 'pen'] : ['mouse', 'mouse', 'pen']) ?? 'touch';
    const button = device === 'mouse' ? (pick(fingers().length > 0 ? [0, 0, 2] : [0, 0, 0, 2, 2, 1]) ?? 0) : 0;
    if (device !== 'touch' && fingers().length > 0) seen.nested = (seen.nested ?? 0) + 1;
    const p: Live = {
      id: device === 'mouse' ? 1 : device === 'pen' ? 2 : (nextFinger += 1), device, button, primary: device !== 'touch' || fingers().length === 0,
      buttons: BIT[button] ?? 1, x: Math.round(40 + rand() * 1200), y: Math.round(40 + rand() * 640),
    };
    live.set(p.id, p);
    lastMove.delete(p.id);
    send(p, 'pointerdown', button, p.buttons, page.canvas);
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
  /** A button of the mouse pressed or let go (one stays down), or the pen's barrel: a move with new buttons. */
  const chord = (p: Live | undefined = nonTouch(), only?: number): void => {
    if (p === undefined) return;
    const bit = only ?? pick(p.device === 'pen' ? [2] : [1, 2, 4].filter((b) => (p.buttons & b) === 0 || bitsIn(p.buttons) > 1));
    if (bit === undefined) return;
    p.buttons ^= bit;
    seen.chords = (seen.chords ?? 0) + 1;
    send(p, 'pointermove', BUTTON[bit] ?? -1, p.buttons);
  };
  const end = (p: Live, type: 'pointerup' | 'pointercancel'): void => {
    live.delete(p.id);
    if (type === 'pointercancel') seen.cancels = (seen.cancels ?? 0) + 1;
    send(p, type, type === 'pointerup' ? (BUTTON[p.buttons] ?? 0) : -1, 0);
  };
  // A finger ends only while no mouse or pen is down (F39); a mouse or pen is released with one button left, and cancelled with any.
  const release = (type: 'pointerup' | 'pointercancel'): void => {
    const other = nonTouch();
    const p = pick([...live.values()].filter((q) => (q.device === 'touch' ? other === undefined : type === 'pointercancel' || bitsIn(q.buttons) === 1)));
    if (p !== undefined) end(p, type);
  };
  const lose = (): void => {
    const p = pick([...live.values()].filter((q) => page.canvas.captured.has(q.id)));
    if (p === undefined) return;
    seen.losses = (seen.losses ?? 0) + 1;
    sending(() => {
      page.loseCapture({ ...init(p, -1, p.buttons), pointerId: p.id });
      return undefined;
    });
  };

  for (let i = 0; i < STEPS && !run.broken; i += 1) {
    const r = rand();
    if (r < 0.2) press();
    else if (r < 0.58) move();
    else if (r < 0.68) chord();
    else if (r < 0.84) release('pointerup');
    else if (r < 0.9) release('pointercancel');
    else lose();
  }
  // Every pointer ends: a mouse or pen first, its other buttons let go one by one, then the fingers.
  const last = nonTouch();
  if (last !== undefined) {
    for (const bit of [2, 4, 1]) if (bitsIn(last.buttons) > 1 && (last.buttons & bit) !== 0) chord(last, bit);
    end(last, rand() < 0.7 ? 'pointerup' : 'pointercancel');
  }
  for (const p of fingers()) end(p, rand() < 0.7 ? 'pointerup' : 'pointercancel');
  onHear(null);
  if (run.broken) return { problems, sent: page.sent, seen };

  for (const [who, ear] of Object.entries(ears)) for (const id of ear.open) problem('stream', `${who} never heard the end of pointer ${String(id)}`);
  // The presses as sent, and the clicks against them.
  const presses: Press[] = [];
  const open = new Map<number, Press>();
  for (const e of page.sent) {
    const p = open.get(e.pointerId);
    if (e.type === 'pointerdown') {
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
    const why = noClick(p);
    const click = clicks.find((k) => k.seq === end.seq);
    const of = `pointer ${String(end.pointerId)}'s release ${String(end.seq)}`;
    if (click === undefined) {
      if (why.length === 0) problem('click', `no click at ${of}, a tap`, end.seq);
      continue;
    }
    seen.clicks = (seen.clicks ?? 0) + 1;
    if (why.length > 0) problem('click', `a click at ${of} from a press with ${why.join(', ')}`, end.seq);
    if (click.x !== end.clientX || click.y !== end.clientY) problem('click', `the click at (${String(click.x)}, ${String(click.y)}) for ${of}`, end.seq);
    const [from, to] = [before(p.down.seq), after(end.seq)];
    const moved = from === undefined || to === undefined ? Number.NaN : from.position.distanceTo(to.position) + from.target.distanceTo(to.target);
    if (!(moved <= 1e-9)) problem('camera', `the click at ${of} moved the camera and its target ${moved.toExponential(2)} m`, end.seq);
  }
  for (const k of clicks) if (!presses.some((p) => p.end?.seq === k.seq)) problem('click', `a click at event ${String(k.seq)}, no release`, k.seq);
  return { problems, sent: page.sent, seen };
}

/** The events of a sequence up to `seq`, short. */
function events(sent: readonly Pointer[], seq: number): string {
  return sent
    .filter((e) => e.seq <= seq)
    .map((e) => {
      const kind = e.type.replace('pointer', '').replace('lostcapture', 'lost');
      const out = (e.target as { readonly captured?: unknown } | null)?.captured === undefined ? ' out' : '';
      return `${String(e.seq)} ${kind} ${String(e.pointerId)} (${String(e.clientX)},${String(e.clientY)}) b${String(e.buttons)}${out}`;
    })
    .join('; ');
}

describe('the orbit view’s click over random pointer input', () => {
  it('leaves every consumer’s stream whole and current, zooms only on a pinch or a middle drag, and makes every tap and only a tap a click that moves nothing', () => {
    const failures: string[] = [];
    const kinds: Record<string, number> = {};
    const seen: Record<string, number> = {};
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const outcome = play(seed);
      for (const [what, n] of Object.entries(outcome.seen)) seen[what] = (seen[what] ?? 0) + n;
      if (outcome.problems.length === 0) continue;
      for (const kind of new Set(outcome.problems.map((p) => p.kind))) kinds[kind] = (kinds[kind] ?? 0) + 1;
      const first = Math.min(...outcome.problems.map((p) => p.seq));
      const shown = outcome.problems.slice(0, 3).map((p) => `${p.text} (at ${String(p.seq)})`);
      failures.push(`seed ${String(seed)}: ${shown.join('; ')}${outcome.problems.length > 3 ? `; and ${String(outcome.problems.length - 3)} more` : ''} | events: ${events(outcome.sent, first)}`);
    }
    // The instrument: the sequences made every case the checks are about.
    for (const what of ['clicks', 'chords', 'losses', 'outside', 'cancels', 'pinches', 'middles', 'nested']) expect(seen[what] ?? 0, `${what} made`).toBeGreaterThan(20);
    expect({ failing: failures.length, kinds, first: failures.slice(0, 4) }).toEqual({ failing: 0, kinds: {}, first: [] });
  });
});
