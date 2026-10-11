/**
 * Captures the parts gallery (parts.html) into `.shots/parts/`: the whole gallery, then every exhibit from at least two angles plus each of its named close-ups.
 *
 * Run: `MET_PORT=5330 node scripts/shots-parts.ts [--only id,id,...] [--views three-quarter,rear-quarter] [--size 1200x900]`
 * (Node 24 runs the TypeScript directly by stripping its types; it is not a package.json script.)
 *
 * It starts its own Vite dev server on this worktree's MET_PORT through Vite's JS API (strict port: a taken port fails the run, it never attaches to a running server)
 * and stops it on every exit path (success, failure, Ctrl+C, SIGTERM). It drives the installed Chrome through Playwright's library (`channel: 'chrome'`), headless.
 * Output names are `<id>--<view>.png`, `<id>--closeup-<name>-<view>.png` and `gallery--overview.png`; it prints the git revision and whether the tree was dirty, so a capture can be tied to the code it shows.
 * Bound: it proves each page reached `window.__shotReady` without console errors and wrote a PNG; whether the PNGs look right is for the person reading them.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser, type ConsoleMessage, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

import type { metPort as MetPort } from './met-port.js';

interface Exhibit {
  id: string;
  closeups: string[];
}

// Node resolves the module by its real file name; the type comes from the type-only import above.
const { metPort } = (await import(new URL('./met-port.ts', import.meta.url).href)) as { metPort: typeof MetPort };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.shots', 'parts');

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value, e.g. --${name} ${fallback === '' ? 'value' : fallback}`);
  return value;
}

function list(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const only = list(option('only', ''));
const views = list(option('views', 'three-quarter,rear-quarter'));
const [width = 0, height = 0] = option('size', '1200x900').split('x').map(Number);
if (!(width > 0 && height > 0)) throw new Error('--size must look like 1200x900 (width x height in pixels)');

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let stopping: Promise<void> | undefined;

function stop(): Promise<void> {
  stopping ??= (async () => {
    await browser?.close().catch(() => undefined);
    await server?.close().catch(() => undefined);
  })();
  return stopping;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.error(`shots-parts: ${signal}, stopping the dev server`);
    void stop().then(() => process.exit(130));
  });
}
process.on('uncaughtException', (error) => {
  console.error(error);
  void stop().then(() => process.exit(1));
});

async function capture(page: Page, url: string, file: string, problems: string[]): Promise<void> {
  const errors: string[] = [];
  const onConsole = (message: ConsoleMessage): void => {
    if (message.type() === 'error') errors.push(message.text());
  };
  const onError = (error: Error): void => {
    errors.push(error.message);
  };
  page.on('console', onConsole);
  page.on('pageerror', onError);
  try {
    const response = await page.goto(url);
    if (response?.status() !== 200) throw new Error(`GET ${url} answered ${String(response?.status())}`);
    await page.waitForFunction(() => window.__shotReady === true, undefined, { timeout: 60_000 });
    await page.screenshot({ path: file });
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onError);
  }
  if (errors.length > 0) problems.push(`${url}: ${errors.join(' | ')}`);
}

async function main(): Promise<void> {
  const port = metPort();
  const revision = git(['rev-parse', '--short', 'HEAD']);
  const dirty = git(['status', '--porcelain']) !== '';
  const state = `revision ${revision}${dirty ? ' (dirty tree)' : ' (clean tree)'}`;
  console.log(`shots-parts: ${state}, port ${String(port)}`);
  mkdirSync(outDir, { recursive: true });
  server = await createServer({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'warn', clearScreen: false, server: { port, strictPort: true, host: '127.0.0.1' } });
  await server.listen();
  const origin = `http://127.0.0.1:${String(port)}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const problems: string[] = [];
  let written = 0;

  // The gallery itself, larger, so every label is legible.
  await page.setViewportSize({ width: 1800, height: 1150 });
  await capture(page, `${origin}/parts.html?shot=1`, join(outDir, 'gallery--overview.png'), problems);
  written++;
  const parts: Exhibit[] = await page.evaluate(() => (window.__parts ?? []).map((part) => ({ id: part.id, closeups: part.closeups })));
  await page.setViewportSize({ width, height });
  const chosen = only.length > 0 ? parts.filter((part) => only.includes(part.id)) : parts;
  // `--only none` captures the gallery alone.
  const missing = only.filter((id) => id !== 'none' && !parts.some((part) => part.id === id));
  if (missing.length > 0) problems.push(`no exhibit with id ${missing.join(', ')}; known ids: ${parts.map((part) => part.id).join(', ')}`);
  for (const part of chosen) {
    for (const view of views) {
      await capture(page, `${origin}/parts.html?shot=1&part=${encodeURIComponent(part.id)}&view=${view}`, join(outDir, `${part.id}--${view}.png`), problems);
      written++;
    }
    for (const name of part.closeups) {
      // Close-ups from eye level and from below, the way a facade detail is seen from the street.
      for (const view of ['three-quarter', 'low']) {
        await capture(page, `${origin}/parts.html?shot=1&noui=1&part=${encodeURIComponent(part.id)}&closeup=${encodeURIComponent(name)}&view=${view}`, join(outDir, `${part.id}--closeup-${name}-${view}.png`), problems);
        written++;
      }
    }
  }
  console.log(`shots-parts: wrote ${String(written)} images for ${String(chosen.length)} exhibits into ${outDir}`);
  console.log(`shots-parts: ${state}`);
  if (problems.length > 0) {
    console.error(`shots-parts: ${String(problems.length)} problem(s):\n  ${problems.join('\n  ')}`);
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stop();
}
