# Review 1: implementation and integration

## Target

Work unit 6 on the met repository's branch `claude/kind-brahmagupta-01cb19`: commit `7c11ada`, the diff `8e6643c..7c11ada` (45 files, 942 insertions and 267 deletions) against main's `8e6643c`, which holds work unit 5. It covers what came after review 0: review 0's repairs (`a9645bb`), the merge of work unit 5 (`aaef748`), and the widened gate with its docs (`7c11ada`).

## Reviewers and coverage

Both reviewers ran read-only on 2026-10-28 with the same prompt (`tmp/review-runs/w6-r1/prompt.md`, ignored): the gate's coverage of what the walk and the cut read, each reading's soundness and bound, the red proofs, the docs' claims (review 0's F11 among them), the sheets, the integration with work unit 5 and the repo's rules. The diff came on stdin. Raw captures stay under the ignored `tmp/review-runs/w6-r1/`.

- Codex CLI 0.163.0, `gpt-6-astra` at reasoning effort xhigh, sandbox read-only, ephemeral. Its log holds no DLL-failure marker. Its one attempt to hand a part to a subagent failed (`collab spawn failed`), so it reviewed alone. It cited files outside the diff's hunks; `src/walk/walker.ts:169`, checked, is the settle line it names at `7c11ada`. It ran a typecheck, ESLint and `git diff --check`, and the gate's and the crossing fixtures' test bodies in an in-memory loader, not Vitest. It left the worktree clean.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, tools Read, Glob, Grep, Task and git diff, log and show. The login check passed: the pin in its init event, no tools, no MCP servers, and one model key, the pin, in its result. While it ran, the session edited the worktree to repair Codex's findings, so files it read after that may show those edits rather than `7c11ada`; each of its findings is checked against both.

## Reports

### Codex (`gpt-6-astra`)

Reviewed HEAD `7c11ada` against `8e6643c`. Found **two major and three minor issues; no blocker**. No files changed.

1. **Major — declared sheets can still hold the walker “inside.”**  
   [glazing.ts:179](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/lib/glazing.ts:179) marks the combined hipped-skylight panes as a sheet, but collision results carry no sheet classification. [walker.ts:169](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/walk/walker.ts:169) therefore applies parity to them.

   Reproduced on the real Rockefeller skylight geometry at **X −96.29214558, Z −93.24792115**: its separately offset panes produce crossings at **21.73644528 and 21.76036191 m**. `isSheet` is true, yet `insideBetween(heights, 21, 22.75)` is also true. Adding this unchanged geometry above a support fixture makes `settle(1)` move the walker from **21.0 to 21.76036 m**.

   This contradicts the new “sheet never holds one inside” contract. The gate skips sheets after counting them, so it cannot detect this. **Fix:** preserve sheet classification through collision results and exclude sheets from inside tests while retaining their surface heights. Add a fixture with overlapping sheet panes and this real example.

2. **Major — grouping by geometry and vertical direction loses the scale needed for the overlap bound.**  
   [closure.test.ts:129](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:129) normalizes away scale; [line 237](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:237) measures only the first walked instance.

   Reproduced entirely in memory: multiplying the **second Hunt medallion’s Y scale by three** leaves it in the same shape group. All four gate tests still pass and report **0.75514267 m**. Applying the gate’s own winding calculation to that second instance measures **2.26542802 m**, exceeding `BODY.height - STANDING` (**1.749 m**).

   Thus two pieces sharing an ID demonstrably read differently for this check. **Fix:** keep geometric-parity grouping separate from dimensional checks. Measure overlap for every distinct vertical scale, or conservatively use the largest scale. Add this mutation as a red proof.

3. **Minor — the new unconditional cut guarantee is false for geometry the gate accepts.**  
   [spec.md:88](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/docs/design/spec.md:88) and [section-cut.ts:14](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/viewer/section-cut.ts:14) infer correct caps from vertical closure. Balanced winding also accepts a completely reversed solid, as the gate acknowledges.

   On the actual `armor-court-vault/limestone` piece at **X 52.44800053, Z −84.35800255**, crossings are **22.70490278 m facing down** and **21.01000023 m facing up**. A cut at **21.85745151 m** removes the former; the latter is rejected by the cap material’s `BackSide`. No retained back face supplies the promised cut colour there. This was a geometric sidedness check, not a GPU capture.

   This is an existing winding defect newly covered by an unconditional documentation claim. **Fix:** retain the winding limitation in the docs, or repair the winding and gate outward orientation separately from balance.

4. **Minor — true vertical surfaces remain undeclared and some still enter the cap pass.**  
   [grid.ts:313](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/site/grid.ts:313) leaves the excavation, curb and retaining-wall faces unmarked. They contain only vertical surfaces, so vertical closure passes vacuously.

   The inventory found **25 opaque capped pieces consisting only of vertical triangles**: one excavation piece, seven Vaux tympanum panels, sixteen banner pieces and one moon-gate surround. Unmarked transparent window and door panes also bypass `SHEETS`, although transparency already excludes them from caps.

   **Fix:** declare genuine surfaces and include them in `SHEETS`; close pieces intended to have thickness. The current count checks declarations, not whether every required declaration exists.

5. **Minor — the cited work-unit record is absent.**  
   [closure.test.ts:14](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/model/closure.test.ts:14) and `AGENTS.md:107` refer unresolved winding findings to `docs/work/6_closed-solids/plan.md`. That path is absent both from the checkout and HEAD’s tracked tree. No work-unit-6 review record is present there either.

   **Fix:** include the permanent plan/review evidence required by the repository rules, or correct the references to an existing record.

The removal of round 0’s F11 top-overlap caveat is justified. For example, `insideBetween([0, 0, 3, 3], 2.501, 4.25)` returns **true**: the equal-height top pair is detected when it lies inside the body span. The taller-overlap fixture correctly captures the remaining wholly-inside case.

Coverage tracing found no omitted **current door geometry**: all **17 door-world parts** and the geometries of all **six stand-in meshes** are represented. Removing geometry names and `CALLERS` does not recreate the former name-filter omission. Work-unit-5’s builder-specific checks remain. The pedestal underside, four wall-edge coincidences, pinched-notch fixture and actual Lehman outline passed focused checks.

Outside the diff I read the contracts, local rules and lessons, plus collision construction, [walk-mode.ts:341](/C:/Users/38909/Documents/github/met/.claude/worktrees/kind-brahmagupta-01cb19/src/walk/walk-mode.ts:341), `door-world.ts`, `doors.ts`, `cap-pass.ts`, `bvh-cache.ts`, `check.ts`, builder callers and work-unit-5 tests/records.

Validation:

- TypeScript, ESLint and `git diff --check` passed; changed source files remain within 500 lines.
- Executed the **four closure and seven crossing test bodies** through an in-memory TypeScript loader and `node:assert` shim—not the Vitest runner.
- Reproduced **897 shapes, 17,087 solid pieces, 9,707 sheets, 56,136 lines**, and **0.75514267 m** maximum sampled overlap.
- Restoring main’s crossing rule in memory reproduced **206 misread shapes** and **five failing crossing fixtures**.
- No build, full suite, browser or GPU checks ran. No task-owned processes remain.

### Claude (`claude-opus-5-5[1m]`)

No blockers. Two major findings: the gate can't see a part with no top and no bottom, and the model still has upright surfaces with no inside that the cut caps. Both make the new spec sentences stronger than what the gate checks. Every number and red proof in the header and AGENTS.md reproduces, and on F11 the new docs are right to drop the clause.

Partway through the review, uncommitted edits to 13 files appeared in this worktree from another session. Some of them look aimed at finding 2: `sheet()` on the banners, the Astor gate ring, and grid's curbs, walls and cuts. I reviewed HEAD 7c11ada only, reading through git and running everything on a `git archive HEAD` copy in the scratchpad. I changed nothing in the repo.

#### Major

**1. The gate reads a part with no top and no bottom as closed** (`src/model/closure.test.ts:20-23`, `src/model/lib/check.ts:274`, `docs/design/spec.md:78,88,133`)
- **What's wrong:**
  - When a part's top and bottom are both left out over the same footprint, their open edges line up seen along vertical lines and cancel out.
  - No vertical line crosses the part there, so by the parity rule it has no inside.
  - All three readings still pass it:
    - `openAlong` finds it closed; `src/model/lib/check.test.ts:39` pins "a tube with no top or bottom" as closed on purpose.
    - The walk's lines are drawn only through faces that aren't vertical.
    - The winding balances.
  - The header's bound doesn't name this case, yet the spec still concludes "so a walker that a solid is built through is found" and "so its cut never shows what lies under it".
- **Evidence:** I put the medieval pier core back to its state before this branch (`src/model/core/medieval-hall.ts:69` with `['-y', '+y']`). The gate stays fully green: 0 shapes open, 0 misread, 0 lines unbalanced, worst overlap 0.755 m.
- **Failure scenario:**
  - The pier core between 0.45 m and the arcade springing reads as outside.
  - A walker built into it there is not found, and a cut through it shows the base's top instead of the cut colour.
  - The branch's own fixes of this kind (pier core, chair legs, balustrade posts) have no guard. The chair legs only turn red because the plaza pieces tilt 1%, which pulls the two edges apart.
- **Fix:**
  - Add a reading this case can't pass. One option: each upright face must have the shape's inside, by winding, about 1 mm behind it. That catches tubes and upright shells and ignores faces left out where parts meet.
  - An `openAlong` along a tilted direction would also work, but it flags the 42 capped shapes that are open sideways too.
  - At the least, name the case in the header, AGENTS.md and the spec, and drop the "so" sentences.

**2. Upright surfaces with no inside are still treated as solids, and the cut caps them (item 4)** (`src/model/site/grid.ts:313`, `src/model/mmw/armor-figures.ts:102-104`, `src/model/mmw/astor-court.ts:97`, the Vaux west front's brick panels; the claims at `spec.md:78,88` and `src/viewer/section-cut.ts:13-14`)
- **What's wrong:** 34 meshes the walk or the cut reads have only vertical faces. The gate counts them closed with zero crossings, and none is declared a sheet.
- **The capped ones:**
  - the excavation faces (`site-terrain/siteExcavation`, 2,764 triangles, 12,363 m², from −2.44 to 8.93 m);
  - the Arms and Armor court's 16 banners: two faces 4 cm apart with nothing at top, bottom or edges, 11.27 to 14.57 m;
  - the Vaux west front's 7 brick tympanum panels, each a single face;
  - the Astor Court gate ring (`mmwPavingGrey`, a single face, 10.84 to 13.60 m).
- **Walked only:** the site's curbs and retaining walls, and about 25 upright glass panes.
- **The other half of item 4:** no solid is declared a sheet. Every `SHEETS` entry is glass or ground, and a merge only becomes a sheet when all its parts are sheets.
- **Failure scenario:**
  - The Second floor view (cut at 12.7 m) passes through all 16 banners and the gate ring; the Ground and Main views pass through the excavation faces.
  - The cap pass draws their back faces in the cut colour, and a straight-down cut sees the floor through each banner's 4 cm gap.
  - That contradicts "the pass leaves out the sheets, surfaces with no inside", and `SHEETS` undercounts the sheets.
  - I computed this; I didn't render it.
- **Fix:** declare them sheets or close them, and count them in `SHEETS`. Finding 1's new reading would catch the next one.

#### Minor

**3. Overlap is measured on one piece per shape** (`src/model/closure.test.ts:237-265`; `spec.md:78`)
- **What's wrong:** a shape is keyed by the direction of world vertical in its frame, not by its length. Pieces stretched to different heights therefore share a shape, and only the first one walked is measured.
- **Evidence:**
  - 39 shapes have pieces stretched to different heights.
  - The park tree trunks read 0.429 m on the first piece and 0.592 m on another.
  - The Engelhard court artwork goes from 0.147 to 0.278 m, and the Greek court one from 0.187 to 0.254 m.
  - The worst across every piece is still 0.755 m, so nothing fails today.
- **Fix:** scale the first piece's worst overlap by the largest height stretch among the shape's walked pieces (max |M₀⁻¹ŷ| / |Mᵢ⁻¹ŷ|), or measure on the tallest piece. Then say so in the bound.

**4. The crossing rule merges hits from different parts** (`src/walk/collision.ts:482`; its comment at `:449-450`; `spec.md:133`)
- **What's wrong:** the code merges any on-edge hits at one height that face the same way. It never checks that the two triangles actually share the edge, though the comment and spec say "triangles of one surface share".
- **Evidence:** on the crossings fixture's own overlapping boxes (`src/walk/crossings.test.ts:143-150`), the line through (0.5, 0.5) runs along both bottoms' diagonals and reads `0, 3, 3`, an odd count. The fixture's line through (0.3, 0.1) reads `0, 0, 3, 3`.
- **Consequence:** "a closed piece is crossed an even number of times" is false on such lines, and a walker standing exactly there isn't found.
- **Fix:** merge only hits whose triangles share an edge, and add the (0.5, 0.5) line to the fixture.

**5. "A sheet never holds one inside" isn't true at HEAD** (`spec.md:133`, `src/model/lib/sheet.ts:4`, `src/walk/settle.test.ts:7-8`)
- **What's wrong:** the walk reads sheets by parity like any other piece, and nothing checks a sheet's parity.
- **Evidence:** the park paths' sheet (`src/model/site/paths.ts:121`) is crossed twice on 69 of my probe's lines, for example at 2.472 and 2.474 m at X −125.73, Z −183.51, where strips overlap.
- **Consequence:** settle reads a 2 mm inside there. It's harmless (it lifts a walker onto the upper strip), but the stated rule doesn't hold.
- **Fix:** have `crossings` or `settle` skip sheets, check sheet parity in the gate, or soften the text.

**6. `src/viewer/section-cut.ts:13-14` dropped a limit that still holds**
- **What changed:** the old header said an open surface seen from behind shows the cut colour. The new one says every non-sheet piece shows the cut colour across its whole section seen from above.
- **Counterexamples:**
  - the capped upright surfaces in finding 2;
  - the three inside-out builders' parts that the gate itself names: their cut shows their own far faces in their own material;
  - 42 capped shapes that are open along level lines, through which slanted rays (the floor views look down at 65°) can leave a section without meeting a back face.
- **Fix:** keep the old limit sentence and narrow the claim to straight-down views.

**7. Evidence and history aren't recorded**
- **Missing plan:** `closure.test.ts:14` and `AGENTS.md:107` cite an open finding in `docs/work/6_closed-solids/plan.md`. That folder isn't on the branch, `registry.json` has no id 6, and round 0's review isn't committed (R24).
- **Missing devlog line:** the devlog has no work unit 6 line; the latest is work unit 5's.
- **Unpinned claim:** "none of the three [inside-out builders] overlaps another part of its piece" has no test behind it. My own check was inconclusive, because the lunette vault's inner and outer surfaces share no vertices, so I couldn't split it into parts.
- **Main has moved:** main is at a194927 (docs only), so the branch needs that merge.

**8. `openAlong`'s tolerances are in each geometry's own units** (`closure.test.ts:20-21`, `AGENTS.md:107`, `check.ts:254-256`)
- **What's wrong:** for unit parts scaled up by their matrices (up to 99× in the Hunt foundations' boxes), "0.1 mm" and "1 mm" mean up to about 1 cm and 10 cm in the world.
- **Evidence:** a rerun at 1 µm and 10 µm changes no result, so this is a wording fix.

#### Nits

9. The header's list of red proofs (`closure.test.ts:16-19`) leaves out three that `AGENTS.md:107` credits to this gate: `openWall`'s bottom, `archedPassage`'s feet, and the instance numbering off by a mesh.
10. The messages at `closure.test.ts:271-273` say what happened but not what would fix it (R26). For example, the overlap one could say: keep overlapping parts shorter than settle's span, 1.749 m.
11. One idea per sentence: the new crossing sentence at `spec.md:133` and the last sentence of `:78` each pack in several ideas. "For as long as the walker is tall" (1.75 m) is looser than the 1.749 m bound actually checked.
12. `spec.md:78` says "a piece ... the cut caps is a solid or a sheet", but the cut never caps a sheet; "would cap" is accurate.

#### Answers to the brief

**1. Coverage:** the gate's choice of pieces matches the page.
- **Walk:** `collisionMeshes` at t = N is a superset of the page's static world, which leaves out every door's pieces (`src/walk/walk-mode.ts:324`). Settle reads only that static world (`src/walk/door-world.ts:125`).
- **Cut:** the gate uses `capsMesh` exactly as `src/main.ts:99` does. It reads the door stand-ins (`main.ts:103`) leaf by leaf with `openAlong`, and turning about a vertical hinge keeps vertical parity, so every door angle is covered.
- **Sheets:** ones the cut would cap are counted (`closure.test.ts:118-119`).
- **Other times:** t = N covers every rest position, and arriving pieces only move or scale, which keeps parity.
- Nothing is missed apart from findings 1 and 2.

**2. Soundness:**
- **Shared shapes:** pieces that share a shape get the same `openAlong`, parity and balance result. The six-decimal rounding is far under the 0.1 mm join. Only the overlap length differs (finding 3).
- **The bound:** `BODY.height − STANDING` is exactly right. A walker in an overlap is missed only when its whole 1.749 m span lies between two crossings inside the overlap.
- **Numbers:** all reproduce: 897 shapes, 17,087 pieces, 56,136 lines, 9,707 sheet pieces, 0.755 m.
- **Red proofs:** all reproduce:

| Mutation | Result |
|---|---|
| Attic base's bottom left out | 8 shapes open, also misread |
| `openWall`'s bottom left out | 14 shapes, 113 pieces |
| `archedPassage`'s feet left out | 1 shape, the gallery 600 passage |
| Main's crossing rule | 206 shapes misread |
| Instance numbering off by a mesh | 863 shapes misread |
| Urn plinth's underside turned up | 169 lines unbalanced |
| Medieval piers' half shafts as whole cylinders | 3.9 m of overlap |
| `UNIT_TILE` not a sheet | 2,008 shapes open, 7 `SHEETS` counts off |
| Crossings fixtures with main's rule | 5 of 7 red |
| Wall without `intervalsAt`'s edge mode | the channel case red |

**3. Docs and F11:** the code finds a walker sunk into an overlap at a piece's top, so dropping F11's clause is right.
- With an even number of crossings, `insideBetween` (`src/walk/walker.ts:45`) is true as soon as any crossing falls inside the walker's span.
- I tested it on a fixture of two overlapping 3 m parts. With feet at 2.0, 2.8 and 1.3 m, settle moved the walker onto the 3.0 m top.
- It is missed only when the overlap's top is at least 1.75 m above its feet. A 2.5 m overlap with feet at 0.5 m kept the walker; feet at 0.8 m moved it. A 3 m overlap with feet at 1.25 m kept it; 1.26 m moved it.
- `clearAt` (`walker.ts:190`) refuses those places the same way.
- The other claims overreach as findings 1, 2, 4 and 5 describe.

**4. Sheets:** see finding 2. Every declared sheet is a real surface; the park paths are the only one crossed an even number of times.

**5. Integration:**
- **Merge:** the merge kept all of work unit 5's changes. Among its files, only `src/model/core/arches.ts` differs from main, by the 3 lines that close the tympanum's sloping ends.
- **What replaces `CALLERS` and the names:** reading every piece supersedes them, with floors of 800 shapes, 15,000 pieces and 50,000 lines. Nothing else read the geometry names.
- **Red proofs:** the "unnamed geometry" one no longer applies; the rest reproduce.

**6. Rules:**
- Every file is under 500 lines (`walker.ts` is at 496, `collision.ts` at 491).
- Typecheck and lint are clean at HEAD.

#### What I read and ran

- **Read outside the diff:**
  - walk and doors: `walk-mode.ts`, `door-world.ts`, `doors.ts`, `bvh-cache.ts`;
  - cut and views: `cap-pass.ts`, `viewer.ts`, `floors.ts`;
  - checks and parts library: `check.ts`, `check.test.ts`, `lib/wall.ts`, `lib/builder.ts`;
  - area builders: `hunt/walls.ts`, `site/grid.ts`, `armor-figures.ts`, `astor-court.ts`;
  - engine and library: the build types and timeline, three-mesh-bvh's `raycast`;
  - docs: work unit 5's plan on main, the devlog, the registry.
- **Ran:**
  - In the worktree at HEAD: the closure, crossings and settle tests, 21 passed.
  - On the HEAD copy: the full unit suite (70 files, 632 tests, all passed), plus typecheck and lint (clean).
  - A copy of the gate that logs its counts, used to re-run 8 source mutations and the fixture mutations above.
  - Probes for each question above.
- **Not run:** the e2e suite and the screenshot capture, so the visual effects in findings 2 and 6 are computed, not seen.
- **Side effect:** my vitest runs may have updated vitest's ignored test-order cache in `node_modules/.vite`.

The probes are in its scratchpad (path redacted for this record).

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F12 | A declared sheet whose panes overlap in plan is crossed twice there, so settle reads an inside between the crossings and lifts a walker built through it: the Rockefeller skylights' hipped panes at X −96.29, Z −93.25, 2.4 cm apart, and the park paths' strips, 2 mm apart (Codex 1, major; Claude 5) | Accepted. The spec said a sheet never holds a walker inside | The collision world marks each piece's crossings with whether it is a sheet (`LineCrossings.sheet`), and settle reads no inside in a sheet (`src/walk/walker.ts`); a fixture of two panes 2 cm apart and of a hipped skylight over its hip, each declared and not, red without settle's reading of sheets |
| F13 | The gate reads a piece's overlaps on the first walked piece of its shape, and a shape groups pieces by direction alone, so a piece scaled taller is not read: one Hunt medallion three times as tall reads 2.27 m where the gate saw 0.76 m; 39 shapes have pieces stretched to different heights (Codex 2, major; Claude 3) | Accepted | Each piece's stretch along its lines (1 / &#124;M⁻¹ ŷ&#124;); the overlap is scaled to the walked piece of the shape that stretches them most; red with one medallion of each pair three times as tall, green with the stretch left out |
| F14 | The cut text promises the cut colour across every solid's section, but a part wound inside out has no back face there, as the Arms and Armor Court's gables at X 52.45, Z −84.36 show (Codex 3, minor) | Accepted | The spec, `src/viewer/section-cut.ts` and the gate's header name the inside-out parts and what the cut shows of them; turning them out stays an open finding |
| F15 | A shape all of whose faces stand upright has no crossing, so it passes the closure check with nothing read; 25 such opaque pieces are capped (the excavation, seven tympanum panels, sixteen banners, the moon gate surround), and the window panes bypass `SHEETS` (Codex 4, minor; Claude 2, major) | Accepted | The gate requires a face that does not stand upright; the window and door panes of `lib/window.ts`, the site's curbs, retaining walls and excavation faces (`site/grid.ts`), the tympanum panels (`core/arches.ts`), the banners (`mmw/armor-figures.ts`) and the moon gate surround (`mmw/astor-court.ts`) are declared sheets, 321 pieces in 19 step/material pairs; red with the window panes undeclared |
| F16 | The gate and AGENTS.md cite `docs/work/6_closed-solids/plan.md`, which does not exist, and no work-unit record holds round 0 (Codex 5, minor; Claude 7) | Accepted in part: the references now point to the spec, which names the open finding. The work-unit folder cannot be made: the fleet's allocator refuses every allocation in met while main's registry history skips ID 4 | The plan and both review records wait outside the repo until an ID can be allocated |
| F17 | A part with no top and no bottom passes all three readings: its open rims cancel along vertical lines, no line crosses it, and the walk's lines go only through faces that are not vertical; the medieval pier's core put back without them leaves the gate green (Claude 1, major) | Accepted | A fourth reading: at the walk's four points of every upright face, an inside lies to one side by the winding of the faces above, but where the face lies back to back on another, one side of a two-sided membrane. It found the Astor Court's moon gate panel, which had no foot, top or ends, so its doorway read as solid (closed); the Hunt hall roof's lead rim hanging below the skin, which round 0's repair made (now a closed fascia band); the surrounds' tympana, faces standing off the wall (now closed prisms); and the rusticated walls' channel ends at arches and at the walls' ends (now backed by a face looking into the channel, as at a jamb). Red with the pier's core open (30 points) and with the moon gate panel open (288) |
| F18 | The crossing rule merges hits at one height on triangle edges facing one way from different parts: on the overlap fixture's line along both bottoms' diagonals it reads 0, 3, 3 (Claude 4, minor) | Accepted in part: the rule stays. Merging only hits whose triangles share an edge would read a line through a T-junction twice, and `src/walk/collision.ts` has no room for it under 500 lines | The rule and its bound are stated in `crossings`' comment, the spec and the fixture's header; the fixture pins the line |
| F19 | `src/viewer/section-cut.ts` dropped main's limit: a slanted view can leave a piece open sideways without meeting a back face, and a surface's back shows the cut colour (Claude 6, minor) | Accepted | The header claims the cut colour for a straight-down view only and keeps the limit for slanted views and two-sided membranes; the spec's cut sentence says "seen straight down" |
| F20 | No devlog line; "none of the three overlaps another part of its piece" has no test behind it; main has moved to `a194927` (Claude 7, minor) | Accepted | The devlog line lands with the merge; the claim is stated as by construction; main is merged before the merge to main |
| F21 | `openAlong`'s 0.1 mm and 1 mm are in each geometry's own frame, up to about 99 times larger in the world (Claude 8, minor) | Accepted | The header and AGENTS.md say so, with the largest scale measured: 99.1, a Hunt foundations box |
| F22 | The header's red proofs leave out three AGENTS.md credits; assertion messages say what happened but not what would fix it; packed sentences; "for as long as the walker is tall" is looser than the 1.749 m checked; "the cut caps" a sheet where it would cap one (Claude 9 to 12, nits) | Accepted | All rewritten |

## Verification

The repairs pass the unit suite (70 files, 635 tests), tsc and ESLint; each new check was red with its defect put back: the sheet fixture without settle's reading of sheets, the overlap with one medallion of each pair three times as tall (2.27 m against 1.749 m; green with the stretch left out), the upright surfaces with the window panes undeclared (19 shapes), and the upright faces' inside with the pier's core open (30 points) and the moon gate panel open (288). The inside-out probe now finds two builders: closing the moon gate panel took it off the list, which its missing top had put it on. `npm run verify` passed with `MET_PORT=5348` at `dc1a7dc`: 70 files and 635 unit tests, typecheck, lint and build, and 84 e2e tests in 12.8 min. The standard shots at `dc1a7dc` (1,615,665 triangles and 746 meshes at t = N; build 252 ms, ready 2,567 ms cold) differ from `7c11ada`'s in 28 of 64 images, each changed region read at native resolution: a few pixels along frame and shadow edges, the channels' new closed ends at the walls' ends, the Arms and Armor Court's banners drawn in their cloth under the second floor's cut where they were capped, and the moon gate panel's section. Against main's `8e6643c`, 50 of 64 differ.

## Round outcome

Both lanes found real gaps between the gate and the docs' claims. Codex's two majors (F12, F13) and Claude's (F17, with F15) are repaired, F17 by a fourth reading that found four more defects in the model; the minors are repaired or, for F18, stated as a bound and pinned; F16 waits on the allocator. A focused review of these repairs follows as round 2.
