/**
 * The model's doors on the real sequence (src/model/doors.ts; docs/design/spec.md, Doors), headless: every door of the list is tagged, in one step,
 * and every door tag names one of them; the door layer (src/viewer/doors.ts) builds over the real timeline, with stand-ins for the doors that open and
 * none for the locked ones, and the doors take at most 20 meshes and draws, the layer's counted (review 0, F9); no leaf of a door that opens casts a
 * shadow, so no swing asks for a shadow pass (review 5, F23); with the layer attached and the doors used between random positions, the timeline's state
 * stays byte for byte a timeline's without it (F1); and the walk mode's own walker, walked at each locked door from 2.5 m in front at t = N through the
 * page's own collision path (`walkWorld`: the static world without the doors' leaves and the locked doors' pieces held shut in the door world), stops
 * against its leaves (red with the locked doors' parts left out of the door world: 4.52 m past the north link door's leaves; review 17, F47), as it
 * does in a static world of every solid piece, where without the leaves it walks on through. Weston's door against the walker:
 * src/model/core/weston-door.test.ts.
 * Bound: the walker walks at the middle of each door, facing it square on, at 60 frames a second; positions are the feet's.
 */
import { Box3, Layers, Matrix4, Ray, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { firstDifference, random, snapshot } from '../build/testing.js';
import { Timeline } from '../build/timeline.js';
import { DoorLayer } from '../viewer/doors.js';
import { ModelPicker } from '../viewer/pick.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import type { GroundHit } from '../walk/collision.js';
import { walkWorld } from '../walk/door-world.js';
import { lookTarget } from '../walk/look.js';
import type { HitFn } from '../walk/look.js';
import { spawnById, spawnYaw } from '../walk/spawns.js';
import { BODY, NO_INPUT, Walker } from '../walk/walker.js';
import type { WalkWorld } from '../walk/walker.js';
import { WESTON_DOOR } from './core/weston-facade.js';
import { DOORS, doorTag } from './doors.js';
import { doorLeavesOf } from './lib/window.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FPS = 60;
/** The doors' budget of meshes and draws (plan, Amendments after review 0). */
const DOOR_DRAWS = 20;

let timeline: Timeline;
let layer: DoorLayer;
/** Each door's timeline meshes, its pieces as [mesh, slot], and the steps they are in. */
const meshesOf = new Map<string, InstancedMesh[]>();
const piecesOf = new Map<string, (readonly [InstancedMesh, number])[]>();
const stepsOf = new Map<string, Set<string>>();

/**
 * Where to stand before door `id`, by its first piece at t = N (each slot then holds its final matrix): 2.5 m out in front of the middle of its leaves'
 * front face, its front (the unit's +Z) laid level, and that face's middle.
 */
function before(id: string): { start: Vector3; front: Vector3; face: Vector3 } {
  const [mesh, slot] = piecesOf.get(id)?.[0] ?? [];
  if (mesh === undefined || slot === undefined) throw new Error(`Door "${id}" has no piece in the finished model; tag its leaves with doorTag("${id}") (src/model/doors.ts).`);
  const unit = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16);
  if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
  const local = mesh.geometry.boundingBox ?? new Box3();
  const front = new Vector3().setFromMatrixColumn(unit, 2).setY(0).normalize();
  const face = new Vector3((local.min.x + local.max.x) / 2, (local.min.y + local.max.y) / 2, local.max.z).applyMatrix4(unit);
  return { start: face.clone().addScaledVector(front, 2.5), front, face };
}

beforeAll(() => {
  timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf);
  for (const step of timeline.steps) {
    step.meshes.forEach((mesh, m) => {
      step.tags[m]?.forEach((tag, slot) => {
        if (tag?.kind !== 'door') return;
        if (!(meshesOf.get(tag.id) ?? []).includes(mesh)) meshesOf.set(tag.id, [...(meshesOf.get(tag.id) ?? []), mesh]);
        piecesOf.set(tag.id, [...(piecesOf.get(tag.id) ?? []), [mesh, slot] as const]);
        stepsOf.set(tag.id, new Set([...(stepsOf.get(tag.id) ?? []), step.def.id]));
      });
    });
  }
});

describe('the model’s doors', () => {
  it('lists each door once, kebab-case, and tags every one in the sequence, each in one step, and nothing else', () => {
    const ids = DOORS.map((d) => d.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...meshesOf.keys()].sort(), 'the door ids tagged in the sequence').toEqual([...ids].sort());
    expect([...stepsOf].filter(([, s]) => s.size !== 1).map(([id]) => id), 'doors with pieces in more than one step').toEqual([]);
    expect(DOORS.filter((d) => d.locked).map((d) => d.id)).toEqual(['mmw-north-link', 'mmw-south-link', 'bank']);
    expect(() => doorTag('petrie-court')).toThrow(/doorTag: "petrie-court" names no door of src\/model\/doors.ts; use one of hunt-entrance-south, .*, weston\./);
  });

  it('builds the door layer over the real timeline: stand-ins for the doors that open, none for the locked, within 20 meshes and draws', () => {
    expect(layer.facts().map((d) => [d.id, d.locked]).sort()).toEqual(DOORS.map((d) => [d.id, d.locked]).sort());
    layer.sync(timeline.n, 0, true);
    expect(layer.facts().every((d) => d.built && d.state === 'closed')).toBe(true);
    const drawnBy = new Map<string, number>();
    for (const mesh of layer.meshes) {
      for (let i = 0; i < mesh.count; i += 1) {
        const id = layer.tagOf(mesh, i)?.id ?? '';
        drawnBy.set(id, (drawnBy.get(id) ?? 0) + 1);
      }
    }
    // Each Hunt doorway: two leaves, each of bronze and of glass; Weston's: two wooden leaves.
    expect([...drawnBy].sort()).toEqual([['hunt-entrance-middle', 4], ['hunt-entrance-north', 4], ['hunt-entrance-south', 4], ['weston', 2]]);
    const timelineMeshes = new Set([...meshesOf.values()].flat()).size;
    // The layer's meshes: its stand-ins, each a draw, and the doorways' one mesh, which the picker reads and no camera draws.
    expect(layer.doorwayMeshes, 'the doorways, one mesh').toHaveLength(1);
    const own = layer.meshes.length + layer.doorwayMeshes.length;
    expect(timelineMeshes + own, `door meshes (${String(timelineMeshes)}) and the layer's (${String(own)})`).toBeLessThanOrEqual(DOOR_DRAWS);
    for (const id of ['mmw-north-link', 'mmw-south-link', 'bank']) for (const mesh of meshesOf.get(id) ?? []) expect(mesh.layers.mask, `${id} is never hidden`).toBe(1);
  });

  it('asks no shadow pass for the swings of the doors that open, the entrance’s and Weston’s: their leaves cast no shadow, the stand-ins neither (review 5, F23)', () => {
    layer.sync(timeline.n, 0, true);
    const opening = DOORS.filter((d) => !d.locked).map((d) => d.id);
    expect(opening).toEqual(['hunt-entrance-south', 'hunt-entrance-middle', 'hunt-entrance-north', 'weston']);
    for (const id of opening) for (const mesh of meshesOf.get(id) ?? []) expect(mesh.castShadow, `${id}'s closed leaves`).toBe(false);
    expect(layer.meshes.map((m) => m.castShadow), 'the stand-ins').toEqual(layer.meshes.map(() => false));
    // Each opened from in front: the entrance from its landing, Weston's door from the Petrie Court.
    for (const [id, from] of [['hunt-entrance-middle', new Vector3(0, 5.2, 3)], ['weston', new Vector3(WESTON_DOOR.x - 2, 5.7, WESTON_DOOR.z)]] as const) {
      expect(layer.use(id, from), `${id} opens`).toBe(true);
      const frames: string[] = [];
      for (let k = 0; k < 50 && layer.facts().some((d) => d.state === 'opening'); k += 1) frames.push(layer.sync(timeline.n, 1 / 60));
      expect(new Set(frames), `every frame of ${id}'s swing: the frame, not the shadows`).toEqual(new Set(['moved']));
      expect(frames.length).toBeGreaterThan(30);
      layer.use(id, null);
      layer.sync(timeline.n, 0, true);
    }
  });

  it('leaves the real timeline’s state byte for byte as a timeline’s without the layer, with the doors used between random positions (review 0, F1)', () => {
    const own = new Timeline(SEQUENCE);
    const doors = new DoorLayer(own.steps, (i) => own.restingPieces(i), DOORS, doorLeavesOf, 'open');
    const alone = new Timeline(SEQUENCE);
    const rand = random(11);
    const hunt = own.steps.findIndex((s) => s.def.id === 'hunt-windows');
    for (let k = 0; k < 8; k += 1) {
      // Around the Hunt doors' step, where the layer swaps the closed leaves and the stand-ins, and anywhere.
      const t = k % 2 === 0 ? Math.max(0, hunt + 1 + (rand() - 0.5) * 2) : rand() * own.n;
      own.evaluate(t);
      doors.sync(t, rand() * 0.4);
      for (const d of DOORS) doors.use(d.id, new Vector3(rand() * 4 - 2, 5.7, rand() * 8 - 4));
      doors.sync(t, rand() * 0.4);
      alone.evaluate(t);
      expect(firstDifference(snapshot(own), snapshot(alone)), `t ${t.toFixed(3)}`).toBeNull();
    }
  });

  it('stops the walker at each locked door through the page’s own collision path, and at its leaves alone in a static world, which it walks through without them (review 17, F47)', () => {
    const solid = collisionMeshes(timeline.steps, timeline.n);
    const floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
    // The page's path: the static world without any door's leaves, and each locked door's pieces held shut in the door world (src/walk/door-world.ts).
    const own = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf);
    own.sync(timeline.n, 0, true);
    const page = walkWorld(timeline.steps, timeline.n, own, new GeometryBvhs());
    // The geometry alone: every solid piece in one static world, the leaves among them.
    const whole = new CollisionWorld(new GeometryBvhs());
    whole.build(solid);
    const hit: GroundHit = { y: 0, normalX: 0, normalY: 1, normalZ: 0 };
    for (const door of DOORS.filter((d) => d.locked)) {
      const leaves = meshesOf.get(door.id) ?? [];
      expect(leaves.length > 0 && leaves.every((m) => solid.includes(m)), `${door.id}'s leaves are solid`).toBe(true);
      expect(leaves.every((m) => own.leafMeshes.has(m)), `${door.id}'s leaves are out of the page's static world`).toBe(true);
      const holed = new CollisionWorld(new GeometryBvhs());
      holed.build(solid.filter((m) => !leaves.includes(m)));
      const { start, front, face } = before(door.id);
      expect(whole.groundBelow(start.x, face.y + 1, start.z, 10, hit), `${door.id}: ground 2.5 m in front`).toBe(true);
      const walk = (world: WalkWorld): { along: number; lowest: number } => {
        const walker = new Walker(world, floorY);
        walker.place(start.x, hit.y, start.z, Math.atan2(front.x, front.z));
        let lowest = Number.POSITIVE_INFINITY;
        for (let k = 0; k < 4 * FPS; k += 1) {
          walker.update(1 / FPS, { forward: 1, right: 0, run: false });
          lowest = Math.min(lowest, walker.feet.y);
        }
        return { along: walker.feet.clone().sub(face).dot(front), lowest };
      };
      for (const [world, name] of [[page, 'the page’s path'], [whole, 'the static world']] as const) {
        const stopped = walk(world);
        expect(stopped.along, `${door.id}, ${name}: the walker's axis stops a body's radius in front of the leaves`).toBeGreaterThan(BODY.radius - 0.08);
        expect(stopped.along, `${door.id}, ${name}`).toBeLessThan(BODY.radius + 0.08);
        expect(stopped.lowest, `${door.id}, ${name}: and never drops below where it started`).toBeGreaterThan(hit.y - 0.05);
      }
      const through = walk(holed);
      expect(through.along, `${door.id}: without its leaves the walker walks on through the doorway`).toBeLessThan(-0.5);
    }
  });

  it('is the look target where a pair’s leaves meet: the entrance’s middle door before a walker from the plaza spawn with W alone, and each locked door on its axis, which says Locked (review 17, F46 and F48)', () => {
    const floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
    const own = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf);
    own.sync(timeline.n, 0, true);
    const bvhs = new GeometryBvhs();
    const world = walkWorld(timeline.steps, timeline.n, own, bvhs);
    // The page's hit query (src/main.ts): the timeline's pieces, and the door layer's stand-ins and doorways registered with their tags.
    const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), bvhs, floorY, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
    own.registerWith(picker);
    const hit: HitFn = (ray, query) => picker.hit(ray, query);
    const target = (walker: Walker): string => {
      const found = lookTarget(hit, walker.eye(), walker.look());
      return found === null ? 'nothing' : `${found.kind} ${found.id}: ${String(own.prompt(found.id))}`;
    };
    // From the plaza spawn, on the axis facing the facade, W alone at a walk or a run: let go 1.3 m before the middle door's leaves, the crosshair on the
    // line where they meet 8 mm apart (red at 0defda0, whose look target met nothing there at any of these rates; turned 0.5°, it met a leaf).
    const spawn = spawnById('plaza');
    if (spawn === undefined) throw new Error('src/walk/spawns.ts has no plaza spawn.');
    const middle = before('hunt-entrance-middle').face;
    for (const fps of [30, 60, 144]) {
      for (const run of [false, true]) {
        const walker = new Walker(world, floorY);
        walker.place(spawn.feet[0], spawn.feet[1], spawn.feet[2], spawnYaw(spawn), (spawn.pitch * Math.PI) / 180);
        for (let k = 0; k < 20 * fps && walker.feet.z > middle.z + 1.3; k += 1) walker.update(1 / fps, { forward: 1, right: 0, run });
        for (let k = 0; k < fps; k += 1) walker.update(1 / fps, NO_INPUT);
        const where = `${String(fps)} fps, ${run ? 'running' : 'walking'}, stopped at (${walker.feet.x.toFixed(3)}, ${walker.feet.z.toFixed(3)})`;
        expect(walker.feet.z - middle.z, `${where}: before the doors, coasted from 1.3 m`).toBeGreaterThan(0.6);
        expect(walker.feet.z - middle.z, where).toBeLessThan(1.3);
        expect(Math.abs(walker.feet.x) + Math.abs(walker.look().x), `${where}: on the axis, looking along it, so between the leaves`).toBeLessThan(1e-9);
        expect(target(walker), where).toBe('door hunt-entrance-middle: E Open');
        // The zoom's pick, on the same ray, passes the seam where nothing is drawn, on into the hall (red with the doorways in both queries, as at 1f3d7c9,
        // which stopped it at the box 1.3 m off; review 18, F50).
        const ray = new Ray(walker.eye(), walker.look());
        const toLeaves = (ray.origin.z - middle.z) / -ray.direction.z;
        expect(picker.distance(ray) ?? Number.POSITIVE_INFINITY, `${where}: the zoom passes the seam, ${toLeaves.toFixed(2)} m off`).toBeGreaterThan(toLeaves + 1);
      }
    }
    // Each locked door, walked at on its axis from 2.5 m and let go 1.2 m before its leaves: the crosshair on their meeting line (red at 0defda0), and then
    // turned onto a leaf 0.3 m across it (F48). Pressed on into the leaves, a walker slides along them, off the line.
    const g: GroundHit = { y: 0, normalX: 0, normalY: 1, normalZ: 0 };
    for (const door of DOORS.filter((d) => d.locked)) {
      const { start, front, face } = before(door.id);
      const across = new Vector3(front.z, 0, -front.x);
      world.groundBelow(start.x, face.y + 1, start.z, 10, g);
      const walker = new Walker(world, floorY);
      walker.place(start.x, g.y, start.z, Math.atan2(front.x, front.z));
      for (let k = 0; k < 4 * FPS && walker.feet.clone().sub(face).dot(front) > 1.2; k += 1) walker.update(1 / FPS, { forward: 1, right: 0, run: false });
      for (let k = 0; k < FPS; k += 1) walker.update(1 / FPS, NO_INPUT);
      const eye = walker.eye();
      const look = walker.look();
      const crossing = eye.clone().addScaledVector(look, face.clone().sub(eye).dot(front) / look.dot(front));
      expect(Math.abs(crossing.clone().sub(face).dot(across)), `${door.id}: the crosshair within 2 mm of the leaves' meeting line`).toBeLessThan(0.002);
      expect(target(walker), `${door.id}, on its axis`).toBe(`door ${door.id}: Locked`);
      expect(own.use(door.id, eye), `${door.id}: E does nothing`).toBe(false);
      const leaf = face.clone().addScaledVector(across, 0.3).setY(eye.y);
      walker.turn(Math.atan2(-(leaf.x - eye.x), -(leaf.z - eye.z)) - walker.yaw, 0);
      expect(target(walker), `${door.id}, a leaf 0.3 m across`).toBe(`door ${door.id}: Locked`);
    }
    expect(own.facts().filter((d) => d.locked).map((d) => d.state), 'the locked doors still shut').toEqual(['closed', 'closed', 'closed']);
  });
});
