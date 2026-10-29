/**
 * The generated catalogue, offline (src/model/collection/catalogue.ts, from scripts/met-catalogue.ts): one CC0 record per pick, in the picks' order, each
 * with its fields, a size inside the rules (5 mm..25 m) and each dimension's source, a kind and display the rules allow, a gallery of its space (or
 * its pick's override), sRGB colours with a grid for each sampled painting, and its provenance (the API URL, the fetch date, the record's and image's
 * hashes). It also states the rules the placeholders rely on: frames hang on walls, objects under 0.6 m stand in vitrines, and only a public-domain
 * record with an image is sampled.
 * Bound: it reads the file as committed; that its values match the API today is the script's to establish when it is run (docs/research/collection.md).
 */
import { describe, expect, it } from 'vitest';

import { CATALOGUE, CATALOGUE_SOURCE } from './catalogue.js';
import { SPACES } from './picks.js';
import type { ArtDisplay, ArtKind, CatalogueEntry, SizeSource } from './types.js';

const KINDS: readonly ArtKind[] = ['figure', 'bust', 'vessel', 'slab', 'frame', 'plinth'];
const DISPLAYS: readonly ArtDisplay[] = ['plinth', 'vitrine', 'wall', 'floor'];
const SOURCES: readonly SizeSource[] = ['measurements', 'dimensions', 'estimate', 'pick'];
const HEX = /^#[0-9a-f]{6}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[0-9a-f]{16}$/;

const picks = SPACES.flatMap((space) => space.picks.map((pick) => ({ space, pick })));
const byId = new Map<number, CatalogueEntry>(CATALOGUE.map((e) => [e.id, e]));

describe('the catalogue', () => {
  it('holds one entry per pick, in the picks’ order, in its pick’s space', () => {
    expect(CATALOGUE.map((e) => `${e.space}:${String(e.id)}`)).toEqual(picks.map(({ space, pick }) => `${space.id}:${String(pick.id)}`));
  });

  it('fills at least eight spaces with five to twelve objects each', () => {
    expect(SPACES.length).toBeGreaterThanOrEqual(8);
    for (const space of SPACES) expect(CATALOGUE.filter((e) => e.space === space.id).length, space.id).toBeGreaterThanOrEqual(5);
    for (const space of SPACES) expect(CATALOGUE.filter((e) => e.space === space.id).length, space.id).toBeLessThanOrEqual(12);
  });

  it('gives every entry its metadata and provenance', () => {
    const problems: string[] = [];
    for (const e of CATALOGUE) {
      const where = String(e.id);
      if (e.title.trim() === '' || e.accession.trim() === '' || e.department.trim() === '') problems.push(`${where}: a title, accession number or department is empty`);
      if (e.url !== `https://www.metmuseum.org/art/collection/search/${where}`) problems.push(`${where}: url ${e.url}`);
      if (e.source.url !== `${CATALOGUE_SOURCE.api}${where}`) problems.push(`${where}: source ${e.source.url}`);
      if (!DAY.test(e.source.fetched) || !DAY.test(e.source.metadataDate) || !HASH.test(e.source.sha256)) problems.push(`${where}: provenance ${JSON.stringify(e.source)}`);
      if (e.image !== undefined && (!e.image.url.startsWith('https://images.metmuseum.org/') || !HASH.test(e.image.sha256) || e.image.width < 100 || e.image.height < 100)) problems.push(`${where}: image ${JSON.stringify(e.image)}`);
    }
    expect(problems).toEqual([]);
    expect(CATALOGUE_SOURCE.licence).toContain('CC0');
    expect(CATALOGUE_SOURCE.api).toBe('https://collectionapi.metmuseum.org/public/collection/v1/objects/');
    expect(DAY.test(CATALOGUE_SOURCE.generated)).toBe(true);
    expect(CATALOGUE_SOURCE.sampler).toMatch(/sampler \d+/);
  });

  it('names a gallery of its space, or the one its pick overrides to', () => {
    for (const { space, pick } of picks) {
      const e = byId.get(pick.id);
      expect(e === undefined ? null : space.galleries.includes(e.gallery) || pick.gallery?.value === e.gallery, String(pick.id)).toBe(true);
    }
  });

  it('sizes every object within 5 mm to 25 m, and says where each dimension came from, a pick’s override only where the pick sets it', () => {
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

  it('gives every entry a kind and a display the rules allow: frames on walls, under 0.6 m in a vitrine', () => {
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

  it('colours every entry in sRGB, from its image only when it is public domain and has one, with a grid for a sampled painting', () => {
    const problems: string[] = [];
    for (const e of CATALOGUE) {
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
    expect(CATALOGUE.filter((e) => e.colourFrom === 'image').length).toBeGreaterThan(CATALOGUE.length * 0.8);
  });
});
