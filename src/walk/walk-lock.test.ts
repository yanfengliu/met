/**
 * Pointer lock in walk mode (src/walk/walk-mode.ts; docs/design/spec.md, Walk mode: Looking; work unit 14), on walk mode over a stand-in page: a
 * document whose pointer lock the test gives and takes as a browser does, firing `pointerlockchange`, a canvas that counts the requests for it and,
 * as the browser does, refuses pointer capture while the document holds a lock, the User Activation API's flag, and a camera rig as far as walk mode
 * drives one. Events go as the browser sends them: a press to the document's capture listeners and then the canvas, a move or a release bubbling to
 * the document, a key to the document; while the document holds a lock, every pointer at the lock's place, its travel in movementX and movementY, as
 * Chrome 156 reports a finger's moves under a locked mouse (a probe of CDP touch events, 2026-10-29).
 * - Entering in a user's gesture by a mouse or the keyboard asks for the lock once; without a gesture (as at load with `walk=1`), or after a finger's
 *   or a pen's press, it asks for none; a key after a finger's press asks (review 0, F1), but not a held key's repeat (review 1, F15).
 * - The locked mouse turns the view by its movement, `LOOK_PER_PIXEL` a pixel, right for right and up for up, with no button held; a finger still
 *   drags to look while the mouse is locked, by its movement, setting no capture, and its drag ends wherever it lifts (review 0, F0); a drag the lock
 *   leaves mid-way picks up from where the finger is, with no jump (review 1, F14).
 * - The lock lost while walking leaves walk mode, the orbit camera at the eye, as the browser's Esc does; the page's own release when walk mode is left
 *   leaves nothing more, and walk mode entered again before that release is told asks for the lock once it is (review 0, F2); a lock that comes once
 *   walk mode was left is freed.
 * - Leaving tells the look target as the view stands then, so a card kept on leaving is the artwork in view after a turn since the last frame, not
 *   the one before it (review 0, F3).
 * - The status line's hint stays through a look and goes at the first step.
 * Bound: the browser's own handling (Esc freeing the lock, its refusals, the movement it reports) is the stand-in's; tests/e2e/mouse-look.spec.ts drives
 * the real lock in the system Chrome.
 */
import { BoxGeometry, InstancedMesh, Layers, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PieceTag } from '../build/types.js';
import { ArtLabel } from '../viewer/art-label.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import type { PickHit } from '../viewer/pick.js';
import type { CameraPose } from '../viewer/presets.js';
import { GeometryBvhs } from './bvh-cache.js';
import { LOOK_PER_PIXEL, WalkMode } from './walk-mode.js';

/** A document as far as walk mode reads one: its pointer-lock element, which `lock` and `unlock` change as the browser does, telling its listeners. */
class Doc extends EventTarget {
  pointerLockElement: unknown = null;
  /** Releases asked for by the page and not yet told (`exitPointerLock`). */
  pending = 0;
  exitPointerLock(): void {
    this.pending += 1;
  }
  lock(element: unknown): void {
    this.pointerLockElement = element;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
  unlock(): void {
    this.pointerLockElement = null;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
  /** Tells the releases the page asked for, as the browser does once it has freed the pointer. */
  release(): void {
    if (this.pending === 0) return;
    this.pending = 0;
    this.unlock();
  }
}

/** A canvas as far as walk mode reads one: pointer events, capture (refused under a lock, Pointer Events 3), and the requests for pointer lock. */
class Canvas extends EventTarget {
  requests = 0;
  /** Captures asked for while the document held a lock, each refused with the browser's InvalidStateError. */
  refusals = 0;
  constructor(private readonly doc: Doc) {
    super();
  }
  requestPointerLock(): Promise<void> {
    this.requests += 1;
    return Promise.resolve();
  }
  setPointerCapture(): void {
    if (this.doc.pointerLockElement === null) return;
    this.refusals += 1;
    throw new DOMException('Cannot capture a pointer while the document holds pointer lock.', 'InvalidStateError');
  }
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

/** A pointer event with the fields walk mode reads. */
const pointer = (type: string, init: Record<string, number | string>): Event => Object.assign(new Event(type), { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, movementX: 0, movementY: 0, ...init });

/** A camera rig as far as walk mode drives one, keeping the poses it was set to. */
function rig(poses: CameraPose[]): CameraRig {
  const camera = new PerspectiveCamera(45);
  return {
    camera,
    setWalking: () => undefined,
    setWalkView: () => undefined,
    setPose: (pose: CameraPose) => { poses.push(pose); },
    pose: () => ({ position: camera.position.clone(), target: camera.position.clone(), fov: camera.fov }),
  } as unknown as CameraRig;
}

const yawOf = (look: readonly number[]): number => Math.atan2(-(look[0] ?? 0), -(look[2] ?? 0));
const mesh = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 1);
const hitOf = (tag: PieceTag, distance: number): PickHit => ({ mesh, instance: 0, distance, tag });

describe('pointer lock in walk mode', () => {
  let doc: Doc;
  let canvas: Canvas;
  const activation = { isActive: true };
  const poses: CameraPose[] = [];
  /** What the eye's ray meets, scripted. */
  let meets: PickHit | null = null;
  let walk: WalkMode;
  /** Two frames: the one that shows "Preparing walk mode", then the build and the first walking frame. */
  const ready = (held: ReadonlySet<string> = new Set()): void => {
    walk.frame(1 / 60, 0, held);
    walk.frame(1 / 60, 0, held);
  };
  /** A press: the document's capture listeners hear it first, then the canvas it lands on. */
  const press = (init: Record<string, number | string>): void => {
    doc.dispatchEvent(pointer('pointerdown', init));
    canvas.dispatchEvent(pointer('pointerdown', init));
  };
  /** A move or a release, as it bubbles to the document from wherever it lands. */
  const bubble = (type: string, init: Record<string, number | string>): void => {
    doc.dispatchEvent(pointer(type, init));
  };

  beforeEach(() => {
    doc = new Doc();
    canvas = new Canvas(doc);
    activation.isActive = true;
    poses.length = 0;
    meets = null;
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { userActivation: activation });
    walk = new WalkMode({ canvas: canvas as unknown as HTMLCanvasElement, rig: rig(poses), steps: [], floorY: -5, bvhs: new GeometryBvhs(), hit: () => meets }, () => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the lock on entering in a gesture by a mouse or the keyboard, and not without one or after a finger’s or a pen’s press', () => {
    walk.enter('plaza');
    expect(canvas.requests, 'entered in a gesture, the last press a mouse’s (none yet: the keyboard)').toBe(1);
    walk.exit();
    activation.isActive = false;
    walk.enter('plaza');
    expect(canvas.requests, 'entered with no gesture, as at load with walk=1').toBe(1);
    walk.exit();
    activation.isActive = true;
    for (const kind of ['touch', 'pen']) {
      doc.dispatchEvent(pointer('pointerdown', { pointerType: kind }));
      walk.enter('plaza');
      expect(canvas.requests, `entered after a ${kind} press`).toBe(1);
      walk.exit();
    }
    doc.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse' }));
    walk.enter('plaza');
    expect(canvas.requests, 'entered after a mouse press').toBe(2);
    walk.exit();
    // A key after a finger's press, F on a touch screen's keyboard: the key is the gesture, and it asks (review 0, F1).
    doc.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    doc.dispatchEvent(new Event('keydown'));
    walk.enter('plaza');
    expect(canvas.requests, 'entered by a key after a finger’s press').toBe(3);
    walk.exit();
    // A held key's repeat between a finger's press and its tap's click is no key's gesture (F15).
    doc.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    doc.dispatchEvent(Object.assign(new Event('keydown'), { repeat: true }));
    walk.enter('plaza');
    expect(canvas.requests, 'entered by a tap with a key held').toBe(3);
  });

  it('picks a drag up from where the finger is when the lock goes mid-way, with no jump', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    // Left and entered again before the page's own release is told (F2's window): a finger pressed then drags under the lock, by its movement.
    walk.exit();
    walk.enter();
    ready();
    const look = (): readonly number[] => walk.facts().look ?? [Number.NaN, 0, 0];
    const start = look();
    press({ pointerId: 5, pointerType: 'touch', clientX: 300, clientY: 300 });
    bubble('pointermove', { pointerId: 5, pointerType: 'touch', clientX: 300, clientY: 300, movementX: 30, movementY: 0 });
    doc.release();
    // The lock gone, the browser gives the finger's real place again, 200 px from the lock's: the first move there turns nothing, the next its travel (F14).
    bubble('pointermove', { pointerId: 5, pointerType: 'touch', clientX: 100, clientY: 300, movementX: 0, movementY: 0 });
    bubble('pointermove', { pointerId: 5, pointerType: 'touch', clientX: 120, clientY: 300, movementX: 20, movementY: 0 });
    ready();
    expect(yawOf(look()) - yawOf(start), '30 px under the lock and 20 px after it').toBeCloseTo(-50 * LOOK_PER_PIXEL, 9);
  });

  it('turns the view by the locked mouse’s movement with no button held, right for right and up for up; a finger still drags, capturing nothing', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    expect(walk.facts().pointerLocked).toBe(true);
    const look = (): readonly number[] => walk.facts().look ?? [Number.NaN, 0, 0];
    const start = look();
    bubble('pointermove', { movementX: 100, movementY: 0, buttons: 0 });
    ready();
    const right = look();
    expect(yawOf(right) - yawOf(start), '100 px to the right turns right by 100 × LOOK_PER_PIXEL').toBeCloseTo(-100 * LOOK_PER_PIXEL, 9);
    bubble('pointermove', { movementX: 0, movementY: -50 });
    ready();
    expect(Math.asin(look()[1] ?? 0) - Math.asin(right[1] ?? 0), '50 px up looks up by 50 × LOOK_PER_PIXEL').toBeCloseTo(50 * LOOK_PER_PIXEL, 9);
    // A press of the locked mouse is no drag: its movement turns the view once, as any movement does.
    const before = look();
    press({ pointerId: 1 });
    bubble('pointermove', { pointerId: 1, movementX: 40, clientX: 0 });
    bubble('pointerup', { pointerId: 1 });
    ready();
    expect(yawOf(look()) - yawOf(before), 'the locked mouse pressed and moved 40 px').toBeCloseTo(-40 * LOOK_PER_PIXEL, 9);
    // A finger's drag while the mouse is locked turns the view by its travel, which the browser gives in movementX, the finger's place frozen at the
    // lock's, and asks no capture, which the browser refuses under a lock (F0).
    const touched = look();
    press({ pointerId: 7, pointerType: 'touch', clientX: 300, clientY: 300 });
    expect(canvas.refusals, 'captures asked for under the lock, which the browser refuses with an InvalidStateError').toBe(0);
    bubble('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 300, clientY: 300, movementX: 60, movementY: 0 });
    bubble('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 300, clientY: 300 });
    ready();
    expect(yawOf(look()) - yawOf(touched), 'a finger dragged 60 px to the right while the mouse is locked').toBeCloseTo(-60 * LOOK_PER_PIXEL, 9);
    // A pen's drag lifted off the view ends there: the next press drags again.
    press({ pointerId: 8, pointerType: 'pen', clientX: 300, clientY: 300 });
    bubble('pointerup', { pointerId: 8, pointerType: 'pen', clientX: 300, clientY: 300 });
    const lifted = look();
    press({ pointerId: 9, pointerType: 'pen', clientX: 300, clientY: 300 });
    bubble('pointermove', { pointerId: 9, pointerType: 'pen', clientX: 300, clientY: 300, movementX: 20, movementY: 0 });
    ready();
    expect(yawOf(look()) - yawOf(lifted), 'the next pen drag, 20 px').toBeCloseTo(-20 * LOOK_PER_PIXEL, 9);
  });

  it('leaves walk mode at the eye when the lock is lost while walking, as the browser’s Esc loses it', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    const eye = walk.facts().eye ?? [Number.NaN, 0, 0];
    doc.unlock();
    expect(walk.active, 'walk mode after the lock was lost').toBe(false);
    expect(poses.at(-1)?.position.toArray(), 'the orbit camera at the eye').toEqual(eye);
    expect(poses.at(-1)?.target.distanceTo(new Vector3(...eye)), 'its target 5 m ahead').toBeCloseTo(5, 9);
  });

  it('leaves nothing more on its own release; entered again before that release is told, asks for the lock once it is; frees a lock that comes once walk mode was left', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    expect(canvas.requests, 'the lock asked for on entering').toBe(1);
    walk.exit();
    expect(doc.pending, 'leaving frees the pointer').toBe(1);
    walk.enter();
    expect(canvas.requests, 'entered again, the release not yet told: no request yet').toBe(1);
    doc.release();
    expect(walk.active, 'the release told: still walking').toBe(true);
    expect(canvas.requests, 'and the lock asked for again (F2)').toBe(2);
    walk.exit();
    expect(doc.pending, 'nothing to free when it is not locked').toBe(0);
    // Left again before the release is told: no request once it is.
    walk.enter();
    doc.lock(canvas);
    walk.exit();
    walk.enter();
    walk.exit();
    const asked = canvas.requests;
    doc.release();
    expect(canvas.requests, 'left before the release was told: no request').toBe(asked);
    // The lock asked for on entering comes after walk mode was left (F pressed twice): it is freed at once, and the orbit view goes on.
    walk.enter();
    walk.exit();
    doc.lock(canvas);
    expect(doc.pending, 'a late lock freed').toBe(1);
    doc.release();
    expect([walk.active, walk.facts().pointerLocked], 'the orbit view, the pointer free').toEqual([false, false]);
  });

  it('tells, on leaving, the look target as the view stands then, so the card kept is the artwork in view after a turn since the last frame', () => {
    const label = new ArtLabel();
    walk.onLookTarget((target) => { label.look(target); });
    const view = { cut: { enabled: false, height: 0 }, layers: new Layers() };
    /** Walking, the last frame looking at artwork 11013; then the view turns by a locked move between frames and walk mode is left at once. */
    const leaveAfterTurn = (turnedTo: PickHit | null): string | null => {
      meets = hitOf({ kind: 'artwork', id: '11013' }, 3);
      walk.enter('plaza');
      ready();
      label.frame(true, view);
      expect(label.id, 'the card of the artwork in view').toBe('11013');
      meets = turnedTo;
      walk.exit();
      label.frame(false, view);
      return label.id;
    };
    expect(leaveAfterTurn(null), 'turned to nothing, then left: no card kept (F3)').toBeNull();
    expect(leaveAfterTurn(hitOf({ kind: 'artwork', id: '437788' }, 4)), 'turned to another artwork, then left: its card').toBe('437788');
    expect(leaveAfterTurn(hitOf({ kind: 'door', id: 'weston' }, 1.5)), 'turned to a door: no card').toBeNull();
    expect(leaveAfterTurn(hitOf({ kind: 'artwork', id: '11013' }, 3)), 'still looking at it: its card').toBe('11013');
  });

  it('keeps the status line’s hint through a look and drops it at the first step', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    expect(walk.hint, 'the hint once walking, the pointer locked').toBe(true);
    bubble('pointermove', { movementX: 30, movementY: 10 });
    ready();
    expect(walk.hint, 'after a look').toBe(true);
    walk.frame(1 / 60, 0, new Set(['KeyW']));
    expect(walk.hint, 'after the first step').toBe(false);
  });
});
