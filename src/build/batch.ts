/**
 * Batching (docs/design/spec.md, Build-step API): within one step, pieces that share the same geometry object and the same material object become one InstancedMesh.
 * Instances are stored in arrival order, so the visible ones are always a prefix of the mesh and `mesh.count` is its visibility.
 * Bound: grouping is by object identity, never by value, so two equal-looking geometries stay two meshes; steps never share a mesh.
 */
import { Box3, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { PieceBox } from './motion.js';

/** Bounding spheres of moving meshes are padded by this factor, for the overshoot of `pop`. */
const CULL_PAD = 1.1;

/** True unless the material opts out (`userData.castShadow === false`) or is transparent: glass and water never cast shadows. */
export function castsShadow(material: Material): boolean {
  return material.userData['castShadow'] !== false && !material.transparent;
}

export interface BatchInput {
  readonly geometry: BufferGeometry;
  readonly material: Material;
}

export interface Batches {
  readonly meshes: readonly InstancedMesh[];
  /** Per piece (input order): its mesh index and its instance slot. */
  readonly meshOf: Int32Array;
  readonly slotOf: Int32Array;
}

/**
 * Groups pieces by (geometry, material) identity, in order of first appearance, and gives each piece a slot in its group in `arrival` order.
 * `arrival` lists every piece index once, earliest first.
 */
export function batchPieces(stepId: string, pieces: readonly BatchInput[], arrival: Int32Array): Batches {
  const groups = new Map<BufferGeometry, Map<Material, number[]>>();
  const ordered: number[][] = [];
  for (const piece of pieces) {
    let byMaterial = groups.get(piece.geometry);
    if (byMaterial === undefined) {
      byMaterial = new Map();
      groups.set(piece.geometry, byMaterial);
    }
    if (!byMaterial.has(piece.material)) {
      const list: number[] = [];
      byMaterial.set(piece.material, list);
      ordered.push(list);
    }
  }
  for (const index of arrival) {
    const piece = pieces[index];
    if (piece === undefined) throw new Error(`batchPieces: arrival names piece ${String(index)} of ${String(pieces.length)}.`);
    groups.get(piece.geometry)?.get(piece.material)?.push(index);
  }
  const meshOf = new Int32Array(pieces.length);
  const slotOf = new Int32Array(pieces.length);
  const meshes = ordered.map((list, meshIndex) => {
    const first = pieces[list[0] ?? -1];
    if (first === undefined) throw new Error(`batchPieces: step "${stepId}" has an empty group.`);
    const mesh = new InstancedMesh(first.geometry, first.material, list.length);
    mesh.name = `${stepId}#${String(meshIndex)}`;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(list.length * 3).fill(1), 3);
    mesh.instanceColor.setUsage(DynamicDrawUsage);
    mesh.castShadow = castsShadow(first.material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.count = 0;
    mesh.visible = false;
    list.forEach((pieceIndex, slot) => {
      meshOf[pieceIndex] = meshIndex;
      slotOf[pieceIndex] = slot;
    });
    return mesh;
  });
  return { meshes, meshOf, slotOf };
}

export function boxOf(box: PieceBox): Box3 {
  return new Box3(new Vector3(box.minX, box.minY, box.minZ), new Vector3(box.maxX, box.maxY, box.maxZ));
}

/** Sets a mesh's culling bounds to `box` (the union of its pieces' final and start boxes), padded for overshoot. Three.js then never recomputes them from `count`. */
export function setCullBounds(mesh: InstancedMesh, box: Box3): void {
  mesh.boundingBox = box.clone();
  const sphere = new Sphere();
  box.getBoundingSphere(sphere);
  sphere.radius *= CULL_PAD;
  mesh.boundingSphere = sphere;
}
