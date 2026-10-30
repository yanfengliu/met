# Review 2: the implementation

## Target

Work unit 11's repairs of reviews 0 and 1, uncommitted on commit `9eaf976` on the met repository's branch `replay`: the diff `git diff 9eaf976` of 16 files, 148 lines added and 62 removed, sha256 `09cf5eac63345ac25fb9baa5e06e7d6f87676b8e76d7ee9f1d595924d70797ba`; round 1's repairs are its part beyond review 1's target. The worktree held exactly that diff before and after both runs. With this round's repairs it was committed as `0718468`.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-29 with the same prompt (ignored: `tmp/review-runs/u11-r2/prompt.md`), which listed round 1's findings and their repairs and asked them to check the warning for every combination of `replay=`, `step=`, `t=` and `autoplay=`, the new tests, the red-proof entry against its logs and the docs.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral, no DLL-failure marker. It checked 93,312 query combinations in memory against the replay, position and playback of `9eaf976`, and that following each warning's remedy closes the replay. It cited `docs/design/spec.md:220` and `src/main.ts:448` outside the diff. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, the same limits as before; its result's one model key is the pin, and it ran no subagents. Its read-only commands ran; Node and a grep over a diff were refused, so it read the code and the ignored red-proof logs. It changed no file.

## Reports

### Codex (`gpt-6-astra`)

No material findings. All four round-1 repairs are addressed.

- 93,312 query combinations preserved baseline replay, position and playback behavior. Every override warning named all applicable openers; following its remedy closed the replay.
- In-memory regressions failed the relevant query assertions. Walking assertions remain intact, with bounded deadlines.
- The proof record matches the saved mutation logs. The labels exception agrees with `docs/design/spec.md:220`, read outside the diff.
- Also checked the unchanged warning publication at `src/main.ts:448`.

Typecheck and diff checks passed. Browser tests were not rerun because they write artifacts. Nothing was modified.

Verdict: accept.

### Claude (`claude-opus-5-5[1m]`)

I found nothing blocking. The `replay=0` warning is correct for every combination, and the replay at load is unchanged. One `gate-proofs.md` sentence still claims more than its proof shows, which is a should-fix; the rest are notes. Running Node and test commands was declined in this mode, so I ran neither Vitest nor Playwright. Everything below comes from reading the code and the red-proof logs in the ignored `tmp/red-proofs/`.

#### Findings

1. **should-fix**: `docs/learning/gate-proofs.md:45` (with `:43`).
   - **What's wrong:** it says the Build replay item's `aria-checked` read "is proved by work unit 11's entry below". The file's own definition (`:3`) is that a proof goes red with the gate's defect put back. For this gate the defect is reading the screen before the frame applies the new state; the `acc0e0a` runs showed it by delaying frames 60 ms. Work unit 11's entry has no run with frames delayed.
   - **What the entry does show:** two wrong-state failures. With the replay open at load, the read fails at "the Build replay item before it is chosen" (`tmp/red-proofs/old-default.log:734`, `:811`). With the bar left folded, the Play button never shows (`walk-open-folded.log:20`, `:58`).
   - **The wait may not matter:** in `tests/e2e/helpers.ts:131-132` the `aria-checked` wait is followed by a retrying `toBeVisible()` on `btn-play`. So removing that wait with frames delayed would likely stay green.
   - **Fix:** say the entry shows the read red on a wrong state, and that no delayed-frame run covers it. Or take the item out of `:43`'s list.

2. **note**: `src/viewer/query.test.ts:107-118`.
   - **The new cases can fail.** Naming only the parameter that set the position (round 1's defect) fails `:113`. Always saying "opens" fails `:113-114`. Naming a `step` that names no step fails `:117`. Warning without `replay=0` fails `:118` on `?t=1`.
   - **Gap (a):** no case puts `autoplay=0` beside `replay=0` and a position. So naming `autoplay` whenever `query.autoplay !== null` passes every case, and `?replay=0&t=1&autoplay=0` would then tell the user to leave out a parameter that opens nothing.
   - **Gap (b):** `:118`'s `startsWith('Query parameter replay ')` filter only weakens the check. All four searches return no warnings at all, so a plain `toEqual([])` holds and would also catch a stray position warning.

3. **note**: `docs/learning/gate-proofs.md:49`, `tmp/mutate.py:31`.
   - The entry lists `query.test.ts` and `timeline-bar.test.ts` as part of the gate, but no mutation ran them red.
   - `mutate.py:31` leaves the warning's mutation ("replay=0 overridden in silence") as a comment with no code.
   - Round 1's own defect is a one-line mutation that goes red at `:113` in milliseconds. Record it, or narrow `:49` to what was proved.

4. **note**: `AGENTS.md:94`.
   - **What's wrong:** "…the crosshair and, but with the whole bar on a narrow screen, the door prompt's band" implies the band is checked with the whole bar at 1280×720. It isn't checked with the whole bar at either size.
   - **The case:** the test reads the band only in `quiet()` (`labels.spec.ts:95`, called at `:97`, `:108`, `:113`). With the whole bar (`:100-104`) it checks only the controls and the crosshair (`labels-helpers.ts:48-60`). The test header (`labels.spec.ts:6-8`) has it right.
   - **Fix:** "…the crosshair and, on the strip and with the bar folded, the door prompt's band".

5. **note**: `tests/e2e/labels.spec.ts:9`. The header still has a short line in mid-sentence ("the band, when the replay closes; a drag that looks down at the floor hides it") before `:10` goes back to full width. Round 1 flagged this at `:6`; the rewrap moved the short line rather than mending it.

6. **note**: `AGENTS.md:99`. The Build replay unit line names "`replay=` and the rule that opens the replay at load" but not the new warning that `query.test.ts:107` checks. The doors line names its warning (`AGENTS.md:104`), and the spec (`spec.md:167`) and README (`README.md:145`) name this one.

7. **note**: `tests/e2e/walk-build.spec.ts:4-6`. The header still says End lifts the walker "twice". It doesn't mention the End from the page loaded at t = 0 that round 1 restored (`:68-76`); the test's title (`:59`) does.

8. **note**: `tests/e2e/replay.spec.ts:104`, `:175`. The stated timings are narrower than the repository's own green runs:
   - The first test passed in 4.0 s at 1280×720 (`no-refit.log:15`); the comment says 2.0 to 3.7 s.
   - The key test passed in 12.0 and 11.4 s (`follow-always.log:27`, `:34`); the comment says 11.0 to 11.3 s.
   - Every deadline still keeps at least 5× margin, so nothing is at risk.

#### What checks out

**1. The warning**
- **The rule is unchanged.** `opensReplay` (`query.ts:162`) is `9eaf976`'s expression; `replay` is now true, false or null and compared `=== true`. `position()` is the old body moved as is: same `t`, same warnings in the same order, with the new warning added after them (`:121-129`). `main.ts:154` reads `start.replay`, and `:71` passes its warnings on to `console.warn` (`:448`). So the replay at load equals `9eaf976`'s for every value of `replay=`, `step=`, `t=` and `autoplay=`, valid or not.
- **It fires exactly when it should:** when `replay` is `0` or `false` (`query.ts:47`) and the replay opens anyway.
- **It names the right parameters.** `step` is named when it names a step, `t` when it parses (even when `step` won), and `autoplay` when it is `1`, `true` or bare. The list is never empty, because with `replay` not true the replay opens only through one of these. Leaving them all out closes it at t = N, and each named one opens it on its own, so none is superfluous.
- **Cases I traced:**
  - `?replay=0&step=2&t=1` gives "step and t open".
  - `?replay=0&step=zzz&t=1` gives step's own warning, then "t opens".
  - `?replay=0&step=2&t=abc` gives "step".
  - `?replay=0&t=1&autoplay=0` gives "t".
  - `?replay=0&shot=1&autoplay=1` gives "autoplay".
- **The text meets the message rule.** It says what happened (asked closed, opened by X), which inputs (named by name, since `false` and a bare `autoplay` are flags too) and what would satisfy it (leave them out). One wording nit: when `step` wins, "step and t open it" overstates `t`, which only would without `step`; the remedy is right either way.

**2. The tests**
- `walk-build`'s first test has three page loads and four lifts within 90 s. The End lift on the page loaded at t = 0 is checked at once and a second later, and `t=` opening the replay is read from the Timeline button (`:69`).
- `replay.spec`'s counts of seventeen and seven page loads are right.
- Nothing is weakened against `9eaf976`.

**3. The gate-proofs entry**
- Its counts match the logs: 21 red and 4 green (`old-default.log:849`, `:871`), plus 3 red in the walk run, give 24 of 28. The other runs read 3, 3 of 5, 3, 2, 4 of 6, 2 and 2.
- The runs were made partway through round 1 (the logs carry walk-build's new title, but at older line numbers). The edits made since change no assertion those mutations hit.

**Verdict:** accept once `gate-proofs.md:45` is reworded. The code and its tests are correct, and nothing else is material.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F19 | `gate-proofs.md` says the Build replay item's `aria-checked` read is proved by work unit 11's entry, which shows it red on a wrong state, not with delayed frames (Claude 1). | Accepted. | The sentence says what the entry shows and that no delayed-frame run covers the wait. |
| F20 | The warning's tests miss `autoplay=0` beside `replay=0` and a position, and the empty cases filter what they read (Claude 2). | Accepted. | `?replay=0&t=1&autoplay=0` names `t` alone; the empty cases read every warning. |
| F21 | The entry lists the two unit files without a mutation run on them (Claude 3). | Accepted. | Each run red by its own mutation, recorded: round 1's warning defect, and the bar's shape ignoring a closed replay. |
| F22 | Notes: the `labels` AGENTS.md line on where the band is checked; the `labels` header's short line; the unit line not naming the warning; the `walk-build` header's count of lifts; `replay.spec`'s measures narrower than the green runs (Claude 4 to 8). | Accepted. | Each reworded. |

## Verification

- The second `npm run verify` took the lock at 13:39, before this round's repairs: its 685 unit tests, typecheck, lint and build ran on round 1's tree, and its 107 e2e tests (17.0 min, all passed) on round 1's specs. Two of this round's red proofs mutated `src/viewer/query.ts` and `src/ui/timeline-bar.ts` for about 15 s at 13:43, while `floors.spec` ran in that e2e, whose checks do not read the warning or the bar's shape; this round's spec edits were comments, made after Playwright had loaded the specs. The session had read a stale "waits" line of the gate's log as the lock's state.
- So the final tree was gated again: the unit tests (685), typecheck, lint and build passed through the lock on exactly the tree committed as `0718468` (its digest the same before and after the run).
- The red proofs of the two unit files (F21) were run by hand: each file red with its mutation, green with the work.
- The landing's `npm run verify` on the merged tree runs everything again (the plan's Outcome).

## Round outcome

Codex: accept, no material finding. Claude: accept once F19 is reworded; the rest notes. All were accepted and repaired. The repairs are wording, two test cases and the record of two red proofs; they change no code the reviewers read, so no further round was run.
