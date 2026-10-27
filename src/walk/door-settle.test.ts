/**
 * A door's step completing with the walker where its leaves close (docs/design/spec.md, Doors: Lifecycle and Walking; work unit 2, review 0, F4), on walk
 * mode over a stand-in page (a canvas, a document and a camera rig as far as walk mode reads them, as src/walk/walk-mode.test.ts) with the page's door
 * layer over the fixture doorway of ./door-testing.ts, built 2 m ahead of the plaza spawn. The walker walks into the doorway while the door's step is
 * incomplete, so nothing of the door is solid, and the step then completes: the door opens away from it at once rather than shut on it, its feet stay on
 * the floor, never lifted onto the door's top edge, and no leaf stands in it. Standing by a jamb, where every pose of the door meets it, the door opens away
 * and the walker is pushed out of the leaf. A locked door never opens: the walker is pushed out of its leaf. Walk mode settles the walker after each build
 * (`settle`), the door world puts the doors clear of it (`release`), as the page does.
 * Bound: frame times exactly 1/60 s; the door layer synced before each walking frame as the page syncs it; the oracle is ./door-testing.ts's `gap`.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Timeline } from '../build/timeline.js';
import { doorLeavesOf } from '../model/lib/window.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import { DoorLayer } from '../viewer/doors.js';
import type { DoorDef } from '../viewer/doors.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes, instancesBefore } from './collision.js';
import { DoorWorld } from './door-world.js';
import { FLOOR_Y, ID, doorway, gap } from './door-testing.js';
import { spawnById } from './spawns.js';
import { BODY, Walker } from './walker.js';
import { WalkMode } from './walk-mode.js';

/** A canvas as far as walk mode reads one: pointer events and capture. */
class StandIn extends EventTarget {
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

/** A camera rig as far as walk mode drives one. */
function rig(): CameraRig {
  const camera = new PerspectiveCamera(45);
  return { camera, setWalking: () => undefined, setWalkView: () => undefined, setPose: () => undefined, pose: () => ({ position: camera.position.clone(), target: camera.position.clone(), fov: camera.fov }) } as unknown as CameraRig;
}

const plaza = spawnById('plaza');
if (plaza === undefined) throw new Error('No plaza spawn.');
const [PX, PY, PZ] = plaza.feet;
/** The doorway's front face, 2 m ahead of the spawn, and its leaves' mid-plane. */
const DOOR_Z = PZ - 2;
const MID = DOOR_Z - 0.07;
const DOOR_STEP = 2;

/** Walk mode over the doorway at `t`, the door layer over it, and a frame that syncs the layer and walks one frame with `keys` held, as the page does. */
function page(t: number, defs: readonly DoorDef[] = [{ id: ID, locked: false }]): { walk: WalkMode; layer: DoorLayer; frame: (t: number, keys?: readonly string[]) => void; feet: () => Vector3 } {
  const timeline = new Timeline(doorway(PX, PY, DOOR_Z));
  timeline.evaluate(t);
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), defs, doorLeavesOf);
  layer.sync(t, 0, true);
  const walk = new WalkMode({ canvas: new StandIn() as unknown as HTMLCanvasElement, rig: rig(), steps: timeline.steps, floorY: FLOOR_Y, bvhs: new GeometryBvhs(), doors: layer }, () => undefined);
  const frame = (at: number, keys: readonly string[] = []): void => {
    timeline.evaluate(at);
    layer.sync(at, 0);
    walk.frame(1 / 60, at, new Set(keys));
  };
  const feet = (): Vector3 => {
    const eye = walk.facts().eye;
    if (eye === null) throw new Error('Walk mode is not walking.');
    return new Vector3(eye[0], eye[1] - BODY.eye, eye[2]);
  };
  return { walk, layer, frame, feet };
}

describe('a door completed with the walker in its doorway', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { addEventListener: () => undefined, pointerLockElement: null, exitPointerLock: () => undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens away from the walker at once rather than shut on it, its feet still on the floor', () => {
    const t = DOOR_STEP + 0.5;
    const { walk, layer, frame, feet } = page(t);
    walk.enter('plaza');
    frame(t);
    frame(t);
    expect(feet().z, 'placed at the spawn').toBeCloseTo(PZ, 3);
    // Into the doorway while the door's step is incomplete: nothing of it is solid yet.
    for (let i = 0; i < 300 && feet().z > MID + 0.05; i += 1) frame(t, ['KeyW']);
    for (let i = 0; i < 30; i += 1) frame(t);
    const inside = feet();
    expect(Math.abs(inside.z - MID), 'standing where the closed leaves would be').toBeLessThan(BODY.radius);
    expect(layer.facts()[0]?.built, 'the door is not built yet').toBe(false);
    frame(DOOR_STEP + 1);
    const door = layer.facts()[0];
    expect(door?.built, 'built').toBe(true);
    expect(Math.abs(door?.angle ?? 0), 'open a quarter turn, at once').toBeCloseTo(90, 6);
    expect(Math.sign(door?.angle ?? 0), 'away from the walker').toBe(inside.z < MID ? -1 : 1);
    expect(gap(layer, feet()), 'no leaf in the walker').toBeGreaterThan(-1e-6);
    expect(feet().y, 'its feet on the floor, not lifted onto the door').toBeCloseTo(PY, 3);
    expect(feet().z, 'where it stood').toBeCloseTo(inside.z, 3);
  });
});

describe('the door world after a build, at a jamb and at a locked door', () => {
  /** The doorway at `t`, its static world and door world built and checked as walk mode does after each build (`settle`, `release`). */
  function rebuild(defs: readonly DoorDef[]): { layer: DoorLayer; walker: Walker; to: (t: number) => void } {
    const timeline = new Timeline(doorway(0, 0, 0));
    const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), defs, doorLeavesOf);
    const bvhs = new GeometryBvhs();
    const walls = new CollisionWorld(bvhs);
    const world = new DoorWorld(walls, layer, bvhs);
    const walker = new Walker(world, FLOOR_Y);
    let complete = 0;
    const to = (t: number): void => {
      timeline.evaluate(t);
      layer.sync(t, 0);
      walls.build(collisionMeshes(timeline.steps, t, layer.leafMeshes));
      world.refresh();
      const known = complete;
      complete = Math.floor(t);
      walker.settle(complete > known ? instancesBefore(timeline.steps, known, layer.leafMeshes) : walls.instances);
      if (world.release(walker.feet)) walker.standClear();
    };
    return { layer, walker, to };
  }

  it('opens away from a walker by a jamb, where every pose meets it, and pushes the walker out of the leaf', () => {
    const { layer, walker, to } = rebuild([{ id: ID, locked: false }]);
    to(DOOR_STEP + 0.5);
    // The axis 0.3 m in from the −X leaf's hinge, in the leaves' mid-plane: closed, open either way, a leaf stands in the body.
    walker.place(-0.352, 0, -0.07, 0);
    to(DOOR_STEP + 1);
    expect(Math.abs(layer.facts()[0]?.angle ?? 0), 'open a quarter turn').toBeCloseTo(90, 6);
    expect(gap(layer, walker.feet), 'pushed out of the leaf').toBeGreaterThan(-0.002);
    expect(walker.feet.y, 'on the floor').toBeCloseTo(0, 3);
  });

  it('never opens a locked door: the walker in its doorway is pushed out of its leaf, never lifted onto it', () => {
    const { layer, walker, to } = rebuild([{ id: ID, locked: true }]);
    to(DOOR_STEP + 0.5);
    walker.place(0.2, 0, -0.07, 0);
    to(DOOR_STEP + 1);
    const door = layer.facts()[0];
    expect([door?.locked, door?.angle, door?.state], 'locked and shut').toEqual([true, 0, 'closed']);
    expect(walker.feet.y, 'on the floor, not on the leaves’ top edge').toBeCloseTo(0, 3);
    expect(gap(layer, walker.feet), 'pushed out of the closed leaves').toBeGreaterThan(-0.002);
    expect(Math.abs(walker.feet.z + 0.07), 'to one side of them').toBeGreaterThan(BODY.radius - 0.002);
  });
});
