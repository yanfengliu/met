/**
 * Starts the e2e browser where its pointer lock cannot confine or move the owner's cursor (work unit 20, docs/learning/defect-register.md).
 *
 * On Windows, Chrome's pointer lock confines the system cursor to the page and moves it, headless or not. Unless the run shows its browser (scripts/window-station.ts
 * `browserPlace`), this starts the browser as a Playwright browser server (tests/e2e/browser-server.ts) in a separate, non-interactive window station, where Windows
 * refuses those calls, and sets MET_TEST_BROWSER_WS before the workers start; each worker reads it in playwright.config.ts and connects instead of launching.
 * The runner, the dev server and the reporters stay on the desktop. Ending the server ends its standard input, which closes the browser, then, if the server has not
 * ended within 30 s, ends the launcher, which ends the job and everything in it. The server's temporary folder, which holds Chrome's profile, is its own: the launcher
 * removes it once the server and the rest of its job have ended, even when the runner has died, and this removes it too should the launcher have been ended first
 * (reviews 0 and 1, F3). A run that puts the browser on the desktop clears MET_TEST_BROWSER_WS, so a value left from elsewhere cannot connect its workers (review 1, F5).
 * Bound: one server per run, given 60 s to start, decided once, so a browser shown later, as UI mode's "show browser" asks, needs `--headed` when the run starts.
 * A kill of the runner's whole process tree, as `taskkill /T /F` does, ends the launcher with it, so neither removes the folder: nothing keeps running, since the job
 * ends with the launcher, but the folder stays in %TEMP%, as Playwright's own profiles did before (review 2, F3). tests/e2e/cursor.spec.ts is the gate.
 */
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { FullConfig } from '@playwright/test';

import { browserPlace, startInWindowStation, TEST_BROWSER_ENDPOINT } from '../../scripts/window-station.js';

const SERVER = join(import.meta.dirname, 'browser-server.ts');
const START_MS = 60_000;
// Over browser-server.ts's own 10 s bound on the browser's close.
const STOP_MS = 30_000;

/** Reads the server's endpoint line; rejects, with what the server said on standard error, if it ends or gives none in time. */
function endpointOf(server: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = '';
    let err = '';
    let settled = false;
    const settle = (endpoint: string | undefined, why: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (endpoint !== undefined) {
        resolve(endpoint);
        return;
      }
      reject(
        new Error(
          `The e2e browser did not start in a separate window station: ${why}.${err === '' ? '' : ` It said: ${err.trim()}`} ` +
            "MET_E2E_DESKTOP=1 starts it on the owner's desktop instead, where its pointer lock confines and moves the owner's cursor, so set it only with the " +
            "owner's agreement; tests/e2e/cursor.spec.ts fails under it (review 2, F9).",
        ),
      );
    };
    const timer = setTimeout(() => {
      settle(undefined, `no endpoint within ${String(START_MS / 1000)} s`);
    }, START_MS);
    server.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      out += chunk;
      for (const line of out.split('\n')) {
        if (!line.startsWith('{')) continue;
        try {
          const parsed: unknown = JSON.parse(line);
          if (typeof parsed === 'object' && parsed !== null && 'wsEndpoint' in parsed && typeof parsed.wsEndpoint === 'string') settle(parsed.wsEndpoint, '');
        } catch {
          // A partial line; the rest comes with the next chunk.
        }
      }
    });
    server.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
      err += chunk;
      process.stderr.write(chunk);
    });
    server.on('error', (error) => {
      settle(undefined, `the launcher could not start (${error.message})`);
    });
    server.on('exit', (code) => {
      settle(undefined, `the launcher ended with status ${String(code)}`);
    });
  });
}

/** Ends the server's standard input, which ends it, and ends the launcher, and so its job, if the server has not ended in time. */
async function stop(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => {
    server.once('exit', () => {
      resolve();
    });
  });
  server.stdin?.end();
  const ended = await Promise.race([exited.then(() => true), delay(STOP_MS).then(() => false)]);
  if (!ended) {
    server.kill();
    await exited;
  }
}

export default async function globalSetup(config: FullConfig): Promise<(() => Promise<void>) | undefined> {
  const headless = config.projects.every((project) => project.use.headless !== false);
  const place = browserPlace(process.platform, headless, process.env);
  if (place.place === 'desktop') {
    process.env[TEST_BROWSER_ENDPOINT] = '';
    // On Windows the desktop means the owner's cursor; say why, so a gate that fails here says it too (review 3, F11).
    if (process.platform === 'win32') process.stderr.write(`global-setup.ts: the e2e browser starts on the desktop: ${place.reason}.\n`);
    return undefined;
  }
  const channel = config.projects[0]?.use.channel ?? '';
  const temp = mkdtempSync(join(tmpdir(), 'met-e2e-browser-'));
  const server = startInWindowStation([process.execPath, SERVER, channel], config.rootDir, ['pipe', 'pipe', 'pipe'], {
    TEMP: temp,
    TMP: temp,
    MET_WINDOW_STATION_TEMP: temp,
  });
  const end = async (): Promise<void> => {
    await stop(server);
    try {
      rmSync(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      process.stderr.write(`global-setup.ts: could not remove the e2e browser's temporary folder ${temp}: ${String(error)}\n`);
    }
  };
  try {
    process.env[TEST_BROWSER_ENDPOINT] = await endpointOf(server);
  } catch (error) {
    await end();
    throw error;
  }
  return end;
}
