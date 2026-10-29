/**
 * Mixed pointer input on the real CameraRig (OrbitControls and the zoom's input, through the arbiter of src/viewer/pointer-arbiter.ts), on the stand-in
 * page of src/viewer/pointer-testing.ts, with the orbit view's click bound and without it (work unit 2, review 11, F39; docs/design/spec.md, Camera).
 * One table of sequences worked out by hand: a mouse drag a finger joins, a finger's drag a mouse joins with the finger lifted first (the two orders
 * of F39), a mouse drag a pen joins, a pen's drag a second pen joins, a middle press while a finger turns the view, a finger pressed elsewhere on the
 * page and released while a mouse drags, a pen hovering while a mouse drags, a finger pressed while walking and released after a mouse press back in
 * the orbit view, a mouse a finger refused that outlives it while the next finger holds the camera, and a pinch a mouse joins. Each row names the
 * pointers that hold the camera; then a mouse drags once more. Each sequence throws nothing and leaves the camera, its target, the zoom's factors and
 * the user moves as a rig sent only the events of the pointers that hold the camera leaves them, and makes no click. The rig refuses OrbitControls it
 * cannot put through the arbiter, naming what it found. Red proofs: docs/learning/gate-proofs.md ("Mixed pointer input reaches the orbit view's
 * camera input").
 * Bound: the stand-in page's; the rig runs undamped, a frame after each event; every move of a pointer that holds the camera is 5 px or more, so the
 * click holds none of them and a row's outcome is the same with the click bound and without.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { CameraRig, hearThrough } from './camera-rig.js';
import { bindClick } from './click.js';
import type { Hear } from './pointer-arbiter.js';
import { Page, Pointer } from './pointer-testing.js';
import type { PointerInit } from './pointer-testing.js';

beforeAll(() => {
  vi.stubGlobal('PointerEvent', Pointer);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

/** A pointer: its id, its type, the button it pressed (0 primary, 1 middle) and whether it is the primary pointer. */
interface Kind {
  readonly id: number;
  readonly type: 'mouse' | 'pen' | 'touch';
  readonly button: number;
  readonly primary: boolean;
}
const MOUSE: Kind = { id: 1, type: 'mouse', button: 0, primary: true };
const MIDDLE: Kind = { ...MOUSE, button: 1 };
const PEN: Kind = { id: 2, type: 'pen', button: 0, primary: true };
const PEN2: Kind = { id: 3, type: 'pen', button: 0, primary: false };
const finger = (id: number, primary = true): Kind => ({ id, type: 'touch', button: 0, primary });
const ONE = finger(10);
const TWO = finger(11, false);
const THREE = finger(12);

/** One event of a row: a press, a move, a release, a hover (a move with no button down) or a change of mode; `outside` sends it to another element. */
type Step =
  | { readonly type: 'pointerdown' | 'pointermove' | 'pointerup' | 'hover'; readonly k: Kind; readonly x: number; readonly y: number; readonly outside: boolean }
  | { readonly type: 'walk'; readonly on: boolean };
const event = (type: 'pointerdown' | 'pointermove' | 'pointerup' | 'hover') => (k: Kind, x: number, y: number, outside = false): Step => ({ type, k, x, y, outside });
const down = event('pointerdown');
const move = event('pointermove');
const up = event('pointerup');
const hover = event('hover');
const walk = (on: boolean): Step => ({ type: 'walk', on });

/** A row: its events and the ids of the pointers that hold the camera, whose events alone a rig is sent to compare. */
interface Row {
  readonly name: string;
  readonly events: readonly Step[];
  readonly hold: readonly number[];
}

const ROWS: readonly Row[] = [
  {
    name: 'a mouse drag a finger joins',
    events: [down(MOUSE, 640, 360), down(ONE, 300, 300), move(ONE, 340, 320), move(MOUSE, 680, 360), up(ONE, 340, 320), move(MOUSE, 700, 380), up(MOUSE, 700, 380)],
    hold: [MOUSE.id],
  },
  {
    name: 'a finger’s drag a mouse joins, the finger lifted first',
    events: [down(ONE, 300, 300), move(ONE, 330, 300), down(MOUSE, 640, 360), up(ONE, 330, 300), move(MOUSE, 690, 360), up(MOUSE, 690, 360)],
    hold: [ONE.id],
  },
  {
    name: 'a mouse drag a pen joins',
    events: [down(MOUSE, 640, 360), move(MOUSE, 660, 360), down(PEN, 400, 400), move(PEN, 440, 400), up(MOUSE, 660, 360), move(PEN, 480, 420), up(PEN, 480, 420)],
    hold: [MOUSE.id],
  },
  {
    name: 'a pen’s drag a second pen joins',
    events: [down(PEN, 400, 400), down(PEN2, 800, 300), move(PEN, 430, 400), up(PEN, 430, 400), move(PEN2, 840, 300), up(PEN2, 840, 300)],
    hold: [PEN.id],
  },
  {
    name: 'a middle press while a finger turns the view',
    events: [down(ONE, 300, 300), down(MIDDLE, 640, 360), move(ONE, 320, 300), move(MIDDLE, 640, 300), up(MIDDLE, 640, 300), move(ONE, 350, 310), up(ONE, 350, 310)],
    hold: [ONE.id],
  },
  {
    name: 'a finger pressed elsewhere and released while a mouse drags',
    events: [down(MOUSE, 640, 360), down(ONE, 100, 100, true), move(MOUSE, 680, 360), up(ONE, 100, 100, true), move(MOUSE, 700, 380), up(MOUSE, 700, 380)],
    hold: [MOUSE.id],
  },
  {
    name: 'a pen hovering while a mouse drags',
    events: [down(MOUSE, 640, 360), move(MOUSE, 660, 360), hover(PEN, 900, 300), hover(PEN, 950, 320), move(MOUSE, 680, 370), up(MOUSE, 680, 370)],
    hold: [MOUSE.id],
  },
  {
    name: 'a finger pressed while walking and released after a mouse press back in the orbit view',
    events: [walk(true), down(ONE, 300, 300), move(ONE, 340, 300), walk(false), down(MOUSE, 640, 360), up(ONE, 340, 300), move(MOUSE, 680, 360), up(MOUSE, 680, 360)],
    hold: [MOUSE.id],
  },
  {
    name: 'a mouse a finger refused that outlives it while the next finger holds the camera',
    events: [
      down(ONE, 300, 300), down(MOUSE, 640, 360), move(ONE, 330, 300), up(ONE, 330, 300), down(THREE, 500, 500), move(MOUSE, 690, 360), move(THREE, 540, 500),
      up(MOUSE, 690, 360), move(THREE, 560, 520), up(THREE, 560, 520),
    ],
    hold: [ONE.id, THREE.id],
  },
  {
    name: 'a pinch a mouse joins',
    events: [
      down(ONE, 600, 360), down(TWO, 640, 360), down(MOUSE, 300, 300), move(ONE, 590, 360), move(MOUSE, 340, 300), move(TWO, 660, 360), up(MOUSE, 340, 300),
      up(TWO, 660, 360), up(ONE, 590, 360),
    ],
    hold: [ONE.id, TWO.id],
  },
];

/** The mouse's drag after every row, which a pointer a row left behind in a consumer would turn otherwise. */
const AFTER: readonly Step[] = [down(MOUSE, 640, 360), move(MOUSE, 650, 360), move(MOUSE, 700, 400), up(MOUSE, 700, 400)];

/** What a sequence did: whether and where it threw, the camera and its target, the zoom's factors, the user moves and the clicks. */
interface Outcome {
  readonly threw: string | null;
  readonly position: Vector3;
  readonly target: Vector3;
  readonly factors: readonly number[];
  readonly moves: number;
  readonly clicks: number;
}

/** Plays `steps` on a rig looking at the origin from 30 m as src/main.ts makes it, the click bound after it with `click`, a frame after each event. */
function play(steps: readonly Step[], click: boolean): Outcome {
  const page = new Page();
  const canvas = page.canvas as unknown as HTMLElement;
  const rig = new CameraRig(canvas, 0);
  rig.resize(1280, 720, 0);
  rig.setPose({ position: new Vector3(0, 10, 30), target: new Vector3(0, 5, 0), fov: 45 });
  rig.controls.enableDamping = false;
  let moves = 0;
  rig.onUserMove = () => {
    moves += 1;
  };
  const factors: number[] = [];
  const dolly = rig.dolly.bind(rig);
  rig.dolly = (x: number, y: number, factor: number): void => {
    factors.push(factor);
    dolly(x, y, factor);
  };
  let clicks = 0;
  let walking = false;
  if (click) bindClick(canvas, () => (clicks += 1), () => !walking);
  /** The buttons of each pointer down. */
  const buttons = new Map<number, number>();
  let threw: string | null = null;
  try {
    for (const [i, s] of steps.entries()) {
      if (s.type === 'walk') {
        walking = s.on;
        rig.setWalking(s.on);
        continue;
      }
      const bit = s.k.button === 1 ? 4 : 1;
      if (s.type === 'pointerdown') buttons.set(s.k.id, bit);
      const init: PointerInit = {
        pointerId: s.k.id, pointerType: s.k.type, isPrimary: s.k.primary, clientX: s.x, clientY: s.y,
        button: s.type === 'pointermove' || s.type === 'hover' ? -1 : s.k.button, buttons: s.type === 'pointerup' || s.type === 'hover' ? 0 : (buttons.get(s.k.id) ?? bit),
      };
      if (s.type === 'pointerup') buttons.delete(s.k.id);
      try {
        page.send(s.outside ? page.outside : page.canvas, s.type === 'hover' ? 'pointermove' : s.type, init);
        rig.update();
        rig.camera.updateMatrixWorld();
      } catch (error) {
        threw = `event ${String(i + 1)} (${s.type} of pointer ${String(s.k.id)}): ${error instanceof Error ? error.message : String(error)}`;
        break;
      }
    }
  } finally {
    rig.dolly = dolly;
  }
  return { threw, position: rig.camera.position.clone(), target: rig.controls.target.clone(), factors, moves, clicks };
}

describe('mixed pointer input on the real rig', () => {
  it('throws nothing and leaves the camera as the pointers that hold it alone leave it, with the click bound and without, over a table of sequences', () => {
    const problems: string[] = [];
    for (const row of ROWS) {
      const held = row.events.filter((s) => s.type === 'walk' || row.hold.includes(s.k.id));
      for (const click of [false, true]) {
        const say = (text: string): void => {
          problems.push(`${row.name}${click ? ', the click bound' : ''}: ${text}`);
        };
        const mixed = play([...row.events, ...AFTER], click);
        const alone = play([...held, ...AFTER], click);
        // The instrument: the pointers that hold the camera move it, and the pinch's fingers zoom.
        if (alone.threw !== null) say(`the pointers that hold the camera alone threw at ${alone.threw}`);
        if (alone.moves === 0) say('the pointers that hold the camera alone never moved it');
        if ((alone.factors.length > 0) !== row.name.includes('pinch')) say(`the pointers that hold the camera alone zoomed ${String(alone.factors.length)} times`);
        if (mixed.threw !== null) {
          say(`threw at ${mixed.threw}`);
          continue;
        }
        const camera = mixed.position.distanceTo(alone.position);
        if (!(camera <= 1e-9)) say(`the camera ${camera.toFixed(4)} m from where the pointers that hold it alone put it`);
        const target = mixed.target.distanceTo(alone.target);
        if (!(target <= 1e-9)) say(`the target ${target.toFixed(4)} m from where the pointers that hold it alone put it`);
        if (JSON.stringify(mixed.factors) !== JSON.stringify(alone.factors)) say(`zoom factors ${JSON.stringify(mixed.factors)} for ${JSON.stringify(alone.factors)}`);
        if (mixed.moves !== alone.moves) say(`${String(mixed.moves)} user moves for ${String(alone.moves)}`);
        if (mixed.clicks + alone.clicks > 0) say(`${String(mixed.clicks)} clicks, and ${String(alone.clicks)} alone`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('refuses OrbitControls it cannot put through the arbiter, connected already or missing a listener, naming what it found and what to do', () => {
    const page = new Page();
    const camera = new PerspectiveCamera();
    const pass: Hear = (listener) => listener;
    expect(() => {
      hearThrough(new OrbitControls(camera, page.canvas as unknown as HTMLElement), pass);
    }).toThrow(/^OrbitControls is already connected to an element, .* Build it with no element, put its listeners through the arbiter, then connect it\.$/);
    const bare = new OrbitControls(camera);
    delete (bare as unknown as Record<string, unknown>)['_onPointerMove'];
    expect(() => {
      hearThrough(bare, pass);
    }).toThrow(/^three\.js r\d+: OrbitControls has no _onPointerMove listener, .* List in CONTROLS_LISTENERS \(src\/viewer\/camera-rig\.ts\) every instance field/);
  });
});
