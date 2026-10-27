/**
 * The flood fill of src/walk/reach.ts on fixtures built from real pieces through the page's own collision path (as src/walk/walker.test.ts builds them):
 * two rooms side by side, 10 m by 8 m, split by a wall on X 0 with a doorway in it, the fill started in the west room.
 * Bound: axis-aligned rooms and doorways; the real model is filled in src/model/reach.test.ts.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, StepDef } from '../build/types.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes } from './collision.js';
import { reach } from './reach.js';
import type { Reach, ReachOptions } from './reach.js';
import { BODY } from './walker.js';

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

/** The fill from the west room's middle over the world the page would build from `step`. */
function fillFrom(step: StepDef, options: ReachOptions = {}): Reach {
  const timeline = new Timeline([step]);
  timeline.evaluate(1);
  const world = new CollisionWorld(new GeometryBvhs());
  world.build(collisionMeshes(timeline.steps, 1));
  return reach(world, FLOOR_Y, -5, 0, 0, 0, options);
}

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
