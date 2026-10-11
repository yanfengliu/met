/**
 * Smoke test: each page of the build loads, draws into exactly one visible canvas, reports `window.__shotReady`, and logs no console error or uncaught exception.
 * Bound: it proves the toolchain and the WebGL path work on the dev server; it does not look at what is drawn or at the built `dist/` output.
 */
import { expect, test } from '@playwright/test';

const PAGE_FILES = ['index.html', 'parts.html'] as const;

for (const file of PAGE_FILES) {
  test(`${file} loads, renders a canvas, reaches shot-ready and logs no errors`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      problems.push(`uncaught exception: ${error.message}`);
    });

    const response = await page.goto(`/${file}`);
    expect(response?.status(), `GET /${file}`).toBe(200);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => window.__shotReady === true);

    expect(problems, `problems while loading /${file}`).toEqual([]);
  });
}
