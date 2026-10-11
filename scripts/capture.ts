/**
 * Capture tooling (docs/design/spec.md, Verification), run by Node's own TypeScript support:
 *   npm run shots                         the standard set: every preset at the finished state, the aerial preset at t = 0 and at each chapter boundary,
 *                                         the section cut, and the page UI at 1280x720 and 390x844, into .shots/shots/
 *   npm run sweep -- --t 6.5 [--count 12] [--seed 7] [--solo <chapter>]
 *                                         seeded random cameras around the model's bounds at one t, into .shots/sweep-<seed>-t<t>/
 * Each run starts its own Vite dev server on this worktree's MET_PORT through Vite's JS API (strict port: a taken port fails the run instead of
 * attaching to another server), drives the installed Chrome through Playwright, waits for `window.__shotReady`, prints the git revision with a dirty
 * flag so each image is tied to code, and stops the server and browser on every exit path. A console error on any page fails the run.
 * Bound: images are written, not judged; a person or agent inspects each one at native resolution.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, '.shots');
const MODEL_VIEWPORT = { width: 1600, height: 900 };
const UI_VIEWPORTS = [
  { name: 'desktop-1280x720', width: 1280, height: 720 },
  { name: 'mobile-390x844', width: 390, height: 844 },
] as const;
const READY_TIMEOUT_MS = 90_000;

/** What the page publishes on `window.__met` that this script reads. */
interface Facts {
  readonly n: number;
  readonly chapters: readonly { readonly id: string; readonly first: number; readonly count: number }[];
  readonly presets: readonly { readonly id: string; readonly group: string }[];
  readonly bounds: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
  readonly gpu: string;
  readonly perf: { readonly buildMs: number; readonly readyMs: number | null };
  readonly stats: { readonly pieces: number; readonly meshes: number; readonly triangles: number };
}

interface Shot {
  readonly name: string;
  readonly query: string;
  readonly viewport: { readonly width: number; readonly height: number };
}

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32): the same seed gives the same cameras. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` cameras as `cam=` values: three in four orbit outside the bounds at varied distance and elevation, one in four stands inside looking around. */
export function sweepCameras(seed: number, count: number, min: readonly number[], max: readonly number[]): string[] {
  const rand = seeded(seed);
  const [x0 = 0, y0 = 0, z0 = 0] = min;
  const [x1 = 0, y1 = 0, z1 = 0] = max;
  const radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2;
  const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
  const cams: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const inside = rand() < 0.25;
    const target = [lerp(x0, x1, 0.15 + 0.7 * rand()), lerp(Math.max(y0, 0), y1, inside ? 0.3 * rand() + 0.1 : 0.4 * rand()), lerp(z0, z1, 0.15 + 0.7 * rand())];
    const azimuth = rand() * Math.PI * 2;
    const elevation = inside ? lerp(-0.05, 0.5, rand()) : lerp(0.09, 1.3, rand());
    const distance = inside ? lerp(6, 20, rand()) : radius * Math.exp(lerp(Math.log(0.12), Math.log(2.4), rand()));
    const [tx = 0, ty = 0, tz = 0] = target;
    const position = inside
      ? [tx - Math.cos(azimuth) * distance * 0.5, Math.max(Math.max(y0, 0) + 1.7, ty - 2), tz - Math.sin(azimuth) * distance * 0.5]
      : [tx + Math.cos(elevation) * Math.cos(azimuth) * distance, ty + Math.sin(elevation) * distance, tz + Math.cos(elevation) * Math.sin(azimuth) * distance];
    cams.push([...position, ...target].map((v) => v.toFixed(2)).join(','));
  }
  return cams;
}

function revision(): { rev: string; dirty: boolean } {
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  return { rev: git('rev-parse', '--short', 'HEAD'), dirty: git('status', '--porcelain').length > 0 };
}

function parseArgs(argv: readonly string[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i] ?? '';
    if (!key.startsWith('--')) throw new Error(`Unexpected argument "${key}"; options look like --t 6.5 --count 12 --seed 7 --solo <chapter>.`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Option ${key} needs a value, as in ${key} 6.5.`);
    args.set(key.slice(2), value);
    i += 1;
  }
  return args;
}

function numberArg(args: Map<string, string>, name: string, fallback: number | null): number {
  const text = args.get(name);
  if (text === undefined) {
    if (fallback === null) throw new Error(`sweep needs --${name}, as in npm run sweep -- --${name} 6.5.`);
    return fallback;
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`--${name} "${text}" is not a number.`);
  return value;
}

let server: ViteDevServer | null = null;
let browser: Browser | null = null;

async function cleanup(): Promise<void> {
  const b = browser;
  const s = server;
  browser = null;
  server = null;
  await b?.close().catch(() => undefined);
  await s?.close().catch(() => undefined);
}

async function start(): Promise<string> {
  server = await createServer({ root: ROOT, configFile: join(ROOT, 'vite.config.ts'), logLevel: 'warn', clearScreen: false });
  await server.listen();
  const origin = server.resolvedUrls?.local[0];
  if (origin === undefined) throw new Error('The Vite dev server reported no local URL.');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  return origin.replace(/\/$/, '');
}

const problems: string[] = [];

async function open(origin: string, query: string, viewport: Shot['viewport']): Promise<Page> {
  if (browser === null) throw new Error('The browser is not running.');
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`?${query}: console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`?${query}: uncaught exception: ${error.message}`));
  await page.goto(`${origin}/?${query}`);
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: READY_TIMEOUT_MS });
  return page;
}

async function facts(page: Page): Promise<Facts> {
  return (await page.evaluate(() => JSON.parse(JSON.stringify(window.__met)) as unknown)) as Facts;
}

/** Writes `shots` into `dir`, which it empties first, so the folder only ever holds one run's images and its manifest. */
async function capture(origin: string, shots: readonly Shot[], dir: string): Promise<void> {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const shot of shots) {
    const page = await open(origin, shot.query, shot.viewport);
    const file = join(dir, `${shot.name}.png`);
    await page.screenshot({ path: file });
    const ready = await page.evaluate(() => window.__met?.perf.readyMs ?? null);
    console.log(`  ${file}  (?${shot.query}, ready ${ready === null ? '?' : ready.toFixed(0)} ms)`);
    await page.close();
  }
  writeFileSync(join(dir, 'shots.json'), JSON.stringify({ ...revision(), origin, shots }, null, 2));
}

async function shots(origin: string): Promise<void> {
  const probe = await open(origin, 'shot=1&noui=1', MODEL_VIEWPORT);
  const f = await facts(probe);
  await probe.close();
  const n = f.n;
  const cut = Math.round(Math.max(1, f.bounds.max[1] * 0.35) * 2) / 2;
  const list: Shot[] = [
    ...f.presets.map((p) => ({ name: `preset-${p.id}`, query: `shot=1&noui=1&t=${String(n)}&view=${p.id}`, viewport: MODEL_VIEWPORT })),
    { name: 'chapter-00-start', query: 'shot=1&noui=1&t=0&view=aerial-ne', viewport: MODEL_VIEWPORT },
    // The end of each chapter that has steps; chapters without steps share their boundary with the one before.
    ...f.chapters.flatMap((c, i) => (c.count === 0 ? [] : [{ name: `chapter-${String(i + 1).padStart(2, '0')}-${c.id}`, query: `shot=1&noui=1&t=${String(c.first + c.count)}&view=aerial-ne`, viewport: MODEL_VIEWPORT }])),
    { name: 'cut-aerial-ne', query: `shot=1&noui=1&t=${String(n)}&view=aerial-ne&cut=${String(cut)}`, viewport: MODEL_VIEWPORT },
    { name: 'cut-top', query: `shot=1&noui=1&t=${String(n)}&view=top&cut=${String(cut)}`, viewport: MODEL_VIEWPORT },
    ...UI_VIEWPORTS.map((v) => ({ name: `ui-${v.name}`, query: `shot=1&t=${String(n)}`, viewport: v })),
    ...UI_VIEWPORTS.map((v) => ({ name: `ui-mid-${v.name}`, query: `shot=1&t=${String(Math.floor(n / 2) + 0.5)}`, viewport: v })),
  ];
  console.log(`Standard set: ${String(list.length)} images.`);
  await capture(origin, list, join(OUT, 'shots'));
  console.log(`GPU: ${f.gpu}`);
  console.log(`Model: ${String(f.stats.pieces)} pieces, ${String(f.stats.meshes)} meshes, ${String(f.stats.triangles)} triangles at t = N.`);
  console.log(`Build ${f.perf.buildMs.toFixed(0)} ms; ready ${f.perf.readyMs?.toFixed(0) ?? '?'} ms after navigation (first probe page, cold).`);
  const finished = await open(origin, `shot=1&noui=1&t=${String(n)}&view=aerial-ne`, MODEL_VIEWPORT);
  const finishedMs = await finished.evaluate(() => {
    const met = window.__met;
    return met === undefined ? [] : [met.benchmark(30), met.benchmark(30), met.benchmark(30)];
  });
  await finished.close();
  console.log(`Frame at t = N, aerial-ne, 1600x900, shadow update each frame: ${[...finishedMs].sort((a, b) => a - b)[1]?.toFixed(2) ?? '?'} ms (median of three means of 30).`);
}

async function sweep(origin: string, args: Map<string, string>): Promise<void> {
  const t = numberArg(args, 't', null);
  const count = numberArg(args, 'count', 12);
  const seed = numberArg(args, 'seed', Math.floor(Math.random() * 1e6));
  const solo = args.get('solo');
  const base = `shot=1&noui=1&t=${String(t)}${solo === undefined ? '' : `&solo=${encodeURIComponent(solo)}`}`;
  console.log(`Sweep seed ${String(seed)} (repeat with --seed ${String(seed)}), t = ${String(t)}, ${String(count)} cameras.`);
  const probe = await open(origin, base, MODEL_VIEWPORT);
  const f = await facts(probe);
  await probe.close();
  const cams = sweepCameras(seed, count, f.bounds.min, f.bounds.max);
  const list = cams.map((cam, i) => ({ name: String(i).padStart(2, '0'), query: `${base}&cam=${cam}`, viewport: MODEL_VIEWPORT }));
  await capture(origin, list, join(OUT, `sweep-${String(seed)}-t${String(t)}`));
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== 'shots' && command !== 'sweep') {
    console.error('Usage: node scripts/capture.ts shots | sweep --t <t> [--count 12] [--seed <n>] [--solo <chapter>]');
    return 2;
  }
  const args = parseArgs(rest);
  const { rev, dirty } = revision();
  console.log(`Revision ${rev}${dirty ? ' (dirty: uncommitted changes are in these images)' : ' (clean)'}`);
  const origin = await start();
  console.log(`Dev server ${origin}`);
  if (command === 'shots') await shots(origin);
  else await sweep(origin, args);
  if (problems.length > 0) {
    console.error(`The page reported ${String(problems.length)} problem(s):\n${problems.join('\n')}`);
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void cleanup().then(() => process.exit(130));
    });
  }
  main()
    .then(async (code) => {
      await cleanup();
      process.exit(code);
    })
    .catch(async (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      await cleanup();
      process.exit(1);
    });
}
