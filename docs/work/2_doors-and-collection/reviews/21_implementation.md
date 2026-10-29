# Review 21: implementation (the close gate's repair)

## Target

Repository `met`, branch `u2-close`: `00eeee7..1aecda5` (7 files, +308/−141), by worker `close`. It is the repair of review 20's F56–F58, based on main `00eeee7`, which by then held work units 4 to 6 over the merged integration walk.
- `tests/e2e/route-keys.ts` (new) watches each leg's line in the page and learns the release lag; `route-walk.ts` is rewritten around it.
- R1 walks at the shut door instead of running, and each door is used from a stand point inside its reach (`standOff`).
- Six long tests get timeouts from their measured durations.
- AGENTS.md's Gates text and a devlog line.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-close.md` (ignored), from the worker's worktree at `1aecda5`. By its own account it compared all 165 assertions in the changed files with the base and ran the line watch's predicate in memory.
- Coordinator: read the diff, in which no `expect` is removed or changed, and the worker's logs. `npm run verify` on the committed tree finished 46 s before the commit: 650 unit tests in 72 files and 84 e2e green in 13.3 min. Three runs at 4× passed 12 each, in 11.5, 12.6 and 11.6 min, on the same route files.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

- **Should-fix — `tests/e2e/route-keys.ts:106,120`: a lost walking eye bypasses the stall deadline.** If walk mode exits during a leg, `eye === null` returns before the 1.5 s stall check, and `timeout: 0` leaves only the test deadline. R3 at 4× can therefore hang for **40 minutes**, R4 for **28 minutes**. An in-memory execution of the actual predicate confirmed it still returns false after 60 s with a null eye. The base’s periodic `record()` instead fails when walking samples disappear. Fail explicitly on a missing eye and retain a bounded watchdog.

- **Note — `AGENTS.md:88`: “every corner rested on within 0.25 m” overstates the guarantee.** `route-walk.ts:229–231` checks only the projection onto the stopping axis. At R1’s corner `(4.3, −14.8)`, an eye at `(4.3, −14.4)` passes that corner check despite being 0.4 m away. Describe the tolerance as **along the stopping axis**. This is an inherited limitation, not a newly weakened assertion.

- **Note — `docs/devlog/summary.md:5`: the timeout summary is inaccurate.** Six tests changed, not five. Only R3 and R4 multiply their timeouts by `throttleRate()`; the four door tests use fixed 60/90 s limits and do not enable CPU throttling. Those fixed limits provide roughly four times the cited durations. The route limits provide substantial headroom, but compound the hang above.

No explicit assertion was removed or relaxed: all **165 assertions** in the changed existing files are identical to the base. Corner correction now fails after eight unsuccessful attempts instead of silently continuing. The box conversions affect screenshot stops, with strict boundaries becoming inclusive.

The named defect checks remain:

- **Missing closed leaves:** `into()` holds the movement key throughout its stationary check (`route-walk.ts:342`); R1’s 1 cm position check (`routes.spec.ts:129`) and Weston’s face-position check (`:469`) reject walking through or stopping elsewhere.
- **F46:** unchanged `> 5` counts and empty missing-prompt lists at `routes.spec.ts:126–127`, `:187–188`, and `:465–466`.
- **F54:** explicit closed/zero-angle assertion at `routes.spec.ts:183`.
- **F55:** `approach()` retains and checks the approach-and-turn frames at `route-places.ts:320–322`.

Incorrect lag estimates cannot silently defeat the checked stopping-axis tolerance. Door reach/swing checks and artwork distance/card checks remain active. I found no material listener accumulation or TypeScript issue.

Typecheck, targeted lint and diff whitespace checks passed. Changed test files meet the 500-line limit; `routes.spec.ts` has 499 lines. Browser tests were not run under the read-only restriction.

**Verdict: not accept until the watcher’s missing-eye hang is fixed.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F56–F58 | Verified: no assertion removed or relaxed; corner settling fails after eight tries instead of going on; the checks for the closed leaves, F46, F54 and F55 stand | Closed | None |
| F59 | If walk mode is left mid-leg, the line watch waits for the test's timeout, 40 min for R3 at 4× (Codex, should-fix) | Accepted | `634a26e`: a watch ends as `gone` the first frame the eye is null, naming the leg and the last eye, and as `late` after 60 s times `throttleRate()`. Red and green with a probe that presses F 1.5 s into a 26 m leg: the new walk fails in 1,608 ms, while the walk of `1aecda5` waited out its 60 s timeout |
| F60 | AGENTS.md says every corner rests within 0.25 m, but the check is along the stopping axis only (Codex, note) | Accepted | `634a26e`: AGENTS.md, the spec's and the helper's headers and the devlog say "along its stopping axis" |
| F61 | The devlog says five tests got new timeouts; six did, and only R3 and R4 scale with the throttle (Codex, note) | Accepted | `634a26e` |

## Verification

`634a26e`: `npm run verify` green (650 unit tests, 84 e2e in 14.3 min) and three runs at 4× (12 passed each, in 13.1, 12.3 and 11.4 min). Merged with `44ea7b7` as `1304e12`: verify green (84 e2e in 13.5 min) and three runs at 4× (in 10.7, 12.6 and 13.4 min).

## Round outcome

Three findings, repaired in `634a26e`; review 22 is a focused check.
