/**
 * The roof steps of the McKim, Mead & White chapter, last in it so the build shows the interiors before the roofs close over them (the coordinator's order).
 * Their form is read from the NYC orthophoto 2018 (ref-plan-ortho); see roofs.ts.
 */
import type { StepDef } from '../../build/types.js';
import { buildNorthRoofs, buildSouthRoofs } from './roofs.js';

export const roofSteps: readonly StepDef[] = [
  {
    id: 'mmw-north-roofs',
    chapter: 'mckim-mead-white-1926',
    year: '1906–1913',
    title: 'Roof the north wings and glaze their skylights',
    detail: 'Flat decks with glazed ridges over the top-lit galleries, light wells left open, and the opening the Astor Court\'s skylight fills in 1981.',
    motion: { kind: 'drop', distance: 6 },
    stagger: 'x',
    focus: { kind: 'preset', id: 'aerial-ne' },
    build: buildNorthRoofs,
  },
  {
    id: 'mmw-south-roofs',
    chapter: 'mckim-mead-white-1926',
    year: '1914–1926',
    title: 'Roof the south wings round the Roman court',
    detail: 'The south link\'s skylights and penthouse, and the end pavilion\'s hipped metal roof rising to the opening over the Roman court.',
    motion: { kind: 'drop', distance: 6 },
    stagger: '-x',
    focus: { kind: 'preset', id: 'aerial-sw' },
    build: buildSouthRoofs,
  },
];
