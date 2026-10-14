/**
 * McKim, Mead & White steps, composed into chapters by src/build/sequence.ts. Owner: the McKim, Mead & White modelling worker.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 * Within the chapter the order is constructional: the north campaign (1906–1913) and then the south (1914–1926), each from foundations to cornice,
 * with their courts' interiors, and the roofs and skylights last so the build shows the interiors before the roofs close over them.
 */
import type { StepDef } from '../../build/types.js';
import { armorCourtSteps, armorCourtVaultStep } from './armor-court.js';
import { astorCourtSteps } from './astor-court.js';
import { greekCourt2007, romanCourtSteps } from './greek-court.js';
import { northFrontSteps, southFrontSteps } from './steps-fronts.js';
import { northWallsRaisedStep, southWallsRaisedStep } from './steps-raised.js';
import { roofSteps } from './steps-roofs.js';

/** Chapter `mckim-mead-white-1926`: the Fifth Avenue wings by McKim, Mead & White. */
export const mmwSteps: readonly StepDef[] = [...northFrontSteps, ...armorCourtSteps, ...southFrontSteps, ...romanCourtSteps, armorCourtVaultStep, ...roofSteps];

/** Chapter `koch-plaza-2014`: the Greek and Roman court's upper storey and skylight (2007). */
export const greekRomanCourt2007Steps: readonly StepDef[] = greekCourt2007;

/**
 * Chapter `roche-north-1980`: the Morgan wing's walls raised against the Sackler and American wings (1978–1980), then the Astor Court (1981).
 * Composed after rocheNorthSteps, so the walls rise after those wings' roofs; a separate array composed before them would keep the walls-then-roof order.
 */
export const astorCourt1981Steps: readonly StepDef[] = [northWallsRaisedStep, ...astorCourtSteps];

/** Chapter `roche-south-1990`: the south link's walls raised against the Rockefeller and Kravis wings (1982–1990). Not composed yet: sequence.ts needs the slot. */
export const southWallsRaised1990Steps: readonly StepDef[] = [southWallsRaisedStep];
