/**
 * Core steps, composed into chapters by src/build/sequence.ts. Owner: the core modelling worker; empty until modelled.
 * Each array's steps must name the chapter given in its comment (src/build/sequence.test.ts checks it); no other file needs editing to add steps.
 */
import type { StepDef } from '../../build/types.js';

/** Chapter `vaux-mould-1880`: Vaux and Mould's 1880 brick building. */
export const vauxSteps: readonly StepDef[] = [];

/** Chapter `weston-tuckerman-1894`: Weston's south wing and Tuckerman's north wing. */
export const westonTuckermanSteps: readonly StepDef[] = [];

/** Chapter `mckim-mead-white-1926`: the Medieval Sculpture Hall (1939). */
export const medievalHallSteps: readonly StepDef[] = [];

/** Chapter `koch-plaza-2014`: the European Paintings galleries' renewed skylights (2023). */
export const europeanPaintingsGlazing2023Steps: readonly StepDef[] = [];
