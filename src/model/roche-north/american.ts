/**
 * The new American Wing (Kevin Roche John Dinkeloo and Associates, opened 11 June 1980), chapter `roche-north-1980`: the shell round the 1924 core.
 * Limestone walls on the park faces (Z −161.0, the step at X 87.6 and the north face X 140.5; exterior.md [K1]), a clerestory band high on the north face,
 * a glazed slot against the Sackler tower (King of Hearts 2013), gallery floors at the mezzanine and second floor, flat roofs, and the ribbed glass roof over
 * the north-west galleries with a glazed lean-to down to the west wall (NYC orthophoto 2018: east-west ridges about 5 m apart). The court is engelhard.ts.
 * Walls on the lines shared with the McKim, Mead & White and core blocks (Z −96.0, X 49.4) belong to those older blocks; floors and roofs run up to them.
 */
import { Matrix4 } from 'three';

import { ridgeSkylight, wall, windowUnit } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { palette } from '../palette.js';
import { AW1924_PARAPET_Y } from './american-1924.js';
import { areaMaterials } from './materials.js';
import { AW1924, AW_EAST_Z, AW_MEZZANINE_Y, AW_NORTH_X, AW_SECOND_FLOOR_Y, AW_STEP_X, AW_WEST_Z_NORTH, AW_WEST_Z_SOUTH, BANK_FRONT_X, COURT, COURT_EAVE_Y, SACKLER_TOWER } from './plan.js';
import { UNIT_BOX, boxAt, facingMatrix } from './shapes.js';

const T = 1.2;
const FOOTING_Y = MAIN_FLOOR_Y - 6.5;
const SLAB = 0.35;
/** D: the parapet of the north wall, under its coping (camera solve of King of Hearts 2013: coping top 21.8, 1.2 m below the Sackler tower's), and the roofs inside it. */
export const AW_PARAPET_Y = 21.5;
export const AW_ROOF_Y = 20.2;
/** E: the west wall stops below the glazed lean-to that climbs to the ribbed roof (orthophoto: a sloped glazed strip about 8.5 m deep). */
const WEST_WALL_TOP = 12.9;
const LEAN_TO_Z = AW_WEST_Z_NORTH + 8.5;
/** The ribbed roof (orthophoto): ten ridges across X; over the 1924 core they stop at its west wall, north of it they run on to Z −120. */
const RIBBED = { minX: AW_STEP_X + T, maxX: AW_NORTH_X - T, minZ: LEAN_TO_Z, northMaxZ: -120.0 } as const;
const RIDGES = 10;
/** The glazed slot between the American Wing and the Sackler tower (orthophoto: X 140.4..145.7 under glass). */
export const AW_SLOT = { minX: AW_NORTH_X, maxX: SACKLER_TOWER.minX, minZ: -103.0, maxZ: SACKLER_TOWER.maxZ } as const;
/** Behind the Dendur back wall the strip's floors stop at its back face; at roof height the wall has leaned back further. */
const STRIP_MAX_Z = -96.3;
const STRIP_ROOF_MAX_Z = -97.6;

type Rect = readonly [number, number, number, number];

/** The 1980 wing in plan (x0, x1, z0, z1): the court zone, the north-west galleries, the galleries north and east of the 1924 core, the strip by the Sackler. */
const PLAN: readonly Rect[] = [
  [49.4, BANK_FRONT_X, AW_WEST_Z_SOUTH, AW_EAST_Z],
  [AW_STEP_X, AW_NORTH_X, AW_WEST_Z_NORTH, AW1924.minZ],
  [AW1924.maxX, AW_NORTH_X, AW1924.minZ, -103.0],
  [BANK_FRONT_X, AW1924.maxX, AW1924.maxZ, AW_EAST_Z],
  [AW1924.maxX, AW_SLOT.maxX, -103.0, STRIP_MAX_Z],
];

function cells(rect: Rect, size: number, cell: (x0: number, x1: number, z0: number, z1: number) => void): void {
  const [x0, x1, z0, z1] = rect;
  const nx = Math.max(1, Math.round((x1 - x0) / size));
  const nz = Math.max(1, Math.round((z1 - z0) / size));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) cell(x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * k) / nz, z0 + ((z1 - z0) * (k + 1)) / nz);
}

function foundations(kit: Kit): void {
  for (const rect of PLAN) cells(rect, 10, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.concrete, [x0, FOOTING_Y, z0], [x1, FOOTING_Y + 0.6, z1]); });
  // Retaining walls under the park faces, then the main-floor slab.
  const top = MAIN_FLOOR_Y - SLAB;
  boxAt(kit, areaMaterials.concrete, [AW_STEP_X, FOOTING_Y + 0.6, AW_WEST_Z_NORTH], [AW_NORTH_X, top, AW_WEST_Z_NORTH + T]);
  boxAt(kit, areaMaterials.concrete, [AW_NORTH_X - T, FOOTING_Y + 0.6, AW_WEST_Z_NORTH + T], [AW_NORTH_X, top, -103.0]);
  boxAt(kit, areaMaterials.concrete, [49.4, FOOTING_Y + 0.6, AW_WEST_Z_SOUTH], [AW_STEP_X, top, AW_WEST_Z_SOUTH + T]);
  boxAt(kit, areaMaterials.concrete, [AW_STEP_X, FOOTING_Y + 0.6, AW_WEST_Z_NORTH + T], [AW_STEP_X + T, top, AW_WEST_Z_SOUTH + T]);
  for (const rect of PLAN) cells(rect, 8, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.concrete, [x0, top, z0], [x1, MAIN_FLOOR_Y - 0.05, z1]); });
}

function walls(kit: Kit): void {
  const y0 = MAIN_FLOOR_Y - SLAB;
  // North wall on X 140.5: limestone to the parapet, a band of clerestory windows high on its eastern part (King of Hearts 2013, camera solve: Z −105..−118,
  // Y 17.6..18.5). Its local x runs along world −Z from the wall's centre at Z −132.
  const centre = (AW_WEST_Z_NORTH - 103.0) / 2;
  const band = { x: centre + 111.5, y: 17.6 - y0, width: 13.0, height: 0.9 };
  // A tall slot window, a small window and a low window below them (the same camera solve: Z −115.0, −109.2 and −115.6).
  const lights = [
    { x: centre + 115.03, y: 11.4 - y0, width: 0.65, height: 3.3 },
    { x: centre + 109.23, y: 11.2 - y0, width: 0.55, height: 2.45 },
    { x: centre + 115.6, y: 4.5 - y0, width: 2.9, height: 1.65 },
  ];
  const northWall = wall({ width: -103.0 - AW_WEST_Z_NORTH, height: AW_PARAPET_Y - y0, thickness: T, openings: [band, ...lights] });
  const northAt = facingMatrix('+x', [AW_NORTH_X, y0, centre]);
  kit.add(northWall, palette.limestone, northAt);
  const strip = windowUnit({ width: band.width, height: band.height, cols: 9, rows: 1, frame: 0.08 });
  const stripAt = northAt.clone().multiply(new Matrix4().makeTranslation(band.x, band.y, -0.25));
  kit.add(strip.frame, palette.metalDark, stripAt);
  kit.add(strip.bars, palette.metalDark, stripAt);
  kit.add(strip.glass, palette.glassDark, stripAt);
  for (const light of lights) {
    const unit = windowUnit({ width: light.width, height: light.height, cols: light.width > 1 ? 3 : 1, rows: light.height > 2 ? 3 : 1, frame: 0.07 });
    const at = northAt.clone().multiply(new Matrix4().makeTranslation(light.x, light.y, -0.3));
    kit.add(unit.frame, palette.metalDark, at);
    kit.add(unit.bars, palette.metalDark, at);
    kit.add(unit.glass, palette.glassDark, at);
  }
  boxAt(kit, palette.limestoneDark, [AW_NORTH_X - T - 0.05, AW_PARAPET_Y, AW_WEST_Z_NORTH - 0.05], [AW_NORTH_X + 0.12, AW_PARAPET_Y + 0.3, -103.0]);
  // West wall on Z −161 up to the foot of the glazed lean-to, with its coping; the wall of the step at X 87.6.
  boxAt(kit, palette.limestone, [AW_STEP_X, y0, AW_WEST_Z_NORTH], [AW_NORTH_X - T, WEST_WALL_TOP, AW_WEST_Z_NORTH + T]);
  boxAt(kit, palette.limestoneDark, [AW_STEP_X - 0.12, WEST_WALL_TOP, AW_WEST_Z_NORTH - 0.12], [AW_NORTH_X - T, WEST_WALL_TOP + 0.3, AW_WEST_Z_NORTH + T]);
  boxAt(kit, palette.limestone, [AW_STEP_X, y0, AW_WEST_Z_NORTH + T], [AW_STEP_X + T, AW_ROOF_Y, AW_WEST_Z_SOUTH]);
  boxAt(kit, palette.limestoneDark, [AW_STEP_X - 0.12, AW_ROOF_Y, AW_WEST_Z_NORTH + T], [AW_STEP_X + T, AW_ROOF_Y + 0.3, AW_WEST_Z_SOUTH]);
  // The court's tall north wall, built up from the 1924 parapet to the new roof, and its south end wall behind the loggia.
  boxAt(kit, areaMaterials.buffWall, [BANK_FRONT_X + 1.38, AW1924_PARAPET_Y, COURT.minZ - 0.3], [BANK_FRONT_X + 2.0, COURT_EAVE_Y + 0.4, COURT.maxZ + 0.3]);
  boxAt(kit, areaMaterials.buffWall, [COURT.southX - 0.6, y0, AW_WEST_Z_SOUTH + 0.3], [COURT.southX, COURT_EAVE_Y + 0.4, AW_EAST_Z]);
}

function floors(kit: Kit): void {
  // A column grid and the mezzanine and second-floor plates of the galleries round the court and the 1924 core (the court zone is engelhard.ts'),
  // stopping at the inner faces of the park walls.
  for (const [r0, r1, q0, q1] of PLAN.slice(1)) {
    const x0 = Math.max(r0, AW_STEP_X + T);
    const x1 = Math.min(r1, AW_NORTH_X - T);
    const z0 = Math.max(q0, AW_WEST_Z_NORTH + T);
    const z1 = q1;
    const rect: Rect = [x0, x1, z0, z1];
    for (const level of [AW_MEZZANINE_Y, AW_SECOND_FLOOR_Y]) cells(rect, 9, (a, b, c, d) => { boxAt(kit, areaMaterials.concrete, [a, level - SLAB, c], [b, level, d]); });
    for (let x = x0 + 4.5; x < x1 - 2; x += 9) for (let z = z0 + 4.5; z < z1 - 2; z += 9) boxAt(kit, areaMaterials.concrete, [x - 0.3, MAIN_FLOOR_Y, z - 0.3], [x + 0.3, AW_ROOF_Y - 0.6, z + 0.3]);
  }
  // The glazed slot: a stair hall between the galleries and the Sackler Wing, with landings.
  for (const level of [AW_MEZZANINE_Y, AW_SECOND_FLOOR_Y]) boxAt(kit, areaMaterials.concrete, [AW_SLOT.minX, level - SLAB, AW_SLOT.minZ + 2.2], [AW_SLOT.maxX, level, AW_SLOT.maxZ]);
}

function roofs(kit: Kit): void {
  // Flat roofs: north of the 1924 core, the galleries by the court's north-west corner, the strip east of the core and the strip by the Sackler.
  const flat: readonly Rect[] = [
    [AW1924.maxX, AW_NORTH_X - T, RIBBED.northMaxZ, -103.0],
    [AW_STEP_X + T, AW1924.minX, AW_WEST_Z_SOUTH + 2.2, AW1924.minZ],
    [AW1924.minX, AW1924.maxX, AW1924.maxZ, AW_EAST_Z],
    [AW1924.maxX, AW_SLOT.minX, -103.0, STRIP_ROOF_MAX_Z],
    [49.4, COURT.southX - 0.6, AW_WEST_Z_SOUTH, AW_EAST_Z],
  ];
  for (const rect of flat) cells(rect, 10, (x0, x1, z0, z1) => { boxAt(kit, palette.roofLead, [x0, AW_ROOF_Y - 0.45, z0], [x1, AW_ROOF_Y, z1]); });
  // The ribbed glass roof: ridges running east-west, stopping at the 1924 core's west wall where they cross it.
  const width = (RIBBED.maxX - RIBBED.minX) / RIDGES;
  for (let k = 0; k < RIDGES; k++) {
    const x = RIBBED.minX + width * (k + 0.5);
    const maxZ = x > AW1924.maxX || x < AW1924.minX ? RIBBED.northMaxZ : AW1924.minZ - 0.6;
    const ridge = ridgeSkylight({ width, length: maxZ - RIBBED.minZ, pitch: 28, curbHeight: 0.4, bays: 16 });
    const at = new Matrix4().makeTranslation(x, AW_ROOF_Y - 0.4, (RIBBED.minZ + maxZ) / 2);
    kit.add(ridge.frame, areaMaterials.whiteSteel, at);
    kit.add(ridge.glass, areaMaterials.clearGlass, at);
  }
  // Under the ridges, the galleries' laylight ceilings.
  boxAt(kit, areaMaterials.ceilingGlass, [RIBBED.minX, AW_ROOF_Y - 0.75, RIBBED.minZ], [RIBBED.maxX, AW_ROOF_Y - 0.7, AW1924.minZ - 0.6]);
  boxAt(kit, areaMaterials.ceilingGlass, [AW1924.maxX, AW_ROOF_Y - 0.75, AW1924.minZ - 0.6], [RIBBED.maxX, AW_ROOF_Y - 0.7, RIBBED.northMaxZ]);
  // The glazed lean-to from the west wall up to the ribbed roof: one sloping sheet of glass on white rafters.
  const foot = WEST_WALL_TOP + 0.3;
  const rise = AW_ROOF_Y - 0.4 - foot;
  const run = LEAN_TO_Z - (AW_WEST_Z_NORTH + T);
  const slope = new Matrix4().makeRotationX(-Math.atan2(rise, run));
  const length = Math.hypot(rise, run);
  const mid = (x: number): Matrix4 => new Matrix4().makeTranslation(x, foot + rise / 2, AW_WEST_Z_NORTH + T + run / 2).multiply(slope);
  kit.add(UNIT_BOX, areaMaterials.clearGlass, mid((RIBBED.minX + RIBBED.maxX) / 2).multiply(new Matrix4().makeScale(RIBBED.maxX - RIBBED.minX, 0.03, length)));
  for (let k = 0; k <= 20; k++) kit.add(UNIT_BOX, areaMaterials.whiteSteel, mid(RIBBED.minX + ((RIBBED.maxX - RIBBED.minX) * k) / 20).multiply(new Matrix4().makeScale(0.1, 0.16, length)));
}

export { floors as americanFloors, foundations as americanFoundations, roofs as americanRoofs, walls as americanWalls };
