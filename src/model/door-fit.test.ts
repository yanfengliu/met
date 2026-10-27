/**
 * The doors fitted to the finished model (docs/design/spec.md, Doors: Hinges; work unit 2, review 8, F31, and review 9, F34 and F35), headless, on the
 * real sequence at t = N, for every door of src/model/doors.ts by the pieces its tag marks.
 * Leaves: each door that opens has its leaves turned together, as the door layer turns them: every 2.5° through the swing they allow, the closed and
 * fully open poses included, each by that angle about its own hinge (the piece's matrix times its turn, src/viewer/doors.ts `hingeTurn`), a pair's two
 * mirrored by their hinges' axes. At each pose no leaf part (a leaf's panels or metal, or its glass: `doorLeavesOf`) meets another piece of the finished
 * model, lies inside one or holds part of one, and none meets, lies inside or holds part of the door's other leaf. The other pieces are every piece of
 * every step, stone, floors, frames and glass alike, its unit's frame and transom light among them, other doors' leaves where they stand closed; its own
 * closed leaves, which the door layer hides, are left out, and a leaf's panels or metal and its glass are one leaf, not tried against each other.
 * Fixed parts: each door's, locked doors' included (a locked door's leaves are not tried), the untagged pieces its step places at its leaves' matrix (its
 * unit's frame and transom light), pass through no other piece but one another.
 * Method: pieces are read as their steps' meshes draw them. A meeting is an exact triangle test (three-mesh-bvh) between shapes whose boxes meet. Inside
 * is parity on the vertical line through a point, as src/walk/walker.ts `insideBetween` reads it: the point lies between a pair of the line's crossings
 * (first and second, third and fourth, …) with the whole shape or with one of its connected parts (triangles joined through shared vertex positions), and
 * crossings within 1 µm of each other facing one way count once (a line through an edge meets both its triangles). With no surfaces meeting, a connected
 * part lies wholly inside a closed shape or wholly outside it, so one point on each part (its first triangle's centroid) is tried in each shape whose box
 * holds it.
 * Bound: what happens only between two poses goes unseen. A shape or part crossed an odd number of times along the line is open there and has no inside,
 * so a solid goes unseen where neither its piece nor one of its parts closes along that line (a solid of parts that share no vertex, its piece holding
 * other surfaces on the line); a part open only off the line (a box with no end) reads as closed. Other doors' leaves are tried closed only. A fixed part
 * is tried 1 mm inside its box on every side, so it may touch a face it stands against (the floor, the lintel, a pier) but not pass through it, and it is
 * not tried for lying inside a piece; a door whose step merges its frame into another piece (the Branch Bank's) has no fixed part to try. Controls keep
 * both containments and the partner test red: a block round a doorway and its swing, a cube in a leaf, a leaf moved 12 mm into its partner.
 */
import { Box3, BoxGeometry, DoubleSide, Matrix4, Ray, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { hingeTurn } from '../viewer/doors.js';
import { insideBetween } from '../walk/walker.js';
import { DOORS } from './doors.js';
import type { DoorInfo } from './doors.js';
import { doorLeavesOf } from './lib/window.js';
import type { SwingingPart } from './lib/window.js';

/** Degrees between the poses tested. */
const STEP_DEGREES = 2.5;
/** How far inside its box a fixed part is tested, metres. */
const INSET = 0.001;
/** Crossings of a line closer than this, facing one way, are one, metres. */
const SAME = 1e-6;

/** A shape where it stands: its geometry, world matrix and world box. */
interface Placed {
  readonly name: string;
  readonly geometry: BufferGeometry;
  readonly world: Matrix4;
  readonly box: Box3;
}

/** One piece of the finished model (or a control's): where its step's mesh draws it, its step, and its door's id if it is a door's closed leaves. */
interface Piece extends Placed {
  readonly step: string;
  readonly door: string | null;
}

/** One leaf in one of a door's pieces (its panels or metal, or its glass): the piece, the leaf's place from −X, and how it turns. */
interface Leaf {
  readonly name: string;
  readonly piece: Piece;
  readonly k: number;
  readonly part: SwingingPart;
}

/** A geometry's connected parts: each vertex's part, and a point on each part. */
interface Parts {
  readonly of: Int32Array;
  readonly points: readonly Vector3[];
}

const pieces: Piece[] = [];
const bvhs = new Map<BufferGeometry, MeshBVH>();
const connected = new Map<BufferGeometry, Parts>();

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

/** The connected parts of `geometry`, its triangles joined through shared vertex positions, each with a point on it: its first triangle's centroid. */
function partsOf(geometry: BufferGeometry): Parts {
  const known = connected.get(geometry);
  if (known !== undefined) return known;
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const corner = (c: number): number => (index === null ? c : index.getX(c));
  // Each vertex's place, one per position; places joined by triangles (union-find), each pointing up its tree to its part's root.
  const places = new Map<string, number>();
  const place = Array.from({ length: position.count }, (_, v) => {
    const key = `${String(position.getX(v))},${String(position.getY(v))},${String(position.getZ(v))}`;
    const id = places.get(key) ?? places.size;
    places.set(key, id);
    return id;
  });
  const up = Array.from({ length: places.size }, (_, p) => p);
  const root = (p: number): number => {
    let r = p;
    while ((up[r] ?? r) !== r) r = up[r] ?? r;
    up[p] = r;
    return r;
  };
  const triangles = (index?.count ?? position.count) / 3;
  for (let t = 0; t < triangles; t += 1) {
    const a = root(place[corner(3 * t)] ?? 0);
    for (const c of [1, 2]) up[root(place[corner(3 * t + c)] ?? 0)] = a;
  }
  const ids = new Map<number, number>();
  const points: Vector3[] = [];
  const v = new Vector3();
  for (let t = 0; t < triangles; t += 1) {
    const r = root(place[corner(3 * t)] ?? 0);
    if (ids.has(r)) continue;
    ids.set(r, points.length);
    const centroid = new Vector3();
    for (const c of [0, 1, 2]) centroid.add(v.fromBufferAttribute(position, corner(3 * t + c)));
    points.push(centroid.divideScalar(3));
  }
  const parts: Parts = { of: Int32Array.from(place, (p) => ids.get(root(p)) ?? -1), points };
  connected.set(geometry, parts);
  return parts;
}

interface Crossing {
  readonly y: number;
  readonly part: number;
  readonly facing: number;
}

/** The heights of `crossings`, lowest first, each within SAME of the one kept before it and facing its way dropped. */
function once(crossings: readonly Crossing[]): number[] {
  const out: number[] = [];
  let last: Crossing | undefined;
  for (const c of crossings) {
    if (last !== undefined && c.y - last.y < SAME && c.facing === last.facing) continue;
    out.push(c.y);
    last = c;
  }
  return out;
}

const ray = new Ray();
const inverse = new Matrix4();

/** Whether `point` (world) lies inside `shape`: between a pair of the vertical line's crossings with all of it or with one of its connected parts. */
function holds(shape: Placed, point: Vector3): boolean {
  inverse.copy(shape.world).invert();
  ray.origin.set(point.x, shape.box.max.y + 1, point.z).applyMatrix4(inverse);
  ray.direction.set(0, -1, 0).transformDirection(inverse);
  const { of } = partsOf(shape.geometry);
  const crossings = bvhOf(shape.geometry)
    .raycast(ray, DoubleSide)
    .map((hit): Crossing => ({ y: hit.point.applyMatrix4(shape.world).y, part: of[hit.face?.a ?? 0] ?? -1, facing: Math.sign(hit.face?.normal.dot(ray.direction) ?? 0) }))
    .sort((a, b) => a.y - b.y);
  const byPart = [...new Set(crossings.map((c) => c.part))].map((p) => crossings.filter((c) => c.part === p));
  return [crossings, ...byPart].some((list) => insideBetween(once(list), point.y, point.y));
}

const point = new Vector3();
const toB = new Matrix4();

/** Whether a point on one of `a`'s connected parts lies inside `b`: with no surfaces meeting, that whole part does. */
function within(a: Placed, b: Placed): boolean {
  return partsOf(a.geometry).points.some((p) => b.box.containsPoint(point.copy(p).applyMatrix4(a.world)) && holds(b, point));
}

/** Whether the surfaces of `a` and `b` meet, by an exact triangle test once their boxes meet. */
function meets(a: Placed, b: Placed): boolean {
  return a.box.intersectsBox(b.box) && bvhOf(b.geometry).intersectsGeometry(a.geometry, toB.copy(b.world).invert().multiply(a.world));
}

/** How `a` clashes with `b`: their surfaces meet, `a` lies inside `b`, or part of `b` lies inside `a`; null when none of these. */
function clash(a: Placed, b: Placed): string | null {
  if (!a.box.intersectsBox(b.box)) return null;
  if (meets(a, b)) return 'meets';
  if (within(a, b)) return 'lies inside';
  return within(b, a) ? 'holds part of' : null;
}

/** A door's fixed parts in `model`: the untagged pieces its step places at its leaves' matrix (its unit's frame, its transom light). */
function fixedOf(id: string, model: readonly Piece[]): Piece[] {
  const first = model.find((p) => p.door === id);
  if (first === undefined) throw new Error(`${id} has no piece in the finished model; tag its leaves with doorTag("${id}").`);
  return model.filter((p) => p.door === null && p.step === first.step && p.world.equals(first.world));
}

/** The leaves of door `id` in `model`: each leaf of each of its pieces, from −X. */
function leavesOf(id: string, model: readonly Piece[]): Leaf[] {
  return model.filter((p) => p.door === id).flatMap((piece) => {
    const parts = doorLeavesOf(piece.geometry);
    if (parts === undefined || parts.length === 0) throw new Error(`${id}: its piece ${piece.name} is no door unit's closed leaves (src/model/lib/window.ts doorLeavesOf), so it cannot turn; place DoorParts.leaf or leafGlass as doorUnit gives it.`);
    return parts.map((part, k) => ({ name: `leaf ${String(k)} of ${piece.name}`, piece, k, part }));
  });
}

/** The angles the door layer turns `leaves` through, every STEP_DEGREES and both ends: as far as the widest swing, the way their swing allows. */
function posesOf(leaves: readonly Leaf[]): number[] {
  const open = (Math.max(...leaves.map((l) => l.part.swing.angle)) * 180) / Math.PI;
  const direction = leaves.at(-1)?.part.swing.direction;
  const n = Math.ceil(open / STEP_DEGREES - 1e-9);
  const all = Array.from({ length: 2 * n + 1 }, (_, i) => Math.max(-open, Math.min(open, (i - n) * STEP_DEGREES)));
  return all.filter((d) => !((direction === 'back' && d < 0) || (direction === 'front' && d > 0)));
}

/** `leaf` turned `degrees` about its hinge, where the door layer draws it: its piece's matrix times its turn, times `shift` (a control's) first. */
function posed(leaf: Leaf, degrees: number, shift?: Matrix4): Placed {
  const angle = (degrees * Math.PI) / 180;
  const { hinge } = leaf.part;
  const world = leaf.piece.world.clone().multiply(hingeTurn(new Vector3(...(angle < 0 ? hinge.front : hinge.back)), new Vector3(...hinge.axis).normalize(), angle));
  if (shift !== undefined) world.multiply(shift);
  return { name: leaf.name, geometry: leaf.part.geometry, world, box: boxOf(leaf.part.geometry).clone().applyMatrix4(world) };
}

/**
 * What door `def` meets in `model`, each finding with the poses it was found at, in degrees (none for a fixed part's); empty when the door fits.
 * `shift`, a control's, moves leaf `k`'s geometry by `by` before its turn.
 */
function misfits(def: DoorInfo, model: readonly Piece[], shift?: { readonly k: number; readonly by: Matrix4 }): Map<string, number[]> {
  const found = new Map<string, number[]>();
  const note = (what: string, degrees: number[]): void => {
    found.set(what, [...(found.get(what) ?? []), ...degrees]);
  };
  const others = model.filter((p) => p.door !== def.id);
  const fixed = fixedOf(def.id, model);
  for (const part of fixed) {
    const box = boxOf(part.geometry);
    const centre = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const inset = new Matrix4().makeTranslation(centre.x, centre.y, centre.z);
    inset.multiply(new Matrix4().makeScale(1 - (2 * INSET) / size.x, 1 - (2 * INSET) / size.y, 1 - (2 * INSET) / size.z));
    inset.multiply(new Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
    const world = part.world.clone().multiply(inset);
    const shape: Placed = { name: part.name, geometry: part.geometry, world, box: box.clone().applyMatrix4(world) };
    // Against everything but the unit's own fixed parts, which hold one another (a pane in its frame's rebate).
    for (const o of others) if (!fixed.includes(o) && meets(shape, o)) note(`its fixed ${part.name} passes through ${o.name}`, []);
  }
  if (def.locked) return found;
  const leaves = leavesOf(def.id, model);
  const degrees = posesOf(leaves);
  const pose = (leaf: Leaf, d: number): Placed => posed(leaf, d, shift?.k === leaf.k ? shift.by : undefined);
  // The pieces each leaf can reach: those whose boxes meet its box somewhere in its swing.
  const near = leaves.map((leaf) => {
    const sweep = new Box3();
    for (const d of degrees) sweep.union(pose(leaf, d).box);
    return others.filter((o) => o.box.intersectsBox(sweep));
  });
  for (const d of degrees) {
    const now = leaves.map((leaf) => pose(leaf, d));
    now.forEach((a, i) => {
      for (const o of near[i] ?? []) {
        const how = clash(a, o);
        if (how !== null) note(`${a.name} ${how} ${o.name}`, [d]);
      }
      // Its partners at the same pose: the door's other leaves, its own panels or metal and glass (one leaf) aside.
      now.forEach((b, j) => {
        const p = leaves[i];
        const q = leaves[j];
        if (j <= i || p === undefined || q === undefined || (p.k === q.k && p.piece.world.equals(q.piece.world))) return;
        const how = clash(a, b);
        if (how !== null) note(`${a.name} ${how} its partner ${b.name}`, [d]);
      });
    });
  }
  return found;
}

/** The findings as the test prints them: what, and at how many poses, from which angle to which. */
function report(found: ReadonlyMap<string, readonly number[]>): string[] {
  return [...found].map(([what, at]) => (at.length === 0 ? what : `${what} at ${String(at.length)} poses, ${String(at[0])}° to ${String(at.at(-1))}°`));
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
        pieces.push({ name, geometry: mesh.geometry, step: step.def.id, world, box: local.clone().applyMatrix4(world), door: tag?.kind === 'door' ? tag.id : null });
      }
    });
  }
});

describe('the doors in the finished model', () => {
  for (const def of DOORS) {
    const what = def.locked ? 'its frame passes through no other piece of the finished model (review 8, F31)' : 'its leaves, turned together through their whole swing, meet, lie inside and hold part of no other piece of the finished model nor of each other, and its frame passes through none (reviews 8 and 9, F31, F34, F35)';
    it(`${def.id}: ${what}`, () => {
      expect(report(misfits(def, pieces)), `${def.id}: what its leaves and frame meet, lie inside or hold`).toEqual([]);
    });
  }
});

describe('the fit check, by controls that keep it red', () => {
  /** The first door that opens with a pair of leaves, and its leaves. */
  function pair(): { readonly def: DoorInfo; readonly leaves: readonly Leaf[] } {
    for (const def of DOORS.filter((d) => !d.locked)) {
      const leaves = leavesOf(def.id, pieces);
      if (new Set(leaves.map((l) => l.k)).size === 2) return { def, leaves };
    }
    throw new Error('No door of src/model/doors.ts that opens has a pair of leaves, so the controls have none to try; open one built with doorUnit({ leaves: 2 }).');
  }

  it('reports every leaf inside a closed block round its doorway, its frame and its whole swing, which no surface test finds (review 9, F34)', () => {
    const { def, leaves } = pair();
    const degrees = posesOf(leaves);
    const round = new Box3();
    for (const p of fixedOf(def.id, pieces)) round.union(p.box);
    for (const leaf of leaves) for (const d of degrees) round.union(posed(leaf, d).box);
    round.expandByScalar(0.25);
    const size = round.getSize(new Vector3());
    const block: Piece = { name: 'a control block', geometry: new BoxGeometry(size.x, size.y, size.z), world: new Matrix4().setPosition(round.getCenter(new Vector3())), box: round, step: 'control', door: null };
    const seen = report(misfits(def, [...pieces, block])).filter((f) => f.includes(block.name));
    expect(seen, `${def.id} in ${block.name}`).toEqual(leaves.map((l) => `${l.name} lies inside ${block.name} at ${String(degrees.length)} poses, ${String(degrees[0])}° to ${String(degrees.at(-1))}°`));
  });

  it('reports a closed piece inside a leaf: a 1 cm cube 2 cm in from its hinge edge, the door closed (review 9, F34)', () => {
    const { def, leaves } = pair();
    const leaf = leaves[0];
    if (leaf === undefined) throw new Error(`${def.id} has no leaf.`);
    // 2 cm in from its hinge edge, at its mid-height, in its mid-plane.
    const { back, front, axis } = leaf.part.hinge;
    const box = boxOf(leaf.part.geometry);
    const at = new Vector3(back[0] + 0.02 * axis[1], (box.min.y + box.max.y) / 2, (back[2] + front[2]) / 2).applyMatrix4(leaf.piece.world);
    const cube: Piece = { name: 'a control cube', geometry: new BoxGeometry(0.01, 0.01, 0.01), world: new Matrix4().setPosition(at), box: new Box3().setFromCenterAndSize(at, new Vector3(0.01, 0.01, 0.01)), step: 'control', door: null };
    expect(misfits(def, [...pieces, cube]).get(`${leaf.name} holds part of ${cube.name}`) ?? [], `the poses at which ${leaf.name} holds ${cube.name}, the closed one among them`).toContain(0);
  });

  it('reports a leaf moved 12 mm toward its partner, which the model alone never tries (review 9, F35)', () => {
    const { def, leaves } = pair();
    const [left, right] = leaves;
    if (left === undefined || right === undefined) throw new Error(`${def.id} has no pair of leaves.`);
    const found = misfits(def, pieces, { k: 1, by: new Matrix4().makeTranslation(-0.012, 0, 0) });
    expect(found.get(`${left.name} meets its partner ${right.name}`) ?? [], `the poses at which ${def.id}'s pair, 4 mm into each other closed, meet, the closed one among them`).toContain(0);
  });
});
