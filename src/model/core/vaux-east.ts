/**
 * The 1880 building's east front at Z −69.0, toward Fifth Avenue until the Hunt Wing closed against it in 1902: two large arches either side of its
 * covered middle (exterior-images.md #66), each the 1880 arch (vaux-arch.ts) inside a ring of dark granite blocks round its voussoirs and a moulded light
 * granite arch round a roundel in its head, as the one surviving at the top of the Grand Staircase shows it (#67; exterior.md section 9). Their windows
 * are blind. The inner pair stand on the west front's bay, 0.35 m from the floor map's narrow corridors either side of the Grand Staircase, which
 * Heckscher says pass through them; the outer pair on today's passages into the stair halls, 12 m off the axis.
 * Today's openings stay as they were (the floor map's; work unit 2, M1): the passages on the main floor on the axis and 12 m either side, the
 * second-floor doors 10.3 m off the axis, which were cut through the outer arches' heads and took their roundels and the stones they cross, and on the
 * axis at the second floor the doorway from the Grand Staircase's cross hall into gallery 600 (frame.ts GALLERY_600_DOOR_*; interior.md, The Grand
 * Staircase), lined in granite with a threshold. The corridors through the inner pair wait for the owner (asked 2026-11-04), since they would add
 * passages for the walker; until an answer the inner pair's windows stay blind.
 */
import type { Kit } from '../../build/types.js';
import { GALLERY_600_DOOR_CROWN, GALLERY_600_DOOR_HALF_WIDTH, GALLERY_600_DOOR_LINING } from '../frame.js';
import { holeLining, openWall, type Hole } from './arches.js';
import { A_HALF, EAST_Z, L1, L2, OUTER_WALL, PARAPET_Y, VAUX_ARCH_SPAN, VAUX_BAY, VAUX_INNER_ORDER } from './constants.js';
import { INNER_EAST_Z } from './layout.js';
import { core } from './materials.js';
import { FACING, addBox, placed, runsBetween } from './shapes.js';
import { CLEAR, LINTEL_Y, ORDER_PROUD, SILL_Y, SPRING_Y, archHoles, darkHead, lightHead, type Cut } from './vaux-arch.js';
import { WALL_BASE_Y } from './vaux-front.js';

/** E: the inner pair on the west front's bay; the outer pair on today's passages into the stair halls (as before). */
const INNER_X = VAUX_BAY;
const OUTER_X = 12.0;
/** Today's main-floor passage on the axis: as wide as before, to the old springing's height. */
const PASSAGE = { width: CLEAR, height: 4.5 } as const;
/** Today's second-floor doors either side, 10.3 m off the axis (floor map), and the threshold under gallery 600's doorway. */
const SECOND_DOOR = { x: 10.3, width: 2.6, height: 3.2 } as const;
const DOOR_THRESHOLD = 0.03;
/** A second-floor door as a cut through the outer arch on its side, in that arch's frame (x from the arch's middle, y from the springing). */
function secondCut(sign: number): Cut {
  const [x0, x1] = [sign * SECOND_DOOR.x - SECOND_DOOR.width / 2 - sign * OUTER_X, sign * SECOND_DOOR.x + SECOND_DOOR.width / 2 - sign * OUTER_X];
  return [x0 - 0.03, L2 - SPRING_Y - 0.03, x1 + 0.03, L2 + SECOND_DOOR.height - SPRING_Y + 0.03];
}

/** The east wall from the footings to the parapet, with its arches' blind openings and today's openings. */
export function vauxEastWall(kit: Kit): void {
  const base = WALL_BASE_Y;
  const holes: Hole[] = [{ x: 0, y: L1 - base, width: PASSAGE.width, height: PASSAGE.height }];
  for (const s of [-1, 1]) {
    holes.push(...archHoles(s * INNER_X, base, { sill: SILL_Y, through: false }));
    holes.push(...archHoles(s * OUTER_X, base, { sill: L1, through: true }, false));
    holes.push({ x: s * SECOND_DOOR.x, y: L2 - base, width: SECOND_DOOR.width, height: SECOND_DOOR.height });
  }
  // The doorway into gallery 600, cut for its granite lining and a threshold under it, flush with the floors on both sides; the Hunt wing lines the
  // passage on through the cavity to its cross hall in the same section (hunt/stair.ts).
  const sill = L2 - base;
  const lined = GALLERY_600_DOOR_HALF_WIDTH + GALLERY_600_DOOR_LINING;
  const outer: Hole = { head: 'round', x: 0, y: sill, width: 2 * lined, height: GALLERY_600_DOOR_CROWN + GALLERY_600_DOOR_LINING };
  holes.push({ ...outer, y: sill - DOOR_THRESHOLD, height: outer.height + DOOR_THRESHOLD });
  const east = openWall({ width: 2 * A_HALF, height: PARAPET_Y - base, thickness: OUTER_WALL, holes });
  const frame = placed(0, base, EAST_Z, FACING.east);
  kit.add(east, core.vauxBrick, frame, 12);
  const inner: Hole = { head: 'round', x: 0, y: sill, width: 2 * GALLERY_600_DOOR_HALF_WIDTH, height: GALLERY_600_DOOR_CROWN };
  kit.add(holeLining(outer, inner, OUTER_WALL), core.granite, frame, 12);
  addBox(kit, core.granite, -lined, L2 - DOOR_THRESHOLD, INNER_EAST_Z, lined, L2, EAST_Z, 12);
}

/** Granite trim of the east front: the main floor's and the impost band, the windows' aprons, the jambs' inner order, and the four heads. */
export function vauxEastTrim(kit: Kit): void {
  const proud = 0.08;
  const box = (x0: number, x1: number, y0: number, y1: number, depth: number): void => {
    addBox(kit, core.granite, x0, y0, EAST_Z, x1, y1, EAST_Z + depth, 12);
  };
  const passages = [0, -OUTER_X, OUTER_X].map((x): [number, number] => [x - CLEAR / 2, x + CLEAR / 2]);
  for (const [x0, x1] of runsBetween(-A_HALF, A_HALF, passages)) box(x0, x1, L1 - 0.2, L1 + 0.12, proud);
  box(-A_HALF, A_HALF, LINTEL_Y, SPRING_Y, proud);
  for (const s of [-1, 1]) {
    for (const x of [s * INNER_X, s * OUTER_X]) {
      const window = Math.abs(x) === INNER_X;
      if (window) box(x - VAUX_ARCH_SPAN / 2, x + VAUX_ARCH_SPAN / 2, L1 + 0.12, SILL_Y, 0.05);
      for (const side of [-1, 1]) {
        const edge = x + side * (CLEAR / 2);
        box(Math.min(edge, edge + side * VAUX_INNER_ORDER), Math.max(edge, edge + side * VAUX_INNER_ORDER), window ? SILL_Y : L1, LINTEL_Y, ORDER_PROUD);
      }
      // Each head as two pieces placed at its arch, an inner one with its roundel's moulding round its brick (#67); an outer head is cut by the
      // second-floor door beside it.
      const cut = window ? undefined : secondCut(s);
      const at = placed(x, SPRING_Y, EAST_Z, FACING.east);
      kit.add(lightHead('east', cut), core.granite, at, 12);
      kit.add(darkHead('east', cut), core.graniteDark, at, 12);
    }
  }
}
