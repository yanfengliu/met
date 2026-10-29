# Review 27: implementation (focused check of review 26's repair)

## Target

Repository `met`, the uncommitted working tree of branch `walkgate` on origin/main `8a6a0c2`, after the repair of review 26's F82: the whole change preserved as `tmp/review-runs/walkgate/round27.patch` (ignored), sha256 `44cff4eb02ee38c383a72b1b6746115de8bea9c0e26e2b2a24bec65dfbeeb726`. `approach()` races its body (`walkUpTo`) against one deadline of 60 s times the CPU throttle, timed in the test's process, and its last assertion runs with a 1.5 s times the throttle timeout inside `promptly`'s 2 s times the throttle.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `-s read-only`, prompt `tmp/review-runs/walkgate/prompt-codex-r4.md` (ignored), from the worktree, 152 s. It read both untracked files, checked the patch's digest, and cited `src/walk/walker.ts:59` and `src/ui/art-card.ts:119`, outside the repair. No DLL failure in its log.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

No findings in this repair.

- The whole `walkUpTo()` call, including both drag paths, is covered by the process-side race at [route-places.ts:277](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:277). [inTime():17](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-holds.ts:17) returns without awaiting the losing operation and clears its timer. A frozen page cannot hold that race open.
- The deadline is 60 seconds, or 240 seconds at 4× throttle. That leaves substantial headroom for roughly 20 m of movement at the unchanged [2 m/s walking speed](C:/Users/38909/Documents/github/met-worktrees/walkgate/src/walk/walker.ts:59), plus turns and checks.
- The [assertion at line 356](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:356) allows 6 seconds inside an 8-second process-side bound at 4×. It follows the label-null check; outside the repair, [art-card.ts:119](C:/Users/38909/Documents/github/met-worktrees/walkgate/src/ui/art-card.ts:119) hides the card synchronously. I found no concrete timing regression for the stated load.

Read both named untracked files and confirmed the supplied patch SHA-256. Tests were not run, as instructed; load stability remains empirically unverified by this review.

Verdict: accept.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F82 | Verified: a frozen page can no longer hold `approach()` past its deadline, and the deadline and the assertion's timeout leave a slow page room | Closed | None |

## Verification

As review 26's.

## Round outcome

Accept. With F82 closed, every finding of rounds 23 to 27 is closed but F69, the run times, which the gates fill.
