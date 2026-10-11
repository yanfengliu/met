/**
 * Roche north steps, composed into chapters by src/build/sequence.ts. Owner: the Roche north modelling worker; empty until modelled.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */
import type { StepDef } from '../../build/types.js';

/** Chapter `mckim-mead-white-1926`: the 1924 American Wing. */
export const americanWing1924Steps: readonly StepDef[] = [];

/** Chapter `roche-north-1980`: the Sackler Wing, the American Wing's glass court and the Astor Court. */
export const rocheNorthSteps: readonly StepDef[] = [];
