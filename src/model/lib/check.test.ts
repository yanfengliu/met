/**
 * The closure check (`openAlong`, ./check.ts) on fixtures whose open boundary is worked out by hand: closed solids, the same solids with a face left out,
 * faces along the lines, sheets, ends split on another edge's inside (a T-junction), rounding far from the origin and lines turned off the frame's Y.
 * Bound: fixtures only; src/model/closure.test.ts runs it over the finished model.
 */
import { BoxGeometry, CylinderGeometry, Matrix4, PlaneGeometry, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { MeshBuilder } from './builder.js';
import { openAlong } from './check.js';

const UP = new Vector3(0, 1, 0);

/** A box from (−1, 0, −2) to (3, 2, 1), a 4 × 3 m footprint, with the faces `skip` names left out. */
function box(skip: readonly string[] = []): MeshBuilder {
  const b = new MeshBuilder();
  b.box([-1, 0, -2], [3, 2, 1], skip);
  return b;
}

/** A quad facing −Y at y = 0 over x0..x1, z −2..1, the box's footprint or part of it. */
function under(b: MeshBuilder, x0: number, x1: number): void {
  b.polygon([new Vector3(x0, 0, -2), new Vector3(x1, 0, -2), new Vector3(x1, 0, 1), new Vector3(x0, 0, 1)]);
}

describe('openAlong', () => {
  it('finds closed solids closed, of any triangulation', () => {
    expect(openAlong(box().build(), UP)).toBeNull();
    expect(openAlong(new BoxGeometry(1, 2, 3, 3, 4, 5), UP)).toBeNull();
    expect(openAlong(new SphereGeometry(1, 16, 12), UP)).toBeNull();
    expect(openAlong(new CylinderGeometry(1, 0.6, 2, 12), UP)).toBeNull();
  });

  it('measures the open boundary of a box with no bottom or no top: its footprint, 14 m round', () => {
    expect(openAlong(box(['-y']).build(), UP)?.length).toBeCloseTo(14, 9);
    expect(openAlong(box(['+y']).build(), UP)?.length).toBeCloseTo(14, 9);
  });

  it('counts faces along the lines for nothing: a box with no ends, and a tube with no top or bottom, are closed along vertical lines', () => {
    expect(openAlong(box(['+x', '-x', '+z']).build(), UP)).toBeNull();
    expect(openAlong(new CylinderGeometry(1, 1, 2, 12, 1, true), UP)).toBeNull();
    expect(openAlong(new PlaneGeometry(2, 3), UP)).toBeNull();
  });

  it('finds a flat sheet open all round, and says where', () => {
    const sheet = new PlaneGeometry(2, 3).rotateX(-Math.PI / 2).translate(10, 0, -4);
    const open = openAlong(sheet, UP);
    expect(open?.length).toBeCloseTo(10, 9);
    expect(Math.abs((open?.at.x ?? 0) - 10) <= 1 + 1e-9 && Math.abs((open?.at.z ?? 0) + 4) <= 1.5 + 1e-9, 'a point on the sheet\'s edge').toBe(true);
  });

  it('splits an edge at the ends on its inside: a bottom in two quads under a top in one is closed, and with one quad gone the gap is open', () => {
    const split = box(['-y']);
    under(split, -1, 0.5);
    under(split, 0.5, 3);
    expect(openAlong(split.build(), UP)).toBeNull();
    const gap = box(['-y']);
    under(gap, -1, 0.5);
    expect(openAlong(gap.build(), UP)?.length, 'the 2.5 × 3 m gap').toBeCloseTo(11, 9);
  });

  it('joins ends that rounding parts: 300 m from the origin, a bottom 30 µm off its box\'s corners', () => {
    const far = new Matrix4().makeTranslation(300.123, 7, -250.456);
    const b = new MeshBuilder();
    b.append(box(['-y']), far);
    const bottom = new MeshBuilder();
    under(bottom, -1, 0.5);
    under(bottom, 0.5, 3);
    b.append(bottom, far.clone().multiply(new Matrix4().makeTranslation(2e-5, 0, -2e-5)));
    expect(openAlong(b.build(), UP)).toBeNull();
  });

  it('reads lines turned off the frame\'s Y: world vertical in the frame of a piece turned 30 degrees about X', () => {
    const turned = new Vector3(0, 1, 0).applyAxisAngle(new Vector3(1, 0, 0), -Math.PI / 6);
    expect(openAlong(box().build(), turned)).toBeNull();
    // Seen at a slant, the box's open bottom and its sides no longer cover each other's projections.
    expect(openAlong(box(['-y']).build(), turned)).not.toBeNull();
    expect(openAlong(box(['+x', '-x']).build(), turned)).toBeNull();
    expect(openAlong(box(['+z']).build(), turned)).not.toBeNull();
  });
});
