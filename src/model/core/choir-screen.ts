/**
 * The choir screen from Valladolid Cathedral, about 1763, attributed to Rafael Amezúa (Met 56.234.1, object 201926): wrought iron, gilded and
 * painted, on a limestone base, 15.85 m high and 12.80 m wide (interior.md), set up in the Medieval Sculpture Hall in 1956. After the photographs
 * interior-images.md #P8, #29 and #44 (Met,_cancellata.JPG and the Met's MM29152 and ES4661): three tiers of iron balusters, the lowest with an arched gate, each tier
 * capped by a gilded frieze, and a gilded cresting a third of the screen's height: three medallions on dark plinths, the middle one round under a crown, an
 * urn and a rayed cross, the side ones oval under broken pediments and sunbursts, with urn finials between them and urns on slabs on legs at the ends.
 */
import { Matrix4 } from 'three';
import type { Material } from 'three';

import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { voussoirRing } from './arches.js';
import { L1, SCREEN_HEIGHT, SCREEN_WIDTH, SCREEN_Z } from './constants.js';
import { core } from './materials.js';
import { addBox, cylinder, placed, UNIT_BOX } from './shapes.js';

const W = SCREEN_WIDTH / 2;
/**
 * Heights above the hall floor, measured on interior-images.md #29 at full size: a level, square-on view, read row by row, its slight upward tilt taken
 * out by the balusters' convergence (0.8% of the width over 1,000 px of height) and scaled by the floor-to-cross height of 15.85 m, 2,790 px (the width
 * then reads 12.9 to 13.0 m against the Met's 12.80 m). Each tier: the foot of its balusters, the foot of its frieze and the frieze's top, on which the
 * next tier or the cresting stands. The limestone base, its coping under the balusters' feet, rises to the lowest tier's foot.
 */
const TIERS: readonly (readonly [number, number, number])[] = [
  [0.98, 4.41, 5.09],
  [5.09, 7.71, 8.38],
  [8.38, 10.59, 11.15],
];
/**
 * A frieze from its foot, in fractions of its height, as the same photograph shows each: a gilt moulding, a dark band set with gilt bosses, a gilt
 * cornice and a dark bar.
 */
const MOULDING = 0.22;
const CORNICE: readonly [number, number] = [0.48, 0.87];
const BAR_SPACING = 0.16;
/**
 * The gate's posts stand 1.3 m either side of the axis, and its iron arch springs at 3.7 m and rises to meet the frieze. Open with the owner (2026-10-28):
 * interior-images.md #P8 and #29 show the gate standing open, the base broken under it in the second, where here the balusters and the base run on
 * across it and the walker cannot pass.
 */
const GATE = 1.3;
const GATE_SPRING = 3.7;
/**
 * The cresting, measured as TIERS: x from the axis (mirrored), heights above the floor. Dark plinths 0.14 m high carry its groups ([x0, x1]). The middle
 * medallion's gilt ring is 1.05 m across, centred at 12.15 m, under a crown from 13.28 to 13.54 m, a dark urn to 14.13 m, a dark spire to 14.4 m and the
 * cross, whose arms cross at 15.18 m and span 1.3 m. The side medallions are gilt ovals 0.75 by 1.0 m centred at 12.4 m, under broken pediments from
 * 13.31 to 13.69 m rising at about 42°, joined by a gilt bar under sunbursts of seven rays, 0.63 m across at their tips and reaching 14.28 m. Urn
 * finials on pedestals stand between the groups, and at the ends urns on slabs carried by legs, each with a gilt spray of flowers rising to `top`.
 * Simplified: each medallion's tracery is eight spokes, its frame a whole ring where the photographs show C-scrolls, and the urns are stacked drums.
 * Behind the middle medallion the photograph shows a round window of the hall's end wall, its glazing bars and grey reveal, a window that
 * interior-images.md #P8 shows in the hall's end wall too: the screen has no lattice there.
 */
const PLINTH = 0.14;
const PLINTHS: readonly (readonly [number, number])[] = [
  [-1.45, 1.45],
  [2.35, 4.65],
  [5.15, 6.4],
];
const SIDE_X = 3.5;
interface Finial {
  readonly x: number;
  /** The pedestal's (or the end urn's slab's) foot and top. */
  readonly pedestal: readonly [number, number];
  /** The pedestal's width. */
  readonly width: number;
  /** One stem down to the plinth, or two legs 0.3 m either side of the urn's axis. */
  readonly legs: 1 | 2;
  /** The urn's height on the pedestal, to its lip. */
  readonly urn: number;
  readonly top: number;
}
const FINIALS: readonly Finial[] = [
  { x: 1.3, pedestal: [11.64, 11.77], width: 0.3, legs: 1, urn: 0.56, top: 13.05 },
  { x: 2.5, pedestal: [11.85, 12.02], width: 0.3, legs: 1, urn: 0.54, top: 12.91 },
  { x: 4.5, pedestal: [11.85, 12.02], width: 0.3, legs: 1, urn: 0.54, top: 12.91 },
  { x: 6.0, pedestal: [12.22, 12.33], width: 0.86, legs: 2, urn: 0.69, top: 13.63 },
];
/**
 * An urn, stacked from four drums of the screen's own cylinder (the core area's meshes are at their budget, so the cresting adds no shape): its foot,
 * stem, bowl and lip, each [bottom, top, width] as shares of the urn's height. Sprays and the cross rise from inside the lip, at `URN_MOUTH`.
 */
const URN: readonly (readonly [number, number, number])[] = [
  [0, 0.12, 0.38],
  [0.12, 0.3, 0.2],
  [0.3, 0.8, 0.6],
  [0.8, 1, 0.7],
];
const URN_MOUTH = 0.86;
/** The half-ring every medallion's ring, rim and scrolls and the middle urn's branches are scaled from: a round arch band of span 1, `HALF_OUT` across outside. */
const HALF_BAND = 0.07;
const HALF_OUT = 1 + 2 * HALF_BAND;

/** A disc `w` across, `h` high and `t` thick facing ±Z, centred at (x, y) in the screen's plane: round when `h` is left out. */
function disc(x: number, y: number, w: number, t: number, dz = 0, h = w): Matrix4 {
  return new Matrix4().makeTranslation(x, L1 + y, SCREEN_Z + dz).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeScale(w, t, h)).multiply(new Matrix4().makeTranslation(0, -0.5, 0));
}

/** A bar `len` long, `w` across and `d` deep rising from (x, y) in the screen's plane, leaning `lean` radians from upright toward +X. */
function slant(x: number, y: number, len: number, lean: number, w = 0.035, d = 0.04): Matrix4 {
  return new Matrix4().makeTranslation(x, L1 + y, SCREEN_Z).multiply(new Matrix4().makeRotationZ(-lean)).multiply(new Matrix4().makeScale(w, len, d));
}

/** A unit half-ring (a round arch band of span 1) placed at (x, y), turned `turn` radians about the screen's normal and scaled. */
function ringAt(x: number, y: number, turn: number, sx: number, sy: number): Matrix4 {
  return new Matrix4().makeTranslation(x, L1 + y, SCREEN_Z - 0.05).multiply(new Matrix4().makeRotationZ(turn)).multiply(new Matrix4().makeScale(sx, sy, 1));
}

export function choirScreen(kit: Kit): void {
  const iron = core.screenIron;
  const gilt = core.gilt;
  const z0 = SCREEN_Z;
  const y = (v: number): number => L1 + v;
  const foot0 = TIERS[0]?.[0] ?? 0.98;
  // The base runs the screen's width; 0.25 m either side of its plane keeps it 2 cm clear of the middle piers' plinths (medieval-hall.ts).
  addBox(kit, palette.limestone, -W - 0.08, L1, z0 - 0.25, W + 0.08, y(foot0), z0 + 0.25, 0);
  const bar = cylinder(6);
  const round = cylinder(20);
  TIERS.forEach(([b, t, top], tier) => {
    const tierPosts = tier === 0 ? [-W, -3.2, -GATE, GATE, 3.2, W] : [-W, -3.2, 0, 3.2, W];
    for (const px of tierPosts) addBox(kit, iron, px - 0.08, y(b), z0 - 0.08, px + 0.08, y(t), z0 + 0.08, 2 + tier * 3);
    for (let x = -W + BAR_SPACING; x < W - BAR_SPACING / 2; x += BAR_SPACING) {
      if (tierPosts.some((p) => Math.abs(p - x) < 0.1)) continue;
      kit.add(bar, iron, placed(x, y(b), z0, 0, [0.045, t - b, 0.045]), 2 + tier * 3);
    }
    // Frieze: a dark band over a gilt moulding and under a gilt cornice and a dark bar, studded with gilt bosses.
    const h = top - t;
    addBox(kit, iron, -W - 0.05, y(t), z0 - 0.13, W + 0.05, y(top), z0 + 0.13, 3 + tier * 3);
    for (const [a, b2] of [
      [0, MOULDING],
      CORNICE,
    ] as const) {
      addBox(kit, gilt, -W - 0.07, y(t + a * h), z0 - 0.16, W + 0.07, y(t + b2 * h), z0 + 0.16, 3 + tier * 3);
    }
    const boss = t + ((MOULDING + CORNICE[0]) / 2) * h;
    for (let x = -W + 0.4; x < W - 0.2; x += 0.8) {
      for (const side of [-1, 1]) kit.add(round, gilt, disc(x, boss, 0.12, 0.06, side * 0.14), 3 + tier * 3);
    }
  });
  // The gate's arched head in the lowest tier, iron on both faces, its crown meeting the frieze.
  const arch = voussoirRing({ head: 'segmental', span: 2 * GATE, rise: 0.575, band: 0.14, count: 11, projection: 0.06, parity: 'all', back: true });
  kit.add(arch, iron, placed(0, y(GATE_SPRING), z0 + 0.08), 2);
  kit.add(arch, iron, placed(0, y(GATE_SPRING), z0 - 0.08, Math.PI), 2);
  cresting(kit, TIERS[2]?.[2] ?? 11.15);
}

/** The cresting on the top frieze, whose top is `foot` above the floor. */
function cresting(kit: Kit, foot: number): void {
  const iron = core.screenIron;
  const gilt = core.gilt;
  const z0 = SCREEN_Z;
  const y = (v: number): number => L1 + v;
  const round = cylinder(20);
  const bar = cylinder(6);
  const half = voussoirRing({ head: 'round', span: 1, band: HALF_BAND, count: 9, projection: 0.1, parity: 'all', back: true });
  const base = foot + PLINTH;
  const vase = (x: number, at: number, h: number, material: Material, order: number): void => {
    for (const [b, t, w] of URN) kit.add(round, material, placed(x, y(at + b * h), z0, 0, [w * h, (t - b) * h, w * h]), order);
  };
  for (const [x0, x1] of PLINTHS) {
    for (const s of x0 < 0 ? [1] : [-1, 1]) addBox(kit, iron, s * x0, y(foot), z0 - 0.1, s * x1, y(base), z0 + 0.1, 12);
  }
  // The medallions: openwork, as both photographs show them against the wall behind: a gilt ring `w` by `h` with eight gilt spokes to a gilt boss, a
  // gilt rim round it, a stem down to the plinth and two scrolls springing from the plinth, `offset` either side, their feet on it.
  const medallion = (x: number, cy: number, w: number, h: number, rim: readonly [number, number], scroll: readonly [number, number, number]): void => {
    for (const turn of [0, Math.PI]) kit.add(half, gilt, ringAt(x, cy, turn, w / HALF_OUT, h / HALF_OUT), 12);
    const [a, b] = [w / (2 * HALF_OUT), h / (2 * HALF_OUT)];
    for (let k = 0; k < 8; k++) {
      const lean = (k * Math.PI) / 4;
      kit.add(UNIT_BOX, gilt, slant(x, cy, 1 / Math.hypot(Math.sin(lean) / a, Math.cos(lean) / b), lean, 0.03, 0.03), 12);
    }
    kit.add(round, gilt, disc(x, cy, w * 0.28, 0.12), 12);
    addBox(kit, gilt, x - 0.06, y(base), z0 - 0.05, x + 0.06, y(cy - h / 2), z0 + 0.05, 12);
    for (const turn of [0, Math.PI]) kit.add(half, gilt, ringAt(x, cy, turn, rim[0], rim[1]), 12);
    const [offset, sw, sh] = scroll;
    for (const sx of [-1, 1]) kit.add(half, gilt, ringAt(x + sx * offset, base, 0, sw, sh), 12);
  };
  // The middle group: the round medallion, a stem up to the crown, a dark urn with scrolled branches either side, a dark spire and the rayed cross.
  medallion(0, 12.15, 1.05, 1.05, [1.6, 1.6], [0.93, 0.9, 1.3]);
  addBox(kit, gilt, -0.06, y(12.95), z0 - 0.05, 0.06, y(13.28), z0 + 0.05, 14);
  kit.add(round, iron, placed(0, y(13.28), z0, 0, [1.0, 0.26, 0.36]), 14);
  for (const at of [13.28, 13.5]) kit.add(round, gilt, placed(0, y(at), z0, 0, [1.04, 0.04, 0.4]), 14);
  const crownTop = 13.54;
  const urnHeight = 0.59;
  vase(0, crownTop, urnHeight, iron, 14);
  for (const s of [-1, 1]) kit.add(half, gilt, ringAt(s * 0.32, crownTop + 0.3, s * (-Math.PI / 2), 0.6, 0.6), 14);
  const [mouth, spire, cross] = [crownTop + URN_MOUTH * urnHeight, 14.4, 15.18];
  kit.add(round, iron, placed(0, y(mouth), z0, 0, [0.1, spire - mouth, 0.1]), 14);
  addBox(kit, gilt, -0.05, y(spire - 0.04), z0 - 0.05, 0.05, y(SCREEN_HEIGHT), z0 + 0.05, 14);
  addBox(kit, gilt, -0.65, y(cross - 0.05), z0 - 0.05, 0.65, y(cross + 0.05), z0 + 0.05, 14);
  kit.add(round, gilt, disc(0, cross, 0.26, 0.1), 14);
  for (const lean of [1, 3, 5, 7]) kit.add(UNIT_BOX, gilt, slant(0, cross, 0.4, (lean * Math.PI) / 4), 14);
  // The side groups: an oval medallion; a stem up to a gilt bar joining the halves of a broken pediment, whose outer ends rest on C-scrolls rising from
  // the medallion's rim; and a sunburst of seven rays, the outer ones shorter, rising from the bar.
  for (const s of [-1, 1]) {
    const x = s * SIDE_X;
    medallion(x, 12.4, 0.75, 1.0, [0.95, 1.2], [0.63, 0.9, 1.1]);
    addBox(kit, gilt, x - 0.04, y(12.95), z0 - 0.04, x + 0.04, y(13.6), z0 + 0.04, 13);
    addBox(kit, gilt, x - 0.17, y(13.6), z0 - 0.05, x + 0.17, y(13.66), z0 + 0.05, 13);
    for (const side of [-1, 1]) {
      kit.add(UNIT_BOX, iron, slant(x + side * 0.52, 13.33, 0.48, -side * 0.84, 0.1, 0.12), 13);
      kit.add(half, gilt, ringAt(x + side * 0.5, 12.875, -side * (Math.PI / 2), 0.85, 0.5), 13);
    }
    for (let k = -3; k <= 3; k++) kit.add(UNIT_BOX, gilt, slant(x, 13.63, 0.65 - 0.038 * Math.abs(k), (k * Math.PI) / 15, 0.03, 0.04), 13);
  }
  // The finials and the end urns: a pedestal on a stem (on two legs at the ends), an iron urn and a gilt spray of three flowers.
  for (const f of FINIALS) {
    const [p0, p1] = f.pedestal;
    const rim = p1 + f.urn;
    for (const s of [-1, 1]) {
      const x = s * f.x;
      const legs = f.legs === 2 ? [x - 0.3, x + 0.3] : [x];
      for (const lx of legs) kit.add(bar, gilt, placed(lx, y(base), z0, 0, [0.07, p0 - base, 0.07]), 13);
      addBox(kit, iron, x - f.width / 2, y(p0), z0 - 0.1, x + f.width / 2, y(p1), z0 + 0.1, 13);
      vase(x, p1, f.urn, iron, 13);
      const stem = f.top - rim;
      const from = p1 + URN_MOUTH * f.urn;
      for (const lean of [-0.45, 0, 0.45]) {
        const len = lean === 0 ? f.top - from - 0.05 : 0.8 * stem;
        kit.add(UNIT_BOX, gilt, slant(x, from, len, lean, 0.025, 0.03), 13);
        kit.add(round, gilt, disc(x + len * Math.sin(lean), from + len * Math.cos(lean), 0.11, 0.05), 13);
      }
    }
  }
}
