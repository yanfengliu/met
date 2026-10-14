# Review 1: implementation

## Target

Repository `met` (this repository): the repair of review round 0, as the diff `8455397..102adc3` (`git diff 8455397 102adc3`). It has 45 files, 1,540 insertions and 149 deletions, in the 20 commits of `git log 8455397..102adc3` (one of them merges `8455397` into the branch). Branch `repair`.

`8455397` is main with the README, the devlog and the [round 0 record](0_integration.md). `102adc3` ("Write the repair's contract changes into the spec and the gates") repairs round 0's F1 to F18 and A1. The diff touches no dependency file.

Recover the diff with `git diff 8455397 102adc3` and any file as the reviewers saw it with `git show 102adc3:<path>`. The branch is deleted. Its commits reached main inside the merge `bec9ba5`, together with the repair of this round's findings ([review 2](2_implementation.md)).

The diff that Codex received on stdin, `tmp/review-runs/r1.diff` (ignored path, 165,373 bytes, sha256 `a4a7f0fb10514a4f42f8e18182ab70fd764b92e24b1ccc597a8439aca6eecfc1`), is byte-identical to `git diff 8455397 102adc3` regenerated when this record was written. Both reviewers worked in the `repair` worktree, whose HEAD was `102adc3`.

Scope: the diff only. Coverage of the whole codebase stays with round 0.

## Reviewers and coverage

Both reviewers got one prompt, `tmp/review-runs/prompt-r1-final.md` (ignored path). The Codex log echoes it; Claude's stream does not, and its report follows the same structure. The prompt named the base and the head, pointed to the round 0 record, and said in one line each what the repair of F1 to F18 and A1 changes. For each item it asked for a verdict (Verified, Partly fixed or Not fixed) with file and line, and whether the new test would fail if the fix were reverted ("reason from the code; probe if you need to"). It then asked for any new defect the diff introduces, with file, line, a failure scenario and a fix. It asked for a file and line behind every claim and for at least two files and lines read outside the diff. Each reviewer sized its own delegation.

**Codex**

- Codex CLI 0.158.0, model `gpt-6-astra`, reasoning effort `xhigh`, sandbox `read-only`, approval `never`, as printed in its run log. Working directory: the `repair` worktree. The diff came on stdin. 206,029 tokens.
- It ran 23 PowerShell commands: file reads and searches, `git` reads, `tsc --noEmit --incremental false` (passed), and a read of `.shots/shots/shots.json` with hashes of two retained images. Its first `git` calls failed with "dubious ownership" until it passed `-c safe.directory` on each call, which changes no configuration.
- Per its report it ran no unit, e2e or mutation test, started no browser or server and took no fresh capture. It looked at retained aerial and top cut images from `bb5f06c`, not captures of `102adc3`. Its answers on whether a test would fail with its fix reverted are reasoned from the code.
- One subagent spawn failed (log line 3642: `collab spawn failed ... no rollout found for thread id`, the error of round 0), and its next message says it is covering the review directly. The log shows no subagent output.
- The runbook's checks pass: the strings `STATUS_DLL_INIT_FAILED` and `-1073741502` appear twice in its log, both in lines of the round 0 record that it printed, not as failures, and the log has no policy block. Its `git rev-parse HEAD` showed HEAD at `102adc3`.

**Claude**

- Claude Code 2.1.281, model `claude-opus-5-5[1m]`, `--effort max`. Its init event shows permission mode `auto` and the `repair` worktree as working directory. The final result's `modelUsage` holds exactly one key, `claude-opus-5-5[1m]`, as the runbook requires, and `subagent_stats` shows none spawned. 120 turns, 2,487,909 ms (about 41 minutes). One Bash call, which wrote a probe file into its scratch directory, was refused by a permission rule and the run went on.
- It made 119 tool calls: 102 Bash, 7 Read, 8 Write, 1 Edit and 1 ToolSearch. All nine Write and Edit targets are in its scratch directory. The seven files it read are the round 0 record and six PNG renders from that directory. It extracted `102adc3` into the scratch directory with `git archive` and ran its work on that copy.
- Per its report, on that copy: 307 of 307 unit tests, `tsc`, ESLint, `vite build` and 24 of 24 e2e tests pass; `camera.spec` and `menus.spec` pass four more times, 40 of 40; and it ran 26 revert probes (for each fix it reverted the fix or injected the defect, then ran the new test). It also ran `scripts/capture.ts` itself and looked at renders of the bars, the grille and the section cut. One probe ran its dev server on the default port 5310 instead of its own port; the report says it started and stopped cleanly.

**Independence.** Neither run saw the other's report. None of Claude's 119 tool calls names Codex's file or `tmp/review-runs`, and its tool results contain neither of the headings Codex gave its two new defects; Codex appears in them only through the round 0 record and the plan that it read. None of Codex's 23 commands names `tmp/review-runs` either: they read files in the `repair` worktree (including `.shots` and `node_modules`) and one fleet skill file. Codex's report was written at 12:23 and Claude's at 12:57 (file times). So N1, which both reported, is two separate finds. Both read the round 0 record.

**Tree audit.** Both reviewed the same worktree. The coordinator reports it clean after both runs. Claude's final tool call, at 12:56:50 (stream time) and so well after Codex finished, printed HEAD `102adc3` and an empty `git status --porcelain`. That is a state check, not a content audit, and ignored paths are not covered. The worktree has been removed since, so it cannot be checked again.

**Missing coverage.** Codex ran no test, so its answers on test sensitivity are reasoning. Neither report mentions the reference photographs, and the only images Claude read are its own six renders: no reviewer compared the model with the photographs. The diff touches no dependency file, so the audit gate was not in scope. There was no abstention: each lane returned a report.

## Reports

Each report is quoted whole, line for line, with `> ` added at the start of each line (a bare `>` for an empty line) so that the report's own headings stay inside this record's structure. Nothing else was changed and nothing was removed: neither file contains transport chatter. The Codex file is its `-o` final message, equal to the last message in its run log. The Claude file is equal to the `result` field of the final `result` event of its stream. Raw captures stay in ignored `tmp/review-runs/`. The Codex report keeps its absolute local links as written; they point into the removed `repair` worktree, and their line numbers are those of `102adc3`.

### Codex

Source: `tmp/review-runs/codex-r1.txt`, 10,730 bytes, sha256 `2ffe081843d69721cd2bff6ef52d540beeec4b96477e4c62e682dcd3ceffe168`. Its verdict table has one row for each of F1 to F18 and A1, followed by two new defects numbered 1 and 2.

> Reviewed `8455397..102adc3`. **The reported runtime defects are repaired, but five regression checks remain incomplete.** I found two new defects.
>
> “Verified” below means verified by code inspection. Test sensitivity is reasoned from the code; I did not execute mutation tests.
>
> | Finding | Verdict | Repair and regression-test assessment |
> |---|---|---|
> | **F1** | **Partly fixed** | [capture.ts:175](C:/Users/38909/Documents/github/met-worktrees/repair/scripts/capture.ts:175) guards deletion, and [capture.ts:194](C:/Users/38909/Documents/github/met-worktrees/repair/scripts/capture.ts:194) validates solo IDs. However, [capture.test.ts:14](C:/Users/38909/Documents/github/met-worktrees/repair/scripts/capture.test.ts:14) tests only the helpers. Restoring the unsafe call sites while leaving those helpers would keep the tests green. Add a mocked capture-path test that verifies rejection before deletion. |
> | **F2** | **Verified** | [camera-rig.ts:103](C:/Users/38909/Documents/github/met-worktrees/repair/src/viewer/camera-rig.ts:103) clears pending rotation and pan before setting the pose. The drag → preset → settled-camera comparison at [camera.spec.ts:25](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/camera.spec.ts:25) detects the original drift. |
> | **F3** | **Verified** | Bars now accompany frames and glass at matching placements/orders in [vaux-front.ts:111](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/core/vaux-front.ts:111), [weston-facade.ts:147](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/core/weston-facade.ts:147), and [wings-walls.ts:151](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/core/wings-walls.ts:151). Reverting these produces missing-role signatures in [window-parts.test.ts:143](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/window-parts.test.ts:143). |
> | **F4** | **Verified** | [shapes.ts:110](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/hunt/shapes.ts:110) correctly uses distance along the unit direction. Restoring √2 makes vertices violate the independent aperture bound at [hunt.test.ts:150](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/hunt/hunt.test.ts:150). |
> | **F5** | **Verified** | The budget now checks navigation-relative `readyMs` at [layout.spec.ts:176](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/layout.spec.ts:176), populated after rendering at [main.ts:224](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:224). An import-time construction delay exceeding four seconds now fails, even with a short timeline build. |
> | **F6** | **Verified** | The explicit inventory and visibility checks at [layout.spec.ts:65](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/layout.spec.ts:65) and [layout.spec.ts:82](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/layout.spec.ts:82) catch a hidden `speed-2` before geometry filtering. |
> | **F7** | **Partly fixed** | [parts/main.ts:35](C:/Users/38909/Documents/github/met-worktrees/repair/src/parts/main.ts:35) correctly uses the own-property lookup. But [stage.test.ts:14](C:/Users/38909/Documents/github/met-worktrees/repair/src/parts/stage.test.ts:14) tests only that lookup: reverting the page’s call site to `in` leaves it green. Test the actual `view=toString` page fallback. |
> | **F8** | **Partly fixed** | [capture.ts:218](C:/Users/38909/Documents/github/met-worktrees/repair/scripts/capture.ts:218) preserves the solo query and selected `N`. No new test checks the benchmark URL or scene; [capture.test.ts:14](C:/Users/38909/Documents/github/met-worktrees/repair/scripts/capture.test.ts:14) covers guards only. Removing `${extra}` again would pass. Add a benchmark-selection assertion. |
> | **F9** | **Verified** | The ownership guard at [camera-rig.ts:59](C:/Users/38909/Documents/github/met-worktrees/repair/src/viewer/camera-rig.ts:59) distinguishes rig updates from input-handler updates. The moving-camera press test at [camera.spec.ts:42](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/camera.spec.ts:42) detects the original false drag. |
> | **F10** | **Verified** | The desk is composed into 1975 at [sequence.ts:23](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/sequence.ts:23), and the earlier chapter extends through 1956 at [chapters.ts:13](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/chapters.ts:13). The year containment check at [sequence.test.ts:135](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/sequence.test.ts:135) rejects either historical regression. |
> | **F11** | **Partly fixed** | Every speed, chapter and preset is exercised at [controls.spec.ts:113](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/controls.spec.ts:113), [menus.spec.ts:40](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/menus.spec.ts:40), and [menus.spec.ts:58](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/menus.spec.ts:58). Follow testing records only the target at [camera.spec.ts:102](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/camera.spec.ts:102): removing position interpolation from [camera-rig.ts:120](C:/Users/38909/Documents/github/met-worktrees/repair/src/viewer/camera-rig.ts:120) leaves that check green while framing is wrong. Check position/FOV movement too. |
> | **F12** | **Verified** | [main.ts:184](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:184) refits an untouched preset after resizing. The portrait corner-projection assertion at [camera.spec.ts:79](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/camera.spec.ts:79) detects reverting this behavior. |
> | **F13** | **Verified** | [main.ts:87](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:87) bases follow on the resolved view. Restoring the raw-query condition fails [camera.spec.ts:87](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/camera.spec.ts:87). |
> | **F14** | **Verified** | [timeline.test.ts:32](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/timeline.test.ts:32) independently records `kit.add` matrices; [timeline.test.ts:75](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/timeline.test.ts:75) matches them by geometry/material. Wrong-mesh writes are detected, including after fixture histories at [timeline.test.ts:198](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/timeline.test.ts:198). |
> | **F15** | **Verified** | [motion.test.ts:131](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/motion.test.ts:131) removes the million assertion calls while retaining pairwise checks. There is no dedicated timing assertion: restoring the slow implementation would not necessarily fail. |
> | **F16** | **Verified** | [sequence.test.ts:39](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/sequence.test.ts:39) compares all six areas’ exported step arrays against the sequence. An omitted export fails; [sequence.test.ts:83](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/sequence.test.ts:83) also exercises that rejection explicitly. |
> | **F17** | **Verified** | Summaries are actual item text at [menus.ts:71](C:/Users/38909/Documents/github/met-worktrees/repair/src/ui/menus.ts:71). Restoring tooltip-only summaries fails the presence/content checks at [layout.spec.ts:120](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/layout.spec.ts:120). |
> | **F18** | **Verified** | [viewer.ts:27](C:/Users/38909/Documents/github/met-worktrees/repair/src/viewer/viewer.ts:27) distinguishes renderer startup failure, and [main.ts:36](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:36) supplies the appropriate heading. The simulated unavailable-WebGL test at [smoke.spec.ts:10](C:/Users/38909/Documents/github/met-worktrees/repair/tests/e2e/smoke.spec.ts:10) detects reverting either path. |
> | **A1** | **Partly fixed** | Park trees use uncut materials at [park.ts:143](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/park.ts:143) and [park.ts:205](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/park.ts:205). However, [section-cut.test.ts:51](C:/Users/38909/Documents/github/met-worktrees/repair/src/viewer/section-cut.test.ts:51) checks material presence somewhere in the site. Reverting only the park’s material assignments leaves those materials present in the plaza and the test green. Assert the materials of the park-tree pieces themselves. |
>
> Two new defects:
>
> 1. **The facts API exposes mutable live focus data — [main.ts:237](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:237).** `focus: s.focus` shares the runtime object; freezing its containing record does not freeze that object or its vectors. For example, assigning `window.__met.steps.find(s => s.id === 'vaux-west-front').focus.target[0] = 10000` changes subsequent follow framing. The live definition is retained at [timeline.ts:230](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/timeline.ts:230) and read during playback at [main.ts:210](C:/Users/38909/Documents/github/met-worktrees/repair/src/main.ts:210). **Fix:** publish a detached, deeply frozen focus snapshot and test nested mutation isolation.
>
> 2. **Fountains now mix cut and uncut parts — [site/materials.ts:59](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/materials.ts:59).** Granite and jets opt out, but their water surface still uses clipped `palette.water` at [plaza.ts:127](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/plaza.ts:127). At the finished state with `cut=0`, the north fountain retains its basin and complete jets while its water surface disappears. Its above-zero placement follows [ground.ts:34](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/ground.ts:34) and [plaza.ts:44](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/site/plaza.ts:44). **Fix:** give site fountain water its own uncut material, preserving clipping for interior pools, and test the fountain’s complete material set.
>
> Outside the diff, I also read [kit.ts:39](C:/Users/38909/Documents/github/met-worktrees/repair/src/build/kit.ts:39) for matrix-copy semantics and [builder.ts:260](C:/Users/38909/Documents/github/met-worktrees/repair/src/model/lib/builder.ts:260) for merge-transform semantics.
>
> `tsc --noEmit --incremental false` passed. I inspected the retained aerial/top cut images from `bb5f06c`, not fresh HEAD captures. Unit/e2e suites and photographic comparison were not run. No files were changed, and no browser/server was launched.

### Claude

Source: `tmp/review-runs/claude-r1.txt`, 8,816 bytes, sha256 `2f0fc84b166df81f4d47aeea40556aa8d32b2eab99878c3ecbc05f11305e6ea6`. Its findings come in its own order (F1, F8, then F2 onward, ending with A1), followed by two new defects numbered 1 and 2.

> 18 of the 19 fixes are Verified. A1 is Partly fixed: the code is right, but its new test would stay green if the park trees went back to the cut materials. The diff adds two new defects, both low severity.
>
> The repo is untouched: `git status` is clean at 102adc3. I used no subagents.
>
> **What I ran.** Everything ran on copies of 102adc3 in my scratch directory.
> - **Gates:** 307/307 unit tests, `tsc`, ESLint, `vite build` and 24/24 e2e tests all pass. I ran camera.spec and menus.spec four more times: 40/40, no flakes.
> - **Revert probes:** for each fix, I reverted it or injected the defect it guards against, then ran the new test. That was 26 probes.
> - **Real runs:** I ran `capture.ts` itself and looked at renders of the bars, the grille and the section cut.
> - **Port slip:** one probe ran its dev server on the default port 5310 instead of my own port. It started and stopped cleanly.
>
> ## Findings
>
> - **F1 — Verified.** `checkSolo` runs before anything is written (`scripts/capture.ts:194`, `:237`), and the only delete goes through `insideShots` (`:90-97`, `:175`).
>   - Real run: `shots --solo ../../..` and `sweep --solo ../..` exit 1 with "--solo "../../.." names no chapter; use one of site, …". Sentinel files survived.
>   - Weakening the guard turns 2 tests red (`scripts/capture.test.ts:14-29`). Removing the two calls leaves all 12 green, which is the bound its header states (`:3`).
> - **F8 — Verified.** The benchmark page keeps the solo query (`capture.ts:218`) at the solo's own N (`:199`). A real `--solo hunt-1902` run printed "Frame at t = N (solo hunt-1902)" at 638,650 triangles. There is no automated test, since capture is outside verify.
> - **F2 — Verified.** `setPose` now calls `stopInertia` first (`src/viewer/camera-rig.ts:87-109`). An undamped update spends and zeroes the pending rotation and pan (`OrbitControls.js:799-811`).
>   - Without it, `camera.spec.ts:25` goes red: the camera lands 14.5 m off the preset.
>   - A pan-flick probe of my own lands 0 m off with the fix and 5.1 m off without it.
> - **F3 — Verified.** The bars are added with the frame's matrix and order (`wings-walls.ts:149`, `:155`; `weston-facade.ts:147-148`, `:152-153`; `vaux-front.ts:111`).
>   - Reverting each of the three turns `window-parts.test.ts` red, e.g. "bars: placed 0 times, its frame 6".
>   - The renders show the bars.
> - **F4 — Verified.** The bar length is now `e - a` (`src/model/hunt/shapes.ts:110`). Putting back `* Math.SQRT2` turns all 4 grille tests red (`hunt.test.ts:135-179`), with the top at 19.012 against the crown at 17.45. The render shows the grille inside the arch.
> - **F5 — Verified.** The gate now times `readyMs`, from navigation start to ready (`tests/e2e/layout.spec.ts:173-185`).
>   - A 4.2 s busy loop at plaza.ts module scope gives ready 6258 ms and build 515 ms, and the test goes red.
>   - A cold first load measured 1218 ms, so a cold server will not trip the gate.
> - **F6 — Verified.** The required controls are checked by testid before any geometry (`layout.spec.ts:65-91`, `:145-148`). Hiding `speed-2` below 500 px turns the 390×844 test red.
> - **F7 — Verified.** The lookup uses `Object.hasOwn` (`src/parts/stage.ts:121-123`), and an unknown view falls back with a message (`parts/main.ts:35`, `:153`). Going back to `in` turns 5 tests red.
> - **F9 — Verified.** The rig's own updates run under an `own` counter that the change handler ignores (`camera-rig.ts:59-72`). Real drags, wheel and touch still count, because OrbitControls' input handlers call `update()` themselves (`OrbitControls.js:1110-1124`, `:1882-1935`). The old handler turns `camera.spec.ts:42` red.
> - **F10 — Verified.** The desk is now in `roche-steps-lehman-1975` (`hall-fitout.ts:105-108`, `sequence.ts:23`), and the 1926 chapter now runs 1904–1956 (`chapters.ts:13`).
>   - Old chapter years: the test goes red on the two 1956 steps.
>   - Desk back in the 1902 chapter: red with "great-hall-desk: year 1970 lies outside chapter hunt-1902".
> - **F11 — Verified.** The e2e suite now covers:
>   - every speed (`controls.spec.ts:113`)
>   - every chapter (`menus.spec.ts:22-51`)
>   - every preset (`menus.spec.ts:53-86`)
>   - follow framing (`camera.spec.ts:90`)
>   - the framing maths, in new unit tests
>
>   Each of these went red under a probe:
>   - `speed-2` wired to 1×
>   - `aerial-sw` placed at 0.6× its distance; the old preset test stayed green
>   - one chapter wired to the wrong step; red by a 20 s timeout
>   - `approach()` doing nothing
>   - the follow goal aimed at the model's bounds
>   - the fit-framing maths (`fitBox`) using the wrong field of view across the width
>   - no elevation clamp
>
>   The actual play rate at 1× and 2× is covered by `player.test.ts:23-30`.
> - **F12 — Verified.** A preset is fitted again on resize while the camera still stands at it (`src/main.ts:94`, `:184-192`, `:210-213`). Without the re-fit, `camera.spec.ts:71` goes red at |ndc| 1.885; round 0 measured 1.87.
> - **F13 — Verified.** Follow now depends only on a `view` that names a preset (`main.ts:87-92`). The old line turns `camera.spec.ts:82` red.
> - **F14 — Verified.** The test compares each mesh's instance matrices against what `kit.add` was given (`timeline.test.ts:32-91`, `:189-215`, `:251-252`). I injected round 0's defect: pieces written into another mesh with the same count (`batch.ts:71`). The new tests went red. The old "final matrix at f = 1" test stayed green.
> - **F15 — Verified.** The test now collects violations and asserts once (`motion.test.ts:132-161`), and takes 6 ms. An injected start offset still goes red, with 1411 violations.
> - **F16 — Verified.** The new check is at `sequence.test.ts:31-48`, `:77-86`. Dropping the desk's array from COMPOSITION turns it red, naming the array and the step.
> - **F17 — Verified.** Each chapter's summary is now text in its menu item (`src/ui/menus.ts:57-72`, `styles.ts:54-56`), checked by `layout.spec.ts:114-139`. Removing the summary text turns both viewports red.
> - **F18 — Verified.** Renderer creation is wrapped (`viewer.ts:27-33`, `:48`), and the error heading depends on the error type (`main.ts:36`). Without the wrapper, `smoke.spec.ts:9` goes red.
> - **A1 — Partly fixed.**
>   - **The code is right.** Landscape materials opt out of the cut (`section-cut.ts:19-26`, `:42`; `palette.ts:111`, `:113`; `site/materials.ts:22`, `:69`, `:71`). Every site tree uses them (`park.ts:143`, `:205`; `plaza.ts:193`, `:281`, `:299`, `:306`, `:340-341`). A render with the cut at 6 m shows the trees whole.
>   - **The test misses the reported symptom.** I put the park trees back on `palette.foliage`/`palette.bark` (`park.ts:143`, `:205`). `section-cut.test.ts` stays all green, because the plaza still uses `siteMaterials.foliage`, and that is all its check needs (`section-cut.test.ts:21-35`, `:49-56`). In that state the park trees would be cut and capped red again.
>   - **Fix:** fail when any site step's piece uses `palette.foliage` or `palette.bark`. Better, fail on any material the building also uses, outside a short named list (excavation, pad, step treads, lamps, parasols, sidewalk).
>
> ## New defects
>
> 1. **The published step `focus` is the model's own, unfrozen object (low).**
>    - `src/main.ts:237` publishes `focus: s.focus ?? null`, and the follow camera reads that same object (`main.ts:210`). None of the 71 focus objects is frozen. This contradicts `src/viewer/facts.ts:3`: "Everything is frozen or a getter; nothing here changes the page's state".
>    - Scenario, run in Chrome: on `/?t=12&autoplay=0`, set `window.__met.steps[12].focus.target[0] = 100`, then press Play. After 2.5 s the camera target is at x = 93.5, where it should be heading for 0.
>    - Fix: publish a frozen deep copy, e.g. `deepFreeze(structuredClone(s.focus))`.
> 2. **The README still describes the old cut and follow rules (low).**
>    - `README.md:62` says "Everything above the cut is removed", but landscape now stays whole.
>    - `README.md:61` says follow starts off whenever the URL sets `view`, but an unknown view now leaves it on (`main.ts:92`).
>    - Scenario: `/?cut=6` shows the park trees whole, which the README says cannot happen.
>    - Fix: use the spec's wording in those two lines.
>
> ## Read outside the diff
>
> - `OrbitControls.js:697-925` (`update`; the undamped branch zeroes the deltas at `:799-811`), `:1110-1124` and `:1882-1935` (input handlers call `update()`).
> - `src/build/timeline.ts:156-176`: the arrival-key computation that `window-parts.test.ts` mirrors.
> - `src/build/batch.ts:57-73`: where I injected the F14 defect.
> - `src/model/roche-north/bank.ts:163-175`: orders 0, 1, 2. So the Branch Bank's switch to `stagger: 'order'` (`american-1924.ts:165`) still raises it tier by tier.
> - `src/viewer/query.ts:107-112`, `src/model/frame.ts:84-86`, `src/build/player.test.ts:23-30`, `README.md:61-62`.

## Findings and disposition

F1 to F18 and A1 keep their IDs from [round 0](0_integration.md#findings-and-disposition). New findings are numbered N1 to N3: N1 is the first new defect of both reports, N2 is Codex's second and N3 is Claude's second. Each row gives the reviewers' verdicts in their own words (Verified, Partly fixed, Not fixed). "Accepted" in the third column means the finding stands as the reviewer states it.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | [Codex](#codex): Partly fixed. `scripts/capture.ts:175` guards the delete and `:194` validates the solo ids, but `scripts/capture.test.ts:14` tests only the helpers, so restoring the unsafe call sites with the helpers kept leaves the tests green. [Claude](#claude): Verified. Real runs of `shots --solo ../../..` and `sweep --solo ../..` exit 1 and leave the sentinel files; weakening the guard turns 2 tests red; removing the two calls leaves all 12 green, which it calls the bound the test header states (`:3`). | Accepted as Codex states: the fix works, and no test guards the call sites. The reviewers agree on the facts, that every test stays green with the calls removed, and differ on the verdict: Claude took the bound in the test header as enough. Dissent recorded. | Stronger test assigned. Fixed by `e750df0` on `repair2`: tests drive both CLI paths and the deletion call site. Verified in round 2: removing the validation calls and the deletion guard in memory fails the tests. |
| F2 | [Codex](#codex): Verified. `camera-rig.ts:103` clears pending rotation and pan before the pose is set; the drag, preset, settled-camera comparison at `camera.spec.ts:25` detects the original drift. [Claude](#claude): Verified. `setPose` calls `stopInertia` first (`camera-rig.ts:87-109`); without it `camera.spec.ts:25` goes red, the camera landing 14.5 m off the preset; its own pan-flick probe lands 0 m off with the fix and 5.1 m off without it. | Verified by both. | None. |
| F3 | [Codex](#codex): Verified. Bars now go in with frames and glass at matching placements and orders (`vaux-front.ts:111`, `weston-facade.ts:147`, `wings-walls.ts:151`); reverting them gives missing-role signatures in `window-parts.test.ts:143`. [Claude](#claude): Verified. Reverting each of the three files turns `window-parts.test.ts` red (for example "bars: placed 0 times, its frame 6"); its renders show the bars. | Verified by both. | None. |
| F4 | [Codex](#codex): Verified. `shapes.ts:110` uses the distance along the unit direction; restoring √2 makes vertices break the aperture bound at `hunt.test.ts:150`. [Claude](#claude): Verified. Putting `* Math.SQRT2` back turns all 4 grille tests red (`hunt.test.ts:135-179`), the top at 19.012 against the crown at 17.45; its render shows the grille inside the arch. | Verified by both. | None. |
| F5 | [Codex](#codex): Verified. The budget gate checks the navigation-relative `readyMs` (`layout.spec.ts:176`, set after rendering at `main.ts:224`), so an import-time delay over four seconds now fails. [Claude](#claude): Verified. A 4.2 s busy loop at `plaza.ts` module scope gives ready 6258 ms and build 515 ms, and the test goes red; a cold first load measured 1218 ms, so a cold server does not trip the gate. | Verified by both. | None. |
| F6 | [Codex](#codex): Verified. The control inventory and visibility checks (`layout.spec.ts:65`, `:82`) catch a hidden `speed-2` before any geometry filter. [Claude](#claude): Verified. Required controls are checked by test id before geometry (`layout.spec.ts:65-91`, `:145-148`); hiding `speed-2` below 500 px turns the 390×844 test red. | Verified by both. | None. |
| F7 | [Codex](#codex): Partly fixed. `parts/main.ts:35` uses the own-property lookup, but `stage.test.ts:14` tests only that lookup, so reverting the page's call site to `in` leaves it green; test the `view=toString` fallback on the page. [Claude](#claude): Verified. The lookup uses `Object.hasOwn` (`stage.ts:121-123`) and an unknown view falls back with a message (`parts/main.ts:35`, `:153`); going back to `in` turns 5 tests red (its report does not name the file it reverted). | Accepted as Codex states: a revert at the page's call site is not caught. Dissent recorded; the two statements may concern different reverts. | Stronger test assigned. Fixed by `558f30e` on `repair2`: an e2e test loads `parts.html?view=toString`. Verified in round 2, by inspection (browser tests not run). |
| F8 | [Codex](#codex): Partly fixed. `capture.ts:218` keeps the solo query and the selected N, but no test checks the benchmark URL or scene; removing `${extra}` again would pass. [Claude](#claude): Verified. The benchmark page keeps the solo query (`capture.ts:218`) at the solo's own N (`:199`); a real `--solo hunt-1902` run printed "Frame at t = N (solo hunt-1902)" at 638,650 triangles; there is no automated test, since capture is outside `verify`. | Accepted as Codex states. Both agree that no test covers the benchmark and differ on whether that is enough. Dissent recorded. | Stronger test assigned. Fixed by `e750df0` on `repair2`: the test records the benchmark URLs and checks both parameters. Verified in round 2: removing the benchmark's solo query fails the assertion. |
| F9 | [Codex](#codex): Verified. The ownership guard at `camera-rig.ts:59` tells rig updates from input-handler updates; the moving-camera press test (`camera.spec.ts:42`) catches the original false drag. [Claude](#claude): Verified. The rig's own updates run under an `own` counter that the change handler ignores (`camera-rig.ts:59-72`); real drags, wheel and touch still count because the OrbitControls input handlers call `update()` themselves; the old handler turns `camera.spec.ts:42` red. | Verified by both. | None. |
| F10 | [Codex](#codex): Verified. The desk is composed into 1975 (`sequence.ts:23`), the earlier chapter runs through 1956 (`chapters.ts:13`), and the year check at `sequence.test.ts:135` rejects either old arrangement. [Claude](#claude): Verified. With the old chapter years the test goes red on the two 1956 steps; with the desk back in the 1902 chapter it goes red with "great-hall-desk: year 1970 lies outside chapter hunt-1902". | Verified by both. | None. |
| F11 | [Codex](#codex): Partly fixed. Every speed, chapter and preset is exercised (`controls.spec.ts:113`, `menus.spec.ts:40`, `:58`), but the follow test records only the target (`camera.spec.ts:102`): removing the position interpolation at `camera-rig.ts:120` leaves it green while the framing is wrong; check position and fov too. [Claude](#claude): Verified. The suite covers every speed, chapter and preset and the follow framing, and new unit tests cover the framing maths. Seven probes went red: `speed-2` wired to 1×; `aerial-sw` at 0.6× its distance (the old preset test stayed green); one chapter wired to the wrong step; `approach()` doing nothing; the follow goal aimed at the model's bounds; `fitBox` using the wrong field of view across the width; no elevation clamp. Its list has no probe that removes only the position interpolation. | Accepted as Codex states: its example is not in Claude's probe list. Dissent recorded. | Stronger test assigned. Fixed by `fa3546c` on `repair2`: the follow test checks that position, target and fov errors fall. Verified in round 2, by inspection, for a stalled interpolation. |
| F12 | [Codex](#codex): Verified. `main.ts:184` refits an untouched preset after a resize; the portrait corner-projection assertion (`camera.spec.ts:79`) catches a revert. [Claude](#claude): Verified. A preset is fitted again on resize while the camera still stands at it (`main.ts:94`, `:184-192`, `:210-213`); without the refit `camera.spec.ts:71` goes red at an absolute ndc of 1.885 (round 0 measured 1.87). | Verified by both. | None. |
| F13 | [Codex](#codex): Verified. `main.ts:87` bases follow on the resolved view; restoring the raw-query condition fails `camera.spec.ts:87`. [Claude](#claude): Verified. Follow depends only on a `view` that names a preset (`main.ts:87-92`); the old line turns `camera.spec.ts:82` red. | Verified by both. | None. |
| F14 | [Codex](#codex): Verified. `timeline.test.ts:32` records the `kit.add` matrices independently and `:75` matches them by geometry and material; a write into the wrong mesh is caught, also after fixture histories (`:198`). [Claude](#claude): Verified. It injected round 0's defect (pieces written into another mesh with the same count, `batch.ts:71`): the new tests went red and the old "final matrix at f = 1" test stayed green. | Verified by both. | None. |
| F15 | [Codex](#codex): Verified. `motion.test.ts:131` drops the million assertion calls and keeps the pairwise checks; it adds that there is no timing assertion, so restoring the slow loop would not necessarily fail. [Claude](#claude): Verified. The test collects violations and asserts once (`motion.test.ts:132-161`) and takes 6 ms; an injected start offset still goes red with 1411 violations. | Verified by both. Codex's remark sits inside its Verified verdict and is not a finding; round 0 accepted F15 as a flake risk. | None assigned. |
| F16 | [Codex](#codex): Verified. `sequence.test.ts:39` compares the exported step arrays of all six areas with the sequence, and `:83` exercises the rejection explicitly. [Claude](#claude): Verified. The check is at `sequence.test.ts:31-48` and `:77-86`; dropping the desk's array from COMPOSITION turns it red, naming the array and the step. | Verified by both. | None. |
| F17 | [Codex](#codex): Verified. Summaries are item text (`menus.ts:71`); going back to tooltip-only fails the presence and content checks at `layout.spec.ts:120`. [Claude](#claude): Verified. Each summary is text in its menu item (`menus.ts:57-72`, `styles.ts:54-56`), checked by `layout.spec.ts:114-139`; removing the text turns both viewports red. | Verified by both. | None. |
| F18 | [Codex](#codex): Verified. `viewer.ts:27` separates a renderer start failure and `main.ts:36` gives the matching heading; the simulated no-WebGL test (`smoke.spec.ts:10`) catches reverting either. [Claude](#claude): Verified. Renderer creation is wrapped (`viewer.ts:27-33`, `:48`) and the heading depends on the error type (`main.ts:36`); without the wrapper `smoke.spec.ts:9` goes red. | Verified by both. | None. |
| A1 | [Codex](#codex) and [Claude](#claude): both Partly fixed. The code is right: park trees use uncut materials (`park.ts:143`, `:205`). The test is not: `section-cut.test.ts:51` (Codex) checks only that uncut materials exist somewhere in the site, so reverting just the park's material assignments leaves it green, because the plaza still uses them. Claude ran that revert (park trees back on `palette.foliage` and `palette.bark`): the test stayed all green, and the trees would be cut and capped red again. Codex's fix: assert the materials of the park-tree pieces themselves. Claude's: fail when any site piece uses `palette.foliage` or `palette.bark`; better, fail on any material the building also uses, outside a short named list. | Accepted. Both reviewers agree. | Stronger test assigned. Fixed on `repair2` by `60c63e0` (every site landscape piece opts out of the cut) and `5357bb5` (the test fails on any material the site shares with the building). Verified in round 2: with the previous site code loaded in memory the landscape tests fail. |
| N1 | [Codex](#codex) (new defect 1) and [Claude](#claude) (new defect 1, low): `window.__met` publishes each step's `focus` as the model's own object, not frozen (`main.ts:237`), and the follow camera reads that same object (`main.ts:210`). Codex: assigning `window.__met.steps.find(s => s.id === 'vaux-west-front').focus.target[0] = 10000` changes the later follow framing. Claude, in Chrome: on `/?t=12&autoplay=0`, set `window.__met.steps[12].focus.target[0] = 100` and press Play; after 2.5 s the camera target is at x = 93.5, where it should be heading for 0. Claude adds that this contradicts the header of `facts.ts` (line 3). Both suggest publishing a frozen deep copy. | Accepted. Both reviewers found it separately, and Claude reproduced it in Chrome. | Fixed by `fa3546c` on `repair2`: `window.__met` publishes detached, recursively frozen snapshots. Verified in round 2: disabling the snapshot isolation fails both unit tests; the browser test was inspected, not run. |
| N2 | [Codex](#codex) (new defect 2): fountains now mix cut and uncut parts. Granite and jets opt out of the cut (`site/materials.ts:59`) but the water surface still uses the clipped `palette.water` (`plaza.ts:127`), so at the finished state with `cut=0` the north fountain keeps its basin and complete jets while its water disappears. Fix: give the site fountain water its own uncut material, keep clipping for interior pools, and test the fountain's whole material set. [Claude](#claude) does not mention fountains. | Accepted. Found by Codex alone, from reading the code. | Fixed by `60c63e0` on `repair2`: landscape copies keep separate material identities. Verified in round 2: the reversion found six materials shared with the building. |
| N3 | [Claude](#claude) (new defect 2, low): `README.md:62` says "Everything above the cut is removed", but landscape now stays whole; `README.md:61` says follow starts off whenever the URL sets `view`, but an unknown view now leaves it on (`main.ts:92`). For example `/?cut=6` shows the park trees whole, which the README says cannot happen. Fix: use the spec's wording in those two lines. [Codex](#codex) does not mention the README. | Accepted. At `102adc3` the two README lines read as Claude describes them (checked when writing this record). | Fixed by `5357bb5` on `repair2` (README lines 61 and 62). Verified in round 2; no test covers README text. |

The eight open rows (F1, F7, F8, F11, A1, N1, N2, N3) were all repaired on branch `repair2` (base `102adc3`, head `5357bb5`) and checked in [review 2](2_implementation.md).

## Verification

Checks on the repair, by others:

- The repair worker reported `npm run verify` green at `102adc3`: 307 unit tests in 31 files and 24 e2e tests, with each new check shown red, then green (plan). It was not rerun for this record.
- Claude ran the gates on its copy of `102adc3`: 307 of 307 unit tests, `tsc`, ESLint, `vite build` and 24 of 24 e2e tests, then four more runs of `camera.spec` and `menus.spec` (40 of 40, no flake). It also ran 26 revert probes, `scripts/capture.ts` for real, and looked at renders of the bars, the grille and the section cut. These are the numbers in its report.
- Codex ran `tsc --noEmit --incremental false`, which passed, and nothing else.

Checks run while writing this record (records worker, 2026-10-14):

- Revisions and counts: `8455397`, `102adc3` and `bec9ba5` exist, `8455397` is an ancestor of `102adc3`, and `102adc3` is an ancestor of `bec9ba5`. `git diff --name-only 8455397 102adc3` lists 45 files (1,540 insertions, 149 deletions) and `git rev-list --count 8455397..102adc3` is 20.
- Stdin diff: `tmp/review-runs/r1.diff` equals `git diff 8455397 102adc3` byte for byte (sha256 above).
- Raw logs: the run headers, the command list and the last message of the Codex log, and the init and result events and the tool calls of the Claude stream, were read for every fact under Reviewers and coverage. The Codex `-o` file equals the last message in its log. The Claude file equals the `result` field of the final `result` event.
- The runbook's checks: Claude's `modelUsage` has one key, `claude-opus-5-5[1m]`. The Codex log matches the DLL-failure strings twice, both inside the printed round 0 record, and has no policy block.
- Quotation: with the `> ` prefix removed and the last line's newline dropped, each quoted report is byte-identical to its raw file (sha256 above).
- README: lines 61 and 62 at `102adc3` read as N3 describes them.
- Structure: `node scripts/work-docs.mjs check` from the fleet checkout, pointed at this worktree, exited 0 with one work unit. It checks only the file names, the six required sections and contiguous round numbers, not whether the text is true.

Not checked here: the file-and-line citations inside the two reports (quoted as authored; the Codex links point into the removed `repair` worktree, so recover any cited file with `git show 102adc3:<path>`), a rerun of any failure scenario the reviewers describe, and any check of the repair after `102adc3`, which is review 2's. Not available: Codex's unit and e2e runs, a fresh capture by Codex, and a photographic comparison by either reviewer.

## Round outcome

Round 1 closes with eight open items and no rejection: five repairs whose new tests stay green with the fix reverted (F1, F7, F8, F11, A1) and three new defects (N1, N2, N3). The other 14 round 0 items (F2 to F6, F9, F10 and F12 to F18) are Verified by both reviewers. Claude rated N1 and N3 low; Codex rated no severity.

Dissent: on F1, F7, F8 and F11 Codex answered Partly fixed and Claude answered Verified, and the owner accepted Codex's answer in each case. For F1 and F8 the reviewers agree on the facts (no test fails with the call site reverted, or none exists) and differ on whether that is enough. For F7 and F11 they may have tested different reverts: Claude's F7 answer names no file, and Codex's F11 example is not among Claude's probes. Claude's answers stay in its report and in the table above.

Coverage caveats: Codex ran no test, and its subagent spawn failed, so by its own message it reviewed alone; neither reviewer compared the model with the photographs; the reviewed worktree is gone.

All eight open items were fixed on branch `repair2` (base `102adc3`, head `5357bb5`) and checked in [review 2](2_implementation.md). This record is history; the plan holds the current status.
