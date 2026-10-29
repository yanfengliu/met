/**
 * The facing checks (./facing.ts) on fixtures worked out by hand. `partVolumes`: a box wound outward and inside out, two boxes, a box mirrored through
 * the builder, the halves of a box that close only together, an open box, a flat membrane, a membrane whose terms cancel only to rounding and a box
 * read along a turned direction. `inwardAlong`: a box either way round, boxes sharing a top, and a slab with a recess in its top, shallower than the
 * slab and deeper, whose floor then stands out under it as a pocket.
 * Bound: fixtures only; src/model/closure.test.ts reads the finished model's parts, and the part tests read their own parts' pockets.
 */
import { Matrix4, TorusGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { MeshBuilder } from './builder.js';
import { inwardAlong, partVolumes } from './facing.js';

const UP = new Vector3(0, 1, 0);

/** A 4 × 2 × 3 m box from (−1, 0, −2) to (3, 2, 1), 24 m³, with the faces `skip` names left out. */
function box(skip: readonly string[] = []): MeshBuilder {
  const b = new MeshBuilder();
  b.box([-1, 0, -2], [3, 2, 1], skip);
  return b;
}

/** `b`'s triangles wound the other way round. */
function inverted(b: MeshBuilder): MeshBuilder {
  const geometry = b.build();
  const index = geometry.getIndex();
  const flipped = new MeshBuilder();
  flipped.append(geometry);
  const out = flipped.build();
  const array = out.getIndex()?.array;
  if (index === null || array === undefined) throw new Error('fixture: an indexed geometry was expected');
  for (let t = 0; t + 2 < array.length; t += 3) [array[t + 1], array[t + 2]] = [array[t + 2] ?? 0, array[t + 1] ?? 0];
  const again = new MeshBuilder();
  again.append(out);
  return again;
}

const volumes = (b: MeshBuilder, along = UP): number[] => partVolumes(b.build(), along).map((part) => Number(part.volume.toFixed(9)));

describe('partVolumes', () => {
  it('reads a box wound outward as its volume, and wound inside out as its volume negated', () => {
    expect(volumes(box())).toEqual([24]);
    expect(volumes(inverted(box()))).toEqual([-24]);
  });

  it('reads each closed part on its own, so one wound inside out among outward ones is seen', () => {
    const b = box();
    b.append(inverted(box()).build(), new Matrix4().makeTranslation(10, 0, 0));
    b.append(box().build(), new Matrix4().makeTranslation(0, 5, 0));
    expect(volumes(b).sort((x, y) => x - y)).toEqual([-24, 24, 24]);
  });

  it('reads a box mirrored through the builder outward, since the builder turns a mirrored copy back', () => {
    const b = new MeshBuilder();
    b.append(box().build(), new Matrix4().makeScale(-1, 1, 1));
    expect(volumes(b)).toEqual([24]);
  });

  it('reads the halves of a box that close only together as one part, outward or inside out', () => {
    // Its top and the rest, apart: neither closes along vertical lines alone.
    const halves = (flip: boolean): MeshBuilder => {
      const b = new MeshBuilder();
      const top = box(['-y', '+x', '-x', '+z', '-z']);
      const rest = box(['+y']);
      b.append((flip ? inverted(top) : top).build(), new Matrix4().makeTranslation(1e-4, 0, 0));
      b.append((flip ? inverted(rest) : rest).build());
      return b;
    };
    // The top's 0.1 mm offset rounds in float32 positions, so its area is read to a few parts in ten million.
    expect(partVolumes(halves(false).build(), UP).map((part) => [Number(part.volume.toFixed(4)), part.parts])).toEqual([[24, 2]]);
    expect(partVolumes(halves(true).build(), UP).map((part) => [Number(part.volume.toFixed(4)), part.parts])).toEqual([[-24, 2]]);
  });

  it('leaves out a part that does not close along the direction even with the others', () => {
    expect(volumes(box(['+y']))).toEqual([]);
  });

  it('reads a part whose faces all stand along the direction as no volume within its noise', () => {
    const fin = new MeshBuilder();
    fin.polygon([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 1, 0), new Vector3(0, 1, 0)]);
    fin.polygon([new Vector3(0, 1, 0), new Vector3(1, 1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 0)]);
    const [part] = partVolumes(fin.build(), UP);
    expect(part?.volume).toBe(0);
    expect(part?.noise).toBe(0);
  });

  it('reads a membrane of two faces back to back as no volume within its noise, though its terms cancel only to rounding (review 0, F15)', () => {
    const [a, b, c] = [new Vector3(-74, -14, -43), new Vector3(-34, -42, 39), new Vector3(-46, 96, 94)];
    const membrane = new MeshBuilder();
    membrane.polygon([a, b, c]);
    membrane.polygon([a, c, b]);
    const [part] = partVolumes(membrane.build(), new Vector3(1, 2, -0.5).normalize());
    expect(part).toBeDefined();
    expect(Math.abs(part?.volume ?? Infinity)).toBeLessThanOrEqual(part?.noise ?? 0);
  });

  it('reads a level membrane as no volume within its noise, its heights levelled before they are averaged (review 1)', () => {
    const [a, b, c] = [new Vector3(5, 15, 16), new Vector3(9, 7, 23), new Vector3(21, 33, 16)];
    const membrane = new MeshBuilder();
    membrane.polygon([a, b, c]);
    membrane.polygon([a, c, b]);
    const [part] = partVolumes(membrane.build(), new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize());
    expect(part).toBeDefined();
    expect(Math.abs(part?.volume ?? Infinity)).toBeLessThanOrEqual(part?.noise ?? 0);
  });

  it('reads the same volume along a turned direction, the box closed along it too', () => {
    const turned = new Vector3(1, 2, -0.5).normalize();
    expect(volumes(box(), turned)).toEqual([24]);
    expect(volumes(inverted(box()), turned)).toEqual([-24]);
  });
});

/** A 1 × 1 m slab 0.1 m thick with a 0.4 × 0.4 m recess `depth` deep in its top, every face looking out of the slab and into the recess. */
function recessed(depth: number): MeshBuilder {
  const b = new MeshBuilder();
  b.box([0, 0, 0], [1, 0.1, 1], ['+y']);
  b.planar(
    [[0, 0], [1, 0], [1, -1], [0, -1]],
    [[[0.3, -0.3], [0.7, -0.3], [0.7, -0.7], [0.3, -0.7]]],
    new Vector3(0, 0.1, 0),
    new Vector3(1, 0, 0),
    new Vector3(0, 0, -1),
  );
  const floor = 0.1 - depth;
  const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);
  // The recess's walls, each facing into it, and its floor, facing up.
  for (const [quad, toward] of [
    [[v(0.3, 0.1, 0.3), v(0.3, 0.1, 0.7), v(0.3, floor, 0.7), v(0.3, floor, 0.3)], v(1, 0, 0)],
    [[v(0.7, 0.1, 0.3), v(0.7, 0.1, 0.7), v(0.7, floor, 0.7), v(0.7, floor, 0.3)], v(-1, 0, 0)],
    [[v(0.3, 0.1, 0.3), v(0.7, 0.1, 0.3), v(0.7, floor, 0.3), v(0.3, floor, 0.3)], v(0, 0, 1)],
    [[v(0.3, 0.1, 0.7), v(0.7, 0.1, 0.7), v(0.7, floor, 0.7), v(0.3, floor, 0.7)], v(0, 0, -1)],
    [[v(0.3, floor, 0.3), v(0.7, floor, 0.3), v(0.7, floor, 0.7), v(0.3, floor, 0.7)], v(0, 1, 0)],
  ] as const) {
    const [a, b2, c] = quad;
    const facing = new Vector3().subVectors(b2, a).cross(new Vector3().subVectors(c, a)).dot(toward);
    b.polygon(facing > 0 ? [...quad] : [...quad].reverse());
  }
  return b;
}

describe('inwardAlong', () => {
  it("finds nothing in a box wound outward, and every line through a box wound inside out, the box's height long", () => {
    expect(inwardAlong(box().build(), UP, 10)).toEqual({ lines: 0, worst: 0, at: null });
    const turned = inwardAlong(inverted(box()).build(), UP, 10);
    expect([turned.lines, Number(turned.worst.toFixed(6))]).toEqual([100, 2]);
  });

  it('finds nothing in boxes that share a top or stand apart, its lines off every edge laid out in round measures (review 0, F14)', () => {
    const b = new MeshBuilder();
    b.box([0, 1, 0], [1, 2, 1]);
    b.box([0, 0, 0], [1, 2, 1]);
    b.box([0, -2, 0], [1, -1, 1]);
    expect(inwardAlong(b.build(), UP, 10)).toEqual({ lines: 0, worst: 0, at: null });
  });

  it('finds nothing in two boxes read along a direction that puts a line on an edge shared by two triangles, the line cast again aside (review 1)', () => {
    const b = new MeshBuilder();
    b.box([0, 1, 0], [1, 2, 1]);
    b.box([0, -2, 0], [1, -1, 1]);
    expect(inwardAlong(b.build(), new Vector3(0.0015990724361849436, 1, 0).normalize(), 64)).toEqual({ lines: 0, worst: 0, at: null });
  });

  it("finds an open tube whose open ends line up along the lines by the lines beside its open edges, where the grid's lines miss it", () => {
    // Diana's bow as it was: an arc of a torus with open ends, turned so that its two ends stand on one vertical line.
    const bow = new MeshBuilder();
    bow.append(new TorusGeometry(0.3, 0.008, 4, 16, Math.PI * 0.8), new Matrix4().makeRotationZ(Math.PI * 0.6));
    const found = inwardAlong(bow.build(), UP, 4);
    expect(found.lines).toBeGreaterThan(0);
    expect(found.worst).toBeGreaterThan(0.2);
  });

  it('finds nothing in a slab whose recess stays inside it, and the pocket of one deeper than the slab, under the recess only', () => {
    expect(inwardAlong(recessed(0.06).build(), UP, 10).lines).toBe(0);
    // On a grid of 10, four lines each way pass through the recess, 0.3 to 0.7 m: 16 of them, each 4 cm in the pocket under the slab.
    const deep = inwardAlong(recessed(0.14).build(), UP, 10);
    expect([deep.lines, Number(deep.worst.toFixed(6))]).toEqual([16, 0.04]);
    expect(deep.at?.y).toBe(0);
  });
});
