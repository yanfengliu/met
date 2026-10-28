# Review 18: implementation

## Target

Repository `met`, branch `final`: `0defda0..1f3d7c9` (23 files, +668/−302), the repair of review 17's F44–F48.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-final-r.md` (ignored). By its own account it ran 64 targeted test bodies and six negative controls, all red as intended, and repeated the reachability fill (62,511 places in 18.9 s and 20.0 s).
- Coordinator: `npm run verify` at `1f3d7c9`: 598 unit tests in 67 files, typecheck, lint, build and 88 e2e green. The worker's shots: 12 images differing by at most 1/255.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two findings at `1f3d7c9`:

1. **P2 — The doorway proxy creates an invisible zoom stop.** [src/main.ts:112](C:/Users/38909/Documents/github/met-worktrees/review-final/src/main.ts:112) registers it for both `hit()` and `distance()`. On the middle door’s seam, from `(0, 5.804, −0.389)` toward −Z, the proxy reports **1.30 m**, while the first drawn surface is **16.43 m** away. Four zoom steps stop against the proxy, with the drawn surface still **15.63 m** ahead.

   **Fix:** register doorway boxes for the hit query only; retain actual leaves for zoom distance. Update the new test and spec exception that currently endorse this invisible stop.

2. **P2 — F44 still substitutes a synthetic eye for the reached walker’s eye.** [src/model/reach.test.ts:156](C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/reach.test.ts:156) casts from `feet + 1.6 m`. `Walker.eye()` interpolates horizontal position and eases height. Restoring the recorded walker states makes **nine accepted artwork endpoints fail the gate’s sampled look directions**. For bowl **44745**, even the nearest triangle is **6.00012 m** from the actual eye, outside reach. Replay checks feet positions without rechecking the look target.

   **Fix:** evaluate candidates using the saved walker’s `eye()`, and recheck after replay. If stopping is intended, simulate coasting and validate that resulting state. All nine became visible after coasting in my probe; this is a proof gap, not evidence of globally unreachable artworks.

Otherwise:

- F46 lifecycle, wall occlusion, closed-glass blocking and open-door passage checked out. Boxes stay outside rendering, collision, caps, shadows and timeline statistics. They **do participate in reachability’s picker** as door occluders.
- F47 uses the page’s collision path; missing matrices throw. F48’s Weston check exercises picking.
- F45 preserves fresh action queries without changing `seen` during facts reads.
- Remaining changed documentation matches the inspected tests. File limits passed; model and door mesh counts remain within budget.

**Verification:** 64 targeted test bodies passed through an in-memory runner; six negative controls failed as intended. Reachability repeated at **62,511 places**, taking **18.9 s and 20.0 s**. Typecheck, changed-file lint and diff checks passed. Full `verify`, browser tests, visual checks and browser performance budgets were not rerun. No repository files were changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F46–F48, F45 | Verified: the doorway boxes stay out of rendering, collision, caps, shadows and stats, walls and closed glass still block, and the open door passes | Closed | None |
| F50 | The doorway boxes also stop the zoom: at the middle door's seam it stops 1.30 m out while the first drawn surface is 16.43 m away | Accepted: the zoom stops only at what is drawn | `defcf6f`: the boxes serve the hit query alone; red with them in both queries (1.16 m short); the spec's exception removed |
| F51 | F44 casts from feet + 1.6 m, not the walker's eased eye: nine accepted end points fail from the real eye (one by 0.12 mm) | Accepted | `2600751`: each artwork checked from the walker's own `eye()` at rest, again after the replay; all 94 met |

## Verification

Above.

## Round outcome

Two findings repaired in `defcf6f` and `2600751`; review 19 is a focused check.
