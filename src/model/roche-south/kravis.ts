/**
 * The Henry R. Kravis Wing and the Carroll and Milton Petrie European Sculpture Court (KRJDA, 1990), last wing of chapter `roche-south-1990`.
 * Sources: history.md section 8; interior.md, "Other skylit volumes" (the court, map gallery 548, X −61.44 to −51.24) and the Petrie Court photograph
 * (interior-images.md, item 33): Weston's 1888 brick-and-stone south facade, built by the core area on X −49.7, is the court's north wall; the
 * court's south wall is limestone; a long glass roof with a central ridge spans the court (orthophoto: ridge at X −56.2, hipped ends near Z −128 and
 * −85, flatter glazing beyond them). Every line of this block but the park face Z −138.2 belongs to an older block, which builds the wall there.
 */
import { Matrix4 } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { CORE_COPING_TOP_Y, GROUND_FLOOR_Y, KRAVIS_PARAPET_Y, MAIN_FLOOR_Y } from '../frame.js';
import { hippedSkylight, laylight, ridgeSkylight, wall } from '../lib/index.js';
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
const Z_EAST = -69.0;
const Z_IN = Z_WEST + OUTER_WALL;

/** The court: from its limestone south wall to the 1888 front (map gallery 548; the map's edge at X −51.24 is the old front's line). */
export const COURT_X0 = -61.45;
/** The court's limestone south wall's thickness, south from COURT_X0 (the McKim, Mead & White party wall's passage into gallery 549 keeps clear of it). */
export const COURT_WALL = 0.8;
/**
 * D: the court's glass roof rests on the 1888 front: both Petrie Court photographs (interior-images.md #33, Benoist 2012, and #35, Haklai 2012) show its
 * north eave on a dark gutter laid on the old front's coping and its south eave level with it on the limestone wall, the ridge in the middle (orthophoto
 * X −56.2). The gutter is 0.45 m deep (E), so the eaves sit at the Kravis roof's level.
 */
const GUTTER = 0.45;
export const PETRIE_EAVE_Y = CORE_COPING_TOP_Y + GUTTER;
/** The 1888 front's base course stands 0.14 m proud at the main floor (core); the court's floor stops at it, so nothing of the court touches the old front's trim. */
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
const END_EAST = laylight({ width: COURT_SPAN, length: Z_EAST - RIDGE_Z1, cols: 6, rows: 8, frameWidth: 0.1, frameDepth: 0.14 });

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

/** The court's limestone south wall: tall openings into the galleries at the main floor and windows from the second floor. */
const COURT_SOUTH = wall({
  width: Z_EAST - Z_IN,
  height: PETRIE_EAVE_Y - MAIN_FLOOR_Y,
  thickness: COURT_WALL,
  openings: [
    ...[-27.5, -16.5, -5.5, 5.5, 16.5, 27.5].map((x) => ({ x, y: 0, width: 3.6, height: 5.4 })),
    ...[-27.5, -16.5, -5.5, 5.5, 16.5, 27.5].map((x) => ({ x, y: ROCHE_SECOND_FLOOR_Y - MAIN_FLOOR_Y + 0.9, width: 2.4, height: 2.6 })),
  ],
});

function court(kit: Kit): void {
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([COURT_X0, MAIN_FLOOR_Y - FINISH, Z_IN], [X1 - OLD_FRONT_CLEAR, MAIN_FLOOR_Y, Z_EAST]), 0);
  // The wall's front faces the court (north): run it from east to west.
  kit.add(COURT_SOUTH, palette.limestone, libraryWallOn([COURT_X0, Z_EAST], [COURT_X0, Z_IN], MAIN_FLOOR_Y), 1);
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
  [-88.12, -74.38, -62.59, -69.0],
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
  // The gutter laid on the old front's coping that carries the court roof's north eave, reaching 0.6 m over the court and onto the coping.
  kit.add(UNIT_BOX, palette.metalDark, boxAt([X1 - 0.6, CORE_COPING_TOP_Y, Z_IN], [X1 + 0.28, PETRIE_EAVE_Y, Z_EAST]), 2);
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

const FOCUS_WING = { kind: 'box', min: [-89, -4, -139], max: [-49, 24, -68] } as const;

export const kravisSteps: readonly StepDef[] = [
  { id: 'kravis-structure', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing floors', detail: 'Footings and floor plates of the wing that fills the corner between the Rockefeller and Wallace wings and the 1888 south wing.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_WING, build: structure },
  { id: 'kravis-park-face', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing face to the park', detail: 'The limestone face on the park, open at the café and full height at the west end of the sculpture court.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: parkFace },
  { id: 'petrie-court', chapter: CHAPTER, year: YEAR, title: 'The Petrie European Sculpture Court', detail: 'A court 12 m wide and 69 m long whose north wall is Weston’s 1888 brick and stone facade, with a limestone wall opposite.', motion: { kind: 'grow' }, stagger: 'order', focus: { kind: 'view', position: [-70, 30, -150], target: [-56, 6, -100] }, build: court },
  { id: 'kravis-galleries', chapter: CHAPTER, year: YEAR, title: 'European sculpture galleries', detail: 'Gallery walls of the European sculpture and decorative arts rooms and the Petrie Court Café, with exhibition galleries above.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: galleries },
  { id: 'kravis-roof', chapter: CHAPTER, year: YEAR, title: 'Kravis Wing roofs', detail: 'Roofs over the galleries, a plant floor on top, and the steel beam along the old facade for the court’s glass roof.', motion: { kind: 'drop' }, stagger: 'order', focus: FOCUS_WING, build: roof },
  { id: 'petrie-glass', chapter: CHAPTER, year: YEAR, title: 'Glass roof over the sculpture court', detail: 'A long glass roof with a central ridge over the court, flatter glazing at its ends, and a glass wall at its west end facing the park.', motion: { kind: 'drop' }, stagger: 'order', weight: 1.5, focus: { kind: 'view', position: [-82, 42, -150], target: [-56, 16, -103] }, build: courtGlass },
];
