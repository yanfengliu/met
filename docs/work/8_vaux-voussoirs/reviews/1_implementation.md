# Review 1: implementation

Moved here from work unit 4's folder (its review 7) on 2026-10-28, once the fleet allocator accepted met's reserved ID gap (fleet `162da10`); the round's findings keep their numbers, F0 to F29 across this unit's rounds 0 to 3.

## Target

The integrated change `git diff 00eeee7 2308ed8` in the worktree `adoring-lamarr-f5704f`: commit `5adc4ab` (round 0's repaired patch) merged with main `00eeee7` as `2308ed8`, whose diff against main is this follow-up's ten files (its diff's sha256 30d016a39df5593f9f6c320f94175e13d8250c1ec35f533157c8f99f744cdd1c). Both reviewers read round 0's record.

## Reviewers and coverage

- Codex: `gpt-6-astra`, `xhigh`, `--sandbox read-only`, codex-cli 0.163.0. It read the code and docs (batch.ts:41, core.test.ts:55, closure.test.ts:152, testing.ts:90, cited-images.test.ts:159 outside the diff), ran read-only probes and the gate's parser in memory (50 citations, no problem), and did not view the photographs. Its log has one match for `STATUS_DLL_INIT_FAILED`: its read of round 0's record, which quotes the marker; 21 commands succeeded and no sandbox failure occurred.
- Claude: `claude-opus-5-5[1m]`, `--effort max`, claude 2.1.308, no subagents (Task and Agent disallowed), tools Read, Glob, Grep and git diff, log and show. Its `modelUsage` holds only the pin, so the lane is kept. It read the code and docs, viewed the photographs and renders, and ran the citation, core, closure, sequence, section-cut, conventions, Weston-door, timeline and cap-pass tests (85 passed); its runs overlapped e2e tests 22 and 23 of the author's verify, which passed. It asked to have its derived crops deleted from its own scratchpad.

## Reports

Redacted: 1 path(s) of the reviewers' own scratchpads, which name their sessions.

### Codex (gpt-6-astra)

**Two minor findings; no blocker or major code defect found.** Reviewed `00eeee7..2308ed8`; the saved diff matches that target.

1. **Minor — some conflict citations exceed their recorded observations.**  
   [vaux-front.ts:71](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/vaux-front.ts:71) and [exterior.md:158](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior.md:158) attribute “no hood” to #60 and #63, and an inner ring to #63. Neither [#60’s entry:184](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:184) nor [#63’s entry:194](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:194) records those observations.  
   **Failure scenario:** a later modeller treats these as independently recorded corroboration because the citation gate passes.  
   **Repair:** cite #64 for the absent hood and #61/#64 for the inner ring, or have the visual reviewer explicitly record the additional observations. This finding concerns attribution, not whether the photographs actually show those features.

2. **Minor — permanent review provenance remains outstanding, as acknowledged.**  
   [summary.md:5](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/devlog/summary.md:5) leaves the plan and reviews awaiting allocation, whereas [AGENTS.md:60](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/AGENTS.md:60) requires their permanent archive under `docs/work/`. Round 0 is still only at the supplied external location.  
   **Failure scenario:** a clean checkout cannot recover the accepted findings, dispositions or measurement-method record.  
   **Repair:** resolve the documented allocator blocker and commit the plan and authored review rounds before final integration.

Round 0 disposition check:

| Finding | Target assessment |
|---|---|
| F0 | Repaired: devlog distinguishes modern observations from the stereograph’s tonal inference. |
| F1 | Method repaired: [C7] specifies the denominator and unrounded measurements; patch boxes are recorded. The rounded entries do not establish a remaining numerical contradiction. |
| F2 | Repaired: five isolated-stone samples, two coarse samples and one descriptive-only image are distinguished. |
| F3 | Conflict notes are present beside the relevant builders and in section 9; finding 1 concerns their attribution. |
| F4 | Repaired: history and [C7] explicitly identify west-front granite as an inference. |
| F5 | Repaired: “Sampled since” supplies brick measurements and names the disagreement. |
| F6 | Repaired: render ratios consistently say approximately 0.62, with 0.61–0.63 in [C7]. |
| F7 | Repaired: #63 and its patch boxes are included in the five-photograph calculation. |
| F8 | Repaired: roundel wording, stereograph ownership and the side-wall citation are corrected. |

Other review lenses:

- **Materials, batching and budgets: no finding.** Read outside the diff: [batch.ts:41](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/build/batch.ts:41) and [core.test.ts:55](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/core.test.ts:55). Read-only probes found 36 changed ring pieces, unchanged core totals of **130 meshes / 197,852 triangles**, and identical collision, shadow and section-cut eligibility. Maximum westward projection remains **0.06 m**.
- **Closure and determinism: no finding.** Reviewed [closure.test.ts:152](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/closure.test.ts:152) and [testing.ts:90](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/build/testing.ts:90). Changed rings pass `openAlong`; core sheet counts remain unchanged. Twelve sampled timeline histories match fresh evaluations byte-for-byte.
- **Citation parsing: no finding.** Executed the unchanged parser functions from [cited-images.test.ts:159](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/cited-images.test.ts:159) in memory: **50 citations, zero problems**.
- **Source-format rules: no additional finding.** Changed source files remain below 500 lines; `git diff --check` is clean.

I did not view photographs, independently remeasure image samples, or run the full Vitest/e2e gates. The probes above have narrower bounds. No files were edited, no subagents were used, and HEAD remained `2308ed8`.

### Claude (claude-opus-5-5[1m])

I found no blocker. There is one major finding, three minor and five nits. Round 0's nine findings are all repaired, but the repair for F8 introduced the major one. Code, tests and the full gate are green on `2308ed8`.

## Findings

**1. Major: the F8 repair cites #65 for the side walls, and #65 contradicts them there.** Nothing records the conflict.
- **Where:** `src/model/core/vaux-shell.ts:276-281` (the new header; #65 at :279). The code it sits beside is the bay loop at `vaux-shell.ts:292-297` and `sideBay` at `vaux-shell.ts:72-83`.
- **What the model builds:** banded pointed arches in all 11 bays on each side. `SIDE_LINES` (`vaux-shell.ts:67`, `constants.ts:51`) puts bays 0–2 (Z −134.37 to −117.42) in the west pavilion and bays 9–10 (Z −83.53 to −72.23) in the east pavilion.
- **What #65 shows:** I viewed it at 3×. The south side has banded pointed arches only along the hall's six-bay arcade, between two taller blocks.
  - Both blocks' south faces have round-headed windows and blind round arches on two storeys, with plain brick heads.
  - The arcade's ground storey is light rusticated stone, where the model has brick.
  - #65's own entry says "every arch's voussoirs alternating light and dark" (`exterior-images.md:196`), which those round heads contradict.
- **Not recorded:** neither `exterior.md:158` nor any code note mentions it. Round 0's snapshot cited only #66 and #67 here, so this came with the F8 repair.
- **Why it matters:** it is the citation gate's own defect class, "a guessed form stands beside the photograph that contradicts it" (`docs/learning/gate-proofs.md:7`), and the same class as round 0's F3, which was accepted as major.
- **Failure scenario:** a later session sees #65 cited, the gate green and section 9 silent, so it keeps the banding. The 1880 chapter then plays five banded pavilion bays a side where the photograph shows plain round-headed windows.
- **Repair:**
  - Add a section 9 line and an "Open with the owner" note at the bay loop.
  - Narrow the header's claim to the hall's six bays.
  - Change #65's entry to "every pointed arch's".

**2. Minor: the records disagree on the west front's arch count, and the code cites both beside "seven pointed arches".** This one rests on my inference.
- **Where:** `vaux-front.ts:2-7` and `FRONT_ARCH_X` at `vaux-front.ts:24`. The count is an estimate in `constants.ts:40`: "7 arches across 29 m (Lehman-court photo shows 5 of them)".
- **Evidence against seven:**
  - #65's entry (`exterior-images.md:196`) gives the west front as a porch beside two large arches, then a taller block. At 3× a third banded arch's haunch shows behind the porch's gable, and only two arches stand south of the porch, where the model has three south of the entrance.
  - #66 shows the east front with two large arches either side of the middle, and section 9 already records that against the model's seven east arches.
  - #64 and #60 show five arches, the outer two with windows, which fits two either side of the entrance.
- **The two entries disagree:** #49 (`exterior-images.md:170`) describes "a long front of seven pointed arches… between two taller end blocks… at the right end a porch". That is how #65 shows a long side, yet `vaux-front.ts:5` calls #49 "the west front beside its porch".
- **Failure scenario:** the owner settles section 9's conflicts and never questions the count.
- **Repair:** record the count as an open question in section 9, put a note at `FRONT_ARCH_X`, and say in #49 or #65 which face each shows.

**3. Minor: the unit's plan and reviews live outside the repo, and the devlog carries a status sentence.**
- **Where:** `docs/devlog/summary.md:5` ends "wait for a work-unit ID, which the fleet's allocator still refuses".
- **What's wrong:** canon R24 keeps plans and reviews in `docs/work/<id>_<theme>/`. Fleet `docs/work-docs.md` says a devlog "does not become another work-status list", and that an allocator blocker is to be reported and recovered, not worked around.
- **Failure scenario:** after the merge, the F0–F8 dispositions exist only under AppData. A successor, assuming nothing outside the repo survived (R7), can't trace them, and the devlog keeps "still refuses" after an ID is allocated.
- **Repair:** run `work-docs.mjs recover` or escalate. Land the plan and reviews with the merge, and drop the sentence.

**4. Minor: the new gate-lock rule leaves out the lock's 30-minute bound.**
- **Where:** `docs/policies/local-rules.md:8` makes the ignored `tmp/gate.sh` mandatory (ignored by `.gitignore:154`).
- **What the script does:** it breaks any lock held over 30 minutes (`gate.sh:5`, `:15`). Its exit trap (`:11`, `:25`) removes the lock without checking it still owns it.
- **Failure scenario:** a gated command over 30 minutes, such as three 4× throttled e2e runs in one command (AGENTS.md, Load), loses its lock to a waiter. When it finishes, its trap deletes the waiter's lock and a third gate starts, so two or three expensive gates run at once. On a fresh machine the path doesn't exist, and unlike the gallery rule at :7 there is no fallback.
- **Repair:** state the bound in the rule, track the script or say how to recreate it, and make `release()` check the owner first.

**Nits**
1. **Double-rounding slips.**
   - #64's dark green is written "108" but the unrounded value is 107.49 (`exterior-images.md:195`).
   - #67's dark blue is written "95" but is 94.49 (`:198`).
   - [C7]'s photograph means run "0.53 to 0.75", but #64's is 0.7445, so 0.74 (`exterior.md:147`).
   - The first two were already in round 0's target; the third came with the F1/F7 repairs. Anyone rerunning `ratios.py` gets 107, 94 and 0.74.
2. **Small overclaims of the F0, F2 and F4 kinds.**
   - `vaux-front.ts:91` says "in every photograph of the front", but #49 and #65 are monochrome prints.
   - `exterior.md:147` says "Sampled since (… #60 to #67)", but #66 was only described.
   - `interior.md:249` says "its light and dark granite", which [C7] calls an inference.
3. **Commit `5adc4ab`'s message** says #65 and #66 "show them as grey stone, never brick". That is round 0's F0 overclaim again; #66's entry says "too small to read the stones". The commit is unpushed, but rewording it rewrites history, which needs your authorization.
4. **A circular pointer.** `exterior.md:158` cites "([C7])" for the render's (87, 31, 24), but [C7] holds neither the value nor which render; it points back to section 9.
5. **Render coverage (canon R16).** The renders cover only the west front. The 22 side and 7 east dark rings also changed; read the 1880 chapter's end aerial when main's shots are taken for the gallery.

## Round 0 repairs
- **F0, F2 and F4–F8:** repaired as their dispositions describe.
- **F1:** repaired, and every [C7] bound reproduces from the boxes: 0.408–0.818 a patch, a mean of 0.633, within 0.207, and 0.105 under the brick.
- **F3:** repaired for the five conflicts it named, with notes at `vaux-front.ts:30`, `:47` and `:71`, and `vaux-shell.ts:307`.
- **F7:** #63's patches sit inside single stones, two rock-faced dark and two smooth light, and give its entry's values exactly.
- **Section 9 against the images:** the hood, inner ring, doorways, the east front's roundels and both brick values check out against the photographs and renders. The renders read 0.612–0.626 a channel, and 0.476–0.482 at 0.61×.
- **#66's roundels and stair:** #66 shows four arches, each with a roundel in its head. Heckscher calls the middle "temporary covered wooden stairs" (`bulletin.txt:766`).

## Lenses with no finding
- **Code.**
  - Batching is by object identity (`batch.ts:41`), so the mesh count is unchanged.
  - The trim rule (`core.test.ts:55`) now counts the ring as trim; it projects 0.06 m.
  - `SHEETS` (`closure.test.ts:112`) counts the tympanum panels; the ring isn't a sheet.
  - The cut clips every material that doesn't opt out (`section-cut.ts:41`).
  - The material is created once (`spec.md:73`, `:77`).
  - Only the two Vaux builders use alternating rings.
- **Citations:** all new ones parse, #61–#67 are marked viewed, and the IDs are the next free numbers.
- **Repo conventions:** files are under 500 lines and `git diff --check` is clean.
- **The merge:** `git diff 5adc4ab 2308ed8` is exactly main's own seven files.

## Checks and gate state
- I ran Vitest at `2308ed8` on the citation, core, closure, sequence, section-cut, repo-conventions and Weston-door tests: 49 passed. Timeline and cap-pass: 36 passed.
- Without knowing it, my runs overlapped e2e tests 22–23 of the author's `verify-5`, the door-swing frame budget among them. That test passed at 12.50 ms.
- `npm run verify` passed on `2308ed8`: 650 unit tests, typecheck, lint, build and 84 e2e (`tmp/lehman/verify-5.log:37`, `:203`).
- I edited no repo file. My delete of the derived photo crops was declined; please delete `[the reviewer's own scratchpad]`.
- The change alters renders, so after the merge the render gallery needs republishing (`local-rules.md:7`).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F9 | Section 9 and the hood note cite #60 and #63 for "no hood" and #63 for the inner ring, which their entries did not record (Codex 1) | Accepted: the author viewed both again and both show it | #60's and #63's entries record it (`8880074`) |
| F10 | The plan and reviews live outside the repo, and the devlog carried a status sentence (Codex 2, Claude 3) | Status sentence accepted and dropped (`425cacf`); landing the plan and reviews is blocked: the fleet's allocator refuses every allocation in met, and the main checkout holds another session's uncommitted registry change for ID 6, so `recover` could disturb it | Escalated to the coordinator with this unit's report; the plan and reviews wait in the session notes folder, ready as `docs/work/<id>_vaux-voussoirs/` |
| F11 | The F8 repair cites #65 for the side walls, and #65 shows banded pointed arches only on the hall's six bays, the end blocks with round-headed windows with plain brick heads, where the model bands all eleven bays (Claude 1, major) | Accepted: the author saw the same at 2× | Section 9 records it; a note at the side bay loop; the header claims the hall's arcade only; #65's entry says every pointed arch and describes the blocks (`425cacf`) |
| F12 | The west front's count of seven arches is an estimate the photographs question: five in the Lehman court, two south of the porch in 1880 (Claude 2) | Accepted: the author saw a third arch's head behind the porch's gable and two south of it | Section 9 records it as likely five; a note at `FRONT_ARCH_X`; #65's entry names the west front and the south side (`425cacf`) |
| F13 | The gate-lock rule omits the lock's 30-minute bound, the script's `release()` removes the lock without checking its owner, and a fresh machine has no script (Claude 4) | Accepted for the rule; the script is the coordinator's and other sessions were running it, so it is not edited mid-use | The rule states the bound, splitting longer sets, and how to recreate the lock (`425cacf`); `release()` checking its owner goes to the coordinator as a follow-up |
| F14 | Double rounding: #64's dark green 108 for 107.49, #67's dark blue 95 for 94.49, [C7]'s photograph means up to 0.75 for 0.7445 (Claude nit 1) | Accepted | 107, 94 and 0.74 (`425cacf`) |
| F15 | Small overclaims: "every photograph" beside monochrome prints, "Sampled since (#60 to #67)" with #66 only described, interior.md calling the stones granite (Claude nit 2) | Accepted | "Every colour photograph"; the brick samples name #60 and #64; interior.md says grey voussoirs (`425cacf`) |
| F16 | Commit `5adc4ab`'s message says #65 and #66 show the dark voussoirs as grey stone (Claude nit 3) | Accepted; the commit is not rewritten (history) | `425cacf`'s message records the correction |
| F17 | Section 9 points to [C7] for the render's (87, 31, 24), which [C7] does not hold (Claude nit 4) | Accepted | Section 9 names the render's camera and t (`425cacf`) |
| F18 | The renders cover only the west front; the side and east rings changed too (Claude nit 5) | Accepted | The 1880 chapter's end aerial and every standard shot that differs is read at native resolution when main's shots are taken for the gallery |

Correction (2026-10-28, after round 3): F10's records did land in the repo, in work unit 4's folder as its follow-up on F-owner-4 (plan.md and reviews 6 to 9), as the choir screen's follow-up on F-owner-1 had landed there (reviews 4 and 5); the allocator's refusal stands.

Correction (2026-10-28, later): once the fleet allocator accepted met's reserved ID gap (fleet `162da10`), the records moved from work unit 4 into this unit of their own, work unit 8.

## Verification

`npm run verify` passed on `2308ed8` through the gate lock: 650 unit tests, typecheck, lint, build and 84 e2e (14.4 min). On the repairs (`425cacf`, `8880074`): `npm test` 650 passed, typecheck and lint clean, the citation gate green; the full verify of `8880074` runs through the lock.

## Round outcome

No blocker. One major (F11) and nine lesser findings: all accepted, F10's landing of the plan and reviews blocked by the allocator and escalated, F13's script change left to its owner. The repairs, docs and comments only, get a focused round 2 on `git diff 2308ed8 8880074`.
