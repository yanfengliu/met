/**
 * Arch elements for a wall face: archivolt, voussoir ring, keystone and spandrel panels.
 *
 * Units metres. Origin at the centre of the springing line on the wall face: the arch's intrados springs from (±span/2, 0, 0); everything projects toward +Z from z = 0.
 * `rise` is the intrados height above the springing: span/2 for a round arch (the default), less for a segmental one.
 */
import * as THREE from 'three';

import { MeshBuilder, type V2, type V3 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, integer, positive, require, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { sweepInto } from './sweep.js';

interface Circle {
  /** Centre height relative to the springing line (≤ 0). */
  readonly cy: number;
  readonly radius: number;
  /** Half the angle the intrados subtends, radians. */
  readonly half: number;
}

function circleOf(span: number, rise: number): Circle {
  const w = span / 2;
  const radius = (w * w + rise * rise) / (2 * rise);
  return { cy: rise - radius, radius, half: Math.asin(Math.min(1, w / radius)) };
}

function checkArch(part: string, span: number, rise: number): void {
  positive(part, 'span', span);
  positive(part, 'rise', rise);
  require(part, rise <= span / 2 + 1e-9, `rise ${String(rise)} is more than half the span ${String(span)}; use at most ${String(span / 2)} (a round arch).`);
}

/** Points along the intrados from the right springing over the crown to the left, at radius `radius + offset` about the arch centre. */
function arcPoints(c: Circle, offset: number, steps: number): V3[] {
  const out: V3[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = Math.PI / 2 - c.half + (2 * c.half * k) / steps;
    out.push([(c.radius + offset) * Math.cos(a), c.cy + (c.radius + offset) * Math.sin(a), 0]);
  }
  return out;
}

export interface ArchivoltParams {
  span: number;
  /** Default span / 2 (round). */
  rise?: number;
  /** Radial width of the band, metres. Default span / 9. */
  band?: number;
  /** Projection from the wall face, metres. Default band / 3. */
  projection?: number;
  detail?: Detail;
}

/** The moulded band round an arch: fasciae stepping out with a cyma at the outer edge. Its inner edge is the intrados. */
export function archivolt(params: ArchivoltParams): THREE.BufferGeometry {
  const span = params.span;
  const rise = params.rise ?? span / 2;
  checkArch('archivolt', span, rise);
  const band = positive('archivolt', 'band', params.band ?? span / 9);
  const full = { span, rise, band, projection: positive('archivolt', 'projection', params.projection ?? band / 3), detail: checkDetail('archivolt', params.detail ?? 'medium') };
  return cached('archivolt', full, () => {
    const c = circleOf(full.span, full.rise);
    const b = full.band;
    const p = full.projection;
    const n = byDetail(full.detail, [2, 3, 5]);
    // (d radial out from the intrados, y out from the wall), counter-clockwise.
    const profile: Profile = new ProfilePen(0, 0)
      .to(b, 0)
      .to(b, 0.5 * p)
      .cyma(-0.16 * b, 0.5 * p, 'reversa', n)
      .to(0.62 * b, p)
      .to(0.6 * b, 0.86 * p)
      .to(0.32 * b, 0.86 * p)
      .to(0.3 * b, 0.74 * p)
      .to(0, 0.74 * p)
      .close();
    const builder = new MeshBuilder();
    const steps = Math.max(4, Math.round(byDetail(full.detail, [12, 24, 40]) * (c.half / (Math.PI / 2))));
    sweepInto(builder, profile, arcPoints(c, 0, steps), { up: [0, 0, 1] });
    return builder.build();
  });
}

export interface VoussoirParams {
  span: number;
  rise?: number;
  /** Radial depth of the ring, metres. Default span / 7. */
  depth?: number;
  /** Odd number of stones, keystone included. Default 13. */
  count?: number;
  /** Projection from the wall, metres. Default 0.06. */
  projection?: number;
  /** Width of the open joint between stones, metres. Default 0.015. */
  joint?: number;
  /** Make the middle stone a keystone: taller and projecting further. Default true. */
  keystone?: boolean;
}

/** A ring of wedge-shaped voussoirs round the intrados, with open joints; the middle one a keystone when asked. */
export function voussoirs(params: VoussoirParams): THREE.BufferGeometry {
  const span = params.span;
  const rise = params.rise ?? span / 2;
  checkArch('voussoirs', span, rise);
  const full = {
    span,
    rise,
    depth: positive('voussoirs', 'depth', params.depth ?? span / 7),
    count: integer('voussoirs', 'count', params.count ?? 13, 3, 61),
    projection: positive('voussoirs', 'projection', params.projection ?? 0.06),
    joint: positive('voussoirs', 'joint', params.joint ?? 0.015),
    keystone: params.keystone ?? true,
  };
  require('voussoirs', full.count % 2 === 1, `count is ${String(full.count)}; use an odd number so one stone sits on the crown.`);
  return cached('voussoirs', full, () => {
    const c = circleOf(full.span, full.rise);
    const b = new MeshBuilder();
    const step = (2 * c.half) / full.count;
    const middle = (full.count - 1) / 2;
    for (let k = 0; k < full.count; k++) {
      const key = full.keystone && k === middle;
      const gap = full.joint / 2 / c.radius;
      const a0 = Math.PI / 2 - c.half + k * step + gap;
      const a1 = Math.PI / 2 - c.half + (k + 1) * step - gap;
      const r0 = c.radius;
      const r1 = c.radius + full.depth * (key ? 1.3 : 1);
      const z = full.projection * (key ? 1.8 : 1);
      const corner = (r: number, a: number, zz: number): THREE.Vector3 => new THREE.Vector3(r * Math.cos(a), c.cy + r * Math.sin(a), zz);
      // Counter-clockwise seen from the front: along the intrados toward the right, out, back along the extrados.
      wedgeInto(b, [corner(r0, a1, 0), corner(r0, a0, 0), corner(r1, a0, 0), corner(r1, a1, 0)], z);
    }
    return b.build();
  });
}

/** A prism from a counter-clockwise (seen from +Z) quad at z = 0 out to z = depth, without its back face (it lies on the wall). */
function wedgeInto(b: MeshBuilder, base: readonly THREE.Vector3[], depth: number): void {
  const front = base.map((p) => p.clone().setZ(p.z + depth));
  b.polygon(front);
  for (let k = 0; k < base.length; k++) {
    const p0 = base[k];
    const p1 = base[(k + 1) % base.length];
    const q0 = front[k];
    const q1 = front[(k + 1) % front.length];
    if (p0 !== undefined && p1 !== undefined && q0 !== undefined && q1 !== undefined) b.polygon([p0, p1, q1, q0]);
  }
}

export interface KeystoneParams {
  /** Width at the intrados, metres. Default 0.45. */
  width?: number;
  /** Height, metres. Default 2.2 × width. */
  height?: number;
  /** Widening of the top over the bottom, as a share of the width. Default 0.35. */
  taper?: number;
  /** Projection from the wall, metres. Default 0.35 × width. */
  projection?: number;
}

/** A tapered keystone with a raised face panel and a small cap. Origin at its bottom centre on the wall face (the crown of the intrados). */
export function keystone(params: KeystoneParams = {}): THREE.BufferGeometry {
  const width = positive('keystone', 'width', params.width ?? 0.45);
  const full = { width, height: positive('keystone', 'height', params.height ?? width * 2.2), taper: params.taper ?? 0.35, projection: positive('keystone', 'projection', params.projection ?? width * 0.35) };
  require('keystone', full.taper >= 0 && full.taper <= 1.5, `taper is ${String(full.taper)}; use 0 to 1.5.`);
  return cached('keystone', full, () => {
    const b = new MeshBuilder();
    const w0 = full.width / 2;
    const w1 = w0 * (1 + full.taper);
    const h = full.height;
    const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);
    wedgeInto(b, [v(-w0, 0), v(w0, 0), v(w1, h * 0.86), v(-w1, h * 0.86)], full.projection);
    // Cap block across the top, projecting a little further.
    const capW = w1 * 1.08;
    wedgeInto(b, [v(-capW, h * 0.86), v(capW, h * 0.86), v(capW, h), v(-capW, h)], full.projection * 1.15);
    // A raised panel on the face.
    const inset = full.width * 0.14;
    const panel = [
      new THREE.Vector3(-w0 + inset, inset, full.projection),
      new THREE.Vector3(w0 - inset, inset, full.projection),
      new THREE.Vector3(w1 - inset, h * 0.86 - inset, full.projection),
      new THREE.Vector3(-w1 + inset, h * 0.86 - inset, full.projection),
    ];
    wedgeInto(b, panel, full.width * 0.05);
    return b.build();
  });
}

export interface SpandrelParams {
  span: number;
  rise?: number;
  /** Radial width of the archivolt the panels clear, metres. Default span / 9. */
  band?: number;
  /** Width of the bay framing the arch, metres. Default span + 2 × band + 0.6. */
  width?: number;
  /** Height of the bay above the springing, metres. Default rise + band + 0.6. */
  height?: number;
  /** Panel projection from the wall, metres. Default 0.04. */
  projection?: number;
  /** Margin left round each panel, metres. Default 0.1. */
  inset?: number;
  detail?: Detail;
}

/** The two spandrel panels between an arch's extrados and its rectangular bay: raised panels left and right of the crown. */
export function spandrel(params: SpandrelParams): THREE.BufferGeometry {
  const span = params.span;
  const rise = params.rise ?? span / 2;
  checkArch('spandrel', span, rise);
  const band = positive('spandrel', 'band', params.band ?? span / 9);
  const full = {
    span,
    rise,
    band,
    width: positive('spandrel', 'width', params.width ?? span + 2 * band + 0.6),
    height: positive('spandrel', 'height', params.height ?? rise + band + 0.6),
    projection: positive('spandrel', 'projection', params.projection ?? 0.04),
    inset: positive('spandrel', 'inset', params.inset ?? 0.1),
    detail: checkDetail('spandrel', params.detail ?? 'medium'),
  };
  require('spandrel', full.height > full.rise + full.band + 2 * full.inset, `height ${String(full.height)} leaves no room above the archivolt (rise + band = ${String(full.rise + full.band)}).`);
  return cached('spandrel', full, () => {
    const c = circleOf(full.span, full.rise);
    const R = c.radius + full.band + full.inset;
    const top = full.height - full.inset;
    const outer = full.width / 2 - full.inset;
    const gap = full.inset;
    const steps = byDetail(full.detail, [6, 12, 20]);
    const b = new MeshBuilder();
    for (const side of [1, -1]) {
      // Right panel, counter-clockwise seen from the front: along the extrados from the bay side toward the crown, up, back along the top.
      const outline: V2[] = [];
      const yAt = (x: number): number => (Math.abs(x) < R ? c.cy + Math.sqrt(R * R - x * x) : 0);
      const xs: number[] = [];
      for (let k = 0; k <= steps; k++) xs.push(outer - ((outer - gap) * k) / steps);
      for (const x of xs) outline.push([x, Math.max(full.inset, yAt(x))]);
      outline.push([gap, top]);
      outline.push([outer, top]);
      const ordered = side > 0 ? outline.reverse() : outline.map(([x, y]) => [-x, y] as V2);
      panelInto(b, ordered, full.projection);
    }
    return b.build();
  });
}

/** A flat raised panel from an outline in the wall plane (either winding), out to z = depth, without a back. */
function panelInto(b: MeshBuilder, outline: readonly V2[], depth: number): void {
  const ccw = outline.reduce((sum, p, k) => {
    const q = outline[(k + 1) % outline.length] ?? p;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0) > 0;
  const loop = ccw ? [...outline] : [...outline].reverse();
  b.planar(loop, [], new THREE.Vector3(0, 0, depth), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  for (let k = 0; k < loop.length; k++) {
    const p = loop[k];
    const q = loop[(k + 1) % loop.length];
    if (p === undefined || q === undefined) continue;
    b.polygon([new THREE.Vector3(p[0], p[1], 0), new THREE.Vector3(q[0], q[1], 0), new THREE.Vector3(q[0], q[1], depth), new THREE.Vector3(p[0], p[1], depth)]);
  }
}
