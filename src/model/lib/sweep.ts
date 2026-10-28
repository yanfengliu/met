/**
 * Sweeps and lathes: a profile carried along a path with mitred corners, or around the Y axis.
 *
 * Sweep frame: at each path point the profile's d axis points right of travel seen from the `up` side (`n = t × up`) and its y axis along `up`.
 * With the default `up = +Y`, a path running +X carries a cornice whose front faces +Z, and a closed path wound counter-clockwise seen from above (−X,+Z → +X,+Z → +X,−Z → …) has its profile on the outside.
 * Path corners sharper than `creaseDeg` are mitred: both segments meet on the bisector plane, each keeps its own normals, so the mitre line stays crisp; gentler bends (a sampled arc) share vertices and shade smooth.
 */
import * as THREE from 'three';

import { MeshBuilder, type V2, type V3 } from './builder.js';
import { DEFAULT_CREASE_DEG, ringOf, type Profile } from './profile.js';

export interface SweepOptions {
  /** The path is a loop: its last point joins its first. Default false. */
  closed?: boolean;
  /** The profile's y axis; the path must lie in a plane perpendicular to it. Default +Y. */
  up?: V3;
  /** Path bends sharper than this (degrees) are mitred with a hard edge. Default 30. */
  pathCreaseDeg?: number;
  /** Profile bends sharper than this (degrees) keep a hard edge. Default 32. */
  profileCreaseDeg?: number;
  /** Cap the two ends of an open path with the profile polygon (closed profiles only). Default true. */
  caps?: boolean;
  /** Largest mitre stretch, so a near-reversal does not spike. Default 6. */
  maxMitre?: number;
}

interface Station {
  readonly p: THREE.Vector3;
  /** Mitre direction (unit, in the path plane). */
  readonly m: THREE.Vector3;
  /** Stretch of d along the mitre, 1 / cos(half the turn). */
  readonly scale: number;
  readonly smooth: boolean;
  readonly s: number;
}

function toVector(p: V3): THREE.Vector3 {
  return new THREE.Vector3(p[0], p[1], p[2]);
}

/** Path points with duplicates removed (and a repeated closing point dropped for loops). */
export function cleanPath(path: readonly V3[], closed: boolean): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const p of path) {
    const v = toVector(p);
    const last = out.at(-1);
    if (last === undefined || last.distanceTo(v) > 1e-9) out.push(v);
  }
  const first = out[0];
  const last = out.at(-1);
  if (closed && out.length > 2 && first !== undefined && last !== undefined && first.distanceTo(last) <= 1e-9) out.pop();
  return out;
}

function stations(points: readonly THREE.Vector3[], closed: boolean, up: THREE.Vector3, creaseDeg: number, maxMitre: number): Station[] {
  const n = points.length;
  const segCount = closed ? n : n - 1;
  const tangents: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  for (let k = 0; k < segCount; k++) {
    const a = points[k] ?? new THREE.Vector3();
    const b = points[(k + 1) % n] ?? new THREE.Vector3();
    const t = new THREE.Vector3().subVectors(b, a);
    t.addScaledVector(up, -t.dot(up));
    if (t.lengthSq() < 1e-18) throw new Error('sweep: a path segment is parallel to the up axis or has no length; every segment must run across the up axis.');
    t.normalize();
    tangents.push(t);
    normals.push(new THREE.Vector3().crossVectors(t, up).normalize());
  }
  const creaseCos = Math.cos((creaseDeg * Math.PI) / 180);
  const out: Station[] = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i] ?? new THREE.Vector3();
    if (i > 0) s += p.distanceTo(points[i - 1] ?? p);
    const kIn = i > 0 ? i - 1 : closed ? segCount - 1 : -1;
    const kOut = i < segCount ? i : -1;
    const nIn = kIn >= 0 ? normals[kIn] : undefined;
    const nOut = kOut >= 0 ? normals[kOut] : undefined;
    const tIn = kIn >= 0 ? tangents[kIn] : undefined;
    const tOut = kOut >= 0 ? tangents[kOut] : undefined;
    if (nIn !== undefined && nOut !== undefined && tIn !== undefined && tOut !== undefined) {
      const m = new THREE.Vector3().addVectors(nIn, nOut);
      if (m.lengthSq() < 1e-12) m.copy(nOut);
      m.normalize();
      const cosHalf = Math.max(m.dot(nOut), 1 / maxMitre);
      out.push({ p, m, scale: 1 / cosHalf, smooth: tIn.dot(tOut) >= creaseCos, s });
    } else {
      out.push({ p, m: (nIn ?? nOut ?? new THREE.Vector3(0, 0, 1)).clone(), scale: 1, smooth: false, s });
    }
  }
  return out;
}

/** Sweeps `profile` along `path` into `builder`. */
export function sweepInto(builder: MeshBuilder, profile: Profile, path: readonly V3[], options: SweepOptions = {}): void {
  const closed = options.closed === true;
  const up = toVector(options.up ?? [0, 1, 0]).normalize();
  const points = cleanPath(path, closed);
  if (points.length < 2) throw new Error(`sweep: the path has ${String(points.length)} distinct point(s); it needs at least 2.`);
  const ring = ringOf(profile, options.profileCreaseDeg ?? DEFAULT_CREASE_DEG);
  const st = stations(points, closed, up, options.pathCreaseDeg ?? 30, options.maxMitre ?? 6);
  const segCount = closed ? st.length : st.length - 1;
  foldProblem(st, closed, ring.verts, up);
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  // Ring vertex ids per station when that station is smooth (shared by both segments).
  const shared = new Map<number, number[]>();
  const emit = (station: Station, frameNormal: THREE.Vector3): number[] =>
    ring.verts.map((rv) => {
      position.copy(station.p).addScaledVector(station.m, rv.d * station.scale).addScaledVector(up, rv.y);
      normal.copy(frameNormal).multiplyScalar(rv.nd).addScaledVector(up, rv.ny);
      return builder.vertexAt(position, normal, station.s, rv.s);
    });
  for (let k = 0; k < segCount; k++) {
    const a = st[k];
    const b = st[(k + 1) % st.length];
    if (a === undefined || b === undefined) continue;
    const segNormal = new THREE.Vector3().subVectors(b.p, a.p);
    segNormal.addScaledVector(up, -segNormal.dot(up)).normalize();
    segNormal.crossVectors(segNormal, up).normalize();
    const ring0 = a.smooth ? (shared.get(k) ?? emit(a, a.m)) : emit(a, segNormal);
    if (a.smooth) shared.set(k, ring0);
    const kb = (k + 1) % st.length;
    const ring1 = b.smooth ? (shared.get(kb) ?? emit(b, b.m)) : emit(b, segNormal);
    if (b.smooth) shared.set(kb, ring1);
    for (const [i0, i1] of ring.edges) {
      builder.quad(ring0[i0] ?? 0, ring1[i0] ?? 0, ring1[i1] ?? 0, ring0[i1] ?? 0);
    }
  }
  if (!closed && profile.closed && options.caps !== false) {
    const first = st[0];
    const last = st.at(-1);
    if (first !== undefined && last !== undefined) {
      capInto(builder, profile.points, first, up, true);
      capInto(builder, profile.points, last, up, false);
    }
  }
}

/**
 * Refuses a path that bends tighter than the profile reaches across it: on the bend's inside, the profile's points from one station to the next would
 * run back along the segment, folding the surface through itself and turning a pocket of it inside out.
 */
function foldProblem(st: readonly Station[], closed: boolean, verts: readonly { readonly d: number }[], up: THREE.Vector3): void {
  const t = new THREE.Vector3();
  for (let k = 0; k < (closed ? st.length : st.length - 1); k++) {
    const a = st[k];
    const b = st[(k + 1) % st.length];
    if (a === undefined || b === undefined) continue;
    t.subVectors(b.p, a.p);
    t.addScaledVector(up, -t.dot(up));
    const length = t.length();
    t.divideScalar(length);
    // A ring point d across the path moves along the segment by its length, less what the mitres at its two ends take from it.
    const take = b.scale * b.m.dot(t) - a.scale * a.m.dot(t);
    for (const { d } of verts) {
      const advance = length + d * take;
      if (advance < 0) {
        throw new Error(
          `sweep: the path bends too tightly for the profile at points ${String(k)} and ${String((k + 1) % st.length)}: the profile's point ${d.toFixed(4)} across the path runs ${(-advance).toFixed(4)} m back along that ${length.toFixed(4)} m segment, folding the surface inside out; ease the bend, or keep the profile nearer the path on the bend's inside.`,
        );
      }
    }
  }
}

function capInto(builder: MeshBuilder, points: readonly V2[], station: Station, up: THREE.Vector3, start: boolean): void {
  // `planar` faces axisD × axisV. With axisD along n = t × up, n × up = −t: the start cap faces back along the path as it should;
  // the end cap mirrors y so that its axes are (n, −up) and it faces +t.
  const axisD = station.m.clone().multiplyScalar(station.scale);
  if (start) builder.planar(points, [], station.p, axisD, up.clone());
  else builder.planar(points.map(([d, y]) => [d, -y] as const), [], station.p, axisD, up.clone().negate());
}

/** A swept geometry on its own. */
export function sweep(profile: Profile, path: readonly V3[], options: SweepOptions = {}): THREE.BufferGeometry {
  const builder = new MeshBuilder();
  sweepInto(builder, profile, path, options);
  return builder.build();
}

export interface LatheOptions {
  /** Segments around the axis. */
  segments: number;
  /** Start angle in radians, measured from +X toward −Z (counter-clockwise seen from above). Default 0. */
  start?: number;
  /** Swept angle in radians. Default 2π (closed). */
  angle?: number;
  profileCreaseDeg?: number;
}

/**
 * Revolves a profile (d = radius ≥ 0, y = height) about the Y axis. Points at radius 0 close the surface there.
 * A full turn shares its seam, so it shades smooth all round.
 */
export function latheInto(builder: MeshBuilder, profile: Profile, options: LatheOptions): void {
  const ring = ringOf(profile, options.profileCreaseDeg ?? DEFAULT_CREASE_DEG);
  const total = options.angle ?? Math.PI * 2;
  const start = options.start ?? 0;
  const full = Math.abs(total - Math.PI * 2) < 1e-9;
  const segments = Math.max(3, Math.round(options.segments));
  const columns = full ? segments : segments + 1;
  const ids: number[][] = [];
  for (let c = 0; c < columns; c++) {
    const theta = start + (total * c) / segments;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    ids.push(ring.verts.map((rv) => builder.vertex(rv.d * cos, rv.y, -rv.d * sin, rv.nd * cos, rv.ny, -rv.nd * sin, c / segments, rv.s)));
  }
  for (let c = 0; c < segments; c++) {
    const col0 = ids[c] ?? [];
    const col1 = ids[(c + 1) % columns] ?? [];
    for (const [i0, i1] of ring.edges) {
      const a = col0[i0] ?? 0;
      const b = col1[i0] ?? 0;
      const cc = col1[i1] ?? 0;
      const d = col0[i1] ?? 0;
      const r0 = ring.verts[i0]?.d ?? 0;
      const r1 = ring.verts[i1]?.d ?? 0;
      // Skip the zero-area half of a quad that touches the axis.
      if (r0 < 1e-12) builder.triangle(a, cc, d);
      else if (r1 < 1e-12) builder.triangle(a, b, cc);
      else builder.quad(a, b, cc, d);
    }
  }
}

export function lathe(profile: Profile, options: LatheOptions): THREE.BufferGeometry {
  const builder = new MeshBuilder();
  latheInto(builder, profile, options);
  return builder.build();
}
