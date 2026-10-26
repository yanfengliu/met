/**
 * Collection steps of five more spaces (docs/research/collection.md, Placements): the Petrie Court, the Lehman Wing's rooms, the Great Hall's balcony,
 * European Paintings 600 to 602 and the Greek gallery 153. Positions are world metres from the model's own sources, as in spaces-a.ts, and
 * src/model/collection/placement.test.ts checks every one of them the same way.
 */
import { B_SOUTH_X, GALLERY_CEILING_Y, PARTITION } from '../core/constants.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../frame.js';
import { HALL_WEST_Z, HALL_X, WALL_BACK_Z } from '../hunt/dims.js';
import { MAP_WALLS } from '../mmw/plan-data.js';
import { PARTITION as MMW_PARTITION } from '../mmw/structure.js';
import { COURT_X0 } from '../roche-south/kravis.js';
import { ROOM_WALL, ROOM_WALLS } from '../roche-south/lehman.js';
import { collectionStep } from './place.js';
import type { CollectionStepDef, Placement } from './place.js';

const FACE = { north: Math.PI / 2, south: -Math.PI / 2, east: 0, west: Math.PI } as const;

// --- The Petrie European Sculpture Court (gallery 548; roche-south/kravis.ts, core/weston-facade.ts) -------------------------------------------
// A row down the court's middle, between its limestone south wall (X −61.45) and Weston's 1888 front (X −49.7), facing east along it, with no
// artwork from Z −109 to −98, where the Weston door's passage (Z −104.95..−102.35) opens into the court; the relief on the south wall between two of
// its openings (Z −117.7..−110.3), and the bust in a vitrine before the wall between the next two (Z −95.7..−88.3).
const PETRIE_X = (COURT_X0 + B_SOUTH_X) / 2;
const PETRIE: readonly Placement[] = [
  { id: 204758, x: PETRIE_X, z: -131.5, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 204619, x: PETRIE_X, z: -125.0, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 204812, x: PETRIE_X, z: -118.5, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 211505, x: PETRIE_X, z: -112.5, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 208619, x: PETRIE_X, z: -94.5, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 204620, x: PETRIE_X, z: -88.5, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 204804, x: PETRIE_X, z: -82.0, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 192714, x: PETRIE_X, z: -76.0, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 231004, x: COURT_X0, z: -114.0, floor: MAIN_FLOOR_Y, facing: FACE.north },
  { id: 824469, x: COURT_X0 + 0.9, z: -92.0, floor: MAIN_FLOOR_Y, facing: FACE.north },
];

export const petrieSpace: CollectionStepDef = {
  id: 'collection-petrie-court',
  chapter: 'roche-south-1990',
  year: '1990',
  title: 'Set Canova’s Perseus and the court’s marbles',
  detail: 'Canova’s Perseus and Paris, Carpeaux’s Ugolino, the Autumn vases from the gardens of the Château de Bercy and Houdon’s Bather line the court before the 1888 front.',
  focus: { kind: 'preset', id: 'int-petrie-court' },
  space: 'petrie-court',
  placements: PETRIE,
};
export const petrieCollectionStep = collectionStep(petrieSpace);

// --- The Robert Lehman Wing (galleries 952 to 958; roche-south/lehman.ts) ----------------------------------------------------------------------
// Each painting in its own room, on one of the two walls between that room and the next (ROOM_WALLS), on the room's side, either side of the door in
// the middle; `inner` is the stretch nearer the gallery ring, else the one nearer the outer wall.

/** A point on the face of room wall `k` toward the room that lies on the side of `toward`: `inner` picks the stretch before the door. */
function onRoomWall(id: number, k: number, toward: number, inner: boolean): Placement {
  const [a, b] = ROOM_WALLS[k] ?? [
    [0, 0],
    [0, 0],
  ];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / length, (b[1] - a[1]) / length] as const;
  const [c, d] = ROOM_WALLS[toward] ?? [a, b];
  const other = [(c[0] + d[0]) / 2 - (a[0] + b[0]) / 2, (c[1] + d[1]) / 2 - (a[1] + b[1]) / 2] as const;
  const sign = Math.sign(-u[1] * other[0] + u[0] * other[1]) || 1;
  const n = [-u[1] * sign, u[0] * sign] as const;
  const door = ROOM_WALL.door / 2;
  const s = inner ? (0.5 + length / 2 - door - 0.1) / 2 : (length / 2 + door + 0.1 + length - 0.8) / 2;
  const half = ROOM_WALL.thickness / 2;
  return { id, x: a[0] + u[0] * s + n[0] * half, z: a[1] + u[1] * s + n[1] * half, floor: MAIN_FLOOR_Y, facing: Math.atan2(n[0], n[1]) };
}

const LEHMAN: readonly Placement[] = [
  // 958, between walls 6 and 7: Rembrandt, Goya and the two El Grecos.
  onRoomWall(459082, 6, 7, true),
  onRoomWall(459090, 7, 6, true),
  onRoomWall(459087, 6, 7, false),
  onRoomWall(459088, 7, 6, false),
  // 957, between walls 5 and 6: Corot and Ingres.
  onRoomWall(459093, 5, 6, true),
  onRoomWall(459106, 6, 5, true),
  // 953, between walls 1 and 2: Petrus Christus, Memling and Holbein.
  onRoomWall(459052, 1, 2, true),
  onRoomWall(459055, 2, 1, true),
  onRoomWall(459080, 2, 1, false),
  // 952, between walls 0 and 1: Daddi and Botticelli.
  onRoomWall(458998, 0, 1, true),
  onRoomWall(459016, 1, 0, false),
  // 956, between walls 4 and 5: Giovanni di Paolo.
  onRoomWall(458978, 5, 4, true),
];

export const lehmanSpace: CollectionStepDef = {
  id: 'collection-lehman-wing',
  chapter: 'roche-steps-lehman-1975',
  year: '1975',
  title: 'Hang the Lehman paintings in their rooms',
  detail: 'Rembrandt, Goya and El Greco, Corot and Ingres, Petrus Christus, Memling and Holbein, Daddi, Botticelli and Giovanni di Paolo, each in the room of the wing that shows it.',
  focus: { kind: 'preset', id: 'int-lehman-galleries' },
  space: 'lehman-wing',
  placements: LEHMAN,
};
export const lehmanCollectionStep = collectionStep(lehmanSpace);

// --- The Great Hall Balcony (galleries 202, 204, 205; hunt/dims.ts, hunt/hall.ts) ------------------------------------------------------------
// Cases along the back walls of the west and east balconies (Z −32.06 and −3.1), clear of the Grand Staircase's opening (X ±3.69), the west wall's
// doors (X ±15..17) and the east wall's three arched bays; one on the north end balcony, near its end wall.
const WEST_CASES = HALL_WEST_Z + 0.6;
const EAST_CASES = WALL_BACK_Z - 0.6;
const BALCONY: readonly Placement[] = [
  { id: 39666, x: -26.0, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 42193, x: -20.5, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 50842, x: -11.0, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 52798, x: 11.0, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 76452, x: 20.5, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 61430, x: 26.0, z: WEST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 42480, x: -26.0, z: EAST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 42509, x: -9.5, z: EAST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 44745, x: -6.5, z: EAST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 50263, x: 6.5, z: EAST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 64484, x: 9.5, z: EAST_CASES, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 42449, x: HALL_X - 0.55, z: -12.5, floor: SECOND_FLOOR_Y, facing: FACE.south },
];

export const balconySpace: CollectionStepDef = {
  id: 'collection-great-hall-balcony',
  chapter: 'hunt-1902',
  year: '1902',
  title: 'Fill the balcony’s cases with Chinese ceramics',
  detail: 'Jars, vases, an incense burner, dishes and bowls of Chinese porcelain and stoneware, from the tenth century to the eighteenth, in cases round the Great Hall’s balcony.',
  focus: { kind: 'preset', id: 'int-great-hall-balcony-west' },
  space: 'great-hall-balcony',
  placements: BALCONY,
};
export const balconyCollectionStep = collectionStep(balconySpace);

// --- European Paintings, galleries 600 to 602 (core/plan-data.ts GALLERY_RUNS, core/constants.ts) --------------------------------------------------
// Tiepolo's Triumph of Marius, 5.59 m tall in a room 5.63 m high, floor to ceiling on the wall gallery 600 shares with 601 between its two doors
// (X −3.1..3.1); his Battle of Vercellae and Capture of Carthage on the ends of the partitions at X −8.75 and 8.8 that close 600's middle, facing in;
// Giotto on 601's side of the same wall, Filippo Lippi and Memling on 602's west wall (Z −83.35).
const HALF = PARTITION / 2;
const ROOM_600_Z = (-75.05 + HALF + -70.0) / 2;
const PAINTINGS: readonly Placement[] = [
  { id: 437788, x: 0, z: -75.05 + HALF, floor: SECOND_FLOOR_Y, facing: FACE.east, ceiling: GALLERY_CEILING_Y },
  { id: 437794, x: -8.75 + HALF, z: ROOM_600_Z, floor: SECOND_FLOOR_Y, facing: FACE.north, ceiling: GALLERY_CEILING_Y },
  { id: 437795, x: 8.8 - HALF, z: ROOM_600_Z, floor: SECOND_FLOOR_Y, facing: FACE.south, ceiling: GALLERY_CEILING_Y },
  { id: 436504, x: -9.5, z: -75.05 - HALF, floor: SECOND_FLOOR_Y, facing: FACE.west },
  { id: 436896, x: -21.2, z: -83.35 + HALF, floor: SECOND_FLOOR_Y, facing: FACE.east },
  { id: 437056, x: -17.4, z: -83.35 + HALF, floor: SECOND_FLOOR_Y, facing: FACE.east },
];

export const europeanPaintingsSpace: CollectionStepDef = {
  id: 'collection-european-paintings',
  chapter: 'koch-plaza-2014',
  year: '2023',
  title: 'Hang Tiepolo’s canvases at the top of the stair',
  detail: 'The three canvases Tiepolo painted for the Ca’ Dolfin in Venice fill gallery 600; Giotto’s Adoration hangs in 601, Filippo Lippi and Memling in 602, as rehung in 2023.',
  focus: { kind: 'preset', id: 'int-european-paintings-600' },
  space: 'european-paintings-600',
  placements: PAINTINGS,
};
export const europeanPaintingsCollectionStep = collectionStep(europeanPaintingsSpace);

// --- Greek Art, gallery 153 (mmw/plan-data.ts MAP_WALLS: the south link's main-floor walls, on Z −22.1 and −13.0) -------------------------------
// Marbles and vases either side of route R4, which runs down the gallery's middle (Z −17.625): each 1.45 m before a long wall, between the doors in it
// (X −79..−77.25, −68.2..−66.45) and west of its open east end (from X −57.4); the Eleusinian relief on the south wall's face.
const GALLERY_153 = MAP_WALLS['south-j']['1'] ?? [];
const SOUTH_WALL_Z = Math.min(...GALLERY_153.map((s) => s[1]));
const NORTH_WALL_Z = Math.max(...GALLERY_153.map((s) => s[1]));
const SOUTH_SIDE = SOUTH_WALL_Z + 1.45;
const NORTH_SIDE = NORTH_WALL_Z - 1.45;
const GREEK: readonly Placement[] = [
  { id: 247173, x: -86.0, z: SOUTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 251929, x: -82.0, z: SOUTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 248899, x: -72.7, z: SOUTH_WALL_Z + MMW_PARTITION / 2, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 247964, x: -63.0, z: SOUTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 252973, x: -59.5, z: SOUTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 253373, x: -86.0, z: NORTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 251838, x: -82.0, z: NORTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 248268, x: -74.5, z: NORTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 248902, x: -71.0, z: NORTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 247967, x: -62.0, z: NORTH_SIDE, floor: MAIN_FLOOR_Y, facing: FACE.west },
];

export const greekGalleriesSpace: CollectionStepDef = {
  id: 'collection-greek-galleries',
  chapter: 'mckim-mead-white-1926',
  year: '1926',
  title: 'Set the Greek marbles along gallery 153',
  detail: 'Eirene, a wounded warrior and a wounded Amazon, the Diadoumenos and the Great Eleusinian Relief, with vases and a bronze diskos thrower, line the gallery on route R4.',
  focus: { kind: 'preset', id: 'int-greek-galleries' },
  space: 'greek-galleries',
  placements: GREEK,
};
export const greekGalleriesCollectionStep = collectionStep(greekGalleriesSpace);

/** This file's spaces, for the placement test. */
export const SPACES_B: readonly CollectionStepDef[] = [petrieSpace, lehmanSpace, balconySpace, europeanPaintingsSpace, greekGalleriesSpace];
