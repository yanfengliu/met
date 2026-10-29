/**
 * The artworks' piece tags (docs/design/spec.md, Collection: Labels; Build-step API: Piece tags) on the real sequence's collection steps: every piece of
 * every one of the 94 placeholders (its object, plinth, vitrine base and glass, frame) is tagged with its own object's ID (kind artwork, with its Met
 * object ID); at t = N every instance a collection step's meshes draw holds the tag of the piece kit.addTagged put at its matrix; no mesh split, and
 * the tags change nothing else, the same scene as untagged: built with every piece untagged instead, each step makes the same meshes (geometry,
 * material, instance count, in the same order), the same triangles and pieces, and the same scene byte for byte at every t sampled, because
 * src/build/batch.ts keeps only doors apart.
 * Bound: the ten collection steps on a timeline of their own, as the tags touch no other step; the whole model's counts are src/build/sequence.test.ts's.
 */
import type { InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { SEQUENCE } from '../../build/sequence.js';
import { firstDifference, snapshot } from '../../build/testing.js';
import { Timeline } from '../../build/timeline.js';
import type { Kit, StepDef } from '../../build/types.js';
import { artworkTag } from './place.js';
import type { CollectionStepDef } from './place.js';
import { SPACES_A } from './spaces-a.js';
import { SPACES_B } from './spaces-b.js';

const DEFS: readonly CollectionStepDef[] = [...SPACES_A, ...SPACES_B];

/** The sequence's own step for each collection step definition, in sequence order. */
const STEPS: readonly StepDef[] = SEQUENCE.filter((s) => DEFS.some((d) => d.id === s.id));

const defOf = (step: StepDef): CollectionStepDef => {
  const def = DEFS.find((d) => d.id === step.id);
  if (def === undefined) throw new Error(`Step "${step.id}" is no collection step of spaces-a.ts or spaces-b.ts.`);
  return def;
};

/** `step` with every piece added through kit.add: what the step built before artworks were tagged. */
function untagged(step: StepDef): StepDef {
  return {
    ...step,
    build(kit: Kit) {
      step.build({
        add: (geometry, material, matrix, order) => { kit.add(geometry, material, matrix, order); },
        addTagged: (geometry, material, matrix, _tag, order) => { kit.add(geometry, material, matrix, order); },
        light: (light) => { kit.light(light); },
      });
    },
  };
}

const materialOf = (mesh: InstancedMesh): Material => (Array.isArray(mesh.material) ? (mesh.material[0] as Material) : mesh.material);
/** A material across two builds of a step: each build makes its own artworks' material (material.ts `artMaterial`, named for its space); the rest are shared. */
const materialKey = (material: Material): string => (material.name !== '' ? material.name : material.uuid);
/** A piece by its geometry, material, float32 matrix and tag id, so a drawn instance can be matched to the piece kit.addTagged put there. */
const key = (geometry: string, material: Material, matrix: ArrayLike<number>, tag: string): string => `${geometry} ${materialKey(material)} ${Array.from(matrix, (v) => Math.fround(v)).join(',')} ${tag}`;

describe('the artworks’ tags', () => {
  it('finds the ten collection steps in the sequence', () => {
    expect(STEPS.map((s) => s.id).sort()).toEqual(DEFS.map((d) => d.id).sort());
  });

  it('tags every piece of every placeholder with its own object’s ID, and leaves no piece of a collection step untagged', () => {
    const problems: string[] = [];
    for (const step of STEPS) {
      const def = defOf(step);
      const pieces = collectStep(step).pieces;
      for (const [k, piece] of pieces.entries()) {
        const placement = def.placements[piece.order];
        if (placement === undefined) {
          problems.push(`${step.id}: piece ${String(k)} has order ${String(piece.order)}, which is no placement's`);
          continue;
        }
        const want = artworkTag(placement.id);
        if (piece.tag?.kind !== want.kind || piece.tag.id !== want.id) problems.push(`${step.id}: piece ${String(k)} of object ${want.id} is tagged ${JSON.stringify(piece.tag)}`);
      }
      const ids = new Set(pieces.map((p) => p.tag?.id));
      for (const placement of def.placements) if (!ids.has(String(placement.id))) problems.push(`${step.id}: object ${String(placement.id)} has no tagged piece`);
    }
    expect(problems).toEqual([]);
  });

  it('gives every instance the collection steps draw at t = N the tag of the piece at its matrix', () => {
    const timeline = new Timeline(STEPS);
    timeline.evaluate(timeline.n);
    const problems: string[] = [];
    for (const built of timeline.steps) {
      const given = collectStep(built.def).pieces.map((p) => key(p.geometry.uuid, p.material, p.matrix.elements, p.tag?.id ?? 'untagged')).sort();
      const drawn: string[] = [];
      built.meshes.forEach((mesh, m) => {
        if (built.tags[m] == null) problems.push(`${mesh.name}: no tags kept for it`);
        for (let slot = 0; slot < mesh.count; slot += 1) {
          drawn.push(key(mesh.geometry.uuid, materialOf(mesh), mesh.instanceMatrix.array.slice(slot * 16, slot * 16 + 16), timeline.tagOf(mesh, slot)?.id ?? 'untagged'));
        }
      });
      drawn.sort();
      if (drawn.length !== given.length) problems.push(`${built.def.id}: ${String(drawn.length)} instances drawn at t = N for ${String(given.length)} pieces`);
      const missing = given.filter((g, i) => drawn[i] !== g);
      if (missing.length > 0) problems.push(`${built.def.id}: ${String(missing.length)} pieces whose tag no drawn instance at their matrix holds`);
    }
    expect(problems).toEqual([]);
  });

  it('splits no mesh: tagged or not, the steps make the same meshes, pieces and triangles, and the same scene at every t sampled', () => {
    const tagged = new Timeline(STEPS);
    const plain = new Timeline(STEPS.map(untagged));
    expect(tagged.stats(), 'steps, pieces, meshes, triangles and lights').toEqual(plain.stats());
    const shape = (timeline: Timeline): string[] => timeline.steps.flatMap((s) => s.meshes.map((mesh) => `${mesh.name}: ${mesh.geometry.uuid} ${materialKey(materialOf(mesh))} ×${String(mesh.instanceMatrix.count)}`));
    expect(shape(tagged), 'each step’s meshes in order: geometry, material and instance count').toEqual(shape(plain));
    expect(plain.steps.every((s) => s.tags.every((t) => t === null)), 'the untagged build keeps no tag').toBe(true);
    for (const t of [0, 0.4, 1, 2.5, 4.75, 7, 9.5, tagged.n]) {
      tagged.evaluate(t);
      plain.evaluate(t);
      expect(firstDifference(snapshot(tagged), snapshot(plain)), `t ${String(t)}`).toBeNull();
    }
  });
});
