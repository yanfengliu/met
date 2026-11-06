# Review 1: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `de997c7` ("Answer review 0 of work unit 23: the map's missing runs, the second-floor doors on the outer arches, the cross hall's back wall between its side walls"): the diff `ff95d73..de997c7`, the repairs of review 0's findings, in code `src/model/frame.ts`, the core's `plan-data.ts`, `vaux-east.ts` and `vaux-sides.ts`, the Hunt wing's `dims.ts`, `stair.ts`, `galleries.ts` and `routes.ts`; in tests `src/model/hunt/hunt.test.ts` and `src/model/closure.test.ts` (a comment); in docs `docs/research/exterior.md`, `interior.md`, `collection.md`, the plan and review 0's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-05 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u23-r1/` (ignored): review 0's record to read first, the repairs finding by finding, four lenses (each repair against its finding; the new test's honesty; the map data against the cache; new faces, gaps, budgets and records), the findings format, and a request to run no test, browser or build. The diff came in the prompt. The worktree's `git status`, saved before both lanes ran and read again after, shows no change by either; nothing in the worktree was edited while they ran.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start; it ran 21 reads, three of which exited non-zero, and read the map cache in the main checkout. Its citations outside the diff, checked: `src/model/core/galleries.ts:14–56` and `src/model/core/vaux-arch.ts:90–152` (runs clipped and dropped under 0.6 m; stones crossing a cut dropped whole). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 76 tool calls (44 Grep, 27 Read, 4 Bash, 1 Glob), two of which the permissions refused, no subagents, none naming the run folder or fleet's tree; it read the same cache with Grep. Its citations outside the diff, checked: `docs/research/exterior-images.md:198` (#67 at the Robert Wood Johnson Jr. Gallery's entrance, on the right after turning left at the top of the Grand Staircase), `src/model/hunt/galleries.ts:103–106` (gallery 690's walls) and `src/model/hunt/dims.ts:174` (`GALLERY_OUTER_X`, 9.75, unread). It edited nothing and ran nothing.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve — no actionable defects found in `de997c7`.

**Checked and sound**

- **F1/F4:** The five restored runs match the cached map on the existing snapped axes and preserve their door gaps. Clipping leaves 1.91–2.31 m of solid wall. The ineffective stub is removed. See [plan-data.ts:36](src/model/core/plan-data.ts:36), lines 38, 41, 57–59.
- **Side-wall doors:** The three boxes leave the intended second-floor opening, with a continuous sill at L2 and no reversed or overlapping box extents. The adjacent partition narrows the approach to 0.86 m, still wider than the walker’s 0.70 m diameter. See [vaux-sides.ts:94](src/model/core/vaux-sides.ts:94).
- **F2/F3:** The back wall now ends at X ±9.55, adjoining the partitions rather than overlapping them. The relocated doors span X 11.07–12.83 and its mirror, clear of the partitions’ outer faces at ±9.95. `secondCut` follows both doors correctly, and the northern Hunt partition’s additional opening aligns without intersecting its existing doorway. See [stair.ts:173](src/model/hunt/stair.ts:173), [vaux-east.ts:49](src/model/core/vaux-east.ts:49), and [galleries.ts:100](src/model/hunt/galleries.ts:100).
- **New test:** Triangle transformation, rectangle clipping and the 2 cm inset are consistent. Restoring the old door positions would expose positive-area intersections with the back wall and both partitions, supporting the reported red proof by inspection. Its coverage is deliberately limited: faces within 0.1 mm of `BACK_Z`, Hunt-area pieces, and rectangular opening regions; gallery 600’s curved head above the springing is excluded. It does not establish clearance throughout each passage. See [hunt.test.ts:297](src/model/hunt/hunt.test.ts:297).
- **F5/F6:** The records now disclose the unequal wall thicknesses, the hall’s lost 0.8 m of depth and the alternative map reading. The cavity references and obsolete closure proof are corrected. The repairs retain the central R5 passage and main-floor R9 geometry.

**Read outside the diff**

- `src/model/core/galleries.ts:14–56` — clipping, minimum run length and wall construction.
- `src/model/core/layout.ts:12–19` — interior bounds.
- `src/model/core/vaux-arch.ts:90–152` — stone omission and opening construction.
- `src/model/core/arches.ts:150–220` — wall faces, reveals and lining.
- `src/model/lib/wall.ts:293–370` — back-wall geometry.
- `src/model/hunt/routes.test.ts:191–196,236–250` and `src/model/reach.test.ts:229–241` — route checks and reach targets. These do not specifically require traversal of the newly relocated doors.
- Main-checkout `research/cache/README.txt:1–5` and `lm_features.json:1` — coordinate conversion, restored runs, doors and nearby room edges.

No files changed; no tests, builds or browsers run. Rendered appearance and measured budgets were not independently verified.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: request changes.** The repairs fix review 0's findings on the north side, in the map data and at the cross hall. One major finding remains: the mirrored south second-floor door has no source, and it cuts the head of the 1880 arch that #67 most likely shows whole. The other findings are minor or nits. I ran no test, build or browser and edited no file. I read the map cache in the main checkout with Grep (world X = x + 3.82, Z = z − 85.97). The record leaves the full gate on this commit for this round's record, so I had no results to check.

#### Findings

##### 1. The south second-floor door rests only on symmetry, and it cuts the arch #67 shows whole — major
**Where:** `src/model/frame.ts:103`; `src/model/core/vaux-east.ts:46`, `:66-71`, `:101-106`, `:145`; `docs/research/exterior.md:45` and `:160`.

**What is wrong:** F3 said both doors had lost their basis in the map. The repair found a new basis for the north door only: the map's door on −65.61. It kept a south door at X −12.83..−11.07, "mirrored, as the front is symmetric (the map draws none there)". Today's doors were cut long after 1880, so the 1880 front's symmetry tells us nothing about them.

**Evidence:**
- **The map has no south door.** Its floor-2 line on −66.78 runs unbroken from X −1.75 to −51.26 (cache uid 638422165583).
- **The north door is in the map.** There the same line stops at X 11.07 (uid 3898721035) and starts again at 12.83 (uid 215158161495). The door on −65.61 (uid 237435081177) fills that gap, and gallery 600's polygon runs out through it.
- **The south door opens into gallery 690.** On the map 690 is uid 934476845032 (X −39.56..−9.79, Z −65.63..−56.88), and it is the room the door opens into (`hunt/galleries.ts:103-106`). The map draws its west edge on −65.63 with no door (uid 722985209315).
- **#67 is in 690.** `exterior-images.md:198` puts the surviving arch "at the entrance of the Robert Wood Johnson Jr. Gallery … on the right at the start of the exhibition after turning left at the top of the Grand Staircase". That is 690's west wall next to the cross hall.
- **Only one 1880 arch falls in 690's X range.** It is the south outer arch at X −12, whose head spans X −14.5..−9.5. The inner arch's head (X −8.3..−3.3) stands behind the cross hall's back wall (X ±9.55).
- **#67 shows that head whole.** The record reads "a dark one at the crown" and "round a roundel filled with red brick".
- **The other reading doesn't save the door.** The record's phrase "the arch south of the axis nearest the stair" could mean the inner arch. Then the model hides from 690 the arch the article describes there. Either way, no source puts a door through the south outer head.

**Failure scenario:**
- In gallery 690 a visitor sees the south outer arch with a 1.76 m × 3.2 m door through its crown.
- `secondCut(−1)` takes the crown voussoirs, the middle of the moulded orders and the top of the dark ring (`vaux-east.ts:49-52`, `:145`). The roundel is dropped because the head is cut (`vaux-arch.ts:120`).
- The door also opens a way from 690 into gallery 600's strip that neither source shows.
- The repair moved this door from the arch's haunch to its crown, so it now sits right on the feature the photograph shows.

**Repair:**
- Drop the south door.
- Build the south outer head uncut, with a niche, as the inner pair are built: `archHoles(…, head = true)` and `lightHead('east')`/`darkHead('east')` with no cut, so its roundel shows.
- List seven openings in `eastOpenings`.
- Correct `exterior.md:160` ("today's second-floor doors cut the outer pair's heads") and [B2].
- If the owner wants the symmetric door anyway, record it as the owner's call.

##### 2. The new test sees only faces exactly on the plane, only in Hunt's steps, and only against its own copy of the hole list — minor
**Where:** `src/model/hunt/hunt.test.ts:302-326`, and `vaux-east.ts:64-74` set against `:98-119`.

**What is wrong:** The test does what it says, and it would be red for review 0's defect. It misses close variants of that defect:
- **A face just off the plane.** It reads a triangle only when all three corners are within 0.1 mm of `BACK_Z` (`:318`). This repo's usual fix for coplanar faces is a 1 cm offset (`vaux-east.ts:42`, `:81-82`). Apply that to the back wall and the side partitions (ending at `BACK_Z + 0.01`) and put the doors back at ±10.3. The doors are blind again, the two walls' faces are still coplanar with each other and flicker, and the test stays green.
- **A piece crossing the plane.** A Hunt piece reaching into the core within the containment's 0.3 m slack (`:35`, `:64`) has no face on the plane, so the test passes it.
- **An opening it doesn't list.** `eastOpenings` copies the wall's holes rather than sharing them, and the count check (`:303`) counts only its own output. A hole added to `vauxEastWall`, or one whose size drifts from its copy, goes unchecked. Blocks B and C's east walls also have holes right through on the same plane (`wings-walls.ts:60`, `:62`, `:82`). I found no Hunt face in any of them today.
- **A piece outside Hunt's steps.** The heads `secondCut` trims are core pieces, and no core test reads `SECOND_DOOR` or `secondCut`.

**Repair:**
- Build the wall's holes and `eastOpenings` from one list.
- Flag any piece whose world box meets an opening within a band in front of the plane (say `BACK_Z − 1e-4` to `+0.5`), and include the core's east trim in the check.
- Or cast rays through each door and require the first hit to be beyond the walker's 0.7 m.

##### 3. Comments cite review 0's findings by the wrong numbers — nit
**Where:** `plan-data.ts:9`, `stair.ts:172`, `hunt.test.ts:298` and `dims.ts:166`.

**What is wrong:** These comments use the Claude report's own numbers, not the record table's, so each points at a different row:

| File | Cites | Table row |
|---|---|---|
| `plan-data.ts:9` | F2 | F1/F4 |
| `stair.ts:172` | F1 | F2/F3 |
| `hunt.test.ts:298` | F1 | F3 |
| `dims.ts:166` | F3 | F5 |

**Repair:** renumber them to the table's IDs.

##### 4. `CROSS_HALL_SIDE_X` repeats an existing, unused constant — nit
**Where:** `dims.ts:170` and `:174`.

**What is wrong:** `CROSS_HALL_SIDE_X` and `GALLERY_OUTER_X` are both 9.75, and nothing in `src` reads `GALLERY_OUTER_X`. The same line is still a literal 9.75 in `podium.ts:58-59` and in `galleries.ts:74-76`, `:96-97`, `:101`, `:105-106`.

**Repair:** keep one name and use it everywhere.

##### 5. The side wall's new door starts in the middle of a partition — nit
**Where:** `vaux-sides.ts:56`, against the run at `plan-data.ts:56`.

**What is wrong:**
- The door starts at −68.85, the centre line of the run `[0, −68.85, ±11.8, ±14.8]`. That partition spans Z −69.05..−68.65.
- So the partition's end sticks 0.2 m into the door's west side, from Y 10.97 to 14.17.
- The door is 1.06 m wide in the wall but only 0.86 m clear where the strip meets it. The 0.7 m walker still gets through.

**Repair:** start the door at −68.65.

##### 6. Records — nit
- `vaux-east.ts:7` still says "Today's openings stay as they were".
- `frame.ts:102` says "the Hunt partition behind it", but only the north door has one.
- [B2] reads as if both doors follow "that map door".
- `plan-data.ts:8` says the five new runs lie "wholly past the old cut". Four of them start west of −69.9; they were left out because they lay within 1.45 m of −69.0.
- The `hunt.test.ts` header (lines 1-12) doesn't name the new check, its bounds or its red proof. AGENTS.md:59 puts these in the test file's header.
- `plan.md:16` and `:22-24` don't cover the repairs' scope.

##### 7. Hunt's back is open between the core's parapet and its gallery roofs — minor, older than this change (not counted in the verdict)
**Where:** `vaux-east.ts:113`, `frame.ts:49`, `roof.ts:133` and `:138-140`, `walls.ts:198-219`, `galleries.ts:82` and `:94`.

**What is wrong:**
- The east wall stops at 18.0 with no coping. Wings B and C reach 18.15.
- Hunt's flat roofs start at `BACK_Z`, with their plaster underside at 20.1.
- Nothing in Hunt's steps stands on −66.79 between those heights. So the second-floor rooms either side of the cross hall, and the attic over its ceiling, are open about 2 m at the top of their west wall.
- The cross hall's side partitions end on −66.79 and face west into that gap.
- The heights were the same on −69.0, so this is older than work unit 23. I didn't render it.

#### Checked and sound
- **`secondCut`, both sides:**
  - Local x is world X − 12 (`shapes.ts:87`).
  - The cuts run −0.96..0.86 (north) and −0.86..0.96 (south), from 0.53 to 3.79 m over the springing.
  - Crossed stones are dropped whole (`vaux-arch.ts:91-97`), so no stone is left in either door.
  - The impost band, 9.91..10.41, lies under the sill at 10.97.
- **The back wall at ±9.55:**
  - Its ends sit back to back with the partitions over its full height. The partitions rise to 20.1 against its 17.97, and their doors miss Z −66.79..−65.99.
  - The ceiling's extra 0.25 m lies inside the partitions, and the plates run under the wall.
  - The doorway and R5 are unchanged, and the old doors' strip (X 9.0..11.07) is now solid brick.
- **The side walls' three boxes:**
  - Their faces meet back to back at −68.85 and at `INNER_EAST_Z`.
  - The sill is flush with block A's slab (X ±13.6, `vaux-shell.ts:124`) and block C's (from X 14.5).
  - Block C's piece of the −68.85 run is 0.3 m long, so it is dropped (the minimum is 0.6 m, `galleries.ts:29`).
- **The Hunt partition's door:**
  - The pieces come out as [9.75, 11.07], [12.83, 26.07] and [28.07, 44.38].
  - The main floor is unchanged, and the 0.94 m slot has a floor (`galleries.ts:77`), so the walk runs straight through.
- **The test as built:**
  - As built it is green: no Hunt face lies on the plane inside an opening.
  - With the doors back at ±10.3 it goes red: the back wall's face (X 9.02..9.55) and the partitions' ends (X 9.55..9.95) fall inside the door.
- **Map data against the cache:**
  - **The five added runs and their door gaps:** uids 178900438546/623698463821, 930778969692/635498574439, 1020481763508, 272586587729/128621549288 and 152523167294/106857755878.
  - **The stub left out:** 986256159226.
  - **The side-wall doors:** 660602749453 and 691853982675.
  - **The room the run at X 30.1 closes:** the map's back-of-house room 328284722061, drawn with no door.
  - **Nothing else is missing** in the strip on either floor of blocks B and C under the 1.45 m rule.
- **Budgets:** no new mesh.
- **Record figures:** 1.96 m, 1.14 m, the hall at 6.25 m deep against the map's 7.05 m, `collection.md:61` against `placement.test.ts:90`, and R9's crossing at −70.29 against the posts at −75.06 all check out.

#### Read outside the diff
- **Repo rules:** `AGENTS.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`, `eslint.config.js`.
- **Core files:**
  - `src/model/core/vaux-arch.ts`, `constants.ts`, `layout.ts`, `galleries.ts` and `shapes.ts` (all)
  - `vaux-shell.ts:48-129` and `wings-walls.ts:40-190`
  - the unchanged parts of `vaux-east.ts` and `vaux-sides.ts`
- **Hunt files:** `roof.ts:100-165`, `walls.ts:176-227`, `podium.ts:36-75`, and the unchanged parts of `galleries.ts`, `stair.ts`, `dims.ts` and `hunt.test.ts`.
- **Other source:** `src/model/collection/placement.test.ts:1-125`, `src/build/kit.ts:10-18` and `:55-57`, `src/walk/walker.ts:47`, `src/model/frame.ts` (all).
- **Research:** `docs/research/exterior-images.md:197-198`.
- **Map cache:** `research/cache/README.txt`, and `lm_features.json` grepped over the strip on floors 1 and 2 and for the uids above.
- **Greps:** the core tests for `SECOND_DOOR` and `secondCut` (none), and `src` and `docs` for `GALLERY_OUTER_X`, 690 and Robert Wood Johnson.

## Findings and disposition

The IDs go on from review 0's: Codex found nothing to repair; Claude's seven findings are F7 to F13.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F7 | The south second-floor door rests only on symmetry: the map draws none, its line on −66.78 running unbroken south of the axis, and the door cuts the south outer arch's head, which #67 shows whole at the entrance of gallery 690, on the right after turning left at the top of the Grand Staircase (major; Claude) | Accepted | The south door dropped and the south outer head built whole, with its niche and its roundel, as the inner pair are (`vaux-east.ts`); `eastOpenings` lists seven openings; `exterior.md` section 9 and [B2], and `exterior-images.md` #67, say so |
| F8 | The new test reads only faces on the plane, only the Hunt wing's steps and only the module's copy of the hole list, so a face a centimetre off the plane, a piece crossing it or a stone the door's cut missed passes (minor; Claude) | Accepted in part | The test casts a grid of 9 by 9 lines through each listed opening, 5 cm in from its edges, from the wall's inner face to 0.5 m past its outer face, against every piece of the core's and the wing's steps; red with the door back at X 10.3 and 2.6 m wide (the cross hall's back wall and side partition) and with the north outer head not cut (its voussoirs); its header names the check, its bounds and its red proofs. The hole list stays the module's own, beside the wall's holes: a hole cut without being listed is not seen, as the header says |
| F9 | Four comments cite review 0's findings by the reports' numbers, not the table's (nit; Claude) | Accepted | Renumbered |
| F10 | `CROSS_HALL_SIDE_X` repeats the unused `GALLERY_OUTER_X`, and the line is a literal 9.75 elsewhere (nit; Claude) | Accepted | One name, `GALLERY_OUTER_X`, documented and read for every ±9.75 line in `galleries.ts`, `podium.ts` and `stair.ts` |
| F11 | The side walls' new doors start on the map's partition's centre line, −68.85, so its end stands 0.2 m into each (nit; Claude) | Accepted | The doors start at the partition's face, `−68.85 + PARTITION / 2` |
| F12 | Records: the east front's header, `frame.ts`, [B2], the map data's header on the runs the old cut left, the test's header, the plan's scope (nit; Claude) | Accepted | Each corrected |
| F13 | The Hunt wing's back stands open between the core's east wall, which stops at 18.0 m with no coping, and the wing's flat roofs, whose undersides are at 20.1 m; older than this unit (minor, not counted in the verdict; Claude) | Recorded | Out of this unit's scope (the plan); a follow-up |

These repairs are checked by the gates, the new test's red proofs and the renders, not by a third round of review (fleet canon R10): the major one drops a door the evidence does not show and builds its arch's head as the inner pair's are built.

## Verification

On `de997c7`'s content, through `tmp/gate.sh`: a first run of `npm run verify` failed one e2e test, `walk.spec`'s walking frame budget, the Great Hall's GPU-synced render 17.7 ms against 16.7, with the machine's CPU at 97% from other work (57 Node, 20 Claude and 12 Chrome processes) and the gate queue empty; rerun after waiting for the machine (the CPU still at 90% when it started), everything passed: `npm run verify` (755 unit tests; typecheck; lint; build; 127 e2e in 11.4 min), `npm run shots` (the model 27,286 pieces, 745 meshes), and `routes.spec.ts` with `walk.spec.ts` three runs at 1× (23 passed each, the Great Hall at 11.0 and 3.9 ms) and three at 4× (21 passed, the two frame budgets skipped).

On the repairs above, the commit that carries them: the new test red with each of its two mutations and green as built; the whole unit suite; renders at native size of the south outer arch from gallery 690 (its head whole, a dark voussoir at the crown, its roundel blind) and of the north door from the second floor's corridor; and through `tmp/gate.sh`, with the CPU at 27 to 34%: `npm run verify` (755 unit tests; typecheck; lint; build; 127 e2e in 10.3 min), `npm run shots` (26 of 64 within 9 of 255 of the owner's gallery set at `c75b0e9`, the other 38 where the core's east end, the cross hall, gallery 600, gallery 304, wing C's north front and the 1888 fin show; the model 27,286 pieces, 743 meshes and 1,596,109 triangles at t = N), and `routes.spec.ts` with `walk.spec.ts` three runs at 1× (23 passed each) and three at 4× (21 passed, the two frame budgets skipped).

## Round outcome

Codex approved with nothing to repair; Claude asked for changes: one major, one minor, five nits and one older minor finding not counted. All accepted and repaired in the next commit, F8 in part; F13 recorded for later.
