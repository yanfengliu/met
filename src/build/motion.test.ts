/**
 * Motion endpoints and stagger ordering (docs/design/spec.md, Timeline position).
 * Bound: endpoints are checked on the pure functions and through the timeline on one piece per motion; staggers on synthetic keys and through the timeline's windows.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from './chapters.js';
import { ARRIVAL_TINT, MIN_SCALE, MIN_TRAVEL, easeOutBack, easeOutCubic, lightRamp, writeMotionParams, writeMovingMatrix, writeTint } from './motion.js';
import { MIN_WINDOW, staggerKeys, windowsFromKeys } from './stagger.js';
import { MOTIONS, STAGGERS } from './testing.js';
import { Timeline } from './timeline.js';
import type { Motion, Stagger, StepDef } from './types.js';

const BOX = { minX: 1, minY: 2, minZ: 3, maxX: 3, maxY: 10, maxZ: 5 };
const FINAL = new Matrix4().compose(new Vector3(2, 6, 4), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.7), new Vector3(2, 8, 2));

function moving(motion: Motion, p: number): Float32Array {
  const params = new Float64Array(3);
  writeMotionParams(motion, BOX, params, 0);
  const out = new Float32Array(16);
  writeMovingMatrix(motion.kind, p, Float64Array.from(FINAL.elements), 0, params, 0, out, 0);
  return out;
}

describe('motion endpoints', () => {
  it.each(MOTIONS.map((m) => [m.kind, m] as const))('%s lands exactly on the final matrix at p = 1', (_, motion) => {
    expect(Array.from(moving(motion, 1))).toEqual(Array.from(Float32Array.from(FINAL.elements)));
  });

  it('rise and drop start their distance below or above, by default the piece height but at least 3 m', () => {
    const near0 = 1e-9;
    expect(moving({ kind: 'rise' }, near0)[13]).toBeCloseTo(6 - 8, 5);
    expect(moving({ kind: 'drop' }, near0)[13]).toBeCloseTo(6 + 8, 5);
    expect(moving({ kind: 'rise', distance: 1.5 }, near0)[13]).toBeCloseTo(6 - 1.5, 5);
    const flat = { ...BOX, maxY: 2.5 };
    const params = new Float64Array(3);
    writeMotionParams({ kind: 'drop' }, flat, params, 0);
    expect(params[1]).toBe(MIN_TRAVEL);
  });

  it('slide starts at its world offset', () => {
    const start = moving({ kind: 'slide', from: [4, -1, 7] }, 1e-9);
    expect([start[12], start[13], start[14]].map((v) => Number(v?.toFixed(4)))).toEqual([6, 5, 11]);
  });

  it('grow starts flat on the bottom of its world box; pop starts as a point at its centre', () => {
    const grow = moving({ kind: 'grow' }, 1e-9);
    // Y row scaled to MIN_SCALE about y = minY.
    expect(grow[5]).toBeCloseTo(FINAL.elements[5] * MIN_SCALE, 6);
    expect(grow[13]).toBeCloseTo(MIN_SCALE * 6 + (1 - MIN_SCALE) * BOX.minY, 5);
    expect(grow[0]).toBeCloseTo(FINAL.elements[0], 6);
    const pop = moving({ kind: 'pop' }, 1e-9);
    expect(pop[0]).toBeCloseTo(FINAL.elements[0] * MIN_SCALE, 6);
    expect([pop[12], pop[13], pop[14]].map((v) => Number(v?.toFixed(2)))).toEqual([2, 6, 4]);
  });

  it('eases monotonically to 1 (pop overshoots by about 5%) and tints from ARRIVAL_TINT to white', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutBack(0)).toBeCloseTo(0, 12);
    expect(easeOutBack(1)).toBe(1);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => easeOutBack(i / 100)));
    expect(peak).toBeGreaterThan(1.03);
    expect(peak).toBeLessThan(1.07);
    const tint = new Float32Array(3);
    writeTint(1e-9, tint, 0);
    expect(Array.from(tint).map((v) => Number(v.toFixed(4)))).toEqual(ARRIVAL_TINT.map((v) => Number(v.toFixed(4))));
    writeTint(1, tint, 0);
    expect(Array.from(tint)).toEqual([1, 1, 1]);
    expect([lightRamp(-1), lightRamp(0), lightRamp(1), lightRamp(2)]).toEqual([0, 0, 1, 1]);
  });

  it.each(MOTIONS.map((m) => [m.kind, m] as const))('%s through the timeline: hidden at f = 0, final at f = 1', (_, motion) => {
    const step: StepDef = {
      id: 'one',
      chapter: CHAPTERS[0].id,
      title: 'one',
      motion,
      build(kit) {
        kit.add(new BoxGeometry(2, 8, 2), new MeshStandardMaterial(), FINAL);
      },
    };
    const timeline = new Timeline([step]);
    const mesh = timeline.steps[0]?.meshes[0];
    expect(mesh?.count).toBe(0);
    timeline.evaluate(0.5);
    expect(mesh?.count).toBe(1);
    expect(Array.from(mesh?.instanceMatrix.array ?? [])).not.toEqual(Array.from(Float32Array.from(FINAL.elements)));
    timeline.evaluate(1);
    expect(Array.from(mesh?.instanceMatrix.array ?? [])).toEqual(Array.from(Float32Array.from(FINAL.elements)));
  });
});

describe('stagger ordering', () => {
  const pieces = [
    { cx: 3, cy: 0, cz: -2, order: 2 },
    { cx: -1, cy: 5, cz: 4, order: 0 },
    { cx: 3.004, cy: 2, cz: 0, order: 1 },
    { cx: 8, cy: 1, cz: 1, order: 1 },
  ];

  it.each<[Stagger, number[]]>([
    ['order', [2, 0, 1, 1]],
    ['x', [3, -1, 3, 8]],
    ['-x', [-3, 1, -3, -8]],
    ['z', [-2, 4, 0, 1]],
    ['-z', [2, -4, 0, -1]],
    ['y', [0, 5, 2, 1]],
    ['none', [0, 0, 0, 0]],
  ])('%s keys', (stagger, expected) => {
    expect(Array.from(staggerKeys(stagger, pieces, 0, 0)).map((k) => Number(k.toFixed(6)))).toEqual(expected);
  });

  it('radial keys are horizontal distances from the given centre, inner first', () => {
    const keys = staggerKeys('radial', pieces, 3, 0);
    expect(Number(keys[2]?.toFixed(6))).toBe(0);
    expect(keys[3]).toBeGreaterThan(keys[2] ?? 0);
  });

  it('rounds spatial keys to 1 cm so the parts of a composite piece arrive together', () => {
    const keys = staggerKeys('x', pieces, 0, 0);
    expect(keys[0]).toBe(keys[2]);
  });

  it('gives equal keys equal windows, never starts a smaller key later, and keeps windows inside [0, 1]', () => {
    const rand = (() => {
      let s = 7;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    // Every pair is checked, but violations are collected and asserted once: a million expect() calls made this test slow enough to time out.
    const problems: string[] = [];
    let violations = 0;
    const note = (message: string): void => {
      violations += 1;
      if (problems.length < 20) problems.push(message);
    };
    let pairs = 0;
    for (const count of [1, 2, 3, 5, 40, 1000]) {
      const keys = Float64Array.from({ length: count }, () => Math.floor(rand() * count * 0.7));
      const w = windowsFromKeys(keys);
      if (w.duration !== Math.max(MIN_WINDOW, 1 / w.ranks)) note(`${String(count)} keys: duration ${String(w.duration)} with ${String(w.ranks)} ranks`);
      for (let i = 0; i < count; i += 1) {
        const a = w.start[i] ?? -1;
        const b = w.end[i] ?? -1;
        if (!(a >= 0)) note(`${String(count)} keys: window ${String(i)} starts at ${String(a)}, before 0`);
        if (!(b <= 1)) note(`${String(count)} keys: window ${String(i)} ends at ${String(b)}, after 1`);
        if (!(b > a)) note(`${String(count)} keys: window ${String(i)} is empty (${String(a)}..${String(b)})`);
        const ki = keys[i] ?? 0;
        for (let j = 0; j < count; j += 1) {
          pairs += 1;
          const kj = keys[j] ?? 0;
          const sj = w.start[j] ?? Number.NaN;
          if (ki === kj && sj !== a) note(`${String(count)} keys: equal keys ${String(ki)} (windows ${String(i)}, ${String(j)}) start at ${String(a)} and ${String(sj)}`);
          if (ki < kj && !(sj > a)) note(`${String(count)} keys: key ${String(kj)} (window ${String(j)}) starts at ${String(sj)}, not after key ${String(ki)} (window ${String(i)}) at ${String(a)}`);
        }
      }
      if (w.ranks > 1 && (Math.min(...w.start) !== 0 || Math.max(...w.end) !== 1)) note(`${String(count)} keys: windows span ${String(Math.min(...w.start))}..${String(Math.max(...w.end))}, not 0..1`);
    }
    expect(pairs, 'key pairs compared').toBe([1, 2, 3, 5, 40, 1000].reduce((n, c) => n + c * c, 0));
    expect(problems, `${String(violations)} violations, the first 20 listed`).toEqual([]);
  });

  it.each(STAGGERS)('%s through the timeline: arrival order follows the keys', (stagger) => {
    const xs = [4, -3, 9, 0, 6, -8];
    const step: StepDef = {
      id: 'staggered',
      chapter: CHAPTERS[0].id,
      title: 'staggered',
      motion: { kind: 'pop' },
      stagger,
      build(kit) {
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshStandardMaterial();
        xs.forEach((x, i) => {
          kit.add(geometry, material, new Matrix4().makeTranslation(x, x * 0.5 + 3, -x), i);
        });
      },
    };
    const timeline = new Timeline([step]);
    const mesh = timeline.steps[0]?.meshes[0];
    const slotsX = Array.from({ length: xs.length }, (_, i) => mesh?.instanceMatrix.array[i * 16 + 12] ?? 0);
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
    const key: Record<Stagger, (x: number) => number> = {
      order: (x) => xs.indexOf(x),
      x: (x) => x,
      '-x': (x) => -x,
      z: (x) => -x,
      '-z': (x) => x,
      y: (x) => x,
      radial: (x) => Math.hypot(x - centre, -x + centre),
      none: () => 0,
    };
    const keys = slotsX.map(key[stagger]);
    for (let i = 1; i < keys.length; i += 1) expect(keys[i]).toBeGreaterThanOrEqual(keys[i - 1] ?? 0);
    timeline.evaluate(0.3);
    const shown = mesh?.count ?? 0;
    expect(shown).toBeGreaterThan(0);
    if (stagger === 'none') expect(shown).toBe(xs.length);
    else expect(shown).toBeLessThan(xs.length);
  });
});
