# A walker set down on a floor joint stands on the tiles

Status: complete
Owner: joint, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-30

## Problem and outcome

Work unit 4's F-owner-8, approved by the owner as a follow-up (2026-10-29; `docs/work/4_cited-images-viewed/plan.md`). `Walker.place` and `Walker.settle` (`src/walk/walker.ts`) read only the line under the body's centre. On the Medieval Sculpture Hall's axis, an 8 mm joint between its 6 cm tiles (`src/model/core/medieval-hall.ts` `hallFloor`), `place` set the feet on the slab in the joint, 6 cm down, and `settle` kept there a walker that stood on the slab when the tiles were laid round it. Walking along the joint kept it there, since the walking step reads its side probes only where its centre finds nothing at its feet. `src/model/core/choir-gate.test.ts` walked 2 cm off the axis for it.

Outcome: `place` and `settle` find support under the body's footprint as the walking step does, so a walker set down, settled or walking along a groove narrower than the body stands on the surface either side, and everything else the walker does is kept.

## Scope

Included: `place` and `settle` in `src/walk/walker.ts`; the side probes moved into `src/walk/footing.ts`, to keep `walker.ts` within the 500-line bound; fixtures in `src/walk/settle.test.ts`; `src/model/core/choir-gate.test.ts` onto the hall's axis; the spec's walk section, two AGENTS.md gate lines, the devlog, and the doc comments of `src/walk/reach.ts` and `src/walk/spawns.ts` that described `place`.

Excluded: the walking step's own rule, which stays as it was; walk-mode input (`src/walk/walk-mode.ts`, the mouse-look worker's); the model's floors.

## Approach

`place` finds the centre's ground as before, then lifts the feet out of a groove (`Walker.ontoRims`). The lift goes to the highest lower rim of a pair of opposite probes 0.3 m out, read from a step over the feet down to them (`Footing.rims`), whose probes both stand on top of what they meet, no closed piece holding the line just over either hit by the winding of its faces (`Footing.under`, from `LineCrossings.facings`), where the rim stands more than 1 mm over the feet, is walkable, and the body stands clear there on the centre's line (`clearAt`). Each pair is judged before the highest is kept. Where the centre's first surface lies more than a step under the height asked, the centre having passed through a gap or a seam, `place` first reads the rims within a step of that height, as the walking step at that height would. `settle` lifts the same way after it moves a buried or embedded walker; a walker it would keep it lifts only where pieces built since its last check cross the lines under its probes within a step over its feet (`Footing.builtUnder`). The walking step's `support` is the same rule as before, now `Footing.ground`, which calls `Footing.rims` with no checks.

Tradeoffs, each measured on the finished model by a scan of 486,052 places (a 1 m grid at seven levels, and the hall's axis at 0.1 m), old rule against new, with probe tests kept out of the commits:

- Reading the probes over `place`'s whole drop, as a body dropped from 1 m over the place would land, lifted feet by up to 13.2 m onto what stood either side. The lift reads a step over the centre's ground, the window the walking step reads, or a step about the height asked when the centre fell through.
- Letting the centre's own probe count, with only a head check, lifted feet into the seats of the Fifth Avenue benches over them, 0.32 to 0.37 m up. The lift reads only the pairs' rims and needs the body clear on the centre's line.
- A `settle` that lifted every walker it keeps would move one standing in a 0.3 to 0.6 m groove, or between two low plinths, at any rebuild. The trigger keeps it to rebuilds that put pieces under its probes.
- Bounds: a probe's hit on a sheet is not told from its underside, as a closed piece's is by its inside. A walker that walks into a groove at the level of its floor keeps to that floor, as the walking step keeps to the ground it stands on (the fixture's channel; no exposed slab borders the hall's joints). A probe inside a wall that stands on the rim's surface is refused as one under an underside is, so a pair with a probe in a wall counts for nothing: the committed rule's lifts beside Weston's facade at (−50, −137) and a gallery wall at (10, −66), each 3 cm, used such a probe and are gone.

## Acceptance criteria

- [x] A walker set down on the fixture's joint and where two joints cross, settled when the tiles are laid round it on the slab, and settled when the whole floor is built over it, stands on the tiles, and walks 9 m or more along the joint on them (`src/walk/settle.test.ts`). Red with the walker of `897a4b4`.
- [x] `choir-gate.test.ts` walks the hall's axis itself. Red with the walker of `897a4b4`, which placed the feet at 4.05 m, not 4.11 m, and kept them there walking through the gate.
- [x] Review 0's and review 1's findings repaired, each with a test red without its repair: no underside taken for a rim (the seats, and pieces of two overlapping parts), a refused highest rim no longer hides a lower one (the blocks under a ceiling), a raised sheet's seam bridged at the height asked, to within a step of it (the deck); and the refusals pinned: the step bound (the plinths), the walkable check (the ramps), the quiet side of `builtUnder`.
- [x] Everything else kept. Stairs, ledges, drops, gaps, doors and the routes pass their tests (`walker`, `stairs`, `settle`, `door-world`, `door-settle`, `reach`, `routes`, `doors`, `weston-door`, Dendur's `walk`). A channel and a gap wider than the body still drop a walker. The walking step's rule is the same function. The spawns, the route ends and `routes.spec`'s fixed places stand where they stood (probe).
- [x] The spec's walk section, AGENTS.md's two gate lines (under 30,000 bytes), the devlog, and the doc comments that described `place`.
- [x] `npm run verify` green on the landed revision, and the Load rule's three runs at 4×.
- [x] One review round with both lanes, its findings repaired; a focused re-review of the repairs.
- [x] Landed through the slot.

## Implementation steps

- [x] Fix `place` and `settle`; red proofs; docs (`36ca301`).
- [x] Scan the finished model, old rule against new; bound the lift; read only the rims.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`) of `36ca301`: three majors from Codex (one of them Claude's minor) and three lesser findings, F0 to F5, all accepted and repaired in `e6bc4eb`.
- [x] Review 1 (Codex alone, `reviews/1_implementation.md`), focused on the repairs in `e6bc4eb`: one major and one minor, F6 and F7, both accepted and repaired.
- [x] Verify, land (`c2a9bcc`).

## Outcome

Complete. Landed on origin/main at `c2a9bcc`, a fast-forward of `edf76fc`: `36ca301` the change, `e6bc4eb` review 0's repairs, `c2a9bcc` review 1's. A walker set down, settled or walking on the Medieval Sculpture Hall's joints stands on the tiles. `src/model/core/choir-gate.test.ts` walks the hall's axis itself.

- Verified on `c2a9bcc`'s tree through the gate lock with `MET_PORT=5366`. `npm run verify` passed: 710 unit tests in 79 files, typecheck, lint, build and 119 e2e tests, 626 s. The Load rule's three runs of `routes.spec` and `walk.spec` at 4× passed in a row: 21 passed each, the 2 unthrottled budget walks skipped, 132 to 165 s each, plus the wait for the lock. `36ca301` and `e6bc4eb` each passed the same before their reviews (704 and 710 unit tests; 628 and 765 s). Pages run 40981718531 passed its build (the unit tests, typecheck, lint and build) and deploy for `c2a9bcc`.
- Red proofs: in the headers of `src/walk/settle.test.ts` and `src/model/core/choir-gate.test.ts`. Each case is red with the walker it guards against: the old walker (`897a4b4`), `36ca301` or `e6bc4eb`, or a mutation of the final rule.
- Review: round 0 with both lanes, Codex and Claude, and round 1, Codex alone, focused on round 0's repairs (`reviews/`). Their eight findings, F0 to F7, are all accepted and repaired.
- Shots: no render changed. The spawns, the route ends and `routes.spec`'s fixed places stand where they stood, by the scan's probe, and the standard set's walk shots are the spawns' views, so the owner's render gallery needs no rebuild.
- Limitations: the bounds under Approach. Two older ones stand. `settle` reads burial and embedding on the centre's line, so a floor built over a walker on the workspace ground with a seam right over its centre leaves the walker under it. The walking step keeps to whatever ground its centre finds at its feet, so a walker that walks into a groove at the groove's floor level keeps to that floor.

## Follow-up: reviews 2 to 5 (2026-10-29 and 30)

Review 1's repairs, F6 (the winding in `Footing.under`, from `LineCrossings.facings`) and F7 (the rise counted from the feet), changed logic after review. So the coordinator ran a focused Codex review of `c2a9bcc`, review 2 (`reviews/2_implementation.md`). It found F8, major, and F9, minor. Worker `jointfix` repaired both under the owner's standing approval of follow-up work. Review 3, with Codex and Claude, found F10 to F15 in the repairs. Reviews 4 and 5 were focused Codex checks of the repairs that followed.

- **F8.** The crossing query counted hits at one height facing one way on edges once, whatever the edges. Where the edges of two overlapping parts' faces in one plane cross at the line, one part's crossing was lost and the winding went wrong both ways. It refused a valid top, or stood the walker on a part's top inside another, which parity did too. And no test read `facings` on the real model.
- **F9.** A rim exactly a step under the height `place` asks was in its window or out by the rounding of `top − length`: decks 0.75 and 0.875 m up asked from a step over them were fallen through.
- **Measured first**, over this unit's scan of 486,052 places (Approach), every line `place` reads:
  - The probes' lines (`Footing.under`): 37,010 reads of 14,476 distinct lines. Of these, 4,407 met an edge and 3,998 merged hits at one height, and none of those merges joined faces that share no edge or corner at the line.
  - The centre's line: 10,806 reads of 3,857 distinct lines. Of these, 5,651 merged hits, and 3 merged unshared faces: T-junctions within one welded part of a floor at Z −69, not two parts.
  - So F8 does not occur at the scan's places, and its fixtures are what guard it. None of the closure gate's 57,352 lines through the model is in doubt either.
- **Repair** (`f6fa16a`; `1d9eb63` for review 3; `af04654` for review 4):
  - The crossing rule moves to `src/walk/crossing-rule.ts`, and `collision.ts` keeps each piece's raycast (`hitsAlong`). A merge counts where the hits lie on one edge or corner of their triangles, by the places of its ends.
  - Where they lie on edges that are not one, the line is in doubt. It is read again at the first of three offsets, 30 to 42 µm off, whose line meets no edge and keeps every crossing of the line's own reading: each kept by a hit of the line read again that faces its way and lies within 1 µm of the plane of a face merged into it, each hit keeping one, by a complete matching (`keeps`). Every hit there counts. Else the line's own reading stands, as before review 2.
  - What each round found in the second reading: with no check, a line along a piece's own outline was read off the piece, so a probe stood on its underside (review 3, F10). With a check by slope, a steep sliver near the line kept the boxes' crossings (review 4, F16). And a greedy match refused whole matches (F17). Two rounds running found the second reading's acceptance at fault, so the rule was reassessed (fleet canon R11): a reading is replaced only where the faces' own planes keep every crossing, and falls back to the old reading everywhere else.
  - `Walker.ontoRims` reads its window 1 µm past its foot, and `place`'s branch test takes ground within that of a step under the height asked as within a step (`FOOT_SLACK`; F9, and review 3's F12). The walking step reads no crossings and keeps its own windows.
  - The closure gate's walk reading checks the walk's facings on its 57,352 lines: one per crossing, as many up as down, and inside where the faces' own winding is, within 1e-5 m of the line (`insideApart`). Review 3's F11 replaced a comparison of total lengths.
- **Tradeoffs**, each measured on the scan with `settle(0)` read after each `place`:
  - Reading again every line that merges hits changed `settle(0)` at 10,234 places: by up to 1.05 cm on sloped faces, and 8 kept walkers by Z −138 lifted 15.19 m.
  - Reading again every line that meets an edge changed 10,302 places, and `place` at 2.
  - Reading again only lines in doubt changed none.
  - Bounds: hits whose triangles have the edge or corner they lie on at the same places count once whatever their faces, so a part doubled, or two parts sharing a ridge or an apex, read once along it. A line in doubt that grazes a face the line read again leaves keeps its own reading. A line read again reads its heights where it lies, tens of micrometres times its faces' slope off, and may meet faces within its offset that the line does not. Each has a pin in `src/walk/crossings.test.ts`.
- **Acceptance.**
  - [x] Both F8 directions, set down and settled, and their crossings and facings: red at `c2a9bcc`.
  - [x] Decks at five heights asked from exactly a step over them, and from 0.36 m (the refusal): red at `c2a9bcc` at 0.75 and 0.875 m. Floors at five heights with plinths over a step above them: red at `c2a9bcc` and `f6fa16a`.
  - [x] Review 3's outline and review 4's sliver beside it, set down and settled, and their crossings: red at `f6fa16a` and `1d9eb63`, green at `c2a9bcc`. The matching on hits made by hand: red with the first pick kept and with only the kept face's plane.
  - [x] The closure gate checks the walk's facings on the model.
  - [x] Every other result kept. On the scan, `place` and `settle(0)` match `c2a9bcc`'s code at all 486,052 places, and the spawns, route places and `routes.spec`'s fixed places (237) stand where they stood. The walking step gives the same 175,217 frames of routes R1 to R7, byte for byte, with no crossing query while walking. Checked on each repair commit.
  - [x] This unit's fixtures and red proofs stay green.
  - [x] `npm run verify` green on each repair commit, and the Load rule's three runs at 4×.
  - [x] One review round with both lanes, review 3, its findings repaired; focused re-reviews of the repairs, reviews 4 and 5, the last finding nothing new.
  - [x] Landed through the slot.
- **Result.** The code is `f6fa16a` (review 2's repairs), `1d9eb63` (review 3's) and `af04654` (review 4's), landed on origin/main with this record, a fast-forward of `1002016`.
  - Verified through the gate lock with `MET_PORT=5367`. `npm run verify` passed on each repair commit's tree: 724, 728 and 732 unit tests in 80, 80 and 81 files, typecheck, lint, build and 125 e2e tests, 10.1 to 10.4 min. The Load rule's three runs of `routes.spec` and `walk.spec` at 4× passed in a row on each: 21 passed each, the 2 unthrottled budget walks skipped, 129 to 136 s.
  - Reviews 2 to 5 (`reviews/`): F8 to F17, all accepted and repaired, review 5 finding nothing new.
  - Red proofs: in the headers of `src/walk/settle.test.ts`, `src/walk/crossings.test.ts`, `src/walk/crossing-rule.test.ts` and `src/model/closure.test.ts`.
  - Shots: no render changed. The spawns, route places and fixed places stand where they stood, so the owner's render gallery needs no rebuild.
  - Limitations: the bounds under Tradeoffs.
