# Review 2: implementation

## Target

The uncommitted change in the worktree `.claude/worktrees/cursor-lock-7e41a2` against its base `59313d01bee19cd27153240ce78c2a481b106827`, after review 1's repairs: the diff kept as [snapshots/2_target.patch.txt](../snapshots/2_target.patch.txt) (78,052 bytes, SHA-256 `7590b516ee52875aae01b0317c98d43cd8a153bdf0b522964c1d3afaff2dc812`), which leaves out the two other files the target held, `snapshots/0_target.patch.txt` and `snapshots/1_target.patch.txt`, at the bytes reviews 0 and 1 record. The whole target's patch, those included, had SHA-256 `8f1ea5b634c70a34b70a8c38cecb0ef7156b6279097a2fdb7d6ce9509bd7fec4`. This round was focused: the repairs of review 1's findings and anything they brought.

## Reviewers and coverage

- Codex 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox, from `fleet/tmp/review-runs/met-u20-r2/` (ignored). Kept: no command result exited `-1073741502`, and it cited `tests/e2e/helpers.ts:79` outside the diff. It ran typecheck, ESLint on the changed files, PowerShell's parser, the size limits and the whitespace check, and ran the new test's callback against an in-memory child; it launched no browser.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, with the runbook's read-only limits (`system/init`: Read, Glob, Grep, Task and Bash, `dontAsk`, no MCP server), a 60-minute bound and a prompt asking for about 20 minutes. Kept: one `result` event, `success`, its `modelUsage` only the pin; 37 tool calls, its one Bash call refused, no delegation, no test run. The tree's status and diff were byte for byte the same after both lanes as before them.

Both lanes named their new finding F8. The owner keeps Codex's as F8 and numbers Claude's F9 below; the reports keep their own words.

## Reports

### Codex (gpt-6-astra)

- **F1 — Medium, unchanged; disclosure corrected — [browser-server.ts:43](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/browser-server.ts:43).** The endpoint remains unauthenticated and discoverable through `/json`. Another local account can control Chrome running as the owner, including accessing the owner’s files. The revised header and plan accurately disclose this; they do not mitigate it. **Fix:** authenticated or access-controlled transport, or an isolation arrangement without the listening endpoint.

- **F8 — Low — Lifecycle test can hang on fragmented stdout — [window-station.test.ts:136](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/scripts/window-station.test.ts:136).** The test searches each individual chunk for `wsEndpoint`. A valid split such as `{"wsEnd` followed by `point":"ws://…"}\n` never closes stdin, so the server keeps running and the test waits until Vitest’s timeout. There is no bounded cleanup protecting this failure path. Executing the actual test callback with an in-memory child reproduced zero stdin closes and an unresolved test. **Fix:** accumulate and parse a complete endpoint line, and add a deadline with `finally` cleanup that closes or terminates and waits for the owned launcher.

Checks behind these findings:

- **F0:** placement matched the installed Playwright environment/debug functions across 729 combinations, including `console`, debug-off values and npm precedence.
- **F3:** traced launcher-owned directory removal, `EndJob`, and the runner’s fallback cleanup. Reviewed native layouts, inheritance, station lifetime and error paths against the source and Microsoft’s [process-creation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw) and [job-termination](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-terminatejobobject) contracts.
- **F4–F6:** confirmed independent gate skips, omission of an absent connection option, clearing the desktop-run endpoint, and the browser-crash diagnostic forwarded through stderr.
- **F7:** committed checks now cover startup EOF, normal shutdown and directory removal; F8 concerns their failure handling.
- Traced worker environment inheritance/config reload, CLI/UI/watch paths, remote context teardown, CDP and trace transfer. Outside the diff, read [helpers.ts:79](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/helpers.ts:79), including CPU throttling.
- TypeScript, changed-file ESLint, PowerShell parsing, file-size limits and whitespace checks excluding snapshots passed.

No files were edited. No browser, launcher, Vitest or e2e suite was run; native lifecycle conclusions are source-reviewed.

### Claude (claude-opus-5-5[1m])

I found no high or medium defect. The round-1 repairs of F0, F4, F5, F6 and F7 are right and complete. F3 holds whenever the launcher outlives the runner, but not when the whole process tree is killed. F1's bound is accurate but undersells what a download can write. There is one new low finding, F8. Bash was denied in this session, so I ran nothing: no typecheck, lint, Vitest or e2e. Everything below comes from reading the files and the installed Playwright 1.64.0.

#### Findings

**F1 (low, records): the bound undersells the write**
- **Where:** `tests/e2e/browser-server.ts:10-13` and `docs/work/20_e2e-cursor/plan.md:34`.
- **What's wrong:** "write files through downloads" reads as files landing in a downloads folder. In fact `ArtifactDispatcher.saveAs` copies a finished download to whatever path the client names. It runs on the server, as the owner, and creates folders as needed (`coreBundle.js:54358-54359`: `await mkdirIfNeeded(params2.path); await ...copyFile(localPath, params2.path)`). The client also chooses the content, because it serves the download from a page it controls.
- **What does hold:** new launches are refused (`denyLaunch: true` at `coreBundle.js:58485`, checked at `:56961`). So a client cannot start an arbitrary program directly.
- **Failure scenario:** during a 10-minute verify, another account's process finds the port and reads `/json`. If the owner uses WSL with mirrored networking, which shares the host's loopback, a process in WSL can do the same. The client connects, serves a download, and saves it over `scripts/window-station.ps1`, which the next e2e run executes with `-ExecutionPolicy Bypass`. Saving into the owner's Startup folder works too. Either way it runs code as the owner.
- **Fix:** in both places, say that a download can be saved to any path the owner can write, with content the client chooses, so the reach is running code as the owner. The decision stays the owner's.

**F3 (low): the repair needs the launcher to outlive the runner, and a tree kill stops all of them**
- **Where:**
  - `tests/e2e/global-setup.ts:8-9` ("even when the runner has died").
  - `plan.md:32` ("the launcher, which outlives a dead runner").
  - `plan.md:41`: "A run stopped midway leaves … no temporary folder of the server's".
- **What's wrong:** the parent-PID chain runs runner → launcher → server → Chrome. So `taskkill /T /F` on the runner, or a harness ending a timed-out command's tree, kills the launcher too.
- **Failure scenario:**
  - No process is left: the job's kill-on-close covers anything taskkill misses.
  - But neither cleanup runs: not the ps1's removal (lines 142-150), and not the setup's `rmSync` (line 110).
  - So `%TEMP%\met-e2e-browser-*`, with Chrome's profile in it, stays. `window-station.test.ts`'s `met-e2e-test-*` folders stay the same way.
- **Not a regression:** before this unit, Playwright's own `playwright_chromiumdev_profile-*` folders stayed in this case too. The problem is that the records claim more than the code holds.
- **Fix:** state this bound and narrow criterion 41. Don't sweep old folders at setup, because another worktree's live run shares `%TEMP%`.

**F8 (low, new): the setup's failure message recommends the switch that turns off both the protection and its gate**
- **Where:** `tests/e2e/global-setup.ts:43-47`, together with `tests/e2e/cursor.spec.ts:30`.
- **What's wrong:** when the window station fails, the error ends "Set MET_E2E_DESKTOP=1 to start it on the desktop instead". With that variable set, the browser goes back on the owner's desktop and `cursor.spec` skips. `npm run verify` is then green, with only "1 skipped" in the list reporter.
- **Failure scenario:** a transient failure, such as "no endpoint within 60 s" while several sessions load the machine. A session follows the message to get green, and every walking spec confines and moves the owner's cursor again, with every gate green.
- **Fix:**
  - Have the message say the variable puts the browser back on the owner's desktop and needs the owner's OK, rather than offering it as the remedy.
  - Consider failing instead of skipping on a headless Windows run with `MET_E2E_DESKTOP=1`. A headed run would still skip.

#### Round-1 repairs checked in the files

- **F0:** right and complete.
  - `playwrightInspector` (`scripts/window-station.ts:48-51`) matches `getFromENV` (`coreBundle.js:8835-8839`) and `debugMode()` (`:8888-8893`).
  - `??` keeps `PWDEBUG=''` from falling through, as `=== void 0` does there.
  - `--debug` sets both `use.headless = false` and `PWDEBUG=1` (`playwright/lib/cli/testActions.js:153-155`), so the spec skips it as a headed run. A bare `PWDEBUG=1` fails the gate, as the records say.
  - `--debug=cli` sets neither, so its browser stays in the window station.
- **F4:** right. The three skips (`cursor.spec.ts:28-30`) read nothing from `browserPlace`. They differ from the setup's decision only for the inspector, which now fails the gate.
- **F5:** right.
  - With an endpoint, the spread key replaces Playwright's own fixture (`playwright/lib/index.js:192-193`).
  - Without one, the key is absent, so `connectOptionsFromEnv() || _optionConnectOptions` applies again.
  - The desktop path's `''` reads as no endpoint.
  - UI mode's `runGlobalSetup` tears down first and passes the environment on (`runner/index.js:6896-6908`).
- **F6:** right. Playwright emits `close` from the browser process's `onclose` (`coreBundle.js:58679-58682`), and `ending` silences the deliberate close. Node makes stdout and stderr pipes blocking on Windows, so the message is written before `process.exit(1)`. The setup forwards it (`global-setup.ts:65-68`).
- **F7:** right.
  - Both server tests would go red without the ps1's removal, since nothing else removes the outer folder.
  - The first would go red with the listeners below the launch, as the gate proof records.
  - The first test also passes on any exit 1, including the launcher's own failure. The second test and the node.exe test catch that case.

#### New code read for defects (none found)

- **`window-station.ps1:76-81, 134-151`:**
  - `EndJob` uses the same static `job` that `Run` set, with the right `TerminateJobObject(HANDLE, UINT)` signature, and does nothing when there is no job.
  - It runs after both a normal end and a throw.
  - The removal retries for up to 10 s, then reports and keeps the command's status.
  - .NET Framework's console stream ignores broken pipes, so the late stderr write is safe after the runner has gone.
  - Worst case is the 10 s close plus 10 s of removal, inside the setup's 30 s `STOP_MS`.
- **`global-setup.ts`:**
  - `stop()` returns early once the launcher has exited.
  - `kill()`, through kill-on-close, covers a hung launcher.
  - `rmSync(force)` handles either order of cleanup.
  - A failed start cleans up and rethrows without falling back to the desktop.
- **Connected browser:** no spec uses downloads, browser-level CDP or the `browser` fixture. `tests/e2e/helpers.ts:79` (`page.context().newCDPSession(page)`) works through the connection.
- **Conventions:** every new file is under 500 lines (the ps1 is the longest at 151). Only the four files that existed before the change have CRLF in the working tree; the new files are LF.

#### Not checked

- I ran no commands, so typecheck, lint, the unit tests and the e2e suite are all unchecked, and I did not measure AGENTS.md's size.
- I could not check the two lifecycle tests' time under the full `npm test`. Each compiles C# and starts Chrome, and `scripts/test-headroom.ts:31` fails any test over 10 s. They are recorded as passing only when the file runs alone, so this round's `npm run verify` will be the first to show it.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | Other local accounts can still find and drive the e2e browser (Codex); the bound undersold it: a served download can be saved to any path the owner can write, which is running code as the owner (Claude) | Accepted as a stated bound, as in reviews 0 and 1 | The bound in `browser-server.ts` and the plan now says a download can be saved to any path the owner can write, a script the next run executes or the Startup folder among them, which is running code as the owner, and that Playwright refuses a new launch. The owner's call |
| F3 | A kill of the runner's whole process tree ends the launcher too, so neither cleanup runs and the server's folder stays in `%TEMP%` (Claude) | Accepted as a stated bound: nothing keeps running, since the job ends with the launcher, and Playwright's own profiles were left the same way before | Written in `global-setup.ts`'s header and the plan, and the acceptance criterion narrowed to "unless the launcher was killed with the runner"; no sweep of old folders, since another worktree's run shares `%TEMP%` |
| F8 | The lifecycle test looked for the endpoint in each output chunk, so a split line would hang it until Vitest's timeout with the server still running (Codex) | Accepted | The test gathers the output and ends the server's input once the whole line is there; each lifecycle test now has a 20 s deadline that ends the launcher, and a `finally` that ends it and removes its folder. Round 3 |
| F9 | The setup's failure message recommended `MET_E2E_DESKTOP=1`, under which the browser goes back on the owner's desktop and the gate skipped, so a session could get a green run while taking the cursor (Claude's F8) | Accepted | `cursor.spec.ts` no longer skips for `MET_E2E_DESKTOP=1`, so a run under it fails; the message says the variable puts the browser on the owner's desktop, needs the owner's agreement and fails the gate; AGENTS.md, the defect register, `browserPlace`'s comment and the plan say the same. Round 3 |

## Verification

On the reviewed target, through the gate lock with a cursor watch outside the browser: `npm run verify` passed, 754 unit tests in 83 files, the two lifecycle tests inside the 10 s headroom among them, typecheck, lint, build and 127 e2e tests in 11.0 minutes, with no clip change and no jump in 700 s. That answers the lane's last open point.

On the repairs: typecheck, ESLint on the changed files, and `scripts/window-station.test.ts`'s 10 tests. Not run on them yet: `npm run verify`.

## Round outcome

Both lanes reported, neither with a high or medium defect but F1, which stands as a stated bound for the owner. The repairs of F0, F4, F5, F6 and F7 were confirmed; F3 holds while the launcher outlives the runner and is bounded where it does not. F8 and F9 are repaired and go to round 3, which reviews the change since this round's target.
