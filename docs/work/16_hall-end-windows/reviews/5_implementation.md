# Review 5: implementation (focused, final)

## Target

The met repository, commit `0c39a0f` on branch `claude/hall-windows-1d984d`, which repairs review 4's findings (F47 to F54) on top of `4288b42`; the reviewers had its diff against `4288b42` and the script's output, and were asked to check the repairs and the numbers they changed. The script it carries is `snapshots/windows.py.txt` at that commit (sha256 `81b4fd9444a30241ea0a60d195607e810da84d565cc0e1f2394f27e9876f8e42`). The prompt's sha256 is `8baec331a232a834d285badc93f6ce0d58e21bfa535155fa920029bd9e734461`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents; the fleet's check of its log found no failed commands (`keep`). It reproduced the output with Python 3.13.9. It checked the wall fit against its own rotated-ray projection and a separate circle fit across all 729 of #29's sweep cases, and on a synthetic partial circle. It recomputed every average, rounding and margin and the friezes' two scaled errors. It checked the model's values the script copies against `constants.ts` and `frame.ts`. Outside the diff it read `choir-screen.ts`, `frame.ts`, the readings files, and the rules, lessons and spec. `git diff --check` passed. It did not rerun `npm run verify`, look at renders or remeasure the photographs.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. Python and shell loops were refused in its lane, so it checked by hand, including the wall fit (centre about 16.004 m, surround 3.394 m, against the script's 16.006 and 3.394); it used no subagents. Outside the diff it read the rules and lessons, the script and `m29-window-edges.txt` in full, `choir-screen.ts`, `constants.ts`, `frame.ts`, the record, P8's entry, the plan and the last gate's log.
- The worktree was unchanged after both lanes.

## Reports

### Codex

**No findings—major, minor or nit—within this focused review of `0c39a0f` against `4288b42`. F47–F54 are resolved.**

I reproduced the supplied output with Python 3.13.9 and checked:

- **F47:** The wall projection, principal-point column, scaled circle fits and centre-derived set-back are correct. Independent rotated-ray projection and a separate circle-fit implementation agree across all **729 #29 sweep cases**. A synthetic partial-circle check also passes. See [windows.py.txt:512](docs/work/16_hall-end-windows/snapshots/windows.py.txt:512).
- **F48–F49:** Every reported average, rounding result and margin checks. Both alternative model heights lie within both ranges.
- **F50:** Keeping the original frieze heights is now explicitly justified as a modelling choice. Those heights match [choir-screen.ts:25](src/model/core/choir-screen.ts:25); the corrected-face alternative remains disclosed.
- **F51:** Independently recomputed scaled errors are **7.206603 × 10⁻⁹** for the pool and **3.481855 × 10⁻⁹** for the inverse-variance mean. Their respective distances from the tiers’ result are **1.0966** and **1.9606**, correctly printed as 1.1 and 2.0.
- **F52–F53:** The devlog and work-unit-4 note correctly distinguish the rounded model height from the average. “Before its east face” matches the calculation.
- **F54:** The angular difference is **0.283554°**, correctly reported as **0.28°**.

The rounding results are:

| Case | Unrounded value | Rounded | Boundary margin |
|---|---:|---:|---:|
| Nominal world height | 20.278616 m | 20.3 m | 28.616 mm |
| Frieze distortion, middle tier | 20.265251 m | 20.3 m | 15.251 mm |
| Frieze distortion, upper tier | 20.362995 m | 20.4 m | 12.995 mm |
| Friezes on the face | 20.272544 m | 20.3 m | 22.544 mm |
| Glazing | 2.229745 m | 2.25 m | 4.745 mm |

The [conclusion](docs/research/interior.md:258) states the rule, margins, shared uncertainties and alternatives honestly. The changed current-result numbers in the research record, plan, photograph entry, constants comment, devlog and work-unit-4 note match the output.

The assertions compare against model literals stored in the snapshot. I separately verified those literals against the actual TypeScript constants and the **4.11 m** floor level in [frame.ts:44](src/model/frame.ts:44).

Outside the diff, I read `choir-screen.ts`, `frame.ts`, both #29 readings files, the P8 readings headers and samples, and the applicable rules, lessons and specification.

`git diff --check` passed. I did not rerun `npm run verify`, inspect renders or remeasure photographs. No files changed; the worktree remains clean at the target commit. No browser, GUI or server was launched.

### Claude

#### Review round 5 of work unit 16: `0c39a0f` against `4288b42`

**Verdict:** no major or minor findings, and three nits. F47 to F54 are all resolved in substance, and none is resolved only in words. `VAUX_OCULUS_Y` 20.3 holds under every alternative the record names. `VAUX_OCULUS` 2.25 holds too, though only my hand estimates show it for the glazing (nit 2).

**Limits of this lane:** Python, `awk` and a shell loop were refused, so I could not run `windows.py`. Every figure below that the output does not print, I worked out by hand from the readings and the printed output. I used no subagents. Nothing was changed: `git status --porcelain` was empty at `0c39a0f` before and after.

##### Findings

**1. Nit: the two new assertions check the script's own copy of the model's values, not the model.**
- **Where:** `snapshots/windows.py.txt:16`, `:606` and `:615`. The claims are at `plan.md:47` ("checks that the model takes them") and `reviews/4_implementation.md:190` (F48: "asserts that the model takes the rounded average and the rounded glazing").
- **What's wrong:** `MODEL_Y, MODEL_D, L1 = 20.3, 2.25, 4.11` are typed into the script, and both assertions compare against these copies. The script never reads `src/model/core/constants.ts:39–40` or `src/model/frame.ts:44`.
- **How it fails:** if `VAUX_OCULUS_Y` or `VAUX_OCULUS` changed in `constants.ts`, the script would still pass. That is R19's self-agreement case. The copies do match today.
- **Repair:** say what is checked ("the values line 16 copies from `constants.ts`"). Or have the script read the two constants and `MAIN_FLOOR_Y` from the tree before asserting.

**2. Nit: the glazing's 5 mm margin is not tried against the alternatives the centre is, and "would allow 2.20 m" uses a different test.**
- **Where:** `interior.md:258`; `windows.py.txt:608–615`, against `:637–640` and `:649–657`.
- **What's wrong:**
  - The script prints the centre under the friezes' distortion (with each tier's vanishing point) and with the friezes on the screen's face. It prints the glazing only at the nominal values, though the glazing's margin is the thin one.
  - The centre's alternatives are judged against the ranges ("Both 20.3 and 20.4 lie inside both ranges"). The glazing's 2.20 m is judged against the span of the nominal readings, 2.13 to 2.26 m.
- **How it fails (hand estimates; P8 carries about 0.31 of the weight):**

  | Alternative | P8's glazing moves | The average moves |
  |---|---:|---:|
  | Friezes' distortion, middle tier's vanishing point | +0.4 mm | +0.1 mm |
  | Friezes' distortion, upper tier's vanishing point | +11.6 mm | +3.6 mm |
  | Friezes on the screen's face | −1.8 mm | −0.6 mm |

  - So 2.25 holds in all three cases, but no output shows it.
  - **By the ranges test:** 2.20 m lies below #29's range (2.21 to 2.31 m). P8's combined range (2.10 to 2.25 m) overlaps #29's only from 2.21 to 2.25 m, and 2.25 m sits at the top of that overlap.
  - **By the span test:** 2.15 m is allowed as well as 2.20 m.
- **Repair:** print the glazing under the same alternatives, with its margin from `rounded()`. Then say which test "allow" uses.

**3. Nit: the heading margin is measured on the screen's west face, but the model's jamb stands on the screen's line.**
- **Where:** `windows.py.txt:352–357`, where `north` and both angles use `nom['ds']`, the distance from the camera to the west face; `interior.md:237`; `src/model/core/choir-screen.ts:192`.
- **What's wrong:** `gateFrame` builds the jambs at `SCREEN_Z ± 0.02`, which is 0.1 m beyond the west face. Nothing measures how deep in the screen the real jamb stands.
- **How it fails:** at the line (12.68 m from the camera), the man's ray crosses 1.10 m north, not 1.09 m. The margins become 0.07 m and 0.32°, against 6 cm and 0.28° at the face. So F54's corrected second decimal is finer than the geometry supports. No model value depends on it.
- **Repair:** write "0.28° to 0.32° (6 to 7 cm); the jamb's depth is not measured", or "about 0.3°".

##### Answers to your questions

**1. Do the repairs resolve their findings?**
- **F47:** resolved; see question 2.
- **F48:** resolved, with nit 1 on what the assertions actually check.
- **F49:** resolved.
- **F50:** the reason is stated, and it is true. `choir-screen.ts:25–29` builds work unit 4's frieze heights (4.41–5.09, 7.71–8.38, 10.59–11.15 m), and `L1` is 4.11 (`frame.ts:44`).
- **F51 to F53:** resolved.
- **F54:** the formula is right (0.2836°); nit 3 is about the plane it is measured on.
- **One overreach in the disposition:** F47's row (`4_implementation.md:189`) says the surround size was changed "wherever 3.45 m stood". P8's entry (`interior-images.md:43`) still says "about 3.45 m". That entry is right as it stands: it is P8's own up-and-down reading (3.45 m at `4f41cd6`, 3.46 m now), not the pair's.

**2. Are the script's changed parts right?** Yes.
- **The wall fit:**
  - The two mappings exactly invert the pinhole camera for a vertical wall. A row y sees (h − hc)/d = tan α at every column, with depth z = d·cos(α − θ)/cos α.
  - The algebraic circle fit keeps its shape under translation and uniform scaling, so one fit per circle per camera serves both the wall's and the glazing's distances.
  - The set-back, dw·s_fit[1]/m_fit[1] − dw, is right.
- **The principal point's column:** across the surround's rows, cos(α − θ)/cos α varies only from 1.0107 to 1.0141. So moving the column only shears the wall points slightly, and the centre's height and radius change at second order.
- **Hand check of the wall fit:** I get centre ≈ 16.004 m, surround ≈ 3.394 m, outer glazing ≈ 2.255 m, inner ≈ 2.169 m and set-back ≈ 0.57 m. The script gives 16.006, 3.394, 2.256, 2.171 and 0.58.
- **The kept readings:**
  - Surround: 47 rays pass the filter and 46 are kept. The ray at 87.5° is dropped, about 2.4 px inside the circle; it would be dropped on the wall too. The kept angles run from −5° to 185°, with the widest gap 32.5° (75° to 107.5°).
  - Frame: 50 rays pass and 40 are kept.
- **The averages:** the printed inputs give 16.169 to 16.171 within their rounding, hence world 20.279 and a 29 mm margin. The alternatives give 20.265 (15 mm), 20.363 (13 mm) and 20.273 (23 mm). The glazing is 2.230 m, 5 mm inside.
- **The friezes:** χ² is about 351 about the pool and about 340 about the inverse-variance mean (1.995 × 10⁻⁸). The Birge-scaled error is 3.48 × 10⁻⁹. So the tiers' value stands 1.10 and 1.97 errors away, as printed.
- **The numbers across files:** every number the repair changed matches the output, in the record, the plan, #29's entry, `constants.ts:40`, the devlog line and work unit 4's note.

**3. Does the record state the rule, the margins and the alternatives honestly?**
- **The height:** yes. The rule, the 29 mm margin and the 20.3/20.4/20.3 alternatives are all stated, and 20.4 (16.29 m) does lie inside both ranges.
- **The glazing:** the rule and the 5 mm margin are stated honestly. The alternatives are only partly covered; see nit 2.

##### Checked, and not findings
- "About 1.2%" (`interior.md:256`) is no longer printed. It can still be derived from printed values: cos 19.03° / cos 16.85° = 0.9878.
- `RING` and `FRAME` (`windows.py.txt:436`) are now unused. This is harmless.
- `tmp/hall-windows/verify-7.log` shows 732 unit and 125 end-to-end tests passed and gate exit 0. It does not name its revision. The only change under `src/` in `0c39a0f` is the comment at `constants.ts:40`.

##### Files read outside the diff
- **Rules:** `AGENTS.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`, `../fleet/docs/skills/multi-cli-review.md`.
- **Script and readings:** `snapshots/windows.py.txt` and `snapshots/m29-window-edges.txt`, both in full.
- **Model code:** `src/model/core/choir-screen.ts:1–40` and `:118–224`; `constants.ts` lines 18, 39–40 and 63; `src/model/frame.ts:44`.
- **Records:** `interior.md:225–264`; `interior-images.md:43`; `plan.md` in full; `4f41cd6`'s record (through `git show`).
- **Gate:** `tmp/hall-windows/verify-7.log`.

## Findings and disposition

Codex found nothing. Claude found no major or minor problem and three nits, F55 to F57. Review 4's repair was the unit's fifth, the cap on automatic repairs (`AGENTS.md`, R11), so these were recorded and reported to the owner, not repaired. None moves a model value. The owner then asked for them to be repaired (2026-11-04); the repairs are in the last column, and were not reviewed again.

| ID | Finding | Disposition and reason | Repair, past the cap |
|---|---|---|---|
| F55 | The script's two assertions compare the rounded averages with its own copies of the model's values (`MODEL_Y`, `MODEL_D` and `L1`, typed at its line 16), not with `constants.ts` and `frame.ts`, so they would pass if the model's constants changed: R19's self-agreement. The plan's step for review 4 and F48 say the script "checks that the model takes them" (Claude 1) | Accepted | Run inside the repository (found from the script's folder or the working directory, or named by `MET_REPO`), the script reads `VAUX_OCULUS_Y` and `VAUX_OCULUS` from `constants.ts` and `MAIN_FLOOR_Y` from `frame.ts` and checks the rounded average and glazing against them, saying which it checked against. In a stand-in tree with `VAUX_OCULUS_Y` 20.4, or with `VAUX_OCULUS` 2.2, it stops with the check's error. Outside the repository it falls back on its own copies and says that no model is checked. The plan's step for review 4 says what that check tested |
| F56 | The glazing's 5 mm margin is tried only at the nominal values, not under the alternatives the centre is tried under, and "would allow 2.20 m" judges by the span of the readings (2.13 to 2.26 m), where the centre's alternatives are judged by the ranges. By the ranges, 2.20 m lies below #29's (2.21 to 2.31 m) (Claude 2) | Accepted | The script prints the glazing under each alternative with its margin: 2.230, 2.233 and 2.229 m, all rounding to 2.25 m, 4 to 8 mm inside. It prints the two ranges and their overlap, 2.21 to 2.25 m. The record judges by the ranges, as for the centre: 2.25 m lies at the top of the overlap, 2.20 m below #29's range |
| F57 | The heading margin is taken on the screen's west face, but the model builds the gate's jambs on the screen's line (`choir-screen.ts:192`), 0.1 m further; there the man's column crosses 1.10 m north and the margins are 0.07 m and 0.32°, so 0.28° is finer than the geometry supports (Claude 3) | Accepted | The script takes the jamb on the screen's west face and on its line: 1.09 and 1.10 m north, margins 0.06 and 0.07 m, 0.28 and 0.32°. The record says about 0.3°, gives both, and says the jamb's depth is not measured |

Not a finding: Claude noted that F47's disposition says the surrounds read about 3.4 m "wherever 3.45 m stood", while P8's entry (`interior-images.md` #P8) keeps "about 3.45 m". That entry is right as it stands: it gives P8's own up-and-down reading, 3.46 m, not the pair's.

## Verification

- `npm run verify` passed on the reviewed tree, `0c39a0f` (`tmp/hall-windows/verify-7.log`), and on the merged tree that landed, `59451af` (`verify-8-merged.log`: 82 test files, 734 unit and 125 end-to-end tests). The Pages deploy of `59451af` succeeded.
- Codex reproduced the output with Python 3.13.9. It checked the wall fit across all 729 sweep cases and on a synthetic partial circle, and recomputed every average, rounding and margin. It also compared the script's copies of the model's values with `constants.ts` and `frame.ts`. Claude checked by hand.
- The repairs of F55 to F57, at `7c76f40`: run inside the repository, the script reproduces its output and reads the model's values from the tree. In a stand-in tree with `VAUX_OCULUS_Y` 20.4, or `VAUX_OCULUS` 2.2, it stops with its check's error. They change only the record and the script, so `npm run verify` was not run again, and no reviewer checked them.
- Neither reviewer could fetch the photographs, so no one remeasured them; the repository never stores them. Claude's lane could not run Python or shell loops.

## Round outcome

Codex found nothing; Claude found three nits, F55 to F57. They were first left at the repair cap, then repaired at `7c76f40` on the owner's go-ahead, without another review. No finding remains open, and no reviewer dissented. The owner's open questions are the plan's F-owner-1 to F-owner-4.
