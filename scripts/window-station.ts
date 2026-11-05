/**
 * Starts a command where nothing it starts can confine or move the owner's cursor (work unit 20, docs/learning/defect-register.md).
 *
 * On Windows, Chrome's pointer lock confines the system cursor to the page (`ClipCursor`) and moves it (`SetCursorPos`), headless or not, and the e2e specs that walk take that lock.
 * Windows refuses both to a program in a separate, non-interactive window station, which `scripts/window-station.ps1` makes and runs the command in; a hidden desktop in the interactive window station stops only the moves.
 * `tests/e2e/global-setup.ts` starts the e2e browser there, `playwright.config.ts` connects the workers to it, and `tests/e2e/cursor.spec.ts` is the gate.
 * Bound: `windowsCommandLine` quotes for programs that split their command line as the Microsoft C runtime does, as node.exe does; `browserPlace` decides only from what it is given.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess, StdioOptions } from 'node:child_process';
import { join } from 'node:path';

/** The PowerShell launcher that makes the window station and runs the command in it (its header says how). */
export const WINDOW_STATION_LAUNCHER = join(import.meta.dirname, 'window-station.ps1');

/** The variable that carries the e2e browser server's endpoint from the global setup to the workers. */
export const TEST_BROWSER_ENDPOINT = 'MET_TEST_BROWSER_WS';

/** Quotes one argument so that a program splitting its command line as the Microsoft C runtime does gets it back unchanged. */
export function windowsArgument(arg: string): string {
  if (arg !== '' && !/[\s"]/u.test(arg)) return arg;
  let quoted = '"';
  let backslashes = 0;
  for (const ch of arg) {
    if (ch === '\\') {
      backslashes += 1;
      continue;
    }
    // Backslashes are literal except before a quote, where each must be doubled and the quote itself escaped.
    quoted += ch === '"' ? `${'\\'.repeat(backslashes * 2 + 1)}"` : `${'\\'.repeat(backslashes)}${ch}`;
    backslashes = 0;
  }
  return `${quoted}${'\\'.repeat(backslashes * 2)}"`;
}

/** The Windows command line that runs `argv`, the program first. */
export function windowsCommandLine(argv: readonly string[]): string {
  return argv.map(windowsArgument).join(' ');
}

/** Where the e2e browser runs, and when it is the desktop, why. */
export type BrowserPlace = { readonly place: 'window station' } | { readonly place: 'desktop'; readonly reason: string };

/**
 * Whether Playwright shows its inspector, and so a headed browser, read as playwright-core reads `PWDEBUG` (`debugMode()`): it, else npm's config of it; `0` and
 * `false` are off, and `console` only adds the console helper to a browser that stays headless, which is the only other mode (work unit 20, reviews 0 and 1, F0).
 */
function playwrightInspector(env: NodeJS.ProcessEnv): boolean {
  const value = env['PWDEBUG'] ?? env['npm_config_pwdebug'] ?? env['npm_package_config_pwdebug'] ?? '';
  return value !== '' && value !== '0' && value !== 'false' && value !== 'console';
}

/**
 * The e2e browser runs in a separate window station on Windows, unless the run shows it: a headed run, `PWDEBUG`'s inspector, or `MET_E2E_DESKTOP=1`, the way
 * out for a host where the window station cannot be made, which needs the owner's agreement: tests/e2e/cursor.spec.ts fails under it (review 2, F9). On the desktop
 * its pointer lock confines and moves the cursor again.
 */
export function browserPlace(platform: NodeJS.Platform, headless: boolean, env: NodeJS.ProcessEnv): BrowserPlace {
  if (platform !== 'win32') return { place: 'desktop', reason: 'the separate window station is a Windows mechanism; elsewhere Playwright launches the browser itself' };
  if (!headless) return { place: 'desktop', reason: 'a headed run shows its browser, on the desktop, where its pointer lock confines and moves the cursor' };
  if (playwrightInspector(env)) return { place: 'desktop', reason: "PWDEBUG's inspector shows the browser, on the desktop" };
  if (env['MET_E2E_DESKTOP'] === '1') return { place: 'desktop', reason: 'MET_E2E_DESKTOP=1 asks for the browser on the desktop' };
  return { place: 'window station' };
}

/**
 * Starts `argv`, the program first, in a separate, non-interactive window station through `scripts/window-station.ps1`, in `cwd`, with this process's environment
 * and `env` over it, and the standard streams `stdio` names. The returned process is the launcher's, and its exit status is the command's; ending it ends the
 * command and all it started.
 */
export function startInWindowStation(argv: readonly string[], cwd: string, stdio: StdioOptions, env: NodeJS.ProcessEnv = {}): ChildProcess {
  return spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WINDOW_STATION_LAUNCHER], {
    cwd,
    stdio,
    env: { ...process.env, ...env, MET_WINDOW_STATION_COMMAND: windowsCommandLine(argv) },
    windowsHide: true,
  });
}

/** The workers' connection to the e2e browser server the global setup started, or none when it started none, as before it has run. */
export function testBrowserConnection(env: NodeJS.ProcessEnv): { readonly wsEndpoint: string } | undefined {
  const wsEndpoint = env[TEST_BROWSER_ENDPOINT] ?? '';
  return wsEndpoint === '' ? undefined : { wsEndpoint };
}
