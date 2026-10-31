/**
 * The crossing rule's match of a line in doubt to the line read again (src/walk/crossing-rule.ts `crossingsAlong`), on hits made by hand as `read`
 * gives them: each crossing of the line's own reading is kept by a hit of the line read again that faces its way and lies on the plane of a face merged
 * into it, each hit keeping one crossing, found by augmenting paths where a first pick would leave a crossing with none (work unit 13, review 4, F17).
 * Red with the first pick kept, which takes the second offset's line instead: its sloped faces read 33 µm higher, not the first offset's 16 µm lower.
 * The rule's cases on the page's collision path are in src/walk/crossings.test.ts.
 * Bound: hits made by hand, on planes level or at 45° through the origin, read at the rule's own offsets.
 */
import { describe, expect, it } from 'vitest';

import { crossingsAlong } from './crossing-rule.js';
import type { LineHit, Places } from './crossing-rule.js';

/** Vertex places by index: an edge from (0, 0, 0) to (1, 0, 0) twice over, as 0 and 1 and as 4 and 5, and another edge, 2 and 3. */
const POINTS: readonly (readonly [number, number, number])[] = [[0, 0, 0], [1, 0, 0], [5, 0, 5], [6, 0, 6], [0, 0, 0], [1, 0, 0]];
const places: Places = { getX: (i) => POINTS[i]?.[0] ?? 0, getY: (i) => POINTS[i]?.[1] ?? 0, getZ: (i) => POINTS[i]?.[2] ?? 0 };

/** A hit at height `y` on a face whose unit normal is `normal`, on the edge or corner of `ends`, or inside its triangle with none. */
const hit = (y: number, normal: readonly [number, number, number], ends: readonly number[] = []): LineHit => ({ y, normalY: Math.abs(normal[1]), facing: Math.sign(normal[1]), normal, edge: ends.length > 0, ends });

const S = Math.SQRT1_2;
/** A level face looking up through the origin, one at 45° looking up through it, and a level face 1 m up looking down. */
const [LEVEL, SLOPED, ROOF] = [[0, 1, 0], [S, S, 0], [0, -1, 0]] as const;

/**
 * The hits of the vertical line through (x, z), lowest first. On the line itself the first part's level face and its sloped face share an edge at 0, one
 * crossing; the second part's sloped face lies there too, inside its triangle, a crossing of its own; and the two parts' roofs meet 1 m up on edges
 * that are not one, so the line is in doubt. Off the line, on the side of +X the second part's sloped face and the first part's level face, on the other
 * both parts' sloped faces, and both roofs, on no edge.
 */
function read(x: number, z: number): LineHit[] {
  if (x === 0 && z === 0) return [hit(0, LEVEL, [0, 1]), hit(0, SLOPED, [4, 5]), hit(0, SLOPED), hit(1, ROOF, [0, 1]), hit(1, ROOF, [2, 3])];
  const faces = x > 0 ? [hit(-x, SLOPED), hit(0, LEVEL)] : [hit(-x, SLOPED), hit(-x, SLOPED)];
  return [...faces.sort((a, b) => a.y - b.y), hit(1, ROOF), hit(1, ROOF)];
}

/** As `read`, with the first part's level and sloped faces on the other sides of their edge: off the line along +X it meets both parts' sloped faces. */
function mirrored(x: number, z: number): LineHit[] {
  if (x === 0 && z === 0) return read(x, z);
  const faces = x > 0 ? [hit(-x, SLOPED), hit(-x, SLOPED)] : [hit(0, LEVEL), hit(-x, SLOPED)];
  return [...faces.sort((a, b) => a.y - b.y), hit(1, ROOF), hit(1, ROOF)];
}

describe("the crossing rule's match of a line in doubt to the line read again", () => {
  it("finds a whole match where the first pick of a hit would leave a crossing with none, so the first offset's line stands", () => {
    // The first offset lies 16 µm along +X: the first part's crossing takes its level face, the second part's its sloped face, 16 µm under 0.
    const line = crossingsAlong(read, places, 0, 0);
    expect([line.heights, line.facings], 'the first offset read again: the sloped face, the level face and both roofs').toEqual([[expect.closeTo(-1.6e-5, 9), 0, 1, 1], [1, 1, -1, -1]]);
  });

  it('keeps a crossing merged from two faces by a hit on the plane of either, not only the face it kept', () => {
    // Along +X the line read again meets the first part's sloped face, merged into its crossing, which keeps it. Red with only the kept face's plane:
    // the second offset's line, its sloped face 33 µm over the level face.
    const line = crossingsAlong(mirrored, places, 0, 0);
    expect([line.heights, line.facings], 'the first offset read again: both sloped faces and both roofs').toEqual([[expect.closeTo(-1.6e-5, 9), expect.closeTo(-1.6e-5, 9), 1, 1], [1, 1, -1, -1]]);
  });
});
