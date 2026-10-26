/**
 * The walker (docs/design/spec.md, Walk mode): a person-sized capsule moved by input, gravity and collision against a `WalkWorld`. Pure logic: no
 * DOM, no clock of its own (the caller passes seconds) and no scene writes.
 *
 * Model. The body is a capsule of radius 0.35 m and height 1.75 m standing on its feet; the eye is 1.6 m above them. Walls are met by a "floating"
 * capsule that starts STEP (0.35 m) above the feet, so anything lower than that is stepped onto rather than walked into: vertical probes from
 * STEP above the feet find the ground, and the feet snap to it when it lies within STEP above or below and is walkable (no steeper than 40°);
 * a rise is taken only where the raised capsule meets nothing overhead, else the move is refused as at a wall (a step under a low ceiling).
 * The ground is the surface under the body's centre or, over a gap or groove there, the lower rim of two opposite sides STRADDLE (0.3 m) out,
 * whichever is higher: a body bridges a gap narrower than itself, yet falls off an edge as soon as its centre passes it. A steeper surface is
 * met like a wall from the ground, and where the body lands on one it slides down it with only air control, the keys unable to push it uphill.
 * Off an edge higher than STEP the body falls under gravity and lands on the first surface below;
 * a jump starts at the speed that rises JUMP_HEIGHT. On the ground every push from the walls is level, and the velocity into a wall is removed,
 * so the body slides along it. Below everything lies the workspace ground, a plane at `floorY`, where a body stands when nothing is built under it.
 * After the world is built again, `settle` moves a body that new pieces bury or embed onto the lowest walkable surface over it where it stands clear.
 *
 * Time. Physics runs in fixed steps of 1/120 s, the remainder carried to the next frame, so a run is the same at any frame rate; a snap up or down a
 * stair is eased out over about 0.1 s for the eye only, and the eye is the eased eye of the last two steps, interpolated between them.
 * Bound: a step moves the body at most 5 m/s × 1/120 s = 4 cm sideways and 40 m/s × 1/120 s = 0.33 m down, less than the capsule's radius and
 * the probe's reach, so it cannot pass a wall or a floor; geometry thinner than that is crossed only by a capsule pushed out the far side.
 */
import { Line3, MathUtils, Vector3 } from 'three';

import type { GroundHit, LineCrossings } from './collision.js';

/** What the walker collides with: ./collision.ts `CollisionWorld`, or any stand-in with the same queries. */
export interface WalkWorld {
  resolveCapsule(segment: Line3, radius: number, horizontal: boolean, out: Vector3): Vector3;
  groundBelow(x: number, y: number, z: number, length: number, hit: GroundHit): boolean;
  crossings(x: number, z: number, bottom: number, top: number): readonly LineCrossings[];
}

/** What `settle` did: left the walker where it stood, moved it onto a surface over its feet, or found none (the caller places it elsewhere). */
export type Settled = 'kept' | 'moved' | 'lost';

/** A surface less than this above the feet is the one they stand on, metres. */
const STANDING = 1e-3;

/**
 * Whether a piece crossed at `heights` (lowest first) along a vertical line holds some of that line between `low` and `high` inside it: between its first
 * and second crossings, its third and fourth, and so on. A piece crossed an odd number of times is open along the line and has no inside there.
 */
export function insideBetween(heights: readonly number[], low: number, high: number): boolean {
  if (heights.length % 2 !== 0) return false;
  for (let i = 0; i + 1 < heights.length; i += 2) if ((heights[i] ?? 0) < high && (heights[i + 1] ?? 0) > low) return true;
  return false;
}

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
  /** The eye's offset from 1.6 m over the feet as it eases out of stair snaps: after the last fixed step, and after the one before it. */
  private ease = 0;
  private easeBefore = 0;
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

  /** Puts the feet on the first surface below (x, y + 1 m, z), or on the workspace ground where there is none, facing `yaw` and `pitch`, at rest. */
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
    this.easeBefore = 0;
    if (this.world.groundBelow(x, y + 1, z, 1 + y - this.floorY, this.hit)) {
      this.feet.y = this.hit.y;
      this.onGround = this.hit.normalY >= MIN_WALKABLE_NORMAL_Y;
    } else {
      // Nothing built under the place (t = 0, for one): the workspace ground, at once rather than after a fall to it.
      this.feet.y = this.floorY;
    }
    if (this.feet.y <= this.floorY) {
      this.feet.y = this.floorY;
      this.onGround = true;
    }
    for (let k = 0; k < 4; k += 1) if (this.walls(false) < 1e-4) break;
    this.before.copy(this.feet);
  }

  /**
   * Checks the walker against a world just built (docs/design/spec.md, Walk mode: When the build moves). It stays where it is unless it is buried,
   * the model over it with nothing but the workspace ground under it, or embedded, the line from just over its feet to its head inside a piece
   * numbered `from` or later (the pieces added since it was last checked). Then it moves, at rest, to the lowest walkable surface over its feet where
   * its body stands clear (`clearAt`). Returns 'lost' when no surface over it will do.
   */
  settle(from: number): Settled {
    const { feet } = this;
    const lines = this.world.crossings(feet.x, feet.z, this.floorY, Number.POSITIVE_INFINITY);
    const base = feet.y + STANDING;
    const heights = lines.flatMap((p) => p.heights);
    const buried = heights.length > 0 && heights.every((y) => y > base);
    const embedded = lines.some((p) => p.instance >= from && insideBetween(p.heights, base, feet.y + BODY.height));
    if (!buried && !embedded) return 'kept';
    const surfaces = lines.flatMap((p) => p.heights.filter((y, i) => y > base && (p.normalYs[i] ?? 0) >= MIN_WALKABLE_NORMAL_Y)).sort((a, b) => a - b);
    const y = surfaces.find((s) => this.clearAt(lines, s));
    if (y === undefined) return 'lost';
    feet.y = y;
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.slide = null;
    this.jumpTimer = 0;
    this.accumulator = 0;
    this.ease = 0;
    this.easeBefore = 0;
    this.before.copy(feet);
    return 'moved';
  }

  /**
   * Whether the body stands clear with its feet at `y` over its place: no surface crosses its axis from STEP over its feet to its head, no piece's
   * inside reaches that axis from just over its feet to its head, and nothing overhead meets the raised capsule (`bumpsHead`).
   */
  private clearAt(lines: readonly LineCrossings[], y: number): boolean {
    const knee = y + BODY.step;
    const head = y + BODY.height;
    for (const p of lines) if (p.heights.some((h) => h > knee && h <= head) || insideBetween(p.heights, y + STANDING, head)) return false;
    return !this.bumpsHead(y);
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

  private fixedStep(input: WalkInput): void {
    const dt = MOTION.fixedStep;
    const { feet, velocity } = this;
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
