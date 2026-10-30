/**
 * The walker (docs/design/spec.md, Walk mode): a person-sized capsule moved by input, gravity and collision against a `WalkWorld`. Pure logic: no
 * DOM, no clock of its own (the caller passes seconds) and no scene writes.
 *
 * Model. The body is a capsule of radius 0.35 m and height 1.75 m standing on its feet; the eye is 1.6 m above them. Walls are met by a "floating"
 * capsule that starts STEP (0.35 m) above the feet, so anything lower than that is stepped onto rather than walked into: vertical probes from
 * STEP above the feet find the ground, and the feet snap to it when it lies within STEP above or below and is walkable (no steeper than 40°);
 * a rise is taken only where the raised capsule meets nothing overhead, else the move is refused as at a wall (a step under a low ceiling).
 * The ground is the surface under the body's centre or, over a gap or groove there, the lower rim of two opposite sides 0.3 m out, whichever is
 * higher (./footing.ts), read while walking only where the centre finds nothing at the feet, so a body keeps to its ground; one set down (`place`)
 * or settled is lifted out of a groove narrower than itself onto its rims, as onto a floor's tiles either side of a joint. A steeper surface is
 * met like a wall from the ground, and where the body lands on one it slides down it with only air control, the keys unable to push it uphill.
 * Off an edge higher than STEP the body falls under gravity and lands on the first surface below;
 * a jump starts at the speed that rises JUMP_HEIGHT. On the ground every push from the walls is level, and the velocity into a wall is removed,
 * so the body slides along it. Below everything lies the workspace ground, a plane at `floorY`, where a body stands when nothing is built under it.
 * After the world is built again, `settle` moves a body that new pieces bury or embed onto the lowest walkable surface over it where it stands clear,
 * and on out of a groove there onto its rims.
 *
 * Time. Physics runs in fixed steps of 1/120 s, the remainder carried to the next frame, so a run is the same at any frame rate; a snap up or down a
 * stair is eased out over about 0.1 s for the eye only, and the eye is the eased eye of the last two steps, interpolated between them.
 * Bound: a step moves the body at most 5 m/s × 1/120 s = 4 cm sideways and 40 m/s × 1/120 s = 0.33 m down, less than the capsule's radius and
 * the probe's reach, so it cannot pass a wall or a floor; geometry thinner than that is crossed only by a capsule pushed out the far side.
 */
import { Line3, MathUtils, Vector3 } from 'three';

import type { GroundHit, LineCrossings } from './collision.js';
import { Footing, insideBetween } from './footing.js';

export { insideBetween };

/** What the walker collides with: ./collision.ts `CollisionWorld`, ./door-world.ts `DoorWorld`, or any stand-in with the same queries. */
export interface WalkWorld {
  resolveCapsule(segment: Line3, radius: number, horizontal: boolean, out: Vector3): Vector3;
  groundBelow(x: number, y: number, z: number, length: number, hit: GroundHit): boolean;
  crossings(x: number, z: number, bottom: number, top: number): readonly LineCrossings[];
  /** Moves what moves in the world (the doors' swings) on by one fixed step of `seconds`, before the body at `feet` moves in it. */
  advance?(seconds: number, feet: Vector3): void;
}

/** What `settle` did: left the walker where it stood, moved it onto a surface over its feet, or found none (the caller places it elsewhere). */
export type Settled = 'kept' | 'moved' | 'lost';

/** A surface less than this above the feet is the one they stand on, metres. */
export const STANDING = 1e-3;

/** The body, in metres. */
export const BODY = Object.freeze({ radius: 0.35, height: 1.75, eye: 1.6, step: 0.35, maxSlopeDeg: 40 });

/**
 * Motion, in metres and seconds. Walking is 2 m/s, a brisk walk indoors: about 1.4 times a person's comfortable 1.4 m/s, because motion seen on a screen
 * looks slower than the same walk in life; 3 m/s read as a jog. Running is 5 m/s, 2.5 times the walk, to cross the 300 m building in a minute (docs/design/spec.md, Walk mode).
 */
export const MOTION = Object.freeze({
  walk: 2,
  run: 5,
  gravity: 9.81,
  jumpHeight: 0.45,
  maxFall: 40,
  /** Seconds for the horizontal velocity to close about 63% of the way to what the keys ask, on the ground and in the air. */
  groundTau: 0.07,
  airTau: 0.7,
  fixedStep: 1 / 120,
  /** Pitch is kept within ±85°. */
  maxPitch: MathUtils.degToRad(85),
});

const MIN_WALKABLE_NORMAL_Y = Math.cos(MathUtils.degToRad(BODY.maxSlopeDeg));
const JUMP_SPEED = Math.sqrt(2 * MOTION.gravity * MOTION.jumpHeight);
/** The probe starts this far above STEP, so a surface exactly STEP up is found. */
const PROBE_EPSILON = 0.02;
/** A snap of the feet larger than this, on the ground, is a stair: the eye eases out of it. */
const STAIR_SNAP = 0.05;
const EASE_TAU = 0.09;
/** A jump pressed this long before landing still fires on landing. */
const JUMP_BUFFER = 0.15;
/** The raised body may meet something overhead by this much and still fit under it, metres. */
const HEADROOM_SLOP = 1e-3;
const MAX_STEPS_PER_UPDATE = 30;

/** What the keys ask for: `forward` and `right` in [-1, 1] (back and left are negative), running, nothing else. */
export interface WalkInput {
  readonly forward: number;
  readonly right: number;
  readonly run: boolean;
}

export const NO_INPUT: WalkInput = Object.freeze({ forward: 0, right: 0, run: false });

/** How many numbers `Walker.save` writes: everything that carries a walker from one physics step to the next. */
export const WALKER_STATE_SIZE = 20;

export class Walker {
  /** The feet: the bottom of the capsule, on its axis. */
  readonly feet = new Vector3();
  /** Velocity, metres per second. */
  readonly velocity = new Vector3();
  onGround = false;
  /** Radians: yaw 0 looks toward −Z and grows turning left; pitch grows looking up. */
  yaw = 0;
  pitch = 0;
  private readonly before = new Vector3();
  private accumulator = 0;
  /** The eye's offset from 1.6 m over the feet as it eases out of stair snaps: after the last fixed step, and after the one before it. */
  private ease = 0;
  private easeBefore = 0;
  private jumpTimer = 0;
  private slide: { x: number; z: number; y: number } | null = null;
  private readonly segment = new Line3();
  private readonly push = new Vector3();
  private readonly hit: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };
  private readonly footing: Footing;

  constructor(
    private readonly world: WalkWorld,
    /** The workspace ground: the walker never goes below it. */
    private readonly floorY: number,
  ) {
    this.footing = new Footing(world);
  }

  /**
   * Puts the feet on the first surface below (x, y + 1 m, z), or on the workspace ground where there is none, and on out of a groove narrower than the
   * body there onto its rims (`ontoRims`), as onto a floor's tiles either side of a joint; where the first surface lies more than a step under y, the
   * centre having passed through a gap or a seam, first onto rims within a step of y, as the walking step at y would stand; facing `yaw` and `pitch`, at rest.
   */
  place(x: number, y: number, z: number, yaw: number, pitch = 0): void {
    this.feet.set(x, Math.max(y, this.floorY), z);
    this.yaw = yaw;
    this.pitch = MathUtils.clamp(pitch, -MOTION.maxPitch, MOTION.maxPitch);
    this.rest(false);
    // Nothing built under the place (t = 0, for one), or only below the workspace ground: that ground, at once rather than after a fall to it.
    const found = this.world.groundBelow(x, y + 1, z, 1 + y - this.floorY, this.hit);
    this.feet.y = found ? Math.max(this.hit.y, this.floorY) : this.floorY;
    this.onGround = this.feet.y <= this.floorY || this.hit.normalY >= MIN_WALKABLE_NORMAL_Y;
    const bridged = this.feet.y < y - BODY.step && this.ontoRims(y - BODY.step, y + BODY.step + PROBE_EPSILON);
    if (bridged || this.ontoRims(this.feet.y, this.feet.y + BODY.step + PROBE_EPSILON)) this.onGround = true;
    for (let k = 0; k < 4; k += 1) if (this.walls(false) < 1e-4) break;
    this.before.copy(this.feet);
  }

  /**
   * Checks the walker against a world just built (docs/design/spec.md, Walk mode: When the build moves). It stays where it is unless it is buried,
   * the model over it with nothing but the workspace ground under it, or embedded, the line from just over its feet to its head inside a piece
   * numbered `from` or later (the pieces added since it was last checked), a sheet having no inside (src/model/lib/sheet.ts). Then it moves, at rest,
   * to the lowest walkable surface over its feet where its body stands clear (`clearAt`), and on onto the rims of a groove there (`ontoRims`). One
   * that stays moves only where such pieces cross the lines under its sides within STEP over its feet (./footing.ts `builtUnder`) and it then
   * stands in a groove, as on a floor's slab when its tiles are laid round it on their joint. Returns 'lost' when no surface over it will do.
   */
  settle(from: number): Settled {
    const { feet } = this;
    const lines = this.world.crossings(feet.x, feet.z, this.floorY, Number.POSITIVE_INFINITY);
    const base = feet.y + STANDING;
    const heights = lines.flatMap((p) => p.heights);
    const buried = heights.length > 0 && heights.every((y) => y > base);
    const embedded = lines.some((p) => p.instance >= from && !p.sheet && insideBetween(p.heights, base, feet.y + BODY.height));
    if (!buried && !embedded) {
      if (!this.footing.builtUnder(feet.x, feet.z, base, feet.y + BODY.step + PROBE_EPSILON, from) || !this.ontoRims(feet.y, feet.y + BODY.step + PROBE_EPSILON, lines)) return 'kept';
    } else {
      const surfaces = lines.flatMap((p) => p.heights.filter((y, i) => y > base && (p.normalYs[i] ?? 0) >= MIN_WALKABLE_NORMAL_Y)).sort((a, b) => a - b);
      const y = surfaces.find((s) => this.clearAt(lines, s));
      if (y === undefined) return 'lost';
      feet.y = y;
      this.ontoRims(y, y + BODY.step + PROBE_EPSILON, lines);
    }
    this.rest(true);
    return 'moved';
  }

  /**
   * Lifts the feet out of a groove narrower than the body onto the lower rim of two opposite sides read from `top` down to `low` (./footing.ts `rims`):
   * the highest over the feet whose probes stand on top of what they meet, walkable, where the body stands clear by the centre's crossings (`clearAt`).
   */
  private ontoRims(low: number, top: number, lines?: readonly LineCrossings[]): boolean {
    const { feet, hit } = this;
    let centre = lines;
    const stands = (rim: GroundHit): boolean => rim.normalY >= MIN_WALKABLE_NORMAL_Y && this.clearAt((centre ??= this.world.crossings(feet.x, feet.z, this.floorY, Number.POSITIVE_INFINITY)), rim.y);
    if (!this.footing.rims(feet.x, feet.z, top, top - low, hit, feet.y + STANDING, stands)) return false;
    feet.y = hit.y;
    return true;
  }

  /** Stops the walker where its feet stand, on the ground or not: no velocity, slide, jump, carried time or ease, and the step before at the feet. */
  private rest(onGround: boolean): void {
    this.onGround = onGround;
    this.velocity.set(0, 0, 0);
    this.slide = null;
    this.jumpTimer = 0;
    this.accumulator = 0;
    this.ease = 0;
    this.easeBefore = 0;
    this.before.copy(this.feet);
  }

  /**
   * Whether the body stands clear with its feet at `y` over its place: no surface crosses its axis from STEP over its feet to its head, no piece's
   * inside (a sheet has none) reaches that axis from just over its feet to its head, and nothing overhead meets the raised capsule (`bumpsHead`).
   */
  private clearAt(lines: readonly LineCrossings[], y: number): boolean {
    const knee = y + BODY.step;
    const head = y + BODY.height;
    for (const p of lines) if (p.heights.some((h) => h > knee && h <= head) || (!p.sheet && insideBetween(p.heights, y + STANDING, head))) return false;
    return !this.bumpsHead(y);
  }

  /**
   * Writes the walker's whole state, WALKER_STATE_SIZE numbers from `offset`: feet, velocity, the feet before the last step, yaw, pitch, the time carried
   * to the next step, the eye's ease, the jump buffer, whether it stands on the ground and the slope it slides on. `restore` takes it up again exactly there.
   */
  save(out: Float64Array, offset = 0): void {
    const { feet, velocity, before, slide } = this;
    out.set([feet.x, feet.y, feet.z, velocity.x, velocity.y, velocity.z, before.x, before.y, before.z, this.yaw, this.pitch, this.accumulator], offset);
    out.set([this.ease, this.easeBefore, this.jumpTimer, this.onGround ? 1 : 0, slide === null ? 0 : 1, slide?.x ?? 0, slide?.y ?? 0, slide?.z ?? 0], offset + 12);
  }

  /** Puts the walker back exactly in a state `save` wrote: no probe, no placing and no push, as if it had walked on from there without a break. */
  restore(from: Float64Array, offset = 0): void {
    const at = (k: number): number => from[offset + k] ?? 0;
    this.feet.set(at(0), at(1), at(2));
    this.velocity.set(at(3), at(4), at(5));
    this.before.set(at(6), at(7), at(8));
    this.yaw = at(9);
    this.pitch = at(10);
    this.accumulator = at(11);
    this.ease = at(12);
    this.easeBefore = at(13);
    this.jumpTimer = at(14);
    this.onGround = at(15) === 1;
    this.slide = at(16) === 1 ? { x: at(17), y: at(18), z: at(19) } : null;
  }

  /** Turns by `yaw` and `pitch` radians; pitch stays within ±85°. */
  turn(yaw: number, pitch: number): void {
    this.yaw = MathUtils.euclideanModulo(this.yaw + yaw + Math.PI, 2 * Math.PI) - Math.PI;
    this.pitch = MathUtils.clamp(this.pitch + pitch, -MOTION.maxPitch, MOTION.maxPitch);
  }

  /** Asks for a jump: it fires at once on the ground, or on landing within 0.15 s. */
  jump(): void {
    this.jumpTimer = JUMP_BUFFER;
  }

  /** Advances by `seconds` of wall time (at most 0.25 s) in fixed steps, carrying the remainder. */
  update(seconds: number, input: WalkInput): void {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.25);
    let steps = 0;
    while (this.accumulator >= MOTION.fixedStep && steps < MAX_STEPS_PER_UPDATE) {
      this.fixedStep(input);
      this.accumulator -= MOTION.fixedStep;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_UPDATE) this.accumulator = 0;
  }

  /**
   * The eye: the eased eye of the last two fixed steps (the feet plus 1.6 m plus that step's ease), interpolated between them. Interpolating the
   * eased heights keeps the eye continuous; adding the newest ease to a height still partly interpolated dropped it by about (1 − α) × the riser
   * for one frame after each stair snap, 10 to 16 cm (work unit 2, M1; src/walk/stairs.test.ts).
   */
  eye(out = new Vector3()): Vector3 {
    const alpha = MathUtils.clamp(this.accumulator / MOTION.fixedStep, 0, 1);
    return out.lerpVectors(this.before, this.feet, alpha).setY(MathUtils.lerp(this.before.y + this.easeBefore, this.feet.y + this.ease, alpha) + BODY.eye);
  }

  /** The unit look direction. */
  look(out = new Vector3()): Vector3 {
    const c = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * c, Math.sin(this.pitch), -Math.cos(this.yaw) * c);
  }

  /** Pushes the body level out of what it stands in, as `place` does: after a door was put where it stands (./door-world.ts `release`). */
  standClear(): void {
    for (let k = 0; k < 4; k += 1) if (this.walls(false) < 1e-4) break;
    this.before.copy(this.feet);
  }

  private fixedStep(input: WalkInput): void {
    const dt = MOTION.fixedStep;
    const { feet, velocity } = this;
    // What moves in the world moves first, in the same steps as the body, so a door's swing meets the body alike at any frame rate.
    this.world.advance?.(dt, feet);
    this.before.copy(feet);
    this.easeBefore = this.ease;
    // What the keys ask for, in the plane, relative to where the body faces.
    let f = input.forward;
    let r = input.right;
    const length = Math.hypot(f, r);
    if (length > 1) {
      f /= length;
      r /= length;
    }
    const speed = input.run ? MOTION.run : MOTION.walk;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const k = 1 - Math.exp(-dt / (this.onGround ? MOTION.groundTau : MOTION.airTau));
    let wishX = (-sin * f + cos * r) * speed;
    let wishZ = (-cos * f - sin * r) * speed;
    const slide = this.slide;
    if (slide !== null) {
      // On a slope too steep to stand on the keys cannot push uphill; the level part of gravity along it pulls the body down.
      const level = Math.hypot(slide.x, slide.z);
      if (level > 1e-9) {
        const into = (wishX * slide.x + wishZ * slide.z) / level;
        if (into < 0) {
          wishX -= (slide.x / level) * into;
          wishZ -= (slide.z / level) * into;
        }
      }
    }
    velocity.x += (wishX - velocity.x) * k;
    velocity.z += (wishZ - velocity.z) * k;
    if (slide !== null) {
      velocity.x += MOTION.gravity * slide.y * slide.x * dt;
      velocity.z += MOTION.gravity * slide.y * slide.z * dt;
    }
    if (this.jumpTimer > 0) {
      this.jumpTimer = Math.max(0, this.jumpTimer - dt);
      if (this.onGround) {
        velocity.y = JUMP_SPEED;
        this.onGround = false;
        this.jumpTimer = 0;
      }
    }
    feet.x += velocity.x * dt;
    feet.z += velocity.z * dt;
    if (this.onGround || this.slide !== null) {
      this.walls(false);
      this.follow();
    } else {
      this.fall(dt);
      this.walls(true);
    }
    if (feet.y <= this.floorY) {
      feet.y = this.floorY;
      velocity.y = 0;
      this.onGround = true;
      this.slide = null;
    }
    this.ease *= Math.exp(-dt / EASE_TAU);
  }

  /** On the ground: follows the ground under the body's centre within STEP up or down, or starts to fall. */
  private follow(): void {
    const { feet, hit } = this;
    const top = feet.y + BODY.step + PROBE_EPSILON;
    if (!this.support(top, 2 * BODY.step + PROBE_EPSILON)) {
      this.onGround = false;
      this.slide = null;
      this.velocity.y = 0;
      return;
    }
    if (this.onGround && hit.normalY < MIN_WALKABLE_NORMAL_Y && hit.y > feet.y + 1e-3) {
      this.blockSlope();
      return;
    }
    const rise = hit.y - feet.y;
    if (rise > HEADROOM_SLOP && this.bumpsHead(hit.y)) {
      // The raised body would meet a ceiling, a soffit or a lintel: the step up is refused as a wall refuses a move.
      this.refuse();
      return;
    }
    feet.y = hit.y;
    this.velocity.y = 0;
    if (hit.normalY >= MIN_WALKABLE_NORMAL_Y) {
      this.slide = null;
      if (Math.abs(rise) > STAIR_SNAP) this.ease = MathUtils.clamp(this.ease - rise, -0.5, 0.5);
    } else {
      this.onGround = false;
      this.slide = { x: hit.normalX, z: hit.normalZ, y: hit.normalY };
    }
  }

  /**
   * A slope too steep to stand on rises under the body's centre: from the ground it is met like a wall. The uphill part of this step's move and
   * of the velocity goes, and where the body still stands over the slope it goes back to where it stood; its feet stay on the ground they were on.
   */
  private blockSlope(): void {
    const { feet, before, velocity, hit } = this;
    const level = Math.hypot(hit.normalX, hit.normalZ);
    if (level > 1e-9) {
      const nx = hit.normalX / level;
      const nz = hit.normalZ / level;
      const into = (feet.x - before.x) * nx + (feet.z - before.z) * nz;
      if (into < 0) {
        feet.x -= nx * into;
        feet.z -= nz * into;
      }
      const v = velocity.x * nx + velocity.z * nz;
      if (v < 0) {
        velocity.x -= nx * v;
        velocity.z -= nz * v;
      }
    }
    const top = feet.y + BODY.step + PROBE_EPSILON;
    if (!this.support(top, 2 * BODY.step + PROBE_EPSILON) || hit.normalY < MIN_WALKABLE_NORMAL_Y || (hit.y - feet.y > HEADROOM_SLOP && this.bumpsHead(hit.y))) {
      feet.x = before.x;
      feet.z = before.z;
      return;
    }
    feet.y = hit.y;
  }

  /** In the air: gravity, then lands on the first surface met this step, from STEP above the feet down to where they arrive. */
  private fall(dt: number): void {
    const { feet, velocity, hit } = this;
    velocity.y = Math.max(velocity.y - MOTION.gravity * dt, -MOTION.maxFall);
    const dy = velocity.y * dt;
    if (dy > 0) {
      feet.y += dy;
      return;
    }
    const top = feet.y + BODY.step + PROBE_EPSILON;
    if (this.support(top, BODY.step + PROBE_EPSILON - dy)) {
      if (hit.y - feet.y > HEADROOM_SLOP && this.bumpsHead(hit.y)) {
        // A ledge under a ceiling the raised body would meet: this step's level move is taken back and the fall goes on beside it.
        this.refuse();
        feet.y += dy;
        this.slide = null;
        return;
      }
      feet.y = hit.y;
      velocity.y = 0;
      if (hit.normalY >= MIN_WALKABLE_NORMAL_Y) {
        this.onGround = true;
        this.slide = null;
      } else {
        this.slide = { x: hit.normalX, z: hit.normalZ, y: hit.normalY };
      }
      return;
    }
    feet.y += dy;
    this.slide = null;
  }

  /** The ground under the body from `top` down `length`, into `hit` (./footing.ts `ground`), its sides read only where the centre finds none at the feet. */
  private support(top: number, length: number): boolean {
    return this.footing.ground(this.feet.x, this.feet.z, top, length, this.feet.y - 1e-3, this.hit);
  }

  /**
   * Whether the body, its feet raised to `y` where its centre stands, would meet something overhead: the floating capsule there is pushed down by
   * more than HEADROOM_SLOP. The level pushes of `walls` skip such contacts, so every rise of the feet (a step up, a landing on a ledge) asks this first.
   */
  private bumpsHead(y: number): boolean {
    const { feet, segment, push } = this;
    const r = BODY.radius;
    segment.start.set(feet.x, y + BODY.step + r, feet.z);
    segment.end.set(feet.x, y + BODY.height - r, feet.z);
    this.world.resolveCapsule(segment, r, false, push);
    return push.y < -HEADROOM_SLOP;
  }

  /** Takes back this step's level move: the body stands where it stood, its level velocity gone, as at a wall walked straight into. */
  private refuse(): void {
    this.feet.x = this.before.x;
    this.feet.z = this.before.z;
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  /** Pushes the floating capsule out of walls (level pushes unless `full`), removes the velocity into them; returns how far it moved. */
  private walls(full: boolean): number {
    const { feet, velocity, push, segment } = this;
    const r = BODY.radius;
    let moved = 0;
    for (let pass = 0; pass < 2; pass += 1) {
      segment.start.set(feet.x, feet.y + BODY.step + r, feet.z);
      segment.end.set(feet.x, feet.y + BODY.height - r, feet.z);
      this.world.resolveCapsule(segment, r, !full, push);
      const length = push.length();
      if (length < 1e-6) break;
      moved += length;
      feet.x += push.x;
      feet.z += push.z;
      if (full) feet.y += push.y;
      const level = Math.hypot(push.x, push.z);
      if (level > 1e-9) {
        const nx = push.x / level;
        const nz = push.z / level;
        const into = velocity.x * nx + velocity.z * nz;
        if (into < 0) {
          velocity.x -= nx * into;
          velocity.z -= nz * into;
        }
      }
      if (full && push.y < -1e-6 && velocity.y > 0) velocity.y = 0;
      if (length < 1e-3) break;
    }
    return moved;
  }
}
