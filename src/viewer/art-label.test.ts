/**
 * Which artwork's card shows, the show and hide rules (src/viewer/art-label.ts; docs/design/spec.md, Collection: Labels), on fixture steps built by
 * the real timeline and found by the page's hit query (src/viewer/pick.ts) and look target (src/walk/look.ts):
 * - the orbit view's click query finds an artwork through untagged glass and its own vitrine glass, at any distance, and never through a wall or a door;
 * - a click on an artwork shows its card, a click on anything else hides it, and so do Esc and a camera preset (their dismissal, `dismiss`, review 6,
 *   F26);
 * - it hides once none of the artwork's pieces is drawn by the camera: the build takes them away (at t = 0, or before its own instance arrives; a
 *   later t does not bring it back), the section cut, a floor view's included, lies under every piece, or they are on no layer the camera draws; a
 *   cut through the object, or through its plinth alone, keeps it, as the picker still meets the artwork there (F27);
 * - walking, the card is the look target's artwork, none for a door or nothing, clicks and Esc change nothing, and entering walk mode replaces an orbit
 *   click's card with the look target's;
 * - leaving walk mode, which tells null before the next frame, keeps the look target's artwork as the orbit view's card, its pieces found as a click's
 *   are, until a click elsewhere, Esc or the cut takes it; a look away first, a door in view, or a preset's dismissal keeps none (work unit 14).
 * Bound: boxes on a straight ray down −Z from an eye 1.6 m up; the click's own input is src/viewer/click.test.ts's, the page's wiring the browser's.
 */
import { BoxGeometry, Layers, Matrix4, MeshStandardMaterial, Quaternion, Ray, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, PieceTag, StepDef } from '../build/types.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { lookTarget } from '../walk/look.js';
import { ARTWORK_QUERY, ArtLabel, artworkInstances } from './art-label.js';
import type { DrawnView } from './art-label.js';
import { ModelPicker } from './pick.js';

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const bronze = new MeshStandardMaterial({ name: 'bronze' });
const glass = new MeshStandardMaterial({ name: 'glass', transparent: true, opacity: 0.3 });

interface Piece {
  /** Metres from the eye to the piece's near face, straight ahead (−Z). */
  readonly near: number;
  readonly material: Material;
  readonly tag?: PieceTag;
  /** Across the ray (X) from it, metres: 0 puts the piece on the ray. */
  readonly x?: number;
  /** The height of its middle: default 1.5, so the 3 m slab stands from 0 to 3 m. */
  readonly y?: number;
}

/** A one-step timeline of slabs across the eye's path, built with stagger `order` (one order per piece), and its page picker. */
function scene(pieces: readonly Piece[]): { timeline: Timeline; picker: ModelPicker } {
  const step: StepDef = {
    id: 'labels',
    chapter: CHAPTERS[0].id,
    title: 'labels',
    motion: { kind: 'pop' },
    stagger: 'order',
    build(kit: Kit) {
      pieces.forEach((p, order) => {
        const matrix = new Matrix4().compose(new Vector3(p.x ?? 0, p.y ?? 1.5, -p.near - 0.05), new Quaternion(), new Vector3(3, 3, 0.1));
        if (p.tag === undefined) kit.add(cube, p.material, matrix, order);
        else kit.addTagged(cube, p.material, matrix, p.tag, order);
      });
    },
  };
  const timeline = new Timeline([step]);
  timeline.evaluate(1);
  const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), -5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
  return { timeline, picker };
}

const eye = new Vector3(0, 1.6, 0);
const ahead = new Vector3(0, 0, -1);
const forward = (): Ray => new Ray(eye.clone(), ahead.clone());
const art = (id: string): PieceTag => ({ kind: 'artwork', id });
const door: PieceTag = { kind: 'door', id: 'weston' };
/** The camera draws layer 0, every fixture mesh's, and the cut is off. */
const VIEW: DrawnView = { cut: { enabled: false, height: 0 }, layers: new Layers() };
const cutAt = (height: number): DrawnView => ({ cut: { enabled: true, height }, layers: VIEW.layers });

/** The id the click query finds straight ahead in a scene of `pieces`, or null. */
const clicked = (pieces: readonly Piece[]): string | null => scene(pieces).picker.hit(forward(), ARTWORK_QUERY)?.tag?.id ?? null;

describe('the orbit view’s click query', () => {
  it('finds an artwork through glass that is no artwork’s and through its own vitrine glass, at any distance', () => {
    expect(clicked([{ near: 2, material: glass }, { near: 2.4, material: bronze, tag: art('11013') }])).toBe('11013');
    expect(clicked([{ near: 2, material: glass, tag: art('11013') }, { near: 2.4, material: bronze, tag: art('11013') }]), 'the vitrine glass is its artwork’s').toBe('11013');
    expect(clicked([{ near: 50, material: bronze, tag: art('11013') }]), '50 m off, beyond the walking eye’s 6 m').toBe('11013');
  });

  it('never finds an artwork behind a wall or a door, and finds no piece that is no artwork', () => {
    expect(clicked([{ near: 2, material: stone }, { near: 2.4, material: bronze, tag: art('11013') }])).toBeNull();
    expect(clicked([{ near: 2, material: bronze, tag: door }, { near: 3, material: bronze, tag: art('11013') }])).toBeNull();
    expect(clicked([{ near: 1, material: stone }])).toBeNull();
    expect(clicked([{ near: 1, material: bronze, tag: door }])).toBeNull();
  });
});

describe('the card in the orbit view', () => {
  it('shows the artwork a click meets, and hides for a click on anything else, for Esc and for a camera preset', () => {
    const { picker } = scene([{ near: 3, material: bronze, tag: art('11013') }, { near: 3, material: stone, x: 10 }, { near: 3, material: bronze, tag: art('547802'), x: -10 }]);
    const label = new ArtLabel();
    label.frame(false, VIEW);
    expect(label.id).toBeNull();
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    label.frame(false, VIEW);
    expect(label.id).toBe('11013');
    // A click on the other artwork shows that one; a click on the wall beside them, or on open sky, hides the card.
    label.click(picker.hit(new Ray(new Vector3(-10, 1.6, 0), ahead.clone()), ARTWORK_QUERY));
    expect(label.id).toBe('547802');
    label.click(picker.hit(new Ray(new Vector3(10, 1.6, 0), ahead.clone()), ARTWORK_QUERY));
    expect(label.id).toBeNull();
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    label.click(picker.hit(new Ray(eye.clone(), new Vector3(0, 1, 0)), ARTWORK_QUERY));
    expect(label.id, 'a click on the sky').toBeNull();
    // Esc and a camera preset both dismiss the card (src/main.ts calls dismiss for each).
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    label.dismiss();
    label.frame(false, VIEW);
    expect(label.id, 'dismissed').toBeNull();
  });

  it('hides when the build takes the artwork away, at t = 0 or before its instance arrives, and a later t does not bring it back', () => {
    // Two artworks of one geometry and material share a mesh; with stagger order the second one's instance arrives in the second half of the step.
    const { timeline, picker } = scene([{ near: 3, material: bronze, tag: art('1'), x: 5 }, { near: 3, material: bronze, tag: art('2') }]);
    const label = new ArtLabel();
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    label.frame(false, VIEW);
    expect(label.id).toBe('2');
    timeline.evaluate(0.3);
    expect(timeline.steps[0]?.meshes[0]?.count, 'the first artwork has arrived, the second not').toBe(1);
    label.frame(false, VIEW);
    expect(label.id).toBeNull();
    timeline.evaluate(1);
    label.frame(false, VIEW);
    expect(label.id, 'still hidden once it is back').toBeNull();
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    timeline.evaluate(0);
    label.frame(false, VIEW);
    expect(label.id, 'at t = 0').toBeNull();
  });

  it('hides once the cut lies under every piece of the artwork or the camera draws none of its layers, and keeps it while the cut passes through a piece', () => {
    // An artwork of two pieces, its plinth from 0 to 3 m, which the eye's ray meets, and its object on it from 3 to 6 m; and a wall beside it.
    const { timeline, picker } = scene([{ near: 3, material: bronze, tag: art('7') }, { near: 3, material: bronze, tag: art('7'), y: 4.5 }, { near: 3, material: stone, x: 10 }]);
    const step = timeline.steps[0];
    if (step === undefined) throw new Error('No step was built.');
    expect(artworkInstances(step, '7').length, 'the artwork’s pieces').toBe(2);
    const label = new ArtLabel((_hit, id) => artworkInstances(step, id));
    const shown = (view: DrawnView): string | null => {
      label.frame(false, view);
      return label.id;
    };
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    expect(shown(VIEW)).toBe('7');
    expect(shown(cutAt(20)), 'a cut over it all').toBe('7');
    expect(shown(cutAt(4.5)), 'a cut through the object').toBe('7');
    expect(shown(cutAt(2)), 'a cut through the plinth alone, which the picker still meets as the artwork').toBe('7');
    expect(shown(cutAt(-0.5)), 'a cut under every piece').toBeNull();
    expect(shown(VIEW), 'not back once the cut is off').toBeNull();
    // On no layer the camera draws (a floor view's hidden landscape is drawn on none).
    label.click(picker.hit(forward(), ARTWORK_QUERY));
    expect(shown(VIEW)).toBe('7');
    const mesh = step.meshes[0];
    if (mesh === undefined) throw new Error('No mesh was built.');
    mesh.layers.set(1);
    expect(shown(VIEW), 'its mesh on a layer the camera does not draw').toBeNull();
    mesh.layers.set(0);
  });
});

describe('the card while walking', () => {
  it('is the look target’s artwork, none for a door or nothing; clicks and Esc change nothing', () => {
    const { picker } = scene([{ near: 1.5, material: glass, tag: door, x: 3 }, { near: 3, material: bronze, tag: art('11013') }]);
    const hit = (ray: Ray, query: Parameters<ModelPicker['hit']>[1]): ReturnType<ModelPicker['hit']> => picker.hit(ray, query);
    const label = new ArtLabel();
    label.look(lookTarget(hit, eye, ahead));
    label.frame(true, VIEW);
    expect(label.id).toBe('11013');
    label.click(null);
    label.dismiss();
    label.frame(true, VIEW);
    expect(label.id, 'a click and Esc while walking').toBe('11013');
    label.look(lookTarget(hit, new Vector3(3, 1.6, 0), ahead));
    expect(label.id, 'looking at a door').toBeNull();
    label.look(lookTarget(hit, eye, ahead));
    expect(label.id, 'looking back').toBe('11013');
    label.look(lookTarget(hit, eye, new Vector3(0, 0, 1)));
    expect(label.id, 'looking away').toBeNull();
    label.look(null);
    expect(label.id, 'preparing').toBeNull();
  });

  it('keeps the look target’s card as the orbit view’s when walk mode ends, until a click elsewhere, Esc or the cut takes it; none after a look away, at a door or for a preset (work unit 14)', () => {
    const { picker } = scene([{ near: 1.5, material: glass, tag: door, x: 3 }, { near: 3, material: bronze, tag: art('11013') }]);
    const hit = (ray: Ray, query: Parameters<ModelPicker['hit']>[1]): ReturnType<ModelPicker['hit']> => picker.hit(ray, query);
    const label = new ArtLabel();
    /** Walking, looking at the artwork straight ahead. */
    const looking = (): void => {
      label.frame(true, VIEW);
      label.look(lookTarget(hit, eye, ahead));
      label.frame(true, VIEW);
      expect(label.id, 'walking, the look target’s card').toBe('11013');
    };
    looking();
    // Walk mode left (Esc, F or the lock lost): it tells null, then the next frame is the orbit view's.
    label.look(null);
    label.frame(false, VIEW);
    expect(label.id, 'left looking at it: the orbit view keeps its card').toBe('11013');
    label.frame(false, VIEW);
    expect(label.id, 'and the frame after').toBe('11013');
    label.dismiss();
    expect(label.id, 'Esc hides it').toBeNull();
    looking();
    label.look(null);
    label.frame(false, VIEW);
    label.click(picker.hit(new Ray(new Vector3(9, 1.6, 0), ahead.clone()), ARTWORK_QUERY));
    expect(label.id, 'a click on nothing hides it').toBeNull();
    looking();
    label.look(null);
    label.frame(false, cutAt(-1));
    expect(label.id, 'the cut under every piece of it: none').toBeNull();
    looking();
    label.look(null);
    label.frame(true, VIEW);
    expect(label.id, 'looked away while walking').toBeNull();
    label.frame(false, VIEW);
    expect(label.id, 'then left: none kept').toBeNull();
    looking();
    label.look(lookTarget(hit, new Vector3(3, 1.6, 0), ahead));
    label.frame(true, VIEW);
    label.look(null);
    label.frame(false, VIEW);
    expect(label.id, 'left looking at a door: none').toBeNull();
    looking();
    // A preset leaves walk mode, then dismisses the card (src/main.ts `applyPreset`).
    label.look(null);
    label.dismiss();
    label.frame(false, VIEW);
    expect(label.id, 'a preset chosen while walking: none').toBeNull();
  });

  it('replaces an orbit click’s card with the look target’s when walk mode begins', () => {
    const { picker } = scene([{ near: 3, material: bronze, tag: art('11013') }, { near: 3, material: bronze, tag: art('547802'), x: -10 }]);
    const hit = (ray: Ray, query: Parameters<ModelPicker['hit']>[1]): ReturnType<ModelPicker['hit']> => picker.hit(ray, query);
    const label = new ArtLabel();
    label.frame(false, VIEW);
    label.click(picker.hit(new Ray(new Vector3(-10, 1.6, 0), ahead.clone()), ARTWORK_QUERY));
    expect(label.id).toBe('547802');
    label.frame(true, VIEW);
    expect(label.id, 'walk mode preparing: the orbit card is gone').toBeNull();
    label.look(lookTarget(hit, eye, ahead));
    label.frame(true, VIEW);
    expect(label.id).toBe('11013');
    label.frame(false, VIEW);
    expect(label.id, 'back in the orbit view with no null from walk mode, which its leaving always tells: no card is kept').toBeNull();
    label.look(lookTarget(hit, eye, ahead));
    expect(label.id, 'a look target given in the orbit view shows no card').toBeNull();
    label.click(picker.hit(new Ray(new Vector3(-10, 1.6, 0), ahead.clone()), ARTWORK_QUERY));
    expect(label.id, 'clicks count again in the orbit view').toBe('547802');
  });
});
