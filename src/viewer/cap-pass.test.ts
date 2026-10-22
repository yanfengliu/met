/**
 * The cap pass's choice of pieces (src/viewer/cap-pass.ts): an instance's world height range from its geometry's box, its matrix and its mesh's
 * world matrix; and the stand-ins holding, of the instances drawn now, exactly those the plane passes through: not one under the cut (its top at
 * the cut included), not one over it, not one past the mesh's count or on a hidden mesh.
 * Bound: the choice, on numbers, without WebGL; what the GPU draws is checked through the page in tests/e2e/floors.spec.ts.
 */
import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CapPass, heightRange } from './cap-pass.js';

const box = new BoxGeometry(1, 1, 1);
box.computeBoundingBox();
const local = box.boundingBox;
if (local === null) throw new Error('A box geometry without bounds.');

/** A matrix at (x, y, z) turned by `turn` radians about `axis`, scaled by `scale`. */
const placed = (y: number, scale: readonly [number, number, number] = [1, 1, 1], axis = new Vector3(0, 0, 1), turn = 0, x = 0): Matrix4 =>
  new Matrix4().compose(new Vector3(x, y, 0), new Quaternion().setFromAxisAngle(axis, turn), new Vector3(...scale));

/** A mesh of the unit box with one instance per matrix, under `parent` if given. */
function meshOf(matrices: readonly Matrix4[], parent?: Group): InstancedMesh {
  const mesh = new InstancedMesh(box, new MeshBasicMaterial(), matrices.length);
  matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); });
  if (parent !== undefined) parent.add(mesh);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** The heights of the instances the pass holds for `mesh`, by their matrices' translation, to the millimetre (they are kept in 32-bit floats). */
function held(pass: CapPass, index: number): number[] {
  const proxy = pass.scene.children[index];
  if (!(proxy instanceof InstancedMesh)) throw new Error(`No stand-in ${String(index)}.`);
  const m = new Matrix4();
  return Array.from({ length: proxy.count }, (_, i) => { proxy.getMatrixAt(i, m); return Math.round(new Vector3().setFromMatrixPosition(m).y * 1000) / 1000; });
}

describe('heightRange', () => {
  it('spans a box at its matrix, turned, scaled and under a moved parent', () => {
    expect(heightRange(local, placed(10).elements, 0, new Matrix4().elements)).toEqual([9.5, 10.5]);
    // Turned a quarter about Z with 4 m along X: the 4 m now stands up.
    const [low, high] = heightRange(local, placed(10, [4, 1, 1], new Vector3(0, 0, 1), Math.PI / 2).elements, 0, new Matrix4().elements);
    expect(low).toBeCloseTo(8, 12);
    expect(high).toBeCloseTo(12, 12);
    // A parent raised 5 m; the instance read from the middle of a longer array.
    const array = [...new Matrix4().elements, ...placed(10).elements];
    expect(heightRange(local, array, 16, new Matrix4().makeTranslation(0, 5, 0).elements)).toEqual([14.5, 15.5]);
  });
});

describe('CapPass', () => {
  it('holds, of the instances drawn now, only those the plane passes through', () => {
    // Pieces 1 m tall at heights 18 (under 27.4), 25 to 30 (through it), top at 27.4 exactly (under), 29 (over), and one past the mesh's count.
    const mesh = meshOf([placed(18), placed(27.5, [1, 5, 1]), placed(26.9), placed(29), placed(27.4)]);
    mesh.count = 4;
    const pass = new CapPass([mesh], new MeshBasicMaterial());
    expect(pass.update(27.4)).toBe(1);
    expect(held(pass, 0)).toEqual([27.5]);
    // Lower, the cut passes through the first piece and the third, and the tall one: the stand-in follows.
    expect(pass.update(18.2)).toBe(1);
    expect(held(pass, 0)).toEqual([18]);
    expect(pass.update(26.95)).toBe(2);
    expect(held(pass, 0)).toEqual([27.5, 26.9]);
    // Over everything, nothing is cut.
    expect(pass.update(40)).toBe(0);
    expect(pass.scene.children[0]?.visible).toBe(false);
  });

  it('holds nothing of a mesh that is hidden, itself or by a parent, and follows the mesh as it moves', () => {
    const parent = new Group();
    const mesh = meshOf([placed(10), placed(20)], parent);
    const pass = new CapPass([mesh], new MeshBasicMaterial());
    expect(pass.update(10)).toBe(1);
    parent.visible = false;
    expect(pass.update(10)).toBe(0);
    parent.visible = true;
    mesh.setMatrixAt(1, placed(10.2));
    mesh.instanceMatrix.needsUpdate = true;
    expect(pass.update(10)).toBe(2);
    expect(held(pass, 0)).toEqual([10, 10.2]);
  });
});
