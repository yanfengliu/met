# Review 1: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`: the diff `13ff3a4..04b5c2a`, the repairs of review 0's F1 to F4 (`515de57`: the records' map figures, the plain ends' cornice in `src/model/core/weston-facade.ts`, the court's photographs read against the new layout, two stale descriptions) and the unit's plan and review 0's record (`04b5c2a`). The reviewers read the worktree at `62ca6a1`, the merge of `04b5c2a` with origin's main at `35b604f`, which brought in work unit 15's follow-up, the fleet canon's sync and other units' review records, not under review.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, from `../fleet/tmp/review-runs/met-u19-r1/` (ignored, where the raw captures stay): the repairs with their dispositions, a request to report new defects only, and, since the unit's gates were running on the machine, to run no test suite, browser, build or heavy probe. The diff came on stdin.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. Two of its citations outside the diff, checked: `src/model/core/shapes.ts:80` (`placed`) and `src/model/roche-south/kravis.ts:26` (the court's extent). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, the same tools and limits as in review 0. The runbook's lane rule passed. 77 tool calls (35 Grep, 25 Read, 12 Bash, 5 Glob); three of them read fleet's `docs/work-docs.md` and `docs/skills/multi-cli-review.md`, none the run folder. It ran only git and reads.
- The worktree's `git status`, saved before both lanes ran, was clean; read again after, it shows `docs/research/interior.md` changed. That edit is the integration owner's, made while the lanes ran, the repair of F5 below after Codex's report; Claude noticed it and reviewed the committed text. Neither lane changed a file.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve with findings — one minor documentation issue; no new code defect found in the repairs at `62ca6a1`.

**F5. Court offsets are still attributed to the front — minor**

[docs/research/interior.md:334](docs/research/interior.md:334)

The corrected paragraph distinguishes the front’s galleries, Z −135.14..−66.78, from the court, −137.10..−64.83, but then says the “map’s front” runs 1.2 m less far west and 4.2 m further east than the model.

Those offsets describe the **court**. Against the model’s −138.3..−69.0 extent, the gallery span instead ends 3.16 m inward on the west and 2.22 m beyond on the east. The decoded cache confirms both spans. A future modeller following this summary could choose the wrong boundary.

Suggested repair: explicitly name the court in that sentence, keeping its extent distinct from the gallery span.

**Checked and sound**

- **Cornice geometry:** the scale at `weston-facade.ts:181` acts along local X, which the south-facing placement maps to world Z. It preserves the 0.8 m height and 0.75 m projection. Both scales are positive; the sweep’s caps remain intact, and three.js supports this rotation plus nonuniform scale when transforming instance normals.
- **Joins and batching:** the fills meet the adjacent bay profiles. Their outer ends retain the existing boundaries against the Kravis pier and east party wall. Both instances reuse the bays’ geometry, material and build step, adding no mesh.
- **Measurements:** the decoded features confirm the door midpoint, corrected gallery and court extents, exclusion of gallery 530, and 4.17 m court overrun rounded to 4.2 m. The partition code gives 1.885 m clearance, correctly rounded to 1.89 m.
- **Records:** nine bays and the artwork-row gap match the code. The photograph comparison names its references and records the unresolved east-side design. The plan leaves final merged-tree verification and delivery pending.

**Read outside the diff**

- `src/model/core/shapes.ts:80–87` — placement and facing.
- `src/model/lib/cornice.ts:45–83`, `profiles.ts:43–66`, `sweep.ts:97–146` — profile, normals and caps.
- `src/build/batch.ts:34–89`, `kit.ts:32–42` — batching and matrix ownership.
- `node_modules/three/src/renderers/shaders/ShaderChunk/defaultnormal_vertex.glsl.js:28–46` — instance-normal transformation.
- `src/model/roche-south/kravis.ts:26–42,103–110`; `src/model/mmw/party-walls.ts:71,99–135` — end structures.
- `src/model/core/plan-data.ts:15–31`, `galleries.ts:14–29`, `core.test.ts:41–92` — partitions and budget.
- `src/model/collection/spaces-b.ts:18–35`; `src/model/hunt/routes.ts:120–175` — placements and merged routes.
- Main checkout’s `research/cache/README.txt:1–5` and `lm_features.json:1` — coordinate transform and selected feature records.

No files edited; no tests, builds, browsers or heavy probes run. Source photographs were not independently re-viewed; visual and runtime verification remains with the worker.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** The cornice repair is sound, and every figure F1 repaired matches the decoded features. I found two minor findings and three nits. Four are in the records; one is a 0.1 m stub of the new cornice outside the building at the west end.

One thing first: `docs/research/interior.md` changed in this worktree while I was reading it. My first `git status` was clean; it now shows an uncommitted edit to line 334. I didn't make it, and it isn't part of `62ca6a1`. I reviewed the committed text. That edit already fixes F7 below.

##### Findings

###### F5. The code's comments and the devlog still describe the map's front as five bays each side, which F3's own reading contradicts (minor)

- **Where:** `src/model/core/weston-facade.ts:9-10`, `src/model/core/constants.ts:76`, `docs/devlog/summary.md:5`, `docs/work/19_weston-pavilion-place/plan.md:22`.
- **What is wrong:** F3's reading says the front has one arched bay east of the porch, then a front of another design (`interior.md:336`, `:338`; `interior-images.md:107`). Lines rewritten in the same repair still say otherwise:
  - The facade's header calls the pavilion "the middle of the map's front, five bays each side, which the model's front … cuts to four on the east".
  - The constant's comment glosses ±34.18 m as "the pavilion and five bays each side".
  - The devlog says "five on the west, as the map has them". The map has galleries there, not bays.
  - The plan says "so the map's front is symmetric about the door" because of the five-bay match. The symmetry actually comes from the middles (−100.96 and −100.965), not from that match.
- **What is already right:** the spec item (`docs/design/spec.md:176`) and `interior.md:334` treat ±34.18 m as only the length of the model's estimates, which the photographs then qualify.
- **Failure scenario:** a later session takes up the open east end and reads the facade's header. It concludes the model is one bay short, so it adds a fifth arched bay, or extends the front 4.2 m with one more. The photographs say the reverse: three of the model's four east bays are of the wrong design.
- **Repair:**
  - Header and constant: say ±34.18 m is as long as the pavilion plus five of the model's 5.6 m bays each side.
  - Header: say #33 shows one arched bay east of the porch and then another design, and that the model's four east bays stand in for that stretch, open for the owner.
  - Devlog: drop "as the map has them".

###### F6. The new readings of #33 and #35 disagree about the stretch just east of the porch (minor)

- **Where:** `docs/research/interior-images.md:111` (#35) against `:107` (#33); `docs/research/interior.md:336`.
- **What is wrong:**
  - #33's entry has "one more [arched bay] east of the porch" before the other design starts.
  - #35's entry says "the front east of the porch has dark granite columns … not arched bays".
  - `interior.md:336` says #35 shows "that design nearest the camera, then the porch", with no bay between.
  - So as written, #35 either contradicts #33's one arched bay or does not show it, and the records say neither.
  - Also, neither new reading says what size it was read at. Each entry's earlier readings record their size, and `interior.md:336` and F3's disposition claim native size for both.
- **Evidence:** the owner's open question rests on "the pavilion and one arched bay, then another design" (`interior.md:338`, the spec, the devlog). Someone checking that against #35's entry finds "not arched bays" east of the porch. They cannot tell whether the one bay rests on both photographs or on #33 alone.
- **Not checked:** I couldn't check which reading is right. Neither photograph is under the main checkout's ignored paths, and I had no web access.
- **Repair:**
  - In #35's entry, say whether it shows the bay #33 sees east of the porch: seen past the porch's east side, or hidden by it.
  - Limit "not arched bays" to the stretch nearest the camera.
  - Add the size read to both new readings.

###### F7. `interior.md:334` gives the court's ends as "the map's front" (nit)

- **Where:** `docs/research/interior.md:334` as committed: "the map's front, which runs 1.2 m less far west and 4.2 m further east than the model's".
- **What is wrong:** 1.2 m and 4.2 m are the court's ends (−137.10, −64.83). The same paragraph gives the front's galleries as −135.14..−66.78. Those end 3.16 m short of the model's west end and 2.22 m past its east end. The next sentence then starts the bays "where the map's galleries start at −135.14". So "the map's front" has two west ends in one paragraph.
- **Repair:** commit the uncommitted edit now in the worktree. It gives the galleries and the court separately, and its figures are right (3.16 and 2.22 m; 1.20 and 4.17 m).

###### F8. The west plain end's cornice sticks out 0.1 m past the Kravis pier, on the park side (nit)

- **Where:** `src/model/core/weston-facade.ts:181`, with `src/model/roche-south/kravis.ts:28` and `:109`.
- **What is wrong:**
  - The west plain end's cornice starts at `WEST_Z`, −138.3 (`constants.ts:10`).
  - Kravis's park face is at −138.2 (`kravis.ts:28`).
  - The court's north pier (`kravis.ts:109`) covers X −50.7..−49.7 and Z −138.2..−137.0, up to 19.6 m.
    - Its Z extent comes from roche-south's `OUTER_WALL`, which is 1.2 (`blocks.ts:65`).
    - `wallAlong` puts the wall's body on the left of the edge it is given (`roche-south/shapes.ts:52-66`, `poly.ts:26-31`).
  - The pier contains the cornice's whole cross-section (X −50.45..−49.7, Y 16.9..17.7) from −138.2 to −137.0. The first 0.1 m, from −138.3 to −138.2, stands west of the pier's park face.
  - So the cornice's end cap shows outside on the park face: its full profile, 0.75 m out and 0.8 m tall, in `westonStone`, 0.1 m proud of the limestone pier. The old box showed a 0.3 × 0.8 m end there.
  - The other Weston trims already do the same at 0.08 to 0.16 m out, since all run from `WEST_Z` (`weston-facade.ts:117-142`, `:182`).
- **Repair:** keep the cornice running to −138.3, since that is the building's corner from 1888 until 1990. Record the stub, with the other trims' stubs, as a consequence of `kravis.ts:28`'s −138.2 against `frame.ts:38`'s −138.3. `frame.ts` gives −138.3 as the west face "Kravis to American Wing". Alternatively, align the Kravis park face with that line in a later unit.

###### F9. The plan dates the pavilion's old place to work unit 3 (nit)

- **Where:** `docs/work/19_weston-pavilion-place/plan.md:10`, "Since work unit 3 the model stood … the pavilion … at the middle".
- **Evidence:**
  - The core's first commit, `20e9547` (2026-10-11), already set `CENTRE_Z = (WEST_Z + EAST_Z) / 2` (its `weston-facade.ts:22`).
  - Work unit 3's commit `8d7ba96` (2026-10-27) only lined the door's reveals.
- **Repair:** "Since the core's first modelling (2026-10-11)".

##### Checked and sound

**The cornice repair (F2):**
- **Matrix:** `placed` composes T·R·S (`core/shapes.ts:81-84`). `FACING.south` turns local +X to world +Z and local +Z to −X. The extra scale therefore acts along local X, the path.
- **Extents:** the instances are centred at −136.735 and −70.685, scaled 0.559 and 0.602. They span exactly −138.3..−135.17 and −72.37..−69.0, flush with the bays' cornices.
- **Geometry under the scale:**
  - `moulding` sweeps one profile along a two-point path with square-cut end stations and no mitre (`sweep.ts:89-91`). Its caps are flat in the profile plane (`sweep.ts:131-147`).
  - The side normals lie in the profile plane (`sweep.ts:112`, `:119-121`), and the cap normals run along the path. A scale along the path leaves both directions unchanged, so shading is continuous across each junction.
  - The two caps at each junction are back to back inside the joined solid.
  - The UVs are squeezed, but `westonStone` is a plain colour (`core/materials.ts:39`; `palette.ts` has no textures).
- **Motion:** `grow` scales world rows (`motion.ts:112-118`), so the local scale doesn't interact with it. With `stagger: 'order'`, the fill cornices arrive at order 10 with the bays' cornices (`wings.ts:51-52`).
- **Budget:** the same geometry and material objects batch into the same mesh (`batch.ts:37-62`), so the core gains no mesh against its 130 (`core.test.ts:46`). The removed boxes were `UNIT_BOX` instances (`core/shapes.ts:76-78`, `wings-walls.ts:93-98`), so no mesh goes either. The bounds check allows trim 1.5 m out (`core.test.ts:41-43`, `:59-82`).
- **East end:** the cap at −69.0 meets the south link's park wall.
  - That wall covers X −88.1..−49.7 and Z −69.0..−68.2. It rises to 17.7 m and then 19.6 m (`party-walls.ts:71`, `:104-111`; `mmw/dims.ts:53`, `:146-157`; `frame.ts:109`), so it covers the cornice's 16.9–17.7 m.
  - The 5 cm overhang of its 1910 coping band (`party-walls.ts:135`) ends inside the cornice.
  - The court's gutter and laylights stand above 18.15 m (`kravis.ts:174`, `:79-82`).
- **West end:** apart from F8, the court's glass end stops at X −50.7 (`kravis.ts:189-199`).
- **Earlier frames:** before the walls at the two ends exist, each fill's cornice ends in a square, unreturned cap at the block's corner. The old box layout did the same in two steps, so this isn't new.

**The records against the decoded features (F1):**
- The front's main-floor galleries are 526, 527, 528, 529, 531, 532 and 533. All have x min −55.08. 530 stands behind 529 (x −40.39..−36.11), and 525, 524 and 523 are off the front.
- The ends are z −49.17 and 19.19. Less 85.97 (`README.txt:3`, `constants.ts:4`), that gives −135.14..−66.78: middle −100.96, ±34.18 m.
- The court, 548, is −51.13..21.14, giving −137.10..−64.83: middle −100.965, ±36.135 m. Its east end is 4.17 m past `EAST_Z`.
- The door into 529 is z −16.76..−13.24, giving −102.73..−99.21, middle −100.97.
- The 528/529 wall's rectangle is Z −104.9..−104.5 (`plan-data.ts:21`, `galleries.ts:15-18`). Its face is 1.885 m from the opening's west edge at −102.615.
- No old figure survives anywhere outside review 0's preserved report: "4.1 m", "526 to 533", −66.77, −137.07, −64.87, ±34.20, ±36.10, 1.86 m and −104.67 are all gone.

**F4:** "nine bays" is right. `collection.md`'s gap matches the row in `spaces-b.ts:28-29`.

**The plan against the code and the record:**
- The layout: five bays west (floor 31.13/5.6) and four east (floor 25.77/5.6), with plain ends of 3.13 and 3.37 m.
- The porch's stretch lies inside the row's gap. The porch stands on the same middle (`weston-porch.ts:31`). The closure count is 129 at the merged head (`closure.test.ts:137`).
- The record's target, `112800b..13ff3a4`, has 15 files, and `515de57` and `04b5c2a` are as described.
- The reviewer pins match the runbook (`multi-cli-review.md:9-10`).
- The headings and labels match `work-docs.md:55-128`, and the registry entry is right.

**Where the merge meets this change:**
- `placement.test.ts:86-88`: the Weston zones still follow `WESTON_DOOR`.
- `reach.test.ts`: only R8 and R9 added to its route list.
- The devlog: work unit 19's entry is still on top.
- The spec: the merge changed other items only.
- Nothing refers to `clearOf` or the old Z.

**Asides:**
- Review 0's report puts the pier's court face at −137.2. It is −137.0, so the court shows 1.83 m of the west plain end, and the pavilion stands 2.03 m east of the model court's middle. Nothing in the repairs depends on it.
- Finding IDs start at F1, where `work-docs.md:130` says F0, as in work unit 18. Renumbering would break the existing citations.

**Not checked:**
- The photographs themselves (see F6).
- Any render of the repair; the record says the shots are pending on the merged tree.
- Any gate; I ran none.

##### Read outside the diff

- **Repo rules:** `AGENTS.md` (whole); `docs/policies/local-rules.md`; `docs/learning/lessons.md`.
- **Core:**
  - `src/model/core/shapes.ts:76-87`
  - `wings-walls.ts:1-190`
  - `constants.ts` (whole)
  - `materials.ts:39`
  - `core.test.ts:1-96`
  - `plan-data.ts:12-33`
  - `galleries.ts:1-40`
  - `weston-porch.ts:26-31`, `:95`, `:104`
  - `wings.ts:44-65`
- **Library and build:**
  - `src/model/lib/cornice.ts` (whole)
  - `sweep.ts` (whole)
  - `src/build/kit.ts`, `batch.ts`, `motion.ts` (whole)
  - `sequence.test.ts:25-26`, `:187-190`
  - `src/model/palette.ts` (searched for textures)
  - `src/model/closure.test.ts:120-149`
- **Roche-south:**
  - `src/model/roche-south/kravis.ts` (whole)
  - `blocks.ts:65`
  - `shapes.ts:36-69`
  - `poly.ts:20-35`
- **MMW and frame:**
  - `src/model/mmw/party-walls.ts:1-151`
  - `dims.ts:53`, `:91`, `:140-157`
  - `src/model/frame.ts:38-49`, `:109`
- **Collection and routes:**
  - `src/model/collection/placement.test.ts:11-49`, `:84-101`
  - `spaces-b.ts:18-30`
  - `src/model/hunt/routes.ts:17`, `:122-129`
- **Docs:**
  - `docs/research/interior.md:296-338`
  - `docs/work/18_weston-leaves/plan.md:31-45` and its review tables
- **Fleet:** `../fleet/docs/work-docs.md` (whole); `../fleet/docs/skills/multi-cli-review.md:9-10`.
- **Main checkout's ignored cache:** `research/cache/README.txt`; in `lm_features.json`, the main-floor polygons of galleries 523–536 and 548 and the door features at z −16.7..−13.2.
- **Git:**
  - `20e9547:src/model/core/weston-facade.ts`
  - `git diff 04b5c2a 62ca6a1`: its file list, and its changes to `reach.test.ts`, `spec.md` and `placement.test.ts`
  - the file lists of `13ff3a4`, `515de57` and `04b5c2a`
  - the worktree's uncommitted diff to `interior.md`

## Findings and disposition

The IDs go on from review 0's; Codex's F5 and Claude's F7 are one finding, here F5, and Claude's F5, F6, F8 and F9 are here F6 to F9.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F5 | `interior.md` gives the court's ends (1.2 m and 4.2 m past the model's front) as "the map's front's", where the paragraph's front galleries end 3.16 m short on the west and 2.22 m past on the east (minor; Codex F5, Claude F7) | Accepted | The sentence gives the galleries and the court apart, with both pairs of figures |
| F6 | The facade's header, the constant's comment, the devlog and the plan still describe the map's front as five bays each side, which F3's reading of the photographs contradicts (minor; Claude F5) | Accepted | The header and the constant say ±34.18 m is as long as the pavilion and five of the model's bays each side, and the header names the photographs' one arched bay east of the pavilion and the other design beyond, for which the model's further bays stand in; the devlog drops "as the map has them"; the plan rests the symmetry on the middles |
| F7 | The new readings of #33 and #35 disagree about the stretch just east of the porch, and give no size (minor; Claude F6) | Accepted: #35 read again at its full 2448 × 3264, and #33's transition at its full 6000 × 4000 | #35 shows, between the colonnade nearest the camera and the porch, nearly edge-on, the arched bay #33 sees east of the porch: its rusticated voussoirs and a stone roundel over a main floor of stone piers. #35's entry and `interior.md` say so, both readings give their size, and "not arched bays" is gone |
| F8 | The west plain end's cornice, like the front's other trims, runs to −138.3, 0.1 m past the Kravis Wing's park face at −138.2, so its end stands 0.1 m out there (nit; Claude F8) | Recorded, not changed: −138.3 is the model's west face of the core (`frame.ts`), and aligning the two lines is another unit's | `interior.md` records the stub with the other trims' |
| F9 | The plan dates the pavilion's old place to work unit 3, where the core's first modelling (2026-10-11) set it (nit; Claude F9) | Accepted | The plan says so |

## Verification

On `62ca6a1`, through `tmp/gate.sh`: `npm run verify` (744 unit tests; typecheck; lint; build; 126 e2e in 10.3 min, Weston's swing at most 9.1 ms of work); `routes.spec.ts` three runs in a row at 1× (14 tests passed each, 1.6 to 1.7 min) and three in a row at 4× (12 passed and the two frame budgets skipped, 2.1 to 2.2 min each); and `npm run shots` (64 images; the model 27,320 pieces, 746 meshes, 1,601,268 triangles at t = N), compared image by image with the owner's gallery set, main's at `59313d0` (`35b604f` adds docs only): 34 of 64 within 9 of 255 in every channel, the other 30 the same images as against `9e47b70` before the merge, with the same changed pixels, all along Weston's front, read as before. The repaired plain ends' cornice, which no standard shot frames, rendered from the court at its two ends looking up (Z −80 toward −70.7 and −127 toward −136.7): the cornice runs unbroken from the last bay over each plain end to the end wall.

On the repairs above (the working tree of the next commit), which change comments and records only: `npm run verify` through `tmp/gate.sh` (744 unit tests; typecheck; lint; build; 126 e2e in 11.0 min, Weston's swing at most 7.7 ms of work).

## Round outcome

Both reviewers approve: Codex with one minor finding, Claude with two minor findings and three nits, one of them Codex's. All five are accepted, F8 recorded rather than changed, and repaired in the next commit; they touch comments and records only, so no further review round is held.
