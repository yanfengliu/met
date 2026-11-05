# Review 1: implementation

## Target

The met repository, commit `2a2e6ec` on branch `claude/hall-windows-1d984d`, which repairs review 0's findings (F0 to F10) on top of `4f41cd6`; the reviewers had its diff against `4f41cd6` and the script's output. The script it carries is `snapshots/windows.py.txt` at that commit (sha256 `5f51abdfcb7ede07d677b5829bab198016830dbbf1bda5010746b9e086c96dd5`). The prompt's sha256 is `ffef928fdd5ea9e0e03f4f285cdca71b84953f67f1edc493bb1e73923b345113`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents; the fleet's check of its log found no failed commands (`keep`). It reproduced the script's output exactly, built the core area headless (130 meshes, 4,937 pieces, 207,548 triangles, finite matrices), read the 12 renders at native resolution and, outside the diff, `vaux-shell.ts`, `vaux-front.ts`, `medieval-hall.ts`, `arches.ts`, `shapes.ts`, `core.test.ts`, `core/index.ts`, `frame.ts`, `build/kit.ts`, `build/batch.ts`, `build/timeline.ts`, `viewer/presets.ts`, `main.ts`, the rules and spec, the map cache and the capture script. It could not fetch the photographs.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. It used no subagents and recomputed the script by hand. Outside the diff it read the rules, `interior.md`, `constants.ts`, `medieval-hall.ts`, `vaux-shell.ts`, `vaux-front.ts`, `arches.ts`, `batch.ts`, `presets.ts`, the map cache, three renders at native resolution, the render queries and logs, and `git show 4f41cd6`.
- The worktree was unchanged after both lanes.

## Reports

### Codex

Reviewed `2a2e6ec` against `4f41cd6`, serially and read-only. I found **six minor findings and three nits**. No new defect emerged in the window builders.

1. **Minor — The distortion refit is asserted, not reproducible.** [windows.py.txt:16](docs/work/16_hall-end-windows/snapshots/windows.py.txt:16) hard-codes the corrected vanishing point and distortion. Neither the 6,641 baluster centres nor the fitting procedure is retained. Consequently, running the script cannot verify the central repair to F4. Making two tiers agree is a reasonable calibration constraint under the assumed radial model; their agreement is then a fitted result, not independent validation. It leaves individual-line straightness, fitting residuals, distortion-centre sensitivity and alternative distortion models unchecked. **Repair:** retain the readings and refit code, report residuals and parameter sensitivity, and distinguish calibration from validation.

2. **Minor — #29’s height transformation is not the perspective transformation implied by its horizontal scale.** [windows.py.txt:156](docs/work/16_hall-end-windows/snapshots/windows.py.txt:156) integrates the reciprocal of a linear scale, producing a logarithm. But the measured baluster convergence gives a horizontal scale proportional to `y − yv`; the corresponding vertical height is a rational homography, with derivative proportional to `1/(y − yv)²`. This follows from the standard [pinhole projection](https://docs.opencv.org/4.13.0/d9/d0c/group__calib3d.html). Keeping the recorded floor, cross and vanishing point, the surround’s apparent height becomes **12.031 m**, rather than **12.063 m**. Substituting that vertical mapping alone changes the west centre from **16.037 to 16.004 m**. **Repair:** use one consistent projective mapping for heights and horizontal scales, then recompute the dependent measurements; alternatively, explicitly bound and disclose the approximation.

3. **Minor — P8 still omits the shared screen-scale uncertainty.** [windows.py.txt:114](docs/work/16_hall-end-windows/snapshots/windows.py.txt:114) varies five inputs while keeping `FRIEZES` fixed. Those heights derive from the same screen calibration whose ±1% uncertainty is now included for #29. Applying that scale variation to P8’s frieze heights expands its centre range from **15.90–17.43 m to 15.83–17.50 m**. F4 is therefore only partly repaired. **Repair:** propagate the shared calibration through both photographs and recompute the ranges and modelling average.

4. **Minor — The remaining arcade exclusion does not survive the stated reading uncertainty.** [interior.md:238](docs/research/interior.md:238) retains the assertion that the third feature lies beyond the model-position east wall. Using `(110,1810), (311,1904), (437,1981)`—all within the stated ±10 px—puts that feature **27.97 m** away, inside the **28.66 m** wall distance. Its fit residual is slightly smaller than the nominal fit’s. **Repair:** propagate the pixel uncertainty and withdraw the categorical exclusion. The nominal result can remain as a weak indication.

5. **Minor — F-owner-2 still understates the required camera change.** [plan.md:49](docs/work/16_hall-end-windows/plan.md:49) says that retaining the model’s screen position means the preset needs “only its field and pitch.” Its own numbers require moving the camera from **Z −112.9 to −111.98**, approximately **0.92 m**. Field and pitch cannot correct the resulting relative projection of objects at different depths: the current window projects onto the model screen at **8.30 m** from the preset versus **8.04 m** from the inferred camera. **Repair:** include camera position in this conditional recommendation.

6. **Minor — The new assertion does not test the repaired implementation.** [windows.py.txt:60](docs/work/16_hall-end-windows/snapshots/windows.py.txt:60) checks a separately written rotation expression, without calling the code used by `level()`. I restored both old rotation signs **in memory**; the assertion still passed. The numerical F0 repair is correct, but its claimed regression check is ineffective. **Repair:** exercise the actual transformation, using a shared un-roll function or independently projected synthetic rays, and demonstrate failure with the old signs.

7. **Nit — The doorway-width sweep varies the reciprocal quantity.** [windows.py.txt:200](docs/work/16_hall-end-windows/snapshots/windows.py.txt:200) varies measured pixel width by ±10%, while the record says physical doorway width varies ±10%. These correspond to physical factors **1/1.1 and 1/0.9**, not **0.9 and 1.1**. Sweeping the stated physical widths gives approximately **15.52–16.60 m**, rather than **15.51–16.59 m**. **Repair:** vary physical width explicitly or describe the actual sweep.

8. **Nit — #29 mixes the screen’s partition line and front face.** [windows.py.txt:167](docs/work/16_hall-end-windows/snapshots/windows.py.txt:167) assigns **11.51 m** from the screen’s front to the west wall. The stated front is approximately **Z −106.02**, making that distance **11.59–11.61 m** to the stated wall faces. The east distance already includes the front-face offset. **Repair:** derive both distances from the same named planes and regenerate the dependent numbers.

9. **Nit — The final projection output still uses the previous model height.** [windows.py.txt:236](docs/work/16_hall-end-windows/snapshots/windows.py.txt:236) evaluates **16.20 m**, while the repaired model is **16.29 m** above the floor. It prints the preset projection as **8.26 m**; the record’s **8.30 m** is correct for the current model. **Repair:** derive this input from the selected model height.

The principal F-owner-1 argument remains persuasive **as a comparison of the map and model positions under the stated calibration and symmetry assumptions**. Allowing the approximately 3.04 m doorways still leaves #29’s west window near **21.46 m**, far above P8’s model-position result. It does not uniquely establish an exact screen coordinate.

F-owner-4’s revised explanation is supported by [vaux-shell.ts:239](src/model/core/vaux-shell.ts:239), [medieval-hall.ts:213](src/model/core/medieval-hall.ts:213) and the batching implementation: the splay requires changing the brick opening and lining geometry, but need not increase mesh count.

For review 0: F2, F5, F6, F7, F9 and F10 are addressed within their stated scope. F3’s averaging arithmetic and removal of the unsupported combined ± value are repaired. F0, F1 and F4 retain the issues above; F8 retains the stale projection input.

I reproduced the supplied output exactly, checked the decoded map, inspected all 12 retained renders at native resolution, and built the target core headlessly: **130 meshes, 4,937 pieces, 207,548 triangles**, with finite matrices. Outside the diff I read `vaux-shell.ts`, `vaux-front.ts`, `medieval-hall.ts`, `arches.ts`, `shapes.ts`, `core.test.ts`, `core/index.ts`, `frame.ts`, `build/kit.ts`, `build/batch.ts`, `build/timeline.ts`, `viewer/presets.ts`, `main.ts`, the applicable rules/specification, map cache/README, capture script and render manifests.

Original photograph retrieval failed, so I could not independently remeasure pixels. I inspected the existing verification log—732 unit tests and 125 e2e tests passed—but did not rerun `npm run verify`. No files changed; no browser or server was launched.

### Claude

#### Review round 1, work unit 16 (Claude lane): `2a2e6ec` against `4f41cd6`

**Result:** no major findings, 3 minor and 8 nits.

Bash in this lane allowed only git reads, so I couldn't run `windows.py`; I recomputed it by hand. These match the output you gave:
- **P8:** all the nominal values.
- **#29:** all the nominal values.
- **The checks:** the man, the arcade and both model-place readings.
- **The doorway checks:** 274/282, 198/205, 4.04 m and 3.04 m.
- **The averages:** 16.27 m and 2.23 m.
- **The sweep corners:** the pitch range (21.22 to 22.89) and #29's centre corners (15.51 to 16.59). P8's centre corners match approximately (15.89, 17.43).

The geometry is right:
- **Un-roll:** it now takes the vanishing point to (0, −6,671.8).
- **Pitch and tangents:** both are correct, and roll moves the centre-column rows by under 0.1 px.
- **Distortion:** it is undone the same way everywhere.
- **The model:** all three build sites use the new constants.

The problems are in the refit's basis, in what the record draws from its checks, and in a few numbers.

#### Findings

##### 1. Minor: the distortion refit can't be checked from what is kept, and it drops the contrary reading
**Where:** `snapshots/windows.py.txt:16-18`, `docs/research/interior.md:233` and `:236`, `reviews/0_implementation.md:176-177` (F3, F4).

**What's wrong:**
- **Not kept.** The script takes the vanishing point (−5,375, x 1,077) and k = 2.6 × 10⁻⁸ as constants. These are not in it:
  - the 6,641 baluster centres;
  - the two tiers' line fits;
  - the search for the k at which they meet;
  - the points behind #29's two circle fits.

  Yet interior.md:233 says the script "also holds each reading", and F3's disposition says the record gives every reading.
- **Contrary reading dropped.** 4f41cd6 measured the distortion directly. Its record said the friezes' edges "bow by 1 to 12 px at 1,000 px from the centre", which it read as 1.5 × 10⁻⁸. At 2.6 × 10⁻⁸, the top frieze's edge (row 653, 643 px above the centre) would bow about 16 px at the image's edge. The repaired record doesn't mention that reading.
- **Reading noise dropped.** The middle tier's raw meeting row was −5,421 in 4f41cd6's fit and is −5,536 now: 115 rows apart on the same balusters.
- **One cause assumed.** Choosing k where the tiers meet puts all their disagreement into one radial term centred on the frame. It leaves out:
  - a lean between the tiers;
  - an off-centre distortion;
  - higher-order terms.

  It also gives k no uncertainty.

**My check:** a first-order barrel model reproduces the raw rows from k ≈ 2.6 to 2.8 × 10⁻⁸ and a true row near −5,380, so the stated fit is self-consistent. With the old middle-tier row it gives about 2.5 × 10⁻⁸ and row −5,300.

**How it fails:** the input the record says dominates can't be reproduced, and it rests on one of two readings that disagree. The sweep covers both, so the range stands, but the nominal value moves:
- At the friezes' 1.5 × 10⁻⁸, P8 reads about 16.6 m, the average about 16.23 m (world 20.34), and `VAUX_OCULUS_Y` rounds to 20.3.
- With the old middle-tier row, P8 reads about 16.84 m.

**Repair:**
- Keep the baluster centres and the tier-fit code in the snapshot.
- Record both distortion readings and why the tiers win.
- Give the refit its own uncertainty.

##### 2. Minor: the man check rules out the top of P8's range, unless the feet are hidden by the screen's base
**Where:** `interior.md:237`, `:239` and `:243`; `windows.py.txt:114-128`.

**Case (a): the feet show at row 2,496.** Then where the man stands limits the pitch much more tightly than the man's height does. The man stands 2.8 m north of the axis, outside the east doorway, so must be inside the hall.
- **The sweep's near end.** With the vanishing point at −5,200 and the other inputs nominal, the man stands 37.3 m from the camera. The east wall's face is 35.26 m away, so the man would be 2 m beyond it. The window there reads 16.98 m.
- **The record's "225 rows nearer" (−5,150).** The man would be 1.98 m tall and 39.2 m away, 4 m beyond the face. That rules the case out more firmly than the height does.
- **Where the man meets the wall:** at about row −5,270, where the window reads about 16.9 m.
- **The top corner (17.43 m)** also moves the principal point 30 rows down, which turns the view about 0.55° further up.

So P8's range, and the 0.77 m half-range that sets its weight, include cameras the record's own check excludes. If the range were cut there, the half-range would be about 0.5 to 0.6 m. The average would rise to about 16.35 to 16.4 m, and `VAUX_OCULUS_Y` would round to 20.5.

**Case (b): the feet don't show.**
- **Height.** The feet's ray crosses the screen's plane at 0.97 m (1.590 − 12.58 × 0.0495). That is 1 cm under the base's coping, which is 0.98 m (`interior-images.md:97`). It stays there at every pitch (1.00 m at −5,200).
- **Lateral place.** The ray crosses 1.09 m north of the camera's line. From a camera on the axis, that falls behind the north jamb: its inner face is 1.03 m out, it reaches the coping's level, and the die stops at 1.22 m.
- **Consequence.** Row 2,496 may be where the base or jamb cuts off the legs. Then 32.1 m is only an upper bound, and the check reads only the head against the horizon.

**How it fails:** either the range and the weights ignore a hard limit, or "32.1 m away, in front of the east wall" is not measured.

**Repair:** settle on P8 whether the feet show through the gate's opening.
- If they do, drop sweep cases that put the man at or behind the wall's face, then redo the weights and the constant.
- If they don't, say the distance is a bound.

##### 3. Minor: the arcade's "one reading holds either way" fails within its own ±10 px
**Where:** `interior.md:238`; F0's disposition, `reviews/0_implementation.md:173`.

**What's wrong:** the margin is 0.74 m. The third feature stands 29.40 m away; with the screen at the model's place, the east wall stands 28.66 m away.
- **Feature 3 read 10 px to the right (column 437).** The 5.65 m fit gives a plane at X 5.50 and distances of 17.15, 22.80 and 28.45 m, so the third feature now stands in front of that wall. Break-even is about +8 px.
- **Feature 1 also read 10 px to the left (column 110).** The third feature falls to 27.97 m.
- **The wall itself moves.** P8's range of distances to the screen (12.24 to 12.94 m) puts that wall anywhere from 28.32 to 29.02 m.

**How it fails:** F0 kept this sentence as the one argument that still stands, but it doesn't survive the reading error the record itself gives.

**Repair:** drop it, or state the margin against the reading error.

##### 4. Nit: the record's 8.30 m from the preset isn't in the script's output
**Where:** `windows.py.txt:236`; `interior.md:245`.

**What's wrong:** the loop still evaluates `(16.2, 17.29)`, so the output prints 8.26 m. The record's 8.30 m is right for 16.29 m (1.6 + 14.69 × 13.5/29.58). But it doesn't come from the script, which interior.md:233 says every number does.

**Repair:** evaluate 16.29 m (`VAUX_OCULUS_Y` − 4.11).

##### 5. Nit: #29's glazing is 2.27 m in the output and 2.28 m in the record
**Where:** `interior.md:241` and `:243`; `interior-images.md:97`.

**What's wrong:** the nominal value is 2.2746 m, which the output prints as `'gl_out': 2.275` and "#29 2.27". The record's 2.28 rounds 2.275 a second time. 4f41cd6 gave 2.278 (with 11.61 m and a 0.5 m set-back), so 2.28 was right then.

**Repair:** write 2.27 in all three places.

##### 6. Nit: the un-roll assert tests a retyped formula, not `level()`
**Where:** `windows.py.txt:60-64` against `:51`.

**What's wrong:** the assert retypes the rotation. Reverting line 51 to +φ, the defect review 0 found, would leave it passing. F0's disposition says `level()` "asserts" this.

**Repair:** assert through `level()`. For example, two points on the image line through the vanishing point should give the same lateral tangent.

##### 7. Nit: the script measures from different parts of the screen
**Where:** `windows.py.txt:166-167`, `:142` against `:210`, and `:182`.

**What's wrong:**
- **#29's distances.** `D_EAST_TO_SCREEN` (22.70) runs to the screen's front, 0.1 m east of the partition. `D_SCREEN_TO_WEST` (11.51) runs from the partition's line, though its comment says "the screen's front".
  - Their sum, 34.21 m, falls short of the 34.31 m used at `:215`.
  - 4f41cd6's 11.61 was consistent, so the repair introduced this.
  - It moves #29's centre by about 0.04 m.
- **P8's model-place distance.** The distance from the screen to the east wall is 16.08 m at `:142` and 15.98 m at `:210`.
- **The eye height.** At `:182` the formula applies the screen plane's height difference at the base's front face. It lacks a factor of (ds − base_off)/ds, about 0.6%: 2.831 m where it should be about 2.815 m.
- **The floor row.** The floor's row stands 0.016 m below the floor at the screen's plane, and `ring_c` ignores it. With the eye-height error, the net effect is about −0.02 m.

**Repair:** use one reference plane per photograph.

##### 8. Nit: F-owner-2 understates what the preset needs
**Where:** `plan.md:49`.

**What's wrong:**
- **The field.** 51.3° is the distorted frame's field. At the record's 2.6 × 10⁻⁸, the top and bottom rows lie at ±26.6°, which is a 53.2° field.
- **The place.** "The preset needs only its field and pitch" is not quite right. The preset stands at −112.9 (`src/viewer/presets.ts:67`), 0.9 m west of −112.0, and from there the screen looks 7% smaller.

**Repair:** give about 53° and the 0.9 m move.

##### 9. Nit: F-owner-4's second reason doesn't hold
**Where:** `interior.md:243`; `plan.md:51`.

**The first reason is accurate.**
- `openWall` cuts each hole straight through, or as a blind niche (`arches.ts:109-116`, `:150-160`).
- The lining is 5 cm thick (`medieval-hall.ts:211-218`).
- So the brick wall's hole would have to widen, with a ring and cone fitted into it.
- The mesh claim holds too: batches are keyed by geometry and material (`batch.ts:37-44`).

**What's wrong:** "the window's outer face is not measured" doesn't stop building the measured inner splay. The model already guesses the outer face as a straight 2.25 m hole (`vaux-shell.ts:239`), and building the splay wouldn't change it.

**Repair:** drop that clause.

##### 10. Nit: "265 to 281 measured" still treats the curtains as the doorway
**Where:** `plan.md:48`; `interior.md:242`.

**What's wrong:** interior.md:240 now names 265 px as the curtains and 281 px as the jambs (282 predicted). Yet F-owner-1 and :242 still quote "265 to 281 measured" for the doorway.

**Repair:** quote 281 px only.

##### 11. Nit: plan inputs held fixed move the average
**Where:** `windows.py.txt:114` and `:199-200`; `interior.md:235`, `:239` and `:243`.

**What's wrong:**
- **P8 leaves out #29's scale.** P8's frieze heights carry #29's ±1% scale, worth ±0.07 m, but only #29's sweep includes it.
- **The sweeps reach 23.0 and 23.2 m.** That is east of the map's line, which the record's "up to 0.6 m further west" doesn't explain.
- **The east wall may be a full wall thick.**
  - The map draws the east doorway as a single line (json z 2.62), but the west one as a 1.17 m passage (json z −32.81 to −31.64).
  - So the hall's east face could stand a full wall west of the line.
  - At that face, P8 reads 16.23 m and #29 reads 16.30 m, almost the same.
- **The agreement also places the screen.**
  - F-owner-1 uses the windows' agreement to place the screen.
  - Used jointly, the two nominal readings cross with the screen about 0.6 m east of the map's line, at about 16.45 m.
  - The 16.27 m average instead holds the screen exactly on the line.
- **"Weighted by the halves of their ranges".** It should say by the inverse squares of the half-ranges, which is what the script does.

**Repair:** name these as inputs to the "choice inside both ranges". None of them changes where the two ranges overlap.

#### Answers to the questions
1. **F0 to F10.**
   - F0 is incomplete. It keeps an argument that its own reading error undoes (3), and its assert tests a copy (6).
   - F3 is incomplete. The readings it says are kept are partly missing (1), and 8.30 isn't in the output (4).
   - F4's refit can't be checked (1).
   - The rest are resolved, apart from nits 8 to 10.
2. **The script.**
   - Its geometry, sweeps, averages and doorway checks are right.
   - Every number in the record, the plan, both photographs' entries, `constants.ts`, the devlog and work unit 4's note matches its output, except 2.28 m (5) and 8.30 m (4).
3. **The distortion refit.**
   - The fit is self-consistent.
   - But two direct readings of the distortion disagree with it, and it isn't kept and has no uncertainty (1).
4. **F-owner-1.**
   - The argument is sound. At the map's place the windows read 16.73 and 16.04 m; at the model's, 13.81 and 22.11 m.
   - With the doorway width left free, the west window is still 21.46 m.
   - The overreaching claims are elsewhere in the record (2, 3).
5. **F-owner-4.** The stated reason is accurate, except the outer-face clause (9).
6. **What the repairs broke.**
   - They broke `D_SCREEN_TO_WEST` (7), the 2.28 m rounding (5) and the stale loop (4).
   - The `after/` renders are of the repaired tree. `verify-3.log` ran at 12:32 on the uncommitted repairs (`rev 4f41cd6 (dirty)`) and passed 732 unit and 125 e2e tests. In `east-window-near.png`, the opening's rows (about 377 to 515) fit a height of 20.4.
   - They still use 4f41cd6's camera numbers (`tmp/hall-windows/views.ts:16-19`), which makes a negligible difference.

#### Files read outside the diff
- **Rules and records:** `AGENTS.md`, `../fleet/docs/skills/multi-cli-review.md`, `interior.md:1-60` and `:200-259`.
- **Code:** `constants.ts:1-63`, `medieval-hall.ts:180-239`, `vaux-shell.ts:200-269`, `vaux-front.ts:95-114`, `arches.ts:60-160`, `batch.ts:25-64`, `presets.ts:67`.
- **Map cache:** `research/cache/README.txt` and `lm_features.json` (the partitions at world Z −106.12, X ±1.15 to ±7.03; the piers; both end doorways).
- **Renders:** both `views.json` files, and three renders from `after/` at native resolution.
- **Scratch files:** `tmp/hall-windows/views.ts`, `verify-and-views.sh`, `verify-3.log`, `before-after-2.log`.
- **History:** `git show 4f41cd6`.

I used no subagents and changed nothing. `git status` is still clean.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F11 | The distortion refit could not be reproduced: the baluster centres, the tier fits and the search were not kept, nor #29's circle-fit points. It dropped the friezes' contrary reading (1.5 × 10⁻⁸), the reading's own noise (−5,421 against −5,536 on the same balusters) and alternatives to one radial term (Codex 1, Claude 1) | Accepted | The 6,641 centres are `snapshots/p8-balusters.txt` and #29's edge readings `snapshots/m29-window-edges.txt`. The script refits the vanishing point over a grid of distortions, prints each tier's point and residuals, finds where the tiers agree (2.68 × 10⁻⁸, row −5,376) and its sensitivity to the distortion's centre, and refits #29's circles. The record calls the refit a calibration, not a test, and gives the friezes' reading, the noise and P8 at the friezes' distortion (16.68 m) |
| F12 | #29's heights were read through a logarithm, where a tilted camera's map from the screen's plane to the image is rational: the horizontal scale grows with (y − yv), the vertical with its square (Codex 2) | Accepted | Heights on the screen's plane follow h(y) = A (1/(y − yv) − 1/(3,452 − yv)), and the horizontal scale stays proportional to (y − yv); the surround's apparent centre moves from 12.06 to 12.02 m |
| F13 | P8's range left out the screen's scale, which its friezes share with #29 (Codex 3, Claude 11) | Accepted | P8's sweep scales the friezes' heights by ±1% too |
| F14 | The arcade's "one reading holds either way" fails within its own ±10 px (Codex 4, Claude 3) | Accepted | Withdrawn: over ±10 px the third feature stands 27.8 to 31.2 m away, and the model-place east wall 27.1 to 29.3 m, so the arcade does not decide |
| F15 | F-owner-2 left out the camera's move if the screen stays: −112.1 against the preset's −112.9, which field and pitch cannot make up; and P8's field undistorted is about 53°, not 51.3° (Codex 5, Claude 8) | Accepted | F-owner-2 gives the 0.8 m move, the 8.02 m against 8.30 m it makes, and the 53° field |
| F16 | The un-roll's assertion retyped the rotation instead of calling `level()`, and passed with the old signs (Codex 6, Claude 6) | Accepted | `level()` takes its rotation as a function; the check feeds it points on an image line through the vanishing point, which must keep one lateral tangent, and asserts that the reversed rotation fails it |
| F17 | The doorway's ±10% was applied to its width in pixels, not in metres (Codex 7) | Accepted | The sweep varies the doorways' width in metres |
| F18 | #29's distances mixed the partition's line with the screen's face: 22.70 m to the face, 11.51 m from the line; P8's model-place distance differed between two lines (Codex 8, Claude 7) | Accepted | All distances come from named planes: the screen's faces 0.1 m either side of the partition, the east wall's line, the west wall's face at −117.62 |
| F19 | The script still evaluated the old 16.20 m, so the record's 8.30 m was not in its output (Codex 9, Claude 4) | Accepted | The script takes the model's height from `VAUX_OCULUS_Y` and prints 8.30 m |
| F20 | The man's "feet" at row 2,496 may be where the screen's base cuts off his legs; if so his distance is only a bound, and if not the sweep keeps cameras his place excludes (Claude 2) | Accepted: the base's coping crosses his column at row 2,492 | The record says his legs are cut off by the base, his distance is at most 31.9 m, and the check reads only his head against the eye's height, which favours the nominal pitch or a steeper one without bounding it; no sweep case is cut |
| F21 | #29's glazing read 2.27 m in the output and 2.28 m in the record (Claude 5) | Accepted | With F12 and F18 the output is 2.280 m, as recorded |
| F22 | #29's eye height applied the base row's offset in the wrong place, and the surround's apparent height ignored that the base row stands about 1.6 cm under the floor on the screen's plane (Claude 7) | Accepted | The base row's offset is solved with the eye height and applied to every height read from it; the eye reads 2.77 m and the west centre 16.03 m |
| F23 | F-owner-4's second reason, that the outer face is not measured, does not stop building the measured inner splay (Claude 9) | Accepted | Dropped from F-owner-4 and the record |
| F24 | F-owner-1 and the record quoted "265 to 281 measured" though 265 px is the curtains (Claude 10) | Accepted | The record gives all three readings of the doorway's soft edges (265, 281 and 312 px) and F-owner-1 quotes their span |
| F25 | Plan inputs held fixed move the average: the east wall may stand a full wall west of the line, where the two readings meet at 16.28 m; jointly they place the screen 0.7 m east of the line at 16.48 m; the sweeps' east-of-line ends were unexplained; "halves of their ranges" misnamed the weights (Claude 11) | Accepted | The sweeps run the east wall's face from 0.1 m east of the line to 1.2 m west; the record gives where the two readings meet under each input and calls the weights inverse squares of the half-ranges. The model's 16.29 m stays: it lies inside both ranges and among the alternatives (16.17 to 16.48 m) |

## Verification

- `npm run verify` passed on the reviewed tree, `2a2e6ec` (`tmp/hall-windows/verify-3.log`), and on the repairs' tree, committed as `9833aab` (`verify-4.log`): 732 unit and 125 end-to-end tests each time.
- Codex reproduced the script's output exactly and built the core area headless (130 meshes, 4,937 pieces, 207,548 triangles, finite matrices); Claude recomputed by hand. Codex read the 12 renders at native resolution and Claude three.
- Neither reviewer could fetch the photographs, so no one remeasured them; the repository never stores them. Claude's lane could not run Python.

## Round outcome

No major findings. Codex found six minor problems and three nits, Claude three minor and eight nits, merged as F11 to F25. All were accepted and repaired at `9833aab`, chiefly by keeping the readings beside the script so that it reproduces every number. Review 2 re-reviewed the repairs. No finding was rejected, and none stayed open.
