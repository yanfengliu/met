/**
 * Dimensions of the core area (blocks core-1880-a, core-1888-b, core-1894-c), metres in the world frame of docs/design/spec.md.
 * Each value names its source: exterior.md section 2 (block table, light wells), interior.md (Medieval Sculpture Hall, European Paintings,
 * floor levels), the decoded floor map (research/cache/lm_features.json in the canonical frame, world Z = json z − 82.87 − 3.1, coordinator 2026-10-11),
 * the photographs named in docs/research/*-images.md, or E (an estimate, with its reasoning). Data only.
 */
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y, SECOND_FLOOR_Y, WEST_FACE_Z_CORE } from '../frame.js';

// --- Blocks (exterior.md section 2, block table; outer faces of the walls lie on these lines) -------------------------
export const WEST_Z = WEST_FACE_Z_CORE; // -138.3, the park-side face; the Vaux west front
export const EAST_Z = -69.0; // the cut line to the Hunt block (hunt-d)
export const A_HALF = 14.5; // core-1880-a spans X ±14.5
export const B_SOUTH_X = -49.7; // core-1888-b's south face: Weston's facade in the Petrie Court
export const C_NORTH_X = 49.4; // core-1894-c's north face, toward the American Wing

// --- Levels (frame.ts; interior.md "Floor levels": Wings A to D share the 20'-6" main-floor ceiling, so L2 holds here) ------
export const LG = GROUND_FLOOR_Y; // -2.34
export const L1 = MAIN_FLOOR_Y; // 4.11
export const L2 = SECOND_FLOOR_Y; // 10.97
export const FOOTING_Y = LG - 1.3; // E: strip footings 1.3 m below the ground-floor slab
export const SLAB = 0.5; // E: floor slab depth under L1 and L2
export const GALLERY_CEILING_Y = 16.6; // E: second-floor galleries 5.6 m to the laylight (interior.md: heights not found)
export const ROOF_Y = 17.2; // E: top of the flat roof slab round the skylights (orthophoto S5: flat roofs between skylights)
export const PARAPET_Y = 18.0; // E: parapet top on the outer walls
export const CORNICE_Y = 16.9; // E: main cornice at the roof line

// --- Walls (E: load-bearing brick, 0.9-1.5 m; the map's room edges sit 1.2-3.2 m inside the block lines) ----------------
export const WEST_WALL = 1.5; // the west walls; the map's rooms stop at Z -135.14, 3.2 m inside the line
export const OUTER_WALL = 1.0; // east, south and north outer walls
export const PARTY_WALL = 0.9; // core-1880-a's side walls at X ±14.5 (exterior in 1880, party walls since 1888)
export const PARTITION = 0.4; // interior walls on the map's lines

// --- Vaux and Mould building (history.md section 2; photos Original_Met.jpg about 1880, the Lehman-court view 2026) -------
export const VAUX_HALL_WEST_Z = -117.63; // map gallery 305, west edge (the hall's west end wall stands between it and 520)
export const VAUX_HALL_EAST_Z = -83.32; // map gallery 305, east edge
export const VAUX_HALL_WALL = 1.1; // the hall's end walls; the map leaves 1.15 m between 520 and 305
export const VAUX_WEST_PAVILION_WALL_Z = -127.0; // map: the wall between galleries 521 and 520
export const VAUX_OCULUS_Y = 21.4; // E: centre of the hall's round end windows, 2.4 m across (P8: one high over the end doorway)
export const VAUX_BAY = 4.0; // E: the west front's arch spacing, 7 arches across 29 m (Lehman-court photo shows 5 of them)
export const VAUX_ARCH_SPAN = 2.6; // E: the main-floor pointed arches, against people in the Lehman-court photo
export const VAUX_ARCH_RISE = 2.5; // E: lancet heads, rise about the span (Lehman-court photo), more pointed than equilateral (2.25)
export const VAUX_ARCH_SILL = 0.7; // E: window sills above L1; the central doorway starts at L1
export const VAUX_ARCH_SPRING = 4.5; // E: springing above L1, where the granite impost band runs across the front (windows 1.35 × their width below it)
export const VAUX_GROUND_SILL = 1.6; // E: ground-storey windows above LG
export const VAUX_GROUND_HEIGHT = 2.9; // E: ground-storey segmental windows, sill to crown
export const VAUX_BAND = 0.32; // E: granite band height (exterior.md [C7]: grey-white granite bands)

// --- Medieval Sculpture Hall (interior.md; map gallery 305 and its 14 columns; photo P8) -----------------------------------
export const HALL_PIER_X = 7.02; // map: pier rows at X -7.01 and +7.03
export const HALL_PIER_Z = [-117.42, -111.78, -106.13, -100.47, -94.82, -89.16, -83.53] as const; // map, canonical; the end ones are half-piers
export const HALL_PIER = 1.3; // E: pier width (the map draws columns as uniform squares)
export const HALL_ARCADE_SPRING = 3.6; // E: arcade springing above L1, so the pointed arcade clears the gallery floors over the aisles
export const HALL_ARCADE_RISE = 2.4; // E: pointed arcade arches (P8 shows pointed aisle arches); apex 6.0 m above L1
export const HALL_NAVE_WALL = 0.8; // E: the nave walls over the arcades
export const HALL_VAULT_SPRING_Y = 18.4; // E: P8 puts the clerestory windows level with the screen's cresting (15.85 m above L1)
export const HALL_CLERESTORY_SILL_Y = 18.9; // E: above the aisle galleries' roof (ROOF_Y) and skylights
export const HALL_NAVE_ROOF_EAVES_Y = 25.0; // E: brown roof over the nave in orthophoto S5, raised above the gallery roofs
export const HALL_NAVE_ROOF_PITCH_DEG = 18; // E
export const SCREEN_WIDTH = 12.8; // interior.md: 1,585 × 1,280.2 cm (Met API object 201926)
export const SCREEN_HEIGHT = 15.85; // interior.md
export const SCREEN_Z = -99.4; // E: across the nave just east of the middle pier pair, whose faces are 12.74 m apart (the screen is 12.80 m wide); P8's perspective puts it about 12 m from the camera and 17 m from the end wall behind it, and the Met calls it centrally placed

// --- Wings B and C (history.md section 3; photos 1880_Met_Museum.jpg about 1900 and the Petrie Court 2012) -----------------
export const WESTON_BAY = 5.6; // E: Petrie Court photo, three windows under each arch
export const WESTON_PAVILION_HALF = 6.2; // E: the central entrance pavilion, 12.4 m wide
export const WESTON_DADO = 1.9; // E: stone dado with roundels above L1 (Petrie Court photo)
export const WESTON_LOWER_HEAD = 6.3; // E: main-floor window heads above L1
export const WESTON_ARCH_SPAN = 4.6; // E: the round arches over the upper windows
export const WESTON_ARCH_SPRING = 2.3; // E: springing above L2
export const LIGHT_WELL_B = [-30.1, -25.0, -97.2, -84.5] as const; // exterior.md light well (4): X0, X1, Z0, Z1
export const LIGHT_WELL_C = [24.2, 36.7, -95.5, -84.4] as const; // exterior.md light well (2)

// --- Skylights (interior.md, European Paintings; exterior.md [R2]) ----------------------------------------------------------
export const SKYLIGHT_INSET = 1.2; // E: roof margin round each gallery's skylight (orthophoto S5)
export const SKYLIGHT_PITCH_DEG = 30; // exterior.md [R6]: ridge skylights about 30-35°
export const SKYLIGHT_CURB = 0.35; // E
