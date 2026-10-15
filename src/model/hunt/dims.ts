/**
 * Derived dimensions of the Hunt wing (block hunt-d), shared by the builders in this folder. Data only: every number another area depends on lives in
 * src/model/frame.ts; the ones here are this area's own reading of the photographs and the floor map, each with its source.
 * World frame: metres, +X north, +Z east toward Fifth Avenue, +Y up; origin on the entrance axis at sidewalk grade in the plane of the pavilion's main wall face.
 * Plan positions from the floor map are taken in the canonical frame (map Z − 3.1 m, coordinator's frame correction of 2026-10-11).
 */
import {
  GROUND_FLOOR_Y,
  HUNT_ARCH_CROWN_Y,
  HUNT_ARCH_SPAN,
  HUNT_ARCH_SPRING_Y,
  HUNT_ATTIC_TOP_Y,
  HUNT_BAY,
  HUNT_CAPITAL_TOP_Y,
  HUNT_COLUMN_AXIS_Z,
  HUNT_COLUMN_BASE_Y,
  HUNT_CORNICE_TOP_Y,
  HUNT_EXTENSION_CORNICE_Y,
  HUNT_EXTENSION_FACE_Z,
  HUNT_PAIR_AXIS_SPACING,
  HUNT_PAIR_CENTRE_X_INNER,
  HUNT_PAIR_CENTRE_X_OUTER,
  HUNT_PAVILION_FRONT_Z,
  LANDING_Y,
  MAIN_FLOOR_Y,
  HUNT_EXTENSION_PARAPET_Y,
  MMW_CORNICE_Y,
  SECOND_FLOOR_Y,
} from '../frame.js';

// --- Block outline (exterior.md section 2, hunt-d) -------------------------------------------
/** The pavilion's corners on the block line. */
export const PAVILION_HALF = 30.4;
/** The flanking extensions' far ends: X −49.7 (south) and +49.4 (north), where the McKim, Mead & White links begin. */
export const EXT_SOUTH_X = -49.7;
export const EXT_NORTH_X = 49.4;
export const EXT_FACE_Z = HUNT_EXTENSION_FACE_Z;
/** The block's back line, where the 1880–1894 core begins (the core builds the wall on it). */
export const BACK_Z = -69.0;
/** The pavilion's front elements (piers, pedestals, columns, breaks) may project to here (coordinator, 2026-10-11). */
export const FRONT_LIMIT_Z = 3.5;

// --- Facade plan ------------------------------------------------------------------------------
/** Main wall face of the pavilion (frame.ts origin, exterior.md F4). */
export const WALL_Z = 0;
/** Front face of the rusticated end piers, just behind the outer columns' plinths; the block line (HUNT_PAVILION_FRONT_Z) is 0.3 m in front. */
export const END_PIER_FRONT_Z = HUNT_PAVILION_FRONT_Z - 0.3;
/** Width of each end pier, inward from the corner. */
export const END_PIER_WIDTH = 1.25;
/** Inner face of the facade wall: the floor map's plate edge in the arched bays (Z 0 in its frame, −3.1 canonical). */
export const WALL_BACK_Z = -3.1;
/** The arched bays' centres. */
export const BAY_X = [-HUNT_BAY, 0, HUNT_BAY] as const;
/** Column-pair centres, south to north. */
export const PAIR_X = [-HUNT_PAIR_CENTRE_X_OUTER, -HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_OUTER] as const;
/** The eight column axes, south to north. */
export const COLUMN_X: readonly number[] = PAIR_X.flatMap((x) => [x - HUNT_PAIR_AXIS_SPACING / 2, x + HUNT_PAIR_AXIS_SPACING / 2]);
export const COLUMN_Z = HUNT_COLUMN_AXIS_Z;

// --- The order ----------------------------------------------------------------------------------
export const PEDESTAL_TOP_Y = HUNT_COLUMN_BASE_Y;
/** Pedestal die, front and base course (S7 at 1:1: die 0.375 bay, base course 0.40 bay). */
export const PEDESTAL_DIE_W = 6.6;
export const PEDESTAL_BASE_W = 7.0;
export const PEDESTAL_DIE_FRONT_Z = 3.3;
export const PEDESTAL_BASE_FRONT_Z = 3.45;
export const COLUMN_TOP_Y = HUNT_CAPITAL_TOP_Y;
/** Pilasters behind the columns: face width and projection from the wall (S7 parallax: pilaster face about 2.0 m behind the column axes). */
export const PILASTER_W = 1.4;
export const PILASTER_P = 0.25;

// --- Entablature and attic (S7 at 1:1, depth-corrected) ---------------------------------------
export const ARCHITRAVE_TOP_Y = COLUMN_TOP_Y + 0.95;
export const FRIEZE_TOP_Y = ARCHITRAVE_TOP_Y + 0.95;
export const CORNICE_TOP_Y = HUNT_CORNICE_TOP_Y;
export const CORNICE_H = CORNICE_TOP_Y - FRIEZE_TOP_Y;
/** Cornice projection beyond the frieze: the main run's front reaches Z +1.0 (the OSM pavilion line is +1.2), the breaks' Z +3.76. */
export const CORNICE_P = 1.0;
/** The breaks' architrave face sits over the columns' upper face. */
export const BREAK_FACE_Z = COLUMN_Z + 0.66;
/** Half-width of a break over a pair: the outer columns' upper faces plus the architrave's overhang. */
export const BREAK_HALF = HUNT_PAIR_AXIS_SPACING / 2 + 0.66 + 0.35;
export const ATTIC_TOP_Y = HUNT_ATTIC_TOP_Y;
export const ATTIC_CORNICE_H = 0.75;
/** The attic wall's back face (the hall's roof meets it). */
export const ATTIC_BACK_Z = -1.2;

// --- Arches (S7 at 1:1, depth-corrected) --------------------------------------------------------
export const ARCH_SPRING_Y = HUNT_ARCH_SPRING_Y;
/** Inner order: the opening the screen fills. */
export const ARCH_INNER_SPAN = HUNT_ARCH_SPAN;
export const ARCH_CROWN_Y = HUNT_ARCH_CROWN_Y;
/** Outer order: the stepped jamb and ring round the inner opening, its face set back from the wall face. */
export const ARCH_OUTER_SPAN = 10.2;
export const ARCH_SKIN = 0.35;
/** The archivolt band round the outer order. */
export const ARCHIVOLT_BAND = 0.8;
/** Doorway and window screens stand in the inner opening at this depth (floor map: piers 1.15 m proud of the bays). */
export const SCREEN_Z = -1.2;
export const SCREEN_HEAD_Y = 8.9;
export const SCREEN_ENTABLATURE_TOP_Y = 10.6;
export const TRANSOM_BOTTOM_Y = 12.8;
export const TRANSOM_TOP_Y = 13.25;
export const IMPOST_W = 1.0;
export const IMPOST_H = 1.25;

// --- Levels -------------------------------------------------------------------------------------
export const LANDING = LANDING_Y;
export const MAIN = MAIN_FLOOR_Y;
export const SECOND = SECOND_FLOOR_Y;
export const GROUND = GROUND_FLOOR_Y;
export const FOOTING_Y = GROUND_FLOOR_Y - 1.6;
export const SLAB = 0.45;

// --- Flanking extensions --------------------------------------------------------------------------
export const EXT_CORNICE_Y = HUNT_EXTENSION_CORNICE_Y;
export const EXT_PARAPET_Y = HUNT_EXTENSION_PARAPET_Y;
export const EXT_WALL_T = 1.2;
/** Their rusticated base and the string course over it. */
export const EXT_BASE_TOP_Y = 4.7;
/**
 * The dentilled cornice the caryatids carry (S7, S9) starts on the McKim, Mead & White links' cornice top, so the links' cornice runs into the extensions just
 * under their dentil course (E43, E41: dentils from about 18.0; mmw/dims.ts); an architrave band under it rests on the caryatids.
 */
export const EXT_ORDER_BOTTOM_Y = MMW_CORNICE_Y;
export const EXT_ORDER_CORNICE_H = 0.9;
export const EXT_ORDER_TOP_Y = EXT_ORDER_BOTTOM_Y + EXT_ORDER_CORNICE_H;
export const EXT_ARCHITRAVE_H = 0.45;
/** The crowning cornice under the extensions' parapet: plain, no modillions under its corona (E43). */
export const EXT_CROWN_H = 0.9;

// --- Great Hall (interior.md, The Great Hall; map Z − 3.1) ------------------------------------------
export const HALL_X = 30.43;
export const HALL_END_WALL_X = 31.6;
/** Nave long-wall lines, east and west. */
export const NAVE_EAST_Z = -9.37;
export const NAVE_WEST_Z = -25.88;
export const NAVE_MID_Z = (NAVE_EAST_Z + NAVE_WEST_Z) / 2;
/** West zone back wall (stair bay to −33.23). */
export const HALL_WEST_Z = -32.06;
export const HALL_WEST_WALL_Z = -33.2;
/** Pier lines across the nave. */
export const PIER_X = [-26.05, -8.64, 8.64, 26.05] as const;
export const PIER_W = 2.6;
/** How far the piers stand proud of the long-wall lines into the nave. */
export const PIER_PROUD = 1.2;
/** End-bay screens: four Ionic columns on X = ±26.05. */
export const END_SCREEN_Z = [-21.43, -18.9, -16.36, -13.82] as const;
/** Central openings of the long walls: four Ionic columns each, plus two in the entrance recess. */
export const CENTRE_COLUMN_X = [-3.79, -1.26, 1.28, 3.82] as const;
/** The great arches spring from the piers' imposts here (P1 at 1:1: the transverse arch at X −8.64 springs at Y 14.0 and crowns at 22.3). */
export const HALL_ARCH_SPRING_Y = 14.0;
export const BALCONY_RAIL_H = 1.05;

// --- Grand Staircase (interior.md, The Grand Staircase; map Z − 3.1) --------------------------------
export const STAIR_HALF = 3.69;
export const STAIR_FOOT_Z = -36.57;
export const STAIR_MID_FRONT_Z = -46.87;
export const STAIR_MID_BACK_Z = -49.88;
export const STAIR_TOP_Z = -56.89;
export const CROSS_HALL_FRONT_Z = -59.74;
export const CROSS_HALL_BACK_Z = -66.79;
export const CROSS_HALL_HALF = 9.8;
export const GALLERY_OUTER_X = 9.75;

// --- Passages into the McKim, Mead & White wings (floor map, main floor; map Z − 3.1) ----------------------------------------
/**
 * The seam walls on X +49.4 and −49.7 stand inside two galleries that the map draws running straight through them on the main floor: the Old Kingdom
 * gallery (103) along the front, X +45.38..+89.75 from the front wall to Z −10.95, and the Greek gallery 153, X −89.29..−45.59 between Z −13.0 and −22.13.
 * Each wall's opening spans that width, from the main floor to the underside of this wing's second floor.
 */
export const SEAM_PASSAGE_NORTH = { z0: -10.95, z1: EXT_FACE_Z - EXT_WALL_T } as const;
export const SEAM_PASSAGE_SOUTH = { z0: -22.13, z1: -13.0 } as const;
/**
 * The map's main-floor doors on the wings' inner partitions, as spans of world Z. X +45.4: from gallery 101 into the Old Kingdom gallery (103), and from
 * gallery 100 into its bay beyond. X −45.6: from galleries 152, 150 and 151 into the Greek galleries, the middle one on the Great Hall's axis.
 */
export const WING_DOORS_NORTH: readonly (readonly [number, number])[] = [[-7.48, -5.19], [-18.14, -16.38]];
export const WING_DOORS_SOUTH: readonly (readonly [number, number])[] = [[-9.07, -7.3], [-19.24, -16.05], [-27.99, -26.2]];
