/**
 * Balustrades: a turned baluster, and runs of balusters between a moulded plinth and rail with square posts.
 *
 * Units metres. A baluster's origin is its base centre. A run's rail and plinth are centred on its path line (the run's centre line), at y = 0 on the path;
 * a straight run of `length` lies along X centred on the origin, its front toward +Z. The baluster geometry is shared by every run of the same baluster size
 * and placed by the run's `balusters` matrices, so a whole roof line of balusters is one instanced mesh.
 */
import * as THREE from 'three';

import { along } from './along.js';
import { MeshBuilder, type V3 } from './builder.js';
import { cached } from './cache.js';
import { byDetail, checkDetail, positive, require, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';
import { cleanPath, latheInto, sweepInto } from './sweep.js';

export interface BalusterParams {
  /** Height, metres. Default 0.75. */
  height?: number;
  /** Width of the square foot and cap blocks, metres; the bulb is as wide. Default 0.2. */
  width?: number;
  detail?: Detail;
}

/** A vase baluster: square foot block, a bulb swelling low and narrowing to a neck, a collar and a square cap block. Origin at its base centre. */
export function baluster(params: BalusterParams = {}): THREE.BufferGeometry {
  const full = { height: positive('baluster', 'height', params.height ?? 0.75), width: positive('baluster', 'width', params.width ?? 0.2), detail: checkDetail('baluster', params.detail ?? 'medium') };
  require('baluster', full.height >= full.width * 2, `height ${String(full.height)} is under twice the width ${String(full.width)}; a baluster is at least twice as tall as wide.`);
  return cached('baluster', full, () => {
    const h = full.height;
    const w = full.width / 2;
    const b = new MeshBuilder();
    const foot = 0.11 * h;
    const cap = 0.1 * h;
    b.box([-w, 0, -w], [w, foot, w]);
    b.box([-w, h - cap, -w], [w, h, w]);
    const n = byDetail(full.detail, [1, 2, 3]);
    // Closed by a disc at each end, on the blocks' faces.
    const profile: Profile = new ProfilePen(0, foot)
      .to(0.8 * w, foot)
      .half(0, 0.05 * h, 0.08 * w, n)
      .to(0.7 * w, 0.18 * h)
      .quarter(0.28 * w, 0.17 * h, true, n + 1)
      .quarter(-0.62 * w, 0.32 * h, true, n + 1)
      .to(0.36 * w, 0.73 * h)
      .half(0, 0.05 * h, 0.12 * w, n)
      .to(0.6 * w, h - cap - 0.02 * h)
      .to(0.75 * w, h - cap)
      .to(0, h - cap)
      .open();
    latheInto(b, profile, { segments: byDetail(full.detail, [6, 10, 16]) });
    return b.build();
  });
}

export interface BalustradeParams {
  /** Length of a straight run along X centred on the origin, metres. Default 3. Ignored when `path` is given. */
  length?: number;
  /** The run's centre line, at least two points; a polyline with mitred corners. */
  path?: readonly V3[];
  /** The path is a loop. Default false. */
  closed?: boolean;
  /** Total height, plinth foot to rail top, metres. Default 1.0. */
  height?: number;
  /** Baluster centre-to-centre spacing, metres. Default 0.3. */
  balusterSpacing?: number;
  /** Longest clear run between posts, metres. Default 3.5. */
  postEvery?: number;
  /** Post (pier) width, metres. Default 0.35. */
  postWidth?: number;
  /** Plinth height, metres. Default 0.16. */
  plinthHeight?: number;
  /** Rail height, metres. Default 0.15. */
  railHeight?: number;
  detail?: Detail;
}

export interface Balustrade {
  /** The moulded cap rail along the run (stone). */
  readonly rail: THREE.BufferGeometry;
  /** The plinth (bottom rail) along the run (stone). */
  readonly plinth: THREE.BufferGeometry;
  /** Every post of the run in one geometry: square piers with base and cap at the ends, the corners and at most `postEvery` apart (stone). */
  readonly posts: THREE.BufferGeometry;
  /** The shared baluster geometry for this run's baluster size (stone). */
  readonly baluster: THREE.BufferGeometry;
  /** Placements of `baluster` along the run, standing on the plinth between the posts. */
  readonly balusters: readonly THREE.Matrix4[];
}

/** Symmetric rail section about the centre line: a narrow soffit band, an ovolo out to the full width, a fillet and a low ridge. */
function railProfile(width: number, height: number, n: number): Profile {
  const w = width / 2;
  return new ProfilePen(-0.62 * w, 0)
    .to(0.62 * w, 0)
    .to(0.62 * w, 0.2 * height)
    .quarter(0.38 * w, 0.35 * height, true, n)
    .to(w, 0.78 * height)
    .to(0.9 * w, 0.82 * height)
    .to(0, height)
    .to(-0.9 * w, 0.82 * height)
    .to(-w, 0.78 * height)
    .to(-w, 0.55 * height)
    .quarter(0.38 * w, -0.35 * height, true, n)
    .to(-0.62 * w, 0)
    .close();
}

/** Symmetric plinth section: a block with chamfered top edges. */
function plinthProfile(width: number, height: number): Profile {
  const w = width / 2;
  return {
    closed: true,
    points: [
      [-w, 0],
      [w, 0],
      [w, 0.75 * height],
      [0.8 * w, height],
      [-0.8 * w, height],
      [-w, 0.75 * height],
    ],
  };
}

export function balustrade(params: BalustradeParams = {}): Balustrade {
  const part = 'balustrade';
  const length = positive(part, 'length', params.length ?? 3);
  const path: readonly V3[] =
    params.path ??
    ([
      [-length / 2, 0, 0],
      [length / 2, 0, 0],
    ] as const);
  const full = {
    path,
    closed: params.closed ?? false,
    height: positive(part, 'height', params.height ?? 1),
    balusterSpacing: positive(part, 'balusterSpacing', params.balusterSpacing ?? 0.3),
    postEvery: positive(part, 'postEvery', params.postEvery ?? 3.5),
    postWidth: positive(part, 'postWidth', params.postWidth ?? 0.35),
    plinthHeight: positive(part, 'plinthHeight', params.plinthHeight ?? 0.16),
    railHeight: positive(part, 'railHeight', params.railHeight ?? 0.15),
    detail: checkDetail(part, params.detail ?? 'medium'),
  };
  require(part, cleanPath(full.path, full.closed).length >= 2, 'path needs at least 2 distinct points.');
  const balusterHeight = full.height - full.plinthHeight - full.railHeight;
  require(part, balusterHeight >= 0.3, `height ${String(full.height)} leaves ${balusterHeight.toFixed(3)} m for the balusters between plinth and rail; it must leave at least 0.3 m.`);
  require(part, full.postEvery > full.postWidth + full.balusterSpacing, `postEvery ${String(full.postEvery)} must exceed postWidth + balusterSpacing (${String(full.postWidth + full.balusterSpacing)}).`);
  return cached(part, full, () => buildBalustrade(full, balusterHeight));
}

function buildBalustrade(
  p: { path: readonly V3[]; closed: boolean; height: number; balusterSpacing: number; postEvery: number; postWidth: number; plinthHeight: number; railHeight: number; detail: Detail },
  balusterHeight: number,
): Balustrade {
  const n = byDetail(p.detail, [1, 2, 3]);
  const railWidth = p.postWidth * 0.8;
  const plinthWidth = p.postWidth * 0.75;
  const balusterWidth = Math.min(railWidth * 0.62, p.balusterSpacing * 0.66);
  const lift = (y: number): V3[] => p.path.map(([x, py, z]) => [x, py + y, z] as const);
  const rail = new MeshBuilder();
  sweepInto(rail, railProfile(railWidth, p.railHeight, n), lift(p.height - p.railHeight), { closed: p.closed });
  const plinth = new MeshBuilder();
  sweepInto(plinth, plinthProfile(plinthWidth, p.plinthHeight), lift(0), { closed: p.closed });
  const shared = baluster({ height: balusterHeight, width: balusterWidth, detail: p.detail });
  // Posts at every path point and evenly between where a stretch is longer than postEvery; balusters fill each bay between posts.
  const points = cleanPath(p.path, p.closed);
  const segments = p.closed ? points.length : points.length - 1;
  const posts = new MeshBuilder();
  const balusters: THREE.Matrix4[] = [];
  const placed = new Set<string>();
  const postAt = (at: THREE.Vector3, direction: THREE.Vector3): void => {
    const key = at.toArray().map((v) => v.toFixed(4)).join(',');
    if (placed.has(key)) return;
    placed.add(key);
    const mark = posts.vertexCount;
    const w = p.postWidth / 2;
    const b = w + 0.03;
    const c = w + 0.045;
    posts.box([-b, 0, -b], [b, p.plinthHeight * 1.15, b]);
    posts.box([-w, p.plinthHeight * 1.15, -w], [w, p.height - p.railHeight, w]);
    posts.box([-c, p.height - p.railHeight, -c], [c, p.height + 0.05, c]);
    const angle = Math.atan2(-direction.z, direction.x);
    posts.transform(mark, new THREE.Matrix4().makeTranslation(at.x, at.y, at.z).multiply(new THREE.Matrix4().makeRotationY(angle)));
  };
  for (let k = 0; k < segments; k++) {
    const a = points[k] ?? new THREE.Vector3();
    const b = points[(k + 1) % points.length] ?? new THREE.Vector3();
    const span = a.distanceTo(b);
    const direction = new THREE.Vector3().subVectors(b, a).normalize();
    const bays = Math.max(1, Math.ceil(span / p.postEvery - 1e-9));
    for (let i = 0; i <= bays; i++) {
      const from = a.clone().lerp(b, i / bays);
      postAt(from, direction);
      if (i === bays) break;
      const to = a.clone().lerp(b, (i + 1) / bays);
      const bay: V3[] = [from.toArray(), to.toArray()];
      balusters.push(...along(bay, p.balusterSpacing, { y: p.plinthHeight, margin: p.postWidth / 2 + p.balusterSpacing * 0.6 }));
    }
  }
  return Object.freeze({ rail: rail.build(), plinth: plinth.build(), posts: posts.build(), baluster: shared, balusters: Object.freeze(balusters) });
}
