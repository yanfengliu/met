/**
 * Smoke test: each page of the build loads, draws into exactly one visible canvas, reports `window.__shotReady`, and logs no console error or uncaught exception.
 * Also: in a browser without WebGL 2 (simulated by a getContext that returns null for 'webgl2'), the viewer says WebGL 2 is not available and what to
 * do, not that the model could not be built.
 * Bound: it proves the toolchain and the WebGL path work on the dev server; it does not look at what is drawn or at the built `dist/` output.
 */
import { expect, test } from '@playwright/test';

test('without WebGL 2 the page says so and what to do, not that the model failed', async ({ page }) => {
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype;
    const original = Reflect.get(proto, 'getContext');
    // A browser with no WebGL 2: every other context still works.
    Reflect.set(proto, 'getContext', function (this: HTMLCanvasElement, type: string, ...rest: unknown[]): RenderingContext | null {
      return type === 'webgl2' ? null : (Reflect.apply(original, this, [type, ...rest]) as RenderingContext | null);
    });
  });
  await page.goto('/');
  const panel = page.getByTestId('error');
  await expect(panel).toBeVisible();
  const text = (await panel.textContent()) ?? '';
  expect(text.startsWith('WebGL 2 is not available.'), text).toBe(true);
  expect(text).toContain('hardware (graphics) acceleration');
  expect(text).not.toContain('The model could not be built');
});

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
