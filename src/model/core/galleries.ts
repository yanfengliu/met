/**
 * Interiors and roofs shared by the three core blocks: the second-floor picture galleries on the floor map's grid (walls, laylight frames), the
 * wings' main-floor walls, the light wells, and the flat roofs with their skylight curbs and frames. The skylight glass is added in 2023
 * (europeanPaintingsGlazing2023Steps). Walls are unit boxes, so every wall of a step batches into one instanced mesh.
 */
import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { GALLERY_CEILING_Y, L1, L2, PARTITION, ROOF_Y, SLAB, VAUX_HALL_EAST_Z, VAUX_HALL_WALL, VAUX_HALL_WEST_Z } from './constants.js';
import { INTERIOR, LIGHT_WELLS, galleriesIn, intersect, subtractRects, type BlockId, type Rect } from './layout.js';
import { GALLERY_RUNS, MAIN_FLOOR_RUNS, type Run } from './plan-data.js';
import { laylightFrame, laylightGlass, skylightFrames, skylightGlass } from './skylights.js';
import { addBox, runsBetween } from './shapes.js';

/** The parts of a run inside a block's interior and outside its light wells (with their walls), as plan rectangles `PARTITION` thick. */
function runRects(run: Run, block: BlockId): Rect[] {
  const [axis, fixed, from, to] = run;
  const half = PARTITION / 2;
  const r: Rect = axis === 0 ? [from, fixed - half, to, fixed + half] : [fixed - half, from, fixed + half, to];
  const inside = intersect(r, INTERIOR[block]);
  if (inside === null) return [];
  // A run must keep its own thickness: one clipped across its width belongs to the next block.
  const thick = axis === 0 ? inside[3] - inside[1] : inside[2] - inside[0];
  if (thick < PARTITION - 1e-6) return [];
  const gaps = LIGHT_WELLS[block]
    .map(([x0, z0, x1, z1]): Rect => [x0 - 0.45, z0 - 0.45, x1 + 0.45, z1 + 0.45])
    .filter((w) => intersect(w, inside) !== null)
    .map((w) => (axis === 0 ? ([w[0], w[2]] as const) : ([w[1], w[3]] as const)));
  const [lo, hi] = axis === 0 ? [inside[0], inside[2]] : [inside[1], inside[3]];
  return runsBetween(lo, hi, gaps, 0.6).map(([a, b]): Rect => (axis === 0 ? [a, inside[1], b, inside[3]] : [inside[0], a, inside[2], b]));
}

/** Runs that would double the hall's end walls in block A. */
function nearHallEnds(r: Rect): boolean {
  const z = (r[1] + r[3]) / 2;
  const west = VAUX_HALL_WEST_Z - VAUX_HALL_WALL / 2;
  const east = VAUX_HALL_EAST_Z + VAUX_HALL_WALL / 2;
  return r[3] - r[1] < 1 && (Math.abs(z - west) < 0.9 || Math.abs(z - east) < 0.9);
}

/** Second-floor gallery walls of a block, from the floor to the laylight ceiling (plaster). */
export function galleryWalls(kit: Kit, block: BlockId): void {
  for (const run of GALLERY_RUNS) {
    for (const r of runRects(run, block)) {
      if (block === 'a' && nearHallEnds(r)) continue;
      addBox(kit, palette.plaster, r[0], L2, r[1], r[2], GALLERY_CEILING_Y, r[3], Math.round(r[1]));
    }
  }
}

/** A doorway through wing B's south front (weston-facade.ts WESTON_DOOR): the middle of its opening along Z and its width. */
export interface FrontDoorway {
  readonly z: number;
  readonly width: number;
}

/**
 * `runs` with any wall that the map stands in `doorway`'s opening from the front moved onto the line of the nearer reveal, its face continuing the
 * reveal, and the walls that end on it following it. The 1888 door has one: the wall between galleries 528 and 529 (map Z −104.7), moved 0.45 m
 * west. The decoded floor map (interior.md, Plan source) has the door in the middle of gallery 529, its opening on the old front's line from
 * Z −102.73 to −99.21, but the model's pavilion stands at the facade's middle, 2.68 m west of that, so on the map's line this wall stood 0.45 m
 * inside the doorway and in the swing of the door's west leaf, which opens into the building (src/model/door-fit.test.ts).
 */
function clearOf(runs: readonly Run[], doorway: FrontDoorway): Run[] {
  const half = PARTITION / 2;
  const z0 = doorway.z - doorway.width / 2;
  const z1 = doorway.z + doorway.width / 2;
  const moved = runs.flatMap(([axis, fixed, from, to]) => (axis === 0 && from <= INTERIOR.b[0] && fixed + half > z0 && fixed - half < z1 ? [{ fixed, from, to, line: fixed < doorway.z ? z0 - half : z1 + half }] : []));
  return runs.map((run): Run => {
    const [axis, fixed, from, to] = run;
    const wall = moved.find((m) => (axis === 0 ? m.fixed === fixed && m.from === from : fixed >= m.from && fixed <= m.to && (from === m.fixed || to === m.fixed)));
    if (wall === undefined) return run;
    if (axis === 0) return [0, wall.line, from, to];
    return [1, fixed, from === wall.fixed ? wall.line : from, to === wall.fixed ? wall.line : to];
  });
}

/** Main-floor walls of a wing (blocks B and C), from the floor to the second-floor slab (plaster), keeping out of `doorway`'s opening (`clearOf`). */
export function mainFloorWalls(kit: Kit, block: BlockId, doorway?: FrontDoorway): void {
  for (const run of doorway === undefined ? MAIN_FLOOR_RUNS : clearOf(MAIN_FLOOR_RUNS, doorway)) {
    for (const r of runRects(run, block)) addBox(kit, palette.plaster, r[0], L1, r[1], r[2], L2 - SLAB, r[3], Math.round(r[1]));
  }
}

/** Laylight frames of a block's galleries. */
export function laylightFrames(kit: Kit, block: BlockId): void {
  for (const g of galleriesIn(block)) laylightFrame(kit, g, Math.round(g.rect[1]));
}

/** Brick walls round a block's light wells, from the main floor to just above the roof. */
export function lightWellWalls(kit: Kit, block: BlockId): void {
  const t = 0.45;
  for (const [x0, z0, x1, z1] of LIGHT_WELLS[block]) {
    const y0 = L1;
    const y1 = ROOF_Y + 0.5;
    addBox(kit, palette.brick, x0 - t, y0, z0 - t, x1 + t, y1, z0, 0);
    addBox(kit, palette.brick, x0 - t, y0, z1, x1 + t, y1, z1 + t, 1);
    addBox(kit, palette.brick, x0 - t, y0, z0, x0, y1, z1, 2);
    addBox(kit, palette.brick, x1, y0, z0, x1 + t, y1, z1, 3);
  }
}

/** Plan rectangles of a slab over a block, minus the light wells (with their walls) and any other holes. */
export function slabRects(block: BlockId, holes: readonly Rect[] = []): Rect[] {
  const wells = LIGHT_WELLS[block].map(([x0, z0, x1, z1]): Rect => [x0 - 0.45, z0 - 0.45, x1 + 0.45, z1 + 0.45]);
  return subtractRects(INTERIOR[block], [...wells, ...holes]);
}

/** The flat roof of a block between the skylight openings, the curbs and frames of its skylights; `holes` are kept open (block A's nave). */
export function roofWithSkylights(kit: Kit, block: BlockId, holes: readonly Rect[] = []): void {
  const galleries = galleriesIn(block);
  const openings = galleries.flatMap((g) => (g.opening === null ? [] : [g.opening]));
  for (const r of slabRects(block, [...openings, ...holes])) addBox(kit, palette.roofLead, r[0], GALLERY_CEILING_Y, r[1], r[2], ROOF_Y, r[3], Math.round(r[1]));
  for (const g of galleries) skylightFrames(kit, g, Math.round(g.rect[1]) + 1);
}

/** The renewed glass of a block's skylights and laylights (2023). */
export function skylightAndLaylightGlass(kit: Kit, block: BlockId): void {
  for (const g of galleriesIn(block)) {
    const order = Math.round(g.rect[1]);
    skylightGlass(kit, g, order);
    laylightGlass(kit, g, order);
  }
}
