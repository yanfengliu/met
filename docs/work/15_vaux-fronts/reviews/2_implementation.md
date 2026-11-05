# Review 2: implementation

## Target

Commit `cbc5eddb0a783fceccacfac4970e2b40fe09afef` on `claude/vaux-fronts-3c8d7d`: its diff against `2238385`, the commit review 1 read, which holds the repairs of F19 to F30, appended to a focused prompt that pointed each lane at review 1's record.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r2/`: kept (0 failed commands). It ran headless probes (the cap pass at a 14.1 m cut, 231 forward and reverse motion comparisons, 218 sightline targets and 19,142 samples within their triangles, the end and slit panes' sightlines, mesh and sheet counts); its vitest selection ran no tests (`EPERM` on a temporary config).
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). Node and vitest were refused, so its findings rest on reading `cbc5edd` and hand arithmetic; it says so.
- Both lanes left the tree unchanged (`git status --porcelain` empty; HEAD `cbc5edd`).

## Reports

### Codex (gpt-6-astra)

Request changes on **`cbc5eddb0a783fceccacfac4970e2b40fe09afef`**. F19 fixes the heads’ timing and motion, but overriding their geometry bounds introduces a section-cap regression. F20’s narrowed visibility test and its red proofs hold; F21 closes the reported gaps; F22–F30 agree with the implementation. I found no blocker or major issue. This verdict rests on code inspection and executed headless probes; Vitest and rendered verification remain unavailable.

1. **Minor — shared motion bounds wrongly admit intact heads to the cap pass.**  
   **Location:** [vaux-arch.ts:133](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-arch.ts:133), consumed by [cap-pass.ts:55](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/viewer/cap-pass.ts:55).

   The box is not merely a broad-phase rejection bound here: its height decides whether to draw cut-coloured back faces. At a **14.10 m cut**, the west light heads are entirely below the plane—their actual maximum Y is **14.063592 m**—but their overridden boxes reach **14.210000 m**. An executed `CapPass.update(14.1)` therefore admitted **all five**.

   **Failure scenario:** view the west front during the early build, before Lehman encloses it, with that cut enabled. The falsely admitted back faces can overwrite intact granite under the existing depth bias. For an eye at `(0, 1.6, −300)` with near/far `0.05/25000`, one sampled ray’s front/back depths differ by **1.58 depth-buffer steps**, below the pass’s four-step bias. This is a ray/depth calculation, not an observed screenshot; the incorrect admission itself was reproduced directly.

   **Suggested repair:** keep shared motion/stagger bounds separate from geometry bounds, or give `CapPass` a separately computed tight box without mutating the motion bounds. Add a regression using the actual light-head geometry at this cut.

No additional findings in these lenses:

- **F19, motion and other consumers:** all **21 pairs** remained synchronized across **231 forward/reverse comparisons**, with identical matrices and visibility. Batching, frustum culling, picking/zoom and collision use conservative bounds followed, where needed, by actual triangle queries. The core block test checks containment; enlarging these boxes does not hide escaping geometry. The cap pass is the exception above.
- **F20, visibility:** all **218 target rays** hit their intended head mesh at the target distance. Another **19,142 samples** within the selected triangles and stated bounds found no obstruction. Restoring the old lintel blocked **104** targets; restoring the 12.9 m head blocked **32**, exactly matching the record. Omitting the light piece fails the two-piece requirement. The **1.95 m** and **springing + 0.1 m** limits are explicitly stated and implemented. This remains a centroid test of the listed meshes: it can miss an obstruction between samples and does not prove the complete photographed silhouette.
- **F21, glass:** rays through both former outer gaps at `Y=14, Z=−138.4` now hit panes; rays through both former slit gaps at `Y=12.05` also hit panes. The extensions terminate at the brick face and roof top. No unintended crossing found. The closure gate’s inventory is **10,025 sheets in 52 pairs**, including **24** Lehman gallery panes.
- **F22–F28, records:** no remaining contradiction found. The 6.3 m calibration, course-snapped window dimensions, string-course midpoint, 17.5 m brick reading, clerestory material, inner-pair roundels and retained 2.6 m doorway width are reconciled. F26’s obsolete targets are gone.
- **F29–F30:** the merge key includes both geometry identities. Folding the roundels into the heads preserves their placement and yields **129 meshes, 195,917 triangles and one light**. All 12 distinct head geometries passed the bounded `openAlong` probe.

Outside the diff, I read the required instructions and spec sections, plus [timeline.ts:197](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/timeline.ts:197), `motion.ts`, `stagger.ts`, [batch.ts:96](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/batch.ts:96), `cap-pass.ts`, `section-cut.ts`, `pick.ts`, `collision.ts`, `bvh-cache.ts`, `core.test.ts`, `window-parts.test.ts`, the Lehman structure/helpers, and the installed three.js raycasting/frustum implementations.

The selected Vitest suites ran **zero tests**: temporary-config creation failed with `EPERM`. Full `verify`, browser renders and photograph remeasurement were not run. Process inventory was also denied; no browser or server was launched, and all probe commands exited. HEAD and the clean worktree remained unchanged.

### Claude (claude-opus-5-5[1m])

**Verdict.** The repairs do what their dispositions say. Nothing I checked is broken in the model itself, but the new sightline gate has lost coverage that round 1's gate had. **F19:** the shared bounding box is safe everywhere I found the engine and viewer reading it. Each head pair now gets one pivot and one stagger key. Every other reader either handles a larger box safely (it only adds candidates or early-out work) or doesn't touch heads; the one exception is a cosmetic side effect in the cut's cap pass. `vaux-openings` is back on its `'z'` stagger from `b9ecd58`, and its window frames and glass still share Z centres. **F20:** the gate is now a real test that each face is seen. Its stated bounds (1.95 m, 0.1 m) are honest, and its red proofs check out by hand. But it samples one point per triangle, its centroid, so it sees nothing in the top 0.49 m of the crown. A lowered skylight head can hide the crown's top and the gate stays green; round 1's crown target would have caught that. **F21:** the new panes close the slots they claim to and cross nothing they shouldn't. **F22 to F30:** the records match the code, apart from small wording leftovers. I could not run any test: this session refused `node` and `npx vitest`, so everything below comes from reading `cbc5edd` and working the numbers by hand. The tree is unchanged (`git status --porcelain` empty, HEAD `cbc5edd`). I'd land after finding 1 is fixed; the rest can wait.

### Findings

**1. Minor (fix before landing): the sightline gate can't see the top 0.49 m of the crown.**
- **Where:** `vaux-fronts.test.ts:46-59` and `:71`, with `arches.ts:313-317` and `builder.ts:81-89`.
- **What's wrong:**
  - Each stone's front is four quads, each split into two triangles from the extrados corner. So every centroid sits a third or two thirds of the way from the intrados to the extrados.
  - The crown stone (dark, stone 7) peaks at 3.80 m over the springing, 14.21 m. Its highest centroid is (o₁ + o₂ + i₂)/3 = 3.31 m, so 13.72 m.
  - Stones 6 and 8 reach 14.06 m, but their highest centroids are at about 13.59 m.
  - The header (`:2-4`) says "every face ... is the first thing a ray meets". In practice that means each face's centroid, and a face that is partly hidden passes.
- **Failure scenario:**
  - Set `STRIP_HEAD_Y = 13.8` (`lehman-plan.ts:113`). The lead flat (`lehman.ts:300`) then stands at 13.80–13.86 m, running to the brick at Z −138.3 and so through the voussoirs' 6 cm projection. The lintel (`lehman.ts:231`) sits at 13.86 m.
  - Every target ray stays under 13.72 m. At the lintel's far edge (Z −138.505) the highest ray is at 13.61 m. So the gate is green.
  - Meanwhile the crown is hidden above 13.80 m (0.41 m of its stone), and the flat cuts through it.
  - Round 1's target at crown − 0.1 (14.11 m) would go red here. The repair dropped that target.
- **Suggested repair:**
  - Add targets at each front triangle's corners, pulled 1–2 cm toward its centroid (or subdivide the triangles), plus one at the crown's apex.
  - Add a red proof with `STRIP_HEAD_Y` between 13.75 and 14.1.
  - State the sampling in the header.

**2. Minor: the "move as one" gate checks the box it set, not the motion it claims.**
- **Where:** `vaux-fronts.test.ts:93-115`, `vaux-arch.ts:133-135`, `timeline.ts:199-216`, `spec.md:96-97`.
- **What's wrong:**
  - The test compares the two pieces' `geometry.boundingBox` values, which `headPair` set equal. It then feeds those boxes to `staggerKeys` itself.
  - It never builds a `Timeline` or reads a moving matrix. So the header's claim that the build takes this box for the pivot rests on reading the code, not on a test (R19).
  - Nothing records the contract this depends on: that the engine reads a geometry's box and never recomputes it.
- **Failure scenario:**
  - The engine starts recomputing boxes, for example an unconditional `geometry.computeBoundingBox()` at `timeline.ts:201`.
  - Or a test calls `lib/check.ts` `boxOf` or `unionBox` on a head (`check.ts:53-57` and `:104-112` recompute unconditionally) before building a timeline in the same file.
  - Either way the heads separate again (round 1 measured 18.5 cm), and this gate stays green.
- **Suggested repair:**
  - Build `new Timeline(vauxSteps)` and evaluate `vaux-west-front` and `vaux-openings` at a few fractions in between.
  - Require each light and dark pair's instance matrices to be equal while they move. Red proof: remove the box override.
  - Ask the engine owner for one line under the spec's Composite pieces naming the technique and the readers' duty not to recompute.

**3. Nit: the cap pass now caps a light head piece that lies wholly under the cut.**
- **Where:** `cap-pass.ts:55-63` and its bound at `:8`; `section-cut.ts:11-12`.
- **What's wrong:**
  - `heightRange` reads the pair's shared box. The west and side light pieces really stop at 14.06 m, but their box reaches 14.21 m. On the east front the light pieces stop at 13.97 m and the box reaches about 14.28 m.
  - So a cut set by hand in that band (0.15 m on the west and side heads, 0.3 m on the east) caps those pieces. That breaks the header's promise that a piece under the cut never shows its back in the cut colour.
  - With the camera rig's near plane at distance/100 (`camera-rig.ts:310`), the bias stays at a few millimetres or less, so at most rare edge slivers show.
  - Dark pieces above the cut are capped too, but the cap material carries the plane (`section-cut.ts:71`), so they draw nothing.
- **Suggested repair:** have the cap pass cache its own tight box per geometry, or name the case in `cap-pass.ts`'s Bound.

**4. Nit: each new outer end pane lies in the same plane as the head bar's end face.**
- **Where:** `lehman-glass.ts:185` against `:167`.
- **What's wrong:** the head bar runs exactly x0→x1, so its end face lies in the pane's plane X = outer. Below 15.6 m they overlap by about 0.015 m², so glass may flicker over steel there.
- **Context:** the inner end triangles already overlap the sill and head bars' end faces in the same way (`:176`).
- **Suggested repair:** stop the quad at the bar's underside (about 15.47 m at the wall, as round 1 suggested), or inset the bars' ends.

**5. Nit: some records still disagree.**
- **String course:** `exterior.md:158` and `plan.md:34` still say "a string course 1.9 m over the crowns" without saying it's the middle. That is the ambiguity F22 fixed in #53 and `vaux-front.ts:40`. `STRING_Y` (15.9) is the course's bottom (`vaux-front.ts:105`), which stands 1.69 m over the crowns.
- **Window sill:** `constants.ts:50` tags `VAUX_ARCH_SILL = 0.7` as measured but cites #53's 0.63 m reading. Say "rounded" or use 0.63.
- **Lehman comment:** `lehman.ts:228-229` still says #60 "shows the arch whole through this opening" and doesn't mention the exception section 9 now records.

### Lenses that found nothing
- **F19 readers:**
  - Timeline: pivots and keys now agree. Step bounds are unchanged. Per-mesh shadow and cull boxes only grow.
  - Batching: the cull spheres come from those boxes, so frustum culling only gets more conservative.
  - `restingPieces`: its users are the door layer (door pieces only) and the floor view (landscape only, `floor-view.ts:52-53`).
  - Picking and the zoom: `pick.ts:201-207` builds a looser early-out sphere; the hit itself is exact.
  - Walk collision: the grid and candidates use the box (more candidates, same results), and the downward rays start a metre over it (`collision.ts:195-205`, `:470`). The walk's BVHs are built with `setBoundingBox: false` (`bvh-cache.ts:27`).
  - Core test block bounds: the shared box spans exactly what the two pieces span, so the check gives the same result.
  - Closure grid: `inwardAlong` takes its bounds from vertex positions.
  - No runtime code recomputes these boxes: `check.ts` is test-only, and Vitest isolates files.
- **`'z'` stagger:** window frames span z −depth to 0 and their glass sits at −depth/2 (`window.ts:4-6`, `:204`), so their keys agree.
- **F20 scene and proofs:**
  - The scene is complete: the pyramid is in `lehmanGlassSteps`, the Lehman paintings hang on gallery walls, and the glass is left out as transparent.
  - I found no way for it to fail spuriously: the band hides under 3 cm, against the 0.1 m start, and the ring corner leaves 6 cm of clearance.
  - The red proofs match my estimates: about 215 targets; about 100 above 12.43 m with the lintel on the roof (104 claimed); about 33 above 12.97 m with the head at 12.9 (32 claimed).
- **F21:**
  - The outer quads meet the wings' plain brick between the pilaster strips (which stop at |X| 14.8) and the blind panels (which start at 15.35), standing on the coping, whose inner edge is at |X| 15.0.
  - The slit panes start on the roof's edge at Z −139.6, beside the sill bar's end.
  - The sheet counts add up: 10 band panes plus 2 runs × 7 strip panes gives 24, and the header's total of 10,025 in 52 pairs follows.
- **F22 to F30:**
  - The ground windows sit on course joints 3 and 7, giving 4.2 and 1.9 m under the main floor.
  - The brick's top is 17.5 m in every record.
  - The palette comment, the devlog's roundels, #67's wording and the 2.6 m wording are corrected.
  - The window metal's cache key now includes the frame's and bars' uuids.
  - The mesh count drops by one (the roundel mesh) to 129.

### Read outside the diff
- **Repo instructions and records:** `AGENTS.md`, `local-rules.md`, `spec.md` (Build-step API; Modules and ownership), review rounds 0 and 1.
- **Engine:** `build/timeline.ts`, `batch.ts`, `motion.ts`, `stagger.ts`, `window-parts.test.ts`.
- **Viewer and walk:** `viewer/cap-pass.ts`, `section-cut.ts`, `pick.ts`, `floor-view.ts`, `camera-rig.ts:310`; `walk/collision.ts`, `bvh-cache.ts`.
- **Library:** `lib/check.ts`, `facing.ts`, `builder.ts`, `window.ts`.
- **Core:** `arches.ts`, `constants.ts`, `vaux-front.ts`, `vaux-sides.ts`, `core.test.ts`, `shapes.ts`, `wings-walls.ts`.
- **Roche south:** `lehman.ts`, `lehman-plan.ts`, `lehman-glass.ts`, `shapes.ts`, `materials.ts`, `index.ts`.
- **Other:** `vitest.config.ts`; `vaux.ts` at `b9ecd58`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F31 | The heads' shared bounding box, wider than each piece, makes the section cut's cap pass treat a light head wholly under the cut as cut, so for a cut set within 0.15 m of the crowns (0.3 m on the east) it may draw cut colour over intact stones (Codex 1, Claude 3) | Accepted: the cap pass reads a piece's box as its own, and the engine has no other channel for a shared pivot | Each head's pieces keep their own tight bounds; F19's aim, one motion for a head, is met instead by moving every head into `vaux-openings`, which drops each piece a fixed 3 m in rising courses by order, a translation the same for both pieces whatever their bounds |
| F32 | The sightline gate sampled only triangle centroids, none in the crown's top 0.49 m, so a skylight head lowered to 13.8 m would hide the crown while the gate stayed green (Claude 1) | Accepted | It samples each face's centroid and its corners drawn 2 cm in; red with the head at 13.8 m (27 points hidden), at 12.9 m (110) and with the lintel on the roof (398); the header names the sampling |
| F33 | The pair gate compared the boxes the code set, not the motion it claimed (Claude 2) | Accepted | The gate builds the timeline and compares each head's light and dark instance matrices at five moments through its step; red with the step popping its pieces (25), staggered by Z (15), or dropping each by its own height (25) |
| F34 | The strip's new outer end pane lay in the plane of the head bar's end face (Claude 4) | Accepted | The pane stops at the bar's underside, 0.13 m under the head line, and the bar's end closes the rest |
| F35 | Records: the string course's 1.85 m is to its middle; `VAUX_ARCH_SILL` is rounded; `lehman.ts` still said the arch shows whole (Claude 5) | Accepted | `exterior.md` section 9, the plan, `constants.ts` and `lehman.ts` corrected |

## Verification

On the repairs: `npm test` 734 passed, typecheck and lint clean, the core area at 129 meshes; the gates' red proofs as F32 and F33 give them, each restored green (2026-11-04). The full `npm run verify` on the repairs and their review are round 3's.

## Round outcome

No blocker or major finding; five lesser, all accepted and repaired. The repairs move the west front's heads into the openings step and change that step's motion, so they go to a focused re-review in round 3.
