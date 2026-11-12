# Review 2: implementation

## Target

The repairs after review 1 of work unit 30: repository met, commit `3ba46db` on the coordinator's branch `worktree-improvement-list`, read in a clean checkout at that commit. The repairs are that one commit over `148b985`, the revision review 1 read; between them the branch merged a research branch (documents under `docs/research` only), which was not under review. The reviewer was given the commit's own diff, `git diff 3ab3933 3ba46db`.

## Reviewers and coverage

- One lane, as the fleet's runbook gives a round of repairs: Codex, `gpt-6-astra` at `xhigh`, read-only sandbox, codex-cli 0.163.0. Its sandbox check kept the lane. It read `src/main.ts`, `src/walk/walk-mode.ts`, `src/model/core/plan-data.ts` and `tests/e2e/global-setup.ts` outside the diff.
- The tree's `git status` and `git diff HEAD` were empty before and after, at the same HEAD. The lane ran no tests, builds or network requests.

The prompt asked whether reading exactly the page's own window of walking frames closes F12 in every case, whether reading the look target at the spawn closes F13, what the helper's new import pulls into every spec, and whether the sentence on an untagged budget is true.

## Reports

Absolute paths of the reviewed checkout in the lanes' links are shortened to repository paths, and a report's own headings are set two levels down. Nothing else is changed; each lane's own finding numbers are kept as it wrote them, and the table after the reports maps them.

### Codex (gpt-6-astra)

**F16 — major — [helpers.ts:233–234](/tests/e2e/helpers.ts:233): the work reading is still not tied to the sampled window.**

The sampler resolves with `resolve(times.slice(1).map(...))`, then reads work in a separate call:

```ts
const work = await page.evaluate(() => window.__met?.walk.frameMs ?? Number.NaN);
```

Between those calls, the page can record additional frames. Outside the diff, [main.ts:328–334](/src/main.ts:328) calls `walk.noteFrame(...)` and schedules another frame; [walk-mode.ts:288](/src/walk/walk-mode.ts:288) evicts the oldest entry with `this.frameTimes.shift()`.

Even one replacement matters. [walk-mode.ts:307](/src/walk/walk-mode.ts:307) selects `times[Math.floor(times.length / 2)]`: 60 readings of 1 ms and 60 of 17 ms produce 17 ms, failing. Replace one oldest 17 ms reading with a later 1 ms reading and the reported median becomes 1 ms, passing. Neither the 18.37 ms interval limit nor the separate GPU measurement necessarily catches that.

The 121 sampler callbacks produce 120 intervals and, while walking remains active and prepared, flush pre-W readings, earlier spawns, earlier samples, and frames during key delivery. That part closes the original contamination problem. It does **not** guarantee “these frames and no others”: the later read can shift the window by one, two, or more frames. Capture the work reading inside the final sampler callback alongside the intervals.

**F17 — minor — [spec.md:239](/docs/design/spec.md:239): the old F14 claim remains in the contract.**

The paragraph still says:

> “Under either gate … fails its test, and so does one held in an e2e test not tagged `@budget`”

That contradicts the corrected sentence at line 249. [budgets.ts:31](/scripts/budgets.ts:31) runs `--grep @budget`; an excluded test never reaches `budgetCheck`. The new sentence is true for tests executed by the unfiltered verify run, but repair 3 leaves the contradictory claim in place.

Repair 2 closes the reported spawn-check failure. [walk.spec.ts:332–335](/tests/e2e/walk.spec.ts:332) checks readiness before settling, and [walk-mode.ts:295](/src/walk/walk-mode.ts:295) computes `target` afresh with `walking ? this.find() : null`. It now checks what “the spawn’s view” says.

There are still endpoint dependencies:

- [labels.spec.ts:127](/tests/e2e/labels.spec.ts:127) asserts “the card still shows after the walk,” then clicks its link. However, the painting stands against the solid wall defined at [plan-data.ts:57](/src/model/core/plan-data.ts:57), so continued forward travel is physically bounded. I found no speed-dependent failure there.
- The next running samples at [walk.spec.ts:325](/tests/e2e/walk.spec.ts:325) and [routes.spec.ts:436–437](/tests/e2e/routes.spec.ts:436) inherit the preceding endpoint. The intervening route turn checks yaw, without requiring a particular position.

The new import loads the walk implementation and its collision, door, footing, look, spawn, dimension, and `three-mesh-bvh` dependencies into helper consumers. It does not construct `WalkMode` or build the model. [global-setup.ts:15–23](/tests/e2e/global-setup.ts:15) does not import the helpers. I found no additional import-induced regression.

Reviewed `3ba46db` against `148b985` by source inspection only; no files changed, tests/builds run, or network requests made.

REJECT — F16: the separate work read can turn a failing sampled median into a passing result.

## Findings and disposition

| ID | Finding | Decision | Repair |
|---|---|---|---|
| F16 | The helper reads the page's work median in a second call after the sampler resolves, so a frame or more can enter the page's window between the two and the reading is not of the sampled frames alone; with a window split evenly between cheap and dear frames one replaced frame turns a failing median into a passing one (major by the lane). | Accepted, and rated minor by the coordinator: the second call is as old as the test, the frames that slip in are walking frames of the same sample, and only an even split is moved by one of them. It is still cheap to make exact. | In the landing after this one: the work is read inside the sampler's last frame, with the gates run again and one lane reading it. |
| F17 | The spec's Timing budgets paragraph still says that under either gate a budget held in an untagged e2e test fails its test, against the corrected sentence ten lines on (minor). | Accepted. | The same landing: the paragraph says where an untagged budget shows. |
| the checks | Repair 2 closes F13: the look target is read at the spawn, and `target` is found afresh at each read. Nothing else rests on where the walker stands after a sample in a way that depends on speed: the card in `labels.spec.ts` is bounded by the wall the painting hangs on, and the next samples in `walk.spec.ts` and `routes.spec.ts` only inherit the place. The helper's import of `src/walk/walk-mode.js` loads the walk's modules into every spec's process and builds nothing; the global setup does not import the helpers. | Taken as stated. | None. |

## Verification

- `npm run verify` on `3ba46db` through the gate lock: 741 unit tests in 85 files, typecheck, lint, build and 93 e2e tests in 8.5 minutes.
- `npm run budgets` on `3ba46db` through the gate lock, straight after: the unit tests with their headroom (741), and the 7 e2e tests tagged `@budget` in 49.6 s; "every budget held".
- Not checked in this round: F16's and F17's repairs, which the next landing gates and has read.

## Round outcome

Rejected by the lane on F16. Work unit 30 landed at `3ba46db`'s tree on 2026-11-11, with both gates green on it, so that six workers stop queueing behind the split: F16 leaves the walking budget's reading as exact as it was before this unit, and its repair and F17's follow in the next landing.
