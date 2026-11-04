# Review 2: implementation

## Target

The met repository, commit `9833aab` on branch `claude/hall-windows-1d984d`, which repairs review 1's findings (F11 to F25) on top of `2a2e6ec`; the reviewers had its diff against `2a2e6ec` and the script's output. The script it carries is `snapshots/windows.py.txt` at that commit (sha256 `efdb1553ec2b40f4c742cc688f1f7c03ffb75a41c28453f0d52d397323d44161`). The prompt's sha256 is `d3056ec479e9f5e518a857f1b1631f00a330cac776aa43560ddfb77fe8c29c49`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents; the fleet's check of its log found no failed commands (`keep`). It reproduced the script's output exactly, reproduced the circle fits and checked the fitter on a synthetic circle, solved the eye-height equation on its own, and checked the alternatives and projections; `git diff --check` passed. Outside the diff it read `vaux-shell.ts`, `vaux-front.ts`, `medieval-hall.ts`, `frame.ts`, the preset, work unit 4's plan, review 0, the rules and spec, and the map cache's README and features. It did not rerun `npm run verify` or remeasure the photographs, and launched no browser or server.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. Running Python was refused in its lane, so it recomputed the script's numbers by hand; it used no subagents. Outside the diff it read the rules and lessons, review 0 and `snapshots/0_windows.py.txt`, `interior.md`, work unit 4's plan and review 4, `medieval-hall.ts`, `choir-screen.ts`, `vaux-shell.ts`, `presets.ts`, the map cache, the registry and a verify log.
- The worktree was unchanged after both lanes.

## Reports

### Codex

Reviewed `9833aab` against `2a2e6ec`, serially and read-only. **Two minor findings and four nits; no major finding.** The script reproduces the supplied output exactly.

1. **Minor — #29’s horizontal scale still lacks a consistent camera calibration.** [windows.py.txt:282](docs/work/16_hall-end-windows/snapshots/windows.py.txt:282) makes horizontal and vertical scales equal at the screen’s middle image row. The rational height mapping is correct, but that equality does not follow from it. Under a square-pixel pinhole model, this normalization implies an eye height of **7.32 m**, incompatible with the floor solution’s **2.77 m**. Keeping the vertical calibration and solving a consistent camera gives about **178.09 px/m** horizontally at row 2700, versus **176.95** here; the glazing becomes approximately **2.264 m**, versus **2.280 m**. Thus F12 fixes the functional form but leaves an undisclosed approximation. **Repair:** derive both scales from one camera calibration, or explicitly bound this normalization approximation and propagate it.

2. **Minor — The symmetric “±” summaries misrepresent the computed bounds.** [constants.ts:39](src/model/core/constants.ts:39) and [summary.md:5](docs/devlog/summary.md:5) give **16.8 ± 0.9 m** and **16.0 ± 0.5 m**. The actual bounds are **15.624–17.498 m** around nominal **16.771**, and **15.666–16.653 m** around nominal **16.026**. A half-range cannot be attached symmetrically to a nominal value that is not the range’s midpoint. Both summaries exclude computed admissible values and include others outside their sweeps. **Repair:** quote the intervals, or use approximately **16.77 −1.15/+0.73 m** and **16.03 −0.36/+0.63 m**.

3. **Nit — The tiers agree in row, not at the claimed common point.** [windows.py.txt:100](docs/work/16_hall-end-windows/snapshots/windows.py.txt:100) averages the two fitted columns after matching their rows. Re-evaluating at the returned distortion gives upper **(1084.763, −5375.619)** and middle **(1069.025, −5375.644)**: a **15.74 px horizontal discrepancy**. [interior.md:236](docs/research/interior.md:236) consequently overstates “the same point.” The calibration is now reproducible, but this agreement claim is stronger than its calculation. **Repair:** describe matching rows and an averaged column, retain the horizontal discrepancy, or fit a joint point and report its residuals.

4. **Nit — The preset comparison still mixes screen planes.** [windows.py.txt:416](docs/work/16_hall-end-windows/snapshots/windows.py.txt:416) projects the preset onto the partition at **Z −99.4**, while the next line projects the inferred camera onto the west face at **Z −99.5**. Therefore **8.30 versus 8.02 m** is not a comparison on one plane. Using the partition consistently gives **8.304 versus 8.071 m**; using the west face gives **8.255 versus 8.020 m**. **Repair:** use one named plane for both calculations and update F-owner-2 and the record. The required camera move remains valid.

5. **Nit — The base-offset repair moves the cross off its calibration height.** [windows.py.txt:350](docs/work/16_hall-end-windows/snapshots/windows.py.txt:350) correctly solves the eye and base offset, then translates heights whose scale was already anchored to a **15.85 m** cross. Evaluating the resulting mapping at row 662 gives **15.83715 m**, not 15.85 m. The discrepancy is small, but F22 is not a fully consistent recalibration. **Repair:** solve the scale coefficient, eye height and base offset together while preserving the cross-height constraint, or disclose and bound this approximation.

6. **Nit — The arcade’s “±10 px” sweep varies columns only.** [windows.py.txt:256](docs/work/16_hall-end-windows/snapshots/windows.py.txt:256) leaves all three rows fixed. Varying both coordinates within the stated ±10 px produces **27.721–31.312 m**, outside the printed **27.84–31.15 m**. For example, `(130,1820), (321,1914), (417,1971)` gives **31.312 m**. **Repair:** sweep both coordinates or label the result explicitly as column uncertainty only. Withdrawing the categorical arcade exclusion was correct.

The repair coverage is:

| Findings | Assessment |
|---|---|
| F11 | Readings, fits and sensitivity calculations are now reproducible; finding 3 remains. |
| F12, F22 | Substantive repairs, with the calibration issues in findings 1 and 5. |
| F13, F16, F17, F19, F21 | Implemented and reproduced. Reversing the actual `unroll()` signs in memory now fails the assertion. |
| F14 | Unsupported exclusion withdrawn; remaining range issue is finding 6. |
| F15, F18 | Camera move and main distance calculations repaired; comparison issue is finding 4. |
| F20 | Computation supports the stated occlusion interpretation and conditional distance bound; I could not independently confirm the photograph. |
| F23, F24, F25 | Addressed within their stated scope: surround rationale corrected, edge choices disclosed, alternatives computed. |

**Keeping `VAUX_OCULUS_Y = 20.4` is justified as the explicitly recorded modelling choice.** The nominal weighted average does not uniquely determine the height: its weights come from bounds, with shared inputs. I reproduced the crossings at **−1.14123 m → 16.28258 m** and **+0.69025 m → 16.47554 m**. These support retaining **16.29 m above the floor**; they do not require changing it to the nominal average. The remaining calibration issues likewise do not establish a necessary change to the **2.25 m** opening.

Outside the diff, I read [vaux-shell.ts:239](src/model/core/vaux-shell.ts:239), [vaux-front.ts:105](src/model/core/vaux-front.ts:105), [medieval-hall.ts:210](src/model/core/medieval-hall.ts:210), `frame.ts`, the preset entry, work unit 4’s plan, review 0, applicable rules/specification, and the map cache README and relevant JSON features.

I reproduced the circle fits, checked the fitter against a synthetic circle, independently solved the eye-height equation, and checked the alternatives and projections. `git diff --check` passed. I did not rerun `npm run verify` or independently remeasure the original photographs. No files changed; no browser or server was launched.

### Claude

I found no major problems: 4 minor findings and 6 nits. The repairs to F11–F25 are mostly real, and the script's new geometry is right. The main problem is an input the repair took from review 1's F25: an east-wall face up to a full wall west of the map's line. The map itself rules that out, and with it goes the record's reason for keeping `VAUX_OCULUS_Y` 20.4.

**How I checked.** This lane's Bash allows git reads only, and running Python was refused, so I couldn't run `windows.py`. I recomputed by hand instead (listed at the end), and everything I recomputed matches the output you gave. I changed nothing (`git diff HEAD` is empty) and used no subagents.

#### Findings

##### 1. Minor: the map puts the east wall's inner face on its line, so "up to a full wall further west" has no support
**Where:** `docs/research/interior.md:235`, `:239`, `:241`, `:243`, `:246`; `docs/work/16_hall-end-windows/snapshots/windows.py.txt:24`, `:219`.

**What's wrong:**
- The record says the east wall's inner face "may stand there or up to a full wall (1.1 m) further west". Both sweeps run that face to 1.2 m west, and the Conclusion's 16.28 m meeting point assumes it.
- The same file calls the end piers "half-piers against the end walls" (`interior.md:222`).
- In `C:\Users\38909\Documents\github\met\research\cache\lm_features.json:1`, the east half-columns (`column` polygons, uid 447599798201 and 800006440452) span json z 2.17 to 2.64–2.65, which is world −83.80 to −83.32 (`README.txt:3`). Their flat backs lie on the east doorway's line (uid 135207569259, z 2.62–2.63).
- The west half-columns (uid 256543758117 and 20545354728) sit the same way on the west wall's inner face: backs at z −31.63 and −31.65, the door line at −31.64, the passage's outer face at −32.81.
- A face 1.1 m west of the line would run through the half-columns.
- The model builds the wall the same way: inner face on the line (`src/model/core/vaux-shell.ts:141`, `:243`; `medieval-hall.ts:190`, `:216`; half-pier at −83.53, `constants.ts:52`).
- The script's comment at `:24` still says "up to 0.6 m west".

**How it fails:**
- P8's low end (15.62 m) and #29's high end (16.65 m) both come from the −1.2 m face, worth about −0.51 m and +0.27 m.
- Holding the face to the screen's ±0.1 m, my hand estimate gives P8 about 16.1–17.50 m and #29 15.67 to about 16.4 m.
- The overlap shrinks from 15.67–16.65 to about 16.1–16.4 m. The half-ranges become about 0.70 and 0.37 m; the weighted average stays about 16.18 m.
- The 16.28 m meeting point goes. So do "the pitch and the east wall's face dominate" (`:239`) and "the largest uncertainties" (`:246`).

**Repair:** sweep the east face over ±0.1 m only, cite the half-columns, drop the 16.28 m alternative, and recompute the ranges and weights.

##### 2. Minor: the record's reason does not pick 20.4 (your question 3)
**Where:** `interior.md:243`; `reviews/1_implementation.md:268` (F25's disposition); `docs/devlog/summary.md:5`; `constants.ts:39`.

**What's wrong:**
- `2a2e6ec` chose 20.4 as the rounded weighted average (16.27 m).
- This round's weighted average is 16.19 m (world 20.30). It stays about 16.18 m after finding 1.
- The record now says 20.4 is "a value inside both ranges and among these alternatives". That test passes anything from 16.17 to 16.48 m (world 20.3 to 20.6), so it doesn't select 20.4.
- The only computed value that rounds to 20.4 is the 16.28 m meeting point, which finding 1 removes.

**How it fails:** the constant departs from the record's own method by 0.1 m, and the plan's acceptance criterion (`plan.md:33`) asks for the reason to be recorded.

**Repair (recommended):** set `VAUX_OCULUS_Y` 20.3 (16.19 m) before landing; the unit hasn't landed, so the cost is a re-gate and re-render. Then update the records:
- "16.2 m" and "1.1 m lower";
- 8.26 m from the preset and 7.98 m from P8's camera at the model's place.

If 20.4 stays, the record must say it is kept by choice, 0.1 m above its own average.

##### 3. Minor: the friezes' alternative reports only one tier
**Where:** `interior.md:243`; `windows.py.txt:432–433`.

**What's wrong:**
- "With the friezes' distortion instead of the tiers', P8 reads 16.68 m" uses the middle tier's vanishing point at 1.5 × 10⁻⁸ (row −5,444).
- At that distortion the upper tier's is −4,979 (the output's `k 1.5e-08` line). That is 465 rows apart, nearly eight times the ±60 rows the record gives the reading.
- With the upper tier's point, by hand: pitch 23.28°, distance 12.35 m, eye 1.36 m, P8's centre 17.36 m, weighted average 16.31 m.

**How it fails:** the block reports the side that lowers P8 and leaves out the side that raises it, and these alternatives are the record's reason for the model's value.

**Repair:** give both. If the middle tier is kept, say why: it straddles the frame's centre, so it depends least on the distortion (−5,536 to −5,357 over 0 to 3 × 10⁻⁸).

##### 4. Minor: F11 is resolved only in words for two inputs
**Where:** `interior.md:233`, `:236`; `plan.md:44`; `windows.py.txt:216`, `:221`, `:432`; `snapshots/0_windows.py.txt:22`.

**What's wrong:** the record says every number comes from the kept readings through one script, and the plan says the script "reproduces every number from them". Two P8 inputs are in neither:
- **−5,421 and the "±60 rows" drawn from it.** This exists only as a typed default in `0_windows.py.txt:22`.
- **The friezes' bow, "1 to 12 px", and the 1.5 × 10⁻⁸ it suggests.** This is typed at `:221` and `:432`. It sets the sweep's low end and the alternative in finding 3.

**Repair:** keep the friezes' edge readings and fit the distortion from them in the script, or say these two are readings taken outside it.

#### Nits

5. **#29's horizontal scale is anchored where the script's own camera disagrees** (`windows.py.txt:282–285`).
   - `sx_at` sets horizontal = vertical scale at row 2,057.
   - The script's focal length (4,732 px), vanishing point (−122,943) and eye (2.77 m) put the horizon on the screen's plane at row 2,953.
   - That gives a principal point near row 2,775 and a tilt of 2.16°, consistent with "its view shifted up" (`interior.md:240`).
   - With that camera the horizontal scale at row 2,057 is 0.6% larger than the script's: #29's glazing reads about 2.266 m, not 2.280. The weighted 2.24 still rounds to 2.25.
   - Corroboration: the screen's width (12.9–13.0 m against the Met's 12.80, `interior-images.md:97`) would come in closer to 12.80.
   - Repair: derive the horizontal scale from the camera, or state the assumption.
6. **F24 is resolved only in words** (`interior.md:240`, `:242`; `plan.md:49`; `windows.py.txt:386`).
   - The 281 px the free-width check uses was "between its jambs' edges" in `2a2e6ec`. It is now a mixed pair: the left jamb's edge to the opening's right edge.
   - A new 312 px reading appears, and the quoted 265–312 span still counts the curtains.
   - With 312 px, the doorways would be 2.51 m at the map's place and 3.34 m at the model's (west window about 21.2 m).
   - Repair: name the doorway's own edges and use only those.
7. **The man's occluder is misnamed** (`interior.md:237`; `windows.py.txt:228–231`).
   - His column crosses the screen 1.09 m north of P8's line, 0.96 m up.
   - From a camera on the axis, that falls where the die and coping have stopped (they stop at 1.22 m). What stands there is the gate's iron jamb: inner face at 1.03 m, rising to the same 0.98 m level (`choir-screen.ts:38–51`).
   - The row stands. But a camera more than about 6 cm south of the axis would put his column in the open gate, where his feet would show.
8. **The preset comparison mixes planes** (`windows.py.txt:416` against `:417`; `interior.md:245`; `plan.md:50`).
   - `pre` measures to the partition line (−99.4); `alt` measures to the screen's west face (−99.5).
   - On the west face, the preset's number is 8.25 m, not 8.30.
9. **"±" stands in for lopsided bounds** (`constants.ts:39`; `devlog/summary.md:5`).
   - "16.8 ± 0.9" and "16.0 ± 0.5" don't match the output's bounds, 15.62–17.50 and 15.67–16.65.
   - The devlog's "the two windows agree" also drops the record's qualifier.
10. **"Meet at the same point"** (`interior.md:236`): the tiers meet at the same row by construction, but their x's there are about 1,085 and 1,069, which the script averages to 1,077. Say "the same row".

#### Answers to your questions

1. **Repairs.**
   - **Resolved:** F12, F13, F14, F16, F17, F19, F21, F22, F23.
   - **Resolved except one point:** F15 and F18 (the preset's plane, nit 8); F20 (the occluder, nit 7).
   - **Partly or only in words:** F11 for the friezes' bow and −5,421 (finding 4); F24 (nit 6).
   - **F25:** the weights are now named correctly, but the input it adopted is contradicted by the map (finding 1) and the value it kept isn't chosen by its rule (finding 2).
2. **The script.**
   - **Correct:** the refit, the agreement point, the projective map, the named planes (except `pre`), the base offset, the circle fits, the un-roll check and the crossings.
   - **Exceptions:** nits 5 and 8, and finding 3.
   - **Two checks beyond the code:**
     - The projective map is the one a pinhole camera gives. It also matches work unit 4's own heights (5.088 m against 5.167 m at one scale, `docs/work/4_cited-images-viewed/reviews/4_implementation.md:78`), which the old logarithm didn't (5.129).
     - #29's window height doesn't depend on the base row at all. So F22 moves only the eye height, and the base-projection sweep adds nothing to the window's range.
   - **Numbers:** every number I compared across the record, the plan, both photographs' entries, `constants.ts`, the devlog and work unit 4's note matches the output, apart from nits 8–10.
3. **Keeping 20.4.** Not justified as the record states it (finding 2). I recommend 20.3.
4. **What the repairs broke.**
   - The full-wall input entered the record, both sweeps and a stale script comment.
   - The 281 px reading was redescribed (nit 6).
   - The rule for choosing the model's value changed without saying so.

#### What I checked

**Recomputed by hand:**
- **P8:**
  - the camera fit: 12.577 m, 1.592 m, pitch 22.03°;
  - the surround: 16.770 m and 3.463 m; the glazing: 2.207 m;
  - the camera places: −118.80 and −112.08;
  - the model-place window: 13.90 m;
  - the man: 31.8–31.9 m away, 1.09 m north, coping row 2,492;
  - the field: 53.3° and 51.3°; the preset and model-place numbers: 8.30 and 8.02 m;
  - the friezes' alternative: 16.68 m; the full-wall alternative: 16.30, 16.27 and 16.28 m.
- **#29:**
  - the scales: 176.05 and 176.95 px/m;
  - the camera: 4.041 m, 26.741 m, 4,732 px;
  - the eye: 2.770 m;
  - the window: 12.015 m on the screen's plane, 16.026 m on the wall;
  - the surround: 3.453 and 3.433 m; the set-back: 0.551 m; the glazing: 2.280 and 2.193 m;
  - the model place: 22.05 m; the free width: 4.03 m, 2.28 and 3.04 m, 21.41 m.
- **The circle fits' selection:** 47 → 46 surround rays and 50 → 40 frame rays.
- **The vanishing-point crossing:** from the printed grid, about 2.68 × 10⁻⁸ at row −5,376.
- **The un-roll check:** checked analytically.
- **The map's partition:** a 2.31 m gap at world −106.12.

**Files read outside the diff:**
- **Rules:** `AGENTS.md`, `CLAUDE.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`, fleet's `multi-cli-review.md`.
- **This unit:** `reviews/0_implementation.md`, `snapshots/0_windows.py.txt`, `interior.md:200–259`.
- **Work unit 4:** `plan.md:47` and `reviews/4_implementation.md:78`.
- **Model code:** `medieval-hall.ts:40–79` and `:180–243`, `choir-screen.ts:20–94`, `vaux-shell.ts:134–147` and `:234–247`, `presets.ts:67`, grep hits in `constants.ts`, `vaux-front.ts`, `vaux-roof.ts` and `galleries.ts`.
- **Map cache:** `research/cache/README.txt` and `lm_features.json`.
- **Other:** `docs/work/registry.json`, and `tmp/hall-windows/verify-4.log` (732 unit and 125 e2e tests passed; the log doesn't name the revision).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F26 | The east wall's inner face was allowed up to a full wall (1.2 m) west of the map's line, though the map puts it on the line: the backs of the half-columns against it stand there, as the west ones stand on the west wall's face. The 16.28 m meeting point, P8's low end, #29's high end and "the east wall's face dominates" rested on it (Claude 1) | Accepted: checked on the map cache, the half-columns uid 447599798201 and 800006440452 end at world Z −83.33 and −83.32 and the doorway's line stands at −83.34 | Both sweeps move the east wall's and the screen's faces together by ±0.1 m, and the record cites the half-columns. The full-wall alternative and its meeting point are dropped. P8 now ranges 16.03 to 17.50 m and #29 15.66 to 16.42 m; the record names what moves each most |
| F27 | The record kept `VAUX_OCULUS_Y` 20.4 as "inside both ranges and among these alternatives", which selects nothing: the weighted average is 16.19 m (world 20.30), and the only computed value that rounds to 20.4 was F26's meeting point (Claude 2). Codex judged 20.4 acceptable as a recorded choice | Accepted: with F26 the average stays 16.19 m, so the model takes the record's own rule | `VAUX_OCULUS_Y` 20.3 (16.19 m), the weighted average rounded to 0.1 m in the world frame. The opening stays 2.25 m, the glazing's 2.24 m rounded to 5 cm. The records say 16.2 m and 1.1 m lower, and the renders were taken again |
| F28 | The friezes' alternative used only the middle tier's vanishing point; at that distortion the upper tier's stands 465 rows away and raises P8 (Claude 3) | Accepted | Both are given. At the friezes' distortion, now fitted (1.89 × 10⁻⁸), P8 reads 16.71 m with the middle tier's point and 17.17 m with the upper tier's, and the averages 16.18 and 16.27 m. The sweep follows the middle tier, which straddles the frame's centre, and says why |
| F29 | Two P8 inputs were not in the kept readings: −5,421 with the "±60 rows" drawn from it, and the friezes' bow with the 1.5 × 10⁻⁸ it suggested (Claude 4) | Accepted | The friezes' 212 edge readings are kept (`snapshots/p8-friezes.txt`), and the script fits the distortion from them: 1.89 × 10⁻⁸ together, 0.6 to 3.0 × 10⁻⁸ edge by edge, which disagree beyond their noise. −5,421 is dropped: each tier's vanishing point now carries a jackknifed standard error over its balusters, 42 to 45 rows, which with the distortion centre's 70 rows sets the sweep's ±161 rows. The friezes' rows on the centre column, typed in the script, agree with the kept readings to 0.9 px |
| F30 | #29's horizontal scale was set equal to its vertical scale at the screen's middle row, which no single camera gives: one consistent camera reads the glazing about 2.264 m, not 2.280 (Codex 1, Claude 5) | Accepted | #29 is solved as one pinhole camera from the cross, the vanishing point, the two floor lines and the framing doorway: focal length 4,769 px, tilt 2.17°, principal point at row 2,772. Every height and width is read through it; the glazing reads 2.27 m |
| F31 | "16.8 ± 0.9" and "16.0 ± 0.5" attached half-ranges symmetrically to nominal values that are not the ranges' midpoints (Codex 2, Claude 9) | Accepted | Intervals throughout: `constants.ts` and the devlog give 16.8 m (16.0 to 17.5) and 16.0 m (15.7 to 16.4) |
| F32 | The two tiers agree in row, not at one point: their columns there are 1,085 and 1,069 (Codex 3, Claude 10) | Accepted | The record says the same row, 16 px apart across it, averaged to 1,077, and the script prints the gap |
| F33 | The preset's comparison mixed planes: the partition line for the preset, the screen's west face for P8's camera (Codex 4, Claude 8) | Accepted | Both on the screen's west face: for the window at 16.19 m, 8.21 m from the preset and 7.98 m from P8's camera at the model's place |
| F34 | Solving the eye and the base's offset after the scale was anchored to the cross moved the cross to 15.837 m (Codex 5) | Accepted | The pinhole solve (F30) holds the cross at 15.85 m exactly |
| F35 | The arcade's ±10 px varied the columns only; with the rows too the third feature spans 27.72 to 31.31 m (Codex 6) | Accepted | Both coordinates are swept: 27.7 to 31.3 m, against the model-place east wall's 28.2 to 29.4 m, so the arcade still does not decide |
| F36 | F24's doorway readings mixed edges: 281 px ran from the left jamb's edge to the opening's right edge, and the span still counted the curtains (Claude 6) | Accepted | The doorway's own edges were read again on the original: 287 px between its jambs' inner edges (286.5 to 287.8 over 18 bands of rows, kept as `snapshots/m29-west-doorway.txt`), against 276 to 284 predicted. The lines 316 px apart are the pilasters' edges. The free-width check uses 287 px: 2.30 m at the map's place, 3.07 m at the model's |
| F37 | The man's occluder is the gate's iron jamb, not the base's coping, with the camera on the axis (Claude 7) | Accepted | The record names the jamb from #29 (the die and coping stop 1.22 m out; the jamb's inner face stands 1.03 m out and rises to the coping's level), gives his column 1.09 m north of the camera's line, and notes that a camera more than about 6 cm south of the axis would show his feet in the open gate |
