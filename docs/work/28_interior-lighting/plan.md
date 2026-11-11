# Light the interiors: ambient occlusion, clean sun patches, no light leak

Status: planned
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

Item 1 of the improvement list (`docs/work/27_improvement-list/plan.md`). Once a roof closes over a room, the room is lit by a flat hemisphere fill and a weak room environment alone, so walls, floors and ceilings read as plain colour and curved surfaces lose their shape. Seen in main's standard shots at `75abdd3`: `preset-int-greek-galleries`, `preset-int-lehman-galleries`, `walk-great-hall` (the painted half-domes read as flat discs), `preset-int-greek-roman-court`, `preset-int-great-hall-balcony-west`.

Two defects of the sun's shadows show in the same set:
- The sun patches under skylight grids are grainy at native size: the wall at the left of `preset-int-lehman-pyramid-up`, the floor at the right of `preset-int-european-paintings-600`, the floor of `preset-int-petrie-court`, the floor of `preset-int-great-hall-balcony-west`.
- A sliver of light runs down the Grand Staircase's side wall: in `preset-int-grand-stair-west` near x 965, y 540 of 1600×900, and in `walk-second-floor` near x 590, y 470. Its cause is not known.

The rig today (`src/viewer/environment.ts`, `src/viewer/sun.ts`, `src/viewer/viewer.ts`): one directional sun with one 4096 shadow map fitted to every caster of the model, `PCFShadowMap` with `shadow.radius` 3, a hemisphere light at 0.75, a PMREM room environment at 0.35, three point lights from build steps, ACES tone mapping, no post-processing.

Outcome: at every interior preset and walk spawn the room reads with depth (creases, cornices, coffers, column bases, the underside of balconies), the sun patches are clean, the stair has no sliver, the sunlit exterior keeps the colours it was calibrated to, and the frame budgets hold.

## Scope

In: `src/viewer/environment.ts`, `src/viewer/sun.ts`, the render and resize paths of `src/viewer/viewer.ts`, new files under `src/viewer/` for the pass, `src/viewer/section-cut.ts` and `src/viewer/cap-pass.ts` only as far as the cut's colours need, their unit tests, the parts gallery's stage (`src/parts/stage.ts`) if it should match, the spec's text on the environment, shadows and budgets, and this plan.

In, only if the sliver proves to be a gap in the model: the piece that leaves it, in its area module, through the build-step API as it is, with a check for the class.

Out, until work unit 26 is on origin's main: `src/ui/**`, `src/main.ts`, `src/build/**`, `src/viewer/facts.ts`, `src/viewer/query.ts`, and the e2e specs for the replay, controls, menus and layout. So this unit adds no URL parameter and no `window.__met` fact; a quality switch for weaker devices belongs to item 6.

No new dependency: three's own addons only (`three/addons/...`), read in `node_modules/three` at the installed version before use.

A second stage, not part of this unit's first landing: an ambient term that knows the sky (rooms under glass brighter than rooms under slabs). The worker may leave a short design note for it in this plan; nothing of it is built before the first landing is accepted.

## Approach

The worker chooses the technique within these bounds and records the choice and its tradeoffs here before handing back.

- Antialiasing does not get worse: edges of columns, mullions and railings at native size match main's.
- Glass and water are neither darkened nor haloed; thin things (railings, the choir screen's bars, skylight mullions) carry no dark halo.
- The section cut's cap colour stays the one flat colour the spec and `floors.spec` hold, and the door layer's stand-ins draw as they do now.
- `?shot=1` captures include the pass. The scene at `t` stays a pure function of `t`; the pass reads the frame, it keeps no history that changes a still frame.
- The exterior was calibrated against photographs under today's rig (`src/model/palette.ts` header), so open sunlit and shaded surfaces must keep their values.

## Acceptance criteria

- [ ] Before and after pairs at native size (1600×900) of the 14 interior presets and the three walk shots, in an ignored folder, each read by the worker and again by the coordinator: occlusion shows where surfaces meet, with no noise, banding, halos or dark glass.
- [ ] The palette's calibration patches hold within 4 of 255 per channel of main's, measured on the same pixels: the sunlit front's columns, walls and spandrels in `preset-ref-front-axis` and `preset-ref-front-street`, and the shaded north wall in `preset-ref-park-northwest`.
- [ ] The grain is gone from the four sun patches named above, and its cause is named.
- [ ] The sliver is gone from both shots and its cause is named. If it was a gap in the model, a test fails with the gap put back.
- [ ] The spec's frame budgets hold as `walk.spec` and `doors.spec` check them, `routes.spec` and `walk.spec` pass three runs in a row at 1× and at `MET_CPU_THROTTLE=4`, and the build-to-ready time stays under 4 s. The plan records frame work and GPU-synced render time before and after at the three walk spawns.
- [ ] `npm run verify` is green on the merged tree through `tmp/gate.sh`. No test is weakened; each pixel expectation that changes is named with its reason.
- [ ] The spec says what the environment now is. A devlog line is ready for the landing.
- [ ] An independent review of the exact revision (Codex and Claude) has no finding left that matters.

## Implementation steps

- [ ] Worker: baseline shots and timings on the base revision.
- [ ] Worker: the occlusion pass, wired inside `Viewer.render()` and `Viewer.resize()`.
- [ ] Worker: the grain, then the sliver, each traced to its cause first.
- [ ] Worker: gates, the pairs, the patch measurements, the plan's Approach and timings, and a handoff naming the branch and revision.
- [ ] Coordinator: read the pairs, review round, accept or return.
- [ ] Coordinator: land through `tmp/land.sh`, republish the gallery, add the devlog line.

## Outcome

Pending.
