# Review 25: implementation (focused check of review 24's repair)

## Target

Repository `met`, the uncommitted working tree of branch `walkgate` on origin/main `8a6a0c2`, after the repair of review 24's F80 and F81. The whole change at that point is preserved as `tmp/review-runs/walkgate/round25.patch` (ignored), sha256 `25c82761ea40f0a34c79e450dcf9bb140b41177c85647645ce8e8100abf9b885`, with its files in `tmp/review-runs/walkgate/tree-snapshot-2/files.tar` (sha256 `ab5e33281c1f7f57844eac2e934a395b3439335c0f2e2763921e4fda3bfd73a1`).
- `promptly` in `tests/e2e/route-holds.ts` bounds each read of the page and key sent to it; `into()`, `holdPast()` and `approach()` use it, and `approach()` fails at once when its walk wait comes back late.
- The routes.spec header's release bounds take off the frame's travel past a line before the page sees it crossed.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `-s read-only`, prompt `tmp/review-runs/walkgate/prompt-codex-r2.md` (ignored), from the worktree, 319 s. It checked the patch's digest, and cited `src/walk/walker.ts:58` and `tests/e2e/helpers.ts:38`, outside the repair, each saying what it reports. No DLL failure in its log.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **Should-fix — F80 remains incomplete in `approach()`.** [route-places.ts:286](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:286) still awaits screen recording and its marker without a process-side bound. The key presses at lines 291–292 and 307, screen reads, and final recording also remain unwrapped. A freeze at any of these points bypasses `inTime()` and waits for the whole test timeout. The immediate `'late'` failure fixes the reported path, but the header’s broader claim remains false. Apply `promptly()` to the remaining non-drag operations and `inTime()` to the label-disappearance wait.

2. **Note — one successful-path read retains an unscaled timeout.** [route-holds.ts:106](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-holds.ts:106) allows only 2 seconds for the final sample, even at 4×, while `promptly()` allows 8 seconds. A delayed frame arriving between those deadlines fails an otherwise successful hold. Use the same scaled read budget, preserving bounded key release on failure. The throttle calculation is confirmed in unchanged [helpers.ts:38](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/helpers.ts:38).

I checked the revised release arithmetic against the movement constants in unchanged [walker.ts:58](C:/Users/38909/Documents/github/met-worktrees/walkgate/src/walk/walker.ts:58), the landing dimensions, and the gate geometry. The nominal calculations support the revised allowances. `promptly()` correctly clears its timer and scales to 8 seconds at 4×; load tolerance was not experimentally verified.

Read-only review; no tests, edits, or subagents. The saved patch matches the supplied SHA-256.

Verdict: not accept.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F81 | Verified: the revised release bounds follow from the motion constants, the landing's depth and the gate's geometry | Closed | None |
| F82 | `approach()` still awaited the screen record's start and marks, its key presses, its screen reads, the card's going and its last frame read with no bound in the test's process (Codex 1, should-fix; F80 carried on) | Accepted | Each goes through `promptly`, and the card's going through `inTime`, failing when it is not gone in time; the drags that turn the walker stay bounded only by the test's timeout, as the header says. Review 26 |
| F83 | `into()`'s last frame read had an unscaled 2 s bound, against `promptly`'s 2 s times the throttle (Codex 2, note) | Accepted | The same scaled bound. Review 26 |

## Verification

At 4× on the repaired tree (`tmp/probe/fix3-4x.json`, ignored): the short walk, both door places, both Weston tests and both artwork places passed, in 87.2 s.

## Round outcome

Not accept: F82 and F83 repaired; review 26 checks them.
