/**
 * Domes and vaults: hemispherical and saucer domes with an optional oculus and ribs, the drum they stand on, pendentives that carry a dome over a square bay, and barrel vaults with optional coffers.
 *
 * Units metres. Domes and drums: origin at the centre of the springing circle (the dome's inner edge springs from radius `radius` at y = 0), axis +Y.
 * Pendentives: origin at the bay centre on the springing line of its four arches; the dome ring they carry is at y = span / 2 with radius span / 2.
 * Barrel vault: axis along Z, origin at the centre of the springing line, the intrados springing from x = ±span/2 at y = 0, z from −length/2 to length/2.
 * Interior (intrados) faces look inward and down, exterior faces outward and up, so each reads from both sides.
 */
import * as THREE from 'three';

import { MeshBuilder } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, integer, nonNegative, positive, require, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

export interface DomeParams {
  /** Inner springing radius, metres. */
  radius: number;
  /** Inner height of the crown above the springing, metres. Default radius (a hemisphere); less gives a saucer dome. */
  rise?: number;
  /** Shell thickness, metres. Default radius / 15. */
  thickness?: number;
  /** Radius of an open oculus at the crown, metres. Default 0 (closed). */
  oculus?: number;
  /** Meridian ribs on the outside, or none. Default none. */
  ribs?: { count: number; width?: number; depth?: number } | false;
  /** Put the ribs on the inside instead. Default false. */
  ribsInside?: boolean;
  detail?: Detail;
}

interface Sphere {
  readonly rho: number;
  /** Centre height (≤ rise). */
  readonly cy: number;
}

function sphereOf(radius: number, rise: number): Sphere {
  const rho = (radius * radius + rise * rise) / (2 * rise);
  return { rho, cy: rise - rho };
}

export function dome(params: DomeParams): THREE.BufferGeometry {
  const radius = positive('dome', 'radius', params.radius);
  const rise = positive('dome', 'rise', params.rise ?? radius);
  require('dome', rise <= radius + 1e-9, `rise ${String(rise)} is more than the radius ${String(radius)}; a dome rises at most its radius (a hemisphere).`);
  const ribs = params.ribs === undefined || params.ribs === false ? null : { count: integer('dome', 'ribs.count', params.ribs.count, 3, 64), width: positive('dome', 'ribs.width', params.ribs.width ?? radius / 25), depth: positive('dome', 'ribs.depth', params.ribs.depth ?? radius / 30) };
  const full = {
    radius,
    rise,
    thickness: positive('dome', 'thickness', params.thickness ?? radius / 15),
    oculus: nonNegative('dome', 'oculus', params.oculus ?? 0),
    ribs,
    ribsInside: params.ribsInside ?? false,
    detail: checkDetail('dome', params.detail ?? 'medium'),
  };
  require('dome', full.oculus < radius * 0.8, `oculus ${String(full.oculus)} must be under 0.8 of the radius ${String(radius)}.`);
  return cached('dome', full, () => {
    const s = sphereOf(full.radius, full.rise);
    const outer = s.rho + full.thickness;
    const steps = byDetail(full.detail, [8, 16, 28]);
    // Angles from the vertical: springing at phi0, crown or oculus at phi1.
    const phi0 = Math.asin(Math.min(1, full.radius / s.rho));
    const phi1 = full.oculus > 0 ? Math.asin(full.oculus / s.rho) : 0;
    const at = (r: number, phi: number): [number, number] => [r * Math.sin(phi), s.cy + r * Math.cos(phi)];
    // Outer surface springs at y = 0 too.
    const outerPhi0 = Math.acos(Math.max(-1, Math.min(1, -s.cy / outer)));
    const pen = new ProfilePen(...at(outer, outerPhi0));
    for (let k = 1; k <= steps; k++) pen.to(...at(outer, outerPhi0 + ((phi1 - outerPhi0) * k) / steps));
    if (full.oculus > 0) pen.to(...at(s.rho, phi1));
    else pen.to(0, s.cy + s.rho);
    for (let k = 1; k <= steps; k++) pen.to(...at(s.rho, phi1 + ((phi0 - phi1) * k) / steps));
    const b = new MeshBuilder();
    latheInto(b, pen.close(), { segments: byDetail(full.detail, [16, 40, 72]) });
    if (full.ribs !== null) {
      const r = full.ribsInside ? s.rho : outer;
      const sign = full.ribsInside ? -1 : 1;
      const section: Profile = { closed: true, points: [[0, -full.ribs.width / 2], [full.ribs.depth, -full.ribs.width / 2], [full.ribs.depth, full.ribs.width / 2], [0, full.ribs.width / 2]] };
      for (let k = 0; k < full.ribs.count; k++) {
        const theta = (k / full.ribs.count) * Math.PI * 2;
        const out = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
        const side = new THREE.Vector3(0, 1, 0).cross(out).normalize();
        // An inside rib starts where its section clears the springing plane.
        const start = full.ribsInside ? Math.acos(Math.min(1, (full.ribs.depth * 1.2 - s.cy) / s.rho)) : outerPhi0;
        const end = Math.max(phi1, 0.04);
        const path: [number, number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const phi = start + ((end - start) * i) / steps;
          const [rr, y] = at(r - (sign < 0 ? 0.002 : -0.002), phi);
          path.push([out.x * rr, y, out.z * rr]);
        }
        // Running up from the springing, right of travel (t × side) points into the dome: an inside rib keeps the section, an outside one mirrors it outward.
        const ribSection: Profile = sign < 0 ? section : { closed: true, points: section.points.map(([d, y]) => [-d, y] as const).reverse() };
        sweepInto(b, ribSection, path, { up: side.toArray(), pathCreaseDeg: 40 });
      }
    }
    return b.build();
  });
}

export interface DrumParams {
  /** Inner radius, metres. */
  radius: number;
  height: number;
  /** Wall thickness, metres. Default radius / 10. */
  thickness?: number;
  /** A moulded band round the top. Default true. */
  cornice?: boolean;
  detail?: Detail;
}

/** A cylindrical drum, inner radius `radius`, with an optional cornice band at its top. Origin at the bottom centre. */
export function drum(params: DrumParams): THREE.BufferGeometry {
  const radius = positive('drum', 'radius', params.radius);
  const full = { radius, height: positive('drum', 'height', params.height), thickness: positive('drum', 'thickness', params.thickness ?? radius / 10), cornice: params.cornice ?? true, detail: checkDetail('drum', params.detail ?? 'medium') };
  return cached('drum', full, () => {
    const r0 = full.radius;
    const r1 = r0 + full.thickness;
    const h = full.height;
    const c = Math.min(h * 0.12, full.thickness * 1.2);
    const pen = new ProfilePen(r1, 0).to(r1, h - (full.cornice ? c : 0));
    if (full.cornice) pen.quarter(c * 0.5, c * 0.6, true, byDetail(full.detail, [2, 3, 5])).to(r1 + c * 0.5, h);
    pen.to(r0, h).to(r0, 0);
    const b = new MeshBuilder();
    latheInto(b, pen.close(), { segments: byDetail(full.detail, [16, 40, 72]) });
    return b.build();
  });
}

export interface PendentiveParams {
  /** Side of the square bay, metres. */
  span: number;
  detail?: Detail;
}

/**
 * Four pendentives: spherical triangles between the four arches of a square bay, rising from the bay corners at y = 0 to a ring of radius span/2 at y = span/2.
 * Their curved faces look into the bay; their tops and their outer faces (in the bay's side planes x, z = ±span/2, above the arches) close the solid.
 */
export function pendentives(params: PendentiveParams): THREE.BufferGeometry {
  const full = { span: positive('pendentives', 'span', params.span), detail: checkDetail('pendentives', params.detail ?? 'medium') };
  return cached('pendentives', full, () => {
    const s = full.span / 2;
    const R = s * Math.SQRT2;
    const across = byDetail(full.detail, [6, 12, 20]);
    const up = byDetail(full.detail, [4, 8, 12]);
    const b = new MeshBuilder();
    for (let corner = 0; corner < 4; corner++) {
      const centre = Math.PI / 4 + (corner * Math.PI) / 2;
      const rows: THREE.Vector3[][] = [];
      for (let j = 0; j <= up; j++) {
        const v = j / up;
        const row: THREE.Vector3[] = [];
        for (let i = 0; i <= across; i++) {
          const theta = centre - Math.PI / 4 + (Math.PI / 2) * (i / across);
          const wall = s / Math.max(Math.abs(Math.cos(theta)), Math.abs(Math.sin(theta)));
          const rho = wall + (s - wall) * v;
          const y = Math.sqrt(Math.max(0, R * R - rho * rho));
          row.push(new THREE.Vector3(rho * Math.cos(theta), y, -rho * Math.sin(theta)));
        }
        rows.push(row);
      }
      b.grid(rows, { flip: true });
    }
    // Top: the square at y = s minus the ring, as four corner pieces.
    const ring = byDetail(full.detail, [6, 12, 20]);
    for (let corner = 0; corner < 4; corner++) {
      const centre = Math.PI / 4 + (corner * Math.PI) / 2;
      const outline: [number, number][] = [];
      const cornerPoint: [number, number] = [Math.SQRT2 * s * Math.cos(centre), -Math.SQRT2 * s * Math.sin(centre)];
      for (let i = 0; i <= ring; i++) {
        const theta = centre - Math.PI / 4 + (Math.PI / 2) * (i / ring);
        outline.push([s * Math.cos(theta), -s * Math.sin(theta)]);
      }
      outline.push(cornerPoint);
      b.planar(outline.map(([x, z]) => [x, -z] as const), [], new THREE.Vector3(0, s, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1));
    }
    // Outer faces in the four side planes, between each arch and y = s.
    for (let side = 0; side < 4; side++) {
      const angle = (side * Math.PI) / 2;
      const outward = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
      const along = new THREE.Vector3(0, 1, 0).cross(outward);
      // Two spandrels above the arch, left and right of its crown, each counter-clockwise in (along, up). Their arch runs through the points where the
      // curved faces' first row meets this plane (at tan θ of the way out, for that row's angles θ round the bay's axis), so the two share their edges.
      const arch = Array.from({ length: across / 2 + 1 }, (_, k): [number, number] => {
        const t = Math.tan((Math.PI / 2) * (k / across));
        return [s * t, s * Math.sqrt(Math.max(0, 1 - t * t))];
      });
      for (const sign of [-1, 1]) {
        const outline: [number, number][] = sign < 0 ? [...arch].reverse().map(([x, y]): [number, number] => [-x, y]) : [...arch];
        outline.push([sign * s, s]);
        b.planar(outline, [], outward.clone().multiplyScalar(s), along, new THREE.Vector3(0, 1, 0));
      }
    }
    return b.build();
  });
}

export interface BarrelVaultParams {
  span: number;
  length: number;
  /** Intrados rise, metres. Default span / 2 (semicircular). */
  rise?: number;
  /** Shell thickness, metres. Default span / 20. */
  thickness?: number;
  /** Coffers on the intrados, or none. Default none. `rib` is the width between two openings on the inner face and `depth` how far a floor lies out from it, both span / 40 by default. */
  coffers?: { across: number; along: number; depth?: number; rib?: number } | false;
  detail?: Detail;
}

/**
 * A coffer's floor is its cell inset this many half-ribs from each side, so the floor takes this many ribs off its cell's width and its length. It
 * stays above 1, so that a floor closes before its opening does.
 */
const FLOOR_INSET = 1.6;

/**
 * The least width and length a coffer's floor keeps, metres. Less is as good as none: `MeshBuilder.polygon` leaves out a face whose area is under
 * 5e-13 m², and Float32 positions, a micrometre apart 10 m out, could close a narrower floor or turn it round.
 */
const FLOOR_LEAST = 0.001;

/** `x` rounded down to four significant digits and kept below it, so that a value named as "at most" it passes; for x from 1e-300 up. */
function below(x: number): number {
  const unit = 10 ** (Math.floor(Math.log10(x)) - 3);
  return Number((Math.floor(x / unit - 1e-6) * unit).toPrecision(4));
}

export function barrelVault(params: BarrelVaultParams): THREE.BufferGeometry {
  const span = positive('barrelVault', 'span', params.span);
  const rise = positive('barrelVault', 'rise', params.rise ?? span / 2);
  require('barrelVault', rise <= span / 2 + 1e-9, `rise ${String(rise)} is more than half the span ${String(span)}.`);
  const c = params.coffers === undefined || params.coffers === false ? null : params.coffers;
  const full = {
    span,
    length: positive('barrelVault', 'length', params.length),
    rise,
    thickness: positive('barrelVault', 'thickness', params.thickness ?? span / 20),
    coffers: c === null ? null : { across: integer('barrelVault', 'coffers.across', c.across, 2, 60), along: integer('barrelVault', 'coffers.along', c.along, 1, 200), depth: positive('barrelVault', 'coffers.depth', c.depth ?? span / 40), rib: positive('barrelVault', 'coffers.rib', c.rib ?? span / 40) },
    detail: checkDetail('barrelVault', params.detail ?? 'medium'),
  };
  if (full.coffers !== null) {
    const { across, along, depth, rib } = full.coffers;
    const radius = (span * span) / (8 * rise) + rise / 2;
    const arc = 2 * Math.asin(Math.min(1, span / 2 / radius));
    // Each coffer must stay inside the shell, whose outer face runs along the chords of its facets as buildVault divides it. A coffer's points farthest
    // out are the corners of its opening, half a rib in from its cell on the inner face, and of its floor, FLOOR_INSET half-ribs in and `depth` out; a
    // corner under a facet's middle has the least room.
    const facets = across * Math.max(1, Math.ceil(byDetail(full.detail, [8, 16, 32]) / across));
    const facet = arc / facets;
    // How far out the chord above a point at angle `at` from the face's first edge lies, as a share of the outer radius.
    const chord = (at: number): number => Math.cos(facet / 2) / Math.cos(at - (Math.min(facets - 1, Math.max(0, Math.floor(at / facet))) + 0.5) * facet);
    // The thickness each kind of corner needs with ribs `r` wide, and the depth the floors may have in this shell.
    const shell = (r: number): { openings: number; floors: number; room: number } => {
      const found = { openings: 0, floors: 0, room: Infinity };
      for (let i = 0; i < across; i += 1) {
        for (const [kind, inset, out] of [
          ['openings', r / 2 / radius, 0],
          ['floors', (FLOOR_INSET * r) / 2 / radius, depth],
        ] as const) {
          for (const at of [(arc * i) / across + inset, (arc * (i + 1)) / across - inset]) {
            found[kind] = Math.max(found[kind], (radius + out) / chord(at) - radius);
            if (kind === 'floors') found.room = Math.min(found.room, (radius + full.thickness) * chord(at) - radius);
          }
        }
      }
      return found;
    };
    // The thickness a shell needs, rounded up so that following the advice passes.
    const enough = (need: { openings: number; floors: number }): string => (Math.ceil(Math.max(need.openings, need.floors) * 1e4 + 1e-6) / 1e4).toFixed(4);
    // A floor keeps FLOOR_LEAST across and along only while FLOOR_INSET ribs fall that much short of its cell's width, the cell's arc on the inner
    // face, and of its length. Where they reach either, the floor's sides meet; past it they cross, and where only one of the two is passed the floor
    // faces away from the axis.
    const cell = { width: (radius * arc) / across, length: full.length / along };
    const least = Math.min(cell.width, cell.length);
    if (least - FLOOR_INSET * rib < FLOOR_LEAST) {
      const most = (least - FLOOR_LEAST) / FLOOR_INSET;
      let advice = 'no rib leaves cells that small a floor; make them larger, with fewer coffers or a larger vault';
      if (most > 0) {
        // The rib named passes this refusal; where it would leave the shell too thin, the thickness it needs is named too.
        const named = below(most);
        const need = shell(named);
        advice = `make coffers.rib at most ${String(named)} m${Math.max(need.openings, need.floors) >= full.thickness ? `, and thickness at least ${enough(need)} m, which coffers of that rib need` : ''}`;
      }
      const shown = (x: number): string => String(Number(x.toPrecision(4)));
      throw new Error(
        `barrelVault: coffers.rib ${String(rib)} m${c?.rib === undefined ? ' (span / 40, the default)' : ''} leaves the coffers less than ${String(FLOOR_LEAST * 1000)} mm of floor across or along: a floor stands ${String(FLOOR_INSET / 2)} ribs in from each side of its cell, which is ${shown(cell.width)} m wide on the inner face and ${shown(cell.length)} m long, and its sides cross where ${String(FLOOR_INSET)} ribs reach either; ${advice}.`,
      );
    }
    const need = shell(rib);
    const kind = need.openings >= full.thickness ? 'openings' : 'floors';
    // Rounded so that following the advice passes: the thickness up, the depth down.
    const deep = Math.floor(need.room * 1e4 - 1e-6) / 1e4;
    require(
      'barrelVault',
      Math.max(need.openings, need.floors) < full.thickness,
      `thickness ${String(full.thickness)} m lets the coffers' ${kind} stand out of the shell's outer face, which runs along the chords of its facets, as pockets wound inside out (coffers.depth ${String(depth)} m, coffers.rib ${String(rib)} m); make thickness at least ${enough(need)} m${kind === 'floors' && deep > 0 ? ` or coffers.depth at most ${deep.toFixed(4)} m` : ''}.`,
    );
  }
  return cached('barrelVault', full, () => buildVault(full));
}

function buildVault(v: { span: number; length: number; rise: number; thickness: number; coffers: { across: number; along: number; depth: number; rib: number } | null; detail: Detail }): THREE.BufferGeometry {
  const w = v.span / 2;
  const radius = (w * w + v.rise * v.rise) / (2 * v.rise);
  const cy = v.rise - radius;
  const half = Math.asin(Math.min(1, w / radius));
  const L = v.length / 2;
  const b = new MeshBuilder();
  // Intrados divisions (one per coffer when coffered), each split into `sub` facets on the smooth extrados.
  const divisions = v.coffers === null ? byDetail(v.detail, [8, 16, 32]) : v.coffers.across;
  const sub = Math.max(1, Math.ceil(byDetail(v.detail, [8, 16, 32]) / divisions));
  const steps = divisions;
  const point = (r: number, a: number, z: number): THREE.Vector3 => new THREE.Vector3(r * Math.cos(a), cy + r * Math.sin(a), z);
  const angle = (k: number, n: number): number => Math.PI / 2 - half + (2 * half * k) / n;
  const outer = radius + v.thickness;
  // Extrados, from the right springing over to the left, z from back to front: faces out and up.
  const extrados: THREE.Vector3[][] = [];
  for (const z of [-L, L]) extrados.push(Array.from({ length: divisions * sub + 1 }, (_, k) => point(outer, angle(k, divisions * sub), z)));
  b.grid(extrados);
  // End faces (arch rings): per division, the intrados chord and the extrados facets above it.
  for (const [z, front] of [
    [L, true],
    [-L, false],
  ] as const) {
    for (let k = 0; k < divisions; k++) {
      const ring = [point(radius, angle(k, divisions), z)];
      for (let j = 0; j <= sub; j++) ring.push(point(outer, angle(k * sub + j, divisions * sub), z));
      ring.push(point(radius, angle(k + 1, divisions), z));
      b.polygon(front ? ring : ring.reverse());
    }
  }
  for (const k of [0, steps]) {
    const a = angle(k, steps);
    const quad = [point(radius, a, -L), point(outer, a, -L), point(outer, a, L), point(radius, a, L)];
    b.polygon(k === 0 ? quad : quad.reverse());
  }
  if (v.coffers === null) {
    const intrados: THREE.Vector3[][] = [];
    for (const z of [L, -L]) intrados.push(Array.from({ length: steps + 1 }, (_, k) => point(radius, angle(k, steps), z)));
    b.grid(intrados);
    return b.build();
  }
  const { across, along, depth, rib } = v.coffers;
  const da = (2 * half) / across;
  const dz = v.length / along;
  const ia = rib / 2 / radius;
  const iz = rib / 2;
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < along; j++) {
      const a0 = angle(i, across);
      const a1 = a0 + da;
      const z0 = -L + j * dz;
      const z1 = z0 + dz;
      // Corners: cell (at the intrados), opening (inset by half a rib) and coffer floor (inset FLOOR_INSET half-ribs, recessed).
      const ring = (r: number, inA: number, inZ: number): THREE.Vector3[] => [point(r, a0 + inA, z0 + inZ), point(r, a1 - inA, z0 + inZ), point(r, a1 - inA, z1 - inZ), point(r, a0 + inA, z1 - inZ)];
      const cell = ring(radius, 0, 0);
      const opening = ring(radius, ia, iz);
      const floor = ring(radius + depth, ia * FLOOR_INSET, iz * FLOOR_INSET);
      // Frames and sides as written face inward (toward the axis); the floor ring runs the other way and is reversed.
      for (let k = 0; k < 4; k++) {
        const k1 = (k + 1) % 4;
        const c0 = cell[k];
        const c1 = cell[k1];
        const o0 = opening[k];
        const o1 = opening[k1];
        const f0 = floor[k];
        const f1 = floor[k1];
        if (c0 === undefined || c1 === undefined || o0 === undefined || o1 === undefined || f0 === undefined || f1 === undefined) continue;
        b.polygon([c0, o0, o1, c1]);
        b.polygon([o0, f0, f1, o1]);
      }
      b.polygon([...floor].reverse());
    }
  }
  return b.build();
}
