/**
 * The sun: its direction from true compass bearings, and a shadow camera fitted to the model (docs/design/spec.md, World frame: only the sun uses true bearings).
 * Pure math with no DOM, unit-tested in sun.test.ts.
 */
import { Box3, Matrix4, Vector3 } from 'three';

import { GRID_BEARING_DEG } from '../model/frame.js';

/** A clear late morning in spring: the sun over the south-east lights the Fifth Avenue facade (which faces grid east, about true bearing 119 degrees). Grid bearing from src/model/frame.ts. */
export const SUN_AZIMUTH_DEG = 140;
export const SUN_ELEVATION_DEG = 46;

const DEG = Math.PI / 180;

/** Unit vector toward the sun in grid axes (+X grid north, +Z grid east, +Y up), from a true azimuth (clockwise from true north) and an elevation. */
export function sunDirection(azimuthDeg: number, elevationDeg: number, gridRotationDeg = GRID_BEARING_DEG): Vector3 {
  const bearing = (azimuthDeg - gridRotationDeg) * DEG;
  const elevation = elevationDeg * DEG;
  return new Vector3(Math.cos(elevation) * Math.cos(bearing), Math.sin(elevation), Math.cos(elevation) * Math.sin(bearing)).normalize();
}

export interface ShadowFit {
  /** Where the light sits and what it looks at; three.js aims the shadow camera from one to the other with +Y up. */
  readonly position: Vector3;
  readonly target: Vector3;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
  readonly near: number;
  readonly far: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * An orthographic shadow camera that covers `casters` and every shadow they throw onto the plane y = `groundY`, seen along `toSun`.
 * Bound: it covers casters and the ground plane; a shadow landing on a surface below `groundY` is not covered.
 */
export function fitShadow(casters: Box3, toSun: Vector3, groundY: number, margin = 2): ShadowFit {
  const box = casters.isEmpty() ? new Box3(new Vector3(-50, 0, -50), new Vector3(50, 20, 50)) : casters;
  const dir = toSun.clone().normalize();
  const points: Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new Vector3(x, y, z);
        points.push(corner);
        if (dir.y > 1e-3) points.push(corner.clone().addScaledVector(dir, -(y - groundY) / dir.y));
      }
    }
  }
  const target = box.getCenter(new Vector3());
  const reach = points.reduce((r, p) => Math.max(r, p.distanceTo(target)), 0);
  const position = target.clone().addScaledVector(dir, reach + 50);
  const basis = new Matrix4().lookAt(position, target, UP);
  const bx = new Vector3().setFromMatrixColumn(basis, 0);
  const by = new Vector3().setFromMatrixColumn(basis, 1);
  const bz = new Vector3().setFromMatrixColumn(basis, 2);
  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  let near = Infinity;
  let far = -Infinity;
  for (const p of points) {
    const v = p.clone().sub(position);
    const x = v.dot(bx);
    const y = v.dot(by);
    const depth = -v.dot(bz);
    left = Math.min(left, x);
    right = Math.max(right, x);
    bottom = Math.min(bottom, y);
    top = Math.max(top, y);
    near = Math.min(near, depth);
    far = Math.max(far, depth);
  }
  return {
    position,
    target,
    left: left - margin,
    right: right + margin,
    bottom: bottom - margin,
    top: top + margin,
    near: Math.max(0.5, near - margin),
    far: far + margin,
  };
}
