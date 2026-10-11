/**
 * Plan and section of the Robert Lehman Wing (1975), in world metres.
 * Plan: the Met floor map (docs/research/interior.md, "The Robert Lehman Wing court and the Vaux facade"; map features shifted by MAP_Z), checked
 * against the 2018 orthophoto (docs/research/exterior-images.md, primary 9), where the pyramid's apex sits at X −0.4, Z −150.7 and the inner
 * octagon, the glazed gallery ring and the skylight strip along the 1880 front all fall on these lines within about 0.5 m.
 * Section: tagged E (estimates). The eave and apex come from a camera fit to photo P9 (int-lehman-pyramid-up): eave 13–17 m and apex 20–23 m
 * above a camera 1.5 m over the court floor; the gallery ring's sloped glass ceiling from the 2011 gallery photograph (interior-images.md, item 30).
 */
import { GROUND_FLOOR_Y, LEHMAN_PYRAMID_APEX_Y, MAIN_FLOOR_Y } from '../frame.js';
import { LEHMAN_BLOCK, MAP_Z, OUTER_WALL } from './blocks.js';
import { ccw, clipHalfPlane, inset, type P2 } from './poly.js';

/** Court centre: the map's court 963 (0, −147.68) on the world frame. */
export const COURT_X = 0;
export const COURT_Z = -147.685 + MAP_Z;
/** Court octagon: a square turned 45° with clipped corners; flats at ±11.58 from the centre, each 4.30 m long (map gallery 963). */
export const COURT_R = 11.58;
export const COURT_CLIP = 2.15;

/** E: main-floor gallery roofs (the period rooms' flat roof, slab top). */
export const LEHMAN_ROOF_Y = 12.0;
/** E: parapet top of the outer walls. */
export const LEHMAN_PARAPET_Y = 12.8;
/** E: low edge of the glazed ceiling over the gallery ring (galleries 961 and 962), on the outer ring wall. */
export const LEHMAN_BAND_LOW_Y = 11.5;
/** E: top of the inner ring wall, where the pyramid starts (P9 fit). */
export const LEHMAN_EAVE_Y = 14.5;
/** Apex of the pyramid (frame.ts, refined from the P9 fit). */
export const LEHMAN_APEX_Y = LEHMAN_PYRAMID_APEX_Y;
/** Ground-floor slab: top at the court floor, 0.6 m deep; footings 1 m under it. */
export const LEHMAN_SLAB_BOTTOM_Y = GROUND_FLOOR_Y - 0.6;
export const LEHMAN_FOOTING_BOTTOM_Y = LEHMAN_SLAB_BOTTOM_Y - 1.0;
/** Main-floor plate: top at the main floor, 0.6 m deep. */
export const MAIN_SLAB = 0.6;

export const INNER_RING_THICKNESS = 0.7;
export const OUTER_RING_THICKNESS = 0.6;

const c = COURT_CLIP;
const R = COURT_R;
const z0 = COURT_Z;

/** The court octagon, counter-clockwise from the north flat's west end (+X north, +Z east). */
export const COURT_OCTAGON: readonly P2[] = [
  [R, z0 - c],
  [R, z0 + c],
  [c, z0 + R],
  [-c, z0 + R],
  [-R, z0 + c],
  [-R, z0 - c],
  [-c, z0 - R],
  [c, z0 - R],
];

/** The inner ring wall's outer face: the octagon pushed out by the wall. */
export const COURT_OCTAGON_OUT: readonly P2[] = inset(COURT_OCTAGON, COURT_OCTAGON.map(() => -INNER_RING_THICKNESS));

/** The Lehman block as a counter-clockwise outline, and the index of its edge on the 1880 front (no wall there). */
export const LEHMAN_OUTLINE: readonly P2[] = ccw(LEHMAN_BLOCK);
export const FRONT_EDGE = LEHMAN_OUTLINE.findIndex((a, i) => {
  const b = LEHMAN_OUTLINE[(i + 1) % LEHMAN_OUTLINE.length] ?? a;
  return Math.abs(a[1] + 138.3) < 1e-6 && Math.abs(b[1] + 138.3) < 1e-6;
});

/** Inner faces of the outer walls; the edge on the 1880 front stays on its line (floors run up to it). */
export const LEHMAN_INNER: readonly P2[] = inset(
  LEHMAN_OUTLINE,
  LEHMAN_OUTLINE.map((_, i) => (i === FRONT_EDGE ? 0 : OUTER_WALL)),
);

/**
 * The glazed gallery ring's low edge on the outer ring wall (map: the walls between galleries 961/962 and the period rooms, and the corridors at
 * X ±18.6), from its north end round the west to its south end.
 */
const OUTER_DIAGONAL = 170.42 - MAP_Z; // X − Z on the north-west outer ring wall (map (17.6, −152.82) to (3.65, −166.77))
const RING_SIDE_X = 18.62;
const RING_EAST_Z = -144.0 + MAP_Z;
const RING_WEST_Z = -166.77 + MAP_Z;
export const BAND_LOW: readonly P2[] = [
  [RING_SIDE_X, RING_EAST_Z],
  [RING_SIDE_X, RING_SIDE_X - OUTER_DIAGONAL],
  [OUTER_DIAGONAL + RING_WEST_Z, RING_WEST_Z],
  [-(OUTER_DIAGONAL + RING_WEST_Z), RING_WEST_Z],
  [-RING_SIDE_X, RING_SIDE_X - OUTER_DIAGONAL],
  [-RING_SIDE_X, RING_EAST_Z],
];

/** The glazed ring's high edge on the inner ring wall's outer face, matching BAND_LOW point for point. */
export const BAND_HIGH: readonly P2[] = [
  COURT_OCTAGON_OUT[1] ?? [0, 0],
  COURT_OCTAGON_OUT[0] ?? [0, 0],
  COURT_OCTAGON_OUT[7] ?? [0, 0],
  COURT_OCTAGON_OUT[6] ?? [0, 0],
  COURT_OCTAGON_OUT[5] ?? [0, 0],
  COURT_OCTAGON_OUT[4] ?? [0, 0],
];
/** The high edge sits this far under the inner ring wall's top. */
export const BAND_HIGH_Y = LEHMAN_EAVE_Y - 0.2;

/** Skylight strip along the 1880 front (orthophoto: Z −139.5 to the front, X ±15.5), between the link's inner walls. */
export const STRIP_WEST_Z = -139.6;
export const STRIP_HALF_X = 16.3 - OUTER_WALL;

/** The flat roof: inside the outer walls, short of the skylight strip, round the glazed ring and the court. */
export const ROOF_OUTLINE: readonly P2[] = clipHalfPlane(LEHMAN_INNER, (p) => p[1] - STRIP_WEST_Z);
const EAST_CUT = STRIP_WEST_Z - 0.1;
const courtEast = clipHalfPlane(COURT_OCTAGON_OUT, (p) => p[1] - EAST_CUT).filter((p) => p[1] > (BAND_HIGH[0]?.[1] ?? 0) - 1e-6 || Math.abs(p[1] - EAST_CUT) < 1e-6);
export const ROOF_HOLE: readonly P2[] = [...BAND_LOW, ...[...courtEast].sort((p, q) => p[0] - q[0])];

/** One stair flight: foot on the court floor, top at the main floor, along the court's long side. */
export interface Flight {
  readonly foot: P2;
  readonly top: P2;
}
const FLIGHT_START = 1.66;
const FLIGHT_LENGTH = 10.0;
export const FLIGHT_WIDTH = 2.42;
export const FLIGHT_RISERS = 36;
export const FLIGHT_RISER = (MAIN_FLOOR_Y - GROUND_FLOOR_Y) / FLIGHT_RISERS;
export const FLIGHT_TREAD = FLIGHT_LENGTH / FLIGHT_RISERS;

function flight(a: P2, b: P2): Flight {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  // Toward the court centre.
  const nx = -Math.sign(a[0] + b[0]) * Math.SQRT1_2;
  const nz = -Math.sign(a[1] + b[1] - 2 * z0) * Math.SQRT1_2;
  const off = FLIGHT_WIDTH / 2;
  const at = (s: number): P2 => [a[0] + ux * s + nx * off, a[1] + uz * s + nz * off];
  return { foot: at(FLIGHT_START), top: at(FLIGHT_START + FLIGHT_LENGTH) };
}

/** The four flights: from the north and south corners up to the east and west tips (map stairs, Floor G and Floor 1). */
export const FLIGHTS: readonly Flight[] = [
  flight([R, z0 + c], [c, z0 + R]),
  flight([R, z0 - c], [c, z0 - R]),
  flight([-R, z0 + c], [-c, z0 + R]),
  flight([-R, z0 - c], [-c, z0 - R]),
];

/** The main-floor landing at the east tip, relative to the court centre (map corridor at the tip); the west one is it turned 180°. */
export const LANDING: readonly P2[] = [
  [3.32, 10.4],
  [c, R],
  [-c, R],
  [-3.32, 10.4],
  [-1.6, 8.67],
  [1.6, 8.67],
];
