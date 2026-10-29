/**
 * Where `spawn=` starts the walk (src/walk/spawns.ts `startOf`, docs/design/spec.md, Query contract): a walk spawn by its id, else a place of the query's
 * own (`placeOf`, `spawn=x,y,z,tx,ty,tz`): the feet as given, the level direction toward the target and the pitch that looks at it from BODY.eye over
 * the feet. Anything but six finite numbers with the target off the vertical through the feet is no place, and text that names neither warns, naming
 * itself and what would be accepted. Where walk mode then drops the feet is src/walk/walker.ts's `place`, the same as for a spawn's.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_SPAWN, PLACE_ID, SPAWNS, placeOf, spawnById, spawnYaw, startOf } from './spawns.js';
import { BODY } from './walker.js';

describe('a place of the query’s own', () => {
  it('stands the feet where the text says and looks at its target from the eye over them', () => {
    const place = placeOf('1, 4.11 ,-2,4,4.11,2');
    expect(place).toMatchObject({ id: PLACE_ID, feet: [1, 4.11, -2], facing: [3, 4] });
    expect(place?.pitch, 'down at a target at the feet’s height, 5 m off').toBeCloseTo((Math.atan2(-BODY.eye, 5) * 180) / Math.PI, 12);
    expect(placeOf('0,0,0,0,11.6,-10')?.pitch, 'up 45° at a target 10 m out and 10 m over the eye').toBeCloseTo(45, 12);
    // Yaw 0 faces −Z and grows turning left (src/walk/walker.ts): a target toward −X, south in the world frame (src/model/frame.ts), is a quarter turn left.
    const south = placeOf('5,0,5,-5,1.6,5');
    expect(south === null ? Number.NaN : spawnYaw(south)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('is no place unless the text is six finite numbers with the target off the vertical through the feet', () => {
    for (const text of ['1,2,3,4,5', '1,2,3,4,5,6,7', '', 'plaza', '1,2,3,4,,6', '1,2,3,x,5,6', '1,2,3,Infinity,5,6', '1,2,3,1,9,3']) expect(placeOf(text), text).toBeNull();
  });

  it('takes an id no spawn has', () => {
    expect(SPAWNS.map((s) => s.id)).not.toContain(PLACE_ID);
  });
});

describe('where spawn= starts the walk', () => {
  it('starts at a spawn by its id, else at a place, and without the parameter leaves the choice to walk mode', () => {
    expect(startOf('great-hall')).toEqual({ spawn: spawnById('great-hall'), warning: null });
    expect(startOf('0,4.11,-4,0,5.71,-10')).toEqual({ spawn: placeOf('0,4.11,-4,0,5.71,-10'), warning: null });
    expect(startOf(null)).toEqual({ spawn: null, warning: null });
  });

  it('warns about text that names neither, naming it, the spawns and the place form, and starts as without it', () => {
    for (const text of ['hall', '1,2,3', '1,2,3,1,9,3']) {
      const start = startOf(text);
      expect(start.spawn, text).toBeNull();
      expect(start.warning, text).toBe(`Query parameter spawn="${text}" names no walk spawn and no place; use one of ${SPAWNS.map((s) => s.id).join(', ')}, or x,y,z,tx,ty,tz in metres: the feet, then a point looked at off the vertical through them. The walk starts at ${DEFAULT_SPAWN}.`);
    }
  });
});
