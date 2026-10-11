/**
 * Hunt facade, the order: four granite-capped pedestals, one under each column pair, then the eight colossal Corinthian columns with the fluted pilasters behind them.
 * Evidence: S7 (Schneider 2019) at 1:1 for the pair spacing (0.225 bay), the pedestals (die 0.375 bay, 1.65 m tall) and the column (1.5 m, 12.75 m);
 * S9 (Epicgenius 2023 #30) for the pilasters behind the columns and their capitals.
 */
import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { columnParts, moulding, pilasterParts } from '../lib/index.js';
import { HUNT_COLUMN_DIAMETER_LOWER, HUNT_COLUMN_DIAMETER_UPPER, HUNT_COLUMN_HEIGHT } from '../frame.js';
import {
  COLUMN_X,
  COLUMN_Z,
  LANDING,
  PAIR_X,
  PEDESTAL_BASE_FRONT_Z,
  PEDESTAL_BASE_W,
  PEDESTAL_DIE_FRONT_Z,
  PEDESTAL_DIE_W,
  PEDESTAL_TOP_Y,
  PILASTER_P,
  PILASTER_W,
  WALL_Z,
} from './dims.js';
import { at, box } from './shapes.js';

const BASE_TOP = LANDING + 0.32;
const CAP_BOTTOM = PEDESTAL_TOP_Y - 0.24;

/** The pedestal's cap moulding, swept round its front and sides (a U in its own frame, origin at the pedestal's back centre). */
function capMoulding(): ReturnType<typeof moulding> {
  const hw = PEDESTAL_DIE_W / 2;
  return moulding({
    profile: 'string-course',
    path: [
      [-hw, 0, WALL_Z],
      [-hw, 0, PEDESTAL_DIE_FRONT_Z],
      [hw, 0, PEDESTAL_DIE_FRONT_Z],
      [hw, 0, WALL_Z],
    ],
    height: PEDESTAL_TOP_Y - CAP_BOTTOM,
    projection: 0.12,
  });
}

export const orderSteps: readonly StepDef[] = [
  {
    id: 'hunt-pedestals',
    chapter: 'hunt-1902',
    year: '1899',
    title: 'Set the four column pedestals',
    detail: 'A pedestal for each pair of columns stands on the landing: a base course, a plain die and a moulded cap, with a small die between the bases for the niche sculpture.',
    motion: { kind: 'rise' },
    stagger: 'x',
    build(kit) {
      const cap = capMoulding();
      PAIR_X.forEach((x) => {
        box(kit, palette.granite, [x - PEDESTAL_BASE_W / 2, LANDING, WALL_Z], [x + PEDESTAL_BASE_W / 2, BASE_TOP, PEDESTAL_BASE_FRONT_Z]);
        box(kit, palette.limestone, [x - PEDESTAL_DIE_W / 2, BASE_TOP, WALL_Z], [x + PEDESTAL_DIE_W / 2, CAP_BOTTOM, PEDESTAL_DIE_FRONT_Z]);
        kit.add(cap, palette.limestone, at(x, CAP_BOTTOM, 0));
        box(kit, palette.limestone, [x - PEDESTAL_DIE_W / 2, CAP_BOTTOM, WALL_Z], [x + PEDESTAL_DIE_W / 2, PEDESTAL_TOP_Y, PEDESTAL_DIE_FRONT_Z]);
        // The little die between the column bases, in front of the niche (S7: 1.25 m wide, 1.15 m tall).
        box(kit, palette.limestone, [x - 0.62, PEDESTAL_TOP_Y, WALL_Z], [x + 0.62, PEDESTAL_TOP_Y + 1.15, WALL_Z + 1.15]);
      });
    },
  },
  {
    id: 'hunt-columns',
    chapter: 'hunt-1902',
    year: '1900',
    title: 'Raise the eight Corinthian columns',
    detail: 'Eight fluted Corinthian columns, 12.75 m tall, rise in four coupled pairs, each with a fluted pilaster on the wall behind it.',
    motion: { kind: 'rise' },
    stagger: 'x',
    weight: 1.3,
    build(kit) {
      const column = columnParts({
        diameter: HUNT_COLUMN_DIAMETER_LOWER,
        height: HUNT_COLUMN_HEIGHT,
        taper: HUNT_COLUMN_DIAMETER_UPPER / HUNT_COLUMN_DIAMETER_LOWER,
        detail: 'medium',
      });
      const pilaster = pilasterParts({ width: PILASTER_W, height: HUNT_COLUMN_HEIGHT, projection: PILASTER_P, detail: 'medium' });
      COLUMN_X.forEach((x, i) => {
        const order = i;
        const m = at(x, PEDESTAL_TOP_Y, COLUMN_Z);
        if (column.base !== undefined) kit.add(column.base, palette.limestone, m, order);
        kit.add(column.shaft, palette.limestone, m, order);
        kit.add(column.capital, palette.limestone, m, order);
        const p = at(x, PEDESTAL_TOP_Y, WALL_Z);
        if (pilaster.base !== undefined) kit.add(pilaster.base, palette.limestone, p, order);
        kit.add(pilaster.shaft, palette.limestone, p, order);
        kit.add(pilaster.capital, palette.limestone, p, order);
      });
    },
  },
];
