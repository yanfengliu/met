/**
 * The Grand Staircase (1902): two broad flights and a landing rising west from the Great Hall between rusticated walls; at the second floor, coupled fluted
 * Corinthian columns on the walls' tops carry a full entablature with a deep modillioned cornice, in front of an arcade of five arches on each side that
 * opens onto the galleries beside the stair; a white barrel vault with transverse ribs; the arched opening into the cross hall at the top.
 * Plan: the floor map in the canonical frame (interior.md, The Grand Staircase; Z − 3.1): flight X ±3.69, foot at Z −36.57, landing −46.87..−49.88,
 * top −56.89, cross hall −59.74..−66.79. Risers and goings are not published: 27 and 19 risers of 0.149 m divide the measured rise and run (an estimate).
 * Evidence: P3 (颐园居 2024) for the coupled columns, the entablature and its modillions, the ribbed vault and the arched opening at the top; LPC77 for
 * the five arches a side and Bitter's angels in their spandrels (blocked out here as plain spandrels).
 */
import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { archivolt, barrelVault, columnParts, entablature, stairFlight, stairLanding, wall, type V3 } from '../lib/index.js';
import {
  CROSS_HALL_BACK_Z,
  CROSS_HALL_FRONT_Z,
  CROSS_HALL_HALF,
  HALL_WEST_WALL_Z,
  MAIN,
  SECOND,
  SLAB,
  STAIR_FOOT_Z,
  STAIR_HALF,
  STAIR_MID_BACK_Z,
  STAIR_MID_FRONT_Z,
  STAIR_TOP_Z,
} from './dims.js';
import { hunt } from './materials.js';
import { at, box } from './shapes.js';
import { STAIR_VAULT_SPRING_Y } from './walls.js';

/** The landing's level: 27 of the 46 risers. */
const LANDING_Y = MAIN + ((SECOND - MAIN) * 27) / 46;
const WALL_T = 0.8;
/** Second-floor order (P3): columns on the walls' tops (a podium to Y 11.9), 7.5 m tall, coupled 1.05 m apart, carrying a 2.98 m entablature to the vault. */
const PODIUM_Y = SECOND + 0.95;
const COLUMN_D = 0.72;
const COLUMN_TOP_Y = PODIUM_Y + 7.5;
const PAIR = 1.05;
const COLUMN_X = STAIR_HALF + WALL_T / 2;
/** The arcade wall stands behind the columns; its five arches open onto the galleries beside the stair (LPC77). */
const ARCADE_X = COLUMN_X + COLUMN_D / 2 + 0.1;
const ARCADE_T = 0.6;
/** The arcade starts just west of the hall's west wall (the map's treads begin at Z −32.75, inside that wall) and ends at the top of the stair. */
const ARCADE_Z0 = HALL_WEST_WALL_Z - 0.7;
const ARCADE_LENGTH = ARCADE_Z0 - STAIR_TOP_Z;
const BAY = ARCADE_LENGTH / 5;
const PIER_Z: readonly number[] = Array.from({ length: 6 }, (_, k) => ARCADE_Z0 - k * BAY);
const HALL_LENGTH = HALL_WEST_WALL_Z - CROSS_HALL_FRONT_Z;
const HALL_MID_Z = (HALL_WEST_WALL_Z + CROSS_HALL_FRONT_Z) / 2;
/** The stair hall's side walls rise past the vault to the pitched roof. */
export const STAIR_WALL_TOP_Y = STAIR_VAULT_SPRING_Y + STAIR_HALF + 0.3;

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

/** Both side walls of one kind at |X| = x: front face on the stair, body outward; `south` defaults to the north wall's geometry. */
function sides(kit: Kit, north: Parameters<Kit['add']>[0], x: number, y: number, order: number, south = north): void {
  kit.add(north, hunt.stairStone, at(x, y, HALL_MID_Z, -Math.PI / 2), order);
  kit.add(south, hunt.stairStone, at(-x, y, HALL_MID_Z, Math.PI / 2), order);
}

const lowerWall = lazy(() => wall({ width: HALL_LENGTH, height: PODIUM_Y - MAIN, thickness: WALL_T, rustication: { course: 0.55, joint: 0.06, depth: 0.04, stop: PODIUM_Y - MAIN - 1.2 } }));
/** One side's arcade wall: its local x runs toward +Z on the north wall and −Z on the south, so each side has its own geometry. */
function arcade(sign: number): ReturnType<typeof wall> {
  const span = BAY - 2 * PAIR;
  return wall({
    width: HALL_LENGTH,
    height: COLUMN_TOP_Y - PODIUM_Y,
    thickness: ARCADE_T,
    openings: Array.from({ length: 5 }, (_, k) => {
      const z = ARCADE_Z0 - (k + 0.5) * BAY;
      return { shape: 'arch' as const, x: sign > 0 ? z - HALL_MID_Z : HALL_MID_Z - z, y: 0, width: span, height: 4.9 + span / 2 };
    }),
  });
}
const upperWall = lazy(() => wall({ width: HALL_LENGTH, height: STAIR_WALL_TOP_Y - COLUMN_TOP_Y, thickness: WALL_T }));

export const stairSteps: readonly StepDef[] = [
  {
    id: 'grand-stair-flights',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Build the Grand Staircase flights',
    detail: 'Two broad flights and a landing climb west from the Great Hall to the second floor between rusticated walls, over a solid stone fill.',
    motion: { kind: 'rise' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-grand-stair-west' },
    build(kit) {
      const w = 2 * STAIR_HALF;
      const lower = stairFlight({ width: w, steps: 27, riser: (LANDING_Y - MAIN) / 27, tread: (STAIR_FOOT_Z - STAIR_MID_FRONT_Z) / 27, nosing: 0.02 });
      kit.add(lower.steps, palette.limestone, at(0, MAIN, STAIR_FOOT_Z), 0);
      kit.add(stairLanding({ width: w, depth: STAIR_MID_FRONT_Z - STAIR_MID_BACK_Z, thickness: LANDING_Y - MAIN }), palette.limestone, at(0, LANDING_Y, STAIR_MID_FRONT_Z), 1);
      const upper = stairFlight({ width: w, steps: 19, riser: (SECOND - LANDING_Y) / 19, tread: (STAIR_MID_BACK_Z - STAIR_TOP_Z) / 19, nosing: 0.02 });
      box(kit, hunt.stairStone, [-STAIR_HALF, MAIN, STAIR_TOP_Z], [STAIR_HALF, LANDING_Y, STAIR_MID_BACK_Z], 2);
      kit.add(upper.steps, palette.limestone, at(0, LANDING_Y, STAIR_MID_BACK_Z), 2);
      box(kit, hunt.stairStone, [-STAIR_HALF, MAIN, CROSS_HALL_FRONT_Z], [STAIR_HALF, SECOND - SLAB, STAIR_TOP_Z], 3);
      kit.add(stairLanding({ width: w, depth: STAIR_TOP_Z - CROSS_HALL_FRONT_Z, thickness: SLAB }), palette.limestone, at(0, SECOND, STAIR_TOP_Z), 3);
      sides(kit, lowerWall(), STAIR_HALF, MAIN, 4);
    },
  },
  {
    id: 'grand-stair-arcades',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Raise the staircase colonnades and arcades',
    detail: 'At the second floor coupled fluted Corinthian columns rise on the walls of the stair, before an arcade of five arches each side that opens onto the galleries.',
    motion: { kind: 'rise' },
    stagger: '-z',
    focus: { kind: 'preset', id: 'int-grand-stair-west' },
    build(kit) {
      const column = columnParts({ diameter: COLUMN_D, height: COLUMN_TOP_Y - PODIUM_Y, detail: 'low' });
      for (const s of [-1, 1]) {
        for (const z of PIER_Z) {
          for (const dz of [-PAIR / 2, PAIR / 2]) {
            const m = at(s * COLUMN_X, PODIUM_Y, z + dz);
            if (column.base !== undefined) kit.add(column.base, hunt.stairStone, m);
            kit.add(column.shaft, hunt.stairStone, m);
            kit.add(column.capital, hunt.stairStone, m);
          }
        }
      }
      sides(kit, arcade(1), ARCADE_X, PODIUM_Y, 0, arcade(-1));
    },
  },
  {
    id: 'grand-stair-vault',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Vault the staircase and its top hall',
    detail: 'A full entablature with a deep modillioned cornice runs along both colonnades and a white barrel vault with transverse ribs closes the stair hall; an arched opening leads into the cross hall.',
    motion: { kind: 'drop', distance: 5 },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-grand-stair-west' },
    build(kit) {
      const y = STAIR_VAULT_SPRING_Y;
      const face = COLUMN_X - 0.32;
      const north: V3[] = [
        [face, COLUMN_TOP_Y, CROSS_HALL_FRONT_Z],
        [face, COLUMN_TOP_Y, HALL_WEST_WALL_Z],
      ];
      const south: V3[] = [
        [-face, COLUMN_TOP_Y, HALL_WEST_WALL_Z],
        [-face, COLUMN_TOP_Y, CROSS_HALL_FRONT_Z],
      ];
      for (const path of [north, south]) {
        const run = entablature({ path, height: y - COLUMN_TOP_Y, modillions: true, dentils: true });
        kit.add(run.moulding, palette.plaster, at(0, 0, 0), 0);
        if (run.modillion !== undefined) for (const m of run.modillions) kit.add(run.modillion, palette.plaster, m, 0);
        if (run.dentil !== undefined) for (const m of run.dentils) kit.add(run.dentil, palette.plaster, m, 0);
      }
      sides(kit, upperWall(), ARCADE_X, COLUMN_TOP_Y, 1);
      kit.add(barrelVault({ span: 2 * STAIR_HALF, length: HALL_LENGTH, thickness: 0.35 }), palette.plaster, at(0, y, HALL_MID_Z), 2);
      const rib = archivolt({ span: 2 * STAIR_HALF - 0.7, band: 0.35, projection: 0.4 });
      for (const z of PIER_Z) kit.add(rib, palette.plaster, at(0, y, z - 0.2), 2);
      // The top: the stair hall's end wall with its arched opening, and the cross hall's ceiling and back wall.
      const end = wall({ width: 2 * ARCADE_X + 2 * ARCADE_T, height: STAIR_WALL_TOP_Y - SECOND, thickness: WALL_T, openings: [{ shape: 'arch', x: 0, y: 0, width: 5.4, height: 6.6 }] });
      kit.add(end, hunt.stairStone, at(0, SECOND, CROSS_HALL_FRONT_Z), 3);
      const ceiling = SECOND + 6.6;
      box(kit, palette.plaster, [-CROSS_HALL_HALF, ceiling, CROSS_HALL_BACK_Z], [CROSS_HALL_HALF, ceiling + 0.4, CROSS_HALL_FRONT_Z - WALL_T], 4);
      box(kit, hunt.stairStone, [-CROSS_HALL_HALF, SECOND, CROSS_HALL_BACK_Z - WALL_T], [CROSS_HALL_HALF, ceiling + 0.4, CROSS_HALL_BACK_Z], 4);
    },
  },
];

/** The stair hall's outer face (the arcade walls' backs), for the roof and the galleries. */
export const STAIR_HALL_OUTER_X = ARCADE_X + ARCADE_T;
