/**
 * Gate: a pointer lock in the e2e browser leaves the owner's cursor free (work unit 20, docs/learning/defect-register.md).
 *
 * On Windows, Chrome's pointer lock confines the one system cursor to the page's window (`ClipCursor`) and moves it (`SetCursorPos`), headless or not, unless the
 * browser runs in a separate, non-interactive window station, where tests/e2e/global-setup.ts starts it. This test takes the real lock on a blank page, moves the
 * mouse to the window's corner as the walking specs do, and while the page holds the lock reads the system cursor's clip rectangle from this worker, which runs on
 * the owner's desktop: it must be the whole screen.
 * Bound: Windows, skipped only for a headed run, which shows its browser on purpose, read apart from scripts/window-station.ts `browserPlace`, so a wrong answer
 * there fails this test instead of skipping it (review 1, F4). A run with MET_E2E_DESKTOP=1 or PWDEBUG's inspector puts the browser on the desktop and fails it, so a
 * green run means the cursor stayed free (review 2, F9). It reads the clip, which only a program sets, not the cursor's position, which the owner's hand moves too;
 * another program confining the cursor during the read would fail it.
 * Red: with the setup starting no server, the browser launched on the desktop and confined the cursor to its window (docs/learning/gate-proofs.md).
 */
import { execFileSync } from 'node:child_process';

import { expect, test } from '@playwright/test';

/** The system cursor's clip rectangle and the virtual screen, each as "x,y,width,height", as PowerShell reads them on this worker's desktop. */
function cursorClip(): { readonly clip: string; readonly screen: string } {
  const script =
    'Add-Type -AssemblyName System.Windows.Forms; $c = [System.Windows.Forms.Cursor]::Clip; $s = [System.Windows.Forms.SystemInformation]::VirtualScreen; ' +
    "'{0},{1},{2},{3} {4},{5},{6},{7}' -f $c.X, $c.Y, $c.Width, $c.Height, $s.X, $s.Y, $s.Width, $s.Height";
  const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true }).trim();
  const [clip = '', screen = ''] = out.split(' ');
  return { clip, screen };
}

test('a pointer lock in the e2e browser leaves the system cursor free', async ({ page }, testInfo) => {
  test.skip(process.platform !== 'win32', 'the window station, and this read of the clip, are Windows mechanisms');
  test.skip(testInfo.project.use.headless === false, 'a headed run shows its browser on the desktop by choice');
  await page.setContent('<div id="pad" style="position: fixed; inset: 0"></div>');
  await page.locator('#pad').evaluate((pad) => {
    pad.addEventListener('click', () => {
      void pad.requestPointerLock();
    });
  });
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => document.pointerLockElement !== null, undefined, { timeout: 5000 });
  // Near the window's border, where Chrome moves the cursor back to the middle.
  await page.mouse.move(1275, 715, { steps: 4 });
  const { clip, screen } = cursorClip();
  await page.evaluate(() => {
    document.exitPointerLock();
  });
  // The variables that put the browser on the desktop, read here apart from scripts/window-station.ts (review 1, F4), so a failure under one says so (review 3, F11).
  const set = ['MET_E2E_DESKTOP', 'PWDEBUG'].filter((name) => (process.env[name] ?? '') !== '').map((name) => `${name}=${process.env[name] ?? ''}`);
  const why = set.length === 0 ? '' : `, with ${set.join(' and ')} set, which can put the browser on the desktop`;
  expect(clip, `while the e2e browser held a pointer lock the system cursor was confined to ${clip} of the screen ${screen}${why}`).toBe(screen);
});
