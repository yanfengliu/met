/**
 * Hunt wing, the first two steps: excavation and footings (1897), then the podium, basement walls and the main-floor plate (1898).
 * Plan lines: the block outline (exterior.md, hunt-d) and the floor map's room lines in the canonical frame (map Z − 3.1 m).
 */
import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { stairFlight } from '../lib/index.js';
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

/** Every wall line of the block that carries a footing: [x0, z0, x1, z1] centre lines, thickness. */
const WALL_LINES: readonly (readonly [number, number, number, number, number])[] = [
  // Pavilion front wall and the extensions' fronts.
  [-PAVILION_HALF, (WALL_Z + WALL_BACK_Z) / 2, PAVILION_HALF, (WALL_Z + WALL_BACK_Z) / 2, WALL_Z - WALL_BACK_Z],
  [EXT_SOUTH_X, EXT_FACE_Z - EXT_WALL_T / 2, -PAVILION_HALF, EXT_FACE_Z - EXT_WALL_T / 2, EXT_WALL_T],
  [PAVILION_HALF, EXT_FACE_Z - EXT_WALL_T / 2, EXT_NORTH_X, EXT_FACE_Z - EXT_WALL_T / 2, EXT_WALL_T],
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
    detail: 'Basement walls rise to the main floor; in front, a granite podium carries the landing level the column pedestals stand on, and three steps climb inside the central doorway.',
    motion: { kind: 'rise' },
    stagger: 'order',
    build(kit) {
      let order = 0;
      // Basement walls from the ground floor to the main floor on every footing line.
      for (const line of WALL_LINES) {
        const [x0, z0, x1, z1, t] = line;
        if (Math.abs(z1 - z0) < 1e-6) box(kit, palette.limestoneDark, [Math.min(x0, x1), GROUND, z0 - t / 2], [Math.max(x0, x1), MAIN - SLAB, z0 + t / 2], order);
        else box(kit, palette.limestoneDark, [x0 - t / 2, GROUND, Math.min(z0, z1)], [x0 + t / 2, MAIN - SLAB, Math.max(z0, z1)], order);
      }
      order += 1;
      // The podium in front of the pavilion: grade to the landing, from the facade wall to the landing's edge at Z +3.5.
      box(kit, palette.granite, [-PAVILION_HALF, -0.6, WALL_Z], [PAVILION_HALF, LANDING, FRONT_LIMIT_Z], order);
      order += 1;
      // Main-floor plate over the whole block behind the front walls; the stair and the hall's floor finish stand on it.
      box(kit, palette.limestoneDark, [EXT_SOUTH_X, MAIN - SLAB, BACK_Z], [EXT_NORTH_X, MAIN - 0.03, WALL_BACK_Z], order);
      order += 1;
      // Three steps inside each arch's reveal, from the landing up to the main floor at the screen.
      const rise = (MAIN - LANDING) / 3;
      const steps = stairFlight({ width: ARCH_INNER_SPAN - 0.1, steps: 3, riser: rise, tread: -SCREEN_Z / 3, nosing: 0.02 });
      for (const x of BAY_X) kit.add(steps.steps, palette.granite, at(x, LANDING, WALL_Z), order);
    },
  },
];
