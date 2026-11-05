# Weston's front: its projecting end blocks and four-window arched bays

Status: active
Owner: Claude Code desktop session optimistic-mayer-d1fe0b (2026-11-05)
Created: 2026-11-05
Updated: 2026-11-05

## Problem and outcome

Since 2026-10-11 the model gave Weston's 1888 south front, the Petrie Court's north wall, a row of nine arched bays of three windows each, five west of the entrance pavilion and four east. Work unit 19's reading of the court's photographs found one arched bay east of the pavilion and then a front of another design, and the owner chose to have it modelled ("Yes, model it", 2026-11-04, the answer to "Model the front east of the pavilion the way photographs #33 and #35 show it?").

What the sources show (`docs/research/interior.md`, Weston's 1888 front): the front has one arched bay each side of the pavilion, each of four windows under a four-light arched window, and at each end a block that projects about 1.2 m into the court: three bays, each a dark granite column between two windows (bricked up since) between brick piers, under a stone entablature at the main floor's head, and above, blind stone panels between brick pilasters with stone console capitals, under the front's cornice, which returns round the block. Weston's approved elevation of 1885 (Heckscher fig. 28) and his 1888 first-floor plan (fig. 26) draw it so; the photograph of about 1895 from the south-east (fig. 35) shows it built; #33, #35, the 2005 view from the east end (Commons `Metropolitan fg02.jpg`) and a 2011 view of the east end (Commons `Petrie European Sculpture Court (6387517635).jpg`) show it today. The west half is the east half's mirror (fig. 26, fig. 28, fig. 35, #35), so the unit models both ends.

Outcome: Weston's front in the model reads as these sources show it: pavilion and porch as before, one four-window arched bay each side, and the two projecting end blocks with their colonnades and blind panels; the door and every walk through the court work as before.

## Scope

Included: `src/model/core/weston-facade.ts` (the arched bays, the trim of the centre section) and a new `weston-ends.ts` (the end blocks), the constants and the material they need, the Petrie Court's camera preset, which the east block's podium now stands under (`src/viewer/presets.ts`), the tests whose bounds the projection changes (`core.test.ts`'s containment, the closure test's glass count), the records (`interior.md`, `interior-images.md`, the spec's World frame rule and Weston's door item, the devlog), the owner's render gallery. The court roof's gutter stays on the old front's coping line (`roche-south/kravis.ts`).

Excluded: the front's extent (the model's front runs on the 1880 building's lines, −138.3 to −69.0; the real one is about 70.8 m long and symmetric about the door, so the model's west end block is longer than its east one; recorded, open for the owner); the pavilion and porch (unchanged); the north wing's elevations, which share the old bay width; the windows' 1888 state (glazed until the court was built in 1990; the model shows today's bricked-up bays from 1888, as it does the 1880 building's bricked side walls).

## Approach

- Sources and measures: Heckscher figs. 26 (plan), 28 (elevation) and 35 (photograph), read at full size; #33, #35, fg02 and the 2011 view. The plan gives the end blocks about 19 m each and the centre section about 32.6 m on a front of about 70.8 m (its inner span scaled to the floor map's galleries, ±34.18 m); the elevation agrees (19.2 and 32.1 m). From the elevation: the arched bay about 8.7 m, a brick strip of 0.9 m, and the end block's parts in the ratio 2.8 : 3.4 : 1.3 : 3.4 : 1.3 : 3.4 : 3.4 (inner pier, bay, pier, bay, pier, bay, corner pier). The projection, 1.2 m, from the end block's return face in #33 (its courses level and its frieze's roundels round, so seen face-on) and again in #35; the bays' recess, about 0.5 m, from the piers' side faces in #35 and the 2011 view.
- The model keeps the pavilion (12.4 m) and centres everything on the door (Z −100.97). Arched bays 8.7 m each side, then the 0.9 m strip, then the end blocks to the court's ends: the east block 16.2 m to −69.0, the west block 20.5 m to the Kravis Wing's pier at −137.3; each block's parts scaled to its length, its columns 0.6 m whatever the scale.
- Each block: a stone podium to 1.0 m over the main floor; brick piers to the entablature, the bays recessed between them; in each bay a Tuscan column (plinth, base, plain shaft of dark granite, capital) carrying the entablature, which is the main floor's head band carried round the block; above, brick with pilasters on stone bases with console capitals, a stone panel on a moulded sill in each bay, a stone frieze with two roundels on the return, and the front's cornice and coping, returned round the block.
- The arched bays: four windows and four dado roundels, a four-light arched window under a wider arch whose keystone reaches the cornice.
- The core area is at its budget of 130 instanced meshes (`core.test.ts`, the coordinator's assignment of 2026-10-11), so the blocks add one mesh and save one: the columns are the core's shared stone box and cylinder with a dark granite cylinder for the shafts; the cornice is the arched bays' moulding scaled along each run, so it does not mitre at the blocks' corners; the three arches' voussoirs are one geometry.

## Acceptance criteria

- [ ] The front as the sources show it: one four-window arched bay each side of the pavilion; the two end blocks projecting 1.2 m, each with three column bays and three blind panels; the cornice returned round them; nothing else on the front moved.
- [ ] Renders from the court matched against #33, #35, fg02 and the 2011 view, read at full size, with what still differs recorded.
- [ ] Every gate green: `npm run verify` on the final revision; `routes.spec.ts` three runs in a row at 1× and at 4×; the containment test's new allowance tight to the end blocks and red past it.
- [ ] Records: `interior.md`, `interior-images.md` (the new photographs and figures, read at full size), the spec's Weston's door item, the devlog.
- [ ] Independent review by Codex and Claude with its findings resolved; merged to main and pushed through `tmp/land.sh`; the owner's render gallery republished.

## Implementation steps

- [x] Read the sources (figs. 26, 28, 35; #33, #35, fg02, the 2011 view) and settle the layout.
- [ ] Model: the end blocks, the arched bays, the gutter; tests and their bounds.
- [ ] Gates, shots against main's, renders matched to the photographs.
- [ ] Records.
- [ ] Review, land, gallery.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
