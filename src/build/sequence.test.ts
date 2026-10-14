/**
 * Sequence integrity and budgets over whatever src/build/sequence.ts exports (docs/design/spec.md, Build-step API, Budgets, Verification).
 * They hold for whatever the areas add: nothing here names a step or chapter of any area.
 * Site bounds: X and Z from src/model/frame.ts (SITE_MIN_X..SITE_MAX_X, SITE_MIN_Z..SITE_MAX_Z); Y from -30 m (below the ground floor and any
 * foundation) to +120 m (well above the Great Hall ridge), this test's own choice.
 * Bound: geometry is built in Node without WebGL, so triangle and mesh counts are exact but build time is not measured here (the e2e suite does that).
 */
import { beforeAll, describe, expect, it } from 'vitest';

import * as core from '../model/core/index.js';
import { SITE_MAX_X, SITE_MAX_Z, SITE_MIN_X, SITE_MIN_Z } from '../model/frame.js';
import * as hunt from '../model/hunt/index.js';
import * as mmw from '../model/mmw/index.js';
import * as rocheNorth from '../model/roche-north/index.js';
import * as rocheSouth from '../model/roche-south/index.js';
import * as site from '../model/site/index.js';
import { PRESETS } from '../viewer/presets.js';
import { CHAPTERS, SITE_CHAPTER } from './chapters.js';
import { chapterRanges, compositionMismatches, selectSteps } from './select.js';
import { COMPOSITION, SEQUENCE } from './sequence.js';
import { MAX_LIGHTS, Timeline } from './timeline.js';
import type { StepDef } from './types.js';

/** docs/design/spec.md, Budgets. */
const MAX_TRIANGLES = 3_000_000;
const MAX_MESHES = 900;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const finite = (values: readonly number[]): boolean => values.every(Number.isFinite);
const SITE_BOUNDS = { min: [SITE_MIN_X, -30, SITE_MIN_Z], max: [SITE_MAX_X, 120, SITE_MAX_Z] } as const;
/** The area modules (docs/design/spec.md, Build-step API) by folder. */
const AREAS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = { site, core, hunt, mmw, 'roche-north': rocheNorth, 'roche-south': rocheSouth };

/** Whether `value` is a non-empty array of step definitions (an id and a build function each). */
function isStepArray(value: unknown): value is readonly StepDef[] {
  return Array.isArray(value) && value.length > 0 && value.every((s: unknown) => typeof s === 'object' && s !== null && typeof (s as { id?: unknown }).id === 'string' && typeof (s as { build?: unknown }).build === 'function');
}

/** One message per step of an exported step array that the sequence does not build. */
function uncomposed(areas: Readonly<Record<string, Readonly<Record<string, unknown>>>>, sequence: readonly StepDef[]): string[] {
  const built = new Set(sequence);
  return Object.entries(areas).flatMap(([area, module]) =>
    Object.entries(module).flatMap(([name, value]) => {
      if (!isStepArray(value)) return [];
      const missing = value.filter((step) => !built.has(step));
      return missing.length === 0 ? [] : [`src/model/${area}/index.ts exports ${name}, whose ${String(missing.length)} step(s) COMPOSITION does not compose (first: ${missing[0]?.id ?? '?'})`];
    }),
  );
}

describe('sequence integrity', () => {
  it('has at least one step and every chapter id is kebab-case and unique', () => {
    expect(SEQUENCE.length).toBeGreaterThan(0);
    const ids = CHAPTERS.map((c) => c.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(SITE_CHAPTER);
  });

  it('gives every step a unique kebab-case id, a title of at most 48 characters and a detail of at most 200', () => {
    const ids = SEQUENCE.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id)), 'ids that are not kebab-case').toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i), 'duplicate ids').toEqual([]);
    expect(SEQUENCE.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id), 'titles empty or over 48').toEqual([]);
    expect(SEQUENCE.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id), 'details over 200').toEqual([]);
  });

  it('keeps chapters contiguous and in the order of chapters.ts (a chapter may have no steps yet)', () => {
    const order = SEQUENCE.map((s) => CHAPTERS.findIndex((c) => c.id === s.chapter));
    expect(SEQUENCE.filter((_, i) => order[i] === -1).map((s) => s.id), 'steps naming no chapter of chapters.ts').toEqual([]);
    const regressions = order.flatMap((o, i) => (i > 0 && o < (order[i - 1] ?? 0) ? [SEQUENCE[i]?.id] : []));
    expect(regressions, 'steps out of chapter order').toEqual([]);
    const ranges = chapterRanges(SEQUENCE);
    expect(ranges.map((r) => r.chapter.id)).toEqual(CHAPTERS.map((c) => c.id));
    expect(ranges.reduce((sum, r) => sum + r.count, 0), 'steps covered by the chapter ranges').toBe(SEQUENCE.length);
  });

  it('composes every step array each area module exports', () => {
    const exported = Object.values(AREAS).flatMap((module) => Object.values(module).filter(isStepArray));
    expect(exported.length, 'step arrays the area modules export').toBeGreaterThanOrEqual(Object.keys(COMPOSITION).length);
    expect(uncomposed(AREAS, SEQUENCE)).toEqual([]);
  });

  it('the export check reports an exported array the sequence leaves out', () => {
    const stray: StepDef = { id: 'stray', chapter: SITE_CHAPTER, title: 'stray', motion: { kind: 'pop' }, build: () => undefined };
    expect(uncomposed({ site: { strays: [stray], other: 3 } }, SEQUENCE)).toEqual(['src/model/site/index.ts exports strays, whose 1 step(s) COMPOSITION does not compose (first: stray)']);
  });

  it("composes each step into the chapter its own chapter field names", () => {
    expect(compositionMismatches(COMPOSITION)).toEqual([]);
    expect(Object.keys(COMPOSITION)).toEqual(CHAPTERS.map((c) => c.id));
  });

  it('the composition check reports a step composed into the wrong chapter', () => {
    const stray: StepDef = { id: 'stray', chapter: SITE_CHAPTER, title: 'stray', motion: { kind: 'pop' }, build: () => undefined };
    const other = CHAPTERS.find((c) => c.id !== SITE_CHAPTER)?.id ?? 'other';
    expect(compositionMismatches({ [SITE_CHAPTER]: [[stray]], [other]: [[], [stray]] })).toEqual([`step "stray" names chapter "${SITE_CHAPTER}" but is composed into "${other}"`]);
  });

  it('gives every step a valid weight, motion and focus', () => {
    const problems: string[] = [];
    for (const step of SEQUENCE) {
      const weight = step.weight ?? 1;
      if (!(Number.isFinite(weight) && weight > 0)) problems.push(`${step.id}: weight ${String(weight)} is not a finite number above 0`);
      const motion = step.motion;
      if ((motion.kind === 'rise' || motion.kind === 'drop') && motion.distance !== undefined && !(Number.isFinite(motion.distance) && motion.distance > 0)) {
        problems.push(`${step.id}: ${motion.kind} distance ${String(motion.distance)} is not a finite number above 0`);
      }
      if (motion.kind === 'slide' && !finite(motion.from)) problems.push(`${step.id}: slide.from is not finite`);
      const focus = step.focus;
      if (focus?.kind === 'preset' && !PRESETS.some((p) => p.id === focus.id)) problems.push(`${step.id}: focus names preset "${focus.id}", which src/viewer/presets.ts does not define`);
      if (focus?.kind === 'box' && !(finite([...focus.min, ...focus.max]) && focus.min.every((v, i) => v <= (focus.max[i] ?? Number.NaN)))) problems.push(`${step.id}: focus box is not finite with min <= max`);
      if (focus?.kind === 'view' && !finite([...focus.position, ...focus.target])) problems.push(`${step.id}: focus view is not finite`);
    }
    expect(problems).toEqual([]);
  });

  it('builds solo selections that keep only that chapter and the site', () => {
    for (const chapter of CHAPTERS) {
      const steps = selectSteps(SEQUENCE, chapter.id) ?? [];
      expect(steps.length).toBe(SEQUENCE.filter((s) => s.chapter === chapter.id || s.chapter === SITE_CHAPTER).length);
      expect(steps.every((s) => s.chapter === chapter.id || s.chapter === SITE_CHAPTER)).toBe(true);
    }
    expect(selectSteps(SEQUENCE, 'no-such-chapter')).toBeNull();
    expect(selectSteps(SEQUENCE, null)).toBe(SEQUENCE);
  });

  it('reads years as inclusive ranges: a range, a single year, or "before" a year', () => {
    expect(yearRange('1904–1956')).toEqual([1904, 1956]);
    expect(yearRange('1904-1956')).toEqual([1904, 1956]);
    expect(yearRange('1902')).toEqual([1902, 1902]);
    expect(yearRange('before 1872')).toEqual([-Infinity, 1872]);
    for (const text of ['c. 1900', '1902s', '1956–1904', '', 'before']) expect(yearRange(text), text).toBeNull();
  });

  it("dates every step inside its chapter's years", () => {
    const problems: string[] = [];
    for (const chapter of CHAPTERS) if (yearRange(chapter.years) === null) problems.push(`chapter ${chapter.id}: years "${chapter.years}" is not a year, a range like 1904–1956 or "before 1872"`);
    for (const step of SEQUENCE) {
      if (step.year === undefined) continue;
      const span = yearRange(step.year);
      const chapter = CHAPTERS.find((c) => c.id === step.chapter);
      const within = chapter === undefined ? null : yearRange(chapter.years);
      if (span === null) problems.push(`${step.id}: year "${step.year}" is not a year or a range like 1904–1956`);
      else if (chapter !== undefined && within !== null && (span[0] < within[0] || span[1] > within[1])) problems.push(`${step.id}: year ${step.year} lies outside chapter ${chapter.id} (${chapter.years})`);
    }
    expect(problems).toEqual([]);
  });
});

/** A years text as an inclusive range: `1904–1956` (en dash or hyphen), `1902`, or `before 1872` (anything up to 1872); null for anything else. */
function yearRange(text: string): readonly [number, number] | null {
  const before = /^before (\d{4})$/.exec(text);
  if (before !== null) return [-Infinity, Number(before[1])];
  const range = /^(\d{4})[–-](\d{4})$/.exec(text);
  if (range !== null) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    return from <= to ? [from, to] : null;
  }
  const single = /^(\d{4})$/.exec(text);
  return single === null ? null : [Number(single[1]), Number(single[1])];
}

describe('sequence build and budgets', () => {
  let timeline: Timeline;
  beforeAll(() => {
    timeline = new Timeline(SEQUENCE);
  });

  it('adds at least one piece in every step, with finite bounds inside the site bounds', () => {
    const [x0, y0, z0] = SITE_BOUNDS.min;
    const [x1, y1, z1] = SITE_BOUNDS.max;
    const outside = timeline.steps.flatMap((step) => {
      const { min, max } = step.bounds;
      const ok = finite([min.x, min.y, min.z, max.x, max.y, max.z]) && min.x >= x0 && min.y >= y0 && min.z >= z0 && max.x <= x1 && max.y <= y1 && max.z <= z1;
      return ok ? [] : [`${step.def.id}: bounds (${min.toArray().map((v) => v.toFixed(1)).join(', ')}) to (${max.toArray().map((v) => v.toFixed(1)).join(', ')})`];
    });
    expect(timeline.steps.filter((s) => s.pieceCount < 1).map((s) => s.def.id)).toEqual([]);
    expect(outside, `steps outside SITE_BOUNDS (${SITE_BOUNDS.min.join(', ')}) to (${SITE_BOUNDS.max.join(', ')})`).toEqual([]);
  });

  it('has no NaN in any instance matrix', () => {
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
  });

  it(`stays within ${String(MAX_TRIANGLES)} triangles, ${String(MAX_MESHES)} instanced meshes and ${String(MAX_LIGHTS)} step lights`, () => {
    const stats = timeline.stats();
    expect(stats.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
    expect(stats.meshes).toBeLessThanOrEqual(MAX_MESHES);
    expect(stats.lights).toBeLessThanOrEqual(MAX_LIGHTS);
    expect(stats.pieces).toBeGreaterThanOrEqual(stats.steps);
  });
});
