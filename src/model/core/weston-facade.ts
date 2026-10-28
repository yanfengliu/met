/**
 * Theodore Weston's south facade of wing B, 1888 (history.md section 3), on X −49.7 facing south: since 1990 the north wall of the Carroll and
 * Milton Petrie European Sculpture Court (Kravis Wing), so it is seen from inside that court. After the Petrie Court photograph (interior-images.md
 * #33, J.-C. Benoist 2012) and the about-1900 view 1880_Met_Museum.jpg (exterior-images.md): a stone dado with roundels, three tall main-floor windows
 * between stone piers in each bay, an entablature at the second floor, a round arch of rusticated voussoirs over the upper windows, rusticated
 * quoin piers with roundels between the arches, a cornice; at the centre the 1888 entrance pavilion with its porch and balcony and a great round
 * window. Trim may project up to 1.5 m into the court (coordinator, 2026-10-11).
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { doorTag } from '../doors.js';
import { column, doorUnit, moulding, surround, voussoirs, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { holeLining, openWall, type Hole } from './arches.js';
import { B_SOUTH_X, COPING_TOP_Y, CORNICE_Y, EAST_Z, L1, L2, LG, OUTER_WALL, PARAPET_Y, WESTON_ARCH_SPAN, WESTON_ARCH_SPRING, WESTON_BAY, WESTON_DADO, WESTON_LOWER_HEAD, WESTON_PAVILION_HALF, WEST_Z } from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, placed } from './shapes.js';
import { WALL_BASE_Y } from './vaux-front.js';
import { GROUND_WINDOW, MAIN_WINDOW, wingWindows, type Elevation, elevationBox } from './wings-walls.js';

const CENTRE_Z = (WEST_Z + EAST_Z) / 2;
const PAV0 = CENTRE_Z - WESTON_PAVILION_HALF;
const PAV1 = CENTRE_Z + WESTON_PAVILION_HALF;
/** Bay centres: five each side of the pavilion, working out from it; the leftovers at the corners are plain fills. */
const BAYS: readonly number[] = [1, 2, 3, 4, 5].flatMap((k) => [PAV0 - WESTON_BAY * (k - 0.5), PAV1 + WESTON_BAY * (k - 0.5)]).sort((a, b) => a - b);
const FILLS: readonly (readonly [number, number])[] = [
  [WEST_Z, PAV0 - 5 * WESTON_BAY],
  [PAV1 + 5 * WESTON_BAY, EAST_Z],
];
export const SOUTH: Elevation = { block: 'b', axis: 'z', face: B_SOUTH_X, facing: FACING.south, inward: 1, thickness: OUTER_WALL, bays: BAYS, fills: FILLS, glazed: true, shared: false };

const MAIN_X = [-1.55, 0, 1.55];
const GROUND_X = [-1.3, 1.3];
const ARCH_SILL = 0.35;
const PAVILION_WINDOW = { width: 5.0, sill: 0.5, spring: 2.6 } as const;
/** The porch's columns, from L1 to their capitals' top, where its entablature starts. */
const PORCH_TOP = 5.0;
/**
 * The 1888 entrance door (src/model/doors.ts `weston`): a pair of wooden panelled leaves rising to a square head, with no fanlight, which open into the
 * building only (interior.md, Weston's 1888 door). Every source that shows the head shows it square, in a moulded stone architrave under the porch's
 * entablature: the Petrie Court photographs (interior-images.md #33 at full size; Heckscher fig. 110, 1995), the porch's drawing of April 1888 and the
 * approved elevation of 1885 (Heckscher figs. 29 and 28). #33 shows the east leaf a quarter turn open into wing B, the gap at its hinge side lit and
 * crossed by its hinges, and #33 and fig. 110 show stone in the reveals. The drawing's opening, 3.29 × 4.91 m, and its architrave, 0.22 m, are scaled by
 * 5.0 / 5.81 (0.861) with the porch, its order 5.81 m to the capitals' top there and PORCH_TOP here, so the head stands under the capitals as drawn.
 * A plain stone frieze fills the wall from the architrave up to the entablature. The reveals and the head's soffit are lined in stone `lining` thick
 * through the wall, over a stone threshold `threshold` deep, as the gallery 600 doorway is (vaux-shell.ts).
 */
const DOOR = { width: 2.83, height: 4.23, trim: 0.19, lining: 0.15, threshold: 0.03 } as const;
/** The 1888 entrance door into the Petrie Court: the plane of its frame (X), its middle (Z) and its width, for what must keep clear of it and its swing. */
export const WESTON_DOOR = { x: B_SOUTH_X + 0.3, z: CENTRE_Z, width: DOOR.width } as const;

function westonBay(): BufferGeometry {
  const holes: Hole[] = [
    ...GROUND_X.map((x): Hole => ({ head: 'segmental', x, y: GROUND_WINDOW.sill - WALL_BASE_Y, width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, rise: GROUND_WINDOW.rise })),
    ...MAIN_X.map((x): Hole => ({ x, y: MAIN_WINDOW.sill - WALL_BASE_Y, width: MAIN_WINDOW.width, height: MAIN_WINDOW.height })),
    { head: 'round', y: L2 + ARCH_SILL - WALL_BASE_Y, width: WESTON_ARCH_SPAN, height: WESTON_ARCH_SPRING - ARCH_SILL + WESTON_ARCH_SPAN / 2 },
  ];
  return openWall({ width: WESTON_BAY, height: PARAPET_Y - WALL_BASE_Y, thickness: OUTER_WALL, holes, openEnds: true });
}

function pavilion(): BufferGeometry {
  const w = PAVILION_WINDOW;
  const holes: Hole[] = [
    ...[-3.6, 3.6].map((x): Hole => ({ head: 'segmental', x, y: GROUND_WINDOW.sill - WALL_BASE_Y, width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, rise: GROUND_WINDOW.rise })),
    { y: L1 - WALL_BASE_Y - DOOR.threshold, width: DOOR.width + 2 * DOOR.lining, height: DOOR.height + DOOR.lining + DOOR.threshold },
    ...[-3.6, 3.6].map((x): Hole => ({ x, y: MAIN_WINDOW.sill - WALL_BASE_Y, width: MAIN_WINDOW.width, height: MAIN_WINDOW.height })),
    { head: 'round', y: L2 + w.sill - WALL_BASE_Y, width: w.width, height: w.spring - w.sill + w.width / 2 },
    ...[-4.6, 4.6].map((x): Hole => ({ head: 'round', x, y: L2 + 1.0 - WALL_BASE_Y, width: 0.9, height: 2.6, depth: 0.2 })),
  ];
  return openWall({ width: 2 * WESTON_PAVILION_HALF, height: PARAPET_Y - WALL_BASE_Y, thickness: OUTER_WALL, holes, openEnds: true });
}

/** World Z of a bay-local x on the south face (its local +x runs toward +Z when it faces −X). */
function z(c: number, x: number): number {
  return c + x;
}

/** The facade's brick walls: ten bays, the pavilion and the corner fills, footing to parapet. */
export function westonWalls(kit: Kit): void {
  const bay = westonBay();
  BAYS.forEach((c, i) => {
    kit.add(bay, palette.brick, placed(B_SOUTH_X, WALL_BASE_Y, c, FACING.south), i < 5 ? 4 - i : i - 5);
  });
  kit.add(pavilion(), palette.brick, placed(B_SOUTH_X, WALL_BASE_Y, CENTRE_Z, FACING.south), 0);
  for (const [a0, a1] of FILLS) elevationBox(kit, SOUTH, palette.brick, a0, a1, WALL_BASE_Y, PARAPET_Y, 0, OUTER_WALL, 5);
}

/** A disc `d` across and `t` deep standing out of the south face at (y, z): a roundel. */
function roundelMatrix(y: number, zz: number, d: number, t: number): Matrix4 {
  return new Matrix4().makeTranslation(B_SOUTH_X, y, zz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)).multiply(new Matrix4().makeScale(d, t, d));
}

/** Stone trim of the facade, course by course from the plinth to the coping. */
export function westonTrim(kit: Kit): void {
  const stone = core.westonStone;
  const e = SOUTH;
  const disc = cylinder(20);
  // The door's architrave, outer edge to outer edge: the dado stops at it.
  const door0 = CENTRE_Z - DOOR.width / 2 - DOOR.trim;
  const door1 = CENTRE_Z + DOOR.width / 2 + DOOR.trim;
  elevationBox(kit, e, stone, WEST_Z, EAST_Z, WALL_BASE_Y, LG + 0.6, 0.12, 0, 0);
  elevationBox(kit, e, stone, WEST_Z, EAST_Z, L1 - 0.45, L1, 0.14, 0, 0);
  for (const [a0, a1] of [
    [WEST_Z, door0],
    [door1, EAST_Z],
  ] as const) {
    elevationBox(kit, e, stone, a0, a1, L1, L1 + WESTON_DADO, 0.1, 0, 1);
  }
  elevationBox(kit, e, stone, WEST_Z, EAST_Z, L1 + WESTON_LOWER_HEAD, L1 + WESTON_LOWER_HEAD + 0.75, 0.16, 0, 3);
  // Rusticated quoins, long and short blocks in turn, at the corners and the pavilion's edges; stone pilaster strips between the other bays.
  for (const edge of [WEST_Z + 0.48, PAV0, PAV1, EAST_Z - 0.48]) {
    let k = 0;
    for (let y = L1 + WESTON_DADO; y + 0.5 < CORNICE_Y; y += 0.58, k++) {
      const half = k % 2 === 0 ? 0.48 : 0.33;
      elevationBox(kit, e, stone, edge - half, edge + half, y, y + 0.54, 0.12, 0, 2 + Math.round((y - L1) / 1.5));
    }
  }
  const strips = [...new Set(BAYS.flatMap((c) => [c - WESTON_BAY / 2, c + WESTON_BAY / 2]).map((v) => Math.round(v * 100) / 100))].filter((v) => Math.abs(v - PAV0) > 0.1 && Math.abs(v - PAV1) > 0.1);
  for (const edge of strips) elevationBox(kit, e, stone, edge - 0.28, edge + 0.28, L1 + WESTON_DADO, CORNICE_Y, 0.08, 0, 2);
  const ring = voussoirs({ span: WESTON_ARCH_SPAN, depth: 0.5, count: 17, projection: 0.1 });
  const bigRing = voussoirs({ span: PAVILION_WINDOW.width, depth: 0.6, count: 19, projection: 0.12 });
  const architrave = surround({ width: DOOR.width, height: DOOR.height, trim: DOOR.trim, projection: 0.08, sill: false, head: 'none' });
  const cornice = moulding({ profile: 'cornice-plain', path: [[-WESTON_BAY / 2, 0, 0], [WESTON_BAY / 2, 0, 0]], height: 0.8, projection: 0.75 });
  const pavCornice = moulding({ profile: 'cornice-plain', path: [[-WESTON_PAVILION_HALF, 0, 0], [WESTON_PAVILION_HALF, 0, 0]], height: 0.9, projection: 0.85 });
  BAYS.forEach((c) => {
    for (const x of MAIN_X) kit.add(disc, stone, roundelMatrix(L1 + WESTON_DADO / 2, z(c, x), 0.7, 0.16), 1);
    for (const x of [-0.775, 0.775]) elevationBox(kit, e, stone, z(c, x) - 0.25, z(c, x) + 0.25, L1 + WESTON_DADO, L1 + WESTON_LOWER_HEAD, 0.08, 0, 2);
    const spring = L2 + WESTON_ARCH_SPRING;
    elevationBox(kit, e, stone, z(c, -WESTON_ARCH_SPAN / 2) - 0.25, z(c, -WESTON_ARCH_SPAN / 2), spring - 0.3, spring, 0.12, 0, 6);
    elevationBox(kit, e, stone, z(c, WESTON_ARCH_SPAN / 2), z(c, WESTON_ARCH_SPAN / 2) + 0.25, spring - 0.3, spring, 0.12, 0, 6);
    kit.add(ring, stone, placed(B_SOUTH_X, spring, c, FACING.south), 7);
    kit.add(cornice, stone, placed(B_SOUTH_X, CORNICE_Y, c, FACING.south), 10);
  });
  const w = PAVILION_WINDOW;
  kit.add(bigRing, stone, placed(B_SOUTH_X, L2 + w.spring, CENTRE_Z, FACING.south), 7);
  kit.add(architrave, stone, placed(B_SOUTH_X, L1, CENTRE_Z, FACING.south), 4);
  elevationBox(kit, e, stone, door0, door1, L1 + DOOR.height + DOOR.trim, L1 + PORCH_TOP, 0.06, 0, 4);
  // The door's reveals and soffit, lined through the wall inside the architrave, on its threshold: the pavilion's hole is cut to the lining's outside.
  const lined: Hole = { y: L1 - WALL_BASE_Y, width: DOOR.width + 2 * DOOR.lining, height: DOOR.height + DOOR.lining };
  kit.add(holeLining(lined, { y: L1 - WALL_BASE_Y, width: DOOR.width, height: DOOR.height }, OUTER_WALL), stone, placed(B_SOUTH_X, WALL_BASE_Y, CENTRE_Z, FACING.south), 4);
  addBox(kit, stone, B_SOUTH_X, L1 - DOOR.threshold, CENTRE_Z - lined.width / 2, B_SOUTH_X + OUTER_WALL, L1, CENTRE_Z + lined.width / 2, 4);
  for (const x of [-3.6, 3.6]) {
    kit.add(disc, stone, roundelMatrix(L2 + 3.6, z(CENTRE_Z, x), 1.25, 0.12), 8);
    kit.add(disc, palette.brick, roundelMatrix(L2 + 3.6, z(CENTRE_Z, x), 0.85, 0.16), 8);
  }
  kit.add(pavCornice, stone, placed(B_SOUTH_X, CORNICE_Y, CENTRE_Z, FACING.south), 10);
  for (const [a0, a1] of FILLS) elevationBox(kit, e, stone, a0, a1, CORNICE_Y, CORNICE_Y + 0.8, 0.3, 0, 10);
  elevationBox(kit, e, stone, WEST_Z, EAST_Z, PARAPET_Y, COPING_TOP_Y, 0.08, OUTER_WALL, 11);
}

/** Windows of the facade and the pavilion, the entrance door, and the porch: two pairs of Ionic columns carrying the balcony. */
export function westonOpenings(kit: Kit): void {
  const { main, ground } = wingWindows();
  const arched = windowUnit({ width: WESTON_ARCH_SPAN, height: WESTON_ARCH_SPRING - ARCH_SILL + WESTON_ARCH_SPAN / 2, shape: 'arch', cols: 3, rows: 3 });
  const w = PAVILION_WINDOW;
  const big = windowUnit({ width: w.width, height: w.spring - w.sill + w.width / 2, shape: 'arch', cols: 4, rows: 3 });
  const door = doorUnit({ width: DOOR.width, height: DOOR.height, fanlight: false, swing: 'back' });
  const x = B_SOUTH_X + 0.3;
  const put = (parts: { frame: BufferGeometry; glass?: BufferGeometry; bars?: BufferGeometry }, zz: number, y: number, order: number): void => {
    const m = placed(x, y, zz, FACING.south);
    kit.add(parts.frame, palette.metalDark, m, order);
    if (parts.bars) kit.add(parts.bars, palette.metalDark, m, order);
    if (parts.glass) kit.add(parts.glass, palette.glassDark, m, order);
  };
  BAYS.forEach((c, i) => {
    for (const gx of GROUND_X) put(ground, z(c, gx), GROUND_WINDOW.sill, i);
    for (const mx of MAIN_X) put(main, z(c, mx), MAIN_WINDOW.sill, i);
    put(arched, c, L2 + ARCH_SILL, i);
  });
  for (const px of [-3.6, 3.6]) {
    put(ground, z(CENTRE_Z, px), GROUND_WINDOW.sill, 5);
    put(main, z(CENTRE_Z, px), MAIN_WINDOW.sill, 5);
  }
  put(big, CENTRE_Z, L2 + w.sill, 5);
  const dm = placed(x, L1, CENTRE_Z, FACING.south);
  kit.add(door.frame, palette.metalDark, dm, 5);
  kit.addTagged(door.leaf, core.westonDoorWood, dm, doorTag('weston'), 5);
  // The porch: columns 0.65 m out from the face, the entablature and balcony slab 1.45 m out, and an iron railing on it.
  const shaft = column({ order: 'ionic', diameter: 0.55, height: PORCH_TOP });
  const cx = B_SOUTH_X - 0.65;
  for (const zz of [-2.85, -2.05, 2.05, 2.85]) kit.add(shaft, core.westonStone, placed(cx, L1, CENTRE_Z + zz, FACING.south), 6);
  const top = L1 + PORCH_TOP;
  addBox(kit, core.westonStone, B_SOUTH_X - 1.0, top, CENTRE_Z - 3.3, B_SOUTH_X, top + 0.8, CENTRE_Z + 3.3, 7);
  addBox(kit, core.westonStone, B_SOUTH_X - 1.45, top + 0.8, CENTRE_Z - 3.5, B_SOUTH_X, top + 1.05, CENTRE_Z + 3.5, 7);
  const rail = palette.metalDark;
  addBox(kit, rail, B_SOUTH_X - 1.4, top + 2.0, CENTRE_Z - 3.45, B_SOUTH_X - 1.32, top + 2.06, CENTRE_Z + 3.45, 8);
  for (let zz = -3.4; zz <= 3.4 + 1e-6; zz += 0.17) addBox(kit, rail, B_SOUTH_X - 1.39, top + 1.05, CENTRE_Z + zz - 0.012, B_SOUTH_X - 1.34, top + 2.0, CENTRE_Z + zz + 0.012, 8);
}
