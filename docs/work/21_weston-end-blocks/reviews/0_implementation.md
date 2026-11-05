# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `bcdc743` ("Model Weston's front with its projecting end blocks and four-window arched bays (work unit 21)"), against main at `fe6f12b`, 14 files: in code `src/model/core/constants.ts`, `materials.ts`, `weston-facade.ts`, the new `weston-ends.ts`, `wings.ts` and `src/viewer/presets.ts`; in tests `src/model/closure.test.ts` and `src/model/core/core.test.ts`; in docs `docs/design/spec.md`, `docs/research/interior.md`, `interior-images.md`, `docs/devlog/summary.md`, the registry and this unit's plan. The prompt's diff was taken against origin's main after it had moved on to `931d5d4` (a fix of `src/model/frame.ts:99` and `src/model/hunt/stair.ts:169`), so it showed that fix reversed; the Claude lane found and named this, and neither lane counted it against the change.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-05 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u21-r0/` (ignored, where the raw captures stay): the change and its evidence, five lenses (the evidence and arithmetic; the geometry; the tests' honesty; budgets and build order; the records against the code), a findings format with file and line, and a request to run no test, browser or build while the unit's gates ran. The diff came on stdin. The worktree's `git status`, saved before both lanes ran and read again after, shows no change by either; nothing in the worktree was edited while they ran (the shots and the load runs, which ran then, write only ignored folders).

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. One citation outside the diff, checked: `src/model/mmw/party-walls.ts:71` and `:104–110` (the court's east wall on Z −69.0, its body east of the line). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 73 tool calls (38 Grep, 25 Read, 8 Glob, 2 Bash, both of which the permissions refused), none naming the run folder or fleet's tree. One citation outside the diff, checked: `src/model/roche-south/blocks.ts:65` (the Roche wings' 1.2 m outer wall). It could not see the photographs or the figures, which stay in ignored folders, and judged the evidence by the records.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Request changes — two findings at `bcdc743`.

1. **East terminal pier contradicts the recorded photograph — major.**  
   [weston-ends.ts:46](src/model/core/weston-ends.ts:46) assigns the corner pier 3.4 parts versus 1.3 for intermediate piers. Scaling to the east block’s 16.17 m produces a **2.89 m terminal pier versus 1.11 m intermediate piers**. Yet [interior-images.md:134](docs/research/interior-images.md:134) explicitly records photo #46’s terminal pier as no wider than the others. The perpendicular wall starts at Z −69 and extends east, so it does not conceal the extra width ([party-walls.ts:71](src/model/mmw/party-walls.ts:71), lines 104–110). This leaves an oversized blank termination in the very stretch requested. **Repair:** reconcile the visible terminal pier with #46 and redistribute widths within the existing extent; distinguish the historical elevation’s full corner from today’s exposed court frontage.

2. **Head band stops short of the lower return — minor.**  
   [weston-facade.ts:165](src/model/core/weston-facade.ts:165) stops every height of the band 0.6 m before the block. However, [weston-ends.ts:171](src/model/core/weston-ends.ts:171), lines 171–176, extends the return body only 0.4 m; only its crown reaches 0.6 m. Consequently, both junctions have a **0.20 m interruption below the crown**, at Y 10.41–10.96. Quoins partially conceal it but do not close it—for example, the east junction exposes brick at Z −85.65, Y 10.50. **Repair:** split the band at the crown’s underside and use the body’s 0.4 m return below it, retaining 0.6 m above.

**Checked and sound**

- The layout gives 20.43 m and 16.17 m end blocks, matching the rounded records. Modelling both ends is supported by the recorded historical and photographic evidence; the unequal extents are explicitly disclosed.
- The glass reduction is correct: nine bays × six glass pieces become two × seven, removing 40; `129 → 89` follows.
- The containment limits admit the current 1.32 m brick pilasters and 1.95 m cornice. A 1.5 m projection would exceed both limits by arithmetic.
- Cached cornice reuse and merged arches support the stated mesh saving. I found no new history-dependent mutation in the builders.

**Read outside the diff**

- `src/model/core/shapes.ts:12–87` — caching, cylinders and transforms.
- `src/model/core/wings-walls.ts:66–98` — window dimensions and elevation placement.
- `src/model/lib/cornice.ts:45–83`, `sweep.ts:56–146` — profiles, corners and caps.
- `src/build/batch.ts:38–73`, `motion.ts:44–65,112–126`, `stagger.ts:72–84` — batching and animation.
- `src/model/roche-south/kravis.ts:26–44,103–110,173–174`, `src/model/mmw/party-walls.ts:71,104–135` — adjoining boundaries.
- `src/model/collection/spaces-b.ts:18–34`, `src/model/hunt/routes.ts:114–133` — artwork and route placement.

No files changed; no tests, build or browser run. I inspected the existing Petrie capture. Source-image measurements were not independently re-established; finding 1 identifies a concrete contradiction between the code and its recorded photographic evidence.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: request changes.** There is one major finding: the end blocks hang about 6 m in the air for most of the build replay. There are six minor findings and some nits. In the finished model the geometry, the budgets and the tests hold.

I couldn't look at the photographs or Heckscher's figures myself: there are no local copies, and Bash was denied. So I judged the evidence by the records' own readings and checked their arithmetic and the code against them. I ran no tests.

#### Findings

##### F1. The end blocks float from their 1888 step until the Kravis Wing's floors in 1990 — major
- **Where:** `src/model/core/weston-ends.ts:52`, where the podium's foot is `L1 − 0.3` = 3.81. Nothing of a block is built below that (`:111–114`, `:151`), and `src/model/core/wings-walls.ts:162–171` gives the blocks no footing. The court's slab first arrives in `kravis-structure` (`src/model/roche-south/kravis.ts:88–89`, `:213`). The ground there is the pad at −2.44 (`src/model/site/grid.ts:33`).
- **What is wrong:**
  - From 1888 to 1990, each block (16.2 m and 20.4 m long) stands on nothing. Its podium, 1.7 m deep, has its underside 6.25 m above the pad, and below it is the plain fill wall.
  - Beside it, the arched bays show a ground storey with windows (`weston-facade.ts:89–96`, `:239`). So the model treats the 1888 ground storey as still standing today. That makes this different from the porch, whose 1888 stair is gone.
  - The real blocks are building masses that rise from the ground: Heckscher calls them "projecting flanking sections", and fig. 35 shows them built about 1895.
  - From 1888 to 1902 the east block's end at Z −69.0 also shows its cut podium, entablature and cornice to the east.
- **Failure scenario:** the facade step's own follow view shows it. That view stands at (−75.7, 8.1, −84), looks at (−49.7, 10.1, −104) and uses `DEFAULT_FOV` 45 (`wings.ts:55`, `camera-rig.ts:329`). The west block sits 15–27° off the view's axis. The podium's foot is about 8–10° below the axis and the pad 14–18° below, so all three are in frame. Every frame from 1888 through the Hunt, McKim, Mead & White and Roche chapters shows the block hanging there.
- **Repair:** carry each block down to the 1888 grade on a footing.
  - Use a brick mass under the podium from `WALL_BASE_Y`, at most 1.2 m out so it stays inside the 1.35 m brick allowance, and return the plinth course round it.
  - Take the ground storey's design from figs. 28 and 35 if they show it; otherwise use a plain estimate and record it as one.
  - This needs only boxes, so no new mesh.
  - Alternatively, the owner may accept it as a recorded limitation, as for the porch.

##### F2. The west block runs 0.2 m into the Kravis pier; the records put the pier's face at −137.2, but it is at −137.0 — minor
- **Where:**
  - `constants.ts:84` (the comment says the pier is Z −138.2..−137.2)
  - `weston-ends.ts:35`
  - `interior.md:350` ("20.4 m to the Kravis Wing's pier (−137.2)")
  - `plan.md:25` ("20.5 m … −137.3")
- **What is wrong:**
  - The pier is built at `kravis.ts:109` with the Roche wing's `OUTER_WALL` of 1.2 (`roche-south/blocks.ts:65`), and its body lies on the +Z side (`roche-south/shapes.ts:52–67`, `poly.ts:26–32`). So it spans Z −138.2..−137.0. The court floor's start, `Z_IN` = −137.0 (`kravis.ts:30`, `:125`), agrees.
  - As a result, the block's brick, podium, entablature, frieze and cornice overlap the pier at X −50.7..−49.7.
  - Where the block reaches past the pier's front (X −51.65..−50.7), its parts end 0.2 m beyond the pier's inner face, with their cut ends facing the glass end wall.
- **Repair:** set `WESTON_WEST_END_Z = −137.0`, which makes the block 20.23 m with bays of 3.62 m. Then correct the comment, `interior.md`, the spec's Weston's door item and the plan.

##### F3. The wall behind the strips and the blocks arrives after the blocks — minor
- **Where:** `weston-facade.ts:121` builds the fills at order 5. The blocks arrive earlier: piers at 0 and bays at 1 (`weston-ends.ts:113`), the brick mass at 2 (`:111`), the podium at 1 (`:151–152`) and the columns at 3–5 (`:162–168`). The step's `'order'` stagger sorts by `piece.order` (`src/build/stagger.ts:33–34`).
- **What is wrong:** the fills used to be 3 m plain ends at the corners. Now they are the front's wall behind about 37 m of it. During the step, the piers, podium, brick mass and columns stand with no wall behind them. At each 0.9 m strip, the front is open through its full thickness and the arched bay's open end shows, until order 5.
- **Repair:** build the fills at order 0, with the arched bays and the pavilion.

##### F4. The plain strip before each block is 0.42 m wide, not the recorded 0.9 m — minor
- **Where:** the quoins at `weston-facade.ts:176–181`; `constants.ts:81`, `:83`; `interior.md:342`, `:350`.
- **What is wrong:**
  - The record reads fig. 28 as an arched bay of 217 px "with its quoins", then "a strip of plain wall 22 to 24 px between an arched bay's quoins and an end block".
  - The code centres the outer quoins on the bay's edge, 14.9 m from the door. The long quoin blocks therefore reach 15.38 m, which leaves 0.42 m of plain brick before the block's return at 15.8 m (0.57 m at the short blocks).
  - Measured over its quoins, the arched bay reads 9.66 m wide. The old corner quoins avoided this by being inset by half their width (`WEST_Z + 0.48`).
  - `interior.md:350` still says "a strip of plain wall 0.9 m".
- **Repair:** measure the strip from the quoins' outer edge, so `WESTON_END_FROM` = 6.2 + 8.7 + 0.48 + 0.9 = 16.28 m. That also puts the blocks' inner ends where fig. 28 has them: 162 + 217 + 23 px ≈ 16.2 m from the door. Alternatively, record the 0.42 m.

##### F5. The east block ends in a 2.9 m corner pier, where the record's own reading of #46 shows a narrow one — minor
- **Where:** `weston-ends.ts:46`, `:83–91`; `interior.md:347`, `:350`, `:352`; `interior-images.md:134`.
- **What is wrong:**
  - The record reads #46 as showing the court's east wall meeting the block "after the third column, at a pier no wider than the others".
  - The code scales all seven of fig. 28's parts down to 16.17 m (scale 0.851). After the third column it builds a corner pier of 2.89 m, 2.6 times the 1.11 m piers, and the bays shrink to 2.89 m.
  - The record of what still differs doesn't mention this.
  - It also affects the owner's open question at `:352`. If the court's east wall cuts the block one narrow pier after its third bay, the court shows about 16.9 m of it (2.78 + 3 × 3.39 + 3 × 1.33 m), not 19 m. The model's 16.2 m is close to that.
- **Repair:** lay out the east block as #46 shows it, with parts 2.8 : 3.4 : 1.3 : 3.4 : 1.3 : 3.4 : 1.3 scaled to 16.17 m (scale 0.957: bays 3.25 m, end pier 1.24 m). Alternatively, record the difference and restate the open question.

##### F6. The outer panels are narrower than the middle one and sit off their columns — minor
- **Where:** `pilasters()` at `weston-ends.ts:100–104` and the panels at `:185–190`; `interior.md:342`.
- **What is wrong:**
  - The two outer pilasters sit flush with the outer edges of the first and last bays, but the inner two are centred on piers 1.3k wide (k being the block's scale).
  - So the panels are 3.01 / 3.24 / 3.01 m wide on the east block and 3.83 / 4.13 / 3.83 m on the west.
  - The two outer panels' middles sit 0.12 m (east) and 0.15 m (west) off the columns below them.
  - Fig. 28 has the pilasters "centred on the piers" and 20–28 px wide (0.81–1.13 m before scaling). The code makes them 0.75k (0.64 m and 0.81 m).
- **Repair:** centre the outer pilasters 0.65k from the bays' outer edges, which centres every panel over its column. Take the width from fig. 28 (about 0.97k).

##### F7. The reason given for the cornice's un-mitred corners doesn't hold — minor
- **Where:** `weston-ends.ts:120–131`, `:198–203`; `interior.md:350`.
- **What is wrong:**
  - At each block's inner corner, the front run of the cornice carries on 0.75 m past the corner and ends in a flat cap. Seen from the pavilion's side (#33 sees the east return face-on), this cap stands out beyond the return's moulding, by about 0.3 m at the corona. The run's back face also shows over the strip.
  - The record blames the mesh budget, but the budget allows a mitred cornice. The parts library mitres a path with several points (`lib/cornice.ts:4–6`, `:67–84`).
- **Repair:** build one memoised world-frame geometry holding both sides' cornices as mitred paths (bay, strip, return, block front). It replaces the single mesh `westonCornice()` makes now, the same way `arches()` handles the voussoirs (`weston-facade.ts:133–141`), so it costs nothing in meshes. Otherwise, at least correct the stated reason.

##### Nits
- `core.test.ts:53–56`, `:82`: the allowed stretches come from `END_BLOCKS`, the module under test. A block moved along the front would carry its allowance with it; the porch's stretch, by contrast, is pinned to the door ± 3.5 m. There is also no height bound, and the stretch needs to reach only 0.76 m into the strip, not 0.91 m.
- `presets.ts:70` says the camera stands "1.4 m clear" of the podium, which "reaches 1.7 m". The podium's cap reaches 1.76 m (`weston-ends.ts:152`), so the clearance is 1.34 m. `interior.md:350` says 1.7 m too.
- `kravis.ts:43` says "nothing of the court touches the old front's trim". The court's slab and floor finish (`:89`, `:125`) now run 1.6 m into both podiums. This is harmless (separate closed pieces, no shared plane) but the comment is stale.
- `interior.md:334` still gives work unit 19's five-and-four bays as "What the model takes" and isn't marked as superseded.
- The block's coping overhangs its front by 0.08 m but its return not at all (`weston-ends.ts:205–206`).
- `plan.md:24`: fig. 28's middle section, 1,756 − 478 − 475 = 803 px, makes 32.4 m, not 32.1 m.

#### Checked and sound
- **The diff's `frame.ts:99` and `hunt/stair.ts:169` hunks aren't this commit's work.** Main moved from fe6f12b to 931d5d4 after the branch forked (`.git/logs/refs/heads/main:117`). Main's `frame.ts:99` now says `vaux-east.ts`, which is correct, since the constant is used at `vaux-east.ts:87–93`. Work unit 19's plan (`:54`) records both lines still pointing at `vaux-shell.ts`. So the review diff shows main's fix reversed, and merging origin/main keeps it. Confirm with `git diff fe6f12b bcdc743 --` on those two files, which should be empty.
- **Fig. 28 arithmetic** (0.0403 m per pixel):
  - 217 px → 8.75 m; 22–24 px → 0.89–0.97 m.
  - 69 / 84 / 33 / 86 px → 2.78 / 3.39 / 1.33 / 3.47 m; the parts sum to 473 px, against the measured 475 and 478 px.
  - Block lengths 16.17 m and 20.43 m; bays 2.89 m and 3.66 m; the model's front is 2.68 m off the door's middle.
- **The evidence for modelling both ends holds.** As recorded, #33 shows one four-window arched bay west of the porch, which already contradicts the old five three-window bays in a photograph the owner named. Figs. 26, 28 and 35 and #35 add the west block.
- **Arched bays:**
  - Piers 0.668 m wide; four windows at ±0.884 and ±2.652 m.
  - The arch's crown is at 16.17; its keystone reaches 16.82 and the console spans 16.37–16.9.
  - The rings stand 0.17 m clear of the quoins, and the three rings in the merged piece don't overlap.
- **Contacts:**
  - The head band stops at ±15.2 m against the end of the entablature's crown return.
  - The entablature's top is at 11.21 against the head band's 11.16, so the two tops never share a plane.
  - The columns stand 0.25 m in front of the bricked-up bays, and their plinths sit on the podium.
  - Every coincident face pair I listed faces opposite ways, so nothing should flicker.
  - The inside corner where the strip's cornice meets the return's forms a proper mitre.
  - No cornice run is mirrored, and the frieze roundels face outward on each return.
- **Tests:**
  - The allowances (1.35 m brick, 2.0 m trim) sit just above the geometry (1.32 m, 1.95 m).
  - The containment test goes red with a 1.5 m projection: the brick reaches 1.5 m, the podium cap 2.06 m and the cornice 2.25 m.
  - The stretches hold every block piece.
  - The glass count: the arched bays' glass pieces drop from 54 to 14, so 129 → 89 and the header's total becomes 9,975.
- **Budgets and determinism:**
  - Meshes: merging the arch rings saves one and the granite cylinder adds one; `westonCornice()` returns the library's cached moulding, so it stays one mesh.
  - `END_BLOCKS` is constant, and the memoised geometry is pure.
  - The arches piece placed at the identity matrix grows from the bottom of its world bounding box, not from the origin (`motion.ts:59–61`, `:112–117`).
- **Walks and the court:**
  - Route R7 and the e2e scenes at Weston's door stay on the door's axis.
  - The court's artworks stand at X −55.58, at least 3 m from the podium.
  - The podium is 1.0 m tall, above the walker's 0.35 m step.
  - The moved preset is reachable.
- **Other contacts:**
  - The gutter sits on the blocks' coping, and the glass roof is 0.45 m above it.
  - The east end meets the McKim, Mead & White party wall's face at Z −69.0.
  - The wall between galleries at Z −90.65 now meets the front 0.1 m inside a window jamb. Before, it met the front in the middle of a window.

#### Read outside the diff
- **Repo instructions and records:** `AGENTS.md`; `docs/policies/local-rules.md`; `docs/design/spec.md:1–60`; `docs/research/interior.md:300–352`; work units 17 and 19's plans and reviews (searched).
- **Core:**
  - `src/model/core/shapes.ts` (all) and `weston-porch.ts` (all)
  - `wings-walls.ts:21–33`, `67–98`, `162–171`
  - `galleries.ts:1–90` and `plan-data.ts:15–40`
  - `vaux-east.ts:14`, `87–93`
- **Kravis Wing:** `src/model/roche-south/kravis.ts` (all), `shapes.ts:1–70`, `blocks.ts:65`, `poly.ts:26–32`.
- **Parts library:** `src/model/lib/cornice.ts` (all), `profiles.ts:25–67`, `arch.ts:86–135`, `builder.ts:285`.
- **Build engine:** `src/build/motion.ts` (all), `stagger.ts:30–35`.
- **Viewer:** `src/viewer/presets.ts:15`, `camera-rig.ts:65`, `:329`; `section-cut.ts:46–53`.
- **Other model and walk files:**
  - `src/model/collection/spaces-b.ts:1–48`
  - `src/model/reach.test.ts` (preset targets)
  - `src/model/hunt/routes.ts` (R7)
  - `src/walk/walker.ts:47`
  - `src/model/site/grid.ts:33`
  - `src/model/frame.ts:38–49`, `97–99`
  - `src/model/mmw/party-walls.ts:25–32`, `66–84`
  - `src/model/closure.test.ts:1–80`
- **E2E specs:** `tests/e2e/routes.spec.ts` and `doors.spec.ts` (searched for Weston places).
- **Git state:** the main checkout's `src/model/frame.ts:99`; `.git/HEAD`; `.git/logs/refs/heads/main` and `…/claude/optimistic-mayer-d1fe0b`.
- **Worker's renders** in the worktree's `.shots/shots/` (revision not recorded): `preset-int-petrie-court.png`, which shows the east block from the moved preset as the code builds it; `chapter-03-weston-tuckerman-1894.png`; `doors-weston.png`.

## Findings and disposition

Codex's findings are C1 and C2; Claude's keep their numbers, its nits N1 to N6. Codex's C1 and Claude's F5 are one finding, here C1.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | The end blocks have nothing under their podiums, so from 1888 until the Kravis Wing's floors of 1990 they hang over the ground (major; Claude) | Accepted | Each block's ground storey is brick from the footing (`WALL_BASE_Y`) to the podium, 1.2 m out, on the front's base course returned round it. Figs. 28 and 35 show small paired windows in it, which the model leaves out; recorded in `interior.md` |
| C1 | The east block ends in a 2.89 m corner pier, where #46, as the record reads it, shows the court's east wall meeting the block at a pier no wider than the others (major; Codex C1, Claude F5) | Accepted | Each block ends in a pier of 1.3 parts, as wide as the others: the parts are 2.8 : 3.4 : 1.3 : 3.4 : 1.3 : 3.4 : 1.3 (16.9), the east block's bays 3.16 m and the west's 3.97. The west end, which no photograph shows near enough, follows the east, the court and the front being symmetric about the door; recorded |
| C2 | The arched bays' head band stops 0.6 m short of each block at every height, where the entablature's body returns only 0.4 m, leaving 0.2 m of brick showing below the crown (minor; Codex) | Accepted | The entablature returns 0.6 m along the front's face at every height, body and crown alike, so the head band meets it flush |
| F2 | The west block runs 0.2 m into the Kravis Wing's pier, which stands at Z −138.2..−137.0 in the Roche wings' 1.2 m wall, not to −137.2 (minor; Claude) | Accepted | `WESTON_WEST_END_Z` −137.0; the records say so |
| F3 | The plain wall behind the strips and the blocks is built at order 5, after the blocks (minor; Claude) | Accepted | At order 0, with the arched bays and the pavilion |
| F4 | The strip before each block is 0.42 m of brick, not the recorded 0.9, because the quoins are centred on the arched bay's edge (minor; Claude) | Accepted | The strip is measured from the quoins' outer edge (`WESTON_QUOIN`), so the blocks start 16.28 m from the door, where fig. 28 has them (16.2 m) |
| F6 | The outer panels are narrower than the middle one and stand off their columns, and the pilasters are narrower than fig. 28's (minor; Claude) | Accepted | Every pilaster stands half a pier's width outside its bay, so each panel stands over its column, and is 0.97 of the block's scale wide, as fig. 28 draws them |
| F7 | The cornice's un-mitred corners leave a cap standing out at each return, and the budget does not force them (minor; Claude) | Accepted | Each block's cornice is one mitred path, from the arched bay's edge round the return and along the block; the middle section's cornices share one geometry with its arches, so the core stays at its 130 meshes |
| N1 | The containment test takes its stretches from `END_BLOCKS`, the module under test, has no height bound, and reaches further into the strip than the geometry needs (nit; Claude) | Accepted | The stretches come from `constants.ts`, as the porch's does, from the arched bay's outer edge, where the mitred cornice now starts, and under the coping's top |
| N2 | The preset's comment gives the podium's reach as 1.7 m and the clearance as 1.4 m, where the cap reaches 1.76 m (nit; Claude) | Accepted | Corrected, here and in `interior.md` |
| N3 | `kravis.ts:43` says nothing of the court touches the old front's trim, where its floor now runs under the podiums (nit; Claude) | Accepted | The comment says so |
| N4 | Work unit 19's layout in `interior.md` is not marked superseded (nit; Claude) | Accepted | Marked |
| N5 | The block's coping overhangs its front but not its return (nit; Claude) | Accepted | It overhangs both; the middle section's coping stops 0.08 m short to meet it, as its base course stops 0.12 m short to meet the blocks' |
| N6 | The plan gives fig. 28's middle section as 32.1 m, where its 803 px make 32.4 (nit; Claude) | Accepted | Corrected |

The repairs give the old wall beyond the west block, 1.3 m that the Kravis Wing's pier has hidden since 1990, a cornice in the middle section's piece, which the first version had dropped; and the east block's end at −69.0 shows its parts' ends until the Hunt wing stands against it in 1902, as the old front's trims did. Both are recorded in `interior.md`.

## Verification

On `bcdc743`, through `tmp/gate.sh`: `npm run verify` (754 unit tests; typecheck; lint; build; 127 e2e in 10.8 min, Weston's swing at most 8.5 ms of work); `routes.spec.ts` with `walk.spec.ts` three runs in a row at 1× (23 passed each, 2.2 min) and three at 4× (21 passed and the two frame budgets skipped, 2.5 to 2.6 min); and `npm run shots` (64 images), compared image by image with the owner's gallery set (main's at `748e9b6`; work unit 20 changed no render): 33 of 64 within 9 of 255 in every channel, the other 31 changed only along Weston's front, the Petrie Court preset and the Weston door view broadly, each read at native size or as before and after crops at native size or twice it. An earlier `npm run verify` on the same code had two e2e failures, in `menus.spec.ts` (the Petrie Court preset's camera) and `labels.spec.ts` (the pointer at a walk's load), because the preset was edited during the run and the dev server reloaded the page; the run on the committed tree, with nothing edited during it, passed. The containment test is red with the blocks projecting 1.5 m (their brick 1.62 m out against the 1.35 m allowance) and green at 1.2 m.

The repairs are verified in review 1's record.

## Round outcome

Changes requested: two major findings (F1, C1), six minor (C2, F2, F3, F4, F6, F7) and six nits, all accepted and repaired in the next commit; review 1 checks the repairs.
