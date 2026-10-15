/**
 * The public routes through Hunt's wing that the walk mode keeps open (plan docs/work/1_first-person-walk, milestone M2), as plan polylines [x, z] along
 * the walking line, each with the floor level it starts and ends on. Shared by the unit walks (routes.test.ts) and the e2e walks (tests/e2e/routes.spec.ts).
 * R1: from the plaza on the entrance axis up the front steps, through the central doors and into the nave, round Roche's information desk (radius 3.08 m on
 * the axis at Z −17.6, so the route passes it 4.3 m north of the axis) to the nave's west side. R2: from there up the Grand Staircase over its landing to
 * the second floor and a few metres into the cross hall at its head; walked back, it returns to the hall floor.
 */
import { PAVING_GAP, walkWestY } from '../site/ground.js';
import { MAIN, SECOND } from './dims.js';

export interface Route {
  readonly id: string;
  readonly points: readonly (readonly [number, number])[];
  /** Floor level at the first point and at the last. */
  readonly startY: number;
  readonly endY: number;
}

/** On the plaza on the axis, 5 m in front of the steps' foot; and on the axis in the nave, west of the desk, where R1 ends and R2 starts. */
const PLAZA: readonly [number, number] = [0, 25];
const NAVE_WEST: readonly [number, number] = [0, -24.5];

export const ROUTE_R1: Route = {
  id: 'R1',
  points: [PLAZA, [0, -10.5], [4.3, -14], [4.3, -21.2], NAVE_WEST],
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

/** The same route walked the other way. */
export function reversed(route: Route): Route {
  return { id: `${route.id} back`, points: [...route.points].reverse(), startY: route.endY, endY: route.startY };
}
