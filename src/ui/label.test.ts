/**
 * The timeline label and the chapter menu's current chapter (docs/design/spec.md, Page). Bound: pure formatting; the e2e suite reads the real label.
 */
import { describe, expect, it } from 'vitest';

import { EMPTY_TITLE, chapterAt, stepLabel } from './label.js';

const chapters = [
  { id: 'one', title: 'First', years: '1880', summary: '' },
  { id: 'empty', title: 'Empty', years: '1890', summary: '' },
  { id: 'two', title: 'Second', years: '1902', summary: '' },
];
const steps = [
  { title: 'Walls', chapter: 'one', detail: 'Raise them.' },
  { title: 'Roof', chapter: 'one', year: '1881' },
  { title: 'Front', chapter: 'two' },
];

describe('stepLabel', () => {
  it('shows the step in view: the one just completed at rest, the one playing in between', () => {
    expect(stepLabel(1, steps, chapters)).toEqual({ k: 1, text: 'Step 1 / 3 · 1880 · First — Walls', detail: 'Raise them.' });
    expect(stepLabel(1.2, steps, chapters).text).toBe('Step 2 / 3 · 1881 · First — Roof');
    expect(stepLabel(3, steps, chapters).text).toBe('Step 3 / 3 · 1902 · Second — Front');
  });

  it('reads Step 0 and the empty site before anything is built', () => {
    expect(stepLabel(0, steps, chapters).text).toBe(`Step 0 / 3 · 1880 · First — ${EMPTY_TITLE}`);
  });
});

describe('chapterAt', () => {
  const ranges = [
    { first: 0, count: 2 },
    { first: 2, count: 0 },
    { first: 2, count: 1 },
  ];

  it('names the chapter of the step about to play or playing, never a chapter without steps', () => {
    expect([0, 1.5, 2, 2.5, 3].map((t) => chapterAt(t, ranges, 3))).toEqual([0, 0, 2, 2, 2]);
    expect(chapterAt(0, [{ first: 0, count: 0 }], 0)).toBe(-1);
  });
});
