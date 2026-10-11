/**
 * The Great Hall (1897–1902), floor, piers and balcony: the marble floor with its bands, the eight great piers on the long walls with their impost blocks and
 * the four pedimented niches, the main-floor walls between them, the balcony floor at the second floor on all four sides, the Ionic colonnades
 * (the long walls' central openings, the entrance recess, the end-bay screens) with their entablatures, and the balcony's parapets with pierced roundels.
 * Plan: the floor map in the canonical frame (interior.md, The Great Hall; Z − 3.1). Heights: P1 (Daderot 2020) at 1:1, from the balcony (screen capitals
 * at Y 9.9, parapet top 12.3, imposts at 14.0).
 */
import * as THREE from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { balustrade, columnParts, pilasterParts, surround, wall } from '../lib/index.js';
import {
  BALCONY_RAIL_H,
  CENTRE_COLUMN_X,
  END_SCREEN_Z,
  HALL_ARCH_SPRING_Y,
  HALL_WEST_Z,
  HALL_X,
  MAIN,
  NAVE_EAST_Z,
  NAVE_MID_Z,
  NAVE_WEST_Z,
  PIER_W,
  PIER_X,
  SECOND,
  SLAB,
  STAIR_HALF,
  WALL_BACK_Z,
} from './dims.js';
import { hunt } from './materials.js';
import { at, box, medallionDisc, UNIT_BOX } from './shapes.js';

/** The piers stand behind the long-wall lines (the nave's faces are flush with them), this deep into the aisles. */
export const PIER_DEPTH = 1.5;
/** Ionic columns of the colonnades and screens: 0.75 m, capitals at Y 9.9 (P1). */
const IONIC_D = 0.75;
const IONIC_TOP_Y = 9.9;
/** The niches in the four centre piers (interior.md: pedimented, now holding flowers). */
export const HALL_NICHE = { width: 1.4, sill: 0.9, height: 3.0, depth: 0.55 } as const;

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

/** +1 for the east (facade) side, −1 for the west; the nave lies toward the middle line from each. */
const SIDES = [
  { z: NAVE_EAST_Z, out: 1 },
  { z: NAVE_WEST_Z, out: -1 },
] as const;

/** Clear openings between the piers along a long wall, as [x0, x1]. */
export function bayOpenings(): (readonly [number, number])[] {
  const faces = PIER_X.map((x) => [x - PIER_W / 2, x + PIER_W / 2] as const);
  const out: (readonly [number, number])[] = [];
  for (let k = 0; k + 1 < faces.length; k++) out.push([faces[k]?.[1] ?? 0, faces[k + 1]?.[0] ?? 0]);
  return out;
}

const pierHeight = HALL_ARCH_SPRING_Y - 0.6 - MAIN;
/** The piers' pilasters: 0.5 m faces at ±1.0 m from each pier's middle, clear of the niches. */
const PIER_PILASTER_X = 1.0;
const pierPilaster = lazy(() => pilasterParts({ width: 0.5, height: pierHeight, projection: 0.1, detail: 'low' }));
const plainPier = lazy(() => wall({ width: PIER_W, height: pierHeight, thickness: PIER_DEPTH }));
const nichePier = lazy(() =>
  wall({ width: PIER_W, height: pierHeight, thickness: PIER_DEPTH, openings: [{ shape: 'arch', x: 0, y: HALL_NICHE.sill, width: HALL_NICHE.width, height: HALL_NICHE.height, depth: HALL_NICHE.depth }] }),
);
/** The side bays' main-floor walls: two doors each (map: 1.77 m, centred 5.15 m either side of the bay's middle). */
const sideBayWall = lazy(() => {
  const [a, b] = bayOpenings()[2] ?? [0, 1];
  return wall({
    width: b - a,
    height: SECOND - SLAB - MAIN,
    thickness: 0.8,
    openings: [
      { x: -5.15, y: 0, width: 1.77, height: 3.8 },
      { x: 5.15, y: 0, width: 1.77, height: 3.8 },
    ],
  });
});

function piers(kit: Kit): void {
  for (const side of SIDES) {
    // Front faces look into the nave: the east wall's toward −Z (turned half round), the west wall's toward +Z.
    const angle = side.out > 0 ? Math.PI : 0;
    for (const x of PIER_X) {
      const niche = Math.abs(Math.abs(x) - 8.64) < 0.01;
      kit.add(niche ? nichePier() : plainPier(), hunt.hallStone, at(x, MAIN, side.z, angle), Math.abs(x) < 10 ? 0 : 1);
      // Impost block crowning the pier, from which the arches and the balcony vaults spring.
      box(kit, hunt.hallStone, [x - PIER_W / 2 - 0.15, HALL_ARCH_SPRING_Y - 0.6, Math.min(side.z, side.z + side.out * PIER_DEPTH) - 0.15], [x + PIER_W / 2 + 0.15, HALL_ARCH_SPRING_Y, Math.max(side.z, side.z + side.out * PIER_DEPTH) + 0.15], Math.abs(x) < 10 ? 0 : 1);
      if (niche) {
        const hood = surround({ width: HALL_NICHE.width, height: HALL_NICHE.height, shape: 'arch', head: 'triangular', trim: 0.16, projection: 0.1, sill: true, pitch: 24 });
        kit.add(hood, hunt.hallStone, at(x, MAIN + HALL_NICHE.sill, side.z, angle), 0);
      }
      // Two pilasters on each pier's nave face, either side of the niche zone, up to the impost (P1, P2).
      for (const dx of [-PIER_PILASTER_X, PIER_PILASTER_X]) {
        const m = at(x + dx, MAIN, side.z, angle);
        if (pierPilaster().base !== undefined) kit.add(pierPilaster().base as THREE.BufferGeometry, hunt.hallStone, m, Math.abs(x) < 10 ? 0 : 1);
        kit.add(pierPilaster().shaft, hunt.hallStone, m, Math.abs(x) < 10 ? 0 : 1);
        kit.add(pierPilaster().capital, hunt.hallStone, m, Math.abs(x) < 10 ? 0 : 1);
      }
    }
    // Main-floor walls of the side bays (two doors each) and the short returns beside the central openings.
    const openings = bayOpenings();
    for (const bay of [openings[0], openings[2]]) {
      if (bay === undefined) continue;
      kit.add(sideBayWall(), hunt.hallStone, at((bay[0] + bay[1]) / 2, MAIN, side.z, angle), 2);
    }
    const centre = openings[1];
    if (centre !== undefined) {
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? centre[0] : 6.0;
        const x1 = s < 0 ? -6.0 : centre[1];
        box(kit, hunt.hallStone, [x0, MAIN, Math.min(side.z, side.z + side.out * 0.8)], [x1, SECOND - SLAB, Math.max(side.z, side.z + side.out * 0.8)], 2);
      }
    }
  }
  // Short wall returns either side of the end-bay screens.
  for (const s of [-1, 1]) {
    const x = s * 26.05;
    box(kit, hunt.hallStone, [x - 0.4, MAIN, NAVE_WEST_Z], [x + 0.4, SECOND - SLAB, END_SCREEN_Z[0] - 0.75], 3);
    box(kit, hunt.hallStone, [x - 0.4, MAIN, END_SCREEN_Z[3] + 0.75], [x + 0.4, SECOND - SLAB, NAVE_EAST_Z], 3);
  }
}

function floor(kit: Kit): void {
  box(kit, palette.marbleFloor, [-HALL_X, MAIN - 0.03, HALL_WEST_Z], [HALL_X, MAIN, WALL_BACK_Z], 0);
  // Darker bands framing the fields: along both long walls, across each pier line, and round the desk's field (interior.md, Floor).
  const y0 = MAIN;
  const y1 = MAIN + 0.012;
  const band = 0.45;
  for (const z of [NAVE_EAST_Z, NAVE_WEST_Z]) box(kit, hunt.floorBand, [-HALL_X, y0, z - band / 2], [HALL_X, y1, z + band / 2], 1);
  for (const x of PIER_X) box(kit, hunt.floorBand, [x - band / 2, y0, NAVE_WEST_Z], [x + band / 2, y1, NAVE_EAST_Z], 1);
  for (const z of [NAVE_MID_Z - 4.2, NAVE_MID_Z + 4.2]) box(kit, hunt.floorBand, [-24.5, y0, z - band / 3], [24.5, y1, z + band / 3], 2);
  for (const x of [-4.2, 4.2]) box(kit, hunt.floorBand, [x - band / 3, y0, NAVE_WEST_Z + 1], [x + band / 3, y1, NAVE_EAST_Z - 1], 2);
}

/** A roundel for the parapets (P1: pierced roundels on the long sides). */
const roundel = lazy(() => medallionDisc(0.28, 0.06, 16));

function parapet(kit: Kit, a: THREE.Vector3, b: THREE.Vector3, order: number): void {
  const length = a.distanceTo(b);
  const along = new THREE.Vector3().subVectors(b, a).normalize();
  const angle = Math.atan2(-along.z, along.x);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  const body = BALCONY_RAIL_H - 0.16;
  kit.add(UNIT_BOX, hunt.hallStone, new THREE.Matrix4().compose(new THREE.Vector3(mid.x, SECOND + body / 2, mid.z), q, new THREE.Vector3(length, body, 0.34)), order);
  kit.add(UNIT_BOX, hunt.hallStone, new THREE.Matrix4().compose(new THREE.Vector3(mid.x, SECOND + body + 0.08, mid.z), q, new THREE.Vector3(length + 0.1, 0.16, 0.5)), order);
  const count = Math.max(1, Math.floor(length / 1.25));
  for (let k = 0; k < count; k++) {
    const p = a.clone().lerp(b, (k + 0.5) / count);
    for (const face of [1, -1]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, SECOND + body * 0.55, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle + (face > 0 ? 0 : Math.PI)), new THREE.Vector3(1, 1, 1));
      m.multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.17));
      kit.add(roundel(), hunt.hallStone, m, order);
    }
  }
}

function balcony(kit: Kit): void {
  // Balcony floors at the second floor over the aisles and across the end bays.
  const y0 = SECOND - SLAB;
  box(kit, hunt.hallStone, [-HALL_X, y0, NAVE_EAST_Z], [HALL_X, SECOND, WALL_BACK_Z], 0);
  box(kit, hunt.hallStone, [-HALL_X, y0, HALL_WEST_Z], [HALL_X, SECOND, NAVE_WEST_Z], 0);
  for (const s of [-1, 1]) box(kit, hunt.hallStone, [s < 0 ? -HALL_X : 26.05, y0, NAVE_WEST_Z], [s < 0 ? -26.05 : HALL_X, SECOND, NAVE_EAST_Z], 0);
  // Ionic colonnades: the long walls' central openings, the entrance recess, the end-bay screens (four columns each, LPC77).
  const ionic = columnParts({ order: 'ionic', diameter: IONIC_D, height: IONIC_TOP_Y - MAIN, detail: 'low' });
  const place = (x: number, z: number, order: number): void => {
    const m = at(x, MAIN, z);
    if (ionic.base !== undefined) kit.add(ionic.base, palette.limestone, m, order);
    kit.add(ionic.shaft, palette.limestone, m, order);
    kit.add(ionic.capital, palette.limestone, m, order);
  };
  for (const side of SIDES) for (const x of CENTRE_COLUMN_X) place(x, side.z, 1);
  for (const x of [-1.26, 1.28]) place(x, WALL_BACK_Z - 0.6, 1);
  for (const s of [-1, 1]) for (const z of END_SCREEN_Z) place(s * 26.05, z, 2);
  // Their entablatures, carrying the balcony floor.
  for (const side of SIDES) box(kit, hunt.hallStone, [-6.0, IONIC_TOP_Y, side.z - 0.5], [6.0, y0, side.z + 0.5], 3);
  box(kit, hunt.hallStone, [-4.15, IONIC_TOP_Y, WALL_BACK_Z - 1.1], [4.15, y0, WALL_BACK_Z], 3);
  for (const s of [-1, 1]) box(kit, hunt.hallStone, [s * 26.05 - 0.5, IONIC_TOP_Y, END_SCREEN_Z[0] - 0.75], [s * 26.05 + 0.5, y0, END_SCREEN_Z[3] + 0.75], 3);
  // Parapets along the void, between the piers, and across the end bays.
  const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
  for (const side of SIDES) {
    const z = side.z - side.out * 0.2;
    for (const [a, b] of bayOpenings()) parapet(kit, v(a, z), v(b, z), 4);
  }
  for (const s of [-1, 1]) parapet(kit, v(s * (26.05 - 0.2), NAVE_WEST_Z + 0.2), v(s * (26.05 - 0.2), NAVE_EAST_Z - 0.2), 5);
  // A balustrade across the Grand Staircase's opening at the west balcony's edge (P3: balusters in the foreground).
  const rail = balustrade({ length: 2 * STAIR_HALF, height: BALCONY_RAIL_H, balusterSpacing: 0.32, postEvery: 2.6, detail: 'low' });
  const m = at(0, SECOND, HALL_WEST_Z + 0.25);
  kit.add(rail.rail, hunt.hallStone, m, 5);
  kit.add(rail.plinth, hunt.hallStone, m, 5);
  kit.add(rail.posts, hunt.hallStone, m, 5);
  for (const b of rail.balusters) kit.add(rail.baluster, hunt.hallStone, m.clone().multiply(b), 5);
}

export const hallSteps: readonly StepDef[] = [
  {
    id: 'great-hall-floor',
    chapter: 'hunt-1902',
    year: '1900',
    title: 'Lay the Great Hall floor',
    detail: 'The main floor of the Great Hall, 61 by 29 m: a field of marble chips poured in sections, framed by strips of yellow marble along the walls and the pier lines.',
    motion: { kind: 'slide', from: [0, 0, 12] },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-balcony-south' },
    build: floor,
  },
  {
    id: 'great-hall-piers',
    chapter: 'hunt-1902',
    year: '1900',
    title: "Raise the Great Hall's piers and walls",
    detail: 'Eight massive limestone piers rise on the long walls to the imposts of the arches; the centre four hold pedimented niches, and walls with doors close the side bays.',
    motion: { kind: 'grow' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-balcony-south' },
    build: piers,
  },
  {
    id: 'great-hall-balcony',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Build the balcony and its Ionic colonnades',
    detail: 'The balcony floor runs round all four sides at the second floor, carried in the central openings and the end bays by colonnades of four fluted Ionic columns, behind parapets pierced with roundels.',
    motion: { kind: 'rise' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-floor-north' },
    build: balcony,
  },
];
