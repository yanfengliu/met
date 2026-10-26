/**
 * The walking eye's look target (src/walk/look.ts) through the page's hit query (src/viewer/pick.ts) on fixture steps built by the real timeline:
 * a door within 2 m and an artwork within 6 m are targets, just past their reach they are not; an artwork in a vitrine is found through its glass, never
 * through a wall or past a door not in reach; an untagged piece is never a target; the eye's height and direction come in as the walker gives them.
 * Bound: boxes on a straight ray from an eye 1.6 m up; the walk mode's own use (every frame, and afresh when read) is in src/walk/walk-mode.ts.
 */
import { BoxGeometry, Layers, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
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
