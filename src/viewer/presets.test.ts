/**
 * Camera framing (src/viewer/presets.ts): `fitBox` and `resolvePreset`, checked by projecting the box's corners through a three.js camera placed at
 * the returned pose, not by recomputing the fit.
 * Bound: perspective cameras with +Y up (+X for a straight-down view, as fitBox frames it), no WebGL; 200 seeded random boxes, directions, fields of
 * view and aspects, plus every preset of PRESETS against a site-sized box.
 */
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { random } from '../build/testing.js';
import { DEFAULT_FOV, PRESETS, fitBox, resolvePreset } from './presets.js';
import type { CameraPose } from './presets.js';

/** How the box's corners fall in the view from `pose` at `aspect`: the largest |x| or |y| in NDC, and the nearest depth in front of the camera. */
function framing(pose: CameraPose, aspect: number, box: Box3): { ndc: number; nearest: number } {
  const camera = new PerspectiveCamera(pose.fov, aspect, 0.01, 1e7);
  const back = pose.position.clone().sub(pose.target).normalize();
  camera.up.set(Math.abs(back.y) > 0.999 ? 1 : 0, Math.abs(back.y) > 0.999 ? 0 : 1, 0);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  let ndc = 0;
  let nearest = Infinity;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new Vector3(x, y, z);
        nearest = Math.min(nearest, pose.position.clone().sub(corner).dot(back));
        const p = corner.project(camera);
        ndc = Math.max(ndc, Math.abs(p.x), Math.abs(p.y));
      }
    }
  }
  return { ndc, nearest };
}

const SITE = new Box3(new Vector3(-230, -8, -260), new Vector3(200, 40, 40));

describe('fitBox', () => {
  it('looks at the box centre from the given direction with every corner in frame, touching the edge when the margin is 1', () => {
    const rand = random(31);
    const problems: string[] = [];
    for (let k = 0; k < 200; k += 1) {
      const centre = new Vector3(rand() * 200 - 100, rand() * 40, rand() * 200 - 100);
      const half = new Vector3(0.05 + rand() * 150, 0.05 + rand() * 40, 0.05 + rand() * 150);
      const box = new Box3(centre.clone().sub(half), centre.clone().add(half));
      const direction = k % 25 === 0 ? new Vector3(-0.002, 1, 0) : new Vector3(rand() * 2 - 1, rand() * 2 - 0.3, rand() * 2 - 1);
      if (direction.lengthSq() < 1e-6) continue;
      const fov = 20 + rand() * 60;
      const aspect = 0.4 + rand() * 2.6;
      const margin = k % 2 === 0 ? 1 : 1 + rand() * 0.5;
      const pose = fitBox(box, direction, fov, aspect, margin);
      const seen = framing(pose, aspect, box);
      const distance = pose.position.distanceTo(pose.target);
      const along = pose.position.clone().sub(pose.target).normalize().dot(direction.clone().normalize());
      if (pose.target.distanceTo(centre) > 1e-9) problems.push(`case ${String(k)}: target ${pose.target.toArray().join(',')} is not the centre`);
      if (along < 1 - 1e-12) problems.push(`case ${String(k)}: camera off the given direction (cos ${String(along)})`);
      if (pose.fov !== fov) problems.push(`case ${String(k)}: fov ${String(pose.fov)} instead of ${String(fov)}`);
      if (!(seen.nearest > 0)) problems.push(`case ${String(k)}: a corner lies behind the camera`);
      if (seen.ndc > 1 + 1e-9) problems.push(`case ${String(k)}: a corner lies outside the frame (|ndc| ${String(seen.ndc)})`);
      if (margin === 1 && distance > 5 + 1e-9 && seen.ndc < 1 - 1e-6) problems.push(`case ${String(k)}: a margin-1 fit leaves room (|ndc| ${String(seen.ndc)})`);
      if (distance < 5 * margin - 1e-9) problems.push(`case ${String(k)}: closer than the 5 m floor (${String(distance)})`);
    }
    expect(problems).toEqual([]);
  });

  it('stands at least 5 m (times the margin) from a tiny box', () => {
    const box = new Box3(new Vector3(1, 1, 1), new Vector3(1.01, 1.01, 1.01));
    const pose = fitBox(box, new Vector3(1, 1, 1), DEFAULT_FOV, 1.6, 1.2);
    expect(pose.position.distanceTo(pose.target)).toBeCloseTo(6, 9);
  });
});

describe('resolvePreset', () => {
  it('puts a look preset exactly where it says, a hair beside the axis when it names an up', () => {
    const looks = PRESETS.filter((p) => p.camera.kind === 'look');
    expect(looks.length).toBeGreaterThan(0);
    for (const preset of looks) {
      if (preset.camera.kind !== 'look') continue;
      const pose = resolvePreset(preset, SITE, 1.7);
      const declared = new Vector3(...preset.camera.position);
      const target = new Vector3(...preset.camera.target);
      expect(pose.target.toArray(), preset.id).toEqual(target.toArray());
      expect(pose.fov, preset.id).toBe(preset.camera.fov ?? DEFAULT_FOV);
      if (preset.camera.up === undefined) {
        expect(pose.position.toArray(), preset.id).toEqual(declared.toArray());
      } else {
        const shift = pose.position.clone().sub(declared);
        expect(shift.length(), preset.id).toBeCloseTo(1e-3 * declared.distanceTo(target), 9);
        expect(shift.normalize().dot(new Vector3(...preset.camera.up).normalize()), preset.id).toBeCloseTo(-1, 9);
      }
    }
  });

  it('frames the model bounds from a fit preset direction with every corner in frame', () => {
    const fits = PRESETS.filter((p) => p.camera.kind === 'fit');
    expect(fits.length).toBeGreaterThan(0);
    for (const aspect of [0.46, 1.78, 2.6]) {
      for (const preset of fits) {
        if (preset.camera.kind !== 'fit') continue;
        const pose = resolvePreset(preset, SITE, aspect);
        const seen = framing(pose, aspect, SITE);
        expect(pose.target.distanceTo(SITE.getCenter(new Vector3())), preset.id).toBeLessThan(1e-9);
        expect(pose.position.clone().sub(pose.target).normalize().dot(new Vector3(...preset.camera.direction).normalize()), preset.id).toBeCloseTo(1, 12);
        expect(seen.nearest, `${preset.id} at ${String(aspect)}`).toBeGreaterThan(0);
        expect(seen.ndc, `${preset.id} at ${String(aspect)}`).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('frames a 100 m cube round the origin when the model has no bounds yet', () => {
    const preset = PRESETS.find((p) => p.camera.kind === 'fit');
    if (preset === undefined) throw new Error('No fit preset.');
    const pose = resolvePreset(preset, new Box3(), 1.5);
    expect(pose.target.length()).toBeLessThan(1e-9);
    expect(framing(pose, 1.5, new Box3(new Vector3(-50, -50, -50), new Vector3(50, 50, 50))).ndc).toBeLessThanOrEqual(1 + 1e-9);
  });
});
