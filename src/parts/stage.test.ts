/**
 * The gallery's `view=` names (parts.html): every view of VIEWS is accepted, and nothing else, including keys inherited from Object.prototype.
 * Bound: the pure lookup only; that parts.html falls back to three-quarter with a message is read from src/parts/main.ts.
 */
import { describe, expect, it } from 'vitest';

import { viewNamed, VIEWS } from './stage.js';

describe('viewNamed', () => {
  it('accepts each of the gallery views', () => {
    for (const name of Object.keys(VIEWS)) expect(viewNamed(name)).toBe(name);
  });

  it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf', '', 'Front', 'nope'])('rejects %j', (text) => {
    expect(viewNamed(text)).toBeNull();
  });
});
