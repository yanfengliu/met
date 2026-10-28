/**
 * Landmark objects of the Arms and Armor Court, built here because the parts library has none: a mounted armour (a barded horse and its armoured rider with a
 * raised lance), a heraldic banner on its pole, a ring chandelier and an organ case. Each returns frozen geometries keyed by material role, cached, so every figure
 * of the procession is one instanced mesh per role. Origins at the base centre; figures face +X (the procession rides along the court's axis).
 * Proportions: a horse about 1.6 m at the withers, the rider's helmet near 2.9 m (interior.md, P7: a line of mounted figures on a low platform). E.
 */
import { CylinderGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder, sheet } from '../lib/index.js';

/** A matrix from a position, Euler-free axis rotation and per-axis scale. */
function m(x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, axis?: readonly [number, number, number], angle = 0): Matrix4 {
  const q = axis === undefined ? new Quaternion() : new Quaternion().setFromAxisAngle(new Vector3(...axis).normalize(), angle);
  return new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
}

const SPHERE = new SphereGeometry(0.5, 12, 8);
const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 10);
const CONE = new CylinderGeometry(0.42, 0.5, 1, 12, 1);

export interface MountedArmour {
  /** Horse's legs, tail and bridle: dark. */
  readonly horse: BufferGeometry;
  /** The rider's armour, the horse's chanfron and crinet: steel. */
  readonly armour: BufferGeometry;
  /** The caparison over the horse's body: cloth. */
  readonly caparison: BufferGeometry;
  /** The lance: wood. */
  readonly lance: BufferGeometry;
}

let armourCache: MountedArmour | null = null;

/** A barded horse with its armoured rider, facing +X. */
export function mountedArmour(): MountedArmour {
  if (armourCache !== null) return armourCache;
  const horse = new MeshBuilder();
  const armour = new MeshBuilder();
  const cloth = new MeshBuilder();
  const lance = new MeshBuilder();
  // Legs: four tapered cylinders, slightly splayed, and hooves.
  for (const [lx, lz] of [[0.7, 0.22], [0.7, -0.22], [-0.68, 0.24], [-0.68, -0.24]] as const) {
    horse.append(CYLINDER, m(lx, 0.55, lz, 0.13, 1.1, 0.13));
    horse.append(CYLINDER, m(lx, 0.04, lz, 0.17, 0.08, 0.19));
  }
  // Tail, falling behind.
  horse.append(CYLINDER, m(-1.15, 1.1, 0, 0.1, 0.8, 0.1, [0, 0, 1], -0.35));
  // Body under the caparison: barrel and chest.
  cloth.append(SPHERE, m(0, 1.42, 0, 2.05, 0.92, 0.82));
  // The caparison's skirt: a truncated cone round the body, falling to just above the knees, closed at both ends.
  cloth.append(CONE, m(0, 1.02, 0, 2.15, 0.62, 0.92));
  // Neck and head, armoured: crinet on the neck, chanfron on the face.
  armour.append(CYLINDER, m(0.98, 1.88, 0, 0.36, 0.95, 0.3, [0, 0, 1], -0.62));
  armour.append(SPHERE, m(1.38, 2.18, 0, 0.62, 0.28, 0.26, [0, 0, 1], -0.5));
  horse.append(CYLINDER, m(1.18, 2.36, 0.09, 0.04, 0.18, 0.04));
  horse.append(CYLINDER, m(1.18, 2.36, -0.09, 0.04, 0.18, 0.04));
  // Rider: thighs over the barrel, torso, pauldrons, arms, helmet with crest.
  armour.append(CYLINDER, m(0.1, 1.86, 0.3, 0.16, 0.62, 0.16, [0, 0, 1], 1.15));
  armour.append(CYLINDER, m(0.1, 1.86, -0.3, 0.16, 0.62, 0.16, [0, 0, 1], 1.15));
  armour.append(CYLINDER, m(0.28, 1.55, 0.34, 0.13, 0.52, 0.13));
  armour.append(CYLINDER, m(0.28, 1.55, -0.34, 0.13, 0.52, 0.13));
  armour.append(SPHERE, m(-0.02, 2.4, 0, 0.42, 0.78, 0.5));
  armour.append(SPHERE, m(0.0, 2.72, 0.24, 0.2, 0.16, 0.2));
  armour.append(SPHERE, m(0.0, 2.72, -0.24, 0.2, 0.16, 0.2));
  armour.append(CYLINDER, m(0.18, 2.42, 0.3, 0.1, 0.5, 0.1, [0, 0, 1], -0.9));
  armour.append(CYLINDER, m(0.12, 2.5, -0.3, 0.1, 0.5, 0.1, [1, 0, 0], 0.5));
  armour.append(SPHERE, m(0.02, 2.96, 0, 0.3, 0.34, 0.28));
  armour.append(SPHERE, m(-0.02, 3.13, 0, 0.12, 0.2, 0.04));
  // Lance: raised in the right hand, couched a little forward.
  lance.append(CYLINDER, m(0.55, 3.0, 0.38, 0.06, 3.6, 0.06, [0, 0, 1], -0.22));
  armourCache = Object.freeze({ horse: horse.build(), armour: armour.build(), caparison: cloth.build(), lance: lance.build() });
  return armourCache;
}

export interface Banner {
  /** The pole from the wall and its finial: metal. */
  readonly pole: BufferGeometry;
  /** The hanging banner: cloth. */
  readonly cloth: BufferGeometry;
}

let bannerCache: Banner | null = null;

/** A heraldic banner hanging from a pole that projects 2.8 m from the wall (+Z) at y = 0; the banner, 1.7 m wide, hangs 2.1 m. Origin on the wall face. */
export function banner(): Banner {
  if (bannerCache !== null) return bannerCache;
  const pole = new MeshBuilder();
  const cloth = new MeshBuilder();
  pole.append(CYLINDER, m(0, 0, 1.4, 0.06, 2.8, 0.06, [1, 0, 0], Math.PI / 2));
  pole.append(SPHERE, m(0, 0, 2.85, 0.14, 0.14, 0.14));
  pole.box([-0.12, -0.12, 0], [0.12, 0.12, 0.08]);
  // A square-cut banner under the outer half of the pole (P7).
  const outline: [number, number][] = [
    [0.95, 0],
    [2.65, 0],
    [2.65, -2.1],
    [0.95, -2.1],
  ];
  const t = 0.02;
  // (z, y) on axes (+Z, +Y) faces −X, so that copy goes on the −X side; the +X side mirrors y to face +X.
  cloth.planar(outline.map(([z, y]) => [z, y] as const), [], new Vector3(-t, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0));
  cloth.planar(outline.map(([z, y]) => [z, -y] as const), [], new Vector3(t, 0, 0), new Vector3(0, 0, 1), new Vector3(0, -1, 0));
  bannerCache = Object.freeze({ pole: pole.build(), cloth: sheet(cloth.build()) });
  return bannerCache;
}

const chandelierCache = new Map<number, BufferGeometry>();

/** A ring chandelier 3.2 m across with candle sconces, hung on a rod `drop` metres long. Origin at the rod's top. */
export function chandelier(drop: number): BufferGeometry {
  const cached = chandelierCache.get(drop);
  if (cached !== undefined) return cached;
  const b = new MeshBuilder();
  b.append(CYLINDER, m(0, -drop / 2, 0, 0.05, drop, 0.05));
  const ring = new TorusGeometry(1.6, 0.07, 6, 32);
  b.append(ring, m(0, -drop, 0, 1, 1, 1, [1, 0, 0], Math.PI / 2));
  b.append(new TorusGeometry(1.2, 0.04, 5, 24), m(0, -drop + 0.25, 0, 1, 1, 1, [1, 0, 0], Math.PI / 2));
  for (let k = 0; k < 16; k += 1) {
    const a = (k / 16) * Math.PI * 2;
    b.append(CYLINDER, m(Math.cos(a) * 1.6, -drop + 0.16, Math.sin(a) * 1.6, 0.045, 0.28, 0.045));
  }
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.8;
    const z = Math.sin(a) * 0.8;
    const length = Math.hypot(0.8, 1.2);
    b.append(CYLINDER, m(x, -drop + 0.6, z, 0.025, length, 0.025, [Math.sin(a), 0, -Math.cos(a)], Math.atan2(0.8, 1.2)));
  }
  const built = b.build();
  chandelierCache.set(drop, built);
  return built;
}

export interface OrganCase {
  readonly case: BufferGeometry;
  readonly pipes: BufferGeometry;
}

let organCache: OrganCase | null = null;

/** An organ case 5.4 m wide, 1.4 m deep and 5.6 m tall with three towers of display pipes, front toward +Z. Origin at its bottom centre at the back. */
export function organCase(): OrganCase {
  if (organCache !== null) return organCache;
  const c = new MeshBuilder();
  const p = new MeshBuilder();
  c.box([-2.7, 0, 0], [2.7, 1.3, 1.4]);
  c.box([-2.7, 1.3, 0], [2.7, 5.2, 0.9]);
  c.box([-2.85, 5.2, 0], [2.85, 5.6, 1.1]);
  for (const [x, w] of [[-1.9, 1.4], [0, 1.8], [1.9, 1.4]] as const) {
    const count = w > 1.5 ? 7 : 5;
    for (let k = 0; k < count; k += 1) {
      const px = x - w / 2 + (w * (k + 0.5)) / count;
      const height = 2.4 + (x === 0 ? 1.0 : 0.5) - Math.abs(k - (count - 1) / 2) * 0.22;
      p.append(CYLINDER, m(px, 1.35 + height / 2, 1.0, 0.16, height, 0.16));
    }
  }
  organCache = Object.freeze({ case: c.build(), pipes: p.build() });
  return organCache;
}
