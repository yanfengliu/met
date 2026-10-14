/**
 * The site's ground levels: Fifth Avenue's sidewalks and roadway, the park's terrain, and the north and south drive cuts.
 * Every level is a pure function of (x, z) in world metres (docs/design/spec.md, World frame). Sources are docs/research/exterior.md section 1 ([F6], [F7], [F8],
 * [F10], [F11]) and src/model/frame.ts; the 2018 orthophoto and OpenStreetMap (exterior.md [S1], [S5]) place the drives, the park edge and the cross streets.
 * Zones are axis-aligned rectangles; where two zones meet at different heights the terrain has a vertical face (a curb or a retaining wall), built by grid.ts.
 */
import {
  CURB_EAST_Z,
  CURB_WEST_Z,
  FIFTH_AVE_CENTRELINE_Z,
  MAIN_FLOOR_Y,
  PARK_GROUND_Y_NORTH,
  PARK_GROUND_Y_WEST_AMERICAN,
  PARK_GROUND_Y_WEST_LEHMAN,
  PARK_GROUND_Y_WEST_SOUTH,
  ROADWAY_Y,
  SIDEWALK_Y_NORTH_END,
  SIDEWALK_Y_SOUTH_END,
  SITE_MAX_X,
  SITE_MIN_X,
  SITE_MIN_Z,
} from '../frame.js';

/**
 * Sidewalk level along Fifth Avenue at Z +24.5, as (X, Y): exterior.md [F6], DEM samples (M) between X −113 and +167; the two ends past them are
 * estimates (E) that flatten the fall toward 80th Street, so the south garage drive can still descend to its −2.2 at Z −34.5 ([F11]).
 */
export const STREET_PROFILE: readonly (readonly [number, number])[] = [
  [SITE_MIN_X, -2.1],
  [-162, -2.0],
  [-113, SIDEWALK_Y_SOUTH_END],
  [-73, -0.77],
  [-33, -0.16],
  [7, 0.04],
  [67, 0.31],
  [97, -0.05],
  [147, SIDEWALK_Y_NORTH_END],
  [167, 1.12],
  [SITE_MAX_X, 1.9],
];

/** Where the profile was sampled across the sidewalk ([F6]: Z +24.5). */
const PROFILE_Z = 24.5;
/** Sidewalk cross-fall toward the curb: 1% (E, the DEM's +0.05 at the foot of the steps, Z +20, against 0.00 at Z +24.5). */
export const CROSS_FALL = 0.01;
/** The curb's reveal: the roadway at the gutter lies this far below the sidewalk ([F10], ROADWAY_Y). */
export const CURB_REVEAL = -ROADWAY_Y;
/** Roadway crown above the gutters on the centreline (E, a typical camber). */
const CROWN = 0.1;
/** The park side of the west sidewalk: OSM's sidewalk centre runs at Z +23..+25, so the park's perimeter wall stands at about +21.5 (E). */
export const PARK_EDGE_Z = 21.5;
/** The east sidewalk ends at the building line opposite (OSM buildings start at Z +50); the model ends there too. */
export const EAST_LINE_Z = 50;
/** The ground ends on the north and south at the site bounds, and on the west at SITE_MIN_Z. */
export const GROUND_MAX_Z = EAST_LINE_Z;
/** Cross streets on the east side (OSM centrelines): East 80th to 84th Street, each 35 ft (10.7 m) curb to curb. */
export const CROSS_STREETS_X: readonly number[] = [-162, -81, 0, 80, 162];
export const CROSS_STREET_HALF_WIDTH = 5.35;

/** The finished frontage surface from the facades to the curb sits on the terrain this far above it; paving lies on top. */
export const PAVING_GAP = 0.03;

/** Piecewise-linear sidewalk level at the profile line ([F6]); X is clamped to the profile's ends. */
export function streetY(x: number): number {
  const first = STREET_PROFILE[0] ?? [SITE_MIN_X, 0];
  if (x <= first[0]) return first[1];
  for (let i = 1; i < STREET_PROFILE.length; i += 1) {
    const [x1, y1] = STREET_PROFILE[i] ?? first;
    const [x0, y0] = STREET_PROFILE[i - 1] ?? first;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return (STREET_PROFILE[STREET_PROFILE.length - 1] ?? first)[1];
}

/** The finished level of the Met-side sidewalk and the plaza at (x, z), z up to the west curb. */
export function walkWestY(x: number, z: number): number {
  return streetY(x) + CROSS_FALL * (PROFILE_Z - z);
}

/** The finished level of the east sidewalk: level with the west one at its curb, rising 1% toward the buildings. */
export function walkEastY(x: number, z: number): number {
  return walkWestY(x, CURB_WEST_Z) + CROSS_FALL * (z - CURB_EAST_Z);
}

/** The roadway surface: gutters a curb's reveal below each sidewalk, a crown on the centreline ([F10]); also the cross streets' stubs. */
export function roadY(x: number, z: number): number {
  const west = walkWestY(x, CURB_WEST_Z) - CURB_REVEAL;
  const east = walkEastY(x, CURB_EAST_Z) - CURB_REVEAL;
  if (z >= CURB_EAST_Z) return east + CROSS_FALL * (z - CURB_EAST_Z);
  const crown = Math.max(west, east) + CROWN;
  if (z <= FIFTH_AVE_CENTRELINE_Z) return west + ((crown - west) * Math.max(0, z - CURB_WEST_Z)) / (FIFTH_AVE_CENTRELINE_Z - CURB_WEST_Z);
  return crown + ((east - crown) * (z - FIFTH_AVE_CENTRELINE_Z)) / (CURB_EAST_Z - FIFTH_AVE_CENTRELINE_Z);
}

// ---------------------------------------------------------------- drives

/** An axis-aligned rectangle in plan. */
export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** [F11]: both drives cut down to −2.2 at Z −34.5. */
const DRIVE_LOW_Y = -2.2;
/** North service drive: from the 84th Street corner along the north face (X +153.1) to the loading dock; OSM way 37183217 at X +158, fence 739699912 at X +163. */
export const DRIVE_NORTH: Rect = { x0: 153.1, x1: 162.6, z0: -34.5, z1: PARK_EDGE_Z };
/** South garage drive: the loop of OSM way 588194480 between X −184 and −158, beside the south face (X −151.5), turning at Z −29. */
export const DRIVE_SOUTH: Rect = { x0: -186.5, x1: -151.5, z0: -34.5, z1: PARK_EDGE_Z };
/** The planted island inside the south loop (orthophoto 2018), a curb's height above the drive. */
export const ISLAND_SOUTH: Rect = { x0: -179.0, x1: -164.5, z0: -23.0, z1: 15.0 };
/** The 86th Street transverse road's mouth across the sidewalk at 84th Street (OSM way 489090277 meets Fifth Avenue at X +163..+175). */
export const TRANSVERSE_MOUTH: Rect = { x0: 162.6, x1: 176.5, z0: PARK_EDGE_Z, z1: CURB_WEST_Z };

function driveY(rect: Rect, z: number): number {
  const xm = (rect.x0 + rect.x1) / 2;
  const top = walkWestY(xm, PARK_EDGE_Z) - CURB_REVEAL;
  const t = (rect.z1 - z) / (rect.z1 - rect.z0);
  return top + (DRIVE_LOW_Y - top) * Math.min(1, Math.max(0, t));
}

// ---------------------------------------------------------------- park

/** E: the lawn at the foot of the Engelhard Court's curtain wall, just under the court floor (its glass starts 0.3 m below it, roche-north engelhard.ts). */
export const ENGELHARD_LAWN_Y = MAIN_FLOOR_Y - 0.15;

/**
 * Park control points (X, Z, Y). Measured groups come from [F11] (DEM samples) and frame.ts; the rest are estimates (E) that keep the park's surface
 * plausible between them: a knoll for Cleopatra's Needle (OSM 179685272), the park inside its perimeter wall a little above the sidewalk, and the drives' banks.
 */
const PARK_POINTS: readonly (readonly [number, number, number])[] = [
  // [F11] west of the Lehman Wing: +8.6 at Z −185, falling to +4.9..+5.3 at Z −195..−225.
  [0, -185, 8.6],
  [-12, -186, 7.6],
  [12, -186, 7.8],
  [0, -197, PARK_GROUND_Y_WEST_LEHMAN + 0.3],
  [0, -212, PARK_GROUND_Y_WEST_LEHMAN],
  [0, -226, PARK_GROUND_Y_WEST_LEHMAN - 0.2],
  // [F11] west of the Kravis and Wallace wings, X −118..−43 at Z −170: +1.5..+2.9.
  [-118, -170, PARK_GROUND_Y_WEST_SOUTH - 0.4],
  [-80, -170, PARK_GROUND_Y_WEST_SOUTH],
  [-45, -168, PARK_GROUND_Y_WEST_SOUTH + 0.5],
  [-30, -162, 4.0],
  [30, -164, 6.2],
  // [F11] west of the American Wing at Z −170: +6.9..+7.1.
  [60, -170, PARK_GROUND_Y_WEST_AMERICAN - 0.3],
  // E: the lawn before the Engelhard Court's west curtain wall (Z −138.3, X 53.9..87.6) falls to the court floor, so the glass meets it at its foot as the
  // American Wing's glazed slot meets the lawn in King of Hearts 2013 (ref-park-northwest); the 2018 orthophoto shows a park path running up to the glass
  // at X +71. From there it rises to [F11]'s +7.0 at Z −170 (integration, 2026-10-13).
  [55, -139.3, ENGELHARD_LAWN_Y],
  [71, -139.3, ENGELHARD_LAWN_Y],
  [86.5, -139.3, ENGELHARD_LAWN_Y],
  [62, -148, ENGELHARD_LAWN_Y + 1.0],
  [80, -148, ENGELHARD_LAWN_Y + 1.0],
  [95, -170, PARK_GROUND_Y_WEST_AMERICAN],
  [125, -170, PARK_GROUND_Y_WEST_AMERICAN],
  [146, -158, 6.0],
  // [F11] north side, X +163, Z −135..−55: +4.0..+4.4.
  [146, -125, 5.0],
  [163, -135, PARK_GROUND_Y_NORTH],
  [163, -95, PARK_GROUND_Y_NORTH],
  [163, -55, PARK_GROUND_Y_NORTH],
  [166, -36, 3.6],
  [167, -10, 2.4],
  // The transverse road's line from 84th Street (OSM 489090277), a little below the park beside it.
  [167, 19, 0.95],
  [176, -8, 1.6],
  [186, -32, 2.4],
  [196, -54, 3.0],
  [188, 17, 2.4],
  [199, 5, 2.8],
  [199, -30, 3.6],
  [196, -95, 4.6],
  [192, -160, 5.0],
  [180, -215, 5.2],
  [190, -255, 5.0],
  // [F11] south side, X −161: +1.1..+4.1, rising from the avenue toward the park.
  [-161, -42, 1.1],
  [-161, -95, 2.1],
  [-158, -150, 4.0],
  [-190, 17, -1.2],
  [-195, -10, -0.2],
  [-194, -45, 1.0],
  // The east end of Wallach Walk, where Peel 2024 stood (ref-park-south: camera at Y +3, so the path about 1.5 m below it).
  [-200, -92, 1.4],
  [-190, -112, 2.0],
  [-195, -160, 3.4],
  [-185, -215, 3.6],
  [-185, -255, 4.0],
  // The west of the park beyond East Drive (E), and the knoll of Cleopatra's Needle.
  [-120, -215, 3.4],
  [-60, -229, 7.0],
  [-80, -205, 4.4],
  [-35, -205, 5.4],
  [-110, -255, 4.4],
  [-50, -257, 5.2],
  [40, -205, 6.4],
  [90, -205, 6.4],
  [140, -205, 6.0],
  [45, -250, 5.6],
  [110, -250, 5.8],
  [150, -250, 5.4],
];

/** The spline works in hectometres, which keeps its system well conditioned; the surface is the same. */
const SPLINE_SCALE = 100;

/** Thin-plate spline through the park points: f(p) = a0 + a1·x + a2·z + Σ wᵢ φ(|p − pᵢ|), φ(r) = r² ln r. Solved once, here. */
function solveSpline(raw: readonly (readonly [number, number, number])[]): (x: number, z: number) => number {
  const points = raw.map(([x, z, y]) => [x / SPLINE_SCALE, z / SPLINE_SCALE, y] as const);
  const n = points.length;
  const size = n + 3;
  const m: number[][] = Array.from({ length: size }, () => new Array<number>(size + 1).fill(0));
  const phi = (r: number): number => (r < 1e-9 ? 0 : r * r * Math.log(r));
  points.forEach(([xi, zi, yi], i) => {
    const row = m[i] ?? [];
    points.forEach(([xj, zj], j) => {
      row[j] = phi(Math.hypot(xi - xj, zi - zj));
    });
    row[n] = 1;
    row[n + 1] = xi;
    row[n + 2] = zi;
    row[size] = yi;
    const r0 = m[n] ?? [];
    const r1 = m[n + 1] ?? [];
    const r2 = m[n + 2] ?? [];
    r0[i] = 1;
    r1[i] = xi;
    r2[i] = zi;
  });
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < size; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < size; r += 1) if (Math.abs(m[r]?.[c] ?? 0) > Math.abs(m[pivot]?.[c] ?? 0)) pivot = r;
    const swap = m[c] ?? [];
    m[c] = m[pivot] ?? [];
    m[pivot] = swap;
    const row = m[c] ?? [];
    const lead = row[c] ?? 1;
    for (let r = 0; r < size; r += 1) {
      if (r === c) continue;
      const other = m[r] ?? [];
      const f = (other[c] ?? 0) / lead;
      if (f === 0) continue;
      for (let k = c; k <= size; k += 1) other[k] = (other[k] ?? 0) - f * (row[k] ?? 0);
    }
  }
  const solution = m.map((row, i) => (row[size] ?? 0) / (row[i] ?? 1));
  const weights = solution.slice(0, n);
  const [a0 = 0, a1 = 0, a2 = 0] = solution.slice(n);
  return (xm, zm) => {
    const x = xm / SPLINE_SCALE;
    const z = zm / SPLINE_SCALE;
    let y = a0 + a1 * x + a2 * z;
    points.forEach(([xi, zi], i) => {
      y += (weights[i] ?? 0) * phi(Math.hypot(x - xi, z - zi));
    });
    return y;
  };
}

const parkSpline = solveSpline(PARK_POINTS);

/** The park's ground level at (x, z). */
export function parkY(x: number, z: number): number {
  return parkSpline(x, z);
}

// ---------------------------------------------------------------- zones

export type Zone = 'park' | 'walkWest' | 'road' | 'walkEast' | 'driveNorth' | 'driveSouth' | 'islandSouth' | 'mouth';

const inRect = (r: Rect, x: number, z: number): boolean => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const onCrossStreet = (x: number): boolean => CROSS_STREETS_X.some((cx) => Math.abs(x - cx) <= CROSS_STREET_HALF_WIDTH);

/** Frontage X range: the Fifth Avenue front of the building, end pavilion to end pavilion ([B0]: the outline's ends at X −151.6 and +153.1). */
export const FRONTAGE: Rect = { x0: -151.5, x1: 153.1, z0: -2.1, z1: CURB_WEST_Z };

/** The zone a point (a cell centre) lies in; inside the footprint the caller has already dropped it. */
export function zoneAt(x: number, z: number): Zone {
  if (z >= CURB_EAST_Z) return onCrossStreet(x) ? 'road' : 'walkEast';
  if (z >= CURB_WEST_Z) return 'road';
  if (inRect(TRANSVERSE_MOUTH, x, z)) return 'mouth';
  if (z >= PARK_EDGE_Z) return 'walkWest';
  if (inRect(ISLAND_SOUTH, x, z)) return 'islandSouth';
  if (inRect(DRIVE_SOUTH, x, z)) return 'driveSouth';
  if (inRect(DRIVE_NORTH, x, z)) return 'driveNorth';
  if (x >= FRONTAGE.x0 && x <= FRONTAGE.x1 && z >= FRONTAGE.z0) return 'walkWest';
  return 'park';
}

/** The finished surface of a zone at (x, z): what a person stands on once the zone is paved (or the ground itself in the park). */
export function surfaceY(zone: Zone, x: number, z: number): number {
  switch (zone) {
    case 'park':
      return parkY(x, z);
    case 'walkWest':
      return walkWestY(x, z);
    case 'walkEast':
      return walkEastY(x, z);
    case 'road':
    case 'mouth':
      return roadY(x, Math.max(z, CURB_WEST_Z));
    case 'driveNorth':
      return driveY(DRIVE_NORTH, z);
    case 'driveSouth':
      return driveY(DRIVE_SOUTH, z);
    case 'islandSouth':
      return driveY(DRIVE_SOUTH, z) + CURB_REVEAL;
  }
}

/** The bare terrain of a zone: paved zones sit just under their paving, which the later steps lay on top. */
export function terrainY(zone: Zone, x: number, z: number): number {
  const paved = zone !== 'park' && zone !== 'islandSouth';
  return surfaceY(zone, x, z) - (paved ? PAVING_GAP : 0);
}

/** Zones whose terrain is grass; the rest is bare graded earth until it is paved. */
export function isGrass(zone: Zone): boolean {
  return zone === 'park' || zone === 'islandSouth';
}

/** Lines the terrain grid must keep so that every zone edge falls on a cell edge. */
export const ZONE_XS: readonly number[] = [
  ...[DRIVE_NORTH, DRIVE_SOUTH, ISLAND_SOUTH, TRANSVERSE_MOUTH].flatMap((r) => [r.x0, r.x1]),
  FRONTAGE.x0,
  FRONTAGE.x1,
  ...CROSS_STREETS_X.flatMap((x) => [x - CROSS_STREET_HALF_WIDTH, x + CROSS_STREET_HALF_WIDTH]),
  ...STREET_PROFILE.map((p) => p[0]),
];
export const ZONE_ZS: readonly number[] = [
  ...[DRIVE_NORTH, DRIVE_SOUTH, ISLAND_SOUTH].flatMap((r) => [r.z0, r.z1]),
  FRONTAGE.z0,
  PARK_EDGE_Z,
  CURB_WEST_Z,
  FIFTH_AVE_CENTRELINE_Z,
  CURB_EAST_Z,
  SITE_MIN_Z,
  GROUND_MAX_Z,
];
