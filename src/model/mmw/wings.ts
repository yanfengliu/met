/**
 * The five McKim, Mead & White blocks as plan data: their outlines, the storeys and slabs each carries, and the voids through them.
 * Plan positions are the Met floor map's (interior.md, Plan source) moved into the world frame with MAP_Z_SHIFT, rounded to 5 cm; levels are dims.ts's.
 */
import { LEVEL_1, LEVEL_1M_SOUTH, LEVEL_2_FRONT, LEVEL_2_NORTH, LEVEL_3_NORTH, LEVEL_G, LINK_ROOF_Y, END_ROOF_Y, MORGAN, MORGAN_ROOF_Y, NORTH_END, NORTH_LINK, OUTER_WALL, PARTY_WALL, SLAB, SOUTH_END, SOUTH_LINK } from './dims.js';
import type { PlanBlock, PlanLevel } from './plan-data.js';

/** An axis-aligned plan rectangle [x0, z0, x1, z1] in world metres. */
export type Rect = readonly [number, number, number, number];

/** One floor of a block: the level its slab top sits at, the slab's extent and voids, and how high its walls rise. */
export interface Storey {
  readonly level: PlanLevel;
  readonly y: number;
  /** Where its walls stop: the underside of the slab above, or the roof deck. */
  readonly top: number;
  /** Slab extents; the slab is the union of these less `voids`. */
  readonly slab: readonly Rect[];
  readonly voids?: readonly Rect[];
}

export interface Wing {
  readonly block: PlanBlock;
  readonly name: string;
  readonly outline: readonly Rect[];
  readonly storeys: readonly Storey[];
  /** Openings in the roof deck: courts under skylights, and the light wells (exterior.md section 2), open from `wellFloor` to the sky. */
  readonly roofVoids: readonly Rect[];
  readonly lightWells: readonly { readonly rect: Rect; readonly floor: number }[];
}

/** Arms and Armor Court (gallery 371), open from the main floor to its vault over exactly its own footprint (interior.md). */
export const ARMOR_COURT: Rect = [57.15, -86.0, 92.6, -72.8];
/** The Astor Court (gallery 217) on the north end pavilion's second floor, and the Ming Room (gallery 218) at its north end (interior.md, The Astor Court). */
export const ASTOR_COURT: Rect = [112.55, -24.5, 131.55, -10.95];
export const MING_ROOM: Rect = [131.55, -24.5, 140.1, -10.95];
/** Leon Levy and Shelby White Court (gallery 162) with its porticoes, and the light well over its peristyle (map floor 2, X −132.13..−106.51). */
export const ROMAN_COURT: Rect = [-139.25, -32.05, -99.35, -2.5];
export const ROMAN_WELL: Rect = [-132.15, -25.6, -106.5, -9.65];

const inner = (x0: number, z0: number, x1: number, z1: number): Rect => [x0, z0, x1, z1];
const { x0: ex0, x1: ex1, z0: ez0, z1: ez1 } = NORTH_LINK;
const { x0: hx0, x1: hx1, z0: hz0, z1: hz1 } = NORTH_END;
const { x0: fx0, x1: fx1, z0: fz0, z1: fz1, stripX1, stripZ1 } = MORGAN;
const { x0: jx0, x1: jx1, z0: jz0, z1: jz1 } = SOUTH_LINK;
const { x0: kx0, x1: kx1, z0: kz0, z1: kz1 } = SOUTH_END;

/** The roof decks sit a slab's depth below their top surfaces: the links' and the end pavilions' (dims.ts tiers). */
const LINK_UNDERSIDE = LINK_ROOF_Y - SLAB;
const END_UNDERSIDE = END_ROOF_Y - SLAB;

const O = OUTER_WALL;
const P = PARTY_WALL;
/**
 * Each block's floor area inside its outer walls (inset OUTER_WALL) and party walls (inset PARTY_WALL); seams between this area's blocks and lines an older block
 * builds are not inset. The corner squares the projections' side walls fill (facade-layout.ts) are left out.
 */
const E_IN: readonly Rect[] = [[ex0, ez0, ex1, ez1 - O]];
const H_IN: readonly Rect[] = [
  [hx0, hz0, 118.0, ez1 - O],
  [118.0, hz0 + P, hx1 - O, ez1 - O],
  [hx0 + O, ez1 - O, hx1 - O, hz1 - O],
];
const F_IN: readonly Rect[] = [
  [fx0, fz0 + P, fx1 - P, fz1],
  [fx0, fz1, stripX1, stripZ1],
];
const J_IN: readonly Rect[] = [
  [jx0 + P, jz0 + P, jx1, -38.5],
  [jx0, -38.5, jx1, jz1 - O],
];
const K_IN: readonly Rect[] = [
  [kx0 + O, kz0 + P, kx1, jz1 - O],
  [kx0 + O, jz1 - O, kx1 - O, kz1 - O],
];

export const WINGS: readonly Wing[] = [
  {
    block: 'north-e',
    name: 'north link',
    outline: [[ex0, ez0, ex1, ez1]],
    storeys: [
      { level: 'G', y: LEVEL_G, top: LEVEL_1 - SLAB, slab: E_IN },
      { level: '1', y: LEVEL_1, top: LEVEL_2_FRONT - SLAB, slab: E_IN },
      { level: '2', y: LEVEL_2_FRONT, top: LINK_UNDERSIDE, slab: E_IN },
    ],
    roofVoids: [],
    // exterior.md section 2, well (3).
    lightWells: [{ rect: [76.2, -18.8, 85.1, -11.0], floor: LEVEL_2_FRONT }],
  },
  {
    block: 'north-h',
    name: 'north end pavilion',
    outline: [[hx0, hz0, hx1, hz1]],
    storeys: [
      { level: 'G', y: LEVEL_G, top: LEVEL_1 - SLAB, slab: H_IN },
      { level: '1', y: LEVEL_1, top: LEVEL_2_NORTH - SLAB, slab: H_IN },
      { level: '2', y: LEVEL_2_NORTH, top: END_UNDERSIDE, slab: H_IN },
      // Map floor 3: the front range and the 84th Street range.
      { level: '3', y: LEVEL_3_NORTH, top: END_UNDERSIDE, slab: [inner(101.9, -3.1, 133.35, hz1 - O), inner(140.1, -33.85, hx1 - O, -3.1)] },
    ],
    roofVoids: [ASTOR_COURT],
    lightWells: [],
  },
  {
    block: 'north-f',
    name: 'Morgan wing',
    outline: [
      [fx0, fz0, fx1, fz1],
      [fx0, fz1, stripX1, stripZ1],
    ],
    storeys: [
      { level: 'G', y: LEVEL_G, top: LEVEL_1 - SLAB, slab: F_IN },
      { level: '1', y: LEVEL_1, top: LEVEL_2_NORTH - SLAB, slab: F_IN },
      { level: '2', y: LEVEL_2_NORTH, top: MORGAN_ROOF_Y - SLAB, slab: F_IN, voids: [ARMOR_COURT] },
    ],
    roofVoids: [ARMOR_COURT],
    // exterior.md section 2, well (5), cut at the block line.
    lightWells: [{ rect: [95.6, -53.6, 98.8, -41.3], floor: LEVEL_2_NORTH }],
  },
  {
    block: 'south-j',
    name: 'south link',
    outline: [[jx0, jz0, jx1, jz1]],
    storeys: [
      { level: 'G', y: LEVEL_G, top: LEVEL_1 - SLAB, slab: J_IN },
      { level: '1', y: LEVEL_1, top: LEVEL_2_FRONT - SLAB, slab: J_IN },
      { level: '2', y: LEVEL_2_FRONT, top: LINK_UNDERSIDE, slab: J_IN },
    ],
    roofVoids: [],
    // exterior.md section 2, well (1).
    lightWells: [{ rect: [-60.4, -61.0, -51.5, -38.4], floor: LEVEL_2_FRONT }],
  },
  {
    block: 'south-k',
    name: 'south end pavilion',
    outline: [[kx0, kz0, kx1, kz1]],
    storeys: [
      { level: 'G', y: LEVEL_G, top: LEVEL_1 - SLAB, slab: K_IN },
      // The main floor rises two storeys in the court and galleries 160–161; elsewhere the mezzanine sits over it.
      { level: '1', y: LEVEL_1, top: LEVEL_1M_SOUTH - SLAB, slab: K_IN },
      // Map floor 1M: the Fifth Avenue range (gallery 171 and its corner) and the 80th Street range (gallery 170).
      { level: '1M', y: LEVEL_1M_SOUTH, top: LEVEL_2_FRONT - SLAB, slab: [inner(kx0 + O, -2.5, kx1 - O, kz1 - O), inner(-99.35, -7.8, kx1 - O, -2.5), inner(kx0 + O, -35.6, -139.25, -2.5)] },
      { level: '2', y: LEVEL_2_FRONT, top: END_UNDERSIDE, slab: K_IN, voids: [ROMAN_WELL] },
    ],
    roofVoids: [ROMAN_WELL],
    lightWells: [],
  },
];

/** Whether a plan point lies inside any of the rectangles. */
export function insideAny(rects: readonly Rect[], x: number, z: number): boolean {
  return rects.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
}

/** The rectangle less the holes, as disjoint rectangles: strips between the holes' X edges, each cut by the holes' Z intervals. */
export function subtract(rect: Rect, holes: readonly Rect[]): Rect[] {
  const [x0, z0, x1, z1] = rect;
  const clipped = holes.map(([a, b, c, d]): Rect => [Math.max(a, x0), Math.max(b, z0), Math.min(c, x1), Math.min(d, z1)]).filter(([a, b, c, d]) => c > a && d > b);
  const xs = [...new Set([x0, x1, ...clipped.flatMap(([a, , c]) => [a, c])])].sort((p, q) => p - q);
  const out: Rect[] = [];
  for (let i = 0; i + 1 < xs.length; i += 1) {
    const sx0 = xs[i] ?? x0;
    const sx1 = xs[i + 1] ?? x1;
    const mid = (sx0 + sx1) / 2;
    const cuts = clipped.filter(([a, , c]) => a < mid && c > mid).map(([, b, , d]) => [b, d] as const).sort((p, q) => p[0] - q[0]);
    let z = z0;
    for (const [b, d] of cuts) {
      if (b > z) out.push([sx0, z, sx1, b]);
      z = Math.max(z, d);
    }
    if (z1 > z) out.push([sx0, z, sx1, z1]);
  }
  return out;
}
