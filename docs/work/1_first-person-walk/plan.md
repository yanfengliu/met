# Walk the finished building in first person

Status: active
Owner: Coordinator (Claude Code desktop session, 2026-10-14; handed to a successor session 2026-10-21, see Handoff)
Created: 2026-10-15
Updated: 2026-10-21

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
- [ ] Independent review of the integrated change; repairs. Round 0 (Codex; Claude abstained): U1–U5 and the worker's U6, all accepted. Round 1 (Codex, focused): U2–U5 verified, U1 and U6 repaired again in `e760a84`. Round 2 (Codex, focused, plus the coordinator's shot comparison): U1 and U6 verified; U7, U8 and U9 open. Records in `reviews/`.
- [ ] Merge, push, deploy check, worktree cleanup, outcome.

## Handoff (2026-10-21)

The coordinator session that ran M1–M3 and review rounds 0–2 passed its ten-turn limit (R6), so it assigns no more work. The next coordinator owns what follows.

- State: branch `repair-u1` in worktree `../met-worktrees/repair-u1`, head `e760a84`, clean and unmerged, holding the U1–U6 repairs `f66e724`..`e760a84`. Its repair worker did not survive a restart. Main is at this commit, which adds only the AGENTS.md canon sync (`6451f7c`..`4849135`) and these records to `6f8892f`; merge main into the branch first.
- Next: a repair worker on `repair-u1` for U7, U8 and U9, whose instructions are their dispositions in `reviews/2_implementation.md`, with `MET_PORT=5470 npm run verify` green. Then a focused Codex check of its diff as round 3 (`reviews/3_implementation.md`). Then merge to main, run `npm run verify` on main (port 5300), push, watch `pages.yml` and check the live page. Finally fill the dispositions' repair columns, tick the steps, write the Outcome, set Status complete, add a devlog line, and remove the worktree and branch.
- Evidence, ignored, in the main checkout: `tmp/review-runs/` holds the prompts (`prompt-u1-final.md`, `prompt-u1r.md`, `prompt-u1r2.md`), the reports (`codex-u1.txt`, `codex-u1r.txt`, `codex-u1r2.txt`), the diffs (`u1.diff`, `u1r.diff`, `u1r2.diff`), and the shot diff tools `pngdiff.cjs` and `crop.cjs` with `u1r2-shots-diff.txt`. Shots at `e760a84` are in `../met-worktrees/repair-u1/.shots/shots/`, and at `4849135` in `.shots/shots/`.

## Outcome

Pending.
