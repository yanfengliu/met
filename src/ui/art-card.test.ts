/**
 * The artwork's card content from the catalogue (src/ui/art-card.ts `cardContent`; docs/design/spec.md, Collection: Labels): every one of the 94
 * entries gives a card with its title, its maker or, for a record naming neither artist nor culture, none (the stated fallback: the date alone), its
 * date, its medium, its gallery number and its object page on metmuseum.org under its own object ID, each record's text as plain text on one line (no
 * markup, line break or doubled space, as three titles carry them from the API); the size reads height by width by depth in
 * centimetres and names as estimated exactly the axes the catalogue does not take from the record (`sizeFrom` estimate or pick); the credit names The
 * Met and CC0, as the catalogue's own licence does.
 * Bound: the content, not the DOM; the card's element, its place and its link are driven in the browser (tests/e2e/labels.spec.ts).
 */
import { describe, expect, it } from 'vitest';

import { CATALOGUE, CATALOGUE_SOURCE } from '../model/collection/catalogue.js';
import type { CatalogueEntry } from '../model/collection/types.js';
import { ART_CREDIT, LOCKED_HINT, cardContent, plainText, sizeText } from './art-card.js';

const AXES = [['h', 'height'], ['w', 'width'], ['d', 'depth']] as const;

describe('the artwork’s card', () => {
  it('has every field it shows for every catalogue entry, or its stated fallback', () => {
    expect(CATALOGUE.length).toBe(94);
    const problems: string[] = [];
    for (const entry of CATALOGUE) {
      const card = cardContent(entry);
      const at = `${String(entry.id)} (${entry.title.slice(0, 40)})`;
      if (card.id !== String(entry.id)) problems.push(`${at}: id ${card.id}`);
      for (const [field, value] of [['title', card.title], ['date', card.date], ['medium', card.medium]] as const) {
        if (value === '' || value !== plainText(entry[field])) problems.push(`${at}: ${field} "${value}"`);
      }
      // The maker as the record gives it (the artist, else the culture); a record naming neither shows no maker, and the date alone.
      if (card.maker !== (entry.maker === '' ? null : plainText(entry.maker))) problems.push(`${at}: maker ${String(card.maker)} for "${entry.maker}"`);
      // Plain text on one line: no tag, no line break, no doubled or edge space.
      for (const [field, value] of [['title', card.title], ['maker', card.maker ?? ''], ['date', card.date], ['medium', card.medium]] as const) {
        if (/<\/?[a-z]|\s\s|[\n\r\t]|^\s|\s$/i.test(value)) problems.push(`${at}: ${field} is not plain one-line text: ${JSON.stringify(value)}`);
      }
      if (!/^Gallery \d+$/.test(card.gallery) || card.gallery !== `Gallery ${entry.gallery}`) problems.push(`${at}: ${card.gallery}`);
      if (card.url !== `https://www.metmuseum.org/art/collection/search/${String(entry.id)}`) problems.push(`${at}: link ${card.url}`);
    }
    expect(problems).toEqual([]);
    // The fallback is real: the Dendur hall's five Egyptian records name neither an artist nor a culture.
    expect(CATALOGUE.filter((e) => cardContent(e).maker === null).map((e) => e.id).sort()).toEqual([544442, 551889, 551890, 551893, 551894]);
  });

  it('shows a record’s markup and line breaks as plain text, keeping the words, and leaves a lone angle bracket alone', () => {
    const title = (id: number): string => {
      const entry = CATALOGUE.find((e) => e.id === id);
      if (entry === undefined) throw new Error(`No catalogue entry ${String(id)}.`);
      return cardContent(entry).title;
    };
    // The three titles the API gives with markup, a line break or a doubled space.
    expect(title(22907)).toBe('Jousting Armor (Rennzeug) and Matching Half-Shaffron');
    expect(title(851637)).toBe('Armor Garniture of George Clifford (1558–1605), Third Earl of Cumberland');
    expect(title(22761)).toBe('Cantle Plate (Rear Saddle Plate) From a Horse Armor Probably Made for Count Antonio IV Collalto (1548–1620)');
    expect(plainText('<em class="x">Rennzeug</em><br/>armour')).toBe('Rennzeug armour');
    expect(plainText('H < 2 m and W > 1 m')).toBe('H < 2 m and W > 1 m');
  });

  it('gives the size in centimetres, height by width by depth, and names the axes the record does not measure as estimated', () => {
    const problems: string[] = [];
    for (const entry of CATALOGUE) {
      const text = cardContent(entry).size;
      const values = AXES.map(([axis]) => String(Math.round(entry.size[axis] * 1000) / 10));
      const guessed = AXES.filter(([axis]) => entry.sizeFrom[axis] === 'estimate' || entry.sizeFrom[axis] === 'pick').map(([, name]) => name);
      const head = `H ${values[0] ?? ''} × W ${values[1] ?? ''} × D ${values[2] ?? ''} cm`;
      const want = guessed.length === 0 ? head : guessed.length === 3 ? `${head}, all estimated` : `${head}, ${guessed.join(' and ')} estimated`;
      if (text !== want) problems.push(`${String(entry.id)}: "${text}", not "${want}"`);
    }
    expect(problems).toEqual([]);
    // Every kind of marking occurs in the catalogue, so the rule is exercised: none, one axis, two, all three.
    const marks = new Set(CATALOGUE.map((e) => cardContent(e).size.replace(/^.* cm/, '')));
    expect([...marks].sort()).toEqual(expect.arrayContaining(['', ', depth estimated', ', width and depth estimated']));
  });

  it('marks a pick’s stand-in value and the kind’s proportions alike, and nothing the record measures', () => {
    const base: Pick<CatalogueEntry, 'size' | 'sizeFrom'> = { size: { h: 1.8, w: 0.684, d: 0.054 }, sizeFrom: { h: 'pick', w: 'estimate', d: 'estimate' } };
    expect(sizeText(base)).toBe('H 180 × W 68.4 × D 5.4 cm, all estimated');
    expect(sizeText({ ...base, sizeFrom: { h: 'measurements', w: 'dimensions', d: 'measurements' } })).toBe('H 180 × W 68.4 × D 5.4 cm');
    expect(sizeText({ ...base, sizeFrom: { h: 'measurements', w: 'pick', d: 'measurements' } })).toBe('H 180 × W 68.4 × D 5.4 cm, width estimated');
    expect(sizeText({ size: { h: 0.245, w: 0.093, d: 0.074 }, sizeFrom: { h: 'measurements', w: 'estimate', d: 'estimate' } })).toBe('H 24.5 × W 9.3 × D 7.4 cm, width and depth estimated');
  });

  it('credits The Met’s data as CC0, as the catalogue’s licence does, and says how a locked pointer reaches the link', () => {
    expect(CATALOGUE_SOURCE.licence).toMatch(/CC0/);
    expect(ART_CREDIT).toMatch(/The Met/);
    expect(ART_CREDIT).toMatch(/CC0/);
    expect(LOCKED_HINT).toMatch(/^Esc frees the pointer/);
  });
});
