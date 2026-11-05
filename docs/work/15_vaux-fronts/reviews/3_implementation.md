# Review 3: implementation

## Target

Commit `be01a266505abb7a40adf93e952342673b6d2e93` on `claude/vaux-fronts-3c8d7d`: its diff against `cbc5edd`, the commit review 2 read, which holds the repairs of F31 to F35, appended to a focused prompt that pointed each lane at review 2's record.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, from fleet's `tmp/review-runs/u15-vaux-r3/`: kept (0 failed commands). It ran headless probes (the cap pass at a 14.1 m cut, 4,242 motion comparisons and 206 history comparisons, the gates' red proofs through an in-memory shim, end-pane rays against all 27,311 pieces of the composed model); its vitest selection ran no tests (`EPERM`).
- Claude, `claude-opus-5-5[1m]` at `max`, the runbook's limited tools: kept (one `result`, one model, `dontAsk`, no MCP). Node and vitest were refused, so its findings rest on reading `be01a26` and hand arithmetic; it says so.
- Both lanes left the tree unchanged (`git status --porcelain` empty; HEAD `be01a26`).

## Reports

### Codex (gpt-6-astra)

Request changes on **`be01a266505abb7a40adf93e952342673b6d2e93`** for the remaining end-pane gap. F31 fixes the cap-pass regression without a reproduced replay failure; F32 and F33 reproduce their recorded red proofs; F35’s specific corrections agree with the code. I found **no blocker or major issue**, one minor geometry defect and one wording nit. Evidence is code inspection and executed headless probes, not rendered verification.

1. **Minor — F34 replaces the coplanar overlap with an open seam.**  
   **Location:** [lehman-glass.ts:185](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/lehman-glass.ts:185).

   `HEAD_BAR_UNDER = 0.13` makes the pane’s entire top horizontal at **Y = 15.47**. The bar built by [shapes.ts:77](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/roche-south/shapes.ts:77) has a rotated rectangular end, whose lower boundary changes height across Z. Near **Z = −138.315**, that boundary is approximately **Y = 15.599**, leaving about **12.9 cm** above the pane—not merely the estimated 6 cm.

   **Reproduction:** against all **27,311 pieces** of the composed model, horizontal outward rays from **(−14.9, 15.59, −138.315)** and **(14.9, 15.59, −138.315)** cross the respective end planes without meeting glass or steel. Restoring the previous pane height in memory makes both rays hit the end panes. Lower control rays still hit the current panes.

   This is a small visual enclosure defect, but it directly contradicts the repair’s statement that the bar closes the remainder. **Repair:** derive the pane’s boundary from the actual bar cross-section, or offset the pane/bar end planes enough to avoid coplanarity while retaining closure. Check both ends near the wall as well as beneath the bar’s lowest corner.

2. **Nit — the new records describe a height ordering the step does not use.**  
   **Location:** [plan.md:36](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/docs/work/15_vaux-fronts/plan.md:36), repeated in [vaux.ts:63](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/model/core/vaux.ts:63) and the devlog.

   “In rising courses” overstates what these mixed order values mean. West and side heads use **5**; west windows use **|X| = 5.8 or 11.6**, with ground and main-floor windows arriving together; every east-front trim piece uses **12**.

   **Concrete discrepancy:** west/side heads finish at **f = 0.625**, while the outer west ground-floor windows continue arriving until **f = 0.8125**. East ground bands and heads arrive together. **Repair:** describe the authored order groups accurately; no motion change is needed merely to correct this wording.

The other lenses found the following:

- **F31 — no additional finding.** The light west heads are excluded from the cap pass at **14.10 m**. All **21 head pairs** had equal matrices and visibility across **4,242 forward/reverse comparisons**. Endpoint checks found no premature or missing instances, and **206 history comparisons** found no determinism difference. Window metal and glass retain matching orders and the same fixed translation. Both oculus panes arrive last, over **f = 0.75–1**. All **203 openings-step pieces** reach the completed state. The changed step details correctly move the heads’ work into `vaux-openings`.

- **F32 — no additional finding within its stated bounds.** The test samples **844 points**, including the inset corners, and discloses that points do not establish whole-face visibility. Its recorded failures reproduced exactly: **27** hidden points with the head at 13.8 m, **110** at 12.9 m, and **398** with the old lintel. An obstruction between samples can still escape; the header now acknowledges that limitation.

- **F33 — no current pairing or synchronization defect found.** Rest matrices identify the current 21 pairs correctly. The recorded mutations reproduced **25**, **15** and **25** failures for pop, Z staggering and height-dependent drop. Its limit remains five sampled moments and matrix equality: it does **not** compare `mesh.count` or `visible`, so a visibility-only disappearance could pass. That limits what this gate proves; the independent visibility probe above passed on this revision.

- **F35 — no remaining issue in its specific corrections.** The string-course midpoint is **1.85 m** above the crown; the sill explicitly records rounding; and the Lehman comment retains the lower-stone occlusion exception.

Outside the diff, I read the required instructions and spec, plus [timeline.ts:292](/C:/Users/38909/Documents/github/met/.claude/worktrees/vaux-fronts-3c8d7d/src/build/timeline.ts:292), `motion.ts`, `stagger.ts`, `batch.ts`, `kit.ts`, `window-parts.test.ts`, `cap-pass.ts`, `vaux-sides.ts`, `vaux-east.ts`, `vaux-shell.ts`, `lehman-plan.ts`, and the cited Roche shape helpers.

**Verification limits:** Vitest ran **zero tests** because temporary-config creation failed with `EPERM`. The two changed test bodies and their mutations executed through an in-memory Node assertion shim. Full `verify`, browser renders and photograph remeasurement were not run. The worktree remains clean and unchanged; no browser or server was launched.

### Claude (claude-opus-5-5[1m])

**Verdict.** The repairs do what their dispositions say. Nothing blocks landing once the full verify has run. I couldn't run anything: Bash here allows git only, so node and vitest were refused. Everything below comes from reading `be01a26` and working the numbers by hand. The tree is unchanged (`git status --porcelain` empty, HEAD `be01a26`).
- **F31:** each head's two pieces keep tight bounds again. `MeshBuilder.build()` computes them and nothing overrides them, so the cap pass judges each piece by its own box. All 21 head pairs now sit in `vaux-openings`. There a fixed 3 m drop moves both pieces of a head by the same amount. Rest positions are sound, and both step details say what the steps now do.
- **F32 and F33:** both gates name their bounds honestly. Neither can pass while its stated claim fails.
- **F34:** the pane no longer shares a plane with the bar. But it leaves more open than its note says: a wedge up to 16 cm tall between the bar and the brick, about 63 cm² at each end. It doesn't show; the note and the disposition overstate it.
- **F35:** the records match the code, apart from one stale docblock.
- The one minor finding is about process: this commit hasn't been through `npm run verify`. Everything else is a nit.

##### Findings

**1. Minor (process): `be01a26` was committed before `npm run verify`.**
- **Where:** round 2's record, Verification ("The full `npm run verify` on the repairs and their review are round 3's"); `plan.md:54`, still unchecked; `AGENTS.md:47` (R14) and `:66`.
- **What's wrong:**
  - The commit changes code: a step's motion, the heads' bounds and the strip's glass.
  - Only `npm test`, typecheck and lint ran on it. `npm run build` and `npm run test:e2e` did not.
  - Rounds 0 and 1 ran the full verify before they committed (`plan.md:52-53`).
- **Failure scenario:** only the e2e specs play the openings step in a browser (`controls.spec` and `walk-build.spec`). Neither has run on the new drop, and I couldn't run them either.
- **Repair:** run `npm run verify` through the gate lock on this revision before landing, and record it in round 3.

**2. Nit: the strip's outer end pane leaves a wedge open beside the brick, and its note says the bar closes it.**
- **Where:** `lehman-glass.ts:144-145` and `:182-188`; F34's disposition; `bar()` at `roche-south/shapes.ts:77-93`; the bar's set-back at `lehman-glass.ts:153-158`.
- **The bar:** `bar()` centres the box on the head line, with its 0.16 m width along the 72.1° slope and its 0.3 m depth along the slope's normal. In the end plane its section is a tilted rectangle.
  - Its lowest corner is at Y 15.478, Z −138.354.
  - Its corner nearest the wall is at Y 15.630, Z −138.305, which is 5 mm off the brick.
- **`HEAD_BAR_UNDER`:** 0.13 m clears the lowest corner by 8 mm, so the pane and the bar's end face no longer overlap. But its comment is wrong in two places:
  - The lowest corner is 0.122 m under the head line, 5.4 cm off the brick, not "at the wall". The bar's corner nearest the brick is 3 cm *over* the head line.
  - The 0.122 m is half the width along the slope (0.076 m) plus half the depth along the normal (0.046 m). "Half its depth along the slope's normal" gives only 0.046 m.
- **What stays open at each end:**
  - The wedge between the bar's wall-side face and the brick. It runs from the pane's top at 15.47 m up to 15.63 m, 5.4 cm wide at its foot and 5 mm at its top.
  - A sliver under the bar's underside, beside the end rafter (`:173`): up to 2.9 cm tall.
  - Together they come to about 63 cm². The author's "up to about 6 cm" counts the sliver and misses the wedge.
- **Does it matter:** not to the eye.
  - It sits at 15.5 m in the corner against the brick, behind the end rafter.
  - It opens into a glass-roofed space that already meets the sky through the bar's 5 mm set-back. Along each run of about 11.3 m that slot comes to about 0.057 m², nine times the wedge.
  - No gate reads it: the panes are sheets, which the closure gate and the cap pass leave out.
  - The trouble is the text that says it's closed: "whose end closes the rest" (`:183`), "at the wall" (`:144`), and F34's disposition.
- **Failure scenario:** a later session changes the bar's set-back or depth, trusting the note that the end stays closed.
- **Repair:** either of these:
  - say the wedge stays open, as the slot along the head does;
  - or close it: run the pane's top up the brick to the bar's wall-side corner, down that face to the lowest corner, then along the underside to the rafter. The pane then meets the bar's end face only along edges.

**3. Nit: while it drops, each ground-storey window's head shows in the main opening above it.**
- **Where:** `vaux.ts:64`; `vaux-front.ts:46-48` (both openings are through-holes) and `:139-143`.
- **What's wrong:**
  - A ground window's head stands at 2.185 m. The main opening above it starts at its sill, 4.81 m.
  - Starting 3 m up, the ground window's head is at 5.185 m, 0.375 m over that sill.
  - The main window in the same arch has the same order, so it also starts 3 m up. That leaves the bottom of the opening empty.
  - So the ground window's tinted frame and glass show there, 0.4 m back from the face.
  - This lasts while p < 0.044: f 0.469–0.480 for the inner pair, f 0.5625–0.573 for the outer pair, about 1% of the step each.
  - Under `b9ecd58`'s pop, each window grew inside its own hole.
- **Repair:** set `distance` to 2.6 m or less. Any fixed distance keeps a head's two pieces together, and 2.6 m keeps the ground windows below the main sills. Or accept the overlap and note it.

**4. Nit: the motion gate's title claims more than it reads.**
- **Where:** `vaux-fronts.test.ts:94` ("at every moment of their step"), against `:10` and `:107`.
- **What it reads:** five moments per step, 0.2 apart.
  - The west and side heads move in f 0.375–0.625, which holds one sample (f 0.5).
  - The east heads move in f 0.656–0.906, which holds two (f 0.7 and 0.9).
- **Why that's enough here:** every piece's window is at least 0.25 long, so each holds a sample. A dropping piece is never at its final matrix before it lands. So different windows, pivots or distances always show up.
- **Repair:** say "at five moments" in the title, or sample each pair inside its own window.

**5. Nit: leftovers in the records.**
- **`lehman-glass.ts:136-141`:**
  - It still says "a glass triangle closes each run's outer end up to the head". That end has been a quad since F21, and since F34 it stops 0.13 m under the head.
  - "Its head bar rests against the brick face": the bar stops 5 mm off it (`:153`).
  - Three constants (`:142-147`) now sit between this docblock and `stripPieces`, so it no longer documents that function.
- **`vaux.ts:63` and `plan.md:36`, "in rising courses (by order)":** only the side walls do that (orders 1 to 5). The west windows (orders 5.8 and 11.6) arrive after the heads above them. The east front's whole trim drops at once at order 12 (`vaux-east.ts:64`, `:81-82`).

##### Lenses that found nothing
- **F31, the cap pass:**
  - `cap-pass.ts:55-63` reads each geometry's own box at the instance's current matrix. A light head under a 14.1 m cut is no longer capped.
  - No other code used the shared box: the head geometries appear only in their builders and the gate.
- **F31, motion:**
  - A drop with a set distance offsets every piece by (0, 3, 0), whatever its box (`motion.ts:53-54`).
  - Each head's two pieces share an order, so they share a window.
  - Every piece in the step has an explicit order, so none falls back to its call index (`kit.ts:69`).
  - Window frames and glass share an order and a matrix.
- **F31, rest positions:**
  - At t = 3 and 4 the west front shows blind niches 0.25 m deep (`vaux-arch.ts:151`) over its impost band, with no voussoirs, as the side walls already did. Nothing is see-through.
  - The step details fit what the steps now do (`vaux.ts:39` and `:62`, 170 and 145 characters).
  - The heads start up to 17.2 m and slide down behind the string course, which stands 2 cm prouder than they do. The tympanum and the main windows' tops pass inside the brick, out of sight.
  - The core stays at 129 meshes. The standard shots read t = N or each chapter's end (`scripts/capture.ts:212-229`), and no e2e spec names a vaux step.
- **Pre-existing, not from this diff:** at t = 5 the hall's two oculus discs stand in the air. Their end walls only arrive in the next step (`vaux-shell.ts:166`). Main has the same order, and the oculi belong to the hall-windows session.
- **F32:**
  - Each front quad is split into triangles fanned from its outer (extrados) corner (`builder.ts:88`, `arches.ts:313-317`). So the crown's apex is a corner of three triangles, and its samples sit about 2 cm under it, near 14.19 m.
  - A hit counts only if it lands on the target mesh within 1 cm of the target's distance.
  - The red proof at 13.8 m fits the geometry: the lead flat runs to Z −138.3, through the voussoirs' 6 cm projection.
  - It remains a test of points; the header says so.
- **F33:**
  - It reads the timeline's own instance matrices, so it doesn't just agree with itself.
  - It pairs pieces by exact rest matrix.
  - Two of the red proofs recompute by hand: 17 × 1 + 4 × 2 = 25 problems, both with pop and with drops by each piece's own height. I couldn't recompute the Z-stagger count of 15.
- **F35:**
  - `exterior.md:158`, `plan.md:34` and `exterior-images.md:174` agree on 1.85 m to the string course's middle, which is what the code builds (15.9 + 0.16 − 14.21).
  - `constants.ts:50` and `lehman.ts:228-230` are corrected.
- **A spec proposal, not a finding:** the spec's Composite pieces item still says only that equal keys "arrive together". F19 showed that pieces under grow or pop don't move together when their bounds differ. That line is for the engine owner.

##### Read outside the diff
- **Instructions and records:** `AGENTS.md`, `local-rules.md`, `spec.md` (Build-step API), review 0's dispositions, reviews 1 and 2.
- **Engine:** `timeline.ts`, `motion.ts`, `stagger.ts`, `kit.ts`, `batch.ts`, `window-parts.test.ts`, `sequence.test.ts`.
- **Viewer:** `cap-pass.ts`.
- **Core:** `vaux-shell.ts`, `vaux-sides.ts`, `vaux-east.ts`, `arches.ts`, `shapes.ts`, `constants.ts`; `lib/builder.ts`.
- **Roche south:** `roche-south/shapes.ts`, `lehman-plan.ts`, `lehman.ts:185-307`, `index.ts`.
- **Other:** `scripts/capture.ts`; `tests/e2e`, searched; `vaux.ts` and `vaux-front.ts` at `b9ecd58`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F36 | The strip's outer end pane, stopped 0.13 m under the head line, left a seam up to 12.9 cm under the bar's rotated end near the wall, and a wedge beside the brick, while its note said the bar closed the rest (Codex 1, Claude 2) | Accepted | The pane reaches the head line again, 1 cm beyond the bars' ends (`END_CLEAR`), so it closes the end and never lies in their end faces' plane; the strip's docblock moved back above its function and says the head bar stands 5 mm off the brick |
| F37 | "In rising courses" overstates the openings step's order groups (Codex 2, Claude 5) | Accepted | `vaux.ts`, the plan and the devlog name the groups: the side walls' bands in rising courses (1 to 4), the heads (5), the west windows by their distance off the axis, the east front's trim (12), the oculus glass (20) |
| F38 | `be01a26` was committed before `npm run verify` (Claude 1) | Rejected: `npm run verify` passed through the gate lock on the exact tree committed as `be01a26` before the commit (734 unit tests, typecheck, lint, build and 125 end-to-end; `tmp/vf/verify-4.log`, ignored); review 2's record was written before that run and says it was next | The plan records it |
| F39 | During the 3 m drop a ground window's head showed in the main opening over it for about 1% of the step (Claude 3) | Accepted | The drop is 2.5 m, which keeps each ground window under the main sill above it while it falls |
| F40 | The motion gate's title said "at every moment" and it compared matrices only, not whether each piece is drawn (Claude 4, Codex's note on F33) | Accepted | Titled "at five moments"; it also requires a head's two pieces to be drawn or not alike (`mesh.visible` and the slot under `mesh.count`); the header says why five moments suffice |

## Verification

On the repairs: `npm test` 734 passed, typecheck and lint clean, the core area at 129 meshes. The repairs' full `npm run verify` is recorded in the plan with the landing.

## Round outcome

No blocker or major finding; five lesser: four accepted and repaired, one rejected with its evidence (F38). The repairs are small and covered by the gates they touch (the motion gate reads the new drop; the closure gate counts the panes), so with this round the implementation reviews close.
