# Review 1: the repairs of review 0

## Target

Work unit 7 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `3ac62d7`, the diff `453d0af..3ac62d7` (16 files, 979 lines of diff), the repairs of review 0's findings F0 to F16.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt (`tmp/review-runs/facing-r1/prompt.md`, ignored), Codex's with a line asking for a file and line for every finding: each repair against its finding and its red proof, new false positives and negatives in the upright rule, the grid without its edge merging, the noise bound and the vault rule, the bow's caps, the moved helpers, and the docs.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran TypeScript and ESLint and 59 check bodies through an assertion adapter, since Vitest could not start in its sandbox, and replayed the bow, prism, boxes and membrane proofs. It cited `dome.ts:307` outside the diff. It changed no file; its delegation was unavailable.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It ran all 669 unit tests in a scratch copy, tsc and ESLint, replayed the red proofs and probed in its own scratchpad; the reviewed worktree stayed at `3ac62d7`.

## Reports

### Codex (`gpt-6-astra`)

Found three correctness issues and three nits at `3ac62d7`.

1. **Major — the vault refusal misses protruding opening corners.** [dome.ts:237](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/dome.ts:237) checks only floor corners. This call succeeds:
   ```ts
   barrelVault({
     span: 4, length: 3, thickness: 0.03, detail: 'low',
     coffers: { across: 2, along: 1, depth: 0.001, rib: 0.8 },
   })
   ```
   Yet `inwardAlong(..., UP, 240)` finds **5,871 inward stretches**, the worst **0.0423 m**. The unchanged builder places opening corners at a different angle from floor corners ([dome.ts:307](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/dome.ts:307), outside the repair diff). An opening corner can sit beneath a facet’s middle while the farther-inset floor corner clears its chord. **Fix:** check opening corners as well as floor corners against the outer facets, and retain this regression alongside F16’s valid case.

2. **Minor — removing deduplication introduces false pockets on shared triangle edges.** [facing.ts:180](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:180) counts both triangles when a line meets their diagonal. Two outward boxes, `[0,1,0]..[1,2,1]` and `[0,-2,0]..[1,-1,1]`, read as **one inward stretch of 2.000002557 m** with 64 cells and direction `normalize([0.0015990724361849436, 1, 0])`. Perturbing the first component by ±`1e-6` returns zero. These boxes use integer coordinates, disproving the comment’s assurance about “round measures.” **Fix:** use consistent half-open edge ownership, or resample ambiguous edge hits, while preserving separate coincident surfaces.

3. **Minor — the revised noise bound still rejects a zero-volume membrane.** [facing.ts:97](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/facing.ts:97) averages absolute heights before subtracting `low`; rounding occurs before the unsigned terms used by the new bound exist. Build triangles `[a,b,c]` and `[a,c,b]` with:
   ```text
   a = (5,15,16), b = (9,7,23), c = (21,33,16)
   vertical = normalize((b-a) × (c-a))
   ```
   `partVolumes` returns volume **−4.646455127738634e−13**, noise **4.646455127738634e−22**. The repaired gate rejects this membrane; the removed `1e-12` floor previously suppressed it. **Fix:** subtract the reference height before averaging, account for errors forming the terms, and add this fixture.

4. **Nit — the thickness prescription rounds toward an invalid value.** [dome.ts:246](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/dome.ts:246) tells the Hunt fixture to use thickness “greater than 0.1073 m,” but **0.10731 m still throws**. **Fix:** round the minimum upward and maximum depth downward, or print sufficient precision so following the advice succeeds.

5. **Nit — the upright test retains its obsolete explanation.** [closure.test.ts:258](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:258) still says “either side will do.” That contradicts the new side-wall test. **Fix:** explain the signed winding comparison and separately note that wholly inverted solids are caught by the volume reading.

6. **Nit — the capital proof’s exact counts did not reproduce.** [column.test.ts:126](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/column.test.ts:126) records **24/36** lines. Removing `flattest` from both leaf grids produced **29/40** at medium detail under Node 24.18.1. The proof remains red, but its recorded counts differ. **Fix:** pin the precise mutation and environment, then reconcile the comment and repeated documentation figures.

Verification completed:

- Type checking and lint passed. All **59 focused check bodies** passed through an in-memory Node assertion adapter. Normal Vitest started **no tests** because the sandbox denied its temporary SSR directory.
- Replayed the bow, prism, original three-box and original membrane red proofs. The prism mutation failed in **22 shapes**; opening Diana’s bow produced the claimed single grid line.
- Verified cap facing and exact shared corners, the soffit setback with its back unchanged, flat-grid splits, documented part counts, and the 500-line limit.
- Confirmed moved helpers are unchanged apart from exports, and `sweep.ts`/`core.test.ts` match `00eeee7`.

No files changed. Build, browser and visual checks were not run. Independent delegation was attempted but unavailable because the agent service failed to load its context.

### Claude (`claude-opus-5-5[1m]`)

**Verdict:** I found no blocker or major issue. Every repair does what it claims, and each red proof I replayed went red as stated. There are three minor findings and six nits. The worktree is untouched at `3ac62d7`.

#### Minor

**M1. The grid catches a reopened bow on one line, only where the grid happens to fall.** `src/model/closure.test.ts:309`, `AGENTS.md:107`
- **Scenario:** I put the open `TorusGeometry` back in a scratch copy. Only the grid test went red: 1 shape, 1 line of 4,096, 0.7212 m.
  - On that geometry I swept the grid from 16 to 160 lines a side. 48 of the 145 sizes miss the bow, including 62 and 65.
  - The opening shows in plan as a sliver about 5 × 16 mm in Diana's frame. A few millimetres' change to her limbs moves the grid's bounds, and a reopened bow could pass.
  - The gate's header states this bound (lines 45–46). AGENTS.md:107 says the grid "reads a part whose open ends line up" without it.
- **Fix:** aim lines at the open edges instead of relying on the grid.
  - `openAlong` already collects the edges borne by an odd number of triangles (`src/model/lib/check.ts:291-297`). Read two vertical lines just either side of each edge's projection, by `inwardAlong`'s rule.
  - My probe of this caught the open bow on 8 lines. It read nothing on the finished model: 157 shapes and leaves, 9,492 such edges.
  - Place the lines at an irrational share along each edge. At the midpoints, my lines ran along T-junction edges and reported false 7–12 m stretches.
  - At the least, state the bound in AGENTS.md and the spec.

**M2. The capital red-proof counts don't replay.** `src/model/lib/column.test.ts:126`, `AGENTS.md:107`, `docs/learning/defect-register.md:17`
- **Scenario:** all three places say 24 lines (round capital) and 36 (flat) at medium detail with one diagonal.
  - I removed `flattest` from `src/model/lib/acanthus.ts:107-108`. The repaired `inwardAlong` reads 29 and 40 lines.
  - 24 and 36 come from 453d0af's lines at cell centres, so F14's move invalidated them. The proof is still red, but the numbers are wrong (R19, R20).
- **Fix:** change them to 29 and 40 in all three places.

**M3. F12's "work folder" is ignored by git.** `.gitignore:154`
- **Scenario:** F12's disposition says "this folder, work unit 7", which is `tmp/facing/work7/`. It holds the plan, review round 0, the verify record and the render comparison that answers F3.
  - `docs/work/registry.json` stops at id 5. Removing the worktree would lose the record (R24).
- **Fix:** allocate an id and move the folder to `docs/work/<id>_<theme>/` before merging, with this round as review 1.

#### Nits

- **N1. Stale comment** at `src/model/closure.test.ts:258`: "so either side will do" describes the old rule. Now a face with its inside only in front fails. A part wound wholly inside out passes because its inside reads −1 in front against 0 behind, and the facing test catches it. Say that instead.
- **N2. The spec keeps both rules.** `docs/design/spec.md:78` still says "an inside lies on one side" beside the new "more inside behind it than in front". Merge them into the second.
- **N3. A vault message no input can satisfy** at `src/model/lib/dome.ts:246` (R26).
  - `barrelVault({ span: 4, length: 3, thickness: 0.02, detail: 'low', coffers: { across: 2, along: 1, depth: 0.01, rib: 0.49 } })` says "keeps -0.0188 m … or the coffers shallower than -0.0188 m".
  - When `room <= 0`, name only the thickness (0.0494 m here).
- **N4. Stale timings** at `AGENTS.md:77`: it says "2.3 to 2.8 s" and "names 6 of 650 tests".
  - There are now 669 tests. The upright test reads both sides of each point: 3.8 s run alone, 2.0 s in the full suite. The new grid test takes 1.3–2.0 s.
  - In my full run, 8 tests go over a sixth of 5 s. Re-measure the numbers or date them.
- **N5. `flattest` on flat grids has no caller and no test** (`src/model/lib/builder.ts:151-160`). My probe shows it splits each quad the way the smooth path does, both ways round. Add that check as a test, or keep the option to smooth grids.
- **N6. One passing case the header doesn't name** (`src/model/closure.test.ts:20`). "The same inside on both sides" also passes a face wound in where its part touches another part of the same piece, face to face or within 0.1 mm (`BEHIND`).
  - On a fixture it reads 1 in front, 1 behind, and no failing points.
  - It is harmless for the walk and the cut, but "as within an overlap" doesn't cover it. Name it in the bound.

#### What I verified

- **Moved helpers:** byte for byte the same as the code removed from 453d0af's closure test, apart from `export`.
- **F0 (bow caps):**
  - The cap ring uses the same formula as three 0.186.1's `TorusGeometry` (`node_modules/three/src/geometries/TorusGeometry.js:74-84`), with float32 rounding.
  - The matrix goes through the same `applyMatrix4` call that `MeshBuilder.transform` uses, and `polygon` fans from its first corner (`builder.ts:80-88`).
  - Welded at 1 µm, the capped figure has 0 open edges; the open bow had 8. Every part's volume is positive, and no grid from 16 to 160 finds a pocket.
  - The figure is scaled 2.58 (`engelhard.ts:167`), which turns 0.2795 m in its frame into the reported 0.72 m.
- **F1:** with `sideQuads` reversed, only the upright test failed, on 22 shapes ("its inside in front"). The other 9 tests passed.
- **F2:** the soffit's front moves 1 cm back; its back end stays at `WALL_Z + SCREEN_Z + 0.05`.
- **F13:** `sweep.ts` and `core.test.ts` match `00eeee7`. Grids of 128 and 256 lines a side find no pocket in any shape or leaf.
- **F14:** Codex's three boxes give 10 bad lines under 453d0af's reading, 10 at cell centres without dedupe, and 0 after the repair.
- **F15:** the membrane reads −2.91e−11 against a noise bound of 0 before the repair, and 4.07e−4 after.
- **F16:**
  - Over 3,694 random coffered vaults, the rule matched the built geometry each time: every floor corner (`dome.ts:296,308`) checked against the outer face's chord above it. My probe's one apparent miss was its own misreading when depth ≈ thickness.
  - The thickness the message names holds within ±1 mm in every refused case.
  - Clearances: the Hunt soffit has 32.6 mm, Codex's case 18.4 mm.
  - The test goes red with one share for every corner. With the old shells and the refusal off, 58 lines plus 2 grid shapes go red.
- **AGENTS counts:** 870 shapes, 16,766 pieces, 27,043 pieces in all, and 4,726 shape parts plus 48 leaf parts.
- **Gates:** all 669 unit tests pass in a scratch copy of HEAD. Typecheck and ESLint are clean in the worktree. No file is over 500 lines.

The reviewer left its probes in its own scratchpad (path redacted).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F17 | The vault refusal reads only the coffers' floors' corners; their openings' corners stand out of a shell thinner than its facets' sag, which builds with 5,871 inward lines (Codex 1, major) | Accepted | The refusal reads the openings' corners too and names the thickness alone where no depth helps; Codex's case as a regression, red with the openings unread |
| F18 | Without its edge merging, a line meeting an edge two triangles share counts both: two boxes read a 2 m pocket along a direction a hair off vertical (Codex 2, minor) | Accepted | A line with a hit within EDGE of its triangle's edge is cast again a hair aside (ASIDE), up to four tries, over each cell's own triangles; Codex's boxes as a regression, red without the recast (1 line) |
| F19 | A level membrane reads −4.6e−13 against a noise bound of 4.6e−22: heights are averaged before the reference is taken off, and the bound leaves out the heights' rounding (Codex 3, minor) | Accepted | Heights levelled before averaging; the bound adds a billionth of the faces' heights times their areas; Codex's membrane as a regression, red unlevelled |
| F20 | The thickness the refusal names rounds down to one that still throws (Codex 4, nit) | Accepted | The thickness rounded up and the depth down; the test builds with both |
| F21 | The upright test's comment still says either side will do (Codex 5, nit; Claude N1) | Accepted | It says what passes and what the facing test finds |
| F22 | The capital red proof reads 29 and 40 lines, not 24 and 36, since the grid's lines moved (Codex 6, nit; Claude M2, minor) | Accepted | 29 and 40 in the test, AGENTS and the register, replayed |
| F23 | The grid caught the reopened bow on one line, and 48 of 145 grid sizes miss it (Claude M1, minor) | Accepted | `inwardAlong` reads two lines beside each open edge (BESIDE, ALONG): the open bow now on 9 lines, and a fixture of it at a grid of 4 found only by them, red without them; the bound is stated in AGENTS and the spec |
| F24 | The work folder named in F12 is ignored by Git (Claude M3, minor) | Accepted | Work unit 7 is allocated (`docs/work/7_faces-out/`); the plan and both records land with the work |
| F25 | The spec keeps the old upright rule beside the new (Claude N2, nit) | Accepted | One rule: the inside behind each upright face |
| F26 | The vault message can name a negative depth (Claude N3, nit) | Accepted, with F17 | Where no depth helps, the thickness alone |
| F27 | AGENTS' headroom timings are stale (Claude N4, nit) | Accepted | Dated: the check named 6 of 650 tests on 2026-10-28 |
| F28 | `flattest` on flat grids has no caller and no test (Claude N5, nit) | Accepted | `src/model/lib/core.test.ts` reads it on a quad raised at either corner, smooth and flat, either way round |
| F29 | The upright reading also passes a face wound in that lies face to face on another part of its piece (Claude N6, nit) | Accepted | Named in the gate's header and its bound |

## Verification

`npm run verify` passed with `MET_PORT=5348` on the repairs: 73 files and 673 unit tests, typecheck, lint, build and 84 e2e tests in 13.5 min. The repairs' red proofs, each defect put back in turn: the openings unread (Codex's vault no longer refused), the recast taken out (Codex's tilted boxes, 1 line), the heights averaged before levelling (Codex's level membrane, 4.6e−13 against a bound of 4.6e−22), the lines beside open edges left out (the open bow's fixture at a grid of 4, no line), and on the finished model the bow left open (9 lines, 0.74 m) and the leaves split along one diagonal (the capital test's 29 and 40 lines, the gate's lines 2 and its grid 3 shapes). No geometry of the model changed, so the shots of review 0 stand.

## Round outcome

Codex found one major, the vault's openings, and both lanes' other findings are minor or nits; every one is repaired. The repairs go to review 2.
