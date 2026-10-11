/**
 * Chapter `site`: the schist outcrops (history.md section 1, `site-rock`) and the park's trees (`site-trees-park`).
 * The outcrop north of the American Wing is placed from the 2018 orthophoto ([S5]: grey rock at X +143..+158, Z −144..−123, the one King of Hearts 2013
 * shows); trees are OpenStreetMap's tree nodes in the park ([S1]) plus a seeded scatter in the wooded and open parts of the park, kept clear of the building,
 * the paths and the sight lines of the three ref-park-* photographs, so the facades stay visible from those cameras.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { StepDef } from '../../build/types.js';
import { SITE_MAX_X, SITE_MIN_X, SITE_MIN_Z } from '../frame.js';
import { tree } from '../lib/index.js';
import { palette } from '../palette.js';
import { footprintClearance } from './footprint.js';
import type { Point } from './footprint.js';
import { parkY, zoneAt } from './ground.js';
import { lumpy } from './lumps.js';
import { siteMaterials } from './materials.js';
import { EAST_DRIVE, FOOTPATHS, TRANSVERSE } from './paths.js';
import { seeded } from './random.js';

// ---------------------------------------------------------------- rocks

/** A chunky, flattened lump of schist 1 m across and 1 m tall (y from 0), coarsely faceted; the matrix gives each outcrop its size. */
function rockGeometry(seed: number): BufferGeometry {
  return lumpy(seed, 1, 6, 0.45, (p) => new Vector3(p.x * 0.5, (Math.max(-0.25, p.y) + 0.25) / 1.45, p.z * 0.5));
}

const ROCKS: readonly BufferGeometry[] = [rockGeometry(11), rockGeometry(23), rockGeometry(37)];

/** Outcrops: centre, plan size (x, z), height and yaw. The big sheet north of the American Wing and a few smaller ones beside it ([S5], E). */
const OUTCROPS: readonly { x: number; z: number; sx: number; sz: number; h: number; yaw: number }[] = [
  { x: 150.5, z: -133.5, sx: 13, sz: 9, h: 2.2, yaw: 0.35 },
  { x: 147.5, z: -126, sx: 7, sz: 5, h: 1.6, yaw: -0.4 },
  { x: 154, z: -141, sx: 6, sz: 4.5, h: 1.2, yaw: 1.1 },
  { x: 157, z: -128, sx: 4, sz: 3, h: 0.9, yaw: 2.2 },
  { x: 176, z: -152, sx: 6, sz: 4, h: 1.3, yaw: 0.8 },
  { x: -58, z: -238, sx: 8, sz: 5, h: 1.4, yaw: -0.6 },
  { x: -72, z: -244, sx: 5, sz: 3.5, h: 1.0, yaw: 0.9 },
];

export const rockStep: StepDef = {
  id: 'site-rock',
  chapter: 'site',
  title: 'Expose the schist outcrops',
  detail: 'Ridges of Manhattan schist break the lawn north of the American Wing and the knoll of Cleopatra’s Needle.',
  motion: { kind: 'rise', distance: 2 },
  stagger: 'order',
  build(kit) {
    OUTCROPS.forEach((o, k) => {
      const ground = Math.min(parkY(o.x - o.sx / 2, o.z), parkY(o.x + o.sx / 2, o.z), parkY(o.x, o.z - o.sz / 2), parkY(o.x, o.z + o.sz / 2));
      // Sunk a third of its height into the lawn, the lowest side of its footprint deciding.
      const m = new Matrix4().makeRotationY(o.yaw).scale(new Vector3(o.sx, o.h, o.sz)).setPosition(o.x, ground - o.h / 3, o.z);
      kit.add(ROCKS[k % ROCKS.length] ?? rockGeometry(1), siteMaterials.schist, m, k);
    });
  },
};

// ---------------------------------------------------------------- trees

/** OpenStreetMap's tree nodes in the park within the site (world frame, 1 cm), not counting the plaza's 52 allée trees. */
const OSM_TREES: readonly Point[] = [
  [179.24, 20.17], [168.1, -10.33], [181.22, -56.06], [77.89, -235.89], [83.96, -242.98], [81.52, -248.16], [76.34, -254.86], [61.6, -239.36], [66.28, -224.04],
  [53.23, -230.77], [58.49, -225.13], [45.46, -241.33], [23.11, -233.44], [23.07, -246.27], [6.89, -257.01], [14.36, -259.92], [2.35, -250.22], [-3.37, -232.61],
  [-27.24, -231.31], [140.72, -258.02], [136.46, -237.18], [158.18, -235.47], [155.73, -220.48], [158.91, -227.88], [180.13, -213.73], [174.62, -210.9],
  [103.56, -240.22], [99.78, -246.23], [99.85, -255.41], [111.51, -253.42], [116.32, -255.87], [179.35, -205.63], [29.85, -222.52], [34.13, -220.28],
  [41.19, -220.48], [-34.21, -254.6], [-22.87, -247.71], [-22.4, -238.17], [-36.42, -221.14], [121.44, -235.82], [120.77, -244.09], [-168.82, -69.94],
  [-179.83, -49.33], [-173.6, -36.73], [-41.38, -162.42], [-44.46, -147.51], [-58.34, -179.94], [75.66, -163.94], [37.09, -145.12], [41.38, -153.19],
  [39.86, -162.45], [63.58, -171.74], [153.89, -163.33],
];

/** Where the seeded scatter goes: a polygon and the mean spacing of its trees (E, from the 2018 orthophoto). */
const GROVES: readonly { readonly polygon: readonly Point[]; readonly spacing: number }[] = [
  // The wood south-west of the building (OSM natural=wood 1424812139), thick along the avenue's park edge.
  { polygon: [[-200, -30], [-186, -40], [-170, -60], [-163, -95], [-170, -150], [-185, -175], [-200, -185]], spacing: 9 },
  // Between the south-west corner and East Drive.
  { polygon: [[-150, -170], [-100, -185], [-130, -205], [-170, -215], [-200, -222], [-200, -190]], spacing: 13 },
  // North and north-east of the American Wing, past the path.
  { polygon: [[172, -95], [200, -80], [200, -200], [182, -200], [176, -160], [170, -125]], spacing: 11 },
  // The park north of the building, east of the transverse road.
  { polygon: [[190, 18], [200, 18], [200, -60], [196, -40]], spacing: 9 },
  // West of the building beyond East Drive: open lawns with clumps.
  { polygon: [[-190, -232], [190, -232], [190, -260], [-190, -260]], spacing: 22 },
  // Between the building and East Drive, west of the Kravis and Wallace wings and the American Wing.
  { polygon: [[-125, -163], [-35, -168], [-35, -185], [-125, -182]], spacing: 16 },
  { polygon: [[40, -165], [140, -165], [140, -195], [40, -195]], spacing: 18 },
];

/** Sight lines of the park photographs (exterior-images.md, primaries 6 to 8): no tree within `clear` metres of the segment camera → target. */
const SIGHT_LINES: readonly { readonly from: Point; readonly to: Point; readonly clear: number }[] = [
  { from: [-200, -92], to: [-151.6, -68], clear: 9 },
  { from: [175, -140], to: [140, -125], clear: 9 },
  { from: [230, -110], to: [153, -72], clear: 6 },
];

function segmentDistance(p: Point, a: Point, b: Point): number {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez || 1)));
  return Math.hypot(p[0] - (a[0] + t * ex), p[1] - (a[1] + t * ez));
}

function polylineDistance(p: Point, line: readonly Point[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let k = 1; k < line.length; k += 1) best = Math.min(best, segmentDistance(p, line[k - 1] ?? p, line[k] ?? p));
  return best;
}

function insidePolygon(polygon: readonly Point[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, zi] = polygon[i] ?? [0, 0];
    const [xj, zj] = polygon[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether a tree of crown radius `r` may stand at p: crown inside the site, in the park, off the paths, clear of the building, the outcrops and the sight lines. */
function open(p: Point, r: number): boolean {
  const [x, z] = p;
  if (x < SITE_MIN_X + r + 0.5 || x > SITE_MAX_X - r - 0.5 || z < SITE_MIN_Z + r + 0.5) return false;
  if (zoneAt(x, z) !== 'park') return false;
  if (footprintClearance(x, z) < r + 2) return false;
  if (polylineDistance(p, EAST_DRIVE) < 6.5 || polylineDistance(p, TRANSVERSE) < 10) return false;
  if (FOOTPATHS.some((line) => polylineDistance(p, line) < 3.5)) return false;
  if (OUTCROPS.some((o) => Math.hypot(x - o.x, z - o.z) < Math.max(o.sx, o.sz) / 2 + 1.5)) return false;
  return !SIGHT_LINES.some((s) => segmentDistance(p, s.from, s.to) < s.clear + r * 0.5);
}

/** Tree variants: one geometry per seed, scaled per tree; the crowns take three greens by turns. */
const VARIANT_HEIGHT = 16;
const CROWNS: readonly Material[] = [palette.foliage, siteMaterials.foliageLight, siteMaterials.foliageDeep];
const VARIANTS = [3, 8, 14, 21, 29, 40].map((seed, k) => ({
  shape: tree({ height: VARIANT_HEIGHT, spread: VARIANT_HEIGHT * (0.72 + 0.04 * (k % 3)), seed, detail: 'medium' }),
  crown: CROWNS[k % CROWNS.length] ?? palette.foliage,
}));

export interface PlacedTree {
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly yaw: number;
  readonly variant: number;
}

function scatter(): PlacedTree[] {
  const random = seeded(1872);
  const placed: PlacedTree[] = [];
  const far = (x: number, z: number, d: number): boolean => placed.every((t) => Math.hypot(t.x - x, t.z - z) >= d);
  // Each candidate draws its size first, so the clearance tests use its own crown.
  const tryAdd = (x: number, z: number, spacing: number): void => {
    const scale = 0.7 + 0.65 * random();
    const yaw = random() * Math.PI * 2;
    const variant = Math.floor(random() * VARIANTS.length);
    // A turned crown's box reaches √2 times its half-spread.
    const radius = ((VARIANT_HEIGHT * 0.8 * scale) / 2) * Math.SQRT2;
    if (open([x, z], radius) && far(x, z, spacing)) placed.push({ x, z, scale, yaw, variant });
  };
  for (const [x, z] of OSM_TREES) tryAdd(x, z, 5);
  for (const grove of GROVES) {
    const xs = grove.polygon.map((p) => p[0]);
    const zs = grove.polygon.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    const tries = Math.ceil(((x1 - x0) * (z1 - z0)) / (grove.spacing * grove.spacing)) * 3;
    for (let k = 0; k < tries; k += 1) {
      const x = x0 + (x1 - x0) * random();
      const z = z0 + (z1 - z0) * random();
      if (insidePolygon(grove.polygon, x, z)) tryAdd(x, z, grove.spacing * 0.8);
    }
  }
  return placed;
}

/** The park's trees, placed once. */
export const PARK_TREES: readonly PlacedTree[] = scatter();

export const parkTreesStep: StepDef = {
  id: 'site-trees-park',
  chapter: 'site',
  title: 'Plant the park trees',
  detail: 'Trees fill the wood south of the museum, ring the lawns and line East Drive, kept clear of the facades.',
  motion: { kind: 'grow' },
  stagger: 'radial',
  weight: 1.2,
  build(kit) {
    PARK_TREES.forEach((t, k) => {
      const variant = VARIANTS[t.variant] ?? VARIANTS[0];
      if (variant === undefined) return;
      const y = parkY(t.x, t.z) - 0.15;
      const m = new Matrix4().makeRotationY(t.yaw).scale(new Vector3(t.scale, t.scale, t.scale)).setPosition(t.x, y, t.z);
      const crown: Material = variant.crown;
      kit.add(variant.shape.trunk, palette.bark, m, k);
      kit.add(variant.shape.foliage, crown, m, k);
    });
  },
};
