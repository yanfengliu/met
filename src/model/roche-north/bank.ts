/**
 * The marble front of the Branch Bank of the United States (Martin E. Thompson, 1822–24, 15½ Wall Street), re-erected in 1924 as the south face of
 * Grosvenor Atterbury's American Wing; since 1980 the north wall of the Charles Engelhard Court (Heckscher pp. 54, 75).
 * Two storeys and seven bays (Heckscher p. 54): a rusticated ground storey with six windows and a central arched door up a flight of steps; an upper storey
 * of seven windows, the central three pedimented between four fluted Ionic pilasters; an entablature with a pediment over the centre (P5, index 18).
 * Measured on P5 against the map's 23.98 m width: string course at 7.5 m, entablature 12.9..14.5 m and pediment apex 16.4 m above the court floor;
 * ground windows 1.45 × 3.4 m from 2.7 m, upper windows 1.4 × 2.66 m from 8.75 m, the door 1.9 × 5.5 m from 1.2 m; bays and pilasters as placed below.
 * Local frame: origin at the court floor on the facade's centre line, front face at z = 0 facing +Z, x across; placed facing south (world −X).
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { corniceRun, doorUnit, pilaster, stairFlight, stringCourseProfile, sweep, wall, windowUnit } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { palette } from '../palette.js';
import { areaMaterials } from './materials.js';
import { BANK_DOOR_Z, BANK_FRONT_X, COURT, FACADE_STEPS } from './plan.js';
import { UNIT_BOX, boxMatrix, memo, prismZ } from './shapes.js';

const WIDTH = COURT.maxZ - COURT.minZ;
const HALF = WIDTH / 2;
const THICK = 1.38;
const GROUND = 7.5;
const UPPER_TOP = 12.9;
const CORNICE_TOP = 14.5;
const APEX = 16.4;
const BAYS: readonly number[] = [-10.4, -7.67, -3.7, 0, 3.7, 7.67, 10.4];
const PILASTERS: readonly number[] = [-5.56, -1.75, 1.75, 5.56];
const DOOR = { width: 1.9, height: 5.5, sill: 1.2 } as const;
const LOW_WINDOW = { width: 1.45, height: 3.4, sill: 2.7 } as const;
const HIGH_WINDOW = { width: 1.4, height: 2.66, sill: 8.75 } as const;
const PEDIMENT_HALF = 5.75;
/** The court's terrace before the facade stands this high above the court floor (engelhard.ts); the door's flight climbs from it. */
const TERRACE_RISE = 0.45;

/** The facade's frame in the world: its front faces south (world −X) into the court; local x runs along world +Z. */
export const BANK_FRAME = new Matrix4().compose(new Vector3(BANK_FRONT_X, MAIN_FLOOR_Y, (COURT.minZ + COURT.maxZ) / 2), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2), new Vector3(1, 1, 1));

function local(m: Matrix4): Matrix4 {
  return BANK_FRAME.clone().multiply(m);
}

function slab(kit: Kit, min: readonly [number, number, number], max: readonly [number, number, number]): void {
  kit.add(UNIT_BOX, areaMaterials.bankMarble, local(boxMatrix(min, max)));
}

/** The two storeys of wall with their openings, the string course, windows and the door. */
function storeys(kit: Kit): void {
  const ground = wall({
    width: WIDTH,
    height: GROUND,
    thickness: THICK,
    openings: BAYS.map((x) => (x === 0 ? { shape: 'arch' as const, x, y: DOOR.sill, width: DOOR.width, height: DOOR.height } : { x, y: LOW_WINDOW.sill, width: LOW_WINDOW.width, height: LOW_WINDOW.height })),
    rustication: { course: 0.48, joint: 0.045, depth: 0.035, start: 1.0, stop: GROUND - 0.45 },
  });
  kit.add(ground, areaMaterials.bankMarble, local(new Matrix4()));
  const upper = wall({ width: WIDTH, height: CORNICE_TOP - GROUND, thickness: THICK, openings: BAYS.map((x) => ({ x, y: HIGH_WINDOW.sill - GROUND, width: HIGH_WINDOW.width, height: HIGH_WINDOW.height })) });
  kit.add(upper, areaMaterials.bankMarble, local(new Matrix4().makeTranslation(0, GROUND, 0)));
  const course = memo('rn-bank-string', () =>
    sweep(stringCourseProfile({ height: 0.42, projection: 0.16 }), [
      [-HALF, GROUND - 0.21, 0],
      [HALF, GROUND - 0.21, 0],
    ]),
  );
  kit.add(course, areaMaterials.bankMarble, local(new Matrix4()));
  const low = windowUnit({ width: LOW_WINDOW.width, height: LOW_WINDOW.height, cols: 3, rows: 4 });
  const high = windowUnit({ width: HIGH_WINDOW.width, height: HIGH_WINDOW.height, cols: 3, rows: 4 });
  for (const x of BAYS) {
    const unit = x === 0 ? null : low;
    const lowAt = local(new Matrix4().makeTranslation(x, LOW_WINDOW.sill, -0.2));
    if (unit !== null) {
      kit.add(unit.frame, areaMaterials.whiteSteel, lowAt);
      kit.add(unit.bars, areaMaterials.whiteSteel, lowAt);
      kit.add(unit.glass, palette.glassDark, lowAt);
    }
    const highAt = local(new Matrix4().makeTranslation(x, HIGH_WINDOW.sill, -0.2));
    kit.add(high.frame, areaMaterials.whiteSteel, highAt);
    kit.add(high.bars, areaMaterials.whiteSteel, highAt);
    kit.add(high.glass, palette.glassDark, highAt);
  }
  const door = doorUnit({ width: DOOR.width, height: DOOR.height, shape: 'arch', leaves: 2, panels: 3 });
  const doorAt = local(new Matrix4().makeTranslation(0, DOOR.sill, -0.35));
  kit.add(door.frame, areaMaterials.whiteSteel, doorAt);
  kit.add(door.leaf, palette.wood, doorAt);
  if (door.glass !== undefined) kit.add(door.glass, palette.glassDark, doorAt);
}

/** The pilasters, window heads, entablature, parapet and pediment, and the flight up to the door. */
function ornament(kit: Kit): void {
  const shaft = pilaster({ order: 'ionic', width: 0.56, height: UPPER_TOP - GROUND - 0.1, projection: 0.14 });
  for (const x of PILASTERS) kit.add(shaft, areaMaterials.bankMarble, local(new Matrix4().makeTranslation(x, GROUND + 0.05, 0)));
  // Window heads on the upper storey: flat cornice caps outside, small pediments over the central three (the ground storey's are plain).
  const cap = (x: number, y: number, w: number): void => { slab(kit, [x - w / 2 - 0.15, y, -0.02], [x + w / 2 + 0.15, y + 0.18, 0.16]); };
  for (const x of BAYS) if (Math.abs(x) > 4) cap(x, HIGH_WINDOW.sill + HIGH_WINDOW.height + 0.05, HIGH_WINDOW.width);
  const head = memo('rn-bank-window-pediment', () =>
    prismZ(
      [
        [-1.0, 0],
        [1.0, 0],
        [0, 0.48],
      ],
      -0.02,
      0.16,
    ),
  );
  for (const x of [-3.7, 0, 3.7]) {
    kit.add(head, areaMaterials.bankMarble, local(new Matrix4().makeTranslation(x, HIGH_WINDOW.sill + HIGH_WINDOW.height + 0.08, 0)));
    cap(x, HIGH_WINDOW.sill + HIGH_WINDOW.height + 0.02, HIGH_WINDOW.width - 0.2);
  }
  // Entablature: architrave and frieze band, the dentilled cornice, a parapet over the outer bays.
  slab(kit, [-HALF, UPPER_TOP, -0.02], [HALF, CORNICE_TOP - 0.62, 0.1]);
  const cornice = corniceRun({
    path: [
      [-HALF, CORNICE_TOP - 0.62, 0.1],
      [HALF, CORNICE_TOP - 0.62, 0.1],
    ],
    height: 0.62,
    projection: 0.55,
    modillions: false,
    dentils: true,
  });
  kit.add(cornice.moulding, areaMaterials.bankMarble, local(new Matrix4()));
  if (cornice.dentil !== undefined) for (const m of cornice.dentils) kit.add(cornice.dentil, areaMaterials.bankMarble, local(m));
  for (const s of [-1, 1]) slab(kit, [Math.min(s * PEDIMENT_HALF, s * HALF), CORNICE_TOP, -0.4], [Math.max(s * PEDIMENT_HALF, s * HALF), CORNICE_TOP + 0.62, 0.05]);
  // Pediment over the central three bays: the tympanum and its raking cornices.
  const rise = APEX - CORNICE_TOP;
  const tympanum = memo('rn-bank-tympanum', () =>
    prismZ(
      [
        [-PEDIMENT_HALF, 0],
        [PEDIMENT_HALF, 0],
        [0, rise],
      ],
      -0.6,
      0.05,
    ),
  );
  kit.add(tympanum, areaMaterials.bankMarble, local(new Matrix4().makeTranslation(0, CORNICE_TOP, 0)));
  const angle = Math.atan2(rise, PEDIMENT_HALF);
  for (const s of [-1, 1]) {
    const rake = memo(`rn-bank-rake|${String(s)}`, () => {
      const run = corniceRun({
        path:
          s < 0
            ? [
                [0, 0, 0],
                [Math.hypot(PEDIMENT_HALF, rise), 0, 0],
              ]
            : [
                [-Math.hypot(PEDIMENT_HALF, rise), 0, 0],
                [0, 0, 0],
              ],
        height: 0.5,
        projection: 0.45,
        modillions: false,
        dentils: false,
      });
      return run.moulding;
    });
    const turn = new Matrix4().makeRotationZ(s < 0 ? angle : -angle);
    const at = new Matrix4().makeTranslation(s < 0 ? -PEDIMENT_HALF : PEDIMENT_HALF, CORNICE_TOP - 0.02, 0.05).multiply(turn);
    kit.add(rake, areaMaterials.bankMarble, local(at));
  }
  // The flight up to the door, across the facade's centre (map steps X 90.83..92.97, Z −120.61..−110.47).
  const width = FACADE_STEPS.maxZ - FACADE_STEPS.minZ;
  const flight = stairFlight({ width, steps: 5, riser: (DOOR.sill - TERRACE_RISE) / 5, tread: (FACADE_STEPS.maxX - FACADE_STEPS.minX) / 5, nosing: 0.02 });
  const centre = (FACADE_STEPS.minZ + FACADE_STEPS.maxZ) / 2 - BANK_DOOR_Z;
  kit.add(flight.steps, areaMaterials.bankMarble, local(new Matrix4().makeTranslation(centre, TERRACE_RISE, FACADE_STEPS.maxX - FACADE_STEPS.minX + (BANK_FRONT_X - FACADE_STEPS.maxX))));
}

/** The whole facade: storeys, ornament and steps. */
export function addBankFacade(kit: Kit): void {
  storeys(kit);
  ornament(kit);
}
