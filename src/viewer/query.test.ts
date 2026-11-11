/**
 * The query contract (docs/design/spec.md, Query contract), on parsed strings only. Bound: it does not load the page; the e2e suite does.
 */
import { describe, expect, it } from 'vitest';

import { parseQuery } from './query.js';

describe('parseQuery', () => {
  it('reads every parameter', () => {
    const q = parseQuery('?shot=1&view=top&cam=1,2,3,4,5,6&cut=8.5&solo=hunt-1902&noui=1&walk=1&spawn=great-hall&floor=main');
    expect(q).toMatchObject({ shot: true, view: 'top', cam: [1, 2, 3, 4, 5, 6], cut: 8.5, solo: 'hunt-1902', noui: true, walk: true, spawn: 'great-hall', floor: 'main', warnings: [] });
  });

  it('defaults to nothing set', () => {
    expect(parseQuery('')).toEqual({ shot: false, view: null, cam: null, cut: null, solo: null, noui: false, walk: false, spawn: null, floor: null, doors: null, warnings: [] });
  });

  it('ignores malformed values with a warning that names the parameter, the value and what is accepted', () => {
    const q = parseQuery('?cam=1,2,3&cut=&walk=yes');
    expect([q.cam, q.cut, q.walk]).toEqual([null, null, false]);
    expect(q.warnings).toEqual([
      'Query parameter cam="1,2,3" is not six numbers; use cam=px,py,pz,tx,ty,tz in metres. It is ignored.',
      'Query parameter cut="" is not a number; use cut=<metres>. It is ignored.',
      'Query parameter walk="yes" is not a flag; use walk=1 or walk=0. It is ignored.',
    ]);
  });

  it('reads nothing of the build replay’s old parameters, which an old link may still carry', () => {
    expect(parseQuery('?t=3.5&step=steps-flight&autoplay=1&replay=1')).toEqual(parseQuery(''));
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
