/**
 * A Vitest reporter that fails a local run when a test takes over a sixth of its timeout, so that GitHub's runner does not time it out first.
 *
 * The Pages workflow runs `npm test` on GitHub's runner, which ran the heaviest unit tests up to 2.8 times slower than the local machine, its own speed varying twice over between runs (2026-10-28, `docs/learning/defect-register.md`).
 * A test of 2.3 to 2.8 s here took 3.2 to 6.4 s there and timed out at Vitest's 5 s default; within a sixth of its timeout here, a test would take under half of it on the slowest run measured there.
 * With that default back, the check named 6 of 650 tests (2026-10-28).
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

/** Collects every test's time and timeout, and at the run's end reports each problem and sets the exit status to 1. */
export class TestHeadroom implements Reporter {
  private vitest: Vitest | undefined;
  private tests: TestTime[] = [];

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
    const problems = headroomProblems(this.tests);
    if (problems.length === 0) return;
    const report = [
      `test headroom (scripts/test-headroom.ts): ${String(problems.length)} of ${String(this.tests.length)} tests fail the run:`,
      ...problems.map((problem) => `  ${problem}`),
    ].join('\n');
    if (this.vitest) this.vitest.logger.error(report);
    else console.error(report);
    process.exitCode = 1;
  }
}
