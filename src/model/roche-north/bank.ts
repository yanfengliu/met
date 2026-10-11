/**
 * The marble front of the Branch Bank of the United States (Martin E. Thompson, 1822–24, 15½ Wall Street), re-erected in 1924 as the south face of
 * Grosvenor Atterbury's American Wing; since 1980 the north wall of the Charles Engelhard Court (Heckscher pp. 54, 75).
 * Two storeys and seven bays (Heckscher p. 54): a rusticated ground storey with six windows and a central arched door up a flight of steps; an upper storey
 * of seven windows, the central three pedimented between four fluted Ionic pilasters; an entablature with a pediment over the centre (P5, index 18).
 * Measured on P5 against the map's 23.98 m width: string course at 7.5 m, entablature 12.9..14.5 m and pediment apex 16.4 m above the court floor;
 * ground windows 1.45 × 3.4 m from 2.7 m, upper windows 1.4 × 2.66 m from 8.75 m, the door 1.9 × 5.5 m from 1.2 m; bays and pilasters as placed below.
 * Built in three tiers (ground storey, upper storey, entablature and pediment), each merged into one geometry per material, so the front goes up tier by tier.
 * Local frame: origin at the court floor on the facade's centre line, front face at z = 0 facing +Z, x across; placed facing south (world −X).
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { corniceRun, doorUnit, pilaster, stairFlight, stringCourseProfile, sweep, wall, windowUnit } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { palette } from '../palette.js';
import { areaMaterials } from './materials.js';
import { BANK_DOOR_Z, BANK_FRONT_X, COURT, FACADE_STEPS } from './plan.js';
import { UNIT_BOX, boxMatrix, merge, prismZ } from './shapes.js';

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

type Part = readonly [BufferGeometry, Matrix4];
const at = (x: number, y: number, z: number): Matrix4 => new Matrix4().makeTranslation(x, y, z);
const slab = (min: readonly [number, number, number], max: readonly [number, number, number]): Part => [UNIT_BOX, boxMatrix(min, max)];
const DOOR_UNIT = (): ReturnType<typeof doorUnit> => doorUnit({ width: DOOR.width, height: DOOR.height, shape: 'arch', leaves: 2, panels: 3 });

/** The ground storey's windows and the door's frame and fanlight: [metal parts, glass parts]. */
function lowWindows(): readonly (readonly Part[])[] {
  const unit = windowUnit({ width: LOW_WINDOW.width, height: LOW_WINDOW.height, cols: 3, rows: 4 });
  const door = DOOR_UNIT();
  const metal: Part[] = [[door.frame, at(0, DOOR.sill, -0.35)]];
  const glass: Part[] = door.glass === undefined ? [] : [[door.glass, at(0, DOOR.sill, -0.35)]];
  for (const x of BAYS.filter((b) => b !== 0)) {
    metal.push([unit.frame, at(x, LOW_WINDOW.sill, -0.2)], [unit.bars, at(x, LOW_WINDOW.sill, -0.2)]);
    glass.push([unit.glass, at(x, LOW_WINDOW.sill, -0.2)]);
  }
  return [metal, glass];
}

/** The upper storey's seven windows: [metal parts, glass parts]. */
function highWindows(): readonly (readonly Part[])[] {
  const unit = windowUnit({ width: HIGH_WINDOW.width, height: HIGH_WINDOW.height, cols: 3, rows: 4 });
  const metal = BAYS.flatMap((x): Part[] => [
    [unit.frame, at(x, HIGH_WINDOW.sill, -0.2)],
    [unit.bars, at(x, HIGH_WINDOW.sill, -0.2)],
  ]);
  return [metal, BAYS.map((x): Part => [unit.glass, at(x, HIGH_WINDOW.sill, -0.2)])];
}

/** The ground storey: rusticated wall with its openings, the string course over it, and the flight from the terrace up to the door. */
function groundStone(): Part[] {
  const body = wall({
    width: WIDTH,
    height: GROUND,
    thickness: THICK,
    openings: BAYS.map((x) => (x === 0 ? { shape: 'arch' as const, x, y: DOOR.sill, width: DOOR.width, height: DOOR.height } : { x, y: LOW_WINDOW.sill, width: LOW_WINDOW.width, height: LOW_WINDOW.height })),
    rustication: { course: 0.48, joint: 0.045, depth: 0.035, start: 1.0, stop: GROUND - 0.45 },
  });
  const course = sweep(stringCourseProfile({ height: 0.42, projection: 0.16 }), [
    [-HALF, GROUND - 0.21, 0],
    [HALF, GROUND - 0.21, 0],
  ]);
  const width = FACADE_STEPS.maxZ - FACADE_STEPS.minZ;
  const run = FACADE_STEPS.maxX - FACADE_STEPS.minX;
  const flight = stairFlight({ width, steps: 5, riser: (DOOR.sill - TERRACE_RISE) / 5, tread: run / 5, nosing: 0.02 });
  const centre = (FACADE_STEPS.minZ + FACADE_STEPS.maxZ) / 2 - BANK_DOOR_Z;
  return [
    [body, new Matrix4()],
    [course, new Matrix4()],
    [flight.steps, at(centre, TERRACE_RISE, run + (BANK_FRONT_X - FACADE_STEPS.maxX))],
  ];
}

/** The upper storey: its wall, four fluted Ionic pilasters, cornice caps over the outer windows and pediments over the central three. */
function upperStone(): Part[] {
  const body = wall({ width: WIDTH, height: CORNICE_TOP - GROUND, thickness: THICK, openings: BAYS.map((x) => ({ x, y: HIGH_WINDOW.sill - GROUND, width: HIGH_WINDOW.width, height: HIGH_WINDOW.height })) });
  const shaft = pilaster({ order: 'ionic', width: 0.56, height: UPPER_TOP - GROUND - 0.1, projection: 0.14 });
  const head = prismZ(
    [
      [-1.0, 0],
      [1.0, 0],
      [0, 0.48],
    ],
    -0.02,
    0.16,
  );
  const capY = HIGH_WINDOW.sill + HIGH_WINDOW.height;
  const cap = (x: number, y: number, w: number): Part => slab([x - w / 2 - 0.15, y, -0.02], [x + w / 2 + 0.15, y + 0.18, 0.16]);
  return [
    [body, at(0, GROUND, 0)],
    ...PILASTERS.map((x): Part => [shaft, at(x, GROUND + 0.05, 0)]),
    ...BAYS.filter((x) => Math.abs(x) > 4).map((x) => cap(x, capY + 0.05, HIGH_WINDOW.width)),
    ...[-3.7, 0, 3.7].flatMap((x): Part[] => [cap(x, capY + 0.02, HIGH_WINDOW.width - 0.2), [head, at(x, capY + 0.08, 0)]]),
  ];
}

/** The crown: architrave and frieze band, the dentilled cornice, the parapets over the outer bays, the tympanum and the raking cornices. */
function crownStone(): Part[] {
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
  const rise = APEX - CORNICE_TOP;
  const tympanum = prismZ(
    [
      [-PEDIMENT_HALF, 0],
      [PEDIMENT_HALF, 0],
      [0, rise],
    ],
    -0.6,
    0.05,
  );
  const rake = corniceRun({
    path: [
      [0, 0, 0],
      [Math.hypot(PEDIMENT_HALF, rise), 0, 0],
    ],
    height: 0.5,
    projection: 0.45,
    modillions: false,
    dentils: false,
  }).moulding;
  const angle = Math.atan2(rise, PEDIMENT_HALF);
  const dentil = cornice.dentil;
  return [
    slab([-HALF, UPPER_TOP, -0.02], [HALF, CORNICE_TOP - 0.62, 0.1]),
    [cornice.moulding, new Matrix4()],
    ...(dentil === undefined ? [] : cornice.dentils.map((m): Part => [dentil, m])),
    ...[-1, 1].map((s): Part => slab([Math.min(s * PEDIMENT_HALF, s * HALF), CORNICE_TOP, -0.4], [Math.max(s * PEDIMENT_HALF, s * HALF), CORNICE_TOP + 0.62, 0.05])),
    [tympanum, at(0, CORNICE_TOP, 0)],
    // The left rake runs up from the left eave; the right one, mirrored in x, up from the right eave.
    [rake, at(-PEDIMENT_HALF, CORNICE_TOP - 0.02, 0.05).multiply(new Matrix4().makeRotationZ(angle))],
    [rake, at(PEDIMENT_HALF, CORNICE_TOP - 0.02, 0.05).multiply(new Matrix4().makeScale(-1, 1, 1)).multiply(new Matrix4().makeRotationZ(angle))],
  ];
}

/** The whole facade, tier by tier: each tier's marble, and the windows (frames and bars white, glass dark) with the tier they sit in. */
export function addBankFacade(kit: Kit): void {
  const frame = BANK_FRAME;
  const [lowMetal = [], lowGlass = []] = lowWindows();
  const [highMetal = [], highGlass = []] = highWindows();
  kit.add(merge('rn-bank-ground', groundStone), areaMaterials.bankMarble, frame.clone(), 0);
  kit.add(merge('rn-bank-low-metal', () => lowMetal), areaMaterials.whiteSteel, frame.clone(), 0);
  kit.add(merge('rn-bank-low-glass', () => lowGlass), palette.glassDark, frame.clone(), 0);
  kit.add(DOOR_UNIT().leaf, palette.wood, frame.clone().multiply(at(0, DOOR.sill, -0.35)), 0);
  kit.add(merge('rn-bank-upper', upperStone), areaMaterials.bankMarble, frame.clone(), 1);
  kit.add(merge('rn-bank-high-metal', () => highMetal), areaMaterials.whiteSteel, frame.clone(), 1);
  kit.add(merge('rn-bank-high-glass', () => highGlass), palette.glassDark, frame.clone(), 1);
  kit.add(merge('rn-bank-crown', crownStone), areaMaterials.bankMarble, frame.clone(), 2);
}
