# Review 5: implementation

## Target

Repository `met`, branch `repair-u1`: `29c93d3..3fb0d40`, given to the reviewer as a diff on stdin with the `repair-u1` worktree as working directory. Every camera floor correction lifts camera and target together, and the zoom applies it before taking its ray (`src/viewer/camera-rig.ts`, `src/viewer/camera-floor.test.ts`, `tests/e2e/zoom.spec.ts`).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r5.md` (ignored). By its own account it ran the new tests in memory and with `29c93d3`'s rig substituted, 10,800 wheel operations over 5,400 rig input sequences, all 22 presets at two viewport shapes, 918 follow goals and six walk-exit poses; it did not rerun the browser case.
- Claude: not run (focused check).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **U12: Verified for the reported reversal.** Camera and target receive the same lift, before zoom derives its ray. [camera-rig.ts:154](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:154), [camera-rig.ts:169](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:169). Both new test bodies passed in memory; substituting `29c93d3`’s rig failed them with **95.8176°** and **3.0477°** turns. [camera-floor.test.ts:62](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-floor.test.ts:62), [camera-floor.test.ts:75](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-floor.test.ts:75). The e2e reversion’s **7.0°** failure is recorded, not independently rerun here; that browser case spans frames. [defect-register.md:29](C:/Users/38909/Documents/github/met-worktrees/repair-u1/docs/learning/defect-register.md:29), [zoom.spec.ts:16](C:/Users/38909/Documents/github/met-worktrees/repair-u1/tests/e2e/zoom.spec.ts:16).

2. **The unconditional “any state/order” guarantee does not hold.** After normalization, 10,800 wheel operations across 5,400 rig input sequences showed no unintended turn or ray departure: maximum error **3.75×10⁻⁷ m**. This measures the ray after pending drag and floor recovery, as implemented—not displacement from the raw pre-wheel pose. [camera-rig.ts:170](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:170).

   Two **pre-existing** limits remain:

   - **The floor correction can immediately undo itself.** Its `sync()` consumes more damped pan. With the new test’s setup, pan alone leaves camera Y **−0.264347** after the first update despite floor Y **0.4**; both revisions do this. Apply correction after the final movement-producing controls update. The test checks only after 60 frames. [camera-rig.ts:159](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:159), [camera-floor.test.ts:80](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-floor.test.ts:80).
   - **Both wheel directions can legitimately stop:** on the floor, looking upward at a surface within 0.5 m, inward movement meets the surface stop and outward movement meets the floor. Reproduced unchanged in both revisions. [zoom.ts:61](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:61), [zoom.ts:69](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/zoom.ts:69).

   **No regression found in presets, resize fitting, follow or walk exit.** In-memory checks covered all 22 presets at two viewport shapes, 918 follow goals and six walk-exit poses. Presets replace the target, resize reapplies the pose, follow interpolates both vectors, and walk exit restores eye plus look direction. [camera-rig.ts:95](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:95), [main.ts:286](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/main.ts:286), [camera-rig.ts:124](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:124), [walk-mode.ts:148](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/walk/walk-mode.ts:148).

3. **No timeline state is written by this diff.** Its writes affect camera/control state and clipping; picking reads scene state. [camera-rig.ts:157](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:157), [camera-rig.ts:179](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/camera-rig.ts:179), [pick.ts:40](C:/Users/38909/Documents/github/met-worktrees/repair-u1/src/viewer/pick.ts:40).

**No new defect introduced by this diff found.**

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U12 | Verified: the old rig fails both new tests (95.8° and 3.0°) | Closed | None |
| U13 | Older, in both revisions: the floor correction can undo itself, as the controls' next update consumes more damped pan, so a pan near the ground can leave the camera under the floor for some frames (Y −0.264 against a floor of 0.4 after the first update) | Accepted as a known limit of the orbit camera that predates this unit; not repaired here | Reported to the owner with the unit's outcome |
| None | At the floor looking up at a surface within 0.5 m, both wheel directions stop | Accepted as a bound, as in round 4 | None |

## Verification

The coordinator ran `MET_PORT=5470 npm run verify` at `3fb0d40`: green, 395 unit tests in 43 files, typecheck, lint, build and 60 e2e tests in 7.2 min (log `tmp/review-runs/verify-final-3fb0d40.log`, ignored).

## Round outcome

No new defect in the diff. U12 verified; U13 recorded as a known limit. The repair branch is accepted for merge.
