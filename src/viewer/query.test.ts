/**
 * The query contract (docs/design/spec.md, Query contract), on parsed strings only. Bound: it does not load the page; the e2e suite does.
 */
import { describe, expect, it } from 'vitest';

import { parseQuery, shouldAutoplay, startPosition } from './query.js';

describe('parseQuery', () => {
  it('reads every parameter', () => {
    const q = parseQuery('?shot=1&t=3.5&step=demo&view=top&cam=1,2,3,4,5,6&cut=8.5&solo=hunt-1902&autoplay=0&noui=1');
    expect(q).toMatchObject({ shot: true, t: 3.5, step: 'demo', view: 'top', cam: [1, 2, 3, 4, 5, 6], cut: 8.5, solo: 'hunt-1902', autoplay: false, noui: true, warnings: [] });
  });

  it('defaults to nothing set', () => {
    expect(parseQuery('')).toMatchObject({ shot: false, t: null, step: null, view: null, cam: null, cut: null, solo: null, autoplay: null, noui: false, warnings: [] });
  });

  it('ignores malformed values with a warning that names the parameter, the value and what is accepted', () => {
    const q = parseQuery('?t=abc&cam=1,2,3&cut=&autoplay=maybe');
    expect([q.t, q.cam, q.cut, q.autoplay]).toEqual([null, null, null, null]);
    expect(q.warnings).toEqual([
      'Query parameter cam="1,2,3" is not six numbers; use cam=px,py,pz,tx,ty,tz in metres. It is ignored.',
      'Query parameter t="abc" is not a number; use t=<number from 0 to N>. It is ignored.',
      'Query parameter cut="" is not a number; use cut=<metres>. It is ignored.',
      'Query parameter autoplay="maybe" is not a flag; use autoplay=1 or autoplay=0. It is ignored.',
    ]);
  });
});

describe('startPosition and autoplay', () => {
  const ids = ['a', 'b', 'c'];

  it('puts a step id or a 1-based index at the end of that step, winning over t', () => {
    expect(startPosition(parseQuery('?step=b&t=0.5'), ids)).toMatchObject({ t: 2, positioned: true });
    expect(startPosition(parseQuery('?step=3'), ids)).toMatchObject({ t: 3, positioned: true });
    expect(startPosition(parseQuery('?step=zzz'), ids).warnings[0]).toMatch(/step="zzz" names no step; use a step id or an index from 1 to 3/);
  });

  it('clamps t to [0, N] with a warning', () => {
    const start = startPosition(parseQuery('?t=9'), ids);
    expect(start.t).toBe(3);
    expect(start.warnings[0]).toMatch(/outside \[0, 3\]/);
  });

  it('autoplays only without a position, never in shot mode, and as autoplay says', () => {
    const auto = (search: string): boolean => {
      const q = parseQuery(search);
      return shouldAutoplay(q, startPosition(q, ids));
    };
    expect(auto('')).toBe(true);
    expect(auto('?t=1')).toBe(false);
    expect(auto('?autoplay=0')).toBe(false);
    expect(auto('?t=1&autoplay=1')).toBe(true);
    expect(auto('?shot=1&autoplay=1')).toBe(false);
  });
});
