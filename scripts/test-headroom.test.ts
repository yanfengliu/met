/**
 * Bound: the rule on given times and timeouts, and what the run's end prints and fails with the timing budgets asserted and not (work unit 30); that the reporter reads them from Vitest's API is shown by the run it failed with Vitest's 5 s default (`docs/learning/defect-register.md`, the Pages build's timeout), and that it obeys MET_BUDGETS by the red proof in docs/learning/gate-proofs.md.
 */
import { describe, expect, it } from 'vitest';

import { HEADROOM, headroomProblems, headroomReport } from './test-headroom.js';
import type { TestTime } from './test-headroom.js';

const timed = (duration: number | undefined, timeout: number | undefined, passed = true): TestTime => ({
  name: 'src/a.test.ts > a > b',
  passed,
  duration,
  timeout,
});

describe('headroomProblems', () => {
  it('passes a test within a sixth of its timeout, a sixth exactly included', () => {
    expect(HEADROOM).toBe(6);
    expect(headroomProblems([timed(0, 5000), timed(833, 5000), timed(500, 3000), timed(10_000, 60_000)])).toEqual([]);
  });

  it('fails a test over a sixth of its timeout, naming it, its time, its timeout and a timeout that would pass it', () => {
    expect(headroomProblems([timed(2265, 5000)])).toEqual([
      "src/a.test.ts > a > b took 2265 ms here, over a sixth of its 5000 ms timeout, so GitHub's runner, up to 2.8 times slower, could time it out: make it faster, or give it a timeout of at least 14000 ms.",
    ]);
    expect(headroomProblems([timed(501, 3000), timed(10_001, 60_000)])).toHaveLength(2);
  });

  it('leaves out a test that did not pass, whatever its time', () => {
    expect(headroomProblems([timed(9000, 5000, false), timed(undefined, undefined, false)])).toEqual([]);
  });

  it('fails a passed test whose time or timeout Vitest did not give, so a change in its API cannot pass every test unread', () => {
    const problems = headroomProblems([timed(undefined, 5000), timed(100, undefined)]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^src\/a\.test\.ts > a > b passed, but Vitest gave no time for it/);
    expect(problems[1]).toMatch(/^src\/a\.test\.ts > a > b passed, but Vitest gave no timeout for it/);
  });
});

describe('headroomReport', () => {
  const slow = timed(11_000, 60_000);
  const fast = timed(100, 60_000);
  const blind = timed(undefined, 60_000);

  it('with the budgets asserted, fails the run on every problem, as before work unit 30', () => {
    expect(headroomReport([fast, slow], true)).toEqual({ lines: ['test headroom (scripts/test-headroom.ts): 1 of 2 tests fail the run:', `  ${headroomProblems([slow])[0] ?? ''}`], fails: true });
    expect(headroomReport([fast, blind], true).fails).toBe(true);
  });

  it('with them not asserted, prints a test over a sixth of its timeout as not asserted, and fails nothing', () => {
    expect(headroomReport([fast, slow], false)).toEqual({
      lines: ['test headroom (scripts/test-headroom.ts): 1 of 2 tests take over a sixth of their timeout, not asserted since MET_BUDGETS is not 1 (npm run budgets asserts it):', `  ${headroomProblems([slow])[0] ?? ''}`],
      fails: false,
    });
  });

  it('either way, fails the run on a passed test whose time or timeout Vitest did not give, since then no headroom is read', () => {
    const report = headroomReport([fast, slow, blind], false);
    expect(report.fails).toBe(true);
    expect(report.lines[0]).toBe('test headroom (scripts/test-headroom.ts): 1 of 3 tests fail the run:');
    expect(report.lines[1]).toMatch(/passed, but Vitest gave no time for it/);
    expect(report.lines[2]).toMatch(/1 of 3 tests take over a sixth of their timeout, not asserted/);
  });

  it('prints nothing and fails nothing when every passed test is within a sixth of its timeout, asserted or not', () => {
    for (const asserted of [true, false]) expect(headroomReport([fast, timed(20_000, 60_000, false)], asserted)).toEqual({ lines: [], fails: false });
  });
});
