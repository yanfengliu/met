# Review 5: implementation (focused check of review 4's repairs)

## Target

The met repository's branch `jointfix`: commit `af04654`, the diff `1d9eb63..af04654`, the repairs of review 4's F16 and F17 (`reviews/4_implementation.md`): `keeps` and `counted` in `src/walk/crossing-rule.ts`, `LineHit.normal` and `lineHit`'s call in `src/walk/collision.ts`, the tests in `src/walk/crossings.test.ts`, `src/walk/settle.test.ts` and the new `src/walk/crossing-rule.test.ts`, and the spec's walk section.

## Reviewers and coverage

- **Codex:** a focused check of review 4's repairs by the lane that found F16 and F17. codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt and the diff on stdin, the worktree at `af04654` as its working directory. It ran 258 s; the runbook's check of its log found no command that exited `STATUS_DLL_INIT_FAILED`. It ran the three focused test files' 41 tests, the mutations and an exhaustive matching oracle through a harness of its own in memory, and changed nothing. Its citation outside the diff holds: three-mesh-bvh's `ThreeRayIntersectUtilities.js:127` sets the face's normal from the triangle's own corners, keeping its orientation.
- **Claude:** not run (a focused check).

The worktree's `git status`, `git diff HEAD` and HEAD were the same before and after. Local file paths in the report are shortened to repository paths; nothing else is changed.

## Reports

### Codex (`gpt-6-astra`)

**Verdict: pass for this focused review of `af04654`. No new findings; F16 and F17 are repaired within the stated bounds.**

- **Plane test:** `src/walk/crossing-rule.ts:90` measures perpendicular distance in world metres using only normals belonging to the original crossing. A candidate’s steep normal cannot enlarge acceptance. The inverse-transpose normalization is correct, and `lineHit` copies the scratch normal. Outside the diff, I checked `node_modules/three-mesh-bvh/src/utils/ThreeRayIntersectUtilities.js:127`: `face.normal` comes from triangle geometry, retaining its orientation.

- **Matching and merging:** `src/walk/crossing-rule.ts:92` correctly reassigns occupied hits through augmenting paths. `tried` is shared within one search and reset for each new crossing; every crossing requires a distinct hit. `src/walk/crossing-rule.ts:112` retains the representative first and attaches doubtful hits to the first kept hit they met.

- **Bound:** The prism’s five-crossing fallback is explicit and pinned at `src/walk/crossings.test.ts:318`. Refusing an offset that loses an encountered face is a defensible trade for `src/walk/footing.ts:74`, which reads winding just above the original probe hit. It retains the acknowledged parity limitation: `src/walk/footing.ts:24` treats an odd reading as having no inside. This is bounded fallback behavior, not a general solution for grazing lines.

The 1 µm tolerance bounds perpendicular distance; near-vertical faces can still have substantially displaced crossing heights. Float32-rounded neighbouring triangles passed the numerical cases I exercised, but those checks do not establish a universal tolerance guarantee.

Checks performed, without writing files:

- TypeScript `--noEmit` and `git diff --check`: passed.
- All **41 tests** across the three focused test files: passed using an in-memory TypeScript/assertion harness, **not Vitest**.
- Claimed mutation proofs reproduced: greedy matching, first-face-only matching, and a 1 cm plane tolerance each failed the intended tests.
- Injecting `1d9eb63`’s collision/rule code reproduced both sliver failures.
- Matching agreed with an independent exhaustive oracle on **74,963 graphs** with up to four crossings and four hits.
- Additional transformed-normal, near-vertical and neighbouring-Float32-triangle probes passed.

Full `verify`, build and e2e were not run because their temporary/output writes are incompatible with this read-only sandbox. The supplied large placement, route and closure comparisons remain author-reported evidence. No files changed or persistent processes launched.

## Findings and disposition

No new findings. F16 and F17 are verified repaired within the rule's stated bounds. Codex's two caveats are bounds the rule already states: the 1 µm tolerance bounds the distance from a face's plane, so a near-vertical face's crossing can still read well off in height on the line read again; and where no line read again will do, the line's own reading stands, whose odd crossings parity reads as no inside, as before review 2.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F16 | Verified: only the original crossing's own faces' planes, by perpendicular distance in world metres, can keep it | Closed | None |
| F17 | Verified: the augmenting-path matching agrees with an exhaustive oracle on 74,963 graphs of up to four crossings and four hits, and the prism's fallback is explicit and pinned | Closed | None |

## Verification

No repair followed. The checked revision `af04654` passed `npm run verify` (732 unit tests in 81 files, typecheck, lint, build and 125 e2e tests) and the Load rule's three runs at 4× (21 passed each, 2 skipped, 134, 133 and 135 s).

## Round outcome

Codex passed the repairs with no new finding. No material finding remains open from reviews 2 to 5.
