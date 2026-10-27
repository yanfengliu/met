# Review 13: implementation

## Target

Repository `met`, branch `labels`: `42722e9..4e16588` (8 files, +761/−195):
- F37: a lost capture keeps the pointer down in the gate, and the zoom follows each press to its end on the document;
- F38: a chord is no click;
- a seeded randomized test (`src/viewer/click-random.test.ts`, 400 sequences of several pointers of all three types) against stream invariants on the real rig. It fails 308 seeds at `42722e9`.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3b-r4.md` (ignored). By its own account it ran 22 focused tests and three probes, and substituted the three production files from `42722e9` in memory, which reproduced exactly 308 failing seeds and the three deterministic F37 and F38 failures. It ran no browser check.
- Coordinator: `npm run verify` at `4e16588`: 563 unit tests in 62 files, typecheck, lint, build and 85 e2e green. The change touches only input handling, and the shot set at `1fd3a50` was identical to main's.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

F37 and F38 are fixed. One low-priority lifecycle gap remains:

1. **P3 — Document listeners lack teardown** — [camera-rig.ts:84](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/camera-rig.ts:84), [zoom.ts:138](C:/Users/38909/Documents/github/met-worktrees/review-m3b/src/viewer/zoom.ts:138). Calling `rig.controls.dispose()` and replacing the canvas leaves five document listeners retaining the old rig/canvas. They are added once, and mode switches do not accumulate them. The current app creates one rig per page, so this is not a current visitor regression. Fix with cleanup callbacks or an `AbortController`, invoked by a rig teardown method.

Otherwise sound within the stated bounds:

- **22 focused tests and three additional probes passed.** New handlers ignore unrelated pointers; walking input passes through. No floor-picker/menu interference found by inspection.
- The randomized test is seeded, reproducible and observes the real consumers. Substituting the three production files from `42722e9` **in memory reproduced exactly 308 failing seeds**, plus all three deterministic F37/F38 failures.
- No further material gate defect found. F39 remains explicitly excluded.

No files changed. Browser e2e tests were not rerun.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F37 | Verified | Closed | None |
| F38 | Verified | Closed | None |
| F42 | The new document listeners have no teardown, so a disposed rig would leave five of them | Accepted, deferred: the page builds one rig and never disposes it, so no visitor meets it | Record only; fix when a rig is ever disposed |

## Verification

Above. Main was fast-forwarded to `4e16588`.

## Round outcome

M3b is merged. The gate took five rounds, F25 to F38. The last two replaced case-by-case patches with a state machine and a randomized check of the class.
