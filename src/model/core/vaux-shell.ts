/**
 * The Vaux and Mould building's shell and frame (history.md section 2): footings and basement slab, the side and east walls of red brick (exterior in
 * 1880, party walls since 1888 and 1894, their 1880 windows bricked up; vaux-sides.ts and vaux-east.ts), Radford's iron frame with the floors and the
 * restored iron staircases, and the central hall's end walls and iron roof frame (the hall itself is the Medieval Sculpture Hall of 1939,
 * medieval-hall.ts).
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder, stairFlight } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall, type Hole } from './arches.js';
import {
  A_HALF,
  EAST_Z,
  FOOTING_Y,
  HALL_NAVE_ROOF_EAVES_Y,
  HALL_NAVE_ROOF_PITCH_DEG,
  HALL_PIER_X,
  HALL_PIER_Z,
  L1,
  L2,
  LG,
  OUTER_WALL,
  PARTY_WALL,
  ROOF_Y,
  SLAB,
  VAUX_HALL_EAST_Z,
  VAUX_HALL_WALL,
  VAUX_HALL_WEST_Z,
  VAUX_OCULUS_Y,
  VAUX_WEST_PAVILION_WALL_Z,
  WEST_WALL,
  WEST_Z,
} from './constants.js';
import { INNER_EAST_Z, INNER_WEST_Z, INTERIOR, NAVE_OUTER_X } from './layout.js';
import { core } from './materials.js';
import { barMatrix } from './skylights.js';
import { FACING, UNIT_BOX, addBox, cylinder, keyOf, memo, placed } from './shapes.js';
import { vauxEastTrim, vauxEastWall } from './vaux-east.js';
import { WALL_BASE_Y } from './vaux-front.js';
import { vauxSideArcadeTrim, vauxSideWalls } from './vaux-sides.js';

export { SIDE_BAY, SIDE_LINES } from './vaux-sides.js';

const [AX0, , AX1] = INTERIOR.a;

/** Side walls (X ±14.5, vaux-sides.ts) and the east wall (Z −69.0, vaux-east.ts), all from the footings. */
export function vauxWalls(kit: Kit): void {
  vauxSideWalls(kit);
  vauxEastWall(kit);
}

/** Strip footings under every wall of the block, pads under the iron columns, and the ground-floor slab. */
export function vauxFoundations(kit: Kit): void {
  const top = WALL_BASE_Y;
  const m = core.footing;
  const spread = 0.3;
  addBox(kit, m, -A_HALF - 0.2, FOOTING_Y, WEST_Z - 0.2, A_HALF + 0.2, top, WEST_Z + WEST_WALL + spread, 0);
  addBox(kit, m, -A_HALF - 0.2, FOOTING_Y, EAST_Z - OUTER_WALL - spread, A_HALF + 0.2, top, EAST_Z + 0.2, 9);
  for (const x of [-A_HALF, A_HALF]) {
    const inner = x < 0 ? x + PARTY_WALL + spread : x - PARTY_WALL - spread;
    addBox(kit, m, x < 0 ? x - 0.2 : inner, FOOTING_Y, INNER_WEST_Z, x < 0 ? inner : x + 0.2, top, INNER_EAST_Z, 1);
  }
  for (const [z, order] of [
    [VAUX_HALL_WEST_Z - VAUX_HALL_WALL / 2, 3],
    [VAUX_HALL_EAST_Z + VAUX_HALL_WALL / 2, 7],
    [VAUX_WEST_PAVILION_WALL_Z, 2],
  ] as const) {
    addBox(kit, m, AX0, FOOTING_Y, z - VAUX_HALL_WALL / 2 - spread, AX1, top, z + VAUX_HALL_WALL / 2 + spread, order);
  }
  for (const [x, z] of basementColumns()) addBox(kit, m, x - 0.9, FOOTING_Y, z - 0.9, x + 0.9, top, z + 0.9, 4 + Math.round((z - WEST_Z) / 20));
  // Ground-floor slab, its top at LG.
  addBox(kit, m, AX0, top, INNER_WEST_Z, AX1, LG, INNER_EAST_Z, 10);
}

/** Basement columns: a grid under the hall on its pier lines, the map's four under gallery 520 and four under the east pavilion. */
function basementColumns(): [number, number][] {
  const out: [number, number][] = [];
  for (const z of HALL_PIER_Z) for (const x of [-HALL_PIER_X, 0, HALL_PIER_X]) out.push([x, z]);
  for (const z of [-126.88, -131.4]) for (const x of [-8.64, -2.88, 2.88, 8.64]) out.push([x, z]);
  for (const x of [-8.64, -2.88, 2.88, 8.64]) out.push([x, -76.5]);
  return out;
}

/** The west pavilion's two iron U-stairs (floor map: flights X ±8.7..±14.8, Z −133.4..−130.0), from the main to the second floor. */
function ironStairs(kit: Kit): void {
  const risers = 19;
  const riser = (L2 - L1) / (2 * risers);
  const flight = stairFlight({ width: 1.9, steps: risers, riser, tread: 0.18, cheeks: { width: 0.08, height: 0.95 } });
  const run = risers * 0.18;
  for (const side of [-1, 1]) {
    const inner = side * 10.2;
    const outer = side * 12.55;
    const foot = -130.0;
    kit.add(flight.steps, core.castIron, placed(inner, L1, foot), 20);
    if (flight.cheeks) kit.add(flight.cheeks, core.castIron, placed(inner, L1, foot), 20);
    const landing = L1 + risers * riser;
    addBox(kit, core.castIron, side * 13.55, landing - 0.25, foot - run - 1.6, side * 9.2, landing, foot - run, 21);
    kit.add(flight.steps, core.castIron, placed(outer, landing, foot - run, Math.PI), 22);
    if (flight.cheeks) kit.add(flight.cheeks, core.castIron, placed(outer, landing, foot - run, Math.PI), 22);
  }
}

/** Radford's frame: iron columns in the basement and on the main floor, the main-floor slab and the second-floor slabs, then the iron stairs. */
export function vauxIronFrame(kit: Kit): void {
  const column = cylinder(10);
  const iron = core.castIron;
  for (const [x, z] of basementColumns()) kit.add(column, iron, placed(x, LG, z, 0, [0.36, L1 - SLAB - LG, 0.36]), 0);
  // Main floor, its hall field 6 cm low for the 1939 marble.
  const floor = palette.stoneFloor;
  addBox(kit, floor, AX0, L1 - SLAB, INNER_WEST_Z, AX1, L1, VAUX_HALL_WEST_Z - VAUX_HALL_WALL, 5);
  addBox(kit, floor, AX0, L1 - SLAB, VAUX_HALL_WEST_Z, AX1, L1 - 0.06, VAUX_HALL_EAST_Z, 5);
  addBox(kit, floor, AX0, L1 - SLAB, VAUX_HALL_EAST_Z + VAUX_HALL_WALL, AX1, L1, INNER_EAST_Z, 5);
  for (const x of [-HALL_PIER_X, HALL_PIER_X]) for (const z of HALL_PIER_Z) kit.add(column, iron, placed(x, L1, z, 0, [0.32, L2 - SLAB - L1, 0.32]), 10);
  for (const x of [-3.0, 3.0]) kit.add(column, iron, placed(x, L1, -75.06, 0, [0.32, L2 - SLAB - L1, 0.32]), 10);
  // Second floor: the pavilions round the stair wells, and the aisle galleries beside the hall's nave.
  const wood = palette.wood;
  const westEnd = VAUX_HALL_WEST_Z - VAUX_HALL_WALL;
  addBox(kit, wood, AX0, L2 - SLAB, -130.0, AX1, L2, westEnd, 30);
  addBox(kit, wood, -9.2, L2 - SLAB, INNER_WEST_Z, 9.2, L2, -130.0, 30);
  addBox(kit, wood, AX0, L2 - SLAB, VAUX_HALL_EAST_Z + VAUX_HALL_WALL, AX1, L2, INNER_EAST_Z, 30);
  // Over the hall's aisles the floor is plaster below and seen from the hall, so it is plaster.
  addBox(kit, palette.plaster, AX0, L2 - SLAB, VAUX_HALL_WEST_Z, -NAVE_OUTER_X, L2, VAUX_HALL_EAST_Z, 30);
  addBox(kit, palette.plaster, NAVE_OUTER_X, L2 - SLAB, VAUX_HALL_WEST_Z, AX1, L2, VAUX_HALL_EAST_Z, 30);
  ironStairs(kit);
}

/** A triangular gable, closed: base ±width/2 at y = 0, apex (0, rise), from z = 0 back to −thickness. */
export function gablePrism(width: number, rise: number, thickness: number): BufferGeometry {
  return memo(`gable:${keyOf(width, rise, thickness)}`, () => {
    const b = new MeshBuilder();
    const w = width / 2;
    const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);
    b.polygon([v(-w, 0, 0), v(w, 0, 0), v(0, rise, 0)]);
    b.polygon([v(w, 0, -thickness), v(-w, 0, -thickness), v(0, rise, -thickness)]);
    b.polygon([v(w, 0, 0), v(w, 0, -thickness), v(0, rise, -thickness), v(0, rise, 0)]);
    b.polygon([v(-w, 0, -thickness), v(-w, 0, 0), v(0, rise, 0), v(0, rise, -thickness)]);
    b.polygon([v(-w, 0, -thickness), v(w, 0, -thickness), v(w, 0, 0), v(-w, 0, 0)]);
    return b.build();
  });
}

/** The hall's end doorways: round-headed, about 4.4 m wide (P8 shows a broad arched doorway under the balcony at the far end). */
export const END_DOOR = { width: 4.4, height: 5.9 } as const;

/** Holes of the hall's end walls, symmetric in x: the central round-arched doorway, aisle doors, second-floor doors and the balcony opening. */
export const END_WALL_HOLES: readonly Hole[] = [
  { head: 'round', y: L1 - WALL_BASE_Y, width: END_DOOR.width, height: END_DOOR.height },
  ...[-10.5, 10.5].flatMap((x): Hole[] => [
    { head: 'pointed', x, y: L1 - WALL_BASE_Y, width: 1.8, height: 3.8, rise: 1.4 },
    { x, y: L2 - WALL_BASE_Y, width: 1.8, height: 3.1 },
  ]),
  { y: L2 - WALL_BASE_Y, width: 6.0, height: 3.0 },
];
/** The nave's part of an end wall above the roofs, to the eaves, with its oculus. */
export const NAVE_GABLE_WIDTH = 2 * NAVE_OUTER_X;

/** Ridge height of the nave roof's underside on the hall's axis. */
export const NAVE_RIDGE_Y = HALL_NAVE_ROOF_EAVES_Y + NAVE_OUTER_X * Math.tan((HALL_NAVE_ROOF_PITCH_DEG * Math.PI) / 180);

/** The hall's end walls (1880) with the nave gables above the roofs, the iron posts and roof trusses of the nave, and the pavilions' main-floor walls. */
export function vauxHall(kit: Kit): void {
  const lower = openWall({ width: AX1 - AX0, height: ROOF_Y - WALL_BASE_Y, thickness: VAUX_HALL_WALL, holes: END_WALL_HOLES });
  const upper = openWall({ width: NAVE_GABLE_WIDTH, height: HALL_NAVE_ROOF_EAVES_Y - ROOF_Y, thickness: VAUX_HALL_WALL, holes: [{ head: 'circle', y: VAUX_OCULUS_Y - 1.2 - ROOF_Y, width: 2.4, height: 2.4 }] });
  const gable = gablePrism(NAVE_GABLE_WIDTH, NAVE_RIDGE_Y - HALL_NAVE_ROOF_EAVES_Y, VAUX_HALL_WALL);
  for (const [z, facing, order] of [
    [VAUX_HALL_WEST_Z, FACING.east, 0],
    [VAUX_HALL_EAST_Z, FACING.west, 1],
  ] as const) {
    // Below the roofs the end walls were always inside (pavilion to hall): plastered on both faces.
    kit.add(lower, palette.plaster, placed(0, WALL_BASE_Y, z, facing), order);
    kit.add(upper, core.vauxBrick, placed(0, ROOF_Y, z, facing), order + 4);
    kit.add(gable, core.vauxBrick, placed(0, HALL_NAVE_ROOF_EAVES_Y, z, facing), order + 6);
  }
  // The wall between galleries 521 and 520, with its door on the axis (map: X −1.13..1.17).
  const z = VAUX_WEST_PAVILION_WALL_Z;
  const top = L2 - SLAB;
  addBox(kit, core.vauxBrick, AX0, L1, z - 0.2, -1.15, top, z + 0.2, 2);
  addBox(kit, core.vauxBrick, 1.15, L1, z - 0.2, AX1, top, z + 0.2, 2);
  addBox(kit, core.vauxBrick, -1.15, L1 + 3.2, z - 0.2, 1.15, top, z + 0.2, 2);
  // Iron posts on the pier lines up to the eaves, eaves girders, and a truss on every interior pier line.
  const iron = core.castIron;
  const post = cylinder(10);
  const eaves = HALL_NAVE_ROOF_EAVES_Y;
  for (const x of [-HALL_PIER_X, HALL_PIER_X]) {
    for (const zz of HALL_PIER_Z) kit.add(post, iron, placed(x, L2, zz, 0, [0.3, eaves - L2 - 0.4, 0.3]), 8);
    addBox(kit, iron, x - 0.15, eaves - 0.4, VAUX_HALL_WEST_Z, x + 0.15, eaves, VAUX_HALL_EAST_Z, 9);
  }
  const apex = NAVE_RIDGE_Y - 0.3;
  for (const zz of HALL_PIER_Z.slice(1, -1)) {
    const left = new Vector3(-HALL_PIER_X, eaves - 0.2, zz);
    const right = new Vector3(HALL_PIER_X, eaves - 0.2, zz);
    const top = new Vector3(0, apex, zz);
    const n = new Vector3(0, 0, 1);
    for (const [a, b] of [
      [left, right],
      [left, top],
      [right, top],
      [new Vector3(0, eaves - 0.2, zz), top],
    ] as const) {
      kit.add(UNIT_BOX, iron, barMatrix(a, b, 0.18, 0.18, n), 10);
    }
  }
}

/** Granite trim of the side walls' hall bays and of the east front (vaux-sides.ts, vaux-east.ts). */
export function vauxSideTrim(kit: Kit): void {
  vauxSideArcadeTrim(kit);
  vauxEastTrim(kit);
}
