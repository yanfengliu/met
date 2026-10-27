/**
 * The flood fill of src/walk/reach.ts on fixtures built from real pieces through the page's own collision path (as src/walk/walker.test.ts builds them):
 * two rooms side by side, 10 m by 8 m, split by a wall on X 0 with a doorway in it, the fill started in the west room; and a floor with a groove 0.2 m
 * wide over a closed floor 2 m lower, the groove centred on a line of cell centres. The walker bridges the groove; at 69cfa11 each move began with
 * `Walker.place`, which probed down from the centre over the groove and set the walker on the lower floor, and the fill kept places there (work unit 2,
 * review 12, F40). Every path the fill finds walks again from the start (`replay`).
 * Bound: axis-aligned rooms, doorways and one groove; the real model is filled in src/model/reach.test.ts.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, StepDef } from '../build/types.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes } from './collision.js';
import { reach, replay } from './reach.js';
import type { Reach, ReachOptions } from './reach.js';
import { BODY, WALKER_STATE_SIZE, Walker } from './walker.js';

const FLOOR_Y = -3;
const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });

function block(kit: Kit, min: readonly [number, number, number], max: readonly [number, number, number]): void {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  kit.add(cube, stone, new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0, y1 - y0, z1 - z0)));
}

/**
 * The two rooms: the west floor at 0, the east one at `east` (its face toward the west room a step where that is not 0), outer walls 3 m high, and the
 * wall on X 0 with a doorway `door` wide on Z 0, open `head` high over the higher floor; `fill` walls the doorway up.
 */
function rooms(door: number, east = 0, head = 2.5, fill = false): StepDef {
  return {
    id: 'rooms',
    chapter: CHAPTERS[0].id,
    title: 'rooms',
    motion: { kind: 'rise' },
    build(kit) {
      block(kit, [-10, -0.2, -4], [0, 0, 4]);
      block(kit, [0, east - 0.2, -4], [10, east, 4]);
      const top = Math.max(0, east);
      for (const z of [-4.3, 4]) block(kit, [-10.3, -1, z], [10.3, 3 + top, z + 0.3]);
      for (const x of [-10.3, 10]) block(kit, [x, -1, -4], [x + 0.3, 3 + top, 4]);
      block(kit, [-0.15, top, -4], [0.15, 3 + top, -door / 2]);
      block(kit, [-0.15, top, door / 2], [0.15, 3 + top, 4]);
      block(kit, [-0.15, top + head, -door / 2], [0.15, 3 + top, door / 2]);
      if (fill) block(kit, [-0.15, top, -door / 2], [0.15, top + head, door / 2]);
    },
  };
}

/** The world the page would build from `step`. */
function worldOf(step: StepDef): CollisionWorld {
  const timeline = new Timeline([step]);
  timeline.evaluate(1);
  const world = new CollisionWorld(new GeometryBvhs());
  world.build(collisionMeshes(timeline.steps, 1));
  return world;
}

/** The fill from the west room's middle over the world the page would build from `step`. */
function fillFrom(step: StepDef, options: ReachOptions = {}): Reach {
  return reach(worldOf(step), FLOOR_Y, -5, 0, 0, 0, options);
}

/** An upper floor at 0 with a groove 0.2 m wide along Z, centred on X 0.25, a line of cell centres, over a closed floor 2 m lower, walled round. */
const groove: StepDef = {
  id: 'groove',
  chapter: CHAPTERS[0].id,
  title: 'groove',
  motion: { kind: 'rise' },
  build(kit) {
    block(kit, [-6, -0.2, -3], [0.15, 0, 3]);
    block(kit, [0.35, -0.2, -3], [6, 0, 3]);
    block(kit, [-6, -2.2, -3], [6, -2, 3]);
    for (const z of [-3.3, 3]) block(kit, [-6.3, -2.2, z], [6.3, 3, z + 0.3]);
    for (const x of [-6.3, 6]) block(kit, [x, -2.2, -3], [x + 0.3, 3, 3]);
  },
};

/** How many places lie in the east room, past the wall's east face by more than the walker's radius. */
const east = (fill: Reach): number => Array.from({ length: fill.count }, (_, i) => fill.at(i)).filter(([x]) => x > 0.15 + BODY.radius).length;

describe('the reach flood fill', () => {
  it('reaches the next room through a doorway 1.2 m wide, and every place it reaches stands on a floor', () => {
    const fill = fillFrom(rooms(1.2));
    expect(east(fill), 'places in the east room').toBeGreaterThan(200);
    const floating = Array.from({ length: fill.count }, (_, i) => fill.at(i)).filter(([, y]) => Math.abs(y) > 1e-6);
    expect(floating, 'places off the floors').toEqual([]);
    const far = fill.near(9, 3, 1)[0];
    expect(far, 'a place in the east room’s far corner').toBeDefined();
    expect(fill.path(far ?? 0)[0], 'its path starts at the start').toBe(0);
  });

  it('reaches nothing past the wall with the doorway walled up, or narrower than the walker’s body', () => {
    expect(east(fillFrom(rooms(1.2, 0, 2.5, true))), 'walled up').toBe(0);
    expect(east(fillFrom(rooms(2 * BODY.radius - 0.05))), 'a doorway 0.65 m wide').toBe(0);
  });

  it('steps up 0.3 m into the next room but not 0.5 m, nor 0.3 m under a head too low for the raised body', () => {
    expect(east(fillFrom(rooms(1.2, 0.3))), 'a 0.3 m step').toBeGreaterThan(200);
    expect(east(fillFrom(rooms(1.2, 0.5))), 'a 0.5 m step').toBe(0);
    expect(east(fillFrom(rooms(1.2, 0.3, BODY.height - 0.05))), 'a 0.3 m step under a 1.7 m head').toBe(0);
  });

  it('never drops into a room 1 m lower, which a walker could not leave', () => {
    expect(east(fillFrom(rooms(1.2, -1))), 'a 1 m drop').toBe(0);
  });

  it('walks over a groove it bridges and never onto the closed floor under it', () => {
    const fill = reach(worldOf(groove), FLOOR_Y, -3, 0, 0, 0);
    const places = Array.from({ length: fill.count }, (_, i) => fill.at(i));
    expect(places.filter(([x]) => x > 1).length, 'places past the groove').toBeGreaterThan(100);
    expect(places.filter(([x]) => x > 0.15 && x < 0.35).length, 'places over the groove, bridged').toBeGreaterThan(0);
    expect(places.filter(([, y]) => y < -1).map((p) => p.map((c) => c.toFixed(2)).join(', ')), 'places on the closed floor').toEqual([]);
  });

  it('takes a walker up again from a saved state exactly where it would have walked on, mid-stride and mid-turn', () => {
    const world = worldOf(rooms(1.2, 0.3));
    const walk = (walker: Walker, seconds: number): number[] => {
      const out: number[] = [];
      for (let k = 0; k < seconds * 120; k += 1) {
        walker.turn(0.01, 0);
        walker.update(1 / 120, { forward: 1, right: 0.4, run: true });
        out.push(...walker.feet.toArray(), ...walker.eye().toArray());
      }
      return out;
    };
    const first = new Walker(world, FLOOR_Y);
    first.place(-5, 0, 0, -Math.PI / 2);
    walk(first, 0.5);
    const saved = new Float64Array(WALKER_STATE_SIZE);
    first.save(saved);
    const again = new Walker(world, FLOOR_Y);
    again.restore(saved);
    expect(walk(again, 2), 'feet and eye at every step after the saved one').toEqual(walk(first, 2));
  });

  it('finds paths that walk again from the start, end to end, and says where a path does not', () => {
    const world = worldOf(rooms(1.2));
    const fill = reach(world, FLOOR_Y, -5, 0, 0, 0);
    const all = Array.from({ length: fill.count }, (_, i) => i);
    expect(Math.max(...replay(world, FLOOR_Y, -5, 0, 0, 0, fill, all)), 'metres the walk strays from a recorded place').toBe(0);
    const far = fill.near(9, 3, 1)[0] ?? 0;
    const moved = fill.path(far)[Math.floor(fill.path(far).length / 2)] ?? 0;
    fill.feet[3 * moved + 1] = (fill.feet[3 * moved + 1] ?? 0) + 0.5;
    expect(replay(world, FLOOR_Y, -5, 0, 0, 0, fill, [far])[0], 'a place on its path recorded 0.5 m high').toBeCloseTo(0.5, 6);
  });

  it('keeps to where it may go, and stops when asked', () => {
    expect(east(fillFrom(rooms(1.2), { inside: (x) => x < 0 }))).toBe(0);
    let seen = 0;
    const stopped = fillFrom(rooms(1.2), {
      stop: () => {
        seen += 1;
        return seen >= 50;
      },
    });
    expect(stopped.count).toBe(50);
  });
});
