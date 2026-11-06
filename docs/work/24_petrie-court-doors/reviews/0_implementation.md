# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `70d0563` ("Open the Petrie Court's south wall with the floor map's eight doors (work unit 24)"), against main at `2d1a607`: in code `src/model/roche-south/kravis.ts`, `src/model/hunt/routes.ts`, `src/model/collection/spaces-b.ts` and `src/model/lib/check.ts`; in tests `src/model/roche-south/roche-south.test.ts`, `src/model/lib/check.test.ts`, `src/model/hunt/hunt.test.ts`, `src/model/hunt/routes.test.ts`, `src/model/core/core.test.ts` and `src/model/collection/placement.test.ts`; in docs `docs/research/interior.md`, `docs/research/interior-images.md`, `docs/research/collection.md`, this unit's plan and the work registry.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-06 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u24-r0/` (ignored, where the raw captures stay): the owner's request and the map's eight doors, the change file by file, what was left alone on purpose, the worker's checks, five lenses (the doors against the map and the photographs; the geometry; the walk and the collection; the tests' honesty; the records), the findings format, and a request to run no test, browser or build. The diff came in the prompt, `2d1a607..70d0563`. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran and read again after, show no change by either; nothing in the worktree was edited while they ran.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start; several searches exited 1 (no match). Its citations outside the diff, checked: `src/model/roche-south/shapes.ts:180–192` (`libraryWallOn`, the wall's placement) and `src/model/collection/placement.test.ts:382–388` (the zones' check). It edited nothing and ran nothing; it looked at the worker's ignored captures under `.shots/` and set aside one occluded camera.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 72 tool calls (32 Grep, 29 Read, 9 Glob, 2 Bash, one of which the permissions refused; the other listed folders), no subagents, none naming the run folder or fleet's tree; it read the ignored map cache with Grep to check the spans. Its citations outside the diff, checked: `src/model/hunt/routes.test.ts:47` and `:100–111` (a route point reached within 0.3 m, the steering) and `docs/research/interior-images.md:134` (#46's reading of the east wall). It edited nothing and ran nothing; it could not view photograph #35, which has no copy in the repository.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve — no actionable defects found in revision `70d0563171ffaae681a28c6ec5648625ba8232d0`.

#### Checked and sound

- **Map coordinates and wall orientation.** All eight spans match the decoded Floor 1 door features after the stated coordinate conversion. `alongWall()` correctly reverses world Z for the east-to-west wall, and its placement puts the thickness south of the court. See [kravis.ts:123–192](src/model/roche-south/kravis.ts:123).
- **Geometry and surrounding construction.** The arch heights use the library’s sill-to-crown convention correctly. Doors and windows stay separated and inside the wall; the second-floor slab and roof clear them. The gallery plate meets the court finish at the same threshold height. Existing partitions leave the gallery-side passage clear, and the wall remains part of its construction step. See [kravis.ts:86–94](src/model/roche-south/kravis.ts:86) and lines 167–234, 279–285.
- **Route and collection.** R7 crosses the fourth door on Weston's axis, with 1.14 m and 1.23 m to its jambs. The relief and vitrine move to solid stretches between the intended doors; the new placement zones check their full footprints. See [routes.ts:122–146](src/model/hunt/routes.ts:122), [spaces-b.ts:24–41](src/model/collection/spaces-b.ts:24), and `placement.test.ts:382–388`.
- **Tests.** The clearance grid checks transformed triangles from every sequence step, with the stated spacing, inset and depth bounds. It is sampled surface-intersection coverage, not exhaustive volume or animation coverage. The helper extraction preserves Hunt’s former checks. R7’s sample assertions supplement the existing complete-route failure checks, and the symmetry assertion now reads the actual court-end constants. See [roche-south.test.ts:137–173](src/model/roche-south/roche-south.test.ts:137), `hunt.test.ts:276–308`, `routes.test.ts:144–150,208–220`, and `core.test.ts:109–118`.
- **Records.** The implementation matches the recorded five-arch interpretation. The eighth door’s head and vertical dimensions are explicitly estimates; deferred frontage discrepancies remain recorded. See [interior.md:313–315](docs/research/interior.md:313).

#### Read outside the diff

- `src/model/lib/wall.ts:65–97,232–253,293–369` — opening geometry, validation and reveals.
- `src/model/roche-south/shapes.ts:180–192` — wall placement transform.
- `src/model/roche-south/rooms.ts:18–93` — partition generation.
- `src/model/mmw/party-walls.ts:57–72,118–150` — Petrie passage and adjoining wall.
- `src/model/collection/place.ts:97–144` and `catalogue.ts:63–64` — artwork dimensions and placement.
- `src/model/reach.test.ts:217–269` — targets and closed-Weston-door world.
- `src/build/kit.ts:54–96`, `sequence.ts:20–29`, and `roche-south/index.ts:16–20` — collected pieces and construction order.

No files changed; no tests, browser or build ran. I inspected existing captures but did not independently reproduce the photograph’s subpixel fit or the worker’s gate results. The existing face-on capture is occluded and was not counted as wall-validation evidence.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** The geometry, the map reading, R7 and the line cast hold up. Two tests are weaker than their headers say, and some records are misfiled or cite the wrong photograph.

#### Findings

**F1. R7's door check doesn't tie R7 to the fourth door** (minor)
`src/model/hunt/routes.test.ts:215-218`
- **What's wrong:** the filter keeps samples with X from −63.25 to −60.45. R7's gallery leg runs at `PETRIE_PASSAGE_X` = −63.135 (`routes.ts:121`, `mmw/party-walls.ts:67`), which is inside that band.
- **Evidence:** the walker runs at 5 m/s, 60 samples a second, and turns 0.3 m before each point (`routes.test.ts:47`, `:103-110`). About 11 gallery samples between Z −99.74 and −100.67 already pass `> 5` before the walker reaches the door.
- **Failure scenario:** move R7's turn to the third door's axis (Z −107.725). The gallery leg then passes all of the fourth door's span at X −63.135 (about 28 samples, all on the main floor). The route's crossing is at Z −107.7, still in the row's gap, and it still ends at `WESTON_APPROACH`. The whole test stays green, but the plan's criterion "R7 crosses the fourth door both ways" is not shown.
- **Repair:**
  - Keep only samples inside the wall's own thickness (`COURT_X0 - COURT_WALL < s.x < COURT_X0`), about 9–10 per crossing, and require more than 5.
  - Require every such sample to lie between `COURT_DOOR.z0 + BODY.radius` and `COURT_DOOR.z1 - BODY.radius`.

**F2. The south wall's paragraphs sit under the wrong heading** (minor)
`docs/research/interior.md:311-315`
- **What's wrong:** both new paragraphs come right after `### Weston's 1888 door`. That subsection is about the north wall's door, and it now opens with the south wall and the east wall.
- **Evidence:** the brief, the code (`kravis.ts:119-120`, "interior.md, Other skylit volumes") and the back-reference at `interior.md:359` ("the court's south wall, above") all point a reader to the parent section, not this subsection.
- **Repair:** move both paragraphs above line 311 (after the Note at 309), or give them their own `### The court's south wall` heading and point the references at it.

**F3. The east wall's features are cited to the wrong photograph** (minor)
`docs/research/interior.md:315`, `docs/work/24_petrie-court-doors/plan.md:18`
- **What's wrong:** both say "#33 shows the court's east wall with the court's name carved under a balustraded balcony, three windows behind it."
- **Evidence:**
  - #33's entry (`interior-images.md:107`) records no reading of the east wall, and its "Informs" line doesn't name it.
  - #46's entry (`:134`) records it: "the east wall with three windows over a balcony and the court's name".
  - Neither entry mentions a balustrade.
  - This item is a photograph-against-model gap, not a map contradiction as the paragraph frames it. A map has no heights, inscriptions or windows.
- **Repair:** cite #46, or add a dated work-unit-24 reading to #33's entry first (including the balustrade if it shows one). Frame the item as contradicting the photographs.

**F4. The eight door zones are missing from the spec and inconsistent with the test header** (minor)
`docs/design/spec.md:252`; `src/model/collection/placement.test.ts:15-18` against `:102`
- **What's wrong:** the spec's Placement contract lists every zone the collection keeps clear, but not the eight doors. AGENTS.md asks for the spec change in the same commit.
- **Evidence:** the test header lists the doors in the sentence that ends "beyond the walker's radius". The code uses `margin: CLEARANCE` (1.0 m), while every other passage-type zone in that sentence uses `CLEARANCE + BODY.radius` (lines 90, 99, 100, 104, 106, 109).
- **Repair:** add the doors and their margin to spec.md's Placement item. Then either say in the header that these zones keep a plain 1 m, or raise the margin to 1.35 m. The relief clears both neighbouring doors by 1.49 m and the bust's vitrine by about 1.8 m, so either way passes.

**N1. The red proof's wording is ambiguous** (nit)
`src/model/roche-south/roche-south.test.ts:15`
"A partition … across the second door" reads as one running along the wall, which every line would hit, even a 9×9 grid. The note that a 9-line grid missed it only makes sense for a partition square to the wall. Say "square to the wall".

#### Checked and sound

- **Spans against the map.**
  - In `research/cache/lm_features.json`, Floor 1 at x −65.26 (world X −61.44), the eight door features match `COURT_DOOR_SPANS` to the centimetre with Z = z − 85.97.
  - That line is fully accounted for: a `threshold` from −137.08 to −126.34 (the café's open frontage, as recorded), a 0.78 m pier, the eight doors with partitions between them, and a last partition to −64.83. There is no ninth door.
  - The pairing claims hold: pair means within 1 cm of −100.97, the fourth door 4.5 cm east of it, and the stated widths.
- **`alongWall`.**
  - `libraryWallOn([COURT_X0, Z_EAST], [COURT_X0, Z_IN])` gives local x = world −Z, centred at −100.97, with the front facing +X. `alongWall` matches that.
  - A sign error would show in the line cast: door 8's mirror falls on solid wall, and the fourth door's mirror moves its jamb 9 cm.
- **Wall rules** (`lib/wall.ts:240-253`).
  - Arch heights are 4.25 + w/2, more than w/2.
  - The narrowest pier between doors is 1.75 m (doors 7 and 8).
  - Windows run 9.13–12.13 m over the court floor. Door crowns are at most 5.435 m, and the wall is 14.49 m tall.
  - Every opening sits within the wall's ±36.03 m. The window tops (16.24 m) stay under the coping and roof slab (18.0 m).
- **Behind the wall.**
  - The gallery plate (to `COURT_X0`) and the court's finish both top out at `MAIN_FLOOR_Y`, so the thresholds are level.
  - The second-floor slab (11.74–12.34 m) sits above the door crowns (at most 9.55 m) and below the window sills (13.24 m).
  - No main-floor partition stands between X −66.14 and the wall (`rooms.ts` builds partitions only on edges two of `MAIN_ROOMS` share).
  - The only upper partition is at Z −74.955. It stops at X −62.59, away from every window.
  - `PETRIE_PASSAGE` stays inside the party wall, 5.1 m east of door 8. The build order is unchanged.
- **R7.**
  - `COURT_DOOR` resolves to the fourth door; the 1.14 m and 1.23 m jamb clearances are right.
  - Going in, the early turn crosses the wall about 0.96 m from the east jamb. Coming back, the walker turns at X ≈ −62.835, 0.235 m clear of the wall's back face.
  - Its court leg passes through the artwork row's gap.
- **Moved artworks.**
  - They now sit at −110.99 and −90.945, derived from `COURT_DOORS`.
  - The relief (1.257 m wide, `catalogue.ts:63`) clears both jambs by 1.49 m. The hang check reads solid wall behind its corners.
  - Both artworks clear the new door zones.
- **The line cast.**
  - Spacing is at most 0.1 m and the inset is 5 cm, including along the arcs. The wall's 12-segment arcs sag at most about 1 cm inside the true circle, well within the inset.
  - It casts from X −60.95 to −62.75 against every piece of every step in `SEQUENCE`, artworks included. The bounding-box pre-filters only ever keep extra pieces, never drop one that could block a line.
  - The red proof against the old six openings holds by arithmetic: every new door and window overlaps old solid wall.
- **Moved helpers.** `segmentMeets` and `worldTriangles` are equivalent to the inline code, so `hunt.test.ts` still checks what it did. `check.ts` is imported only by tests.
- **Symmetry check.** `COURT_ENDS_Z` = [−137.0, −64.94] has mean −100.97. `KRAVIS_EAST_Z` is a literal, so the check goes red if it moves back to −69.0.
- **The render.** The worker's `.shots/shots/preset-int-petrie-court.png` shows the square seventh door, five arches each under a narrow window, the bust's vitrine between the first two arches, and a square first door far off.
- **Not checked:** I couldn't view #35 itself; there's no local copy and no network here. I checked its reading only against the map's spacing: the 9 m gap between doors 6 and 7 is what separates the two candidate fits. The reading is consistent with that.

#### Read outside the diff

- `src/model/lib/wall.ts:17-31, 66-98, 232-254`
- `src/model/roche-south/shapes.ts:38-67, 180-193`
- `src/model/roche-south/rooms.ts:1-94`
- `src/model/roche-south/kravis.ts:86-94, 189-219`
- `src/model/frame.ts:39-51`
- `src/model/roche-south/blocks.ts:64-71`
- `src/model/core/weston-facade.ts:50, 88`
- `src/model/core/constants.ts:13, 76`
- `src/model/mmw/party-walls.ts:47-72`
- `src/build/kit.ts:10-77`
- `src/model/hunt/routes.test.ts:45-132`
- `src/model/collection/placement.test.ts:66-111, 367-392`
- `src/model/collection/catalogue.ts:63-64`
- `src/model/lib/check.ts:1-4`, and `src/model/lib/index.ts` (no re-export of `check.ts`)
- `src/model/core/core.test.ts:1-27, 109-118`
- `docs/design/spec.md:34-41, 170, 250-273`
- `docs/research/interior-images.md:100-135`
- `docs/learning/lessons.md`, `docs/learning/defect-register.md` (searched)
- `research/cache/README.txt`; `research/cache/lm_features.json` (searched for Floor 1 features at x −65.26)
- `.shots/shots/preset-int-petrie-court.png`
- `tests/e2e/routes.spec.ts` (searched for R7 and court positions)

## Findings and disposition

Codex found nothing. Claude's four findings are F1 to F4, its nit N1 is F5.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | R7's door check does not tie R7 to the fourth door: it counts samples within a metre of the wall, and R7's leg down gallery 549, 0.885 m behind the wall, passes the fourth door's span before turning, so R7 turned through the third door would still pass (minor; Claude) | Accepted | The check reads only the samples inside the wall's thickness along the court and requires every one between the fourth door's jambs less the walker's radius (`routes.test.ts`); red with R7 turned through the third door (ten samples at Z −107.77), green as built. A first version of the repair also read the route's start, which crosses the wall's band of X far from the court (Z −17.6); the court's ends bound it now |
| F2 | The two new paragraphs on the court's south wall sit under the heading "Weston's 1888 door", about the north wall (minor; Claude) | Accepted | Under a heading of their own, "The court's south wall", in "Other skylit volumes", before Weston's door; `kravis.ts` and the photographs' entries point at it |
| F3 | The east wall's features are cited to #33, whose entry records no reading of them (#46's does), the balustrade is in neither entry, and the item is framed as a map contradiction where the map draws no heights (minor; Claude) | Accepted | #33 read again at native size for the east wall and its entry records it: three multi-pane windows behind a balcony whose balustrade runs in three lengths, the court's name carved in two lines under it, a string course below; `interior.md` and the plan cite #33 and #46 and set the item against the photographs, not the map |
| F4 | The eight door zones are missing from the spec's Placement item, and their margin, 1 m, is not the 1 m beyond the walker's radius that the test header's sentence and the other passages give (minor; Claude) | Accepted | The zones keep 1 m beyond the walker's radius (1.35 m); `spec.md`'s Placement lists them. The relief clears both neighbouring zones by 1.49 m and the bust's vitrine by about 1.8 m |
| F5 | The red proof's "partition ... across the second door" reads as one along the wall, which any grid would hit (nit; Claude) | Accepted | The header names the piece as it was: a post 0.2 m square standing 0.1 m behind the wall in the second door, as the end of a partition square to the wall would |

## Verification

On `70d0563`'s content, through `tmp/gate.sh`, with the machine's CPU at 6% when the series began and 25% when it ended: `npm run verify` (760 unit tests; typecheck; lint; build; 127 e2e in 9.5 min); `npm run shots`: 44 of 64 within 9 of 255 of the owner's gallery set (`25a1257`), the other 20 changed only where the court's south wall shows (the Petrie Court preset, which now shows the seventh door square-headed, the five arches each under a window and the first door square-headed far off; the aerials, the floor cuts and the plan over the court; small changes seen through the court's glass roof from the front and in the two interface views); `routes.spec.ts` with `walk.spec.ts` three runs at 1× (23 passed each) and three at 4× (21 passed, the two frame budgets skipped). The new line cast red with the wall cut with its six old openings (the wall in all eight doors and five windows) and with a 0.2 m post 0.1 m behind the wall in the second door (a first grid of 9 lines to a side missed it, so the lines are now at most 0.1 m apart); the court's symmetry check red with its east end on −69.0. Renders at native size from five cameras in the court and gallery 549 and a plan cut at the main floor.

On the repairs: R7's check red and green as F1 says; `npm run verify` through `tmp/gate.sh` (760 unit tests; typecheck; lint; build; 127 e2e in 9.7 min). They move no geometry, so the shots and the load runs on `70d0563` stand for them.

## Round outcome

Codex approved with no findings; Claude approved with four minor findings and a nit. All five accepted and repaired in the next commit. The repairs change only tests, comments and records, each checked by its red proof and the gates, so no second round is run.
