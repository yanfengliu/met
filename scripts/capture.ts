/**
 * Capture tooling (docs/design/spec.md, Verification), run by Node's own TypeScript support:
 *   npm run shots                         the standard set: every preset at the finished state, the aerial preset at t = 0 and at each chapter boundary,
 *                                         the section cut, each floor of the floor picker (framed on its own, and from aerial-ne and top), the walker's
 *                                         view at each walk spawn, the doors (the entrance closed and open, Weston's door, a cut through the open
 *                                         entrance), and the page UI at 1280x720 and 390x844 (also walking), into .shots/shots/
 *   npm run shots -- [--solo <chapter>] [--presets id,id]
 *                                         the same set for one chapter (into .shots/shots-<chapter>/) and/or only the named presets;
 *                                         --solo must be one of the page's chapter ids (window.__met.chapters), or the run fails before writing anything
 *   npm run sweep -- --t 6.5 [--count 12] [--seed 7] [--solo <chapter>]
 *                                         seeded random cameras around the model's bounds at one t, into .shots/sweep-<seed>-t<t>/
 * Each run starts its own Vite dev server on this worktree's MET_PORT through Vite's JS API (strict port: a taken port fails the run instead of
 * attaching to another server), drives the installed Chrome through Playwright, waits for `window.__shotReady`, prints the git revision with a dirty
 * flag so each image is tied to code, and stops the server and browser on every exit path. A console error on any page fails the run.
 * Each run empties its own output folder first, and only ever a folder strictly inside .shots/ (insideShots).
 * Bound: images are written, not judged; a person or agent inspects each one at native resolution.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

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
/**
 * Cameras on the doors (`cam=` values, world metres): the entrance's three doorways from the landing a little north of the axis, at a walker's eye; the
 * Petrie Court's side of Weston's door; and the entrance from above and in front, for a cut at 6.5 m through its leaves.
 */
const DOOR_CAMS = { entrance: '2.2,5.6,8,0,6.2,-1.2', weston: '-57,5.8,-100.5,-49.4,6.4,-103.65', cut: '5,15,9,0,5.2,-2.5' } as const;

/** What the page publishes on `window.__met` that this script reads. */
interface Facts {
  readonly n: number;
  readonly chapters: readonly { readonly id: string; readonly first: number; readonly count: number }[];
  readonly presets: readonly { readonly id: string; readonly group: string }[];
  readonly bounds: { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] };
  readonly gpu: string;
  readonly perf: { readonly buildMs: number; readonly readyMs: number | null };
  readonly stats: { readonly pieces: number; readonly meshes: number; readonly triangles: number };
  readonly walk: { readonly spawns: readonly string[] };
  readonly floors: readonly { readonly id: string }[];
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

/**
 * `dir`, resolved, when it lies strictly inside `root` (by default `.shots/`); anything else throws. Every delete in this script goes through it,
 * so no option value can aim a recursive delete at the repository or anywhere outside `.shots/`.
 */
export function insideShots(dir: string, root: string = OUT): string {
  const target = resolve(dir);
  const rel = relative(resolve(root), target);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Refusing to empty ${target}: capture deletes only folders inside ${resolve(root)}.`);
  }
  return target;
}

/** Throws unless `solo` is absent or one of the page's chapter ids (`window.__met.chapters`). */
export function checkSolo(solo: string | undefined, chapterIds: readonly string[]): void {
  if (solo === undefined || chapterIds.includes(solo)) return;
  throw new Error(`--solo "${solo}" names no chapter; use one of ${chapterIds.join(', ')}.`);
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

/** Writes `shots` into `dir`, which must lie inside `.shots/` and is emptied first, so the folder only ever holds one run's images and its manifest. */
export async function capture(origin: string, shots: readonly Shot[], dir: string): Promise<void> {
  rmSync(insideShots(dir), { recursive: true, force: true });
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

async function shots(origin: string, args: Map<string, string>): Promise<void> {
  const solo = args.get('solo');
  const extra = solo === undefined ? '' : `&solo=${encodeURIComponent(solo)}`;
  const probe = await open(origin, `shot=1&noui=1${extra}`, MODEL_VIEWPORT);
  const f = await facts(probe);
  await probe.close();
  checkSolo(solo, f.chapters.map((c) => c.id));
  const only = args.get('presets')?.split(',').filter((id) => id !== '');
  const missing = only?.filter((id) => !f.presets.some((p) => p.id === id)) ?? [];
  if (missing.length > 0) throw new Error(`--presets names unknown preset(s) ${missing.join(', ')}; known: ${f.presets.map((p) => p.id).join(', ')}.`);
  const presets = only === undefined ? f.presets : f.presets.filter((p) => only.includes(p.id));
  const n = f.n;
  const cut = Math.round(Math.max(1, f.bounds.max[1] * 0.35) * 2) / 2;
  const list: Shot[] = [
    ...presets.map((p) => ({ name: `preset-${p.id}`, query: `shot=1&noui=1&t=${String(n)}&view=${p.id}`, viewport: MODEL_VIEWPORT })),
    { name: 'chapter-00-start', query: 'shot=1&noui=1&t=0&view=aerial-ne', viewport: MODEL_VIEWPORT },
    // The end of each chapter that has steps; chapters without steps share their boundary with the one before.
    ...f.chapters.flatMap((c, i) => (c.count === 0 ? [] : [{ name: `chapter-${String(i + 1).padStart(2, '0')}-${c.id}`, query: `shot=1&noui=1&t=${String(c.first + c.count)}&view=aerial-ne`, viewport: MODEL_VIEWPORT }])),
    { name: 'cut-aerial-ne', query: `shot=1&noui=1&t=${String(n)}&view=aerial-ne&cut=${String(cut)}`, viewport: MODEL_VIEWPORT },
    { name: 'cut-top', query: `shot=1&noui=1&t=${String(n)}&view=top&cut=${String(cut)}`, viewport: MODEL_VIEWPORT },
    ...f.floors.flatMap((floor) => [
      { name: `floor-${floor.id}`, query: `shot=1&noui=1&t=${String(n)}&floor=${floor.id}`, viewport: MODEL_VIEWPORT },
      ...['aerial-ne', 'top'].map((view) => ({ name: `floor-${floor.id}-${view}`, query: `shot=1&noui=1&t=${String(n)}&floor=${floor.id}&view=${view}`, viewport: MODEL_VIEWPORT })),
    ]),
    ...f.walk.spawns.map((id) => ({ name: `walk-${id}`, query: `shot=1&noui=1&t=${String(n)}&walk=1&spawn=${id}`, viewport: MODEL_VIEWPORT })),
    ...(['closed', 'open'] as const).map((state) => ({ name: `doors-entrance-${state}`, query: `shot=1&noui=1&t=${String(n)}&cam=${DOOR_CAMS.entrance}&doors=${state}`, viewport: MODEL_VIEWPORT })),
    { name: 'doors-weston', query: `shot=1&noui=1&t=${String(n)}&cam=${DOOR_CAMS.weston}`, viewport: MODEL_VIEWPORT },
    { name: 'doors-cut-open', query: `shot=1&noui=1&t=${String(n)}&cam=${DOOR_CAMS.cut}&cut=6.5&doors=open`, viewport: MODEL_VIEWPORT },
    ...UI_VIEWPORTS.map((v) => ({ name: `ui-${v.name}`, query: `shot=1&t=${String(n)}`, viewport: v })),
    ...UI_VIEWPORTS.map((v) => ({ name: `ui-mid-${v.name}`, query: `shot=1&t=${String(Math.floor(n / 2) + 0.5)}`, viewport: v })),
    // The walking screen: the crosshair, the status line's hint and the folded bar.
    ...UI_VIEWPORTS.map((v) => ({ name: `ui-walk-${v.name}`, query: `shot=1&t=${String(n)}&walk=1&spawn=great-hall`, viewport: v })),
  ];
  const scoped = list.map((s) => ({ ...s, query: `${s.query}${extra}` }));
  console.log(`Standard set${solo === undefined ? '' : ` (solo ${solo})`}: ${String(scoped.length)} images.`);
  await capture(origin, scoped, join(OUT, solo === undefined ? 'shots' : `shots-${solo}`));
  console.log(`GPU: ${f.gpu}`);
  console.log(`Model: ${String(f.stats.pieces)} pieces, ${String(f.stats.meshes)} meshes, ${String(f.stats.triangles)} triangles at t = N.`);
  console.log(`Build ${f.perf.buildMs.toFixed(0)} ms; ready ${f.perf.readyMs?.toFixed(0) ?? '?'} ms after navigation (first probe page, cold).`);
  // The benchmark page keeps the solo query, so it measures the same selection at its own N.
  const finished = await open(origin, `shot=1&noui=1&t=${String(n)}&view=aerial-ne${extra}`, MODEL_VIEWPORT);
  const finishedMs = await finished.evaluate(() => {
    const met = window.__met;
    return met === undefined ? [] : [met.benchmark(30), met.benchmark(30), met.benchmark(30)];
  });
  await finished.close();
  console.log(`Frame at t = N${solo === undefined ? '' : ` (solo ${solo})`}, aerial-ne, 1600x900, shadow update each frame: ${[...finishedMs].sort((a, b) => a - b)[1]?.toFixed(2) ?? '?'} ms (median of three means of 30).`);
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
  checkSolo(solo, f.chapters.map((c) => c.id));
  const cams = sweepCameras(seed, count, f.bounds.min, f.bounds.max);
  const list = cams.map((cam, i) => ({ name: String(i).padStart(2, '0'), query: `${base}&cam=${cam}`, viewport: MODEL_VIEWPORT }));
  await capture(origin, list, join(OUT, `sweep-${String(seed)}-t${String(t)}`));
}

/** One run of the command line `argv` (as after `node scripts/capture.ts`): starts the server and browser, captures, and stops both on every path. */
export async function run(argv: readonly string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command !== 'shots' && command !== 'sweep') {
    console.error('Usage: node scripts/capture.ts shots [--solo <chapter>] [--presets id,id] | sweep --t <t> [--count 12] [--seed <n>] [--solo <chapter>]');
    return 2;
  }
  const args = parseArgs(rest);
  const { rev, dirty } = revision();
  console.log(`Revision ${rev}${dirty ? ' (dirty: uncommitted changes are in these images)' : ' (clean)'}`);
  problems.length = 0;
  try {
    const origin = await start();
    console.log(`Dev server ${origin}`);
    if (command === 'shots') await shots(origin, args);
    else await sweep(origin, args);
  } finally {
    await cleanup();
  }
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
  run(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch(async (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      await cleanup();
      process.exit(1);
    });
}
