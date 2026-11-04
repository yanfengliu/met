# The 1880 fronts as their photographs show them

Status: active
Owner: Vaux fronts session (claude/vaux-fronts-3c8d7d)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

Work unit 4 left F-owner-7 open: the 1880 Vaux building's fronts differ from their photographs in seven ways, recorded in `docs/research/exterior.md` section 9 and in "Open with the owner" notes in `src/model/core/vaux-front.ts`, `vaux-shell.ts` and `constants.ts`. The owner has asked for the open findings to be finished. Outcome: each difference is built as the photographs show it, read at native resolution, or kept with its reason recorded; the notes in the code and section 9 say what was decided; every gate is green.

## Scope

Included: the west front (`vaux-front.ts`), the side and east walls and their trim (`vaux-shell.ts`, now with `vaux-arch.ts`, `vaux-sides.ts` and `vaux-east.ts`), their constants, the 1880 brick's colour (`core.vauxBrick`, also on the nave's gables and its clerestory skin in `medieval-hall.ts`), and the Lehman Wing's estimated skylight head, east lintel and strip ends where they hid the west front's arches (`src/model/roche-south/lehman-plan.ts`, `lehman.ts`, `lehman-glass.ts`). `palette.ts` (engine-owned) gets a comment change only. Following work unit 8's method: evidence viewed at native resolution and recorded in `docs/research/`, colours calibrated against renders.

Excluded: the hall's two round end windows (`VAUX_OCULUS_Y`, the oculus hole in `vauxHall`'s gable, the glass discs in `westFrontWindows`, the lining in `medieval-hall.ts`), which the hall-windows session owns; the Weston porch (`weston-facade.ts`), which the Weston session owns; `palette.brick`, which Weston's 1888 and 1894 walls keep. Any opening that adds a passage for the walker waits for the owner (asked 2026-11-04 through the coordinating session).

## Approach

Evidence, each read at native resolution in the browser on 2026-11-04 (`exterior-images.md`): #60 and #67 (Untapped New York, 1260×840), #61 (Untapped Cities, 640×426), #49 (Original_Met.jpg, 1384×968) and #53 (1880_Met_Museum.jpg, 9406×6439). Heckscher's figures #63 to #66 could not be opened again: the Met's PDF server answers automated readers with a bot challenge, so their earlier full-size readings stand. The floor map (`research/cache/lm_features.json`, Floor 1) has three main-floor doors through the west front at X −5.78, 0 and +5.76, each about 2.3 m wide, and narrow corridors through the east front at X ±6.15.

Measurements on #60 (taken square to the front from the court floor): the five arches stand 142 px apart, so with the map's 5.77 m bay the front is 24.5 px/m across the springing's row. The voussoir ring spans 117 px outside and 77 px inside at the springing (4.8 and 3.1 m), 20 px deep there and 28 px at the crown; a smooth light inner order 7 to 9 px wide (0.3 m) lines the arch and runs down the jambs (#61); the impost band is 12 px tall and runs across the front; the doorway rises 153 px from the landing to the band; the tympanum's stripes are 6 px (0.27 m). Heights through #60's camera, solved from the landing's row, a visitor on it (1.70 m; 1.65 to 1.75 m brackets them) and that scale (review 0, F3): the springing 6.3 m over the main floor, the openings 5.8 m tall under a 0.5 m band, the intrados rising 2.4 m and the voussoirs 1.4 m deep at the crown, which stands at about 14.2 m. So the heads rise past the second floor, as #67 shows on the east front, where the second floor meets the voussoirs near their foot.

Decisions, item by item (F-owner-7's seven differences):

1. Five arches on the west front, 5.8 m apart (the front's 29 m in five bays, within 0.03 m of the map): built.
2. No hood on the west front's arches (#53, #60, #61, #63, #64) nor on the side arcade's (#49): removed. The east front's arches get the ring of dark granite blocks #67 shows.
3. The smooth light inner order inside the voussoirs, running down the jambs: built on the west front and the side arcade; the east front's arches get #67's moulded light granite inner arch round a roundel.
4. Doorways in the west front's arches at X ±5.8: asked of the owner, since they add passages. Until an answer, those arches hold windows.
5. The brick: a core material for the 1880 walls (`core.vauxBrick`), calibrated so its render from the Lehman court reads against the light granite as the photographs do.
6. The east front: four large arches at X ±5.8 and ±12, two either side of the covered middle (#66), each the west front's arch inside a ring of dark granite blocks (#67), blind today; the inner pair hold a roundel inside a moulded light arch (#67); the outer pair stand on today's passages at ±12, and today's second-floor doors at ±10.3 cut their heads, taking their roundels and the stones they cross.
7. The side walls: banded pointed arches on the hall's six bays only, as the west front's design (#49), over a ground storey of light rusticated stone with small square-headed openings (#65, the south side; the north side's is hidden in #49 and taken to match); the end blocks in plain brick with round-headed openings on three tiers (#49, #65). Today's doors stay where they are.

Also found and built: the west front's ground storey is light rusticated stone with square-headed windows (#49, #53), not brick with segmental ones, and a string course stands 1.9 m over its crowns (#53). Found and left, with their reasons in section 9: the stair tower between the north arcade and the west block (#49); the north arcade's wider windows between light piers (#49); the Lehman Wing's section at the front, where #60 shows brick up to about 17.3 m.

The build: each head is two pieces, its light granite and its dark, placed per arch and arriving together (`vaux-openings` staggered by order); window frames are merged with their bars, so the core area stays within its 130 meshes (review 0, F0).

## Acceptance criteria

- [ ] Each of the seven differences built or kept with its reason, in `exterior.md` section 9, the code's notes and this plan; every photograph used marked viewed in `exterior-images.md`.
- [ ] Renders compared with #60 from the Lehman court and with the gallery's frames that show 1880 work, read at native resolution.
- [ ] `npm run verify` green through the gate lock, closure, reach, placement and route gates included.
- [ ] Independent review (Codex and Claude), every finding resolved.
- [ ] Merged to main through the landing slot and pushed; the owner's render gallery republished.

## Implementation steps

- [x] Evidence read and measured (this plan).
- [x] West front, side walls, east front, brick; Lehman skylight head.
- [x] Records: `exterior.md` [C7] and section 9, `exterior-images.md`, devlog.
- [x] Review 0 (`reviews/0_implementation.md`) of the working tree (`snapshots/0_target.patch.txt`), verify green on it; F0 to F18 dispositioned and repaired.
- [ ] Verify on the repairs, commit, review 1, landing, gallery.

## Outcome

Pending.
