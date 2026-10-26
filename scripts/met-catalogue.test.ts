/**
 * The catalogue script, offline (docs/research/collection.md): its rules against committed records of The Met's Collection API (scripts/fixtures/met-api/,
 * CC0 metadata as the API returned it on 2026-10-25) with expected values worked out by hand from each record, its colour statistics on synthetic bins,
 * the fetcher's pace, cache and stop on a block with a fake clock and network, and the run's all-or-nothing write with recorders in place of the disk.
 * Bound: no network and no browser; the decoding of real images in Chrome (scripts/met-catalogue.ts, `sample`) is not run here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Pick, SpacePicks } from '../src/model/collection/types.js';
import * as rules from './met-catalogue-rules.js';
import type { Bins, MetRecord } from './met-catalogue-rules.js';
import { BLOCK_WAIT_MS, BlockedError, Fetcher, formatCatalogue, httpDate, retryAt, runCatalogue } from './met-catalogue-run.js';
import type { Cached, Store } from './met-catalogue-run.js';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'met-api');
const body = (id: number): string => readFileSync(join(FIXTURES, `object-${String(id)}.json`), 'utf8');
const record = (id: number): MetRecord => rules.parseRecord(body(id), id);
const space = (galleries: readonly string[], picks: readonly Pick[] = []): SpacePicks => ({ id: 'test-space', title: 'Test', galleries, picks });
const entry = (id: number, galleries: readonly string[], pick: Pick = { id }, image?: { url: string; sha256: string; bins: Bins }) =>
  rules.catalogueEntry({ record: record(id), pick, space: space(galleries), fetched: '2026-10-25', sha256: 'ab'.repeat(32), ...(image === undefined ? {} : { image }) });

/** Bins of an n × n image, each bin 4 pixels of the colour `at(i, j)` returns. */
function bins(n: number, at: (i: number, j: number) => readonly [number, number, number]): Bins {
  const sums: number[] = [];
  const counts: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const [r, g, b] = at(i, j);
      sums.push(4 * r, 4 * g, 4 * b);
      counts.push(4);
    }
  }
  return { width: 2 * n, height: 2 * n, n, sums, counts };
}

describe('catalogue entries from committed records', () => {
  it('a statue measured only in height: figure on a plinth, width and depth estimated from the kind', () => {
    const e = entry(247000, ['162']);
    expect([e.kind, e.kindFrom, e.display, e.displayFrom, e.element]).toEqual(['figure', 'name', 'plinth', 'rule', 'Overall']);
    expect(e.size).toEqual({ h: 2.469, w: 0.938, d: 0.741 });
    expect(e.sizeFrom).toEqual({ h: 'measurements', w: 'estimate', d: 'estimate' });
    expect([e.title, e.maker, e.date, e.gallery, e.accession, e.publicDomain]).toEqual(['Marble statue of a youthful Hercules', 'Roman', '69–96 CE', '162', '03.12.13', true]);
    expect(e.url).toBe('https://www.metmuseum.org/art/collection/search/247000');
    expect(e.source).toEqual({ url: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/247000', fetched: '2026-10-25', metadataDate: '2026-06-16', sha256: 'abababababababab' });
    // Without a sampled image the colour falls back by medium: marble.
    expect([e.colour, e.colourFrom, e.image, e.grid]).toEqual(['#ddd7cb', 'medium', undefined, undefined]);
  });

  it('a painting: a frame on a wall, its depth the stretcher default, and with an image its colour grid', () => {
    const image = { url: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT9353.jpg', sha256: 'cd'.repeat(32), bins: bins(16, () => [10, 20, 30]) };
    const e = entry(437788, ['600'], { id: 437788 }, image);
    expect([e.kind, e.display, e.maker]).toEqual(['frame', 'wall', 'Giovanni Battista Tiepolo']);
    expect(e.size).toEqual({ h: 5.588, w: 3.267, d: 0.05 });
    expect(e.sizeFrom).toEqual({ h: 'measurements', w: 'measurements', d: 'estimate' });
    expect([e.colour, e.colourFrom, e.grid?.length, e.grid?.[0]]).toEqual(['#0a141e', 'image', 64, '#0a141e']);
    expect(e.image).toEqual({ url: image.url, sha256: 'cdcdcdcdcdcdcdcd', width: 32, height: 32 });
  });

  it('a bronze crab: all three axes measured, weight ignored, its pedestal kept; 0.6 m across is not under 0.6 m, so a plinth', () => {
    const e = entry(551893, ['131']);
    expect([e.kind, e.display]).toEqual(['figure', 'plinth']);
    expect(e.size).toEqual({ h: 0.2, w: 0.6, d: 0.375 });
    expect(e.pedestal).toEqual({ h: 0.371, w: 0.756, d: 0.559 });
    expect([e.colour, e.colourFrom]).toEqual(['#6f5434', 'medium']);
  });

  it('an armour with no measurements: its height read from the dimensions text, stopping before the parts', () => {
    const e = entry(22973, ['371']);
    expect([e.kind, e.element]).toEqual(['figure', 'dimensions text']);
    expect(e.size).toEqual({ h: 1.765, w: 0.671, d: 0.53 });
    expect(e.sizeFrom).toEqual({ h: 'dimensions', w: 'estimate', d: 'estimate' });
    expect(rules.dimensionsFromText(record(22973).dimensions)).toEqual({ h: 1.765 });
  });

  it('a dish: its diameter across and front to back, and under 0.6 m it stands in a vitrine', () => {
    const e = entry(42509, ['204']);
    expect([e.kind, e.display]).toEqual(['vessel', 'vitrine']);
    expect(e.size).toEqual({ h: 0.044, w: 0.216, d: 0.216 });
    expect(e.sizeFrom).toEqual({ h: 'measurements', w: 'measurements', d: 'measurements' });
  });

  it('measures the object without its base, and a painting without its frame, keeping the framed size', () => {
    const statuette = entry(464593, ['305']);
    expect([statuette.kind, statuette.element]).toEqual(['figure', 'Other (without base)']);
    expect(statuette.size).toEqual({ h: 0.772, w: 0.238, d: 0.135 });
    const daddi = entry(458998, ['952']);
    expect([daddi.kind, daddi.element]).toEqual(['frame', 'Overall (without frame)']);
    expect(daddi.size).toEqual({ h: 1.08, w: 1.368, d: 0.05 });
    expect(daddi.framed).toEqual({ h: 1.13, w: 1.426 });
  });

  it('takes height and width from separate elements, and a piece of horse armour is a slab', () => {
    const e = entry(22761, ['371']);
    expect([e.kind, e.display, e.element]).toEqual(['slab', 'vitrine', 'Other (Width)']);
    expect(e.size).toEqual({ h: 0.165, w: 0.47, d: 0.02 });
    expect(e.sizeFrom).toEqual({ h: 'measurements', w: 'measurements', d: 'estimate' });
  });

  it('leaves out measurements the record marks as superseded and prefers the confirmed ones', () => {
    // First 'Overall (historic dimensions, superceded)' 120 × 125 cm, then 'Overall (confirmed)' 100.3302 × 125.730255 × 14.605029 cm.
    const relief = entry(231004, ['548']);
    expect([relief.kind, relief.display, relief.element]).toEqual(['slab', 'wall', 'Overall (confirmed)']);
    expect(relief.size).toEqual({ h: 1.003, w: 1.257, d: 0.146 });
    expect(relief.sizeFrom).toEqual({ h: 'measurements', w: 'measurements', d: 'measurements' });
    // Historic height 180.3 and diameter 135.89027 cm; confirmed 179.38786 and 132.71527 cm; the base gives only a weight.
    const vase = entry(204619, ['548']);
    expect([vase.kind, vase.element]).toEqual(['vessel', 'Overall (confirmed, wt. includes strapping and accessories for rigging)']);
    expect(vase.size).toEqual({ h: 1.794, w: 1.327, d: 1.327 });
    // Nor does a superseded element fill an axis: beside a confirmed height alone, width and depth are a slab's estimates (0.8 and 0.12 of 1.003 m).
    const historic = { elementName: 'Overall', elementDescription: 'historic dimensions, superceded', elementMeasurements: { Height: 120, Width: 125, Depth: 10 } };
    const heightOnly = { ...record(231004), measurements: [historic, { elementName: 'Overall', elementDescription: 'confirmed', elementMeasurements: { Height: 100.3302 } }] };
    const e = rules.catalogueEntry({ record: heightOnly, pick: { id: 231004 }, space: space(['548']), fetched: '2026-10-25', sha256: '00' });
    expect([e.size, e.sizeFrom]).toEqual([{ h: 1.003, w: 0.802, d: 0.12 }, { h: 'measurements', w: 'estimate', d: 'estimate' }]);
    // Of two current 'Overall' elements, the confirmed one, though it comes second.
    const approximate = { elementName: 'Overall', elementDescription: 'approximate', elementMeasurements: { Height: 110, Width: 120 } };
    const two = { ...record(231004), measurements: [approximate, ...(record(231004).measurements ?? [])] };
    const confirmed = rules.catalogueEntry({ record: two, pick: { id: 231004 }, space: space(['548']), fetched: '2026-10-25', sha256: '00' });
    expect([confirmed.element, confirmed.size]).toEqual(['Overall (confirmed)', { h: 1.003, w: 1.257, d: 0.146 }]);
  });

  it('fills from the dimensions text only the axes the measurements lack, each marked with where it came from', () => {
    // A measured width of 47 cm and no height: the height from the text ('H. as mounted 69 ½ in. (176.5 cm)'), the depth a figure's estimate (0.3 h).
    const width = [{ elementName: 'Other', elementDescription: 'Width', elementMeasurements: { Width: 47 } }];
    const make = (dimensions: string) => rules.catalogueEntry({ record: { ...record(22973), measurements: width, dimensions }, pick: { id: 22973 }, space: space(['371']), fetched: '2026-10-25', sha256: '00' });
    const mixed = make(record(22973).dimensions);
    expect([mixed.size, mixed.sizeFrom, mixed.element]).toEqual([{ h: 1.765, w: 0.47, d: 0.53 }, { h: 'dimensions', w: 'measurements', d: 'estimate' }, 'Other (Width), dimensions text']);
    // Where both give an axis the measurement stands; the text gives the rest.
    const both = make('H. 69 1/2 in. (176.5 cm); W. 30 in. (76.2 cm); D. 20 in. (50.8 cm)');
    expect([both.size, both.sizeFrom]).toEqual([{ h: 1.765, w: 0.47, d: 0.508 }, { h: 'dimensions', w: 'measurements', d: 'dimensions' }]);
  });

  it('never samples a record that is not public domain: the colour falls back by medium', () => {
    const r = record(10105);
    expect([r.isPublicDomain, rules.sampleable(r)]).toEqual([false, false]);
    const e = entry(10105, ['700']);
    expect([e.kind, e.colour, e.colourFrom, e.maker]).toEqual(['figure', '#ddd7cb', 'medium', 'George Grey Barnard']);
    expect(() => entry(10105, ['700'], { id: 10105 }, { url: 'x', sha256: 'ef'.repeat(32), bins: bins(16, () => [0, 0, 0]) })).toThrow(/not public domain/);
  });

  it('applies a pick’s overrides and marks them', () => {
    const e = entry(247000, ['162'], { id: 247000, kind: { value: 'bust', reason: 'test' }, display: { value: 'floor', reason: 'test' }, size: { w: 1.1, reason: 'test' } });
    expect([e.kind, e.kindFrom, e.display, e.displayFrom]).toEqual(['bust', 'pick', 'floor', 'pick']);
    expect(e.size).toEqual({ h: 2.469, w: 1.1, d: 1.358 });
    expect(e.sizeFrom).toEqual({ h: 'measurements', w: 'pick', d: 'estimate' });
  });

  it('rejects a record whose gallery is not its space’s, unless the pick overrides it to that gallery', () => {
    expect(() => entry(247000, ['163'])).toThrow('Object 247000 ("Marble statue of a youthful Hercules") has GalleryNumber "162", but space test-space shows galleries 163');
    expect(() => entry(247000, ['163'], { id: 247000, gallery: { value: '161', reason: 'test' } })).toThrow(/overrides the gallery to "161"/);
    expect(entry(247000, ['163'], { id: 247000, gallery: { value: '162', reason: 'test' } }).gallery).toBe('162');
  });

  it('asks the pick for a height when the record has none, and rejects implausible sizes', () => {
    const bare = { ...record(22973), measurements: null, dimensions: 'Wt. 61 lb.' };
    const make = (pick: Pick) => rules.catalogueEntry({ record: bare, pick, space: space(['371']), fetched: '2026-10-25', sha256: '00' });
    expect(() => make({ id: 22973 })).toThrow('Object 22973 ("Armor for Field and Tilt"): no height in its measurements or its dimensions text');
    expect(make({ id: 22973, size: { h: 1.8, reason: 'test' } }).sizeFrom.h).toBe('pick');
    expect(() => make({ id: 22973, size: { h: 40, reason: 'test' } })).toThrow(/outside 0.005..25 m/);
  });

  it('rejects bodies that are not the record asked for', () => {
    expect(() => rules.parseRecord('<html>blocked</html>', 1)).toThrow('Object 1: the API returned a body that is not JSON');
    expect(() => rules.parseRecord(body(247000), 247001)).toThrow("Object 247001: the record's objectID is 247000");
    expect(() => rules.parseRecord(JSON.stringify({ ...JSON.parse(body(247000)) as object, title: 7 }), 247000)).toThrow('field title is 7, not a string');
  });
});

describe('colour statistics', () => {
  const grey = [128, 128, 128] as const;
  it('takes the object’s colour apart from a plain background', () => {
    const b = bins(16, (i, j) => (i >= 5 && i < 11 && j >= 5 && j < 11 ? [200, 30, 30] : grey));
    expect(rules.meanColour(b, 'figure')).toBe('#c81e1e');
    // A painting's or a relief's colour is the whole image's: 36 of 256 bins red.
    const whole = rules.hex([(36 * 200 + 220 * 128) / 256, (36 * 30 + 220 * 128) / 256, (36 * 30 + 220 * 128) / 256]);
    expect([rules.meanColour(b, 'frame'), rules.meanColour(b, 'slab')]).toEqual([whole, whole]);
  });

  it('takes a pale statue apart from a studio backdrop that darkens from the top down', () => {
    const b = bins(16, (i, j) => (i >= 5 && i < 11 && j >= 3 && j < 13 ? [222, 210, 186] : [90 - 4 * j, 90 - 4 * j, 92 - 4 * j]));
    expect(rules.meanColour(b, 'figure')).toBe('#ded2ba');
  });

  it('gives the brighter half of the object, the colour it shows in light, not its shadows', () => {
    // A figure lit from the left: its left half bright, its right half in shade, on a white backdrop.
    const b = bins(16, (i, j) => (i >= 5 && i < 11 && j >= 3 && j < 13 ? (i < 8 ? [180, 160, 130] : [90, 80, 65]) : [250, 250, 250]));
    expect(rules.meanColour(b, 'figure')).toBe('#b4a082');
  });

  it('takes the middle of the image when no colour holds more of it than of the border', () => {
    const b = bins(16, (i, j) => ((i + j) % 2 === 0 ? [40, 40, 40] : [200, 200, 200]));
    // The middle's brighter half is its light bins.
    expect(rules.meanColour(b, 'vessel')).toBe('#c8c8c8');
  });

  it('grids a frame row by row from the top', () => {
    const grid = rules.gridColours(bins(16, (_i, j) => (j < 8 ? [0, 0, 255] : [255, 255, 0])));
    expect(grid.slice(0, 32).every((c) => c === '#0000ff')).toBe(true);
    expect(grid.slice(32).every((c) => c === '#ffff00')).toBe(true);
  });
});

/** A clock that only moves when the code under test sleeps. */
function fakeClock(): { now: () => number; sleep: (ms: number) => Promise<void> } {
  let t = 1_761_400_000_000;
  return { now: () => t, sleep: (ms) => ((t += ms), Promise.resolve()) };
}

function memoryStore(): Store & { readonly map: Map<string, Cached> } {
  const map = new Map<string, Cached>();
  return { map, get: (url) => map.get(url) ?? null, put: (e) => map.set(e.url, e) };
}

describe('fetcher', () => {
  it('keeps one request a second, and a cached response asks nothing', async () => {
    const clock = fakeClock();
    const times: number[] = [];
    const store = memoryStore();
    const fetcher = new Fetcher({ fetch: (url) => ((times.push(clock.now()), Promise.resolve(new Response(url, { status: 200 })))), clock, store, gapMs: 1000, userAgent: 'test' });
    for (const url of ['a', 'b', 'c', 'a']) await fetcher.get(url);
    expect(times.map((t) => t - (times[0] ?? 0))).toEqual([0, 1000, 2000]);
    expect([fetcher.requests, fetcher.hits, store.map.size]).toEqual([3, 1, 3]);
    expect(new TextDecoder().decode((await fetcher.get('b')).body)).toBe('b');
  });

  it('stops on 403 and 429, says when to retry and caches nothing for that URL', async () => {
    const clock = fakeClock();
    const store = memoryStore();
    const answers = [new Response('x', { status: 200 }), new Response('blocked', { status: 403 }), new Response('slow', { status: 429, headers: { 'Retry-After': '120' } })];
    const fetcher = new Fetcher({ fetch: () => Promise.resolve(answers.shift() ?? new Response('', { status: 500 })), clock, store, gapMs: 1000, userAgent: 'test' });
    await fetcher.get('https://example.test/ok');
    const blocked = await fetcher.get('https://example.test/two').catch((e: unknown) => e);
    expect(blocked).toBeInstanceOf(BlockedError);
    const at = new Date(clock.now()).toISOString();
    expect((blocked as Error).message).toContain(`HTTP 403 at ${at} (https://example.test/two): blocked by its CDN, Imperva`);
    expect((blocked as Error).message).toContain(`Retry after ${new Date(clock.now() + BLOCK_WAIT_MS).toISOString()}`);
    const slow = await fetcher.get('https://example.test/three').catch((e: unknown) => e);
    expect((slow as Error).message).toContain(`HTTP 429 at ${new Date(clock.now()).toISOString()} (https://example.test/three): too many requests`);
    expect((slow as Error).message).toContain(`Retry after ${new Date(clock.now() + 120_000).toISOString()}`);
    expect([...store.map.keys()]).toEqual(['https://example.test/ok']);
  });

  it('reads Retry-After as delay-seconds or as an HTTP-date in any of its three forms (RFC 9110 §10.2.3)', async () => {
    const at = new Date('2026-10-25T12:00:00.000Z');
    const iso = (header: string | null): string => retryAt(header, at).toISOString();
    expect([iso('120'), iso(' 0 ')]).toEqual(['2026-10-25T12:02:00.000Z', '2026-10-25T12:00:00.000Z']);
    expect([iso('Sun, 25 Oct 2026 13:00:00 GMT'), iso('Sunday, 25-Oct-26 13:00:00 GMT'), iso('Sun Oct 25 13:00:00 2026')]).toEqual(Array(3).fill('2026-10-25T13:00:00.000Z'));
    // A date already past means now; anything else, the default wait (V8's Date.parse would take '-5' for 1 May 2001), as does a delay or date no
    // Date holds: 309 nines overflow to Infinity, 20 nines of seconds lie past the year 275760, and 31 February is no day.
    expect(iso('Sun, 25 Oct 2026 11:00:00 GMT')).toBe('2026-10-25T12:00:00.000Z');
    for (const bad of [null, '', 'soon', '-5', '1.5', '12 s', 'Sun, 25 Oct 2026 13:00:00', '9'.repeat(309), '9'.repeat(20), 'Sat, 31 Feb 2026 13:00:00 GMT']) {
      expect(iso(bad), `Retry-After ${String(bad).slice(0, 40)}`).toBe('2026-10-25T12:10:00.000Z');
    }
    // Through the fetcher: a 429 that gives a date an hour on.
    const clock = fakeClock();
    const hour = new Date(clock.now() + 3_600_000);
    const fetcher = new Fetcher({ fetch: () => Promise.resolve(new Response('slow', { status: 429, headers: { 'Retry-After': hour.toUTCString() } })), clock, store: memoryStore(), gapMs: 0, userAgent: 'test' });
    const slow = await fetcher.get('https://example.test/date').catch((e: unknown) => e);
    expect((slow as Error).message).toContain(`Retry after ${hour.toISOString()}`);
  });

  it('reads an RFC 850 date’s two-digit year by HTTP’s rolling 50 years (RFC 9110 §5.6.7), not by a fixed cutoff', () => {
    const at = new Date('2026-10-25T12:00:00.000Z');
    const iso = (value: string): string => new Date(httpDate(value, at)).toISOString();
    // Date.parse reads 50 as 1950; 24 years after `at`, it is 2050.
    expect(iso('Tuesday, 25-Oct-50 13:00:00 GMT')).toBe('2050-10-25T13:00:00.000Z');
    expect(retryAt('Tuesday, 25-Oct-50 13:00:00 GMT', at).toISOString()).toBe('2050-10-25T13:00:00.000Z');
    // 76 is 2076 up to 50 years after `at`; an hour later, more than 50 years ahead, it is the most recent past 76, and 77 always is.
    expect(iso('Sunday, 25-Oct-76 11:00:00 GMT')).toBe('2076-10-25T11:00:00.000Z');
    expect(iso('Monday, 25-Oct-76 13:00:00 GMT')).toBe('1976-10-25T13:00:00.000Z');
    expect(iso('Tuesday, 25-Oct-77 12:00:00 GMT')).toBe('1977-10-25T12:00:00.000Z');
    expect(iso('Sunday, 25-Oct-26 13:00:00 GMT')).toBe('2026-10-25T13:00:00.000Z');
  });

  it('names any other status', async () => {
    const fetcher = new Fetcher({ fetch: () => Promise.resolve(new Response('', { status: 404 })), clock: fakeClock(), store: memoryStore(), gapMs: 0, userAgent: 'test' });
    await expect(fetcher.get('https://example.test/gone')).rejects.toThrow(/answered HTTP 404/);
  });
});

describe('the run', () => {
  const ids = [247000, 254697, 255973, 254925, 248132] as const;
  const picks: SpacePicks[] = Array.from({ length: 8 }, (_, k) => ({ id: `s${String(k)}`, title: 'S', galleries: ['162'], picks: ids.map((id) => ({ id: id + k * 1_000_000 })) }));
  const fake = (id: number): string => JSON.stringify({ ...(JSON.parse(body(247000)) as object), objectID: id, primaryImageSmall: '' });
  const recorder = (get: (url: string) => Promise<Cached>) => {
    const writes: string[] = [];
    const lines: string[] = [];
    const run = { rules, spaces: picks, get, sample: () => Promise.resolve(bins(16, () => [1, 2, 3])), write: (t: string) => writes.push(t), log: (l: string) => lines.push(l), samplerVersion: 'test', today: '2026-10-25' };
    return { run, writes, lines };
  };
  const ok = (url: string): Promise<Cached> => Promise.resolve({ url, status: 200, fetched: '2026-10-25T12:00:00Z', contentType: 'application/json', body: new TextEncoder().encode(fake(Number(url.split('/').pop()))) });

  it('writes one file with an entry per pick when every record is good', async () => {
    const { run, writes } = recorder(ok);
    expect(await runCatalogue(run)).toBe(0);
    expect(writes.length).toBe(1);
    const lines = (writes[0] ?? '').split('\n').filter((l) => l.startsWith('  {'));
    expect(lines.length).toBe(40);
    expect((JSON.parse((lines[0] ?? '').trim().replace(/,$/, '')) as { id: number }).id).toBe(247000);
  });

  it('writes nothing when blocked part way', async () => {
    let n = 0;
    const { run, writes } = recorder((url) => (++n === 7 ? Promise.reject(new BlockedError('blocked')) : ok(url)));
    await expect(runCatalogue(run)).rejects.toBeInstanceOf(BlockedError);
    expect(writes).toEqual([]);
  });

  it('stops at the first 403 or 429, after one request, whatever its Retry-After holds', async () => {
    const headers = [null, '', '120', '9'.repeat(309), '9'.repeat(20), 'soon', 'Tuesday, 25-Oct-50 13:00:00 GMT', 'Sat, 31 Feb 2026 13:00:00 GMT'];
    for (const status of [403, 429]) {
      for (const header of headers) {
        const fetcher = new Fetcher({ fetch: () => Promise.resolve(new Response('no', { status, headers: header === null ? {} : { 'Retry-After': header } })), clock: fakeClock(), store: memoryStore(), gapMs: 0, userAgent: 'test' });
        const { run, writes } = recorder((url) => fetcher.get(url));
        const result = await runCatalogue(run).catch((e: unknown) => e);
        expect([result instanceof BlockedError, fetcher.requests, writes.length], `HTTP ${String(status)}, Retry-After ${String(header).slice(0, 40)}`).toEqual([true, 1, 0]);
      }
    }
  });

  it('writes nothing, and lists the problem, when a record names another gallery', async () => {
    const { run, writes, lines } = recorder((url) => (url.endsWith('/2254697') ? Promise.resolve({ ...{ url, status: 200, fetched: '2026-10-25', contentType: '' }, body: new TextEncoder().encode(JSON.stringify({ ...(JSON.parse(fake(2254697)) as object), GalleryNumber: '999' })) }) : ok(url)));
    expect(await runCatalogue(run)).toBe(1);
    expect(writes).toEqual([]);
    expect(lines.join('\n')).toContain('Object 2254697 ("Marble statue of a youthful Hercules") has GalleryNumber "999"');
  });

  it('formats one entry per line that reads back as the entry', () => {
    const e = entry(437788, ['600']);
    const text = formatCatalogue([e], { api: 'a', licence: 'CC0', generated: '2026-10-25', script: 's', sampler: 'v' });
    const line = text.split('\n').find((l) => l.startsWith('  {')) ?? '';
    expect(JSON.parse(line.trim().replace(/,$/, ''))).toEqual(e);
    expect(text).toContain('export const CATALOGUE_SOURCE: CatalogueSource = {"api":"a","licence":"CC0","generated":"2026-10-25","script":"s","sampler":"v"};');
  });
});
