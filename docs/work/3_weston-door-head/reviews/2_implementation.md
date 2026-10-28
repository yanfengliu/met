# Review 2: implementation

## Target

The repairs for round 1 (`reviews/1_implementation.md`) on the met repository's branch `claude/nice-leakey-9be7b0`: commit `43e08cb` on `dbc9fc3`, the diff `dbc9fc3..43e08cb`. In code, `src/model/core/arches.ts` (`holeLining`'s feet), `src/model/core/weston-facade.ts` (one outline for the hole and the lining) and `src/model/core/wings.ts` (the step's text); in docs, `docs/learning/` (lessons, evidence, gate proofs), `docs/design/spec.md`, `docs/research/interior.md`, the plan and round 1's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt: the repairs F6 to F12, four lenses (the lining's feet and everything that reads them: the walk's settle parity, door-fit's parity, the reach gate and its sight lines, route R5 through the gallery 600 doorway, the pick, the cap pass and the Hunt passage's lining beside it; the refactor's equivalence; whether F6 to F12 are resolved; the repo's rules), and the renders before and after. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w3-r2/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It found no defect, read files outside the diff (listed in its report), ran 57 existing test callbacks through an in-memory loader, a typecheck, ESLint on the changed files, `git diff --check` and geometry probes of four head shapes, and compared all 64 render pairs.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest (597 tests), tsc, ESLint, `git diff --check`, a probe of the feet and a settle probe on the real sequence, diffed all 65 renders, and left the worktree clean.

## Reports

### Codex (`gpt-6-astra`)

Approve at `43e08cb` — no defects found. No numbered findings.

| Finding | Status |
|---|---|
| F6 | Resolved: the follow-up is named in `docs/work/3_weston-door-head/plan.md:41`. |
| F7 | Resolved: `docs/learning/lessons.md:7–9` names both destinations; `gate-proofs.md:3` preserves the evidence-recovery requirement. |
| F8 | Resolved within the stated bound: `lessons.md:13` and `lessons-evidence.md:9` distinguish recorded viewing from visual fidelity. |
| F9 | Resolved: `src/model/core/wings.ts:99` describes the square-headed door. |
| F10 | Resolved: `weston-facade.ts:52–53,70,144–145` shares the outlines. Comparing both versions with the same `holeLining` produced identical geometry, matrices, materials and arrival order. |
| F11 | Resolved: `docs/design/spec.md:139` splits the sentences; `docs/research/interior.md:284,286,297` records the stone and explains the trim width. |
| F12 | Resolved: `arches.ts:165–175` closes both feet with downward-facing triangles. Threshold contacts remain back to back; the Hunt lining’s adjoining section is unchanged. |

Verification: 57 existing test callbacks passed using Vitest assertions and an in-memory TypeScript loader, covering door fit, Weston walking, all routes, reachability and sight lines, picking, caps and settling. Typecheck, changed-file ESLint and `git diff --check` passed. Geometry probes confirmed four downward foot triangles and closed edges for rectangular, round, segmental and pointed heads.

One custom probe initially expected every jamb to offer a walkable top. Its round arch correctly returned `lost` because the top exceeded the permitted slope; correcting that expectation passed. Full `npm run verify` and browser tests were not rerun.

Compared all 64 render pairs numerically and inspected the four changed pairs at native size and enlarged. Only the reported cut-jamb pixels changed materially. No files were edited.

Files read outside the diff, with relevant lines:

- Geometry: `src/model/lib/builder.ts:1–118`; `src/model/core/shapes.ts:1–82`; `vaux-shell.ts:50–120,174–204`; `layout.ts:1–35`; `wings-walls.ts:176–190`; `materials.ts:1–67`.
- Adjoining structures: `src/model/hunt/shapes.ts:168–191`; `stair.ts:162–174`; `src/model/roche-south/kravis.ts:20–48,84–91`; `src/model/frame.ts:44–46,97–99`.
- Walking: `src/walk/walker.ts:1–120,130–215,333–495`; `collision.ts:1–72,350–479`; `reach.ts:1–281`; `sight.ts:1–102`.
- Gates and routes: `src/model/door-fit.test.ts:1–351`; `src/model/core/weston-door.test.ts:1–111`; `src/model/hunt/routes.ts:1–109`; `routes.test.ts:1–199`; `src/model/reach.test.ts:1–265`.
- Rendering: `src/viewer/pick.ts:1–199`; `cap-pass.ts:1–85`; `section-cut.ts:1–56`.
- Records and rules: `docs/work/3_weston-door-head/reviews/0_implementation.md:1–122`; `docs/learning/defect-register.md:1–17`; `docs/research/interior-images.md:1–9,90–105`; `docs/policies/local-rules.md:1–7`; `C:/Users/38909/Documents/github/fleet/docs/lessons-template.md:1–67`.
- Configuration: `package.json:1–41`; `tsconfig.json:1–19`; `vitest.config.ts:1–9`.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** I found no blocker or major defect at `43e08cb`. The feet face down, the `DOOR_LINED`/`DOOR_OPENING` refactor builds exactly what `dbc9fc3` built, and F6 to F12 are resolved as their dispositions say. One minor gap of the F12 class remains at the gallery 600 doorway itself. I also found one minor older defect outside the diff, and two doc nits.

**What holds (item 1):**
- **Winding.** I checked `MeshBuilder.polygon`'s Newell normal (`builder.ts:16-29,79-87`). Each foot quad `(p,−d),(q,−d),(q,0),(p,0)`, with p→q running +x along the sill, gets normal (0, −1, 0). A probe of `holeLining` found four foot triangles on a rectangular lining and four on a round one. Every one has its wound normal and its normal attribute at (0, −1, 0).
- **Thresholds.** The feet sit back to back on the threshold tops, which cover them: Weston's box spans ±`DOOR_LINED.width/2` × `OUTER_WALL`, and gallery 600's spans ±`lined` × `INNER_EAST_Z..EAST_Z`.
- **No coplanar faces facing the same way.** The dado and architrave stop at X = `B_SOUTH_X`, so they only share an edge with the feet. The floors either side stop at the wall faces, and the Hunt plate starts at Z −69.0.
- **Renders.** Of the 65 images, only these differ by more than 1 of 255 between `.shots/after2` and `after3`: `cut-top` (5 px), `floor-main-top` (4), `floor-second-top` (5) and `floor-second` (1), all at cut jambs. The model gains 8 triangles (1,579,337 to 1,579,345), the feet alone.
- **Parity.** A vertical line through a jamb now crosses each lining twice: Weston at 4.110 down and 8.490 up, gallery 600's core lining at 10.970 down and 14.944 up.
- **Pick and sight.** The pick (`pick.ts:175`, DoubleSide) and the sight lines (`sight.ts:91-93`) get the same answers: the feet are coplanar with the threshold tops and lie inside their area.
- **Walk and reach.** A walker's axis never lies on a jamb line: its radius, 0.35 m, is more than either lining's thickness (0.15 m and 0.3 m). Each lining arrives in its wall's own step (`wing-b-south-facade`, `vaux-walls`).
- **Settle.** A probe on the real sequence settled a walker standing where each jamb is built. It is `kept` with the feet and with them taken out again.
- **Door-fit.** The leaves never enter a jamb, so its parity checks find nothing new.
- **Hunt lining.** `hunt/shapes.ts`'s lining still meets the core's flush at Z −69.0 and is unchanged (but see finding 1).

**Findings**

1. **minor** (older than this change, but it is the F12 failure at the doorway F12 names): `src/model/hunt/shapes.ts:170,186`
   - **What is wrong:** `archedPassage` lines the same gallery 600 passage on through the cavity, 1.41 m (`hunt/stair.ts:171`). It still skips its sill edges ("the feet, on the floor, have no faces"). So only the core half of each jamb now caps.
   - **Evidence, probe:** a vertical line at X 1.9, Z −68.3 crosses the passage (`grand-stair-vault`, `huntStairStone`) only once, at 14.944. The same line at Z −69.5 crosses the core lining at both 10.970 and 14.944.
   - **Evidence, `after3/floor-second-top.png`:** in the jamb rows 430 and 438 the core half (col 872) is the cut colour (123,47,42). The Hunt half (cols 874–875) shows the plate below: (136,132,127) at row 438, the cavity floor's colour in rows 426–429.
   - **Evidence, `after3/cut-top.png`:** the Hunt half shows (179,172,160) and (177,170,159) there.
   - **Failure scenario:** any top view whose cut lies between 10.97 m and the passage's crown (`cut-top` at 11.5, the Second floor at 12.7) shows each jamb half cut and half see-through.
   - **Fix:** drop `(p[1] === 0 && q[1] === 0)` at `:186` and fix the doc comment at `:170`. The feet will sit back to back on the plate (`hunt/galleries.ts:75`). Then re-read those two shots.

2. **minor** (older than this change, outside the diff; found while checking settle parity): `src/model/core/arches.ts:137`, against `docs/design/spec.md:132` and `src/walk/settle.test.ts:5`
   - **What is wrong:** `openWall` skips its bottom face (`'-y'`), so every wall it builds is crossed an odd number of times. Weston's pavilion: 4.080, 8.490, 11.470, 15.551, 18.000; the core east wall: 10.940, 14.944, 18.000. By the spec's parity rule such a wall has no inside, so `settle` never sees a walker embedded in it. `settle.test.ts:5` says the model's walls are closed boxes; these are not.
   - **Failure scenario, probe:** a walker stands on the ground (y −2.44) at X −49.2, Z = `WESTON_DOOR.z` + 1.49 while the build plays. When `wing-b-south-facade` (step 20) completes, it is `kept` inside the brick and stays there after 1 s. A walker at X −49.6 was pushed to −49.35, further into the wall. The spec says a step built through the walker lifts it out.
   - **Fix:** give `openWall` a bottom face with its door gaps left out. Add a real-sequence settle case, and correct the bound in `settle.test.ts`. One gate, "every piece the walk or the cut reads is closed along vertical lines", would catch this and finding 1.

3. **nit:** `src/model/core/weston-facade.ts:45-46`
   - **What is wrong:** the comment still says "its architrave, 0.22 m". `interior.md:295` now gives 0.22 m over the head and 0.19–0.21 m beside the jambs, and `:297` says the head's width is used on every side.
   - **Failure scenario:** a reader of the code alone takes 0.22 m as the drawing's width on every side.
   - **Fix:** "its architrave over the head, 0.22 m, … that width used on every side".

4. **nit** (R25, and precision):
   - **What is wrong:** three new or extended sentences each join several ideas: `docs/learning/lessons-evidence.md:9` ("It checks that a reading was recorded, not how closely: …"), `plan.md:41` (the Outcome's second sentence) and `interior.md:297`. The first also says more than the gate does. The named gate checks the "Viewed" mark, which `interior-images.md:9` defines as examined with the viewpoint worked out. It does not check that a reading exists.
   - **Failure scenario:** an entry marked "Viewed." with no reading passes the gate, while the evidence says the gate checks that a reading was recorded.
   - **Fix:** split the sentences, and say the gate checks the mark.

**F6 to F12**

| ID | Status |
|---|---|
| F6 | Resolved: `plan.md:41` names the follow-up, so round 0's F2 row is now true. |
| F7 | Resolved: `gate-proofs.md` is added and linked from `lessons.md:9`; the canon candidates are named by path at `:7`. |
| F8 | Resolved: `lessons.md:13` drops "at full size"; the evidence states the gate's bound (wording in nit 4). |
| F9 | Resolved: `wings.ts:99`. |
| F10 | Resolved, exactly: same fields and the same `(h + l) + t` order of operations; the threshold uses `DOOR_LINED.width`; nothing else read `lined`; pieces and meshes are unchanged. |
| F11 | Resolved: the `spec.md:139` sentences are split; `interior.md:284,286` record the stone reveals; `:297` gives the width on every side (code comment in nit 3). |
| F12 | Resolved in `holeLining` for both of its users; the Hunt half of the same passage remains (finding 1). |

**Checks:**
- Run: the full Vitest suite (597 passed), `tsc --noEmit` and ESLint on the three changed `.ts` files (both clean), `git diff --check` (clean), plus the two probes and the pixel diffs above.
- The worktree was clean before and after.
- Not run: e2e, `npm run verify`, and door-fit's mutation controls, which need source edits. The feet cannot reach the frame-against-lining test those controls drive.
- The probes are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\60851a52-9eb7-4a84-8757-eefb0706d638\scratchpad\probe\feet.probe.ts` and `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\60851a52-9eb7-4a84-8757-eefb0706d638\scratchpad\probe\settle.probe.ts`.
- The settle probe's open-feet variant took effect on Weston's lining only; its float filter missed gallery 600's sill. That does not change the gallery 600 result: the lining's inside lies far above the walker either way.

**Read outside the diff**
- **Model code:**
  - `src/model/lib/builder.ts:1-300`
  - `src/model/core/arches.ts:1-300`, `weston-facade.ts:1-192`, `vaux-shell.ts:1-309`, `vaux-front.ts:9-20`, `constants.ts:10-36`
  - `src/model/hunt/shapes.ts:1-191`, `stair.ts:140-200`, `galleries.ts:60-101`, `dims.ts:39,110,162`
  - `src/model/frame.ts:46,97-99`
- **Walk and viewer:**
  - `src/walk/walker.ts:1-496`, `collision.ts:1-120,330-480`, `sight.ts:1-102`, `settle.test.ts:1-80`, `walk-mode.ts` (grep, 20–338)
  - `src/viewer/pick.ts:1-199`, `cap-pass.ts:1-85`, `section-cut.ts:2-65`, `floors.ts:1-123`, `environment.ts:30-42`, `presets.ts:15,47`
- **Tests and tooling:** `src/model/door-fit.test.ts:1-351`, `src/build/sequence.test.ts:59-64`, `scripts/capture.ts:200-225`, `vitest.config.ts`.
- **Docs:**
  - `docs/design/spec.md:132,139`
  - `docs/research/interior-images.md:1-20,105-123`
  - `docs/devlog/summary.md:1-12`
  - `reviews/0_implementation.md`
  - `../fleet/docs/lessons-template.md`
- **Renders:** all 65 images in `after2` and `after3` diffed; pixel dumps of `cut-top`, `floor-second-top` and `floor-main-top` at both doorways.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F13 | The Hunt half of the gallery 600 passage's lining (`archedPassage`, `src/model/hunt/shapes.ts`) still leaves its feet open, so a top view cut between 10.97 m and the passage's crown shows each jamb half cut and half see-through (Claude 1) | Accepted, deferred: older than this change, at another doorway, and one of a class with F14 | One follow-up closes every piece the walk and the cut read along vertical lines, under one gate |
| F14 | `openWall` skips its bottom face, so its walls are open along vertical lines and the walk's settle never finds a walker embedded in one; a probe kept a walker inside the brick of Weston's pavilion as its step completed (Claude 2) | Accepted, deferred: older than this change, it touches every wall `openWall` builds and the settle rule's bound in `src/walk/settle.test.ts` | The same follow-up as F13, with a real-sequence settle case |
| F15 | The code comment gives the drawing's architrave as 0.22 m without saying it is the width over the head, used on every side (Claude 3) | Accepted | The comment says so |
| F16 | Three sentences join several ideas, and the lesson's evidence says its gate checks that a reading was recorded, where it checks the "Viewed" mark (Claude 4) | Accepted | Split into one idea a sentence; the evidence says the gate checks the mark only |

## Verification

F15 and F16 change a comment and the wording of three docs; they were not re-reviewed. `npm run verify` on the final revision covers the comment's file.

## Round outcome

No blocker or major finding, and no defect in the repairs reviewed. Codex approves them as they stand. Claude's two minor findings are older than this change and are deferred together to one follow-up, which the plan names; its two nits are repaired. This closes the unit's review.
