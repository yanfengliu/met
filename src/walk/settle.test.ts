/**
 * The walker when the build moves under it (src/walk/walker.ts `settle`; docs/design/spec.md, Walk mode: When the build moves), on fixtures built from
 * real pieces through the page's own collision path: box steps built by the timeline, evaluated at one t and then another, the collision rebuilt for each
 * as walk mode rebuilds it, and the walker settled against the pieces the second build added (`instancesBefore`), as walk mode settles it.
 * Two cases run the real sequence: the Grand Staircase's flights built where a walker stands (review of work unit 1, U1 part two), and Weston's facade
 * built through a walker in its pavilion's brick (work unit 3, review 2, F14).
 * The cases: on the workspace ground at once at t = 0, buried by a floor built over it and lifted onto it, dropped when it goes, lifted out of a
 * 1.2 m wall built through it, onto a desk built in a room rather than the roof, past a surface with too little room, lost in a piece with no
 * walkable top, the nearest spawn, and on the real sequence Weston's facade built through a walker in its pavilion's brick, which lifts it onto the
 * coping: red with `openWall`'s bottom face left out, the walker kept in the brick.
 * A floor's joint under the centre (work unit 4's F-owner-8, work unit 13): tiles 6 cm deep on a slab with 8 mm joints, as the Medieval Sculpture Hall's,
 * where the walker is set down on a joint and where two cross, on the tiles, and walks 9 m or more along a joint on them; is lifted onto the tiles laid
 * round it on the slab, and onto them when the whole floor is built over it; and, a control, still steps down into a channel 1.2 m wide, set down,
 * settled or walking. Red with the walker of 897a4b4, which read only the line under the body's centre: set down on the slab 6 cm down, on the joint
 * and where two cross; walked 9.9 m along the joint on the slab; "kept" on the slab when the tiles were laid round it; moved onto the slab, not the
 * tiles, when the floor was built over it. The control is green with both.
 * Bound: fixtures are closed boxes, their joints along X and Z, as the hall's. Every piece of the model is closed along vertical lines or a declared
 * sheet (src/model/closure.test.ts); a sheet has no inside, so the build does not lift a walker out of one, which src/walk/crossings.test.ts checks.
 * Walk mode's own wiring (spawns, re-entering, the bar's controls) is in tests/e2e/walk-build.spec.ts.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, StepDef } from '../build/types.js';
import { B_SOUTH_X, COPING_TOP_Y } from '../model/core/constants.js';
import { WALL_BASE_Y } from '../model/core/vaux-front.js';
import { WESTON_DOOR } from '../model/core/weston-facade.js';
import { workspaceGroundY } from '../viewer/environment.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes, instancesBefore } from './collision.js';
import { SPAWNS, nearestSpawn } from './spawns.js';
import { NO_INPUT, Walker } from './walker.js';
import type { Settled } from './walker.js';

const FLOOR_Y = -1;
const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });

/** A box from `min` to `max` in world metres, turned `turn` radians about X round its centre. */
function block(kit: Kit, min: readonly [number, number, number], max: readonly [number, number, number], turn = 0): void {
  const centre = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const size = new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  kit.add(cube, stone, new Matrix4().compose(centre, new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), turn), size));
}

const step = (id: string, build: (kit: Kit) => void): StepDef => ({ id, chapter: CHAPTERS[0].id, title: id, motion: { kind: 'rise' }, build });
const floor = step('floor', (kit) => { block(kit, [-20, -0.2, -20], [20, 0, 20]); });

/**
 * A walker over the world of `steps` built at `t`, its workspace ground at FLOOR_Y or where `floorOf` puts it for the timeline; `to` builds the world again
 * at another t and settles the walker as walk mode does.
 */
function site(steps: readonly StepDef[], t: number, floorOf: (timeline: Timeline) => number = () => FLOOR_Y): { walker: Walker; to: (t: number) => Settled } {
  const timeline = new Timeline(steps);
  const world = new CollisionWorld(new GeometryBvhs());
  let complete = 0;
  const build = (at: number): number => {
    timeline.evaluate(at);
    world.build(collisionMeshes(timeline.steps, at));
    const known = complete;
    complete = Math.floor(at);
    return known;
  };
  build(t);
  const walker = new Walker(world, floorOf(timeline));
  return {
    walker,
    to: (at) => {
      const known = build(at);
      return walker.settle(complete > known ? instancesBefore(timeline.steps, known) : world.instances);
    },
  };
}

function rest(walker: Walker, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i += 1) walker.update(1 / 60, NO_INPUT);
}

describe('the walker when the build moves under it', () => {
  it('stands on the workspace ground at once where nothing is built, and on the floor once it is built over it', () => {
    const { walker, to } = site([floor], 0);
    walker.place(0, 0, 0, 0);
    expect([walker.feet.y, walker.onGround], 'on the workspace ground, not falling to it').toEqual([FLOOR_Y, true]);
    expect(to(1), 'buried under the new floor').toBe('moved');
    rest(walker, 0.5);
    expect(walker.feet.y, 'on the floor').toBeCloseTo(0, 6);
    expect(walker.onGround).toBe(true);
  });

  it('falls when the floor under it goes, and stands on it again when it comes back', () => {
    const { walker, to } = site([floor], 1);
    walker.place(0, 0, 0, 0);
    expect(to(0), 'nothing over it').toBe('kept');
    rest(walker, 1.5);
    expect(walker.feet.y, 'fallen to the workspace ground').toBeCloseTo(FLOOR_Y, 6);
    expect(to(1)).toBe('moved');
    expect(walker.feet.y).toBeCloseTo(0, 6);
  });

  it('is lifted onto a 1.2 m wall built through it, its axis 0.6 m from either face, out of reach of the capsule test', () => {
    const wall = step('wall', (kit) => { block(kit, [-5, 0, -3.6], [5, 3, -2.4]); });
    const { walker, to } = site([floor, wall], 1);
    walker.place(0, 0, -3, 0);
    expect(to(2), 'inside the wall').toBe('moved');
    rest(walker, 0.5);
    expect(walker.feet.y, 'on the wall top').toBeCloseTo(3, 6);
    expect(walker.onGround).toBe(true);
  });

  it('stands on a desk built under it in a room, the lowest surface it fits on, not on the roof', () => {
    const room = step('room', (kit) => {
      block(kit, [-4.3, 0, -4.3], [4.3, 4, -4]);
      block(kit, [-4.3, 0, 4], [4.3, 4, 4.3]);
      block(kit, [-4.3, 0, -4], [-4, 4, 4]);
      block(kit, [4, 0, -4], [4.3, 4, 4]);
      block(kit, [-4.3, 4, -4.3], [4.3, 4.3, 4.3]);
    });
    const desk = step('desk', (kit) => { block(kit, [-1, 0, -1], [1, 1.1, 1]); });
    const { walker, to } = site([floor, room, desk], 2);
    walker.place(0, 0, 0, 0);
    expect(to(3), 'in the desk').toBe('moved');
    rest(walker, 0.5);
    expect(walker.feet.y, 'on the desk top').toBeCloseTo(1.1, 6);
  });

  it('stays where it is when a roof is built over it, and when a step it stands clear of is built beside it', () => {
    const roof = step('roof', (kit) => {
      block(kit, [-10, 2.5, -10], [10, 2.8, 10]);
      block(kit, [2, 0, -1], [4, 1, 1]);
    });
    const { walker, to } = site([floor, roof], 1);
    walker.place(0, 0, 0, 0);
    expect(to(2)).toBe('kept');
    expect(walker.feet.y).toBeCloseTo(0, 6);
  });

  it('passes over a surface with too little room above it: out of a 1 m block under a ceiling 2 m up, onto the ceiling slab', () => {
    const low = step('low', (kit) => {
      block(kit, [-1, 0, -1], [1, 1, 1]);
      block(kit, [-10, 2, -10], [10, 2.3, 10]);
    });
    const { walker, to } = site([floor, low], 1);
    walker.place(0, 0, 0, 0);
    expect(to(2)).toBe('moved');
    expect(walker.feet.y, 'on the slab, the block top 1 m below it having 1 m of room').toBeCloseTo(2.3, 6);
  });

  it('is lost inside a piece with no walkable surface over it (a cube turned 45 degrees, its top a ridge), for walk mode to place elsewhere', () => {
    const ridge = step('ridge', (kit) => { block(kit, [-3, 1, -3], [3, 7, 3], Math.PI / 4); });
    const { walker, to } = site([floor, ridge], 1);
    // Off the ridge line, so the line through the walker crosses the turned faces rather than their shared edges.
    walker.place(0, 0, 0.4, 0);
    expect(to(2)).toBe('lost');
  });

  it('on the real sequence: the Grand Staircase built where a walker stands at X 0, Z -43 lifts it onto the flight', () => {
    const k = SEQUENCE.findIndex((s) => s.id === 'grand-stair-flights');
    expect(k, 'the step that builds the Grand Staircase flights').toBeGreaterThan(0);
    const { walker, to } = site(SEQUENCE, k);
    walker.place(0, 4.5, -43, 0);
    const before = walker.feet.y;
    expect(to(k + 1), `the flights built over feet at ${before.toFixed(3)} m`).toBe('moved');
    rest(walker, 0.5);
    expect(walker.feet.y, 'on a tread of the lower flight, over where the head was').toBeGreaterThan(before + 1.75);
    expect(walker.onGround).toBe(true);
  });

  it("on the real sequence: Weston's facade built through a walker in its pavilion's brick lifts it onto the coping (work unit 3, review 2, F14)", () => {
    const k = SEQUENCE.findIndex((s) => s.id === 'wing-b-south-facade');
    expect(k, "the step that builds Weston's facade").toBeGreaterThan(0);
    // The page's workspace ground, under the wall's base, so the walker stands on the site's ground there and the wall is built round it, not over it.
    const { walker, to } = site(SEQUENCE, k, (timeline) => workspaceGroundY(timeline.bounds));
    // 0.5 m behind the face and 5 m along it from the door's middle, where no opening runs up through the wall.
    walker.place(B_SOUTH_X + 0.5, 0, WESTON_DOOR.z + 5, 0);
    expect(walker.feet.y, "on the site's ground, over the wall's base").toBeGreaterThan(WALL_BASE_Y);
    expect(to(k + 1), `the wall built through feet at ${walker.feet.y.toFixed(3)} m`).toBe('moved');
    rest(walker, 0.5);
    expect(walker.feet.y, "on the coping over the pavilion's parapet").toBeCloseTo(COPING_TOP_Y, 6);
    expect(walker.onGround).toBe(true);
  });

  it('names the spawn nearest a point for a lost walker', () => {
    for (const spawn of SPAWNS) expect(nearestSpawn(...spawn.feet).id).toBe(spawn.id);
    const plaza = SPAWNS.find((s) => s.id === 'plaza');
    if (plaza === undefined) throw new Error('No plaza spawn.');
    expect(nearestSpawn(plaza.feet[0] + 3, plaza.feet[1] - 5, plaza.feet[2] + 2).id).toBe('plaza');
  });
});

/**
 * A floor's tiles 6 cm deep on a slab, 1.4 m square with 8 mm joints, as the Medieval Sculpture Hall's (src/model/core/medieval-hall.ts `hallFloor`):
 * columns X −2.8..0 and 0..2.8 either side of a joint on X 0, rows from Z −7 to 7, then a channel 1.2 m wide with no tiles, X 2.8..4.0, wider than the body.
 */
const JOINT = 0.008;
const slab = step('slab', (kit) => { block(kit, [-20, -0.26, -20], [20, -0.06, 20]); });
const tiles = step('tiles', (kit) => {
  for (const x of [-2.8, -1.4, 0, 1.4, 4]) for (let z = -7; z < 7 - 1e-9; z += 1.4) block(kit, [x + JOINT / 2, -0.06, z + JOINT / 2], [x + 1.4 - JOINT / 2, 0, z + 1.4 - JOINT / 2]);
});
const W = { forward: 1, right: 0, run: false } as const;

/** Walks `seconds` forward at 60 frames a second; returns the lowest and highest the feet stood. */
function along(walker: Walker, seconds: number): [number, number] {
  let [low, high] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let i = 0; i < Math.round(seconds * 60); i += 1) {
    walker.update(1 / 60, W);
    [low, high] = [Math.min(low, walker.feet.y), Math.max(high, walker.feet.y)];
  }
  return [low, high];
}

describe("a floor's joint under the walker's centre (work unit 13, F-owner-8)", () => {
  // Yaw π faces +Z, along the joint on X 0.
  const ALONG = Math.PI;

  it('sets the walker down on the tiles either side of the joint, not on the slab 6 cm down in it, and walks it along the joint on the tiles', () => {
    const { walker } = site([slab, tiles], 2);
    for (const [x, z, what] of [[0, -6.3, 'on the joint'], [0, -5.6, 'where two joints cross'], [0.2, -6.3, 'on a tile']] as const) {
      walker.place(x, 0, z, ALONG);
      expect(walker.feet.y, `set down ${what} at X ${String(x)}, Z ${String(z)}`).toBeCloseTo(0, 6);
    }
    walker.place(0, 0, -6.3, ALONG);
    const [low, high] = along(walker, 5);
    expect(walker.feet.z, 'walked 9 m or more along the joint').toBeGreaterThan(2.7);
    expect([low, high], 'on the tiles all the way, over the joints across it').toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
  });

  it('lifts a walker that stood on the slab onto the tiles laid round it on their joint, and one the whole floor is built over', () => {
    const laid = site([slab, tiles], 1);
    laid.walker.place(0, -0.06, -6.3, ALONG);
    expect(laid.walker.feet.y, 'on the slab before the tiles').toBeCloseTo(-0.06, 6);
    expect(laid.to(2), 'the tiles laid round it').toBe('moved');
    expect(laid.walker.feet.y, 'on the tiles').toBeCloseTo(0, 6);
    expect(along(laid.walker, 2), 'and on them walking along the joint').toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
    const built = site([slab, tiles], 0);
    built.walker.place(0, 0, -6.3, ALONG);
    expect(built.walker.feet.y, 'on the workspace ground').toBe(FLOOR_Y);
    expect(built.to(2), 'the floor built over it').toBe('moved');
    expect(built.walker.feet.y, 'on the tiles').toBeCloseTo(0, 6);
  });

  it('still drops a walker into a channel wider than its body, set down, settled or walking, as soon as its centre passes the edge', () => {
    const { walker, to } = site([slab, tiles], 1);
    walker.place(3.4, -0.06, -6.3, ALONG);
    expect(to(2), 'the tiles laid either side of the 1.2 m channel').toBe('kept');
    expect(walker.feet.y, 'on the slab in the channel').toBeCloseTo(-0.06, 6);
    for (const x of [3.4, 2.9]) {
      walker.place(x, 0, -6.3, ALONG);
      expect(walker.feet.y, `set down in the channel at X ${String(x)}, its centre 0.1 m or more past its edge at X 2.796`).toBeCloseTo(-0.06, 6);
    }
    // Yaw −π/2 faces +X: east off the tiles into the channel.
    walker.place(2.4, 0, -6.3, -Math.PI / 2);
    for (let i = 0; i < 120 && walker.feet.x < 3.3; i += 1) walker.update(1 / 60, W);
    expect([walker.feet.x, walker.feet.y], 'walked into the channel, 0.5 m past its edge').toEqual([expect.closeTo(3.3, 1), expect.closeTo(-0.06, 6)]);
  });
});
