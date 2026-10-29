/**
 * Piece tags (docs/design/spec.md, Build-step API: `Kit.addTagged`): the timeline keeps each tagged piece's tag with the instance it landed in
 * (`Timeline.tagOf`, `BuiltStep.tags`); a door's pieces get meshes of their own, one door per mesh, shared with no other door and no untagged piece,
 * while an artwork's pieces batch as untagged pieces do; tags change nothing the timeline shows at any t, whatever the history; a malformed tag is
 * refused: it fails with a message naming the step, the piece and the fix.
 * Bound: fixture steps of boxes; tags on the real sequence are checked by the milestones that add them (doors, artworks).
 */
import { BoxGeometry, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from './chapters.js';
import { firstDifference, random, snapshot } from './testing.js';
import { Timeline } from './timeline.js';
import type { Kit, PieceTag, StepDef } from './types.js';

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const bronze = new MeshStandardMaterial({ name: 'bronze' });
const at = (x: number): Matrix4 => new Matrix4().makeTranslation(x, 0.5, 0);

/** The pieces of the fixture step: x, material and tag (null for untagged), in call order. */
const PIECES: readonly (readonly [number, MeshStandardMaterial, PieceTag | null])[] = [
  [0, stone, null],
  [2, stone, { kind: 'artwork', id: '547802' }],
  [4, bronze, { kind: 'door', id: 'north' }],
  [6, bronze, { kind: 'door', id: 'south' }],
  [8, stone, { kind: 'artwork', id: '11013' }],
  [10, bronze, { kind: 'door', id: 'north' }],
  [12, bronze, null],
  [14, stone, { kind: 'door', id: 'north' }],
];

/** The fixture step; with `tagged` false every piece goes through `kit.add`. */
function step(id: string, tagged: boolean, stagger: StepDef['stagger'] = 'x'): StepDef {
  return {
    id,
    chapter: CHAPTERS[0].id,
    title: id,
    motion: { kind: 'rise' },
    stagger,
    build(kit: Kit) {
      for (const [x, material, tag] of PIECES) {
        if (tagged && tag !== null) kit.addTagged(cube, material, at(x), tag);
        else kit.add(cube, material, at(x));
      }
    },
  };
}

/** Every instance of a timeline as [x of its final matrix, its tag]. */
function instanceTags(timeline: Timeline): (readonly [number, PieceTag | null])[] {
  timeline.evaluate(timeline.n);
  return timeline.steps.flatMap((s) => s.meshes.flatMap((mesh) => Array.from({ length: mesh.instanceMatrix.count }, (_, i) => [mesh.instanceMatrix.array[i * 16 + 12] ?? Number.NaN, timeline.tagOf(mesh, i)] as const)));
}

describe('piece tags', () => {
  it('keeps each tagged piece’s tag with the instance it landed in, and none for an untagged one', () => {
    for (const stagger of ['x', '-x', 'order', 'none'] as const) {
      const timeline = new Timeline([step('tags', true, stagger)]);
      const found = instanceTags(timeline).sort((a, b) => a[0] - b[0]);
      expect(found, `stagger ${stagger}`).toEqual(PIECES.map(([x, , tag]) => [x, tag]));
    }
  });

  it('gives each door meshes of its own, shared with no other door and no untagged piece; artworks batch with the untagged', () => {
    const timeline = new Timeline([step('tags', true)]);
    const meshes = timeline.steps[0]?.meshes ?? [];
    const contents = meshes.map((mesh) => Array.from({ length: mesh.instanceMatrix.count }, (_, i) => timeline.tagOf(mesh, i)));
    const doorMeshes = contents.filter((tags) => tags.some((t) => t?.kind === 'door'));
    for (const tags of doorMeshes) {
      expect(new Set(tags.map((t) => (t?.kind === 'door' ? t.id : 'not a door'))).size, 'one door per mesh, nothing else in it').toBe(1);
    }
    // The north door's two materials make two meshes, the south door's one; stone pieces and artworks share one mesh, untagged bronze another.
    expect(doorMeshes.length).toBe(3);
    expect(meshes.length).toBe(5);
    const shared = contents.find((tags) => tags.some((t) => t?.kind === 'artwork'));
    expect(shared?.filter((t) => t === null).length, 'the untagged stone piece shares the artworks’ mesh').toBe(1);
    expect(timeline.steps[0]?.tags.map((t) => t?.length ?? 0)).toEqual(meshes.map((m) => (contents[meshes.indexOf(m)]?.some((t) => t !== null) ? m.instanceMatrix.count : 0)));
  });

  it('changes nothing the timeline shows: artworks tagged or not give byte-identical scenes at every t', () => {
    const artworks = (tagged: boolean): StepDef => ({ ...step('art', false), build(kit: Kit) {
      for (const [x, material, tag] of PIECES) {
        if (tagged && tag?.kind === 'artwork') kit.addTagged(cube, material, at(x), tag);
        else kit.add(cube, material, at(x));
      }
    } });
    const plain = new Timeline([artworks(false)]);
    const tagged = new Timeline([artworks(true)]);
    for (const t of [0, 0.2, 0.5, 0.9, 1]) {
      plain.evaluate(t);
      tagged.evaluate(t);
      expect(firstDifference(snapshot(plain), snapshot(tagged)), `t ${String(t)}`).toBeNull();
    }
  });

  it('holds the determinism contract with doors in their own meshes: any history gives the scene a fresh evaluation gives', () => {
    const steps = [step('one', true), step('two', true, 'radial'), step('three', true, 'none')];
    const rand = random(5);
    const timeline = new Timeline(steps);
    for (let k = 0; k < 40; k += 1) {
      timeline.evaluate(rand() * 3);
      const t = Math.round(rand() * 30) / 10;
      timeline.evaluate(t);
      const fresh = new Timeline(steps);
      fresh.evaluate(t);
      expect(firstDifference(snapshot(timeline), snapshot(fresh)), `t ${String(t)} after history ${String(k)}`).toBeNull();
    }
  });

  it('answers null for an untagged piece, a mesh it did not build and an instance past the mesh', () => {
    const timeline = new Timeline([step('tags', true)]);
    const mesh = timeline.steps[0]?.meshes[0];
    if (mesh === undefined) throw new Error('No mesh was built.');
    expect(timeline.tagOf(mesh, 99)).toBeNull();
    expect(timeline.tagOf(new InstancedMesh(cube, stone, 1), 0)).toBeNull();
    const untagged = new Timeline([step('plain', false)]);
    expect(untagged.steps[0]?.meshes.every((m) => Array.from({ length: m.instanceMatrix.count }, (_, i) => untagged.tagOf(m, i)).every((t) => t === null))).toBe(true);
    expect(untagged.steps[0]?.tags.every((t) => t === null)).toBe(true);
  });

  it('rejects a tag of no known kind or without an id, naming the step and the piece', () => {
    const bad = (tag: unknown): StepDef => ({ ...step('bad', false), build(kit: Kit) {
      kit.add(cube, stone, at(0));
      kit.addTagged(cube, stone, at(1), tag as PieceTag);
    } });
    expect(() => new Timeline([bad({ kind: 'window', id: 'w1' })])).toThrow(/Step "bad": piece 1 has a tag of kind "window"; use 'door' or 'artwork'/);
    expect(() => new Timeline([bad({ kind: 'door', id: '' })])).toThrow(/Step "bad": piece 1 has a door tag with no id/);
    expect(() => new Timeline([bad(null)])).toThrow(/Step "bad": piece 1 has no tag/);
  });

  it('keeps a copy of the tag, so a builder that changes its object later moves nothing', () => {
    const tag = { kind: 'door' as const, id: 'north' };
    const timeline = new Timeline([{ ...step('copy', false), build(kit: Kit) { kit.addTagged(cube, bronze, at(0), tag); tag.id = 'changed'; } }]);
    const mesh = timeline.steps[0]?.meshes[0];
    if (mesh === undefined) throw new Error('No mesh was built.');
    expect(timeline.tagOf(mesh, 0)).toEqual({ kind: 'door', id: 'north' });
  });
});
