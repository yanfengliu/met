# Weston's front and the Petrie Court carried out to their real east end

Status: active
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

- [ ] Both end blocks are 19.75 m long and mirror each other about the door, to 1 mm, and `KRAVIS_EAST_Z` equals the core's east end (`core.test.ts`).
- [ ] The containment test lets a piece stand east of the core's east face only within the east block's stretch, under the coping's top and in front of the front's face; red with the coping carried 1 m back over that stretch, and still red with the blocks projecting 1.5 m.
- [ ] The south link's and the Kravis Wing's containment and shared-wall tests hold on the moved line (`mmw.test.ts`, `src/model/roche-south/` tests), the core stays within its 130 meshes, and the closure, reach, placement and routes tests pass, R7 walked both ways through the moved passage and the court wall's opening.
- [ ] `npm run verify` passes; `routes.spec` and `walk.spec` pass three runs in a row at 1× and three at 4×.
- [ ] `npm run shots` changes only where the court's east end, the south link's west end and the yard between them show, and the renders read at native size show the east block whole to the court's east wall.
- [ ] Independent review (Codex and Claude) finds no defect left unanswered.
- [ ] Merged to main and pushed, the owner's render gallery republished.

## Implementation steps

- [ ] The shared line and the core's east block, with the containment test and its red proofs.
- [ ] The Kravis Wing, the Rockefeller Wing, the south link, the site's blocks and R7.
- [ ] The records: `interior.md`, `exterior.md`, `spec.md`, the module headers.
- [ ] Gates, the load runs and the shots; renders read at native size.
- [ ] Review, repairs, landing, the gallery, the devlog and the hand-over note.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
