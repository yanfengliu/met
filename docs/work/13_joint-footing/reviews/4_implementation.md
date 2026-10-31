# Review 4: implementation (focused check of review 3's repairs)

## Target

The met repository's branch `jointfix`: commit `1d9eb63`, the diff `f6fa16a..1d9eb63`, the repairs of review 3's F10 to F14 (`reviews/3_implementation.md`): `keeps` in `src/walk/crossing-rule.ts`, `insideApart` and `facesAlong` in `src/model/closure-readings.ts`, the branch test's slack in `src/walk/walker.ts`, the bounds restated, and their tests.

## Reviewers and coverage

- **Codex:** a focused check of review 3's repairs by the lane that found F10 and F11, since the repairs changed logic review 3 had not read (fleet canon R10). codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, the worktree at `1d9eb63` as its working directory. It ran 579 s; the runbook's check of its log found no command that exited `STATUS_DLL_INIT_FAILED`. It ran test bodies, mutations and both counterexamples below through a harness of its own in memory and changed nothing. Its citation outside the diff holds: `src/walk/footing.ts:75` is `under`'s height 1 mm over a probe's hit.
- **Claude:** not run (a focused check).

The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in the report are shortened to repository paths; nothing else is changed. The lane named its findings F15 and F16; F15 was review 3's records nit, so they are F16 and F17 here.

## Reports

### Codex (`gpt-6-astra`)

**Verdict: request changes.** F10 remains incomplete. I found one major and one minor defect in `keeps`.

1. **F15 — major: an unrelated sloped face can replace a lost crossing.** `src/walk/crossing-rule.ts:88`

   Add a third closed part to F10’s two-box geometry, defined by `x = 0.5 + u`, `y = v + 100u`, `z = w`, with `u ∈ [0.000001, 0.01]`, `v ∈ [0.25, 0.375]`, and `w ∈ [-1, 1]`.

   At `(0.5, 0)`, the original line meets only the original boxes, at heights `[0.25, 0.375]`. The first offset leaves both boxes and meets only the new part, at `[0.2515986623, 0.3765986623]`. `keeps` accepts these because the **new part’s** slope supplies the allowance, despite both original faces being horizontal.

   With F10’s floor and opposite probe block, I reproduced `place` standing at **0.25 m** and the rebuild’s `settle(1)` returning **`'moved'` to 0.25 m**. The unchanged consumer, `src/walk/footing.ts:75`, samples 1 mm above the original underside; the substituted bottom is higher, so it incorrectly accepts that underside.

   **Suggested repair:** preserve geometric correspondence to the original hit faces. An unrelated candidate’s slope must not establish that correspondence. Add this crossing and walker regression.

2. **F16 — minor: greedy matching rejects a candidate with a complete valid matching.** `src/walk/crossing-rule.ts:88`

   I reproduced this with two boxes `[-2,-0.5,-2]→[2,0.5,2]` and `[-1,-0.5,-1]→[3,1.5,3]`, plus a closed prism extruded along X from −2 to 2. Its ordered `(Y,Z)` section is `[(-1,0),(-1,1),(1,1),(1,0.00001),(0,0)]`.

   At `(0,0)`, the original upward crossings are `[0, 0.5, 1.5]`, with normal Ys approximately `[0.00001, 1, 1]`. The first offset’s upward crossings are `[0.5, 1, 1.5]`, all horizontal. Greedy matching assigns `0 → 0.5`, leaving the original `0.5` unmatched. But `0 → 1`, `0.5 → 0.5`, `1.5 → 1.5` satisfies every stated matching condition.

   Both first offsets are rejected this way; the third leaves the prism. The result falls back to **five crossings**, so the closed piece reads open. Replacing only the greedy assignment with complete matching in memory accepts the first offset’s six crossings.

   **Suggested repair:** use complete matching over geometrically justified candidate pairs, with a regression for competing matches.

No further findings in F11–F14. F12 changes a **1 µm band**, rather than only mathematical equality; the five floor cases, F9 decks and 0.36 m refusal passed. `insideApart` handles ordering, equal-height cuts and the facing convention correctly for the gate’s balanced readings.

I ran:

- Nine focused test bodies through an in-memory TypeScript loader and assertion harness: all passed.
- Mutations making `keeps` always true, always false, removing slope allowance, and removing branch slack: each failed the relevant tests.
- Both geometric counterexamples above.
- 10,000 balanced interval comparisons against an independent union/intersection calculation.
- Instance 7572’s planted facings: disagreement **0.8000001013 m**, versus **0** for current facings.
- `tsc --noEmit`: passed.

I did not run Vitest, full `verify`, browser tests or the author’s large scans and route comparisons; their normal execution requires writes unavailable in this sandbox. Those reported results remain unverified here. The worktree is unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F16 | `keeps` matched a crossing to a hit of the line read again within the slope of either face over the offset, so a steep face near the line that the line itself does not meet could keep a crossing it does not lie on: with a sliver sloped 100 in 1 from 1 µm past the outline of F10's boxes, the first line read off met the sliver alone and took its faces 1.6 mm over the boxes' for theirs, and the walker stood on the boxes' bottoms again, set down or settled (Codex "F15", major) | Accepted: reproduced at `1d9eb63` | A crossing is kept only by a hit of the line read again that faces its way and lies within 1 µm of the plane of one of the faces merged into it (`keeps`, `src/walk/crossing-rule.ts`): the faces' own geometry, not a slope's allowance. Tests: F10's boxes with the sliver, their crossings (`src/walk/crossings.test.ts`) and the walker set down and settled (`src/walk/settle.test.ts`), red at `1d9eb63`; red too with a plane 1 cm wide |
| F17 | `keeps` matched greedily, the first fitting hit to each crossing in turn, so it could refuse a line read again for which a whole match exists (Codex "F16", minor) | Accepted: a whole match is now found by augmenting paths | `keeps` finds a complete matching. Tests on hits made by hand (the new `src/walk/crossing-rule.test.ts`): a first pick that would leave a crossing with none, red with the first pick kept; and a crossing merged from two faces kept by a hit on the plane of either, red with only the kept face's plane. Codex's prism, its corner on the line and one face nearly upright from it, has no whole match under F16's planes, since the line grazes a face the line read again leaves: it keeps its own five crossings, as before review 2, a pin of the rule's bound (`src/walk/crossings.test.ts`) |

## Verification

The repairs are commit `af04654` (`1d9eb63..af04654`).

- Red proofs: the sliver's two tests fail at `1d9eb63`, the sliver read for the boxes, `[0.2516, 0.3766]`, and the walker moved onto their bottoms 0.25 m up; they pass at `c2a9bcc`, which merged the boxes' hits. With a plane 1 cm wide they fail again, and the prism's pin with them. The matching's tests fail with the first pick kept and with only the kept face's plane. Review 3's red proofs hold: the slack's, the outline's and the facings'.
- Every other result kept: on the scan's 486,052 places `place` and `settle(0)` still match `c2a9bcc`'s code to 1e-9 m, the 237 fixed places stand where they stood, and the 175,217 walking frames of routes R1 to R7 are the same byte for byte.
- Gates: `npm run verify` passed on `af04654`'s tree: 732 unit tests in 81 files, typecheck, lint, build and 125 e2e tests, 10.1 min. So did the Load rule's three runs of `routes.spec` and `walk.spec` at 4×, in a row: 21 passed each, 2 skipped, 134, 133 and 135 s.
- Review 5, a focused Codex check of these repairs (`5_implementation.md`), found nothing new.

## Round outcome

Codex requested changes: one major finding, F16, and one minor, F17. Both were accepted and repaired in `af04654`, each with a test red without its repair; F17's prism became a pin of the rule's bound. Two rounds running, review 3 and review 4, found the second reading's acceptance at fault (F10, then F16 and F17), so the rule was reassessed (fleet canon R11): a line read again now replaces the line's own reading only where every crossing of it is kept by a face's own plane, and falls back to the reading of before review 2 everywhere else. The repairs changed `keeps` again, so review 5 followed.
