/**
 * Local parts the library lacks: pointed (two-centred) arches, a wall with openings of any head shape (rectangular, round, segmental, pointed),
 * rings of alternating voussoirs for those heads, and striped tympana. Frames follow src/model/lib/wall.ts: origin at the bottom centre of the
 * front face, the wall spans x ±width/2, y 0..height, z −thickness..0 with its front toward +Z. Openings: centre x, sill y, width and total
 * height (sill to crown or apex); the head springs at `height − rise`. Faces are triangulated with holes (earcut), so arched heads need no slabs.
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder } from '../lib/index.js';
import type { V2 } from '../lib/index.js';
import { keyOf, memo } from './shapes.js';

export type Head = 'rect' | 'round' | 'segmental' | 'pointed' | 'circle';

export interface Hole {
  readonly head?: Head;
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  /** Sill to crown, metres. */
  readonly height: number;
  /** Head rise, metres. Defaults: round width / 2, segmental width / 6, pointed width × √3 / 2 (equilateral). */
  readonly rise?: number;
  /** Depth of a blind niche, metres; through the wall when absent. */
  readonly depth?: number;
}

/** The rise a head has when none is given. */
export function riseOf(hole: Hole): number {
  const head = hole.head ?? 'rect';
  if (hole.rise !== undefined) return hole.rise;
  if (head === 'round') return hole.width / 2;
  if (head === 'segmental') return hole.width / 6;
  if (head === 'pointed') return (hole.width * Math.sqrt(3)) / 2;
  if (head === 'circle') return hole.width / 2;
  return 0;
}

/**
 * Points along an arch head from the right springing over the crown to the left springing, `offset` outward from the intrados (an extrados
 * concentric with it), for a head of `span` and `rise` springing at (cx, spring). Pointed heads are two-centred: each side is an arc from its
 * springing to the apex, centred on the springing line.
 */
export function headPoints(head: Exclude<Head, 'rect' | 'circle'>, cx: number, spring: number, span: number, rise: number, offset: number, segments: number): V2[] {
  const a = span / 2;
  const out: V2[] = [];
  if (head === 'pointed') {
    // The right side is centred at (cx − c, spring) with radius R = a + c and passes through the apex (cx, spring + rise): c = (rise² − a²) / 2a.
    const c = (rise * rise - a * a) / (2 * a);
    const R = a + c + offset;
    const apex = Math.acos(Math.max(-1, Math.min(1, c / R)));
    const n = Math.max(2, Math.round(segments / 2));
    for (let k = 0; k <= n; k++) {
      const t = (apex * k) / n;
      out.push([cx - c + R * Math.cos(t), spring + R * Math.sin(t)]);
    }
    for (let k = n - 1; k >= 0; k--) {
      const t = (apex * k) / n;
      out.push([cx + c - R * Math.cos(t), spring + R * Math.sin(t)]);
    }
    return out;
  }
  const radius = (a * a + rise * rise) / (2 * rise);
  const cy = spring + rise - radius;
  const half = Math.asin(Math.min(1, a / radius));
  const n = Math.max(2, Math.round((segments * half * 2) / Math.PI));
  for (let k = 0; k <= n; k++) {
    const t = Math.PI / 2 - half + (2 * half * k) / n;
    out.push([cx + (radius + offset) * Math.cos(t), cy + (radius + offset) * Math.sin(t)]);
  }
  return out;
}

/** The outline of a hole, counter-clockwise seen from the front. */
export function holeOutline(hole: Hole, segments = 12): V2[] {
  const head = hole.head ?? 'rect';
  const x = hole.x ?? 0;
  const y = hole.y ?? 0;
  const w = hole.width / 2;
  const top = y + hole.height;
  if (head === 'rect') {
    return [
      [x - w, y],
      [x + w, y],
      [x + w, top],
      [x - w, top],
    ];
  }
  if (head === 'circle') {
    // A round window `width` across with its lowest point at the sill; `height` is ignored beyond the diameter.
    const n = Math.max(8, segments * 2);
    return Array.from({ length: n }, (_, k) => [x + w * Math.cos(-Math.PI / 2 + (2 * Math.PI * k) / n), y + w + w * Math.sin(-Math.PI / 2 + (2 * Math.PI * k) / n)] as const);
  }
  const rise = riseOf(hole);
  return [[x - w, y], [x + w, y], ...headPoints(head, x, top - rise, hole.width, rise, 0, segments)];
}

export interface OpenWallParams {
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly holes?: readonly Hole[];
  /** Leave out the end faces (a wall that runs into another). Default false. */
  readonly openEnds?: boolean;
}

/** A wall with holes of any head shape (see the header for the frame). */
export function openWall(params: OpenWallParams): BufferGeometry {
  const holes = params.holes ?? [];
  checkHoles(params.width, params.height, holes);
  // A hole's depth as buildWall reads it, −1 for one through the wall, so a blind niche and a through hole never share a key however near their depths.
  const depth = (h: Hole): number => (h.depth !== undefined && h.depth < params.thickness ? h.depth : -1);
  const key = `openWall:${keyOf(params.width, params.height, params.thickness, params.openEnds ?? false)}:${holes.map((h) => keyOf(h.head ?? 'rect', h.x ?? 0, h.y ?? 0, h.width, h.height, riseOf(h), depth(h))).join('|')}`;
  return memo(key, () => buildWall(params.width, params.height, params.thickness, holes, params.openEnds ?? false));
}

/** The holes on a wall's base but its round windows: its doors and blind niches, from −X. */
function doorsOf(holes: readonly Hole[]): Hole[] {
  return holes.filter((h) => (h.y ?? 0) <= 1e-6 && (h.head ?? 'rect') !== 'circle').sort((p, q) => (p.x ?? 0) - (q.x ?? 0));
}

/**
 * Refuses a hole that leaves the wall, and doors less than 1 mm apart: where two doors touch or cross, the front and back faces can seal one of them.
 * Windows are not checked against each other or the doors. Run on every call, not only on the first of a cache key, which rounds to the millimetre.
 */
function checkHoles(width: number, height: number, holes: readonly Hole[]): void {
  for (const h of holes) {
    const x = h.x ?? 0;
    const y = h.y ?? 0;
    if (!(x - h.width / 2 > -width / 2 && x + h.width / 2 < width / 2 && y >= 0 && y + h.height < height)) {
      throw new Error(`openWall: a hole at x ${String(x)}, y ${String(y)} (${String(h.width)} × ${String(h.height)}) leaves the wall (${String(width)} × ${String(height)}); keep holes inside it.`);
    }
  }
  const doors = doorsOf(holes);
  doors.forEach((q, k) => {
    const p = doors[k - 1];
    if (p === undefined) return;
    const [p0, p1, q0, q1] = [(p.x ?? 0) - p.width / 2, (p.x ?? 0) + p.width / 2, (q.x ?? 0) - q.width / 2, (q.x ?? 0) + q.width / 2];
    const gap = q0 - p1;
    if (gap < 1e-3 - 1e-9) {
      // Millimetres to the nanometre, so a gap refused just under 1 mm never reads as 1 mm.
      const mm = (metres: number): number => Number((metres * 1000).toFixed(6));
      const how = mm(Math.abs(gap)) === 0 ? 'touch' : gap < 0 ? `overlap by ${String(mm(Math.min(p1, q1) - Math.max(p0, q0)))} mm` : `stand ${String(mm(gap))} mm apart`;
      throw new Error(`openWall: the doors at x ${String(p.x ?? 0)} (${String(p.width)} wide) and x ${String(q.x ?? 0)} (${String(q.width)} wide) ${how}; keep doors at least 1 mm apart.`);
    }
  });
}

function buildWall(width: number, height: number, thickness: number, holes: readonly Hole[], openEnds: boolean): BufferGeometry {
  const doors = doorsOf(holes);
  const b = new MeshBuilder();
  const W = width / 2;
  const outline: V2[] = [
    [-W, 0],
    [W, 0],
    [W, height],
    [-W, height],
  ];
  const loops = holes.map((h) => ({ outline: holeOutline(h, 12), depth: h.depth !== undefined && h.depth < thickness ? h.depth : thickness, door: doors.includes(h) }));
  const through = loops.filter((l) => l.depth >= thickness);
  b.planar(outline, loops.map((l) => l.outline), new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
  // Back face, mirrored in u so it faces −Z.
  const mirror = (pts: readonly V2[]): V2[] => pts.map(([u, v]) => [-u, v] as const);
  b.planar(mirror(outline), through.map((l) => mirror(l.outline)), new Vector3(0, 0, -thickness), new Vector3(-1, 0, 0), new Vector3(0, 1, 0));
  b.box([-W, 0, -thickness], [W, height, 0], ['+z', '-z', '-y', ...(openEnds ? ['+x', '-x'] : [])]);
  // The bottom face looks down, with each door's opening left out (behind a blind one, only its niche), so every vertical line through the wall crosses
  // it an even number of times and the walk's settle and the section cut read it as a closed solid (docs/design/spec.md, Walk mode: When the build moves).
  const bottom = (x0: number, x1: number, z0: number): void => {
    if (x1 > x0) b.polygon([new Vector3(x0, 0, -thickness), new Vector3(x1, 0, -thickness), new Vector3(x1, 0, z0), new Vector3(x0, 0, z0)]);
  };
  let from = -W;
  for (const h of doors) {
    const x = h.x ?? 0;
    bottom(from, x - h.width / 2, 0);
    if (h.depth !== undefined && h.depth < thickness) bottom(x - h.width / 2, x + h.width / 2, -h.depth);
    from = x + h.width / 2;
  }
  bottom(from, W, 0);
  for (const loop of loops) {
    const pts = loop.outline;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % pts.length];
      if (p === undefined || q === undefined) continue;
      if (loop.door && k === 0) continue; // a door has no sill face in the floor's plane
      b.polygon([new Vector3(p[0], p[1], 0), new Vector3(q[0], q[1], 0), new Vector3(q[0], q[1], -loop.depth), new Vector3(p[0], p[1], -loop.depth)]);
    }
    if (loop.depth < thickness) b.planar(pts, [], new Vector3(0, 0, -loop.depth), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
  }
  return b.build();
}

/**
 * The lining of a hole through a wall, in openWall's frame: the band between the hole's outline and a smaller one's on the same sill, `depth` deep
 * from the front face toward −Z. Its outer face lies on the reveal of a hole cut to `outer` (the same 12 facets per head as openWall's), its inner
 * face looks into the opening, and its feet on the sill line look down, so a section cut through a jamb shows a closed solid (src/viewer/cap-pass.ts).
 */
export function holeLining(outer: Hole, inner: Hole, depth: number): BufferGeometry {
  const sill = outer.y ?? 0;
  if ((inner.y ?? 0) !== sill) throw new Error(`holeLining: the inner hole's sill (y ${String(inner.y ?? 0)}) is not the outer one's (y ${String(sill)}); give both the same sill.`);
  const key = `holeLining:${[outer, inner].map((h) => keyOf(h.head ?? 'rect', h.x ?? 0, h.y ?? 0, h.width, h.height, riseOf(h))).join('|')}:${keyOf(depth)}`;
  return memo(key, () => {
    const [o0, o1, ...oHead] = holeOutline(outer, 12);
    const [i0, i1, ...iHead] = holeOutline(inner, 12);
    if (o0 === undefined || o1 === undefined || i0 === undefined || i1 === undefined) throw new Error('holeLining: a hole outline has fewer than two points.');
    // Counter-clockwise from the front: along the left foot, up and round the inner outline backward, along the right foot, round the outer one.
    const outline: V2[] = [o0, i0, ...[...iHead].reverse(), i1, o1, ...oHead];
    const b = new MeshBuilder();
    b.planar(outline, [], new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
    b.planar(outline.map(([u, v]) => [-u, v] as const), [], new Vector3(0, 0, -depth), new Vector3(-1, 0, 0), new Vector3(0, 1, 0));
    // Each edge's face looks out of the band (right of travel): into the opening on the inner outline, onto the reveal on the outer, down at the feet.
    for (let k = 0; k < outline.length; k++) {
      const p = outline[k];
      const q = outline[(k + 1) % outline.length];
      if (p === undefined || q === undefined) continue;
      b.polygon([new Vector3(p[0], p[1], -depth), new Vector3(q[0], q[1], -depth), new Vector3(q[0], q[1], 0), new Vector3(p[0], p[1], 0)]);
    }
    return b.build();
  });
}

/** A point `t` of the way along a polyline, by arc length. */
function along(pts: readonly V2[], t: number): V2 {
  const lengths = [0];
  for (let k = 1; k < pts.length; k++) {
    const p = pts[k - 1] ?? [0, 0];
    const q = pts[k] ?? [0, 0];
    lengths.push((lengths[k - 1] ?? 0) + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const s = t * (lengths[lengths.length - 1] ?? 0);
  let k = 1;
  while (k < pts.length - 1 && (lengths[k] ?? 0) < s) k++;
  const s0 = lengths[k - 1] ?? 0;
  const s1 = lengths[k] ?? 0;
  const p = pts[k - 1] ?? [0, 0];
  const q = pts[k] ?? [0, 0];
  const f = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
}

export interface RingParams {
  readonly head: Exclude<Head, 'rect' | 'circle'>;
  readonly span: number;
  readonly rise?: number;
  /** Radial depth of the ring, metres. */
  readonly band: number;
  /** Stones in the ring; even for pointed heads (a joint at the apex). */
  readonly count: number;
  /** Projection from the wall face, metres. */
  readonly projection: number;
  /** Which stones: 0 the even ones (from the right springing), 1 the odd ones, 'all' every stone. */
  readonly parity: 0 | 1 | 'all';
  /** Start the ring this far outside the intrados (a hood moulding round another ring), metres. Default 0. */
  readonly inset?: number;
  /** Close the ring's back (z = 0) too, for a free-standing rib. Default false (the back lies on a wall). */
  readonly back?: boolean;
}

/** Voussoirs round an arch head, origin at the centre of its springing line on the wall face; alternate parities give polychrome rings. */
export function voussoirRing(params: RingParams): BufferGeometry {
  const rise = params.rise ?? riseOf({ head: params.head, width: params.span, height: 99 });
  const inset = params.inset ?? 0;
  const back = params.back ?? false;
  const key = `ring:${keyOf(params.head, params.span, rise, params.band, params.count, params.projection, String(params.parity), inset, back)}`;
  return memo(key, () => {
    const b = new MeshBuilder();
    const inner = headPoints(params.head, 0, 0, params.span, rise, inset, params.count * 6);
    const outer = headPoints(params.head, 0, 0, params.span, rise, inset + params.band, params.count * 6);
    const z = params.projection;
    const sub = 4;
    for (let k = 0; k < params.count; k++) {
      if (params.parity !== 'all' && k % 2 !== params.parity) continue;
      const i: Vector3[] = [];
      const o: Vector3[] = [];
      for (let j = 0; j <= sub; j++) {
        const t = (k + j / sub) / params.count;
        const [ix, iy] = along(inner, t);
        const [ox, oy] = along(outer, t);
        i.push(new Vector3(ix, iy, z));
        o.push(new Vector3(ox, oy, z));
      }
      // Along the curves t runs right to left over the crown; [o_j, o_j+1, i_j+1, i_j] is counter-clockwise seen from the front.
      for (let j = 0; j < sub; j++) {
        const q = [o[j], o[j + 1], i[j + 1], i[j]].filter((p): p is Vector3 => p !== undefined);
        b.polygon(q);
        if (back) b.polygon(q.map((p) => p.clone().setZ(0)).reverse());
      }
      const perimeter = [...o, ...[...i].reverse()];
      for (let m = 0; m < perimeter.length; m++) {
        const p = perimeter[m];
        const q = perimeter[(m + 1) % perimeter.length];
        if (p === undefined || q === undefined) continue;
        b.polygon([p.clone().setZ(0), q.clone().setZ(0), q, p]);
      }
    }
    return b.build();
  });
}

export interface TympanumParams {
  readonly head: Exclude<Head, 'rect' | 'circle'>;
  readonly span: number;
  readonly rise?: number;
  /** Stripe and gap height, metres. */
  readonly stripe: number;
  /** Which part: the panel behind the stripes, or the stripes in front of it. */
  readonly part: 'panel' | 'stripes';
}

/** The arched head of an opening filled flush: a panel and horizontal stripes on it. Origin at the centre of the springing line; the panel is at z = 0. */
export function tympanum(params: TympanumParams): BufferGeometry {
  const rise = params.rise ?? riseOf({ head: params.head, width: params.span, height: 99 });
  return memo(`tympanum:${keyOf(params.head, params.span, rise, params.stripe, params.part)}`, () => {
    const b = new MeshBuilder();
    const arc = headPoints(params.head, 0, 0, params.span, rise, 0, 24);
    if (params.part === 'panel') {
      b.planar(arc, [], new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
      return b.build();
    }
    const halfAt = (y: number): number => {
      let best = 0;
      for (let k = 0; k + 1 < arc.length; k++) {
        const p = arc[k] ?? [0, 0];
        const q = arc[k + 1] ?? [0, 0];
        if ((p[1] - y) * (q[1] - y) <= 0 && Math.abs(q[1] - p[1]) > 1e-9) best = Math.max(best, Math.abs(p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1])));
      }
      return best;
    };
    const depth = 0.04;
    for (let y0 = params.stripe; y0 + params.stripe * 0.6 < rise; y0 += 2 * params.stripe) {
      const y1 = Math.min(y0 + params.stripe, rise - 0.02);
      const w0 = halfAt(y0) - 0.02;
      const w1 = halfAt(y1) - 0.02;
      if (w0 <= 0.05 || w1 <= 0.02) continue;
      b.polygon([new Vector3(-w0, y0, depth), new Vector3(w0, y0, depth), new Vector3(w1, y1, depth), new Vector3(-w1, y1, depth)]);
      b.polygon([new Vector3(-w0, y0, 0), new Vector3(w0, y0, 0), new Vector3(w0, y0, depth), new Vector3(-w0, y0, depth)]);
      b.polygon([new Vector3(-w1, y1, depth), new Vector3(w1, y1, depth), new Vector3(w1, y1, 0), new Vector3(-w1, y1, 0)]);
      // Its sloping ends, which close it along vertical lines; its back lies on the panel.
      b.polygon([new Vector3(w0, y0, 0), new Vector3(w1, y1, 0), new Vector3(w1, y1, depth), new Vector3(w0, y0, depth)]);
      b.polygon([new Vector3(-w0, y0, depth), new Vector3(-w1, y1, depth), new Vector3(-w1, y1, 0), new Vector3(-w0, y0, 0)]);
    }
    return b.build();
  });
}
