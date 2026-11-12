# Split the timing budgets out of the functional gate

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

`npm run verify` holds two kinds of check: what the code and the page do, and how long they take. The second kind depends on what else the machine is doing. On 2026-11-11, with five sessions busy, gate runs on trees that changed nothing a frame runs kept failing on one timing check, a different one each time: a door swing's slowest frame (19.1 ms and 17.7 ms against 16.7), the walking frame budget (16.89 ms against 16.7), and the unit-test headroom check (`scripts/window-station.test.ts`, 10.9 s against 10 s). Every functional check passed each time (`docs/work/29_artwork-cards-and-forms/plan.md`, landing A2). Work units 23 and 25 record the same under load (19.5, 17.7 and 16.78 ms). The same day work unit 26's first `npm run verify` of its milestone B failed once on a door swing's budget (`doors.spec.ts`, the swing test), at 42.6 ms of work with two review lanes running, then passed three runs alone. The owner chose on 2026-11-11 to split them ("Split them").

Outcome: `npm run verify` checks behaviour and asserts no timing budget, so no budget can fail it on a busy machine; functional checks can still meet load (the findings in Outcome). A new gate, `npm run budgets`, holds every timing budget, is run alone on a quiet machine, and is required before landing a change that can alter what a frame, the build or a test costs.

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

### Inventory

Every assertion that compares a duration with a budget, as the worker found them at `84be2b0` by reading every e2e spec and helper and searching `src/`, `scripts/` and `tests/` for `toBeLessThan`, `performance.now`, `Date.now`, `benchmark`, `frameMs`, `readyMs`, `bvhMs` and the numbers 16.7, 2000 and 4000. Nine assertions in source, every one moved behind the switch with its number unchanged, and two more on review (item 8); the line numbers are `84be2b0`'s. The same search on the merge of origin/main (`cb1f951`) found no other:

1. The build: from navigation start to `window.__shotReady` (`perf.readyMs`) under 4000 ms. `tests/e2e/layout.spec.ts:217`, in "the whole sequence builds within the 4 s budget, from navigation to ready".
2. The collision: `walk.bvhMs` under 2000 ms. `tests/e2e/walk.spec.ts:316`, in "walking holds 60 frames a second with the look target on … the collision builds within 2 s".
3. The walking frame, three assertions in `tests/e2e/helpers.ts` `expectWalkingBudget` (lines 241 to 243): the median work a walking frame (`walk.frameMs`) under 16.7 ms, the mean GPU-synced render (`benchmark(30)`) under 16.7 ms, and the median frame interval under 16.7 × 1.1 = 18.37 ms. Called nine times in four tests: four in the walk.spec test of item 2 (on the plaza, running up the front steps, from the great-hall and the second-floor spawns); four in `tests/e2e/routes.spec.ts`, walking and running, in "the walking frame budget in the Temple of Dendur hall at R3's end …" and "… in the Leon Levy and Shelby White Court at R4's end …", which skip under a CPU throttle; one in `tests/e2e/labels.spec.ts`, in "walking: the card shows while the eye looks at the Triumph of Marius …", at 1280×720 only.
4. A door's swing: its slowest timed frame under 16.7 ms of work. `tests/e2e/doors.spec.ts:230` (`timeSwing`): four swings in "facing into the Great Hall, standing and walking through two door cycles, and in it facing out …" and four in "Weston's door, its leaves casting a shadow …".
5. A GPU-synced render with a shadow pass, facing into the Great Hall through the open doorway, under 16.7 ms. `doors.spec.ts:374`, in the first test of item 4.
6. The slowest walking frame through two door cycles under 16.7 ms. `doors.spec.ts:387`, in the same test.
7. The unit-test headroom: a passed unit test that takes over a sixth (`HEADROOM`, 6) of its timeout fails the run, so over 10 s of Vitest's 60 s. `scripts/test-headroom.ts` (`headroomProblems` and the reporter `TestHeadroom`), wired in `vitest.config.ts` off GitHub's runner.
8. Moved behind the switch on review (review 0, F3), two floors on how many frames fit in a fixed activity, which depend on the frame rate: more than 20 frames timed over a door's swing of 0.7 s (`SWING_SECONDS`), so over about 29 frames a second (`doors.spec.ts:229`, in `timeSwing`, with item 4), and more than 120 walking frames recorded through the two door cycles (`doors.spec.ts:388`, with item 6). Their numbers are unchanged too.

Kept in `npm run verify`, since none compares a duration with a budget:

- That each budget was measured at all (review 0, F1): its reading, `budgetCheck`'s `measured`, a finite number read from the page, in either mode, so a missing `walk.frameMs`, `benchmark`, `bvhMs` or `perf.readyMs`, or a swing or a walk with no frame timed (the slowest of none is −Infinity), fails the test; only the reading's comparison with its budget goes behind the switch.
- Counts, which no clock changes: at most 3,000,000 triangles and 900 meshes (`layout.spec.ts:218-219`, `src/build/sequence.test.ts`), the collection's 110 meshes and 600,000 triangles (`src/model/collection/placement.test.ts`), the doors' 20 meshes and draws (`src/model/doors.test.ts`).
- What a budget was measured over: `perf.readyMs` set and longer than `perf.buildMs` (`layout.spec.ts:213, 216`); the eye moving in over 95% of the walking frames through the cycles and over 3 m walked (`doors.spec.ts:390-391`), a share that a walk with no frame recorded leaves NaN, which fails; the collision's steps and triangles (`walk.spec.ts:317-318`).
- A passed unit test whose time or timeout Vitest does not give still fails the run (`scripts/test-headroom.ts`), since then no headroom is read at all: it depends on Vitest's reporter API, not on the clock.
- Deadlines: test timeouts, `waitForFunction` timeouts, `open`'s 20 s, `doorIs`'s 4 s and the like bound a wait, so a broken page fails rather than hangs; most scale with `MET_CPU_THROTTLE`.
- Times printed and never asserted (`src/model/reach.test.ts`'s fill, `routes.spec.ts`'s short walk), and simulated seconds under fixed time steps (`src/walk/walker.test.ts`).

### The switch

`MET_BUDGETS`, read by `budgetsAsserted` in `scripts/budgets.ts`, which `tests/e2e/helpers.ts` and `vitest.config.ts` call; nothing under `src/` reads it (`src/repo-conventions.test.ts` already fails on a `process.env` read there). `1` asserts every budget as before; unset or blank, each is measured and printed, one over its budget printed as not asserted; any other value throws, naming it, so a misspelt switch cannot pass for either. In the e2e specs each budget's assertion stands unchanged inside `budgetCheck(name, measured, () => …)` (`tests/e2e/helpers.ts`), which asserts in either mode that `measured`, the reading, is a finite number (review 0, F1), and with the switch off catches only the assertion's failure and prints it; every test that holds a budget carries the tag `@budget`, and a budget held in an untagged test fails in either mode, so `npm run budgets` cannot leave one out. The headroom reporter takes the switch: off, it prints the tests over a sixth of their timeout and leaves the exit status alone.

`npm run budgets` runs `node scripts/budgets.ts`, which runs `npm test` and then `npm run test:e2e -- --grep @budget`, each with `MET_BUDGETS=1`, both whatever the first gives, and fails if either fails; with `MET_CPU_THROTTLE` over 1 it refuses to run, naming the variable, since the budgets are this machine's, unthrottled, and the route budget tests skip under a throttle (review 0, F2). It is a script rather than `MET_BUDGETS=1 …` in `package.json` because npm runs scripts in cmd.exe on Windows, where that form does not set a variable, and no new dependency is allowed. `npm run verify` sets nothing.

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
