/**
 * Hunt steps, composed into chapters by src/build/sequence.ts. Owner: the Hunt modelling worker.
 * Chapter `hunt-1902`: Richard Morris Hunt's Fifth Avenue pavilion, its flanking wings, the Great Hall and the Grand Staircase (block hunt-d, 1895–1902),
 * in constructional order: foundations and podium, walls, the order, arches and glazing, entablature, attic and blocks, sculpture, then the Great Hall's
 * floor, piers, balcony, arches, domes, end vaults and fit-out, the Grand Staircase, the galleries, and the roofs.
 * Chapter `roche-steps-lehman-1975`: Roche's 1970 information desk in the Great Hall, built in that era.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it).
 */
import type { StepDef } from '../../build/types.js';
import { archSteps } from './arches.js';
import { entablatureSteps } from './entablature.js';
import { gallerySteps } from './galleries.js';
import { fitoutSteps, greatHallDesk1970Steps } from './hall-fitout.js';
import { vaultSteps } from './hall-vaults.js';
import { hallSteps } from './hall.js';
import { orderSteps } from './order.js';
import { podiumSteps } from './podium.js';
import { roofSteps } from './roof.js';
import { sculptureSteps } from './sculpture.js';
import { stairSteps } from './stair.js';
import { wallSteps } from './walls.js';

/** Chapter `hunt-1902`: Hunt's Fifth Avenue pavilion, Great Hall and Grand Staircase. */
export const huntSteps: readonly StepDef[] = [
  ...podiumSteps,
  ...wallSteps,
  ...orderSteps,
  ...archSteps,
  ...entablatureSteps,
  ...sculptureSteps,
  ...hallSteps,
  ...vaultSteps,
  ...fitoutSteps,
  ...stairSteps,
  ...gallerySteps,
  ...roofSteps,
];

/** Chapter `roche-steps-lehman-1975`: Roche's round information desk in the Great Hall (1970). */
export { greatHallDesk1970Steps };
