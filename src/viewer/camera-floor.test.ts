/**
 * The camera floor through the rig's real handlers (src/viewer/camera-rig.ts, OrbitControls and the zoom's wheel input), on a stand-in canvas: a
 * right-drag that pans the camera under the floor and a wheel notch before the next frame leave the view where it looked, and so does a pan alone;
 * the camera ends on or over the floor (work unit 1, review 4, U12). At every frame while a drag's damping runs out (a pan, a pan with W held, an
 * orbit), the camera the frame renders from stands on or over the floor, where the same drag 50 m up puts it but for the height, looking the same
 * way, and a pan's view has not turned (review 5, U13).
 * Bound: a 1280 by 720 stand-in element with no layout and no WebGL; the workspace ground at y = 0, so the floor at CAMERA_FLOOR; the pick sees only
 * that ground, from either side, as the page's pick counts both faces of a piece; frames of 1/60 s in the page's order (the keys' move, the rig's
 * update, the render), each after one move of the drag, 100 pixels up in 10 moves. The drag and the notch through the browser are in
 * tests/e2e/zoom.spec.ts.
 */
import { Vector3 } from 'three';
import type { Ray } from 'three';
import { describe, expect, it } from 'vitest';

import { CAMERA_FLOOR, CameraRig } from './camera-rig.js';
import { orbitKeyMove, orbitKeys } from './orbit-keys.js';

/** A canvas as far as OrbitControls and the zoom's input read one: events, a size, a box and a document for the drag's moves. */
class StandIn extends EventTarget {
  readonly style: Record<string, string> = {};
  readonly clientWidth = 1280;
  readonly clientHeight = 720;
  readonly ownerDocument = new EventTarget();
  getRootNode(): EventTarget {
    return this.ownerDocument;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number; x: number; y: number } {
    return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0 };
  }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean {
    return false;
  }
}

function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), props));
}

const mouse = (x: number, y: number, button: number): Record<string, unknown> => ({ pointerId: 1, pointerType: 'mouse', button, buttons: button === 2 ? 2 : 0, clientX: x, clientY: y, ctrlKey: false, metaKey: false, shiftKey: false });

/** A rig on the floor (or `over` metres over it) looking 45° up at a target 100 m away, field of view 40°, as review 4 set it up. */
function onTheFloor(over = 0): { rig: CameraRig; element: StandIn; view: () => Vector3 } {
  const element = new StandIn();
  const rig = new CameraRig(element as unknown as HTMLElement, 0);
  rig.resize(1280, 720, 0);
  const up = new Vector3(0, Math.SQRT1_2, -Math.SQRT1_2);
  const position = new Vector3(0, CAMERA_FLOOR + over, 0);
  rig.setPose({ position, target: position.clone().addScaledVector(up, 100), fov: 40 });
  rig.pick = (ray: Ray) => {
    const t = -ray.origin.y / ray.direction.y;
    return t > 0 && Number.isFinite(t) ? t : null;
  };
  rig.camera.updateMatrixWorld();
  return { rig, element, view: () => rig.controls.target.clone().sub(rig.camera.position).normalize() };
}

/** Right-drags up by `pixels` from the middle of the stand-in, the button still down. */
function panUp(element: StandIn, pixels: number): void {
  fire(element, 'pointerdown', mouse(640, 360, 2));
  fire(element.ownerDocument, 'pointermove', mouse(640, 360 - pixels, 2));
}

describe('the camera floor through the rig', () => {
  it('a pan under the floor and a wheel notch before the next frame leave the view where it looked', () => {
    const { rig, element, view } = onTheFloor();
    const before = view();
    panUp(element, 100);
    expect(rig.camera.position.y, 'the pan takes the camera under the floor').toBeLessThan(CAMERA_FLOOR);
    fire(element, 'wheel', { deltaY: -100, deltaMode: 0, ctrlKey: false, clientX: 640, clientY: 260 });
    rig.update();
    fire(element.ownerDocument, 'pointerup', mouse(640, 260, 2));
    for (let frame = 0; frame < 5; frame += 1) rig.update();
    expect((view().angleTo(before) * 180) / Math.PI, 'degrees the view turned').toBeLessThan(1e-3);
    expect(rig.camera.position.y, "on or over the floor, to the controls' rounding").toBeGreaterThanOrEqual(CAMERA_FLOOR - 1e-6);
  });

  it('a pan alone under the floor leaves the view where it looked', () => {
    const { rig, element, view } = onTheFloor();
    const before = view();
    panUp(element, 100);
    fire(element.ownerDocument, 'pointerup', mouse(640, 260, 2));
    for (let frame = 0; frame < 60; frame += 1) rig.update();
    expect((view().angleTo(before) * 180) / Math.PI, 'degrees the view turned').toBeLessThan(1e-3);
    expect(rig.camera.position.y, "on or over the floor, to the controls' rounding").toBeGreaterThanOrEqual(CAMERA_FLOOR - 1e-6);
  });

  // Each frame of the page (src/main.ts `frame`) moves the camera by the keys held, then runs the rig's update, then renders: the update is the last
  // move before the render, so the camera after it is the camera the frame renders from. The browser hands the page a drag's move before the frame.
  for (const [what, button, keys] of [['a pan', 2, []], ['a pan with W held', 2, ['KeyW']], ['an orbit', 0, []]] as const) {
    it(`${what} into the floor keeps the camera on or over it at every frame until the damping runs out, changing only its height from the same drag 50 m up`, () => {
      /**
       * Up by 100 pixels in 10 moves, a frame after each, then the release and 240 frames: the camera and its view after each frame, and the lowest
       * the camera went, between frames included.
       */
      const drag = (over: number): { cameras: Vector3[]; views: Vector3[]; lowest: number; rig: CameraRig } => {
        const { rig, element, view } = onTheFloor(over);
        const held = new Set<string>(keys);
        const cameras: Vector3[] = [];
        const views: Vector3[] = [];
        let lowest = Number.POSITIVE_INFINITY;
        const frame = (): void => {
          const up = new Vector3(0, 1, 0).applyQuaternion(rig.camera.quaternion);
          const move = orbitKeyMove(rig.camera.position, rig.controls.target, up, orbitKeys(held), 1 / 60);
          if (move.lengthSq() > 0) rig.translate(move);
          rig.update();
          cameras.push(rig.camera.position.clone());
          views.push(view());
          lowest = Math.min(lowest, rig.camera.position.y);
        };
        fire(element, 'pointerdown', mouse(640, 360, button));
        for (let m = 1; m <= 10; m += 1) {
          fire(element.ownerDocument, 'pointermove', mouse(640, 360 - 10 * m, button));
          lowest = Math.min(lowest, rig.camera.position.y);
          frame();
        }
        fire(element.ownerDocument, 'pointerup', mouse(640, 260, button));
        for (let k = 0; k < 240; k += 1) frame();
        return { cameras, views, lowest, rig };
      };
      // The same drag 50 m up never comes down to the floor, so there the controls alone move the camera: the floor may change only the height.
      const [floor, high] = [drag(0), drag(50)];
      const before = onTheFloor().view();
      const degrees = (a: Vector3, b: Vector3): number => (a.angleTo(b) * 180) / Math.PI;
      // To rounding: where the orbit ends, looking straight up, the controls' spherical angles amplify it to 4e-9 m across and 9e-7°.
      const problems: string[] = [];
      floor.cameras.forEach((c, k) => {
        const [h, v, w] = [high.cameras[k], floor.views[k], high.views[k]];
        if (h === undefined || v === undefined || w === undefined) throw new Error(`frame ${String(k + 1)} is missing from the drag 50 m up`);
        const at = `frame ${String(k + 1)}:`;
        if (c.y < CAMERA_FLOOR - 1e-9) problems.push(`${at} the camera ${(CAMERA_FLOOR - c.y).toFixed(9)} m under the floor at y ${String(CAMERA_FLOOR)}`);
        const across = Math.hypot(c.x - h.x, c.z - h.z);
        if (across > 1e-6) problems.push(`${at} the camera ${across.toExponential(2)} m across from where the same drag 50 m up puts it`);
        if (degrees(v, w) > 1e-4) problems.push(`${at} the view ${degrees(v, w).toExponential(2)}° off the view of the same drag 50 m up`);
        if (button === 2 && degrees(v, before) > 1e-4) problems.push(`${at} the pan turned the view ${degrees(v, before).toExponential(2)}°`);
      });
      expect(high.lowest, 'the drag 50 m up stays clear of the floor').toBeGreaterThan(CAMERA_FLOOR + 1);
      expect(floor.lowest, 'the drag takes the camera under the floor between frames').toBeLessThan(CAMERA_FLOOR - 0.1);
      expect(problems).toEqual([]);
      const still = floor.rig.camera.position.clone();
      floor.rig.update();
      expect(floor.rig.camera.position.distanceTo(still), 'the damping has run out').toBeLessThan(1e-9);
    });
  }
});
