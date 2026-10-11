/**
 * Lumpy closed shapes for the site: schist outcrops and the magnolias' dense evergreen crowns. A subdivided octahedron is pushed out by seeded bumps,
 * then moved by the caller's `shape`; faces are flat shaded. Each call builds a new geometry, so callers build each variant once and instance it.
 */
import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder } from '../lib/index.js';
import { seeded } from './random.js';

type Tri = readonly [Vector3, Vector3, Vector3];

/** A unit sphere of 8 × 4^levels flat faces, bumped by `bumps` seeded lobes of up to `strength`, then mapped through `shape` (point, radius scale). */
export function lumpy(seed: number, levels: number, bumps: number, strength: number, shape: (p: Vector3) => Vector3): BufferGeometry {
  const random = seeded(seed);
  const px = new Vector3(1, 0, 0);
  const nx = new Vector3(-1, 0, 0);
  const py = new Vector3(0, 1, 0);
  const ny = new Vector3(0, -1, 0);
  const pz = new Vector3(0, 0, 1);
  const nz = new Vector3(0, 0, -1);
  let tris: Tri[] = [[px, py, pz], [pz, py, nx], [nx, py, nz], [nz, py, px], [pz, ny, px], [nx, ny, pz], [nz, ny, nx], [px, ny, nz]];
  for (let level = 0; level < levels; level += 1) {
    tris = tris.flatMap(([a, b, c]): Tri[] => {
      const ab = a.clone().add(b).normalize();
      const bc = b.clone().add(c).normalize();
      const ca = c.clone().add(a).normalize();
      return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]];
    });
  }
  const lobes = Array.from({ length: bumps }, () => ({ d: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), k: strength * (0.4 + 0.6 * random()) }));
  // Shared corners move once, so the surface stays closed.
  const moved = new Map<string, Vector3>();
  const at = (p: Vector3): Vector3 => {
    const key = `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
    let q = moved.get(key);
    if (q === undefined) {
      let r = 1;
      for (const lobe of lobes) r += lobe.k * Math.max(0, p.dot(lobe.d)) ** 2;
      q = shape(p.clone().multiplyScalar(r));
      moved.set(key, q);
    }
    return q;
  };
  const builder = new MeshBuilder();
  for (const [a, b, c] of tris) builder.polygon([at(a), at(b), at(c)]);
  return builder.build();
}
