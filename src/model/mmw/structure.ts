/**
 * Structure of the McKim, Mead & White blocks: footings and the ground-floor slab, the upper floor slabs with their voids, and the interior walls on the
 * floor map's room lines (plan-data.ts). Every builder takes the wings it builds, so the north (1906–1913) and south (1914–1926) campaigns are separate steps.
 */
import type { Material } from 'three';

import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { FOOTING_DEPTH, LEVEL_G, OUTER_WALL, SLAB } from './dims.js';
import { MAP_WALLS } from './plan-data.js';
import { addBox } from './shapes.js';
import { insideAny, subtract } from './wings.js';
import type { Rect, Storey, Wing } from './wings.js';

/** Interior masonry partitions on the map's room lines, centred on them. E: the section cut reads them as solid. The collection hangs a relief on one (src/model/collection/spaces-b.ts). */
export const PARTITION = 0.45;

/** Lays one slab: the union of `rects` less `voids`, its top at `y`. */
function slab(kit: Kit, material: Material, rects: readonly Rect[], voids: readonly Rect[], y: number, thickness: number, order: number): void {
  for (const rect of rects) {
    for (const [x0, z0, x1, z1] of subtract(rect, voids)) addBox(kit, material, x0, y - thickness, z0, x1, y, z1, order);
  }
}

/** Footings under each block's outline and the ground-floor slab over them. */
export function buildFoundations(kit: Kit, wings: readonly Wing[]): void {
  wings.forEach((wing, w) => {
    for (const [x0, z0, x1, z1] of wing.outline) {
      // A strip footing under each outer edge, then the mat.
      const y0 = LEVEL_G - SLAB - FOOTING_DEPTH;
      const y1 = LEVEL_G - SLAB;
      const t = OUTER_WALL + 0.8;
      addBox(kit, palette.granite, x0, y0, z0, x1, y1, z0 + t, w * 10);
      addBox(kit, palette.granite, x0, y0, z1 - t, x1, y1, z1, w * 10);
      addBox(kit, palette.granite, x0, y0, z0 + t, x0 + t, y1, z1 - t, w * 10);
      addBox(kit, palette.granite, x1 - t, y0, z0 + t, x1, y1, z1 - t, w * 10);
    }
    const ground = wing.storeys.find((s) => s.level === 'G');
    if (ground !== undefined) slab(kit, palette.sidewalk, ground.slab, ground.voids ?? [], ground.y, SLAB, w * 10 + 1);
  });
}

/** The upper floor slabs (main floor and up) of each wing, lowest first. */
export function buildFloors(kit: Kit, wings: readonly Wing[]): void {
  wings.forEach((wing, w) => {
    wing.storeys.forEach((storey, s) => {
      if (storey.level === 'G') return;
      slab(kit, palette.stoneFloor, storey.slab, storey.voids ?? [], storey.y, SLAB, w * 10 + s);
    });
  });
}

/** Where a wall standing on `storey` stops: under the first slab above that covers its midpoint, else at the storey's own top (the roof deck). */
function wallTop(wing: Wing, index: number, storey: Storey, x: number, z: number): number {
  for (const above of wing.storeys.slice(index + 1)) {
    if (insideAny(above.slab, x, z) && !insideAny(above.voids ?? [], x, z)) return above.y - SLAB;
  }
  return storey.top;
}

/** Interior walls on the floor map's lines, storey by storey. */
export function buildPartitions(kit: Kit, wings: readonly Wing[], skip: readonly Rect[] = []): void {
  wings.forEach((wing, w) => {
    const walls = MAP_WALLS[wing.block];
    wing.storeys.forEach((storey, s) => {
      for (const [x0, z0, x1, z1] of walls[storey.level] ?? []) {
        const mx = (x0 + x1) / 2;
        const mz = (z0 + z1) / 2;
        if (insideAny(skip, mx, mz)) continue;
        const top = wallTop(wing, s, storey, mx, mz);
        const half = PARTITION / 2;
        if (x0 === x1) addBox(kit, palette.plaster, x0 - half, storey.y, Math.min(z0, z1), x0 + half, top, Math.max(z0, z1), w * 10 + s);
        else addBox(kit, palette.plaster, Math.min(x0, x1), storey.y, z0 - half, Math.max(x0, x1), top, z0 + half, w * 10 + s);
      }
    });
  });
}
