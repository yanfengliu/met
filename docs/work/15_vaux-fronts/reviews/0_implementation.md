# Review 0: implementation

## Target

The working tree of `claude/vaux-fronts-3c8d7d` over base `b9ecd58`, uncommitted: the patch `git diff HEAD` with the new files added as intent-to-add, preserved as `snapshots/0_target.patch.txt` (1,260 lines, sha256 `0f30a51ae943a219e36c2bec83f0ac4566e731fb285e5fb1a5036844ec2e38f5`). It held the five-arch west front, the side and east walls' new modules, `core.vauxBrick` #9A7971, the skylight head at 15.4 m in `frame.ts` with a constants-only gate in `core/core.test.ts`, and each wall's side and east head trim merged into one piece per material.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, run from fleet's `tmp/review-runs/u15-vaux-r0/`: kept by the runbook's check (0 failed commands). It ran headless probes of its own (hole bounds over 118 holes in 24 wall calls, closure and facing over 56 geometries, 48 walker probes, ring caches), and read files outside the diff.
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools (`Task, Bash, Glob, Grep, Read`, `dontAsk`, no MCP): kept (one `result`, one model). Its vitest run was refused by the permission mode, so its findings rest on reading the tree; it says so.
- Both lanes left the tree unchanged (`git status --porcelain` and `git diff HEAD` compared before and after). The author's `npm run verify` ran on the same tree while they read it.

## Reports

### Codex (gpt-6-astra)

Request changes for a construction-replay regression, plus two smaller verification and record issues. I found no new geometry or walkability blocker in the checks below. The reviewed changes are uncommitted over `b9ecd58`, rather than a separate reviewed commit.

1. **Major — the east arches’ light and dark stones separate during playback.**  
   [vaux-east.ts:118](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:118), [vaux.ts:65](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux.ts:65). The merged light geometry includes recessed roundels, giving it a different Z centre from the dark geometry. The step uses `stagger: 'z'`, so their identical `order: 12` does not synchronize them: light arrives during **0.6796875–0.9296875**, dark during **0.75–1**. Because `pop` scales each entire merged wall group about its centre, at progress **0.8** an outer arch’s light axis is at X **12.190**, while its dark axis is at **7.699**—a **4.49 m separation**. This violates the composite-arrival contract and visibly disassembles the arches during the build. Give corresponding materials a common arrival window and motion frame; preserve batching without independently scaling their contents across the whole facade.

2. **Minor — the skylight gate does not protect the visibility it claims.**  
   [core.test.ts:81](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/core.test.ts:81), [lehman.ts:231](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/lehman.ts:231). The assertion compares constants without inspecting the built lintel or roof. Restoring only the old lintel placement **in memory**, while retaining the new head constant, leaves the assertion green but blocks the central crown from the recorded court camera. Its red proof at 12.9 m establishes the height inequality, not visibility. Check the built geometry and a pinned central-crown sightline. Narrow the test’s wording to the central arch: the other four crowns remain occluded, as section 9 already acknowledges.

3. **Minor — the east-front decision record disagrees with the implementation.**  
   [plan.md:31](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/docs/work/15_vaux-fronts/plan.md:31), [vaux-east.ts:42](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:42), [vaux-east.ts:92](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:92). The plan specifies outer arches at **±11.6 m** and a roundel in every head. The code places them at **±12 m** and builds roundels only in the inner pair. Section 9 also says “each with a roundel.” A later fidelity check following those records would expect geometry that is absent. Record ±12 m and explicitly document the outer roundels’ omission and its reason, or implement the stated decision.

Other lenses checked:

- **Geometry:** no overlapping/touching hole bounds, repeated outline points or escaping holes across **118 holes in 24 wall calls**. No vertical-closure or mirrored-matrix failures in the Vaux pieces. Facing and inward-pocket probes found no failures across 56 distinct solid geometries in Vaux and Lehman structure.
- **Walkability:** 48 short, bidirectional walker probes against the base showed no reduced progress or new height obstruction. Existing stalls remained; several former 12 cm floor-band lips disappeared.
- **`crown`, `omit`, caching:** no defect found in current callers. Four sampled legacy ring configurations were byte-identical to the base. Changed omissions/crowns produced distinct cache entries; reordered omissions reused one. Current `mergedTrim` callers have distinct keys.
- **Budgets and rules:** core builds **129 meshes**. Changed TypeScript files remain below 500 lines; no prohibited environment reads found in the inspected changed builders; `git diff --check` passed. Sheet-count changes match the removed panes and panels.

Outside the diff, I read [medieval-hall.ts:99](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/medieval-hall.ts:99) and its aisle linings, [shapes.ts:14](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/shapes.ts:14), [stagger.ts:28](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/stagger.ts:28), [motion.ts:112](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/motion.ts:112), and the collision, walker and geometry-check implementations.

These were read-only headless probes. I did not run full `verify`, capture renders or independently remeasure photographs; the implementer’s verification log was still running when inspected.

### Claude (claude-opus-5-5[1m])

**Verdict.** The geometry and walkability hold up when read closely, but I wouldn't land this as is. No `openWall` hole overlaps, touches or leaves its wall, and no outline repeats a point. No passage is added, removed, narrowed or moved. The new `crown` and `omit` keys are complete, and existing `voussoirRing` callers get the same geometry as before. The cuts leave no stone in any doorway.

The main problem is how the trim is merged. `mergedTrim` bakes all six hall heads of each side wall, and all four east heads, into one world-space piece. The `vaux-openings` step's `pop` then scales each piece about its centre, so in the build replay the heads sweep along the walls. The rest are minor findings in the measurements and records, plus a gap the raised Lehman head opens. The new core gate compares constants with constants, not the built pieces.

I could not run any gate: vitest was refused in this permission mode. Everything below comes from reading the working tree against `b9ecd58` and doing the arithmetic by hand. "129 meshes", closure, reach and routes are not verified by me.

##### Findings

1. **Major — merging the heads breaks the `vaux-openings` step's motion and stagger.** `vaux-arch.ts:130-136`; `vaux-sides.ts:96-109`, `:143-145`; `vaux-east.ts:77-97`, `:118-119`.
   - **What's wrong:** each merged piece is added at the identity matrix. The step uses `pop` with stagger `z` (`vaux.ts:63-64`). `pop` scales a piece about its own box centre (`motion.ts:62`), so each wall's heads share one pivot and one arrival rank.
   - **Failure scenario:** play through `vaux-openings`. The north wall's six heads start as a point at Z ≈ −100.5, Y ≈ 12.5 and spread up to 16.5 m along the wall. The end stones overshoot by about 0.87 m (easeOutBack peaks at 1.053). The east dark piece spreads out from X 0, and its outer blocks overshoot to X ±15.27, 0.77 m past the block's corners. In 1880 no later wing hides any of this. In `b9ecd58` each head popped in place, bay by bay.
   - **Spec:** it doesn't forbid merging (it mentions merged park paths, `spec.md:122`), but `pop` and the stagger work per piece (`spec.md:96-97`), and `local-rules.md:5` makes the build the product.
   - **Repair:**
     - **Sides:** build each distinct head once in the arch's own frame and place it per bay. `SECOND_CUT` is defined in the arch's frame (`vaux-sides.ts:36`) and is the same on both walls. So light-uncut, light-cut, dark-uncut and dark-cut are 4 meshes, the same as the 4 merged pieces now.
     - **East:** per-arch pieces need 6 meshes (inner, outer−, outer+ per material), 4 more than now. That puts the area at 133, over the 130 budget, so it needs a coordinator decision or a recorded exception.

2. **Minor — the new gate only checks constants against each other.** `core.test.ts:81-85`.
   - **What's wrong:** it compares `SPRING_Y + VAUX_ARCH_RISE + VAUX_VOUSSOIR_CROWN` with `LEHMAN_STRIP_HEAD_Y`. It reads neither the built rings nor the built head.
   - **Failure scenario:** revert `lehman-plan.ts:108` to `LEHMAN_ROOF_Y + 0.9`. The lead flat (`lehman.ts:300`) drops back to 12.9 m, 1.46 m under the crowns, and the gate stays green. Moving the rings in `vaux-front.ts:99` also stays green. The header (`:12-13`) doesn't name this bound (AGENTS.md R19).
   - **Repair:** compare the max Y of `vaux-west-front`'s ring pieces with the min Y of the lead flat prism, the head bars and the east lintel. Prove it red by reverting `lehman-plan.ts:108`.

3. **Minor — #60's vertical readings use two scales.**
   - **What's wrong:** the rise (51 px) and crown depth (28 px) are read at 0.92 × 24.5 ≈ 22.5 px/m (`constants.ts:44`, `:46`). The stripes' 0.27 m also needs 22.5 (`plan.md:22`). The doorway (153 px → 6.2 m) and the impost (12 px → 0.5 m) are read at 24.5 (`constants.ts:49-50`).
   - **Failure scenario:** at the vertical scale throughout, the doorway is 6.79 m and the band 0.53 m. The springing would sit at 11.43 m, 0.46 m above the second floor, and the crowns at 14.93-14.98 m. The gate's margin under 15.4 m would then be 0.42-0.47 m, so it would fail.
   - **Repair:** state which scale each reading uses and why. If #67's "spring at today's floor" sets the springing, say so and tag `VAUX_ARCH_SPRING` D, not M.

4. **Minor — the Lehman head contradicts #60's own measurement.**
   - **What's wrong:** `frame.ts:137` says "#60 shows brick over them up to it". #60's new reading (`exterior-images.md:184`) gives about 58 px of brick over the crowns: 2.37-2.57 m, so a head at about 16.7-16.9 m. The code leaves 1.04 m.
   - **Why 15.4:** it seems chosen to stay under `STRING_Y = 15.7` (`vaux-front.ts:40`), which has no source or E tag. `lehman-glass.ts:137` relies on that string course.
   - **Repair:** record 15.4 as an estimate tied to the string course, say why the 58 px reading isn't followed, and tag `STRING_Y`.

5. **Minor — raising the head opens the skylight strip's ends.**
   - **Outer ends:** `lehman-glass.ts:169-172` closes only the inner ends. The outer ends relied on the link walls, whose coping tops out at 13.1 m (`lehman.ts:116`, `:124`; `lehman-plan.ts:26`). The glass now rises to 15.4 m, leaving an opening of about 1.3 m² at each outer end (X −15.1 and +15.0). It is 0.96 m wide at 13.1 m and narrows to 0.17 m at 15.4 m, open to the sky.
   - **Inner ends:** the 0.25 m slit at Z −139.6 between the ring wall (X ≈ ±3.54) and the end triangle (≈ ±3.79, `lehman-plan.ts:126`) grows from 0.9 m to 3.4 m tall.
   - **Repair:** add end panes from the coping to the head, and carry each inner triangle across to the ring wall.

6. **Minor — the raised nave now has two bricks.**
   - **What's wrong:** the nave's upper end walls and gables are `core.vauxBrick` (`vaux-shell.ts:174-175`). Its clerestory skin is still `palette.brick` (`medieval-hall.ts:179`). The comment at `:163` still says "like the rest of the old building".
   - **Failure scenario:** aerial views show grey-pink gables beside red clerestory walls.
   - **Repair:** pick one brick for the nave, with evidence of its date. Coordinate with the hall-windows session (`plan.md:16`).

7. **Minor — the east-front records contradict the code and each other.**
   - **Roundels:** `vaux-east.ts:2-4` and `exterior.md:158` give each of the four arches a roundel, but the code gives the outer pair none (`vaux-east.ts:91-92`).
   - **Windows:** `vaux-east.ts:4-5` says "Their windows are bricked up", while section 9 says the inner pair are doorways today, waiting for the owner. There's no owner note in `vaux-east.ts`; the west front has one (`vaux-front.ts:26-29`).
   - **Positions:** `plan.md:31` puts the outer arches at ±11.6; the code (`vaux-east.ts:42`) and section 9 say ±12.

8. **Minor — #49's light piers are neither built nor listed as left.** The new #49 reading (`exterior-images.md:170`) records "light stone piers" between the windows and between the heads. `vaux-sides.ts:115-147` builds brick there, and section 9's "Left as they are" doesn't mention them.

9. **Nits**
   - The devlog says "its court shows the arches whole" (`summary.md:5`), but section 9 says only the central arch does.
   - The `mergedTrim` key is a caller-chosen string, not derived from its content (`vaux-arch.ts:131`). `sideRings` leaves `x` and `facing` out of its key (`vaux-sides.ts:108`). It's safe today: six distinct keys, one content each. The other memos key every parameter (`arches.ts:114`, `:295`).
   - The `closure.test.ts:9` header still says 10,028 sheets in 53 pairs; SHEETS now sums to 10,017 in 52.
   - Three 0.12 m lips that `b9ecd58` had across the main-floor doorways (west central, the east passages, the side doors) are gone. That's benign, but no record says so.
   - The new impost band and string course reach X ±14.5. There they overlap wing B/C's west pilaster strip (`wings-walls.ts:122`) with coplanar faces 0.08 m proud, so renders may flicker. This is the same kind of overlap the old bands had.
   - `vaux-front.ts:24` says five arches in #49 and #65; each shows two beside the porch.
   - `crown` is ignored for non-pointed heads but still goes into the cache key.
   - `tympanum`'s 'panel' part is now unused.
   - `VAUX_ARCH_SPAN` and `VAUX_GROUND_SILL` are tagged M, though both were chosen or snapped.
   - `frame.ts` (coordinator) and `palette.ts` (engine) are owned by others (`spec.md:227-228`) and aren't in the plan's scope.
   - The brief gives the brick as #90726B; the code and records say #9A7971.

##### Lenses with nothing found

- **`openWall`:** checked every hole on every wall pairwise. The only point to note is the niche's deliberate 2 cm drop under the springing (`vaux-arch.ts:105-106`), which avoids a repeated point.
- **Closure (by reading):** the annulus is closed and faces out. Omitted stones leave every other stone closed. The crown extrados stays outside the intrados. Merged parts only touch, never overlap. No matrix is mirrored.
- **Walkability:** all widths are unchanged, and no crossing stone is left in any second-floor doorway. The ground-floor door was never walkable and hasn't changed.
- **Existing `voussoirRing` callers:** same geometry for `medieval-hall.ts:103`, `:195`, `:211` and `choir-screen.ts:177`, `:228`.
- **Tests:** no gate got weaker.
- **Repo rules:** all files are under 500 lines, and there are no new env reads.
- **Floor views:** no floor cut slices the moved lead flat (cuts at 3.1, 7.8, 12.7 and 27.4 m).

##### Read outside the diff

- AGENTS.md, `local-rules.md`, and the spec sections the brief named.
- `medieval-hall.ts:90-241`.
- Roche south: `lehman.ts:54-135` and `:180-302`, `lehman-plan.ts`, `lehman-glass.ts`, `roche-south/blocks.ts`.
- Hunt: `hunt/galleries.ts:1-80`, `hunt/dims.ts`.
- Core: `wings-walls.ts:20-190`, `core/galleries.ts:70-110`, `shapes.ts`.
- Engine: `lib/builder.ts:267-311`, `build/motion.ts`.
- Tests and viewer: `closure.test.ts`, `floors.ts`, `floors.test.ts`.
- Collection and doors: `collection/spaces-b.ts`, `model/doors.ts`.
- Base versions of `vaux-front.ts` and `vaux-shell.ts` at `b9ecd58`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Merging each wall's heads into one piece per material breaks `vaux-openings`' pop and stagger: the east light piece (with the roundels' recess) took another stagger key than the dark, and every merged piece popped about its wall's middle, the heads sweeping along the walls (Codex 1, Claude 1) | Accepted: the build is the product (local rules) and a composite arrives together (spec, Composite pieces) | Each head is two pieces, light and dark, built in the arch's frame and placed per arch (`vaux-arch.ts` `lightHead`, `darkHead`); the roundels are pieces of their own; window frames merged with their bars to stay within 130 meshes; `vaux-openings` staggered by order, since a door bay's cut head centred its two pieces 0.64 m apart; gate in `core/vaux-fronts.test.ts`, red with the step staggered by Z |
| F1 | The skylight gate compared constants, not built pieces (Codex 2, Claude 2) | Accepted | Replaced by rays from the court camera to the central arch's crown, both sides of its head and its band, against the Lehman structure's and glass's opaque pieces (`core/vaux-fronts.test.ts`); red with the lintel back on the flat roof and with the head back at 12.9 m; worded for the central arch only |
| F2 | The east front's records disagree with the code: ±11.6 against ±12, roundels in every head, "windows bricked up" beside the owner question (Codex 3, Claude 7) | Accepted | Plan, section 9 and `vaux-east.ts`'s header corrected: outer pair at ±12, roundels in the inner pair, the outer heads cut by the second-floor doors; owner note for the inner pair's corridors |
| F3 | #60's vertical readings used two scales (Claude 3) | Accepted: the scale varies with the camera's tilt and was not solved | #60's camera solved from the landing's row, a visitor (1.65 to 1.75 m) and the bay at the springing's row: springing 6.3 m over the main floor (was 6.7), rise 2.4 m, crown depth 1.4 m (`constants.ts`, `exterior-images.md` #60) |
| F4 | The skylight head contradicts #60's 58 px of brick over the crowns; `STRING_Y` had no source (Claude 4) | Accepted in part | `STRING_Y` 15.9 m from #53; the head an estimate at 15.6 m between the crowns (about 14.2 m) and the string course, in `lehman-plan.ts`; #60's brick to about 17.3 m, over the pyramid's eave, recorded as left in section 9 with its reason |
| F5 | Raising the head opened the skylight strip's ends (Claude 5) | Accepted | Glass triangles over the link walls' coping at the outer ends, and panes across the 0.25 m to the ring wall at the inner ends (`lehman-glass.ts`); SHEETS 16 to 22 |
| F6 | The nave's gables took the new brick, its clerestory skin kept the palette's (Claude 6) | Accepted: the skin's own note says it is faced "like the rest of the old building" | The skin is `core.vauxBrick` (`medieval-hall.ts`); the hall-windows session told |
| F7 | #49's light piers neither built nor recorded as left (Claude 8) | Accepted | Recorded as left in section 9 and `vaux-sides.ts`'s header, with the reason |
| F8 | The devlog said the court shows the arches whole (Claude 9) | Accepted | Now the central arch |
| F9 | `mergedTrim`'s key was caller-chosen (Claude 9) | Accepted as moot | `mergedTrim` is gone; the heads' keys name their kind and cut |
| F10 | `closure.test.ts`'s header totals were stale (Claude 9) | Accepted | 10,023 sheet pieces in 52 pairs |
| F11 | The 0.12 m lips across the main-floor doorways are gone with no record (Claude 9) | Accepted | Recorded in section 9 |
| F12 | The impost band and string course reach X ±14.5 and overlap the 1888/1894 walls' pilaster strips coplanar (Claude 9) | Rejected for now: the old bands did the same; a separate fix of the corner | None |
| F13 | `vaux-front.ts` said five arches in #49 and #65 (Claude 9) | Accepted | Five in #53, #60, #64; two either side of the porch in #49 and #65 |
| F14 | `crown` goes into the cache key of a non-pointed ring that ignores it (Claude 9) | Rejected: harmless, it only splits a cache entry no caller makes | None |
| F15 | `tympanum`'s panel part is unused (Claude 9) | Rejected: a library part with its own callers' contract | None |
| F16 | `VAUX_ARCH_SPAN` and `VAUX_GROUND_SILL` tagged M though rounded or snapped (Claude 9) | Accepted | "M, rounded up" and D |
| F17 | `frame.ts` and `palette.ts` are owned by others (Claude 9) | Accepted | `frame.ts` restored: the head's estimate lives in `lehman-plan.ts`; `palette.ts` keeps a comment-only change, named in the plan's scope |
| F18 | The brief gave the brick as #90726B (Claude 9) | No change: superseded by the recalibration to #9A7971 before the review | None |

## Verification

On the target: `npm run verify` through the gate lock with `MET_PORT=5378` passed: 733 unit tests, typecheck, lint, build and 125 end-to-end tests (`tmp/vf/verify-1.log`, ignored). On the repairs: `npm test` 734 passed, typecheck and lint clean, the core area at 130 meshes; each new gate proved red as its header says. The repaired tree's full verify and its review are round 1's.

## Round outcome

One major finding (F0), accepted and repaired, and eighteen lesser: fourteen accepted and repaired, three rejected with reasons (F12, F14, F15) and one superseded (F18). The repairs change the build's structure and the arch's measurements, so they go to a focused re-review in round 1.
