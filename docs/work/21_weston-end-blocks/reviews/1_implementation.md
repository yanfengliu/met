# Review 1: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `64ccb91` ("Answer review 0 of work unit 21: the end blocks on their footing, ending in a narrow pier, with mitred cornices and centred panels"): the diff `bcdc743..64ccb91`, 11 files, the repairs of review 0's findings. In code `src/model/core/constants.ts`, `weston-ends.ts`, `weston-facade.ts`, `src/model/roche-south/kravis.ts` (a comment) and `src/viewer/presets.ts` (a comment); in tests `src/model/core/core.test.ts`; in docs `docs/design/spec.md`, `docs/research/interior.md`, `docs/devlog/summary.md`, the plan and review 0's record.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-05 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from `../fleet/tmp/review-runs/met-u21-r1/` (ignored): review 0's record to read first, the repairs finding by finding, the places to look (the blocks' inner ends, the mitred cornice against the merged piece, the ground storey, the containment test's stretches and height bound, the build order, the mesh budget, the records), the findings format, and a request to run no test, browser or build. The diff came on stdin. The worktree's `git status`, saved before both lanes ran and read again after, shows no change by either; nothing in the worktree was edited while they ran (the doors spec, the shots and the load runs, which ran then, write only ignored folders).

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. One citation outside the diff, checked: `src/model/site/grid.ts:32–33` (the building pad at the ground floor less 0.1 m, −2.44). It edited nothing and ran nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 51 tool calls (20 Read, 17 Grep, 9 Bash, one of which the permissions refused, 5 Glob), none naming the run folder or fleet's tree. Two citations outside the diff, checked: `src/model/hunt/dims.ts:35` (Hunt's south extension ends at X −49.7) and `src/model/mmw/steps-fronts.ts:60` (the McKim, Mead & White south campaign, 1914–1926). It edited nothing and ran nothing.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve with findings — one minor geometry defect remains at `64ccb91`.

#### 1. Brick and stone share exposed end faces — minor

**Location:** [weston-ends.ts:186](/src/model/core/weston-ends.ts:186), overlapping the ground-storey brick added at line 139.

The stone base contains the bottom of the brick mass, and both terminate at exactly `b.outer`. Their outward-facing end faces therefore coincide over X −50.9..−49.7 and Y −2.64..−1.74, at Z −69.0 and −137.0. These are overlapping faces with the same outward normal and different materials, creating a z-fighting risk.

**Concrete scenario:** finish the 1888 facade step and inspect the east end from east of Z −69.0. The point `(−50.3, −2.0, −69.0)` belongs to both exposed faces. It is above the building pad at Y −2.44 ([grid.ts:33](/src/model/site/grid.ts:33)); the adjoining later wing has not arrived. This is a geometry finding, not a visually reproduced flicker.

**Suggested repair:** start the brick at `BASE.top`, with the solid stone base supporting it, or otherwise remove the overlapping exposed end faces. This needs no additional mesh.

#### Checked and sound

- **F1:** the new ground storeys reach below the pad and meet the podiums at Y 3.81, removing the original floating blocks, subject to the end-face finding above.
- **C1, F4, F6:** the parts total 16.9; terminal piers equal intermediate piers; the brick strip measures 0.9 m beyond the long quoins; all three panels have equal widths and centres aligned with their columns.
- **C2:** the entablature now returns 0.6 m throughout its height and meets the head band without the former 0.2 m interruption.
- **F2, F3:** the west block ends at the Kravis pier’s actual inner face, Z −137.0; backing fills now arrive at order 0.
- **F7:** both cornice paths face outward and mitre correctly. Their joins with the arched-bay cornices have matching profiles and opposite-facing caps. The 1.3 m western tail is restored.
- **Inner junctions:** the shortened base course and coping meet their extended returns. I found no additional exposed overlapping faces at the sill band, dado, podium cap, head band or frieze.
- **Containment and budget:** the allowances no longer follow `END_BLOCKS`; their height qualification is present. A 1.5 m projection exceeds the brick and cornice limits by arithmetic. Three previous ornament geometries become one merged geometry plus two block cornices, preserving the mesh count.
- The revised dimensions, preset clearance and disclosed modelling limitations match the code. I did not independently remeasure the source photographs.

#### Read outside the diff

- `src/model/lib/sweep.ts:56–146` and `profiles.ts:43–66` — mitres, profiles and end caps.
- `src/model/core/shapes.ts:12–42,67–87` — caching, boxes and placement.
- `src/model/core/wings.ts:46–62` and `wings-walls.ts:86–98,161–170` — assembly, elevation coordinates and foundations.
- `src/build/batch.ts:38–87`, `stagger.ts:28–86`, `motion.ts:44–64,112–117` — mesh identity and arrival behaviour.
- `src/model/roche-south/shapes.ts:52–66` and `blocks.ts:64–65` — pier dimensions.
- `src/model/site/grid.ts:32–33,228–243` and `footprint.ts:21–40` — exposed ground level.
- `src/model/mmw/party-walls.ts:71,104–135` — eastern adjoining wall.

No files changed; no tests, build or browser run.

### Claude (`claude-opus-5-5[1m]`)

I've finished the review: one minor build-replay regression and four small nits; all eight repairs check out against their findings. Here is the report.

**Verdict: approve with findings.** Each repair does what its finding asked, and I found no gap, overlap or flickering face at the blocks' ends. One minor problem is new: the F7 repair moved the middle section's cornice into the arches' piece, which changes when and how it appears in the build replay. The other four findings are nits.

#### Findings

##### 1. The middle section's cornice now arrives with the arches, before what sits under it, and slides 3.9 m up the wall — minor
- **Where:** `src/model/core/weston-facade.ts:135–150` and `:218`. The step is `src/model/core/wings.ts:46–62` (motion `grow`, stagger `order`).
- **What is wrong:**
  - **Order.** Before this commit the arched bays' and the pavilion's cornices were added at order 10, with the blocks' cornices. Now they sit inside `archesAndCornices` at order 7, and so does the new 1.3 m cornice beyond the west block.
  - The step has 12 orders (0–11), so order r starts at r/11 × 0.75 of the step and lasts 0.25 (`src/build/stagger.ts:72–86`). That puts the cornice at f 0.48. Three things beneath it or beside it come later:
    - the keystone consoles that rise to the cornice, at order 8 (`weston-facade.ts:216`, f 0.55);
    - the top seven courses of quoins at all four edges, 12.4–16.4 m up, at orders 8–10 (`:187–192`);
    - the blocks' friezes and cornices, which the middle cornice runs into, at order 10 (`src/model/core/weston-ends.ts:226–232`, f 0.68).
  - So for about a fifth of the step, the cornice stands over the arched bays with no consoles under it. Its end caps show at Z −86.07 and −115.87, and the blocks have no cornice yet.
  - **Motion.** `grow` stretches each piece upward from the bottom of its bounding box (`src/build/motion.ts:59–61`, `:112–117`). The merged piece's bottom is the arches' springing, Y 12.97 (`weston-facade.ts:141`). So the cornice first appears squashed at about 13 m and climbs 3.9 m across the still-unglazed arched windows to 16.9 m. Meanwhile the blocks' cornices grow where they stand.
- **Failure scenario:** The step's follow view (`wings.ts:55`) frames the east arched bay and the east block. Between about f 0.5 and 0.65 it shows the cornice rising over the east arch while the east block has none.
- **Repair:**
  - Give the middle section's and the west-end cornices their own merged piece again, at order 10, and leave the voussoirs alone at order 7.
  - That costs one mesh. One way to pay for it: build the two arched bays' walls and the pavilion's wall (`weston-facade.ts:117–121`, two geometries today) as one world-frame geometry at order 0. All three stand on `WALL_BASE_Y`, so they would grow as they do now. Check it against the closure test.
  - Don't merge the blocks' cornices into one piece the length of the front. Its bounding box would leave the end stretches, and the containment test would measure its 1.95 m against the 1.5 m limit.
  - Fallback: add the merged piece at order 10 together with the consoles. That restores the order, but the slide stays.

##### 2. Two records don't match the code — nit
- **The 1902 claim.** `docs/research/interior.md:350` and `reviews/0_implementation.md:209` say the east block's end at Z −69.0 shows its cut ends "until the Hunt wing stands against it in 1902".
  - The Hunt block stops at X −49.7 (`src/model/hunt/dims.ts:35`; `hunt.test.ts:38` holds its pieces there within 0.3 m).
  - The block's end stands at X −51.65 to −49.7, outside that.
  - What meets it is the McKim, Mead & White south link's wall on Z −69.0 (`src/model/mmw/party-walls.ts:71`), built in the 1914–1926 south campaign (`mmw/steps-fronts.ts:60`, `:84–95`).
  - Repair: say "until the McKim, Mead & White south link's wall stands against it, 1914–1926".
- **The Kravis comment.** `src/model/roche-south/kravis.ts:43` says the court's floor "runs on under their podiums … with no face in common".
  - The slab (Y 3.51–4.08, `:89`) actually runs into the top 0.3 m of the new ground storey and the foot of the podium.
  - The pieces do share end planes, facing the same way, at Z −137.0 and −69.0.
  - Those planes are covered by the glass end's base and pier (`:108–110`) and by the party wall, so nothing shows. Only the wording is loose.

##### 3. The entablature's crown no longer overhangs its body on the return — nit
- **Where:** `src/model/core/weston-ends.ts:206–210`.
- **What:** The C2 repair returns the body and the crown both 0.6 m. So the end facing the pavilion is one flat face, 1.6 m out at the body and 1.8 m at the crown. The crown overhangs toward the court but not on the return face, which is the face #33 shows straight on. The gap is closed and `interior.md:350` describes it, so this is about form only.
- **Repair (optional):** Do what Codex suggested in review 0: stop the head band at the body's 0.4 m return below the crown's underside (Y 10.96), and at 0.6 m above it. Boxes only.

##### 4. The end stretches let brick reach 1.35 m over the brick strips — nit
- **Where:** `src/model/core/core.test.ts:52–56`, `:82`, `:87`.
- **What:**
  - One stretch serves both materials. It starts at the arched bay's edge, 14.89 m from the door, because the cornice's strip run (stone) needs it to.
  - The blocks' brick only starts at 16.28 m (`weston-ends.ts:139–145`).
  - So a block brick box built from the cornice's start, 1.38 m early, would still pass.
- **Repair:** Give brick its own stretch starting at `WESTON_END_FROM − 0.01` (`constants.ts:84`), and keep the stone stretch as it is.

#### Checked and sound
- **C1:**
  - East block: 15.69 m, scale k 0.928, bays 3.157 m, end pier 1.207 m.
  - West block: 19.75 m, k 1.169, bays 3.973 m, end pier 1.519 m.
  - The spec, devlog, plan and `interior.md` all give these figures.
- **F2:** The west block's end at Z −137.0 meets the Kravis pier's inner face (`kravis.ts:109`) and the glass end's base (`:110`).
  - Where they touch, the faces point in opposite directions.
  - The block's parts that reach past the pier's front end flush with that face.
- **F3:** The plain wall behind the strips and blocks is now built at order 0 (`weston-facade.ts:122`).
- **F4:** The blocks start 16.28 m from the door. The long quoins reach 15.38 m, leaving 0.9 m of plain brick before the block.
- **F6:** Pilaster centres are at 2.15k, 6.85k, 11.55k and 16.25k, each 0.97k wide.
  - The panels are centred at 4.5k, 9.2k and 13.9k, which are the columns' axes.
  - The last console stops 0.08 m (east) and 0.12 m (west) short of the block's end.
- **F7, mitred cornice path:** The sweep puts each moulding's front to the right of its path (`lib/sweep.ts:4`, `:56–94`).
  - For both blocks the fronts face the right way: the strip run into the court, the return toward the pavilion, the block run into the court.
  - The inner corner is mitred concave and the outer corner convex. The west block's path is the east's mirrored and reversed, so its front still lies to the right.
  - Each block's cornice starts exactly at the arched bay cornice's end (Z −86.07 and −115.87), with the same profile ('cornice-plain', 0.8 m tall, 0.75 m projection). The two end caps coincide and point opposite ways, inside the joined moulding, so they don't show.
- **C2:** The head band ends at Z −85.29 and −116.65 (`weston-facade.ts:176`). It meets the entablature's return face flush for its full height (Y 10.41–11.16). The tops, 11.16 and 11.21, never lie in one plane.
- **Faces at the blocks' inner ends:** I went through the base course, water table, dado, podium and its cap, piers, head band, entablature return, body and crown, both friezes, the cornice and both copings.
  - Every coplanar pair either points opposite ways or sits side by side without overlapping.
  - The one overlapping same-direction pair is the ground storey's and base course's undersides at Y −2.64. That is 0.2 m below the site pad (`site/grid.ts:33`), so it never shows.
- **Copings and base courses:** The middle coping stops 0.08 m short and the middle base course 0.12 m short, meeting the blocks' own, which wrap round the returns. The court roof's gutter sits 0.68 m back from the blocks' coping edge. The 1.3 m of old wall beyond the west block has its base course, cornice and coping.
- **Ground storey:**
  - Against the court floor: their overlaps are hidden. In a section cut, the cap pass paints every cut piece in one colour (`viewer/cap-pass.ts:1–8`), so the overlap can't flicker there either.
  - Footing: its outer 1.0 m has no footing under it, because the footing reaches only X −49.9 (`wings-walls.ts:169`). Its foot is 0.2 m under the pad, so this doesn't show.
  - Porch: it is 16 m away and unaffected.
- **Containment test:**
  - The stretches are Z −137.0 to −115.86 and −86.08 to −69.0. The blocks' cornice pieces fit with 1 cm to spare, and every other block piece is inside.
  - The merged arches-and-cornices piece reaches 0.85 m. It lies outside the stretches and within the 1.5 m limit.
  - At a 1.5 m projection the test fails as it should, on the pilasters (1.62 m), the ground storey (1.5), the podium cap (2.06) and the cornice (2.25).
  - The height bound, 18.16 m, sits 1 cm above the coping's top.
- **Mesh budget:** Still 130. The three cornice-related meshes (arches, shared cornice, pavilion cornice) become three again (arches-and-cornices, east cornice, west cornice). The ground storey and base course reuse the step's existing brick and stone boxes.
- **Other records:** The preset comment's 1.34 m clearance and 1.76 m cap reach, the constants' comments, the spec's door item and the devlog all match the code.
- **Renders:** `.shots/shots/shots.json` records revision 64ccb91 with a clean tree. I looked at `preset-int-petrie-court.png`.

#### Read outside the diff
- `AGENTS.md`; `docs/policies/local-rules.md`; `docs/design/spec.md:39`; `docs/research/interior.md:336–352`
- `src/model/core/shapes.ts` (all); `wings-walls.ts` (all); `wings.ts` (all); `weston-porch.ts:95–236`; `constants.ts` (all); `vaux-front.ts:23`; `src/model/frame.ts:38–49`
- `src/model/lib/cornice.ts` (all); `sweep.ts` (all); `arch.ts:102–135`; `builder.ts:285–311`
- `src/build/motion.ts:1–140`; `stagger.ts` (all); `batch.ts` (all)
- `src/model/roche-south/kravis.ts` (all); `src/model/mmw/party-walls.ts:1–140`; `mmw/steps-fronts.ts:58–95`; `src/model/hunt/dims.ts:28–45`; `hunt/hunt.test.ts:36–42`; `src/model/site/grid.ts:20–60`
- `src/viewer/cap-pass.ts:1–40`; `src/model/closure.test.ts` (searched)
- `.shots/shots/shots.json` (revision 64ccb91, clean); `preset-int-petrie-court.png`; `chapter-03-weston-tuckerman-1894.png`

I edited nothing and ran no tests, build or browser.

## Findings and disposition

The IDs go on from review 0's: Codex's finding is F8; Claude's findings 1 to 4 are F9 to F12.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F8 | The ground storey's brick and the base course end flush at each block's outer end, their end faces in one plane facing the same way, so they can flicker where that end shows, at −69.0 until 1914 and at −137.0 until 1990 (minor; Codex) | Accepted | The brick starts at the base course's top, so the stone alone fills the bottom |
| F9 | The middle section's cornices arrive with the arches, at order 7, before the keystones' consoles and the quoins under them and before the blocks' cornices, and grow from the arches' springing, sliding 3.9 m up the wall (minor; Claude) | Accepted | The arches and the cornices are two pieces again, the cornices at order 10 with the blocks' and standing on one line; the extra mesh is paid by building the two arched bays' walls and the pavilion's as one piece, which rise from one footing line as each did |
| F10 | Two records do not match the code: the east block's end is met by the McKim, Mead & White south link's wall, 1914–1926, not the Hunt wing in 1902; and the Kravis Wing's floor comment says the floor has no face in common with the blocks, where its slab runs into the ground storey and the podium (nit; Claude) | Accepted | Both corrected, and review 0's record says which it first said |
| F11 | The entablature's crown no longer overhangs its body on the return, the face #33 sees straight on (nit; Claude) | Accepted | The body returns 0.4 m and the crown 0.6 m, overhanging it on the return as on the front; the arched bays' head band meets the body below the crown's foot and the crown above it, as Codex first proposed in review 0 |
| F12 | One stretch serves both materials, so brick could reach 1.35 m over the strips of brick before the blocks (nit; Claude) | Accepted | Brick's stretch starts at the blocks' inner ends, trim's at the arched bays' edges; red with the blocks' ground storey run 1 m into the strip |

These repairs are small and checked by the gates, the containment test's red proofs and the renders, not by a third round of review (fleet canon R10).

## Verification

On `64ccb91`, through `tmp/gate.sh`: `npm run verify` (754 unit tests; typecheck; lint; build; 127 e2e in 11.7 min); the doors spec again on its own (6 passed; Weston's swing at most 7.0 ms of work, where the gate's run, under another load on the machine, had read 15.9 ms against 16.7, and the Great Hall's swing 15.0 ms against its usual 5); `routes.spec.ts` with `walk.spec.ts` three runs in a row at 1× (23 passed each) and three at 4× (21 passed and the two frame budgets skipped); and `npm run shots`: 33 of 64 within 9 of 255 of the owner's gallery set, the other 31 changed only along Weston's front, the model 27,250 pieces, 746 meshes and 1,594,631 triangles at t = N (main: 27,349, 746, 1,602,623). The containment test at `64ccb91` is red with the blocks projecting 1.5 m.

On the repairs above: the containment test red with the blocks projecting 1.5 m and red with the ground storey's brick run 1 m into the strip, green as built; the core's meshes at its 130. The rest of their verification, the full gate, the shots and the load runs on the commit that carries them, is in the plan's Outcome.

## Round outcome

Approved with findings: one minor (Codex), one minor and three nits (Claude), all accepted and repaired in the next commit.
