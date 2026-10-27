/**
 * The model's doors on the real sequence (src/model/doors.ts; docs/design/spec.md, Doors), headless: every door of the list is tagged, in one step,
 * and every door tag names one of them; the door layer (src/viewer/doors.ts) builds over the real timeline, with stand-ins for the doors that open and
 * none for the locked ones, and the doors take at most 20 meshes and draws, the layer's counted (review 0, F9); with the layer attached and the doors
 * used between random positions, the timeline's state stays byte for byte a timeline's without it (F1); and the walk mode's own walker, walked at each
 * locked door from 2.5 m in front over the collision world at t = N, stops against its leaf, where without the leaf it walks on through.
 * Bound: the walker walks at the middle of each door, facing it square on, at 60 frames a second; positions are the feet's.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { firstDifference, random, snapshot } from '../build/testing.js';
import { Timeline } from '../build/timeline.js';
import { DoorLayer } from '../viewer/doors.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import type { GroundHit } from '../walk/collision.js';
import { BODY, Walker } from '../walk/walker.js';
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
    expect(() => doorTag('weston')).toThrow(/doorTag: "weston" names no door of src\/model\/doors.ts; use one of hunt-entrance-south/);
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
    // Each Hunt doorway: two leaves, each of bronze and of glass.
    expect([...drawnBy].sort()).toEqual([['hunt-entrance-middle', 4], ['hunt-entrance-north', 4], ['hunt-entrance-south', 4]]);
    const timelineMeshes = new Set([...meshesOf.values()].flat()).size;
    expect(timelineMeshes + layer.meshes.length, `door meshes (${String(timelineMeshes)}) and the layer's draws (${String(layer.meshes.length)})`).toBeLessThanOrEqual(DOOR_DRAWS);
    for (const id of ['mmw-north-link', 'mmw-south-link', 'bank']) for (const mesh of meshesOf.get(id) ?? []) expect(mesh.layers.mask, `${id} is never hidden`).toBe(1);
  });

  it('asks no shadow pass for the entrance doors’ swings: their leaves cast no shadow, the stand-ins neither (review 5, F23)', () => {
    layer.sync(timeline.n, 0, true);
    const entrance = DOORS.filter((d) => d.id.startsWith('hunt-entrance-')).map((d) => d.id);
    for (const id of entrance) for (const mesh of meshesOf.get(id) ?? []) expect(mesh.castShadow, `${id}'s closed leaves`).toBe(false);
    expect(layer.meshes.map((m) => m.castShadow), 'the stand-ins').toEqual(layer.meshes.map(() => false));
    expect(layer.use('hunt-entrance-middle', new Vector3(0, 5.2, 3))).toBe(true);
    const frames: string[] = [];
    for (let k = 0; k < 50 && layer.facts().some((d) => d.state === 'opening'); k += 1) frames.push(layer.sync(timeline.n, 1 / 60));
    expect(new Set(frames), 'every frame of the swing: the frame, not the shadows').toEqual(new Set(['moved']));
    expect(frames.length).toBeGreaterThan(30);
    layer.use('hunt-entrance-middle', null);
    layer.sync(timeline.n, 0, true);
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

  it('stops the walker against each locked door’s leaf, which it walks on through without it', () => {
    const solid = collisionMeshes(timeline.steps, timeline.n);
    const floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
    const whole = new CollisionWorld(new GeometryBvhs());
    whole.build(solid);
    const hit: GroundHit = { y: 0, normalX: 0, normalY: 1, normalZ: 0 };
    for (const door of DOORS.filter((d) => d.locked)) {
      const leaves = meshesOf.get(door.id) ?? [];
      expect(leaves.length > 0 && leaves.every((m) => solid.includes(m)), `${door.id}'s leaves are in the collision`).toBe(true);
      const holed = new CollisionWorld(new GeometryBvhs());
      holed.build(solid.filter((m) => !leaves.includes(m)));
      const [mesh, slot] = piecesOf.get(door.id)?.[0] ?? [];
      if (mesh === undefined || slot === undefined) throw new Error(`${door.id} has no piece.`);
      // The unit's matrix (at t = N each slot holds its final matrix), its front (+Z) laid level, and the middle of the leaves' front face.
      const unit = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16);
      if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
      const local = mesh.geometry.boundingBox ?? new Box3();
      const front = new Vector3().setFromMatrixColumn(unit, 2).setY(0).normalize();
      const face = new Vector3((local.min.x + local.max.x) / 2, (local.min.y + local.max.y) / 2, local.max.z).applyMatrix4(unit);
      const start = face.clone().addScaledVector(front, 2.5);
      expect(whole.groundBelow(start.x, face.y + 1, start.z, 10, hit), `${door.id}: ground 2.5 m in front`).toBe(true);
      const walk = (world: CollisionWorld): { along: number; lowest: number } => {
        const walker = new Walker(world, floorY);
        walker.place(start.x, hit.y, start.z, Math.atan2(front.x, front.z));
        let lowest = Number.POSITIVE_INFINITY;
        for (let k = 0; k < 4 * FPS; k += 1) {
          walker.update(1 / FPS, { forward: 1, right: 0, run: false });
          lowest = Math.min(lowest, walker.feet.y);
        }
        return { along: walker.feet.clone().sub(face).dot(front), lowest };
      };
      const stopped = walk(whole);
      expect(stopped.along, `${door.id}: the walker's axis stops a body's radius in front of the leaves`).toBeGreaterThan(BODY.radius - 0.08);
      expect(stopped.along).toBeLessThan(BODY.radius + 0.08);
      expect(stopped.lowest, `${door.id}: and never drops below where it started`).toBeGreaterThan(hit.y - 0.05);
      const through = walk(holed);
      expect(through.along, `${door.id}: without its leaves the walker walks on through the doorway`).toBeLessThan(-0.5);
    }
  });
});
