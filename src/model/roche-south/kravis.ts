/**
 * The Henry R. Kravis Wing and the Carroll and Milton Petrie European Sculpture Court (KRJDA, 1990), last wing of chapter `roche-south-1990`.
 * Sources: history.md section 8; interior.md, "Other skylit volumes" (the court, map gallery 548, X −61.44 to −51.24) and the Petrie Court photograph
 * (interior-images.md, item 33): Weston's 1888 brick-and-stone south facade, built by the core area on X −49.7, is the court's north wall; the
 * court's south wall is limestone; a long glass roof with a central ridge spans the court (orthophoto: ridge at X −56.2, hipped ends near Z −128 and
 * −85, flatter glazing beyond them). Every line of this block but the park face Z −138.2 belongs to an older block, which builds the wall there.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y } from '../frame.js';
import { hippedSkylight, laylight, wall } from '../lib/index.js';
import { palette } from '../palette.js';
import { OUTER_WALL, ROCHE_SECOND_FLOOR_Y } from './blocks.js';
import { mat } from './materials.js';
import type { P2 } from './poly.js';
import { clipEdges, partitionBoxes, sharedEdges, type Room } from './rooms.js';
import { at, boxAt, libraryWallOn, paneMatrix, prism, UNIT_BOX, UNIT_TRIANGLE, wallAlong } from './shapes.js';

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
const COURT_WALL = 0.8;
/** E: the court's glass roof, its eaves on the south wall and on a beam along the old front, its ridge in the middle (orthophoto X −56.2). */
export const PETRIE_EAVE_Y = 20.6;
const RIDGE_Z0 = -128.0;
const RIDGE_Z1 = -85.0;
/** E: roof over the galleries south of the court; the map's floor 4 (plant and offices) stands on part of it. */
export const KRAVIS_ROOF_Y = 18.6;
const PARAPET_Y = KRAVIS_ROOF_Y + 1.0;
const PENTHOUSE: readonly [number, number, number, number] = [-87.9, -132.3, -62.4, -104.3];
const PENTHOUSE_TOP_Y = KRAVIS_ROOF_Y + 4.2;

/** The court's glass roof: a hipped ridge over its middle and flat glazing over its two ends. */
const COURT_SPAN = X1 - 0.2 - COURT_X0;
const COURT_RIDGE = hippedSkylight({ width: COURT_SPAN, length: RIDGE_Z1 - RIDGE_Z0, pitch: 25, curbHeight: 0.3, bays: 18, bar: 0.08, barDepth: 0.14 });
const END_WEST = laylight({ width: COURT_SPAN, length: RIDGE_Z0 - Z_IN, cols: 6, rows: 5, frameWidth: 0.1, frameDepth: 0.14 });
const END_EAST = laylight({ width: COURT_SPAN, length: Z_EAST - RIDGE_Z1, cols: 6, rows: 8, frameWidth: 0.1, frameDepth: 0.14 });

function structure(kit: Kit): void {
  kit.add(UNIT_BOX, mat.concrete, wallAlong([X0, Z_WEST], [X1, Z_WEST], FOOTING_Y, BASE_Y, 2.0), 0);
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X0, BASE_Y, Z_IN], [X1, GROUND_FLOOR_Y, Z_EAST]), 1);
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X0, MAIN_FLOOR_Y - SLAB, Z_IN], [X1, MAIN_FLOOR_Y, Z_EAST]), 2);
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
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([COURT_X0, MAIN_FLOOR_Y, Z_IN], [X1, MAIN_FLOOR_Y + 0.03, Z_EAST]), 0);
  // The wall's front faces the court (north): run it from east to west.
  kit.add(COURT_SOUTH, palette.limestone, libraryWallOn([COURT_X0, Z_EAST], [COURT_X0, Z_IN], MAIN_FLOOR_Y), 1);
  kit.add(UNIT_BOX, palette.limestone, boxAt([COURT_X0 - COURT_WALL - 0.1, PETRIE_EAVE_Y - 0.6, Z_IN], [COURT_X0 + 0.25, PETRIE_EAVE_Y, Z_EAST]), 2);
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
  kit.add(UNIT_BOX, mat.roof, boxAt([X0, KRAVIS_ROOF_Y - SLAB, Z_IN], [COURT_X0 - COURT_WALL, KRAVIS_ROOF_Y, Z_EAST]), 0);
  const [px0, pz0, px1, pz1] = PENTHOUSE;
  const outline: P2[] = [
    [px0, pz0],
    [px1, pz0],
    [px1, pz1],
    [px0, pz1],
  ];
  kit.add(prism(outline, [], KRAVIS_ROOF_Y, PENTHOUSE_TOP_Y), palette.limestone, at(0, 0, 0), 1);
  // The beam along the old front that carries the court roof's north eave.
  kit.add(UNIT_BOX, mat.steel, boxAt([X1 - 0.6, PETRIE_EAVE_Y - 0.7, Z_IN], [X1 - 0.1, PETRIE_EAVE_Y, Z_EAST]), 2);
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
