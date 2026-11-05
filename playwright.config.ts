import { defineConfig } from '@playwright/test';

import { metPort } from './scripts/met-port.js';
import { testBrowserConnection } from './scripts/window-station.js';

/**
 * Browser tests run on the Chrome installed on this machine (`channel: 'chrome'`); no browser is downloaded.
 * The suite starts its own Vite dev server on this worktree's `MET_PORT` and never reuses one that is already running,
 * so a test cannot reach the server of another worktree. If the port is taken the run fails instead of borrowing it.
 * On Windows the global setup starts that Chrome in a separate, non-interactive window station, where its pointer lock cannot confine or move the owner's
 * cursor, and the workers connect to it (`connectOptions`, read here once the setup has set it); a headed run or PWDEBUG's inspector launches it on the desktop
 * as before. Without an endpoint the key is left out, so Playwright's own connection, which UI and watch mode set, still applies (work unit 20, review 1, F5).
 */
const port = metPort();
const origin = `http://127.0.0.1:${String(port)}`;
const testBrowser = testBrowserConnection(process.env);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  outputDir: 'test-results',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: origin,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    ...(testBrowser === undefined ? {} : { connectOptions: testBrowser }),
  },
  webServer: {
    command: 'npm run dev',
    url: origin,
    env: { MET_PORT: String(port) },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
