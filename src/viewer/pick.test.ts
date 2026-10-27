/**
 * What a ray meets (src/viewer/pick.ts). The zoom's `distance` on one instanced box: met where it is drawn, passed through when the camera's layers do not
 * draw its mesh (the landscape a floor view hides), and passed through above the section cut on a material the cut clips. The hit query `hit` on
 * fixture steps built by the real timeline, with tags from `Timeline.tagOf`: the nearest accepted piece with its mesh, instance, distance and tag;
 * a wall in front hides it; glass stops it unless the query passes through transparent pieces, while a tagged glass piece is found when accepted
 * and stops the ray when not, as a glazed door out of reach does; `far` and the accepted distance bound it; only drawn instances count; a pointer
 * ray from an orbit camera far off finds an artwork in a vitrine under a skylight; and a registered stand-in counts in both queries by its own tags
 * and the camera's layers, its BVH built as it joins, until it is unregistered.
 * Bound: boxes and straight rays, no WebGL.
 */
import { BoxGeometry, InstancedMesh, Layers, Matrix4, MeshStandardMaterial, Quaternion, Ray, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit, PieceTag, StepDef } from '../build/types.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { ModelPicker } from './pick.js';
import type { HitQuery } from './pick.js';

function boxAhead(): InstancedMesh {
  const geometry = new BoxGeometry(2, 2, 2);
  geometry.computeBoundingBox();
  const mesh = new InstancedMesh(geometry, new MeshStandardMaterial(), 1);
  mesh.setMatrixAt(0, new Matrix4().makeTranslation(0, 1, -10));
  mesh.computeBoundingSphere();
  return mesh;
}

describe('ModelPicker.distance, the zoom’s pick', () => {
  const ray = new Ray(new Vector3(0, 1, 0), new Vector3(0, 0, -1));

  it('meets a drawn piece and passes through one on no layer the camera draws', () => {
    const mesh = boxAhead();
    const cut = { enabled: false, height: 0 };
    const picker = new ModelPicker([mesh], new GeometryBvhs(), -5, cut, new Layers());
    expect(picker.distance(ray)).toBeCloseTo(9, 9);
    mesh.layers.mask = 0;
    expect(picker.distance(ray)).toBeNull();
    mesh.layers.set(0);
    expect(picker.distance(ray)).toBeCloseTo(9, 9);
  });

  it('passes through a piece above the section cut, as the eye does', () => {
    const mesh = boxAhead();
    const picker = new ModelPicker([mesh], new GeometryBvhs(), -5, { enabled: true, height: 0.5 }, new Layers());
    expect(picker.distance(ray)).toBeNull();
  });
});

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });
const bronze = new MeshStandardMaterial({ name: 'bronze' });
const glass = new MeshStandardMaterial({ name: 'glass', transparent: true, opacity: 0.3 });

/** A slab across the ray's path (−Z from the origin) whose near face is `near` metres away: 4 m wide, 3 m high, 0.1 m thick. */
const slab = (near: number): Matrix4 => new Matrix4().compose(new Vector3(0, 1.5, -near - 0.05), new Quaternion(), new Vector3(4, 3, 0.1));

interface Piece {
  readonly near: number;
  readonly material: Material;
  readonly tag?: PieceTag;
}

/** A picker over a one-step timeline of `pieces`, at t = N, with the timeline's tags. */
function scene(pieces: readonly Piece[], cut = { enabled: false, height: 0 }): { picker: ModelPicker; timeline: Timeline } {
  const step: StepDef = {
    id: 'pieces',
    chapter: CHAPTERS[0].id,
    title: 'pieces',
    motion: { kind: 'rise' },
    build(kit: Kit) {
      for (const p of pieces) {
        if (p.tag === undefined) kit.add(cube, p.material, slab(p.near));
        else kit.addTagged(cube, p.material, slab(p.near), p.tag);
      }
    },
  };
  const timeline = new Timeline([step]);
  timeline.evaluate(timeline.n);
  const meshes = timeline.steps.flatMap((s) => s.meshes);
  return { timeline, picker: new ModelPicker(meshes, new GeometryBvhs(), -5, cut, new Layers(), (mesh, i) => timeline.tagOf(mesh, i)) };
}

const eye = new Ray(new Vector3(0, 1.6, 0), new Vector3(0, 0, -1));
const tagged: HitQuery = { accept: (tag) => tag !== null };
const art: PieceTag = { kind: 'artwork', id: '437788' };
const door: PieceTag = { kind: 'door', id: 'hunt-central-north' };

describe('ModelPicker.hit, the hit query', () => {
  it('finds the nearest accepted piece, with its mesh, instance, distance and tag', () => {
    const { picker, timeline } = scene([{ near: 8, material: stone }, { near: 5, material: bronze, tag: art }]);
    const hit = picker.hit(eye, tagged);
    expect(hit?.distance).toBeCloseTo(5, 6);
    expect(hit?.tag).toEqual(art);
    if (hit === null) throw new Error('No hit.');
    expect(timeline.tagOf(hit.mesh, hit.instance)).toEqual(art);
    // Without a query it is the first surface, whatever it is, as for the zoom.
    expect(picker.hit(eye)?.distance).toBeCloseTo(5, 6);
  });

  it('never looks through a wall: an opaque piece it does not accept in front hides the piece behind it', () => {
    const { picker } = scene([{ near: 4, material: stone }, { near: 5, material: bronze, tag: art }]);
    expect(picker.hit(eye, tagged)).toBeNull();
    expect(picker.hit(eye, { ...tagged, throughTransparent: true })).toBeNull();
  });

  it('stops at glass as the zoom does, and passes through it when asked: an artwork in a vitrine is found, never one behind a wall', () => {
    const vitrine = scene([{ near: 3, material: glass }, { near: 5, material: bronze, tag: art }]);
    expect(vitrine.picker.distance(eye), 'the zoom stops at the glass').toBeCloseTo(3, 6);
    expect(vitrine.picker.hit(eye, tagged), 'glass stops a query that does not pass through it').toBeNull();
    expect(vitrine.picker.hit(eye, { ...tagged, throughTransparent: true })?.tag).toEqual(art);
    const walled = scene([{ near: 3, material: glass }, { near: 4, material: stone }, { near: 5, material: bronze, tag: art }]);
    expect(walled.picker.hit(eye, { ...tagged, throughTransparent: true })).toBeNull();
  });

  it('finds a tagged glass piece itself, as a glazed door is found by its glass', () => {
    const { picker } = scene([{ near: 1.5, material: glass, tag: door }, { near: 5, material: bronze, tag: art }]);
    const hit = picker.hit(eye, { ...tagged, throughTransparent: true });
    expect(hit?.tag).toEqual(door);
    expect(hit?.distance).toBeCloseTo(1.5, 6);
  });

  it('stops at a tagged glass piece it does not accept, as at a wall: a glazed door out of reach or of another kind hides what is behind it', () => {
    const { picker } = scene([{ near: 3, material: glass, tag: door }, { near: 4, material: bronze, tag: art }]);
    const inReach = (tag: PieceTag | null, d: number): boolean => tag !== null && d <= (tag.kind === 'door' ? 2 : 6);
    expect(picker.hit(eye, { throughTransparent: true, accept: inReach }), 'a glass door 3 m off, out of its 2 m reach').toBeNull();
    expect(picker.hit(eye, { throughTransparent: true, accept: (tag) => tag?.kind === 'artwork' }), 'a glass door to a query for artworks').toBeNull();
    // Untagged glass in the same place still lets the ray on.
    expect(scene([{ near: 3, material: glass }, { near: 4, material: bronze, tag: art }]).picker.hit(eye, { throughTransparent: true, accept: inReach })?.tag).toEqual(art);
  });

  it('counts only what the query accepts at its distance and what lies within far', () => {
    const { picker } = scene([{ near: 5, material: bronze, tag: art }]);
    expect(picker.hit(eye, { accept: (tag, d) => tag !== null && d <= 6 })?.distance).toBeCloseTo(5, 6);
    expect(picker.hit(eye, { accept: (tag, d) => tag !== null && d <= 4.9 }), 'beyond the accepted distance').toBeNull();
    expect(picker.hit(eye, { ...tagged, far: 4.9 }), 'beyond far').toBeNull();
    expect(picker.hit(eye, { accept: (tag) => tag?.kind === 'door' }), 'a kind the query does not look for stops the ray').toBeNull();
  });

  it('counts only drawn instances: none of a step not yet started, none on a layer the camera does not draw', () => {
    const { picker, timeline } = scene([{ near: 5, material: bronze, tag: art }]);
    timeline.evaluate(0);
    expect(picker.hit(eye, tagged)).toBeNull();
    timeline.evaluate(1);
    expect(picker.hit(eye, tagged)?.tag).toEqual(art);
    for (const mesh of timeline.steps[0]?.meshes ?? []) mesh.layers.mask = 0;
    expect(picker.hit(eye, tagged)).toBeNull();
  });

  it('serves a pointer ray from an orbit camera far off: through a skylight’s glass to an artwork in a vitrine', () => {
    const step: StepDef = {
      id: 'room',
      chapter: CHAPTERS[0].id,
      title: 'room',
      motion: { kind: 'rise' },
      build(kit: Kit) {
        kit.add(cube, glass, new Matrix4().compose(new Vector3(0, 8, 0), new Quaternion(), new Vector3(10, 0.05, 10)));
        kit.add(cube, glass, new Matrix4().compose(new Vector3(0, 1.2, 0), new Quaternion(), new Vector3(1, 1, 1)));
        kit.addTagged(cube, bronze, new Matrix4().compose(new Vector3(0, 1, 0), new Quaternion(), new Vector3(0.4, 0.6, 0.4)), art);
        kit.add(cube, stone, new Matrix4().compose(new Vector3(0, -0.1, 0), new Quaternion(), new Vector3(10, 0.2, 10)));
      },
    };
    const timeline = new Timeline([step]);
    timeline.evaluate(1);
    const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), -5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
    const from = new Vector3(60, 90, 40);
    const pointer = new Ray(from, new Vector3(0, 1.1, 0).sub(from).normalize());
    const hit = picker.hit(pointer, { throughTransparent: true, accept: (tag) => tag?.kind === 'artwork' });
    expect(hit?.tag).toEqual(art);
    expect(hit?.distance).toBeGreaterThan(100);
  });

  it('meets a registered stand-in in both queries, by its own tags and the camera’s layers, its BVH built as it joins, until it is unregistered', () => {
    const bvhs = new GeometryBvhs();
    const picker = new ModelPicker([], bvhs, -5, { enabled: false, height: 0 }, new Layers());
    const leaf = new InstancedMesh(new BoxGeometry(1, 1, 1), bronze, 1);
    leaf.setMatrixAt(0, slab(2));
    leaf.computeBoundingSphere();
    expect(picker.distance(eye)).toBeNull();
    picker.register([leaf], () => door);
    expect(bvhs.geometries, 'its BVH, built as it joined').toBe(1);
    expect(picker.distance(eye), 'the zoom meets it').toBeCloseTo(2, 6);
    expect(picker.hit(eye, tagged)?.tag, 'the hit query finds it by its own tag').toEqual(door);
    leaf.layers.set(1);
    expect(picker.hit(eye, tagged), 'on a layer the camera does not draw, it is passed through').toBeNull();
    leaf.layers.set(0);
    picker.unregister([leaf]);
    expect(picker.distance(eye), 'unregistered').toBeNull();
  });
});
