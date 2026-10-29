# Review 22: implementation (focused check)

## Target

Repository `met`, branch `u2-close`: `1aecda5..634a26e`, the repair of review 21's F59–F61.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-close-r.md` (ignored). By its own account it read the source and probed in memory; it ran no browser test.
- Coordinator: read the repair's diff (`04f8a21..3860384`, three e2e helpers, no `expect` changed, `settle` untouched) and the worker's logs: `npm run verify` on its tree (650 unit tests in 72 files, 84 e2e in 14.6 min) and three runs at 4×. The first two passed (12 each, in 10.6 and 10.0 min) and the third failed in R3 (F66).
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — [tests/e2e/route-keys.ts:139](C:/Users/38909/Documents/github/met-worktrees/integrate/tests/e2e/route-keys.ts:139):** The timeout handler awaits an unbounded `page.evaluate`. If the renderer is unresponsive, the 240-second timeout at 4× can expire yet `watch()` remains pending until R3’s 40-minute test deadline. An in-memory probe reproduced this pending fallback. Bound the diagnostic read, or return `late` without it.

2. **Should-fix — [tests/e2e/route-keys.ts:134](C:/Users/38909/Documents/github/met-worktrees/integrate/tests/e2e/route-keys.ts:134):** The watch deadline can exceed its caller’s remaining test budget. The W-alone test at `door-look.spec.ts:116` has a **60-second total timeout**, equal to the unthrottled watch ceiling. If animation frames stop during its watch, the test necessarily expires first. With `MET_CPU_THROTTLE=4`, the watch ceiling becomes 240 seconds while that test remains at 60 seconds.

3. **Should-fix, pre-existing — [tests/e2e/route-walk.ts:97](C:/Users/38909/Documents/github/met-worktrees/integrate/tests/e2e/route-walk.ts:97), [tests/e2e/helpers.ts:30](C:/Users/38909/Documents/github/met-worktrees/integrate/tests/e2e/helpers.ts:30):** These `waitForFunction` calls still have no local timeout. Playwright Test’s configured default is unlimited. A spawn action that never publishes `great-hall`, or a page that never publishes `__shotReady`, can therefore consume R3’s entire 40-minute deadline at 4×.

4. **Note, pre-existing — [tests/e2e/route-walk.ts:45](C:/Users/38909/Documents/github/met-worktrees/integrate/tests/e2e/route-walk.ts:45):** `sample()` waits indefinitely for an animation frame; consequently `still()`’s two-second loop deadline cannot run when frames stop. `record()` at line 63, `helpers.ts:66` and the frame-collection loop at `helpers.ts:205` have the same gap. These waits remain bounded only by the test deadline.

The original missing-eye case is fixed while polling remains responsive: `gone` returns immediately, and route callers name the leg. The stopping-axis wording and six-test timeout accounting now match the code. No assertion, tolerance or check was weakened or removed.

The nominal ceiling is generous for current legs: R4’s 105.5 m running leg takes approximately 21.1 simulation seconds, versus 240 wall-clock seconds at 4×. I found no normal-leg false-timeout case by inspection. Verification used source inspection and in-memory probes; full e2e runs were not performed.

**Verdict: not accept.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F59–F61 | Verified: a missing eye ends a watch at once and the route callers name the leg; the stopping-axis wording and the six timeouts match the code; nothing weakened | Closed | None |
| F62 | The watch's timeout path awaits an unbounded `page.evaluate` for its diagnostic, so with a frozen renderer it stays pending until the test's deadline (Codex 1, should-fix) | Accepted | `3860384`: a timer in the test's process ends each watch at its ceiling, alongside Playwright's own timeout, which does not fire while the page's main thread is frozen. The failure path's diagnostic read and key release are each raced against 2 s. Red and green with the page frozen 1.5 s into a 26 m leg: the new walk fails at 34.1 s with its own message, and the walk of `634a26e` waited until the test's timeout closed the page (48.9 s) |
| F63 | A watch's ceiling can exceed its caller's budget: 60 s in the 60 s W-alone test, and 240 s against it at 4× (Codex 2, should-fix) | Accepted | `3860384`: each watch's ceiling is the smaller of 60 s times `throttleRate()` and the test's timeout, less the time since its first watch, less a 15 s margin times the throttle. So a watch that runs out fails with its own message, after at most about 45 s in the 60 s W-alone test. No separate proof beyond the frozen page |
| F64 | The spawn wait (`route-walk.ts:97`) and `__shotReady` (`helpers.ts:30`) had no local timeout, so a page that never publishes them used R3's whole deadline (Codex 3, should-fix, older than this unit's close) | Accepted | `3860384`: `open()` waits at most 20 s times the throttle for `__shotReady`, and the Great Hall spawn wait 15 s times the throttle, each failing with a message naming what never came. Red and green with `__shotReady` held false: the new wait fails at 22.7 s, and the old one waited out the 45 s test timeout. No probe for the spawn wait |
| F65 | `sample()`, `record()` and two helpers' frame waits are bounded only by the test's deadline (Codex 4, note) | Noted: they cost time only once frames have stopped, and the test's timeout still ends them | None |
| F66 | The third run at 4× on the repair's tree failed in R3. Walking into the Dendur pool's north arm, `settle` never rested within 0.25 m of its corner along the axis in 8 walks: it rested 0.58, −2.57, −0.32, −2.56, −0.32, −2.34 and −0.44 m off, the walks onto it stopping 0.3 to 0.4 m short after the step down (coordinator's gate) | Open: the owner chose to land the unit with it recorded, then to replace the long browser walks with fixed-position checks, pictures and one short real-key walk, which retires `settle` | The walk gate's replacement, the owner's next step |

## Verification

On the tree of `3860384`: `npm run verify` green (650 unit tests in 72 files, 84 e2e in 14.6 min). Three runs at 4×: the first two green (12 passed each, in 10.6 and 10.0 min), the third red in R3 (F66). On the owner's decision the unit landed with F66 open.

## Round outcome

F62–F64 repaired in `3860384`, and F65 noted. F66 is open: the owner chose to land the unit with it recorded, then to replace the long walks with fixed-position checks.
