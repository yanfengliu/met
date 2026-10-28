/**
 * The Sackler Wing's glass: the sloped stippled north wall, the hung stippled glass ceiling and the ribbed glass roof above it (Aldred p. 78; Aramco World 1980).
 * All three share one bay grid along Z, from the back wall to the block line: ten bays, each a wall bay between two white structural fins
 * (six panes across, eleven up, the panes about twice as tall as wide; Verbruggen 2015 and DP244278, interior-images.md #12 and #16), a ceiling panel and a glazed ridge (NYC orthophoto 2018: ridges about 5.4 m apart running north-south).
 * The wall stands with its foot on the block line X = SACKLER_NORTH_FACE_X and leans inward to SACKLER_GLASS_TOP_X at the roof (the coordinator's rule for sloped glass).
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { curtainWall, laylight, ridgeSkylight } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { SACKLER_GLASS_TOP_Y, SACKLER_MAX_Z, SACKLER_NORTH_FACE_X } from '../frame.js';
import { areaMaterials } from './materials.js';
import { BACK_WALL_LEAN_DEG, BACK_WALL_Z, DENDUR_CEILING_Y, DENDUR_FLOOR_Y, SACKLER_BLOCK, SACKLER_GLASS_TOP_X, SACKLER_ROOF_Y } from './plan.js';
import { UNIT_BOX, boxAt } from './shapes.js';

/** The glass foot stands on a granite sill 0.15 m above the walkway. */
export const GLASS_FOOT_Y = DENDUR_FLOOR_Y + 0.15;
const RISE = SACKLER_GLASS_TOP_Y - GLASS_FOOT_Y;
const RUN = SACKLER_NORTH_FACE_X - SACKLER_GLASS_TOP_X;
/** The wall's lean from vertical, degrees: about 19° (6.2 m run over 17.7 m rise). */
export const GLASS_LEAN_DEG = (Math.atan2(RUN, RISE) * 180) / Math.PI;
const TAN_LEAN = RUN / RISE;
/** The back wall's face at the roof: the glass and ceiling start there, so no slot opens behind them. */
const WEST_Z = BACK_WALL_Z - (SACKLER_ROOF_Y + 0.4 - DENDUR_FLOOR_Y) * Math.tan((BACK_WALL_LEAN_DEG * Math.PI) / 180);
export const BAYS = 10;
export const BAY = (SACKLER_MAX_Z - WEST_Z) / BAYS;
/** Z of the bay lines, west to east. */
export const BAY_LINES: readonly number[] = Array.from({ length: BAYS + 1 }, (_, k) => WEST_Z + k * BAY);

/** X of the glass plane's outer face at height `y`. */
export function glassX(y: number): number {
  return SACKLER_NORTH_FACE_X - (y - GLASS_FOOT_Y) * TAN_LEAN;
}

/** Turns a part whose front faces +Z so it faces +X (north), local +X running toward world −Z. */
const NORTH = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);

/** The sloped wall: one curtain-wall bay per bay (frame in white steel, stippled glass), a fin on every bay line, the sill and the head beam. */
export function addGlassWall(kit: Kit): void {
  const bay = curtainWall({ width: BAY, height: RISE, cols: 6, rows: 11, mullionWidth: 0.05, mullionDepth: 0.16, slope: GLASS_LEAN_DEG });
  BAY_LINES.slice(0, -1).forEach((z0, k) => {
    const m = new Matrix4().compose(new Vector3(SACKLER_NORTH_FACE_X - 0.03, GLASS_FOOT_Y, z0 + BAY / 2), NORTH, new Vector3(1, 1, 1));
    kit.add(bay.frame, areaMaterials.whiteSteel, m, k);
    kit.add(bay.glass, areaMaterials.stippledGlass, m, k);
  });
  // Structural fins: deep white members inside the glass on every bay line, leaning with it.
  const slant = Math.hypot(RISE, RUN);
  const lean = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (GLASS_LEAN_DEG * Math.PI) / 180);
  const inward = new Vector3(-Math.cos((GLASS_LEAN_DEG * Math.PI) / 180), -Math.sin((GLASS_LEAN_DEG * Math.PI) / 180), 0);
  BAY_LINES.forEach((z, k) => {
    const mid = new Vector3(SACKLER_NORTH_FACE_X - RUN / 2, GLASS_FOOT_Y + RISE / 2, z).addScaledVector(inward, 0.45);
    kit.add(UNIT_BOX, areaMaterials.whiteSteel, new Matrix4().compose(mid, lean, new Vector3(0.62, slant, 0.24)), Math.min(k, BAYS - 1));
  });
  // The granite sill at the foot and the white head beam where the glass meets the roof.
  boxAt(kit, areaMaterials.platformGranite, [SACKLER_NORTH_FACE_X - 1.1, DENDUR_FLOOR_Y - 0.3, BAY_LINES[0] ?? WEST_Z], [SACKLER_NORTH_FACE_X, GLASS_FOOT_Y, SACKLER_MAX_Z], 0);
  boxAt(kit, areaMaterials.whiteSteel, [SACKLER_GLASS_TOP_X - 0.9, SACKLER_GLASS_TOP_Y - 0.25, BAY_LINES[0] ?? WEST_Z], [SACKLER_GLASS_TOP_X + 0.15, SACKLER_GLASS_TOP_Y + 0.75, SACKLER_MAX_Z], BAYS - 1);
}

/** The hung ceiling: a stippled-glass laylight panel per bay from the south block line to the glass, with track-light rails beneath. */
export function addCeiling(kit: Kit): void {
  const x0 = SACKLER_BLOCK.minX;
  const x1 = glassX(DENDUR_CEILING_Y) - 0.35;
  const panel = laylight({ width: x1 - x0, length: BAY, cols: 12, rows: 9, frameWidth: 0.08, frameDepth: 0.12 });
  BAY_LINES.slice(0, -1).forEach((z0, k) => {
    const m = new Matrix4().makeTranslation((x0 + x1) / 2, DENDUR_CEILING_Y, z0 + BAY / 2);
    kit.add(panel.frame, areaMaterials.whiteSteelDiffused, m, k);
    kit.add(panel.glass, areaMaterials.ceilingGlass, m, k);
  });
  // Track-light rails hung below the ceiling, running east-west in three lines.
  for (const x of [123.5, 133.5, 143.5]) boxAt(kit, areaMaterials.whiteSteelDiffused, [x - 0.05, DENDUR_CEILING_Y - 0.55, BAY_LINES[0] ?? 0], [x + 0.05, DENDUR_CEILING_Y - 0.48, SACKLER_MAX_Z - 0.3], BAYS - 1);
}

/** The roof: girders on the bay lines over the ceiling, a glazed ridge on every bay running north-south from the block line to the head of the glass. */
export function addRoof(kit: Kit): void {
  const x0 = SACKLER_BLOCK.minX;
  const x1 = SACKLER_GLASS_TOP_X;
  BAY_LINES.forEach((z, k) => { boxAt(kit, areaMaterials.whiteSteelDiffused, [x0, DENDUR_CEILING_Y + 0.35, z - 0.18], [x1, SACKLER_ROOF_Y, z + 0.18], Math.min(k, BAYS - 1)); });
  const ridge = ridgeSkylight({ width: BAY, length: x1 - x0, pitch: 15, curbHeight: 0.3, bays: 24, bar: 0.07, barDepth: 0.1 });
  const along = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  BAY_LINES.slice(0, -1).forEach((z0, k) => {
    const m = new Matrix4().compose(new Vector3((x0 + x1) / 2, SACKLER_ROOF_Y, z0 + BAY / 2), along, new Vector3(1, 1, 1));
    kit.add(ridge.frame, areaMaterials.whiteSteelDiffused, m, k);
    kit.add(ridge.glass, areaMaterials.clearGlass, m, k);
  });
}
