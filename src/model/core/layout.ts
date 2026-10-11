/**
 * Plan layout of the core blocks: their interiors inside the outer walls, the second-floor galleries clipped to them, each gallery's skylight
 * opening, the light wells and the nave of the Medieval Sculpture Hall, and a decomposition of a rectangle minus holes into rectangles
 * (for floor and roof slabs). Plan rectangles are [x0, z0, x1, z1] in world metres with x0 < x1 and z0 < z1.
 */
import { A_HALF, B_SOUTH_X, C_NORTH_X, EAST_Z, HALL_NAVE_WALL, HALL_PIER_X, LIGHT_WELL_B, LIGHT_WELL_C, OUTER_WALL, PARTY_WALL, SKYLIGHT_INSET, VAUX_HALL_EAST_Z, VAUX_HALL_WEST_Z, WEST_WALL, WEST_Z } from './constants.js';
import { GALLERY_ROOMS } from './plan-data.js';

export type Rect = readonly [x0: number, z0: number, x1: number, z1: number];
export type BlockId = 'a' | 'b' | 'c';

/** Inside faces of the outer walls: west walls WEST_WALL thick, east, south and north walls OUTER_WALL, block A's side walls PARTY_WALL. */
export const INNER_WEST_Z = WEST_Z + WEST_WALL;
export const INNER_EAST_Z = EAST_Z - OUTER_WALL;
export const INTERIOR: Readonly<Record<BlockId, Rect>> = {
  a: [-A_HALF + PARTY_WALL, INNER_WEST_Z, A_HALF - PARTY_WALL, INNER_EAST_Z],
  b: [B_SOUTH_X + OUTER_WALL, INNER_WEST_Z, -A_HALF, INNER_EAST_Z],
  c: [A_HALF, INNER_WEST_Z, C_NORTH_X - OUTER_WALL, INNER_EAST_Z],
};

export const LIGHT_WELLS: Readonly<Record<BlockId, readonly Rect[]>> = {
  a: [],
  b: [[LIGHT_WELL_B[0], LIGHT_WELL_B[2], LIGHT_WELL_B[1], LIGHT_WELL_B[3]]],
  c: [[LIGHT_WELL_C[0], LIGHT_WELL_C[2], LIGHT_WELL_C[1], LIGHT_WELL_C[3]]],
};

/** The hall's nave between the outer faces of its nave walls, end wall to end wall: open from the main floor to the vault. */
export const NAVE_OUTER_X = HALL_PIER_X + HALL_NAVE_WALL / 2;
export const NAVE: Rect = [-NAVE_OUTER_X, VAUX_HALL_WEST_Z, NAVE_OUTER_X, VAUX_HALL_EAST_Z];

export function blockOf(x: number): BlockId {
  return x < -A_HALF ? 'b' : x > A_HALF ? 'c' : 'a';
}

export function intersect(a: Rect, b: Rect): Rect | null {
  const r: Rect = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return r[2] - r[0] > 1e-6 && r[3] - r[1] > 1e-6 ? r : null;
}

export interface Gallery {
  readonly number: number;
  readonly block: BlockId;
  /** The room clipped to its block's interior (and, in block A, to the aisles beside the nave). */
  readonly rect: Rect;
  /** The skylight opening in the roof and the laylight under it, or null for a room too small for one. */
  readonly opening: Rect | null;
}

function galleryOf(number: number, raw: Rect): Gallery | null {
  const cx = (raw[0] + raw[2]) / 2;
  const block = blockOf(cx);
  let rect = intersect(raw, INTERIOR[block]);
  if (rect === null) return null;
  if (block === 'a' && rect[1] < NAVE[3] && rect[3] > NAVE[1]) {
    // The aisle galleries stop at the nave walls.
    rect = cx < 0 ? intersect(rect, [-100, -200, -NAVE_OUTER_X, 0]) : intersect(rect, [NAVE_OUTER_X, -200, 100, 0]);
    if (rect === null) return null;
  }
  const inset = SKYLIGHT_INSET;
  const opening: Rect = [rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset];
  const ok = opening[2] - opening[0] >= 2.4 && opening[3] - opening[1] >= 2.4;
  return { number, block, rect, opening: ok ? opening : null };
}

/** Galleries 600-644 in the core blocks. */
export const GALLERIES: readonly Gallery[] = GALLERY_ROOMS.flatMap(([n, x0, z0, x1, z1]) => {
  const g = galleryOf(n, [x0, z0, x1, z1]);
  return g === null ? [] : [g];
});

export function galleriesIn(block: BlockId): Gallery[] {
  return GALLERIES.filter((g) => g.block === block);
}

/**
 * Rectangles covering `outer` minus `holes` without overlap: a grid on every hole edge, free cells merged into runs along X, then runs with
 * equal extents merged along Z. Holes may overlap each other or reach past `outer`.
 */
export function subtractRects(outer: Rect, holes: readonly Rect[]): Rect[] {
  const clipped = holes.map((h) => intersect(h, outer)).filter((h): h is Rect => h !== null);
  const xs = [...new Set([outer[0], outer[2], ...clipped.flatMap((h) => [h[0], h[2]])])].sort((a, b) => a - b);
  const zs = [...new Set([outer[1], outer[3], ...clipped.flatMap((h) => [h[1], h[3]])])].sort((a, b) => a - b);
  const inHole = (x: number, z: number): boolean => clipped.some((h) => x > h[0] && x < h[2] && z > h[1] && z < h[3]);
  const out: [number, number, number, number][] = [];
  let previous: [number, number, number, number][] = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    const z0 = zs[j] ?? 0;
    const z1 = zs[j + 1] ?? 0;
    const row: [number, number, number, number][] = [];
    for (let i = 0; i + 1 < xs.length; i++) {
      const x0 = xs[i] ?? 0;
      const x1 = xs[i + 1] ?? 0;
      if (inHole((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      const last = row[row.length - 1];
      if (last !== undefined && Math.abs(last[2] - x0) < 1e-9) last[2] = x1;
      else row.push([x0, z0, x1, z1]);
    }
    const next: [number, number, number, number][] = [];
    for (const r of row) {
      const above = previous.find((p) => Math.abs(p[0] - r[0]) < 1e-9 && Math.abs(p[2] - r[2]) < 1e-9 && Math.abs(p[3] - r[1]) < 1e-9);
      if (above !== undefined) {
        above[3] = r[3];
        next.push(above);
      } else {
        out.push(r);
        next.push(r);
      }
    }
    previous = next;
  }
  return out;
}

/** The ridge skylights over an opening: one ridge along its longer side, or several side by side when it is wider than `maxSpan`. */
export function ridgesOver(opening: Rect, maxSpan = 7): { rect: Rect; alongX: boolean }[] {
  const dx = opening[2] - opening[0];
  const dz = opening[3] - opening[1];
  const alongX = dx >= dz;
  const across = alongX ? dz : dx;
  const count = Math.max(1, Math.ceil(across / maxSpan));
  const step = across / count;
  return Array.from({ length: count }, (_, k) => {
    const rect: Rect = alongX ? [opening[0], opening[1] + k * step, opening[2], opening[1] + (k + 1) * step] : [opening[0] + k * step, opening[1], opening[0] + (k + 1) * step, opening[3]];
    return { rect, alongX };
  });
}
