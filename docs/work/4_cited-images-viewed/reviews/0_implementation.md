# Review 0: implementation

## Target

The met repository, worktree branch `claude/nostalgic-noyce-f69e6b`, the uncommitted change against `53a981c` as `git diff 53a981c` showed it with the two new files added as intent-to-add: 32 files, 516 insertions and 111 deletions, preserved as the ignored `tmp/review-runs/4-r0/target.diff` (sha256 `e3b21c0bc082094213ee3cf4338ef1935573eec8c86eda49928f9a928396b5a0`). The working tree held those bytes unchanged from the first lane's start to the last lane's end (the digest re-read after the owner's restart matched). The reviewed bytes are recoverable from `1ce5977`, which commits them unchanged, as its diff against `53a981c` shows.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt on stdin (`tmp/review-runs/4-r0/prompt.md`). It read the diff and the files around it, cited `vitest.config.ts:7` outside the diff, ran no test and saw no photograph. `codex-fullstdout.log` holds neither DLL marker.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the login check passed (init named the pin with no tools or MCP servers; `modelUsage` held the pin alone). Its first run was stopped part-way when the owner paused the session for a restart and left no report; the rerun on the same bytes is the report below.
- Neither lane could view the photographs, so neither checked what the entries say a photograph shows; both judged the docs' internal consistency only.

## Reports

### Codex

Two findings:

- **Major — [src/cited-images.test.ts:49](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/cited-images.test.ts:49): author initials hide stray IDs.** `interior-images.md #33, J.-C. Benoist 2012, and #14` passes: `ID_LIST` reads only `#33`, then `CLAUSE_END` stops at `C. ` before reaching `#14`, which is unviewed. This is one sentence within 400 characters, inside the header’s promised coverage. Use unambiguous citation boundaries that do not terminate at initials, and add this regression case.

- **Minor — [src/cited-images.test.ts:56](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/src/cited-images.test.ts:56): the primary mark is accepted anywhere in an entry.** Remove `(primary, viewed)` from exterior #6’s heading and add `- Compare with #5 (primary, viewed).` beneath it: #6 still counts as viewed despite having no mark of its own. The header restricts this exception to an exterior primary’s heading. Evaluate that exception separately against the heading, and test that body references cannot supply it.

By inspection, all current citations resolve to viewed entries; I found no current-tree false positive or incorrect citation mapping. The recorded mutation counts are plausible, and both lesson halves are removed with recoverable evidence at `53a981c`.

Outside the diff, [vitest.config.ts:7](/C:/Users/38909/Documents/github/met/.claude/worktrees/nostalgic-noyce-f69e6b/vitest.config.ts:7) confirms discovery of the new test. No files edited, tests run, or photographs viewed.

### Claude

**Verdict:** nothing blocks the merge. The gate is green and correct on the real tree with both CRLF and LF line endings, and the proofs recorded in `gate-proofs.md` reproduce. There is one major finding: an ID list that is only half converted passes, and only its first ID gets checked. Below that are five minor findings and three nits.

**How I checked.** I edited nothing in the worktree. I ran lines 32–206 of `src/cited-images.test.ts`, unchanged, under Node from a scratch copy in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nostalgic-noyce-f69e6b\f8b7235f-6710-43df-bd94-e587c85bd2f2\scratchpad\harness`. I did not run Vitest.
- **Working tree and an LF copy:** 0 problems, 39 citations, 53 interior and 71 exterior entries.
- **`53a981c`'s sources and indexes:** 24 problems, as `gate-proofs.md` says: 22 mentions with no ID, the separated #35 at `kravis.ts:37`, and #29 at `choir-screen.ts:4`.
- **The two recorded mutations:** #33 set back to "Not viewed" gives the 7 listed problems at `interior-images.md:107`. #43 added at `park.ts:94` gives 1.
- **Other checks:**
  - The 4 detector tests pass on the copy.
  - `tsc --noEmit` is clean, and so is `eslint` on the new file.
  - Every cited ID is marked viewed, and IDs are unique in both indexes.
  - The author and file-name citations left in `src/model/` (Hałun 2023, Schneider 2019, Peel 2024, `1880_Met_Museum.jpg`, P1–P9 and others) all point at viewed entries.
  - The lesson's retirement follows `../fleet/docs/lessons-template.md`.

## Findings

**1. Major: `src/cited-images.test.ts:46` (`ID_LIST`) and `:143-149` (the check for separated IDs)**
- **What's wrong:** an ID written without its `#`, or a range, after the list is neither read nor failed. The separated-ID rule only sees `#<ID>`. The header (`:6`, `:11-14`) doesn't name this blind spot.
- **Failure scenario:** the tree's own forms from before the gate, with only the first `#` added, pass:
  - `interior-images.md #36 and 42` reads #36 only, 0 problems.
  - `exterior-images.md #6, 7 and 8` reads #6 only.
  - `#37–40`, `#37-40` and `#37..40` read #37 only.
  - `plan.ts:49` rewritten as `(interior-images.md #12 to 17: …)` gives 0 problems, although #14, #15 and #17 are "Not viewed".
- **Repair:** straight after the list, fail on `/^(?:, |,? and | to |[–—-]|\.\.)[A-Z]?\d{1,3}\b/`, with a message such as "writes 42 without its #: write each ID as #<ID>, a range as #37, #38, #39 and #40". Add these forms to the detector test and prove the gate red again.

**2. Minor: `src/cited-images.test.ts:49` (`\.\s` in `CLAUSE_END`)**
- **What's wrong:** any full stop followed by a space ends the clause, but the header (`:11`) says "the end of a sentence".
- **Failure scenario:** `(interior-images.md #33, J.-C. Benoist 2012, and #35, Haklai 2012)` reads #33 only, and #35 is never checked. `weston-facade.ts:3-4` already writes "J.-C. Benoist". `p. 76` and `fig. 110` cut the clause the same way.
- **Repair:** end a sentence only at a full stop followed by a capital letter, and only after a word of two or more characters; or state the `. ` bound in the header. Add this case to the detector test.

**3. Minor: `src/cited-images.test.ts:139`**
- **What's wrong:** the message for a mention with no ID offers "or leave the index's name out" as a fix. That takes the citation out of the gate.
- **Failure scenario:** `(interior-images.md, item 14)` fails. Following the advice to write `(item 14)` goes green, with #14 still "Not viewed".
- **Repair:** offer that option only for text that cites no photograph: "…; if it cites no photograph, reword it without the index's name."

**4. Minor: `docs/research/exterior-images.md:184` (entry #60) against `src/model/core/vaux-front.ts:3` and `:84-85`**
- **What's wrong:** #60 records "alternating light and dark grey voussoirs". The model alternates `core.granite` (#b9b4aa) with `palette.brick` (#9a4b3a, red).
- **Failure scenario:** the next session reads #60 as confirming the front, though its own words disagree with the model. The acceptance criterion at `plan.md:25` is ticked, but F-owner-3 (`:41`) covers only the article's text. `:33` lists no render of the west front seen from the Lehman court.
- **Repair:** compare `int-lehman-pyramid-up` with #60. If the dark voussoirs are brick, correct the entry; if not, add an F-owner-4.

**5. Minor: `src/model/core/choir-screen.ts:17-22` (`TIERS`)**
- **What's wrong:** #29's new reading puts the friezes 0.8–1.8 m lower and the cresting 1.85 m taller (F-owner-1). The code no longer cites #29 and has no note about the conflict.
- **Failure scenario:** the conflict is known but sits in no comment beside the code, the way the Weston head sat. `defect-register.md:17` says an out-of-scope discrepancy needs a follow-up with an owner. Here it lives only in a plan that will be marked complete.
- **Repair:** add a one-line comment beside `TIERS` citing `interior-images.md #29` and F-owner-1, or open a tracked follow-up.

**6. Minor: `docs/research/interior.md:141-142` (outside the diff)**
- **What's wrong:** the Dendur walking checks that `sackler.ts:6` and `plan.ts:110` rest on cite photographs "13, 14 and 39 to 41" and "14 or 38". #14 (`interior-images.md:70`) is still "Not viewed".
- **Failure scenario:** a model decision rests on an unviewed photograph through `interior.md`. The header's bounds exclude that file, but it is the lesson's defect at one remove.
- **Repair:** view and record #14, or drop it from those lists.

**7. Nit: citations whose entry doesn't support the claim**
- `lehman-plan.ts:9-10` credits the "sloped glass ceiling" to #30. #30's reading says the photograph doesn't show it is glass; the glass comes from exterior #9 (`plan.md:42`).
- `spaces-a.ts:152` credits grey pedestals to #P5. #P5's reading has only Diana's white pedestal; the grey pedestals are in #18.
- `choir-screen.ts:3-4` puts "#P8 and #44" right after "ES4661", so it reads as if ES4661 were #P8.

**8. Nit: ID collisions in the exterior index**
- "Epicgenius 2023 #30" now reads as entry #30 (Drost's fountains). It appears at `exterior-images.md:17` and `:39`, and in `hunt/walls.ts:5`, `order.ts:4` and `entablature.ts:5`. The change rewrote "#24–#45" as "frames 24 to 45" for this reason but missed these.
- #19 and [D12] (`:133`) are the same file, one viewed and one not. #12 also contains [E41]'s file.
- Neither index says IDs are permanent. A later renumbering could point a citation at a different viewed entry while the gate stays green.
- **Repair:** write "frame 30"; mark #19 "as [D12]"; add "IDs are never reused or renumbered" to `interior-images.md:11` and `exterior-images.md:7`.

**9. Nit: entry parser and test tidiness** (none of these affect the real indexes)
- **`(primary, viewed)`:** it counts anywhere in any entry, though the header (`:21`) says only a primary's heading.
- **`###` bodies:** a `###` entry's text runs over the numbered entries after it, up to the next heading. So `### 61. Foo (primary)` followed by `62. … Viewed.` marks 61 as viewed.
- **Duplicate run:** `checkRepository()` runs twice (`:213`, `:217`).
- **Magic number:** `8000` has no name, where `repo-conventions.test.ts:41` uses `BINARY_PROBE_BYTES`.
- **Error messages:** those at `:106` and `:219-220` say what happened but not what would fix it (R26).
- **Repair:**
  - End a `###` body at the next entry line.
  - Match `(primary, viewed)` on the heading line only.
  - Share one `checkRepository()` result between the two tests.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | A full stop ends the clause the stray-ID check reads, so initials (`J.-C.`), `fig.` and `p.` hide an ID written apart from the list: `#33, J.-C. Benoist 2012, and #14` passes with #14 unviewed (Codex, major; Claude 2, minor) | Accepted: a false negative inside the header's bounds | The clause ends only at a `)`, a `;`, a line's end or the next mention; detector cases for initials and `fig. 110`; proved red with `#33, J.-C. Benoist 2012, and #14` in `core/weston-facade.ts:3` |
| F1 | `(primary, viewed)` counts anywhere in an entry, where the header allows it on a primary's heading only (Codex, minor; Claude 9) | Accepted | Read on a `###` entry's heading line only; detector cases for a bullet and a numbered line carrying it |
| F2 | An ID written without its `#` after the list, or a range (`#36 and 42`, `#6, 7 and 8`, `#37–40`, `#12 to 17`), passes with only the first ID checked (Claude 1, major) | Accepted: a false negative the header did not name | `BARE_ID` fails a bare ID or a range straight after the list; detector cases; proved red with `#36 and 42` in `hunt/stair.ts:9` |
| F3 | The message for a mention with no ID offers leaving the index's name out, which takes a real citation out of the gate (Claude 3) | Accepted | It offers that only for text that cites no photograph; the unviewed message offers dropping a citation only where the model does not rest on it |
| F4 | Exterior #60 records grey voussoirs where the model has red brick, with no finding (Claude 4) | Accepted | Pixels sampled on #60 and the model rendered from the Lehman court at t = N: the photograph's dark voussoirs are grey stone, the model's red brick; F-owner-4 in `plan.md`; the model unchanged |
| F5 | The choir screen's conflict with #29 sits in no note beside the code (Claude 5) | Accepted | A note beside `TIERS` cites #29 and F-owner-1; the follow-up is the owner's to start |
| F6 | `interior.md` rests the Dendur walking checks on #14, still "Not viewed" (Claude 6, outside the diff) | Accepted | #14 viewed at full size and recorded; it shows no pool, so `interior.md`'s "14 or 38" for the walkway's rope is settled as 38, which shows it |
| F7 | Citations whose entry does not support the claim: #30 for the ring's glass, #P5 for grey pedestals, and #P8 and #44 placed after ES4661 alone (Claude 7) | Accepted | `lehman-plan.ts` cites #30 for the slope and exterior #9 for the glass; `spaces-a.ts` cites #P5 and #18; `choir-screen.ts` names both photographs in order |
| F8 | ID collisions: "Epicgenius 2023 #30" now reads as entry #30, #19 and [D12] are one photograph marked differently, #12 holds [E41]'s file, and neither index says IDs are permanent (Claude 8) | Accepted | "frame 30" in the index and in `hunt/walls.ts`, `order.ts` and `entablature.ts`; #19 marked viewed as [D12]; #12 names [E41]; both headers: an ID is never reused or renumbered |
| F9 | A `###` entry's text runs over the entries after it, the repository is read twice, `8000` is unnamed, and two messages name no fix (Claude 9) | Accepted | A `###` body ends at the next entry; one shared read; `BINARY_PROBE_BYTES`; the messages name the fix |

## Verification

- On the reviewed bytes (`1ce5977`): `npm test` passed 607 tests in 68 files; typecheck, lint and build passed. `npm run verify`'s e2e (MET_PORT 5347) passed 87 of 88: `tests/e2e/doors.spec.ts:379` failed, the slowest frame of the walked door cycles at 24 ms against 16.7 ms. After the owner's restart it was run alone three times: red 3 of 3 (20.2, 21.8 and 49.5 ms), then red 2 of 3 (37.3 and 18.7 ms, the third green at 12.0 ms). The same test on the unchanged base `53a981c`, in a throwaway worktree on the same machine within the hour, was red 3 of 3 (17.8, 17.7 and 16.8 ms). The app code differs from the base only in comments, so the failure is the machine's load, not the change; work unit 3 saw the same test fail once and pass alone.
- On the repairs: the gate's 7 tests pass, and the proofs in `docs/learning/gate-proofs.md` were run again on them: #33 marked "Not viewed" (7 problems), #43 cited (1), initials before #14 (1), `#36 and 42` (1), and `53a981c`'s sources and indexes (24, as before).
- Neither lane could view the photographs; the entries' readings rest on this session's viewing alone.

## Round outcome

No blocker. Both major findings, F0 and F2, were false negatives inside the gate's reach, and both lanes otherwise found the gate correct on the real tree and the recorded proofs reproducible (Claude reran them). All ten findings are accepted and repaired, with this record, in the commit after `1ce5977`. Review 1 re-reviews the repairs.
