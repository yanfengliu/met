/**
 * Chapter ranges, `solo` selection (docs/design/spec.md, Query contract) and the composition check for src/build/sequence.ts.
 */
import { CHAPTERS, SITE_CHAPTER } from './chapters.js';
import type { Chapter, StepDef } from './types.js';

export interface ChapterRange {
  readonly chapter: Chapter;
  /** 0-based index of the chapter's first step; for a chapter with no steps, where its first step would go. */
  readonly first: number;
  /** 0 for a chapter with no steps (yet, or not selected by `solo`). */
  readonly count: number;
}

/** Steps to build: every step, or with `solo` that chapter's steps plus the site chapter's. Returns null for an unknown chapter id. */
export function selectSteps(sequence: readonly StepDef[], solo: string | null): readonly StepDef[] | null {
  if (solo === null) return sequence;
  if (!CHAPTERS.some((chapter) => chapter.id === solo)) return null;
  return sequence.filter((step) => step.chapter === solo || step.chapter === SITE_CHAPTER);
}

/**
 * Every chapter of `CHAPTERS`, in order, with the run of `steps` it covers. Steps must come in chapter order, each chapter contiguous
 * (src/build/sequence.test.ts checks it); if not, the counts sum to less than `steps.length`.
 */
export function chapterRanges(steps: readonly StepDef[]): ChapterRange[] {
  let index = 0;
  return CHAPTERS.map((chapter) => {
    const first = index;
    while (index < steps.length && steps[index]?.chapter === chapter.id) index += 1;
    return { chapter, first, count: index - first };
  });
}

/** One message per step whose `chapter` field differs from the chapter its array is composed into. */
export function compositionMismatches(composition: Readonly<Record<string, readonly (readonly StepDef[])[]>>): string[] {
  return Object.entries(composition).flatMap(([chapter, arrays]) =>
    arrays.flat().filter((step) => step.chapter !== chapter).map((step) => `step "${step.id}" names chapter "${step.chapter}" but is composed into "${chapter}"`),
  );
}
