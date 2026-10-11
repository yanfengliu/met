/**
 * McKim, Mead & White steps, composed into chapters by src/build/sequence.ts. Owner: the McKim, Mead & White modelling worker.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 * Within the chapter the order is constructional: the north campaign (1906–1913) and then the south (1914–1926), each from foundations to cornice,
 * with their courts' interiors, and the roofs and skylights last so the build shows the interiors before the roofs close over them.
 */
import type { StepDef } from '../../build/types.js';
import { armorCourtSteps, armorCourtVaultStep } from './armor-court.js';
import { northFrontSteps, southFrontSteps } from './steps-fronts.js';
import { roofSteps } from './steps-roofs.js';

/** Chapter `mckim-mead-white-1926`: the Fifth Avenue wings by McKim, Mead & White. */
export const mmwSteps: readonly StepDef[] = [...northFrontSteps, ...armorCourtSteps, ...southFrontSteps, armorCourtVaultStep, ...roofSteps];

/** Chapter `koch-plaza-2014`: the Greek and Roman court's upper storey and skylight (2007). */
export const greekRomanCourt2007Steps: readonly StepDef[] = [];

/** Chapter `roche-north-1980`: the Astor Court (1981). */
export const astorCourt1981Steps: readonly StepDef[] = [];
