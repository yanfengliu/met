# Review 30: implementation (focused check of review 29's repairs)

## Target

Repository `met`, branch `doorspawn`: the uncommitted working tree on `0f4a1e9` after the repairs of review 29's F94 and F95. The prompt carried only what changed since round 29's tree (git tree `88d6f5395842728a8437b64e728152d91f0a78bc`, `0f4a1e9` with round 29's patch applied), preserved as `fleet/tmp/review-runs/met-2-r30/incremental.patch` (ignored), sha256 `9927e2869b09242f5276cb2b241f7c2e9760f70e7151279e32abb11538627443`. The whole change on `0f4a1e9` is `fleet/tmp/review-runs/met-2-r30/full.patch` (ignored), sha256 `637a3babb27714f39c881d218ce70adbce3b9c7fc4c8b6087c12e671fa6d075f`. The incremental patch showed review 28's record as deleted, since the file was not yet tracked; the reviewer read the file itself.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `fleet/tmp/review-runs/met-2-r30/prompt.md` (ignored), from the worktree, 176 s. It cited `src/walk/walker.ts:271` and `src/walk/walk-mode.ts:209` and `:374`, outside the patch, which say what it reports. No failed sandbox command in its log. The tree's status, its diff and the two new records' digests were the same before and after.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

One low-severity documentation finding remains.

1. **Low — the verification summary overstates which tests reject pitch.** [29_implementation.md:47](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/work/2_doors-and-collection/reviews/29_implementation.md:47) says the toggle and door-look tests were “red under each placed plant.” The detailed [proof record:230](C:/Users/38909/Documents/github/met-worktrees/doorspawn/docs/learning/gate-proofs.md:230) reports only the toggle failing under pitch. Door-look’s [assertion:85](C:/Users/38909/Documents/github/met-worktrees/doorspawn/tests/e2e/door-look.spec.ts:85) still reads X alone; a small pitch-only turn preserves that alignment. This misleads readers about demonstrated coverage. **Fix:** state that yaw made both tests red, pitch made the toggle test red, and both were green without the plants.

Otherwise:

- **F94 is repaired.** The full facing guard rejects +Z, and the complete look comparison detects surviving yaw and pitch turns above its tolerance. The unchanged [walker.ts:271](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/walk/walker.ts:271), outside this patch, computes that direction directly in doubles. I found no concrete false failure from rounding, settling, eye easing or the facts’ frame timing at this stationary spawn.
- **The race account is correct.** [enter:209](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/walk/walk-mode.ts:209) requests lock before frame-driven placement; [placeAt:374](C:/Users/38909/Documents/github/met-worktrees/doorspawn/src/walk/walk-mode.ts:374) resets yaw and pitch. A planted turn before that placement can disappear before any walking view displays it.
- **F95 is repaired.** The current records no longer claim completed landing. Round 28’s file remains present and corrected; its apparent deletion in the supplied diff is an untracked-file artifact.
- Round 29’s embedded report matches its source, ignoring line endings. Finding IDs and paragraph formatting are consistent. No other regression found.

No files changed; no tests, builds, servers or browsers ran. Recorded execution results were not independently reproduced.

**Verdict: accept once the finding is repaired.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F96 | Review 29's record said the toggle and door-look tests went red under each placed plant; door-look's middle-door test, which reads X alone, ran under the yaw only (Codex 1, low) | Accepted | Review 29's record says the placed yaw turned both red, the placed pitch the toggle test, and that door-look did not run under the pitch. A wording fix as the report gives it, so no further round |

## Verification

The gates on the tree this round reviewed, through the gate lock (logs in the landing session's scratchpad, not kept); F96's repair after them changes review 29's record alone:

- `npm run verify`, 610 s: 732 unit tests in 81 files, typecheck, lint and build, and 125 e2e in 9.5 min. The seven door tests took 2.4 and 1.2 s (door-look) and 4.1, 1.3, 4.1, 2.0 and 11.6 s (doors.spec), 26.7 s in all; walk.spec's toggle test 1.5 s.
- routes.spec with walk.spec at 4×, three runs in a row: 21 passed and 2 skipped each, in 140, 145 and 137 s; the short walk 47.5, 49.4 and 46.5 s; the toggle test 1.6, 1.5 and 1.5 s.

## Round outcome

Accept once F96 is repaired, and it is. Every finding of rounds 28 to 30, F84 to F96, is closed: F84 to F91, F94, F95 and F96 repaired, and F92 and F93 noted with no change.
