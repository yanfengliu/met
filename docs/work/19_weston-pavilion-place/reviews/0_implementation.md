# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `13ff3a4` ("Move Weston's pavilion and door to the floor map's place (work unit 19)"): the diff `112800b..13ff3a4`, 15 files. In code, `src/model/core/constants.ts`, `weston-facade.ts`, `weston-porch.ts`, `galleries.ts`, `wings.ts` and `scripts/capture.ts`, with comments in `src/model/collection/spaces-b.ts` and `src/model/hunt/routes.ts`; in tests, `src/model/closure.test.ts`, `src/model/core/core.test.ts`, `weston-door.test.ts` and `src/model/door-fit.test.ts`; in docs, `docs/design/spec.md`, `docs/research/interior.md` and `docs/devlog/summary.md`. The unit's plan was not in the diff: the fleet's allocator was then blocked by work unit 16's review records, which another session repaired.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u19-r0/` (ignored, where the raw captures stay): the change, the map's evidence and its frame, five lenses (the evidence and arithmetic; the facade's layout code; removing `clearOf`; the tests' honesty and bounds; the records against the code), a findings format with file and line, and a request to run no test, browser or build while the unit's gates ran. The diff came on stdin. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran and read again after, show no change by either.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. It read the main checkout's decoded map cache to check the transform; two of its citations outside the diff, checked: `src/model/roche-south/kravis.ts:26` (the court's extent) and `tests/e2e/route-places.ts:80` (`doorPlan`). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 79 tool calls (45 Grep, 28 Read, 4 Bash, 2 Glob), none naming the run folder or fleet's tree; it read the decoded map's features in the main checkout's ignored cache and ran nothing.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve — no actionable defects found in `13ff3a4b5e9e56cc61b7f4c446ca22e18d1dcc89`.

**Checked and sound**

- **Placement and layout:** the door midpoint is −100.97, a 2.68 m eastward move. Five west bays and four east bays leave fills of 3.13 m and 3.37 m. Windows, trim, quoins and inter-bay strips follow the resulting layout. [weston-facade.ts:28–208](src/model/core/weston-facade.ts:28)
- **Porch and surrounding geometry:** the porch spans Z −104.32..−97.62. Its shared centre keeps the masonry, doorway, lining and railing aligned; I found no new conflict in the adjoining walls, slabs, roof or court placements. [weston-porch.ts:80–104](src/model/core/weston-porch.ts:80)
- **Removing `clearOf`:** the nearest partition faces remain approximately 1.89 m west and 1.88 m east of the opening. The passage check retains 116 rays; the described 16-ray failure at the old centre agrees with the wall coordinates. This is a sampled passage check, and I did not rerun its red proof. [weston-door.test.ts:135–150](src/model/core/weston-door.test.ts:135)
- **Counts and dependent positions:** one removed bay accounts for six glass sheets. The declared table sums to 10,017 across 52 pairs. The porch allowance, capture camera, R7 endpoint, clearance zones and e2e door positions follow the move.
- **Records:** the main checkout’s decoded cache confirms the coordinate transform and door midpoint. The other recorded extents agree within a few centimetres. The east boundary and missing fifth east bay remain explicitly open.

**Read outside the diff**

Among the unchanged files and ranges inspected:

- `src/model/core/plan-data.ts:15–71` and `layout.ts:12–68` — partitions, gallery bounds and clipping.
- `src/model/core/wings-walls.ts:66–97, 161–189` — window dimensions, placement and slabs.
- `src/model/core/arches.ts:109–217` — wall openings and lining.
- `src/model/roche-south/kravis.ts:26–91` — court extent, roof and floors.
- `tests/e2e/route-places.ts:79–110` and `routes.spec.ts:289–340` — geometry-derived door positions and walks.
- `src/model/collection/placement.test.ts:79–84` — door clearance zones.

Read-only review: no files edited; no tests, builds or browsers run. Runtime, visual and frame-budget verification remains with the worker’s gates.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** The move, the bay layout and the removal of `clearOf` are correct, and no floor-map wall stands in the doorway or its passage. I found three minor findings and one nit. All four are in the records or the plain end walls; none is in the door's place. Nothing was run, as the brief asked.

###### F1. The map figures come from the 0.1 m digest, and three figures worked out from them are off (minor)

- **Where:** `src/model/core/constants.ts:76`, `docs/research/interior.md:334` and `:336`, `docs/design/spec.md:176`, `docs/devlog/summary.md:5`, `src/model/core/weston-facade.ts:10`.
- **What is wrong:** the figures −135.17, −66.77, −137.07, −64.87 and gallery 529's −104.67..−97.17 are the rows of `research/cache/lm_floor1.txt` (lines 137–144 and 158, rounded to 0.1 m) less 85.97, written to 0.01 m. The decoded features in `lm_features.json` give different ends:

  | Feature | json z | World Z |
  |---|---|---|
  | Gallery 526 (west end) | from −49.17 | −135.14 |
  | Gallery 529 | −18.73..−11.25 | −104.70..−97.22 |
  | Gallery 533 (east end) | to 19.19 | −66.78 |
  | Court, gallery 548 | −51.13..21.14 | −137.10..−64.83 |

  The repo already holds two of these:
  - `constants.ts:29` says "the map's rooms stop at Z −135.14".
  - `interior.md:305` gives the court as −134.00..−61.73 in the map's frame, which is −137.10..−64.83 in the world frame.
- **Effect on the records:**
  - `interior.md:334` says the 528/529 wall's face stands "1.86 m west of the doorway's opening". The model builds that wall on `plan-data.ts:21`'s line Z −104.7, 0.4 m thick (`galleries.ts:18`). Its face at −104.5 is 1.885 m from the opening's edge at −102.615. The 1.86 m comes from the digest's −104.67.
  - The court ends 4.17 m past `EAST_Z`. So "4.1 m", which appears in five places, should be 4.2 m.
  - The court runs 1.95 m past gallery 533, not 1.9 m.
  - The half-widths are ±34.18 m and ±36.14 m, not ±34.20 and ±36.10.
- **The decision itself holds.** The door's middle is −100.97 (its bbox is z −16.76..−13.24). Gallery 529's middle, the galleries' middle and the court's middle are −100.96, −100.96 and −100.965. The 34.18 m half-width still matches 6.2 m plus five 5.6 m bays to within 2 cm.
- **Two smaller points in the same records:**
  - "526 to 533" takes in gallery 530, which stands behind 529 (json X −40.4..−36.1), not on the front.
  - The constant is tagged "M:". This file tags map figures "map:" (`constants.ts:35-38`, `:59-60`), and `interior.md:5` classes map positions as derived.
- **Repair:**
  - Take the figures from `lm_features.json`, as `interior.md:340` says plan numbers are checked.
  - Write 1.885 m (1.89), 4.2 m, 1.95 m, ±34.18 and ±36.14.
  - Name the front's galleries as 526–529 and 531–533, and tag the constant "map:".

###### F2. The plain end walls keep a cornice sized for a 0.45 m sliver (minor)

- **Where:** `src/model/core/weston-facade.ts:180` lays the cornice over the plain end walls (the fills); `:159` and `:168` lay each bay's.
- **What is wrong:** each fill gets a stone box 0.3 m proud. Each bay gets the `cornice-plain` moulding, 0.75 m proud, which ends in a cap (`src/model/lib/core.test.ts:50`).
  - **Before:** the fills were 0.45 m wide. The west fill and the bays' cornice end at −137.85 stood inside the Kravis pier (X −50.7..−49.7, Z −138.2..−137.2; `kravis.ts:109`, with `roche-south/shapes.ts:56-66` and `poly.ts:27-32` putting the pier's body toward +Z).
  - **Now:** the court shows 2.03 m of the west fill, from the pier's face at −137.2 to −135.17, and all 3.37 m of the east fill. At −135.17 and −72.37 the cornice ends in its cap and steps back 0.45 m to the box.
- **When it shows:** in any orbit or walk view along the front from either end of the court. The `doors-weston` shot does not frame it.
- **Repair:** lay the bays' profile over each fill, as `pavCornice` (`:160`, `:179`) is laid over the pavilion. Or record the step as a simplification.

###### F3. No photograph is named for the changed front (minor)

- **Where:** `docs/research/interior.md:334-336`, `docs/design/spec.md:176`, `docs/devlog/summary.md:5`.
- **What is wrong:** `docs/policies/local-rules.md:6` requires a modelling change to name the reference images it was compared with.
  - **What changed in view:** the pavilion moves 2.68 m along the court, one bay goes from the east side, and blind ends of 2.0 m and 3.4 m come into view. The model's court runs Z −137.2..−69.0 (`kravis.ts:28-30`), so the pavilion now stands 2.13 m east of the court's middle.
  - **What the records name:** only the floor map, plus the estimates that `constants.ts:74-75` credit to an unnamed "Petrie Court photo".
- **Evidence that a comparison is possible:** both court photographs look along the whole front and are marked viewed. #33 looks east from the court's west part (`interior-images.md:107`), and #35 looks west from the east balcony (`:111`). They could confirm five bays each side and show the real ends.
- **Repair:** compare #33 and #35 at native size with the new layout. Record in `interior.md` what they show of the bays each side and of the ends, or that they cannot show them.

###### F4. Two descriptions still give the old layout (nit)

- `src/model/core/weston-facade.ts:92` says "ten bays"; there are nine now (`:31-38`).
- `docs/research/collection.md:47` says the court's row has "none from Z −109 to −98, where the Weston door's passage opens".
  - This diff rewrote those figures in `spaces-b.ts:19-20` and `routes.ts:123` as "a gap from Z −112.5 to −94.5".
  - The moved porch now reaches −97.6, past the record's −98.
- **Repair:** write "nine bays", and describe the gap in `collection.md` as `spaces-b.ts` now does.

###### Checked and sound

- **The axis.** The plan data confirms −100.97 independently of the door's figures:
  - Gallery 610 above runs Z −105.8..−96.1 (`plan-data.ts:65`), so its middle is −100.95.
  - The map has doors on the same axis: on the second floor at X −43.1 (Z −102.1..−99.8, `:52`), and on the main floor at X −36.55 (−101.85..−100.05, `:30`) and X −32.3 (−101.85..−100.1, `:31`).
- **Layout arithmetic.**
  - Bay counts: five west (31.13 / 5.6 = 5.56) and four east (25.77 / 5.6 = 4.60), with no rounding edge.
  - Bay centres run −132.37 to −109.97 and −91.97 to −75.17. The fills are 3.13 m and 3.37 m.
  - The walls' build order is still 4 to 0 on the west and 0 to 3 on the east. The fills' order 5 still comes after the bays.
  - In `westonOpenings` the pavilion's hard-coded order 5 has no effect: that step staggers by Z, which ignores the order argument (`stagger.ts:33-44`).
  - Pilaster strips stand at all nine bay edges away from the pavilion. Everything centred on the pavilion reads `CENTRE_Z`.
- **Closure count.** Each bay has six panes (`weston-facade.ts:198-202`). 129 = 72 panes in the plain elevations + 9 × 6 + 3 in the pavilion. The `SHEETS` table sums to 10,017 in 52 pairs.
- **The porch's stretch in `core.test.ts`.** −104.47..−97.47 covers the porch's ±3.35 m reach. The comments' −104.3..−97.6 and −102.62..−99.33 are right.
- **Removing `clearOf`.**
  - No map wall running along X from the front lies between Z −104.7 and −97.25 (`plan-data.ts:21-22`).
  - No wall running along Z within the passage's 1.5 m crosses it. The nearest is at X −46.35, Z −97.2..−95.25.
  - `wings.ts:118` was the only caller that passed a doorway, and every import left in `galleries.ts` is still used.
  - The red proof reproduces. With the door at −103.65, the rays from 0.9 to 1.2 m west of the axis (Z −104.55 to −104.85) fall inside the wall's −104.9..−104.5. That is 4 positions × 4 heights = 16 rays, meeting it at X −48.70.
- **Everything that follows `WESTON_DOOR`.**
  - The collection's zones (`placement.test.ts:82-84`), R7's end at (−55.16, −100.97), and the unit walk's start and way back all follow it.
  - So do `settle.test.ts:206`, `doors.test.ts:126` and the e2e door plan.
  - The Meleager statue (208619, 0.54 × 0.43 m, `catalogue.ts:59`) at Z −94.5 stays well over 1.35 m from the passage zone.
  - The capture camera moved by exactly 2.68 m, and its line of sight crosses the artwork row at Z −98.66, inside the gap.
- **Behind the front and above it.**
  - The pavilion has no main-floor windows, so the walls on Z −104.7 and −97.25 that meet its back are clear.
  - The great round window now sits in the middle of gallery 610, whose cross walls start at X −46.3 (`plan-data.ts:47-48`).
- **Walls seen through windows: no net change.**
  - The map's walls on Z −127 (main floor, `plan-data.ts:17`) and −127.05 (second floor, `:44`) now stand behind the middle window and the arch of the bay at −126.77.
  - The wall on −90.65 still meets a window, as before. The walls on −118.8 and −83.35 no longer do.
- **The facade step's camera.** Its target at Z −104 (`wings.ts:54`) is the middle of the facade, which is still −103.65. It frames the whole front, not the pavilion, so it needs no change.
- **A dated figure in a red proof.**
  - `docs/learning/gate-proofs.md:76` and `:92` record the walker "held at X −37.10". That is where the old axis met the wall on X −36.55.
  - On the new axis the map's doors at X −36.55 and −32.3 let the walker on. A re-run of the proof would still go red, but would stop the walker somewhere else.

###### Read outside the diff

- `src/model/core/`:
  - `plan-data.ts:1-72`
  - `layout.ts:12-19`
  - `wings-walls.ts:40-138`
  - `wings.ts` and `constants.ts` (whole)
- `src/build/stagger.ts:29-60`
- `src/model/roche-south/`: `kravis.ts:26-129`, `shapes.ts:52-67`, `poly.ts:27-32`
- `src/model/collection/`: `placement.test.ts:60-97` and `:353-378`, `catalogue.ts:59`
- `src/model/hunt/`: `routes.ts:95-131`, `routes.test.ts:200-217`
- `tests/e2e/routes.spec.ts:1-60`, `:160-178` and `:287-342`
- `src/model/palette.ts:43-55` and `:102`
- `src/model/frame.ts:38` and `:47-49`
- `src/cited-images.test.ts:475-497`
- `docs/research/`: `interior.md:1-30` and `:300-337`, `interior-images.md:105-125`, `collection.md:47`
- `docs/learning/gate-proofs.md:75-92`
- `docs/design/spec.md:1-40` and `:273`
- The main checkout's ignored cache: `research/cache/README.txt`, `lm_floor1.txt:137-158`, and the door and gallery bboxes in `lm_features.json`

## Findings and disposition

Codex found nothing; the IDs are Claude's.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | The map's figures came from the 0.1 m digest: the decoded features give the front's galleries as −135.14..−66.78 (±34.18 m) and the court as −137.10..−64.83, so the court ends 4.2 m past `EAST_Z`, not 4.1, it runs 1.95 m past gallery 533, and the 528/529 wall's face stands 1.89 m from the opening; "526 to 533" takes in 530, which stands behind 529; the constant was tagged `M:` where map figures are tagged `map:` (minor) | Accepted; the door's −100.97 stands (the features' middles are −100.96 and −100.965) | `constants.ts`, `interior.md`, the spec, the devlog and the facade's header give the features' figures, 4.2 m, 1.89 m, ±34.18 and ±36.14 m, name the front's galleries 526 to 529 and 531 to 533, and tag the constant `map:` |
| F2 | The plain ends kept a stone cornice box 0.3 m proud, sized for the old 0.45 m sliver, where the bays' cornice stands 0.75 m proud, so the cornice steps back at −135.17 and −72.37 in views along the court (minor) | Accepted | Each plain end carries the bays' cornice, drawn out along its path to the end's width; it is the bays' own geometry, so the core gains no mesh |
| F3 | No photograph is named for the changed front, as the local rules ask (minor) | Accepted | #33 and #35 read again at native size against the new layout: three-window arched bays west of the porch as far as #33 sees; east of the porch one arched bay, then a front of another design to the court's east end (dark granite columns under a stone entablature, tall blind stone panels above), where the model has three more arched bays and a plain end. Recorded in `interior.md` and the two photographs' entries; the east end stays open for the owner, with that reading |
| F4 | `weston-facade.ts` still says "ten bays", and `docs/research/collection.md` still gives the court row's old gap (nit) | Accepted | "nine bays"; the gap from Z −112.5 to −94.5, as `spaces-b.ts` gives it |

## Verification

On `13ff3a4`'s tree, before the review: `npm run verify` through `tmp/gate.sh` (82 files, 735 unit tests; typecheck; lint; build; 126 e2e in 11.4 min, Weston's swing at most 8.5 ms of work), and the shots against main's at `9e47b70`: 34 of 64 within 9 of 255 in every channel, the other 30 along Weston's front only (`preset-int-petrie-court` and `doors-weston` broadly, read whole; 28 aerial, chapter, floor, cut, plan and interface views in 10 to 859 pixels, read as crops before and after).

On the repairs (`515de57`'s tree): the closure, core, door-fit, cited-images, sequence and Weston door tests, typecheck and ESLint on the changed files, and `npm run verify` (82 files, 735 unit tests, 126 e2e). On that tree `routes.spec.ts`'s first run at 1× failed one test, the walking frame budget in the Leon Levy and Shelby White Court, a GPU-synced render at 18.81 ms against 16.7, far from Weston's front, and the next runs passed; main moved on meanwhile (work unit 15's follow-up, which changes the routes), so the routes runs three in a row and the shots are taken again on the merge with it.

## Round outcome

Codex approves with no findings; Claude approves with three minor findings and a nit, none blocker or major. All four are accepted and repaired in the next commit, which review 1 reviews.
