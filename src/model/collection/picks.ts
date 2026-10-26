/**
 * The objects on view chosen for each space (docs/research/collection.md, Picks): The Met's object IDs, from the read-only survey of 2026-10-25
 * (worker met-api), each confirmed on view in that space by its record's GalleryNumber. scripts/met-catalogue.ts reads this file and writes catalogue.ts;
 * the spaces' steps place what it lists. Five to twelve objects a space. An override says what it changes and why; the script checks every one.
 * Data only, with no run-time import, so Node can load it without a bundler.
 */
import type { SpacePicks } from './types.js';

export const SPACES: readonly SpacePicks[] = [
  {
    id: 'temple-of-dendur',
    title: 'The Temple of Dendur',
    galleries: ['131'],
    // The Sphinx of Hatshepsut, two column capitals and the two bronze crabs from the base of Cleopatra's Needle.
    picks: [
      { id: 544442 },
      { id: 551889 },
      { id: 551890 },
      { id: 551893 },
      { id: 551894, size: { w: 0.6, reason: 'the record gives no width; its pair, 551893, from the same base of the obelisk, is 0.6 m across' } },
    ],
  },
  {
    id: 'greek-roman-court',
    title: 'The Leon Levy and Shelby White Court',
    galleries: ['162'],
    picks: [
      { id: 247000 },
      { id: 247001 },
      { id: 255973 },
      { id: 254925 },
      { id: 254697 },
      { id: 248132 },
      { id: 252469 },
      { id: 248891 },
      { id: 256127 },
      { id: 248851 },
      { id: 254608 },
      { id: 255210 },
    ],
  },
  {
    id: 'arms-and-armor-court',
    title: 'The Arms and Armor Court',
    galleries: ['371'],
    picks: [
      { id: 24696 },
      { id: 35935 },
      { id: 22973 },
      { id: 35936 },
      { id: 851637 },
      { id: 22907, size: { h: 1.8, reason: 'a man’s jousting armour as mounted; the record gives only the weights of its parts, and the other standing armours of the court are 1.73 to 1.82 m' } },
      { id: 22761 },
    ],
  },
  {
    id: 'medieval-sculpture-hall',
    title: 'The Medieval Sculpture Hall',
    galleries: ['305'],
    // Twelve statues of the Virgin and Child, one in each bay of the two aisles.
    picks: [
      { id: 467594 },
      { id: 463706 },
      { id: 463969 },
      { id: 464593 },
      { id: 466144 },
      { id: 466582 },
      { id: 467508 },
      { id: 467743 },
      { id: 467992 },
      { id: 467996 },
      { id: 468046 },
      { id: 474389 },
    ],
  },
  {
    id: 'engelhard-court',
    title: 'The Charles Engelhard Court',
    galleries: ['700'],
    // Six marbles and bronzes round the court and the two fountain bronzes in its pool.
    picks: [{ id: 12004 }, { id: 11951 }, { id: 11952 }, { id: 10105 }, { id: 10909 }, { id: 11476 }, { id: 11477 }, { id: 12547 }],
  },
  {
    id: 'petrie-court',
    title: 'The Carroll and Milton Petrie European Sculpture Court',
    galleries: ['548'],
    picks: [
      { id: 204758 },
      { id: 204812 },
      { id: 211505 },
      { id: 204804 },
      { id: 208619 },
      { id: 192714 },
      { id: 204619 },
      { id: 204620 },
      { id: 231004 },
      { id: 824469 },
    ],
  },
  {
    id: 'lehman-wing',
    title: 'The Robert Lehman Wing',
    galleries: ['952', '953', '956', '957', '958'],
    // Paintings of the Lehman collection in the rooms round the gallery ring, each in its own room.
    picks: [
      { id: 459082 },
      { id: 459090 },
      { id: 459087 },
      { id: 459088 },
      { id: 459093 },
      { id: 459106 },
      { id: 459052 },
      { id: 459055 },
      { id: 459080 },
      { id: 458998 },
      { id: 459016 },
      { id: 458978 },
    ],
  },
  {
    id: 'great-hall-balcony',
    title: 'The Great Hall Balcony',
    galleries: ['202', '203', '204', '205'],
    // Chinese ceramics in cases along the balcony's back walls.
    picks: [
      { id: 39666 },
      { id: 42193 },
      { id: 50842 },
      { id: 52798 },
      { id: 76452 },
      { id: 61430 },
      { id: 42480 },
      { id: 42509 },
      { id: 44745 },
      { id: 50263 },
      { id: 64484 },
      { id: 42449 },
    ],
  },
  {
    id: 'european-paintings-600',
    title: 'European Paintings, galleries 600 to 602',
    galleries: ['600', '601', '602'],
    // Tiepolo's three canvases from the Ca' Dolfin in gallery 600, Giotto's Adoration in 601, Filippo Lippi and Memling in 602.
    picks: [{ id: 437788 }, { id: 437794 }, { id: 437795 }, { id: 436504 }, { id: 436896 }, { id: 437056 }],
  },
  {
    id: 'greek-galleries',
    title: 'Greek Art, gallery 153',
    galleries: ['153'],
    picks: [
      { id: 247173 },
      { id: 251929 },
      { id: 253373 },
      { id: 251838 },
      { id: 248899 },
      { id: 248268 },
      { id: 247964 },
      { id: 248902 },
      { id: 252973 },
      { id: 247967 },
    ],
  },
];
