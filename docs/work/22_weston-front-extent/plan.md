# Weston's front and the Petrie Court carried out to their real east end

Status: complete
Owner: claude/optimistic-mayer-d1fe0b
Created: 2026-11-05
Updated: 2026-11-05

## Problem and outcome

The owner's "Yes, do it" (2026-11-05) to "Carry Weston's front and the court out to their real ends, so both end blocks match?". Work unit 21 modelled the front's two end blocks, but the model's front and court stop on the 1880 building's lines, so the west block runs 19.75 m to the Kravis Wing's pier (Z −137.0) and the east one only 15.69 m to Z −69.0. The real front is symmetric about Weston's door (Z −100.97): Heckscher's fig. 26 gives it about 70.8 m, and the floor map's court, gallery 548, runs from Z −137.10 to −64.83, ±36.14 m about the door, where the map's floor 2 also draws the McKim, Mead & White south link's west wall, on −64.85 (`docs/research/interior.md`, Weston's 1888 front; `src/model/mmw/plan-data.ts`).

Outcome: the court runs from Z −137.0 to −64.94, as far east of the door as its west end is west of it, and the east end block runs 19.75 m to the court's east end, the mirror image of the west one. The line the Kravis Wing shares with the McKim, Mead & White south link moves with it, from Z −69.0 to −64.94: the link's park wall and its passage into the court, the Rockefeller Wing's north wall, the site's blocks and the walking route R7.

## Scope

In: one shared line, `KRAVIS_EAST_Z` (`src/model/frame.ts`); the core's east end block and the containment test (`src/model/core/`); the Kravis Wing, the Rockefeller Wing and the area's blocks (`src/model/roche-south/`); the south link's block, its party walls and the map's lines that fall outside it or along its new wall (`src/model/mmw/`); the site's footprint (`src/model/site/footprint.ts`); route R7 and its test (`src/model/hunt/`); the records (`docs/research/interior.md`, `exterior.md` section 2, `docs/design/spec.md`, the devlog).

Out: the core's own east face, Z −69.0 (`EAST_Z`), where wings A, B and C end and Hunt's wing begins. The map puts the 1880 east front's doors 2.2 m east of it (`exterior.md` section 9), so the real wings end further east, but moving that line moves Hunt's back rooms, the 1880 east front and routes R8 and R9; it is a change of its own. Also out: the end blocks' heights (left open by work unit 21), the court's eight doors on the map against the model's six openings, and the blocks' ground-storey windows.

## Approach

- `KRAVIS_EAST_Z = −64.94` in `frame.ts`, derived (D): the mirror of the court's west end (the Kravis park face, −138.2, less its 1.2 m wall) about the door. The core's `WESTON_EAST_END_Z` is the same mirror, computed from `WESTON_PAVILION_Z` and `WESTON_WEST_END_Z`, and a test holds the two equal, so the blocks match by construction.
- The east block's outer end moves to `WESTON_EAST_END_Z`; its parts scale by the same factor as the west block's. Its last 4.06 m stand east of the core's east face, in front of Hunt's south wall (`src/model/hunt/walls.ts` `seamWall`, X −49.7 to −48.5, rising to 22.5 m), so every piece there stays in front of the front's face: the coping, which elsewhere runs back 1 m over the wall, stops at the face over that stretch. From 1888 until Hunt's podium and walls rise behind it (1898 and 1899), that stretch stands past wing B's east end; the record says so, as the cost of keeping the core's east face where it is.
- The Kravis Wing's east line (`Z_EAST`) becomes `KRAVIS_EAST_Z`: its floors, the court's floor, its limestone south wall (whose six openings then centre on the door, as the court does), the flat glazing over the court's east end (one more row of panes each 2 m), the gutter, the roof and the upper room that ended on −69.0.
- The south link's `SOUTH_LINK.z0` becomes `KRAVIS_EAST_Z`, and with it the park wall and its `PETRIE_PASSAGE`, and the start of the Rockefeller party wall on X −88.1; the Rockefeller Wing builds its own north wall to the same line. The map's floor 2 lines in the south link at and west of −64.85 are dropped: one now lies along the party wall, the others outside the link.
- R7 turns in Exhibition Gallery 199 2.2 m short of the moved wall, as it did, and enters the court through the opening west of the door, since the one east of it would pass 1 m from the sculpture at Z −94.5 (`src/model/collection/spaces-b.ts`).
- No new meshes: the coping's two lengths are boxes of the core's shared box in one material.

## Acceptance criteria

- [x] Both end blocks are 19.75 m long and mirror each other about the door, to 1 mm, and `KRAVIS_EAST_Z` equals the core's east end (`core.test.ts`).
- [x] The containment test lets a piece stand east of the core's east face only within the east block's stretch, under the coping's top and in front of the front's face; red with the coping carried 1 m back over that stretch, and still red with the blocks projecting 1.5 m.
- [x] The south link's and the Kravis Wing's containment and shared-wall tests hold on the moved line (`mmw.test.ts`, `src/model/roche-south/` tests), the core stays within its 130 meshes, and the closure, reach, placement and routes tests pass, R7 walked both ways through the moved passage and the court wall's opening.
- [x] `npm run verify` passes; `routes.spec` and `walk.spec` pass three runs in a row at 1× and three at 4×.
- [x] `npm run shots` changes only where the court's east end, the south link's west end and the yard between them show, and the renders read at native size show the east block whole to the court's east wall.
- [x] Independent review (Codex and Claude) finds no defect left unanswered.
- [x] Merged to main and pushed, the owner's render gallery republished.

## Implementation steps

- [x] The shared line and the core's east block, with the containment test and its red proofs.
- [x] The Kravis Wing, the Rockefeller Wing, the south link, the site's blocks and R7.
- [x] The records: `interior.md`, `exterior.md`, `spec.md`, the module headers.
- [x] Gates, the load runs and the shots; renders read at native size.
- [x] Review, repairs, landing, the gallery, the devlog and the hand-over note.

## Outcome

Complete. Merged to main at `c75b0e9` (the change `0c99c1a` and review 0's repairs `c75b0e9`) and pushed; the Pages workflow built and deployed `c75b0e9`; the owner's render gallery shows main's shots at `c75b0e9` (artifact version 17).

Checks on `c75b0e9`'s content, through `tmp/gate.sh`: `npm run verify` (755 unit tests; typecheck; lint; build; 127 e2e in 9.7 min); `routes.spec.ts` with `walk.spec.ts` three runs in a row at 1× (23 passed each) and three at 4× (21 passed, the two frame budgets skipped); `npm run shots` at `c75b0e9`, clean: 34 of 64 within 9 of 255 of the gallery's set at `1d873cf`, the other 30 changed only where the court's east end, the south link's west end and penthouse, and the 1888 corner show, and in the Petrie Court preset, whose camera now stands beside the east block; the model 27,251 pieces, 746 meshes and 1,594,799 triangles at t = N; the core at its 130 meshes. The change's own checks before review are in review 0's record. Review: one round, Codex and Claude, both approved with findings, all accepted and repaired, their red proofs in the record (`reviews/0_implementation.md`).

Limitations: the core's own east face stays at Z −69.0, about 2.2 m west of the floor map's, so the east block's last 4.06 m stand before Hunt's south wall, and from 1888 until Hunt's podium and walls rise behind them (1898 and 1899) past wing B's east end, a fin that fig. 35 contradicts; whether a unit moves the core's east face is the owner's choice (`docs/research/interior.md`, Weston's 1888 front). Still open from work unit 21: the end blocks' heights, the court's eight doors on the map against the model's six openings, the blocks' ground-storey windows.
