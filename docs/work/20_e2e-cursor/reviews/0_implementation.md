# Review 0: implementation

## Target

The uncommitted change in the worktree `.claude/worktrees/cursor-lock-7e41a2` (branch `claude/cursor-lock-7e41a2`), against its base `59313d01bee19cd27153240ce78c2a481b106827`: the patch `git diff HEAD` gave with the new files added as intent-to-add, kept as [snapshots/0_target.patch.txt](../snapshots/0_target.patch.txt) (42,025 bytes, SHA-256 `051c9f9d08261eecc1d441615bf080da17a740f800f46dc76aaa4acdb88a0d2e`). It holds the launcher `scripts/window-station.ps1` and `scripts/window-station.ts` with their unit tests, `tests/e2e/browser-server.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/cursor.spec.ts`, the change to `playwright.config.ts`, the records (AGENTS.md, the defect register, the gate proofs) and this unit's plan and allocation.

## Reviewers and coverage

- Codex 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox, from the run folder `fleet/tmp/review-runs/met-u20-r0/` (ignored) with the prompt and the patch on standard input. Kept: no command result exited `-1073741502`, and it cited files and lines outside the diff (`tests/e2e/helpers.ts:79`, Playwright's `coreBundle.js`). It ran typecheck, ESLint on the changed files, PowerShell's parser and `git diff --check`; it launched no browser and ran no test.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, with the runbook's read-only limits (its `system/init` named only Read, Glob, Grep, Task and Bash, `dontAsk`, no MCP server). Abstained: the run's 30-minute bound, set by the owner of this unit, ended it after 79 tool calls while it was still thinking, so its log holds no `result` event and no report. The tree's status and diff were byte for byte the same after both lanes as before them.

## Reports

### Codex (gpt-6-astra)

1. **High — Debug-off values disable isolation and skip the gate.** [scripts/window-station.ts:51](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/scripts/window-station.ts:51) treats every nonempty `PWDEBUG` as debugging. Installed Playwright explicitly treats `"0"` and `"false"` as debug-off (`node_modules/playwright-core/lib/coreBundle.js:8891`). With either value, ordinary headless tests launch on the desktop, restoring the cursor defect, while `cursor.spec.ts` skips through the same predicate. I reproduced the incorrect placement decision without launching anything. **Fix:** match Playwright’s debug-value semantics and add regression cases for both values, including verification that the cursor gate remains enabled.

2. **Medium — The endpoint’s random path is publicly discoverable by local clients.** [tests/e2e/browser-server.ts:12](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/browser-server.ts:12) starts an unauthenticated server. Installed Playwright serves its complete `wsEndpointPath` at `GET /json` (`coreBundle.js:58314`). It binds to localhost, but another local account or restricted process can discover the port, retrieve the path and connect without an Origin header. That grants control of the browser running as the owner; the comment claiming only workers receive the endpoint does not establish that boundary. Playwright itself warns about the authority granted by endpoint access. [Playwright documentation](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-server-option-ws-path) **Fix:** use authenticated transport with a credential that discovery cannot reveal, or access-controlled IPC; verify that unauthorized local clients cannot connect.

3. **Medium — Runner death during browser startup bypasses the shutdown mechanism.** [tests/e2e/browser-server.ts:12](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/browser-server.ts:12) awaits browser launch before registering stdin’s handlers at line 27. If the runner dies while Chrome startup stalls, its timeout and teardown disappear, while the launcher remains alive waiting for the server. EOF is not acted upon until launch completes or fails, leaving the process tree running beyond the advertised shutdown bound. **Fix:** establish parent-loss handling before starting Chrome and provide bounded cancellation during startup, including a test that stops the runner before the endpoint appears.

4. **Medium — Forced shutdown leaves Chrome’s temporary directories behind.** [tests/e2e/global-setup.ts:84](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/global-setup.ts:84) kills the launcher after 15 seconds, terminating both Chrome and the Node process responsible for removing its profile and artifacts. Installed Playwright’s graceful-close fallback waits 30 seconds before killing Chrome and cleaning those directories (`coreBundle.js:41244`, `10037`). Consequently, a hung close loses that cleanup path; the startup-timeout kill has the same problem. **Fix:** perform bounded `server.kill()` and cleanup inside the server before killing the job, and retain enough task-specific directory information outside the job to clean up after forced termination.

Checks: confirmed HEAD and the working-tree diff; TypeScript `--noEmit --incremental false`, changed-file ESLint `--no-cache`, PowerShell syntax parsing, size limits and `git diff --check` passed. Traced CLI/UI setup, `--list`, worker environment inheritance, connected-browser cleanup, native layouts, handle lifetime and quoting. Outside the diff, read [tests/e2e/helpers.ts:79](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/helpers.ts:79), including its CDP throttle path. Lifecycle/security findings are source-traced; no browser, launcher, Vitest or e2e execution was performed, and no files were edited.

### Claude (claude-opus-5-5[1m])

No report: the lane abstained, as Reviewers and coverage says.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | `PWDEBUG=0` or `false`, which Playwright reads as off, put the browser on the desktop and skipped the gate (Codex 1) | Accepted: playwright-core's `debugMode()` reads `PWDEBUG`, else `npm_config_pwdebug`, else `npm_package_config_pwdebug`, with `0` and `false` off | `scripts/window-station.ts` `playwrightDebugging` reads it the same way; `window-station.test.ts` holds `0`, `false`, empty and npm's config against `1`, `console` and `inspector`. Round 1 |
| F1 | The browser server's endpoint can be found through `GET /json` by any local process, which can then drive the owner's browser (Codex 2) | Accepted as a stated bound, not repaired. Playwright listens on `localhost` only (`listen()` defaults the host) and checks the Host header, so the reach is this machine while a run lasts; the owner's own processes could already drive the owner's programs, so the new reach is other accounts on this machine. Closing it needs an authenticated or access-controlled transport, which `launchServer` and `connect` do not offer | The bound is written in `tests/e2e/browser-server.ts`'s header, which had claimed that only the workers are given the endpoint, and in the plan; whether to pursue it is the owner's call |
| F2 | A runner that dies while Chrome starts is not noticed until the start ends (Codex 3) | Accepted | `browser-server.ts` listens for its input's end before it starts the browser, and before the browser is up it exits at once. Ending the input at once and 0.6 s in, the launcher ended in 0.82 s and 0.79 s with no headless Chrome left (`tmp/cursor-lock/lifecycle-check.mjs`, ignored). Round 1 |
| F3 | A forced end leaves Chrome's temporary folders behind (Codex 4) | Accepted | `browser-server.ts` closes the browser within 10 s or exits, so Playwright's exit hook kills it and removes its folders; the setup gives the server a temporary folder of its own, waits 30 s for it to end before ending the job, and then removes the folder, after a failed start too. In the lifecycle check, the two early ends left Playwright's folders only in that folder, and a normal end left it empty. Round 1 |

## Verification

On the reviewed target: `scripts/window-station.test.ts` (8 tests, the run through the launcher included), typecheck and ESLint on the changed files passed. Through the gate lock with a cursor watch outside the browser: `cursor.spec.ts` passed with no clip change, and with the setup made to start no server it failed ("confined to 17,68,847,473 of the screen 0,0,2560,1440") while the watch saw 2 clip changes and 2 jumps; `npm run test:e2e` passed 127 tests in 10.5 minutes with no clip change and no jump in 629 s; `routes.spec` and `walk.spec` at 4× CPU throttle passed 21 with 2 skipped, with none in 153 s; and a run whose runner was killed during a test left nothing of the browser 1 s later, though Playwright left its dev server, which the check ended. The logs are in `tmp/cursor-lock/evidence/` (ignored).

On the repairs: typecheck, ESLint on the changed files, the 8 unit tests and the lifecycle check above. Not run on them yet: the e2e suite and `npm run verify`.

## Round outcome

Codex found one high and three medium defects. F0, F2 and F3 are repaired and await re-review; F1 stands as a stated bound for the owner. The Claude lane gave no report. Round 1 reviews the repaired tree with both lanes, the Claude lane with a longer bound.
