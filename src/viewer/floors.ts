/**
 * The floor picker's floors (docs/design/spec.md, Page: Floor picker). Pure data and math, no DOM.
 * Each floor has its level (src/model/frame.ts), the section-cut height that shows it and the plan area the camera frames. A floor's cut sits just
 * under the lowest slab over it, so its walls show cut like a plan and nothing covers it; the top floor's cut clears its own tallest piece. The
 * heights were picked from the model itself on 2026-10-15, from a survey of the slabs' undersides and captures of each candidate cut; the comment on
 * each floor says why. src/viewer/floors.test.ts checks that no floor's cut slices a slab.
 * Known limits: the map's floor-3 plates (the north end pavilion's at 15.9 m, the 1924 American Wing's at 13.9 m) have no entry, because no single
 * cut shows them without slicing roofs elsewhere; the mezzanines (map floor 1M, 8.4 to 10.0 m) have none either, and the main floor's cut passes
 * under them. Where a wing's floor lies higher than the frame's level (the Fifth Avenue links' second floor at 13.6 m, the American Wing's at
 * 14.1 m), that wing shows the floor below it at the floor's cut.
 * World frame: +X north, +Z east (toward Fifth Avenue), +Y up.
 */
import { Box3, MathUtils, Vector3 } from 'three';

import {
  BUILDING_MAX_X,
  BUILDING_MAX_Z,
  BUILDING_MIN_X,
  BUILDING_MIN_Z,
  GROUND_FLOOR_Y,
  MAIN_FLOOR_Y,
  ROOF_GARDEN_MAX_X,
  ROOF_GARDEN_MAX_Z,
  ROOF_GARDEN_MIN_X,
  ROOF_GARDEN_MIN_Z,
  ROOF_GARDEN_Y,
  SECOND_FLOOR_Y,
} from '../model/frame.js';
import { DEFAULT_FOV, fitBox } from './presets.js';
import type { CameraPose } from './presets.js';

/** A plan rectangle in world metres. */
export interface PlanArea {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface Floor {
  /** Stable and kebab-case: the `floor=` query and the picker's `floor-<id>` test ids name it. */
  readonly id: string;
  /** The picker's short label. */
  readonly label: string;
  /** The accessible name. */
  readonly name: string;
  /** The floor's level in metres (src/model/frame.ts). */
  readonly level: number;
  /** The section-cut height that shows the floor, in metres. */
  readonly cut: number;
  /** What the camera frames when the floor is chosen. */
  readonly area: PlanArea;
}

/** The picker's choice that shows every floor: no floor view. */
export const ALL_FLOORS = 'all';

const BUILDING: PlanArea = { minX: BUILDING_MIN_X, maxX: BUILDING_MAX_X, minZ: BUILDING_MIN_Z, maxZ: BUILDING_MAX_Z };
const ROOF_GARDEN: PlanArea = { minX: ROOF_GARDEN_MIN_X, maxX: ROOF_GARDEN_MAX_X, minZ: ROOF_GARDEN_MIN_Z, maxZ: ROOF_GARDEN_MAX_Z };

/** The floors from the lowest up. */
export const FLOORS: readonly Floor[] = [
  // 3.1 m: under the Temple of Dendur pool's slab (underside 3.41 m, 3.11 m until work unit 2 raised the pool's bottom), the lowest slab over the
  // ground floor; the main floor's own slabs start at 3.51 m. At 3.4 m the cut sliced that slab (then at 3.11 m) and capped the pool's footprint in
  // the cut colour. The plaza fountains' jets (3.08 m) stay whole.
  { id: 'ground', label: 'Ground', name: 'Ground floor', level: GROUND_FLOOR_Y, cut: 3.1, area: BUILDING },
  // 7.8 m: just under the Wallace Wing's mezzanine (map floor 1M, underside 7.91 m), the lowest slab over the main floor. A cut under the second floor
  // (10.4 m) left four mezzanines (8.4 to 10.0 m) over about 6,200 m² of the main floor. The Grand Staircase shows its lower flight, cut.
  { id: 'main', label: 'Main', name: 'Main floor', level: MAIN_FLOOR_Y, cut: 7.8, area: BUILDING },
  // 12.7 m: over the Roche wings' second floor (12.34 m), under the Lehman Wing's parapet coping (12.80 m) and the Fifth Avenue links' second-floor
  // slab (underside 13.15 m). Every cut from 13.15 to 15.0 m slices a slab or a roof (the links' second floor, the 1924 American Wing's third, the
  // American Wing's second, the Great Hall's end vaults from 14.0 m, the Morgan wing's roofs), and one at 15.2 m leaves the Morgan wing's roof over
  // its second floor. At 12.7 m no slab is sliced and nothing covers a second floor.
  { id: 'second', label: 'Second', name: 'Second floor', level: SECOND_FLOOR_Y, cut: 12.7, area: BUILDING },
  // 27.4 m: over the garden's tallest pieces (its potted trees, 26.9 m) and the park's tallest crown (27.3 m), so the floor view hides no landscape.
  // Nothing stands over the garden; the cut slices only the tops of the Hunt and Vaux roofs, the Hunt attic and the Lehman pyramid's tip.
  { id: 'roof-garden', label: 'Roof', name: 'Roof garden', level: ROOF_GARDEN_Y, cut: 27.4, area: ROOF_GARDEN },
];

export function floorById(id: string): Floor | undefined {
  return FLOORS.find((floor) => floor.id === id);
}

/** Every choice of the picker from the lowest up: the floors, then All, which shows everything and so stands above the top floor. */
export const FLOOR_CHOICES: readonly string[] = [...FLOORS.map((floor) => floor.id), ALL_FLOORS];

/** The choice one step up (`direction` 1, Page Up) or down (-1, Page Down) from `id`, staying put at either end; an unknown `id` counts as All. */
export function floorStep(id: string, direction: 1 | -1): string {
  const index = FLOOR_CHOICES.indexOf(id);
  const from = index === -1 ? FLOOR_CHOICES.length - 1 : index;
  return FLOOR_CHOICES[MathUtils.clamp(from + direction, 0, FLOOR_CHOICES.length - 1)] ?? ALL_FLOORS;
}

/**
 * The floor the page starts on for the query's `floor=` value (null when absent): All shows every floor, and an id that names no floor, or any floor
 * with `walk=1` (walk mode leaves the floor view), is ignored with a warning that says what would be accepted.
 */
export function startFloor(id: string | null, walking: boolean): { readonly floor: Floor | null; readonly warning: string | null } {
  if (id === null || id === ALL_FLOORS) return { floor: null, warning: null };
  const floor = floorById(id);
  if (floor === undefined) return { floor: null, warning: `Query parameter floor="${id}" names no floor; use one of ${FLOOR_CHOICES.join(', ')}. It is ignored.` };
  if (walking) return { floor: null, warning: `Query parameter floor="${id}" takes effect only in the orbit view, and walk=1 starts in walk mode. It is ignored.` };
  return { floor, warning: null };
}

/** The camera's elevation over the horizon in a floor view, in degrees: from above at a slight angle. */
export const FLOOR_ELEVATION_DEG = 65;
/** The framing of a floor stands this many times as far as the tightest fit of its storey. */
const FLOOR_MARGIN = 1.02;

/**
 * Where the camera frames `floor`, seen at `aspect`: the storey (its area, from its level up to its cut) from above at FLOOR_ELEVATION_DEG, from the
 * side the camera `from` looks from (the orbit's horizontal direction is kept), as close as it can with the whole storey in view.
 */
export function floorPose(floor: Floor, from: { readonly position: Vector3; readonly target: Vector3 }, aspect: number): CameraPose {
  const offset = from.position.clone().sub(from.target);
  const azimuth = Math.hypot(offset.x, offset.z) > 1e-6 ? Math.atan2(offset.z, offset.x) : Math.PI / 4;
  const elevation = MathUtils.degToRad(FLOOR_ELEVATION_DEG);
  const direction = new Vector3(Math.cos(elevation) * Math.cos(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.sin(azimuth));
  const { area } = floor;
  const storey = new Box3(new Vector3(area.minX, floor.level, area.minZ), new Vector3(area.maxX, floor.cut, area.maxZ));
  return fitBox(storey, direction, DEFAULT_FOV, aspect, FLOOR_MARGIN);
}
