/**
 * Geometries of the McKim, Mead & White fronts: the wall modules of one bay (arched-window bay, door bay, end bay with its tall niche, plain pier),
 * the window, door and archivolt parts that fill them, and the antefix of the cresting. Each function returns the cached part for its parameters, so every
 * bay of a kind is one shared geometry (docs/design/spec.md, Batching).
 *
 * Wall-module frame (the parts library's wall.ts): origin at the bottom centre of the front face, the wall spans y from 0 (the foot, under the ground floor)
 * to wallHeight(tier) (the tier's crowning cornice top) and z from −OUTER_WALL to 0. World heights below are converted with `local`.
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { archivolt, doorUnit, keystone, MeshBuilder, wall, windowUnit } from '../lib/index.js';
import type { DoorParts, Opening, Rustication, WindowParts } from '../lib/index.js';
import {
  ARCH_CROWN_Y,
  ARCH_SILL_Y,
  ARCH_WIDTH,
  ATTIC_PANEL_WIDTH,
  BASE_WINDOW_HEIGHT,
  BASE_WINDOW_SILL_Y,
  BASE_WINDOW_WIDTH,
  BAY,
  CRESTING_HEIGHT,
  LEVEL_G,
  NICHE_CROWN_Y,
  NICHE_DEPTH,
  NICHE_SILL_Y,
  NICHE_WIDTH,
  OUTER_WALL,
  RUSTICATION_COURSE,
  SLAB,
  WATER_TABLE_Y,
} from './dims.js';
import type { Tier } from './dims.js';

/** The foot of the outer walls: under the ground-floor slab, below every grade along the front. */
export const WALL_FOOT_Y = LEVEL_G - SLAB;
/** Height of a wall module from its foot to its tier's crowning cornice top. */
export const wallHeight = (tier: Tier): number => tier.top - WALL_FOOT_Y;
/** A world height as a height above the wall foot. */
export const local = (y: number): number => y - WALL_FOOT_Y;

/** The door in a link's middle bay: grade-level opening. E: the map's 81st Street entrance sits in the south link's middle bay (X −74.3). */
export const DOOR_TOP_Y = 3.0;
export const DOOR_WIDTH = 2.0;
/** The door unit's height: from 0.4 m below grade, hidden by the plaza, to the opening's head. */
export const DOOR_HEIGHT = DOOR_TOP_Y + 0.4;

/** Channelled joints over the base storey, from below grade up to the water table ([D12]). */
const RUSTICATION: Rustication = { course: RUSTICATION_COURSE, joint: 0.05, depth: 0.04, start: local(-1.5), stop: local(WATER_TABLE_Y - 0.6) };

const archOpening: Opening = { shape: 'arch', y: local(ARCH_SILL_Y), width: ARCH_WIDTH, height: ARCH_CROWN_Y - ARCH_SILL_Y };
const baseWindow: Opening = { y: local(BASE_WINDOW_SILL_Y), width: BASE_WINDOW_WIDTH, height: BASE_WINDOW_HEIGHT };
const atticPanel = (width: number, tier: Tier): Opening => ({ y: local(tier.atticPanelY), width, height: tier.atticPanelHeight, depth: 0.1 });

/** One arched-window bay: base window, arched main-storey window, sunk attic panel. */
export function archBay(tier: Tier): BufferGeometry {
  return wall({ width: BAY, height: wallHeight(tier), thickness: OUTER_WALL, openings: [baseWindow, archOpening, atticPanel(ATTIC_PANEL_WIDTH, tier)], rustication: RUSTICATION });
}

/** An arched-window bay with a grade-level door in place of the base window. */
export function doorBay(tier: Tier): BufferGeometry {
  return wall({ width: BAY, height: wallHeight(tier), thickness: OUTER_WALL, openings: [{ y: 0, width: DOOR_WIDTH, height: local(DOOR_TOP_Y) }, archOpening, atticPanel(ATTIC_PANEL_WIDTH, tier)], rustication: RUSTICATION });
}

/** An end bay of a pavilion front: the tall blind niche over a base window, and a wide attic panel. */
export function endBay(width: number, tier: Tier): BufferGeometry {
  return wall({
    width,
    height: wallHeight(tier),
    thickness: OUTER_WALL,
    openings: [baseWindow, { shape: 'arch', y: local(NICHE_SILL_Y), width: NICHE_WIDTH, height: NICHE_CROWN_Y - NICHE_SILL_Y, depth: NICHE_DEPTH }, atticPanel(Math.min(width - 3, 7.2), tier)],
    rustication: RUSTICATION,
  });
}

/** A plain pier 1 m wide with the base's channelled joints; scaled along X to any width (the joints run horizontally, so scaling keeps them true). */
export function pier(tier: Tier): BufferGeometry {
  return wall({ width: 1, height: wallHeight(tier), thickness: OUTER_WALL, rustication: RUSTICATION });
}

/** The bronze arched window of the main storey: three lights, a transom at the springing, glazing bars. */
export function archWindow(): WindowParts {
  return windowUnit({ width: ARCH_WIDTH, height: ARCH_CROWN_Y - ARCH_SILL_Y, shape: 'arch', cols: 3, rows: 4, frame: 0.1, bar: 0.05 });
}

/** The base-storey window behind its grille. */
export function baseWindowUnit(): WindowParts {
  return windowUnit({ width: BASE_WINDOW_WIDTH, height: BASE_WINDOW_HEIGHT, cols: 4, rows: 5, frame: 0.08, bar: 0.04 });
}

/** The link door: bronze, two leaves, a transom light. */
export function linkDoor(): DoorParts {
  return doorUnit({ width: DOOR_WIDTH, height: DOOR_HEIGHT, leaves: 2, panels: 4 });
}


/** The moulded archivolt round each arched window. */
export function windowArchivolt(): BufferGeometry {
  return archivolt({ span: ARCH_WIDTH, band: 0.34, projection: 0.12 });
}

/** The archivolt round an end bay's niche. */
export function nicheArchivolt(): BufferGeometry {
  return archivolt({ span: NICHE_WIDTH, band: 0.42, projection: 0.14 });
}

/** The carved keystone at each crown ([P37]: a small console). */
export function crownKeystone(): BufferGeometry {
  return keystone({ width: 0.42, height: 0.85, projection: 0.22 });
}

/** Extrudes a counter-clockwise outline in the (x, y) plane from z = −depth/2 to +depth/2, with its sides. */
export function extrudeOutline(b: MeshBuilder, outline: readonly (readonly [number, number])[], depth: number): void {
  const h = depth / 2;
  b.planar(outline, [], new Vector3(0, 0, h), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
  b.planar(
    outline.map(([x, y]) => [x, -y] as const),
    [],
    new Vector3(0, 0, -h),
    new Vector3(1, 0, 0),
    new Vector3(0, -1, 0),
  );
  for (let k = 0; k < outline.length; k += 1) {
    const p = outline[k];
    const q = outline[(k + 1) % outline.length];
    if (p === undefined || q === undefined) continue;
    b.polygon([new Vector3(p[0], p[1], h), new Vector3(p[0], p[1], -h), new Vector3(q[0], q[1], -h), new Vector3(q[0], q[1], h)]);
  }
}

let antefixCache: BufferGeometry | null = null;

/**
 * One antefix of the cresting: a palmette slab on a low plinth, CRESTING_HEIGHT tall, 0.5 m wide. Origin at its bottom centre; front toward +Z.
 * Built here because the parts library has no cresting part; one geometry, placed along the cornice by matrices.
 */
export function antefix(): BufferGeometry {
  if (antefixCache !== null) return antefixCache;
  const b = new MeshBuilder();
  const h = CRESTING_HEIGHT;
  const plinth = 0.12;
  b.box([-0.22, 0, -0.1], [0.22, plinth, 0.1], ['-y']);
  // The palmette: a scalloped fan over a narrow stem, counter-clockwise from the stem's right foot.
  const outline: [number, number][] = [[0.07, plinth]];
  const lobes = 7;
  const r = 0.25;
  const cy = h - r;
  const steps = lobes * 4;
  for (let k = 0; k <= steps; k += 1) {
    const a = (Math.PI * k) / steps;
    const scallop = 1 - 0.12 * Math.abs(Math.sin((k * Math.PI * lobes) / steps));
    outline.push([r * scallop * Math.cos(a), cy + r * scallop * Math.sin(a) * 1.0]);
  }
  outline.push([-0.07, plinth]);
  extrudeOutline(b, outline, 0.07);
  antefixCache = b.build();
  return antefixCache;
}
