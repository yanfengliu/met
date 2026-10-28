/**
 * Egyptian elements of the Temple of Dendur in the Sackler Wing: the cavetto cornice profile, a battered pylon or gate with torus rolls, and a papyriform column.
 * Metres, +Y up, front +Z, origin at the base centre (y = 0 at the bottom) unless a header says otherwise.
 * Equal parameters return the identical cached object (docs/design/spec.md, Parts library): never mutate, move or dispose it; place it through a matrix.
 */
import type * as THREE from 'three';

import { MeshBuilder, polygonNormal, vec, type V2 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, inRange, integer, oneOf, positive, require as need, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

// ---------------------------------------------------------------- cavetto cornice

/** Cornice proportions as fractions of its height: the torus roll's diameter at the bottom and the flat band at the top of the gorge. */
export const CAVETTO = { torus: 0.18, fillet: 0.14 } as const;

export interface CavettoCorniceParams {
  /** Height of the whole moulding, torus roll included, metres. */
  readonly height: number;
  /** How far the top band stands out from the wall face, metres; from 0.2 to 2 × height. */
  readonly projection: number;
  /** Segments in the torus and the gorge (3, 6 or 10): 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

/**
 * The Egyptian cornice section: a torus roll (diameter 0.18 × height) on the wall face, the cavetto gorge curving out to `projection`, and a flat band (0.14 × height) on top.
 * A closed (d, y) profile for sweep(): d is outward from the wall face, (0, 0) sits on the face at the moulding's bottom, and the top returns to the face at (0, height).
 * Swept along a wall top (default up = +Y) its front faces outward; the face against the wall (d = 0) faces in and is hidden.
 */
export function cavettoCorniceProfile(params: CavettoCorniceParams): Profile {
  const part = 'cavettoCorniceProfile';
  const height = positive(part, 'height', params.height);
  const projection = inRange(part, 'projection', params.projection, 0.2 * height, 2 * height);
  const detail = checkDetail(part, params.detail ?? 'medium');
  return cached(part, { height, projection, detail }, () => {
    const segments = byDetail(detail, [3, 6, 10]);
    const torus = CAVETTO.torus * height;
    const fillet = CAVETTO.fillet * height;
    const profile = new ProfilePen(0, 0)
      .half(0, torus, torus / 2, segments)
      .quarter(projection, height - torus - fillet, false, segments)
      .to(projection, height)
      .to(0, height)
      .close();
    return Object.freeze({ closed: profile.closed, points: Object.freeze([...profile.points]) });
  });
}

// ---------------------------------------------------------------- pylon

/** A doorway through a pylon: centred on x, from the ground, metres. */
export interface PylonDoor {
  readonly width: number;
  readonly height: number;
}

export interface PylonParams {
  /** Footprint width along x at the ground, over the corner rolls, metres. */
  readonly width: number;
  /** Overall height, cornice included, metres. */
  readonly height: number;
  /** Footprint depth along z at the ground, over the corner rolls, metres. */
  readonly depth: number;
  /** How far every face leans in from vertical, degrees, from 0 to 15. Default 5. */
  readonly batter?: number;
  /** A cavetto cornice (projection 0.75 × its height) on top; false ends the walls with the horizontal torus roll alone. Default true. */
  readonly cornice?: boolean;
  /** Cornice height, torus roll included, metres. Default 0.11 × height. It also sets the roll diameter (0.18 × cornice height) with or without the cornice. */
  readonly corniceHeight?: number;
  /** A doorway through the depth, or false for a solid pylon. Default false. */
  readonly door?: PylonDoor | false;
  /** Facets round the corner rolls (6, 10 or 16) and segments in the cornice: 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

interface PylonFull {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly batter: number;
  readonly cornice: boolean;
  readonly corniceHeight: number;
  readonly door: PylonDoor | false;
  readonly detail: Detail;
}

/** The cornice's projection as a fraction of its height. */
export const PYLON_CORNICE_PROJECTION = 0.75;

/**
 * A battered Egyptian pylon or gate wall: four faces leaning in by `batter`, a torus roll up each corner and round the top, a cavetto cornice above, and optionally a doorway.
 * Origin at the base centre, front +Z. The footprint over the corner rolls is exactly width × depth at the ground; y runs from 0 to height.
 * The cornice may stand out past the footprint: its outer edge is at width/2 − roll radius − (height − corniceHeight) × tan(batter) + 0.75 × corniceHeight (likewise in z). The bottom is left open (it sits on the ground).
 */
export function pylon(params: PylonParams): THREE.BufferGeometry {
  const part = 'pylon';
  const width = positive(part, 'width', params.width);
  const height = positive(part, 'height', params.height);
  const depth = positive(part, 'depth', params.depth);
  const batter = inRange(part, 'batter', params.batter ?? 5, 0, 15);
  const cornice = params.cornice ?? true;
  const corniceHeight = inRange(part, 'corniceHeight', params.corniceHeight ?? 0.11 * height, 0.02 * height, 0.3 * height);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const roll = (CAVETTO.torus / 2) * corniceHeight;
  const crown = cornice ? corniceHeight : 2 * roll;
  const body = height - crown;
  const tan = Math.tan((batter * Math.PI) / 180);
  const half = Math.min(width, depth) / 2;
  if (half - roll - body * tan < 0.1 * half) {
    const most = Math.max(0, (Math.atan((0.9 * half - roll) / body) * 180) / Math.PI);
    throw new Error(`${part}: batter is ${String(batter)}°; on a ${String(width)} × ${String(depth)} m footprint ${String(height)} m high the faces would nearly meet at the top, so use at most ${most.toFixed(2)}°.`);
  }
  const door = params.door ?? false;
  if (door !== false) {
    const doorWidth = positive(part, 'door.width', door.width);
    const doorHeight = positive(part, 'door.height', door.height);
    need(part, doorHeight <= 0.9 * body, `door.height is ${String(doorHeight)}; the walls below the cornice are ${body.toFixed(3)} m high, so use at most ${(0.9 * body).toFixed(3)}.`);
    const room = 2 * (width / 2 - 2 * roll - doorHeight * tan);
    need(part, doorWidth <= 0.8 * room, `door.width is ${String(doorWidth)}; at the door head the wall between the corner rolls is ${room.toFixed(3)} m wide, so use at most ${(0.8 * room).toFixed(3)}.`);
  }
  const full: PylonFull = { width, height, depth, batter, cornice, corniceHeight, door, detail };
  return cached(part, full, () => buildPylon(full));
}

/** Adds a flat polygon turned so that its front faces `normal`. */
function facing(builder: MeshBuilder, points: THREE.Vector3[], normal: THREE.Vector3): void {
  builder.polygon(polygonNormal(points).dot(normal) < 0 ? points.reverse() : points);
}

function buildPylon(p: PylonFull): THREE.BufferGeometry {
  const builder = new MeshBuilder();
  const roll = (CAVETTO.torus / 2) * p.corniceHeight;
  const crown = p.cornice ? p.corniceHeight : 2 * roll;
  const body = p.height - crown;
  const angle = (p.batter * Math.PI) / 180;
  const tan = Math.tan(angle);
  const ax0 = p.width / 2 - roll;
  const az0 = p.depth / 2 - roll;
  const ax = (y: number): number => ax0 - y * tan;
  const az = (y: number): number => az0 - y * tan;
  const ax1 = ax(body);
  const az1 = az(body);
  const slope = body / Math.cos(angle);
  // Front and back faces: a trapezoid in the leaning plane, notched by the doorway when there is one.
  const doorW = p.door === false ? 0 : p.door.width / 2;
  const doorV = p.door === false ? 0 : p.door.height / Math.cos(angle);
  const outline: V2[] =
    p.door === false
      ? [
          [-ax0, 0],
          [ax0, 0],
          [ax1, slope],
          [-ax1, slope],
        ]
      : [
          [-ax0, 0],
          [-doorW, 0],
          [-doorW, doorV],
          [doorW, doorV],
          [doorW, 0],
          [ax0, 0],
          [ax1, slope],
          [-ax1, slope],
        ];
  builder.planar(outline, [], vec(0, 0, az0), vec(1, 0, 0), vec(0, Math.cos(angle), -Math.sin(angle)));
  builder.planar(outline, [], vec(0, 0, -az0), vec(-1, 0, 0), vec(0, Math.cos(angle), Math.sin(angle)));
  facing(builder, [vec(ax0, 0, az0), vec(ax0, 0, -az0), vec(ax1, body, -az1), vec(ax1, body, az1)], vec(1, 0, 0));
  facing(builder, [vec(-ax0, 0, -az0), vec(-ax0, 0, az0), vec(-ax1, body, az1), vec(-ax1, body, -az1)], vec(-1, 0, 0));
  if (p.door !== false) {
    const dh = p.door.height;
    const zf = az(dh);
    facing(builder, [vec(doorW, 0, az0), vec(doorW, 0, -az0), vec(doorW, dh, -zf), vec(doorW, dh, zf)], vec(-1, 0, 0));
    facing(builder, [vec(-doorW, 0, -az0), vec(-doorW, 0, az0), vec(-doorW, dh, zf), vec(-doorW, dh, -zf)], vec(1, 0, 0));
    facing(builder, [vec(-doorW, dh, zf), vec(doorW, dh, zf), vec(doorW, dh, -zf), vec(-doorW, dh, -zf)], vec(0, -1, 0));
  }
  // Corner rolls: horizontal circles of the roll radius centred on each leaning corner, from the ground up into the middle of the top roll, where their caps hide.
  const sides = byDetail(p.detail, [6, 10, 16]);
  const rollTop = body + roll;
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ] as const) {
    const ring = (y: number): THREE.Vector3[] =>
      Array.from({ length: sides }, (_, j) => {
        const theta = (2 * Math.PI * j) / sides;
        return vec(sx * ax(y) + roll * Math.cos(theta), y, sz * az(y) - roll * Math.sin(theta));
      });
    const top = ring(rollTop);
    builder.grid([ring(0), top], { wrapU: true });
    builder.polygon(top);
  }
  // The crown: the cornice (or the top roll alone) swept round the top of the walls, and a flat roof inside it.
  const segments = byDetail(p.detail, [3, 6, 10]);
  const profile = p.cornice
    ? cavettoCorniceProfile({ height: p.corniceHeight, projection: PYLON_CORNICE_PROJECTION * p.corniceHeight, detail: p.detail })
    : new ProfilePen(0, 0).half(0, 2 * roll, roll, segments).close();
  sweepInto(
    builder,
    profile,
    [
      [-ax1, body, az1],
      [ax1, body, az1],
      [ax1, body, -az1],
      [-ax1, body, -az1],
    ],
    { closed: true },
  );
  builder.polygon([vec(-ax1, p.height, az1), vec(ax1, p.height, az1), vec(ax1, p.height, -az1), vec(-ax1, p.height, -az1)]);
  return builder.build();
}

// ---------------------------------------------------------------- papyriform column

/** Column proportions: heights as fractions of the height, radii and the abacus side as fractions of the diameter. */
export const PAPYRUS = {
  baseTop: 0.035,
  bandsBottom: 0.7,
  bandsTop: 0.75,
  abacusBottom: 0.93,
  baseRadius: 0.65,
  budRadius: 0.6,
  bellRadius: 0.85,
  budAbacus: 0.7,
  bellAbacus: 0.8,
} as const;

export type PapyrusCapital = 'bud' | 'bell';

export interface PapyriformColumnParams {
  /** Overall height, base disc to abacus top, metres. */
  readonly height: number;
  /** Largest diameter of the bundled shaft (just above its foot), metres; from 0.04 to 0.5 × height. */
  readonly diameter: number;
  /** 'bud' a closed-bud capital (default), 'bell' an open papyrus bell. */
  readonly capital?: PapyrusCapital;
  /** Stems in the bundle: a whole number from 4 to 16. Default 8. */
  readonly stems?: number;
  /** Samples per stem round the shaft (2, 4 or 6) and rings up it: 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

interface ColumnFull {
  readonly height: number;
  readonly diameter: number;
  readonly capital: PapyrusCapital;
  readonly stems: number;
  readonly detail: Detail;
}

/**
 * A papyrus-bundle column: a round base disc (1.3 × diameter), a shaft of bundled stems that pinches in at its foot and tapers up, five tied bands, a capital and a square abacus.
 * The bud capital swells to 1.2 × diameter and closes under an abacus 0.7 × diameter square; the bell capital opens to 1.7 × diameter under an abacus 0.8 × diameter square.
 * Origin at the base centre. The box is y in [0, height] and x, z in ±0.65 × diameter (bud) or ±0.85 × diameter (bell).
 */
export function papyriformColumn(params: PapyriformColumnParams): THREE.BufferGeometry {
  const part = 'papyriformColumn';
  const height = positive(part, 'height', params.height);
  const diameter = inRange(part, 'diameter', params.diameter, 0.04 * height, 0.5 * height);
  const capital = oneOf<PapyrusCapital>(part, 'capital', params.capital ?? 'bud', ['bud', 'bell']);
  const stems = integer(part, 'stems', params.stems ?? 8, 4, 16);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: ColumnFull = { height, diameter, capital, stems, detail };
  return cached(part, full, () => buildColumn(full));
}

/**
 * A bundle of `stems` rounded stems: one smooth strip per stem from groove to groove, so the grooves stay crisp, closed by a flat end on its first and
 * last rings. `rings` gives each ring's height and outer radius; lobe centres sit at θ = 2πk/stems (the first on +x), grooves `depth` × radius deeper.
 */
function bundleInto(builder: MeshBuilder, rings: readonly (readonly [number, number])[], depth: number, stems: number, perStem: number): void {
  const at = (k: number, j: number, y: number, radius: number): THREE.Vector3 => {
    const offset = j / perStem - 0.5;
    const theta = ((2 * Math.PI) / stems) * (k + offset);
    const r = radius * (1 - depth + depth * Math.max(0, Math.cos(Math.PI * offset)) ** 0.7);
    return vec(r * Math.cos(theta), y, -r * Math.sin(theta));
  };
  for (let k = 0; k < stems; k++) builder.grid(rings.map(([y, radius]) => Array.from({ length: perStem + 1 }, (_, j) => at(k, j, y, radius))));
  // Each end's outline runs round the lobes; earcut covers it, grooves and all.
  for (const [ring, up] of [
    [rings[0], false],
    [rings.at(-1), true],
  ] as const) {
    if (ring === undefined) continue;
    const [y, radius] = ring;
    const outline = Array.from({ length: stems * perStem }, (_, i) => at(Math.floor(i / perStem), i % perStem, y, radius)).map((p) => [p.x, up ? -p.z : p.z] as const);
    builder.planar(outline, [], vec(0, y, 0), vec(1, 0, 0), vec(0, 0, up ? -1 : 1));
  }
}

function buildColumn(p: ColumnFull): THREE.BufferGeometry {
  const builder = new MeshBuilder();
  const h = p.height;
  const d = p.diameter;
  const segments = byDetail(p.detail, [1, 2, 3]);
  const around = byDetail(p.detail, [16, 24, 32]);
  const perStem = byDetail(p.detail, [2, 4, 6]);
  const overlap = 0.004 * h;
  // Base disc with a rounded top edge.
  const baseTop = PAPYRUS.baseTop * h;
  const edge = 0.25 * baseTop;
  const base = new ProfilePen(0, 0)
    .to(PAPYRUS.baseRadius * d, 0)
    .to(PAPYRUS.baseRadius * d, baseTop - edge)
    .quarter(-edge, edge, true, segments)
    .to(0, baseTop)
    .open();
  latheInto(builder, base, { segments: around });
  // Shaft: the stems pinch in at the foot, are fullest at a tenth of the way up, and taper to 0.8 under the bands.
  const y0 = baseTop - overlap;
  const y1 = PAPYRUS.bandsBottom * h + overlap;
  const shaftRows = byDetail(p.detail, [5, 9, 15]);
  const ts = [0, 0.04, 0.1, ...Array.from({ length: shaftRows - 3 }, (_, k) => 0.1 + (0.9 * (k + 1)) / (shaftRows - 3))];
  const fullness = (t: number): number => (t <= 0.1 ? 0.86 + 0.14 * Math.sin((Math.PI / 2) * (t / 0.1)) : 1 - 0.2 * ((t - 0.1) / 0.9) ** 1.2);
  bundleInto(
    builder,
    ts.map((t) => [y0 + (y1 - y0) * t, (d / 2) * fullness(t)] as const),
    0.14,
    p.stems,
    perStem,
  );
  // Five tied bands, wider than the shaft under them and the capital above.
  const yb0 = PAPYRUS.bandsBottom * h;
  const yb1 = PAPYRUS.bandsTop * h;
  const bandStep = (yb1 - yb0) / 5;
  const bandRadius = 0.43 * d;
  const bands = new ProfilePen(0, yb0).to(bandRadius, yb0);
  for (let k = 0; k < 5; k++) bands.half(0, bandStep, 0.012 * d, segments);
  latheInto(builder, bands.to(0, yb1).open(), { segments: around });
  // Capital and abacus.
  const ya = PAPYRUS.abacusBottom * h;
  if (p.capital === 'bud') {
    // The buds swell just above the bands to 0.6 × diameter, then taper to 0.34 under the abacus.
    const rows = byDetail(p.detail, [3, 5, 8]);
    const swell = 0.25;
    const radiusAt = (t: number): number =>
      t <= swell ? 0.4 + (PAPYRUS.budRadius - 0.4) * Math.sin((Math.PI / 2) * (t / swell)) : 0.34 + (PAPYRUS.budRadius - 0.34) * (1 - ((t - swell) / (1 - swell)) ** 1.5);
    const tsCap = [...Array.from({ length: rows }, (_, k) => (swell * k) / rows), ...Array.from({ length: 2 * rows + 1 }, (_, k) => swell + ((1 - swell) * k) / (2 * rows))];
    const yc0 = yb1 - overlap;
    const yc1 = ya + overlap;
    bundleInto(
      builder,
      tsCap.map((t) => [yc0 + (yc1 - yc0) * t, d * radiusAt(t)] as const),
      0.1,
      p.stems,
      perStem,
    );
    const s = (PAPYRUS.budAbacus * d) / 2;
    builder.box([-s, ya, -s], [s, h, s]);
  } else {
    const bell = new ProfilePen(0, yb1 - overlap).to(0.4 * d, yb1 - overlap);
    const rows = byDetail(p.detail, [4, 7, 12]);
    const lip = 0.012 * h;
    for (let k = 1; k <= rows; k++) {
      const t = k / rows;
      bell.to(d * (0.4 + (PAPYRUS.bellRadius - 0.4) * Math.sin((Math.PI / 2) * t)), yb1 + (ya - lip - yb1) * t);
    }
    latheInto(builder, bell.to(PAPYRUS.bellRadius * d, ya).to(0, ya).open(), { segments: around });
    // The abacus stands on the bell's flat top.
    const s = (PAPYRUS.bellAbacus * d) / 2;
    builder.box([-s, ya, -s], [s, h, s]);
  }
  return builder.build();
}
