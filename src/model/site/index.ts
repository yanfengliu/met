/**
 * Site and front steps, composed into chapters by src/build/sequence.ts. Owner: the site modelling worker.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 * The site is everything outside the footprint within the site bounds (footprint.ts, frame.ts), plus the front steps and landing at Z ≥ +3.5.
 */
import type { StepDef } from '../../build/types.js';
import { eastSidewalkStep, fifthAvenueStep, sidewalksStep } from './avenue.js';
import { drivesStep } from './drives.js';
import { parkTreesStep, rockStep } from './park.js';
import { pathsStep } from './paths.js';
import { alleesStep, fountainWaterStep, fountainsStep, furnitureStep, groveTreesStep, grovesStep, pavingStep } from './plaza.js';
import { flightStep, landingStep, railingsStep } from './steps.js';
import { padStep, terrainStep } from './terrain.js';

/** Chapter `site`: the park's terrain, Fifth Avenue and its sidewalks. */
export const siteSteps: readonly StepDef[] = [terrainStep, padStep, rockStep, drivesStep, fifthAvenueStep, sidewalksStep, eastSidewalkStep, pathsStep, parkTreesStep];

/** Chapter `roche-steps-lehman-1975`: Roche Dinkeloo's rebuilt front steps (1970). */
export const frontSteps1970: readonly StepDef[] = [landingStep, flightStep, railingsStep];

/** Chapter `koch-plaza-2014`: the David H. Koch Plaza (2014). */
export const plaza2014Steps: readonly StepDef[] = [pavingStep, fountainsStep, fountainWaterStep, grovesStep, furnitureStep, groveTreesStep, alleesStep];
