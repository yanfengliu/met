/**
 * The pieces `openWall` and `holeLining` (src/model/core/arches.ts) and `archedPassage` (src/model/hunt/shapes.ts) build, closed along vertical lines
 * (docs/design/spec.md, Walk mode: When the build moves; work unit 5), on the real sequence at t = N. Every vertical line crosses each an even number of
 * times, so the walk's settle finds a walker built into one, and the section cut shows it solid. Work unit 3's review 2 found two open: `archedPassage`'s
 * feet (F13) and `openWall`'s bottom (F14).
 * Pieces: every piece of every mesh the walk collides with (src/walk/collision.ts `collisionMeshes`) or the cut caps (src/viewer/section-cut.ts
 * `cappedBySection`, as src/main.ts picks them) whose geometry one of the three builders named, as its step's mesh draws it. Each builder must have
 * pieces in at least the steps CALLERS names, so the gate cannot pass by finding none.
 * Two readings. The mesh's own: along world vertical in the piece's frame (src/model/lib/check.ts `openAlong`), once for all the pieces of a geometry
 * whose matrices turn that line alike. The walk's: its crossing query (`CollisionWorld.crossings`, which counts hits within 1 µm of each other once), on
 * a collision world of the meshes the walk collides with, along four lines through each face of each walked piece that is not vertical (one inside the
 * face, one near each corner). Each line must meet its own piece, at that face among its crossings, an even number of times.
 * Bound: those three builders' pieces only. Other builders' solids are not checked here, and most are open along vertical lines
 * (docs/work/5_closed-pieces/plan.md, an open finding). `openAlong` joins ends nearer than 0.1 mm and leaves out open boundary under 1 mm in all, so an
 * opening narrower than 0.1 mm or with less than 1 mm of boundary is not seen; the walk's reading sees an opening only under one of its lines.
 */
import { Matrix3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { cappedBySection } from '../viewer/section-cut.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import { openAlong } from './lib/check.js';

/** Each builder by the name it gives its geometry, and the steps of its callers in src/model/core/ and src/model/hunt/stair.ts. */
const CALLERS: Readonly<Record<string, readonly string[]>> = {
  openWall: ['medieval-hall-arcades', 'medieval-hall-clerestory-vault', 'vaux-hall', 'vaux-walls', 'vaux-west-front', 'wing-b-south-facade', 'wing-b-walls', 'wing-c-walls'],
  holeLining: ['vaux-walls', 'wing-b-south-facade'],
  archedPassage: ['grand-stair-vault'],
};

/** The walk's lines through a face, as weights of its corners: one inside it, off its centroid, and one near each corner, all off its edges. */
const LINES: readonly (readonly [number, number, number])[] = [
  [0.31, 0.33, 0.36],
  [0.94, 0.027, 0.033],
  [0.029, 0.94, 0.031],
  [0.032, 0.028, 0.94],
];

/** One geometry as some of its pieces stand: world vertical in its frame, and where those pieces stand. */
interface Shape {
  readonly geometry: BufferGeometry;
  readonly vertical: Vector3;
  readonly pieces: { readonly step: string; readonly material: string; readonly world: Matrix4 }[];
}

const timeline = new Timeline(SEQUENCE);
timeline.evaluate(timeline.n);
const walked = collisionMeshes(timeline.steps, timeline.n);

/** A mesh's step and its place there, as the walk reading names its pieces. */
function stepOf(mesh: InstancedMesh): string {
  const step = timeline.steps.find((s) => s.meshes.includes(mesh));
  return step === undefined ? '?' : `${step.def.id} mesh ${String(step.meshes.indexOf(mesh))}`;
}

/** The pieces the three builders made that the walk or the cut reads at t = N, as shapes: one per geometry and direction of world vertical in its frame. */
function shapes(): Shape[] {
  const read = new Set<InstancedMesh>(walked);
  const found = new Map<string, Shape>();
  const linear = new Matrix3();
  for (const step of timeline.steps) {
    for (const mesh of step.meshes) {
      const materials: readonly Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!(mesh.geometry.name in CALLERS) || !(read.has(mesh) || Array.isArray(mesh.material) || materials.some(cappedBySection))) continue;
      mesh.updateMatrixWorld(true);
      for (let slot = 0; slot < mesh.count; slot += 1) {
        const world = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
        const vertical = new Vector3(0, 1, 0).applyMatrix3(linear.setFromMatrix4(world).invert()).normalize();
        if (vertical.y < 0) vertical.negate();
        // To six decimals, −0 read as 0, so pieces turned alike share a reading.
        const id = `${mesh.geometry.uuid} ${vertical.toArray().map((v) => String(Number(v.toFixed(6)) + 0)).join(',')}`;
        const shape = found.get(id) ?? { geometry: mesh.geometry, vertical, pieces: [] };
        shape.pieces.push({ step: step.def.id, material: materials.map((m) => m.name).join('+'), world });
        found.set(id, shape);
      }
    }
  }
  return [...found.values()];
}

describe('the pieces openWall, holeLining and archedPassage build', () => {
  it('are closed along vertical lines (work unit 3, review 2, F13 and F14), in every step their callers build', () => {
    const steps = new Map<string, Set<string>>();
    const open: string[] = [];
    for (const shape of shapes()) {
      const builder = shape.geometry.name;
      for (const { step } of shape.pieces) steps.set(builder, (steps.get(builder) ?? new Set()).add(step));
      const opening = openAlong(shape.geometry, shape.vertical);
      const first = shape.pieces[0];
      if (opening === null || first === undefined) continue;
      const at = opening.at.clone().applyMatrix4(first.world);
      const where = [...new Set(shape.pieces.map((p) => `${p.step}/${p.material}`))].join(', ');
      open.push(`${builder} in ${where}: ${String(shape.pieces.length)} pieces with ${opening.length.toFixed(3)} m of open boundary, one by X ${at.x.toFixed(2)}, Z ${at.z.toFixed(2)}`);
    }
    expect(open, 'pieces open along vertical lines').toEqual([]);
    const missing = Object.entries(CALLERS).flatMap(([builder, list]) => list.filter((s) => steps.get(builder)?.has(s) !== true).map((s) => `${builder} in ${s}`));
    expect(missing, "callers' steps without the builder's pieces: is its geometry still named, and drawn unmerged?").toEqual([]);
  });

  it("are crossed an even number of times by the walk's own crossing query, on four lines through each face that is not vertical (F14)", () => {
    const world = new CollisionWorld(new GeometryBvhs());
    world.build(walked);
    const [a, b, c, p, n] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    const misread = new Map<string, { lines: number; first: string }>();
    let pieces = 0;
    let lines = 0;
    let first = 0;
    for (const mesh of walked) {
      if (mesh.geometry.name in CALLERS) {
        const position = mesh.geometry.getAttribute('position');
        const index = mesh.geometry.getIndex();
        const corner = (k: number): number => (index === null ? k : index.getX(k));
        for (let slot = 0; slot < mesh.count; slot += 1) {
          pieces += 1;
          const at = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
          for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
            a.fromBufferAttribute(position, corner(k)).applyMatrix4(at);
            b.fromBufferAttribute(position, corner(k + 1)).applyMatrix4(at);
            c.fromBufferAttribute(position, corner(k + 2)).applyMatrix4(at);
            n.subVectors(b, a).cross(p.subVectors(c, a));
            if (Math.abs(n.y) <= 1e-6 * n.length()) continue;
            for (const [wa, wb, wc] of LINES) {
              p.set(0, 0, 0).addScaledVector(a, wa).addScaledVector(b, wb).addScaledVector(c, wc);
              lines += 1;
              const heights = world.crossings(p.x, p.z, -Infinity, Infinity).find((l) => l.instance === first + slot)?.heights ?? [];
              const wrong = !heights.some((h) => Math.abs(h - p.y) < 1e-4) ? 'misses the face it was drawn through' : heights.length % 2 !== 0 ? 'is crossed an odd number of times' : null;
              if (wrong === null) continue;
              const key = `${mesh.geometry.name} in ${stepOf(mesh)} piece ${String(slot)}`;
              const known = misread.get(key);
              if (known !== undefined) known.lines += 1;
              else misread.set(key, { lines: 1, first: `by X ${p.x.toFixed(2)}, Z ${p.z.toFixed(2)} ${wrong}: ${heights.map((h) => h.toFixed(3)).join(', ') || 'no crossing'}` });
            }
          }
        }
      }
      first += mesh.count;
    }
    expect(pieces, 'walked pieces tried').toBeGreaterThan(100);
    expect(lines, 'lines tried').toBeGreaterThan(10_000);
    expect([...misread].map(([key, o]) => `${key}: ${String(o.lines)} lines misread, the first ${o.first}`), 'pieces the walk reads open').toEqual([]);
  });
});
