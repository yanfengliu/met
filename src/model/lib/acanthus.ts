/**
 * Carved ornament for capitals: acanthus leaves, scroll volutes and the abacus flower (fleuron).
 *
 * Each generator works in a local surface space and takes a `map` that places it, so the same leaf sits on a round bell (a column) or a flat one (a pilaster):
 * a point (s, y, o) is s metres across the surface (to the right seen from the front), y metres up and o metres out from the surface the ornament sits on.
 * Leaves are thin closed slabs where they stand free of the bell, so their curled tips look solid from above and below.
 */
import * as THREE from 'three';

import { polygonNormal, type MeshBuilder } from './builder.js';
import { sweepInto } from './sweep.js';
import type { Profile } from './profile.js';

export type SurfaceMap = (s: number, y: number, o: number) => THREE.Vector3;

export interface LeafShape {
  /** Widest breadth across the surface, metres. */
  readonly width: number;
  /** Height of the part that hugs the bell, metres. */
  readonly rise: number;
  /** Radius of the curled tip, metres. */
  readonly curl: number;
  /** Angle the tip turns through, radians (π/2 points straight out; more droops). */
  readonly turn: number;
  /** Thickness of the free tip, metres. */
  readonly thickness: number;
  /** How far the leaf's edges stand forward of its midrib, metres. */
  readonly cup: number;
  /** Base offset from the bell, metres, so overlapping rows never share a surface. */
  readonly lift: number;
  /** How far the leaf leans out from the bell by the top of its attached part, metres (a convex belly). */
  readonly belly: number;
  /** Height of the raised midrib, metres. */
  readonly rib: number;
}

export interface LeafResolution {
  /** Segments across (even). */
  readonly across: number;
  /** Rows on the attached part. */
  readonly attached: number;
  /** Rows on the curled tip. */
  readonly free: number;
}

/** Leaf breadth along its length t in [0, 1]: a narrow stem, broadest at about two thirds where it spreads before the tip curls, then pointed. */
const WIDTH_TABLE: readonly (readonly [number, number])[] = [
  [0, 0.78],
  [0.15, 0.84],
  [0.4, 0.9],
  [0.62, 1],
  [0.78, 0.82],
  [0.9, 0.48],
  [1, 0.08],
];

/** Half-width factor at t; odd rows step in a little, so the edge reads as lobes. */
function halfWidth(t: number, row: number, lobed: boolean): number {
  let w = 0.08;
  for (let k = 0; k + 1 < WIDTH_TABLE.length; k++) {
    const a = WIDTH_TABLE[k];
    const b = WIDTH_TABLE[k + 1];
    if (a === undefined || b === undefined) continue;
    if (t >= a[0] && t <= b[0]) w = a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
  }
  return lobed && row % 2 === 1 ? w * 0.86 : w;
}

/**
 * One acanthus leaf into `builder`, placed by `map`: a closed solid, its back riding on the bell where it is attached and a thin slab where the tip curls free,
 * so no view along the bell's silhouette sees through it.
 */
export function leafInto(builder: MeshBuilder, shape: LeafShape, res: LeafResolution, map: SurfaceMap): void {
  const rows = res.attached + res.free;
  const across = Math.max(2, res.across - (res.across % 2));
  const front: THREE.Vector3[][] = [];
  const back: THREE.Vector3[][] = [];
  const arc = shape.curl * shape.turn;
  const total = shape.rise + arc;
  for (let j = 0; j <= rows; j++) {
    // Arc length along the centreline: rows spread over the attached part, then over the curl.
    const along = j <= res.attached ? (shape.rise * j) / res.attached : shape.rise + (arc * (j - res.attached)) / res.free;
    const alpha = along <= shape.rise ? 0 : (along - shape.rise) / shape.curl;
    // The attached part leans out in a convex belly that ends vertical, where the curl takes over.
    const lean = shape.belly * Math.sin((Math.PI / 2) * Math.min(1, along / shape.rise));
    const cy = along <= shape.rise ? along : shape.rise + shape.curl * Math.sin(alpha);
    const co = shape.lift + lean + (along <= shape.rise ? 0 : shape.curl * (1 - Math.cos(alpha)));
    // The leaf front's normal in (y, o): +o on the bell, turning down as the tip curls out.
    const ny = -Math.sin(alpha);
    const no = Math.cos(alpha);
    const t = along / total;
    const half = (shape.width / 2) * halfWidth(t, j, j > 0 && j < rows);
    const frontRow: THREE.Vector3[] = [];
    const backRow: THREE.Vector3[] = [];
    for (let i = 0; i <= across; i++) {
      const u = (2 * i) / across - 1;
      const cupOffset = (shape.cup * (u * u - 0.3) + shape.rib * Math.max(0, 1 - 2 * Math.abs(u))) * Math.min(1, t * 3);
      const s = u * half;
      frontRow.push(map(s, cy + ny * cupOffset, co + no * cupOffset));
      if (j < res.attached) backRow.push(map(s * 0.92, cy, shape.lift * 0.4));
      else backRow.push(map(s, cy + ny * (cupOffset - shape.thickness), co + no * (cupOffset - shape.thickness)));
    }
    front.push(frontRow);
    back.push(backRow);
  }
  builder.grid(front);
  builder.grid(back, { flip: true });
  // Rims: left edge, right edge, tip and foot.
  for (let j = 0; j < rows; j++) {
    const f0 = front[j];
    const f1 = front[j + 1];
    const b0 = back[j];
    const b1 = back[j + 1];
    if (f0 === undefined || f1 === undefined || b0 === undefined || b1 === undefined) continue;
    rim(builder, [f0[0], f1[0], b1[0], b0[0]]);
    rim(builder, [f0[across], b0[across], b1[across], f1[across]]);
  }
  const tipFront = front[rows];
  const tipBack = back[rows];
  const footFront = front[0];
  const footBack = back[0];
  for (let i = 0; i < across; i++) {
    if (tipFront !== undefined && tipBack !== undefined) rim(builder, [tipFront[i], tipFront[i + 1], tipBack[i + 1], tipBack[i]]);
    if (footFront !== undefined && footBack !== undefined) rim(builder, [footFront[i + 1], footFront[i], footBack[i], footBack[i + 1]]);
  }
}

function rim(builder: MeshBuilder, quad: readonly (THREE.Vector3 | undefined)[]): void {
  const points = quad.filter((p): p is THREE.Vector3 => p !== undefined);
  if (points.length === 4 && polygonNormal(points).lengthSq() > 0) builder.polygon(points);
}

/** Points of a flat spiral: from `start` (angle, radians) winding `turns` times inward, radius shrinking from r0 to r1. */
export function spiral(cx: number, cy: number, r0: number, r1: number, start: number, turns: number, steps: number, clockwise: boolean): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const f = k / steps;
    const angle = start + (clockwise ? -1 : 1) * f * turns * Math.PI * 2;
    const r = r0 * Math.pow(r1 / r0, f);
    out.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return out;
}

/**
 * A scroll (volute or helix) as a ribbon swept along a planar path.
 * `path` is in the plane's own (a, b) coordinates; `toWorld` maps them; `planeNormal` is the plane's normal in world space.
 * The ribbon is `width` across the plane and `thickness` within it.
 */
export function scrollInto(
  builder: MeshBuilder,
  path: readonly (readonly [number, number])[],
  toWorld: (a: number, b: number) => THREE.Vector3,
  planeNormal: THREE.Vector3,
  width: number,
  thickness: number,
): void {
  const section: Profile = {
    closed: true,
    points: [
      [-thickness / 2, -width / 2],
      [thickness / 2, -width / 2],
      [thickness / 2, width / 2],
      [-thickness / 2, width / 2],
    ],
  };
  const world = path.map(([a, b]) => toWorld(a, b).toArray());
  sweepInto(builder, section, world, { up: planeNormal.toArray(), pathCreaseDeg: 50 });
}

/** A disc (the eye of a volute, a button) facing `normal`, of `radius` and `depth`, centred at `centre`. */
export function discInto(builder: MeshBuilder, centre: THREE.Vector3, normal: THREE.Vector3, radius: number, depth: number, segments: number): void {
  const n = normal.clone().normalize();
  const helper = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(helper, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const ring = (offset: number, r: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * Math.PI * 2;
      points.push(centre.clone().addScaledVector(n, offset).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r));
    }
    return points;
  };
  const top = ring(depth / 2, radius);
  const bottom = ring(-depth / 2, radius);
  builder.polygon(top);
  builder.polygon([...bottom].reverse());
  for (let k = 0; k < segments; k++) {
    const k1 = (k + 1) % segments;
    const a = bottom[k];
    const b = bottom[k1];
    const c = top[k1];
    const d = top[k];
    if (a !== undefined && b !== undefined && c !== undefined && d !== undefined) builder.polygon([a, b, c, d]);
  }
}

/**
 * The abacus flower: a domed rosette of `petals` rounded petals facing `normal`, centred at `centre`, `radius` across and `depth` deep (its back at centre − normal·depth/2), with a boss in the middle.
 */
export function fleuronInto(builder: MeshBuilder, centre: THREE.Vector3, normal: THREE.Vector3, radius: number, depth: number, petals: number): void {
  const n = normal.clone().normalize();
  const helper = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(helper, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const around = petals * 3;
  // Rings from the rim (scalloped, at the back) to the boss (forward), as (radius share, depth share).
  const rings: readonly (readonly [number, number])[] = [
    [1, -0.5],
    [0.98, 0.05],
    [0.62, 0.3],
    [0.3, 0.32],
    [0.22, 0.48],
    [0, 0.5],
  ];
  const rows = rings.map(([share, forward], k) => {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2;
      const lobe = k <= 2 ? 0.78 + 0.22 * Math.abs(Math.cos((a * petals) / 2)) : 1;
      const r = radius * share * lobe;
      row.push(centre.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).addScaledVector(n, depth * forward));
    }
    return row;
  });
  builder.grid(rows, { wrapU: true });
}
