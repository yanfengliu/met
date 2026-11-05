# Review 3: implementation

## Target

The met repository, commit `00ae202` on branch `claude/hall-windows-1d984d`, which repairs review 2's findings (F26 to F37) on top of `9833aab`; the reviewers had its diff against `9833aab` and the script's output. The script it carries is `snapshots/windows.py.txt` at that commit (sha256 `3dab295bd8a7869d3b1da7a08bd685b5f2844d791681475a2c602f75d7bd5ef5`). The prompt's sha256 is `6b12a6858cbad026d82fe9a5778781dec461628e7e677849d1ac77512329765b`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents; the fleet's check of its log found no failed commands (`keep`). It reproduced the script's output. On its own it minimised the friezes' fit (1.885087 × 10⁻⁸, with its error) and recovered a known distortion from synthetic edges. It jackknifed the tiers' crossing directly (1.5033 × 10⁻⁹ against the script's 1.5049 × 10⁻⁹), and projected all 729 of #29's sweep cases forward, which reproduced the calibration readings within 10⁻⁷ px. Outside the diff it read `vaux-shell.ts`, `vaux-front.ts`, `medieval-hall.ts`, `choir-screen.ts`, `frame.ts`, `presets.ts`, the earlier reviews, the rules and spec, and the map cache. `git diff --check` passed. It did not rerun `npm run verify`, look at renders or remeasure the photographs.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. Running Python was refused in its lane, so it recomputed by hand and checked the formulas of the sweeps, the circle fits and the jackknife instead of rerunning them; it used no subagents. Outside the diff it read the rules and lessons, reviews 0 and 1, `interior.md` and P8's entry, `presets.ts`, `choir-screen.ts`, the windows' constants where they are used, the registry, the map cache's README and five features, the verify log and render script of the last gate, and two renders at native resolution.
- The worktree was unchanged after both lanes.

## Reports

### Codex

Reviewed `00ae202` against `9833aab`, serially and read-only. **Two nits; no major or minor findings.** The substantive F26–F37 repairs hold against the retained evidence.

1. **Nit — The focal-length sweep is ±1.11%, not ±1%.** [windows.py.txt:322](docs/work/16_hall-end-windows/snapshots/windows.py.txt:322) uses 2670–2730 around 2700, while the record says ±1%. Exact ±1% endpoints are 2673–2727; these give P8’s centre range **16.035–17.490 m**, versus **16.025–17.500 m**. **Repair:** label the existing sweep approximately ±1.1%, or change its endpoints and refresh the derived numbers. The rounded model height remains **20.3**.

2. **Nit — The run instructions omit a required input.** [windows.py.txt:3](docs/work/16_hall-end-windows/snapshots/windows.py.txt:3) lists three readings files, but line 542 also requires `m29-west-doorway.txt`. Copying only the documented inputs causes `FileNotFoundError`. **Repair:** include that fourth file in the header.

The repair coverage was:

| Findings | Assessment |
|---|---|
| F26–F27 | The map’s half-columns support the east face. Revised ranges and model rounding are implemented. |
| F28–F29, F32 | Both tier alternatives are reported. Frieze fitting, clipping, jackknife calculations and the horizontal discrepancy are reproducible. |
| F30, F34 | One consistent camera now supplies #29’s dimensions and preserves the cross-height constraint. |
| F31, F33, F35 | Intervals replace misleading symmetric errors; comparisons use the same screen face; arcade uncertainty varies both coordinates. |
| F36–F37 | The retained doorway readings support the calculation; the occluder and camera-position qualification are corrected. Original photographic identification remains unverified in this review. |

I reproduced the supplied output. Independent frieze minimization reproduced **1.885087 × 10⁻⁸**, including its curvature-based standard error; a synthetic distorted-edge case recovered its known distortion. Direct jackknifing of the tier crossing gave **1.5033 × 10⁻⁹**, consistent with the script’s propagated **1.5049 × 10⁻⁹**. Independent forward projection across all **729 #29 sweep cases** reproduced the calibration readings within **10⁻⁷ px**.

The unrounded averages are **16.18849475 m** and **2.23749619 m**. Adding the **4.11 m** floor elevation and applying the stated rounding gives **`VAUX_OCULUS_Y = 20.3`** and **`VAUX_OCULUS = 2.25`**. The updated record, plan, photograph summaries, constants, devlog and work-unit-4 note agree with the output, subject to nit 1.

Outside the diff, I read `vaux-shell.ts:239`, `vaux-front.ts:108`, `medieval-hall.ts:213`, `choir-screen.ts:38`, `frame.ts:44`, `presets.ts:67`, earlier review material, applicable rules/specification, and the map cache’s README and relevant features.

`git diff --check` passed. I did not rerun `npm run verify`, inspect renders or remeasure the photographs. No files changed; no browser or server was launched.

### Claude

I found no major or minor problems with `00ae202`, only 8 nits. The repairs to F26–F37 are real, and the script's new parts are right. Every number I compared matches the script's output: the record, the plan, both photographs' entries, `constants.ts`, the devlog and work unit 4's note. `VAUX_OCULUS_Y` 20.3 and `VAUX_OCULUS` 2.25 follow the record's stated rule, and none of the nits would change either value.

**How I checked.** This lane refused copying the script and running Python, so I recomputed by hand. I couldn't rerun the 729-case sweeps, the circle fits or the 6,641-centre jackknife. I checked their formulas instead, and checked that their printed results agree with each other. The script at `00ae202` has sha256 `3dab295bd8a7869d3b1da7a08bd685b5f2844d791681475a2c602f75d7bd5ef5`. Review 2's recorded hash for `9833aab`'s script checks out. I used no subagents and changed nothing: `git status` is clean at `00ae202`.

#### Findings (most consequential first)

##### 1. Nit: #29's solve puts the cross on the screen's east face; the model builds it on the screen's line
**Where:** `snapshots/windows.py.txt:456` (with `:24`, `:31`, `:424`); `docs/research/interior.md:249`; `src/model/core/choir-screen.ts:268–270` against `:149` and `:163–168`.

**What's wrong:**
- The solve places the cross's tip (15.85 m up) at distance ds, which runs to the screen's east face, 0.1 m east of the screen's line.
- The base is taken 0.15 m before that face, so 0.25 m from the line, which matches the model (base ±0.25 m, friezes ±0.13 to 0.16 m).
- The model builds the cross on the line itself (`SCREEN_Z` ± 0.05). The record only says "the screen's plane".

**How it fails:**
- With the cross on the line, the solve sees an effective cross height of 15.80 m, the same as a screen scale of 0.9969.
- By the script's own scale sensitivity (0.165 m per 1%), #29's centre falls about 0.05 m, to 15.98 m.
- Work unit 4's frieze heights, which P8 uses, were scaled by the same cross, so they read about 0.3% high (about +0.02 m on P8).
- The weighted average becomes about 16.15 m (world 20.26), still 20.3. The shift fits inside the ±1% scale sweep, but it is one-sided.

**Repair:** put the cross at ds + 0.1, or name the plane it stands on and sweep it with the faces.

##### 2. Nit: #29's "across" and "up and down" are one fitted radius at two scales, and the glazing average takes only the lower one
**Where:** `interior.md:256`, `:258`; `windows.py.txt:494–502`, `:570–573`; `src/model/core/constants.ts:40`.

**What's wrong:**
- The surround's 3.41 and 3.45 m come from one 209.5 px radius. The glazing's 2.27 and 2.29 m come from one 137.2 px radius.
- Their ratios (1.0126 and 1.0124) are exactly the camera's ratio of vertical to horizontal metres per pixel at those rows (1.0124 and 1.0122).
- A circle on the wall images about 1.2% shorter up and down, and a one-radius fit lands between the two axes. So each true diameter lies between the two numbers.
- P8's two glazing readings are independent and are averaged. For #29 the average takes only the lower conversion (2.27 m) and leaves 2.29 m out of #29's half-range.

**How it fails:** the record shows two readings where there is one, and it treats the two photographs differently. The model value holds: with #29 at 2.28 m the weighted glazing is about 2.25 m.

**Repair:** give each #29 circle as one diameter (surround about 3.43 m, glazing about 2.28 m) with the 1.2% as its bound. Or average both conversions, as P8's are.

##### 3. Nit: the friezes' joint value pools edges of unequal noise, and its printed error assumes a fit the edges reject
**Where:** `windows.py.txt:178–181`, `:190–191`; `interior.md:236`.

**What's wrong:**
- The joint cost sums raw px² over the four edges, whose rms ranges from 0.35 to 1.09 px. Weighted by their own printed errors, the edges average 2.0 × 10⁻⁸, not 1.89.
- The printed error, 6.7 × 10⁻¹⁰, holds only if one radial term fits all four edges. Against 1.89 they give χ² ≈ 350 on 3 degrees of freedom. Scaled by that misfit, the error is about 0.7 × 10⁻⁸.
- The error formula itself is right, and the printed values are consistent with each other: from the edge values, errors and rms I reproduce 1.89 and about 6.7 × 10⁻¹⁰.

**How it fails:** the record doesn't quote the joint error, and it rightly says the edges disagree beyond their noise. But the script prints 1.89 with "standard error 6.7e-10", a 4% calibration. Using 2.0 would move the upper-tier alternative from 17.17 to about 17.12 m.

**Repair:** scale the printed error by √(χ²/3) or drop it. Say that "straightest taken together" is an unweighted pool, or weight the edges.

##### 4. Nit: the plan's acceptance criterion still says the windows agree
**Where:** `docs/work/16_hall-end-windows/plan.md:33`, against `interior.md:258`.

**What's wrong:** it says "(they agree, so one height serves both)". After F26, P8's 16.77 m stands 0.35 m above #29's range, and #29's 16.03 m sits exactly on P8's lower bound. The record rests one height on the hall's symmetry, with the ranges overlapping only from 16.03 to 16.42 m.

**Repair:** "(their ranges overlap only from 16.03 to 16.42 m; one height rests on the hall's symmetry)".

##### 5. Nit: work unit 4's note gives the model's values as what both windows measure
**Where:** `docs/work/4_cited-images-viewed/plan.md:47`.

**What's wrong:** it says "both windows stand about 16.2 m over the floor with 2.25 m of glazing". Those are the model's weighted, rounded values. The windows measure 16.8 and 16.0 m, with 2.13 to 2.27 m of glazing. F31 fixed this kind of summary in `constants.ts` and the devlog, but not here.

**Repair:** "measure 16.8 m (east) and 16.0 m (west), with 2.1 to 2.3 m of glazing; the model builds both at their weighted average, 16.2 m and 2.25 m".

##### 6. Nit: the man check's 6 cm margin assumes the camera looks straight along the hall
**Where:** `interior.md:237`; `windows.py.txt:248`, `:343–344`.

**What's wrong:** `level()` removes only roll and pitch, and nothing measures P8's yaw (its sideways turn). "1.09 m north of the camera's line" is measured from the camera's heading. A yaw of 0.27° moves the crossing by the whole 6 cm.

**How it fails:** "with the camera on the axis the jamb hides his feet" also needs the camera to look along the axis to within about 0.3°. F37's conclusion still holds for any camera north of the axis.

**Repair:** say "on the axis and looking along it", and give the yaw margin.

##### 7. Nit: the script's docstring names three of the four readings files
**Where:** `windows.py.txt:3–4`, against `:542`.

**What's wrong and how it fails:** the docstring omits `m29-west-doorway.txt`. Copied beside only the files it names, the script stops at line 542 with a FileNotFoundError, after printing most of its output.

**Repair:** name the fourth file.

##### 8. Nit: two wording slips
- **`interior.md:236`:** the jackknife sentence ("42 to 45 rows") follows "Read as found", but it runs at 2.68 × 10⁻⁸ (`windows.py.txt:128–129`). Say "at the distortion below".
- **`plan.md:45`:** "so the readings' ranges narrow and `VAUX_OCULUS_Y` moves to 20.3". The average was already 16.19 m before F26; F27's rule moved the constant, as F27's own disposition says.

#### Answers to your questions

**1. The repairs.** All of F26 to F37 are resolved in substance; none is resolved only in words. Two leave something behind: F31's kind of summary survives in work unit 4's note (nit 5), and F37's new 6 cm margin assumes no yaw (nit 6).
- **F26:** checked on the map cache. The east half-columns' backs are at world −83.33 and −83.32 and the east door line at −83.34. The west half-columns' backs are at −117.60 and −117.62.
- **F29:** the friezes are fitted from the kept readings, and −5,421 and ±60 are gone from the record.
- **F36:** I recomputed the 18 bands: 286.9 px mean (286.5 to 287.8), and 315.8 px between the outer lines.

**2. The script's new parts are right.**
- **Friezes:** I counted the 212 readings (54, 59, 54, 45). The centre-column cross-check gives 995.6 by hand. The clipping, the parabola step and the error formula are right; see nit 3.
- **Jackknife:** the formula is standard. The distortion's error, 1.5 × 10⁻⁹, follows from the two tiers' 45 and 42 rows and the grid's slope. The crossing row's own error is about 37 rows, so using 2 × 45 is conservative.
- **Sweep:** the three distortions, the middle tier's rows (−5,421, −5,376, −5,359) and 161 = 2 × 45 + 70 all check. Following the middle tier is a documented choice. It leaves the upper tier's −5,105 out of the range, but the record reports that case separately (17.17 m).
- **#29 camera:** the geometry is right. Its printed solution satisfies all four conditions (distance 26.768 m, eye 2.775 m, 4.068 m from the doorway, frame 2,669.7 px). Through it I reproduced:
  - the window centre (16.034 m), the surround (3.455 and 3.412 m) and the set-back (0.551 m);
  - the glazing (2.266 m) and the west doorway (284.07 and 275.80 px);
  - the east doorway's crown, 5.01 m, as F-owner-3 says.
- **Free width:** the camera comes out 4.113 m from the east doorway, the same at both screen places.
- **Sensitivities and alternatives:** each photograph's one-at-a-time ranges add up to within 0.02 m of its full range. The alternatives (16.18 and 16.27 m, and meeting at 16.48 m with the screen +0.68 m) all check.
- **Numbers:** every number I compared matches the output.

**3. 20.3 and 2.25 are consistent with the rule and with the measurement.** 16.19 + 4.11 = 20.30, which rounds to 20.3. The glazing's 2.24 m (2.2365 by hand) rounds to 2.25 at 5 cm. Both lie inside both photographs' ranges. They still hold if nits 1 to 3 are applied. Of the alternatives, only the upper tier's (16.27 m) would round to 20.4.

**4. The repairs broke nothing in the model.**
- **Model code:** `git diff 4f41cd6 00ae202 -- src` changes only two comments, so the values are the ones first gated at `4f41cd6`.
- **Gate:** `tmp/hall-windows/verify-5.log` ran on `9833aab (dirty)` and passed 732 unit and 125 e2e tests. I can't confirm that dirty tree was identical to `00ae202`, and the plan's "Repairs gated" box is still open.
- **Renders:** I read two renders at native resolution. The east-window view centres the opening at 20.3. In the preset view the window's top shows just above the middle frieze, as the record says.
- **Left inconsistent:** nits 4, 5, 7 and 8.

#### Files read outside the diff
- **Rules:** `AGENTS.md`, `CLAUDE.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`.
- **This unit:** `reviews/0_implementation.md`, `reviews/1_implementation.md`, `interior.md:1–40` and `:200–269`, `interior-images.md:43` (P8's entry).
- **Model code:** `src/viewer/presets.ts:1–70`, `src/model/core/choir-screen.ts:18–77` and `:138–197`, the `VAUX_OCULUS` uses in `medieval-hall.ts:213`, `vaux-shell.ts:239` and `vaux-front.ts:109`.
- **Map and registry:** `docs/work/registry.json`, `research/cache/README.txt`, and five features in `lm_features.json` (uids 447599798201, 800006440452, 135207569259, 256543758117, 20545354728).
- **Gate and renders:** `tmp/hall-windows/verify-5.log`, `views.ts`, `verify-and-views.sh` and the logs' revision lines; `.shots/hall-windows/after/east-window-near.png`, `preset-int-medieval-hall-east.png` and `views.json`.

## Findings and disposition

Neither lane found a major or minor problem: Codex two nits, Claude eight, merged as F38 to F46.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F38 | #29's solve put the cross's tip at the screen's east face, though the cresting and its cross stand on the screen's line, as the model builds them: an effective scale of 0.997, one-sided. Work unit 4's frieze heights, which P8 takes, carry the same plane's bias (Claude 1) | Accepted | The solve puts the cross 0.1 m beyond the east face, on the line. #29's centre falls to 15.98 m (15.61 to 16.36), its camera stands 4.08 m from the east doorway and 26.78 m from the screen's face, and the average falls to 16.15 m (world 20.26), still 20.3. P8's frieze heights stay work unit 4's, as that unit measured them. The record also gives them read on the screen's face, where the friezes stand, through #29's camera from the rows work unit 4's projection gives: 0.02 to 0.04 m lower, P8 then reads 16.74 m and the average 16.14 m (world 20.253), still 20.3 |
| F39 | #29's two diameters for each circle were one fitted radius at two scales, and the glazing's average took only the lower (Claude 2) | Accepted | Each circle's diameter is the mean of its two conversions, which bound it: the surround 3.42 m (3.40 to 3.44), the glazing 2.27 m (2.26 to 2.29), as P8's glazing is the mean of its two readings. The glazing's average still gives 2.24 m, so the opening stays 2.25 m |
| F40 | The friezes' value pooled edges of unequal noise unweighted, and its printed error (6.7 × 10⁻¹⁰) assumed one radial term fitted them all, where they give χ² 350 on 3 degrees of freedom (Claude 3) | Accepted | The script names the pool as unweighted and prints the edges' inverse-variance mean (1.99 × 10⁻⁸) and the pooled error scaled by their disagreement (0.72 × 10⁻⁸). The record gives both, and that the tiers' 2.68 × 10⁻⁸ lies about one such error from the pool. The sweep keeps the pooled 1.89 × 10⁻⁸ as its low end |
| F41 | P8's focal length was swept 2,670 to 2,730 px, ±1.11%, not the ±1% the record states (Codex 1) | Accepted | Exactly ±1%, 2,673 to 2,727 px; P8 now ranges 16.04 to 17.49 m |
| F42 | The plan's acceptance criterion still said the two windows agree (Claude 4) | Accepted | It says their ranges overlap only from 16.04 to 16.36 m, so one height for both rests on the hall's symmetry |
| F43 | Work unit 4's note gave the model's values as what both windows measure (Claude 5) | Accepted | It gives the readings, 16.8 and 16.0 m with 2.1 to 2.3 m of glazing, and the model's average, 16.2 m with a 2.25 m opening, apart |
| F44 | The man's 6 cm margin assumed P8 looks straight along the hall; nothing measures its heading, and a turn of about 0.3° moves the crossing 6 cm (Claude 6) | Accepted | The record measures his column from the camera's heading and gives both margins: the camera 6 cm south of the axis, or its heading turned 0.29° to the south |
| F45 | The script's docstring named three of its four readings files, so a copy beside only those stops at the doorway's reading (Codex 2, Claude 7) | Accepted | It names all four |
| F46 | Two wording slips: the jackknife sentence followed "read as found" though it runs at the corrected distortion, and the plan said the ranges' narrowing moved the constant, where F27's rule did (Claude 8) | Accepted | The jackknife sentence follows the correction it runs at, and the plan's step says the model now takes the record's own average |

Not a finding: Claude could not confirm that the last gate's tree (`verify-5.log`, at `9833aab` with changes) was `00ae202`. Its `src/` was: `constants.ts` changed before that run began, and no file under `src/` changed between then and the commit. Docs changed while the run's end-to-end tests ran.

## Verification

- `npm run verify` passed on the reviewed tree, `00ae202` (`tmp/hall-windows/verify-5.log`), and on the repairs' tree, committed as `4288b42`, whose only change under `src/` is a comment (`verify-6.log`: 732 unit and 125 end-to-end tests).
- Codex reproduced the output and minimised the friezes' fit on its own. It jackknifed the tiers' crossing directly and projected all 729 of #29's sweep cases forward. Claude recomputed by hand and read two renders at native resolution.
- Neither reviewer could fetch the photographs, so no one remeasured them; the repository never stores them. Claude's lane could not run Python.

## Round outcome

No major or minor findings: Codex found two nits and Claude eight, merged as F38 to F46. All were accepted and repaired at `4288b42`; `VAUX_OCULUS_Y` stayed 20.3. Review 4, focused on the repairs, re-reviewed them. None of this round's findings stayed open.
