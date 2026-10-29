# Review 3: the repairs of review 2

## Target

Work unit 6 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `3165aa5`, the diff `dc1a7dc..3165aa5` (10 files, 118 insertions and 82 deletions), the repairs of review 2's findings F23 to F32.

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same focused prompt (`tmp/review-runs/w6-r3/prompt.md`, ignored): each repair against its finding, the notched wall ends, the pendentives' new arch points, the roof's plaster rim, `upright`'s width test, and the docs' claims and numbers. The diff came on stdin, and nothing edited the worktree while they ran. Raw captures stay under the ignored `tmp/review-runs/w6-r3/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. It ran tsc, ESLint, `git diff --check`, 57 test callbacks in an in-memory loader, and geometry and mutation probes. It left the worktree clean.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. Its result's one model key is the pin. It ran the closure, crossings, wall and dome tests, the full unit suite, tsc and ESLint, and probes; it wrote only in its scratchpad.

## Reports

### Codex (`gpt-6-astra`)

Found **one major and four minor issues** in `3165aa5`.

1. **Major — A collapsed triangle bypasses the sheet gate.** [closure.test.ts:202](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:202) evaluates `0 < 0` as false when all three vertices coincide, so `faceAcross` treats that triangle as a crossing face. I added an undeclared, two-sided vertical rectangle plus one collapsed triangle in memory: **all six closure tests passed**. Removing the collapsed triangle makes `faceAcross` reject it. Skip degenerate triangles in `faceAcross`; add fixtures for collapsed geometry and an upright membrane containing a collapsed triangle.

2. **Minor — `upright` does not measure the documented projected width.** [closure.test.ts:204](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:204) divides projected area by the longest **3D** edge. For `(0,0,0)`, `(.001,20,0)`, `(0,0,1)`, the projected width is approximately **1 mm**, but this calculation reads **0.05 mm**, classifying it as upright. A closed tetrahedron adding `(.001,20.01,1)` passes `openAlong` yet is incorrectly required to be a sheet. Measure against projected edge lengths, handling zero-area projections explicitly.

3. **Minor — Boundary channels lose their end faces.** [wall.ts:318](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/wall.ts:318) clamps the end outline to `[0,H]`, while the channel’s other faces remain unclamped. An accepted wall with width `4`, height `3`, thickness `.6`, and rustication `{start:0, stop:0, course:.7, joint:.2, depth:.1}` extends to `Y=-.1` but has no end covering that extension. Rays along X at `Y=-.05, Z=-.05` miss both ends; the base revision supplies faces there. Centering the channel at `Y=3` reproduces this above the top. Clip all channel geometry consistently, or reject bands extending beyond the wall.

4. **Minor — Two mutation counts still describe the four-point gate.** [closure.test.ts:27](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:27) and [AGENTS.md:108](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/AGENTS.md:108) retain **30** missing-inside points for the pier core and **288** for the moon-gate panel. Reintroducing those defects produces **38** and **504** with seven points. Restoring four-point sampling reproduces the documented numbers exactly. Update them or explicitly label them as historical four-point measurements.

5. **Minor — The gate header retains F27’s unconditional assurance.** [closure.test.ts:17](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:17) still says “a walker built into a piece is found,” without the crossing-edge exception added to the spec. The new fixture demonstrates the contrary for the 1.2 m overlap. Add that exception to the header’s stated bounds.

The ordinary wall-end cases passed, including bands whose edges exactly touch the foot/top and walls without rustication. Pendentive seams matched on all four sides at every detail level; all four plaster rims matched the fascia vertices exactly. The current totals—870 shapes, 16,766 pieces, 10,028 sheets, 53 pairs and 56,168 lines—matched.

Read outside the diff included the repo contracts, local rules and lessons; [builder.ts:94](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/builder.ts:94), `check.ts`, `walker.ts`, `cap-pass.ts`, sheet/BVH helpers, relevant builders and existing tests.

Ran TypeScript, scoped ESLint, `git diff --check`, and **57 existing test callbacks using real Vitest assertions through an in-memory loader**, plus geometry and mutation probes. All baseline checks passed; changed source files remain under 500 lines. Full Vitest, build, browser and visual checks were not run. No files were changed or created; the worktree remains clean.

### Claude (`claude-opus-5-5[1m]`)

No blocker and no major finding. Every repair (F23 to F32) resolves its finding, and I found no new defect in the geometry. There are two minor findings and two nits, all about records, docs and test coverage.

#### Findings

**1. Minor: two red counts in the gate's record are stale.**
- **Where:** `src/model/closure.test.ts:28` and `AGENTS.md:107`.
- **What is wrong:** both say the upright-face reading goes red at "30 points" with the piers' core left with no top and no bottom, and at "288" with the moon gate panel's foot, top and ends left out. Those counts were taken at four points per face. The reading now tries seven.
- **Evidence:** I put each defect back on the model's own geometry and ran the test's own reading with each point set.
  - The pier from `memo('hallPier')`, with the core box's top and bottom triangles dropped (16–19, at y 3.6 and 0.45): 30 with `LINES` (the record's number), 38 with `UPRIGHT_POINTS`.
  - The moon gate panel with its last 8 triangles dropped: 288 with `LINES`, 504 with `UPRIGHT_POINTS`.
  - The new pendentive count is right: 8 at seven points, 0 at four.
- **Failure:** anyone re-running those red checks gets 38 and 504, and can't tell a changed gate from a broken one.
- **Fix:** write 38 and 504, or mark the two counts "at four points".

**2. Minor: `upright` does not measure the width its docs describe.**
- **Where:** the code is `closure.test.ts:201-205`. The claim "less than 0.1 mm (BEHIND) wide" is at `:20`, at `:198` and in `AGENTS.md:107`.
- **What is wrong:**
  - The code compares twice the face's projected area with BEHIND times its longest edge in 3D. The width vertical lines actually see is that area divided by the longest *projected* edge. So the code calls faces upright that are up to (longest edge ÷ longest projected edge) times wider than 0.1 mm.
  - It also calls a face whose three corners coincide "not upright", because `0 < 0` is false, though vertical lines see it as 0 wide.
- **Evidence at t = N:**
  - 1,615 faces pass `upright` although vertical lines see them 0.1 mm wide or more.
  - The widest is great-hall-balcony/limestone face 488: a sliver 22 mm at its base, 2.92 m tall and 0.22° off vertical, seen 10.2 mm wide.
  - For a point-sized face, the old `faceAcross` returned "not across" (`0 > 0`); it now returns "across".
- **Failure:**
  - A shape whose faces all stand upright, plus one point-sized triangle, would now pass "declare every surface standing upright a sheet". No such triangle exists in the model today.
  - Nothing else passes falsely: `faceAcross` changes for no shape, and the reading only gains faces (2,190 more read, none dropped).
  - BEHIND is in each geometry's frame, so a piece scaled 99× sees it as 9.9 mm. `AGENTS.md` names the frame only for `openAlong`'s tolerances.
- **Fix:**
  - Either divide by the longest projected edge and treat a zero-length projection as upright, or keep the stricter measure and state it in the docs, with point faces upright.
  - In both cases, name the frame in `AGENTS.md`.

**3. Nit: the pendentive repair has no check of its own.**
- **Where:** `src/model/lib/dome.ts:186` and `dome.test.ts:56-64`.
- The model-wide reading catches the old spandrels at `low` and `medium` (8 points each) but not at `high`. There it reads 0 points although 160 edges are unshared.
- `dome.test.ts` checks soundness, back faces and the bounding box, not shared edges.
- `across / 2 + 1` assumes `across` is even (it is 6, 12 or 20). An odd value would silently end the arch short of the corner.
- **Fix:** add a welded-edge parity check at all three detail levels to `dome.test.ts`. My probe gives 48/96/160 odd edges for the old geometry and 0/0/0 for the new. Also note or check that `across` must be even.

**4. Nit: the notch's clamps cover a case the rest of the wall does not handle.**
- **Where:** `src/model/lib/wall.ts:318`, and `wallSpec` at `:256-266`.
- `Math.min(H, …)` and `Math.max(0, …)` clamp only the end's outline. `wallSpec` accepts a band past the foot or top, but the front strips and channel faces aren't clamped, so the end would no longer meet them.
- A band exactly at the foot or top still closes, with exact end areas (1.970 and 1.495 m²). But earcut leaves 2 to 4 unused vertices, and the channel's floor or ceiling then lies back to back on the foot or top.
- No caller has such a band: every channel starts at least 0.52 m above its foot and ends at least 0.25 m below its top.
- **Fix:** refuse such bands in `wallSpec` and drop the clamps.

#### The repairs, each checked
- **F23:**
  - The new arch points equal the curved faces' first-row points on all four sides and at all three detail levels: 0 unshared edges after welding to 1 µm.
  - The seven point weights each sum to 1.
- **F24:**
  - The plaster's corners lie on the hip lines.
  - Its outer rim coincides exactly with the fascia's inner face, back to back.
  - No plaster face lies on a lead face facing the same way (0 found; 24 back-to-back pairs).
  - Both geometries are closed along vertical lines.
- **F25:**
  - The new fixture fails on the old `new Uint8Array(n)`.
  - Nothing queries `crossings` on a `buildPieces` world today: `door-world.ts:125` goes to the static world.
- **F26:** `meets` keeps the old "crosses" and "encloses" logic and reads no inside in a sheet.
- **F27:** the crossings are [0, 1.2, 1.2], an odd count, so the walker is kept as the spec now says.
- **F29:**
  - The coffers are 0.10 − 0.06 and 0.12 − 0.08 deep beyond their shells, so 4 cm each (`arches.ts:112`, `hall-vaults.ts:46`).
  - I also checked the armor court's lunette vault, whose signed volume is −245.5 m³. It is wound outward (from above, its top faces look up and its intrados looks down). The negative volume comes from its open sides and ends, so it is not an unlisted inside-out part.
- **F30:**
  - Both ends face out, because `planar` always faces `axisU × axisV`.
  - Walls without openings have 0 unshared edges, and each end's area equals thickness × height less each channel's depth × joint.
  - The same holds with no joints and with no rustication.
  - Two-sided membranes now occur only at channel ends against reveals (9 shapes, all rusticated walls with openings).
  - The cut text matches the cap material (`BackSide`, offset −4).
- **F31:** resolved in effect, since every face narrower than BEHIND is now read; see finding 2.
- **F28 and F32:**
  - These numbers are confirmed: 870 shapes, 16,766 pieces, 56,168 lines, 10,028 sheets in 53 pairs, and a worst overlap of 0.755 m.
  - The 30 and 288 are stale (finding 1).
- **Repo rules:** all files are under 500 lines (`collision.ts` is at 499), and the diff contains no unrelated rewrites.

#### Read outside the diff
- `docs/design/spec.md`
- `src/model/lib/builder.ts:89-118` (`planar`)
- `src/walk/walker.ts:45-49` and `:160-193`
- `src/walk/door-world.ts:84-126`
- `dome.test.ts` and `wall.test.ts`
- `src/model/core/medieval-hall.ts:64-88`
- `src/model/mmw/astor-court.ts:47-83`
- `src/model/mmw/armor-court.ts` and `src/model/mmw/lunette-vault.ts`
- `src/model/hunt/walls.ts`, `podium.ts`, `hall-vaults.ts` and `arches.ts:112`
- `src/model/mmw/facade-parts.ts` and `src/model/roche-north/bank.ts`
- `docs/work/5_closed-pieces/plan.md`

There is no `docs/work/6_*` folder, so I worked from the brief's summary of F23 to F32.

#### Ran
- The closure, crossings, wall and dome tests: 36 passed.
- The full unit suite: 70 files, 636 tests passed.
- `tsc --noEmit` and `eslint` on the 8 changed source files: both clean.
- Five probes, run through vitest with a config rooted at the worktree, kept in its scratchpad (path redacted for this record). `git status` is still clean.
- **Not run:** e2e tests, the build, and render shots. The notched ends, the eaves' lead strip and the spandrels all change visible geometry, and no renders were compared.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F33 | A triangle whose corners coincide reads "not upright" (`0 < 0`), so a shape all of whose other faces stand upright passes the upright-sheet check (Codex 1, major; Claude 2) | Accepted. No such triangle is in the model | `upright` holds a face that is a point or a segment in plan upright |
| F34 | `upright` divides by the longest edge in 3D, not in plan, so it calls faces up to 10.2 mm wide in plan upright, 1,615 at t = N (Codex 2; Claude 2, minor) | Accepted | The width is the area in plan over the longest edge in plan; the gate's header and AGENTS.md name the geometry's frame |
| F35 | A channel band past the wall's foot or top loses its end faces: the end's outline is clamped and the channel is not (Codex 3; Claude 4, minor) | Accepted. No caller has such a band | `wall` refuses one, naming its span and the wall's height; the clamps are gone |
| F36 | The red counts 30 and 288 are the four-point gate's; seven points give 38 and 504 (Codex 4; Claude 1, minor) | Accepted | Updated in the gate's header and AGENTS.md |
| F37 | The gate's header still says a walker built into a piece is found, without the crossing rule's bound (Codex 5, minor) | Accepted | The header names it |
| F38 | The pendentive repair has no check of its own, and the model-wide reading misses the old spandrels at high detail (Claude 3, nit) | Accepted | `src/model/lib/dome.test.ts` reads the pendentives' seams at every detail, each edge borne by an even number of faces once welded to 1 µm; red with the old spandrels: 48, 96 and 160 |

## Verification

`npm run verify` passed with `MET_PORT=5348` on the repairs before the direct check of `upright` was added: 70 files and 637 unit tests, typecheck, lint, build and 84 e2e tests in 12.7 min. With that check, at `c73e52e`, the unit suite (638 tests), typecheck, lint and build passed again; the check is red with the old formula, and the seam check red with the old spandrels (48, 96 and 160). No shots were taken: the wall's notched ends are the same for every band inside the wall, and nothing else here reaches the model.

## Round outcome

Codex's one major (F33) is a gate bypass by a degenerate triangle, absent from the model; it and the minors are repaired as the reviewers proposed. A focused review of these repairs follows as round 4.
