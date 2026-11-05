# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `0c99c1a` ("Carry Weston's front and the Petrie Court out to their real east end, so both end blocks match (work unit 22)"), against main at `b49ee35`, 22 files: in code `src/model/frame.ts`, the core's `constants.ts` and `weston-ends.ts`, the Kravis Wing's `kravis.ts`, `rockefeller.ts` and `blocks.ts`, the south link's `dims.ts`, `party-walls.ts`, `roofs.ts`, `plan-data.ts` and `steps-raised.ts`, `src/model/site/footprint.ts` and `src/model/hunt/routes.ts`; in tests `src/model/core/core.test.ts`, `src/model/mmw/mmw.test.ts`, `src/model/hunt/routes.test.ts` and a comment in `src/model/collection/placement.test.ts`; in docs `docs/design/spec.md`, `docs/research/interior.md`, `docs/research/exterior.md`, this unit's plan and the work registry.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-05 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u22-r0/` (ignored, where the raw captures stay): the owner's request and the evidence, the change file by file, what was left out on purpose (the core's own east face) and the fin that leaves from 1888, six lenses (the line and its users; the geometry at the new line; the walk; the tests' honesty; budgets and determinism; the records), the findings format, and a request to run no test, browser or build. The diff came in the prompt, taken three-dot against `origin/main`. The worktree's `git status`, saved before both lanes ran and read again after, shows no change by either; nothing in the worktree was edited while they ran (the shots and the load runs, which ran then, write only ignored folders).

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start; it ran 20 reads, one of them a search of its own memory file (`~/.codex/memories/MEMORY.md`) outside the worktree. Its citation outside the diff, checked: `src/model/hunt/walls.ts:202` (Hunt's walls step, 1899). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 91 tool calls (47 Grep, 37 Read, 5 Bash, one of which the permissions refused, 2 Glob), no subagents, none naming the run folder or fleet's tree. Its citations outside the diff, checked: `src/model/hunt/podium.ts:137` (Hunt's podium step, 1898), `docs/policies/local-rules.md:6` (a modelling change names the reference images it was compared with) and `src/model/collection/spaces-b.ts:21–22` (the old openings' gaps). It edited nothing and ran nothing.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve with findings — static review of `0c99c1a`; no production defect identified.

1. **The coping comparison can hide a gap — minor.**  
   [core.test.ts:134](src/model/core/core.test.ts:134) replaces the two east coping pieces with their enclosing bounding box. That loses information about continuity and each piece’s depth. For example, changing the second piece’s start from `back` to `back + 1` at [weston-ends.ts:249](src/model/core/weston-ends.ts:249) would leave a metre-long coping gap at Z −69..−68 while preserving the joined bounding box, material and compared piece count. Containment would also accept it. Assert the two expected coping boxes individually, including their meeting point at `EAST_Z` and the extension’s reduced depth. This counterexample follows from inspection; I did not execute a mutation.

2. **The exposed-fin period has conflicting dates — nit.**  
   [weston-ends.ts:17](src/model/core/weston-ends.ts:17), the test header, plan and `interior.md:351` say the extension stands beyond wing B until 1902. However, [hunt/walls.ts:202](src/model/hunt/walls.ts:202) builds the backing seam wall in **1899**, as `interior.md:355` and the spec correctly record. Use 1899 consistently for this geometry transition, distinguishing it from the wing’s 1902 completion.

**Checked and sound**

- The new line propagates through the Kravis geometry, Rockefeller north wall, south-link party walls, slabs, roof deck, penthouse and site polygons. The remaining core/Hunt Z −69 boundary is intentional.
- Both end blocks calculate to 19.75 m. The actual coping split stops its backing at the core’s east face; the extension meets the moved party wall.
- Keeping the core fixed is a reasonable bounded trade-off here. The resulting fin is explicitly disclosed in [interior.md:355](docs/research/interior.md:355), including its historical inaccuracy.
- R7 derives its turn and opening from the moved geometry. The passage clearance zone follows the wall; the unchanged Petrie preset retains its lateral clearance from the end block.
- The additional coping instance reuses the existing box and material. I found no new history-dependent build state. Existing budget limits remain intact, but totals and rendered appearance were not independently verified.

**Read outside the diff**

- [hunt/walls.ts:177](src/model/hunt/walls.ts:177), lines 177–218: seam geometry and construction date.
- [mmw/wings.ts:68](src/model/mmw/wings.ts:68), lines 68–71 and 121–133: slab extents.
- [collection/spaces-b.ts:18](src/model/collection/spaces-b.ts:18), lines 18–35: Petrie artwork placements.
- [reach.test.ts:229](src/model/reach.test.ts:229), lines 229–272: targets and closed-door world.
- [tests/e2e/routes.spec.ts:287](tests/e2e/routes.spec.ts:287), lines 287–341: Weston’s door walks.

No files edited; no tests, browser or build run.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** I found no blocker and nothing major. The geometry at the new line holds together and every user of the old line has moved. What's left is one judgment the owner should make, records that disagree with each other, and three test gaps.

#### Findings

**F1. The owner agreed to a bigger change than the one delivered, and the 1888–1899 fin contradicts a cited photograph** (minor)
- The open question the owner said yes to promised a move of the core's east face. The removed paragraph (`git show HEAD~1:docs/research/interior.md`, line 355) read: carrying the front and the court out "would move the block boundary with the Hunt block (`EAST_Z`)". This unit leaves `EAST_Z` at −69.0 (`src/model/core/constants.ts:11`).
- The cost is the fin: the east block's last 4.06 m standing alone past wing B's corner, 1.2 m thick and 18 m tall. It stands through the whole `weston-tuckerman-1894` chapter and into the Hunt chapter, until Hunt's podium (1898, `src/model/hunt/podium.ts:137`) and walls (1899, `src/model/hunt/walls.ts:202`).
- Heckscher fig. 35 (about 1895) shows the opposite: the south front reaching its south-east corner, with the east front turning it in the same design (`docs/research/interior.md:345`). The new paragraph (`interior.md:355`) admits "the real block ended at the wing's corner" but doesn't name fig. 35. The local rules ask that a modelling change name the images it was compared with (`docs/policies/local-rules.md:6`).
- My judgment: leaving `EAST_Z` alone is sound for this unit. Moving it would move Hunt's back rooms, the 1880 east front and routes R8/R9, and the cost is written down in the spec, `interior.md` and `weston-ends.ts`.
- Repair: name fig. 35 in `interior.md`. In the hand-over, put the choice to the owner in plain words: accept the fin, or a follow-on unit that moves `EAST_Z` toward the map's −66.79 (`exterior.md` section 9), which would shrink the unbacked stretch to about 1.9 m.

**F2. The records disagree on when Hunt's wall stands behind the fin** (minor)
- These say 1902: `src/model/core/weston-ends.ts:16-17`, `src/model/core/core.test.ts:21-22`, `docs/research/interior.md:351` and `docs/work/22_weston-front-extent/plan.md:23`.
- These say 1899: `docs/design/spec.md:176` and `interior.md:355`.
- The model has the podium behind the fin's ground storey from 1898 and the seam wall from 1899.
- Repair: use 1898/1899 everywhere.

**F3. The containment allowance past −69.0 is 0.3 m looser than the geometry, the spec and the plan** (minor)
- `core.test.ts:92` lets a piece reach up to X −49.4, i.e. 0.3 m behind the front's face (`BLOCKS.x0 + SLACK`).
- The spec says "wholly in front of the front's face" (`spec.md:39`), and the plan's acceptance criterion says "in front of the front's face" (`plan.md:32`).
- Behind the face there is solid wall: Hunt's seam wall, X −49.7..−48.5 (`hunt/walls.ts:183-195`).
- Failure case: `boxOut(kit, b, stone, -0.25, PROJ + STANDS.coping, …, back, length, 11)` puts 0.25 m of coping inside Hunt's limestone and the test stays green. Only the 1 m red proof is caught.
- Repair: tighten to `BLOCKS.x0 + 1e-6`, or 1 cm if the cornice moulding's back sits slightly behind the face, then re-prove red.

**F4. A comment about the court wall's openings is now false** (minor)
- `src/model/collection/spaces-b.ts:21-22` puts the relief "between two of its openings (Z −117.7..−110.3)" and the vitrine bust before the wall at "(Z −95.7..−88.3)". Those were the gaps between the old openings, centred on −103.0.
- With the openings now centred on the door (`roche-south/kravis.ts:117`), the solid stretches are −115.67..−108.27 and −93.67..−86.27. The first old range now overlaps the opening at −117.47 (−119.27..−115.67).
- The artworks themselves are fine. The relief (1.257 m wide, at −114.0) and the vitrine (at −92.0) still stand before solid wall, and `placement.test.ts:9` checks there is a wall behind a hung piece.
- Repair: fix the numbers, or describe the gaps in terms of `COURT_OPENINGS_Z`.

**F5. The mirror test can't see the shape of the east coping's last 4.06 m** (nit)
- `core.test.ts:129-135` merges the two east coping boxes into one bounding box. The first box already sets the X range −50.98..−48.7.
- So if the last 4.06 m lost its front overhang (`weston-ends.ts:249` written with `PROJ` instead of `PROJ + STANDS.coping`), the coping would show a 0.08 m step at Z −69.0, and no test would catch it.
- Repair: check that each east coping piece's front X equals the west coping's, and that the second piece's back is `B_SOUTH_X`.

**F6. The court gutter now runs into Hunt's seam wall** (nit)
- `kravis.ts:179` (`X1 + 0.28`, now running to `Z_EAST`) puts 0.28 m × 0.45 m of the gutter inside Hunt's wall over Z −69..−64.94.
- Its comment says "onto the coping", which is no longer true along that stretch.
- It's invisible and inside the area's 0.3 m tolerance (`roche-south/blocks.ts:62`), so no gate sees it.
- Repair: split the gutter at `EAST_Z` with its back at `X1` east of it, or record the overlap as accepted.

**F7. Nothing tests that the court itself is symmetric about the door** (nit)
- The court's west end exists twice as separate values: the literal `WESTON_WEST_END_Z` = −137.0 (`constants.ts:85`) and Kravis's computed `Z_IN` (`kravis.ts:31`).
- `core.test.ts:113` ties the east end to `KRAVIS_EAST_Z`, but nothing ties the west end to `Z_IN`. So the "openings centred on the door" claim is untested.
- Repair, one line: assert that the mean of `COURT_OPENINGS_Z` equals `WESTON_PAVILION_Z`.

**F8. The spec overstates the match** (nit)
- `spec.md:176` says "mirror images piece for piece". The test (`core.test.ts:106`) and `interior.md` add the exception "but for the east block's coping"; the spec should too.

#### Checked and sound
- **The old line is gone everywhere.** Every user now reads `KRAVIS_EAST_Z` or `SOUTH_LINK.z0`. Grepping `src` for −69/−68.x leaves only the core/Hunt line, which is correctly unchanged (`hunt/dims.ts:39`, `site/footprint.ts:25,31-33`). The mmw block rectangle (`mmw.test.ts:43`) would flag any south-link piece left behind.
- **The coping split** (`weston-ends.ts:247-249`): the two boxes meet at Z −69.0 without overlapping, and the back of the last length sits face to face on Hunt's wall face at X −49.7, with no same-facing coplanar faces.
- **The new line's geometry:**
  - The court wall's east end meets the park wall, and the passage's north jamb sits on the court wall's south face.
  - The Rockefeller north wall (`rockefeller.ts:95`) meets `ROCKEFELLER_X88` at the corner edge.
  - The Kravis floors, roof, top beam and east glazing (10 rows) all run to −64.94.
  - The link's slabs (`mmw/wings.ts:68-71`) and penthouse (`roofs.ts:42,184-186`) start at −64.14, the party wall's inner face.
  - The two dropped map lines on −64.85 lay inside the moved wall's thickness; the two stubs now fall in the Kravis block.
- **No new support problems under the fin.** Hunt's footings stay inside its own block (`podium.ts:104-107`). The yard's pad at −2.44 (`grid.ts:33`) sits above the fin's base at −2.64, so nothing floats between 1914 and 1990.
- **Same overlaps as before, just moved.** These existed in the same form at −69.0:
  - The park wall's 5 cm coping overhang running into the fin's end and into Hunt's wall (`party-walls.ts:136`).
  - The fin's top 0.45 m showing above the park wall until the 1990 raise.
- **Route R7:**
  - It turns at −61.94, 2.2 m short of the moved wall.
  - It enters the court through the opening at −106.47, in the artworks' gap and 6 m from the sculpture at −112.5. The opening east of the door really would come within about 1 m of the sculpture at −94.5, so the choice is justified.
  - The routes test and the placement zones move with `SOUTH_LINK.z0`.
- **The Petrie Court preset** is still 1.34 m off the podium's cap (`presets.ts:70-71`).
- **Budgets and determinism:**
  - The coping's second box reuses the core's shared box in stone, so there's no new mesh.
  - The `petrie-glass` sheet count (`closure.test.ts:97`) is unaffected.
  - Everything new is a module-level constant; nothing carries state between builds.
- **Records:**
  - The [B1] areas check out: 38.4 × 63.04 = 2,421 and 38.4 × 73.26 = 2,813, and the footprint total is unchanged.
  - The step text "72 m" matches the court.
  - The mirror test passes only with both blocks at 19.75 m, so it does go red with the east block ending at −69.0.

#### Read outside the diff
`AGENTS.md`; `docs/policies/local-rules.md`; `docs/learning/lessons.md`; `docs/design/spec.md:1-50`; `docs/research/interior.md:1-48,300-374`; `docs/research/exterior.md:40-74,136,151-160`; `src/model/core/constants.ts` (whole); `core/weston-facade.ts:1-80,108-254`; `core/wings-walls.ts:20-170`; `core/wings.ts:1-63`; `roche-south/kravis.ts`, `rockefeller.ts`, `blocks.ts`, `roche-south.test.ts` (whole); `roche-south/shapes.ts:32-67,180-193`; `mmw/party-walls.ts`, `dims.ts`, `wings.ts`, `roofs.ts`, `plan-data.ts`, `mmw.test.ts` (whole); `hunt/walls.ts:170-227`; `hunt/podium.ts:36-145`; `hunt/routes.ts:1-187`; `hunt/routes.test.ts:1-120,200-240`; `site/footprint.ts`; `site/grid.ts:200-280`; `collection/spaces-b.ts:1-50`; `collection/catalogue.ts:63-64`; `collection/placement.test.ts:1-40`; `closure.test.ts:60-129`; `viewer/cap-pass.ts:1-40`; `viewer/presets.ts:53-75`; greps over `tests/e2e/`, `src/walk/`, `src/model/reach.test.ts`, `src/model/doors.ts`, `scripts/`; `git show HEAD~1:docs/research/interior.md`.

I ran no tests, builds or renders, as the brief asked.

## Findings and disposition

Codex's two findings are F1 and F2; Claude's eight are F3 to F10, two of them Codex's again.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | The match test joins the east block's two coping lengths into one box, so a gap between them, or either losing depth, would pass (minor; Codex) | Accepted | Each length is checked against the west block's coping, mirrored and cut at the core's east face, the second stopping at the front's face; red with a 1 m gap between them and with the second's overhang lost |
| F2 | The fin's end has two dates: four records say 1902, but Hunt's south wall behind it rises in 1899 (nit; Codex) | Accepted | Every record says the fin stands until Hunt's podium and walls rise behind it, 1898 and 1899 (`weston-ends.ts`, `core.test.ts`, `interior.md`, `spec.md`, the plan) |
| F3 | The question the owner said yes to was recorded as moving the core's east face (`EAST_Z`), which this unit keeps; the fin from 1888 to 1899 contradicts fig. 35, which the records do not name (minor; Claude) | Accepted in part: keeping the core's east face is the plan's scope, which both reviewers judge sound | Fig. 35 named in `interior.md` and `weston-ends.ts`; the choice put to the owner in `interior.md` ("Open, for the owner") and in the hand-over: keep the fin, or a unit of its own that moves the core's east face to the map's line, about −66.79, shortening the fin to about 1.9 m |
| F4 | As F2 (minor; Claude) | Accepted | As F2 |
| F5 | The containment test lets a piece past the core's east face reach 0.3 m behind the front's face, into Hunt's wall, where the spec and the plan say in front of it (minor; Claude) | Accepted | Wholly in front of the face, to 1e-6; red with the coping carried back 0.25 m there, and still with 1 m |
| F6 | `src/model/collection/spaces-b.ts` gives the court wall's old gaps between openings (minor; Claude) | Accepted | The comment gives the new gaps and names `COURT_OPENINGS_Z`; the relief and the vitrine still stand before solid wall |
| F7 | As F1 (nit; Claude) | Accepted | As F1 |
| F8 | The court roof's gutter runs 0.28 m into Hunt's south wall over the block's last 4.06 m, where its comment says it lies on the coping (nit; Claude) | Accepted | The gutter divides at the core's east face, and past it stops at Hunt's wall; that face is now a shared line, `EAST_FACE_Z_CORE` in `src/model/frame.ts`, which the core's `EAST_Z` reads |
| F9 | Nothing tests that the court stands symmetric about the door (nit; Claude) | Accepted | The match test checks that the court wall's openings centre on the door, which ties both ends of the court to it; red with the court's east end back on −69.0 |
| F10 | The spec says the blocks mirror each other piece for piece, without the coping's exception (nit; Claude) | Accepted | The spec names it |

These repairs are small and checked by the gates, the tests' red proofs and the renders, not by a second round of review (fleet canon R10).

## Verification

On `0c99c1a`'s content (the working tree just before the commit, through `tmp/gate.sh`): `npm run verify` (755 unit tests; typecheck; lint; build; 127 e2e in 10.0 min); `routes.spec.ts` with `walk.spec.ts` three runs in a row at 1× (23 passed each) and three at 4× (21 passed and the two frame budgets skipped); and `npm run shots`: 34 of 64 within 9 of 255 of the owner's gallery set (`1d873cf`), the other 30 changed only where the court's east end, the south link's west end and its penthouse, and the 1888 corner show, and in the Petrie Court preset, whose camera now stands beside the east block; the model 27,250 pieces, 746 meshes and 1,594,787 triangles at t = N (main: 27,253, 746, 1,594,679). Renders read at native size: the court's east end from the court, the east block face-on, the corner under the glass roof, an aerial view from the south-east, the corner in 1888 from the south-east and from the north-east (the fin), and the yard between the front and the south link from the south-west between 1914 and 1990.

On the repairs: the core's tests red with each of the four mutations above (F1's two, F5's and F9's) and green as built; the affected tests (97), typecheck and lint. The rest of their verification, the full gate, the shots and the load runs on the commit that carries them, is in the plan's Outcome.

## Round outcome

Approved with findings by both reviewers: Codex one minor and one nit, Claude five minor and three nits, two of them Codex's. All accepted and repaired in the next commit, F3 in part: whether the core's east face moves is the owner's to choose.
