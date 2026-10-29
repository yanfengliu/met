/**
 * The timeline bar's shape (docs/design/spec.md, Page: Build replay and Timeline bar), on every combination of its three inputs.
 * Bound: the rule alone, as `barShape` gives it; the DOM it drives and the layout of each shape are tests/e2e/replay.spec.ts and layout.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { barShape } from './timeline-bar.js';

describe('barShape', () => {
  it('is the Walk toggle\'s strip whenever the build replay is closed, walking or not, folded or not', () => {
    for (const walking of [false, true]) {
      for (const barOpen of [false, true]) expect(barShape({ replay: false, walking, barOpen }), `walking ${String(walking)}, unfolded ${String(barOpen)}`).toBe('strip');
    }
  });

  it('with the replay open, is whole in the orbit view, folded or not, and walking is folded until unfolded', () => {
    expect(barShape({ replay: true, walking: false, barOpen: false })).toBe('whole');
    expect(barShape({ replay: true, walking: false, barOpen: true })).toBe('whole');
    expect(barShape({ replay: true, walking: true, barOpen: false })).toBe('folded');
    expect(barShape({ replay: true, walking: true, barOpen: true })).toBe('whole');
  });
});
