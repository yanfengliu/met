/**
 * Player logic (docs/design/spec.md, Playback): durations by weight and speed, stops at 0 and N, stepping with retargeting, scrubbing.
 * Bound: wall time is injected through `tick`, so these tests prove the arithmetic, not the page's clock.
 */
import { describe, expect, it } from 'vitest';

import { BASE_SECONDS, Player, SPEEDS } from './player.js';

const WEIGHTS = [1, 2, 0.5, 1, 1];

function runFor(player: Player, seconds: number, dt = 1 / 60): void {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) player.tick(Math.min(dt, seconds - elapsed));
}

describe('player', () => {
  it('starts paused at the given t, clamped to [0, N]', () => {
    expect(new Player(WEIGHTS).t).toBe(0);
    expect(new Player(WEIGHTS, 3.5).t).toBe(3.5);
    expect(new Player(WEIGHTS, 99).t).toBe(5);
    expect(new Player(WEIGHTS, -2).mode).toBe('paused');
  });

  it('plays a step of weight w in w * BASE_SECONDS / speed seconds', () => {
    for (const speed of SPEEDS) {
      const player = new Player(WEIGHTS);
      player.setSpeed(speed);
      player.playForward();
      player.tick((1 * BASE_SECONDS) / speed);
      expect(player.t).toBeCloseTo(1, 9);
      player.tick((2 * BASE_SECONDS) / speed / 2);
      expect(player.t).toBeCloseTo(1.5, 9);
    }
  });

  it('integrates one long tick across steps of different weights exactly as many short ones', () => {
    const long = new Player(WEIGHTS);
    long.playForward();
    long.tick(7.25);
    const short = new Player(WEIGHTS);
    short.playForward();
    runFor(short, 7.25, 0.01);
    expect(long.t).toBeCloseTo(short.t, 6);
    // 3 s for step 1, 4.25 s of the 6 s of step 2.
    expect(long.t).toBeCloseTo(1 + 4.25 / 6, 9);
  });

  it('stops exactly at N playing forward and at 0 playing backward', () => {
    const player = new Player(WEIGHTS);
    player.setSpeed(4);
    player.playForward();
    runFor(player, 60);
    expect(player.t).toBe(5);
    expect(player.mode).toBe('paused');
    player.playBackward();
    expect(player.direction).toBe(-1);
    runFor(player, 60);
    expect(player.t).toBe(0);
    expect(player.mode).toBe('paused');
  });

  it('starts again from 0 when played forward at N, and from N when played backward at 0', () => {
    const player = new Player(WEIGHTS, 5);
    player.playForward();
    expect(player.t).toBe(0);
    expect(player.mode).toBe('playing');
    player.toStart();
    player.playBackward();
    expect(player.t).toBe(5);
    expect(player.direction).toBe(-1);
  });

  it('pauses and resumes; toggles follow Space and Shift+Space', () => {
    const player = new Player(WEIGHTS);
    player.togglePlay();
    expect(player.mode).toBe('playing');
    player.tick(1);
    const t = player.t;
    player.togglePlay();
    expect(player.mode).toBe('paused');
    expect(player.tick(1)).toBe(false);
    expect(player.t).toBe(t);
    player.togglePlayBackward();
    expect([player.mode, player.direction]).toEqual(['playing', -1]);
    player.togglePlayBackward();
    expect(player.mode).toBe('paused');
    player.playForward();
    player.togglePlayBackward();
    expect([player.mode, player.direction]).toEqual(['playing', -1]);
  });

  it('steps forward to the next integer and back to the previous one, landing exactly', () => {
    const player = new Player(WEIGHTS, 2.4);
    player.stepForward();
    expect(player.target).toBe(3);
    runFor(player, 30);
    expect(player.t).toBe(3);
    expect(player.mode).toBe('paused');
    player.stepBack();
    expect(player.target).toBe(2);
    runFor(player, 30);
    expect(player.t).toBe(2);
    player.scrub(2.6);
    player.stepBack();
    expect(player.target).toBe(2);
  });

  it('retargets on a second press while moving', () => {
    const player = new Player(WEIGHTS, 1);
    player.stepForward();
    player.tick(0.5);
    player.stepForward();
    expect(player.target).toBe(3);
    player.stepBack();
    expect([player.target, player.direction]).toEqual([1, -1]);
    player.stepBack();
    expect(player.target).toBe(0);
    player.stepBack();
    expect(player.target).toBe(0);
    runFor(player, 60);
    expect(player.t).toBe(0);
  });

  it('switches from playing to stepping on a step press', () => {
    const player = new Player(WEIGHTS);
    player.playForward();
    player.tick(1);
    player.stepForward();
    expect([player.mode, player.target]).toEqual(['stepping', 1]);
    player.playForward();
    player.tick(0.1);
    player.stepBack();
    expect([player.mode, player.target, player.direction]).toEqual(['stepping', 0, -1]);
  });

  it('does nothing when stepping past the ends', () => {
    const end = new Player(WEIGHTS, 5);
    end.stepForward();
    expect([end.mode, end.t]).toEqual(['paused', 5]);
    const start = new Player(WEIGHTS, 0);
    start.stepBack();
    expect([start.mode, start.t]).toEqual(['paused', 0]);
  });

  it('scrubs directly, clamped, and pauses', () => {
    const player = new Player(WEIGHTS);
    player.playForward();
    player.scrub(3.75);
    expect([player.t, player.mode]).toEqual([3.75, 'paused']);
    player.scrub(-4);
    expect(player.t).toBe(0);
    player.toEnd();
    expect(player.t).toBe(5);
    expect(() => { player.scrub(Number.NaN); }).toThrow(/NaN/);
  });

  it('accepts only the four speeds and only positive finite weights', () => {
    const player = new Player(WEIGHTS);
    expect(() => { player.setSpeed(3); }).toThrow(/not a speed; use one of 0.5, 1, 2, 4/);
    expect(() => new Player([1, 0])).toThrow(/step 2 has weight 0/);
    expect(() => new Player([Number.NaN])).toThrow(/step 1 has weight NaN/);
  });

  it('handles an empty sequence', () => {
    const player = new Player([]);
    player.playForward();
    player.stepForward();
    expect([player.t, player.mode]).toEqual([0, 'paused']);
  });
});
