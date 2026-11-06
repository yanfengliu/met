# The Petrie Court's south wall with the floor map's eight doors

Status: active
Owner: claude/optimistic-mayer-d1fe0b
Created: 2026-11-05
Updated: 2026-11-06

## Problem and outcome

The owner's "Match the floor map" (2026-11-05), relayed by the coordinator: "The court's doors: the map's eight against the model's six openings", open since work unit 21. The model's limestone south wall of the Petrie Court has six openings 3.6 m wide and 5.4 m tall, evenly spaced about the court's middle, and a window over each. The floor map draws eight doors from gallery 549 into the court on X −61.44 (`research/cache/lm_features.json`, world Z, west to east): −125.56..−120.97 (4.59 m), −115.40..−113.11 (2.29), −108.87..−106.58 (2.29), −102.11..−99.74 (2.37, on Weston's door's axis), −95.34..−93.05 (2.29), −88.84..−86.52 (2.32), −80.95..−76.38 (4.57) and −74.63..−70.07 (4.56). The first seven stand in pairs about Weston's door, each pair's middles' mean within 1 cm of its axis and the fourth door's middle 4.5 cm east of it; the eighth, at the east end, has no partner.

Outcome: the court's south wall has the map's eight doors at their places and widths, shaped as the court's photographs show them, with a window over each arched door in the upper storey.

## Scope

In: the court's south wall, its doors and windows (`src/model/roche-south/kravis.ts`); the two artworks that hang on or stand before that wall (`src/model/collection/spaces-b.ts`), one of them now where the map has a door; route R7's way into the court (`src/model/hunt/routes.ts`, `routes.test.ts`); the core test's check that the court is symmetric about Weston's door (`src/model/core/core.test.ts`); the records.

Out, recorded and not changed (the coordinator: "If anything else along this front contradicts the decoded map, record it and don't change it"): west of Z −126.34 the map draws no wall on the court's south side, the café opening onto the court, and #35 shows columns there, where the model's wall runs on to the court's west end; and, against the photographs rather than the map (which draws no heights), the court's east wall has three windows behind a balustraded balcony over the court's name (#33, #46), where the model's (the McKim, Mead & White south link's park wall) is plain.

## Approach

- The doors from the map, their widths as drawn. Their heads from #35 (`interior-images.md`), from the balcony at the court's east end, read again at native size while building (the first reading had the nearest door the eighth and the first arch the seventh door): one perspective map fits the five arches' middles to the map's second to sixth doors within 0.5 px in a 900 px copy, and to the third to seventh only within 8 px. So the narrow doors, the second to the sixth, are round arches, statues on pedestals before them; the seventh, nearest, is square-headed between pilasters under an entablature; past the fifth arch there is no other, so the first, the seventh's mirror about the door, is not arched; the eighth is out of view. E: the eighth square-headed as the seventh, its twin in width; the arches' crowns at 5.4 m over the court's floor, as the model's openings' heads were (spring 4.25 m), and the square heads at 5.4 m.
- A window over each arched door, as #35 shows the upper storey: a tall narrow window centred over each arch, recessed blind panels between them, and a blind panel over the square-headed doors. E: 1.2 m wide (about half a narrow door), 3.0 m high, the sill 0.9 m over the second floor, as the model's windows' was; #35, scaled from an arch's crown, gives that within about half a metre. Not built: the doors' frames, the arches' voussoirs, the lower storey's banded rustication, the cornice between the storeys and the blind panels.
- The relief (Thorvaldsen's Nessus Abducting Dejanira, 1.26 m wide) hung at Z −114.0 now stands in the second door; it moves to the middle of the solid wall between the second and third doors. The vitrine with Carpeaux's bust before the wall moves to the middle of the solid wall between the fifth and sixth doors.
- R7 enters the court through the door on Weston's door's axis, the fourth, and crosses straight to it; its test reads the door's own width.
- The core test held the court symmetric about the door through the openings' mean; the doors are not symmetric now, so it reads the court's two ends.

## Acceptance criteria

- [ ] The wall has the eight doors at the map's places and widths and five windows, nothing standing in them, as built and as the renders show it (`kravis.ts`, `roche-south.test.ts`; renders at native size).
- [ ] The court stays symmetric about Weston's door, read from its ends (`core.test.ts`, red with its east end back on −69.0).
- [ ] R7 crosses the fourth door both ways; the reach, placement, closure and routes tests pass; the relief hangs on solid wall.
- [ ] `npm run verify` passes; `routes.spec` and `walk.spec` pass three runs in a row at 1× and three at 4×; `npm run shots` changes only where the court's south wall shows.
- [ ] Independent review (Codex and Claude) finds no defect left unanswered.
- [ ] Merged to main and pushed, the owner's render gallery republished.

## Implementation steps

- [x] The doors and windows, the artworks, R7, the tests.
- [x] The records.
- [x] Gates, the load runs and the shots; renders read at native size.
- [x] Review 0 (`reviews/0_implementation.md`): Codex approved, Claude approved with four minor findings and a nit, all repaired.
- [ ] Review, repairs, landing, the gallery, the devlog and the hand-over note.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
