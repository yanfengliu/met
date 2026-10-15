/**
 * The query contract (docs/design/spec.md, Query contract), on parsed strings only. Bound: it does not load the page; the e2e suite does.
 */
import { describe, expect, it } from 'vitest';

import { parseQuery, shouldAutoplay, startPosition } from './query.js';

describe('parseQuery', () => {
  it('reads every parameter', () => {
    const q = parseQuery('?shot=1&t=3.5&step=steps-flight&view=top&cam=1,2,3,4,5,6&cut=8.5&solo=hunt-1902&autoplay=0&noui=1&walk=1&spawn=great-hall');
    expect(q).toMatchObject({ shot: true, t: 3.5, step: 'steps-flight', view: 'top', cam: [1, 2, 3, 4, 5, 6], cut: 8.5, solo: 'hunt-1902', autoplay: false, noui: true, walk: true, spawn: 'great-hall', warnings: [] });
  });

  it('defaults to nothing set', () => {
    expect(parseQuery('')).toMatchObject({ shot: false, t: null, step: null, view: null, cam: null, cut: null, solo: null, autoplay: null, noui: false, walk: false, spawn: null, warnings: [] });
  });

  it('ignores malformed values with a warning that names the parameter, the value and what is accepted', () => {
    const q = parseQuery('?t=abc&cam=1,2,3&cut=&autoplay=maybe&walk=yes');
    expect([q.t, q.cam, q.cut, q.autoplay, q.walk]).toEqual([null, null, null, null, false]);
    expect(q.warnings).toEqual([
      'Query parameter cam="1,2,3" is not six numbers; use cam=px,py,pz,tx,ty,tz in metres. It is ignored.',
      'Query parameter t="abc" is not a number; use t=<number from 0 to N>. It is ignored.',
      'Query parameter cut="" is not a number; use cut=<metres>. It is ignored.',
      'Query parameter autoplay="maybe" is not a flag; use autoplay=1 or autoplay=0. It is ignored.',
      'Query parameter walk="yes" is not a flag; use walk=1 or walk=0. It is ignored.',
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

  it('opens on the finished building, paused, unless autoplay=1 asks to watch the build from the empty site', () => {
    const open = (search: string): [number, boolean] => {
      const q = parseQuery(search);
      return [startPosition(q, ids).t, shouldAutoplay(q)];
    };
    expect(open('')).toEqual([3, false]);
    expect(open('?autoplay=0')).toEqual([3, false]);
    expect(open('?autoplay=1')).toEqual([0, true]);
    expect(open('?walk=1')).toEqual([3, false]);
  });

  it('plays from a set position only with autoplay=1, and never in shot mode', () => {
    const open = (search: string): [number, boolean] => {
      const q = parseQuery(search);
      return [startPosition(q, ids).t, shouldAutoplay(q)];
    };
    expect(open('?t=1')).toEqual([1, false]);
    expect(open('?t=1&autoplay=1')).toEqual([1, true]);
    expect(open('?step=b&autoplay=1')).toEqual([2, true]);
    expect(open('?shot=1&autoplay=1')).toEqual([0, false]);
  });
});
