# Review 5: implementation

## Target

Work unit 15's follow-up, the owner's doorways (the plan's last section), uncommitted on `claude/vaux-fronts-3c8d7d` over `6935f6b` (origin's main then): the patch `git diff HEAD`, kept as `snapshots/5_target.patch.txt` (55,534 bytes, sha256 `605d24a4531260ae14cb4d9917e97737ddd59c0951edcaf71e6dc133efd3d112`), appended to a focused prompt that pointed each lane at the plan's follow-up and review 4's record. It opened the west front's arches at X ±5.8 as doorways and the corridors through the east front's inner arches, added routes R8 and R9 with their checks, and carried the reach, placement and closure gates and the records over the new passages.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r5/`: kept. It ran the route test bodies and the two existing fronts' tests through an in-memory Node harness, 100 aperture rays and in-memory mutations of the corridor's width and height and of the floor band; three of its commands exited 1, none with the sandbox's failure code. It read the six renders then in `tmp/vf/doors/` at native size.
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). It ran no tests, to keep load off the verify running beside it, and read four renders at native size, two of them the views Codex's third finding asked for, captured while it ran.
- Neither lane changed a file: Codex ran in the read-only sandbox and says so, and Claude's tools only read (its Bash allowed `git diff`, `git log` and `git show`). The tree was not compared with `status-before.txt` when they finished, since this session's own repairs had begun.

## Reports

### Codex (gpt-6-astra)

No blocker or major found. The current geometry implements the four passages as described, and R8/R9 traverse them both ways on the intended floors. I found three minor verification issues below. All 27 route test bodies and both existing Vaux-front tests passed through an in-memory Node assertion harness, not Vitest. I also checked 100 aperture rays and inspected the six retained renders at native resolution. Full `verify` was not run.

1. **Minor — R9’s floor assertion misses a lip immediately outside the east face.** [routes.test.ts:242](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/hunt/routes.test.ts:242) filters samples to inside the wall, excluding the projecting band. In memory, I changed [vaux-east.ts:98](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:98) to stop cutting the band around the corridors. All six R8/R9 tests still passed, although both directions climbed to **Y 4.23**, a **15 cm rise from the Hunt slab**. The general route assertion permits this because it is below `BODY.step`. Extend the floor check across both approaches, allowing the documented 4.08/4.11 m transition while rejecting higher surfaces; use this mutation as its red proof.

2. **Minor — the new gates do not preserve the corridors’ stated dimensions.** [routes.test.ts:240](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/hunt/routes.test.ts:240) obtains its bounds from the same `eastCorridor` function that determines the geometry and route centre. Independently changing the corridor width to **1.00 m**, or its height to **2.00 m**, left all six R8/R9 tests green. These tests establish capsule passage, but a substantial narrowing or lowered head can escape them. Add geometry probes with independently pinned X limits and head height, covering the clear opening near both jambs and below the lintel.

3. **Minor — retained visual evidence does not substantiate the completed coverage claim.** [plan.md:83](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/docs/work/15_vaux-fronts/plan.md:83) checks off every opening from both sides. The cited folder contains six images; it lacks the north west doorway viewed from gallery 521 and the north east corridor viewed from gallery 304. None of the retained images covers those missing views. A defect visible only from either reverse side could therefore escape review. Retain and inspect those two views, or identify where that evidence already lives and correct the record.

The remaining lenses found nothing requiring repair:

- **Geometry:** `archHoles` supplies through openings below separate blind heads. The infill, apron, band and jamb splits match the described dimensions. No obstruction appeared in the 100 sampled rays.
- **Measurements and records:** the canonical map conversion confirms east widths **1.78/1.75 m**, with model X-edge offsets no greater than **6 cm**. The owner’s decision and date are recorded consistently.
- **Interactions and budgets:** the placement zones extend 6 m beyond both wall faces, and the reach targets include both route ends. I found no adverse interaction with the ring wall, iron posts, slab or door layer. Core totals are **129 meshes, 181,622 triangles and one light**. Applying the closure inventory’s eligibility rule gives **10,021 sheets in 52 pairs**, including six Vaux panes.

Outside the diff, I read [arches.ts:150](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/arches.ts:150), [vaux-arch.ts:147](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-arch.ts:147), `constants.ts`, `layout.ts`, `shapes.ts`, `vaux.ts`, `vaux-shell.ts`, `core.test.ts`, `vaux-fronts.test.ts`, `lehman.ts`, `lehman-plan.ts`, Hunt’s `podium.ts` and `hall.ts`, `doors.ts`, walker/collision code, build-kit code, and the map cache’s README and feature data.

No files were changed, created or deleted. No browser or server was launched.

### Claude (claude-opus-5-5[1m])

##### Verdict

There is no blocker or major finding. The openings are built as the plan says:
- The infill, the band and apron splits and the inner order fit exactly. There is no gap, no lip on either walking line and no visible coplanar face.
- The floor-map readings and the "within 6 cm" claim are right.
- The core stays at 129 of its 130 meshes.

What needs fixing:
- Two regressions in the build animation that no gate sees.
- R9's check doesn't cover the floor band outside the east face.
- The spec's placement contract wasn't updated.

**The separate verify run, verify-9, ended red.** It finished at 17:05:56 with exit 1. Unit tests, typecheck, lint and build passed, then 123 e2e tests passed and 2 failed. Both failures are frame-time budgets far from the 1880 fronts:
- `doors.spec:372`: slowest frame 18.30 ms, limit 16.7.
- `routes.spec:427`, Leon Levy court: GPU time 17.36 ms, limit 16.7.

It looks like machine load:
- The run drew about half the usual frames: 346 in 4.97 s, against 675 in 3.91 s in verify-7.
- This change removes only 20 collision triangles (1,472,269 against 1,472,289 at `a9acc06`).
- I ran ripgrep over the floor map's JSON during that window, so part of the load may be mine.

Before rerunning, note that `tmp/vf/vite-doors.log` shows a dev server on this worktree's port 5378 serving a page at 17:09:32. That is what made verify-8 fail ("5378 is already used"), so stop it first.

I ran no tests, to keep load off verify-9. My evidence is the code, hand arithmetic, the session's logs and four of the eight renders read at native size.

##### Findings

**1. Minor: the brick infill appears in mid-air during the walls step.**
- **Where:** `vaux-east.ts:55-63` and `:84`; `vaux.ts:26-33`; `motion.ts:59-61` and `:112-117`; `stagger.ts:42-44` and `:77-84`.
- **What's wrong:**
  - `eastInfill` is built in `vaux-walls`, whose motion is grow, staggered by Z.
  - Grow scales each piece from its own bottom. So the boxes rise from 4.11, 4.81 and 8.11 m, not from the footings.
  - The two set-back boxes are centred on Z −69.625. That is a stagger rank of their own, one before the wall at −69.5; the step now has 15 ranks.
  - So they start at f ≈ 0.696, while the east wall starts at f = 0.75.
- **Failure scenario:** playing "Raise the red-brick walls" (3.6 s at 1×):
  - Four tinted brick slabs appear over the footings for about 0.19 s before any east wall exists.
  - The slab over each corridor (2.6 × 1.8 m, at 8.1 to 9.9 m) hangs until the rising wall reaches it at f ≈ 0.80, about 0.39 s in all.
  - Before this change, every piece in that step stood on the footings.
- **Repair:** let the infill arrive with or after what carries it. For example, build it in `vaux-openings` with the east trim (order 12), where it slides down out of the wall above the lintel. That step has no brick box mesh yet, so this uses the core's last mesh (130 of 130). Or record the effect as accepted. Either way, read the timeline's matrices at a few values of f, as `vaux-fronts.test.ts` does for the heads.

**2. Minor: R9's corridor check stops at the east face, so nothing checks that the floor band is split at the corridors.**
- **Where:** `routes.test.ts:242`; `vaux-east.ts:97-98`.
- **What's wrong:**
  - The check keeps only samples with `INNER_EAST_Z < z < EAST_Z`.
  - The band stands 8 cm out from that face (Z −69.00 to −68.92). Its top is 0.12 m above the core's floor and 0.15 m above the Hunt slab.
  - The walker reads the ground under its centre, and its capsule starts 0.35 m above the feet. So it steps onto a band like that instead of being stopped by it.
  - Those samples fall outside the check's window. The largest rise (0.15) and drop (0.12) are within `BODY.step`.
- **Failure scenario:**
  - A later edit drops `...corridors` from the band's gaps.
  - That puts back a 0.12 m lip across both corridor mouths, the same kind of lip this unit removed at the west doorways.
  - R9, R9 back and the corridor check all stay green. R8's window, a metre either side of the west wall, does cover the west band.
- **Repair:**
  - Widen R9's window to a metre either side of the wall.
  - Require the feet at `MAIN` inside the wall, and never above `MAIN + 0.01` east of it.
  - Show it going red with the band left whole.

**3. Minor: the 2.5 m drop now shows the ground windows inside the new west doorways. Review 3 had fixed this (F39), and the comment at `vaux.ts:63-65` is now wrong.**
- **Where:** `vaux.ts:63-66`; `vaux-front.ts:135-145`.
- **What's wrong:**
  - The ground windows at ±5.8 stay (order 5.8), with their heads at 2.185 m.
  - A 2.5 m drop starts each head at 4.685 m. Under a window arch that was below the 4.81 m sill.
  - Under the new doorways the opening starts at the 4.11 m floor. So each window's frame and dark glass stand 0.575 m above the doorway floor, 0.4 m inside the west face.
  - This lasts for f from about 0.469 to 0.490, about 60 ms at 1×.
- **Failure scenario:**
  - In the replay of "Glaze the windows and set the granite trim", two window tops rise out of the new doorways' floors and sink back into them.
  - The comment still promises each ground window stays under the opening above it, so a later session that relies on it will be misled.
- **Repair:** a drop of 1.9 m or less (2.185 + 1.9 = 4.085 < 4.11), then rerun the heads' motion gate and fix the comment. Or record the brief glimpse and fix the comment.

**4. Minor: the spec's placement contract was not updated.**
- **Where:** `spec.md:252`; `placement.test.ts:12`.
- **What's wrong:**
  - The spec's Collection/Placement paragraph still says the collection keeps 1 m clear of "routes R1–R7". Its list of passages has none of the four 1880 openings.
  - The test now covers R1–R9 (`ROUTES` at `:69`) and has four new zones (`:100-105`).
  - `spec.md:170`, which this diff did change, says the collection keeps R8, R9 and the four openings clear. So the spec contradicts itself.
  - The test's own header still says R1–R7.
- **Failure scenario:** someone placing artworks in gallery 521 or 304 follows `:252` and puts a vitrine 2 m from a new doorway. The gate goes red, and no contract text explains why.
- **Repair:** add R8, R9 and the four openings, 6 m either side of their wall, to `:252`, and change the test header to R1–R9.

**5. Nit: R8 and R9 only prove that the centreline is clear, and they are built from the same values they check.**
- **Where:** `routes.ts:160-175`; `routes.test.ts:224-247`.
- **What's wrong:**
  - Both routes walk the middle of each opening, from `VAUX_BAY` and `eastCorridor`. They pass any opening wider than the walker's 0.70 m and taller than 1.75 m.
  - A corridor narrowed to about 0.8 m, or a head 2 m above the floor, would stay green.
  - The infill, the routes and the placement zones all come from `eastCorridor`, so a wrong `eastCorridor` would agree with itself everywhere.
  - Nothing tests "within 6 cm of the map".
- **Repair:** put the map's door lines in the test as constants, with their source. Then check each opening's clear width and height with horizontal rays at a few heights, as `vaux-fronts.test.ts` does.

**6. Nit: smaller record errors.**
- `plan.md:75` and `vaux-east.ts:28-29` say the corridors are 4 m high "as the side walls' doors". Only the end blocks' doors are 4 m (`vaux-sides.ts:51`, `:67`). The hall bays' doors are full 5.8 m arch doorways (`:61`).
- `plan.md:31`: decision 6 still says the east arches are "blind today", with no pointer to the follow-up as decision 4 has.
- `plan.md:83` cites `capdoors.sh`, but it is in neither the worktree nor the main checkout's `tmp/`. The render cameras can't be reproduced; record the six `spawn=` queries in the plan.
- `vaux-east.ts:65`: `vauxEastWall`'s comment still says "its arches' blind openings".

**7. Nit: the map's corridor doors are not on the modelled wall's line.**
- Both corridor doors (uids 324413815139 and 24992578297) lie at world Z −66.79, on the line between 304 and the Byzantine galleries. That is 2.2 m east of the modelled east face at −69.0, as the central passage's door is.
- The map's gallery 304 outline (uid 416352728669) runs across the modelled wall to −66.78, over the full width.
- The X positions and widths are right. But the records quote only X, so "the floor map's corridors through the east front" reads as a passage measured through the modelled wall.
- This is an older question about where the east wall stands (`CROSS_HALL_BACK_Z` already treats −66.79 as the Hunt Wing's back wall). No code change needed; one sentence in section 9 would settle it.

**8. Nit: the new placement zones have no red proof.** The four zones (`placement.test.ts:100-105`) and R8/R9 in `ROUTES` have never been shown failing. No artwork stands near them today, so they pass by default, and the header's red list (`:22-24`) is unchanged. The repo rule is that a gate counts only after going red. **Repair:** one red run with a placeholder moved into a doorway zone.

##### Lenses that found nothing
- **Geometry:**
  - The infill boxes exactly fill the through-hole around each corridor. Their back faces fill the inner face's opening exactly, and every face they share with the wall is hidden inside.
  - The only overlapping faces that point the same way are the band's end and the outer order's side, over 12 × 3 cm, in the same granite mesh. The central and outer passages already have this.
  - No slivers in the apron (4.2 to 5.32) or the band runs (1.3 to 5.32 and 7.10 to 10.7).
  - The corridor floor is the wall's sill at 4.11, meeting the 4.08 Hunt slab at Z −69.0 (`probe-2.log`).
  - The glass count 8 → 6 in the closure test is right.
- **Walkability:**
  - Both routes' ends and crossings are in the right rooms.
  - R8's ends are 0.61 m from the Lehman ring wall's outer face.
  - R9 passes 2.56 m from the iron posts.
  - No door, stair or other route comes near.
  - The red proofs in `red-west-closed.log` and `red-east-blind.log` match the plan.
- **Evidence:**
  - Map doors through the west front: X −5.775 (2.29 m wide), 0.005 (2.31) and +5.76 (2.30).
  - Map doors on the east: X −7.04 to −5.26 (1.78) and +5.31 to +7.06 (1.75). The model is off by 6, 6, 1 and 4 cm.
  - #60, #61 and #62 support "doorways today".
  - The owner's call is recorded with its date in the plan, section 9, the code, the devlog and the spec.
- **Budgets and interactions:**
  - The infill joins the walls step's existing brick box mesh (`vaux-sides.ts:87-88`). The trim joins the granite box mesh, and the windows at ±11.6 keep theirs. So the core stays at 129 meshes.
  - Unit 16's branch touches only the oculus lines in the shared files, so it doesn't interact with this change.

##### What I read outside the diff
- **Instructions and records:**
  - `AGENTS.md`, `local-rules.md`, the whole plan, review 4, and review 3's F39 (`3_implementation.md:91-100`, `:161`).
  - `registry.json`.
  - `spec.md:43-101`, `:170`, `:252` and `:269`.
- **Core:**
  - `arches.ts` (`openWall` and `buildWall`), `vaux-arch.ts`, `constants.ts`, `layout.ts`.
  - `shapes.ts` (`addBox`, `runsBetween`).
  - `vaux.ts`, `vaux-shell.ts`, `vaux-sides.ts:1-100`, `materials.ts:43`.
  - `core.test.ts`, `vaux-fronts.test.ts`.
- **Engine and walker:**
  - `motion.ts`, `stagger.ts`.
  - `player.ts:3-9` (3 s per step at weight 1).
  - `walker.ts:5-72` (body and ground probe).
- **Hunt and Lehman wings:**
  - `hunt/dims.ts:100-179`, `hunt/galleries.ts`, plus greps of `podium.ts` and `stair.ts`.
  - `lehman-plan.ts:1-145`, plus a grep of `lehman.ts`.
- **Other code:**
  - `doors.ts`'s door ids, `tests/e2e/routes.spec.ts`'s imports.
  - The hall-windows branch's diff from `b9ecd58`.
- **Research:**
  - `exterior-images.md` #60 to #67, `interior.md:222`.
  - The research cache's README, `lm_floor1.txt`, and `lm_features.json` (Floor 1 doors and walls, gallery 304's outline).
- **Logs and renders:**
  - In `tmp/vf/`: verify-1 to verify-9, the red-proof logs, `probe-2.log`, `gates-1.log`, `vite-doors.log`.
  - Four renders at native size: `east-s-300`, `east-n-304`, `west-s-lehman`, `west-n-521`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F45 | The brick round the corridors, built with the walls, grew from its own bottom before the east wall stood: four slabs over the footings for about 0.2 s and one over each corridor for about 0.4 s of the walls step (Claude 1) | Accepted | The brick is set with the east front's trim in the openings step at order 12, so it drops into the opened arch with the floor band and apron in front of it; it takes the core area's last mesh, 130 of 130. `core/vaux-fronts.test.ts` reads its motion against that trim at five moments; red with it built with the walls again (6 problems) |
| F46 | R9's floor check stopped at the east face, so a floor band left whole across a corridor's mouth, 0.15 m over the Hunt Wing's slab, passed (Codex 1, Claude 2) | Accepted | The check reads a metre either side of the wall: the core's floor inside it, the core's floor or the Hunt Wing's slab outside, never higher; red with the band left whole (R9's feet at 4.230 m at Z −68.92) |
| F47 | The 2.5 m drop showed each ground window under a new west doorway 0.575 m into it for about 0.02 of the openings step, and the step's comment still said it did not (Claude 3) | Accepted | The drop is 1.9 m, so each starts with its top at 4.085 m, under the doorway's floor at 4.11; the comment says so; `core/vaux-fronts.test.ts` reads the windows' tops every 0.005 of the step, red at 2.5 m (14 samples over the floor) |
| F48 | The new checks took their bounds from the code that builds the openings, and R8 and R9 prove only a clear centre line: a corridor 1 m wide or 2 m high passed (Codex 2, Claude 5) | Accepted | `core/vaux-fronts.test.ts` sweeps rays through each opening's clear box, pinned from the map's doors and #60's band rather than read from the code, and checks the corridors' pinned lines within 6 cm of the map's; red with the corridors 1 m wide (640 rays blocked) or 2 m high (760) and with the side doorways closed (2,736) |
| F49 | The spec's Placement contract and the placement gate's header still named routes R1–R7 and none of the four openings (Claude 4) | Accepted | Both name R1–R9 and the four openings, 6 m either side of their wall |
| F50 | Two of the views the plan claimed, the north doorway from gallery 521 and the north corridor from gallery 304, were not captured (Codex 3) | Accepted | Captured and read at native size; the plan lists all eight cameras |
| F51 | Record slips: the corridors' 4 m "as the side walls' doors", where only the end blocks' are 4 m; decision 6 with no pointer to the follow-up; the cameras in a scratch script; the east wall's comment still saying "blind openings" (Claude 6) | Accepted | Each corrected |
| F52 | The map draws the corridors' doors at Z −66.79, 2.2 m east of the modelled east face, and the records quote only their X (Claude 7) | Accepted | Section 9 says where the map draws them and that the model takes their X and widths through the wall where the exterior's lines put it, as for the central passage |
| F53 | The new placement zones and routes in the placement gate had never been seen red (Claude 8) | Accepted | Red with a Virgin and Child moved to X −6.2, Z −72 in gallery 304: 0 m from R9 and from the south corridor's zone |

## Verification

The full verify run beside the review (verify-9) ended red on two frame budgets far from the change (a door swing's slowest walking frame 18.3 ms, the Leon Levy court's render 17.36 ms against 16.7), with the review's own probes and other sessions loading the machine; its unit tests, typecheck, lint and build passed (740 tests). The repairs' verify, verify-10 on the tree committed as `ae8f81c`, passed on a quiet machine (743 unit tests, 125 e2e; the plan). Each repair's check went red with its fault put back, as the table and `src/model/core/vaux-fronts.test.ts`'s header give.

## Round outcome

No blocker or major finding; nine lesser, all accepted and repaired. The repairs move a piece between steps, change the openings step's motion and add gates, so they go to a focused re-review in round 6.
