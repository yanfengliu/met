/**
 * Plan and section of the Lila Acheson Wallace Wing (KRJDA, 1987) and the Iris and B. Gerald Cantor Roof Garden on it.
 * Plan: the Met floor map (floors G, 1, 1M, 2, 4 and 5; blocks.ts MAP_Z) and the 2018 orthophoto (exterior-images.md, primary 9): a glazed roof
 * strip along the park face (Z −158.8 to −150.2), two long roof monitors over the second-floor galleries (Z −145.8..−143.0 and −138.2..−135.3),
 * glazed strips west and south of the roof garden, and the garden itself (map floor 5) with hedges along its west and south edges and a pergola along
 * its east edge (X −112 to −89, Z −119 to −108.3). Levels tagged E are estimates.
 */
import { MAIN_FLOOR_Y } from '../frame.js';
import { MAP_Z, ROCHE_SECOND_FLOOR_Y } from './blocks.js';
import type { P2 } from './poly.js';
import type { Room } from './rooms.js';

/** E: the mezzanine (map floor 1M) over the west galleries, about 4.3 m above the main floor. */
export const WALLACE_MEZZANINE_Y = MAIN_FLOOR_Y + 4.3;
export const WALLACE_SECOND_Y = ROCHE_SECOND_FLOOR_Y;
/** E: roof over the second-floor galleries; the Patrons Lounge (map floor 4) stands on it. */
export const WALLACE_ROOF_Y = 18.6;
/** E: the roof garden deck (map floor 5), one storey over the lounge. */
export const ROOF_GARDEN_Y = 22.4;
/** E: top of the park facade, under the glazed roof strip that rises from it to the main roof. */
export const WALLACE_FACADE_TOP_Y = 16.0;

/** The glazed roof strip along the park face (orthophoto). */
export const WEST_STRIP_Z0 = -158.9;
export const WEST_STRIP_Z1 = -150.2;
export const WEST_STRIP_X0 = -140.0;
export const WEST_STRIP_X1 = -89.4;

/** The tall gallery behind the park face (map 1M gallery 915, open to the glass roof on floor 2): its glass wall spans these X. */
export const WEST_GLASS_X0 = -135.25;
export const WEST_GLASS_X1 = -93.94;

/** The two long roof monitors over the second-floor galleries (orthophoto). */
export const MONITORS: readonly Room[] = [
  [-137.4, -145.8, -93.3, -143.0],
  [-137.4, -138.2, -93.3, -135.3],
];

/** The roof garden (map floor 5 gallery 926), shifted onto the world frame, kept inside the Wallace block (its bar runs on into the Kravis block). */
export const GARDEN: readonly P2[] = (
  [
    [-89.28, -123.73],
    [-89.28, -105.12],
    [-111.27, -105.13],
    [-111.28, -100.79],
    [-121.67, -100.79],
    [-121.66, -106.13],
    [-129.37, -106.14],
    [-129.37, -101.67],
    [-136.66, -101.67],
    [-136.67, -113.67],
    [-121.68, -113.67],
    [-121.66, -123.74],
  ] as const
).map(([x, z]) => [x, z + MAP_Z] as P2);

/** The pergola along the garden's east edge (orthophoto). */
export const PERGOLA: Room = [-111.8, -118.8, -89.8, -108.6];

/** Main-floor galleries 900–913 (map, rectangular rooms). */
export const WALLACE_MAIN_ROOMS: readonly Room[] = [
  [-139.93, -148.04, -128.88, -138.23],
  [-139.93, -138.24, -123.1, -128.04],
  [-139.93, -128.05, -123.1, -117.71],
  [-139.93, -117.72, -123.09, -108.44],
  [-135.25, -158.98, -128.89, -148.04],
  [-128.89, -159.0, -117.22, -148.04],
  [-128.89, -148.05, -97.24, -138.24],
  [-123.11, -138.24, -106.12, -117.72],
  [-123.11, -117.72, -106.12, -108.43],
  [-117.24, -159.0, -105.59, -148.04],
  [-106.13, -138.25, -93.55, -128.04],
  [-106.13, -128.04, -93.55, -117.72],
  [-106.13, -117.73, -93.55, -108.43],
  [-105.59, -158.99, -93.94, -148.03],
  [-97.25, -148.06, -89.28, -138.24],
];
/** Second-floor galleries 917–925 and exhibition galleries 999 (map). */
export const WALLACE_UPPER_ROOMS: readonly Room[] = [
  [-139.93, -148.04, -132.13, -133.46],
  [-139.93, -133.48, -129.17, -117.71],
  [-139.93, -117.72, -129.17, -107.27],
  [-132.15, -148.05, -123.1, -133.46],
  [-128.02, -132.32, -89.28, -107.27],
  [-123.11, -148.05, -114.61, -133.46],
  [-114.62, -148.04, -106.12, -133.46],
  [-106.13, -148.05, -97.24, -133.48],
  [-97.26, -148.06, -89.28, -133.46],
];
