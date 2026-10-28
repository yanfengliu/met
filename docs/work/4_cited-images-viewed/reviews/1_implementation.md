# Review 1: implementation

## Target

The met repository, branch `claude/nostalgic-noyce-f69e6b`, commit `4042ce4` ("Answer review 0 of the cited-images gate"): the repairs answering review 0, `git diff 1ce5977..4042ce4`, 15 files. Both lanes read the committed tree.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt on stdin (`tmp/review-runs/4-r1/prompt.md`). It ran the seven test bodies through its own Node harness, reproduced the five recorded proof counts and cited `src/model/core/vaux-front.ts:85` outside the diff; it did not run Vitest or view the photographs. `codex-fullstdout.log` holds neither DLL marker.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep` (the pin alone in `modelUsage`). It ran the gate under Vitest, the unit suite, `tsc` and ESLint, reran the five proofs in a harness of its own, and cited lines outside the diff; it did not run the build or e2e, or view the photographs.

## Reports

### Codex

Three findings in `4042ce4`:

- **Major — [src/cited-images.test.ts:54](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/cited-images.test.ts:54): F2 still permits unchecked ranges.** `/** (See interior-images.md #12 to 17.) */` passes, checking only #12 despite #15 and #17 being unviewed. The lookahead requires whitespace or EOF after the full stop, contradicting the header’s stated full-stop boundary. `#12-17 show the temple` also passes. Recognize range continuations and punctuation before closing delimiters; add these regressions before recording F2 as fully repaired.

- **Minor — [src/cited-images.test.ts:54](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/cited-images.test.ts:54): measurements trigger missing-ID errors.** `(interior-images.md #16, 3 to 5 m wide)` reports `", 3" without its #`; `, 5 and 6 m wide` similarly fails. Both describe dimensions, not entries. Recognize unit-bearing numeric expressions before classifying bare IDs, with fixtures for ranges and paired measurements.

- **Minor — [src/cited-images.test.ts:56](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/cited-images.test.ts:56): F0 now consumes unrelated sentences.** `/** After interior-images.md #33. Use issue #60 for the fix. */` incorrectly reports #60 as a separated image ID. A later sentence containing colour `#123` fails likewise. Give citation spans an unambiguous end, or distinguish sentence boundaries from initials and abbreviations; retain the F0 regression cases.

The other repairs match their dispositions. Current IDs are unique, all 41 citations resolve to viewed entries, and the heading/body and shared-read changes passed the probes. Outside the diff, [vaux-front.ts:85](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/model/core/vaux-front.ts:85) confirms the brick material recorded in F-owner-4.

I executed all seven test bodies through an in-memory Node assertion harness and reproduced the five recorded proof counts: **7, 1, 1, 1, 24**. Vitest itself was not run; photograph content was not independently verified. No files were changed.

### Claude

No blocker. The repairs fully answer F1, F3, F8 and F9. F0, F5, F6 and F7 each leave something small. F2 and F4 are only partly answered. I found one major problem, four minor and one nit. I edited no repo file.

## Findings

**1. Major: a bare ID at the end of a line or comment still passes, so F2 is not fully closed**
- **Where:** `src/cited-images.test.ts:54` (`BARE_ID`) and the header at `:11-12`.
- **What's wrong:** the regex has no `m` flag. So `$` in its lookahead only matches at the end of the 400-character window, never at the end of a line. The header's "or the end" therefore never holds in the middle of a file. A line break, `*/`, a dash, ` or ` and any word are not accepted after the bare ID either.
- **Failure scenario.** I ran these through the gate's own functions against the real indexes:
  - `  // the lawn, exterior-images.md #6 and 43` followed by a line of code gives 0 problems. #43 is unmarked; it is the entry `gate-proofs.md` uses for its second proof.
  - The detector test's own `f.ts` form with a second ID, `  // the court, interior-images.md #35 and 15` followed by code, gives 0 problems. #15 is "Not viewed".
  - `/** The night view: interior-images.md #16 and 17 */` gives 0 problems. #17 is "Not viewed".
  - The header's rule says "No ID may follow the list without its `#`". These also break it and give 0 problems: `(interior-images.md #13, 15–17)`, `#13 and 15–17`, `#38 or 14` (the form "14 or 38" stood in `interior.md:141` until this commit), `#16 and 17 show …`, `#16/17` and `#16,17`.
- **Repair:**
  - Accept a line break and `*/` after the bare ID, using `[ \t]*` before them instead of `\s*`. Also accept a dash and `or` there, and add ` or ` as a joiner.
  - A stronger option flips the test: flag any bare `[A-Z]?\d{1,3}` straight after a joiner, unless a unit, a decimal or `:<digit>` follows it. This also fixes finding 3.
  - Add the end-of-line, `*/` and dash forms to the detector test, prove them red, and name in the header whatever is still not read.

**2. Minor: the clause now runs across sentences and comment lines, so it flags the cited ID itself, and the docs misstate where the clause ends**
- **Where:** `src/cited-images.test.ts:56` (`CLAUSE_END`), together with `:145` and `:160`. The docs: the header at `:12`, `plan.md:20` and the F0 row of the review record (`reviews/0_implementation.md:104`).
- **What's wrong:** `COMMENT_BREAK` joins a comment's lines before `CLAUSE_END` runs. With `. ` no longer ending it, a clause inside a comment runs to the first `)` or `;`, the end of the comment, or 400 characters. All three docs say it ends at "the end of a line". Also, `stray` never leaves out IDs that are already in the list.
- **Failure scenario:**
  - This text passed at `1ce5977` and fails now:
    ```
    /**
     * The door: interior-images.md #33 at full size. #33 shows the east leaf a quarter turn open into wing B.
     */
    ```
    The error says "cites interior-images.md #33, and the same clause holds #33 apart from them". `core/weston-facade.ts:43-45` writes this pattern today. It passes only because a `;` and a `)` come between the two mentions.
  - `// The pool, interior-images.md #16, east end.` followed by `// Tuned in review 4, #12 on the tracker.` fails on the #12 on the next line.
  - `interior-images.md #13. The orthophoto, primary #9 of the exterior list, …` fails, and the message tells the author to write exterior #9 among the interior IDs.
- **Repair:** drop IDs already in `ids` from `stray`. State the real bound in the header, in `plan.md:20` and in the record. Or take review 0's other option: end the clause at `. ` followed by a capital letter, after a word of two or more letters. That keeps `J.-C.` and `fig. 110` inside the clause.

**3. Minor: `BARE_ID` flags numbers that are not IDs**
- **Where:** `src/cited-images.test.ts:54`.
- **What's wrong:** a number followed by ` to`, ` and` or `:` counts as a bare ID.
- **Failure scenario:** each of these fails with "then writes ", 3" without its #: write each ID as #<ID>" (or ", 1", ", 11"):
  - `(interior-images.md #16, 3 to 4 m deep)`
  - `(interior-images.md #13, 3 and 4 risers)`
  - `(exterior-images.md #9, 1:2000)`
  - `(exterior-images.md #E39, 1:1)`
  - `(exterior-images.md #E39, 11:17)`, a time the exterior index itself records for [E39]

  The `g.ts` test case covers only `, 5 m` and `, 3.35 m`. An author who follows the advice literally would cite entry #3 for a measurement.
- **Repair:** exempt `:<digit>` and `<n> to|and <n> <unit>`, or use the flipped test from finding 1. Add these cases next to `g.ts`.

**4. Minor: the new note beside `TIERS` and F-owner-1 put the model's middle frieze top at 9.85 m; the model has it at 9.9 m**
- **Where:** `src/model/core/choir-screen.ts:20` and `docs/work/4_cited-images-viewed/plan.md:40`.
- **What's wrong:** each frieze box spans `t` to `t + FRIEZE` (`choir-screen.ts:52`, outside the diff). So the tops are 5.9, 9.9 and 13.0 m (5.4, 9.4 and 12.5 m plus 0.5 m). 9.85 is `TIERS[2][0]`, the foot of the upper tier (`:25`). `plan.md` said 9.9 at `1ce5977`; this commit changed it to 9.85. The devlog (`docs/devlog/summary.md:5`) still says 9.9.
- **Failure scenario:** the owner compares #29's 8.5 m with a height the code does not have, and so would any later session that resizes the frieze from that note.
- **Repair:** write 9.9 in both places.

**5. Minor: the F-owner-4 conflict has no note beside the code, though F5 added one for the same reason**
- **Where:** `src/model/core/vaux-front.ts:2-3` and `:6`, outside the diff.
- **What's wrong:** the header says "alternating granite and brick voussoirs" and then cites `exterior-images.md #60`. That entry (`exterior-images.md:184`) records "alternating light and dark grey voussoirs", and F-owner-4 says the dark ones are grey stone. Review 0 accepted F5 because a known conflict "sits in no comment beside the code, the way the Weston head sat". The F4 repair put this conflict only in `plan.md`, which will be marked complete.
- **Failure scenario:** a later session reading `vaux-front.ts` sees #60 cited for brick voussoirs, and the gate is green. That is the lesson's defect again.
- **Repair:** add a one-line note citing #60 and F-owner-4 at `vaux-front.ts:84-85` (the brick `ring(1)`), as `choir-screen.ts:17-21` does for #29.

**6. Nit: three places still credit an entry with something its text does not record**
- `spaces-a.ts:152` cites "#P5 and #18" for grey stone pedestals. #P5's entry (`interior-images.md:37`) has only Diana "on a tall white pedestal"; only #18 (`:77`) has grey pedestals.
- `choir-screen.ts:4` credits "the lowest with an arched gate" to #P8 and #44. #44's entry (`:129`) says it "does not show the lowest tier or the gate", #P8's entry (`:43`) names no gate, and only #29 records the gate.
- `interior.md:141` says #38 shows the posts and rope along the east walkway. #38's entry (`interior-images.md:117`) records only the paving's edge; #38 was picked by ruling out #14, not by viewing it. Nothing modelled rests on this, since the rope is not modelled.
- **Repair:** cite #18 alone for the pedestals and add #29 for the gate. For #38, either say it was inferred, or view it and record the posts and rope.

## Repairs that hold

- **F0:** `J.-C.` and `fig. 110` now fail, as intended.
- **F1:** I compared the old and new entry parsers on both real indexes: none of the 53 interior and 71 exterior entries changes status.
- **F3:** both messages now offer the narrower fix the finding asked for.
- **F6:** #14 is recorded, and `interior.md`'s gate bullet (`:142`) matches its entry.
- **F8:**
  - "frame 30" is now in all five places.
  - #19 and [D12] point to each other (`exterior-images.md:103` and `:133`), and #12 points to [E41] (`:96`).
  - IDs are unique and have no gaps (interior 1–44 and P1–P9; exterior 1–60 plus 11 labels).
- **F9:**
  - The `###` body stops at the next entry.
  - The shared read `repository()` is safe: if `checkRepository()` throws, `checked` stays unset, so the second test reads again and fails too.
  - `BINARY_PROBE_BYTES` matches `src/repo-conventions.test.ts:41`.
  - The messages at `:115` and `:251-252` say how to fix the problem.
- **Docs and header:** every number in `gate-proofs.md` and in the review record reproduces. The header holds except for the two bounds in findings 1 and 2.

## Checks I ran

- On `4042ce4`:
  - The gate file under Vitest: 7 of 7 pass.
  - The full unit suite: 608 pass.
  - `tsc --noEmit` and ESLint on the gate and the three changed model files: clean.
  - I did not run build or e2e.
- A copy of the gate's functions on the tree gives 0 problems, 41 citations and 53 + 71 entries.
- I reran all five recorded proofs in memory and got 7, 1, 1, 1 and 24 problems, as recorded.
- The harness is in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\a835b11e-5d70-4ce2-b38f-b8501fa313aa\scratchpad\h\probe.ts` and `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\a835b11e-5d70-4ce2-b38f-b8501fa313aa\scratchpad\h\proofs.ts`.
- I could not view the photographs, so I checked the entries only against each other and against the code.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F10 | `BARE_ID` still passed a bare ID or range when what followed fell outside its lookahead: `#12 to 17.)`, `#12-17 show`, a bare ID at a line's end (its `$` had no `m` flag), before `*/`, after ` or `, `/` or a comma without a space (Codex, major; Claude 1, major) | Accepted: false negatives inside the header's stated reach | `JOINED_NUMBER` fails any number after a joiner (`,` with or without a space, ` and `, ` or `, ` to `, `/`, a dash, `..`), whatever follows it; detector cases for every form both lanes named; proved red with `// interior-images.md #P6 and 6` before code, which the test of `4042ce4` passed |
| F11 | `BARE_ID` flagged measurements, ratios and times after a list (`#16, 3 to 4 m deep`, `#9, 1:2000`, `#E39, 11:17`) as bare IDs (Codex, minor; Claude 3, minor) | Accepted as a form rule rather than a heuristic: a number after a list's joiner is read as an ID, so a measurement after a list is set off with a colon (`#16: 3 to 4 m deep`); the message says so, and the header names the rule | The message and header; detector cases for `, 3 to 4 m` failing and `: 3.35 m` passing; no citation in the tree writes a number after its list |
| F12 | With no sentence end, the clause ran across sentences and joined comment lines: it flagged an unrelated `#60` in the next sentence and the cited ID repeated later (`#33 at full size. #33 shows …`), and the header, plan and record said it ended at a line's end (Codex, minor; Claude 2, minor) | Accepted | A sentence's end (a full stop after a word of two or more letters or digits, then a capital) ends the clause again, so initials and `fig. 110` still end nothing; IDs already in the list are never strays; the header names the bound, an early end at `St. Louis` and a three-digit colour read as an ID among it; detector cases for both false positives |
| F13 | The note beside `TIERS` and F-owner-1 gave the middle frieze's top as 9.85 m; it is 9.9 m (Claude 4) | Accepted | 9.9 m in both |
| F14 | F-owner-4's conflict had no note beside the code, though F5 added one for the choir screen (Claude 5) | Accepted | A note at the brick ring in `vaux-front.ts` cites #60 and F-owner-4 |
| F15 | Three credits not recorded in the cited entries: #P5 for grey pedestals, #P8 and #44 for the gate, #38 for the walkway's rope (Claude 6, nit) | Accepted | `spaces-a.ts` cites #18 alone; `choir-screen.ts` cites #P8, #29 and #44; #38 viewed at full size and its entry records the post and rope |

## Verification

- `4042ce4`: `npm run verify` (MET_PORT 5347) passed: the unit tests, typecheck, lint, build and all 88 e2e, `doors.spec.ts:379` among them at 3.8 to 11.3 ms a swing, the machine quiet again.
- The repairs: the gate's 7 tests pass. The proofs in `docs/learning/gate-proofs.md` were run again on them: #33 marked "Not viewed" (7 problems), #43 cited (1), initials before #14 (1), `#36 and 42` (1), `#P6 and 6` at a line's end (1, and 0 with the test of `4042ce4`), and `53a981c`'s sources and indexes (24).

## Round outcome

No blocker. F10 is the second miss in the bare-ID rule; its lookahead heuristic is replaced by a plain form rule that has no lookahead to escape, which also settles F11. All six findings are accepted and repaired, with this record, in the commit after `4042ce4`. Review 2 re-reviews the two rule changes.
