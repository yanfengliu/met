/**
 * McKim, Mead & White steps, composed into chapters by src/build/sequence.ts. Owner: the McKim, Mead & White modelling worker.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 * Within the chapter the order is constructional: the north campaign (1906–1913) and then the south (1914–1926), each from foundations to cornice,
 * with their courts' interiors, and the roofs and skylights last so the build shows the interiors before the roofs close over them.
 */
import type { StepDef } from '../../build/types.js';
import { armorCollectionStep, greekCourtCollectionStep } from '../collection/spaces-a.js';
import { greekGalleriesCollectionStep } from '../collection/spaces-b.js';
import { armorCourtSteps, armorCourtVaultStep } from './armor-court.js';
import { astorCourtSteps } from './astor-court.js';
import { greekCourt2007, romanCourtSteps } from './greek-court.js';
import { northFrontSteps, southFrontSteps } from './steps-fronts.js';
import { northWallsRaisedStep, southWallsRaisedStep } from './steps-raised.js';
import { roofSteps } from './steps-roofs.js';

/**
 * Chapter `mckim-mead-white-1926`: the Fifth Avenue wings by McKim, Mead & White, with the collection's armours in the Arms and Armor Court after its
 * parade and its Greek marbles in gallery 153 once the south wings stand (src/model/collection/).
 */
export const mmwSteps: readonly StepDef[] = [
  ...northFrontSteps,
  ...armorCourtSteps,
  armorCollectionStep,
  ...southFrontSteps,
  greekGalleriesCollectionStep,
  ...romanCourtSteps,
  armorCourtVaultStep,
  ...roofSteps,
];

/** Chapter `koch-plaza-2014`: the Greek and Roman court's upper storey and skylight (2007), then its sculpture as reinstalled (src/model/collection/). */
export const greekRomanCourt2007Steps: readonly StepDef[] = [...greekCourt2007, greekCourtCollectionStep];

/** Chapter `roche-north-1980`, composed before rocheNorthSteps: the Morgan wing's walls raised against the Sackler and American wings (1978–1980), before their roofs. */
export const northWallsRaised1978Steps: readonly StepDef[] = [northWallsRaisedStep];

/** Chapter `roche-north-1980`, composed after rocheNorthSteps: the Astor Court (1981). */
export const astorCourt1981Steps: readonly StepDef[] = astorCourtSteps;

/** Chapter `roche-south-1990`, composed before rocheSouthSteps: the south link's walls raised against the Rockefeller and Kravis wings (1982–1990), before their roofs. */
export const southWallsRaised1990Steps: readonly StepDef[] = [southWallsRaisedStep];
