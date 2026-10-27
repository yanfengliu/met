/**
 * The doors fitted to the finished model (docs/design/spec.md, Doors: Hinges; work unit 2, review 8, F31), headless, on the real sequence at t = N:
 * every leaf of each door that opens, every 2.5° through its swing either way, its closed and fully open poses included, meets no other piece of the
 * finished model (stone, floors, frames and glass alike, its own unit's frame and transom light among them; its own leaves aside, which move with it),
 * and each door's fixed parts (its unit's frame and transom light, the pieces at its leaves' matrix) pass through no other piece but one another. Pieces are read as
 * their steps' meshes draw them, and meetings are found by exact triangle tests (three-mesh-bvh) between pieces whose boxes meet.
 * Bound: poses are 2.5° apart, so a meeting only between two of them goes unseen; a fixed part is tested 1 mm inside its box on every side, so it may
 * touch a face it stands against (the floor, the lintel, a pier) but not pass through it; the leaves are tested where the door layer draws them (the
 * piece's matrix times its turn about its hinge, src/viewer/doors.ts `hingeTurn`), the pair together with neither, as src/model/lib/door.test.ts
 * checks the pair apart.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { hingeTurn } from '../viewer/doors.js';
import { DOORS } from './doors.js';
import { doorLeavesOf } from './lib/window.js';

/** Degrees between the poses tested. */
const STEP_DEGREES = 2.5;
/** How far inside its box a fixed part is tested, metres. */
const INSET = 0.001;

/** One piece of the finished model: where its step's mesh draws it, its world box, and its door's id if it is a door's leaf. */
interface Piece {
  readonly name: string;
  readonly mesh: InstancedMesh;
  readonly step: string;
  readonly world: Matrix4;
  readonly box: Box3;
  readonly door: string | null;
}

const pieces: Piece[] = [];
const bvhs = new Map<BufferGeometry, MeshBVH>();

function bvhOf(geometry: BufferGeometry): MeshBVH {
  const known = bvhs.get(geometry);
  if (known !== undefined) return known;
  const made = new MeshBVH(geometry);
  bvhs.set(geometry, made);
  return made;
}

function boxOf(geometry: BufferGeometry): Box3 {
  if (geometry.boundingBox === null) geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
}

/** The pieces among `others` that `geometry`, placed by `world`, passes through. */
function meets(geometry: BufferGeometry, world: Matrix4, others: readonly Piece[]): Piece[] {
  const box = boxOf(geometry).clone().applyMatrix4(world);
  const toLocal = new Matrix4();
  return others.filter((o) => o.box.intersectsBox(box) && bvhOf(o.mesh.geometry).intersectsGeometry(geometry, toLocal.copy(o.world).invert().multiply(world)));
}

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  for (const step of timeline.steps) {
    step.meshes.forEach((mesh, m) => {
      mesh.updateMatrixWorld(true);
      const local = boxOf(mesh.geometry);
      const material = mesh.material;
      for (let slot = 0; slot < mesh.count; slot += 1) {
        const world = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
        const tag = step.tags[m]?.[slot];
        const name = `${step.def.id} mesh ${String(m)} piece ${String(slot)} (${Array.isArray(material) ? 'materials' : material.name})`;
        pieces.push({ name, mesh, step: step.def.id, world, box: local.clone().applyMatrix4(world), door: tag?.kind === 'door' ? tag.id : null });
      }
    });
  }
});

describe('the doors in the finished model', () => {
  for (const def of DOORS) {
    it(`${def.id}: ${def.locked ? 'its frame passes' : 'its leaves swing either way, and its frame passes,'} through no other piece of the finished model (review 8, F31)`, () => {
      const own = pieces.filter((p) => p.door === def.id);
      const first = own[0];
      if (first === undefined) throw new Error(`${def.id} has no piece in the finished model; tag its leaves with doorTag("${def.id}").`);
      // The unit's fixed parts: the untagged pieces its step places at its leaves' matrix (its frame, its transom light).
      const fixed = pieces.filter((p) => p.door === null && p.step === first.step && p.world.equals(first.world));
      const others = pieces.filter((p) => p.door !== def.id);
      const found: string[] = [];
      for (const part of fixed) {
        const box = boxOf(part.mesh.geometry);
        const centre = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const inset = new Matrix4().makeTranslation(centre.x, centre.y, centre.z);
        inset.multiply(new Matrix4().makeScale(1 - (2 * INSET) / size.x, 1 - (2 * INSET) / size.y, 1 - (2 * INSET) / size.z));
        inset.multiply(new Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
        // Against everything but the unit's own fixed parts, which hold one another (a pane in its frame's rebate).
        for (const o of meets(part.mesh.geometry, part.world.clone().multiply(inset), others.filter((p) => !fixed.includes(p)))) found.push(`its fixed ${part.name} passes through ${o.name}`);
      }
      if (!def.locked) {
        // Each of its pieces is its leaves in one material (bronze, glass); each leaf turns about its own hinge, where the door layer draws it.
        for (const piece of own) {
          const parts = doorLeavesOf(piece.mesh.geometry);
          expect(parts, `${piece.name} holds a door unit's leaves`).toBeDefined();
          (parts ?? []).forEach((part, k) => {
            const back = new Vector3(...part.hinge.back);
            const front = new Vector3(...part.hinge.front);
            const axis = new Vector3(...part.hinge.axis).normalize();
            const limit = (part.swing.angle * 180) / Math.PI;
            const hits = new Map<string, number[]>();
            for (let degrees = -limit; degrees <= limit + 1e-9; degrees += STEP_DEGREES) {
              if ((part.swing.direction === 'back' && degrees < 0) || (part.swing.direction === 'front' && degrees > 0)) continue;
              const angle = (degrees * Math.PI) / 180;
              const world = piece.world.clone().multiply(hingeTurn(angle < 0 ? front : back, axis, angle));
              for (const o of meets(part.geometry, world, others)) hits.set(o.name, [...(hits.get(o.name) ?? []), degrees]);
            }
            for (const [name, at] of hits) found.push(`leaf ${String(k)} of ${piece.name} meets ${name} at ${String(at.length)} poses, ${String(at[0])}° to ${String(at.at(-1))}°`);
          });
        }
      }
      expect(found, `${def.id}: what its leaves and frame pass through`).toEqual([]);
    });
  }
});
