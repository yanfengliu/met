# Review 2: implementation

## Target

Repository `met` (this repository): the repair of the open items of [review 1](1_implementation.md), as the diff `102adc3..5357bb5` (`git diff 102adc3 5357bb5`). It has 18 files, 438 insertions and 152 deletions, in five commits: `60c63e0`, `fa3546c`, `e750df0`, `558f30e` and `5357bb5`. Branch `repair2`, from `102adc3`, the head that review 1 examined.

The commits repair review 1's open items as follows:

- F1 and F8, the capture tests: `e750df0`.
- F7, the parts gallery's fallback view: `558f30e`.
- F11 and N1, the follow test and the frozen `window.__met`: `fa3546c`.
- A1 and N2, the section cut and the landscape materials: `60c63e0` and `5357bb5`.
- N3, README lines 61 and 62: `5357bb5`.

Recover the diff with `git diff 102adc3 5357bb5` and any file as Codex saw it with `git show 5357bb5:<path>`. The branch is deleted. Its head went into main as `bec9ba5` ("Merge the repair of review rounds 0 and 1"; parents `1df097d` on main and `5357bb5`). `bec9ba5` differs from `5357bb5` only in `docs/work/0_met-model/plan.md`, so the code of the merged revision is the code reviewed.

The diff that Codex received on stdin, `tmp/review-runs/r2.diff` (ignored path, 68,509 bytes, sha256 `1a2aad40c30e707166529d484358bbe0a3f489e91335083117a10b6147a7c579`), is byte-identical to `git diff 102adc3 5357bb5` regenerated when this record was written.

Scope: the diff only. The rest of the repair was covered by round 1 and the original code by [round 0](0_integration.md).

## Reviewers and coverage

Codex ran this round. Claude did not run: this was a focused check of a small diff, after both reviewers had covered the larger one in round 1. So the round has one reviewer, no second opinion and no dissent.

The prompt, `tmp/review-runs/prompt-r2.md` (ignored path), pointed to the round 0 record and listed round 1's items itself:

- F1 and F8: the capture tests now exercise the real call sites.
- F7: an e2e test of `parts.html?view=toString`.
- F11: the follow test checks camera position, target and fov.
- N1: `window.__met` publishes a deep-frozen copy, and nested writes cannot reach the follow camera.
- A1 and N2: every site landscape piece (trees, fountains and their water, lamps, benches, fences, curbs, plaza furniture) opts out of the section cut, and a test fails on any site material shared with the building.
- README lines 61 and 62 describe the current cut and follow rules.

For each item it asked for Verified, Partly fixed or Not fixed with file and line, and whether its test would fail if the fix were reverted. It then asked for any new defect (file and line, the defect, a failure scenario, a fix) and for at least two files and lines read outside the diff. It told the reviewer to dispatch no subagents unless the diff needs them, and then one at a time.

**Codex**

- Codex CLI 0.158.0, model `gpt-6-astra`, reasoning effort `xhigh`, sandbox `read-only`, approval `never`, as printed in its run log. Working directory: the `repair2` worktree. The diff came on stdin. 149,254 tokens. The prompt and diff files were written at 13:04:25 and its report at 13:09:47 (file times).
- It ran 20 PowerShell commands. They were file reads and searches (some in Vitest's own source); `git` reads (its first call failed with "dubious ownership" until it passed `-c safe.directory`); `tsc --noEmit --incremental false`, which passed; Vitest on `scripts/capture.test.ts`, `src/viewer/facts.test.ts` and `src/viewer/section-cut.test.ts`, 3 files and 23 tests, all passed; and a memory-only probe through Vitest's Node API. In the module transform the probe took out the capture validation calls, the deletion guard, the benchmark's solo query and the snapshot copy in `facts.ts`, and loaded the site files from `102adc3`. Under those reversions 10 of the 23 tests failed: 4 in `capture.test.ts`, 4 in `section-cut.test.ts` and 2 in `facts.test.ts`.
- Per its report it ran no browser test: the e2e tests were inspected, not run. Its F7 and F11 answers, and the browser half of N1, rest on reading them.
- The log shows no subagent spawn. The runbook's checks pass: the strings `STATUS_DLL_INIT_FAILED` and `-1073741502` appear twice in its log, both inside the printed round 0 record, not as failures, and the log has no policy block.
- Independence: its first command printed the round 0 record, and none of its 20 commands names `tmp/review-runs`, so it did not read the raw reports of round 1.

**Tree audit.** Codex's `git rev-parse HEAD` showed HEAD at `5357bb5`, and its last `git` check (`git diff --exit-code` and a list of untracked files) found no tracked change and no untracked file. That is a state check, not a content audit, and ignored paths are not covered. The worktree has been removed since, so it cannot be checked again.

**Missing coverage.** There was no second reviewer. The reviewer ran no browser test, took no capture and made no photographic comparison. Codex did not abstain: it returned a report.

## Reports

The report is quoted whole, line for line, with `> ` added at the start of each line (a bare `>` for an empty line) so that its own headings and table stay inside this record's structure. Nothing else was changed and nothing was removed: the file contains no transport chatter. It is Codex's `-o` final message, equal to the last message in its run log. The raw capture stays in ignored `tmp/review-runs/`. The report keeps its absolute local links as written; they point into the removed `repair2` worktree, and their line numbers are those of `5357bb5`.

### Codex

Source: `tmp/review-runs/codex-r2.txt`, 4,403 bytes, sha256 `7dc0f119c7054214b695b07090d29650d8cb6039b4a494590e367b8172a832d0`. Its table has one row for each of F1, F8, F7, F11, N1, A1, N2 and the README (this record's N3), and it names no new defect.

> Reviewed `5357bb5`. **All listed items are verified within the bounds below.** Typecheck and 23 focused unit tests passed. In-memory reversions triggered the capture, snapshot and landscape checks. No repository files changed; browser tests were inspected, not run.
>
> | Item | Assessment | Would the test fail if reverted? |
> |---|---|---|
> | **F1** | **Verified.** Tests invoke both CLI paths and the actual deletion call site: [capture.test.ts:119](C:/Users/38909/Documents/github/met-worktrees/repair2/scripts/capture.test.ts:119), [capture.test.ts:134](C:/Users/38909/Documents/github/met-worktrees/repair2/scripts/capture.test.ts:134). | **Yes, demonstrated** by removing the validation calls and deletion guard in memory. |
> | **F8** | **Verified.** The benchmark preserves `solo` at the selection’s `N`: [capture.ts:218](C:/Users/38909/Documents/github/met-worktrees/repair2/scripts/capture.ts:218). The test records benchmark URLs and checks both parameters: [capture.test.ts:128](C:/Users/38909/Documents/github/met-worktrees/repair2/scripts/capture.test.ts:128). | **Yes, demonstrated.** Removing the benchmark’s solo query failed the assertion. |
> | **F7** | **Verified.** The browser test navigates with `view=toString`, checks the warning, finite camera coordinates and equivalence to three-quarter: [smoke.spec.ts:27](C:/Users/38909/Documents/github/met-worktrees/repair2/tests/e2e/smoke.spec.ts:27). | **Yes, by inspection.** Restoring inherited-property acceptance breaks the warning/default-view assertions. |
> | **F11** | **Verified.** The test checks decreasing position, target and FOV errors, with a minimum number of FOV approaches: [camera.spec.ts:174](C:/Users/38909/Documents/github/met-worktrees/repair2/tests/e2e/camera.spec.ts:174), [camera.spec.ts:134](C:/Users/38909/Documents/github/met-worktrees/repair2/tests/e2e/camera.spec.ts:134). | **Yes for stalled interpolation, by inspection.** Bound: position/FOV convergence uses the published production goal; target correctness is checked independently at [camera.spec.ts:163](C:/Users/38909/Documents/github/met-worktrees/repair2/tests/e2e/camera.spec.ts:163). |
> | **N1** | **Verified.** Published step data passes through detached, recursive freezing: [main.ts:239](C:/Users/38909/Documents/github/met-worktrees/repair2/src/main.ts:239), [facts.ts:10](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/facts.ts:10). The browser test attempts nested writes before playback: [camera.spec.ts:97](C:/Users/38909/Documents/github/met-worktrees/repair2/tests/e2e/camera.spec.ts:97). | **Yes.** Disabling snapshot isolation failed both unit tests; the browser assertion’s sensitivity was inspected. |
> | **A1** | **Verified.** Actual landscape pieces are checked for clipping, shadow clipping and caps; trees and fountains also receive explicit whole-piece checks: [section-cut.test.ts:43](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/section-cut.test.ts:43), [section-cut.test.ts:57](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/section-cut.test.ts:57). | **Yes, demonstrated** with the prior site implementation loaded in memory. |
> | **N2** | **Verified.** Landscape copies preserve separate material identities: [materials.ts:29](C:/Users/38909/Documents/github/met-worktrees/repair2/src/model/site/materials.ts:29). The test compares materials collected from actual site/building pieces: [section-cut.test.ts:65](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/section-cut.test.ts:65). | **Yes, demonstrated.** Reversion detected six shared materials. |
> | **README** | **Verified.** [README.md:61](C:/Users/38909/Documents/github/met-worktrees/repair2/README.md:61) and [README.md:62](C:/Users/38909/Documents/github/met-worktrees/repair2/README.md:62) describe the implemented follow and landscape-cut rules. | **No text regression test.** Reverting only the prose would leave behavioral tests green. |
>
> **New defects introduced by this diff: none identified.**
>
> Outside the diff, I read the own-property lookup at [stage.ts:122](C:/Users/38909/Documents/github/met-worktrees/repair2/src/parts/stage.ts:122), interpolation at [camera-rig.ts:120](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/camera-rig.ts:120), and cap-pass exclusions at [viewer.ts:126](C:/Users/38909/Documents/github/met-worktrees/repair2/src/viewer/viewer.ts:126).

## Findings and disposition

IDs are those of [round 0](0_integration.md#findings-and-disposition) and [round 1](1_implementation.md#findings-and-disposition). The report calls the README item "README"; this record calls it N3. The verdict is the reviewer's own word. Every row is a repair of a round 1 item, so "Disposition" says whether the repair stands.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F1 | [Codex](#codex): Verified. Tests invoke both CLI paths and the actual deletion call site (`capture.test.ts:119`, `:134`). Would the test fail if reverted: yes, demonstrated by removing the validation calls and the deletion guard in memory. | Verified. Round 1's gap is closed: the tests now reach the call sites. | None. |
| F7 | [Codex](#codex): Verified. The browser test loads `view=toString` and checks the warning, finite camera coordinates and equivalence to the three-quarter view (`smoke.spec.ts:27`). Would the test fail if reverted: yes, by inspection, since accepting inherited properties again breaks the warning and default-view assertions. | Verified, within the stated bound: the browser test was inspected, not run. | None. |
| F8 | [Codex](#codex): Verified. The benchmark keeps `solo` at the selection's N (`capture.ts:218`); the test records the benchmark URLs and checks both parameters (`capture.test.ts:128`). Would the test fail if reverted: yes, demonstrated; removing the benchmark's solo query failed the assertion. | Verified. | None. |
| F11 | [Codex](#codex): Verified. The test checks that position, target and fov errors fall, with a minimum number of fov approaches (`camera.spec.ts:174`, `:134`). Would the test fail if reverted: yes for a stalled interpolation, by inspection. Bound, in its words: position and fov convergence use the published production goal, and target correctness is checked independently at `camera.spec.ts:163`. | Verified, within two stated bounds: the browser test was inspected, not run; convergence is measured against the goal the page publishes. | None. |
| N1 | [Codex](#codex): Verified. Published step data passes through a detached, recursive freeze (`main.ts:239`, `facts.ts:10`); the browser test attempts nested writes before playback (`camera.spec.ts:97`). Would the test fail if reverted: yes; disabling the snapshot isolation failed both unit tests, and the browser assertion's sensitivity was inspected. | Verified, within the stated bound for the browser assertion. | None. |
| A1 | [Codex](#codex): Verified. The test checks the actual landscape pieces for clipping, shadow clipping and caps, and trees and fountains for whole-piece behaviour (`section-cut.test.ts:43`, `:57`). Would the test fail if reverted: yes, demonstrated with the previous site code loaded in memory. | Verified. | None. |
| N2 | [Codex](#codex): Verified. Landscape copies keep separate material identities (`site/materials.ts:29`); the test compares the materials collected from the actual site and building pieces (`section-cut.test.ts:65`). Would the test fail if reverted: yes, demonstrated; the reversion found six shared materials. | Verified. | None. |
| N3 | [Codex](#codex) (its "README" row): Verified. `README.md:61` and `:62` describe the follow and landscape-cut rules as implemented. Would a test fail if reverted: no. There is no text regression test, so reverting only the prose leaves the behavioural tests green. | Verified, within that bound: the README is checked by reading only. | None. |

## Verification

On the target, by the reviewer: `tsc --noEmit --incremental false` passed, and 23 unit tests in three files passed. Under its memory-only reversions 10 of those 23 failed (see Reviewers and coverage). Browser tests were inspected, not run.

On the merged revision `bec9ba5`, as the plan records: `npm run verify` green, with 315 unit tests in 32 files and 26 e2e tests. `tmp/review-runs/verify-final.log` agrees with those numbers. It shows `npm run verify` in the worktree `final` starting at 13:05, then 315 of 315 unit tests in 32 files, typecheck, lint and build clean, and 26 of 26 e2e tests. The log prints no revision; it started 24 seconds after the merge commit was made (13:04:54).

The coordinator also reports a capture at `bec9ba5` that shows the park trees whole under the section cut. No image from it is kept: no PNG or JPG newer than 13:00 exists under the main checkout or its worktrees, so this line rests on the report.

Checks run while writing this record (records worker, 2026-10-14):

- Revisions and counts: `102adc3`, `5357bb5` and `bec9ba5` exist; `102adc3` is an ancestor of `5357bb5`, and `5357bb5` of `bec9ba5`. `git diff --name-only 102adc3 5357bb5` lists 18 files (438 insertions, 152 deletions) and `git rev-list --count 102adc3..5357bb5` is 5. `git diff 5357bb5 bec9ba5` touches only `docs/work/0_met-model/plan.md`, with 3 insertions and 3 deletions.
- Merge and push: in the reflogs of the main checkout, `main` moved to `bec9ba5` by fast-forward at 13:10:13 ("merge final") and `origin/main` was updated by push at 13:10:15 (both -0700). Both are after the report (file time 13:09:47). The merge commit itself was made at 13:04:54, on a branch `final`, while the review ran.
- Stdin diff: `tmp/review-runs/r2.diff` equals `git diff 102adc3 5357bb5` byte for byte (sha256 above).
- Raw log: the run header, the command list and the last message of the Codex log were read for every fact under Reviewers and coverage, including the output of the Vitest run and of the memory-only probe. The `-o` file equals the last message in the log.
- The runbook's checks: the Codex log matches the DLL-failure strings twice, both inside the printed round 0 record, and has no policy block.
- Quotation: with the `> ` prefix removed and the last line's newline dropped, the quoted report is byte-identical to its raw file (sha256 above).
- Structure: `node scripts/work-docs.mjs check` from the fleet checkout, pointed at this worktree, exited 0 with one work unit. It checks only the file names, the six required sections and contiguous round numbers, not whether the text is true.

Not checked here: the file-and-line citations inside the report (quoted as authored; the links point into the removed `repair2` worktree, so recover any cited file with `git show 5357bb5:<path>`), a rerun of the reviewer's reversions, and the browser tests. Not available: a second reviewer, and any retained image of the `bec9ba5` capture.

## Round outcome

Clean. Codex found all eight items Verified (F1, F7, F8, F11, N1, A1, N2, N3) and no new defect, so nothing is left to repair. No finding was rejected and nobody dissented.

Bounds of this verdict: one reviewer ran, with no second opinion. Browser tests were inspected, not run, so the F7 and F11 answers and the browser half of N1 rest on reading them. The F11 test measures position and fov convergence against the goal the page publishes, with the target checked independently. The README has no text test, so reverting only its prose would pass every test. Coverage belongs to `102adc3..5357bb5`.

`bec9ba5` (main plus `repair2`) reached main by fast-forward at 13:10:13 and was pushed at 13:10:15, after this report was written. This record is history; the plan holds the current status.
