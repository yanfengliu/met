/**
 * Which way the closed parts of a geometry face: a part wound inside out holds its inside in front of its faces, which back-face culling draws from
 * inside and the section cut's cap pass reads as outside (docs/design/spec.md, Build-step API: Solids and sheets).
 * A part is the triangles that share corners, joined by position to a micrometre, so two solids touching at one corner are one part. Along a unit
 * direction v its volume is, by the divergence theorem,
 * the sum over its faces of each face's centroid height along v times its signed area across v: positive wound outward, negative inside out, and the
 * same wherever heights are measured from once its faces looking up and looking down cover equal areas across v, as on a part closed along v. The parts
 * that close along v only together are read as one; parts that do not close even then are left to the closure check (`openAlong`, ./check.ts).
 * Bound: a part reads as one sign in all, so a pocket of it wound inside out, where its surface folds through itself, leaves a positive sum and is not
 * seen; of the parts that close only together, one wound inside out among outward ones can pass. `inwardAlong` reads the pockets, on a grid of lines.
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
  /** The most rounding can put the volume out by: its unmatched area across v times its height along v, and a part in a billion of its terms' sum. */
  readonly noise: number;
  /** How many welded parts it is: 1, or more for the parts that close only together. */
  readonly parts: number;
  /** One of its corners, in the geometry's frame. */
  readonly at: Vector3;
}

/** One part's sums: its signed area across v, that area unsigned, its volume with heights from its lowest corner, that volume's terms unsigned, and its lowest and highest corner. */
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
  // Heights from each part's lowest corner, so rounding in its unmatched area costs no more than its own height.
  const tallies = new Map<number, Tally>();
  for (let k = 0; k < count; k += 1) {
    const h = p.fromBufferAttribute(position, corner(k)).dot(vertical);
    const r = root(id[k] ?? 0);
    const tally = tallies.get(r);
    if (tally === undefined) tallies.set(r, { across: 0, total: 0, volume: 0, terms: 0, low: h, high: h, at: p.clone() });
    else [tally.low, tally.high] = [Math.min(tally.low, h), Math.max(tally.high, h)];
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
    const term = ((a.dot(vertical) + b.dot(vertical) + c.dot(vertical)) / 3 - tally.low) * across;
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
    // The parts that close only together, their heights all from the lowest of their corners.
    const low = Math.min(...open.map((t) => t.low));
    const high = Math.max(...open.map((t) => t.high));
    const across = open.reduce((sum, t) => sum + t.across, 0);
    const total = open.reduce((sum, t) => sum + t.total, 0);
    const volume = open.reduce((sum, t) => sum + t.volume + (t.low - low) * t.across, 0);
    const terms = open.reduce((sum, t) => sum + t.terms + Math.abs((t.low - low) * t.across), 0);
    if (closes(across, total)) out.push({ volume, noise: noise(across, high - low, terms), parts: open.length, at: first.at });
  }
  return out;
}

/**
 * Where in its cell each of `inwardAlong`'s lines stands, across u and across w: irrational shares whose sum and difference are no simple fraction
 * either, so the lines miss a cell's edges and both its diagonals (shares summing to 1 put ten of a hundred lines on the diagonals boxes are split along).
 */
const OFF = [0.5 + 1 / (4 * Math.PI), 0.5 - 1 / (2 * Math.E)] as const;

/** What a grid of lines finds wound inside out: how many lines cross a stretch of it, the longest stretch, and the top of that stretch. */
export interface InwardStretch {
  readonly lines: number;
  /** In the geometry's own units. */
  readonly worst: number;
  /** In the geometry's frame; null when no line finds any. */
  readonly at: Vector3 | null;
}

/**
 * Where `geometry` is wound inside out along `vertical` (a unit direction in its frame): on a grid of `cells` × `cells` lines along it, spread over the
 * geometry's bounds across it, each stretch of a line where more of its faces look down than up above it, as in a pocket whose surface folds through
 * itself. Each line stands off its cell's centre by an irrational share of the cell (OFF), so no line runs along an edge of a model laid out in round
 * measures, where it would meet both triangles sharing the edge; hits at one height are read together.
 * Bound: it sees a stretch only under one of its lines, so a fold narrower across the lines than a cell can be missed; a line that meets an edge after all
 * counts both triangles there.
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
  const [du, dw] = [(u1 - u0) / cells, (w1 - w0) / cells];
  const hits: { h: number; facing: number }[][] = Array.from({ length: cells * cells }, () => []);
  const span = (lo: number, hi: number, origin: number, step: number, off: number): [number, number] => [Math.max(0, Math.ceil((lo - origin) / step - off)), Math.min(cells - 1, Math.floor((hi - origin) / step - off))];
  const line = (i: number, j: number): [number, number] => [u0 + (i + OFF[0]) * du, w0 + (j + OFF[1]) * dw];
  for (let o = 0; o + 8 < coords.length; o += 9) {
    const [au, ah, aw, bu, bh, bw, cu, ch, cw] = Array.from(coords.subarray(o, o + 9));
    if (au === undefined || ah === undefined || aw === undefined || bu === undefined || bh === undefined || bw === undefined || cu === undefined || ch === undefined || cw === undefined) continue;
    const d = (bw - aw) * (cu - au) - (bu - au) * (cw - aw);
    if (Math.abs(d) < 1e-14) continue;
    const [i0, i1] = span(Math.min(au, bu, cu), Math.max(au, bu, cu), u0, du, OFF[0]);
    const [j0, j1] = span(Math.min(aw, bw, cw), Math.max(aw, bw, cw), w0, dw, OFF[1]);
    for (let i = i0; i <= i1; i += 1) {
      for (let j = j0; j <= j1; j += 1) {
        const [x, z] = line(i, j);
        const s = ((bw - aw) * (x - au) - (bu - au) * (z - aw)) / d;
        const r = ((x - au) * (cw - aw) - (z - aw) * (cu - au)) / -d;
        if (r < -1e-12 || s < -1e-12 || r + s > 1 + 1e-12) continue;
        hits[i * cells + j]?.push({ h: ah + r * (bh - ah) + s * (ch - ah), facing: Math.sign(d) });
      }
    }
  }
  let [lines, worst] = [0, 0];
  let at: Vector3 | null = null;
  hits.forEach((met, cell) => {
    met.sort((m, q) => q.h - m.h);
    let [winding, inward, top] = [0, 0, 0];
    for (let k = 0; k < met.length; ) {
      const level = met[k]?.h ?? 0;
      for (; k < met.length && level - (met[k]?.h ?? 0) < 1e-6; k += 1) winding += met[k]?.facing ?? 0;
      const next = met[k]?.h;
      if (next !== undefined && winding < 0) {
        if (level - next > inward) top = level;
        inward = Math.max(inward, level - next);
      }
    }
    if (inward <= 0) return;
    lines += 1;
    if (inward <= worst) return;
    worst = inward;
    const [x, z] = line(Math.floor(cell / cells), cell % cells);
    at = u.clone().multiplyScalar(x).addScaledVector(w, z).addScaledVector(vertical, top);
  });
  return { lines, worst, at };
}
