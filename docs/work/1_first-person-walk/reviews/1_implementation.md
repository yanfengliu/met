# Review 1: implementation

## Target

Repository `met`, the repairs of review 0 on branch `repair-u1`: `6f8892f..18b2a1c`, given to the reviewer as a diff on stdin with the `repair-u1` worktree as working directory.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r.md` (ignored): a focused check of U1–U6. Its log shows no `STATUS_DLL_INIT_FAILED` or `-1073741502`. By its own account it ran the typecheck and all 24 walker and settle cases in an in-memory harness, and reproduced U1's remaining case on the real model; it did not run the browser tests or repeated loads.
- Claude: not run. This was a focused check, and the account stood at 82% of its seven-day usage.

## Reports

### Codex (`gpt-6-astra`, xhigh)

**U1 and U6 are partly fixed; U2–U5 are verified by the checks below.** Typecheck passed. All 24 walker/settlement cases passed in an in-memory harness; browser and repeated-load tests were not run. No files changed.

- **U1 — Partly fixed.** Reconciliation runs after rebuilding ([walk-mode.ts:173](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walk-mode.ts:173)), but odd crossing counts bypass embedding detection ([walker.ts:44](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walker.ts:44)). Reproduced on the real model: at X=0, Z=−43, advancing t=45→46 builds the Grand Staircase; `settle` returns `kept`, leaving feet at 4.08 m beneath its 6.645 m tread, unchanged two seconds later. The flight omits its underside ([lib/stair.ts:85](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/lib/stair.ts:85)) and is used directly here ([hunt/stair.ts:93](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/hunt/stair.ts:93)); both files were read outside the diff. Close its collision volume or support these open-bottom solids, and gate this actual rebuild. **Reversion sensitivity: yes for covered cases**—disabling reconciliation failed six checks; the fixtures explicitly exclude open pieces ([settle.test.ts:5](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/settle.test.ts:5)).

- **U2 — Verified.** Rising checks headroom before committing the step ([walker.ts:297](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walker.ts:297)). **Reversion sensitivity: yes, executed**—disabling rejection failed both ceiling tests ([walker.test.ts:145](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walker.test.ts:145), [161](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walker.test.ts:161)).

- **U3 — Verified.** The callback reads current `walk.active` ([main.ts:249](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:249)); the unchanged dispatcher invokes it per keydown ([keyboard.ts:48](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/ui/keyboard.ts:48), outside the diff). **Reversion sensitivity: yes, by inspection**—the tests require same-frame delivery and assert the resulting timeline state ([walk.spec.ts:286](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:286), [305](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:305)).

- **U4 — Verified.** Walk mode exits before applying the preset ([main.ts:213](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:213)). **Reversion sensitivity: yes, by inspection**—the new test requires orbit mode, the preset pose, and stable eye placement after re-entry, exit and resize ([camera.spec.ts:72](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/camera.spec.ts:72)).

- **U5 — Verified.** The bound comes from independent triangle intersections ([surface.ts:64](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/surface.ts:64), [zoom.spec.ts:76](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:76)). My numerical probe detected the target-distance picker defect for all three presets. **Reversion sensitivity:** that faulty picker fails the new oracle; reverting only the test repair is not self-detecting. The register records that distinction and mutation evidence ([defect-register.md:23](C:/Users/38909/Documents/github/met-worktrees/repair-u1/docs/learning/defect-register.md:23)).

- **U6 — Partly fixed.** Recording and waypoint waits now run per frame, and route tests scale their overall timeout ([routes.spec.ts:85](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/routes.spec.ts:85), [213](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/routes.spec.ts:213), [359](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/routes.spec.ts:359)). The plaza test has the timeout defect below. **Reversion sensitivity: not guaranteed**—these harness changes have no deterministic reversion check; repeated load runs remain necessary.

**New test defect — P2:** The plaza walk scales its inner wait to 80 seconds at `MET_CPU_THROTTLE=4` ([walk.spec.ts:218](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:218)), but leaves the test’s overall timeout at Playwright’s 30-second default ([installed runner:478](C:/Users/38909/Documents/github/met-worktrees/repair-u1/node_modules/playwright/lib/common/index.js:478)). A loaded run needing 35 seconds fails before its permitted waypoint wait expires. Set a scaled overall timeout for this test and keep subordinate waits within that budget.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U1 | Partly fixed: stair flights from `src/model/lib/stair.ts` have no underside, so `settle` keeps a walker built into one (reproduced at X 0, Z −43, t 45→46) | Accepted: the fix's own case on the real model | `repair-u1` `e760a84`: flights and cheeks closed; a real-sequence case at that spot, red first |
| U2–U5 | Verified, each with a reversion check | Closed | None |
| U6 | Partly fixed: the plaza walk kept Playwright's 30 s overall timeout while its inner wait scaled to 80 s at 4× | Accepted | `repair-u1` `e760a84`: `test.setTimeout(60_000 * throttleRate())`; 3 runs in a row green at 4× |

## Verification

The repair worker reported `verify` green at `e760a84`: 386 unit, 54 e2e. In the same commit it also changed `tests/e2e/zoom.spec.ts` after one 3 cm miss in the after-W case; that change was not a finding of this round and is part of round 2's target.

## Round outcome

U2–U5 verified. U1 and U6 repaired again in `e760a84`. Round 2 is a focused Codex check of `18b2a1c..e760a84`.
