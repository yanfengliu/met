/**
 * Zoom toward the pointer (docs/design/spec.md, Camera; docs/learning/defect-register.md, "The wheel stops zooming").
 * One zoom step moves the camera along the ray under the pointer and keeps its view direction; the orbit target is put back on the view axis at the
 * depth of what the zoom heads for, so orbiting then turns about it.
 * - In: by `1 − factor` of the distance to the surface under the pointer (src/viewer/pick.ts), at least ZOOM.minStep, and never closer to that
 *   surface than ZOOM.stop: there the zoom in stops, at a bound the eye can see. Over open sky it flies on, as if a surface stood ZOOM.flyDepth ahead.
 *   Where the ray comes down to the camera floor sooner, the zoom heads for the floor instead (`zoomHit`) and stops on it, still on the ray.
 * - Out: by `factor − 1` of the distance to the target, at least ZOOM.minStep, until the target is ZOOM.maxDistance away, or, backing down a ray
 *   that points up, until the camera stands on the camera floor, still on the ray.
 * Steps never shrink with the distance to an invisible point, so every notch moves the camera until one of the two bounds, and either bound gives
 * way at once to the other direction, also where a move by the keys leaves the camera at both (`zoomStep`).
 */
import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';

export const ZOOM = Object.freeze({
  /** The closest the zoom brings the camera to the surface under the pointer, along the ray, metres. */
  stop: 0.5,
  /** The least one step moves the camera, metres (less only to land on a bound). */
  minStep: 0.25,
  /** The farthest the zoom out takes the camera from its target, metres. */
  maxDistance: 6000,
  /** Over open sky the zoom in flies as if a surface stood this far ahead, metres. */
  flyDepth: 10,
  /** One wheel notch (deltaY 100) zooms by this fraction. */
  notch: 0.1,
});

export interface DollyResult {
  readonly position: Vector3;
  readonly target: Vector3;
}

/**
 * The distance the zoom in heads for along the unit ray `direction` from `position`: `hit`, the first surface (null over open sky stays null), unless
 * the ray comes down to the camera floor `floorY` first, less than `hit − ZOOM.stop` along it; then the distance whose stop lies on that floor.
 * Without it a zoom toward the workspace ground at a slant met the camera floor before its stop, was lifted off the ray, and slid along the floor
 * without end, the ground always as far ahead (work unit 1, review 2, U8; docs/learning/defect-register.md, "The wheel stops zooming").
 */
export function zoomHit(position: Vector3, direction: Vector3, hit: number | null, floorY: number): number | null {
  if (hit === null || !(direction.y < 0)) return hit;
  return Math.min(hit, Math.max(0, (floorY - position.y) / direction.y) + ZOOM.stop);
}

/**
 * One zoom step. `direction` is the unit ray under the pointer from `position`; `hit` the distance along it to what the zoom in heads for, or null;
 * `factor` below 1 zooms in, above 1 out; `floorY` the camera floor, on which a zoom out backing down the ray stops. Returns the new camera position
 * and target, or null at a bound, where the step changes nothing.
 */
export function dollyStep(position: Vector3, target: Vector3, direction: Vector3, hit: number | null, factor: number, floorY = Number.NEGATIVE_INFINITY): DollyResult | null {
  if (!(factor > 0) || factor === 1) return null;
  const axis = target.clone().sub(position);
  const radius = axis.length();
  if (!(radius > 0)) return null;
  axis.divideScalar(radius);
  const cos = Math.max(direction.dot(axis), 1e-3);
  let step: number;
  let depth: number;
  if (factor < 1) {
    const ahead = hit ?? Math.max(radius, ZOOM.flyDepth) / cos;
    const room = hit === null ? Number.POSITIVE_INFINITY : hit - ZOOM.stop;
    if (!(room > 1e-6)) return null;
    step = Math.min(room, Math.max(ahead * (1 - factor), ZOOM.minStep));
    depth = hit === null ? Math.max(radius - step * cos, ZOOM.flyDepth) : (hit - step) * cos;
  } else {
    // Back along the ray until the target is ZOOM.maxDistance away or, the ray pointing up, the camera is down on the floor. Lifting it off the floor
    // instead left a step of 0.25 × cos(the ray's angle up), nothing looking straight up, and the camera off the ray (work unit 1, review 3, U11).
    const far = (ZOOM.maxDistance - radius) / cos;
    const room = direction.y > 0 ? Math.min(far, (position.y - floorY) / direction.y) : far;
    if (!(room > 1e-6)) return null;
    step = -Math.min(room, Math.max(radius * (factor - 1), ZOOM.minStep));
    depth = radius - step * cos;
  }
  const moved = position.clone().addScaledVector(direction, step);
  return { position: moved, target: moved.clone().addScaledVector(axis, Math.max(depth, ZOOM.stop)) };
}

/**
 * One zoom step as the page takes it (src/viewer/camera-rig.ts): `surface` is the distance along the ray to the first surface (src/viewer/pick.ts), or
 * null, and `floorY` the camera floor. In, it heads for the surface's stop or the floor (`zoomHit`); out, it backs off until the far bound or the floor.
 * Where the zoom out is at its far bound while the zoom in is at its near bound too, as after zooming out to the far bound and holding Q down to the
 * floor, the target first comes onto the view axis at the near bound's depth, so the zoom out moves: either bound gives way to the other direction
 * (work unit 1, review 3, U11). Returns the new camera position and target, or null at a bound.
 */
export function zoomStep(position: Vector3, target: Vector3, direction: Vector3, surface: number | null, factor: number, floorY: number): DollyResult | null {
  const near = zoomHit(position, direction, surface, floorY);
  if (factor < 1) return dollyStep(position, target, direction, near, factor, floorY);
  const out = dollyStep(position, target, direction, null, factor, floorY);
  if (out !== null || near === null || near - ZOOM.stop > 1e-6) return out;
  const axis = target.clone().sub(position).normalize();
  const anchored = position.clone().addScaledVector(axis, Math.max(near * Math.max(direction.dot(axis), 1e-3), ZOOM.stop));
  return dollyStep(position, anchored, direction, null, factor, floorY);
}

/** The zoom factor of a wheel event: ZOOM.notch per notch of 100 pixels, lines and pages scaled to pixels; a pinch on a trackpad (ctrl) counts five times. */
export function wheelFactor(event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>): number {
  const pixels = event.deltaY * (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1) * (event.ctrlKey ? 5 : 1);
  const notches = Math.min(Math.abs(pixels) / 100, 10);
  const scale = Math.pow(1 - ZOOM.notch, notches);
  return pixels < 0 ? scale : pixels > 0 ? 1 / scale : 1;
}

/**
 * Wheel, two-finger pinch and middle-button drag on `element`, each reported as `zoom(clientX, clientY, factor)` at the point it zooms toward.
 * `active()` false (walk mode) ignores them. The orbit controls' own zoom is off (src/viewer/camera-rig.ts), so these are the only zoom inputs.
 */
export function bindZoomInput(element: HTMLElement, zoom: (clientX: number, clientY: number, factor: number) => void, active: () => boolean): void {
  element.addEventListener(
    'wheel',
    (event) => {
      if (!active()) return;
      event.preventDefault();
      const factor = wheelFactor(event);
      if (factor !== 1) zoom(event.clientX, event.clientY, factor);
    },
    { passive: false },
  );
  const touches = new Map<number, { x: number; y: number }>();
  let middle: { x: number; y: number; last: number } | null = null;
  const spread = (): { d: number; x: number; y: number } | null => {
    if (touches.size !== 2) return null;
    const [a, b] = [...touches.values()];
    if (a === undefined || b === undefined) return null;
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  element.addEventListener('pointerdown', (event) => {
    if (!active()) return;
    if (event.pointerType === 'touch') touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    else if (event.button === 1) {
      event.preventDefault();
      middle = { x: event.clientX, y: event.clientY, last: event.clientY };
    }
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' && touches.has(event.pointerId)) {
      const before = spread();
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const after = spread();
      if (before !== null && after !== null && before.d > 1 && after.d > 1 && active()) zoom(after.x, after.y, before.d / after.d);
    } else if (middle !== null && active()) {
      const dy = event.clientY - middle.last;
      middle.last = event.clientY;
      // Dragging up zooms in, 100 pixels a notch.
      if (dy !== 0) zoom(middle.x, middle.y, Math.pow(1 - ZOOM.notch, -dy / 100));
    }
  });
  const end = (event: PointerEvent): void => {
    touches.delete(event.pointerId);
    if (event.pointerType !== 'touch' && event.button === 1) middle = null;
  };
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
}

/** The unit ray under the pointer at (clientX, clientY) on `element`, from the camera, through the camera's own projection (view offset included). */
export function pointerRay(element: HTMLElement, camera: PerspectiveCamera, clientX: number, clientY: number): Vector3 {
  const rect = element.getBoundingClientRect();
  camera.updateMatrixWorld();
  const ndc = new Vector3(((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1, 0.5);
  return ndc.unproject(camera).sub(camera.position).normalize();
}
