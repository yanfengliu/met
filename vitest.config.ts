import { configDefaults, defineConfig } from 'vitest/config';

import { TestHeadroom } from './scripts/test-headroom.js';

/** Unit tests only. Playwright specs live in `tests/e2e/` and run through `npm run test:e2e`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    // GitHub's runner ran the heaviest tests up to 2.8 times slower than the local machine (2026-10-28): the slowest, 6.4 s there, gets nine times that, and a test here gets 10 s under the headroom check.
    testTimeout: 60_000,
    // Off GitHub's runner, a test that takes over a sixth of its timeout fails the run (`scripts/test-headroom.ts`); Vitest's own reporters stay as they are.
    reporters: process.env['CI'] === 'true' ? configDefaults.reporters : [...configDefaults.reporters, new TestHeadroom()],
  },
});
