/**
 * Roche south steps, composed into chapters by src/build/sequence.ts. Owner: the Roche south modelling worker.
 * Each array's steps name the chapter given in its comment (src/build/sequence.test.ts checks it). Within each wing the steps run in constructional
 * order (foundations and floor plates, walls, interiors, roofs, glass last), and the wings run in date order: Lehman 1975, Rockefeller 1982,
 * Wallace 1987, Kravis 1990.
 */
import type { StepDef } from '../../build/types.js';
import { lehmanCollectionStep, petrieCollectionStep } from '../collection/spaces-b.js';
import { kravisSteps } from './kravis.js';
import { lehmanStructureSteps } from './lehman.js';
import { lehmanGlassSteps } from './lehman-glass.js';
import { rockefellerSteps } from './rockefeller.js';
import { wallaceSteps } from './wallace.js';
import { roofGardenSteps } from './wallace-garden.js';

/** Chapter `roche-steps-lehman-1975`: the Robert Lehman Wing (1975), the collection's paintings in its rooms once they are roofed (src/model/collection/), then its glass. */
export const lehmanSteps: readonly StepDef[] = [...lehmanStructureSteps, lehmanCollectionStep, ...lehmanGlassSteps];

/** Chapter `roche-south-1990`: the Rockefeller, Wallace and Kravis wings and the roof garden, then the collection's sculpture in the Petrie Court. */
export const rocheSouthSteps: readonly StepDef[] = [...rockefellerSteps, ...wallaceSteps, ...roofGardenSteps, ...kravisSteps, petrieCollectionStep];
