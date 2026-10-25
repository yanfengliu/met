# Review 6: implementation

## Target

Repository `met`, branch `camera-floor`: `0fd3607..10d714f` (5 files), the repair of review 5's U13, given to the reviewer as a diff on stdin with the `camera-floor` worktree as working directory. After lifting camera and target onto the camera floor, the rig runs one controls update with damping on at a factor of 0 (`settle` in `src/viewer/camera-rig.ts`), so the lift is the last move before the frame renders; per-frame tests are in `src/viewer/camera-floor.test.ts`.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1r6.md` (ignored). By its own account it replayed the test bodies in memory, with `0fd3607`'s rig substituted as well, and checked 26,880 pan and orbit frames with all six movement keys, 44 preset and viewport combinations, 918 follow goals, 30 walk exits and 2,400 wheel operations per revision; it ran no browser tests.
- Claude: not run (focused check of a small repair).

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **U13: Verified.** The lift now ends with an update that consumes no pending pan or rotation. All five test bodies passed in memory; substituting `0fd3607`’s rig failed all three new cases: pan **84 frames below the floor, maximum 0.204 m**; pan with W **59 frames, 0.145 m**; orbit **13 frames, 1.116 m**. [camera-rig.ts:176](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:176), [camera-floor.test.ts:92](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-floor.test.ts:92).

2. **The zero-factor update still has side effects, but none found harmful under this rig’s configuration:**

   - **Pan/rotation:** it applies zero and retains the pending amounts unchanged; subsequent normal updates decay them normally. **Qualification:** total decay is not universally identical above and at the floor. A successful key translation runs another update; blocked Q returns early. That existing call-count asymmetry remains. [OrbitControls.js:715](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:715), [OrbitControls.js:799](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:799), [camera-rig.ts:208](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:208).
   - **Auto-rotate:** if enabled, it would enqueue additional rotation even at factor zero. It defaults to false and this rig never enables it. [OrbitControls.js:318](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:318), [OrbitControls.js:709](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:709).
   - **Native zoom/cursor zoom:** damping zero does not suppress either branch. Here native zoom is disabled, and the preceding normal update has already reset `_scale` and `_performCursorZoom`. [camera-rig.ts:56](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:56), [OrbitControls.js:778](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:778), [OrbitControls.js:906](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:906).
   - **Events/bookkeeping/state:** a qualifying lift emits `change` and updates `_lastPosition`, `_lastQuaternion` and `_lastTargetPosition`. The rig’s `own` guard prevents a false user-move notification. `update()` leaves the interaction state unchanged; `finally` restores both damping settings. [OrbitControls.js:913](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/node_modules/three/examples/jsm/controls/OrbitControls.js:913), [camera-rig.ts:67](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:67), [camera-rig.ts:87](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:87).

   **No material below-floor render or correction-induced turn found.** In-memory checks covered 26,880 pan/orbit frames with all six movement keys, 44 preset/viewport combinations, 918 follow goals and 30 walk exits. The frame loop corrects after keys/follow and before rendering; presets and walk exit clear inertia. Orbit and follow retain their intended turns. [main.ts:310](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/main.ts:310), [camera-rig.ts:112](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:112), [walk-mode.ts:137](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/walk/walk-mode.ts:137).

3. **U12 still holds.** Camera and target receive the same lift. Wheel zoom consumes pending motion and corrects the floor **before** deriving its pointer ray. Across 2,400 wheel operations per revision, maximum ray departure was **1.26 µm, identical before and after**. [camera-rig.ts:179](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:179), [camera-rig.ts:190](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/camera-rig.ts:190), [zoom.ts:74](/C:/Users/38909/Documents/github/met-worktrees/camera-floor/src/viewer/zoom.ts:74).

**No new defect found.** Verification used in-memory probes and test-body replay; browser/e2e and the full verification suite were not rerun. No repository files were changed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U13 | Verified: the old rig fails the three new per-frame tests (under the floor in 84, 59 and 13 frames, by up to 0.204, 0.145 and 1.116 m) | Closed | `10d714f`, merged to main |
| None | Noted, not defects: auto-rotate would add rotation in the zero-factor update, but the rig never enables it; a blocked Q move skips one update, so pending motion decays a step later at the floor than above it | Accepted as bounds | None |

## Verification

The repair worker reported `MET_PORT=5470 npm run verify` green at `10d714f`: 398 unit tests in 43 files, typecheck, lint, build and 60 e2e. The coordinator ran the unit tests (398 in 43 files), typecheck, lint, build, and `zoom.spec` with `camera.spec` (17 passed) at `10d714f`, fast-forwarded main to it, and watched `pages.yml` run 40223980730 deploy it.

## Round outcome

U13 verified and merged. Work unit 1 has no open findings.
