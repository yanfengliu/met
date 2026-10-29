/**
 * The Vaux and Mould building's shell and frame (history.md section 2): footings and basement slab, the brick side and east walls (exterior in
 * 1880, party walls since 1888, their 1880 windows bricked up as blind pointed arches), Radford's iron frame with the floors and the restored iron
 * staircases, and the central hall's end walls and iron roof frame (the hall itself is the Medieval Sculpture Hall of 1939, medieval-hall.ts).
 * Side-wall bays follow the hall's pier lines (interior.md: piers 5.65 m apart); doors follow the floor map's openings. The east wall takes, on the axis
 * at the second floor, the doorway from the Grand Staircase's cross hall into gallery 600 (frame.ts GALLERY_600_DOOR_*; interior.md, The Grand Staircase;
 * work unit 2, M1), lined in granite with a threshold, so its central main-floor arch is a lower drop arch whose voussoirs stay under it. Open with
 * the owner (exterior.md section 9): in 1880 only the hall's six bays a side had pointed arches and the end blocks' bays round-headed openings
 * (exterior-images.md #49 and #65), the south side's six over light rusticated stone (exterior-images.md #65).
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { GALLERY_600_DOOR_CROWN, GALLERY_600_DOOR_HALF_WIDTH, GALLERY_600_DOOR_LINING } from '../frame.js';
import { MeshBuilder, stairFlight } from '../lib/index.js';
import { palette } from '../palette.js';
import { holeLining, openWall, voussoirRing, type Hole } from './arches.js';
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
  PARAPET_Y,
  PARTY_WALL,
  ROOF_Y,
  SLAB,
  VAUX_ARCH_RISE,
  VAUX_ARCH_SILL,
  VAUX_ARCH_SPAN,
  VAUX_ARCH_SPRING,
  VAUX_BAND,
  VAUX_BAY,
  VAUX_GROUND_HEIGHT,
  VAUX_GROUND_SILL,
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
import { WALL_BASE_Y } from './vaux-front.js';

const [AX0, , AX1] = INTERIOR.a;
/**
 * E: the east wall's central main-floor arch rises 1.8 m over its springing, not VAUX_ARCH_RISE, so its apex (10.41 m) and its voussoirs and hood
 * (to 10.92 m) stay under the doorway into gallery 600 over it, whose hole starts at its threshold (10.94 m); no source shows this arch.
 */
export const VAUX_EAST_CENTRE_RISE = 1.8;
const eastRise = (k: number): number => (k === 0 ? VAUX_EAST_CENTRE_RISE : VAUX_ARCH_RISE);
/** E: the granite threshold through the east wall under the doorway into gallery 600, this deep, its top on the second floor. */
const DOOR_THRESHOLD = 0.03;

/** Pier lines of the side walls: the hall's seven, extended three bays west and two east at the same spacing. */
export const SIDE_BAY = (HALL_PIER_Z[6] - HALL_PIER_Z[0]) / 6;
export const SIDE_LINES: readonly number[] = [-3, -2, -1].map((k) => HALL_PIER_Z[0] + k * SIDE_BAY).concat([...HALL_PIER_Z], [1, 2].map((k) => HALL_PIER_Z[6] + k * SIDE_BAY));
/** Bays of the side walls with a main-floor door and a second-floor door (floor map, floor 1 and 2 openings in the X ±14.5 walls). */
const DOOR_BAYS: Readonly<Record<'south' | 'north', readonly number[]>> = { south: [2, 5, 6, 9], north: [4, 5, 6, 9] };

// Open with the owner (exterior.md section 9): the end blocks' bays had round-headed openings in 1880, not these (exterior-images.md #49 and #65);
// the hall's six stood on light rusticated stone with small square-headed openings, on the south side seen whole (exterior-images.md #65).
/** The 1880 windows of a side-wall bay, bricked up on the outer face, or opened as doors. */
function sideBay(door: boolean): BufferGeometry {
  const height = ROOF_Y - WALL_BASE_Y;
  const holes: Hole[] = [{ head: 'segmental', y: LG + VAUX_GROUND_SILL - WALL_BASE_Y, width: 1.6, height: VAUX_GROUND_HEIGHT, rise: 0.4, depth: 0.25 }];
  if (door) {
    holes.push({ head: 'pointed', y: L1 - WALL_BASE_Y, width: VAUX_ARCH_SPAN, height: VAUX_ARCH_SPRING + VAUX_ARCH_RISE, rise: VAUX_ARCH_RISE });
    // Beside the main-floor arch, whose apex rises past the second floor.
    holes.push({ x: 1.6, y: L2 - WALL_BASE_Y, width: 1.8, height: 3.2 });
  } else {
    holes.push({ head: 'pointed', y: L1 + VAUX_ARCH_SILL - WALL_BASE_Y, width: VAUX_ARCH_SPAN, height: VAUX_ARCH_SPRING + VAUX_ARCH_RISE - VAUX_ARCH_SILL, rise: VAUX_ARCH_RISE, depth: 0.25 });
  }
  return openWall({ width: SIDE_BAY, height, thickness: PARTY_WALL, holes, openEnds: true });
}

/** Side walls (X ±14.5) bay by bay and the east wall (Z −69.0), all from the footings; the side walls stop at the roof, the east wall at the parapet. */
export function vauxWalls(kit: Kit): void {
  const height = ROOF_Y - WALL_BASE_Y;
  for (const [side, x, facing] of [
    ['south', -A_HALF, FACING.south],
    ['north', A_HALF, FACING.north],
  ] as const) {
    for (let i = 0; i + 1 < SIDE_LINES.length; i++) {
      const z0 = SIDE_LINES[i] ?? 0;
      const z1 = SIDE_LINES[i + 1] ?? 0;
      kit.add(sideBay(DOOR_BAYS[side].includes(i)), palette.brick, placed(x, WALL_BASE_Y, (z0 + z1) / 2, facing), i + 1);
    }
    const inner = side === 'south' ? x + PARTY_WALL : x - PARTY_WALL;
    addBox(kit, palette.brick, x, WALL_BASE_Y, INNER_WEST_Z, inner, WALL_BASE_Y + height, SIDE_LINES[0] ?? 0, 0);
    addBox(kit, palette.brick, x, WALL_BASE_Y, SIDE_LINES[SIDE_LINES.length - 1] ?? 0, inner, WALL_BASE_Y + height, INNER_EAST_Z, SIDE_LINES.length);
  }
  const holes: Hole[] = [];
  for (const k of [-3, -2, -1, 0, 1, 2, 3]) {
    const through = k === 0 || Math.abs(k) === 3;
    const sill = through ? 0 : VAUX_ARCH_SILL;
    const rise = eastRise(k);
    holes.push({ head: 'pointed', x: k * VAUX_BAY, y: L1 + sill - WALL_BASE_Y, width: VAUX_ARCH_SPAN, height: VAUX_ARCH_SPRING + rise - sill, rise, ...(through ? {} : { depth: 0.25 }) });
  }
  for (const x of [-10.3, 10.3]) holes.push({ x, y: L2 - WALL_BASE_Y, width: 2.6, height: 3.2 });
  // The doorway into gallery 600, cut for its granite lining and a threshold under it, flush with the floors on both sides; the Hunt wing lines the
  // passage on through the cavity to its cross hall in the same section (hunt/stair.ts).
  const sill = L2 - WALL_BASE_Y;
  const lined = GALLERY_600_DOOR_HALF_WIDTH + GALLERY_600_DOOR_LINING;
  const outer: Hole = { head: 'round', x: 0, y: sill, width: 2 * lined, height: GALLERY_600_DOOR_CROWN + GALLERY_600_DOOR_LINING };
  holes.push({ ...outer, y: sill - DOOR_THRESHOLD, height: outer.height + DOOR_THRESHOLD });
  const east = openWall({ width: 2 * A_HALF, height: PARAPET_Y - WALL_BASE_Y, thickness: OUTER_WALL, holes });
  const frame = placed(0, WALL_BASE_Y, EAST_Z, FACING.east);
  kit.add(east, palette.brick, frame, SIDE_LINES.length + 1);
  const inner: Hole = { head: 'round', x: 0, y: sill, width: 2 * GALLERY_600_DOOR_HALF_WIDTH, height: GALLERY_600_DOOR_CROWN };
  kit.add(holeLining(outer, inner, OUTER_WALL), core.granite, frame, SIDE_LINES.length + 1);
  addBox(kit, core.granite, -lined, L2 - DOOR_THRESHOLD, INNER_EAST_Z, lined, L2, EAST_Z, SIDE_LINES.length + 1);
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
    kit.add(upper, palette.brick, placed(0, ROOF_Y, z, facing), order + 4);
    kit.add(gable, palette.brick, placed(0, HALL_NAVE_ROOF_EAVES_Y, z, facing), order + 6);
  }
  // The wall between galleries 521 and 520, with its door on the axis (map: X −1.13..1.17).
  const z = VAUX_WEST_PAVILION_WALL_Z;
  const top = L2 - SLAB;
  addBox(kit, palette.brick, AX0, L1, z - 0.2, -1.15, top, z + 0.2, 2);
  addBox(kit, palette.brick, 1.15, L1, z - 0.2, AX1, top, z + 0.2, 2);
  addBox(kit, palette.brick, -1.15, L1 + 3.2, z - 0.2, 1.15, top, z + 0.2, 2);
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

/**
 * Granite trim of the side and east walls: polychrome voussoirs over every 1880 arch and the floor, impost and ground-storey bands. The voussoirs
 * alternate light and dark grey granite as on the west front (vaux-front.ts): the hall's arcade on the south side and the east front's arches are
 * banded alike in 1880 (exterior-images.md #65 and #66), and one of the east arches survives at the top of the Grand Staircase in light and dark granite
 * (exterior-images.md #67).
 */
export function vauxSideTrim(kit: Kit): void {
  const spring = L1 + VAUX_ARCH_SPRING;
  const ring = (parity: 0 | 1, rise = VAUX_ARCH_RISE) => voussoirRing({ head: 'pointed', span: VAUX_ARCH_SPAN, rise, band: 0.42, count: 15, projection: 0.06, parity });
  const hoodOf = (rise: number) => voussoirRing({ head: 'pointed', span: VAUX_ARCH_SPAN, rise, band: 0.09, count: 15, projection: 0.1, parity: 'all', inset: 0.42 });
  const hood = hoodOf(VAUX_ARCH_RISE);
  const proud = 0.08;
  for (const [x, facing, out] of [
    [-A_HALF, FACING.south, -1],
    [A_HALF, FACING.north, 1],
  ] as const) {
    // Open with the owner (exterior.md section 9): in 1880 only the hall's six bays had banded pointed arches; the end blocks' bays had
    // round-headed windows with plain brick heads (exterior-images.md #49 and #65).
    for (let i = 0; i + 1 < SIDE_LINES.length; i++) {
      const z = ((SIDE_LINES[i] ?? 0) + (SIDE_LINES[i + 1] ?? 0)) / 2;
      kit.add(ring(0), core.granite, placed(x, spring, z, facing), i);
      kit.add(ring(1), core.graniteDark, placed(x, spring, z, facing), i);
      kit.add(hood, core.granite, placed(x, spring, z, facing), i);
    }
    const face = x + out * proud;
    for (const [y0, y1] of [
      [L1 - 0.2, L1 + 0.12],
      [spring - VAUX_BAND, spring],
      [LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT, LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT + VAUX_BAND],
    ] as const) {
      addBox(kit, core.granite, x, y0, WEST_Z, face, y1, EAST_Z, 0);
    }
  }
  // Open with the owner (exterior.md section 9): in 1880 the east front had two large arches on either side of its middle, each with a roundel in
  // its head, not seven (exterior-images.md #66); the surviving one has a ring of dark granite blocks outside its voussoirs, not a light hood
  // (exterior-images.md #67).
  for (const k of [-3, -2, -1, 0, 1, 2, 3]) {
    const rise = eastRise(k);
    kit.add(ring(0, rise), core.granite, placed(k * VAUX_BAY, spring, EAST_Z, FACING.east), 12);
    kit.add(ring(1, rise), core.graniteDark, placed(k * VAUX_BAY, spring, EAST_Z, FACING.east), 12);
    kit.add(hoodOf(rise), core.granite, placed(k * VAUX_BAY, spring, EAST_Z, FACING.east), 12);
  }
  addBox(kit, core.granite, -A_HALF, spring - VAUX_BAND, EAST_Z, A_HALF, spring, EAST_Z + proud, 12);
  addBox(kit, core.granite, -A_HALF, L1 - 0.2, EAST_Z, A_HALF, L1 + 0.12, EAST_Z + proud, 12);
}
