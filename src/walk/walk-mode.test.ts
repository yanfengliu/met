/**
 * The look target's one hook (src/walk/walk-mode.ts, `onLookTarget`), on walk mode over a stand-in page: a canvas, a document and a camera rig as far
 * as walk mode reads them, no WebGL, and a scripted hit query. A listener hears the target when its kind or id changes as walking frames find it,
 * not when only its distance does and not on a fresh read; it hears null when walk mode is left, and nothing once it stops listening.
 * Bound: what the eye meets is scripted, not cast (src/walk/look.test.ts casts it); the walk itself is the walker's (src/walk/walker.test.ts).
 */
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PieceTag } from '../build/types.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import type { PickHit } from '../viewer/pick.js';
import { GeometryBvhs } from './bvh-cache.js';
import { WalkMode } from './walk-mode.js';

/** A canvas as far as walk mode reads one: pointer events and capture. */
class StandIn extends EventTarget {
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

/** A camera rig as far as walk mode drives one. */
function rig(): CameraRig {
  const camera = new PerspectiveCamera(45);
  return {
    camera,
    setWalking: () => undefined,
    setWalkView: () => undefined,
    setPose: () => undefined,
    pose: () => ({ position: camera.position.clone(), target: camera.position.clone(), fov: camera.fov }),
  } as unknown as CameraRig;
}

const mesh = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 1);
const hitOf = (tag: PieceTag, distance: number): PickHit => ({ mesh, instance: 0, distance, tag });

describe('the look target hook', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { addEventListener: () => undefined, pointerLockElement: null, exitPointerLock: () => undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tells a listener the target when its kind or id changes, null on leaving, and nothing once it stops', () => {
    let meets: PickHit | null = null;
    const walk = new WalkMode({ canvas: new StandIn() as unknown as HTMLCanvasElement, rig: rig(), steps: [], floorY: -5, bvhs: new GeometryBvhs(), hit: () => meets }, () => undefined);
    const heard: (string | null)[] = [];
    const stop = walk.onLookTarget((target) => heard.push(target === null ? null : `${target.kind}:${target.id}`));
    const frame = (): void => {
      walk.frame(1 / 60, 0, new Set());
    };
    walk.enter('plaza');
    frame(); // the frame that shows "Preparing walk mode"
    expect(heard, 'nothing looked at yet').toEqual([]);
    meets = hitOf({ kind: 'door', id: 'weston' }, 1.5);
    frame();
    expect(heard, 'the door, found by the first walking frame').toEqual(['door:weston']);
    meets = hitOf({ kind: 'door', id: 'weston' }, 1.2);
    frame();
    expect(heard, 'the same door nearer: no call').toEqual(['door:weston']);
    meets = hitOf({ kind: 'artwork', id: '437788' }, 3);
    frame();
    expect(heard, 'another target').toEqual(['door:weston', 'artwork:437788']);
    meets = null;
    expect(walk.target(), 'a fresh read finds nothing').toBeNull();
    expect(heard, 'and calls nothing').toEqual(['door:weston', 'artwork:437788']);
    frame();
    expect(heard, 'the next frame tells it').toEqual(['door:weston', 'artwork:437788', null]);
    meets = hitOf({ kind: 'door', id: 'weston' }, 1.5);
    frame();
    walk.exit();
    expect(heard, 'null on leaving walk mode with a target in view').toEqual(['door:weston', 'artwork:437788', null, 'door:weston', null]);
    stop();
    walk.enter('plaza');
    frame();
    frame();
    expect(walk.lastTarget?.id, 'walking again, the door is in view').toBe('weston');
    expect(heard, 'a stopped listener hears nothing').toHaveLength(5);
  });
});
