/**
 * The generated catalogue, offline (src/model/collection/catalogue.ts, from scripts/met-catalogue.ts): one CC0 record per pick. Its 94 placeholders'
 * entries come first, in the picks' order, each with its fields, a size inside the rules (5 mm..25 m) and each dimension's source, a kind and display
 * the rules allow, a gallery of its space (or its pick's override), sRGB colours with a grid for each sampled painting, and its provenance (the API
 * URL, the fetch date, the record's and image's hashes). Then the 4 fit-out pieces' records, in their spaces' order (picks.ts `fitOut`): the same
 * metadata, gallery and provenance, a size from the record or, with its reason, from the pick, never an estimate by kind, and nothing of a
 * placeholder: no kind, no colour, no image. It also states the rules the placeholders rely on: frames hang on walls, objects under 0.6 m stand in
 * vitrines, and only a public-domain record with an image is sampled.
 * The two counts are pinned apart, so the catalogue growing by a fit-out record cannot pass for a placeholder, nor a placeholder dropped for a
 * fit-out record gained.
 * Bound: it reads the file as committed; that its values match the API today is the script's to establish when it is run (docs/research/collection.md).
 */
import { describe, expect, it } from 'vitest';

import { CATALOGUE, CATALOGUE_SOURCE } from './catalogue.js';
import { SPACES } from './picks.js';
import type { ArtDisplay, ArtKind, CatalogueEntry, FitOutEntry, PlaceholderEntry, SizeSource } from './types.js';

const KINDS: readonly ArtKind[] = ['figure', 'bust', 'vessel', 'slab', 'frame', 'plinth'];
const DISPLAYS: readonly ArtDisplay[] = ['plinth', 'vitrine', 'wall', 'floor'];
const SOURCES: readonly SizeSource[] = ['measurements', 'dimensions', 'estimate', 'pick'];
const HEX = /^#[0-9a-f]{6}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[0-9a-f]{16}$/;
/** How many placeholders the collection's steps build, and how many fit-out pieces carry a record: each pinned on its own. */
const PLACEHOLDERS = 94;
const FIT_OUT = 4;

const picks = SPACES.flatMap((space) => space.picks.map((pick) => ({ space, pick })));
const fitOutPicks = SPACES.flatMap((space) => (space.fitOut ?? []).map((pick) => ({ space, pick })));
const placeholders = CATALOGUE.filter((e): e is PlaceholderEntry => e.display !== 'fit-out');
const fitOut = CATALOGUE.filter((e): e is FitOutEntry => e.display === 'fit-out');
const byId = new Map<number, PlaceholderEntry>(placeholders.map((e) => [e.id, e]));
const key = (space: string, id: number): string => `${space}:${String(id)}`;

describe('the catalogue', () => {
  it(`holds ${String(PLACEHOLDERS)} placeholders and then ${String(FIT_OUT)} fit-out records, each kind counted on its own, and every object once`, () => {
    expect(placeholders.length, 'placeholders').toBe(PLACEHOLDERS);
    expect(fitOut.length, 'fit-out records').toBe(FIT_OUT);
    expect(CATALOGUE.length).toBe(PLACEHOLDERS + FIT_OUT);
    expect(picks.length, 'placeholder picks').toBe(PLACEHOLDERS);
    expect(fitOutPicks.length, 'fit-out picks').toBe(FIT_OUT);
    // Every placeholder before every fit-out record, so the placeholders' lines stand as a block a fit-out run leaves alone.
    expect(CATALOGUE.map((e) => e.display === 'fit-out').join(' ')).toBe([...placeholders.map(() => 'false'), ...fitOut.map(() => 'true')].join(' '));
    const ids = CATALOGUE.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), 'objects in the catalogue twice').toEqual([]);
  });

  it('holds one placeholder entry per pick, in the picks’ order, in its pick’s space', () => {
    expect(placeholders.map((e) => key(e.space, e.id))).toEqual(picks.map(({ space, pick }) => key(space.id, pick.id)));
  });

  it('holds one fit-out record per fit-out pick, in the spaces’ order, in its pick’s space, and no object as both', () => {
    expect(fitOut.map((e) => key(e.space, e.id))).toEqual(fitOutPicks.map(({ space, pick }) => key(space.id, pick.id)));
    expect(fitOutPicks.filter(({ pick }) => byId.has(pick.id)).map(({ pick }) => pick.id), 'picked as a placeholder and as a fit-out piece').toEqual([]);
  });

  it('fills at least eight spaces with five to twelve placeholders each, fit-out pieces not counted', () => {
    expect(SPACES.length).toBeGreaterThanOrEqual(8);
    for (const space of SPACES) expect(placeholders.filter((e) => e.space === space.id).length, space.id).toBeGreaterThanOrEqual(5);
    for (const space of SPACES) expect(placeholders.filter((e) => e.space === space.id).length, space.id).toBeLessThanOrEqual(12);
  });

  it('gives every entry, placeholder or fit-out, its metadata and provenance', () => {
    const problems: string[] = [];
    for (const e of CATALOGUE) {
      const where = String(e.id);
      if (e.title.trim() === '' || e.accession.trim() === '' || e.department.trim() === '') problems.push(`${where}: a title, accession number or department is empty`);
      if (e.date.trim() === '' || e.medium.trim() === '') problems.push(`${where}: a date or medium is empty, which the card shows`);
      if (e.url !== `https://www.metmuseum.org/art/collection/search/${where}`) problems.push(`${where}: url ${e.url}`);
      if (e.source.url !== `${CATALOGUE_SOURCE.api}${where}`) problems.push(`${where}: source ${e.source.url}`);
      if (!DAY.test(e.source.fetched) || !DAY.test(e.source.metadataDate) || !HASH.test(e.source.sha256)) problems.push(`${where}: provenance ${JSON.stringify(e.source)}`);
    }
    for (const e of placeholders) {
      if (e.image !== undefined && (!e.image.url.startsWith('https://images.metmuseum.org/') || !HASH.test(e.image.sha256) || e.image.width < 100 || e.image.height < 100)) problems.push(`${String(e.id)}: image ${JSON.stringify(e.image)}`);
    }
    expect(problems).toEqual([]);
    expect(CATALOGUE_SOURCE.licence).toContain('CC0');
    expect(CATALOGUE_SOURCE.api).toBe('https://collectionapi.metmuseum.org/public/collection/v1/objects/');
    expect(DAY.test(CATALOGUE_SOURCE.generated)).toBe(true);
    expect(CATALOGUE_SOURCE.sampler).toMatch(/sampler \d+/);
  });

  it('names a gallery of its space, or the one its pick overrides to', () => {
    const all: readonly CatalogueEntry[] = CATALOGUE;
    for (const { space, pick } of [...picks, ...fitOutPicks]) {
      const e = all.find((entry) => entry.id === pick.id);
      expect(e === undefined ? null : space.galleries.includes(e.gallery) || pick.gallery?.value === e.gallery, String(pick.id)).toBe(true);
    }
  });

  it('sizes every placeholder within 5 mm to 25 m, and says where each dimension came from, a pick’s override only where the pick sets it', () => {
    const problems: string[] = [];
    for (const { pick } of picks) {
      const e = byId.get(pick.id);
      if (e === undefined) continue;
      for (const axis of ['h', 'w', 'd'] as const) {
        const v = e.size[axis];
        if (!(Number.isFinite(v) && v >= 0.005 && v <= 25)) problems.push(`${String(e.id)}: ${axis} ${String(v)}`);
        if (!SOURCES.includes(e.sizeFrom[axis])) problems.push(`${String(e.id)}: ${axis} from ${e.sizeFrom[axis]}`);
        if ((e.sizeFrom[axis] === 'pick') !== (pick.size?.[axis] !== undefined)) problems.push(`${String(e.id)}: ${axis} from ${e.sizeFrom[axis]}, pick ${JSON.stringify(pick.size)}`);
        if (pick.size?.[axis] !== undefined && e.size[axis] !== pick.size[axis]) problems.push(`${String(e.id)}: ${axis} ${String(v)}, the pick says ${String(pick.size[axis])}`);
      }
      if (e.kind === 'frame' && e.sizeFrom.d === 'estimate' && e.size.d !== 0.05) problems.push(`${String(e.id)}: a frame's estimated depth is ${String(e.size.d)}`);
    }
    expect(problems).toEqual([]);
  });

  it('gives every placeholder a kind and a display the rules allow: frames on walls, under 0.6 m in a vitrine', () => {
    const problems: string[] = [];
    for (const { pick } of picks) {
      const e = byId.get(pick.id);
      if (e === undefined) continue;
      if (!KINDS.includes(e.kind) || !DISPLAYS.includes(e.display)) problems.push(`${String(e.id)}: kind ${e.kind}, display ${e.display}`);
      if ((e.kindFrom === 'pick') !== (pick.kind !== undefined) || (e.displayFrom === 'pick') !== (pick.display !== undefined)) problems.push(`${String(e.id)}: kind from ${e.kindFrom}, display from ${e.displayFrom}`);
      if (e.displayFrom === 'rule') {
        const largest = Math.max(e.size.h, e.size.w, e.size.d);
        const expected: ArtDisplay = e.kind === 'frame' ? 'wall' : largest < 0.6 ? 'vitrine' : e.kind === 'slab' ? 'wall' : 'plinth';
        if (e.display !== expected) problems.push(`${String(e.id)}: ${e.kind} of ${String(largest)} m shown on ${e.display}, the rule says ${expected}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('colours every placeholder in sRGB, from its image only when it is public domain and has one, with a grid for a sampled painting', () => {
    const problems: string[] = [];
    for (const e of placeholders) {
      const where = String(e.id);
      if (!HEX.test(e.colour)) problems.push(`${where}: colour ${e.colour}`);
      if (e.colourFrom === 'image' && (!e.publicDomain || e.image === undefined)) problems.push(`${where}: coloured from an image it may not use`);
      if (e.colourFrom !== 'image' && e.image !== undefined) problems.push(`${where}: an image recorded but not used`);
      if (!e.publicDomain && e.image !== undefined) problems.push(`${where}: an image sampled for a record that is not public domain`);
      const gridded = e.kind === 'frame' && e.colourFrom === 'image';
      if (gridded !== (e.grid !== undefined)) problems.push(`${where}: grid ${e.grid === undefined ? 'missing' : 'unexpected'}`);
      if (e.grid !== undefined && (e.grid.length !== 64 || !e.grid.every((c) => HEX.test(c)))) problems.push(`${where}: grid of ${String(e.grid.length)}`);
    }
    expect(problems).toEqual([]);
    // Nearly all the picks are public domain: the colours are mostly sampled, not fallbacks.
    expect(placeholders.filter((e) => e.colourFrom === 'image').length).toBeGreaterThan(placeholders.length * 0.8);
  });

  it('keeps of a fit-out piece its record alone: a size from the record or the pick, never an estimate, and nothing of a placeholder', () => {
    const problems: string[] = [];
    /** Every key a fit-out record holds, in the order the script writes them: the metadata, the mark, the size and the provenance. */
    const KEYS = ['id', 'space', 'accession', 'title', 'maker', 'date', 'medium', 'objectName', 'classification', 'department', 'gallery', 'creditLine', 'url', 'publicDomain', 'display', 'size', 'sizeFrom', 'element', 'source'];
    for (const { pick } of fitOutPicks) {
      const e = fitOut.find((entry) => entry.id === pick.id);
      if (e === undefined) continue;
      const where = `${String(e.id)} (${e.title.slice(0, 40)})`;
      // No kind, kindFrom, displayFrom, colour, colourFrom, grid, image, pedestal or framed: a key beyond the record's own would be one of them.
      if (Object.keys(e).join(' ') !== KEYS.join(' ')) problems.push(`${where}: keys ${Object.keys(e).join(', ')}`);
      if (pick.kind !== undefined || pick.display !== undefined) problems.push(`${where}: its pick sets a kind or a display, which only a placeholder has`);
      for (const axis of ['h', 'w', 'd'] as const) {
        const v = e.size[axis];
        if (!(Number.isFinite(v) && v >= 0.005 && v <= 25)) problems.push(`${where}: ${axis} ${String(v)}`);
        if (e.sizeFrom[axis] === 'estimate' || !SOURCES.includes(e.sizeFrom[axis])) problems.push(`${where}: ${axis} from ${e.sizeFrom[axis]}; a fit-out piece takes no estimate by kind`);
        if ((e.sizeFrom[axis] === 'pick') !== (pick.size?.[axis] !== undefined)) problems.push(`${where}: ${axis} from ${e.sizeFrom[axis]}, pick ${JSON.stringify(pick.size)}`);
        if (pick.size?.[axis] !== undefined && e.size[axis] !== pick.size[axis]) problems.push(`${where}: ${axis} ${String(v)}, the pick says ${String(pick.size[axis])}`);
      }
      if (pick.size !== undefined && pick.size.reason.trim().length < 20) problems.push(`${where}: its pick gives a dimension without saying why`);
    }
    expect(problems).toEqual([]);
    // Both sources occur, so the rule is exercised: the temple and Diana are measured on every axis, the screen and the loggia take their depth from the pick.
    expect(fitOut.map((e) => `${String(e.id)} ${e.sizeFrom.h} ${e.sizeFrom.w} ${e.sizeFrom.d}`)).toEqual([
      '547802 measurements measurements measurements',
      '201926 measurements measurements pick',
      '11998 measurements measurements measurements',
      '133 measurements measurements pick',
    ]);
  });
});
