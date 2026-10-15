/**
 * The capture script's guards: `--solo` must name a chapter id, and every folder it empties must lie strictly inside `.shots/`; checked as pure
 * functions and through the real run (`run`, `capture`) with the file system's writes, git, Vite and the browser replaced by recorders, so a bad
 * `--solo` is shown to fail before any delete, a delete outside `.shots/` is refused at the call site, and every page of a solo run, the benchmark
 * page included, carries the solo query at that selection's N.
 * Bound: the fake browser serves fixed facts and draws nothing; that the real pages honour the query is the page's own contract (tests/e2e).
 */
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Fs from 'node:fs';
import { capture, checkSolo, insideShots, run } from './capture.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, '.shots');

const fake = vi.hoisted(() => {
  const record = { removed: [] as string[], made: [] as string[], written: [] as string[], visited: [] as string[], shots: [] as string[], benchmarkedAt: [] as string[], current: '' };
  const facts = {
    n: 34,
    chapters: [{ id: 'site', first: 0, count: 10 }, { id: 'hunt-1902', first: 10, count: 24 }],
    presets: [{ id: 'aerial-ne', group: 'exterior' }, { id: 'top', group: 'exterior' }],
    bounds: { min: [-10, 0, -10], max: [10, 20, 10] },
    gpu: 'fake GPU',
    perf: { buildMs: 1, readyMs: 2 },
    stats: { pieces: 1, meshes: 1, triangles: 1 },
    walk: { spawns: ['plaza'] },
    benchmark: () => {
      record.benchmarkedAt.push(record.current);
      return 3;
    },
  };
  const page = (): Record<string, unknown> => {
    let url = '';
    return {
      on: () => undefined,
      goto: (u: string) => {
        url = u;
        record.visited.push(u);
        return Promise.resolve(null);
      },
      waitForFunction: () => Promise.resolve(),
      evaluate: (fn: () => unknown) => {
        record.current = url;
        return Promise.resolve(fn());
      },
      screenshot: ({ path }: { path: string }) => {
        record.shots.push(path);
        return Promise.resolve();
      },
      close: () => Promise.resolve(),
    };
  };
  const browser = { newPage: () => Promise.resolve(page()), close: () => Promise.resolve() };
  const server = { listen: () => Promise.resolve(), resolvedUrls: { local: ['http://127.0.0.1:9/'] }, close: () => Promise.resolve() };
  return { record, facts, browser, server };
});

vi.mock('node:fs', async (importOriginal) => {
  const real = await importOriginal<typeof Fs>();
  return {
    ...real,
    rmSync: (path: string) => {
      fake.record.removed.push(path);
    },
    mkdirSync: (path: string) => {
      fake.record.made.push(path);
    },
    writeFileSync: (path: string) => {
      fake.record.written.push(path);
    },
  };
});
vi.mock('node:child_process', () => ({ execFileSync: (_command: string, args: readonly string[]) => (args[0] === 'rev-parse' ? 'abc1234' : '') }));
vi.mock('vite', () => ({ createServer: () => Promise.resolve(fake.server) }));
vi.mock('@playwright/test', () => ({ chromium: { launch: () => Promise.resolve(fake.browser) } }));

describe('insideShots', () => {
  it('accepts the folders capture writes', () => {
    for (const name of ['shots', 'shots-hunt-1902', 'sweep-7-t6.5', 'sweep-123-t-1']) expect(insideShots(join(OUT, name))).toBe(join(OUT, name));
  });

  it.each([
    ['a solo of ../../.. (the repository root)', join(OUT, 'shots-../../..')],
    ['.shots itself', OUT],
    ['the repository root', ROOT],
    ['a sibling of .shots', join(ROOT, 'src')],
    ['a name that only starts like .shots', join(ROOT, '.shots-evil')],
    ['a folder outside the repository', resolve(ROOT, '..', 'elsewhere')],
  ])('refuses %s', (_, dir) => {
    expect(() => insideShots(dir)).toThrow(/^Refusing to empty .*: capture deletes only folders inside /);
  });
});

describe('checkSolo', () => {
  const ids = ['site', 'hunt-1902', 'koch-plaza-2014'];

  it('accepts no solo and a known chapter id', () => {
    expect(() => { checkSolo(undefined, ids); }).not.toThrow();
    expect(() => { checkSolo('hunt-1902', ids); }).not.toThrow();
  });

  it.each(['../../..', 'hunt', 'HUNT-1902', ''])('rejects %j and names the value and the known ids', (solo) => {
    expect(() => { checkSolo(solo, ids); }).toThrow(`--solo "${solo}" names no chapter; use one of site, hunt-1902, koch-plaza-2014.`);
  });
});

describe('the capture run', () => {
  beforeEach(() => {
    for (const list of [fake.record.removed, fake.record.made, fake.record.written, fake.record.visited, fake.record.shots, fake.record.benchmarkedAt]) list.length = 0;
    vi.stubGlobal('window', { __shotReady: true, __met: fake.facts });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([['shots'], ['sweep', '--t', '3']])('%s rejects a --solo that names no chapter before it deletes or captures anything', async (...command) => {
    await expect(run([...command, '--solo', '../../..'])).rejects.toThrow('--solo "../../.." names no chapter; use one of site, hunt-1902.');
    expect([fake.record.removed, fake.record.made, fake.record.shots]).toEqual([[], [], []]);
  });

  it('empties only its own folder inside .shots/, and every page of a solo run, the benchmark included, keeps the solo query', async () => {
    await expect(run(['shots', '--solo', 'hunt-1902', '--presets', 'aerial-ne'])).resolves.toBe(0);
    expect(fake.record.removed).toEqual([join(OUT, 'shots-hunt-1902')]);
    expect(fake.record.shots.length).toBeGreaterThan(5);
    expect(fake.record.visited.filter((url) => !url.includes('solo=hunt-1902')), 'pages without the solo query').toEqual([]);
    expect(fake.record.benchmarkedAt, 'pages the frame benchmark ran on').toHaveLength(3);
    for (const url of fake.record.benchmarkedAt) expect(new URL(url).searchParams.get('t'), url).toBe(String(fake.facts.n));
    for (const url of fake.record.benchmarkedAt) expect(new URL(url).searchParams.get('solo'), url).toBe('hunt-1902');
  });

  it('refuses at the call site to empty a folder outside .shots/', async () => {
    await expect(capture('http://127.0.0.1:9', [], join(ROOT, 'src'))).rejects.toThrow(/^Refusing to empty /);
    expect(fake.record.removed).toEqual([]);
  });
});
