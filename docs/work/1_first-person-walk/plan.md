# Walk the finished building in first person

Status: complete
Owner: Coordinator (Claude Code desktop session, 2026-10-14)
Created: 2026-10-15
Updated: 2026-10-25

## Problem and outcome

The owner asked (2026-10-14): support WASD; make watching the build optional, with the finished building as the default on load; and let a visitor walk around the building, go upstairs and downstairs on real, functional stairs, and look around in first person. Outcome: the page opens on the finished model; WASD moves the camera in the orbit view; a walk mode puts the visitor on the ground in first person, with mouse-look, gravity and collision, so stairs are climbed by walking and walls stop you.

## Scope

Included: the page's default state, orbit-view WASD, the walk mode (controller, collision, spawn points, UI, keyboard, query), and making the main public route walkable through the real model. Excluded: walking every gallery, opening every door, mobile touch movement beyond drag-to-look, physics beyond a walking capsule. Dependency: a collision BVH library (`three-mesh-bvh`, exact-pinned) rather than a hand-written spatial index (decided 2026-10-15: it is the standard tool for this, and a home-made BVH is more risk than the dependency); the dependency audit gate reruns.

## Approach

Milestone M1, engine (worker `walk`): default load at t = N and paused, `autoplay=1` to watch the build; orbit-view WASD; the walk mode with a capsule controller against a BVH of every piece of the steps complete at the current t, minus pieces whose material is marked non-solid. Milestone M2, connectivity (worker `routes`, after M1): open the public route through the real model and gate it with e2e walks driven by real keys. The contract lands in `docs/design/spec.md` with each milestone.

## Acceptance criteria

- The page loads at t = N, paused; Play still runs the build from the start; `?autoplay=1` plays it on load. Checked by e2e.
- In the orbit view, W, A, S and D move the camera over the ground and Q and E down and up, through real key presses; the timeline keys keep working. Checked by e2e.
- Walk mode, entered by a button and a key and by `?walk=1`: mouse-look (pointer lock, with drag-to-look as a fallback), WASD and arrows to move, Shift to run, Space to jump, gravity, no walking through walls or columns, and stairs climbed by walking. Checked by unit tests on fixtures and by e2e on the real model.
- Route R1: from the plaza, up the front steps, through the central doors, into the Great Hall at `MAIN_FLOOR_Y`. Route R2: from the Great Hall up the Grand Staircase to `SECOND_FLOOR_Y`, and back down. Each walked by e2e with real key presses, asserting the eye height on arrival.
- Owner-reported defect (2026-10-15): the scroll wheel sometimes stops zooming, as if hard-capped. Root cause found and fixed in M1; `docs/learning/defect-register.md` entry; an e2e gate for the class (camera input stalling at a limit), shown red before the fix, that drives many real wheel notches both ways from several presets and after a WASD move.
- Floor picker in the 3D map (orbit) view (owner, 2026-10-15): choose Ground, Main or Second floor (more where the model has real upper floors) or All. Choosing a floor hides everything above it that blocks the view, using the section cut set just below the next floor's slab (walls shown cut, like a plan). It also hides landscape above that height rather than cutting it. Choosing All restores everything. Checked by e2e through the real control, with images per floor inspected.
- Entering walk mode at t = N takes at most 2 s on this machine; walking holds 60 fps. `npm run verify` and both dependency audits green; independent review of the integrated change; merged, pushed and deployed.

## Implementation steps

- [x] M1 engine (worker `walk`, merged `48fe3e6`, deployed and checked live): default load at t = N; orbit WASD; walk mode with `three-mesh-bvh` 0.9.15 over 1.41M solid triangles, BVH 62–77 ms, frame about 4 ms; wheel zoom heads for the surface under the pointer (defect register entry, `zoom.spec`); verify green, 350 unit and 38 e2e; audits 0.
- [x] M2 routes R1 and R2 (worker `routes`, merged `1fa410d`): door, pit and landing fixes; route tests drive the real walker (`src/walk/walker.ts`) and real keys; verify green, 348 unit and 40 e2e.
- [x] M2b merged `1b8fc64`: R3 and R4 walk both ways (unit and e2e), through openings cut from the floor map in the Hunt seams and partitions and the MMW party wall at Z −41.3; verify green, 354 unit and 42 e2e. Accepted limitation (coordinator, 2026-10-15): steps only add pieces, so these openings stand open before the newer wings close round them (the Hunt seams 1902 to the MMW links, the Dendur opening 1910 to 1978); the finished state is right, and a fix would need steps that remove pieces, a contract change not worth this flaw.
- [x] M2b wings (worker `routes`, decided 2026-10-15): the seam walls at X −49.7 and +49.4 seal the McKim, Mead & White wings on every floor. Open the main-floor passages from the Great Hall where the real building has them, and gate route R3 (Great Hall → north wing → Temple of Dendur) and route R4 (Great Hall → south wing → Leon Levy and Shelby White Court) the same way.
- [x] M3 floor picker in the map view (workers `floors` and `floors2`, merged `6f8892f`): Ground, Main, Second and the roof garden, cut at 3.1, 7.8, 12.7 and 27.4 m, the landscape over the cut hidden whole, Page Up and Page Down, `floor=`; verify green, 375 unit and 47 e2e.
- [x] Independent review of the integrated change; repairs. Rounds 0–6 in `reviews/`, by Codex; Claude abstained in round 0 and was not run for the focused rounds 1–6. U1–U12 accepted and repaired on `repair-u1` (`f66e724`..`3fb0d40`); U13, an older orbit-camera limit, repaired after the unit closed in `10d714f` (review 6).
- [x] Merge, push, deploy check, worktree cleanup, outcome: main fast-forwarded to `3fb0d40`, deployed by `pages.yml` run 39848903774, the live page checked; worktree and branch `repair-u1` removed.

## Outcome

Complete on 2026-10-22; the code is at `3fb0d40` on main and live at https://yanfengliu.github.io/met/.

- The page opens on the finished building at t = N, paused; Play builds it from the start, and `autoplay=1` plays on load.
- W, A, S, D, Q and E move the orbit camera. Walk mode (the Walk button, F, or `walk=1&spawn=`) walks the real model with gravity and collision. Routes R1–R4 (plaza to the Great Hall; up and down the Grand Staircase; the north wing to the Temple of Dendur; the south wing to the Leon Levy and Shelby White Court) are walked by e2e through real keys.
- The wheel zooms toward the surface under the pointer and never stalls at a bound, including the camera floor and the far bound together (defect register, "The wheel stops zooming").
- The floor picker shows Ground, Main, Second and the roof garden from above, with what is over each hidden. The cut caps only the pieces it passes through, drawn 4 depth steps nearer, which also removed older z-fighting along cut walls and stairs.

Checks at `3fb0d40`, run by the coordinator: `npm run verify` green (395 unit tests in 43 files, typecheck, lint, build, 60 e2e); the standard shot set compared with `e760a84` and `8a5f651`; with the cut on, a frame took 9.9–12.3 ms in the floor views. Live, headless: ready in 3.2 s cold; walk mode at the plaza with the eye at 1.64 m; the Main floor view; no console errors. The dependency audits were not rerun, since no dependency changed after M1.

U13, a pan near the ground leaving the orbit camera under the floor for some frames (review 5), was repaired on 2026-10-25 in `10d714f` (review 6). Known limits: at the floor, looking up at a surface within 0.5 m, both wheel directions stop; the M2b build-order limitation above. The 2026-10-21 handoff to a successor was withdrawn when the owner removed the fleet's session rollover rule (fleet `65ef6ac`).
