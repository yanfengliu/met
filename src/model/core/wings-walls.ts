/**
 * Wings B (Theodore Weston with Arthur L. Tuckerman, 1884-88) and C (Tuckerman, 1889-94) beside the Vaux building (history.md section 3): footings,
 * the plain brick elevations bay by bay (stone base, two tall main-floor windows, a blind brick panel at the top-lit second floor, stone pilaster
 * strips, string course and cornice; the long side of the 1900 photograph 1880_Met_Museum.jpg), the floors and the main stair of wing C
 * (floor map: X 29.1..38.6, Z −118.8..−116.0). Weston's south facade is in weston-facade.ts.
 */
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { moulding, stairFlight, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall, type Hole } from './arches.js';
import { A_HALF, B_SOUTH_X, C_NORTH_X, COPING_TOP_Y, CORNICE_Y, EAST_Z, FOOTING_Y, L1, L2, LG, OUTER_WALL, PARAPET_Y, SLAB, WESTON_BAY, WEST_WALL, WEST_Z } from './constants.js';
import { slabRects } from './galleries.js';
import { INNER_EAST_Z, INNER_WEST_Z, INTERIOR, type BlockId, type Rect } from './layout.js';
import { core } from './materials.js';
import { FACING, addBox, placed } from './shapes.js';
import { WALL_BASE_Y } from './vaux-front.js';

/** One elevation run: bay centres along a wall face, the face's fixed coordinate, its facing and wall thickness. */
export interface Elevation {
  readonly block: Exclude<BlockId, 'a'>;
  /** 'x' runs along X at fixed Z; 'z' along Z at fixed X. */
  readonly axis: 'x' | 'z';
  /** The outer face's fixed coordinate. */
  readonly face: number;
  readonly facing: number;
  /** +1 when the inside lies toward increasing fixed coordinate. */
  readonly inward: 1 | -1;
  readonly thickness: number;
  /** Bay centres along the run. */
  readonly bays: readonly number[];
  /** Plain runs between and beyond the bays, [from, to] along the run. */
  readonly fills: readonly (readonly [number, number])[];
  readonly glazed: boolean;
  /** On a line shared with a newer block (the Hunt block at Z −69.0, the American Wing at X 49.4): trim stands out at most 0.3 m. */
  readonly shared: boolean;
}

/** Bays of WESTON_BAY from `from` toward `to`, the remainder left as a plain fill at the far end. */
function baysAlong(from: number, to: number): { bays: number[]; fills: [number, number][] } {
  const dir = Math.sign(to - from);
  const count = Math.floor(Math.abs(to - from) / WESTON_BAY);
  const bays = Array.from({ length: count }, (_, k) => from + dir * WESTON_BAY * (k + 0.5));
  const end = from + dir * WESTON_BAY * count;
  return { bays, fills: Math.abs(to - end) > 1e-6 ? [[Math.min(end, to), Math.max(end, to)]] : [] };
}

const B_WEST = baysAlong(-A_HALF, B_SOUTH_X + OUTER_WALL);
const C_WEST = baysAlong(A_HALF, C_NORTH_X - OUTER_WALL);
const NORTH = (() => {
  const length = EAST_Z - WEST_Z;
  const count = Math.floor(length / WESTON_BAY);
  const margin = (length - count * WESTON_BAY) / 2;
  return { bays: Array.from({ length: count }, (_, k) => WEST_Z + margin + WESTON_BAY * (k + 0.5)), fills: [[WEST_Z, WEST_Z + margin], [EAST_Z - margin, EAST_Z]] as [number, number][] };
})();

export const ELEVATIONS: readonly Elevation[] = [
  { block: 'b', axis: 'x', face: WEST_Z, facing: FACING.west, inward: 1, thickness: WEST_WALL, ...B_WEST, glazed: true, shared: false },
  { block: 'b', axis: 'x', face: EAST_Z, facing: FACING.east, inward: -1, thickness: OUTER_WALL, ...B_WEST, glazed: false, shared: true },
  { block: 'c', axis: 'x', face: WEST_Z, facing: FACING.west, inward: 1, thickness: WEST_WALL, ...C_WEST, glazed: true, shared: false },
  { block: 'c', axis: 'x', face: EAST_Z, facing: FACING.east, inward: -1, thickness: OUTER_WALL, ...C_WEST, glazed: false, shared: true },
  { block: 'c', axis: 'z', face: C_NORTH_X, facing: FACING.north, inward: -1, thickness: OUTER_WALL, ...NORTH, glazed: true, shared: true },
];

/** The wings' window sizes, shared by the plain bays and Weston's facade so their windows batch together. */
export const GROUND_WINDOW = { width: 1.2, height: 2.4, rise: 0.25, sill: LG + 1.2 } as const;
export const MAIN_WINDOW = { width: 1.1, height: 4.4, sill: L1 + 1.9 } as const;
/** Window openings of a plain bay, x from its centre. */
export const PLAIN_GROUND: Hole = { head: 'segmental', y: GROUND_WINDOW.sill - WALL_BASE_Y, width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, rise: GROUND_WINDOW.rise };
export const PLAIN_MAIN: readonly Hole[] = [-1.2, 1.2].map((x) => ({ x, y: MAIN_WINDOW.sill - WALL_BASE_Y, width: MAIN_WINDOW.width, height: MAIN_WINDOW.height }));

/** The shared window units: main-floor rectangles and ground-storey segmental heads. */
export function wingWindows(): { main: ReturnType<typeof windowUnit>; ground: ReturnType<typeof windowUnit> } {
  return {
    main: windowUnit({ width: MAIN_WINDOW.width, height: MAIN_WINDOW.height, cols: 2, rows: 4 }),
    ground: windowUnit({ width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, shape: 'segmental', rise: GROUND_WINDOW.rise, cols: 2, rows: 3 }),
  };
}

function plainBay(thickness: number): BufferGeometry {
  const holes: Hole[] = [PLAIN_GROUND, ...PLAIN_MAIN, { y: L2 + 1.1 - WALL_BASE_Y, width: 3.9, height: 4.0, depth: 0.12 }];
  return openWall({ width: WESTON_BAY, height: PARAPET_Y - WALL_BASE_Y, thickness, holes, openEnds: true });
}

/** World position of a point `along` the run, `out` metres outside the face. */
export function at(e: Elevation, along: number, out = 0): { x: number; z: number } {
  const fixed = e.face - e.inward * out;
  return e.axis === 'x' ? { x: along, z: fixed } : { x: fixed, z: along };
}

/** A box on an elevation: [a0, a1] along the run, y0..y1, from `out` outside the face to `inn` inside it. */
export function elevationBox(kit: Kit, e: Elevation, material: Parameters<typeof addBox>[1], a0: number, a1: number, y0: number, y1: number, out: number, inn: number, order: number): void {
  const f0 = e.face - e.inward * out;
  const f1 = e.face + e.inward * inn;
  if (e.axis === 'x') addBox(kit, material, a0, y0, f0, a1, y1, f1, order);
  else addBox(kit, material, f0, y0, a0, f1, y1, a1, order);
}

/** The walls of one elevation: its bays and plain fills, footing to parapet. */
export function elevationWalls(kit: Kit, e: Elevation): void {
  const geometry = plainBay(e.thickness);
  e.bays.forEach((c, i) => {
    const p = at(e, c);
    kit.add(geometry, palette.brick, placed(p.x, WALL_BASE_Y, p.z, e.facing), i);
  });
  for (const [a0, a1] of e.fills) elevationBox(kit, e, palette.brick, a0, a1, WALL_BASE_Y, PARAPET_Y, 0, e.thickness, 0);
}

/** Stone trim of a plain elevation: plinth, water table, pilaster strips, sills and lintels, string course, cornice per bay and coping. */
export function elevationTrim(kit: Kit, e: Elevation): void {
  const stone = core.westonStone;
  const all = [...e.bays.map((c) => [c - WESTON_BAY / 2, c + WESTON_BAY / 2] as const), ...e.fills];
  const lo = Math.min(...all.map((r) => r[0]));
  const hi = Math.max(...all.map((r) => r[1]));
  elevationBox(kit, e, stone, lo, hi, WALL_BASE_Y, LG + 0.6, 0.1, 0, 0);
  elevationBox(kit, e, stone, lo, hi, L1 - 0.45, L1 + 0.05, 0.12, 0, 1);
  elevationBox(kit, e, stone, lo, hi, L2 - 0.1, L2 + 0.3, 0.12, 0, 2);
  const cornice = moulding({ profile: 'cornice-plain', path: [[-WESTON_BAY / 2, 0, 0], [WESTON_BAY / 2, 0, 0]], height: 0.75, projection: 0.65 });
  const edges = [...new Set(e.bays.flatMap((c) => [c - WESTON_BAY / 2, c + WESTON_BAY / 2]).map((v) => Math.round(v * 100) / 100))];
  edges.forEach((edge, i) => {
    elevationBox(kit, e, stone, edge - 0.3, edge + 0.3, L1 + 0.05, CORNICE_Y, 0.08, 0, 3 + i);
  });
  e.bays.forEach((c, i) => {
    for (const h of PLAIN_MAIN) {
      const x = c + (h.x ?? 0);
      const sill = WALL_BASE_Y + (h.y ?? 0);
      elevationBox(kit, e, stone, x - 0.75, x + 0.75, sill - 0.18, sill, 0.1, 0.05, 3 + i);
      elevationBox(kit, e, stone, x - 0.75, x + 0.75, sill + h.height, sill + h.height + 0.35, 0.08, 0, 3 + i);
    }
    const p = at(e, c);
    if (!e.shared) kit.add(cornice, stone, placed(p.x, CORNICE_Y, p.z, e.facing), 20 + i);
  });
  // On a shared line the cornice is a flat band, 0.25 m proud; elsewhere the fills get a short cornice block.
  if (e.shared) elevationBox(kit, e, stone, lo, hi, CORNICE_Y, CORNICE_Y + 0.75, 0.25, 0, 20);
  else for (const [a0, a1] of e.fills) elevationBox(kit, e, stone, a0, a1, CORNICE_Y, CORNICE_Y + 0.75, 0.2, 0, 20);
  elevationBox(kit, e, stone, lo, hi, PARAPET_Y, COPING_TOP_Y, 0.08, e.thickness, 30);
}

/** Windows of a plain elevation (frames, sash bars and glass in the ground and main-floor openings). */
export function elevationWindows(kit: Kit, e: Elevation): void {
  if (!e.glazed) return;
  const { main, ground } = wingWindows();
  e.bays.forEach((c, i) => {
    const reveal = 0.3;
    const g = at(e, c, -reveal);
    const gm = placed(g.x, WALL_BASE_Y + (PLAIN_GROUND.y ?? 0), g.z, e.facing);
    kit.add(ground.frame, palette.metalDark, gm, i);
    kit.add(ground.bars, palette.metalDark, gm, i);
    kit.add(ground.glass, palette.glassDark, gm, i);
    for (const h of PLAIN_MAIN) {
      const p = at(e, c + (h.x ?? 0) * (e.axis === 'x' ? -e.inward : e.inward), -reveal);
      const m = placed(p.x, WALL_BASE_Y + (h.y ?? 0), p.z, e.facing);
      kit.add(main.frame, palette.metalDark, m, i);
      kit.add(main.bars, palette.metalDark, m, i);
      kit.add(main.glass, palette.glassDark, m, i);
    }
  });
}

/** Footings under a wing's outer walls and its light wells' walls, and its ground-floor slab. */
export function wingFoundations(kit: Kit, block: 'b' | 'c'): void {
  const m = core.footing;
  const [x0, z0, x1, z1] = INTERIOR[block];
  const outerX = block === 'b' ? B_SOUTH_X : C_NORTH_X;
  addBox(kit, m, x0, FOOTING_Y, WEST_Z - 0.2, x1, WALL_BASE_Y, INNER_WEST_Z + 0.3, 0);
  addBox(kit, m, x0, FOOTING_Y, INNER_EAST_Z - 0.3, x1, WALL_BASE_Y, EAST_Z + 0.2, 2);
  const outerInner = block === 'b' ? outerX + OUTER_WALL + 0.3 : outerX - OUTER_WALL - 0.3;
  addBox(kit, m, block === 'b' ? outerX - 0.2 : outerInner, FOOTING_Y, WEST_Z - 0.2, block === 'b' ? outerInner : outerX + 0.2, WALL_BASE_Y, EAST_Z + 0.2, 1);
  addBox(kit, m, x0, WALL_BASE_Y, z0, x1, LG, z1, 3);
}

/** The main stair of wing C, main floor to second floor in one stone flight. */
const C_STAIR: Rect = [29.15, -118.8, 38.65, -115.95];

/** Main and second floors of both wings (the light wells and wing C's stair left open), and that stair. */
export function wingFloors(kit: Kit): void {
  for (const block of ['b', 'c'] as const) {
    const [x0, z0, x1, z1] = INTERIOR[block];
    // The main floor runs under the light wells too: they are open courts from it to the sky.
    addBox(kit, palette.stoneFloor, x0, L1 - SLAB, z0, x1, L1, z1, 0);
    const holes = block === 'c' ? [C_STAIR] : [];
    for (const r of slabRects(block, holes)) addBox(kit, palette.wood, r[0], L2 - SLAB, r[1], r[2], L2, r[3], 1);
  }
  const risers = 38;
  const flight = stairFlight({ width: C_STAIR[3] - C_STAIR[1] - 0.2, steps: risers, riser: (L2 - L1) / risers, tread: 0.245, cheeks: { width: 0.15, height: 0.95 } });
  const foot = placed(C_STAIR[2], L1, (C_STAIR[1] + C_STAIR[3]) / 2, FACING.north);
  kit.add(flight.steps, palette.limestone, foot, 2);
  if (flight.cheeks) kit.add(flight.cheeks, palette.limestone, foot, 2);
}
