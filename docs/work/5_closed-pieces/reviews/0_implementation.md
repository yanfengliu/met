# Review 0: implementation

## Target

The met repository's staged change on branch `claude/awesome-lovelace-db4c00`, on top of `795956f`: `git diff --cached 795956f`, 13 files, the patch preserved under the ignored `tmp/review-runs/w5-r0/target.diff` (745 lines, sha256 `05800fdc0d463359cd61eaa2bf2cc7b27b778b4a73c8aaca728d64f2e7248495`). It was not committed because the pre-commit e2e gate was waiting for a quiet machine; the worktree held exactly the staged content while both reviewers read it, and neither changed it. In code: `src/model/core/arches.ts` (`openWall`'s bottom face, the builders' geometry names), `src/model/hunt/shapes.ts` (`archedPassage`'s feet), `src/model/lib/check.ts` (`openAlong`) and its fixtures, the gate `src/model/closure.test.ts`, `src/walk/settle.test.ts`, and the builders' tests in `src/model/core/core.test.ts` and `src/model/hunt/hunt.test.ts`. In docs: AGENTS.md, `docs/design/spec.md`, `docs/devlog/summary.md`, `docs/work/registry.json` and this unit's plan.

## Reviewers and coverage

Both reviewers ran on 2026-10-28 with the same prompt: the change's purpose and six lenses (`openWall`'s bottom face and what it changes for the walk, the settle, door-fit, reach, routes, the pick, the cap pass, shadows and budgets; `archedPassage`'s feet; `openAlong`'s method, bounds and fixtures; the gate's claims and bound; the settle case; docs and repo rules), and the renders before and after. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w5-r0/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It read files outside the diff (listed in its report), ran 106 existing test callbacks through an in-memory loader, a typecheck, ESLint on the changed files, mutations of the gate, and compared all 64 render pairs.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. A login check from an empty folder with every tool off passed first. It ran Vitest on 16 test files (119 tests), tsc, ESLint, `git diff --cached --check`, brute-force parity probes and mutations in memory, diffed all 64 renders, and left the worktree unchanged. Its report was extracted to `raw/claude-report.md`: the runbook's `raw/claude.md` is a `CLAUDE.md` on Windows' case-insensitive disk, which the harness then loads as instructions.

## Reports

Each report is as its reviewer wrote it, but for Codex's links, whose absolute targets are shortened to the repository path.

### Codex (`gpt-6-astra`)

No blocker or major found. Two minor issues and one documentation nit remain.

1. **Minor — overlapping doors can put the new bottom inside an opening.** `src/model/core/arches.ts:148` resets `from` to each door’s right edge, even when that moves backward. Reproducer: wall `10 × 5 × 1`, holes `{x:0,width:6,height:3}` and `{x:1,width:2,height:2}`. The bottom resumes at x=2, covering x=2..3 inside the larger doorway. A downward ray from `(2.5,1,-0.5)` hits this unintended face at y=0; `openAlong` reports 8 m of open boundary. Construct the bottom from the union of door/niche footprints, or explicitly reject overlapping holes. Add nested and mixed-depth cases. Current-model tests pass; this concerns accepted builder inputs.

2. **Minor — the walk-query gate passes when the intended piece returns no crossings.** `src/model/closure.test.ts:111` substitutes `[]` for a missing result and accepts its even length. `lines` counts attempted queries, so its minimum does not prevent this. In memory, I suppressed only `archedPassage`’s crossing results: 52 results disappeared, yet both closure tests passed. Require a result for the intended instance, at least two crossings, and a crossing at the sampled face’s height before checking parity.

3. **Nit — the gate’s stated tolerance omits the perimeter cutoff.** `src/model/closure.test.ts:13` names only the 0.1 mm tolerance. `check.ts:239,375` also discards total projected boundary below 1 mm. A bottomless box with a **0.2 × 0.2 mm** footprint returns `null`, despite exceeding the named width tolerance. Include both limits in the gate header and the plan’s “exact” description.

Checks run:

- **106 existing test callbacks passed**, using an in-memory TypeScript loader and Vitest assertions—not the Vitest runner. Coverage included closure, builders, settling, door fit, Weston walking, R1–R7, reachability, picking, caps, and sequence budgets.
- In-memory mutations confirmed red controls for F13, F14, missing geometry names, endpoint joining, and edge splitting.
- Weston’s case is **embedded, not buried**: feet −2.440 m; after settling, coping 18.150 m.
- Winding/gap probes passed for all five head types, through openings, blind niches, near-end openings, and touching rectangular doors.
- Census reproduced: **26,794 pieces, 2,979 shapes, 2,370 open**; 2,311 walk-only and 59 capped after these fixes.
- Typecheck, changed-file ESLint, staged whitespace check, and changed-file line limits passed.
- Compared all 64 render pairs; inspected all nine materially changed pairs at native resolution, with SHA-256 digests recorded. No additional visual defect found.
- Full verify/build/e2e were not rerun. The existing verify log records 83 e2e passes and one door-frame-time failure.

Outside-diff repository reads:

- Geometry: `src/model/lib/builder.ts:1–300`; `core/weston-facade.ts:1–155`; `hunt/galleries.ts:60–100`; `hunt/stair.ts:150–180`.
- Walking: `src/walk/walker.ts:1–215`; `collision.ts:1–90,224–289,349–480`; `bvh-cache.ts:1–37`.
- Rendering: `src/viewer/pick.ts:1–199`; `cap-pass.ts:1–85`; `section-cut.ts:1–85`; `environment.ts:1–48`.
- Gates: `src/model/door-fit.test.ts:1–181,240–351`; `reach.test.ts:50–95,242–280`; `src/build/sequence.test.ts:45–85,164–194`.
- Instructions and records: `docs/policies/local-rules.md:1–7`; `docs/learning/lessons.md:1–13`; work unit 3’s `reviews/2_implementation.md`, including the Claude probes and F13/F14 dispositions; `package.json`, `vitest.config.ts`, and `tsconfig.json`.

No files were edited.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** I found no blocker or major defect. The new bottom faces and feet are wound down and close their pieces, the settle case goes red for the right reason, and every gate the new faces touch passes. Two minor findings concern the gate's second reading (the walk's crossing query): its stated red evidence is wrong, and it can pass without checking anything. There are four nits.

**Findings**

1. **minor**: `src/model/closure.test.ts:113`, `AGENTS.md:107`, `docs/work/5_closed-pieces/plan.md:31`
   - **What is wrong:** the walk reading reports a failure as `<builder> in <step> piece <slot>`, and every mesh of one builder in one step shares that label. `vaux-walls` and `medieval-hall-clerestory-vault` each have three `openWall` meshes, and each wing-walls step has two. So "the walk reads 63 pieces open" counts labels, not pieces. Also, one line per face cannot see the defect on the medieval hall arcade panels at all.
   - **Evidence (geometry changed in memory only):** with `openWall`'s bottom removed, 101 of the 113 walked `openWall` pieces read odd, reported under 63 labels. The other 12 are `medieval-hall-arcades#0`, slots 0–11. All 26 lines through each panel's non-vertical faces still cross it twice, because both sample points on its top lie over the arch. Only `openAlong` catches those 12.
   - **Failure scenario:** the message "openWall in vaux-walls piece 0" points at one of three different pieces and sums their line counts. A reader of AGENTS.md takes the walk reading as a second catch of F14 on every wall, but it misses the arcades.
   - **Fix:** label failures by `mesh.name` (`<step>#<mesh>`) or the world instance. Change both docs to "101 of 113 pieces; the walk's reading does not see the 12 arcade panels". Name that blind spot in the header's bound, or try three points per face.

2. **minor**: `src/model/closure.test.ts:111-112`, `:122`
   - **What is wrong:** a line that never crosses its own piece gets `heights = []` and counts as even. The test asserts only `lines > 1000`, never that a line met its piece.
   - **Evidence:** as built, all 5,052 lines meet their piece. With the instance index off by one mesh, 4,948 lines meet nothing of their piece. With the bottoms also removed, that reading then finds 0 odd lines and passes; `openAlong` still goes red.
   - **Failure scenario:** a later change to `walked`'s order or to `CollisionWorld.build`'s numbering silently turns this reading into a no-op.
   - **Fix:** count the lines that don't cross their own piece and expect 0, or expect `heights.length >= 2` on every line.

3. **nit**: `AGENTS.md:107`, `src/model/closure.test.ts:13`, `plan.md:39`, `docs/devlog/summary.md:5` say "2,979 shapes".
   - The gate's own key (geometry uuid plus direction `toFixed(6)`) gives 2,981 on this tree, or 2,980 with −0 read as 0. The choir-screen and Astor Court keys split on "-0.000000".
   - Everything else reproduces exactly: 26,794 pieces, 2,370 open, 2,311 walk-only, 59 capped now and 74 before.
   - The model is unchanged between `53a981c` and `795956f`, so the census revision doesn't explain the difference.
   - **Fix:** say 2,981, or name the key the census used.

4. **nit**: `src/model/core/arches.ts:143-148`
   - **What is wrong:** overlapping door holes move `from` backwards, so the bottom covers part of the wider opening. A probe with a 1 m door inside a 4 m door reads open by 4.6 m.
   - **Failure scenario:** none today. No caller overlaps door holes; the arcade panels hold the model's only door-type holes, one per panel. Overlapping holes would already break the front face.
   - **Fix:** `from = Math.max(from, x + h.width / 2)`, or reject overlapping holes in the validation at `:116-121`.

5. **nit**: `src/model/hunt/hunt.test.ts:269` and `src/model/core/core.test.ts:84-99`
   - **What is wrong:** the hunt test's name says "its feet on the floor looking down", but both builder tests assert parity only. A face wound up would pass them and the gate.
   - **Evidence:** the code itself is right. Every new face is wound down with −Y vertex normals, and `invertedFraction` is 0 on all 17 named geometries.
   - **Failure scenario:** a flipped vertex order in `bottom()` would turn every cut wall's base back to its own colour, and only the renders would show it.
   - **Fix:** in both tests, assert that the triangles in the sill's plane face −Y.

6. **nit**: wording.
   - The new sentences at `docs/design/spec.md:87` and `:132` each join three ideas (R25).
   - The gate's header (`closure.test.ts:11`) says it reads "the page's collision world". Its `walked` list keeps the leaves of the doors that open, which the page's static world leaves out. This is harmless for these pieces.

**Checks run**
- **Unit tests (all pass):**
  - Fixtures and builders: `check`, `core`, `hunt` (25).
  - The gate and settle: `closure`, `settle` (12).
  - `door-fit`, `placement`, `weston-door`, `door-settle`, `sequence` (budgets), `floors`, `cap-pass` (45).
  - `reach`, `routes`, model `doors`, `labels` (37).
- **Static checks:** `tsc --noEmit`, ESLint `--max-warnings 0` on the 8 changed `.ts` files, and `git diff --cached --check 795956f` are all clean.
- **Not run:** the full suite, `npm run verify` and e2e, because the machine is held for the pre-commit gate.
- **The new faces:**
  - Each bottom face's normal is (0, −1, 0), including the strip behind a blind niche.
  - The door gaps match each door's sill points for every head shape.
  - `openAlong` and a brute-force vertical-parity grid agree on every layout I tried: touching doors, a door 1 mm from the end, round, segmental and pointed doors, a blind niche beside a door, a sill 1e-7 up, and a circle on the floor.
  - Every `openWall` bottom sits back to back on what the wall stands on (footings, arcade tops or roofs), except the hall end walls' 5 cm plaster lining, whose underside now shows.
  - The walker's capsule starts 0.35 m over the feet and its side probes reach 0.3 m against a 0.35 m radius, so the walk never meets a face at a wall's base.
  - `archedPassage`'s feet are 4 down-facing triangles lying back to back on the Hunt plate at `galleries.ts:75`.
- **`openAlong`:**
  - It agrees with brute force on all 17 named geometries, both as built and with the new faces removed.
  - The 0.1 mm bound holds both ways: a 0.05 mm gap is not seen, and gaps of 0.2 mm and 1 mm are.
  - It takes 82 ms in the gate and 1.4 s over every shape in the model.
  - I ran the fixtures against patched copies. With joining turned off, only the joining fixture fails. With splitting turned off, the split, joining and turned-line fixtures fail.
- **The gate's red claims:** 14 shapes open, the arcade passage reported in `grand-stair-vault`, and 8 steps missing with 112 lines when unnamed all reproduce. Removing the bottoms and feet in memory gives 2,370 + 15 = 2,385 open shapes, matching the plan's before number.
- **The settle case:**
  - As built, the pavilion embeds the walker (crossings at −2.640 and 18.000), and settle moves it to the coping at 18.150.
  - Without the bottom, the wall is crossed only once, at 18.000. The walker is not buried and is kept at −2.440.
  - The same holds at Z offsets of 4.6 m and −5 m.
- **Renders:**
  - 9 of 64 images differ by more than 1/255. The large ones are `cut-top` and `floor-second-top` (286 px each), `floor-second` (127), `preset-int-medieval-hall-east` (316, worst 44), `cut-aerial-ne` (72) and `floor-second-aerial-ne` (19). The rest are tiny: european-paintings-600 21 px, fountain-north 3 px, ui-mobile 1 px, none over 9/255.
  - At 2–4× native size, the nave walls turn from see-through to the cut colour, and the gallery 600 jamb's Hunt half is now capped.
  - The medieval-hall-east seam fits the plaster lining's underside (`medieval-hall.ts:207`) now being drawn.
  - The "after" set names `ac0930e` (dirty), not this staged tree. Since `ac0930e`, `arches.ts` and `shapes.ts` changed only in geometry names and comments, so the renders show the staged geometry.
- **Worktree:** I left it unchanged. The probes, patched copies and render crops are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-awesome-lovelace-db4c00\f035d2e0-dcec-4ca7-b466-794f30f792ef\scratchpad`.

**Read outside the diff**
- **Docs:**
  - `docs/work/3_weston-door-head/reviews/2_implementation.md:1-140`
  - `../fleet/docs/work-docs.md:1-140`
  - `docs/devlog/summary.md:1-30`
  - `docs/work/registry.json`
- **Library:** `src/model/lib/builder.ts:1-301`, `check.ts:1-235`
- **Core model:**
  - `src/model/core/arches.ts:1-319`
  - `medieval-hall.ts:80-215`
  - `vaux-shell.ts:1-309`
  - `vaux-front.ts:1-80`
  - `weston-facade.ts:1-200`
  - `wings.ts:1-120`
  - `wings-walls.ts:60-100,160-200`
  - `core.test.ts:20-79`
  - `constants.ts:10-66` (grep)
- **Hunt and frame:** `src/model/hunt/shapes.ts:150-195`, `stair.ts:125-180`, `galleries.ts:60-101`, `dims.ts:39,110,156-162`, `src/model/frame.ts:97-99`
- **Walk:** `src/walk/collision.ts:1-481`, `walker.ts:1-240,320-496`, `reach.ts` and `walk-mode.ts` (grep)
- **Viewer and build:** `src/viewer/section-cut.ts:1-80`, `cap-pass.ts:1-85`, `pick.ts:160-199`, `src/main.ts:85-110`, `src/build/batch.ts:1-80`
- **Materials:** `src/model/palette.ts:40-60`, `core/materials.ts:55-67`
- **Tests and tooling:** `src/model/door-fit.test.ts:1-40,130-200`, `collection/placement.test.ts:270-345`, `scripts/capture.ts:114-116`, `vitest.config.ts`

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The walk reading counted a line that met nothing of its piece as even, so it could pass without checking anything: with `archedPassage`'s crossings suppressed, or the instance index off by a mesh, it stayed green (Codex 2, Claude 2) | Accepted: the gate claimed a reading it could skip | Every line must meet its own piece at the face it was drawn through, and be crossed an even number of times; red with the index off by a mesh, all 116 pieces' lines missing their faces |
| F1 | The walk reading's labels merged a builder's meshes in one step, so "63 pieces" counted labels, not pieces (101 of 113 are open with the bottom left out); and one line inside each face missed the 12 medieval hall arcade panels, whose sampled lines lie over the arch (Claude 1) | Accepted | Pieces are named by step, mesh and slot; four lines a face, one inside it and one near each corner; red with the bottom left out on all 113 walked `openWall` pieces, the 12 panels among them; AGENTS.md and the plan say so |
| F2 | Overlapping doors put `openWall`'s new bottom inside an opening: the loop moved back to the inner door's right edge (Codex 1, Claude 4) | Accepted: no caller overlaps doors, but the builder takes them | `openWall` refuses doors that overlap, naming both, and takes doors that touch (`core.test.ts`, red with the check taken out) |
| F3 | The gate's header named `openAlong`'s 0.1 mm joining but not its 1 mm minimum of open boundary, and the plan called the check exact (Codex 3) | Accepted | The header and the plan name both limits; the plan says the check reads the whole plane, within them |
| F4 | "2,979 shapes" came from the probe's own key; the gate's key gives 2,981, or 2,980 with −0 read as 0 (Claude 3) | Accepted | The gate's key reads −0 as 0; the census was counted again with it: 2,980 shapes, 2,385 open before the fixes and 2,370 after, 14,885 and 14,771 pieces; the docs say so and name the key |
| F5 | The builders' tests checked parity only, so a bottom face or a foot wound up would pass them and the gate (Claude 5) | Accepted | `levelFaces` (`src/model/lib/check.ts`); each builder's faces at its base must exist and look down; red with `openWall`'s bottom or the passage's feet wound up |
| F6 | Two new sentences in the spec joined three ideas each, and the gate's header called its world the page's collision world, which leaves out the opening doors' leaves (Claude 6) | Accepted | The sentences are split; the header says a collision world of the meshes the walk collides with |

## Verification

After the repairs: the gate, the builders' tests, the check's fixtures and the settle tests pass. Each repair was put back to red: the walk's instance numbering off by a mesh (116 pieces misread), `openWall`'s bottom left out (14 shapes by `openAlong`, 113 pieces by the walk), `openWall`'s bottom wound up and the passage's feet wound up (their faces at the base look up), and the overlap check taken out (no error). The census was counted again with the gate's key, before and after the fixes. Review 1 re-reviews the repairs.

## Round outcome

No blocker or major finding. Both reviewers found two minor defects in the gate's walk reading (F0, F1) and in `openWall`'s handling of overlapping doors (F2), and four nits. All seven are accepted and repaired. The repairs change the gate and add a check to `openWall`, so review 1 re-reviews them.

Correction (review 1, F8): the tally above is wrong. The reviewers found three minor defects, not two: F0 and F2, which both found, and F1, which Claude found alone.
