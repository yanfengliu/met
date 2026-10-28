/**
 * Mouldings along paths: any profile swept along a wall line, and cornices and entablatures with their modillion and dentil runs.
 *
 * Paths are lists of [x, y, z] points in metres; the profile hangs from the path line with its back (d = 0) on the path and projects to the right of travel
 * (toward +Z for a path running +X; outward for a closed loop wound counter-clockwise seen from above). y = 0 of the profile is at the path's height.
 * Corners are mitred. Modillions and dentils are separate geometries, shared by every run of the same size, with their placements in the returned matrices,
 * so a whole facade's modillions batch into one instanced mesh. A modillion's local frame: origin at its back-top centre, projecting toward +Z, hanging toward −Y.
 */
import * as THREE from 'three';

import { along } from './along.js';
import { MeshBuilder, type V2, type V3 } from './builder.js';
import { cached } from './cache.js';
import { checkDetail, positive, require, type Detail } from './params.js';
import type { Profile } from './profile.js';
import {
  architraveProfile,
  baseMouldingProfile,
  CORNICE_BANDS,
  corniceProfile,
  friezeProfile,
  parapetCapProfile,
  plinthProfile,
  stackProfiles,
  stringCourseProfile,
} from './profiles.js';
import { sweepInto } from './sweep.js';

export type ProfileName = 'cornice' | 'cornice-plain' | 'architrave' | 'frieze' | 'string-course' | 'base' | 'plinth' | 'parapet-cap';

export interface MouldingParams {
  /** A ready-made profile name or a custom closed profile (profile.ts). Default 'string-course'. */
  profile?: ProfileName | Profile;
  /** The wall line, at least two points. */
  path: readonly V3[];
  /** The path is a loop. Default false. */
  closed?: boolean;
  /** Moulding height, metres (ready-made profiles only). Default 0.4. */
  height?: number;
  /** Projection, metres (ready-made profiles only). Default: the profile's own share of the height. */
  projection?: number;
  detail?: Detail;
}

function namedProfile(name: ProfileName, height: number, projection: number | undefined, detail: Detail): Profile {
  const size = projection === undefined ? { height, detail } : { height, projection, detail };
  switch (name) {
    case 'cornice':
      return corniceProfile({ ...size, dentils: false, modillions: false });
    case 'cornice-plain':
      return corniceProfile({ ...size, dentils: false, modillions: false });
    case 'architrave':
      return architraveProfile(size);
    case 'frieze':
      return friezeProfile(size);
    case 'string-course':
      return stringCourseProfile(size);
    case 'base':
      return baseMouldingProfile(size);
    case 'plinth':
      return plinthProfile(size);
    case 'parapet-cap':
      return parapetCapProfile(projection === undefined ? { height } : { height, overhang: projection });
  }
}

/** A profile swept along a path with mitred corners and capped ends. */
export function moulding(params: MouldingParams): THREE.BufferGeometry {
  const full = {
    profile: params.profile ?? 'string-course',
    path: params.path,
    closed: params.closed ?? false,
    height: positive('moulding', 'height', params.height ?? 0.4),
    projection: params.projection,
    detail: checkDetail('moulding', params.detail ?? 'medium'),
  };
  require('moulding', full.path.length >= 2, `path has ${String(full.path.length)} point(s); it needs at least 2.`);
  return cached('moulding', full, () => {
    const profile = typeof full.profile === 'string' ? namedProfile(full.profile, full.height, full.projection, full.detail) : full.profile;
    const b = new MeshBuilder();
    sweepInto(b, profile, full.path, { closed: full.closed });
    return b.build();
  });
}

export interface ModillionParams {
  /** Length, projecting toward +Z, metres. Default 0.6. */
  length?: number;
  /** Width across, metres. Default length / 3.5. */
  width?: number;
  /** Depth below the soffit, metres. Default length / 3. */
  height?: number;
  detail?: Detail;
}

/** A scroll modillion: flat top under the soffit, a large scroll at the back and a small one at the front. Origin at the back-top centre; projects +Z, hangs −Y. */
export function modillion(params: ModillionParams = {}): THREE.BufferGeometry {
  const length = positive('modillion', 'length', params.length ?? 0.6);
  const full = { length, width: positive('modillion', 'width', params.width ?? length / 3.5), height: positive('modillion', 'height', params.height ?? length / 3), detail: checkDetail('modillion', params.detail ?? 'medium') };
  return cached('modillion', full, () => {
    const { length: L, width: W, height: H } = full;
    const steps = full.detail === 'low' ? 3 : full.detail === 'high' ? 8 : 5;
    // Side outline in (z, y), counter-clockwise with z to the right: down the back, round the big back scroll,
    // along the hollow underside, up round the small front scroll, then back along the top under the soffit.
    const outline: [number, number][] = [
      [0, 0],
      [0, -0.8 * H],
    ];
    for (let k = 1; k <= steps; k++) {
      const a = (k / steps) * (Math.PI / 2);
      outline.push([0.2 * L * (1 - Math.cos(a)), -0.8 * H - 0.2 * H * Math.sin(a)]);
    }
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      outline.push([0.2 * L + 0.62 * L * t, -H + 0.5 * H * t * t]);
    }
    for (let k = 1; k <= steps; k++) {
      const a = -Math.PI / 2 + (k / steps) * Math.PI;
      outline.push([0.82 * L + 0.18 * L * Math.cos(a), -0.25 * H + 0.25 * H * Math.sin(a)]);
    }
    const b = new MeshBuilder();
    extrudeSideOutline(b, outline, W);
    return b.build();
  });
}

/** Extrudes a side outline in (z, y), counter-clockwise seen from +X, symmetrically across x = ±width/2. */
function extrudeSideOutline(b: MeshBuilder, outline: readonly V2[], width: number): void {
  const hw = width / 2;
  // (z, y) on axes (+Z, +Y) faces Z × Y = −X; the +X side mirrors y onto −Y so it faces Z × (−Y) = +X. Edge quads face right of travel, outward for a counter-clockwise outline.
  b.planar(outline, [], new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
  b.planar(
    outline.map(([z, y]) => [z, -y] as const),
    [],
    new THREE.Vector3(hw, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, -1, 0),
  );
  for (let k = 0; k < outline.length; k++) {
    const a = outline[k];
    const c = outline[(k + 1) % outline.length];
    if (a === undefined || c === undefined) continue;
    b.polygon([new THREE.Vector3(-hw, a[1], a[0]), new THREE.Vector3(hw, a[1], a[0]), new THREE.Vector3(hw, c[1], c[0]), new THREE.Vector3(-hw, c[1], c[0])]);
  }
}

export interface DentilParams {
  /** Width along the run, metres. Default 0.1. */
  width?: number;
  /** Height, metres. Default 1.5 × width. */
  height?: number;
  /** Projection, metres. Default width. */
  depth?: number;
}

/** A dentil block, closed, though its back and top lie against the frieze and the soffit. Origin at its back-top centre; projects +Z, hangs −Y. */
export function dentil(params: DentilParams = {}): THREE.BufferGeometry {
  const width = positive('dentil', 'width', params.width ?? 0.1);
  const full = { width, height: positive('dentil', 'height', params.height ?? width * 1.5), depth: positive('dentil', 'depth', params.depth ?? width) };
  return cached('dentil', full, () => {
    const b = new MeshBuilder();
    b.box([-full.width / 2, -full.height, 0], [full.width / 2, 0, full.depth]);
    return b.build();
  });
}

export interface CorniceRunParams {
  path: readonly V3[];
  closed?: boolean;
  /** Cornice height, metres. Default 1.2. */
  height?: number;
  /** Projection, metres. Default equal to the height. */
  projection?: number;
  /** Modillions under the soffit. Default true. */
  modillions?: boolean;
  /** A dentil course. Default true. */
  dentils?: boolean;
  detail?: Detail;
}

export interface CorniceRun {
  /** The swept mouldings. */
  readonly moulding: THREE.BufferGeometry;
  /** Shared modillion geometry, when modillions are on. */
  readonly modillion?: THREE.BufferGeometry;
  /** Shared dentil geometry, when dentils are on. */
  readonly dentil?: THREE.BufferGeometry;
  /** Placements of the modillion geometry along the run (one on each convex corner too). */
  readonly modillions: readonly THREE.Matrix4[];
  readonly dentils: readonly THREE.Matrix4[];
}

interface RunSpec {
  path: readonly V3[];
  closed: boolean;
  height: number;
  projection: number;
  modillions: boolean;
  dentils: boolean;
  detail: Detail;
  /** Height of the architrave and frieze below the cornice (entablature only), metres. */
  below: number;
  order: 'cornice' | 'entablature';
}

function runInto(spec: RunSpec, profile: Profile): CorniceRun {
  const b = new MeshBuilder();
  sweepInto(b, profile, spec.path, { closed: spec.closed });
  const h = spec.height;
  const p = spec.projection;
  const y0 = spec.below;
  const out: { moulding: THREE.BufferGeometry; modillion?: THREE.BufferGeometry; dentil?: THREE.BufferGeometry; modillions: THREE.Matrix4[]; dentils: THREE.Matrix4[] } = {
    moulding: b.build(),
    modillions: [],
    dentils: [],
  };
  if (spec.modillions) {
    const M = CORNICE_BANDS.modillion;
    const length = (M.reach - M.d) * p;
    const width = length / 3.2;
    out.modillion = modillion({ length, width, height: (M.y1 - M.y0) * h, detail: spec.detail });
    const spacing = length * 1.15;
    out.modillions = along(spec.path, spacing, { closed: spec.closed, outward: M.d * p, y: y0 + M.y1 * h, margin: length + width, corners: true });
  }
  if (spec.dentils) {
    const D = CORNICE_BANDS.dentil;
    const dh = (D.y1 - D.y0) * h;
    const width = dh / 1.6;
    out.dentil = dentil({ width, height: dh, depth: D.project * p });
    out.dentils = along(spec.path, width * 1.55, { closed: spec.closed, outward: D.d * p, y: y0 + D.y1 * h, margin: D.project * p + width });
  }
  return Object.freeze(out);
}

/** A cornice along a path, with its modillion and dentil runs. */
export function corniceRun(params: CorniceRunParams): CorniceRun {
  const height = positive('corniceRun', 'height', params.height ?? 1.2);
  const spec: RunSpec = {
    path: params.path,
    closed: params.closed ?? false,
    height,
    projection: positive('corniceRun', 'projection', params.projection ?? height),
    modillions: params.modillions ?? true,
    dentils: params.dentils ?? true,
    detail: checkDetail('corniceRun', params.detail ?? 'medium'),
    below: 0,
    order: 'cornice',
  };
  require('corniceRun', spec.path.length >= 2, `path has ${String(spec.path.length)} point(s); it needs at least 2.`);
  return cached('corniceRun', spec, () => runInto(spec, corniceProfile({ height: spec.height, projection: spec.projection, modillions: spec.modillions, dentils: spec.dentils, detail: spec.detail })));
}

export interface EntablatureParams extends Omit<CorniceRunParams, 'height' | 'projection'> {
  /** Total height of architrave, frieze and cornice, metres. Default 3.2 (the Hunt facade's order is about 13 m tall). Split 3 : 3 : 4 (Vignola's Corinthian). */
  height?: number;
}

/** Architrave, frieze and cornice in one sweep (Vignola's Corinthian, 3 : 3 : 4), with the cornice's modillion and dentil runs. Its bottom (the architrave soffit) is at the path's height. */
export function entablature(params: EntablatureParams): CorniceRun {
  const total = positive('entablature', 'height', params.height ?? 3.2);
  const cornice = total * 0.4;
  const spec: RunSpec = {
    path: params.path,
    closed: params.closed ?? false,
    height: cornice,
    projection: cornice,
    modillions: params.modillions ?? true,
    dentils: params.dentils ?? true,
    detail: checkDetail('entablature', params.detail ?? 'medium'),
    below: total * 0.6,
    order: 'entablature',
  };
  require('entablature', spec.path.length >= 2, `path has ${String(spec.path.length)} point(s); it needs at least 2.`);
  return cached('entablature', spec, () => {
    const profile = stackProfiles([
      architraveProfile({ height: total * 0.3, projection: total * 0.045, detail: spec.detail }),
      friezeProfile({ height: total * 0.3, projection: total * 0.012, detail: spec.detail }),
      corniceProfile({ height: cornice, projection: cornice, modillions: spec.modillions, dentils: spec.dentils, detail: spec.detail }),
    ]);
    return runInto(spec, profile);
  });
}
