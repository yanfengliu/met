/**
 * The rest of Hunt's wing back to the 1880–1894 core (Z −69): simplified gallery floors and walls on the floor map's room lines (canonical frame, map Z − 3.1):
 * the second-floor plates of the flanking wings and of the ranges behind the Great Hall (the Vélez Blanco patio left open), and the main partitions on
 * both floors with door gaps. The core builds the wall on Z −69; these floors run up to it.
 * Room lines (interior.md and the map's Floor 1 and Floor 2 rooms): wings at Z −10.95/−24.4 (north) and −13.65/−21.6 (south), X ±45.4; galleries 200/201
 * and the Byzantine galleries on X ±9.75; gallery 534 on X −28.67, Z −37.72 and −57.53; gallery 099 on X 44.38 and Z −65.65.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { BACK_Z, CROSS_HALL_FRONT_Z, EXT_FACE_Z, EXT_NORTH_X, EXT_SOUTH_X, EXT_WALL_T, HALL_END_WALL_X, HALL_WEST_WALL_Z, MAIN, SECOND, SLAB, STAIR_HALF } from './dims.js';
import { box } from './shapes.js';
import { GALLERY_ROOF_Y, WING_ROOF_Y } from './roof.js';

const WALL = 0.4;
const DOOR = 2.0;
const SIDE = 1.2;

/** A partition from (x0, z0) to (x1, z1) (one of them constant) between y0 and y1, with a door gap centred at each fraction in `doors`. */
function partition(kit: Kit, a: readonly [number, number], b: readonly [number, number], y0: number, y1: number, doors: readonly number[], order: number): void {
  const alongX = Math.abs(a[1] - b[1]) < 1e-6;
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const cuts = doors.map((f) => lo + f * (hi - lo)).sort((p, q) => p - q);
  let start = lo;
  const piece = (s: number, e: number): void => {
    if (e - s < 0.05) return;
    if (alongX) box(kit, palette.plaster, [s, y0, a[1] - WALL / 2], [e, y1, a[1] + WALL / 2], order);
    else box(kit, palette.plaster, [a[0] - WALL / 2, y0, s], [a[0] + WALL / 2, y1, e], order);
  };
  for (const c of cuts) {
    piece(start, c - DOOR / 2);
    start = c + DOOR / 2;
  }
  piece(start, hi);
}

export const gallerySteps: readonly StepDef[] = [
  {
    id: 'hunt-galleries',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Fit out the galleries of the wing',
    detail: "The second-floor galleries and the rooms behind the Great Hall: floor plates over the wings and the ranges round the staircase, and walls on the map's room lines.",
    motion: { kind: 'grow' },
    stagger: '-z',
    build(kit) {
      const y0 = SECOND - SLAB;
      const front = EXT_FACE_Z - EXT_WALL_T;
      // Second-floor plates: the wings, the ranges behind the hall (the Vélez Blanco patio open to the roof), the cross hall's floor.
      box(kit, palette.limestoneDark, [EXT_SOUTH_X + SIDE, y0, HALL_WEST_WALL_Z], [-HALL_END_WALL_X, SECOND, front], 0);
      box(kit, palette.limestoneDark, [HALL_END_WALL_X, y0, HALL_WEST_WALL_Z], [EXT_NORTH_X - SIDE, SECOND, front], 0);
      box(kit, palette.limestoneDark, [EXT_SOUTH_X + SIDE, y0, BACK_Z], [-23.63, SECOND, HALL_WEST_WALL_Z], 1);
      box(kit, palette.limestoneDark, [-23.63, y0, BACK_Z], [-9.75, SECOND, -56.89], 1);
      box(kit, palette.limestoneDark, [-23.63, y0, -41.16], [-9.75, SECOND, HALL_WEST_WALL_Z], 1);
      box(kit, palette.limestoneDark, [-9.75, y0, BACK_Z], [-STAIR_HALF - 0.8, SECOND, HALL_WEST_WALL_Z], 1);
      box(kit, palette.limestoneDark, [STAIR_HALF + 0.8, y0, BACK_Z], [EXT_NORTH_X - SIDE, SECOND, HALL_WEST_WALL_Z], 1);
      box(kit, palette.limestoneDark, [-STAIR_HALF - 0.8, y0, BACK_Z], [STAIR_HALF + 0.8, SECOND, CROSS_HALL_FRONT_Z - 0.8], 1);
      // Main floor and second floor partitions on the map's room lines.
      const floors: readonly (readonly [number, number])[] = [
        [MAIN, y0],
        [SECOND, GALLERY_ROOF_Y - 0.4],
      ];
      floors.forEach(([lo, hi], f) => {
        const order = 2 + f;
        const wingTop = Math.min(hi, WING_ROOF_Y - 0.4);
        partition(kit, [HALL_END_WALL_X, -10.95], [45.4, -10.95], lo, wingTop, [0.5], order);
        partition(kit, [HALL_END_WALL_X, -24.4], [EXT_NORTH_X - SIDE, -24.4], lo, wingTop, [0.3, 0.75], order);
        partition(kit, [45.4, front], [45.4, -24.4], lo, wingTop, [0.5], order);
        partition(kit, [-45.6, -13.65], [-HALL_END_WALL_X, -13.65], lo, wingTop, [0.5], order);
        partition(kit, [-45.6, -21.6], [-HALL_END_WALL_X, -21.6], lo, wingTop, [0.5], order);
        partition(kit, [-45.6, front], [-45.6, HALL_WEST_WALL_Z], lo, wingTop, [0.2, 0.62], order);
        for (const x of [-9.75, 9.75]) partition(kit, [x, HALL_WEST_WALL_Z], [x, -66.79], lo, hi, [0.2, 0.55, 0.85], order);
        partition(kit, [-28.67, -37.72], [-28.67, -57.53], lo, hi, [0.5], order);
        partition(kit, [-28.67, -37.72], [-9.75, -37.72], lo, hi, [0.5], order);
        partition(kit, [-28.67, -57.53], [-9.75, -57.53], lo, hi, [0.5], order);
        partition(kit, [44.38, HALL_WEST_WALL_Z], [44.38, -65.65], lo, hi, [0.3, 0.7], order);
        partition(kit, [9.75, -65.65], [44.38, -65.65], lo, hi, [0.5], order);
      });
      // Second floor only: the Balcony Lounge and the shop's walls on the north, gallery 690's on the south.
      partition(kit, [20.12, HALL_WEST_WALL_Z], [20.12, -55.16], SECOND, GALLERY_ROOF_Y - 0.4, [0.5], 4);
      partition(kit, [9.75, -56.31], [25.24, -56.31], SECOND, GALLERY_ROOF_Y - 0.4, [0.4], 4);
      partition(kit, [-39.56, -56.88], [-9.75, -56.88], SECOND, GALLERY_ROOF_Y - 0.4, [0.5], 4);
    },
  },
];
