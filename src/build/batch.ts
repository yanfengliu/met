/**
 * Batching (docs/design/spec.md, Build-step API): within one step, pieces that share the same geometry object and the same material object become one InstancedMesh,
 * except that a door's pieces (tag kind 'door') batch only with pieces of the same door, so each door has meshes of its own.
 * Instances are stored in the order the step added its pieces.
 * Bound: grouping is by object identity, never by value, so two equal-looking geometries stay two meshes; steps never share a mesh.
 */
import { InstancedMesh, Sphere } from 'three';
import type { Box3, BufferGeometry, Material } from 'three';

import type { PieceTag } from './types.js';

/** True unless the material opts out (`userData.castShadow === false`) or is transparent: glass and water never cast shadows. */
export function castsShadow(material: Material): boolean {
  return material.userData['castShadow'] !== false && !material.transparent;
}

export interface BatchInput {
  readonly geometry: BufferGeometry;
  readonly material: Material;
  readonly tag?: PieceTag | null;
}

export interface Batches {
  readonly meshes: readonly InstancedMesh[];
  /** Per piece (input order): its mesh index and its instance slot. */
  readonly meshOf: Int32Array;
  readonly slotOf: Int32Array;
}

/** The part of a piece's batch key beyond its geometry and material: its door's id, or '' for every other piece. */
const doorOf = (piece: BatchInput): string => (piece.tag?.kind === 'door' ? `door:${piece.tag.id}` : '');

/** Groups pieces by (geometry, material) identity, and a door's pieces by their door too, in order of first appearance; each piece's slot is its place in its group. */
export function batchPieces(stepId: string, pieces: readonly BatchInput[]): Batches {
  const groups = new Map<BufferGeometry, Map<Material, Map<string, number[]>>>();
  const ordered: number[][] = [];
  pieces.forEach((piece, index) => {
    let byMaterial = groups.get(piece.geometry);
    if (byMaterial === undefined) {
      byMaterial = new Map();
      groups.set(piece.geometry, byMaterial);
    }
    let byDoor = byMaterial.get(piece.material);
    if (byDoor === undefined) {
      byDoor = new Map();
      byMaterial.set(piece.material, byDoor);
    }
    const door = doorOf(piece);
    let list = byDoor.get(door);
    if (list === undefined) {
      list = [];
      byDoor.set(door, list);
      ordered.push(list);
    }
    list.push(index);
  });
  const meshOf = new Int32Array(pieces.length);
  const slotOf = new Int32Array(pieces.length);
  const meshes = ordered.map((list, meshIndex) => {
    const first = pieces[list[0] ?? -1];
    if (first === undefined) throw new Error(`batchPieces: step "${stepId}" has an empty group.`);
    const mesh = new InstancedMesh(first.geometry, first.material, list.length);
    mesh.name = `${stepId}#${String(meshIndex)}`;
    mesh.castShadow = castsShadow(first.material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    list.forEach((pieceIndex, slot) => {
      meshOf[pieceIndex] = meshIndex;
      slotOf[pieceIndex] = slot;
    });
    return mesh;
  });
  return { meshes, meshOf, slotOf };
}

/** Sets a mesh's culling bounds to `box`, the union of its pieces' world boxes, so three.js never recomputes them. */
export function setCullBounds(mesh: InstancedMesh, box: Box3): void {
  mesh.boundingBox = box.clone();
  mesh.boundingSphere = box.getBoundingSphere(new Sphere());
}
