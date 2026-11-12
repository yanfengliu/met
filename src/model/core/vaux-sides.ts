/**
 * The 1880 building's side walls at X ±14.5, exterior in 1880 and party walls since 1888 (south) and 1894 (north), their openings bricked up since:
 * bay by bay on the hall's pier lines (interior.md: piers 5.65 m apart), three bays of the west end block, the hall's six, and two of the east end block.
 * In 1880 only the hall's six bays had the banded pointed arches, the arch of the west front (vaux-arch.ts), its tall windows under glazed heads over a
 * ground storey of light rusticated stone with small square-headed openings; the end blocks were bare brick with round-headed openings on three tiers
 * (exterior-images.md #49, the north side, read at native size; #65, the south side; exterior.md section 9). The north side's ground storey is hidden by
 * a mound in #49 and taken to match the south's. #49 shows the hall bays' windows wider than the west front's, between light stone piers, with light
 * piers rising between the heads; the model gives them the west front's arch in brick, as exterior.md section 9 records. Today's doors (the floor map's
 * openings in these walls) stay where they were.
 */
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { openWall, type Hole } from './arches.js';
import { A_HALF, HALL_PIER_Z, L1, L2, LG, PARTITION, PARTY_WALL, ROOF_Y, VAUX_ARCH_SPAN, VAUX_INNER_ORDER } from './constants.js';
import { INNER_EAST_Z, INNER_WEST_Z } from './layout.js';
import { core } from './materials.js';
import { FACING, addBox, placed, runsBetween } from './shapes.js';
import { CLEAR, COURSE, JOINT, LINTEL_Y, ORDER_PROUD, RUST_Y0, RUST_Y1, SILL_Y, SPRING_Y, archHoles, darkHead, lightHead, type Cut } from './vaux-arch.js';
import { WALL_BASE_Y } from './vaux-front.js';

/** Pier lines of the side walls: the hall's seven, extended three bays west and two east at the same spacing. */
export const SIDE_BAY = (HALL_PIER_Z[6] - HALL_PIER_Z[0]) / 6;
export const SIDE_LINES: readonly number[] = [-3, -2, -1].map((k) => HALL_PIER_Z[0] + k * SIDE_BAY).concat([...HALL_PIER_Z], [1, 2].map((k) => HALL_PIER_Z[6] + k * SIDE_BAY));
/** Bays of the side walls with a main-floor door and a second-floor door (floor map, floor 1 and 2 openings in the X ±14.5 walls). */
const DOOR_BAYS: Readonly<Record<Side, readonly number[]>> = { south: [2, 5, 6, 9], north: [4, 5, 6, 9] };
/** The hall's six bays, between the end blocks. */
const isHall = (i: number): boolean => i >= 3 && i <= 8;

type Side = 'south' | 'north';
const SIDES: readonly (readonly [Side, number, number, number])[] = [
  ['south', -A_HALF, FACING.south, -1],
  ['north', A_HALF, FACING.north, 1],
];

/** A bay's second-floor door, beside its middle (as before); and as a cut through an arch head over the springing. */
const SECOND_DOOR = { x: 1.6, width: 1.8, height: 3.2 } as const;
const SECOND_CUT: Cut = [SECOND_DOOR.x - SECOND_DOOR.width / 2 - 0.03, L2 - SPRING_Y - 0.03, SECOND_DOOR.x + SECOND_DOOR.width / 2 + 0.03, L2 + SECOND_DOOR.height - SPRING_Y + 0.03];
/** Blind openings' depth: bricked up flush with the 1880 frames' back. */
const BLIND = 0.2;
/** The hall bays' small square-headed openings in the rusticated ground storey (#65): two courses tall, on the fifth and sixth. */
const SMALL = { width: 1.2, sill: RUST_Y0 + 4 * COURSE, head: RUST_Y0 + 6 * COURSE } as const;
/** The end blocks' round-headed openings, two to a bay on each tier (#49 shows about five on the west block's three bays). */
const PAIR = [-1.4, 1.4] as const;
const TIERS = [
  { sill: LG + 2.0, height: 2.2 },
  { sill: L1 + 1.2, height: 4.0 },
  { sill: L2 + 1.0, height: 3.2 },
] as const;
/** An end block's main-floor door, cut through its bare brick. */
const END_DOOR_HEIGHT = 4.0;
/**
 * Where the floor map's second-floor doors through the side walls, X ±14.79 from Z −68.85 to −66.78, begin: at the face of the map's partition on
 * −68.85 (0.4 m thick) that meets the wall there, so its end stands in no door (work unit 23, review 1). They run on to the east wall's inner face,
 * inside the core since its east face moved to the map's line (work unit 23, review 0), as high as the side walls' other second-floor doors.
 */
const EAST_END_DOOR_Z = -68.85 + PARTITION / 2;

/** The openings of one bay: a hall bay's arch, blind or a door, or an end bay's round-headed openings; and today's doors. */
function sideBay(hall: boolean, door: boolean): BufferGeometry {
  const base = WALL_BASE_Y;
  const holes: Hole[] = [];
  const second: Hole = { x: SECOND_DOOR.x, y: L2 - base, width: SECOND_DOOR.width, height: SECOND_DOOR.height };
  if (hall) {
    holes.push({ y: SMALL.sill - base, width: SMALL.width, height: SMALL.head - SMALL.sill, depth: BLIND });
    // A door bay's arch head is left without its niche: the second-floor door was cut through it.
    holes.push(...archHoles(0, base, { sill: door ? L1 : SILL_Y, through: door }, !door));
    if (door) holes.push(second);
  } else {
    const [ground, main, upper] = TIERS;
    for (const x of PAIR) holes.push({ head: 'round', x, y: ground.sill - base, width: 1.3, height: ground.height, depth: BLIND });
    if (door) {
      holes.push({ x: 0, y: L1 - base, width: CLEAR, height: END_DOOR_HEIGHT }, second);
      // The upper tier's opening on the door's side gave way to it.
      holes.push({ head: 'round', x: -PAIR[1], y: upper.sill - base, width: 1.3, height: upper.height, depth: BLIND });
    } else {
      for (const tier of [main, upper]) for (const x of PAIR) holes.push({ head: 'round', x, y: tier.sill - base, width: 1.3, height: tier.height, depth: BLIND });
    }
  }
  return openWall({ width: SIDE_BAY, height: ROOF_Y - WALL_BASE_Y, thickness: PARTY_WALL, holes, openEnds: true });
}

/** Side walls bay by bay, from the footings to the roof, with the plain stretches beyond the end bays. */
export function vauxSideWalls(kit: Kit): void {
  const height = ROOF_Y - WALL_BASE_Y;
  for (const [side, x, facing] of SIDES) {
    for (let i = 0; i + 1 < SIDE_LINES.length; i++) {
      const z0 = SIDE_LINES[i] ?? 0;
      const z1 = SIDE_LINES[i + 1] ?? 0;
      kit.add(sideBay(isHall(i), DOOR_BAYS[side].includes(i)), core.vauxBrick, placed(x, WALL_BASE_Y, (z0 + z1) / 2, facing));
    }
    const inner = side === 'south' ? x + PARTY_WALL : x - PARTY_WALL;
    addBox(kit, core.vauxBrick, x, WALL_BASE_Y, INNER_WEST_Z, inner, WALL_BASE_Y + height, SIDE_LINES[0] ?? 0);
    // Beyond the last bay to the east wall, the floor map's second-floor door into gallery 603 or 633 (EAST_END_DOOR_Z to the wall's inner face).
    const last = SIDE_LINES[SIDE_LINES.length - 1] ?? 0;
    addBox(kit, core.vauxBrick, x, WALL_BASE_Y, last, inner, WALL_BASE_Y + height, EAST_END_DOOR_Z);
    addBox(kit, core.vauxBrick, x, WALL_BASE_Y, EAST_END_DOOR_Z, inner, L2, INNER_EAST_Z);
    addBox(kit, core.vauxBrick, x, L2 + SECOND_DOOR.height, EAST_END_DOOR_Z, inner, WALL_BASE_Y + height, INNER_EAST_Z);
  }
}

/** The middle of bay i along Z. */
const bayZ = (i: number): number => ((SIDE_LINES[i] ?? 0) + (SIDE_LINES[i + 1] ?? 0)) / 2;
const HALL_Z0 = SIDE_LINES[3] ?? 0;
const HALL_Z1 = SIDE_LINES[9] ?? 0;
const HALL_BAYS = [3, 4, 5, 6, 7, 8] as const;

/**
 * Granite trim of the side walls' hall bays (#49, #65): the rusticated ground storey round its small openings, the main floor's band, the windows'
 * aprons, the jambs' inner order and the impost band, and each head's voussoirs and inner order, with no hood; the end blocks stay bare brick.
 */
export function vauxSideArcadeTrim(kit: Kit): void {
  for (const [side, x, facing, out] of SIDES) {
    const face = (z0: number, z1: number, y0: number, y1: number, back: number, proud: number): void => {
      addBox(kit, core.granite, x + out * back, y0, z0, x + out * (back + proud), y1, z1);
    };
    const doors = HALL_BAYS.filter((i) => DOOR_BAYS[side].includes(i));
    for (let j = 0; j < 10; j++) {
      const y0 = RUST_Y0 + j * COURSE;
      const y1 = y0 + COURSE;
      const small = y0 < SMALL.head - 1e-6 && y1 > SMALL.sill + 1e-6;
      const gaps = small ? HALL_BAYS.map((i): [number, number] => [bayZ(i) - SMALL.width / 2, bayZ(i) + SMALL.width / 2]) : [];
      for (const [z0, z1] of runsBetween(HALL_Z0, HALL_Z1, gaps)) {
        face(z0, z1, y0, y1, 0, 0.06);
        face(z0, z1, y0, y1 - JOINT, 0.06, 0.04);
      }
    }
    const doorGaps = doors.map((i): [number, number] => [bayZ(i) - CLEAR / 2, bayZ(i) + CLEAR / 2]);
    for (const [z0, z1] of runsBetween(HALL_Z0, HALL_Z1, doorGaps)) face(z0, z1, RUST_Y1, L1 + 0.12, 0, 0.08);
    face(HALL_Z0, HALL_Z1, LINTEL_Y, SPRING_Y, 0, 0.08);
    for (const i of HALL_BAYS) {
      const door = doors.includes(i);
      const z = bayZ(i);
      if (!door) face(z - VAUX_ARCH_SPAN / 2, z + VAUX_ARCH_SPAN / 2, L1 + 0.12, SILL_Y, 0, 0.05);
      for (const s of [-1, 1]) {
        const edge = z + s * (CLEAR / 2);
        face(Math.min(edge, edge + s * VAUX_INNER_ORDER), Math.max(edge, edge + s * VAUX_INNER_ORDER), door ? L1 : SILL_Y, LINTEL_Y, 0, ORDER_PROUD);
      }
    }
    // Each hall bay's head as two pieces placed at its bay; a door bay's head is cut by its second-floor door, which takes the stones it crosses.
    for (const i of HALL_BAYS) {
      const cut = doors.includes(i) ? SECOND_CUT : undefined;
      const at = placed(x, SPRING_Y, bayZ(i), facing);
      kit.add(lightHead('side', cut), core.granite, at);
      kit.add(darkHead('side', cut), core.graniteDark, at);
    }
  }
}
