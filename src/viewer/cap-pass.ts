/**
 * The section cut's cap pass (src/viewer/section-cut.ts): the back faces, in the cut colour, of the pieces the cut passes through, and of no other.
 * Each capped mesh has a stand-in in the pass's own scene that shares its geometry and holds only the instances whose current bounds the plane
 * crosses (bottom under it, top over it), chosen again before each draw, so a piece still arriving is judged where it is. A piece wholly under
 * the cut keeps its own colour however close its faces lie, which the cap's depth bias would otherwise let its back faces beat where the depth
 * buffer is coarse (work unit 1, review 3, U10: the Hunt galleries' 5 cm lead roof under a 27.4 m cut, seen with a near plane of 3 cm).
 * Reads the model's meshes and writes only its own stand-ins, so the timeline's state is never touched.
 * Bound: a piece counts by the bounds of its geometry's box at its matrix, so a piece the cut passes through only in that box's empty corners is capped.
 */
import { InstancedMesh, Scene } from 'three';
import type { Box3, Material, Object3D } from 'three';

/** Whether `object` and every parent it hangs from are visible. */
function shown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o !== null; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * The lowest and highest Y over the box `local` taken through the column-major matrix `m` (16 numbers from `offset`) after `world`'s second row:
 * the world height range of one instance of a geometry with that box.
 */
export function heightRange(local: Box3, m: ArrayLike<number>, offset: number, world: ArrayLike<number>): [number, number] {
  const [w0, w1, w2, w3] = [world[1] ?? 0, world[5] ?? 0, world[9] ?? 0, world[13] ?? 0];
  // The world matrix's second row times each column of the instance's: how far one local metre along X, Y and Z, and the origin, rise.
  const row = (j: number): number => w0 * (m[offset + j * 4] ?? 0) + w1 * (m[offset + j * 4 + 1] ?? 0) + w2 * (m[offset + j * 4 + 2] ?? 0) + w3 * (m[offset + j * 4 + 3] ?? 0);
  const [rx, ry, rz] = [row(0), row(1), row(2)];
  const base = row(3);
  const low = base + Math.min(rx * local.min.x, rx * local.max.x) + Math.min(ry * local.min.y, ry * local.max.y) + Math.min(rz * local.min.z, rz * local.max.z);
  const high = base + Math.max(rx * local.min.x, rx * local.max.x) + Math.max(ry * local.min.y, ry * local.max.y) + Math.max(rz * local.min.z, rz * local.max.z);
  return [low, high];
}

export class CapPass {
  readonly scene = new Scene();
  private readonly pairs: { readonly source: InstancedMesh; readonly proxy: InstancedMesh }[];

  constructor(capped: readonly InstancedMesh[], material: Material) {
    this.pairs = capped.map((source) => {
      if (source.geometry.boundingBox === null) source.geometry.computeBoundingBox();
      const proxy = new InstancedMesh(source.geometry, material, Math.max(1, source.instanceMatrix.count));
      proxy.name = `cap:${source.name}`;
      proxy.matrixAutoUpdate = false;
      proxy.count = 0;
      proxy.visible = false;
      this.scene.add(proxy);
      return { source, proxy };
    });
  }

  /** Puts into the stand-ins the instances, drawn now, that the plane at `height` passes through; returns how many there are. */
  update(height: number): number {
    let total = 0;
    for (const { source, proxy } of this.pairs) {
      const local = source.geometry.boundingBox;
      let k = 0;
      if (local !== null && source.count > 0 && shown(source)) {
        const from = source.instanceMatrix.array;
        const to = proxy.instanceMatrix.array;
        const world = source.matrixWorld.elements;
        for (let i = 0; i < source.count; i += 1) {
          const [low, high] = heightRange(local, from, i * 16, world);
          if (!(low < height && high > height)) continue;
          for (let e = 0; e < 16; e += 1) to[k * 16 + e] = from[i * 16 + e] ?? 0;
          k += 1;
        }
      }
      proxy.count = k;
      proxy.visible = k > 0;
      if (k > 0) {
        proxy.matrix.copy(source.matrixWorld);
        proxy.matrixWorldNeedsUpdate = true;
        proxy.layers.mask = source.layers.mask;
        // The source's culling bounds hold every pose of its pieces, so they hold the stand-in's; without them the stand-in is never culled.
        proxy.boundingSphere = source.boundingSphere;
        proxy.frustumCulled = source.frustumCulled && source.boundingSphere !== null;
        proxy.instanceMatrix.clearUpdateRanges();
        proxy.instanceMatrix.addUpdateRange(0, k * 16);
        proxy.instanceMatrix.needsUpdate = true;
      }
      total += k;
    }
    return total;
  }
}
