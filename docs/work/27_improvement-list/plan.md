# Work through the improvement list of 2026-11-11

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

On 2026-11-11 the owner asked for the most worthwhile improvements to the project, from the sides of aesthetics, user experience, visual quality and completeness, and then said: "Keep track of this list and work on all of them." and "Coordinate with the other session that is removing the animation of the building process. Do not step on each other."

This plan is that list and its one status record. The outcome: every item below is on origin's main, dropped with its reason, or waiting on a decision named here.

The list came from main's 64 standard shots at `75abdd3` read at native size, the live page at `2bfa83f` (both menus, a mid-step frame at t = 31.55 and 42.5, clicks on four objects), the viewer's lighting and material code, and a sweep of work units 0 to 25 for what their records leave open.

## Scope

The items, in the order of their worth as judged on 2026-11-11. Each one's status is under Implementation steps.

1. **Interior lighting.** Once a roof closes, a room is lit by a flat fill alone: no ambient occlusion, one sun with one 4096 shadow map over the whole site, three point lights. Sun patches under skylight grids are grainy, and a sliver of light runs down the Grand Staircase's side wall in two standard shots. Unit 28.
2. **First impression.** The page opens on a distant aerial view with no name and no sentence saying what it is; on a 390 px phone the model fills about a fifth of the screen's height.
3. **Wayfinding.** The View menu is 27 lines of text, nine of them "Photo: ..." cameras that exist for checking against photographs; walking starts from three places; no room is named on the floor plans or while walking; there is no map. The Astor Court and the roof garden are built but have no preset and no walking start.
4. **Surface detail.** Every material is one flat colour; at walking distance Weston's door is a brown rectangle.
5. **Artworks.** The landmarks (Diana, the Temple of Dendur, the choir screen) have no card, because they are fit-out and not catalogue pieces; all standing sculptures share one turned form; paintings are 8×8 colour grids. Unit 29.
6. **Touch and weaker devices.** Walking reads the keyboard alone, so a phone can look but not move (also open since work unit 2's "For the owner"); every frame time on record is from the RTX 4090; the page is a dark blank until it is ready.
7. **The build replay as a story.** Dropped on 2026-11-11: work unit 26 removes the build replay and its animation.
8. **Surroundings and sky.** The world ends at the site's edge (415 × 320 m); nothing stands across Fifth Avenue; the roof garden has no skyline; the sun is fixed at azimuth 140°, elevation 46°.
9. **Shell galleries.** Outside the dozen fitted spaces the floors are bare plates with partitions (the Egyptian, Asian, Islamic, Rockefeller, Wallace and American Wing period-room galleries). The non-goal stands: no gallery-by-gallery interior. The item is one generic kit applied by rule.
10. **Project presentation.** The README has no picture; the page has no description, preview image or icon.
11. **Fidelity leftovers the records hold.** See "Leftovers" below.

Excluded: the stated non-goals (AGENTS.md): no imported meshes, scans or photo textures, no runtime network assets, no gallery-by-gallery interior.

### The line with work unit 26

Another session removes the build replay in the worktree `remove-build-replay` (work unit 26). Seen there on 2026-11-11, uncommitted on `2bfa83f`: changes to `src/ui/*`, `src/main.ts`, `src/viewer/facts.ts` and `src/viewer/query.ts`, and `src/build/player.ts`, `src/ui/timeline-bar.ts` and `src/ui/label.ts` deleted.

Until unit 26 is on origin's main, this plan's work stays out of `src/ui/**`, `src/main.ts`, `src/build/**`, `src/viewer/facts.ts`, `src/viewer/query.ts`, the e2e specs for the replay, controls, menus and layout, and the replay parts of `docs/design/spec.md`, `README.md` and `AGENTS.md`. So no unit here adds a URL parameter or a `window.__met` fact before then. Which items wait for which of its milestones is under "What follows for this plan" below.

Two exceptions, granted to unit 29 on 2026-11-11. Four lines of `src/ui/art-card.test.ts` change (the catalogue's count in the header and in the assertion, and the list of records that name no maker with the comment over it), because `src/main.ts` builds the cards from `CATALOGUE`, so the landmarks' records must join the catalogue. And one closure of `src/main.ts` changes, the one that gathers a clicked artwork's pieces, which review 0 of unit 29 found following one step alone; the other session gave leave for it and said its own edits to that file are elsewhere.

That session answered on 2026-11-11. It lands in two milestones:
- A, expected within about two hours of the answer: the page without the replay (`src/main.ts`, `src/ui/**`, `src/viewer/facts.ts`, `query.ts`, `camera-rig.ts`; in `viewer.ts` only the bottom inset and the `rig.resize` call), `StepDef` without `focus` and `weight` (33 model files, `collection/place.ts`, `spaces-a.ts`, `spaces-b.ts`), `scripts/capture.ts` without the chapter and mid-build shots and without `t=`, every e2e spec and `helpers.ts` stripped of replay checks, and the docs (the spec, AGENTS.md, the README, the local rule that the build process is the product, retired at the owner's request). It does not touch `src/ui/art-card.test.ts`, the render path, `environment.ts`, `sun.ts` or `index.html`.
- B, a few hours after A: the timeline built once at rest (`src/build/timeline.ts`, `batch.ts`, `kit.ts`, `types.ts`; `motion.ts`, `stagger.ts` and `player.ts` deleted), `src/walk/walk-mode.ts`, `collision.ts`, `door-world.ts`, `src/viewer/doors.ts`, `art-label.ts`, `floor-view.ts`, `src/main.ts`, and by codemod every step's `motion:` and `stagger:` lines and the `order` argument of about 470 `kit.add` and `kit.addTagged` calls, with the tests that pass a `t`.

What stays, by its word: the step arrays and `COMPOSITION`, `StepDef`'s id, chapter, title, detail, year and build, `kit.add`, `kit.addTagged` and `kit.light`, the tags, the `?shot=1` contract and `window.__met.stats`.

What follows for this plan:
- A model change that lands before B is carried by that session's codemods; one that lands after B re-runs them from `tmp/wu26-codemods/` in the main checkout. So unit 29's first landing should land before B.
- When A lands, each worker merges origin's main and gates the merged tree before handing back.
- The page items (2, 3, 6) and the model items that add steps and pieces (9, 11) start after B, since they live in the files B rewrites.
- A landed on 2026-11-11 at `eacc0fb`. B is on hold since then: it rewrites `src/build/`, which the owner's permission settings block for that session, and that session has asked the owner whether to go on or stop at A. It asked that this plan's page and model work not be held for B meanwhile; it will say which way B goes. Until it does, nothing here starts in `src/build`, `src/walk/walk-mode.ts` or the steps' `kit.add` lines.
- Later on 2026-11-11 the owner said yes and B started, from origin's main at `0f79be9`, unit 29's landing A included. Until B lands this plan's work keeps out of `src/build/**`, `src/walk/walk-mode.ts`, `collision.ts`, `door-world.ts`, `src/viewer/doors.ts`, `art-label.ts` (unit 29's two comment lines excepted), `floor-view.ts`, `src/main.ts`, and every step's `motion:` and `stagger:` lines and the `order` argument of `kit.add` and `kit.addTagged` under `src/model`. The two workers running then (unit 28, and unit 29's landing A2) were told, and that session was told what each of them touches near its list: A2's tests that call the walk world and `evaluate`, and unit 28's repairs in `src/model/hunt/roof.ts` and `walls.ts`. What lands before B is carried by B's codemods; what lands after merges B and re-runs them from `tmp/wu26-codemods/` in that session's worktree.

- Milestone B landed on 2026-11-11 at `196612d`, and work unit 26 is complete. The keep-out list is lifted. This plan's branches merged it the same day: the coordinator's (three conflicts, in the spec, the devlog and `fit-out-labels.test.ts`, which now builds its walk world by `collisionMeshes(steps)` with no `evaluate`), and each code worker's own. That session's codemods are kept in the main checkout's `tmp/wu26-codemods/` for anything written against the old engine. The page items (2, 3, 6) and the model items (9, 11) no longer wait for it.

Shared: `tmp/gate.sh` for verify, e2e, shots and sweeps; `tmp/land.sh` for the landing slot; one `MET_PORT` per worktree (5340 the coordinator, 5341 lighting, 5342 artworks, 5343 the timing gate).

The gate itself, work unit 30 (`docs/work/30_timing-gate/plan.md`): on 2026-11-11 the owner chose to split the timing budgets out of `npm run verify` ("Split them"), after runs on trees that changed nothing a frame runs failed on timing checks alone while several sessions loaded the machine. A worker ("timing-gate", branch `worktree-agent-a6ce13e3955fa859e`) built it; it landed on 2026-11-11 after three review rounds, and every landing of this plan after it runs `npm run budgets` as that unit's rule says. Next for the gate: its browser tests run one at a time because they used to hold frame budgets; trying them on several workers is the way to shorten the queue every landing waits in.

### Limits the sweep found that bear on the items

- The core area stands at 128 of its 130 meshes (`src/model/core/core.test.ts` prints it; the sweep's "130 of 130" came from work unit 21's record and was wrong by 2026-11-11), so anything added in the 1880 to 1894 core has two meshes to spend before it must reuse one or the area's share is raised.
- The model is at 744 of 900 meshes and 1.61M of 3M triangles.
- Whose the caps are: the spec's Budgets hold the model's totals (900 meshes, 3,000,000 triangles) and the collection's share (110 and 600,000); the areas' caps are the coordinator's assignments of 2026-10-11, as each area's test says in its header (`src/model/core/core.test.ts`, `mmw/mmw.test.ts`, `roche-north/roche-north.test.ts`). An earlier line here gave them to the owner, wrongly. So an area's share may be re-assigned by the coordinator inside the spec's totals, with the reason written in the test's header; the spec's numbers are the owner's.
- One such re-assignment, 2026-11-11: the MMW area's mesh cap goes from 160 to 170 with unit 29's landing B. The area's test counts the collection's steps in its three spaces (the Arms and Armor court, the Greek and Roman court, the Greek galleries), whose forms grow from 8 meshes to 19 inside the collection's own cap (65 of 110 by the worker's count), while the cap dated from when they had two to four forms each. The model stands at 771 of 900 by the same count.
- Three of the eight step lights are used.
- The walking frame budgets pass on a quiet machine and have failed on a loaded one (16.78 ms in work unit 25, 19.5 and 17.7 ms in work unit 23), so item 1's cost must be measured, not assumed.

### Leftovers (item 11)

Put to the owner and not answered:
- Work unit 16, F-owner-1 to 4: the choir screen stands at `SCREEN_Z` −99.4 where the floor map and both photographs put it at about −106.12; the preset `int-medieval-hall-east` cannot reproduce photograph P8; the hall's end doorways are 4.4 m wide where the map draws 2.28 m; the end windows' splayed plaster surround is not built.
- Work unit 23, review 0, F5: the cross hall is 0.8 m shallower than the map's room.
- Work unit 20, F1: while an e2e run lasts, any local process can find the browser server's endpoint.
- Work unit 14's limit: with the pointer locked, no on-screen control answers the mouse.

Recorded and not changed:
- The Petrie Court's east wall is plain where photographs #33 and #46 show three windows behind a balcony, and its south wall has no door frames, cornice between storeys, pilaster capitals or colonnade entablature (work units 24 and 25).
- Weston's end blocks: heights are estimates, the ground storey's small windows are not modelled (work unit 21).
- The Hunt wing's back is open between the core's east wall (18.0 m) and its roofs (20.1 m) (work unit 23, review 1, F13).
- The 1880 fronts: the stair tower and the north arcade's wider windows are not modelled; the impost band and string course lie in one plane with the pilaster strips and can flicker (work unit 15).
- Gallery 600: the doorway's mouldings, the blind arches and the blue walls are not modelled, and the room is lower than the real one.
- The Vélez Blanco patio is a void.
- The Greek and Roman court's columns are fluted where the research reads photograph P6's as smooth (an inference; to be checked against the photograph).
- The Astor Court's photographs (#31, #32) are not viewed.

## Approach

The coordinator plans, briefs, accepts and lands. Each item is built by a worker in its own worktree, lands on its own, and gets an independent review where it is substantial (`../fleet/docs/skills/multi-cli-review.md`). A unit that gets a review has its own work folder; a small one is recorded here.

Order: lighting first, since it sets the tones that surface detail is then tuned on. Artworks run beside it, since their files are apart. Surface detail and surroundings follow lighting (they share the look, and `src/viewer/environment.ts`). The page items follow unit 26.

Decisions the owner made on 2026-11-11, each from a question with its options laid out:
- Item 5: paintings are sampled at 16×16, up from 8×8. They stay colour data, not a photo texture.
- Item 8: the surroundings are environment, drawn like the sky and the workspace ground: outside the model, its budgets, the section cut and the floor views.
- Item 10: one small render may be committed for the README and the link preview (a JPEG under 300 KiB, retaken by hand when the look changes). The invariant in AGENTS.md that keeps renders out of git gets this one exception when the item lands.
- Item 5, later the same day: the Temple of Dendur's card is to read 10 BCE. The Met's record gives `objectDate` "completed by 10 CE" beside begin and end dates of −10, and the owner chose to correct the card ("Correct to 10 BCE"), as a recorded override of the record's text.
- Item 11: all four groups of leftovers are to be done: the Medieval hall (work unit 16's four findings), the Petrie Court's walls, gallery 600 and the Vélez Blanco patio, and the smaller ones (the Hunt wing's open back, Weston's end blocks' windows, the 1880 fronts' stair tower and flicker, the Greek court's columns checked against their photograph).

### Blocked on 2026-11-11: the account's usage limit

Both workers stopped mid-task when the account reached its usage limit for the model they ran on (HTTP 429, "You've reached your Fable limit"). Nothing was lost: the coordinator committed each worker's tree as it stood, as a snapshot marked unverified, on the worker's own branch.

- Unit 28, lighting: branch `worktree-agent-ae95d3eb21fe7823e`, snapshot `463fb0e` over `4f0e630`, worktree `.claude/worktrees/agent-ae95d3eb21fe7823e`. It had committed nothing before. The snapshot holds the ambient occlusion pass (`src/viewer/ao-pass.ts`, `ao-shaders.ts`), `lit-materials.ts`, `shadow-filter.ts`, `src/model/sun-leaks.test.ts` with repairs in `src/model/hunt/roof.ts` and `walls.ts`, `tests/e2e/light.spec.ts`, and its edits to the spec, AGENTS.md and unit 28's plan, which records its approach and findings. Its last words: typecheck and lint pass, about to run `light.spec`. No gate has run on the snapshot.
- Unit 29, artworks: branch `worktree-agent-a419a2463f2a69209`, snapshot `90a3afc` over the gated `41857a4`, worktree `.claude/worktrees/agent-a419a2463f2a69209`. The snapshot holds part of review 1's repairs (F10, F11, F13, F14, F15), mid-edit. Nothing past `41857a4` may be merged until they are finished and gated.

To go on, a worker is started again on each branch, by resuming the same agent once the limit lifts or by a new one that reads this plan, the unit's plan and the snapshot's diff. The owner chose on 2026-11-11 to wait for the limit and resume the same workers ("Wait, then resume"), not to restart them on another model. Both were sent their resume instructions the same day, each told to carry on from its snapshot, merge origin's main at `0f79be9` and commit at every stopping point.

## Acceptance criteria

- [ ] Each item that lands: its criteria met as its own plan or this one states them, `npm run verify` green on the merged tree, its renders read at native size, the gallery republished where a render changed, a devlog line.
- [ ] Every item is on origin's main, dropped with its reason, or blocked on a decision named above.

## Implementation steps

- [ ] 1. Interior lighting: unit 28, worker "lighting" dispatched 2026-11-11 from `06b3124`, `MET_PORT` 5341. Stopped at the snapshot `463fb0e` by the usage limit (Blocked, above) and resumed the same day; at `768528b` on its branch it was moving the occlusion prepass onto the model's batches. Handed back on 2026-11-11 at `f41c82b` with its gates green (756 unit tests, 106 e2e, the routes and the walk three runs each at 1× and 4×). The coordinator read all seventeen pairs and takes the look: the sliver gone, the sun patches clean, depth at corners and bases. Review 0 (Codex rejecting on one major finding, Claude approving with findings) and the coordinator's own reading gave nine findings, returned the same day; the unit lands after its repairs, a one-lane check of them and `npm run budgets`. The large rooms stay evenly lit: a second stage, an ambient term that knows the sky, is the worker's design note and not part of this unit.
- [ ] 2. First impression: unit 31 (`docs/work/31_first-impression-and-wayfinding/plan.md`), its landing B: the opening view on the Fifth Avenue front, fitted to wide and to tall screens, and a title block. Worker "page" dispatched 2026-11-11 from `328a9c2`, `MET_PORT` 5344, on landings A and B together.
- [ ] 3. Wayfinding: unit 31, its landings A (one table of named places, the View menu rebuilt on it with a walking start for every place, the reference photographs in a closed group, the Astor Court and the roof garden) and C (names on a floor's plan and while walking).
- [ ] 4. Surface detail: after item 1.
- [ ] 5. Artworks: unit 29, worker "artworks" dispatched 2026-11-11 from `06b3124`, `MET_PORT` 5342, on landing A (the landmarks' cards). Landing A, the four landmarks' cards, is on origin's main (2026-11-11) after two review rounds and the coordinator's own gate run at `d9323d8`. Landing A2 (review 1's findings F10 to F15 and the temple's date to 10 BCE) was handed back at `b88746c`. Four gate runs on the merged tree failed on one timing check each, every functional check passing; a fifth, on a quieter machine, passed in full at `b34b968`, and A2 landed on 2026-11-11 (unit 29's plan). Landing B (more forms) was dispatched on 2026-11-11 on top of A2, to the same worker; landing C (paintings at 16×16) follows it. Landing B was handed back at `4d4c6e3` the same day, gated green by the worker, 48 forms for nine; the coordinator read all 94 rows of its contact sheet against the objects' images and accepted the forms; A2's one-lane check approved with two minor findings (review 2), and both lanes read B. Then the owner, looking at the live page with the old forms and the 8×8 paintings, wrote: "The paintings are way too low res" and "Statues are also way too low poly". What follows from that: B's repair round also takes every round part of a figure from 8 sides to 16 (the MMW area's triangle share goes from 500,000 to 560,000 for it, the coordinator's re-assignment inside the spec's totals); a new landing B2 gives each figure one continuous skin in place of jointed parts, prototyped on three figures first; and landing C's resolution is the owner's to choose again, from a comparison of 8, 16, 32, 64 and 128 cells shown on 2026-11-11 (16×16, chosen earlier that day, reads as a blur beside the photograph).
- [ ] 6. Touch and weaker devices: its own unit, after unit 31's first landing (both live in `src/ui/**`) and, for a quality profile, after item 1 (it turns the new light's passes down). A run on a phone or a weaker GPU cannot be made from this machine. It also takes one finding of work unit 30's red proofs (`docs/learning/gate-proofs.md`, "The timing budgets"): `tests/e2e/mouse-look.spec.ts`'s last check, that a finger's tap on the Walk toggle under the mouse's lock clicks nothing, pins a behaviour of Chrome's that depends on frame timing: it failed 5 runs of 5 with every frame made 20 ms slower and passed without. The unit decides what that tap should do and tests it without that dependence.
- [x] 7. The build replay as a story: dropped, see Scope.
- [ ] 8. Surroundings and sky: unit 32 (`docs/work/32_surroundings-and-sun/plan.md`), opened on main at `e8454e5` with its research, `docs/research/surroundings.md` (handed back at `b480696` on 2026-11-11, read by the coordinator and accepted; its fetched records are kept, ignored, in the main checkout's `research/cache/surroundings/`). Three landings: the data, by a script run by hand from the city's footprints, the Forest Service's canopy and the Geological Survey's ground, with no OpenStreetMap data so the generated file carries no share-alike terms; the drawing, after item 1; the sun by date and time. Worker "surroundings" dispatched 2026-11-11 from `e8454e5`, `MET_PORT` 5345, on the data.
- [ ] 9. Shell galleries: after item 4.
- [ ] 10. Project presentation, in two parts, small enough to be recorded here. First, by the coordinator on 2026-11-11, landed that day with unit 29's A2 on one gate run (724 unit tests, 93 e2e at `b34b968`): the page's name ("The Met Fifth Avenue: a procedural 3D model", where it read "The Met — build"), a description that says the model is unofficial, the Open Graph tags without an image, and an icon (`public/icon.svg`, a hand-written drawing of the Fifth Avenue front, read at 16 to 180 px on light and dark; the first drawing's four blocks over the cornice read as a castle and were dropped). Checked: `npm run build` writes `dist/icon.svg` and both pages point at `./icon.svg`. Second, after item 1 so the picture shows the new light: the one committed render (a JPEG under 300 KiB) in the README and as the link preview's image, a sentence in the README that the project is not The Met's, and the exception in AGENTS.md's invariant.
- [ ] 11. Fidelity leftovers, all four groups (their research handed back at `4d2f870` on 2026-11-11, accepted and merged, its two new exterior photographs renumbered #72 and #73 since the surroundings' research had taken #68 to #71), each starting when a worker is free: the Medieval hall first, since its four findings were already put to the owner; each group gets its own work unit when it starts. The core's mesh budget (128 of 130 used) bounds the Medieval hall and gallery 600. Its research runs ahead of it: on 2026-11-11 a worker ("research-leftovers", documents only) was set to put into `docs/research/` what a modeller needs for each leftover, the Vélez Blanco patio and the Astor Court's two unviewed photographs among them.

## Outcome

Pending.
