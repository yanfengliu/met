# Review 29: implementation (focused check of review 28's repairs)

## Target

Repository `met`, branch `doorspawn`: the uncommitted working tree on `0f4a1e9` after the repairs of review 28's F84 to F91, preserved as `fleet/tmp/review-runs/met-2-r29/repair.patch` (ignored), sha256 `96e3e30ce9fcf7ab5a47bafe3fd56f0167f696c34a92c5ca39c4b113d4dd705f`, the new record `reviews/28_implementation.md` included.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `fleet/tmp/review-runs/met-2-r29/prompt.md` (ignored), from the worktree, 272 s. It cited `src/walk/walker.ts:271`, outside the patch, which computes the look as it says. No failed sandbox command in its log. The tree's status, its diff and the new record's digest were the same before and after.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two low-severity findings remain.

1. **Low — the new wording exceeds the assertion’s scope.** [walk.spec.ts:194](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/walk.spec.ts:194) says the click and lock “turned nothing,” and line 196 says the spawn faces −Z. Both assertions inspect only X components. A pitch-only turn passes; facing +Z also satisfies the static assertion. The unchanged direction calculation confirms this: [walker.ts:271](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/walk/walker.ts:271). **Fix:** describe the check as preserving the original X-axis alignment, or compare the complete expected look direction if “turned nothing” is the intended guarantee. This is a wording finding: F84’s original assertion had the same directional limitation.

2. **Low — the records claim landing before integration.** [summary.md:5](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/devlog/summary.md:5) says “Landed on 2026-11-04”; [plan.md:191](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/work/2_doors-and-collection/plan.md:191) and [28_implementation.md:5](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/work/2_doors-and-collection/reviews/28_implementation.md:5) likewise describe completed landing. The reviewed repairs are uncommitted, and the inspected main refs remain at `b6e3e91`. This could make a later reader treat pending repairs as integrated. **Fix:** describe the work as under review, then record the actual landing revision and date after integration.

Otherwise:

- **F84:** restores the old eye-X/look-X assertion and tolerance after placement and pointer lock. `rest` crosses animation frames before reading fresh facts. I found no concrete false failure from settling, rounding or lock timing at this stationary spawn.
- **F85–F91:** the repairs address their findings. The changed benchmark scene is disclosed, timings total 24.6 seconds, and correcting the headers without extracting shared checks follows the reviewer’s offered alternative.
- **F92–F93:** leaving them unchanged is reasonable within the stated bounds: the place lies on the approach line within the accepted band; exact query orientation is not a new guarantee of `standAt`.
- Both embedded reports match their source reports, apart from Claude’s heading-depth adjustment. Finding IDs and attribution are correct. The authored records follow the paragraph convention. The new red-proof description is consistent with the code, but its execution remains a recorded claim.

No other regression found by inspection. No files changed; no tests, builds, servers or browsers ran.

**Verdict: accept once the findings are repaired.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F94 | walk.spec's new check read X alone, while its comment said the click and the lock "turned nothing", and its guard's message named −Z, which a +Z facing also passed (Codex 1, low) | Accepted, by the stronger of the two fixes offered: the page publishes the walker's own look, in doubles from its yaw and pitch (`src/walk/walker.ts:271`), so the whole direction can be read to 9 digits | The check reads the eye's X and the whole look against the spawn's facing and pitch, and the guard reads the facing whole (`tests/e2e/walk.spec.ts`). Red with one pixel of turn, in yaw or in pitch, planted at the lock once the walker is placed (`docs/learning/gate-proofs.md`) |
| F95 | The devlog, the plan and review 28's record said the work had landed before it had (Codex 2, low) | Accepted | They no longer say so. The record commit made after the repairs names the revision that lands |

## Found while repairing

The red proof of F84 planted its turn at the lock itself. `enter` asks for the lock before the frame that places the walker, so a turn made at a lock that comes first is undone by the placement. Planted that way, the yaw went red in both of its runs, but the pitch stayed green in its one. The check is not at fault: a turn the placement undoes is no turn a visitor sees. The plants now turn once the walker is placed: each turned the toggle test red in both of two runs, and the yaw turned door-look's middle-door test red too.

## Verification

- The gates on the tree this round reviewed, through the gate lock: `npm run verify`, 732 unit tests in 81 files and 125 e2e in 9.9 min, 633 s in all; routes.spec with walk.spec at 4×, three runs in a row, 21 passed and 2 skipped each, in 142, 146 and 145 s.
- F94's repair: lint, and the toggle and door-look tests green without the plants. The placed yaw turned both red, and the placed pitch the toggle test; door-look's middle-door test, which reads X alone, was not run under the pitch (review 30, F96). The gates on the repaired tree: review 30's record.

## Round outcome

Accept once F94 and F95 are repaired. Both are repaired, and review 30 checks them.
