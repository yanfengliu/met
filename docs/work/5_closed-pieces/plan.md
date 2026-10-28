# Pieces closed along vertical lines

Status: active
Owner: Claude Code desktop session awesome-lovelace-db4c00 (2026-10-27)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Review 2 of work unit 3 (`docs/work/3_weston-door-head/reviews/2_implementation.md`) found two pieces open along vertical lines and deferred them here. `openWall` (`src/model/core/arches.ts`) skipped its bottom face, so a vertical line crosses every wall it builds an odd number of times (F14). By the spec's parity rule (Walk mode: When the build moves) such a wall has no inside, so the walk's settle never finds a walker built into it: a probe kept a walker inside the brick of Weston's pavilion as `wing-b-south-facade` completed. `archedPassage` (`src/model/hunt/shapes.ts`) left its feet open, so a top view cut between 10.97 m and the gallery 600 passage's crown shows each jamb's Hunt half see-through (F13).

Outcome: both closed; a gate that the pieces `openWall`, `holeLining` and `archedPassage` build are closed along vertical lines, its bound named; a real-sequence settle case; and the bound `src/walk/settle.test.ts` states corrected.

## Scope

Included: `openWall`'s bottom face, with each door's opening left out; `archedPassage`'s feet; the closure check `openAlong` and its fixtures; the gate on the real sequence; the settle case; the notes in the spec and AGENTS.md.

Excluded: every other builder's open pieces. The coordinator decided this on 2026-10-27, when the probe below showed the class to be about 60 builders wide. Closing them all would change every area's geometry, the triangle budget and most renders, a product-scope change the owner has not asked for. The coordinator puts that to the owner as a task of its own.

## Approach

`openWall` gets a face looking down at y = 0. It covers the wall's footprint less each door's opening. Behind a blind door it leaves out only the niche. Doors must stand at least 1 mm apart. Where two touch or cross, the front and back faces can seal one doorway, so `openWall` refuses them on every call, before its cache (reviews 0 to 3, F2, F7, F11, F12 and F18). Its cache key tells a blind niche from a door through the wall (F19). Windows are not checked against each other or the doors, and a round window on the base counts as a window. Where a window touches a door or another window, the faces can seal part of one too (F16). No caller has holes that touch: the nearest two on one wall stand 0.147 m apart. That check is left out of this unit (F23). `archedPassage` keeps its sill edges, whose faces look down, as `holeLining` does since work unit 3.

The check (`openAlong`, `src/model/lib/check.ts`) reads the whole plane rather than sampled lines. The parity of the crossings changes only across the projection of an edge that an odd number of triangles share. So the parity is even everywhere exactly when those projected edges, split at one another's ends, cover every stretch an even number of times. Two limits keep rounding out: ends nearer than 0.1 mm are joined, and open boundary under 1 mm in all is left out. So an opening narrower than 0.1 mm, or with less than 1 mm of boundary, is not seen (review 0, F3).

The three builders name their geometry, and the gate finds their pieces by that name in the meshes the walk or the cut reads at t = N. It reads each two ways: by `openAlong`, along world vertical in the piece's frame, and by the walk's own crossing query on four lines through each face that is not vertical, one inside it and one near each corner. Each line must meet its own piece at that face, so a line that finds nothing cannot pass (review 0, F0). The corner lines reach the jambs of the arcade panels, which a line inside each face missed (F1). The walk counts hits within 1 µm of each other once, so faces back to back could read odd to it where the mesh is closed; none of these pieces has any. Each builder must have pieces in its callers' steps, so the gate cannot pass by finding none.

## Acceptance criteria

- [x] `openWall`'s walls, `holeLining` and `archedPassage` closed along vertical lines and standing on faces that look down (`src/model/core/core.test.ts`, `src/model/hunt/hunt.test.ts`), each red with its defect put back or its faces wound up; doors less than 1 mm apart refused, and each opening clear in the front and back faces, by their areas, by every triangle clipped against the opening and by nine lines along Z through it, whichever cache entry came first.
- [x] The gate `src/model/closure.test.ts` green, and red with `openWall`'s bottom left out (14 shapes; the walk reads all 113 walked `openWall` pieces open), with `archedPassage`'s feet left out (the gallery 600 passage), with `openWall`'s geometry unnamed (8 steps missing), and with the walk's instance numbering off by a mesh (116 pieces' lines miss their faces).
- [x] The check's fixtures (`src/model/lib/check.test.ts`) green, and red without its joining of ends or its splitting of edges.
- [x] On the real sequence, Weston's facade built through a walker in its pavilion's brick lifts it onto the coping (`src/walk/settle.test.ts`), red with `openWall`'s bottom left out; that file's bound corrected.
- [ ] The cut views (`tests/e2e/floors.spec.ts`), routes, reach, door-fit and the budgets green; the standard shots before (`795956f`) and after compared, and the changed images read at native resolution.
- [ ] `npm run verify` green with this worktree's `MET_PORT`, an independent review with its findings resolved, merged to main and pushed, and the owner's render gallery rebuilt if a render changed.

## Open finding for the owner: most solids are open along vertical lines

A probe ran `openAlong` over every piece the walk or the cut reads at t = N, on the model of `795956f`: 26,794 pieces in 2,980 shapes. A shape is a geometry with the direction world vertical takes in its frame, to six decimals, as the gate keys it. 2,385 shapes were open, 14,885 pieces; 2,370 still are after this unit's two fixes, 14,771 pieces.

- 2,311 are read by the walk only, not capped by the cut. They are the site's paving, asphalt, gutters and paint laid as quads and its curbs, open below (`site/tiles.ts`, about 2,100 shapes), its paths and its terrain; glass laid as one sheet (`lib/glazing.ts` skylights, laylights, curtain walls and oculi, `roche-south/shapes.ts` triangles, `core/skylights.ts`); and plaza furniture, lamp posts, fountains and tree trunks, open below.
- 74 are capped by the cut (59 after the fixes), all in the building: `openWall` and `archedPassage` (closed here), and `lib/wall.ts` walls, column shafts, bases and capitals, pilasters, dentils, balusters and rails, urns, the Egyptian columns, hedges and trunks, the McKim, Mead & White pilasters and arcades (`mmw/merge.ts`), the Arms and Armor court's lunette vault and figures, the Engelhard bank facade, the Lehman roof's prism, the Hunt roof's lead and plaster sheets, the Vaux hall's gable prism, the west front's tympanum stripes, the medieval hall's piers and an artwork form (`collection/kinds.ts`).

Most skip the bottom face where a part stands on another; the lib tests say so (`backfaceFraction`'s `notFromBelow`). Such a piece has no inside by the parity rule, so the build does not lift a walker out of it, and a cut through it shows what lies below.

A possible design, not decided: every builder closes its solids, and builders mark true sheets (glass panes, paving and terrain laid as surfaces) on their geometry, say `userData.sheet`, which the gate skips and the cap pass leaves out. The gate then asserts that every piece the walk or the cut reads is closed or a declared sheet. The coordinator is putting this to the owner as its own task. A sibling session also found that the walk's crossing query, which counts hits within 1 µm once, reads 46 shapes open that `openAlong` finds closed, where faces lie back to back within one geometry; that task would take it up.

## Implementation steps

- [x] Probe the finished model for open pieces; ask the coordinator about the class's scope (answered: bounded).
- [x] Close `openWall`'s bottom and `archedPassage`'s feet.
- [x] The check and its fixtures; the bounded gate; the settle case; the builders' tests; each proved red.
- [x] Shots before (`795956f`) and after: 9 of 64 images differ, the cut views showing the medieval hall's walls and the gallery 600 jamb solid.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`) of the staged change: no blocker or major finding; F0 to F6 accepted and repaired.
- [x] Review 1 (`reviews/1_implementation.md`) of the repairs: F0 to F6 resolved but F2; F7 to F10 accepted and repaired.
- [x] Review 2 (`reviews/2_implementation.md`) of those repairs: F8 to F10 resolved; F7's tolerance let crossing doors seal a doorway (F11, major) and the checks ran only on a cache key's first call (F12); both repaired.
- [x] Review 3 (`reviews/3_implementation.md`) of those repairs: F11 and F12 resolved; F15 to F19 accepted and repaired, F16 by naming its bound.
- [x] Review 4 (`reviews/4_implementation.md`) of those repairs: F15 to F19 resolved; the doorway test's tolerance and lines let a thin face pass (F20), and four nits; all repaired.
- [ ] Verify; commit; merge; gallery.

## Outcome

Pending.
