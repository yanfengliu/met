# Review 3: implementation

## Target

Repository `met`, branch `repair-u1`: `ae89edb..8a5f651`, the repair of round 2's U7, U8 and U9 on top of a merge of main (`ae89edb`), given to the reviewer as a diff on stdin with the `repair-u1` worktree as working directory. It draws the section cut's cap pass 4 depth steps nearer, makes the camera floor a zoom-in bound (`zoomHit`), restores the rebuilt pointer ray as `zoom.spec`'s oracle, and scales the plaza walk's remaining waits.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r3.md` (ignored). The one `STATUS_DLL_INIT_FAILED` match in its log is Codex reading round 2's record, not a sandbox failure. By its own account it ran the zoom code and checks in memory against the real model and inspected saved captures; it did not rerun GPU or Playwright tests.
- Coordinator: the standard shot set at `8a5f651` against `e760a84`. Only the 14 cut views differ, by 95 to 2,203 px each (at most 0.15%). At 3× the old cut wall bands show broken, speckled edges and the new ones are solid; in the Second floor view the changes are single pixels on cut-line edges, with no new cut colour.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `8a5f651` without changing files. I ran the zoom code and checking functions in memory against the real model; I inspected existing captures but did not rerun GPU/Playwright tests.

1. **U7 — Partly fixed.** The bias resolves the sampled coplanar stair/floor contention, but applies to every capped back face. The automated check covers **two flights**, Wing C and Engelhard, not four. Its recorded mutation result is **9/12 views failing without the bias**; I inspected saved before/after crops, but did not independently rerun that test. [section-cut.ts:53](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/section-cut.ts:53), [floors.spec.ts:64](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:64), [floors.spec.ts:77](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:77).

   **U8 — Verified for the reported finding.** The independently rebuilt ray and 1 cm tolerance are restored. In my in-memory execution of the exact checker, the three presets and park case passed; removing `zoomHit` failed the park case at notch 43, **2.2 cm off-ray**. A 1.5 mrad bias and the target-distance picker each failed all four cases. The seven unit cases passed; replacing `zoomHit` with identity failed the new floor test at step 47. This does not cover the new deadlock below. [zoom.spec.ts:83](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:83), [zoom.spec.ts:100](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:100), [zoom.test.ts:91](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.test.ts:91).

   **U9 — Verified by inspection.** Rest and preparation deadlines become 20 s and 60 s at 4× throttle. **No new regression check was added**; reverting these multipliers does not deterministically fail an otherwise fast run. [walk.spec.ts:28](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:28), [walk.spec.ts:41](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/walk.spec.ts:41).

2. **The bias is distance-dependent, not universally a 0.03-pixel sliver.** Near is `clamp(min(targetDistance × .01, heightAboveGround × .5), .03, 20)`; far is 25,000 m. Logarithmic and reversed depth are off. The source assumes **24 bits**, but does not enforce or query that precision; I did not independently measure `DEPTH_BITS`. [camera-rig.ts:16](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:16), [camera-rig.ts:219](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:219), [viewer.ts:31](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/viewer.ts:31), [WebGLCapabilities.js:95](C:/Users/38909/Documents/github/met-worktrees/repair-u1/node_modules/three/src/renderers/webgl/WebGLCapabilities.js:95).

   For D24, the nominal extra eye-depth that can win is approximately `4z²(f−n)/(2²⁴fn)`, before rasterization rounding. Calculated from the actual 16:9 poses and relevant bounds:

   | View | Near | Extra depth that can win |
   |---|---:|---:|
   | 15 m / 50 m close-up, at target | 0.15 / 0.50 m | 0.36 / 1.19 mm |
   | Ground/Main/Second floor, across framed storey | ≈4.66 m | 7.8–15.1 mm |
   | Roof garden, across framed storey | 0.665 m | 1.0–2.3 mm |
   | Cut top, across model bounds below cut | 5.307 m | 12.8–13.6 mm |
   | Cut aerial-ne, same bounds | 5.964 m | 5.7–27.3 mm |

   Pose sources: [floors.ts:114](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/floors.ts:114), [presets.ts:42](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/presets.ts:42); bias: [section-cut.ts:55](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/section-cut.ts:55). The concrete roof regression is below.

3. **No: the notch and reversal guarantees do not hold at every height.** At or below the camera floor, a downward ray with a surface hit gets `hit ≤ 0.5`, so zoom-in returns immediately. At target distance 6,000 m, zoom-out also returns immediately: **both directions stop**. Below-floor recovery depends on the separate frame update. [zoom.ts:41](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:41), [zoom.ts:60](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:60), [zoom.ts:65](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:65), [camera-rig.ts:145](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:145).

   Zoom-out heading down still gets lifted vertically after its step. At the floor, target radius 1 m, looking upward 45°, I measured **0.1768 m**, not 0.25 m; at 89.9999°, only **0.000000436 m**, while the target radius increased. This off-ray/minimum-step defect is **pre-existing**, not introduced here. [camera-rig.ts:164](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:164).

New defects:

- **P2 — Global cap bias can paint intact roofs.** Reproducer: `?shot=1&noui=1&cut=27.4&cam=30,120,-55,30,119,-55`. The first front/back hits are the Hunt gallery roof at **y=20.50/20.45**, 5 cm apart. Near is 0.03 m; their separation is **2.54 D24 steps**, so the new −4 bias makes the underside win. Its batch remains eligible because animation-inclusive bounds reach **29.1 m**, although this slab is wholly below the cut. This is a geometry/depth reproduction, **not a fresh GPU observation**. Fix: restrict capping to actual cut intersections, using current per-instance bounds and an intersection mask or cut-plane caps, rather than globally offsetting intact back faces. [section-cut.ts:55](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/section-cut.ts:55), [section-cut.ts:42](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/section-cut.ts:42), [roof.ts:66](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/model/hunt/roof.ts:66), [batch.ts:83](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/build/batch.ts:83).

- **P2 — Floor/far-bound zoom deadlock.** Reach 6 km looking downward, then hold Q until the camera reaches its floor. Both wheel directions now do nothing. I reproduced this with actual `CameraRig` and `OrbitControls`; reverting `zoomHit` restored movement. Fix: reconcile the floor and target-distance bounds when entering this state, reanchoring the target so retreat remains possible, and test this sequence. [camera-rig.ts:162](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:162), [camera-rig.ts:177](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:177), [zoom.ts:41](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:41).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U7 | Partly fixed: the close-up check covers two of the four flights | Accepted | `repair-u1` `29c93d3`: the Grand Staircase lower flight (15 m views) and the Vaux iron U-stairs added; without the bias 11 of 22 views fail |
| U8 | Verified: the rebuilt ray is the oracle again with 1 cm; a 1.5 mrad bias and the target-distance picker each fail | Closed | None |
| U9 | Verified by inspection; no deterministic check | Accepted as the gate's bound: a timeout under load cannot fail deterministically on a fast run | The worker ran the plaza walk 3 times in a row at 4× (reported with `29c93d3`) |
| U10 | New: the global cap bias can paint an intact thin surface (the Hunt gallery roof, 5 cm, under a 27.4 m cut with a 3 cm near plane) in the cut colour | Accepted: the worker reproduced it on the GPU, 25–32% of Codex's views turning cut colour with the bias against about 1% without | `repair-u1` `29c93d3`: the cap pass draws only the pieces the cut passes through (`src/viewer/cap-pass.ts`); a floors.spec check fails under the old pass |
| U11 | New: at the far bound looking down, then with Q held down to the camera floor, neither wheel direction moves the camera; also, older, a zoom out from the floor looking up moves less than `ZOOM.minStep` | Accepted: the gated class "camera input stops responding at a limit" | `repair-u1` `29c93d3`: `zoomStep` makes the floor a zoom-out bound on the ray and moves the target when both bounds hold; both Q sequences red at `8a5f651` (0 m out; 1.11 m off the ray) |

## Verification

Reported by the repair worker, not rerun by the coordinator: `verify` green at `8a5f651` (388 unit, 56 e2e) and at `29c93d3` (393 unit, 59 e2e). The coordinator's shot comparison is above.

## Round outcome

U8 and U9 verified. U7 widened, and the new U10 and U11 repaired, in `29c93d3`. Round 4 is a focused check of `8a5f651..29c93d3`.
