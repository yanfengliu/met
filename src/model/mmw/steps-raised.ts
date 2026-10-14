/**
 * The shared walls this area owns, carried up when the newer wings rose higher against them (party-walls.ts): one step in each of the newer wings' chapters.
 * The north step is composed into `roche-north-1980` through astorCourt1981Steps (index.ts); the south one waits for a slot in `roche-south-1990`.
 */
import type { StepDef } from '../../build/types.js';
import { buildRaisedWalls, NORTH_RAISES, SOUTH_RAISES } from './party-walls.js';

/** 1978–1980: the Morgan wing's north wall (X 118.0) against the Sackler Wing and its park wall (Z −96.0) against the American Wing. */
export const northWallsRaisedStep: StepDef = {
  id: 'mmw-north-walls-raised',
  chapter: 'roche-north-1980',
  year: '1978–1980',
  title: "Raise the Morgan wing's walls for the new wings",
  detail: 'The Sackler and American wings rise against the Morgan wing; its north and park walls go up to their roofs, closing the Temple of Dendur hall and the Engelhard Court.',
  motion: { kind: 'grow' },
  stagger: 'order',
  build: (kit) => {
    buildRaisedWalls(kit, NORTH_RAISES);
  },
};

/** 1982–1990: the south link's south wall (X −88.1) against the Rockefeller Wing and its park wall (Z −69.0) against the Kravis Wing. */
export const southWallsRaisedStep: StepDef = {
  id: 'mmw-south-walls-raised',
  chapter: 'roche-south-1990',
  year: '1982–1990',
  title: "Raise the south link's walls for the new wings",
  detail: 'The Rockefeller and Kravis wings rise higher than the south link; its south and park walls go up past their roofs to close their upper galleries.',
  motion: { kind: 'grow' },
  stagger: 'order',
  build: (kit) => {
    buildRaisedWalls(kit, SOUTH_RAISES);
  },
};
