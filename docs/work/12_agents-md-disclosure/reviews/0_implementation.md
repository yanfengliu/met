# Review 0: implementation

## Target

The met repository's branch `agentsmd`: commit `67da660`, the diff `8a6a0c2..67da660` (48 files: AGENTS.md's Gates section rewritten, the headers of 44 TypeScript files with comments only, `docs/learning/gate-proofs.md`, the size gate in `src/repo-conventions.test.ts`, a devlog line), and the preservation check outside the repository (`facts.mjs` in the session's scratchpad), with its listing and its proofs for that commit. The repairs are `05bdfee`.

## Reviewers and coverage

- **Codex:** codex-cli 0.163.0, `gpt-6-astra` at `xhigh`, approval `never`, sandbox `read-only`, `--ephemeral`, the prompt on stdin and the worktree as its working directory. It read the new AGENTS.md in full, the old Gates section, the diff, the check and its listing, and ran the check with its own `--plant` and `--drop` probes; it ran no Vitest, build or browser test. Its log holds no `STATUS_DLL_INIT_FAILED` or `-1073741502`. Its citations outside the diff were spot-checked: `src/walk/walk-mode.ts:42` holds `CLICK_SLOP = 5`, and `src/build/motion.test.ts:2` and `src/build/player.test.ts:2` name the motion, stagger and player checks.
- **Claude:** Claude Code 2.1.308, `claude-opus-5-5[1m]` at `--effort max`, tools Read, Glob, Grep, Task and Bash limited to `git diff`, `git log` and `git show`, permission mode `dontAsk`, no settings sources and no MCP servers, as its `system/init` event showed; its `modelUsage` held the pin alone, so the lane keeps. It read every hunk of the 48 files, the check, its listing and its proofs; it could not run the check, the tests or a byte count.

Both lanes ran at once against the same commit and changed nothing: the worktree stayed clean at `67da660`.

## Reports

### Codex (`gpt-6-astra`)

I found **two should-fix issues and three minor issues**. I found no lost fact in the manual preservation sample, and no blocking runtime regression. Review scope was `8a6a0c2..67da660`; I changed no files.

1. **Should-fix — the preservation check accepts partial hard-fact matches.**  
   [facts.mjs:264](C:/Users/38909/AppData/Local/Temp/claude/C--Users-38909-Documents-github-met/5f1c16d9-f9cb-4669-8e3a-b1e970e5adeb/scratchpad/agentsmd/facts.mjs:264) uses substring matching for finding IDs and review numbers. Planting the existing door-prompt proof with **F4 instead of F46** exits **0**, citing `gate-proofs.md:68`, which says F46. Planting `review 1, F44` also passes against the reachability header’s review 17. This exceeds the documented semantic limitations: a required hard fact is actually different. **Fix:** match complete finding IDs and review numbers, and add red controls for prefix substitutions.

2. **Should-fix — the size gate does not guarantee that the checkout fits within 32 KiB.**  
   [src/repo-conventions.test.ts:133](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/repo-conventions.test.ts:133) removes CRLF overhead before measuring. Its detector explicitly accepts `'x\r\n'.repeat(15_000)`: **30,000 normalized bytes but 45,000 bytes on disk**. The header honestly defines the normalized bound, but that bound alone does not prevent the truncation motivating this change. **Fix:** retain the 30,000-byte normalized ceiling and additionally bound checkout bytes below 32,768, or enforce sufficient newline headroom.

3. **Minor — the Engine index sends readers to an incomplete set of test headers.**  
   [AGENTS.md:104](C:/Users/38909/Documents/github/met-worktrees/agentsmd/AGENTS.md:104) groups motion endpoints, stagger order and player checks under `timeline.test.ts`. Their dedicated bounds live in [motion.test.ts:2](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/build/motion.test.ts:2) and [player.test.ts:2](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/build/player.test.ts:2), both read outside the diff. **Fix:** add these two paths to the Engine line. The remaining gate lines adequately describe their checks and provide usable routes to detail.

4. **Minor — the new work-unit reference does not exist.**  
   [src/repo-conventions.test.ts:19](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/repo-conventions.test.ts:19) cites `docs/work/12_agents-md-disclosure`, absent both from commit `67da660` and the checkout. Readers cannot follow that rationale/history reference. **Fix:** commit the intended work-unit documentation or correct/remove the citation.

5. **Minor — the moved click fixture looks like an incorrect constant value.**  
   [tests/e2e/labels.spec.ts:13](C:/Users/38909/Documents/github/met-worktrees/agentsmd/tests/e2e/labels.spec.ts:13) says `under CLICK_SLOP (4 px)`. The constant is **5 px**, as [walk-mode.ts:42](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/walk/walk-mode.ts:42) confirms; **4 px** is this test’s total travel. **Fix:** write “a press travelling 4 px, below CLICK_SLOP (5 px).”

I checked the following facts against the old Gates text and their destinations. These include independently selected facts and samples of the listing’s **DUPLICATE (D)** and **MOVED (M)** classifications. The cited passages state the facts in the appropriate context.

| Old fact checked | Verified destination | Status |
|---|---|---|
| Restored 5 s timeout: 6 of 650 tests identified | [defect-register.md:33](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/defect-register.md:33) | D |
| `acc0e0a`, 60 ms delay, fold failures 5/6 and leave failure 1 | [gate-proofs.md:53](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/gate-proofs.md:53) | M |
| `db4cc47`: climbing drops 6.5–14.4 cm; descending rises 5.9–13.3 cm | [gate-proofs.md:57](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/gate-proofs.md:57) | M |
| `795956f`: 300 ms delay, 0.62 m overshoot, leaf 2.13 m away | [gate-proofs.md:67](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/gate-proofs.md:67) | M |
| `d4d716d`: 146 sampled poses, 41 mm penetration | [gate-proofs.md:104](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/gate-proofs.md:104) | M |
| `7b7fe94`: four leaves, 73 poses; `6198d1a` missed a 12 mm partner overlap | [gate-proofs.md:108](C:/Users/38909/Documents/github/met-worktrees/agentsmd/docs/learning/gate-proofs.md:108) | M |
| `691b8f7`: 156,533 places, courts’ 8 and 10 artworks unmet | [reach.test.ts:32](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/model/reach.test.ts:32) | D |
| Reach fixtures: 0.65 m doorway, 0.3/0.5 m steps, 1.7 m head, 0.2 m groove | [walk/reach.test.ts:7](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/walk/reach.test.ts:7) | M |
| `dc1a7dc`: 870 shapes representing 16,766 pieces | [closure.test.ts:11](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/model/closure.test.ts:11) | M |
| Up to 24 faces, four lines each; 56,168 lines at `3165aa5` | [closure.test.ts:15](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/model/closure.test.ts:15) | M |
| Without depth bias, 11/22 views read 0–96% cut colour | [floors.spec.ts:94](C:/Users/38909/Documents/github/met-worktrees/agentsmd/tests/e2e/floors.spec.ts:94) | D |
| `42722e9`: 308/400 failing seeds; isolated counts 44, 250, 145 | [click-random.test.ts:13](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/viewer/click-random.test.ts:13) | D |
| Eleven API fixtures; stop on 403/429; RFC 850 rolling 50 years | [met-catalogue.test.ts:5](C:/Users/38909/Documents/github/met-worktrees/agentsmd/scripts/met-catalogue.test.ts:5) | M |
| Dendur pool coverage uses starts 2 m apart, directed toward the nearer walkway | [roche-north/walk.test.ts:8](C:/Users/38909/Documents/github/met-worktrees/agentsmd/src/model/roche-north/walk.test.ts:8) | D |

The preservation check reproduced the supplied commit listing: **80/80 sentences, 326 units; 40 KEPT, 156 DUPLICATE, 128 MOVED, 2 SPLIT**. A novel planted fact and deletion of the moved `acc0e0a` proof both correctly exited 1.

Its windowed word-overlap rule is reasonable **as a screening tool supplemented by semantic review**. The two actual SPLIT matches are sensible: route-driving details across `routes.spec.ts`/`route-keys.ts`, and picker/look-target behavior across `pick.test.ts`/`look.test.ts`. It can pass despite losing meaning: deleting `never in CI` from AGENTS.md still passes. That is consistent with its stated lexical limitations; the ID-prefix issue above is an additional, unstated weakness. A green result should not be described as proof of complete semantic preservation.

The **30,000-byte total ceiling is otherwise appropriate**. The current file is **26,813 normalized bytes**, **26,949 checkout bytes**, and **136 lines**. Its canon occupies **14,419 bytes** including its final LF. Growth to the canon’s 15,000-byte ceiling would leave the whole file at **27,394 normalized bytes**, comfortably below 30,000. I exercised the actual size functions in memory: the inclusive boundary, UTF-8 counting, CRLF normalization, current-file pass and old-file rejection all behaved as documented.

Other verification found no additional landing issue:

- All **44 advertised TypeScript files** print identically with comments removed; only `repo-conventions.test.ts` has executable changes.
- The canon and every AGENTS.md section outside Gates are byte-identical.
- The reported file/Gates sizes and devlog measurements agree.
- No tracked file under `src/`, `scripts/` or `tests/` exceeds 500 lines.
- All Gates test paths and Markdown links checked resolve; the missing work-unit citation is noted above.
- `git diff --check` passes, and the checkout remained clean at `67da660`.

I did not run Vitest, builds, browser tests or historical mutations that require filesystem writes. Historical red-proof results were checked for preservation and attribution, not remeasured.

### Claude (`claude-opus-5-5[1m]`)

Its headings are set two levels down to stand under this one; nothing else is changed.

#### Review of work unit 12 at 67da660

**Verdict: nothing blocks landing.** I found five should-fix findings and eight minor ones. Every fix is a small edit to a comment, a doc, or the preservation check's own header.

No fact is gone from the repository, but one red proof now lives only in review history (S2). One moved fact changed its meaning (S1).

I read the new AGENTS.md in full first. Then I read every hunk of all 48 files, all of `facts.mjs`, its listing and its red proofs. My Bash ran only git diff, git log and git show. I could not run the check or `npm test`, or measure bytes.

##### Should-fix

**S1. tests/e2e/labels.spec.ts:13 gives the wrong value for `CLICK_SLOP`.**
- **What:** the moved clause reads "as does a press that travels under CLICK_SLOP (4 px)". `CLICK_SLOP` is 5 (src/walk/walk-mode.ts:42). docs/design/spec.md:216 and walk.spec.ts:9 also say 5 px. The test's press travels 4 px, "2 px out, 2 back" (labels.spec.ts:196, :203). The old line said "(or a press travelling 4 px)".
- **Why it matters:** this commit writes a constant's value in parentheses after its name everywhere else (`FACES (24)`, `LAG (0.3 m)`, `NEAR (3 m)`). So a reader will take the slop to be 4 px.
- **Fix:** "as does a press that travels 4 px, under CLICK_SLOP (5 px)". The replay worker also edits labels.spec, so either make this one-word change now or hand it to them.

**S2. labels-view.spec's F25 red proof left every gate home.**
- **What:** old AGENTS.md:94 gave "(review 6, F25, red at `86bdf0c`)" for the 2 px click. Now tests/e2e/labels-view.spec.ts:4-5 names F25 but carries no red proof, and gate-proofs.md has no labels-view entry.
- The listing (check-list line 130) calls it DUPLICATE at src/viewer/click.test.ts:1. But click.test.ts:16 is the unit click gate's own F25 proof: the taps and the pen, 0.37 to 0.59 m.
- The e2e gate's proof now survives only in docs/work/2_doors-and-collection/reviews/6_implementation.md:37, as "red at `86bdf0c`: 0.514 m".
- **Why it matters:** it breaks the unit's own rule that red proofs live in a test file or gate-proofs.md. It also makes the devlog's "every one was found" (docs/devlog/summary.md:5) one short.
- **Fix:** add a `### tests/e2e/labels-view.spec.ts` section to gate-proofs.md: "A 2 px click on the painting moves nothing: red at `86bdf0c`, the camera moved 0.514 m (review 6, F25)". Putting it there avoids a spec file other workers are editing.

**S3. gate-proofs.md:3 states a placement rule that three tests break.**
- **What:** the line says "A gate whose test header lists its red proofs keeps them there; this file holds the rest." But three headers list red proofs while more of theirs went to gate-proofs.md:
  - src/model/lib/door.test.ts:5, with more at gate-proofs.md:104
  - src/model/door-fit.test.ts:23, with more at :108-109
  - src/model/doors.test.ts:8, with more at :127-128
- None of the three headers points to gate-proofs.md.
- **Why it matters:** someone editing those headers sees red proofs there, has no reason to look elsewhere, and the entries in gate-proofs.md go stale. The plan said these headers would take the proofs they lacked (records/plan.md:28).
- **Fix:** either move those five entries into the three headers, or reword :3 to "the red proofs its test's header lacks" and add "More red proofs: docs/learning/gate-proofs.md." to each header. No other worker is editing these three files.

**S4. src/repo-conventions.test.ts:18 cites a folder that does not exist.**
- **What:** at 67da660, docs/work holds units 0 to 8 only. The plan lands the records after units 9 to 11 (records/plan.md:20). So `docs/work/12_agents-md-disclosure` points nowhere from the day this lands, and for good if the unit gets another number.
- **Fix:** drop the reference, since FLEET.md's "Repo file shape" and gate-proofs.md:49 carry the reason. Or land the records with this commit.

**S5. The check's stated bounds (facts.mjs:38-41) leave out the ways it can pass a changed or misfiled fact.**
- **(a) Negations and comparisons are never compared.** The stop list (facts.mjs:99-103) includes no, not, never, with, without, under, over, before, after, within, more, less, only, every, all and any. Live case: check-list line 106 matched "All gives the user's cut back" to floors.spec.ts:236, which says "All now gives nothing back". The fact itself is at floors.spec.ts:3, so nothing was lost there.
- **(b) Single digits count anywhere in the block, not in the window** (facts.mjs:284, :299). So "5 of 6 runs" changed to "4 of 6" would pass.
- **(c) A red proof split from its clause is not tied to its gate's file.** Neither is any DUPLICATE or MOVED line (facts.mjs:225-233, :497-509). Lines 130, 170, 196 and 280 each name another gate's proof that shares the same hash or words. Line 130 is the real loss in S2. For the other three, the fact sits in the right file anyway: door-look.spec.ts:12, src/viewer/doors.test.ts:324-325 and core.test.ts:5.
- **(d) ID-only units like "F26" or "review 17, F44" can never go missing.** They may match in docs/work (facts.mjs:457), and the review that defines the ID always holds it.
- **(e) `docs/research/` is never searched.** Directories named `research` are skipped (facts.mjs:410), although the Homes note (facts.mjs:28) includes "the other docs". This errs on the safe side; it is why the catalogue's exit codes were also copied into scripts/met-catalogue.ts.
- **Fix:** state (a) to (e) under Bounds. Also require a split-off red proof to be found in the test file its clause names, or under that file's heading in gate-proofs.md. That one change would have caught S2.

##### Minor

- **M1. The red proofs ran on an earlier tree, and their commands aren't saved.** red-proofs.txt:3 gives 42/155/127 (kept/duplicate/moved), which matches run15.txt:7. The 67da660 listing gives 40/156/128 (check-list line 333, the same as run17.txt:7).
  - In between, run16.txt:9 went red on a real trim (P40.0), which is good unplanned evidence.
  - facts.mjs is older than red-proofs.txt by file order, so the check's logic is the same.
  - **Fix:** rerun the eight cases at 67da660 and save their `--plant`/`--drop` arguments. Add a reversed-polarity plant and a wrong-gate plant.
- **M2. The size gate's reasoning should be written out.** Details are under question 5 below.
- **M3. gate-proofs.md:127 says "stopped 1.16 m off at the box".** src/model/doors.test.ts:220 says the box was 1.3 m off, and review 18's F50 row (18_implementation.md:41) says 1.30 m and "1.16 m short". The error comes from the old AGENTS.md. **Fix:** "stopped at the box 1.3 m off, 1.16 m short (review 18, F50)".
- **M4. gate-proofs.md:7 promises each entry names "the failure it produced".** Entries :85, :91, :100, :122 and :137 don't. **Fix:** "and the failure, where the record gives it".
- **M5. Hunt's check is described only in core.test.ts's header.** core.test.ts:4-5 holds `archedPassage`'s `levelFaces` check and its red proof ("the passage's feet wound up"). That check runs at hunt.test.ts:272, and hunt.test.ts's header (:1-12) says nothing of it. **Fix:** move that clause to hunt.test.ts's header.
- **M6. Text was repeated to satisfy the check instead of merged** (R25):
  - walk.spec.ts:7-8 repeats :4-5.
  - met-catalogue.test.ts:5-8 repeats :2-4.
  - click.test.ts:21-22 restates the fractions at :16-18 as decimals.
  - crossings.test.ts:11-17 restates :2-10.
  - gate-proofs.md:136 repeats its own heading's file name and "read at every detail".
  - **Fix:** fold only the new details into the existing sentences.
- **M7. AGENTS.md wording.**
  - :89 "an unknown `view=` starts as none" reads like a value named "none".
  - :90 "a key in F's frame" is cryptic.
  - :93-94 put three npm test files (stairs.test, routes.test, roche-north/walk.test) under "The e2e specs", so someone scanning the unit list misses them.
  - **Fix:** "starts as if no view were named"; "a key pressed in the same frame as F"; tag those three files "(unit)".
- **M8. Counts without a revision, and one ambiguous count.**
  - closure.test.ts:28 and :32 (4,774 parts; all 27,043) carry no revision, though the dc1a7dc and 3165aa5 figures beside them do. **Fix:** add the revision each was measured at.
  - src/model/doors.test.ts:4's "(17; …)" reads as 17 stand-ins and doorways, but spec.md:225 says 17 is meshes and draws together. **Fix:** "(17 together; …)".

##### The six questions

**1. Gate lines.** All 17 specs in tests/e2e have a line, and each of the 12 unit groups has one. Each line says what it checks and names its test files, and every named file exists, including the brace paths at :109. The pointer at :75 says where detail lives, and the headers hold it. The only problems are the wording issues in M7.

**2. Lost or hard to find.** Nothing is gone from the repository. One red proof is now only in review history (S2), and three gates' proofs are split between header and gate-proofs.md with no pointer (S3). Facts I spot-checked in their new homes, all correct:
- **SHEETS (closure.test.ts:9):** I summed the table at :74-132: 1,123 + 8,584 + 321 = 10,028, over 53 pairs.
- **Closure constants:** FACES 24, GRID 64 and BEHIND 0.1 mm match closure.test.ts:135, :137 and closure-readings.ts:25.
- **4,774 parts:** this counts every part (7_faces-out reviews/0:102 and :134), so the new placement is if anything clearer. 56,168 lines at 3165aa5 also holds.
- **Commits the worker added:** "17 s at 670f8cc" is right, since 670f8cc wrote "about 17 s". db4cc47 is work unit 2's plan review, so "from before the fix" holds.
- **Constants against code:** LAG 0.3, SEEDS 400, STEPS 40, NEAR 3 m, 6 km (zoom.ts:22), BODY.eye 1.6, 65° and under 3% (floors.spec.ts:170, :176).
- **Arithmetic:** 44/39 = 1.128, 40/39 = 1.026, 136/39 = 3.487.
- **Fixture facts:** the eleven fixture records exist; 5 mm..25 m (catalogue.test.ts:67); 240 lines a side (column.test.ts:131); 14 m and 30 µm (check.test.ts:38, :66); stalls of 0.25 s and 2 s (door-world.test.ts:143); openWall's refusals (core.test.ts:225-263).
- **Review IDs:** every ID in gate-proofs.md is work unit 2's (F46 is review 17's, "final, whole unit").
- **R7's end:** "to Weston's door" left routes.test.ts but is held at src/model/hunt/routes.ts:15-17 and :117.

Of about 26 listing lines I checked, 20 state their fact at the named place. Five DUPLICATE lines name a place that holds a different fact (106, 130, 170, 196, 280). One MOVED line carries a changed value (127, which is S1).

**3. The check as an instrument.** It is a reasonable bound for whether a fact is still present. Hard facts must all be there, three quarters of the words within one window, and SPLIT is narrow. Both SPLIT lines are genuine: routes.spec.ts:5, :30 and :32 with route-keys.ts:37; and pick.test.ts:7-8 with look.test.ts:5-6. It does not bound whether a fact is accurate or attached to the right gate, and its stated bounds don't say so (S5, M1). Because the moved fact lines all point to a header's first line (`:1`), finding the actual line is left to the reader.

**4. Accuracy.** S1 is the only meaning change I found. Everything else I sampled reads the same, some of it more precisely. The rest are misplacements or inherited errors: M3, M5, and the ambiguous count in M8.

**5. Size gate.** The code is correct. The test checks that 30,000 bytes pass and 30,001 fail, and it handles CRLF and multi-byte characters. The failure message names the size, the excess and where detail should go.

30,000 is a sound ceiling for the whole file:
- Worst case on disk is 30,000, plus 582 bytes if the canon grows from 14,418 to its 15,000 ceiling (fleet/FLEET.md:9, canon-budget.test.mjs:16), plus about 150 CRLF bytes. That is about 30,732 bytes, under 32,768.
- There is only one AGENTS.md in the tree, so Codex's 32 KiB budget is all this file's.

The header (src/repo-conventions.test.ts:18-19) is accurate but should write out that arithmetic. It should also say that the gate bounds the total, so the canon's room isn't reserved: a canon sync can trip met's gate on the next met commit. If you want the two ceilings to fit together by construction, bound the bytes outside the canon block at 15,000. The header's "as Git stores it" assumes Git stores LF; there is no root .gitattributes. Then there is S4.

**6. Anything else.**
- **Files over 500 lines:** none. The largest are cited-images.test.ts at 498, reach.test.ts at 467 and doors.spec.ts at 465.
- **Links:** they resolve, apart from S4.
- **Untouched sections:** the AGENTS.md diff is one hunk inside Gates, so the canon block and the other sections are unchanged.
- **Comments only:** every hunk in the 44 files is inside a comment.
- **Byte totals:** 26,813 and 10,383 agree with the plan's section sizes (1,126 + 14,419 + 10,383 + 801 + 84). I couldn't measure them myself.
- **Disagreements between documents:** only S1, S2 (the devlog's "every one was found") and M3.

**Read outside the diff:** src/walk/walk-mode.ts:42, src/model/hunt/routes.ts:15-17, docs/learning/defect-register.md:9, :15, :33 and :75, docs/design/spec.md:212-233, tests/e2e/door-look.spec.ts:12, src/viewer/doors.test.ts:324-325, src/model/hunt/hunt.test.ts:272, docs/work/2_doors-and-collection/reviews/{6,15,17,18,20}_implementation.md, and fleet/FLEET.md:9 and :71.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The check matched finding IDs and review numbers as substrings, so F4 passed for F46 and review 1 for review 17 (Codex 1) | Accepted: a hard fact that differs must fail | `05bdfee`'s check: numbers, IDs, routes and photograph IDs are whole tokens; proofs 4 and 5 plant the two prefixes and go red |
| F1 | The size gate counted AGENTS.md with LF endings, so a file passing at 30,000 bytes could exceed 32 KiB in a CRLF checkout (Codex 2) | Accepted: the gate exists to keep the file inside Codex's read | `05bdfee`: it counts the file with CRLF endings, the larger form of any checkout; red with `8a6a0c2`'s at 69,357 bytes, 39,357 over |
| F2 | AGENTS.md's Engine line filed motion endpoints, stagger order and the player under `timeline.test.ts` (Codex 3) | Accepted | `05bdfee`: the line names `src/build/motion.test.ts` and `src/build/player.test.ts` |
| F3 | `src/repo-conventions.test.ts` cited `docs/work/12_agents-md-disclosure`, which lands only after units 9 to 11 (Codex 4, Claude S4) | Accepted: a citation must resolve when it lands | `05bdfee`: dropped; FLEET.md's "Repo file shape" carries the reason |
| F4 | `labels.spec.ts` wrote "under CLICK_SLOP (4 px)"; the constant is 5 px, and 4 px is the press's travel (Codex 5, Claude S1) | Accepted: the one moved value that changed meaning | `05bdfee`: "a press that travels 4 px, under CLICK_SLOP (5 px)" |
| F5 | `labels-view.spec`'s red proof (review 6, F25, red at `86bdf0c`) left every gate home; the check matched it to `click.test.ts`'s own F25 proof (Claude S2) | Accepted: a red proof lives in its test or gate-proofs.md | `05bdfee`: a `tests/e2e/labels-view.spec.ts` entry in gate-proofs.md, its 0.514 m from review 6; the check's scope rule now finds the proof missing without it (proof 12) |
| F6 | gate-proofs.md said a gate whose header lists its red proofs keeps them there, yet `door.test.ts`, `door-fit.test.ts` and `doors.test.ts` had more of theirs in gate-proofs.md (Claude S3) | Accepted: one home per gate's proofs | `05bdfee`: their entries moved into the three headers |
| F7 | The check's stated bounds left out that polarity and bound words were stop words, bare digits counted anywhere in a block, a red proof was not tied to its gate, a unit of review IDs alone cannot go missing, and `docs/research/` was never read (Claude S5) | Accepted | `05bdfee`'s check: polarity and bound words are facts, bare digits count in the window, each unit is tied to the tests its bullet names (its scope), `docs/research/` is read, and the rest is stated under Bounds |
| F8 | The check's proofs ran on an earlier tree, their commands were not saved, and none planted a reversed polarity or a fact under the wrong gate (Claude M1) | Accepted | `05bdfee`: fourteen proofs by a script that prints each command, run on the repaired tree; the wrong gate goes red, the reversed polarity stays green, as the bounds now say it may |
| F9 | The size gate's header should write out why 30,000 holds and that it does not reserve the canon's room (Claude M2) | Accepted | `05bdfee`: written in its fourth bound |
| F10 | gate-proofs.md had "stopped 1.16 m off at the box"; review 18 records the box 1.3 m off and the zoom 1.16 m short (Claude M3) | Accepted: an error the old AGENTS.md held | `05bdfee`: `doors.test.ts`'s header has "stopped at the box 1.3 m off, 1.16 m short" |
| F11 | gate-proofs.md's intro said every entry names its failure; five do not (Claude M4) | Accepted | `05bdfee`: "the failure and the commit it was red at where the record gives them" |
| F12 | The arched passage's check was described only in `core.test.ts`'s header, though it runs in `hunt.test.ts` (Claude M5) | Accepted | `05bdfee`: `hunt.test.ts`'s header holds it |
| F13 | Text repeated to satisfy the check instead of merged, in `walk.spec`, `met-catalogue.test`, `click.test`, `crossings.test` and the dome entry (Claude M6) | Accepted: R25 | `05bdfee`: each said once |
| F14 | AGENTS.md wording: "starts as none", "a key in F's frame", and three unit tests listed among the e2e specs unmarked (Claude M7) | Accepted | `05bdfee`: plainer words, and "in `npm test`" before the three |
| F15 | The closure counts 4,774 and 27,043 named no revision; `doors.test.ts`'s "(17; …)" read as stand-ins and doorways alone (Claude M8) | Accepted | `05bdfee`: "at 3ac62d7", where work unit 7's review 1 confirmed them, and "(17 together; …)" |
| F16 | To make the ceilings fit by construction, bound met's own sections at 15,000 bytes beside the canon's (Claude, question 5) | Not adopted: the assignment set one bound on the whole file, and the file now leaves the canon its room | The gate's header says the canon's room is not reserved and what to do when a canon sync trips it |
| F17 | The check is a screen, not proof of meaning: deleting "never in CI" from AGENTS.md still passes (Codex, question 3) | Accepted as a bound: words are compared, not meanings | The check's header states it; the reviewers' samples are the reading of meaning, and the devlog says so |

## Verification

- `npm run verify` on `67da660` through the gate lock (`MET_PORT=5365`): 75 test files and 681 unit tests, typecheck, lint, build, and 84 e2e tests in 13.5 min, all passed.
- On the repairs, `05bdfee`, through the gate lock: the same, 75 test files and 681 unit tests, typecheck, lint, build, and 84 e2e tests in 13.5 min, all passed. `05bdfee` landed on origin's main as it was gated, origin's main being its base.
- The check on `05bdfee`: 80 sentences, 327 units, all found: 40 kept, 156 duplicates, 128 moved, 3 across two tests. Its fourteen proofs: the eleven planted, dropped and misfiled facts and the changed canon red, the work as it stands green, and the clause with its polarity reversed green, as its bounds say.
- The size gate on `05bdfee`: green at 27,108 bytes with CRLF endings (26,972 with LF); red with `8a6a0c2`'s AGENTS.md put back, "AGENTS.md holds 69357 bytes with CRLF line endings, 39357 over the 30000-byte bound".
- In the 47 TypeScript files changed but `src/repo-conventions.test.ts`, only comments changed: each prints the same as at `8a6a0c2` with its comments removed (the TypeScript printer).
- Not run by the reviewers: Vitest, the build and the browser suite. Codex did not run them in its read-only sandbox, and the Claude lane could run only git.

## Round outcome

No finding blocked landing. Of the eighteen findings, seventeen were accepted and repaired, or stated as a bound, at `05bdfee`; F16 was not adopted, for the reason above. The repairs were not reviewed again: the assignment set one round, and they answer the findings as the reviewers proposed, but for the check's new scope rule, which the proofs above exercise.
