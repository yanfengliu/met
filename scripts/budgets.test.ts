/**
 * Bound: the switch is read from injected environments, and `npm run budgets` runs with a recorder in place of the shell; that the e2e budgets and the
 * headroom reporter obey the switch is shown by the red proofs in docs/learning/gate-proofs.md (work unit 30), and `scripts/test-headroom.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import { BUDGET_RUNS, budgetsAsserted, budgetsRefusal, runBudgets } from './budgets.js';

describe('budgetsAsserted', () => {
  it('asserts the budgets for MET_BUDGETS=1 alone, and leaves them unasserted when it is unset, empty or blank', () => {
    expect(budgetsAsserted({ MET_BUDGETS: '1' })).toBe(true);
    expect(budgetsAsserted({ MET_BUDGETS: ' 1 ' })).toBe(true);
    expect(budgetsAsserted({})).toBe(false);
    expect(budgetsAsserted({ MET_BUDGETS: '' })).toBe(false);
    expect(budgetsAsserted({ MET_BUDGETS: '  ' })).toBe(false);
  });

  it.each(['0', 'true', 'yes', '2', 'on'])('rejects %s, naming it and the two values it takes', (value) => {
    expect(() => budgetsAsserted({ MET_BUDGETS: value })).toThrow(new RegExp(`MET_BUDGETS must be 1, .* or unset, .*; got "${value}"`));
  });
});

describe('runBudgets', () => {
  const record = (statuses: readonly number[]) => {
    const calls: { command: string; budgets: string | undefined; other: string | undefined }[] = [];
    const lines: string[] = [];
    const code = runBudgets(
      (command, env) => {
        calls.push({ command, budgets: env['MET_BUDGETS'], other: env['OTHER'] });
        return statuses[calls.length - 1] ?? 0;
      },
      { OTHER: 'kept', MET_BUDGETS: '' },
      (line) => lines.push(line),
    );
    return { calls, lines, code };
  };

  it('runs the unit tests and then the e2e tests tagged @budget, each with MET_BUDGETS=1 over the environment', () => {
    expect(BUDGET_RUNS.map((r) => r.command)).toEqual(['npm test', 'npm run test:e2e -- --grep @budget']);
    const { calls, lines, code } = record([0, 0]);
    expect(calls).toEqual([
      { command: 'npm test', budgets: '1', other: 'kept' },
      { command: 'npm run test:e2e -- --grep @budget', budgets: '1', other: 'kept' },
    ]);
    expect(code).toBe(0);
    expect(lines.at(-1)).toMatch(/^npm run budgets: every budget held/);
  });

  it('runs the e2e budgets after the unit tests failed, and fails, naming each run that failed and its exit status', () => {
    const one = record([1, 0]);
    expect(one.calls).toHaveLength(2);
    expect(one.code).toBe(1);
    expect(one.lines.at(-1)).toBe('npm run budgets: failed: the unit tests and their headroom (npm test, exit 1).');
    const both = record([1, 3]);
    expect(both.code).toBe(1);
    expect(both.lines.at(-1)).toBe('npm run budgets: failed: the unit tests and their headroom (npm test, exit 1); the e2e tests tagged @budget (npm run test:e2e -- --grep @budget, exit 3).');
  });

  it('refuses a CPU throttle over 1 and runs nothing, naming MET_CPU_THROTTLE and why: the budgets are unthrottled and the route budget tests skip under one (review 0, F2)', () => {
    for (const rate of ['4', '1.5', ' 2 ']) {
      const calls: string[] = [];
      const lines: string[] = [];
      const code = runBudgets(
        (command) => {
          calls.push(command);
          return 0;
        },
        { MET_CPU_THROTTLE: rate },
        (line) => lines.push(line),
      );
      expect(code, `MET_CPU_THROTTLE=${rate}`).toBe(2);
      expect(calls, `MET_CPU_THROTTLE=${rate}: runs`).toEqual([]);
      expect(lines).toEqual([budgetsRefusal({ MET_CPU_THROTTLE: rate })]);
      expect(lines[0]).toMatch(/^npm run budgets: MET_CPU_THROTTLE=.+ slows the page's CPU .+ this machine's, unthrottled: the route budget tests skip under a throttle, .* Unset MET_CPU_THROTTLE/);
    }
  });

  it('runs with no throttle, or one the tests read as none: 1 or under, empty, or not a number', () => {
    for (const env of [{}, { MET_CPU_THROTTLE: '1' }, { MET_CPU_THROTTLE: '0.5' }, { MET_CPU_THROTTLE: '' }, { MET_CPU_THROTTLE: 'abc' }]) {
      expect(budgetsRefusal(env), JSON.stringify(env)).toBeNull();
      const calls: string[] = [];
      const code = runBudgets(
        (command) => {
          calls.push(command);
          return 0;
        },
        env,
        () => undefined,
      );
      expect([code, calls.length], JSON.stringify(env)).toEqual([0, 2]);
    }
  });
});
