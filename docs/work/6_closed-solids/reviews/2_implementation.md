# Review 2: the repairs of review 1

## Target

Work unit 6 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `dc1a7dc`, the diff `7c11ada..dc1a7dc` (16 files, 310 insertions and 78 deletions), the repairs of review 1's findings F12 to F22.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt (`tmp/review-runs/w6-r2/prompt.md`, ignored): whether each repair resolves its finding without a new defect, the fourth reading's exemption, ray start, offset and hit merging, the builder repairs, the sheet flag's producers and consumers, the stretch factor, the docs' claims and numbers, and the repo's rules. The diff came on stdin, and nothing edited the worktree while they ran. Raw captures stay under the ignored `tmp/review-runs/w6-r2/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker; its one attempt to hand a part to a subagent failed, so it reviewed alone. It ran tsc, ESLint and `git diff --check`, 66 test bodies in an in-memory loader, the red proofs again, and probes of 40 seeded points per upright face. It left the worktree clean.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It ran the full unit suite, tsc and ESLint on a copy in its scratchpad, and probes; it wrote only in its scratchpad.

## Reports

### Codex (`gpt-6-astra`)

I found **five minor issues and one nit** at `dc1a7dc`. No blocker or major defect was established.

1. **Minor — F17’s four samples miss an existing unbacked face patch.**  
   [closure.test.ts:348](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:348) passes the Great Hall pendentive’s triangle 817, but at geometry-space point **(8.255000114440918, 8.15, 1)**, `windingAbove` returns zero on both sides and `backed` returns false. All four prescribed samples pass. A nearby sampled point lies about **4.2 cm below** the underside that would provide its inside. The outer faces and curved surface use different subdivisions in [dome.ts:186](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/dome.ts:186).  
   This demonstrates a realistic gap in the new gate, beyond numerical tolerance. Pin this point, align the pendentive boundaries, and strengthen coverage near triangle edges or narrow the universal “each upright face” claims. The pendentive defect predates this diff.

2. **Minor — The fascia introduces competing lead and plaster undersides.**  
   [roof.ts:71](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/hunt/roof.ts:71) adds the fascia bottom over the unchanged plaster slab returned at line 75. At **X=0, Z=−1.21**, their downward-facing surfaces are at Y=**22.505976654** and **22.505976984**: only **0.33 µm apart**, with different materials. Other eaves also reproduce this.  
   Views from below therefore have competing surfaces and a z-fighting risk; I did not render this artifact. Trim the plaster to the fascia’s inner boundary so each exposed area has one material.

3. **Minor — `buildPieces()` loses the sheet mark.**  
   [collision.ts:228](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/walk/collision.ts:228) allocates zero-filled flags without reading `isSheet(geometry)`. The same declared two-pane geometry returns `sheet: true` through `build()` and **`sheet: false`** through `buildPieces()` followed by `move()`.  
   This producer violates the new `LineCrossings` contract. Current door settling avoids the consequence because `DoorWorld.crossings()` delegates only to the static world. Populate these flags from the geometries and test both construction paths.

4. **Minor — Collection placement still invents an inside for sheets.**  
   [placement.test.ts:314](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/collection/placement.test.ts:314) ignores `c.sheet`. For a declared sheet containing horizontal panes at **Y=1 and Y=3**, an artwork spanning **Y=1.5–2** produces `through: false` but **`within: true`**. The gate reports enclosure despite neither pane touching the artwork.  
   Guard the inside predicate with `!c.sheet`; retain surface-crossing checks. Add a fixture for an object clear between sheet surfaces.

5. **Minor — The unconditional settle guarantee remains false.**  
   [spec.md:133](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/docs/design/spec.md:133) says a walker built through by a solid “is found,” despite the newly documented shared-edge exception. Using the existing overlapping-box fixture with both boxes only **1.2 m tall**, at **X=Z=0.5**, crossings are `[0, 1.2, 1.2]`. With an existing floor, `settle(1)` returns **`kept`**, leaving the walker embedded. The overlap is shorter than 1.749 m.  
   Qualify the guarantee with the crossing-rule exception, or repair the crossing ambiguity and add this short-overlap settle regression.

6. **Nit — The documented line count is stale.**  
   [AGENTS.md:107](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/AGENTS.md:107) says **56,136**; HEAD executes **56,168**. Update it. The other totals reproduce: **870 shapes, 16,766 pieces, 10,028 sheet pieces, 53 pairs**.

The stretch factor is correct for invertible affine transforms, including mirroring, shear and rotation; the maximum over walked instances suffices for the walk-overlap bound. `reach = 3r + 1` safely exceeds the geometry’s diameter regardless of its translation. I found no demonstrated misuse of `backed` on the current model, but its pointwise exemption and the four samples do not establish whole-face coverage.

I read the requested contracts, all changed files, and supporting code including [bvh-cache.ts:20](C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/walk/bvh-cache.ts:20), `builder.ts`, `check.ts`, `door-world.ts`, collection placement, pendentives, medieval piers, roof placement, section-cut materials and relevant tests.

Verification performed:

- TypeScript `--noEmit`, ESLint and `git diff --check`: passed.
- **66 existing test bodies** executed through a Node 24 in-memory harness: closure, crossings, settle, wall/window/surround, routes and repository conventions—all passed. This was not a full Vitest run.
- In-memory mutation proofs reproduced **30** uncapped-pier failures, **288** moon-gate failures, **2.265428 m** stretched-medallion overlap, **19 shapes/10 pairs** for undeclared window panes, and the sheet-settle regression.
- Additional geometry probes included 40 seeded samples per upright triangle.
- Build, browser/E2E and rendered visual checks were not run. Delegation was unavailable because the agent service failed to initialize.

No repository files were changed. The worktree remains clean; no browser or server was launched.

### Claude (`claude-opus-5-5[1m]`)

No blockers or majors. The diff resolves F12, F13, F15 and F17 as described. I found five minor problems and some nits: one new z-fight at the Hunt roof's eaves, an open finding the docs describe wrongly, cut-colour patches on the new back-to-back faces, a gap in the new upright-face reading, and one stale number in AGENTS.md.

#### Minor

**m1. The new fascia's bottom lies on the plaster slab's bottom, so the two z-fight all round the eaves.** `src/model/hunt/roof.ts:71`, `:75`
- **What:** the fascia's bottom (lead, 0.3 m down, facing down) lies in the same plane and faces the same way as the plaster slab's bottom. The slab (`slab(LEAD, ROOF_DEPTH, null)`) still runs all the way out to the eaves. The fascia's top also lies on the plaster's top, but that one is hidden under the lead skin.
- **Evidence:** a probe found 16 lead triangles lying on plaster triangles that face the same way, 9.26 m² in all. About 4.6 m² of that is the visible underside, for example at (−10.667, 22.508, −1.213). At 7c11ada the lead had no face at that depth.
- **Failure:** a strip 2.0 to 2.14 cm wide flickers between lead and plaster along the whole 193 m of eaves. It is rarely in view: you only see the underside from below 22.5 m, near the wing roofs.
- **Fix:** start the plaster slab at the fascia's inner edge (`inward(k)`). Give the slab an eaves face back to back with the fascia's inner face, so no face is doubled.

**m2. The docs call `barrelVault`'s coffered vaults "wound wholly inside out", which is wrong.** `docs/design/spec.md:78`, `AGENTS.md:107`, `src/model/closure.test.ts:15-16`, `:32`, `src/viewer/section-cut.ts:15-16`
- **What:** `barrelVault` winds its faces outward. The problem is two soffits whose coffers are deeper than their shells:
  - `hunt/arches.ts:112`: shell 0.06 m, coffers 0.1 m.
  - `hunt/hall-vaults.ts:46`: shell 0.08 m, coffers 0.12 m.

  So each coffer floor (`dome.ts:285`) sits 4 cm outside the vault's outer surface (`dome.ts:242`). The pockets that stick out are bounded by faces looking inward.
- **Evidence:** across the model, the only shapes where the topmost face on a sampled line looks down are:

  | Shape | Lines read inside out |
  |---|---|
  | hunt-arches/limestone | 20 of 84 |
  | great-hall-arches/huntHallStone | 16 of 77 |
  | armor-court-vault/limestone (the gables, wholly inside out) | 22 of 22 |

  The balcony vault is also a coffered `barrelVault` (`hall-vaults.ts:40`), with 0.09 m coffers in a 0.4 m shell. It reads 0 of 351 grid lines inside out, against 225 of 351 for a soffit-like vault.
- **Failure:** whoever picks up this open finding will look for a winding bug in `barrelVault`, which has none. Meanwhile `barrelVault` still accepts coffers deeper than its shell.
- **Fix:**
  - Describe the defect as coffers deeper than the shell in those two soffits.
  - Have `barrelVault` refuse `coffers.depth >= thickness`, with a message naming both values.

**m3. The new back-to-back faces show the cut colour from both sides, and the bound in `section-cut.ts` understates this.** `src/model/lib/wall.ts:307-310`, `:305`, `src/viewer/section-cut.ts:17-19`
- **What:** the cap pass draws every back face of any piece the cut plane crosses, 4 depth steps nearer. Where two faces are back to back, the back of one beats the front of the other from either side. So every such pair below the cut shows the cut colour, not just "a membrane the plane passes through".
- **What the diff adds:** a probe comparing 7c11ada with HEAD on fixtures shows two new sets of these pairs:
  - one at both ends of every channel band in every rusticated wall;
  - one at the jambs of blind niches.

  Through-opening jambs already had them, so nothing changes there.
- **Failure:** with the cut on, the cut colour would show in patches the size of each channel's section (9 × 8 cm on the Hunt walls, 4.5 × 3.5 cm on the bank). It would show at each band, from outside an exposed wall end or from inside a niche. I did not render this; it follows from the cap pass's rule. How much of it is visible depends on which wall ends are exposed; the bank's ground storey (`roche-north/bank.ts:72-78`) is a candidate.
- **Fix:** either notch the wall's end face and the niche's reveal strip over the channel instead of backing them, so the stone closes without such pairs, or reword the bound to say this happens to every such pair below the cut, from either side.

**m4. The 1e-6 test for "upright" is finer than float32 rounding, which leaves a gap.** `src/model/closure.test.ts:203`, `:345`, header `:28-32`
- **What:** a face tilted more than 1e-6 is not treated as upright. The fourth reading skips it, and `faceAcross` counts it as a face that is not upright. But `openAlong` joins open edges nearer than 0.1 mm. So a part with no top and no bottom, made of faces tilted by τ and up to 1e-4/τ tall, passes all four readings.
- **Evidence:** 25 shapes have faces tilted between 1e-6 and 1e-3. Examples: the great-hall piers up to 2.4e-6, the grand-stair arcades 1.51e-6, the roof-glass frames 3 to 6.5e-6. These are faces meant to be upright, tilted by rounding; at 2.4e-6 the gap covers parts up to 41 m tall.
- **Today:** none of those faces is missing an inside, even when treated as upright, so nothing escapes now.
- **Fix:** call a face upright when its width across the vertical lines is under 1e-4 in the geometry's frame, or name the 1e-6 limit in the gate's header and in AGENTS.md.

**m5. AGENTS.md's line count is stale.** `AGENTS.md:107` says 56,136 lines.
- A copy of the gate with one print added counts 56,168 at HEAD.
- The extra 32 come from the roof's lead shape: it went from 16 faces that are not vertical to 32, capped at 24, which is 8 more faces at 4 lines each.
- The paragraph's other numbers were updated; this one was not.

#### Nits
- **Door world:** `collision.ts:228` (`buildPieces`) never marks sheets. The door world's pieces include the door leaves' glass, which is now declared a sheet, so its crossings would report `sheet: false`. Nothing reads them today, because `door-world.ts:124` returns the static world's crossings. A one-line fix keeps the file at 499 lines: `Uint8Array.from(geometries, (g) => (isSheet(g) ? 1 : 0))`.
- **Placement test:** `collection/placement.test.ts:314` reads an inside in a sheet by parity, unlike settle. A paving sheet crossed once under an artwork would be reported as enclosing it. No result is wrong today; adding `!c.sheet &&` there fixes it.
- **Messages:**
  - `closure.test.ts:352` reports the first point with no inside in the geometry's own frame, while the message beside it gives world X and Z.
  - `:413` names the place of the piece that was measured, not the stretched piece the overlap was scaled to.
- **Untested repair:** no check fails without the new wall-end and niche-jamb faces. Run against the 7c11ada wall, the fourth reading finds 0 bad points on the plain, window, door and niche fixtures. It does catch the bogus faces at arches that the diff removed (32, 8 and 24 points on the arch, segmental and arched-door fixtures).
- **Wording and style:**
  - `section-cut.ts:19` is a comment line of about 200 characters in a block wrapped at about 150.
  - `crossings.test.ts:9-10` is wrapped unevenly.
  - `crossings.test.ts:125` still calls an undeclared face "a sheet".
  - `spec.md:78`: "in any of its pieces" should say walked pieces.
  - `spec.md:78`: "a part needs a top and a bottom as well as sides" reads as if sides were required; `hallRoof().under` has no eaves face.
  - `roof.ts:49` and `:65` define the same `lower` helper twice.
- **Process (R24):** there is no `docs/work/6_*` folder (and no id 6 in the registry) holding the plan or review rounds 0 and 1. There is also no devlog line for the change to how settle reads sheets.

#### Checked and correct
- **F12:**
  - The sheet flag is set per instance (`collision.ts:195`) and read in `settle` (`:169`) and `clearAt` (`:193`).
  - `CollisionWorld` is the only producer; typecheck passes with the new required field.
  - The only declared sheets crossed an even number of times are roof glass with overlapping panes (insides of 0.9 to 1.4 cm), so the behaviour change is limited to those.
  - Routes and reach never call `settle`.
- **F13:**
  - 1/|M⁻¹ŷ| is the right factor for any affine matrix: mirrored, sheared or turned.
  - The scaled overlap equals the overlap measured directly on the most stretched walked piece for every shape tried, with 0 mismatches.
  - The worst overlap is 0.755 m, at a Hunt medallion.
- **F15 and F17:**
  - These AGENTS.md numbers match: 870 shapes, 16,766 pieces, 10,028 sheet pieces in 53 pairs, the largest scale 99.10 (the Hunt foundations).
  - The moon gate red proof reproduces exactly (288 points).
  - `windingAbove` always starts its ray outside the geometry.
  - Counting faces above and below every upright-face point gives opposite results each time (437,432 readings), so the hit merging is consistent.
  - `backed` only excuses a face once both sides have been read as having no inside. Only rusticated walls rely on it: 5,373 points in 7 shapes.
- **Builder repairs:**
  - **Moon gate panel:** its faces look out. The new top sits under the coping, so only the ends newly show.
  - **Tympana:** each is a closed prism facing out, its back on the wall plane and its bottom on the cornice.
  - **Rusticated wall:**
    - Straight jambs get the same faces as at 7c11ada.
    - The stray vertical faces at arches and springs are gone.
    - Door and floor-niche sills are still skipped.
    - No faces are doubled, and every fixture reads closed.

**What I read outside the diff:** AGENTS.md and the spec; all of `collision.ts`, `walker.ts`, `wall.ts`, `surround.ts`, `roof.ts`, `astor-court.ts` and `cap-pass.ts`; `walk-mode.ts:300-345`, `door-world.ts:1-140`, `door-fit.test.ts`, `placement.test.ts:280-330`, `dome.ts:200-300`, `profiles.ts:43-67`, `arches.ts:100-130`, `hall-vaults.ts:40-63`, `armor-court.ts:255-291`, `wall.test.ts`, `settle.test.ts` and `bank.ts:66-82`.

**What I ran:** everything ran from the scratchpad, with caches there, and the worktree is unchanged:
- the gate and crossing fixtures (14 tests pass);
- the full unit suite (70 files, 635 tests pass);
- `tsc --noEmit` and eslint on the changed files (both clean);
- five probes;
- a copy of the gate with one print added.

The probes are in its scratchpad (path redacted for this record).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F23 | The fourth reading's four points per face pass a patch of the Great Hall pendentives' outer faces with no inside: their spandrels' arch runs on points apart from the curved faces' (Codex 1, minor) | Accepted | The spandrels' arch runs through the curved faces' first-row points (`src/model/lib/dome.ts`); the reading tries seven points per upright face, one near the middle of each edge too; red with the old spandrels (8 points). The gate's header names the points it tries |
| F24 | The fascia's underside lies on the plaster slab's, lead on plaster 0.33 µm apart, all round the eaves (Codex 2; Claude m1, minor) | Accepted | The plaster slab stops at the fascia's inner edge with its own rim (`src/model/hunt/roof.ts`), and the roof's two `lower` helpers are one |
| F25 | `buildPieces` drops the sheet mark (Codex 3, minor; Claude, nit) | Accepted | It reads each geometry's mark; the fixture reads the mark in a world of moving pieces |
| F26 | `placement.test.ts` reads an inside between a sheet's crossings (Codex 4, minor; Claude, nit) | Accepted | `meets` reads none in a sheet, with a fixture |
| F27 | "A walker that a solid is built through is found" is false on a line the crossing rule reads once: two overlapping parts 1.2 m tall keep a walker at X = Z = 0.5 (Codex 5, minor) | Accepted in part: the rule stays (F18) | The spec qualifies the claim with the line, and the fixture pins the case, the walker kept, as the rule's bound |
| F28 | AGENTS.md's line count is stale: 56,168, not 56,136 (Codex 6, nit; Claude m5) | Accepted | Updated |
| F29 | `barrelVault` is not wound inside out: two soffits' coffers are deeper than their shells (`hunt/arches.ts`, 0.06 m and 0.1 m; `hunt/hall-vaults.ts`, 0.08 m and 0.12 m), so each coffer stands 4 cm out of its vault, a pocket whose faces look in (Claude m2, minor) | Accepted | The spec, the gate's header, AGENTS.md and `section-cut.ts` say so; the open finding stays: a repair would have `barrelVault` refuse coffers as deep as its shell and change those soffits, which changes what renders |
| F30 | Faces back to back show the cut colour from either side, and the new wall-end and niche-jamb pairs add patches (Claude m3, minor) | Accepted in part | The wall's ends are notched at each channel instead of backed, so no pair stands there; jambs keep their pairs, through openings' as on main and niches' alike; `section-cut.ts` and the spec say a membrane in a cut piece shows the cut colour from either side |
| F31 | "Upright" at a 1e-6 tilt is finer than float32 rounding, so a part of faces tilted by rounding could pass every reading (Claude m4, minor) | Accepted | A face stands upright when vertical lines see it less than BEHIND (0.1 mm) wide, so a part too narrow for `openAlong` to see open is read by the fourth reading |
| F32 | Messages in the geometry's frame and naming the measured piece, a 200-character comment line, uneven wrapping, an undeclared surface called a sheet, "in any of its pieces", "a part needs … sides" (Claude, nits) | Accepted | Reworded: the upright check's first point in world X and Z, the overlap naming the piece it is scaled to |

The process note (no work-unit folder, no devlog line) is F16 and the devlog line that lands with the merge.

## Verification

`npm run verify` passed with `MET_PORT=5348` at `3165aa5`: 70 files and 636 unit tests, typecheck, lint, build and 84 e2e tests in 12.8 min. Red: the fourth reading with the pendentives' old spandrels (8 points), the sheet fixture with `buildPieces`' old flags, and the placement fixture. The shots at `3165aa5` (1,618,841 triangles and 746 meshes at t = N; build 257 ms, ready 2,661 ms cold) differ from `dc1a7dc`'s in 39 of 64 images, each changed region read at native resolution: the Great Hall's pendentives no longer show a sliver of window beside each arch (the balcony views and the hall spawn's), the channels run out in notches at the walls' exposed ends, and a few pixels of shadow and edge elsewhere. Against main's `8e6643c`, 55 of 64 differ.

## Round outcome

Neither lane found a blocker or a major. Every finding is repaired but F27 and F30, each in part with its bound stated and pinned, and F29, an open finding described correctly. The repairs are checked by the gate's red proofs, the full gate and the shots; a focused review of them follows as round 3.
