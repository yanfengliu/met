# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `ff9fcbd` ("Rebuild Weston's porch at the April 1888 drawing's size (work unit 17)"): the diff `b9ecd58..ff9fcbd`, 17 files. In code, `src/model/core/weston-porch.ts` (new), `weston-facade.ts`, `wings.ts`, `galleries.ts`, `src/model/collection/spaces-b.ts` and `src/model/hunt/routes.ts`; in tests, `src/model/core/core.test.ts`, `weston-door.test.ts`, `src/model/closure.test.ts` and `src/model/lib/door.test.ts`; in docs, `docs/design/spec.md`, `docs/research/` (interior, interior-images, history), `docs/devlog/summary.md`, `docs/work/registry.json` and this unit's `plan.md`.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from a run folder outside the reviewed tree (`../fleet/tmp/review-runs/met-u17-r0/`, ignored, where the raw captures stay): the change and its reasons, six lenses (the geometry's frames and placements; closed solids in the merged pieces; the door and the walker; the tests' honesty, the 2.9 m allowance among them; the records against the code; the decision to keep the leaves in the 1888 wall), and a findings format with file and line. The diff came on stdin. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran and read again after, show no change by either.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. It cited files and lines outside the diff's hunks, two of which the owner checked (`src/model/core/weston-door.test.ts:123`, `tests/e2e/routes.spec.ts:334`: the lines it describes). It ran read-only probes (the porch's opening, the placements' determinants, the masonry's closure, the glass sheets, the mesh count, walks on and off the axis); its subagent delegation failed to start, so it reviewed alone, and it edited nothing.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show, permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. Its permission mode refused every command but reading, so it worked its numbers by hand from the code; it read nothing in the run folder or fleet's tree and did not delegate.

## Reports

### Codex (`gpt-6-astra`)

Approve with minor findings.

1. **Return-walk checks stop inside the enlarged porch — minor.**  
   [weston-door.test.ts:121–123](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-door.test.ts:121) and [routes.spec.ts:334–335](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/tests/e2e/routes.spec.ts:334). The unit test still accepts `WESTON_DOOR.x - 2`; the browser test releases movement 1.5 m beyond the leaves. These distances no longer establish an exit through the porch. Replaying the unit test’s movement produced X ≈ −51.593, still behind the porch body’s front at −51.83. Consequently, its “back out … into the court” assertion passes before the return traversal finishes. Extend both walks to the original court approach, or another independently pinned point beyond the porch plus the walker’s radius. An extended return probe succeeded; this is a coverage defect, not an observed obstruction.

2. **The recorded passage length conflates different reference planes — minor.**  
   [interior.md:302](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/research/interior.md:302), repeated in [plan.md:26](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/docs/work/17_weston-porch/plan.md:26), calls the passage before the leaves 2.25 m deep. That number is the pilaster-face projection. The body is 2.13 m deep ([weston-porch.ts:41](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-porch.ts:41)), and the frame sits another 0.30 m behind the wall face ([weston-facade.ts:55](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/weston-facade.ts:55)): body-front to frame is **2.43 m**. Name the measurement endpoints and distinguish this from the **2.55 m** pilaster-face-to-frame distance. The decision to retain the door’s location is otherwise disclosed honestly.

Read-only probes confirmed an unobstructed porch opening, positive placement determinants, vertical closure of the porch masonry pieces, 135 opening glass pieces, and the unchanged 130-mesh core budget. Closed/open walking succeeded on the axis and at ±1 m offsets. I did not rerun `verify`, browser/throttled tests, or visual captures. Delegation failed during subagent startup. No files changed.

Outside-diff reads included:

- [shapes.ts:29–95](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/shapes.ts:29): primitives and transforms.
- [arches.ts:109–219](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/core/arches.ts:109), [pilaster.ts:113–274](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/lib/pilaster.ts:113), and [cornice.ts:206–281](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/lib/cornice.ts:206): geometry construction.
- [door-fit.test.ts:158–307](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/model/door-fit.test.ts:158), [door-world.ts:51–155](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/src/walk/door-world.ts:51), and [routes.spec.ts:294–338](/C:/Users/38909/Documents/github/met/.claude/worktrees/optimistic-mayer-d1fe0b/tests/e2e/routes.spec.ts:294): collision and traversal coverage.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with minor findings.** The porch lands where `PORCH` says. Its frames are proper (no mirrored matrix), nothing stands in the doorway's clear opening, and the merged pieces are closed solids. Before landing: fix F1, and run the required 4× `routes.spec` runs and the before/after shots (F6).

I couldn't run anything. This session's permission mode refused every command beyond reading files, both the repo's tests and a scratch probe. So every number below is worked by hand from the code. I did not delegate; the diff fit one pass.

## Findings

### F1. Two Weston gates say the walker gets back to the court, but they stop inside the porch's doorway (minor; fix before landing)
- **Where:** `src/model/core/weston-door.test.ts:121-123` (header `:8-9` says "back out into the court"); `tests/e2e/routes.spec.ts:317` (title) and `:334-335`.
- **What is wrong:**
  - The headless return leg passes when the feet reach X < `WESTON_DOOR.x − 2`, which is −51.40. The porch body's front is at B_SOUTH_X − 2.13 = −51.83 (`weston-porch.ts:42`). So the check's line sits 0.43 m inside the porch's doorway.
  - The e2e test lets go at `door.front + 1.5`, about 1.2 m out from the brick face, which is also inside the doorway. It then reports "back in the court".
- **Evidence (by hand):**
  - Inputs from `walker.ts:53-60`, `:238` and `:315`: walking speed 2 m/s, `groundTau` 0.07 s, velocity kept in the world frame, and `turn` doesn't reset it.
  - The walker starts at the closed leaves, feet near X −49.75. The frame's front plane is at B_SOUTH_X + 0.3 (`window.ts:4`).
  - Walking 3 s in covers 5.86 m. Nothing blocks it: the axis is clear up to the wall at X −36.55 (`plan-data.ts:30`), and placement keeps 6 m clear (`placement.test.ts:83`).
  - Walking 4 s back, while reversing a 2 m/s velocity, covers 7.72 m. The feet end near X −51.6, about 1.9 m out from the brick face and about 0.2 m short of the porch's front.
  - The check passes by about 0.2 m. A line at the porch's front would turn it red at 4 s.
- **Failure scenario:** anything that held the walker in the porch's doorway on the way out would pass both gates, and their messages would still say "court". The inward legs do walk the whole passage, so the real risk is low; mainly the stated bound is false.
- **Fix:**
  - Headless test: take the line past the pedestals plus the body's radius, as a literal (e.g. B_SOUTH_X − 2.85, the cornice line), and hold 5 s instead of 4 s.
  - e2e test: let go about 3 m in front of the leaves (past 2.55 m + `BODY.radius`), and reword the messages.

### F2. The records' "2.25 m" passage isn't the code's, and 0.35 m against 2.55 m compares different planes (minor)
- **Where:** `docs/research/interior.md:302` ("a stone passage 2.25 m deep before them"); `docs/work/17_weston-porch/plan.md:26` ("a lined passage 2.25 m deep"); `docs/design/spec.md:176` and `docs/devlog/summary.md:5` ("0.35 m … where the model's stand 2.55 m behind it").
- **What the code builds** (`weston-porch.ts:42`, `weston-facade.ts:55` and `:175`): 2.13 m through the porch's body, then 0.3 m into the wall to the leaves.
  - That is 2.43 m from the doorway's front, 2.51 m from the architrave's face (projection 0.08, `weston-porch.ts:122`), and 2.55 m from the pilasters' faces.
  - 2.25 m is the porch's depth to the pilasters' faces, not the passage. The brief repeats the same 2.25 m.
- **The comparison:** #33's 0.35 m is read from "the doorway's east edge" (`interior.md:302`). Measured from the same edge, the model's figure is about 2.43 m, not 2.55 m.
- **Fix:** say "2.43 m (2.13 m through the porch, 0.3 m into the wall)", or name the face each figure is measured from.

### F3. "A one-constant change" understates moving the leaves (minor; item 6)
- **Where:** `plan.md:26`.
- **What is wrong:**
  - The leaves' plane is written twice: `WESTON_DOOR.x` (`weston-facade.ts:55`) and `const x = B_SOUTH_X + 0.3` (`:175`), which places the frame and the leaves.
  - Moving the leaves to the porch's front would leave the 1888 wall's lining and threshold (`:157-158`) behind the door.
  - It would also void the no-shadow claim (`materials.ts:55-61`, `spec.md:180`). That claim was probed with the leaves deep in shade. With the leaves 0.23 m inside the body's front, sun 76° off the normal shifts only about 0.9 m sideways before reaching them, across a 3.29 m opening.
  - The 528/529 wall move (`galleries.ts:56-75`) exists only because the west leaf swings into 529.
- **What is fine:** the decision itself is recorded honestly. The spec, `interior.md`, the devlog and the plan all state the 0.35 m vs 2.55 m gap and leave it to the owner. The code comments agree with keeping the leaves in the wall (`weston-porch.ts:13-14`, `weston-facade.ts:47-49`). The plan's "as the brief asks" extends "leave the door where it is" to the leaves' depth; it should say that is the worker's reading.
- **Fix:** list what a move touches, or fold the two literals into one.

### F4. The corner pilasters run through each other, and no comment names it (minor; item 1)
- **Where:** `weston-porch.ts:151-153`, with `pilaster.ts:132-133`, `:246-253` and `:257-274`.
- **What overlaps at each front corner** (front and side pilasters are separate pieces):
  - Plinths: u 2.63–2.93, d 2.13–2.31, y 0.96–1.08.
  - Base mouldings: duplicate surfaces over d 2.13–2.27.
  - Capitals: u 2.63–2.84, d 2.13–2.22, y 5.55–5.81.
  - Volutes: the side capital's front volute (d 2.01–2.28) runs into the front capital's return. The front capital's outer volute reaches u ≈ 2.90, 0.15 m past the side face. #33 shows one capital turning the corner (`interior.md:298`).
  - Blind panel: the lower panel's bottom rail and inner stile (d up to 1.33, `:164-167`) run up to about 7 cm into the side base's torus (which reaches d ≈ 1.26).
- **Gates:** none read these overlaps, because the closure gate and the walk read each piece alone (`closure.test.ts:195-205`, `:391`). So this affects looks only.
  - A user's cut at 0.96–1.32 m or 5.47–5.81 m over the main floor can show stone inside the cap there (`cap-pass.ts:1-8`).
  - The standard cuts at 7.8 m and 12.7 m (`floors.ts:69`, `:74`) miss both bands.
- **Fix:** name the overlap in the comment at `:150`, or stop the side pilaster's base and capital at d = 2.13.

### F5. The spec's World frame still allows only mouldings, up to 1.5 m, past a block line (minor; records)
- **Where:** `docs/design/spec.md:39`; `weston-facade.ts:7-8` ("Trim may project up to 1.5 m into the court").
- **What is wrong:**
  - The porch puts a 2.13 m stone `openWall` body, pedestals out to 2.49 m and a cornice out to 2.85 m past X −49.7, which is a shared block line (`roche-south/blocks.ts:53-54`).
  - `core.test.ts:10-15`, `:42` and `:67-72` now allow it.
  - The spec says to "change it here first, in the same commit" (`spec.md:3`), but records neither the court's 1.5 m allowance nor this exception.
- **Fix:** add the exception to `spec.md:39`, citing work unit 17, and update `weston-facade.ts:7-8`.

### F6. Required checks still open (minor; process, already known)
- **Where:** `AGENTS.md:118` (routes.spec must pass three runs in a row at 4×); `plan.md:30`, `:42`, `:45`; `scripts/capture.ts:40` and `:224`; `local-rules.md:7`.
- **What is open:**
  - The throttled `routes.spec` runs.
  - The before/after shots. The `doors-weston` standard shot now looks through the porch; by hand, the east reveal hides about the east 0.7 m of the leaves.
  - Republishing the owner's render gallery after landing.

### Nits
- **F7. Head band and `corniceFrom`:** `PORCH_REACH.corniceFrom` (`weston-porch.ts:68`) is never used. The head band stops at ±3.40 at every height (`weston-facade.ts:105-120`), so 0.58–0.63 m of brick shows between it and the porch's frieze from 6.3 to 6.71 m.
- **F8. Build order:** the entablature, merged into the masonry at order 2, grows before the pilasters carrying it (3) and before the block it wraps (6) (`weston-porch.ts:135`, `:151-153`, `:174`; `wings.ts:51-52`). Suggest giving the top block order 3.
- **F9. Balcony vs window:** the balcony floor at L1 + 7.6 sits 0.24 m above the big window's sill (L2 + 0.5 = L1 + 7.36; `weston-facade.ts:39`, `:71`). The top block closes the bottom 0.24 m of the window's opening.
- **F10. Unrecorded deviations and unmarked estimates:**
  - `interior.md:300` doesn't mention that the capitals are 0.26 m tall (0.36 W, `column.ts:25`) against the drawn 0.52 m, the bases 0.36 m against 0.47 m, or the modillions 0.345 m apart against 0.43 m (`cornice.ts:219-222`).
  - These are estimates but aren't marked as such: pedestal front 2.45, cap 0.12, the narrow pilaster's 0.38/0.31, the rail heights 0.45/0.9 and the 0.05 pipe (`weston-porch.ts:47-51`, `:187`).
- **F11. No height bound:** the porch allowance in `core.test.ts:42` and `:67` applies at any height. Add `box.max.y <= L1 + 9`.
- **F12. Wording and literals:**
  - The quoin strip "from the dado to the head band" actually ends at L1 + 5.92, 0.38 m below the band (`weston-facade.ts:129-137`).
  - `interior.md:296` says the plan "gives" the porch's 5.9 m width, while `:298` says the plan "stops at the wall"; say which line it stops at.
  - `plan.md:16` still puts the porch in `weston-facade.ts`.
  - The railing and side-roundel positions are literals tied to `PORCH.depth` (`weston-porch.ts:179`, `:187`); derive them so a depth change moves them.

## Checked and sound
- **Frames:** `FRAME` maps (u, y, d) to (B_SOUTH_X − d, L1 + y, CENTRE_Z + u), and `box` matches it (`shapes.ts:80-87`). The ±π/2 yaws turn the side pilasters' faces to ±u, with their width along d from 1.41 to 2.13. The disc and railing matrices are proper rotations with positive scales.
- **Entablature direction:** right of travel (`cornice.ts:4-5`) is −u, then +d, then +u, so it projects outward on all three sides. The corner modillions are convex (`along.ts:76-84`) and touch the moulding only along a line.
- **Clear opening:** clear through the porch and the wall to the leaves.
  - The pedestals and plinths start at u 1.85, 5 mm off the architrave's 1.845.
  - The paterae panel starts at 5.17 m, above the architrave's top at 5.11 m.
  - The inner volutes sit at u ≥ 1.88 and y ≥ 5.46.
  - The lining's inner face is at ±1.645, and the threshold's top is at L1.
- **Closed solids:**
  - The merged masonry is closed and none of its parts overlap: `openWall`, the surround face to face on the body, the capped entablature, and the modillions on the bed face and soffit (`arches.ts:150-191`).
  - The split pilaster's shaft joint is the same coincident-cap kind that `pilaster()` already makes. Every open pilaster back is covered.
- **Walker:** 3.7 m between the pedestals and 3.29 m through the doorway. The floor runs at L1 all the way (`kravis.ts:43-46`, `:125`; `weston-facade.ts:108`, `:158`), and there's no pocket to trap the walker.
- **Tests:**
  - The 2.9 m allowance uses literals, not the checked symbol; the porch's furthest point is 2.85 m out, ±3.35 m along the front.
  - SHEETS drops by 2, which are the two removed windows' panes.
  - The Weston fixture in `door.test.ts` matches `DOOR`.
  - The 528/529 wall moves 0.795 m (`galleries.ts:63-67`).
- **Records:** the numbers in `spec.md:176` match the code. The 23/21/40/16% proportions reproduce from the recorded heights, and 45 px at 128 px a metre is 0.35 m.

## Read outside the diff
AGENTS.md; `docs/policies/local-rules.md`; `spec.md:1-41`, `:172-185`, `:252`, `:273`; `interior.md:275-302`; `shapes.ts:1-104`; `arches.ts:1-221`; `constants.ts`; `wings-walls.ts:67-98`; `galleries.ts:40-82`; `plan-data.ts:15-40`; `materials.ts:45-63`; `lib/pilaster.ts`, `cornice.ts`, `surround.ts`, `along.ts` (all); `column.ts:23-33`; `profiles.ts:25-65`; `window.ts:1-86`; `closure.test.ts`; `closure-readings.ts`; `doors.test.ts:100-130`; `walker.ts:44-61`, `:238-330`; `settle.test.ts:190-212`; `kravis.ts:27-46`, `:88-125`; `cap-pass.ts:1-40`; `floors.ts:60-77`; `presets.ts:70`; `motion.ts:40-115`; `capture.ts:38-40`, `:224`; `routes.spec.ts:1-60`, `:160-189`, `:280-341`; `placement.test.ts:82-83`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The return walks stop inside the deeper porch: the headless test accepts the walker at X < `WESTON_DOOR.x - 2` (−51.40), inside the porch body's front at −51.83, and the e2e test lets go 1.5 m past the leaves, so "back out into the court" no longer proves an exit (Codex 1; Claude F1) | Accepted: the gates' stated bound was false once the porch grew | `weston-door.test.ts` holds 6 s and requires the feet past `COURT_X`, the court place it set out from, 3.5 m out from the frame; `routes.spec.ts` lets go once past `WESTON_APPROACH` along the door's normal; both messages and headers say the walk goes out through the porch |
| F1 | The records call the passage before the leaves 2.25 m deep, the pilasters' projection, where the code builds 2.13 m through the body and 0.3 m into the wall (2.43 m); and #33's 0.35 m and the model's 2.55 m are measured from different faces (Codex 2; Claude F2) | Accepted | `interior.md`, the spec's Doors item, `interior-images.md` #33, the devlog and the plan measure both from the doorway's architrave (about 0.35 m against 2.5 m) and give the passage as 2.43 m (2.13 + 0.3) |
| F2 | "A one-constant change" understates moving the leaves: their plane is written twice, and a move touches the 1888 wall's lining and threshold, the 528/529 wall and the leaves' no-shadow reading; and the plan's "as the brief asks" extends the brief's words (Claude F3) | Accepted | The door unit is placed at `WESTON_DOOR.x`, the one constant; `interior.md` and the plan list what a move touches and call keeping the leaves this unit's reading of the brief |
| F3 | The corner's front and side pilasters run into each other (bases and capitals) with no comment saying so, and the lower blind panel's frame runs up to 7 cm into the side pilaster's base (Claude F4) | Accepted in part: the overlap of two closed pieces at the corner is deliberate and read by no gate, as one moulding turning the corner would be; the frame into the base was not | The comment at the pilasters names the overlap; the lower panel's frame starts 0.06 m over the bases' top (half a pilaster's width over the pedestal) |
| F4 | The spec's World frame allows only mouldings 1.5 m past a block line, and `weston-facade.ts` repeats the 1.5 m, while the porch stands 2.85 m past the line wing B shares with the Kravis Wing (Claude F5) | Accepted: the spec changes first | The World frame item records the court's 1.5 m and the porch's 2.25 and 2.85 m (work unit 17, `core.test.ts`); the facade's header names the porch |
| F5 | Required checks open: `routes.spec.ts` three runs at 4× throttle, the before and after shots, the gallery (Claude F6) | Accepted: process | The shots were taken and compared before this record (Verification); the throttled runs follow the repairs; the gallery follows the landing |
| F6 | `PORCH_REACH.corniceFrom` is unused, and the head band stops 3.40 m out at every height, leaving brick between it and the porch's frieze from 6.3 to 6.71 m (Claude F7) | Accepted | Under the cornice's foot (`corniceFrom`) the band runs to 0.1 m past the porch's sides; above it, to the cornice |
| F7 | The entablature, merged into the body at order 2, grows before the pilasters that carry it (order 3) (Claude F8) | Accepted | The pilasters come at order 2 and the body with its entablature at 3, after the pedestals (1) and before the panels, roundels and the balcony's block |
| F8 | The balcony's floor at 7.6 m stands 0.24 m over the great window's sill, so its block hides the window's foot (Claude F9) | Recorded, not changed: the window's sill is the model's estimate, and #33 shows the balcony's slab hiding the window's foot | `interior.md` says so |
| F9 | Deviations from the drawing (capitals 0.26 m against 0.52, bases 0.36 against 0.47, modillions 0.345 m apart against 0.43) are unrecorded, and estimates are not marked (Claude F10) | Accepted | `interior.md` and `PORCH`'s comments name each deviation and mark the estimates |
| F10 | The 2.9 m allowance in `core.test.ts` holds at any height (Claude F11) | Accepted | It holds under Y 13.2 only, 9 m over the main floor (the railing's top stands 8.5 m over it) |
| F11 | Wording and literals: the quoin strip ends 0.38 m under the head band; the drawing's plan both "gives" the width and "stops at the wall"; the plan's scope puts the porch in `weston-facade.ts`; the railing's and the side roundels' places are literals tied to the porch's depth (Claude F12) | Accepted | Reworded ("up to just under the head band"; the plan is cut off along the porch's front); the scope names `weston-porch.ts`; the railing and the roundels take their places from `PORCH` |

## Verification

On `ff9fcbd`, before the review: `npm run verify` through `tmp/gate.sh` (81 test files, 732 unit tests; typecheck; lint; build; 125 e2e tests in 9.6 min, Weston's two walks among them); `npm run shots` (the standard set, 64 images, revision clean, GPU RTX 4090 through ANGLE D3D11; the model 27,253 pieces, 746 meshes, 1,614,218 triangles at t = N) compared image by image with the owner's gallery set of `1002016`, whose model sources match the base `b9ecd58`: 43 of 64 within 9 of 255 in every channel; the 21 others differ only where the porch stands (`doors-weston` and `preset-int-petrie-court` broadly, 19 aerial, cut, floor, plan and chapter views in 4 to 137 pixels), each read at native size, the two broad ones whole, the others as crops of their changed regions before and after.

On the repairs: the typecheck, ESLint on the changed files, and `core.test.ts`, `weston-door.test.ts`, `closure.test.ts`, `door-fit.test.ts`, `doors.test.ts`, `placement.test.ts`, `reach.test.ts`, `sequence.test.ts` and `cited-images.test.ts` (75 tests) green; the porch rendered again from the court's west to read the head band and the side's panels. The full gate, the throttled runs and the re-review belong to the next round.

## Round outcome

Both reviewers approve with minor findings: no blocker or major finding. All twelve findings are accepted (F3 in part, F8 recorded rather than changed) and repaired in the next commit, which review 1 reviews.
