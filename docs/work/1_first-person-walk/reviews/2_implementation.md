# Review 2: implementation

## Target

Repository `met`, branch `repair-u1`: `18b2a1c..e760a84` (4 files, +40/−14), given to the reviewer as a diff on stdin with the `repair-u1` worktree as working directory. It closes the stair flights (U1), scales the plaza walk's timeout (U6), and changes `tests/e2e/zoom.spec.ts` after one 3 cm miss in the after-W case: the line checked became the one the first notch moves the camera along, within 2 mrad of the rebuilt pointer ray.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r2.md` (ignored). Its log shows no `STATUS_DLL_INIT_FAILED` or `-1073741502`. By its own account it ran the new settle case, then the same case with the old `stair.ts` substituted in memory, and the old and new zoom checks in memory against the real sequence and `dollyStep` with an injected ray bias. It did not rerun Playwright or test a moving camera.
- Coordinator: the standard shot set (`npm run shots`) at `e760a84` and at main `4849135`, which has the same model code as `18b2a1c`, compared pixel by pixel (largest channel difference over 24; `tmp/review-runs/pngdiff.cjs`, results in `tmp/review-runs/u1r2-shots-diff.txt`). Only `floor-main` (91 px), `floor-main-top` (195 px) and `floor-main-aerial-ne` (12 px) differ, all where flights cross the 7.8 m cut, and the changed pixels are flat cut colour with no speckle. Close-ups and a moving camera were not tested.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **U1 part two: Verified.** The new test passes: at t=45→46, feet move from **4.079999879 m to 6.645217419 m**, grounded. Substituting only the old `stair.ts` in memory makes that same test fail: `kept !== moved` at [settle.test.ts:146](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/settle.test.ts:146). The underside restores the even crossing count required by [walker.ts:44](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walker.ts:44).

   **U6 part two: Verified for the reported timeout defect.** [walk.spec.ts:211](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:211) sets 60 seconds × throttle, hence **240 seconds at 4×**. The separate 5-second rest and 15-second preparation limits remain unscaled at [lines 28](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:28) and [40](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:40). I did not rerun live Playwright.

2. **Every face is outward-facing.** The side caps face −X/+X; `MeshBuilder.planar` corrects triangle winding to the requested plane normal. Each perimeter quad has normal proportional to `(0, −Δz, Δy)`, so the new bottom edge produces **−Y**. This applies to flights and cheeks: [stair.ts:43](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/lib/stair.ts:43), [stair.ts:56](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/lib/stair.ts:56), [builder.ts:115](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/lib/builder.ts:115).

   **Yes, the underside can appear in the cap pass.** It uses `BackSide`, renders after the ordinary scene without clearing depth, and retains the default `LessEqualDepth`: [section-cut.ts:37](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/section-cut.ts:37), [viewer.ts:131](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/viewer.ts:131), [Material.js:211](C:/Users/38909/Documents/github/met-worktrees/repair-u1/node_modules/three/src/materials/Material.js:211).

   The affected flights are:

   | Flight | Floor cut | Underside exposure |
   |---|---|---|
   | [Grand Staircase lower flight](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/hunt/stair.ts:92) | Main, 7.8 m | Bottom at 4.11 m sits **3 cm above** the [podium floor](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/hunt/podium.ts:157); a definite cut-colour patch. |
   | [Vaux iron U-stairs](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/core/vaux-shell.ts:137) | Main, 7.8 m | Upper flights and both flights’ cheeks intersect the cut. Lower-cheek bottoms coincide with the [main floor](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/core/vaux-shell.ts:159); upper-flight bottoms become exposed above it. |
   | [Wing C straight stair](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/core/wings-walls.ts:186) | Main, 7.8 m | Flight and cheek bottoms coincide with the [floor slab](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/core/wings-walls.ts:181). |
   | [Engelhard mezzanine stair](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-north/engelhard.ts:125) | Main, 7.8 m | Bottom coincides with [paving](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-north/engelhard.ts:62). Glass cheeks are excluded from capping. |
   | [Four Lehman court flights](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-south/lehman.ts:153) | Ground, 3.1 m | Clipped, but their bottoms lie **4 cm beneath** the [court finish](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-south/lehman.ts:146), which occludes them. |

   Cut heights come from [floors.ts:65](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/floors.ts:65). None reaches the Second or Roof cuts. The remaining callers’ flights lie between floor cuts: [Hunt doorway](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/hunt/podium.ts:163), [Engelhard terrace](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-north/engelhard.ts:69), [Bank entrance](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-north/bank.ts:84), and [Dendur platform/dais](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/roche-north/sackler.ts:135).

   At X=0, Z=−46.5, the old geometry exposes floor at 4.08 m; the new cap hits the underside at 4.11 m. The patch is visible in the existing [Main-floor capture](C:/Users/38909/Documents/github/met-worktrees/repair-u1/.shots/shots/floor-main.png), whose [manifest identifies e760a84](C:/Users/38909/Documents/github/met-worktrees/repair-u1/.shots/shots/shots.json:2). Moving-camera flicker was not tested.

3. **The zoom change weakens the gate; 2 mrad is unjustified.** I executed the exact old/new checking functions in memory against the real sequence and `dollyStep`, injecting a **1.5 mrad downward ray bias**. The revised check returned no problems; the old check failed on notch 1 with **0.042 m lateral error**. From the front pose, the biased surface was 276.923 m away versus 277.353 m on the intended ray: an accepted stop **43 cm short**. The allowance and reuse of observed movement as the oracle are at [zoom.spec.ts:78](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:78).

   Camera facts retain full precision; the reconstruction uses the same projection and unprojection. Actual `CameraRig` comparisons, including translations, agreed exactly in my in-memory probe. There is no demonstrated 2 mrad error budget in [main.ts:374](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:374), [camera-rig.ts:86](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:86), or [zoom.ts:122](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:122).

New defects:

- **Cap/floor depth contention — [stair.ts:56](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/lib/stair.ts:56).** Main-floor view exposes newly added bottoms coincident with supporting floors, especially Wing C and Vaux cheeks. Keep collision closure while excluding those underside triangles from the cap pass, or implement caps at the actual cutting plane. Add a focused visual check.
- **Wrong-limit false negative — [zoom.spec.ts:78](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:78).** The biased-ray scenario above now passes. Restore the independently reconstructed ray as the oracle; resolve the reported 3 cm discrepancy through synchronized camera/input facts and a measured numerical tolerance.

No repository files were changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U1 | Stair flights closed | Verified: the new case fails with the old `stair.ts` | None |
| U6 | Plaza walk timeout scaled | Verified | U9 covers the two waits still unscaled |
| U7 | Closed undersides show through the cut's cap pass (`BackSide`, `LessEqualDepth`, drawn after the scene). The Vaux iron U-stairs, the Wing C stair and the Engelhard mezzanine stair have undersides flush with the floor under them, so cap and floor may z-fight | Accepted, open. Flat cut colour is right for a solid stair cut through; speckle, or a pattern that changes with a small camera move, is not. Measure first: each of the four flights close up in the Main floor view, about 15 m and 50 m away, top and two oblique angles, plus a small orbit step, at the repair head and at main. A fix keeps the flight closed for the walker and adds a check | Repair worker after the handoff |
| U8 | `zoom.spec` now passes a wrong ray: an injected 1.5 mrad bias passed (the old check failed it on notch 1, 4.2 cm off), with a stop 43 cm short from the front; the camera facts are full precision, so no error budget backs 2 mrad | Accepted, open: the gate guards an owner-reported defect and must not loosen. Restore the rebuilt pointer ray as the oracle with 1 cm; find and fix the cause of the after-W 3 cm miss (likely a camera still moving, or facts from another frame than the wheel event's); show the gate red with the wrong picker and with a 1.5 mrad bias | Repair worker after the handoff |
| U9 | The plaza walk's 5 s rest and 15 s preparation waits are unscaled (`tests/e2e/walk.spec.ts:28`, `:40`) | Accepted, open: the same class as U6 | Repair worker after the handoff |

## Verification

Reported by the repair worker at `e760a84`, not rerun by the coordinator: `verify` green, 386 unit and 54 e2e; the plaza walk green 3 runs in a row at 4×; the wrong-picker proof fails 4 zoom tests. The coordinator's shot comparison is above.

## Round outcome

U1 and U6 verified. U7, U8 and U9 accepted and open; `e760a84` is not merged because of U8. Round 3 is a focused check of their repair.

Correction (2026-10-22): no handoff took place. The owner removed the session rollover rule, and this coordinator's worker repaired U7, U8 and U9 in `8a5f651` (round 3), so "Repair worker after the handoff" above reads "repair worker `repair-r2`, `8a5f651`".
