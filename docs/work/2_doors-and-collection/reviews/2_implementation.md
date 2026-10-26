# Review 2: implementation

## Target

Repository `met`, branch `collection`: `37013e0..b6bc47b` (11 files, +238/−58), the repair of review 1's F12–F16, given to the reviewer as a diff on stdin with the snapshot worktree moved to `b6bc47b`.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-m3a-r.md` (ignored). By its own account it ran 42 focused test bodies in memory, restored each old function to see its test fail, mutated the placements (a 10 cm lift, a 30 cm shift into a wall), compared the regenerated catalogue field by field and probed the fetcher; it did not run `verify` or render on a GPU.
- Coordinator: the standard shot set at `b6bc47b` against `37013e0`: only gallery 600 (6,175 px, the paintings now blurred), the Lehman galleries (557 px) and the Petrie court (165 px, the corrected sizes) changed. Gallery 600 inspected at native resolution.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **Repairs**

- **R1 — Verified.** Superseded elements are excluded before selection and axis supplementation; confirmed elements receive the documented preference. The regression test fails when the old selector is restored. [Implementation](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-rules.ts:111), [test](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue.test.ts:102).
- **R2 — Verified.** Text fills missing axes without replacing measured values or their provenance. The mixed-source test fails with the old `sizeOf` restored. [Implementation](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-rules.ts:195), [test](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue.test.ts:124).
- **R3 — Verified.** Checks now bind to drawn matrices and compare the base with the actual floor. **Both requested mutations turn them red:** lifting every artwork matrix 10 cm, and shifting artwork 231004 30 cm into its wall. Restoring the old placement tests leaves **all seven green under either mutation**. [Instance binding](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/placement.test.ts:117), [placement correspondence](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/placement.test.ts:228), [floor check](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/placement.test.ts:265).
- **R4 — Partly fixed.** Seconds and the three tested date forms work; restoring the old fetcher calculation fails the regression test. However, `Date.parse` uses a fixed two-digit-year cutoff: at `2026-10-25T12:00Z`, `Tuesday, 25-Oct-50 13:00:00 GMT` incorrectly yields “retry now”, whereas its four-digit equivalent yields 2050. Parse RFC 850 years using HTTP’s rolling 50-year rule. [Implementation](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-run.ts:53), [test](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue.test.ts:245), [RFC 9110 §5.6.7](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7).

2. **Catalogue**

Beyond the five Petrie sizes, only their `element` labels and the generation date changed. All other entry fields are unchanged. [Generation date](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/catalogue.ts:8), [Petrie entries](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/catalogue.ts:56).

All **94 record hashes and 89 image hashes** match the collection worktree’s cache. Fetch dates, metadata dates, source URLs, derived non-colour fields and image dimensions also match. [Provenance fields](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-rules.ts:453).

3. **Linear filtering**

**No cross-painting or frame bleed.** Both sampling coordinates clamp to `0..7` before adding the painting’s row offset; interpolation uses four explicit texel reads. Frame bars use a separate gilt material. CPU sentinel probes confirmed the addressing; GPU rendering was not exercised. [Sampling](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/material.ts:118), [frame material assignment](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/src/model/collection/place.ts:119).

**One new regression:** an overflowing numeric `Retry-After` bypasses the stop-on-block behavior. With HTTP 429 and `'9'.repeat(309)`, the new calculation produces an invalid date; `toISOString()` throws before `BlockedError` is constructed, so the catalogue loop continues. My 40-pick probe made **40 requests at `b6bc47b`, versus one at `37013e0`**. Validate the resulting timestamp, fall back on overflow, and preserve `BlockedError` for every 403/429. [Calculation](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-run.ts:52), [throw site](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-run.ts:103), [catch behavior](/C:/Users/38909/Documents/github/met-worktrees/review-m3a/scripts/met-catalogue-run.ts:183).

No other new defects found. All 42 focused test bodies passed through the in-memory harness; TypeScript checking passed. Full `verify` was not run. No files changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F12 | Verified | Closed | None |
| F13 | Verified | Closed | None |
| F14 | Verified: both mutations turn the checks red, the old checks stay green under either | Closed | None |
| F15 | Partly fixed: an RFC 850 date's two-digit year went through `Date.parse`'s fixed cutoff | Accepted | `7c370b1`: HTTP's rolling 50-year rule, tested red against the old code |
| F17 | New: an overflowing numeric `Retry-After` threw before `BlockedError`, so the run went on (40 requests against 1) | Accepted: stopping on a block is what keeps the script polite to The Met's API | `7c370b1`: every 403 and 429 ends in `BlockedError` after one request whatever the header holds; an invalid time takes the 10-minute wait; tested red against the old code |
| None | Linear filtering bleeds nothing across a frame or between paintings | Closed | None |

## Verification

The coordinator read `b6bc47b..7c370b1` (the script and its tests only) and ran, at `7c370b1`: 443 unit tests in 47 files, typecheck, lint, build, and the network, smoke and controls e2e (16 passed, the 4 s build budget among them); the worker's full `verify` at `b6bc47b` gave 441 unit tests and 63 e2e. Main was fast-forwarded to `7c370b1` and `pages.yml` run 40400737621 deployed it. Live: 27,014 pieces and 729 meshes, no console error, every request to the site's own host, ready 3.6 s cold over the network.

## Round outcome

F12–F14 verified; F15 and the new F17 fixed in `7c370b1` and checked by the coordinator without another review round, as the change is confined to the hand-run script and its tests. M3a is merged.
