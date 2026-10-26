/**
 * Walk mode on the page (docs/design/spec.md, Walk mode): the walker (./walker.ts) against the collision world (./collision.ts) of the steps complete
 * at the current t, looking through the page's camera.
 * Entering prepares the world on the next frame, after the status line has been drawn ("Preparing walk mode"), and puts the walker at the spawn
 * asked for, else where it last stood in this page, else at the default spawn. While walking, the world is rebuilt whenever the set of complete
 * steps changes, and after every build the walker's place is checked against it (src/walk/walker.ts, `settle`); the orbit controls are off. Looking: pointer lock on a click of the view (the movement of the mouse turns the walker), or a
 * drag with the mouse or a finger where the lock is not available. Leaving puts the orbit camera at the walker's eye, its target 5 m ahead.
 * Every walking frame, and afresh whenever something reads it, the look target (./look.ts) is found along the eye's ray.
 * The walk mode reads the scene and never writes it.
 */
import { Vector3 } from 'three';

import type { BuiltStep } from '../build/timeline.js';
import type { Vec3 } from '../build/types.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import type { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes, completeSteps, instancesBefore } from './collision.js';
import type { CollisionStats } from './collision.js';
import { lookTarget } from './look.js';
import type { HitFn, LookTarget } from './look.js';
import { DEFAULT_SPAWN, SPAWNS, nearestSpawn, spawnById, spawnYaw } from './spawns.js';
import type { Spawn } from './spawns.js';
import { Walker } from './walker.js';
import type { WalkInput } from './walker.js';

/** The vertical field of view in walk mode, degrees. */
export const WALK_FOV = 60;
/** Radians the walker turns per pixel the mouse or a finger moves. */
const LOOK_PER_PIXEL = 0.0022;
/** A press that moves less than this many pixels before it is released is a click, which asks for pointer lock. */
const CLICK_SLOP = 5;
/** Walking frames whose work times `frameMs` takes the median of. */
const FRAME_WINDOW = 120;

export interface WalkHost {
  readonly canvas: HTMLCanvasElement;
  readonly rig: CameraRig;
  readonly steps: readonly BuiltStep[];
  /** The workspace ground, below everything. */
  readonly floorY: number;
  readonly bvhs: GeometryBvhs;
  /** The page's hit query (src/viewer/pick.ts `ModelPicker.hit`), for the look target; without it the eye looks at nothing. */
  readonly hit?: HitFn;
}

/** Walk facts for `window.__met.walk` (src/viewer/facts.ts). */
export interface WalkFacts {
  readonly mode: 'orbit' | 'walk';
  readonly preparing: boolean;
  /** The spawn walk mode last placed the walker at. */
  readonly spawn: string | null;
  readonly spawns: readonly string[];
  /** In walk mode, the eye and the unit look direction; null in the orbit view. */
  readonly eye: Vec3 | null;
  readonly look: Vec3 | null;
  readonly onGround: boolean;
  readonly pointerLocked: boolean;
  /** Milliseconds of the last collision build (BVHs of geometries met for the first time included), or null before the first. */
  readonly bvhMs: number | null;
  /** What the last build holds: the complete steps it was built for, their solid instances and triangles. */
  readonly collision: { readonly steps: number; readonly instances: number; readonly triangles: number } | null;
  /** Median milliseconds of the page's work per walking frame over the last 120 (physics, the look target, camera and the render call), or null. */
  readonly frameMs: number | null;
  /** The look target as the view stands when it is read: the tagged piece's kind and id and its distance from the eye in metres, or null. */
  readonly target: { readonly kind: LookTarget['kind']; readonly id: string; readonly distance: number } | null;
}

const keyAxis = (held: ReadonlySet<string>, plus: readonly string[], minus: readonly string[]): number => (plus.some((k) => held.has(k)) ? 1 : 0) - (minus.some((k) => held.has(k)) ? 1 : 0);

/** What the held keys ask the walker for (src/ui/keyboard.ts). */
export function walkInput(held: ReadonlySet<string>): WalkInput {
  return {
    forward: keyAxis(held, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
    right: keyAxis(held, ['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
    run: held.has('ShiftLeft') || held.has('ShiftRight'),
  };
}

export class WalkMode {
  private readonly world: CollisionWorld;
  private readonly walker: Walker;
  private on = false;
  private prepare = false;
  /** Frames waited since entering, so the status line is drawn before the build. */
  private waited = 0;
  private pending: Spawn | null = null;
  private placed = false;
  private builtFor = -1;
  /** The complete steps the walker's place was last checked against (`settle`): pieces of later steps are new to it. */
  private settledFor = 0;
  private stats: CollisionStats | null = null;
  private spawnId: string | null = null;
  private orbitFov = 45;
  private locked = false;
  private drag: { id: number; x: number; y: number; moved: number } | null = null;
  /** The look target the last walking frame found. */
  private seen: LookTarget | null = null;
  private readonly eye = new Vector3();
  private readonly look = new Vector3();
  private readonly targetEye = new Vector3();
  private readonly targetLook = new Vector3();
  private readonly lastEye = new Vector3(Number.NaN, 0, 0);
  private readonly lastLook = new Vector3();
  private readonly frameTimes: number[] = [];

  constructor(
    private readonly host: WalkHost,
    private readonly warn: (message: string) => void,
  ) {
    this.world = new CollisionWorld(host.bvhs);
    this.walker = new Walker(this.world, host.floorY);
    this.bindPointer(host.canvas);
  }

  get active(): boolean {
    return this.on;
  }

  get preparing(): boolean {
    return this.on && this.prepare;
  }

  get pointerLocked(): boolean {
    return this.locked;
  }

  /** The look target the last walking frame found, or null; `target()` finds it afresh. */
  get lastTarget(): LookTarget | null {
    return this.on && !this.prepare ? this.seen : null;
  }

  /** Enters walk mode at the spawn `id`, or where the walker last stood, or at the default spawn; an unknown id warns and is treated as none. */
  enter(id: string | null = null): void {
    let spawn = id === null ? undefined : spawnById(id);
    if (id !== null && spawn === undefined) {
      this.warn(`Walk spawn "${id}" names no spawn; use one of ${SPAWNS.map((s) => s.id).join(', ')}. The walk starts at ${this.placed ? 'the last place walked' : DEFAULT_SPAWN}.`);
    }
    if (spawn === undefined && !this.placed) spawn = spawnById(DEFAULT_SPAWN);
    this.pending = spawn ?? null;
    if (!this.on) this.orbitFov = this.host.rig.camera.fov;
    this.on = true;
    this.prepare = true;
    this.waited = 0;
    this.seen = null;
    this.host.rig.setWalking(true);
  }

  /** Builds and places at once, without waiting a frame for the status line (capture mode). */
  prepareNow(t: number): void {
    if (this.on && this.prepare) this.build(t);
  }

  /** Back to the orbit view, at the walker's eye looking where it looked. */
  exit(): void {
    if (!this.on) return;
    this.on = false;
    this.prepare = false;
    this.drag = null;
    this.seen = null;
    if (document.pointerLockElement === this.host.canvas) document.exitPointerLock();
    const rig = this.host.rig;
    rig.setWalking(false);
    if (this.placed) {
      this.walker.eye(this.eye);
      this.walker.look(this.look);
      rig.setPose({ position: this.eye.clone(), target: this.eye.clone().addScaledVector(this.look, 5), fov: this.orbitFov });
    } else if (rig.camera.fov !== this.orbitFov) {
      rig.setPose({ ...rig.pose(), fov: this.orbitFov });
    }
  }

  /** Asks the walker to jump (Space). */
  jump(): void {
    if (this.on && !this.prepare) this.walker.jump();
  }

  /**
   * One frame of `seconds` at timeline position `t` with the physical keys `held`: prepares, rebuilds the world when the complete steps changed,
   * moves the walker, poses the camera and finds the look target. Returns whether the view changed.
   */
  frame(seconds: number, t: number, held: ReadonlySet<string>): boolean {
    if (!this.on) return false;
    if (this.prepare) {
      if (this.waited === 0) {
        this.waited = 1;
        return true;
      }
      this.build(t);
    } else if (completeSteps(t, this.host.steps.length) !== this.builtFor) {
      this.rebuild(t);
      this.settle(this.settledFor);
    }
    this.walker.update(seconds, walkInput(held));
    this.walker.eye(this.eye);
    this.walker.look(this.look);
    this.host.rig.setWalkView(this.eye, this.look, WALK_FOV);
    this.seen = this.find();
    const changed = !(this.eye.distanceToSquared(this.lastEye) < 1e-10 && this.look.distanceToSquared(this.lastLook) < 1e-12);
    this.lastEye.copy(this.eye);
    this.lastLook.copy(this.look);
    return changed;
  }

  /** The look target as the view stands now, found afresh: what an action reads, so a turn since the last frame counts. Null outside walking. */
  target(): LookTarget | null {
    if (!this.on || this.prepare) return null;
    this.seen = this.find();
    return this.seen;
  }

  /** Records the milliseconds one walking frame's work took, for `frameMs`. */
  noteFrame(ms: number): void {
    if (!this.on || this.prepare) return;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > FRAME_WINDOW) this.frameTimes.shift();
  }

  facts(): WalkFacts {
    const walking = this.on && !this.prepare;
    const times = [...this.frameTimes].sort((a, b) => a - b);
    const target = this.target();
    return {
      mode: this.on ? 'walk' : 'orbit',
      preparing: this.preparing,
      spawn: this.spawnId,
      spawns: SPAWNS.map((s) => s.id),
      eye: walking ? [this.eye.x, this.eye.y, this.eye.z] : null,
      look: walking ? [this.look.x, this.look.y, this.look.z] : null,
      onGround: walking && this.walker.onGround,
      pointerLocked: this.locked,
      bvhMs: this.stats?.ms ?? null,
      collision: this.stats === null ? null : { steps: this.builtFor, instances: this.stats.instances, triangles: this.stats.triangles },
      frameMs: times.length === 0 ? null : (times[Math.floor(times.length / 2)] ?? null),
      target: target === null ? null : { kind: target.kind, id: target.id, distance: target.distance },
    };
  }

  /** The look target from the walker's eye along its look direction, as they stand now (`lookTarget`). */
  private find(): LookTarget | null {
    const hit = this.host.hit;
    if (hit === undefined) return null;
    return lookTarget(hit, this.walker.eye(this.targetEye), this.walker.look(this.targetLook));
  }

  private build(t: number): void {
    if (completeSteps(t, this.host.steps.length) !== this.builtFor || this.stats === null) this.rebuild(t);
    const spawn = this.pending;
    if (spawn !== null) {
      this.placeAt(spawn);
      this.pending = null;
      // A new place: every piece is new to it.
      this.settle(0);
    } else {
      // Where it last stood, against what the build added since.
      this.settle(this.settledFor);
    }
    this.prepare = false;
    this.lastEye.set(Number.NaN, 0, 0);
  }

  private rebuild(t: number): void {
    this.stats = this.world.build(collisionMeshes(this.host.steps, t));
    this.builtFor = completeSteps(t, this.host.steps.length);
  }

  /**
   * Checks the walker against the world just built (src/walk/walker.ts, `settle`): pieces of the steps completed after the first `known` can embed it, and
   * anything can bury it. With no surface over it to stand on, it goes to the nearest spawn.
   */
  private settle(known: number): void {
    const from = this.builtFor > known ? instancesBefore(this.host.steps, known) : this.world.instances;
    if (this.walker.settle(from) === 'lost') {
      const { x, y, z } = this.walker.feet;
      this.placeAt(nearestSpawn(x, y, z));
      this.walker.settle(0);
    }
    this.settledFor = this.builtFor;
  }

  private placeAt(spawn: Spawn): void {
    const [x, y, z] = spawn.feet;
    this.walker.place(x, y, z, spawnYaw(spawn), (spawn.pitch * Math.PI) / 180);
    this.spawnId = spawn.id;
    this.placed = true;
  }

  private bindPointer(canvas: HTMLCanvasElement): void {
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.on || this.locked || this.drag !== null) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.on || this.prepare) return;
      if (this.locked) {
        this.walker.turn(-event.movementX * LOOK_PER_PIXEL, -event.movementY * LOOK_PER_PIXEL);
        return;
      }
      const drag = this.drag;
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      this.walker.turn(-dx * LOOK_PER_PIXEL, -dy * LOOK_PER_PIXEL);
    });
    const release = (event: PointerEvent, cancelled: boolean): void => {
      const drag = this.drag;
      if (drag?.id !== event.pointerId) return;
      this.drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!cancelled && this.on && event.pointerType === 'mouse' && event.button === 0 && drag.moved < CLICK_SLOP) this.requestLock(canvas);
    };
    canvas.addEventListener('pointerup', (event) => { release(event, false); });
    canvas.addEventListener('pointercancel', (event) => { release(event, true); });
  }

  /** Asks for pointer lock; where the browser refuses (headless, some trackpads, an iframe), looking stays on drag. */
  private requestLock(canvas: HTMLCanvasElement): void {
    try {
      Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    } catch {
      // No pointer lock here: the drag still looks.
    }
  }
}
