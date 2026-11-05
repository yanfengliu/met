# Review 3: implementation

## Target

Review 2's target, [snapshots/2_target.patch.txt](../snapshots/2_target.patch.txt), with review 2's repairs: the change from it kept as [snapshots/3_target-from-2.patch.txt](../snapshots/3_target-from-2.patch.txt) (36,195 bytes, SHA-256 `99a740d386762fc06e2745b8c09b302025486573fd78cf3a898ea003067f1a8f`), the output of `git diff` from review 2's target, rebuilt as the Git tree `7cb69823e9342d3a44caa6a99477f60e00c345fc` in a temporary index, to the working tree, leaving out `snapshots/`. The whole target's patch against `59313d01bee19cd27153240ce78c2a481b106827`, the snapshots included, had SHA-256 `5ffd531a71396eb7dce2f7e50ade7a15e10245013fbe4c653b342d27d46bc08f`. This round was focused: the repairs of F8 and F9 and the restated bounds of F1 and F3.

## Reviewers and coverage

- Codex 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox, from `fleet/tmp/review-runs/met-u20-r3/` (ignored). Kept: no command result exited `-1073741502`, and it cited `tests/e2e/helpers.ts:79` outside the diff. It ran typecheck, ESLint on the changed files, PowerShell's parser, the size limits and the whitespace check, and ran the lifecycle test's callback against an in-memory child; it launched no browser.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, with the runbook's read-only limits (`system/init`: Read, Glob, Grep, Task and Bash, `dontAsk`, no MCP server), a 60-minute bound and a prompt asking for about 15 minutes. Kept: one `result` event, `success`, its `modelUsage` only the pin; 27 tool calls, its Bash calls but `git status` and `git diff --stat` refused, no delegation, no test run. The tree's status and diff were byte for byte the same after both lanes as before them.

## Reports

### Codex (gpt-6-astra)

**F8 — Low, cleanup repair incomplete — [window-station.test.ts:46](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/scripts/window-station.test.ts:46).** The deadline kills the child but cannot settle `finished()`, which listens only for `exit` at line 33. If PowerShell cannot spawn—for example, `powershell.exe` is missing from PATH—Node emits `error` and `close`, without `exit`. The test remains pending through the deadline, never reaches `finally`, and leaves its temporary folder.

I reproduced this using the actual test callback with an in-memory child: after the spawn error, close event and deadline, cleanup calls remained zero. **Fix:** reject completion on `error`, handle `close`, and make the deadline settle the awaited operation independently of successful termination. Ensure cleanup waits for any successfully spawned launcher before removing its folder.

Checks behind the review:

- F8’s original fragmentation defect is repaired: all 42 endpoint split positions passed the in-memory callback check. A launched child producing no endpoint also reached cleanup after the deadline.
- F9’s message and removal of the desktop-override skip are correct.
- F1/F3’s revised disclosures match the code; F1’s security exposure remains unmitigated.
- Read the launcher, server, setup, config, review records and installed dependency implementations. Outside the diff, read [helpers.ts:79](C:/Users/38909/Documents/github/met/.claude/worktrees/cursor-lock-7e41a2/tests/e2e/helpers.ts:79), including CDP throttling.
- TypeScript, changed-file ESLint, PowerShell parsing, size limits and whitespace checks passed.

No files were edited. No browser, launcher, Vitest or e2e suite was run.

### Claude (claude-opus-5-5[1m])

I found no high or medium defect. The F8 and F9 repairs are right and complete, and the F1 and F3 restatements are accurate, with one wording slip in each. The repairs brought two new low findings, F10 and F11, both cheap to fix and not worth another round.

I could run only `git status` and `git diff --stat` against round 2's target; they show the nine files in the prompt. Every Bash call after that was refused, so no typecheck, lint, Vitest or e2e ran.

#### Findings

**F10 (low, new): the new `cleanup` can hide the test's own failure.** `scripts/window-station.test.ts:49-53`, called from the `finally` blocks at `:143-145` and `:162-164`.
- **What's wrong:** the deadline acts in one path only. At 20 s, `child.kill()` (`:47`) ends the launcher, and the job's kill-on-close starts ending node and Chrome. The launcher's `exit` then resolves `done` and the assertions fail. `finally` calls `rmSync` straight away, while Chrome's ending processes may still hold its profile open. `force` only ignores a missing path, so once the retries run out `rmSync` throws, and an error thrown in `finally` replaces the assertion's error.
- **Failure scenario:** Chrome hangs while starting in the window station. At 20 s the launcher is killed, and the run reports `EBUSY` or `EPERM` on `met-e2e-test-…` instead of "expected '' to match …". The folder may stay.
- **Not checked:** whether Node 24's `rmSync` retries Windows sharing errors.
- **Side note:** `cleanup`'s kill branch (`:51`) cannot be reached. The try block only finishes after `await done`, which is after the launcher has exited. It does no harm as a guard.
- **Fix:** catch the removal and report it to stderr, as `tests/e2e/global-setup.ts:111-115` already does.

**F11 (low, new): under `MET_E2E_DESKTOP=1` nothing in the run says why the gate fails.** `tests/e2e/cursor.spec.ts:45` and `tests/e2e/global-setup.ts:98-101`.
- **What's wrong:** the removed skip used to name the variable. Now the run fails with "the system cursor was confined to … of the screen …". `browserPlace` works out a `reason` (`scripts/window-station.ts:62`), but nothing prints it.
- **Failure scenario:** the variable is set once with the owner's agreement and then stays in a shell or profile. Later runs move the owner's cursor and fail `cursor.spec`. A session reading only the failure takes it for a broken window station and starts a repair.
- **Fix:** have the setup print the reason to stderr when it puts the browser on the desktop on Windows. Or have the spec's message name `MET_E2E_DESKTOP` or `PWDEBUG` when one is set, reading the environment directly so F4's independence still holds.

**F1 (low, records): the restatement is accurate, but the plan lacks one claim the record makes for it.** `tests/e2e/browser-server.ts:10-14` matches the installed Playwright 1.64:
- `/json` returns the endpoint's path (`coreBundle.js:58314-58318`).
- A `launchServer` client always gets the browser already running, with launches refused (`:58389-58396`, `:58485`, `:56961-56962`). So the launch mode, which would accept a client's `executablePath`, cannot be reached.
- `saveAs` creates folders and copies to the client's path, with no server-side guard (`:54358-54359`).
- `LocalUtils` is withheld from a server (`:57682`).

The slip: review 2's disposition says the plan also says "Playwright refuses a new launch", but `plan.md:34` does not. Fix: add it to the plan, or correct the disposition.

**F3 (low, records): the restatement is right, with one wording slip.**
- `global-setup.ts:12-13`, `plan.md:32` and the narrowed criterion at `plan.md:41` match the code.
- The launcher alone holds the job's handle: `CreateJobObjectW(IntPtr.Zero, …)` makes it non-inheritable (`window-station.ps1:89`), so kill-on-close fires when the launcher dies.
- The slip: `taskkill /T` alone does not end these processes, which have no windows; `taskkill /T /F` does. Write `/T /F`.

#### Checks behind this

- **F8 repaired:**
  - The test gathers the output and ends the server's input only once the whole line has arrived (`:152-157`). Its listener is attached after `finished` sets UTF-8, in the same tick, so it misses no chunk.
  - A second `end()` on the stream does nothing.
  - `existsSync(temp)` is asserted before `cleanup` runs, so `cleanup` cannot hide a launcher that failed to remove the folder.
  - The 20 s deadline is under Vitest's 60 s (`vitest.config.ts:11`). The headroom check (`scripts/test-headroom.ts:31`, `duration * HEADROOM > timeout`) already fails any passing test over 10 s, so no run that passed before now fails.
- **F9 repaired:**
  - The spec now skips only off Windows and for a headed run.
  - Under `MET_E2E_DESKTOP=1` the setup sets `MET_TEST_BROWSER_WS` to `''`, so no `connectOptions` is set and the workers launch Chrome themselves on the desktop. That is the same path as the recorded red proof (`gate-proofs.md:246`), so "fails under it" follows from that proof, though no run under the variable is recorded.
  - The message (`global-setup.ts:46-48`), `AGENTS.md:67`, `defect-register.md:13`, `window-station.ts:54-56` and `plan.md:32` agree.
  - A search found no leftover claim that the gate skips under the variable.
- **Silent fallback:** no spec in `tests/e2e/` launches its own browser or sets `connectOptions` or `launchOptions`; the only `test.use` calls set viewport and touch. `tests/e2e/helpers.ts:79` (`newCDPSession`) is unchanged.
- **Conventions:** the test file is 166 lines, and every changed paragraph in the docs is one line. AGENTS.md's size was not measured; line 67 grew by about 60 bytes and the file looks well under 30,000.

Not checked: typecheck, lint, the unit tests, the e2e suite, AGENTS.md's byte count, Node's `rmSync` retries on Windows, and the snapshot's hash.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | Unmitigated, as both lanes say; review 2's disposition said the plan says "Playwright refuses a new launch", which it did not (Claude) | Accepted as a stated bound, as in reviews 0 to 2; the slip accepted | The plan now says it. The owner's call |
| F3 | `taskkill /T` alone does not end windowless processes; `/T /F` does (Claude) | Accepted | `global-setup.ts`'s header says `taskkill /T /F` |
| F8 | `finished()` settled only on `exit`, which a launcher that cannot start never emits, so the test would wait out its deadline and skip its cleanup (Codex) | Accepted | `finished()` settles on `close`, which comes after the last output and after a failed start, notes `error`, and settles on its own 20 s deadline, ending the launcher then; `cleanup` waits up to 10 s for the launcher to close before it removes the folder |
| F10 | `cleanup`'s removal could throw in `finally` and replace the test's own failure (Claude) | Accepted | The removal's error is written to standard error instead of thrown, as the setup's is |
| F11 | Under `MET_E2E_DESKTOP=1` nothing said why the gate fails (Claude) | Accepted | On Windows the setup writes why it put the browser on the desktop, `browserPlace`'s reason, to standard error; the gate's message names `MET_E2E_DESKTOP` or `PWDEBUG` when one is set, read from the environment apart from `browserPlace` (F4) |

These repairs were not reviewed again. Both lanes found nothing above low in this round, the Claude lane judged its findings not worth another round, and the repairs change the lifecycle tests' failure handling, two messages and the records, which the checks below cover.

## Verification

On review 2's repairs, the code of this round's target, through the gate lock with a cursor watch outside the browser: `npm run verify` passed, 754 unit tests in 83 files, typecheck, lint, build and 127 e2e tests in 11.1 minutes, with no clip change and no jump in 725 s.

On this round's repairs: typecheck, ESLint on the changed files, and `scripts/window-station.test.ts`'s 10 tests; F7's red proof again with the new `finished()` ("expected +0 to be 1", then green). The merged tree's `npm run verify` before the landing runs the rest.

## Round outcome

Both lanes reported with nothing above low. F8's first repair and F9's were confirmed, and F8's remaining gap, F10 and F11 are repaired; F1 stands as a stated bound for the owner, both lanes agreeing that its record is accurate. No material finding is open.
