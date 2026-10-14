/**
 * The capture script's guards: `--solo` must name a chapter id, and every folder it empties must lie strictly inside `.shots/`.
 * Bound: the guards are checked as pure functions on paths and ids; that `shots` and `sweep` call them before writing is read from the code and from a real run.
 */
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkSolo, insideShots } from './capture.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, '.shots');

describe('insideShots', () => {
  it('accepts the folders capture writes', () => {
    for (const name of ['shots', 'shots-hunt-1902', 'sweep-7-t6.5', 'sweep-123-t-1']) expect(insideShots(join(OUT, name))).toBe(join(OUT, name));
  });

  it.each([
    ['a solo of ../../.. (the repository root)', join(OUT, 'shots-../../..')],
    ['.shots itself', OUT],
    ['the repository root', ROOT],
    ['a sibling of .shots', join(ROOT, 'src')],
    ['a name that only starts like .shots', join(ROOT, '.shots-evil')],
    ['a folder outside the repository', resolve(ROOT, '..', 'elsewhere')],
  ])('refuses %s', (_, dir) => {
    expect(() => insideShots(dir)).toThrow(/^Refusing to empty .*: capture deletes only folders inside /);
  });
});

describe('checkSolo', () => {
  const ids = ['site', 'hunt-1902', 'koch-plaza-2014'];

  it('accepts no solo and a known chapter id', () => {
    expect(() => { checkSolo(undefined, ids); }).not.toThrow();
    expect(() => { checkSolo('hunt-1902', ids); }).not.toThrow();
  });

  it.each(['../../..', 'hunt', 'HUNT-1902', ''])('rejects %j and names the value and the known ids', (solo) => {
    expect(() => { checkSolo(solo, ids); }).toThrow(`--solo "${solo}" names no chapter; use one of site, hunt-1902, koch-plaza-2014.`);
  });
});
