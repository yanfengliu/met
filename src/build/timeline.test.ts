/**
 * Timeline: every step built once, the batching rules and step lights (docs/design/spec.md, Build-step API: Batching, Lights).
 * Built pieces are checked against the kit itself: for the synthetic fixture and the real sequence, each mesh shows all its pieces and holds exactly the
 * float32 matrices `kit.add` (or `kit.addTagged`) was given with its geometry and material, and a door's piece with its door, recorded by wrapping
 * each step's build.
 * Bound: matrices compare in float32, as the instance buffers hold them.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, PointLight } from 'three';
import type { BufferGeometry, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from './chapters.js';
import { SEQUENCE } from './sequence.js';
import { firstDifference, fixtureSteps, snapshot } from './testing.js';
import { MAX_LIGHTS, Timeline } from './timeline.js';
import type { StepDef } from './types.js';

interface Added {
  readonly geometry: BufferGeometry;
  readonly material: Material;
  readonly matrix: Matrix4;
  /** The door the piece is part of, or '' for any other piece: a door's pieces batch only with its own (src/build/batch.ts). */
  readonly door: string;
}

/** `steps` with each build wrapped to record what it hands `kit.add` and `kit.addTagged`, so the pieces are the very ones the timeline built from. */
function recording(steps: readonly StepDef[]): { readonly steps: StepDef[]; readonly added: Added[][] } {
  const added: Added[][] = steps.map(() => []);
  const wrapped = steps.map((step, i): StepDef => ({
    ...step,
    build(kit) {
      step.build({
        add(geometry, material, matrix) {
          added[i]?.push({ geometry, material, matrix: matrix.clone(), door: '' });
          kit.add(geometry, material, matrix);
        },
        addTagged(geometry, material, matrix, tag) {
          added[i]?.push({ geometry, material, matrix: matrix.clone(), door: tag.kind === 'door' ? tag.id : '' });
          kit.addTagged(geometry, material, matrix, tag);
        },
        light(light) {
          kit.light(light);
        },
      });
    },
  }));
  return { steps: wrapped, added };
}

const key = (e: ArrayLike<number>, offset = 0): string => Array.from({ length: 16 }, (_, i) => Math.fround(e[offset + i] ?? Number.NaN)).join(',');

/**
 * Checked against the kit itself: each mesh shows all its pieces, and its instance matrices are, as a multiset in float32, exactly the matrices
 * `kit.add` was given with that mesh's geometry and material (and door). One message per mismatch; slot order is the batching tests'.
 */
function builtMismatches(added: readonly (readonly Added[])[], timeline: Timeline): string[] {
  const problems: string[] = [];
  timeline.steps.forEach((built, i) => {
    const pieces = added[i] ?? [];
    const groups = new Map<BufferGeometry, Map<Material, Map<string, string[]>>>();
    for (const p of pieces) {
      const byMaterial = groups.get(p.geometry) ?? new Map<Material, Map<string, string[]>>();
      groups.set(p.geometry, byMaterial);
      const byDoor = byMaterial.get(p.material) ?? new Map<string, string[]>();
      byMaterial.set(p.material, byDoor);
      byDoor.set(p.door, [...(byDoor.get(p.door) ?? []), key(p.matrix.elements)]);
    }
    let matched = 0;
    for (const mesh of built.meshes) {
      const tag = timeline.tagOf(mesh, 0);
      const expected = Array.isArray(mesh.material) ? undefined : groups.get(mesh.geometry)?.get(mesh.material)?.get(tag?.kind === 'door' ? tag.id : '');
      if (expected === undefined) {
        problems.push(`${built.def.id}: mesh ${mesh.name} has no kit.add pieces of its geometry and material`);
        continue;
      }
      matched += 1;
      if (!mesh.visible || mesh.count !== expected.length) problems.push(`${built.def.id}: mesh ${mesh.name} shows ${String(mesh.visible ? mesh.count : 0)} of its ${String(expected.length)} pieces`);
      const actual = Array.from({ length: mesh.instanceMatrix.count }, (_, s) => key(mesh.instanceMatrix.array, s * 16)).sort();
      const wanted = [...expected].sort();
      const wrong = actual.filter((a, j) => a !== wanted[j]).length + Math.abs(actual.length - wanted.length);
      if (wrong > 0) problems.push(`${built.def.id}: mesh ${mesh.name} holds ${String(wrong)} instance matrices other than its kit.add matrices`);
    }
    const pairs = [...groups.values()].reduce((n, m) => n + [...m.values()].reduce((d, doors) => d + doors.size, 0), 0);
    if (matched !== pairs) problems.push(`${built.def.id}: ${String(pairs)} geometry and material pairs but ${String(matched)} meshes for them`);
  });
  return problems;
}

describe('the built timeline', () => {
  const steps = fixtureSteps();

  it('holds the matrix kit.add was given for every piece, shown, in the mesh of its geometry and material', () => {
    for (const source of [steps, SEQUENCE]) {
      const recorded = recording(source);
      const timeline = new Timeline(recorded.steps);
      expect(recorded.added.flat().length, 'pieces recorded').toBe(timeline.stats().pieces);
      expect(builtMismatches(recorded.added, timeline)).toEqual([]);
    }
  });

  it('reports every piece of a step with its mesh, final matrix and world box, in the order the step added them, and writes nothing the scene shows', () => {
    const recorded = recording(steps);
    const timeline = new Timeline(recorded.steps);
    const before = snapshot(timeline);
    timeline.steps.forEach((step, i) => {
      const pieces = timeline.restingPieces(i);
      const wanted = (recorded.added[i] ?? []).map((p) => `${p.geometry.uuid} ${p.material.uuid} ${key(p.matrix.elements)}`);
      const got = pieces.map((p) => {
        const mesh = step.meshes[p.mesh];
        const material = mesh === undefined || Array.isArray(mesh.material) ? undefined : mesh.material;
        return `${mesh?.geometry.uuid ?? '?'} ${material?.uuid ?? '?'} ${key(p.matrix)}`;
      });
      expect(got, `${step.def.id}: its pieces vs kit.add, in order`).toEqual(wanted);
      for (const p of pieces) {
        const box = step.meshes[p.mesh]?.geometry.boundingBox?.clone().applyMatrix4(new Matrix4().fromArray(p.matrix));
        expect(box?.equals(p.box), `${step.def.id}: a piece's box is its geometry's box at its final matrix`).toBe(true);
      }
    });
    expect(firstDifference(snapshot(timeline), before), 'meshes after restingPieces').toBeNull();
    expect(() => timeline.restingPieces(steps.length)).toThrow(/there is no step 12; steps run from 0 to 11/);
  });

  it('gives the same meshes, matrices and lights however often it is built', () => {
    expect(firstDifference(snapshot(new Timeline(steps)), snapshot(new Timeline(steps)))).toBeNull();
  });

  it('bounds every mesh by its pieces, for culling, and the timeline by every step', () => {
    const timeline = new Timeline(steps);
    for (const [i, step] of timeline.steps.entries()) {
      for (const piece of timeline.restingPieces(i)) {
        const mesh = step.meshes[piece.mesh];
        expect(mesh?.boundingBox?.containsBox(piece.box), `${step.def.id}: ${mesh?.name ?? '?'} bounds its piece`).toBe(true);
        expect(step.bounds.containsBox(piece.box)).toBe(true);
      }
      expect(timeline.bounds.containsBox(step.bounds)).toBe(true);
    }
  });
});

describe('batching', () => {
  const cube = new BoxGeometry(1, 1, 1);
  const otherCube = new BoxGeometry(1, 1, 1);
  const a = new MeshStandardMaterial();
  const b = new MeshStandardMaterial();
  const at = (x: number): Matrix4 => new Matrix4().makeTranslation(x, 0, 0);
  const step = (id: string, build: StepDef['build']): StepDef => ({ id, chapter: CHAPTERS[0].id, title: id, build });

  it('makes one InstancedMesh per (geometry, material) object pair within a step, by identity, never by value, its slots in the order the pieces were added', () => {
    const timeline = new Timeline([
      step('one', (kit) => {
        kit.add(cube, a, at(0));
        kit.add(cube, a, at(2));
        kit.add(cube, b, at(4));
        kit.add(otherCube, a, at(6));
        kit.add(cube, a, at(8));
      }),
    ]);
    const meshes = timeline.steps[0]?.meshes ?? [];
    expect(meshes.map((m) => [m.geometry === cube ? 'cube' : 'other', m.material === a ? 'a' : 'b', m.instanceMatrix.count, m.count, m.visible])).toEqual([
      ['cube', 'a', 3, 3, true],
      ['cube', 'b', 1, 1, true],
      ['other', 'a', 1, 1, true],
    ]);
    // Each mesh holds the matrices given with its own pair, in the order they were added: X of each instance's translation.
    expect(meshes.map((m) => Array.from({ length: m.instanceMatrix.count }, (_, s) => m.instanceMatrix.array[s * 16 + 12]))).toEqual([[0, 2, 8], [4], [6]]);
  });

  it('never shares a mesh between steps, even for the same geometry and material', () => {
    const timeline = new Timeline([step('one', (kit) => { kit.add(cube, a, at(0)); }), step('two', (kit) => { kit.add(cube, a, at(1)); })]);
    const [first, second] = timeline.steps;
    expect(first?.meshes[0]).not.toBe(second?.meshes[0]);
    expect(first?.group.children).toContain(first?.meshes[0]);
    expect(second?.group.children).not.toContain(first?.meshes[0]);
  });

  it('turns off shadow casting for transparent materials and for userData.castShadow === false', () => {
    const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.3 });
    const lawn = new MeshStandardMaterial();
    lawn.userData['castShadow'] = false;
    const timeline = new Timeline([step('mats', (kit) => { kit.add(cube, a, at(0)); kit.add(cube, glass, at(1)); kit.add(cube, lawn, at(2)); })]);
    expect(timeline.steps[0]?.meshes.map((m) => m.castShadow)).toEqual([true, false, false]);
  });

  it('rejects a step with no piece and a NaN matrix, naming the step', () => {
    expect(() => new Timeline([step('empty', () => undefined)])).toThrow(/Step "empty": build\(\) added no piece/);
    const nan = new Matrix4().makeTranslation(Number.NaN, 0, 0);
    expect(() => new Timeline([step('nan', (kit) => { kit.add(cube, a, nan); })])).toThrow(/Step "nan": piece 0 has a non-finite matrix element/);
  });

  it(`caps step lights at ${String(MAX_LIGHTS)} in the whole sequence`, () => {
    const lit = (count: number): StepDef[] =>
      Array.from({ length: count }, (_, i) =>
        step(`lit-${String(i)}`, (kit) => {
          kit.add(cube, a, at(i));
          kit.light(new PointLight(0xffffff, 10, 5, 2));
        }),
      );
    expect(new Timeline(lit(MAX_LIGHTS)).stats().lights).toBe(MAX_LIGHTS);
    expect(() => new Timeline(lit(MAX_LIGHTS + 1))).toThrow(/adds 9 step lights, more than the 8 allowed/);
    const shadowing = new PointLight(0xffffff, 10, 5, 2);
    shadowing.castShadow = true;
    expect(() => new Timeline([step('shadow', (kit) => { kit.add(cube, a, at(0)); kit.light(shadowing); })])).toThrow(/Step "shadow": light 0 casts shadows/);
  });
});

describe('step lights', () => {
  it('shine at their own intensity in their step’s group', () => {
    const timeline = new Timeline(fixtureSteps());
    const step = timeline.steps[3];
    const light = step?.lights[0];
    expect(light?.intensity).toBe(50);
    expect(light?.visible).toBe(true);
    expect(step?.group.children).toContain(light);
  });
});
