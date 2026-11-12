# Review 1: implementation

## Target

The repairs after review 0 of work unit 30: repository met, commit `148b985` on the coordinator's branch `worktree-improvement-list`, read in a clean checkout at that commit. It holds the worker's branch at `e38de8d` (the repairs `b763520` and `21f6dca`, their red proofs `4589d5c`, a merge of origin's main and the plan's last state) and one change by the coordinator, `148b985`, which lowered the walking sampler's floor from 120 frames to 60. The reviewer was given three ranges: `git diff cb1f951 4589d5c`, `git diff 6b37eb3 e38de8d` and `git diff 2a814cc 148b985`.

## Reviewers and coverage

- One lane, as the fleet's runbook gives a round of repairs: Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/walk/walk-mode.ts`, `tests/e2e/zoom.spec.ts` and `scripts/test-headroom.ts` outside the diff.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. The lane ran no tests, builds or network requests.

The prompt named each repair that changes behaviour beside its test or proof (F1, F2, F3 with F10, the coordinator's floor, F6, F7, F9), asked of each whether it holds in every case, whether its evidence fails without it and whether it changed anything outside its finding, and asked whether `npm run budgets` can still report success with a budget unasserted and whether `npm run verify` still asserts anything that depends on the machine's speed, a deadline that bounds a hang apart.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

Reviewed `148b985` read-only. No tests, builds, network requests or file changes.

**F12 — major — Shortened samples can conceal excessive walking work.** [helpers.ts:242](tests/e2e/helpers.ts:242) reads:

```ts
const work = await page.evaluate(() => window.__met?.walk.frameMs ?? Number.NaN);
```

That value does not describe the shortened sample. Outside the diff, [walk-mode.ts:52](src/walk/walk-mode.ts:52) fixes `FRAME_WINDOW = 120`, and lines 285–307 retain the last 120 walking-mode frames and return their median. Standing frames count too; entering another spawn does not clear the buffer.

For example, approximately 84 frames fit in 1.5 seconds at an 18 ms interval. If 50 current frames cost 17 ms and the remainder are cheap, the current sample’s work median exceeds 16.7 ms. Retained cheap frames can nevertheless leave fewer than half of the 120 buffer entries expensive, making the reported median pass. The 18 ms interval passes 18.37 ms, and a cheap render benchmark does not detect expensive physics or look-target work. This can occur in a route location outside the door tests’ maximum-work coverage.

The coordinator’s objection to requiring 120 frames is valid for a steady 54–60 fps machine. Accepting 60 requires measuring work over the actual sample, however. The uniform 45 ms plant does not expose this mixed-window defect.

**F13 — major — The sampler does not bound how long W remains held.** [helpers.ts:232](tests/e2e/helpers.ts:232) presses W before installing the sampler. Its clock starts at the first RAF callback:

```ts
now - (times[0] ?? now) < ms
```

After sampling resolves, another `page.evaluate` reads work before `keyboard.up('KeyW')`. Runner or protocol delays before sampling and before key release are outside the 1.5-second window. The final callback can also cross that window.

Consequently, the claimed maximum travel of 3 m walking or 7.5 m running is not enforced. A delayed runner can leave the page walking beyond it, retaining the load dependence of the subsequent “no door or artwork” assertion at [walk.spec.ts:334](tests/e2e/walk.spec.ts:334). The 45 ms page-frame plant exercises slow sampling, not delayed input delivery or release.

**F14 — minor — The tag guard cannot make the dedicated gate detect an omitted budget.** [budgets.ts:31](scripts/budgets.ts:31) selects:

```ts
command: 'npm run test:e2e -- --grep @budget'
```

The guard at [helpers.ts:260](tests/e2e/helpers.ts:260) executes inside a selected test:

```ts
if (!info.tags.includes('@budget')) throw new Error(...)
```

Removing a tag excludes the callback before that guard can execute. The recorded F7 proof explicitly confirms this: its filtered list contains six tests and omits the build budget ([gate-proofs.md:263](docs/learning/gate-proofs.md:263)). The remaining tests can pass and the runner can print “every budget held.” Full `verify` detects this mutation; standalone `budgets` does not. All current budget tests are tagged, so this is a coverage-guard gap, not a claim that HEAD currently omits one.

**F15 — minor — Fixed-window movement requirements remain in `verify`.** Outside the diff, [walk.spec.ts:159](tests/e2e/walk.spec.ts:159) still combines:

```ts
await hold(page, key, 250);
expect(along(delta, levelAxes(before)), ...).toBeGreaterThan(5);
```

`hold` releases the key after that fixed wait, then observes the result. Likewise, [zoom.spec.ts:178](tests/e2e/zoom.spec.ts:178) requires more than 5 m after a 400 ms hold. Neither waits for movement until a hang deadline. A scheduling delay that leaves insufficient frames between keydown and keyup can fail these assertions; subsequent frames cannot recover the released input. These are remaining machine-speed dependencies beyond the excluded touch finding and hang deadlines.

The repair checks are:

| Repair | Does the claim hold? | Does its evidence distinguish the repair? | Effects beyond the finding |
|---|---|---|---|
| **F1** | Every executed `budgetCheck` validates finiteness before the switch. It does not establish freshness or sample identity; see F12. | The four specifically named finite-reading failures distinguish the repair. Without those guards, the missing-value comparisons are suppressed with budgets off. | No unrelated change found. |
| **F2** | Yes: `Number(text) > 1` matches `throttleRate`’s condition, including fractional and whitespace-padded values. | The recorder tests require exit 2 and zero calls; the real-script test also requires exit 2. Removing refusal breaks them. | No unrelated change found. |
| **F3/F10** | The listed door conditions are switched correctly. The walking sampler’s full input-duration claim fails as described in F13. | The short-swing proof distinguishes the moved floor. The door-cycle count/share/distance checks have no distinguishing plant. The 45 ms plant’s overall budget failure survives removal of the sample floor because the interval also fails; its recorded frame count does demonstrate truncation. | Shortening the sample changes which work frames enter the reading: F12. |
| **Landing floor of 60** | Removes the unintended steady 80 fps requirement, but does not ensure the work median belongs to the sample. A median interval also does not establish average throughput. | The existing 30–32-frame plant fails both floors. It does not validate the newly accepted 60–119-frame cases. | F12 is an accepted-case regression. |
| **F6** | The waits bound hangs, and the output/status/folder assertions remain. Inner close and cleanup bounds still apply. | Recorded launcher durations of 40–53 seconds exceed the old 20-second wait. Quiet runs could pass either version; this is load evidence, not a deterministic regression test. | Giving these tests 180 seconds also raises their effective headroom allowance from 10 to 30 seconds: [test-headroom.ts:32](scripts/test-headroom.ts:32) checks `duration * HEADROOM > timeout`. The ratio remains six. |
| **F7** | The guard rejects an untagged test when that test executes. Its standalone coverage claim has the limitation in F14. | The specifically named untagged-test error disappears without the guard. The filtered budget run never exercises it. | No behavioral change; this repair adds proof. |
| **F9** | The normal absolute/relative script entry and Windows case handling are covered. | The simulated no-entry proof catches a dead entry point. Reverting to `import.meta.main` could still pass the real-script test on a Node version that supports it; the test does not itself establish compatibility with early Node 24. | No unrelated change found in normal entry/import paths. |

Thus `budgets` can report success while checking the wrong walking-work population (F12), and its tag guard cannot independently detect omitted tests (F14). `verify` also retains non-hang speed-dependent checks (F13 and F15).

REJECT — F12: shortened samples can pass with a walking-work median contaminated by earlier frames.

## Findings and disposition

| ID | Finding | Decision | Repair |
|---|---|---|---|
| F12 | The page's reading of a walking frame's work is the median of its last 120 walking-mode frames (`src/walk/walk-mode.ts` `FRAME_WINDOW`), so a sample cut short at 1.5 s, accepted from 60 frames by the coordinator's change, leaves earlier frames in that window, and a walk over its budget can pass behind them (major). | Accepted. The coordinator's floor of 60 was wrong, and the worker's 120 within 1.5 s had been right about the window while asking a frame rate the spec does not hold. | By the coordinator at `3ba46db`: the sampler reads exactly `FRAME_WINDOW` frames again, with no cap in time and no count; the constant is exported and the helper imports it. |
| F13 | The 1.5 s did not bound how long W was held: the key is pressed before the sampler's clock starts and released after another round trip, so the travel was not bounded and `walk.spec.ts`'s check of no look target after a sample still hung on the machine's speed (major). | Accepted. | By the coordinator at `3ba46db`: that check is read at the spawn, after `settle` and before the sample, so nothing after a sample rests on where the walker stands; the cap is gone with F12. |
| F14 | The guard that fails a budget held in an untagged test runs only where that test runs, so `npm run budgets`, which selects by the tag, cannot show a tag taken off (minor). | Accepted as a matter of what the documents say: `npm run verify` runs every test and shows it. | The spec, the plan and AGENTS.md say so, at `3ba46db`. |
| F15 | `walk.spec.ts` and `zoom.spec.ts` hold a key for a fixed 250 or 400 ms and then ask for more than 5 m of travel, which a scheduling delay could fail (minor). | Noted, not repaired. They are older than this unit, review 0's Claude lane read them as deadlines with wide margins (tens of metres against 5), and none has failed in the day's loaded runs. | None; if one fails under load it is a defect to report against its spec. |
| the checks | F1, F2, F3 with F10's door conditions, F6, F7 and F9 hold as claimed, by the lane's table: each named proof or test distinguishes its repair, with two bounds it states: the door cycles' count, share and distance have no plant of their own, and F9's real-script test would pass on a Node that has `import.meta.main`. Giving the window-station tests 180 s raises their headroom allowance from 10 s to 30 s, the ratio unchanged. | Taken as stated. | None. |

## Verification

- `npm run verify` on `148b985` through the gate lock: 741 unit tests in 85 files, typecheck, lint, build and 93 e2e tests in 7.3 minutes. `npm run budgets` on the same tree: the unit stage passed; of the 7 budget tests one failed, a route test that could not turn the walker, while the coordinator was writing F12's repair into the same working tree under the run's dev server. That is the coordinator's own fault and no reading of the tree; the lesson is not to touch a tree while a gate runs on it.
- The gates of `3ba46db`, the tree that lands, are in review 2's record.

## Round outcome

Rejected on F12. The coordinator made the repairs at `3ba46db`, and a further one-lane check reads them (review 2).
