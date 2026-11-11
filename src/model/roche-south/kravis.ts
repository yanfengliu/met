/**
 * The Henry R. Kravis Wing and the Carroll and Milton Petrie European Sculpture Court (KRJDA, 1990), last wing of chapter `roche-south-1990`.
 * Sources: history.md section 8; interior.md, "Other skylit volumes" (the court, map gallery 548, X −61.44 to −51.24) and the Petrie Court photograph
 * (interior-images.md #33): Weston's 1888 brick-and-stone south facade, built by the core area on X −49.7, is the court's north wall; the
 * court's south wall is limestone, with the floor map's eight doors from gallery 549 into the court and windows over its arched ones from the second
 * floor (work unit 24; COURT_DOORS), and west of them the café's opening onto the court, the eighth door's mirror, a round column in the middle of it
 * and of each wide door (work unit 25; CAFE_OPENING); a long glass roof with a central ridge spans the court (orthophoto: ridge at X −56.2, hipped ends
 * near Z −128 and −85, flatter glazing beyond them). Every line of this block but the park face Z −138.2 belongs to an older block, which builds the
 * wall there.
 */
import { Matrix4 } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { CORE_COPING_TOP_Y, EAST_FACE_Z_CORE, GROUND_FLOOR_Y, KRAVIS_EAST_Z, KRAVIS_PARAPET_Y, MAIN_FLOOR_Y } from '../frame.js';
import { column, hippedSkylight, laylight, ridgeSkylight, wall, type Opening } from '../lib/index.js';
import { palette } from '../palette.js';
import { OUTER_WALL, ROCHE_SECOND_FLOOR_Y } from './blocks.js';
import { mat } from './materials.js';
import type { P2 } from './poly.js';
import { clipEdges, partitionBoxes, sharedEdges, type Room } from './rooms.js';
import { at, boxAt, hollowBoxes, libraryWallOn, paneMatrix, prism, UNIT_BOX, UNIT_TRIANGLE, wallAlong } from './shapes.js';

const CHAPTER = 'roche-south-1990' as const;
const YEAR = '1990';
const SLAB = 0.6;
const BASE_Y = GROUND_FLOOR_Y - SLAB;
const FOOTING_Y = BASE_Y - 1.0;

const X0 = -88.1;
const X1 = -49.7;
const Z_WEST = -138.2;
/** The line shared with the McKim, Mead & White south link, whose park wall closes the court's east end: as far east of Weston's door as Z_IN is west of it (frame.ts, work unit 22). */
const Z_EAST = KRAVIS_EAST_Z;
const Z_IN = Z_WEST + OUTER_WALL;

/** The court: from its limestone south wall to the 1888 front (map gallery 548; the map's edge at X −51.24 is the old front's line). */
export const COURT_X0 = -61.45;
/** The court's limestone south wall's thickness, south from COURT_X0 (the McKim, Mead & White party wall's passage into gallery 549 keeps clear of it). */
export const COURT_WALL = 0.8;
/**
 * D: the court's glass roof rests on the 1888 front: both Petrie Court photographs (interior-images.md #33 and #35: Benoist 2012 and Haklai 2012) show its
 * north eave on a dark gutter laid on the old front's coping and its south eave level with it on the limestone wall, the ridge in the middle (orthophoto
 * X −56.2). The gutter is 0.45 m deep (E), so the eaves sit at the Kravis roof's level.
 */
const GUTTER = 0.45;
export const PETRIE_EAVE_Y = CORE_COPING_TOP_Y + GUTTER;
/** The 1888 front's base course stands 0.14 m proud at the main floor (core); the court's floor stops at it, so nothing of the court touches the old front's trim. Under Weston's end blocks the floor and its slab run on into their ground storeys and podiums (core/weston-ends.ts), separate closed pieces whose faces there lie inside one another or behind the court's end walls. */
const OLD_FRONT_CLEAR = 0.15;
/** The court's floor finish, laid on the slab so its top is the main floor (MAIN_FLOOR_Y), the level of the 1888 door sill and porch. */
const FINISH = 0.03;
const RIDGE_Z0 = -128.0;
const RIDGE_Z1 = -85.0;
/** E: roof over the galleries south of the court, level with the court's eaves (18.6); the map's floor 4 (plant and offices) stands on part of it. */
export const KRAVIS_ROOF_Y = PETRIE_EAVE_Y;
/** The parapet over the galleries (frame.ts KRAVIS_PARAPET_Y, shared with the McKim, Mead & White wall raised against it). */
const PARAPET_Y = KRAVIS_PARAPET_Y;
/** The map's floor 4 (plant), kept east of the glazed strips the orthophoto shows over the west end. */
const PENTHOUSE: readonly [number, number, number, number] = [-87.9, -121.6, -62.4, -104.3];
/** Orthophoto: two glazed strips over the west end of the galleries (Z −134.6..−128.2 and −127.4..−122.4, X −87.6..−62.6), each built 5 m wide. */
const WEST_LIGHTS: readonly (readonly [number, number, number, number])[] = [
  [-87.6, -134.6, -63.0, -129.6],
  [-87.6, -127.4, -63.0, -122.4],
];
/** Orthophoto: small plant units on the flat roof east of the plant floor. */
const UNITS: readonly (readonly [number, number])[] = [
  [-84.0, -98.0],
  [-79.0, -98.0],
  [-74.0, -98.0],
  [-69.0, -98.0],
  [-84.0, -90.0],
  [-74.0, -90.0],
  [-69.0, -90.0],
  [-84.0, -82.0],
  [-79.0, -82.0],
  [-69.0, -82.0],
  [-79.0, -75.0],
  [-69.0, -75.0],
];
const PENTHOUSE_TOP_Y = KRAVIS_ROOF_Y + 4.2;

/** The court's glass roof: a hipped ridge over its middle and flat glazing over its two ends. */
const COURT_SPAN = X1 - 0.2 - COURT_X0;
const COURT_RIDGE = hippedSkylight({ width: COURT_SPAN, length: RIDGE_Z1 - RIDGE_Z0, pitch: 25, curbHeight: 0.3, bays: 18, bar: 0.08, barDepth: 0.14 });
const END_WEST = laylight({ width: COURT_SPAN, length: RIDGE_Z0 - Z_IN, cols: 6, rows: 5, frameWidth: 0.1, frameDepth: 0.14 });
const WEST_LIGHT = ridgeSkylight({ width: 5.0, length: 24.6, pitch: 25, curbHeight: 0.4, bays: 12, bar: 0.07, barDepth: 0.12 });
const END_EAST = laylight({ width: COURT_SPAN, length: Z_EAST - RIDGE_Z1, cols: 6, rows: Math.round((Z_EAST - RIDGE_Z1) / 2.0), frameWidth: 0.1, frameDepth: 0.14 });

function structure(kit: Kit): void {
  kit.add(UNIT_BOX, mat.concrete, wallAlong([X0, Z_WEST], [X1, Z_WEST], FOOTING_Y, BASE_Y, 2.0), 0);
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X0, BASE_Y, Z_IN], [X1, GROUND_FLOOR_Y, Z_EAST]), 1);
  // The main floor: the galleries' plate, and under the court a plate one finish lower, stopping at the old front's base course.
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X0, MAIN_FLOOR_Y - SLAB, Z_IN], [COURT_X0, MAIN_FLOOR_Y, Z_EAST]), 2);
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([COURT_X0, MAIN_FLOOR_Y - SLAB, Z_IN], [X1 - OLD_FRONT_CLEAR, MAIN_FLOOR_Y - FINISH, Z_EAST]), 2);
  // The second floor covers the galleries south of the court; the court rises open to its roof (map Floor 2 vista).
  kit.add(UNIT_BOX, palette.wood, boxAt([X0, ROCHE_SECOND_FLOOR_Y - SLAB, Z_IN], [COURT_X0 - COURT_WALL, ROCHE_SECOND_FLOOR_Y, Z_EAST]), 3);
}

/** The park face: stone over the galleries with a band of windows for the café, open full height at the court's west end. */
const PARK_FACE_WIDTH = COURT_X0 - X0;
const PARK_FACE = wall({
  width: PARK_FACE_WIDTH,
  height: PARAPET_Y - BASE_Y,
  thickness: OUTER_WALL,
  openings: [{ x: 0, y: MAIN_FLOOR_Y + 0.6 - BASE_Y, width: PARK_FACE_WIDTH - 5.0, height: 5.4 }],
});

function parkFace(kit: Kit): void {
  // Library walls run a→b with their front to the left: west of the face is the park, so run it from north to south.
  kit.add(PARK_FACE, palette.limestone, libraryWallOn([COURT_X0, Z_WEST], [X0, Z_WEST], BASE_Y), 0);
  kit.add(UNIT_BOX, palette.limestone, wallAlong([X0, Z_WEST - 0.15], [COURT_X0, Z_WEST - 0.15], PARAPET_Y, PARAPET_Y + 0.3, OUTER_WALL + 0.15), 0);
  // Stone piers framing the court's glass end, and its base up to the main floor.
  kit.add(UNIT_BOX, palette.limestone, wallAlong([COURT_X0, Z_WEST], [COURT_X0 + 1.2, Z_WEST], BASE_Y, PETRIE_EAVE_Y + 1.0, OUTER_WALL), 1);
  kit.add(UNIT_BOX, palette.limestone, wallAlong([X1 - 1.0, Z_WEST], [X1, Z_WEST], BASE_Y, PETRIE_EAVE_Y + 1.0, OUTER_WALL), 1);
  kit.add(UNIT_BOX, palette.limestone, wallAlong([COURT_X0 + 1.2, Z_WEST], [X1 - 1.0, Z_WEST], BASE_Y, MAIN_FLOOR_Y, OUTER_WALL), 1);
}

/** The court's two ends, west and east: symmetric about Weston's door (work unit 22; core/core.test.ts). */
export const COURT_ENDS_Z: readonly [number, number] = [Z_IN, Z_EAST];

/**
 * D: the floor map's eight doors from gallery 549 into the court, on X −61.44 (research/cache/lm_features.json, Floor 1; interior.md, The court's south
 * wall; work unit 24), world Z spans, west to east, and in each of the three wide ones the centre (the map's own centroid) of the round column the map
 * draws in its middle, 0.71 m across (work unit 25). The first seven stand in pairs about Weston's door, each pair's middles' mean within 1 cm of its
 * axis and the fourth door's middle 4.5 cm east of it; the eighth, at the court's east end, pairs with the café's opening (CAFE_OPENING).
 */
const COURT_DOOR_SPANS: readonly (readonly [number, number, number | null])[] = [
  [-125.56, -120.97, -123.27],
  [-115.4, -113.11, null],
  [-108.87, -106.58, null],
  [-102.11, -99.74, null],
  [-95.34, -93.05, null],
  [-88.84, -86.52, null],
  [-80.95, -76.38, -78.66],
  [-74.63, -70.07, -72.34],
];
/**
 * A doorway through the court wall at the main floor: its name, its world Z span, west to east, whether its head is a round arch (else square), and the
 * world Z of the round column in its middle, if it has one.
 */
export interface CourtDoor {
  readonly name: string;
  readonly z0: number;
  readonly z1: number;
  readonly arched: boolean;
  readonly column: number | null;
}
/**
 * The court's doors, at the map's spans, the narrow ones round-arched and the wide ones square-headed, as the Petrie Court photograph taken from the
 * balcony at the court's east end shows them (interior-images.md #35): its five round arches stand where the map has the second to the sixth doors (one
 * perspective map fits their middles in a 900 px copy to those doors' within 0.5 px, to the third to the seventh's only within 8 px), the seventh door, nearest, is square-headed between
 * pilasters under an entablature, and past the fifth arch there is none, so the first door, the seventh's mirror about Weston's door, is not arched
 * either. The eighth, out of that photograph's view, is square-headed like the seventh, as the photograph of the court's east end shows them both
 * (interior-images.md #47). The wide doors' columns stand as the photographs of the court's two ends show them, a round column between square piers
 * (interior-images.md #47, #48 and #49; work unit 25).
 */
export const COURT_DOORS: readonly CourtDoor[] = COURT_DOOR_SPANS.map(([z0, z1, column], k) => ({ name: `door ${String(k + 1)}`, z0, z1, arched: z1 - z0 < 3, column }));
/**
 * The café's opening onto the court (work unit 25, on the owner's choice of 2026-11-06): the eighth door mirrored about the axis of the map's paired
 * doors (−100.965), as the photographs of the court's west end show it (interior-images.md #48 and #49): a square pier 1.74 m wide west of the first
 * door, the opening, split by the round column the map draws at −129.59 (D) and square-headed like the seventh and eighth doors, then a square pier and
 * solid wall to the court's west end. The map draws the whole stretch from −126.34 to the west end open, as a threshold, with that column alone in it;
 * the photographs show the pier and the wall it leaves out (interior.md, The court's south wall).
 */
export const CAFE_OPENING: CourtDoor = { name: 'the café', z0: -131.86, z1: -127.3, arched: false, column: -129.59 };
/** Every doorway through the court wall at the main floor, west to east: the café's opening, then the map's eight doors. */
export const COURT_DOORWAYS: readonly CourtDoor[] = [CAFE_OPENING, ...COURT_DOORS];
/** E: the arches spring 4.25 m over the court's floor, so their crowns stand at 5.4 m, the old openings' head. */
const DOOR_SPRING = 4.25;
/** E: the square-headed doors as tall as the arches. */
const SQUARE_DOOR_HEIGHT = 5.4;
/**
 * A wide doorway's column: Tuscan, as the photographs show them (interior-images.md #47, #48 and #49), a plain round shaft on a moulded base under a square
 * abacus, as the library's Doric column draws it unfluted on its Attic base; 0.71 m across, as the map draws them (D), its abacus at the doorway's
 * square head. E: the base and the capital in the library's proportions.
 */
const COURT_COLUMN = column({ order: 'doric', diameter: 0.71, height: SQUARE_DOOR_HEIGHT, fluted: false });
/** The columns' world X: the middle of the model's wall. The map draws them centred on its line of the wall, X −61.44, which the model takes as the wall's court face (COURT_X0), so each stands under the wall's head between the doorway's jambs, as the photographs show them. */
const COURT_COLUMN_X = COURT_X0 - COURT_WALL / 2;
/** A column in one of the court wall's doorways: the doorway's name, its world plan centre and its half-width in plan, the base's plinth's (the column's widest). */
export interface CourtColumn {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly half: number;
}
/** The court wall's columns, west to east. */
export function courtColumns(): CourtColumn[] {
  COURT_COLUMN.computeBoundingBox();
  const box = COURT_COLUMN.boundingBox;
  const half = box === null ? 0 : Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z);
  return COURT_DOORWAYS.flatMap(({ name, column: z }): CourtColumn[] => (z === null ? [] : [{ name, x: COURT_COLUMN_X, z, half }]));
}
/**
 * A window over each arched door, the sill 0.9 m over the second floor: #35 shows the upper storey with a tall narrow window centred over each arch, about
 * half its width, recessed blind panels between them and a blind panel over the square-headed doors. E: its size, which #35, scaled from an arch's crown,
 * gives within about half a metre.
 */
const COURT_WINDOW = { width: 1.2, height: 3.0, sill: ROCHE_SECOND_FLOOR_Y - MAIN_FLOOR_Y + 0.9 } as const;
/** A clear opening through the court's south wall: its world Z span, west to east, and over the court's floor its sill, springing and crown (a square head springs at its crown). */
export interface CourtOpening {
  readonly name: string;
  readonly z0: number;
  readonly z1: number;
  readonly sill: number;
  readonly spring: number;
  readonly crown: number;
}
/** The court wall's openings, as the wall cuts them: its doorways, west to east, then the windows over the arched ones. */
export function courtOpenings(): CourtOpening[] {
  const doors = COURT_DOORWAYS.map(({ name, z0, z1, arched }): CourtOpening => {
    const spring = arched ? DOOR_SPRING : SQUARE_DOOR_HEIGHT;
    return { name, z0, z1, sill: 0, spring, crown: arched ? spring + (z1 - z0) / 2 : spring };
  });
  const top = COURT_WINDOW.sill + COURT_WINDOW.height;
  const windows = COURT_DOORWAYS.flatMap(({ name, z0, z1, arched }): CourtOpening[] => {
    const mid = (z0 + z1) / 2;
    return arched ? [{ name: `window over ${name}`, z0: mid - COURT_WINDOW.width / 2, z1: mid + COURT_WINDOW.width / 2, sill: COURT_WINDOW.sill, spring: top, crown: top }] : [];
  });
  return [...doors, ...windows];
}
/** A world Z on the court wall as the wall's own x: it runs east to west (court() below), its middle at the court's. */
const alongWall = (z: number): number => (Z_EAST + Z_IN) / 2 - z;
/** The court's limestone south wall: the doorways into the galleries and the café at the main floor and the windows from the second floor. */
const COURT_SOUTH = wall({
  width: Z_EAST - Z_IN,
  height: PETRIE_EAVE_Y - MAIN_FLOOR_Y,
  thickness: COURT_WALL,
  openings: courtOpenings().map(({ z0, z1, sill, spring, crown }): Opening => ({ shape: crown > spring ? 'arch' : 'rect', x: alongWall((z0 + z1) / 2), y: sill, width: z1 - z0, height: crown - sill })),
});

function court(kit: Kit): void {
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([COURT_X0, MAIN_FLOOR_Y - FINISH, Z_IN], [X1 - OLD_FRONT_CLEAR, MAIN_FLOOR_Y, Z_EAST]), 0);
  // The wall's front faces the court (north): run it from east to west.
  kit.add(COURT_SOUTH, palette.limestone, libraryWallOn([COURT_X0, Z_EAST], [COURT_X0, Z_IN], MAIN_FLOOR_Y), 1);
  // The round columns in the middle of the wide doorways, on the court's floor under the wall's head.
  for (const { x, z } of courtColumns()) kit.add(COURT_COLUMN, palette.limestone, at(x, MAIN_FLOOR_Y, z), 1);
  kit.add(UNIT_BOX, palette.limestone, boxAt([COURT_X0 - COURT_WALL, PETRIE_EAVE_Y - 0.6, Z_IN], [COURT_X0 + 0.25, PETRIE_EAVE_Y, Z_EAST]), 2);
}

/** Main-floor galleries 549–556, the café and the second floor's galleries (map, rectangular rooms). */
const MAIN_ROOMS: readonly Room[] = [
  [-88.13, -137.08, -61.44, -126.34],
  [-88.13, -126.34, -82.28, -111.84],
  [-88.13, -95.73, -75.04, -74.95],
  [-82.29, -126.35, -75.03, -111.84],
  [-75.04, -106.19, -66.14, -95.73],
  [-75.04, -95.74, -66.14, -74.96],
  [-75.03, -126.35, -66.14, -106.18],
];
const UPPER_ROOMS: readonly Room[] = [
  [-88.13, -137.09, -62.59, -75.53],
  [-88.12, -74.38, -62.59, Z_EAST],
];

function galleries(kit: Kit): void {
  const box: Room = [X0, Z_IN, COURT_X0 - COURT_WALL, Z_EAST];
  clipEdges(sharedEdges(MAIN_ROOMS), box).forEach((edge, k) => {
    for (const m of partitionBoxes(edge, { y0: MAIN_FLOOR_Y, y1: ROCHE_SECOND_FLOOR_Y - SLAB, openingHeight: 4.0 })) kit.add(UNIT_BOX, palette.plaster, m, k);
  });
  clipEdges(sharedEdges(UPPER_ROOMS, 1.5, 1.4), box).forEach((edge, k) => {
    for (const m of partitionBoxes(edge, { y0: ROCHE_SECOND_FLOOR_Y, y1: KRAVIS_ROOF_Y - SLAB, openingHeight: 3.6 })) kit.add(UNIT_BOX, palette.plaster, m, 50 + k);
  });
}

function roof(kit: Kit): void {
  const outline: P2[] = [
    [X0, Z_IN],
    [COURT_X0 - COURT_WALL, Z_IN],
    [COURT_X0 - COURT_WALL, Z_EAST],
    [X0, Z_EAST],
  ];
  const holes = WEST_LIGHTS.map(([x0, z0, x1, z1]): P2[] => [
    [x0 + 0.2, z0 + 0.2],
    [x1 - 0.2, z0 + 0.2],
    [x1 - 0.2, z1 - 0.2],
    [x0 + 0.2, z1 - 0.2],
  ]);
  kit.add(prism(outline, holes, KRAVIS_ROOF_Y - SLAB, KRAVIS_ROOF_Y), mat.roof, at(0, 0, 0), 0);
  for (const [x, z] of UNITS) kit.add(UNIT_BOX, palette.metalDark, boxAt([x - 0.8, KRAVIS_ROOF_Y, z - 0.8], [x + 0.8, KRAVIS_ROOF_Y + 1.2, z + 0.8]), 3);
  const [px0, pz0, px1, pz1] = PENTHOUSE;
  for (const m of hollowBoxes([px0, KRAVIS_ROOF_Y, pz0], [px1, PENTHOUSE_TOP_Y, pz1], 0.6)) kit.add(UNIT_BOX, palette.limestone, m, 1);
  // The gutter laid on the old front's coping that carries the court roof's north eave, reaching 0.6 m over the court and onto the coping; past the
  // core's east face, where the old front's east block stands before the Hunt Wing's south wall and its coping stops at the front's face, up to that wall.
  kit.add(UNIT_BOX, palette.metalDark, boxAt([X1 - 0.6, CORE_COPING_TOP_Y, Z_IN], [X1 + 0.28, PETRIE_EAVE_Y, EAST_FACE_Z_CORE]), 2);
  kit.add(UNIT_BOX, palette.metalDark, boxAt([X1 - 0.6, CORE_COPING_TOP_Y, EAST_FACE_Z_CORE], [X1, PETRIE_EAVE_Y, Z_EAST]), 2);
}

function courtGlass(kit: Kit): void {
  const cx = (COURT_X0 + X1 - 0.2) / 2;
  kit.add(COURT_RIDGE.frame, mat.steel, at(cx, PETRIE_EAVE_Y, (RIDGE_Z0 + RIDGE_Z1) / 2), 1);
  kit.add(COURT_RIDGE.glass, mat.glass, at(cx, PETRIE_EAVE_Y, (RIDGE_Z0 + RIDGE_Z1) / 2), 1);
  // Flat glazing over the two ends of the court, at the eaves.
  const west = at(cx, PETRIE_EAVE_Y, (Z_IN + RIDGE_Z0) / 2);
  const east = at(cx, PETRIE_EAVE_Y, (RIDGE_Z1 + Z_EAST) / 2);
  kit.add(END_WEST.frame, mat.steel, west, 0);
  kit.add(END_WEST.glass, mat.glass, west, 0);
  kit.add(END_EAST.frame, mat.steel, east, 2);
  kit.add(END_EAST.glass, mat.glass, east, 2);
  // The court's glass end to the park, between the stone piers, and the café's window band.
  const z = Z_WEST + 0.35;
  const glassEnd = (x0: number, x1: number, y0: number, y1: number, cols: number, order: number): void => {
    for (let i = 0; i <= cols; i++) {
      const x = x0 + ((x1 - x0) * i) / cols;
      kit.add(UNIT_BOX, mat.steel, boxAt([x - 0.05, y0, z - 0.12], [x + 0.05, y1, z + 0.12]), order);
    }
    for (const y of [y0, (y0 + y1) / 2, y1]) kit.add(UNIT_BOX, mat.steel, boxAt([x0, y - 0.05, z - 0.12], [x1, y + 0.05, z + 0.12]), order);
    kit.add(UNIT_TRIANGLE, mat.glass, paneMatrix([x0, y0, z], [x1, y0, z], [x1, y1, z]), order);
    kit.add(UNIT_TRIANGLE, mat.glass, paneMatrix([x0, y0, z], [x1, y1, z], [x0, y1, z]), order);
  };
  glassEnd(COURT_X0 + 1.2, X1 - 1.0, MAIN_FLOOR_Y, PETRIE_EAVE_Y, 6, 3);
  // The two glazed strips over the west end of the galleries, with diffusing laylights under them.
  WEST_LIGHTS.forEach(([x0, z0, x1, z1], k) => {
    const m = at((x0 + x1) / 2, KRAVIS_ROOF_Y, (z0 + z1) / 2).multiply(new Matrix4().makeRotationY(Math.PI / 2));
    kit.add(WEST_LIGHT.frame, mat.steel, m, 5 + k);
    kit.add(WEST_LIGHT.glass, mat.glass, m, 5 + k);
    kit.add(UNIT_BOX, mat.laylight, boxAt([x0 + 0.2, KRAVIS_ROOF_Y - SLAB - 0.08, z0 + 0.2], [x1 - 0.2, KRAVIS_ROOF_Y - SLAB, z1 - 0.2]), 5 + k);
  });
  glassEnd(X0 + 2.5, COURT_X0 - 2.5, MAIN_FLOOR_Y + 0.6, MAIN_FLOOR_Y + 6.0, 10, 4);
}


export const kravisSteps: readonly StepDef[] = [
  { id: 'kravis-structure', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing floors', detail: 'Footings and floor plates of the wing that fills the corner between the Rockefeller and Wallace wings and the 1888 south wing.', motion: { kind: 'rise' }, stagger: 'order', build: structure },
  { id: 'kravis-park-face', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing face to the park', detail: 'The limestone face on the park, open at the café and full height at the west end of the sculpture court.', motion: { kind: 'grow' }, stagger: 'order', build: parkFace },
  { id: 'petrie-court', chapter: CHAPTER, year: YEAR, title: 'The Petrie European Sculpture Court', detail: 'A court 12 m wide and 72 m long whose north wall is Weston’s 1888 brick and stone facade, with a limestone wall opposite, eight doors through it from the galleries and one onto the café.', motion: { kind: 'grow' }, stagger: 'order', build: court },
  { id: 'kravis-galleries', chapter: CHAPTER, year: YEAR, title: 'European sculpture galleries', detail: 'Gallery walls of the European sculpture and decorative arts rooms and the Petrie Court Café, with exhibition galleries above.', motion: { kind: 'grow' }, stagger: 'order', build: galleries },
  { id: 'kravis-roof', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing roofs', detail: 'Roofs over the galleries, a plant floor on top, and the steel beam along the old facade for the court’s glass roof.', motion: { kind: 'drop' }, stagger: 'order', build: roof },
  { id: 'petrie-glass', chapter: CHAPTER, year: YEAR, title: 'Glass roof over the sculpture court', detail: 'A long glass roof with a central ridge over the court, flatter glazing at its ends, and a glass wall at its west end facing the park.', motion: { kind: 'drop' }, stagger: 'order', build: courtGlass },
];
