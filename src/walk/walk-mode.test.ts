/**
 * The look target's one hook (src/walk/walk-mode.ts, `onLookTarget`), on walk mode over a stand-in page: a canvas, a document and a camera rig as far
 * as walk mode reads them, no WebGL, and a scripted hit query. A listener hears the target when its kind or id changes as walking frames find it,
 * not when only its distance does and not on a fresh read; it hears null on leaving walk mode, and nothing once it has stopped listening. A read of
 * the walk facts finds the target afresh and writes nothing, the last frame's target standing until the next frame (review 17, F45).
 * Entered at a place of the query's own (src/walk/spawns.ts `placeOf`), walk mode stands the walker there looking at its target, and its facts name
 * the spawn `place`.
 * Bound: what the eye meets is scripted, not cast (src/walk/look.test.ts casts it); the walk itself is the walker's (src/walk/walker.test.ts).
 */
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PieceTag } from '../build/types.js';
import type { CameraRig } from '../viewer/camera-rig.js';
import type { PickHit } from '../viewer/pick.js';
import { GeometryBvhs } from './bvh-cache.js';
import { PLACE_ID, placeOf } from './spawns.js';
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

  it('reads the facts’ target afresh and writes nothing: the last frame’s target stands until the next frame (review 17, F45)', () => {
    let meets: PickHit | null = hitOf({ kind: 'door', id: 'weston' }, 1.5);
    const walk = new WalkMode({ canvas: new StandIn() as unknown as HTMLCanvasElement, rig: rig(), steps: [], floorY: -5, bvhs: new GeometryBvhs(), hit: () => meets }, () => undefined);
    const heard: (string | null)[] = [];
    walk.onLookTarget((target) => heard.push(target === null ? null : target.id));
    walk.enter('plaza');
    walk.frame(1 / 60, 0, new Set());
    walk.frame(1 / 60, 0, new Set());
    expect(walk.lastTarget?.id, 'the frame’s target').toBe('weston');
    meets = hitOf({ kind: 'artwork', id: '437788' }, 3);
    expect(walk.facts().target, 'read afresh').toEqual({ kind: 'artwork', id: '437788', distance: 3 });
    expect([walk.lastTarget?.id, heard], 'and nothing written: the frame’s target stands, nobody told').toEqual(['weston', ['weston']]);
    walk.frame(1 / 60, 0, new Set());
    expect([walk.lastTarget?.id, heard], 'the next frame finds it').toEqual(['437788', ['weston', '437788']]);
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

describe('entering at a place of the query’s own', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { addEventListener: () => undefined, pointerLockElement: null, exitPointerLock: () => undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stands the walker there, facing and looking at its target, as `place` in the facts', () => {
    const walk = new WalkMode({ canvas: new StandIn() as unknown as HTMLCanvasElement, rig: rig(), steps: [], floorY: -5, bvhs: new GeometryBvhs() }, () => undefined);
    const place = placeOf('3,-5,4,6,-3.4,8');
    if (place === null) throw new Error('placeOf refused six numbers.');
    walk.enter(place);
    walk.frame(1 / 60, 0, new Set());
    walk.frame(1 / 60, 0, new Set());
    const facts = walk.facts();
    expect(facts.spawn).toBe(PLACE_ID);
    // Nothing is built here, so the feet stand on the workspace ground at Y −5, the eye 1.6 m over them, looking level at the target 5 m off.
    expect(facts.eye?.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([3, -3.4, 4]);
    expect(facts.look?.map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0.6, 0, 0.8]);
  });
});
