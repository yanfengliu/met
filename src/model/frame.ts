// World-frame constants for The Met Fifth Avenue, from docs/research/exterior.md.
// Metres. +Y up, +X Manhattan north (up Fifth Avenue), +Z Manhattan east (toward Fifth Avenue).
// Origin: Fifth Avenue sidewalk grade on the central entrance axis, in the plane of the Hunt
// pavilion's main wall face. Each comment names its fact id in exterior.md and whether the value
// is measured (M), derived (D) or estimated (E). Data only: no imports, no logic.

// --- Frame and site -------------------------------------------------------------------------
export const GRID_BEARING_DEG = 29.03; // [F1] M: Met-side curb of Fifth Avenue, fit rms 0.024 m
export const ORIGIN_LAT = 40.77911; // [F2] D: WGS84 latitude of the world origin
export const ORIGIN_LON = -73.9626733; // [F2] D: WGS84 longitude of the world origin
export const ORIGIN_NAVD88_M = 25.92; // [F5] M: USGS 3DEP DEM, sidewalk on the axis
export const ENTRANCE_AXIS_X = 0; // [F3] M: symmetry axis of pavilion, fountains, Lehman Wing
export const FACADE_PLANE_Z = 0; // [F4] E ±1.0 m: Hunt pavilion main wall face
export const GRADE_Y = 0; // [F5] M: sidewalk grade on the axis
export const SIDEWALK_Y_SOUTH_END = -1.66; // [F6] M: sidewalk at X -113 (80th Street end)
export const SIDEWALK_Y_NORTH_END = 0.21; // [F6] M: sidewalk at X +147 (84th Street end)
export const ROADWAY_Y = -0.15; // [F10] E: typical curb reveal below the sidewalk
export const CURB_WEST_Z = 28.92; // [F7] M: Met-side curb line at the axis (28.89..29.03 along front)
export const CURB_EAST_Z = 42.9; // [F8] M: far curb, mean along the frontage
export const CARRIAGEWAY_WIDTH = 14.0; // [F9] D: CURB_EAST_Z - CURB_WEST_Z
export const FIFTH_AVE_CENTRELINE_Z = 36.5; // [F10] M: OSM way, one-way southbound
export const PARK_GROUND_Y_NORTH = 4.2; // [F11] M: park beside the north end (X +163), mean
export const PARK_GROUND_Y_WEST_LEHMAN = 5.2; // [F11] M: park west of the Lehman Wing (Z -195..-225), mean
export const PARK_GROUND_Y_WEST_SOUTH = 2.3; // [F11] M: park west of Kravis/Wallace (Z -170), mean
export const PARK_GROUND_Y_WEST_AMERICAN = 7.0; // [F11] M: park west of the American Wing (Z -170), mean
export const SITE_MIN_X = -215; // [F12] D: model site bounds; widened from -200 on 2026-10-11 so the ref-park-south camera (X -207, fitted from the photo's EXIF) stands on the park
export const SITE_MAX_X = 200; // [F12] D
export const SITE_MIN_Z = -260; // [F12] D
export const SITE_MAX_Z = 60; // [F12] D

// --- Building extents -----------------------------------------------------------------------
export const BUILDING_MIN_X = -151.61; // [B0] M: OSM outline, south end (80th Street side)
export const BUILDING_MAX_X = 153.13; // [B0] M: OSM outline, north end (84th Street side)
export const BUILDING_MIN_Z = -179.81; // [B0] M: Lehman Wing west point
export const BUILDING_MAX_Z = 9.91; // [B0] M: front of the end pavilions
export const FRONTAGE_LENGTH = 304.74; // [W1] D: BUILDING_MAX_X - BUILDING_MIN_X
export const FOOTPRINT_AREA_M2 = 46470; // [B00] M: OSM outline area; blocks tile it exactly
export const WEST_FACE_Z_CORE = -138.3; // [K1] M: west face, Kravis to American Wing
export const WEST_FACE_Z_WALLACE = -160.1; // [K1] M: Wallace Wing west face
export const WEST_FACE_Z_AMERICAN = -161.0; // [K1] M: American Wing outer west face

// --- Levels ---------------------------------------------------------------------------------
export const LANDING_Y = 3.63; // [P1] M: top of the front steps, flat Z +3.5..+8.5
export const MAIN_FLOOR_Y = 4.11; // D: LANDING_Y plus the three steps inside the central doorway (interior.md, Floor levels); the total rise matches the published 13½ ft (4.115 m)
export const GROUND_FLOOR_Y = -2.34; // D: MAIN_FLOOR_Y − 21'-2" (interior.md, Floor levels; Tang drawing labels), low-medium
export const SECOND_FLOOR_Y = 10.97; // D: MAIN_FLOOR_Y + 22'-6" (interior.md, Floor levels), Hunt core only; other wings' second floors differ
export const GREAT_HALL_RIDGE_Y = 33.37; // D: MAIN_FLOOR_Y + 96'-0" (interior.md, Floor levels), medium-low

// --- Hunt central pavilion ------------------------------------------------------------------
export const HUNT_PAVILION_HALF_WIDTH_BASE = 30.42; // [H1] M: OSM, base outline
export const HUNT_PAVILION_HALF_WIDTH_ROOF = 32.06; // [H1] M: NYC, roof outline
export const HUNT_PAVILION_FRONT_Z = 1.2; // [H1] M: OSM pavilion line (cornice and breaks)
export const HUNT_EXTENSION_FACE_Z = -2.0; // [H1] M: flanking extensions and MMW links
export const HUNT_EXTENSION_HALF_WIDTH = 49.6; // [H14] M: end of Hunt's facade, both sides
// Column positions settled 2026-10-11 by the hunt modeller against S7 at 1:1 and renders of both readings: S7 shows equal bays (outer to inner pair-centre
// distance 2.996) and pairs 0.225 bay apart (156 of 692 px). The floor map's 3.32 m spacing (0.19 bay), unequal bays (17.28, 17.9) and Z (-0.36 after its
// -3.1 m shift, inside the wall) are schematic; its pair centres (X 8.64, 26.54) fit equal bays of 17.64 m. Heights below re-read in S7 with the camera at
// (0, 1.7, 44), each feature at its own depth, from the measured landing.
export const HUNT_BAY = 17.6; // [H2] D ±0.3: S7 corner pier at 1.70 bay from the axis on the block corner X 30.4; map fit 17.64
export const HUNT_PAIR_CENTRE_X_INNER = 8.8; // [H2] D: inner pairs at X = ±HUNT_BAY / 2
export const HUNT_PAIR_CENTRE_X_OUTER = 26.4; // [H2] D: outer pairs at X = ±1.5 HUNT_BAY
export const HUNT_COLUMN_COUNT = 8; // [H3] M: four coupled pairs (photos S7, S8)
export const HUNT_PAIR_AXIS_SPACING = 3.97; // [H3] D: 0.2254 bay in S7 (156 px of 692)
export const HUNT_COLUMN_AXIS_Z = 2.1; // [H5] D: S7 parallax puts the pilaster faces 2.0 m behind the axes; pedestal front Z +3.4
export const HUNT_COLUMN_DIAMETER_LOWER = 1.5; // [H4] D: S7, 58.5 px at 39.2 px/m
export const HUNT_COLUMN_DIAMETER_UPPER = 1.29; // [H4] E: entasis ratio 0.86 (S8)
export const HUNT_COLUMN_HEIGHT = 12.75; // [H4] D: S7, 510 px plinth to abacus
export const HUNT_PEDESTAL_WIDTH = 6.6; // [H6] D: S7, die 0.375 bay (base course 0.40 bay)
export const HUNT_PEDESTAL_HEIGHT = 1.65; // [H6] D: S7, 66 px over the measured landing
export const HUNT_PEDESTAL_FRONT_Z = 3.4; // [H5] E: from the 2018 orthophoto strip
export const HUNT_COLUMN_BASE_Y = 5.28; // [H6] D: LANDING_Y + HUNT_PEDESTAL_HEIGHT
export const HUNT_CAPITAL_TOP_Y = 18.03; // [H6] D: column base + column height
export const HUNT_ENTABLATURE_HEIGHT = 3.67; // [H7] D: S7, the breaks' 155 px at their depth
export const HUNT_CORNICE_TOP_Y = 21.7; // [H7] D: S7, main run and breaks meet at Y 21.7 with the breaks' front at Z +3.4
export const HUNT_ATTIC_TOP_Y = 25.7; // [H8] D: S7, attic cornice top
export const HUNT_CRESTING_TOP_Y = 27.4; // [H8] D: S7, top of the mask-and-shell cresting
export const HUNT_ACROTERION_TOP_Y = 28.3; // [H8] D: S7, peaks of the cresting
export const HUNT_BLOCK_PLINTH_TOP_Y = 23.4; // [H9] D: S7, plinth under each uncarved block
export const HUNT_BLOCK_TOP_Y = 25.9; // [H9] D: S7, top of each stepped rough-stone pile
export const HUNT_BLOCK_DEPTH = 3.0; // [H9] E
export const HUNT_ARCH_SPAN = 8.3; // [H10] D: S7, inner order (the screen's opening); the outer order spans 10.2
export const HUNT_ARCH_SPRING_Y = 13.3; // [H10] D: S7, impost tops
export const HUNT_ARCH_CROWN_Y = 17.45; // [H10] D: semicircular intrados of the inner order
export const HUNT_DOOR_HEAD_Y = 8.9; // [H11] D: S7, doorway screen capitals
export const HUNT_LUNETTE_SILL_Y = 13.25; // [H11] D: S7, transom under the lunette
export const HUNT_MEDALLION_COUNT = 6; // [H12] M: Bitter's portrait medallions
export const HUNT_MEDALLION_DIAMETER = 1.8; // [H12] D: S7, 69 px at the wall
export const HUNT_MEDALLION_CENTRE_Y = 18.6; // [H12] D: S7
export const HUNT_NICHE_COUNT = 4; // [H13] M: one between the columns of each pair
export const HUNT_EXTENSION_CORNICE_Y = 20.7; // [H14] E: flanking extensions' main cornice

// --- McKim, Mead & White wings --------------------------------------------------------------
export const MMW_NORTH_LINK_MIN_X = 49.4; // [W2] M
export const MMW_NORTH_LINK_MAX_X = 88.6; // [W2] M
export const MMW_SOUTH_LINK_MIN_X = -88.1; // [W2] M
export const MMW_SOUTH_LINK_MAX_X = -49.7; // [W2] M
export const MMW_END_PAVILION_FRONT_Z = 9.85; // [W3] M: both end pavilions (9.8..9.9)
export const MMW_NORTH_END_MIN_X = 88.6; // [W3] M
export const MMW_SOUTH_END_MAX_X = -88.1; // [W3] M
export const MMW_CORNICE_Y = 17.55; // [W4] M ±0.4: the links' crowning cornice top, at the soffit of the Hunt extensions' dentilled cornice (hunt/dims.ts EXT_ORDER_TOP_Y − 0.75), photos E43 and E41 (Epicgenius 2023, mmw/dims.ts); E43's lines on P37's glass give 17.54
export const MMW_PARAPET_TOP_Y = 22.5; // [W4] E: read only by the Hunt extensions (hunt/dims.ts EXT_PARAPET_Y), which stand above the links (P35, P37, P47)

// --- Steps and plaza ------------------------------------------------------------------------
export const STEPS_TOP_Z = 9.0; // [P2] M: DEM profile on the axis
export const STEPS_BOTTOM_Z = 20.0; // [P2] M
export const STEPS_HALF_WIDTH = 23.47; // [P4] M: 154 ft flight (PPS); orthophoto reads 47 m
export const STEP_RISER_COUNT = 22; // [P3] E ±2: counted in photo S8
export const STEP_RISER = 0.163; // [P3] D: (LANDING_Y - the foot's +0.05 [P2]) / STEP_RISER_COUNT
export const STEP_TREAD = 0.4; // [P3] D: (run - two 1.73 m landings, interior.md) / 19 treads
export const FOUNTAIN_SIZE = 13.8; // [P6] M: square granite blocks, circular basin inside
export const FOUNTAIN_JETS = 48; // [P6] M: published, inward-pointing rim jets per fountain
export const FOUNTAIN_CENTRE_X = 38.5; // [P6] M: at X = ±38.5
export const FOUNTAIN_CENTRE_Z = 13.3; // [P6] M
export const GROVE_SIZE_X = 13.2; // [P7] M: four planted groves
export const GROVE_SIZE_Z = 11.7; // [P7] M
export const GROVE_CENTRE_X_INNER = 57.0; // [P7] M: at X = ±57.0
export const GROVE_CENTRE_X_OUTER = 78.6; // [P7] M: at X = ±78.6
export const GROVE_CENTRE_Z = 11.9; // [P7] M
export const ALLEE_ROW_Z_INNER = 20.3; // [P8] M: first tree row
export const ALLEE_ROW_Z_OUTER = 25.2; // [P8] M: second tree row
export const ALLEE_TREES_PER_ROW = 13; // [P8] M: per row, four rows
export const ALLEE_SPACING = 4.9; // [P8] M
export const ALLEE_NORTH_MIN_X = 90.8; // [P8] M: north allées X 90.8..150.2
export const ALLEE_SOUTH_MAX_X = -90.4; // [P8] M: south allées X -149.2..-90.4

// --- Park side ------------------------------------------------------------------------------
export const LEHMAN_HALF_WIDTH = 29.05; // [K2] M: square pavilion, chamfered west corners
export const LEHMAN_WEST_FACE_HALF_WIDTH = 5.55; // [K2] M: west face X -5.6..5.5 at BUILDING_MIN_Z
export const LEHMAN_PYRAMID_APEX_Y = 27.4; // [K2] E: camera fit to photo P9 (int-lehman-pyramid-up; EXIF lens), corners, apex, 7 purlins: 11.1 m over an eave at +16.3; medium-low
export const SACKLER_NORTH_FACE_X = 153.13; // [K3] M: sloped glass wall faces north
export const SACKLER_MIN_Z = -102.7; // [K3] M
export const SACKLER_MAX_Z = -41.3; // [K3] D: block cut line from the Met map
export const SACKLER_GLASS_TOP_Y = 20.6; // [K3] D: low-medium; camera solve of exterior photo 7 (head 20.2 at X 145.8), ceiling 20.0-21.1 in interior photos 13 and 16
export const ROCKEFELLER_GLASS_FACE_X = -151.61; // [K5] M: sloping south glass wall
export const ROCKEFELLER_GLASS_LENGTH = 61.0; // [K5] M: published 200 ft
export const ROCKEFELLER_GLASS_SLOPE_DEG = 70; // [K5] M: published slope from horizontal
export const ROCKEFELLER_GLASS_RISE = 17.1; // [K5] D: 60 ft sloped length x sin 70°
export const ROCKEFELLER_GLASS_RUN = 6.3; // [K5] D: 60 ft sloped length x cos 70°
export const ROOF_GARDEN_MIN_X = -136.7; // [K6] M: Met map floor 5
export const ROOF_GARDEN_MAX_X = -89.3; // [K6] M
export const ROOF_GARDEN_MIN_Z = -126.8; // [K6] M
export const ROOF_GARDEN_MAX_Z = -103.9; // [K6] M
