# Review 24: implementation (focused check of review 23's repair)

## Target

Repository `met`, the uncommitted working tree of branch `walkgate` on origin/main `8a6a0c2`, after the repair of review 23's F67 to F79. The repair is the patch `tmp/review-runs/walkgate/fix.patch` (ignored), sha256 `05f22e5577a80bea8274a41228d83dec376d1bc51455b7e9cb6d57d9ed7a7d80`, taken against review 23's files (`tmp/review-runs/walkgate/reviewed-tree-1/`) and HEAD's for the files that round left as they were.
- Weston's door in two tests: from the Petrie Court, held, opened by E and walked through; from gallery 529 with `doors=open`, shut and opened again by E and walked back.
- `tests/e2e/route-holds.ts` (new) holds the hold helpers and `inTime`; the run up the front steps ends 8 m out; `startOf` in `src/walk/spawns.ts`, with its warnings tested; docs and comments reworded.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `-s read-only`, prompt `tmp/review-runs/walkgate/prompt-codex-r.md` (ignored), from the worktree, 365 s. It cited `src/walk/walker.ts:59` and `tests/e2e/route-keys.ts:143`, outside the repair, each saying what it reports. No DLL failure in its log.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — frozen-page hangs remain after the timeout repair.** At [route-places.ts:325](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:325), `approach()` calls `still(page)` even when `inTime()` returned `'late'`. `still()` awaits animation-frame samples without an external deadline, so the frozen page prevents the timeout diagnostic from executing. `into()` also retains unbounded reads at [route-holds.ts:65](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-holds.ts:65) and line 98. These paths can last until the overall test timeout—600 seconds for the throttled short walk. **Fix:** handle timeout results before further unbounded reads; bound setup, sampling and diagnostic reads, and release keys through bounded cleanup.

2. **Should-fix — the release-delay allowance omits crossing-frame overshoot.** [routes.spec.ts:27](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/routes.spec.ts:27) promises that a release up to 0.66 seconds late remains within the middle door’s 1.33 m stretch. The unchanged [route-keys.ts:143](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-keys.ts:143) detects crossing only at a frame sample. At 2 m/s ([walker.ts:59](C:/Users/38909/Documents/github/met-worktrees/walkgate/src/walk/walker.ts:59)) and 0.1-second frames, that sample can already be nearly 0.2 m past the line. Another 0.60 seconds before release adds 1.20 m, exceeding the 1.33 m allowance after coast is accounted for. **Fix:** reserve crossing-frame travel when stating delivery-latency limits, or explicitly define these numbers as total travel-equivalent delay including that overshoot. Apply the same accounting to the landing and passage bounds.

3. **Note — pending evidence also has stale test counts.** [gate-proofs.md:64](C:/Users/38909/Documents/github/met-worktrees/walkgate/docs/learning/gate-proofs.md:64) still says 13 unthrottled tests and 11 throttled tests. Splitting Weston produces **14 and 12**, respectively. The timing placeholders remain there and in [summary.md:5](C:/Users/38909/Documents/github/met-worktrees/walkgate/docs/devlog/summary.md:5), as acknowledged in F69. **Fix:** update counts alongside measured durations and results; retain “pending” wording until those gates finish.

The Weston split retains the requested individual interactions by inspection, and its fixed 529 position resolves the open-versus-closed reach problem. I also checked the spawn resolution and warning tests, empty-record guard, documentation changes, shared callers, and red-proof assertions. No tests ran and no files changed.

**Verdict: not accept.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F67–F79 | Verified by inspection: the split Weston tests keep each interaction, and the fixed place in gallery 529 settles the open and closed reach; the spawn resolution, its warning tests, the empty-record guard and the docs hold | Closed, but for F69, F79 and F80 below | None |
| F80 | Hangs on a frozen page remained: `approach()` called `still()` after its walk wait came back late, and `into()` read the walk's frames and pressed keys with no bound (Codex 1, should-fix; review 23's F79 carried on) | Accepted | `promptly` (`tests/e2e/route-holds.ts`) bounds each read of the page and key sent to it by 2 s times the throttle and fails naming what was asked; `into()`, `holdPast()` and `approach()` use it, and `approach()` fails at once when its walk wait comes back late. The turns by drags stay bounded only by the test's timeout, as the header says. Review 25 |
| F81 | The header's release bounds left out the frame's travel past a line before the page sees it crossed, up to 0.2 m at a walk with frames capped at 0.1 s (Codex 2, should-fix) | Accepted | The header takes it off: 0.56 s at the middle door, 1.0 s on the landing, 1.3 s in the gate's passage, Shift up to 1.0 s late on the front steps. Review 25 |
| F69 | Also the test counts: Weston's split makes 14 tests unthrottled and 12 at 4× (Codex 3, note) | Accepted | Filled with the run times from the gates |

## Verification

The whole spec at 4× on the repaired tree (`tmp/probe/fix2-4x.json`, ignored): 12 passed and the 2 frame budgets skipped, in 119.1 s. Plants 5, 6 and 13 run again on the split Weston tests (`docs/learning/gate-proofs.md`).

## Round outcome

Not accept: F80 and F81 repaired; review 25 checks them.
