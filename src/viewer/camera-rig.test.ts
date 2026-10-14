/**
 * The follow camera's goal (src/viewer/camera-rig.ts, `followGoal`; docs/design/spec.md, CameraFocus): a `view` exactly, a `preset` as it resolves,
 * a `box` or the step's piece bounds framed from the current horizontal direction with the elevation kept in 14..62 degrees, small steps grown to a
 * 14 m half-diagonal. Framing is checked by projecting the box's corners through a three.js camera at the goal.
 * Bound: pure function, no WebGL and no OrbitControls; the e2e suite checks that the page's camera moves toward the goal during playback.
 */
import { Box3, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { FOLLOW_MIN_RADIUS, followGoal } from './camera-rig.js';
import { DEFAULT_FOV, PRESETS, resolvePreset } from './presets.js';
import type { CameraPose } from './presets.js';

const MODEL = new Box3(new Vector3(-230, -8, -260), new Vector3(200, 40, 40));
const STEP = new Box3(new Vector3(-20, 0, -40), new Vector3(10, 12, -10));
const ASPECT = 1.78;

/** A camera at `elevation` degrees above the horizon, `azimuth` degrees round from +X toward +Z, 300 m from `target`. */
function from(elevation: number, azimuth: number, target = new Vector3(5, 3, -20)): { position: Vector3; target: Vector3 } {
  const e = MathUtils.degToRad(elevation);
  const a = MathUtils.degToRad(azimuth);
  return { position: target.clone().add(new Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).multiplyScalar(300)), target };
}

/** The largest |x| or |y| in NDC of the box's corners from `pose`; Infinity when a corner lies behind the camera. */
function reach(pose: CameraPose, box: Box3): number {
  const camera = new PerspectiveCamera(pose.fov, ASPECT, 0.01, 1e7);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  const back = pose.position.clone().sub(pose.target).normalize();
  let worst = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new Vector3(x, y, z);
        if (!(pose.position.clone().sub(corner).dot(back) > 0)) return Infinity;
        const p = corner.project(camera);
        worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
      }
    }
  }
  return worst;
}

const elevationOf = (pose: CameraPose): number => {
  const o = pose.position.clone().sub(pose.target);
  return MathUtils.radToDeg(Math.atan2(o.y, Math.hypot(o.x, o.z)));
};
const azimuthOf = (pose: CameraPose): number => {
  const o = pose.position.clone().sub(pose.target);
  return MathUtils.radToDeg(Math.atan2(o.z, o.x));
};

describe('followGoal', () => {
  it('takes a view focus exactly, at the default field of view', () => {
    const goal = followGoal(from(30, 40), ASPECT, { kind: 'view', position: [1, 2, 3], target: [4, 5, 6] }, STEP, MODEL);
    expect([goal.position.toArray(), goal.target.toArray(), goal.fov]).toEqual([[1, 2, 3], [4, 5, 6], DEFAULT_FOV]);
  });

  it('takes a preset focus as the preset resolves for the model, look and fit alike', () => {
    for (const preset of [PRESETS.find((p) => p.camera.kind === 'look'), PRESETS.find((p) => p.camera.kind === 'fit')]) {
      if (preset === undefined) throw new Error('PRESETS lacks a look or a fit preset.');
      const goal = followGoal(from(30, 40), ASPECT, { kind: 'preset', id: preset.id }, STEP, MODEL);
      const expected = resolvePreset(preset, MODEL, ASPECT);
      expect(goal.position.distanceTo(expected.position), preset.id).toBeLessThan(1e-9);
      expect(goal.target.distanceTo(expected.target), preset.id).toBeLessThan(1e-9);
      expect(goal.fov, preset.id).toBe(expected.fov);
    }
  });

  it('frames a box focus, and by default the step bounds, from the current direction with every corner in frame', () => {
    const box = new Box3(new Vector3(30, 0, -90), new Vector3(70, 25, -50));
    for (const [focus, framed] of [[{ kind: 'box', min: box.min.toArray(), max: box.max.toArray() }, box], [undefined, STEP], [{ kind: 'pieces' }, STEP]] as const) {
      const goal = followGoal(from(35, 120), ASPECT, focus, STEP, MODEL);
      expect(goal.target.distanceTo(framed.getCenter(new Vector3())), focus?.kind ?? 'default').toBeLessThan(1e-9);
      expect(azimuthOf(goal), focus?.kind ?? 'default').toBeCloseTo(120, 9);
      expect(elevationOf(goal), focus?.kind ?? 'default').toBeCloseTo(35, 9);
      expect(reach(goal, framed), focus?.kind ?? 'default').toBeLessThan(1);
    }
  });

  it('keeps the elevation between 14 and 62 degrees', () => {
    expect(elevationOf(followGoal(from(89, 10), ASPECT, undefined, STEP, MODEL))).toBeCloseTo(62, 9);
    expect(elevationOf(followGoal(from(2, 10), ASPECT, undefined, STEP, MODEL))).toBeCloseTo(14, 9);
    expect(elevationOf(followGoal(from(-30, 10), ASPECT, undefined, STEP, MODEL))).toBeCloseTo(14, 9);
    expect(elevationOf(followGoal(from(40, 10), ASPECT, undefined, STEP, MODEL))).toBeCloseTo(40, 9);
  });

  it(`grows a small step to a ${String(FOLLOW_MIN_RADIUS)} m half-diagonal before framing it`, () => {
    const stone = new Box3(new Vector3(0, 0, 0), new Vector3(0.5, 0.5, 0.5));
    const goal = followGoal(from(30, 45), ASPECT, undefined, stone, MODEL);
    const grown = stone.clone().expandByScalar((FOLLOW_MIN_RADIUS - stone.getSize(new Vector3()).length() / 2) / Math.sqrt(3));
    expect(grown.getSize(new Vector3()).length() / 2).toBeCloseTo(FOLLOW_MIN_RADIUS, 9);
    expect(reach(goal, grown)).toBeLessThan(1);
    // Framed as the grown box, so the stone itself takes only a small part of the view.
    expect(reach(goal, stone)).toBeLessThan(0.1);
  });

  it('falls back to the step bounds when a preset focus names no preset', () => {
    const goal = followGoal(from(30, 40), ASPECT, { kind: 'preset', id: 'no-such-preset' }, STEP, MODEL);
    expect(goal.target.distanceTo(STEP.getCenter(new Vector3()))).toBeLessThan(1e-9);
    expect(reach(goal, STEP)).toBeLessThan(1);
  });
});
