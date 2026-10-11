/**
 * Roche south steps, composed into chapters by src/build/sequence.ts. Owner: the Roche south modelling worker; empty until modelled.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */
import type { StepDef } from '../../build/types.js';

/** Chapter `roche-steps-lehman-1975`: the Robert Lehman Wing (1975). */
export const lehmanSteps: readonly StepDef[] = [];

/** Chapter `roche-south-1990`: the Rockefeller, Wallace and Kravis wings and the roof garden. */
export const rocheSouthSteps: readonly StepDef[] = [];
