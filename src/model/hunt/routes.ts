/**
 * The public routes the walk mode keeps open (plan docs/work/1_first-person-walk, milestones M2 and M2b), as plan polylines [x, z] along the walking line, each
 * with the floor level it starts and ends on. Shared by the unit walks (routes.test.ts) and the e2e walks (tests/e2e/routes.spec.ts). Every segment runs
 * along an axis or at 45° to one, so a walker facing along an axis walks it with W, A, S or D, or two of them together.
 * R1: from the plaza on the entrance axis up the front steps, through the central doors and into the nave, round Roche's information desk (radius 3.08 m on
 * the axis at Z −17.6, so the route passes it 4.3 m north of the axis) back to the axis on the nave's west side. R2: from there up the Grand Staircase
 * over its landing to the second floor and a few metres into the cross hall at its head; walked back, it returns to the hall floor.
 * R3 and R4 start at the walk mode's Great Hall spawn (src/walk/spawns.ts), 8 m in from the hall's north end on the nave's middle line, and run on the main
 * floor through the floor map's doors (docs/research/interior.md, Plan source; the map in research/cache/). R3: north through gallery 100 and 101 into the
 * Old Kingdom gallery (103), on through 104 and 132 to 128, the lobby and 130, then into the Temple of Dendur hall at its south-east corner and along its
 * east walkway and the north walkway by the glass, to beside the platform. R4: south past the desk, through gallery 150 and the Greek galleries (153,
 * 160) into the Leon Levy and Shelby White Court, east of its basin.
 */
import { PAVING_GAP, walkWestY } from '../site/ground.js';
import { HALL_X, MAIN, NAVE_MID_Z, SECOND } from './dims.js';

export interface Route {
  readonly id: string;
  readonly points: readonly (readonly [number, number])[];
  /** Floor level at the first point and at the last. */
  readonly startY: number;
  readonly endY: number;
}

/** On the plaza on the axis, 5 m in front of the steps' foot; and on the axis in the nave, west of the desk, where R1 ends and R2 starts. */
const PLAZA: readonly [number, number] = [0, 25];
const NAVE_WEST: readonly [number, number] = [0, -24.7];
/** How far north of the axis R1 passes the desk, and where it turns off the axis and back: past the east colonnade (Z −9.37), clear of the desk. */
const DESK_PASS_X = 4.3;
const OFF_AXIS_Z = -10.5;
/** Where the walk mode's Great Hall spawn stands. */
const HALL_SPAWN: readonly [number, number] = [HALL_X - 8, NAVE_MID_Z];

export const ROUTE_R1: Route = {
  id: 'R1',
  points: [PLAZA, [0, OFF_AXIS_Z], [DESK_PASS_X, OFF_AXIS_Z - DESK_PASS_X], [DESK_PASS_X, NAVE_WEST[1] + DESK_PASS_X], NAVE_WEST],
  // The plaza's granite lies a paving gap over the sidewalk's level (src/model/site/plaza.ts).
  startY: walkWestY(...PLAZA) + PAVING_GAP,
  endY: MAIN,
};

export const ROUTE_R2: Route = {
  id: 'R2',
  points: [NAVE_WEST, [0, -63.5]],
  startY: MAIN,
  endY: SECOND,
};

/**
 * R3's turns, each on the middle of a map door it passes: the door of the wing's partition on Z −10.95 (X 38.5), the door from 101 into 103 on X 45.4
 * (Z −6.335), the door from 132 into 128 on Z −24.4 (X 102.83), the door from 128 into the lobby on Z −32.05 (X 104.18), the door from 130 into the hall on
 * X 114.36 (Z −38.4, the east walkway's middle), and the north walkway's middle between the pool and the glass (X 150.3); it ends beside the platform's side steps.
 */
export const ROUTE_R3: Route = {
  id: 'R3',
  points: [HALL_SPAWN, [38.5, NAVE_MID_Z], [38.5, -6.335], [98, -6.335], [102.83, -11.165], [102.83, -28], [104.18, -29.35], [104.18, -38.4], [150.3, -38.4], [150.3, -68]],
  startY: MAIN,
  // The Dendur walkways are on the main floor (src/model/roche-north/plan.ts, DENDUR_FLOOR_Y).
  endY: MAIN,
};

/** R4's way round the desk, 4 m west of its middle line (0.57 m clear of it at a walker's radius), then the nave's middle line through every door south. */
const DESK_PASS_Z = NAVE_MID_Z - 4;

export const ROUTE_R4: Route = {
  id: 'R4',
  points: [HALL_SPAWN, [8, NAVE_MID_Z], [4, DESK_PASS_Z], [-4, DESK_PASS_Z], [-8, NAVE_MID_Z], [-113.5, NAVE_MID_Z]],
  startY: MAIN,
  // The court's green marble field lies 4 cm over the main floor (src/model/mmw/greek-court.ts).
  endY: MAIN + 0.04,
};

/** The same route walked the other way. */
export function reversed(route: Route): Route {
  return { id: `${route.id} back`, points: [...route.points].reverse(), startY: route.endY, endY: route.startY };
}
