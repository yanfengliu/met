/**
 * The window-station launcher: scripts/window-station.ts and scripts/window-station.ps1, and the e2e browser server it runs (work unit 20).
 *
 * Bound: the quoting, the browser's place and the workers' connection are checked on every host. Only on Windows, one run through the launcher starts node.exe in
 * the window station and checks that its arguments arrive unchanged, its output comes back and its exit status is the launcher's; and two runs of
 * tests/e2e/browser-server.ts there, with the system Chrome, check that the server ends when its input ends, while the browser starts and after its endpoint, and
 * that the launcher removes the temporary folder it was given (review 1, F7). Whether the cursor stays free is tests/e2e/cursor.spec.ts's to check.
 */
import type { ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { describe, expect, it } from 'vitest';

import { browserPlace, startInWindowStation, TEST_BROWSER_ENDPOINT, testBrowserConnection, windowsArgument, windowsCommandLine } from './window-station.js';

const B = '\\';
const ROOT = join(import.meta.dirname, '..');
const SERVER = join(ROOT, 'tests', 'e2e', 'browser-server.ts');

/**
 * How long a test here waits for the launcher to end: a bound on a hang, not a measure of speed. At 100% CPU (28 busy threads beside the machine's own work,
 * 2026-11-11, work unit 30) the browser server's runs below took 40 to 60 s from the start to the launcher's end, where 20 s, the bound before, raced them.
 */
const HANG_MS = 120_000;
/** A test's own timeout: its wait for the launcher and the cleanup after it, with room. */
const TEST_MS = 180_000;

/**
 * The launcher's exit status, or 'deadline' when it has not ended HANG_MS on, under the test's own timeout, and is ended then with its job; and what the
 * command printed until then. It settles on `close`, which comes after the last output, and after a start that failed, where `exit` never comes (review 3, F8).
 */
function finished(child: ChildProcess): Promise<{ readonly status: number | 'deadline' | null; readonly out: string; readonly err: string }> {
  let out = '';
  let err = '';
  child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
    out += chunk;
  });
  child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
    err += chunk;
  });
  child.on('error', (error) => {
    err += String(error);
  });
  return new Promise((resolve) => {
    const deadline = setTimeout(() => {
      child.kill();
      resolve({ status: 'deadline', out, err });
    }, HANG_MS);
    child.on('close', (status) => {
      clearTimeout(deadline);
      resolve({ status, out, err });
    });
  });
}

/**
 * Starts the e2e browser server in the window station with a temporary folder of its own, as tests/e2e/global-setup.ts does. `cleanup` ends the launcher, and so its
 * job, if it still runs, waits up to 10 s for it to close, and removes the folder, saying so on standard error rather than throwing, so a failing test leaves nothing
 * running and keeps its own failure (reviews 2 and 3, F8 and F10).
 */
function startServer(): { readonly child: ChildProcess; readonly temp: string; readonly cleanup: () => Promise<void> } {
  const temp = mkdtempSync(join(tmpdir(), 'met-e2e-test-'));
  const child = startInWindowStation([process.execPath, SERVER, 'chrome'], ROOT, ['pipe', 'pipe', 'pipe'], { TEMP: temp, TMP: temp, MET_WINDOW_STATION_TEMP: temp });
  const closed = new Promise<void>((resolve) => {
    child.once('close', () => {
      resolve();
    });
  });
  const cleanup = async (): Promise<void> => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await Promise.race([closed, delay(10_000)]);
    try {
      rmSync(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      process.stderr.write(`window-station.test.ts: could not remove ${temp}: ${String(error)}\n`);
    }
  };
  return { child, temp, cleanup };
}

describe('windowsArgument', () => {
  it('leaves an argument with no space or quote as it is, backslashes and all', () => {
    for (const arg of ['plain', `C:${B}dir${B}file.ts`, `trailing${B}`, '--flag=1', 'ü✓']) expect(windowsArgument(arg)).toBe(arg);
  });

  it('quotes an empty argument and one with a space, a tab or a quote, doubling only the backslashes before a quote', () => {
    expect(windowsArgument('')).toBe('""');
    expect(windowsArgument('two words')).toBe('"two words"');
    expect(windowsArgument('tab\there')).toBe('"tab\there"');
    expect(windowsArgument('a"quote')).toBe(`"a${B}"quote"`);
    expect(windowsArgument(`slash${B}"quote`)).toBe(`"slash${B}${B}${B}"quote"`);
    expect(windowsArgument(`C:${B}Program Files${B}x${B}`)).toBe(`"C:${B}Program Files${B}x${B}${B}"`);
    expect(windowsArgument(`a b${B}${B}`)).toBe(`"a b${B}${B}${B}${B}"`);
  });

  it('joins a command line, the program first', () => {
    expect(windowsCommandLine([`C:${B}Program Files${B}node.exe`, 'x.ts', ''])).toBe(`"C:${B}Program Files${B}node.exe" x.ts ""`);
  });
});

describe('browserPlace', () => {
  it('puts a headless run on Windows in the window station', () => {
    expect(browserPlace('win32', true, {})).toEqual({ place: 'window station' });
  });

  it('keeps it on the desktop off Windows, for a headed or PWDEBUG run, and for MET_E2E_DESKTOP=1, saying why', () => {
    for (const [platform, headless, env] of [
      ['linux', true, {}],
      ['win32', false, {}],
      ['win32', true, { PWDEBUG: '1' }],
      ['win32', true, { MET_E2E_DESKTOP: '1' }],
    ] as const) {
      const place = browserPlace(platform, headless, env);
      expect(place.place).toBe('desktop');
      expect(place.place === 'desktop' && place.reason.length > 0).toBe(true);
    }
  });

  it("reads PWDEBUG as Playwright does: only its inspector shows the browser, and npm's config stands in for it (reviews 0 and 1, F0)", () => {
    for (const env of [
      { PWDEBUG: '' },
      { PWDEBUG: '0' },
      { PWDEBUG: 'false' },
      { PWDEBUG: 'console' },
      { npm_package_config_pwdebug: 'console' },
      { PWDEBUG: '0', npm_config_pwdebug: '1' },
      { MET_E2E_DESKTOP: '0' },
    ]) {
      expect(browserPlace('win32', true, env), JSON.stringify(env)).toEqual({ place: 'window station' });
    }
    for (const env of [{ PWDEBUG: '1' }, { PWDEBUG: 'inspector' }, { npm_config_pwdebug: '1' }, { npm_package_config_pwdebug: 'yes' }]) {
      expect(browserPlace('win32', true, env).place, JSON.stringify(env)).toBe('desktop');
    }
  });
});

describe('testBrowserConnection', () => {
  it('connects to the endpoint the setup set, and to nothing before it has set one', () => {
    expect(testBrowserConnection({ [TEST_BROWSER_ENDPOINT]: 'ws://127.0.0.1:1234/abc' })).toEqual({ wsEndpoint: 'ws://127.0.0.1:1234/abc' });
    expect(testBrowserConnection({})).toBeUndefined();
    expect(testBrowserConnection({ [TEST_BROWSER_ENDPOINT]: '' })).toBeUndefined();
  });
});

describe('startInWindowStation', () => {
  it.runIf(process.platform === 'win32')('runs node.exe in the window station with every argument unchanged, its output and its exit status', async () => {
    const args = ['plain', '', 'two words', 'a"quote', `trailing${B}`, `slash${B}"quote`, `C:${B}Program Files${B}x${B}`, 'ü ✓ —'];
    const code = 'process.stdout.write(JSON.stringify(process.argv.slice(1))); process.exit(7)';
    const { status, out, err } = await finished(startInWindowStation([process.execPath, '-e', code, ...args], process.cwd(), ['ignore', 'pipe', 'pipe']));
    expect(err).toBe('');
    expect(status).toBe(7);
    expect(JSON.parse(out)).toEqual(args);
  }, TEST_MS);
});

describe('the e2e browser server in the window station', () => {
  it.runIf(process.platform === 'win32')('ends at once when its input ends while the browser starts, and its folder is removed (review 1, F7)', async () => {
    const { child, temp, cleanup } = startServer();
    try {
      const done = finished(child);
      child.stdin?.end();
      const { status, out } = await done;
      // 1 is the exit before the browser is up; a server that heard the end only once the browser was up would close it and end with 0 (review 0, F2).
      expect(status).toBe(1);
      expect(out).toBe('');
      expect(existsSync(temp)).toBe(false);
    } finally {
      await cleanup();
    }
  }, TEST_MS);

  it.runIf(process.platform === 'win32')('closes the browser and ends with 0 when its input ends after its endpoint, and its folder is removed', async () => {
    const { child, temp, cleanup } = startServer();
    try {
      const done = finished(child);
      let printed = '';
      child.stdout?.on('data', (chunk: string) => {
        // The whole line, which may come in more than one chunk (review 2, F8).
        printed += chunk;
        if (printed.includes('\n')) child.stdin?.end();
      });
      const { status, out } = await done;
      expect(out).toMatch(/^\{"wsEndpoint":"ws:\/\/[^"]+"\}\n$/u);
      expect(status).toBe(0);
      expect(existsSync(temp)).toBe(false);
    } finally {
      await cleanup();
    }
  }, TEST_MS);
});
