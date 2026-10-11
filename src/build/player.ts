/**
 * The player (docs/design/spec.md, Playback): pure logic over the timeline position `t` in [0, N], with no DOM and no clock of its own.
 * Step i (0-based) plays in `weight_i * BASE_SECONDS / speed` seconds. Playing stops at 0 or N; stepping animates to an integer and a second press retargets.
 * Bound: `tick` integrates exactly across step boundaries (a long tick crossing steps of different weights lands where short ticks would, up to rounding);
 * every stop lands on the exact integer, never near it.
 */

/** Seconds one step of weight 1 takes at 1x. */
export const BASE_SECONDS = 3;

export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** `playing` runs to 0 or N; `stepping` runs to `target`. */
export type PlayerMode = 'paused' | 'playing' | 'stepping';

export function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value);
}

export class Player {
  private readonly weights: readonly number[];
  private position: number;
  private state: PlayerMode = 'paused';
  private dir: 1 | -1 = 1;
  private goal = 0;
  private rate: Speed = 1;

  /** `weights[i]` is step i's duration multiplier (finite and above 0). */
  constructor(weights: readonly number[], t = 0) {
    weights.forEach((w, i) => {
      if (!(Number.isFinite(w) && w > 0)) throw new Error(`Player: step ${String(i + 1)} has weight ${String(w)}; a weight must be a finite number above 0.`);
    });
    this.weights = [...weights];
    this.position = this.clamp(t);
  }

  get n(): number {
    return this.weights.length;
  }

  get t(): number {
    return this.position;
  }

  get mode(): PlayerMode {
    return this.state;
  }

  /** +1 forward, -1 backward; meaningful while not paused. */
  get direction(): 1 | -1 {
    return this.dir;
  }

  /** Where a step is heading, or null unless stepping. */
  get target(): number | null {
    return this.state === 'stepping' ? this.goal : null;
  }

  get speed(): Speed {
    return this.rate;
  }

  get moving(): boolean {
    return this.state !== 'paused';
  }

  /** Plays forward to N; from N it starts again at 0. */
  playForward(): void {
    if (this.n === 0) return;
    if (this.position >= this.n) this.position = 0;
    this.run('playing', 1, this.n);
  }

  /** Plays backward to 0; from 0 it starts again at N. */
  playBackward(): void {
    if (this.n === 0) return;
    if (this.position <= 0) this.position = this.n;
    this.run('playing', -1, 0);
  }

  pause(): void {
    this.state = 'paused';
  }

  /** Space: pause if moving, else play forward. */
  togglePlay(): void {
    if (this.moving) this.pause();
    else this.playForward();
  }

  /** Shift+Space and the play-backward button: pause if playing backward, else play backward. */
  togglePlayBackward(): void {
    if (this.state === 'playing' && this.dir === -1) this.pause();
    else this.playBackward();
  }

  /** Animates to the next integer; while already stepping forward, one further. */
  stepForward(): void {
    const next = this.state === 'stepping' && this.dir === 1 ? this.goal + 1 : Math.floor(this.position) + 1;
    this.stepTo(Math.min(this.n, next), 1);
  }

  /** Animates to the previous integer; while already stepping backward, one further. */
  stepBack(): void {
    const previous = this.state === 'stepping' && this.dir === -1 ? this.goal - 1 : Math.ceil(this.position) - 1;
    this.stepTo(Math.max(0, previous), -1);
  }

  /** Sets `t` directly (clamped) and pauses. */
  scrub(t: number): void {
    if (Number.isNaN(t)) throw new Error('Player.scrub: t is NaN; pass a number in [0, N].');
    this.state = 'paused';
    this.position = this.clamp(t);
  }

  toStart(): void {
    this.scrub(0);
  }

  toEnd(): void {
    this.scrub(this.n);
  }

  setSpeed(speed: number): void {
    if (!isSpeed(speed)) throw new Error(`Player.setSpeed: ${String(speed)} is not a speed; use one of ${SPEEDS.join(', ')}.`);
    this.rate = speed;
  }

  /** Advances by `seconds` of wall time. Returns whether `t` changed. */
  tick(seconds: number): boolean {
    if (this.state === 'paused' || !(seconds > 0)) return false;
    const before = this.position;
    let remaining = seconds;
    while (remaining > 0 && this.position !== this.goal) {
      const step = this.dir === 1 ? Math.floor(this.position) : Math.ceil(this.position) - 1;
      const weight = this.weights[Math.min(Math.max(step, 0), this.n - 1)] ?? 1;
      const perSecond = this.rate / (weight * BASE_SECONDS);
      const boundary = this.dir === 1 ? Math.min(step + 1, this.goal) : Math.max(step, this.goal);
      const needed = Math.abs(boundary - this.position) / perSecond;
      if (needed <= remaining) {
        this.position = boundary;
        remaining -= needed;
      } else {
        // Clamped, so rounding can never carry t past the boundary it has not reached.
        const moved = this.position + this.dir * perSecond * remaining;
        this.position = this.dir === 1 ? Math.min(moved, boundary) : Math.max(moved, boundary);
        remaining = 0;
      }
    }
    if (this.position === this.goal) this.state = 'paused';
    return this.position !== before;
  }

  private run(mode: PlayerMode, dir: 1 | -1, goal: number): void {
    this.state = mode;
    this.dir = dir;
    this.goal = goal;
    if (this.position === goal) this.state = 'paused';
  }

  private stepTo(goal: number, dir: 1 | -1): void {
    if (this.n === 0) return;
    this.run('stepping', dir, goal);
  }

  private clamp(t: number): number {
    return Math.min(Math.max(t, 0), this.n);
  }
}
