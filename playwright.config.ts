import { defineConfig } from '@playwright/test';

import { metPort } from './scripts/met-port.js';

/**
 * Browser tests run on the Chrome installed on this machine (`channel: 'chrome'`); no browser is downloaded.
 * The suite starts its own Vite dev server on this worktree's `MET_PORT` and never reuses one that is already running,
 * so a test cannot reach the server of another worktree. If the port is taken the run fails instead of borrowing it.
 */
const port = metPort();
const origin = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: origin,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: origin,
    env: { MET_PORT: String(port) },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
