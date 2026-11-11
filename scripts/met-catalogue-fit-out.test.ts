/**
 * The catalogue script's fit-out records, offline (docs/research/collection.md, Fit-out pieces): `fitOutEntry` on four committed records of The Met's
 * Collection API (scripts/fixtures/met-api/, CC0 metadata as the API returned it on 2026-11-11: the Temple of Dendur 547802, Diana 11998, the choir
 * screen from Valladolid 201926 and the loggia from Laurelton Hall 133) against values worked out by hand from each record; the run with recorders
 * in place of the network, the browser and the disk: a fit-out piece's record built after the placeholders with no image fetched or sampled, and the
 * run that keeps the committed catalogue (`--fit-out`), which writes every placeholder's line again byte for byte and asks the network for the
 * fit-out records alone, keeps no placeholder that today's picks would not give (another object or order, or a kind, a display, a dimension or a
 * gallery its pick now chooses otherwise: review 0, F3), and, blocked, says to retry with the fit-out command through the real fetcher, built for
 * the mode the script's arguments give (review 0, F2), or, where it had already found its kept placeholders stale, shows that difference and names
 * the whole run, the one that can succeed (review 1, F11); and the committed catalogue itself, which is in the form the script writes.
 * Red (2026-11-11, each mutation made and undone): with a fit-out piece sized as a block is, its missing axes estimated by the kind's ratios (the
 * choir screen without its pick's depth is accepted); with the run fetching a fit-out record's image (the request is seen); with a kept run that
 * rebuilds its placeholders (81 requests where one is due); with the fetcher naming the whole run whatever its run's kind, as it did, and with the
 * fit-out mode given the whole run's command (the blocked fit-out run's message is not the one written out here); with the kept run not
 * comparing its entries with their picks' choices (a kind set since is kept and written); and with a block thrown on as the fetcher threw it,
 * whatever the run had found (the stale kept run's block then names the fit-out command and shows no difference).
 * Bound: no network and no browser; scripts/met-catalogue.test.ts holds the placeholders' rules, the fetcher and the all-or-nothing write. The
 * script's own `main` is not run here: that it hands its mode's `rerun` to its fetcher is one typed line, read, not tested. A kept run compares
 * what the picks alone decide; a rule changed since the entries were built (a kind by name, an estimate) only a whole run derives again.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CATALOGUE, CATALOGUE_SOURCE } from '../src/model/collection/catalogue.js';
import type { CatalogueEntry, CatalogueSource, Pick, PlaceholderEntry, SpacePicks } from '../src/model/collection/types.js';
import * as rules from './met-catalogue-rules.js';
import type { Bins, MetRecord } from './met-catalogue-rules.js';
import { BlockedError, Fetcher, formatCatalogue, modeOf, pickProblems, runCatalogue } from './met-catalogue-run.js';
import type { Cached, Mode, Run } from './met-catalogue-run.js';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'met-api');
const body = (id: number): string => readFileSync(join(FIXTURES, `object-${String(id)}.json`), 'utf8');
const record = (id: number): MetRecord => rules.parseRecord(body(id), id);
const space = (galleries: readonly string[]): SpacePicks => ({ id: 'test-space', title: 'Test', galleries, picks: [] });
/** Bins of a 16 × 16 image of one colour. */
const bins = (): Bins => ({ width: 32, height: 32, n: 16, sums: Array.from({ length: 16 * 16 * 3 }, () => 4), counts: Array.from({ length: 16 * 16 }, () => 4) });

describe('fit-out records from committed records', () => {
  const fitOut = (id: number, galleries: readonly string[], pick: Pick = { id }, image?: { url: string; sha256: string; bins: Bins }) =>
    rules.fitOutEntry({ record: record(id), pick, space: space(galleries), fetched: '2026-11-11', sha256: 'ab'.repeat(32), ...(image === undefined ? {} : { image }) });
  const measured = { h: 'measurements', w: 'measurements', d: 'measurements' };

  it('the Temple of Dendur: its record alone, sized by the temple proper, its date the record’s own string', () => {
    const e = fitOut(547802, ['131']);
    // Every key the entry holds: nothing of a placeholder (a kind, a colour, an image) is among them.
    expect(e).toEqual({
      id: 547802,
      space: 'test-space',
      accession: '68.154',
      title: 'The Temple of Dendur',
      maker: '',
      date: 'completed by 10 CE',
      medium: 'Aeolian sandstone',
      objectName: 'Temple, Dendur',
      classification: '',
      department: 'Egyptian Art',
      gallery: '131',
      creditLine: 'Given to the United States by Egypt in 1965 and awarded to The Metropolitan Museum of Art in 1967.',
      url: 'https://www.metmuseum.org/art/collection/search/547802',
      publicDomain: true,
      display: 'fit-out',
      // 'Overall (Temple proper)': 640.0813 × 640.0813 cm and 1249.6825 cm long; the gate's element (807.7 × 365.8 × 335.3 cm) is not the size.
      size: { h: 6.401, w: 6.401, d: 12.497 },
      sizeFrom: measured,
      element: 'Overall (Temple proper)',
      source: { url: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/547802', fetched: '2026-11-11', metadataDate: '2026-08-01', sha256: 'abababababababab' },
    });
    // The date is the record's objectDate as given, though its objectBeginDate and objectEndDate say 10 BCE: nothing here derives or corrects it.
    const raw = JSON.parse(body(547802)) as { objectDate: string; objectBeginDate: number; objectEndDate: number };
    expect([raw.objectDate, raw.objectBeginDate, raw.objectEndDate]).toEqual(['completed by 10 CE', -10, -10]);
    expect(e.date).toBe(raw.objectDate);
  });

  it('Diana: the figure’s own measurements, not the height she is displayed at nor her pedestal, which only a placeholder keeps', () => {
    const e = fitOut(11998, ['700']);
    expect([e.size, e.sizeFrom, e.element]).toEqual([{ h: 2.584, w: 1.359, d: 0.359 }, measured, 'Overall']);
    expect([e.title, e.maker, e.date, e.medium, e.gallery]).toEqual(['Diana', 'Augustus Saint-Gaudens', '1892–93, cast 1928', 'Bronze, gilt', '700']);
    expect(Object.keys(e).filter((k) => ['kind', 'kindFrom', 'displayFrom', 'pedestal', 'framed', 'colour', 'grid', 'colourFrom', 'image'].includes(k))).toEqual([]);
    // The same record as a placeholder would take a kind and a display, and keep its pedestal.
    const placeholder = rules.catalogueEntry({ record: record(11998), pick: { id: 11998 }, space: space(['700']), fetched: '2026-11-11', sha256: '00' });
    expect([placeholder.kind, placeholder.display, placeholder.pedestal]).toEqual(['figure', 'plinth', { h: 2.438, w: 1.219, d: 1.219 }]);
  });

  it('the choir screen: its depth from the pick, since the record measures none and a fit-out piece takes no estimate by kind', () => {
    expect(() => fitOut(201926, ['305'])).toThrow('Object 201926 ("Choir screen from the Cathedral of Valladolid"): its record measures no depth, and a fit-out piece takes no estimate by kind; give it in its pick (size.d, with the reason).');
    const e = fitOut(201926, ['305'], { id: 201926, size: { d: 0.5, reason: 'test' } });
    expect([e.size, e.sizeFrom]).toEqual([{ h: 15.85, w: 12.802, d: 0.5 }, { h: 'measurements', w: 'measurements', d: 'pick' }]);
    expect([e.maker, e.date, e.medium]).toEqual(['Rafal Amezúa', 'completed ca. 1763', 'Iron: gilded and painted; limestone (base)']);
    // A record that measures its height alone lacks both, and what the pick gives must still lie in range.
    expect(() => fitOut(247000, ['162'])).toThrow('its record measures no width and no depth, and a fit-out piece takes no estimate by kind; give them in its pick (size.w, size.d, with the reason).');
    expect(() => fitOut(247000, ['162'], { id: 247000, size: { w: 30, d: 1, reason: 'test' } })).toThrow(/outside 0.005..25 m/);
  });

  it('the loggia: in gallery 701 by its pick’s override alone, not public domain, and a record all the same', () => {
    expect(() => fitOut(133, ['700'], { id: 133, size: { d: 5.33, reason: 'test' } })).toThrow('has GalleryNumber "701", but space test-space shows galleries 700');
    const e = fitOut(133, ['700'], { id: 133, gallery: { value: '701', reason: 'test' }, size: { d: 5.33, reason: 'test' } });
    expect([e.title, e.maker, e.date, e.medium, e.gallery, e.publicDomain]).toEqual(['Architectural Elements from Laurelton Hall, Oyster Bay, New York', 'Louis C. Tiffany', 'ca. 1905', 'Limestone, ceramic, and Fravrile glass', '701', false]);
    expect([e.size, e.sizeFrom]).toEqual([{ h: 6.401, w: 7.01, d: 5.33 }, { h: 'measurements', w: 'measurements', d: 'pick' }]);
  });

  it('refuses what only a placeholder has: a kind, a display, a sampled image', () => {
    const kind = { value: 'figure', reason: 'test' } as const;
    expect(() => fitOut(11998, ['700'], { id: 11998, kind })).toThrow('Object 11998 ("Diana") is a fit-out piece of test-space, which the space\'s own steps build: its pick sets a kind, which only a placeholder has; remove it.');
    expect(() => fitOut(11998, ['700'], { id: 11998, kind, display: { value: 'floor', reason: 'test' } })).toThrow('its pick sets a kind and a display, which only a placeholder has; remove them.');
    expect(() => fitOut(11998, ['700'], { id: 11998 }, { url: 'x', sha256: 'ef'.repeat(32), bins: bins() })).toThrow('Object 11998: an image was sampled for a fit-out piece');
  });
});

describe('the run with fit-out pieces', () => {
  const ids = [247000, 254697, 255973, 254925, 248132] as const;
  const picks: SpacePicks[] = Array.from({ length: 8 }, (_, k) => ({ id: `s${String(k)}`, title: 'S', galleries: ['162'], picks: ids.map((id) => ({ id: id + k * 1_000_000 })) }));
  /** The first space with a fit-out piece, object 9000001: measured like 247000, a height alone, so its pick gives its width and depth. */
  const withFitOut: SpacePicks[] = picks.map((s, k) => (k === 0 ? { ...s, fitOut: [{ id: 9_000_001, size: { w: 1, d: 0.6, reason: 'as built in the test' } }] } : s));
  const PICTURE = 'https://images.metmuseum.org/CRDImages/gr/web-large/a-picture.jpg';
  /** Record 247000 under the ID the URL asks for, fetched on `day`: public domain, with `fields` over it (a picture's URL, a changed title). */
  const answer = (url: string, fields: Readonly<Record<string, string>> = {}, day = '2026-10-25'): Promise<Cached> => {
    const object = { ...(JSON.parse(body(247000)) as object), objectID: Number(url.split('/').pop()), primaryImageSmall: '', ...fields };
    return Promise.resolve({ url, status: 200, fetched: `${day}T12:00:00Z`, contentType: 'application/json', body: new TextEncoder().encode(JSON.stringify(object)) });
  };
  const picture = (url: string): Promise<Cached> => Promise.resolve({ url, status: 200, fetched: '2026-10-25T12:00:00Z', contentType: 'image/jpeg', body: new Uint8Array([1, 2, 3]) });
  const recorder = (spaces: readonly SpacePicks[], get: (url: string) => Promise<Cached>) => {
    const writes: string[] = [];
    const lines: string[] = [];
    const asked: string[] = [];
    const sampled: string[] = [];
    const run: Run = {
      rules,
      spaces,
      get: (url) => (asked.push(url), get(url)),
      sample: (_bytes, type) => (sampled.push(type), Promise.resolve(bins())),
      write: (t) => writes.push(t),
      log: (l) => lines.push(l),
      samplerVersion: 'sampler of the full run',
      today: '2026-10-25',
    };
    return { run, writes, lines, asked, sampled };
  };
  const entryLines = (text: string | undefined): string[] => (text ?? '').split('\n').filter((l) => l.startsWith('  {'));
  const parsed = (text: string | undefined): CatalogueEntry[] => entryLines(text).map((l) => JSON.parse(l.trim().replace(/,$/, '')) as CatalogueEntry);
  const sourceOf = (text: string | undefined): CatalogueSource => JSON.parse(/CATALOGUE_SOURCE: CatalogueSource = (.*);/.exec(text ?? '')?.[1] ?? 'null') as CatalogueSource;
  /** The catalogue as a full run wrote it from `spaces` before any fit-out piece was picked, every placeholder sampled from its picture. */
  const committed = async (spaces: readonly SpacePicks[] = picks): Promise<{ readonly text: string; readonly kept: NonNullable<Run['kept']> }> => {
    const before = recorder(spaces, (url) => (url === PICTURE ? picture(url) : answer(url, { primaryImageSmall: PICTURE })));
    expect(await runCatalogue(before.run)).toBe(0);
    expect(before.sampled.length).toBe(40);
    const text = before.writes[0] ?? '';
    return { text, kept: { entries: parsed(text), source: sourceOf(text) } };
  };

  it('builds a fit-out piece’s record after every placeholder, and asks for no image of it and samples none', async () => {
    const { run, writes, lines, asked, sampled } = recorder(withFitOut, (url) => answer(url, url.endsWith('/9000001') ? { primaryImageSmall: PICTURE } : {}));
    expect(await runCatalogue(run)).toBe(0);
    const entries = parsed(writes[0]);
    expect(entries.map((e) => e.display === 'fit-out')).toEqual([...Array.from({ length: 40 }, () => false), true]);
    const last = entries[40];
    expect([last?.id, last?.space, last?.display, last?.size, last?.sizeFrom]).toEqual([9_000_001, 's0', 'fit-out', { h: 2.469, w: 1, d: 0.6 }, { h: 'measurements', w: 'pick', d: 'pick' }]);
    expect(Object.keys(last ?? {}).filter((k) => ['kind', 'colour', 'colourFrom', 'image', 'grid'].includes(k))).toEqual([]);
    // Its record names a picture, which a placeholder's would be fetched and sampled for: the fit-out piece's is not asked for.
    expect(asked.filter((url) => !url.startsWith(rules.API_OBJECTS))).toEqual([]);
    expect(sampled).toEqual([]);
    expect(lines.join('\n')).toContain('  s0: 5 of 5; fit-out 1 of 1');
    expect(lines.join('\n')).toContain('Wrote 41 entries: 40 placeholders (0 coloured from their images) and 1 fit-out records.');
  });

  it('with the committed catalogue kept, rebuilds the fit-out records alone: every placeholder’s line as it was, its record and image never asked for', async () => {
    const { text, kept } = await committed();
    // The fit-out run, weeks later, when every record has changed its title: a kept placeholder must not see it.
    const changed = (url: string): Promise<Cached> => answer(url, { title: 'A changed title', primaryImageSmall: PICTURE }, '2026-11-11');
    const after = recorder(withFitOut, changed);
    expect(await runCatalogue({ ...after.run, kept, today: '2026-11-11', samplerVersion: 'a sampler that did not run' })).toBe(0);
    expect(after.asked, 'the one request: the fit-out piece’s record').toEqual([`${rules.API_OBJECTS}9000001`]);
    expect(after.sampled).toEqual([]);
    expect(entryLines(after.writes[0]).slice(0, 40), 'the placeholders’ lines, byte for byte').toEqual(entryLines(text));
    const fitOut = parsed(after.writes[0])[40];
    expect([fitOut?.id, fitOut?.display, fitOut?.title, fitOut?.source.fetched]).toEqual([9_000_001, 'fit-out', 'A changed title', '2026-11-11']);
    // The file is written today; the sampler line stays the one that sampled the placeholders' images.
    expect(sourceOf(after.writes[0])).toEqual({ ...kept.source, generated: '2026-11-11' });
    expect(kept.source.sampler).toBe('sampler of the full run');
    expect(after.lines.join('\n')).toContain('  s0: 5 of 5 kept; fit-out 1 of 1');
    expect(after.lines.join('\n')).toContain('Wrote 41 entries: 40 placeholders, kept as they were (40 coloured from their images) and 1 fit-out records.');
    // Run again over its own output: the fit-out record is rebuilt to the same line, and nothing else moves.
    const again = recorder(withFitOut, changed);
    expect(await runCatalogue({ ...again.run, kept: { entries: parsed(after.writes[0]), source: sourceOf(after.writes[0]) }, today: '2026-11-11' })).toBe(0);
    expect(again.writes[0]).toBe(after.writes[0]);
  });

  it('keeps nothing it cannot match to the picks: a placeholder picked since, dropped since or moved fails the kept run, and nothing is written', async () => {
    const { kept } = await committed();
    const cases: (readonly [string, SpacePicks[], string])[] = [
      ['picked since', withFitOut.map((s, k) => (k === 1 ? { ...s, picks: [...s.picks.slice(0, 4), { id: 77 }, ...s.picks.slice(4)] } : s)), 'the catalogue\'s placeholders are not the picks\' (without s1:77); a run with --fit-out keeps them as they are, so rebuild the whole catalogue: npm run met-catalogue.'],
      ['dropped since', withFitOut.map((s, k) => (k === 1 ? { ...s, picks: [{ id: 78 }, ...s.picks.slice(1)] } : s)), '(without s1:78 and with s1:1247000, picked no longer)'],
      ['moved', withFitOut.map((s, k) => (k === 1 ? { ...s, picks: [...s.picks].reverse() } : s)), '(in another order)'],
    ];
    for (const [what, spaces, message] of cases) {
      const { run, writes, lines, asked } = recorder(spaces, (url) => answer(url));
      expect(await runCatalogue({ ...run, kept }), what).toBe(1);
      expect(writes, what).toEqual([]);
      expect(lines.join('\n'), what).toContain(message);
      // Even then it asks for the fit-out records alone: no placeholder is fetched by a kept run.
      expect(asked, what).toEqual([`${rules.API_OBJECTS}9000001`]);
    }
  });

  it('keeps no placeholder its pick would no longer give: a kind, a display or a dimension set, changed or dropped in the pick since, or a gallery no longer the space’s or the pick’s', async () => {
    /** `spaces` with `first` in place of space s1's first pick (object 1247000), and `over` over the space's own fields. */
    const s1 = (spaces: readonly SpacePicks[], first: Pick, over: Partial<SpacePicks> = {}): SpacePicks[] => spaces.map((s, k) => (k === 1 ? { ...s, picks: [first, ...s.picks.slice(1)], ...over } : s));
    const id = 1_247_000;
    const reason = 'chosen in the test';
    const chosen: Pick = { id, kind: { value: 'slab', reason }, display: { value: 'floor', reason }, size: { d: 0.9, reason } };
    // Two committed catalogues: one whose picks chose nothing, and one whose pick of 1247000 chose its kind, its display and its depth.
    const plain = await committed();
    const overridden = await committed(s1(picks, chosen));
    const held = plain.kept.entries.find((e): e is PlaceholderEntry => e.id === id && e.display !== 'fit-out');
    expect([held?.kind, held?.display, held?.sizeFrom.d, held?.gallery], 'the plain entry: a figure on a plinth by the rules, its depth estimated').toEqual(['figure', 'plinth', 'estimate', '162']);
    const cases: (readonly [string, NonNullable<Run['kept']>, SpacePicks[], string])[] = [
      ['a kind set since', plain.kept, s1(withFitOut, { id, kind: { value: 'slab', reason } }), '(s1:1247000: its kind is "figure", and its pick now sets "slab")'],
      ['a display set since', plain.kept, s1(withFitOut, { id, display: { value: 'floor', reason } }), '(s1:1247000: its display is "plinth", and its pick now sets "floor")'],
      ['a depth given since', plain.kept, s1(withFitOut, { id, size: { d: 0.9, reason } }), `(s1:1247000: its size.d is ${String(held?.size.d)}, and its pick now sets 0.9)`],
      ['a kind changed since', overridden.kept, s1(withFitOut, { ...chosen, kind: { value: 'bust', reason } }), '(s1:1247000: its kind is "slab", an earlier pick\'s, and its pick now sets "bust")'],
      ['a depth changed since', overridden.kept, s1(withFitOut, { ...chosen, size: { d: 1.1, reason } }), '(s1:1247000: its size.d is 0.9, an earlier pick\'s, and its pick now sets 1.1)'],
      ['every choice dropped since', overridden.kept, withFitOut, '(s1:1247000: its kind "slab" is a pick\'s, and its pick sets none now; its display "floor" is a pick\'s, and its pick sets none now; its size.d 0.9 is a pick\'s, and its pick sets none now)'],
      ['the space’s gallery changed since', plain.kept, s1(withFitOut, { id }, { galleries: ['999'] }), '(s1:1247000: its gallery "162" is neither one of its space\'s (999) nor its pick\'s override. s1:1254697: its gallery "162" is'],
    ];
    for (const [what, kept, spaces, message] of cases) {
      const { run, writes, lines, asked } = recorder(spaces, (url) => answer(url));
      expect(await runCatalogue({ ...run, kept }), what).toBe(1);
      expect(writes, what).toEqual([]);
      expect(lines.join('\n'), what).toContain(`the catalogue's placeholders are not what their picks give ${message}`);
      expect(lines.join('\n'), what).toContain('a run with --fit-out keeps them as they are, so rebuild the whole catalogue: npm run met-catalogue.');
      // It still asks for the fit-out records, so the problem is listed with any other, and for no placeholder's.
      expect(asked, what).toEqual([`${rules.API_OBJECTS}9000001`]);
    }
    // The choices the catalogue was built with are no difference: the kept run writes, every placeholder's line as it was.
    const same = recorder(s1(withFitOut, chosen), (url) => answer(url));
    expect(await runCatalogue({ ...same.run, kept: overridden.kept })).toBe(0);
    expect(entryLines(same.writes[0]).slice(0, 40)).toEqual(entryLines(overridden.text));
    // Nor is a gallery its pick overrides to, in a space that shows another, as a whole run accepts it (rules.checkGallery).
    const elsewhere = withFitOut.map((s, k) => (k === 1 ? { ...s, galleries: ['999'], picks: s.picks.map((p) => ({ ...p, gallery: { value: '162', reason } })) } : s));
    expect(await runCatalogue({ ...recorder(elsewhere, (url) => answer(url)).run, kept: plain.kept })).toBe(0);
  });

  it('writes nothing when blocked on a fit-out record, and lists an object picked as a placeholder and as a fit-out piece', async () => {
    const { kept } = await committed();
    const blocked = recorder(withFitOut, () => Promise.reject(new BlockedError('blocked')));
    await expect(runCatalogue({ ...blocked.run, kept })).rejects.toBeInstanceOf(BlockedError);
    expect(blocked.writes).toEqual([]);
    const twice = picks.map((s, k) => (k === 0 ? { ...s, fitOut: [{ id: 247000, size: { w: 1, d: 1, reason: 'test' } }] } : s));
    expect(pickProblems(twice)).toEqual(['object 247000 is picked in s0 and s0; pick it once.']);
    expect(pickProblems(withFitOut)).toEqual([]);
  });

  /**
   * The script's mode for `args` and a fetcher as the script builds it for that mode (scripts/met-catalogue.ts `main`: the mode's own `rerun`), with
   * a clock that stands at 15:00 UTC, an empty cache and a network that refuses every request with `status`.
   */
  const refused = (args: readonly string[], status: number): { readonly mode: Mode; readonly fetcher: Fetcher } => {
    const mode = modeOf(args);
    if ('problem' in mode) throw new Error(mode.problem);
    let now = Date.parse('2026-11-11T15:00:00Z');
    const clock = { now: () => now, sleep: (ms: number) => ((now += ms), Promise.resolve()) };
    const fetcher = new Fetcher({ fetch: () => Promise.resolve(new Response('no', { status })), clock, store: { get: () => null, put: () => undefined }, gapMs: 1000, userAgent: 'test', rerun: mode.rerun });
    return { mode, fetcher };
  };

  it('blocked, says to retry the run that was blocked: a fit-out run with its flag, never the whole run, which would rebuild every placeholder', async () => {
    const { kept } = await committed();
    // The fit-out run, as `npm run met-catalogue -- --fit-out` starts it, refused on its first request: the fit-out piece's record.
    const fitOut = refused(['--fit-out'], 403);
    expect(fitOut.mode.fitOutOnly).toBe(true);
    const blocked = recorder(withFitOut, (url) => fitOut.fetcher.get(url));
    const error = await runCatalogue({ ...blocked.run, kept }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BlockedError);
    const message = (error as Error).message;
    expect(message).toBe(
      `The Met's servers refused request 1 of this run with HTTP 403 at 2026-11-11T15:00:00.000Z (${rules.API_OBJECTS}9000001): blocked by its CDN, Imperva. Nothing was written, so the catalogue is unchanged, and every response cached so far is kept. Retry after 2026-11-11T15:10:00.000Z with npm run met-catalogue -- --fit-out; the cache lets the rerun start where this one stopped.`,
    );
    expect(message, 'the command is named once, with its flag').not.toMatch(/npm run met-catalogue(?! -- --fit-out)/);
    expect([blocked.asked, blocked.writes, fitOut.fetcher.requests]).toEqual([[`${rules.API_OBJECTS}9000001`], [], 1]);
    // The whole run, as `npm run met-catalogue` starts it, refused on its first placeholder's record, names itself.
    const whole = refused([], 429);
    expect(whole.mode.fitOutOnly).toBe(false);
    const all = recorder(withFitOut, (url) => whole.fetcher.get(url));
    const stopped = await runCatalogue(all.run).catch((e: unknown) => e);
    expect(stopped).toBeInstanceOf(BlockedError);
    expect((stopped as Error).message).toContain(`(${rules.API_OBJECTS}247000): too many requests.`);
    expect((stopped as Error).message).toContain('Retry after 2026-11-11T15:10:00.000Z with npm run met-catalogue; the cache lets the rerun start where this one stopped.');
    expect((stopped as Error).message).not.toContain('--fit-out');
    expect(all.writes).toEqual([]);
  });

  it('blocked after finding its kept placeholders stale, shows the difference and names the whole run, which can succeed; another problem is shown with the run’s own command', async () => {
    const { kept } = await committed();
    // The kept catalogue differs from its picks (object 1247000's pick now sets a kind) and the fit-out record's request is refused: the fit-out run,
    // retried, could only refuse (review 1, F11).
    const differing = withFitOut.map((s, k): SpacePicks => (k === 1 ? { ...s, picks: [{ id: 1_247_000, kind: { value: 'slab', reason: 'chosen in the test' } }, ...s.picks.slice(1)] } : s));
    const first = refused(['--fit-out'], 403);
    const stale = recorder(differing, (url) => first.fetcher.get(url));
    const error = await runCatalogue({ ...stale.run, kept }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BlockedError);
    expect((error as Error).message).toBe(
      `The Met's servers refused request 1 of this run with HTTP 403 at 2026-11-11T15:00:00.000Z (${rules.API_OBJECTS}9000001): blocked by its CDN, Imperva. Nothing was written, so the catalogue is unchanged, and every response cached so far is kept. Retry after 2026-11-11T15:10:00.000Z with npm run met-catalogue, the whole run, and not with --fit-out again: before the block the run had found that the placeholders that flag keeps are not what the picks give, so a run with it can only refuse. The cache keeps what this run fetched. What the run had found, 1 problem(s):\n- the catalogue's placeholders are not what their picks give (s1:1247000: its kind is "figure", and its pick now sets "slab"); a run with --fit-out keeps them as they are, so rebuild the whole catalogue: npm run met-catalogue.`,
    );
    expect((error as Error).message, 'the fit-out run is not named as the one to retry').not.toContain('with npm run met-catalogue -- --fit-out');
    expect([stale.asked, stale.writes, first.fetcher.requests]).toEqual([[`${rules.API_OBJECTS}9000001`], [], 1]);
    // Another problem found before the block, an object picked as a fit-out piece of two spaces, is shown as well, with the run's own command: once
    // the picks are mended the same run can succeed.
    const twice = withFitOut.map((s, k): SpacePicks => (k === 1 ? { ...s, fitOut: [{ id: 9_000_001, size: { w: 1, d: 0.6, reason: 'as built in the test' } }] } : s));
    const second = refused(['--fit-out'], 403);
    const again = await runCatalogue({ ...recorder(twice, (url) => second.fetcher.get(url)).run, kept }).catch((e: unknown) => e);
    expect(again).toBeInstanceOf(BlockedError);
    expect((again as Error).message).toContain('Retry after 2026-11-11T15:10:00.000Z with npm run met-catalogue -- --fit-out; the cache lets the rerun start where this one stopped. Before the block the run had found what the rerun will stop on until it is dealt with, 1 problem(s):\n- object 9000001 is picked in s0 and s1; pick it once.');
  });

  it('reads the script’s arguments: none for every entry, --fit-out for the fit-out records alone, anything else refused by name', () => {
    expect(modeOf([])).toEqual({ fitOutOnly: false, rerun: 'npm run met-catalogue' });
    expect(modeOf(['--fit-out'])).toEqual({ fitOutOnly: true, rerun: 'npm run met-catalogue -- --fit-out' });
    expect(modeOf(['--fitout', '--fit-out'])).toEqual({ problem: 'met-catalogue: unknown argument "--fitout"; run it with no argument for every entry, or with --fit-out for the fit-out pieces\' records alone.' });
  });
});

describe('the committed catalogue', () => {
  it('is in the form the script writes: its own entries and source, formatted again, give its text back', () => {
    // So its header, its provenance line and its one entry a line are the writer's, with the placeholders first; a value changed by hand inside an
    // entry reads back the same and is not seen here (src/model/collection/catalogue.test.ts and the types hold what an entry may say).
    const committed = readFileSync(join(import.meta.dirname, '..', 'src', 'model', 'collection', 'catalogue.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(formatCatalogue(CATALOGUE, CATALOGUE_SOURCE)).toBe(committed);
  });
});
