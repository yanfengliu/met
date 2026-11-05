/**
 * Theodore Weston's south facade of wing B, 1888 (history.md section 3), on X −49.7 facing south: since 1990 the north wall of the Carroll and
 * Milton Petrie European Sculpture Court (Kravis Wing), so it is seen from inside that court. Its middle section, after Weston's approved elevation
 * of 1885 and his 1888 plan (Heckscher figs. 28 and 26), the photograph of about 1895 (fig. 35), the Petrie Court photograph (interior-images.md #33,
 * J.-C. Benoist 2012) and the about-1900 view 1880_Met_Museum.jpg (exterior-images.md #53): in the middle the 1888 entrance pavilion with its porch
 * and balcony (weston-porch.ts) and a great round window; each side one arched bay, a stone dado with four roundels under four tall main-floor windows
 * between stone piers, an entablature at the second floor and a round arch of rusticated voussoirs over a four-light window, its keystone reaching
 * the cornice, between rusticated quoins; then a strip of brick and the end block that projects into the court (weston-ends.ts). Beside the porch the
 * pavilion's main floor is brick between quoins, with no window (#33 and #43). Trim may project up to 1.5 m into the court (coordinator, 2026-10-11),
 * the porch 2.85 m out to its cornice and the end blocks 2.0 m (docs/design/spec.md, World frame). The pavilion stands where the floor map has its
 * door, at Z −100.97 (constants.ts `WESTON_PAVILION_Z`), and the front is laid out from it (interior.md, Weston's 1888 front).
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { doorTag } from '../doors.js';
import { doorUnit, MeshBuilder, moulding, voussoirs, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { holeLining, openWall, type Hole } from './arches.js';
import {
  B_SOUTH_X,
  COPING_TOP_Y,
  CORNICE_Y,
  EAST_Z,
  L1,
  L2,
  LG,
  OUTER_WALL,
  PARAPET_Y,
  WESTON_ARCH_BAY,
  WESTON_ARCH_SPAN,
  WESTON_ARCH_SPRING,
  WESTON_DADO,
  WESTON_END_FROM,
  WESTON_LOWER_HEAD,
  WESTON_PAVILION_HALF,
  WESTON_PAVILION_Z,
  WESTON_QUOIN,
  WESTON_WEST_END_Z,
  WEST_Z,
} from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, memo, placed } from './shapes.js';
import { WALL_BASE_Y } from './vaux-front.js';
import { END_ENTABLATURE_RETURN } from './weston-ends.js';
import { DOOR, DOOR_FRAME_OUT, PORCH_REACH, westonRailing } from './weston-porch.js';
import { GROUND_WINDOW, MAIN_WINDOW, wingWindows, type Elevation, elevationBox } from './wings-walls.js';

const CENTRE_Z = WESTON_PAVILION_Z;
const PAV0 = CENTRE_Z - WESTON_PAVILION_HALF;
const PAV1 = CENTRE_Z + WESTON_PAVILION_HALF;
/** The arched bays' outer edges, where the strips of brick toward the end blocks begin. */
const BAYS_END = WESTON_PAVILION_HALF + WESTON_ARCH_BAY;
/** The arched bays' middles, west and east of the pavilion. */
const BAYS: readonly number[] = [CENTRE_Z - WESTON_PAVILION_HALF - WESTON_ARCH_BAY / 2, CENTRE_Z + WESTON_PAVILION_HALF + WESTON_ARCH_BAY / 2];
/** The plain wall beyond the arched bays: behind the strips and the end blocks, which stand out from it (weston-ends.ts). */
const FILLS: readonly (readonly [number, number])[] = [
  [WEST_Z, CENTRE_Z - BAYS_END],
  [CENTRE_Z + BAYS_END, EAST_Z],
];
export const SOUTH: Elevation = { block: 'b', axis: 'z', face: B_SOUTH_X, facing: FACING.south, inward: 1, thickness: OUTER_WALL, bays: BAYS, fills: FILLS, glazed: true, shared: false };

/** Half the long quoin blocks' width: the quoins at each bay's edges, centred on them. */
const QUOIN = WESTON_QUOIN;
/** The four main-floor windows across a bay between its quoins, with five equal piers (#33: four windows to a bay). */
const PIER = (WESTON_ARCH_BAY - 2 * QUOIN - 4 * MAIN_WINDOW.width) / 5;
const MAIN_X = [-1.5, -0.5, 0.5, 1.5].map((k) => k * (MAIN_WINDOW.width + PIER));
const GROUND_X = [-1.6, 1.6];
const ARCH_SILL = 0.35;
const PAVILION_WINDOW = { width: 5.0, sill: 0.5, spring: 2.6 } as const;
/** Where the quoins beside the porch start, out from the doorway's middle: 0.1 m past its side pilasters' faces, clear of their capitals. */
const BESIDE_PORCH = PORCH_REACH.sides + 0.1;
/*
 * The 1888 entrance door (src/model/doors.ts `weston`): a pair of wooden panelled leaves rising to a square head, with no fanlight, which open into the
 * building only (interior.md, Weston's 1888 door). Every source that shows the head shows it square, in a moulded stone architrave: the Petrie Court
 * photographs (interior-images.md #33 at full size; Heckscher fig. 110, 1995), the porch's drawing of April 1888 and the approved elevation of 1885
 * (Heckscher figs. 29 and 28). #33 shows the east leaf a quarter turn open inward, the gap at its hinge side lit and crossed by its hinges about 0.35 m
 * behind the architrave's face, and #33 and fig. 110 show stone in the reveals. The opening is the drawing's, 3.29 × 4.91 m (weston-porch.ts `DOOR`),
 * and the frame and leaves stand in it near the porch's front, so the leaves open into the porch, toward wing B (the owner, 2026-11-04). Behind the
 * porch the doorway runs on through this wall, its reveals and head's soffit lined in stone `lining` thick, over a stone threshold `threshold` deep, as
 * the gallery 600 doorway is (vaux-east.ts).
 */
/** The wall's opening and its lining's outside, in the pavilion wall's frame: the pavilion's hole is the lining's outside, cut down to the threshold. */
const DOOR_OPENING: Hole = { y: L1 - WALL_BASE_Y, width: DOOR.width, height: DOOR.height };
const DOOR_LINED: Hole = { y: L1 - WALL_BASE_Y, width: DOOR.width + 2 * DOOR.lining, height: DOOR.height + DOOR.lining };
/** The 1888 entrance door into the Petrie Court: the plane of its frame's front (X), its middle (Z) and its width, for what must keep clear of it and its swing. */
export const WESTON_DOOR = { x: B_SOUTH_X - DOOR_FRAME_OUT, z: CENTRE_Z, width: DOOR.width } as const;

function westonBay(): BufferGeometry {
  const holes: Hole[] = [
    ...GROUND_X.map((x): Hole => ({ head: 'segmental', x, y: GROUND_WINDOW.sill - WALL_BASE_Y, width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, rise: GROUND_WINDOW.rise })),
    ...MAIN_X.map((x): Hole => ({ x, y: MAIN_WINDOW.sill - WALL_BASE_Y, width: MAIN_WINDOW.width, height: MAIN_WINDOW.height })),
    { head: 'round', y: L2 + ARCH_SILL - WALL_BASE_Y, width: WESTON_ARCH_SPAN, height: WESTON_ARCH_SPRING - ARCH_SILL + WESTON_ARCH_SPAN / 2 },
  ];
  return openWall({ width: WESTON_ARCH_BAY, height: PARAPET_Y - WALL_BASE_Y, thickness: OUTER_WALL, holes, openEnds: true });
}

function pavilion(): BufferGeometry {
  const w = PAVILION_WINDOW;
  const holes: Hole[] = [
    ...[-3.6, 3.6].map((x): Hole => ({ head: 'segmental', x, y: GROUND_WINDOW.sill - WALL_BASE_Y, width: GROUND_WINDOW.width, height: GROUND_WINDOW.height, rise: GROUND_WINDOW.rise })),
    { ...DOOR_LINED, y: L1 - WALL_BASE_Y - DOOR.threshold, height: DOOR_LINED.height + DOOR.threshold },
    { head: 'round', y: L2 + w.sill - WALL_BASE_Y, width: w.width, height: w.spring - w.sill + w.width / 2 },
    ...[-4.6, 4.6].map((x): Hole => ({ head: 'round', x, y: L2 + 1.0 - WALL_BASE_Y, width: 0.9, height: 2.6, depth: 0.2 })),
  ];
  return openWall({ width: 2 * WESTON_PAVILION_HALF, height: PARAPET_Y - WALL_BASE_Y, thickness: OUTER_WALL, holes, openEnds: true });
}

/** World Z of a bay-local x on the south face (its local +x runs toward +Z when it faces −X). */
function z(c: number, x: number): number {
  return c + x;
}

/** The facade's brick walls: the two arched bays, the pavilion, and the plain wall behind the strips and the end blocks, footing to parapet. */
export function westonWalls(kit: Kit): void {
  const bay = westonBay();
  BAYS.forEach((c, i) => {
    kit.add(bay, palette.brick, placed(B_SOUTH_X, WALL_BASE_Y, c, FACING.south), i);
  });
  kit.add(pavilion(), palette.brick, placed(B_SOUTH_X, WALL_BASE_Y, CENTRE_Z, FACING.south), 0);
  for (const [a0, a1] of FILLS) elevationBox(kit, SOUTH, palette.brick, a0, a1, WALL_BASE_Y, PARAPET_Y, 0, OUTER_WALL, 0);
}

/** A disc `d` across and `t` deep standing out of the south face at (y, z): a roundel. */
function roundelMatrix(y: number, zz: number, d: number, t: number): Matrix4 {
  return new Matrix4().makeTranslation(B_SOUTH_X, y, zz).multiply(new Matrix4().makeRotationZ(Math.PI / 2)).multiply(new Matrix4().makeScale(d, t, d));
}

/**
 * The voussoirs of the three round arches, the pavilion's over its great window and each arched bay's, and the cornices of the middle section, the
 * pavilion's and each arched bay's, with the cornice over the bit of wall beyond the west end block, as one piece in the facade's frame: one mesh for
 * them all, so the end blocks' columns and their mitred cornices (weston-ends.ts) leave the core within its 130 (core.test.ts).
 */
function archesAndCornices(): BufferGeometry {
  return memo('weston-arches-cornices', () => {
    const b = new MeshBuilder();
    const ring = voussoirs({ span: WESTON_ARCH_SPAN, depth: 0.5, count: 21, projection: 0.1 });
    const cornice = moulding({ profile: 'cornice-plain', path: [[-WESTON_ARCH_BAY / 2, 0, 0], [WESTON_ARCH_BAY / 2, 0, 0]], height: 0.8, projection: 0.75 });
    for (const c of BAYS) {
      b.append(ring, placed(B_SOUTH_X, L2 + WESTON_ARCH_SPRING, c, FACING.south));
      b.append(cornice, placed(B_SOUTH_X, CORNICE_Y, c, FACING.south));
    }
    b.append(voussoirs({ span: PAVILION_WINDOW.width, depth: 0.6, count: 19, projection: 0.12 }), placed(B_SOUTH_X, L2 + PAVILION_WINDOW.spring, CENTRE_Z, FACING.south));
    b.append(moulding({ profile: 'cornice-plain', path: [[-WESTON_PAVILION_HALF, 0, 0], [WESTON_PAVILION_HALF, 0, 0]], height: 0.9, projection: 0.85 }), placed(B_SOUTH_X, CORNICE_Y, CENTRE_Z, FACING.south));
    const tail = WESTON_WEST_END_Z - WEST_Z;
    b.append(cornice, placed(B_SOUTH_X, CORNICE_Y, (WEST_Z + WESTON_WEST_END_Z) / 2, FACING.south).multiply(new Matrix4().makeScale(tail / WESTON_ARCH_BAY, 1, 1)));
    return b.build();
  });
}

/** Stone trim of the facade's middle section, course by course from the plinth to the coping; the end blocks have their own (weston-ends.ts). */
export function westonTrim(kit: Kit): void {
  const stone = core.westonStone;
  const e = SOUTH;
  const disc = cylinder(20);
  const ends = [CENTRE_Z - WESTON_END_FROM, CENTRE_Z + WESTON_END_FROM] as const;
  // The porch's pedestals, edge to edge: the dado stops at them. The main floor's head band stands at the height of the porch's entablature and runs
  // on to it, 1 cm short of what it meets at each height: the frieze, then from the cornice's foot the face of the cornice's bed mouldings (which step
  // back at their foot, so a little brick shows there), and over its soffit its corona. Outward it runs to the end blocks' entablature, which returns
  // along the face to meet it.
  const porch0 = CENTRE_Z - PORCH_REACH.pedestals;
  const porch1 = CENTRE_Z + PORCH_REACH.pedestals;
  // The base course, to the end blocks' own, which return round them, and on the bit of wall beyond the west block.
  elevationBox(kit, e, stone, ends[0] + 0.12, ends[1] - 0.12, WALL_BASE_Y, LG + 0.6, 0.12, 0, 0);
  elevationBox(kit, e, stone, WEST_Z, WESTON_WEST_END_Z, WALL_BASE_Y, LG + 0.6, 0.12, 0, 0);
  elevationBox(kit, e, stone, ends[0], ends[1], L1 - 0.45, L1, 0.14, 0, 0);
  for (const [a0, a1] of [
    [ends[0], porch0],
    [porch1, ends[1]],
  ] as const) {
    elevationBox(kit, e, stone, a0, a1, L1, L1 + WESTON_DADO, 0.1, 0, 1);
  }
  const band = { y0: L1 + WESTON_LOWER_HEAD, y1: L1 + WESTON_LOWER_HEAD + 0.75, cornice: L1 + PORCH_REACH.corniceFrom, soffit: L1 + PORCH_REACH.soffit };
  for (const s of [-1, 1]) {
    const end = CENTRE_Z + s * (WESTON_END_FROM - END_ENTABLATURE_RETURN);
    for (const [reach, y0, y1] of [
      [PORCH_REACH.frieze + 0.01, band.y0, band.cornice],
      [PORCH_REACH.bed + 0.01, band.cornice, band.soffit],
      [PORCH_REACH.corona + 0.01, band.soffit, band.y1],
    ] as const) {
      const near = CENTRE_Z + s * reach;
      elevationBox(kit, e, stone, Math.min(near, end), Math.max(near, end), y0, y1, 0.16, 0, 3);
    }
  }
  // Rusticated quoins, long and short blocks in turn, at the pavilion's edges and at the arched bays' outer edges.
  for (const edge of [CENTRE_Z - BAYS_END, PAV0, PAV1, CENTRE_Z + BAYS_END]) {
    let k = 0;
    for (let y = L1 + WESTON_DADO; y + 0.5 < CORNICE_Y; y += 0.58, k++) {
      const half = k % 2 === 0 ? QUOIN : 0.33;
      elevationBox(kit, e, stone, edge - half, edge + half, y, y + 0.54, 0.12, 0, 2 + Math.round((y - L1) / 1.5));
    }
  }
  // Beside the porch, on the pavilion's brick, a strip of quoins each side, long and short blocks in turn from the dado up to just under the head band,
  // clear of the porch's side pilasters and their capitals (interior-images.md #33 and #43).
  for (const s of [-1, 1]) {
    let k = 0;
    for (let y = L1 + WESTON_DADO; y + 0.5 < L1 + WESTON_LOWER_HEAD; y += 0.58, k++) {
      const near = CENTRE_Z + s * BESIDE_PORCH;
      const far = near + s * (k % 2 === 0 ? 0.9 : 0.62);
      elevationBox(kit, e, stone, Math.min(near, far), Math.max(near, far), y, y + 0.54, 0.12, 0, 2 + Math.round((y - L1) / 1.5));
    }
  }
  const spring = L2 + WESTON_ARCH_SPRING;
  const crown = spring + WESTON_ARCH_SPAN / 2;
  BAYS.forEach((c) => {
    for (const x of MAIN_X) kit.add(disc, stone, roundelMatrix(L1 + WESTON_DADO / 2, z(c, x), 0.7, 0.16), 1);
    // Stone piers between the windows, from the dado to the head band.
    for (const k of [-1, 0, 1]) {
      const x = k * (MAIN_WINDOW.width + PIER);
      elevationBox(kit, e, stone, z(c, x) - 0.25, z(c, x) + 0.25, L1 + WESTON_DADO, L1 + WESTON_LOWER_HEAD, 0.08, 0, 2);
    }
    elevationBox(kit, e, stone, z(c, -WESTON_ARCH_SPAN / 2) - 0.25, z(c, -WESTON_ARCH_SPAN / 2), spring - 0.3, spring, 0.12, 0, 6);
    elevationBox(kit, e, stone, z(c, WESTON_ARCH_SPAN / 2), z(c, WESTON_ARCH_SPAN / 2) + 0.25, spring - 0.3, spring, 0.12, 0, 6);
    // The keystone's console, up to the cornice (#33).
    elevationBox(kit, e, stone, z(c, -0.28), z(c, 0.28), crown + 0.2, CORNICE_Y, 0.2, 0, 8);
  });
  kit.add(archesAndCornices(), stone, new Matrix4(), 7);
  // The doorway's reveals and soffit, lined through the wall behind the porch, on its threshold.
  kit.add(holeLining(DOOR_LINED, DOOR_OPENING, OUTER_WALL), stone, placed(B_SOUTH_X, WALL_BASE_Y, CENTRE_Z, FACING.south), 4);
  addBox(kit, stone, B_SOUTH_X, L1 - DOOR.threshold, CENTRE_Z - DOOR_LINED.width / 2, B_SOUTH_X + OUTER_WALL, L1, CENTRE_Z + DOOR_LINED.width / 2, 4);
  for (const x of [-3.6, 3.6]) {
    kit.add(disc, stone, roundelMatrix(L2 + 3.6, z(CENTRE_Z, x), 1.25, 0.12), 8);
    kit.add(disc, palette.brick, roundelMatrix(L2 + 3.6, z(CENTRE_Z, x), 0.85, 0.16), 8);
  }
  // The coping over the middle section, to the end blocks', which overhang their returns, and over the bit of wall beyond the west end block.
  elevationBox(kit, e, stone, ends[0] + 0.08, ends[1] - 0.08, PARAPET_Y, COPING_TOP_Y, 0.08, OUTER_WALL, 11);
  elevationBox(kit, e, stone, WEST_Z, WESTON_WEST_END_Z, PARAPET_Y, COPING_TOP_Y, 0.08, OUTER_WALL, 11);
}

/** Windows of the facade and the pavilion, the entrance door in the porch's doorway, and the railing of the porch's balcony (weston-porch.ts). */
export function westonOpenings(kit: Kit): void {
  const { main, ground } = wingWindows();
  const arched = windowUnit({ width: WESTON_ARCH_SPAN, height: WESTON_ARCH_SPRING - ARCH_SILL + WESTON_ARCH_SPAN / 2, shape: 'arch', cols: 4, rows: 3 });
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
  for (const px of [-3.6, 3.6]) put(ground, z(CENTRE_Z, px), GROUND_WINDOW.sill, 5);
  put(big, CENTRE_Z, L2 + w.sill, 5);
  const dm = placed(WESTON_DOOR.x, L1, CENTRE_Z, FACING.south);
  kit.add(door.frame, palette.metalDark, dm, 5);
  kit.addTagged(door.leaf, core.westonDoorWood, dm, doorTag('weston'), 5);
  westonRailing(kit);
}
