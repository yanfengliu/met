# Review 4: implementation

## Target

The integration before it was committed: `claude/vaux-fronts-3c8d7d` at `532958d` with `origin/main` at `806bc91` (work unit 17, Weston's porch) merged into it, its conflicts resolved and staged, later committed unchanged as `859d419`: the staged diff the lanes read (the run folder's `cached-before.diff`, 173,562 bytes, sha256 `0b3501b69fb07d5b7acfbaa79501054a7f17f17180d83bc7d44192210cfc728b`) is byte for byte `git diff 532958d 859d419`. The prompt held two diffs: A, `be01a26..532958d`, round 3's repairs (F36, F37, F39, F40), and B, the staged merge against `532958d`; it pointed each lane at review 3's record and asked what work unit 17 brings that could interact badly with this unit.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r4/`: kept. It ran headless probes through an in-memory Node harness: 22 existing test bodies, end-pane rays against the 27,345 pieces of the composed model, the closure inventory, the merged core's counts, and two engine-state mutations against the motion gate's drawn check. Three of its commands exited 1: its vitest run (`EPERM` on the temporary config) and two harness runs that met what the harness lacks (`expect.closeTo` in `weston-door.test.ts`, `vi` in `window-parts.test.ts`); it says so.
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). Its Bash ran git only, so its findings rest on reading the code, hand arithmetic and the gate logs; it says so. It read `verify-6.log` while that run was still going.
- Both lanes left the tree and the staged merge unchanged (`status-before.txt` against `git status` after).

## Reports

### Codex (gpt-6-astra)

**No findings requiring changes in the requested scope.** F36, F37, F39 and F40 implement their dispositions, and I found no adverse interaction with work unit 17 in the staged merge of `806bc91` into `532958d`. This is a focused code and headless geometry review, not a full verification or rendered approval.

- **F36 — no finding.** The end panes reach the head line and stand 1 cm beyond the bars’ end planes at [lehman-glass.ts:186](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/lehman-glass.ts:186). Against all **27,345 composed pieces**, both previously leaking rays at Y 15.59, Z −138.315 now hit glass. Lower control rays also hit both panes.

- **F37 and F39 — no finding.** The order-group wording matches the builders, and the fixed drop is **2.5 m** at [vaux.ts:63](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux.ts:63). Each ground-window frame’s highest starting point is **4.685 m**, below the main opening’s **4.810 m** sill by **12.5 cm**. The shared fixed translation preserves head-pair synchronization.

- **F40 — no finding within its stated five-sample bound.** The drawn check at [vaux-fronts.test.ts:117](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-fronts.test.ts:117) correctly checks visibility and the instance-count prefix. Both independent in-memory mutations—hiding a light-head mesh and zeroing its count—made the test fail.

- **Merge records and sheets — no finding.** Both devlog entries remain at [summary.md:5](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/docs/devlog/summary.md:5); the registry retains IDs **15 and 17**, without introducing 16. The actual closure inventory matches [closure.test.ts:9](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/closure.test.ts:9): **10,023 sheets in 52 step/material pairs**, including **8 Vaux panes, 135 wings panes and 24 Lehman gallery panes**.

- **Cross-unit integration — no finding.** The merged core contains **129 meshes**, **181,642 triangles** and **one light**, within its limits. The porch allowance retains the exclusion of both brick materials at [core.test.ts:66](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/core.test.ts:66). Weston’s builders match `origin/main`; its masonry and railing remain in their respective facade and openings steps. The integrated Weston walk passes through the door and back beyond the porch.

Outside both diffs, I read and relied on [timeline.ts:292](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/timeline.ts:292), `batch.ts`, `motion.ts`, `stagger.ts`, [vaux-sides.ts:79](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux-sides.ts:79), [wings-walls.ts:58](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/wings-walls.ts:58), and [materials.ts:43](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/materials.ts:43). These confirm the instance-visibility semantics, shared-wall ownership and separate Vaux brick material.

**Verification limits:** 22 existing test bodies passed through an in-memory Node assertion harness. Vitest executed **zero tests** because temporary-directory creation failed with `EPERM`; `window-parts` also could not run through the harness because its mocking API was unavailable. Full `verify` and browser renders were not run. `git diff --cached --check` reported four Markdown hard-break lines in imported historical reviews. The worktree and staged merge remain unchanged; no browser or server was launched.

### Claude (claude-opus-5-5[1m])

##### Verdict

Round 3's repairs do what review 3's dispositions say, and the staged merge with `origin/main` is clean. I found no blocker or major. F36's pane now reaches the head line 1 cm past the bars' ends and meets plain brick on wings B and C, clear of their pilaster strips and blind panels. F37's comment names the openings step's real order groups. F39's 2.5 m drop keeps each ground window 0.125 m under the main sill, and every piece passes only through places the old 3 m drop already passed through. F40's `drawn` check reads the engine's real state. In the merge, each side's own files arrive whole and the four shared files resolve correctly: the sheet table sums to 10,023 in 52 pairs, the registry holds 15 and 17, the devlog keeps both entries newest first, and `core.test.ts`'s porch rule and `vauxBrick` rule work together. Work unit 17's mesh changes net to zero, so the core stays at 129 of 130. Nothing of unit 17's comes within 26 m of the 1880 side walls, and it uses neither brick. The merged tree's own verify (`tmp/vf/verify-6.log`) had passed 734 unit tests, typecheck, lint, build and 109 of 125 e2e tests when I read it; commit the merge only once it ends green. There is one minor process finding (the landing slot is not held) and three nits. I ran no tests myself.

##### Findings

**1. Minor (process): the merge was taken and gated without the landing slot, while work unit 16 is next to land in the same files.**
- **Where:** `docs/policies/local-rules.md:8`; `tmp/land.sh:2-3,8`. No file exists under `tmp/land-slot`, so nobody holds the slot.
- **What's wrong:** the rule's order is take the slot, merge `origin/main`, gate, push, release. This session merged at 14:40:06 (index stat times of `weston-porch.ts`, `core.test.ts` and `closure.test.ts`) and is gating now, with the slot free.
- **Who it races:** the hall-windows session (work unit 16).
  - It held the gate lock from 14:39:39 (`tmp/gate-lock/since`; `verify-6.log:1-10`).
  - Its remaining step is "Repairs gated; landing; gallery" (`.claude/worktrees/hall-windows-1d984d/docs/work/16_hall-end-windows/plan.md:46`).
  - Its branch `claude/hall-windows-1d984d` (`00ae202`) changes `constants.ts`, `medieval-hall.ts`, `vaux-front.ts` and `vaux-shell.ts`. Unit 15 changed all four.
- **Failure scenario:**
  - Unit 16 takes the slot and lands first, so `origin/main` moves past `806bc91`.
  - This staged merge and verify-6 go stale, and the push is refused.
  - The redo likely conflicts at `VAUX_OCULUS_Y` (`constants.ts:39`, next to unit 15's rewritten block from `:40`) and in `westFrontWindows`' oculus disc (`vaux-front.ts:117-121`). The core has one mesh of headroom.
- **Repair:**
  - Take the slot before committing the merge.
  - Fetch and confirm `origin/main` is still `806bc91`. If it is, push this gated tree once verify-6 is green.
  - If it moved, redo the merge, recheck the core's mesh count, and gate again.

**2. Nit: F40's `drawn` check cannot fail on its own, and it has no red proof.**
- **Where:** `src/model/core/vaux-fronts.test.ts:116-118`, header `:5-6,11-16`.
- **Why it adds no reach:**
  - A head's two pieces share an order (`vaux-front.ts:111-112`, `vaux-sides.ts:134-135`, `vaux-east.ts:81-82`), so their windows match and each mesh's `count` is all or none (`timeline.ts:316-319`).
  - If a change gave them different windows, the matrix check already fails at the sample inside the earlier window. Every window lasts at least 0.25 of the step (`stagger.ts:9,77`). The samples are 0.2 apart from 0.1 (`vaux-fronts.test.ts:109`). A dropping piece is off its place until it lands (`motion.ts:104-110`), while a hidden one holds its final matrix (`timeline.ts:4`).
  - So the new check fails only together with the matrix check, or on an engine slot-order defect (`batch.ts:4`), which `timeline.test.ts` covers.
- **The red proofs:** the header's three counts (25, 15 and 25) are round 2's (`2_implementation.md:139`). Review 3's Verification records no new red run (`3_implementation.md:166`).
- **Failure scenario:** a reader takes the check as covering Codex's "visibility-only disappearance" (`3_implementation.md:41`). No model change can produce one here.
- **Repair:** say in the header that this check is implied by the matrix check under this engine (or drop it), and that the red-proof counts predate it.

**3. Nit: two leftovers in `lehman-glass.ts` beside F36.**
- **(a) The inner end still has the coplanarity F36 removed at the outer end.**
  - The inner triangle stands at X = `inner` (`:179`), exactly where the head bar ends (`:170`).
  - Outside the end rafter, which is centred on `inner` and 7 cm wide (`:172-175`, `GRID_BAR` at `:56`), glass and the bar's end face share about 30 cm² below the head line, 0.08 to 0.15 m off the slope along its normal.
  - Review 2 recorded this as context (`2_implementation.md:90`), and no round dispositioned it. `END_CLEAR`'s comment (`:140`) states a rule that holds only at the outer end.
  - It is seen only from the 0.25 m pocket by the court's ring wall, so the flicker hardly matters.
  - Repair: stand the triangle `END_CLEAR` toward the gap, where its top edge meets the lead flat's underside along a line (`lehman.ts:301`). Or say the inner ends keep the overlap.
- **(b) "The old front's brick face" is the wings' brick at the outer ends.**
  - The comments at `:183-184` and `:145-146` say the pane and head bar meet the old front.
  - At X −15.11 and +15.01 the brick is wing B's and wing C's west walls. The 1880 front spans X ±14.5 (`constants.ts:12`, `vaux-front.ts:55`), and the wings' bays start there (`wings-walls.ts:49-50`).
  - Its string course also stops at ±14.5 (`vaux-front.ts:61,97`).
  - Review 2 read this correctly (`2_implementation.md:114`). Repair: reword both comments.

**4. Nit: review 3's record understates the gate on `532958d`, the same trap behind F38.**
- `3_implementation.md:166` lists only `npm test`, typecheck and lint on the repairs.
- In fact `verify-5.log` ran the full gate on that exact tree before the commit:
  - Round 3's code files were last written at 14:27:55 (`git ls-files --debug`).
  - The run started at 14:29:36 (`:16`) and ended "125 passed … exit 0" (`:218-219`) before the 14:39:50 commit.
- Repair: record verify-5, and verify-6 for the merged tree, when checking `plan.md:55`.

##### Lenses that found nothing

- **F36 geometry:**
  - The outer ends stand at X −15.11 and +15.01 (`STRIP_HALF_X` is 16.3 − 1.2: `lehman-plan.ts:105`, `blocks.ts:65`).
  - Wings B and C's first blind panels span \|X\| 15.35 to 19.25 (`WESTON_BAY` 5.6 at `constants.ts:73`; `wings-walls.ts:82`). Their pilaster strips stop at \|X\| 14.8 (`:120-122`). No wing trim stands between 13.1 and 15.6 m there (`:118,132`).
  - The sill bar lies under the pane's foot. The only opening left is the end of the existing 5 mm head slot, about 3 cm² from 15.60 to 15.63 m.
  - The sheet count is unchanged at 24.
- **F37 wording:** it matches the orders exactly:
  - side walls 1 to 4 (`vaux-sides.ts:114-127`);
  - every west and side head at 5;
  - west windows at \|X\| 5.8 and 11.6, with the doorway skipped (`vaux-front.ts:135-137`);
  - the whole east front at 12 (`vaux-east.ts:64`);
  - the oculi at 20 (`vaux-front.ts:120`).
- **F39 margin:**
  - The ground window's head is 2.185 m and the main sill 4.81 m, so the 2.5 m drop starts the head at 4.685 m.
  - Windows fill only their nominal outline (`window.ts:94`).
- **F38's rejection:** it holds. `verify-4` started at 13:50:24, and its 10.5 min of e2e ended before `be01a26` at 14:01:46.
- **Merge shape:** the index against each parent shows only the other side's files plus the four shared ones, and the worktree matches the index.
- **Mesh budget:**
  - In `wing-b-south-facade`, unit 17 adds the masonry and two pilaster geometries and removes the architrave: +2. The roundels reuse the memoised `cylinder:20` (`shapes.ts:35-36`) already in stone (`weston-facade.ts:101`).
  - In `wings-openings`, the columns, stone boxes and iron rail boxes go and the copper pipe arrives: −2. `elevationWindows` uses no box (`wings-walls.ts:141-159`).
  - Steps never share a mesh (`batch.ts:5`), so the merged core is 129. The budget test passed on the merged tree.
  - The whole model is far under its 3,000,000 triangles and 900 meshes (`sequence.test.ts:25-26`).
- **1880 side walls:**
  - Unit 17's moved wall and the wall that follows it stand at X −48.8 to −40.9 (`plan-data.ts:21,29`).
  - The porch rule only admits pieces past X −49.7 (`core.test.ts:44,69,74`).
  - The side trim projecting into wing B predates both units: the base had it along the whole wall (`b9ecd58` `vaux-shell.ts:305-311`).
- **Shared brick:**
  - The colour is unchanged (`palette.ts:90`).
  - `palette.brick` remains only in the wings (`wings-walls.ts:105-107`, `weston-facade.ts:86-89,167`, `galleries.ts:95-98`). Block A has no light wells (`layout.ts:22`).
  - The porch uses only `core.westonStone` and `palette.copperGreen` (`weston-porch.ts:151,216`).
  - `core.test.ts:66` counts both bricks as brick, and nothing outside `src/model` compares materials by name.
- **Imports unit 17 relies on:**
  - `WALL_BASE_Y` is unchanged (`vaux-front.ts:23`).
  - `arches.ts` only adds the options `crown` and `omit`, with defaults that keep the old output.
  - Weston's constants are untouched, so the porch rule's Z −103.65 still holds.
- **Records:** the sheet table, registry and devlog are as described above. The README names the 1880 building only in its chapter table (`README.md:178`). No record still says 3 m or 0.13 m.

##### Read outside the diffs

- **Instructions and records:** `AGENTS.md`, `local-rules.md`, review 3, review 2 (`:78-149`), unit 17's plan and review 0 (`:130-165`), unit 16's plan.
- **Engine:** `timeline.ts`, `motion.ts`, `stagger.ts`, `batch.ts`.
- **Core:**
  - `vaux.ts`, `vaux-front.ts`, `vaux-sides.ts`, `vaux-east.ts`, `vaux-shell.ts` (`:140-213`, and the base's `vauxSideTrim`), `wings.ts`, `wings-walls.ts`, `galleries.ts`, `shapes.ts`, `constants.ts`, `core.test.ts`;
  - `weston-facade.ts` at `b9ecd58`, and the `arches.ts`, `materials.ts` and `palette.ts` diffs.
- **Roche south:** `lehman-glass.ts`, `roche-south/shapes.ts`, `lehman-plan.ts`, parts of `lehman.ts` and `blocks.ts`.
- **Tests and library:** `closure.test.ts:1-145`, `sequence.test.ts`, `window.ts:94`.
- **Process files:** `tmp/gate-lock`, `tmp/gate-queue`, `tmp/land.sh`, `tmp/vf/verify-4/5/6.log`.

**Limits:** Bash here ran git only. When I checked, the shared gate lock was held by `hall-windows-verify` with this unit's session queued, so I added no load. The mesh and geometry figures are hand arithmetic from the code. My evidence for the merged tree's gates is `verify-6.log`, which had not finished when I read it.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F41 | The merge was taken and gated without the landing slot, while work unit 16 is next to land in the same files (Claude 1) | Accepted | The slot was taken (`land.sh take vaux-u15`) before the merge was committed; a fetch found `origin/main` still at `806bc91`, so the gated merge stood and was committed unchanged as `859d419`, with verify-6 green on it |
| F42 | The motion gate's drawn check cannot fail alone under any model change, and the header's red-proof counts predate it (Claude 2) | Accepted | The red proofs were rerun on this tree with the drawn check: popping 25 problems, staggering by Z 17 (15 of matrices and 2 of drawing, at the same moments as two of the 15), dropping by each piece's own height 25; the header gives these counts and says the drawn check went red alone only with the engine's state changed under it (Codex's two mutations) |
| F43 | In `lehman-glass.ts` the inner end's triangle still lies in the bars' end faces' plane, and "the old front's brick face" at the outer ends is wings B and C's brick (Claude 3) | Accepted | (a) The triangle's plane predates this unit (`b9ecd58` builds the same triangle where the bars end) and only the 0.25 m pocket by the ring wall sees it: its comment says so, and the geometry stays; (b) the strip's docblock and the outer end's comment say the head bar's ends and the end panes meet wings B and C's west walls, past the old front's end at \|X\| 14.5 |
| F44 | Review 3's record lists only `npm test`, typecheck and lint on round 3's repairs, though verify-5 ran the full gate on that tree before its commit (Claude 4) | Accepted | The plan records verify-5 on `532958d` and verify-6 on the merged tree |

## Verification

The red proofs of F42, each mutation of `vaux-openings` run against `src/model/core/vaux-fronts.test.ts` and then restored (`tmp/vf/red-*.log`, ignored): popping, exit 1 with 25 problems; staggering by Z, exit 1 with 17; dropping by each piece's own height, exit 1 with 25; restored, exit 0. On the repairs, which change comments only, `npm run verify` passed through the gate lock (verify-7, `MET_PORT=5378`): 734 unit tests in 82 files, typecheck, lint, build and 125 end-to-end tests in 9.5 min; the Load rule's runs on the same tree are recorded in the plan.

## Round outcome

No blocker or major finding. Codex found nothing to change; Claude found one minor process finding and three nits, all accepted: the process finding by taking the landing slot before the merge's commit, the nits in comments and the plan. The repairs touch no geometry or step, so no further round: they land with the merge.
