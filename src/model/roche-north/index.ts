/**
 * Roche north steps, composed into chapters by src/build/sequence.ts. Owner: the Roche north modelling worker.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 * Area: the `sackler` and `american-wing` blocks of docs/research/exterior.md section 2. The Sackler Wing (1978) builds before the American Wing (1980);
 * the 1924 American Wing core is its own array in the McKim, Mead & White chapter.
 */
import type { StepDef } from '../../build/types.js';
import { americanWing1924 } from './american-1924.js';
import { americanSteps } from './american-steps.js';
import { sacklerSteps } from './sackler.js';

/** Chapter `mckim-mead-white-1926`: the 1924 American Wing. */
export const americanWing1924Steps: readonly StepDef[] = americanWing1924;

/** Chapter `roche-north-1980`: the Sackler Wing and the Temple of Dendur, then the American Wing with the Charles Engelhard Court. */
export const rocheNorthSteps: readonly StepDef[] = [...sacklerSteps, ...americanSteps];
