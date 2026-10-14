/**
 * `snapshot` (src/viewer/facts.ts), which every value of `window.__met` goes through: a detached copy, frozen all the way down.
 * Bound: plain data; that main.ts publishes through it, and that a write to the page's facts cannot reach the follow camera, is in tests/e2e/camera.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { snapshot } from './facts.js';

describe('snapshot', () => {
  it('copies plain data all the way down, so the copy shares nothing with the original', () => {
    const original = { focus: { kind: 'view', position: [1, 2, 3], target: [4, 5, 6] }, list: [{ a: 1 }] };
    const copy = snapshot(original);
    expect(copy).toEqual(original);
    expect(copy.focus).not.toBe(original.focus);
    expect(copy.focus.target).not.toBe(original.focus.target);
    expect(copy.list[0]).not.toBe(original.list[0]);
    original.focus.target[0] = 99;
    expect(copy.focus.target[0]).toBe(4);
    expect(Object.isFrozen(original.focus.target), 'the original stays writable').toBe(false);
  });

  it('freezes the copy all the way down: a nested write throws and changes nothing', () => {
    const copy = snapshot({ focus: { target: [4, 5, 6] }, list: [{ a: 1 }] });
    for (const part of [copy, copy.focus, copy.focus.target, copy.list, copy.list[0]]) expect(Object.isFrozen(part)).toBe(true);
    expect(() => {
      copy.focus.target[0] = 10000;
    }).toThrow(TypeError);
    expect(copy.focus.target[0]).toBe(4);
  });
});
