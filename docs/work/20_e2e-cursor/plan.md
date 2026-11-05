# Keep the test browser off the owner's cursor

Status: complete
Owner: Claude Code desktop session cursor-lock-7e41a2 (2026-11-04)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

The owner reported (2026-11-04): "What keeps moving my mouse? It is teleporting my mouse.", then "It is definitely something claude is doing". The cause is the e2e suite. Walk mode takes the pointer lock, and on Windows Chrome implements the lock on the one system cursor, headless or not: `DesktopWindowTreeHostWin::LockMouse` confines it with `::ClipCursor` to the page's screen rectangle inset 5 px, `MoveCursorToCenter` moves it with `::SetCursorPos`, and the unlock frees it and moves it again (Chromium's `render_widget_host_view_event_handler.cc` and `desktop_window_tree_host_win.cc`; headless Chrome on Windows still makes a real window, cloaked, `hwnd_message_handler_headless.cc`). Measured on 59313d0 with a probe of 6 locks and a cursor watch: 12 clip changes to the hidden 1280×720 window's rectangle and 12 jumps, to the box's centre on each lock and to (18, 65) on each unlock, at 150% display scale. Every session's `npm run verify`, and every direct `npx playwright test` of a spec that walks with the real lock, did this to the owner's cursor.

Outcome: on Windows the e2e browser runs in a separate, non-interactive window station, where Windows refuses its cursor calls. The tests, the dev server and the reporters stay where they are and connect to it. A gate fails when the e2e browser confines the system cursor.

## Scope

Included: how the e2e browser starts (`playwright.config.ts`, a global setup, a browser server, the window-station launcher), a gate spec, unit tests for the launcher, and the records: AGENTS.md's gates, the defect register, the gate proof and the devlog.

Excluded: runs that show the browser (`--headed`, `--debug`, `PWDEBUG`'s inspector), which need a visible window and keep it on the desktop; `npm run shots` and `npm run sweep`, which never take the lock (`walk=1` leaves the pointer free until a click, and capture never clicks); hosts other than Windows, where nothing changes.

## Approach

The prototype (ignored `tmp/cursor-lock/`, its logs in `tmp/cursor-lock/evidence/`) compared three places for the browser under the gate lock, with a cursor watch outside it:

| Where the browser ran | Locks granted | Clip changes | Jumps |
|---|---|---|---|
| The desktop, as before | 6 of 6 | 12 | 12 |
| A hidden desktop in the interactive window station | 6 of 6 | 12 | 0 |
| A hidden desktop in a separate, unnamed window station | 6 of 6 | 0 | 0 |

A hidden desktop stops the moves, since `SetCursorPos` needs the input desktop, but not the confinement, which `ClipCursor` checks against the window station. Only administrators may name a window station, so the launcher asks for an unnamed one, which Windows names after the logon session. In it the GPU was still the RTX 4090 through Direct3D 11. With the whole Playwright run inside, the full suite passed (126 tests in 10.2 minutes) and `routes.spec` and `walk.spec` at 4× CPU throttle passed (21, 2 skipped), the watch seeing no clip change and no jump in 612 s and 151 s.

Chosen: only the browser moves. A global setup starts `chromium.launchServer` inside the window station through `scripts/window-station.ps1` and gives its endpoint to the workers, which connect through `use.connectOptions`. So `npm run test:e2e`, `npm run verify` and a direct `npx playwright test` are covered alike, and the runner, the dev server and the reporters stay on the desktop with live output. The launcher puts the browser's process tree in a job that ends with the launcher, and the server closes Chrome when the runner's pipe closes, the browser's start included; the server's temporary folder, Chrome's profile in it, is its own, and the launcher, which outlives a dead runner, removes it once the job has ended; a kill of the runner's whole process tree ends the launcher too and leaves the folder, as Playwright's own profiles were left before (review 2, F3). `MET_E2E_DESKTOP=1`, the way out where the window station cannot be made, needs the owner's agreement, and the gate fails under it (review 2, F9). Tradeoff: the tests drive a connected browser instead of a launched one, so the whole suite through it is the acceptance check.

Bound: the browser server listens on `localhost` and checks the Host header, but Playwright gives its endpoint's path to any local request for `/json`, so while a run lasts any process on this machine can find the e2e browser and drive it, another account's too: the browser runs as the owner, so such a process could read the owner's files through `file://` pages and save a download it serves to any path the owner can write, a script the next run executes or the Startup folder among them, which is running code as the owner; Playwright refuses it a new launch (reviews 0 to 3, F1). The owner's own processes could do all that anyway, and before this unit the browser listened on no port. Closing the rest needs a transport Playwright's `launchServer` and `connect` do not offer, or the whole run in the window station, which would put the runner's output behind a pipe.

## Acceptance criteria

- On Windows a headless e2e run's browser cannot confine the system cursor: `tests/e2e/cursor.spec.ts` takes the real pointer lock and reads the cursor's clip from its worker on the desktop, and it is the whole screen. The spec fails with the browser started on the desktop.
- The full e2e suite passes through the connected browser, and `routes.spec` and `walk.spec` pass at 4× CPU throttle, while a cursor watch sees no clip change and no jump.
- `npm run verify` passes on the merged tree.
- A run stopped midway leaves no browser or server running, and no temporary folder of the server's unless the launcher was killed with the runner.
- `--headed` runs and `PWDEBUG`'s inspector start the browser on the desktop as before.
- Independent review of the change, with its findings resolved.

## Implementation steps

- The launcher `scripts/window-station.ps1` and its Node side `scripts/window-station.ts`, with unit tests.
- The browser server `tests/e2e/browser-server.ts`, the global setup `tests/e2e/global-setup.ts` and `playwright.config.ts`.
- The gate `tests/e2e/cursor.spec.ts`, its red proof, and the records.
- Review, then the landing.

## Outcome

Landed on main at `6ee32f5`: the change at `ca16d0f`, merged with origin/main at `d8b1a5c` (work unit 19), whose two conflicts, the registry's and the devlog's, kept both sides. The merged tree's `npm run verify` passed through the gate lock: 754 unit tests in 83 files, typecheck, lint, build and 127 e2e tests in 10.2 minutes, with no clip change and no jump in 660 s. No render changed, so the owner's render gallery was not rebuilt.

On Windows the e2e browser runs in a separate, non-interactive window station and the tests connect to it. Through the gate lock, with a cursor watch outside the browser: `npm run verify` passed on each round's repairs (754 unit tests and 127 e2e tests on review 2's), with no clip change in 629 s, 682 s, 700 s and 725 s of e2e; `routes.spec` and `walk.spec` passed at 4× CPU throttle (21, 2 skipped); a runner killed during a test left nothing of the browser 1 s later; and `tests/e2e/cursor.spec.ts` and the lifecycle test in `scripts/window-station.test.ts` went red with their defects back (`docs/learning/gate-proofs.md`). The criteria for a headed run and for `PWDEBUG`'s inspector are held by `browserPlace`'s unit tests; no headed run was made, since its browser would show on the owner's desktop.

Reviews 0 to 3 (`reviews/`): Codex and Claude lanes, Claude's abstaining in review 0 on its time bound; findings F0 to F11, all repaired but F1, which stands as a stated bound for the owner, and F3's and F6's remainders, stated as bounds. Review 3's repairs were checked by the gates, not reviewed again.

Limitations: F1, a browser any local process can drive while a run lasts; a tree kill of the runner leaves the server's temporary folder (F3); a browser that dies during a run fails the tests after it (F6); a run with `MET_E2E_DESKTOP=1` puts the browser back on the owner's desktop and fails the gate.
