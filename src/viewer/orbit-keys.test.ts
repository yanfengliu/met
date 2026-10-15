/**
 * The orbit view's movement keys (src/viewer/orbit-keys.ts) on numbers only: which way each key moves, that the speed follows the distance to the
 * target with a floor, that Shift doubles it and diagonals are no faster, and that a straight-down view moves along the screen's up.
 * Bound: no page; tests/e2e/walk.spec.ts presses the keys on the page.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { ORBIT_KEY_MIN_SPEED, ORBIT_KEY_SPEED, orbitKeyMove, orbitKeys } from './orbit-keys.js';

const UP = new Vector3(0, 1, 0);
const keys = (...codes: string[]): ReturnType<typeof orbitKeys> => orbitKeys(new Set(codes));

describe('orbitKeyMove', () => {
  const position = new Vector3(0, 30, 40);
  const target = new Vector3(0, 0, 0);
  const speed = 50 * ORBIT_KEY_SPEED;

  it('moves along the view laid flat for W and S, sideways for D and A, and up and down for E and Q', () => {
    const cases: [string, Vector3][] = [
      ['KeyW', new Vector3(0, 0, -1)],
      ['KeyS', new Vector3(0, 0, 1)],
      ['KeyD', new Vector3(1, 0, 0)],
      ['KeyA', new Vector3(-1, 0, 0)],
      ['KeyE', new Vector3(0, 1, 0)],
      ['KeyQ', new Vector3(0, -1, 0)],
    ];
    for (const [code, way] of cases) {
      const move = orbitKeyMove(position, target, UP, keys(code), 0.5);
      expect(move.distanceTo(way.multiplyScalar(speed * 0.5)), code).toBeLessThan(1e-9);
    }
  });

  it('doubles with Shift, keeps diagonals at the same speed, and has a floor near the target', () => {
    expect(orbitKeyMove(position, target, UP, keys('KeyW', 'ShiftLeft'), 1).length()).toBeCloseTo(2 * speed, 9);
    expect(orbitKeyMove(position, target, UP, keys('KeyW', 'KeyD'), 1).length()).toBeCloseTo(speed, 9);
    expect(orbitKeyMove(new Vector3(0, 0, 0.5), target, UP, keys('KeyW'), 1).length()).toBeCloseTo(ORBIT_KEY_MIN_SPEED, 9);
    expect(orbitKeyMove(position, target, UP, keys('KeyW', 'KeyS'), 1).length()).toBe(0);
  });

  it('is the same over one long frame as over many short ones', () => {
    const one = orbitKeyMove(position, target, UP, keys('KeyA'), 0.2);
    const many = new Vector3();
    for (let k = 0; k < 20; k += 1) many.add(orbitKeyMove(position, target, UP, keys('KeyA'), 0.01));
    expect(one.distanceTo(many)).toBeLessThan(1e-9);
  });

  it('looking straight down, W moves toward the top of the screen', () => {
    const screenUp = new Vector3(1, 0, 0);
    const move = orbitKeyMove(new Vector3(0, 100, 0), new Vector3(0, 0, 0), screenUp, keys('KeyW'), 1);
    expect(move.clone().normalize().distanceTo(screenUp)).toBeLessThan(1e-9);
  });
});
