/**
 * The doors that open against the walker (src/walk/door-world.ts; docs/design/spec.md, Doors: Walking), on fixtures from the real door pieces: the Fifth
 * Avenue entrance's door unit (src/model/hunt/arches.ts `entranceDoor`, its leaves tagged and in the entrance's materials) in a doorway of a wall over a
 * floor, built by the timeline, turned by the page's door layer (src/viewer/doors.ts) and collided with through the page's own path (`walkWorld`: the
 * static world without the door's closed leaves, and the leaves where the layer stands them), the walker stepped at 60 frames a second unless a case says
 * otherwise. The leaves stop a walker closed and let it through open; a door turning into a walker, opening or closing, holds where its leaves would touch
 * it and goes on once the walker steps away, the same at 30, 60 and 144 frames a second and through a stalled frame; one swung through a walker in one step
 * is refused though both its ends are clear; a door turned back mid-swing goes back from where it stands.
 * The oracle for "never inside the body" is apart from the collision (./door-testing.ts `gap`). The build moving under the walker is in ./door-settle.test.ts.
 * Bound: the doorway stands square to Z; the walker walks on the doorway's axis or is placed; frame times are exact.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { Timeline } from '../build/timeline.js';
import { doorLeavesOf } from '../model/lib/window.js';
import { DoorLayer } from '../viewer/doors.js';
import { GeometryBvhs } from './bvh-cache.js';
import { FLOOR_Y, ID, doorway, gap } from './door-testing.js';
import { walkWorld } from './door-world.js';
import type { DoorWorld } from './door-world.js';
import { BODY, MOTION, NO_INPUT, Walker } from './walker.js';
import type { WalkInput } from './walker.js';

const W: WalkInput = { forward: 1, right: 0, run: false };
const S: WalkInput = { forward: -1, right: 0, run: false };
const RUN: WalkInput = { forward: 1, right: 0, run: true };
/** The leaves' mid-plane in the unit's frame: the frame's depth is 0.14 m (src/model/hunt/arches.ts). */
const MID = -0.07;
/** Longer than a full swing: one step that would take the door all the way. */
const SWING_STEP = 1 + MOTION.fixedStep;

/** The fixture at `t`, its door layer starting `start`, and a walker over the page's collision path. */
function site(start: 'open' | 'closed' = 'closed', t = 3): { layer: DoorLayer; world: DoorWorld; walker: Walker } {
  const timeline = new Timeline(doorway());
  timeline.evaluate(t);
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), [{ id: ID, locked: false }], doorLeavesOf, start);
  layer.sync(t, 0, true);
  const world = walkWorld(timeline.steps, t, layer, new GeometryBvhs());
  return { layer, world, walker: new Walker(world, FLOOR_Y) };
}

/** Degrees the door stands open, as its facts say. */
const angle = (layer: DoorLayer): number => layer.facts()[0]?.angle ?? Number.NaN;

/**
 * How far into a leaf the walker's own steps may leave it: the walls' level pushes stop once a pass moves it less than 1 mm (src/walk/walker.ts `walls`),
 * as at any wall. A door's own turn never takes a leaf into the body, so where the walker has not stepped since it was placed (`still`) none is inside it.
 */
const WALLS_SLOP = 0.002;

/** Runs `seconds` of frames at `fps` with `input` held, checking after every frame that no leaf stands in the body; returns the angles seen. */
function hold(walker: Walker, layer: DoorLayer, seconds: number, input: WalkInput, fps = 60, still = false): number[] {
  const angles: number[] = [];
  const slop = still ? 1e-6 : WALLS_SLOP;
  for (let i = 0; i < Math.round(seconds * fps); i += 1) {
    walker.update(1 / fps, input);
    const g = gap(layer, walker.feet);
    if (g < -slop) throw new Error(`A leaf stands ${(-g * 100).toFixed(2)} cm inside the walker at (${walker.feet.x.toFixed(3)}, ${walker.feet.z.toFixed(3)}), the door at ${angle(layer).toFixed(2)}°, frame ${String(i + 1)} at ${String(fps)} fps, the keys ${JSON.stringify(input)}.`);
    angles.push(angle(layer));
  }
  return angles;
}

/** Faces −Z (into the building, through the door from its front) or +Z. */
const INTO = 0;
const OUT = Math.PI;

describe('the doors that open, against the walker', () => {
  it('stops a walker at the closed leaves from the front and from the back, and lets it through once open', () => {
    const { layer, walker } = site();
    walker.place(0, 0, 2, INTO);
    hold(walker, layer, 3, W);
    // The leaves' front face is 3.5 cm in front of their mid-plane; the body stops a radius from it.
    expect(walker.feet.z, 'stopped in front of the closed door').toBeCloseTo(MID + 0.035 + BODY.radius, 2);
    walker.place(0, 0, -2, OUT);
    hold(walker, layer, 3, W);
    expect(walker.feet.z, 'stopped behind it').toBeCloseTo(MID - 0.035 - BODY.radius, 2);
    walker.place(0, 0, 1.2, INTO);
    expect(layer.use(ID, walker.eye()), 'E opens it').toBe(true);
    hold(walker, layer, 1, NO_INPUT);
    expect(angle(layer), 'away from the walker, toward its back').toBeCloseTo(90, 6);
    hold(walker, layer, 2.5, W);
    expect(walker.feet.z, 'walked through').toBeLessThan(-2);
  });

  it('holds a door opening into a walker who stands in its swing, and opens it once the walker steps out', () => {
    const { layer, walker } = site();
    // Opened by someone in front, it swings toward the back, where the walker now stands in the swing of the leaf on −X.
    expect(layer.use(ID, new Vector3(0, 1.6, 1.5))).toBe(true);
    walker.place(-0.35, 0, -0.62, INTO);
    expect(gap(layer, walker.feet), 'clear of the closed leaves').toBeGreaterThan(0);
    const held = hold(walker, layer, 1.5, NO_INPUT, 60, true);
    const at = held[held.length - 1] ?? 0;
    expect(at, 'held part way open').toBeGreaterThan(5);
    expect(at, 'held part way open').toBeLessThan(85);
    expect(held.slice(-30).every((a) => a === at), 'and still').toBe(true);
    hold(walker, layer, 1.5, W);
    hold(walker, layer, 1, NO_INPUT);
    expect(angle(layer), 'open once the walker has gone on').toBeCloseTo(90, 6);
  });

  it('holds a closing door where its leaves would touch a walker in their swing, then closes it once the walker steps out', () => {
    const { layer, walker } = site('open');
    // Between the open leaves, a step behind the doorway: closing, both leaves come at it.
    walker.place(0, 0, -0.55, OUT);
    expect(layer.use(ID, walker.eye()), 'E closes it').toBe(true);
    const held = hold(walker, layer, 1.5, NO_INPUT, 60, true);
    const at = held[held.length - 1] ?? 0;
    expect(at, 'held part way').toBeGreaterThan(10);
    expect(at, 'held part way').toBeLessThan(85);
    expect(held.slice(-30).every((a) => a === at), 'and still').toBe(true);
    // Held leaves leave the walker the way it came in by, the doorway: out through it, the door closes behind it.
    hold(walker, layer, 2, W);
    hold(walker, layer, 1, NO_INPUT);
    expect(walker.feet.z, 'out through the doorway').toBeGreaterThan(1);
    expect(angle(layer), 'closed once the walker has stepped out of the swing').toBe(0);
    expect(layer.facts()[0]?.state).toBe('closed');
  });

  it('holds it alike at 30, 60 and 144 frames a second and through stalled frames', () => {
    const at: number[] = [];
    for (const fps of [30, 60, 144]) {
      const { layer, walker } = site('open');
      walker.place(0, 0, -0.55, OUT);
      layer.use(ID, walker.eye());
      const seen = hold(walker, layer, 1.5, NO_INPUT, fps, true);
      at.push(seen[seen.length - 1] ?? Number.NaN);
    }
    // Stalled frames: one of 0.25 s, the most a frame steps (30 physics steps of 1/120 s), and one of 2 s, which steps as far.
    const { layer, walker } = site('open');
    walker.place(0, 0, -0.55, OUT);
    layer.use(ID, walker.eye());
    for (const seconds of [0.25, 2, 0.25, 0.25, 0.25, 0.25]) {
      walker.update(seconds, NO_INPUT);
      expect(gap(layer, walker.feet), `after a stalled frame of ${String(seconds)} s`).toBeGreaterThan(-1e-6);
    }
    at.push(angle(layer));
    const [first = 0] = at;
    for (const a of at) expect(Math.abs(a - first), `held at ${at.map((v) => v.toFixed(2)).join('°, ')}°`).toBeLessThan(0.5);
  });

  it('refuses a swing through the walker in one step, though both its ends are clear of it', () => {
    const { layer, world, walker } = site('open');
    walker.place(0.2, 0, -0.62, INTO);
    expect(gap(layer, walker.feet), 'clear of the open leaves').toBeGreaterThan(0);
    layer.set(ID, 0);
    expect(gap(layer, walker.feet), 'clear of the closed leaves').toBeGreaterThan(0);
    layer.set(ID, Math.PI / 2);
    layer.use(ID, walker.eye());
    world.advance(SWING_STEP, walker.feet);
    expect(angle(layer), 'the whole swing in one step, refused').toBeCloseTo(90, 6);
  });

  it('turns a door back from where it stands mid-swing, and holds it on the way back for a walker in the way', () => {
    const { layer, walker } = site();
    walker.place(0, 0, 1.5, INTO);
    layer.use(ID, walker.eye());
    hold(walker, layer, 0.35, NO_INPUT);
    const mid = angle(layer);
    expect(mid, 'part way open').toBeGreaterThan(20);
    expect(mid, 'part way open').toBeLessThan(80);
    expect(layer.use(ID, walker.eye()), 'E again closes it').toBe(true);
    const back = hold(walker, layer, 1, NO_INPUT);
    expect(back[0] ?? 0, 'from where it stood').toBeLessThan(mid + 1e-9);
    expect(angle(layer)).toBe(0);
    // Open it, step into its swing behind it, close it from there: it holds; run on through, and it closes.
    layer.use(ID, walker.eye());
    hold(walker, layer, 1, NO_INPUT);
    walker.place(-0.3, 0, -0.6, OUT);
    layer.use(ID, walker.eye());
    const held = hold(walker, layer, 1, NO_INPUT, 60, true);
    expect(held[held.length - 1] ?? 0, 'held by the walker in the way').toBeGreaterThan(5);
    walker.place(0, 0, -2.5, OUT);
    hold(walker, layer, 1.2, NO_INPUT);
    expect(angle(layer)).toBe(0);
    hold(walker, layer, 1, RUN);
    expect(walker.feet.z, 'a closed door stops a run').toBeCloseTo(MID - 0.035 - BODY.radius, 2);
    hold(walker, layer, 0.5, S);
    expect(walker.feet.z, 'and backs off it').toBeLessThan(MID - 0.035 - BODY.radius - 0.3);
  });
});

