/**
 * A Vitest reporter that fails a local run when a test takes over a sixth of its timeout, so that GitHub's runner does not time it out first.
 *
 * The Pages workflow runs `npm test` on GitHub's runner, which ran the heaviest unit tests up to 2.8 times slower than the local machine, its own speed varying twice over between runs (2026-10-28, `docs/learning/defect-register.md`).
 * A test of 2.3 to 2.8 s here took 3.2 to 6.4 s there and timed out at Vitest's 5 s default; within a sixth of its timeout here, a test would take under half of it on the slowest run measured there.
 * With that default back, the check named 6 of 650 tests (2026-10-28).
 * A test's time is a timing budget, which depends on what else the machine is doing (work unit 30): a test over a sixth of its timeout fails the run only when the budgets are asserted (`MET_BUDGETS=1`, as `npm run budgets` sets it, `scripts/budgets.ts`), and `npm run verify` prints it and goes on; a passed test whose time or timeout Vitest does not give fails the run either way, since then no headroom is read at all.
 * Bound: it reads each test's own time (`TestCase.diagnostic().duration`, its hooks included, the module's collection not) on the machine that runs it, and predicts the runner by the ratio measured, not by running there; `vitest.config.ts` leaves it out on the runner, whose bound is the timeout itself.
 */
import type { Reporter, TestCase, Vitest } from 'vitest/node';

/** A test's timeout must be at least this many times its time here. */
export const HEADROOM = 6;

/** What the check reads of a test: whether it passed, its time and its timeout, undefined where Vitest gave none. */
export interface TestTime {
  readonly name: string;
  readonly passed: boolean;
  readonly duration: number | undefined;
  readonly timeout: number | undefined;
}

/** Why each passed test fails the run: it took over a sixth of its timeout, or Vitest gave no time or timeout to read. */
export function headroomProblems(tests: readonly TestTime[]): string[] {
  const problems: string[] = [];
  for (const { name, passed, duration, timeout } of tests) {
    if (!passed) continue;
    if (duration === undefined || timeout === undefined) {
      problems.push(
        `${name} passed, but Vitest gave no ${duration === undefined ? 'time' : 'timeout'} for it (TestCase.diagnostic().duration, TestCase.options.timeout), so its headroom cannot be read: update scripts/test-headroom.ts to this Vitest's reporter API.`,
      );
    } else if (duration * HEADROOM > timeout) {
      const enough = Math.ceil((duration * HEADROOM) / 1000) * 1000;
      problems.push(
        `${name} took ${String(Math.round(duration))} ms here, over a sixth of its ${String(timeout)} ms timeout, so GitHub's runner, up to 2.8 times slower, could time it out: make it faster, or give it a timeout of at least ${String(enough)} ms.`,
      );
    }
  }
  return problems;
}

/**
 * What the run's end prints and whether it fails the run. Asserted (`MET_BUDGETS=1`), every problem fails it, as before work unit 30; not asserted, a test
 * over a sixth of its timeout is printed as not asserted and fails nothing, and one whose time or timeout Vitest did not give still fails it.
 */
export function headroomReport(tests: readonly TestTime[], asserted: boolean): { readonly lines: readonly string[]; readonly fails: boolean } {
  const head = (problems: readonly string[], what: string): string[] =>
    problems.length === 0 ? [] : [`test headroom (scripts/test-headroom.ts): ${String(problems.length)} of ${String(tests.length)} tests ${what}:`, ...problems.map((problem) => `  ${problem}`)];
  if (asserted) {
    const problems = headroomProblems(tests);
    return { lines: head(problems, 'fail the run'), fails: problems.length > 0 };
  }
  const unread = (t: TestTime): boolean => t.passed && (t.duration === undefined || t.timeout === undefined);
  const blind = headroomProblems(tests.filter(unread));
  const over = headroomProblems(tests.filter((t) => !unread(t)));
  return {
    lines: [...head(blind, 'fail the run'), ...head(over, 'take over a sixth of their timeout, not asserted since MET_BUDGETS is not 1 (npm run budgets asserts it)')],
    fails: blind.length > 0,
  };
}

/** Collects every test's time and timeout, and at the run's end reports each problem and, where `headroomReport` says it fails the run, sets the exit status to 1. */
export class TestHeadroom implements Reporter {
  private vitest: Vitest | undefined;
  private tests: TestTime[] = [];

  /** `asserted`: whether a test over a sixth of its timeout fails the run (MET_BUDGETS=1, `scripts/budgets.ts` `budgetsAsserted`). */
  constructor(private readonly asserted = true) {}

  onInit(vitest: Vitest): void {
    this.vitest = vitest;
  }

  onTestRunStart(): void {
    this.tests = [];
  }

  onTestCaseResult(testCase: TestCase): void {
    this.tests.push({
      name: `${testCase.module.relativeModuleId} > ${testCase.fullName}`,
      passed: testCase.result().state === 'passed',
      duration: testCase.diagnostic()?.duration,
      timeout: testCase.options.timeout,
    });
  }

  onTestRunEnd(): void {
    const { lines, fails } = headroomReport(this.tests, this.asserted);
    if (lines.length === 0) return;
    const report = lines.join('\n');
    if (!fails) {
      if (this.vitest) this.vitest.logger.log(report);
      else console.log(report);
      return;
    }
    if (this.vitest) this.vitest.logger.error(report);
    else console.error(report);
    process.exitCode = 1;
  }
}
