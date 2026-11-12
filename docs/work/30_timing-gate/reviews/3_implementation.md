# Review 3: implementation

## Target

The repairs after review 2 of work unit 30: repository met, commit `4351859` on the coordinator's branch `worktree-improvement-list`, read in a clean checkout at that commit. The repair is that one commit: the walking work read inside the sampler's last frame (F16) and one sentence of the spec (F17). The reviewer was given its diff against its parent.

## Reviewers and coverage

- One lane, as the fleet's runbook gives a round of repairs: Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/main.ts`, `src/walk/walk-mode.ts`, `package.json` and `scripts/budgets.ts` outside the diff.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. The lane ran no tests, builds or network requests.

The prompt asked which frames are in the page's window when the sampler's last callback runs, in either order of the two callbacks, whether a fact read inside a frame callback can be stale, and whether the spec's new sentence is true.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

No new findings. Reviewed `4351859` by source inspection only; no files changed, tests/builds run, or network requests made.

The page callback runs first in this setup. Its loop is already running before the sampler starts, and [main.ts:328](/src/main.ts:328) calls `walk.noteFrame(performance.now() - work)` before requesting its successor at line 334. Both loops request one successor per callback, preserving their registration order; they do not alternate order between frames.

Let the sampler’s 121 timestamps be `t0…t120`, producing 120 intervals, and let `Wi` be the page’s work recorded in frame `i`. With walking active and prepared, [walk-mode.ts:285](/src/walk/walk-mode.ts:285) pushes each measurement and shifts the oldest beyond 120:

| Callback order | Window when the sampler finishes |
|---|---|
| Page first, as here | `W1…W120`; the current frame has been recorded |
| Sampler first, if initially registered that way | `W0…W119`; the current page callback has yet to run |

Thus the reading covers the sampled run within the allowed one-frame boundary difference. Reading inside the final callback prevents subsequent frames from replacing entries before capture.

There is no cached-snapshot problem. [main.ts:359](/src/main.ts:359) publishes `get walk() { return snapshot(walk.facts()); }`. Each access invokes [walk-mode.ts:294](/src/walk/walk-mode.ts:294), which copies and sorts the current `frameTimes`, then selects its median at line 307. Freezing the returned snapshot does not cache the getter. This reads the same statistic as the former second call, although that later call could return a different number after additional frames.

The destructuring is type-consistent by inspection: the explicit promise returns `{ intervals: number[]; work: number }`, and `?? Number.NaN` converts the nullable/optional reading to `number`. The array remains valid for sorting and median selection, and `work` matches `WalkingBudget.work`. The 120-interval count, key handling, GPU benchmark, thresholds and callers are unchanged; only the work-reading location and removal of its separate browser call change.

The new specification sentence is true. [helpers.ts:252](/tests/e2e/helpers.ts:252) checks `!info.tags.includes('@budget')` before the budget switch. [package.json:19](/package.json:19) runs e2e without filtering during `verify`; [budgets.ts:31](/scripts/budgets.ts:31) selects `--grep @budget`. I found no remaining opposite claim: spec line 249, plan line 59 and AGENTS.md line 71 all distinguish failure when executed from exclusion by the budget gate.

APPROVE — F16’s delayed-read defect is repaired within the stated one-frame edge tolerance; no new findings.

## Findings and disposition

| ID | Finding | Decision | Repair |
|---|---|---|---|
| F16 | Review 2: the work median was read one call after the sample. | Closed. The page's callback runs before the sampler's in each frame, so the window at the sampler's last callback is the sampled frames; in the other order it would be one frame earlier, still inside the sample. The fact is computed afresh at each read. | None further. |
| F17 | Review 2: one sentence of the spec still said an untagged budget fails under either gate. | Closed; no opposite claim is left in the spec, the plan or AGENTS.md. | None further. |
| not read by a lane | After this round's revision the coordinator widened two bounds on a hang, at `cd61c00`: the browser server's wait for the browser to close (`tests/e2e/browser-server.ts` `CLOSE_MS`) and the launcher's tries to remove its temporary folder (`scripts/window-station.ps1`), each from 10 s to 60 s, after `npm run verify` on `4351859` failed in its unit stage on the first of them with the machine loaded. | Two constants and their comments; the launcher's own 10 tests and both gates ran on the result. | None. |

## Verification

- `npm run verify` on `4351859`: red in its unit stage, `scripts/window-station.test.ts`'s "closes the browser and ends with 0" answering 1, the browser server's 10 s bound on the close; 740 of 741 unit tests passed and the later stages did not run. `npm run budgets` on the same tree: every budget held (741 unit tests, 7 e2e).
- `npm run verify` and `npm run budgets` on `cd61c00`, the tree that lands, through the gate lock: both green, their counts in the commit that lands them.

## Round outcome

Approved with no new finding. Work unit 30 is complete with this landing.
