# Review 3: implementation

## Target

The met repository, branch `claude/nostalgic-noyce-f69e6b`, commit `91c63c8` ("Answer review 2 of the cited-images gate"): the repairs answering review 2, `git diff 586fcfc..91c63c8`. Both lanes read the committed tree.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt on stdin (`tmp/review-runs/4-r3/prompt.md`). It ran the seven test bodies through its own Node harness on CRLF and LF copies, 5,807 adversarial cases and the recorded proofs, and cited `docs/research/interior-images.md:73` outside the diff; it did not run Vitest or view the photographs. `codex-fullstdout.log` holds neither DLL marker.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It ran the gate under Vitest, `tsc` and ESLint, the gates of `586fcfc` and `91c63c8` side by side, and a scratch copy with its repairs 2 and 3 applied; it did not run the build or e2e, or view the photographs. Neither lane wrote to the tree.

## Reports

### Codex

No material findings in `586fcfc..91c63c8`. I found no in-bounds citation that passes with an unviewed or missing entry, and no real-tree citation that now fails. The documentation and F16–F20 dispositions have no material mismatch with the implementation.

Read-only validation:

- All seven test bodies passed through an in-memory Node assertion harness.
- Real tree: **42 citations, 0 problems**, with CRLF and LF.
- **5,807 adversarial cases** behaved as documented.
- Recorded proof counts reproduced: **7, 1, 1, 1, 1, 1**, and **24** on `53a981c`. The parenthesis escape still passes under `586fcfc` and fails under `91c63c8`.

Outside the diff, I checked [interior-images.md:73](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/docs/research/interior-images.md:73), confirming that #17 is marked “Not viewed” for the escape probes.

Vitest itself, the full verification suite, and independent photograph inspection were not run. No files changed.

### Claude

**Verdict:** nothing blocks the merge. The real tree still passes, every recorded proof reproduces, and the F16–F20 repairs do what the record says. I found one minor problem, which is the header's wording, and three nits. I edited no repo file; `git status` shows only the untracked `.claude/` that was already there.

## Findings

### 1. Minor: the header and `plan.md` describe the clause's `)` end more narrowly than the code
- **Where:** `src/cited-images.test.ts:15-18` and `docs/work/4_cited-images-viewed/plan.md:20`.
- **What's wrong:**
  - The header now says the clause runs to "the `)` that closes the parenthesis it stands in". But `clauseEnd` (`:146-155`) ends the clause at the first `)` that closes no parenthesis opened inside the clause, whether or not the citation stands in a parenthesis.
  - The header also says an inner parenthesis "is read through". In the code, only its `)` and its `;` are skipped. A sentence's end, a line break or a mention inside it still ends the clause.
  - The old wording ("runs to a `)`") was accurate. This commit narrowed it, so the code did not change here but the stated bound became wrong.
- **Failure scenario:** both inputs below give 0 problems at `91c63c8`, and at `586fcfc` too. Only #33 is read; #17 is "Not viewed" (`docs/research/interior-images.md:73`).
  - `/** After interior-images.md #33 for a) the leaf and #17 for b) the frame. */`: the citation stands in no parenthesis, so by the header its clause runs to the line's end and holds #17.
  - `/** (interior-images.md #33 (Benoist 2012. CC BY-SA) and #17) */`: the header says the inner parenthesis is read through, but the clause ends at `2012.`.
  - These inputs are contrived. No citation in the tree has a stray `)` after it.
- **Repair:** wording only, in both places, matching the function's own comment at `:145`:
  - The clause runs to the first `)` that closes no parenthesis opened inside it: either the one closing the parenthesis the citation stands in, or a stray one such as `a)`.
  - Inside a parenthesis opened in the clause, its `)` and any `;` end nothing. A sentence's end, a line break or a mention inside it still ends the clause.

### 2. Nit, and the one place the gate got weaker than `586fcfc`: no-break and thin spaces around a joiner
- **Where:** `src/cited-images.test.ts:61` and `:166`.
- **What's wrong:** in `JOINED_NUMBER`, the `\s?` around `/` and the dash became ` ?`, which matches only an ordinary space. The new collapse handles only spaces and tabs. So a no-break or thin space next to the joiner no longer matches, where `\s?` used to.
- **Failure scenario:** `/** (interior-images.md #16\u00A0–\u00A017) */`, the same with U+2009 or U+202F, and `#16\u00A0/\u00A017`.
  - At `586fcfc`: 1 problem ("then writes "– 17"").
  - At `91c63c8`: 0 problems, and the unviewed #17 is never read.
  - Strictly, this is outside the header's words, since a no-break space is not "a space". `src/model/` holds no non-ASCII space today.
- **Repair:** `.replace(/[^\S\r\n]+/g, ' ')`, with the header saying "Runs of whitespace other than a line break read as one space." I tested this in a scratch copy:
  - All 7 tests pass.
  - The tree still gives 0 problems and 42 citations, and every proof count is unchanged.
  - All four inputs above now fail, and so does `#16 and\u00A017`, which `586fcfc` also missed.

### 3. Nit: a sentence ending in a parenthesis no longer ends the clause
- **Where:** `src/cited-images.test.ts:65`, the lookbehind in `CLAUSE_MARK`.
- **What's wrong:** a `)` that closes an inner parenthesis no longer ends the clause, and a full stop right after `)` doesn't count as a sentence's end. So the clause runs on into the next sentence. This brings back F18's false positive in F16's citation style.
- **Failure scenario:** `/** After interior-images.md #33 (Benoist 2012). Use issue #60 for the fix. */`
  - At `586fcfc`: 0 problems.
  - At `91c63c8`: "the same clause holds #60 apart from them".
  - It fails safe. The tree's two citations followed by `).` (`src/model/roche-north/plan.ts:101`, `roche-north/temple.ts:6`) stand in their own parenthesis, so the `)` ends them first.
- **Repair (optional):** use `(?<=[A-Za-z]{2}|[\d)])`, change the header to "a full stop after two letters, a digit or a `)`", and add a detector case beside `k.ts`. In the same scratch checks, the tree and proofs are unchanged and F16's three forms still fail.

### 4. Nit: `plan.md:20` leaves out the new ` or ` joiner
- **What's wrong:** the plan still says "IDs joined by `, ` or ` and `". The code (`ID_LIST`, `:58`), the header (`:6`) and the message now also join IDs with ` or `.
- **Repair:** "joined by `, `, ` and ` or ` or `".

## What holds
- **Real tree:** 0 problems, 42 citations, 53 interior and 71 exterior entries, under both `586fcfc` and `91c63c8`. Both gates read the same 42 citations with the same IDs, so no real-tree citation now fails.
- **Checks:** Vitest passes the file's 7 tests. `tsc --noEmit -p .` and ESLint with `--max-warnings 0` on the gate are clean. The file is 488 lines, under the 500-line limit.
- **Recorded proofs:** every one in `gate-proofs.md` reproduces on a scratch copy of `91c63c8`:
  - 7 problems for #33 put back to "Not viewed" (`interior-images.md:107`).
  - 1 for the added `exterior-images.md #43` (`exterior-images.md:158`).
  - 1 for #14 behind initials.
  - 1 for "and 42".
  - 1 for "and 6", which is green with the test of `4042ce4`.
  - 1 for F16 in `kravis.ts:37`, which is green with the test of `586fcfc`.
  - 24 on `53a981c`, with the stated breakdown.
- **`clauseEnd` compared with `586fcfc`:** the parenthesis rule can only make a clause longer, so it cannot hide an ID the old gate read. The digit rule makes a clause shorter only at a one-digit number before `. ` and a capital, as the header says.
- **F17's forms all fail now:** `#16 and  17`, `#16,<tab>17`, U+2212, U+2012, and a trailing space before a comment break with LF and CRLF line ends. The header's `–40` and `−40` are U+2013 and U+2212 in the bytes.
- **F20:** `choir-screen.ts:4` now credits only what #29 records (`interior-images.md:97`). #38's entry (`:117`) records the post and rope that `interior.md:141` credits.
- **Not run:** the full `npm run verify`, the build and e2e. I did not view the photographs.

Probe and proof scripts:
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\af420562-5a3e-4cbe-9ae7-c2431a5e6400\scratchpad\h\p2.ts
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\af420562-5a3e-4cbe-9ae7-c2431a5e6400\scratchpad\h\run.ts
- C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\af420562-5a3e-4cbe-9ae7-c2431a5e6400\scratchpad\h\t_fix.ts (the gate with repairs 2 and 3 applied)

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F21 | The header and `plan.md` stated the clause's `)` end more narrowly than `clauseEnd` does: it ends at the first `)` that closes no parenthesis opened inside the clause, and inside such a parenthesis only its `)` and `;` are skipped (Claude 1, minor) | Accepted: the stated bound was wrong, the code right | The header and `plan.md` say what `clauseEnd` does, in its own comment's terms |
| F22 | `JOINED_NUMBER`'s ` ?` around `/` and a dash missed a no-break or thin space that `586fcfc`'s `\s?` caught (Claude 2, nit) | Accepted | Runs of whitespace other than a line break read as one space; detector cases for U+00A0, U+2009 and U+202F |
| F23 | A full stop right after a `)` did not end a sentence, so `#33 (Benoist 2012). Use issue #60` failed (Claude 3, nit) | Accepted | A full stop after two letters, a digit or a `)`, then a capital, ends the sentence; detector case |
| F24 | `plan.md` left out ` or ` as a joiner of IDs (Claude 4, nit) | Accepted | "joined by `, `, ` and ` or ` or `" |

## Verification

- `91c63c8`: `npm run verify` (MET_PORT 5347) passed: the unit tests (608), typecheck, lint, build and all 88 e2e.
- The repairs: the gate's 7 tests pass and the file holds 498 lines. Every proof in `docs/learning/gate-proofs.md` was counted again on them: 7, 1, 1, 1, 1 and 1 problems, 24 on `53a981c`, and 0 on the tree.
- The repairs to the code (F22, F23) are the ones Claude's scratch copy applied and checked against the file's 7 tests, the tree and every proof count; F21 and F24 change wording only. No fifth round was run.

## Round outcome

No blocker and no major finding. Codex found nothing material; Claude found one wording error in the stated bounds and three nits. All four are accepted and repaired, with this record, in the commit after `91c63c8`. The gate's review closes here.
