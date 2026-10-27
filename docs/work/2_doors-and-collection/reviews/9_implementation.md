# Review 9: implementation

## Target

Repository `met`, branch `doors`: `f5a68e6..6198d1a` (15 files, +287/−49), the repair of review 8, given to the reviewer as a diff on stdin with the snapshot worktree moved to `6198d1a` (main `fd781de` merged in at `f5a68e6`). The entrance's doors now stand behind the columns, with bronze either side, piers behind the columns and a lintel over them. The new `door-fit.test.ts` sweeps the leaves against the finished model. Each door is read back from its meshes right after the render.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m2a-r2.md` (ignored).
  - By its own account it ran 163 targeted tests, TypeScript and changed-file lint, covering headless R1, the locked doors, window parts, collection clearances, determinism, the lifecycle, picking, the cut and cap, the budgets and the file limits.
  - It put a solid round a doorway, and a leaf 12 mm into its partner, to test the new fit test's power.
  - It could not reach the reference photos' host, so the photos' fidelity is not independently checked.
- Coordinator:
  - The standard shot set at `6198d1a` against main's, read at native resolution. Only the entrance changed. Closed, each doorway's bronze frame stands behind the column line, with bronze piers behind the columns and a continuous transom over them. Open, the leaves swing into the vestibule clear of the columns. In the cut from above, the column bases stand clear of every leaf.
  - `npm run verify` at `6198d1a` passed: 539 unit tests in 56 files, typecheck, lint, build and 74 e2e.
  - 744 meshes and 1,579,480 triangles; ready 2.6 s cold.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two **P2 verification gaps** remain at `6198d1a`; I found no production regression in the repair.

1. **P2 — Contained solids escape the fit gate.** [door-fit.test.ts:58](C:/Users/38909/Documents/github/met-worktrees/review-m2a/src/model/door-fit.test.ts:58) tests triangle-surface crossings, which miss containment. In an in-memory run, I added a 2 × 6 × 3 m solid enclosing the middle doorway and its entire swing: **all six fit tests still passed**. Thus a door embedded in a wall can satisfy the documented clearance guarantee. Supplement surface intersections with containment checks for closed solid components, and retain this blocked-doorway control.

2. **P2 — Partner leaves are never collision-tested together.** [door-fit.test.ts:87](C:/Users/38909/Documents/github/met-worktrees/review-m2a/src/model/door-fit.test.ts:87) excludes every leaf sharing the tested door’s ID. The referenced library test checks leaves against frames and fanlights, not their partner. Shifting the right-hand stand-in geometry 12 mm toward its partner creates a confirmed overlap, yet **all six fit tests still pass**. Test partner leaves at their simultaneous transformed poses, excluding only components belonging to the same physical leaf. Update the gate’s header and documentation accordingly.

Otherwise:

- **F32:** sound in the current render path. Read-back immediately follows rendering, mutates no timeline state, and publication creates a detached frozen snapshot. The saved control genuinely moves synchronization after rendering.
- **F33:** the 4 mm clearances and 8 mm meeting gap agree with the implementation and assertions.
- **Regressions:** 163 targeted tests, TypeScript, and changed-file lint passed. These cover headless R1, locked doors, window parts, collection clearances, determinism, lifecycle, picking, cut/cap, budgets, and file limits. Existing entrance closed/open/cut captures showed no new visible clash.
- Full build/e2e were not rerun; the saved verification log reports 74 e2e passes. Repository files remain unchanged.

Browser security approval denied network access to the reference-photo host, so S8/S10 fidelity remains independently unverified in this review.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F31 | Fixed in the model: no leaf meets a column, wall or floor at any pose, and no new visible clash in the entrance captures | Closed | None |
| F32 | Verified: the read-back follows the render, writes no timeline state and publishes a detached frozen snapshot; the control is real | Closed | None |
| F33 | Verified | Closed | None |
| F34 | The fit test finds crossing surfaces only, so a leaf inside a closed solid passes: a 2 × 6 × 3 m block round a doorway left all six tests green | Accepted as a gap in the check, not a defect in the model; moved to M2b, whose collision needs the same containment test | M2b |
| F35 | The fit test never tries a door's two leaves against each other: a leaf 12 mm into its partner left it green | Accepted as a gap in the check; moved to M2b with F34 | M2b |

## Verification

Above. Main was fast-forwarded to `6198d1a`.

## Round outcome

M2a is merged. F31–F33 are closed. F34 and F35 strengthen the fit test, and they go to M2b, which builds the doors' collision. After three rounds on door clearance, the coordinator judged the remaining work to be in the check, not the model, and moved it to the milestone that owns collision rather than open a fourth round here.
