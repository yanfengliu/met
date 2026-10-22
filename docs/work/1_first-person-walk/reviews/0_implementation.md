# Review 0: implementation

## Target

Repository `met`, the whole of work unit 1: `a3d077d..6f8892f` (70 files, +4,767/−188), given to the reviewers as a diff on stdin with the main checkout as working directory. `6f8892f` is main with milestones M1 (walk mode, orbit keys, default load, zoom fix), M2 and M2b (routes R1–R4 and the openings they need) and M3 (the floor picker).

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u1-final.md` (ignored). Its log shows no `STATUS_DLL_INIT_FAILED` or `-1073741502`. By its own account it ran `tsc`, walked R1–R4 in memory both ways, compared a timeline snapshot before and after walking and floor filtering, and reproduced findings 1, 3 and 4 in the page; it did not rerun `verify`, the browser suite or the audits. The tree was clean afterwards.
- Claude `claude-opus-5-5[1m]`, `--effort max`: abstained. It ran into the 60-minute cap (exit 124) after 114 subagent tasks without writing a final report, so no findings are recorded from it. It was not rerun: the account stood at 82% of its seven-day usage, and the focused check of the repairs (round 1) went to Codex, which runs on a separate account.

## Reports

### Codex (`gpt-6-astra`, xhigh)

1. **[P1] Collision rebuilds can leave the walker buried beneath the model.** [src/walk/walk-mode.ts:169](C:/Users/38909/Documents/github/met/src/walk/walk-mode.ts:169) replaces the collision world without revalidating the walker’s position. Reproduced by starting at `?t=0&walk=1`, allowing the walker to fall, then advancing to N with the timeline’s End button: the collision contains all 153 steps, but the eye remains at Y −3.44 beneath the plaza at approximately Y 0.035, even after another five seconds. **Fix:** reconcile placement when completed geometry changes, recovering to a valid walkable surface when new geometry buries the walker. Cover start/end jumps and playback while walking.

2. **[P2] Stepping up does not check headroom.** [src/walk/walker.ts:234](C:/Users/38909/Documents/github/met/src/walk/walker.ts:234) snaps the feet upward after horizontal collision resolution; that resolution skips vertical ceiling contacts in [src/walk/collision.ts:280](C:/Users/38909/Documents/github/met/src/walk/collision.ts:280). A fixture with a 0.3 m step beneath a ceiling occupying Y 1.8–2.2 lets the walker advance with feet at 0.3 and eye at 1.9—inside the ceiling. **Fix:** validate the capsule’s clearance before accepting an upward step, rejecting movement when the raised body cannot fit. Add a low-ceiling stair fixture.

3. **[P2] Keyboard routing uses the previous frame’s walk mode.** [src/ui/ui.ts:83](C:/Users/38909/Documents/github/met/src/ui/ui.ts:83) supplies `bindKeys` a cached flag updated only by `sync`. Reproduced with F followed by Space before the next animation frame: walk mode becomes active, but Space dispatches `togglePlay`. At the default finished state, that unexpectedly restarts construction, through [src/build/player.ts:69](C:/Users/38909/Documents/github/met/src/build/player.ts:69). **Fix:** have keyboard routing read `walk.active` synchronously. Test consecutive mode-changing and action keys within one frame.

4. **[P2] Camera presets remain actionable while the walker immediately overrides them.** [src/main.ts:208](C:/Users/38909/Documents/github/met/src/main.ts:208) applies a preset and marks `atPreset` without leaving walk mode. Selecting Front while walking moves the camera briefly; [src/walk/walk-mode.ts:176](C:/Users/38909/Documents/github/met/src/walk/walk-mode.ts:176) restores the walker’s view next frame. The stale preset flag then causes an unexpected jump to Front after leaving walk mode and resizing, via [src/main.ts:282](C:/Users/38909/Documents/github/met/src/main.ts:282). **Fix:** exit walk mode before applying a camera preset and keep the preset flags consistent.

5. **[P2] The zoom regression gate does not establish that the stop is at a surface.** [tests/e2e/zoom.spec.ts:50](C:/Users/38909/Documents/github/met/tests/e2e/zoom.spec.ts:50) measures remaining room using the orbit target that zoom itself maintains. Replaying its numerical assertions with an intentionally wrong picker returning only camera-to-target distance produced no failures, while the aerial camera stopped about 21.6 m beyond the actual first surface. **Fix:** independently establish the surface position and assert the camera stops 0.5 m before it; demonstrate that replacing the scene pick with target distance fails.

TypeScript checking passed. In-memory R1–R4 walks passed both directions; the sampled timeline snapshot remained unchanged after collision, walking, and floor filtering. Full verification, browser tests, and dependency audits were not rerun. No files were changed.

Outside-diff reads included [src/build/batch.ts:84](C:/Users/38909/Documents/github/met/src/build/batch.ts:84), [src/build/player.ts:69](C:/Users/38909/Documents/github/met/src/build/player.ts:69), [src/build/testing.ts:90](C:/Users/38909/Documents/github/met/src/build/testing.ts:90), and [src/model/lib/wall.ts:4](C:/Users/38909/Documents/github/met/src/model/lib/wall.ts:4).
## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| U1 | A collision rebuild can leave the walker buried (Codex 1, P1) | Accepted: reproduced from `?t=0&walk=1` then End, eye at −3.44 under the plaza | `repair-u1` `f66e724`: placement reconciled after every build; at t = 0 the walker stands on the workspace ground |
| U2 | Step-up ignores headroom (Codex 2) | Accepted | `repair-u1` `f7e82cd`: a raised body must fit; low-ceiling stair fixtures |
| U3 | Key routing reads last frame's walk mode (Codex 3) | Accepted | `repair-u1` `26e502d`: `walk.active` read at each key press; same-frame key tests |
| U4 | A preset chosen while walking leaves stale flags (Codex 4) | Accepted | `repair-u1` `7e21ff4`: a preset leaves walk mode first |
| U5 | The zoom gate measures against the orbit target zoom maintains (Codex 5) | Accepted: the gate guards an owner-reported defect, so a circular check is worse than none | `repair-u1` `89595d0`: an independent ray cast in the test process; defect register entry updated |
| U6 | The route and plaza e2e flaked under load (raised by the repair worker, not a reviewer) | Accepted: a gate that flakes under load cannot tell a defect from noise | `repair-u1` `18b2a1c`: every frame recorded in the page, keys change at waypoints, one scaled timeout; 3 runs in a row green at 4× CPU throttling and at 1× |

## Verification

At `6f8892f`, `npm run verify` was green on main: 375 unit tests in 40 files, 47 e2e. The repair branch at `18b2a1c` reported `verify` green: 385 unit, 54 e2e.

## Round outcome

All five review findings accepted and repaired on `repair-u1`, together with U6; none rejected. Claude's lane abstained (timeout, no report). Round 1 is a focused Codex check of `6f8892f..18b2a1c`.
