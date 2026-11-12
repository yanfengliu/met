# The functional gate's browser tests on several workers

Status: active
Owner: claude/worktree-improvement-list (coordinator)
Created: 2026-11-11
Updated: 2026-11-11

## Problem and outcome

`npm run verify` runs its 93 browser tests on one Playwright worker, one after another, in 7 to 9 minutes of a run of 8 to 10. They ran that way because they held frame budgets, which another page drawing beside them would have broken. Since work unit 30 `npm run verify` asserts no timing budget, so that reason is gone.

The gate is what every landing and every worker's hand-back queues for: one expensive gate runs at a time (`tmp/gate.sh`), and on 2026-11-11 five workers waited on it for most of the day. Slowness on the critical path is a defect to fix (AGENTS.md, R22).

Outcome: `npm run verify` runs its browser tests on several workers and takes at most half the time it takes today, as reliably as today. `npm run budgets` still runs its tests one at a time.

## Scope

In: `playwright.config.ts`; `scripts/budgets.ts` and its test, where the budgets gate must say it runs on one worker; `tests/e2e/global-setup.ts`, `tests/e2e/browser-server.ts` and `scripts/window-station.*` only if the one browser every worker connects to cannot serve several; a spec only where its test assumes it is alone on the machine, with the reason in its header; AGENTS.md's Gates, the spec's Verification and `docs/policies/local-rules.md` where they say how the gates run.

Out: every budget's number and the budgets gate's one worker; anything under `src/`; any assertion's meaning. A test that fails beside others is repaired at its assumption or run on its own, never loosened.

Limits: the browser stays in the separate window station on Windows, where a pointer lock cannot take the owner's cursor, for every worker (`cursor.spec` holds it); never a headed run and never `MET_E2E_DESKTOP`. One dev server, one port.

## Approach

Measure before choosing. Run the browser tests with 1, 2, 4 and 6 workers, three runs each, through the gate lock, and record the wall time and every failure with its cause: focus, the pointer lock, the one shared browser, a port, a wait that another page's load outlasts. From that, the count to take, with room; what must run alone, and how it is kept alone (a serial project or a file's own mode); and whether files or tests are the unit that runs in parallel.

## Acceptance criteria

- [ ] A table in this plan: wall time and failures for 1, 2, 4 and 6 workers, three runs each, with each failure's cause.
- [ ] At the count taken, `npm run verify` passes five runs in a row while a second heavy job runs on the machine, and its browser tests take at most half the time one worker takes on the same machine in the same hour.
- [ ] `npm run budgets` runs its browser tests on one worker by its own setting, whatever the config's default, and holds every budget.
- [ ] Every test given a change says why in its header, and the diff drops no assertion.
- [ ] `cursor.spec` passes at the count taken, and `routes.spec` and `walk.spec` pass three runs in a row at `MET_CPU_THROTTLE=4` as AGENTS.md's Load asks.
- [ ] AGENTS.md, the spec and the local rules say how each gate runs.
- [ ] An independent review of the exact revision, both lanes once, has no finding left that matters.

## Implementation steps

- [ ] Worker: the measurements, the change, the runs, the documents, hand back.
- [ ] Coordinator: review, accept, land, devlog line.

## Outcome

Pending.
