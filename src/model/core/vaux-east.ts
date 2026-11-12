/**
 * The 1880 building's east front at Z −66.79 (frame.ts EAST_FACE_Z_CORE, the floor map's line since work unit 23), toward Fifth Avenue until the Hunt Wing closed against it in 1902: two large arches either side of its
 * covered middle (exterior-images.md #66), each the 1880 arch (vaux-arch.ts) inside a ring of dark granite blocks round its voussoirs and a moulded light
 * granite arch round a roundel in its head, as the one surviving at the top of the Grand Staircase shows it (#67; exterior.md section 9). Their windows
 * are blind. The inner pair stand on the west front's bay, 0.35 m from the floor map's narrow corridors either side of the Grand Staircase, which
 * pass through them, as Heckscher says; the outer pair on today's passages into the stair halls, 12 m off the axis.
 * Today's openings, the floor map's (work unit 2, M1; work unit 23): the passages on the main floor on the axis and 12 m either side, the
 * second-floor door on the north outer arch's axis (frame.ts EAST_FRONT_SECOND_DOOR_*), cut through that arch's head, taking its roundel and the stones
 * it crosses, where the south outer head stands whole, as #67 shows it at gallery 690's entrance (until work unit 23 a door either side, 10.3 m off the
 * axis, from the map's doors at the corridors' ends, Z −68.84, which now fall inside the core), and on the
 * axis at the second floor the doorway from the Grand Staircase's cross hall into gallery 600 (frame.ts GALLERY_600_DOOR_*; interior.md, The Grand
 * Staircase), lined in granite with a threshold. The corridors through the inner pair, between gallery 304 and the Hunt Wing's galleries 300 and 301,
 * are open (the owner's call, 2026-11-04: "Open both"); round each the arch stays blind, its opening filled with brick.
 */
import type { Kit } from '../../build/types.js';
import { EAST_FRONT_SECOND_DOOR_WIDTH, EAST_FRONT_SECOND_DOOR_X, GALLERY_600_DOOR_CROWN, GALLERY_600_DOOR_HALF_WIDTH, GALLERY_600_DOOR_LINING } from '../frame.js';
import { holeLining, openWall, type Hole } from './arches.js';
import { A_HALF, EAST_Z, L1, L2, OUTER_WALL, PARAPET_Y, VAUX_ARCH_SPAN, VAUX_BAY, VAUX_INNER_ORDER } from './constants.js';
import { INNER_EAST_Z } from './layout.js';
import { core } from './materials.js';
import { FACING, addBox, placed, runsBetween } from './shapes.js';
import { CLEAR, HEAD_DEPTH, LINTEL_Y, ORDER_PROUD, SILL_Y, SPRING_Y, archHoles, darkHead, lightHead, type Cut } from './vaux-arch.js';
import { WALL_BASE_Y } from './vaux-front.js';

/** E: the inner pair on the west front's bay; the outer pair on today's passages into the stair halls (as before). */
const INNER_X = VAUX_BAY;
const OUTER_X = 12.0;
/**
 * The corridors through the inner pair (the floor map's doors between gallery 304 and the Hunt Wing's galleries 300 and 301: X −7.04..−5.26 and
 * +5.31..+7.06, 1.78 and 1.75 m wide), each 1.78 m wide against its arch's outer jamb, within 6 cm of the map's lines. E: the head, 4 m over the
 * main floor, as high as the end blocks' doors in the side walls (vaux-sides.ts); the map gives no heights.
 */
const CORRIDOR = { width: 1.78, height: 4.0 } as const;
/** World X of the corridor through the inner arch on side `s` (−1 south, +1 north), from its lower X to its upper. */
export function eastCorridor(s: number): readonly [number, number] {
  const outer = s * (INNER_X + CLEAR / 2);
  const inner = outer - s * CORRIDOR.width;
  return [Math.min(inner, outer), Math.max(inner, outer)];
}
/** The corridors' head. */
export const EAST_CORRIDOR_TOP_Y = L1 + CORRIDOR.height;
/** How far the brick round the corridors stands off the wall's inner face and behind the head niches' backs. */
const INFILL_CLEAR = 0.01;
/** Today's main-floor passage on the axis: as wide as before, to the old springing's height. */
const PASSAGE = { width: CLEAR, height: 4.5 } as const;
/** Today's second-floor door on the north, on the outer arch's axis (frame.ts), 3.2 m high (E), and the threshold under gallery 600's doorway. */
const SECOND_DOOR = { x: EAST_FRONT_SECOND_DOOR_X, width: EAST_FRONT_SECOND_DOOR_WIDTH, height: 3.2 } as const;
const DOOR_THRESHOLD = 0.03;
/** A second-floor door as a cut through the outer arch on its side, in that arch's frame (x from the arch's middle, y from the springing). */
function secondCut(sign: number): Cut {
  const [x0, x1] = [sign * SECOND_DOOR.x - SECOND_DOOR.width / 2 - sign * OUTER_X, sign * SECOND_DOOR.x + SECOND_DOOR.width / 2 - sign * OUTER_X];
  return [x0 - 0.03, L2 - SPRING_Y - 0.03, x1 + 0.03, L2 + SECOND_DOOR.height - SPRING_Y + 0.03];
}

/** A clear opening through the east front, its world X and Y: the arches and the doorway up to their springing. */
export interface EastOpening {
  readonly name: string;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Every opening through the east front, for the Hunt wing's check that none of its faces stands in one on the front's outer face (hunt/hunt.test.ts). */
export function eastOpenings(): readonly EastOpening[] {
  const out: EastOpening[] = [{ name: 'main-floor passage', x0: -PASSAGE.width / 2, x1: PASSAGE.width / 2, y0: L1, y1: L1 + PASSAGE.height }];
  for (const s of [-1, 1]) {
    const [c0, c1] = eastCorridor(s);
    out.push({ name: `corridor at X ${(s * INNER_X).toFixed(1)}`, x0: c0, x1: c1, y0: L1, y1: EAST_CORRIDOR_TOP_Y });
    out.push({ name: `passage at X ${(s * OUTER_X).toFixed(1)}`, x0: s * OUTER_X - CLEAR / 2, x1: s * OUTER_X + CLEAR / 2, y0: L1, y1: LINTEL_Y });
  }
  out.push({ name: `second-floor door at X ${SECOND_DOOR.x.toFixed(2)}`, x0: SECOND_DOOR.x - SECOND_DOOR.width / 2, x1: SECOND_DOOR.x + SECOND_DOOR.width / 2, y0: L2, y1: L2 + SECOND_DOOR.height });
  out.push({ name: "gallery 600's doorway", x0: -GALLERY_600_DOOR_HALF_WIDTH, x1: GALLERY_600_DOOR_HALF_WIDTH, y0: L2, y1: L2 + GALLERY_600_DOOR_CROWN - GALLERY_600_DOOR_HALF_WIDTH });
  return out;
}

/**
 * The brick filling an inner arch's opening round its corridor: flush with the east face under the window's sill, where the apron stands, and set
 * back above it a centimetre deeper than the arches' blind heads, so the arch reads blind round the corridor as it did before; 1 cm short of the
 * wall's inner face, so in gallery 304 it reads as a panel set in the opening. Set with the east front's trim (vauxEastTrim, in the openings step),
 * so the floor band and apron stand in front of it. The centimetre keeps its faces out of the wall's and the head niche's planes (review 6, F54).
 */
function eastInfill(kit: Kit, s: number): void {
  const [c0, c1] = eastCorridor(s);
  const [o0, o1] = [s * INNER_X - CLEAR / 2, s * INNER_X + CLEAR / 2];
  const [b0, b1] = s > 0 ? [o0, c0] : [c1, o1];
  const inner = INNER_EAST_Z + INFILL_CLEAR;
  const back = EAST_Z - HEAD_DEPTH - INFILL_CLEAR;
  addBox(kit, core.vauxBrick, b0, L1, inner, b1, SILL_Y, EAST_Z);
  addBox(kit, core.vauxBrick, b0, SILL_Y, inner, b1, EAST_CORRIDOR_TOP_Y, back);
  addBox(kit, core.vauxBrick, o0, EAST_CORRIDOR_TOP_Y, inner, o1, LINTEL_Y, back);
}

/**
 * The east wall from the footings to the parapet, with its arches' openings: the four lower ones through from the main floor, the inner pair's to be
 * filled round their corridors with the trim (eastInfill), and their blind heads; and today's openings.
 */
export function vauxEastWall(kit: Kit): void {
  const base = WALL_BASE_Y;
  const holes: Hole[] = [{ x: 0, y: L1 - base, width: PASSAGE.width, height: PASSAGE.height }];
  for (const s of [-1, 1]) {
    // The inner pair open through from the main floor, filled round their corridors with the trim (eastInfill).
    holes.push(...archHoles(s * INNER_X, base, { sill: L1, through: true }));
    // The outer pair open through from the main floor too; the north head gave way to the second-floor door, the south keeps its niche.
    holes.push(...archHoles(s * OUTER_X, base, { sill: L1, through: true }, s < 0));
  }
  holes.push({ x: SECOND_DOOR.x, y: L2 - base, width: SECOND_DOOR.width, height: SECOND_DOOR.height });
  // The doorway into gallery 600, cut for its granite lining and a threshold under it, flush with the floors on both sides; the cross hall's back wall
  // stands on this wall's outer face with its own arch of the same section (hunt/stair.ts).
  const sill = L2 - base;
  const lined = GALLERY_600_DOOR_HALF_WIDTH + GALLERY_600_DOOR_LINING;
  const outer: Hole = { head: 'round', x: 0, y: sill, width: 2 * lined, height: GALLERY_600_DOOR_CROWN + GALLERY_600_DOOR_LINING };
  holes.push({ ...outer, y: sill - DOOR_THRESHOLD, height: outer.height + DOOR_THRESHOLD });
  const east = openWall({ width: 2 * A_HALF, height: PARAPET_Y - base, thickness: OUTER_WALL, holes });
  const frame = placed(0, base, EAST_Z, FACING.east);
  kit.add(east, core.vauxBrick, frame);
  const inner: Hole = { head: 'round', x: 0, y: sill, width: 2 * GALLERY_600_DOOR_HALF_WIDTH, height: GALLERY_600_DOOR_CROWN };
  kit.add(holeLining(outer, inner, OUTER_WALL), core.granite, frame);
  addBox(kit, core.granite, -lined, L2 - DOOR_THRESHOLD, INNER_EAST_Z, lined, L2, EAST_Z);
}

/** Granite trim of the east front: the main floor's and the impost band, the windows' aprons, the jambs' inner order, and the four heads; and the brick round the corridors. */
export function vauxEastTrim(kit: Kit): void {
  for (const s of [-1, 1]) eastInfill(kit, s);
  const proud = 0.08;
  const box = (x0: number, x1: number, y0: number, y1: number, depth: number): void => {
    addBox(kit, core.granite, x0, y0, EAST_Z, x1, y1, EAST_Z + depth);
  };
  const passages = [0, -OUTER_X, OUTER_X].map((x): [number, number] => [x - CLEAR / 2, x + CLEAR / 2]);
  const corridors = [-1, 1].map(eastCorridor);
  for (const [x0, x1] of runsBetween(-A_HALF, A_HALF, [...passages, ...corridors])) box(x0, x1, L1 - 0.2, L1 + 0.12, proud);
  box(-A_HALF, A_HALF, LINTEL_Y, SPRING_Y, proud);
  for (const s of [-1, 1]) {
    for (const x of [s * INNER_X, s * OUTER_X]) {
      const window = Math.abs(x) === INNER_X;
      // An inner arch's apron runs from its inner side to its corridor, whose outer jamb's inner order runs down to the floor.
      const [c0, c1] = eastCorridor(s);
      if (window) box(s > 0 ? x - VAUX_ARCH_SPAN / 2 : c1, s > 0 ? c0 : x + VAUX_ARCH_SPAN / 2, L1 + 0.12, SILL_Y, 0.05);
      for (const side of [-1, 1]) {
        const edge = x + side * (CLEAR / 2);
        const sill = window && side !== s ? SILL_Y : L1;
        box(Math.min(edge, edge + side * VAUX_INNER_ORDER), Math.max(edge, edge + side * VAUX_INNER_ORDER), sill, LINTEL_Y, ORDER_PROUD);
      }
      // Each head as two pieces placed at its arch, with its roundel's moulding round its brick (#67, the south outer one); the north outer head is
      // cut by the second-floor door.
      const cut = !window && s > 0 ? secondCut(s) : undefined;
      const at = placed(x, SPRING_Y, EAST_Z, FACING.east);
      kit.add(lightHead('east', cut), core.granite, at);
      kit.add(darkHead('east', cut), core.graniteDark, at);
    }
  }
}
