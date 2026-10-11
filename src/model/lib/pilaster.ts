/**
 * Pilasters: flat columns standing against a wall, in the same three orders and proportions as `column` (with W, the face width, in place of D).
 *
 * Units metres. Origin at the bottom centre of the back face, which lies in the wall plane z = 0; the pilaster projects toward +Z by `projection` and its face looks +Z.
 * The base mouldings and the capital wrap the front and both returns; nothing is built behind z = 0.
 */
import * as THREE from 'three';

import { discInto, scrollInto, spiral } from './acanthus.js';
import { MeshBuilder } from './builder.js';
import { cached } from './cache.js';
import { CORINTHIAN_HEIGHT, corinthianCapitalInto } from './capital-corinthian.js';
import { BASE_HEIGHT, ORDER_PROPORTIONS, ORDERS, type Order } from './column.js';
import { byDetail, checkDetail, integer, oneOf, positive, require, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { sweepInto } from './sweep.js';

export interface PilasterParams {
  /** Default 'corinthian'. */
  order?: Order;
  /** Face width W, metres. Default 1. */
  width?: number;
  /** Projection of the shaft from the wall, metres. Default W / 5. */
  projection?: number;
  /** Base + shaft + capital, metres. Default 10 W (Corinthian), 9 W (Ionic), 8 W (Doric). */
  height?: number;
  /** Flutes on the face. Default true for Corinthian and Ionic, false for Doric. */
  fluted?: boolean;
  /** Flutes across the face. Default 7. */
  flutes?: number;
  /** Attic base or none. Default 'attic'. */
  base?: 'attic' | 'none';
  detail?: Detail;
}

interface PilasterSpec {
  order: Order;
  width: number;
  projection: number;
  height: number;
  fluted: boolean;
  flutes: number;
  base: 'attic' | 'none';
  detail: Detail;
}

function pilasterSpec(part: string, params: PilasterParams): PilasterSpec {
  const order = oneOf(part, 'order', params.order ?? 'corinthian', ORDERS);
  const width = positive(part, 'width', params.width ?? 1);
  const spec: PilasterSpec = {
    order,
    width,
    projection: params.projection ?? width / 5,
    height: params.height ?? ORDER_PROPORTIONS[order].height * width,
    fluted: params.fluted ?? order !== 'doric',
    flutes: params.flutes ?? 7,
    base: oneOf(part, 'base', params.base ?? 'attic', ['attic', 'none'] as const),
    detail: checkDetail(part, params.detail ?? 'medium'),
  };
  positive(part, 'projection', spec.projection);
  positive(part, 'height', spec.height);
  integer(part, 'flutes', spec.flutes, 3, 15);
  const fixed = (spec.base === 'attic' ? BASE_HEIGHT * width : 0) + capitalHeight(order, width);
  require(part, spec.height - fixed >= width * 2, `height ${String(spec.height)} leaves less than two widths of shaft; use at least ${(fixed + width * 2).toFixed(3)}.`);
  return spec;
}

function capitalHeight(order: Order, W: number): number {
  return order === 'corinthian' ? CORINTHIAN_HEIGHT * W : ORDER_PROPORTIONS[order].capital * W;
}

/** The U-shaped run round the front of a pilaster at height y: up the left return, across the face, back down the right return. */
function uPath(halfWidth: number, front: number, y: number): [number, number, number][] {
  return [
    [-halfWidth, y, 0],
    [-halfWidth, y, front],
    [halfWidth, y, front],
    [halfWidth, y, 0],
  ];
}

/** Attic base for a pilaster: the column profile re-measured from the shaft face (d = r − 0.5 for W = 1), from the plinth top. */
function baseMouldingProfile(W: number, segments: number): Profile {
  const s = W;
  return new ProfilePen(0.19 * s, s / 6)
    .half(0, 0.125 * s, 0.06 * s, segments)
    .to(0.16 * s, 0.2917 * s)
    .to(0.16 * s, 0.3125 * s)
    .half(-0.02 * s, 0.0833 * s, -0.045 * s, segments)
    .to(0.14 * s, 0.4167 * s)
    .to(0.11 * s, 0.4167 * s)
    .half(0, 0.0833 * s, 0.05 * s, Math.max(3, segments - 1))
    .to(-0.002 * s, 0.5 * s)
    .open();
}

export interface PilasterParts {
  readonly base?: THREE.BufferGeometry;
  readonly shaft: THREE.BufferGeometry;
  readonly capital: THREE.BufferGeometry;
}

export function pilasterParts(params: PilasterParams = {}): PilasterParts {
  const spec = pilasterSpec('pilasterParts', params);
  return cached('pilasterParts', spec, () => {
    const W = spec.width;
    const P = spec.projection;
    const baseHeight = spec.base === 'attic' ? BASE_HEIGHT * W : 0;
    const capH = capitalHeight(spec.order, W);
    const shaftTop = spec.height - capH;
    const shaftBuilder = new MeshBuilder();
    pilasterShaftInto(shaftBuilder, spec, baseHeight, shaftTop);
    const capitalBuilder = new MeshBuilder();
    pilasterCapitalInto(capitalBuilder, spec);
    capitalBuilder.transform(0, new THREE.Matrix4().makeTranslation(0, shaftTop, 0));
    const parts: { base?: THREE.BufferGeometry; shaft: THREE.BufferGeometry; capital: THREE.BufferGeometry } = {
      shaft: shaftBuilder.build(),
      capital: capitalBuilder.build(),
    };
    if (spec.base === 'attic') {
      const bb = new MeshBuilder();
      const plinth = 0.25 * W;
      bb.box([-W / 2 - plinth, 0, 0], [W / 2 + plinth, W / 6, P + plinth], ['-y', '-z']);
      sweepInto(bb, baseMouldingProfile(W, byDetail(spec.detail, [3, 5, 7])), uPath(W / 2, P, 0), { pathCreaseDeg: 30 });
      parts.base = bb.build();
    }
    return Object.freeze(parts);
  });
}

/** A whole pilaster as one geometry. Origin at the bottom centre of its back face (z = 0, the wall plane); the capital top is at y = height. */
export function pilaster(params: PilasterParams = {}): THREE.BufferGeometry {
  const spec = pilasterSpec('pilaster', params);
  return cached('pilaster', spec, () => {
    const parts = pilasterParts(params);
    const b = new MeshBuilder();
    for (const geometry of [parts.base, parts.shaft, parts.capital]) if (geometry !== undefined) b.append(geometry);
    return b.build();
  });
}

function pilasterShaftInto(b: MeshBuilder, spec: PilasterSpec, y0: number, y1: number): void {
  const W = spec.width;
  const P = spec.projection;
  const hw = W / 2;
  // Returns, plain.
  b.polygon([new THREE.Vector3(hw, y0, P), new THREE.Vector3(hw, y0, 0), new THREE.Vector3(hw, y1, 0), new THREE.Vector3(hw, y1, P)]);
  b.polygon([new THREE.Vector3(-hw, y0, 0), new THREE.Vector3(-hw, y0, P), new THREE.Vector3(-hw, y1, P), new THREE.Vector3(-hw, y1, 0)]);
  if (!spec.fluted) {
    b.polygon([new THREE.Vector3(-hw, y0, P), new THREE.Vector3(hw, y0, P), new THREE.Vector3(hw, y1, P), new THREE.Vector3(-hw, y1, P)]);
    return;
  }
  const n = spec.flutes;
  const flute = W / (n + 0.3 * (n + 1));
  const fillet = 0.3 * flute;
  const depth = (flute / 2) * 0.85;
  const across = byDetail(spec.detail, [2, 3, 5]);
  const start = y0 + 0.12 * W;
  const stop = y1 - 0.1 * W;
  const steps: readonly number[] = byDetail<readonly number[]>(spec.detail, [[0, 1], [0, 0.2, 0.55, 1], [0, 0.1, 0.3, 0.6, 1]]);
  const half = flute / 2;
  const rings: { y: number; q: number }[] = [{ y: y0, q: 0 }];
  for (const q of steps) rings.push({ y: start + q * half, q });
  for (const q of [...steps].reverse()) rings.push({ y: stop - q * half, q });
  rings.push({ y: y1, q: 0 });
  // Fillets (n + 1 of them, the outer two being the borders) and flutes between them; a flute k is centred on centreOf(k).
  const centreOf = (k: number): number => -hw + fillet + half + k * (flute + fillet);
  const fullness = (q: number): number => Math.sqrt(Math.max(0, 1 - (1 - q) * (1 - q)));
  for (let k = 0; k <= n; k++) {
    const rows = rings.map(({ y, q }) => {
      const e = fullness(q);
      const left = k === 0 ? -hw : centreOf(k - 1) + half * e;
      const right = k === n ? hw : centreOf(k) - half * e;
      return [new THREE.Vector3(left, y, P), new THREE.Vector3(right, y, P)];
    });
    b.grid(rows);
  }
  for (let k = 0; k < n; k++) {
    const centre = centreOf(k);
    const rows = rings.map(({ y, q }) => {
      const e = fullness(q);
      const row: THREE.Vector3[] = [];
      for (let i = 0; i <= across; i++) {
        const s = i / across;
        const x = centre - half * e + 2 * half * e * s;
        const d = depth * e * Math.sqrt(Math.max(0, 1 - (2 * s - 1) * (2 * s - 1)));
        row.push(new THREE.Vector3(x, y, P - d));
      }
      return row;
    });
    b.grid(rows);
  }
}

function pilasterCapitalInto(b: MeshBuilder, spec: PilasterSpec): void {
  const W = spec.width;
  const P = spec.projection;
  if (spec.order === 'corinthian') {
    corinthianCapitalInto(b, { diameter: W, topDiameter: W, detail: spec.detail, form: 'flat', projection: P });
    return;
  }
  const quarter = byDetail(spec.detail, [2, 4, 6]);
  if (spec.order === 'doric') {
    const profile = new ProfilePen(0, 0)
      .to(0, 0.165 * W)
      .to(0.012 * W, 0.165 * W)
      .to(0.012 * W, 0.2 * W)
      .to(0.024 * W, 0.2 * W)
      .to(0.024 * W, 0.225 * W)
      .quarter(0.08 * W, 0.11 * W, true, quarter)
      .to(0.104 * W, 0.335 * W)
      .to(0.104 * W, 0.44 * W)
      .cyma(0.02 * W, 0.045 * W, 'reversa', 2)
      .to(0.124 * W, 0.5 * W)
      .open();
    capitalBlockInto(b, W, P, profile);
    return;
  }
  // Ionic: an ovolo band, then a slim abacus; the volutes are carried as discs on the face corners.
  const profile = new ProfilePen(0, 0)
    .quarter(0.08 * W, 0.14 * W, true, quarter)
    .to(0.08 * W, 0.27 * W)
    .to(0.1 * W, 0.27 * W)
    .to(0.1 * W, 0.31 * W)
    .quarter(0.02 * W, 0.05 * W, true, 2)
    .to(0.12 * W, 0.36 * W)
    .open();
  capitalBlockInto(b, W, P, profile);
  // Volutes on the two face corners, rolling outward and down from the abacus.
  for (const side of [-1, 1]) {
    const eyeX = side * (W / 2 + 0.02 * W);
    const faceZ = P + 0.1 * W;
    const coil = spiral(0, 0, 0.17 * W, 0.03 * W, Math.PI / 2, 2.2, byDetail(spec.detail, [14, 26, 40]), side > 0);
    const toWorld = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(eyeX + x, 0.06 * W + y, faceZ);
    scrollInto(b, coil, toWorld, new THREE.Vector3(0, 0, 1), 0.03 * W, 0.028 * W);
    discInto(b, new THREE.Vector3(eyeX, 0.06 * W, faceZ - 0.05 * W), new THREE.Vector3(0, 0, 1), 0.17 * W, 0.09 * W, byDetail(spec.detail, [8, 14, 20]));
  }
}

/** Mouldings swept round the U of the capital, with a flat top. */
function capitalBlockInto(b: MeshBuilder, W: number, P: number, profile: Profile): void {
  sweepInto(b, profile, uPath(W / 2, P, 0), { pathCreaseDeg: 30 });
  const last = profile.points.at(-1) ?? [0, 0];
  const hx = W / 2 + last[0];
  const z1 = P + last[0];
  b.planar(
    [
      [-hx, 0],
      [hx, 0],
      [hx, -z1],
      [-hx, -z1],
    ],
    [],
    new THREE.Vector3(0, last[1], 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
  );
}
