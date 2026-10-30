# A walker set down on a floor joint stands on the tiles

Status: complete
Owner: joint, a worker of the met coordinator
Created: 2026-10-29
Updated: 2026-10-29

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
