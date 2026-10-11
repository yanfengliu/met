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
- [ ] Research: exterior, footprint and history (worker `research-exterior`, running). Interior: done (worker `research-interior`, merged `ca3c6af`; floor-map decode cached under ignored `research/cache/`).
- [ ] Engine: viewer, build API, timeline, player, page, capture, e2e (worker `engine`; needs scaffold).
- [ ] Parts library and gallery page (worker `parts`; needs scaffold).
- [ ] Chapter list, `frame.ts`, chapter stubs from research (coordinator).
- [ ] Modelling by chapter (workers named per chapter; need engine, parts, research).
- [ ] Integration, visual audit, budgets, independent review, fixes (coordinator with reviewer).
- [ ] Docs, devlog, merge, push, worktree cleanup (coordinator).

## Outcome

Pending.
