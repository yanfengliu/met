# Review 0: implementation

## Target

Milestone B of `docs/work/26_remove-build-replay/plan.md`: repository met, branch `worktree-remove-build-replay` at `7bb47fc`, which is B's commits `2859169` and `8053ce6` merged with main at `84be2b0` (main's side docs only). The reviewed change is `git diff 84be2b0 7bb47fc`. The prompt gave in full B's diff outside `src/model/` and its diff of the tests under `src/model/`, and the stat of the model's builders, whose diff each reviewer read itself; it named the plan's criteria for B and six things to look for (the static build and its consumers, the removed `order` and what else it might have carried, walk mode's settling, the door layer's load path, the tests, the docs).

## Reviewers and coverage

- Codex, `gpt-6-astra` at `model_reasoning_effort=xhigh`, read-only sandbox, from a run folder outside the tree (fleet `docs/skills/multi-cli-review.md`). It read the code and the builder diffs, compared the model with milestone A's in memory, ran five walk and door scenarios, and ran the typecheck and lint; its Vitest run executed no tests (the sandbox denied a temporary folder), and it ran no browser test, shots or sweep. The runbook's check of its log found no failed sandbox command: kept.
- Claude, `claude-opus-5-5[1m]` at `--effort max`, with Read, Glob, Grep, Task and `git diff`, `log` and `show` only, `dontAsk`, no settings or MCP servers. It read the code and all 77 builder diffs and ran nothing; its shell stopped answering partway, which left a `bash.exe.stackdump` in the tree's root (removed after the run; `git status` and `git diff HEAD` were empty before the run and showed nothing else after it). The runbook's check of its log passed: one result, its model usage the pin alone: kept.

The reports below are each lane's final message as written, but for file links shortened from the worktree's absolute path to the repository's relative one.

## Reports

### Codex

**One minor test issue; no serious runtime defects found** in `84be2b0..7bb47fc`.

- **P3 — The rewritten coplanarity check exercises no faces.** At [src/model/core/vaux-fronts.test.ts:249](src/model/core/vaux-fronts.test.ts:249), all six selected bricks take `continue`: their tops are approximately 4.81, 8.11 or 9.91 m, below the 9.910001 m threshold. Moving their Z faces onto the listed planes without changing their heights would therefore escape this check. The final assertion counting six bricks does not detect the empty coverage. **Fix:** remove this obsolete drop-related subcheck and narrow the test’s description; if final-state setbacks remain a requirement, check the relevant final faces explicitly and assert a nonzero checked count.

I checked the following and found them sound:

- **Model preservation:** an independent, in-memory comparison against milestone A matched builder pieces in insertion order, geometry attributes and user data, serialized materials, mesh names and shadow flags, per-mesh matrix/tag sets, and serialized lights. Counts matched: **163 steps, 27,290 pieces, 744 meshes, 1,610,563 triangles, three lights**. Instance ordering was treated as an intentional change.
- **Instance consumers:** traced batching, tags, resting-piece mapping, door stand-ins and doorways, picking, cap proxies, floor filtering and collision numbering. I found no remaining dependency on arrival order. Door stand-ins retain their separate bounds covering the swing.
- **Walk and doors:** five independently executed scenarios matched A exactly: fresh placement at closed, open, locked and jamb positions, and re-entry after a door closed onto the former position. Feet remained on the floor and clear of leaves. Initialization still sets doors before capture placement; the performance marks retain their order.
- **Removal and coverage:** found no remaining runtime instance-colour references or build-position evaluation path. The collection’s replacement ownership checks remain independent of tags. Other reviewed test removals correspond to retired animation behavior.
- **Documentation:** the requested current contracts describe the static engine; historical replay references are identified as historical. I also read unchanged consumers, including `src/viewer/art-pieces.ts` and `src/viewer/section-cut.ts`.

**Validation limits:** typecheck and lint passed. The targeted Vitest run executed **zero tests** because the read-only sandbox denied creation of its temporary `ssr` directory. I did not run full verification, browser tests, shots or sweeps, so pixel equivalence—including transparent rendering after instance reordering—and browser performance remain unverified.

No files were modified; the worktree remains clean.

### Claude

**Verdict:** I found nothing serious in the engine, walk, door or page code. The static build, the walk's checks of a new or remembered place, and the door layer's load path all behave as milestone A's finished page did. The one real problem is a test that lost its guard on live code, together with the spec text that describes that code. The rest is low.

##### Findings

**1. Medium: the jamb and locked-door cases in `src/walk/door-settle.test.ts` no longer test `DoorWorld.release` when no pose is clear.**
- **What changed.** `setDown` now poses the door world (`world.refresh()`, :118) before it sets the walker down (`walker.place`, :120). `Walker.place` pushes the body out of everything the world holds (walker.ts:142), and `DoorWorld.resolveCapsule` includes posed leaves (door-world.ts:112-116). So the walker can be clear of the closed leaf before `release` runs (:122).
- **What was lost.** The old test placed the walker while the door's step was incomplete, so the door was out of the world. `release` then met a leaf in every pose, opened the door away and pushed the walker out, and the test asserted "open a quarter turn" (90°). The rewrite dropped that assertion (:126-131). It keeps only "gap > −2 mm" and "feet on the floor", which hold whether or not the door opens. The locked case (:133-140) also passes through `place` alone.
- **Failure scenario.** Change door-world.ts:160 to `const angle = clear ?? 0`, so a door with no clear pose stays shut. Or make `release` skip locked doors. Either change would pass the suite: `release` is called in no other test.
- **Doc mismatch.** The branch is live (walk-mode.ts:357). spec.md:155 (Doors: State) still promises "with no pose clear (the walker by a jamb …) it opens away". On the page, a walker set down by a jamb is now pushed out by `place` and the door stays shut, because walk-mode.ts:330-336 also calls `refresh()` before placing.
- **Fix.** In `setDown`, set the walker down before `world.refresh()`: door bodies start unposed (door-world.ts:101). Alternatively place it with `walker.restore`. Then run refresh, `settle(0)`, `release` and `standClear`, as the old test did. Restore the 90°-away assertion, and for the locked door assert 0° with the walker outside the leaf. Prove both red with the two changes above. If the branch is now meant to be defensive only, reword spec.md:155 to match.

**2. Low: the fingerprint behind "the finished model is unchanged" can't see instance order, which B changed.**
- **What changed.** Slots are now in the order pieces were added (batch.ts:37-56, timeline.ts:152-162); before, they were in arrival order. Every step that had a spatial stagger now stores its instances in a different order. Examples: the 2023 skylight glass (later.ts:56, was `stagger: 'z'`) and the plaza groves (`'x'`).
- **Why the fingerprint missed it.** A fingerprint that compared instances in slot order could not have matched A's. The one the author recorded must therefore compare them as a set.
- **Where order still matters.**
  - Overlapping transparent instances in one mesh blend in draw order. All glass is `depthWrite: false` (palette.ts:43-58), so differently lit panes now blend in a different order.
  - The collision world numbers instances in this order (collision.ts:176-199), so it can tip an ambiguous push one way or the other.
- **Evidence gap.** The evidence for unchanged pixels and walks is B's still-open plan criterion: standard shots within noise, `npm run verify` and e2e. Commit 8053ce6 lists all three as "Not checked yet".
- **Fix.** Run them through `gate.sh` before landing. Until the shots agree, have the devlog say "content unchanged" rather than "model unchanged".

**3. Low: half of `src/viewer/floor-view.test.ts:138-149` is now near-vacuous.**
- It compares the meshes a floor view hides on a second, identical `new Timeline(SEQUENCE)` with the first. Two deterministic builds can't differ, and the property the test was written for (hiding independent of the build position) no longer exists.
- Only the snapshot check (:140, :152) still guards anything.
- Fix: retitle the test "writes only layer masks", keep the snapshot check and drop the comparison.

**4. Low: the culling test doesn't read what culling reads.**
- timeline.test.ts:127-136 ("for culling") checks only `mesh.boundingBox`. Three.js's frustum culling and the picker read `boundingSphere`, which B changed by removing the pad (batch.ts:77-80).
- No test reads a timeline mesh's sphere; doors.test.ts:245 checks only the door stand-ins'.
- Fix: also assert that every corner of each piece's box lies inside `mesh.boundingSphere`.

**5. Nits**
- `Campaign.outward` (src/model/mmw/steps-fronts.ts:23, 45, 65) is dead. It only fed `stagger: c.outward`.
- The title at doors.test.ts:195 says `doors=open` arrives "over a swing otherwise". The page always takes it at once (main.ts:255, `sync(0, true)`), with or without `shot=1`, as it did before B.

##### Checked and sound
- **Timeline and batching.**
  - Each mesh's `count` equals its instance count, and every mesh is visible.
  - Nothing in `src/` writes or reads `instanceColor`. The two custom shaders (collection/material.ts:140-150, environment.ts:95-112) use their own varyings, not `vColor`.
  - No shader displaces vertices, so bounds from the pieces' boxes are exact.
  - The door stand-ins keep bounds over every pose (doors.ts:354-367), and the cap pass's stand-ins share their source's sphere (cap-pass.ts:75).
- **Code that reads slot order.**
  - `slotMatrices` (doors.ts:437-442) needs `restingPieces` order to match slot order. It does: both are add order.
  - The doorways and the floor view use unions and matrices; the artwork pieces work by tag.
  - On the page, `settle(from)` only ever receives 0 or the world's instance count.
- **Walk mode.**
  - At t = N, the old `settle(0)` and `settle(settledFor)` reduce exactly to the new `settle(0)` and `settle(instances)`.
  - This holds for a spawn, a `spawn=` place, re-entry and `prepareNow`, with `refresh()` before `place` as before.
  - The `visible && count > 0` filter that `collisionMeshes` dropped excluded nothing on the finished page.
  - Leaves stay out of `groundBelow` and `crossings`, so nothing lifts a walker onto a leaf.
- **Doors.**
  - Hiding the closed leaves at construction plus the boot `sync(0, true)` gives A's first frame.
  - `drawn()` is unchanged, and so is the order of the `met:doors-set` and `met:walk-placed` marks (main.ts:255-264).
  - Locked doors are skipped (doors.ts:185).
  - The new re-entry test does reach `release`.
- **Model diff.** I read all 77 builder diffs.
  - Removed arguments with other uses were kept: the grove-tree shape counter and the seeded-random call order (plaza.ts), `wingTrim`'s cache key `x0` (entablature.ts), `cloths[i % 2]`, `ROCKS[k % …]`, and place.ts's index into pieces.
  - No light, material, `userData`, cache key or geometry name changed.
  - Nothing else read `PlacedBay.index`.
- **Docs.** The spec, AGENTS.md, README, local-rules, gate-proofs and the devlog no longer describe `t`, motion, stagger, arrival or the door lifecycle as current; the remaining mentions are explicitly historical. The one exception is spec.md:155 (finding 1).
- **Tests.**
  - The new oracle in artwork-tags (geometry plus matrix, independent of the tag) is sound, and placement's binding by tag is cross-checked by it.
  - Both "timeline's meshes byte for byte" door tests still catch changes.
  - layout.spec's new `built` check would fail on A.

##### Could not check
- I ran nothing: no unit tests, e2e, shots or mutations. The brief was read-only, local-rules routes these gates through `gate.sh`, and the shell stopped responding partway through. Finding 1's surviving mutation comes from reading the code, not from a run.
- The author's fingerprint script isn't in the repo, so its insensitivity to instance order is an inference.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Codex: the rewritten check that the east front's brick keeps its faces out of the wall's planes where it stands over the opening checks nothing, since no brick round a corridor stands over its opening's top in the finished model. | Accepted: the check only had a subject while the brick dropped through the wall. | `src/model/core/vaux-fronts.test.ts`: the subcheck, its title's clause and its two constants removed, its header saying why. |
| F1 | Claude, medium: the door-settle test's jamb and locked cases no longer reach `DoorWorld.release` where no pose is clear, since walk mode stands the doors before it sets the walker down and `place` then pushes the walker out; spec.md's Doors: State still promises that branch. | Accepted. The branch is live (re-entry where a door's leaves came into the walker), and its tests went with the build's step completing. | `src/walk/door-settle.test.ts`: the page's path kept (set down by a jamb, the walker stands clear and the door stays shut; set down at a locked door, clear of its leaves), and the door world's release tested where the leaves come into a walker already in place: a quarter turn away at a jamb, the walker pushed out, and a locked door shut with the walker pushed out. Red with a door that has no pose clear left shut (0°) and with `release` passing over locked doors (the leaves 0.35 m inside the body). spec.md's Doors: State says when the branch is reached and that a walker set down by a jamb stands clear with the door shut; its Verification entry and `docs/learning/gate-proofs.md` name the new reds. |
| F2 | Claude, low: the fingerprint compares a mesh's instances as a set, so it cannot see their order, which B changed (now add order, before arrival order); the order matters where transparent instances overlap and where the walk's collision breaks a tie; the shots, verify and e2e were still unchecked at the reviewed commit. | Accepted. The order change is intended (there is no arrival order any more). | The standard shots, verify and e2e ran on `7bb47fc` (Verification); the devlog says the content is unchanged, the order is new and what that did to the shots. |
| F3 | Claude, low: half of `src/viewer/floor-view.test.ts`'s last test compares two identical builds. | Accepted. | The comparison removed; the test now says the floor view writes nothing of the timeline but layer masks, its meshes byte for byte as before after every floor's cut and a sweep of cuts. |
| F4 | Claude, low: the culling test reads `boundingBox`, but three.js's culling and the picker read `boundingSphere`, which B changed (no pad). | Accepted. | `src/build/timeline.test.ts`: every corner of each piece's box in its mesh's sphere; red with the sphere's radius at 0.9 of itself. |
| F5 | Claude, nit: `Campaign.outward` in `src/model/mmw/steps-fronts.ts` is dead; it only fed the stagger. | Accepted. | Removed; the model's fingerprint unchanged. |
| F6 | Claude, nit: `src/viewer/doors.test.ts`'s title says `doors=open` arrives over a swing otherwise, though the page always takes it at once. | Accepted. | The title says the layer heads open, is there at once with an instant sync, as the page's first sync is, or over a swing with time. |

No repair changes the page's behaviour: they are tests, wording and one dead field. So no lane re-reviews them, as the runbook allows; each new or changed check was proved red as above.

## Verification

On `7bb47fc`: `npm run verify` through `tmp/gate.sh`: 718 unit tests in 84 files, typecheck, lint and build passed; the e2e suite passed 92 of 93, the one failure `tests/e2e/doors.spec.ts:359` with a swing frame of 42.6 ms of work against 16.7 ms while both review lanes and other sessions loaded the machine; that test alone, three runs, passed every time, its slowest swing frame 3.1 to 10.9 ms. The standard shots (`npm run shots`, through the gate): of 52, 21 differ from milestone A's in 1 to 13 lone pixels each (at most 0.0009%), by at most 26 of 255, on edges where faces tie in depth and the new instance order draws another first, the crops alike at 5x; the other 31 within 8 of 255. A fingerprint of the finished model (every mesh's name, geometry, material and shadow flags, the set of its instances' matrices and tags, every light) matched milestone A's on `2859169`, on `8053ce6` and with the repairs.

With the repairs: typecheck and lint clean; the five changed test files pass (35 tests); the reds named in the table. The whole gate runs again on the tree that lands.

## Round outcome

Neither lane found a serious defect in the engine, walk, door or page code. All seven findings are accepted and repaired in tests, wording and one dead field; none is open.
