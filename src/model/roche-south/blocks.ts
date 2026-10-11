/**
 * The four blocks of the Roche south area and the levels its wings add to src/model/frame.ts.
 * Block polygons: docs/research/exterior.md section 2 (the OSM outline: outer wall faces). On a line two blocks share, the older block builds the
 * wall and the newer builds none (docs/design/spec.md, World frame). Plan positions from the Met floor map are shifted onto the world frame by
 * MAP_Z (docs/design/spec.md, World frame: the map sits 3.1 m +Z).
 * Levels tagged E are estimates; each names the photograph or reasoning it rests on.
 */
import { MAIN_FLOOR_Y } from '../frame.js';
import type { P2 } from './poly.js';

/** Floor-map Z to world Z (docs/design/spec.md, World frame, correction of 2026-10-11). */
export const MAP_Z = -3.1;

/** Robert Lehman Wing, 1975 (exterior.md section 2, `lehman`). Its edge on Z −138.3 is the 1880 west front, which the core area builds. */
export const LEHMAN_BLOCK: readonly P2[] = [
  [-17.5, -138.3],
  [-16.3, -139.4],
  [-16.3, -143.1],
  [-19.1, -146.0],
  [-29.1, -145.9],
  [-29.1, -156.4],
  [-5.6, -179.8],
  [5.5, -179.8],
  [29.0, -156.3],
  [29.0, -145.9],
  [19.0, -145.9],
  [16.2, -143.1],
  [16.2, -139.4],
  [17.5, -138.3],
];

/** Michael C. Rockefeller Wing, 1982 (`rockefeller`): X −151.6..−88.1, Z −97.2..−38.5. */
export const ROCKEFELLER_BLOCK: readonly P2[] = [
  [-151.6, -97.2],
  [-88.1, -97.2],
  [-88.1, -38.5],
  [-151.6, -38.5],
];

/** Lila Acheson Wallace Wing, 1987 (`wallace`). */
export const WALLACE_BLOCK: readonly P2[] = [
  [-88.1, -97.2],
  [-151.6, -97.2],
  [-151.6, -104.7],
  [-141.2, -104.7],
  [-141.2, -160.1],
  [-88.2, -160.1],
];

/** Henry R. Kravis Wing and the Petrie Court, 1990 (`kravis-petrie`): X −88.1..−49.7, Z −138.2..−69.0. */
export const KRAVIS_BLOCK: readonly P2[] = [
  [-88.1, -138.2],
  [-49.7, -138.2],
  [-49.7, -69.0],
  [-88.1, -69.0],
];

/** Every block of the area, by name, for the containment tests. */
export const BLOCKS = { lehman: LEHMAN_BLOCK, rockefeller: ROCKEFELLER_BLOCK, wallace: WALLACE_BLOCK, kravis: KRAVIS_BLOCK } as const;

/** A piece's world box may overstep its block by this much (the area brief). */
export const BLOCK_TOLERANCE = 0.3;

/** Outer walls: their outer face on the block line, this thick inward (the map's plate edges are their inner faces, about 1.2 m in). */
export const OUTER_WALL = 1.2;

/**
 * D, low: second floor of the post-1902 wings. interior.md, Floor levels: the main-floor ceiling is 25 ft in all wings after A to D
 * (Heckscher p. 48); add about 2 ft of floor structure, as that section's storey check does for the Hunt core.
 */
export const ROCHE_SECOND_FLOOR_Y = MAIN_FLOOR_Y + 27 * 0.3048;
