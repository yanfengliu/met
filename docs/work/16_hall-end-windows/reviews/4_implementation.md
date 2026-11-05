# Review 4: implementation (focused)

## Target

The met repository, commit `4288b42` on branch `claude/hall-windows-1d984d`, which repairs review 3's findings (F38 to F46) on top of `00ae202`; the reviewers had its diff against `00ae202` and the script's output, and were asked to check the repairs and the numbers they changed. The script it carries is `snapshots/windows.py.txt` at that commit (sha256 `f37c1f2e573abef68e68dfc41746e77e718544b779bb6e231d2e129fe700cc24`). The prompt's sha256 is `1d1e0248dcbd415effacc5fb738d5ab7dbcd7d52d75a1c42dbf6e5c60a2ab9ad`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents; the fleet's check of its log found no failed commands (`keep`). It reproduced the output. It checked F38 by projecting all 729 of #29's sweep cases forward (within 10⁻⁷ px). It recomputed the friezes' inverse-variance mean, χ² and scaled error, and the frieze heights on the screen's face by inverting work unit 4's projection. It gave every alternative's world height unrounded. Outside the diff it read `choir-screen.ts`, `frame.ts`, work unit 4's review 4, the four readings files, and the rules, lessons and spec. `git diff --check` passed. It did not rerun `npm run verify`, look at renders or remeasure the photographs.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. Running Python and copying files were refused in its lane, so it recomputed by hand, and its finding 1's figures are hand estimates; it used no subagents. Outside the diff it read the rules and lessons, `choir-screen.ts` and the windows' constants where they are used, the record, P8's entry, review 2, work unit 4's review 4, `m29-window-edges.txt` in full, the map cache's README and four features, and the last gate's log.
- The worktree was unchanged after both lanes.

## Reports

### Codex

Reviewed `4288b42` against `00ae202`, serially and read-only. **One nit; no major or minor findings. F38–F46 are resolved in substance.**

1. **Nit — The heading-margin formula changes the last reported digit.** [windows.py.txt:353](docs/work/16_hall-end-windows/snapshots/windows.py.txt:353) computes `atan((north − 1.03) / distance)`. Rotating an already off-axis ray requires `atan(north / distance) − atan(1.03 / distance)`. The exact result is **0.283554° → 0.28°**, versus the script’s **0.285572° → 0.29°**, repeated in [interior.md:237](docs/research/interior.md:237). The approximation misses the jamb boundary by only **0.45 mm**; neither model constant changes. **Repair:** use the angular difference and refresh the reported value, or describe the margin as approximately **0.3°**.

The remaining checks passed:

| Repairs | Result |
|---|---|
| F38 | Both calibration and cross-check use `ds + 0.1`. The west centre falls **0.051896 m**, to **15.982153 m**. Independent forward projection checked all **729** sweep cases within **10⁻⁷ px**. |
| F39 | Surround, outer glazing and inner glazing use both conversions. The glazing sweep and weighted average use the repaired mean; the combined result is **2.241180 m**, rounding to **2.25 m**. |
| F40 | The pool is explicitly unweighted. Independently recomputed inverse-variance mean **1.992707 × 10⁻⁸**, disagreement **349.941**, and scaled error **7.206603 × 10⁻⁹** match. |
| F41 | Both focal-length sweeps now use exactly **2673–2727 px**. |
| F42–F43 | The plan distinguishes overlapping ranges from symmetry; work unit 4 distinguishes measurements from model choices. |
| F44 | The heading assumption and positional margin are disclosed; only the numerical nit above remains. |
| F45–F46 | All four inputs are named, the jackknife wording identifies the corrected distortion, and the plan attributes the constant change to the rounding rule. |

The new frieze alternative also checks: independently inverting work unit 4’s reciprocal projection and reading through #29’s camera reproduces **10.553231, 8.348230, 7.679746 and 5.065672 m**.

The rounding disclosure in [interior.md:258](docs/research/interior.md:258) is honest:

| Case | Unrounded world height | Rounded |
|---|---:|---:|
| Nominal | 20.258996 | 20.3 |
| Frieze distortion, middle tier | 20.245687 | 20.2 |
| Frieze distortion, upper tier | 20.343021 | 20.3 |
| Friezes on the east face | 20.252949 | 20.3 |

The nominal margin is **9.00 mm**; the face alternative has only **2.95 mm**. The changed numbers in the record, plan, photograph entries, constants comment, devlog and work-unit-4 note match the reproduced output.

Outside the diff, I read `src/model/core/choir-screen.ts`, `src/model/frame.ts`, work unit 4’s `reviews/4_implementation.md`, the four readings files, and the applicable rules, lessons and specification.

`git diff --check` passed. I did not rerun `npm run verify`, inspect renders or remeasure photographs. No files changed; no browser or server was launched.

### Claude

### Review round 4 of work unit 16: commit `4288b42` against `00ae202`

**Verdict:** no major findings. There are two minor findings and five nits. `VAUX_OCULUS_Y` 20.3 holds under every correction below. `VAUX_OCULUS` 2.25 probably holds, but finding 1 leaves it only a few millimetres from its rounding boundary.

**Limits of this lane:** running Python and copying files were both refused here. So I could not run `windows.py`. I checked the changed formulas and recomputed the key values by hand. Finding 1's numbers are hand estimates and should be confirmed by running the fixed script. I used no subagents. The worktree is unchanged (`git status --porcelain` is empty at `4288b42`).

#### Findings

##### 1. Minor: #29's circle fits sit on the horizontal axis, not between the two axes, and their centres sit low (F39's premise fails for these readings)

**Where:** `snapshots/windows.py.txt:408`, `:504–507` and `:520–521`; `snapshots/m29-window-edges.txt:3–83` (the readings that go missing near the top are at `:38–49`); `docs/research/interior.md:256` and `:258`; `reviews/3_implementation.md:165` ("which bound it").

**What's wrong:**
- The repair assumes a one-radius fit lands between the ellipse's two semi-axes. That is true only when the readings go evenly round the whole circle.
- The kept surround readings sit at −5°, 20–75°, 107.5–165° and 185°. None lies between 75° and 107.5°: those rays read 232 to 245 px, so the filter at `:408` drops them, and 87.5° is dropped at the 2 px cut.
- The frame's kept rays run from −5° to 185° around the rays' origin. That origin is 22.8 px above the frame's own centre, so every kept frame point lies in the frame's upper half (about 5° to 175°).

**The geometry:**
- Take the image of the circle as an ellipse with horizontal semi-axis a and vertical semi-axis b = a(1 − e). Here e = 0.0122, since ring_v/ring_h = 1.0123.
- For points (a cos t, b sin t), x² + y² ≈ a² − 2ea²·sin²t.
- A circle fit then puts its radius at a(1 − e·p) and its centre e·a·q below the true centre. Here q and p are the slope and intercept of sin²t regressed on sin t over the kept points.
- Round a full circle, q = 0 and p = 0.5. The radius is then (a + b)/2 and the centre is unbiased: that is the case the repair assumed.
- Over the kept surround points I get q ≈ 1.04 and p ≈ −0.19. So the radius is about 1.0023·a and the centre sits about 2.7 px low. The frame gives about the same radius ratio, with its centre about 1.6 px low.

**How it fails (hand estimates):**
- **Diameters:** both conversions overstate the diameter.
  - The surround is about 3.39 m, below both the 3.40 and 3.44 m conversions, not 3.42 m.
  - The glazing to the frame's outer edge is about 2.255 m, not 2.27 m (the record's 2.26 to 2.29 does not bound it).
- **#29's centre:** it rises about 0.022 m, to about 16.00 m instead of 15.98 m.
- **Set-back:** the centres' offset grows by about 1 px, so the set-back becomes about 0.58 m instead of 0.55 m.
- **The model's height:** the average becomes about 16.17 m (world about 20.28), still 20.3. The middle-tier alternative becomes about world 20.26, so it no longer rounds to 20.2, and the margin sentence at `interior.md:258` has to change.
- **The model's opening:** the glazing average falls to about 2.226 to 2.229 m. That still rounds to 2.25, but within about 4 mm of the 2.225 m boundary, so the rounding needs the script's own number.
- **Wording:** the Conclusion (`:258`) still calls #29's two conversions "its two readings", which is what F39 said they are not. The script's comment (`:504`) says "about 1 %" where the record says 1.2%. With the surround at about 3.39 m, "about 3.45 m" for the surrounds rests on P8's vertical reading alone.

**Repair:**
- Fit each circle in the wall's own metres. Convert each edge point through #29's camera, using `across` and `height` at the wall's distance (or the glazing's), and fit the circle there. The radius is then half the diameter, and the centre is the window's height.
- A simpler alternative: scale each point's vertical offset by 1/(1 − e) before fitting.
- Then refresh #29's centre, surround, glazing and set-back, both averages and the margin sentence, and state the glazing's rounding margin.

##### 2. Minor: the rounding margin's numbers are not in the script's output

**Where:** `interior.md:258` ("9 mm over", "4 mm under it, at world 20.246", "with the friezes on the screen's face, it rounds to 20.3"); `reviews/3_implementation.md:164` ("world 20.253"); `windows.py.txt:580–581`, `:613` and `:629–630`. These contradict `interior.md:233`: "Every number below comes from them through one script."

**What's wrong:** none of 9 mm, 4 mm, 20.246 or 20.253 appears in the output.
- The script prints the nominal average as "world 20.26".
- It prints the middle-tier alternative as "average 16.14 m", with no world value.
- It prints the friezes-on-the-face case as "(world 20.25)", which is the rounding boundary itself.

**How it fails:** I bounded each case from the printed digits (centres to 0.01 or 0.001 m, half-ranges to 0.01 m):
- the face case lies anywhere from about world 20.249 to 20.257;
- the middle-tier case lies from about 20.243 to 20.250.

So a rerun cannot confirm either rounding the record states. The nominal itself is unambiguous (20.256 to 20.263), so 20.3 is supported.

**Repair:** print every average in the world frame to 1 mm, with the value it rounds to, and quote those numbers.

##### 3. Nit: "Either value lies well inside both ranges" overstates

**Where:** `interior.md:258`. A world height of 20.2 is 16.09 m over the floor. That is only 0.05 m above P8's lower end (16.04 m), at the bottom of the 16.04 to 16.36 m overlap.

**Repair:** say both values lie inside both ranges, 20.2 only 0.05 m above P8's lower end.

##### 4. Nit: the nominal treats one bias two ways

**Where:** `interior.md:258`; `reviews/3_implementation.md:164`; `windows.py.txt:212` against `:624–627`.
- #29's solve now puts the cross on the screen's line.
- But P8's nominal still uses work unit 4's frieze heights. Through the same #29 camera, the record says those heights stand 0.02 to 0.04 m too high on the face where the friezes are.
- The disposition's "as that unit measured them" says where the heights came from, not why they should be kept.
- A consistent nominal would read P8 at 16.74 m and the average at 16.14 m (about world 20.253; higher once finding 1 is fixed).

**Repair:** use the face heights in the nominal, or state why work unit 4's are kept.

##### 5. Nit: "about one such error" depends on which error scaling is used

**Where:** `interior.md:236`; `windows.py.txt:192–198`.
- The script's numbers are right. From the printed edge values I get χ² ≈ 352, a scaled error of 7.2 × 10⁻⁹, and an inverse-variance mean of 1.995 × 10⁻⁸.
- But the script scales the unweighted pool's own error, which uses one residual variance for all four edges, by a χ² built from each edge's separate error.
- The usual scaling of the inverse-variance mean (Birge's ratio) gives 0.033 × √(340/3) ≈ 0.35 × 10⁻⁸. A random-effects mean of the four edges gives about (1.67 ± 0.42) × 10⁻⁸.
- On either of those, the tiers' 2.68 × 10⁻⁸ lies about two errors away, not one.

**Repair:** name the scaling used and note that the usual ones put the tiers about two errors off, or drop the comparison.

##### 6. Nit: "their weighted average, 16.2 m"

**Where:** `docs/devlog/summary.md:5` and `docs/work/4_cited-images-viewed/plan.md:47`. The weighted average is 16.15 m (16.149 m by the record's own 9 mm), which is 16.1 m to one decimal. 16.2 m is the model's 16.19 m: that average rounded in the world frame.

**Repair:** say "their weighted average rounded in the world frame, 16.19 m".

##### 7. Nit: "the screen's plane" is now ambiguous

**Where:** `interior.md:251` and `windows.py.txt:434`.
- After F38, the bullet before it puts the cross "on the screen's line … 0.1 m beyond its east face".
- "0.15 m before the screen's plane" here means the east face. That matches `base_off` measured from `ds`, and `choir-screen.ts:149`'s base at ±0.25 m from the line.
- Read as the line, it would misplace the base by 0.1 m.

**Repair:** say "before its east face".

#### Answers to your questions

**1. Do the repairs resolve their findings?**
- F40 to F46 are resolved in substance.
- F38 is resolved for #29's solve. Its frieze-height half is reported as an alternative but not applied (nit 4).
- F39 is in place in form, but its premise fails for these readings (finding 1). The Conclusion's "two readings" for #29 is the one place where it is resolved only in words.

**2. Are the script's changed parts right?**
- **The cross on the screen's line (`CROSS_BEHIND`):** the sign and size are right. It is `Z_SCREEN_FRONT_E − Z_PARTITION` = 0.10, and the model builds the cross at `SCREEN_Z` ± 0.05 (`choir-screen.ts:267–270`).
  - The printed camera meets all its conditions: the cross gives tan 0.48667 against 13.083/26.882 = 0.48668, and the framing doorway reads 2,670.1 px. From the floor lines, ds comes out 26.781 m and the eye 2.767 m. The window reads 15.982 m.
  - It moves the focal length from 4,769 to 4,787 px and the principal point's row from 2,772 to 2,770. The camera moves from 4.068 to 4.082 m east of the doorway, and #29's window from 16.03 to 15.98 m.
- **The circles' means:** see finding 1.
- **The friezes:** see nit 5.
- **The focal-length sweep:** it uses 2,673 and 2,727 px in both the one-at-a-time cases and the full sweep.
- **The man's heading margin:** 0.29° is atan(0.0637/12.577). The exact geometry gives 0.288°.
- **The friezes on the face:** I reproduced 10.553 m and 5.065 m (5.066 printed) by hand, through the inverse of work unit 4's reciprocal map and #29's camera. Work unit 4's review 4 confirms that map (`reviews/4_implementation.md:31`, `:101`).
- **Numbers across the files:** every number in the record, the plan, both photographs' entries, `constants.ts`, the devlog and work unit 4's note matches the output, apart from finding 2.

**3. Is the rounding margin stated honestly?** The rule (the average rounded to 0.1 m in the world frame) is stated. The margin's figures are not output by the script (finding 2), and "well inside both ranges" overstates (nit 3). Once finding 1 is fixed, the height's margin widens to about world 20.28. The glazing's margin becomes the thin one.

#### Not findings
- `tmp/hall-windows/verify-6.log` shows 732 unit and 125 end-to-end tests passed, with gate exit 0. It doesn't name its revision. `4288b42`'s only change under `src/` is a comment (`constants.ts:39`), and the plan's "Repairs gated" box is still open.
- The map agrees with the record:
  - The partitions (uid 1004239343162 and 722237317931) lie at world Z −106.12 with a 2.31 m gap.
  - The east half-columns' backs (uid 447599798201 and 800006440452) sit at −83.33 and −83.32.

#### Files read outside the diff
- **Rules:** `AGENTS.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`, `../fleet/docs/skills/multi-cli-review.md`.
- **Model code:** `src/model/core/choir-screen.ts:138–277`; `constants.ts` lines 18, 39–40 and 62–63; the uses of `VAUX_OCULUS` in `medieval-hall.ts:213`, `vaux-shell.ts:239` and `vaux-front.ts:109`.
- **Records:** `interior.md:225–261`; `interior-images.md:43` (P8's entry); `reviews/2_implementation.md`; work unit 4's `reviews/4_implementation.md` (lines 1–12, 31, 78 and 101).
- **Readings:** `m29-window-edges.txt` in full.
- **Map cache:** `research/cache/README.txt` and four features in `lm_features.json`.
- **Gate:** `tmp/hall-windows/verify-6.log` and `verify-and-views.sh`.

## Findings and disposition

Neither lane found a major problem: Claude two minor findings and five nits, Codex one nit, merged as F47 to F54. This was the unit's fifth repair, the cap on automatic repairs (`AGENTS.md`, R11).

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F47 | F39's premise fails for these readings: the kept rays cover only the circles' upper halves and sides (−5° to 185°, and the frame's points all lie in its upper half), so a circle fitted on the image, where the wall's circle is a 1.2% flattened ellipse, sits low and takes about the horizontal semi-axis. Both conversions overstated the diameters, and #29's centre sat about 0.02 m low (Claude 1) | Accepted: the script confirms it | Each circle is fitted on the wall, in metres: every kept edge point is carried through #29's camera onto the wall at unit distance and fitted there, and since an algebraic circle fit follows a uniform scaling, one fit per circle serves every distance. #29 now reads 16.01 m (15.63 to 16.39), the surround 3.39 m (3.32 to 3.47), the glazing 2.26 m (2.21 to 2.31) to the frame's outer edge and 2.17 m to its inner edge, the set-back 0.58 m; the fits leave 2.2 and 4.1 mm rms. The average becomes 16.169 m, world 20.279, still 20.3; the glazing's 2.230 m still rounds to 2.25, 5 mm inside, which the record now says, with the readings' 2.13 to 2.26 m allowing 2.20 m too. The surrounds read about 3.4 m wherever 3.45 m stood |
| F48 | The rounding margin's numbers (9 mm, 4 mm, 20.246, 20.253) were not in the script's output, which printed the averages to the centimetre (Claude 2) | Accepted | The script prints every average to the millimetre in the world frame with the value it rounds to and its margin, and asserts that the model takes the rounded average and the rounded glazing. The record quotes those numbers |
| F49 | "Either value lies well inside both ranges" overstated: 20.2 stood 0.05 m above P8's lower end (Claude 3) | Accepted | After F47 the alternatives round to 20.3 or, with the upper tier's vanishing point, 20.4; the record says both lie inside both ranges, without "well" |
| F50 | The nominal treated one bias two ways: #29's cross moved onto the screen's line, while P8 kept work unit 4's frieze heights, which the same correction lowers (Claude 4) | Accepted: the reason was missing | The record states it: the model's screen is built to work unit 4's heights (`choir-screen.ts`), so with them the window keeps the place against the model's friezes that P8 shows it in. The face heights stay an alternative (16.163 m, world 20.273, also 20.3) |
| F51 | "About one such error" depended on the scaling: the usual scalings put the tiers about two errors from the friezes (Claude 5) | Accepted | The script prints both scalings: the tiers' 2.68 × 10⁻⁸ stands 1.1 errors from the unweighted pool (scaled by √(χ²/3)) and 2.0 from the inverse-variance mean (Birge's ratio, 0.35 × 10⁻⁸); the record gives both |
| F52 | The devlog and work unit 4's note called 16.2 m the weighted average, which was 16.15 m; 16.2 m is the model's 16.19 m (Claude 6) | Accepted | Both say the weighted average rounded in the world frame, 16.19 m |
| F53 | "0.15 m before the screen's plane" became ambiguous once the cross stood on the screen's line (Claude 7) | Accepted | The record and the script say "before its east face" |
| F54 | The heading margin was computed as atan((north − 1.03)/d) where rotating an off-axis ray needs atan(north/d) − atan(1.03/d): 0.28°, not 0.29° (Codex 1) | Accepted | The script takes the angles' difference; the record says 0.28° |

Not a finding: Claude noted that `verify-6.log` does not name its revision. It ran on the tree committed as `4288b42`, whose only change under `src/` was the comment in `constants.ts`; the gate of this repair is `verify-7.log`.

## Verification

- `npm run verify` passed on the reviewed tree, `4288b42` (`tmp/hall-windows/verify-6.log`), and on the repairs' tree, committed as `0c39a0f` (`verify-7.log`: 732 unit and 125 end-to-end tests).
- Codex reproduced the output and projected all 729 sweep cases forward for F38. It recomputed the friezes' statistics and the frieze heights on the screen's face, and gave every alternative's height unrounded. Claude recomputed by hand; its finding 1's figures are hand estimates, which the repaired script confirmed.
- From `0c39a0f` the script asserts that the model takes the rounded average and glazing, though at that revision against its own copies of the model's values (F55).
- Neither reviewer could fetch the photographs, so no one remeasured them; the repository never stores them. Claude's lane could not run Python or copy files.

## Round outcome

No major findings. Claude found two minor problems and five nits, Codex one nit, merged as F47 to F54. All were accepted and repaired at `0c39a0f`, among them fitting #29's circles on the wall. It was the unit's fifth repair, which reached the cap on automatic repairs (R11). `VAUX_OCULUS_Y` stayed 20.3 and `VAUX_OCULUS` 2.25. Review 5, focused and final, re-reviewed the repairs; none of this round's findings stayed open.
