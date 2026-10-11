/**
 * Temporary demo chapter (src/model/demo/): a toy building in fourteen steps that exercises every Motion kind, every Stagger, every CameraFocus kind,
 * step lights, composite pieces and a 1,020-instance mesh, about 2,100 pieces in all. It is the last chapter (`demo`) until the coordinator removes it;
 * nothing outside src/model/demo/ may depend on it except `src/build/sequence.ts`, which composes it.
 */
import type { StepDef } from '../../build/types.js';
import { frontSteps, wingSteps } from './front.js';
import { hallSteps } from './hall.js';
import { siteSteps } from './site.js';

export const demoSteps: readonly StepDef[] = [...siteSteps, ...hallSteps, ...frontSteps, ...wingSteps];
