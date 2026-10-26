/**
 * Core steps, composed into chapters by src/build/sequence.ts. Owner: the core modelling worker.
 * Each array's steps name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */

/** Chapter `vaux-mould-1880`: Vaux and Mould's 1880 brick building. */
export { vauxSteps } from './vaux.js';

/** Chapter `weston-tuckerman-1894`: Weston's south wing and Tuckerman's north wing. */
export { westonTuckermanSteps } from './wings.js';

import type { StepDef } from '../../build/types.js';
import { medievalCollectionStep } from '../collection/spaces-a.js';
import { europeanPaintingsCollectionStep } from '../collection/spaces-b.js';
import { europeanPaintingsGlazing2023Steps as glazing2023, medievalHallSteps as medievalHall } from './later.js';

/** Chapter `mckim-mead-white-1926`: the Medieval Sculpture Hall (1939) and its choir screen (1956), then the collection's statues in its aisles. */
export const medievalHallSteps: readonly StepDef[] = [...medievalHall, medievalCollectionStep];

/** Chapter `koch-plaza-2014`: the European Paintings galleries' renewed skylights (2023), then the paintings rehung in galleries 600 to 602. */
export const europeanPaintingsGlazing2023Steps: readonly StepDef[] = [...glazing2023, europeanPaintingsCollectionStep];
