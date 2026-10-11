/**
 * The Lila Acheson Wallace Wing (KRJDA, 1987), chapter `roche-south-1990`: four floors of galleries for modern and contemporary art with limestone and
 * glass faces to the park. It closed in 2025 and is being replaced by the Tang Wing (history.md, Chronology); it is modelled as it stood until then.
 * Sources: history.md section 8, exterior.md [K6], plan and levels in wallace-plan.ts. The wing builds its outer faces and the line X −88.1 it shares
 * with the later Kravis Wing; the line Z −97.2 is the older Rockefeller Wing's wall.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y } from '../frame.js';
import { wall } from '../lib/index.js';
import { palette } from '../palette.js';
import { OUTER_WALL, WALLACE_BLOCK } from './blocks.js';
import { mat } from './materials.js';
import { segmentCoping, segmentWall, wallSegments, type WallSegment } from './outline.js';
import { ccw, inset, type P2 } from './poly.js';
import { clipEdges, partitionBoxes, sharedEdges } from './rooms.js';
import { at, boxAt, libraryWallOn, prism, UNIT_BOX, wallAlong } from './shapes.js';
import {
  GARDEN,
  WALLACE_FACADE_TOP_Y,
  WALLACE_MAIN_ROOMS,
  WALLACE_MEZZANINE_Y,
  WALLACE_ROOF_Y,
  WALLACE_SECOND_Y,
  WALLACE_UPPER_ROOMS,
  WEST_GLASS_X0,
  WEST_GLASS_X1,
  WEST_STRIP_Z1,
  MONITORS,
  ROOF_GARDEN_Y,
} from './wallace-plan.js';

const CHAPTER = 'roche-south-1990' as const;
const YEAR = '1987';
const SLAB = 0.6;
const FOOTING_Y = GROUND_FLOOR_Y - SLAB - 1.0;
const BASE_Y = GROUND_FLOOR_Y - SLAB;
const PARAPET_Y = WALLACE_ROOF_Y + 1.0;
/** E: top of the stone block at the wing's south-east corner, about 1.5 m over the Rockefeller glass wall's top beside it (photo ref-park-south). */
const TOWER_Y = 22.0;

export const WALLACE_OUTLINE: readonly P2[] = ccw(WALLACE_BLOCK);
/** Edge 0 runs along Z −97.2, the Rockefeller Wing's wall. */
const SHARED_EDGE = WALLACE_OUTLINE.findIndex((a, i) => {
  const b = WALLACE_OUTLINE[(i + 1) % WALLACE_OUTLINE.length] ?? a;
  return Math.abs(a[1] + 97.2) < 1e-6 && Math.abs(b[1] + 97.2) < 1e-6;
});
export const WALLACE_INNER: readonly P2[] = inset(
  WALLACE_OUTLINE,
  WALLACE_OUTLINE.map((_, i) => (i === SHARED_EDGE ? 0 : OUTER_WALL)),
);
const SEGMENTS = wallSegments(WALLACE_OUTLINE, OUTER_WALL, [SHARED_EDGE]);

const isWestFace = (s: WallSegment): boolean => Math.abs(s.a[1] + 160.1) < 1e-6 && Math.abs(s.b[1] + 160.1) < 1e-6;
const isSouthFace = (s: WallSegment): boolean => Math.abs(s.a[0] + 141.2) < 1e-6 && Math.abs(s.b[0] + 141.2) < 1e-6;
const isTower = (s: WallSegment): boolean => Math.max(s.a[1], s.b[1]) > -105 && Math.min(s.a[0], s.b[0]) < -141.3;

const X_IN_NORTH = -88.15 - OUTER_WALL;
const Z_IN_WEST = -160.1 + OUTER_WALL;

function structure(kit: Kit): void {
  SEGMENTS.forEach((seg, k) => {
    kit.add(UNIT_BOX, mat.concrete, segmentWall(seg, FOOTING_Y, BASE_Y, 2.0, OUTER_WALL), k);
  });
  const n = SEGMENTS.length;
  kit.add(prism(WALLACE_INNER, [], BASE_Y, GROUND_FLOOR_Y), palette.stoneFloor, at(0, 0, 0), n);
  kit.add(prism(WALLACE_INNER, [], MAIN_FLOOR_Y - SLAB, MAIN_FLOOR_Y), palette.stoneFloor, at(0, 0, 0), n + 1);
  // The mezzanine (map floor 1M): a strip behind the park face with two arms running east.
  const mezzanine: P2[] = [
    [-139.94, Z_IN_WEST],
    [X_IN_NORTH, Z_IN_WEST],
    [X_IN_NORTH, -132.77],
    [-97.25, -132.77],
    [-97.24, -148.05],
    [-128.89, -148.04],
    [-128.89, -134.42],
    [-139.94, -134.41],
  ];
  kit.add(prism(mezzanine, [], WALLACE_MEZZANINE_Y - 0.5, WALLACE_MEZZANINE_Y), palette.wood, at(0, 0, 0), n + 2);
  // The second floor, open over the tall gallery behind the park face.
  const vista: P2[] = [
    [WEST_GLASS_X0, Z_IN_WEST + 0.05],
    [WEST_GLASS_X1, Z_IN_WEST + 0.05],
    [WEST_GLASS_X1, -148.03],
    [WEST_GLASS_X0, -148.03],
  ];
  kit.add(prism(WALLACE_INNER, [vista], WALLACE_SECOND_Y - SLAB, WALLACE_SECOND_Y), palette.wood, at(0, 0, 0), n + 3);
}

/** The park face: one wall with the opening for the tall gallery's glass, its front to the park (−Z). */
const WEST_OPENING_BOTTOM = WALLACE_MEZZANINE_Y - 0.6;
const WEST_OPENING_TOP = WALLACE_FACADE_TOP_Y - 1.0;
const WEST_FACE = wall({
  width: 141.2 - 88.2,
  height: WALLACE_FACADE_TOP_Y - BASE_Y,
  thickness: OUTER_WALL,
  openings: [{ x: -((WEST_GLASS_X0 + WEST_GLASS_X1) / 2 - (-141.2 - 88.2) / 2), y: WEST_OPENING_BOTTOM - BASE_Y, width: WEST_GLASS_X1 - WEST_GLASS_X0, height: WEST_OPENING_TOP - WEST_OPENING_BOTTOM }],
});
/** The south face: a row of small square windows at the mezzanine, about mid-height of the face (photo ref-park-south shows a row of them). */
const SOUTH_WINDOWS = [-152, -146, -140, -134, -128, -122, -116, -110].map((z) => ({ x: z - (-104.7 - 160.1) / 2, y: WALLACE_MEZZANINE_Y + 0.6 - BASE_Y, width: 1.4, height: 1.4 }));
const SOUTH_FACE = wall({ width: 160.1 - 104.7, height: PARAPET_Y - BASE_Y, thickness: OUTER_WALL, openings: SOUTH_WINDOWS });

function facades(kit: Kit): void {
  SEGMENTS.forEach((seg, k) => {
    if (isWestFace(seg)) {
      kit.add(WEST_FACE, palette.limestone, libraryWallOn(seg.b, seg.a, BASE_Y), k);
      kit.add(UNIT_BOX, palette.limestone, segmentCoping(seg, WALLACE_FACADE_TOP_Y, WALLACE_FACADE_TOP_Y + 0.3, OUTER_WALL, 0.15), k);
      return;
    }
    if (isSouthFace(seg)) {
      // The library wall runs a→b with its front to the left; this face runs north to south with the park to its west.
      kit.add(SOUTH_FACE, palette.limestone, libraryWallOn(seg.b, seg.a, BASE_Y), k);
      kit.add(UNIT_BOX, palette.limestone, segmentCoping(seg, PARAPET_Y, PARAPET_Y + 0.3, OUTER_WALL, 0.15), k);
      return;
    }
    const top = isTower(seg) ? TOWER_Y : PARAPET_Y;
    kit.add(UNIT_BOX, palette.limestone, segmentWall(seg, BASE_Y, top, OUTER_WALL, OUTER_WALL), k);
    kit.add(UNIT_BOX, palette.limestone, segmentCoping(seg, top, top + 0.3, OUTER_WALL, isTower(seg) || seg.a[0] < -141 ? 0.15 : 0), k);
  });
  // The tower's two inner sides above the roofs: on the wing's own side of the line X −141.2 and of the Rockefeller wall.
  kit.add(UNIT_BOX, palette.limestone, wallAlong([-141.2, -104.7], [-141.2, -97.2], WALLACE_ROOF_Y, TOWER_Y + 0.3, 0.8), SEGMENTS.length);
  kit.add(UNIT_BOX, palette.limestone, wallAlong([-141.2, -97.2], [-151.6, -97.2], PARAPET_Y, TOWER_Y + 0.3, 0.8), SEGMENTS.length);
}

function galleries(kit: Kit): void {
  const box: readonly [number, number, number, number] = [-140.0, Z_IN_WEST, X_IN_NORTH, -96.0];
  clipEdges(sharedEdges(WALLACE_MAIN_ROOMS), box).forEach((edge, k) => {
    const underMezzanine = Math.max(edge.a[1], edge.b[1]) < -147.5;
    const y1 = underMezzanine ? WALLACE_MEZZANINE_Y - 0.5 : WALLACE_SECOND_Y - SLAB;
    for (const m of partitionBoxes(edge, { y0: MAIN_FLOOR_Y, y1, openingHeight: 3.4 })) kit.add(UNIT_BOX, palette.plaster, m, k);
  });
  clipEdges(sharedEdges(WALLACE_UPPER_ROOMS), box).forEach((edge, k) => {
    for (const m of partitionBoxes(edge, { y0: WALLACE_SECOND_Y, y1: WALLACE_ROOF_Y - SLAB, openingHeight: 3.6 })) kit.add(UNIT_BOX, palette.plaster, m, 100 + k);
  });
}

/** Roof openings: the two monitors and the two glazed strips by the lounge (orthophoto). */
export const ROOF_LIGHTS: readonly (readonly [number, number, number, number])[] = [...MONITORS, [-129.2, -133.2, -89.8, -127.6], [-129.2, -127.0, -124.8, -118.8]];

function roof(kit: Kit): void {
  const roofOutline: P2[] = WALLACE_INNER.map((p) => [p[0], Math.max(p[1], WEST_STRIP_Z1)] as P2);
  const holes = ROOF_LIGHTS.map(([x0, z0, x1, z1]): P2[] => [
    [x0 + 0.2, z0 + 0.2],
    [x1 - 0.2, z0 + 0.2],
    [x1 - 0.2, z1 - 0.2],
    [x0 + 0.2, z1 - 0.2],
  ]);
  kit.add(prism(roofOutline, holes, WALLACE_ROOF_Y - SLAB, WALLACE_ROOF_Y), mat.roof, at(0, 0, 0), 0);
  // The Patrons Lounge (map floor 4) on the roof, under the roof garden.
  const lounge = wallSegments(ccw(GARDEN), 0.6);
  lounge.forEach((seg, k) => {
    kit.add(UNIT_BOX, palette.limestone, segmentWall(seg, WALLACE_ROOF_Y, ROOF_GARDEN_Y + 1.1, 0.6, 0.6), 1 + k);
  });
  kit.add(prism(GARDEN, [], ROOF_GARDEN_Y - SLAB, ROOF_GARDEN_Y - 0.06), mat.roof, at(0, 0, 0), 20);
  // The tower's roof.
  kit.add(UNIT_BOX, palette.limestone, boxAt([-151.6 + OUTER_WALL, TOWER_Y - 0.5, -104.7 + OUTER_WALL], [-141.2, TOWER_Y, -97.2]), 21);
}

const FOCUS_WING = { kind: 'box', min: [-152, -4, -161], max: [-88, 25, -97] } as const;

export const wallaceSteps: readonly StepDef[] = [
  { id: 'wallace-structure', chapter: CHAPTER, year: YEAR, title: 'Wallace Wing floors', detail: 'Footings and floor plates for four floors in the south-west corner: ground, main, a mezzanine behind the park face, and second.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_WING, build: structure },
  { id: 'wallace-facades', chapter: CHAPTER, year: YEAR, title: 'Limestone faces on the park', detail: 'The Wallace Wing closed in 2025 and is being replaced by the Tang Wing; it is shown as it stood from 1987, with a tall stone block at its south-east corner.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: facades },
  { id: 'wallace-galleries', chapter: CHAPTER, year: YEAR, title: 'Galleries for modern art', detail: 'Gallery walls on the main and second floors (map galleries 900 to 925), and the tall mezzanine gallery behind the glass to the park.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: galleries },
  { id: 'wallace-roof', chapter: CHAPTER, year: YEAR, title: 'Roofs and the Patrons Lounge', detail: 'A roof over the second floor with openings for skylights, and on it the lounge whose roof carries the roof garden.', motion: { kind: 'drop' }, stagger: 'order', focus: FOCUS_WING, build: roof },
];
