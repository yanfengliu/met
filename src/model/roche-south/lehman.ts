/**
 * The Robert Lehman Wing (Kevin Roche John Dinkeloo and Associates, 1975), chapter `roche-steps-lehman-1975`: the structure, walls and court.
 * Its glass (the gallery ring's sloped ceiling, the skylight along the 1880 front and the pyramid) is in lehman-glass.ts and comes last.
 * Sources: docs/research/history.md section 6 (steps), interior.md (the court, the two ring walls, the four flights), exterior.md [K2] (plan);
 * plan and section numbers are in lehman-plan.ts. The 1880 west front on Z −138.3 is the core area's: nothing here stands on that line.
 */
import { Matrix4 } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y } from '../frame.js';
import { stairFlight, wall } from '../lib/index.js';
import { palette } from '../palette.js';
import { MAP_Z, OUTER_WALL } from './blocks.js';
import {
  BAND_HIGH,
  BAND_HIGH_Y,
  BAND_LOW,
  COURT_CLIP,
  COURT_OCTAGON,
  COURT_R,
  COURT_X,
  COURT_Z,
  FLIGHT_RISER,
  FLIGHT_RISERS,
  FLIGHT_TREAD,
  FLIGHT_WIDTH,
  FLIGHTS,
  FRONT_EDGE,
  INNER_RING_THICKNESS,
  LANDING,
  LEHMAN_BAND_LOW_Y,
  LEHMAN_EAVE_Y,
  LEHMAN_FOOTING_BOTTOM_Y,
  LEHMAN_INNER,
  LEHMAN_OUTLINE,
  LEHMAN_PARAPET_Y,
  LEHMAN_ROOF_Y,
  LEHMAN_SLAB_BOTTOM_Y,
  MAIN_SLAB,
  OUTER_RING_THICKNESS,
  ROOF_OUTLINE,
  STRIP_FLAT,
  STRIP_HEAD_Y,
} from './lehman-plan.js';
import { mat } from './materials.js';
import { inwardNormal, type P2 } from './poly.js';
import { annulus, at, bar, cylinder, libraryWallOn, prism, UNIT_BOX, wallAlong, wedgeWall, type V3 } from './shapes.js';

const CHAPTER = 'roche-steps-lehman-1975' as const;
const YEAR = '1975';
const G = GROUND_FLOOR_Y;
const M = MAIN_FLOOR_Y;

interface Segment {
  readonly a: P2;
  readonly b: P2;
  readonly extendStart: number;
  readonly extendEnd: number;
  /** A wall at the 1880 front: its end is mitred on the front line, so it is a prism rather than a box. */
  readonly mitred: boolean;
}

/** Lengthening that closes the inside of a reflex corner of a counter-clockwise outline (0 at a convex one). */
function reflexExtension(prev: P2, v: P2, next: P2, thickness: number): number {
  const d0x = v[0] - prev[0];
  const d0z = v[1] - prev[1];
  const d1x = next[0] - v[0];
  const d1z = next[1] - v[1];
  const cross = d0x * d1z - d0z * d1x;
  if (cross >= 0) return 0;
  const turn = Math.acos((d0x * d1x + d0z * d1z) / (Math.hypot(d0x, d0z) * Math.hypot(d1x, d1z)));
  return thickness * Math.tan(turn / 2);
}

/** The outer walls: every edge of the block but the one on the 1880 front, in order round the wing from its north end. */
function outerSegments(): Segment[] {
  const n = LEHMAN_OUTLINE.length;
  const out: Segment[] = [];
  for (let k = 1; k < n; k++) {
    const i = (FRONT_EDGE + k) % n;
    const prev = LEHMAN_OUTLINE[(i - 1 + n) % n] ?? [0, 0];
    const a = LEHMAN_OUTLINE[i] ?? [0, 0];
    const b = LEHMAN_OUTLINE[(i + 1) % n] ?? [0, 0];
    const next = LEHMAN_OUTLINE[(i + 2) % n] ?? [0, 0];
    const mitred = k === 1 || k === n - 1;
    out.push({ a, b, mitred, extendStart: mitred ? 0 : reflexExtension(prev, a, b, OUTER_WALL), extendEnd: mitred ? 0 : reflexExtension(a, b, next, OUTER_WALL) });
  }
  return out;
}

const SEGMENTS = outerSegments();
const FOOTING_WIDTH = 2.0;

/** The prism under a front-end wall: the strip between the outline edge and its inset, mitred on the 1880 front. */
function mitredWall(seg: Segment, y0: number, y1: number): ReturnType<typeof prism> {
  const n = LEHMAN_OUTLINE.length;
  const i = LEHMAN_OUTLINE.indexOf(seg.a);
  const a2 = LEHMAN_INNER[i] ?? seg.a;
  const b2 = LEHMAN_INNER[(i + 1) % n] ?? seg.b;
  return prism([seg.a, seg.b, b2, a2], [], y0, y1);
}

function foundations(kit: Kit): void {
  SEGMENTS.forEach((seg, k) => {
    // A footing under each outer wall, spread inward only: nothing of the wing crosses the block line.
    if (seg.mitred) kit.add(mitredWall(seg, LEHMAN_FOOTING_BOTTOM_Y, LEHMAN_SLAB_BOTTOM_Y), mat.concrete, at(0, 0, 0), k);
    else kit.add(UNIT_BOX, mat.concrete, wallAlong(seg.a, seg.b, LEHMAN_FOOTING_BOTTOM_Y, LEHMAN_SLAB_BOTTOM_Y, FOOTING_WIDTH, seg.extendStart * (FOOTING_WIDTH / OUTER_WALL), seg.extendEnd * (FOOTING_WIDTH / OUTER_WALL)), k);
  });
  // The ground-floor plate: the court and the exhibition galleries round it, up to the 1880 front.
  kit.add(prism(LEHMAN_INNER, [], LEHMAN_SLAB_BOTTOM_Y, G), palette.stoneFloor, at(0, 0, 0), SEGMENTS.length);
}

function walls(kit: Kit): void {
  SEGMENTS.forEach((seg, k) => {
    if (seg.mitred) {
      kit.add(mitredWall(seg, LEHMAN_SLAB_BOTTOM_Y, LEHMAN_PARAPET_Y + 0.3), palette.limestone, at(0, 0, 0), k);
      return;
    }
    kit.add(UNIT_BOX, palette.limestone, wallAlong(seg.a, seg.b, LEHMAN_SLAB_BOTTOM_Y, LEHMAN_PARAPET_Y, OUTER_WALL, seg.extendStart, seg.extendEnd), k);
    // Coping: 0.3 m deep, 0.15 m proud of the face (a moulding may overstep the outline, docs/design/spec.md, World frame).
    const [nx, nz] = inwardNormal(seg.a, seg.b);
    const a: P2 = [seg.a[0] - nx * 0.15, seg.a[1] - nz * 0.15];
    const b: P2 = [seg.b[0] - nx * 0.15, seg.b[1] - nz * 0.15];
    kit.add(UNIT_BOX, palette.limestone, wallAlong(a, b, LEHMAN_PARAPET_Y, LEHMAN_PARAPET_Y + 0.3, OUTER_WALL + 0.25, seg.extendStart + 0.15, seg.extendEnd + 0.15), k);
  });
}

/** The landing at the east tip; the west one is the same shape turned 180° about the court centre. */
const LANDING_GEOMETRY = prism(LANDING, [], M - MAIN_SLAB, M);

function mainFloor(kit: Kit): void {
  kit.add(prism(LEHMAN_INNER, [COURT_OCTAGON], M - MAIN_SLAB, M), palette.stoneFloor, at(0, 0, 0), 0);
  kit.add(LANDING_GEOMETRY, palette.stoneFloor, at(COURT_X, 0, COURT_Z), 1);
  kit.add(LANDING_GEOMETRY, palette.stoneFloor, at(COURT_X, 0, COURT_Z).multiply(rotY(Math.PI)), 1);
}

function rotY(angle: number): Matrix4 {
  return new Matrix4().makeRotationY(angle);
}

const BASIN = annulus(1.62, 1.32, G, G + 0.45, 32);
const WATER = cylinder(1.32, G, G + 0.36, 32);
const BOWL = cylinder(0.45, G, G + 0.95, 16);

function courtFloor(kit: Kit): void {
  kit.add(prism(COURT_OCTAGON, [], G, G + 0.04), palette.marbleFloor, at(0, 0, 0), 0);
  // The round fountain at the centre (map water feature: radius 1.6 m).
  kit.add(BASIN, palette.granite, at(COURT_X, 0.04, COURT_Z), 1);
  kit.add(WATER, palette.water, at(COURT_X, 0.04, COURT_Z), 1);
  kit.add(BOWL, palette.granite, at(COURT_X, 0.04, COURT_Z), 2);
}

const FLIGHT = stairFlight({ width: FLIGHT_WIDTH, steps: FLIGHT_RISERS, riser: FLIGHT_RISER, tread: FLIGHT_TREAD, nosing: 0.02 });

function courtStairs(kit: Kit): void {
  FLIGHTS.forEach((f, k) => {
    const dx = f.top[0] - f.foot[0];
    const dz = f.top[1] - f.foot[1];
    const length = Math.hypot(dx, dz);
    // The flight climbs toward its local −Z: turn local −Z onto foot→top.
    const angle = Math.atan2(-dx / length, -dz / length);
    kit.add(FLIGHT.steps, palette.limestone, at(f.foot[0], G, f.foot[1]).multiply(rotY(angle)), k);
    // A limestone parapet and a bronze rail on the court side of the flight (the 2011 gallery photograph shows the rail).
    const [nx, nz] = [Math.sign(COURT_X - f.foot[0]) * Math.SQRT1_2, Math.sign(COURT_Z - f.foot[1]) * Math.SQRT1_2];
    const side = FLIGHT_WIDTH / 2 + 0.1;
    const cos = FLIGHT_TREAD / Math.hypot(FLIGHT_TREAD, FLIGHT_RISER);
    // Lines parallel to the nosing line, which runs from the first riser's top at the foot to the main floor at the top.
    const line = (dy: number): [V3, V3] => [
      [f.foot[0] + nx * side, G + FLIGHT_RISER + dy, f.foot[1] + nz * side],
      [f.top[0] + nx * side, M + dy, f.top[1] + nz * side],
    ];
    // The parapet runs from 0.8 m under the nosing line to 1.0 m over it, measured upright; the rail sits on it.
    const [p0, p1] = line(0.1);
    kit.add(UNIT_BOX, palette.limestone, bar(p0, p1, 0.2, 1.8 * cos), k);
    const [r0, r1] = line(1.04);
    kit.add(UNIT_BOX, palette.bronze, bar(r0, r1, 0.07, 0.07), k);
  });
}

// --- Ring walls -----------------------------------------------------------------------------------------------------------------------

const RING_H = LEHMAN_EAVE_Y - G;
const MAIN_UP = M - G;
const CORNER = Math.tan(Math.PI / 8);
/**
 * Inner ring, long sides: three tall openings over a 1 m sill at the main floor, looking down on the flights. Over them a solid band 5 m deep
 * carries the pyramid (photo P9, seen from the court floor, shows unbroken walls for that depth under its eave); on the east sides, where the
 * galleries have a flat roof, the openings stop just under that roof.
 */
const SILL = MAIN_UP + 1;
const UNDER_GLASS = LEHMAN_EAVE_Y - 5.0 - G - SILL;
const UNDER_ROOF = LEHMAN_ROOF_Y - MAIN_SLAB - 0.3 - G - SILL;
const longSide = (height: number): ReturnType<typeof wall> =>
  wall({
    width: (COURT_R - COURT_CLIP) * Math.SQRT2 + 2 * INNER_RING_THICKNESS * CORNER,
    height: RING_H,
    thickness: INNER_RING_THICKNESS,
    openings: [-4.3, 0, 4.3].map((x) => ({ x, y: SILL, width: 2.6, height })),
  });
const INNER_LONG_WEST = longSide(UNDER_GLASS);
const INNER_LONG_EAST = longSide(UNDER_ROOF);
const FLAT_WIDTH = 4.3 + 2 * INNER_RING_THICKNESS * CORNER;
/** Inner ring, north and south flats: a door onto the court floor and an opening above the main floor. */
const INNER_SIDE_FLAT = wall({ width: FLAT_WIDTH, height: RING_H, thickness: INNER_RING_THICKNESS, openings: [{ y: 0, width: 2.4, height: 3.2 }, { y: SILL, width: 2.6, height: UNDER_GLASS }] });
/** Inner ring, west flat: the west landing's door into the gallery ring. */
const INNER_WEST_FLAT = wall({ width: FLAT_WIDTH, height: RING_H, thickness: INNER_RING_THICKNESS, openings: [{ y: MAIN_UP, width: 2.6, height: 4.2 }] });

const OUTER_H = LEHMAN_BAND_LOW_Y - G;
const OUTER_DOOR = { width: 2.2, height: 3.4 };
/** Outer ring: the walls between the gallery ring and the period rooms, a door at each floor (map doors). */
function outerRingWall(length: number, xs: readonly number[], centreWidth?: number): ReturnType<typeof wall> {
  const openings = xs.flatMap((x) => [
    { x, y: 0, ...OUTER_DOOR },
    { x, y: MAIN_UP, ...OUTER_DOOR, width: centreWidth !== undefined && x === 0 ? centreWidth : OUTER_DOOR.width },
  ]);
  return wall({ width: length, height: OUTER_H, thickness: OUTER_RING_THICKNESS, openings });
}

function ringWalls(kit: Kit): void {
  const n = COURT_OCTAGON.length;
  for (let i = 0; i < n; i++) {
    const a = COURT_OCTAGON[i] ?? [0, 0];
    const b = COURT_OCTAGON[(i + 1) % n] ?? [0, 0];
    const long = i % 2 === 1;
    const eastFlat = Math.abs(a[1] - b[1]) < 1e-6 && a[1] > COURT_Z;
    const westFlat = Math.abs(a[1] - b[1]) < 1e-6 && a[1] < COURT_Z;
    if (eastFlat) {
      // The east flat opens the court to the 1880 front: a wall under the landing and a lintel at the roof.
      kit.add(UNIT_BOX, palette.limestone, wallAlong(b, a, G, M - MAIN_SLAB, INNER_RING_THICKNESS), 0);
      kit.add(UNIT_BOX, palette.limestone, wallAlong(b, a, LEHMAN_ROOF_Y, LEHMAN_EAVE_Y, INNER_RING_THICKNESS), 0);
      continue;
    }
    const geometry = long ? (a[1] + b[1] > 2 * COURT_Z ? INNER_LONG_EAST : INNER_LONG_WEST) : westFlat ? INNER_WEST_FLAT : INNER_SIDE_FLAT;
    kit.add(geometry, palette.limestone, libraryWallOn(a, b, G), 0);
  }
  // The outer ring, centred on the map's lines; its corners are mitred by lengthening each wall a little.
  const low = BAND_LOW;
  const ext = (OUTER_RING_THICKNESS / 2) * CORNER;
  const p = (i: number): P2 => low[i] ?? [0, 0];
  const side = Math.abs(p(1)[1] - p(0)[1]);
  const diagonal = Math.hypot(p(2)[0] - p(1)[0], p(2)[1] - p(1)[1]);
  const westFlat = Math.abs(p(3)[0] - p(2)[0]);
  const SIDE = outerRingWall(side + ext, [0]);
  const DIAGONAL = outerRingWall(diagonal + 2 * ext, [-5.3, 5.3]);
  const WEST = outerRingWall(westFlat + 2 * ext, [0], 3.2);
  // Each piece runs a→b with its front toward the court; `shift` slides it along a→b, because the side pieces are lengthened at their west corner only.
  const pieces: [P2, P2, ReturnType<typeof wall>, number][] = [
    [p(1), p(0), SIDE, -ext / 2],
    [p(2), p(1), DIAGONAL, 0],
    [p(3), p(2), WEST, 0],
    [p(4), p(3), DIAGONAL, 0],
    [p(5), p(4), SIDE, ext / 2],
  ];
  for (const [a, b, geometry, shift] of pieces) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const moved = (q: P2): P2 => [q[0] + ((b[0] - a[0]) / l) * shift, q[1] + ((b[1] - a[1]) / l) * shift];
    kit.add(geometry, palette.limestone, libraryWallOn(moved(a), moved(b), G, OUTER_RING_THICKNESS / 2), 1);
  }
}

// --- Period rooms ---------------------------------------------------------------------------------------------------------------------

/** Walls between the period rooms (map galleries 950 to 960), from the outer ring wall to the outer wall, each with a door. */
const ROOM_WALLS: readonly [P2, P2][] = (
  [
    [[17.6, -152.82], [22.68, -157.9]],
    [[12.53, -157.9], [17.61, -162.98]],
    [[8.66, -161.74], [13.74, -166.82]],
    [[3.65, -166.77], [8.73, -171.85]],
    [[-3.64, -166.77], [-8.71, -171.85]],
    [[-7.73, -162.69], [-12.8, -167.77]],
    [[-12.12, -158.28], [-17.19, -163.37]],
    [[-16.73, -153.69], [-21.8, -158.77]],
    [[18.63, -150.44], [27.87, -150.45]],
    [[-18.62, -151.8], [-27.86, -151.79]],
  ] as const
).map(([a, b]) => [[a[0], a[1] + MAP_Z], [b[0], b[1] + MAP_Z]] as [P2, P2]);

function galleries(kit: Kit): void {
  const height = LEHMAN_ROOF_Y - MAIN_SLAB - M;
  ROOM_WALLS.forEach(([a, b], k) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const geometry = wall({ width: Number(length.toFixed(2)), height, thickness: 0.4, openings: [{ width: 1.8, height: 3.3 }] });
    kit.add(geometry, palette.plaster, libraryWallOn(a, b, M, 0.2), k);
  });
}

// --- Roof -------------------------------------------------------------------------------------------------------------------------------

function roof(kit: Kit): void {
  kit.add(prism(ROOF_OUTLINE, [], LEHMAN_ROOF_Y - 0.6, LEHMAN_ROOF_Y), mat.roof, at(0, 0, 0), 0);
  // The lead flat at the skylight strip's head over the court's east tip, between the inner ring wall and the 1880 front.
  kit.add(prism(STRIP_FLAT, [], STRIP_HEAD_Y, STRIP_HEAD_Y + 0.06), mat.roof, at(0, 0, 0), 0);
  // Gables under the two east ends of the gallery ring's sloped glass, standing on the flat roof.
  const north: [P2, P2] = [BAND_HIGH[0] ?? [0, 0], BAND_LOW[0] ?? [0, 0]];
  const south: [P2, P2] = [BAND_LOW[5] ?? [0, 0], BAND_HIGH[5] ?? [0, 0]];
  kit.add(wedgeWall(north[0], north[1], LEHMAN_ROOF_Y - 0.6, BAND_HIGH_Y, LEHMAN_BAND_LOW_Y, 0.4), palette.limestone, at(0, 0, 0), 1);
  kit.add(wedgeWall(south[0], south[1], LEHMAN_ROOF_Y - 0.6, LEHMAN_BAND_LOW_Y, BAND_HIGH_Y, 0.4), palette.limestone, at(0, 0, 0), 1);
}

const FOCUS_WING = { kind: 'box', min: [-30, -4, -181], max: [30, 22, -137] } as const;
const FOCUS_COURT = { kind: 'view', position: [24, 24, -170], target: [0, 0, -151] } as const;

export const lehmanStructureSteps: readonly StepDef[] = [
  { id: 'lehman-foundations', chapter: CHAPTER, year: YEAR, title: 'Lehman Wing foundations', detail: 'Footings and the ground-floor plate on the axis, against the 1880 west front of Vaux and Mould, which forms the wing’s east wall.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_WING, build: foundations },
  { id: 'lehman-walls', chapter: CHAPTER, year: YEAR, title: 'Limestone walls with the cut corners', detail: 'A square pavilion 58 m across whose two western corners are cut at 45°, leaving an 11 m face to the park.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: walls },
  { id: 'lehman-main-floor', chapter: CHAPTER, year: YEAR, title: 'Main floor round the open court', detail: 'The main-floor plate rings a court turned 45° to the old front and sunk to the ground floor.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_COURT, build: mainFloor },
  { id: 'lehman-court-floor', chapter: CHAPTER, year: YEAR, title: 'Ground-floor court and fountain', detail: 'The court floor, an octagon 23 m across its points, with a round fountain at its centre.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_COURT, build: courtFloor },
  { id: 'lehman-court-stairs', chapter: CHAPTER, year: YEAR, title: 'Four flights down into the court', detail: 'One flight on each long side of the court, from the main-floor landings at its east and west tips down to the court floor.', motion: { kind: 'rise' }, stagger: 'order', focus: FOCUS_COURT, build: courtStairs },
  { id: 'lehman-ring-walls', chapter: CHAPTER, year: YEAR, title: 'Two concentric ring walls', detail: 'Two walls with large openings separate the court from the galleries; through them the court looks east to the old brick front.', motion: { kind: 'grow' }, stagger: 'radial', focus: FOCUS_COURT, build: ringWalls },
  { id: 'lehman-galleries', chapter: CHAPTER, year: YEAR, title: 'Galleries and period rooms', detail: 'Walls of the rooms round the court that house the Robert Lehman Collection, among them rooms from the Lehman house.', motion: { kind: 'grow' }, stagger: 'order', focus: FOCUS_WING, build: galleries },
  { id: 'lehman-roof', chapter: CHAPTER, year: YEAR, title: 'Flat roofs over the outer rooms', detail: 'Flat roofs over the period rooms and the link to the old building, left open over the court and its gallery ring.', motion: { kind: 'drop' }, stagger: 'order', focus: FOCUS_WING, build: roof },
];
