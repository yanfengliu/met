# Split the timing budgets out of the functional gate

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

`npm run verify` holds two kinds of check: what the code and the page do, and how long they take. The second kind depends on what else the machine is doing. On 2026-11-11, with five sessions busy, gate runs on trees that changed nothing a frame runs kept failing on one timing check, a different one each time: a door swing's slowest frame (19.1 ms and 17.7 ms against 16.7), the walking frame budget (16.89 ms against 16.7), and the unit-test headroom check (`scripts/window-station.test.ts`, 10.9 s against 10 s). Every functional check passed each time (`docs/work/29_artwork-cards-and-forms/plan.md`, landing A2). Work units 23 and 25 record the same under load (19.5, 17.7 and 16.78 ms). The owner chose on 2026-11-11 to split them ("Split them").

Outcome: `npm run verify` checks behaviour, and passes or fails the same whatever else the machine is doing. A new gate, `npm run budgets`, holds every timing budget, is run alone on a quiet machine, and is required before landing a change that can alter what a frame, the build or a test costs.

## Scope

In: the assertions that compare a duration with a budget, and nothing else of the tests that hold them.
- `tests/e2e/helpers.ts` lines 241 to 243: the walking frame budget (work, GPU-synced render, interval), which `walk.spec` and `routes.spec` call.
- `tests/e2e/doors.spec.ts` lines 230, 374 and 387: a swing's slowest frame, the GPU-synced render through the open doorway, and the slowest walking frame through two door cycles.
- `tests/e2e/layout.spec.ts` line 217: the 4 s from navigation to ready.
- `tests/e2e/walk.spec.ts` line 316: the collision built within 2 s.
- `scripts/test-headroom.ts`, wired in `vitest.config.ts`: a passed unit test that takes over a sixth of its timeout fails the run.
- Any other such assertion the worker's inventory finds.
- `package.json`, `playwright.config.ts`, `vitest.config.ts`, and the documents: AGENTS.md's Gates, the spec's Budgets and Verification, `docs/learning/gate-proofs.md`, and the one line of `docs/policies/local-rules.md` that lists the commands run through the gate lock.

Out: every budget's number, which stays as it is; the functional part of each test, which stays in `npm run verify`; the 4× CPU throttle runs of `routes.spec` and `walk.spec` (AGENTS.md, Load), which test behaviour under load and stay; anything under `src/`; the Pages workflow, which runs the unit tests with `CI` set, where the headroom check is already off.

Out, until work unit 26's second milestone is on origin's main: `src/build/**`, `src/main.ts`, `src/walk/walk-mode.ts`, `collision.ts`, `door-world.ts`, `src/viewer/doors.ts`, `art-label.ts`, `floor-view.ts`.

## Approach

One switch, read by the tests and never by `src/`: off, a budget is measured and printed and not asserted; on, it is asserted as today. `npm run budgets` sets it and runs what holds a budget; `npm run verify` leaves it off. The worker settles the mechanism (an environment variable read in `tests/e2e/helpers.ts` and by the headroom reporter is the plain form) and records it here with the inventory.

When `npm run budgets` is required: before landing a change that can alter what a frame, the build or a test costs (rendering, the walk, the model's pieces, the build engine, a new or slower test), through `tmp/gate.sh`, with nothing else heavy running. A landing that cannot (documents, the catalogue's text, a script the page never runs) says so in its record instead.

## Acceptance criteria

- [ ] An inventory in this plan of every budget: its test, its number, and that the number is unchanged.
- [ ] With the switch off, each budget's planted defect leaves `npm run verify` green and prints the measurement; with it on, `npm run budgets` fails and names the budget. One red proof per budget, recorded in `docs/learning/gate-proofs.md`.
- [ ] `npm run verify` passes three runs in a row while a second heavy job runs on the machine, and `npm run budgets` passes alone.
- [ ] No assertion is deleted and no number changed: the diff shows each one moved behind the switch.
- [ ] AGENTS.md says what each gate checks and when `npm run budgets` is required, and stays under its size limit; the spec and the local rules' lock list name the new gate.
- [ ] An independent review of the exact revision, both lanes once, has no finding left that matters.

## Implementation steps

- [ ] Worker: inventory, the switch, the new script, the red proofs, the documents, hand back.
- [ ] Coordinator: review, accept, land, devlog line.

## Outcome

Pending.
