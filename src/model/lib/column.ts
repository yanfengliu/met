/**
 * Classical columns: Attic base, shaft with entasis and optional fluting, pedestal, and the whole column in its orders.
 *
 * Units are metres; every part stands on y = 0 with its axis on x = z = 0 and its front (a face of the plinth and abacus) toward +Z.
 * Proportions follow Vignola's orders as used by the Beaux-Arts architects of the Met's Fifth Avenue facade (Hunt, 1902): with D the lower shaft diameter,
 * a Corinthian column is 10 D tall (base 0.5 D, shaft 8⅓ D, capital 7/6 D), an Ionic one 9 D, a Doric one 8 D; the shaft diminishes to 5/6 D at the top over its upper two thirds.
 */
import * as THREE from 'three';

import { MeshBuilder } from './builder.js';
import { cached } from './cache.js';
import { doricCapitalInto, ionicCapitalInto } from './capital-classic.js';
import { corinthianCapitalInto } from './capital-corinthian.js';
import { byDetail, checkDetail, integer, inRange, oneOf, positive, require, type Detail } from './params.js';
import { flutedShaftInto, type ShaftSpec } from './shaft.js';
import { ProfilePen, type Profile } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

export type Order = 'corinthian' | 'ionic' | 'doric';
export const ORDERS: readonly Order[] = ['corinthian', 'ionic', 'doric'];

/** Column height in lower diameters, and capital height in lower diameters, per order. */
export const ORDER_PROPORTIONS: Readonly<Record<Order, { readonly height: number; readonly capital: number }>> = {
  corinthian: { height: 10, capital: 7 / 6 },
  ionic: { height: 9, capital: 0.36 },
  doric: { height: 8, capital: 0.5 },
};

/** Base height in lower diameters (Attic base). */
export const BASE_HEIGHT = 0.5;
/** Plinth side in lower diameters. */
export const PLINTH_WIDTH = 1.5;

/**
 * Attic base profile for a shaft of radius 0.5 (D = 1), from the plinth top (y = 1/6) to the base top (y = 0.5): lower torus, scotia between fillets, upper torus.
 * `inset` shifts every radius, so the same profile serves a pilaster face (d = r − 0.5).
 */
export function atticBaseProfile(segments: number): Profile {
  const pen = new ProfilePen(0, 1 / 6)
    .to(0.69, 1 / 6)
    .half(0, 0.125, 0.06, segments)
    .to(0.66, 0.2917)
    .to(0.66, 0.3125)
    .half(-0.02, 0.0833, -0.045, segments)
    .to(0.64, 0.4167)
    .to(0.61, 0.4167)
    .half(0, 0.0833, 0.05, Math.max(3, segments - 1))
    .to(0, 0.5);
  return pen.close();
}

export interface AtticBaseParams {
  /** Lower shaft diameter D, metres. Default 1. The base is 0.5 D tall on a plinth 1.5 D square. */
  diameter?: number;
  detail?: Detail;
}

/** Attic base: square plinth (1.5 D, 1/6 D tall) under two tori and a scotia; 0.5 D tall in all. Origin at the plinth's bottom centre. */
export function atticBase(params: AtticBaseParams = {}): THREE.BufferGeometry {
  const full = { diameter: params.diameter ?? 1, detail: checkDetail('atticBase', params.detail ?? 'medium') };
  positive('atticBase', 'diameter', full.diameter);
  return cached('atticBase', full, () => {
    const b = new MeshBuilder();
    atticBaseInto(b, full.diameter, full.detail);
    return b.build();
  });
}

export function atticBaseInto(b: MeshBuilder, diameter: number, detail: Detail): void {
  const D = diameter;
  const half = (PLINTH_WIDTH / 2) * D;
  b.box([-half, 0, -half], [half, D / 6, half]);
  const segments = byDetail(detail, [16, 32, 48]);
  const profile = atticBaseProfile(byDetail(detail, [3, 5, 7]));
  latheInto(b, { closed: true, points: profile.points.map(([r, y]) => [r * D, y * D] as const) }, { segments });
}

export interface ShaftParams {
  /** Lower diameter D, metres. Default 1. */
  diameter?: number;
  /** Shaft height from the base top to the capital, metres. Default 8⅓ D. */
  height?: number;
  /** Upper diameter as a fraction of D. Default 5/6. */
  taper?: number;
  /** Cut flutes. Default true. */
  fluted?: boolean;
  /** Number of flutes. Default 24. */
  flutes?: number;
  detail?: Detail;
}

function shaftSpec(part: string, params: ShaftParams): ShaftSpec {
  const diameter = params.diameter ?? 1;
  const spec: ShaftSpec = {
    diameter,
    height: params.height ?? diameter * (25 / 3),
    taper: params.taper ?? 5 / 6,
    fluted: params.fluted ?? true,
    flutes: params.flutes ?? 24,
    detail: checkDetail(part, params.detail ?? 'medium'),
  };
  positive(part, 'diameter', spec.diameter);
  positive(part, 'height', spec.height);
  inRange(part, 'taper', spec.taper, 0.5, 1);
  integer(part, 'flutes', spec.flutes, 8, 48);
  require(part, spec.height >= spec.diameter, `height ${String(spec.height)} is less than the diameter ${String(spec.diameter)}; a shaft is at least one diameter tall.`);
  return spec;
}

/**
 * Column shaft with entasis: straight for its lower third, then diminishing to `taper × D` at the top, with an apophyge flaring into the base and an astragal under the capital.
 * Origin at the bottom centre; the top is at y = height. Fluted shafts carry `flutes` semicircular channels with fillets, rounded at both ends.
 */
export function shaft(params: ShaftParams = {}): THREE.BufferGeometry {
  const spec = shaftSpec('shaft', params);
  return cached('shaft', spec, () => {
    const b = new MeshBuilder();
    flutedShaftInto(b, spec);
    return b.build();
  });
}

export interface PedestalParams {
  /** Die (dado) width along X, metres. Default 1.5. */
  width?: number;
  /** Die depth along Z, metres. Default equal to width. */
  depth?: number;
  /** Total height, base mouldings to cap, metres. Default 2.2 × width. */
  height?: number;
  detail?: Detail;
}

/** Pedestal profile in (d, y) with d measured out from the die face, for a pedestal of unit height: plinth, base mouldings, die, cap mouldings. */
function pedestalProfile(height: number, scale: number, segments: number): Profile {
  const s = scale;
  const capTop = height;
  const pen = new ProfilePen(0.12 * s, 0)
    .to(0.12 * s, 0.16 * s)
    .to(0.08 * s, 0.16 * s)
    .cyma(-0.06 * s, 0.1 * s, 'reversa', segments)
    .to(0.01 * s, 0.27 * s)
    .to(0.01 * s, 0.3 * s)
    .to(0, 0.3 * s)
    .to(0, capTop - 0.34 * s)
    .to(0.015 * s, capTop - 0.34 * s)
    .to(0.015 * s, capTop - 0.31 * s)
    .cyma(0.06 * s, 0.1 * s, 'reversa', segments)
    .to(0.13 * s, capTop - 0.21 * s)
    .to(0.13 * s, capTop - 0.06 * s)
    .quarter(0.02 * s, 0.03 * s, true, Math.max(2, segments - 1))
    .to(0.15 * s, capTop);
  return pen.open();
}

/** Pedestal: a die with moulded base and cap, `width × depth` at the die, the mouldings projecting about a tenth of the width. Origin at the bottom centre. */
export function pedestal(params: PedestalParams = {}): THREE.BufferGeometry {
  const width = params.width ?? 1.5;
  const full = { width, depth: params.depth ?? width, height: params.height ?? width * 2.2, detail: checkDetail('pedestal', params.detail ?? 'medium') };
  positive('pedestal', 'width', full.width);
  positive('pedestal', 'depth', full.depth);
  positive('pedestal', 'height', full.height);
  const scale = Math.min(full.width, full.depth) * 0.8;
  require('pedestal', full.height > scale * 0.7, `height ${String(full.height)} is too low for its mouldings; it must exceed ${(scale * 0.7).toFixed(3)} for a ${String(full.width)} × ${String(full.depth)} die.`);
  return cached('pedestal', full, () => {
    const b = new MeshBuilder();
    pedestalInto(b, full.width, full.depth, full.height, full.detail);
    return b.build();
  });
}

export function pedestalInto(b: MeshBuilder, width: number, depth: number, height: number, detail: Detail): void {
  const scale = Math.min(width, depth) * 0.8;
  const profile = pedestalProfile(height, scale, byDetail(detail, [2, 3, 5]));
  const hx = width / 2;
  const hz = depth / 2;
  sweepInto(
    b,
    profile,
    [
      [-hx, 0, hz],
      [hx, 0, hz],
      [hx, 0, -hz],
      [-hx, 0, -hz],
    ],
    { closed: true },
  );
  // The plinth's underside, from the profile's foot, closes it.
  const foot = profile.points[0]?.[0] ?? 0;
  b.planar(
    [
      [-hx - foot, -hz - foot],
      [hx + foot, -hz - foot],
      [hx + foot, hz + foot],
      [-hx - foot, hz + foot],
    ],
    [],
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
  );
  const top = profile.points.at(-1)?.[0] ?? 0;
  const ex = hx + top;
  const ez = hz + top;
  b.planar(
    [
      [-ex, ez],
      [ex, ez],
      [ex, -ez],
      [-ex, -ez],
    ],
    [],
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
  );
}

export interface ColumnParams {
  /** Default 'corinthian'. */
  order?: Order;
  /** Lower shaft diameter D, metres. Default 1. */
  diameter?: number;
  /** Base + shaft + capital, metres (the pedestal is extra). Default 10 D (Corinthian), 9 D (Ionic), 8 D (Doric). */
  height?: number;
  /** Fluted shaft. Default true for Corinthian and Ionic, false for Doric. */
  fluted?: boolean;
  /** Flutes round the shaft. Default 24 (20 for Doric). */
  flutes?: number;
  /** Upper shaft diameter as a fraction of D. Default 5/6. */
  taper?: number;
  /** Attic base, or none (a Greek Doric column). Default 'attic'. */
  base?: 'attic' | 'none';
  /** Stand the column on a pedestal: true for a Vignola pedestal (1.5 D die, 3⅓ D tall) or explicit dimensions. Default false. */
  pedestal?: boolean | PedestalParams;
  detail?: Detail;
}

interface ColumnSpec {
  order: Order;
  diameter: number;
  height: number;
  fluted: boolean;
  flutes: number;
  taper: number;
  base: 'attic' | 'none';
  pedestal: { width: number; depth: number; height: number } | null;
  detail: Detail;
}

function columnSpec(part: string, params: ColumnParams): ColumnSpec {
  const order = oneOf(part, 'order', params.order ?? 'corinthian', ORDERS);
  const diameter = positive(part, 'diameter', params.diameter ?? 1);
  const proportions = ORDER_PROPORTIONS[order];
  const pedestalParams = params.pedestal === true ? {} : params.pedestal === false || params.pedestal === undefined ? null : params.pedestal;
  const ped =
    pedestalParams === null
      ? null
      : {
          width: pedestalParams.width ?? PLINTH_WIDTH * diameter,
          depth: pedestalParams.depth ?? pedestalParams.width ?? PLINTH_WIDTH * diameter,
          height: pedestalParams.height ?? diameter * (10 / 3),
        };
  const spec: ColumnSpec = {
    order,
    diameter,
    height: params.height ?? proportions.height * diameter,
    fluted: params.fluted ?? order !== 'doric',
    flutes: params.flutes ?? (order === 'doric' ? 20 : 24),
    taper: params.taper ?? 5 / 6,
    base: oneOf(part, 'base', params.base ?? 'attic', ['attic', 'none'] as const),
    pedestal: ped,
    detail: checkDetail(part, params.detail ?? 'medium'),
  };
  positive(part, 'height', spec.height);
  const fixed = (spec.base === 'attic' ? BASE_HEIGHT : 0) * diameter + proportions.capital * diameter;
  require(part, spec.height - fixed >= diameter * 2, `height ${String(spec.height)} leaves less than two diameters of shaft after the base and the ${order} capital; use at least ${(fixed + diameter * 2).toFixed(3)}.`);
  integer(part, 'flutes', spec.flutes, 8, 48);
  inRange(part, 'taper', spec.taper, 0.5, 1);
  if (ped !== null) {
    positive(part, 'pedestal.width', ped.width);
    positive(part, 'pedestal.depth', ped.depth);
    positive(part, 'pedestal.height', ped.height);
  }
  return spec;
}

/** The pieces of one column, each already in the column's frame (origin at the bottom centre of the pedestal, or of the base without one), so all take the same matrix. */
export interface ColumnParts {
  readonly pedestal?: THREE.BufferGeometry;
  readonly base?: THREE.BufferGeometry;
  readonly shaft: THREE.BufferGeometry;
  readonly capital: THREE.BufferGeometry;
}

/** A column split into pedestal, base, shaft and capital, for build steps that raise them one after another. Same parameters as `column`. */
export function columnParts(params: ColumnParams = {}): ColumnParts {
  const spec = columnSpec('columnParts', params);
  return cached('columnParts', spec, () => {
    const D = spec.diameter;
    const y0 = spec.pedestal?.height ?? 0;
    const baseHeight = spec.base === 'attic' ? BASE_HEIGHT * D : 0;
    const capitalHeight = ORDER_PROPORTIONS[spec.order].capital * D;
    const shaftHeight = spec.height - baseHeight - capitalHeight;
    const shaftBuilder = new MeshBuilder();
    flutedShaftInto(shaftBuilder, { diameter: D, height: shaftHeight, taper: spec.taper, fluted: spec.fluted, flutes: spec.flutes, detail: spec.detail }, y0 + baseHeight);
    const capitalBuilder = new MeshBuilder();
    capitalInto(capitalBuilder, spec.order, D * spec.taper, D, spec.detail, y0 + baseHeight + shaftHeight);
    const parts: { pedestal?: THREE.BufferGeometry; base?: THREE.BufferGeometry; shaft: THREE.BufferGeometry; capital: THREE.BufferGeometry } = {
      shaft: shaftBuilder.build(),
      capital: capitalBuilder.build(),
    };
    if (spec.pedestal !== null) {
      const pb = new MeshBuilder();
      pedestalInto(pb, spec.pedestal.width, spec.pedestal.depth, spec.pedestal.height, spec.detail);
      parts.pedestal = pb.build();
    }
    if (spec.base === 'attic') {
      const bb = new MeshBuilder();
      atticBaseInto(bb, D, spec.detail);
      if (y0 > 0) bb.transform(0, translation(0, y0, 0));
      parts.base = bb.build();
    }
    return Object.freeze(parts);
  });
}

/**
 * A whole classical column as one geometry: (pedestal,) base, shaft and capital.
 * Origin at the bottom centre; the abacus top is at y = height (+ pedestal height). The abacus and plinth faces look ±X and ±Z.
 */
export function column(params: ColumnParams = {}): THREE.BufferGeometry {
  const spec = columnSpec('column', params);
  return cached('column', spec, () => {
    const parts = columnParts(params);
    const b = new MeshBuilder();
    for (const geometry of [parts.pedestal, parts.base, parts.shaft, parts.capital]) if (geometry !== undefined) b.append(geometry);
    return b.build();
  });
}

export interface CapitalParams {
  /** Default 'corinthian'. */
  order?: Order;
  /** Lower shaft diameter D, metres; the capital is sized from it. Default 1. */
  diameter?: number;
  /** Shaft top diameter as a fraction of D, where the bell or echinus starts. Default 5/6. */
  taper?: number;
  detail?: Detail;
}

/**
 * A capital on its own, for a column whose lower diameter is D: Corinthian 7/6 D tall, Ionic 0.36 D (its volutes hang to about −0.2 D, beside the shaft top), Doric 0.5 D.
 * Origin at its bottom centre (the shaft top); faces look ±X and ±Z.
 */
export function capital(params: CapitalParams = {}): THREE.BufferGeometry {
  const full = {
    order: oneOf('capital', 'order', params.order ?? 'corinthian', ORDERS),
    diameter: positive('capital', 'diameter', params.diameter ?? 1),
    taper: inRange('capital', 'taper', params.taper ?? 5 / 6, 0.5, 1),
    detail: checkDetail('capital', params.detail ?? 'medium'),
  };
  return cached('capital', full, () => {
    const b = new MeshBuilder();
    capitalInto(b, full.order, full.diameter * full.taper, full.diameter, full.detail, 0);
    return b.build();
  });
}

/** Builds a capital of `order` with its bottom at `y`, for a shaft whose top diameter is `topDiameter` and lower diameter `D`. */
export function capitalInto(b: MeshBuilder, order: Order, topDiameter: number, D: number, detail: Detail, y: number): void {
  const mark = b.vertexCount;
  if (order === 'corinthian') corinthianCapitalInto(b, { diameter: D, topDiameter, detail, form: 'round' });
  else if (order === 'ionic') ionicCapitalInto(b, { diameter: D, topDiameter, detail });
  else doricCapitalInto(b, { diameter: D, topDiameter, detail });
  if (y !== 0) b.transform(mark, translation(0, y, 0));
}

export function translation(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z);
}
