/**
 * The two end blocks of Theodore Weston's 1888 south front (history.md section 3; weston-facade.ts has the pavilion and the arched bays), which project
 * into the Petrie Court beyond each arched bay and its strip of brick. Weston's approved elevation of 1885 and his 1888 first-floor plan draw them
 * (Heckscher figs. 28 and 26: "projecting flanking sections", their main floor "articulated by pilasters and pairs of double-window openings", their
 * upper wall blind for skylit picture galleries), the photograph of about 1895 from the south-east shows them built (fig. 35), and the court's
 * photographs show them today (interior-images.md #33, #35, #45 and #46; interior.md, Weston's 1888 front). Each block: a stone podium; three bays,
 * each a column with a dark granite shaft between two windows, bricked up since, set back between brick piers, and a wide pier at each end; the main
 * floor's head band carried round the block as the columns' entablature; above, brick with pilasters on stone bases under console capitals, a stone
 * panel on a moulded sill in each bay, a stone frieze with two roundels on the return, and the front's cornice and coping, all returned round the block.
 * The block projects 1.2 m (#33 and #35 see its return faces face-on) and its bays stand 0.55 m back between the piers (#35 and #46). The parts keep
 * fig. 28's widths (inner pier 2.8, bay 3.4, pier 1.3, bay, pier, bay, corner pier 3.4, of 19.0) scaled to each block's length, the columns 0.6 m
 * whatever the scale: the model's front runs on the 1880 building's lines, west of the real front's middle, so the west block runs 20.4 m to the
 * Kravis Wing's pier and the east one 16.2 m to the court's east end, where the real ones are each about 19 m (open for the owner; interior.md).
 * The model shows today's bricked-up bays from 1888, as it shows the 1880 building's side walls (vaux-sides.ts); fig. 35 shows them glazed.
 * Frame: `out` measures from the front's brick face (X −49.7) into the court (toward −X); `u` from a block's inner end along it, toward its outer end.
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { moulding } from '../lib/index.js';
import { palette } from '../palette.js';
import { B_SOUTH_X, COPING_TOP_Y, CORNICE_Y, EAST_Z, L1, OUTER_WALL, PARAPET_Y, WESTON_ARCH_BAY, WESTON_END_FROM, WESTON_END_PROJECTION, WESTON_LOWER_HEAD, WESTON_PAVILION_Z, WESTON_STRIP, WESTON_WEST_END_Z } from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, placed } from './shapes.js';

/** An end block: west (−1) or east (+1) of the pavilion, its inner end (the return face, toward the pavilion) and its outer end, as world Z. */
export interface EndBlock {
  readonly side: -1 | 1;
  readonly inner: number;
  readonly outer: number;
}

export const END_BLOCKS: readonly EndBlock[] = [
  { side: -1, inner: WESTON_PAVILION_Z - WESTON_END_FROM, outer: WESTON_WEST_END_Z },
  { side: 1, inner: WESTON_PAVILION_Z + WESTON_END_FROM, outer: EAST_Z },
];

/** World X `d` metres out from the front's brick face into the court. */
const out = (d: number): number => B_SOUTH_X - d;

const PROJ = WESTON_END_PROJECTION;
/** How far the bays' bricked-up windows stand back from the piers' faces. */
const RECESS = 0.55;
/** fig. 28's parts of a block from its inner end: inner pier, bay, pier, bay, pier, bay, corner pier; the bays are the odd ones. */
const PARTS = [2.8, 3.4, 1.3, 3.4, 1.3, 3.4, 3.4] as const;
const PARTS_LENGTH = PARTS.reduce((a, b) => a + b, 0);
/** The columns' lower diameter (fig. 28, about 0.65 m), their axes on the piers' face line. */
const COLUMN_D = 0.6;

/** Heights. The podium carries the columns; the entablature runs from the arched bays' head band's foot, 5 cm taller so their tops never meet in one plane. */
const PODIUM = { bottom: L1 - 0.3, top: L1 + 1.0, out: PROJ + 0.5, cap: 0.12 } as const;
const HEAD = L1 + WESTON_LOWER_HEAD;
const ENTABLATURE = { top: HEAD + 0.8, out: PROJ + 0.4, crown: 0.25, overhang: 0.2 } as const;
/** How far the entablature's crown returns along the front's face beyond each block, toward the pavilion: the arched bays' head band stops there. */
export const END_ENTABLATURE_RETURN = ENTABLATURE.out - PROJ + ENTABLATURE.overhang;
/** The column's parts over the podium: the plinth, the base's torus and fillet, then under the entablature the astragal, the echinus and the abacus. */
const COLUMN = { plinth: 0.12, torus: 0.12, fillet: 0.06, astragal: 0.06, echinus: 0.14, abacus: 0.16 } as const;
/** The upper wall: the pilasters' bases, the panels' sills and tops, the console capitals and the frieze under the cornice. */
const UPPER = { base: ENTABLATURE.top + 0.45, sill: 13.65, panel: 13.95, frieze: CORNICE_Y - 0.6, console: CORNICE_Y - 0.6 - 0.75 } as const;
const PANEL_TOP = UPPER.frieze - 0.12;
/** How far each piece of the upper wall stands out from the block's brick face. */
const STANDS = { pilaster: 0.12, base: 0.18, consoleLow: 0.2, consoleHigh: 0.28, panel: 0.04, sill: 0.14, frieze: 0.06, coping: 0.08 } as const;

/** A block's length and the scale of fig. 28's parts on it. */
function scaleOf(b: EndBlock): number {
  return Math.abs(b.outer - b.inner) / PARTS_LENGTH;
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
function boxOut(kit: Kit, b: EndBlock, material: Parameters<typeof addBox>[1], d0: number, d1: number, y0: number, y1: number, u0: number, u1: number, order: number): void {
  const [z0, z1] = span(b, u0, u1);
  addBox(kit, material, out(d1), y0, z0, out(d0), y1, z1, order);
}

/** The pilasters' middles along the block (u) and their width: flanking the first bay and the last, and on the two piers between. */
function pilasters(b: EndBlock): { readonly us: readonly number[]; readonly width: number } {
  const width = 0.75 * scaleOf(b);
  const [, bay1 = [0, 0], pier2 = [0, 0], , pier4 = [0, 0], bay5 = [0, 0]] = partsOf(b);
  return { us: [bay1[0] - width / 2, (pier2[0] + pier2[1]) / 2, (pier4[0] + pier4[1]) / 2, bay5[1] + width / 2], width };
}

/** The block's brick: the mass from the main floor's head to the parapet, the piers and the bays' bricked-up windows below it, and the pilasters. */
export function westonEndWalls(kit: Kit): void {
  for (const b of END_BLOCKS) {
    const length = Math.abs(b.outer - b.inner);
    const parts = partsOf(b);
    boxOut(kit, b, palette.brick, 0, PROJ, HEAD, PARAPET_Y, 0, length, 2);
    parts.forEach(([u0, u1], i) => {
      boxOut(kit, b, palette.brick, 0, i % 2 === 1 ? PROJ - RECESS : PROJ, PODIUM.top, HEAD, u0, u1, i % 2 === 1 ? 1 : 0);
    });
    const { us, width } = pilasters(b);
    for (const u of us) boxOut(kit, b, palette.brick, PROJ, PROJ + STANDS.pilaster, UPPER.base, UPPER.console, u - width / 2, u + width / 2, 7);
  }
}

/**
 * The arched bays' cornice (weston-facade.ts): the end blocks' cornice is made of it, each run scaled along its length, which keeps its profile, so the
 * front's cornice is one mesh however it turns.
 */
export function westonCornice(): BufferGeometry {
  return moulding({ profile: 'cornice-plain', path: [[-WESTON_ARCH_BAY / 2, 0, 0], [WESTON_ARCH_BAY / 2, 0, 0]], height: 0.8, projection: 0.75 });
}

/** A run of the cornice `length` long, centred at (x, z), facing `yaw` (its profile projects toward the facing). */
function corniceRun(x: number, zz: number, length: number, yaw: number): Matrix4 {
  return placed(x, CORNICE_Y, zz, yaw).multiply(new Matrix4().makeScale(length / WESTON_ARCH_BAY, 1, 1));
}

/** A vertical disc or drum of the shared cylinder: `d` across, from y0 to y1, on the axis at (x, z). */
function drum(x: number, y0: number, y1: number, zz: number, d: number): Matrix4 {
  return new Matrix4().makeTranslation(x, y0, zz).multiply(new Matrix4().makeScale(d, y1 - y0, d));
}

/**
 * The stone and granite: the podium, the columns, the entablature, the pilasters' bases and capitals, the panels and their sills, the frieze, the
 * cornice and the coping. Everything but the columns' shafts is the core's shared stone box, cylinder and cornice, so the blocks add one mesh: the
 * core keeps to its 130 (core.test.ts).
 */
export function westonEndTrim(kit: Kit): void {
  const stone = core.westonStone;
  const disc = cylinder(20);
  const cornice = westonCornice();
  for (const b of END_BLOCKS) {
    const length = Math.abs(b.outer - b.inner);
    const parts = partsOf(b);
    // The podium and its cap, returned to the front's face.
    boxOut(kit, b, stone, 0, PODIUM.out, PODIUM.bottom, PODIUM.top - PODIUM.cap, 0, length, 1);
    boxOut(kit, b, stone, 0, PODIUM.out + 0.06, PODIUM.top - PODIUM.cap, PODIUM.top, -0.06, length, 1);
    // A Tuscan column in each bay (#35 and #46): a plinth, a torus and a fillet, the plain shaft of dark granite, an astragal, an echinus and an abacus.
    const c = COLUMN;
    const shaft0 = PODIUM.top + c.plinth + c.torus + c.fillet;
    const shaft1 = HEAD - c.abacus - c.echinus - c.astragal;
    parts.forEach(([u0, u1], i) => {
      if (i % 2 === 0) return;
      const x = out(PROJ);
      const zz = zAt(b, (u0 + u1) / 2);
      const half = (w: number): [number, number] => [zz - w / 2, zz + w / 2];
      addBox(kit, stone, x - 0.45, PODIUM.top, half(0.9)[0], x + 0.45, PODIUM.top + c.plinth, half(0.9)[1], 3);
      kit.add(disc, stone, drum(x, PODIUM.top + c.plinth, PODIUM.top + c.plinth + c.torus, zz, COLUMN_D + 0.2), 3);
      kit.add(disc, stone, drum(x, PODIUM.top + c.plinth + c.torus, shaft0, zz, COLUMN_D + 0.08), 3);
      kit.add(disc, core.westonGranite, drum(x, shaft0, shaft1, zz, COLUMN_D), 4);
      kit.add(disc, stone, drum(x, shaft1, shaft1 + c.astragal, zz, COLUMN_D + 0.06), 5);
      kit.add(disc, stone, drum(x, shaft1 + c.astragal, HEAD - c.abacus, zz, COLUMN_D + 0.14), 5);
      addBox(kit, stone, x - 0.38, HEAD - c.abacus, half(0.76)[0], x + 0.38, HEAD, half(0.76)[1], 5);
    });
    // The entablature: its body before the piers and round the return, under a crown that overhangs it on both faces.
    const back = ENTABLATURE.out - PROJ;
    const crown0 = ENTABLATURE.top - ENTABLATURE.crown;
    boxOut(kit, b, stone, PROJ, ENTABLATURE.out, HEAD, crown0, -back, length, 6);
    boxOut(kit, b, stone, 0, PROJ, HEAD, crown0, -back, 0, 6);
    boxOut(kit, b, stone, PROJ, ENTABLATURE.out + ENTABLATURE.overhang, crown0, ENTABLATURE.top, -back - ENTABLATURE.overhang, length, 6);
    boxOut(kit, b, stone, 0, PROJ, crown0, ENTABLATURE.top, -back - ENTABLATURE.overhang, 0, 6);
    // The pilasters' bases and console capitals.
    const { us, width } = pilasters(b);
    for (const u of us) {
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.base, ENTABLATURE.top, UPPER.base, u - width / 2 - 0.06, u + width / 2 + 0.06, 7);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.consoleLow, UPPER.console, UPPER.console + 0.4, u - width / 2, u + width / 2, 9);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.consoleHigh, UPPER.console + 0.4, UPPER.frieze, u - width / 2 - 0.07, u + width / 2 + 0.07, 9);
    }
    // A panel on a moulded sill in each bay, between the pilasters.
    for (let j = 0; j + 1 < us.length; j++) {
      const a = (us[j] ?? 0) + width / 2 + 0.06;
      const e = (us[j + 1] ?? 0) - width / 2 - 0.06;
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.sill, UPPER.sill, UPPER.panel, a - 0.05, e + 0.05, 8);
      boxOut(kit, b, stone, PROJ, PROJ + STANDS.panel, UPPER.panel, PANEL_TOP, a, e, 8);
    }
    // The frieze under the cornice, round the return, with its two roundels on the return (#33).
    boxOut(kit, b, stone, PROJ, PROJ + STANDS.frieze, UPPER.frieze, CORNICE_Y, -STANDS.frieze, length, 10);
    boxOut(kit, b, stone, 0, PROJ, UPPER.frieze, CORNICE_Y, -STANDS.frieze, 0, 10);
    for (const f of [0.3, 0.7]) {
      const at = new Matrix4().makeTranslation(out(PROJ * f), (UPPER.frieze + CORNICE_Y) / 2, zAt(b, -STANDS.frieze));
      kit.add(disc, stone, at.multiply(new Matrix4().makeRotationX((-b.side * Math.PI) / 2)).multiply(new Matrix4().makeScale(0.38, 0.06, 0.38)), 10);
    }
    // The front's cornice: along the strip of brick on the front's face, round the return and along the block, run on past the return's corner by its
    // projection so the corner is whole.
    const reach = 0.75;
    kit.add(cornice, stone, corniceRun(B_SOUTH_X, zAt(b, -WESTON_STRIP / 2), WESTON_STRIP, FACING.south), 10);
    kit.add(cornice, stone, corniceRun(out(PROJ / 2), b.inner, PROJ, b.side > 0 ? FACING.west : FACING.east), 10);
    kit.add(cornice, stone, corniceRun(out(PROJ), zAt(b, (length - reach) / 2), length + reach, FACING.south), 10);
    // The coping over the block and the wall behind it.
    const [z0, z1] = span(b, 0, length);
    addBox(kit, stone, out(PROJ + STANDS.coping), PARAPET_Y, z0, B_SOUTH_X + OUTER_WALL, COPING_TOP_Y, z1, 11);
  }
}
