/**
 * Where a vertical line crosses a piece (src/walk/collision.ts `crossings`, by src/walk/crossing-rule.ts), which the walk's settle reads by parity and
 * its probes by the winding of the faces (docs/design/spec.md, Walk mode: When the build moves), on fixtures built through the page's collision path:
 * one surface met through an edge or a corner of its triangles counts once, a block on a block is crossed four times through a face, an edge and a
 * corner, as two faces back to back in one piece count twice, and so do a face looking up and one looking down meeting at the line, so a closed piece
 * is crossed an even number of times; a walker that a piece of two parts is built through is found inside the upper part; a single surface with no
 * inside keeps a walker in it; and a declared sheet has no inside even where its panes overlap, as two panes 2 cm apart and a hipped skylight's over
 * its hip do, so one built through a walker leaves it be, which the same panes undeclared do not, its mark the same in a world of moving pieces (red
 * without settle's reading of sheets: the panes' walker moved).
 * Two overlapping parts whose faces share planes are crossed at each, so their overlap reads as outside (a pin), and a walker in it is found by their
 * tops 1.2 m up where they are shorter than it and missed wholly inside a taller one, 3 m tall (the bound src/model/closure.test.ts keeps on the model).
 * On a line along edges of both parts' faces in one of those planes, as their bottom diagonals, which cross there, the line is read again off them, so
 * each part's face counts and a walker on it is found 1.2 m up too; and so it is for review 2's piece of two parts turned half round X, its tops in one
 * plane, and for the same parts upright, the shorter's top inside the taller, the faces' facings read as built (work unit 13, review 2, F8). Red at
 * c2a9bcc, which read hits at one height facing one way on edges once whatever the edges: [0, 3, 3] along both bottoms' diagonals and the walker on
 * that line kept; [0, 0, 0.25] facings [−1, −1, 1] turned and [0, 0.25, 0.5] facings [−1, 1, 1] upright. A part doubled, the faces of its two copies on
 * one another, is read once along an edge both have (a pin of the rule's bound). And a rusticated wall whose window's sill lies on a channel's floor
 * and head on a channel's ceiling lays one face at each, not two, so the window is crossed once at each (red without `intervalsAt`'s edge mode in
 * src/model/lib/wall.ts; no wall in the model puts an opening's edge on a channel's).
 * Red with main's crossing rule, which counted hits within 1 µm once, in 8 of these 11 tests.
 * Bound: fixtures only; src/model/closure.test.ts checks that every piece of the model is closed along vertical lines.
 */
import { BufferGeometry, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { StepDef } from '../build/types.js';
import { MeshBuilder } from '../model/lib/builder.js';
import { hippedSkylight } from '../model/lib/glazing.js';
import { sheet } from '../model/lib/sheet.js';
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

  it("reads a line along the piece's own outer corner or edge as through its faces, where one surface's triangles meet it there, as it stood", () => {
    const w = world([step('stack', stacked())]);
    // The outer corner two triangles of each face share, and a point of the outer edge one triangle of each face has.
    for (const [x, z] of [[2, 2], [2, 0.7]] as const) expect(heightsAt(w, x, z), `the line through X ${String(x)}, Z ${String(z)}`).toEqual([0, 1, 1, 3]);
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

  it('keeps reading a piece crossed an odd number of times, a single surface, as having no inside, so one built through a walker leaves it be', () => {
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
    expect(walker.settle(instancesBefore(timeline.steps, 1)), 'the surface at 1 m crosses its body, but has no inside to hold it').toBe('kept');
  });

  it('reads no inside in a declared sheet, even where its panes overlap, so one built through a walker leaves it be; undeclared, the walker is inside', () => {
    // Two panes, the upper 2 cm over the lower; and the library's hipped skylight, whose panes, each set back along its own normal, overlap over a hip.
    const panes = new MeshBuilder();
    face(panes, 1, 2, true);
    face(panes, 1.02, 2, true);
    const skylight = hippedSkylight({ width: 4, length: 6 }).glass;
    // Across the hip from (2, 3) to the ridge's end at (0, 1), which passes X 1 at Z 2.
    const scan = world([step('skylight', skylight)]);
    const hip = Array.from({ length: 200 }, (_, k) => 1.8 + k * 0.002).find((z) => scan.crossings(1, z, -10, 10).some((p) => p.heights.length === 2));
    expect(hip, 'a line across the hip through two of its panes').toBeDefined();
    for (const [what, geometry, x, z] of [
      ['two panes', panes.build(), 0.3, -0.4],
      ['a hipped skylight', skylight, 1, hip ?? 0],
    ] as const) {
      for (const declared of [true, false]) {
        const g = geometry.clone();
        g.userData = {};
        if (declared) sheet(g);
        const floor = new MeshBuilder();
        floor.box([-20, -0.2, -20], [20, 0, 20]);
        const timeline = new Timeline([step('floor', floor.build()), step('panes', g)]);
        const w = new CollisionWorld(new GeometryBvhs());
        timeline.evaluate(1);
        w.build(collisionMeshes(timeline.steps, 1));
        const walker = new Walker(w, -1);
        walker.place(x, 0, z, 0);
        timeline.evaluate(2);
        w.build(collisionMeshes(timeline.steps, 2));
        const from = instancesBefore(timeline.steps, 1);
        const line = w.crossings(x, z, -10, 10).find((p) => p.instance >= from);
        expect(line?.heights.length, `${what}: crossings on the walker's axis`).toBe(2);
        expect(line?.sheet, `${what}: ${declared ? '' : 'not '}a sheet`).toBe(declared);
        // A world of pieces that move reads the mark as a static one does.
        const moving = new CollisionWorld(new GeometryBvhs());
        moving.buildPieces([g]);
        moving.move(0, new Matrix4());
        expect(moving.crossings(x, z, -10, 10)[0]?.sheet, `${what}, moving: ${declared ? '' : 'not '}a sheet`).toBe(declared);
        const settled = walker.settle(from);
        if (declared) expect(settled, `${what}, a sheet: no inside`).toBe('kept');
        else expect(settled, `${what}, no sheet: inside between its two crossings`).not.toBe('kept');
      }
    }
  });

  it('counts the faces two overlapping parts share planes with each, so their overlap reads as outside (the bound the closure gate measures)', () => {
    const b = new MeshBuilder();
    b.box([-2, 0, -2], [2, 3, 2]);
    b.box([-1, 0, -1], [3, 3, 3]);
    const w = world([step('overlap', b.build())]);
    expect(heightsAt(w, 0.3, 0.1), 'inside both parts').toEqual([0, 0, 3, 3]);
    expect(heightsAt(w, -1.5, -1.5), 'inside one').toEqual([0, 3]);
    // Along both parts' bottom diagonals, which cross there in the plane the parts share: the line is read again off them, so each part's bottom counts.
    expect(heightsAt(w, 0.5, 0.5), "along both bottoms' diagonals").toEqual([0, 0, 3, 3]);
    expect(w.crossings(0.5, 0.5, -10, 10)[0]?.facings, "along both bottoms' diagonals, which way each face looks").toEqual([-1, -1, 1, 1]);
  });

  it("reads each part's face where edges of two overlapping parts' faces in one plane cross at the line, either way up (work unit 13, review 2, F8)", () => {
    // Review 2's piece, turned half round X (scaled −1 in Y and Z, its determinant positive), its parts' tops (their bottoms as built) in one plane 0.25 m
    // up, the line through (0.5, 0) along both tops' diagonals; and the same parts upright, the shorter half as tall, their bottoms in one plane at 0.
    const turned = new MeshBuilder();
    turned.box([-2, 0, -2], [2, 2, 2]);
    turned.box([-1, 0, -1], [3, 2, 3]);
    const upright = new MeshBuilder();
    upright.box([-2, 0, -2], [2, 1, 2]);
    upright.box([-1, 0, -1], [3, 2, 3]);
    const read = (geometry: BufferGeometry, matrix: Matrix4): [number[], readonly number[] | undefined] => {
      const w = world([step('crossed', geometry, matrix)]);
      return [heightsAt(w, 0.5, 0), w.crossings(0.5, 0, -10, 10)[0]?.facings];
    };
    const [turnedMatrix, uprightMatrix] = [
      new Matrix4().compose(new Vector3(0.484375, 0.25, 0.015625), new Quaternion(), new Vector3(0.03125, -0.125, -0.03125)),
      new Matrix4().compose(new Vector3(0.484375, 0, -0.015625), new Quaternion(), new Vector3(0.03125, 0.25, 0.03125)),
    ];
    // Each as built and without an index, as three's non-indexed geometries (the Astor Court's rocks) are.
    const both = {
      turned: read(turned.build(), turnedMatrix),
      upright: read(upright.build(), uprightMatrix),
      'turned, not indexed': read(turned.build().toNonIndexed(), turnedMatrix),
      'upright, not indexed': read(upright.build().toNonIndexed(), uprightMatrix),
    };
    const [tops, bottoms] = [[[0, 0, 0.25, 0.25], [-1, -1, 1, 1]], [[0, 0, 0.25, 0.5], [-1, -1, 1, 1]]];
    expect(both, "the heights where both faces' diagonals cross, and which way each face looks").toEqual({ turned: tops, upright: bottoms, 'turned, not indexed': tops, 'upright, not indexed': bottoms });
  });

  it("reads each part's face where their edges cross on a piece tilted 20° about Z too, its faces read again a few micrometres higher or lower (review 3)", () => {
    const turned = new MeshBuilder();
    turned.box([-2, 0, -2], [2, 2, 2]);
    turned.box([-1, 0, -1], [3, 2, 3]);
    const matrix = new Matrix4().compose(new Vector3(0.484375, 0.25, 0.015625), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 9), new Vector3(0.03125, -0.125, -0.03125));
    // Where both parts' diagonals cross, their tops' corner as built, in the world.
    const at = new Vector3(0.5, 0, 0.5).applyMatrix4(matrix);
    const line = world([step('tilted', turned.build(), matrix)]).crossings(at.x, at.z, -10, 10)[0];
    // In through each part's tilted side, out through both tops where their diagonals cross, read 5.8 µm higher 30 µm off on their 20° slope.
    expect(line?.facings, 'which way each face looks: both parts read').toEqual([-1, -1, 1, 1]);
    expect(line?.heights.slice(2), "both tops, where their diagonals cross").toEqual([expect.closeTo(at.y, 4), expect.closeTo(at.y, 4)]);
  });

  it("keeps reading a piece along its own outline where the line is in doubt, never a line read off it (work unit 13, review 3, F10)", () => {
    // Review 3's two boxes, one's corner on the other's edge at (0.5, 0), both their sides in the plane X 0.5; and two boxes whose sides on X 0 and on
    // Z 0 cross at (0, 0), three quarters round it inside one of them. Red at f6fa16a, which took the first line read off that met no edge: none.
    const edged = new MeshBuilder();
    edged.box([0.375, 0.25, -1], [0.5, 0.375, 0]);
    edged.box([0.40625, 0.25, -0.5], [0.5, 0.375, 0.5]);
    const crossed = new MeshBuilder();
    crossed.box([-4, 0, -4], [0, 1, 1]);
    crossed.box([-4, 0, -4], [1, 1, 0]);
    const along = (geometry: BufferGeometry, x: number, z: number): [number[], readonly number[] | undefined] => {
      const w = world([step('outline', geometry)]);
      return [heightsAt(w, x, z), w.crossings(x, z, -10, 10)[0]?.facings];
    };
    expect({ edged: along(edged.build(), 0.5, 0), crossed: along(crossed.build(), 0, 0) }, 'the piece read on its outline, and which way each face looks').toEqual({
      edged: [[0.25, 0.375], [-1, 1]],
      crossed: [[0, 1], [-1, 1]],
    });
  });

  it("reads a part doubled once along an edge both its copies' faces have, and two parts once along a ridge they share, the crossing rule's bound", () => {
    const b = new MeshBuilder();
    b.box([-2, 0, -2], [2, 3, 2]);
    b.box([-2, 0, -2], [2, 3, 2]);
    const w = world([step('doubled', b.build())]);
    expect(heightsAt(w, 0.3, 0.1), 'inside both copies').toEqual([0, 0, 3, 3]);
    expect(heightsAt(w, 0.5, 0.5), "along both bottoms' diagonal, one edge of the same places").toEqual([0, 3, 3]);
    // Two prisms along X, their bases on Z ±1 and Z ±0.5 and their ridges one, 2 m up on Z 0 (review 3, F13).
    const roofs = new MeshBuilder();
    for (const half of [1, 0.5]) {
      const section = [new Vector3(0, 0, -half), new Vector3(0, 0, half), new Vector3(0, 2, 0)];
      section.forEach((p, k) => {
        const q = section[(k + 1) % 3] ?? p;
        roofs.polygon([p.clone().setX(2), q.clone().setX(2), q.clone().setX(-2), p.clone().setX(-2)]);
      });
      roofs.polygon([...section].reverse().map((p) => p.clone().setX(2)));
      roofs.polygon(section.map((p) => p.clone().setX(-2)));
    }
    const ridge = world([step('ridge', roofs.build())]);
    expect(heightsAt(ridge, 0.5, 0.2), 'off the ridge, through both roofs').toEqual([0, 0, 1.2, 1.6]);
    expect(heightsAt(ridge, 0.5, 0), 'along the ridge both roofs have').toEqual([0, 0, 2]);
  });

  it("finds a walker that two overlapping parts shorter than it are built through, by their tops, along both bottoms' diagonals too, and misses one wholly inside a taller overlap", () => {
    // The last: on the line along both bottoms' diagonals, which the crossing rule reads again off them.
    for (const [height, x, z, settled] of [
      [1.2, 0.3, 0.1, 'moved'],
      [3, 0.3, 0.1, 'kept'],
      [1.2, 0.5, 0.5, 'moved'],
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
      walker.place(x, 0, z, 0);
      timeline.evaluate(2);
      w.build(collisionMeshes(timeline.steps, 2));
      expect(walker.settle(instancesBefore(timeline.steps, 1)), `parts ${String(height)} m tall, at X ${String(x)}, Z ${String(z)}`).toBe(settled);
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
