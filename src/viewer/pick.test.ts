/**
 * The zoom's pick (src/viewer/pick.ts) on one instanced box: met where it is drawn, passed through when the camera's layers do not draw its mesh (the
 * landscape a floor view hides), and passed through above the section cut on a material the cut clips.
 * Bound: one box and horizontal rays, no WebGL.
 */
import { BoxGeometry, InstancedMesh, Layers, Matrix4, MeshStandardMaterial, Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { GeometryBvhs } from '../walk/bvh-cache.js';
import { ModelPicker } from './pick.js';

function boxAhead(): InstancedMesh {
  const geometry = new BoxGeometry(2, 2, 2);
  geometry.computeBoundingBox();
  const mesh = new InstancedMesh(geometry, new MeshStandardMaterial(), 1);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 1, -10));
  mesh.computeBoundingSphere();
  return mesh;
}

describe('ModelPicker', () => {
  const ray = new Ray(new Vector3(0, 1, 0), new Vector3(0, 0, -1));

  it('meets a drawn piece and passes through one on no layer the camera draws', () => {
    const mesh = boxAhead();
    const cut = { enabled: false, height: 0 };
    const picker = new ModelPicker([mesh], new GeometryBvhs(), -5, cut, new Layers());
    expect(picker.distance(ray)).toBeCloseTo(9, 9);
    mesh.layers.mask = 0;
    expect(picker.distance(ray)).toBeNull();
    mesh.layers.set(0);
    expect(picker.distance(ray)).toBeCloseTo(9, 9);
  });

  it('passes through a piece above the section cut, as the eye does', () => {
    const mesh = boxAhead();
    const picker = new ModelPicker([mesh], new GeometryBvhs(), -5, { enabled: true, height: 0.5 }, new Layers());
    expect(picker.distance(ray)).toBeNull();
  });
});
