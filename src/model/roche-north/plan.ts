/**
 * Plan and level constants of the Roche north area: the Sackler Wing (Temple of Dendur) and the American Wing (Engelhard Court, 1924 core). World metres.
 * Block lines come from docs/research/exterior.md section 2 (canonical). Positions read from the Met floor map (docs/research/interior.md, "Plan source")
 * are shifted into the canonical frame: world Z = map Z − 3.1 (coordinator's frame correction, 2026-10-11); X is unchanged.
 * Tags as in frame.ts: M measured (source named), D derived (working named), E estimated (photograph named, docs/research/*-images.md).
 * Data only.
 */
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y, SACKLER_GLASS_TOP_Y, SACKLER_MAX_Z, SACKLER_NORTH_FACE_X } from '../frame.js';

// --- Blocks (exterior.md section 2) ---------------------------------------------------------
/** The `sackler` block: X 118.0..153.1, Z −103.0..−41.3. */
export const SACKLER_BLOCK = { minX: 118.0, maxX: SACKLER_NORTH_FACE_X, minZ: -103.0, maxZ: SACKLER_MAX_Z } as const;
/** The `american-wing` block polygon (X, Z), counter-clockwise. */
export const AMERICAN_BLOCK: readonly (readonly [number, number])[] = [
  [49.4, -96.0],
  [118.0, -96.0],
  [118.0, -103.0],
  [140.6, -103.0],
  [140.5, -161.0],
  [87.6, -161.0],
  [87.6, -138.3],
  [49.4, -138.3],
];
/** M: the American Wing's park faces ([K1]): Z −138.3 south of X 87.6, Z −161.0 north of it; north face at X 140.5. */
export const AW_WEST_Z_SOUTH = -138.3;
export const AW_WEST_Z_NORTH = -161.0;
export const AW_STEP_X = 87.6;
export const AW_NORTH_X = 140.5;
/** M: the line the American Wing shares with the McKim, Mead & White rear wings (mmw-north-f), Z −96.0, and the Sackler's west line, Z −103.0. */
export const AW_EAST_Z = -96.0;
export const SACKLER_WEST_Z = -103.0;

// --- Levels -----------------------------------------------------------------------------------
/** D: the Dendur walkways and the gallery floor are on the main floor (map floor 1); the park outside the glass is at +4.2 ([F11]). */
export const DENDUR_FLOOR_Y = MAIN_FLOOR_Y;
/** E ±0.2: the granite platform stands about 1 m above the walkways (P4, against visitors and the 2 m speaker stands). */
export const PLATFORM_Y = DENDUR_FLOOR_Y + 1.0;
/** E: the coping round the terrace is a bench-high kerb (Verbruggen 2015, visitors sitting on it). */
export const COPING_HEIGHT = 0.45;
/** E: the pool's water lies just below the walkway floor (DP244278, the east end). */
export const POOL_WATER_Y = DENDUR_FLOOR_Y - 0.15;
/** E ±0.6: the hung glass ceiling, about 16 m over the walkways (DP244278 against the 8.08 m gate; Haklai 2012 against the 6.40 m temple), just under the roof deck. */
export const DENDUR_CEILING_Y = 19.9;
/** The roof deck at the head of the sloped glass wall (frame.ts SACKLER_GLASS_TOP_Y). */
export const SACKLER_ROOF_Y = SACKLER_GLASS_TOP_Y;
/** D: the limestone tower at the wall's west end, wall top under its coping (camera solve of King of Hearts 2013: coping top 23.0; orthophoto: its long shadow). */
export const SACKLER_TOWER_TOP_Y = 22.7;
/** D: the mat's top, over the site's pad at GROUND_FLOOR_Y − 0.1; the service level and garage under the gallery rise from it (Aldred pp. 71–72). */
export const SACKLER_FOOTING_Y = GROUND_FLOOR_Y + 0.45;

// --- Sackler plan (map floor 1, shifted) --------------------------------------------------------
/** D: the gallery floor (exterior.md S6 anchor, Temple of Dendur gallery X +118.0..+148.9, Z −95.3..−41.3). */
export const GALLERY = { minX: 118.0, maxX: 148.9, minZ: -95.3, maxZ: SACKLER_MAX_Z } as const;
/** E ±0.5: the head of the sloped glass, where the glazed roof begins (NYC orthophoto 2018: X 146.6, less the orthophoto's 0.8 m offset at the wall's foot); the foot is on SACKLER_NORTH_FACE_X. */
export const SACKLER_GLASS_TOP_X = 145.8;
/** E ±0.5: the west end of the glass wall, against the back wall (orthophoto: the end tower's east face at Z −96.8). */
export const SACKLER_GLASS_WEST_Z = -95.7;
/**
 * E: the limestone end tower (orthophoto: a parapeted block X 145.7..153.6, Z −103.7..−96.8 casting a long shadow; the King of Hearts 2013 camera solve puts its
 * south-west corner at X 144.6): a plain limestone box beside a tall glazed slot that joins it to the American Wing. Its east wall stands behind the leaning back wall.
 */
export const SACKLER_TOWER = { minX: 145.2, maxX: SACKLER_NORTH_FACE_X, minZ: SACKLER_WEST_Z, maxZ: -97.7 } as const;
/** D: the stone back wall's face at the walkway (map: the hall's west edge Z −92.09 → −95.19). */
export const BACK_WALL_Z = -95.2;
/** E: the back wall leans back like the cliffs it suggests (Aramco World 1980, "a sloping wall"); photographs show only a slight lean. Degrees from vertical. */
export const BACK_WALL_LEAN_DEG = 4;
/** D: the platform between its side steps (map structure X 119.74..146.89), from the back wall to the terrace's east coping (Z −50.49). */
export const PLATFORM = { minX: 119.74, maxX: 146.89, minZ: BACK_WALL_Z, maxZ: -50.49 } as const;
/** D: the side flights up the platform's long sides (map X 118.06..119.74 and 146.89..148.60, Z −86.98..−68.54). */
export const SIDE_STEPS = { south: [118.06, 119.74], north: [146.89, 148.6], minZ: -86.98, maxZ: -68.54 } as const;
/** D: the terrace before the gate (map Z −68.57..−50.49) and its coping, 0.9 m wide on the north, south and east (map structure ring). */
export const TERRACE = { minZ: -68.57, maxZ: -50.49, coping: 0.9, returnSouthX: 122.66, returnNorthX: 144.3, returnZ: -64.85 } as const;
/** D: the reflecting pool: the main basin X 118.07..148.83, Z −50.50..−41.20, and arms 1.7 to 1.9 m wide back along the terrace to Z −64.86 (map water feature). */
export const POOL = { minX: 118.07, maxX: 148.83, basinMinZ: -50.5, armMinZ: -64.86, armSouthMaxX: 119.75, armNorthMinX: 146.9 } as const;
/** D: the temple and gate share one east-west axis (map: temple X 129.83..137.11, gate X 126.12..140.81). */
export const TEMPLE_AXIS_X = 133.47;
/** D: the temple's base (map structure X 129.83..137.11, Z −92.33..−77.74), larger than the temple by a plinth margin. */
export const TEMPLE_BASE = { minX: 129.83, maxX: 137.11, minZ: -92.33, maxZ: -77.74 } as const;
/** M: the temple proper, 6.40 m high and wide and 12.50 m long (Met API object 547802). */
export const TEMPLE_WIDTH = 6.4;
export const TEMPLE_LENGTH = 12.5;
export const TEMPLE_HEIGHT = 6.4;
/** M: the gate is 8.08 m high (Met API object 547802); E: 4.6 m wide over its corner rolls and 3.35 m deep (DP244278: base width 0.57 of its height). */
export const GATE_HEIGHT = 8.08;
export const GATE_WIDTH = 4.6;
export const GATE_DEPTH = 3.35;
/** D: the gate's centre (map structure Z −68.57..−64.84) and the old paving slabs flanking it (X 126.12..140.81). */
export const GATE_Z = -66.7;
export const GATE_SLABS = { minX: 126.12, maxX: 140.81, minZ: -68.57, maxZ: -64.84 } as const;
/** D: the forecourt of old flagstones between gate and temple (map X 127.64..139.31, Z −82.04..−68.54). */
export const FORECOURT = { minX: 127.64, maxX: 139.31, minZ: -82.04, maxZ: -68.54 } as const;
/**
 * E: the temple stands on a dais of its own, raised again above the platform (P4: a granite face about 0.75 m high some 2.6 m from the temple's south wall;
 * Haklai 2012: steps down from it toward the gate). Its sides follow the forecourt lines (map partitions X 127.64 and 139.31); it runs back to the rough blocks.
 */
export const DAIS = { minX: FORECOURT.minX, maxX: FORECOURT.maxX, minZ: -93.4, maxZ: FORECOURT.maxZ } as const;
export const DAIS_Y = PLATFORM_Y + 0.75;
/** D: the short flights from the terrace up to the dais at the gate's two ends (map steps Z −70.58..−68.54, 1.5 m wide). */
export const DAIS_STEPS = { width: 1.52, minZ: -70.58 } as const;

// --- American Wing plan (map floor 1, shifted) ----------------------------------------------------
/** M: the 1924 core's third floor, the one floor only it has (map floor 3: X 94.31..118.46, Z −129.13..−100.66). */
export const AW1924 = { minX: 94.33, maxX: 118.46, minZ: -129.13, maxZ: -100.66 } as const;
/** D: the Engelhard Court floor (map gallery 700 X 59.17..94.33, Z −127.53..−103.54) and its south strip with the loggia (gallery 701, X 53.94..59.18). */
export const COURT = { minX: 59.17, maxX: 94.33, minZ: -127.53, maxZ: -103.54, southX: 53.94 } as const;
/** D: the bank facade's front on X 92.95 (map wall to X 94.33) across the court, its door at Z −116.67..−114.41. */
export const BANK_FRONT_X = 92.95;
export const BANK_DOOR_Z = -115.54;
/** D: the court's centre line, on the bank door. */
export const COURT_AXIS_Z = BANK_DOOR_Z;
/** D: column centres of the cafe rows and the east walk (map columns, 5.81 m on centres). */
export const COLUMN_XS: readonly number[] = [59.18, 65.0, 70.81, 76.62, 82.44, 88.25];
export const CAFE_WEST_ROW_Z = -135.22;
export const CAFE_EAST_ROW_Z = -127.52;
export const EAST_WALK_ROW_Z = -103.55;
/** D: the east colonnaded walk (map Z −103.56..−95.67) and the cafe on the park side (map X 53.94..88.85, Z −136.11..−127.51). */
export const EAST_WALK_Z = -95.67;
export const CAFE_WEST_Z = -136.11;
/** D: the raised planting beds before the facade (map X 82.43..88.85, Z −127.53..−119.41 and −111.67..−103.54) and the flights by them. */
export const BEDS = { minX: 82.43, maxX: 88.85, southMaxZ: -119.41, northMinZ: -111.67 } as const;
export const BED_STEPS = { minX: 82.43, maxX: 84.78 } as const;
export const FACADE_STEPS = { minX: 90.83, maxX: 92.97, minZ: -120.61, maxZ: -110.47 } as const;
/** D: the small pool in the court's southern half (map X 63.03..65.96, Z −118.46..−112.63). */
export const COURT_POOL = { minX: 63.03, maxX: 65.96, minZ: -118.46, maxZ: -112.63 } as const;
/** M: 70 ft (21.3 m) from the court floor to the skylight, as built in 1980 (Christian Science Monitor, 19 June 1980). */
export const COURT_EAVE_Y = MAIN_FLOOR_Y + 21.3;
/**
 * E: the balcony level round the court, west over the cafe and east over the walk (P5: both balconies' slab edges about 5.9 m over the court floor, measured against
 * the bank facade's width), and the galleries' second floor above (map floors 1M and 2).
 */
export const AW_MEZZANINE_Y = MAIN_FLOOR_Y + 5.9;
export const AW_SECOND_FLOOR_Y = MAIN_FLOOR_Y + 10.0;
