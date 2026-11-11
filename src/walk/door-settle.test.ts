/**
 * A walker where a door's leaves stand when walk mode checks its place (docs/design/spec.md, Doors: Walking; work unit 2, review 0, F4), on walk mode
 * over a stand-in page (a canvas, a document and a camera rig as far as walk mode reads them, as src/walk/walk-mode.test.ts) with the page's door layer
 * over the fixture doorway of ./door-testing.ts, built 2 m ahead of the plaza spawn. The walker leaves walk mode standing in the open doorway, the door
 * is shut in the orbit view, where nothing holds its swing, and walk mode is entered again where the walker last stood: the door opens away from it at
 * once rather than shut on it, its feet stay on the floor, never lifted onto the door's top edge, and no leaf stands in it. Set down where every pose of
 * the door meets it, by a jamb, the walker is pushed out of the leaf, on the floor. A locked door never opens: the walker set down in its doorway is pushed
 * out of its leaf. Walk mode checks the walker's place against the world when it enters (`settle`), and the door world puts the doors clear of it
 * (`release`), as the page does.
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
import { CollisionWorld, collisionMeshes } from './collision.js';
import { DoorWorld } from './door-world.js';
import { FLOOR_Y, ID, doorway, gap } from './door-testing.js';
import { placeOf, spawnById } from './spawns.js';
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

/** Walk mode over the doorway, the door layer over it, and a frame that syncs the layer and walks one frame with `keys` held, as the page does. */
function page(): { walk: WalkMode; layer: DoorLayer; frame: (keys?: readonly string[]) => void; feet: () => Vector3 } {
  const timeline = new Timeline(doorway(PX, PY, DOOR_Z));
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), [{ id: ID, locked: false }], doorLeavesOf);
  layer.sync(0, true);
  const walk = new WalkMode({ canvas: new StandIn() as unknown as HTMLCanvasElement, rig: rig(), steps: timeline.steps, floorY: FLOOR_Y, bvhs: new GeometryBvhs(), doors: layer }, () => undefined);
  const frame = (keys: readonly string[] = []): void => {
    layer.sync(0);
    walk.frame(1 / 60, new Set(keys));
  };
  const feet = (): Vector3 => {
    const eye = walk.facts().eye;
    if (eye === null) throw new Error('Walk mode is not walking.');
    return new Vector3(eye[0], eye[1] - BODY.eye, eye[2]);
  };
  return { walk, layer, frame, feet };
}

describe('a walker entering walk mode again where it last stood, a door since shut onto that place', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { addEventListener: () => undefined, pointerLockElement: null, exitPointerLock: () => undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds the door opened away from it at once rather than shut on it, its feet still on the floor', () => {
    const { walk, layer, frame, feet } = page();
    // Opened from the plaza, into the back, and walked into: in front of the leaves' mid-plane, where the closed leaves would reach into the body.
    layer.use(ID, new Vector3(PX, PY + 1.6, PZ));
    layer.sync(0, true);
    const at = MID + 0.1;
    const place = placeOf(`${String(PX)},${String(PY)},${String(at)},${String(PX)},${String(PY + 1.6)},${String(at - 5)}`);
    if (place === null) throw new Error('No place.');
    walk.enter(place);
    frame();
    frame();
    expect(feet().z, 'standing in the open doorway').toBeCloseTo(at, 3);
    expect(gap(layer, feet()), 'clear of the open leaves').toBeGreaterThan(-1e-6);
    // Left, and the door shut in the orbit view, where the page syncs its swing with nothing to hold it: through the place the walker left.
    const left = feet();
    walk.exit();
    layer.use(ID, null);
    for (let i = 0; i < 240; i += 1) layer.sync(1 / 60);
    expect(layer.facts()[0]?.state, 'shut').toBe('closed');
    expect(gap(layer, left), 'the closed leaves through the place the walker left').toBeLessThan(-0.05);
    walk.enter();
    frame();
    frame();
    const door = layer.facts()[0];
    expect(Math.abs(door?.angle ?? 0), 'open a quarter turn, at once').toBeCloseTo(90, 6);
    expect(Math.sign(door?.angle ?? 0), 'away from the walker, into the back').toBe(1);
    expect(gap(layer, feet()), 'no leaf in the walker').toBeGreaterThan(-1e-6);
    expect(feet().y, 'its feet on the floor, not lifted onto the door').toBeCloseTo(PY, 3);
    expect(feet().z, 'where it stood').toBeCloseTo(at, 3);
  });
});

describe('a walker set down in a doorway, by a jamb and at a locked door', () => {
  /** The doorway's static world and door world, the walker set down at (x, 0, z) and checked as walk mode checks a new place (`settle`, `release`). */
  function setDown(defs: readonly DoorDef[], x: number, z: number): { layer: DoorLayer; walker: Walker } {
    const timeline = new Timeline(doorway(0, 0, 0));
    const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), defs, doorLeavesOf);
    layer.sync(0, true);
    const bvhs = new GeometryBvhs();
    const walls = new CollisionWorld(bvhs);
    walls.build(collisionMeshes(timeline.steps, layer.leafMeshes));
    const world = new DoorWorld(walls, layer, bvhs);
    world.refresh();
    const walker = new Walker(world, FLOOR_Y);
    walker.place(x, 0, z, 0);
    walker.settle(0);
    if (world.release(walker.feet)) walker.standClear();
    return { layer, walker };
  }

  it('pushes a walker set down by a jamb, where every pose of the door meets it, out of the leaf, on the floor', () => {
    // The axis 0.3 m in from the −X leaf's hinge, in the leaves' mid-plane: closed, open either way, a leaf stands in the body.
    const { layer, walker } = setDown([{ id: ID, locked: false }], -0.352, -0.07);
    expect(gap(layer, walker.feet), 'pushed out of the leaf').toBeGreaterThan(-0.002);
    expect(walker.feet.y, 'on the floor, not on the leaf’s top edge').toBeCloseTo(0, 3);
  });

  it('never opens a locked door: the walker set down in its doorway is pushed out of its leaf, never lifted onto it', () => {
    const { layer, walker } = setDown([{ id: ID, locked: true }], 0.2, -0.07);
    const door = layer.facts()[0];
    expect([door?.locked, door?.angle, door?.state], 'locked and shut').toEqual([true, 0, 'closed']);
    expect(walker.feet.y, 'on the floor, not on the leaves’ top edge').toBeCloseTo(0, 3);
    expect(gap(layer, walker.feet), 'pushed out of the closed leaves').toBeGreaterThan(-0.002);
    expect(Math.abs(walker.feet.z + 0.07), 'to one side of them').toBeGreaterThan(BODY.radius - 0.002);
  });
});
