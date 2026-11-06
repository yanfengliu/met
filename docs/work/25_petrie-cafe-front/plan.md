# The Petrie Court's south side west of Z −126.34 as the floor map and the photographs draw it

Status: active
Owner: claude/optimistic-wiles-0c2630
Created: 2026-11-06
Updated: 2026-11-06

## Problem and outcome

Work unit 24 recorded one difference it did not change. West of Z −126.34, the floor map draws no wall on the court's south side: the café opens onto the court there. The model's limestone wall runs on to the court's west end. The owner answered "Yes, match it" (2026-11-06) to "Match the court's café end to the floor map too?", relayed by the coordinator.

Read for this unit, the map and the photographs disagree. The map (`research/cache/lm_features.json`, Floor 1, X −61.44) draws:

- a threshold, with no wall, from −126.34 to the court's west end (−137.08), with one round column 0.71 m across centred at −129.59
- a partition from −126.34 to −125.56
- a round column 0.71 m across in the middle of each of the three wide doors that unit 24 built open: door 1 at −123.28, door 7 at −78.66, door 8 at −72.32

The map's café column is door 8's column mirrored about Weston's door (−100.97) within 2 cm.

Haklai's photographs of 2012-05-26 show the café front as door 8's mirror. `-3` looks south-south-west at the court's west end, and `-4` looks almost straight at it. East to west they show:

- door 1's east jamb
- door 1's round column
- a wide pier
- the café's round column
- a square pier
- plain wall to the court's west end, where the colonnade's entablature stops

A cross-ratio from the two column centres in `-3` puts the square pier at the mirror of door 8's west jamb (−131.86), not at the court's west end. `-2` looks south-east at the court's east end and shows doors 7 and 8 each as a round Tuscan column between square piers under an entablature. #35 shows the far end only about 100 px wide, too small to settle the count. The evidence went to the owner with three choices (the coordinator's relay, 2026-11-06; side-session notes `petrie-cafe-front-u25.md`):

1. the photographs' café front, and the map's columns in doors 1, 7 and 8
2. the photographs' café front only
3. the map as drawn, open across 10.7 m on one column

The owner chose option 1 (2026-11-06).

Outcome: the court's south wall stands symmetric about Weston's door:

- The café opens onto the court through a ninth opening, door 8's mirror: a pier 1.74 m wide west of door 1, an opening from −131.86 to −127.30 split by the map's column at −129.59, and solid wall from −131.86 to the court's west end.
- Each of doors 1, 7 and 8 has the map's round column in its middle.

## Scope

In:

- the court's south wall: the café's opening and the four columns (`src/model/roche-south/kravis.ts`)
- the tests: the court wall's openings and columns, the line cast through the openings' bays, the walker through every bay of the four columned openings, and the placement zones (`src/model/roche-south/roche-south.test.ts`, a new walker test, `src/model/collection/placement.test.ts`)
- the records: `interior.md`, `interior-images.md` (the new photographs), `spec.md`'s Placement, this plan, the devlog

Out, as the brief and the owner's choice keep them:

- the café's other sides, which stay as the model builds them: the park face on the west, the older wing's wall on X −88.1 on the south, and on the east the partitions with openings to galleries 553 and 554 and the back of house, with gallery 549's west end open into the café as the map's door
- the other open items from units 21 to 24: the doors' heads and frames, the voussoirs, the lower storey's rustication, the cornice between the storeys, the blind panels, and the court's east wall
- the square piers' pilaster capitals and the colonnades' entablature, which the photographs show. The wall's plain jambs and head stand for them, as for the other doors.

## Approach

- The café's opening is door 8 mirrored about the axis of the map's paired doors (−100.965, within 5 mm of Weston's door's −100.97): −131.86 to −127.30, 4.56 m. It is square-headed at 5.4 m like doors 7 and 8, the photographs show it with no window over it, and it is cut in the same wall piece as the doors.
- The columns are at the map's centres in Z: −129.59, −123.28, −78.66 and −72.32. They are Tuscan as the photographs show them: the library's Doric column (`src/model/lib/column.ts`), unfluted, on an Attic base, 0.71 m across as the map draws them, rising to the openings' 5.4 m head. In X they stand in the middle of the model's wall. The map draws them on its line of the wall, X −61.44, which the model takes as the wall's court face. So each column stands under the wall's head, between the jambs, as the photographs show.
- The data: `COURT_DOORS` keeps the map's eight doors, each now saying whether it has a column. `CAFE_OPENING` is the café's opening, and `COURT_DOORWAYS` lists all nine, west to east, for the wall's cut, the placement zones and the tests. R7 and the artworks between doors read `COURT_DOORS` as before.
- Tests:
  - the nine openings stand in pairs about Weston's door, and the four columns stand in pairs and in their openings' middles
  - the line cast checks the bays beside each column, with lines at most 0.1 m apart, against every piece of the sequence
  - the walker on the real model walks from the court through the middle of every bay of the four columned openings and back
  - the café's opening is a placement zone

## Acceptance criteria

- [ ] West of −126.34 the court's south side has the café's opening at −131.86..−127.30 with the map's column in its middle, a solid pier east of it to door 1 and solid wall west of it to the court's west end. As built, as the tests read it, and as the renders show it at native size.
- [ ] Doors 1, 7 and 8 each have the map's column in their middle. The nine openings and the four columns stand symmetric about Weston's door.
- [ ] The walker walks between the court and the café through both of the café opening's bays, and through both bays of doors 1, 7 and 8, both ways. No artwork, door or route stands in a wall or a column.
- [ ] The closed-solid, reach, route, placement, door-fit and budget gates pass. `npm run verify` passes. `routes.spec` and `walk.spec` pass three runs in a row at 1× and three at 4×. `npm run shots` changes only where the court's south wall shows.
- [ ] Independent review (Codex and Claude) leaves no defect unanswered.
- [ ] Merged to main and pushed, CI followed to the end, the owner's render gallery republished.

## Implementation steps

- [ ] The café's opening, the columns and the data (`kravis.ts`).
- [ ] The tests, each proved red.
- [ ] The records.
- [ ] Gates, the load runs and the shots, with the renders read at native size.
- [ ] Review, repairs, landing, the gallery, the devlog and the hand-over note.

## Outcome

Pending.
