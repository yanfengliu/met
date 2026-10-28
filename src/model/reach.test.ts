/**
 * Reachability (work unit 2, M4; docs/design/spec.md, Walk mode: No trap, no dead end): from the walk mode's Great Hall spawn, the walk mode's own walker
 * walks to every space of the finished model that holds artworks, near enough to look at each artwork, to the place of every interior camera preset, to
 * every walk spawn and to both ends of every route of src/model/hunt/routes.ts. The world is the page's: the whole sequence's Timeline at t = N, its solid
 * pieces (`collisionMeshes`) in a `CollisionWorld` over three-mesh-bvh; the fill (src/walk/reach.ts) moves the real walker from place to place, and the
 * path to each place that meets a target is walked again from the spawn (`replay`), so a target counts only when that path walks end to end.
 * Bound:
 * - Doors: the Hunt central arch's three doors (src/model/doors.ts) count as open, their leaves' meshes left out of the world, as a visitor opens them by
 *   E. Every other door counts as closed, its closed leaves in the world whether their material is solid or not: the locked doors (the links', the
 *   Bank's), and Weston's 1888 door into the Petrie Court, which opens (work unit 2, M2b) but is counted shut. So the Petrie Court must be reached without
 *   Weston's door, by the corridor from gallery 199.
 * - Grid: one place per 0.5 m cell and 0.3 m band of height; moves of one cell toward each of four neighbours' centres, at a run, each on from the
 *   walker's exact state at the place before (never set down again), never off the ground and never a jump. A passage the walker passes only on some
 *   other line can be missed; a place the fill reaches, the walker reaches, as the replay shows.
 * - Where: inside the building's outline (src/model/site/footprint.ts) and the strip of the front steps and plaza on the axis (|X| ≤ 23.47 m, from the
 *   facade to 0.5 m short of the curb), so the fill walks neither the park nor the avenue.
 * - Met: an artwork when a place on its floor (feet within 0.6 m of its placement's level) has an eye, 1.6 m over the feet, whose look target, turned to
 *   one of the artwork's aims within the walker's ±85° of pitch, is that artwork: the walking eye's own query (src/walk/look.ts `lookTarget`, so within
 *   its 6 m reach and through untagged glass only) on the page's hit query (src/viewer/pick.ts), over the timeline's pieces and the door layer's stand-ins
 *   and doorways registered as the page registers them, the doors as the fill counts them. The aims are the middle of each of its pieces' own boxes,
 *   its object's first, then five more points of the object's: a quarter and three quarters up, toward the front and either side. A preset is met
 *   when an eye stands within 1 m of its camera; a spawn or a route's end when feet stand within 0.5 m of it in plan and 0.3 m of its level.
 * - Each space with artworks is stood in at the place of the preset its collection step frames, which stands inside it, so a space seen only through
 *   an opening from another is not passed.
 * - The fill takes up places nearest an unmet target first and stops once every target is met. Short of that it fills all it can, and each unmet target
 *   names the nearest place reached.
 * Red with the model of 691b8f7, before src/model/mmw/party-walls.ts opened ENGELHARD_PASSAGE and PETRIE_PASSAGE: both courts as spaces, the Engelhard
 * Court's 8 artworks, the Petrie Court's 10, the int-engelhard-north and int-petrie-court presets and R6's end, each artwork's nearest place across the wall
 * it sat behind (156,533 places in 22.5 s, every other target met). Red again with ENGELHARD_PASSAGE alone walled up (the court, its 8, its preset, R6's
 * end; 166,500 places) and with PETRIE_PASSAGE alone (the court, its 10, its preset; 172,282 places). Green, it stops at about 62,500 places in about 17 s
 * (9 s with the box rule below, on the same machine) and walks the 123 targets' paths again in 0.6 s.
 * Review 12 of work unit 2 found two holes in the gate of 69cfa11, each given its regression: each move began with `Walker.place`, which over a gap
 * the walker had bridged set it on the floor below with no fall (F40; src/walk/reach.test.ts, the groove: 288 places on the closed floor at 69cfa11); and
 * the sight line was a 2 cm capsule taken as clear when nothing pushed it, so a line through the middle of a wall, whose faces pushed it opposite ways and
 * whose crossing the triangle distance does not see, read clear (F41; that sight line, src/walk/sight.ts, went with the box rule in review 17).
 * Review 17 found the gate of 0defda0 measuring distance and sight to an artwork's combined box, which can hold empty space: it took object 458998 as seen
 * from an eye whose nearest tagged surface was 6.368 m away (F44). An artwork is now met only where the look target finds it; the fixture at the end, an L
 * of two slabs whose box's corner lies 0.99 m from the eye and each slab 10.5 m off, is met by the old rule and not by this one.
 */
import { Box3, BoxGeometry, Layers, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { DoorLayer } from '../viewer/doors.js';
import { ModelPicker } from '../viewer/pick.js';
import { PRESETS } from '../viewer/presets.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import { LOOK_REACH, lookTarget } from '../walk/look.js';
import type { HitFn } from '../walk/look.js';
import { reach, replay } from '../walk/reach.js';
import type { Reach } from '../walk/reach.js';
import { SPAWNS, spawnById, spawnYaw } from '../walk/spawns.js';
import { BODY, MOTION } from '../walk/walker.js';
import { entryOf, stepArtworks } from './collection/place.js';
import { SPACES_A } from './collection/spaces-a.js';
import { SPACES_B } from './collection/spaces-b.js';
import { DOORS, doorById } from './doors.js';
import { CURB_WEST_Z, STEPS_HALF_WIDTH } from './frame.js';
import { ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6 } from './hunt/routes.js';
import { doorLeavesOf } from './lib/window.js';
import { insideOutline } from './site/footprint.js';

const CELL = 0.5;
/** An artwork's floor and a place's feet differ by at most this, metres; a spawn's or a route end's level by at most LEVEL. */
const FLOOR = 0.6;
const LEVEL = 0.3;
const EYE = BODY.eye;
/** The doors the fill counts as open (Bound); every other door counts as closed. */
const OPEN_DOORS: readonly string[] = ['hunt-entrance-south', 'hunt-entrance-middle', 'hunt-entrance-north'];

type Group = 'artwork' | 'preset' | 'spawn' | 'route';

interface Target {
  readonly group: Group;
  readonly name: string;
  /** Plan point and radius: only places within it are tried. */
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  /** The level it wants feet near. */
  readonly level: number;
  readonly met: (x: number, y: number, z: number) => boolean;
}

let world: CollisionWorld;
/** The page's hit query over the finished model (src/main.ts): what the walking eye's look target runs. */
let hit: HitFn;
let fill: Reach;
let targets: readonly Target[] = [];
let unmet: Set<Target>;
/** Each met target's place, and how far the walk again from the spawn strayed from the fill's path to it (metres; Infinity for a fall). */
const metBy = new Map<Target, number>();
const strayed = new Map<Target, number>();
let opened = 0;
let ms = 0;
let replayMs = 0;

/** Where on an artwork's object the eye looks, as fractions of its own box: the middle, a quarter and three quarters up, toward the front, either side. */
const AIMS: readonly (readonly [number, number, number])[] = [[0.5, 0.5, 0.5], [0.5, 0.25, 0.5], [0.5, 0.75, 0.5], [0.5, 0.5, 0.9], [0.2, 0.5, 0.5], [0.8, 0.5, 0.5]];

interface Piece {
  readonly geometry: BufferGeometry;
  readonly matrix: Matrix4;
}

/** The point of `piece` at fractions (fx, fy, fz) of its own box, in the world. */
function pointOf({ geometry, matrix }: Piece, [fx, fy, fz]: readonly [number, number, number]): Vector3 {
  if (geometry.boundingBox === null) geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox ?? new Box3();
  return new Vector3(min.x + (max.x - min.x) * fx, min.y + (max.y - min.y) * fy, min.z + (max.z - min.z) * fz).applyMatrix4(matrix);
}

/** The world points to look at on an artwork of `pieces`, its object first (src/model/collection/place.ts): the object's middle, every other piece's middle, then the rest of AIMS on the object. */
function aimsOf(pieces: readonly Piece[]): Vector3[] {
  const [object, ...rest] = pieces;
  if (object === undefined) return [];
  const [middle = [0.5, 0.5, 0.5], ...others] = AIMS;
  return [pointOf(object, middle), ...rest.map((p) => pointOf(p, middle)), ...others.map((f) => pointOf(object, f))];
}

const look = new Vector3();

/** Whether the walking eye at `eye`, turned to one of `aims` as far as the walker can pitch, has artwork `id` as its look target (src/walk/look.ts). */
function labels(query: HitFn, eye: Vector3, aims: readonly Vector3[], id: string): boolean {
  return aims.some((aim) => {
    const length = look.subVectors(aim, eye).length();
    if (length < 1e-6 || Math.abs(Math.asin(look.y / length)) > MOTION.maxPitch) return false;
    const target = lookTarget(query, eye, look.divideScalar(length));
    return target?.kind === 'artwork' && target.id === id;
  });
}

/** The target of artwork `id` on floor `floor`, of `pieces`: met where a place on its floor has an eye whose look target, turned to one of its aims, is it. */
function artworkTarget(name: string, id: string, floor: number, pieces: readonly Piece[], query: () => HitFn): Target {
  const box = new Box3();
  for (const { geometry, matrix } of pieces) {
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    box.union((geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix));
  }
  const centre = box.getCenter(new Vector3());
  const aims = aimsOf(pieces);
  const eye = new Vector3();
  return {
    group: 'artwork',
    name,
    x: centre.x,
    z: centre.z,
    radius: LOOK_REACH.artwork + Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
    level: floor,
    met: (x, y, z) => {
      if (Math.abs(y - floor) > FLOOR) return false;
      eye.set(x, y + EYE, z);
      // A piece within the look's reach needs the box within it, which costs no cast.
      return box.distanceToPoint(eye) <= LOOK_REACH.artwork && labels(query(), eye, aims, id);
    },
  };
}

function artworkTargets(): Target[] {
  return [...SPACES_A, ...SPACES_B].flatMap((def) => {
    const pieces = stepArtworks(def).pieces;
    return def.placements.map((placement, k): Target => artworkTarget(`${def.space}: ${String(placement.id)} (${entryOf(placement.id).title.slice(0, 40)})`, String(placement.id), placement.floor, pieces[k] ?? [], () => hit));
  });
}

/** Feet within 0.5 m in plan and LEVEL of `level`. */
function standing(group: Group, name: string, x: number, z: number, level: number): Target {
  return { group, name, x, z, radius: 0.5, level, met: (fx, fy, fz) => Math.hypot(fx - x, fz - z) <= 0.5 && Math.abs(fy - level) <= LEVEL };
}

function placeTargets(): Target[] {
  const presets = PRESETS.flatMap((p): Target[] => {
    if (p.group !== 'interior' || p.camera.kind !== 'look') return [];
    const [px, py, pz] = p.camera.position;
    return [{ group: 'preset', name: p.id, x: px, z: pz, radius: 1, level: py - EYE, met: (x, y, z) => Math.hypot(x - px, y + EYE - py, z - pz) <= 1 }];
  });
  const spawns = SPAWNS.map((s) => standing('spawn', s.id, s.feet[0], s.feet[2], s.feet[1]));
  const routes = [ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6].flatMap((r) => {
    const first = r.points[0] ?? [0, 0];
    const last = r.points[r.points.length - 1] ?? first;
    return [standing('route', `${r.id} start`, first[0], first[1], r.startY), standing('route', `${r.id} end`, last[0], last[1], r.endY)];
  });
  return [...presets, ...spawns, ...routes];
}

const planKey = (ix: number, iz: number): number => (ix + 1024) * 2048 + (iz + 1024);

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  // Each door's meshes, found by their tags: the open doors' leave the world, every other door's stand in it as built, closed.
  for (const id of OPEN_DOORS) if (doorById(id)?.locked !== false) throw new Error(`The fill counts door "${id}" as open, but src/model/doors.ts has no unlocked door of that id.`);
  const doors = timeline.steps.flatMap((s) => s.meshes.flatMap((mesh, m) => (s.tags[m] ?? []).filter((tag) => tag?.kind === 'door').slice(0, 1).map((tag) => ({ mesh, id: tag?.id ?? '' }))));
  const open = new Set<InstancedMesh>(doors.filter((d) => OPEN_DOORS.includes(d.id)).map((d) => d.mesh));
  const closed = doors.filter((d) => !open.has(d.mesh) && d.mesh.count > 0).map((d) => d.mesh);
  opened = open.size;
  const bvhs = new GeometryBvhs();
  const meshes = [...new Set([...collisionMeshes(timeline.steps, timeline.n).filter((m) => !open.has(m)), ...closed])];
  world = new CollisionWorld(bvhs);
  world.build(meshes);
  const floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
  // The page's hit query (src/main.ts), the doors as the fill counts them: the door layer at t = N, the Hunt central doors opened, every other door closed.
  const layer = new DoorLayer(timeline.steps, (i) => timeline.restingPieces(i), DOORS, doorLeavesOf);
  layer.sync(timeline.n, 0, true);
  for (const id of OPEN_DOORS) layer.use(id, null);
  layer.sync(timeline.n, 0, true);
  const all = timeline.steps.flatMap((s) => s.meshes);
  // Bounds as the renderer's culling leaves them after a frame, which the picker trusts; at t = N every piece is at rest, so they are exact.
  for (const mesh of all) mesh.computeBoundingSphere();
  const picker = new ModelPicker(all, bvhs, floorY, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
  layer.registerWith(picker);
  hit = (ray, query) => picker.hit(ray, query);
  targets = [...artworkTargets(), ...placeTargets()];
  unmet = new Set(targets);
  // Each target is tried only by places in the cells within its radius.
  const byCell = new Map<number, Target[]>();
  for (const t of targets) {
    const span = Math.ceil(t.radius / CELL) + 1;
    const cx = Math.floor(t.x / CELL);
    const cz = Math.floor(t.z / CELL);
    for (let ix = cx - span; ix <= cx + span; ix += 1) {
      for (let iz = cz - span; iz <= cz + span; iz += 1) {
        if (Math.hypot((ix + 0.5) * CELL - t.x, (iz + 0.5) * CELL - t.z) > t.radius + CELL) continue;
        const list = byCell.get(planKey(ix, iz));
        if (list === undefined) byCell.set(planKey(ix, iz), [t]);
        else list.push(t);
      }
    }
  }
  const start = spawnById('great-hall');
  if (start === undefined) throw new Error('src/walk/spawns.ts has no great-hall spawn to start the fill from.');
  const inside = (x: number, z: number): boolean => insideOutline(x, z) || (Math.abs(x) <= STEPS_HALF_WIDTH && z >= 0 && z <= CURB_WEST_Z - 0.5);
  const began = performance.now();
  fill = reach(world, floorY, start.feet[0], start.feet[1], start.feet[2], spawnYaw(start), {
    cell: CELL,
    inside,
    // Nearest an unmet target first, a storey counted as a stair's length (about 4 m of plan a metre of height).
    toward: (x, y, z) => {
      let best = Number.POSITIVE_INFINITY;
      for (const t of unmet) best = Math.min(best, Math.hypot(x - t.x, z - t.z) + 4 * Math.abs(y - t.level));
      return best;
    },
    stop: (place, x, y, z) => {
      for (const t of byCell.get(planKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) {
        if (!unmet.has(t) || !t.met(x, y, z)) continue;
        unmet.delete(t);
        metBy.set(t, place);
      }
      return unmet.size === 0;
    },
  });
  ms = performance.now() - began;
  // Each met target's path, walked again from the spawn apart from the fill's saved states: one that strays, or falls, does not count.
  const replayed = performance.now();
  const ends = [...metBy.values()];
  const offs = replay(world, floorY, start.feet[0], start.feet[1], start.feet[2], spawnYaw(start), fill, ends);
  const offOf = new Map(ends.map((place, k) => [place, offs[k] ?? Number.POSITIVE_INFINITY]));
  for (const [t, place] of metBy) {
    const off = offOf.get(place) ?? Number.POSITIVE_INFINITY;
    if (off <= 1e-6) continue;
    unmet.add(t);
    strayed.set(t, off);
  }
  replayMs = performance.now() - replayed;
}, 300_000);

/** An unmet target, with the nearest place the fill reached, or how far the walk again strayed from the path that met it. */
function describeMiss(t: Target): string {
  const off = strayed.get(t);
  if (off !== undefined) return `${t.name}: met at place ${String(metBy.get(t))}, but its path walked again from the spawn strays ${off.toFixed(3)} m from it`;
  const near = fill.nearest(t.x, t.z);
  const where = near === null ? 'nothing reached' : `nearest place ${near.distance.toFixed(2)} m away at (${fill.at(near.place).map((v) => v.toFixed(2)).join(', ')})`;
  return `${t.name} at (${t.x.toFixed(2)}, ${t.z.toFixed(2)}) on Y ${t.level.toFixed(2)}: ${where}`;
}

/** Each unmet target of `group`. */
function misses(group: Group): string[] {
  return [...unmet].filter((t) => t.group === group).map(describeMiss);
}

describe('reachability from the Great Hall spawn, by the walk mode’s walker', () => {
  it('fills from the spawn with the Hunt central doors left out of the world', () => {
    expect(opened, 'meshes of the Hunt central doors, found by their tags').toBeGreaterThan(0);
    expect(fill.count, `places reached in ${(ms / 1000).toFixed(1)} s, paths walked again in ${(replayMs / 1000).toFixed(1)} s`).toBeGreaterThan(10_000);
  });

  it('stands in every space that holds artworks, where the preset its collection step frames stands', () => {
    const missed = [...SPACES_A, ...SPACES_B].flatMap((def) => {
      const id = def.focus.kind === 'preset' ? def.focus.id : '';
      const t = targets.find((p) => p.group === 'preset' && p.name === id);
      if (t === undefined) return [`${def.space}: its step frames no interior preset (focus ${def.focus.kind} ${id})`];
      return unmet.has(t) ? [`${def.space}: ${describeMiss(t)}`] : [];
    });
    expect(missed).toEqual([]);
  });

  it('reaches every artwork near enough to look at it', () => {
    expect(misses('artwork')).toEqual([]);
  });

  it('reaches the place of every interior camera preset', () => {
    expect(misses('preset')).toEqual([]);
  });

  it('reaches every walk spawn and both ends of every route', () => {
    expect(misses('spawn')).toEqual([]);
    expect(misses('route')).toEqual([]);
  });
});

describe('an artwork met by the look target, not by its box (review 17, F44)', () => {
  it('is not met where its box’s corner is within 6 m of the eye and its pieces are not, and is met before a piece of it', () => {
    // An L of two slabs 10 m long and 2 m high on a floor, one artwork; its box is the 10 m square they bound, empty but for them.
    const cube = new BoxGeometry(1, 1, 1);
    const stone = new MeshStandardMaterial({ name: 'stone' });
    const bronze = new MeshStandardMaterial({ name: 'bronze' });
    const slab = (x: number, z: number, w: number, d: number): Matrix4 => new Matrix4().compose(new Vector3(x, 1, z), new Quaternion(), new Vector3(w, 2, d));
    const slabs: Piece[] = [{ geometry: cube, matrix: slab(5, 0.1, 10, 0.2) }, { geometry: cube, matrix: slab(0.1, 5, 0.2, 10) }];
    const fixture = new Timeline([{ id: 'l', chapter: CHAPTERS[0].id, title: 'l', motion: { kind: 'rise' }, build(kit) {
      kit.add(cube, stone, new Matrix4().compose(new Vector3(0, -0.5, 0), new Quaternion(), new Vector3(40, 1, 40)));
      for (const { geometry, matrix } of slabs) kit.addTagged(geometry, bronze, matrix, { kind: 'artwork', id: 'L' });
    } }]);
    fixture.evaluate(1);
    const picker = new ModelPicker(fixture.steps.flatMap((s) => s.meshes), new GeometryBvhs(), -1, { enabled: false, height: 0 }, new Layers(), (mesh, i) => fixture.tagOf(mesh, i));
    const query: HitFn = (ray, q) => picker.hit(ray, q);
    const target = artworkTarget('the L', 'L', 0, slabs, () => query);
    // Feet at (10.7, 0, 10.7): the eye 0.99 m from the box's corner, which the gate of 0defda0 took as within reach, and 10.5 m from either slab.
    const eye = new Vector3(10.7, EYE, 10.7);
    expect(new Box3(new Vector3(0, 0, 0), new Vector3(10, 2, 10)).distanceToPoint(eye), 'the box’s corner').toBeCloseTo(0.99, 2);
    expect(target.met(10.7, 0, 10.7), 'its box in reach, its pieces not').toBe(false);
    expect(target.met(5, 0, 4), '3.8 m before a slab').toBe(true);
    expect(target.met(5, 0.7, 4), 'but off its floor').toBe(false);
  });
});
