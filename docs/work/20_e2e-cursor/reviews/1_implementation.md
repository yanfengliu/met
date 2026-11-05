# Review 1: implementation

## Target

The uncommitted change in the worktree `.claude/worktrees/cursor-lock-7e41a2` against its base `59313d01bee19cd27153240ce78c2a481b106827`, after review 0's repairs: the diff kept as [snapshots/1_target.patch.txt](../snapshots/1_target.patch.txt) (54,929 bytes, SHA-256 `ba2a069764a7a3377eaf77c64ca0e7f60ec7cb2b2bf67d8a6eb2a3aa35c8179f`), which leaves out the one other file the target held, `snapshots/0_target.patch.txt`, at the bytes review 0 records (SHA-256 `051c9f9d08261eecc1d441615bf080da17a740f800f46dc76aaa4acdb88a0d2e`). The whole target's patch, that file included, had SHA-256 `9aeb8259c583bfd24d69ef867bc58459516ea4b9ef04fa456506f5e088bdf92a`.

## Reviewers and coverage

- Codex 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox, from `fleet/tmp/review-runs/met-u20-r1/` (ignored). Kept: no command result exited `-1073741502`, and it cited `tests/e2e/helpers.ts:79` and Playwright's `coreBundle.js` outside the diff. It ran typecheck, ESLint on the changed files, PowerShell's parser, the size limits and the whitespace check; it launched no browser and ran no test.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, with the runbook's read-only limits (`system/init`: Read, Glob, Grep, Task and Bash, `dontAsk`, no MCP server), a 60-minute bound and a prompt asking for about 25 minutes of work. Kept: one `result` event, `success`, its `modelUsage` only the pin. It made 51 tool calls, delegated nothing and ran no test. The tree's status and diff were byte for byte the same after both lanes as before them.

## Reports

### Codex (gpt-6-astra)

1. **F3 — Medium — Runner death still leaves temporary directories.** [browser-server.ts:25](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/browser-server.ts:25) exits immediately on startup EOF, but Playwright creates its profile/artifact directories before registering its exit cleanup (`coreBundle.js:41173`, `10081`). If the runner dies during that interval, its cleanup in [global-setup.ts:98](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/global-setup.ts:98) cannot run. The early-end probe already recorded leftover Playwright folders; its surviving driver subsequently deletes them. Even a later runner death leaves the outer `met-e2e-browser-*` directory. **Fix:** give the surviving launcher responsibility for removing its temporary tree after terminating/waiting for the job, retaining the runner’s fallback. Verify by killing the runner during startup and checking directory removal without cleanup by the probe.

2. **F1 — Medium — Local endpoint access remains unauthenticated.** [browser-server.ts:40](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/browser-server.ts:40) still exposes the server to other local accounts. Installed Playwright binds to localhost and checks Host/Origin, but publishes the endpoint path through `/json` (`coreBundle.js:58314`) and permits clients without an Origin header. Another account can discover the port, retrieve the path and control the owner’s browser. The revised bound accurately discloses this exposure; F1 remains unresolved. **Fix:** use authenticated or access-controlled transport, or remove the listening endpoint through a different isolation arrangement. Endpoint possession carries substantial authority, as [Playwright documents](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-server-option-ws-path).

Checks: **F0’s repair passed the in-memory placement checks**, including debug-off values and npm precedence. **F2’s original listener-order defect is repaired**: stdin handlers precede browser launch. Reviewed native layouts, inheritance, job/station lifetime, quoting, gate sampling, CLI/UI setup, worker restarts, remote contexts, CDP and trace transfer. Outside the diff, read [helpers.ts:79](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/helpers.ts:79) and traced its CDP throttle through the installed implementation.

TypeScript, changed-file ESLint, PowerShell parsing, file-size limits and whitespace checks excluding the supplied snapshot passed. Findings are source-traced; no browser, launcher, Vitest or e2e run was performed, and no files were edited.

### Claude (claude-opus-5-5[1m])

I found no high-severity defect. The F0 repair is incomplete: `PWDEBUG=console` still puts a headless browser on the owner's desktop, and the gate skips that run (medium). There are also four low findings. I ran nothing; everything below comes from reading the change's files and the installed Playwright 1.64.0 source.

#### Round 0's findings

**F0: repair incomplete (medium).**
- **Where:** `scripts/window-station.ts:48-51` and `:60`, pinned by `scripts/window-station.test.ts:56`. The records repeat it: `AGENTS.md:67`, `docs/learning/defect-register.md:13` ("which shows its browser on purpose") and `docs/work/20_e2e-cursor/plan.md:18` ("need a visible window").
- **What's wrong:** `playwrightDebugging` sends every debug value except off to the desktop. In 1.64, only `inspector` shows a browser:
  - `node_modules/playwright-core/lib/coreBundle.js:41300`: `if (debugMode() === "inspector") headless = false;`
  - `coreBundle.js:44480`: devtools only for `inspector`.
  - `coreBundle.js:53035`: `console` only adds the console helper.
  - `playwright/lib/index.js:358` and `cli/testActions.js:151-156` change nothing for `console`.
- **Failure scenario:** `PWDEBUG=console npx playwright test tests/e2e/walk.spec.ts` (or `npm run test:e2e --pwdebug=console`). The setup starts no server, the workers launch headless Chrome on the desktop, and the walk locks confine and move the cursor again. `cursor.spec` skips with "a PWDEBUG run shows its browser and the inspector", which is false: there is no window and no inspector. The unit test asserts this behaviour for `{ PWDEBUG: 'console' }` and `{ npm_package_config_pwdebug: 'console' }`.
- **Fix:**
  - Put the browser on the desktop only for Playwright's `inspector`: on, and not `console`.
  - Move both `console` cases in the test to the window-station list.
  - Say "PWDEBUG's inspector" in the reason string and the three records.

**F1: the bound is stated and accurate.** It is in the header of `tests/e2e/browser-server.ts` and in the plan, and it matches the code:
- `coreBundle.js:10862` listens on `localhost`.
- `:10896` checks the Host and Origin headers on the upgrade.
- `:58314-58318` serves `wsEndpointPath` at `GET /json`.

One gap in the wording: it says "drive it" without saying what that means. This Chrome runs as the owner, so another account could read the owner's files through `file://` and write files through downloads. Say so, so the owner can make the call. Before this change Chrome used `--remote-debugging-pipe` and listened on no port.

**F2: repaired.** `browser-server.ts:36-38` listens for its input's end before the `await` on line 40. Before the browser is up, `end()` calls `process.exit(1)`. Playwright's exit hook then kills Chrome synchronously (`coreBundle.js:10081`, `10123-10134`, `taskkill /T /F` at `:10144`).

**F3: repaired.** The browser's close is bounded at 10 s (`browser-server.ts:26`), the setup waits 30 s before killing the job, and the folder is removed after a failed start too (`global-setup.ts:98-110`). `os.tmpdir()` holds both of Playwright's folders (`coreBundle.js:44475`) and is the per-run `TEMP`.

#### New findings

**F4 (low): the gate skips on the same predicate the code uses.**
- **Where:** `tests/e2e/cursor.spec.ts:29-30`.
- **What's wrong:** The spec decides whether to skip with `browserPlace`, the same function that decides where the browser goes. Any wrong "desktop" answer turns off the protection and the gate together, and the run stays green. That is how F0 and its residual above got through.
- **Fix:** Skip only on things that cannot silently disagree with Playwright: off Windows, `testInfo.project.use.headless === false`, or `MET_E2E_DESKTOP === '1'`. A `PWDEBUG` inspector run would then honestly report the clip.

**F5 (low): `connectOptions: undefined` overrides Playwright's own connect fixture.**
- **Where:** `playwright.config.ts:31`.
- **What's wrong:**
  - `mergeObjects` keeps every key of `config.use`, undefined ones included (`playwright/lib/common/index.js:343-352`).
  - `FixturePool` overrides every key it finds (`common/index.js:1540-1547`).
  - So the default fixture, which reads `PW_TEST_CONNECT_WS_ENDPOINT` and `_optionConnectOptions` (`playwright/lib/index.js:192-193`), never runs.
- **Failure scenario:**
  - With the server up, pressing `s` ("show & reuse browser") in `--watch`, or a UI run that passes `connectWsEndpoint` (`runner/index.js:7020`, `7992-7995`), drives the hidden window-station browser while reporting headed. Nothing is shown.
  - In desktop runs, those runs launch a new browser per worker instead of reusing the shown one.
  - This is not a cursor risk.
- **Fix:** Add the key only when there is an endpoint (`...(c && { connectOptions: c })`). Document that a shown browser needs `--headed` at start, because the setup decides once. When the place is the desktop, have the setup delete `MET_TEST_BROWSER_WS` so a stale value can't be used.

**F6 (low): a browser that dies mid-run fails every later test, and nothing says why.**
- **Where:** `tests/e2e/browser-server.ts:40-42`; `global-setup.ts` stops watching after line 107.
- **What's wrong:** When Chrome exits, Playwright closes the server (`coreBundle.js:58679-58682`). `browser-server.ts` has no `close` listener, so it stays alive with a dead endpoint.
- **Failure scenario:** One browser crash makes every later worker fail `connect` with ECONNREFUSED. Before, a worker restart after a failure launched a fresh Chrome and only one test failed.
- **Fix:** Add `server.on('close', (code, signal) => { console.error(...); process.exit(1); })`. The setup already forwards stderr, so the run would say why.

**F7 (low): no committed check holds the lifecycle repairs.**
- **What's wrong:** F2 and F3 were verified only by the ignored `tmp/cursor-lock/lifecycle-check.mjs`. Moving the input listener below the `await` on line 40 would pass every gate.
- **Fix:** Either add a Windows-only test that ends the server's input before the endpoint appears and checks the launcher exits and the folder empties, or record that no gate holds this.

#### What I checked and found sound

- **Win32 structs on x64:**
  - Sizes: `STARTUPINFOW` is 104 bytes, `PROCESS_INFORMATION` 24 and `JOBOBJECT_EXTENDED_LIMIT_INFORMATION` 144.
  - Layout: the padding falls after `cb`, `LimitFlags`, `ActiveProcessLimit` and `cbReserved2`.
  - Constants are all correct: `0x37F`, `0x2000`, class `9`, `0x100`, `0x08000000`, and handles `-10/-11/-12`.
- **Process start and handles:**
  - The job handle can't be inherited, so the job closes with PowerShell.
  - The child is assigned to the job while suspended.
  - Node calls `uv_disable_stdio_inheritance`, so Chrome doesn't hold the input pipe and the input's end reaches the server.
  - Every error path exits 1 with the Win32 message.
- **Not a defect:**
  - The window station's name comes from the logon session and the desktop name is fixed, so concurrent runs share one station and desktop. The cursor stays safe.
  - An unchecked `ResumeThread` would only hang until the 60 s start bound.
- **`windowsArgument`:** it is correct under the C runtime's rules, including argv[0]. The command line arrives through the environment, so nothing can inject into it.
- **Playwright integration:**
  - Workers inherit the variable and reload the config.
  - `--list` skips the global setup (`runner/index.js:7140-7148`).
  - `launchServer` ignores the workers' launch options.
  - CDP sessions (`tests/e2e/helpers.ts:79`) work through `connect`, and no spec launches its own browser.
- **Gate timing:** the clip is set before the page sees `pointerLockElement`.
- **Conventions:** AGENTS.md is 21,213 bytes and every new file is well under 500 lines.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | `PWDEBUG=console`, which leaves the browser headless, still put it on the desktop and skipped the gate (Claude) | Accepted: playwright-core makes the browser headed only for `debugMode() === "inspector"` | `playwrightInspector` puts the browser on the desktop only for the inspector; `console` cases moved to the window-station list; the reason and the records say "PWDEBUG's inspector". Round 2 |
| F1 | Other local accounts can still find and drive the e2e browser (Codex); the bound should say what driving it can do (Claude) | Accepted as a stated bound, as in review 0 | The bound in `browser-server.ts` and the plan now says the browser runs as the owner, so such a process could read the owner's files through `file://` and write files through downloads, and that before this unit the browser listened on no port. The owner's call |
| F3 | A runner that dies leaves the server's temporary folder, and Playwright's folders inside it if it dies while Chrome starts (Codex) | Accepted | `window-station.ps1` takes the folder in `MET_WINDOW_STATION_TEMP`, ends the rest of its job once the command has ended (`TerminateJobObject`) and removes it, retrying for up to 10 s; the setup passes it and still removes it should the launcher have been ended first. Held by F7's tests. Round 2 |
| F4 | The gate skipped on `browserPlace`, the predicate it should check (Claude) | Accepted | `cursor.spec.ts` skips only off Windows, for a headed run and for `MET_E2E_DESKTOP=1`; a run with `PWDEBUG`'s inspector now fails it. Round 2 |
| F5 | `connectOptions: undefined` in `use` hid Playwright's own connection, which UI and watch mode set (Claude) | Accepted | `playwright.config.ts` sets the key only with an endpoint; a run that puts the browser on the desktop clears `MET_TEST_BROWSER_WS`; AGENTS.md and the setup's header say a browser to be shown needs `--headed` when the run starts. Round 2 |
| F6 | A browser that dies mid-run left the server up with a dead endpoint, so every later test failed without a reason (Claude) | Accepted, the rest as a bound | The server exits with a message on standard error, which the setup forwards, when its browser closes during the run. The tests after it still fail, where before a fresh worker launched a fresh browser; that difference is written in `browser-server.ts`'s header. Round 2 |
| F7 | No committed check held the lifecycle repairs (Claude) | Accepted | `scripts/window-station.test.ts` runs the real server in the window station on Windows: its input ended while the browser starts ends it with 1, after the endpoint with 0, and the launcher removes its folder both times. Red with the input listeners moved below the launch ("expected +0 to be 1", `docs/learning/gate-proofs.md`). Round 2 |

## Verification

On the reviewed target, through the gate lock with a cursor watch outside the browser: `npm run verify` passed, 752 unit tests in 83 files, typecheck, lint, build and 127 e2e tests in 10.6 minutes, with no clip change in 682 s. The watch logged two jumps 15 ms apart at 22:12:14, (760, 736) to (713, 361) to (629, 56), with no clip change: the owner's hand, by their places, which are not the hidden window's centre (445, 305) nor the unlock's (18, 65).

On the repairs: typecheck, ESLint on the changed files, and `scripts/window-station.test.ts`'s 10 tests, the two lifecycle tests on the real server included; F7's red proof. Not run on them yet: the e2e suite and `npm run verify`.

## Round outcome

Both lanes reported. Codex confirmed F0's first repair and F2, and kept F3 and F1 open; Claude confirmed F2 and F3 as far as a living runner goes, found F0 incomplete and raised F4 to F7, all low. F0, F3 and F4 to F7 are repaired and await re-review; F1 stands as a stated bound for the owner. Round 2 re-reviews the repairs.
