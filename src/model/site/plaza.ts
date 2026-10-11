/**
 * Chapter `koch-plaza-2014`: the David H. Koch Plaza by OLIN, dedicated 9 September 2014 (history.md section 9; exterior.md [P5]..[P10]).
 * Layout from frame.ts (FOUNTAIN_*, GROVE_*, ALLEE_*) and the 2018 orthophoto (the `ref-plan-ortho` photograph): granite paving from the facades to the curb,
 * two square fountains beside the steps, four groves of London planes on a grid turned 45°, two rows of 13 lindens in front of each end pavilion, the red
 * parasols over the benches before both end pavilions, planting beds along the Hunt extensions with a magnolia at each end of the steps.
 * Nothing stands within 1.5 m of the end pavilions' fronts (Z +9.85..+11.35), where their porches may project (coordinator, 2026-10-11).
 */
import { Matrix4, Vector3 } from 'three';
import type { Material } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import {
  ALLEE_NORTH_MIN_X,
  ALLEE_ROW_Z_INNER,
  ALLEE_ROW_Z_OUTER,
  ALLEE_SOUTH_MAX_X,
  ALLEE_SPACING,
  ALLEE_TREES_PER_ROW,
  FOUNTAIN_CENTRE_X,
  FOUNTAIN_CENTRE_Z,
  FOUNTAIN_SIZE,
  GROVE_CENTRE_X_INNER,
  GROVE_CENTRE_X_OUTER,
  GROVE_CENTRE_Z,
  GROVE_SIZE_X,
  GROVE_SIZE_Z,
  STEPS_BOTTOM_Z,
  STEPS_HALF_WIDTH,
} from '../frame.js';
import { hedge, tree } from '../lib/index.js';
import type { Tree } from '../lib/index.js';
import { palette } from '../palette.js';
import { FRONTAGE, PAVING_GAP, walkWestY } from './ground.js';
import { CELLS } from './grid.js';
import { BENCH, CHAIR, PARASOL_CANOPY, PARASOL_MAST, POLE, POLE_LENS, TABLE } from './furniture.js';
import { fountainParts } from './fountain.js';
import { clumps } from './lumps.js';
import { siteMaterials } from './materials.js';
import { seeded } from './random.js';
import { STEPS_BACK_Z } from './steps.js';
import { UNIT_BLOCK, UNIT_TILE, blockMatrix, planeMatrix, surfaceMatrix } from './tiles.js';

/** The plaza's finished level: the granite lies a paving gap above the old sidewalk. */
const plazaY = (x: number, z: number): number => walkWestY(x, z) + PAVING_GAP;

export interface Box2 {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

const both = (x0: number, x1: number, z0: number, z1: number): Box2[] => [
  { x0, x1, z0, z1 },
  { x0: -x1, x1: -x0, z0, z1 },
];

/** The two fountains: squares FOUNTAIN_SIZE across at (±FOUNTAIN_CENTRE_X, FOUNTAIN_CENTRE_Z). */
export const FOUNTAINS: readonly Box2[] = both(FOUNTAIN_CENTRE_X - FOUNTAIN_SIZE / 2, FOUNTAIN_CENTRE_X + FOUNTAIN_SIZE / 2, FOUNTAIN_CENTRE_Z - FOUNTAIN_SIZE / 2, FOUNTAIN_CENTRE_Z + FOUNTAIN_SIZE / 2);
/** The four groves, GROVE_SIZE_X × GROVE_SIZE_Z at X ±GROVE_CENTRE_X_INNER and ±GROVE_CENTRE_X_OUTER. */
export const GROVES: readonly Box2[] = [GROVE_CENTRE_X_INNER, GROVE_CENTRE_X_OUTER].flatMap((cx) => both(cx - GROVE_SIZE_X / 2, cx + GROVE_SIZE_X / 2, GROVE_CENTRE_Z - GROVE_SIZE_Z / 2, GROVE_CENTRE_Z + GROVE_SIZE_Z / 2));
/** Planting beds along the Hunt extensions and the links (orthophoto 2018: green strips at X ±31..±59 and ±75..±87.5 from the facades; E). */
export const FACADE_BEDS: readonly Box2[] = [...both(31.2, 58.6, -1.7, 1.7), ...both(75.2, 87.4, -1.7, 1.7)];
/** The steps' stepped mass covers the paving from the podium's face to their foot. */
const STEPS_AREA: Box2 = { x0: -STEPS_HALF_WIDTH, x1: STEPS_HALF_WIDTH, z0: STEPS_BACK_Z, z1: STEPS_BOTTOM_Z };

const inside = (b: Box2, x: number, z: number): boolean => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1;

// ---------------------------------------------------------------- paving

export const pavingStep: StepDef = {
  id: 'plaza-paving',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Lay the plaza’s granite paving',
  detail: 'Grey granite replaces the 1970 plaza from the facades to the curb along the whole thousand-foot front, 80th to 84th Street.',
  motion: { kind: 'rise', distance: 0.3 },
  stagger: 'radial',
  weight: 1.2,
  build(kit) {
    for (const cell of CELLS) {
      if (cell.zone !== 'walkWest' || cell.cut !== null) continue;
      const cx = (cell.x0 + cell.x1) / 2;
      const cz = (cell.z0 + cell.z1) / 2;
      if (cx < FRONTAGE.x0 || cx > FRONTAGE.x1) continue;
      if ([STEPS_AREA, ...FOUNTAINS, ...GROVES, ...FACADE_BEDS].some((b) => inside(b, cx, cz))) continue;
      kit.add(UNIT_TILE, siteMaterials.plazaGranite, surfaceMatrix(cell.x0, cell.x1, cell.z0, cell.z1, plazaY));
    }
  },
};

// ---------------------------------------------------------------- fountains

/** A box's frame on the plaza: centred on it and tilted with the paving's slope (1% toward the curb, the avenue's fall along it). */
function frameOf(b: Box2): Matrix4 {
  return planeMatrix((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, plazaY, Math.max(b.x1 - b.x0, b.z1 - b.z0));
}

export const fountainsStep: StepDef = {
  id: 'plaza-fountains',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Set the two granite fountains',
  detail: 'Two squares of dark granite, 13.8 m across, flank the steps; each holds a round basin over a shallow stone dome, ringed by 48 nozzles.',
  motion: { kind: 'rise', distance: 1 },
  build(kit) {
    const f = fountainParts();
    FOUNTAINS.forEach((b, k) => {
      const m = frameOf(b);
      kit.add(f.stone, siteMaterials.darkGranite, m, k);
      kit.add(f.nozzles, siteMaterials.darkGranite, m, k);
    });
  },
};

export const fountainWaterStep: StepDef = {
  id: 'plaza-fountain-water',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Turn on the fountains',
  detail: 'Water fills each basin in a thin sheet over the dome while 48 jets arc in from the rim; heated, they run all year.',
  motion: { kind: 'grow' },
  build(kit) {
    const f = fountainParts();
    FOUNTAINS.forEach((b, k) => {
      const m = frameOf(b);
      kit.add(f.water, palette.water, m, k);
      kit.add(f.jets, siteMaterials.jet, m, k);
    });
  },
};

// ---------------------------------------------------------------- groves and beds

const BORDER = 0.6;
const BORDER_HEIGHT = 0.12;

/** A raised rectangle of `fill` over b inside a granite border `width` wide, its top `height` above the paving, tilted with it. */
function bed(kit: Kit, b: Box2, fill: Material, width: number, height: number, order: number): void {
  const frame = frameOf(b);
  const depth = height + 0.5;
  const sx = b.x1 - b.x0;
  const sz = b.z1 - b.z0;
  const y0 = height - depth;
  const put = (material: Material, m: Matrix4): void => {
    kit.add(UNIT_BLOCK, material, frame.clone().multiply(m), order);
  };
  put(palette.granite, blockMatrix(0, y0, -sz / 2 + width / 2, sx, depth, width));
  put(palette.granite, blockMatrix(0, y0, sz / 2 - width / 2, sx, depth, width));
  put(palette.granite, blockMatrix(-sx / 2 + width / 2, y0, 0, width, depth, sz - 2 * width));
  put(palette.granite, blockMatrix(sx / 2 - width / 2, y0, 0, width, depth, sz - 2 * width));
  put(fill, blockMatrix(0, y0, 0, sx - 2 * width, depth - 0.04, sz - 2 * width));
}

/** A point of the plaza at (x, z) lifted `up` metres along the paving's normal, as a translation. */
function onPlaza(x: number, z: number, up: number): Matrix4 {
  return planeMatrix(x, z, plazaY).multiply(new Matrix4().makeTranslation(0, up, 0));
}

/** Grove trees on a grid turned 45°, 3.2 m apart: rows 2.26 m apart, three and two trees by turns (13 a grove, so 52 with 52 allée trees and two magnolias make the plaza's 106). */
export function groveTrees(b: Box2): [number, number][] {
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  const d = 3.2 / Math.SQRT2;
  const out: [number, number][] = [];
  for (let j = -2; j <= 2; j += 1) {
    const xs = j % 2 === 0 ? [-2, 0, 2] : [-1, 1];
    for (const i of xs) out.push([cx + i * d, cz + j * d]);
  }
  return out;
}

const SHRUB = hedge({ length: 2.4, height: 0.8, width: 1.3, seed: 4, detail: 'low' });
const MAGNOLIA_X = 34.0;

export const grovesStep: StepDef = {
  id: 'plaza-groves',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Edge the groves and planting beds',
  detail: 'Four gravel groves with granite edges beside the fountains, and planted beds along the Hunt extensions and the links.',
  motion: { kind: 'rise', distance: 0.6 },
  stagger: 'x',
  build(kit) {
    GROVES.forEach((b, k) => {
      bed(kit, b, siteMaterials.gravel, BORDER, BORDER_HEIGHT, k);
    });
    FACADE_BEDS.forEach((b, k) => {
      bed(kit, b, palette.grass, 0.3, 0.4, 10 + k);
      const cz = (b.z0 + b.z1) / 2;
      for (let x = b.x0 + 1.6; x < b.x1 - 1.4; x += 2.6) {
        if (Math.abs(Math.abs(x + 1.2) - MAGNOLIA_X) < 2.4) continue;
        kit.add(SHRUB, palette.foliage, onPlaza(x + 1.2, cz, 0.35), 10 + k);
      }
    });
  },
};

// ---------------------------------------------------------------- furniture

/** The benches under the parasols before the north end pavilion (OSM bench nodes at Z +14.8), mirrored to the south (the orthophoto's red row there). */
const PARASOL_X: readonly number[] = [104.93, 110.52, 115.84, 121.06, 125.93, 131.6, 136.8];
const PARASOL_Z = 15.6;
const BENCH_Z = 14.8;
const POLE_SPOTS: readonly (readonly [number, number])[] = [
  [96.5, 15.5],
  [143.5, 15.5],
  [47.0, 22.2],
  [68.0, 22.2],
];
const POLES: readonly (readonly [number, number])[] = POLE_SPOTS.flatMap(([x, z]): (readonly [number, number])[] => [
  [x, z],
  [-x, z],
]);

export const furnitureStep: StepDef = {
  id: 'plaza-furniture',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Bring in benches, parasols, tables and lights',
  detail: 'Red angular parasols shade granite benches before both end pavilions; 30 tables and 120 chairs fill the groves; slim poles light the plaza.',
  motion: { kind: 'drop', distance: 1.2 },
  stagger: 'x',
  build(kit) {
    for (const s of [-1, 1]) {
      for (const px of PARASOL_X) {
        const x = s * px;
        const y = plazaY(x, PARASOL_Z);
        const m = new Matrix4().makeTranslation(x, y, PARASOL_Z);
        kit.add(PARASOL_MAST, palette.metalDark, m);
        kit.add(PARASOL_CANOPY, siteMaterials.parasolRed, m);
        kit.add(BENCH, palette.granite, new Matrix4().makeTranslation(x, plazaY(x, BENCH_Z), BENCH_Z));
      }
    }
    const random = seeded(2014);
    let tables = 0;
    GROVES.forEach((b) => {
      const trees = groveTrees(b);
      const want = tables < 30 - 7 * 3 ? 8 : 7;
      let placed = 0;
      for (let attempt = 0; attempt < 400 && placed < want; attempt += 1) {
        const x = b.x0 + 1.6 + (b.x1 - b.x0 - 3.2) * random();
        const z = b.z0 + 1.6 + (b.z1 - b.z0 - 3.2) * random();
        if (trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 1.3)) continue;
        const up = BORDER_HEIGHT - 0.04;
        kit.add(TABLE, palette.metalDark, onPlaza(x, z, up));
        const turn = random() * Math.PI * 2;
        for (let c = 0; c < 4; c += 1) {
          const a = turn + (c * Math.PI) / 2;
          // Each chair faces the table: its front (+Z) turned toward the table's centre.
          const chair = onPlaza(x + 0.75 * Math.sin(a), z + 0.75 * Math.cos(a), up).multiply(new Matrix4().makeRotationY(a + Math.PI + (random() - 0.5) * 0.4));
          kit.add(CHAIR, palette.metalDark, chair);
        }
        placed += 1;
      }
      tables += placed;
    });
    for (const [x, z] of POLES) {
      const m = new Matrix4().makeTranslation(x, plazaY(x, z), z);
      kit.add(POLE, palette.metalDark, m);
      kit.add(POLE_LENS, palette.glass, m);
    }
  },
};

// ---------------------------------------------------------------- trees

const GROVE_TREES = [tree({ height: 11, spread: 7.5, seed: 52, detail: 'medium' }), tree({ height: 11, spread: 7.5, seed: 77, detail: 'medium' })];
/** Southern magnolias (Hałun 2023): a dense, glossy, oval evergreen crown 4.6 m wide and 9 m tall on a short trunk. */
const MAGNOLIA_CROWN = clumps([
  { x: 0, y: 0.3, z: 0, r: 0.46, h: 0.3, seed: 51 },
  { x: -0.12, y: 0.5, z: 0.1, r: 0.38, h: 0.24, seed: 52 },
  { x: 0.12, y: 0.55, z: -0.1, r: 0.36, h: 0.24, seed: 53 },
  { x: 0, y: 0.72, z: 0.05, r: 0.3, h: 0.2, seed: 54 },
  { x: 0.05, y: 0.86, z: -0.03, r: 0.18, h: 0.13, seed: 55 },
]);
const MAGNOLIA_Z = 1.2;

function planted(kit: Kit, shape: Tree, crown: Material, x: number, y: number, z: number, scale: number, yaw: number, order: number): void {
  const m = new Matrix4().makeRotationY(yaw).scale(new Vector3(scale, scale, scale)).setPosition(x, y, z);
  kit.add(shape.trunk, palette.bark, m, order);
  kit.add(shape.foliage, crown, m, order);
}

export const groveTreesStep: StepDef = {
  id: 'plaza-grove-trees',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Plant the groves',
  detail: 'Fifty-two London planes, thirteen to a grove on a grid turned 45° to the avenue, and a magnolia at each end of the steps.',
  motion: { kind: 'grow' },
  stagger: 'x',
  build(kit) {
    const random = seeded(106);
    let order = 0;
    for (const b of GROVES) {
      for (const [x, z] of groveTrees(b)) {
        const shape = GROVE_TREES[order % GROVE_TREES.length] ?? GROVE_TREES[0];
        if (shape !== undefined) planted(kit, shape, palette.foliage, x, plazaY(x, z) + BORDER_HEIGHT - 0.05, z, 0.9 + 0.2 * random(), random() * Math.PI * 2, order);
        order += 1;
      }
    }
    for (const s of [-1, 1]) {
      const x = s * MAGNOLIA_X;
      const y = plazaY(x, MAGNOLIA_Z) + 0.35;
      kit.add(UNIT_BLOCK, palette.bark, blockMatrix(x, y, MAGNOLIA_Z, 0.3, 1.6, 0.3), order);
      kit.add(MAGNOLIA_CROWN, siteMaterials.foliageDark, new Matrix4().makeRotationY(s > 0 ? 0.4 : 2.1).scale(new Vector3(4.6, 9, 4.6)).setPosition(x, y + 0.9, MAGNOLIA_Z), order);
      order += 1;
    }
  },
};

/** Little-leaf lindens pruned as aerial hedges (exterior.md [P8]): clear stems carrying clipped box crowns that nearly touch along the row. */
const LINDEN_CROWN = hedge({ length: 4.4, height: 2.7, width: 3.4, seed: 9, detail: 'low' });
const LINDEN_STEM = 2.8;

export function alleeTrees(): [number, number][] {
  const out: [number, number][] = [];
  for (const z of [ALLEE_ROW_Z_INNER, ALLEE_ROW_Z_OUTER]) {
    for (let k = 0; k < ALLEE_TREES_PER_ROW; k += 1) {
      out.push([ALLEE_NORTH_MIN_X + k * ALLEE_SPACING, z]);
      out.push([ALLEE_SOUTH_MAX_X - k * ALLEE_SPACING, z]);
    }
  }
  return out;
}

export const alleesStep: StepDef = {
  id: 'plaza-allees',
  chapter: 'koch-plaza-2014',
  year: '2014',
  title: 'Plant the linden allées',
  detail: 'Four rows of 13 lindens before the end pavilions, pruned into aerial hedges in line with the facade windows.',
  motion: { kind: 'grow' },
  stagger: 'x',
  build(kit) {
    alleeTrees().forEach(([x, z], k) => {
      const y = plazaY(x, z);
      kit.add(UNIT_BLOCK, siteMaterials.darkGranite, blockMatrix(x, y - 0.02, z, 1.6, 0.03, 1.6), k);
      kit.add(UNIT_BLOCK, palette.bark, blockMatrix(x, y, z, 0.28, LINDEN_STEM + 0.4, 0.28), k);
      kit.add(LINDEN_CROWN, palette.foliage, blockMatrix(x, y + LINDEN_STEM, z, 1, 1, 1), k);
    });
  },
};
