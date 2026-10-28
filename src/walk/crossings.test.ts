/**
 * Where a vertical line crosses a piece (src/walk/collision.ts `crossings`), which the walk's settle reads by parity (docs/design/spec.md, Walk mode:
 * When the build moves), on fixtures built through the page's collision path: one surface met through an edge or a corner of its triangles counts once,
 * two faces back to back in one piece count twice, and so do a face looking up and one looking down meeting at the line, so a closed piece is crossed an
 * even number of times; and a walker that a piece of two parts is built through is found inside the upper part. Two pins: two overlapping parts whose
 * faces share planes are crossed at each, so their overlap reads as outside, and a walker in it is found by their tops where they are shorter than it
 * and missed wholly inside a taller one (the bound src/model/closure.test.ts keeps on the model); and a rusticated wall whose window's sill lies on a
 * channel's floor and head on a channel's ceiling lays one face at each, not two.
 * Bound: fixtures only; src/model/closure.test.ts checks that every piece of the model is closed along vertical lines.
 */
import { BufferGeometry, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { StepDef } from '../build/types.js';
import { MeshBuilder } from '../model/lib/builder.js';
import { wall } from '../model/lib/wall.js';
import { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes, instancesBefore } from './collision.js';
import { insideBetween, NO_INPUT, Walker } from './walker.js';

const stone = new MeshStandardMaterial({ name: 'stone' });

/** A square face at height `y` over −h..h, as four triangles round its centre, looking up or down. */
function face(b: MeshBuilder, y: number, h: number, up: boolean): void {
  const corners = [new Vector3(-h, y, -h), new Vector3(h, y, -h), new Vector3(h, y, h), new Vector3(-h, y, h)];
  const ring = up ? [...corners].reverse() : corners;
  ring.forEach((p, k) => {
    b.polygon([new Vector3(0, y, 0), p, ring[(k + 1) % 4] ?? p]);
  });
}

/** A closed box over −h..h from `y0` to `y1`, its top and bottom faces each four triangles round the centre. */
function block(b: MeshBuilder, y0: number, y1: number, h = 2): void {
  b.box([-h, y0, -h], [h, y1, h], ['+y', '-y']);
  face(b, y1, h, true);
  face(b, y0, h, false);
}

/** Two closed parts in one geometry: a block from 0 to 1 m and another from 1 to 3 m on it. */
function stacked(): BufferGeometry {
  const b = new MeshBuilder();
  block(b, 0, 1);
  block(b, 1, 3);
  return b.build();
}

/** A closed prism along X whose section is a square on its corner: corners at Z ±1 on Y 0 and at Y ±1 on Z 0, so its sides meet at Z ±1. */
function diamond(): BufferGeometry {
  const b = new MeshBuilder();
  const section = [new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0), new Vector3(0, 0, -1)];
  for (let k = 0; k < 4; k += 1) {
    const p = section[k] ?? section[0];
    const q = section[(k + 1) % 4] ?? section[0];
    if (p === undefined || q === undefined) continue;
    b.polygon([p.clone().setX(1), q.clone().setX(1), q.clone().setX(-1), p.clone().setX(-1)]);
  }
  b.polygon([...section].reverse().map((p) => p.clone().setX(1)));
  b.polygon(section.map((p) => p.clone().setX(-1)));
  return b.build();
}

const step = (id: string, geometry: BufferGeometry, matrix = new Matrix4()): StepDef => ({
  id,
  chapter: CHAPTERS[0].id,
  title: id,
  motion: { kind: 'rise' },
  build: (kit) => {
    kit.add(geometry, stone, matrix);
  },
});

/** The collision world of `steps`, all complete. */
function world(steps: readonly StepDef[]): CollisionWorld {
  const timeline = new Timeline(steps);
  timeline.evaluate(steps.length);
  const out = new CollisionWorld(new GeometryBvhs());
  out.build(collisionMeshes(timeline.steps, steps.length));
  return out;
}

/** The heights where the line through (x, z) crosses the world's pieces, to the micrometre (positions are stored in single precision). */
const heightsAt = (w: CollisionWorld, x: number, z: number): number[] => w.crossings(x, z, -10, 10).flatMap((p) => p.heights.map((h) => Math.round(h * 1e6) / 1e6 + 0));

describe('where a vertical line crosses a piece', () => {
  it('counts two faces back to back in one piece as two crossings: a block on a block is crossed four times, through a face, an edge or a corner', () => {
    const w = world([step('stack', stacked())]);
    // Inside one triangle of each face, on the edge two of them share, and through the corner all four share.
    for (const [x, z] of [[0.7, 0.2], [0.5, 0.5], [0, 0], [-1.3, 0.4]] as const) {
      expect(heightsAt(w, x, z), `the line through X ${String(x)}, Z ${String(z)}`).toEqual([0, 1, 1, 3]);
    }
  });

  it('counts a face looking up and one looking down that meet at the line as two crossings', () => {
    const w = world([step('diamond', diamond())]);
    expect(heightsAt(w, 0.25, 0.5), 'through both faces on the side').toEqual([-0.5, 0.5]);
    expect(heightsAt(w, 0.25, 1), 'through the edge where the sides meet').toEqual([0, 0]);
  });

  it('finds a walker that a piece of two parts is built through inside its upper part, and lifts it onto the top (src/walk/walker.ts settle)', () => {
    const floor = new MeshBuilder();
    floor.box([-20, -0.2, -20], [20, 0, 20]);
    const steps = [step('floor', floor.build()), step('stack', stacked())];
    const timeline = new Timeline(steps);
    const w = new CollisionWorld(new GeometryBvhs());
    timeline.evaluate(1);
    w.build(collisionMeshes(timeline.steps, 1));
    const walker = new Walker(w, -1);
    // 1.3 m from the parts' sides, out of reach of the capsule test, so only the check after the build can find it inside.
    walker.place(0.7, 0, 0.2, 0);
    expect(walker.feet.y, 'on the floor').toBeCloseTo(0, 6);
    timeline.evaluate(2);
    w.build(collisionMeshes(timeline.steps, 2));
    expect(walker.settle(instancesBefore(timeline.steps, 1)), 'its feet in the lower part and its head in the upper').toBe('moved');
    for (let i = 0; i < 30; i += 1) walker.update(1 / 60, NO_INPUT);
    expect(walker.feet.y, 'on the upper part').toBeCloseTo(3, 6);
    expect(walker.onGround).toBe(true);
  });

  it('keeps reading a piece crossed an odd number of times, a sheet, as having no inside, so one built through a walker leaves it be', () => {
    const sheet = new BufferGeometry();
    sheet.setAttribute('position', new Float32BufferAttribute([-2, 1, -2, -2, 1, 2, 2, 1, 2, 2, 1, -2], 3));
    sheet.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    sheet.setIndex([0, 1, 2, 0, 2, 3]);
    const w = world([step('sheet', sheet)]);
    expect(heightsAt(w, 0.3, -0.4)).toEqual([1]);
    expect(heightsAt(w, 0.5, 0.5), 'on the edge its two triangles share').toEqual([1]);
    expect(insideBetween([1], -10, 10), 'no inside anywhere on the line').toBe(false);
    const floor = new MeshBuilder();
    floor.box([-20, -0.2, -20], [20, 0, 20]);
    const timeline = new Timeline([step('floor', floor.build()), step('sheet', sheet)]);
    const walk = new CollisionWorld(new GeometryBvhs());
    timeline.evaluate(1);
    walk.build(collisionMeshes(timeline.steps, 1));
    const walker = new Walker(walk, -1);
    walker.place(0.3, 0, -0.4, 0);
    timeline.evaluate(2);
    walk.build(collisionMeshes(timeline.steps, 2));
    expect(walker.settle(instancesBefore(timeline.steps, 1)), 'the sheet at 1 m crosses its body, but has no inside to hold it').toBe('kept');
  });

  it('counts the faces two overlapping parts share planes with each, so their overlap reads as outside (the bound the closure gate measures)', () => {
    const b = new MeshBuilder();
    b.box([-2, 0, -2], [2, 3, 2]);
    b.box([-1, 0, -1], [3, 3, 3]);
    const w = world([step('overlap', b.build())]);
    expect(heightsAt(w, 0.3, 0.1), 'inside both parts').toEqual([0, 0, 3, 3]);
    expect(heightsAt(w, -1.5, -1.5), 'inside one').toEqual([0, 3]);
  });

  it('finds a walker that two overlapping parts shorter than it are built through, by their tops, and misses one wholly inside a taller overlap', () => {
    for (const [height, settled] of [
      [1.2, 'moved'],
      [3, 'kept'],
    ] as const) {
      const b = new MeshBuilder();
      b.box([-2, 0, -2], [2, height, 2]);
      b.box([-1, 0, -1], [3, height, 3]);
      const floor = new MeshBuilder();
      floor.box([-20, -0.2, -20], [20, 0, 20]);
      const timeline = new Timeline([step('floor', floor.build()), step('overlap', b.build())]);
      const w = new CollisionWorld(new GeometryBvhs());
      timeline.evaluate(1);
      w.build(collisionMeshes(timeline.steps, 1));
      const walker = new Walker(w, -1);
      // Inside both parts, 1.1 m or more from their sides, out of reach of the capsule test.
      walker.place(0.3, 0, 0.1, 0);
      timeline.evaluate(2);
      w.build(collisionMeshes(timeline.steps, 2));
      expect(walker.settle(instancesBefore(timeline.steps, 1)), `parts ${String(height)} m tall`).toBe(settled);
      if (settled === 'moved') expect(walker.feet.y, 'on their tops').toBeCloseTo(height, 6);
    }
  });

  it("lays one face where a window's sill lies on a channel's floor and its head on a channel's ceiling, so the opening reads as outside", () => {
    // Channels 0.1 m high and deep at 1.2 and 2.4 m: the window from 1.15 m, the first channel's floor, to 2.45 m, the second's ceiling.
    const rusticated = wall({ width: 4, height: 4, thickness: 0.5, openings: [{ width: 1, y: 1.15, height: 1.3 }], rustication: { course: 1.2, joint: 0.1, depth: 0.1, start: 1.2, stop: 2.4 } });
    const w = world([step('wall', rusticated)]);
    for (const z of [-0.05, -0.3]) expect(heightsAt(w, 0.2, z), `through the window, Z ${String(z)}`).toEqual([0, 1.15, 2.45, 4]);
  });
});
