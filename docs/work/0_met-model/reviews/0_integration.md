# Review 0: integration

## Target

Repository `met` (this repository): the whole codebase at the integrated revision `ad6f16f4b309d64ef61d58e9cb6af274b39485f3` ("Index the McKim, Mead & White photos and record the fronts' measured heights", main, 2026-10-13 22:59 -0700). Recover it with `git show ad6f16f:<path>` or `git checkout ad6f16f`.

Scope: every tracked file at that revision, judged against `AGENTS.md`, `docs/design/spec.md`, `docs/policies/local-rules.md` and `docs/work/0_met-model/plan.md` as they stood at `ad6f16f`.

Main moved to `b5a5e45` (2026-10-14 10:00) while the Claude review ran. That commit changes only `docs/work/0_met-model/plan.md` (1 file, 9 insertions, 6 deletions), so the code is the same at both revisions. The Codex review finished before it and shows `ad6f16f` as HEAD each of the three times it checked.

## Reviewers and coverage

Both reviewers ran the same prompt on the whole tree, read-only, from the repository's working directory. The prompt files are in ignored `tmp/review-runs/`; the Codex copy adds one line, to run subagents one at a time with no model of their own. The prompt told them to read `AGENTS.md`, the spec, the local rules and the plan first, and gave five lenses in priority order:

1. Engine correctness: the timeline as a pure function of t, the player, batching, lights, the section cut, the follow camera, the query contract and `window.__shotReady`, the UI controls and keyboard shortcuts.
2. Tests: whether each proves what its header claims, including tests that cannot tell passed from did-not-run, tests built from the symbol they check, unstated bounds and checks weaker than the contract.
3. The build-step contract across the six area modules and `src/build/sequence.ts`: every visible part arrives through a step, chapter composition and order, areas inside their blocks under the boundary rules, shared geometry and materials reused, budgets.
4. Runtime safety and robustness: no network fetches or env reads at runtime, error messages that say what happened and what would fix it, resource disposal, extreme inputs (N = 0, t outside [0, N], unknown preset or step ids, tiny or huge viewports).
5. Docs that disagree with the code: the Gates in `AGENTS.md`, the spec, file headers.

It asked for numbered findings, most severe first, each with file and line, the defect, a concrete failure scenario and a suggested fix, and for at least three cited file-and-line reads (one outside `src/build/`) even if nothing was found. Each reviewer sized its own delegation.

**Codex**

- Codex CLI 0.158.0, model `gpt-6-astra`, reasoning effort `xhigh`, sandbox `read-only`, approval `never`, as printed in its run log. A smoke test before the run made it read `AGENTS.md` and return its first line.
- It ran 35 PowerShell commands: file reads and searches, `tsc --noEmit`, and seven Node probe scripts of its own (timeline determinism, player, camera rig, capture paths, window and grille geometry, geometry construction timing) through an in-memory TypeScript loader. 229,189 tokens.
- Its probes found no path-dependence mismatch across 100 checkpoints each for the engine fixture and the real sequence, and both returned to an empty state at t = 0.
- It ran no unit or e2e suite (it said the build and browser suites write files, which its instructions prohibit), no browser, no capture command and no photographic comparison, and it did not remeasure footprint coordinates.
- One subagent spawn failed (`collab spawn failed ... no rollout found for thread id`, log line 860) and it said it would cover that scope directly. The numbers behind F3, F4 and F5 come from its own probe commands. The log also holds three `collab: Wait` entries and no subagent output, and it shows no subagent model, so a subagent run cannot be ruled out entirely.
- The runbook's checks pass: its log has no `STATUS_DLL_INIT_FAILED` or `-1073741502` and no policy block. Its last commands show HEAD at `ad6f16f` and an empty `git status --porcelain`.

**Claude**

- Claude Code 2.1.281, model `claude-opus-5-5[1m]`, `--effort max`; its init event shows permission mode `auto`. A smoke test before the run returned the first line of `AGENTS.md`. The final result's `modelUsage` holds exactly one key, `claude-opus-5-5[1m]`, as the runbook requires, and its subagent statistics show none spawned. 79 turns, 2,278,931 ms (about 38 minutes), no permission denial.
- The coordinator launched it with allowed tools `Read,Glob,Grep,Task,Bash(git diff/log/show)` (the runbook's full-codebase command; the flags are not in the retained logs). All 78 of its tool calls were Bash, including `cat`, `grep`, `node` and `npx vitest`, so that list did not confine it to git commands. Its read-only status rests on the audit of the tree afterwards.
- It read the whole tree and ran the unit suite from a config in its scratchpad, with its caches kept there. Its first full run (the cache was new) returned one failing test of 256 and it did not capture which; every later full-run summary in its log reads 256 passed. It also ran Vitest probe files from the scratchpad and, for F9, its own Vite dev server on 127.0.0.1:5397 with headless Chrome through playwright-core.
- It did not run the repo's e2e suite (its report: it writes `test-results/` into the repo while another session was active) and made no photographic comparison.
- Independence: its command 74 of 78 showed the plan diff of `b5a5e45`, which says Codex found eight issues and names F1 ("`shots --solo` path can empty the repo root"). Its next note says it would trace that path itself, and its report says "This matches Codex F1 in the plan; I confirmed it on my own." Nothing earlier in its retained log mentions that defect, and no command read Codex's report. The plan did not name F5, so F5 was reached independently.

**Coordinator acceptance pass.** Not an independent review. The coordinator ran the standard shots and a seeded sweep (seed 2026) on `ad6f16f` and inspected them (plan, `b5a5e45`). It found A1.

**Tree audit.** The coordinator found `git status` clean after both runs, and it was clean again when this record was written. Per the runbook that is not a content audit for files already modified; here the tree was clean before and after, and ignored paths are not covered.

**Missing coverage.** No reviewer compared the model with the reference photographs, and neither ran the e2e suite. Only the coordinator's acceptance pass looked at renders, and it found the one defect the code reviews passed (A1). There was no abstention: each lane read the code and returned a report.

## Reports

Each report is quoted whole, line for line, with `> ` added at the start of each line so that the report's own headings stay inside this record's structure. Nothing else was changed and nothing was removed: neither file contains transport chatter. The Codex file is its `-o` final message, equal to the last message in its run log. The Claude file is equal to the `result` field of the final `result` event of its stream. Raw captures stay in ignored `tmp/review-runs/`. The Codex report keeps its absolute local file links as written.

### Codex

Source: `tmp/review-runs/codex-review.txt`, 4,271 bytes, sha256 `e409432eb81518c7fbd2ced51b9277cfd9845929da267d7d835056aa13ec920d`. Its items are numbered 1 to 8.

> 1. **[P1] Capture cleanup can target the repository itself.** [capture.ts:191](C:/Users/38909/Documents/github/met/scripts/capture.ts:191) incorporates unvalidated `--solo` into the directory passed to recursive deletion at [capture.ts:154](C:/Users/38909/Documents/github/met/scripts/capture.ts:154). With `--solo ../../..`, that directory resolves to the repository root. Validate chapter IDs and enforce resolved-path containment under `.shots` before deleting anything. Confirmed by path calculation only.
>
> 2. **[P2] Selecting a preset preserves pending camera inertia.** [camera-rig.ts:77](C:/Users/38909/Documents/github/met/src/viewer/camera-rig.ts:77) replaces the pose and calls `controls.update()` without clearing accumulated pan or rotation. Panning and immediately selecting an interior preset therefore moves the camera away from the requested view; the reproduction shifted the target from X −30 to approximately −190. Clear pending motion before applying a preset, and test drag → preset → settled pose.
>
> 3. **[P2] At least 132 core windows omit their glazing bars.** [wings-walls.ts:147](C:/Users/38909/Documents/github/met/src/model/core/wings-walls.ts:147), [weston-facade.ts:147](C:/Users/38909/Documents/github/met/src/model/core/weston-facade.ts:147), and [vaux-front.ts:110](C:/Users/38909/Documents/github/met/src/model/core/vaux-front.ts:110) add frames and glass while discarding the configured `bars` geometries. At the finished state, these windows lack their requested subdivisions. Add the bars with matching placements and arrival order, and check that each configured window role reaches the sequence.
>
> 4. **[P2] Hunt grille bars extend beyond their arches during assembly.** [shapes.ts:109](C:/Users/38909/Documents/github/met/src/model/hunt/shapes.ts:109) multiplies the clipped length by √2 although its direction vectors already have unit length. At `t=33.2`, the left entrance grille reaches Y 19.012, above the arch crown at 17.45, while positioned in front of the facade. Use `length = e - a` and add an aperture-containment check.
>
> 5. **[P2] The build-time gate excludes existing geometry construction.** The timer starts at [main.ts:55](C:/Users/38909/Documents/github/met/src/main.ts:55), after static imports have already constructed geometry—for example, [plaza.ts:268](C:/Users/38909/Documents/github/met/src/model/site/plaza.ts:268). Instrumentation found 85 of 436 used geometries constructed before this timer. Those initializers could exceed four seconds while [layout.spec.ts:85](C:/Users/38909/Documents/github/met/tests/e2e/layout.spec.ts:85) remains green. Make construction lazy within the measured build, or measure the complete initialization interval.
>
> 6. **[P2] The layout test cannot detect individual hidden controls.** [layout.spec.ts:31](C:/Users/38909/Documents/github/met/tests/e2e/layout.spec.ts:31) removes hidden elements before checking whether controls are visible and correctly positioned. For example, hiding the 2× button at the mobile viewport leaves this check green because other controls remain. Assert the required control inventory and visibility before checking geometry.
>
> 7. **[P2] An unknown parts-gallery view can produce a NaN camera.** [parts/main.ts:35](C:/Users/38909/Documents/github/met/src/parts/main.ts:35) uses `in`, accepting inherited properties such as `toString`. Opening `parts.html?part=column-corinthian&view=toString` passes undefined angles into framing and produces NaN camera coordinates instead of the documented fallback. Use an own-property check or explicit allowed-value list.
>
> 8. **[P2] Solo capture benchmarks measure the wrong scene.** [capture.ts:195](C:/Users/38909/Documents/github/met/scripts/capture.ts:195) omits the solo query when opening the benchmark page. With `--solo hunt-1902`, it benchmarks the full sequence at `t=34`, ending at `hunt-windows`, rather than the completed selected sequence ending at `great-hall-desk`. Preserve the solo query and verify the benchmark page’s selection and final position.
>
> The tree remained clean at `ad6f16f`. Typecheck and in-memory determinism probes passed. Full verification, browser rendering, and photographic comparison were not run; footprint coordinates were not independently remeasured.

### Claude

Source: `tmp/review-runs/claude-review.txt`, 9,453 bytes, sha256 `98f02bb43689352ab659586094ab7c4522e069f8f0a26bf8384499fa5e3a6dcf`. Its items are numbered 1 to 12.

> I reviewed ad6f16f and found 12 issues. The worst is a data-loss path in the capture script. Two are confirmed spec violations: the follow camera turns off on a plain click, and the 1970 desk is built in the 1902 chapter.
>
> HEAD moved to b5a5e45 during the review, but that commit only changes `plan.md`, so all the code I reviewed is unchanged. I modified no files: every probe ran from my scratchpad with its caches kept there.
>
> **Verification:** the unit suite (256 tests) passed in 15 of 16 runs; one run had one failure I couldn't capture (see #9). I did not run the e2e suite, because it writes `test-results/` into the repo and another session was active in this tree.
>
> ## Findings, most severe first
>
> 1. **`--solo` can delete the repo root.** `scripts/capture.ts:168` puts the unchecked `--solo` value into `join(OUT, 'shots-' + solo)` (`:191`), and `capture()` runs `rmSync(dir, { recursive: true, force: true })` (`:154`).
>    - *Failure:* `npm run shots -- --solo ../../..` resolves to the repo root, which I confirmed with `path.join`; `--solo ../..` empties `.shots/`. The page only warns about an unknown `solo`, and the script counts only console errors as problems (`:139-142`), so the delete runs.
>    - *Fix:* check `solo` against `__met.chapters` ids before building any path, refuse to delete anything outside `OUT`, and fail the run when `__met.warnings` is not empty. This matches Codex F1 in the plan; I confirmed it on my own.
>
> 2. **The follow camera turns off on a click or tap, not only on a drag** (spec, Page: "switches off when the user drags").
>    - *Cause:* `src/viewer/camera-rig.ts:48-56` treats every OrbitControls `change` between `start` (mouse-down) and `end` as a user move. `approach()` (`:89`) moves the camera, and then `update()` (`:103-104`) calls `controls.update()`, which fires `change` for that move.
>    - *Failure:* confirmed in Chrome. On `/` during autoplay, a 150 ms press with no pointer movement gave `follow: false, view: null`. The same press while paused kept follow on.
>    - *Test gap:* `tests/e2e/menus.spec.ts:66-87` only drags, so it can't tell a drag from a click.
>    - *Fix:* run `controls.update()` inside `approach()` under a flag that the `change` handler ignores, or detect drags from pointer movement. Add an e2e test that a press without movement keeps follow on.
>
> 3. **A 1970 part is built in the 1902 chapter** (spec line 9: "each appears in the era it was built").
>    - *Where:* `great-hall-desk` (`src/model/hunt/hall-fitout.ts:104-108`, year 1970) sits in `huntSteps` (`src/model/hunt/index.ts:36`). That array is composed into `hunt-1902` (`src/build/sequence.ts:21`), and `src/model/hunt/hunt.test.ts:75` locks the order in.
>    - *Failure:* at t = 51 the label reads "Step 51 / 153 · 1970 · Hunt's Fifth Avenue front — Set the round information desk". Choosing the McKim, Mead & White chapter lands on a hall that already has Roche's desk while no 1906–1926 wing exists. The years run 1902 → 1970 → 1906.
>    - *Related:* two 1956 steps sit in the 1904–1939 chapter (`src/model/mmw/armor-court.ts:236`, `src/model/core/later.ts:65`). No gate compares a step's year with its chapter's years.
>    - *Fix:* export the desk as its own array and compose it into `roche-steps-lehman-1975` (this changes the coordinator's `sequence.ts`). Add a sequence test that each step's year falls within its chapter's years. The coordinator needs to decide whether to move the 1956 steps or widen the chapter's years.
>
> 4. **The e2e suite covers fewer controls than AGENTS.md:81 and the plan's acceptance criterion (plan:34) claim** ("drive every button").
>    - *Gaps:* `speed-1` and `speed-2` are never pressed (`tests/e2e/controls.spec.ts:92-111`). Only `top`, one interior preset and `front` of the 21 presets are pressed (`menus.spec.ts:45-64, 94`); the rest are only checked for visibility. Only one of 9 chapter items is clicked. Nothing checks that the follow camera actually frames a step. `followGoal`, `fitBox` and `resolvePreset` (`src/viewer/camera-rig.ts:126`, `src/viewer/presets.ts:91-126`) have no unit tests.
>    - *Failure:* a wrongly wired speed button, a broken preset pose, or a follow camera that never moves would all leave the gates green.
>    - *Fix:* loop over every speed and preset button; add unit tests for the camera fitting; add an e2e check that the camera moves toward the step's focus.
>
> 5. **The 4 s build-budget gate doesn't time geometry built when modules load.**
>    - *Cause:* `src/main.ts:55-58` times only `new Timeline(steps)`. `SEQUENCE` is imported at `:10`, so module-level geometry is built before the timer starts. Examples: `src/model/roche-south/kravis.ts:78-81, 95, 113`, `lehman.ts:129-206`, `rockefeller.ts:54-64`, `wallace.ts:92-100`, `src/model/mmw/armor-figures.ts:18-20`. `src/viewer/facts.ts:31` claims the number covers "every step's geometry".
>    - *Failure:* moving a heavy builder to module scope could push the real build time past 4 s while `layout.spec.ts:213-216` stays green.
>    - *Fix:* start the timer in a module imported first in `main.ts`, or build geometry lazily as `hunt` does. State the bound in the gate's header.
>
> 6. **Fit presets are not re-fitted after a resize.** The ResizeObserver (`src/main.ts:168-172`) only resizes, and the preset stays marked as current.
>    - *Failure:* measured on the real bounds: `aerial-ne` fitted at 1280×720 and then resized to portrait puts the bounds' corners at |ndc x| = 1.87, so they are cut off. A fresh fit gives 0.95.
>    - *Fix:* when `view !== null`, re-apply the preset in the callback.
>
> 7. **`?view=<unknown>` turns the follow camera off, although the warning says the parameter is ignored.** `src/main.ts:83` tests `query.view === null` instead of whether the view resolved.
>    - *Failure:* `/?view=nope` autoplays with `__met.follow === false`, while `/` has it on.
>    - *Fix:* base `follow` on the resolved view.
>
> 8. **The "final matrix at f = 1" test compares the engine with itself.** `src/build/timeline.test.ts:106` compares the timeline's build-time buffer with the buffer after a single `evaluate(N)`, during which no piece moves. It never compares against the matrices given to `kit.add`. The batching test (`:136`) checks only instance counts.
>    - *Failure:* a slot or mesh mix-up in a step with several meshes (for example, pieces written into the mesh of a different material with the same count) passes every timeline test.
>    - *Fix:* at t = N, and again after a history, compare each mesh's instance matrices with the `kit.add` matrices of that mesh's geometry and material.
>
> 9. **One unit test takes most of Vitest's 5 s default timeout.** `src/build/motion.test.ts:126` makes about 1 million `expect()` calls in a nested loop and took 2.3–2.8 s on an idle 32-core machine.
>    - *Failure:* one of my 16 full runs had one failed test that 15 reruns, including three run in parallel, never reproduced. That run happened while another session was busy in this tree. I didn't capture which test failed, so blaming this one is an inference.
>    - *Fix:* check the sorted keys in one pass, or collect violations and assert once.
>
> 10. **Only `mmw` checks that its exported step arrays are actually in the sequence** (`src/model/mmw/mmw.test.ts:100`). Its comment records that this exact defect happened once. `src/build/sequence.test.ts:52` only checks chapter fields.
>     - *Failure:* a new array exported by another area but never composed leaves its parts out of the build, with every gate green.
>     - *Fix:* in `sequence.test.ts`, check that every exported step array of every area appears in `COMPOSITION`.
>
> 11. **Chapter summaries only appear as hover tooltips** (`src/ui/menus.ts:57-66`). The spec (line 79) says the menu shows each chapter "with their years and summary".
>     - *Failure:* on a touch screen (the 390×844 layout) the summary can never be seen.
>     - *Fix:* show it as text in each item, or change the spec.
>
> 12. **A renderer failure is reported as a model failure.** `src/main.ts:26-36` titles every boot error "The model could not be built", including a failed `new WebGLRenderer` (`src/viewer/viewer.ts:38`).
>     - *Failure:* a browser without WebGL2 shows "The model could not be built. Error creating WebGL context." with no fix named.
>     - *Fix:* catch renderer creation separately and say WebGL 2 is required and how to get it.
>
> ## Checked with no finding
>
> - **Timeline and player:** windows stay in [0, 1] and are monotone, so the binary searches are sound. Resetting finished pieces keeps the result independent of history. Pieces land on exact integers, retargeting works, play stops at 0 and N, and play restarts from the ends.
> - **Rendering:** cull bounds cover the `pop` overshoot (about 5% against 10% padding), the light count never changes, and the section cut and its back-face pass are correct.
> - **Query and keyboard:** parsing, `startPosition`, autoplay, `__shotReady` and the keyboard focus rules all behave as specified.
> - **Area modules**, probed vertex by vertex against the section 2 polygons:
>   - No area intrudes more than 0.3 m into another area's blocks, except the core's trim projecting into the Lehman and Petrie blocks, which the core test documents as allowed.
>   - On every shared line the older block builds the wall.
>   - Geometry is reused well: there are only 2 value-duplicate geometries (in `hunt-windows`).
>   - Every area is within its budget: 1.53M triangles, 690 meshes and 3 lights in total.

## Findings and disposition

IDs follow the plan and the repair assignment: F1 to F8 are Codex's items 1 to 8 in order, F9 to F18 are Claude's items 2, 3, 4, 6, 7, 8, 9, 10, 11 and 12 in order, and A1 is the coordinator's. Claude's items 1 and 5 repeat F1 and F5. The format starts IDs at F0; the plan already used F1 first, so these do too.

Repair for every row: worker `repair`, branch `repair`, from `ad6f16f`, revision pending; each fix is to be shown red, then green (plan), and the repair diff is the target of round 1. "Suggested" is the reviewer's own fix, not a decision.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | [Codex 1](#codex) (P1), [Claude 1](#claude): `--solo` goes unchecked into the capture directory that `capture()` deletes recursively (`scripts/capture.ts:191`, `:154`). `--solo ../../..` resolves to the repository root and `--solo ../..` to `.shots/`. | Accepted: data loss, the worst finding of the round. Codex confirmed it by path calculation only. Claude repeated the check with `path.join` after reading the plan's one-line mention of Codex's F1, so it is a second check, not an independent find. | Suggested by both: check `--solo` against the chapter ids before building a path, refuse to delete outside `.shots/`, and fail the run when `__met.warnings` is not empty. |
| F2 | [Codex 2](#codex) (P2): selecting a preset keeps pending camera pan or rotation (`src/viewer/camera-rig.ts:77`), so the camera lands away from the requested view. | Accepted. Codex reproduced it without a browser: panning, then selecting an interior preset, moved the target from X −30 to about −190. | Suggested: clear pending motion before applying a preset; test drag, then preset, then the settled pose. |
| F3 | [Codex 3](#codex) (P2): at least 132 core windows omit their glazing bars (`wings-walls.ts:147`, `weston-facade.ts:147`, `vaux-front.ts:110`). | Accepted. Codex's probe of the real sequence counted zero `bars` pieces against 80 main and 46 ground window frames, 126 in all, and its reading of `vaux-front.ts` added six. | Suggested: add the bars with matching placements and arrival order; check that each configured window role reaches the sequence. |
| F4 | [Codex 4](#codex) (P2): Hunt grille bars extend beyond their arches while arriving; `src/model/hunt/shapes.ts:109` multiplies the clipped length by √2 although its direction vectors are already unit length. | Accepted. At t = 33.2 the left entrance grille reaches Y 19.012, above the arch crown at 17.45, in front of the facade (Codex probe). | Suggested: `length = e - a`; add an aperture-containment check. |
| F5 | [Codex 5](#codex) (P2), [Claude 5](#claude): the 4 s build-budget gate does not time geometry built at module load. The timer starts at `src/main.ts:55`, after the static imports (Codex: `plaza.ts:268`; Claude: `kravis.ts`, `lehman.ts`, `rockefeller.ts`, `wallace.ts`, `armor-figures.ts`), while `src/viewer/facts.ts:31` says the number covers every step's geometry. | Accepted. Two reviewers reached it by separate routes: Codex by instrumenting geometry construction (85 of 436 used geometries were built before the timer), Claude by reading. Moving a heavy builder to module scope could push the real build time past 4 s while `layout.spec.ts` stays green. | Suggested: build geometry lazily inside the measured build, as `hunt` does, or measure the whole initialisation interval (Claude: start the timer in a module imported first); state the gate's bound in its header. |
| F6 | [Codex 6](#codex) (P2): the layout test cannot detect an individual hidden control; `tests/e2e/layout.spec.ts:31` drops hidden elements before checking visibility and position. | Accepted. Hiding the 2× button at the mobile viewport leaves the check green because other controls remain. | Suggested: assert the required control inventory and visibility before geometry. |
| F7 | [Codex 7](#codex) (P2): an unknown parts-gallery view can give a NaN camera; `src/parts/main.ts:35` uses `in`, which accepts inherited properties such as `toString`. | Accepted. Codex reproduced it without a browser: `parts.html?part=column-corinthian&view=toString` passes undefined angles into framing instead of falling back to the documented default. | Suggested: an own-property check or an explicit list of views. |
| F8 | [Codex 8](#codex) (P2): solo capture benchmarks measure the wrong scene; `scripts/capture.ts:195` opens the benchmark page without the solo query. | Accepted. With `--solo hunt-1902` it benchmarks the full sequence at t = 34 (ending at `hunt-windows`), not the selected sequence completed (ending at `great-hall-desk`). | Suggested: keep the solo query; verify the benchmark page's selection and final position. |
| F9 | [Claude 2](#claude): the follow camera turns off on a click or tap, not only on a drag (`src/viewer/camera-rig.ts:48-56`, `:89`, `:103-104`); the spec says it "switches off when the user drags". | Accepted. Claude confirmed it in Chrome: during autoplay on `/`, a 150 ms press with no pointer movement gave `follow: false, view: null`; the same press while paused kept follow on. The e2e test (`menus.spec.ts:66-87`) only drags. | Suggested: run `controls.update()` inside `approach()` under a flag that the `change` handler ignores, or detect drags from pointer movement; add an e2e test that a press without movement keeps follow on. |
| F10 | [Claude 3](#claude): a 1970 part is built in the 1902 chapter. `great-hall-desk` (year 1970, `src/model/hunt/hall-fitout.ts:104-108`) sits in `huntSteps` (`hunt/index.ts:36`), which `sequence.ts:21` composes into `hunt-1902`, and `hunt.test.ts:75` locks the order in. At t = 51 the label reads "Step 51 / 153 · 1970 · Hunt's Fifth Avenue front — Set the round information desk". Two 1956 steps also sit in the 1904–1939 chapter (`mmw/armor-court.ts:236`, `core/later.ts:65`). | Accepted, with the coordinator's decision: move the desk into `roche-steps-lehman-1975`; widen `mckim-mead-white-1926` to 1904–1956 rather than move the 1956 steps; add a test that each step's year falls within its chapter's years. The spec says each part appears in the era it was built, and no gate compared a step's year with its chapter's years. | The change touches `src/build/sequence.ts` and `src/build/chapters.ts`, which the spec lists as coordinator-owned. |
| F11 | [Claude 4](#claude): the e2e suite covers fewer controls than `AGENTS.md:81` and the plan (line 34) claim ("drive every button"). `speed-1` and `speed-2` are never pressed (`controls.spec.ts:92-111`); of the presets only `top`, one interior preset and `front` are pressed (`menus.spec.ts:45-64`, `:94`); one of nine chapter items is clicked; nothing checks that the follow camera frames a step; `followGoal`, `fitBox` and `resolvePreset` have no unit tests. | Accepted. A mis-wired speed button, a broken preset pose or a follow camera that never moves would leave the gates green. Claude counts 21 presets; `src/viewer/presets.ts` at `ad6f16f` lists 22 (13 exterior, 9 interior). | Suggested: loop over every speed and preset button; unit tests for the camera fitting; an e2e check that the camera moves toward a step's focus. |
| F12 | [Claude 6](#claude): fit presets are not re-fitted after a resize; the ResizeObserver (`src/main.ts:168-172`) only resizes while the preset stays marked current. | Accepted. Measured on the real bounds: `aerial-ne` fitted at 1280×720 and then resized to portrait puts the bounds' corners at an absolute ndc x of 1.87, so they are cut off; a fresh fit gives 0.95. | Suggested: when `view !== null`, re-apply the preset in the callback. |
| F13 | [Claude 7](#claude): `?view=<unknown>` turns the follow camera off although the warning says the parameter is ignored; `src/main.ts:83` tests `query.view === null` instead of whether the view resolved. | Accepted. `/?view=nope` autoplays with `__met.follow === false`, while `/` has it on. | Suggested: base `follow` on the resolved view. |
| F14 | [Claude 8](#claude): the "final matrix at f = 1" test compares the engine with itself; `src/build/timeline.test.ts:106` compares the timeline's build-time buffer with the buffer after one `evaluate(N)`, never with the matrices given to `kit.add`, and the batching test (`:136`) checks only instance counts. | Accepted. A slot or mesh mix-up in a step with several meshes (pieces written into the mesh of another material with the same count) passes every timeline test. | Suggested: at t = N, and again after a history, compare each mesh's instance matrices with the `kit.add` matrices of that mesh's geometry and material. |
| F15 | [Claude 9](#claude): one unit test takes most of Vitest's 5 s default timeout; `src/build/motion.test.ts:126` makes about 1 million `expect()` calls and took 2.3–2.8 s on an idle 32-core machine. | Accepted as a flake risk; the failure was not reproduced. Claude's first full run (new cache) had one failing test of 256 that it did not capture, and every later full-run summary in its log reads 256 passed (the report counts 15 clean reruns, three in parallel). Blaming this test is an inference, as the report says. | Suggested: check the sorted keys in one pass, or collect violations and assert once. |
| F16 | [Claude 10](#claude): only `mmw` checks that its exported step arrays are in the sequence (`src/model/mmw/mmw.test.ts:100`, whose comment records that this defect happened once); `src/build/sequence.test.ts:52` checks only chapter fields. | Accepted. A new array exported by another area but never composed would leave its parts out of the build with every gate green. | Suggested: in `sequence.test.ts`, check that every exported step array of every area appears in `COMPOSITION`. |
| F17 | [Claude 11](#claude): chapter summaries appear only as hover tooltips (`src/ui/menus.ts:57-66`), though the spec (line 79) says the menu shows each chapter "with their years and summary". | Accepted. On a touch screen (the 390×844 layout) the summary can never be seen. | Suggested: show it as text in each item, or change the spec. |
| F18 | [Claude 12](#claude): a renderer failure is reported as a model failure; `src/main.ts:26-36` titles every boot error "The model could not be built", including a failed `new WebGLRenderer` (`src/viewer/viewer.ts:38`). | Accepted. A browser without WebGL 2 shows "The model could not be built. Error creating WebGL context." and names no fix. | Suggested: catch renderer creation separately and say that WebGL 2 is required and how to get it. |
| A1 | Coordinator acceptance pass (standard shots and sweep, seed 2026): the section cut slices park trees and paints their crowns red. | Accepted. Neither reviewer found it: Claude's report lists the section cut and its back-face pass under "Checked with no finding", and Codex ran no browser. | To be shown red, then green. |

## Verification

Before the round, the coordinator ran `npm run verify` on main at `ad6f16f` and it was green: 256 unit tests and 16 e2e tests (plan, `b5a5e45`). It was not rerun for this record, which changes no code.

The reviewers' own checks and their bounds are under Reviewers and coverage. Apart from the two duplicates (F1, F5), nobody but the reviewer who raised a finding has reproduced it. The repair was in progress on its branch when this record was written; it is not part of this round and has not been reviewed.

Checks run while writing this record (docs worker, 2026-10-14):

- The raw run logs were read for every fact under Reviewers and coverage: the init and result events of the Claude stream, the Codex log header, command lists and error lines, and both smoke tests.
- The runbook's checks: the Claude `modelUsage` has one key, `claude-opus-5-5[1m]`, and the Codex log has no `STATUS_DLL_INIT_FAILED` or `-1073741502`.
- Citations: the first line of each of 37 file-and-line citations in the two reports, including those into `AGENTS.md`, the spec and the plan, was read at `ad6f16f`. Each exists and shows the construct the report names. The failure scenarios were not rerun here. One count differs: Claude's 21 presets are 22 in `src/viewer/presets.ts`.
- Quotation: with the `> ` prefix removed, each quoted report is byte-identical to its raw file (sha256 above).
- Structure: `node scripts/work-docs.mjs check` from the fleet checkout, pointed at this worktree, exited 0 with one work unit. It checks only the file name, the six required sections and contiguous round numbers, not whether the text is true.
- `git status --short` of the main checkout printed nothing.

Not available: any check of the repair, which is in progress and outside this round; a rerun of the reviewers' failure scenarios; the e2e suite and a photographic comparison at reviewer level.

## Round outcome

Round 0 closes with 19 accepted items and no rejection: F1 to F18 from the two reviewers (F1 and F5 were reached by both) and A1 from the coordinator's acceptance pass. All 19 go to worker `repair` (branch `repair`, from `ad6f16f`, revision pending). F1 is the one P1, a data-loss path in the capture script.

There is no dissent and no abstention. One provenance caveat: Claude's confirmation of F1 followed the plan's mention of Codex's F1, so it is a second check, not an independent find. One coverage caveat: a Codex subagent spawn failed, and the log cannot show whether any subagent ran.

No repair has been reviewed or merged, so every finding stays open until round 1. Round 1 is a focused review of the repair diff. It should also settle what the reviewers did not cover: the e2e suite and the model against its photographs. This record is history; the plan holds the current status.
