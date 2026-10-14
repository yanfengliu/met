/**
 * The two building campaigns of the McKim, Mead & White wings as build steps, in constructional order: foundations and the ground floor, the outer walls,
 * the upper floors, the galleries' walls, then the fronts' windows, orders and cornices. North: Wing E (1906–1911), the Morgan wing F (1908–1910) and the north
 * end pavilion H (1910–1913). South: Wing J (1914–1917) and the south end pavilion K (1914–1926). Dates: docs/research/history.md, Chronology (L77).
 */
import type { StepDef } from '../../build/types.js';
import { buildFrontCornices, buildFrontOrders, buildFrontWalls, buildFrontWindows } from './facade.js';
import { NORTH_FRONT, SOUTH_FRONT } from './facade-layout.js';
import type { Front } from './facade-layout.js';
import { buildPartyWalls, NORTH_PARTY, SOUTH_PARTY } from './party-walls.js';
import { buildFloors, buildFoundations, buildPartitions } from './structure.js';
import { ARMOR_COURT, ROMAN_COURT, WINGS } from './wings.js';
import type { Rect, Wing } from './wings.js';

interface Campaign {
  readonly key: 'north' | 'south';
  readonly year: string;
  readonly wings: readonly Wing[];
  readonly front: Front;
  readonly party: Parameters<typeof buildPartyWalls>[1];
  /** Courts whose own steps build their walls, so the galleries' step leaves them out. */
  readonly courts: readonly Rect[];
  readonly outward: 'x' | '-x';
  readonly words: {
    readonly wings: string;
    readonly foundations: string;
    readonly walls: string;
    readonly floors: string;
    readonly galleries: string;
    readonly windows: string;
    readonly orders: string;
    readonly cornices: string;
  };
}

const wingsOf = (...blocks: readonly Wing['block'][]): Wing[] => WINGS.filter((w) => blocks.includes(w.block));

const NORTH: Campaign = {
  key: 'north',
  year: '1906–1913',
  wings: wingsOf('north-e', 'north-f', 'north-h'),
  front: NORTH_FRONT,
  party: NORTH_PARTY,
  courts: [ARMOR_COURT],
  outward: 'x',
  words: {
    wings: 'north wings',
    foundations: 'Footings and ground floors for the north link (Wing E, 1906), the Morgan wing behind it (F, 1908) and the north end pavilion (H, 1910).',
    walls: 'Limestone walls rise bay by bay along Fifth Avenue to the 84th Street corner, with the rear walls that later face the Sackler and American wings.',
    floors: 'The main and second floors, and the pavilion\'s third floor behind its frieze; the Morgan wing\'s floors stop round the open court.',
    galleries: 'Gallery walls on the room lines of today\'s floor plan: Egyptian galleries below, Asian art and musical instruments above.',
    windows: 'Bronze arched windows light the main storey; grilled windows the ground floor; a door in the link\'s middle bay.',
    orders: 'Tuscan pilasters frame the link\'s seven arches; a giant Corinthian order rises the pavilion\'s full height between niched end bays.',
    cornices: 'The link\'s dentilled cornice meets the soffit of Hunt\'s; the pavilion\'s frieze, modillioned cornice and parapet run on to 84th Street.',
  },
};

const SOUTH: Campaign = {
  key: 'south',
  year: '1914–1926',
  wings: wingsOf('south-j', 'south-k'),
  front: SOUTH_FRONT,
  party: SOUTH_PARTY,
  courts: [ROMAN_COURT],
  outward: '-x',
  words: {
    wings: 'south wings',
    foundations: 'Footings and ground floors for the south link (Wing J, 1914) and the south end pavilion (K) whose Roman court opened in 1926.',
    walls: 'The south front repeats the north\'s bays from Hunt\'s wing to the 80th Street corner; rear walls later meet the Rockefeller and Kravis wings.',
    floors: 'Main floor, the end pavilion\'s mezzanine and the second floor, left open over the Roman court.',
    galleries: 'Gallery walls on today\'s room lines: Greek and Roman art on the main floor and mezzanine, Ancient Near East and Islamic art above.',
    windows: 'Bronze arched windows, grilled ground-floor windows, and the 81st Street door in the south link\'s middle bay.',
    orders: 'The same Tuscan arcade on the link and giant Corinthian order on the end pavilion, finishing the thousand-foot front.',
    cornices: 'The south front\'s water table, entablature and cornices, the pavilion\'s parapet over them, closing the line from 80th to 84th Street.',
  },
};

function campaignSteps(c: Campaign): StepDef[] {
  const id = (part: string): string => `mmw-${c.key}-${part}`;
  const w = c.words;
  return [
    { id: id('foundations'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Lay the ${w.wings}' foundations`, detail: w.foundations, motion: { kind: 'rise' }, stagger: c.outward, build: (kit) => { buildFoundations(kit, c.wings); } },
    {
      id: id('walls'),
      chapter: 'mckim-mead-white-1926',
      year: c.year,
      title: `Raise the ${w.wings}' limestone walls`,
      detail: w.walls,
      motion: { kind: 'grow' },
      stagger: 'order',
      weight: 1.5,
      build: (kit) => {
        buildFrontWalls(kit, c.front);
        buildPartyWalls(kit, c.party, 100);
      },
    },
    { id: id('floors'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Lay the ${w.wings}' upper floors`, detail: w.floors, motion: { kind: 'drop', distance: 6 }, stagger: 'y', build: (kit) => { buildFloors(kit, c.wings); } },
    { id: id('galleries'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Wall off the ${w.wings}' galleries`, detail: w.galleries, motion: { kind: 'grow' }, stagger: c.outward, build: (kit) => { buildPartitions(kit, c.wings, c.courts); } },
    { id: id('windows'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Glaze the ${w.wings}' windows`, detail: w.windows, motion: { kind: 'pop' }, stagger: 'order', build: (kit) => { buildFrontWindows(kit, c.front); } },
    { id: id('orders'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Set the ${w.wings}' pilasters and arches`, detail: w.orders, motion: { kind: 'rise', distance: 4 }, stagger: 'order', build: (kit) => { buildFrontOrders(kit, c.front); } },
    { id: id('cornices'), chapter: 'mckim-mead-white-1926', year: c.year, title: `Crown the ${w.wings} with their cornice`, detail: w.cornices, motion: { kind: 'drop', distance: 5 }, stagger: 'order', build: (kit) => { buildFrontCornices(kit, c.front); } },
  ];
}

export const northFrontSteps: readonly StepDef[] = campaignSteps(NORTH);
export const southFrontSteps: readonly StepDef[] = campaignSteps(SOUTH);
