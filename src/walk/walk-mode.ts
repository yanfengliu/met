/**
 * Walk mode on the page (docs/design/spec.md, Walk mode): the walker (./walker.ts) against the collision world (./collision.ts) of the steps complete
 * at the current t, looking through the page's camera.
 * Entering prepares the world on the next frame, after the status line has been drawn ("Preparing walk mode"), and puts the walker at the spawn
 * asked for, else where it last stood in this page, else at the default spawn. While walking, the world is rebuilt whenever the set of complete
 * steps changes, and after every build the walker's place is checked against it (src/walk/walker.ts, `settle`); the orbit controls are off.
 * Looking (work unit 14): entering by a mouse or the keyboard asks for pointer lock, and the locked mouse turns the walker as it moves, no button
 * held; where the browser gives no lock (no user gesture, as at load with `walk=1`), a click of the view asks again. A drag with an unlocked mouse, a
 * finger or a pen turns the view the way the pointer moves, as the locked mouse does. Losing the lock while walking leaves walk mode: the browser
 * frees the pointer on Esc and tells the page only that the lock went. Leaving puts the orbit camera at the walker's eye, its target 5 m ahead. The
 * status line's hint shows how to look, move and leave until the visitor first walks, at most `HINT_SECONDS`. Every walking frame, and afresh
 * whenever something reads it, the look target (./look.ts) is found along the eye's ray; `onLookTarget` is the one hook that hears it change, for
 * doors and labels alike. The doors that open collide where the door layer stands them, their swings moved on in the walker's own physics steps
 * (./door-world.ts), and after every check of the walker's place a door whose leaves a build left in the walker is put clear of it. The walk mode
 * reads the scene and never writes it.
 */
import { Vector3 } from 'three';

import type { BuiltStep } from '../build/timeline.js';
import type { Vec3 } from '../build/types.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import type { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes, completeSteps, instancesBefore } from './collision.js';
import type { CollisionStats } from './collision.js';
import { DoorWorld } from './door-world.js';
import type { MovingDoors } from './door-world.js';
import { lookTarget } from './look.js';
import type { HitFn, LookTarget } from './look.js';
import { DEFAULT_SPAWN, SPAWNS, nearestSpawn, spawnById, spawnYaw } from './spawns.js';
import type { Spawn } from './spawns.js';
import { Walker } from './walker.js';
import type { WalkInput } from './walker.js';

/** The vertical field of view in walk mode, degrees. */
export const WALK_FOV = 60;
/**
 * Radians the walker turns per pixel the mouse or a finger moves, locked or dragging: a drag across the view turns it by about the view's own width
 * (91.5° over 1280 px at 1280×720, 29.8° over 390 px at 390×844), precise enough to look round a gallery; 0.0022 turned 1.8 times that.
 */
export const LOOK_PER_PIXEL = 0.0013;
/**
 * A press that travels less than this many pixels before it is released is a click, which asks for pointer lock; more is a drag, which looks. A still
 * click travels 0 to 2 px, and under 5 px a drag would have turned the view by under 0.4°, which nobody means as a look.
 */
export const CLICK_SLOP = 5;
/**
 * Seconds the status line shows how to look, move and leave after walking starts, unless the visitor walks first. A look does not end it: entering
 * locks the pointer, and the mouse's first twitch would take the hint away before it is read.
 */
export const HINT_SECONDS = 6;
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
  /** The page's doors (src/viewer/doors.ts `DoorLayer`): their leaves collide where they stand, the swings moved on in the walker's steps; without them, none moves. */
  readonly doors?: MovingDoors;
}

/** Walk facts for `window.__met.walk` (src/viewer/facts.ts). */
export interface WalkFacts {
  readonly mode: 'orbit' | 'walk';
  readonly preparing: boolean;
  /** The spawn walk mode last placed the walker at, or `place` for a place of the query's own (./spawns.ts `placeOf`). */
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

/** Hears the look target, or null, when its kind or id changes (`WalkMode.onLookTarget`). */
export type LookTargetListener = (target: LookTarget | null) => void;

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
  private readonly doorWorld: DoorWorld;
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
  /** Set while a release of the lock the page asked for itself is on its way, so its `pointerlockchange` does not leave walk mode. */
  private releasing = false;
  /** Set when walk mode is entered while that release is on its way: the lock is asked for again once the release is told (review 0, F2). */
  private relock = false;
  /**
   * The last input anywhere on the page: a press's pointer type, or `keyboard` for a key. A finger's or a pen's tap that enters walk mode asks for no
   * lock; a key, F among them, asks, whatever pointer pressed last (review 0, F1).
   */
  private lastInput = 'mouse';
  private drag: { id: number; x: number; y: number; moved: number } | null = null;
  /** Seconds left of the status line's hint. */
  private hintLeft = 0;
  /** The look target the last walking frame found. */
  private seen: LookTarget | null = null;
  private readonly lookListeners = new Set<LookTargetListener>();
  /** The kind and id the listeners last heard (`kind:id`), or null. */
  private heard: string | null = null;
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
    this.doorWorld = new DoorWorld(this.world, host.doors ?? null, host.bvhs);
    this.walker = new Walker(this.doorWorld, host.floorY);
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

  /** Whether the status line shows how to look, move and leave (`HINT_SECONDS`). */
  get hint(): boolean {
    return this.on && !this.prepare && this.hintLeft > 0;
  }

  /** The look target the last walking frame found, or null; `target()` finds it afresh. */
  get lastTarget(): LookTarget | null {
    return this.on && !this.prepare ? this.seen : null;
  }

  /**
   * Calls `listener` with the look target, or null, each time its kind or id changes as walking frames find it; with null when walk mode is entered
   * again while a target was seen; and when walk mode is left, with the target as the view stands then, if it changed, and then with null, always. A
   * fresh read (`target()`) calls nothing, the next frame does. It hears changes from now on (`lastTarget` is the current one). Returns the call that
   * stops it.
   */
  onLookTarget(listener: LookTargetListener): () => void {
    this.lookListeners.add(listener);
    return () => {
      this.lookListeners.delete(listener);
    };
  }

  /**
   * Enters walk mode at the spawn `id` or the place given (a spawn of the query's own, src/walk/spawns.ts `placeOf`), or where the walker last stood, or at
   * the default spawn; an unknown id warns and is treated as none.
   */
  enter(id: string | Spawn | null = null): void {
    let spawn = id === null ? undefined : typeof id === 'string' ? spawnById(id) : id;
    if (typeof id === 'string' && spawn === undefined) {
      this.warn(`Walk spawn "${id}" names no spawn; use one of ${SPAWNS.map((s) => s.id).join(', ')}. The walk starts at ${this.placed ? 'the last place walked' : DEFAULT_SPAWN}.`);
    }
    if (spawn === undefined && !this.placed) spawn = spawnById(DEFAULT_SPAWN);
    this.pending = spawn ?? null;
    if (!this.on) this.orbitFov = this.host.rig.camera.fov;
    this.on = true;
    this.prepare = true;
    this.waited = 0;
    this.seen = null;
    this.tell(null);
    this.host.rig.setWalking(true);
    this.askLock();
  }

  /** Builds and places at once, without waiting a frame for the status line (capture mode). */
  prepareNow(t: number): void {
    if (this.on && this.prepare) this.build(t);
  }

  /**
   * Back to the orbit view, at the walker's eye looking where it looked. The listeners hear the target as the view stands now, if it changed since
   * the last frame (a locked mouse's move turns the view between frames), and then null, always, so a card kept on leaving is the artwork the orbit
   * view looks at (src/viewer/art-label.ts; review 0, F3).
   */
  exit(): void {
    if (!this.on) return;
    if (!this.prepare) this.tell(this.find());
    this.on = false;
    this.prepare = false;
    this.drag = null;
    this.hintLeft = 0;
    this.relock = false;
    this.seen = null;
    this.tell(null, true);
    this.freePointer();
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
    if (!this.on || this.prepare) return;
    this.walker.jump();
    this.hintLeft = 0;
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
    const input = walkInput(held);
    // The hint goes at the first step, or when its time is up.
    this.hintLeft = input.forward !== 0 || input.right !== 0 ? 0 : Math.max(0, this.hintLeft - seconds);
    this.walker.update(seconds, input);
    this.walker.eye(this.eye);
    this.walker.look(this.look);
    this.host.rig.setWalkView(this.eye, this.look, WALK_FOV);
    this.seen = this.find();
    this.tell(this.seen);
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

  /** The walk facts. Their `target` is found afresh, as an action finds it, but writes nothing: `lastTarget`, the last frame's, stands until the next frame. */
  facts(): WalkFacts {
    const walking = this.on && !this.prepare;
    const times = [...this.frameTimes].sort((a, b) => a - b);
    const target = walking ? this.find() : null;
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

  /** Tells the listeners `target` when its kind or id is not what they last heard, or `always`. */
  private tell(target: LookTarget | null, always = false): void {
    const key = target === null ? null : `${target.kind}:${target.id}`;
    if (key === this.heard && !always) return;
    this.heard = key;
    for (const listener of [...this.lookListeners]) listener(target);
  }

  /** The look target from the walker's eye along its look direction, as they stand now (`lookTarget`). */
  private find(): LookTarget | null {
    const hit = this.host.hit;
    if (hit === undefined) return null;
    return lookTarget(hit, this.walker.eye(this.targetEye), this.walker.look(this.targetLook));
  }

  private build(t: number): void {
    if (completeSteps(t, this.host.steps.length) !== this.builtFor || this.stats === null) this.rebuild(t);
    this.doorWorld.refresh();
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
    this.hintLeft = HINT_SECONDS;
    this.lastEye.set(Number.NaN, 0, 0);
  }

  private rebuild(t: number): void {
    this.stats = this.world.build(collisionMeshes(this.host.steps, t, this.host.doors?.leafMeshes));
    this.builtFor = completeSteps(t, this.host.steps.length);
    this.doorWorld.refresh();
  }

  /**
   * Checks the walker against the world just built (src/walk/walker.ts, `settle`): pieces of the steps completed after the first `known` can embed it, and
   * anything can bury it. With no surface over it to stand on, it goes to the nearest spawn. Then a door whose leaves stand in it is put clear of it,
   * and where no pose of the door is, the walker is pushed out of the leaf (./door-world.ts `release`).
   */
  private settle(known: number): void {
    const from = this.builtFor > known ? instancesBefore(this.host.steps, known, this.host.doors?.leafMeshes) : this.world.instances;
    if (this.walker.settle(from) === 'lost') {
      const { x, y, z } = this.walker.feet;
      this.placeAt(nearestSpawn(x, y, z));
      this.walker.settle(0);
    }
    if (this.doorWorld.release(this.walker.feet)) this.walker.standClear();
    this.settledFor = this.builtFor;
  }

  private placeAt(spawn: Spawn): void {
    const [x, y, z] = spawn.feet;
    this.walker.place(x, y, z, spawnYaw(spawn), (spawn.pitch * Math.PI) / 180);
    this.spawnId = spawn.id;
    this.placed = true;
  }

  /** Turns the walker by a pointer's movement of (dx, dy) pixels: the view turns the way the pointer moves, right for right and up for up. */
  private turnBy(dx: number, dy: number): void {
    this.walker.turn(-dx * LOOK_PER_PIXEL, -dy * LOOK_PER_PIXEL);
  }

  /** Whether `event` is the locked mouse's: the lock holds the mouse alone, so a finger or a pen still drags to look. */
  private lockedMouse(event: PointerEvent): boolean {
    return this.locked && event.pointerType === 'mouse';
  }

  /**
   * A drag starts on the view; its moves and its end are heard on the document, where they bubble from the canvas that captures the pointer, or, while
   * the document holds pointer lock, which no capture may be set under (Pointer Events 3), from wherever they land: a finger has its own implicit
   * capture, and a pen lifted off the view still ends its drag (review 0, F0). The locked mouse's moves come to the canvas.
   */
  private bindPointer(canvas: HTMLCanvasElement): void {
    document.addEventListener('pointerdown', (event) => { this.lastInput = event.pointerType; }, { capture: true, passive: true });
    document.addEventListener('keydown', () => { this.lastInput = 'keyboard'; }, { capture: true, passive: true });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      const lost = this.locked && !locked && !this.releasing;
      const told = this.releasing && !locked;
      this.locked = locked;
      this.releasing = false;
      // A lock that came once walk mode was left (F pressed again before the browser gave it): the orbit view keeps its pointer.
      if (locked && !this.on) this.freePointer();
      // Lost while walking: the browser frees the pointer on Esc and tells the page only that the lock went, so walk mode is left, as Esc leaves it.
      else if (lost && this.on) this.exit();
      // The page's own release told after walk mode was entered again: the lock that entry wanted is asked for now, the entry's gesture still fresh.
      else if (told && this.relock && this.on) this.requestLock(canvas);
      this.relock = false;
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.on || this.lockedMouse(event) || this.drag !== null) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
      if (document.pointerLockElement === null) canvas.setPointerCapture(event.pointerId);
    });
    document.addEventListener('pointermove', (event) => {
      if (!this.on || this.prepare) return;
      if (this.lockedMouse(event)) {
        this.turnBy(event.movementX, event.movementY);
        return;
      }
      const drag = this.drag;
      if (drag?.id !== event.pointerId) return;
      // While the document holds pointer lock the browser gives every pointer the lock's place, and its travel in movementX and movementY (Chrome 156).
      const frozen = document.pointerLockElement !== null;
      const dx = frozen ? event.movementX : event.clientX - drag.x;
      const dy = frozen ? event.movementY : event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      this.turnBy(dx, dy);
    });
    const release = (event: PointerEvent, cancelled: boolean): void => {
      const drag = this.drag;
      if (drag?.id !== event.pointerId) return;
      this.drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!cancelled && this.on && event.pointerType === 'mouse' && event.button === 0 && drag.moved < CLICK_SLOP) this.requestLock(canvas);
    };
    document.addEventListener('pointerup', (event) => { release(event, false); });
    document.addEventListener('pointercancel', (event) => { release(event, true); });
  }

  /**
   * On entering: asks for pointer lock where the browser can give it now, in a user's gesture (the F key, a click of the Walk toggle or a spawn) that
   * was not a finger's or a pen's tap. Without a gesture, as at load with `walk=1`, the browser would refuse, so the first click asks. While the page's
   * own release of the lock is on its way, it asks once that release is told (`relock`).
   */
  private askLock(): void {
    // A browser without the User Activation API (Safari before 16.4) is asked anyway; it refuses without a gesture.
    const activation = (navigator as { readonly userActivation?: UserActivation }).userActivation;
    if (this.lastInput === 'touch' || this.lastInput === 'pen' || activation?.isActive === false) return;
    if (this.releasing) this.relock = true;
    else if (!this.locked) this.requestLock(this.host.canvas);
  }

  /** Frees the pointer if the page holds it locked, so the `pointerlockchange` that tells it is the page's own and leaves nothing. */
  private freePointer(): void {
    if (document.pointerLockElement !== this.host.canvas) return;
    this.releasing = true;
    document.exitPointerLock();
  }

  /** Asks for pointer lock; where the browser refuses (an iframe without the permission, a request too soon after Esc), looking stays on drag. */
  private requestLock(canvas: HTMLCanvasElement): void {
    try {
      Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    } catch {
      // No pointer lock here: the drag still looks.
    }
  }
}
