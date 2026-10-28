/**
 * The choir screen from Valladolid Cathedral, about 1763, attributed to Rafael Amezúa (Met 56.234.1, object 201926): wrought iron, gilded and
 * painted, on a limestone base, 15.85 m high and 12.80 m wide (interior.md), set up in the Medieval Sculpture Hall in 1956. After the photographs
 * interior-images.md #P8, #29 and #44 (Met,_cancellata.JPG and the Met's MM29152 and ES4661): three tiers of iron balusters between posts, the lowest with an arched gate, each tier
 * capped by a gilded frieze, and a gilded cresting of three medallions and finials, the middle one with a cross.
 */
import { Matrix4 } from 'three';

import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { voussoirRing } from './arches.js';
import { L1, SCREEN_HEIGHT, SCREEN_WIDTH, SCREEN_Z } from './constants.js';
import { core } from './materials.js';
import { addBox, cylinder, placed } from './shapes.js';

const W = SCREEN_WIDTH / 2;
/**
 * Tier bounds above the hall floor: [bottom, top] of the balusters; a gilded frieze sits on each. Open with the owner (work unit 4, F-owner-1): the
 * level view interior-images.md #29, scaled by the screen's width, puts the friezes' tops at about 5.1, 8.5 and 11.2 m and the cresting at 4.7 m,
 * against 5.9, 9.9 and 13.0 m and 2.85 m here.
 */
const TIERS: readonly (readonly [number, number])[] = [
  [0.7, 5.4],
  [5.9, 9.4],
  [9.85, 12.5],
];
const FRIEZE = 0.5;
const BAR_SPACING = 0.16;
const GATE = 1.7;

/** A disc `d` across and `t` thick facing ±Z, centred at (x, y) in the screen's plane. */
function disc(x: number, y: number, d: number, t: number, dz = 0): Matrix4 {
  return new Matrix4().makeTranslation(x, L1 + y, SCREEN_Z + dz).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeScale(d, t, d)).multiply(new Matrix4().makeTranslation(0, -0.5, 0));
}

export function choirScreen(kit: Kit): void {
  const iron = core.screenIron;
  const gilt = core.gilt;
  const z0 = SCREEN_Z;
  const y = (v: number): number => L1 + v;
  addBox(kit, palette.limestone, -W + 0.2, L1, z0 - 0.45, W - 0.2, y(0.55), z0 + 0.45, 0);
  addBox(kit, iron, -W, y(0.55), z0 - 0.08, W, y(0.7), z0 + 0.08, 1);
  const bar = cylinder(6);
  TIERS.forEach(([b, t], tier) => {
    const tierPosts = tier === 0 ? [-W, -3.2, -GATE, GATE, 3.2, W] : [-W, -3.2, 0, 3.2, W];
    for (const px of tierPosts) addBox(kit, iron, px - 0.08, y(b), z0 - 0.08, px + 0.08, y(t), z0 + 0.08, 2 + tier * 3);
    for (let x = -W + BAR_SPACING; x < W - BAR_SPACING / 2; x += BAR_SPACING) {
      if (tierPosts.some((p) => Math.abs(p - x) < 0.1)) continue;
      kit.add(bar, iron, placed(x, y(b), z0, 0, [0.045, t - b, 0.045]), 2 + tier * 3);
    }
    // Frieze: a dark band edged with gilt mouldings and studded with gilt bosses.
    addBox(kit, iron, -W - 0.05, y(t), z0 - 0.13, W + 0.05, y(t + FRIEZE), z0 + 0.13, 3 + tier * 3);
    for (const [a, b2] of [
      [t, t + 0.08],
      [t + FRIEZE - 0.08, t + FRIEZE],
    ] as const) {
      addBox(kit, gilt, -W - 0.07, y(a), z0 - 0.16, W + 0.07, y(b2), z0 + 0.16, 3 + tier * 3);
    }
    for (let x = -W + 0.4; x < W - 0.2; x += 0.8) {
      for (const side of [-1, 1]) kit.add(cylinder(20), gilt, disc(x, t + FRIEZE / 2, 0.2, 0.06, side * 0.14), 3 + tier * 3);
    }
  });
  // The gate's arched head in the lowest tier, gilded on both faces.
  const arch = voussoirRing({ head: 'segmental', span: 2 * GATE, rise: 0.9, band: 0.14, count: 11, projection: 0.06, parity: 'all' });
  kit.add(arch, gilt, placed(0, y(4.1), z0 + 0.08), 2);
  kit.add(arch, gilt, placed(0, y(4.1), z0 - 0.08, Math.PI), 2);
  // Cresting: three medallions (gilt rims, iron fields, gilt bosses), finials and the cross.
  const round = cylinder(20);
  const top = TIERS[2]?.[1] ?? 12.5;
  const base = top + FRIEZE;
  const half = voussoirRing({ head: 'round', span: 1, band: 0.07, count: 9, projection: 0.1, parity: 'all', back: true });
  for (const [x, cy, d] of [
    [0, base + 1.15, 1.5],
    [-4.0, base + 0.9, 1.15],
    [4.0, base + 0.9, 1.15],
  ] as const) {
    kit.add(round, gilt, disc(x, cy, d, 0.08), 12);
    kit.add(round, iron, disc(x, cy, d * 0.72, 0.12), 12);
    kit.add(round, gilt, disc(x, cy, d * 0.28, 0.18), 12);
    addBox(kit, gilt, x - 0.06, y(base), z0 - 0.05, x + 0.06, y(cy - d / 2), z0 + 0.05, 12);
    // A gilt rim round the medallion and scrolls springing from the frieze on both sides (rings scaled from a unit half-ring).
    const s1 = d + 0.3;
    for (const turn of [0, Math.PI]) kit.add(half, gilt, new Matrix4().makeTranslation(x, y(cy), z0 - 0.05).multiply(new Matrix4().makeRotationZ(turn)).multiply(new Matrix4().makeScale(s1, s1, 1)), 12);
    for (const sx of [-1, 1]) {
      const s2 = d * 0.9;
      kit.add(half, gilt, new Matrix4().makeTranslation(x + sx * (d * 0.75), y(base), z0 - 0.05).multiply(new Matrix4().makeScale(s2, s2 * 1.2, 1)), 12);
    }
  }
  for (const x of [-5.9, -2.0, 2.0, 5.9]) {
    kit.add(bar, gilt, placed(x, y(base), z0, 0, [0.09, 1.7, 0.09]), 13);
    kit.add(round, gilt, disc(x, base + 1.0, 0.32, 0.32), 13);
  }
  const crossFoot = base + 1.15 + 0.75;
  addBox(kit, gilt, -0.06, y(crossFoot), z0 - 0.06, 0.06, y(SCREEN_HEIGHT), z0 + 0.06, 14);
  addBox(kit, gilt, -0.32, y(SCREEN_HEIGHT - 0.42), z0 - 0.06, 0.32, y(SCREEN_HEIGHT - 0.3), z0 + 0.06, 14);
}
