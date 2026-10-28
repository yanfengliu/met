/**
 * The Vaux and Mould west front of 1880 (history.md section 2; exterior.md [K7]): red brick with grey-white granite bands, seven pointed arches on
 * the main floor with alternating granite and brick voussoirs and striped tympana (the central one the original entrance), segmental windows on the
 * ground storey, blind upper storey, cornice and parapet. It faces the park at Z −138.3 and survives inside the Robert Lehman Wing (seen in
 * int-lehman-pyramid-up). References: Original_Met.jpg (about 1880, the west front beside its porch) and the view of the west front from the
 * Lehman court (Untapped New York, 2026), exterior-images.md #49 and #60. Trim may project up to 1.5 m into the Lehman
 * court (coordinator, 2026-10-11); walls do not.
 */
import { Matrix4 } from 'three';

import type { Kit } from '../../build/types.js';
import { moulding, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall, tympanum, voussoirRing, type Hole } from './arches.js';
import { A_HALF, COPING_TOP_Y, CORNICE_Y, L1, L2, LG, PARAPET_Y, VAUX_ARCH_RISE, VAUX_ARCH_SILL, VAUX_ARCH_SPAN, VAUX_ARCH_SPRING, VAUX_BAND, VAUX_BAY, VAUX_GROUND_HEIGHT, VAUX_GROUND_SILL, VAUX_HALL_EAST_Z, VAUX_HALL_WALL, VAUX_HALL_WEST_Z, VAUX_OCULUS_Y, WEST_WALL, WEST_Z } from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, placed } from './shapes.js';

/** Foot of the walls, on the footings (constants FOOTING_Y + 1.0). */
export const WALL_BASE_Y = LG - 0.3;

/** World X of the seven arches across the front, the entrance on the axis. */
export const FRONT_ARCH_X = [-3, -2, -1, 0, 1, 2, 3].map((k) => k * VAUX_BAY);
const GROUND_WIDTH = 1.6;
const GROUND_RISE = 0.4;
const DOOR_WIDTH = 2.2;
const PROUD = 0.08;

function frontHoles(): Hole[] {
  const holes: Hole[] = [];
  for (const x of FRONT_ARCH_X) {
    const door = x === 0;
    const sill = door ? 0 : VAUX_ARCH_SILL;
    holes.push({ head: 'pointed', x, y: L1 + sill - WALL_BASE_Y, width: VAUX_ARCH_SPAN, height: VAUX_ARCH_SPRING + VAUX_ARCH_RISE - sill, rise: VAUX_ARCH_RISE });
    if (door) holes.push({ head: 'segmental', x, y: LG - WALL_BASE_Y, width: DOOR_WIDTH, height: 3.3, rise: 0.5 });
    else holes.push({ head: 'segmental', x, y: LG + VAUX_GROUND_SILL - WALL_BASE_Y, width: GROUND_WIDTH, height: VAUX_GROUND_HEIGHT, rise: GROUND_RISE });
  }
  return holes;
}

/** The front's brick wall, 29 m across and 1.5 m thick, outer face on Z −138.3, from the footings to the parapet. */
export function westFrontWall(kit: Kit): void {
  const geometry = openWall({ width: 2 * A_HALF, height: PARAPET_Y - WALL_BASE_Y, thickness: WEST_WALL, holes: frontHoles() });
  kit.add(geometry, palette.brick, placed(0, WALL_BASE_Y, WEST_Z, FACING.west));
}

/** A granite band across the front from y0 to y1, standing `proud` in front of the wall face, split round the gaps (world X ranges). */
function band(kit: Kit, y0: number, y1: number, order: number, gaps: readonly (readonly [number, number])[] = [], proud = PROUD): void {
  let x = -A_HALF;
  for (const [g0, g1] of [...gaps, [A_HALF, A_HALF] as const]) {
    if (g0 > x) addBox(kit, core.granite, x, y0, WEST_Z - proud, g0, y1, WEST_Z, order);
    x = g1;
  }
}

/** Granite bands, voussoirs, striped tympana, cornice and coping of the front, in rising courses. */
export function westFrontTrim(kit: Kit): void {
  const spring = L1 + VAUX_ARCH_SPRING;
  band(kit, WALL_BASE_Y, LG + 0.5, 0, [], 0.12);
  band(kit, LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT, LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT + VAUX_BAND, 1);
  band(kit, L1 - 0.2, L1 + 0.12, 2);
  band(kit, L1 + VAUX_ARCH_SILL - 0.16, L1 + VAUX_ARCH_SILL, 3, [[-VAUX_ARCH_SPAN / 2, VAUX_ARCH_SPAN / 2]], 0.12);
  band(kit, spring - VAUX_BAND, spring, 4);
  band(kit, L2 + 1.2, L2 + 1.2 + VAUX_BAND, 6);
  band(kit, L2 + 3.6, L2 + 3.6 + VAUX_BAND, 7);
  const ring = (parity: 0 | 1) => voussoirRing({ head: 'pointed', span: VAUX_ARCH_SPAN, rise: VAUX_ARCH_RISE, band: 0.42, count: 15, projection: 0.06, parity });
  const hood = voussoirRing({ head: 'pointed', span: VAUX_ARCH_SPAN, rise: VAUX_ARCH_RISE, band: 0.09, count: 15, projection: 0.1, parity: 'all', inset: 0.42 });
  const ground = voussoirRing({ head: 'segmental', span: GROUND_WIDTH, rise: GROUND_RISE, band: 0.3, count: 9, projection: 0.05, parity: 'all' });
  const door = voussoirRing({ head: 'segmental', span: DOOR_WIDTH, rise: 0.5, band: 0.34, count: 11, projection: 0.05, parity: 'all' });
  const panel = tympanum({ head: 'pointed', span: VAUX_ARCH_SPAN, rise: VAUX_ARCH_RISE, stripe: 0.2, part: 'panel' });
  const stripes = tympanum({ head: 'pointed', span: VAUX_ARCH_SPAN, rise: VAUX_ARCH_RISE, stripe: 0.2, part: 'stripes' });
  for (const x of FRONT_ARCH_X) {
    const facing = FACING.west;
    if (x === 0) kit.add(door, core.granite, placed(x, LG + 3.3 - 0.5, WEST_Z, facing), 1);
    else kit.add(ground, core.granite, placed(x, LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT - GROUND_RISE, WEST_Z, facing), 1);
    // Granite jambs flank the opening below the springing (Lehman-court photo: light stone round each window).
    const sill = x === 0 ? L1 : L1 + VAUX_ARCH_SILL;
    for (const side of [-1, 1]) {
      const edge = x + side * (VAUX_ARCH_SPAN / 2);
      addBox(kit, core.granite, edge, sill, WEST_Z - 0.05, edge + side * 0.16, spring - VAUX_BAND, WEST_Z, 4);
    }
    // A granite transom through the wall at the springing closes the gap between window head and tympanum.
    addBox(kit, core.granite, x - VAUX_ARCH_SPAN / 2, spring - VAUX_BAND, WEST_Z, x + VAUX_ARCH_SPAN / 2, spring, WEST_Z + WEST_WALL, 4);
    kit.add(ring(0), core.granite, placed(x, spring, WEST_Z, facing), 5);
    kit.add(ring(1), palette.brick, placed(x, spring, WEST_Z, facing), 5);
    kit.add(hood, core.granite, placed(x, spring, WEST_Z, facing), 5);
    kit.add(panel, palette.brick, placed(x, spring, WEST_Z + 0.32, facing), 5);
    kit.add(stripes, core.granite, placed(x, spring, WEST_Z + 0.32, facing), 5);
  }
  const cornice = moulding({ profile: 'cornice-plain', path: [[-A_HALF, 0, 0], [A_HALF, 0, 0]], height: 0.8, projection: 0.6 });
  kit.add(cornice, core.granite, placed(0, CORNICE_Y, WEST_Z, FACING.west), 8);
  addBox(kit, core.granite, -A_HALF, PARAPET_Y, WEST_Z - 0.1, A_HALF, COPING_TOP_Y, WEST_Z + WEST_WALL, 9);
}

/** Windows in the front's six main-floor arches (below the springing) and six ground-storey openings, the entrance left open; and glass in the hall's two oculi. */
export function westFrontWindows(kit: Kit): void {
  const disc = cylinder(20);
  for (const z of [VAUX_HALL_WEST_Z - VAUX_HALL_WALL / 2, VAUX_HALL_EAST_Z + VAUX_HALL_WALL / 2]) {
    kit.add(disc, palette.glass, new Matrix4().makeTranslation(0, VAUX_OCULUS_Y, z).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeScale(2.4, 0.03, 2.4)), 20);
  }
  const main = windowUnit({ width: VAUX_ARCH_SPAN, height: VAUX_ARCH_SPRING - VAUX_ARCH_SILL - VAUX_BAND, cols: 2, rows: 3, frame: 0.09 });
  const ground = windowUnit({ width: GROUND_WIDTH, height: VAUX_GROUND_HEIGHT, shape: 'segmental', rise: GROUND_RISE, cols: 2, rows: 3 });
  for (const x of FRONT_ARCH_X) {
    if (x === 0) continue;
    const at = (y: number) => placed(x, y, WEST_Z + 0.4, FACING.west);
    const order = Math.abs(x);
    kit.add(main.frame, palette.metalDark, at(L1 + VAUX_ARCH_SILL), order);
    kit.add(main.bars, palette.metalDark, at(L1 + VAUX_ARCH_SILL), order);
    kit.add(main.glass, palette.glassDark, at(L1 + VAUX_ARCH_SILL), order);
    kit.add(ground.frame, palette.metalDark, at(LG + VAUX_GROUND_SILL), order);
    kit.add(ground.bars, palette.metalDark, at(LG + VAUX_GROUND_SILL), order);
    kit.add(ground.glass, palette.glassDark, at(LG + VAUX_GROUND_SILL), order);
  }
}
