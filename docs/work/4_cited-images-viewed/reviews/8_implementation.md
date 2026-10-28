# Review 8: implementation

This round belongs to work unit 4's follow-up on F-owner-4, the 1880 fronts' voussoirs (plan.md, "Follow-up: F-owner-4 acted on"); it is that follow-up's round 2. Its findings were numbered F0 to F29 while the follow-up waited for a work-unit ID, and the reviewers' reports keep those numbers; within work unit 4 they are F40 to F69 (add 40), after the choir screen's F25 to F39.

## Target

Round 1's repairs, `git diff 2308ed8 8880074` (commits `425cacf` and `8880074`; `the diff of its target revisions`, sha256 40d5c32e0158522ea07fc97c98cfe9c00127c17fe69de660e671f5f3f655b22c). Both reviewers read rounds 0 and 1. The author committed `064a843` (F19, from the Codex lane) during the Claude lane's run; that lane bound its report to the saved diff.

## Reviewers and coverage

- Codex: `gpt-6-astra`, `xhigh`, read-only sandbox, codex-cli 0.163.0. A first launch from a foreground shell ran on after that shell ended, alongside the intended background run, for about 30 s (15:03:00 to 15:03:30); the author ended it, its log is kept apart, and the background run's log has no sandbox failure (its three marker matches are its reads of rounds 0 and 1, which quote the marker; 23 commands succeeded). It read the code and records (cited-images.test.ts:159 and constants.ts:40 outside the diff) and ran the gate's parser in memory (53 citations, no problem, a malformed control failing). It did not view the photographs.
- Claude: `claude-opus-5-5[1m]`, `--effort max`, no subagents, its `modelUsage` only the pin: kept. It read the code, records and the gate lock's script, viewed #49, #60, #63, #64 and #65, and replayed the gate's parser on the 13 changed citations; it ran no Vitest while the author's verify waited on the lock. It asked to have its derived crops deleted from its own scratchpad.

## Reports

Redacted: 1 path of a reviewer's own scratchpad and 1 of the session notes folder, which name their sessions.

### Codex (gpt-6-astra)

**One minor finding; no blocker or major defect found in the repairs.**

**Minor — the new arch-count explanation overstates the recorded window arrangement.** [exterior.md:158](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior.md:158) says “a doorway between two windows either side,” implying four flanking windows. [Entry #64:195](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:195) identifies only the **outer two** as windows; [#61:192](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:192) records three doorways among four visible arches.

A modeller resolving the five-versus-seven count could consequently turn two doorways into windows. **Repair:** say “five arches, with a central doorway and windows in the outer two,” leaving the other openings unspecified unless separately recorded.

I checked every [round-1 disposition](reviews/7_implementation.md (then in the session notes folder):139):

| Finding | Assessment |
|---|---|
| F9 | Repaired: #60 records the absent hood; #63 records both the absent hood and inner ring. |
| F10 | Status sentence removed. Deferring the archive is justified: read-only allocator checks still fail, and main retains another unit’s uncommitted ID-6 allocation. Archiving remains outstanding. |
| F11 | Repaired as disposed: #65 distinguishes the hall arcade from the end blocks; section 9 and the bay-loop note record the conflict. |
| F12 | Count uncertainty, code note and #65’s orientations are recorded. The new window-arrangement wording has the finding above. |
| F13 | The rule now states the time limit and reconstruction guidance. Leaving the active shared script to its owner is reasonable; its unchecked release remains unresolved. |
| F14 | The three replacements match the recorded unrounded values: **107, 94, 0.74**. |
| F15 | The colour-photograph qualifier, brick-sample references and grey-voussoir wording match the disposition. |
| F16 | Sound: `425cacf` explicitly corrects `5adc4ab`’s message without rewriting history. |
| F17 | Repaired: section 9 identifies the camera and `t = N`. |
| F18 | Remains a deferred visual check. The planned gallery inspection is a reasonable follow-up, but supplies no current visual acceptance. |

Outside the diff, I read [cited-images.test.ts:159](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/cited-images.test.ts:159) and [constants.ts:40](C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/constants.ts:40). Running the existing parser in memory found **53 citations, zero problems**; a malformed-citation control failed correctly. Both changed TypeScript files produce unchanged executable output, and `FRONT_ARCH_X` retains its attached JSDoc.

The saved diff matches `2308ed8..8880074`; whitespace checks pass. No files were edited or subagents used. I did not view photographs, remeasure their pixels, or run Vitest/e2e.

### Claude (claude-opus-5-5[1m])

# Review 2, Claude lane: the repairs `2308ed8..8880074`

No blocker or major finding. I found three minor findings and three nits.

- **Repaired as their dispositions say:** F9, F13's rule and F14 to F17.
- **F11 and F12:** done as their dispositions say, but each left part of round 1's finding unrecorded (findings 2 and 3).
- **F12 also introduced an error:** the wrong description of the five arches (finding 1).
- **The dispositions that don't repair:** F10, F13's script, F16 and F18 are sound.

**The target moved during the review.** At 15:14:45 the author committed `064a843` (F19, from another lane), which changes only `exterior.md:158`. The saved `target.diff` still matches `git diff 2308ed8 8880074` (sha256 `40d5c32e…`). Line numbers below are `8880074`'s.

## Findings

**1. Minor: section 9 describes the five arches wrongly, and cites #60 for things its entry doesn't record.**
- **Where:** `docs/research/exterior.md:158` says "the Lehman court's photographs show five, a doorway between two windows either side (#60 and #64)". The new note at `src/model/core/vaux-front.ts:23-24` cites #60 and #64 for "show five, the outer two with windows".
- **What the photographs show:** I viewed #60 and #64 at 3×. The five arches read window, doorway, doorway behind the balcony rail, doorway, window.
  - Arches 2 and 4 are open to the floor: sculpture shows through them in #60 and a tondo in #64.
- **What's wrong with the sentence:**
  - "Two windows either side" means four windows.
  - It disagrees with the code note ("the outer two").
  - It disagrees with the doorways sentence in the same bullet, which cites #61, where three of four arches are doorways.
- **What #60's entry lacks:** it (`exterior-images.md:184`) records neither five arches nor which ones hold windows. That is F9's defect class, and the F12 repair brought it in.
- **Live tree:** `064a843` now reads "a central doorway and windows in the outer two", which matches the photographs. #60's entry is unchanged.
- **Failure scenario:** the owner settles the count from section 9 and gets five arches as window, window, door, window, window. Or a later session cites #60 as recorded evidence of five.
- **Repair:**
  - Record in #60's entry what it shows: five arches through the court's three openings, windows in the outer two, doorways in the middle three, the central one behind the rail.
  - Add #60 and #64 to section 9's doorways sentence.

**2. Minor: F12 left #49 misdescribed, and section 9's count question leaves it out. #49 is where the seven arches appear to come from.**
- **Where:**
  - #49's entry (`exterior-images.md:170`) says "a long front of seven pointed arches … between two taller end blocks … at the right end a porch".
  - `vaux-front.ts:2-7` says "seven pointed arches" and cites "Original_Met.jpg (about 1880, the west front beside its porch)", #49.
  - `constants.ts:34` cites #49 too.
- **What I saw:** #49 is #65's mirror image, taken from the northwest.
  - Its long front is the **north side**: six banded pointed arches (counted at 3×; the sixth stands against a stair tower), between taller blocks with plain round-headed openings.
  - At the right is the west front: two arches **north** of the porch, matching #65's two south of it.
- **What's still wrong:** round 1 asked to "say in #49 or #65 which face each shows", and only #65 changed. So:
  - #49's entry still says seven on a long front, where #65 shows six.
  - A reader who pairs the header's "the west front beside its porch" with that entry reads seven west-front arches. That is apparent evidence against "suggests five", when #49 actually supports five.
  - #49 is also the north side's evidence for the F11 note at `vaux-shell.ts:288-293`. That note covers both sides but cites only #65, which shows only the south side; section 9 says "on the south side".
- **Failure scenario:** the owner weighs section 9's question, opens the cited #49 and keeps seven arches.
- **Repair:**
  - Rewrite #49's entry to name both faces and count six.
  - Cite #49 in section 9's count sentence (two arches either side of the porch across #49 and #65) and in its side-wall sentence (both sides).
  - Cite #49 in the note at `vaux-shell.ts:292`.

**3. Minor: F11 recorded only the trim; #65's other conflicts with the side walls stay unrecorded.**
- **Rusticated ground storey:** round 1 reported that "the arcade's ground storey is light rusticated stone, where the model has brick". F11's disposition dropped it, and neither the rewritten #65 entry (`exterior-images.md:196`) nor section 9 mentions it.
  - At 4× it holds: light rusticated stone with small square-headed openings under all six bays.
  - The model builds that storey in brick: `sideBay` (`vaux-shell.ts:72-83`), added in `palette.brick` at `:95`.
- **End bays' heads:** the end bays' round heads conflict with the pointed head `sideBay` cuts in every bay (`:80`) and with the header's "their 1880 windows bricked up as blind pointed arches" (`:3`). The owner note sits only at the trim loop (`:292`).
- **Failure scenario:** the owner's list of 1880 conflicts omits the ground storey. Or a session acting on the trim note removes the voussoirs and leaves pointed blind arches in brick.
- **Repair:**
  - Add the rusticated ground storey to #65's entry and to section 9.
  - Put the note, or a pointer to it, at `sideBay` and at the header's sentence.

**Nits**
4. **"On two storeys" is wrong.** #65's entry says the blocks' openings are on two storeys. At 4–5× both blocks show round-headed openings on three tiers: ground, main and upper. The error came from round 1's report in this lane, and the entry copied it. The ground storey's round heads also conflict with `sideBay`'s segmental heads (`:74`).
5. **Section 9 points to an un-noted constant.** It sends the count question to `VAUX_BAY`. That comment (`constants.ts:40`) still reads "7 arches across 29 m (Lehman-court photo shows 5 of them)", with no owner note. Point section 9 at `FRONT_ARCH_X` instead, or add a note at `VAUX_BAY`.
6. **The recreate instruction keeps the race.** `local-rules.md:8` says "recreate the script to that description", but the description leaves out the owner check F13 sent to the coordinator. `gate.sh:11` removes the lock without checking it still owns it, so a recreated script repeats the race. Add "and releases only a lock it still owns".

## Round 1 dispositions
- **F9, repaired.**
  - #60 at 5×: each ring meets the brick with no hood.
  - #63 at 2×: the same, plus a smooth light inner order between the voussoirs and the striped tympanum.
  - Both entries now record what section 9 cites them for.
- **F10, sound.**
  - The status sentence is gone.
  - The primary checkout holds another session's ID 6 (`closed-solids`, 12:42) on disk, not on main.
  - The journal holds `"pending": null`, so `recover` would replay nothing. The stated reason doesn't hold, but blocking and reporting still follows `work-docs.md`.
  - Nothing in the repo now points to the records, so the merge report must name the notes folder.
- **F11 and F12:** apart from findings 1–3, both are done as their dispositions say.
- **#65 claims, checked against the image:**
  - **The west front is seen obliquely:** the porch face's cornice falls toward the left (y 457 at x 520, 485 at x 262) and the arcade's toward the right (469 at x 745, 488 at x 980).
  - **Two arches stand south of the porch:** confirmed.
  - **A third arch's head shows behind the gable:** a light curve is visible past the gable at 5×.
  - **Six-bay arcade:** confirmed.
- **F13, rule accurate.** It matches `gate.sh:7`, `:11` and `:15`. Leaving the script to its owner is sound: other sessions run it, and bash reads a running script as it goes.
- **F14, reproduced from the patch boxes.**
  - #64's dark green is 107.487 and #67's dark blue 94.485.
  - Photograph means run 0.5273 to 0.7445 (mean 0.6327), and per-patch ratios 0.4084 to 0.8183.
  - Red over blue: dark 0.995–1.318, light 0.938–1.320, brick 1.156–2.937.
  - Every rounded value in #60, #61, #63, #64 and #67 matches. The closest edge is #64's light blue at 128.496.
- **F15:** repaired.
- **F16:** sound. Rewriting `5adc4ab` needs authorization (R14).
- **F17:** repaired. `tmp/lehman/final/u60a.png` reads (87, 31, 24) at (600, 460).
- **F18:** sound. The standard set includes each chapter's end from `aerial-ne` (`scripts/capture.ts:214`), which shows the north and east rings. The south rings use the same material and geometry.

## Checks and reads
- **Citations:** I replayed the citation gate's parser (`cited-images.test.ts:54-70`, `scanCitations`) on the 13 citations in the two changed sources. None has a joined number or a stray ID, and every cited entry is marked viewed.
- **Vitest not run:** another session's gate held the lock and the author's verify of these commits was queued behind it (`tmp/lehman/verify-6.log`). The e2e frame budgets are sensitive to load.
- **Doc comments:** `FRONT_ARCH_X`'s and `vauxSideTrim`'s still sit directly on their declarations.
- **Whitespace and lint:** `git diff --check` is clean, and no line limit is configured.
- **Read outside the diff:**
  - `constants.ts:34` and `:40`
  - `vaux-shell.ts:3`, `:72-95`
  - `exterior-images.md:170`
  - `choir-screen.ts:18-20`
  - `scripts/capture.ts:210-216`
  - `/c/Users/38909/Documents/github/met/tmp/gate.sh`
  - the fleet's `work-docs.md`
- **Images viewed:** #49, #60, #63, #64 and #65.

I edited no repo file. My delete of my derived crops was declined. Please delete `[the reviewer's own scratchpad]`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F19 | Section 9 described the five arches as "a doorway between two windows either side", four windows where #64 records two (Codex; Claude 1, in part) | Accepted | "A central doorway and windows in the outer two" (`064a843`) |
| F20 | #60's entry records neither the five arches nor which hold windows, and section 9's doorways do not cite #60 and #64 (Claude 1) | Accepted: the author saw at native size windows in arches 1 and 5 and openings in 2, 3 and 4 | #60's entry records them; the doorways cite #60 to #64 (`b80dac8`) |
| F21 | #49 is misdescribed: from the northwest its long front is the north side, six banded arches, and two arches stand north of the porch, so #49 supports five on the west front; section 9 and the side-wall note leave it out (Claude 2) | Accepted: the author counted six at 2× | #49's entry corrected with its first reading kept; section 9's count and side-wall sentences and the notes in `vaux-front.ts` and `vaux-shell.ts` cite #49 (`b80dac8`) |
| F22 | #65 also shows the arcade on a ground storey of light rusticated stone, and round heads on the end blocks, against the model's brick and pointed and segmental heads in every bay; only the trim was noted (Claude 3) | Accepted: the author saw both at 2× | #65's entry and section 9 record them; notes at the shell's header and `sideBay` (`b80dac8`) |
| F23 | "On two storeys": the end blocks' round-headed openings are on three tiers (Claude nit 4) | Accepted | "Three tiers" (`b80dac8`) |
| F24 | Section 9 pointed the count question at `VAUX_BAY`, whose comment carries no owner note (Claude nit 5) | Accepted | Section 9 points at `FRONT_ARCH_X`, which carries the note (`b80dac8`) |
| F25 | The rule's recreate instruction keeps the release race (Claude nit 6) | Accepted | "Releasing only a lock it still owns" (`b80dac8`) |

Round 1's F10 note from this lane: the allocator's journal holds no pending allocation, so `recover` would replay nothing; the blocker stands as the allocator's refusal, which is reported, not worked around.

## Verification

`064a843` and `b80dac8` change records and comments only: on `b80dac8`, the citation and core tests (17) passed and typecheck and lint are clean; the full `npm run verify` of `b80dac8` runs through the gate lock and its result is recorded in the plan.

## Round outcome

No blocker or major finding. Seven lesser findings, F19 to F25, all accepted and repaired in `064a843` and `b80dac8`. Round 3 checks those repairs.
