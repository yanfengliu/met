/**
 * The placeholder forms of the collection (docs/design/spec.md, Collection): one unit geometry per form, each filling the box X −0.5..0.5 (across),
 * Y 0..1 (up), Z −0.5..0.5 (front to back, front toward +Z) and centred in X and Z, so a piece's matrix scales it to the object's real width, height and
 * depth and its translation is its base centre. Shared by every artwork of the form (one instanced mesh per form and step, whatever the colours:
 * src/model/collection/material.ts colours each instance). Built once, on first use; never mutate them.
 * Forms: a standing figure (statues, armours), a group (a figure with a smaller one beside it: wider than a single figure), a recumbent figure
 * (a sphinx, a crab: longer than high), a bust, a jar and a dish (vessels), a slab
 * (reliefs, panels, shields), a block (capitals, chests: the `plinth` kind), a canvas (a painting's surface, its front face at Z = +0.5), and the unit
 * box the plinths, vitrines and frames are made of.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { lathe, MeshBuilder } from '../lib/index.js';
import type { V2 } from '../lib/index.js';

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

const SEGMENTS = 16;

/** A body of revolution from an open profile (radius, height) that starts and ends on the axis; its widest radius is 0.5. */
const turned = (points: readonly V2[]): BufferGeometry => lathe({ closed: false, points }, { segments: SEGMENTS });

/** A tapering limb from `a` to `b`, radii `ra` and `rb`, appended to `builder`. */
function limb(builder: MeshBuilder, a: readonly [number, number, number], b: readonly [number, number, number], ra: number, rb: number): void {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const shaft = turned([
    [0, 0],
    [ra, 0],
    [rb, length],
    [0, length],
  ]);
  const axis = [(b[0] - a[0]) / length, (b[1] - a[1]) / length, (b[2] - a[2]) / length] as const;
  // Turn +Y onto the limb: about the axis Y × limb by the angle between them.
  const cx = axis[2];
  const cz = -axis[0];
  const sin = Math.hypot(cx, cz);
  const turn = sin < 1e-9 ? new Matrix4() : new Matrix4().makeRotationAxis(new Vector3(cx / sin, 0, cz / sin), Math.atan2(sin, axis[1]));
  builder.append(shaft, new Matrix4().makeTranslation(a[0], a[1], a[2]).multiply(turn));
}

/** A draped body with shoulders and a head, its widest radius 0.4 at the shoulders, from y = 0 to 1, without a base. */
const BODY: readonly V2[] = [
  [0, 0],
  [0.36, 0],
  [0.33, 0.08],
  [0.29, 0.3],
  [0.33, 0.47],
  [0.28, 0.6],
  [0.36, 0.72],
  [0.4, 0.8],
  [0.15, 0.835],
  [0.14, 0.86],
  [0.21, 0.9],
  [0.21, 0.95],
  [0.15, 0.985],
  [0, 1],
];

/** One standing body with its arms at its sides, appended to `builder` through `at` (the body's unit frame: radius 0.4, height 1). */
function body(builder: MeshBuilder, at: Matrix4): void {
  const figure = new MeshBuilder();
  figure.append(turned(BODY));
  for (const s of [-1, 1]) limb(figure, [s * 0.36, 0.79, 0], [s * 0.42, 0.5, 0.06], 0.075, 0.06);
  builder.append(figure.build(), at);
}

/** A standing figure on its own thin base: draped body, shoulders, arms at its sides and a head. */
export const standingFigure = lazy(() => {
  const b = new MeshBuilder();
  b.append(
    turned([
      [0, 0],
      [0.5, 0],
      [0.5, 0.03],
      [0, 0.03],
    ]),
  );
  body(b, new Matrix4().makeTranslation(0, 0.03, 0).multiply(new Matrix4().makeScale(1, 0.97, 1)));
  return b.build();
});

/** A group, wider than a single figure: a taller figure and a smaller one beside it, a little forward, on one base. */
export const figureGroup = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 0.04, 0.5]);
  // Arms reach 0.48 from a body's axis: the taller body spans X −0.5..0.1, the smaller 0.09..0.49.
  body(b, new Matrix4().makeTranslation(-0.2, 0.04, -0.05).multiply(new Matrix4().makeScale(0.62, 0.96, 1.1)));
  body(b, new Matrix4().makeTranslation(0.29, 0.04, 0.08).multiply(new Matrix4().makeScale(0.42, 0.62, 0.9)));
  return b.build();
});

/** A recumbent figure, longest front to back: a base, a long body, forelegs reaching forward and a raised head and chest at the front (+Z). */
export const recumbentFigure = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 0.08, 0.5]);
  const body = turned([
    [0, 0],
    [0.24, 0.02],
    [0.3, 0.2],
    [0.3, 0.55],
    [0.22, 0.72],
    [0, 0.75],
  ]);
  // The body lies along Z from −0.48 to 0.27, its axis 0.36 up; scaled to 0.84 across and 0.5 high.
  b.append(body, new Matrix4().makeTranslation(0, 0.33, -0.48).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeScale(1.4, 1, 0.85)));
  b.box([-0.32, 0.08, 0.12], [-0.14, 0.2, 0.5]);
  b.box([0.14, 0.08, 0.12], [0.32, 0.2, 0.5]);
  b.append(
    turned([
      [0, 0],
      [0.18, 0.04],
      [0.22, 0.2],
      [0.17, 0.38],
      [0, 0.42],
    ]),
    new Matrix4().makeTranslation(0, 0.58, 0.24),
  );
  return b.build();
});

/** A bust on a short socle: chest and shoulders, neck and head. */
export const bust = lazy(() =>
  turned([
    [0, 0],
    [0.28, 0],
    [0.28, 0.06],
    [0.2, 0.08],
    [0.44, 0.14],
    [0.5, 0.3],
    [0.42, 0.42],
    [0.14, 0.5],
    [0.14, 0.58],
    [0.22, 0.63],
    [0.25, 0.76],
    [0.22, 0.9],
    [0.12, 0.98],
    [0, 1],
  ]),
);

/** A jar or vase: foot, swelling body, shoulder, neck and lip. */
export const jar = lazy(() =>
  turned([
    [0, 0],
    [0.3, 0],
    [0.3, 0.04],
    [0.26, 0.07],
    [0.45, 0.25],
    [0.5, 0.4],
    [0.45, 0.6],
    [0.3, 0.78],
    [0.17, 0.86],
    [0.19, 0.96],
    [0.24, 1],
    [0, 0.97],
  ]),
);

/** A dish or plate: a low foot ring and a wide shallow bowl, open on top. */
export const dish = lazy(() =>
  turned([
    [0, 0.12],
    [0.24, 0.12],
    [0.26, 0],
    [0.3, 0],
    [0.3, 0.18],
    [0.47, 0.75],
    [0.5, 1],
    [0.45, 0.92],
    [0.3, 0.4],
    [0, 0.34],
  ]),
);

/** A relief or panel: a back slab and a raised field on its front. */
export const slab = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.1]);
  b.box([-0.43, 0.07, 0.1], [0.43, 0.93, 0.5], ['-z']);
  return b.build();
});

/** A block: a box with a narrower top course, for capitals, chests and other box-like objects. */
export const block = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 0.9, 0.5]);
  b.box([-0.46, 0.9, -0.46], [0.46, 1, 0.46], ['-y']);
  return b.build();
});

/** A painting's surface on its stretcher: a thin box whose front face, at Z = +0.5, carries the painting's colour grid. */
export const canvas = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.5]);
  return b.build();
});

/** The unit box: plinths, vitrine bases and glass, and the four bars of a frame. */
export const unitBox = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.5, 0, -0.5], [0.5, 1, 0.5]);
  return b.build();
});
