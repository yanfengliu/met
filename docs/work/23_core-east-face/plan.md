# The core's east face on the floor map's line

Status: complete
Owner: claude/optimistic-mayer-d1fe0b
Created: 2026-11-05
Updated: 2026-11-05

## Problem and outcome

The owner's "Yes, move it" (2026-11-05) to "Move the core's east face to the map's line, so the 1888 fin shrinks to about 1.9 m?". Work unit 22 carried Weston's front and the Petrie Court to their real east end, Z −64.94, but kept the 1880–1894 core's east face, and with it Hunt's back, on Z −69.0, the block table's estimated cut line (`exterior.md` section 2). So the east end block's last 4.06 m stand past wing B's corner from 1888 until Hunt's wing rises behind them, where Heckscher's fig. 35 shows the front ending at the corner. The floor map puts the line 2.2 m further east: the 1880 east front's doors between gallery 304 and Hunt's galleries 300 to 303 stand on Z −66.79, the second floor's galleries 603, 604, 607, 608, 630, 632 and 633 end on −66.8, and the Grand Staircase's cross hall ends on −66.79 (`exterior.md` section 9; `src/model/core/plan-data.ts`; `src/model/hunt/dims.ts`).

Outcome: the core's east face, the outer face of the 1880 east front and of wings B's and C's east walls, stands on Z −66.79, and Hunt's wing begins there. The fin shortens to 1.85 m. The core's rooms run 2.21 m further east, with the floor map's walls in that strip.

## Scope

In: the line (`src/model/frame.ts` `EAST_FACE_Z_CORE`, read by the core's `EAST_Z` and Hunt's `BACK_Z`); the cross hall's back wall and the passage behind it (`src/model/hunt/stair.ts`); the floor map's runs in the core's new strip (`src/model/core/plan-data.ts`); gallery 600's middle for its paintings and for route R5 (`src/model/collection/spaces-b.ts`, `src/model/hunt/routes.ts`); the containment tests (`src/model/core/core.test.ts`, `src/model/hunt/hunt.test.ts`); from the reviews (records in `reviews/`), the east front's second-floor door and the outer heads it cuts (`src/model/frame.ts`, `src/model/core/vaux-east.ts`), the doors through the Hunt partition behind it and through block A's side walls in the strip (`src/model/hunt/galleries.ts`, `src/model/core/vaux-sides.ts`), and a test that the front's openings are clear through the wall and into the Hunt wing (`hunt.test.ts`); the site's blocks (`src/model/site/footprint.ts`); the records (`exterior.md` section 2 and 9, `interior.md`, `spec.md`, module headers).

Out: the core's west face and its other lines; the Hunt Wing's own rooms beyond its map lines (its partition on Z −65.65 stays, leaving the map's 1.14 m between it and the core's face); the end blocks' heights; and, older than this unit (review 1, F7), the gap at the top of the Hunt wing's back between the core's east wall, which stops at 18.0 m with no coping, and the wing's flat roofs, whose undersides stand at 20.1 m.

## Approach

- `EAST_FACE_Z_CORE` −66.79 (M: the floor map's line between the core's galleries and Hunt's). The core's east walls, the 1880 east front with its arches, corridors and second-floor doorway, the wings' floors, roofs and rooms all read `EAST_Z` or `INNER_EAST_Z`, so they move with it; Hunt's floors, podium walls, seam walls and roofs read `BACK_Z`, which becomes the same line.
- The cross hall's stone back wall, 0.8 m thick with its round-arched doorway into gallery 600, stood on −66.79 with a 1.41 m cavity behind it to the core's wall, lined as a passage. It now stands on the core's east face, from −66.79 to −65.99 (`CROSS_HALL_BACK_Z`, the hall's back face, 0.8 m east of the line), and the cavity's passage goes: the doorway runs on through the core's own granite lining into gallery 600. Together the two walls stand astride the map's line (−67.79 to −65.99), the core's 1.0 m west of it and the hall's 0.8 m east, so the hall is 0.8 m shallower than the map's room.
- The core's floor map data was cut at the old wall when it was generated: 11 runs along Z end at −69.9, and runs along X within 1.45 m of the old line were left out. From the cached map (`research/cache/lm_features.json`, never committed) the 11 runs are carried to their map ends and the five runs along X that now stand more than 1.45 m inside the new face are added (main floor −69.51, −69.25, −70.18; second floor −68.85 twice); the builders clip every run to the new interior.
- Gallery 600's paintings on its partitions centre on the partitions, which the map runs to −68.85; R5 ends at the room's middle between its wall with 601 and the core's east wall.
- From the reviews: the cross hall's back wall spans between its side walls' inner faces; the east front's second-floor door stands on the north outer arch's axis, where the map draws its door through the old wall, and the Hunt partition on −65.65 opens behind it; the south outer head stays whole, as #67 shows it at gallery 690's entrance and as the map, with no door there, agrees; the map's runs the first regeneration missed are added, and the map's doors through block A's side walls in the strip opened.
- Wing C's north front lays its twelve bays out over the longer wall, 1.1 m further east; the window count stays.

## Acceptance criteria

- [x] The core's and Hunt's containment tests hold on the new line, and are red with a piece of either carried 1 m over it.
- [x] Weston's east block stands 1.85 m past the core's east face, its coping and the court's gutter dividing there; the blocks still mirror each other (`core.test.ts`).
- [x] The cross hall's back wall and the core's east wall meet on the line with no face shared one way; the doorway's passage runs through both (`routes.test.ts` R5, `tests/e2e/routes.spec.ts`).
- [x] The routes (R5, R9 and the rest), reach, placement, closure and spawn tests pass; the core within its 130 meshes.
- [x] `npm run verify` passes; `routes.spec` and `walk.spec` pass three runs in a row at 1× and three at 4×.
- [x] `npm run shots` changes only where the core's east end, the cross hall, gallery 600, wing C's north front and the fin show; renders read at native size.
- [x] Independent review (Codex and Claude) finds no defect left unanswered.
- [x] Merged to main and pushed, the owner's render gallery republished.

## Implementation steps

- [x] The line, the cross hall's back wall, the map runs, gallery 600 and R5, the tests and the site's blocks.
- [x] The records.
- [x] Gates, the load runs and the shots; renders read at native size.
- [x] Review, repairs, landing, the gallery, the devlog and the hand-over note.

## Outcome

Complete. Merged to main at `25a1257` (the change `ff95d73`, review 0's repairs `de997c7`, review 1's repairs `25a1257`) and pushed; the Pages workflow built and deployed `25a1257`; the owner's render gallery shows main's shots at `25a1257` (artifact version 18). The coordinator relayed the owner's "Match the floor map" during the work, which confirmed this move.

Checks on `25a1257`'s content, through `tmp/gate.sh` with the machine's CPU at 27 to 34%: `npm run verify` (755 unit tests; typecheck; lint; build; 127 e2e in 10.3 min); `routes.spec.ts` with `walk.spec.ts` three runs in a row at 1× (23 passed each) and three at 4× (21 passed, the two frame budgets skipped); `npm run shots` at `25a1257`, clean: 26 of 64 within 9 of 255 of the gallery's set at `c75b0e9`, the other 38 where the core's east end, the cross hall, gallery 600, gallery 304, wing C's north front and the 1888 fin show; the model 27,286 pieces, 743 meshes and 1,596,109 triangles at t = N. Earlier runs on the way, under other work's load (CPU 96 to 97%), failed only walking frame budgets (the plaza's and the Great Hall's GPU-synced render 19.5 and 17.7 ms against 16.7) and passed when rerun. Red proofs: the containment tests with a core footing and a Hunt plate each carried 1 m over the line; the openings test with the second-floor door back at X 10.3 and with the north head not cut. Review: two rounds, Codex and Claude (`reviews/0_implementation.md`, `reviews/1_implementation.md`), every finding accepted, two in part.

Limitations: the map draws a second line 1.2 m east, on −65.6, read as the 1880 wall's east face, which would put the face flush with the real front's end and the cross hall into the old wall (exterior.md [B2], recorded as an open reading); the cross hall is 0.8 m shallower than the map's room; the Hunt partition on −65.65 leaves the map's 1.14 m strip behind the north second-floor door; on the main floor the core's wall stands 0.5 m west of the map's line drawn as its middle; the map's second-floor doors at the corridors' ends (Z −68.84) stand in no wall now; the Hunt wing's back is open between the core's east wall (18.0 m) and the wing's roofs (20.1 m), older than this unit (review 1, F13).
