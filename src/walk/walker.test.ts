/**
 * The walker (src/walk/walker.ts) on fixtures built from real pieces through the page's own collision path: step definitions of boxes and the parts
 * library's stair flight, built by the timeline, evaluated at t, selected by `collisionMeshes` and indexed by `CollisionWorld` over three-mesh-bvh.
 * Each case drives the walker with keys held for simulated seconds at 60 frames a second, as the page does, and reads its feet and eye.
 * Bound: fixtures are axis-aligned rooms, a straight flight and ledges; the real model is walked in tests/e2e/walk.spec.ts.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, StepDef } from '../build/types.js';
import { stairFlight, stairLanding } from '../model/lib/index.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes } from './collision.js';
import { BODY, MOTION, NO_INPUT, Walker } from './walker.js';
import type { WalkInput } from './walker.js';

const FLOOR_Y = -1;
const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const water = new MeshStandardMaterial({ name: 'water' });
water.userData['solid'] = false;
const W: WalkInput = { forward: 1, right: 0, run: false };

/** A box from `min` to `max`, in world metres. */
function block(kit: Kit, min: readonly number[], max: readonly number[], material: Material = stone): void {
  const [x0 = 0, y0 = 0, z0 = 0] = min;
  const [x1 = 0, y1 = 0, z1 = 0] = max;
  kit.add(cube, material, new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0, y1 - y0, z1 - z0)));
}

function step(id: string, build: (kit: Kit) => void): StepDef {
  return { id, chapter: CHAPTERS[0].id, title: id, motion: { kind: 'rise' }, build };
}

const floor = step('floor', (kit) => {
  block(kit, [-30, -0.2, -30], [30, 0, 30]);
});

/** A walker on the world of `steps` at `t` (default: all complete), the way the page builds it. */
function walkerOn(steps: readonly StepDef[], t = steps.length): { walker: Walker; instances: number } {
  const timeline = new Timeline(steps);
  timeline.evaluate(t);
  const world = new CollisionWorld(new GeometryBvhs());
  const stats = world.build(collisionMeshes(timeline.steps, t));
  return { walker: new Walker(world, FLOOR_Y), instances: stats.instances };
}

/** Runs `seconds` of frames at `fps` with `input` held; calls `each` after every frame. */
function hold(walker: Walker, seconds: number, input: WalkInput, fps = 60, each?: (elapsed: number) => void): void {
  const frames = Math.round(seconds * fps);
  for (let i = 1; i <= frames; i += 1) {
    walker.update(1 / fps, input);
    each?.(i / fps);
  }
}

/** Yaw that faces the unit direction (x, z) in the plane. */
const facing = (x: number, z: number): number => Math.atan2(-x, -z);

describe('walker in a box room', () => {
  const room = [
    floor,
    step('walls', (kit) => {
      block(kit, [-5.3, 0, -5.3], [5.3, 3, -5]);
      block(kit, [-5.3, 0, 5], [5.3, 3, 5.3]);
      block(kit, [-5.3, 0, -5], [-5, 3, 5]);
      block(kit, [5, 0, -5], [5.3, 3, 5]);
    }),
  ];

  it('stands on the floor with its eye 1.6 m above it', () => {
    const { walker } = walkerOn(room);
    walker.place(0, 0, 0, 0);
    hold(walker, 0.5, NO_INPUT);
    expect(walker.onGround).toBe(true);
    expect(walker.feet.y).toBeCloseTo(0, 6);
    expect(walker.eye().y).toBeCloseTo(BODY.eye, 6);
  });

  it('walks forward at walking speed and stops at the wall, its radius from the face', () => {
    const { walker } = walkerOn(room);
    walker.place(0, 0, 0, facing(0, -1));
    hold(walker, 1, W);
    // About walking speed after the first tenth of a second.
    expect(walker.feet.z).toBeLessThan(-MOTION.walk * 0.85);
    hold(walker, 3, W);
    expect(walker.feet.z, 'stopped at the wall face (z = -5) plus the radius').toBeGreaterThan(-5 + BODY.radius - 0.01);
    expect(walker.feet.z).toBeLessThan(-5 + BODY.radius + 0.02);
    expect(walker.feet.y).toBeCloseTo(0, 6);
  });

  it('slides along a wall it walks into at 45 degrees instead of stopping', () => {
    const { walker } = walkerOn(room);
    walker.place(3, 0, 0, facing(-Math.SQRT1_2, -Math.SQRT1_2));
    hold(walker, 2.3, W);
    const atWall = walker.feet.clone();
    expect(atWall.z).toBeLessThan(-4);
    hold(walker, 1, W);
    // Along the wall at the level part of walking speed (3 × cos 45° = 2.1 m/s), held off it by the radius.
    expect(atWall.x - walker.feet.x, 'metres slid along the wall in 1 s').toBeGreaterThan(1.8);
    expect(walker.feet.z).toBeGreaterThan(-5 + BODY.radius - 0.01);
  });
});

describe('walker on stairs, ledges and drops', () => {
  it('climbs a flight of 0.17 m risers by walking, and its eye ends 1.6 m above the top', () => {
    const flight = stairFlight({ width: 2.4, steps: 10, riser: 0.17, tread: 0.3, nosing: 0.02 });
    const stairs = [
      floor,
      step('stair', (kit) => {
        kit.add(flight.steps, stone, new Matrix4());
        kit.add(stairLanding({ width: 2.4, depth: 20, thickness: 0.3 }), stone, new Matrix4().makeTranslation(0, 1.7, -3));
      }),
    ];
    const { walker } = walkerOn(stairs);
    walker.place(0, 0, 1.5, facing(0, -1));
    let reached = Number.POSITIVE_INFINITY;
    hold(walker, 4, W, 60, (elapsed) => {
      if (reached === Number.POSITIVE_INFINITY && walker.feet.y > 1.7 - 1e-6 && walker.onGround) reached = elapsed;
    });
    expect(reached, 'seconds to reach the top tread').toBeLessThan(3);
    hold(walker, 1, NO_INPUT);
    expect(walker.feet.y).toBeCloseTo(1.7, 6);
    expect(walker.eye().y).toBeCloseTo(1.7 + BODY.eye, 3);
  });

  it('does not climb a 0.5 m ledge by walking, but steps onto a 0.3 m one', () => {
    for (const [height, climbed] of [[0.5, false], [0.3, true]] as const) {
      const { walker } = walkerOn([floor, step('ledge', (kit) => { block(kit, [-10, 0, -10], [10, height, -2]); })]);
      walker.place(0, 0, 0, facing(0, -1));
      hold(walker, 3, W);
      if (climbed) {
        expect(walker.feet.y, `on the ${String(height)} m ledge`).toBeCloseTo(height, 6);
        expect(walker.feet.z).toBeLessThan(-3);
      } else {
        expect(walker.feet.y, `below the ${String(height)} m ledge`).toBeCloseTo(0, 6);
        expect(walker.feet.z, 'held off the ledge face').toBeGreaterThan(-2);
      }
    }
  });

  it('falls off the edge of a landing at once, and lands on the floor below', () => {
    const { walker } = walkerOn([floor, step('platform', (kit) => { block(kit, [-3, 0, -3], [3, 2, 3]); })]);
    walker.place(0, 2, 2, facing(0, -1));
    expect(walker.feet.y).toBeCloseTo(2, 6);
    const seen = { pastEdge: Number.NaN, fallen: Number.NaN };
    hold(walker, 3, W, 60, (elapsed) => {
      if (Number.isNaN(seen.pastEdge) && walker.feet.z < -3 - 0.05) seen.pastEdge = elapsed;
      if (Number.isNaN(seen.fallen) && walker.feet.y < 2 - 0.3) seen.fallen = elapsed;
    });
    expect(seen.pastEdge, 'seconds until its centre passed the edge').toBeLessThan(3);
    expect(seen.fallen - seen.pastEdge, 'it drops 0.3 m within 0.3 s of its centre passing the edge').toBeLessThan(0.3);
    expect(walker.onGround).toBe(true);
    expect(walker.feet.y).toBeCloseTo(0, 6);
    expect(walker.eye().y).toBeCloseTo(BODY.eye, 3);
  });

  it('walks over a seam without a dip, over a half-metre gap with a small one, and falls into a gap wider than itself', () => {
    for (const [width, dip] of [[0.25, 0.001], [0.5, 0.05], [1.2, null]] as const) {
      const ground = step(`gap-${String(width)}`, (kit) => {
        block(kit, [-10, -0.2, -2], [10, 0, 10]);
        block(kit, [-10, -0.2, -20], [10, 0, -2 - width]);
        block(kit, [-10, -1, -2 - width], [10, -0.8, -2]);
      });
      const { walker } = walkerOn([ground]);
      walker.place(0, 0, 0, facing(0, -1));
      let lowest = 0;
      hold(walker, 2.5, W, 60, () => {
        lowest = Math.min(lowest, walker.feet.y);
      });
      if (dip !== null) {
        expect(lowest, `the lowest the feet went crossing a ${String(width)} m gap`).toBeGreaterThan(-dip);
        expect(walker.feet.z, 'across it').toBeLessThan(-2 - width - 1);
        expect(walker.feet.y).toBeCloseTo(0, 6);
      } else {
        expect(walker.feet.y, `in the ${String(width)} m gap`).toBeCloseTo(-0.8, 6);
      }
    }
  });

  it('jumps about 0.45 m and comes back to the ground', () => {
    const { walker } = walkerOn([floor]);
    walker.place(0, 0, 0, 0);
    walker.jump();
    let top = 0;
    hold(walker, 1.5, NO_INPUT, 60, () => {
      top = Math.max(top, walker.feet.y);
    });
    expect(top).toBeGreaterThan(MOTION.jumpHeight - 0.03);
    expect(top).toBeLessThan(MOTION.jumpHeight + 0.03);
    expect(walker.onGround).toBe(true);
    expect(walker.feet.y).toBeCloseTo(0, 6);
  });

  it('moves the same at 30 and at 144 frames a second', () => {
    const eyes = [30, 144].map((fps) => {
      const { walker } = walkerOn([floor]);
      walker.place(0, 0, 0, facing(0.6, -0.8));
      hold(walker, 1.5, { forward: 1, right: 0.4, run: true }, fps);
      return walker.eye();
    });
    const [a, b] = eyes;
    expect(a?.distanceTo(b ?? new Vector3()), 'eye positions after 1.5 s').toBeLessThan(0.01);
  });
});

describe('what the walker collides with', () => {
  const wall = (material: Material): StepDef => step(`wall-${material.name}`, (kit) => { block(kit, [-10, 0, -2.3], [10, 3, -2], material); });

  it('ignores a step that is not complete at t, and walks into the same wall once it is', () => {
    const steps = [floor, wall(stone)];
    for (const [t, blocked] of [[1.5, false], [2, true]] as const) {
      const { walker } = walkerOn(steps, t);
      walker.place(0, 0, 0, facing(0, -1));
      hold(walker, 2, W);
      if (blocked) expect(walker.feet.z, `t ${String(t)}: stopped by the wall`).toBeGreaterThan(-2);
      else expect(walker.feet.z, `t ${String(t)}: through the half-built wall`).toBeLessThan(-3);
    }
  });

  it('walks through a material marked userData.solid === false', () => {
    const { walker, instances } = walkerOn([floor, wall(water)]);
    expect(instances, 'only the floor collides').toBe(1);
    walker.place(0, 0, 0, facing(0, -1));
    hold(walker, 2, W);
    expect(walker.feet.z).toBeLessThan(-3);
  });

  it('falls to the workspace ground when nothing is built', () => {
    const { walker } = walkerOn([floor], 0);
    walker.place(0, 0, 0, 0);
    hold(walker, 1, NO_INPUT);
    expect(walker.feet.y).toBeCloseTo(FLOOR_Y, 6);
    expect(walker.onGround).toBe(true);
  });
});
