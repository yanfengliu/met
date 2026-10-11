/**
 * The dev-server port of this worktree.
 *
 * Each worktree runs its own server on its own `MET_PORT` (default 5310), and a server is never reused across worktrees (AGENTS.md, Gates).
 * `vite.config.ts`, `playwright.config.ts` and any capture script read the port through this module, so the server and the client that drives it cannot disagree.
 * Bound: it validates the value and nothing else; it does not check that the port is free (the strict-port dev server and Playwright's `reuseExistingServer: false` do).
 */

export const DEFAULT_MET_PORT = 5310;

const FIRST_PORT = 1024;
const LAST_PORT = 65535;

/** Reads `MET_PORT` from `env`. Unset or blank gives the default; anything but a whole number from 1024 to 65535 throws. */
export function metPort(env: NodeJS.ProcessEnv = process.env): number {
  const text = (env['MET_PORT'] ?? '').trim();
  if (text === '') return DEFAULT_MET_PORT;
  const port = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  if (!(port >= FIRST_PORT && port <= LAST_PORT)) {
    throw new Error(
      `MET_PORT must be a whole number from ${String(FIRST_PORT)} to ${String(LAST_PORT)} (the dev-server port of this worktree); got "${text}". Unset it to use ${String(DEFAULT_MET_PORT)}.`,
    );
  }
  return port;
}
