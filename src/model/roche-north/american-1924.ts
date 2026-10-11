/**
 * Grosvenor Atterbury's American Wing (opened 10 November 1924; Heckscher p. 55), chapter `mckim-mead-white-1926`: a plain three-storey block of period rooms on
 * the map's lines (floor 3, the one floor only the 1924 core has: X 94.33..118.46, Z −129.13..−100.66, shifted), its south front the marble facade of the
 * Branch Bank of the United States (bank.ts). Enclosed since 1980 by the new American Wing; the facade then became the north wall of the Engelhard Court.
 * Storeys: E, 4.9 m floor to floor, so the roof sits just behind the facade's cornice (P5: cornice top 14.5 m over the court). Rooms follow the map's gallery outlines.
 */
import { Matrix4 } from 'three';

import { wall, windowUnit } from '../lib/index.js';
import type { Kit, StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y } from '../frame.js';
import { palette } from '../palette.js';
import { AW1924, BANK_FRONT_X, COURT } from './plan.js';
import { addBankFacade } from './bank.js';
import { areaMaterials } from './materials.js';
import { boxAt, facingMatrix, merge } from './shapes.js';

const CHAPTER = 'mckim-mead-white-1926';
const STOREY = 4.9;
const LEVELS: readonly number[] = [MAIN_FLOOR_Y, MAIN_FLOOR_Y + STOREY, MAIN_FLOOR_Y + 2 * STOREY];
/** The 1924 roof slab's top and the parapet round it. */
export const AW1924_ROOF_Y = MAIN_FLOOR_Y + 3 * STOREY;
export const AW1924_PARAPET_Y = AW1924_ROOF_Y + 0.8;
const T = 0.6;
/** The footing's underside, just into the site's pad at GROUND_FLOOR_Y − 0.1. */
const FOOTING_Y = GROUND_FLOOR_Y - 0.15;
const { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 } = AW1924;
/** The wing's south wall behind and beside the facade starts at the facade's back. */
const SOUTH_X = BANK_FRONT_X + 1.38;

type Segment = readonly [number, number, number, number];
/** Period-room partitions per floor (x0, z0, x1, z1), traced from the map's gallery outlines (floor 1: 723–730; floor 2: 717–722; floor 3: 708–716). */
const ROOMS: readonly (readonly Segment[])[] = [
  [
    [104.99, -127.54, 104.99, -103.54],
    [111.92, -127.54, 111.92, -103.54],
    [94.33, -110.89, 104.99, -110.89],
    [98.07, -110.9, 98.07, -103.55],
    [98.06, -127.54, 98.06, -120.39],
    [98.06, -120.39, 104.99, -120.39],
    [104.99, -118.76, 111.92, -118.76],
    [104.99, -112.4, 111.92, -112.4],
    [104.99, -109.88, 111.92, -109.88],
  ],
  [
    [104.99, -127.54, 104.99, -112.4],
    [103.62, -112.41, 111.92, -112.41],
    [103.63, -112.42, 103.63, -103.54],
    [98.07, -110.9, 98.07, -103.55],
    [98.07, -110.9, 103.64, -110.9],
    [98.06, -127.54, 98.06, -120.39],
    [98.06, -120.39, 104.99, -120.39],
    [94.33, -122.16, 98.06, -122.16],
    [111.92, -127.54, 111.92, -103.54],
    [106.38, -112.42, 106.38, -104.94],
  ],
  [
    [98.05, -128.5, 98.05, -101.3],
    [106.55, -121.77, 106.55, -103.55],
    [94.33, -109.43, 111.93, -109.43],
    [98.03, -121.77, 111.93, -121.77],
    [111.93, -128.5, 111.93, -101.3],
  ],
];

function foundations(kit: Kit): void {
  for (let x = X0; x < X1 - 0.1; x += 6.03) boxAt(kit, areaMaterials.concrete, [x, FOOTING_Y, Z0], [Math.min(x + 6.03, X1), FOOTING_Y + 0.6, Z1]);
  boxAt(kit, areaMaterials.concrete, [BANK_FRONT_X, FOOTING_Y + 0.6, Z0], [X1, MAIN_FLOOR_Y - 0.35, Z0 + T]);
  boxAt(kit, areaMaterials.concrete, [BANK_FRONT_X, FOOTING_Y + 0.6, Z1 - T], [X1, MAIN_FLOOR_Y - 0.35, Z1]);
  boxAt(kit, areaMaterials.concrete, [X1 - T, FOOTING_Y + 0.6, Z0 + T], [X1, MAIN_FLOOR_Y - 0.35, Z1 - T]);
  boxAt(kit, areaMaterials.concrete, [BANK_FRONT_X, FOOTING_Y + 0.6, Z0 + T], [SOUTH_X, MAIN_FLOOR_Y, Z1 - T]);
  for (let x = X0; x < X1 - 0.1; x += 6.03) boxAt(kit, areaMaterials.concrete, [x, MAIN_FLOOR_Y - 0.35, Z0], [Math.min(x + 6.03, X1), MAIN_FLOOR_Y - 0.05, Z1]);
}

/** A wall along a park-facing line with a window per bay on each storey, as the 1924 wing had before the 1980 wing closed round it. */
function windowedWall(kit: Kit, facing: '+x' | '-z' | '+z', position: readonly [number, number, number], width: number, bays: number): void {
  const spacing = width / bays;
  const openings = LEVELS.flatMap((level) => Array.from({ length: bays }, (_, k) => ({ x: -width / 2 + spacing * (k + 0.5), y: level - MAIN_FLOOR_Y + 1.0, width: 1.3, height: 2.5 })));
  const body = wall({ width, height: AW1924_PARAPET_Y - MAIN_FLOOR_Y + 0.05, thickness: T, openings });
  const frame = facingMatrix(facing, position);
  kit.add(body, areaMaterials.buffWall, frame);
  const unit = windowUnit({ width: 1.3, height: 2.5, cols: 2, rows: 3 });
  const ats = openings.map((o) => new Matrix4().makeTranslation(o.x, o.y, -0.15));
  kit.add(merge(`rn-1924-${facing}-metal`, () => ats.flatMap((at) => [[unit.frame, at] as const, [unit.bars, at] as const])), areaMaterials.whiteSteel, frame.clone());
  kit.add(merge(`rn-1924-${facing}-glass`, () => ats.map((at) => [unit.glass, at] as const)), palette.glassDark, frame.clone());
}

function walls(kit: Kit): void {
  const y = MAIN_FLOOR_Y - 0.05;
  // West (park side in 1924) and north walls with windows; the east wall, close against the older wings, plain.
  windowedWall(kit, '-z', [(SOUTH_X + X1) / 2, y, Z0], X1 - SOUTH_X, 5);
  windowedWall(kit, '+x', [X1, y, (Z0 + Z1) / 2], Z1 - Z0 - 2 * T, 6);
  boxAt(kit, areaMaterials.buffWall, [SOUTH_X, y, Z1 - T], [X1, AW1924_PARAPET_Y, Z1]);
  // The south wall beside and above the bank facade, behind its front.
  boxAt(kit, areaMaterials.buffWall, [SOUTH_X - 0.6, y, Z0], [SOUTH_X, AW1924_PARAPET_Y, COURT.minZ]);
  boxAt(kit, areaMaterials.buffWall, [SOUTH_X - 0.6, y, COURT.maxZ], [SOUTH_X, AW1924_PARAPET_Y, Z1]);
  boxAt(kit, areaMaterials.buffWall, [SOUTH_X, MAIN_FLOOR_Y + 14.3, COURT.minZ], [SOUTH_X + 0.6, AW1924_PARAPET_Y, COURT.maxZ]);
  // A stone cornice band round the three plain sides.
  boxAt(kit, palette.limestoneDark, [SOUTH_X - 0.7, AW1924_ROOF_Y - 0.5, Z0 - 0.15], [X1 + 0.15, AW1924_ROOF_Y - 0.2, Z0 + 0.1]);
  boxAt(kit, palette.limestoneDark, [X1 - 0.1, AW1924_ROOF_Y - 0.5, Z0 - 0.15], [X1 + 0.15, AW1924_ROOF_Y - 0.2, Z1 + 0.15]);
}

function rooms(kit: Kit): void {
  // Upper floor plates, then the period rooms' partitions on all three floors.
  for (const level of LEVELS.slice(1)) boxAt(kit, areaMaterials.concrete, [SOUTH_X, level - 0.35, Z0 + T], [X1 - T, level, Z1 - T]);
  ROOMS.forEach((segments, floor) => {
    const base = LEVELS[floor] ?? MAIN_FLOOR_Y;
    const top = base + STOREY - 0.35;
    for (const [x0, z0, x1, z1] of segments) {
      const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      boxAt(kit, areaMaterials.roomPlaster, along ? [Math.min(x0, x1), base, z0 - 0.08] : [x0 - 0.08, base, Math.min(z0, z1)], along ? [Math.max(x0, x1), top, z0 + 0.08] : [x0 + 0.08, top, Math.max(z0, z1)]);
    }
  });
}

function roof(kit: Kit): void {
  boxAt(kit, palette.roofLead, [SOUTH_X, AW1924_ROOF_Y - 0.4, Z0 + T], [X1 - T, AW1924_ROOF_Y, Z1 - T]);
  boxAt(kit, palette.limestoneDark, [SOUTH_X - 0.65, AW1924_PARAPET_Y, Z0 - 0.05], [X1 + 0.05, AW1924_PARAPET_Y + 0.12, Z0 + T + 0.05]);
  boxAt(kit, palette.limestoneDark, [X1 - T - 0.05, AW1924_PARAPET_Y, Z0 - 0.05], [X1 + 0.05, AW1924_PARAPET_Y + 0.12, Z1 + 0.05]);
  boxAt(kit, palette.limestoneDark, [SOUTH_X - 0.65, AW1924_PARAPET_Y, Z1 - T - 0.05], [X1 - T - 0.05, AW1924_PARAPET_Y + 0.12, Z1 + 0.05]);
}

export const americanWing1924: readonly StepDef[] = [
  {
    id: 'american-1924-foundations',
    chapter: CHAPTER,
    year: '1922',
    title: 'Foundations of the 1924 American Wing',
    detail: "Grosvenor Atterbury's wing for American decorative arts rises north of the museum's rear wings, on a footing and a main-floor slab.",
    motion: { kind: 'rise' },
    stagger: 'x',
    weight: 0.7,
    build: foundations,
  },
  {
    id: 'american-1924-walls',
    chapter: CHAPTER,
    year: '1923',
    title: 'Walls of the period-room wing',
    detail: 'Three storeys of plain buff walls, windowed on the park and north sides, to light the period rooms within.',
    motion: { kind: 'grow' },
    stagger: 'z',
    build: walls,
  },
  {
    id: 'american-1924-rooms',
    chapter: CHAPTER,
    year: '1924',
    title: 'Floors and period rooms',
    detail: 'Upper floors and the rooms of colonial and Federal America, three storeys of them, on the lines of the present galleries.',
    motion: { kind: 'pop' },
    stagger: 'y',
    weight: 0.8,
    build: rooms,
  },
  {
    id: 'engelhard-bank-facade',
    chapter: CHAPTER,
    year: '1924',
    title: 'The Branch Bank facade, re-erected',
    detail: 'The marble front of the Branch Bank of the United States (Martin E. Thompson, 1822–24) moves from Wall Street to be the south face of the new wing.',
    motion: { kind: 'rise', distance: 2 },
    stagger: 'y',
    weight: 1.4,
    focus: { kind: 'preset', id: 'int-engelhard-north' },
    build: addBankFacade,
  },
  {
    id: 'american-1924-roof',
    chapter: CHAPTER,
    year: '1924',
    title: 'Roof of the 1924 American Wing',
    detail: 'A flat roof behind a parapet closes the wing, which opened on 10 November 1924.',
    motion: { kind: 'drop' },
    stagger: 'none',
    weight: 0.6,
    build: roof,
  },
];
