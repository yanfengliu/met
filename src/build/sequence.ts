/**
 * The build sequence: each chapter of `src/build/chapters.ts`, in that order, composed from the area modules' step arrays (docs/design/spec.md, Build-step API).
 * Owner: the coordinator. Modelling workers fill the arrays in their own modules and never edit this file; a step's `chapter` field must name the chapter
 * its array is composed into, which src/build/sequence.test.ts checks.
 */
import { europeanPaintingsGlazing2023Steps, medievalHallSteps, vauxSteps, westonTuckermanSteps } from '../model/core/index.js';
import { demoSteps } from '../model/demo/index.js';
import { huntSteps } from '../model/hunt/index.js';
import { greekRomanCourt2007Steps, mmwSteps } from '../model/mmw/index.js';
import { americanWing1924Steps, rocheNorthSteps } from '../model/roche-north/index.js';
import { lehmanSteps, rocheSouthSteps } from '../model/roche-south/index.js';
import { frontSteps1970, plaza2014Steps, siteSteps } from '../model/site/index.js';
import { CHAPTERS } from './chapters.js';
import type { ChapterId } from './chapters.js';
import type { StepDef } from './types.js';

/** Each chapter's step arrays, in build order within the chapter. The type makes every chapter of `CHAPTERS` appear here. */
export const COMPOSITION: { readonly [K in ChapterId]: readonly (readonly StepDef[])[] } = {
  site: [siteSteps],
  'vaux-mould-1880': [vauxSteps],
  'weston-tuckerman-1894': [westonTuckermanSteps],
  'hunt-1902': [huntSteps],
  'mckim-mead-white-1926': [mmwSteps, americanWing1924Steps, medievalHallSteps],
  'roche-steps-lehman-1975': [frontSteps1970, lehmanSteps],
  'roche-north-1980': [rocheNorthSteps],
  'roche-south-1990': [rocheSouthSteps],
  'koch-plaza-2014': [greekRomanCourt2007Steps, plaza2014Steps, europeanPaintingsGlazing2023Steps],
  demo: [demoSteps],
};

export const SEQUENCE: readonly StepDef[] = CHAPTERS.flatMap((chapter) => COMPOSITION[chapter.id].flat());
