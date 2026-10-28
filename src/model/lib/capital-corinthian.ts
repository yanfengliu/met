/**
 * Corinthian capital, round (for a column) or flat (for a pilaster), after the Roman type of the Met's Fifth Avenue facade.
 *
 * With D the lower shaft diameter (a pilaster's face width) the capital is 7/6 D tall: a bell rising from the shaft top, eight lower acanthus leaves between the axes and the diagonals,
 * eight taller upper leaves on the axes and diagonals, eight caulicoli rising between the upper leaves, a large volute under each abacus corner, two small helices meeting under the abacus flower on each face,
 * and an abacus D/6 tall whose sides curve inward between chamfered horns two diameters apart on the diagonal (Vitruvius).
 * Units metres; origin at the bottom centre (the shaft top); the faces look ±X and ±Z. A flat capital stands on z = 0 (the wall face) and projects toward +Z.
 */
import * as THREE from 'three';

import { discInto, fleuronInto, leafInto, scrollInto, spiral, type LeafResolution, type LeafShape, type SurfaceMap } from './acanthus.js';
import type { MeshBuilder } from './builder.js';
import { byDetail, type Detail } from './params.js';
import { ProfilePen } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

export interface CorinthianSpec {
  /** Lower shaft diameter D (pilaster face width), metres. */
  readonly diameter: number;
  /** Shaft top diameter the bell starts from, metres. */
  readonly topDiameter: number;
  readonly detail: Detail;
  /** 'round' for a column, 'flat' for a pilaster. */
  readonly form: 'round' | 'flat';
  /** Pilaster projection from the wall (flat form only), metres. */
  readonly projection?: number;
}

/** Capital height in lower diameters. */
export const CORINTHIAN_HEIGHT = 7 / 6;

/** Direction at azimuth φ (radians) measured from +Z toward +X. */
function dir(phi: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
}

export function corinthianCapitalInto(b: MeshBuilder, spec: CorinthianSpec): void {
  if (spec.form === 'round') roundInto(b, spec);
  else flatInto(b, spec);
}

interface Sizes {
  D: number;
  H: number;
  yAb: number;
  ha: number;
  res: LeafResolution;
  lower: LeafShape;
  upper: LeafShape;
  scrollSteps: number;
  helixSteps: number;
  arcSteps: number;
}

function sizes(spec: CorinthianSpec): Sizes {
  const D = spec.diameter;
  const H = CORINTHIAN_HEIGHT * D;
  const ha = H / 7;
  const detail = spec.detail;
  return {
    D,
    H,
    ha,
    yAb: H - ha,
    res: byDetail(detail, [
      { across: 2, attached: 2, free: 1 },
      { across: 4, attached: 4, free: 3 },
      { across: 6, attached: 6, free: 4 },
    ]),
    lower: { width: 0.33 * D, rise: 0.22 * D, curl: 0.075 * D, turn: 2.5, thickness: 0.02 * D, cup: 0.04 * D, lift: 0.03 * D, belly: 0.06 * D, rib: 0.014 * D },
    upper: { width: 0.31 * D, rise: 0.44 * D, curl: 0.08 * D, turn: 2.4, thickness: 0.02 * D, cup: 0.04 * D, lift: 0.008 * D, belly: 0.05 * D, rib: 0.014 * D },
    scrollSteps: byDetail(detail, [10, 18, 28]),
    helixSteps: byDetail(detail, [7, 12, 18]),
    arcSteps: byDetail(detail, [3, 6, 10]),
  };
}

/** Bell radius at height y for the round form. */
function bellRadius(spec: CorinthianSpec, z: Sizes, y: number): number {
  const r0 = spec.topDiameter / 2;
  const r1 = 0.5 * z.D;
  return r0 + (r1 - r0) * Math.pow(Math.min(1, Math.max(0, y / z.yAb)), 1.6);
}

function roundInto(b: MeshBuilder, spec: CorinthianSpec): void {
  const z = sizes(spec);
  const { D } = z;
  // Bell with a lip under the abacus.
  const pen = new ProfilePen(0, 0);
  const steps = 6;
  for (let k = 0; k <= steps; k++) {
    const y = ((z.yAb - 0.05 * D) * k) / steps;
    pen.to(bellRadius(spec, z, y), y);
  }
  pen.half(0, 0.05 * D, 0.025 * D, 3).to(0, z.yAb + 0.004 * D);
  latheInto(b, pen.close(), { segments: byDetail(spec.detail, [12, 24, 40]) });

  const cylinder = (phi: number, base: number): SurfaceMap => (s, y, o) => {
    const r = bellRadius(spec, z, base + y);
    return dir(phi + s / r).multiplyScalar(r + o).setY(base + y);
  };
  // Upper row on the axes and diagonals, lower row between them (in front).
  for (let k = 0; k < 8; k++) leafInto(b, z.upper, z.res, cylinder((k * Math.PI) / 4, 0.04 * D));
  for (let k = 0; k < 8; k++) leafInto(b, z.lower, z.res, cylinder(Math.PI / 8 + (k * Math.PI) / 4, 0));

  // Caulicoli between the upper leaves.
  for (let k = 0; k < 8; k++) caulicolusInto(b, spec, z, dir(Math.PI / 8 + (k * Math.PI) / 4), bellRadius(spec, z, 0.5 * D) + 0.015 * D);

  // Corner volutes on the diagonals.
  for (let k = 0; k < 4; k++) {
    const d = dir(Math.PI / 4 + (k * Math.PI) / 2);
    cornerVoluteInto(b, z, new THREE.Vector3(0, 0, 0), d, bellRadius(spec, z, 0.6 * D) - 0.01 * D, 0.75 * D);
  }
  // Helices and fleurons on each face.
  for (let k = 0; k < 4; k++) {
    const phi = (k * Math.PI) / 2;
    const out = dir(phi);
    const right = new THREE.Vector3(0, 1, 0).cross(out);
    const plane = 0.49 * D;
    helicesInto(b, z, out.clone().multiplyScalar(plane), right, out);
    const half = abacusHalf(z);
    fleuronInto(b, out.clone().multiplyScalar(half.side - half.sag + 0.03 * D).setY(z.yAb + z.ha * 0.45), out, 0.085 * D, 0.08 * D, byDetail(spec.detail, [6, 8, 10]));
  }
  abacusInto(b, z, roundOutline(z), byDetail(spec.detail, [2, 3, 5]));
}

function abacusHalf(z: Sizes): { side: number; sag: number; chamfer: number } {
  // Horn tips two diameters apart on the diagonal; sides curve in by about a ninth of the width.
  return { side: 0.67 * z.D, sag: 0.1 * z.D, chamfer: 0.035 * z.D };
}

/** The abacus plan, counter-clockwise seen from above, front (+Z) side first. */
function roundOutline(z: Sizes): [number, number][] {
  const { side, sag, chamfer } = abacusHalf(z);
  const out: [number, number][] = [];
  for (let k = 0; k < 4; k++) {
    // Side k: the front side (z = side, running +X) turned k·90° about Y, giving front, right, back, left.
    const side2d = concaveSide(side, sag, chamfer, z.arcSteps);
    const angle = (k * Math.PI) / 2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (const [x, zz] of side2d) out.push([x * c + zz * s, -x * s + zz * c]);
  }
  return out;
}

/** Points of the front side from left to right: z = side at the ends, curving in by `sag` at x = 0. */
function concaveSide(side: number, sag: number, chamfer: number, steps: number): [number, number][] {
  const half = side - chamfer;
  const radius = (half * half + sag * sag) / (2 * sag);
  const cz = side - sag + radius;
  const limit = Math.asin(half / radius);
  const out: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const beta = -limit + (2 * limit * k) / steps;
    out.push([radius * Math.sin(beta), cz - radius * Math.cos(beta)]);
  }
  return out;
}

/** Abacus: a moulded slab swept round `outline` (x, z), from z.yAb to z.H, with flat top and underside. */
function abacusInto(b: MeshBuilder, z: Sizes, outline: readonly [number, number][], quarterSteps: number): void {
  const h = z.ha;
  const D = z.D;
  const profile = new ProfilePen(0, 0)
    .to(0, 0.52 * h)
    .to(-0.03 * D, 0.52 * h)
    .to(-0.03 * D, 0.6 * h)
    .quarter(0.03 * D, 0.26 * h, true, quarterSteps)
    .to(0, h)
    .open();
  sweepInto(
    b,
    profile,
    outline.map(([x, zz]) => [x, z.yAb, zz] as const),
    { closed: true, pathCreaseDeg: 25 },
  );
  const top = outline.map(([x, zz]) => [x, -zz] as const);
  b.planar(top, [], new THREE.Vector3(0, z.H, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
  b.planar(outline, [], new THREE.Vector3(0, z.yAb, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
}

/** A caulicolus: a short stalk with a flared cup, standing at `out` × `radius`. */
function caulicolusInto(b: MeshBuilder, spec: CorinthianSpec, z: Sizes, out: THREE.Vector3, radius: number): void {
  const D = z.D;
  const sides = byDetail(spec.detail, [5, 6, 8]);
  const mark = b.vertexCount;
  const stalk = new ProfilePen(0, 0.42 * D)
    .to(0.04 * D, 0.42 * D)
    .to(0.04 * D, 0.58 * D)
    .to(0.07 * D, 0.64 * D)
    .to(0.055 * D, 0.655 * D)
    .to(0, 0.62 * D)
    .close();
  latheInto(b, stalk, { segments: sides });
  const at = out.clone().multiplyScalar(radius);
  b.transform(mark, new THREE.Matrix4().makeTranslation(at.x, 0, at.z));
}

/**
 * A corner volute in the vertical plane through `origin` along `diagonal`: a ribbon rising from `startA` beside the bell to a spiral whose eye is `eyeA` out along the diagonal, under the abacus horn.
 */
function cornerVoluteInto(b: MeshBuilder, z: Sizes, origin: THREE.Vector3, diagonal: THREE.Vector3, startA: number, eyeA: number): void {
  const D = z.D;
  const eyeY = z.yAb - 0.13 * D;
  const r0 = 0.12 * D;
  const top: [number, number] = [eyeA, eyeY + r0];
  const lead: [number, number][] = [];
  const start: [number, number] = [startA, 0.6 * D];
  const control: [number, number] = [startA + 0.03 * D, eyeY + r0 * 1.05];
  const leadSteps = 5;
  for (let k = 0; k < leadSteps; k++) {
    const t = k / leadSteps;
    const a = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * control[0] + t * t * top[0];
    const y = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * control[1] + t * t * top[1];
    lead.push([a, y]);
  }
  const coil = spiral(eyeA, eyeY, r0, 0.03 * D, Math.PI / 2, 1.5, z.scrollSteps, true);
  const path = [...lead, ...coil];
  const normal = new THREE.Vector3(0, 1, 0).cross(diagonal).normalize();
  const toWorld = (a: number, y: number): THREE.Vector3 => origin.clone().addScaledVector(diagonal, a).setY(y);
  scrollInto(b, path, toWorld, normal, 0.1 * D, 0.045 * D);
  discInto(b, toWorld(eyeA, eyeY), normal, 0.045 * D, 0.09 * D, 8);
}

/** The two helices of one face, in the vertical plane through `centre` facing `out`, curling toward each other under the abacus flower. */
function helicesInto(b: MeshBuilder, z: Sizes, centre: THREE.Vector3, right: THREE.Vector3, out: THREE.Vector3): void {
  const D = z.D;
  const eyeY = z.yAb - 0.14 * D;
  const r0 = 0.06 * D;
  for (const side of [1, -1]) {
    const eyeX = 0.09 * D * side;
    const start: [number, number] = [0.19 * D * side, 0.62 * D];
    const lead: [number, number][] = [start, [0.17 * D * side, 0.7 * D], [(0.09 * D + r0 * 1.05) * side, eyeY - 0.03 * D]];
    // The right helix rises on its outer side and turns counter-clockwise seen from the front, over its top toward the centre; the left one mirrors it.
    const coil = spiral(eyeX, eyeY, r0, 0.014 * D, side > 0 ? 0 : Math.PI, 1.2, z.helixSteps, side < 0);
    const toWorld = (x: number, y: number): THREE.Vector3 => centre.clone().addScaledVector(right, x).setY(y);
    scrollInto(b, [...lead, ...coil], toWorld, out, 0.07 * D, 0.03 * D);
  }
}

function flatInto(b: MeshBuilder, spec: CorinthianSpec): void {
  const z = sizes(spec);
  const { D } = z;
  const W = D;
  const P = spec.projection ?? D / 6;
  const halfW = W / 2;
  // Bell: a block flaring slightly toward the abacus, its back in the wall.
  const front = (y: number): number => P + 0.06 * D * Math.pow(Math.min(1, y / z.yAb), 1.6);
  const side = (y: number): number => halfW + 0.04 * D * Math.pow(Math.min(1, y / z.yAb), 1.6);
  const rows = 5;
  const frontRows: THREE.Vector3[][] = [];
  const leftRows: THREE.Vector3[][] = [];
  const rightRows: THREE.Vector3[][] = [];
  for (let k = 0; k <= rows; k++) {
    const y = (z.yAb * k) / rows;
    frontRows.push([new THREE.Vector3(-side(y), y, front(y)), new THREE.Vector3(side(y), y, front(y))]);
    rightRows.push([new THREE.Vector3(side(y), y, front(y)), new THREE.Vector3(side(y), y, 0)]);
    leftRows.push([new THREE.Vector3(-side(y), y, 0), new THREE.Vector3(-side(y), y, front(y))]);
  }
  b.grid(frontRows, { flat: true });
  b.grid(rightRows, { flat: true });
  b.grid(leftRows, { flat: true });
  // Its underside on the shaft's top and its top under the abacus close it.
  b.polygon([new THREE.Vector3(-side(0), 0, 0), new THREE.Vector3(side(0), 0, 0), new THREE.Vector3(side(0), 0, front(0)), new THREE.Vector3(-side(0), 0, front(0))]);
  b.polygon([new THREE.Vector3(-side(z.yAb), z.yAb, front(z.yAb)), new THREE.Vector3(side(z.yAb), z.yAb, front(z.yAb)), new THREE.Vector3(side(z.yAb), z.yAb, 0), new THREE.Vector3(-side(z.yAb), z.yAb, 0)]);
  const planar = (x0: number): SurfaceMap => (s, y, o) => new THREE.Vector3(x0 + s, y, front(y) + o);
  const corner = (sign: number): SurfaceMap => {
    const n = new THREE.Vector3(sign, 0, 1).normalize();
    const t = new THREE.Vector3(0, 1, 0).cross(n);
    return (s, y, o) => new THREE.Vector3(sign * side(y), y, front(y)).addScaledVector(t, s).addScaledVector(n, o);
  };
  const narrow = (shape: LeafShape): LeafShape => ({ ...shape, width: shape.width * 0.7 });
  leafInto(b, z.upper, z.res, (s, y, o) => planar(0)(s, y + 0.04 * D, o));
  for (const sign of [-1, 1]) leafInto(b, narrow(z.upper), z.res, (s, y, o) => corner(sign)(s, y + 0.04 * D, o));
  for (const sign of [-1, 1]) leafInto(b, z.lower, z.res, planar(sign * 0.25 * W));
  for (const sign of [-1, 1]) {
    const n = new THREE.Vector3(sign, 0, 1).normalize();
    const origin = new THREE.Vector3(sign * (halfW - 0.08 * D), 0, front(0.6 * D) - 0.08 * D);
    cornerVoluteInto(b, z, origin, n, 0.12 * D, 0.26 * D);
  }
  helicesInto(b, z, new THREE.Vector3(0, 0, front(0.8 * D) + 0.01 * D), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
  const half = abacusHalf(z);
  const reach = front(z.yAb) + 0.17 * D;
  const outline = flatOutline(halfW + 0.2 * D, reach, half.sag * 0.7, half.chamfer, z.arcSteps);
  fleuronInto(b, new THREE.Vector3(0, z.yAb + z.ha * 0.5, reach - half.sag * 0.7 + 0.012 * D), new THREE.Vector3(0, 0, 1), 0.08 * D, 0.06 * D, byDetail(spec.detail, [5, 6, 8]));
  abacusInto(b, z, outline, byDetail(spec.detail, [2, 3, 5]));
}

/** Pilaster abacus plan: concave front at z = reach, chamfered front horns, straight returns back to the wall (z = 0); counter-clockwise seen from above. */
function flatOutline(halfWidth: number, reach: number, sag: number, chamfer: number, steps: number): [number, number][] {
  const half = halfWidth - chamfer;
  const radius = (half * half + sag * sag) / (2 * sag);
  const cz = reach - sag + radius;
  const limit = Math.asin(half / radius);
  const out: [number, number][] = [[-halfWidth, 0]];
  out.push([-halfWidth, reach - chamfer]);
  for (let k = 0; k <= steps; k++) {
    const beta = -limit + (2 * limit * k) / steps;
    out.push([radius * Math.sin(beta), cz - radius * Math.cos(beta)]);
  }
  out.push([halfWidth, reach - chamfer]);
  out.push([halfWidth, 0]);
  return out;
}
