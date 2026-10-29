# Review 1: the implementation

## Target

Work unit 11's repairs of review 0, uncommitted on commit `9eaf976` on the met repository's branch `replay`: the diff `git diff 9eaf976` of 16 files, 110 lines added and 52 removed, sha256 `387865863e00b116c7167c01cbbd87893748db7fa79de0e7bb032aa54be77cca`. The worktree held exactly that diff before and after both runs. Review 2's target holds it with round 1's repairs on top.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-29 with the same prompt (ignored: `tmp/review-runs/u11-r1/prompt.md`), which listed review 0's findings and the repair of each and asked them to check the focus hand-off in every activation, the refactor of `startPosition` against `9eaf976` for every query, the tests and the docs.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral, no DLL-failure marker. It ran TypeScript and `git diff --check`, and compared `t`, `positioned`, the replay and autoplay with `9eaf976`'s over 58,212 query cases in memory. It cited `src/ui/dom.ts:33` and `src/ui/keyboard.ts:41` outside the diff. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, the same limits as review 0; its result's one model key is the pin, and it ran no subagents. Its read-only commands ran; a typecheck and a loop over spec files were refused. It changed no file.

## Reports

### Codex (`gpt-6-astra`)

- **Should-fix — `src/viewer/query.ts:124`:** The warning’s remedy is incorrect when both position parameters exist. For `?replay=0&step=2&t=1`, it says removing `step=` will close the replay. Doing that leaves `t=1`, which still opens it. Include every parameter that must be removed and test this combination.

- **Should-fix — `docs/learning/gate-proofs.md:45`:** The text claims the `aria-checked` read is proved by “work unit 11’s entry below,” but the file ends here. Add the actual proof or mark it pending; F4 still contains an unsupported claim.

No further material issue found. Outside the diff, `src/ui/dom.ts:33` and `src/ui/keyboard.ts:41` support the focus repair: Enter/Space reach the button’s activation, pointer/touch clicks retain the existing blur behavior, and the new hand-off is independent of walking/orbit mode. The Tab loop explicitly fails if the button is unreachable or focus is not transferred.

Typechecking and `git diff --check` passed. An in-memory comparison against `9eaf976` matched `t`, `positioned`, replay and autoplay across 58,212 cases. The revised deadlines are bounded; no assertion weakening or stale `Query.replay` reader was found. Browser tests were not run under the no-writes constraint.

**Verdict: not accept until the two should-fix findings are resolved.**

### Claude (`claude-opus-5-5[1m]`)

#### Findings

1. **should-fix**: `docs/learning/gate-proofs.md:45`. The entry says the Build replay item's `aria-checked` read "is proved by work unit 11's entry below". There is no such entry: the file ends at line 46, and the plan still lists "Red proofs" as open. This is the same overclaim F4 was about, a cited red proof that hasn't been made. Either add the entry with its runs, or say this read is not yet proved red.

2. **should-fix**: `src/viewer/query.ts:124`. The warning names only the parameter that `position()` used, so its fix doesn't work when `step=` wins over `t=`. With `?replay=0&step=2&t=1` it says "step= opens it. Leave out step= …". Doing that leaves `?replay=0&t=1`, which still opens the replay and now warns about `t=`. That breaks R26's "what would satisfy it". The unit test (`query.test.ts:112-114`) has no case with both `step=` and `t=`.

3. **should-fix**: `tests/e2e/walk-build.spec.ts:48-50`. The repair made the first test longer (a third page load and an extra End lift), to 22 s by its own comment, but kept the 60 s deadline. That is 2.7× headroom, about the same as the 2.65× F1 called a defect (30 s for 11.3 s). The repo's rule is four times the slowest run for a loaded machine (`doors.spec.ts:290`, `door-look.spec.ts:144`, and this repair's own `replay.spec.ts:174,210`), which gives a 22 s test 90 s. The comment also says "three lifts"; the test makes four (End at :70, then End, End and the close button in the rounds at :79).

4. **should-fix**: `AGENTS.md:94` and `tests/e2e/labels.spec.ts:5-8` don't say where the door prompt's band check stops.
   - **What the test checks:** the band only on the strip and folded screens (`labels.spec.ts:94`, called at :96, :107 and :112). With the whole bar it checks the controls, the crosshair and "above the bar" (:100-103), but not the band. The spec's one exception allows that (`spec.md:220`: on a narrow screen with the whole bar, the card may reach into the band).
   - **What was lost:** the AGENTS line from before work unit 11 held this exception. Round 0 dropped it, and F2's repair didn't move it into the header.
   - **The overclaim:** `AGENTS.md:94` now reads "above the bar, whole or a strip, clear of every control, the crosshair and the door prompt's band". That claims a check at 390×844 with the whole bar that the test doesn't make.
   - **Also:** the header insertion left a broken short line at :6.

5. **note**: `query.ts:125` and `query.test.ts:113`.
   - "step= and autoplay=1 opens it" should be "open it", and the test pins the wrong form.
   - The message says `replay=0` and `autoplay=1` even when the URL says `replay=false`, `autoplay=true` or a bare `autoplay`; `flag` accepts those (`query.ts:46-47`). The module's other warnings quote the value given (`query.ts:48`).

6. **note**: `docs/design/spec.md:167` and `README.md:145` don't mention the new warning, though the spec's query table states the warnings for `view=`, `spawn=`, `floor=` and `doors=`.

7. **note**: `query.test.ts:111` mostly checks the code against itself (R19). It compares `startPosition(q).replay` with `opensReplay(q, startPosition(q))`, the same call `startPosition` makes (`query.ts:122`). It would catch a wrong `positioned` argument, but the hand-written lists (:92, :98, :104) still test `opensReplay`, not `start.replay`, which is what `main.ts:154` now reads. Pointing those lists at `startPosition(q, ids).replay` would test what the page uses.

8. **note**: the focus hand-off, and one older path it doesn't cover.
   - **All four activations work:** Enter and Space give a click with `detail` 0, and `ui.ts:115` sends focus to the Build button. A mouse click, pen or touch tap has `detail` ≥ 1, and `dom.ts:35` blurs the button. This is the same split as `menus.ts:116-117`.
   - **Nothing else is left hidden:** closing hides only the bar's controls and the follow toggle (`menus.ts:204`). Neither can hold focus while the close button or the menu item is being activated.
   - **Walking:** the next Space opens the Build menu instead of jumping (`keyboard.ts:41`), the same as after choosing a Build menu item by keyboard.
   - **Untested:** the test drives only Enter, in the orbit view.
   - **Still possible, older than this unit:** pressing F with any bar control focused (the close button included) folds the bar (`keyboard.ts:64-65`, `styles.ts:100`) and hides the focused control.

9. **note**: `walk-build.spec.ts:69-73`.
   - The End lift restored on the page loaded at t = 0 skips the "still there a second later" check (:87-88). The test before work unit 11 made that check for this lift.
   - The named check that `t=` opened the replay is gone too. `unfold` still fails if it didn't, but only when the click's wait reaches the 60 s deadline, and with no message.

10. **note**: `replay.spec.ts:103`. The first test, which the repair made longer (a third replay open and up to 40 Tab presses), still runs under the 30 s default and states no measured time, unlike the other two.

11. **note**: two record-keeping gaps.
   - `gate-proofs.md:3` says "Each entry names … the last commit before the lesson's deletion" right after saying those entries have no lesson. The coordinator's rule it cites is recorded nowhere in the repo; `docs/policies/local-rules.md` doesn't have it (R31).
   - `replay.spec.ts:159` cites "review 0, F0", but `docs/work/11_replay-on-request/reviews/` is empty and the folder isn't tracked (R24).

#### What holds

- **F0:** the new test's Tab loop can fail.
  - `openReplay` opens by pointer clicks, which leave focus on the page (`tests/e2e/helpers.ts:126-134`).
  - From there about eight Tabs reach the close button: Build, View, the five floor buttons, then close.
  - It goes red at :166 if Tab never reaches the button, and at :170 without `ui.ts:114-116`.
- **F12's refactor:**
  - `position()` keeps the old branches in the old order, and `by !== null` is the old `positioned`.
  - `query.replay === true` matches the old `flag(...) === true` for every value: `1`, `true` and empty open the replay; `0`, `false`, malformed and absent don't.
  - Warnings are as before, with the new one added last.
  - Nothing outside `query.ts` reads `Query.replay` (searched `src`, `scripts` and `tests`).
- **F1:** `playwright.config.ts` sets no timeout, so the 30 s default did apply. The counts of 7 and 17 page loads are right.
- **F3:** the README matches the code. For example, the close button really is at the bar's top right (`styles.ts:67`), and Space on the default page opens the replay and plays.
- **F2:**
  - The smoke line matches `smoke.spec.ts:2-5`.
  - The link attributes the labels header now names are checked at `labels-helpers.ts:149-152`.
  - The controls, walk-screen and walk-build headers hold the facts dropped from AGENTS.md.
- **F6 to F10 and F13:**
  - The removed class names had no CSS rule or test selector reading them.
  - The capture comment matches `capture.ts:227-231`.

#### Not run

I couldn't run the typecheck because the shell call was denied. I didn't run the unit or e2e suites either, since they write caches and test results and the brief said to modify nothing. Everything above comes from reading the code and the git history.

**Verdict: not accepted yet.** None of the findings is blocking, but items 1–4 should be fixed first; the rest are notes.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F14 | `gate-proofs.md` cites work unit 11's red-proof entry, which does not exist yet (Codex 2; Claude 1). | Accepted: the proofs had run but were not written up. | The entry added at the file's end. |
| F15 | The `replay=0` warning names only the parameter that set the position, so with `step=` and `t=` its remedy fails (Codex 1; Claude 2). | Accepted. | It names every parameter that opens the replay on its own, by name, its verb agreeing; `query.test.ts` checks each combination, `step=` and `t=` together among them. |
| F16 | `walk-build.spec`'s first test, now 22 s, keeps 60 s, and its comment counts three lifts of four (Claude 3). | Accepted. | 90 s, four times its measure; four lifts. |
| F17 | The `labels` AGENTS.md line claims the band is kept with the whole bar on a narrow screen, which the spec's one exception allows it not to be; the header lost the exception and has a broken line (Claude 4). | Accepted. | Both state where the band is checked; the header's line mended (finished in review 2). |
| F18 | Notes: "open" for "opens"; the warning quotes `replay=0` and `autoplay=1` whatever the URL said; the spec's table and the README do not name the warning; the hand-written lists test `opensReplay`, not what the page reads; `walk-build` dropped a check a second after a lift and the check that `t=` opened the replay; `replay.spec`'s first test states no measure; `gate-proofs.md`'s opening and the coordinator's rule; the focus hand-off tested by Enter alone; F with a bar control focused folds the bar (older than this unit) (Claude 5 to 11). | Accepted but the last two. Enter and Space reach the same click with no detail, so one is driven; the F case predates the unit and is a follow-up. | Parameters named by name with the verb agreeing; the table and the README name the warning; the lists test `startPosition(...).replay`; the checks restored; the measure stated; the opening reworded. The coordinator's rule for AGENTS.md is work unit 12's to record. |

## Verification

- The repairs: typecheck, lint and the query and UI unit tests passed on the tree review 2 read; `replay.spec` and `walk-build.spec` ran again within the second `npm run verify` (review 2's Verification).
- Neither reviewer ran the browser tests.

## Round outcome

Codex: not accept until F14 and F15 are fixed. Claude: not accepted yet, for F14 to F17; no blocking finding. All were accepted and repaired, but two parts of F18 (above); review 2 is the focused re-review of the repairs.
