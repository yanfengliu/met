# Review 20: implementation (integration walk)

## Target

Repository `met`, branch `integrate`: `3b405f7..09769fb`. Main `3b405f7` is merged in, so this is the integration walk alone.
- `routes.spec` walks every route both ways through real keys and drags.
- R1, R2 and R5 go from the plaza straight at the central door, open it with E, shut it behind, go on to gallery 600 and come back out.
- R3 and R6 cover the Dendur side flight, the dais flights, the gate passage, the rail, the pool step in and out, and two label cards.
- R4 and the new R7 go through Exhibition Gallery 199, M4's corridor and gallery 549 into the Petrie Court, and through the Weston door from both sides.
- `labels-doors.spec` (review 7's F30) is folded into `routes.spec`.

Its repairs are `9d9d08d` (F54 and F55). It was merged into the local `main` at `795956f`, over work unit 3's `53a981c`, and its close gate ran there. Before that gate had passed, work unit 5's session committed on top of that `main` and pushed it (`8e6643c`), which carried the merge to origin.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-integrate.md` (ignored).
- Coordinator: `npm run verify` at `09769fb`: 604 unit tests in 67 files and 84 e2e green in 13.6 min. The worker: three of three runs at 4× CPU throttle. The e2e suite went from 9.8 to 13.3 minutes.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two **P2 coverage gaps**:

- **[routes.spec.ts:181](C:/Users/38909/Documents/github/met-worktrees/review-final/tests/e2e/routes.spec.ts:181)** conditionally skips the return door check when the door is already open. A regression that opens it outward automatically during the return can pass without testing the promised “E Open” approach or E operation. **Fix:** assert it remains closed, require nonzero approach samples, and unconditionally open it with E.

- **[route-places.ts:279](C:/Users/38909/Documents/github/met-worktrees/review-final/tests/e2e/route-places.ts:279)** records the artwork approaches without `onGround`. The following `walk()` discards their accumulated movement samples at entry, so the final `airborne(samples)` assertion excludes them. A brief fall and recovery while approaching the Sphinx or Ruth could pass. **Fix:** collect those movement samples into the enclosing walk, or record and assert `onGround` within `approach()`.

Otherwise, the route joins cover **R1–R7 both ways**, including R2 through R5 and the shared R3/R6 and R4/R7 stretches. Navigation uses real keys/drags and position predicates; the existing performance probes remain frame-count based.

**F30 loses no assertion:** both DOM elements are read continuously with the same per-animation-frame sampling as before; any overlap fails; prompt-only frames before and after the card, card-only frames, target kinds and prompt wording remain required. The return encounter changes from interior “E Close” to “E Open,” then exterior “E Close.”

I found no weakened earlier wait or numerical tolerance. The added return walks, passages and interactions serve the plan and justify additional runtime, though I did not independently measure the 3.5-minute increase.

Static review of `09769fb`; diff check passed. No files changed or browser tests rerun.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F30 | Verified after the fold into `routes.spec`: both elements are read every frame, any overlap fails, and prompt-only and card-only frames are required | Closed | None |
| F54 | The return skips the door check when the door is already open, so a door that opened by itself would pass | Accepted | `9d9d08d`: the return asserts the door is shut, needs approach frames and always opens it with E; red with a planted self-opening door, found open at −90° |
| F55 | The artwork approaches are recorded without `onGround`, so a fall on the way to the Sphinx or *Ruth Gleaning* would pass | Accepted | `9d9d08d`: `approach()` keeps its frames and checks they stay on the ground; red with a planted hop, 81 frames |
| F56 | The close gate's second run at 4× stopped at "E Close" in the entrance bay: the door never became the look target in 12 s (coordinator, on the merged `795956f`) | Accepted: a gate that fails under load fails its purpose | `1aecda5` (worker `close`): a key let go by the test reached the page 5 to 7 frames late, 1.4 to 1.8 m at a run at 4×, and the corner's settle gave up silently after four tries, so the walker rested past the corner with the open leaf beyond the door's 2 m reach. The walk now watches each line in the page, lets the keys go early by the lag it learns, and rests on each corner within 0.25 m along its stopping axis or fails. Red with the walk of `795956f` under a 300 ms delay planted before each key goes up (it rested 0.62 m past the corner, the leaf 2.13 m off, and failed at the same line); green under the same delay (review 21) |
| F57 | The third run walked off the Dendur dais at the south flight's head (worker `close`, reading the run's log) | Accepted: the same late release | `1aecda5`, as F56. Under the planted delay the old walk fails at the gate's passage and the new one passes |
| F58 | `doors.spec:280` used 21.4 to 22.6 s of its 30 s timeout and ran out under load (55.8 s) | Accepted | `1aecda5`: six long tests get timeouts from their measured durations. The north link door's two walks get 90 s and the entrance door test and the W-alone walk 60 s, all four unthrottled. R3 gets 600 s and R4 420 s, times `throttleRate()` |

## Verification

Above. The close gate's repairs are checked in reviews 21 and 22.

## Round outcome

F30 verified, and F54 and F55 repaired in `9d9d08d`. The walk was merged at `795956f`, which work unit 5's push carried to origin before its close gate had passed. The close gate failed under load (F56–F58), repaired in `1aecda5` and checked in reviews 21 and 22.
