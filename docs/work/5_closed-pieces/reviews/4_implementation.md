# Review 4: implementation

## Target

The repairs for round 3 (`reviews/3_implementation.md`, F15 to F19), staged on top of `795956f` and not yet committed. The repairs alone are the diff from round 3's tree `42210dd4f1ebfebd4a4210b63d602c9b6e11a376` to this round's tree `ab3b2407bd8e8a53d71997c81d7ea50b1182e174`: 5 files, preserved under the ignored `tmp/review-runs/w5-r4/repairs.diff` (sha256 `d2c582e11c5deea538f54a725fe653d51958ddc2c8ed0f533e5fe4a22e0d9d9b`). The whole change is `tmp/review-runs/w5-r4/target.diff` (sha256 `03fb94b90e5d876360a6d9e7378fb0ed02f25ee19116a3eedce1b34a553a422f`). In code: `src/model/core/arches.ts` (the overlap and the gap in the error, the cache key's depth) and `src/model/core/core.test.ts` (the faces' areas, nine lines an opening counted by depth, a control, five refusals, both cache orders). In docs: AGENTS.md, the plan and round 3's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt: whether F15 to F19 are resolved; whether the doorway test can pass a wall whose faces cover part of an opening; whether the key change alters any wall of the model; the messages; docs and repo rules. The repairs came on stdin. Raw captures stay under the ignored `tmp/review-runs/w5-r4/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran 45 existing test callbacks through an in-memory loader, compared the model's 37 `openWall` calls and their geometry byte for byte, placed the fixture's 72 lines, reproduced each earlier failure, built a thin face across a doorway and walked a walker into it, and ran a typecheck, ESLint and `git diff --cached --check`.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest on four test files (33 tests) and the whole unit suite (620 tests), tsc, ESLint and `git diff --cached --check`, measured the area check's rounding on 20,000 accepted walls, built thin faces, 6,000 touching, crossing and near pairs and every `openWall` call of the sequence, and left the worktree unchanged.

## Reports

Each report is as its reviewer wrote it, but for Codex's link, whose absolute target is shortened to the repository path, and the two spaces of Markdown line breaks, which are dropped.

### Codex (`gpt-6-astra`)

Verdict: **One minor regression-test gap remains in F15. No blocker or major defect found.**

1. **Minor — the clearance gate can accept a face that stops the walker.** `src/model/core/core.test.ts:154` permits an area error of `1e-4 m²`; the rays at lines 157–159 miss narrow strips between their sampled X coordinates.

   **Reproduction:** append a front-facing rectangle at `z = 0`, `x = −1.00051..−1.00049`, `y = 0..3` to the first fixture. Its area is `6e-5 m²`. `doorways()` returns `[]`, and `openAlong(wall, up)` returns `null`, although the doorway’s center ray meets the face. Through the real collision path, three seconds walking from `(−1.0005, 0, 2)` ends at `z = 0.35`; the clear control reaches `z = −3.86817`.

   **Fix:** add this thin-strip negative control and check triangle intrusion into each opening, using positional tolerance near its boundary rather than aggregate area alone. This is a gate weakness; the current model’s walls showed no such obstruction.

F15–F19 dispositions:

- **F15: partially resolved.** The original sealed-doorway and crossing-pair failures are detected. Finding 1 remains.
- **F16: resolved as the agreed documented bound**, not a runtime repair (`arches.ts:124–125`; `plan.md:22`).
- **F17: resolved.** Overlap calculation and messages handle containment, touching, tiny overlaps and rejected gaps below 1 mm (`arches.ts:139–145`).
- **F18: resolved.** Both comment and plan now say “can seal” (`arches.ts:124`; `plan.md:22`).
- **F19: resolved.** Depth classification matches the builder; both cache orders pass and fail with the old key (`arches.ts:113–114,160–161`; `core.test.ts:203–208`).

Checks run:

- **45 existing test callbacks passed** across core, hunt, check, settle, closure and repository conventions, using Vitest assertions through an in-memory loader—not the Vitest runner.
- TypeScript and targeted ESLint passed. Changed TypeScript files contain 347 and 221 lines.
- Model comparison: **37 calls, 14 keys before and after; identical returned geometry bytes**.
- All 72 fixture rays lie strictly inside their openings. Maximum fixture area roundoff was approximately `2.18e-7 m²`.
- Reproduced the earlier crossing failure, triangle-edge counting, both old-key failures, revised messages and finding 1.
- `git diff --cached --check 795956f` **failed** on the two-space Markdown line break in the pasted report at `docs/work/5_closed-pieces/reviews/3_implementation.md:28`.
- Full verify, build, rendering and e2e were not run. No files changed; index still matches `ab3b2407`, with no unstaged or untracked changes.

Outside-diff reads included:

- `src/model/core/shapes.ts:1–83`
- `src/model/lib/builder.ts:1–130,225–300`
- `src/model/core/medieval-hall.ts:85–100,149–170,203–212`
- `src/build/sequence.ts:1–29`
- `src/walk/walker.test.ts:1–105`
- `src/walk/walker.ts:102–145,230–249`
- `src/repo-conventions.test.ts:1–36,128–182`
- `docs/policies/local-rules.md:1–7`; `docs/learning/lessons.md:1–13`
- `package.json:1–41`; `vitest.config.ts:1–9`; `tsconfig.json:1–19`

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** F15 to F19 are resolved as their dispositions say, and there is no blocker or major finding. One minor finding remains: the area check's tolerance is loose and the bound it sets is not written down. There are also three nits.

###### Findings

**1. Minor: `src/model/core/core.test.ts:154`, with `:157-158` and the comment at `:142-146`. The area check allows 1 cm² of error, and above each top row of lines it is the only check.**
- **What is wrong:**
  - The tolerance is 1e-4 m² (1 cm²). The tested walls need at most 2.2e-7 m², and 20,000 random walls that `openWall` accepts need at most 1.0e-6 m².
  - The nine lines reach no higher than 0.76 of each opening's height. That is 0.28 m into the round heads' 1 m arches, 0.89 m into the pointed head's 1.73 m, and not into the segmental niche's arch at all (top row at y 1.98, springing at 2.27).
  - So a face under 1 cm² that misses the nine points passes `doorways()`.
- **Failure scenario:** I copied the helpers verbatim from `:112-166` and used the first tested pair:
  - A strip 49 µm tall across the whole doorway at y 1 m, in the front plane (9.8e-5 m²): `doorways()` returns `[]`.
  - A post 33 µm wide over the doorway's full height, in the back plane: `[]`.
  - A 0.99 cm² triangle in the round door's crown: `[]`.
  - At 51 µm the strip is found ("covers 88.0001 m², not 88.0000").
  - The walk's collision would meet every one of these faces.
  - Earcut's real failures are much larger. Of 6,000 random touching, crossing and near pairs built with the check removed, 2,281 had an opening covered, and `doorways()` found every one. So the bound needs tightening and naming, but no real defect gets through it today.
- **Fix:** set the tolerance to 1e-5 m², which is 10 times the worst error measured. Say in `doorways()`'s comment what it cannot see: faces smaller than that, away from the nine lines.

**2. Nit: `src/model/core/core.test.ts:180-185` (and the F15 row, `reviews/3_implementation.md:153`). The control does not test the edge rule that F15 added.**
- **What is wrong:** the control's diagonal runs through the doorway's middle, but no line samples the middle any more. The nearest of the nine points is 2 cm off the diagonal.
- **Failure scenario:** I put `across` back to round 3's strict rule (`u > 0 && v > 0 && u + v < 1`). Every case still passes:
  - the four pairs give `[]`;
  - the control finds 10 problems, which is more than 9;
  - F19's four walls give `[]`.
- **Why it matters:** losing the edge rule turns nothing red, yet F15's original miss was a face whose edge ran through the sampled point.
- **Fix:** add a direct check that goes red under the strict rule. For example, on a face `(0,0,0) (2,0,0) (2,2,0) (0,2,0)`, `across(face, 1, 1)` must be 1; its fan diagonal passes through (1, 1) exactly. Also correct the control's comment.

**3. Nit: `AGENTS.md:107` and `reviews/3_implementation.md:153` say "the front face 92.8 m² where 86.2 m² is open".**
- 86.2 m² is the area the face should cover: the 20 × 5 m wall less its 6.6 and 7.2 m² openings. The open area is 13.8 m².
- The test's own message reads "covers 92.8000 m², not 86.2000", which I reproduced.
- **Fix:** "the front face 92.8 m² where it should cover 86.2 m²".

**4. Nit: `docs/work/5_closed-pieces/plan.md:22`. The F16 sentence ("where two holes off the base touch, the faces can seal part of one too") names only window against window.**
- F16's own case was a fanlight resting on a door's head, which is a window against a door.
- A round window on the base is not a door to `doorsOf` (`arches.ts:119-120`), so it is not checked either. A round window at x 1.5, 1 m across, touching a 2 m door at x 0, is accepted.
- The new sentences also join two ideas each.
- **Fix:** "Windows are not checked against each other or the doors. Where a window touches a door or another window, the faces can seal part of one too (F16). No caller has holes that touch: the nearest two on one wall stand 0.147 m apart. That check is left out of this unit."

###### F15 to F19
- **F15: resolved.**
  - The area check and the nine lines found all 2,281 covered walls in the random study, Codex's face from round 3 (10 problems) and Claude's crossing pair from round 3 (back face 91.5837 m² where 89.4157 is right, plus 4 lines).
  - With the check removed and the crossing pair among the doors that pass, the test fails as recorded: front 92.8 for 86.2, back 93.4 for 86.2, and 18 lines.
  - Its limits are findings 1 and 2.
- **F16: resolved as a bound.** `checkHoles`'s comment (`arches.ts:124-125`) and the plan both say windows are not checked. No caller's holes touch. The plan's wording is too narrow (finding 4).
- **F17: resolved.**
  - A door inside another reads "overlap by 1000 mm" in either order, and two identical doors read 2000 mm.
  - A gap of 0.9999989 mm reads "0.999999 mm".
  - A 1e-12 m crossing and a 0.4 nm gap read "touch"; a 0.6 nm gap reads "0.000001 mm".
  - The gap is computed as before (q0 − p1), so which walls are accepted did not change.
  - Every message names what happened, which doors, and what would satisfy the rule (R26).
- **F18: resolved.** Both the comment and the plan say "can seal".
- **F19: resolved.**
  - The test fails with the old key in both orders: the second call finds 10 problems.
  - I recorded every `openWall` call of the real sequence: 37 calls, 14 keys before and after.
  - The key text is unchanged for all 37 calls, and no hole is as deep as its wall (niche depths are 0.12 to 0.25 m).

###### Checks run
- **Target:** the staged tree is `ab3b2407…`. Nothing was unstaged or untracked before or after. No repo file was written: Vite's cache went to the scratchpad and `node_modules/.vite` is untouched.
- **Tests:** Vitest on core, hunt, check and repo-conventions passed (4 files, 33 tests). The whole unit suite passed (69 files, 620 tests).
- **Static checks:** `tsc --noEmit` and ESLint `--max-warnings 0` on `arches.ts` and `core.test.ts` are clean.
- **Repo rules:** `arches.ts` has 347 lines and `core.test.ts` 221. I found no hard wrapping in the changed docs.
- **Whitespace:** `git diff --cached --check 795956f` flags one line, `reviews/3_implementation.md:28`. It is a Markdown line break (two spaces) inside Codex's report, which is pasted as written. No repo rule covers it.
- **Line placement:** all nine points lie inside every tested opening, with at least 0.147 m to spare. The points are fixed fractions of the opening's box, though. In 20,000 random accepted walls, all 362 flags were lines through points outside a low-springing pointed opening, never an area. That fails loudly, so it matters only if the helper is reused.
- **Probes** (the test's helpers copied verbatim, plus copies of `arches.ts` with the check removed or the old key):
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\48153beb-3192-4cc6-8095-f6b1277f4cf9\scratchpad\probe\power.probe.ts`: the area error, the thin faces, the 6,000-pair study, the mutations and messages.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\48153beb-3192-4cc6-8095-f6b1277f4cf9\scratchpad\probe\taken.probe.ts`: the 20,000 accepted walls.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\48153beb-3192-4cc6-8095-f6b1277f4cf9\scratchpad\probe\exact.probe.ts`: the two flagged points, checked exactly.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\48153beb-3192-4cc6-8095-f6b1277f4cf9\scratchpad\probe\keys.probe.ts`: every `openWall` call, recorded through `vi.mock`.
  - `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\48153beb-3192-4cc6-8095-f6b1277f4cf9\scratchpad\probe\touch.probe.ts`: the nearest two hole outlines on one wall.

###### Read outside the diff
- `src/model/core/arches.ts:1-108,150-226`
- `src/model/core/shapes.ts:1-83` (`memo`, `keyOf`)
- `src/model/lib/builder.ts:1-300` (positions are stored as Float32)
- `src/model/hunt/shapes.ts:1-195`
- `src/model/core/core.test.ts:1-107,197-221`
- `src/build/kit.ts:55-67`, `src/build/sequence.ts:17-29`
- The `openWall` callers, by grep: `medieval-hall.ts:97,151,159,207`, `vaux-front.ts:29,43`, `vaux-shell.ts:74,80,82,106,115,216,232-233`, `weston-facade.ts:64,74,76`, `wings-walls.ts:70-71,82-83`
- `docs/work/5_closed-pieces/plan.md` in full, and `reviews/2_implementation.md` (F11 and F12)
- `docs/devlog/summary.md:5`, the `openWall` mentions in `docs/design/spec.md`, `docs/learning/lessons.md`, `docs/policies/local-rules.md`
- Round 3's `core.test.ts:100-155` (at `42210dd`)
- `vitest.config.ts`, `package.json:1-41`, `node_modules/three/package.json` (0.186.1)

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F15 to F19 | Round 3's findings | Claude finds all five resolved; Codex F16 to F19, and F15 but for F20 | None beyond F20 |
| F20 | The doorway test allowed 1 cm² of area error, a hundred times the rounding measured, and its nine lines miss faces between them, so a strip 20 µm wide up a doorway, one 49 µm tall across it, a post 33 µm wide or a 0.99 cm² triangle under a crown passes, though each stops a walker (Codex 1, Claude 1) | Accepted: no wall of the model has such a face, but the test must see one | The area tolerance is 1e-5 m², ten times the worst rounding measured; every face triangle is clipped against each opening it leaves, less a band of 0.01 mm along its edges, and none may keep any area there; each of the reviewers' thin faces is a control the test must find, with a strip 3 µm wide (9e-6 m², under the area check's tolerance); the bound is named: a face within 0.01 mm of an opening's edge is not seen |
| F21 | No check goes red under round 3's strict rule for a face's edges in `across`: the control's diagonal runs through no sampled point (Claude 2) | Accepted | A test reads `across` at a square's middle, on its fan diagonal: one surface |
| F22 | AGENTS.md and round 3's record say "the front face 92.8 m² where 86.2 m² is open"; 86.2 m² is what the face should cover (Claude 3) | Accepted | AGENTS.md says so; a labelled correction at the end of round 3's record |
| F23 | The plan's sentence on windows names only windows against windows, though a window on a door's head counts too and a round window on the base is not a door; and its sentences join two ideas (Claude 4) | Accepted | The plan says windows are not checked against each other or the doors, a round window on the base counting as a window, and that the nearest two holes on one wall stand 0.147 m apart |
| F24 | `git diff --cached --check` fails on two trailing spaces, a Markdown line break in Codex's report pasted into round 3's record (Codex, under checks) | Accepted | The spaces are removed, the correction labelled at the end of that record; this record drops them as it pastes |

## Verification

After the repairs: `src/model/core/core.test.ts` passes, 9 tests, and `git diff --cached --check 795956f` is clean. Each repair was put back to red: no clipping (the strip 3 µm wide unseen), round 4's checks (the area check at 1e-4 m² and no clipping: the strip 20 µm wide unseen), and round 3's strict rule in `across` (the square's diagonal reads none). The repairs change the test and the docs only, not `openWall`, whose code both reviewers checked in this round. They are the fifth round of repairs, the canon's cap on automatic repair, and they were not reviewed again.

## Round outcome

No blocker or major finding. Both reviewers find round 3's repairs to `openWall` resolved. They found one minor defect in the doorway test, F20, which both found, and four nits. All five are accepted and repaired, and each test repair proved red.
