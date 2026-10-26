/**
 * The collection catalogue (docs/research/collection.md, Regenerating), run by hand with Node's own TypeScript support, never in CI or the build:
 *   npm run met-catalogue
 * It reads the picks (src/model/collection/picks.ts), fetches each object's record from The Met's Collection API and, for a public-domain record with an
 * image, that image, at most one request a second, through a cache under research/cache/met-api/ (ignored: a rerun asks the network only for what it
 * has not seen); it decodes each image in the system Chrome (createImageBitmap and canvas getImageData, no image library) into 64 × 64 bins, builds one
 * entry per object by the rules of scripts/met-catalogue-rules.ts, and writes src/model/collection/catalogue.ts at once, through a temporary file: a block,
 * a malformed record, a gallery mismatch or a missing size stops the run before the file is touched, so the previous catalogue stands.
 * Exit codes: 0 written, 1 a problem with a record or pick (each one listed), 2 blocked by the API (HTTP 403 or 429; the message says when to retry).
 * Bound: the API's answer is taken as given; the script checks a record's shape and its gallery, not that the object is on view today.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import type * as RulesModule from './met-catalogue-rules.js';
import type { Bins } from './met-catalogue-rules.js';
import type * as RunModule from './met-catalogue-run.js';
import type { Cached, Store } from './met-catalogue-run.js';
import type { SpacePicks } from '../src/model/collection/types.js';

const ROOT = resolve(import.meta.dirname, '..');
const CACHE = join(ROOT, 'research', 'cache', 'met-api');
const OUTPUT = join(ROOT, 'src', 'model', 'collection', 'catalogue.ts');
const SAMPLER = 'met-catalogue sampler 1: each image decoded by the system Chrome (createImageBitmap, canvas 2D getImageData, sRGB) into 64 × 64 bins of summed pixels';
const USER_AGENT = 'met-model-catalogue/1 (a procedural model of The Met; one request a second)';
/** The survey of 2026-10-25 ran 572 requests at one a second without a block, and was blocked at about four a second. */
const GAP_MS = 1000;

const load = async <T>(path: string): Promise<T> => (await import(new URL(path, import.meta.url).href)) as T;
const rules = await load<typeof RulesModule>('./met-catalogue-rules.ts');
const runner = await load<typeof RunModule>('./met-catalogue-run.ts');

/** The cache file for a URL: its path made safe, with a short hash so two URLs never share a file. */
function cacheFile(url: string): string {
  const tail = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);
  return join(CACHE, `${tail}-${createHash('sha1').update(url).digest('hex').slice(0, 8)}`);
}

/** The disk cache: each response as `<file>.json` (its metadata) and `<file>.body` (its bytes). */
const diskStore: Store = {
  get(url: string): Cached | null {
    const file = cacheFile(url);
    if (!existsSync(`${file}.json`) || !existsSync(`${file}.body`)) return null;
    const meta = JSON.parse(readFileSync(`${file}.json`, 'utf8')) as Omit<Cached, 'body'>;
    return { ...meta, body: new Uint8Array(readFileSync(`${file}.body`)) };
  },
  put(entry: Cached): void {
    mkdirSync(CACHE, { recursive: true });
    const file = cacheFile(entry.url);
    writeFileSync(`${file}.body`, entry.body);
    const meta: Omit<Cached, 'body'> = { url: entry.url, status: entry.status, fetched: entry.fetched, contentType: entry.contentType };
    writeFileSync(`${file}.json`, JSON.stringify(meta, null, 1));
  },
};

/** Decodes an image in the page and returns its bins (rules.SAMPLER_BINS a side): per bin, the sums of its pixels' sRGB values and their count. */
async function sample(page: Page, body: Uint8Array, type: string): Promise<Bins> {
  return page.evaluate(
    async ({ b64, mime, n }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('no 2D canvas context');
      context.drawImage(bitmap, 0, 0);
      const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const sums = new Array<number>(n * n * 3).fill(0);
      const counts = new Array<number>(n * n).fill(0);
      for (let y = 0; y < height; y++) {
        const j = Math.min(n - 1, Math.floor((y * n) / height));
        for (let x = 0; x < width; x++) {
          const i = Math.min(n - 1, Math.floor((x * n) / width));
          const k = j * n + i;
          const p = (y * width + x) * 4;
          sums[k * 3] = (sums[k * 3] ?? 0) + (data[p] ?? 0);
          sums[k * 3 + 1] = (sums[k * 3 + 1] ?? 0) + (data[p + 1] ?? 0);
          sums[k * 3 + 2] = (sums[k * 3 + 2] ?? 0) + (data[p + 2] ?? 0);
          counts[k] = (counts[k] ?? 0) + 1;
        }
      }
      return { width, height, n, sums, counts };
    },
    { b64: Buffer.from(body).toString('base64'), mime: type === '' ? 'image/jpeg' : type, n: rules.SAMPLER_BINS },
  );
}

/** Writes the catalogue through a temporary file renamed over it, so a failed write leaves the old file whole. */
function writeAtomically(text: string): void {
  const temporary = `${OUTPUT}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, OUTPUT);
}

async function main(): Promise<number> {
  const { SPACES } = await load<{ SPACES: readonly SpacePicks[] }>('../src/model/collection/picks.ts');
  const fetcher = new runner.Fetcher({
    fetch: (url, init) => fetch(url, init),
    clock: { now: () => Date.now(), sleep: (ms) => new Promise((done) => setTimeout(done, ms)) },
    store: diskStore,
    gapMs: GAP_MS,
    userAgent: USER_AGENT,
  });
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    console.log(`Picks: ${String(SPACES.length)} spaces, ${String(SPACES.reduce((n, s) => n + s.picks.length, 0))} objects; cache ${CACHE}`);
    const code = await runner.runCatalogue({
      rules,
      spaces: SPACES,
      get: (url) => fetcher.get(url),
      sample: (body, type) => sample(page, body, type),
      write: writeAtomically,
      log: (line) => {
        console.log(line);
      },
      samplerVersion: `${SAMPLER}; Chrome ${browser.version()}`,
      today: new Date().toISOString().slice(0, 10),
    });
    console.log(`Network requests: ${String(fetcher.requests)}; cache hits: ${String(fetcher.hits)}.`);
    return code;
  } catch (error) {
    if (error instanceof runner.BlockedError) {
      console.error(error.message);
      console.error(`Network requests: ${String(fetcher.requests)}; cache hits: ${String(fetcher.hits)}.`);
      return 2;
    }
    throw error;
  } finally {
    await browser?.close();
  }
}

if (import.meta.main) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
