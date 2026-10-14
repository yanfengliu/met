# Animated build of The Met

Status: active
Owner: Coordinator (Claude Code desktop session, 2026-10-10)
Created: 2026-10-11
Updated: 2026-10-11

## Problem and outcome

The owner asked for a 3D model of The Metropolitan Museum of Art whose making can be played forward and backward in steps, researched from photographs of the building inside and outside. Outcome: a page that assembles a procedural model of the present-day Fifth Avenue building, outside and its main public spaces inside, through an ordered build timeline the viewer controls. The contract is `docs/design/spec.md`.

## Scope

Included: research and reference index (`docs/research/`); toolchain and gates; the build engine, player and page; a parametric parts library; the model by chapter; capture tooling; repo docs (AGENTS.md, CLAUDE.md, .gitignore, devlog).

Excluded: imported meshes, scans or photo textures; runtime network assets; individual galleries and artworks beyond landmark objects; deployment (needs the owner's authorization).

Dependencies: research and the engine run in parallel; the parts library needs the scaffold; modelling needs the engine, the library and the research. The fleet census entry for `met` landed in fleet `22bca33`.

## Approach

Coordinator plans, owns the contract, chapter list and integration, and delegates every non-trivial change. Workers run in their own worktrees under `../met-worktrees/`, commit on their own branch, and hand off; the coordinator reviews each handoff, runs the gates and merges to main.

Build order is historical by chapter and constructional within a chapter, using only parts that exist today (decided 2026-10-10 as a reversible default: the sequence is data, so a different order is a change to `src/build/sequence.ts`, not to the engine).

Chapters (from `docs/research/history.md`, decided 2026-10-11): `site`, `vaux-mould-1880`, `weston-tuckerman-1894`, `hunt-1902`, `mckim-mead-white-1926` (with the 1924 American Wing core and the 1939 Medieval Sculpture Hall), `roche-steps-lehman-1975`, `roche-north-1980` (with the 1981 Astor Court), `roche-south-1990`, `koch-plaza-2014` (with the 2007 Greek and Roman upper storey and the 2023 European Paintings glazing). The Wallace Wing and roof garden are modelled as they stood until October 2025, its step detail saying the Tang Wing is replacing it; the Rockefeller glass wall is built in its 1982 step, its detail noting the 2025 rebuild.

Reconciled levels (coordinator, 2026-10-11): main floor +4.11 (measured landing +3.63 plus the three doorway steps, matching the published 13½ ft), ground floor −2.34, second floor +10.97. The Hunt column positions conflict between the floor map and the photographs; the Hunt modeller settles them.

Modelling split: each area worker owns one folder and exports one step array per chapter it contributes to; `src/build/sequence.ts` composes the chapters from those arrays, so no two workers edit the same file. Areas: `site` (site, 1970 front steps, 2014 plaza), `hunt` (the Hunt chapter, exterior and Great Hall and Grand Staircase), `mmw` (the McKim, Mead & White wings, the Arms and Armor court, the Greek and Roman court and its 2007 storey), `core` (the 1880 and 1888–1894 buildings, the Medieval Sculpture Hall, the second-floor European Paintings galleries and their 2023 glazing), `roche-north` (Sackler and Dendur, the American Wing with the 1924 core and Engelhard Court, the Astor Court), `roche-south` (Lehman, Rockefeller, Wallace and roof garden, Kravis and Petrie Court).

## Acceptance criteria

- The page loads at `t = 0` and plays the whole build; every control (start, step back, play backward, play/pause, step forward, end, speed, scrubber, chapter menu, presets, follow, section cut) and keyboard shortcut works through real input, checked by Playwright.
- Backward playback is exact: the determinism test passes for random histories, and stepping back from the end to 0 leaves an empty site.
- The finished model is recognisably The Met when compared with the reference photographs: the Hunt facade (coupled columns, three arches, attic blocks), the McKim, Mead & White wings, the Great Hall with its domes, the park-side glass wings including the Temple of Dendur, and the front steps and plaza; each modelling handoff names the photographs it was compared with.
- Interiors (at least the Great Hall, the Temple of Dendur gallery and the American Wing court) are reachable by preset and by section cut.
- Budgets in the spec hold; `npm run verify` is green on the merged revision; independent review of the integrated change, with findings resolved.
- Merged to main and pushed; worktrees removed; devlog line written.

## Implementation steps

- [x] Repo docs base, fleet census, work folder (coordinator).
- [x] Scaffold: toolchain, configs, gates, AGENTS.md Gates section (worker `scaffold`; merged `aa7852a`: three 0.186.1, vite 8.3.4, vitest 5.0.3, TypeScript 6.0.3, Playwright 1.64.0 on system Chrome; verify green, audits 0).
- [x] Research: exterior, footprint and history (worker `research-exterior`, merged `cd61ea4`). Interior: done (worker `research-interior`, merged `ca3c6af`; floor-map decode cached under ignored `research/cache/`).
- [x] Engine: viewer, build API, timeline, player, page, capture, e2e (worker `engine`, merged `4ea291f`; verify green on main: 110 unit, 16 e2e; demo 2,105 pieces build 13 ms, frame 1.2 ms).
- [x] Parts library and gallery page (worker `parts`): milestone 1 merged `600b10b` (orders, mouldings, walls, arches, windows, domes and vaults, landscape, fittings, Egyptian); milestone 2 merged `3c5ca85` (glazing, stairs, balustrades, inspection fixes; 215 unit tests, verify green on main).
- [x] Area `site` merged `d259651`: 20 steps (site, 1970 front steps, 2014 plaza), 255k triangles, 68 meshes; plan checked against the orthophoto to about 1 m. Follow-up running in its worktree: remove the `demo` chapter, move `ref-park-north` inside the site.
- [x] Areas merged 2026-10-11: `core` (`af27e4a`, 23 steps, 183k triangles), `roche-south` (`b21eea1`, 29 steps, 45k), `hunt` (`b28c3e3`, 24 steps, 473k, 2 lights), `roche-north` (merged after `b28c3e3`, 26 steps, 128k); demo removed (`c68dc30`); presets refitted against photos (`f49edcb`, `fae608a`). Main after these: 246 unit tests, 16 e2e green; 22,876 pieces, 547 meshes, 1.10M triangles, build 228 ms, frame 8.5 ms. `mmw` still modelling.
- [x] Area `mmw` merged `099793f` (recovered after a session restart from its worktree: 7 commits plus uncommitted roof work): the Fifth Avenue links and end pavilions, the 84th and 80th Street ends, the Arms and Armor, Greek and Roman and Astor courts, the 2007 storey; 442k triangles, 139 meshes. All six areas are on main: 26,756 pieces, 684 meshes, 1.54M triangles, build 263 ms, frame 7.2 ms; 253 unit tests and 16 e2e green.
- [ ] Integration phases 1 and 2 (worker `integrate`, restarted from `5f2efbd` after the session restart; phase 2 added at `099793f`): seams that do not involve `mmw` (Engelhard curtain wall against the park terrain, Weston facade height against the Petrie roof, the Vaux front against the Lehman link skylight, stone colours against the photos). Phase 2 after `mmw`: the Dendur hall's extent across the mmw/sackler lines, the Rockefeller roof strip Z −38.5..−35.5, the McKim, Mead & White cornice height (photos 22.3 m against the contract's 20.7), the full-model audit.
- Cross-area decisions since dispatch (in `docs/design/spec.md`): the floor map needs a −3.1 m Z shift (`c2526d0`); walls sit on block lines, the older block builds a shared wall, exterior mouldings may overhang 1.5 m (`80d77ac`); exterior walls start at or below `GROUND_FLOOR_Y` − 0.1; the scrubber e2e check compares at t = N (`98023b9`).
- [x] Chapter list, `frame.ts`, chapter stubs from research (coordinator decisions; chapters, stubs and composition landed with the engine, `4ea291f`).
- [ ] Modelling by area, dispatched 2026-10-11 from `600b10b`, each in `../met-worktrees/<area>` on branch `<area>`: `site` (port 5340), `hunt` (5350), `mmw` (5360; also wires `astorCourt1981Steps` into `sequence.ts`), `core` (5370), `roche-north` (5380), `roche-south` (5390). Shared lines: the older block builds the wall. Budgets (triangles / meshes / lights): site 400k/120/0, hunt 650k/170/2, mmw 500k/160/1, core 350k/130/1, roche-north 450k/150/2, roche-south 450k/150/1.
- [ ] Integration, visual audit, budgets, independent review, fixes (coordinator with reviewer).
- [ ] Docs, devlog, merge, push, worktree cleanup (coordinator).

## Outcome

Pending.

## Next after modelling

- Integrate the area branches in chapter order (`core`, `hunt`, `mmw`, `roche-north`, `roche-south`, `site`), then an integration worker removes the `demo` chapter, tunes presets against the photographs and fixes seams between areas (the coordinator's permissions exclude `src/build/`, so that change is delegated).
- Then the full-model visual audit against `docs/research/*-images.md`, the budgets, an independent review (codex 0.158.0 and claude 2.1.281 are installed; see `../fleet/docs/skills/multi-cli-review.md`), docs and devlog.
- If a session stops early, each area's committed progress is on its branch in its worktree; resume the worker by name.
