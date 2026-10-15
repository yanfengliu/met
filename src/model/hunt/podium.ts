/**
 * Hunt wing, the first two steps: excavation and footings (1897), then the podium, basement walls and the main-floor plate (1898).
 * Plan lines: the block outline (exterior.md, hunt-d) and the floor map's room lines in the canonical frame (map Z − 3.1 m).
 */
import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { moulding, stairFlight, wall } from '../lib/index.js';
import {
  BACK_Z,
  EXT_FACE_Z,
  EXT_NORTH_X,
  EXT_SOUTH_X,
  EXT_WALL_T,
  FOOTING_Y,
  FRONT_LIMIT_Z,
  GROUND,
  HALL_END_WALL_X,
  HALL_WEST_WALL_Z,
  HALL_WEST_Z,
  LANDING,
  MAIN,
  PAVILION_HALF,
  PIER_W,
  PIER_X,
  NAVE_EAST_Z,
  NAVE_WEST_Z,
  SCREEN_Z,
  SLAB,
  STAIR_HALF,
  WALL_BACK_Z,
  WALL_Z,
  ARCH_INNER_SPAN,
  BAY_X,
} from './dims.js';
import { hunt } from './materials.js';
import { at, box } from './shapes.js';

/** Wall lines whose walls start on their footings in the walls step (the wings' fronts, a finished face from the excavation up): no basement wall here. */
const WING_FRONTS = 2;
/** Every wall line of the block that carries a footing: [x0, z0, x1, z1] centre lines, thickness. The wings' fronts come first. */
const WALL_LINES: readonly (readonly [number, number, number, number, number])[] = [
  [EXT_SOUTH_X, EXT_FACE_Z - EXT_WALL_T / 2, -PAVILION_HALF, EXT_FACE_Z - EXT_WALL_T / 2, EXT_WALL_T],
  [PAVILION_HALF, EXT_FACE_Z - EXT_WALL_T / 2, EXT_NORTH_X, EXT_FACE_Z - EXT_WALL_T / 2, EXT_WALL_T],
  // Pavilion front wall.
  [-PAVILION_HALF, (WALL_Z + WALL_BACK_Z) / 2, PAVILION_HALF, (WALL_Z + WALL_BACK_Z) / 2, WALL_Z - WALL_BACK_Z],
  // Side walls on the McKim, Mead & White seams.
  [EXT_SOUTH_X + 0.6, EXT_FACE_Z, EXT_SOUTH_X + 0.6, BACK_Z, 1.2],
  [EXT_NORTH_X - 0.6, EXT_FACE_Z, EXT_NORTH_X - 0.6, BACK_Z, 1.2],
  // Great Hall: end walls, long-wall lines, west wall.
  [-HALL_END_WALL_X + 0.6, WALL_BACK_Z, -HALL_END_WALL_X + 0.6, HALL_WEST_WALL_Z, 1.2],
  [HALL_END_WALL_X - 0.6, WALL_BACK_Z, HALL_END_WALL_X - 0.6, HALL_WEST_WALL_Z, 1.2],
  [-PAVILION_HALF, NAVE_EAST_Z, PAVILION_HALF, NAVE_EAST_Z, 1.8],
  [-PAVILION_HALF, NAVE_WEST_Z, PAVILION_HALF, NAVE_WEST_Z, 1.8],
  [-HALL_END_WALL_X, (HALL_WEST_Z + HALL_WEST_WALL_Z) / 2, HALL_END_WALL_X, (HALL_WEST_Z + HALL_WEST_WALL_Z) / 2, HALL_WEST_Z - HALL_WEST_WALL_Z],
  // Grand Staircase hall and the galleries beside it.
  [-STAIR_HALF - 0.4, HALL_WEST_WALL_Z, -STAIR_HALF - 0.4, BACK_Z, 0.8],
  [STAIR_HALF + 0.4, HALL_WEST_WALL_Z, STAIR_HALF + 0.4, BACK_Z, 0.8],
  [-9.75, HALL_WEST_WALL_Z, -9.75, BACK_Z, 0.8],
  [9.75, HALL_WEST_WALL_Z, 9.75, BACK_Z, 0.8],
];

/** Footings' tops, where the basement walls, the podium and the wings' fronts start: below the site's pad at GROUND_FLOOR_Y − 0.1. */
export const FOUNDATION_TOP = GROUND - SLAB;

const PODIUM_H = LANDING - FOUNDATION_TOP;
/**
 * The podium's face where the 1970 landing (X ±12.47) leaves it bare, under the outer bays: buff limestone ashlar like the pedestals over it, in courses about
 * 0.68 m high with deep joints counted down from the coping (Hałun 2023, ref-fountain-north: five courses between the coping and the plaza, joints
 * 0.10 to 0.15 m tall in shadow; Haklai 2012, ref-front-street: the same light stone at the south end, far lighter than the granite steps).
 */
const PODIUM_COURSE = 0.68;
const PODIUM_TOP_JOINT = LANDING - 0.3 - PODIUM_COURSE;
const podiumFace = (() => {
  let made: ReturnType<typeof wall> | undefined;
  return (): ReturnType<typeof wall> =>
    (made ??= wall({
      width: 2 * PAVILION_HALF,
      height: PODIUM_H,
      thickness: FRONT_LIMIT_Z - WALL_Z,
      rustication: { course: PODIUM_COURSE, joint: 0.12, depth: 0.08, start: PODIUM_TOP_JOINT - 3 * PODIUM_COURSE - FOUNDATION_TOP, stop: PODIUM_TOP_JOINT - FOUNDATION_TOP + 1e-6 },
    }));
})();
/** The coping along the podium's front edge at the landing (S7: a moulded course under the pedestals). */
const podiumCoping = (() => {
  let made: ReturnType<typeof moulding> | undefined;
  return (): ReturnType<typeof moulding> =>
    (made ??= moulding({
      profile: 'string-course',
      path: [
        [-PAVILION_HALF, LANDING - 0.3, WALL_Z],
        [-PAVILION_HALF, LANDING - 0.3, FRONT_LIMIT_Z],
        [PAVILION_HALF, LANDING - 0.3, FRONT_LIMIT_Z],
        [PAVILION_HALF, LANDING - 0.3, WALL_Z],
      ],
      height: 0.3,
      projection: 0.1,
    }));
})();

/** A footing strip under one wall line: twice the wall's thickness wide. */
function footing(line: readonly [number, number, number, number, number], top: number, bottom: number): [readonly [number, number, number], readonly [number, number, number]] {
  const [x0, z0, x1, z1, t] = line;
  const w = t + 0.8;
  // Kept inside the block: the seams' footings widen inward only.
  const clampX = (x: number): number => Math.min(Math.max(x, EXT_SOUTH_X), EXT_NORTH_X);
  if (Math.abs(z1 - z0) < 1e-6) return [[clampX(Math.min(x0, x1)), bottom, z0 - w / 2], [clampX(Math.max(x0, x1)), top, Math.min(z0 + w / 2, FRONT_LIMIT_Z)]];
  return [[clampX(x0 - w / 2), bottom, Math.min(z0, z1)], [clampX(x0 + w / 2), top, Math.max(z0, z1)]];
}

export const podiumSteps: readonly StepDef[] = [
  {
    id: 'hunt-foundations',
    chapter: 'hunt-1902',
    year: '1897',
    title: 'Dig and pour the Fifth Avenue foundations',
    detail: "Excavation began in 1897: concrete footings under every wall line of Hunt's wing, pads under the Great Hall's piers and the column pedestals, and the ground-floor slab.",
    motion: { kind: 'rise', distance: 4 },
    stagger: 'z',
    weight: 1.2,
    build(kit) {
      WALL_LINES.forEach((line, i) => {
        const [min, max] = footing(line, GROUND - SLAB, FOOTING_Y);
        box(kit, hunt.concrete, min, max, i);
      });
      // Pads under the hall's piers (both long walls) and under the four pedestals.
      for (const x of PIER_X) {
        for (const z of [NAVE_EAST_Z, NAVE_WEST_Z]) box(kit, hunt.concrete, [x - PIER_W, FOOTING_Y - 0.6, z - 2.4], [x + PIER_W, GROUND - SLAB, z + 2.4]);
      }
      for (const x of [-26.4, -8.8, 8.8, 26.4]) box(kit, hunt.concrete, [x - 4.2, FOOTING_Y - 0.6, WALL_Z - 1], [x + 4.2, GROUND - SLAB, FRONT_LIMIT_Z]);
      // Ground-floor slab over the whole block behind the front walls.
      box(kit, hunt.concrete, [EXT_SOUTH_X, GROUND - SLAB, BACK_Z], [EXT_NORTH_X, GROUND, WALL_BACK_Z], WALL_LINES.length);
    },
  },
  {
    id: 'hunt-podium',
    chapter: 'hunt-1902',
    year: '1898',
    title: 'Raise the podium and the main-floor plate',
    detail: 'Basement walls rise to the main floor; in front, a coursed limestone podium carries the landing level the column pedestals stand on, and three steps climb inside the central doorway.',
    motion: { kind: 'rise' },
    stagger: 'order',
    build(kit) {
      let order = 0;
      // Basement walls on their footings up to the main floor, reaching below the site's excavation pad (GROUND_FLOOR_Y − 0.1).
      for (const line of WALL_LINES.slice(WING_FRONTS)) {
        const [x0, z0, x1, z1, t] = line;
        if (Math.abs(z1 - z0) < 1e-6) box(kit, palette.limestoneDark, [Math.min(x0, x1), FOUNDATION_TOP, z0 - t / 2], [Math.max(x0, x1), MAIN - SLAB, z0 + t / 2], order);
        else box(kit, palette.limestoneDark, [x0 - t / 2, FOUNDATION_TOP, Math.min(z0, z1)], [x0 + t / 2, MAIN - SLAB, Math.max(z0, z1)], order);
      }
      order += 1;
      // The podium in front of the pavilion, from the facade wall to the landing's edge at Z +3.5: a finished limestone face in courses from the
      // excavation to a coping at the landing, seen over the steps' descending ends and down to the plaza beyond them (site, 2026-10-11; photos above).
      kit.add(podiumFace(), palette.limestone, at(0, FOUNDATION_TOP, FRONT_LIMIT_Z), order);
      kit.add(podiumCoping(), palette.limestone, at(0, 0, 0), order);
      order += 1;
      // Main-floor plate over the whole block behind the front walls; the stair and the hall's floor finish stand on it.
      box(kit, palette.limestoneDark, [EXT_SOUTH_X, MAIN - SLAB, BACK_Z], [EXT_NORTH_X, MAIN - 0.03, WALL_BACK_Z], order);
      // Under each arch it runs on through the facade wall to the screen, where the steps inside the arch end, so the floor behind every screen is whole.
      for (const x of BAY_X) box(kit, palette.limestoneDark, [x - ARCH_INNER_SPAN / 2, MAIN - SLAB, WALL_BACK_Z], [x + ARCH_INNER_SPAN / 2, MAIN - 0.03, SCREEN_Z], order);
      order += 1;
      // Three steps inside each arch's reveal, from the landing up to the main floor at the screen.
      const rise = (MAIN - LANDING) / 3;
      const steps = stairFlight({ width: ARCH_INNER_SPAN - 0.1, steps: 3, riser: rise, tread: -SCREEN_Z / 3, nosing: 0.02 });
      for (const x of BAY_X) kit.add(steps.steps, palette.granite, at(x, LANDING, WALL_Z), order);
    },
  },
];
