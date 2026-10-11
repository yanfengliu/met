/**
 * The core area's later steps: the Medieval Sculpture Hall of 1936-39 inside the Vaux building, with the Valladolid choir screen installed in 1956
 * (chapter `mckim-mead-white-1926`; interior.md, "The Medieval Sculpture Hall"), and the European Paintings galleries' renewed skylights, glazed 2018-23
 * (chapter `koch-plaza-2014`; interior.md and exterior.md [R2]: 30,000 sq ft of laminated insulated glass by Beyer Blinder Belle).
 */
import type { StepDef } from '../../build/types.js';
import { choirScreen } from './choir-screen.js';
import { L1 } from './constants.js';
import { skylightAndLaylightGlass } from './galleries.js';
import { hallArcades, hallClerestoryVault, hallFloor, hallPiers } from './medieval-hall.js';

const HALL = 'mckim-mead-white-1926';
/** A view down the hall from its west end, the screen in the middle (P8's viewpoint, see the handoff for the preset). */
const HALL_VIEW = { kind: 'view', position: [0, L1 + 1.6, -112.9], target: [0, L1 + 11.8, -92.9] } as const;

export const medievalHallSteps: readonly StepDef[] = [
  {
    id: 'medieval-hall-floor',
    chapter: HALL,
    year: '1939',
    title: 'Lay the Medieval Sculpture Hall floor',
    detail: "Otto R. Eggers's hall fills Vaux's central hall; first a floor of white marble and dark slate, laid from the centre.",
    motion: { kind: 'drop', distance: 2 },
    stagger: 'radial',
    focus: HALL_VIEW,
    build: hallFloor,
  },
  {
    id: 'medieval-hall-piers',
    chapter: HALL,
    year: '1939',
    title: 'Raise two rows of piers in six bays',
    detail: 'Fourteen compound piers, the end ones against the end walls; the shafts toward the nave rise on to carry the vault.',
    motion: { kind: 'grow' },
    stagger: 'z',
    focus: HALL_VIEW,
    build: hallPiers,
  },
  {
    id: 'medieval-hall-arcades',
    chapter: HALL,
    year: '1939',
    title: 'Turn the pointed arcades to the aisles',
    detail: 'Pointed arches between the piers open the nave to its aisles, under the picture galleries of the second floor.',
    motion: { kind: 'grow' },
    stagger: 'z',
    focus: HALL_VIEW,
    build: hallArcades,
  },
  {
    id: 'medieval-hall-clerestory-vault',
    chapter: HALL,
    year: '1939',
    title: 'Build the clerestory and the groin vault',
    detail: 'Nave walls with round-headed clerestory windows, a white groin vault on transverse ribs, plaster end walls with balconies; the hall opens in January 1939.',
    motion: { kind: 'drop' },
    stagger: 'z',
    weight: 1.2,
    focus: HALL_VIEW,
    build: hallClerestoryVault,
  },
  {
    id: 'medieval-hall-choir-screen',
    chapter: HALL,
    year: '1956',
    title: 'Install the Valladolid choir screen',
    detail: 'The 1763 wrought-iron screen from Valladolid Cathedral, 15.85 m high and 12.80 m wide, gilded and painted, across the nave between its middle piers.',
    motion: { kind: 'drop', distance: 4 },
    stagger: 'y',
    weight: 1.2,
    focus: HALL_VIEW,
    build: choirScreen,
  },
];

export const europeanPaintingsGlazing2023Steps: readonly StepDef[] = [
  {
    id: 'skylights-2023',
    chapter: 'koch-plaza-2014',
    year: '2023',
    title: 'Glaze the European Paintings skylights',
    detail: 'New laminated glass in every gallery skylight and laylight over the old core, about 30,000 sq ft, replaced from 2018 and finished in 2023.',
    motion: { kind: 'slide', from: [0, 3, 0] },
    stagger: 'z',
    weight: 1.2,
    build: (kit) => {
      for (const block of ['a', 'b', 'c'] as const) skylightAndLaylightGlass(kit, block);
    },
  },
];
