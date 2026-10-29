# Review 0: the implementation

## Target

Work unit 11 on the met repository's branch `replay`, uncommitted on its base `8a6a0c2`: the change as one diff of 30 files, 858 lines added and 250 removed (`git diff 8a6a0c2`, the new files marked intent-to-add), sha256 `ba6cc89a2005bd8a41674ce8b38277cd79ff4c83097372324413d5262e8db06f`. The worktree held exactly that diff before and after both runs. The same content was then committed unchanged as `9eaf976`, once `npm run verify` had passed on it, so the target is recoverable as `8a6a0c2..`9eaf976``.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-29 with the same prompt (ignored: `tmp/review-runs/u11-r0/prompt.md` in the worktree), the diff appended. They were asked to check the behaviour in every state and transition against the design, the screenshot and determinism contracts, the tests (real input, able to fail, nothing weakened, waits bounded, headers' bounds true), the new controls' accessibility and layout, the docs against the code, and the repository's code rules.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran TypeScript, ESLint, the repository's convention checks and in-memory checks of the query and the bar; the browser tests did not run under its sandbox. It cited `src/ui/dom.ts:33` outside the diff, which says what it reports. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and Bash in `dontAsk` mode with no settings and no MCP servers. Its result's one model key is the pin, and it ran no subagents. Its read-only commands (`git status`, `cat`, `grep`, `sed`, `git show`) ran; a `timeout 300 npx tsc --noEmit` and one `git show` with a pipe were refused. It reviewed from reading only and ran no tests. It changed no file.

## Reports

### Codex (`gpt-6-astra`)

- **Should-fix — `src/ui/timeline-bar.ts:127`:** Keyboard activation of “Close the build replay” hides the focused button without restoring focus to a visible control. Tab to it and press Enter: the next sync hides its ancestor, losing visible keyboard focus. The unchanged helper at `src/ui/dom.ts:33`, inspected outside the diff, provides no fallback. Move focus to Build or Walk when closing through the keyboard, and test that transition.

No other material findings. Typecheck, ESLint, convention checks and in-memory query/bar checks passed. Existing draft captures were inspected; browser tests were not rerun under the no-write constraint. Nothing was modified.

Verdict: **not accept**.

### Claude (`claude-opus-5-5[1m]`)

#### Review of work unit 11 (build replay), uncommitted on `replay` at `8a6a0c2`

I found no blocking defect in how the page behaves. I traced every state against the design:

- **The closed replay always shows the finished building.** Each timeline key, button and chapter goes through `act`, which opens the replay first. The scrubber and speeds are `display:none` while it is closed. `closeReplay` calls `toEnd`, which scrubs to N and pauses (`src/build/player.ts:110-123`). So a closed replay always means t = N and paused, and the follow camera has nothing to move with.
- **Framing.** The frame loop fits the preset or floor again whenever the view switches between the orbit view with the bar, the orbit view without it, and walking (`src/main.ts:426-431`). It also fixes an older gap: a preset chosen while walking with the bar unfolded used to stay fitted to the walking view.
- **Shot mode and determinism are untouched.** In shot mode the player never ticks and the follow camera is off, and the replay flag changes only the chrome and the camera inset.
- **The new checks would catch the old default.** With the timeline shown at load again, replay, controls, layout, menus, walk-screen and walk-build all go red.

#### Findings

1. **should-fix**, `tests/e2e/replay.spec.ts:193` and `:159`: neither test sets `test.setTimeout`, and `playwright.config.ts:13-27` sets no timeout, so each gets Playwright's default 30 s.
   - The query test loads the page 17 times. The repo's own figures are about 1.5 s per capture load and about 3 s per normal page load (`floors.spec.ts:269`, `:301`). That gives roughly 26–51 s.
   - The key test loads 7 times, then steps back at 1× (3 s) and enters walk mode.
   - Both run at two sizes. They are likely to time out, certainly on a loaded machine. Set a deadline with its basis stated, as `floors.spec` does, or split the query lists.
2. **should-fix**, `src/ui/timeline-bar.ts:127`: the close button loses keyboard focus.
   - `button()` blurs only on pointer clicks (`src/ui/dom.ts:33-36`). After Enter or Space, focus stays on the close button, which the next frame hides (`src/ui/styles.ts:100`), so focus falls to the body.
   - The next Tab starts from the top of the page. A second Space reopens the replay and plays from t = 0.
   - The menu item handles this already by moving focus to the Build button (`src/ui/menus.ts:112-118`). The close button should do the same.
3. **should-fix**, `AGENTS.md:81`, `:83`, `:87`, `:94`: the rewritten gate lines drop facts the specs still check, against R25 ("cut length, not facts").
   - **:81 (smoke)** drops `parts.html` falling back to three-quarter for an inherited `view=`, the one-canvas / `__shotReady` / no-console-error checks, and the control inventory and chapter summaries. `smoke.spec` is not part of this change (`tests/e2e/smoke.spec.ts:1-6`), so that rewrite is also out of scope.
   - **:94 (labels)** drops:
     - the link's `noopener noreferrer`, no prefetch and new tab;
     - the 16.7 ms and 18.37 ms budgets;
     - the drag, click, 4 px press, wall-click and Esc checks;
     - looking down and back;
     - the card going when walk mode starts.
   - **:87 (walk-build)** drops "never left under the ground" and "walks on up them".
   - **:83 (controls)** drops "Play runs the build from the start".
4. **should-fix**, `README.md:28`, `:34`, `:64-66`, `:71`, `:134-147`: the user-facing README now contradicts the page.
   - It says "Press Play" at load, but there is no Play button until the replay opens.
   - It still describes a "Chapters menu".
   - It does not say that "Follow the build" shows only while the replay is open.
   - The URL table has no `replay=` and does not say that `t=`, `step=` and `autoplay=1` open the replay.
5. **should-fix**, `docs/learning/gate-proofs.md:41-45`: the new entry overclaims and does not fit the file.
   - The file records gates that retired a lesson, each with its lesson and evidence (`:3`). This entry has neither.
   - It lists the Build replay item's `aria-checked` among the reads "proved red at `acc0e0a`". That commit predates the item, so those reads are unproved.
6. **should-fix**, red proofs: none are recorded for `replay.spec` or the other new checks. The plan's own criterion ("each new check is red with the old default put back") is still open.
7. **note**, `docs/design/spec.md:174`: the facts' `aspect` is said to be "above the bar while the bar is whole". Walking with the bar unfolded, the bar is whole but the inset is 0 (`src/main.ts:322`). `facts.ts` words this correctly.
8. **note**, `tests/e2e/replay.spec.ts:15`: the header's bound points to "`.shots/replay/`, `npm run shots`", but `npm run shots` writes `.shots/shots/` (`scripts/capture.ts:3-7`).
9. **note**, `tests/e2e/controls.spec.ts:2-5`: the header says "each test opening the replay by the Build menu", but the `autoplay=1` test opens it by the query.
10. **note**, `tests/e2e/walk-build.spec.ts:58-70`: End is no longer pressed on the page loaded at t = 0. Every lift now follows Home from t = N; it is the same settle path, but it is a dropped case. The comment at `:48` ("10 to 15 s") predates the second page load and the third round.
11. **note**, `scripts/capture.ts:226`: "sets no position, which would open the build replay" reads backwards; it means a position would open it.
12. **note**, `tests/e2e/zoom.spec.ts:65-75`: the plan excludes the zoom area (worker "orbit", unit 10). The edit is needed, because the old centre sat about 30 px high on the new default page, but tell the coordinator.
13. **note**, `src/viewer/query.ts:145-147`: `replay=0` silently loses to `t=`, `step=` or `autoplay=1`. The spec allows this (`spec.md:167`), but a warning would follow R26.
14. **note**, minor naming and leftovers:
    - `src/ui/menus.ts:61` reuses `met-years` for the On/Off word.
    - The classes `met-replay` (`:63`), `met-group-chapters` (`:95`) and `met-section` (`:176`) have no CSS.
    - `src/build/types.ts:102,106` still say "chapter menu".

#### Not run

Typecheck was denied in this session, so this review is from reading only. I did not run Vitest or Playwright because both write caches and results. The plan shows `npm run verify`, the shots and the red proofs as still pending. The new `controls.spec` run at 390×844 includes the far-corner pixel check (`:87`), which has only been proven at 1280×720.

**Verdict: not accepted yet.** Nothing blocks the behaviour; accept once findings 1–6 are fixed and the red proofs are recorded.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The close button keeps keyboard focus as the bar hides it (Codex; Claude 2). | Accepted: Enter or Space on it left focus on a hidden button, so the next Tab started from the top. | The close button hands keyboard focus to the Build menu's button, as the menu's items do (`src/ui/ui.ts`); `replay.spec` closes it by Tab and Enter and reads the focus. |
| F1 | Two `replay.spec` tests have Playwright's default 30 s (Claude 1). | Accepted: they took 11.3 and 18.8 s, too close to 30 s on a loaded machine. | 60 s and 90 s, each with its measured basis in a comment. |
| F2 | The shortened AGENTS.md gate lines drop facts the specs still check (Claude 3). | Accepted in part. The coordinator's rule of 2026-10-29 makes each gate one short line and puts the bounds in the test's header, so the facts move rather than go: the headers of `controls`, `walk-build` and `labels` hold them. `smoke` is not this change's, so its facts come back to its line in short. | The smoke facts restored; the `labels.spec` header names the link's new tab, `noopener noreferrer` and no prefetch hint. |
| F3 | The README contradicts the page: Play at load, a Chapters menu, the follow toggle, the URL table (Claude 4). | Accepted. | README: the default page, the build replay and how it opens and closes, the Build menu, the keys, the follow toggle while the replay is open, the walking bar, and `replay=1` with `t=`, `step=` and `autoplay=1` opening the replay. |
| F4 | The gate-proofs entry does not fit the file and claims the Build replay item's read for a proof that predates it (Claude 5). | Accepted. | The file's opening says it also holds red proofs moved from AGENTS.md lines, with no lesson; the moved entry claims only the reads `acc0e0a`'s runs covered. |
| F5 | No red proofs are recorded for the new checks (Claude 6). | Accepted: they were still to run. | Run on the repaired work; recorded in `docs/learning/gate-proofs.md` and below. |
| F6 | The spec's `aspect` fact says above the bar while the bar is whole, which walking with it unfolded contradicts (Claude 7). | Accepted. | "above the whole bar in the orbit view". |
| F7 | `replay.spec`'s header points at `.shots/replay/` and `npm run shots` as one (Claude 8). | Accepted. | The bound names the standard shots' UI images. |
| F8 | `controls.spec`'s header says each test opens the replay by the menu; the autoplay test opens it by its query (Claude 9). | Accepted. | Worded so. |
| F9 | `walk-build.spec` no longer presses End on the page loaded at t = 0, and its timing comment predates the longer test (Claude 10). | Accepted. | End on that page lifts the walker again before the Build menu path; the comment gives the new measure. |
| F10 | A comment in `scripts/capture.ts` reads backwards (Claude 11). | Accepted. | Reworded. |
| F11 | `zoom.spec.ts` is in the area of worker "orbit" (Claude 12). | Accepted as a note: the edit is needed, since the old centre sat about 30 px high on the new default page. | Told to the coordinator in the hand-off. |
| F12 | `replay=0` loses to `t=`, `step=` or `autoplay=1` without a word (Claude 13). | Accepted. | `startPosition` now gives the replay at load (`Start.replay`) and warns, naming the parameters that open it and what would keep it closed; `query.test.ts` checks the text. |
| F13 | Leftover names: "chapter menu" in `src/build/types.ts`, class names no style reads (Claude 14). | Accepted, but `met-years` for the On and Off word, which reuses the right style. | Renamed; the unused class names removed. |

## Verification

- Before the round, on the reviewed tree: the specs the change touched, 79 tests, all passed (5.9 min), and `npm run verify` passed: 684 unit tests, typecheck, lint, build and 107 e2e tests (15.2 min). The tree was then committed unchanged as `9eaf976`; its diff from `8a6a0c2` has the reviewed patch's digest.
- After the repairs: `replay.spec` and `walk-build.spec`, 11 tests, passed (1.6 min). The red proofs ran on the repaired tree (`docs/learning/gate-proofs.md`, "The timeline shows only in the build replay"): every mutation turned its checks red, the files then put back by digest. Review 1 checks the repairs.
- Neither reviewer ran the browser tests; Codex ran TypeScript and ESLint in its sandbox, and Claude's typecheck was refused.

## Round outcome

Codex: not accept, for F0. Claude: not accepted yet, for F0 to F5; no blocking finding. All fourteen findings were accepted, F2 in part (the facts of a shortened gate line move to its test's header, by the coordinator's rule), and repaired; review 1 is the focused re-review of the repairs.
