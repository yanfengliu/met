/**
 * The walking eye's look target (src/walk/look.ts) through the page's hit query (src/viewer/pick.ts) on fixture steps built by the real timeline:
 * a door within 2 m and an artwork within 6 m are targets, just past their reach they are not; an artwork in a vitrine is found through its glass, never
 * through a wall or past a door, glazed or not, out of reach; an untagged piece is never a target; the eye's height and direction come in as the walker gives them;
 * a viewer-side stand-in registered with the picker (`ModelPicker.register`) takes the place of an original hidden by the camera's layers, blocking
 * where it stands, closed or swung.
 * Bound: boxes on straight rays from an eye 1.6 m up; the walk mode's own use (every frame, and afresh when read) is in src/walk/walk-mode.ts.
 */
import { BoxGeometry, InstancedMesh, Layers, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, PieceTag, StepDef } from '../build/types.js';
import { ModelPicker } from '../viewer/pick.js';
import { GeometryBvhs } from './bvh-cache.js';
import { LOOK_QUERY, LOOK_REACH, lookTarget } from './look.js';
import type { HitFn } from './look.js';

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const bronze = new MeshStandardMaterial({ name: 'bronze' });
const glass = new MeshStandardMaterial({ name: 'glass', transparent: true, opacity: 0.3 });

interface Piece {
  /** Metres from the eye to the piece's near face, straight ahead (−Z). */
  readonly near: number;
  readonly material: Material;
  readonly tag?: PieceTag;
}

/** The page's hit query over a one-step timeline of slabs across the eye's path, at t = N. */
function hitIn(pieces: readonly Piece[]): HitFn {
  const step: StepDef = {
    id: 'look',
    chapter: CHAPTERS[0].id,
    title: 'look',
    motion: { kind: 'rise' },
    build(kit: Kit) {
      for (const p of pieces) {
        const matrix = new Matrix4().compose(new Vector3(0, 1.5, -p.near - 0.05), new Quaternion(), new Vector3(3, 3, 0.1));
        if (p.tag === undefined) kit.add(cube, p.material, matrix);
        else kit.addTagged(cube, p.material, matrix, p.tag);
      }
    },
  };
  const timeline = new Timeline([step]);
  timeline.evaluate(1);
  const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), -5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
  return (ray, query) => picker.hit(ray, query);
}

const eye = new Vector3(0, 1.6, 0);
const ahead = new Vector3(0, 0, -1);
const door: PieceTag = { kind: 'door', id: 'weston' };
const art: PieceTag = { kind: 'artwork', id: '11013' };

describe('the look target', () => {
  it('is a door within 2 m and an artwork within 6 m, and nothing just past their reach', () => {
    expect(LOOK_REACH).toEqual({ door: 2, artwork: 6 });
    expect(LOOK_QUERY.far).toBe(6);
    for (const [tag, reach] of [[door, LOOK_REACH.door], [art, LOOK_REACH.artwork]] as const) {
      const near = lookTarget(hitIn([{ near: reach - 0.05, material: bronze, tag }]), eye, ahead);
      expect(near, `${tag.kind} 5 cm inside its reach`).toMatchObject({ kind: tag.kind, id: tag.id });
      expect(near?.distance).toBeCloseTo(reach - 0.05, 6);
      expect(lookTarget(hitIn([{ near: reach + 0.05, material: bronze, tag }]), eye, ahead), `${tag.kind} 5 cm past its reach`).toBeNull();
    }
  });

  it('finds an artwork through a vitrine’s glass, never through a wall or past a door out of reach', () => {
    expect(lookTarget(hitIn([{ near: 2, material: glass }, { near: 2.4, material: bronze, tag: art }]), eye, ahead)?.id).toBe('11013');
    expect(lookTarget(hitIn([{ near: 2, material: stone }, { near: 2.4, material: bronze, tag: art }]), eye, ahead)).toBeNull();
    expect(lookTarget(hitIn([{ near: 3, material: bronze, tag: door }, { near: 4, material: bronze, tag: art }]), eye, ahead), 'a closed door 3 m off hides the artwork behind it').toBeNull();
    expect(lookTarget(hitIn([{ near: 3, material: glass, tag: door }, { near: 4, material: bronze, tag: art }]), eye, ahead), 'so does a glass door 3 m off, out of its reach').toBeNull();
  });

  it('is never an untagged piece, and is the nearer of two tagged ones', () => {
    expect(lookTarget(hitIn([{ near: 1, material: stone }]), eye, ahead)).toBeNull();
    expect(lookTarget(hitIn([{ near: 1.5, material: glass, tag: door }, { near: 3, material: bronze, tag: art }]), eye, ahead)?.kind).toBe('door');
  });

  it('follows the eye and its direction: looking away or from where the piece is behind finds nothing', () => {
    const hit = hitIn([{ near: 3, material: bronze, tag: art }]);
    expect(lookTarget(hit, eye, ahead)?.id).toBe('11013');
    expect(lookTarget(hit, eye, new Vector3(0, 0, 1))).toBeNull();
    expect(lookTarget(hit, new Vector3(0, 1.6, -10), ahead)).toBeNull();
    expect(lookTarget(hit, eye, new Vector3(0, -1, -1).normalize()), 'looking down at the floor in front').toBeNull();
  });
});

describe('the look target with a viewer-side stand-in (ModelPicker.register)', () => {
  it('drops an original hidden by the camera’s layers; a closed glass stand-in out of reach blocks, and a swung one blocks only where it stands', () => {
    // A painting 4 m ahead, another on the left wall, and the timeline’s glass door 3 m ahead.
    const slab = (x: number, z: number, w: number, d: number): Matrix4 => new Matrix4().compose(new Vector3(x, 1.5, z), new Quaternion(), new Vector3(w, 3, d));
    const step: StepDef = {
      id: 'room',
      chapter: CHAPTERS[0].id,
      title: 'room',
      motion: { kind: 'rise' },
      build(kit: Kit) {
        kit.addTagged(cube, bronze, slab(0, -4.05, 3, 0.1), art);
        kit.addTagged(cube, bronze, slab(-3.05, -3, 0.1, 4), { kind: 'artwork', id: 'left' });
        kit.addTagged(cube, glass, slab(0, -3.05, 3, 0.1), door);
      },
    };
    const timeline = new Timeline([step]);
    timeline.evaluate(1);
    const meshes = timeline.steps.flatMap((s) => s.meshes);
    const picker = new ModelPicker(meshes, new GeometryBvhs(), -5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
    const left = new Vector3(-3, 0, -4).normalize();
    const look = (direction: Vector3): string | null => lookTarget((ray, query) => picker.hit(ray, query), eye, direction)?.id ?? null;
    expect(look(ahead), 'the timeline’s glass door 3 m off, out of reach, hides the painting').toBeNull();
    expect(look(left)).toBe('left');
    // The original goes onto a layer the camera does not draw; a stand-in of it joins the picker in its place, closed.
    const original = meshes.find((m) => timeline.tagOf(m, 0)?.kind === 'door');
    if (original === undefined) throw new Error('The timeline built no door mesh.');
    original.layers.set(1);
    expect(look(ahead), 'the original hidden, no stand-in: the painting').toBe(art.id);
    const leaf = new InstancedMesh(cube, glass, 1);
    leaf.setMatrixAt(0, slab(0, -3.05, 3, 0.1));
    leaf.computeBoundingSphere();
    picker.register([leaf], () => door);
    expect(look(ahead), 'the closed stand-in 3 m off hides the painting').toBeNull();
    expect(look(left), 'but not the left wall’s').toBe('left');
    // Swung open toward the eye about its hinge at X −1.5, it stands along the left of the way through.
    leaf.setMatrixAt(0, slab(-1.55, -1.5, 0.1, 3));
    leaf.computeBoundingSphere();
    expect(look(ahead), 'swung open: the painting ahead').toBe(art.id);
    expect(look(left), 'and the swung leaf, 2.5 m off on that ray, hides the left wall’s').toBeNull();
    picker.unregister([leaf]);
    expect(look(left), 'unregistered: the left wall’s painting again').toBe('left');
  });
});
