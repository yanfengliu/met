/**
 * Chapter `site`: East Drive, the park's paths and the 86th Street transverse road (history.md section 1, `site-park-paths`).
 * Centrelines are OpenStreetMap ways (exterior.md [S1]; extract of 2026-10-11) converted to the world frame and rounded to 1 m; widths are estimates (E)
 * from the 2018 orthophoto ([S5]). Each class of path is one draped strip lying just above the park's terrain, broken wherever it leaves the park.
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { StepDef } from '../../build/types.js';
import { SITE_MAX_X, SITE_MAX_Z, SITE_MIN_X, SITE_MIN_Z } from '../frame.js';
import { MeshBuilder } from '../lib/index.js';
import { palette } from '../palette.js';
import { insideFootprint } from './footprint.js';
import type { Point } from './footprint.js';
import { terrainY, zoneAt } from './ground.js';
import { siteMaterials } from './materials.js';

type Line = readonly Point[];

/** East Drive (OSM 46613691, 1081021577, 1081021576), about 9 m wide in the orthophoto. */
export const EAST_DRIVE: Line = [
  [-255, -228], [-212, -229], [-194, -227], [-174, -224], [-152, -218], [-126, -210], [-109, -206], [-92, -203], [-71, -200], [-51, -199], [-30, -199], [-8, -200], [4, -202],
  [36, -207], [56, -208], [89, -208], [114, -207], [133, -205], [151, -201], [167, -195], [180, -187], [194, -178], [210, -166], [225, -152],
];
const EAST_DRIVE_WIDTH = 9;

/** The 86th Street transverse road from 84th Street (OSM 489090277), from the sidewalk's park edge north-west; about 15 m wide. */
export const TRANSVERSE: Line = [[167, 21.5], [172, 7], [179, -11], [184, -23], [189, -35], [194, -46], [197, -53], [202, -62], [207, -71]];
const TRANSVERSE_WIDTH = 15;

/** Footpaths (OSM highway=footway and steps in the park), about 4 m wide. */
export const FOOTPATHS: readonly Line[] = [
  // 37183215: west of the building, between it and East Drive.
  [[-127, -184], [-109, -185], [-96, -180], [-84, -174], [-70, -172], [-57, -173], [-45, -178], [-37, -182], [-27, -186], [-15, -191], [-1, -195], [14, -196], [28, -195], [40, -193], [55, -187]],
  // 739699911: from 84th Street along the transverse and round the American Wing to the west side.
  [[164, 15], [170, -6], [190, -55], [189, -67], [187, -81], [182, -100], [177, -113], [172, -125], [168, -133], [167, -140], [166, -149], [167, -158], [169, -170], [169, -174], [162, -176], [154, -174], [139, -169], [129, -167], [110, -167], [97, -170], [86, -174], [76, -178], [62, -184], [55, -187]],
  // 332132154: from 79th Street north-west to the building's south-west corner.
  [[-200, -44], [-196, -53], [-195, -62], [-193, -76], [-192, -85], [-188, -94], [-182, -103], [-176, -114], [-171, -129], [-166, -147], [-161, -158], [-155, -165]],
  // 104910782 Wallach Walk, its east end.
  [[-192, -85], [-200, -88]],
  // 318474842, 318474843 Greywacke Arch, 33890613.
  [[-155, -165], [-141, -177], [-127, -184], [-124, -196], [-122, -203], [-118, -219], [-115, -226], [-113, -234], [-107, -251], [-104, -260]],
  // 318474841, 893417435.
  [[-79, -172], [-72, -183], [-66, -191], [-61, -199]],
  [[-84, -143], [-84, -174]],
  // 179685273 and the steps 429887440/445 by Cleopatra's Needle.
  [[-53, -240], [-48, -246], [-42, -249], [-31, -252], [-23, -258]],
  [[-68, -260], [-66, -253], [-64, -243]],
  // 39991944, the paths beyond East Drive near the site's west edge.
  [[-133, -260], [-125, -258], [-117, -255], [-107, -251], [-100, -250], [-80, -258]],
  [[-32, -260], [-23, -258], [-13, -259], [-5, -260]],
  [[163, -251], [173, -243], [182, -235], [187, -225], [187, -215], [186, -207], [184, -198], [180, -187], [177, -180], [169, -174]],
  [[177, -180], [183, -179], [194, -171], [200, -165]],
];
const FOOTPATH_WIDTH = 4;
/** Paths lie this far above the park's terrain, clear of its 2.5 m facets. */
const LIFT = 0.05;
/** Strips are resampled at most this far apart, so they follow the terrain. */
const SAMPLE = 2;

const inSite = (x: number, z: number): boolean => x >= SITE_MIN_X && x <= SITE_MAX_X && z >= SITE_MIN_Z && z <= SITE_MAX_Z;
const onPark = (x: number, z: number): boolean => inSite(x, z) && !insideFootprint(x, z) && zoneAt(x, z) === 'park';

/** Points of a polyline resampled every SAMPLE metres or less. */
function resample(line: Line): Point[] {
  const out: Point[] = [];
  for (let k = 1; k < line.length; k += 1) {
    const a = line[k - 1] ?? [0, 0];
    const b = line[k] ?? a;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / SAMPLE));
    for (let s = k === 1 ? 0 : 1; s <= n; s += 1) out.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
  }
  return out;
}

/** Appends a draped strip of `width` along each line to `builder`, broken where it leaves the park. */
function strips(builder: MeshBuilder, lines: readonly Line[], width: number): void {
  const half = width / 2;
  const height = (x: number, z: number): number => terrainY('park', x, z) + LIFT;
  for (const line of lines) {
    const pts = resample(line);
    // Edge points either side of each sample; a quad joins two neighbouring pairs when all four lie on the park.
    const pairs = pts.map((p, k) => {
      const before = pts[Math.max(0, k - 1)] ?? p;
      const after = pts[Math.min(pts.length - 1, k + 1)] ?? p;
      const len = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1;
      const nx = -(after[1] - before[1]) / len;
      const nz = (after[0] - before[0]) / len;
      const l: Point = [p[0] + nx * half, p[1] + nz * half];
      const r: Point = [p[0] - nx * half, p[1] - nz * half];
      return { l, r, ok: onPark(l[0], l[1]) && onPark(r[0], r[1]) && onPark(p[0], p[1]) };
    });
    const ids = new Map<number, readonly [number, number]>();
    const vertices = (k: number): readonly [number, number] => {
      let v = ids.get(k);
      if (v === undefined) {
        const { l, r } = pairs[k] ?? { l: [0, 0], r: [0, 0] };
        v = [builder.vertex(l[0], height(l[0], l[1]), l[1], 0, 1, 0), builder.vertex(r[0], height(r[0], r[1]), r[1], 0, 1, 0)];
        ids.set(k, v);
      }
      return v;
    };
    for (let k = 1; k < pairs.length; k += 1) {
      if (!(pairs[k - 1]?.ok ?? false) || !(pairs[k]?.ok ?? false)) continue;
      const [pl, pr] = vertices(k - 1);
      const [l, r] = vertices(k);
      // The quad from the previous pair of edge points to this one, facing up.
      builder.quad(pl, l, r, pr);
    }
  }
}

function strip(lines: readonly Line[], width: number): BufferGeometry {
  const builder = new MeshBuilder();
  strips(builder, lines, width);
  const geometry = builder.build();
  geometry.computeVertexNormals();
  return geometry;
}

const IDENTITY = new Matrix4();

export const pathsStep: StepDef = {
  id: 'site-park-paths',
  chapter: 'site',
  title: 'Lay East Drive and the park paths',
  detail: 'East Drive curves round the west side; asphalt paths cross the lawns, and the 86th Street transverse leaves the avenue at 84th Street.',
  motion: { kind: 'rise', distance: 0.4 },
  stagger: 'order',
  build(kit) {
    kit.add(strip([EAST_DRIVE], EAST_DRIVE_WIDTH), palette.asphalt, IDENTITY, 0);
    kit.add(strip([TRANSVERSE], TRANSVERSE_WIDTH), palette.asphalt, IDENTITY, 1);
    kit.add(strip(FOOTPATHS, FOOTPATH_WIDTH), siteMaterials.pathAsphalt, IDENTITY, 2);
  },
};
