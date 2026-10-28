/**
 * Chapter `weston-tuckerman-1894`: the first wings (history.md section 3). Wing B (core-1888-b, X −49.7..−14.5), Theodore Weston with Arthur L.
 * Tuckerman, 1884-88, whose south front became the museum's entrance; wing C (core-1894-c, X 14.5..49.4), 1889-94, in the same manner. Steps follow
 * history.md's proposal in constructional order; the picture galleries and their skylights come last, as in the Vaux building.
 */
import type { StepDef } from '../../build/types.js';
import { B_SOUTH_X, L1 } from './constants.js';
import { galleryWalls, laylightFrames, lightWellWalls, mainFloorWalls, roofWithSkylights } from './galleries.js';
import { WESTON_DOOR, westonOpenings, westonTrim, westonWalls } from './weston-facade.js';
import { ELEVATIONS, elevationTrim, elevationWalls, elevationWindows, wingFloors, wingFoundations } from './wings-walls.js';

const CHAPTER = 'weston-tuckerman-1894';
const B = ELEVATIONS.filter((e) => e.block === 'b');
const C = ELEVATIONS.filter((e) => e.block === 'c');

export const westonTuckermanSteps: readonly StepDef[] = [
  {
    id: 'wing-b-foundations',
    chapter: CHAPTER,
    year: '1884',
    title: 'Lay the south wing foundations',
    detail: "Footings and the basement floor of Weston's south wing, against the south side of the 1880 building.",
    motion: { kind: 'rise' },
    stagger: '-x',
    build: (kit) => {
      wingFoundations(kit, 'b');
    },
  },
  {
    id: 'wing-b-walls',
    chapter: CHAPTER,
    year: '1884–1888',
    title: 'Raise the south wing walls',
    detail: 'Brick walls on a stone base, bay by bay along the park front and the east side, with stone pilasters, a string course and a cornice.',
    motion: { kind: 'grow' },
    stagger: '-x',
    build: (kit) => {
      for (const e of B) {
        elevationWalls(kit, e);
        elevationTrim(kit, e);
      }
    },
  },
  {
    id: 'wing-b-south-facade',
    chapter: CHAPTER,
    year: '1888',
    title: "Build Weston's south facade",
    detail: 'The new main front: arched bays round an entrance pavilion with its porch and balcony. It survives as the north wall of the Petrie Court.',
    motion: { kind: 'grow' },
    stagger: 'order',
    weight: 1.3,
    focus: { kind: 'view', position: [B_SOUTH_X - 26, L1 + 4, -84], target: [B_SOUTH_X, L1 + 6, -104] },
    build: (kit) => {
      westonWalls(kit);
      westonTrim(kit);
    },
  },
  {
    id: 'wing-c-foundations',
    chapter: CHAPTER,
    year: '1889',
    title: 'Lay the north wing foundations',
    detail: "Footings and the basement floor of the north wing, against the 1880 building's north side.",
    motion: { kind: 'rise' },
    stagger: 'x',
    build: (kit) => {
      wingFoundations(kit, 'c');
    },
  },
  {
    id: 'wing-c-walls',
    chapter: CHAPTER,
    year: '1889–1894',
    title: 'Raise the north wing walls',
    detail: 'The north wing repeats the south wing: brick bays on a stone base, pilasters, string course and cornice on its west, north and east sides.',
    motion: { kind: 'grow' },
    stagger: 'x',
    build: (kit) => {
      for (const e of C) {
        elevationWalls(kit, e);
        elevationTrim(kit, e);
      }
    },
  },
  {
    id: 'wings-floors',
    chapter: CHAPTER,
    title: 'Lay the wings’ main and second floors',
    detail: 'Floor plates for both wings round the two light wells, and the north wing’s main stair to the picture galleries.',
    motion: { kind: 'drop' },
    stagger: 'y',
    build: wingFloors,
  },
  {
    id: 'wings-openings',
    chapter: CHAPTER,
    title: 'Glaze the windows and the south entrance',
    detail: 'Windows in both wings, the arched windows and the square-headed entrance door of the south front, and the porch of paired columns that carries its balcony.',
    motion: { kind: 'pop' },
    stagger: 'z',
    build: (kit) => {
      for (const e of ELEVATIONS) elevationWindows(kit, e);
      westonOpenings(kit);
    },
  },
  {
    id: 'wings-galleries',
    chapter: CHAPTER,
    title: 'Partition the rooms and picture galleries',
    detail: 'Main-floor rooms and the skylit second-floor picture galleries on the floor map’s grid, with the light wells’ walls and laylight frames.',
    motion: { kind: 'grow' },
    stagger: 'z',
    build: (kit) => {
      for (const block of ['b', 'c'] as const) {
        mainFloorWalls(kit, block, WESTON_DOOR);
        galleryWalls(kit, block);
        lightWellWalls(kit, block);
        laylightFrames(kit, block);
      }
    },
  },
  {
    id: 'wings-roofs',
    chapter: CHAPTER,
    title: 'Roof the wings round their gallery skylights',
    detail: 'Flat roofs with a ridge skylight over each picture gallery, open over the two light wells.',
    motion: { kind: 'drop' },
    stagger: 'z',
    weight: 1.2,
    build: (kit) => {
      roofWithSkylights(kit, 'b');
      roofWithSkylights(kit, 'c');
    },
  },
];
