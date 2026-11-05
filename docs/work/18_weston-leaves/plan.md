# Weston's door leaves at the porch's front

Status: in progress
Owner: Claude Code desktop session optimistic-mayer-d1fe0b (2026-11-04)
Created: 2026-11-04
Updated: 2026-11-04

## Problem and outcome

Work unit 17 rebuilt Weston's porch at the April 1888 drawing's size and left the door's leaves in the 1888 wall, 0.3 m behind its face and 2.5 m behind the porch's architrave, at the end of a stone passage 2.43 m deep, as its brief asked. Photograph #33 at full size shows the east leaf, open a quarter turn, its hinge's lit gap about 0.35 m behind the architrave's face, and the 1888 plan draws the door at the porch's front, a vestibule behind it (`docs/research/interior.md`, Weston's 1888 door). The owner chose to move the leaves there (2026-11-04: "Move the leaves", their answer to work unit 17's closing question).

Outcome: the door's frame and leaves stand in the porch's doorway with the leaves' hinges about 0.35 m behind the architrave's face, so the porch is a vestibule closed at its front and open behind it through the 1888 wall's lined opening into gallery 529; the door still opens a quarter turn inward only, stops the walker closed and lets it through open; and the closed leaves shade what lies behind them.

## Scope

Included: the door's place (`WESTON_DOOR` in `src/model/core/weston-facade.ts`, from the porch's `DOOR` and `DOOR_FRAME_OUT` in `weston-porch.ts`); the leaves' shadow (`core.westonDoorWood` in `src/model/core/materials.ts`); what follows the door's place (R7's end and the walk tests' places, the placement test's passage zone); the gates whose bounds or red proofs the move changes (door-fit's header, a new check that the doorway's passage stays clear, now that the swing no longer reaches gallery 529, and a frame budget for Weston's swing, which now redraws the shadows); comments; the spec's Doors items; `interior.md`; `gate-proofs.md`; the devlog.

Excluded: the door's place along the front, 2.68 m west of the floor map's (left by work unit 17's brief, still the owner's to decide); the 1888 wall's opening, lining and threshold, kept as they are behind the vestibule; the porch itself.

## Approach

- The leaves' place. The door unit's leaves turn about their back face, 0.095 m behind the frame's front (`src/model/lib/window.ts`: a 0.12 m frame, 0.07 m leaves in its middle). With the frame's front 0.25 m behind the architrave's face (`DOOR.frame`), the hinges stand 0.345 m behind it, where #33 shows them (about 0.35 m: the lit gap at the east leaf's hinge 45 px inside the opening's east edge, where the porch's depth runs about 128 px a metre). The frame's front is 1.96 m out from the brick face, X −51.66; the vestibule behind it is 1.84 m deep. Open, each leaf lies along its reveal from 1.87 m out back to 0.30 m out, inside the porch.
- The shadow. A probe of the sun's rays through the finished model's casters (`tmp/probe/sun.probe.ts`, not committed; the leaves cast none): the sun reaches the porch's floor from its front back to 1.01 m out from the brick face and its west reveal back to 0.97 m, up to 4.65 m, and nothing of its east reveal or of gallery 529. With the frame's front at 1.96 m, 0.88 m² of that floor and 2.2 m² of that reveal behind the closed leaves would be sunlit through a shut door; with it 0.9 m out or less, none. Options weighed: the leaves 0.9 m out or less (no sun behind them, but a metre from the evidence); leaves that cast only while closed (a new rule for the door layer); shadowless as before (sun through a shut door). Chosen: the leaves cast a shadow. The door layer already redraws the shadows at every frame of a swing whose leaves cast (`src/viewer/doors.ts` `sync`), so the change is the material alone; the entrance's leaves stay shadowless.
- The cost. Standing 0.5 m before the leaves in the court, the slowest frame of Weston's swing took 6.7 to 9.0 ms of work in three runs, and 4.3 to 5.6 ms in three runs with the leaves casting none, run alternately (2026-11-04). A new test in `tests/e2e/doors.spec.ts` holds it under 16.7 ms, opening and closing, as the entrance's.
- The walk. `WESTON_APPROACH` stays 3.5 m out from the frame on the door's axis, now X −55.16, 3 m before the pedestals; R7's last leg runs there, within the court's artwork-free stretch (Z −109..−98). The unit walk starts there as before. The e2e walk from the court goes on through the porch into gallery 529, let go a metre past the old front's inner face; the walk back starts inside the porch, since from gallery 529 the open leaves are out of the look target's reach.
- The 528/529 wall stays where `clearOf` moves it, on the doorway's west reveal's line: on the map's line it would stand in the doorway's passage at the old front's inner face. The swing no longer reaches it, so door-fit cannot see it; a new check in `src/model/core/weston-door.test.ts` sends rays along the open passage, which meet nothing.
- The placement test's passage zone runs from 6 m before the frame to 6 m past the old front's inner face, as the party walls' passages do, where 6 m either side of the frame would have shortened it inside gallery 529 from 5.3 m to 3.0 m.

## Acceptance criteria

- [ ] The frame and leaves stand in the porch's doorway, the hinges 0.345 m behind the architrave's face; the door opens a quarter turn inward only, stops the walker closed and lets it through open into gallery 529 and back (`src/model/core/weston-door.test.ts`; the Weston walks of `tests/e2e/routes.spec.ts`).
- [ ] The leaves cast a shadow, and their swing asks a shadow pass at every frame (`src/model/doors.test.ts`); the slowest frame of the swing is under 16.7 ms of work from the court, opening and closing (`tests/e2e/doors.spec.ts`), red with work planted on the frames that redraw the shadows.
- [ ] Open, the doorway's passage is clear from before the porch through the old front into gallery 529 (`src/model/core/weston-door.test.ts`), red with the 528/529 wall on the map's line; door-fit red with the porch's doorway 2 cm narrower or lower than the frame.
- [ ] Every gate green: `npm run verify` on the final revision; `routes.spec.ts` three runs in a row at 1× and at 4×.
- [ ] The standard shots compared with main's, every changed image read at native size.
- [ ] Records: `interior.md` (the leaves moved, the door's place along the front still open), the spec's Doors items, `gate-proofs.md`, the devlog.
- [ ] Independent review by Codex and Claude with its findings resolved; merged to main and pushed through `tmp/land.sh`; the owner's render gallery republished.

## Implementation steps

- [x] Probe the sun behind the leaves; measure the leaves' place on #33 again at native size.
- [x] Model: `weston-porch.ts` (`DOOR.proud`, `DOOR.frame`, `DOOR_FRAME_OUT`), `weston-facade.ts` (`WESTON_DOOR`), `materials.ts` (`westonDoorWood` casts); comments in `galleries.ts` and `routes.ts`.
- [x] Tests: `weston-door.test.ts` (the passage's check; red proofs: the way back held 4 s, the feet at X −53.853; the 528/529 wall on the map's line, 16 rays meeting its end at X −48.70), `doors.test.ts` (Weston's swing asks a shadow pass), `door-fit.test.ts` (header; red with the porch's doorway 2 cm narrower, and 2 cm lower), `placement.test.ts` (the passage zone), `routes.spec.ts` (the Weston walks), `doors.spec.ts` (Weston's swing's frame budget; red at 41.0 ms with 40 µs planted for each draw call on shadow frames).
- [x] Records: the spec's Doors items and checks, `interior.md`, `gate-proofs.md`.
- [ ] `npm run verify` through `tmp/gate.sh`; `routes.spec.ts` three runs in a row at 1× and at 4×; the shots compared.
- [ ] Review by Codex and Claude, findings resolved.
- [ ] Land through `tmp/land.sh`; the devlog; the gallery republished.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
