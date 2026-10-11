/**
 * Column shaft geometry: entasis, flutes with rounded ends, the apophyge at the foot and the astragal under the capital.
 *
 * The fluted surface is one grid patch per flute and per fillet, so the arrises between them stay crisp while each flute shades round.
 * The apophyge and astragal are lathed sleeves that pass a few millimetres inside the shaft surface, so they meet it in a clean intersection instead of a crack.
 */
import * as THREE from 'three';

import type { MeshBuilder } from './builder.js';
import { byDetail, type Detail } from './params.js';
import { ProfilePen } from './profile.js';
import { latheInto } from './sweep.js';

export interface ShaftSpec {
  readonly diameter: number;
  readonly height: number;
  readonly taper: number;
  readonly fluted: boolean;
  readonly flutes: number;
  readonly detail: Detail;
}

/** Height above the shaft foot where entasis starts, as a fraction of the shaft height (Vignola: the lower third is straight). */
const ENTASIS_START = 1 / 3;

/** Shaft radius at height y (0..height) before fluting. */
export function shaftRadius(spec: ShaftSpec, y: number): number {
  const r0 = spec.diameter / 2;
  const r1 = (spec.diameter * spec.taper) / 2;
  const t = Math.max(0, (y / spec.height - ENTASIS_START) / (1 - ENTASIS_START));
  return r0 - (r0 - r1) * (1 - Math.cos((Math.PI / 2) * Math.min(1, t)));
}

/** Heights of the apophyge and astragal zones, metres. */
export function shaftEnds(spec: ShaftSpec): { foot: number; neck: number; astragal: number } {
  const D = spec.diameter;
  return { foot: D * 0.09, neck: D * 0.035, astragal: D * 0.075 };
}

/** Builds the shaft into `b` with its foot at y = `y0`. */
export function flutedShaftInto(b: MeshBuilder, spec: ShaftSpec, y0 = 0): void {
  const D = spec.diameter;
  const H = spec.height;
  const ends = shaftEnds(spec);
  const segments = byDetail(spec.detail, [16, 32, 48]);
  const inside = D * 0.004;
  // Apophyge sleeve: a fillet ring on the base, then a cavetto curving up into the shaft and ending just inside it.
  const r0 = shaftRadius(spec, 0);
  const foot = new ProfilePen(0, 0)
    .to(r0 + D * 0.055, 0)
    .to(r0 + D * 0.055, D * 0.02)
    .quarter(-(D * 0.055 + inside), ends.foot - D * 0.02, false, byDetail(spec.detail, [2, 4, 6]))
    .to(0, ends.foot)
    .close();
  latheInto(b, offsetY(foot.points, y0), { segments });
  // Astragal sleeve: fillet then a half-round, under the capital.
  const rTop = shaftRadius(spec, H);
  const yA = H - ends.astragal - ends.neck;
  const neck = new ProfilePen(0, yA)
    .to(rTop - inside, yA)
    .to(rTop + D * 0.012, yA + D * 0.004)
    .to(rTop + D * 0.012, yA + ends.neck)
    .half(0, ends.astragal, D * 0.04, byDetail(spec.detail, [3, 5, 7]))
    .to(0, H)
    .close();
  latheInto(b, offsetY(neck.points, y0), { segments });
  if (!spec.fluted) {
    plainShaftInto(b, spec, y0, segments);
    return;
  }
  flutesInto(b, spec, y0);
}

function offsetY(points: readonly (readonly [number, number])[], y0: number): { closed: true; points: [number, number][] } {
  return { closed: true, points: points.map(([d, y]) => [d, y + y0]) };
}

function plainShaftInto(b: MeshBuilder, spec: ShaftSpec, y0: number, segments: number): void {
  const steps = byDetail(spec.detail, [4, 6, 10]);
  const pen = new ProfilePen(0, 0).to(shaftRadius(spec, 0), 0);
  for (let k = 1; k <= steps; k++) {
    const y = ENTASIS_START * spec.height + ((1 - ENTASIS_START) * spec.height * k) / steps;
    pen.to(shaftRadius(spec, y), y);
  }
  pen.to(0, spec.height);
  latheInto(b, offsetY(pen.close().points, y0), { segments, profileCreaseDeg: 60 });
}

/** Ring heights and the flute fullness (0 plain .. 1 full flute) at each. */
function fluteRings(spec: ShaftSpec, fluteHalfWidth: number): { y: number; q: number }[] {
  const ends = shaftEnds(spec);
  const H = spec.height;
  const start = ends.foot + spec.diameter * 0.04;
  const stop = H - ends.astragal - ends.neck - spec.diameter * 0.03;
  const endSteps: readonly number[] = byDetail<readonly number[]>(spec.detail, [[0, 1], [0, 0.2, 0.55, 1], [0, 0.1, 0.3, 0.6, 1]]);
  const rings: { y: number; q: number }[] = [{ y: 0, q: 0 }];
  for (const q of endSteps) rings.push({ y: start + q * fluteHalfWidth, q });
  const mids = byDetail(spec.detail, [2, 4, 6]);
  const lo = start + fluteHalfWidth;
  const hi = stop - fluteHalfWidth;
  for (let k = 1; k < mids; k++) {
    // Denser where the entasis curves.
    const f = k / mids;
    const y = lo + (hi - lo) * (ENTASIS_START * 0.6 + (1 - ENTASIS_START * 0.6) * f);
    rings.push({ y, q: 1 });
  }
  for (const q of [...endSteps].reverse()) rings.push({ y: stop - q * fluteHalfWidth, q });
  rings.push({ y: H, q: 0 });
  return rings.sort((a, b) => a.y - b.y);
}

function flutesInto(b: MeshBuilder, spec: ShaftSpec, y0: number): void {
  const n = spec.flutes;
  const period = (Math.PI * 2) / n;
  const filletShare = 0.22;
  const r0 = spec.diameter / 2;
  const fluteHalfWidth = (r0 * period * (1 - filletShare)) / 2;
  const across = byDetail(spec.detail, [2, 3, 5]);
  const rings = fluteRings(spec, fluteHalfWidth);
  // Flute k is centred on angle k·period − π/2, so one flute faces +Z.
  for (let k = 0; k < n; k++) {
    const centre = k * period - Math.PI / 2;
    const halfAngle = (period * (1 - filletShare)) / 2;
    const fluteRows: THREE.Vector3[][] = [];
    const filletRows: THREE.Vector3[][] = [];
    for (const { y, q } of rings) {
      const radius = shaftRadius(spec, y);
      const scale = radius / r0;
      const e = Math.sqrt(Math.max(0, 1 - (1 - q) * (1 - q)));
      const half = halfAngle * e;
      const depth = fluteHalfWidth * 0.85 * e * scale;
      const row: THREE.Vector3[] = [];
      for (let i = 0; i <= across; i++) {
        const s = i / across;
        const angle = centre - half + 2 * half * s;
        const d = depth * Math.sqrt(Math.max(0, 1 - (2 * s - 1) * (2 * s - 1)));
        row.push(point(radius - d, angle, y + y0));
      }
      fluteRows.push(row);
      const nextStart = centre + period - halfAngle * e;
      filletRows.push([point(radius, centre + half, y + y0), point(radius, nextStart, y + y0)]);
    }
    b.grid(fluteRows);
    b.grid(filletRows);
  }
}

/** A point at `radius` and `angle` (radians from +X toward −Z, counter-clockwise seen from above). */
function point(radius: number, angle: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(radius * Math.cos(angle), y, -radius * Math.sin(angle));
}
