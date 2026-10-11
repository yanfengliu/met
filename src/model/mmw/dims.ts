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
 * Heights (re-measured 2026-10-11): [P37] is level to 1.7° and yawed about 9°; at the link's second window the 5.2 m bay spans 530 px and the arch's rise equals
 * its half-width, so the wall reads 99 px/m, which the Hunt column beside it confirms (frame.ts HUNT_COLUMN_HEIGHT 12.75 m spans 1265 px at the same depth).
 * Above the plaza at the wall foot (Y 0.25): water table 4.4, window glass 6.2..11.6, keystones 12.6..13.3, main cornice's corona 14.2, attic panels
 * 14.9..16.25, crowning dentils 16.7..17.1, corona 17.5, cornice top 18.0 (MMW_CORNICE_Y), cresting about 18.6. At the seam with the Hunt extension ([P35],
 * [P37], [P47], [D12]) the extension stands above the link: its 18.3 dentil cornice (hunt/dims.ts EXT_ORDER_TOP_Y) runs just over the link's cornice top.
 * [L14] and [P50] show both end pavilions an attic storey taller than the links (END_CORNICE_Y).
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
 * Second floor of the Fifth Avenue links and the south end pavilion. D: the links' main-storey arched windows rise to +11.7 and their keystones to +12.6 ([P37],
 * [D12]), above Hunt's +10.97, so the floor sits over them, behind the main entablature; Heckscher p. 48 gives 25 ft main-floor ceilings in the later wings (4.11 + 7.62 + 1.0 m of floor and cove ≈ 12.7..13.6). Low-medium.
 */
export const LEVEL_2_FRONT = 13.6;
/** Second floor of the north end pavilion and the Morgan wing: lowered in 1908 to match Hunt's (Heckscher p. 48 via interior.md, Floor levels). M/D. */
export const LEVEL_2_NORTH = SECOND_FLOOR_Y;
/** Third floor of the north end pavilion, in the attic storey (map floor 3, X +101.9..+152.0). E from the attic band of [L14], low. */
export const LEVEL_3_NORTH = 15.9;
/** Mezzanine of the south end pavilion (map floor 1M: galleries 170 and 171 overlook the Roman court). E: halfway between the main and second floors, low. */
export const LEVEL_1M_SOUTH = 9.3;
/** Floor slab thickness, structure and finish. E. */
export const SLAB = 0.45;
/** Foundations: footings under the outer walls go this far below the ground floor. E. */
export const FOOTING_DEPTH = 1.2;
/** The end pavilions' crowning cornice top: an attic storey over the links' ([L14]: at the seam the pavilion's south face rises about 3 m over the link's cornice; [P50]). E, low-medium. */
export const END_CORNICE_Y = 20.7;
/** Flat roof decks behind the parapets of the links and of the end pavilions. D: each crowning cornice's top less the cornice and a parapet upstand. */
export const LINK_ROOF_Y = MMW_CORNICE_Y - 0.9;
export const END_ROOF_Y = END_CORNICE_Y - 0.9;
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
/** The main entablature over the arched windows, links and pavilions alike: bottom (the keystones touch it) and cornice top ([P37]; [L14]: the pavilions' capitals line up with it). M ±0.3. */
export const ENTABLATURE_Y = 12.6;
export const ENTABLATURE_TOP_Y = 14.6;
/** The attic's sunk panels, one per bay: their width, and per tier their sill and height ([P37] links 14.9..16.25; pavilions E from [L14]). */
export const ATTIC_PANEL_WIDTH = 3.6;
/** Crowning cornice's projection: the NYC roof outline runs about 0.7 m outside OSM (coordinator, 2026-10-11) plus the cyma. E. */
export const CORNICE_PROJECTION = 1.0;

/** A height tier of the fronts: the links, or the taller end pavilions with their attic storey. */
export interface Tier {
  readonly name: 'link' | 'end';
  /** Bottom of the crowning cornice (its bed mouldings and dentils) and its top. */
  readonly corniceY: number;
  readonly top: number;
  readonly atticPanelY: number;
  readonly atticPanelHeight: number;
  /** The roof deck's top behind the parapet. */
  readonly roofY: number;
}
/** Links: [P37] crowning dentils from 16.7, cornice top 18.0. M ±0.5. */
export const LINK_TIER: Tier = { name: 'link', corniceY: 16.8, top: MMW_CORNICE_Y, atticPanelY: 14.95, atticPanelHeight: 1.3, roofY: LINK_ROOF_Y };
/** End pavilions: the attic storey over the main entablature, under the links' cornice profile (1.2 m, so both tiers share its modillions and dentils). E, low-medium. */
export const END_TIER: Tier = { name: 'end', corniceY: END_CORNICE_Y - 1.2, top: END_CORNICE_Y, atticPanelY: 15.6, atticPanelHeight: 2.8, roofY: END_ROOF_Y };
/** Antefix cresting on the cornice ([P35], [P37]: a row of small palmettes): height and spacing. E. */
export const CRESTING_HEIGHT = 0.75;
export const CRESTING_SPACING = 1.3;

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
/** The end bays' tall niches: width, sill and crown ([P50]; the crown and its keystone under the main entablature). E, low. */
export const NICHE_WIDTH = 3.6;
export const NICHE_SILL_Y = 5.2;
export const NICHE_CROWN_Y = 12.0;
export const NICHE_DEPTH = 0.9;
/** Giant Corinthian pilasters on the end pavilions' fronts, water table to entablature ([L14]). E. */
export const GIANT_PILASTER_WIDTH = 1.05;
export const GIANT_PILASTER_PROJECTION = 0.28;
/** 84th and 80th Street end facades: arched bays in the links' rhythm (the wings "wrap round the corners", exterior.md W5). E. */
export const END_FACADE_BAYS_NORTH = 9;
export const END_FACADE_BAYS_SOUTH = 8;
