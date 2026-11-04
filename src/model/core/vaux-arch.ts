/**
 * The 1880 arch of Vaux and Mould's fronts (exterior.md section 9; constants.ts): an opening from its sill (or the floor, as a doorway) up to a
 * granite impost band, which runs across the front as its lintel, and over the band a pointed head: a ring of voussoirs alternating light and dark
 * granite, deeper at the crown than at the springing, meeting the brick with no hood, and inside it a smooth light granite order that runs on down the
 * jambs (exterior-images.md #53, #60, #61, #63, #64). The west front fills the head with a striped tympanum; the east front's heads hold a roundel inside
 * a moulded light arch and a ring of dark granite blocks round the voussoirs (#67); the side walls' heads, glazed in 1880 (#49), are bricked up.
 * Frames: an arch's parts are placed at the centre of its springing line on the wall face, as arches.ts's rings and tympana are. Each head is two
 * pieces, its light granite and its dark, built in that frame and placed per arch, so it arrives and grows or pops about its own place in the build.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder } from '../lib/index.js';
import type { V2 } from '../lib/index.js';
import { ringStones, tympanum, voussoirRing, type Hole, type RingParams } from './arches.js';
import { L1, LG, VAUX_ARCH_RISE, VAUX_ARCH_SILL, VAUX_ARCH_SPAN, VAUX_ARCH_SPRING, VAUX_IMPOST, VAUX_INNER_ORDER, VAUX_VOUSSOIR, VAUX_VOUSSOIR_CROWN } from './constants.js';
import { keyOf, memo } from './shapes.js';

/** The ground storey's rusticated stone under the arches (#53 on the west front, #65 under the south arcade): ten courses from a base band to the main floor's band. */
export const RUST_Y0 = LG + 0.5;
export const RUST_Y1 = L1 - 0.2;
export const COURSE = (RUST_Y1 - RUST_Y0) / 10;
export const JOINT = 0.04;

/** The springing (the impost band's top) and the openings' heads (its bottom), world Y. */
export const SPRING_Y = L1 + VAUX_ARCH_SPRING;
export const LINTEL_Y = SPRING_Y - VAUX_IMPOST;
/** Window sills, world Y. */
export const SILL_Y = L1 + VAUX_ARCH_SILL;
/** The clear opening between the inner orders: today's doorways' 2.6 m. */
export const CLEAR = VAUX_ARCH_SPAN - 2 * VAUX_INNER_ORDER;

/** The rise of the inner order's inner edge, the tympanum's outline: the intrados drawn VAUX_INNER_ORDER inside itself about the same two centres. */
export const TYMPANUM_RISE = ((): number => {
  const a = VAUX_ARCH_SPAN / 2;
  const c = (VAUX_ARCH_RISE * VAUX_ARCH_RISE - a * a) / (2 * a);
  const r = a + c - VAUX_INNER_ORDER;
  return Math.sqrt(r * r - c * c);
})();

/** How far the parts stand proud of the wall face: the voussoirs and the east front's outer blocks, the inner order and the jambs. */
export const VOUSSOIR_PROUD = 0.06;
export const ORDER_PROUD = 0.03;
/** The head's blind niche behind the tympanum. */
export const HEAD_DEPTH = 0.25;

/** The voussoirs of the west front and the side arcade, 15 stones, a dark one at the crown (#60, #64). */
export const VOUSSOIRS: RingParams = {
  head: 'pointed',
  span: VAUX_ARCH_SPAN,
  rise: VAUX_ARCH_RISE,
  band: VAUX_VOUSSOIR,
  crown: VAUX_VOUSSOIR_CROWN,
  count: 15,
  projection: VOUSSOIR_PROUD,
  parity: 0,
};
/** The smooth light inner order inside them, in 15 segments so a cut can leave some out. */
export const INNER_ORDER: RingParams = { head: 'pointed', span: CLEAR, rise: TYMPANUM_RISE, band: VAUX_INNER_ORDER, count: 15, projection: ORDER_PROUD, parity: 'all' };

/**
 * The east front's voussoirs (#67): 0.75 m deep and 1.3 m at the crown, so its outer arches, centred on today's passages 12 m off the axis, stay inside
 * the front's 29 m with their ring of dark blocks; and that ring, 0.15 m deep, a fifth of the voussoirs as in #67, round their extrados, flush with them.
 */
export const EAST_VOUSSOIR = 0.75;
export const EAST_CROWN = 1.3;
export const EAST_OUTER = 0.15;
export const EAST_VOUSSOIRS: RingParams = { ...VOUSSOIRS, band: EAST_VOUSSOIR, crown: EAST_CROWN };
export const EAST_OUTER_RING: RingParams = {
  head: 'pointed',
  span: VAUX_ARCH_SPAN + 2 * EAST_VOUSSOIR,
  rise: VAUX_ARCH_RISE + EAST_CROWN,
  band: EAST_OUTER,
  count: 15,
  projection: VOUSSOIR_PROUD,
  parity: 'all',
};
/** The east front's moulded inner arch (#67): two light orders, the outer standing further out than the inner. */
export const EAST_ORDERS: readonly RingParams[] = [
  { ...INNER_ORDER, band: VAUX_INNER_ORDER / 2, inset: VAUX_INNER_ORDER / 2, projection: ORDER_PROUD + 0.02 },
  { ...INNER_ORDER, band: VAUX_INNER_ORDER / 2, projection: ORDER_PROUD },
];
/** The roundel in an east head (#67, its brick 1.3 m across): its centre over the springing and its moulded granite ring. */
export const ROUNDEL = { centre: 0.95, inner: 0.65, outer: 0.8, proud: 0.05 } as const;

/** A rectangle in an arch's frame, x0 < x1, y0 < y1: an opening cut through its head later. */
export type Cut = readonly [x0: number, y0: number, x1: number, y1: number];

/** The stones of `ring` that `cut` crosses (their outlines' bounds meet it). */
export function stonesIn(ring: RingParams, cut: Cut): number[] {
  return ringStones(ring).flatMap((stone, k) => {
    const xs = stone.map((p) => p[0]);
    const ys = stone.map((p) => p[1]);
    return Math.max(...xs) > cut[0] && Math.min(...xs) < cut[2] && Math.max(...ys) > cut[1] && Math.min(...ys) < cut[3] ? [k] : [];
  });
}

/** `ring` with the stones `cut` crosses left out (none left out without a cut). */
export function ringCut(ring: RingParams, cut?: Cut): BufferGeometry {
  return voussoirRing(cut === undefined ? ring : { ...ring, omit: stonesIn(ring, cut) });
}

/** The 1880 heads, by front: the west front's with its striped tympanum, the side arcade's, and the east front's with their outer blocks and moulded orders. */
export type HeadKind = 'west' | 'side' | 'east';

/** One head's light granite as one geometry in the arch's frame: its light voussoirs and inner order or orders, and on the west front its stripes. */
export function lightHead(kind: HeadKind, cut?: Cut): BufferGeometry {
  const key = `vauxHead:light:${kind}:${cut === undefined ? 'whole' : keyOf(...cut)}`;
  return memo(key, () => {
    const b = new MeshBuilder();
    if (kind === 'east') {
      b.append(ringCut(EAST_VOUSSOIRS, cut));
      for (const order of EAST_ORDERS) b.append(ringCut(order, cut));
    } else {
      b.append(ringCut(VOUSSOIRS, cut));
      b.append(ringCut(INNER_ORDER, cut));
    }
    // The west front's striped tympanum stands on the back of the head's niche (#60, #61).
    if (kind === 'west') b.append(tympanum({ head: 'pointed', span: CLEAR, rise: TYMPANUM_RISE, stripe: 0.27, part: 'stripes' }), new Matrix4().makeTranslation(0, 0, -HEAD_DEPTH));
    return named(b.build(), key);
  });
}

/** One head's dark granite as one geometry in the arch's frame: its dark voussoirs, and on the east front the ring of dark blocks round them. */
export function darkHead(kind: HeadKind, cut?: Cut): BufferGeometry {
  const key = `vauxHead:dark:${kind}:${cut === undefined ? 'whole' : keyOf(...cut)}`;
  return memo(key, () => {
    const b = new MeshBuilder();
    b.append(ringCut({ ...(kind === 'east' ? EAST_VOUSSOIRS : VOUSSOIRS), parity: 1 }, cut));
    if (kind === 'east') b.append(ringCut(EAST_OUTER_RING, cut));
    return named(b.build(), key);
  });
}

/** `geometry` named by its cache key, so a test can tell a head's pieces apart (vaux-fronts.test.ts). */
function named(geometry: BufferGeometry, name: string): BufferGeometry {
  geometry.name = name;
  return geometry;
}

/** The holes of an arch at `x` in a wall whose base is at world Y `base`: its opening, through or blind, and its head's blind niche unless left out. */
export function archHoles(x: number, base: number, opening: { readonly sill: number; readonly through: boolean }, head = true): Hole[] {
  const holes: Hole[] = [{ x, y: opening.sill - base, width: CLEAR, height: LINTEL_Y - opening.sill, ...(opening.through ? {} : { depth: HEAD_DEPTH }) }];
  // The niche starts 2 cm under the springing, behind the band's top, so its outline has no point twice where its head springs.
  if (head) holes.push({ head: 'pointed', x, y: SPRING_Y - 0.02 - base, width: CLEAR, height: TYMPANUM_RISE + 0.02, rise: TYMPANUM_RISE, depth: HEAD_DEPTH });
  return holes;
}

/** A closed granite annulus, its back on z = 0 and its front `proud` out: the roundel's moulding. */
export function annulus(inner: number, outer: number, proud: number, sides = 32): BufferGeometry {
  return memo(`annulus:${keyOf(inner, outer, proud, sides)}`, () => {
    const b = new MeshBuilder();
    const circle = (r: number): V2[] => Array.from({ length: sides }, (_, k) => [r * Math.cos((2 * Math.PI * k) / sides), r * Math.sin((2 * Math.PI * k) / sides)] as const);
    const [o, i] = [circle(outer), circle(inner)];
    b.planar(o, [i], new Vector3(0, 0, proud), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
    const mirror = (pts: readonly V2[]): V2[] => pts.map(([u, v]) => [-u, v] as const);
    b.planar(mirror(o), [mirror(i)], new Vector3(0, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0));
    for (let k = 0; k < sides; k++) {
      const [p, q] = [o[k] ?? [0, 0], o[(k + 1) % sides] ?? [0, 0]];
      b.polygon([new Vector3(p[0], p[1], 0), new Vector3(q[0], q[1], 0), new Vector3(q[0], q[1], proud), new Vector3(p[0], p[1], proud)]);
      const [r, s] = [i[k] ?? [0, 0], i[(k + 1) % sides] ?? [0, 0]];
      b.polygon([new Vector3(r[0], r[1], proud), new Vector3(s[0], s[1], proud), new Vector3(s[0], s[1], 0), new Vector3(r[0], r[1], 0)]);
    }
    return b.build();
  });
}
