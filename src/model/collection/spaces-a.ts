/**
 * Collection steps of five spaces (docs/research/collection.md, Placements): the Temple of Dendur, the Leon Levy and Shelby White Court, the Arms and Armor
 * Court, the Medieval Sculpture Hall and the Engelhard Court. Positions are world metres read from the model's own sources (each named), never from the
 * floor map directly, so none needs the map's −3.1 m Z shift; src/model/collection/placement.test.ts checks each artwork stands on its floor or hangs on
 * its wall, clear of every other solid and 1 m clear of the walking routes, the Weston door's passage and the doors' swings.
 */
import { MAIN_FLOOR_Y } from '../frame.js';
import { LEVEL_1 } from '../mmw/dims.js';
import { mmwMaterials } from '../mmw/materials.js';
import { palette } from '../palette.js';
import { ARMOR_COURT, ROMAN_COURT } from '../mmw/wings.js';
import { BEDS, COURT, COURT_POOL, PLATFORM_Y } from '../roche-north/plan.js';
import { HALL_PIER_Z } from '../core/constants.js';
import { collectionStep } from './place.js';
import type { CollectionStepDef, Placement } from './place.js';

const FACE = { north: Math.PI / 2, south: -Math.PI / 2, east: 0, west: Math.PI } as const;

// --- The Temple of Dendur (gallery 131; roche-north/plan.ts) ----------------------------------------------------------------------------------
// The sphinx on the terrace before the gate, 3.8 m from the pool's north arm and 9 m off the gate's axis; the capitals on the platform's south side and
// the crabs on its north side, each more than 3 m from the dais and the side flights. All face east, the way visitors come in (route R3).
const DENDUR: readonly Placement[] = [
  { id: 544442, x: 142.5, z: -58.0, floor: PLATFORM_Y, facing: FACE.east },
  { id: 551889, x: 123.4, z: -84.0, floor: PLATFORM_Y, facing: FACE.east },
  { id: 551890, x: 123.4, z: -76.0, floor: PLATFORM_Y, facing: FACE.east },
  { id: 551893, x: 143.2, z: -82.5, floor: PLATFORM_Y, facing: FACE.east },
  { id: 551894, x: 143.2, z: -78.0, floor: PLATFORM_Y, facing: FACE.east },
];

export const dendurSpace: CollectionStepDef = {
  id: 'collection-temple-of-dendur',
  chapter: 'roche-north-1980',
  year: '1978',
  title: 'Objects on view by the Temple of Dendur',
  detail: 'The Sphinx of Hatshepsut on the terrace, two column capitals and the bronze crabs from the base of Cleopatra’s Needle on the platform, at their real size.',
  focus: { kind: 'preset', id: 'int-dendur-se' },
  space: 'temple-of-dendur',
  placements: DENDUR,
};
export const dendurCollectionStep = collectionStep(dendurSpace);

// --- The Leon Levy and Shelby White Court (gallery 162; mmw/greek-court.ts) ---------------------------------------------------------------------
// The eight large figures on the spots inside the peristyle, on its green marble field (4 cm over the main floor), facing the basin; the small ones in
// the porticoes, off the white inlay lines across them (Z −28.65..−28.53 and −6.02..−5.90), on the dark field 3 cm over the floor.
const [, COURT_Z0, , COURT_Z1] = ROMAN_COURT;
const FIELD = LEVEL_1 + 0.04;
const PORTICO = LEVEL_1 + 0.03;
const ROMAN: readonly Placement[] = [
  { id: 247000, x: -129.1, z: -22.4, floor: FIELD, facing: FACE.east },
  { id: 247001, x: -129.1, z: -12.8, floor: FIELD, facing: FACE.west },
  { id: 255973, x: -124.2, z: -22.4, floor: FIELD, facing: FACE.east },
  { id: 254925, x: -124.2, z: -12.8, floor: FIELD, facing: FACE.west },
  { id: 254697, x: -114.4, z: -22.4, floor: FIELD, facing: FACE.east },
  { id: 248132, x: -114.4, z: -12.8, floor: FIELD, facing: FACE.west },
  { id: 252469, x: -109.5, z: -22.4, floor: FIELD, facing: FACE.east },
  { id: 248891, x: -109.5, z: -12.8, floor: FIELD, facing: FACE.west },
  { id: 256127, x: -136.0, z: COURT_Z0 + 2.65, floor: PORTICO, facing: FACE.east },
  { id: 248851, x: -102.6, z: COURT_Z0 + 2.65, floor: PORTICO, facing: FACE.east },
  { id: 254608, x: -136.0, z: COURT_Z1 - 2.5, floor: PORTICO, facing: FACE.west },
  { id: 255210, x: -102.6, z: COURT_Z1 - 2.5, floor: PORTICO, facing: FACE.west },
];

export const greekCourtSpace: CollectionStepDef = {
  id: 'collection-greek-roman-court',
  chapter: 'koch-plaza-2014',
  year: '2007',
  title: 'Set the Roman court’s marbles and bronzes',
  detail: 'Two Hercules, Dionysos leaning on a female figure, Hermes and Aphrodite stand round the basin, smaller marbles in cases in the porticoes, as reinstalled in 2007.',
  focus: { kind: 'preset', id: 'int-greek-roman-court' },
  space: 'greek-roman-court',
  placements: ROMAN,
  // interior-images.md #P6: the court's marbles stand on dark grey pedestals.
  plinth: mmwMaterials.pedestalGrey,
};
export const greekCourtCollectionStep = collectionStep(greekCourtSpace);

// --- The Arms and Armor Court (gallery 371; mmw/armor-court.ts) --------------------------------------------------------------------------------
// Standing armours on the strips between the parade's platform (Z −81.6..−77.2) and the glazed cases on the long walls, each opposite a case (X 61.0,
// 70.4, 79.4) and clear of the doors (X 65.9, 74.9, 83.8), facing the parade; the cantle plate in a vitrine by the last case.
const [, ARMOR_Z0, , ARMOR_Z1] = ARMOR_COURT;
const ARMOR_FLOOR = LEVEL_1 + 0.03;
const SOUTH_STRIP = ARMOR_Z0 + 3.4;
const NORTH_STRIP = ARMOR_Z1 - 3.4;
const ARMOR: readonly Placement[] = [
  { id: 24696, x: 62.4, z: SOUTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.east },
  { id: 35935, x: 70.4, z: SOUTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.east },
  { id: 22973, x: 79.4, z: SOUTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.east },
  { id: 35936, x: 62.4, z: NORTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.west },
  { id: 851637, x: 70.4, z: NORTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.west },
  { id: 22907, x: 79.4, z: NORTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.west },
  { id: 22761, x: 88.4, z: SOUTH_STRIP, floor: ARMOR_FLOOR, facing: FACE.east },
];

export const armorSpace: CollectionStepDef = {
  id: 'collection-arms-and-armor-court',
  chapter: 'mckim-mead-white-1926',
  year: '1956',
  title: 'Stand armours either side of the parade',
  detail: 'Armours for field and tournament, among them the Earl of Cumberland’s garniture, stand facing the mounted procession, with a horse armour’s cantle plate in a case.',
  focus: { kind: 'preset', id: 'int-arms-armor-court' },
  space: 'arms-and-armor-court',
  placements: ARMOR,
};
export const armorCollectionStep = collectionStep(armorSpace);

// --- The Medieval Sculpture Hall (gallery 305; core/constants.ts, core/medieval-hall.ts) --------------------------------------------------------
// One Virgin and Child in each bay of both aisles, midway between the piers (HALL_PIER_Z), before the solid stretch of the aisle wall and 1.8 m off it,
// facing the nave across the aisle.
const BAYS: readonly number[] = HALL_PIER_Z.slice(0, -1).map((z, i) => (z + (HALL_PIER_Z[i + 1] ?? z)) / 2);
const AISLE_X = 11.8;
const MEDIEVAL_IDS = [467594, 463706, 463969, 464593, 466144, 466582, 467508, 467743, 467992, 467996, 468046, 474389] as const;
const MEDIEVAL: readonly Placement[] = MEDIEVAL_IDS.map((id, k) => {
  const north = k < 6;
  return { id, x: north ? AISLE_X : -AISLE_X, z: BAYS[k % 6] ?? 0, floor: MAIN_FLOOR_Y, facing: north ? FACE.south : FACE.north };
});

export const medievalSpace: CollectionStepDef = {
  id: 'collection-medieval-sculpture-hall',
  chapter: 'mckim-mead-white-1926',
  year: '1956',
  title: 'Set twelve Virgins and Child in the aisles',
  detail: 'Statues of the Virgin and Child in stone, wood and alabaster, French, German, Italian, Spanish and English, from about 1275 to 1525, one in each bay of the aisles.',
  focus: { kind: 'preset', id: 'int-medieval-hall-east' },
  space: 'medieval-sculpture-hall',
  placements: MEDIEVAL,
};
export const medievalCollectionStep = collectionStep(medievalSpace);

// --- The Charles Engelhard Court (gallery 700; roche-north/plan.ts, roche-north/engelhard.ts) ------------------------------------------------------
// The six spots round the court that the generic marbles held (2 m and 1.6 m in from the colonnades, 1.4 m before the planting beds), and the two
// fountain bronzes on blocks in the pool, standing on its floor, the court's, under the water.
const ENGELHARD: readonly Placement[] = [
  { id: 12004, x: 61.5, z: COURT.minZ + 2.0, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 11951, x: 61.5, z: COURT.maxZ - 2.0, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 10105, x: 76.0, z: COURT.minZ + 1.6, floor: MAIN_FLOOR_Y, facing: FACE.east },
  { id: 10909, x: 76.0, z: COURT.maxZ - 1.6, floor: MAIN_FLOOR_Y, facing: FACE.west },
  { id: 11476, x: 80.6, z: BEDS.southMaxZ - 1.4, floor: MAIN_FLOOR_Y, facing: FACE.south },
  { id: 11952, x: 80.6, z: BEDS.northMinZ + 1.4, floor: MAIN_FLOOR_Y, facing: FACE.south },
  { id: 11477, x: 64.5, z: COURT_POOL.minZ + 1.6, floor: MAIN_FLOOR_Y, facing: FACE.south, plinth: 0.55 },
  { id: 12547, x: 64.5, z: COURT_POOL.maxZ - 1.6, floor: MAIN_FLOOR_Y, facing: FACE.south, plinth: 0.55 },
];

export const engelhardSpace: CollectionStepDef = {
  id: 'collection-engelhard-court',
  chapter: 'roche-north-1980',
  year: '1980',
  title: 'Set the American sculpture round the court',
  detail: 'Barnard’s Struggle of the Two Natures in Man, French’s Angel of Death, Saint-Gaudens’s Hiawatha and Rogers’s Nydia and Ruth stand round the court; two bronzes play in the pool.',
  focus: { kind: 'preset', id: 'int-engelhard-north' },
  space: 'engelhard-court',
  placements: ENGELHARD,
  // interior-images.md #P5 and #18: the court's marbles stand on grey stone pedestals, as the generic ones before them did.
  plinth: palette.granite,
};
export const engelhardCollectionStep = collectionStep(engelhardSpace);

/** This file's spaces, for the placement test. */
export const SPACES_A: readonly CollectionStepDef[] = [dendurSpace, greekCourtSpace, armorSpace, medievalSpace, engelhardSpace];
