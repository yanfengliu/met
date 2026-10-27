/**
 * The door layer (src/viewer/doors.ts; docs/design/spec.md, Doors) on fixture steps built by the real timeline from real door units
 * (src/model/lib/window.ts `doorUnit`): it hides a built door's closed leaves by their layer mask alone and draws each leaf at the piece's matrix times its
 * turn about its hinge; across random histories with doors used in between, the timeline's own state is byte for byte a timeline's without the layer
 * (review 0, F1); the stand-ins share the closed leaves' materials, so the section cut clips them alike, are met by the zoom's pick and the hit query
 * where they stand and not where the closed leaves stood, are capped where the cut passes through them, open or part open, and hold bounds over every
 * pose (F3); the lifecycle: unusable while its step is incomplete, the timeline's closed leaf taking over at once while the door keeps its state,
 * reset when the step is taken away, the default taken when the step completes, into the building with no walker, never past a lock (F4).
 * Bound: no WebGL; the cap pass's choice and the picks are checked on the meshes, not on pixels (tests/e2e/doors.spec.ts looks at pixels).
 */
import { BoxGeometry, Box3, Layers, Matrix4, MeshStandardMaterial, Quaternion, Ray, Vector3 } from 'three';
import type { InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { firstDifference, random, snapshot } from '../build/testing.js';
import { Timeline } from '../build/timeline.js';
import type { PieceTag, StepDef } from '../build/types.js';
import { doorLeavesOf, doorUnit } from '../model/lib/window.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CapPass } from './cap-pass.js';
import { DoorLayer, SWING_SECONDS, ease, hingeTurn } from './doors.js';
import type { DoorDef } from './doors.js';
import { ModelPicker } from './pick.js';
import { SectionCut, cappedBySection } from './section-cut.js';

const bronze = new MeshStandardMaterial({ name: 'bronze' });
const glass = new MeshStandardMaterial({ name: 'glass', transparent: true, opacity: 0.4 });
const wood = new MeshStandardMaterial({ name: 'wood' });
const stone = new MeshStandardMaterial({ name: 'stone' });
const cube = new BoxGeometry(1, 1, 1);
/** A glazed pair like the Hunt entrance's, and a panelled pair like the links'. */
const GLAZED = { width: 1.8, height: 3, leaves: 2, glazed: true, lights: 3, fanlight: false, frame: 0.09, bar: 0.05, depth: 0.14 } as const;
const glazed = doorUnit(GLAZED);
const panelled = doorUnit({ width: 2, height: 3.4, leaves: 2, panels: 4 });
/** The glazed unit's half clear width, its leaves' mid-plane and thickness. */
const W = GLAZED.width / 2 - GLAZED.frame;
const ZC = -GLAZED.depth / 2;
const T = 0.07;
const QUARTER = Math.PI / 2;
const tag = (id: string): PieceTag => ({ kind: 'door', id });
const DEFS: readonly DoorDef[] = [
  { id: 'front', locked: false },
  { id: 'side', locked: false },
  { id: 'shut', locked: true },
];
/** The `side` door's unit: at (10, 0, 0), turned to face −X; the `shut` door's at (−10, 0, 0). */
const SIDE = new Matrix4().makeTranslation(10, 0, 0).multiply(new Matrix4().makeRotationY(-QUARTER));
const SHUT = new Matrix4().makeTranslation(-10, 0, 0);
const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): Matrix4 => new Matrix4().compose(new Vector3(cx, cy, cz), new Quaternion(), new Vector3(sx, sy, sz));

function step(id: string, build: StepDef['build']): StepDef {
  return { id, chapter: CHAPTERS[0].id, title: id, motion: { kind: 'rise' }, stagger: 'order', build };
}

/** Ground; the doors (the glazed `front` at the origin facing +Z with a wall 3 m behind it, the glazed `side`, the locked panelled `shut`); a later step. */
const STEPS: readonly StepDef[] = [
  step('ground', (kit) => { kit.add(cube, stone, box(0, -0.5, 0, 40, 1, 40)); }),
  step('doors', (kit) => {
    const origin = new Matrix4();
    kit.add(glazed.frame, bronze, origin);
    kit.addTagged(glazed.leaf, bronze, origin, tag('front'));
    if (glazed.leafGlass !== undefined) kit.addTagged(glazed.leafGlass, glass, origin, tag('front'));
    kit.add(cube, stone, box(0, 1.5, -3, 6, 3, 0.2));
    kit.addTagged(glazed.leaf, bronze, SIDE, tag('side'));
    if (glazed.leafGlass !== undefined) kit.addTagged(glazed.leafGlass, glass, SIDE, tag('side'));
    kit.add(panelled.frame, bronze, SHUT);
    kit.addTagged(panelled.leaf, wood, SHUT, tag('shut'));
  }),
  step('later', (kit) => { kit.add(cube, stone, box(0, 0.5, 20, 1, 1, 1)); }),
];
/** The doors' step's index and the position where it is complete. */
const DOORS_STEP = 1;
const BUILT = DOORS_STEP + 1;

function fixture(start: 'open' | 'closed' = 'closed'): { timeline: Timeline; layer: DoorLayer } {
  const timeline = new Timeline(STEPS);
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DEFS, doorLeavesOf, start);
  return { timeline, layer };
}

/** The timeline's meshes holding door `id`'s closed leaves. */
function doorMeshes(timeline: Timeline, id: string): InstancedMesh[] {
  return timeline.steps.flatMap((s) => s.meshes.filter((m) => Array.from({ length: m.instanceMatrix.count }, (_, i) => timeline.tagOf(m, i)).some((t) => t?.id === id)));
}

/** Every drawn stand-in instance of door `id`: its mesh, its matrix and the world box of its geometry there. */
function drawn(layer: DoorLayer, id: string): { mesh: InstancedMesh; matrix: Matrix4; box: Box3 }[] {
  return layer.meshes.flatMap((mesh) =>
    Array.from({ length: mesh.count }, (_, i) => i)
      .filter((i) => layer.tagOf(mesh, i)?.id === id)
      .map((i) => {
        const matrix = new Matrix4().fromArray(mesh.instanceMatrix.array, i * 16);
        if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
        return { mesh, matrix, box: (mesh.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix) };
      }),
  );
}

/** Brings the layer to `t` after `seconds`, as the page's frame does after evaluating the timeline. */
function at(timeline: Timeline, layer: DoorLayer, t: number, seconds = 0, instant = false): boolean {
  timeline.evaluate(t);
  return layer.sync(t, seconds, instant);
}

const facts = (layer: DoorLayer, id: string): ReturnType<DoorLayer['facts']>[number] | undefined => layer.facts().find((d) => d.id === id);

describe('the door layer', () => {
  it('hides a built door’s closed leaves by their layer mask only and draws each leaf at the piece’s matrix times its turn about its hinge', () => {
    const { timeline, layer } = fixture();
    const front = doorMeshes(timeline, 'front');
    expect(front.map((m) => m.material)).toEqual([bronze, glass]);
    at(timeline, layer, BUILT);
    expect(front.map((m) => m.layers.mask), 'the closed leaves are on no layer').toEqual([0, 0]);
    expect(doorMeshes(timeline, 'shut').map((m) => m.layers.mask), 'a locked door is never hidden').toEqual([1]);
    expect(front.every((m) => m.visible && m.count === m.instanceMatrix.count), 'the timeline still shows them as it would').toBe(true);
    // Four stand-ins: each leaf's metal and glass, shared by both doors that open; none for the locked one.
    expect(layer.meshes.map((m) => [m.material, m.count])).toEqual([[bronze, 2], [bronze, 2], [glass, 2], [glass, 2]]);
    // Closed, every leaf stands where the closed piece does.
    for (const d of drawn(layer, 'front')) expect(d.matrix.equals(new Matrix4()), 'closed: the piece’s own matrix').toBe(true);
    // Opened from in front, a full swing later: each leaf a quarter turn into the back, against its jamb.
    expect(layer.use('front', new Vector3(0, 1.6, 3))).toBe(true);
    at(timeline, layer, BUILT, SWING_SECONDS);
    expect(facts(layer, 'front')).toEqual({ id: 'front', state: 'open', angle: 90, locked: false, built: true });
    const leaves = drawn(layer, 'front');
    expect(leaves).toHaveLength(4);
    for (const { mesh, box: b } of leaves) {
      expect(b.max.z, 'behind the leaves’ closed place').toBeLessThan(ZC + T / 2);
      if (mesh.material === glass) {
        // A pane, a stile in from the leaf's edges, in the leaf's mid-plane: across the opening at the pivot, a thickness's half from the jamb.
        expect(b.min.z).toBeCloseTo(ZC + T / 2 + 0.004 - W + GLAZED.bar, 6);
        expect(Math.min(Math.abs(b.min.x + W - T / 2), Math.abs(b.max.x - W + T / 2)), 'at the pivot').toBeLessThan(1e-6);
        continue;
      }
      expect(b.min.z, 'a leaf’s width back').toBeCloseTo(ZC + T / 2 + 0.004 - W, 6);
      const nearJamb = Math.min(Math.abs(b.min.x + W), Math.abs(b.max.x - W));
      expect(nearJamb, 'against a jamb').toBeLessThan(1e-6);
      expect(b.max.x - b.min.x, 'edge on, a thickness wide').toBeLessThanOrEqual(T + 1e-6);
    }
    // The matrix itself, worked out apart: the left leaf turns about +Y through (−W + T/2, 0, ZC), the right about −Y through (W − T/2, 0, ZC).
    const turnAbout = (x: number, sign: number): Matrix4 => new Matrix4().makeTranslation(x, 0, ZC).multiply(new Matrix4().makeRotationY(sign * QUARTER)).multiply(new Matrix4().makeTranslation(-x, 0, -ZC));
    const expected = [turnAbout(-W + T / 2, 1), turnAbout(W - T / 2, -1)];
    for (const { matrix } of leaves) expect(expected.some((m) => m.elements.every((e, k) => Math.abs(e - (matrix.elements[k] ?? Number.NaN)) < 1e-6)), 'a leaf’s matrix is its jamb’s quarter turn, in float32').toBe(true);
    // The side door, turned to face −X, opens the same way in its own frame.
    expect(layer.use('side', new Vector3(6, 1.6, 0)), 'from in front of it, at −X').toBe(true);
    at(timeline, layer, BUILT, SWING_SECONDS);
    for (const { box: b } of drawn(layer, 'side')) expect(b.min.x, 'into its back, +X of its front').toBeGreaterThan(10 - ZC - T / 2 - 1e-6);
  });

  it('opens away from the walker, eased over SWING_SECONDS, and closes or turns back from where it stands', () => {
    const { timeline, layer } = fixture();
    at(timeline, layer, BUILT);
    expect(layer.prompt('front')).toBe('E Open');
    expect(layer.use('front', new Vector3(0, 1.6, -2)), 'from behind').toBe(true);
    expect(layer.prompt('front')).toBe('E Close');
    at(timeline, layer, BUILT, SWING_SECONDS / 2);
    expect(facts(layer, 'front')?.state).toBe('opening');
    expect(facts(layer, 'front')?.angle, 'half the time, half the turn (eased), toward the front').toBeCloseTo(-90 * ease(0.5), 9);
    at(timeline, layer, BUILT, SWING_SECONDS / 4);
    expect(facts(layer, 'front')?.angle).toBeCloseTo(-90 * ease(0.75), 9);
    // Turned back mid-swing: closing from where it stands, over the part of SWING_SECONDS that turn takes.
    expect(layer.use('front', new Vector3(0, 1.6, -2))).toBe(true);
    expect(layer.prompt('front')).toBe('E Open');
    const from = facts(layer, 'front')?.angle ?? 0;
    at(timeline, layer, BUILT, (SWING_SECONDS * Math.abs(from)) / 90 / 2);
    expect(facts(layer, 'front')?.state).toBe('closing');
    expect(facts(layer, 'front')?.angle).toBeCloseTo(from * (1 - ease(0.5)), 9);
    at(timeline, layer, BUILT, SWING_SECONDS);
    expect(facts(layer, 'front')).toMatchObject({ state: 'closed', angle: 0 });
    for (const d of drawn(layer, 'front')) expect(d.matrix.equals(new Matrix4())).toBe(true);
    // From in front it opens into the back.
    layer.use('front', new Vector3(0.3, 1.6, 4));
    at(timeline, layer, BUILT, SWING_SECONDS);
    expect(facts(layer, 'front')?.angle).toBe(90);
    // Nothing moves without a swing under way.
    expect(at(timeline, layer, BUILT, 1)).toBe(false);
  });

  it('is the timeline’s closed leaf while its step is incomplete, keeps its state until the step is taken away, and takes its default on completion', () => {
    const { timeline, layer } = fixture();
    const front = doorMeshes(timeline, 'front');
    at(timeline, layer, 1.5);
    expect(facts(layer, 'front')).toEqual({ id: 'front', state: 'closed', angle: 0, locked: false, built: false });
    expect(layer.use('front', new Vector3(0, 1.6, 3)), 'unusable while arriving').toBe(false);
    expect(layer.prompt('front')).toBeNull();
    expect(front.map((m) => m.layers.mask)).toEqual([1, 1]);
    expect(layer.meshes.every((m) => m.count === 0 && !m.visible), 'no stand-in drawn').toBe(true);
    at(timeline, layer, BUILT);
    layer.use('front', new Vector3(0, 1.6, 3));
    at(timeline, layer, BUILT, SWING_SECONDS / 2);
    // Scrubbed back into the step mid-swing: the closed leaf takes over at once; the door keeps the state its swing was heading for.
    expect(at(timeline, layer, 1.6)).toBe(true);
    expect(front.map((m) => m.layers.mask)).toEqual([1, 1]);
    expect(drawn(layer, 'front')).toEqual([]);
    expect(facts(layer, 'front')).toEqual({ id: 'front', state: 'open', angle: 90, locked: false, built: false });
    expect(layer.use('front', new Vector3(0, 1.6, 3))).toBe(false);
    // Complete again: open at once, no swing.
    at(timeline, layer, BUILT + 0.5);
    expect(front.map((m) => m.layers.mask)).toEqual([0, 0]);
    expect(facts(layer, 'front')).toMatchObject({ state: 'open', angle: 90, built: true });
    expect(at(timeline, layer, BUILT + 0.5, 0.1), 'and still').toBe(false);
    // Taken away (f = 0) and built again: its default, closed.
    at(timeline, layer, 0.4);
    expect(facts(layer, 'front')).toMatchObject({ state: 'closed', angle: 0, built: false });
    at(timeline, layer, BUILT);
    expect(facts(layer, 'front')).toMatchObject({ state: 'closed', angle: 0, built: true });
  });

  it('opens with doors=open into the building when its step completes, at once in capture mode, and never opens a locked door', () => {
    const { timeline, layer } = fixture('open');
    at(timeline, layer, 1.5);
    expect(facts(layer, 'front')?.angle).toBe(0);
    at(timeline, layer, BUILT, 0.1);
    expect(facts(layer, 'front')?.state, 'swinging open as the step completes').toBe('opening');
    at(timeline, layer, BUILT, SWING_SECONDS);
    expect(facts(layer, 'front'), 'with no walker, into the back').toMatchObject({ state: 'open', angle: 90 });
    const shot = fixture('open');
    at(shot.timeline, shot.layer, shot.timeline.n, 0, true);
    expect(shot.layer.facts().map((d) => [d.id, d.state, d.angle])).toEqual([['front', 'open', 90], ['side', 'open', 90], ['shut', 'closed', 0]]);
    expect(at(shot.timeline, shot.layer, shot.timeline.n, 0, true), 'standing, nothing left to change').toBe(false);
    // Locked: no prompt but Locked, no use, no stand-in, its piece never hidden, whatever the query.
    expect(shot.layer.prompt('shut')).toBe('Locked');
    expect(shot.layer.use('shut', new Vector3(-10, 1.6, 3))).toBe(false);
    expect(shot.layer.use('nowhere', new Vector3())).toBe(false);
    expect(shot.layer.prompt('nowhere')).toBeNull();
    expect(facts(shot.layer, 'shut')).toEqual({ id: 'shut', state: 'closed', angle: 0, locked: true, built: true });
    expect(doorMeshes(shot.timeline, 'shut').map((m) => m.layers.mask)).toEqual([1]);
  });

  it('leaves the timeline’s state byte for byte as a timeline’s without the layer, across random histories with doors used in between (review 0, F1)', () => {
    const { timeline, layer } = fixture();
    const alone = new Timeline(STEPS);
    const rand = random(29);
    const ids = ['front', 'side', 'shut'];
    for (let k = 0; k < 60; k += 1) {
      const t = rand() < 0.3 ? Math.round(rand() * 3) : rand() * 3;
      at(timeline, layer, t, rand() * 0.5);
      if (rand() < 0.5) layer.use(ids[Math.floor(rand() * 3)] ?? 'front', new Vector3(rand() * 4 - 2, 1.6, rand() * 8 - 4));
      layer.sync(t, rand() * 0.3);
      alone.evaluate(t);
      expect(firstDifference(snapshot(timeline), snapshot(alone)), `t ${t.toFixed(3)} after ${String(k)} steps`).toBeNull();
    }
  });

  it('shares the closed leaves’ materials, so the section cut clips the stand-ins alike, and holds bounds over every pose of its leaves', () => {
    const { timeline, layer } = fixture();
    const cut = new SectionCut();
    cut.attach(timeline.materials);
    cut.set(true, 1.5);
    for (const mesh of layer.meshes) {
      const material = mesh.material as Material;
      expect(timeline.materials.has(material), 'a timeline material').toBe(true);
      expect(material.clippingPlanes?.[0]).toBe(cut.plane);
    }
    at(timeline, layer, BUILT);
    for (const mesh of layer.meshes) {
      const sphere = mesh.boundingSphere;
      if (sphere === null || mesh.geometry.boundingBox === null) throw new Error('A stand-in has no bounds.');
      const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
        const b = mesh.geometry.boundingBox ?? new Box3();
        return new Vector3((c & 1) !== 0 ? b.max.x : b.min.x, (c & 2) !== 0 ? b.max.y : b.min.y, (c & 4) !== 0 ? b.max.z : b.min.z);
      });
      for (const [base, leaves] of [[new Matrix4(), doorLeavesOf(glazed.leaf)], [SIDE, doorLeavesOf(glazed.leaf)]] as const) {
        for (const part of leaves ?? []) {
          if (part.geometry !== mesh.geometry && doorLeavesOf(glazed.leafGlass ?? glazed.leaf)?.every((p) => p.geometry !== mesh.geometry)) continue;
          for (let a = -QUARTER; a <= QUARTER + 1e-9; a += QUARTER / 6) {
            const m = base.clone().multiply(hingeTurn(new Vector3(...part.hinge.point), new Vector3(...part.hinge.axis), a));
            for (const c of corners) expect(sphere.distanceToPoint(c.clone().applyMatrix4(m)), `a corner at ${a.toFixed(2)} rad`).toBeLessThanOrEqual(1e-9);
          }
        }
      }
    }
  });

  it('is met by the zoom’s pick and the hit query where its leaves stand, not where they stood, and capped where the cut passes through them, open or part open (review 0, F3)', () => {
    const { timeline, layer } = fixture();
    at(timeline, layer, BUILT);
    const meshes = [...timeline.steps.flatMap((s) => s.meshes), ...layer.meshes];
    const cut = { enabled: false, height: 0 };
    const picker = new ModelPicker(meshes, new GeometryBvhs(), -1, cut, new Layers(), (mesh, i) => timeline.tagOf(mesh, i) ?? layer.tagOf(mesh, i));
    const through = new Ray(new Vector3(-0.45, 1.5, 3), new Vector3(0, 0, -1));
    const doorQuery = { accept: (t: PieceTag | null): boolean => t?.kind === 'door', throughTransparent: true };
    // Closed: the ray meets the leaf (its glass, tagged) in the leaves' plane.
    expect(picker.distance(through)).toBeCloseTo(3 - ZC, 1);
    expect(picker.hit(through, doorQuery)?.tag).toEqual(tag('front'));
    // Open into the back: the zoom passes the doorway to the wall behind it, and the hit query finds no door there.
    layer.use('front', new Vector3(0, 1.6, 3));
    at(timeline, layer, BUILT, SWING_SECONDS);
    expect(picker.distance(through), 'through the opening the leaves left').toBeCloseTo(3 + 3 - 0.1, 6);
    expect(picker.hit(through, doorQuery)).toBeNull();
    // A ray across the opening, behind the frame, meets the left leaf where it now stands: its pane, across the ray at the pivot, between two bars;
    // a little lower, its bar, a thickness's half nearer.
    const across = new Ray(new Vector3(0, 1.5, ZC - 0.4), new Vector3(-1, 0, 0));
    const hit = picker.hit(across, doorQuery);
    expect(hit?.tag).toEqual(tag('front'));
    expect(hit?.distance, 'at the pane, in the leaf’s mid-plane at the pivot').toBeCloseTo(W - T / 2, 6);
    expect(picker.distance(across), 'and the zoom stops there').toBeCloseTo(W - T / 2, 6);
    const bar = GLAZED.frame + GLAZED.bar + (GLAZED.height - 0.004 - GLAZED.frame - GLAZED.frame - 2 * GLAZED.bar) / 3;
    const onBar = new Ray(new Vector3(0, bar, ZC - 0.4), new Vector3(-1, 0, 0));
    expect(picker.hit(onBar, doorQuery)?.distance, 'its bar, 0.4 of a thickness each side of the pane').toBeCloseTo(W - T / 2 - 0.4 * T, 6);
    // The cap pass: with the cut through the doors, it draws the leaves the plane passes through, open and part open, and never the hidden closed ones.
    const capped = meshes.filter((m) => cappedBySection(m.material as Material));
    const pass = new CapPass(capped, new MeshStandardMaterial());
    const capOf = (mesh: InstancedMesh): InstancedMesh | undefined => pass.scene.children.find((c) => c.name === `cap:${mesh.name}`) as InstancedMesh | undefined;
    for (const angle of [90, 45]) {
      if (angle === 45) {
        layer.use('front', new Vector3(0, 1.6, 3));
        at(timeline, layer, BUILT, SWING_SECONDS / 2);
      }
      const open = facts(layer, 'front')?.angle ?? 0;
      expect(open, `${String(angle)}°: open or part open`).toBeGreaterThan(20);
      pass.update(1.5);
      const metal = layer.meshes.filter((m) => m.material === bronze);
      const proxied = metal.reduce((n, m) => n + (capOf(m)?.count ?? 0), 0);
      expect(proxied, `${open.toFixed(1)}°: both doors’ leaves, the cut through each`).toBe(4);
      for (const hidden of doorMeshes(timeline, 'front')) {
        const proxy = capOf(hidden);
        if (proxy === undefined) continue;
        expect(proxy.layers.mask, 'the hidden closed leaves’ caps are hidden with them').toBe(0);
      }
    }
  });

  it('fails on a door piece that is no door unit’s closed leaves, a door the layer does not know, and a door in two steps, naming each', () => {
    const odd = new Timeline([step('odd', (kit) => { kit.addTagged(cube, stone, new Matrix4(), tag('front')); })]);
    expect(() => new DoorLayer(odd.steps, (i) => odd.restingPieces(i), DEFS, doorLeavesOf)).toThrow(/Door "front": its piece in step "odd" \(mesh odd#0\) is not a door unit's closed leaves/);
    const stranger = new Timeline([step('strange', (kit) => { kit.addTagged(glazed.leaf, bronze, new Matrix4(), tag('back')); })]);
    expect(() => new DoorLayer(stranger.steps, (i) => stranger.restingPieces(i), DEFS, doorLeavesOf)).toThrow(/Door "back" in step "strange" is no door the layer knows; add it to src\/model\/doors.ts/);
    const twice = new Timeline([step('one', (kit) => { kit.addTagged(glazed.leaf, bronze, new Matrix4(), tag('front')); }), step('two', (kit) => { kit.addTagged(glazed.leaf, bronze, SIDE, tag('front')); })]);
    expect(() => new DoorLayer(twice.steps, (i) => twice.restingPieces(i), DEFS, doorLeavesOf)).toThrow(/Door "front" has pieces in steps "one" and "two"/);
  });
});
