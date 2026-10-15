/**
 * Walk spawns (docs/design/spec.md, Walk mode): where walk mode can put the walker, by id, for the view menu and `?walk=1&spawn=<id>`.
 * Each is the feet's position and the level direction the walker faces; walk mode drops the feet onto the first surface below 1 m above them.
 * Levels and the plaza come from src/model/frame.ts; the Great Hall's and the Grand Staircase's plan positions are the hunt area's reading of the
 * floor map (src/model/hunt/dims.ts, from docs/research/interior.md), which frame.ts does not hold.
 */
import type { Vec3 } from '../build/types.js';
import { CURB_WEST_Z, ENTRANCE_AXIS_X, GRADE_Y, MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEPS_BOTTOM_Z } from '../model/frame.js';
import { CROSS_HALL_FRONT_Z, NAVE_EAST_Z, STAIR_TOP_Z } from '../model/hunt/dims.js';

export interface Spawn {
  readonly id: string;
  /** Completes "Walk from …" in the view menu. */
  readonly label: string;
  readonly feet: Vec3;
  /** The level direction faced, not necessarily unit. */
  readonly facing: readonly [number, number];
}

export const SPAWNS: readonly Spawn[] = [
  // On the entrance axis, halfway between the foot of the front steps and the curb, facing the Hunt facade (−Z).
  { id: 'plaza', label: 'the plaza', feet: [ENTRANCE_AXIS_X, GRADE_Y, (STEPS_BOTTOM_Z + CURB_WEST_Z) / 2], facing: [0, -1] },
  // On the Great Hall floor, 2.5 m inside the east long wall on the axis, facing the desk and the Grand Staircase (−Z).
  { id: 'great-hall', label: 'the Great Hall', feet: [ENTRANCE_AXIS_X, MAIN_FLOOR_Y, NAVE_EAST_Z - 2.5], facing: [0, -1] },
  // On the landing at the top of the Grand Staircase, facing down the flights toward the Great Hall (+Z).
  { id: 'second-floor', label: 'the top of the Grand Staircase', feet: [ENTRANCE_AXIS_X, SECOND_FLOOR_Y, (STAIR_TOP_Z + CROSS_HALL_FRONT_Z) / 2], facing: [0, 1] },
];

export const DEFAULT_SPAWN = 'plaza';

export function spawnById(id: string): Spawn | undefined {
  return SPAWNS.find((spawn) => spawn.id === id);
}

/** The walker's yaw that faces the spawn's direction (yaw 0 faces −Z; src/walk/walker.ts). */
export function spawnYaw(spawn: Spawn): number {
  return Math.atan2(-spawn.facing[0], -spawn.facing[1]);
}
