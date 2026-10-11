/**
 * Chapter `site`: Fifth Avenue and its sidewalks (history.md section 1, `site-fifth-avenue`, `site-east-sidewalk`), with the park's perimeter wall.
 * Levels come from ground.ts; positions from exterior.md [F7]..[F10] and frame.ts (curbs, centreline), OSM for the cross streets and crossings ([S1]).
 * The buildings opposite are left out: the `front` and `aerial-ne` presets look across them, and anything tall at Z +50 would hide the facade.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { CURB_EAST_Z, CURB_WEST_Z, SITE_MAX_X, SITE_MIN_X } from '../frame.js';
import { palette } from '../palette.js';
import { CROSS_STREETS_X, CROSS_STREET_HALF_WIDTH, EAST_LINE_Z, PARK_EDGE_Z, TRANSVERSE_MOUTH, parkY, roadY, surfaceY, walkEastY, walkWestY } from './ground.js';
import type { Zone } from './ground.js';
import { CELLS, GRID_XS } from './grid.js';
import { siteMaterials } from './materials.js';
import { UNIT_BLOCK, UNIT_SLAB, UNIT_TILE, blockMatrix, surfaceMatrix } from './tiles.js';

/** Granite curb stones: 18 cm wide on the sidewalk side of the curb line, set 1 cm proud of the paving (E, typical NYC curb). */
const CURB_WIDTH = 0.18;
const CURB_DEPTH = 0.45;
/** Lane lines: five lanes of 2.8 m between the curbs (E, from the 2018 orthophoto), dashes 3 m long every 12 m. */
const LANE_LINES_Z: readonly number[] = [31.72, 34.52, 37.32, 40.12];
const DASH = 3;
const DASH_PERIOD = 12;
/** Crosswalks: OSM crossing nodes on Fifth Avenue, two to each intersection (80th to 84th Street). */
const CROSSWALKS_X: readonly number[] = [-165.4, -153.6, -86.9, -73.3, -6.9, 6.8, 73.6, 87.8, 153.3, 171.5];
const CROSSWALK_WIDTH = 3.6;
const BAR_DEPTH = 0.6;
const BAR_PITCH = 1.2;
const PAINT_LIFT = 0.006;
/** The perimeter wall of Central Park along the sidewalk: 0.45 m thick, 0.9 m above the sidewalk (E, the low schist wall on Fifth Avenue). */
const PARK_WALL_THICKNESS = 0.45;
const PARK_WALL_HEIGHT = 0.9;

function tileZones(kit: Kit, zones: readonly Zone[], material: Parameters<Kit['add']>[1]): void {
  for (const cell of CELLS) {
    if (cell.zone === null || cell.cut !== null || !zones.includes(cell.zone)) continue;
    const zone = cell.zone;
    const x0 = Math.max(cell.x0, SITE_MIN_X + EDGE_INSET);
    const x1 = Math.min(cell.x1, SITE_MAX_X - EDGE_INSET);
    kit.add(UNIT_TILE, material, surfaceMatrix(x0, x1, cell.z0, cell.z1, (x, z) => surfaceY(zone, x, z)));
  }
}

/** Pieces stop this far inside the site's ends, where a slab turned to the avenue's slope would otherwise lean out of the bounds. */
const EDGE_INSET = 0.05;

/** Grid intervals along X over [from, to] (kept inside the site's ends), so pieces follow the profile's breakpoints. */
function spans(from: number, to: number): [number, number][] {
  const a = Math.max(from, SITE_MIN_X + EDGE_INSET);
  const b = Math.min(to, SITE_MAX_X - EDGE_INSET);
  const xs = GRID_XS.filter((x) => x > a + 1e-6 && x < b - 1e-6);
  const all = [a, ...xs, b];
  return all.slice(1).map((x, k): [number, number] => [all[k] ?? a, x]);
}

const onCrossStreet = (x0: number, x1: number): boolean => CROSS_STREETS_X.some((c) => x1 > c - CROSS_STREET_HALF_WIDTH + 1e-6 && x0 < c + CROSS_STREET_HALF_WIDTH - 1e-6);

function curbs(kit: Kit): void {
  const west = (x: number): number => walkWestY(x, CURB_WEST_Z) + 0.01;
  for (const [x0, x1] of spans(SITE_MIN_X, SITE_MAX_X)) {
    if (x0 >= TRANSVERSE_MOUTH.x0 - 1e-6 && x1 <= TRANSVERSE_MOUTH.x1 + 1e-6) continue;
    kit.add(UNIT_SLAB, palette.granite, surfaceMatrix(x0, x1, CURB_WEST_Z - CURB_WIDTH, CURB_WEST_Z, (x) => west(x), 0, CURB_DEPTH));
  }
  const east = (x: number): number => walkEastY(x, CURB_EAST_Z) + 0.01;
  for (const [x0, x1] of spans(SITE_MIN_X, SITE_MAX_X)) {
    if (onCrossStreet(x0, x1)) continue;
    kit.add(UNIT_SLAB, palette.granite, surfaceMatrix(x0, x1, CURB_EAST_Z, CURB_EAST_Z + CURB_WIDTH, (x) => east(x), 0, CURB_DEPTH));
  }
  // The corners of the cross streets: curbs turning east along each side of the street.
  for (const c of CROSS_STREETS_X) {
    for (const [x0, x1] of [
      [c - CROSS_STREET_HALF_WIDTH - CURB_WIDTH, c - CROSS_STREET_HALF_WIDTH],
      [c + CROSS_STREET_HALF_WIDTH, c + CROSS_STREET_HALF_WIDTH + CURB_WIDTH],
    ] as const) {
      kit.add(UNIT_SLAB, palette.granite, surfaceMatrix(x0, x1, CURB_EAST_Z, EAST_LINE_Z, (x, z) => walkEastY(x, z) + 0.01, 0, CURB_DEPTH));
    }
  }
}

function markings(kit: Kit): void {
  const road = (x: number, z: number): number => roadY(x, z);
  const inCrosswalk = (x0: number, x1: number): boolean => CROSSWALKS_X.some((c) => x1 > c - CROSSWALK_WIDTH && x0 < c + CROSSWALK_WIDTH);
  for (const z of LANE_LINES_Z) {
    for (let x = SITE_MIN_X + 2; x + DASH < SITE_MAX_X; x += DASH_PERIOD) {
      if (inCrosswalk(x, x + DASH)) continue;
      kit.add(UNIT_TILE, siteMaterials.paint, surfaceMatrix(x, x + DASH, z - 0.06, z + 0.06, road, PAINT_LIFT));
    }
  }
  for (const c of CROSSWALKS_X) {
    for (let z = CURB_WEST_Z + 0.4; z + BAR_DEPTH < CURB_EAST_Z - 0.2; z += BAR_PITCH) {
      kit.add(UNIT_TILE, siteMaterials.paint, surfaceMatrix(c - CROSSWALK_WIDTH / 2, c + CROSSWALK_WIDTH / 2, z, z + BAR_DEPTH, road, PAINT_LIFT));
    }
  }
}

export const fifthAvenueStep: StepDef = {
  id: 'site-fifth-avenue',
  chapter: 'site',
  title: 'Pave Fifth Avenue',
  detail: 'One way south, 14 m from curb to curb between granite curbs, with lane lines and the crosswalks at 80th to 84th Street.',
  motion: { kind: 'rise', distance: 0.5 },
  stagger: 'x',
  build(kit) {
    tileZones(kit, ['road', 'mouth'], palette.asphalt);
    curbs(kit);
    markings(kit);
  },
};

function parkWall(kit: Kit): void {
  // Wherever the park meets the west sidewalk: north of the transverse road's mouth and south of the garage drive.
  const runs: [number, number][] = [
    [TRANSVERSE_MOUTH.x1, SITE_MAX_X],
    [SITE_MIN_X, -186.5],
  ];
  for (const [from, to] of runs) {
    // Upright stones in grid-length runs, each as tall as the higher of its ends, so the coping steps gently with the avenue.
    for (const [x0, x1] of spans(from, to)) {
      const top = (x: number): number => Math.max(walkWestY(x, PARK_EDGE_Z) + PARK_WALL_HEIGHT, parkY(x, PARK_EDGE_Z - PARK_WALL_THICKNESS / 2) + 0.3);
      const y1 = Math.max(top(x0), top(x1));
      const y0 = Math.min(walkWestY(x0, PARK_EDGE_Z), walkWestY(x1, PARK_EDGE_Z)) - 0.3;
      kit.add(UNIT_BLOCK, siteMaterials.wallStone, blockMatrix((x0 + x1) / 2, y0, PARK_EDGE_Z - PARK_WALL_THICKNESS / 2, x1 - x0, y1 - y0, PARK_WALL_THICKNESS));
    }
  }
}

export const sidewalksStep: StepDef = {
  id: 'site-sidewalks',
  chapter: 'site',
  title: 'Lay the Met-side sidewalks',
  detail: 'Concrete sidewalks along the park and across the frontage to the facade line, and the low stone wall at the park edge.',
  motion: { kind: 'rise', distance: 0.4 },
  stagger: 'x',
  build(kit) {
    tileZones(kit, ['walkWest'], palette.sidewalk);
    parkWall(kit);
  },
};

export const eastSidewalkStep: StepDef = {
  id: 'site-east-sidewalk',
  chapter: 'site',
  title: 'Lay the far sidewalk',
  detail: 'The east sidewalk of Fifth Avenue to the building line opposite, cut by the mouths of 80th to 84th Street.',
  motion: { kind: 'rise', distance: 0.4 },
  stagger: 'x',
  build(kit) {
    tileZones(kit, ['walkEast'], palette.sidewalk);
  },
};
