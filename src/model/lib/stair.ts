/**
 * Stairs: straight monumental flights with nosings and optional cheek walls, and landings between them.
 *
 * Units metres. A flight's origin is the foot of its first riser, centred across its width; it climbs toward −Z (the Met's front steps rise from the Fifth Avenue sidewalk at +Z toward the facade).
 * Step k (from 0) has its riser face at z = −k × tread and its tread top at y = (k + 1) × riser, so the top tread ends at z = −steps × tread, y = steps × riser.
 * A landing's origin is the centre of its front top edge, so a landing placed at (0, steps × riser, −steps × tread) in a flight's frame continues it,
 * and the next flight starts at the landing's back edge, z = −depth.
 */
import * as THREE from 'three';

import { MeshBuilder, type V2 } from './builder.js';
import { cached } from './cache.js';
import { integer, positive, require } from './params.js';

export interface StairFlightParams {
  /** Width across the flight (X), metres. */
  width: number;
  /** Number of risers. */
  steps: number;
  /** Riser height, metres. Default 0.15. */
  riser?: number;
  /** Tread depth, metres. Default 0.4. */
  tread?: number;
  /** How far each tread's front edge overhangs the riser below, metres. Default 0.02. */
  nosing?: number;
  /** A cheek wall at each side, or none. Default none. */
  cheeks?: { width?: number; height?: number } | false;
}

export interface StairFlight {
  /** The steps as one closed solid (stone), its underside on y = 0 included. */
  readonly steps: THREE.BufferGeometry;
  /** Both cheek walls: blocks whose tops run `height` above the nosing line, from just in front of the first riser to the top (stone). */
  readonly cheeks?: THREE.BufferGeometry;
}

/**
 * Extrudes a side profile in (z, y), counter-clockwise seen from +X, across x ∈ [x0, x1], as a closed solid: both sides and every edge's face, the
 * underside on y = 0 too, so a line through the solid crosses it an even number of times (the walk's check for a walker built into it reads that).
 */
function extrudeX(b: MeshBuilder, profile: readonly V2[], x0: number, x1: number): void {
  // (z, y) on axes (+Z, +Y) faces Z × Y = −X: the x0 side as is; the x1 side mirrors y onto −Y to face +X.
  b.planar(profile, [], new THREE.Vector3(x0, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
  b.planar(
    profile.map(([z, y]) => [z, -y] as const),
    [],
    new THREE.Vector3(x1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, -1, 0),
  );
  for (let k = 0; k < profile.length; k++) {
    const a = profile[k];
    const c = profile[(k + 1) % profile.length];
    if (a === undefined || c === undefined) continue;
    // Right of travel in (z, y) is outward for a counter-clockwise outline.
    b.polygon([new THREE.Vector3(x0, a[1], a[0]), new THREE.Vector3(x1, a[1], a[0]), new THREE.Vector3(x1, c[1], c[0]), new THREE.Vector3(x0, c[1], c[0])]);
  }
}

export function stairFlight(params: StairFlightParams): StairFlight {
  const part = 'stairFlight';
  const c = params.cheeks === undefined || params.cheeks === false ? null : { width: positive(part, 'cheeks.width', params.cheeks.width ?? 0.6), height: positive(part, 'cheeks.height', params.cheeks.height ?? 0.9) };
  const full = {
    width: positive(part, 'width', params.width),
    steps: integer(part, 'steps', params.steps, 1, 200),
    riser: positive(part, 'riser', params.riser ?? 0.15),
    tread: positive(part, 'tread', params.tread ?? 0.4),
    nosing: params.nosing ?? 0.02,
    cheeks: c,
  };
  require(part, full.nosing >= 0 && full.nosing < full.tread / 3, `nosing ${String(full.nosing)} must be from 0 to a third of the tread (${(full.tread / 3).toFixed(3)}).`);
  return cached(part, full, () => {
    const { steps, riser: r, tread: t, nosing } = full;
    const lip = Math.min(0.035, r * 0.3);
    // Side profile in (z, y), counter-clockwise seen from +X: along the ground from the top back to the front, then up each riser and nosing and back along each tread.
    const profile: V2[] = [[-steps * t, 0]];
    profile.push([0, 0]);
    for (let k = 0; k < steps; k++) {
      const z = -k * t;
      const top = (k + 1) * r;
      if (nosing > 0) profile.push([z, top - lip], [z + nosing, top - lip], [z + nosing, top]);
      else profile.push([z, top]);
      if (k < steps - 1) profile.push([z - t, top]);
    }
    profile.push([-steps * t, steps * r]);
    const b = new MeshBuilder();
    extrudeX(b, profile, -full.width / 2, full.width / 2);
    const out: { steps: THREE.BufferGeometry; cheeks?: THREE.BufferGeometry } = { steps: b.build() };
    if (full.cheeks !== null) {
      const front = 0.3;
      const h = full.cheeks.height;
      // Top line parallel to the nosing line (through (0, r) with slope r / t), `h` above it.
      const cheek: V2[] = [
        [-steps * t, 0],
        [front, 0],
        [front, r + h],
        [-steps * t + t, steps * r + h],
        [-steps * t, steps * r + h],
      ];
      const cb = new MeshBuilder();
      const w = full.width / 2;
      extrudeX(cb, cheek, w, w + full.cheeks.width);
      extrudeX(cb, cheek, -w - full.cheeks.width, -w);
      out.cheeks = cb.build();
    }
    return Object.freeze(out);
  });
}

export interface StairLandingParams {
  /** Width across (X), metres. */
  width: number;
  /** Depth along the climb (−Z), metres. */
  depth: number;
  /** Slab thickness below the landing top, metres. Default 0.3. */
  thickness?: number;
}

/** A landing slab: its top at y = 0 from z = 0 (the front edge, where the flight below arrives) back to z = −depth, `thickness` deep. Origin at the centre of the front top edge. */
export function stairLanding(params: StairLandingParams): THREE.BufferGeometry {
  const full = {
    width: positive('stairLanding', 'width', params.width),
    depth: positive('stairLanding', 'depth', params.depth),
    thickness: positive('stairLanding', 'thickness', params.thickness ?? 0.3),
  };
  return cached('stairLanding', full, () => {
    const b = new MeshBuilder();
    b.box([-full.width / 2, -full.thickness, -full.depth], [full.width / 2, 0, 0]);
    return b.build();
  });
}
