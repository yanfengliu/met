/**
 * Site and front steps, composed into chapters by src/build/sequence.ts. Owner: the site modelling worker; empty until modelled.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */
import type { StepDef } from '../../build/types.js';

/** Chapter `site`: the park's terrain, Fifth Avenue and its sidewalks. */
export const siteSteps: readonly StepDef[] = [];

/** Chapter `roche-steps-lehman-1975`: Roche Dinkeloo's rebuilt front steps (1970). */
export const frontSteps1970: readonly StepDef[] = [];

/** Chapter `koch-plaza-2014`: the David H. Koch Plaza (2014). */
export const plaza2014Steps: readonly StepDef[] = [];
