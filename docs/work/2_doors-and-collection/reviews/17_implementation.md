# Review 17: implementation (final, whole unit)

## Target

Repository `met`, main at `0defda0`: `db4cc47..0defda0` (159 files, +13,526/−712), the whole of work unit 2 as merged. It covers milestones M3a, M1, M2a, M3b, M4 and M2b, each reviewed on its own in reviews 1–16. This round looks for what only the merged whole can get wrong: the milestones' interactions, the determinism contract with every new layer, each acceptance criterion against the code and its tests, and the Gates text.

## Reviewers and coverage

- Codex `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, prompt `tmp/review-runs/prompt-u2-final-codex.md` (ignored), from a detached snapshot worktree at `0defda0`.
  - The full diff, 1.3 million characters, was over Codex's 1,048,576-character input. So it was given the diff without the unit tests, `scripts/`, the generated catalogue, the review records and the devlog (686 KB), and told to read those in the repository.
  - By its own account it ran 253 targeted test bodies in memory, and walked each acceptance criterion to its tests.
- Claude `claude-opus-5-5[1m]`, effort max, `claude -p` with `--allowedTools "Read,Glob,Grep,Task,Bash(git diff *),Bash(git log *),Bash(git show *)"`, on the full diff. A login and model check came first (`tmp/review-runs/claude-login-u2.jsonl`: the pin in `system/init`, no tools or MCP servers, exactly one `modelUsage` key). The report passed the runbook's keep check (`keep success claude-opus-5-5[1m]`).
  - By its own account it ran the 597 unit tests from a scratch config, and probed the real model: the straight approach to the doors, the locked doors with their parts left out of the door world, and the labelling of every artwork from reached places.
- Coordinator: the standard shot set at `0defda0`, which is the gallery's first version (https://claude.ai/artifact/YFUsoCGDEin8eGcUoxMPBV), and the live checks recorded under F49.

## Reports

### Codex (`gpt-6-astra`, xhigh)

Two findings at `0defda0`, ranked by consequence:

1. **P2 — Reachability does not prove that every artwork’s label is reachable.** [reach.test.ts:124](C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/reach.test.ts:124) measures distance and sight to the artwork’s combined bounding box, which can contain empty space. On the integrated model, it accepts object **458998** from eye `(15.738, 5.710, −163.195)`, although its nearest actual tagged surface is **6.368 m** away—beyond the label’s 6 m reach. The separate [labels.test.ts:52](C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/collection/labels.test.ts:52) invents a nearby eye position without proving the walker can reach it. Thus both tests can pass without establishing a usable viewing position. This also overstates the reachability claim in `AGENTS.md:89`.

   **Fix:** accept an artwork only when a reachable eye’s real hit query returns that artwork within 6 m; confirm it after replay. Add a rotated or hollow artwork regression where the bounding-box corner is within reach but the geometry is not. I have not established that any current artwork is globally unreachable.

2. **P3 — Shared documentation retains superseded milestone contracts.** [spec.md:77](C:/Users/38909/Documents/github/met-worktrees/review-final/docs/design/spec.md:77) still calls the entrance’s leaves passable and “not yet solid.” A visitor walking into a closed entrance is correctly stopped by M2b; this paragraph describes the opposite behavior. Also, `spec.md:211` and `AGENTS.md:108` list placement clearance only for R1–R5, while [placement.test.ts:56](C:/Users/38909/Documents/github/met-worktrees/review-final/src/model/collection/placement.test.ts:56) includes R6 and the two new passages.

   **Fix:** restrict the passable exception to the fixed entrance pieces, describe leaf collision as dynamic, and update both placement summaries.

Acceptance coverage, in the plan’s order:

| Criterion | Review result |
|---|---|
| Stair eye | Substantive unit and rendered-camera checks cover both directions and speeds. |
| Walking screen and controls | Real-input tests cover both required viewport sizes. |
| Pool, gate and gallery 600 | Escape, route and doorway checks passed. |
| M2a interaction, determinism and shots | Door-layer assertions passed; first-render and interaction tests are substantive. |
| M2b solid doors and Weston | Sweep, blocked reversal, settle, passage and route checks passed. |
| Catalogue, placeholders and budgets | Offline checks passed; 746 timeline meshes, six stand-in meshes, 1,579,576 timeline triangles. File limits passed. Network and 4 s checks exist. |
| Labels | Actual picking and card tests are substantive; combined reachability proof has finding 1. |
| Milestone verification and delivery | Recorded full verification at `43887b2` covers the same executable tree. Fresh captures and live deployment were not independently checked here. |
| M4 amendment | Paths and replay passed; artwork viewing-distance proof needs repair. |

No other integration defect found in input routing, the shared look target, collision/settle, door layers with caps/floors/shadows, frozen facts or shot ordering.

**Verification:** 253 targeted test bodies passed through an in-memory runner. Full `verify`, browser performance and visual captures were not rerun. Repository unchanged; no task-owned processes or files remain.

### Claude (`claude-opus-5-5[1m]`, max)

I ran the repo's whole unit suite from a scratch config: 597 tests in 68 files pass at `0defda0`. I also ran probes against the real model. I didn't run the e2e suite, the shots, typecheck, lint, build or the 4 s budget, because the Vite dev server writes into the repo. I found one defect a visitor will hit, one gap in a gate, and a set of doc statements that are stale or don't match their tests.

## Findings, ranked by consequence to a visitor

**1. Medium–high. On the default walk to the entrance, the middle door shows no prompt and E does nothing.**
- **Where:** `src/walk/look.ts:38-41` looks along one centre ray. `src/model/lib/window.ts:285,359-360` hangs each pair of leaves with an 8 mm gap where they meet. `src/walk/spawns.ts:24` (outside the diff) puts the plaza spawn on X 0, facing −Z.
- **Scenario:**
  - A visitor presses Walk, holds W only, and stops 1.3 m before the middle doorway. The feet are at X 0.000, so the crosshair looks straight through the 8 mm gap.
  - The look target comes back null at 30, 60 and 144 fps, walking or running. No "E Open" shows, the crosshair stays white, and E does nothing.
  - Turning 0.5° shows the prompt. Pushing into the doors also shows it, but only after the body has slid 4–5 cm along the leaves.
  - The link doors and the Bank door, approached on their own axis, never say "Locked", even with the walker pressed against them.
  - The walking hint (`src/ui/ui.ts:72`) never mentions E, so the prompt is the only cue.
  - The e2e tests turn onto a leaf before they look (`doors.spec.ts:225`, `routes.spec.ts:81`, `labels-doors.spec`). They build the workaround in instead of catching the defect.
- **Fix:** let a door's look target cover its doorway, not just its leaves. One way: when the centre ray finds no tagged piece, retry a few rays offset about 1 cm and accept a door within reach. Another: give each closed door a pick-only proxy over its leaves. Then add an e2e: from the plaza spawn, W only, stop 1.3 m before the door, expect "E Open" without turning. It is red today.

**2. Medium. No test covers the locked doors through the collision path the page uses.**
- **Where:**
  - `src/model/doors.test.ts:119-120` walks into each locked door in a static world that still contains the leaves.
  - Since M2b the page leaves every leaf out of the static world (`walk-mode.ts:323`) and holds the locked leaves only in the door world.
  - `src/viewer/doors.ts:135-136` silently skips a locked piece whose matrix is missing.
- **Scenario:** in my probe I removed the locked doors' parts from the page's door world. The walker walked through the north link door and dropped 2.90 m, through the south link 1.90 m, and through the Bank door 0.50 m. Every unit and e2e test would stay green. `doors.spec` stops 1.5 m short of the link door.
- **Fix:** walk each locked door through `walkWorld(...)` in `doors.test.ts` and keep the static case as a geometry check. Throw instead of skipping at `doors.ts:136`.

**3. Low. The spec contradicts itself on the entrance leaves.**
- **Where:** `docs/design/spec.md:77` lists "the passable copies of the bronze and dark glass of the central doors' frames and leaves, not yet solid". Doors: Walking says, and the code agrees (`hunt.doorLeafBronze` and `hunt.doorLeafGlass` are solid), that the leaves are solid.
- **Fix:** say the leaves are solid; only the frames, the bronze beside them and the transom lights are passable.

**4. Low. Gates and spec text don't match the tests.**
- **R1–R5 vs R1–R6:** `AGENTS.md:108` and `spec.md:211` say the collection keeps clear of R1–R5. `placement.test.ts` checks R1–R6 and both M4 passages.
- **Stale control:** the same Gates line lists "every `kit.add` matrix lifted 10 cm" as a red control, but artwork pieces now go through `kit.addTagged`.
- **`AGENTS.md:93` (labels.spec):** it says a walking frame "stays under 16.7 ms". `expectWalkingBudget` allows a median interval of 18.37 ms. F21 fixed this wording for walk.spec only.
- **`AGENTS.md:102` (door-world):** it says the opening and closing holds run "alike at 30, 60 and 144 frames a second and through stalled frames". Only the closing hold does (`door-world.test.ts:121`); the opening hold runs at 60 fps only (`:87`).
- **`AGENTS.md:102` (locked doors):** "the walker walked at each locked door stops against its leaf" is true only in the static world (finding 2).
- **`AGENTS.md:97` (doors.spec):** it says the scrubber "shows the closed leaf". `doors.spec.ts:246` reads only the door's state (`built: false`), not what was drawn (`perf.lastDrawn.doors` would read null). This is the lesson from F32, not applied here.
- **Stale comments and numbers:**
  - `labels-doors.spec.ts:11` says the Bank door "stands in a court no walk reaches"; M4 made it reachable.
  - `walk.spec.ts:315` still says "nothing tagged is in reach in this model yet".
  - `docs/research/collection.md:34` says "729 meshes, 1,578,714 triangles"; the model is now at 746 and 1,579,576.
- **Fix:** reword each one.

**5. Low. The M2b criterion "the Weston door works as the Hunt doors do" is met only by a headless test.**
- **Where:** `weston-door.test.ts:94` calls `layer.use('weston', …)` directly. No test reaches the Weston door, or the Bank's "Locked", through the look target or real input.
- **Scenario:** it works today. My probe from the Petrie Court finds `weston` at 0.35 m with "E Open". But if Weston's stand-ins stopped being registered with the picker, or the porch blocked the eye ray, a visitor could never open it and every gate would pass.
- **Fix:** in `weston-door.test.ts`, aim the look target at a leaf (off the meeting line), check `doors.prompt`, then open the door that way.

**6. Low, process. "Deployed and checked live" is recorded for one milestone of six.**
- **Where:** only `reviews/2_implementation.md:51` (M3a) records a live check. M1, M2a, M3b, M4 and M2b record only fast-forwards to main.
- **Fix:** the integration step deploys `0defda0`, loads the live page, and records the result: doors open and close, a card shows, nothing is asked of another host, and the ready time.

**7. Info.**
- Reading `window.__met.walk` runs a fresh hit query and rewrites `WalkMode.seen` (`walk-mode.ts:272`). That is harmless today, because each walking frame recomputes it before the UI reads it. But the header of `tests/e2e/route-walk.ts` says its reader "writes nothing of the page", which isn't quite true. Per-frame readers also double the look-target work in the frames `doors.spec` times; its header acknowledges that.
- Three files are close to the 500-line cap: `walker.ts` 496, `main.ts` 486, `collision.ts` 480.
- Still open from the milestone reviews: F39 (follow-up), F42 (deferred) and the Weston doorway's head (follow-up).

## Areas that are sound

- **Input routing:** E is taken before the held keys only while walking (`keyboard.ts:53`). The locked click acts only while walking with the pointer locked (`main.ts:197-199`). The orbit click gate passes every press while walking. The zoom is off while walking (`camera-rig.ts:57`), and so are the floor keys and picker.
- **One look target:** the door prompt and the card both listen to `onLookTarget`, so they can't show together.
- **Collision:**
  - The static world and `instancesBefore` leave out `leafMeshes` the same way.
  - `settle` ignores the leaves, and `release` runs after every settle.
  - `Walker.save` and `restore` cover all 20 numbers of the walker's state.
- **Layers and determinism:**
  - The door layer and the floor view set layer masks on different meshes.
  - The cap pass copies each mesh's mask (`src/viewer/cap-pass.ts:73`), and the floor view restores its own (`src/viewer/floor-view.ts:115-117`); both are outside the diff.
  - Hidden leaves draw no shadow, and no stand-in casts one.
  - No timeline field is written, so the snapshot in `src/build/testing.ts` holds.
- **Shot contract:** the doors are set before the walker is placed (`main.ts:334-342`), and swings are instant under `shot=1`.
- **Model and placeholders:**
  - `placement.test.ts` and `door-fit.test.ts` pass.
  - I also tested the combined property: every one of the 94 artworks can be labelled by the look target from at least 127 places a walker reaches. The full fill reaches 182,262 places.
- **Budgets and network:**
  - 746 meshes and 1,579,576 triangles.
  - The placeholders take 38 meshes and 40,290 triangles.
  - The doors take 16 meshes and draws.
  - The reachability figures in the Gates text are accurate: 63,442 places in 8.7 s, and 123 paths walked again in 0.48 s.
  - No runtime code under `src/` fetches anything.

Probes are in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met-worktrees-review-final\8eea9b00-e807-4779-8dc0-b9e1ade75f2c\scratchpad\probes`; the main ones are `gap2.probe.ts` (finding 1), `lockedmut.probe.ts` (finding 2) and `cards.probe.ts` (the labelling check).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F46 | Walking straight at a door on its axis, the centre ray passes the 8 mm gap between the leaves: no prompt, E does nothing; the e2e tests turned onto a leaf first (Claude 1) | Accepted: the first approach a visitor makes | `f7ad509`, `1f3d7c9`, completed in `defcf6f` (review 18, F50): a pick-only box over each closed door's leaves, seen by the look target alone; e2e from the plaza spawn with W only, red at `0defda0` |
| F47 | The locked doors are tested only in a static world; with their parts left out of the door world a walker falls 2.90 m through the north link door and every gate stays green (Claude 2) | Accepted | `71d0ba1`: the locked doors walked through the page's `walkWorld`; a door piece with no resting matrix throws (red: 4.52 m past the leaves) |
| F44 | The reachability gate measures an artwork's bounding box, not what the look target finds (Codex 1) | Accepted | `1179064`, completed in `2600751` (review 18, F51): an artwork is met only where the look target finds it within 6 m from a walker's own resting eye, checked again after the replay |
| F48 | The Weston door and the locked doors' "Locked" are reached only headlessly (Claude 5) | Accepted | `2737bf2`: both through the look target |
| F45 | Stale or unbacked text in the spec, Gates and comments; reading `walk.target` from the facts wrote `WalkMode.seen` (Codex 2, Claude 3, 4 and 7) | Accepted | `ac5dcd0` |
| F49 | "Deployed and checked live" was recorded for one milestone in six (Claude 6) | Accepted: the checks ran but went unrecorded | Recorded in the plan's Outcome: live at `c2b6f44`/`7f1946d` (M1), `691b8f7` (M2a), `cd8a934` (M3b), `d84bba0` (M4) and `0defda0` (M2b), each with no console error and no request off the site's own host |
| None | Files close to the 500-line cap: `walker.ts` 496, `main.ts` 486, `collision.ts` 480 (Claude 7) | Noted | None |

## Verification

Above; the repairs' checks are reviews 18 and 19.

## Round outcome

Six findings accepted, repaired on branch `final` and checked in reviews 18 and 19.
