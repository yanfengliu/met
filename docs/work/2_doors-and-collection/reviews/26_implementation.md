# Review 26: implementation (focused check of review 25's repair)

## Target

Repository `met`, the uncommitted working tree of branch `walkgate` on origin/main `8a6a0c2`, after the repair of review 25's F82 and F83: the whole change preserved as `tmp/review-runs/walkgate/round26.patch` (ignored), sha256 `0cabd12c74254772b1eea258bb271c986c913c7e42b865cf946ea5fa82c8ea14`.
- `approach()` (`tests/e2e/route-places.ts`) sends its screen reads, key presses and last frame read through `promptly`, and its wait for the card to go through `inTime`.
- `into()`'s last frame read takes `promptly`'s bound, scaled by the throttle.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `-s read-only`, prompt `tmp/review-runs/walkgate/prompt-codex-r3.md` (ignored), from the worktree, 186 s. It checked the patch's digest, and cited `tests/e2e/helpers.ts:38` and the installed Playwright's `coreBundle.js:25609`, outside the repair. No DLL failure in its log.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

- **Should-fix — F82 remains incomplete:** [route-places.ts:344](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-places.ts:344) still awaits `toBeHidden()` without a process-side bound. A freeze after `gone` resolves can hang this assertion until the whole test timeout. The installed Playwright implementation performs its first assertion read with `nullProgress`, bypassing its timeout race ([coreBundle.js:25609](C:/Users/38909/Documents/github/met-worktrees/walkgate/node_modules/playwright-core/lib/coreBundle.js:25609)). Wrap this assertion in `promptly()` or `inTime()`, with a throttle-scaled assertion timeout.

F83 is fixed: [route-holds.ts:106](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/route-holds.ts:106) now allows 8 seconds at 4×, consistent with unchanged [helpers.ts:38](C:/Users/38909/Documents/github/met-worktrees/walkgate/tests/e2e/helpers.ts:38). The other F82 waits are wrapped as described. I found no additional regression in those changes; loaded-machine tolerance was assessed statically, not measured.

The preserved patch hash matches. Read-only review; no tests, edits, or subagents.

Verdict: not accept.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F83 | Verified: the scaled bound | Closed | None |
| F82 | Still open: `approach()` awaited `expect(...).toBeHidden()` with no bound in the test's process, and Playwright's first read of an assertion runs outside its own timeout (Codex, should-fix) | Accepted. Waits had now been found unbounded twice for one reason, so the repair bounds the whole approach as well as each call | `approach()` races its body against one deadline timed in the test's process, 60 s times the throttle, which covers its turns by drags too; the assertion runs with a 1.5 s times the throttle timeout inside `promptly`. Review 27 |

## Verification

At 4× on the repaired tree (`tmp/probe/fix4-4x.json`, ignored): the short walk and both artwork places passed, in 66.5 s.

## Round outcome

Not accept: F82 repaired by bounding the whole approach; review 27 checks it.
