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
8. Moved behind the switch on review (review 0, F3 and F10), the conditions of the frame budgets' readings, which hang on the frame rate: more than 20 frames timed over a door's swing of 0.7 s (`SWING_SECONDS`), so over about 29 frames a second (`doors.spec.ts:229`, in `timeSwing`, with item 4); through the two door cycles more than 120 walking frames recorded, the eye moving in over 95% of them and over 3 m walked (`doors.spec.ts:388-391`, with item 6); and, for a while on review, a count of the frames the walking sampler read within a cap of 1.5 s. That cap and its count are gone again. The repair of F10 asked for all 120 frames within the 1.5 s, about 80 frames a second where the interval's budget asks about 54; the coordinator lowered it to 60 at landing; and review 1 (F12, F13) showed why neither holds: the page's own reading of a walking frame's work is the median of its last 120 walking frames (`src/walk/walk-mode.ts` `FRAME_WINDOW`), so a sample cut short leaves earlier frames in that window, and the cap did not bound how long W was held either. The sampler reads exactly those 120 frames again, however long they take, and the one functional check that rested on where the walker then stood (`walk.spec.ts`, no look target at an interior spawn) is read at the spawn, before the sample. Those numbers are unchanged but the 1.5 s, which F10 asked for.

Kept in `npm run verify`, since none compares a duration with a budget:

- That each budget was measured at all (review 0, F1): its reading, `budgetCheck`'s `measured`, a finite number read from the page, in either mode, so a missing `walk.frameMs`, `benchmark`, `bvhMs` or `perf.readyMs`, or a swing or a walk with no frame timed (the slowest of none is −Infinity), fails the test; only the reading's comparison with its budget goes behind the switch.
- Counts, which no clock changes: at most 3,000,000 triangles and 900 meshes (`layout.spec.ts:218-219`, `src/build/sequence.test.ts`), the collection's 110 meshes and 600,000 triangles (`src/model/collection/placement.test.ts`), the doors' 20 meshes and draws (`src/model/doors.test.ts`).
- What a budget was measured over: `perf.readyMs` set and longer than `perf.buildMs` (`layout.spec.ts:213, 216`); the collision's steps and triangles (`walk.spec.ts:317-318`).
- A passed unit test whose time or timeout Vitest does not give still fails the run (`scripts/test-headroom.ts`), since then no headroom is read at all: it depends on Vitest's reporter API, not on the clock.
- Deadlines: test timeouts, `waitForFunction` timeouts, `open`'s 20 s, `doorIs`'s 4 s and the like bound a wait, so a broken page fails rather than hangs; most scale with `MET_CPU_THROTTLE`. On review (F6, F10), `scripts/window-station.test.ts`'s wait for its launcher, 20 s, which raced a loaded machine, is now 120 s, a bound on a hang, its three window-station tests given 180 s; and the walking budget's test in `walk.spec.ts` has 45 s where it had the default 30.
- Times printed and never asserted (`src/model/reach.test.ts`'s fill, `routes.spec.ts`'s short walk), and simulated seconds under fixed time steps (`src/walk/walker.test.ts`).

### The switch

`MET_BUDGETS`, read by `budgetsAsserted` in `scripts/budgets.ts`, which `tests/e2e/helpers.ts` and `vitest.config.ts` call; nothing under `src/` reads it (`src/repo-conventions.test.ts` already fails on a `process.env` read there). `1` asserts every budget as before; unset or blank, each is measured and printed, one over its budget printed as not asserted; any other value throws, naming it, so a misspelt switch cannot pass for either. In the e2e specs each budget's assertion stands unchanged inside `budgetCheck(name, measured, () => …)` (`tests/e2e/helpers.ts`), which asserts in either mode that `measured`, the reading, is a finite number (review 0, F1), and with the switch off catches only the assertion's failure and prints it; every test that holds a budget carries the tag `@budget`, and a budget held in an untagged test fails where that test runs: under `npm run verify`, which runs every test, since `npm run budgets` selects by the tag and would not run it (review 1, F14). The headroom reporter takes the switch: off, it prints the tests over a sixth of their timeout and leaves the exit status alone.

`npm run budgets` runs `node scripts/budgets.ts`, which runs `npm test` and then `npm run test:e2e -- --grep @budget`, each with `MET_BUDGETS=1`, both whatever the first gives, and fails if either fails; with `MET_CPU_THROTTLE` over 1 it refuses to run, naming the variable, since the budgets are this machine's, unthrottled, and the route budget tests skip under a throttle (review 0, F2). It is a script rather than `MET_BUDGETS=1 …` in `package.json` because npm runs scripts in cmd.exe on Windows, where that form does not set a variable, and no new dependency is allowed. `npm run verify` sets nothing.

## Acceptance criteria

- [x] An inventory in this plan of every budget: its test, its number, and that the number is unchanged.
- [ ] With the switch off, each budget's planted defect leaves `npm run verify` green and prints the measurement; with it on, `npm run budgets` fails and names the budget. One red proof per budget, recorded in `docs/learning/gate-proofs.md`. Met in part, as the proofs show: with the switch off no budget failed a test and each printed over its budget, but `npm run verify` was green only in set 1, sets 2 and 3 red on `mouse-look.spec.ts:221` alone, a functional check; with it on, each of the nine assertions failed at its own line, the headroom failed the unit run, and of review 0's budgets the swing's floor and the walking sampler's frames failed theirs, while the door cycles' floors (frames, moving share, metres) have no plant that broke them.
- [ ] `npm run verify` passes three runs in a row while a second heavy job runs on the machine, and `npm run budgets` passes alone. The three loaded runs passed on `e88f548`; `npm run budgets` passed alone on `f2e576d` and, on the tree that lands, `6b37eb3`, at its second try, the first red on the functional window-station check (Outcome).
- [x] No assertion is deleted and no number changed: the diff shows each one moved behind the switch. Review 0 added a number, the walking sampler's 1.5 s (F10), which review 1 took out again (F12), and widened a deadline that is no budget, the window-station tests' wait (F6).
- [x] AGENTS.md says what each gate checks and when `npm run budgets` is required, and stays under its size limit; the spec and the local rules' lock list name the new gate.
- [ ] An independent review of the exact revision, both lanes once, has no finding left that matters. Review 0, both lanes on `cb1f951` (`reviews/0_implementation.md`); its repairs are `b763520` and `21f6dca`, not yet reviewed.

## Implementation steps

- [x] Worker: inventory, the switch, the new script, the red proofs, the documents, review 0's repairs, hand back.
- [ ] Coordinator: review, accept, land, devlog line.

## Outcome

Pending the review of the repairs and the landing. The worker's record, 2026-11-11, branch `worktree-agent-a6ce13e3955fa859e`, each run through the gate lock:

- The switch, the gate and the documents: `f2e576d`. Its red proofs, three sets of planted defects on `f2e576d`, recorded at `e88f548` in `docs/learning/gate-proofs.md`, "The timing budgets".
- Three loaded runs of `npm run verify` in a row on `e88f548`, the tree clean, each beside a second heavy job, 8 busy threads (`tmp/u30-burn.mjs`, ignored) on the machine's 32 with the other sessions busy too: all green, 803 unit tests and 93 e2e tests each, in 582, 603 and 571 s, the CPU at 90, 100 and 81% 20 s into the job. Runs 2 and 3 printed `scripts/window-station.test.ts`'s F7 test over its headroom, 11,980 and 10,454 ms, as not asserted.
- The merge of origin/main with work unit 26's milestone B, `cb1f951`: `npm run verify` green (732 and 93, 486 s); `npm run budgets` red, the slowest walking frame through the door cycles at 24.70 ms against 16.7, the CPU at 82% from other sessions, where `verify` five minutes before read 8.60 ms. A second try was stopped on the coordinator's word, to repair review 0's findings first.
- Review 0's repairs, `b763520` (F1 to F5) and `21f6dca` (F6, F8 to F10), their red proofs recorded at `4589d5c`. On the merge of origin/main at `9fa0fca`, `6b37eb3`, the tree that lands: `npm run verify` green, 741 unit tests and 93 e2e tests, 466 s, the CPU at 100% at its start; `npm run budgets` red at its first try, every e2e budget and the headroom held but `scripts/window-station.test.ts`'s "closes the browser and ends with 0" got status 1 at 13.2 s, the CPU at 100%; green at its second, "every budget held", 741 and 7, 87 s, the CPU at 56%.
- Findings left as they are. `mouse-look.spec.ts:221`, a finger's tap on the Walk toggle under the mouse's lock leaving walk mode where every frame is slow, goes to `docs/work/27_improvement-list/plan.md`, item 6, the touch unit deciding what the tap should do. The window-station tests' status 1 and left folder under heavy load come from two bounds of their own, not from a crash: `tests/e2e/browser-server.ts`'s 10 s on the browser's close (`CLOSE_MS`), past which it exits 1 by design, and `scripts/window-station.ps1`'s 10 s of tries to remove the temporary folder; both bound a hang, the e2e teardown ignores the status and removes the folder itself, but a machine at 100% outlasts them, so `npm test`, in either gate, can fail on them there. Widening them is the coordinator's to decide.
