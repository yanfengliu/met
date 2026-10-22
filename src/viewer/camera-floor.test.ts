/**
 * The camera floor through the rig's real handlers (src/viewer/camera-rig.ts, OrbitControls and the zoom's wheel input), on a stand-in canvas: a
 * right-drag that pans the camera under the floor and a wheel notch before the next frame leave the view where it looked, and so does a pan alone;
 * the camera ends on or over the floor (work unit 1, review 4, U12).
 * Bound: a 1280 by 720 stand-in element with no layout and no WebGL; the workspace ground at y = 0, so the floor at CAMERA_FLOOR; the pick sees only
 * that ground, from either side, as the page's pick counts both faces of a piece. The same sequence through the browser is in tests/e2e/zoom.spec.ts.
 */
import { Vector3 } from 'three';
import type { Ray } from 'three';
import { describe, expect, it } from 'vitest';

import { CAMERA_FLOOR, CameraRig } from './camera-rig.js';

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

/** A rig on the floor looking 45° up at a target 100 m away, field of view 40°, as review 4 set it up. */
function onTheFloor(): { rig: CameraRig; element: StandIn; view: () => Vector3 } {
  const element = new StandIn();
  const rig = new CameraRig(element as unknown as HTMLElement, 0);
  rig.resize(1280, 720, 0);
  const up = new Vector3(0, Math.SQRT1_2, -Math.SQRT1_2);
  const position = new Vector3(0, CAMERA_FLOOR, 0);
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
});
