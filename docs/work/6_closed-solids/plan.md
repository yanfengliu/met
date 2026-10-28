# Every solid closed, every sheet declared

Status: complete
Owner: Claude Code desktop session kind-brahmagupta-01cb19 (2026-10-28)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Work unit 5 closed `openWall` and `archedPassage` and gated those two builders and `holeLining` (`src/model/closure.test.ts`). Its probe found the class far wider: at t = N, 2,385 of the 2,990 piece shapes the walk or the section cut reads were open along vertical lines, from about 60 builders. The walk's settle reads an open piece as having no inside, so a step built through a walker leaves it inside, and a cut through one shows what lies below instead of the cut colour. The coordinator asked (2026-10-28) for every piece the walk and the cut read to be closed or declared a sheet, under one gate over the whole model, with the spec's settle and cut text free of the bound.

Outcome: builders declare true sheets, which the walk reads no inside in and the cut leaves out; every other piece is closed along vertical lines with an inside behind each upright face; the gate covers every piece; and the spec says so.

## Scope

Included: a sheet declaration and the cap pass leaving sheets out; every open builder closed, the shared library parts first; the walk's crossing count, which read two faces back to back as one crossing (found on the way); the gate widened to every piece, with the walk's own reading, the faces' balance, the overlaps of a piece's parts and an inside behind each upright face; the spec, AGENTS.md's gate notes and the devlog.

Excluded: the walk's parity rule itself, which reads parts of one piece that overlap as outside where they overlap; the gate bounds those stretches below settle's span instead. The crossing rule's bound on a line exactly along edges that faces of two overlapping parts in one plane both have. The open findings below.

## Approach

- **Sheets.** `sheet(geometry)` (`src/model/lib/sheet.ts`) marks a geometry with no inside: glass panes (the glazing parts, windows and doors, Roche south's pane triangle, the gallery skylights, the plaza poles' lenses), paving, gutter and paint tiles, the park paths, the terrain and the building's pad, and the surfaces standing upright that no vertical line crosses (the site's curbs, retaining walls and excavation faces, the tympanum panels, the Arms and Armor Court's banners, the moon gate surround). The area merges keep the mark on a merge of sheets alone. The walk reads no inside in a sheet, whatever its crossings (`LineCrossings.sheet`), and the cap pass leaves sheets out (`capsMesh`). The gate's `SHEETS` counts them by step and material (10,028 pieces in 53 pairs at t = N).
- **Closing.** Builders in 37 model files, 16 of them in the parts library: the column shaft's ends, the Attic base's plinth, the pedestal's underside, the pilaster's shaft, base moulding and capital, the flat Corinthian bell, dentils, balusters and balustrade posts, urns and lamp posts, the papyriform column, tree trunks, hedges, the surrounds' tympana as prisms, the pendentives' spandrels on their curved faces' points, and the rusticated wall (its channels backed against the reveal at every opening segment, its ends notched at each channel). Then the area builders: the plaza furniture and fountain, the curbs, the medieval hall's piers, the Vaux gable, the tympanum's stripes, the collection's block, the armour figure's skirt, the lunette vault's back, the Hunt hall roof (lead skin, a closed lead fascia at the eaves, the plaster slab inside it), the Grand Staircase's lead roof as a closed shell, the moon gate panel's foot, top and ends, and Roche south's `prism` with the Lehman roof's outline.
- **The walk's count.** `CollisionWorld.crossings` merged every hit within 1 µm of the last, so a closed piece of two stacked parts read as open above the joint (206 shapes misread at t = N). It now merges only hits facing one way that lie on their triangles' edges.
- **Overlaps.** Parity reads where parts of one piece overlap as outside. A walker is missed only when settle's span lies wholly in such a stretch; the most any of the gate's lines runs through overlapping parts, scaled to each shape's most stretched piece, is 0.76 m, a Hunt facade medallion's bust in its disc.
- **The gate** (`src/model/closure.test.ts`) reads 870 shapes of 16,766 pieces four ways: `openAlong` exactly, with a face that does not stand upright; the walk's crossing query on 56,168 lines; on those lines the faces' balance and the overlaps; and at seven points of every upright face, an inside to one side but where the face lies back to back on another, a two-sided membrane.

## Acceptance criteria

- [x] Every piece the walk or the cut reads at t = N closed along vertical lines or a declared sheet, by the gate, each reading red with its defect put back.
- [x] The crossing count's fixtures (`src/walk/crossings.test.ts`) green, and red with the old count.
- [x] The budgets (1,618,841 triangles and 746 meshes at t = N, the build ready in 2.7 s cold), the collision build time, every e2e walk and route green; the standard shots before (`8e6643c`) and after compared, the changed images read at native resolution.
- [x] The spec's settle and cut text, AGENTS.md's gate notes and the devlog say so, the coverage bound gone.
- [x] `npm run verify` green with this worktree's `MET_PORT`, independent review with its findings resolved, merged to main and pushed, and the owner's render gallery rebuilt.

## Open findings for the owner

- **The Arms and Armor Court's gables are wound inside out** (`src/model/mmw/armor-court.ts` `gableInto`): the parity rule and the gate's balance check do not see a whole part turned, and the cut shows their lit inner faces. A fix would turn them out and add a check that a closed part faces out.
- **Two coffered soffits' coffers are deeper than their shells** (`src/model/hunt/arches.ts`, 0.06 m and 0.1 m; `src/model/hunt/hall-vaults.ts`, 0.08 m and 0.12 m), so each coffer stands 4 cm out of its vault, a pocket whose faces look in. A fix would have `barrelVault` refuse coffers as deep as its shell and change those soffits.

## Implementation steps

- [x] Probe the open shapes by builder; declare the sheets; close the library parts, then the area builders.
- [x] The crossing count and its fixtures.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`) of the closings at `a6ac047`: F0 to F11, all but F3 and F6 repaired.
- [x] Merge work unit 5; widen its gate; prove it red (`7c11ada`).
- [x] Review 1 (`reviews/1_implementation.md`) of `7c11ada`: F12 to F22; repaired at `dc1a7dc`, F17's fourth reading finding the moon gate panel and three more.
- [x] Review 2 (`reviews/2_implementation.md`) of `dc1a7dc`: F23 to F32; repaired at `3165aa5`, F23 closing the pendentives' gap.
- [x] Review 3 (`reviews/3_implementation.md`) of `3165aa5`: F33 to F38; repaired at `c73e52e`.
- [x] Review 4 (`reviews/4_implementation.md`) of `c73e52e`: F39 to F44; repaired at `56b2b74`, the fifth set of repairs, R11's cap.
- [x] Merged main's `a194927` (docs only) at `a4af999`, fast-forwarded main to it and pushed; the owner's render gallery rebuilt.

## Outcome

Done on main at `a4af999`, pushed 2026-10-28. `npm run verify` passed with `MET_PORT=5348` on `56b2b74` (70 files and 639 unit tests, typecheck, lint, build and 84 e2e tests); the merge with main added only `docs/work/5_closed-pieces/plan.md`, and the Pages run on `a4af999` passed the unit tests, typecheck, lint and build and deployed.

Every piece the walk or the section cut reads at t = N is closed along vertical lines or a declared sheet. The gate reads 870 shapes of 16,766 pieces on 56,168 lines; 10,028 pieces in 53 step/material pairs are sheets; the most any line runs through overlapping parts is 0.76 m, under settle's span of 1.749 m.

The model went from 1,579,599 to 1,618,841 triangles, with 746 meshes and 27,043 pieces before and after. Across three captures the build took 239 to 257 ms and the page was ready 2.48 to 2.66 s after a cold navigation (2.49 s at `8e6643c`).

Five review rounds, each by Codex and Claude, found F0 to F44, all dispositioned in `reviews/`. Round 4's repairs were not reviewed again (R11).

The standard shots changed in 55 of 64 images against `8e6643c`, each read at native resolution. Main's capture at `a4af999` differs from `3165aa5`'s in 10 images, though no geometry changed after `3165aa5`; those 10 were read at native resolution too. Two captures of `a4af999` differ in 14 images, on 1 to 40 pixels an image, by 1 of 255 but for 9 of 255 in `floor-roof-garden`: the capture is not byte-repeatable. `docs/policies/local-rules.md` now says to compare shot sets by pixel difference (`1413777`, docs only, pushed). The owner's render gallery shows `a4af999` (version 4).

The fleet's allocator refused every allocation in met until fleet `162da10`: its history check needed every committed registry to list IDs without a gap, and main's registry at `8e6643c` lists 5 without the reserved 4. Session dazzling-lichterman-067ed3 then landed this plan and its five review records here on 2026-10-28, with two edits: the plan's status is `complete`, the allocator's word for `done`, and each Claude report's headings stand one level under its reviewer's heading.

Open: the two findings above for the owner.
