/**
 * The fit-out pieces that are themselves objects of the collection (./fit-out.ts; docs/design/spec.md, Collection: Fit-out pieces), on the real sequence:
 * - each part's step tags the pieces that are the object's, and only those, with the object's own ID: every stone of the Temple of Dendur and of its
 *   gate, but not the flagstones, the base course or the rail; Diana's figure and the three blocks of her pedestal, but not the lamps; every piece of
 *   the loggia and of the choir screen. The pieces are told by their materials, which `PARTS` names for each step;
 * - no step but a part's own carries a fit-out piece's tag, every fit-out record of the catalogue is built by some step, and every artwork tag in the
 *   whole sequence names a catalogue entry, a placeholder's in a collection step and a fit-out record's in its own steps, so the page has a card for
 *   whatever a look or a click can meet;
 * - at t = N every instance the fit-out steps draw holds the tag of the piece the kit was given at its matrix;
 * - the tags split no mesh and change no scene: with every artwork's tag taken off, the whole sequence makes the same meshes in the same order
 *   (geometry, material, instance count), the same pieces, triangles and lights, and the same scene byte for byte at every t sampled, the steps of the
 *   fit-out pieces in mid-arrival among them. So the core area, whose budget is 130 meshes (src/model/core/core.test.ts), keeps the count it had;
 * - `artworkKit` adds each piece as the plain kit would, tagged, keeps a tag the builder gives itself and refuses an object with no fit-out record.
 * Red (2026-11-11, each mutation made and undone): the court's lamps added through Diana's kit (her step's tagged pieces are then of glass and
 * verdigris too, and nothing of it is untagged); the gate's rail and the forecourt's flagstones added through the temple's kit (metalDark and
 * rn-oldPaving among the tagged); `artworkKit` dropping the order it is given (its own test); and, with the engine's batching stood in for by one
 * that keeps each artwork's pieces apart as a door's are, no line of src/build changed: the sequence makes 911 meshes where the build without the
 * tags makes 744, and src/model/core/core.test.ts fails at 159 meshes of its 130.
 * Bound: which pieces are the object's is the builder's choice, stated here by material; that a visitor reaches each part and that its card shows is
 * src/model/reach.test.ts's and ./fit-out-labels.test.ts's. The build without the tags runs the same builders, so the comparison sees what a tag does
 * in the engine, not a builder that builds other pieces once it tags them: `artworkKit` passing every argument through is its own test's, and the
 * standard shots were compared once, before and after the tags (docs/work/29_artwork-cards-and-forms/plan.md).
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, PointLight } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { SEQUENCE } from '../../build/sequence.js';
import { firstDifference, snapshot } from '../../build/testing.js';
import { Timeline } from '../../build/timeline.js';
import type { Kit, PieceTag, StepDef } from '../../build/types.js';
import { CATALOGUE } from './catalogue.js';
import { FIT_OUT, FIT_OUT_PIECES, artworkKit, fitOutEntryOf } from './fit-out.js';
import { artworkTag } from './place.js';
import { SPACES_A } from './spaces-a.js';
import { SPACES_B } from './spaces-b.js';

/** Each part's step: the materials of the pieces that are the object's, and of the step's other pieces, by name. */
const PARTS: Readonly<Record<string, { readonly tagged: readonly string[]; readonly plain: readonly string[] }>> = {
  'dendur-gate': { tagged: ['sandstone'], plain: ['metalDark', 'rn-oldPaving'] },
  'dendur-temple': { tagged: ['sandstone'], plain: ['rn-oldPaving'] },
  'engelhard-sculpture': { tagged: ['rn-gilt', 'rn-whiteMarble'], plain: ['glass', 'rn-verdigris'] },
  'engelhard-loggia': { tagged: ['limestone', 'rn-favrile'], plain: [] },
  'medieval-hall-choir-screen': { tagged: ['core.gilt', 'core.screenIron', 'limestone'], plain: [] },
};

const PART_STEPS = FIT_OUT_PIECES.flatMap((piece) => piece.parts.map((part) => ({ id: String(piece.id), ...part })));
const COLLECTION_STEPS: ReadonlySet<string> = new Set([...SPACES_A, ...SPACES_B].map((def) => def.id));
const artworkOf = (tag: PieceTag | null | undefined): string | null => (tag?.kind === 'artwork' ? tag.id : null);
const names = (materials: Iterable<Material>): string[] => [...new Set([...materials].map((m) => m.name))].sort();
const stepOf = (id: string): StepDef => {
  const step = SEQUENCE.find((s) => s.id === id);
  if (step === undefined) throw new Error(`The sequence has no step "${id}", which src/model/collection/fit-out.ts names.`);
  return step;
};

/** `step` with every artwork's tag taken off, a door keeping its own: what the step built before any artwork was tagged. */
function untagged(step: StepDef): StepDef {
  return {
    ...step,
    build(kit: Kit) {
      step.build({
        add: (geometry, material, matrix, order) => { kit.add(geometry, material, matrix, order); },
        addTagged: (geometry, material, matrix, tag, order) => {
          if (tag.kind === 'artwork') kit.add(geometry, material, matrix, order);
          else kit.addTagged(geometry, material, matrix, tag, order);
        },
        light: (light) => { kit.light(light); },
      });
    },
  };
}

const materialOf = (mesh: InstancedMesh): Material => (Array.isArray(mesh.material) ? (mesh.material[0] as Material) : mesh.material);
/** A material across two builds of the sequence: each build makes its own artworks' materials (material.ts `artMaterial`, named for their space); the rest are shared. */
const materialKey = (material: Material): string => (material.name !== '' ? material.name : material.uuid);
const pieceKey = (geometry: string, material: Material, matrix: ArrayLike<number>, tag: string): string => `${geometry} ${materialKey(material)} ${Array.from(matrix, (v) => Math.fround(v)).join(',')} ${tag}`;

let tagged: Timeline;
let plain: Timeline;

beforeAll(() => {
  tagged = new Timeline(SEQUENCE);
  plain = new Timeline(SEQUENCE.map(untagged));
}, 120_000);

describe('the fit-out pieces’ tags', () => {
  it('names a step and a floor for every fit-out record of the catalogue, and a record for every piece', () => {
    const records = CATALOGUE.filter((e) => e.display === 'fit-out').map((e) => e.id);
    expect(FIT_OUT_PIECES.map((p) => p.id).sort((a, b) => a - b)).toEqual([...records].sort((a, b) => a - b));
    expect(Object.values(FIT_OUT).sort((a, b) => a - b)).toEqual([...records].sort((a, b) => a - b));
    expect(PART_STEPS.map((p) => p.step).sort()).toEqual(Object.keys(PARTS).sort());
    for (const part of PART_STEPS) expect(Number.isFinite(part.floor) && part.name.length > 0, part.step).toBe(true);
  });

  it('tags in each part’s step the pieces that are the object’s, and only those, with its own ID', () => {
    const problems: string[] = [];
    for (const part of PART_STEPS) {
      const want = PARTS[part.step];
      if (want === undefined) continue;
      const pieces = collectStep(stepOf(part.step)).pieces;
      const own = pieces.filter((p) => artworkOf(p.tag) === part.id);
      const other = pieces.filter((p) => artworkOf(p.tag) !== part.id);
      if (other.some((p) => p.tag !== null)) problems.push(`${part.step}: a piece tagged ${JSON.stringify(other.find((p) => p.tag !== null)?.tag)}`);
      if (names(own.map((p) => p.material)).join(' ') !== want.tagged.join(' ')) problems.push(`${part.step}: its tagged pieces are of ${names(own.map((p) => p.material)).join(', ')}; ${part.name} is of ${want.tagged.join(', ')}`);
      if (names(other.map((p) => p.material)).join(' ') !== want.plain.join(' ')) problems.push(`${part.step}: its untagged pieces are of ${names(other.map((p) => p.material)).join(', ') || 'nothing'}; the rest of the step is of ${want.plain.join(', ') || 'nothing'}`);
    }
    expect(problems).toEqual([]);
    // Diana is four pieces, the figure and her pedestal's three blocks; the masonry and the ironwork are many.
    const count = (step: string, id: number): number => collectStep(stepOf(step)).pieces.filter((p) => artworkOf(p.tag) === String(id)).length;
    expect(count('engelhard-sculpture', FIT_OUT.diana)).toBe(4);
    expect(count('dendur-gate', FIT_OUT.templeOfDendur)).toBeGreaterThan(100);
    expect(count('dendur-temple', FIT_OUT.templeOfDendur)).toBeGreaterThan(300);
    expect(count('medieval-hall-choir-screen', FIT_OUT.choirScreen)).toBeGreaterThan(300);
  });

  it('gives every artwork tag of the whole sequence a catalogue entry: a placeholder’s in a collection step, a fit-out record’s in its own steps alone', () => {
    const problems: string[] = [];
    const built = new Set<string>();
    for (const step of tagged.steps) {
      const ids = new Set(step.tags.flatMap((list) => (list ?? []).flatMap((tag) => artworkOf(tag) ?? [])));
      for (const id of ids) {
        const entry = CATALOGUE.find((e) => String(e.id) === id);
        if (entry === undefined) problems.push(`${step.def.id}: artwork ${id} is tagged but the catalogue holds no entry, so the page has no card for it`);
        else if (entry.display === 'fit-out') {
          built.add(`${id} ${step.def.id}`);
          if (!PART_STEPS.some((p) => p.id === id && p.step === step.def.id)) problems.push(`${step.def.id}: carries the tag of fit-out piece ${id}, which fit-out.ts does not build there`);
        } else if (!COLLECTION_STEPS.has(step.def.id)) problems.push(`${step.def.id}: carries the tag of placeholder ${id}, which only its space's collection step builds`);
      }
    }
    for (const part of PART_STEPS) if (!built.has(`${part.id} ${part.step}`)) problems.push(`${part.step}: no piece carries the tag of ${part.name} (${part.id})`);
    expect(problems).toEqual([]);
  });

  it('gives every instance the fit-out steps draw at t = N the tag of the piece at its matrix', () => {
    tagged.evaluate(tagged.n);
    const problems: string[] = [];
    for (const built of tagged.steps.filter((s) => s.def.id in PARTS)) {
      const given = collectStep(built.def).pieces.map((p) => pieceKey(p.geometry.uuid, p.material, p.matrix.elements, artworkOf(p.tag) ?? 'none')).sort();
      const drawn: string[] = [];
      for (const mesh of built.meshes) {
        for (let slot = 0; slot < mesh.count; slot += 1) drawn.push(pieceKey(mesh.geometry.uuid, materialOf(mesh), mesh.instanceMatrix.array.slice(slot * 16, slot * 16 + 16), artworkOf(tagged.tagOf(mesh, slot)) ?? 'none'));
      }
      drawn.sort();
      if (drawn.length !== given.length) problems.push(`${built.def.id}: ${String(drawn.length)} instances drawn at t = N for ${String(given.length)} pieces`);
      const missing = given.filter((g, i) => drawn[i] !== g);
      if (missing.length > 0) problems.push(`${built.def.id}: ${String(missing.length)} pieces whose tag no drawn instance at their matrix holds`);
    }
    expect(problems).toEqual([]);
  });

  it('splits no mesh and changes no scene: with the artworks’ tags taken off, the sequence makes the same meshes, pieces and triangles, and the same scene at every t sampled', () => {
    expect(tagged.stats(), 'steps, pieces, meshes, triangles and lights').toEqual(plain.stats());
    // A geometry across two builds of the sequence: some steps make theirs afresh at each build, so it is told by its size, not by its identity.
    const geometryKey = (geometry: BufferGeometry): string => `${String(geometry.getAttribute('position').count)} vertices, ${String(geometry.getIndex()?.count ?? 0)} indices`;
    const shape = (timeline: Timeline): string[] => timeline.steps.flatMap((s) => s.meshes.map((mesh) => `${mesh.name}: ${geometryKey(mesh.geometry)}, ${materialKey(materialOf(mesh))} ×${String(mesh.instanceMatrix.count)}`));
    expect(shape(tagged), 'each step’s meshes in order: geometry, material and instance count').toEqual(shape(plain));
    expect(plain.steps.every((s) => s.tags.every((list) => list === null || list.every((tag) => artworkOf(tag) === null))), 'the untagged build keeps no artwork’s tag').toBe(true);
    // The empty site, the finished building, and each fit-out step part-way through its arrival and just complete.
    const at = tagged.steps.filter((s) => s.def.id in PARTS).flatMap((s) => [s.index + 0.3, s.index + 0.6, s.index + 1]);
    expect(at.length).toBe(3 * Object.keys(PARTS).length);
    for (const t of [0, ...at, tagged.n]) {
      tagged.evaluate(t);
      plain.evaluate(t);
      expect(firstDifference(snapshot(tagged), snapshot(plain)), `t ${String(t)}`).toBeNull();
    }
  });
});

describe('artworkKit', () => {
  const cube: BufferGeometry = new BoxGeometry(1, 1, 1);
  const stone = new MeshStandardMaterial({ name: 'stone' });
  const at = (x: number): Matrix4 => new Matrix4().makeTranslation(x, 0, 0);
  const step = (build: (kit: Kit) => void): StepDef => ({ id: 'fixture', chapter: 'site', title: 'fixture', motion: { kind: 'rise' }, build });

  it('adds each piece as the plain kit would, with the artwork’s tag, and keeps the order given or the call’s index', () => {
    const through = collectStep(step((kit) => {
      const diana = artworkKit(kit, FIT_OUT.diana);
      kit.add(cube, stone, at(0));
      diana.add(cube, stone, at(1));
      diana.add(cube, stone, at(2), 7);
    })).pieces;
    const direct = collectStep(step((kit) => {
      kit.add(cube, stone, at(0));
      kit.add(cube, stone, at(1));
      kit.add(cube, stone, at(2), 7);
    })).pieces;
    expect(through.map((p) => [p.geometry === cube, p.material === stone, p.matrix.elements[12], p.order])).toEqual(direct.map((p) => [p.geometry === cube, p.material === stone, p.matrix.elements[12], p.order]));
    expect(through.map((p) => p.order)).toEqual([0, 1, 7]);
    expect(through.map((p) => p.tag)).toEqual([null, artworkTag(FIT_OUT.diana), artworkTag(FIT_OUT.diana)]);
  });

  it('keeps a tag the builder gives a piece itself, and passes a light through', () => {
    const light = new PointLight(0xffffff, 1);
    const collected = collectStep(step((kit) => {
      const screen = artworkKit(kit, FIT_OUT.choirScreen);
      screen.addTagged(cube, stone, at(0), { kind: 'door', id: 'a-door' });
      screen.light(light);
    }));
    expect(collected.pieces.map((p) => p.tag)).toEqual([{ kind: 'door', id: 'a-door' }]);
    expect(collected.lights).toEqual([light]);
  });

  it('refuses an object the catalogue holds no fit-out record for, naming it and the fix', () => {
    expect(() => artworkKit({ add: () => undefined, addTagged: () => undefined, light: () => undefined }, 1)).toThrow('Object 1 is built as a fit-out piece, but src/model/collection/catalogue.ts holds no record of it; list it under its space\'s fitOut in picks.ts');
    // 544442, the Sphinx of Hatshepsut, is a placeholder of the Dendur hall: the collection's step builds it, no fit-out step may.
    expect(() => fitOutEntryOf(544442)).toThrow('Object 544442 is built as a fit-out piece, but src/model/collection/catalogue.ts holds it as a placeholder of temple-of-dendur');
    expect(fitOutEntryOf(FIT_OUT.templeOfDendur).title).toBe('The Temple of Dendur');
  });
});
