# Remove the build replay and its animation

Status: active
Owner: claude/worktree-remove-build-replay
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

The owner (2026-11-11): "I don't need the animation of how the building came into being. We can remove that. Don't try to improve it. In fact we should remove it."

Outcome: the page shows the finished building and nothing else of its construction. There is no build replay, timeline, Build menu, follow camera, playback key or query that sets a build position, and the code no longer animates the build: no player, no motion, stagger or arrival tint, and no scene state that depends on a position `t`. The model is still composed of steps in historical chapters, which stay as the way area modules organise and name the model's parts.

## Scope

Included, in two milestones, each merged to main on its own:

- A, the page: the timeline bar's playback controls, the Build menu, the follow camera, the timeline keys, the queries `t`, `step`, `autoplay` and `replay`, their facts in `window.__met`, the camera inset for the bar, the player, the step label, the steps' `focus` and `weight` (read only by the follow camera and the player), the capture set's build-position shots and the sweep's `--t`, and every e2e spec and doc that covers them. The Walk toggle stays, in its strip at the bottom right.
- B, the engine: the timeline becomes an assembly built once at rest: no `t`, `evaluate`, motion, stagger, tint or light ramp; the steps' `motion` and `stagger` and the kit's `order` go; walk mode, the doors, the labels and the floor view lose what they did when the build moved; their unit tests follow.

Kept: steps and chapters as the model's composition (ids, titles, details, years, `solo=`), every gate that is not about the build moving (closure, reach, routes, doors, labels, walk, budgets).

Excluded: merging meshes across steps, renaming steps or chapters, any change to the model's geometry.

## Approach

A first, since it is what the owner sees; B then removes what A leaves unreachable. Each milestone keeps the finished building's pixels, which the standard shots compare with main's. The owner's request retires the local rule "The build process is the product" (2026-10-10).

## Acceptance criteria

- [x] A: the default page, every query and both viewports show no timeline, Build menu or follow toggle; the Walk toggle, View menu, floor picker, walk mode, doors and labels work as before; `npm run verify` and `npm run test:e2e` pass; the standard shots of the finished building match main's within capture noise. Verified 2026-11-11: verify passed (752 unit tests in 81 files, 88 e2e); of the 52 standard shots left (64 before, less 10 chapter and 2 mid-build shots), the 48 of the model differ from main's (75abdd3) by at most 2 of 255, and the four UI shots only where the Build button was.
- [x] B: no code path moves, hides or tints a piece by a build position; `npm run verify` and `npm run test:e2e` pass; the standard shots match A's within capture noise. Verified 2026-11-11 on `7bb47fc`: no `t`, `evaluate`, motion, stagger, instance colour or light ramp is left in `src/`; a fingerprint of the finished model's content matches A's; verify passed but for one door swing's frame budget under load, which passed three runs alone; the shots match A's but for lone pixels where faces tie in depth, since a mesh's instances are now in the order their step added them (review 0, F2: 21 of 52 shots differ in 1 to 13 pixels, by at most 26 of 255).
- [x] spec.md, AGENTS.md, README.md, local-rules.md and the devlog describe the page and engine as they are.

## Implementation steps

- [x] A: page, UI, queries, facts, capture, e2e, docs; merged.
- [ ] B: engine, model fields, walk, doors, labels, unit tests, docs; merged. Committed on the branch (`2859169`, `8053ce6`, merged with main at `7bb47fc`), the review's repairs after it; not yet on main.
- [x] Independent review of the result, findings answered: `reviews/0_implementation.md`, Codex and Claude on `7bb47fc`, no serious finding, F0 to F6 repaired in tests, wording and one dead field.

## Outcome

Pending.
