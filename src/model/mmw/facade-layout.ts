/**
 * The bay layout of the McKim, Mead & White fronts: each front is a chain of straight runs of wall face (the Fifth Avenue links and end pavilions, the
 * projections' sides and the 84th and 80th Street ends), wound counter-clockwise seen from above so the parts library's sweeps hang their mouldings outward.
 * Bay counts and widths: dims.ts (BAY, LINK_BAYS, END_BAY, PAVILION_BAYS, END_FACADE_BAYS_*), measured from the photographs named there.
 */
import { BUILDING_MAX_X, BUILDING_MIN_X, HUNT_EXTENSION_FACE_Z, MMW_END_PAVILION_FRONT_Z, MMW_NORTH_END_MIN_X, MMW_NORTH_LINK_MIN_X, MMW_SOUTH_END_MAX_X, MMW_SOUTH_LINK_MAX_X, SACKLER_MAX_Z } from '../frame.js';
import type { V3 } from '../lib/index.js';
import { BAY, END_FACADE_BAYS_NORTH, END_FACADE_BAYS_SOUTH, LINK_BAYS, OUTER_WALL, PAVILION_BAYS, SOUTH_END, SOUTH_LINK } from './dims.js';
import { facadeLine } from './shapes.js';
import type { FacadeLine } from './shapes.js';

/** What one bay of a run carries. */
export type BayKind = 'arch' | 'door' | 'giant' | 'end' | 'pier';

export interface Bay {
  readonly kind: BayKind;
  readonly width: number;
}

export interface Run {
  readonly line: FacadeLine;
  readonly bays: readonly Bay[];
  /** Wall mass beyond the face's ends: +OUTER_WALL fills a concave corner, −OUTER_WALL stops short where the neighbouring run owns a convex corner. */
  readonly extendStart: number;
  readonly extendEnd: number;
  /** The order on its piers: Tuscan strips between arched bays, the giant Corinthian order of a pavilion front, or none. */
  readonly order: 'tuscan' | 'giant' | 'none';
  /** Pilasters on the run's own two ends (a pavilion front's corners). */
  readonly cornerPilasters: boolean;
}

export interface Front {
  readonly name: string;
  readonly runs: readonly Run[];
}

const arches = (count: number, kind: BayKind = 'arch'): Bay[] => Array.from({ length: count }, () => ({ kind, width: BAY }));
/** A link's bays: seven arched bays with the grade-level door in the middle one. */
const linkBays = (count: number): Bay[] => arches(count).map((bay, i) => (i === Math.floor(count / 2) ? { kind: 'door', width: BAY } : bay));
const pierOf = (width: number): Bay => ({ kind: 'pier', width });

function run(line: FacadeLine, bays: readonly Bay[], extendStart: number, extendEnd: number, order: Run['order'], cornerPilasters = false): Run {
  const total = bays.reduce((sum, bay) => sum + bay.width, 0);
  if (Math.abs(total - line.length) > 1e-6) throw new Error(`facade run at (${String(line.x)}, ${String(line.z)}): bays sum to ${total.toFixed(3)} m but the face is ${line.length.toFixed(3)} m; make them equal.`);
  return { line, bays, extendStart, extendEnd, order, cornerPilasters };
}

/** A run of `count` arched bays centred between two equal piers, filling `length`. */
function arched(line: FacadeLine, count: number, bays: Bay[], extendStart: number, extendEnd: number, order: Run['order']): Run {
  const pier = (line.length - count * BAY) / 2;
  return run(line, [pierOf(pier), ...bays, pierOf(pier)], extendStart, extendEnd, order);
}

/** A pavilion front: two end bays with tall niches round `count` bays of the giant order. */
function pavilion(line: FacadeLine, count: number): Run {
  const end = (line.length - count * BAY) / 2;
  return run(line, [{ kind: 'end', width: end }, ...arches(count, 'giant'), { kind: 'end', width: end }], 0, 0, 'giant', true);
}

const W = OUTER_WALL;
const FRONT_Z = MMW_END_PAVILION_FRONT_Z;

/** North front, counter-clockwise: link (Z −2.0), the projection's south side (X 88.6), the pavilion front (Z 9.85), the 84th Street end (X 153.13). */
export const NORTH_FRONT: Front = {
  name: 'north',
  runs: [
    arched(facadeLine(MMW_NORTH_LINK_MIN_X, HUNT_EXTENSION_FACE_Z, MMW_NORTH_END_MIN_X - MMW_NORTH_LINK_MIN_X, '+z'), LINK_BAYS, linkBays(LINK_BAYS), 0, 0, 'tuscan'),
    arched(facadeLine(MMW_NORTH_END_MIN_X, HUNT_EXTENSION_FACE_Z, FRONT_Z - HUNT_EXTENSION_FACE_Z, '-x'), 1, arches(1), W, -W, 'none'),
    pavilion(facadeLine(MMW_NORTH_END_MIN_X, FRONT_Z, BUILDING_MAX_X - MMW_NORTH_END_MIN_X, '+z'), PAVILION_BAYS),
    arched(facadeLine(BUILDING_MAX_X, FRONT_Z, FRONT_Z - SACKLER_MAX_Z, '+x'), END_FACADE_BAYS_NORTH, arches(END_FACADE_BAYS_NORTH), -W, 0, 'tuscan'),
  ],
};

/** South front, counter-clockwise: the 80th Street end (X −151.61), the pavilion front (Z 9.85), the projection's north side (X −88.1), the link (Z −1.9). */
export const SOUTH_FRONT: Front = {
  name: 'south',
  runs: [
    arched(facadeLine(BUILDING_MIN_X, SOUTH_END.z0, FRONT_Z - SOUTH_END.z0, '-x'), END_FACADE_BAYS_SOUTH, arches(END_FACADE_BAYS_SOUTH), 0, -W, 'tuscan'),
    pavilion(facadeLine(BUILDING_MIN_X, FRONT_Z, MMW_SOUTH_END_MAX_X - BUILDING_MIN_X, '+z'), PAVILION_BAYS),
    arched(facadeLine(MMW_SOUTH_END_MAX_X, FRONT_Z, FRONT_Z - SOUTH_LINK.z1, '+x'), 1, arches(1), -W, W, 'none'),
    arched(facadeLine(MMW_SOUTH_END_MAX_X, SOUTH_LINK.z1, MMW_SOUTH_LINK_MAX_X - MMW_SOUTH_END_MAX_X, '+z'), LINK_BAYS, linkBays(LINK_BAYS), 0, 0, 'tuscan'),
  ],
};

export const FRONTS: readonly Front[] = [NORTH_FRONT, SOUTH_FRONT];

/** The front's face line as a moulding path at height `y`: the start of each run, then the end of the last. */
export function frontPath(front: Front, y: number): V3[] {
  const points: V3[] = front.runs.map((r) => [r.line.x, y, r.line.z]);
  const last = front.runs.at(-1);
  if (last !== undefined) points.push([last.line.x + last.line.dir[0] * last.line.length, y, last.line.z + last.line.dir[1] * last.line.length]);
  return points;
}

/** Each bay with its run, its start and centre along the run, and its index along the whole front (for build order). */
export interface PlacedBay {
  readonly run: Run;
  readonly bay: Bay;
  readonly start: number;
  readonly centre: number;
  readonly index: number;
}

export function placedBays(front: Front): PlacedBay[] {
  const out: PlacedBay[] = [];
  let index = 0;
  for (const r of front.runs) {
    let start = 0;
    for (const bay of r.bays) {
      out.push({ run: r, bay, start, centre: start + bay.width / 2, index });
      start += bay.width;
      index += 1;
    }
  }
  return out;
}

/** Pilaster positions along a run: every boundary between two window bays, every boundary between a pier and a window bay, and the corners of a pavilion front. */
export function pilasterStations(r: Run, halfWidth: number): number[] {
  if (r.order === 'none') return [];
  const stations: number[] = [];
  let at = 0;
  r.bays.forEach((bay, i) => {
    const next = r.bays[i + 1];
    at += bay.width;
    if (next === undefined) return;
    const windows = (b: Bay): boolean => b.kind === 'arch' || b.kind === 'door' || b.kind === 'giant';
    if (windows(bay) || windows(next)) stations.push(at);
  });
  return r.cornerPilasters ? [halfWidth, ...stations, r.line.length - halfWidth] : stations;
}
