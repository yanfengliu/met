/**
 * Ionic and Doric capitals (Vignola), sized by the lower shaft diameter D.
 *
 * Ionic: an ovolo echinus on the shaft top, a cushion (canalis) between two volutes on the front and back faces, the bolsters (pulvini) seen from the sides, and a thin moulded abacus; 0.36 D from the shaft top to the abacus top.
 * The volutes hang below the capital's seat, beside the shaft top, down to about −0.2 D: the one place a capital reaches below its origin.
 * Doric: necking, three annulets, a quarter-round echinus and a square abacus; 0.5 D tall.
 * Units metres; origin at the bottom centre (the shaft top); the abacus faces look ±X and ±Z; Ionic volutes face ±Z.
 */
import * as THREE from 'three';

import { discInto, scrollInto, spiral } from './acanthus.js';
import type { MeshBuilder } from './builder.js';
import { byDetail, type Detail } from './params.js';
import { ProfilePen } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

export interface ClassicCapitalSpec {
  readonly diameter: number;
  readonly topDiameter: number;
  readonly detail: Detail;
}

/** A square slab from y0 to y0 + h with a moulding drawn by `profile` round its edge (d ≤ 0 inward from the half-side `half`), flat top and bottom. */
function mouldedSquareInto(b: MeshBuilder, half: number, y0: number, profile: ReturnType<ProfilePen['open']>): void {
  const loop = [
    [-half, y0, half],
    [half, y0, half],
    [half, y0, -half],
    [-half, y0, -half],
  ] as const;
  sweepInto(b, profile, loop, { closed: true });
  const last = profile.points.at(-1) ?? [0, 0];
  const first = profile.points[0] ?? [0, 0];
  const top = half + last[0];
  const bottom = half + first[0];
  const square = (h: number): [number, number][] => [
    [-h, h],
    [h, h],
    [h, -h],
    [-h, -h],
  ];
  b.planar(square(top), [], new THREE.Vector3(0, y0 + last[1], 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
  b.planar(square(bottom), [], new THREE.Vector3(0, y0 + first[1], 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
}

export function ionicCapitalInto(b: MeshBuilder, spec: ClassicCapitalSpec): void {
  const D = spec.diameter;
  const rt = spec.topDiameter / 2;
  const segments = byDetail(spec.detail, [12, 24, 40]);
  // Echinus: an ovolo swelling out from the shaft top.
  const echinus = new ProfilePen(0, 0)
    .to(rt, 0)
    .quarter(0.1 * D, 0.14 * D, true, byDetail(spec.detail, [3, 5, 7]))
    .to(0, 0.14 * D)
    .close();
  latheInto(b, echinus, { segments });
  // Cushion between the volutes, front to back.
  const eyeX = 0.43 * D;
  const eyeY = 0.02 * D;
  const outer = 0.2 * D;
  const faceZ = 0.3 * D;
  // Kept 4 mm/m inside the bolster ends so the two never share a face.
  b.box([-eyeX, 0.12 * D, -faceZ + 0.004 * D], [eyeX, 0.27 * D, faceZ - 0.004 * D]);
  for (const side of [-1, 1]) {
    // Bolster: a waisted roll along Z through the volute eyes.
    const mark = b.vertexCount;
    const roll = new ProfilePen(0, -faceZ)
      .to(outer * 0.98, -faceZ)
      .to(outer * 0.8, -faceZ * 0.35)
      .to(outer * 0.86, -faceZ * 0.08)
      .to(outer * 0.86, faceZ * 0.08)
      .to(outer * 0.8, faceZ * 0.35)
      .to(outer * 0.98, faceZ)
      .to(0, faceZ)
      .close();
    latheInto(b, roll, { segments: byDetail(spec.detail, [10, 16, 24]), profileCreaseDeg: 40 });
    b.transform(mark, new THREE.Matrix4().makeTranslation(side * eyeX, eyeY, 0).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    // The spiral band on the front and back faces.
    for (const face of [-1, 1]) {
      const normal = new THREE.Vector3(0, 0, face);
      // One scroll seen from both faces: in world x it winds clockwise on the right volute, counter-clockwise on the left, over its top and outward.
      const coil = spiral(0, 0, outer, 0.035 * D, Math.PI / 2, 2.3, byDetail(spec.detail, [16, 30, 46]), side > 0);
      const toWorld = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(side * eyeX + x, eyeY + y, face * (faceZ + 0.012 * D));
      scrollInto(b, coil, toWorld, normal, 0.03 * D, 0.03 * D);
      discInto(b, new THREE.Vector3(side * eyeX, eyeY, face * (faceZ + 0.006 * D)), normal, 0.04 * D, 0.03 * D, 8);
    }
  }
  // Abacus: thin, with an ovolo edge.
  const h = 0.09 * D;
  const abacus = new ProfilePen(0, 0)
    .to(0, 0.45 * h)
    .to(-0.02 * D, 0.45 * h)
    .quarter(0.02 * D, 0.45 * h, true, byDetail(spec.detail, [2, 3, 4]))
    .to(0, h)
    .open();
  mouldedSquareInto(b, 0.56 * D, 0.27 * D, abacus);
}

export function doricCapitalInto(b: MeshBuilder, spec: ClassicCapitalSpec): void {
  const D = spec.diameter;
  const rt = spec.topDiameter / 2;
  const segments = byDetail(spec.detail, [12, 24, 40]);
  const step = 0.012 * D;
  const profile = new ProfilePen(0, 0)
    .to(rt, 0)
    .to(rt, 0.165 * D)
    .to(rt + step, 0.165 * D)
    .to(rt + step, 0.185 * D)
    .to(rt + 2 * step, 0.185 * D)
    .to(rt + 2 * step, 0.205 * D)
    .to(rt + 3 * step, 0.205 * D)
    .to(rt + 3 * step, 0.225 * D)
    .quarter(0.6 * D - (rt + 3 * step) - 0.005 * D, 0.11 * D, true, byDetail(spec.detail, [3, 5, 7]))
    .to(0, 0.335 * D)
    .close();
  latheInto(b, profile, { segments });
  const h = 0.165 * D;
  const abacus = new ProfilePen(0, 0)
    .to(0, 0.62 * h)
    .to(-0.02 * D, 0.62 * h)
    .cyma(0.035 * D, 0.28 * h, 'reversa', byDetail(spec.detail, [1, 2, 3]))
    .to(0.015 * D, h)
    .open();
  mouldedSquareInto(b, 0.6 * D, 0.335 * D, abacus);
}
