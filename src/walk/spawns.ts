/**
 * Walk spawns (docs/design/spec.md, Walk mode): where walk mode can put the walker, by id, for the view menu and `?walk=1&spawn=<id>`, and a place of
 * the query's own, `?walk=1&spawn=x,y,z,tx,ty,tz`, for tests and captures (`placeOf`).
 * Each is the feet's position, the level direction the walker faces and a pitch; walk mode drops the feet onto the first surface below 1 m above them.
 * Levels and the plaza come from src/model/frame.ts; the Great Hall's and the Grand Staircase's plan positions are the hunt area's reading of the
 * floor map (src/model/hunt/dims.ts, from docs/research/interior.md), which frame.ts does not hold.
 */
import type { Vec3 } from '../build/types.js';
import { CURB_WEST_Z, ENTRANCE_AXIS_X, GRADE_Y, MAIN_FLOOR_Y, SECOND_FLOOR_Y, STEPS_BOTTOM_Z } from '../model/frame.js';
import { CROSS_HALL_FRONT_Z, HALL_X, NAVE_MID_Z, STAIR_TOP_Z } from '../model/hunt/dims.js';
import { BODY } from './walker.js';

export interface Spawn {
  readonly id: string;
  /** Completes "Walk from …" in the view menu. */
  readonly label: string;
  readonly feet: Vec3;
  /** The level direction faced, (x, z), not necessarily unit. */
  readonly facing: readonly [number, number];
  /** Degrees above the horizon the walker looks. */
  readonly pitch: number;
}

export const SPAWNS: readonly Spawn[] = [
  // On the entrance axis, halfway between the foot of the front steps and the curb, facing the Hunt facade (−Z), looking up a little at it.
  { id: 'plaza', label: 'the plaza', feet: [ENTRANCE_AXIS_X, GRADE_Y, (STEPS_BOTTOM_Z + CURB_WEST_Z) / 2], facing: [0, -1], pitch: 8 },
  // On the Great Hall floor on the nave's middle line, 8 m in from its north end wall, facing south down the nave past Roche's desk on the axis.
  { id: 'great-hall', label: 'the Great Hall', feet: [HALL_X - 8, MAIN_FLOOR_Y, NAVE_MID_Z], facing: [-1, 0], pitch: 4 },
  // On the landing at the top of the Grand Staircase, facing down the flights toward the Great Hall (+Z).
  { id: 'second-floor', label: 'the top of the Grand Staircase', feet: [ENTRANCE_AXIS_X, SECOND_FLOOR_Y, (STAIR_TOP_Z + CROSS_HALL_FRONT_Z) / 2], facing: [0, 1], pitch: -6 },
];

export const DEFAULT_SPAWN = 'plaza';

export function spawnById(id: string): Spawn | undefined {
  return SPAWNS.find((spawn) => spawn.id === id);
}

/** The id the walk facts give a place of the query's own (`placeOf`). */
export const PLACE_ID = 'place';

/**
 * The place `spawn=x,y,z,tx,ty,tz` names (docs/design/spec.md, Query contract): the feet at (x, y, z), which walk mode drops onto the first surface below
 * 1 m above them as it drops a spawn's, facing and looking at (tx, ty, tz) from an eye BODY.eye over the given feet. Null unless the text is six finite
 * numbers and the target lies off the vertical through the feet, so that the walker has a level direction to face.
 */
export function placeOf(text: string): Spawn | null {
  const values = text.split(',').map((v) => (v.trim() === '' ? Number.NaN : Number(v)));
  const [x, y, z, tx, ty, tz] = values;
  if (values.length !== 6 || x === undefined || y === undefined || z === undefined || tx === undefined || ty === undefined || tz === undefined || !values.every(Number.isFinite)) return null;
  const level = Math.hypot(tx - x, tz - z);
  if (!(level > 1e-6)) return null;
  const pitch = (Math.atan2(ty - (y + BODY.eye), level) * 180) / Math.PI;
  return { id: PLACE_ID, label: 'a place', feet: [x, y, z], facing: [tx - x, tz - z], pitch };
}

/**
 * Where `spawn=` starts the walk (docs/design/spec.md, Query contract): a walk spawn by its id, else a place (`placeOf`); none for no text; for text that
 * names neither, none and the warning that names it and what would be accepted.
 */
export function startOf(text: string | null): { readonly spawn: Spawn | null; readonly warning: string | null } {
  if (text === null) return { spawn: null, warning: null };
  const spawn = spawnById(text) ?? placeOf(text);
  if (spawn !== null) return { spawn, warning: null };
  const ids = SPAWNS.map((s) => s.id).join(', ');
  return { spawn: null, warning: `Query parameter spawn="${text}" names no walk spawn and no place; use one of ${ids}, or x,y,z,tx,ty,tz in metres: the feet, then a point looked at off the vertical through them. The walk starts at ${DEFAULT_SPAWN}.` };
}

/** The spawn whose feet lie nearest (x, y, z): where walk mode puts a walker that has nowhere to stand after a build. */
export function nearestSpawn(x: number, y: number, z: number): Spawn {
  const away = (s: Spawn): number => Math.hypot(s.feet[0] - x, s.feet[1] - y, s.feet[2] - z);
  return SPAWNS.reduce((best, s) => (away(s) < away(best) ? s : best));
}

/** The walker's yaw that faces the spawn's direction (yaw 0 faces −Z; src/walk/walker.ts). */
export function spawnYaw(spawn: Spawn): number {
  return Math.atan2(-spawn.facing[0], -spawn.facing[1]);
}
