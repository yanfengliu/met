/**
 * The catalogue run, free of the real network, browser and disk (scripts/met-catalogue.ts wires them in; scripts/met-catalogue.test.ts runs it with
 * recorders): the fetcher that keeps to one request a second through a cache and stops on a block, the run that builds every entry before it writes
 * once, and the catalogue file's text. A run builds the placeholders' entries and then the fit-out pieces' records; given the catalogue as committed
 * (`Run.kept`, the script's `--fit-out`), it builds the fit-out records alone and writes the placeholders' entries again as they are, asking the
 * network for no placeholder's record or image. The rules come in as a module (`rules`), so this file has no run-time import of its own and Node
 * loads it as it is.
 */
import { createHash } from 'node:crypto';

import type * as RulesModule from './met-catalogue-rules.js';
import type { Bins } from './met-catalogue-rules.js';
import type { CatalogueEntry, CatalogueSource, FitOutEntry, Pick, PlaceholderEntry, SpacePicks } from '../src/model/collection/types.js';

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

/**
 * The API or its CDN refused this client (HTTP 403 or 429): the run stops, writes nothing and says when to retry, and with which command. The
 * fetcher's block also carries its parts, what was refused and the time to retry as text, so the run can say them again with the command that can
 * succeed (`blockedWith`); an error made of a message alone carries none.
 */
export class BlockedError extends Error {
  override readonly name = 'BlockedError';
  readonly refused: string | undefined;
  readonly retry: string | undefined;

  constructor(message: string, refused?: string, retry?: string) {
    super(message);
    this.refused = refused;
    this.retry = retry;
  }
}

/** A block's whole message: what was refused, then when to retry and with which command. */
const blockedText = (refused: string, retry: string, command: string): string => `${refused} Retry after ${retry} with ${command}; the cache lets the rerun start where this one stopped.`;

/** The script's argument for a run of the fit-out pieces' records alone, and the command of the whole run, which takes none. */
export const FIT_OUT_FLAG = '--fit-out';
const WHOLE_RUN = 'npm run met-catalogue';

/** How the script was asked to run. */
export interface Mode {
  /** The fit-out records alone, the placeholders kept as committed (`Run.kept`); else every entry. */
  readonly fitOutOnly: boolean;
  /**
   * The command that starts this same run again, which a block's message tells the user to retry with (`FetcherOptions.rerun`). A fit-out run's
   * keeps its flag: retried without it, the run would rebuild every placeholder, which the flag exists to avoid (work unit 29, review 0, F2).
   */
  readonly rerun: string;
}

/** The mode the script's arguments ask for, or what is wrong with them. */
export function modeOf(args: readonly string[]): Mode | { readonly problem: string } {
  const unknown = args.filter((a) => a !== FIT_OUT_FLAG);
  if (unknown.length > 0) return { problem: `met-catalogue: unknown argument ${unknown.map((a) => `"${a}"`).join(', ')}; run it with no argument for every entry, or with ${FIT_OUT_FLAG} for the fit-out pieces' records alone.` };
  const fitOutOnly = args.includes(FIT_OUT_FLAG);
  return { fitOutOnly, rerun: fitOutOnly ? `${WHOLE_RUN} -- ${FIT_OUT_FLAG}` : WHOLE_RUN };
}

/** How long to wait before retrying after a block when the response says nothing: the survey of 2026-10-25 saw a 403 block clear within 8 minutes. */
export const BLOCK_WAIT_MS = 10 * 60 * 1000;

const DAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
const WEEKDAY = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH = `(${MONTHS.join('|')})`;
const TIME = '(\\d{2}):(\\d{2}):(\\d{2})';
/** RFC 9110 §5.6.7's three HTTP-date forms, all in GMT: IMF-fixdate, the obsolete RFC 850 date (a two-digit year) and asctime's (no zone named). */
const IMF_FIXDATE = new RegExp(`^${DAY}, (\\d{2}) ${MONTH} (\\d{4}) ${TIME} GMT$`);
const RFC850_DATE = new RegExp(`^${WEEKDAY}, (\\d{2})-${MONTH}-(\\d{2}) ${TIME} GMT$`);
const ASCTIME_DATE = new RegExp(`^${DAY} ${MONTH} ([ \\d]\\d) ${TIME} (\\d{4})$`);

/** A day and time in GMT as ms since the epoch, or NaN for one that does not exist (31 Feb, 24:00, a year Date.UTC would read as 19xx). */
function gmt(year: number, month: string | undefined, day: number, hours: number, minutes: number, seconds: number): number {
  const m = MONTHS.findIndex((name) => name === month);
  const time = Date.UTC(year, m, day, hours, minutes, seconds);
  const d = new Date(time);
  return m >= 0 && d.getUTCFullYear() === year && d.getUTCMonth() === m && d.getUTCDate() === day && hours < 24 && minutes < 60 && seconds < 60 ? time : Number.NaN;
}

/**
 * The time an HTTP-date names (RFC 9110 §5.6.7), received at `at`, or NaN when `value` is none of its three forms or names no real time. An RFC 850
 * date's two-digit year takes HTTP's rolling rule, not Date.parse's fixed cutoff: the latest year with those digits whose time is at most 50 years
 * after `at`, so one that would be more than 50 years ahead is the most recent past year with those digits.
 */
export function httpDate(value: string, at: Date): number {
  const imf = IMF_FIXDATE.exec(value);
  if (imf !== null) return gmt(Number(imf[3]), imf[2], Number(imf[1]), Number(imf[4]), Number(imf[5]), Number(imf[6]));
  const asc = ASCTIME_DATE.exec(value);
  if (asc !== null) return gmt(Number(asc[6]), asc[1], Number(asc[2]), Number(asc[3]), Number(asc[4]), Number(asc[5]));
  const rfc = RFC850_DATE.exec(value);
  if (rfc === null) return Number.NaN;
  const limit = new Date(at.getTime());
  limit.setUTCFullYear(limit.getUTCFullYear() + 50);
  const top = limit.getUTCFullYear();
  const year = top - ((((top - Number(rfc[3])) % 100) + 100) % 100);
  const time = (y: number): number => gmt(y, rfc[2], Number(rfc[1]), Number(rfc[4]), Number(rfc[5]), Number(rfc[6]));
  return time(year) > limit.getTime() ? time(year - 100) : time(year);
}

/**
 * When a refused request may be retried, from its Retry-After header (RFC 9110 §10.2.3): delay-seconds, a run of digits, after `at`; or an
 * HTTP-date in any of its three forms, a past one meaning `at`. A missing or unreadable value, or a time no Date holds (309 nines of seconds
 * overflow to Infinity), gives BLOCK_WAIT_MS after `at`.
 */
export function retryAt(header: string | null, at: Date): Date {
  const value = (header ?? '').trim();
  const retry = new Date(/^\d+$/.test(value) ? at.getTime() + Number(value) * 1000 : Math.max(httpDate(value, at), at.getTime()));
  return Number.isNaN(retry.getTime()) ? new Date(at.getTime() + BLOCK_WAIT_MS) : retry;
}

/** A Date as ISO text, or 'an unknown time' for an invalid one, so that a block's message can never throw before its BlockedError. */
const isoOf = (date: Date): string => (Number.isNaN(date.getTime()) ? 'an unknown time' : date.toISOString());

export interface FetcherOptions {
  readonly fetch: (url: string, init: { headers: Record<string, string> }) => Promise<Response>;
  readonly clock: Clock;
  readonly store: Store;
  /** Least time between two requests to the network, ms. */
  readonly gapMs: number;
  readonly userAgent: string;
  /** The command that starts this run again (`Mode.rerun`), which a block's message names. */
  readonly rerun: string;
}

/**
 * Gets a URL through the cache: a cached 200 makes no request; otherwise it waits until `gapMs` after the last request, fetches, and caches a 200.
 * A 403 or 429 throws BlockedError, with the time to retry (`retryAt`: the response's Retry-After, else BLOCK_WAIT_MS) and the run's own command to
 * retry with; another status throws an error naming it; a network failure is retried twice, each retry also waiting its turn.
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
        const retry = isoOf(retryAt(response.headers.get('retry-after'), at));
        const refused = `The Met's servers refused request ${String(this.requests)} of this run with HTTP ${String(response.status)} at ${isoOf(at)} (${url}): ${response.status === 429 ? 'too many requests' : 'blocked by its CDN, Imperva'}. Nothing was written, so the catalogue is unchanged, and every response cached so far is kept.`;
        throw new BlockedError(blockedText(refused, retry, this.options.rerun), refused, retry);
      }
      if (response.status !== 200) throw new Error(`GET ${url} answered HTTP ${String(response.status)} at ${at.toISOString()}; check the object ID in src/model/collection/picks.ts.`);
      const entry: Cached = { url, status: 200, fetched: at.toISOString(), contentType: response.headers.get('content-type') ?? '', body: new Uint8Array(await response.arrayBuffer()) };
      this.options.store.put(entry);
      return entry;
    }
  }
}

/**
 * Problems with the picks themselves: an object picked twice, as a placeholder or a fit-out piece, a space with fewer than 5 or more than 12
 * placeholder picks (its fit-out pieces are not counted), fewer than 8 spaces.
 */
export function pickProblems(spaces: readonly SpacePicks[]): string[] {
  const problems: string[] = [];
  const seen = new Map<number, string>();
  for (const space of spaces) {
    if (space.picks.length < 5 || space.picks.length > 12) problems.push(`space ${space.id} has ${String(space.picks.length)} picks; each space takes 5 to 12.`);
    for (const pick of [...space.picks, ...(space.fitOut ?? [])]) {
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
    ' * displays and colours are derived for the placeholders; each entry says where its values came from (types.ts, CatalogueEntry). The entries whose',
    ' * display is "fit-out" come last: records of pieces their spaces’ own steps build, with no placeholder (types.ts, FitOutEntry).',
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
  /**
   * The catalogue as committed, for a run that rebuilds the fit-out records alone (`npm run met-catalogue -- --fit-out`): its placeholders' entries
   * are written again as they are, with its sampler line, since the run samples no image; left out, the run rebuilds every entry.
   */
  readonly kept?: { readonly entries: readonly CatalogueEntry[]; readonly source: CatalogueSource };
}

const keyOf = (space: string, id: number): string => `${space}:${String(id)}`;

/** A clause when what a kept entry `holds` of `what` is not what its pick chooses: set, changed or dropped in the pick since the entry was built. */
function differs(what: string, holds: string | number, fromPick: boolean, chosen: string | number | undefined): string[] {
  if (chosen === undefined) return fromPick ? [`its ${what} ${JSON.stringify(holds)} is a pick's, and its pick sets none now`] : [];
  return fromPick && holds === chosen ? [] : [`its ${what} is ${JSON.stringify(holds)}${fromPick ? ", an earlier pick's" : ''}, and its pick now sets ${JSON.stringify(chosen)}`];
}

/**
 * How a kept placeholder's entry differs from what its pick's own choices give, which need no record to tell: its kind, its display and each
 * dimension against the pick's overrides, set, changed or dropped, and its gallery against the space's galleries and the pick's override
 * (rules.catalogueEntry and rules.checkGallery apply the same). None when a whole run would take the same choices from the pick.
 */
function staleBy(entry: PlaceholderEntry, pick: Pick, space: SpacePicks): string[] {
  return [
    ...differs('kind', entry.kind, entry.kindFrom === 'pick', pick.kind?.value),
    ...differs('display', entry.display, entry.displayFrom === 'pick', pick.display?.value),
    ...(['h', 'w', 'd'] as const).flatMap((axis) => differs(`size.${axis}`, entry.size[axis], entry.sizeFrom[axis] === 'pick', pick.size?.[axis])),
    ...(space.galleries.includes(entry.gallery) || pick.gallery?.value === entry.gallery ? [] : [`its gallery ${JSON.stringify(entry.gallery)} is neither one of its space's (${space.galleries.join(', ')}) nor its pick's override`]),
  ];
}

/**
 * The committed catalogue's placeholder entries, for a run that keeps them, and what is wrong if a whole run would not write them from today's
 * picks: they are not the picks' own in the picks' order, or one of them is not what its pick's overrides give (work unit 29, review 0, F3).
 */
function keptPlaceholders(run: Run, problems: string[]): PlaceholderEntry[] {
  const kept = (run.kept?.entries ?? []).filter((e): e is PlaceholderEntry => e.display !== 'fit-out');
  const picked = run.spaces.flatMap((space) => space.picks.map((pick) => ({ space, pick })));
  const want = picked.map(({ space, pick }) => keyOf(space.id, pick.id));
  const have = kept.map((e) => keyOf(e.space, e.id));
  const rebuild = 'a run with --fit-out keeps them as they are, so rebuild the whole catalogue: npm run met-catalogue.';
  if (want.join(' ') !== have.join(' ')) {
    const missing = want.filter((k) => !have.includes(k));
    const extra = have.filter((k) => !want.includes(k));
    const what = missing.length + extra.length === 0 ? 'in another order' : [missing.length > 0 ? `without ${missing.join(', ')}` : '', extra.length > 0 ? `with ${extra.join(', ')}, picked no longer` : ''].filter((s) => s !== '').join(' and ');
    problems.push(`the catalogue's placeholders are not the picks' (${what}); ${rebuild}`);
    return kept;
  }
  // Entry for pick, one to one: each kept entry against its own pick's choices.
  const stale = kept.flatMap((entry, i) => {
    const of = picked[i];
    const clauses = of === undefined ? [] : staleBy(entry, of.pick, of.space);
    return clauses.length === 0 ? [] : [`${keyOf(entry.space, entry.id)}: ${clauses.join('; ')}`];
  });
  if (stale.length > 0) problems.push(`the catalogue's placeholders are not what their picks give (${stale.join('. ')}); ${rebuild}`);
  return kept;
}

/**
 * Fetches and builds every entry, the placeholders' and then the fit-out pieces', writes the file once and returns 0; with any problem (a pick, a
 * malformed record, a gallery mismatch, a missing height) it lists them all, writes nothing and returns 1. A block (BlockedError) is thrown at once,
 * before any write. With `run.kept` it builds the fit-out records alone and writes the kept placeholders' entries again as they are.
 */
export async function runCatalogue(run: Run): Promise<number> {
  const { rules } = run;
  const problems = pickProblems(run.spaces);
  const placeholders: PlaceholderEntry[] = run.kept === undefined ? [] : keptPlaceholders(run, problems);
  const fitOut: FitOutEntry[] = [];
  /** Runs one pick's fetch and build; a block stops the run, any other failure is listed with the rest. */
  const attempt = async (build: () => Promise<void>): Promise<void> => {
    try {
      await build();
    } catch (error) {
      if (error instanceof BlockedError) throw error;
      problems.push(error instanceof Error ? error.message : String(error));
    }
  };
  for (const space of run.spaces) {
    for (const pick of run.kept === undefined ? space.picks : []) {
      await attempt(async () => {
        const response = await run.get(`${rules.API_OBJECTS}${String(pick.id)}`);
        const record = rules.parseRecord(new TextDecoder().decode(response.body), pick.id);
        let image: { url: string; sha256: string; bins: Bins } | undefined;
        if (rules.sampleable(record)) {
          const picture = await run.get(record.primaryImageSmall);
          image = { url: record.primaryImageSmall, sha256: sha256(picture.body), bins: await run.sample(picture.body, picture.contentType) };
        }
        placeholders.push(rules.catalogueEntry({ record, pick, space, fetched: response.fetched.slice(0, 10), sha256: sha256(response.body), ...(image === undefined ? {} : { image }) }));
      });
    }
    // A fit-out piece's record alone: no image is fetched or sampled for it.
    for (const pick of space.fitOut ?? []) {
      await attempt(async () => {
        const response = await run.get(`${rules.API_OBJECTS}${String(pick.id)}`);
        const record = rules.parseRecord(new TextDecoder().decode(response.body), pick.id);
        fitOut.push(rules.fitOutEntry({ record, pick, space, fetched: response.fetched.slice(0, 10), sha256: sha256(response.body) }));
      });
    }
    const built = `${String(placeholders.filter((e) => e.space === space.id).length)} of ${String(space.picks.length)}${run.kept === undefined ? '' : ' kept'}`;
    const fitted = space.fitOut === undefined ? '' : `; fit-out ${String(fitOut.filter((e) => e.space === space.id).length)} of ${String(space.fitOut.length)}`;
    run.log(`  ${space.id}: ${built}${fitted}`);
  }
  if (problems.length > 0) {
    run.log(`Not written: ${String(problems.length)} problem(s); the catalogue is unchanged.\n${problems.map((p) => `- ${p}`).join('\n')}`);
    return 1;
  }
  const source: CatalogueSource =
    run.kept === undefined
      ? { api: rules.API_OBJECTS, licence: 'CC0 1.0 (The Metropolitan Museum of Art Open Access metadata)', generated: run.today, script: 'scripts/met-catalogue.ts', sampler: run.samplerVersion }
      : { ...run.kept.source, generated: run.today };
  run.write(formatCatalogue([...placeholders, ...fitOut], source));
  const sampled = String(placeholders.filter((e) => e.colourFrom === 'image').length);
  run.log(`Wrote ${String(placeholders.length + fitOut.length)} entries: ${String(placeholders.length)} placeholders${run.kept === undefined ? '' : ', kept as they were'} (${sampled} coloured from their images) and ${String(fitOut.length)} fit-out records.`);
  return 0;
}
