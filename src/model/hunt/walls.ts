/**
 * Hunt wing, the limestone walls (1898–1900): the pavilion's front wall in two layers (a rusticated skin with the arches' outer order and the niches,
 * and the thick body behind it with the inner order), its rusticated end piers, the flanking extensions' fronts, the side walls on the
 * McKim, Mead & White seams, and the Great Hall's end and west walls that rise above the extensions' roofs.
 * Evidence: S7 (Schneider 2019) at 1:1 for the arches, piers and extensions; S9 (Epicgenius 2023 #30) for the end piers' rustication; floor map for the hall walls.
 */
import * as THREE from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { wall, type Opening } from '../lib/index.js';
import {
  ARCH_INNER_SPAN,
  ARCH_OUTER_SPAN,
  ARCH_SKIN,
  ARCH_SPRING_Y,
  BACK_Z,
  BAY_X,
  CORNICE_TOP_Y,
  END_PIER_FRONT_Z,
  END_PIER_WIDTH,
  EXT_BASE_TOP_Y,
  EXT_FACE_Z,
  EXT_NORTH_X,
  EXT_PARAPET_Y,
  EXT_SOUTH_X,
  EXT_WALL_T,
  HALL_END_WALL_X,
  HALL_WEST_WALL_Z,
  HALL_WEST_Z,
  HALL_X,
  LANDING,
  SECOND,
  ATTIC_BACK_Z,
  MAIN,
  PAIR_X,
  PAVILION_HALF,
  SEAM_PASSAGE_NORTH,
  SEAM_PASSAGE_SOUTH,
  SLAB,
  STAIR_HALF,
  WALL_BACK_Z,
  WALL_Z,
  COLUMN_TOP_Y,
} from './dims.js';
import { FOUNDATION_TOP } from './podium.js';
import { at, box } from './shapes.js';

/** Banded rustication: courses of 0.6 m with 9 cm channels 8 cm deep (S7, S9: the end piers' bands read from across the avenue). */
const RUSTICATION = { course: 0.6, joint: 0.09, depth: 0.08 } as const;

/**
 * Eaves of the Great Hall's roof on its end and west walls and behind the attic: just under the sight lines over the wings' parapets (S9 from the
 * north-east and S7 from the avenue show only sky beside and above the pavilion), so the roof rises from here toward its skylight.
 */
export const HALL_EAVES_Y = 22.8;
/** The Grand Staircase's barrel vault (X ±3.69) springs here and the hall's west wall opens to its crown. */
export const STAIR_VAULT_SPRING_Y = 22.4;
/** Top of the stair hall's walls, where its pitched roof sits. */
export const STAIR_GABLE_TOP_Y = STAIR_VAULT_SPRING_Y + 3.69 + 0.3;

/** The niches in the piers between the columns of each pair (S7: round-headed, 1.5 m wide, from Y 6.5 to 10.5). */
export const NICHE = { width: 1.5, sill: 6.5, top: 10.5 } as const;

const SKIN_HALF = PAVILION_HALF - END_PIER_WIDTH;
const WALL_H = CORNICE_TOP_Y - LANDING;

function skinOpenings(): Opening[] {
  const arches: Opening[] = BAY_X.map((x) => ({ shape: 'arch', x, y: 0, width: ARCH_OUTER_SPAN, height: ARCH_SPRING_Y + ARCH_OUTER_SPAN / 2 - LANDING }));
  const niches: Opening[] = PAIR_X.map((x) => ({ shape: 'arch', x, y: NICHE.sill - LANDING, width: NICHE.width, height: NICHE.top - NICHE.sill }));
  return [...arches, ...niches];
}

/** The pavilion's front: skin (outer order, niches, rustication to the imposts) and body (inner order), both from the landing to the cornice top. */
function pavilionFront(kit: Kit): void {
  const skin = wall({ width: 2 * SKIN_HALF, height: WALL_H, thickness: ARCH_SKIN, openings: skinOpenings(), rustication: { ...RUSTICATION, stop: ARCH_SPRING_Y - LANDING - 0.3 } });
  kit.add(skin, palette.limestone, at(0, LANDING, WALL_Z), 1);
  const body = wall({
    width: 2 * PAVILION_HALF - 0.04,
    height: WALL_H,
    thickness: -WALL_BACK_Z - ARCH_SKIN,
    openings: BAY_X.map((x) => ({ shape: 'arch', x, y: 0, width: ARCH_INNER_SPAN, height: ARCH_SPRING_Y + ARCH_INNER_SPAN / 2 - LANDING })),
  });
  kit.add(body, palette.limestone, at(0, LANDING, WALL_Z - ARCH_SKIN), 0);
}

/** Rusticated end piers at the pavilion's corners: a front-banded and a side-banded block, each 1 cm inside the other's banded face. */
function endPiers(kit: Kit): void {
  const depth = END_PIER_FRONT_Z - EXT_FACE_Z;
  const height = COLUMN_TOP_Y - LANDING;
  const front = wall({ width: END_PIER_WIDTH - 0.01, height, thickness: depth - 0.01, rustication: RUSTICATION });
  const side = wall({ width: depth - 0.01, height, thickness: END_PIER_WIDTH - 0.01, rustication: RUSTICATION });
  for (const sign of [-1, 1]) {
    const cx = sign * (PAVILION_HALF - END_PIER_WIDTH / 2) - sign * 0.005;
    kit.add(front, palette.limestone, at(cx, LANDING, END_PIER_FRONT_Z), 2);
    kit.add(side, palette.limestone, at(sign * PAVILION_HALF, LANDING, (END_PIER_FRONT_Z + EXT_FACE_Z) / 2 - 0.005, (sign * Math.PI) / 2), 2);
  }
}

/** S7 at the pavilion's ends: the pediments' tops at about Y 11.6 (window 5.0 m from a sill at 5.4), windows 5.15 m either side of each wing's middle. */
export const EXT_WINDOW = { width: 2.3, sill: 5.4, height: 5.0, offset: 5.15, groundWidth: 1.3, groundSill: 1.2, groundHeight: 1.9 } as const;
/** S7: a recessed panel over each window (Y 14.3–16.1) and one between the caryatids. */
export const EXT_PANEL = { width: 2.6, sill: 13.9, height: 2.2, centreWidth: 3.6, centreSill: 13.4, centreHeight: 3.6 } as const;

/** One extension front, X from x0 to x1: rusticated base with ground-floor windows, two tall windows, three recessed panels, up to the parapet. */
function extensionFront(kit: Kit, x0: number, x1: number, order: number): void {
  const width = x1 - x0;
  const cx = (x0 + x1) / 2;
  const openings: Opening[] = [];
  for (const s of [-1, 1]) {
    openings.push({ x: s * EXT_WINDOW.offset, y: EXT_WINDOW.groundSill, width: EXT_WINDOW.groundWidth, height: EXT_WINDOW.groundHeight });
    openings.push({ x: s * EXT_WINDOW.offset, y: EXT_WINDOW.sill, width: EXT_WINDOW.width, height: EXT_WINDOW.height });
    openings.push({ x: s * EXT_WINDOW.offset, y: EXT_PANEL.sill, width: EXT_PANEL.width, height: EXT_PANEL.height, depth: 0.15 });
  }
  openings.push({ x: 0, y: EXT_PANEL.centreSill, width: EXT_PANEL.centreWidth, height: EXT_PANEL.centreHeight, depth: 0.15 });
  // From the footings (below the site's excavation pad) to the parapet: openings and rustication are measured from grade, so shift them by the depth.
  const depth = -FOUNDATION_TOP;
  const shifted = openings.map((o) => ({ ...o, y: (o.y ?? 0) + depth }));
  const front = wall({ width, height: EXT_PARAPET_Y + depth, thickness: EXT_WALL_T, openings: shifted, rustication: { ...RUSTICATION, start: depth + RUSTICATION.course, stop: depth + EXT_BASE_TOP_Y - 0.35 } });
  kit.add(front, palette.limestone, at(cx, FOUNDATION_TOP, EXT_FACE_Z), order);
}

/** The Great Hall's end walls (doors at both floors) and west wall (the stair's arched opening, doors), up to the eaves above the wings' roofs. */
function hallWalls(kit: Kit, floor: number, wingTop: number): void {
  const height = HALL_EAVES_Y - floor;
  const lift = MAIN - floor;
  const span = HALL_WEST_WALL_Z - WALL_BACK_Z;
  const mid = (HALL_WEST_WALL_Z + WALL_BACK_Z) / 2;
  // End walls, laid along Z: doors to the galleries north and south on the main floor and the balcony floor (local x runs toward −Z).
  const endDoors = (z: number, y: number, w: number, h: number): Opening => ({ x: mid - z, y, width: w, height: h });
  const end = wall({
    width: -span,
    height,
    thickness: HALL_END_WALL_X - HALL_X,
    // Symmetric about the wall's middle, so the same geometry serves both ends (one is the other turned half round).
    openings: [
      endDoors(mid - 4.3, lift, 2.0, 4.6),
      endDoors(mid, lift, 2.6, 5.2),
      endDoors(mid + 4.3, lift, 2.0, 4.6),
      endDoors(mid + 11.95, lift, 1.8, 4.0),
      endDoors(mid - 11.95, lift, 1.8, 4.0),
      endDoors(mid + 11.95, SECOND - floor, 1.8, 3.6),
      endDoors(mid - 11.95, SECOND - floor, 1.8, 3.6),
    ],
  });
  kit.add(end, palette.limestone, at(-HALL_X, floor, mid, Math.PI / 2), 5);
  kit.add(end, palette.limestone, at(HALL_X, floor, mid, -Math.PI / 2), 5);
  // Over the wings' parapets the pavilion's sides close back from the front wall to the hall's end walls.
  box(kit, palette.limestone, [-HALL_END_WALL_X, wingTop, WALL_BACK_Z], [-PAVILION_HALF, HALL_EAVES_Y, EXT_FACE_Z - 0.02], 5);
  box(kit, palette.limestone, [PAVILION_HALF, wingTop, WALL_BACK_Z], [HALL_END_WALL_X, HALL_EAVES_Y, EXT_FACE_Z - 0.02], 5);
  // West wall: the Grand Staircase's opening to the eaves and doors to the galleries behind on both floors; over the opening the stair hall's
  // end wall rises above the eaves with the arch of its barrel vault.
  const west = wall({
    width: 2 * HALL_END_WALL_X,
    height,
    thickness: HALL_WEST_Z - HALL_WEST_WALL_Z,
    openings: [
      { x: 0, y: lift, width: 2 * STAIR_HALF, height: height - lift - 0.01 },
      { x: -16, y: lift, width: 2.0, height: 4.4 },
      { x: 16, y: lift, width: 2.0, height: 4.4 },
      { x: -16, y: SECOND - floor, width: 2.0, height: 3.8 },
      { x: 16, y: SECOND - floor, width: 2.0, height: 3.8 },
    ],
  });
  kit.add(west, palette.limestone, at(0, floor, HALL_WEST_Z), 6);
  const gable = wall({
    width: 2 * STAIR_HALF + 2.9,
    height: STAIR_GABLE_TOP_Y - STAIR_VAULT_SPRING_Y,
    thickness: HALL_WEST_Z - HALL_WEST_WALL_Z,
    openings: [{ shape: 'arch', x: 0, y: 0, width: 2 * STAIR_HALF, height: STAIR_HALF + 0.02 }],
  });
  kit.add(gable, palette.limestone, at(0, STAIR_VAULT_SPRING_Y, HALL_WEST_Z), 6);
  // The front wall's body rises behind the attic to the eaves, where the hall's roof sits.
  box(kit, palette.limestone, [-PAVILION_HALF + 0.02, CORNICE_TOP_Y, WALL_BACK_Z], [PAVILION_HALF - 0.02, HALL_EAVES_Y, ATTIC_BACK_Z], 7);
}

const SEAM_WALL_T = 1.2;

/**
 * A side wall on a McKim, Mead & White seam, from Z −69 to the extension's front, `floor` to `top`, with its main-floor passage (dims.ts SEAM_PASSAGE_*)
 * from the main floor to the underside of the second floor. `x` is its face toward the hall; `side` is +1 for the north wall (its body to +X), −1 for the south.
 */
function seamWall(kit: Kit, x: number, side: 1 | -1, passage: { readonly z0: number; readonly z1: number }, floor: number, top: number, order: number): void {
  const z0 = BACK_Z;
  const z1 = EXT_FACE_Z - 0.02;
  const mid = (z0 + z1) / 2;
  // Turned so the wall runs along Z, its front face on X = x toward the hall: in its own frame, x then runs toward +Z on the north wall and −Z on the south.
  const along = (z: number): number => side * (z - mid);
  const geometry = wall({
    width: z1 - z0,
    height: top - floor,
    thickness: SEAM_WALL_T,
    openings: [{ x: (along(passage.z0) + along(passage.z1)) / 2, y: MAIN - floor, width: passage.z1 - passage.z0, height: SECOND - SLAB - MAIN }],
  });
  kit.add(geometry, palette.limestone, at(x, floor, mid, (-side * Math.PI) / 2), order);
}

export const wallSteps: readonly StepDef[] = [
  {
    id: 'hunt-walls',
    chapter: 'hunt-1902',
    year: '1899',
    title: 'Raise the limestone walls',
    detail: "Indiana limestone walls rise on the steel frame: the pavilion's thick front with its three arched openings and niches, its banded end piers, and the lower flanking wings.",
    motion: { kind: 'grow' },
    stagger: 'order',
    weight: 1.4,
    build(kit) {
      pavilionFront(kit);
      endPiers(kit);
      extensionFront(kit, EXT_SOUTH_X, -PAVILION_HALF, 3);
      extensionFront(kit, PAVILION_HALF, EXT_NORTH_X, 3);
      const top = EXT_PARAPET_Y;
      const floor = MAIN - SLAB;
      // Side walls on the McKim, Mead & White seams, each with the main floor's passage into the wing beyond, and the extensions' inner walls against the hall.
      seamWall(kit, EXT_SOUTH_X + SEAM_WALL_T, -1, SEAM_PASSAGE_SOUTH, floor, top, 4);
      seamWall(kit, EXT_NORTH_X - SEAM_WALL_T, 1, SEAM_PASSAGE_NORTH, floor, top, 4);
      hallWalls(kit, floor, top);
    },
  },
];

/** The pier between the columns of each pair: where the niches and panels sit. Used by the sculpture builder. */
export function nicheCentres(): THREE.Vector3[] {
  return PAIR_X.map((x) => new THREE.Vector3(x, NICHE.sill, WALL_Z - ARCH_SKIN));
}
