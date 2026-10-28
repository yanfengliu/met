# Review 1: implementation

## Target

The repairs for round 0 (`reviews/0_implementation.md`) on the met repository's branch `claude/nice-leakey-9be7b0`: commits `8d7ba96` and `dbc9fc3` on the merge `3679a3a`, the diff `3679a3a..dbc9fc3`, 11 files. In code, `src/model/core/weston-facade.ts` (the stone lining and threshold) and `src/model/lib/door.test.ts`; in docs, AGENTS.md, `docs/design/spec.md`, `docs/devlog/summary.md`, `docs/learning/` (the defect register and the new lessons files), `docs/research/interior.md`, this unit's plan and round 0's record. The merge brought only main's one-line change to `docs/policies/local-rules.md`.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt: the repairs F0 to F5 and what each does, five lenses (the lining's geometry and its coplanar faces with every neighbour; the frame's fit, the leaves' swing and the walk over the threshold; budgets and batching; whether F0 to F5 are resolved and the docs agree; the repo's rules and the lessons template), the renders before and after the lining, and the findings format of round 0. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w3-r1/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker, and its finding cites a file and line the owner checked (`reviews/0_implementation.md:108` against `plan.md:40`). It ran a typecheck, ESLint on the changed files, `git diff --check`, an in-memory door-fit probe and a walk through the doorway; its Vitest suites could not start in the read-only sandbox, as it reports.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The lane rule passed: one model key, the pin. It ran Vitest (68 files, 597 tests) and two probes of the finished model from its own scratchpad, faces sharing a plane near the door and the piece and mesh counts, and left the worktree clean.

## Reports

### Codex (`gpt-6-astra`)

Approve with one documentation nit at `dbc9fc3`; no production defects found.

1. **Nit — [docs/work/3_weston-door-head/reviews/0_implementation.md:108](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/docs/work/3_weston-door-head/reviews/0_implementation.md:108): inaccurate F2 disposition.** It says “the plan’s outcome names the follow-up,” but [plan.md:40](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/docs/work/3_weston-door-head/plan.md:40) contains only “Pending.” A maintainer following that reference cannot find the promised follow-up there. Remove that clause or add the promised pointer to the lesson. The lesson itself adequately resolves F2.

| Finding | Resolution |
|---|---|
| F0 | Resolved: current Weston parameters in `src/model/lib/door.test.ts:37`. |
| F1 | Resolved: matching wall cut, stone lining and threshold at `src/model/core/weston-facade.ts:67,141–143`. No placement, swing or floor-junction defect found. |
| F2 | Resolved substantively: `docs/learning/lessons.md:13` and `lessons-evidence.md:7–13`; disposition nit above remains. |
| F3 | Resolved: scaling and dimensions agree at `weston-facade.ts:45–50` and `docs/research/interior.md:295–297`. |
| F4 | Resolved: both readings recorded at `docs/research/interior.md:287–288`, including the plan’s limitation. |
| F5 | Resolved: sentence split and lining description at `docs/design/spec.md:139`. |

Typechecking, changed-file ESLint and `git diff --check` passed. An in-memory probe using the existing door-fit oracle passed Weston’s sampled swing and fixed-frame check; both 2 cm lining reductions correctly failed. A real-model walk stopped at the closed leaves and crossed the open doorway both ways, with a maximum rise of 8 cm. Budgets remained below their limits. All five supplied renders were inspected at native resolution.

The six selected Vitest suites could not start because the read-only sandbox denied creation of a temporary `ssr` directory; **no Vitest tests ran**. Full `verify` and e2e were not run. No files were edited.

Files read outside the diff, with relevant line ranges:

- Geometry: `src/model/core/arches.ts:1–35,81–179`; `shapes.ts:1–83`; `constants.ts:1–77`; `vaux-shell.ts:100–120`; `wings-walls.ts:1–73,80–100,176–190`; `galleries.ts:53–110`; `layout.ts:1–30`; `wings.ts:1–120`; `src/model/roche-south/kravis.ts:15–48,80–93,122–129`.
- Parts: `src/model/lib/window.ts:1–115,225–403`; `surround.ts:1–125`; `sweep.ts:90–140`.
- Fit and walking: `src/model/door-fit.test.ts:1–351`; `src/model/core/weston-door.test.ts:1–111`; `src/walk/door-world.ts:1–210`; `walker.ts:1–110,180–410`.
- Build and gates: `src/build/kit.ts:1–97`; `timeline.ts:161–176`; `sequence.test.ts:1–194`; `window-parts.test.ts:1–167`.
- Rules and tooling: `docs/policies/local-rules.md:1–7`; `package.json:1–41`; `vitest.config.ts:1–9`; `C:/Users/38909/Documents/github/fleet/docs/lessons-template.md:1–67`.
- Capture provenance: `tmp/shots-after2.log:5,78`; `.shots/after2/shots.json:3`.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** I found no blocker or major defect at `dbc9fc3`. The stone lining, the threshold, the enlarged hole, the frame's fit and the walk all hold. Two findings are minor, both in the docs, and the rest are nits.

**How I checked.** The diff's six affected suites passed (52 tests), and the full Vitest run passed (68 files, 597 tests); the worktree was clean afterwards. I also ran two read-only probes from my scratchpad on the finished model at t = N:
- **Faces.** Every flat face within about 2 m of the door, tested for faces that share a plane.
- **Counts.** 27,043 pieces and 746 meshes, as recorded. The lining is one new mesh (24 triangles); the threshold joins the existing stone-box mesh. The budget is 900 meshes.

**Geometry results:**
- **Hole and lining agree exactly.** The brick reveals meet the lining's outer faces back to back over 4.38 m² a side, plus the threshold's 0.03 m². The head meets over 3.13 m², and the 3 cm sill slot is filled by the threshold over 3.13 m².
- **No brick inside the lined hole.** Not one brick triangle has its centre there.
- **No z-fighting.** No two coplanar faces facing the same way overlap where the lining or threshold meet the brick, architrave, base course, frieze, court floor, wing B's floor or the 528/529 wall. The only same-facing overlaps are slivers of 1e-5 m² or less on back faces inside the wall, plus the porch's plinths, which are older and in one mesh and material.
- **Covered from the court.** The lining's front band (1.7385 m²) is wholly behind the architrave's back. The threshold's front is behind the base course.
- **Fit.** The frame, shrunk 1 mm on every side, clears the lining and threshold by 1 mm.
- **Swing.** Opened, the leaves' raised panels stand at 1.349 m from the door's axis. The lining's inner faces stand at 1.415 m, so the leaves keep 6.6 cm clear.
- **Walk.** The threshold's top is the main floor's level, and `weston-door.test.ts` passes its 8 cm sill bound.

##### Findings

1. **minor** — `docs/work/3_weston-door-head/reviews/0_implementation.md:108` against `docs/work/3_weston-door-head/plan.md:38-40`.
   - **What is wrong:** F2's repair column says "the plan's outcome names the follow-up". The plan's Outcome still says only "Pending.".
   - **Failure scenario:** the unit closes and the citation check exists only as a lesson line with no owner. The defect register's own rule (`defect-register.md:17`, "needs a follow-up task with an owner") goes unmet, and a reader who trusts the table finds no follow-up in the plan.
   - **Fix:** name the follow-up in the Outcome (the gate, plus "queued in `docs/learning/lessons.md`", or an owner), or correct the disposition.

2. **minor** — `docs/learning/lessons.md:7,9` against `../fleet/docs/lessons-template.md`, which AGENTS.md R18 names.
   - **What is wrong:** "record that proof with the gate" replaces the template's `gate-proofs.md`. The canon-candidates pointer has no path, though `../fleet/canon-candidates.md` exists. Template-shaped repos keep a `gate-proofs.md` (city, lego, pixel_lab, fleet).
   - **Failure scenario:** when the citation gate lands, a session following line 9 records the red proof in the AGENTS.md note or the test header and deletes the evidence entry. Nothing then records the last commit before the deletion, which the template keeps so `git show <sha>:docs/learning/lessons-evidence.md` can bring the evidence back.
   - **Fix:** add `docs/learning/gate-proofs.md` and link it as the template does, and link the canon candidates file.

3. **nit** — `docs/learning/lessons.md:13`, with `docs/research/interior-images.md:9`.
   - **What is wrong:** the rule asks that a cited photograph be "viewed at full size and says what it shows". Its gate checks only that the entry is "marked viewed", and that file defines "Viewed" as examined in a browser with its viewpoint worked out.
   - **Failure scenario:** an entry viewed only as a thumbnail, with no reading of the cited feature, passes the gate. The lesson is then deleted with two of its three conditions unchecked (R19).
   - **Fix:** narrow the rule to what the gate asserts, or have the gate require "at full size".

4. **nit** — `src/model/core/wings.ts:99`.
   - **What is wrong:** the `wings-openings` step's on-page detail still says "the arched windows and doors of the south front". That front's only door is now square-headed. This line dates from `20e9547`.
   - **Failure scenario:** the build's step text describes the door the unit just corrected.
   - **Fix:** "the arched windows and the square-headed entrance door of the south front".

5. **nit** — `src/model/core/weston-facade.ts:67` and `:141-143`.
   - **What is wrong:** the lining's outline is written twice from `DOOR`: inline as the pavilion's hole, and as `lined` in `westonTrim`. `vaux-shell.ts:110-113,117-119` builds the wall's hole from its one `outer` hole instead. No gate catches the two drifting apart; the door-fit check only compares the frame with the lining's opening.
   - **Failure scenario:** an edit to one expression either shows brick in the reveals (hole too wide), or puts the brick's back face in the lining's plane at X −48.7, both facing gallery 529, so they flicker (hole too narrow).
   - **Fix:** one module-level outer hole, which `pavilion()` extends down by `DOOR.threshold`, as vaux-shell does.

6. **nit** — docs wording:
   - **`docs/design/spec.md:139`:** sentence 2 (architrave and lining) and "The wall's hole is cut … and the frame fills …" each still carry two ideas (F5, R25).
   - **`docs/research/interior.md:284,286`:** the readings of #33 and fig. 110 don't record the stone reveals and soffit that line 297, the code and the defect register cite them for. I viewed `p33-head-2x.png` and `p33-door-1x.png`: the soffit and east reveal do read as light stone, so the claim holds. It should still be recorded in the readings, as the new lesson asks.
   - **`interior.md:295`:** this line now measures the jambs' architrave at 0.19–0.21 m, which scales to 0.16–0.18 m. The model uses 0.19 m on every side, which is the head's 0.22 m scaled. Line 297 should say the head's width is used throughout.

7. **nit, reasoned from code, not rendered** — `src/model/core/arches.ts:153-155,174`, `src/viewer/cap-pass.ts:1-2`, `src/viewer/floors.ts:69`.
   - **What is wrong:** `holeLining` leaves its feet without faces, and the section cut's cap draws only the back faces of cut pieces. The Main floor cut at 7.8 m passes through the jambs 3.69 m above the open feet.
   - **Failure scenario:** a view looking down more steeply than about 75° along the wall's depth would see through each jamb's open foot to the threshold's lit top, not the cut colour. The default floor view at 65° is unaffected, and I did not render this. The gallery 600 lining (`vaux-shell.ts:117-119`) has the same open feet.
   - **Fix:** close the lining's feet with faces facing down. They would sit back to back with the threshold, so nothing flickers.

##### F0 to F5

- **F0 — resolved.** `door.test.ts:37` now uses the model's own unit (`weston-facade.ts:159`).
- **F1 — resolved.** The geometry is verified as above, and the renders confirm it: `.shots/after2/doors-weston.png` shows stone reveals, soffit and threshold where `after` showed brick, and `front-open.png` and `inside-open.png` show nothing wrong.
- **F2 — partly resolved.** The lesson, its gate and the register's pointer exist. The plan's outcome is not updated as the disposition claims (finding 1), and the lessons file departs from the template (finding 2).
- **F3 — resolved.** The figures reproduce: 3.29 × 5.0/5.81 = 2.831; 4.91 × 0.8606 = 4.2255, which rounds to 4.23; 0.22 × 0.8606 = 0.189, which rounds to 0.19; 5.81 − 4.91 = 0.90. Only the jamb wording in finding 6 is left.
- **F4 — resolved.** `interior.md:287-288` now record figs. 27 and 26.
- **F5 — mostly resolved.** Two sentences still join two ideas (finding 6).

No stale "hole cut 2 cm" wording remains outside the round-0 record.

##### Read outside the diff

- **Code:**
  - `src/model/core/`: `arches.ts:1-300`, `shapes.ts:1-83`, `constants.ts:1-77`, `wings-walls.ts:1-190`, `vaux-shell.ts:95-125`, `vaux-front.ts:20`, `galleries.ts:1-123`, `layout.ts:1-60`, `wings.ts:40-120`, `weston-door.test.ts:1-111`.
  - `src/model/lib/`: `surround.ts:1-125`, `window.ts:1-403`, `door.test.ts:1-160`.
  - `src/model/door-fit.test.ts:1-351`, `src/model/roche-south/kravis.ts:20-48,80-112,125`.
  - `src/walk/door-world.ts:55-61`, `src/walk/walker.ts:45-52`, `src/viewer/cap-pass.ts:1-40`, `src/viewer/floors.ts:60-77`.
  - `src/build/sequence.test.ts:24-29,187-191`, `src/build/timeline.ts:161-173`, `scripts/capture.ts:49,234`, `src/main.ts:449`.
- **Docs:**
  - `docs/research/interior.md:276-301`, `interior-images.md:9,95,99,105`, `history.md:10-24`.
  - `docs/learning/defect-register.md:1-20`, the whole plan, `docs/policies/local-rules.md`.
  - `../fleet/docs/lessons-template.md`, `fleet/docs/learning/lessons.md:1-14`, `city/docs/learning/lessons.md:1-12` and `gate-proofs.md:1-8`.
- **Images:** all five renders in the brief, plus the author's crops `p33-head-2x.png` and `p33-door-1x.png`.

The two probes are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\37956f1f-1401-4b2d-abbd-d9c230fa501b\scratchpad\probe\src\`, with their reports beside that folder.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F6 | Round 0's F2 row says the plan's outcome names the follow-up, but the outcome still read "Pending" (Codex 1; Claude 1) | Accepted: the outcome is written at closure | The plan's outcome names the queued gate and the follow-up |
| F7 | `docs/learning/lessons.md` departs from the fleet template: no `gate-proofs.md`, and the canon candidates named without a path (Claude 2) | Accepted | `docs/learning/gate-proofs.md` added and linked; the canon candidates named by path |
| F8 | The lesson's rule asks for a reading at full size, its gate checks only that the entry is marked viewed (Claude 3) | Accepted: a rule should say what its gate asserts (R19) | The rule asks for a recorded reading; the evidence says what the gate does not check |
| F9 | The `wings-openings` step's on-page detail still says the south front's doors are arched (Claude 4) | Accepted | It says the square-headed entrance door |
| F10 | The lining's outline is written twice, as the pavilion's hole and in the trim, and nothing checks they agree (Claude 5) | Accepted | One `DOOR_LINED` hole and one `DOOR_OPENING` at module level; the pavilion's hole extends `DOOR_LINED` down to the threshold, as the gallery 600 doorway's does |
| F11 | Two spec sentences still join two ideas; the readings of #33 and fig. 110 omit the stone reveals the code cites them for; the architrave's width over the jambs scales to less than the 0.19 m used (Claude 6) | Accepted | The sentences split; the readings record the stone reveals; `interior.md` says the head's width is used on every side |
| F12 | `holeLining` leaves its feet open, so a section cut through a jamb, seen steeply from above, shows the threshold below instead of the cut colour (Claude 7, reasoned from code) | Accepted: confirmed in `floor-main-top` at ten times, about a pixel a jamb, and the gallery 600 doorway's lining shares it | The feet look down, closing the lining for the cap pass; a throwaway probe found four downward foot triangles on a rectangular and a round lining |

## Verification

- On the repairs: 597 unit tests pass. Door-fit's three controls stay red: with the lining's opening 2 cm narrower or 2 cm lower the frame passes through the stone lining, and with the 528/529 wall left in the doorway leaf 0 meets it at 16 poses, 52.5° to 90°.
- A throwaway probe of `holeLining`, deleted after it ran: a rectangular and a round lining each have four foot triangles, all with the normal (0, −1, 0).
- The standard shot set against round 0's repairs (`.shots/after2`): only the cut jambs change, at the gallery 600 doorway in `cut-top` and `floor-second-top` (5 px each) and `floor-second` (1 px), and at Weston's door in `floor-main-top` (4 px), each read at ten or twelve times; every other image differs by at most 1 of 255. Model: 27,043 pieces, 746 meshes, 1,579,345 triangles.
- `npm run verify`: 597 unit tests and 86 e2e pass; the door cycles' slowest walking frame 10.4 ms.

## Round outcome

No blocker or major finding. All seven findings were accepted and repaired in the commit after `dbc9fc3`. F12 changes shared code (`holeLining`, under the gallery 600 doorway too), so round 2 re-reviews the repairs.
