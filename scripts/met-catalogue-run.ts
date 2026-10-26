/**
 * The catalogue run, free of the real network, browser and disk (scripts/met-catalogue.ts wires them in; scripts/met-catalogue.test.ts runs it with
 * recorders): the fetcher that keeps to one request a second through a cache and stops on a block, the run that builds every entry before it writes
 * once, and the catalogue file's text. The rules come in as a module (`rules`), so this file has no run-time import of its own and Node loads it as it is.
 */
import { createHash } from 'node:crypto';

import type * as RulesModule from './met-catalogue-rules.js';
import type { Bins } from './met-catalogue-rules.js';
import type { CatalogueEntry, CatalogueSource, SpacePicks } from '../src/model/collection/types.js';

/** One response as the cache keeps it. */
export interface Cached {
  readonly url: string;
  readonly status: number;
  /** ISO time of the fetch. */
  readonly fetched: string;
  readonly contentType: string;
  readonly body: Uint8Array;
}

export interface Store {
  get(url: string): Cached | null;
  put(entry: Cached): void;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

/** The API or its CDN refused this client (HTTP 403 or 429): the run stops, writes nothing and says when to retry. */
export class BlockedError extends Error {
  override readonly name = 'BlockedError';
}

/** How long to wait before retrying after a block when the response says nothing: the survey of 2026-10-25 saw a 403 block clear within 8 minutes. */
export const BLOCK_WAIT_MS = 10 * 60 * 1000;

const DAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const TIME = '\\d{2}:\\d{2}:\\d{2}';
/** RFC 9110 §5.6.7's three HTTP-date forms: IMF-fixdate, the obsolete RFC 850 date and asctime's (which names no zone, as its time is GMT). */
const HTTP_DATE = new RegExp(`^(?:${DAY}, \\d{2} ${MONTH} \\d{4} ${TIME} GMT|${DAY}[a-z]{0,6}, \\d{2}-${MONTH}-\\d{2} ${TIME} GMT|${DAY} ${MONTH} [ \\d]\\d ${TIME} \\d{4})$`);

/**
 * When a refused request may be retried, from its Retry-After header (RFC 9110 §10.2.3): delay-seconds, a run of digits, after `at`; or an
 * HTTP-date in any of its three forms, a past one meaning `at`. A missing or unreadable value gives BLOCK_WAIT_MS after `at`.
 */
export function retryAt(header: string | null, at: Date): Date {
  const value = (header ?? '').trim();
  if (/^\d+$/.test(value)) return new Date(at.getTime() + Number(value) * 1000);
  const date = HTTP_DATE.test(value) ? Date.parse(value.endsWith(' GMT') ? value : `${value} GMT`) : Number.NaN;
  return Number.isFinite(date) ? new Date(Math.max(date, at.getTime())) : new Date(at.getTime() + BLOCK_WAIT_MS);
}

export interface FetcherOptions {
  readonly fetch: (url: string, init: { headers: Record<string, string> }) => Promise<Response>;
  readonly clock: Clock;
  readonly store: Store;
  /** Least time between two requests to the network, ms. */
  readonly gapMs: number;
  readonly userAgent: string;
}

/**
 * Gets a URL through the cache: a cached 200 makes no request; otherwise it waits until `gapMs` after the last request, fetches, and caches a 200.
 * A 403 or 429 throws BlockedError, with the time to retry (`retryAt`: the response's Retry-After, else BLOCK_WAIT_MS); another status throws an error naming
 * it; a network failure is retried twice, each retry also waiting its turn.
 */
export class Fetcher {
  requests = 0;
  hits = 0;
  private last = Number.NEGATIVE_INFINITY;
  private readonly options: FetcherOptions;

  constructor(options: FetcherOptions) {
    this.options = options;
  }

  async get(url: string): Promise<Cached> {
    const cached = this.options.store.get(url);
    if (cached !== null && cached.status === 200) {
      this.hits += 1;
      return cached;
    }
    for (let attempt = 0; ; attempt++) {
      const wait = this.last + this.options.gapMs - this.options.clock.now();
      if (wait > 0) await this.options.clock.sleep(wait);
      this.last = this.options.clock.now();
      this.requests += 1;
      let response: Response;
      try {
        response = await this.options.fetch(url, { headers: { 'User-Agent': this.options.userAgent, Accept: '*/*' } });
      } catch (error) {
        if (attempt >= 2) throw new Error(`GET ${url} failed three times (${error instanceof Error ? error.message : String(error)}); check the connection and run again.`, { cause: error });
        continue;
      }
      const at = new Date(this.options.clock.now());
      if (response.status === 403 || response.status === 429) {
        const retry = retryAt(response.headers.get('retry-after'), at);
        throw new BlockedError(
          `The Met's servers refused request ${String(this.requests)} of this run with HTTP ${String(response.status)} at ${at.toISOString()} (${url}): ${response.status === 429 ? 'too many requests' : 'blocked by its CDN, Imperva'}. Nothing was written, so the catalogue is unchanged, and every response cached so far is kept. Retry after ${retry.toISOString()} with npm run met-catalogue; the cache lets the rerun start where this one stopped.`,
        );
      }
      if (response.status !== 200) throw new Error(`GET ${url} answered HTTP ${String(response.status)} at ${at.toISOString()}; check the object ID in src/model/collection/picks.ts.`);
      const entry: Cached = { url, status: 200, fetched: at.toISOString(), contentType: response.headers.get('content-type') ?? '', body: new Uint8Array(await response.arrayBuffer()) };
      this.options.store.put(entry);
      return entry;
    }
  }
}

/** Problems with the picks themselves: a duplicate object, a space with fewer than 5 or more than 12 picks, fewer than 8 spaces. */
export function pickProblems(spaces: readonly SpacePicks[]): string[] {
  const problems: string[] = [];
  const seen = new Map<number, string>();
  for (const space of spaces) {
    if (space.picks.length < 5 || space.picks.length > 12) problems.push(`space ${space.id} has ${String(space.picks.length)} picks; each space takes 5 to 12.`);
    for (const pick of space.picks) {
      const other = seen.get(pick.id);
      if (other !== undefined) problems.push(`object ${String(pick.id)} is picked in ${other} and ${space.id}; pick it once.`);
      seen.set(pick.id, space.id);
    }
  }
  if (spaces.length < 8) problems.push(`there are ${String(spaces.length)} spaces; the collection fills at least 8.`);
  return problems;
}

/** The text of src/model/collection/catalogue.ts: a header, the file's provenance and one entry per line. */
export function formatCatalogue(entries: readonly CatalogueEntry[], source: CatalogueSource): string {
  return [
    '/**',
    ' * GENERATED by scripts/met-catalogue.ts from The Met Collection API: do not edit by hand; to change it, change src/model/collection/picks.ts and',
    ' * regenerate (docs/research/collection.md, Regenerating). The metadata is The Metropolitan Museum of Art’s Open Access data, CC0 1.0. Sizes, kinds,',
    ' * displays and colours are derived for the placeholders; each entry says where its values came from (types.ts, CatalogueEntry).',
    ' */',
    "import type { CatalogueEntry, CatalogueSource } from './types.js';",
    '',
    `export const CATALOGUE_SOURCE: CatalogueSource = ${JSON.stringify(source)};`,
    '',
    'export const CATALOGUE: readonly CatalogueEntry[] = [',
    ...entries.map((entry) => `  ${JSON.stringify(entry)},`),
    '];',
    '',
  ].join('\n');
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** The run's dependencies, so a test can run it with recorders in place of the network, the browser and the disk. */
export interface Run {
  readonly rules: typeof RulesModule;
  readonly spaces: readonly SpacePicks[];
  readonly get: (url: string) => Promise<Cached>;
  readonly sample: (body: Uint8Array, type: string) => Promise<Bins>;
  readonly write: (text: string) => void;
  readonly log: (line: string) => void;
  readonly samplerVersion: string;
  readonly today: string;
}

/**
 * Fetches and builds every entry, then writes the file once and returns 0; with any problem (a pick, a malformed record, a gallery mismatch, a missing
 * height) it lists them all, writes nothing and returns 1. A block (BlockedError) is thrown at once, before any write.
 */
export async function runCatalogue(run: Run): Promise<number> {
  const { rules } = run;
  const problems = pickProblems(run.spaces);
  const entries: CatalogueEntry[] = [];
  for (const space of run.spaces) {
    for (const pick of space.picks) {
      try {
        const response = await run.get(`${rules.API_OBJECTS}${String(pick.id)}`);
        const record = rules.parseRecord(new TextDecoder().decode(response.body), pick.id);
        let image: { url: string; sha256: string; bins: Bins } | undefined;
        if (rules.sampleable(record)) {
          const picture = await run.get(record.primaryImageSmall);
          image = { url: record.primaryImageSmall, sha256: sha256(picture.body), bins: await run.sample(picture.body, picture.contentType) };
        }
        entries.push(rules.catalogueEntry({ record, pick, space, fetched: response.fetched.slice(0, 10), sha256: sha256(response.body), ...(image === undefined ? {} : { image }) }));
      } catch (error) {
        if (error instanceof BlockedError) throw error;
        problems.push(error instanceof Error ? error.message : String(error));
      }
    }
    run.log(`  ${space.id}: ${String(entries.filter((e) => e.space === space.id).length)} of ${String(space.picks.length)}`);
  }
  if (problems.length > 0) {
    run.log(`Not written: ${String(problems.length)} problem(s); the catalogue is unchanged.\n${problems.map((p) => `- ${p}`).join('\n')}`);
    return 1;
  }
  run.write(formatCatalogue(entries, { api: rules.API_OBJECTS, licence: 'CC0 1.0 (The Metropolitan Museum of Art Open Access metadata)', generated: run.today, script: 'scripts/met-catalogue.ts', sampler: run.samplerVersion }));
  run.log(`Wrote ${String(entries.length)} entries (${String(entries.filter((e) => e.colourFrom === 'image').length)} coloured from their images).`);
  return 0;
}
