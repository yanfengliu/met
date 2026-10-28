/**
 * Landscape parts for the Fifth Avenue frontage and the David H. Koch Plaza (2014): London plane trees, clipped hedges and the granite fountain basins.
 * Metres, +Y up, front +Z, origin at the base centre (y = 0 at the bottom) unless a header says otherwise.
 * Equal parameters return the identical cached object (docs/design/spec.md, Parts library): never mutate, move or dispose it; place it through a matrix.
 */
import * as THREE from 'three';

import { MeshBuilder, vec } from './builder.js';
import { cached } from './cache.js';
import { addFlatFaces, boundsOf, fitBox, icosphere, lumpyPoints, seededRandom, tubeInto, valueNoise, type LumpSpec } from './organic.js';
import { byDetail, checkDetail, inRange, integer, positive, require as need, type Detail } from './params.js';
import { ProfilePen } from './profile.js';
import { latheInto, sweepInto } from './sweep.js';

/** Largest `seed` the seeded parts accept. */
export const MAX_SEED = 1_000_000;

// ---------------------------------------------------------------- tree

export interface TreeParams {
  /** Overall height from the trunk foot to the crown top, metres. Default 12 (a mature street plane). */
  readonly height?: number;
  /** Crown diameter, the same in x and z, metres; from 0.2 to 2 × height. Default 0.75 × height. */
  readonly spread?: number;
  /** Variant: a whole number from 0 to 1,000,000. Each seed changes the fork height, the number and placing of crown clumps and their lumps. Default 0. */
  readonly seed?: number;
  /** Triangle cost: 'low' (about 300 triangles), 'medium' (default, at most 1,500) or 'high' (about 3,000). */
  readonly detail?: Detail;
}

/** A tree's two materials. */
export interface Tree {
  /** Trunk and limbs, closed tubes (bark). */
  readonly trunk: THREE.BufferGeometry;
  /** The crown: overlapping lumpy clumps, closed and flat shaded (foliage). */
  readonly foliage: THREE.BufferGeometry;
}

interface TreeFull {
  readonly height: number;
  readonly spread: number;
  readonly seed: number;
  readonly detail: Detail;
}

/**
 * A London plane-like street tree (Fifth Avenue and the plaza allées): a straight trunk with a root flare, a few limbs forking from about a third of its height, and a broad rounded crown of six to eight irregular low-poly clumps.
 * Origin at the trunk foot; the crown is fitted so the tree's bounding box is exactly x and z in [−spread/2, spread/2] and y in [0, height], centred on the trunk.
 */
export function tree(params: TreeParams = {}): Tree {
  const part = 'tree';
  const height = positive(part, 'height', params.height ?? 12);
  const spread = inRange(part, 'spread', params.spread ?? 0.75 * height, 0.2 * height, 2 * height);
  const seed = integer(part, 'seed', params.seed ?? 0, 0, MAX_SEED);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: TreeFull = { height, spread, seed, detail };
  return cached(part, full, () => buildTree(full));
}

function buildTree(p: TreeFull): Tree {
  const random = seededRandom(p.seed * 7919 + 1);
  const h = p.height;
  const radius = p.spread / 2;
  const forkY = h * (0.28 + 0.12 * random());
  const crownBase = forkY + 0.05 * h;
  const crownH = h - crownBase;
  const ringCount = 4 + Math.floor(random() * 4);
  // 0: a low, spreading skirt of clumps; 1: clumps held high under a rounded dome.
  const habit = random();
  const phase = random() * Math.PI * 2;
  const lump = { roughness: 0.24, frequency: 1.7 };
  const topSize = radius * (0.48 + 0.16 * random());
  const specs: LumpSpec[] = [
    // The top clump crowns the tree, a little off centre.
    {
      centre: vec((random() - 0.5) * 0.25 * radius, crownBase + 0.64 * crownH, (random() - 0.5) * 0.25 * radius),
      radii: vec(topSize, 0.36 * crownH, topSize),
      ...lump,
      seed: p.seed * 31,
    },
  ];
  if (random() < 0.6) {
    // A second, smaller top clump to one side breaks the dome's symmetry.
    const angle = random() * Math.PI * 2;
    specs.push({
      centre: vec(Math.cos(angle) * 0.38 * radius, crownBase + 0.74 * crownH, -Math.sin(angle) * 0.38 * radius),
      radii: vec(0.38 * radius, 0.26 * crownH, 0.38 * radius),
      ...lump,
      seed: p.seed * 31 + 50,
    });
  }
  for (let k = 0; k < ringCount; k++) {
    const angle = phase + (2 * Math.PI * k) / ringCount + (random() - 0.5) * 0.6;
    const out = radius * (0.42 + 0.18 * random());
    const rh = radius * (0.62 - 0.035 * ringCount + 0.1 * random());
    specs.push({
      centre: vec(Math.cos(angle) * out, crownBase + crownH * (0.2 + 0.22 * habit + 0.12 * random()), -Math.sin(angle) * out),
      radii: vec(rh, crownH * (0.26 + 0.08 * random()), rh),
      ...lump,
      seed: p.seed * 31 + k + 1,
    });
  }
  const sphere = icosphere(byDetail(p.detail, [0, 1, 2]));
  const clumps = specs.map((spec) => lumpyPoints(sphere, spec));
  const fit = fitBox(boundsOf(clumps), radius, radius, h);
  const foliage = new MeshBuilder();
  for (const points of clumps) addFlatFaces(foliage, points.map(fit.map), sphere.faces);

  const trunk = new MeshBuilder();
  const r0 = 0.024 * h;
  const rTop = 0.72 * r0;
  // From the axis on the ground, so the trunk's foot closes it.
  const flare = new ProfilePen(0, 0)
    .to(1.45 * r0, 0)
    .quarter(-0.45 * r0, 0.06 * h, false, byDetail(p.detail, [1, 2, 3]))
    .to(rTop, forkY)
    .to(0, forkY)
    .open();
  latheInto(trunk, flare, { segments: byDetail(p.detail, [6, 8, 12]) });
  // Limbs start inside the trunk top and end at the clump centres, so both ends are hidden; the leader runs to the top clump.
  const sides = byDetail(p.detail, [4, 5, 7]);
  specs.forEach((spec, k) => {
    const end = fit.map(spec.centre);
    const towards = new THREE.Vector3(end.x, 0, end.z);
    if (towards.lengthSq() > 1e-12) towards.normalize().multiplyScalar(0.3 * rTop);
    const start = vec(towards.x, forkY - 0.8 * rTop, towards.z);
    const base = (k === 0 ? 0.62 : 0.5) * rTop;
    const mid = start.clone().lerp(end, 0.45);
    mid.y += 0.08 * start.distanceTo(end);
    const path = p.detail === 'low' ? [start, end] : [start, mid, end];
    const radii = p.detail === 'low' ? [base, 0.3 * base] : [base, 0.65 * base, 0.3 * base];
    tubeInto(trunk, path, radii, sides);
  });
  return Object.freeze({ trunk: trunk.build(), foliage: foliage.build() });
}

// ---------------------------------------------------------------- hedge

export interface HedgeParams {
  /** Length along x, metres. Default 3. */
  readonly length?: number;
  /** Height, metres. Default 0.9. */
  readonly height?: number;
  /** Thickness along z, metres. Default 0.7. */
  readonly width?: number;
  /** Variant of the clipped surface's irregularity: a whole number from 0 to 1,000,000. Default 0. */
  readonly seed?: number;
  /** Grid spacing: 'low' 0.8 m, 'medium' (default) 0.4 m, 'high' 0.2 m, with 1, 2 or 4 steps round each softened edge. */
  readonly detail?: Detail;
}

interface HedgeFull {
  readonly length: number;
  readonly height: number;
  readonly width: number;
  readonly seed: number;
  readonly detail: Detail;
}

/**
 * A clipped box hedge: a box whose top edges and end corners are rounded (radius min(0.18, a quarter of the width, height or length)), pressed in by up to 3 cm of seeded unevenness.
 * Origin at the base centre; the box is exactly x in [−length/2, length/2], y in [0, height], z in [−width/2, width/2]. Its bottom face, on the ground, closes it.
 */
export function hedge(params: HedgeParams = {}): THREE.BufferGeometry {
  const part = 'hedge';
  const length = positive(part, 'length', params.length ?? 3);
  const height = positive(part, 'height', params.height ?? 0.9);
  const width = positive(part, 'width', params.width ?? 0.7);
  const seed = integer(part, 'seed', params.seed ?? 0, 0, MAX_SEED);
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: HedgeFull = { length, height, width, seed, detail };
  return cached(part, full, () => buildHedge(full));
}

/** Samples from −half to half: `band` steps across each rounded margin `round`, even steps of at most `step` between. */
function spanSamples(half: number, round: number, step: number, band: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < band; k++) out.push(-half + (round * k) / band);
  const inner = 2 * (half - round);
  const count = Math.max(1, Math.ceil(inner / step - 1e-9));
  for (let k = 0; k < count; k++) out.push(-half + round + (inner * k) / count);
  for (let k = 0; k <= band; k++) out.push(half - round + (round * k) / band);
  return out;
}

/** Samples from 0 to top: even steps up to the rounded margin, then `band` steps across it. */
function riseSamples(top: number, round: number, step: number, band: number): number[] {
  const out: number[] = [];
  const body = top - round;
  const count = Math.max(1, Math.ceil(body / step - 1e-9));
  for (let k = 0; k < count; k++) out.push((body * k) / count);
  for (let k = 0; k <= band; k++) out.push(body + (round * k) / band);
  return out;
}

interface SurfacePoint {
  readonly p: THREE.Vector3;
  readonly n: THREE.Vector3;
}

function buildHedge(p: HedgeFull): THREE.BufferGeometry {
  const round = Math.min(0.18, 0.25 * Math.min(p.width, p.height, p.length));
  const depth = Math.min(0.03, 0.05 * Math.min(p.width, p.height));
  const step = byDetail(p.detail, [0.8, 0.4, 0.2]);
  const band = byDetail(p.detail, [1, 2, 4]);
  const hx = p.length / 2;
  const hz = p.width / 2;
  const top = p.height;
  const ix = hx - round;
  const iz = hz - round;
  const iy = top - round;
  // A point of the plain box maps onto the rounded box (the inner box grown by `round`), then moves in along its normal by the noise.
  const shape = (x: number, y: number, z: number): SurfacePoint => {
    const q = vec(Math.min(Math.max(x, -ix), ix), Math.min(y, iy), Math.min(Math.max(z, -iz), iz));
    const n = vec(x - q.x, y - q.y, z - q.z).normalize();
    const surface = q.addScaledVector(n, round);
    const coarse = valueNoise(surface.x / 0.5, surface.y / 0.5, surface.z / 0.5, p.seed);
    const fine = valueNoise(surface.x / 0.18 + 31.7, surface.y / 0.18 + 7.3, surface.z / 0.18 + 2.9, p.seed + 1);
    const bump = depth * (0.5 + 0.5 * (0.7 * coarse + 0.3 * fine));
    return { p: surface.addScaledVector(n, -bump), n };
  };
  const xs = spanSamples(hx, round, step, band);
  const zs = spanSamples(hz, round, step, band);
  const ys = riseSamples(top, round, step, band);
  // Each face: rows[j][i] and whether its natural (∂i × ∂j) front must be flipped to face out.
  const faces: { rows: SurfacePoint[][]; flip: boolean }[] = [
    { rows: zs.map((z) => xs.map((x) => shape(x, top, z))), flip: true },
    { rows: ys.map((y) => xs.map((x) => shape(x, y, hz))), flip: false },
    { rows: ys.map((y) => xs.map((x) => shape(x, y, -hz))), flip: true },
    { rows: ys.map((y) => zs.map((z) => shape(hx, y, z))), flip: true },
    { rows: ys.map((y) => zs.map((z) => shape(-hx, y, z))), flip: false },
  ];
  const fit = fitBox(boundsOf(faces.flatMap((face) => face.rows.map((row) => row.map((s) => s.p)))), hx, hz, top);
  const builder = new MeshBuilder();
  for (const face of faces) {
    const base = builder.vertexCount;
    const nu = face.rows[0]?.length ?? 0;
    for (const row of face.rows) {
      for (const s of row) {
        const q = fit.map(s.p);
        builder.vertex(q.x, q.y, q.z, s.n.x / fit.scale.x, s.n.y / fit.scale.y, s.n.z / fit.scale.z, q.x + q.z, q.y);
      }
    }
    for (let j = 0; j < face.rows.length - 1; j++) {
      for (let i = 0; i < nu - 1; i++) {
        const a = base + j * nu + i;
        const b = a + 1;
        const c = a + nu + 1;
        const d = a + nu;
        if (face.flip) builder.quad(a, d, c, b);
        else builder.quad(a, b, c, d);
      }
    }
  }
  // The bottom, on the ground, over the sides' bottom rows: round from +Z (x rising), down +X (z falling), along −Z (x falling) and up −X (z rising).
  const foot = [
    ...xs.map((x) => shape(x, 0, hz)),
    ...[...zs].reverse().map((z) => shape(hx, 0, z)),
    ...[...xs].reverse().map((x) => shape(x, 0, -hz)),
    ...zs.map((z) => shape(-hx, 0, z)),
  ].map((s) => fit.map(s.p));
  const outline = foot.filter((p, i) => p.distanceTo(foot[(i + foot.length - 1) % foot.length] ?? p) > 1e-9).map((p) => [p.x, p.z] as const);
  builder.planar(outline, [], vec(0, 0, 0), vec(1, 0, 0), vec(0, 0, 1));
  return builder.build();
}

// ---------------------------------------------------------------- fountain

export interface FountainJets {
  /** Jets along x: a whole number from 1 to 100. */
  readonly cols: number;
  /** Jets along z: a whole number from 1 to 100. */
  readonly rows: number;
  /** Jet height above the water surface, metres. Default 2.5. */
  readonly height?: number;
  /** Keep only the outermost rows and columns of the grid: a ring of jets round the pool. Default false. */
  readonly ring?: boolean;
}

export interface FountainParams {
  /** Outer length of the basin along x, over the coping, metres. Default 30. */
  readonly length?: number;
  /** Outer width of the basin along z, over the coping, metres. Default 9. */
  readonly width?: number;
  /** Width of the granite coping on top of the basin wall, metres. Default 0.45. */
  readonly copingWidth?: number;
  /** Height of the coping top above the ground, metres, from 0.1 to 3. Default 0.5 (sitting height). */
  readonly copingHeight?: number;
  /** How far the water surface lies below the coping top, metres, from 0.02 to copingHeight − 0.07. Default 0.15. */
  readonly waterDepth?: number;
  /** A grid of vertical jets spread evenly over the pool, or false for none. Default { cols: 12, rows: 2, height: 2.5 }. */
  readonly jets?: FountainJets | false;
  /** Rounding of the coping arrises and facets per jet: 'low', 'medium' (default) or 'high'. */
  readonly detail?: Detail;
}

/** A fountain's materials. */
export interface Fountain {
  /** Coping, basin walls and floor, closed (granite). */
  readonly stone: THREE.BufferGeometry;
  /** The flat water surface, a single-sided sheet facing +Y, meant to be seen from above (water). */
  readonly water: THREE.BufferGeometry;
  /** Every jet in one geometry: closed, tapered low-poly columns (jet). Absent when `jets` is false. */
  readonly jets?: THREE.BufferGeometry;
}

/** The basin floor sits this far above grade, clear of the plaza paving under it. */
export const FOUNTAIN_FLOOR = 0.02;

const DEFAULT_JETS: FountainJets = { cols: 12, rows: 2, height: 2.5 };

interface FountainFull {
  readonly length: number;
  readonly width: number;
  readonly copingWidth: number;
  readonly copingHeight: number;
  readonly waterDepth: number;
  readonly jets: { readonly cols: number; readonly rows: number; readonly height: number; readonly ring: boolean } | false;
  readonly detail: Detail;
}

/**
 * A long rectangular granite fountain basin like the 2014 Koch Plaza pools: a low wall under an overhanging coping (overhang min(3 cm, copingWidth / 10)), a floor 2 cm above grade, a flat water surface, and rows of vertical jets.
 * Origin at ground level in the basin's centre. The stone's box is exactly x in [−length/2, length/2], y in [0, copingHeight], z in [−width/2, width/2]; the water lies at y = copingHeight − waterDepth; jets rise `jets.height` above it.
 */
export function fountain(params: FountainParams = {}): Fountain {
  const part = 'fountain';
  const length = positive(part, 'length', params.length ?? 30);
  const width = positive(part, 'width', params.width ?? 9);
  const copingWidth = positive(part, 'copingWidth', params.copingWidth ?? 0.45);
  const narrow = Math.min(length, width);
  need(part, 2 * copingWidth + 0.2 <= narrow, `copingWidth is ${String(copingWidth)} for a ${String(length)} × ${String(width)} m basin; the pool needs at least 0.2 m between the copings, so use at most ${String((narrow - 0.2) / 2)}.`);
  const copingHeight = inRange(part, 'copingHeight', params.copingHeight ?? 0.5, 0.1, 3);
  const waterDepth = inRange(part, 'waterDepth', params.waterDepth ?? 0.15, 0.02, copingHeight - FOUNTAIN_FLOOR - 0.05);
  const asked = params.jets ?? DEFAULT_JETS;
  const jets =
    asked === false
      ? false
      : {
          cols: integer(part, 'jets.cols', asked.cols, 1, 100),
          rows: integer(part, 'jets.rows', asked.rows, 1, 100),
          height: positive(part, 'jets.height', asked.height ?? 2.5),
          ring: asked.ring ?? false,
        };
  const detail = checkDetail(part, params.detail ?? 'medium');
  const full: FountainFull = { length, width, copingWidth, copingHeight, waterDepth, jets, detail };
  return cached(part, full, () => buildFountain(full));
}

function buildFountain(p: FountainFull): Fountain {
  const overhang = Math.min(0.03, 0.1 * p.copingWidth);
  const thickness = Math.min(0.15, 0.4 * p.copingHeight);
  const arris = Math.min(0.02, 0.25 * thickness, 0.2 * p.copingWidth);
  const segments = byDetail(p.detail, [1, 2, 4]);
  const ch = p.copingHeight;
  // The sweep path runs along the wall's outer face; d is outward from it, so the coping's inner edge is at d = overhang − copingWidth.
  const hx = p.length / 2 - overhang;
  const hz = p.width / 2 - overhang;
  const inner = p.copingWidth - overhang;
  const profile = new ProfilePen(0, 0)
    .to(0, ch - thickness)
    .to(overhang, ch - thickness)
    .to(overhang, ch - arris)
    .quarter(-arris, arris, true, segments)
    .to(overhang - p.copingWidth + arris, ch)
    .quarter(-arris, -arris, true, segments)
    .to(-inner, FOUNTAIN_FLOOR)
    .open();
  const stone = new MeshBuilder();
  sweepInto(
    stone,
    profile,
    [
      [-hx, 0, hz],
      [hx, 0, hz],
      [hx, 0, -hz],
      [-hx, 0, -hz],
    ],
    { closed: true },
  );
  const px = hx - inner;
  const pz = hz - inner;
  const sheet = (y: number): THREE.Vector3[] => [vec(-px, y, pz), vec(px, y, pz), vec(px, y, -pz), vec(-px, y, -pz)];
  stone.polygon(sheet(FOUNTAIN_FLOOR));
  const waterY = ch - p.waterDepth;
  const water = new MeshBuilder();
  water.polygon(sheet(waterY));
  if (p.jets === false) return Object.freeze({ stone: stone.build(), water: water.build() });

  const { cols, rows, height, ring } = p.jets;
  const cellX = (2 * px) / cols;
  const cellZ = (2 * pz) / rows;
  const rb = Math.min(0.08, 0.2 * Math.min(cellX, cellZ));
  // A closed column: a disc 3 cm under the water, narrowing up the jet, a plume where the water turns over.
  const jetProfile = new ProfilePen(0, -0.03)
    .to(rb, -0.03)
    .to(0.6 * rb, 0.75 * height)
    .to(1.1 * rb, 0.92 * height)
    .to(0, height)
    .open();
  const single = new MeshBuilder();
  latheInto(single, jetProfile, { segments: byDetail(p.detail, [4, 6, 8]) });
  const jet = single.build();
  const jetsBuilder = new MeshBuilder();
  const place = new THREE.Matrix4();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (ring && i > 0 && i < cols - 1 && j > 0 && j < rows - 1) continue;
      jetsBuilder.append(jet, place.makeTranslation(-px + (i + 0.5) * cellX, waterY, -pz + (j + 0.5) * cellZ));
    }
  }
  return Object.freeze({ stone: stone.build(), water: water.build(), jets: jetsBuilder.build() });
}
