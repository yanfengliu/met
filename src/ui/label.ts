/**
 * The timeline label (docs/design/spec.md, Page): `Step k / N · <year> · <chapter> — <title>`, with the step's detail beneath.
 * k is the step in view: at a rest position t = k it is the step just completed, and while step k plays (t in (k - 1, k)) it is that step.
 * At t = 0 nothing is built: k = 0 and the label names the first chapter.
 */
import type { Chapter } from '../build/types.js';

export interface LabelStep {
  readonly title: string;
  readonly chapter: string;
  readonly year?: string;
  readonly detail?: string;
}

export interface Label {
  /** 0 before anything is built, else 1-based. */
  readonly k: number;
  readonly text: string;
  readonly detail: string;
}

export const EMPTY_TITLE = 'Empty site';
export const EMPTY_DETAIL = 'Nothing is built yet. Press play to start the build.';

/** The 1-based step in view at `t`, or 0 at the start. */
export function stepInView(t: number, n: number): number {
  return Math.min(n, Math.max(0, Math.ceil(t)));
}

export function stepLabel(t: number, steps: readonly LabelStep[], chapters: readonly Chapter[]): Label {
  const n = steps.length;
  const k = stepInView(t, n);
  const step = steps[Math.max(0, k - 1)];
  const chapter = chapters.find((c) => c.id === step?.chapter);
  const chapterTitle = chapter?.title ?? step?.chapter ?? '';
  if (k === 0 || step === undefined) {
    return { k: 0, text: `Step 0 / ${String(n)} · ${chapter?.years ?? ''} · ${chapterTitle} — ${EMPTY_TITLE}`, detail: EMPTY_DETAIL };
  }
  const year = step.year ?? chapter?.years ?? '';
  return { k, text: `Step ${String(k)} / ${String(n)} · ${year} · ${chapterTitle} — ${step.title}`, detail: step.detail ?? '' };
}

/** Index of the chapter holding the step about to play or playing at `t`, for the Build menu; chapters without steps never are. -1 with no steps. */
export function chapterAt(t: number, ranges: readonly { readonly first: number; readonly count: number }[], n: number): number {
  const index = Math.min(Math.max(0, Math.floor(t)), Math.max(0, n - 1));
  let found = -1;
  ranges.forEach((range, i) => {
    if (range.count > 0 && range.first <= index) found = i;
  });
  return found;
}
