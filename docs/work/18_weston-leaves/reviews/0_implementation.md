# Review 0: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `27c53a0` ("Move Weston's door leaves to the porch's front (work unit 18)"): the diff `806bc91..27c53a0`, 17 files. In code, `src/model/core/weston-porch.ts`, `weston-facade.ts`, `materials.ts`, `galleries.ts` and `src/model/hunt/routes.ts`; in tests, `src/model/core/weston-door.test.ts`, `src/model/doors.test.ts`, `src/model/door-fit.test.ts`, `src/model/collection/placement.test.ts`, `tests/e2e/routes.spec.ts` and `tests/e2e/doors.spec.ts`; in docs, `docs/design/spec.md`, `docs/research/interior.md`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md`, `docs/work/registry.json` and this unit's `plan.md`. The reviewers read the worktree at `77b0c87`, the merge of `27c53a0` with origin's main at `6935f6b`, which brought in work unit 15 (the 1880 fronts), not under review.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, as `../fleet/docs/skills/multi-cli-review.md` gives the commands, from a run folder outside the reviewed tree (`../fleet/tmp/review-runs/met-u18-r0/`, ignored, where the raw captures stay): the change and its reasons, the red proofs run, five lenses (the geometry; the shadow; the walker and the e2e walks; the gates' honesty and bounds; the records against the code) and a findings format with file and line. The diff came on stdin. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran and read again after, show no change by either.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. It cited files and lines outside the diff's hunks, two of which the integration owner checked (`src/model/lib/window.ts:328`, `doorUnit`; `src/viewer/doors.ts:215`, `sync`: the lines it describes). It ran read-only probes in memory (door-fit with the porch's opening narrowed and lowered, the walks at 30, 60 and 144 frames a second, the passage's rays with the 528/529 wall on the map's line, the sun) and edited nothing; it read the merged tree's verify log in the worktree's ignored `tmp/` and, among the fleet's documents, the review runbook, not the run folder.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash (git diff, log and show), permission mode `dontAsk`, no MCP servers. The runbook's lane rule passed: one result, one model key, the pin. 78 tool calls (38 Bash, 26 Read, 14 Grep), none naming the run folder or fleet's tree; it did not delegate and ran no test.

## Reports

Each report as its reviewer wrote it, but for the Codex report's file links, made relative to the repository, and the reports' own headings, set under this record's.

### Codex (`gpt-6-astra`)

Approve — no actionable findings in unit 18, reviewed on integrated revision `77b0c87`.

**Findings**

None.

**Checked and sound**

- **Geometry:** the code gives the stated 0.25 m frame setback, 0.345 m hinge setback, 1.96 m projection, 1.84 m vestibule, frame X −51.66 and approach X −55.16. The actual Weston door-fit callback passed. In-memory controls narrowing or lowering the porch opening by 2 cm both failed as documented.
- **Passage and walking:** read-only probes crossed into gallery 529 and returned past the approach at 30, 60 and 144 fps. All 116 passage rays were clear. Restoring the partition’s map position in memory produced exactly 16 hits at X −48.70.
- **Shadows:** the sun probe reproduced 0.88 m² of floor and 2.20 m² of reveal lit without the leaves. Source-layer hiding excludes the closed timeline leaves from shadow rendering. Stand-ins share clipping materials; orbit swings, walking physics, replay transitions and capture initialization preserve shadow invalidation. Every moving physics frame in my walk probes requested shadows.
- **Browser tests:** the budget test’s closing target meets the open leaf at 1.669 m, within reach. The return walk starts inside the porch with approximately 0.308 m clearance beyond the conservative swing boundary. Its changed destination checks reach gallery 529.
- **Records and bounds:** the changed records match the code. The passage gate declares its sampling limits; the performance gate measures callback work, not GPU completion.

These were in-memory probes, not a substitute run of `npm run verify`. The owner’s merged log showed 735 unit tests, typecheck, lint and build passing, plus both Weston browser walks and the swing budget passing at 6.5/7.7 ms opening/closing. Full e2e verification was still running at my last inspection. I did not independently repeat the throttled runs or inspect fresh captures.

**Read outside the diff**

- [src/model/lib/window.ts:328](src/model/lib/window.ts:328), lines 328–405: frame, leaves and hinge construction.
- [src/viewer/doors.ts:215](src/viewer/doors.ts:215), lines 215–320 and 370–466: lifecycle, physics changes and stand-ins.
- [src/main.ts:338](src/main.ts:338), lines 338–408: capture setup and shadow updates.
- [src/walk/door-world.ts:128](src/walk/door-world.ts:128), lines 128–203: collision poses, sweep checks and release.
- [tests/e2e/route-places.ts:80](tests/e2e/route-places.ts:80), lines 80–165: independently derived door positions and reach.

No files changed or browser processes launched.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** I found no blocker or major defect. There are two minor gaps, both in test coverage, and five nits in the records and tools.

##### Findings

###### F1. No test checks that Weston's door redraws the shadows when it swings while walking — minor
- **Where:** `src/model/doors.test.ts:115-132`; `src/viewer/doors.ts:290-305` (`advance`), `:308-314` (`set`), `:317-321` (`takeChange`), `:421-423` (`note`); `src/main.ts:393-410`; `tests/e2e/doors.spec.ts:459-476`.
- **What is wrong:** the new unit check covers only `sync`, which is the orbit view's path. While walking, `sync` gets 0 seconds (`main.ts:393`), so the swing moves only through `DoorWorld.advance` → `DoorLayer.advance` → `note` → `takeChange` (`main.ts:406-410`). E uses a door only while walking (`src/ui/keyboard.ts:62`; in the orbit view E moves the camera, `src/viewer/orbit-keys.ts:25`). So every swing a visitor starts goes through the path nothing checks. Before this unit no real door cast a shadow, so that branch never ran on the real model.
- **Failure scenario:** suppose a later change makes `note` or `takeChange` report `'moved'` for every door. In walk mode the shadow map then stops updating during Weston's swings:
  - opened, the closed leaves' shadow stays across the open doorway;
  - shut again after some other redraw, the sunlit patch behind the shut door returns — the very defect this unit fixes.

  Every gate stays green, and the e2e budget actually gets faster. The worker's red proof (work planted on shadow frames turned the test red at 41.0 ms) shows the path worked on that run, but nothing keeps it working.
- **Repair:** in `doors.test.ts`, after `layer.use('weston', …)`, step `layer.advance(1/120, () => true)` until the door is open. Expect `takeChange()` to be `'shadows'` after every step, and `'moved'` for the entrance; then call `set('weston', 0)` and expect `'shadows'`. If the `main.ts` side should be covered too, add an e2e probe.

###### F2. Weston's frame budget times one place, one direction, standing still — minor
- **Where:** `tests/e2e/doors.spec.ts:459-476`, compared with the entrance's `:407-457`.
- **What is wrong:** the entrance's budget times swings from both sides plus a walk to and fro. Weston's times only the court side, 0.5 m out, facing roughly north-north-west. Two cases are untimed:
  - the view from inside the porch facing the court, which is where `routes.spec.ts:333-336` opens the door toward the walker;
  - a frame that walks during the swing: collision checks on the moving leaves, the look target and the shadow pass, all in one frame.
- **Evidence that direction matters:** the repo's own history. `docs/learning/gate-proofs.md:111` records an entrance gate that faced out only and passed at 11.5 ms, while facing in went red at 30.3 ms.
- **Repair:** add a timed close and open from the porch place facing out. Ideally also add a short to-and-fro walk during the swing (as `doorCycles` does). At the least, state the bound in the test header.

###### F3. The spec's Budgets paragraph leaves out the new budget — nit
`docs/design/spec.md:263` lists the swing budgets without Weston's. The Doors item is still titled "No shadow from the leaves" (`spec.md:180`, and the section map at `:17`), though it now also covers leaves that cast one.

###### F4. The standard Weston shot still aims at the old leaves — nit
`scripts/capture.ts:40` targets X −49.4, which is `B_SOUTH_X + 0.3`, the old plane. The `doors-weston` shot (`:224`) now aims 2.26 m behind the leaves. By my arithmetic the leaves stay in frame, about 8° off the view axis. Suggest aiming at X −51.66.

###### F5. A source pointer went stale in the merge — nit
`src/model/core/weston-facade.ts:50` says the lining is "as the gallery 600 doorway is (vaux-shell.ts)". After work unit 15, that lining is in `src/model/core/vaux-east.ts:46-56`, and `vaux-shell.ts` no longer has it. `src/model/frame.ts:99` has the same stale pointer, but that one is work unit 15's.

###### F6. The `routes.spec` red-proof record names a walk that no longer exists — nit
`docs/learning/gate-proofs.md:75-76` still name the walk "from gallery 529" and a stop 12.6 m past the old leaves. Both Weston walks changed: the walk in is now let go a metre past the old front, and the walk back now starts in the porch. No `routes.spec` proof was rerun for them. Suggest replanting "the leaves' collision left closed while they swing" on both walks and adding a dated line, or recording that they were not rerun.

###### F7. Extra blank line at the end of the doors spec — nit
The committed `tests/e2e/doors.spec.ts` now ends with `});\n\n` (`:477-478`).

##### Checked and sound
- **Measurements match the code:**
  - `DOOR_FRAME_OUT` = 2.13 + 0.08 − 0.25 = 1.96 (`weston-porch.ts:91`), so the frame's front is at X −51.66.
  - The door unit is 0.12 m deep and its leaves are 0.07 m thick, so the back face is 0.095 m behind the frame's front (`window.ts:349-375`). The hinges are therefore 1.865 m out from the brick face.
  - The architrave's face is at 2.21 m (`surround.ts:50-58`), which puts the hinges 0.345 m behind it.
  - The vestibule is 1.84 m deep.
  - The approach point is at X −55.16, 3.01 m before the pedestals.
- **The swing stays inside the porch:**
  - Open, each leaf runs from 1.865 m out back to 0.308 m out (the plan rounds this to 0.30).
  - Its inner face is at ±1.491 m (raised panels ±1.473), and its outer panels at ±1.579 m, 6.6 cm off the porch's reveal and 4 mm off the jamb.
  - The leaves' top (4.826 m) is under the soffit (4.91 m), and their foot is 0.084 m above the floor.
  - They stop 0.31 m short of the brick face, so the old wall's lining and threshold are out of reach.
  - The frame's outer faces lie exactly on the reveal planes. door-fit's 1 mm inset (`door-fit.test.ts:21`) lets that pass and catches a 1 cm overlap, which matches the header's red proofs.
- **Shadows:**
  - In three.js r186 the shadow pass skips layer-masked meshes (`node_modules/three/src/renderers/webgl/WebGLShadowMap.js:522`). So the hidden closed leaves (layer mask 0, `doors.ts:231`) cast nothing while the stand-ins are drawn, and no shadow is doubled.
  - The stand-ins take their shadow flag from the shared material (`doors.ts:375`), so the section cut clips their shadows too.
  - Swaps, resets and every swing step return `'shadows'` (`doors.ts:215-249`).
  - No render happens before the load-time sync (`main.ts:339`), and the shadows start dirty (`viewer.ts:43`), which covers `shot=1` and `doors=open`.
  - Timeline changes redraw the shadows (`main.ts:388`).
- **The sun probe holds up:**
  - With `sun.ts:10-20` and the 29.03° grid bearing, the sun is 75.6° off the facade's normal.
  - My own ray arithmetic lights the floor and the west reveal back to about 0.93 m, close to the probe's 1.01 and 0.97 m.
  - Without a shadow from the leaves, sun would reach behind them, so making them cast is the right call.
- **Passage rays:** the map-line wall spans 0.85–1.25 m west of the axis, so exactly 4 offsets × 4 heights = 16 rays meet it at X −48.70, as the recorded red proof says. The rays start clear of the pedestals and stay inside the open leaves and under the frame's head. The picker uses default layers, so it skips the hidden leaves.
- **Walks:**
  - At 2 m/s (`walker.ts:54`) the unit walk's leg through the door has about 1.1 m of margin, and the 4 s red proof at X −53.853 fits that speed.
  - In the doors.spec test the walker stands 0.13 m clear of the leaves' panels. The ray it closes the door by passes the architrave and frame openings and meets the open west leaf at 1.67 m, inside the 2 m reach.
  - The place in the porch is X ≈ −49.99, its body 0.31 m clear of the swing.
- **Elsewhere:**
  - The new passage zone in the placement test contains the old one entirely.
  - `clearOf` reads only z and width, so moving x does not affect it.
  - The core test's 2.9 m porch allowance covers the frame at 1.96 m out.
  - In doors.test, the check that Weston's stand-ins are not empty keeps the shadow check from passing vacuously.
  - The merge's `arches.ts` change touches voussoirs only.
  - The records agree with the code apart from F3–F6.

**Not verified:** I ran no tests, so as not to load the machine while your gates run. The merged-tree `verify`, the `routes.spec` runs at 4×, the standard shots, and whether the leaves' shadow actually shows behind the shut door at the shadow map's resolution all remain open.

##### Read outside the diff
- Door layer and page: `src/viewer/doors.ts` (whole), `src/main.ts:1-440`, `src/viewer/viewer.ts`, `src/viewer/sun.ts`, `src/viewer/environment.ts:140-170`, `src/build/batch.ts`, `node_modules/three/src/renderers/webgl/WebGLShadowMap.js`.
- Model parts: `src/model/lib/window.ts:1-130,200-408`, `src/model/lib/surround.ts:1-100`, `src/model/core/galleries.ts`, `src/model/core/arches.ts`, `src/model/core/vaux-east.ts`, `src/walk/door-world.ts:120-170`.
- Tests and their helpers: `tests/e2e/route-places.ts`, `tests/e2e/route-walk.ts`, `tests/e2e/route-holds.ts`, `tests/e2e/surface.ts`, `src/model/hunt/routes.test.ts:195-235`, `src/model/reach.test.ts` header, `src/model/core/core.test.ts`.
- Tools and records: `scripts/capture.ts`, `docs/learning/gate-proofs.md`, `docs/research/interior-images.md` (#33).

## Findings and disposition

Codex found nothing; the IDs are Claude's.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | No test checks that Weston's swing redraws the shadows on the walk's path, where E opens a door: the new check covers `sync`, the orbit view's path, while walk mode swings doors through `advance`, `set` and `takeChange` (minor) | Accepted | `src/model/doors.test.ts` opens each door again and steps its swing through `advance` at 1/120 s, reading `takeChange` at every step, and sets it shut with `set`: the entrance reports the frame alone, Weston's the frame and the shadows. Red with `DoorLayer.note` reporting the frame alone: Weston's steps then report `moved` |
| F2 | Weston's frame budget times one place and one direction, standing still (minor) | Accepted in part: the place inside the porch facing out is added; walking frames during Weston's swing are not timed, and the bound says so. The walk's own work in a swing frame (the leaves' collision and the look target) is the work the entrance's walked cycles time, and the shadow pass does not depend on the view | `tests/e2e/doors.spec.ts` also stands inside the porch, where `routes.spec.ts` uses the door, standing open, and times its closing and opening facing out; its header says the walking frames during a swing are timed at the entrance alone |
| F3 | The spec's doors budget paragraph leaves out Weston's swing, and the Doors item is still titled "No shadow from the leaves" (nit) | Accepted | The budget paragraph gives Weston's swing budget at both places; the item is "The leaves' shadows" in the section map and the item, and in the references to it (`interior.md`, `materials.ts`) |
| F4 | The standard Weston shot still aims at the old leaves' plane, X −49.4 (nit) | Accepted | `scripts/capture.ts` aims `doors-weston` at X −51.66, the middle of the leaves' frame |
| F5 | `weston-facade.ts` points to `vaux-shell.ts` for the gallery 600 doorway's lining, which work unit 15 moved to `vaux-east.ts` (nit) | Accepted | The pointer is `vaux-east.ts`. `src/model/frame.ts:99` has the same stale pointer from work unit 15, outside this unit: left for it, and reported |
| F6 | `gate-proofs.md` names the old walk "from gallery 529" and an old stop, and no `routes.spec.ts` proof was rerun on the changed Weston walks (nit) | Accepted | Both proofs that name Weston's door planted again and undone, the two Weston tests unthrottled: the leaves' collision left closed while they swing, both red, stuck at X −51.98 before the leaves from the court and at X −51.22 behind them from the porch; Weston's leaves out of the door world, the walk from the court held at X −37.10 in wing B, 14.5 m past the leaves' face, the walk from the porch green. Recorded in a dated paragraph under `routes.spec.ts` |
| F7 | `tests/e2e/doors.spec.ts` ends in a blank line (nit) | Accepted | Removed |

## Verification

On `27c53a0`'s tree, before the review: `npm run verify` through `tmp/gate.sh` (81 test files, 733 unit tests; typecheck; lint; build; 126 e2e tests in 10.5 min). On `77b0c87`, its merge with main at `6935f6b`: `npm run verify` (82 files, 735 unit tests; 126 e2e) and `routes.spec.ts` three runs in a row at 1×, all green. Two `routes.spec.ts` runs at 4× on that tree are void: a chain of runs this session meant to stop kept going and ran them while F6's red proofs were planted, so they failed where the plants stood (every door's walk stuck with the leaves' collision left closed; Weston's walk from the court unheld with its leaves out of the door world). A third, on the repaired tree with no plant, passed (12 tests, the two frame budgets skipped at 4×).

On the repairs (the working tree of the next commit): typecheck and ESLint on the changed files; `src/model/doors.test.ts` green, and red with F1's plant; the two F6 plants on the Weston walks, as `gate-proofs.md` records them; `tests/e2e/doors.spec.ts`'s Weston budget at both places (slowest 9.7 and 7.1 ms from the court, 7.4 and 7.4 ms inside the porch); and `npm run verify` (82 files, 735 unit tests; 126 e2e in 10.3 min, Weston's swing at most 10.0 ms of work). Main moved on meanwhile (work unit 16, the Medieval Sculpture Hall's end windows, at `59451af`): the throttled runs three in a row, the shots against main's and review 1 follow on the merge with it.

## Round outcome

Both reviewers approve: Codex with no findings, Claude with two minor findings and five nits, none blocker or major. All seven are accepted, F2 in part, and repaired in the next commit, which review 1 reviews.
