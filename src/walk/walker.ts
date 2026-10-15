/**
 * The walker (docs/design/spec.md, Walk mode): a person-sized capsule moved by input, gravity and collision against a `WalkWorld`. Pure logic: no
 * DOM, no clock of its own (the caller passes seconds) and no scene writes.
 *
 * Model. The body is a capsule of radius 0.35 m and height 1.75 m standing on its feet; the eye is 1.6 m above them. Walls are met by a "floating"
 * capsule that starts STEP (0.35 m) above the feet, so anything lower than that is stepped onto rather than walked into: vertical probes from
 * STEP above the feet find the ground, and the feet snap to it when it lies within STEP above or below and is walkable (no steeper than 40°).
 * The ground is the surface under the body's centre or, over a gap or groove there, the lower rim of two opposite sides STRADDLE (0.3 m) out,
 * whichever is higher: a body bridges a gap narrower than itself, yet falls off an edge as soon as its centre passes it. A steeper surface is
 * stood on but slid down, with only air control. Off an edge higher than STEP the body falls under gravity and lands on the first surface below;
 * a jump starts at the speed that rises JUMP_HEIGHT. On the ground every push from the walls is level, and the velocity into a wall is removed,
 * so the body slides along it. Below everything lies the workspace ground, a plane at `floorY`.
 *
 * Time. Physics runs in fixed steps of 1/120 s, the remainder carried to the next frame, so a run is the same at any frame rate; the eye is
 * interpolated between the last two steps, and a snap up or down a stair is eased out over about 0.1 s for the eye only.
 * Bound: a step moves the body at most 6 m/s × 1/120 s = 5 cm sideways and 40 m/s × 1/120 s = 0.33 m down, less than the capsule's radius and
 * the probe's reach, so it cannot pass a wall or a floor; geometry thinner than that is crossed only by a capsule pushed out the far side.
 */
import { Line3, MathUtils, Vector3 } from 'three';

import type { GroundHit } from './collision.js';

/** What the walker collides with: ./collision.ts `CollisionWorld`, or any stand-in with the same two queries. */
export interface WalkWorld {
  resolveCapsule(segment: Line3, radius: number, horizontal: boolean, out: Vector3): Vector3;
  groundBelow(x: number, y: number, z: number, length: number, hit: GroundHit): boolean;
}

/** The body, in metres. */
export const BODY = Object.freeze({ radius: 0.35, height: 1.75, eye: 1.6, step: 0.35, maxSlopeDeg: 40 });

/** Motion, in metres and seconds. */
export const MOTION = Object.freeze({
  walk: 3,
  run: 6,
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
const MAX_STEPS_PER_UPDATE = 30;
/** How far out the side probes stand, metres: a gap narrower than twice this is bridged. */
export const STRADDLE = 0.3;
const DIAGONAL = STRADDLE * Math.SQRT1_2;
/** One of each pair of opposite side probes; the other is its negative. */
const SIDES: readonly (readonly [number, number])[] = [[STRADDLE, 0], [0, STRADDLE], [DIAGONAL, DIAGONAL], [DIAGONAL, -DIAGONAL]];

/** What the keys ask for: `forward` and `right` in [-1, 1] (back and left are negative), running, nothing else. */
export interface WalkInput {
  readonly forward: number;
  readonly right: number;
  readonly run: boolean;
}

export const NO_INPUT: WalkInput = Object.freeze({ forward: 0, right: 0, run: false });

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
  private ease = 0;
  private jumpTimer = 0;
  private slide: { x: number; z: number; y: number } | null = null;
  private readonly segment = new Line3();
  private readonly push = new Vector3();
  private readonly hit: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };
  private readonly sideA: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };
  private readonly sideB: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };

  constructor(
    private readonly world: WalkWorld,
    /** The workspace ground: the walker never goes below it. */
    private readonly floorY: number,
  ) {}

  /** Puts the feet on the first surface below (x, y + 1 m, z), or leaves them at y to fall, facing `yaw` and `pitch`, at rest. */
  place(x: number, y: number, z: number, yaw: number, pitch = 0): void {
    this.feet.set(x, Math.max(y, this.floorY), z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = MathUtils.clamp(pitch, -MOTION.maxPitch, MOTION.maxPitch);
    this.onGround = false;
    this.slide = null;
    this.jumpTimer = 0;
    this.accumulator = 0;
    this.ease = 0;
    if (this.world.groundBelow(x, y + 1, z, 1 + y - this.floorY, this.hit)) {
      this.feet.y = this.hit.y;
      this.onGround = this.hit.normalY >= MIN_WALKABLE_NORMAL_Y;
    }
    if (this.feet.y <= this.floorY) {
      this.feet.y = this.floorY;
      this.onGround = true;
    }
    for (let k = 0; k < 4; k += 1) if (this.walls(false) < 1e-4) break;
    this.before.copy(this.feet);
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

  /** The eye: interpolated between the last two fixed steps and eased out of stair snaps. */
  eye(out = new Vector3()): Vector3 {
    const alpha = MathUtils.clamp(this.accumulator / MOTION.fixedStep, 0, 1);
    return out.lerpVectors(this.before, this.feet, alpha).setY(MathUtils.lerp(this.before.y, this.feet.y, alpha) + BODY.eye + this.ease);
  }

  /** The unit look direction. */
  look(out = new Vector3()): Vector3 {
    const c = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * c, Math.sin(this.pitch), -Math.cos(this.yaw) * c);
  }

  private fixedStep(input: WalkInput): void {
    const dt = MOTION.fixedStep;
    const { feet, velocity } = this;
    this.before.copy(feet);
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
    velocity.x += ((-sin * f + cos * r) * speed - velocity.x) * k;
    velocity.z += ((-cos * f - sin * r) * speed - velocity.z) * k;
    if (this.slide !== null) {
      // Down a slope too steep to stand on: the level part of gravity along it.
      velocity.x += MOTION.gravity * this.slide.y * this.slide.x * dt;
      velocity.z += MOTION.gravity * this.slide.y * this.slide.z * dt;
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
    if (this.onGround) {
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
    const rise = hit.y - feet.y;
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

  /**
   * The ground under the body from height `top` down `length`, into `hit`: under the centre, or the lower rim of a pair of opposite side probes
   * where that is higher (a gap or groove under the centre). The side probes run only when the centre finds nothing at the feet's level or above.
   */
  private support(top: number, length: number): boolean {
    const { feet, hit, sideA, sideB } = this;
    let found = this.world.groundBelow(feet.x, top, feet.z, length, hit);
    if (found && hit.y >= feet.y - 1e-3) return true;
    for (const [dx, dz] of SIDES) {
      if (!this.world.groundBelow(feet.x + dx, top, feet.z + dz, length, sideA) || !this.world.groundBelow(feet.x - dx, top, feet.z - dz, length, sideB)) continue;
      const rim = sideA.y <= sideB.y ? sideA : sideB;
      if (!found || rim.y > hit.y) {
        Object.assign(hit, rim);
        found = true;
      }
    }
    return found;
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
