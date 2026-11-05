# Review 1: implementation

## Target

The met repository, branch `claude/optimistic-mayer-d1fe0b`, commit `9901b5d` ("Answer review 0 of work unit 18: ..."): the diff `77b0c87..9901b5d`, the repairs of review 0's F1 to F7, 9 files (`src/model/doors.test.ts`, `tests/e2e/doors.spec.ts`, `scripts/capture.ts`, comments in `src/model/core/weston-facade.ts` and `materials.ts`, `docs/design/spec.md`, `docs/research/interior.md`, `docs/learning/gate-proofs.md` and review 0's record). The reviewers read the worktree at `d7272a3`, the merge of `9901b5d` with origin's main at `8a892d1`, which brought in work unit 16 (the Medieval Sculpture Hall's end windows), not under review.

## Reviewers and coverage

Both reviewers ran read-only on 2026-11-04 with the same prompt, from `../fleet/tmp/review-runs/met-u18-r1/` (ignored, where the raw captures stay): the repairs, each with its disposition, a request to report new defects only, and, since this unit's gates were running on the machine, to run no test suite, browser, build or heavy probe. The diff came on stdin. The worktree's `git status` and `git diff HEAD`, saved before both lanes ran and read again after, show no change by either.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. The runbook's check of its log kept the lane: no command failed to start. It ran no test, build or probe; two of its citations outside the diff, checked: `src/viewer/door-swing.ts:11` (`SWING_SECONDS`, 0.7) and `src/model/core/vaux-east.ts:46` (the gallery 600 doorway's lining).
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, the same tools and limits as in review 0. The runbook's lane rule passed. 63 tool calls (30 Grep, 21 Read, 10 Bash, 2 Glob), none naming the run folder or fleet's tree; it read the unit's logs in the worktree's ignored `tmp/` against the records' numbers, and ran only git and reads.

## Reports

Each report as its reviewer wrote it, but for file links made relative to the repository and the reports' own headings set under this record's.

### Codex (`gpt-6-astra`)

Approve — no new findings in `9901b5d`’s repairs, reviewed at `d7272a3`.

**Checked and sound**

- `src/model/doors.test.ts:126–146`: the physics checks cannot pass with zero steps. Each step drains `takeChange()`, and `set(id, 0)` is checked separately. The 0.7-second swing completes within the loop’s bound. Each door finishes closed with no pending change; later tests construct their own layers.
- `tests/e2e/doors.spec.ts:475–483`: the porch position matches the existing return walk. Geometry places it approximately at X −49.99, with about 0.31 m clearance beyond the conservative swing boundary and both door poses within reach.
- `tests/e2e/doors.spec.ts:222–251`: navigation reinstalls the timing wrapper with a fresh log. The added swings use the entrance’s timing helper, require more than 20 samples, enforce the same 16.7 ms limit, and check the resulting angles. The header accurately limits walking-frame coverage to the entrance.
- The capture target agrees with the frame calculation: −49.7 − (2.13 + 0.08 − 0.25) = −51.66. The updated references resolve correctly. The dated proof record’s stopping positions and rounded 14.5 m distance agree with the door geometry and changed routes. The trailing blank line is removed.

**Read outside the diff**

- `src/viewer/doors.ts:215–321,396–441,469–471`: transitions, pending changes and state reporting.
- `src/viewer/door-swing.ts:10–11`; `src/main.ts:338–348,383–410`: duration, initialization and shadow invalidation.
- `src/walk/door-world.ts:128–175`: physics advancement and immediate placement.
- `tests/e2e/route-places.ts:31–165`: spawn checks, geometry, clearance and reach.
- `tests/e2e/route-walk.ts:74–136,163–196`; `tests/e2e/helpers.ts:13–35`: input, state waits and navigation.
- `tests/e2e/routes.spec.ts:287–342`: both Weston walks.
- `src/model/lib/window.ts:60–73,328–405`; `src/model/core/weston-porch.ts:40–98`: dimensions and hinges.
- `src/model/core/vaux-east.ts:46–57`: gallery 600’s lining.

Read-only review: no edits, tests, builds, browsers or probes. Worker-reported timings and gate results were not independently rerun.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: approve with findings.** I found five nits and nothing at blocker, major or minor level. Each repair does what its disposition says, and the new test steps are sound. The most useful finding: the records say the porch place times both swings facing out, but its closing swing faces across the porch.

##### Findings

###### 1. The porch's closing swing is timed facing across the porch, not out (nit)
- **Where:** [doors.spec.ts:475-480](tests/e2e/doors.spec.ts:475), and the same wording at `:18`, `:459`, [spec.md:265](docs/design/spec.md:265), `:273`, and the F2 disposition at [0_implementation.md:136](docs/work/18_weston-leaves/reviews/0_implementation.md:136).
- **What is wrong:** The test aims at `leafPoint(door, 'open', 'back', 0.9)` from routes.spec's place. That is about 84° off the outward axis, not "facing out at the open leaf".
- **Evidence (arithmetic from the code; no probe run):**
  - The door unit uses the defaults (frame 0.08, depth 0.12, leaves 0.07 thick; [window.ts:349-376](src/model/lib/window.ts:349), [weston-facade.ts:181](src/model/core/weston-facade.ts:181)). So the hinges stand ±1.561 m across, the back face at X −51.565, and the leaf width is 1.561 m.
  - `useStretch` gives near = 1.35 (clear of the sweep by 0.15 m, with radius 0.35 and reach 1.5595) and far = 2.38, so d = (1.35 + min(2.38, 1.8)) / 2 = 1.575. The eye is at X −49.99 on the axis.
  - The aim point is (X −50.16, Z −105.16): 1.51 m across and only 0.17 m out.
  - `WALK_FOV` is 60° ([walk-mode.ts:35](src/walk/walk-mode.ts:35)) at 1280×720 ([playwright.config.ts:25](playwright.config.ts:25)), so the view spans 37.8° to 129.3° off the outward axis.
  - The court through the doorway is only below 40.6° (the architrave's edge, 1.645 m across and 1.92 m out). That is at most a strip about 60 px wide at the view's edge, and the closing leaf covers it straight away.
  - The view is the porch's reveal, the leaf, and gallery 529 through the 1888 wall. For comparison, the entrance's bay place, which this copies, faces its leaf 29° off the outward axis ([doors.spec.ts:448](tests/e2e/doors.spec.ts:448)).
- **Impact:** Small. The opening swing (`:481-483`) does face out, through the same poses. The shadow pass does not depend on the view ([environment.ts:145-155](src/viewer/environment.ts:145)). Only the wording is wrong.
- **Repair:** Reword it, e.g. "closed facing across the porch at the open leaf, then opened facing out". Or aim the closing at `leafPoint(door, 'open', 'back', 0.4)`: 1.79 m off (inside `LOOK`), 58° off the axis, so the court stays in view while the leaves close.

###### 2. Two different "F1"s next to each other, and the spec's list misses the walk check (nit)
- **Where:** [doors.test.ts:7-8](src/model/doors.test.ts:7) and [spec.md:273](docs/design/spec.md:273).
- **What is wrong:**
  - The header's new "review 0, F1" means work unit 18's review. The "(F1)" in the very next clause means work unit 2's ([0_plan.md:48](docs/work/2_doors-and-collection/reviews/0_plan.md:48); the test title at `:150`). A reader following the second one to unit 18's record finds the wrong finding.
  - The spec's Verification list still describes `doors.test.ts` as "one at every frame of Weston's". It leaves out the walk's physics steps and the `set` check that F1 added.
- **Repair:** Write "work unit 18, review 0, F1" and "work unit 2, review 0, F1". Add "and at every physics step of the walk and when set at once" to spec.md:273.

###### 3. A reference the F3 rename missed (nit, older than this unit)
- **Where:** [hunt/materials.ts:64](src/model/hunt/materials.ts:64).
- **What is wrong:** It cites "Doors: The layer" for the 1,285 vs 654 draw calls and the "15 of 255" figure. Those numbers live in "The leaves' shadows" ([spec.md:180](docs/design/spec.md:180)), not in The layer (`:179`). It has been stale since M2b (`7b054d7`) split that item out. F3's disposition (`0_implementation.md:137`) says the references were updated, but its search only looked for the old title.
- **Repair:** Change it to "Doors: The leaves' shadows".

###### 4. F5's report to work unit 15 misses a third stale pointer (nit, outside this unit)
- **Where:** [hunt/stair.ts:169](src/model/hunt/stair.ts:169).
- **What is wrong:** It still points to `src/model/core/vaux-shell.ts` for the core's granite lining. Work unit 15 (`2238385`) moved that to [vaux-east.ts:46-57](src/model/core/vaux-east.ts:46), and vaux-shell.ts no longer has it. The disposition (`0_implementation.md:139`) reports only `frame.ts:99`.
- **Repair:** Add stair.ts:169 to that report.

###### 5. The porch place is copied, not shared (nit)
- **Where:** [doors.spec.ts:476-477](tests/e2e/doors.spec.ts:476).
- **What is wrong:** It repeats [routes.spec.ts:323-324](tests/e2e/routes.spec.ts:323) with a literal 0.9 in place of `OPEN_SHARE` ([routes.spec.ts:66](tests/e2e/routes.spec.ts:66)). The comment "where ./routes.spec.ts uses it" stays true only while the two copies agree, and nothing would flag a change.
- **Repair:** Put one helper in `route-places.ts` and use it from both specs.

##### Checked and sound

- **F1, the walk-path check:**
  - Each physics step's `takeChange` is read on its own, so the "shadows" value that `note` keeps until read cannot hide a step. The `takeChange()` at `:135` clears anything left over before the walk part starts.
  - The counts fit: about 84 steps at 1/120 s for a 0.7 s swing (`door-swing.ts:11`), with a cap of 100 and an expected minimum of 60.
  - It is not vacuous. A door that never moves gives "none" and fails; a swing that jumps to its end fails the step count.
  - It would go red both ways: with `note` reporting "moved", Weston's steps fail; with it reporting "shadows", the entrance's steps fail.
  - This matches the page: `sync` gets 0 s while walking (`main.ts:393`), `takeChange` marks the shadows dirty (`main.ts:406-409`), and `door-world.ts:139` and `:162` call `advance` and `set`.
  - Nothing leaks: the shared layer ends with both doors closed and nothing pending, and every later test builds its own `DoorLayer`.
- **F2, the porch place:**
  - It is the same place as routes.spec's, and that test passed in `verify18-repairs.log`.
  - From it, the body is 0.31 m clear of the swing, the open leaf is 1.50 m off and the closed doorway 1.575 m off, both inside the 2 m reach.
  - It loads a fresh page (`helpers.ts:29`). `addInitScript` re-arms the frame timer on that page, and the same `timeSwing` times it as the entrance's are.
  - No run shows the porch's swings red. But the recorded plant (extra work on every shadow redraw) adds the same cost whatever the view, so they would go red too. The entrance's bay place has the same status (`gate-proofs.md:116`, `:124`).
  - The test ran in 6.5 to 8.1 s against its 40 s timeout.
- **F3 to F7:**
  - No "No shadow from the leaves" is left outside the review record, and the section map lists the items in their order (spec.md:175-185).
  - The new shot target is right: X −51.66 = B_SOUTH_X − DOOR_FRAME_OUT, and Z −103.65 is the door's middle.
  - The vaux-east.ts pointer is right.
  - The committed file ends in a single `});\n`. The CRLF endings in the worktree come from `core.autocrlf`.
- **The records' numbers against the logs in `tmp/`:**
  - `f6-a.log` gives (−51.98, 5.71, −103.61) and (−51.22, …). `f6-b.log` gives X −37.10, which is 14.535 m past the leaves' face at 51.635.
  - `f2.log` gives 9.7, 7.1, 7.4 and 7.4 ms.
  - `verify-5.log` gives 81 files, 733 unit tests and 126 e2e in 10.5 min. `verify18-repairs.log` gives 82, 735 and 126 in 10.3 min, with Weston's slowest frame at 10.00 ms.
  - Each routes run at 1× shows 14 passed. The two void 4× runs failed where the record says (4 failed, then 1 failed). The third 4× run passed 12 with 2 skipped.
- `doors.spec.ts` is 486 lines, so the 500-line cap leaves 14 lines of room.

##### Read outside the diff

- **Door layer and page:** `src/viewer/doors.ts` (whole), `src/main.ts:376-415`, `src/walk/door-world.ts` (46, 134-162), `src/viewer/door-swing.ts:11`, `src/viewer/viewer.ts:30-110`, `src/viewer/environment.ts:125-169`, `src/walk/walker.ts:47`, `src/walk/look.ts:17`, `src/walk/walk-mode.ts:35`.
- **Model:** `src/model/lib/window.ts:300-407`, `src/model/core/weston-facade.ts:1-120` and `170-200`, `weston-porch.ts:40` and `91`, `constants.ts:10-30`, `vaux-east.ts:1-70`, `vaux-shell.ts` (searched), `src/model/frame.ts:99`, `src/model/hunt/stair.ts:160-173`, `src/model/hunt/materials.ts:55-67`.
- **Tests:** `tests/e2e/route-places.ts` (whole), `tests/e2e/route-walk.ts` (`record`, `still`, `face`, `doorIs`, `looksAt`, `toward`), `tests/e2e/routes.spec.ts:1-70`, `130-189` and `280-349`, `tests/e2e/helpers.ts:28-32`, `playwright.config.ts`.
- **Records:** `docs/design/spec.md:174-185`, `docs/learning/gate-proofs.md:55-124`, `docs/work/2_doors-and-collection/reviews/0_plan.md:48`, this unit's `plan.md`, and the `tmp/` logs named above.

I edited nothing and ran only git commands and small reads.

## Findings and disposition

Codex found nothing new; the IDs are Claude's, numbered on from review 0's.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F8 | Inside the porch, the timed closing swing looks across the porch at the open leaf, about 84° off the way out, where the records say both swings there face out (nit) | Accepted, as wording: the opening swing faces out through the same poses, and the shadow pass's cost does not depend on the view | The test's title, header and comment, and the spec's budget paragraph and checks, say it closes looking across the porch and opens facing out. Review 0's record keeps F2's disposition as written then; this row corrects it |
| F9 | `doors.test.ts` names two different "F1"s side by side, and the spec's checks leave out the walk's steps and `set` (nit) | Accepted | The header says "work unit 18, review 0, F1" and "work unit 2, review 0, F1"; the spec's checks give the shadow pass at every frame of Weston's swing as the orbit view swings it, at every physics step of the walk and when set at once |
| F10 | `src/model/hunt/materials.ts:64` cites "Doors: The layer" for the numbers in "The leaves' shadows", stale since work unit 2's M2b (nit) | Accepted: F3 was to bring every reference to that item into line | It cites "Doors: The leaves' shadows" |
| F11 | `src/model/hunt/stair.ts:169` also points to `vaux-shell.ts` for the core's granite lining, which work unit 15 moved to `vaux-east.ts` (nit, outside this unit) | Accepted as a report, not changed: work unit 15's | Reported with `src/model/frame.ts:99` as a follow-up for work unit 15's change |
| F12 | The place inside the porch copies `routes.spec.ts`'s with a literal 0.9 in place of its `OPEN_SHARE`, so the comment's "where ./routes.spec.ts uses it" holds only while the two agree (nit) | Accepted in part: the comment now describes the place by itself (the stretch `useStretch` finds, 0.9 of the leaf's width out) and no longer claims the other spec's place. A helper shared by both specs is not made: it would change `routes.spec.ts`, whose three runs at 1× and at 4× have passed, for two lines | None further |

## Verification

On `d7272a3`, the merge of `9901b5d` with main at `8a892d1`, through `tmp/gate.sh`: `npm run verify` (82 files, 735 unit tests; typecheck; lint; build; 126 e2e in 10.0 min, Weston's swing at most 8.6 ms of work); `routes.spec.ts` three runs in a row at 1× (14 tests passed each, 1.7 min) and three in a row at 4× (12 passed and the two frame budgets skipped, 2.1 min each); and `npm run shots` (64 images, GPU RTX 4090 through ANGLE D3D11; the model 27,345 pieces, 745 meshes, 1,602,643 triangles at t = N), compared image by image with main's set at `59451af` (clean; work unit 16's landing). 60 of 64 are within 9 of 255 in every channel. The 4 others differ only at Weston's door: `doors-weston`, aimed at the leaves now (F4), whole; and `floor-main`, `floor-main-top` and `floor-main-aerial-ne` in 58, 19 and 33 pixels at the doorway, where the old leaves' cut in the 1888 wall gives way to the shade the closed leaves now cast on the porch's floor behind them. Each was read at native size, `doors-weston` whole and the others as crops of their changed regions before and after. From the third run at 1× on, the routes runs and the shots ran with this round's repairs, but for F10's comment, uncommitted in the tree (the shots' log says dirty); none of them touches a render or a test's steps.

On the repairs, the working tree of the next commit: `npm run verify` through `tmp/gate.sh` (82 files, 735 unit tests; typecheck; lint; build; 126 e2e in 10.6 min, Weston's swing at most 8.5 ms of work).

## Round outcome

Codex approves with no new findings; Claude approves with five nits, none blocker, major or minor. All five are accepted, F11 as a report to work unit 15's owner and F12 in part, and repaired in the next commit. The repairs change wording and comments only, so no further review round is held.
