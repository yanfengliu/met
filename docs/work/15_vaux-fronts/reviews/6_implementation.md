# Review 6: implementation

## Target

Commit `ae8f81c` on `claude/vaux-fronts-3c8d7d`: round 5's repairs of the owner's doorways follow-up. The prompt held `git diff 873d722 ae8f81c` without the snapshot file, where `873d722` is a local commit of exactly review 5's target (`snapshots/5_target.patch.txt` applied to `6935f6b`), and pointed each lane at review 5's record and the plan's follow-up.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r6/`: kept (no command with the sandbox's failure code; four exited 1). It ran the fronts' and routes' test bodies through an in-memory Node harness, reproduced the stated red proofs, and probed the dropping brick with rays.
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). It ran nothing, its Bash limited to git; its findings rest on the code, hand arithmetic and the logs.
- The tree stayed clean at `ae8f81c` while they read it (`status-before.txt` empty; this session changed nothing until both had finished).

## Reports

### Codex (gpt-6-astra)

No blocker or major finding. The repairs implement the stated arrivals, floor checks and aperture checks, and the core remains within budget at **130 meshes**. I found one minor animation issue introduced by moving the infill. All 32 fronts/routes test bodies passed through an in-memory Node assertion harness, and the reported failure mutations reproduced. This was not a Vitest or full `verify` rerun.

1. **Minor — the dropping infill introduces coincident exposed faces against the existing wall.**  
   **Location:** [vaux-east.ts:95](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-east.ts:95), using the box defined at line 63.

   The upper infill retains faces at Z **−70** and **−69.25** while dropping through wall surfaces on those same planes. At openings progress **0.7**, its offset is **1.06688 m**, so its top reaches **10.97688 m**, overlapping the existing wall above the opening’s **9.91 m** head.

   **Concrete scenario:** from `(-6.2, 5.8, -72)`, looking toward `(-6.2, 10.2, -70)`, the first two ray hits are the existing wall and moving infill at the same point and distance. Their tints differ: settled white versus approximately `(1.9694, 1.1454, 0.3699)`. An east-side probe also finds coincident faces at Z −69.25. Restoring the previous infill placement removes these duplicate hits.

   This creates a depth tie between differently tinted surfaces, risking z-fighting during replay. **The coincident geometry is reproduced; GPU flicker was not visually verified.** The [motion assertion at line 250](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-fronts.test.ts:250) passes because it checks offsets and drawing state, not overlapping surfaces.

   **Suggested repair:** keep the moving exposed faces clear of the existing wall planes, through a deliberate recess or adjusted arrival, and add a probe covering this overlapping phase.

The other lenses found nothing requiring repair:

- **Animation and budget:** order 12 runs from progress **0.65625 to 0.90625**, so the five-moment test samples actual movement. Its selectors find six infill boxes and the relevant trim; the window selector finds the two frames and two panes. I found no additional regression from the shorter drop affecting bands, heads, windows or oculus glass.
- **Checks and sources:** mutations reproduce **640**, **760** and **2,736** blocked rays, **six** infill-motion problems and **14** window samples above the floor. The restored band fails R9; moving the Virgin and Child reproduces both R9 and corridor-zone violations. The canonical map confirms the pinned X coordinates. The **5.76 m** value matches #60’s recorded camera measurement; I did not independently redo that photographic measurement.
- **Records:** the follow-up, dispositions, section 9, spec and new devlog entry agree with the implementation. All eight retained doorway views exist and were inspected at native resolution. The combined verify/Load acceptance item appropriately remains open.

Outside the diff, I read the motion and batching path, including [motion.ts:106](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/motion.ts:106), [stagger.ts:82](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/stagger.ts:82), and the [core budget at core.test.ts:45](C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/core.test.ts:45), plus the arch, front, side-wall and shell builders, placement logic, and map README/data.

The tree remains clean at `ae8f81c`. No files were changed, created or deleted; no browser or server was launched. Retained-render set SHA-256, over sorted filenames, NUL separators and file bytes: `48ac17cfc63668c72186a74556c540436c655097eec1f514d53134f100a7e2e8`.

### Claude (claude-opus-5-5[1m])

#### Review 6 of work unit 15: round 5's repairs (`873d722..ae8f81c`)

##### Verdict

Round 5's repairs do what the dispositions say. I found no blocker or major finding.
- **F45:** the brick round each corridor now arrives in `vaux-openings` at order 12. It moves with the band and apron in front of it at every moment.
- **F47:** the 1.9 m drop keeps the ground windows under the new doorways below the floor. It harms nothing else the step drops.
- **New checks:** they select the right pieces, and every stated red proof matches the code when I recompute it by hand.

One new minor defect comes from the F45 move itself: while the brick drops, its upper box rises into each inner arch's blind niche, in the niche's own back plane, and the two faces z-fight for about 0.28 s at 1×. The rest are nits: gaps in two of the new checks that their comments don't admit, a "6 cm of the map" check that compares two constants, and small record slips.

I ran no tests. Bash only allowed git commands here, so I read the floor map with the search tool. My evidence is the code, hand arithmetic and the existing logs.

##### Findings

**1. Minor: while it drops, the brick over each corridor z-fights with its arch's blind niche.**
- **Where:**
  - `src/model/core/vaux-east.ts:60` and `:63`: the upper box spans X ±(4.5..7.1) and Y 8.11 to 9.91 m. Its front is `back = EAST_Z − HEAD_DEPTH`, at Z −69.25.
  - `vaux-east.ts:95` and `vaux.ts:67`: it now drops 1.9 m with the trim.
  - `vaux-arch.ts:151`: the head's niche starts at 10.39 m and is `HEAD_DEPTH` deep.
  - `arches.ts:189`: the niche's back face is drawn at z = −depth, facing +Z.
- **What's wrong:**
  - Both faces lie at Z −69.25 and both face east.
  - At rest the box's top (9.91) is 0.48 m under the niche's foot, so they never meet.
  - During the drop the box starts at 10.01 to 11.81 m. Its front then covers the niche's lower 1.42 m, across the full 2.6 m width at the foot: about 3 m² per arch.
  - The overlap lasts while the offset is over 0.48 m: the first 37% of order 12's window, f 0.656 to 0.748. That is about 0.28 s at 1× and 0.55 s at 0.5×.
  - The impost band drops at the same offset, so its bottom edge sits at the box's top. The strip between the niche's ledge and the falling band stays open to view.
  - The box carries the arrival tint (2, 1.15, 0.35 at its start); the niche's back has none.
  - At `873d722` the box grew within its own height and never reached the niche.
- **Failure scenario:**
  - In 1880 nothing stands east of the core. Someone orbits to the avenue side while "Glaze the windows and set the granite trim" plays.
  - In both inner arches, an orange brick face flickers in the niche's lower part, under the falling band.
  - The follow camera doesn't show it in this chapter: `camera-rig.ts:337-340` keeps the west view of `vaux-west-front`.
  - F45's check (`vaux-fronts.test.ts:247-254`) compares Y offsets only, so it can't see it.
- **Repair:**
  - Set the infill's set-back face slightly deeper than the niche, for example `back = EAST_Z − HEAD_DEPTH − 0.01` for both set-back boxes. The rising box then stays behind the niche's back, inside the brick. A face 1 cm deeper under the impost band won't show.
  - Add a gate to the F45 test: at its five moments, no brick front lies in the niche's plane above the niche's foot. It should be red with `back` as it is now.

**2. Nit: the ground windows' check never samples where a drop is highest.**
- **Where:** `vaux-fronts.test.ts:277-286`.
- **What's wrong:**
  - Order 5.8's window opens at f 0.46875 (rank 5 of 9 keys).
  - The first drawn sample is f 0.4725 (p 0.015), where the piece has already dropped 4.4% of the way, so it is 0.956 of the drop above its place.
  - So any drop up to 2.014 m (1.925 / 0.9557) passes. Yet the frame starts up to 9 cm over the doorway's floor (2.185 + D − 4.11).
  - The comment says "a dropping piece is highest where it starts", but the test never reads that pose.
- **Failure scenario:** a later edit sets the drop to 2.0 m. The gate stays green, while both windows show in their doorways for 0.0032 of the step (19 ms at 0.5×, or a scrub that lands there).
- **Repair:** read each window just after its own window opens (bisect `drawnAt`), or check its rest top plus the step's start offset against the floor. Show it red at 2.0 m.

**3. Nit: R9's floor check is looser than its comment.**
- **Where:** `src/model/hunt/routes.test.ts:242-244` against `:245-250`.
- **What's wrong:**
  - The comment says the feet stay on the core's floor in gallery 304.
  - In the code, only Z −70..−69 must be at `MAIN`. `off` accepts the Hunt slab's 4.08 m anywhere in the window, gallery 304's metre included.
- **Failure scenario:** gallery 304's floor 3 cm low at the wall's inner face passes.
- **Repair:** require `MAIN` for samples west of `EAST_Z`, and allow `HUNT_SLAB_TOP_Y` only east of it. Or make the comment say what the code checks.

**4. Nit: the openings check holds the corridors from one side only.**
- **Where:** `vaux-fronts.test.ts:209-212` with `:160-171`, and `:181`.
- **What's wrong:**
  - The "within 6 cm of the map" check compares two constants in the test file, so no model change can fail it.
  - The rays prove that the opening contains each pinned box, not that a corridor stays inside the map's lines. A corridor widened to `CORRIDOR.width` 2.2 passes every gate, because R9 and the placement zones follow `eastCorridor`.
  - The rays run only along +Z, and three.js meets front faces only. So a one-sided face looking east across an opening is missed. The header's bound names neither limit.
  - Smaller point: the header's "every piece of the core" leaves out `westonTuckermanSteps` and `europeanPaintingsGlazing2023Steps`. That doesn't change any result.
- **Failure scenario:** a later edit widens the corridors to ease a route. Nothing goes red, and the arches read less blind than #67 and the map allow.
- **Repair:** add rays that must hit the brick, at the map's inner lines moved 6 cm plus 2 cm into the brick (X −5.18 and +5.23). Name the one-way rays in the bound.

**5. Nit: record slips.**
- `reviews/5_implementation.md:201` says "The repairs' verify ran on a quiet machine (the plan)". The plan has no such record, and `plan.md:85` is unchecked. `tmp/vf/verify-10.log` (743 tests in 82 files, 125 e2e, exit 0) fits the brief but names no revision. Record it in the plan, or drop the pointer.
- `vaux.ts:62`: the step detail "Windows fill the west arches" is now true of two arches of five, and the replay shows this text. Suggested wording: "the west front's outer arches".
- `vaux-shell.ts:208`: `vauxSideTrim`'s doc says "Granite trim … of the east front", but it now lays the corridors' brick too (`vaux-east.ts:93-95`).
- `placement.test.ts:22-24`: the red list doesn't name F53's proof (the Virgin and Child at X −6.2, Z −72). Only the plan and review 5 hold it, while `AGENTS.md:64` puts red proofs in the test header or `gate-proofs.md`.

##### Lenses that found nothing

**Lens 1 (do the repairs work and break nothing).**
- **The infill's arrival:**
  - The step still has nine stagger keys. The brick shares order 12's window (f 0.656 to 0.906) with the band, apron, jambs, impost band and heads.
  - At rest it stands exactly as at `873d722`.
  - From the walls step until order 12, the inner arches stand open from the main floor, 2.6 × 5.8 m. The outer pair and the axis passage already stand open the same way, nothing floats, and the step detail says where the brick arrives.
- **The 1.9 m drop on the other pieces:**
  - The outer ground windows top out at 4.085 m, under the main windows' sills at 4.81.
  - The main windows' tops pass inside the brick, 0.4 m back, behind the 0.25 m niches.
  - The west crowns start at 16.11 m, behind the string course (15.9 to 16.22 m, 2 cm prouder than the voussoirs). At 2.5 m they showed above it.
  - The side heads and the east heads (up to 16.16 m, parapet at 18.0) stay on their walls.
  - The oculus discs float as before; that is pre-existing.
  - The heads' motion gate doesn't depend on the drop distance.
- **Budget:** 129 + 1 = 130, within `core.test.ts:45`. Work unit 16 on origin/main (`8a892d1`) changes only the oculus constants, and work unit 18's branch (`d7272a3`) adds no core mesh. So no merge pushes the core past 130 today, but there is no headroom left.
- **Merging:** merging origin/main should be clean. Work unit 18 rewrites `placement.test.ts:42`, right beside this branch's lines 43-44, so whichever lands second will likely resolve a conflict there. Those lines also import twice from the same module.

**Lens 2 (can the checks fail).**
- **Selections:**
  - The brick is the 6 infill boxes.
  - The trim in front is the band run −5.32..−1.3 and the apron −5.32..−4.2 on the south side, mirrored on the north.
  - The ground windows are 4: metal topping out at 2.185 m and glass at 2.105.
- **Red proofs, recomputed by hand:**
  - 640 = 8 columns × 40 rows × 2.
  - 760 = 20 rows × 19 columns × 2.
  - 2,736 = 24 × 57 × 2.
  - 14 = 4 + 4 + 3 + 3 samples at 2.5 m.
  - 6 = one problem per brick, since `vaux-walls` holds no trim.
  - 4.230 = the band's top, with its front at Z −68.92.
  - The placement proof: (−6.2, −72) lies on R9's leg and inside the corridor's zone.
- **Pinned data, checked in the map** (canonical frame X = x + 3.82, Z = z − 85.97):

  | Map door uid | Map x (json) | World X | Pinned in test |
  |---|---|---|---|
  | 459127727936 | −10.74..−8.45 | −6.92..−4.63 | ✓ |
  | 330771287615 | 0.79..3.09 | 4.61..6.91 | ✓ |
  | 324413815139 | −10.86..−9.08 | −7.04..−5.26 | ✓ |
  | 24992578297 | 1.49..3.24 | 5.31..7.06 | ✓ |

  #60's band bottom is 5.76 m (`exterior-images.md:184`).

**Lens 3 (records).** Otherwise the records say what the code does:
- **Plan:** the follow-up section and its eight render cameras; the eight images exist in `tmp/vf/doors/`.
- **Review 5's table.**
- **Section 9:** the map's corridor doors at Z −66.79, and `CROSS_HALL_BACK_Z` is −66.79 at `hunt/dims.ts:162`.
- **Spec:** `:170` and `:252`.
- **Devlog.**
- **Test headers.**

The plan's Approach and Outcome still say 2.5 m and 129 meshes, which is the history of the landing at `a9acc06`; the follow-up section states both changes.

##### Read outside the diff

- **Instructions and records:** `AGENTS.md`, `local-rules.md`, the whole plan, review 3's F39.
- **Core:** `vaux-front.ts`, `vaux-arch.ts`, `vaux-shell.ts`, `vaux-sides.ts`, `constants.ts`, `layout.ts`, `shapes.ts`, `arches.ts` (holes and `buildWall`), `core.test.ts`, `vaux-east.ts` at `6935f6b`, `frame.ts`.
- **Engine and viewer:** `build/motion.ts`, `stagger.ts`, `timeline.ts`, `batch.ts`, `player.ts`; `viewer/camera-rig.ts` (`followGoal`); `lib/window.ts` (`windowUnit`).
- **Hunt Wing:** `hunt/routes.ts`, `hunt/dims.ts`.
- **Research:** `exterior-images.md` #60; the map cache's `README.txt` and the Floor 1 door features in `lm_features.json`.
- **Integration and logs:** origin/main's work unit 16 diff and work unit 18's branch diff; `tmp/vf/verify-10.log`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F54 | While the brick round each corridor drops through the wall over the opening, its faces lie in the wall's inner-face plane and the head niche's back plane, tinted differently: a depth tie for about 0.28 s at 1× (Codex 1, Claude 1) | Accepted | The brick stands 1 cm short of the wall's inner face and its set-back faces 1 cm behind the niches' backs (`vaux-east.ts` `INFILL_CLEAR`), so the wall's faces stay in front while it passes; at rest it reads as a panel set in the opening. `core/vaux-fronts.test.ts` reads its faces every 0.01 of its step while it stands over the opening; red with the faces in the planes again (96 problems) |
| F55 | The ground windows' check never read a window where its drop starts, so a drop up to 2.01 m passed (Claude 2) | Accepted | Each window is read at the first moment it is drawn, found by halving to 1e-6 of the step; red at 2.0 m (both frames start over the floor) |
| F56 | R9's widened check let the Hunt Wing's slab level pass in gallery 304's metre west of the wall (Claude 3) | Accepted | The core's main floor is required west of the east face, the slab allowed only east of it; red with gallery 304's floor 3 cm low (R9's feet at 4.080 m from Z −70.00) |
| F57 | The openings check held each corridor from one side only: a corridor 2.2 m wide passed; its rays went one way, so a face looking east across an opening was missed; the 6 cm check compares two constants; and its header claimed every piece of the core (Claude 4) | Accepted | Rays both ways; each corridor held by brick or wall on lines 8 cm outside the map's door (red with 2.2 m corridors, 160 rays passing); the header names the steps it reads and calls the 6 cm a record of the pinned numbers, not a reading of the model. The ray counts of review 5's red proofs, both ways now, are 1,280, 1,520 and 5,472 |
| F58 | Record slips: review 5's record pointed to a verify the plan did not hold; the openings step's detail said the windows fill the west arches; `vauxSideTrim`'s comment named only granite; the placement gate's header did not list F53's red proof; two imports from one module (Claude 5) | Accepted | The plan records verify-10 on `ae8f81c`'s tree; the detail says the outer arches; the comment names the brick; the header lists the proof; the imports are one |

## Verification

The red proofs above, each put back and undone (`tmp/vf/red7-*.log` and `red6-*.log`, ignored). On the repairs: typecheck and lint clean; the fronts', routes', placement, core and sequence gates green (64 tests); the full verify through the gate lock is recorded in the plan.

## Round outcome

No blocker or major finding. One minor finding and four nits, all accepted and repaired; the minor one moves the brick 1 cm and adds a check of its faces, red as the fault it guards against.
