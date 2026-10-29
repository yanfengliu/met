# Review 0: the implementation

## Target

Work unit 7 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `453d0af`, the diff `00eeee7..453d0af` (18 files, 920 lines of diff), the facing readings, the gate's new readings and the fixes of the gables, the soffits, the Dendur rolls and the acanthus leaves.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt (`tmp/review-runs/facing-r0/prompt.md`, ignored), Codex's with a line asking for a file and line for every finding: the facing helpers' signs, sums, noise and grid, the gate's readings and their bounds, each fix against what its builder builds, error messages, tests that prove only self-agreement and docs that overstate.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran TypeScript and built the model in memory; Vitest could not run in its sandbox. It cited `armor-court.ts:289` outside the diff. It changed no file.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It ran the full unit suite, tsc and ESLint, replayed the red proofs in a scratch copy and probed in its own scratchpad; the reviewed worktree stayed at `453d0af`.

## Reports

### Codex (`gpt-6-astra`)

Found four issues in `453d0af`:

1. **Major — capped mitres can still produce reversed triangles.** [sweep.ts:157](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/sweep.ts:157)  
   Sweep a rectangular profile `d=0..0.1`, `y=0..0.3` along `[[10*cos(10°),0,10*sin(10°)],[0,0,0],[1,0,0]]`. With the default `maxMitre=6`, the guard accepts it, but one of its 20 triangles faces opposite its normal. Capping the mitre changes its transverse displacement; positive advance alone no longer proves correct winding. Validate the actual ring geometry and triangle orientation, and add this capped-mitre regression.

2. **Minor — edge deduplication merges distinct surfaces.** [facing.ts:176](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:176)  
   Combine three outward boxes: `[0,1,0]..[1,2,1]`, `[0,0,0]..[1,2,1]`, and `[0,-2,0]..[1,-1,1]`. `inwardAlong(geometry, UP, 10)` incorrectly returns **10 inward lines, worst 1 m**. Coincident top-edge hits from separate boxes collapse into one crossing, corrupting the winding below them. Deduplicate shared triangle edges without discarding independent surface multiplicity.

3. **Minor — the reported noise bound misses arithmetic cancellation.** [facing.ts:99](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:99)  
   A triangle with corners `[-74,-14,-43]`, `[-34,-42,39]`, `[-46,96,94]`, duplicated with reversed winding, has exactly zero volume. Along normalized `[1,2,-0.5]`, the helper returns volume **−2.9103830456733704e−11**, with **noise 0**. This exceeds the gate’s `1e-12` floor and falsely flags the membrane. Include floating-point accumulation error in the bound; unmatched projected area alone is insufficient.

4. **Minor — the vault guard rejects coffers that fit.** [dome.ts:230](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/dome.ts:230)  
   `{span:4, length:3, thickness:0.1, detail:'low', coffers:{across:2, along:1, depth:0.08, rib:0.01}}` now throws. Its floor corners actually clear the extrados facets by approximately **18 mm**. Suppressing only the guard in memory produces zero inward readings on a 400×400 grid. The formula uses the shell’s minimum radial clearance regardless of the floor corners’ angles. Test those corners against the actual facets and retain this valid-input regression.

Outside the diff, I checked the gables’ reflected basis at [armor-court.ts:289](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/mmw/armor-court.ts:289) and the builder’s winding correction. I also verified consistent facing signs, the reference-height shift, mirror-removal invariance for existing readings, and the grid’s split indexing and winding.

TypeScript passed. The full model built in memory with 27,043 unmirrored pieces; all six capital grid checks passed. No changed source file exceeds 500 lines. Vitest executed no tests because the read-only sandbox blocked its temporary SSR directory. Rendered appearance and claimed historical red proofs remain unverified. No repository files were changed.

### Claude (`claude-opus-5-5[1m]`)

**Verdict: no blockers, two majors.** The four fixes are correct, and all four red proofs in the header replay. The new helpers get their signs and arithmetic right. But the gate does not yet prove what the spec now says ("every closed part faces out"): it misses a pocket that is in the model today, and it cannot see an upright face wound in. Both can be closed with code this change already has.

#### Major

**1. The new pocket reading misses a live pocket in Diana's bow.**
- **Where:** `src/model/roche-north/figures.ts:63` (outside the diff), read by `src/model/closure.test.ts:483-486`.
- **Scenario:**
  - The bow is a `TorusGeometry` arc with open ends, and both tips sit on one vertical line (local x −0.2327, at y 1.065 and 0.495).
  - Because the two open ends line up, their odd edges cover the same stretch twice. So `openAlong` reads the open tube as closed, and `partVolumes` reads it as a part facing out (+7.35e-5).
  - Along that line the parity rule gets it backwards. It reads the air above and below the bow arm as inside (0.287 and 0.244 of the figure's height, about 0.74 and 0.63 m in world), wound inside out, and the arm itself as outside.
  - The gate's 96 lines on this shape never cross it, although the shape is walked and read. `inwardAlong(DIANA, up, 64)` finds it on 4 lines; 128 and 240 cells find it too.
- **Docs it falsifies:** `docs/design/spec.md:78` says "no line through its faces crosses a stretch where more of them look down than up". AGENTS says "the parts library keeps its parts from folding", but only the capitals and one vault are read.
- **Fix:**
  - Close the bow, for example by sweeping a closed section along the arc; open sweeps put caps on by default.
  - In `closure.test.ts`, run `inwardAlong(geometry, shape.vertical, 64)` over every shape and door leaf. At HEAD it flags only this shape, and it took about 2 s or less in my probe.
  - Limit both doc sentences to what is actually read.

**2. No reading can see an upright face wound in.**
- **Where:**
  - `src/model/lib/facing.ts:42`: `partVolumes` reads along vertical only.
  - `closure.test.ts:299`: the lines skip upright faces.
  - `closure.test.ts:386`: the upright test accepts an inside on either side.
- **Scenario:**
  - On a fixture, a 1 m box with only its four sides wound in reads +1 m³ and no pocket; read along X it gives −1.
  - A realistic regression is worse. I reversed `sideQuads` in `src/model/roche-south/shapes.ts:113`, which builds the side walls of `prism` (18 calls in the Lehman, Wallace, Kravis and Rockefeller wings). All 9 closure tests and roche-south's own tests stayed green.
  - This limit is named nowhere: not in facing.ts, the closure test's header, AGENTS or the spec (R19).
- **Fix:** the upright test already reads the winding on both sides at seven points. Make it fail where the winding in front of a face is greater than behind it, and keep skipping two-sided membranes.
  - At HEAD, across 870 shapes, behind minus front is never negative (0 at 134 points, 2 at 2,691, 3 at 220).
  - With `sideQuads` reversed it is −1 at 4,844 points in 22 shapes; on the fixture, at 56.

#### Minor

**3. The Hunt soffit's thicker shell is not hidden at its front end.**
- **Where:** `src/model/hunt/arches.ts:112-113`, against `src/model/hunt/walls.ts:79-84`.
- **Scenario:**
  - The soffit's front ring sits at z −0.35, the plane of the body wall's front face.
  - The shell's outer face is now at radius 4.21, while the wall's opening is at 4.15. So a band about 5 cm wide lies flush in the wall's face, both facing +Z, in the reveal visible from the street.
  - The two render the same at rest only because both use `palette.limestone`.
  - The Great Hall soffit is fine: its ends stand 2 cm inside the wall faces.
- **Fix:** start the Hunt soffit 1 cm behind the wall's face.

**4. No render inspection is recorded (R16).**
- **Scenario:** the change alters what four things draw: the gables, both soffits, two Dendur rolls, and every medium-detail Corinthian leaf. The commit records only `npm run verify`.
- **Fix:**
  - Run `npm run shots` and look at the armour court, the Hunt and Great Hall arches, the temple's back corners and a capital close-up.
  - Republish the render gallery if any render changed.

#### Nits

- **`column.test.ts:126`** says "42 and 44 lines". With the diagonal fix reverted, the test reads 24 (round capital) and 36 (flat) at medium detail; AGENTS says 24.
- **`dome.test.ts:103`** calls its fixture "the Hunt arches' soffit as it was", but uses span 4.6 and length 1.2. The real soffit is 8.14 by 0.8, and at 0.06 it leaves 0.0495 of room, which the test's regex `/0\.05\d+/` would not match.
- **`dome.test.ts:106`** calls a 0.1 shell "just thick enough", but that shell does hold pockets (31,564 lines in my probe).
- **The vault refusal (`dome.ts:225-236`)** is safe but about 4 mm stricter than needed.
  - With the refusal off, the coffers stop standing out at 0.1075 (Hunt) and 0.1275 (Great Hall). The refusal still blocks shells up to about 0.111 and 0.131.
  - For those shells its message wrongly says the coffers reach the outer face. The message could also name the thickness that would pass.
- **`builder.ts:39`:** `flattest` is silently ignored with `flat: true`; that path (`:140`) always splits from the first corner.
- **`facing.ts:8`** doesn't say that parts touching at a corner are read as one. An inside-out box sharing one corner with an outward box reads as a single 26 m³ part; moved 2 µm apart, the inside-out box reads −1 on its own.
- **AGENTS' "4,726 parts"** is the shapes' own geometries; the test actually reads 4,774, counting 48 door-leaf parts.
- **"As thin as their coffers were deep"** reads as thickness equal to depth. The proof actually used the old 0.06 and 0.08 shells.
- **Records:** there is no defect-register entry (R17) and no `docs/work/<id>` folder (R24) for this owner-requested fix.

#### Verified

- **Sign conventions:** a face looking up counts +1 in all four readings (`partVolumes`, `inwardAlong`, `windingAlong`, `windingAbove`). The volume doesn't depend on which way `vertical` points, so flipping it to y ≥ 0 is harmless.
- **Summed parts:** the height shift for parts that close only together is exact. The model has 3 such groups (6 parts). All 4,771 readings are made; none is dropped by the noise bound or the 1e-12 floor. The quoted 27,043 pieces is right.
- **`inwardAlong`'s grid:** its cell ranges and its counting of edge hits once are right.
- **Mirror correction:** removing it changes only the new pocket reading; the sum and overlap readings don't depend on sign.
- **Gables:** the transform that places them mirrors (determinant −1) and `MeshBuilder.transform` flips it back (`builder.ts:270`). The tympanum is unchanged.
- **Dendur rolls:** the span stays 5.202 to 5.722 m (`temple.ts:42`).
- **Vault refusal:** its formula matches how `buildVault` divides the shell (`dome.ts:248-249`). Both new shells pass it (room 0.129 and 0.149), and so do the balcony and gallery vaults.
- **`flattest`:** the triangle order with and without flip, the normals, and the split indexing with wrapU are all right.
- **Sweep refusal:** `foldProblem` checks the positions the sweep actually emits. All 68 gallery exhibits still build.
- **Red proofs**, replayed in a scratch copy:
  - Gables: 2 parts, 48 lines.
  - Rolls: 2 pieces mirrored.
  - Soffits: 58 lines, 32 of them the Great Hall's alone.
  - Acanthus: 2 lines in the closure gate, 24 at medium in the column test.
- **Suite:** 667/667 unit tests pass with the headroom check. The two new closure tests take 175 ms and 3 ms. Typecheck and lint are clean.
- **Tree:** the reviewed worktree is untouched at `453d0af`.

To reproduce the two majors, the reviewer pointed to two probes in its own scratchpad (paths redacted).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Diana's bow is an open torus arc whose open ends line up on one vertical line, so `openAlong` reads it closed and `partVolumes` as facing out, and the gate's lines never cross its pocket; the spec and AGENTS overstate what is read (Claude 1, major) | Accepted | The bow's ends are capped (`torusArc`, `src/model/roche-north/figures.ts`); the gate reads a grid of 64 lines a side over every shape and door leaf (`inwardAlong`), red with the bow open (1 line); the spec and AGENTS say what is read |
| F1 | No reading sees an upright face wound in: with `prism`'s side walls reversed every closure test passed (Claude 2, major) | Accepted | The upright test fails where a face has more inside in front than behind, or none on either side, but for two-sided membranes; red with `sideQuads` reversed (22 shapes) |
| F2 | The Hunt soffit's thicker shell lies flush in the wall's face in a 5 cm band (Claude 3, minor) | Accepted | Its front stands 1 cm behind the wall's face (`SOFFIT_SET`, `src/model/hunt/arches.ts`), its back where it was |
| F3 | No render inspection recorded (Claude 4, minor) | Accepted | The standard shots after, compared with `a4af999`'s by pixel difference, the changed images read at native resolution (below) |
| F4 | The capital test's comment says 42 and 44 lines; reverted, it reads 24 and 36 (Claude, nit) | Accepted | Reworded with 24 (round) and 36 (flat) |
| F5 | The vault test's fixture is not "the Hunt arches' soffit as it was" (Claude, nit) | Accepted | It uses the soffit's 8.14 m span and 0.8 m length, and names its numbers |
| F6 | A 0.1 m shell is called "just thick enough" though it holds pockets (Claude, nit) | Accepted | Reworded: a shell as thick as its coffers are deep is refused too |
| F7 | The vault refusal is about 4 mm stricter than needed and its message wrong for shells between (Claude, nit) | Accepted, with F16 | The refusal tests each corner against its facet, and names the thickness that would hold the coffers |
| F8 | `flattest` is silently ignored with `flat: true` (Claude, nit) | Accepted | Flat grids honour it too; without it they split as before |
| F9 | `facing.ts` does not say parts touching at a corner are one part (Claude, nit) | Accepted | Said in its header |
| F10 | AGENTS' 4,726 parts leaves out the 48 door-leaf parts the test reads (Claude, nit) | Accepted | 4,774 parts, 4,726 of the shapes and 48 of the doors' leaves |
| F11 | "As thin as their coffers were deep" misstates the red proof, which used the old 0.06 and 0.08 m shells (Claude, nit) | Accepted | Reworded in the gate's header and AGENTS |
| F12 | No defect-register entry and no work folder (Claude, nit) | Accepted | `docs/learning/defect-register.md`, "Parts face in"; this folder, work unit 7 |
| F13 | `sweepInto`'s fold refusal accepts a capped mitre that reverses a triangle (Codex 1, major) | Accepted; the refusal is withdrawn | No sweep of the model folds, so the refusal guarded nothing the gate does not read now; `sweep.ts` and its test are as on main |
| F14 | `inwardAlong`'s edge dedupe merges coincident surfaces of separate parts: three outward boxes read 10 lines inward (Codex 2, minor) | Accepted | No dedupe; each line stands off its cell's centre by irrational shares whose sum and difference are no simple fraction, so lines miss edges and diagonals; Codex's boxes as a regression |
| F15 | `partVolumes`' noise bound misses cancellation: a membrane reads −2.9e−11 with noise 0 (Codex 3, minor) | Accepted | The bound adds a billionth of the volume's terms summed unsigned; the gate's floor is gone; Codex's membrane as a regression, red without it |
| F16 | The vault refusal rejects coffers that fit, its rule the shell's least clearance whatever the corners' angles (Codex 4, minor) | Accepted | Each coffer floor's corners against the chord of the facet above them; Codex's case builds and reads no pocket, red with one share for every corner |

## Verification

`npm run verify` passed with `MET_PORT=5348` on the repairs (`3ac62d7`): 73 files and 669 unit tests, typecheck, lint, build and 84 e2e tests in 14.4 min. The repairs' red proofs: Diana's bow left open (the grid, 1 line of its shape's 4,096, 0.72 m), `prism`'s side walls reversed (the upright reading, 22 shapes), the noise bound without rounding (the membrane test, 2.9e−11 against 0), the vault refusal with one share for every corner (the vault test); Codex's three boxes read 10 inward lines before the repair. The model is 1,618,845 triangles, 4 more than `00eeee7` for the bow's caps, with 27,043 pieces and 746 meshes.

The standard shots of `3ac62d7`'s tree were compared with a set of `00eeee7` captured on the same machine that afternoon, by each image's pixel difference. Beyond capture noise, they differ where the soffits, the capitals, the Dendur rolls and the Great Hall arches changed: `preset-ref-column-pair-north` (20,828 pixels), `preset-ref-entrance-up` (20,469), `walk-plaza` (14,635), `preset-ref-front-axis` (7,800), `preset-ref-front-street` (6,963), `preset-int-grand-stair-west` (6,415), `preset-ref-fountain-north` (5,973), `walk-second-floor` (4,374), `preset-int-great-hall-balcony-south` (1,103), `preset-int-dendur-se` (223), and a few edge pixels elsewhere. Each was read at native resolution, its densest window magnified twice: the soffits keep their coffers, set back where the Hunt one now stands, the capitals' leaves their form, and the Dendur roll now reads round; no gap, seam or flicker. The gables, under their roof, show in no standard view. The set first compared, the primary checkout's, held 21 images another session's capture had overwritten (the choir screen's new form) under its `a4af999` record, so the clean set of `00eeee7` was captured for this comparison. The first page's cold load took 4.0 s here and 5.0 s at `00eeee7` in the same hour, with other sessions' work running; the e2e 4 s budget passed.

## Round outcome

Neither lane found a blocker. Both majors of each lane are repaired or, for the sweep's refusal, withdrawn, and every minor and nit is repaired. The repairs go to review 1.
