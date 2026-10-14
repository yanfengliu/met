/**
 * The Lehman Wing's glass, last in its chapter: the sloped glazed ceiling over the gallery ring, the skylight along the 1880 front, and the pyramid.
 *
 * The pyramid is built here rather than with the parts library's pyramidSkylight, whose bars all run to the apex: photo P9 (int-lehman-pyramid-up)
 * and the orthophoto show eight faces over the clipped octagon (four broad, four narrow) meeting at one point, glazed on a grid parallel to each
 * face's eave (purlins) and square to it (rafters), on light grey steel. Bars are instances of the unit box, panes of the unit triangle.
 */
import type { Kit, StepDef } from '../../build/types.js';
import {
  BAND_HIGH,
  BAND_HIGH_Y,
  BAND_LOW,
  COURT_OCTAGON,
  COURT_X,
  COURT_Z,
  LEHMAN_APEX_Y,
  LEHMAN_BAND_LOW_Y,
  LEHMAN_EAVE_Y,
  LEHMAN_ROOF_Y,
  STRIP_EAST_Z,
  STRIP_GAP_HALF_X,
  STRIP_HALF_X,
  STRIP_HEAD_Y,
  STRIP_WEST_Z,
} from './lehman-plan.js';
import { mat } from './materials.js';
import type { P2 } from './poly.js';
import { bar, paneMatrix, quadPanes, UNIT_BOX, UNIT_TRIANGLE, type V3 } from './shapes.js';

const CHAPTER = 'roche-steps-lehman-1975' as const;
const YEAR = '1975';

type Vec = [number, number, number];
const add = (a: V3, b: V3): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
const mix = (a: V3, b: V3, t: number): Vec => add(a, scale(sub(b, a), t));
function cross(a: V3, b: V3): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function unit(a: V3): Vec {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}
/** Outward (upward) unit normal of the face a, b, c. */
function upNormal(a: V3, b: V3, c: V3): Vec {
  const n = unit(cross(sub(b, a), sub(c, a)));
  return n[1] < 0 ? scale(n, -1) : n;
}
const lift = (p: P2, y: number): Vec => [p[0], y, p[1]];

/** Bar sizes (face width, depth), metres. */
const EAVE_BAR = [0.3, 0.4] as const;
const HIP_BAR = [0.16, 0.3] as const;
const GRID_BAR = [0.07, 0.16] as const;
/** Panes sit inside the bars' depth, never on a bar face. */
const PANE_LIFT = 0.03;

/**
 * The pyramid's grid (P9): purlins at these fractions of the way from the eave to the apex (a short course at the eave, then even courses, as the
 * fit to the seven purlins of the nearest narrow face gives), and rafter bays of about 1.1 m along each eave (four on a narrow face).
 */
export const PURLINS: readonly number[] = [0.071, 0.201, 0.331, 0.461, 0.591, 0.721, 0.851];
export const BROAD_BAYS = 12;
export const NARROW_BAYS = 4;

interface Piece {
  readonly matrix: ReturnType<typeof bar>;
  readonly glass: boolean;
  readonly order: number;
}

/** The pyramid's pieces: eave ring, hips, purlins, rafters, then one pane per face. */
export function pyramidPieces(): Piece[] {
  const apex: Vec = [COURT_X, LEHMAN_APEX_Y, COURT_Z];
  const base = COURT_OCTAGON.map((p) => lift(p, LEHMAN_EAVE_Y));
  const pieces: Piece[] = [];
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const a = base[i] ?? apex;
    const b = base[(i + 1) % n] ?? apex;
    const normal = upNormal(a, b, apex);
    const broad = i % 2 === 1;
    pieces.push({ matrix: bar(a, b, EAVE_BAR[0], EAVE_BAR[1]), glass: false, order: 0 });
    // The hip from this face's first corner (each corner once).
    const before = base[(i - 1 + n) % n] ?? apex;
    const hipNormal = unit(add(normal, upNormal(before, a, apex)));
    pieces.push({ matrix: bar(a, apex, HIP_BAR[0], HIP_BAR[1], hipNormal), glass: false, order: 1 });
    PURLINS.forEach((h, k) => {
      pieces.push({ matrix: bar(mix(a, apex, h), mix(b, apex, h), GRID_BAR[0], GRID_BAR[1], normal), glass: false, order: 2 + k });
    });
    // Rafters square to the eave: one from eave fraction s ends on the near hip at fraction 2s (or 2(1 − s)).
    const bays = broad ? BROAD_BAYS : NARROW_BAYS;
    for (let j = 1; j < bays; j++) {
      const s = j / bays;
      const foot = mix(a, b, s);
      const end = Math.abs(s - 0.5) < 1e-9 ? apex : s < 0.5 ? mix(a, apex, 2 * s) : mix(b, apex, 2 * (1 - s));
      pieces.push({ matrix: bar(foot, end, GRID_BAR[0], GRID_BAR[1], normal), glass: false, order: PURLINS.length + 2 });
    }
    const lifted = (p: V3): Vec => add(p, scale(normal, PANE_LIFT));
    pieces.push({ matrix: paneMatrix(lifted(a), lifted(b), lifted(apex)), glass: true, order: PURLINS.length + 3 + i });
  }
  return pieces;
}

/** The gallery ring's sloped glazing: five flat faces from the inner ring wall down to the outer ring wall, plus its two end edges. */
export function bandPieces(): Piece[] {
  const high = BAND_HIGH.map((p) => lift(p, BAND_HIGH_Y));
  const low = BAND_LOW.map((p) => lift(p, LEHMAN_BAND_LOW_Y));
  const pieces: Piece[] = [];
  for (let i = 0; i + 1 < high.length; i++) {
    const q0 = high[i] ?? [0, 0, 0];
    const q1 = high[i + 1] ?? q0;
    const p0 = low[i] ?? q0;
    const p1 = low[i + 1] ?? q0;
    const normal = upNormal(q0, p0, p1);
    const bays = Math.max(2, Math.round(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 1.5));
    for (let j = 0; j <= bays; j++) {
      const t = j / bays;
      // Rafters from the high edge to the low edge; the end ones are the hips.
      const size = j === 0 || j === bays ? HIP_BAR : GRID_BAR;
      if (j === 0 && i > 0) continue;
      pieces.push({ matrix: bar(mix(q0, q1, t), mix(p0, p1, t), size[0], size[1], normal), glass: false, order: 0 });
    }
    for (const t of [0, 1 / 3, 2 / 3, 1]) {
      const size = t === 0 || t === 1 ? HIP_BAR : GRID_BAR;
      pieces.push({ matrix: bar(mix(q0, p0, t), mix(q1, p1, t), size[0], size[1], normal), glass: false, order: 0 });
    }
    const lifted = (p: V3): Vec => add(p, scale(normal, PANE_LIFT));
    for (const matrix of quadPanes(lifted(q0), lifted(q1), lifted(p1), lifted(p0))) pieces.push({ matrix, glass: true, order: 1 + i });
  }
  return pieces;
}

/**
 * The skylight along the 1880 front: a lean-to from the flat roof up to the old wall, rafters every 0.75 m (orthophoto), in two runs either side of the
 * court's east tip (STRIP_GAP_HALF_X). Its head bar rests against the brick face above the band at the second floor, so nothing of it enters the old
 * front's trim; a glass triangle closes each run's inner end up to the lead flat over the gap.
 */
export function stripPieces(): Piece[] {
  const z0 = STRIP_WEST_Z;
  const y0 = LEHMAN_ROOF_Y + 0.1;
  const y1 = STRIP_HEAD_Y;
  // The head bar sits square to the slope, so its back edge reaches half its width and half its depth's lean beyond the head line: stop it 5 mm off the wall.
  let z1 = STRIP_EAST_Z;
  for (let k = 0; k < 4; k++) {
    const slope = Math.atan2(y1 - y0, z1 - z0);
    z1 = STRIP_EAST_Z - (HIP_BAR[0] / 2) * Math.cos(slope) - (HIP_BAR[1] / 2) * Math.sin(slope) - 0.005;
  }
  const pieces: Piece[] = [];
  const run = (x0: number, x1: number, inner: number): void => {
    const corners: [Vec, Vec, Vec, Vec] = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    const normal = upNormal(corners[0], corners[2], corners[1]);
    pieces.push({ matrix: bar(corners[0], corners[1], HIP_BAR[0], HIP_BAR[1], normal), glass: false, order: 0 });
    pieces.push({ matrix: bar(corners[3], corners[2], HIP_BAR[0], HIP_BAR[1], normal), glass: false, order: 0 });
    const bays = Math.round((x1 - x0) / 0.75);
    for (let j = 0; j <= bays; j++) {
      const x = x0 + ((x1 - x0) * j) / bays;
      pieces.push({ matrix: bar([x, y0, z0], [x, y1, z1], GRID_BAR[0], GRID_BAR[1], normal), glass: false, order: 0 });
    }
    const lifted = (p: V3): Vec => add(p, scale(normal, PANE_LIFT));
    for (const matrix of quadPanes(lifted(corners[0]), lifted(corners[1]), lifted(corners[2]), lifted(corners[3]))) pieces.push({ matrix, glass: true, order: 1 });
    // The run's inner end: a triangle from its low edge up to the head's height, under the lead flat.
    pieces.push({ matrix: paneMatrix([inner, y0, z0], [inner, y1, z0], [inner, y1, z1]), glass: true, order: 1 });
  };
  run(-STRIP_HALF_X, -STRIP_GAP_HALF_X, -STRIP_GAP_HALF_X);
  run(STRIP_GAP_HALF_X, STRIP_HALF_X - 0.1, STRIP_GAP_HALF_X);
  return pieces;
}

function addPieces(kit: Kit, pieces: readonly Piece[], orderBase = 0): void {
  for (const piece of pieces) kit.add(piece.glass ? UNIT_TRIANGLE : UNIT_BOX, piece.glass ? mat.glass : mat.steel, piece.matrix, orderBase + piece.order);
}

export const lehmanGlassSteps: readonly StepDef[] = [
  {
    id: 'lehman-gallery-glass',
    chapter: CHAPTER,
    year: YEAR,
    title: 'Glass over the gallery ring',
    detail: 'A sloped glazed ceiling over the galleries round the court, and a skylight along the old brick front where the wing meets it.',
    motion: { kind: 'drop' },
    stagger: 'order',
    focus: { kind: 'view', position: [36, 34, -196], target: [0, 10, -153] },
    build: (kit) => {
      addPieces(kit, bandPieces());
      addPieces(kit, stripPieces(), 10);
    },
  },
  {
    id: 'lehman-pyramid',
    chapter: CHAPTER,
    year: YEAR,
    title: 'The glass pyramid over the court',
    detail: 'Eight glazed faces on a light steel grid rise about 11 m from the court walls to one apex, some 27 m above Fifth Avenue grade.',
    motion: { kind: 'drop' },
    stagger: 'order',
    weight: 1.5,
    focus: { kind: 'view', position: [30, 40, -188], target: [0, 14, -151] },
    build: (kit) => {
      addPieces(kit, pyramidPieces());
    },
  },
];
