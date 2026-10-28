/**
 * Walls with openings: rectangular, round-arched and segmental, cut through (or blind niches), with reveals; optionally channelled in horizontal bands (banded rustication).
 *
 * Units metres. Origin at the bottom centre of the front face: the wall spans x from −width/2 to width/2, y from 0 to height, and z from −thickness (back) to 0 (front, facing +Z).
 * Openings are described by their centre x, sill height y, width and total height (sill to crown); arches spring at `height − width/2` (round) or `height − rise` (segmental).
 * Faces are split into horizontal slabs between the openings' vertices (a trapezoid decomposition), so the front and back carry no hole-triangulation slivers.
 */
import * as THREE from 'three';

import { MeshBuilder, polygonNormal, type V2 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, nonNegative, oneOf, positive, require, type Detail } from './params.js';
import { sweepInto } from './sweep.js';

export type OpeningShape = 'rect' | 'arch' | 'segmental';

export interface Opening {
  /** Default 'rect'. */
  shape?: OpeningShape;
  /** Centre x, metres from the wall's centre. Default 0. */
  x?: number;
  /** Sill height above the wall's foot, metres. Default 0 (a door). */
  y?: number;
  width: number;
  /** Sill to crown, metres. */
  height: number;
  /** Rise of a segmental head, metres. Default width / 6. */
  rise?: number;
  /** Depth of a blind niche, metres; through the wall when absent or not less than the thickness. */
  depth?: number;
}

export interface Rustication {
  /** Course height (joint to joint), metres. Default 0.6. */
  course?: number;
  /** Joint (channel) height, metres. Default 0.05. */
  joint?: number;
  /** Channel depth, metres. Default 0.04. */
  depth?: number;
  /** Height of the first joint above the foot, metres. Default one course. */
  start?: number;
  /** Height of the last joint, metres. Default the wall height less half a course. */
  stop?: number;
}

export interface WallParams {
  width: number;
  height: number;
  /** Default 0.6. */
  thickness?: number;
  openings?: readonly Opening[];
  /** Banded rustication on the front face, or none. Default none. */
  rustication?: Rustication | false;
  detail?: Detail;
}

interface Hole {
  /** Convex outline, counter-clockwise seen from the front. */
  readonly outline: V2[];
  readonly depth: number;
  readonly minY: number;
  readonly maxY: number;
}

/** The outline of an opening, counter-clockwise seen from the front (+Z), arcs sampled with `segments` per half turn. */
export function openingOutline(opening: Opening | OpeningSpec, segments: number): V2[] {
  const shape = opening.shape ?? 'rect';
  const x = opening.x ?? 0;
  const y = opening.y ?? 0;
  const w = opening.width / 2;
  const top = y + opening.height;
  if (shape === 'rect') {
    return [
      [x - w, y],
      [x + w, y],
      [x + w, top],
      [x - w, top],
    ];
  }
  const rise = shape === 'arch' ? w : (opening.rise ?? opening.width / 6);
  // (A rise of exactly half the width is a round arch.)
  const spring = top - rise;
  const radius = (w * w + rise * rise) / (2 * rise);
  const cy = top - radius;
  const sweep = Math.asin(Math.min(1, w / radius));
  const count = Math.max(2, Math.round((segments * sweep * 2) / Math.PI));
  const out: V2[] = [
    [x - w, y],
    [x + w, y],
    [x + w, spring],
  ];
  for (let k = 1; k < count; k++) {
    const a = Math.PI / 2 - sweep + (2 * sweep * k) / count;
    out.push([x + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  out.push([x - w, spring]);
  return out;
}

/** The x-interval a convex outline covers at height y, or null. */
function spanAt(outline: readonly V2[], y: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < outline.length; k++) {
    const a = outline[k];
    const b = outline[(k + 1) % outline.length];
    if (a === undefined || b === undefined) continue;
    const y0 = Math.min(a[1], b[1]);
    const y1 = Math.max(a[1], b[1]);
    if (y < y0 - 1e-9 || y > y1 + 1e-9) continue;
    if (Math.abs(b[1] - a[1]) < 1e-12) {
      lo = Math.min(lo, a[0], b[0]);
      hi = Math.max(hi, a[0], b[0]);
    } else {
      const x = a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Quads covering [x0, x1] × [ya, yb] minus the holes, as [bottom-left, bottom-right, top-right, top-left] in (x, y).
 * Slabs break at every hole vertex inside the band, so within a slab each hole's sides are straight.
 */
export function stripsAround(x0: number, x1: number, ya: number, yb: number, holes: readonly Hole[]): [V2, V2, V2, V2][] {
  const cuts = new Set<number>([ya, yb]);
  for (const hole of holes) for (const [, y] of hole.outline) if (y > ya && y < yb) cuts.add(y);
  const ys = [...cuts].sort((a, b) => a - b);
  const quads: [V2, V2, V2, V2][] = [];
  for (let k = 0; k + 1 < ys.length; k++) {
    const y0 = ys[k] ?? 0;
    const y1 = ys[k + 1] ?? 0;
    if (y1 - y0 < 1e-9) continue;
    const mid = (y0 + y1) / 2;
    const inside = holes
      .filter((hole) => hole.minY < mid && hole.maxY > mid)
      .map((hole) => ({ bottom: spanAt(hole.outline, y0) ?? spanAt(hole.outline, mid), top: spanAt(hole.outline, y1) ?? spanAt(hole.outline, mid), mid: spanAt(hole.outline, mid) }))
      .filter((s): s is { bottom: [number, number]; top: [number, number]; mid: [number, number] } => s.bottom !== null && s.top !== null && s.mid !== null)
      .sort((a, b) => a.mid[0] - b.mid[0]);
    let left0 = x0;
    let left1 = x0;
    for (const span of inside) {
      if (span.bottom[0] - left0 > 1e-9 || span.top[0] - left1 > 1e-9) quads.push([[left0, y0], [span.bottom[0], y0], [span.top[0], y1], [left1, y1]]);
      left0 = span.bottom[1];
      left1 = span.top[1];
    }
    if (x1 - left0 > 1e-9 || x1 - left1 > 1e-9) quads.push([[left0, y0], [x1, y0], [x1, y1], [left1, y1]]);
  }
  return quads;
}

/**
 * x-intervals of the line at height y outside every hole; with `edge`, outside too a hole whose sill (`'sill'`) or head (`'head'`) lies on the line,
 * whose own face covers it there, so a channel's floor or ceiling never doubles it.
 */
function intervalsAt(x0: number, x1: number, y: number, holes: readonly Hole[], edge?: 'sill' | 'head'): [number, number][] {
  const on = (h: number): boolean => Math.abs(y - h) <= 1e-9;
  const spans = holes
    .map((hole) => ((y > hole.minY && y < hole.maxY) || (edge === 'sill' && on(hole.minY)) || (edge === 'head' && on(hole.maxY)) ? spanAt(hole.outline, y) : null))
    .filter((s): s is [number, number] => s !== null)
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let left = x0;
  for (const [lo, hi] of spans) {
    if (lo > left) out.push([left, lo]);
    left = Math.max(left, hi);
  }
  if (x1 > left) out.push([left, x1]);
  return out;
}

/**
 * Where a channel from `lo` to `hi`, `depth` deep, runs into an opening's jamb, head, sill or arch, the reveal's front strip borders the channel, not
 * stone: a face back to back with it there, facing the channel, closes the channel's end, so it does not look into the reveal, and the stone along
 * vertical lines (docs/design/spec.md, Walk mode: When the build moves). A head or sill on the channel's edge, which its floor or ceiling meets, is left alone.
 */
function channelSidesInto(b: MeshBuilder, hole: Hole, lo: number, hi: number, depth: number): void {
  const pts = hole.outline;
  const cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
  // A door's sill, its outline's first side, has no reveal.
  for (let k = hole.minY <= 1e-9 ? 1 : 0; k < pts.length; k++) {
    const [xa, ya] = pts[k] ?? [0, 0];
    const [xc, yc] = pts[(k + 1) % pts.length] ?? [0, 0];
    let t0 = 0;
    let t1 = 1;
    if (Math.abs(yc - ya) < 1e-12) {
      if (!(ya > lo + 1e-9 && ya < hi - 1e-9)) continue;
    } else {
      const ta = (lo - ya) / (yc - ya);
      const tb = (hi - ya) / (yc - ya);
      t0 = Math.max(0, Math.min(ta, tb));
      t1 = Math.min(1, Math.max(ta, tb));
      if (t1 - t0 < 1e-9) continue;
    }
    const [px, py] = [xa + (xc - xa) * t0, ya + (yc - ya) * t0];
    const [qx, qy] = [xa + (xc - xa) * t1, ya + (yc - ya) * t1];
    const quad = [new THREE.Vector3(px, py, 0), new THREE.Vector3(qx, qy, 0), new THREE.Vector3(qx, qy, -depth), new THREE.Vector3(px, py, -depth)];
    const n = polygonNormal(quad);
    b.polygon(n.x * ((px + qx) / 2 - cx) + n.y * ((py + qy) / 2 - cy) > 0 ? quad : quad.reverse());
  }
}

function face(b: MeshBuilder, quads: readonly [V2, V2, V2, V2][], z: number, front: boolean): void {
  for (const q of quads) {
    const points = q.map(([x, y]) => new THREE.Vector3(x, y, z));
    b.polygon(front ? points : points.reverse());
  }
}

interface OpeningSpec {
  shape: OpeningShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rise: number | undefined;
  depth: number | undefined;
}

interface WallSpec {
  width: number;
  height: number;
  thickness: number;
  openings: OpeningSpec[];
  rustication: Required<Rustication> | null;
  detail: Detail;
}

function wallSpec(params: WallParams): WallSpec {
  const part = 'wall';
  const width = positive(part, 'width', params.width);
  const height = positive(part, 'height', params.height);
  const thickness = positive(part, 'thickness', params.thickness ?? 0.6);
  const openings = (params.openings ?? []).map((o, i) => {
    const shape = oneOf(part, `openings[${String(i)}].shape`, o.shape ?? 'rect', ['rect', 'arch', 'segmental'] as const);
    const spec = { shape, x: o.x ?? 0, y: nonNegative(part, `openings[${String(i)}].y`, o.y ?? 0), width: positive(part, `openings[${String(i)}].width`, o.width), height: positive(part, `openings[${String(i)}].height`, o.height), rise: o.rise, depth: o.depth };
    require(part, spec.x - spec.width / 2 > -width / 2 + 1e-6 && spec.x + spec.width / 2 < width / 2 - 1e-6, `openings[${String(i)}] (x ${String(spec.x)}, width ${String(spec.width)}) reaches the wall's side; keep it inside x ±${String(width / 2)}.`);
    require(part, spec.y + spec.height < height - 1e-6, `openings[${String(i)}] reaches ${String(spec.y + spec.height)} m, not below the wall top at ${String(height)} m.`);
    if (shape === 'arch') require(part, spec.height > spec.width / 2, `openings[${String(i)}] is an arch ${String(spec.width)} wide but only ${String(spec.height)} tall; it must be taller than half its width.`);
    if (shape === 'segmental') require(part, (spec.rise ?? spec.width / 6) < spec.height && (spec.rise ?? spec.width / 6) <= spec.width / 2, `openings[${String(i)}] has a segmental rise it cannot hold; the rise must be under the height and at most half the width.`);
    return spec;
  });
  for (let i = 0; i < openings.length; i++) {
    for (let j = i + 1; j < openings.length; j++) {
      const a = openings[i];
      const c = openings[j];
      if (a === undefined || c === undefined) continue;
      const apart = Math.abs(a.x - c.x) >= (a.width + c.width) / 2 + 1e-6 || a.y + a.height <= c.y || c.y + c.height <= a.y;
      require(part, apart, `openings[${String(i)}] and openings[${String(j)}] overlap; openings must not touch.`);
    }
  }
  const r = params.rustication;
  const rustication =
    r === undefined || r === false
      ? null
      : {
          course: positive(part, 'rustication.course', r.course ?? 0.6),
          joint: positive(part, 'rustication.joint', r.joint ?? 0.05),
          depth: positive(part, 'rustication.depth', r.depth ?? 0.04),
          start: r.start ?? r.course ?? 0.6,
          stop: r.stop ?? height - (r.course ?? 0.6) / 2,
        };
  if (rustication !== null) require(part, rustication.depth < thickness, `rustication.depth ${String(rustication.depth)} must be less than the thickness ${String(thickness)}.`);
  return { width, height, thickness, openings, rustication, detail: checkDetail(part, params.detail ?? 'medium') };
}

/** A wall with openings (see the header for the frame). */
export function wall(params: WallParams): THREE.BufferGeometry {
  const spec = wallSpec(params);
  return cached('wall', spec, () => buildWall(spec));
}

function buildWall(spec: WallSpec): THREE.BufferGeometry {
  const b = new MeshBuilder();
  const W = spec.width / 2;
  const H = spec.height;
  const T = spec.thickness;
  const segments = byDetail(spec.detail, [6, 12, 20]);
  const holes: Hole[] = spec.openings.map((o) => {
    const outline = openingOutline(o, segments);
    const ys = outline.map(([, y]) => y);
    return { outline, depth: o.depth !== undefined && o.depth < T ? o.depth : T, minY: Math.min(...ys), maxY: Math.max(...ys) };
  });
  const through = holes.filter((h) => h.depth >= T);
  // Front face, plain or banded.
  const r = spec.rustication;
  const joints: number[] = [];
  if (r !== null) for (let y = r.start; y <= r.stop + 1e-9; y += r.course) joints.push(y);
  if (r === null) face(b, stripsAround(-W, W, 0, H, holes), 0, true);
  else {
    let y0 = 0;
    for (const j of joints) {
      face(b, stripsAround(-W, W, y0, j - r.joint / 2, holes), 0, true);
      face(b, stripsAround(-W, W, j - r.joint / 2, j + r.joint / 2, holes), -r.depth, true);
      // The channel's floor faces up (top of the course below), its ceiling faces down.
      for (const [lo, hi] of intervalsAt(-W, W, j - r.joint / 2, holes, 'sill')) {
        b.polygon([new THREE.Vector3(lo, j - r.joint / 2, 0), new THREE.Vector3(hi, j - r.joint / 2, 0), new THREE.Vector3(hi, j - r.joint / 2, -r.depth), new THREE.Vector3(lo, j - r.joint / 2, -r.depth)]);
      }
      for (const [lo, hi] of intervalsAt(-W, W, j + r.joint / 2, holes, 'head')) {
        b.polygon([new THREE.Vector3(lo, j + r.joint / 2, -r.depth), new THREE.Vector3(hi, j + r.joint / 2, -r.depth), new THREE.Vector3(hi, j + r.joint / 2, 0), new THREE.Vector3(lo, j + r.joint / 2, 0)]);
      }
      for (const hole of holes) channelSidesInto(b, hole, j - r.joint / 2, j + r.joint / 2, r.depth);
      y0 = j + r.joint / 2;
    }
    face(b, stripsAround(-W, W, y0, H, holes), 0, true);
  }
  // Back face, cut by the through openings only.
  face(b, stripsAround(-W, W, 0, H, through), -T, false);
  // Ends, top and the foot, which is left open under doors; behind a blind one, a niche on the floor, it runs on under the wall. A channelled wall's
  // ends are notched where each channel runs out, so the channel's floor, back and ceiling meet them.
  b.box([-W, 0, -T], [W, H, 0], ['+z', '-z', '-y', ...(r === null ? [] : ['+x', '-x'])]);
  if (r !== null) {
    // The end's outline in (depth into the wall, height), down its front edge round each channel.
    const end: V2[] = [[0, 0], [T, 0], [T, H], [0, H]];
    for (const j of [...joints].reverse()) end.push([0, Math.min(H, j + r.joint / 2)], [r.depth, Math.min(H, j + r.joint / 2)], [r.depth, Math.max(0, j - r.joint / 2)], [0, Math.max(0, j - r.joint / 2)]);
    const outline = end.filter((p, k) => k === 0 || p[0] !== end[k - 1]?.[0] || p[1] !== end[k - 1]?.[1]);
    // Depth runs along −Z at both ends; the axes turn so each end faces out, +X or −X.
    for (const s of [-1, 1]) b.planar(outline.map(([d, y]) => [s * d, y] as const), [], new THREE.Vector3(s * W, 0, 0), new THREE.Vector3(0, 0, -s), new THREE.Vector3(0, 1, 0));
  }
  for (const [lo, hi] of intervalsAt(-W, W, 1e-6, holes)) {
    b.polygon([new THREE.Vector3(lo, 0, -T), new THREE.Vector3(hi, 0, -T), new THREE.Vector3(hi, 0, 0), new THREE.Vector3(lo, 0, 0)]);
  }
  for (const hole of holes) {
    const span = hole.minY <= 1e-9 && hole.depth < T ? spanAt(hole.outline, 1e-6) : null;
    if (span === null) continue;
    const [lo, hi] = span;
    b.polygon([new THREE.Vector3(lo, 0, -T), new THREE.Vector3(hi, 0, -T), new THREE.Vector3(hi, 0, -hole.depth), new THREE.Vector3(lo, 0, -hole.depth)]);
  }
  // Reveals: each outline swept from the front plane to its depth, facing into the opening; blind niches get a back.
  // A door (an opening at the foot) has no sill face, which would lie in the floor's plane.
  for (const hole of holes) {
    const door = hole.minY <= 1e-9;
    const loop = hole.outline.map(([x, y]) => [x, y, 0] as const);
    const path = door ? [...loop.slice(1), ...loop.slice(0, 1)] : loop;
    sweepInto(
      b,
      {
        closed: false,
        points: [
          [0, 0],
          [0, -hole.depth],
        ],
      },
      path,
      { closed: !door, up: [0, 0, 1], pathCreaseDeg: 30 },
    );
    if (hole.depth < T) {
      b.polygon(hole.outline.map(([x, y]) => new THREE.Vector3(x, y, -hole.depth)));
    }
  }
  return b.build();
}
