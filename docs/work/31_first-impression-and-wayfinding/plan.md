# The page's first impression and wayfinding

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

Items 2 and 3 of the improvement list (`docs/work/27_improvement-list/plan.md`). They waited for work unit 26's milestone B, which is on main at `196612d`.

Item 2, the first impression. The page opens on `aerial-ne`, a fit of the whole site (415 by 320 m) from the north-east, with no name and no sentence saying what it is. At 390 by 844 the model fills about a fifth of the screen's height.

Item 3, wayfinding. The View menu lists 27 cameras in two groups, nine of them "Photo: ..." cameras that exist for checking renders against photographs. Walking starts from three places. No room is named, on a floor's plan or while walking. The Astor Court and the roof garden are built and have no camera and no walking start.

Outcome: a visitor who opens the page knows within a few seconds what it is and what to do, on a desktop and on a phone, and can get to any modelled space by its name, to look at it or to walk in it.

## Scope

In: `src/ui/**`; `src/viewer/presets.ts`; `src/walk/spawns.ts`; a new table of named places; `src/main.ts`'s wiring; `src/viewer/floors.ts` and `floor-view.ts` where the plan's names need them; the query contract if a new parameter is needed; the e2e specs that hold the page (`layout`, `menus`, `camera`, `walk`, `walk-screen`, `floors`); `src/model/reach.test.ts`; `scripts/capture.ts`'s standard set; the spec's Page and Query sections; the README's usage; AGENTS.md where a gate's meaning changes.

Out: the model's geometry (if the reach gate shows a doorway missing on the way to the Astor Court, stop and report: that is item 11's kind of work); the render path, materials and lights (work unit 28 is in them); `src/model/collection/**` (work unit 29); touch walking, a loading indicator and a quality profile (item 6, its own unit); a minimap while walking.

Limits: every existing `view=` and `spawn=` id keeps working, since links to them exist. The page still fetches nothing. `?shot=1` still draws a requested state with no animation.

## Approach

The design is the coordinator's, from the page as it stood at `196612d`, and open to the owner's veto. The worker may change a detail where the rendered page shows a better one, and records the change here.

Landing A, the places and the menu:
1. One table of named places, one for each modelled space a visitor would ask for by name: the plaza, the Great Hall, its balcony, the top of the Grand Staircase, European Paintings (gallery 600), the Temple of Dendur, the American Wing's court, the Arms and Armor court, the Medieval Sculpture Hall, the Lehman Wing's court and its paintings room, the Petrie Court, the Greek and Roman court, the Greek galleries, the Astor Court and the roof garden. Each has a short name and the museum's own name with its gallery number (from `docs/research/interior.md`), its floor, a camera (today's preset, or a new one) and a walking start on its floor. The menu, the walk spawns, the plan's names and the walking caption all read this table, so no name is written twice.
2. The View menu, in this order: Outside (the four fitted views and the roof garden); Inside, by floor; then the section cut. A place is one row: its name shows its camera, and a walk button at the row's end starts a walk there. The nine "Photo: ..." cameras move into a group at the menu's end, "Reference photographs", closed at first and opening in place, each keeping its id. The panel scrolls inside the screen at 390 by 844.
3. Every interior walking start is reached by the reach gate from the Great Hall, and every start, the roof garden's too, is a place where the walker stands at rest.

Landing B, the first impression:
4. The opening view is the Fifth Avenue front from the south-east, low enough that the front reads as a front. On a screen wider than tall the whole building's length is in view; on a screen taller than wide the entrance front, its three arches and the steps, fills the width. It is a fitted camera, fitted again on a resize as today's is. `aerial-ne` stays in the menu and in `view=`.
5. A title block at the top of the page: the name ("The Met Fifth Avenue"), one sentence saying what it is and that it is unofficial, and what to do (drag to look around, Walk to go inside). It leaves at the first drag, key, wheel or menu use and does not come back. Under `shot=1` the default page shows it, so the standard shots of the page do, and a page with `view=` or `walk=1` does not.
6. The page's name stays on screen, small, after the block leaves.

Landing C, names:
7. While walking, a caption names the place the walker enters, for a few seconds at each change, from the table's plan boxes on each floor.
8. In a floor's view and the top view, each place on that floor carries its name at its place on the plan, and a click on a name starts a walk there. Names never cover a control, and thin out where they would collide at 390 by 844.

## Acceptance criteria

Landing A:
- [ ] One table holds every named place; the menu, `SPAWNS` and the tests read it.
- [ ] Every preset id and spawn id on main at `196612d` still answers `view=` and `spawn=`, by a unit test that lists them.
- [ ] At 1280 by 720 and 390 by 844, through real input: every camera and every walking start is reached through the menu; the reference group is closed at first and opens in place; the open panel stays inside the viewport and scrolls; `layout.spec`'s control inventory holds the new controls.
- [ ] `src/model/reach.test.ts` reaches every interior walking start and camera from the Great Hall, and a unit test sets the real walker down at every start and finds it at rest at the height written.
- [ ] The Astor Court and the roof garden each have a camera and a walking start, checked against their photographs where `docs/research/interior-images.md` has them viewed.
- [ ] The standard shots hold the new cameras and walking starts, read at native size by the worker and again by the coordinator.

Landing B:
- [ ] The opening frame, measured in a test from the camera and the model's bounds: at 1280 by 720 the building's projected length spans at least 80% of the canvas's width; at 390 by 844 the entrance front's projected width spans at least 80% of it. A resize across the boundary between wide and tall fits the view again.
- [ ] The title block: shown on a first load without `view=` or `walk=1`; gone after the first drag, key, wheel or menu use; drawn without animation under `shot=1`; covering no control at either size.
- [ ] The old links (`t=0`, `step=1`, `replay=1`, `autoplay=1`) still show what the default page shows.

Landing C:
- [ ] The table's plan boxes: every walking start lies in its own place's box, and no two boxes on a floor overlap, by a unit test.
- [ ] Walking from one named place into the next shows the next one's name once, through real keys, for two pairs of places.
- [ ] In each floor's view at both sizes: every name of that floor is drawn at its place, inside the viewport, over no control and over no other name; a click on a name starts the walk at that place.

Every landing:
- [ ] `npm run verify` is green on the merged tree through `tmp/gate.sh`, and `npm run budgets` as work unit 30's rule asks once that unit is on main; no test is weakened.
- [ ] The spec's Page and Query sections, the README's usage and AGENTS.md's gate lines say what the page now does.
- [ ] An independent review of the landing's exact revision has no finding left that matters.
- [ ] A devlog line; the gallery republished, since the page's shots change.

## Implementation steps

- [ ] Worker: landing A, handed back.
- [ ] Coordinator: read the shots, review, accept, land, gallery, devlog.
- [ ] Worker: landing B, then C, each handed back and landed the same way.

## Outcome

Pending.
