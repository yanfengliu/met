# Review 4: implementation (F-owner-1 acted on)

## Target

The met repository, branch `claude/exciting-lichterman-7927b8`, commit `a064995` ("Bring the Valladolid choir screen to the heights its photograph shows"): `git diff bfb7699..a064995`, piped to both lanes, which also read the committed tree. The task: bring the choir screen's tiers and cresting (`src/model/core/choir-screen.ts`) to the heights #29 shows (F-owner-1 in `../plan.md`). The author's measurement method, raw numbers, photograph captures and renders were in the ignored `tmp/review-runs/choir-r0/evidence.md`, `photos/` and `.shots/choir-final/`.

## Reviewers and coverage

- Codex, `gpt-6-astra` at `xhigh`, codex-cli 0.163.0, read-only sandbox, the prompt as an argument and the diff on stdin, `--ephemeral`. It read the code outside the diff (`arches.ts`), recomputed the derived numbers and the projection, ran `openAlong` over the screen's 580 pieces, counted its geometry and material pairs, and inspected the photograph captures and the renders (21 image files). No DLL failure markers in its log.
- Claude, `claude-opus-5-5[1m]` at `max`, Claude Code 2.1.308, tools Read, Glob, Grep, Task and `git diff`, `git log` and `git show`; the report command printed `keep`. It recomputed every height from the evidence's raw rows, read the photograph captures and renders at native resolution, and checked closure, the mesh budget, the citation gate, the file's size and the docs' format.
- Neither lane ran `npm run verify`; both read the author's green run on `a064995`'s tree. Neither changed a file (checked with `git status` after both ran).

## Reports

The reports as each lane wrote them; nothing was redacted.

### Codex

I found **one major and three minor issues** in `a064995`.

- **R1 — major — Background lattice appears to have been copied into the screen.** [choir-screen.ts:173](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/choir-screen.ts:173). Comparing #29 with #44, I infer that the black diagonal grid belongs to the round window behind the cresting: its position relative to the gilt medallion changes between photographs, and #29 shows it through the medallion. The new annulus instead attaches that grid permanently to the screen. At the level camera, and when orbiting, this produces an unsupported feature. **Repair:** remove the lattice from `choirScreen` unless another photograph establishes that it belongs there; correct the corresponding claims in #29 and the devlog.

- **R2 — minor — The broken pediments float and miss their documented heights.** [choir-screen.ts:201](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/choir-screen.ts:201). The centreline rises only `0.46 × cos(1.03) = 0.2368 m`. Including thickness, each arm spans **13.267–13.590 m**, rather than **13.31–13.69 m**. Geometry intersection checks also confirm that all four arms touch no other piece; their nearby sunburst rays do not bridge the gaps. This is visible in the level cresting render. **Repair:** derive their transforms from the measured endpoints, accounting for thickness, and connect them with the supporting ornament visible in #29.

- **R3 — minor — The gate crown does not meet the frieze.** [choir-screen.ts:133](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/choir-screen.ts:133). The nominal crown is `3.70 + 0.54 + 0.14 = 4.38 m`; the generated vertices reach **4.37944 m**, leaving **30.56 mm** below the frieze at 4.41 m. The level gate render exposes this gap, contrary to the new comment. The outside-diff implementation in [arches.ts:268](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/src/model/core/arches.ts:268) confirms how rise and band determine the crown. **Repair:** derive the rise from the frieze’s underside—approximately **0.57 m**, allowing for faceting.

- **R4 — minor — The documentation misidentifies the base’s material height.** [interior.md:227](C:/Users/38909/Documents/github/met/.claude/worktrees/nice-leakey-9be7b0/docs/research/interior.md:227), also `interior-images.md:97`. Both claim the code builds a **0.98 m stone base**. It builds **0.90 m limestone plus 0.08 m iron** (`choir-screen.ts:107–108`). A comparison using the documented stone boundary therefore disagrees with the render by 8 cm. **Repair:** explicitly record this approximation and distinguish the limestone top from the sill top, or change the geometry to match the measured stone boundary.

Other checks:

- The reciprocal-height projection is correct. The stated vanishing-point range changes heights by at most **1.78 cm** from the nominal fit; constant scaling reads up to **9.06 cm higher**. Using the [Met’s published height](https://www.metmuseum.org/art/collection/search/201926) is defensible.
- Tier bounds, frieze fractions **13/39/26/22%**, medallion dimensions and spokes, lattice chord calculations, cross foot **14.142 m**, and finial sprays otherwise agree within the stated precision.
- All **580 screen pieces** passed `openAlong`. Inspection found no new closure defect in the rotated boxes or either ring construction.
- Both revisions use **9 screen geometry/material pairs**; the current core has **130 meshes**. Citation forms comply; the source is **223 lines**.
- The gate-post relocation is photograph-supported. Leaving the obstructed gate as an owner finding is appropriately explicit.

I inspected the supplied #29 native-resolution crops, P8’s gate crop, the overview captures, and preset/level renders. I did not rerun `npm run verify`; the saved author run ends successfully. No files were changed.

The 21 inspected image files’ sorted path/SHA-256 manifest hashes to `cf76118d16289cda90ff7866888096dea6f034eca3b2588701a6d52590b38581`.

### Claude

I found no blocker, but the change does not fully meet acceptance criteria 1 and 4. The tiers and friezes match #29 closely. The rebuilt cresting has its pediments floating in the air, at the wrong height and slope. The sunbursts are twice as wide as the photograph's, and the side plinths run about 0.35 m too far toward the axis. One doc also says the code builds a 0.98 m stone base when the code builds 0.9 m of stone under an iron sill. I did not run `npm run verify`; the author's logs show it green (`tmp/choir/logs/verify-2.log:13-14`: 646/646 unit tests; `:180`: 84 e2e passed).

### Findings

**R1 · minor · `src/model/core/choir-screen.ts:201` — the broken pediments float.**
- **What's wrong:** each half touches nothing. Its inner corners stop at x ± 0.080 from the side axis, 4 cm short of the stem (± 0.04, `:200`). The ±60° sunburst rays pass about 2 cm above them. The oval's rim below is 0.40–0.55 m lower (rim top 12.66 m at x ± 0.5, 13.08 m on the axis). In #29 (`29-left-cresting-x400-y850-s1.png`, capture x 495–680, y 185–250) a gilt bar under the sunburst's foot joins the halves, and scrolls rising from the oval's frame carry them.
- **Failure:** two dark bars hang in the air over each side medallion in `level-cresting.png`, `level-upper.png`, `elev-crest-2x.png` and the preset.
- **Repair:** join the halves' inner feet across the stem with a short gilt `UNIT_BOX`, and carry their outer ends on the oval's frame with the existing `half` ring. Both pairs already exist in the step.

**R2 · minor · `choir-screen.ts:201` against its own comment `:48` and `interior-images.md:97` — the pediment's numbers.**
- **What's wrong:** the comment and the #29 entry say the pediments span 13.31 to 13.69 m. The code builds 13.27 to 13.59 m, with the upper corners at 13.590, sloping 31° from horizontal. #29 shows them rising about 0.30 m over 0.33 m, about 42° (rows 1090 → 1038 give 13.37 → 13.67 m).
- **Failure:** the pediments sit 10 cm low and read flatter than the photograph.
- **Repair:** `slant(x + side * 0.52, 13.33, 0.48, -side * 0.8, 0.1, 0.12)`. That spans 13.29 to 13.70 m at 44°, with the inner lower corners at x ± 0.14, 13.63 m, which is where R1's bar would join them.

**R3 · minor · `choir-screen.ts:202` — the sunbursts are twice as wide as #29's.**
- **What's wrong:** seven 0.73 m rays at kπ/9 fan ±60°. Their tips span ±0.63 m (1.26 m), wider than the 1.05 m pediment. In #29 the sheaf's outer rays lean about ±37°, their tips span about 0.63 m, and they are shorter (about 0.5 m) than the middle ray (0.71 m). #44 and P8 show the same narrow sheaf. The heights agree: foot 13.56 m, top 14.28 m.
- **Failure:** the side groups read as wide fans, not narrow sheaves.
- **Repair:** rays at kπ/15, with lengths `0.73 - 0.06 * |k|`. The tips then span ±0.32 m.

**R4 · minor · `choir-screen.ts:55` — the side plinths `[2.05, 4.65]` reach too far in.**
- **What's wrong:** on `29-cresting-x735-y600-s0.463.png` at row 1460, read with the evidence's map, the plinths span −4.66 to −2.38 m and +2.42 to +4.63 m. The middle group's outer scroll hangs down to the bare frieze in the 0.95 m gap. The model's gap is 0.6 m.
- **Failure:** a dark plinth runs 0.35 m into a gap that #29 shows open.
- **Repair:** use `[2.35, 4.65]`. That keeps the side scrolls' outer feet, at 2.357 m, on the plinth.

**R5 · minor · `choir-screen.ts:23`, `:30`, `:107-108` against `docs/research/interior.md:227` and `interior-images.md:97` — the base.**
- **What's wrong:** the docs say "the stone base rises to 0.98 m", and `interior.md` adds that the code "builds these heights". The code builds limestone to 0.9 m under an 8 cm iron sill. #29 (`29-base-x400-y3000-s1.jpg`, rows 3273–3289) shows the balusters' ball feet on a light stone coping from 0.91 to 0.99 m, with no iron sill. The model's sill is that coping, drawn in iron.
- **Failure:** `level-gate.png` shows a black band along the base's top where the photograph has light stone. A doc claims something the code does not build, which fails criterion 4.
- **Repair:** build the limestone to `foot0` and drop the sill (the pair count is unchanged), and fix the comment.

**R6 · minor · `choir-screen.ts:39`, `:132-135` — the gate's arch against its own comments.**
- **What's wrong:** the comment at `:39` says "its iron arch … its crown at the frieze", and `:132` says the crown meets the frieze. The code builds the arch in `gilt`. Its crown is at 3.7 + 0.54 + 0.14 = 4.38 m, 3 cm under the frieze's foot at 4.41 m. #29 and P8 (`29-gate-x1200-y2620-s1.png`, `P8-gate-x560-y1700-s1.png`) show a dark iron band with gilt in its spandrels, its crown touching the frieze (about 4.40 m).
- **Also:** the ring stands free in front of the balusters with no `back`. `src/model/core/arches.ts:256` says `back: false` is for a ring lying on a wall. The closure gate cannot see the missing face, because vertical lines never cross it. This was already so at the base revision.
- **Repair:** `rise: 0.57`, build the ring in `core.screenIron` (still one pair for the ring), and pass `back: true`. If gilt is intended, say so in the comment and the docs instead.

**R7 · nit · `interior-images.md:97` — the tilt correction's direction.**
- **What's wrong:** "read through that projection rather than at one scale, which puts them up to 9 cm higher" most naturally says the projection raises the heights. It lowers them. The lower frieze's top reads 5.088 m against 5.167 m at one scale, and the gap reaches −9.1 cm at mid-height. `evidence.md:16` states it correctly.
- **Repair:** "…which at one scale would read them up to 9 cm higher."

**R8 · nit · `interior-images.md:97`, `evidence.md:13` — the error budget leaves out the zero's depth.**
- **What's wrong:** the zero (row 3452) is read on the base's front face, which stands in front of the balusters' plane. The camera is above the floor: #29 shows the floor before the base, and the far font's rim from above. So that row maps to −h·d/(D − d) in the plane, for camera height h, distance D and base depth d. With d of 0.3–0.45 m, h of 1.5–7 m and D of 20–36 m (the hall is 34.30 m long, `interior.md:222`), the zero is 1 to 16 cm low. That error is on the order of the 9 cm tilt correction.
- **What holds:** the stated sensitivity to the vanishing point is correct (I get 1.8 cm and 1.5 cm). The entry just omits this term.
- **Repair:** name the term in the entry, or quote the heights to about ±5 cm.

**R9 · nit · middle group: further mismatches with #29 that no doc names.**
- #29 (`29-middle-medallion-x1200-y1000-s1.png`) shows the lattice filling the whole disc behind the gilt tracery, inside an iron ring about 1.5 m across and on a grey disc about 2.3 m across. The model has a lattice only in a ring outside the gilt ring, eight spokes inside it, and a continuous gilt rim 1.6–1.82 m across where #29 shows separate C-scrolls.
- The "urn to 14.24 m" (`:189`, `interior-images.md:97`): #29 shows a dark fluted cup rimmed at about 14.13 m (row 958), under a dark spire to about 14.40 m. The model's urn is gilt throughout.
- **Repair:** record these as deliberate simplifications in the comment, and fix 14.24 in the entry.

**R10 · nit · process: where the new findings are recorded.**
- **What's wrong:** the open gate is a sound finding to raise, not fix, because opening it changes the walk's collision through the nave. But it appears only beside the code, in the devlog and in `interior.md`. Work unit 4's owner list at `plan.md:43-57` ends at F-owner-4, and its follow-ups line, edited here, does not name it. This change also has no `docs/work` home for its review rounds (canon R24).
- **Repair:** add it as F-owner-5, and file this review as a round under `docs/work/4_cited-images-viewed/reviews/`.

**R11 · nit · style, `choir-screen.ts:147`, `:159-160`, `:210`.**
- **What's wrong:** the constants `1.14` and `2.28` depend on `half`'s `band: 0.07` and `span: 1` without being derived from them, so changing `band` silently misfits every ring. `f.width > 0.5` acts as a hidden "two legs" flag, and `width` has no doc comment.
- **Repair:** derive both constants from a named band, and give `Finial` an explicit `legs` field.

### Checked and sound

- **Heights:** every height recomputes from `evidence.md`'s raw rows with the stated map: 0.979, 4.412, 5.088, 7.712, 8.380, 10.592, 11.145 and 11.291 m.
- **Measurement method:** reading height as linear in 1/(y − y_v) is correct for a plane. Scaling by the height is defensible: the 12.9–13.0 m width it gives fits the Met's 52 × 42 ft once both are rounded to the foot.
- **Frieze proportions:** they hold for all three friezes (lower 13/39/26/22%, middle about 12/38/28/22%, top about 14/36/31/19%).
- **Cresting positions confirmed on the captures:**
  - cross arms at 15.17 m, 1.32 m wide
  - crown 13.28–13.54 m
  - side ovals 0.74 × 0.95 m at 12.38 m, 3.5 m out
  - finials at ±1.3 and ±2.5 m (the ±4.5 m pair reads 4.41–4.47 m)
  - end urns at 6.0 m, slab 12.22–12.33 m, flowers to 13.60 m
  - gate posts at ±1.31 m, springing at 3.72 m
- **Derived numbers:**
  - bosses sit inside the dark band
  - the cross's foot is at 14.142 m, inside the urn's lip (14.10–14.24 m)
  - the sprays reach `top` + 5 mm
  - the spokes end on the ring's inner edge
  - the lattice runs end on r = 0.525 and 0.725 m
  - the scrolls' feet are on their plinths
- **Moving the gate was needed:** the old arch's crown at 5.14 m would have passed through the new frieze (4.41–5.09 m). The posts at ±1.3 m are measured on #29.
- **Closure:**
  - Rotated unit boxes, `disc`, and the half-ring under rotation and non-uniform scale all keep their faces looking out.
  - Each piece is one primitive, so no piece overlaps itself.
  - The Main floor view's cut at 7.8 m (`src/viewer/floors.ts:69`) passes 1 cm under the arch's feet at 4.11 + 3.7 m (`src/model/frame.ts:44`).
- **Mesh budget:** the step has 9 geometry/material pairs before and after, against the budget at `core.test.ts:34`. The author's first attempt hit 136 meshes (`tmp/choir/logs/test-1.log:15`).
- **Citation gate:** all three mentions in `choir-screen.ts` are in the required form.
- **Size and docs format:** the file is 223 lines, and every doc paragraph is one line.
- **Renders:** they match a064995's geometry (pediment slope, crown gap), although they were captured at 12:50 and the commit is 13:04.

After merge, the owner's render gallery needs republishing (`docs/policies/local-rules.md:7`). The sha256 of every image I read is in `C:\Users\38909\AppData\Local\Temp\claude\C--Users-38909-Documents-github-met--claude-worktrees-nice-leakey-9be7b0\bbbae41b-8e7e-4216-b365-a1d78af33c8a\scratchpad\inspected-digests.txt`.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F25 | The diagonal lattice built round the middle medallion is the hall's round end window seen through the medallion's openwork, not the screen (Codex R1, major; Claude R9) | Accepted. P8 at full size shows a round window in the hall's east wall, glazing bars in a grey circular reveal, like the grey disc and lattice #29 shows behind the medallion, and in #44 the disc sits below the top frieze. #29 most likely looks west, at the other end wall's window (corrected in round 5, F37) | The lattice is gone; #29's entry, `interior.md`, the comment and the devlog say what it is |
| F26 | The broken pediments touched nothing, sat 13.27 to 13.59 m against the stated 13.31 to 13.69 m, and sloped 31° where #29 shows about 42° (Codex R2; Claude R1 and R2) | Accepted | Rebuilt from the measured ends, 13.29 to 13.69 m at about 42°; a gilt bar joins their inner feet over the stem, and C-scrolls rising from the oval's rim carry their outer ends |
| F27 | The gate's arch stopped 3 cm under the frieze against its comment, was gilt where #29 and P8 show a dark iron band, and had no back though it stands free (Codex R3; Claude R6) | Accepted | Rise 0.575 m, so its crown meets the frieze; iron; `back: true` |
| F28 | The docs said the stone base rises to 0.98 m; the code built 0.9 m of stone under an iron sill, where #29 shows a stone coping under the balusters' feet (Codex R4; Claude R5) | Accepted | Limestone to the lowest tier's foot, 0.98 m, across the screen's width, 0.25 m either side of its plane so it stays 2 cm clear of the middle piers' plinths (0.4 m either side met them); no sill |
| F29 | The sunbursts fanned ±60° to 1.26 m across, where #29's sheaf is about 0.63 m across with shorter outer rays (Claude R3) | Accepted | Rays every 12°, 0.65 m less 0.038 m a step out from the middle, 0.63 m across at their tips |
| F30 | The side plinths ran 0.3 m further toward the axis than #29's (Claude R4) | Accepted | `[2.35, 4.65]`; the scrolls' feet stay on them |
| F31 | #29's entry read as if the projection raised the heights (Claude R7, nit) | Accepted | Reworded: read at one scale they would come out up to 9 cm higher |
| F32 | The error budget left out that the floor is read on the base's front face, before the balusters' plane (Claude R8, nit) | Accepted. The camera's height and distance are unknown, so the term is bounded, not corrected | #29's entry and `interior.md` give the heights about ±0.1 m near the floor, less higher up |
| F33 | The middle urn was gilt and stood to 14.24 m where #29 shows a dark fluted urn to 14.13 m under a dark spire to 14.40 m, and the frame's and tracery's simplifications were unrecorded (Claude R9, nit) | Accepted | A dark urn to 14.13 m and a dark spire to 14.4 m; the comment names the simplifications (spokes for tracery, whole rings for C-scrolls, drums for urns) |
| F34 | The open gate was not in this unit's owner list, and the change had no `docs/work` home for its reviews (Claude R10, nit) | Accepted. The allocator refuses new IDs, so the follow-up and its rounds are recorded in this unit, whose finding it answers | F-owner-5 in `../plan.md`; this record and round 5 here |
| F35 | `1.14` and `2.28` hid the half-ring's band, and `f.width > 0.5` stood for "two legs" (Claude R11, nit) | Accepted | `HALF_BAND` and `HALF_OUT`; `Finial.legs` |

## Verification

- `a064995`: `npm run verify` (MET_PORT 5347) passed: 646 unit tests, typecheck, lint, build and 84 e2e. A first run on the change before its last cresting adjustment passed too.
- The repairs, on `a064995` merged with `origin/main` (`00eeee7`): see round 5.

## Round outcome

No blocker. Codex found one major finding, the lattice, which P8 and #44 show to be a window of the hall's end wall; Claude found six minor findings and five nits. All eleven, F25 to F35, are accepted and repaired in the commit after the merge of `00eeee7`. The repairs change the cresting's geometry, so round 5 reviews them.
