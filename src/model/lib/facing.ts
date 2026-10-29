/**
 * Which way the closed parts of a geometry face: a part wound inside out holds its inside in front of its faces, which back-face culling draws from
 * inside and the section cut's cap pass reads as outside (docs/design/spec.md, Build-step API: Solids and sheets).
 * A part is the triangles that share corners, joined by position to a micrometre, so two solids touching at one corner are one part. Along a unit
 * direction v its volume is, by the divergence theorem, the sum over its faces of each face's centroid height along v times its signed area across v:
 * positive wound outward, negative inside out, and the same wherever heights are measured from once its faces looking up and looking down cover equal
 * areas across v, as on a part closed along v. Heights are measured from one of the part's own corners, so rounding grows with the part's size, not with
 * its distance from the frame's origin. The parts that close along v only together are read as one; parts that do not close even then are left to the
 * closure check (`openAlong`, ./check.ts).
 * Bound: a part reads as one sign in all, so a pocket of it wound inside out, where its surface folds through itself, leaves a positive sum and is not
 * seen; of the parts that close only together, one wound inside out among outward ones can pass. `inwardAlong` reads the pockets, on lines.
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

/** Corners nearer than this, in the geometry's own units, are one corner. */
const WELD = 1e-6;
/** The share of a part's area across v that its faces looking up and looking down may leave unmatched and still close it along v. */
const OPEN_SHARE = 1e-6;
/** The share of a part's volume terms, summed unsigned, that rounding may leave in their signed sum. */
const ROUNDING = 1e-9;

/** A part, or the parts that close only together, with its volume read along v. */
export interface PartVolume {
  /** Its volume, signed: negative for a part wound inside out, in the geometry's own units cubed. */
  readonly volume: number;
  /** The most rounding can put the volume out by: its unmatched area across v times its height along v, and a billionth of its terms summed unsigned. */
  readonly noise: number;
  /** How many welded parts it is: 1, or more for the parts that close only together. */
  readonly parts: number;
  /** One of its corners, in the geometry's frame. */
  readonly at: Vector3;
}

/** One part's sums, its heights along v from its corner `at`: its signed area across v, that area unsigned, its volume with heights from its lowest corner, that volume's terms unsigned, and its lowest and highest corner. */
interface Tally {
  across: number;
  total: number;
  volume: number;
  terms: number;
  low: number;
  high: number;
  readonly at: Vector3;
}

/** Every part of `geometry` that closes along `vertical` (a unit direction in its frame), alone or with the others that close only together. */
export function partVolumes(geometry: BufferGeometry, vertical: Vector3): PartVolume[] {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  const corner = (k: number): number => (index === null ? k : index.getX(k));
  const p = new Vector3();
  // Corners joined by position, and triangles by their corners.
  const ids = new Map<string, number>();
  const id: number[] = [];
  for (let k = 0; k < count; k += 1) {
    p.fromBufferAttribute(position, corner(k));
    const key = `${String(Math.round(p.x / WELD))},${String(Math.round(p.y / WELD))},${String(Math.round(p.z / WELD))}`;
    let n = ids.get(key);
    if (n === undefined) ids.set(key, (n = ids.size));
    id.push(n);
  }
  const parent = Array.from({ length: ids.size }, (_, k) => k);
  const root = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r] ?? r;
    for (let y = x; parent[y] !== r; ) {
      const next = parent[y] ?? r;
      parent[y] = r;
      y = next;
    }
    return r;
  };
  for (let t = 0; t + 2 < count; t += 3) {
    const r = root(id[t] ?? 0);
    parent[root(id[t + 1] ?? 0)] = r;
    parent[root(id[t + 2] ?? 0)] = r;
  }
  // Heights from each part's first corner, then from its lowest, so rounding costs no more than the part's own size and height.
  const tallies = new Map<number, Tally>();
  for (let k = 0; k < count; k += 1) {
    p.fromBufferAttribute(position, corner(k));
    const r = root(id[k] ?? 0);
    const tally = tallies.get(r);
    if (tally === undefined) tallies.set(r, { across: 0, total: 0, volume: 0, terms: 0, low: 0, high: 0, at: p.clone() });
    else {
      const h = p.sub(tally.at).dot(vertical);
      [tally.low, tally.high] = [Math.min(tally.low, h), Math.max(tally.high, h)];
    }
  }
  const [a, b, c, ab, ac] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  for (let t = 0; t + 2 < count; t += 3) {
    const tally = tallies.get(root(id[t] ?? 0));
    if (tally === undefined) continue;
    a.fromBufferAttribute(position, corner(t));
    b.fromBufferAttribute(position, corner(t + 1));
    c.fromBufferAttribute(position, corner(t + 2));
    const across = ab.subVectors(b, a).cross(ac.subVectors(c, a)).dot(vertical) / 2;
    tally.across += across;
    tally.total += Math.abs(across);
    // Each corner's height from the part's lowest before they are averaged, so a level membrane's two sides cancel exactly.
    const [ha, hb, hc] = [a, b, c].map((q) => q.clone().sub(tally.at).dot(vertical) - tally.low) as [number, number, number];
    const term = ((ha + hb + hc) / 3) * across;
    tally.volume += term;
    tally.terms += Math.abs(term);
  }
  const closes = (across: number, total: number): boolean => Math.abs(across) <= OPEN_SHARE * total;
  // Summing terms that cancel, as a membrane's two sides do, leaves a remainder that grows with the terms, not with what is left unmatched.
  const noise = (across: number, height: number, terms: number): number => Math.abs(across) * height + ROUNDING * terms;
  const out: PartVolume[] = [];
  const open: Tally[] = [];
  for (const tally of tallies.values()) {
    if (closes(tally.across, tally.total)) out.push({ volume: tally.volume, noise: noise(tally.across, tally.high - tally.low, tally.terms), parts: 1, at: tally.at });
    else open.push(tally);
  }
  const first = open[0];
  if (first !== undefined) {
    // The parts that close only together, their heights all from the lowest of their corners, found from the first part's corner.
    const lows = open.map((t) => t.at.clone().sub(first.at).dot(vertical) + t.low);
    const low = Math.min(...lows);
    const high = Math.max(...open.map((t, k) => (lows[k] ?? 0) - t.low + t.high));
    const across = open.reduce((sum, t) => sum + t.across, 0);
    const total = open.reduce((sum, t) => sum + t.total, 0);
    const volume = open.reduce((sum, t, k) => sum + t.volume + ((lows[k] ?? low) - low) * t.across, 0);
    const terms = open.reduce((sum, t, k) => sum + t.terms + Math.abs(((lows[k] ?? low) - low) * t.across), 0);
    if (closes(across, total)) out.push({ volume, noise: noise(across, high - low, terms), parts: open.length, at: first.at });
  }
  return out;
}

/**
 * Where in its cell each of `inwardAlong`'s grid lines stands, across u and across w: irrational shares whose sum and difference are no simple fraction
 * either, so the lines miss a cell's edges and both its diagonals (shares summing to 1 put ten of a hundred lines on the diagonals boxes are split along).
 */
const OFF = [0.5 + 1 / (4 * Math.PI), 0.5 - 1 / (2 * Math.E)] as const;
/** How far beside an open edge, in the geometry's own units, and how far along it, as a share of its length, the lines read there stand. */
const BESIDE = 1e-4;
const ALONG = 0.5 - 1 / (2 * Math.E);
/** A crossing this near its triangle's edge, by barycentric weight, may or may not be met by the triangle beside it too, so the line is cast again aside. */
const EDGE = 1e-9;
/** How far aside, in the geometry's own units, each next try of such a line stands, at an angle of no simple fraction. */
const ASIDE = [1e-6, 1e-6 / Math.PI] as const;

/** What lines find wound inside out: how many cross a stretch of it, the longest stretch, and the top of that stretch. */
export interface InwardStretch {
  readonly lines: number;
  /** In the geometry's own units. */
  readonly worst: number;
  /** In the geometry's frame; null when no line finds any. */
  readonly at: Vector3 | null;
}

/**
 * Where `geometry` is wound inside out along `vertical` (a unit direction in its frame): each stretch of a line along it where more of its faces look
 * down than up above it, as in a pocket whose surface folds through itself, on two sets of lines. A grid of `cells` × `cells` lines over the geometry's
 * bounds across the lines (OFF), and two lines BESIDE each open edge, one either side, ALONG it: an edge borne by an odd number of triangles, corners
 * joined by position to a micrometre, as where a part's open ends line up along the lines and the closure check reads it closed. Hits at one height are
 * read together, and a line with a hit on an edge of its triangle is cast again a hair aside (ASIDE), so that it meets each surface there once.
 * Bound: a pocket narrower than a cell that no open edge borders can be missed, and so can one narrower than BESIDE beside an open edge, as in a part a
 * hundred times smaller than Diana's bow; lined-up open ends that wind to an inside between them, +1 as any inside, read as no pocket at all; a line
 * still on an edge after its fourth try counts what it meets.
 */
export function inwardAlong(geometry: BufferGeometry, vertical: Vector3, cells: number): InwardStretch {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  // A right-handed frame (u, vertical, w), so a face's area across the lines, signed, is its normal along `vertical`.
  const u = new Vector3().crossVectors(vertical, Math.abs(vertical.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1)).normalize();
  const w = new Vector3().crossVectors(u, vertical);
  const coords = new Float64Array(count * 3);
  const p = new Vector3();
  let [u0, u1, w0, w1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (let k = 0; k < count; k += 1) {
    p.fromBufferAttribute(position, index === null ? k : index.getX(k));
    const [pu, pw] = [p.dot(u), p.dot(w)];
    coords.set([pu, p.dot(vertical), pw], k * 3);
    [u0, u1, w0, w1] = [Math.min(u0, pu), Math.max(u1, pu), Math.min(w0, pw), Math.max(w1, pw)];
  }
  const [du, dw] = [Math.max((u1 - u0) / cells, 1e-12), Math.max((w1 - w0) / cells, 1e-12)];
  const cell = (x: number, origin: number, step: number): number => Math.min(cells - 1, Math.max(0, Math.floor((x - origin) / step)));
  // Each cell's triangles, as offsets into coords: those whose bounds across the lines overlap it, so a line anywhere in it meets only them.
  const members: number[][] = Array.from({ length: cells * cells }, () => []);
  for (let o = 0; o + 8 < coords.length; o += 9) {
    const [au = 0, , aw = 0, bu = 0, , bw = 0, cu = 0, , cw = 0] = coords.subarray(o, o + 9);
    const [i0, i1] = [cell(Math.min(au, bu, cu), u0, du), cell(Math.max(au, bu, cu), u0, du)];
    const [j0, j1] = [cell(Math.min(aw, bw, cw), w0, dw), cell(Math.max(aw, bw, cw), w0, dw)];
    for (let i = i0; i <= i1; i += 1) for (let j = j0; j <= j1; j += 1) members[i * cells + j]?.push(o);
  }
  // The line through (x, z): its longest stretch wound inside out, that stretch's top and where the line stood.
  const read = (x: number, z: number): { stretch: number; top: number; x: number; z: number } => {
    let met: [number, number][] = [];
    let [px, pz] = [x, z];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      [px, pz] = [x + attempt * ASIDE[0], z + attempt * ASIDE[1]];
      met = [];
      let edge = false;
      for (const o of members[cell(px, u0, du) * cells + cell(pz, w0, dw)] ?? []) {
        const [au = 0, ah = 0, aw = 0, bu = 0, bh = 0, bw = 0, cu = 0, ch = 0, cw = 0] = coords.subarray(o, o + 9);
        const d = (bw - aw) * (cu - au) - (bu - au) * (cw - aw);
        if (Math.abs(d) < 1e-14) continue;
        const s = ((bw - aw) * (px - au) - (bu - au) * (pz - aw)) / d;
        const r = ((px - au) * (cw - aw) - (pz - aw) * (cu - au)) / -d;
        if (r < -1e-12 || s < -1e-12 || r + s > 1 + 1e-12) continue;
        if (Math.min(r, s, 1 - r - s) < EDGE) edge = true;
        met.push([ah + r * (bh - ah) + s * (ch - ah), Math.sign(d)]);
      }
      if (!edge) break;
    }
    met.sort((m, q) => q[0] - m[0]);
    let [winding, stretch, top] = [0, 0, 0];
    for (let k = 0; k < met.length; ) {
      const level = met[k]?.[0] ?? 0;
      for (; k < met.length && level - (met[k]?.[0] ?? 0) < 1e-6; k += 1) winding += met[k]?.[1] ?? 0;
      const next = met[k]?.[0];
      if (next !== undefined && winding < 0 && level - next > stretch) [stretch, top] = [level - next, level];
    }
    return { stretch, top, x: px, z: pz };
  };
  const lines: [number, number][] = [];
  for (let i = 0; i < cells; i += 1) for (let j = 0; j < cells; j += 1) lines.push([u0 + (i + OFF[0]) * du, w0 + (j + OFF[1]) * dw]);
  for (const [[pu, pw], [qu, qw]] of openEdges(coords)) {
    const length = Math.hypot(qu - pu, qw - pw);
    if (length < 1e-9) continue;
    const [nu, nw, mu, mw] = [-(qw - pw) / length, (qu - pu) / length, pu + ALONG * (qu - pu), pw + ALONG * (qw - pw)];
    lines.push([mu + BESIDE * nu, mw + BESIDE * nw], [mu - BESIDE * nu, mw - BESIDE * nw]);
  }
  let [found, worst] = [0, 0];
  let at: Vector3 | null = null;
  for (const [x, z] of lines) {
    const line = read(x, z);
    if (line.stretch <= 0) continue;
    found += 1;
    if (line.stretch <= worst) continue;
    worst = line.stretch;
    at = u.clone().multiplyScalar(line.x).addScaledVector(w, line.z).addScaledVector(vertical, line.top);
  }
  return { lines: found, worst, at };
}

/** The edges borne by an odd number of the triangles in `coords` (nine numbers each, in (u, height, w)), corners joined by position to a micrometre, across the lines. */
function openEdges(coords: Float64Array): [[number, number], [number, number]][] {
  const ids = new Map<string, number>();
  const place: [number, number][] = [];
  const id = (o: number): number => {
    const key = [o, o + 1, o + 2].map((k) => String(Math.round((coords[k] ?? 0) / WELD))).join(',');
    let n = ids.get(key);
    if (n === undefined) {
      ids.set(key, (n = ids.size));
      place.push([coords[o] ?? 0, coords[o + 2] ?? 0]);
    }
    return n;
  };
  const borne = new Map<string, [number, number, number]>();
  for (let o = 0; o + 8 < coords.length; o += 9) {
    const [a, b, c] = [id(o), id(o + 3), id(o + 6)];
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = p < q ? `${String(p)} ${String(q)}` : `${String(q)} ${String(p)}`;
      const edge = borne.get(key);
      if (edge === undefined) borne.set(key, [p, q, 1]);
      else edge[2] += 1;
    }
  }
  const out: [[number, number], [number, number]][] = [];
  for (const [p, q, n] of borne.values()) {
    const [pp, qq] = [place[p], place[q]];
    if (n % 2 === 1 && pp !== undefined && qq !== undefined) out.push([pp, qq]);
  }
  return out;
}
