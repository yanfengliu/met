/**
 * Chapter `roche-steps-lehman-1975`: Roche Dinkeloo's front steps of 1969–70 (history.md section 6: `steps-landing`, `steps-flight`, `steps-railings`).
 * Form, from interior.md "How the front steps reach the main floor" (map shifted 3.1 m, spec World frame) and the 2018 orthophoto: a stepped platform that
 * descends on three sides, front and both ends, in three flights split by two landings about 1.7 m deep; each step is a U that runs back to the Hunt
 * pavilion's podium at Z +3.5 (the hunt worker builds everything nearer the facade). Levels and extents are frame.ts's: the landing at LANDING_Y from
 * Z +3.5 to STEPS_TOP_Z, the foot at STEPS_BOTTOM_Z and ±STEPS_HALF_WIDTH, STEP_RISER_COUNT risers; the ends run as far out as the front runs forward,
 * so the landing's half-width is STEPS_HALF_WIDTH − (STEPS_BOTTOM_Z − STEPS_TOP_Z) (12.5 m; the map reads 11.3, the orthophoto 11.6).
 * Handrails (exterior.md [P4]; Schneider 2019, orthophoto): two down the middle at X ±4.4, and one down each end at Z +5.8.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { LANDING_Y, STEP_RISER_COUNT, STEPS_BOTTOM_Z, STEPS_HALF_WIDTH, STEPS_TOP_Z } from '../frame.js';
import { palette } from '../palette.js';
import { walkWestY } from './ground.js';
import { siteMaterials } from './materials.js';
import { UNIT_BLOCK, beamMatrix, blockMatrix } from './tiles.js';

/** The hunt worker's podium ends here; the steps start at its face. */
export const STEPS_BACK_Z = 3.5;
/** Risers per flight, top to bottom (counted in Schneider 2019: about 7, 7 and 8). */
const FLIGHTS: readonly number[] = [7, 7, 8];
/** Depth of each of the two intermediate landings (interior.md: about 1.7 m; the map's 1.73). */
const LANDING_DEPTH = 1.73;
/** Step blocks reach this far below grade, under any paving laid against them later. */
const BLOCK_BOTTOM = -0.8;
/** Each tread is a separate 6 cm slab of lighter granite with a 3 cm nosing over the riser below. */
const TREAD = 0.06;
const NOSING = 0.03;
const RUN = STEPS_BOTTOM_Z - STEPS_TOP_Z;
/** The landing's half-width: the ends descend as far as the front does. */
export const LANDING_HALF_WIDTH = STEPS_HALF_WIDTH - RUN;
/** Handrails: 0.95 m above the nosings, 5 cm square, posts about every 2 m. */
const RAIL_HEIGHT = 0.95;
const RAIL = 0.05;
const POST = 0.06;
const CENTRAL_RAIL_X = 4.4;
const END_RAIL_Z = 5.8;

export interface StepRow {
  /** 1-based from the top. */
  readonly k: number;
  /** Top of this step. */
  readonly y: number;
  /** Its front edge (nosing line) and its end's outer edge. */
  readonly z: number;
  readonly x: number;
  /** The edges of the step above it (the landing for k = 1). */
  readonly zIn: number;
  readonly xIn: number;
}

/** The rows of the flight, top to bottom: risers of equal height from the landing to the sidewalk at the foot on the axis. */
export function stepRows(): StepRow[] {
  const steps = FLIGHTS.reduce((a, b) => a + b, 0);
  const foot = walkWestY(0, STEPS_BOTTOM_Z);
  const riser = (LANDING_Y - foot) / steps;
  const landings = new Set<number>();
  let sum = 0;
  for (const n of FLIGHTS.slice(0, -1)) {
    sum += n;
    landings.add(sum);
  }
  const tread = (RUN - landings.size * LANDING_DEPTH) / (steps - 1 - landings.size);
  const rows: StepRow[] = [];
  let z = STEPS_TOP_Z;
  let x = LANDING_HALF_WIDTH;
  for (let k = 1; k < steps; k += 1) {
    const d = landings.has(k) ? LANDING_DEPTH : tread;
    rows.push({ k, y: LANDING_Y - k * riser, z: z + d, x: x + d, zIn: z, xIn: x });
    z += d;
    x += d;
  }
  return rows;
}

if (FLIGHTS.reduce((a, b) => a + b, 0) !== STEP_RISER_COUNT) throw new Error(`steps.ts: FLIGHTS sum to ${String(FLIGHTS.reduce((a, b) => a + b, 0))} risers, not frame.ts STEP_RISER_COUNT (${String(STEP_RISER_COUNT)}); make them agree.`);

export const landingStep: StepDef = {
  id: 'steps-landing',
  chapter: 'roche-steps-lehman-1975',
  year: '1970',
  title: 'Build the landing before the doors',
  detail: 'A granite terrace 25 m wide at the level of the doors, 3.6 m above the avenue, carries the approach to the Great Hall.',
  motion: { kind: 'rise', distance: 1.5 },
  focus: { kind: 'preset', id: 'ref-front-axis' },
  build(kit) {
    const depth = STEPS_TOP_Z - STEPS_BACK_Z;
    kit.add(UNIT_BLOCK, palette.granite, blockMatrix(0, BLOCK_BOTTOM, STEPS_BACK_Z + depth / 2, 2 * LANDING_HALF_WIDTH, LANDING_Y - TREAD - BLOCK_BOTTOM, depth));
    kit.add(UNIT_BLOCK, siteMaterials.stepTread, blockMatrix(0, LANDING_Y - TREAD, STEPS_BACK_Z + (depth + NOSING) / 2, 2 * (LANDING_HALF_WIDTH + NOSING), TREAD, depth + NOSING));
  },
};

export const flightStep: StepDef = {
  id: 'steps-flight',
  chapter: 'roche-steps-lehman-1975',
  year: '1970',
  title: 'Lay the broad flight of steps',
  detail: 'Twenty-two granite steps in three flights, with two landings, fall to the avenue at the front and at both ends: a three-way slope 47 m wide.',
  motion: { kind: 'rise', distance: 0.5 },
  stagger: 'order',
  weight: 1.4,
  focus: { kind: 'preset', id: 'ref-front-axis' },
  build(kit) {
    for (const row of stepRows()) {
      const h = row.y - TREAD - BLOCK_BOTTOM;
      const y = row.y - TREAD;
      // The front band, and the two ends running back to the podium; each a block with its tread on top, nosed over the riser below.
      kit.add(UNIT_BLOCK, palette.granite, blockMatrix(0, BLOCK_BOTTOM, (row.zIn + row.z) / 2, 2 * row.x, h, row.z - row.zIn), row.k);
      kit.add(UNIT_BLOCK, siteMaterials.stepTread, blockMatrix(0, y, (row.zIn + row.z + NOSING) / 2, 2 * (row.x + NOSING), TREAD, row.z - row.zIn + NOSING), row.k);
      for (const s of [-1, 1]) {
        const cx = (s * (row.xIn + row.x)) / 2;
        const cz = (STEPS_BACK_Z + row.zIn) / 2;
        kit.add(UNIT_BLOCK, palette.granite, blockMatrix(cx, BLOCK_BOTTOM, cz, row.x - row.xIn, h, row.zIn - STEPS_BACK_Z), row.k);
        kit.add(UNIT_BLOCK, siteMaterials.stepTread, blockMatrix(cx + (s * NOSING) / 2, y, cz, row.x - row.xIn + NOSING, TREAD, row.zIn - STEPS_BACK_Z), row.k);
      }
    }
  },
};

/**
 * A handrail along `points` (u, y): u is Z for the middle rails, X for the end rails; posts at the points and about every 2 m between.
 * Each post stands from 0.2 m under the nosing line, inside the step below it, up to the rail.
 */
function rail(kit: Kit, points: readonly (readonly [number, number])[], at: (u: number, y: number) => readonly [number, number, number], order: number): void {
  for (let k = 1; k < points.length; k += 1) {
    const [u0, y0] = points[k - 1] ?? [0, 0];
    const [u1, y1] = points[k] ?? [0, 0];
    kit.add(UNIT_BLOCK, palette.metalDark, beamMatrix(at(u0, y0 - RAIL / 2), at(u1, y1 - RAIL / 2), RAIL, RAIL), order);
    const n = Math.max(1, Math.round(Math.abs(u1 - u0) / 2));
    for (let s = k === 1 ? 0 : 1; s <= n; s += 1) {
      const u = u0 + ((u1 - u0) * s) / n;
      const y = y0 + ((y1 - y0) * s) / n;
      const base = at(u, y - RAIL_HEIGHT - 0.2);
      kit.add(UNIT_BLOCK, palette.metalDark, blockMatrix(base[0], base[1], base[2], POST, RAIL_HEIGHT + 0.2, POST), order);
    }
  }
}

export const railingsStep: StepDef = {
  id: 'steps-railings',
  chapter: 'roche-steps-lehman-1975',
  year: '1970',
  title: 'Fix the handrails',
  detail: 'Dark metal handrails run down the middle of the flight in pairs and down each stepped end.',
  motion: { kind: 'grow' },
  stagger: 'order',
  focus: { kind: 'preset', id: 'ref-front-axis' },
  build(kit) {
    const rows = stepRows();
    const foot = rows[rows.length - 1];
    if (foot === undefined) return;
    // The nosing line: the landing's edge, each step's front edge, and down to the sidewalk 0.4 m past the bottom step.
    const front: (readonly [number, number])[] = [[STEPS_TOP_Z, LANDING_Y + RAIL_HEIGHT], ...rows.map((r): readonly [number, number] => [r.z, r.y + RAIL_HEIGHT])];
    const end: (readonly [number, number])[] = [[LANDING_HALF_WIDTH, LANDING_Y + RAIL_HEIGHT], ...rows.map((r): readonly [number, number] => [r.x, r.y + RAIL_HEIGHT])];
    const simplify = (pts: readonly (readonly [number, number])[]): (readonly [number, number])[] =>
      pts.filter((p, i) => {
        const a = pts[i - 1];
        const b = pts[i + 1];
        if (a === undefined || b === undefined) return true;
        const s1 = (p[1] - a[1]) / (p[0] - a[0]);
        const s2 = (b[1] - p[1]) / (b[0] - p[0]);
        return Math.abs(s1 - s2) > 1e-6;
      });
    for (const s of [-1, 1]) rail(kit, simplify(front), (u, y) => [s * CENTRAL_RAIL_X, y, u], 0);
    for (const s of [-1, 1]) rail(kit, simplify(end), (u, y) => [s * u, y, END_RAIL_Z], 1);
  },
};
