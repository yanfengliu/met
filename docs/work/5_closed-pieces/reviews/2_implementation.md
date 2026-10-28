# Review 2: implementation

## Target

The repairs for round 1 (`reviews/1_implementation.md`, F7 to F10), staged on top of `795956f` and not yet committed. The repairs alone are the diff from round 1's tree `1a6f36328494dbc87652120ae1788b1013677e1d` to this round's tree `811db4a385c59089c93f7aa38c5a2d01a36e3e74`: 7 files, preserved under the ignored `tmp/review-runs/w5-r2/repairs.diff` (sha256 `3b2491de1696c22077956cde3602a3ccbe43982785f1ec0ef208d7fa9b5948bd`). The whole change is `tmp/review-runs/w5-r2/target.diff` (sha256 `b60367d3b65473796ce83e248368cae1b934aefb7690ffe755bc0e6e9170e47b`). In code: `src/model/core/arches.ts` (a 1e-6 m tolerance in the overlap check, so doors that touch with edges rounded apart are taken) and `src/model/core/core.test.ts` (two such pairs, and a 1 mm overlap still refused). In docs: round 0's labelled correction, two sentences split, and the plan's path whole in the gate's header.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt: whether F7 to F10 are resolved as their dispositions say; whether the tolerance lets an overlap through that breaks the bottom or the front face, given the millimetre cache key; whether the test proves its name; docs and repo rules. The repairs came on stdin. Raw captures stay under the ignored `tmp/review-runs/w5-r2/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran 13 existing test callbacks through an in-memory loader, the tolerance taken out, probes of the faces' areas, rays through the doorways, overlap thresholds and cache order, a typecheck and ESLint.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest on four test files (28 tests), tsc, ESLint, `git diff --cached --check`, probes sampling the front, back and bottom faces of 16 door layouts point by point, a real walker at each doorway, 1,600 door pairs and the cache order, and left the worktree unchanged.

## Reports

Each report is as its reviewer wrote it.

### Codex (`gpt-6-astra`)

Verdict: **One minor defect remains. F7 is incomplete; F8–F10 are resolved.**

1. **Minor — the tolerance admits door outlines that corrupt the front face.** `src/model/core/arches.ts:127` accepts rounded overlaps, but `:139–141` passes the unchanged, overlapping outlines to triangulation. The new fixture at `src/model/core/core.test.ts:111` reproduces this: a `20 × 5 × 1` wall with 3 m-high doors at x=0 and x=2.3, widths 2.2 and 2.4, has a front-face triangle across the first doorway. A ray from `(0.03, 1.2, 1)` toward −Z hits `(0.03, 1.2, 0)` where the opening should be clear. Front-face area is approximately **92.8 m² instead of 86.2 m²**.

   The millimetre cache does not prevent this: it rounds the key, not the geometry (`src/model/core/shapes.ts:15–24`). Two 2 m-wide doors at x=0 and x=1.9999995 produce faulty geometry; a subsequent exactly-touching x=2 call reuses it. Reversing those calls produces clear openings.

   The assertion at `src/model/core/core.test.ts:114` passes these faulty walls because vertical closure cannot establish that their vertical front faces preserve the openings. **Fix:** normalize accepted near-touching boundaries consistently before triangulation and bottom construction. Add rays through both doorways, a tiny-overlap fixture, and both cache insertion orders.

Disposition:

- **F7: Partially resolved.** Both decimal pairs are accepted, the error wording is corrected, and 1 mm overlap throws. Valid doorway geometry remains unresolved.
- **F8: Resolved.** The labelled correction accurately fixes the tally and attribution (`reviews/0_implementation.md:163`).
- **F9: Resolved.** The identified sentences are split (`plan.md:22,26`; `docs/design/spec.md:132`).
- **F10: Resolved.** The complete path appears on one line (`src/model/closure.test.ts:14`).

Checks run:

- **13 existing test callbacks passed**, using Vitest assertions through an in-memory loader—not the Vitest runner: core, closure, and repository conventions.
- Removing the tolerance in memory made the touching test fail as expected.
- Front/bottom area, ray-intersection, overlap-threshold, and cache-order probes reproduced the finding.
- Typecheck, ESLint on the three repaired TypeScript files, staged whitespace, and line limits passed.
- Changed prose checked for sentence splits and hard wrapping.
- Full verify, build, browser rendering, and e2e were not run.
- No files changed. Index still matches `811db4a385c59089c93f7aa38c5a2d01a36e3e74`; no unstaged changes.

Outside-diff reads:

- `src/model/core/shapes.ts:1–83`
- `src/model/lib/builder.ts:1–130,202–300`
- `src/walk/collision.ts:251–390,401–480`
- `src/model/core/medieval-hall.ts:85–110,146–215`
- `src/repo-conventions.test.ts:1–182`
- `docs/policies/local-rules.md:1–7`; `docs/learning/lessons.md:1–13`
- `package.json:1–41`; `vitest.config.ts:1–9`; `tsconfig.json:1–19`

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** F8, F9 and F10 are resolved, but F7's repair is wrong. The doors it now accepts are built with a doorway sealed by the wall's front or back face, and the new test passes on exactly those walls.

##### Findings

**1. Major: `src/model/core/arches.ts:127` lets crossing door outlines reach the front and back faces (`:141`, `:144`), and the triangulation drops a hole.**
- **What is wrong:** with the 1e-6 m tolerance, outlines that cross by up to 1 µm go to `b.planar`. That includes the 1-ulp crossings F7 is about. `b.planar` hands them to earcut (`THREE.ShapeUtils.triangulateShape`, `src/model/lib/builder.ts:98`), and earcut drops one of the two holes.
  - The bottom face is right in every case, because `bottom()` skips the empty stretch.
  - Doors that touch exactly, or stand apart, build correctly.
  - Before this repair, these inputs threw an error. Now they build without one.
- **Failure scenario:** the test's own pair 2, `openWall({ width: 20, height: 5, thickness: 1, holes: [{ x: 0, width: 2.2, height: 3 }, { x: 2.3, width: 2.4, height: 3 }] })`.
  - It builds without an error, and `openAlong` returns null.
  - The front face's triangles run from x −10 to 1.1, so they cover all of door 0's opening. The back face covers all of door 1's.
  - I walked a real `Walker`, over a `CollisionWorld` of this wall and a floor, at each doorway. It stopped at z 0.350 at door 0, the front face plus its radius. It stopped at z −0.650 at door 1, the back face plus its radius.
  - Pair 3 seals door 1 on both faces.
  - Overlaps of 0.9 µm seal a doorway too: with equal heights, with heights of 3 and 2 m, with round heads, and with a pointed head beside a square one.
  - I built 1,600 pairs at x2 = x1 + width. The old check refused 160 of them. The repair takes all 160, and every one has a sealed doorway. The 1,440 that the old check also took are all open.
  - The test at `core.test.ts:114` reads only `openAlong`, which looks along vertical lines. The front and back faces are vertical, so it cannot see them. Round 1 rested on the claim "only the check is too strict", and both reviewers checked only closure.
  - The model is not affected today. Its 14 `openWall` geometries hold at most one door each: 13 have none and the arcade panel has one.
- **Suggested fix:** keep crossing outlines out of the triangulation.
  - The simplest way is to refuse doors less than a set gap apart, touching doors included. No caller has two doors.
  - Doors that touch exactly also leave a zero-thickness fin between the openings: a line across pair 1's doorways meets two jamb faces back to back at x 0.
  - If touching doors are wanted, give each touching pair one shared edge value in both outlines, for every head shape, or merge them into one outline.
  - Either way, test the front and back faces. For example, no triangle may meet the line along z through each doorway's middle; pairs 2 and 3 fail that now.
  - Then update `arches.ts:123`, the error text at `:128`, `plan.md:22` and `AGENTS.md:107`. The text "let them at most touch" points callers at x2 = x1 + width, which crossed in 10% of my pairs.

**2. Nit: `src/model/core/arches.ts:111-112` runs the checks at `:116-130` inside `memo`, whose key rounds every number to the millimetre (`shapes.ts:22-24`).**
- **What is wrong:** a call whose key is already cached is never checked. This dates from round 0's F2 check. Round 1 raised it in passing, and F7's disposition does not take it up.
- **Failure scenario:** on a 31 × 5 × 1 wall, I built doors at x 0 and x 2 (2 m wide, touching) first. I then asked for doors at x 0.0004 and x 1.9996 (2.0004 m wide), which share the key and overlap by 1.2 mm. There was no error, and the touching wall came back. The same overlap asked for first, on a fresh key, throws.
  - So "a 1 mm overlap is still refused" holds only for a key's first call. Overlaps under about 3 mm are taken or refused depending on call order.
  - On its own, this breaks no face, because only checked inputs are ever built. With finding 1, though, a sealed wall cached first is served to every later call with its key.
- **Suggested fix:** run the checks in `openWall` before `memo`.

##### F7 to F10

- **F7: not resolved.** Each listed step is in place: the tolerance, the message, both pairs, red without the tolerance (both pairs fail the old comparison), and the 1 mm overlap refused. But the walls it now takes have sealed doorways (finding 1).
- **F8: resolved.** The correction at `0_implementation.md:163` is labelled and keeps the sentence it corrects, as `../fleet/docs/work-docs.md` requires. Its tally matches the table at `:147-149` and the reports.
- **F9: resolved.** `plan.md:22` and `:26` and `spec.md:132` are split.
- **F10: resolved.** `closure.test.ts:14` holds the path whole, and a search finds it there.

##### Checks run

- **Target:** the index is tree `811db4a`, with nothing unstaged or untracked. The repairs touch 7 files.
- **Tests:** Vitest on `check.test.ts`, `core.test.ts`, `hunt.test.ts` and `closure.test.ts`, with its cache in my scratchpad: 28 pass. The touching-doors test is among them, green on the sealed walls.
- **Static checks:**
  - `tsc --noEmit`: clean.
  - ESLint `--max-warnings 0` on `arches.ts`, `core.test.ts` and `closure.test.ts`: clean.
  - `git diff --cached --check 795956f`: clean.
  - Line counts: 326, 128 and 146.
- **Probes**, run through Vitest with the repo as root:
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\97a69c69-46a3-429f-b2e2-b4d9c35087aa\scratchpad\probe\faces.probe.ts`: 16 door layouts, with the front, back and bottom faces sampled point by point.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\97a69c69-46a3-429f-b2e2-b4d9c35087aa\scratchpad\probe\walk.probe.ts`: how much of each doorway the faces cover, and the walker at each doorway.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\97a69c69-46a3-429f-b2e2-b4d9c35087aa\scratchpad\probe\sweep.probe.ts`: the 1,600 pairs, and a count of the doors in the model's `openWall` geometries.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\97a69c69-46a3-429f-b2e2-b4d9c35087aa\scratchpad\probe\order.probe.ts`: call order against the memo.
- **Not run:** the full `npm test`, the build and e2e.

##### Read outside the diff

- `src/model/core/arches.ts:1-326`, `src/model/core/shapes.ts:1-84`
- `src/model/lib/builder.ts:1-130`, `src/model/lib/check.ts:1-394`
- `src/model/core/core.test.ts:1-128`, `src/model/closure.test.ts:1-146`
- `src/walk/walker.test.ts:1-130`, `src/walk/walker.ts:124-162`, `src/walk/collision.ts` (its exports)
- `node_modules/three/src/extras/ShapeUtils.js:40-109`
- The `openWall` callers, by grep: `medieval-hall.ts:97,151,159,207`, `vaux-front.ts:43`, `vaux-shell.ts:82,115,232,233`, `weston-facade.ts:64,76`, `wings-walls.ts:83`
- `docs/work/5_closed-pieces/plan.md:1-59`, `reviews/0_implementation.md:1-164`, `reviews/1_implementation.md:1-165`
- `../fleet/docs/work-docs.md:1-162`
- `package.json`, `vitest.config.ts`

I left the worktree unchanged.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F7 | Round 1's finding | Both reviewers find the steps of its repair in place, but not the defect resolved: see F11 | Superseded by F11's repair |
| F8 to F10 | Round 1's nits | Both reviewers find them resolved | None |
| F11 | The 1e-6 m tolerance takes doors whose outlines cross by up to 1 µm, and the front and back faces' triangulation then drops a hole: the test's own pair at x 0 and 2.3 builds with its front face across door 0's opening and its back face across door 1's, and a walker stops at each; doors that touch exactly build open but leave a fin of no thickness between them; the test read only vertical lines, which cannot see those faces (Codex 1, minor; Claude 1, major) | Accepted, as major: the rule F7 wrote builds walls with sealed doorways, though no wall of the model has two doors | Doors must stand at least 1 mm apart; touching and overlapping doors are refused with an error giving the gap or the overlap; the test reads a line along Z through each doorway's middle, which must cross no face, for pairs 1 mm and 1 cm apart and an arched pair; red with round 1's rule (touching doors taken) and, with no check, on a crossing pair (a face across its doorway) |
| F12 | `openWall`'s checks ran inside the cache, whose key rounds to the millimetre, so a call sharing a cached key went unchecked and the result depended on call order (Claude 2, nit) | Accepted | `checkHoles` runs in `openWall` before the cache, on every call; a test asks a wall with doors 1.2 mm apart, then one 0.6 mm apart with the same key, and the second must throw; red with the check back inside the cache |

## Verification

After the repairs: `src/model/core/core.test.ts` passes, 7 tests. Each repair was put back to red: round 1's rule (the refusals fail), no check with the crossing pairs among the taken ones (a face across the doorway at x 0), and the check inside the cache (the second call does not throw). Review 3 checks F11 and F12.

## Round outcome

One major finding, F11, which both reviewers found: F7's repair let doors that touch or cross through, and their faces seal a doorway. One nit, F12. Both are accepted and repaired; F8 to F10 are resolved. Review 3 checks the door rule.
