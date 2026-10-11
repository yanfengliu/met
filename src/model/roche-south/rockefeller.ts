/**
 * The Michael C. Rockefeller Wing (KRJDA, 1982), first wing of chapter `roche-south-1990`.
 * Sources: docs/research/history.md section 8 (steps), exterior.md [K5] (the sloping south glass wall, src/model/frame.ts ROCKEFELLER_*) and [R3]
 * (ridge skylights); plan from the Met floor map (galleries 341–363 on the main floor, 800–830 on the second, blocks.ts MAP_Z).
 * Ridge skylights: counted on the 2018 orthophoto (exterior-images.md, primary 9): eleven ridges along X at a 5.47 m pitch, valleys at Z −96.0
 * to −41.2, the eleventh straddling the block line Z −38.5 (the roof runs on to about Z −35.5 inside the mmw-south-k block); ten are built here.
 * Walls: the wing builds its west wall on Z −97.2 (the Wallace Wing came later) and its north wall on X −88.1 south of Z −69 (the Kravis Wing came
 * later); the McKim, Mead & White blocks build the lines Z −38.5 and X −88.1 north of Z −69.
 */
import { Matrix4 } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y, ROCKEFELLER_GLASS_FACE_X, ROCKEFELLER_GLASS_RISE, ROCKEFELLER_GLASS_RUN, ROCKEFELLER_GLASS_SLOPE_DEG } from '../frame.js';
import { hippedSkylight, laylight } from '../lib/index.js';
import { palette } from '../palette.js';
import { OUTER_WALL, ROCHE_SECOND_FLOOR_Y } from './blocks.js';
import { mat } from './materials.js';
import type { P2 } from './poly.js';
import { clipEdges, partitionBoxes, sharedEdges, type Room } from './rooms.js';
import { at, bar, boxAt, paneMatrix, prism, UNIT_BOX, UNIT_TRIANGLE, wallAlong } from './shapes.js';

const CHAPTER = 'roche-south-1990' as const;
const YEAR = '1982';

/** E: foot of the glass wall, on its stone base just under the main floor (photo ref-park-south: a white base course under the glass). */
export const RF_GLASS_FOOT_Y = MAIN_FLOOR_Y - 0.5;
export const RF_GLASS_TOP_Y = RF_GLASS_FOOT_Y + ROCKEFELLER_GLASS_RISE;
export const RF_GLASS_TOP_X = ROCKEFELLER_GLASS_FACE_X + ROCKEFELLER_GLASS_RUN;
/** E: roof deck top over the second-floor galleries, a little under the glass wall's top edge. */
export const RF_ROOF_Y = RF_GLASS_TOP_Y - 1.1;
const DECK = 0.6;
const SLAB = 0.6;
const PARAPET_Y = RF_GLASS_TOP_Y + 0.2;
const FOOTING_Y = GROUND_FLOOR_Y - SLAB - 1.0;

const X0 = -151.6;
const X1 = -88.1;
const Z_WEST = -97.2;
const Z_EAST = -38.5;
const Z_IN = Z_WEST + OUTER_WALL;
const X_IN = X0 + OUTER_WALL;
/** Where the Kravis Wing meets the north wall (south of it the wall is this wing's). */
const Z_KRAVIS = -69.0;

/** Ridge skylights: valleys from the orthophoto, the west hips just behind the glass wall's fascia, the east ends short of the north wall. */
const RIDGE_PITCH = 5.47;
const FIRST_VALLEY = -96.0;
export const RIDGES = 10;
const RIDGE_WIDTH = RIDGE_PITCH - 0.4;
const RIDGE_X0 = RF_GLASS_TOP_X + 0.9;
const RIDGE_X1 = -93.1;
const RIDGE = hippedSkylight({ width: RIDGE_WIDTH, length: RIDGE_X1 - RIDGE_X0, pitch: 35, curbHeight: 0.4, bays: 24, bar: 0.07, barDepth: 0.12 });
/** The laylight ceiling under each ridge (the galleries' diffusing ceiling; interior.md, Second-floor European Paintings galleries). */
const LAYLIGHT = laylight({ width: RIDGE_WIDTH - 0.6, length: RIDGE_X1 - RIDGE_X0 - 0.8, cols: 3, rows: 24 });

function ridgeCentreZ(k: number): number {
  return FIRST_VALLEY + RIDGE_PITCH * (k + 0.5);
}

/** The glass wall's grid: eight panels up the slope (2025 rebuild: eight panels high) and 1.09 m bays along it (3 ft 7 in panels). */
export const GLASS_ROWS = 8;
export const GLASS_COLS = Math.round((Z_EAST - Z_IN) / 1.09);
const SLOPE = (ROCKEFELLER_GLASS_SLOPE_DEG * Math.PI) / 180;
const OUT: [number, number, number] = [-Math.sin(SLOPE), Math.cos(SLOPE), 0];

function glassPoint(s: number, z: number): [number, number, number] {
  return [ROCKEFELLER_GLASS_FACE_X + ROCKEFELLER_GLASS_RUN * s, RF_GLASS_FOOT_Y + ROCKEFELLER_GLASS_RISE * s, z];
}

function foundations(kit: Kit): void {
  const footing = (a: P2, b: P2, k: number): void => {
    kit.add(UNIT_BOX, mat.concrete, wallAlong(a, b, FOOTING_Y, GROUND_FLOOR_Y - SLAB, 2.0), k);
  };
  footing([X0, Z_EAST], [X0, Z_WEST], 0);
  footing([X0, Z_WEST], [X1, Z_WEST], 1);
  footing([X1, Z_WEST], [X1, Z_KRAVIS], 2);
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X_IN, GROUND_FLOOR_Y - SLAB, Z_IN], [X1, GROUND_FLOOR_Y, Z_EAST]), 3);
}

function walls(kit: Kit): void {
  // The stone base under the glass wall, the west wall (later inside the Wallace Wing) and the north wall up to the Kravis Wing.
  kit.add(UNIT_BOX, palette.limestone, wallAlong([X0, Z_EAST], [X0, Z_IN], GROUND_FLOOR_Y - SLAB, RF_GLASS_FOOT_Y, OUTER_WALL), 0);
  // The west wall stops 1 m short of the south face: photo ref-park-south shows a dark reveal between the glass and the stone block west of it.
  kit.add(UNIT_BOX, palette.limestone, wallAlong([X0 + 1.0, Z_WEST], [X1, Z_WEST], GROUND_FLOOR_Y - SLAB, PARAPET_Y, OUTER_WALL), 1);
  kit.add(UNIT_BOX, palette.limestone, wallAlong([X1, Z_WEST], [X1, Z_KRAVIS], GROUND_FLOOR_Y - SLAB, PARAPET_Y, OUTER_WALL), 2);
}

function floors(kit: Kit): void {
  // Main floor out to the glass; second floor set back 5.5 m from the south face (map: floor 2 starts at X −144.9), leaving the hall behind the glass two storeys high.
  kit.add(UNIT_BOX, palette.stoneFloor, boxAt([X0 + 0.4, MAIN_FLOOR_Y - SLAB, Z_IN], [X1, MAIN_FLOOR_Y, Z_EAST]), 0);
  kit.add(UNIT_BOX, palette.wood, boxAt([-144.9, ROCHE_SECOND_FLOOR_Y - SLAB, Z_IN], [X1, ROCHE_SECOND_FLOOR_Y, Z_EAST]), 1);
}

/** Main-floor galleries (map, rectangular rooms only): Oceania along the glass, Africa and the Americas behind. */
const MAIN_ROOMS: readonly Room[] = [
  [-150.4, -97.28, -133.09, -68.15],
  [-150.4, -68.26, -132.99, -38.5],
  [-133.18, -97.29, -123.24, -79.98],
  [-133.12, -80.01, -123.2, -68.1],
  [-127.9, -56.31, -118.94, -50.42],
  [-123.3, -97.29, -113.33, -83.86],
  [-123.2, -73.98, -106.02, -68.1],
  [-114.62, -68.1, -106.0, -62.12],
  [-113.39, -97.3, -106.08, -86.0],
  [-106.12, -97.3, -89.28, -73.92],
];
/** Second-floor galleries 800–830 (map): the nineteenth- and early twentieth-century European paintings under the ridge skylights. */
const UPPER_ROOMS: readonly Room[] = [
  [-144.89, -97.3, -131.9, -87.47],
  [-144.89, -50.81, -138.5, -43.61],
  [-144.88, -87.5, -138.52, -78.01],
  [-144.88, -78.02, -131.92, -68.02],
  [-144.88, -68.02, -131.92, -58.02],
  [-144.88, -58.02, -138.5, -50.8],
  [-141.69, -43.63, -131.91, -38.5],
  [-138.53, -87.49, -131.91, -78.01],
  [-138.53, -58.02, -131.92, -50.8],
  [-138.51, -50.81, -131.91, -43.62],
  [-131.92, -87.47, -119.35, -76.5],
  [-131.92, -76.51, -119.35, -67.44],
  [-131.91, -97.28, -119.35, -87.47],
  [-131.91, -67.45, -122.84, -58.58],
  [-131.91, -58.58, -122.85, -49.39],
  [-131.91, -49.39, -122.84, -38.5],
  [-122.85, -67.45, -105.75, -58.57],
  [-122.85, -58.59, -117.7, -49.36],
  [-122.85, -49.39, -110.91, -38.5],
  [-119.36, -97.29, -109.17, -87.47],
  [-119.36, -87.48, -109.18, -76.51],
  [-119.35, -76.51, -109.17, -67.44],
  [-117.71, -58.59, -110.91, -49.36],
  [-110.92, -58.57, -105.76, -49.37],
  [-110.91, -49.38, -100.15, -38.5],
  [-109.19, -87.5, -100.16, -76.5],
  [-109.19, -76.51, -100.16, -67.46],
  [-109.18, -97.29, -100.17, -87.48],
  [-105.76, -67.46, -100.15, -58.57],
  [-105.76, -58.57, -100.15, -49.38],
  [-100.17, -97.28, -93.31, -38.5],
];

function galleries(kit: Kit): void {
  const main = { y0: MAIN_FLOOR_Y, y1: ROCHE_SECOND_FLOOR_Y - SLAB, openingHeight: 4.2 };
  const upper = { y0: ROCHE_SECOND_FLOOR_Y, y1: RF_ROOF_Y - DECK, openingHeight: 3.6 };
  clipEdges(sharedEdges(MAIN_ROOMS), [X_IN, Z_IN, X1 - OUTER_WALL, Z_EAST]).forEach((edge, k) => {
    for (const m of partitionBoxes(edge, main)) kit.add(UNIT_BOX, palette.plaster, m, k);
  });
  clipEdges(sharedEdges(UPPER_ROOMS), [-144.9, Z_IN, X1 - OUTER_WALL, Z_EAST]).forEach((edge, k) => {
    for (const m of partitionBoxes(edge, upper)) kit.add(UNIT_BOX, palette.plaster, m, 100 + k);
  });
}

function roof(kit: Kit): void {
  const holes = Array.from({ length: RIDGES }, (_, k): P2[] => {
    const z = ridgeCentreZ(k);
    const h = RIDGE_WIDTH / 2 - 0.1;
    return [
      [RIDGE_X0 + 0.2, z - h],
      [RIDGE_X1 - 0.2, z - h],
      [RIDGE_X1 - 0.2, z + h],
      [RIDGE_X0 + 0.2, z + h],
    ];
  });
  const deckX0 = RF_GLASS_TOP_X - 0.6;
  kit.add(prism([[deckX0, Z_IN], [X1, Z_IN], [X1, Z_EAST], [deckX0, Z_EAST]], holes, RF_ROOF_Y - DECK, RF_ROOF_Y), mat.roof, at(0, 0, 0), 0);
  // The white stone fascia that caps the glass wall's top edge (photo ref-park-south).
  kit.add(UNIT_BOX, palette.limestone, boxAt([RF_GLASS_TOP_X - 0.15, RF_ROOF_Y - DECK, Z_IN], [RF_GLASS_TOP_X + 0.75, PARAPET_Y, Z_EAST]), 1);
}

function skylights(kit: Kit): void {
  for (let k = 0; k < RIDGES; k++) {
    // The library skylight's ridge runs along its local Z: turn it a quarter so the ridge runs north–south.
    const m = at((RIDGE_X0 + RIDGE_X1) / 2, RF_ROOF_Y, ridgeCentreZ(k)).multiply(new Matrix4().makeRotationY(Math.PI / 2));
    kit.add(RIDGE.frame, mat.steel, m, k);
    kit.add(RIDGE.glass, mat.glass, m, k);
    const under = at((RIDGE_X0 + RIDGE_X1) / 2, RF_ROOF_Y - DECK - 0.15, ridgeCentreZ(k)).multiply(new Matrix4().makeRotationY(Math.PI / 2));
    kit.add(LAYLIGHT.frame, mat.steel, under, k);
    kit.add(LAYLIGHT.glass, mat.laylight, under, k);
  }
}

function glassWall(kit: Kit): void {
  const zs = Array.from({ length: GLASS_COLS + 1 }, (_, j) => Z_IN + ((Z_EAST - Z_IN) * j) / GLASS_COLS);
  const lift = 0.02;
  const lifted = (p: [number, number, number]): [number, number, number] => [p[0] + OUT[0] * lift, p[1] + OUT[1] * lift, p[2]];
  for (let j = 0; j <= GLASS_COLS; j++) {
    const z = zs[j] ?? Z_IN;
    kit.add(UNIT_BOX, mat.steel, bar(glassPoint(0, z), glassPoint(1, z), 0.06, 0.16, OUT));
    if (j === GLASS_COLS) break;
    const z1 = zs[j + 1] ?? z;
    for (let i = 0; i <= GLASS_ROWS; i++) {
      const s = i / GLASS_ROWS;
      kit.add(UNIT_BOX, mat.steel, bar(glassPoint(s, z), glassPoint(s, z1), 0.06, 0.16, OUT));
      if (i === GLASS_ROWS) break;
      const s1 = (i + 1) / GLASS_ROWS;
      if (i === GLASS_ROWS - 1) {
        // The opaque top row of the 2025 wall: a fritted spandrel panel.
        const mid = (z + z1) / 2;
        kit.add(UNIT_BOX, mat.spandrel, bar(glassPoint(s, mid), glassPoint(s1, mid), z1 - z, 0.03, OUT));
        continue;
      }
      const a = lifted(glassPoint(s, z));
      const b = lifted(glassPoint(s, z1));
      const c = lifted(glassPoint(s1, z1));
      const d = lifted(glassPoint(s1, z));
      kit.add(UNIT_TRIANGLE, mat.glassFritted, paneMatrix(a, b, c));
      kit.add(UNIT_TRIANGLE, mat.glassFritted, paneMatrix(a, c, d));
    }
  }
}

const FOCUS_WING = { kind: 'box', min: [-152, -4, -98], max: [-88, 23, -38] } as const;

export const rockefellerSteps: readonly StepDef[] = [
  { id: 'rockefeller-foundations', chapter: CHAPTER, year: YEAR, title: 'Rockefeller Wing foundations', detail: 'Footings and the ground-floor plate of the wing at the south end, built for the arts of Africa, Oceania and the Americas.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_WING, build: foundations },
  { id: 'rockefeller-walls', chapter: CHAPTER, year: YEAR, title: 'Rockefeller Wing limestone walls', detail: 'A stone base along the south face for the glass wall, and limestone walls to the west and north, the west one inside the later Wallace Wing.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: walls },
  { id: 'rockefeller-floors', chapter: CHAPTER, year: YEAR, title: 'Main and second floors', detail: 'The main floor runs out to the glass; the second floor stops 5.5 m short of it, so the hall behind the glass is two storeys high.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_WING, build: floors },
  { id: 'rockefeller-galleries', chapter: CHAPTER, year: YEAR, title: 'Galleries on two floors', detail: 'Gallery walls of the Oceania hall and the African and American galleries, and above them the nineteenth-century European paintings.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: galleries },
  { id: 'rockefeller-roof', chapter: CHAPTER, year: YEAR, title: 'Roof deck over the paintings galleries', detail: 'The roof over the second floor, open in ten long bays for skylights, and the stone fascia along the top of the south face.', motion: { kind: 'drop' }, stagger: 'order', focus: FOCUS_WING, build: roof },
  { id: 'rockefeller-skylights', chapter: CHAPTER, year: YEAR, title: 'Ridge skylights over the galleries', detail: 'Ten glass ridges running north–south light the second-floor galleries; an eleventh continues over the Greek and Roman wing.', motion: { kind: 'drop' }, stagger: 'z', focus: FOCUS_WING, build: skylights },
  {
    id: 'rockefeller-glass-wall',
    chapter: CHAPTER,
    year: YEAR,
    title: 'The sloping south glass wall',
    detail: 'A wall of glass 61 m long and 18 m high on the slope, leaning back at 70°. Rebuilt 2021–25 to the same look: triple glazed, fritted, opaque top row.',
    motion: { kind: 'slide', from: [-8, 0, 0] },
    stagger: 'z',
    weight: 1.5,
    focus: { kind: 'preset', id: 'ref-park-south' },
    build: glassWall,
  },
];
