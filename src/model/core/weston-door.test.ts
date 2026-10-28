/**
 * Weston's 1888 door against the walker (docs/design/spec.md, Doors), headless, through the page's path on the real sequence at t = N: the whole
 * sequence's Timeline, the page's door layer over it (src/viewer/doors.ts) and the walk's world as walk mode builds it (src/walk/door-world.ts
 * `walkWorld`: the static world without the doors' leaves, and the leaves where the layer stands them), with the walk mode's own walker
 * (src/walk/walker.ts) stepped at 60 frames a second. From the Petrie Court on the door's axis the closed door stops the walker against its leaves;
 * turned onto a leaf 0.15 m off their meeting line, the eye finds the door as the page's look target (src/walk/look.ts, through the page's picker with the
 * layer's stand-ins and doorways registered), whose prompt says "E Open"; opened as E opens it (`DoorLayer.use` on the look target, from the walker's
 * eye; red with the layer's meshes left out of the picker, which met nothing there; work unit 2, review 17, F48), it swings a quarter turn into wing B, and the walker walks through the doorway into gallery 529 and back out into
 * the court, on the main floor's level all the way but for the door frame's 8 cm sill.
 * Bound: the walker walks on the door's axis, square to the facade; positions are the feet's; "no leaf inside the body" is read where the walker stops
 * at the closed door and where it ends, by src/walk/door-testing.ts `gap`, an oracle apart from the collision.
 */
import { Layers, Matrix4, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { DoorLayer } from '../../viewer/doors.js';
import { ModelPicker } from '../../viewer/pick.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { gap } from '../../walk/door-testing.js';
import { walkWorld } from '../../walk/door-world.js';
import type { DoorWorld } from '../../walk/door-world.js';
import { lookTarget } from '../../walk/look.js';
import type { HitFn } from '../../walk/look.js';
import { BODY, NO_INPUT, Walker } from '../../walk/walker.js';
import type { WalkInput } from '../../walk/walker.js';
import { DOORS } from '../doors.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { doorLeavesOf } from '../lib/window.js';
import { B_SOUTH_X, OUTER_WALL } from './constants.js';
import { WESTON_DOOR } from './weston-facade.js';

const FPS = 60;
const W: WalkInput = { forward: 1, right: 0, run: false };
/** Yaw facing +X, from the court into wing B, and −X, back out (src/walk/walker.ts: yaw 0 faces −Z and grows turning left). */
const NORTH = -Math.PI / 2;
const SOUTH = Math.PI / 2;
/** Where the walk starts and ends: on the door's axis 3.5 m out in the court, in front of the porch's columns. */
const COURT_X = WESTON_DOOR.x - 3.5;

let timeline: Timeline;
let layer: DoorLayer;
let world: DoorWorld;
let floorY: number;
/** The page's hit query: the timeline's pieces, and the door layer's stand-ins and doorways registered with their tags (src/main.ts). */
let hit: HitFn;
/** The world X of the closed leaves' front face toward the court, their raised panels aside: the plane of the hinges' front points (src/model/lib/window.ts). */
let frontX: number;

beforeAll(() => {
  timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf, 'closed');
  layer.sync(timeline.n, 0, true);
  const bvhs = new GeometryBvhs();
  world = walkWorld(timeline.steps, timeline.n, layer, bvhs);
  floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
  const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), bvhs, floorY, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
  picker.register(layer.pickMeshes, (mesh, i) => layer.tagOf(mesh, i));
  hit = (ray, query) => picker.hit(ray, query);
  const fronts: number[] = [];
  for (const step of timeline.steps) {
    step.meshes.forEach((mesh, m) => {
      step.tags[m]?.forEach((tag, slot) => {
        if (tag?.id !== 'weston') return;
        mesh.updateMatrixWorld(true);
        const unit = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
        for (const leaf of doorLeavesOf(mesh.geometry) ?? []) fronts.push(new Vector3(...leaf.hinge.front).applyMatrix4(unit).x);
      });
    });
  }
  if (fronts.length === 0) throw new Error(`No piece of the finished model is tagged "weston" with a door unit's leaves; place the 1888 door's leaves with kit.addTagged(door.leaf, …, doorTag("weston")) (src/model/core/weston-facade.ts).`);
  frontX = Math.min(...fronts);
}, 120_000);

/** Degrees the door stands open, positive into the building, as its facts say. */
const angle = (): number => layer.facts().find((d) => d.id === 'weston')?.angle ?? Number.NaN;

/** Runs `seconds` of frames with `input` held; returns the lowest and highest the feet stood. */
function hold(walker: Walker, seconds: number, input: WalkInput): { low: number; high: number } {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < Math.round(seconds * FPS); i += 1) {
    walker.update(1 / FPS, input);
    low = Math.min(low, walker.feet.y);
    high = Math.max(high, walker.feet.y);
  }
  return { low, high };
}

const at = (walker: Walker): string => `(${walker.feet.x.toFixed(3)}, ${walker.feet.y.toFixed(3)}, ${walker.feet.z.toFixed(3)})`;

describe("Weston's 1888 door, walked from the Petrie Court", () => {
  it('stops a walker at the closed leaves; opened as E opens it, it swings into wing B and the walker walks through into gallery 529 and back out', () => {
    expect(layer.facts().find((d) => d.id === 'weston'), 'the door, built and closed').toEqual({ id: 'weston', state: 'closed', angle: 0, locked: false, built: true });
    const walker = new Walker(world, floorY);
    walker.place(COURT_X, MAIN_FLOOR_Y, WESTON_DOOR.z, NORTH);
    expect(walker.feet.y, `placed on the court's floor at ${at(walker)}`).toBeCloseTo(MAIN_FLOOR_Y, 3);
    const toDoor = hold(walker, 3, W);
    expect(walker.feet.x, `stopped by the closed leaves a body's radius in front of their face (X ${frontX.toFixed(3)}), at ${at(walker)}`).toBeCloseTo(frontX - BODY.radius, 2);
    expect(gap(layer, walker.feet), 'no leaf inside the body').toBeGreaterThan(-0.002);
    expect([toDoor.low, toDoor.high].map((y) => y - MAIN_FLOOR_Y), 'on the main floor all the way').toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);

    // Turned onto a leaf 0.15 m off the leaves' meeting line, at the eye's height: the look target is the door, and E opens what it meets.
    const eye = walker.eye();
    walker.turn(Math.atan2(-(frontX - eye.x), -(WESTON_DOOR.z + 0.15 - eye.z)) - walker.yaw, 0);
    const target = lookTarget(hit, walker.eye(), walker.look());
    expect(target === null ? null : [target.kind, target.id, layer.prompt(target.id)], 'the look target, and the prompt under the crosshair').toEqual(['door', 'weston', 'E Open']);
    expect(layer.use(target?.id ?? '', walker.eye()), 'E opens it').toBe(true);
    walker.turn(NORTH - walker.yaw, 0);
    hold(walker, 1, NO_INPUT);
    expect(angle(), 'a quarter turn into the building, away from the walker').toBeCloseTo(90, 6);
    const through = hold(walker, 3, W);
    const inside = B_SOUTH_X + OUTER_WALL + 1.5;
    expect(walker.feet.x, `through the doorway into gallery 529, 1.5 m past the old front's inner face, at ${at(walker)}`).toBeGreaterThan(inside);
    expect(walker.onGround).toBe(true);
    expect(through.low - MAIN_FLOOR_Y, 'never below the main floor').toBeGreaterThan(-0.01);
    expect(through.high - MAIN_FLOOR_Y, 'nor above the door frame’s 8 cm sill').toBeLessThan(0.09);

    walker.turn(SOUTH - walker.yaw, 0);
    const back = hold(walker, 4, W);
    expect(walker.feet.x, `back out through the doorway into the court, at ${at(walker)}`).toBeLessThan(WESTON_DOOR.x - 2);
    expect(walker.feet.y, 'on the court’s floor').toBeCloseTo(MAIN_FLOOR_Y, 2);
    expect(back.low - MAIN_FLOOR_Y, 'never below the main floor').toBeGreaterThan(-0.01);
    expect(gap(layer, walker.feet), 'no leaf inside the body').toBeGreaterThan(-0.002);
  });
});
