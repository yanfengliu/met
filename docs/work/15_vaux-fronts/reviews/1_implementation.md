# Review 1: implementation

## Target

Commit `223838579477781c2e54908e994d75cf4c1c336b` on `claude/vaux-fronts-3c8d7d` (the whole work unit with review 0's repairs), its diff against `b9ecd58` less the review-0 snapshot, appended to a focused prompt that pointed each lane at review 0's record and the repairs of F0 to F6.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r1/`: kept (0 failed commands). It ran headless probes (motion transforms at intermediate progress, rays to the head's triangle centroids, end-pane sightlines, mesh and sheet counts); its vitest selection ran no tests, the sandbox refusing a temporary folder.
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). Vitest and node were refused, so its findings rest on reading the commit and hand arithmetic; it says so.
- Both lanes left the tree unchanged (`git status --porcelain` empty before and after; HEAD unchanged).

## Reports

### Codex (gpt-6-astra)

Request changes on **223838579477781c2e54908e994d75cf4c1c336b**. F0’s arrival timing is repaired, but the composite pieces still separate during motion. The sightline gate passes despite partial obstruction of the central arch, and F5’s end panes leave gaps. Head heights, batching, mesh budget and sheet counts otherwise agree with the repaired implementation. Findings below come from code inspection and executed headless, in-memory probes.

1. **Major — F0 still gives each material a different motion pivot.**  
   [vaux-east.ts:81](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:81), [vaux-fronts.test.ts:74](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-fronts.test.ts:74). Equal matrices and stagger keys synchronize time, but `pop` uses each geometry’s bounding-box centre. At **25% of their arrival**, the positive outer east head’s common local origin transforms to X **12.094922** for light granite and **12.279640** for dark: **18.5 cm separation**. Cut side heads separate by **16.1 cm along Z**. The west front’s `grow` also uses different minimum heights, producing **17.1 cm vertical separation** at the same progress. These differences disappear at rest, so the new gate misses them. Give each composite a shared motion pivot, or use an identical fixed-distance translation, and test intermediate transformations for both cut and uncut heads.

2. **Minor — F1’s “central arch whole” assertion passes while its lower sides are hidden.**  
   [vaux-fronts.test.ts:39](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-fronts.test.ts:39). The four constant-derived targets miss the obstructed edges. All four rays pass, yet rays to **14 of 120 front-facing voussoir triangle centroids** hit the Lehman ring walls first. For example, the actual light-granite surface at **(−2.1315, 10.4966, −138.36)** is blocked at **(−2.0506, 10.0663, −139.1056)**. Thus the documented court view already contradicts the test’s claim. Sample the built head’s surfaces, including its springing-side edges, and either clear those obstructions or explicitly narrow the test and records to the visibility achieved.

3. **Minor — F5’s outer end panes stop short of the wall.**  
   [lehman-glass.ts:183](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/lehman-glass.ts:183). The new triangles end at `z1 = −138.472306`, the head-bar centreline, while the old wall stands at **−138.3**. This leaves approximately **17.2 cm** open below the bar. At Y **14**, an outward ray through either end at Z **−138.4** meets no pane or wall; the corresponding ray at Z **−138.8** hits the new pane. Extend the end closure to the wall beneath the bar and check those boundary sightlines. The correct count of 22 sheets establishes inventory, not enclosure.

4. **Minor — the measurement record retains the superseded F3 calibration.**  
   [exterior-images.md:174](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/docs/research/exterior-images.md:174), [vaux-front.ts:40](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-front.ts:40). Photograph #53 still derives its apron and ground-window measurements from **6.7 m**, attributed to #60, whose repaired value is **6.3 m**. The string-course note also says **1.9 m above the crowns**, whereas the built values give **15.9 − 14.21 = 1.69 m**. A subsequent modeller following these records would reproduce conflicting dimensions. Reconcile #53’s derivation with the repaired solve and record any deliberate rounding or retained estimate.

5. **Nit — the palette comment contradicts F6’s completed repair.**  
   [palette.ts:89](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/palette.ts:89) still assigns the clerestory to `palette.brick`; [medieval-hall.ts:179](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/medieval-hall.ts:179) now uses `core.vauxBrick`. Someone following that comment would adjust the wrong material. Remove the clerestory from the palette comment.

Outside the diff, I read:

- [motion.ts:44](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/motion.ts:44) and [timeline.ts:197](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/timeline.ts:197), confirming per-piece bounds determine motion.
- [window-parts.test.ts:1](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/window-parts.test.ts:1), including its merge tracing; no new window-role placement issue found.
- [batch.ts:41](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/batch.ts:41), [roche-south/shapes.ts:96](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/shapes.ts:96), and the sheet and geometry-check helpers.

Other lenses found nothing further: the core builds **130 meshes, 195,917 triangles and one light**; all **21 head pairs** have matching arrival keys; `openAlong` found no vertical openings across **144 distinct geometry/orientation combinations**. These are bounded probes, not the full closure gate. Sheet totals match **10,023 in 52 pairs**. The built springing, lintel and crown are **10.41, 9.91 and 14.21 m**. The strip bars top out at **15.722 m**, below the **15.9 m** string course. The approximate solved camera reproduces the recorded rise and crown pixel measurements.

Vitest’s three selected suites ran **zero tests** because temporary-directory creation was denied. Full `verify`, renders and independent photograph remeasurement were not run. `git diff --check` reports whitespace in the preserved review/patch artifacts. The worktree is unchanged.

### Claude (claude-opus-5-5[1m])

**Verdict.** The F0 repair holds. Each 1880 head is now a light piece and a dark piece, built in the arch's frame, placed per arch and given one order. By my count against the round-0 snapshot, the core area sits at exactly 130 meshes. The window-parts gate follows the frame-and-bars merge. The F3 camera solve agrees with itself, and the code builds the heights it gives. I would still not land this, because of one major finding: the court does not show the central arch whole. The Lehman court's own ring walls hide the outer half of the springing stones beyond |X| 2.01 m, and #60 shows those stones. The new sightline gate passes anyway: its side rays clear the walls' corners by 1.3 cm, and the arch itself is never in its scene. The gate's title and three records say "whole". The rest is a gap F5 left open, a scale F3 did not carry through, and nits in the records. I could not run any gate: Bash here allows git only, and vitest and node were refused, as in round 0's Claude lane. Everything below comes from reading 2238385 and working the numbers by hand. The tree is unchanged (`git status --porcelain` empty).

##### Findings

**1. Major: the central arch is hidden at its springings from the court, and the sightline gate can't see that.**
- **Where:** `vaux-fronts.test.ts:2`, `:26`, `:39–43`; `roche-south/lehman.ts:195`, `:235`; `exterior.md:158` ("so the court shows the central arch whole as #60 does"); `devlog/summary.md:5`.
- **What's wrong:** `INNER_LONG_EAST` is 2 × 0.7 × tan 22.5° = 0.58 m longer than its corner-to-corner segment (`lehman.ts:195`). `libraryWallOn` centres it on that segment, with its front face on it (`lehman.ts:235`, `roche-south/shapes.ts:184–193`, `lib/wall.ts:4`). So each east long wall's court face runs 0.29 m past the octagon's corner, to (±1.945, −139.000), into the east opening.
  - **Sightline limit:** from `COURT_CAMERA` (0, −0.84, −158), the line through that corner meets the voussoirs' face (Z −138.33) at |X| = 1.945 × 19.67/19.00 = 2.014 m. The wall is solid there from the floor to the eave; its nearest opening is 1.36 m along it.
  - **What is hidden:** the voussoirs reach ±2.4 m at the springing (3.2 + 2 × 0.8). Their extrados comes back inside 2.014 m only 1.76 m above the springing. That hides about 0.45 m² of ring each side, roughly half the depth of the lowest stones.
  - **#60 shows them:** its 117 px outside width at the springing is measured across these stones. From #60's own solved camera (Z −161.9) the limit is 2.00 m, so the same stones are hidden.
  - **The gate's margin:** its haunch targets (±2.0, `SPRING_Y` + 1.2) sit 1.4 cm inside the limit. Their rays pass the walls' corner edges at 1.3 cm.
  - **What the gate proves:** its scene holds only Lehman pieces, and its targets come from constants. It shows that the Lehman misses four segments, not that the arch is seen (R19).
- **Failure scenario:**
  - The [C7] render `cam=0,-0.84,-158,0,13,-138.3` shows the springing stones cut by the opening's edges.
  - Re-measure `VAUX_VOUSSOIR` at 0.84 m: `side` becomes 2.02 m, both haunch rays hit `lehman-ring-walls`, and the gate goes red with nothing in the Lehman changed.
  - Delete the two head `kit.add` calls at `vaux-front.ts:102–103`: the gate stays green.
- **Suggested repair:**
  - **The opening:** end the two east long walls' court faces at the octagon's corners (mitre their east ends and keep the fill behind). That moves the limit to 2.25 m. The last 0.15 m needs an opening wider than the map's 4.30 m flat, or an entry under section 9's "Left as they are" with #60's evidence.
  - **The gate:** add `vaux-west-front`'s pieces to the scene. Require each ray's first hit to be a `vauxHead:…:west` piece (they are named already) or the band.
  - **Targets:** add one at the springing's outer edge (±2.35, `SPRING_Y` + 0.2), either expected visible or pinned as blocked with the reason. Move the haunch targets off the 1.3 cm edge.
  - **Wording:** make the title, header, section 9 and the devlog say only what is shown.

**2. Minor: F5's outer-end panes stop 0.17 m short of the wall.**
- **Where:** `lehman-glass.ts:183`, with `z1` from `:151–156`.
- **What's wrong:** the triangle runs (zc, 13.1)–(z1, 13.1)–(z1, 15.6), where z1 ≈ −138.472 is the head line set back for the head bar. The head bar ends exactly at the run's end (`roche-south/shapes.ts:77–92` spans a→b).
  - **The slot:** at X −15.1 and +15.0 it runs from Z −138.47 to the brick at −138.3, and from the coping (13.1 m) up to the bar's underside (about 15.48 m). That is about 0.17 × 2.4 m, about 0.4 m² at each end, open to the sky.
  - **Nothing else closes it:** the 1888/1894 pilaster strips stop at |X| 14.8 (`wings-walls.ts:122`) and their blind panels at 15.35 (`:82`).
- **Failure scenario:** a horizontal ray from inside the strip at (±14.9, 14.0, −138.39), cast outward, meets nothing before the link wall's outer face. Roof views show a dark slot at each end of the strip. Section 9 and the file header say glass closes the ends.
- **Suggested repair:** make each outer end a quad to the wall: (zc, 13.1), (`STRIP_EAST_Z`, 13.1), (`STRIP_EAST_Z`, ≈15.47), (z1, 15.6). `wings.test.ts:66` allows a vertex on the face. `SHEETS` goes from 22 to 24.
  - **Smaller gap:** under each inner slit pane (`:178`), a 0.25 × 0.1 m sliver stays open between the roof's top (12.0 m) and the pane's foot (12.1 m), where no sill bar runs. Start the pane at `LEHMAN_ROOF_Y`.

**3. Minor: #53 is still scaled by the old 6.7 m springing.**
- **Where:** `exterior-images.md:174`; `constants.ts:50`, `:53`; `vaux-front.ts:40`.
- **What's wrong:** F3 moved the springing to 6.3 m, but #53's entry still reads "at the 6.7 m … that #60 gives". At that scale it gives the apron's top 0.67 m over the main floor, and the ground windows' sills 4.1 m and heads 1.8 m under it.
  - **Code that cites it:** `VAUX_ARCH_SILL` (0.67 m) and `VAUX_GROUND_SILL` (4.1 m) cite those numbers, while `STRING_Y` says it was read at 6.3 m.
  - **At 6.3 m:** the readings become 0.63, 3.86 and 1.69 m. The code builds 0.70, 4.225 and 1.925 m.
- **Failure scenario:** a later session re-deriving the ground storey from #53 puts its windows a course higher (sill 0.46 m, not −0.115 m) and reads #60 as giving 6.7 m.
- **Suggested repair:** re-scale #53's entry at 6.3 m and say how the ground windows were set. If they were set by courses counted in #53, that is scale-free, so say so in `constants.ts`. Also say what `STRING_Y`'s "1.9 m over the crowns" is measured to: the course's middle stands 1.85 m over the 14.21 m crowns, its bottom 1.69 m.

**4. Nit: the records disagree with each other or with the code.**
- **The brick's top:** #60 says about 17.5 m (`exterior-images.md:184`). `exterior.md:158`, `plan.md:34` and `lehman-plan.ts:109` say 17.3 m. Through the stated camera, 58 px over the crowns is 17.47 m.
- **The palette's brick:** `palette.ts:89` gives `palette.brick` to "the 1939 hall's clerestory", but F6 put `core.vauxBrick` there (`medieval-hall.ts:179`).
- **East roundels:** `summary.md:5` gives the east front "four large arches with roundels". Only the inner pair have them (`vaux-east.ts:84`).
- **The gate's comment:** `vaux-fronts.test.ts:39` places the side targets on "the extrados halfway down each side". They stand 1.2 m up a 3.8 m head, 0.22 m inside the extrados.
- **#67's springing:** `exterior-images.md:198` says the voussoirs "spring at today's floor". Section 9 and the code put the second floor 0.56 m above the springing.
- **Doorway widths:** `constants.ts:45` and `vaux-arch.ts:30` call 2.6 m "today's doorways", while section 9 and the plan give the map's doors as about 2.3 m. The code keeps `b9ecd58`'s 2.6 m, so "as before" is the accurate reason.

**5. Nit: code and budget.**
- **Merge key:** `vaux-front.ts:121` keys the frame-and-bars merge by a name the caller picks (`vauxWindowMetal:main`). That is the pattern F9 retired with `mergedTrim`. It is harmless today, but key it by what it merges.
- **No mesh headroom:** the core sits at 130 of 130 meshes. The hall-windows session edits the same area (the oculus discs at `vaux-front.ts:113–116`, and `medieval-hall.ts`). Whichever lands second needs a mesh found or a budget decision.

##### Lenses that found nothing (by reading)

- **F0 arrival and motion:**
  - **Arrival:** all 21 light/dark pairs share a matrix and an order: 5 in `vaux-west-front` at order 5, 16 in `vaux-openings` at orders 5 and 12. The roundels arrive at order 12 with their heads.
  - **Motion:** follows the spec. Each piece grows or pops about its own box (`motion.ts:62`, `:119–126`). A cut side head's two tones pop about centres 0.63 m apart along the wall, which reproduces the header's −103.70 and −104.34. They converge within the first fifth of their window. That is per-piece motion, as `b9ecd58`'s rings had it.
  - **Order stagger:** this replaces the west-to-east pass with rising courses. That is the step's choice, recorded at `vaux.ts:64`.
- **Mesh budget:** round 0's 129 (Codex's count) plus one. The west front's head meshes go from 7 to 5, and `vaux-openings` goes from 14 to 17. Not run.
- **Window-parts gate:** the merge goes through `MeshBuilder.append`, which the gate follows (`window-parts.test.ts:38–49`, `:104–110`). Frame, bars and glass share a step, a matrix and order |x|, so it should stay green.
- **F3:**
  - **Pixels:** through 630 px, 23.6 m, 1.5 m over the court floor and 36° up, I get the visitor at 49.9 px, 24.52 px/m at the springing row, the band at 11.8 px, the doorway at 153.3 px, the rise at 51.1 px and the crown at 28.1 px. These match #60's measurements.
  - **Built heights:** springing 10.41, lintel 9.91, intrados apex 12.81, crown 14.21.
  - **Stripes:** the 6 px stripes are 0.28 m at their rows.
- **F4:** the lead flat (15.60–15.66 m, `lehman.ts:300`) and the head bar (about 15.65 m where it meets the string course's face) clear the string course at 15.90 m. The lintel (15.66–16.30 m) meets the flat's edge. The floor cuts miss the moved flat.
- **F5 inner ends and sheet counts:** the inner ends are closed. Lehman glass goes 16 → 22 (`quadPanes` gives two panes), `vaux-openings` glass 12 → 8, and the brick tympanum sheets are gone. The header's 10,023 sheets in 52 pairs is right.
- **F6:** the remaining `palette.brick` users are all the 1888/1894 wings.
- **[C7]:** the per-photo ratios recompute to a mean of (0.745, 0.555, 0.550). The render reads (0.748, 0.554, 0.547).
- **Holes, cuts and walking:**
  - **East holes:** the east outer doorways stop at 9.91 m and the second-floor doors start at 10.97 m. `openWall` would not catch an overlap there, since it checks only holes on the wall's base (`arches.ts:118–147`).
  - **Ring and roundel:** the east outer ring ends at X ±14.50. The roundel fits inside its niche.
  - **Passages:** every passage stays 2.6 m wide. All openings stop under the second-floor slab (9.91 < 10.47 m).

##### Read outside the diff

- **Repo instructions:** `AGENTS.md`, `local-rules.md`, and `spec.md` (Build-step API; Modules and ownership).
- **Engine:** `build/motion.ts`, `stagger.ts`, `timeline.ts:197–255`, `kit.ts`, `window-parts.test.ts`.
- **Core:** `core/core.test.ts`, `shapes.ts`, `arches.ts`, `galleries.ts:89–100`, `wings-walls.ts:40–138`, `medieval-hall.ts:154–190`.
- **Roche south:** `lehman.ts` (all of it), `lehman-plan.ts`, `lehman-glass.ts`, `roche-south/shapes.ts:56–107`, `:184–193`, `blocks.ts:12`, `:65`, `wings.test.ts:1–80`.
- **Library and collection:** `lib/wall.ts:4`; `collection/spaces-b.ts` (searched).
- **Round 0:** the snapshot's `vaux-east.ts`, `vaux-sides.ts` and `vaux-front.ts` hunks.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F19 | A head's light and dark pieces grow or pop about different pivots, each its own bounds, so they stand up to 18.5 cm apart mid-motion (Codex 1; Claude counts it per-piece motion as the spec allows) | Accepted: a composite should move as one | Each head's two geometries take the union of their bounds as their bounding box (`vaux-arch.ts` `headPair`), which the timeline reads for both pivot and stagger key; `vaux-openings` back to its Z stagger, the bays' west-to-east sweep, since the keys now agree under it; the gate checks equal world bounds, red without the shared box |
| F20 | The court's ring walls stand 0.29 m into its east opening and hide the outer halves of the central arch's lowest stones beyond 2.01 m of the axis, which #60 shows; the sightline gate passed anyway, the arch absent from its scene and its side targets 1.3 cm inside the limit (Claude 1, major; Codex 2) | Accepted: the claim was wrong and the gate too weak; the opening is the Lehman's, set from the floor map's 4.30 m flat, so it is recorded, not rebuilt here | The gate rays every face of the central head that looks out, within 1.95 m of the axis and 0.1 m over the springing, with the west front's own pieces in the scene, and requires each ray's first hit to be that face; red with the lintel on the roof (104 faces), the head at 12.9 m (32) or the head's light piece left out; section 9, the devlog and the plan say the head shows but for its lowest stones' outer halves, recorded as left |
| F21 | The strip's outer end panes stopped at the head bar's line, 0.17 m short of the brick, and a 0.1 m sliver stayed open under each inner slit pane (Codex 3, Claude 2) | Accepted | Each outer end is a quad to the brick face, each slit pane starts at the roof's top (`lehman-glass.ts`); SHEETS 22 to 24 |
| F22 | #53's readings were still scaled at the superseded 6.7 m, and the string course's "1.9 m over the crowns" was not what the code builds (Codex 4, Claude 3) | Accepted | #53 re-read at 6.3 m (apron 0.63 m, ground windows' sills 3.9 m and heads 1.7 m under the main floor, the string course's middle 1.85 m over the crowns); `constants.ts` says the ground windows are set on the courses' joints, 4.2 and 1.9 m under it |
| F23 | `palette.ts` still gave the clerestory the palette's brick (Codex 5, Claude 4) | Accepted | Comment corrected |
| F24 | The brick's top was 17.5 m in #60's entry and 17.3 m elsewhere (Claude 4) | Accepted | 17.5 m everywhere |
| F25 | The devlog gave all four east arches roundels (Claude 4) | Accepted | The inner pair |
| F26 | The gate's comment put its side targets on the extrados (Claude 4) | Moot | Those targets are gone (F20) |
| F27 | #67's entry said the voussoirs spring at today's floor, 0.56 m off the model (Claude 4) | Accepted | The floor meets them near their foot |
| F28 | "Today's doorways" are 2.6 m in the code and about 2.3 m on the floor map (Claude 4) | Accepted | "As wide as before; the floor map's are about 2.3 m" |
| F29 | The window metal's merge was keyed by a caller's name (Claude 5) | Accepted | Keyed by the merged geometries too |
| F30 | The core area sat at 130 of 130 meshes beside the hall-windows session's work (Claude 5) | Accepted | The roundels fold into their heads under the shared box: 129 of 130; the shared notes tell the hall-windows session |

## Verification

On the repairs: `npm test` 734 passed, typecheck and lint clean, the core area at 129 meshes; the new gates proved red as `core/vaux-fronts.test.ts`'s header says (2026-11-04). The full `npm run verify` on the repairs and their review are round 2's.

## Round outcome

Two major findings (F19, F20) and ten lesser: eleven accepted and repaired, one moot. The repairs change how the heads' pieces carry their bounds and what the sightline gate proves, so they go to a focused re-review in round 2.
