# Review 0: implementation

## Target

Repository `met`, commit `aad9170` on branch `claude/optimistic-wiles-0c2630` (work unit 25's change), against main at `556114f`. The diff covers:

- `src/model/roche-south/kravis.ts`
- `src/model/roche-south/roche-south.test.ts` and the new `src/model/roche-south/court-bays.test.ts`
- `src/model/collection/placement.test.ts`
- `docs/research/interior.md` and `docs/research/interior-images.md`
- `docs/design/spec.md`, `AGENTS.md`, `docs/work/registry.json` and `docs/work/25_petrie-cafe-front/plan.md`

The prompt (fleet `tmp/review-runs/met-u25-r0/prompt.md`, ignored) named the owner's choice, the plan and five criteria: the builder against the plan, correctness across the model, the tests' strength and red proofs, the records' accuracy, and anything else. The diff was appended.

## Reviewers and coverage

- **Codex:** `gpt-6-astra`, `model_reasoning_effort=xhigh`, read-only sandbox, codex-cli 0.163.0. It read the diff and the code. Outside the diff it read `src/model/lib/column.ts`, `src/model/roche-south/shapes.ts`, `src/model/hunt/routes.ts` and `src/model/collection/spaces-b.ts`, among others. Vitest could not run in the read-only sandbox, so it ran the changed tests' callbacks through a standalone Node adapter, mutations included. The lane's check: keep, no failed commands.
- **Claude:** `claude-opus-5-5[1m]`, `--effort max`, Claude Code 2.1.308, limited to Read, Glob, Grep, Task and git-only Bash under `dontAsk`. Its `system/init` showed those tools, `dontAsk` and no MCP servers, and `modelUsage` held the pin alone. It read the code, the map cache and the implementer's logs and renders. Its two test commands were refused by its limits. The lane's check: keep.
- Neither lane could view the photographs, so their readings rest on the records.
- The tree's `git status --porcelain` and `git diff HEAD` were the same before and after both lanes: empty, at `aad9170`.

## Reports

Both reports are verbatim, but for absolute paths into the reviewed worktree, which are cut to repository-relative paths.

### Codex (gpt-6-astra)

Reviewed `aad9170` against `556114f`. I found no production geometry defect, but four minor findings.

1. **Minor — the column exclusion also hides unrelated obstructions.** [roche-south.test.ts:187](src/model/roche-south/roche-south.test.ts:187)  
   `byColumn` suppresses lines for every piece, throughout the opening’s height. An additional 0.2 m square, 3 m tall post immediately in front of the café column passes both changed test files’s checks. Its bounds were X −61.15..−60.95, Z −129.69..−129.49, Y 4.11..7.11.  
   **Repair:** exempt only the verified column piece; continue checking other pieces inside that strip.

2. **Minor — the column check accepts square posts.** [roche-south.test.ts:178](src/model/roche-south/roche-south.test.ts:178)  
   Width is compared with `c.half`, derived from the same geometry, and only bounding boxes establish shape. Replacing all four columns with plain boxes measuring 1.065 × 5.4 × 1.065 m leaves all 16 checks passing, despite the test naming round columns.  
   **Repair:** independently check the shaft’s circular cross-section and 0.71 m lower diameter, alongside the existing placement and height assertions.

3. **Minor — the required solid wall west of the café is unprotected.** [roche-south.test.ts:200](src/model/roche-south/roche-south.test.ts:200)  
   The geometry check examines declared openings only. Adding an undeclared, 5.4 m tall opening at Z −136..−132.5 leaves all 16 checks passing, removing wall expressly required by the owner’s choice.  
   **Repair:** add independent occupied-wall checks west of −131.86 and through the pier between −127.30 and −125.56, including the café’s boundary positions.

4. **Minor — the records name the wrong mirrored jamb.** [interior.md:320](docs/research/interior.md:320)  
   Door 8’s **west** jamb, −74.63, mirrors about −100.965 to **−127.30**. Its **east** jamb, −70.07, mirrors to **−131.86**. Following the prose therefore identifies the opposite café boundary. The same error appears in [image #48’s entry](docs/research/interior-images.md:139) and [the plan](docs/work/25_petrie-cafe-front/plan.md:29).  
   **Repair:** change “west jamb” to “east jamb” in all three records.

The implementation’s spans, four columns and preserved `COURT_DOORS` indexing match the chosen design. Comparing collected geometry across all 163 steps found changes only in `petrie-court`. All eight bay walks passed both ways against the real model; the changed geometries passed the vertical-closure probe. Budgets remain within limits.

Outside the diff, I read `src/model/lib/column.ts`, `src/model/roche-south/shapes.ts`, `src/model/hunt/routes.ts`, and `src/model/collection/spaces-b.ts`, among others. I inspected five retained renders.

Vitest could not execute tests because the read-only sandbox blocked its temporary directory. Mutation results above used the unchanged test callbacks through a standalone Node assertion adapter; they are not a Vitest gate pass. The four new claimed red controls failed as described. I could not retrieve the original photographs or independently reproduce their cross-ratio measurement. No files changed.

**Verdict: approve with findings.**

### Claude (claude-opus-5-5[1m])

I could not run any gate. This session allows only git commands; `npx vitest run …` and `npm test -- …` were both refused. Everything below comes from reading the code and the map cache, and from the implementer's own logs. `tmp/verify-u25-2.log` and `tmp/test-u25-2.log` record 84 files, 769 unit tests and 127 e2e tests passed in this worktree. That is unit 24's 760 plus the 9 new cases, but I can't tie those logs to `aad9170`.

The builder does what the plan and the owner's choice say, and nothing else moved. I found no blocker or major defect. Two tests check less than their headers and `AGENTS.md` claim, and a few records don't add up.

## Findings

**F1 (minor): the line cast checks nothing beside each column except the column's own box.** `src/model/roche-south/roche-south.test.ts:187` and `:215`; the overclaim is at `:17` and `AGENTS.md:103`.
- **Defect:** `byColumn` skips every line within 0.5825 m of a column's axis (the plinth's half-width plus 5 cm), at every height. That leaves 1.165 m of each columned doorway where nothing is checked. The walker's lanes keep its body at least 1.04 m from every axis, so neither test covers that strip. The Bound at `:22–23` admits this, but "so nothing stands in them but the columns" and AGENTS.md's "with nothing else standing in them" don't.
- **Failure scenario:** either of these leaves the line cast, the column check and the walker test all green:
  - a post 0.2 m square standing 0.3 m behind the wall, 0.45 m east of the café column's axis (Z −129.14) — unit 24's red-proof post, moved into a columned doorway;
  - the café's opening cut as two bays, with a 1.0 m pier of wall left where the column stands.
- **Repair:** cast every line across the whole doorway, and leave only the four column pieces out of what the lines can hit. The check at `:174` already finds those pieces by their boxes. Prove the test red with the post above.

**F2 (minor): nothing tests the column's size or its round shape.** `roche-south.test.ts:178`, with `kravis.ts:186–189`.
- **Defect:** `c.half` comes from `COURT_COLUMN`'s own bounding box. So "as wide as its plinth" compares the instance's box with its own geometry and only catches a scaled or rotated matrix. Neither the map's 0.71 m nor a round shaft is checked.
- **Failure scenario:** `COURT_COLUMN` built at diameter 1.0 (bays 1.52 m wide), or a `UNIT_BOX` 1.065 × 5.4 × 1.065 m added instead of the column. All tests stay green.
- **Repair:** check `c.half` against the literal 0.75 × 0.71 = 0.5325. Also check that the built piece's geometry is `column({ order: 'doric', diameter: 0.71, height: 5.4, fluted: false })`; the library's cache returns that same object (`column.test.ts:49–51`).

**F3 (nit): every column is checked against the café's head.** `roche-south.test.ts:167`.
- **Defect:** the header says "up to its doorway's head", but the test uses the café's crown for all four columns.
- **Failure scenario:** if one columned door's head changed height, its column would still be checked against 5.4 m. It passes today only because every square head is 5.4 m.
- **Repair:** look up each column's own doorway's crown inside the loop.

**F4 (nit): door 8's column position is 2 cm off the map, which breaks the records' "within 2 cm" claim.** `kravis.ts:134`; `interior.md:315`; `plan.md:16`, `:18` and `:59`; `court-bays.test.ts:42–43`.
- **Defect:** −72.32 is the plain average of the map polygon's eight vertices. The map's own centroid for that feature (uid 711997662608) gives −72.34, and the polygon's area centroid gives about −72.33. The other three columns agree with the map's centroids within 1 cm.
- **Failure scenario:** a reader checking the records' arithmetic finds door 8's column mirrored about Weston's door (−100.97) at −129.62. That is 3 cm from the café column's −129.59, not "within 2 cm". With the map's −72.34 the gap is 1 cm.
- **Repair:** use −72.34 and move door 8's two lanes to −73.75 and −70.94. Or keep −72.32 and write "within 2 cm of the paired doors' axis (−100.965)".

**F5 (nit):** `interior.md:315` lists #50 among "Haklai's other photographs of the same afternoon". #50 is InSapphoWeTrust's, from 2011-10-29. A reader would misdate it. Cite it separately.

**F6 (nit):** `interior-images.md:139` and `interior.md:320` say the cross-ratio comes "from the two columns' centres". Two points can't fix a perspective map along the wall; a third is needed.
- **Failure scenario:** a straight scale through the two columns puts −131.86 at about 2197 px and the west end at about 2555 px, not the recorded 2160 and 2380. So a third point was used, and the reading the owner's choice rested on can't be reproduced from the record.
- **Repair:** name the third reference point and its pixel position.

**F7 (nit):** `interior-images.md:111` counts "four column capitals" past the last arch in #35. #48, #49, `interior.md` and the model have two columns there. As written, the entry reads as a contradiction. If two of the four are the wide pier's pilaster capitals, say so. I couldn't view #35 to tell which is right.

**F8 (nit):** `kravis.ts:152` still says the eighth door's square head is an estimate ("E: … out of the photograph's view"). #47 now shows it under an entablature. Cite #47 there.

## Checked and sound
- **The map matches.** `research/cache/lm_features.json` (Floor 1, along the wall line) has:
  - the café threshold at −137.08..−126.34 and the partition at −126.34..−125.56;
  - the eight doors to the centimetre;
  - columns about 0.705 m across (area 0.39 m²) at −129.59, −123.27 and −78.66;
  - the café's east side drawn as a threshold, with gallery 549's end as a door. Galleries 553 and 554 match the builder's rooms (`lm_floor1.txt`).
- **The builder matches the plan.**
  - The café opening is door 8 mirrored about −100.965, with a 1.74 m pier east of it.
  - The solid wall west of it (5.14 m) mirrors door 8's 5.13 m.
  - The opening is square-headed at 5.4 m, with no window.
  - The plinth (1.065 m) is the column's widest part; the abacus is 0.873 m.
  - The columns grow with the wall, adding one mesh and at most 20,000 triangles.
- **R7 and the artworks keep their meaning.**
  - `COURT_DOORS` still lists the eight doors, so `routes.ts:123–132` and `spaces-b.ts:26–30` behave as before.
  - The café's placement zone is clear of the court's row of artworks.
  - No spawn or preset stands near a column.
- **Closure should hold.** The library column's base, unfluted shaft and Doric capital are already used in pieces the closure test reads, and the parts touch without overlapping. I didn't run the test.
- **The red proofs hold.** Each one in both test headers fails the check it names. The walker's lanes are typed-in numbers, so the walker test checks the bays rather than repeating the data.
- **The cited photos and limits pass.** #47, #48 and #49 are marked viewed and parse correctly. `AGENTS.md` is 21,678 bytes, and the changed files are under 500 lines.
- **The render matches.** `tmp/u25-compare/petrie-far-both.png` shows both west-end columns and the solid wall to the west end.

## Not checked
I ran no tests, shots or load runs. I couldn't view photographs #35 or #47–#52, so their readings and pixel figures are unverified.

## Read outside the diff
- `src/model/lib/column.ts`, `capital-classic.ts` and `column.test.ts`
- `src/walk/walker.ts`
- `src/model/closure.test.ts`
- `src/model/hunt/routes.ts:100–147`
- `src/model/collection/spaces-b.ts:1–54` and `placement.test.ts:60–190`
- `src/cited-images.test.ts`
- `src/model/core/constants.ts:13, 76`, `weston-facade.ts:50, 88` and `choir-gate.test.ts`
- `src/viewer/presets.ts:71` and `scripts/test-headroom.ts`
- `docs/work/24_petrie-court-doors/reviews/0_implementation.md`
- `kravis.ts` at `2d1a607`
- the map cache files and the implementer's `tmp/` logs and renders

## Verdict
**Approve with findings.** Fix F1 and F2 before merging; both are small test changes, and F1 is what `AGENTS.md`'s gate line promises. F3 to F8 are nits in the records and tests.

## Findings and disposition

Both lanes approved with findings, no blocker or major. Every finding was accepted and repaired, and each test repair was proved red. All findings were minor or nits, so their repairs are checked by those red proofs and the gates rather than by a second round.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The line cast skipped every piece within a column's plinth and 5 cm, so a post beside a column passed (Codex 1; Claude F1, which also flags the header's and `AGENTS.md`'s "nothing else standing in them" as more than the test checked). | Accepted: the strip was 1.165 m of each columned doorway where nothing was looked at. | The cast crosses whole doorways and leaves out only a Tuscan column piece in its own place (`roche-south.test.ts`). Red with Claude's post, 0.2 m square and 3 m tall, 0.3 m behind the wall, 0.45 m east of the café's column. The header's and `AGENTS.md`'s claim is now what the test checks. |
| F1 | The column check proved neither the map's 0.71 m nor a round shaft (Codex 2; Claude F2). | Accepted: the width was compared with the geometry's own box. | Each column piece's geometry must be the very object the library gives for a Doric column, unfluted, 0.71 m across and 5.4 m tall, with literal parameters in the test, and its plinth's half side 0.5325 m. Red with the columns built as boxes as large as their plinths, and with the column 1.0 m across. |
| F2 | Nothing protected the solid wall west of the café or the pier between it and the first door (Codex 3). | Accepted: the owner's choice rests on them. | New check: lines at most 0.2 m apart through every stretch of wall between the doorways and the court's ends, from 0.05 m over the floor to 0.05 m under the doorways' head, must meet the court's step. Red with an undeclared opening at Z −136.0..−132.5, 5.4 m tall. |
| F3 | The records called −131.86 the mirror of the eighth door's west jamb; it is the east jamb's (−70.07), the west jamb's (−74.63) mirroring to −127.30 (Codex 4). | Accepted. | East jamb in `interior.md`, `interior-images.md` #48 and the plan (and the side-session note). |
| F4 | Every column was checked against the café's head (Claude F3). | Accepted. | Each column is checked against its own doorway's crown. |
| F5 | The eighth door's column (−72.32) was the vertex mean, 2 cm from the map's own centroid (−72.34), which broke the records' "within 2 cm" (Claude F4). | Accepted: the map's centroids are its data. | The four columns stand at the map's own centroids (−129.59, −123.27, −78.66, −72.34; door 1's also moved 1 cm). Door 1's and door 8's walker lanes moved 1 cm, and the records say "within 1 cm". |
| F6 | `interior.md` listed #50 among Haklai's photographs of the same afternoon; it is InSapphoWeTrust's, of 2011 (Claude F5). | Accepted. | Reworded. |
| F7 | The cross-ratio was said to come from the two columns' centres alone; a third point is needed (Claude F6). | Accepted: the third point was the second door's arch, at about 460 px, and the record did not name it. | `interior-images.md` #48 and `interior.md` name it. It was read roughly, and 100 px either way moves the results by under 20 px. |
| F8 | #35's entry counted "four column capitals" past the last arch, where #48 and #49 show two columns (Claude F7). | Accepted. | Four capitals, which #48 and #49 show to be two columns' and the piers' pilaster capitals. |
| F9 | `kravis.ts` still called the eighth door's square head an estimate out of view (Claude F8). | Accepted: #47 shows it. | The comment cites #47. |
