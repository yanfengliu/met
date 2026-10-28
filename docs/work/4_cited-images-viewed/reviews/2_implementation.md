# Review 2: implementation

## Target

The met repository, branch `claude/nostalgic-noyce-f69e6b`, commit `586fcfc` ("Answer review 1 of the cited-images gate"): the repairs answering review 1, `git diff 4042ce4..586fcfc`, 8 files. Both lanes read the committed tree.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt on stdin (`tmp/review-runs/4-r2/prompt.md`). It ran the seven test bodies through its own Node harness on CRLF and LF copies, reproduced the six recorded proof counts, tried 960 joiner, number and suffix combinations and 12 clause boundaries, and cited `docs/research/exterior-images.md:184` outside the diff; it did not run Vitest or view the photographs. `codex-fullstdout.log` holds neither DLL marker.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It ran the gate under Vitest, `tsc` and ESLint, copies of the gate at `586fcfc`, `4042ce4` and `1ce5977`, and a prototype of its own repair; it did not run the build or e2e, or view the photographs. Neither lane wrote to the tree; `git status` was clean after both.

## Reports

### Codex

No material findings in `4042ce4..586fcfc`. I found no false negative within the stated bounds and no real-tree citation that now fails.

`JOINED_NUMBER` is simpler and closes the prior trailing-text escapes. `CLAUSE_END`, its `lastIndex`, and the repeated-ID exclusion implement the documented rule. I see no clearly better third approach.

The header, proof record, plan and review 1 dispositions match the implementation. The corrected notes and citations agree with their entries. Outside the diff, [exterior-images.md:184](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/docs/research/exterior-images.md:184) supports the grey-voussoir conflict recorded beside the brick ring.

Read-only validation:

- All seven test bodies passed through an in-memory Node assertion harness.
- Real tree: **0 problems, 42 citations**, with both CRLF and LF.
- All six recorded proof counts reproduced: **7, 1, 1, 1, 1, 24**; the new line-end mutation still passes under the old gate.
- **960** joiner/number/suffix combinations and **12** clause-boundary checks behaved as expected.

Vitest itself, the full verification suite and independent photograph inspection were not run. No files changed.

### Claude

**Verdict:** nothing blocks the merge. Both rule changes do what review 1 accepted, and all six proofs in `gate-proofs.md` reproduce. I found one major problem: a parenthesis opened after the ID list ends the clause at its own `)`. That flaw is older than this diff, but it sits in rule 2. There is also one minor finding and three nits. I edited no repo file.

## Findings

### 1. Major: `src/cited-images.test.ts:60`, the `)` in `CLAUSE_END`
- **What's wrong:** any `)` ends the clause, even one that closes a parenthesis opened after the list. So an author and year in parentheses after the first ID hides the next ID.
- **Failure scenario:** I ran these through the gate's own functions against the real indexes. Each gives 0 problems and reads only the first ID. #17 is "Not viewed" (`interior-images.md:73`).
  - `/** The court (interior-images.md #33 (Benoist 2012) and #17 (Haklai 2012)). */`
  - `/** The court, interior-images.md #33 (Benoist 2012) and #17 (Haklai 2012), shows it. */`
  - `/** (interior-images.md #16 (the east end) and #17) */`
  - The first two give the same result at `1ce5977` and `4042ce4`, so this is not a regression. It is F0's defect, an ID held apart from its list, in the most common citation style.
  - The header's "runs to a `)`" covers this literally, but it doesn't name it as an early end the way it names `St. Louis`. `AGENTS.md:110` and `gate-proofs.md:9` both say "no ID left apart from its list".
- **Repair:** count parentheses.
  - Add `(` to `CLAUSE_END`, then loop from `lastIndex`: a `(` goes one level deeper, a `)` inside a level comes back out, a `;` inside a level is skipped, and anything else ends the clause.
  - My prototype of this gives 0 problems and 42 citations on the tree and identical output on all 23 detector inputs, and it fails all three forms.
  - Add a detector case and a proof.
  - If you keep the current rule instead, name this early end in the header and in `AGENTS.md:110`.

### 2. Minor: the bare-ID rule only reaches straight after the list, but four docs claim more
- **Where:** the header at `src/cited-images.test.ts:11-13`, `AGENTS.md:110`, `docs/learning/gate-proofs.md:9` and `plan.md:20`.
- **What's wrong:** `JOINED_NUMBER` is anchored at the list's end and knows a closed set of joiners. Its own comment (`:57`) says "straight after". But:
  - the header says "No joiner may follow the list";
  - `AGENTS.md` and `gate-proofs.md` say no ID may be "written without its `#` after it";
  - `plan.md` says "so an ID without its `#` … fails".
- **Failure scenario:** each of these gives 0 problems, and the second ID ("Not viewed") is never read:
  - `(interior-images.md #33, J.-C. Benoist 2012, and 17)`: F0 and F2 together.
  - `#12 through 17` and `#16 & 17`.
  - `#37−40` written with U+2212, the minus sign the model's comments use for negative coordinates. Also `#37‒40` with a figure dash.
  - `#16 and  17` (two spaces) and `#16,<tab>17`.
  - A trailing space before a comment line break: `#16 and ⏎ * 17`. `COMMENT_BREAK` keeps the space, so the gate sees two spaces. The tree has no trailing whitespace today, and no lint rule forbids it (`eslint.config.js`).
- **Why not widen the rule:** I tried applying it to the whole clause before its first colon. `choir-screen.ts:19` then fails on its own measurements (`5.1, 8.5 and 11.2 m`). So naming the limit is the repair.
- **Repair:**
  - Write "straight after the list" in all four places.
  - Add this to the header's blind spots: an ID without its `#` anywhere else in the clause, or after any other joiner (`#33, Benoist 2012, and 17`, `#12 through 17`).
  - Optional hardening, with no heuristic: after `COMMENT_BREAK`, collapse each run of spaces and tabs (`[ \t]+`) to a single space in `rest`, and match a dash as `[\p{Pd}−]` with the `u` flag.

### 3. Nit: `src/cited-images.test.ts:60`, `(?<=[A-Za-z0-9]{2})`: a one-digit ID never ends its sentence
- **Failure scenario:** `/** After exterior-images.md #9. Use issue #60 for the fix. */` fails with "holds #60 apart". That is the false positive `h.ts` guards against, but for #5 to #9. The 8 citations in the tree whose list ends on a one-digit ID are all followed by `)` today.
- It fails safe, and the header states the rule exactly.
- **Repair:** use `(?<=[A-Za-z]{2}|\d)`, since a digit is never an initial. In my prototype the tree and all 23 detector inputs are unchanged, and this case passes.

### 4. Nit: `src/cited-images.test.ts:159`: the message quotes a cut-off token
- **Failure scenario:**
  - `(interior-images.md #33, #5a524c)` reports `then writes ", #5"`.
  - `, 3.35 m` reports `", 3"`.
  - `#38 or #17` gives two problems for one fault, and neither says that ` or ` is not a list joiner.
- **Repair:** quote up to the token's end (for example `\d[\w.]*`), and say "join IDs with `, ` or ` and `".

### 5. Nit: two credits the cited entries still don't record (the same kind as F15)
- **`src/model/core/choir-screen.ts:4`:** it credits "three tiers of iron balusters between posts" to #P8, #29 and #44. None of their entries records posts (`interior-images.md:43`, `:97`, `:129`), nor does `interior.md:230`. Yet the model builds them (`choir-screen.ts:45`, `tierPosts`).
- **#38:** its entry (`interior-images.md:117`) now records "a steel post on the walkway's edge". But `interior.md:141` still says #38 shows the posts and rope "along the east walkway", and the entry doesn't say which walkway.
- **Repair:** record the posts in #29's entry, or drop "between posts". Name the walkway in #38's entry, or drop "east".

## What holds
- **The real tree:** 0 problems, 42 citations, 53 interior and 71 exterior entries. Vitest passes all 7 of the file's tests. `tsc --noEmit` and ESLint on the gate and the three changed model files are clean.
- **The recorded proofs:** I reran them in memory and got 7, 1, 1, 1 and 1 problems, then 24 on `53a981c`. The `#P6 and 6` case gives 0 with `4042ce4`'s gate; interior #6 is "Not viewed".
- **Rule 1:** it is simpler and sounder than `BARE_ID`, because there is no lookahead to escape. Every F10 and F11 form fails, and the colon rule for measurements is a fair price. I found no clearly better third approach.
- **Rule 2:**
  - The `lastIndex` read is correct: the lookbehind sees the last ID's digits.
  - Resetting `lastIndex` before each `exec` stops state leaking between mentions, and a leak could only make the clause longer anyway.
  - Dropping IDs already in the list from the strays is sound.
  - `St. Louis`, `cf. Heckscher` and a three-digit colour behave as the header says.
- **The notes and changed citations:**
  - `TIERS` plus `FRIEZE` (0.5 m) puts the frieze tops at 5.9, 9.9 and 13.0 m, and 15.85 − 13.0 = 2.85 m for the cresting (`constants.ts:61`).
  - The note at `vaux-front.ts:85` matches `exterior-images.md:184` and F-owner-4.
  - `spaces-a.ts:152` matches #18 (`interior-images.md:77`, "grey pedestals").
  - The review 1 record and `plan.md` describe what the code does, apart from findings 1 and 2.

## How I checked
I ran a verbatim copy of the gate's lines 40–242, with only `REPO_ROOT` changed, plus copies of the gate at `4042ce4` and `1ce5977`, and the prototypes. The main files:
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\86a06cce-cc42-4157-9102-7f0083547a5b\scratchpad\h\probe.ts
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\86a06cce-cc42-4157-9102-7f0083547a5b\scratchpad\h\proofs.ts
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\86a06cce-cc42-4157-9102-7f0083547a5b\scratchpad\h_depth\gate.ts (the parenthesis prototype)

I did not run the build or e2e, and I could not view the photographs.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F16 | A `)` closing a parenthesis opened after the list ended the clause, so in `#33 (Benoist 2012) and #17 (Haklai 2012)` an unviewed #17 passed; older than `586fcfc` (Claude 1, major) | Accepted: a false negative in a common citation style | `clauseEnd` reads a parenthesis opened inside the clause through, with any `;` in it, as the reviewer's prototype did; detector cases for the three forms; proved red in `roche-south/kravis.ts:37`, green with the test of `586fcfc` |
| F17 | The bare-ID rule reaches only straight after the list and knows a closed set of joiners, while the header, AGENTS.md, `gate-proofs.md` and `plan.md` claimed more; double spaces, tabs, a trailing space before a comment break and other dashes (U+2212) escaped it (Claude 2, minor) | Accepted | "Straight after the list" in all four; the header names the blind spot (an ID without its `#` elsewhere in the clause or after another joiner, `#12 through 17`); runs of spaces and tabs read as one space, and any dash (`\p{Pd}` and U+2212) is a joiner; detector cases |
| F18 | A one-digit ID before a full stop did not end its sentence, so `#9. Use issue #60` failed (Claude 3, nit) | Accepted | A full stop after two letters or a digit, then a capital, ends the sentence; detector case |
| F19 | The message quoted a cut-off token (`, 3` for `, 3.35`), and `#38 or #17` gave two problems where ` or ` was simply not a joiner (Claude 4, nit) | Accepted | The message quotes the whole token and names the joiners; ` or ` joins IDs in a list |
| F20 | Two credits the cited entries do not record: posts between the choir screen's balusters, and the walkway in #38 as the east one (Claude 5, nit) | Accepted | "between posts" dropped from `choir-screen.ts`'s header; `interior.md` says "a walkway" |

## Verification

- `586fcfc`: `npm run verify` (MET_PORT 5347) passed the unit tests (608), typecheck, lint and build; its e2e stage could not start, the port being taken for a moment by nothing still running when checked, and run again alone it passed all 88.
- The repairs: the gate's 7 tests pass, and every proof in `docs/learning/gate-proofs.md` was run again on them: 7, 1, 1, 1, 1 and 1 problems, 24 on `53a981c`, and 0 on the tree.

## Round outcome

No blocker. Codex found nothing material; Claude's major finding was older than the reviewed diff and is repaired as its prototype showed. All five findings are accepted and repaired, with this record, in the commit after `586fcfc`. Review 3 checks those repairs.
