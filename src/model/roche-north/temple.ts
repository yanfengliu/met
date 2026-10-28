/**
 * The Temple of Dendur and its gate (about 15 BC, Aeolian sandstone; re-erected in the Sackler Wing, 1978), the area's landmark objects.
 * Temple: 6.40 m wide and high, 12.50 m long (Met API 547802), eleven courses (Aldred p. 77), an east pronaos of two composite-capital columns between antae
 * with screen walls, a lower rear block (vestibule and sanctuary), cavetto cornices on torus rolls, rolls up every corner and faintly battered walls.
 * Gate: 8.08 m high (Met API), 4.6 m wide and 3.35 m deep (DP244278, interior-images.md #16), a doorway 2.0 × 5.2 m, a winged sun disk on each face of its cornice, the broken stub
 * of the vanished enclosure wall on its south side (Haklai 2012, interior-images.md #13). Local frames: origin at the base centre, front (east) +Z; world +Z is east, so no turn.
 */
import { CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three';

import { cavettoCorniceProfile, papyriformColumn, sweep } from '../lib/index.js';
import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { layCourses, rectangleRuns, seeded, type WallRun } from './masonry.js';
import { areaMaterials } from './materials.js';
import { GATE_DEPTH, GATE_HEIGHT, GATE_WIDTH, TEMPLE_HEIGHT, TEMPLE_LENGTH, TEMPLE_WIDTH } from './plan.js';
import { UNIT_BOX, boxMatrix, memo } from './shapes.js';

type V3 = readonly [number, number, number];

const COURSE = 0.578;
const WALL = 0.9;
const BATTER = 0.012;
/** Pronaos depth along the axis (P4: the roofline steps down about 4 m behind the front); the rear block's roof is one course lower. */
const PRONAOS = 4.05;
const HX = TEMPLE_WIDTH / 2;
const HZ = TEMPLE_LENGTH / 2;
const ZP = HZ - PRONAOS;
/** Wall courses under the cornices: nine in the pronaos (to 5.2 m), eight at the rear; the cornice makes up the eleven. */
const PRONAOS_COURSES = 9;
const REAR_COURSES = 8;
const WALL_TOP = PRONAOS_COURSES * COURSE;
const REAR_TOP = REAR_COURSES * COURSE;
const CORNICE = TEMPLE_HEIGHT - WALL_TOP;
const COLUMN_X = 0.95;
const COLUMN_Z = HZ - 0.5;
const COLUMN_HEIGHT = 4.5;
const ANTA = 1.2;
/** The side door in the south wall, just behind the pronaos (P4: a narrow tall opening near the middle of the side), along the axis (local z) and its height. */
const SIDE_DOOR: readonly [number, number, number] = [0.6, 1.3, 2.5];

/** A unit cylinder (diameter 1, height 1) standing on its base. */
const ROLL = memo('rn-roll', () => new CylinderGeometry(0.5, 0.5, 1, 10, 1, false).translate(0, 0.5, 0));
/** A disc of diameter 1 and thickness 1, its face toward +Z, for the winged sun. */
const DISC = memo('rn-disc', () => new CylinderGeometry(0.5, 0.5, 1, 20, 1, false).rotateX(Math.PI / 2));

function placed(frame: Matrix4, position: V3, scale: V3): Matrix4 {
  return frame.clone().multiply(new Matrix4().compose(new Vector3(...position), new Quaternion(), new Vector3(...scale)));
}

function block(kit: Kit, frame: Matrix4, min: V3, max: V3): void {
  kit.add(UNIT_BOX, palette.sandstone, frame.clone().multiply(boxMatrix(min, max)));
}

/** A cavetto cornice round the rectangle x0..x1 × z0..z1 at height `y`, its torus on the wall face. */
function corniceLoop(kit: Kit, frame: Matrix4, x0: number, x1: number, z0: number, z1: number, y: number, height: number, projection: number): void {
  const geometry = memo(`rn-cornice|${[x0, x1, z0, z1, y, height, projection].map((v) => v.toFixed(3)).join(',')}`, () =>
    sweep(
      cavettoCorniceProfile({ height, projection }),
      [
        [x0, y, z1],
        [x1, y, z1],
        [x1, y, z0],
        [x0, y, z0],
      ],
      { closed: true },
    ),
  );
  kit.add(geometry, palette.sandstone, frame.clone());
}

/** Vertical torus rolls of `radius` at the given (x, z) corners, from `y0` to `y1`. */
function rolls(kit: Kit, frame: Matrix4, corners: readonly (readonly [number, number])[], y0: number, y1: number, radius: number): void {
  for (const [x, z] of corners) kit.add(ROLL, palette.sandstone, placed(frame, [x, y0, z], [2 * radius, y1 - y0, 2 * radius]));
}

/** A winged sun disk centred at (0, y) on a face at `z`: the disc and two tapering wings. */
function wingedSun(kit: Kit, frame: Matrix4, y: number, z: number, span: number): void {
  const t = 0.06;
  kit.add(DISC, palette.sandstone, placed(frame, [0, y, z], [span * 0.15, span * 0.15, 2 * t]));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x0 = span * (0.085 + 0.14 * k);
      const half = span * (0.04 - 0.009 * k);
      block(kit, frame, [s > 0 ? x0 : -x0 - span * 0.14, y - half, z - t], [s > 0 ? x0 + span * 0.14 : -x0, y + half, z + t]);
    }
  }
}

/** Lays the temple's wall courses: the pronaos side walls (a door in the south one) and antae, the back wall with the inner door, the rear block and its cross wall. */
export function addTempleWalls(kit: Kit, frame: Matrix4): void {
  const spec = { course: COURSE, batter: BATTER } as const;
  const pronaos: WallRun[] = [
    { axis: 'z', from: ZP, to: HZ, inner: HX - WALL, outer: HX },
    { axis: 'z', from: ZP, to: HZ, inner: -HX + WALL, outer: -HX },
  ];
  layCourses(kit, palette.sandstone, frame, pronaos, { ...spec, courses: PRONAOS_COURSES, block: 1.25, seed: 11 });
  // The antae: the side walls thicken inward at the front, unbattered inside.
  const antae = [-1, 1].map((s): WallRun => ({ axis: 'z', from: HZ - 0.9, to: HZ, inner: s * (HX - ANTA), outer: s * (HX - WALL) }));
  layCourses(kit, palette.sandstone, frame, antae, { course: COURSE, batter: 0, courses: PRONAOS_COURSES, block: 1, seed: 13 });
  // Rear block: its four walls, bonded at the corners: the front one is the pronaos' back wall with the inner door, the south one has the side door.
  // Rear-frame z is temple z less the frame's offset (ZP − HZ) / 2.
  const rearHalf = (ZP + HZ) / 2;
  const shift = (ZP - HZ) / 2;
  const rearFrame = frame.clone().multiply(new Matrix4().makeTranslation(0, 0, shift));
  layCourses(kit, palette.sandstone, rearFrame, rectangleRuns(HX, rearHalf, WALL, { '+z': [[-0.55, 0.55, 3.0]], '-x': [[SIDE_DOOR[0] - shift, SIDE_DOOR[1] - shift, SIDE_DOOR[2]]] }), { ...spec, courses: REAR_COURSES, block: 1.3, seed: 23 });
  // The cross wall before the sanctuary, plumb.
  const cross: WallRun[] = [{ axis: 'x', from: -HX + WALL, to: HX - WALL, inner: -0.6, outer: -1.3, gaps: [[-0.45, 0.45, 2.5]] }];
  layCourses(kit, palette.sandstone, rearFrame, cross, { course: COURSE, batter: 0, courses: REAR_COURSES, block: 1.3, seed: 29 });
  // Above the rear roof the pronaos' back wall rises one more course to its cornice.
  layCourses(kit, palette.sandstone, frame.clone().multiply(new Matrix4().makeTranslation(0, REAR_TOP, 0)), [{ axis: 'x', from: -HX + REAR_COURSES * BATTER, to: HX - REAR_COURSES * BATTER, inner: ZP, outer: ZP - WALL }], {
    course: COURSE,
    batter: 0,
    courses: PRONAOS_COURSES - REAR_COURSES,
    block: 1.4,
    seed: 31,
  });
}

/** The pronaos front (two columns, screen walls, architrave and winged sun), the roofs, cornices, corner rolls and the relief registers. */
export function addTempleCrown(kit: Kit, frame: Matrix4): void {
  const inset = PRONAOS_COURSES * BATTER;
  const rearInset = REAR_COURSES * BATTER;
  const column = papyriformColumn({ height: COLUMN_HEIGHT, diameter: 0.8, capital: 'bell', stems: 8 });
  for (const x of [-COLUMN_X, COLUMN_X]) kit.add(column, palette.sandstone, frame.clone().multiply(new Matrix4().makeTranslation(x, 0, COLUMN_Z)));
  // Screen walls between each column and its anta, a little over half the column's height, capped by a small cornice.
  const screenTop = 2.55;
  const screenCap = cavettoCorniceProfile({ height: 0.42, projection: 0.18 });
  for (const s of [-1, 1]) {
    const a = Math.min(s * (COLUMN_X + 0.36), s * (HX - ANTA));
    const b = Math.max(s * (COLUMN_X + 0.36), s * (HX - ANTA));
    block(kit, frame, [a, 0, HZ - 0.75], [b, screenTop, HZ - 0.2]);
    const cap = memo(`rn-screen-cap|${String(s)}`, () =>
      sweep(screenCap, [
        [a, screenTop, HZ - 0.2],
        [b, screenTop, HZ - 0.2],
      ]),
    );
    kit.add(cap, palette.sandstone, frame.clone());
  }
  // Architrave on the columns; the pronaos and rear roof slabs inside their cornices.
  block(kit, frame, [-HX + ANTA - 0.05, COLUMN_HEIGHT, HZ - 0.95], [HX - ANTA + 0.05, WALL_TOP, HZ - inset]);
  block(kit, frame, [-HX + inset, WALL_TOP - 0.4, ZP - WALL], [HX - inset, WALL_TOP, HZ - 0.95]);
  block(kit, frame, [-HX + rearInset, REAR_TOP - 0.4, -HZ + rearInset], [HX - rearInset, REAR_TOP, ZP - WALL]);
  corniceLoop(kit, frame, -HX + inset, HX - inset, ZP - WALL, HZ - inset, WALL_TOP, CORNICE, 0.42);
  corniceLoop(kit, frame, -HX + rearInset, HX - rearInset, -HZ + rearInset, ZP - WALL, REAR_TOP, CORNICE - 0.1, 0.38);
  block(kit, frame, [-HX + inset + 0.02, WALL_TOP, ZP - WALL + 0.02], [HX - inset - 0.02, TEMPLE_HEIGHT - 0.03, HZ - inset - 0.02]);
  block(kit, frame, [-HX + rearInset + 0.02, REAR_TOP, -HZ + rearInset + 0.02], [HX - rearInset - 0.02, REAR_TOP + CORNICE - 0.13, ZP - WALL - 0.02]);
  // Torus rolls: up the front and back corners, and where the pronaos rises above the rear roof.
  rolls(kit, frame, [[-HX + inset / 2, HZ - inset / 2], [HX - inset / 2, HZ - inset / 2]], 0, WALL_TOP, 0.1);
  rolls(kit, frame, [[-HX + rearInset / 2, -HZ + rearInset / 2], [HX - rearInset / 2, -HZ + rearInset / 2]], 0, REAR_TOP, 0.1);
  rolls(kit, frame, [[-HX + inset / 2, ZP - WALL], [HX - inset / 2, ZP - WALL]], REAR_TOP + CORNICE - 0.1, WALL_TOP, 0.1);
  wingedSun(kit, frame, WALL_TOP + 0.5, HZ - inset + 0.22, 2.6);
  // Relief registers: two raised bands along each outer side wall, framing the carved scenes; the south ones stop at the side door.
  for (const y of [1.25, 3.3]) {
    for (const s of [-1, 1]) {
      const x0 = s * (HX - (y / COURSE) * BATTER);
      const spans: (readonly [number, number])[] = s < 0 && y < SIDE_DOOR[2] ? [[-HZ + 0.3, SIDE_DOOR[0]], [SIDE_DOOR[1], HZ - 0.3]] : [[-HZ + 0.3, HZ - 0.3]];
      for (const [z0, z1] of spans) block(kit, frame, [Math.min(x0, x0 + s * 0.035), y, z0], [Math.max(x0, x0 + s * 0.035), y + 0.07, z1]);
    }
  }
}

/** The gate: piers laid in courses, lintel courses across the door, the cavetto cornice with its torus, the winged sun on both faces and the enclosure-wall stub. */
export function addGate(kit: Kit, frame: Matrix4): void {
  const hx = GATE_WIDTH / 2;
  const hz = GATE_DEPTH / 2;
  const door = 1.0;
  const cornice = 1.5;
  const body = GATE_HEIGHT - cornice;
  const courses = Math.round(body / 0.477);
  const step = body / courses;
  const doorCourses = 11;
  const batter = 0.008;
  const piers = [-1, 1].map((s): WallRun => ({ axis: 'z', from: -hz, to: hz, inner: s * door, outer: s * hx }));
  layCourses(kit, palette.sandstone, frame, piers, { course: step, courses: doorCourses, batter, block: 1.2, seed: 41 });
  const lintelInset = doorCourses * batter;
  layCourses(kit, palette.sandstone, frame.clone().multiply(new Matrix4().makeTranslation(0, doorCourses * step, 0)), [{ axis: 'x', from: -hx + lintelInset, to: hx - lintelInset, inner: -hz, outer: hz }], {
    course: step,
    courses: courses - doorCourses,
    batter: 0,
    block: 2.3,
    seed: 43,
  });
  const top = courses * step;
  corniceLoop(kit, frame, -hx + lintelInset, hx - lintelInset, -hz, hz, top, cornice, 0.62);
  block(kit, frame, [-hx + lintelInset + 0.02, top, -hz + 0.02], [hx - lintelInset - 0.02, GATE_HEIGHT - 0.03, hz - 0.02]);
  rolls(kit, frame, [[-hx + lintelInset / 2, -hz], [-hx + lintelInset / 2, hz], [hx - lintelInset / 2, -hz], [hx - lintelInset / 2, hz]], 0, top, 0.09);
  for (const f of [-1, 1]) wingedSun(kit, frame, top + cornice * 0.42, f * (hz + 0.32), 3.2);
  // The broken stub of the enclosure wall against the south pier, its top left ragged.
  block(kit, frame, [-hx - 1.05, 0, -0.75], [-hx + 0.03, 5.4, 0.75]);
  block(kit, frame, [-hx - 0.7, 5.4, -0.75], [-hx + 0.03, 6.05, 0.45]);
}

/** Rows of irregular worn slabs over x0..x1 × z0..z1, their tops at `y` (a few sunk by up to 2 cm), `thickness` deep. */
export function flagstones(kit: Kit, x0: number, x1: number, z0: number, z1: number, y: number, thickness: number, seed: number): void {
  const rand = seeded(seed);
  let z = z0;
  while (z < z1 - 0.05) {
    const depth = Math.min(z1 - z, 0.9 + 0.7 * rand());
    let x = x0;
    while (x < x1 - 0.05) {
      const width = Math.min(x1 - x, 0.8 + 1.1 * rand());
      kit.add(UNIT_BOX, areaMaterials.oldPaving, boxMatrix([x + 0.012, y - thickness, z + 0.012], [x + width - 0.012, y - 0.02 * rand(), z + depth - 0.012]));
      x += width;
    }
    z += depth;
  }
}
