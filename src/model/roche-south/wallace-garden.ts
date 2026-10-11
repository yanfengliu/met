/**
 * The Iris and B. Gerald Cantor Roof Garden (opened 1 August 1987; history.md, Chronology) and the Wallace Wing's glass, last of the wing.
 * Garden: the map's floor 5 outline (wallace-plan.ts GARDEN, inside the ROOF_GARDEN_* box of src/model/frame.ts); its weathered teak deck, box hedges in
 * planters along the park edges, a white steel pergola along the east edge, a stair and lift house, and a few small trees, as the 2018 orthophoto and
 * the 2019 roof-garden photograph (exterior-images.md, camera on the Roof Garden looking north) show them.
 */
import { Matrix4 } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { hedge, ridgeSkylight, tree } from '../lib/index.js';
import { palette } from '../palette.js';
import { mat } from './materials.js';
import { ccw, inset, type P2 } from './poly.js';
import { at, bar, boxAt, hollowBoxes, paneMatrix, prism, quadPanes, UNIT_BOX, UNIT_TRIANGLE, type V3 } from './shapes.js';
import { ROOF_LIGHTS } from './wallace.js';
import {
  GARDEN,
  PERGOLA,
  ROOF_GARDEN_Y,
  WALLACE_FACADE_TOP_Y,
  WALLACE_MEZZANINE_Y,
  WALLACE_ROOF_Y,
  WEST_GLASS_X0,
  WEST_GLASS_X1,
  WEST_STRIP_X0,
  WEST_STRIP_X1,
  WEST_STRIP_Z0,
  WEST_STRIP_Z1,
} from './wallace-plan.js';

const CHAPTER = 'roche-south-1990' as const;

const HEDGE = hedge({ length: 2.9, height: 0.8, width: 0.75, detail: 'low' });
const POT_TREE = tree({ height: 4.5, spread: 3.2, seed: 11, detail: 'low' });

/** Planter runs along the garden's park edges: [start, end] on the planter's centre line. */
const PLANTERS: readonly [P2, P2][] = [
  [
    [-121.0, -126.2],
    [-89.9, -126.2],
  ],
  [
    [-121.0, -125.6],
    [-121.0, -117.4],
  ],
  [
    [-136.0, -116.1],
    [-122.2, -116.1],
  ],
  [
    [-136.0, -115.5],
    [-136.0, -105.4],
  ],
];

function garden(kit: Kit): void {
  const deck = inset(ccw(GARDEN), GARDEN.map(() => 0.6));
  kit.add(prism(deck, [], ROOF_GARDEN_Y - 0.06, ROOF_GARDEN_Y), mat.deck, at(0, 0, 0), 0);
  // Planters and their hedges, laid as 3 m lengths.
  let order = 1;
  for (const [a, b] of PLANTERS) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(length / 3));
    const ux = (b[0] - a[0]) / length;
    const uz = (b[1] - a[1]) / length;
    for (let k = 0; k < n; k++) {
      const s = ((k + 0.5) * length) / n;
      const c: P2 = [a[0] + ux * s, a[1] + uz * s];
      const turn = new Matrix4().makeRotationY(Math.atan2(-uz, ux));
      kit.add(UNIT_BOX, palette.granite, at(c[0], ROOF_GARDEN_Y, c[1]).multiply(turn).multiply(new Matrix4().makeScale(length / n - 0.05, 0.6, 1.0)), order);
      kit.add(HEDGE, palette.foliage, at(c[0], ROOF_GARDEN_Y + 0.6, c[1]).multiply(turn), order);
      order += 1;
    }
  }
  // The pergola: white steel posts on a 3.7 m grid, beams along X, slats across.
  const [px0, pz0, px1, pz1] = PERGOLA;
  const top = ROOF_GARDEN_Y + 3.3;
  const bays = Math.round((px1 - px0) / 3.7);
  for (let i = 0; i <= bays; i++) {
    const x = px0 + ((px1 - px0) * i) / bays;
    for (const z of [pz0, pz1]) kit.add(UNIT_BOX, mat.steel, boxAt([x - 0.12, ROOF_GARDEN_Y, z - 0.12], [x + 0.12, top, z + 0.12]), 40);
  }
  for (const z of [pz0, pz1]) kit.add(UNIT_BOX, mat.steel, boxAt([px0 - 0.3, top, z - 0.15], [px1 + 0.3, top + 0.4, z + 0.15]), 41);
  const slats = Math.round((px1 - px0) / 0.9);
  for (let i = 0; i <= slats; i++) {
    const x = px0 + ((px1 - px0) * i) / slats;
    kit.add(UNIT_BOX, mat.steel, boxAt([x - 0.05, top + 0.4, pz0 - 0.4], [x + 0.05, top + 0.6, pz1 + 0.4]), 42);
  }
  // The stair and lift house on the garden's east side, and small trees in big pots.
  for (const m of hollowBoxes([-121.2, ROOF_GARDEN_Y, -107.0], [-111.6, ROOF_GARDEN_Y + 4.0, -104.4], 0.5)) kit.add(UNIT_BOX, palette.limestone, m, 43);
  for (const [x, z] of [
    [-116.0, -122.5],
    [-104.0, -122.5],
  ] as const) {
    kit.add(UNIT_BOX, palette.granite, boxAt([x - 0.7, ROOF_GARDEN_Y, z - 0.7], [x + 0.7, ROOF_GARDEN_Y + 0.8, z + 0.7]), 44);
    kit.add(POT_TREE.trunk, palette.bark, at(x, ROOF_GARDEN_Y + 0.8, z), 45);
    kit.add(POT_TREE.foliage, palette.foliage, at(x, ROOF_GARDEN_Y + 0.8, z), 45);
  }
}

// --- Glass --------------------------------------------------------------------------------------------------------------------------------

type Vec = [number, number, number];
const BAR = [0.08, 0.2] as const;

/** A flat glazed panel a→b→c→d (in order) with `cols` × `rows` bays: its bars and its two panes. */
function glazedPanel(kit: Kit, corners: readonly [Vec, Vec, Vec, Vec], cols: number, rows: number, normal: V3, order: number): void {
  const [a, b, c, d] = corners;
  const mix = (p: V3, q: V3, t: number): Vec => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    kit.add(UNIT_BOX, mat.steel, bar(mix(a, b, t), mix(d, c, t), BAR[0], BAR[1], normal), order);
  }
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    kit.add(UNIT_BOX, mat.steel, bar(mix(a, d, t), mix(b, c, t), BAR[0], BAR[1], normal), order);
  }
  const lift = (p: V3): Vec => [p[0] + normal[0] * 0.02, p[1] + normal[1] * 0.02, p[2] + normal[2] * 0.02];
  for (const m of quadPanes(lift(a), lift(b), lift(c), lift(d))) kit.add(UNIT_TRIANGLE, mat.glass, m, order);
}

const MONITOR = (width: number, length: number): ReturnType<typeof ridgeSkylight> => ridgeSkylight({ width, length, pitch: 28, curbHeight: 0.5, bays: Math.max(4, Math.round(length / 2)), bar: 0.07, barDepth: 0.12 });

function wallaceGlass(kit: Kit): void {
  // The tall gallery's glass wall in the park face, 0.3 m behind the stone face.
  const z = -160.1 + 0.3;
  const y0 = WALLACE_MEZZANINE_Y - 0.6;
  const y1 = WALLACE_FACADE_TOP_Y - 1.0;
  const cols = Math.round((WEST_GLASS_X1 - WEST_GLASS_X0) / 1.5);
  glazedPanel(kit, [[WEST_GLASS_X0, y0, z], [WEST_GLASS_X1, y0, z], [WEST_GLASS_X1, y1, z], [WEST_GLASS_X0, y1, z]], cols, 3, [0, 0, -1], 0);
  // The glazed roof strip rising from the park face to the main roof.
  const lo = WALLACE_FACADE_TOP_Y + 0.3;
  const corners: [Vec, Vec, Vec, Vec] = [
    [WEST_STRIP_X0, lo, WEST_STRIP_Z0],
    [WEST_STRIP_X1, lo, WEST_STRIP_Z0],
    [WEST_STRIP_X1, WALLACE_ROOF_Y + 0.3, WEST_STRIP_Z1],
    [WEST_STRIP_X0, WALLACE_ROOF_Y + 0.3, WEST_STRIP_Z1],
  ];
  const slope = Math.atan2(WALLACE_ROOF_Y - WALLACE_FACADE_TOP_Y, WEST_STRIP_Z1 - WEST_STRIP_Z0);
  glazedPanel(kit, corners, Math.round((WEST_STRIP_X1 - WEST_STRIP_X0) / 1.5), 4, [0, Math.cos(slope), -Math.sin(slope)], 1);
  // Gable panes closing the strip's two ends, over the side walls' parapets.
  for (const x of [WEST_STRIP_X0, WEST_STRIP_X1]) {
    kit.add(UNIT_TRIANGLE, mat.glass, paneMatrix([x, lo, WEST_STRIP_Z0], [x, WALLACE_ROOF_Y + 0.3, WEST_STRIP_Z1], [x, lo, WEST_STRIP_Z1]), 1);
  }
  // Monitors and the glazed strips by the lounge: ridge skylights over the roof openings.
  ROOF_LIGHTS.forEach(([x0, z0, x1, z1], k) => {
    const alongX = x1 - x0 > z1 - z0;
    const sky = MONITOR(alongX ? z1 - z0 : x1 - x0, alongX ? x1 - x0 : z1 - z0);
    const m = at((x0 + x1) / 2, WALLACE_ROOF_Y, (z0 + z1) / 2).multiply(new Matrix4().makeRotationY(alongX ? Math.PI / 2 : 0));
    kit.add(sky.frame, mat.steel, m, 2 + k);
    kit.add(sky.glass, mat.glass, m, 2 + k);
    // A diffusing laylight under each opening, flush with the roof's underside.
    kit.add(UNIT_BOX, mat.laylight, boxAt([x0 + 0.2, WALLACE_ROOF_Y - 0.68, z0 + 0.2], [x1 - 0.2, WALLACE_ROOF_Y - 0.6, z1 - 0.2]), 2 + k);
  });
}

export const roofGardenSteps: readonly StepDef[] = [
  {
    id: 'roof-garden',
    chapter: CHAPTER,
    year: '1987',
    title: 'Cantor Roof Garden',
    detail: 'The Iris and B. Gerald Cantor Roof Garden on the Wallace Wing: a teak terrace over the park with hedges in planters and a pergola. Closed in 2025.',
    motion: { kind: 'grow' },
    stagger: 'order',
    focus: { kind: 'view', position: [-150, 42, -140], target: [-112, 22, -115] },
    build: garden,
  },
  {
    id: 'wallace-glass',
    chapter: CHAPTER,
    year: '1987',
    title: 'Wallace Wing glass to the park',
    detail: 'A glass wall for the tall gallery behind the park face and a glazed roof rising from it, with skylights over the second-floor galleries.',
    motion: { kind: 'slide', from: [0, 0, -6] },
    stagger: 'order',
    focus: { kind: 'view', position: [-175, 30, -205], target: [-115, 10, -150] },
    build: wallaceGlass,
  },
];
