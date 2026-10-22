/**
 * Camera and OrbitControls, tuned for both a 1 km aerial view and a 3 m interior close-up, plus the follow camera's smoothing, the keyboard moves of
 * the orbit view (`translate`), the zoom toward the pointer (src/viewer/zoom.ts; the controls' own zoom is off) and the first-person pose of walk mode.
 * Depth precision: the near plane follows the distance to the orbit target (1%, from 3 cm to 20 m) and never exceeds half the camera's height above the
 * workspace ground, so a 24-bit depth buffer resolves about 1 cm at 1 km from an aerial view and well under 1 mm across a hall seen from inside.
 * The far plane is fixed beyond the haze, which hides the edge of the workspace ground.
 */
import { Box3, MathUtils, PerspectiveCamera, Ray, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { CameraFocus } from '../build/types.js';
import { DEFAULT_FOV, fitBox, presetById, resolvePreset } from './presets.js';
import type { CameraPose } from './presets.js';
import { bindZoomInput, pointerRay, zoomStep } from './zoom.js';

const FAR = 25_000;
const NEAR_MIN = 0.03;
const NEAR_MAX = 20;
const NEAR_PER_DISTANCE = 0.01;
/** The camera stays this far above the workspace ground. */
export const CAMERA_FLOOR = 0.4;
/** In walk mode the orbit target stays this far ahead of the eye, so leaving walk mode orbits about what the walker looked at. */
const WALK_TARGET_DISTANCE = 5;
/** The follow camera frames at least a sphere of this radius, so a small step does not zoom in on one stone. */
export const FOLLOW_MIN_RADIUS = 14;
/** The follow camera stands this many times as far as the tightest fit of its box. */
const FOLLOW_MARGIN = 1.15;
/** Seconds for the follow camera to cover about 63% of the way to its goal. */
const FOLLOW_TAU = 0.9;
const FOLLOW_ELEVATION_MIN = 14 * MathUtils.DEG2RAD;
const FOLLOW_ELEVATION_MAX = 62 * MathUtils.DEG2RAD;

export class CameraRig {
  readonly camera = new PerspectiveCamera(DEFAULT_FOV, 1, 0.1, FAR);
  readonly controls: OrbitControls;
  /** Called when the user moves the camera by dragging, wheeling or touching (not when code moves it, even while a pointer is down). */
  onUserMove: (() => void) | null = null;
  /** The distance along a ray to the first surface the zoom heads for (src/viewer/pick.ts), or null; without it the zoom flies as over open sky. */
  pick: ((ray: Ray) => number | null) | null = null;
  /** In walk mode the controls are off and the walk mode poses the camera (`setWalkView`). */
  private walk = false;
  private interacting = false;
  /** Above 0 while the rig itself runs the controls' update, whose `change` events are the rig's own moves (the follow camera, damping, a pose), not the user's. */
  private own = 0;

  constructor(
    private readonly element: HTMLElement,
    private readonly groundY: number,
  ) {
    this.controls = new OrbitControls(this.camera, element);
    const c = this.controls;
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.screenSpacePanning = true;
    // The wheel, a pinch and a middle drag zoom through `dolly`; the controls' own zoom shrank its steps toward the target until it stalled.
    c.enableZoom = false;
    bindZoomInput(element, (x, y, factor) => { this.dolly(x, y, factor); }, () => !this.walk && c.enabled);
    // The full range, so interior presets can look straight up into a dome or skylight.
    c.maxPolarAngle = Math.PI;
    c.addEventListener('start', () => {
      this.interacting = true;
    });
    c.addEventListener('end', () => {
      this.interacting = false;
    });
    // The controls report a user's drag or wheel from inside their own input handlers; a change from the rig's update is the rig's own move.
    c.addEventListener('change', () => {
      if (this.interacting && this.own === 0) this.onUserMove?.();
    });
  }

  /** Runs the controls' update as the rig's own move; returns whether the camera moved. */
  private sync(): boolean {
    this.own += 1;
    try {
      return this.controls.update();
    } finally {
      this.own -= 1;
    }
  }

  /**
   * Sizes the projection to a canvas of `width` by `height` pixels whose bottom `insetBottom` pixels are covered by page chrome:
   * the field of view and the centre of projection belong to the visible part, so presets and the follow camera frame the model where it can be seen.
   */
  resize(width: number, height: number, insetBottom = 0): void {
    const visible = Math.max(1, height - Math.min(Math.max(insetBottom, 0), height * 0.6));
    this.camera.aspect = width / visible;
    if (visible < height) this.camera.setViewOffset(width, visible, 0, 0, width, height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Puts the camera at `pose` at once, dropping any rotation or pan the controls still owe from the last drag, so the camera stays where it is put. */
  setPose(pose: CameraPose): void {
    this.stopInertia();
    if (this.camera.fov !== pose.fov) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.copy(pose.position);
    this.controls.target.copy(pose.target);
    this.camera.lookAt(pose.target);
    this.sync();
    this.updateClipping();
  }

  /**
   * With damping on, OrbitControls spends a drag's rotation and pan over the following frames. One update with damping off spends what is left
   * at once and clears it (undamped controls carry nothing over), so the pose set next is not carried away by the last drag's inertia.
   */
  private stopInertia(): void {
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.sync();
    this.controls.enableDamping = damping;
  }

  pose(): CameraPose {
    return { position: this.camera.position.clone(), target: this.controls.target.clone(), fov: this.camera.fov };
  }

  /** Moves part of the way toward `goal`, for `seconds` of wall time. Returns whether the camera moved. */
  approach(goal: CameraPose, seconds: number): boolean {
    const k = 1 - Math.exp(-seconds / FOLLOW_TAU);
    const before = this.camera.position.distanceTo(goal.position) + this.controls.target.distanceTo(goal.target) + Math.abs(this.camera.fov - goal.fov);
    if (before < 1e-3) return false;
    this.camera.position.lerp(goal.position, k);
    this.controls.target.lerp(goal.target, k);
    if (this.camera.fov !== goal.fov) {
      this.camera.fov += (goal.fov - this.camera.fov) * k;
      this.camera.updateProjectionMatrix();
    }
    return true;
  }

  /** Applies damping and the camera floor. Returns whether the camera moved. In walk mode it only sets the clipping planes. */
  update(): boolean {
    if (this.walk) {
      this.updateClipping();
      return false;
    }
    const moved = this.sync();
    const floor = this.groundY + CAMERA_FLOOR;
    if (this.camera.position.y < floor) {
      this.camera.position.y = floor;
      this.sync();
    }
    this.updateClipping();
    return moved;
  }

  /**
   * One zoom step toward the point under (clientX, clientY), by `factor` (below 1 in, above 1 out): src/viewer/zoom.ts `zoomStep` says how far, the
   * camera floor a bound both ways, so the camera stays on the ray. A step at a bound changes nothing; any other counts as the user's move.
   */
  dolly(clientX: number, clientY: number, factor: number): void {
    const direction = pointerRay(this.element, this.camera, clientX, clientY);
    const surface = this.pick !== null ? this.pick(new Ray(this.camera.position.clone(), direction)) : null;
    const next = zoomStep(this.camera.position, this.controls.target, direction, surface, factor, this.groundY + CAMERA_FLOOR);
    if (next === null) return;
    this.stopInertia();
    this.camera.position.copy(next.position);
    this.controls.target.copy(next.target);
    this.sync();
    this.updateClipping();
    this.onUserMove?.();
  }

  /** Moves the camera and its target together by `delta` (the orbit view's keys), never below the camera floor. Returns whether it moved. */
  translate(delta: Vector3): boolean {
    const floor = this.groundY + CAMERA_FLOOR;
    const d = delta.clone();
    if (this.camera.position.y + d.y < floor) d.y = Math.min(0, floor - this.camera.position.y);
    if (d.lengthSq() < 1e-12) return false;
    this.camera.position.add(d);
    this.controls.target.add(d);
    this.sync();
    this.updateClipping();
    return true;
  }

  /** Whether walk mode poses the camera. */
  get walking(): boolean {
    return this.walk;
  }

  /** Switches walk mode's camera on (the orbit controls off) or off again. */
  setWalking(on: boolean): void {
    if (on === this.walk) return;
    if (on) this.stopInertia();
    this.walk = on;
    this.controls.enabled = !on;
    if (!on) this.sync();
  }

  /** Walk mode: the camera at `eye` looking along the unit `look`, the orbit target WALK_TARGET_DISTANCE ahead. */
  setWalkView(eye: Vector3, look: Vector3, fov: number): void {
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.copy(eye);
    this.controls.target.copy(eye).addScaledVector(look, WALK_TARGET_DISTANCE);
    this.camera.lookAt(this.controls.target);
    this.updateClipping();
  }

  /** Sets the near plane from the distance to the target and the height above ground; see the header. */
  updateClipping(): void {
    const distance = this.camera.position.distanceTo(this.controls.target);
    const height = this.camera.position.y - this.groundY;
    const near = MathUtils.clamp(Math.min(distance * NEAR_PER_DISTANCE, height * 0.5), NEAR_MIN, NEAR_MAX);
    if (Math.abs(near - this.camera.near) > 1e-6 * near) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Where the follow camera aims for `focus`, given the step's piece bounds and the whole model's bounds; see `followGoal`. */
  followGoal(focus: CameraFocus | undefined, stepBounds: Box3, modelBounds: Box3): CameraPose {
    return followGoal({ position: this.camera.position, target: this.controls.target }, this.camera.aspect, focus, stepBounds, modelBounds);
  }
}

/**
 * Where the follow camera aims for `focus`, seen from the camera `from` at `aspect`: a `view` exactly; a `preset` as the preset resolves; a `box` or,
 * by default, the step's piece bounds, grown evenly until its half-diagonal is at least FOLLOW_MIN_RADIUS (14 m) and framed with a 1.15 margin from
 * the current horizontal direction, its elevation kept within 14..62 degrees.
 */
export function followGoal(from: { readonly position: Vector3; readonly target: Vector3 }, aspect: number, focus: CameraFocus | undefined, stepBounds: Box3, modelBounds: Box3): CameraPose {
  if (focus?.kind === 'view') return { position: new Vector3(...focus.position), target: new Vector3(...focus.target), fov: DEFAULT_FOV };
  if (focus?.kind === 'preset') {
    const preset = presetById(focus.id);
    if (preset !== undefined) return resolvePreset(preset, modelBounds, aspect);
  }
  const box = focus?.kind === 'box' ? new Box3(new Vector3(...focus.min), new Vector3(...focus.max)) : stepBounds.clone();
  // At least FOLLOW_MIN_RADIUS across, so a small step does not zoom in on one stone.
  box.expandByVector(new Vector3(1, 1, 1).multiplyScalar(Math.max(0, FOLLOW_MIN_RADIUS - box.getSize(new Vector3()).length() / 2) / Math.sqrt(3)));
  const offset = from.position.clone().sub(from.target);
  const horizontal = Math.hypot(offset.x, offset.z) > 1e-6 ? Math.atan2(offset.z, offset.x) : Math.PI / 4;
  const elevation = MathUtils.clamp(Math.atan2(offset.y, Math.hypot(offset.x, offset.z)), FOLLOW_ELEVATION_MIN, FOLLOW_ELEVATION_MAX);
  const direction = new Vector3(Math.cos(elevation) * Math.cos(horizontal), Math.sin(elevation), Math.cos(elevation) * Math.sin(horizontal));
  return fitBox(box, direction, DEFAULT_FOV, aspect, FOLLOW_MARGIN);
}
