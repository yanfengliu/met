# Review 0: implementation

Moved here from work unit 4's folder (its review 6) on 2026-10-28, once the fleet allocator accepted met's reserved ID gap (fleet `162da10`); the round's findings keep their numbers, F0 to F29 across this unit's rounds 0 to 3.

## Target

The uncommitted working-tree change of the worktree `adoring-lamarr-f5704f` (branch `claude/adoring-lamarr-f5704f`) against its base `bfb7699` (main), 2026-10-28 13:19: the patch `snapshots/0_target.patch.txt` (`git diff bfb7699`, 204 lines, sha256 a4d96cbe0c6ff3f42566b8354ae193d478cb6d00da2b2a63e9d7ee9ec6a031a1). Scope: `src/model/core/materials.ts`, `vaux-front.ts`, `vaux-shell.ts`, `vaux.ts`; `docs/research/exterior-images.md`, `exterior.md`, `history.md`, `interior.md`; `docs/devlog/summary.md`. The author edited the tree at 13:42 during the round (Codex's repairs); both reports judge the patch.

## Reviewers and coverage

- Codex: `gpt-6-astra`, `model_reasoning_effort=xhigh`, `--sandbox read-only`, codex-cli 0.163.0, the patch on stdin. It read the code (core.test.ts:55, batch.ts:41, closure.test.ts:111, cited-images.test.ts:159, local-rules.md:6, read outside the diff), ran read-only probes of the timeline and the gate's parser, and could not run Vitest in its sandbox (no temporary directory). It cannot view images and did not judge the photographs. No `STATUS_DLL_INIT_FAILED` in its log.
- Claude: `claude-opus-5-5[1m]`, `--effort max`, claude 2.1.308, tools Read, Glob, Grep, Task and git diff, log and show, the patch on stdin, with the photographs' and renders' local copies named in its prompt. It read the code, viewed every photograph and render, sampled them, and ran the citation, core, conventions, closure, sequence and section-cut tests. Abstention under the review runbook: its `modelUsage` holds a second model, `claude-haiku-5-5` (5,656 output tokens), from one subagent of the user-level type `web-fetch` that it sent to recheck the Met's 2012 history page; the runbook admits only `general-purpose` or `Explore` with no model. Its report is kept below as authored, and its findings are weighed on their own evidence, not counted as an independent lane's review. Round 1 re-runs the lane without subagents.

## Reports

### Codex (gpt-6-astra)

Three **minor findings**; no blocker or major code defect found.

1. **Minor — the devlog turns an inference into direct observation.** [docs/devlog/summary.md:5](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/devlog/summary.md:5) includes the 1880 stereograph among photographs that “all show light and dark grey granite” with rock-faced dark stones. Its own record, [exterior-images.md:194](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:194), describes a sepia image and explicitly labels the material conclusion an inference; it records no rock-faced finish. A later modeller could treat this as direct evidence of the original colour and finish. **Repair:** distinguish modern colour/finish observations from the historical photograph’s tonal evidence and inferred material.

2. **Minor — [C7] contradicts its recorded colour samples.** [docs/research/exterior.md:147](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior.md:147) gives the light stones’ red/blue range as **0.94–1.28**, but photograph #64 records light samples `(158 to 170, 137 to 141, 128)` at [exterior-images.md:193](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:193). Those values reach **170/128 = 1.328**, outside the stated range. Reusing these records for calibration produces inconsistent bounds. **Repair:** reconcile the samples and aggregate; retain paired RGB measurements and the averaging method so the claimed 0.61 mean can also be reproduced.

3. **Minor — the sampling-method statement overclaims coverage.** [docs/research/exterior-images.md:188](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:188) says every photograph was sampled inside single stones. Yet #62 explicitly says patches include neighbouring stones ([line 191](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:191)), and #66 says the stones are too small to read ([line 195](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/research/exterior-images.md:195)). A later analysis could incorrectly include these as isolated-stone measurements. **Repair:** restrict the statement to the photographs successfully sampled and identify qualitative-only evidence separately.

Other review lenses:

- **Code: no finding.** Read-only probes found 36 changed ring pieces, unchanged totals of **130 meshes / 197,852 triangles**, matching core sheet counts, and no changed ring open along vertical lines. The maximum westward projection remains 0.06 m, safely within the original brick allowance. Sixteen sampled timeline histories matched fresh evaluations. Outside the diff, I read [core.test.ts:55](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/core/core.test.ts:55), [batch.ts:41](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/build/batch.ts:41), and [closure.test.ts:111](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/model/closure.test.ts:111). All alternating Vaux rings were covered; later buildings’ rings remain unchanged.
- **Citation gate: no finding.** Running the repository parser in memory returned no problems. Changed citations parse correctly, and their entries exist and are marked viewed. Reviewed [cited-images.test.ts:159](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/src/cited-images.test.ts:159).
- **Rules: no additional finding.** Named references satisfy [local-rules.md:6](/C:/Users/38909/Documents/github/met/.claude/worktrees/adoring-lamarr-f5704f/docs/policies/local-rules.md:6); changed files are under 500 lines, Markdown paragraphs are unwrapped, and no current alternating-ring builder still uses brick. Historical accounts retain the old defect appropriately.

The five targeted Vitest suites **ran no assertions** because the read-only sandbox denied temporary-directory creation. The probes above are narrower checks, not passing test gates. Photographs and rendered appearance were not assessed. No files were edited.

### Claude (claude-opus-5-5[1m]; abstained, see coverage)

I reviewed `tmp/review-runs/voussoirs-0/target.diff` (sha256 `a4d96cbe0c6ff3f4…`), which matched the tree when I ran my tests at 13:30. The author kept editing during the review: at 13:42, `vaux-front.ts`, `exterior.md`, `exterior-images.md` and the devlog changed (live diff sha256 `5eab476866c2f24a…`). Line numbers below are the target's. After each finding I say what the live tree has already changed.

## Findings

**1. Major: the change cites photographs right beside model parts those photographs contradict, and nothing in the repo records the conflicts.**
- **Where:** `src/model/core/vaux-front.ts:7` cites #61 to #64, and line 88 still builds a light-granite hood ring. `src/model/core/vaux-shell.ts:277-279` cites #66 and #67 above the seven east arches (`:306`) and their light hood (`:284`, `:310`). The devlog (`docs/devlog/summary.md:5`) says only that the conflicts "went to the owner as findings".
- **What's wrong:** the cited entries contradict the code beside them:
  - #64 says each arch "meets the brick with no hood moulding" (`exterior-images.md:193`).
  - #66 shows four large east-front arches; the model builds seven (`:195`).
  - #67 shows "an outer ring of dark granite blocks"; the model has a thin light ring (`:196`).
  - #61 and #64 record "a smooth light ring lining each arch inside its voussoirs". The model has a brick reveal there (`tmp/lehman/final/close.png`), and the devlog's list leaves this out.
  - The brick is too red: #60's brick reads (110–116, 75–83, 75–82); the render's reads (87, 31, 24) at `final/u60a.png` (600, 460).
  - No note sits beside any of these builders, and the conflicts section of `exterior.md` (`:150-157`) has nothing.
- This is the defect class the citation gate's lesson names: "a guessed form stands beside the photograph that contradicts it" (`docs/learning/gate-proofs.md:7`). Work unit 4 accepted findings F5 and F14, which require a note beside the code (`reviews/0_implementation.md:109`, `reviews/1_implementation.md:130`); the precedent is the note at `choir-screen.ts:17-21`. This change removed the F-owner-4 note it resolved and added no notes for the new conflicts.
- **Failure scenario:** a later session reads `vaux-shell.ts`, sees #66 and #67 cited and the gate green, and keeps the seven arches and the light hood. Once this session ends, the findings exist only as one devlog clause with no evidence.
- **Repair:** record each conflict with its evidence in `exterior.md` §9, including the inner ring. Add an "Open with the owner" note beside the hood (`vaux-front.ts:88`, `vaux-shell.ts:284`), the east arch loop (`vaux-shell.ts:306`), `frontHoles` (`vaux-front.ts:30`) and the brick colour (`palette.ts:89-90`). The live tree has not changed this.

**2. Minor: an inference is stated as an observation, and a source is overstated.**
- **Where:** devlog `:5` ("dark grey granite, as every photograph shows them"; "all show light and dark grey granite, the dark stones rock-faced"); `vaux-front.ts:86` ("rock-faced grey granite… in every photograph… #60, #61"); `history.md:27` ("light and dark grey granite (Heckscher pp. 18, 75)"); [C7] (`exterior.md:147`).
- **What's wrong:**
  - #65 is a sepia print, and its own entry calls the not-brick reading "An inference" (`:194`).
  - #60's and #61's entries record no rock-facing. At #61's 640×426 none is visible; I cropped the right arch.
  - Heckscher's own words are "The massive pointed arch of banded granite encloses a blind roundel" (p. 18, one east-front window) and "pointed arches, with their red bricks and gray granite" (p. 75). Neither says the west front's dark stones are granite. The p. 75 wording fits the old brick-and-granite model just as well.
- **Failure scenario:** "granite" on the west front gets cited later as a Heckscher fact.
- **Repair:**
  - State what each photograph shows: grey stone; rock-faced in #63, #64 and #67; coarse in #62.
  - Mark "granite" on the west front as an inference from #67 and p. 18.
  - Quote Heckscher's words in the history row.
  - Drop "as every photograph shows them" from the devlog headline.
- **Live tree:** it has reworded the devlog body and the code comment, but not the headline, the history row or [C7].

**3. Minor: [C7]'s first sentence is now stale.** `exterior.md:147` still says "about #9A4B3A… **E** (no sample in this run)". The same bullet now reports brick samples (red over blue 1.35 to 2.94), and the devlog calls the brick colour a disagreement.
- **Failure scenario:** a reader takes the brick colour as unsampled and unchallenged.
- **Repair:** cite the samples and the disagreement.

**4. Nit: the render ratio is given three ways.** [C7] says "0.62 to 0.64"; `materials.ts:36` and the devlog say "0.62". I sampled both final renders:

| Render | Dark | Light | Ratio per channel |
|---|---|---|---|
| `u60a.png` | (76, 75, 72) | (123, 121, 117) | 0.61–0.63 |
| `close.png` | (77, 76, 72) | (123, 121, 118) | 0.61–0.63 |

Brightness histograms over every arch give dark 74 against light 120–121. Nothing reads 0.64. Write "0.62", or name the patch that read 0.64.

**5. Nit: #63 is left out of the ratio sample without reason.** [C7] samples "the four photographs that show single stones clearly (#60, #61, #64, #67)". #63 shows rock-faced single stones as clearly as #64. My patches on its middle arch read dark (101–115, 94–102, 98–107) and light (140–166, 127–139, 130–136), about 0.74; adding it would move the mean to about 0.64. That still fits the 0.62 render. The target's section intro also says "Each photograph was sampled", which is wrong for #63 and #66; the live tree fixed that sentence but kept the "four… clearly" claim.

**6. Nit: [C7]'s ranges don't match the entries' own numbers.** #67's dark blue 68 over light blue 177 gives 0.38, below [C7]'s stated minimum of 0.41. #64's light red 170 over blue 128 gives 1.33, above the stated maximum of 1.28. The live tree raised it to 1.32, still under 1.33, so check it against the patch boxes it now lists.

**7. Nit: three wording slips.**
- #66 says each arch is "over a roundel". The image and p. 18 show each arch enclosing a blind roundel in its head.
- The devlog's "his 1880 stereograph" belongs to the Met (1995.114.1, gift of Herbert Mitchell).
- `vaux-shell.ts:277-279` justifies the side walls without citing #65, the only photograph of a side-wall arcade (the south side).

## Lenses with no finding
- **Code:** no finding.
  - All three dark-ring sites now use `core.graniteDark` (`vaux-front.ts:87`, `vaux-shell.ts:294`, `vaux-shell.ts:309`).
  - Every other ring is single-material: `choir-screen.ts:64,71` and `medieval-hall.ts:103,195,211` use `parity: 'all'`, and Weston's rings come from `lib/arch.ts` (`weston-facade.ts:126-127`).
  - Batching groups by geometry, then material, then door (`src/build/batch.ts:42`). Each dark ring was alone with `palette.brick` in its step, so mesh and triangle counts are unchanged.
  - The trim rule (`core.test.ts:55`) now allows the dark ring 1.5 m instead of 0.3 m; it projects 0.06 m.
  - The rings are not sheets (`arches.ts:261-298`), so no `SHEETS` count changes (`closure.test.ts:111-112,162`).
  - The material is created once, so determinism is unaffected.
  - The renderer uses ACES tone mapping (`viewer.ts:53`). Running three.js's ACES curve myself gives 0.72 → 0.61 and 0.61 → 0.46. The renders read 0.62 and 0.48: `tmp/lehman/after` reads (59, 58, 56) against (123, 121, 117).
- **Citation gate:** no finding. Running the gate's regexes over the files parses `vaux-front.ts:7` to 49, 65, 60, 61, 62, 63, 64, line 86 to 60 to 64, and `vaux-shell.ts:279` to 66, 67. Every entry is marked "Viewed at full size 2026-10-28:" and the gate passes on the target and the live tree.
- **Repo rules:** no finding.
  - Changed source files stay under 500 lines (73, 117, 315, 99).
  - Each doc paragraph is one line, and `git diff --check` is clean.
  - Reference images are named.
  - Nothing current calls the dark voussoirs brick. Only work unit 4's history does (`plan.md:46,57`); when this unit gets a folder, record F-owner-4's resolution there.

## Image checks
- Entries #60 to #67 match what I see, and their samples reproduce within the stated ranges.
- In fig. 107 (#64) I counted 15 stones per arch, with light springers and a dark crown. That matches the model's ring.
- The overstatements are those in findings 2, 5 and 7. #61 is too small to show rock-facing. #65 cannot show grey, but its inference holds: the dark voussoirs read about 85–115, the brick about 55–75, and the tympanum's dark stripes about 50–65.
- The source tagged [TM] ("brick in place of the pink granite") is unverified: metmuseum.org answered HTTP 429.

## Checks and gate state
- I ran the citation gate, the core tests and the repo-conventions tests on the target (21 passed) and again on the live tree (21 passed).
- I ran the closure, sequence and section-cut tests on the target (27 passed).
- No full `npm run verify` has passed on this tree:
  - `tmp/lehman/verify-1.log:184-209` failed one of 84 end-to-end tests: `routes.spec.ts:225`, "Walk mode is not walking". A colour change cannot plausibly cause that, but it must be rerun green before commit.
  - `verify-2.log` stops after the build starts.
  - `verify-3.log` only waits on a gate lock.
- The change alters renders, so after merge the owner's render gallery must be republished (`docs/policies/local-rules.md:7`).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The devlog states the 1880 stereograph's not-brick reading, an inference in its own entry, as an observation, and calls the dark stones rock-faced in photographs too small to show it (Codex 1; Claude 2, in part) | Accepted: #65's entry labels the inference, and #61 is too small to show a finish | The devlog says what each source shows: grey stone in the Lehman Wing's photographs, rock-faced where one is sharp enough; the stereograph's tones point to stone. The ring's comment in `vaux-front.ts` says the same |
| F1 | [C7]'s red-over-blue ranges do not match the entries' own values (#64's light 170 over 128 is 1.33, #67's dark-to-light 0.38), and the averaging is not stated (Codex 2; Claude 6) | Accepted: the ranges came from per-photograph means for one kind and per-patch values for another | [C7] states the method (each dark patch against the mean of the same photograph's light patches), gives every range per patch from the unrounded means, and the section intro of the entries lists every patch box |
| F2 | "Each photograph was sampled with means of patches inside single stones" overclaims: #62's patches take in neighbours, #63 and #66 were not sampled (Codex 3; Claude 5, in part) | Accepted | The intro names the five photographs sampled inside single stones, the two sampled coarsely and the one described only |
| F3 | The change cites photographs beside model parts they contradict (the west front's light hood, the missing inner ring, the openings, the brick colour, the east front's seven arches without roundels and its light hood) and records none of these conflicts beside the code or in `exterior.md` section 9, as work unit 4's F5 and F14 required (Claude 1, major) | Accepted: the gate's defect class is a form standing beside the photograph that contradicts it | `exterior.md` section 9 records each conflict with its evidence; "Open with the owner" notes beside `frontHoles`, the front's brick wall and its hood in `vaux-front.ts`, and the east arch loop in `vaux-shell.ts`. `palette.ts` is the engine's, so the brick note sits at the front's wall instead |
| F4 | Granite on the west front is an inference: Heckscher calls the surviving east-front arch banded granite (p. 18) and describes the west front's arches as having red bricks and gray granite (p. 75), which fits the old model as well; the devlog headline said "as every photograph shows them" (Claude 2) | Accepted | [C7] and the history row quote Heckscher's words and mark granite on the west front as an inference from the east-front arch; the devlog headline reads "grey stone, not brick" |
| F5 | [C7]'s first sentence still calls the brick unsampled and unchallenged (Claude 3) | Accepted | [C7] gives the brick's samples from #60 and #64 and points to the disagreement in section 9 |
| F6 | The render's ratio is given as 0.62 to 0.64 in [C7] and 0.62 elsewhere; the reviewer's patches read 0.61 to 0.63 (Claude 4) | Accepted: 0.64 came from one light patch on the close render | "About 0.62 (0.61 to 0.63 a channel)" in [C7]; "about 0.62" in the material's comment and the devlog |
| F7 | #63 shows single rock-faced stones as clearly as #64 but was left out of the sample (Claude 5) | Accepted | #63 sampled (two dark, two light and two brick patches; dark to light 0.72); the mean of five photographs is 0.63, which the render's 0.62 matches within 0.01, so the colour stays |
| F8 | Wording: #66 "over a roundel"; the devlog's "his 1880 stereograph" (the Met's, 1995.114.1); `vaux-shell.ts` justifies the side walls without #65, the one photograph of a side arcade (Claude 7) | Accepted, the roundel in part: Heckscher calls today's roundel blind; whether the 1880 ones were glazed is not seen | #66 reads "each with a roundel in its head (the surviving one, #67, blind today)"; the devlog names the Met's stereograph that Heckscher reproduces; `vaux-shell.ts` cites #65 and #66 |
| — | The Met's 2012 history page (TM) is unverified: metmuseum.org answered the reviewer with HTTP 429 (Claude, image checks) | No change: the author read the page's text in the browser pane on 2026-10-28, where the sentence on brick in place of the planned pink granite stands | None |

## Verification

On the repaired working tree (2026-10-28, about 14:10): `npm test` 646 passed, `npm run typecheck` and `npm run lint` clean; `src/cited-images.test.ts` green with the new notes' citations. The full `npm run verify` runs through the shared gate lock (`tmp/gate.sh`) on `MET_PORT=5363`; its result is recorded in the plan. The earlier runs: verify 1 failed one e2e test, `routes.spec.ts:225` ("Walk mode is not walking"), after the author edited `materials.ts` mid-run and Vite reloaded the page (`main.ts?t=…` in its log); verify 2 and 3 were stopped, the first outside the lock, the second while queued.

## Round outcome

No blocker. One major (F3) and eight lesser findings, all accepted and repaired in the working tree. Coverage of the repairs needs round 1: both lanes on the committed revision, the Claude lane without subagents.
