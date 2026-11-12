/**
 * Every piece of an artwork, in whichever build steps add them (src/viewer/art-pieces.ts `artworkPiecesIn`; docs/design/spec.md, Collection: Labels),
 * on two fixture steps built by the real timeline and clicked through the page's picker (src/viewer/pick.ts):
 * - an artwork built by two steps has all its instances gathered, from both steps and every mesh, whichever of them was met; another artwork's
 *   pieces, a door's and untagged ones are never among them;
 * - the piece met is always among them: met on a mesh no step holds, it is added to the steps' own, and stands alone when no step has the artwork;
 * - with the page's label over it (src/viewer/art-label.ts), the two-step artwork's card stays while the camera draws either step's pieces,
 *   whichever was clicked: under a cut that leaves the lower step's piece alone drawn, and with either step's meshes hidden; it goes once neither
 *   is drawn. The same clicks under the rule the page had, the pieces of the met piece's own step alone, lose the card while the other step's
 *   piece is still drawn: each such state is asserted too, so these fixtures are shown to tell the two rules apart.
 * Red (2026-11-11, the mutation made and undone): with `artworkPiecesIn` gathering from the met piece's step alone, all three tests fail (one
 * piece of artwork 7's three gathered; a piece met on no step's mesh found alone though the steps hold three; the card gone under the cut at 2 m).
 * Bound: fixtures. The model's own two-step artwork, the Temple of Dendur and its gate, is src/model/collection/fit-out-card.test.ts's, and the
 * page's wiring through the real cut control the browser's (tests/e2e/labels.spec.ts, its last block).
 */
import { BoxGeometry, InstancedMesh, Layers, Matrix4, MeshStandardMaterial, Quaternion, Ray, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { BuiltStep } from '../build/timeline.js';
import type { Kit, PieceTag, StepDef } from '../build/types.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { ARTWORK_QUERY, ArtLabel, artworkInstances } from './art-label.js';
import type { ArtInstance, DrawnView } from './art-label.js';
import { artworkPiecesIn } from './art-pieces.js';
import { ModelPicker } from './pick.js';
import type { PickHit } from './pick.js';

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const bronze = new MeshStandardMaterial({ name: 'bronze' });

interface Piece {
  /** Across the eye's path (X), metres: each column of slabs has its own. */
  readonly x: number;
  /** The height of the slab's middle: it stands 1.5 m under and over it. */
  readonly y: number;
  readonly material: Material;
  readonly tag?: PieceTag;
}

const art = (id: string): PieceTag => ({ kind: 'artwork', id });

/** A step of 3 m slabs, each 3 m before an eye that looks down −Z from its column. */
function step(id: string, pieces: readonly Piece[]): StepDef {
  return {
    id,
    chapter: CHAPTERS[0].id,
    title: id,
    build(kit: Kit) {
      for (const p of pieces) {
        const matrix = new Matrix4().compose(new Vector3(p.x, p.y, -3.05), new Quaternion(), new Vector3(3, 3, 0.1));
        if (p.tag === undefined) kit.add(cube, p.material, matrix);
        else kit.addTagged(cube, p.material, matrix, p.tag);
      }
    },
  };
}

/**
 * Artwork 7 in two steps, as a temple and its gate are: the lower step's piece stands from 0 to 3 m, the upper step's two, of two materials and so
 * two meshes, from 3 to 6 m and from 6 to 9 m over it. Beside them the lower step holds artwork 8 (in artwork 7's mesh), a door's leaf and a plain
 * slab, and the upper step a plain slab in the mesh of its stone piece of artwork 7.
 */
function scene(): { timeline: Timeline; picker: ModelPicker; lower: BuiltStep; upper: BuiltStep } {
  const timeline = new Timeline([
    step('lower', [{ x: 0, y: 1.5, material: bronze, tag: art('7') }, { x: 10, y: 1.5, material: bronze, tag: art('8') }, { x: 20, y: 1.5, material: bronze, tag: { kind: 'door', id: 'weston' } }, { x: 30, y: 1.5, material: stone }]),
    step('upper', [{ x: 0, y: 4.5, material: bronze, tag: art('7') }, { x: 0, y: 7.5, material: stone, tag: art('7') }, { x: 30, y: 4.5, material: stone }]),
  ]);
  const [lower, upper] = timeline.steps;
  if (lower === undefined || upper === undefined) throw new Error('The two steps were not built.');
  const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), -5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
  return { timeline, picker, lower, upper };
}

/** The camera draws layer 0, every fixture mesh's, and the cut is off. */
const VIEW: DrawnView = { cut: { enabled: false, height: 0 }, layers: new Layers() };
const cutAt = (height: number): DrawnView => ({ cut: { enabled: true, height }, layers: VIEW.layers });
/** A click straight ahead (−Z) from column `x`, `y` up: on artwork 7's lower piece at 1.5 m, on its upper step's bronze piece at 4.5 m. */
const ahead = (x: number, y: number): Ray => new Ray(new Vector3(x, y, 0), new Vector3(0, 0, -1));
const hitOn = (piece: ArtInstance, id: string): PickHit => ({ mesh: piece.mesh, instance: piece.instance, distance: 3, tag: art(id) });
/** The first piece of `pieces`, which the fixture always holds. */
function first(pieces: readonly ArtInstance[]): ArtInstance {
  const piece = pieces[0];
  if (piece === undefined) throw new Error('The fixture holds no such piece.');
  return piece;
}

describe('every piece of an artwork across the build’s steps', () => {
  it('gathers an artwork’s instances from every step and mesh, whichever piece was met, and no other piece', () => {
    const { timeline, lower, upper } = scene();
    /** A piece by its step, its mesh's material and its slot. */
    const named = (pieces: readonly ArtInstance[]): string[] => pieces.map((p) => {
      const of = timeline.steps.find((s) => s.meshes.includes(p.mesh));
      return `${of?.def.id ?? 'no step'}/${Array.isArray(p.mesh.material) ? '?' : p.mesh.material.name}#${String(p.instance)}`;
    });
    const piecesOf = artworkPiecesIn(timeline.steps);
    const seven = [...artworkInstances(lower, '7'), ...artworkInstances(upper, '7')];
    expect(named(seven)).toEqual(['lower/bronze#0', 'upper/bronze#0', 'upper/stone#0']);
    for (const met of seven) expect(named(piecesOf(hitOn(met, '7'), '7')), `met on ${named([met]).join()}`).toEqual(named(seven));
    // Artwork 8 shares a mesh with artwork 7's lower piece and is its own artwork; the door's leaf and the plain slabs are no artwork's.
    const eight = artworkInstances(lower, '8');
    expect(named(eight)).toEqual(['lower/bronze#1']);
    expect(named(piecesOf(hitOn(first(eight), '8'), '8'))).toEqual(['lower/bronze#1']);
    for (const piece of piecesOf(hitOn(first(seven), '7'), '7')) expect(timeline.tagOf(piece.mesh, piece.instance)).toEqual(art('7'));
  });

  it('always holds the piece met: one on a mesh no step holds is added to the steps’ own, and stands alone when no step has the artwork', () => {
    const { timeline, lower } = scene();
    const piecesOf = artworkPiecesIn(timeline.steps);
    const stray = new InstancedMesh(cube, bronze, 2);
    const met: PickHit = { mesh: stray, instance: 1, distance: 3, tag: art('9') };
    const alone = piecesOf(met, '9');
    expect([alone.length, alone[0]?.mesh === stray, alone[0]?.instance]).toEqual([1, true, 1]);
    const added = piecesOf({ ...met, tag: art('7') }, '7');
    expect([added.length, added[3]?.mesh === stray, added[3]?.instance], 'the steps’ three pieces of artwork 7, then the piece met').toEqual([4, true, 1]);
    // A piece of the steps met is not counted twice.
    expect(piecesOf(hitOn(first(artworkInstances(lower, '7')), '7'), '7').length).toBe(3);
  });

  it('keeps the two-step artwork’s card while the camera draws either step’s pieces, whichever was clicked, where the met piece’s step alone would lose it', () => {
    const { timeline, picker, lower, upper } = scene();
    /** A label as the page's, and one under the rule the page had: the pieces of the met piece's own step alone. */
    const labels = (): { label: ArtLabel; old: ArtLabel } => ({
      label: new ArtLabel(artworkPiecesIn(timeline.steps)),
      old: new ArtLabel((hit, id) => artworkInstances(timeline.steps.find((s) => s.meshes.includes(hit.mesh)) ?? lower, id)),
    });
    const shown = (label: ArtLabel, view: DrawnView): string | null => {
      label.frame(false, view);
      return label.id;
    };
    const visible = (of: BuiltStep, on: boolean): void => { for (const mesh of of.meshes) mesh.visible = on; };

    // The upper step's piece clicked, then a cut at 2 m: under every piece of the upper step, through the lower step's.
    let { label, old } = labels();
    for (const l of [label, old]) l.click(picker.hit(ahead(0, 4.5), ARTWORK_QUERY));
    expect([shown(label, VIEW), shown(old, VIEW)]).toEqual(['7', '7']);
    expect([shown(label, cutAt(2)), shown(old, cutAt(2))], 'the cut at 2 m: the lower step’s piece is still drawn').toEqual(['7', null]);
    expect(shown(label, cutAt(-0.5)), 'the cut under every piece').toBeNull();
    expect(shown(label, VIEW), 'not back once the cut is off').toBeNull();

    // The lower step's piece clicked: a cut through it keeps the card under either rule, and one under it takes it.
    ({ label, old } = labels());
    for (const l of [label, old]) l.click(picker.hit(ahead(0, 1.5), ARTWORK_QUERY));
    expect([shown(label, cutAt(2)), shown(old, cutAt(2))]).toEqual(['7', '7']);
    expect([shown(label, cutAt(-0.5)), shown(old, cutAt(-0.5))]).toEqual([null, null]);

    // The lower step's piece clicked and its meshes hidden, which no cut can do while the upper step's are drawn: the card stays for those, then goes.
    ({ label, old } = labels());
    for (const l of [label, old]) l.click(picker.hit(ahead(0, 1.5), ARTWORK_QUERY));
    visible(lower, false);
    expect([shown(label, VIEW), shown(old, VIEW)], 'the lower step hidden, the upper drawn').toEqual(['7', null]);
    visible(upper, false);
    expect(shown(label, VIEW), 'both hidden').toBeNull();
    visible(lower, true);
    visible(upper, true);
  });
});
