/**
 * The e2e browser as a Playwright browser server, which tests/e2e/global-setup.ts runs in a separate, non-interactive window station (scripts/window-station.ts),
 * where the browser's pointer lock cannot confine or move the owner's cursor (work unit 20).
 *
 * Usage: node tests/e2e/browser-server.ts <channel>, an empty channel for Playwright's own Chromium. It prints one line, {"wsEndpoint":"ws://..."}, once the browser is up.
 * It ends when its standard input ends, as it does when the setup's teardown ends it or the test run exits, at any point, the browser's start included (review 0,
 * F2): before the browser is up it exits at once; after, it closes the browser, or exits if the close takes over 10 s. Either way Playwright's own exit hook kills a
 * browser still running, and the launcher removes the temporary folder it was given (reviews 0 and 1, F3). A browser that dies during the run ends this with a
 * message, so the tests after it fail saying why, where before a fresh worker launched a fresh browser (review 1, F6).
 * Bound: Playwright listens on localhost only and checks the Host header, but it gives the endpoint's path to any local request for /json, so while a run lasts any
 * process on this machine can find this browser and drive it, another account's too. The browser runs as the owner, so such a process could read the owner's files
 * through file:// pages, and save a download it serves to any path the owner can write, a script the next run executes or the Startup folder among them: that is
 * running code as the owner. Playwright refuses it a new launch (reviews 0 to 2, F1). The owner's own processes could do all that anyway; before work unit 20 the
 * browser listened on no port, since Playwright launched it with --remote-debugging-pipe.
 */
import { chromium } from '@playwright/test';
import type { BrowserServer } from '@playwright/test';

const CLOSE_MS = 10_000;
const channel = process.argv[2] ?? '';
// The server once the browser is up; `end` reads it, and may run before then.
const started: { server?: BrowserServer } = {};
let ending = false;

function end(): void {
  if (ending) return;
  ending = true;
  const running = started.server;
  if (running === undefined) process.exit(1);
  setTimeout(() => process.exit(1), CLOSE_MS).unref();
  void running.close().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(`browser-server.ts: the browser did not close: ${String(error)}`);
      process.exit(1);
    },
  );
}
// Listened for before the browser starts, so a run that ends while it starts ends this too.
process.stdin.on('end', end);
process.stdin.on('error', end);
process.stdin.resume();

const server = await chromium.launchServer(channel === '' ? { headless: true } : { channel, headless: true });
started.server = server;
server.on('close', () => {
  if (ending) return;
  console.error('browser-server.ts: the e2e browser closed during the run, so the tests after this point cannot reach it.');
  process.exit(1);
});
process.stdout.write(`${JSON.stringify({ wsEndpoint: server.wsEndpoint() })}\n`);
