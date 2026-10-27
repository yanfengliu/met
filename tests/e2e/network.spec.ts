/**
 * The page fetches nothing from the network but its own origin (docs/design/spec.md, Collection; AGENTS.md non-goals: no runtime network assets): the
 * collection's records and colours are in the bundle (src/model/collection/catalogue.ts), never fetched from The Met's API or images, or from any other
 * host, and never read from the ignored research cache.
 * Each page is loaded at the finished building, where every collection step stands, and again in a collection space's view, and every request it makes
 * is recorded from navigation until it is shot-ready and a second later; each must be the page's own origin (or a data: or blob: URL), and none under
 * /research/. Bound: requests made only after that window, or only through input, are not seen.
 * Through input, with an artwork's card shown and its link to metmuseum.org followed, ./labels.spec.ts checks that the page itself asks nothing of
 * metmuseum.org.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Every URL a page asks for while it loads `path` and settles. */
async function requests(page: Page, path: string): Promise<string[]> {
  const seen: string[] = [];
  page.on('request', (request) => seen.push(request.url()));
  await page.goto(path);
  await page.waitForFunction(() => window.__shotReady === true);
  await page.waitForTimeout(1000);
  return seen;
}

for (const path of ['/?shot=1', '/?shot=1&view=int-lehman-galleries', '/parts.html?shot=1']) {
  test(`${path} asks nothing of any host but its own, and nothing of the research cache`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin;
    const urls = await requests(page, path);
    expect(urls.length, 'requests recorded').toBeGreaterThan(0);
    const foreign = urls.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, `requests to another host than ${origin}`).toEqual([]);
    expect(urls.filter((url) => /metmuseum\.org/i.test(url)), 'requests to a metmuseum.org host').toEqual([]);
    expect(urls.filter((url) => !url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).pathname.startsWith('/research/')), 'requests to the research cache').toEqual([]);
  });
}
