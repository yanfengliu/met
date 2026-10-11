/**
 * Placement helpers and the few local shapes the parts library does not have (rough stone piles, grilles, half-domes, flat discs, oriented boxes).
 * Every geometry here is built once (module constants or cached by parameters), so equal pieces batch into one instanced mesh (docs/design/spec.md, Batching).
 * Units metres; local frames as each header says, front toward +Z.
 */
import * as THREE from 'three';

import type { Kit, Vec3 } from '../../build/types.js';
import { MeshBuilder } from '../lib/index.js';
import { ProfilePen } from '../lib/index.js';
import { lathe } from '../lib/index.js';

/** A 1 m cube centred on the origin, stretched by each piece's matrix: a step's boxy pieces of one material are one mesh. Box faces stay axis-aligned, so stretched normals stay right. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** The matrix that stretches UNIT_BOX over [min, max]. */
export function boxMatrix(min: Vec3, max: Vec3): THREE.Matrix4 {
  const size = new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  if (!(size.x > 0 && size.y > 0 && size.z > 0)) throw new Error(`boxMatrix: empty box (${min.join(', ')}) to (${max.join(', ')}); every max must exceed its min.`);
  const centre = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return new THREE.Matrix4().compose(centre, new THREE.Quaternion(), size);
}

/** Adds UNIT_BOX over [min, max]. */
export function box(kit: Kit, material: THREE.Material, min: Vec3, max: Vec3, order?: number): void {
  kit.add(UNIT_BOX, material, boxMatrix(min, max), order);
}

/** A box of `size` centred at `centre`, turned `angle` radians about +Y. */
export function turnedBox(kit: Kit, material: THREE.Material, centre: Vec3, size: Vec3, angle: number, order?: number): void {
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, angle);
  kit.add(UNIT_BOX, material, new THREE.Matrix4().compose(new THREE.Vector3(...centre), q, new THREE.Vector3(...size)), order);
}

/** Translation, then a turn of `angle` radians about +Y. */
export function at(x: number, y: number, z: number, angle = 0): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeTranslation(x, y, z);
  return angle === 0 ? m : m.multiply(new THREE.Matrix4().makeRotationY(angle));
}

/** Translation and a uniform or per-axis scale (no turn). */
export function scaled(x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
}

const cache = new Map<string, unknown>();
function once<T>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;
  const made = make();
  cache.set(key, made);
  return made;
}

/**
 * A stepped pile of rough-hewn courses (the uncarved blocks over the column pairs): `courses` boxes, each narrower and shallower than the one below,
 * with their faces broken into slightly uneven slabs. Origin at the bottom centre of the lowest course; spans ±width/2 in X and ±depth/2 in Z at the bottom.
 */
export function roughPile(width: number, depth: number, height: number, courses: number): THREE.BufferGeometry {
  return once(`pile|${String(width)}|${String(depth)}|${String(height)}|${String(courses)}`, () => {
    const b = new MeshBuilder();
    const h = height / courses;
    let seed = 7;
    const jitter = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280 - 0.5;
    };
    for (let k = 0; k < courses; k++) {
      const w = width / 2 - k * 0.15;
      const d = depth / 2 - k * 0.12;
      // Each course is two or three blocks across, set slightly in and out of line.
      const pieces = k < courses - 2 ? 3 : 2;
      for (let i = 0; i < pieces; i++) {
        const x0 = -w + ((2 * w) / pieces) * i + 0.03;
        const x1 = -w + ((2 * w) / pieces) * (i + 1) - 0.03;
        const out = 0.06 * jitter();
        b.box([x0, k * h, -d], [x1, (k + 1) * h - 0.035, d + out]);
      }
    }
    return b.build();
  });
}

/**
 * A metal grille of squares set diagonally, filling an arched lunette of `span` (semicircular, radius span/2) above a rectangle `base` tall:
 * bars `bar` wide crossing at 45°, clipped to the outline. Origin at the bottom centre; the grille lies in z ∈ [−depth/2, depth/2].
 */
export function lunetteGrille(span: number, base: number, cell: number, bar: number, depth: number): THREE.BufferGeometry {
  return once(`grille|${String(span)}|${String(base)}|${String(cell)}|${String(bar)}|${String(depth)}`, () => {
    const b = new MeshBuilder();
    const r = span / 2;
    const top = base + r;
    const inside = (x: number, y: number): boolean => y >= 0 && y <= top && Math.abs(x) <= r && (y <= base || x * x + (y - base) * (y - base) <= r * r);
    // Clip a 45° line through (x0, y0) to the outline by marching along it.
    const run = (x0: number, y0: number, dx: number, dy: number): void => {
      const step = 0.02;
      let s = -top * 2;
      let start: number | null = null;
      for (; s <= top * 2 + step; s += step) {
        const ok = inside(x0 + dx * s, y0 + dy * s);
        if (ok && start === null) start = s;
        if ((!ok || s > top * 2) && start !== null) {
          const a = start;
          const e = s - step;
          if (e - a > bar) {
            const mark = b.vertexCount;
            const length = (e - a) * Math.SQRT2;
            b.box([-bar / 2, 0, -depth / 2], [bar / 2, length, depth / 2]);
            const angle = Math.atan2(dx, dy);
            b.transform(mark, new THREE.Matrix4().makeTranslation(x0 + dx * a, y0 + dy * a, 0).multiply(new THREE.Matrix4().makeRotationZ(-angle)));
          }
          start = null;
        }
      }
    };
    const n = Math.ceil((span + top) / cell) + 2;
    for (let i = -n; i <= n; i++) {
      run(i * cell, 0, Math.SQRT1_2, Math.SQRT1_2);
      run(i * cell, 0, -Math.SQRT1_2, Math.SQRT1_2);
    }
    return b.build();
  });
}

/**
 * A half-dome (semi-dome) closing an apse or end bay: a quarter-sphere shell of inner radius `radius` and `thickness`, opening toward +X,
 * its springing on y = 0 and its flat face in the plane x = 0. Scale X by the matrix to flatten it into a shallow bay. Interior faces look inward.
 */
export function halfDome(radius: number, thickness: number, segments: number): THREE.BufferGeometry {
  return once(`halfDome|${String(radius)}|${String(thickness)}|${String(segments)}`, () => {
    const pen = new ProfilePen(radius + thickness, 0);
    const steps = Math.max(6, Math.round(segments / 2));
    for (let k = 1; k <= steps; k++) {
      const a = (k / steps) * (Math.PI / 2);
      pen.to((radius + thickness) * Math.cos(a), (radius + thickness) * Math.sin(a));
    }
    for (let k = steps; k >= 0; k--) {
      const a = (k / steps) * (Math.PI / 2);
      pen.to(radius * Math.cos(a), radius * Math.sin(a));
    }
    // Lathe from +X toward −Z… a half turn that starts at −Z and ends at +Z, through −X, so the shell lies on the x < 0 side; turn it to open toward +X by the start angle.
    return lathe(pen.close(), { segments, start: Math.PI / 2, angle: Math.PI });
  });
}

/** A flat disc of `radius` facing +Z, `thickness` deep (z from 0 to thickness), with a raised rim: the portrait medallions. */
export function medallionDisc(radius: number, thickness: number, segments: number): THREE.BufferGeometry {
  return once(`medallion|${String(radius)}|${String(thickness)}|${String(segments)}`, () => {
    // Outward is right of travel (as the library's lathe profiles): the back, the rim, then the recessed face, which looks +Y (then +Z).
    const pen = new ProfilePen(0, 0)
      .to(radius, 0)
      .to(radius, thickness)
      .to(radius * 0.84, thickness)
      .to(radius * 0.8, thickness * 0.6)
      .to(0, thickness * 0.6);
    const g = lathe(pen.open(), { segments });
    // Lathe stands on +Y; lay it so its axis is +Z.
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  });
}
