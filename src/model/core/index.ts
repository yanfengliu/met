/**
 * Core steps, composed into chapters by src/build/sequence.ts. Owner: the core modelling worker.
 * Each array's steps name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */

/** Chapter `vaux-mould-1880`: Vaux and Mould's 1880 brick building. */
export { vauxSteps } from './vaux.js';

/** Chapter `weston-tuckerman-1894`: Weston's south wing and Tuckerman's north wing. */
export { westonTuckermanSteps } from './wings.js';

/** Chapter `mckim-mead-white-1926`: the Medieval Sculpture Hall (1939); chapter `koch-plaza-2014`: the European Paintings galleries' renewed skylights (2023). */
export { europeanPaintingsGlazing2023Steps, medievalHallSteps } from './later.js';
