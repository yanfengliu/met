/**
 * The query contract (docs/design/spec.md, Query contract), on parsed strings only. Bound: it does not load the page; the e2e suite does.
 */
import { describe, expect, it } from 'vitest';

import { opensReplay, parseQuery, shouldAutoplay, startPosition } from './query.js';

describe('parseQuery', () => {
  it('reads every parameter', () => {
    const q = parseQuery('?shot=1&t=3.5&step=steps-flight&view=top&cam=1,2,3,4,5,6&cut=8.5&solo=hunt-1902&autoplay=0&replay=1&noui=1&walk=1&spawn=great-hall&floor=main');
    expect(q).toMatchObject({ shot: true, t: 3.5, step: 'steps-flight', view: 'top', cam: [1, 2, 3, 4, 5, 6], cut: 8.5, solo: 'hunt-1902', autoplay: false, replay: true, noui: true, walk: true, spawn: 'great-hall', floor: 'main', warnings: [] });
  });

  it('defaults to nothing set', () => {
    expect(parseQuery('')).toMatchObject({ shot: false, t: null, step: null, view: null, cam: null, cut: null, solo: null, autoplay: null, replay: false, noui: false, walk: false, spawn: null, floor: null, warnings: [] });
  });

  it('ignores malformed values with a warning that names the parameter, the value and what is accepted', () => {
    const q = parseQuery('?t=abc&cam=1,2,3&cut=&autoplay=maybe&replay=open&walk=yes');
    expect([q.t, q.cam, q.cut, q.autoplay, q.replay, q.walk]).toEqual([null, null, null, null, false, false]);
    expect(q.warnings).toEqual([
      'Query parameter cam="1,2,3" is not six numbers; use cam=px,py,pz,tx,ty,tz in metres. It is ignored.',
      'Query parameter t="abc" is not a number; use t=<number from 0 to N>. It is ignored.',
      'Query parameter cut="" is not a number; use cut=<metres>. It is ignored.',
      'Query parameter autoplay="maybe" is not a flag; use autoplay=1 or autoplay=0. It is ignored.',
      'Query parameter replay="open" is not a flag; use replay=1 or replay=0. It is ignored.',
      'Query parameter walk="yes" is not a flag; use walk=1 or walk=0. It is ignored.',
    ]);
  });
});

describe('doors=', () => {
  it('sets the doors open or closed at load, and ignores any other value with a warning that names it and what is accepted', () => {
    expect(parseQuery('?doors=open')).toMatchObject({ doors: 'open', warnings: [] });
    expect(parseQuery('?doors=closed&shot=1')).toMatchObject({ doors: 'closed', shot: true, warnings: [] });
    expect(parseQuery('?doors=Open')).toMatchObject({ doors: 'open', warnings: [] });
    expect(parseQuery('')).toMatchObject({ doors: null, warnings: [] });
    for (const value of ['ajar', '', '1']) {
      const q = parseQuery(`?doors=${value}`);
      expect(q.doors).toBeNull();
      expect(q.warnings).toEqual([`Query parameter doors="${value}" is not a door state; use doors=open or doors=closed. It is ignored.`]);
    }
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

describe('opensReplay', () => {
  const ids = ['a', 'b', 'c'];
  const opens = (search: string): boolean => {
    const q = parseQuery(search);
    return opensReplay(q, startPosition(q, ids));
  };

  it('keeps the build replay closed on the default page and on every query that sets no position and asks for no replay', () => {
    for (const search of ['', '?autoplay=0', '?replay=0', '?shot=1', '?shot=1&noui=1', '?walk=1&spawn=plaza', '?walk=1&spawn=1,2,3,4,5,6', '?view=top', '?cam=1,2,3,4,5,6', '?floor=main', '?cut=8', '?doors=open']) {
      expect(opens(search), search).toBe(false);
    }
  });

  it('opens it for replay=1, for autoplay=1 and for a position set by t= or step=, in shot mode too', () => {
    for (const search of ['?replay=1', '?autoplay=1', '?t=1', '?t=3', '?step=b', '?step=2', '?shot=1&t=1', '?shot=1&replay=1', '?shot=1&autoplay=1', '?walk=1&t=0', '?walk=1&spawn=1,2,3,4,5,6&t=1', '?replay=0&t=1']) {
      expect(opens(search), search).toBe(true);
    }
  });

  it('keeps it closed for a position or a replay= the query ignores with a warning', () => {
    for (const search of ['?t=abc', '?step=zzz', '?replay=open']) {
      expect(opens(search), search).toBe(false);
    }
  });
});
