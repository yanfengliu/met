/**
 * The Charles Engelhard Court of the American Wing (1980; reworked 2009), chapter `roche-north-1980`: its floor, terraces, planting beds and pool,
 * the colonnades and glass-fronted balconies, Tiffany's Laurelton Hall loggia, the sculpture and fountains, the ribbed glass roof and the west curtain wall.
 * Plan from the Met map (shifted; plan.ts). Roof: seven east-west glazed ridges, their valleys on the six column lines 5.81 m apart, spanning X 53.4..94.0 as
 * the orthophoto shows (ridged roof X 53.2..93.9), with glazed lean-tos down to the west curtain wall and the east walk (P5: the pitched glass on white tubular steel).
 */
import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';

import { curtainWall, hedge, hippedSkylight, lampPost, stairFlight } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { palette } from '../palette.js';
import { AW_SLOT } from './american.js';
import { DIANA, STATUE } from './figures.js';
import { areaMaterials } from './materials.js';
import {
  AW_EAST_Z,
  AW_MEZZANINE_Y,
  AW_STEP_X,
  AW_WEST_Z_SOUTH,
  BANK_FRONT_X,
  BEDS,
  BED_STEPS,
  CAFE_WEST_ROW_Z,
  COLUMN_XS,
  COURT,
  COURT_AXIS_Z,
  COURT_EAVE_Y,
  COURT_POOL,
  EAST_WALK_ROW_Z,
} from './plan.js';
import { UNIT_BOX, boxAt, facingMatrix, memo } from './shapes.js';

const F = MAIN_FLOOR_Y;
const TERRACE_Y = F + 0.45;
const TERRACE_X = BED_STEPS.maxX;
/** The curtain wall's head: the west lean-to climbs from it to the court's eave (E: a roof about 30° as in the orthophoto's 8 m glazed strip). */
const CURTAIN_TOP = F + 15.0;
const RIDGE_WIDTH = 5.81;
const RIDGE_X0 = (COLUMN_XS[0] ?? 59.18) - RIDGE_WIDTH;
const WEST_EDGE = COURT.minZ;
const EAST_EDGE = COURT.maxZ;
/** A unit cylinder standing on its base, for the court's round columns. */
const POST = memo('rn-post', () => new CylinderGeometry(0.5, 0.5, 1, 16, 1, false).translate(0, 0.5, 0));

function post(kit: Kit, material: typeof areaMaterials.whiteSteel, x: number, z: number, y0: number, y1: number, diameter: number): void {
  kit.add(POST, material, new Matrix4().makeTranslation(x, y0, z).multiply(new Matrix4().makeScale(diameter, y1 - y0, diameter)));
}

function floor(kit: Kit): void {
  // Paving from the loggia strip to the terrace, under the cafe and along the east walk.
  const z0 = AW_WEST_Z_SOUTH + 0.4;
  const nx = Math.round((TERRACE_X - COURT.southX) / 1.5);
  const nz = Math.round((AW_EAST_Z - z0) / 1.5);
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x0 = COURT.southX + ((TERRACE_X - COURT.southX) * i) / nx;
      const x1 = COURT.southX + ((TERRACE_X - COURT.southX) * (i + 1)) / nx;
      const a = z0 + ((AW_EAST_Z - z0) * k) / nz;
      const b = z0 + ((AW_EAST_Z - z0) * (k + 1)) / nz;
      boxAt(kit, palette.stoneFloor, [x0 + 0.006, F - 0.08, a + 0.006], [x1 - 0.006, F, b - 0.006]);
    }
  }
  // The cafe and east walk run on past the terrace to the facade's ends; the terrace before the facade; the flight up to it between the beds.
  boxAt(kit, palette.stoneFloor, [TERRACE_X, F - 0.08, z0], [AW_STEP_X, F, WEST_EDGE]);
  boxAt(kit, palette.stoneFloor, [TERRACE_X, F - 0.08, EAST_EDGE], [BANK_FRONT_X, F, AW_EAST_Z]);
  boxAt(kit, palette.stoneFloor, [TERRACE_X, F - 0.08, WEST_EDGE], [BANK_FRONT_X, TERRACE_Y, EAST_EDGE]);
  const flight = stairFlight({ width: BEDS.northMinZ - BEDS.southMaxZ, steps: 3, riser: 0.15, tread: (BED_STEPS.maxX - BED_STEPS.minX) / 3, nosing: 0.015 });
  kit.add(flight.steps, palette.stoneFloor, new Matrix4().compose(new Vector3(BED_STEPS.minX, F, COURT_AXIS_Z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2), new Vector3(1, 1, 1)));
  // Raised planting beds either side of the flight: granite curbs, soil and low massed planting (P5).
  for (const [a, b] of [[WEST_EDGE, BEDS.southMaxZ], [BEDS.northMinZ, EAST_EDGE]] as const) {
    const top = F + 0.62;
    boxAt(kit, palette.granite, [BEDS.minX, F, a], [BEDS.maxX, top, a + 0.3]);
    boxAt(kit, palette.granite, [BEDS.minX, F, b - 0.3], [BEDS.maxX, top, b]);
    boxAt(kit, palette.granite, [BEDS.minX, F, a + 0.3], [BEDS.minX + 0.3, top, b - 0.3]);
    boxAt(kit, palette.granite, [BEDS.maxX - 0.3, TERRACE_Y, a + 0.3], [BEDS.maxX, top, b - 0.3]);
    boxAt(kit, palette.bark, [BEDS.minX + 0.3, F, a + 0.3], [BEDS.maxX - 0.3, top - 0.08, b - 0.3]);
    const planting = hedge({ length: b - a - 1.2, height: 0.8, width: 1.4, seed: 3 });
    for (const x of [BEDS.minX + 1.2, BEDS.minX + 3.2, BEDS.maxX - 1.2]) kit.add(planting, palette.foliage, new Matrix4().makeTranslation(x, top - 0.1, (a + b) / 2).multiply(new Matrix4().makeRotationY(Math.PI / 2)));
  }
  // The small pool in the court's southern half: a stone curb and the water.
  const { minX, maxX, minZ, maxZ } = COURT_POOL;
  boxAt(kit, palette.granite, [minX, F, minZ], [maxX, F + 0.42, minZ + 0.3]);
  boxAt(kit, palette.granite, [minX, F, maxZ - 0.3], [maxX, F + 0.42, maxZ]);
  boxAt(kit, palette.granite, [minX, F, minZ + 0.3], [minX + 0.3, F + 0.42, maxZ - 0.3]);
  boxAt(kit, palette.granite, [maxX - 0.3, F, minZ + 0.3], [maxX, F + 0.42, maxZ - 0.3]);
  boxAt(kit, palette.water, [minX + 0.3, F, minZ + 0.3], [maxX - 0.3, F + 0.32, maxZ - 0.3]);
}

/** A glass balustrade along a balcony edge from (x0, z0) to (x1, z1) at `y`: a glass sheet, posts and a white rail. */
function glassFront(kit: Kit, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const min = (a: number, b: number): number => Math.min(a, b);
  const max = (a: number, b: number): number => Math.max(a, b);
  if (along) {
    boxAt(kit, areaMaterials.clearGlass, [min(x0, x1), y, z0 - 0.015], [max(x0, x1), y + 1.05, z0 + 0.015]);
    boxAt(kit, areaMaterials.whiteSteel, [min(x0, x1), y + 1.05, z0 - 0.05], [max(x0, x1), y + 1.12, z0 + 0.05]);
  } else {
    boxAt(kit, areaMaterials.clearGlass, [x0 - 0.015, y, min(z0, z1)], [x0 + 0.015, y + 1.05, max(z0, z1)]);
    boxAt(kit, areaMaterials.whiteSteel, [x0 - 0.05, y + 1.05, min(z0, z1)], [x0 + 0.05, y + 1.12, max(z0, z1)]);
  }
}

function colonnades(kit: Kit): void {
  // Tall white tubular columns on the court's west and east edges carry the roof; the cafe row carries the balconies.
  for (const x of COLUMN_XS) {
    post(kit, areaMaterials.whiteSteel, x, WEST_EDGE, F, COURT_EAVE_Y, 0.56);
    post(kit, areaMaterials.whiteSteel, x, EAST_WALK_ROW_Z, F, COURT_EAVE_Y, 0.56);
    post(kit, areaMaterials.whiteSteel, x, CAFE_WEST_ROW_Z, F, AW_MEZZANINE_Y, 0.42);
  }
  // Balconies at one level (P5): over the cafe on the park side, over the east walk and over the loggia's strip, all glass-fronted.
  const y = AW_MEZZANINE_Y;
  boxAt(kit, areaMaterials.concrete, [COURT.southX, y - 0.4, AW_WEST_Z_SOUTH + 1.4], [AW_STEP_X, y, WEST_EDGE]);
  boxAt(kit, areaMaterials.whiteSteel, [COURT.southX, y - 0.55, WEST_EDGE - 0.08], [AW_STEP_X, y + 0.02, WEST_EDGE + 0.04]);
  glassFront(kit, COURT.southX, WEST_EDGE - 0.1, AW_STEP_X, WEST_EDGE - 0.1, y);
  boxAt(kit, areaMaterials.concrete, [COURT.southX, y - 0.4, EAST_EDGE], [BANK_FRONT_X, y, AW_EAST_Z]);
  boxAt(kit, areaMaterials.whiteSteel, [COURT.southX, y - 0.55, EAST_EDGE - 0.04], [BANK_FRONT_X, y + 0.02, EAST_EDGE + 0.08]);
  glassFront(kit, COURT.southX, EAST_EDGE + 0.1, BANK_FRONT_X, EAST_EDGE + 0.1, y);
  boxAt(kit, areaMaterials.concrete, [COURT.southX, y - 0.4, WEST_EDGE], [COURT.minX, y, EAST_EDGE]);
  boxAt(kit, areaMaterials.whiteSteel, [COURT.minX - 0.04, y - 0.55, WEST_EDGE], [COURT.minX + 0.08, y + 0.02, EAST_EDGE]);
  glassFront(kit, COURT.minX - 0.1, WEST_EDGE, COURT.minX - 0.1, EAST_EDGE, y);
  // The 2009 stair in the south-west corner up to the mezzanine balcony.
  const steps = 32;
  const stair = stairFlight({ width: 1.35, steps, riser: (AW_MEZZANINE_Y - F) / steps, tread: 0.27, cheeks: { width: 0.12, height: 0.95 } });
  const at = new Matrix4().compose(new Vector3(COURT.southX + 0.8, F, WEST_EDGE + 0.4 + steps * 0.27), new Quaternion(), new Vector3(1, 1, 1));
  kit.add(stair.steps, palette.stoneFloor, at);
  if (stair.cheeks !== undefined) kit.add(stair.cheeks, areaMaterials.clearGlass, at);
}

function loggia(kit: Kit): void {
  // Tiffany's loggia from Laurelton Hall (about 1905; 21 × 23 ft, Met API object 133): limestone, four columns with Favrile-glass capitals, facing the court.
  const x0 = COURT.southX + 0.05;
  const front = COURT.minX - 0.25;
  const z = COURT_AXIS_Z;
  const half = 3.5;
  const base = F + 0.32;
  const shaftTop = base + 3.4;
  const lintel = shaftTop + 0.6;
  boxAt(kit, palette.limestone, [x0, F, z - half], [front + 0.3, base, z + half]);
  for (const dz of [-3.1, -1.375, 1.375, 3.1]) {
    post(kit, palette.limestone, front - 0.15, z + dz, base, shaftTop - 0.05, 0.36);
    kit.add(CAPITAL, areaMaterials.favrile, new Matrix4().makeTranslation(front - 0.15, shaftTop - 0.6, z + dz));
  }
  boxAt(kit, palette.limestone, [x0, lintel, z - half], [front + 0.15, lintel + 1.05, z + half]);
  boxAt(kit, palette.limestone, [x0, shaftTop, z - half], [front + 0.05, lintel, z - half + 0.5]);
  boxAt(kit, palette.limestone, [x0, shaftTop, z + half - 0.5], [front + 0.05, lintel, z + half]);
  boxAt(kit, areaMaterials.favrile, [front - 0.02, lintel + 0.3, z - half + 0.6], [front + 0.17, lintel + 0.7, z + half - 0.6]);
  boxAt(kit, palette.limestone, [x0, lintel + 1.05, z - half - 0.15], [front + 0.4, lintel + 1.3, z + half + 0.15]);
  // The loggia's back wall with its door, and its roof.
  boxAt(kit, palette.limestone, [x0, base, z - half], [x0 + 0.35, lintel, z + half]);
}

/** The loggia's capitals: a swelling cluster of glass blossoms round the column head. */
const CAPITAL = memo('rn-loggia-capital', () => new CylinderGeometry(0.42, 0.2, 0.6, 12, 2).translate(0, 0.3, 0));

/** A statue in white marble on a grey pedestal, as stand round the court (P5): an abstract figure of the given height. */
function statue(kit: Kit, x: number, z: number, height: number, pedestal: number): void {
  boxAt(kit, palette.granite, [x - 0.55, F, z - 0.55], [x + 0.55, F + pedestal, z + 0.55]);
  kit.add(STATUE, areaMaterials.whiteMarble, new Matrix4().makeTranslation(x, F + pedestal, z).multiply(new Matrix4().makeScale(height, height, height)));
}

function sculpture(kit: Kit): void {
  // Saint-Gaudens' Diana (1892–93, cast 1928, 101¾ in), gilded, high on a white pedestal; the marbles round the court; the lamp standards.
  // P5: about 11 m in front of the camera at the court's south end and 2 m west of the centre line, with the facade 33 m away.
  const dx = 71.0;
  const dz = COURT_AXIS_Z - 2.2;
  boxAt(kit, areaMaterials.whiteMarble, [dx - 0.75, F, dz - 0.75], [dx + 0.75, F + 0.5, dz + 0.75]);
  boxAt(kit, areaMaterials.whiteMarble, [dx - 0.5, F + 0.5, dz - 0.5], [dx + 0.5, F + 4.1, dz + 0.5]);
  boxAt(kit, areaMaterials.whiteMarble, [dx - 0.62, F + 4.1, dz - 0.62], [dx + 0.62, F + 4.3, dz + 0.62]);
  // She draws her bow toward the park (world −Z): her local −X turned onto world −Z.
  kit.add(DIANA, areaMaterials.gilt, new Matrix4().makeTranslation(dx, F + 4.3, dz).multiply(new Matrix4().makeRotationY(Math.PI / 2)).multiply(new Matrix4().makeScale(2.58, 2.58, 2.58)));
  for (const [x, z, h] of [
    [61.5, WEST_EDGE + 2.0, 1.7],
    [61.5, EAST_EDGE - 2.0, 1.7],
    [76.0, WEST_EDGE + 1.6, 1.9],
    [76.0, EAST_EDGE - 1.6, 1.9],
    [80.6, BEDS.southMaxZ - 1.4, 1.8],
    [80.6, BEDS.northMinZ + 1.4, 1.8],
  ] as const) {
    statue(kit, x, z, h, 1.25);
  }
  // The MacMonnies and Scudder bronzes in the pool.
  for (const z of [COURT_POOL.minZ + 1.6, COURT_POOL.maxZ - 1.6]) {
    boxAt(kit, palette.granite, [64.1, F + 0.32, z - 0.3], [64.9, F + 0.8, z + 0.3]);
    kit.add(STATUE, palette.bronze, new Matrix4().makeTranslation(64.5, F + 0.8, z).multiply(new Matrix4().makeScale(0.9, 0.9, 0.9)));
  }
  const lamp = lampPost({ height: 5.4, arms: 2 });
  for (const [x, z] of [
    [81.6, BEDS.southMaxZ - 0.7],
    [81.6, BEDS.northMinZ + 0.7],
    [70.5, WEST_EDGE + 3.0],
    [70.5, EAST_EDGE - 3.0],
  ] as const) {
    const at = new Matrix4().makeTranslation(x, F, z).multiply(new Matrix4().makeRotationY(Math.PI / 2));
    kit.add(lamp.post, areaMaterials.verdigris, at);
    kit.add(lamp.lamp, palette.glass, at);
  }
}

function glassRoof(kit: Kit): void {
  // Box trusses on the column lines span the court; seven hipped ridges between them; lean-tos fall west to the curtain wall and east over the walk.
  const span = EAST_EDGE - WEST_EDGE;
  for (let k = 0; k <= COLUMN_XS.length + 1; k++) {
    const x = Math.min(Math.max(RIDGE_X0 + RIDGE_WIDTH * k, COURT.southX + 0.2), BANK_FRONT_X + 1.2);
    boxAt(kit, areaMaterials.whiteSteel, [x - 0.15, COURT_EAVE_Y - 0.8, WEST_EDGE - 0.15], [x + 0.15, COURT_EAVE_Y, EAST_EDGE + 0.15]);
  }
  boxAt(kit, areaMaterials.whiteSteel, [COURT.southX, COURT_EAVE_Y - 0.6, WEST_EDGE - 0.25], [BANK_FRONT_X + 1.4, COURT_EAVE_Y, WEST_EDGE + 0.25]);
  boxAt(kit, areaMaterials.whiteSteel, [COURT.southX, COURT_EAVE_Y - 0.6, EAST_EDGE - 0.25], [BANK_FRONT_X + 1.4, COURT_EAVE_Y, EAST_EDGE + 0.25]);
  const ridge = hippedSkylight({ width: RIDGE_WIDTH, length: span, pitch: 30, curbHeight: 0.25, bays: 12 });
  for (let k = 0; k < COLUMN_XS.length + 1; k++) {
    const at = new Matrix4().makeTranslation(RIDGE_X0 + RIDGE_WIDTH * (k + 0.5), COURT_EAVE_Y, (WEST_EDGE + EAST_EDGE) / 2);
    kit.add(ridge.frame, areaMaterials.whiteSteel, at);
    kit.add(ridge.glass, areaMaterials.clearGlass, at);
  }
  leanTo(kit, AW_WEST_Z_SOUTH + 0.2, CURTAIN_TOP, WEST_EDGE - 0.25, COURT_EAVE_Y);
  leanTo(kit, AW_EAST_Z, COURT_EAVE_Y - 4.0, EAST_EDGE + 0.25, COURT_EAVE_Y);
}

/** A sloping glazed roof across the court's length, from (zLow, yLow) up to (zHigh, yHigh): one glass sheet on white rafters. */
function leanTo(kit: Kit, zLow: number, yLow: number, zHigh: number, yHigh: number): void {
  const run = zHigh - zLow;
  const rise = yHigh - yLow;
  const length = Math.hypot(run, rise);
  const tilt = new Matrix4().makeRotationX(-Math.atan2(rise, run));
  const x0 = COURT.southX;
  const x1 = BANK_FRONT_X + 1.4;
  const mid = (x: number): Matrix4 => new Matrix4().makeTranslation(x, (yLow + yHigh) / 2, (zLow + zHigh) / 2).multiply(tilt);
  kit.add(UNIT_BOX, areaMaterials.clearGlass, mid((x0 + x1) / 2).multiply(new Matrix4().makeScale(x1 - x0, 0.03, length)));
  for (let k = 0; k <= 26; k++) kit.add(UNIT_BOX, areaMaterials.whiteSteel, mid(x0 + ((x1 - x0) * k) / 26).multiply(new Matrix4().makeScale(0.12, 0.2, length)));
}

function curtain(kit: Kit): void {
  // The park-side curtain wall of reflecting glass (Heckscher p. 73) on the block line, and the glazed slot beside the Sackler tower.
  const width = AW_STEP_X - COURT.southX;
  const wallGlass = curtainWall({ width, height: CURTAIN_TOP - (F - 0.3), cols: 24, rows: 8, mullionWidth: 0.08, mullionDepth: 0.25 });
  const at = facingMatrix('-z', [(COURT.southX + AW_STEP_X) / 2, F - 0.3, AW_WEST_Z_SOUTH + 0.03]);
  kit.add(wallGlass.frame, areaMaterials.whiteSteel, at);
  kit.add(wallGlass.glass, areaMaterials.clearGlass, at);
  boxAt(kit, palette.limestoneDark, [COURT.southX - 4.5, F - 0.4, AW_WEST_Z_SOUTH], [COURT.southX, CURTAIN_TOP + 0.3, AW_WEST_Z_SOUTH + 1.2]);
  // The slot (King of Hearts 2013): a grid of square panes from the lawn up to a sloped glass step, then a set-back upper wall of glass under a glass roof.
  const slotWidth = AW_SLOT.maxX - AW_SLOT.minX;
  const lowTop = 16.4;
  const step = 2.4;
  const low = curtainWall({ width: slotWidth, height: lowTop - F, cols: 6, rows: 11, mullionWidth: 0.07, mullionDepth: 0.2 });
  const lowAt = facingMatrix('-z', [(AW_SLOT.minX + AW_SLOT.maxX) / 2, F, AW_SLOT.minZ + 0.03]);
  kit.add(low.frame, palette.metalDark, lowAt);
  kit.add(low.glass, palette.glassDark, lowAt);
  const high = curtainWall({ width: slotWidth, height: 21.4 - (lowTop + 1.6), cols: 6, rows: 3, mullionWidth: 0.07, mullionDepth: 0.2 });
  const highAt = facingMatrix('-z', [(AW_SLOT.minX + AW_SLOT.maxX) / 2, lowTop + 1.6, AW_SLOT.minZ + step]);
  kit.add(high.frame, palette.metalDark, highAt);
  kit.add(high.glass, palette.glassDark, highAt);
  const tilt = new Matrix4().makeTranslation((AW_SLOT.minX + AW_SLOT.maxX) / 2, lowTop + 0.8, AW_SLOT.minZ + step / 2).multiply(new Matrix4().makeRotationX(-Math.atan2(1.6, step)));
  kit.add(UNIT_BOX, palette.glassDark, tilt.clone().multiply(new Matrix4().makeScale(slotWidth, 0.04, Math.hypot(1.6, step))));
  boxAt(kit, palette.glassDark, [AW_SLOT.minX, 21.4, AW_SLOT.minZ + step], [AW_SLOT.maxX, 21.45, AW_SLOT.maxZ]);
}

export { colonnades as engelhardColonnades, curtain as engelhardCurtain, floor as engelhardFloor, glassRoof as engelhardGlassRoof, loggia as engelhardLoggia, sculpture as engelhardSculpture };
