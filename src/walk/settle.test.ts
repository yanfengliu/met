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
 * The rims it stands on (work unit 13, review 0): between two seats 0.32 m up, whose undersides the X probes meet, it stays on the floor, set down,
 * settled, checked as a spawn is and walking; between two plinths 0.45 m high, higher than a step, set down or settled, too; blocks under the X probes
 * and a ceiling 1.8 m up leave it on the tiles by the diagonal probes; no rim too steep to stand on lifts it; a walker that walked from the channel onto
 * a joint keeps to the slab when a step completes 15 m off; and set down at 1 m over a deck of sheets whose seam its centre passes through, it stands
 * on the deck, and walks along the seam on it, while a gap 1.2 m wide drops it. Red with the walker of 36ca301: the seats' undersides lifted it to
 * 0.32 m, set down or settled, and a check as for a spawn on to their tops, 0.45 m; the joint under the blocks left it on the slab 6 cm down; the deck
 * left it on the workspace ground 2 m down. Red too with the rims read over `place`'s whole drop (the plinths' and the seats' tops, 0.45 m), with
 * no walkable check (the ramps, 0.296 m), with `builtUnder` always true (the kept walker "moved") and with no check that a probe stands on a top
 * (the seats "moved"). Review 1: either side of a joint, pieces of two overlapping parts, whose overlap the parity of their crossings reads as outside,
 * leave it on the floor (red with parity in place of the winding: "moved", onto the upper part's bottom); and asked 0.3495 m over the deck it stands
 * on it, 0.36 m over it it falls through the seam, the bound (red with the rise counted from the window's foot, not the feet: through it at 0.3495).
 * Bound: fixtures are closed boxes and the deck's sheets, their joints along X and Z, as the hall's. Every piece of the model is closed along vertical
 * lines or a declared sheet (src/model/closure.test.ts); a sheet has no inside, so the build does not lift a walker out of one, which
 * src/walk/crossings.test.ts checks, and a probe's hit on a sheet is not told from its underside, as a closed piece's is by its inside.
 * A walker that walks into a groove at the level of its floor keeps to that floor, as the walking step keeps to the ground it stands on.
 * Walk mode's own wiring (spawns, re-entering, the bar's controls) is in tests/e2e/walk-build.spec.ts.
 */
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, StepDef } from '../build/types.js';
import { B_SOUTH_X, COPING_TOP_Y } from '../model/core/constants.js';
import { WALL_BASE_Y } from '../model/core/vaux-front.js';
import { WESTON_DOOR } from '../model/core/weston-facade.js';
import { MeshBuilder } from '../model/lib/builder.js';
import { sheet } from '../model/lib/sheet.js';
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

/** Two seats 0.32 to 0.45 m over the floor, 0.52 m apart, where the walker stands between them: the X probes start inside them (review 0, F0). */
const seats = step('seats', (kit) => {
  for (const sx of [-1, 1]) block(kit, [sx > 0 ? 0.26 : -0.66, 0.32, -1], [sx > 0 ? 0.66 : -0.26, 0.45, 1]);
});

/** Either side of an 8 mm joint, one piece of two overlapping parts, 0.1 to 0.4 and 0.2 to 0.5 m up: a probe meets the upper part's bottom inside the lower (review 1, F6). */
const overlaps = step('overlaps', (kit) => {
  for (const sx of [-1, 1]) {
    const b = new MeshBuilder();
    const [x0, x1] = sx > 0 ? [JOINT / 2, 2] : [-2, -JOINT / 2];
    b.box([x0, 0.1, -2], [x1, 0.4, 2]);
    b.box([x0, 0.2, -2], [x1, 0.5, 2]);
    kit.add(b.build(), stone, new Matrix4());
  }
});

/** Two plinths 0.45 m high standing 0.5 m apart, higher than a step, where the walker stands between them on the floor (review 0, F3). */
const plinths = step('plinths', (kit) => {
  for (const sx of [-1, 1]) block(kit, [sx > 0 ? 0.25 : -1, 0, -1], [sx > 0 ? 1 : -0.25, 0.45, 1]);
});

/** Over the joint's tiles, blocks 0.2 m high under the X probes and a ceiling 1.8 m up: the highest rim, on the blocks, leaves the body no room (F1). */
const blocks = step('blocks', (kit) => {
  for (const sx of [-1, 1]) block(kit, [sx * 0.3 - 0.05, 0, -6.35], [sx * 0.3 + 0.05, 0.2, -6.25]);
  block(kit, [-20, 1.8, -20], [20, 2, 20]);
});

/** Two ramps rising 45 degrees from an 8 mm groove along X on Z 0: rims too steep to stand on (F3). */
const ramps = step('ramps', (kit) => {
  // Each a box 4 by 0.2 by 1.2 m turned about X, its top face's low edge on the floor 4 mm off Z 0.
  for (const sz of [-1, 1]) {
    const centre = [0, 0.35355, sz * 0.49897] as const;
    block(kit, [-2, centre[1] - 0.1, centre[2] - 0.6], [2, centre[1] + 0.1, centre[2] + 0.6], (-sz * Math.PI) / 4);
  }
});

/** An unrelated step: a block 15 m off. */
const far = step('far', (kit) => { block(kit, [14, 0, 14], [15, 1, 15]); });

/** A pane at `y` over X x0..x1 and Z −5..5, looking up, declared a sheet. */
function pane(x0: number, x1: number, y: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([x0, y, -5, x0, y, 5, x1, y, 5, x1, y, -5], 3));
  g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return sheet(g);
}

/** A deck of sheets 1 m up over nothing: two panes meeting on X 0 at a 2 µm seam a ray down the centre passes through, then a gap 1.2 m wide, X 2..3.2 (F2). */
const deck = step('deck', (kit) => {
  for (const [x0, x1] of [[-2, -1e-6], [1e-6, 2], [3.2, 6]] as const) kit.add(pane(x0, x1, 1), stone, new Matrix4());
});

describe('the rims a walker set down or settled stands on (work unit 13, review 0)', () => {
  const ALONG = Math.PI;

  it("never stands on a piece's underside: between two seats 0.32 m up, whose undersides the X probes meet, it stays on the floor", () => {
    const { walker, to } = site([floor, seats], 1);
    walker.place(0, 0, 0, ALONG);
    expect(to(2), 'the seats built either side of it').toBe('kept');
    expect(walker.feet.y, 'on the floor').toBeCloseTo(0, 6);
    walker.place(0, 0, 0, ALONG);
    expect(walker.feet.y, 'set down between the seats').toBeCloseTo(0, 6);
    expect(walker.settle(0), 'checked with every piece new to it, as walk mode checks a spawn').toBe('kept');
    expect(along(walker, 0.5)[1], 'and walking on between them').toBeCloseTo(0, 6);
    const parts = site([floor, overlaps], 1);
    parts.walker.place(0, 0, 0, ALONG);
    expect(parts.to(2), 'pieces of two overlapping parts built either side of a joint').toBe('kept');
    parts.walker.place(0, 0, 0, ALONG);
    expect(parts.walker.feet.y, "set down between them, not on the upper part's bottom inside the lower").toBeCloseTo(0, 6);
  });

  it('reads rims within a step over the feet: between two plinths 0.45 m high it stays on the floor, set down or settled', () => {
    const { walker, to } = site([floor, plinths], 1);
    walker.place(0, 0, 0, ALONG);
    expect(to(2), 'the plinths built either side of it').toBe('kept');
    walker.place(0, 0, 0, ALONG);
    expect(walker.feet.y, 'set down between the plinths').toBeCloseTo(0, 6);
  });

  it('takes the highest rim the body stands clear on: blocks under the X probes and a ceiling 1.8 m up leave it on the tiles by the diagonals', () => {
    const { walker } = site([slab, tiles, blocks], 3);
    walker.place(0, 0, -6.3, ALONG);
    expect(walker.feet.y, 'set down on the joint').toBeCloseTo(0, 6);
    const laid = site([slab, tiles, blocks], 1);
    laid.walker.place(0, -0.06, -6.3, ALONG);
    expect(laid.to(3), 'the tiles, blocks and ceiling laid round it').toBe('moved');
    expect(laid.walker.feet.y, 'on the tiles').toBeCloseTo(0, 6);
  });

  it('stands on no rim too steep to stand on: in a groove between two 45 degree ramps it stays on the floor', () => {
    const { walker } = site([floor, ramps], 2);
    walker.place(0, 0, 0, -Math.PI / 2);
    expect(walker.feet.y, 'set down in the groove').toBeCloseTo(0, 6);
  });

  it('moves a walker it keeps only for pieces built under its probes: walked from the channel onto a joint, it keeps to the slab when another step completes', () => {
    const { walker, to } = site([slab, tiles, far], 2);
    // Yaw π/2 faces −X: west out of the channel along the joint on Z −5.6, where walking keeps to the ground it stands on.
    walker.place(3.4, -0.06, -5.6, Math.PI / 2);
    along(walker, 1);
    expect([walker.feet.x, walker.feet.y], 'on the joint, on the slab').toEqual([expect.closeTo(1.5, 0), expect.closeTo(-0.06, 6)]);
    expect(to(3), 'a step completed 15 m off').toBe('kept');
    expect(walker.feet.y).toBeCloseTo(-0.06, 6);
  });

  it('stands on a deck of sheets over a seam its centre passes through, at the height asked, and walks along it; a gap wider than the body still drops it', () => {
    const { walker } = site([deck], 1);
    walker.place(0, 1, 0, ALONG);
    expect([walker.feet.y, walker.onGround], 'on the deck, not on the workspace ground 2 m under it').toEqual([expect.closeTo(1, 6), true]);
    expect(walker.settle(0), 'checked with every piece new to it, as walk mode checks a spawn').toBe('kept');
    expect(along(walker, 1), 'walking along the seam').toEqual([expect.closeTo(1, 6), expect.closeTo(1, 6)]);
    walker.place(0, 1.3495, 0, ALONG);
    expect(walker.feet.y, 'asked 0.3495 m over the deck, within a step of it').toBeCloseTo(1, 6);
    walker.place(0, 1.36, 0, ALONG);
    expect(walker.feet.y, 'asked 0.36 m over the deck, more than a step: through the seam, the bound').toBe(FLOOR_Y);
    walker.place(2.6, 1, 0, ALONG);
    expect(walker.feet.y, 'set down in the middle of the 1.2 m gap').toBe(FLOOR_Y);
  });
});
