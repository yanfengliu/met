/**
 * The two end blocks of Theodore Weston's 1888 south front (history.md section 3; weston-facade.ts has the pavilion and the arched bays), which project
 * into the Petrie Court beyond each arched bay and its strip of brick. Weston's approved elevation of 1885 and his 1888 first-floor plan draw them
 * (Heckscher figs. 28 and 26: "projecting flanking sections", their main floor "articulated by pilasters and pairs of double-window openings", their
 * upper wall blind for skylit picture galleries), the photograph of about 1895 from the south-east shows them built (fig. 35), and the court's
 * photographs show them today (interior-images.md #33, #35, #45 and #46; interior.md, Weston's 1888 front). Each block: a brick ground storey on the
 * front's base course, which stands on the footing, up to a stone podium at the main floor; three bays, each a column with a dark granite shaft between two
 * windows, bricked up since, set back between brick piers, a wide pier at the block's inner end and a pier at its outer end; the main floor's head band
 * carried round the block as the columns' entablature; above, brick with pilasters on stone bases under console capitals, a stone panel on a moulded
 * sill over each bay, a stone frieze with two roundels on the return, and the front's cornice and coping, all returned round the block.
 * The block projects 1.2 m (#33 and #35 see its return faces face-on) and its bays stand 0.55 m back between the piers (#35 and #46). The parts keep
 * fig. 28's widths (inner pier 2.8, bay 3.4, pier 1.3, bay, pier, bay, of 16.9), but for the last pier, which fig. 28 draws as a corner 3.4 wide and #46
 * shows, where the court's east wall meets the block, no wider than the others; they are scaled to the blocks' length, the columns 0.6 m whatever the
 * scale. Both blocks run 19.75 m, to the court's ends, which stand symmetric about the door as the floor map's court does: the west one to the Kravis
 * Wing's pier, the east one to the McKim, Mead & White south link's park wall (work unit 22, on the owner's "Yes, do it"; interior.md). The model's
 * core's east face stands on the floor map's line, Z −66.79 (work unit 23), so the east block's last 1.85 m stand before Hunt's podium and south
 * wall, and from 1888 until those rise behind them (1898 and 1899) past wing B's east end, where fig. 35 shows the front reaching the wing's corner;
 * over them the coping stops at the front's face. The model shows today's bricked-up bays from
 * 1888, as it shows the 1880 building's side walls (vaux-sides.ts); fig. 35 shows them glazed, and the ground storey's small windows, which the model
 * leaves out.
 * Frame: `out` measures from the front's brick face (X −49.7) into the court (toward −X); `u` from a block's inner end along it, toward its outer end.
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { moulding } from '../lib/index.js';
import type { V3 } from '../lib/index.js';
import { palette } from '../palette.js';
import {
  B_SOUTH_X,
  COPING_TOP_Y,
  CORNICE_Y,
  EAST_Z,
  L1,
  LG,
  OUTER_WALL,
  PARAPET_Y,
  WESTON_ARCH_BAY,
  WESTON_EAST_END_Z,
  WESTON_END_FROM,
  WESTON_END_PROJECTION,
  WESTON_LOWER_HEAD,
  WESTON_PAVILION_HALF,
  WESTON_PAVILION_Z,
  WESTON_WEST_END_Z,
} from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, memo, placed } from './shapes.js';
import { WALL_BASE_Y } from './vaux-front.js';

/** An end block: west (−1) or east (+1) of the pavilion, its inner end (the return face, toward the pavilion) and its outer end, as world Z. */
export interface EndBlock {
  readonly side: -1 | 1;
  readonly inner: number;
  readonly outer: number;
}

export const END_BLOCKS: readonly EndBlock[] = [
  { side: -1, inner: WESTON_PAVILION_Z - WESTON_END_FROM, outer: WESTON_WEST_END_Z },
  { side: 1, inner: WESTON_PAVILION_Z + WESTON_END_FROM, outer: WESTON_EAST_END_Z },
];

/** World X `d` metres out from the front's brick face into the court. */
const out = (d: number): number => B_SOUTH_X - d;

const PROJ = WESTON_END_PROJECTION;
/** How far the bays' bricked-up windows stand back from the piers' faces. */
const RECESS = 0.55;
/** The parts of a block from its inner end: inner pier, bay, pier, bay, pier, bay, pier; the bays are the odd ones (see the header). */
const PARTS = [2.8, 3.4, 1.3, 3.4, 1.3, 3.4, 1.3] as const;
const PARTS_LENGTH = PARTS.reduce((a, b) => a + b, 0);
/** The columns' lower diameter (fig. 28, about 0.65 m), their axes on the piers' face line. */
const COLUMN_D = 0.6;
/** The cornice's run before each block, on the front's face: from the arched bay's edge, over its quoins and the strip of brick. */
const STRIP_RUN = WESTON_END_FROM - WESTON_PAVILION_HALF - WESTON_ARCH_BAY;

/** Heights. The podium carries the columns; the entablature runs from the arched bays' head band's foot, 5 cm taller so their tops never meet in one plane. */
const PODIUM = { bottom: L1 - 0.3, top: L1 + 1.0, out: PROJ + 0.5, cap: 0.12 } as const;
/** The front's base course (weston-facade.ts), returned round the block's ground storey. */
const BASE = { top: LG + 0.6, out: PROJ + 0.12 } as const;
const HEAD = L1 + WESTON_LOWER_HEAD;
const ENTABLATURE = { top: HEAD + 0.8, out: PROJ + 0.4, crown: 0.25, overhang: 0.2 } as const;
/**
 * How far the entablature returns along the front's face beyond each block, toward the pavilion, its body and, overhanging it there as on the front,
 * its crown, which starts `crownFrom`: the arched bays' head band meets each, below and above that height.
 */
export const END_ENTABLATURE_RETURN = { body: ENTABLATURE.out - PROJ, crown: ENTABLATURE.out - PROJ + ENTABLATURE.overhang, crownFrom: ENTABLATURE.top - ENTABLATURE.crown } as const;
/** The column's parts over the podium: the plinth, the base's torus and fillet, then under the entablature the astragal, the echinus and the abacus. */
const COLUMN = { plinth: 0.12, torus: 0.12, fillet: 0.06, astragal: 0.06, echinus: 0.14, abacus: 0.16 } as const;
/** The upper wall: the pilasters' bases, the panels' sills and tops, the console capitals and the frieze under the cornice. */
const UPPER = { base: ENTABLATURE.top + 0.45, sill: 13.65, panel: 13.95, frieze: CORNICE_Y - 0.6, console: CORNICE_Y - 0.6 - 0.75 } as const;
const PANEL_TOP = UPPER.frieze - 0.12;
/** How far each piece of the upper wall stands out from the block's brick face. */
const STANDS = { pilaster: 0.12, base: 0.18, consoleLow: 0.2, consoleHigh: 0.28, panel: 0.04, sill: 0.14, frieze: 0.06, coping: 0.08 } as const;

/** A block's length and the scale of the parts on it. */
function scaleOf(b: EndBlock): number {
  return Math.abs(b.outer - b.inner) / PARTS_LENGTH;
}

/** How far along the block, from its inner end, the core's wall stands behind it: to the core's east face (EAST_Z) on the east, past its end on the west. */
function backed(b: EndBlock): number {
  const length = Math.abs(b.outer - b.inner);
  return b.side > 0 ? Math.min(length, EAST_Z - b.inner) : length;
}

/** World Z at `u` along the block from its inner end. */
function zAt(b: EndBlock, u: number): number {
  return b.inner + b.side * u;
}

/** The world Z interval from `u0` to `u1` along the block, low end first. */
function span(b: EndBlock, u0: number, u1: number): [number, number] {
  const a = zAt(b, u0);
  const c = zAt(b, u1);
  return a < c ? [a, c] : [c, a];
}

/** The block's parts as [u0, u1] from its inner end. */
function partsOf(b: EndBlock): [number, number][] {
  const k = scaleOf(b);
  let u = 0;
  return PARTS.map((w) => {
    const u0 = u;
    u += w * k;
    return [u0, u];
  });
}

/** A world box `out` from d0 to d1 off the front's face, y from y0 to y1, along the block from u0 to u1. */
function boxOut(kit: Kit, b: EndBlock, material: Parameters<typeof addBox>[1], d0: number, d1: number, y0: number, y1: number, u0: number, u1: number): void {
  const [z0, z1] = span(b, u0, u1);
  addBox(kit, material, out(d1), y0, z0, out(d0), y1, z1);
}

/**
 * The pilasters' middles along the block (u) and their width, fig. 28's 20 to 28 px: half a pier's width outside each bay, so each panel stands
 * over its bay's column (fig. 28 centres them on the piers).
 */
function pilasters(b: EndBlock): { readonly us: readonly number[]; readonly width: number } {
  const k = scaleOf(b);
  const [, bay1 = [0, 0], , bay3 = [0, 0], , bay5 = [0, 0]] = partsOf(b);
  const half = (PARTS[2] * k) / 2;
  return { us: [bay1[0] - half, bay1[1] + half, bay3[1] + half, bay5[1] + half], width: 0.97 * k };
}

/** The block's brick: its ground storey over the base course, the mass from the main floor's head to the parapet, the piers and the bays' bricked-up windows between, and the pilasters. */
export function westonEndWalls(kit: Kit): void {
  for (const b of END_BLOCKS) {
    const length = Math.abs(b.outer - b.inner);
    const parts = partsOf(b);
    boxOut(kit, b, palette.brick, 0, PROJ, BASE.top, PODIUM.bottom, 0, length);
    boxOut(kit, b, palette.brick, 0, PROJ, HEAD, PARAPET_Y, 0, length);
    parts.forEach(([u0, u1], i) => {
      boxOut(kit, b, palette.brick, 0, i % 2 === 1 ? PROJ - RECESS : PROJ, PODIUM.top, HEAD, u0, u1);
    });
    const { us, width } = pilasters(b);
    for (const u of us) boxOut(kit, b, palette.brick, PROJ, PROJ + STANDS.pilaster, UPPER.base, UPPER.console, u - width / 2, u + width / 2);
  }
}

/**
 * The front's cornice before and round a block, mitred at its corners: along the front's face from the arched bay's edge, out along the return and
 * along the block (the sweep puts a moulding's front to the right of its path, as the porch's entablature runs; weston-porch.ts). One geometry per
 * block, where the arched bays' and the pavilion's cornices share one with the arches (weston-facade.ts), so the front's cornice costs the core no mesh.
 */
function cornice(b: EndBlock): BufferGeometry {
  return memo(`weston-end-cornice:${String(b.side)}`, () => {
    const length = Math.abs(b.outer - b.inner);
    // In the moulding's frame x runs east: the east block's path from the face out and east; the west block's the same points mirrored and reversed.
    const east: V3[] = [
      [-STRIP_RUN, 0, 0],
      [0, 0, 0],
      [0, 0, PROJ],
      [length, 0, PROJ],
    ];
    const path = b.side > 0 ? east : east.map(([x, y, z]): V3 => [-x, y, z]).reverse();
    return moulding({ profile: 'cornice-plain', path, height: 0.8, projection: 0.75 });
  });
}

/** A vertical disc or drum of the shared cylinder: `d` across, from y0 to y1, on the axis at (x, z). */
function drum(x: number, y0: number, y1: number, zz: number, d: number): Matrix4 {
  return new Matrix4().makeTranslation(x, y0, zz).multiply(new Matrix4().makeScale(d, y1 - y0, d));
}

/**
 * The stone and granite: the base course, the podium, the columns, the entablature, the pilasters' bases and capitals, the panels and their sills, the
 * frieze, the cornice and the coping. The columns are the core's shared stone box and cylinder and a dark granite cylinder for the shafts, so the
 * blocks keep the core within its 130 meshes (core.test.ts).
 */
export function westonEndTrim(kit: Kit): void {
  const stone = core.westonStone;
  const disc = cylinder(20);
  for (const b of END_BLOCKS) {
    const length = Math.abs(b.outer - b.inner);
    const parts = partsOf(b);
    // The base course round the ground storey, and the podium and its cap, returned to the front's face.
    boxOut(kit, b, stone, 0, BASE.out, WALL_BASE_Y, BASE.top, -(BASE.out - PROJ), length);
    boxOut(kit, b, stone, 0, PODIUM.out, PODIUM.bottom, PODIUM.top - PODIUM.cap, 0, length);
    boxOut(kit, b, stone, 0, PODIUM.out + 0.06, PODIUM.top - PODIUM.cap, PODIUM.top, -0.06, length);
    // A Tuscan column in each bay (#35 and #46): a plinth, a torus and a fillet, the plain shaft of dark granite, an astragal, an echinus and an abacus.
    const c = COLUMN;
    const shaft0 = PODIUM.top + c.plinth + c.torus + c.fillet;
    const shaft1 = HEAD - c.abacus - c.echinus - c.astragal;
    parts.forEach(([u0, u1], i) => {
      if (i % 2 === 0) return;
      const x = out(PROJ);
      const zz = zAt(b, (u0 + u1) / 2);
      addBox(kit, stone, x - 0.45, PODIUM.top, zz - 0.45, x + 0.45, PODIUM.top + c.plinth, zz + 0.45);
      kit.add(disc, stone, drum(x, PODIUM.top + c.plinth, PODIUM.top + c.plinth + c.torus, zz, COLUMN_D + 0.2));
      kit.add(disc, stone, drum(x, PODIUM.top + c.plinth + c.torus, shaft0, zz, COLUMN_D + 0.08));
      kit.add(disc, core.westonGranite, drum(x, shaft0, shaft1, zz, COLUMN_D));
      kit.add(disc, stone, drum(x, shaft1, shaft1 + c.astragal, zz, COLUMN_D + 0.06));
      kit.add(disc, stone, drum(x, shaft1 + c.astragal, HEAD - c.abacus, zz, COLUMN_D + 0.14));
      addBox(kit, stone, x - 0.38, HEAD - c.abacus, zz - 0.38, x + 0.38, HEAD, zz + 0.38);
    });
    // The entablature: its body before the piers and round the return to the front's face, under a crown that overhangs it on both.
    const { body, crown, crownFrom } = END_ENTABLATURE_RETURN;
    boxOut(kit, b, stone, 0, PROJ, HEAD, crownFrom, -body, 0);
    boxOut(kit, b, stone, PROJ, ENTABLATURE.out, HEAD, crownFrom, -body, length);
    boxOut(kit, b, stone, 0, PROJ, crownFrom, ENTABLATURE.top, -crown, 0);
    boxOut(kit, b, stone, PROJ, ENTABLATURE.out + ENTABLATURE.overhang, crownFrom, ENTABLATURE.top, -crown, length);
    // The pilasters' bases and console capitals.
    const { us, width } = pilasters(b);
    for (const u of us) {
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.base, ENTABLATURE.top, UPPER.base, u - width / 2 - 0.06, u + width / 2 + 0.06);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.consoleLow, UPPER.console, UPPER.console + 0.4, u - width / 2, u + width / 2);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.consoleHigh, UPPER.console + 0.4, UPPER.frieze, u - width / 2 - 0.07, u + width / 2 + 0.07);
    }
    // A panel on a moulded sill over each bay, between the pilasters.
    for (let j = 0; j + 1 < us.length; j++) {
      const a = (us[j] ?? 0) + width / 2 + 0.06;
      const e = (us[j + 1] ?? 0) - width / 2 - 0.06;
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.sill, UPPER.sill, UPPER.panel, a - 0.05, e + 0.05);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.panel, UPPER.panel, PANEL_TOP, a, e);
    }
    // The frieze under the cornice, round the return, with its two roundels on the return (#33).
    boxOut(kit, b, stone, PROJ, PROJ + STANDS.frieze, UPPER.frieze, CORNICE_Y, -STANDS.frieze, length);
    boxOut(kit, b, stone, 0, PROJ, UPPER.frieze, CORNICE_Y, -STANDS.frieze, 0);
    for (const f of [0.3, 0.7]) {
      const at = new Matrix4().makeTranslation(out(PROJ * f), (UPPER.frieze + CORNICE_Y) / 2, zAt(b, -STANDS.frieze));
      kit.add(disc, stone, at.multiply(new Matrix4().makeRotationX((-b.side * Math.PI) / 2)).multiply(new Matrix4().makeScale(0.38, 0.06, 0.38)));
    }
    kit.add(cornice(b), stone, placed(B_SOUTH_X, CORNICE_Y, b.inner, FACING.south));
    // The coping over the block and the wall behind it, overhanging the block's front and its return; beyond the core's east face, before Hunt's wall, over the block alone.
    const back = backed(b);
    boxOut(kit, b, stone, -OUTER_WALL, PROJ + STANDS.coping, PARAPET_Y, COPING_TOP_Y, -STANDS.coping, back);
    if (back < length) boxOut(kit, b, stone, 0, PROJ + STANDS.coping, PARAPET_Y, COPING_TOP_Y, back, length);
  }
}
