# Review 0: implementation

## Target

Work unit 30, the timing budgets split out of the functional gate: repository met, commit `cb1f951` on the worker's branch `worktree-agent-a6ce13e3955fa859e`, read in a clean checkout at that commit. `cb1f951` is the worker's three commits (`dbdccee`, `f2e576d`, `e88f548`) merged with origin's main at `328a9c2` (work unit 26's milestone B and work unit 31's opening). The reviewers were given `git diff 328a9c2 cb1f951` (17 files, 288 lines added and 38 removed).

The coordinator ran this round before the worker's hand-back, while the worker waited for the gate lock, to shorten the wait on a change every other landing queues behind. At `cb1f951` the worker had not yet run `npm run verify` or `npm run budgets` on the merged tree; the red proofs in `docs/learning/gate-proofs.md` ran on `f2e576d`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/walk/walk-mode.ts`, `src/main.ts` and `src/viewer/door-swing.ts` outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and three read-only git commands, permission mode `dontAsk`, no MCP server. One result event on that model alone; 34 reads, 30 searches, 2 globs and 9 shell calls, no subagent call.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. Neither lane ran tests, builds or network requests. No lane abstained.

The prompt said that the budgets no longer being asserted by `npm run verify` is the owner's decision of 2026-11-11 ("Split them") and not a finding, and asked for any way the split, as built, lets a budget go unasserted where the plan says it is asserted, hides a failure that is not a budget's, or leaves a timing dependence in the functional gate.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

Reviewed `cb1f951` against `328a9c2`, read-only. No tests, builds, or network requests were run.

1. **Major — Missing measurements now pass the functional gate.** [helpers.ts:256](tests/e2e/helpers.ts:256) suppresses any assertion error carrying `matcherResult`:
   ```ts
   if (!(error instanceof Error) || !('matcherResult' in error)) throw error;
   ```
   That does not distinguish an overrun from invalid measurement data. At line 230, `walk.frameMs ?? Number.NaN` converts missing timing into `NaN`; line 265’s wrapped comparison then fails and is suppressed. Outside the diff, [walk-mode.ts:307](src/walk/walk-mode.ts:307) returns `null` when no frames were measured. Consequently, losing the `walk.noteFrame(...)` call at [main.ts:328](src/main.ts:328) no longer fails this check in `verify`. The collision check similarly wraps its missing-value sentinel, `ready.bvhMs ?? Number.POSITIVE_INFINITY`. These are measurement failures, not slow measurements. Require valid finite measurements outside the switch; suppress only their budget comparisons.

2. **Major — The dedicated gate can pass while skipping both route budgets.** [budgets.ts:40](scripts/budgets.ts:40) passes:
   ```ts
   { ...env, [BUDGETS_SWITCH]: '1' }
   ```
   This preserves `MET_CPU_THROTTLE`. Both tagged route tests immediately execute `test.skip(throttleRate() > 1, ...)` at [routes.spec.ts:431](tests/e2e/routes.spec.ts:431). With a throttle inherited from the required load runs, R3/R4’s walking and running budgets are never asserted. The other selected tests do not apply that throttle, so they can pass and the runner prints “every budget held.” Playwright treats skipped tests as successful outcomes. The runtime tag guard cannot detect a callback never reached. Reject a throttled budget invocation or explicitly make this gate unthrottled.

3. **Major — The door tests retain a frame-rate requirement in `verify`.** [doors.spec.ts:231](tests/e2e/doors.spec.ts:231) still asserts:
   ```ts
   expect(frames.length, ...).toBeGreaterThan(20);
   ```
   It samples only until one swing finishes. A full swing takes `SWING_SECONDS = 0.7` ([door-swing.ts:11](src/viewer/door-swing.ts:11)); sufficiently slow rendering can complete that swing correctly with fewer callbacks. This assertion fails **before** `budgetCheck`. The two-cycle `steps.length > 120` check at line 390 has the same dependence on how many samples fit into the completed activity. These are sampling requirements with implicit throughput constraints, not deadlines preventing a hang. Calling them “not a budget” in the inventory does not remove that dependence. Preserve measurement coverage by collecting sufficient samples across additional activity, rather than requiring them within one fixed activity.

4. **Minor — The proof summary contradicts its recorded results.** [gate-proofs.md:241](docs/learning/gate-proofs.md:241) says that with the switch off, “`npm run verify` stayed green.” Lines 247 and 250 explicitly record red runs for sets 2 and 3. The entries do name concrete planted defects and outcomes in both modes, but establish that timing failures were suppressed—not that every planted run stayed green. They also do not establish the separate acceptance criterion of three consecutive heavy-load verifies and a quiet budget pass ([plan.md:65](docs/work/30_timing-gate/plan.md:65)).

5. **Minor — The defect register still describes unconditional local headroom enforcement.** [defect-register.md:51](docs/learning/defect-register.md:51) says the reporter “fails the run when a passed test takes over a sixth of its timeout.” That present-tense description needs the new switch condition; otherwise it incorrectly describes the protection supplied by ordinary local verification.

Other areas checked:

- All existing wrapped callbacks contain one synchronous assertion. I found no unrelated operation inside them whose exception is swallowed; finding 1 concerns the assertion’s input validity.
- The switch is read per e2e check and once when Vitest loads its configuration. The headroom split preserves unread-time failures and does not clear an existing failure status. The new unit tests distinguish asserted and unasserted modes, although they do not exercise the missing-measurement or inherited-throttle cases.
- The runner continues after a nonzero unit result, maps a null subprocess status to failure, and preserves `MET_PORT`. Its command passes `--grep @budget` through npm. Installed Playwright 1.64 source includes tags in grep matching and throws when no tests match; that is distinct from selected tests skipping.
- I treated `open`, `doorIs`, test timeouts, and the window-station timeout as bounded-wait deadlines. The fixed 120-frame walking sampler waits for its sample count rather than imposing a frame rate. Route/stair coverage guards use bounded movement per frame. The moving-frame share and distance checks validate the workload; they are not elapsed-duration budgets.
- No milestone B reversal appeared in the merge diff. Pages, runtime sources, and Playwright configuration are unchanged against the baseline. AGENTS.md is 24,424 bytes with CRLF, below its limit; the gate-lock list includes `budgets`.

REJECT — `verify` now hides missing timing measurements as ordinary budget overruns.

### Claude (claude-opus-5-5)

The split works as built, but I found two major problems and a few smaller ones that should be fixed before it lands. I read the code and used read-only git commands (`log`, `diff`, `cat-file`); I ran no tests or builds.

#### Findings

**F1 (major): `budgetCheck` passes a missing measurement off as an over-budget one.**
- `tests/e2e/helpers.ts:230`: `const work = await page.evaluate(() => window.__met?.walk.frameMs ?? Number.NaN);`
- `src/walk/walk-mode.ts:307`: `frameMs: times.length === 0 ? null : …`
- The only thing that fills `frameMs` is `walk.noteFrame(...)` at `src/main.ts:328`, and no unit test reads `noteFrame` or `frameMs`.
- What happens: `expect(NaN).toBeLessThan(16.7)` passes Jest's number check (NaN is a number) and then fails as a normal matcher failure, so the error carries `matcherResult`. At `helpers.ts:256` `budgetCheck` catches it and prints "a walking frame's median work: over its budget, not asserted".
- So if `walk.frameMs` stops being recorded, `npm run verify` stays green at all nine walking-frame calls. That value is part of the page's facts (`docs/design/spec.md:182`). Before this change the NaN failed the test, which is why the `?? Number.NaN` fallback was written.
- This breaks the plan's own rule ("Kept in `npm run verify` … That a budget was measured", `plan.md:50`) and R9.
- `layout.spec.ts:212` already does the right thing for `readyMs`. The fix is the same: assert that `budget.work` and `budget.gpu` are finite before the `budgetCheck` calls. The collision's `bvhMs ?? Infinity` is safe, because `walk.spec.ts:318` still checks `collision`.

**F2 (major): `npm run verify` still depends on load, by the change's own record, but the documents say it doesn't.**
- `AGENTS.md:63` says verify "passes or fails the same whatever else the machine is doing". `spec.md:238` says the same.
- `gate-proofs.md:241` says that with the switch off "`npm run verify` stayed green". But its own sets 2 and 3 were red (`:247`, `:250`).
- The failing test is `mouse-look.spec.ts:221` ("a tap on the Walk toggle under the lock"). With slow frames it failed 5 runs of 5 (`:255`).
- `scripts/window-station.test.ts:40-43` has a 20 s deadline that becomes an assertion at `:159` (`expect(status).toBe(1)`). It failed at 100% CPU.
- So acceptance criterion 2 (each plant leaves verify green) is not met for sets 2 and 3. Criterion 3 has not been run: commit `e88f548` says "Not checked: the three loaded verify runs", and `cb1f951` says "Not checked yet: npm run verify and npm run budgets".
- The revision under review has therefore not passed its own gate.
- What to do: correct the three sentences, keep criteria 2 and 3 open, and fix or track both tests. Otherwise the owner's symptom comes back with a functional test's name on it.

**F3 (minor): a leftover CPU-throttle setting makes `npm run budgets` skip four budget calls and still report success.**
- `scripts/budgets.ts:40` passes the caller's whole environment through, including `MET_CPU_THROTTLE`.
- If it is above 1, both R3/R4 budget tests skip (`routes.spec.ts:431`) and Playwright exits 0. That is 4 of the 9 walking-frame calls.
- `budgets.ts:44` then prints "every budget held", and `spec.md:238` says "none can go unasserted".
- AGENTS.md's Load section (`:118`) tells sessions to run 4× throttles, so a shell that still has it set is plausible.
- Fix: have `budgets.ts` remove the variable or refuse to run when it is set.

**F4 (minor): the defect register's check for the Pages-timeout defect is now stale.**
- `docs/learning/defect-register.md:51` says the headroom reporter "fails the run when a passed test takes over a sixth of its timeout".
- This is the check for an owner-relayed defect (`:43`, R17), and it now holds only under `npm run budgets`. The entry should say so.

**F5 (nit): the guard against untagged budget tests has no red proof.**
- `spec.md:248` says `budgetCheck` "fails a test that holds one untagged". There is no test or gate proof of the guard at `helpers.ts:247`. Only the tagged path is shown to work.

**F6 (nit): the headroom header's statement about GitHub's runner is now conditional.**
- `scripts/test-headroom.ts:8` says "vitest.config.ts leaves it out on the runner". With `MET_BUDGETS=1` that is no longer true (`vitest.config.ts:17`).

**F7 (nit): `npm run budgets` can pass having run nothing on early Node 24.**
- `budgets.ts:47` uses `import.meta.main` as its entry guard, which as far as I recall arrived in Node 24.2.
- `engines: ">=24"` and `.nvmrc` `24` both allow 24.0 and 24.1, where the script would exit 0 silently. Other scripts use the same pattern, but a gate that fails this way is worse than a capture script.

**F8 (nit): the new headroom tests build their expected text from the function under test.**
- `test-headroom.test.ts:47` and `:53` build the expected lines from `headroomProblems`. This is acceptable because `:23` pins that text literally.

#### Load-dependent checks still in `npm run verify`
None of these compares a duration with a number, so the inventory is complete. They do vary with load:

- **Frames over a swing** (`doors.spec.ts:231`) and **frames over the walk cycles** (`:390`): minimum-frame-rate checks, roughly 20–30 fps against about 166 measured. Treat as deadlines; they are safe.
- **Share of frames in which the eye moved** (`:392`): this depends on the test runner's input latency, not on frame time. A turn arrives 0.85 m from the leaves (`:121-123`), and the body stops 0.35 m short of them with no delay. At 2 m/s (`walker.ts:54`), a turn more than about 0.18 s late presses the walker into closed leaves. A thin margin.
- **Frame floors on the stairs and at the door** (`stairs.spec.ts:137`; `routes.spec.ts:132`): designed to hold at 10 fps. Deadlines.
- **Fixed-time key holds** (`walk.spec.ts:159-162`; `zoom.spec.ts:178-182`): at the orbit keys' speeds these move tens of metres against a 5 m threshold. Deadlines.
- **Keys arriving in one frame** (`walk.spec.ts:341-351`): a precondition retried 5 times, not a budget.
- **Waits:** `underWay` 1 s and `turn` 3 s (`doors.spec.ts:114`, `:162`), the 60-turn cap, `READ_MS` and the stall timer in the route helpers, and the 0.56 s release tolerance (`routes.spec.ts:31`). All deadlines with wide margins.
- **Checks that now run under load:** a broken budget used to stop the test before these steps; now it doesn't.
  - `walk.spec.ts:312` relies on the 30 s default timeout.
  - `walk.spec.ts:332` expects no look target after 120 walking frames. That is 1.4 m of walking at 166 fps but 8 m at 30 fps, so where the walker ends up now depends on the frame rate.

#### Checked with nothing found
- **Switch reading:** read at each call by `budgetCheck`, once at load by the Vitest config, and nowhere under `src/`.
- **Exit status and order:** an invalid value throws; a run ended by a signal exits 1 (`?? 1`); the second run happens after a failed first.
- **Passing the variable through:** the environment and `MET_PORT` reach both runs, and `--grep @budget` works on Windows (the proofs ran 7 tests). A grep matching nothing is "No tests found", which exits 1.
- **Tags:** labels.spec's tag uses the same 1280-wide condition as its budget call. No other tagged test skips, `retries` is 0, and `forbidOnly` is on.
- **What `budgetCheck` catches:** each callback holds exactly one `expect`.
- **Headroom reporter:** the "time not given" and "over its headroom" cases are split correctly, and the exit status is set only when the run should fail.
- **Pages workflow:** unchanged in effect (`CI` is set and `MET_BUDGETS` is not).
- **AGENTS.md:** 24,294 bytes. The local rules' gate-lock list now includes `npm run budgets`.
- **Red proofs:** all nine assertions are shown failing at their own lines, plus the headroom. The proofs ran on `f2e576d`, before the merge.
- **Merge:** the change's lines are identical on both bases, and both sides show 156 files, +1955/−3464. Milestone B's removal of door `built` facts is intact.

**APPROVE WITH FINDINGS.** The finding that matters most is F2: verify still fails under load on `mouse-look.spec.ts:221` and on the window-station deadline, while AGENTS.md and the spec now say it can't.

## Findings and disposition

Codex rejected and Claude approved with findings. The table gives each finding one ID; the lanes' own numbers are in brackets.

| ID | Finding | Decision | Repair asked |
|---|---|---|---|
| F1 | A missing measurement passes `npm run verify`: `walk.frameMs ?? NaN` fails its comparison and `budgetCheck` prints it as an overrun (major; Codex 1, Claude 1). | Accepted. | That a budget was measured at all, a finite number read from the page, is asserted in either mode; only the comparison goes behind the switch, for every budget. Red proof: the `noteFrame` call removed fails `verify`. |
| F2 | `npm run budgets` passes `MET_CPU_THROTTLE` through, both route budget tests skip under it, and the run reports that every budget held (major for Codex 2, minor for Claude 3). | Accepted. | The runner refuses to run with a throttle over 1, with a unit test. |
| F3 | The frame floors in `doors.spec.ts` (over 20 frames in one swing, over 120 through the walked cycles) are frame-rate requirements still asserted by `verify` (major; Codex 3). Claude lists them as safe deadlines. | Accepted in substance: a floor on how many frames fit in a fixed activity is part of the budget's measurement. | Behind the switch as named budget checks; "measured at all" stays outside, as F1. |
| F4 | `gate-proofs.md` says that with the switch off `verify` stayed green, where sets 2 and 3 record red runs on a functional check (minor; Codex 4, within Claude 2). | Accepted. | The summary says what happened. |
| F5 | `docs/learning/defect-register.md` still says the headroom reporter fails the run, with no word of the switch (minor; Codex 5, Claude 4). | Accepted. | The entry says when it fails the run. |
| F6 | AGENTS.md and the spec say `verify` passes or fails the same whatever else the machine is doing, and the change's own proofs show it does not: `mouse-look.spec.ts:221` failed where every frame was slow, and `scripts/window-station.test.ts` missed a 20 s deadline at 100% CPU. Criterion 2 is not met for two proof sets and criterion 3 had not been run (major; Claude 2). | Accepted. | The documents claim only that `verify` asserts no timing budget. The touch check is tracked in work unit 27, item 6, whose unit decides what a finger's tap on the toggle under the mouse's lock should do. The worker looks at the launcher's test with bounded effort: what each failure was, and a wait that bounds a hang without racing a loaded machine, or a report if the launcher itself is at fault. |
| F7 | The guard that fails a budget held in an untagged test has no red proof (nit; Claude 5). | Accepted. | A proof with a tag taken off, both modes. |
| F8 | `scripts/test-headroom.ts`'s header on GitHub's runner is no longer true with `MET_BUDGETS=1` (nit; Claude 6). | Accepted. | The sentence made true. |
| F9 | `scripts/budgets.ts` guards its entry with `import.meta.main`, absent in Node 24.0 and 24.1, which `.nvmrc` and `engines` allow: there the gate runs nothing and exits 0 (nit; Claude 7). | Accepted. | It fails loudly where `import.meta.main` is undefined, with a unit test. |
| F10 | Checks that now run where a broken budget used to stop the test first, and depend on the frame rate: `walkingBudget` walks for 120 frames however long they take, so `walk.spec.ts:332`'s "no look target" depends on how far the walker got; the share of moving frames and the metres walked through the door cycles have about 0.18 s of margin for input latency; the walking budget's test relies on the default 30 s timeout (minor; from Claude's list of load-dependent checks). | Accepted. | The sampler is bounded in time as well as frames; the share and the distance are conditions of that budget's measurement and go behind the switch; the test gets a deadline with room. |
| F11 | Claude reads F3's floors as safe deadlines. | F3's ruling stands. | None. |
| not taken | The new headroom tests build expected lines from the function under test (nit; Claude 8). | Not accepted as a change: another assertion pins the text, as the reviewer says. | None. |

## Verification

- None in this round. The reviewers read `cb1f951`, on which the worker had not yet run `npm run verify` or `npm run budgets`; the round of repairs records its runs.

## Round outcome

Rejected by Codex and approved with findings by Claude; ten findings accepted and returned to the worker on 2026-11-11. A second round reads the repairs with one lane, as the runbook gives a round of repairs: each repair that changes behaviour beside the test or proof that shows it.
