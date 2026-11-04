# The Weston porch at the April 1888 drawing's size

Status: active
Owner: Claude Code desktop session optimistic-mayer-d1fe0b (2026-11-04)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

Work unit 3 made Weston's 1888 door square-headed but kept the model's porch: four free-standing round Ionic columns 5.0 m tall, 0.65 m off the wall, an entablature 0.8 m deep and the balcony 6.05 m over the main floor, with the door scaled down by that porch (0.861) to 2.83 × 4.23 m. The real porch, as the April 1888 drawing (Heckscher fig. 29) and the court photographs show it, is a projecting aedicule of Ionic pilasters on pedestals 0.96 m tall, 5.81 m to the capitals, under a carved frieze and a modillioned cornice that carry the balcony at 7.6 m, 5.9 m wide over its pedestals, with blind panels between pilasters on its sides (`docs/research/interior.md`, Weston's 1888 door, "Open, beyond the head"). The owner gave the go-ahead to rebuild it (2026-11-04, by starting this card).

Outcome: the porch built at the drawing's size and in its form, the door's opening at the drawing's 3.29 × 4.91 m in a 0.20 m architrave, the door working as before (a pair of leaves that open a quarter turn into wing B only, stop the walker closed and let it through open), the research record and the spec's Doors item matching what is built.

## Scope

Included: the porch in `src/model/core/weston-facade.ts` (its body, pilasters, pedestals, entablature, balcony and railing), the door's size there and its hole and lining in the pavilion's wall, the pavilion's main floor beside the porch (the two windows at ±3.6 m that the photographs show as brick between quoins), the stone courses that the porch now interrupts, the 528/529 wall that `clearOf` moves to the wider doorway's reveal, the step texts, the Petrie Court comment in `src/model/collection/spaces-b.ts`, `docs/research/interior.md` and `interior-images.md`, the spec's Doors item, the devlog.

Excluded: the door's place along the front, 2.68 m west of the floor map's (the brief: leave it unless the owner asks); the depth of the leaves in the doorway (see Approach); the facade's line, 1.54 m north of the floor map's; any other part of the pavilion.

## Approach

Measured on fig. 29 (Heckscher's reproduction, 1878 px wide, 29.6 px a metre from the drawn 56 ft 6 in landing) with pixel profiles, from the door's middle: pedestals ±1.87 to ±2.95 m, 0.96 m tall; shafts ±1.97 to ±2.75 m, plain to 3.19 m and fluted above; capitals' top 5.81 m; architrave 5.81 to 6.23 m, frieze to 6.6 m, modillions and corona to 7.31 m, the corona out to ±3.46 m; a top block ±2.72 m wide to 7.6 m; the opening 3.31 m wide (3.29 m, ±2%) and 4.91 m tall in an architrave 0.20 m wide. The drawing's plan is cut off at the wall, so the porch's depth comes from three other readings: the 1888 first-floor plan (Heckscher fig. 26, at about 12 px a metre) about 2.2 m; photograph #35's east side, against the porch's height, about 2.3 m; and #33's railing, read with the camera's 24 mm equivalent lens level (verticals parallel) and 2.2 m up, about 2.0 m from its wall-end post to its corner post, which stand about 0.15 m in from the top block's edges. The model takes 2.25 m to the pilasters' faces. #33 at full size shows each front corner as a pier with a fluted pilaster face on the front and on the side, the capital wrapping the corner, and #35 and fig. 110 show each side as that pilaster, a blind panel and a narrower pilaster against the wall.

Built from the parts library and the core's builders, every piece closed: the body an `openWall` 5.26 × 5.81 m and 2.13 m deep with the doorway through it; library Ionic pilasters (`pilasterParts`, a plain lower and a fluted upper shaft) on the front, the sides and against the wall; pedestal and cap boxes; the door's `surround`; the library `entablature` (1.5 m, modillioned, no dentils) round the three sides on a filling block; the top block; a pipe railing in `palette.copperGreen` (sampled on #33: 103, 150, 132). The pavilion's main-floor windows at ±3.6 m go, and a strip of rusticated quoins stands beside each side of the porch, as #33 and fig. 110 show.

The door stays in the 1888 wall, 0.3 m behind its face, as the brief asks. #33 at full size puts the real leaves about 0.35 m behind the porch's face (the lit gap at the east leaf's hinge, 45 px inside the opening's east edge where the porch's depth runs about 128 px a metre), and the 1888 plan draws the door at the porch's front: so the real porch is a vestibule closed at its front, where the model's is a lined passage 2.25 m deep before the leaves. That stays open for the owner, a one-constant change with its gates' places.

## Acceptance criteria

- [ ] The porch in the drawing's form and size, measured as above; its depth recorded with its three readings; checked against #33, #35 and fig. 110 at their native size, and the standard shots before and after compared, every changed image read at native resolution.
- [ ] The door's opening 3.29 × 4.91 m in its 0.20 m architrave; the leaves open a quarter turn into wing B only, stop the walker closed and let it through open (`src/model/core/weston-door.test.ts`, the Weston places in `tests/e2e/routes.spec.ts`).
- [ ] Green: the door's gates (`src/model/core/weston-door.test.ts`, `src/model/door-fit.test.ts`, `src/model/doors.test.ts`, `src/model/lib/door.test.ts`), the reach gate, the collection's clearances (`src/model/collection/placement.test.ts`), the closure gate, and `npm run verify` on the final revision.
- [ ] The Petrie Court's glass roof still meets the 1888 front's coping (shots and the roof's own geometry).
- [ ] `docs/research/interior.md`'s "Open" paragraph and the spec's Doors item "Weston's door" match what is built, and say that the door's place along the front and its leaves' depth are left for the owner.
- [ ] Independent review by Codex and Claude with its findings resolved; merged to main and pushed through `tmp/land.sh`; the owner's render gallery republished from main's shots.

## Implementation steps

- [x] Research: figs. 26, 28, 29 and 110, #33 and #35 read at native size; the porch measured.
- [x] Model: `src/model/core/weston-porch.ts` (new: the porch's stonework in the facade step, its railing in the openings step, the door's and the porch's measures), `src/model/core/weston-facade.ts` (the door's size, the pavilion's main floor, the courses the porch stops), `src/model/core/wings.ts` (the steps), comments in `galleries.ts`, `spaces-b.ts`, `routes.ts`. The porch's once-only masonry (body, the door's architrave, the entablature and its modillions) is one piece, since the core sat at its budget of 130 meshes.
- [x] Tests: `core.test.ts` lets the porch's stretch of the front (within 3.5 m of the door's middle) reach 2.9 m into the court, where trim may otherwise reach 1.5 m; `closure.test.ts` counts two fewer glass sheets in `wings-openings` (the two windows gone); `lib/door.test.ts`'s Weston unit is 3.29 × 4.91 m.
- [ ] Checks: `npm run verify` green through `tmp/gate.sh` on the first commit (732 unit tests, 125 e2e, Weston's walks among them); the shots, and `routes.spec.ts` three times at 4× throttle.
- [x] Records: `interior.md`, `interior-images.md` (#33, #35, #43), `history.md`, the spec's Doors item, the devlog.
- [ ] Review (Codex and Claude), repairs, re-review as needed.
- [ ] Land, gallery.

## Outcome

Pending.
