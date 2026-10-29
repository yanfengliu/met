# Review 9: implementation

This round belongs to work unit 4's follow-up on F-owner-4, the 1880 fronts' voussoirs (plan.md, "Follow-up: F-owner-4 acted on"); it is that follow-up's round 3. Its findings were numbered F0 to F29 while the follow-up waited for a work-unit ID, and the reviewers' reports keep those numbers; within work unit 4 they are F40 to F69 (add 40), after the choir screen's F25 to F39.

## Target

Round 2's repairs, `git diff 8880074 b80dac8` (commits `064a843` and `b80dac8`; `the diff of its target revisions`, sha256 fdda1f06339e52b9cd74eacacbedcda5363e2ae36706f64f1965bd7209885f03). Both reviewers read rounds 0 to 2.

## Reviewers and coverage

- Codex: `gpt-6-astra`, `xhigh`, read-only sandbox, codex-cli 0.163.0; 13 commands succeeded, no sandbox failure. It read the records and code (cited-images.test.ts:159 and constants.ts:40 outside the diff), ran the gate's parser in memory (55 citations, no problem) and checked that the TypeScript changes leave the emitted code and the doc comments' attachment unchanged. It did not view the photographs.
- Claude: `claude-opus-5-5[1m]`, `--effort max`, no subagents, its `modelUsage` only the pin: kept. It read the records, code and the gate lock's script, viewed #49, #60 and #65 (digests in its report), and replayed the gate's scan over `src/model/` (55 citations, no problem). It asked to have its scratch files deleted from its own scratchpad.

## Reports

Redacted: 3 path(s) of the reviewers' own scratchpads, which name their sessions.

### Codex (gpt-6-astra)

**One minor finding; no blocker or major findings.**

**Minor — the north-side description exceeds the recorded evidence.** [exterior.md:158](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior.md:158) attributes rusticated ground-storey stone, square-headed openings and three-tier end-block openings to both sides. [vaux-shell.ts:8](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/vaux-shell.ts:8) repeats the rustication claim. However, [#49:170](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:170) records the north ground storey **behind a grassy mound** and gives no tier count. Those details are recorded for the south side in [#65:196](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:196).

A later modeller could treat the northern base and tier count as photographically established. **Repair:** distinguish the observations of both sides from the south-only details; explicitly label any extension to the north as an inference, including in the shell comment.

All seven dispositions have corresponding repairs:

| ID | Assessment |
|---|---|
| F19 | Window wording now matches the recorded outer two windows. |
| F20 | #60 records five arches and their openings; doorway citations include #60 and #64. |
| F21 | #49’s corrected count, orientation and cross-references are present; qualification above remains. |
| F22 | Ground-storey evidence and shell notes are added; qualification above remains. |
| F23 | #65 now says three tiers. |
| F24 | Section 9 points to `FRONT_ARCH_X`. |
| F25 | Reconstruction instructions require releasing only an owned lock. |

Outside the diff, I read [cited-images.test.ts:159](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/cited-images.test.ts:159) and [constants.ts:40](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/constants.ts:40). The existing parser, executed in memory, found **55 citations and zero problems**; a malformed control failed correctly. TypeScript confirmed unchanged executable output and attached JSDoc for `FRONT_ARCH_X`, `sideBay` and `vauxSideTrim`. The saved diff matches the target; whitespace checks pass.

No files edited or subagents used. Photographs, Vitest and e2e were not run/viewed.

### Claude (claude-opus-5-5[1m])

# Review round 3: the repairs `8880074..b80dac8`

All seven round-2 findings, F19 to F25, are repaired as their dispositions say. There's no blocker or major finding. The new photo claims hold against the images: #49's north side, its six arches and the two arches north of the porch, #60's five arches, and #65's three tiers and rusticated ground storey. One repair cites #49 for something its entry says it doesn't show (one minor finding), and there are three nits.

## Findings

**1. Minor: section 9 and the shell's header cite #49 for the north side's ground storey, which #49's entry says is hidden.**
- **Where:** `docs/research/exterior.md:158` says "over a ground storey of light rusticated stone with small square-headed openings … on three tiers (#49 on the north side, #65 on the south)". `src/model/core/vaux-shell.ts:7-9` puts "over light rusticated stone" under "(exterior-images.md #49 and #65)".
- **What's wrong:** #49's entry (`exterior-images.md:170`) says "its ground storey behind a grassy mound". It records neither rusticated stone nor three tiers.
- **What the image shows:**
  - At 3× the mound hides the arcade's ground storey.
  - At 7× with contrast, there is only a strip of light stone and the head of one dark opening beside the tower (about x 545–603, y 619–641).
  - The west block's north face does show three tiers of round heads, but the entry doesn't record them.
- **Why it matters:** this is F9's and F20's defect class, and the F21/F22 repair brought it in.
- **Failure scenario:** the owner settles both side walls' ground storey from what is really one side's evidence. Or a reviewer opens #49 for the north side's ground storey and finds the entry saying the mound hides it.
- **Repair:**
  - Cite #65 alone for the ground storey and say #49's mound hides the north side's. Alternatively, record the strip by the tower in #49's entry and claim no more.
  - Record the three tiers in #49's entry if section 9 keeps citing #49 for them.
  - Make the header's citation match.

**2. Nit: `src/model/core/constants.ts:40` (outside the diff) still reads "7 arches across 29 m (Lehman-court photo shows 5 of them)".**
- **What's wrong:** section 9 now concludes "so the front has five", so the photograph shows the whole front, not 5 of 7. F24 moved section 9's pointer to `FRONT_ARCH_X`, which leaves this comment with no owner note, contradicting section 9. `vaux-front.ts:2` also states "seven pointed arches" as fact.
- **Failure scenario:** a session tuning `VAUX_BAY` reads the photograph as a partial view and keeps seven arches at 4 m.
- **Repair:** replace the parenthetical with a pointer: "seven is open with the owner (exterior.md section 9; `FRONT_ARCH_X`)".

**3. Nit: `src/model/core/vaux-shell.ts:73`, the note at `sideBay`, names only the end bays' round heads.**
- **What's wrong:** `sideBay` also cuts the segmental ground-storey hole in all eleven bays (`:77`), added in brick (`:98`). The six hall bays' rusticated ground storey is noted only in the file header (`:8`). The devlog's "noted beside its code" holds for it only through that header.
- **Failure scenario:** a session working from this note gives the end bays round heads and keeps the hall bays' segmental brick ground storey, believing it matches the photographs.
- **Repair:** add "and the hall's six bays stood on light rusticated stone with small square-headed openings" to the note.

**4. Nit: how #60 was read differs between two records.**
- **What's wrong:** #60's entry (`exterior-images.md:184`) says the five arches were read "at 3×". F20's disposition (`2_implementation.md:153`) says the author saw them "at native size". 3× is the scale round 2's Claude lane used (`:58`).
- **Failure scenario:** a later check can't tell whose reading the entry records.
- **Repair:** make both records give the scale the author actually used.

## F19 to F25

| ID | Verdict |
|---|---|
| F19 | Repaired (`064a843`). "A central doorway and windows in the outer two" matches #60, #64 and the note at `vaux-front.ts:23-24`. |
| F20 | Repaired. In #60 at 3×, arches 2 and 4 stand partly behind the court's jambs but are open, with gallery interiors behind. Section 9's doorways cite #60 to #64. |
| F21 | Repaired, with finding 1. #49 must be taken from the northwest, because the porch (west) end is at the right. I counted six banded arches at 3×, the sixth against the tower, and two arches north of the porch. The first reading is kept. #49 is cited in section 9 and at `vaux-front.ts:24`, `vaux-shell.ts:9`, `:73` and `:296`. |
| F22 | Repaired, with finding 1 and nit 3. #65 at 3× shows light rusticated stone with small square-headed openings under all six bays. |
| F23 | Repaired. Both end blocks in #65 show round-headed openings on three tiers. |
| F24 | Repaired. The note sits above `FRONT_ARCH_X`'s doc comment (`vaux-front.ts:23-26`). See nit 2. |
| F25 | Repaired. The rule names the gap the live script has: `gate.sh:11` releases without an owner check, and `:15` breaks a lock at 1800 s. |

"So the front has five" replaces round 1's "likely five". I checked whether the porch could hide more than one arch. In #65 its west gable spans about 53 px (x 262–315), against 64 px between the two south arches' centres (x 449 and 513). A porch that narrow could not hide arches at ±4 m, so a 4 m layout would show three arches south of it, not two. The conclusion holds.

## Checks and reads

- **Diff:** the saved `target.diff` is byte-identical to `git diff 8880074 b80dac8` (sha256 `fdda1f06…`). `git diff --check` is clean. The `.ts` changes are comment-only, and `eslint.config.js` has no comment rules.
- **Citations:** I re-ran the scan from `src/cited-images.test.ts` (`:57-73`, `:147-190`) read-only over `src/model/`:
  - 55 citations (53 before, plus the new ones at `vaux-shell.ts:9` and `:73`), no problem, and every cited ID is marked viewed.
  - The scan also caught both malformed test inputs.
  - Vitest was not run.
- **Doc comments:** `FRONT_ARCH_X` (`vaux-front.ts:25-26`), `sideBay` (`vaux-shell.ts:74-75`) and `vauxSideTrim` (`:279-285`) are still attached to their declarations.
- **Images viewed:** #49 (`0b998487…`), #60 (`956f8c06…`) and #65 (`a7114b22…`). Their sizes match the entries.
- **Read outside the diff:**
  - `constants.ts:34`, `:40`
  - `vaux-front.ts:1-9`, `:32-33`, `:105`
  - `vaux-shell.ts:67-98`, `:279-323`
  - `exterior.md:147`
  - `exterior-images.md:192-198`
  - `history.md:27`
  - `/c/Users/38909/Documents/github/met/tmp/gate.sh`
  - `plan.md`
  - round 1's dispositions

**Outside the target:** `plan.md:26` still says "0.53 to 0.75", which F14 corrected to 0.74 in the repo. `plan.md:18` doesn't list the side walls or the arch count that section 9 now records. Both will land with the plan.

I edited no repo file and used no subagents; the worktree is clean at `b80dac8`. My delete of my own scratch files was declined, so please delete:
- `[the reviewer's own scratchpad]`
- `[the reviewer's own scratchpad]`
- `[the reviewer's own scratchpad]`

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F26 | Section 9 and the shell's header cite #49 for the north side's rusticated ground storey and three tiers, where #49's entry says a mound hides the ground storey and gives no tiers (Codex; Claude 1) | Accepted | Section 9 and the shell's header and `sideBay` note cite #49 only for the six banded bays and the end blocks' round-headed openings, and #65 for the south side's ground storey and tiers; section 9 says the mound hides the north side's (`e1042fd`) |
| F27 | `VAUX_BAY`'s comment and `vaux-front.ts`'s header still state seven arches as fact (Claude nit 2) | Accepted | Both point to section 9 (`e1042fd`) |
| F28 | The `sideBay` note names only the end bays' heads, not the hall bays' ground storey, which `sideBay` cuts in brick (Claude nit 3) | Accepted | The note names the ground storey, on the south side seen whole (`e1042fd`) |
| F29 | #60's entry says the five arches were read at 3×, F20's disposition at native size (Claude nit 4) | Accepted: the author read them on a native-size crop | The entry says native size (`e1042fd`) |
| — | The plan still says 0.53 to 0.75 and its scope omits the side walls and the arch count (Claude, outside the target) | Accepted | The plan is brought up to date |

## Verification

`e1042fd` changes records and comments only; on it the citation, core and conventions tests (22) passed, typecheck and lint are clean, and the full `npm run verify` runs through the gate lock (result in the plan). `b80dac8` passed the full verify: 650 unit tests, typecheck, lint, build and 84 e2e.

## Round outcome

No blocker or major finding; the four lesser findings are accepted and repaired in `e1042fd`. The repairs narrow citations and comments to what the entries record, and the author checked them against the entries; no round 4 was held, as they change no conclusion an earlier round reviewed.
