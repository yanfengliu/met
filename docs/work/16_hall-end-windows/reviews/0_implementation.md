# Review 0: implementation

## Target

The met repository, commit `4f41cd6` on branch `claude/hall-windows-1d984d`, against `origin/main` at `b9ecd58`: the measured end windows (`VAUX_OCULUS_Y` 20.3, `VAUX_OCULUS` 2.25), the record in `docs/research/interior.md` ("End windows, measured"), the two photographs' entries in `docs/research/interior-images.md`, this unit's plan, the devlog line, the registry entry and work unit 4's note. With it the reviewers had the measurement script, which was not committed: its reviewed bytes are `snapshots/0_windows.py.txt` (sha256 `9a7960d0e20ee3deea3e5a28a75a876cace06b3a5e78d0fca2951ebdb81bf302`). The prompt (sha256 `a3edcc4e0b69aaa408055ba6216f464532422605439afda02ced330eea951536`) also pointed them to the Met's floor map cache and to the renders in the worktree's ignored `.shots/hall-windows/`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, serial with no subagents. The fleet's check of its log found no failed commands (`keep`). It recomputed the script's nominal values, sweeps, arcade check and doorway predictions. It built the core area headless with the old and the new dimensions substituted in memory, and both gave 130 meshes, 4,937 pieces and 207,548 triangles. It read the 12 renders at native resolution. Outside the diff it read `arches.ts`, `shapes.ts`, `core.test.ts`, `core/index.ts`, `build/kit.ts`, `cited-images.test.ts`, `main.ts`, `viewer/query.ts`, `viewer/presets.ts`, the spec and rules, the capture script and the map cache. It could not fetch the photographs.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and git reads in `dontAsk` mode with no MCP servers; the report command printed `keep`. It used no subagents. Its Bash allowed only git reads, so it recomputed the script by hand. It read 8 of the 12 renders at native resolution. Outside the diff it read the rules, `vaux-shell.ts`, `medieval-hall.ts`, `arches.ts`, `shapes.ts`, `cited-images.test.ts`, `core.test.ts`, `build/timeline.ts`, `build/batch.ts`, `viewer/presets.ts`, work unit 4's review 5, the registry on both branches, the map cache, the renders' queries and the verify log.
- The worktree was unchanged after both lanes, its status and diff compared before and after.

## Reports

### Codex

Four **minor** findings against `4f41cd6`, using `b9ecd58` as the base. I found no new implementation defect in the window builders.

1. **Minor — The combined uncertainty is not justified by the calculation.** [interior.md:241](docs/research/interior.md:241) treats sensitivity-range halves as independent standard deviations to obtain **16.19 ± 0.26 m**. Those ranges are parameter-sweep bounds, and both measurements share the map and #29’s screen calibration. The supplied script also uses different weights: its two combined results are **16.15 ± 0.19** and **16.30 ± 0.16 m**, neither the recorded result. **Repair:** synchronize the calculation and record; describe 16.19 m as a modelling choice unless a joint uncertainty calculation supports the quoted ± value. A shared height remains plausible within the reported individual ranges.

2. **Minor — The new coordinates contradict the file’s coordinate-frame instruction.** [interior.md:235](docs/research/interior.md:235) uses already-corrected world coordinates, including screen Z −106.12. However, line 19 instructs readers to subtract 3.1 m from **every Z** in this file and `interior-images.md`. Following that instruction moves the screen to −109.22 and similarly misplaces the cameras. The cache README and decoded partition confirm that −106.12 is already in world coordinates. **Repair:** explicitly exempt and label the new measurements as world coordinates, updating the blanket instruction.

3. **Minor — P8’s quoted glazing range excludes its horizontal measurement.** [interior.md:238](docs/research/interior.md:238) gives “the glazing 2.15 to 2.25 m” without restricting this to the vertical reading. Recomputing the supplied sweep gives **2.146–2.250 m vertically**, but **2.082–2.170 m horizontally**; the nominal horizontal result is 2.125 m. Thus the quoted range does not describe both measurements used to justify the diameter. **Repair:** report both ranges and explain how their discrepancy and pixel-reading uncertainty inform the selected 2.25 m opening.

4. **Minor — The retained renders do not reproduce the measured photographic projections.** [plan.md:34](docs/work/16_hall-end-windows/plan.md:34) marks the photograph comparison complete, and line 42 calls these measured-camera renders. The capture script supplies only `cam=` coordinates; [main.ts:328](src/main.ts:328) assigns those cameras the default **45°** field. P8’s recorded field is 51.3°, and #29 requires an upward image shift that the capture omits. Both retained #29 renders crop out the cresting and middle medallion needed for the stated comparison. **Repair:** capture the measured intrinsics and image shift, or narrow the acceptance claim to positional before/after inspection and leave photographic registration unchecked.

I recomputed the nominal measurements, sweeps, arcade check and doorway-width predictions. The decoded map supports the reported partition and doorway positions. All three builders use the new constants, with matching nominal centres and diameters. Headless builds with old dimensions substituted **only in memory**, and with target dimensions, both produced **130 meshes, 4,937 pieces and 207,548 triangles**. The citation form is valid, and the omitted surround is explicitly documented.

I inspected all 12 retained PNGs at native resolution. Outside the diff, I read `arches.ts`, `shapes.ts`, `core.test.ts`, `core/index.ts`, `build/kit.ts`, `cited-images.test.ts`, `main.ts`, `viewer/query.ts`, `viewer/presets.ts`, the relevant spec and rules, the capture script, and the cache README/JSON.

Original-photo retrieval failed, so I could not independently remeasure their pixels or fully confirm camera identification. I inspected the existing successful verification log but did not rerun `npm run verify`. No files changed; no browser or server was launched.

### Claude

### Review round 0, work unit 16 (Claude lane): `4f41cd6` against `b9ecd58`

**Result:** 1 major, 6 minor and 2 nit findings. The model change is correct. All three build sites use the new constants. The glass still meets its hole, the mesh count is unchanged and the citation parses. I redid P8's and #29's main numbers by hand and they check out. The problems are in the checks of P8's camera, in how the evidence for the screen's place is stated, and in what the ranges leave out.

This lane's Bash allowed only git reads, so I could not run `windows.py`. Every number below I recomputed by hand. As a check of my method, my copy of the script's `level()` reproduces the record's figures exactly.

#### Findings

##### R1 · major · `windows.py` `level()`, the un-roll (the script is not in the repo); its output is quoted at `docs/research/interior.md:237`, `:238` and `docs/work/16_hall-end-windows/plan.md:48`

- **What's wrong:** the roll correction rotates the wrong way.
  - `phi = atan2(xv − CX, CY − yv)` is +0.01319.
  - The comment says "rotate image coords by -phi", but `du2 = du·cos φ − dv·sin φ; dv2 = du·sin φ + dv·cos φ` rotates by +φ.
  - Test: the vanishing point itself (du 88.6, dv −6,717) maps to du2 = 177.2, not 0. The 0.76° roll is doubled instead of removed.
- **Scope:** only `level()` uses this code, so only the arcade check and the man check are affected. `p8()` reads the centre column, where roll does not enter, so the windows' height and size are unaffected.
- **With the sign fixed, the man:** he is 1.71 m tall, 35.0 m away and 3.0 m north of the camera's line, in front of the east wall. The record has 1.80 m at 36.8 m, 3.6 m north. That place is inside the east wall: its inner face is 35.46 m away, and the doorway spans only X −1.12 to +1.16.
- **With the sign fixed, the arcade:**
  - The apexes fall at 18.29, 23.94 and 29.59 m, 5.06 to 5.42 m up.
  - From the friezes' camera (Z −118.78), those distances are the map's pier lines: Z −100.47, −94.82 and −89.16, at 18.31, 23.96 and 29.62 m.
  - Apexes stand at bay centres, half a bay from those lines. The arcade fixes the camera's place only to within one bay, so half a bay off is the worst result the check can give. It no longer confirms the camera's place.
  - "The third bay ends ... about 33 m" becomes 32.4 m, 3 m short of the east half-pier. That does not give "four bays lie east of the screen".
  - One argument still holds: with the model's screen place, the third apex (29.6 m) stands beyond the east wall (28.7 m).
- **How it fails:** the record and F-owner-1 present a check that confirms P8's camera and the screen's place, and the corrected computation does not confirm either.
- **Repair:**
  - Rotate by −φ: `du2 = du·cos φ + dv·sin φ` and `dv2 = −du·sin φ + dv·cos φ`.
  - Assert that the vanishing point maps to du2 ≈ 0, then rerun.
  - Restate the man's height and distance.
  - Drop "within about 2 m" and "four bays lie east of the screen", or base them on a reading that survives the fix.

##### R2 · minor · plan.md:48 (F-owner-1), plan.md:49 (F-owner-2), interior.md:239, interior-images.md:43 — the owner findings overstate weak evidence and leave out the strongest

- **P8 does not place the screen.** F-owner-1 says "P8 agrees with the map. Its camera stands 12.66 m from the screen, which puts it in the hall's west doorway." The frieze fit gives only the camera's distance from the screen. With the screen at −99.4, the same fit puts the camera at Z −112.06, inside the hall, where a photographer could equally stand. P8's only evidence for the screen's place is the arcade, and R1 removes it.
- **The west-doorway test assumes the map's 2.28 m doorways.**
  - With the width left free, the ratio of the frame to the west doorway (2,670 to 281 px, the walls 34.31 m apart) puts the camera 4.04 m from the east doorway at either screen place.
  - At the model's place, doorways 3.04 m wide fit both readings.
  - So the test rejects the model's place only together with the map's doorway width.
  - Review 5 saw #29's gate showing "a curtained arch lit from behind" (`docs/work/4_cited-images-viewed/reviews/5_implementation.md:52`). The record does not say whether the 265 to 281 px are the doorway's jambs or the curtains' edges.
- **The strongest argument is not stated.** The two windows agree only at the map's place.
  - At the model's place, P8's east window comes out 13.8 m over the floor (1.595 + 0.4243 × 28.74).
  - #29's west window comes out 21.5 to 22.1 m.
  - That is 8 m apart in a symmetric hall, against 16.6 and 16.1 m at the map's place.
  - This argument needs neither the doorway widths nor the arcade, and the script already computes both inputs.
- **F-owner-2 depends on F-owner-1.** Its "P8 was taken from about Z −118.8" holds only if F-owner-1 is accepted. With the screen kept at −99.4, the preset would go to −112.06. Its last sentence offers P8's own reading as support.
- **The P8 entry states the camera's place as fact.** interior-images.md:43 puts the camera "in the hall's west doorway", but that holds only at the map's screen place.
- **Repair:**
  - Rest F-owner-1 on the map's partition and on the windows' agreement.
  - Qualify the doorway test as resting on the map's widths.
  - Make F-owner-2 and the P8 entry conditional on F-owner-1.

##### R3 · minor · `src/model/core/vaux-shell.ts:219` (`END_DOOR`), plan.md:18 — the model's end doorways disagree with the width the measurement rests on, and this is not recorded

- **The map's doorways:** #29's camera rests on 2.28 m doorways. The cache confirms them: door lines at json x −4.95 to −2.67 at z −32.81 and −31.64 (west), and x −4.94 to −2.66 at z 2.62 (east).
- **The crown:** by the record's own numbers, the frame's crown stands about 5.0 m over the floor. It is at row 382, 2,573 px above the horizon row (2,955), at 1,171 px/m.
- **The model:** `END_DOOR` is 4.4 m wide and 5.9 m tall, an estimate from P8. It also sizes the plaster archivolt (`medieval-hall.ts:212`, `:220`).
- **The plan's own test:** plan.md:18 reports `SCREEN_Z` and the preset because "both are needed to read the photographs, and both disagree with the evidence". The doorway meets the same test.
- **Repair:** add it as F-owner-3, or record the conflict in "End windows" and beside `END_DOOR`.

##### R4 · minor · interior.md:233, interior.md:241 — the combined centre is not the script's, and the script cannot be found

- **The weights differ.** interior.md:233 says every number was "recomputed ... by one script". The script combines with half-ranges 0.55/0.20 (16.15 ± 0.19) and 0.25/0.20 (16.30 ± 0.16). The record's 16.19 ± 0.26, which sets `VAUX_OCULUS_Y`, uses 0.58/0.29, which the script never uses. 16.15 still rounds to 20.3, but 16.30 gives 20.4.
- **The script cannot be found.** `windows.py` is not in the repository, and nothing says where it lives.
- **Two checks cannot be recomputed.** The arcade's rows (1,810, 1,904 and 1,981) and the man's column (705) appear only in the script.
- **Repair:** put the combination as used into the script. Keep the script with the work unit, or name where it lives. Record the missing readings.

##### R5 · minor · interior.md:238, :240, :241, :244 — the ranges leave out inputs that move the result

- **#29's range leaves out the screen's scale.** The Met's 52 ft is rounded to the foot, about ±1%, as #29's own entry says (interior-images.md:97). That moves the west centre about ±0.16 m. #29 then outweighs P8 four to one, and adding this lifts the combined centre by up to about 0.1 m.
- **P8's range leaves out the principal point.** A 30 px offset acts like 0.5° of pitch.
- **The map distances may be too tight.** They are varied by ±0.15 to ±0.4 m, but interior.md:26 allows ±1 m on room edges. The record does not say why these lines are better.
- **P8's nominal pitch is likely low.**
  - The pitch comes from a vanishing point fitted on the distorted image.
  - Under the record's own distortion, I estimate that point sits about 110 rows too far out.
  - So the nominal pitch is about 0.25° low and P8's centre about 0.1 m low.
- **The agreement is marginal.** "Agree within their ranges" (interior.md:241) holds only where the ranges overlap, 16.07 to 16.37 m: P8's bottom and #29's top.
- **Repair:** add these inputs to the ranges. Say the agreement is marginal. State that one height for both windows rests on the hall's symmetry.

##### R6 · minor · interior.md:241, `src/model/core/constants.ts:40` — the mesh budget is not what keeps the surround out

- **How meshes are counted:** `batchPieces` (`src/build/batch.ts:41`) makes one mesh per geometry, material and door within a step.
- **A merge adds no mesh:** a splay merged into the lining's own geometry (`medieval-hall.ts:213`, `core.hallPlaster`) through `MeshBuilder` adds triangles, not a mesh. `pier()` is built the same way (`medieval-hall.ts:65`).
- **What shows now:** the 1.1 m reveal is red brick (`after/east-window-near.png`), where both photographs show a grey splay 3.45 m across.
- **Repair:** build the splay merged into the lining's geometry, or record the real reason it is left out.

##### R7 · minor · interior.md:235–243 against interior.md:19, `docs/devlog/summary.md:5` — world-frame Z values in a file whose header says map frame

- **The header:** interior.md:19 says every Z in the file is in the map's frame, and to subtract 3.1 m.
- **The new section:** it gives −106.12, −117.63, −83.32, −118.8 and −79.3 in the world frame without saying so. Other sections that do this name the frame (interior.md:174, :290, :307).
- **The clash:** line 222 puts the third pier pair at −103.03 in the map's frame. A reader who follows line 19 puts the screen at −109.2.
- **Repair:** say "world frame" at the head of "End windows" and in the devlog line.

##### R8 · nit · interior-images.md:97, interior.md:239 — "tilts slightly up" against "level"

- **The clash:** #29's entry keeps "the camera tilts slightly up" and now also says "level". At about 4,730 px focal length, 0.8% per 1,000 px is a tilt of about 2.2°.
- **Repair:** write "nearly level (about 2° up), its view shifted up".

##### R9 · nit · numbers in the record

- **interior.md:243:** P8's own reading stands at 6.96 m on the screen's plane. The 6.80 m quoted is where the model's 16.19 m window falls.
- **interior.md:239:** "22.1 m up, near the eaves" is 1.2 m above the model's eaves, which stand 20.89 m over the floor.
- **interior.md:236:** "Both enter the range below", but −4,519 lies outside the −5,200 to −5,650 range.
- **Glazing:** the devlog's "2.2 to 2.3 m" and the constants comment's "2.2 m east" don't match interior.md:238's 2.13 to 2.20 m.
- **Surround centre:** interior.md:238 takes it at the middle row. The mean of its top and bottom tangents gives 16.67 m, and a set-back of 0.37 m.

#### What I checked

- **The code:**
  - The three build sites use both new constants, and nothing else uses the old values.
  - The hole is a 24-sided polygon of radius 1.125 m and the glass a 20-sided one of the same radius, the same fit as before.
  - The window stays clear of the vault and the end ribs.
  - The mesh count is unchanged.
  - The citation parses as `#P8` and `#29`, both marked viewed.
  - `tmp/hall-windows/verify-2.log` passed (732 unit tests and 125 e2e) before the commit.
- **The arithmetic, redone by hand:**
  - P8: camera 12.655 m from the screen, eye 1.595 m, fit rms 0.0135 m. Window centre 16.64 m, surround 3.45 m, glazing 2.20 by 2.13 m.
  - #29: camera 4.04 m from the doorway and 26.74 m from the screen, focal length 4,731 px, eye 2.80 m. Window centre 16.08 m, surround 3.43 m, glazing 2.28 m.
  - Doorway checks: 273 to 281 px at the map's place, 198 to 204 px at the model's. Window projections: 22.13 m at the model's place; 8.26 and 8.76 m from the preset.
  - P8's range: my one-input-at-a-time estimate gives about ±0.58 m, matching 16.07 to 17.23 m.
- **The cameras:**
  - #29's frame must be the east doorway. Any arch further east would leave the doorway cutting off the screen once the camera is more than 4.9 m from it.
  - The floor rows rule out the balcony at either screen place.
  - P8's distance holds at 12.5 to 12.8 m over the pitch range.
- **The map cache:** the partition lines, both end doorways, and galleries 305 and 304.
- **The renders:** 8 of the 12, at native resolution.

#### Files read outside the diff

- **Rules:** `AGENTS.md`, `docs/policies/local-rules.md`, `docs/learning/lessons.md`, fleet's `multi-cli-review.md` and `work-docs.md`.
- **Model code:** `vaux-shell.ts`, `medieval-hall.ts`, `arches.ts`, `shapes.ts`.
- **Tests and engine:** `src/cited-images.test.ts`, `core.test.ts`, `src/build/timeline.ts`, `src/build/batch.ts`, `src/viewer/presets.ts`.
- **Records:** work unit 4's review 5, `docs/work/registry.json` (on the branch and on origin/main), interior.md lines 1–50.
- **Data and output:** `research/cache/README.txt` and `lm_features.json`, both `views.json` files, and `verify-2.log`.

I changed nothing.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The script's roll correction rotated by +φ, doubling the 0.76° roll. The man's height (1.80 m at 36.8 m, inside the east wall) and the arcade's "within about 2 m" and "four bays" rested on it (Claude R1, major) | Accepted: the vanishing point mapped to x 177 px, not 0 | `level()` rotates by −φ and asserts the vanishing point lands on the centre column. The man is 1.62 m tall, 32.1 m away. The arcade is recorded as read but not relied on: its features sit on the map's pier lines or half a bay off them, and only the argument against the model's place stands |
| F1 | The findings for the owner overstated weak evidence and left out the strongest: P8 gives only its distance from the screen, the doorway check rests on the map's widths, and the windows agree only at the map's place (Claude R2) | Accepted | F-owner-1 rests on the map's partition and on the windows' agreement (16.7 and 16.0 m at the map's place, 13.8 and 22.1 m at the model's), qualifies the doorway check and says P8 alone gives no place. F-owner-2 and P8's entry are conditional on F-owner-1, and the 265 px edge is named as the curtains' |
| F2 | The model's end doorways (`END_DOOR`, 4.4 × 5.9 m) disagree with the map's 2.28 m openings the measurement rests on, and this was not recorded (Claude R3) | Accepted | Recorded as F-owner-3, with #29's reading of the east doorway's springing and crown. No note in the code: `vaux-shell.ts` outside the oculi is another session's work |
| F3 | The combined centre (16.19 ± 0.26 m) was neither the script's nor justified as an uncertainty. The script could not be found, and two checks' readings were only in it (Codex 1, Claude R4) | Accepted | The script computes the combination as recorded and is kept as `snapshots/windows.py.txt`. The record gives every reading, and calls the average a choice inside both ranges, not a measurement with an error of its own |
| F4 | The ranges left out the screen's scale (±1%), P8's principal point, the east wall's line as a possible centre line, and a likely pitch bias from fitting the vanishing point on the distorted image. The agreement is marginal (Claude R5) | Accepted | The vanishing point is refitted on distortion-corrected positions: the tiers agree at 2.6 × 10⁻⁸ per px², row −5,375, a pitch of 22.0°. The sweeps add the principal point ±30 rows, the screen's scale ±1% and the east wall's face up to 0.6 m further west. P8's centre is 16.73 m (15.90 to 17.43) and #29's 16.04 m (15.51 to 16.59). The record says they overlap only from 15.90 to 16.59 m and that one height rests on the hall's symmetry. The model takes 20.4 (16.29 m over the floor) |
| F5 | The mesh budget is not what keeps the surround out: a splay merged into an existing geometry adds triangles, not meshes (Claude R6) | Accepted | The real reason is recorded: the splay would sit inside the gable wall's brick, which needs that wall restructured, and its outer face is not measured. It is F-owner-4, with the brick reveal it leaves |
| F6 | The record's Z values are in the world frame, in a file whose header says every Z is in the map's frame (Codex 2, Claude R7) | Accepted | The record's first paragraph names the world frame and how to reach the map's |
| F7 | #29's entry kept "tilts slightly up" and added "level"; the tilt is about 2° (Claude R8) | Accepted | "Nearly level, about 2° up" in both places |
| F8 | Number nits: P8's own reading on the screen's plane is 6.96 m, not 6.80; 22.1 m is above the model's eaves, not near them; the upper tier's vanishing point lay outside the swept range; the glazing figures differed between the record, the devlog and the constants; the surround's centre was taken at its middle row, not its mean tangent (Claude R9) | Accepted | All corrected in the repaired record and script. The distortion refit resolves the tiers' disagreement |
| F9 | P8's quoted glazing range covered only its vertical reading (Codex 3) | Accepted | Both ranges recorded (2.13 to 2.25 m up and down, 2.07 to 2.16 m across), and the 2.25 m opening explained as the weighted 2.23 m rounded to 0.05 m |
| F10 | The renders do not reproduce the photographs' projections: the default 45° field, no shift for #29, and #29's views cropping the cresting (Codex 4) | Accepted | The plan's criterion now says what the renders check, the change's place and size, and what they cannot: registration with the photographs, also out of reach while the screen stands 6.7 m east |

## Verification

- `npm run verify` ran through the shared gate lock on the tree committed as `4f41cd6` and passed: 732 unit tests, typecheck, lint, build and 125 end-to-end tests (`tmp/hall-windows/verify-2.log`, port 5393). An earlier run had failed only because another server held port 5377, after its unit tests passed (`verify-1.log`).
- Renders of the windows before and after the change, in the worktree's ignored `.shots/hall-windows/`, were read at native resolution; Codex read all 12 and Claude 8.
- Codex ran the script's nominal values, sweeps, arcade check and doorway predictions again, and built the core area headless with the old and the new dimensions: 130 meshes each. Claude's lane allowed only git reads, so it recomputed the script by hand.
- The repairs, at `2a2e6ec`: `npm run verify` passed on that tree (`verify-3.log`: 732 unit and 125 end-to-end tests), and review 1 checked them.
- Neither reviewer could fetch the photographs, so no one remeasured them; the repository never stores them.

## Round outcome

Claude found one major problem and eight lesser ones, Codex four minor ones, merged as F0 to F10. All were accepted and repaired at `2a2e6ec`, the major one too: the check script's reversed roll, which had made the walking man and the arcade seem to confirm P8's camera. Review 1 re-reviewed the repairs. No finding was rejected, and none stayed open.
