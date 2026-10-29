# Every closed part faces out

Status: complete
Owner: Claude Code desktop session kind-brahmagupta-01cb19 (2026-10-28)
Created: 2026-10-28
Updated: 2026-10-28

## Problem and outcome

Work unit 6 left two open findings (`docs/design/spec.md`, Build-step API: Solids and sheets): the Arms and Armor Court's gables were wound inside out, so a section cut through them showed their lit inner faces, and the Hunt arches' and Great Hall arches' coffered soffits held coffers deeper than their shells, each coffer standing 4 cm out of its vault as a pocket whose faces looked in. The owner asked (2026-10-28, "Fix them here") for both fixed, with a check that every closed part faces out.

Outcome: no closed part of the model faces in as drawn, no surface folds into a pocket wound inside out, every upright face has its part's inside behind it, and no piece's matrix mirrors it; the closure gate reads all four on the real sequence, red with each defect put back, and the parts library's fold-prone builders are read or refuse their folds.

## Findings on the way

- A probe of every part as drawn found two Dendur temple rolls running down their height (`src/model/roche-north/temple.ts`: from the rear cornice's top, 5.722 m, to the pronaos wall's top, 5.202 m), so their matrices mirrored them and their instanced mesh drew them inside out; of all 27,043 pieces, the only ones.
- The gate's lines found a 1.7 mm pocket in a Hunt pilaster capital. Dense grids traced it to the medium-detail acanthus leaves' tips, which folded at their edges (42 and 44 of 67,600 lines through one flat and one round capital).
- Review 0 found Diana's bow in the Engelhard Court, an open torus arc whose two open ends line up along a vertical line, so that the closure check read it closed and the air beside it as inside; and that no reading saw an upright face wound in.

## Scope

Included: the facing readings (`partVolumes`, `inwardAlong`, `src/model/lib/facing.ts`); in the closure gate, a facing test, a pocket reading on its lines and on a grid over each shape, an upright face's inside behind it, and a check of every piece's matrix; the fixes; `barrelVault`'s refusal of coffers whose floors would stand out of its shell; `extrudeOutline` taking an outline either way round; `MeshBuilder.grid`'s opt-in `flattest` split, used by the leaves; the spec, AGENTS.md, the devlog and the defect register.

Excluded: a refusal of mirroring matrices in `src/build/kit.ts`. The owner's settings denied this session edits there (`Edit(**/build/**)`); the owner narrowed the rule later that day, but the session still refused the edit. The gate's check of every piece's matrix covers the real sequence instead. Whether the Dendur rolls belong between those heights at all (they keep their form). A fold refusal in `sweep`, written and withdrawn in review 0 (F13): no sweep of the model folds, and it missed capped mitres.

## Approach

- **Facing.** `partVolumes` welds each geometry's triangles into parts by their corners and reads each part's volume through its faces by the divergence theorem, along vertical; the parts that close only together are read as one. The gate signs each by its piece's matrix, which an instanced mesh does not turn back.
- **Pockets.** On the gate's existing lines, on a grid of 64 lines a side over each shape and on two lines beside each open edge (`inwardAlong`: its grid's lines off the cells' centres by irrational shares, each cell with its own triangles, a line on an edge cast again a hair aside), no stretch where more faces look down than up above it.
- **Upright faces.** At the gate's seven points of every upright face, more inside behind it than in front, or the same on both sides within an overlap, but for two-sided membranes.
- **Fixes.** `extrudeOutline` turns a clockwise outline; the soffits' shells 0.14 and 0.16 m, the Hunt one set 1 cm behind the wall's face, and `barrelVault` tests each coffer's opening and floor corners against the facet chord above them; the rolls run up; the leaves split each quad along the diagonal that folds it least; the bow's ends are capped (`torusArc`).

## Acceptance criteria

- [x] The gate's readings green on the fixed model and red with each defect put back.
- [x] The parts library's tests for the capitals, the vault and `extrudeOutline`, each red with its fix removed.
- [x] `npm run verify` green with `MET_PORT=5348`; the standard shots after compared with a clean set of `00eeee7` by pixel difference, the changed images read at native resolution.
- [x] Independent review, findings resolved; landed on origin's main through the coordinator's slot, merged with origin/main and gated there.

## Implementation steps

- [x] Probe every part as drawn; the facing readings; the gate red on today's model (3 parts facing in, 108 lines).
- [x] The fixes; the gate green; the red proofs.
- [x] Review 0 (Codex and Claude, `reviews/0_implementation.md`) of `453d0af`: F0 to F16.
- [x] Repairs of review 0 (`3ac62d7`); review 1 (`reviews/1_implementation.md`): F17 to F29.
- [x] Shots of `3ac62d7`'s tree read against a clean set of `00eeee7`.
- [x] Repairs of review 1 (`7a17145`); review 2 (`reviews/2_implementation.md`): F30 to F39.
- [x] Repairs of review 2 (`ecdf81b`), which close the review at the coordinator's request to wrap up.
- [x] Merged with origin/main (`7438a1b`), gated there and landed through the coordinator's slot.

## Red proofs (2026-10-28)

- `extrudeOutline` taking the gables' clockwise outline as given: the facing test (2 parts of 30.4 m³), the lines (48) and `mmw.test.ts` (volume −3 for 3).
- The Dendur rolls' ends reversed: the facing test (2 pieces, mirrored) and the matrix check (`dendur-temple` pieces 4 and 5).
- The soffits on their old 0.06 and 0.08 m shells: the build refuses them; with that refusal off, the lines (58).
- The leaves' quads split along one diagonal: the capital test (29 lines through the round capital, 40 through the flat) and the lines (2).
- Diana's bow left open: the gate's pocket reading (1 line of the grid at first; 9 lines with the lines beside open edges, 0.74 m).
- `prism`'s side walls reversed (`src/model/roche-south/shapes.ts` `sideQuads`): the upright reading (22 shapes).
- The noise bound without rounding: the membrane test (2.9e−11 against 0); the heights averaged before levelling: the level membrane test (4.6e−13 against 4.6e−22). The vault refusal with one share for every corner, or with the openings unread: the vault test. No lines beside open edges: the open-tube fixture. No casting aside: the tilted boxes (1 line).

## Outcome

Landed on origin's main, 2026-10-28. No closed part of the model faces in as drawn, no line of the gate's finds a pocket, every upright face has its part's inside behind it, and no piece is mirrored by its matrix. `npm run verify` passed with `MET_PORT=5348` on the tree merged with origin/main (75 files and 679 unit tests, typecheck, lint, build and 84 e2e tests in 13.3 min, at `7438a1b`). The model is 1,618,845 triangles before the merge, 4 more than `00eeee7` for the bow's caps, with 27,043 pieces and 746 meshes.

Three review rounds, each by Codex and Claude, found F0 to F39; each is repaired, withdrawn (F13, the sweep's fold refusal), stated as a bound (F31, F32) or noted (F34, F38, F39). The standard shots changed where the soffits, the capitals, the Dendur rolls and the Great Hall arches changed, each read at native resolution; the gables show in no standard view.

Open notes: the readings' bounds (`src/model/lib/facing.ts`); the mirror refusal in `src/build/kit.ts`, which this session could not edit, the gate's matrix check standing in for it. Follow-up proposed, not started: `barrelVault` refuses a rib where 1.6 ribs reach a coffer's cell (F39, older than this work).
