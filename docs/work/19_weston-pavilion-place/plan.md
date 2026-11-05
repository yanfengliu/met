# Weston's pavilion and door at the floor map's place

Status: complete
Owner: Claude Code desktop session optimistic-mayer-d1fe0b (2026-11-04)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

Since the core's first modelling (2026-10-11) the model stood Weston's 1888 entrance pavilion, with its porch and door, at the middle of the model's south front of wing B (Z −103.65, half way from −138.3 to −69.0, the 1880 building's lines). The floor map has the door 2.68 m east, in the middle of gallery 529 (`docs/research/interior.md`, Weston's 1888 door). Work units 17 and 18 left the door's place for the owner, who chose to move it (2026-11-04: "Move it east", their answer to work unit 18's closing question).

Outcome: the pavilion, its porch and the door stand at the floor map's place, Z −100.97; the front's bays are laid out from the pavilion as far as the model's front runs; the door works and is walked as before; and the records say what the map and the court's photographs show, and what the model's front does not (its east end).

## Scope

Included: the pavilion's place (`WESTON_PAVILION_Z` in `src/model/core/constants.ts`, used by `weston-facade.ts` and `weston-porch.ts`), the bays and plain ends of the front, the main floor's walls (`galleries.ts`: `clearOf` goes), the tests and comments that name the door's Z, the `doors-weston` shot's camera, the records.

Excluded: the front's extent and design east of the pavilion's first bay (the model's front ends on the 1880 building's east line, `EAST_Z`, 4.2 m short of the map's court, and the court's photographs show a front of another design there); the Kravis Wing's court, which ends on the same line; the west end, which no photograph shows.

## Approach

- Evidence: the decoded floor map (`research/cache/lm_features.json`, its world frame the decoded Z less 85.97 m, `research/cache/README.txt`): the door from Z −102.73 to −99.21 in gallery 529 (−104.70..−97.22); the galleries along the front, 526 to 529 and 531 to 533, from −135.14 to −66.78, ±34.18 m about −100.96; the court, gallery 548, from −137.10 to −64.83, ±36.14 m about −100.965. So the map's front is symmetric about the door: the middles of the door, the galleries and the court agree within 1 cm; and ±34.18 m is as long as the pavilion's half-width (6.2 m) and five of the model's 5.6 m bays, its estimates from the photographs, to within 2 cm.
- The model: `WESTON_PAVILION_Z` = −100.97 (`constants.ts`); `weston-facade.ts` lays as many whole bays as fit each side of the pavilion, five on the west (to −135.17, a plain end of 3.13 m to −138.3) and four on the east (to −72.37, a plain end of 3.37 m to −69.0), each plain end under the bays' cornice drawn out to its width; `weston-porch.ts` stands on the same middle.
- `clearOf` (`galleries.ts`), which moved the 528/529 wall out of the old doorway, would move nothing now, and goes. The passage check in `src/model/core/weston-door.test.ts` holds the doorway clear: red with the door back at Z −103.65, where the 16 rays 0.9 to 1.2 m west of the axis meet the 528/529 wall at X −48.70.
- One bay fewer: six window panes fewer in the closure test's count (135 to 129).
- The walk places, the collection's zones and the e2e follow `WESTON_DOOR`; the porch's new stretch (Z −104.3..−97.6) lies in the court row's gap (Z −112.5..−94.5); the `doors-weston` camera moves with the door.
- The court's photographs against the new layout (review 0, F3): #33 shows arched three-window bays west of the porch as far as it sees, and east of it one arched bay and then a front of another design to the court's east end (dark granite columns under a stone entablature, tall blind stone panels above); #35, from the court's east end, shows that design nearest it. The model's three further arched bays east of the first are the model's estimate from before; that stretch stays open for the owner.

## Acceptance criteria

- [x] The pavilion, porch and door at Z −100.97; bays from the pavilion out (five west, four east) with plain ends under the bays' cornice; nothing else on the front moved.
- [x] Every gate green: `npm run verify` on the final revision; `routes.spec.ts` three runs in a row at 1× and at 4×; the passage check red with the door at the old middle.
- [x] The shots compared with main's; every changed image read at native size.
- [x] Records: `interior.md` (the map's evidence, the photographs, what is open), `interior-images.md`, the spec's Weston's door item, `collection.md`, the devlog.
- [x] Independent review by Codex and Claude with its findings resolved; merged to main and pushed through `tmp/land.sh`; the owner's render gallery republished.

## Implementation steps

- [x] Read the map in the world frame: the door, the galleries along the front and the court.
- [x] Model: `constants.ts`, `weston-facade.ts`, `weston-porch.ts`, `galleries.ts`, `wings.ts`.
- [x] Tests: `closure.test.ts` (129), `core.test.ts` (the porch's stretch from `WESTON_PAVILION_Z`), `weston-door.test.ts` (the passage check's red proof), `door-fit.test.ts`'s header; comments in `spaces-b.ts` and `routes.ts`; `scripts/capture.ts`'s camera.
- [x] Checks on `13ff3a4`'s tree: `npm run verify` (735 unit tests, 126 e2e); the shots against main's at `9e47b70`, 30 of 64 changed, all along Weston's front, each read at native size.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`): no blocker or major finding; Claude's F1 to F4 repaired in `515de57`, where `npm run verify` passed.
- [x] Merged with main's newer work (work unit 15's follow-up, the canon sync and the review records) as `62ca6a1`: there `npm run verify` (744 unit tests, 126 e2e), `routes.spec.ts` three runs in a row at 1× and at 4×, and the shots against main's at `59313d0`, the same 30 images changed, all along Weston's front; the plain ends' cornice rendered at the court's two ends.
- [x] Review 1 (Codex and Claude, `reviews/1_implementation.md`) of the repairs: two minor findings and three nits (F5 to F9), repaired in comments and records, F8 recorded; `npm run verify` on the repaired tree.
- [x] Land: `tmp/land.sh` taken; origin's main had not moved since `62ca6a1`'s merge, so `748e9b6` went to it as a fast-forward; the Pages workflow built and deployed it. Gallery: the main checkout fast-forwarded (`tmp/ff-main.sh`), main's shots taken there (dirty only from another unit's reservation), the same 30 frames changed against the gallery's `59313d0` set, and the owner's gallery republished (version 15).

## Outcome

Complete. Weston's 1888 pavilion, its porch and the door stand at the floor map's place, Z −100.97 (`src/model/core/constants.ts` `WESTON_PAVILION_Z`), 2.68 m east of the model's old middle, in the middle of gallery 529, where the middles of the map's door, of its galleries along the front and of its court agree within 1 cm. The front's bays are laid out from the pavilion (`src/model/core/weston-facade.ts`): five on the west and four on the east, with plain ends of 3.13 and 3.37 m under the bays' cornice, since the model's front still ends on the 1880 building's lines. The 528/529 wall stands on its map line and `clearOf` is gone; the passage check in `src/model/core/weston-door.test.ts` holds the doorway clear, red with the door at the old middle. The door works and is walked as before: the walks, the collection's zones and the e2e follow `WESTON_DOOR`.

Merged to main at `748e9b6`, pushed through `tmp/land.sh` as a fast-forward of origin's main. `npm run verify` passed on `748e9b6`'s tree (744 unit tests, 126 e2e); on `62ca6a1`, the merge with main's newer work, which `748e9b6` changes only in comments and records, `npm run verify`, `routes.spec.ts` three runs in a row at 1× and at 4× and the shots passed, 34 of 64 within 9 of 255 in every channel against main's and the other 30 changed only along Weston's front, each read at native size. Reviews 0 and 1 (Codex and Claude) found nothing above minor; every finding is repaired but F8, which is recorded. The Pages workflow deployed `748e9b6`, and the owner's render gallery shows main's shots there (version 15).

Left for the owner: the front east of the pavilion's first bay, where photographs #33 and #35 show a front of another design, with granite columns and blind stone panels, and the model's three further arched bays and plain end stand in for it; and the front's extent, from −138.3 to −69.0 on the 1880 building's lines, 1.2 m further west and 4.2 m less far east than the map's court (−137.10 to −64.83), with the Kravis Wing's court ending on the same lines. Recorded, not changed (F8): the west plain end's cornice, like the front's other trims, runs 0.1 m past the Kravis Wing's park face. Outside this unit: `src/model/frame.ts:99` and `src/model/hunt/stair.ts:169` still point to `vaux-shell.ts` for the gallery 600 doorway's lining, which work unit 15 moved to `vaux-east.ts`.
