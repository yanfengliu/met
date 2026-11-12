/**
 * The timing budgets' switch and their gate, `npm run budgets` (work unit 30; docs/design/spec.md, Budgets).
 *
 * How long a frame, the build or a test takes depends on what else the machine is doing, so `npm run verify`, the gate for behaviour, measures and prints
 * each timing budget but does not assert it, and `npm run budgets` asserts them all. Its switch is `MET_BUDGETS`: `1` asserts them, as `npm run budgets`
 * sets it; unset, they are measured and printed. `tests/e2e/helpers.ts` (`budgetCheck`) and `vitest.config.ts` (`scripts/test-headroom.ts`) read it through
 * `budgetsAsserted`, and nothing under `src/` does.
 * `npm run budgets` runs `npm test`, whose headroom check then fails the run, and the e2e tests tagged `@budget`, the switch set for each, and refuses to
 * run under a CPU throttle (`budgetsRefusal`); it is a script because npm runs scripts in cmd.exe on Windows, where `MET_BUDGETS=1 <command>` sets nothing.
 * Bound: it runs what it is given and reports the exit status; it does not check that the machine is quiet, which its runs through the gate lock and
 * AGENTS.md's rule for it (nothing else heavy running) leave to the person who runs it.
 */
import { spawnSync } from 'node:child_process';

/** The variable that asserts the timing budgets. */
export const BUDGETS_SWITCH = 'MET_BUDGETS';

/** Reads `MET_BUDGETS` from `env`: `1` asserts the timing budgets; unset or blank leaves them measured and printed, not asserted; anything else throws. */
export function budgetsAsserted(env: NodeJS.ProcessEnv = process.env): boolean {
  const text = (env[BUDGETS_SWITCH] ?? '').trim();
  if (text === '') return false;
  if (text === '1') return true;
  throw new Error(`${BUDGETS_SWITCH} must be 1, which asserts the timing budgets as npm run budgets does, or unset, which measures and prints them; got "${text}".`);
}

/** What `npm run budgets` runs, in order, each with MET_BUDGETS=1: the unit tests with their headroom check, and the e2e tests that hold a budget. */
export const BUDGET_RUNS: readonly { readonly name: string; readonly command: string }[] = [
  { name: 'the unit tests and their headroom', command: 'npm test' },
  { name: 'the e2e tests tagged @budget', command: 'npm run test:e2e -- --grep @budget' },
];

/**
 * Why `npm run budgets` must not run in `env`, or null. A CPU throttle over 1 (`MET_CPU_THROTTLE`, read as tests/e2e/helpers.ts `throttleRate` reads it) slows
 * the page on purpose, and the budgets are this machine's, unthrottled: both route budget tests skip under one, so the gate could pass having asserted
 * neither (review 0, F2).
 */
export function budgetsRefusal(env: NodeJS.ProcessEnv): string | null {
  const text = env['MET_CPU_THROTTLE'] ?? '1';
  if (!(Number(text) > 1)) return null;
  return `npm run budgets: MET_CPU_THROTTLE=${text} slows the page's CPU ${text} times, and the timing budgets are this machine's, unthrottled: the route budget tests skip under a throttle, so the gate would pass without them. Unset MET_CPU_THROTTLE and run it again.`;
}

/**
 * Runs each of `runs` through `exec` with `env` and MET_BUDGETS=1 over it, every one whatever the earlier ones gave, so one run reads every budget;
 * prints a line for each and returns 1 if any failed, else 0. Refuses, returning 2 and running nothing, where `budgetsRefusal` gives a reason.
 */
export function runBudgets(exec: (command: string, env: NodeJS.ProcessEnv) => number, env: NodeJS.ProcessEnv = process.env, log: (line: string) => void = console.log, runs = BUDGET_RUNS): number {
  const refusal = budgetsRefusal(env);
  if (refusal !== null) {
    log(refusal);
    return 2;
  }
  const failed: string[] = [];
  for (const { name, command } of runs) {
    log(`npm run budgets: ${name}, ${BUDGETS_SWITCH}=1 ${command}`);
    const status = exec(command, { ...env, [BUDGETS_SWITCH]: '1' });
    if (status !== 0) failed.push(`${name} (${command}, exit ${String(status)})`);
  }
  log(failed.length === 0 ? `npm run budgets: every budget held (${runs.map((r) => r.name).join('; ')}).` : `npm run budgets: failed: ${failed.join('; ')}.`);
  return failed.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  // One command string through the shell, as npm itself runs scripts; its status is the command's, or 1 if it was ended by a signal.
  process.exit(runBudgets((command, env) => spawnSync(command, { shell: true, stdio: 'inherit', env }).status ?? 1));
}
