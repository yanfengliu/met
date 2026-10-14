/**
 * Local dimensions of the McKim, Mead & White wings (1904–1926): blocks, levels and the facade's measured lines, each with its source.
 * Metres, world frame of docs/design/spec.md. Shared facts come from src/model/frame.ts; everything here is local to this area.
 * Tags: M measured (source named), D derived (working shown), E estimated (photo or reasoning named, with a confidence).
 *
 * Photographs measured (docs/research/exterior-images.md and Commons, viewed 2026-10-11):
 * - [P35] Mapillary tomjmat 2020-05-25 16H21M35S and [P37] 16H21M37S: the north link frontally from Fifth Avenue, camera about 39 m out.
 * - [P47] 16H21M47S and [P50] 16H21M50S: the south link frontally, and the south end pavilion's north end bay with its tall blind niche.
 * - [L14] Library of Congress LC-USZ62-101736, about 1914: the north link (seven arched windows) and the north end pavilion's south side and giant order.
 * - [D12] Daniel Dimitrov 2012, "The Metropolitan Museum of Art Manhattan NYC sideview": the south link's bays, base windows and archivolts.
 * - [E39]..[E43] Epicgenius, "5 Av Apr 2023 39" to "43" (Commons, CC BY-SA 4.0; the series named in exterior-images.md), viewed at 1:1 on 2026-10-13: [E43] the
 *   south link's last four bays and the Hunt extension frontally from the far sidewalk, 27 mm (6277 px focal), about 44 m out and pitched up about 15°;
 *   [E40] the whole south link; [E41] the south extension frontally; [E42] and [E39] the south end pavilion's north-east corner and its seam with the link.
 * Heights: [P37] is level to 1.7° and yawed about 9°; at the link's second window the 5.2 m bay spans 530 px, so the wall reads 99 px/m above the plaza at the
 * wall foot (Y 0.25): water table 4.4, window glass 6.2..11.6. Above the glass the lines are [E43]'s (2026-10-13). Its glass (765 px) and bay (738 px) give
 * 141.7 px/m, but its verticals converge: three windows widen by 4.2e-5 of their width per row downward and their centres lean to match, so the vertical
 * scale shrinks upward with the square of that and a row maps to a wall height by a projective map anchored on [P37]'s glass (vanishing line 21,100 rows above
 * the image top). A cornice's front edge stands out from the wall, so a street camera reads it high by its projection in about 44 m: about 0.3 m for the links'.
 * So, true heights: keystones 12.0..12.8 hanging from the main entablature 12.8..13.9, sunk attic panels 14.4..16.5, the crowning cornice 16.8..17.7 with dentils,
 * no modillions and no cresting ([E43], [E40], [D12]). [P37] read the cornice's front edge at 18.0 on the wall's scale: 17.7 once its projection is taken out.
 * At the seam with the Hunt extension ([E43], [E41], [D12]) the link's cornice top runs just under the extension's dentil course (dentils from 18.0, its corona's
 * front edge 19.3), and the extension's crowning cornice stands at 21.4..21.9, about 4 m over the link's. At the end pavilion ([E42], [E39], [L14]) the giant
 * order rises to an architrave and frieze, the modillioned cornice springs from the link's cornice top, and a plain parapet tops out at 21.9, level with the
 * extension's crown; these are scaled at the seam by the link's crowning cornice in the same photograph and carry the same corrections.
 */
import {
  BUILDING_MAX_X,
  BUILDING_MIN_X,
  GROUND_FLOOR_Y,
  HUNT_EXTENSION_FACE_Z,
  MAIN_FLOOR_Y,
  MMW_CORNICE_Y,
  MMW_END_PAVILION_FRONT_Z,
  MMW_NORTH_END_MIN_X,
  MMW_NORTH_LINK_MAX_X,
  MMW_NORTH_LINK_MIN_X,
  MMW_SOUTH_END_MAX_X,
  MMW_SOUTH_LINK_MAX_X,
  MMW_SOUTH_LINK_MIN_X,
  SACKLER_MAX_Z,
  SECOND_FLOOR_Y,
} from '../frame.js';

// --- Plan source ------------------------------------------------------------------------------
/** World Z of a floor-map feature is json z − 82.87 + MAP_Z_SHIFT (coordinator's rule, 2026-10-11): the map's plate edges then sit 1.2 m inside OSM on all four sides. */
export const MAP_Z_SHIFT = -3.1;

// --- Blocks (docs/research/exterior.md section 2; the coordinator's assignment) -------------
/** Outer walls: outer face on the block line, inner face on the map's plate edge (coordinator's reading of the lines, 2026-10-11). */
export const OUTER_WALL = 1.2;
/** Party walls on lines shared with newer wings (Sackler, American Wing, Rockefeller, Kravis): this area builds them. E, by section-cut legibility. */
export const PARTY_WALL = 0.8;

export const NORTH_LINK = { x0: MMW_NORTH_LINK_MIN_X, x1: MMW_NORTH_LINK_MAX_X, z0: -38.5, z1: HUNT_EXTENSION_FACE_Z } as const;
export const NORTH_END = { x0: MMW_NORTH_END_MIN_X, x1: BUILDING_MAX_X, z0: SACKLER_MAX_Z, z1: MMW_END_PAVILION_FRONT_Z } as const;
/** Wing F behind the north link: X 49.4..118.0, Z −96.0..−41.3 plus the strip X 49.4..88.6, Z −41.3..−38.5. */
export const MORGAN = { x0: MMW_NORTH_LINK_MIN_X, x1: 118.0, z0: -96.0, z1: SACKLER_MAX_Z, stripX1: MMW_NORTH_LINK_MAX_X, stripZ1: -38.5 } as const;
/** The south link's front is 0.1 m in front of the north link's (exterior.md W2, S1 −1.9). */
export const SOUTH_LINK = { x0: MMW_SOUTH_LINK_MIN_X, x1: MMW_SOUTH_LINK_MAX_X, z0: -69.0, z1: -1.9 } as const;
export const SOUTH_END = { x0: BUILDING_MIN_X, x1: MMW_SOUTH_END_MAX_X, z0: -38.5, z1: MMW_END_PAVILION_FRONT_Z } as const;

// --- Levels -------------------------------------------------------------------------------------
export const LEVEL_G = GROUND_FLOOR_Y;
export const LEVEL_1 = MAIN_FLOOR_Y;
/**
 * Second floor of the Fifth Avenue links and the south end pavilion. D: the links' main-storey arched windows rise to +11.7 and their keystones to +12.75 ([P37],
 * [E43]), above Hunt's +10.97, so the floor sits over them, behind the main entablature; Heckscher p. 48 gives 25 ft main-floor ceilings in the later wings (4.11 + 7.62 + 1.0 m of floor and cove ≈ 12.7..13.6). Low-medium.
 */
export const LEVEL_2_FRONT = 13.6;
/** Second floor of the north end pavilion and the Morgan wing: lowered in 1908 to match Hunt's (Heckscher p. 48 via interior.md, Floor levels). M/D. */
export const LEVEL_2_NORTH = SECOND_FLOOR_Y;
/** Third floor of the north end pavilion, behind the giant order's upper part and frieze (map floor 3, X +101.9..+152.0). E, low. */
export const LEVEL_3_NORTH = 15.9;
/** Mezzanine of the south end pavilion (map floor 1M: galleries 170 and 171 overlook the Roman court). E: halfway between the main and second floors, low. */
export const LEVEL_1M_SOUTH = 9.3;
/** Floor slab thickness, structure and finish. E. */
export const SLAB = 0.45;
/** Foundations: footings under the outer walls go this far below the ground floor. E. */
export const FOOTING_DEPTH = 1.2;
/**
 * The end pavilions' crowning entablature and parapet: the giant order's capitals and the architrave over them, the modillioned cornice's top (its front edge)
 * and the parapet's coping top. [E42] at the south seam, with the link's crowning cornice in the same frame as the ruler (1.13 m on the wall's scale, [E43]):
 * architrave 1.45 m under the link's cornice top, the cornice's front edge 2.05 m over it and the parapet 2.05 m over that; [E39]: 1.8 and 2.5. Wall-scale
 * readings 16.5, 20.0 and 22.05, less the parallax of the 1.3 m cornice and the coping (dims header): 16.5, 19.4, 21.9. E ±0.4.
 */
export const END_ARCHITRAVE_Y = 16.5;
export const END_CORNICE_Y = 19.4;
export const END_PARAPET_Y = 21.9;
/**
 * Top of the south link's park wall (Z −69.0) once the Kravis Wing (1990) rose against it: that wing's parapet, roche-south kravis.ts KRAVIS_ROOF_Y + 1.0.
 * A neighbour's number restated here because frame.ts has no constant for it (requested in the handoff, 2026-10-13).
 */
export const KRAVIS_LINE_TOP_Y = 19.6;
/** Flat roof decks: the links' behind the coping over their cornice, the end pavilions' behind the parapet. D: each a cornice or parapet upstand below. */
export const LINK_ROOF_Y = MMW_CORNICE_Y - 0.9;
export const END_ROOF_Y = END_PARAPET_Y - 1.0;
/**
 * Roof deck of the Morgan wing's galleries round the Arms and Armor Court: the court rises "above two floors of smaller galleries" (Heckscher p. 48 via
 * interior.md) and its clerestory windows stand on the court's cornice (P7), so the galleries' roof sits under their sills. E: second floor + 4.0 m, low-medium.
 */
export const MORGAN_ROOF_Y = SECOND_FLOOR_Y + 4.0;
/** South end pavilion: a hipped metal roof from the parapet up to the Roman court's skylight curb (NYC orthophoto 2018, ref-plan-ortho). E: rise from the orthophoto's hip lines, low. */
export const SOUTH_HIP_RISE = 3.4;

// --- Fifth Avenue facade: horizontal lines (heights above sidewalk grade) ------------------------
/** Top of the water table, the moulded band over the rusticated base. [P37] 4.4, [D12]: just above the main floor. M ±0.3. */
export const WATER_TABLE_Y = 4.5;
/** Base storey rustication: channelled joints this far apart, from grade up to the water table ([D12], channelled ashlar). E. */
export const RUSTICATION_COURSE = 0.6;
/** Main-storey arched windows: sill, crown and clear width ([P37]: glass 6.2..11.6, 2.4 m wide inside the bronze frame; [D12]). M ±0.3. */
export const ARCH_SILL_Y = 5.9;
export const ARCH_CROWN_Y = 11.7;
export const ARCH_WIDTH = 2.7;
/** Base-storey windows with grilles, one under each arched window ([D12], [P47]). E. */
export const BASE_WINDOW_SILL_Y = 0.9;
export const BASE_WINDOW_HEIGHT = 2.3;
export const BASE_WINDOW_WIDTH = 1.7;
/**
 * The links' main entablature over the arched windows: bottom (the keystones hang from it) and top ([E43]: architrave 0.3, frieze 0.3 and a cornice of about
 * 0.5). M ±0.3. Links only: the pavilions' giant order runs through its height ([E42]), so it stops against their side faces.
 */
export const ENTABLATURE_Y = 12.8;
export const ENTABLATURE_TOP_Y = 13.9;
/** The sunk panels, one per bay: their width ([E43]), and per tier their sill and height (links in the attic, [E43]; pavilions between the arch and the architrave, [E39]). */
export const ATTIC_PANEL_WIDTH = 3.6;
/** Coping over the pavilions' parapet: its height and its overhang beyond the face. E. */
export const PARAPET_COPING = 0.3;

/** A height tier of the fronts: the links, or the taller end pavilions with their giant order, crowning entablature and parapet. */
export interface Tier {
  readonly name: 'link' | 'end';
  /** Bottom of the crowning cornice (its bed mouldings and dentils) and its top. */
  readonly corniceY: number;
  readonly top: number;
  /** The crowning cornice's projection, and whether modillions carry its corona (the pavilions') or dentils alone dress it (the links', [E43]). */
  readonly projection: number;
  readonly modillions: boolean;
  /** Bottom of the architrave and frieze under the crowning cornice, on the giant order's capitals (pavilions); null where the attic runs up to the cornice (links). */
  readonly architraveY: number | null;
  /** Top of the wall modules: the cornice top (links, a coping set back behind it) or the parapet under its coping (pavilions). */
  readonly wallTop: number;
  readonly atticPanelY: number;
  readonly atticPanelHeight: number;
  /** The roof deck's top behind the parapet. */
  readonly roofY: number;
}
/** Links: crowning cornice 16.8..17.7, its top just under the Hunt extension's dentil course; sunk attic panels 14.4..16.5 ([E43], [P37]; dims header). M ±0.3. */
export const LINK_TIER: Tier = {
  name: 'link',
  corniceY: 16.8,
  top: MMW_CORNICE_Y,
  projection: 0.75,
  modillions: false,
  architraveY: null,
  wallTop: MMW_CORNICE_Y,
  atticPanelY: 14.4,
  atticPanelHeight: 2.1,
  roofY: LINK_ROOF_Y,
};
/** End pavilions: the modillioned cornice springs from the links' cornice top ([E42]), over the giant order's architrave and frieze, under a plain parapet. E ±0.4. */
export const END_TIER: Tier = {
  name: 'end',
  corniceY: MMW_CORNICE_Y,
  top: END_CORNICE_Y,
  projection: 1.3,
  modillions: true,
  architraveY: END_ARCHITRAVE_Y,
  wallTop: END_PARAPET_Y - PARAPET_COPING,
  atticPanelY: 13.3,
  atticPanelHeight: 2.5,
  roofY: END_ROOF_Y,
};

// --- Bays ------------------------------------------------------------------------------------------
/** Bay (window centre to centre) of the links. D: seven arched windows in each link ([L14] north, [P47] south) in 39.2 / 38.4 m less end piers; [P37] spacing 0.55 of the main storey. E ±0.3. */
export const BAY = 5.2;
export const LINK_BAYS = 7;
/** Pilasters between the bays: face width and projection ([P35]: plain Tuscan strips). E. */
export const PILASTER_WIDTH = 0.9;
export const PILASTER_PROJECTION = 0.16;
/** End pavilion fronts: end bays with a tall blind niche (semicircular in the map's plate edge at X −144.8 and −94.9, 6.7 m in from each corner; [P50]) and seven central bays of the giant Corinthian order ([L14]). D. */
export const END_BAY = 13.3;
export const PAVILION_BAYS = 7;
/** The end bays' tall niches: width, sill and crown ([P50]; the crown and its keystone under the bay's sunk panel). E, low. */
export const NICHE_WIDTH = 3.6;
export const NICHE_SILL_Y = 5.2;
export const NICHE_CROWN_Y = 12.0;
export const NICHE_DEPTH = 0.9;
/** Giant Corinthian pilasters of the end pavilions, from the water table to the architrave (11.7 m, about ten widths; [E42], [E39], [L14]). E. */
export const GIANT_PILASTER_WIDTH = 1.2;
export const GIANT_PILASTER_PROJECTION = 0.28;
/** 84th and 80th Street end facades: arched bays in the links' rhythm between the pavilions' giant pilasters (the wings "wrap round the corners", exterior.md W5). E. */
export const END_FACADE_BAYS_NORTH = 9;
export const END_FACADE_BAYS_SOUTH = 8;
