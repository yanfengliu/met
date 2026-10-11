/**
 * Glazing: ridge, hipped and pyramid skylights on a curb, flat laylights, and vertical or sloped curtain walls with a mullion grid.
 *
 * Every part returns `{ frame, glass }`: `frame` is the curb, bars and mullions (metal), `glass` the panes, each a single sheet set inside the bars' depth (never on a bar face) and facing outward
 * (up and out for skylights, down for a laylight, +Z for a curtain wall). Render glass double-sided. Units metres.
 * Skylights: origin at the bottom centre of the curb, ridge along Z. Laylight: origin at its bottom centre. Curtain wall: origin at the bottom centre of the glass plane, which leans back (top toward −Z) by `slope`.
 */
import * as THREE from 'three';

import { MeshBuilder } from './builder.js';
import { cached } from './cache.js';
import { inRange, integer, positive, require } from './params.js';
import { sweepInto } from './sweep.js';

export interface Glazing {
  readonly frame: THREE.BufferGeometry;
  readonly glass: THREE.BufferGeometry;
}

/** A bar of `width` × `depth` from a to b; its depth runs along `normal` (centred on the line), its width across. */
function barInto(b: MeshBuilder, a: THREE.Vector3, c: THREE.Vector3, width: number, depth: number, normal: THREE.Vector3): void {
  const axis = new THREE.Vector3().subVectors(c, a);
  const length = axis.length();
  if (length < 1e-6) return;
  axis.normalize();
  const n = normal.clone().addScaledVector(axis, -normal.dot(axis)).normalize();
  const side = new THREE.Vector3().crossVectors(axis, n).normalize();
  const mark = b.vertexCount;
  b.box([-width / 2, 0, -depth / 2], [width / 2, length, depth / 2]);
  // Local x → side, y → axis, z → n.
  b.transform(mark, new THREE.Matrix4().makeBasis(side, axis, n).setPosition(a));
}

/** A curb: a rectangular upstand `wall` thick round a `width` × `length` opening, `height` tall. */
function curbInto(b: MeshBuilder, width: number, length: number, height: number, wall: number): void {
  const hx = width / 2;
  const hz = length / 2;
  sweepInto(
    b,
    {
      closed: true,
      points: [
        [-wall, 0],
        [0, 0],
        [0, height],
        [-wall, height],
      ],
    },
    [
      [-hx, 0, hz],
      [hx, 0, hz],
      [hx, 0, -hz],
      [-hx, 0, -hz],
    ],
    { closed: true },
  );
}

/** A flat pane through the given corners (convex, any winding) pushed `offset` along `outward`, wound to face `outward`. */
function paneInto(b: MeshBuilder, corners: readonly THREE.Vector3[], outward: THREE.Vector3, offset: number): void {
  const points = corners.map((p) => p.clone().addScaledVector(outward, offset));
  const e1 = new THREE.Vector3().subVectors(points[1] ?? new THREE.Vector3(), points[0] ?? new THREE.Vector3());
  const e2 = new THREE.Vector3().subVectors(points[2] ?? new THREE.Vector3(), points[0] ?? new THREE.Vector3());
  b.polygon(new THREE.Vector3().crossVectors(e1, e2).dot(outward) >= 0 ? points : points.reverse());
}

interface RoofSpec {
  width: number;
  length: number;
  rise: number;
  curb: number;
  bays: number;
  bar: number;
  barDepth: number;
}

function roofSpec(part: string, p: { width: number; length: number; pitch?: number; curbHeight?: number; bays?: number; bar?: number; barDepth?: number }, defaultPitch: number): RoofSpec {
  const width = positive(part, 'width', p.width);
  const pitch = inRange(part, 'pitch', p.pitch ?? defaultPitch, 5, 70);
  return {
    width,
    length: positive(part, 'length', p.length),
    rise: (width / 2) * Math.tan((pitch * Math.PI) / 180),
    curb: positive(part, 'curbHeight', p.curbHeight ?? 0.3),
    bays: integer(part, 'bays', p.bays ?? 6, 1, 200),
    bar: positive(part, 'bar', p.bar ?? 0.06),
    barDepth: positive(part, 'barDepth', p.barDepth ?? 0.09),
  };
}

export interface RidgeSkylightParams {
  /** Across the ridge (X), metres. */
  width: number;
  /** Along the ridge (Z), metres. */
  length: number;
  /** Slope, degrees. Default 30. */
  pitch?: number;
  /** Curb height, metres. Default 0.3. */
  curbHeight?: number;
  /** Bays between rafters along the ridge. Default 6. */
  bays?: number;
  /** Bar face width, metres. Default 0.06. */
  bar?: number;
  /** Bar depth, metres. Default 0.09. */
  barDepth?: number;
}

/** A gabled glass roof on a curb: eave and ridge bars, rafters at each bay, glazed slopes and triangular glazed gable ends. */
export function ridgeSkylight(params: RidgeSkylightParams): Glazing {
  const s = roofSpec('ridgeSkylight', params, 30);
  return cached('ridgeSkylight', s, () => {
    const frame = new MeshBuilder();
    const glass = new MeshBuilder();
    const hx = s.width / 2;
    const hz = s.length / 2;
    const y0 = s.curb;
    const top = y0 + s.rise;
    curbInto(frame, s.width, s.length, y0, Math.max(0.12, s.bar * 2));
    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    for (const side of [-1, 1]) {
      const normal = new THREE.Vector3(side * s.rise, hx, 0).normalize();
      barInto(frame, v(side * hx, y0, -hz), v(side * hx, y0, hz), s.bar, s.barDepth, normal);
      for (let k = 0; k <= s.bays; k++) {
        const z = -hz + (s.length * k) / s.bays;
        barInto(frame, v(side * hx, y0, z), v(0, top, z), s.bar, s.barDepth, normal);
      }
      paneInto(glass, [v(side * hx, y0, -hz), v(side * hx, y0, hz), v(0, top, hz), v(0, top, -hz)], normal, -s.barDepth / 4);
    }
    barInto(frame, v(0, top, -hz), v(0, top, hz), s.bar * 1.4, s.barDepth, new THREE.Vector3(0, 1, 0));
    for (const end of [-1, 1]) paneInto(glass, [v(-hx, y0, end * hz), v(hx, y0, end * hz), v(0, top, end * hz)], new THREE.Vector3(0, 0, end), -s.bar / 4);
    return Object.freeze({ frame: frame.build(), glass: glass.build() });
  });
}

export type HippedSkylightParams = RidgeSkylightParams;

/** A hipped glass roof: two trapezoid slopes and two triangular ends, hip bars at the corners, a ridge when longer than wide (a pyramid otherwise). */
export function hippedSkylight(params: HippedSkylightParams): Glazing {
  const s = roofSpec('hippedSkylight', params, 30);
  return cached('hippedSkylight', s, () => {
    const frame = new MeshBuilder();
    const glass = new MeshBuilder();
    const hx = s.width / 2;
    const hz = s.length / 2;
    const ridge = Math.max(0, hz - hx);
    const y0 = s.curb;
    const top = y0 + s.rise;
    curbInto(frame, s.width, s.length, y0, Math.max(0.12, s.bar * 2));
    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    const corners = [v(-hx, y0, hz), v(hx, y0, hz), v(hx, y0, -hz), v(-hx, y0, -hz)];
    const r0 = v(0, top, ridge);
    const r1 = v(0, top, -ridge);
    const up = new THREE.Vector3(0, 1, 0);
    // Eaves, hips and ridge.
    for (let k = 0; k < 4; k++) barInto(frame, corners[k] ?? up, corners[(k + 1) % 4] ?? up, s.bar, s.barDepth, up);
    barInto(frame, corners[0] ?? up, r0, s.bar, s.barDepth, up);
    barInto(frame, corners[1] ?? up, r0, s.bar, s.barDepth, up);
    barInto(frame, corners[2] ?? up, r1, s.bar, s.barDepth, up);
    barInto(frame, corners[3] ?? up, r1, s.bar, s.barDepth, up);
    if (ridge > 1e-6) barInto(frame, r1, r0, s.bar * 1.4, s.barDepth, up);
    for (const side of [-1, 1]) {
      const normal = new THREE.Vector3(side * s.rise, hx, 0).normalize();
      // Rafters on the long slopes where they reach the ridge.
      for (let k = 1; k < s.bays; k++) {
        const z = -ridge + (2 * ridge * k) / s.bays;
        if (ridge > 1e-6) barInto(frame, v(side * hx, y0, z), v(0, top, z), s.bar, s.barDepth, normal);
      }
      const slope = side > 0 ? [corners[1], corners[2], r1, r0] : [corners[3], corners[0], r0, r1];
      paneInto(glass, slope.filter((p): p is THREE.Vector3 => p !== undefined), normal, -s.barDepth / 4);
    }
    for (const end of [-1, 1]) {
      const normal = new THREE.Vector3(0, hx, end * s.rise).normalize();
      const apex = end > 0 ? r0 : r1;
      barInto(frame, v(0, y0, end * hz), apex, s.bar, s.barDepth, normal);
      const tri = end > 0 ? [corners[0], corners[1], apex] : [corners[2], corners[3], apex];
      paneInto(glass, tri.filter((p): p is THREE.Vector3 => p !== undefined), normal, -s.barDepth / 4);
    }
    return Object.freeze({ frame: frame.build(), glass: glass.build() });
  });
}

export interface PyramidSkylightParams {
  width: number;
  /** Along Z, metres. Default equal to width. */
  depth?: number;
  /** Apex height above the curb, metres. Default width / 3. */
  rise?: number;
  curbHeight?: number;
  /** Intermediate bars on each face, from the eave to the apex. Default 2. */
  bars?: number;
  bar?: number;
  barDepth?: number;
}

/** A glass pyramid: four triangular faces to an apex over a curb, with hip, eave and intermediate bars. */
export function pyramidSkylight(params: PyramidSkylightParams): Glazing {
  const width = positive('pyramidSkylight', 'width', params.width);
  const full = {
    width,
    depth: positive('pyramidSkylight', 'depth', params.depth ?? width),
    rise: positive('pyramidSkylight', 'rise', params.rise ?? width / 3),
    curb: positive('pyramidSkylight', 'curbHeight', params.curbHeight ?? 0.3),
    bars: integer('pyramidSkylight', 'bars', params.bars ?? 2, 0, 50),
    bar: positive('pyramidSkylight', 'bar', params.bar ?? 0.06),
    barDepth: positive('pyramidSkylight', 'barDepth', params.barDepth ?? 0.09),
  };
  return cached('pyramidSkylight', full, () => {
    const frame = new MeshBuilder();
    const glass = new MeshBuilder();
    const hx = full.width / 2;
    const hz = full.depth / 2;
    const y0 = full.curb;
    curbInto(frame, full.width, full.depth, y0, Math.max(0.12, full.bar * 2));
    const apex = new THREE.Vector3(0, y0 + full.rise, 0);
    const corners = [new THREE.Vector3(-hx, y0, hz), new THREE.Vector3(hx, y0, hz), new THREE.Vector3(hx, y0, -hz), new THREE.Vector3(-hx, y0, -hz)];
    const up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < 4; k++) {
      const a = corners[k] ?? up;
      const c = corners[(k + 1) % 4] ?? up;
      barInto(frame, a, c, full.bar, full.barDepth, up);
      barInto(frame, a, apex, full.bar, full.barDepth, up);
      const mid = a.clone().add(c).multiplyScalar(0.5);
      const outward = mid.clone().setY(0).normalize();
      const run = outward.x !== 0 ? hx : hz;
      const normal = outward.clone().multiplyScalar(full.rise).setY(run).normalize();
      for (let i = 1; i <= full.bars; i++) barInto(frame, a.clone().lerp(c, i / (full.bars + 1)), apex, full.bar, full.barDepth, normal);
      paneInto(glass, [a, c, apex], normal, -full.barDepth / 4);
    }
    return Object.freeze({ frame: frame.build(), glass: glass.build() });
  });
}

export interface LaylightParams {
  width: number;
  length: number;
  /** Panes across X. Default 4. */
  cols?: number;
  /** Panes along Z. Default 4. */
  rows?: number;
  /** Frame member width, metres. Default 0.08. */
  frameWidth?: number;
  /** Frame member depth, metres. Default 0.1. */
  frameDepth?: number;
}

/** A flat ceiling laylight: a grid of frame members and one pane in the middle of their depth, facing down into the gallery. Origin at its bottom centre (y = 0 is the underside). */
export function laylight(params: LaylightParams): Glazing {
  const full = {
    width: positive('laylight', 'width', params.width),
    length: positive('laylight', 'length', params.length),
    cols: integer('laylight', 'cols', params.cols ?? 4, 1, 100),
    rows: integer('laylight', 'rows', params.rows ?? 4, 1, 100),
    frameWidth: positive('laylight', 'frameWidth', params.frameWidth ?? 0.08),
    frameDepth: positive('laylight', 'frameDepth', params.frameDepth ?? 0.1),
  };
  require('laylight', full.width > 2 * full.frameWidth && full.length > 2 * full.frameWidth, 'width and length must exceed twice the frame width.');
  return cached('laylight', full, () => {
    const frame = new MeshBuilder();
    const hx = full.width / 2;
    const hz = full.length / 2;
    const f = full.frameWidth;
    const d = full.frameDepth;
    for (let i = 0; i <= full.cols; i++) {
      const x = Math.min(hx - f / 2, Math.max(-hx + f / 2, -hx + (full.width * i) / full.cols));
      frame.box([x - f / 2, 0, -hz], [x + f / 2, d, hz]);
    }
    for (let j = 0; j <= full.rows; j++) {
      const z = Math.min(hz - f / 2, Math.max(-hz + f / 2, -hz + (full.length * j) / full.rows));
      // Cross members stop 1 mm short of the long ones' faces so no two faces coincide.
      for (let i = 0; i < full.cols; i++) {
        const x0 = -hx + (full.width * i) / full.cols + (i === 0 ? f : f / 2) + 0.001;
        const x1 = -hx + (full.width * (i + 1)) / full.cols - (i === full.cols - 1 ? f : f / 2) - 0.001;
        frame.box([x0, 0.002, z - f / 2], [x1, d - 0.002, z + f / 2]);
      }
    }
    const glass = new MeshBuilder();
    paneInto(glass, [new THREE.Vector3(-hx, 0, -hz), new THREE.Vector3(hx, 0, -hz), new THREE.Vector3(hx, 0, hz), new THREE.Vector3(-hx, 0, hz)], new THREE.Vector3(0, -1, 0), -d / 2);
    return Object.freeze({ frame: frame.build(), glass: glass.build() });
  });
}

export interface CurtainWallParams {
  width: number;
  /** Vertical height, metres. */
  height: number;
  /** Bays across. Default 6. */
  cols?: number;
  /** Bays up. Default 4. */
  rows?: number;
  /** Mullion face width, metres. Default 0.08. */
  mullionWidth?: number;
  /** Mullion depth, behind the glass, metres. Default 0.22. */
  mullionDepth?: number;
  /** Lean from vertical, degrees; positive tilts the top back toward −Z. Default 0. */
  slope?: number;
}

/** A curtain wall: mullions and transoms behind a glass plane with thin cover caps in front, vertical or leaning back by `slope` (the Sackler Wing's park wall leans). */
export function curtainWall(params: CurtainWallParams): Glazing {
  const full = {
    width: positive('curtainWall', 'width', params.width),
    height: positive('curtainWall', 'height', params.height),
    cols: integer('curtainWall', 'cols', params.cols ?? 6, 1, 200),
    rows: integer('curtainWall', 'rows', params.rows ?? 4, 1, 200),
    mullionWidth: positive('curtainWall', 'mullionWidth', params.mullionWidth ?? 0.08),
    mullionDepth: positive('curtainWall', 'mullionDepth', params.mullionDepth ?? 0.22),
    slope: inRange('curtainWall', 'slope', params.slope ?? 0, -60, 60),
  };
  return cached('curtainWall', full, () => {
    const s = (full.slope * Math.PI) / 180;
    const slant = full.height / Math.cos(s);
    const hw = full.width / 2;
    const m = full.mullionWidth;
    const cap = 0.03;
    const frame = new MeshBuilder();
    for (let i = 0; i <= full.cols; i++) {
      const x = Math.min(hw - m / 2, Math.max(-hw + m / 2, -hw + (full.width * i) / full.cols));
      frame.box([x - m / 2, 0, -full.mullionDepth], [x + m / 2, slant, cap]);
    }
    for (let j = 0; j <= full.rows; j++) {
      const y = Math.min(slant - m / 2, Math.max(m / 2, (slant * j) / full.rows));
      for (let i = 0; i < full.cols; i++) {
        const x0 = -hw + (full.width * i) / full.cols + (i === 0 ? m : m / 2) + 0.001;
        const x1 = -hw + (full.width * (i + 1)) / full.cols - (i === full.cols - 1 ? m : m / 2) - 0.001;
        frame.box([x0, y - m / 2, -full.mullionDepth * 0.8], [x1, y + m / 2, cap * 0.8]);
      }
    }
    const glass = new MeshBuilder();
    paneInto(glass, [new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(hw, 0, 0), new THREE.Vector3(hw, slant, 0), new THREE.Vector3(-hw, slant, 0)], new THREE.Vector3(0, 0, 1), -0.004);
    if (s !== 0) {
      const lean = new THREE.Matrix4().makeRotationX(-s);
      frame.transform(0, lean);
      glass.transform(0, lean);
    }
    return Object.freeze({ frame: frame.build(), glass: glass.build() });
  });
}
