/**
 * The floor view's landscape filter (src/viewer/floor-view.ts) on the real sequence, without WebGL: at each floor's cut it hides every landscape mesh
 * with a standing piece over the cut, with the meshes its objects share, and nothing else; it never hides ground or a building mesh; objects stay
 * whole at any cut; and which meshes hide depends on the cut alone, never on t, while the timeline's own state stays untouched.
 * Bound: what the filter sets (each mesh's layer mask), read here; that the camera then neither draws nor shadows a masked mesh is three.js's
 * layer test, checked by eye in the floor captures and by the canvas in tests/e2e/floors.spec.ts.
 */
import type { InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { firstDifference, snapshot } from '../build/testing.js';
import { Timeline } from '../build/timeline.js';
import type { RestingPiece } from '../build/timeline.js';
import { FloorView, isGround } from './floor-view.js';
import { FLOORS } from './floors.js';
import { cutBySection } from './section-cut.js';

const timeline = new Timeline(SEQUENCE);
const view = new FloorView(timeline.steps, (i) => timeline.restingPieces(i));

interface MeshInfo {
  readonly mesh: InstancedMesh;
  readonly step: string;
  readonly pieces: readonly RestingPiece[];
}

const meshes: MeshInfo[] = timeline.steps.flatMap((step) => {
  const pieces = timeline.restingPieces(step.index);
  return step.meshes.map((mesh, m) => ({ mesh, step: step.def.id, pieces: pieces.filter((p) => p.mesh === m) }));
});
/** Landscape as the section cut defines it (src/viewer/section-cut.ts), not as the filter does, so the filter is checked against it. */
const isLandscape = (mesh: InstancedMesh): boolean => !Array.isArray(mesh.material) && !cutBySection(mesh.material);
const landscape = meshes.filter((m) => isLandscape(m.mesh));
/** The top of a landscape mesh's highest standing (not ground) piece, or -Infinity when all its pieces are ground. */
const standingTop = (info: MeshInfo): number => Math.max(Number.NEGATIVE_INFINITY, ...info.pieces.filter((p) => !isGround(p.box)).map((p) => p.box.max.y));
/** Landscape objects: pieces of one step with the same final matrix, in more than one mesh. */
const objects: readonly (readonly MeshInfo[])[] = (() => {
  const byKey = new Map<string, Set<MeshInfo>>();
  for (const info of landscape) {
    for (const piece of info.pieces) {
      const key = `${info.step} ${piece.matrix.join(',')}`;
      const set = byKey.get(key) ?? new Set<MeshInfo>();
      set.add(info);
      byKey.set(key, set);
    }
  }
  return [...byKey.values()].filter((set) => set.size > 1).map((set) => [...set]);
})();
const hiddenSteps = (): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const info of meshes) if (view.hides(info.mesh)) counts.set(info.step, (counts.get(info.step) ?? 0) + 1);
  return counts;
};
const name = (info: MeshInfo): string => `${info.mesh.name} (${info.step}, ${Array.isArray(info.mesh.material) ? '?' : info.mesh.material.name})`;

describe('floor view landscape filter', () => {
  it('finds the site\'s landscape, its ground and its objects on the real sequence', () => {
    expect(landscape.length).toBeGreaterThan(40);
    const ground = landscape.filter((m) => m.pieces.some((p) => isGround(p.box))).map((m) => m.step);
    expect(new Set(ground)).toEqual(new Set(['site-terrain', 'site-park-paths']));
    expect(objects.length).toBeGreaterThan(5);
  });

  it('hides nothing when no floor is chosen, never a building mesh, and gives every mesh its own mask back', () => {
    view.apply(null);
    expect(view.hidden).toBe(0);
    expect(meshes.filter((m) => view.hides(m.mesh) || m.mesh.layers.mask !== 1).map(name)).toEqual([]);
    for (const floor of FLOORS) {
      view.apply(floor.cut);
      expect(meshes.filter((m) => !isLandscape(m.mesh) && m.mesh.layers.mask !== 1).map(name), `building meshes masked at ${floor.id}`).toEqual([]);
    }
    view.apply(null);
    expect(meshes.filter((m) => m.mesh.layers.mask !== 1).map(name), 'meshes left masked after the floor view ends').toEqual([]);
  });

  it('hides each landscape mesh rising over the cut, with its objects, and only those, at every floor\'s cut and in a sweep', () => {
    const problems: string[] = [];
    for (const cut of [...FLOORS.map((f) => f.cut), ...Array.from({ length: 133 }, (_, k) => -3 + k * 0.25)]) {
      view.apply(cut);
      const over = new Set(landscape.filter((m) => standingTop(m) > cut));
      // A mesh is hidden with cause when it rises over the cut itself or shares an object with one hidden with cause.
      const cause = new Set(over);
      for (let grew = true; grew;) {
        grew = false;
        for (const object of objects) {
          if (!object.some((m) => cause.has(m))) continue;
          for (const m of object) if (!cause.has(m) && standingTop(m) > Number.NEGATIVE_INFINITY) { cause.add(m); grew = true; }
        }
      }
      for (const m of over) if (!view.hides(m.mesh)) problems.push(`at ${cut.toFixed(2)} m: ${name(m)} rises over the cut and shows`);
      for (const m of landscape) if (view.hides(m.mesh) && !cause.has(m)) problems.push(`at ${cut.toFixed(2)} m: ${name(m)} hidden without cause`);
      if (view.hidden !== landscape.filter((m) => view.hides(m.mesh)).length) problems.push(`at ${cut.toFixed(2)} m: hidden counts ${String(view.hidden)}`);
    }
    view.apply(null);
    expect(problems.slice(0, 8)).toEqual([]);
  });

  it('never hides ground: the terrain and the park paths stay at every floor', () => {
    for (const floor of FLOORS) {
      view.apply(floor.cut);
      const lost = landscape.filter((m) => (m.step === 'site-terrain' || m.step === 'site-park-paths') && view.hides(m.mesh)).map(name);
      expect(lost, `ground hidden at the ${floor.id} floor`).toEqual([]);
    }
    view.apply(null);
  });

  it('clears the trees, lamps and plaza poles off the ground floor, trunks with crowns, and keeps the plaza\'s trees for the second floor', () => {
    const cutOf = (id: string): number => FLOORS.find((f) => f.id === id)?.cut ?? Number.NaN;
    view.apply(cutOf('ground'));
    const ground = hiddenSteps();
    for (const id of ['site-trees-park', 'site-park-lamps', 'plaza-grove-trees', 'plaza-allees']) expect(ground.get(id) ?? 0, `${id} meshes hidden at the ground floor`).toBeGreaterThan(0);
    const trees = landscape.filter((m) => m.step === 'site-trees-park');
    expect(trees.filter((m) => !view.hides(m.mesh)).map(name), 'park tree meshes left at the ground floor').toEqual([]);
    view.apply(cutOf('second'));
    const grove = landscape.filter((m) => m.step === 'plaza-grove-trees' && standingTop(m) < cutOf('second'));
    expect(grove.length).toBeGreaterThan(0);
    expect(grove.filter((m) => view.hides(m.mesh)).map(name), 'plaza grove trees under the second floor\'s cut, hidden').toEqual([]);
    view.apply(cutOf('roof-garden'));
    expect(view.hidden, 'landscape hidden at the roof garden').toBe(0);
    view.apply(null);
  });

  it('keeps every object whole at any cut: the meshes of pieces with one final matrix hide together', () => {
    const problems: string[] = [];
    for (let cut = -3; cut <= 30 && problems.length < 5; cut += 0.05) {
      view.apply(cut);
      for (const object of objects) {
        const standing = object.filter((m) => standingTop(m) > Number.NEGATIVE_INFINITY);
        const hidden = standing.filter((m) => view.hides(m.mesh));
        if (hidden.length > 0 && hidden.length < standing.length) problems.push(`at ${cut.toFixed(2)} m: ${hidden.map(name).join(', ')} hidden, ${standing.filter((m) => !view.hides(m.mesh)).map(name).join(', ')} not`);
      }
    }
    view.apply(null);
    expect(problems).toEqual([]);
  });

  it('depends on the cut alone: the same meshes hide whatever t the timeline shows, and its state is untouched', () => {
    const furniture = timeline.steps.find((s) => s.def.id === 'plaza-furniture');
    expect(furniture, 'the plaza-furniture step (motion drop) of src/model/site/plaza.ts').toBeDefined();
    const moving = new Timeline(SEQUENCE);
    moving.evaluate((furniture?.index ?? 0) + 0.5);
    const before = snapshot(moving);
    const late = new FloorView(moving.steps, (i) => moving.restingPieces(i));
    // Every floor's cut and a sweep, so a filter reading the dropping pieces where they are now (up to 1.2 m over their rest) would differ.
    for (const cut of [...FLOORS.map((f) => f.cut), ...Array.from({ length: 133 }, (_, k) => -3 + k * 0.25)]) {
      view.apply(cut);
      late.apply(cut);
      const a = timeline.steps.flatMap((s) => s.meshes.filter((m) => view.hides(m)).map((m) => m.name));
      const b = moving.steps.flatMap((s) => s.meshes.filter((m) => late.hides(m)).map((m) => m.name));
      expect(b, `meshes hidden at a ${cut.toFixed(2)} m cut mid-step vs at rest`).toEqual(a);
    }
    late.apply(null);
    view.apply(null);
    expect(firstDifference(snapshot(moving), before), 'timeline state after the floor view ran').toBeNull();
  });
});
