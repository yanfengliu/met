/**
 * Pointer lock in walk mode (src/walk/walk-mode.ts; docs/design/spec.md, Walk mode: Looking; work unit 14), on walk mode over a stand-in page: a
 * document whose pointer lock the test gives and takes as a browser does, firing `pointerlockchange`, a canvas that counts the requests for it, the
 * User Activation API's flag, and a camera rig as far as walk mode drives one.
 * - Entering in a user's gesture by a mouse or the keyboard asks for the lock once; without a gesture (as at load with `walk=1`), or after a finger's
 *   or a pen's press, it asks for none.
 * - The locked mouse turns the view by its movement, `LOOK_PER_PIXEL` a pixel, right for right and up for up, with no button held; a finger still
 *   drags to look while the mouse is locked.
 * - The lock lost while walking leaves walk mode, the orbit camera at the eye, as the browser's Esc does; the page's own release when walk mode is left
 *   leaves nothing more, even when walk mode is entered again before the release is told; a lock that comes once walk mode was left is freed.
 * - The status line's hint stays through a look and goes at the first step.
 * Bound: the browser's own handling (Esc freeing the lock, its refusals, the movement it reports) is the stand-in's; tests/e2e/walk.spec.ts drives the
 * real lock in the system Chrome.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CameraRig } from '../viewer/camera-rig.js';
import type { CameraPose } from '../viewer/presets.js';
import { GeometryBvhs } from './bvh-cache.js';
import { LOOK_PER_PIXEL, WalkMode } from './walk-mode.js';

/** A canvas as far as walk mode reads one: pointer events, capture, and the requests for pointer lock it is asked. */
class Canvas extends EventTarget {
  requests = 0;
  requestPointerLock(): Promise<void> {
    this.requests += 1;
    return Promise.resolve();
  }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

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

describe('pointer lock in walk mode', () => {
  let doc: Doc;
  let canvas: Canvas;
  const activation = { isActive: true };
  const poses: CameraPose[] = [];
  let walk: WalkMode;
  /** Two frames: the one that shows "Preparing walk mode", then the build and the first walking frame. */
  const ready = (held: ReadonlySet<string> = new Set()): void => {
    walk.frame(1 / 60, 0, held);
    walk.frame(1 / 60, 0, held);
  };

  beforeEach(() => {
    doc = new Doc();
    canvas = new Canvas();
    activation.isActive = true;
    poses.length = 0;
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { userActivation: activation });
    walk = new WalkMode({ canvas: canvas as unknown as HTMLCanvasElement, rig: rig(poses), steps: [], floorY: -5, bvhs: new GeometryBvhs() }, () => undefined);
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
  });

  it('turns the view by the locked mouse’s movement with no button held, right for right and up for up; a finger still drags', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    expect(walk.facts().pointerLocked).toBe(true);
    const look = (): readonly number[] => walk.facts().look ?? [Number.NaN, 0, 0];
    const start = look();
    canvas.dispatchEvent(pointer('pointermove', { movementX: 100, movementY: 0, buttons: 0 }));
    ready();
    const right = look();
    expect(yawOf(right) - yawOf(start), '100 px to the right turns right by 100 × LOOK_PER_PIXEL').toBeCloseTo(-100 * LOOK_PER_PIXEL, 9);
    canvas.dispatchEvent(pointer('pointermove', { movementX: 0, movementY: -50 }));
    ready();
    expect(Math.asin(look()[1] ?? 0) - Math.asin(right[1] ?? 0), '50 px up looks up by 50 × LOOK_PER_PIXEL').toBeCloseTo(50 * LOOK_PER_PIXEL, 9);
    // A press of the locked mouse is no drag: its movement turns the view once, as any movement does.
    const before = look();
    canvas.dispatchEvent(pointer('pointerdown', { pointerId: 1 }));
    canvas.dispatchEvent(pointer('pointermove', { pointerId: 1, movementX: 40, clientX: 0 }));
    canvas.dispatchEvent(pointer('pointerup', { pointerId: 1 }));
    ready();
    expect(yawOf(look()) - yawOf(before), 'the locked mouse pressed and moved 40 px').toBeCloseTo(-40 * LOOK_PER_PIXEL, 9);
    // A finger's drag while the mouse is locked turns the view by its own travel.
    const touched = look();
    canvas.dispatchEvent(pointer('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(pointer('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 160, clientY: 100, movementX: 999 }));
    canvas.dispatchEvent(pointer('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 160, clientY: 100 }));
    ready();
    expect(yawOf(look()) - yawOf(touched), 'a finger dragged 60 px to the right while the mouse is locked').toBeCloseTo(-60 * LOOK_PER_PIXEL, 9);
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

  it('leaves nothing more on its own release, even entered again before the release is told; a lock that comes once walk mode was left is freed', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    walk.exit();
    expect(doc.pending, 'leaving frees the pointer').toBe(1);
    walk.enter();
    doc.release();
    expect(walk.active, 'entered again before the browser told the release: still walking').toBe(true);
    expect(walk.facts().pointerLocked, 'the pointer free').toBe(false);
    walk.exit();
    expect(doc.pending, 'nothing to free when it is not locked').toBe(0);
    // The lock asked for on entering comes after walk mode was left (F pressed twice): it is freed at once, and the orbit view goes on.
    walk.enter();
    walk.exit();
    doc.lock(canvas);
    expect(doc.pending, 'a late lock freed').toBe(1);
    doc.release();
    expect([walk.active, walk.facts().pointerLocked], 'the orbit view, the pointer free').toEqual([false, false]);
  });

  it('keeps the status line’s hint through a look and drops it at the first step', () => {
    walk.enter('plaza');
    ready();
    doc.lock(canvas);
    expect(walk.hint, 'the hint once walking, the pointer locked').toBe(true);
    canvas.dispatchEvent(pointer('pointermove', { movementX: 30, movementY: 10 }));
    ready();
    expect(walk.hint, 'after a look').toBe(true);
    walk.frame(1 / 60, 0, new Set(['KeyW']));
    expect(walk.hint, 'after the first step').toBe(false);
  });
});
