# Review 4: implementation

## Target

Repository `met`, branch `repair-u1`: `8a5f651..29c93d3`, given to the reviewer as a diff on stdin with the `repair-u1` worktree as working directory. The cap pass draws, from a stand-in scene, only the instances the cut plane passes through (`src/viewer/cap-pass.ts`); `zoomStep` handles the floor and far bounds together; the close-up check covers all four flights.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r4.md` (ignored). By its own account it ran numerical checks and probes in memory, including the real camera and input handlers, an independent transformed-box oracle over 1,465,122 instance checks at 161 timeline positions, and CPU timings of the cap pass; the GPU results it cites are the worker's saved evidence.
- Coordinator: the standard shot set at `29c93d3` against `8a5f651`: the 14 cut views differ by 18 to 2,559 px each (at most 0.18%). Faint cut-colour lines inside the ground floor plan's rooms are gone; the worker traced them to 79 pieces wholly above the 3.1 m cut (Wing B and C gallery walls, roofs and skylight frames), none crossing it. A frame probe with the cut on (`tmp/review-runs/cutbench.mjs`, the median of three `benchmark(30)` means at t = N, 1600×900) gave 9.9–12.3 ms in the floor views at `29c93d3` against 11.3–12.8 ms at main `448d4af`. Codex ran at the same time, so both are noisy: the uncut aerial view read 9.9 and 7.7 ms.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

Reviewed `29c93d3` without changing files. I executed the numerical checks and probes in memory, including actual camera/input handlers. GPU results below are saved evidence, not fresh browser runs.

1. **Repair verdicts**

| Finding | Verdict | Does the check fail with the fix reverted? |
|---|---|---|
| **U10** | **Verified for the reported intact-roof defect.** Selection now excludes the roof’s individual instances despite their animation-inclusive batch bounds reaching above the cut. [cap-pass.ts:62](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:62) | **Yes.** Restoring the old whole-mesh predicate makes the new selection assertion return **4 instead of 1**. The saved roof captures also give **100% versus 0%** cut colour in the checked centre square; the GPU reversion result is recorded in [AGENTS.md:87](C:/Users/38909/Documents/github/met-worktrees/repair-u1/AGENTS.md:87). Check: [floors.spec.ts:290](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:290). |
| **U11** | **Partly fixed.** Both reported reproducers are fixed, but below-floor recovery introduces the view reversal described below. [zoom.ts:69](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:69), [zoom.ts:85](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:85) | **Yes for both regression checks.** All 10 numerical checks passed; restoring `8a5f651` page behavior failed the upward-ray and simultaneous-bound checks. The third new check, preserving the ordinary far bound, passes either version. [zoom.test.ts:134](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.test.ts:134), [zoom.test.ts:160](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.test.ts:160), [zoom.test.ts:175](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.test.ts:175) |
| **U7** | **Verified for the requested four-flight coverage.** There are 22 sampled views; Grand’s 50 m views are explicitly excluded. [floors.spec.ts:66](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:66), [floors.spec.ts:268](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:268) | **Yes, according to retained GPU results:** removing the bias fails **11/22 views**, including two Grand views. Vaux passes without bias, so its added coverage checks closure, not bias sensitivity. [floors.spec.ts:84](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/floors.spec.ts:84) |

2. **Cap cost and correctness**

At `t=N`, the model contains **26,795 pieces**; this loop scans **15,278 eligible instances across 568 meshes**. Warm Node measurements, 500 updates per height:

| Cut height | Median CPU | P95 CPU | Selected instances | Maximum steady upload/frame |
|---|---:|---:|---:|---:|
| 3.1 m | 0.353 ms | 0.440 ms | 433 | 27,712 B / 68 calls |
| 7.8 m | 0.377 ms | 0.489 ms | 1,555 | 99,520 B / 164 calls |
| 12.7 m | 0.378 ms | 0.578 ms | 1,403 | 89,792 B / 149 calls |
| 27.4 m | 0.342 ms | 0.469 ms | 49 | 3,136 B / 8 calls |

The CPU scan costs approximately **2.1–2.3% of 16.7 ms**. Every nonempty proxy is marked dirty even when unchanged; each drawn proxy uploads its selected prefix. First uploads allocate the full buffer—252,672 B across Main’s eligible proxies. These measurements exclude browser driver overhead and GPU rendering, so they do **not** certify the complete frame budget. [cap-pass.ts:52](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:52), [cap-pass.ts:77](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:77), [WebGLAttributes.js:14](C:/Users/38909/Documents/github/met-worktrees/repair-u1/node_modules/three/src/renderers/webgl/WebGLAttributes.js:14), [WebGLAttributes.js:142](C:/Users/38909/Documents/github/met-worktrees/repair-u1/node_modules/three/src/renderers/webgl/WebGLAttributes.js:142).

- **Arrivals and hidden steps:** current matrices, `count`, and ancestor visibility are respected. An independent transformed-box oracle matched **1,465,122 instance checks across 161 timeline positions**. [cap-pass.ts:14](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:14), [cap-pass.ts:57](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:57).
- **Layers and culling:** proxies copy source layers and world transforms. Their shared sphere covers start/end poses plus overshoot; a missing sphere disables proxy culling. I found no sampled pose outside these spheres. [cap-pass.ts:71](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:71), [timeline.ts:234](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/build/timeline.ts:234), [batch.ts:83](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/build/batch.ts:83).
- **Timing:** selection runs after the ordinary draw and immediately before the cap draw. Timeline evaluation precedes both; there is no asynchronous gap allowing another evaluation between selection and drawing. Idle animation callbacks need not render at all. [main.ts:307](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:307), [main.ts:329](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:329), [viewer.ts:99](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/viewer.ts:99), [viewer.ts:127](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/viewer.ts:127).
- **A wholly-under piece can still be selected geometrically:** `astor-court-garden#2`, instance 3, has highest vertex **12.37926 m**, but transformed-box maximum **12.72952 m**, so the **12.7 m** cut selects it. This is the documented conservative-box limitation, not a newly introduced false positive. It does not establish visible colour leakage. [cap-pass.ts:8](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:8), [cap-pass.ts:63](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:63).

3. **Zoom guarantees**

**Not for every starting state.** For an above-floor camera, successful numerical steps remain on the pointer ray, with shorter-than-minimum movement allowed only to reach a bound. The far/floor deadlock now retreats correctly. Below-floor states still depend on a separate vertical correction, which violates that ray guarantee. Also, looking upward from the floor with a surface within 0.5 m legitimately blocks both directions. [zoom.ts:61](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:61), [zoom.ts:69](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:69), [camera-rig.ts:145](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:145).

**The target can be below the floor.** With floor `0.4`, a downward 45° ray and initial radius 6,000 m, retreat produces camera Y **0.576777** and target Y **0.046447**. `zoomStep` keeps the target forward along the existing view axis, but the later camera-only floor correction can leave it behind that original viewing direction. [zoom.ts:75](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:75), [zoom.ts:91](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:91).

4. **Determinism**

**Neither writes timeline state.** Source matrices, colours, counts, visibility, update metadata and light intensities remained unchanged throughout the cap probe. Cap writes target its proxies; zoom writes camera/control state. The constructor’s optional geometry-box computation is already satisfied by timeline construction. [cap-pass.ts:40](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:40), [cap-pass.ts:64](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/cap-pass.ts:64), [timeline.ts:188](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/build/timeline.ts:188), [camera-rig.ts:163](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:163).

**New defect — P2: pan→wheel below the floor can reverse the view.** [camera-rig.ts:160](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:160), [camera-rig.ts:145](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:145).

Concrete reproduction through actual handlers, before an intervening frame: start at floor `0.4`, looking 45° upward, target 100 m away, FOV 40°, viewport 1280×720; right-drag upward 100 px, then wheel inward. Pan puts Y at **−0.457886**; zoom leaves Y **−0.353553**; the next frame lifts only the camera to `0.4`, turning its view **93.527°**. `8a5f651` lifts camera and target together and turns **0°**.

**Fix:** normalize a below-floor pose before deriving the zoom ray/pick, translating camera and target together. Add the same-frame pan→wheel regression check.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U10 | Verified: the old whole-mesh predicate fails the new check | Closed | None |
| U7 | Verified for four flights; the Vaux views check closure rather than the bias | Closed | None |
| U11 | Partly fixed: both reported cases fixed, but the fix led to U12 | Closed with U12 | U12 |
| U12 | New, from U11's fix: a pan and a wheel notch in one frame below the floor turn the view 93.5°, as the floor correction lifts only the camera; a retreat can leave the target under the floor | Accepted | `repair-u1` `3fb0d40`: every floor correction lifts camera and target together, and the zoom does so before taking its ray; red at `29c93d3` in unit tests (95.8° drag and notch in one frame, 3.0° pan alone) and in zoom.spec (7.0°) |
| None | Noted, not defects: the cap pass re-uploads unchanged selections each frame (0.35–0.38 ms CPU, within budget); a piece can be capped by its conservative box (the documented bound, no visible leak); at the floor looking up at a surface within 0.5 m both wheel directions stop | Accepted as bounds | None |

## Verification

Reported by the repair worker at `3fb0d40`, not rerun by the coordinator: `verify` green, 395 unit and 60 e2e. Chrome delivers a wheel notch a frame after a drag, so only the unit test covers both in one frame.

## Round outcome

U10 and U7 verified. U12 repaired in `3fb0d40`. Round 5 is a focused check of `29c93d3..3fb0d40`.
