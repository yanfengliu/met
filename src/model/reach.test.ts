/**
 * Reachability (work unit 2, M4; docs/design/spec.md, Walk mode: No trap, no dead end): from the walk mode's Great Hall spawn, the walk mode's own walker
 * walks to every space of the finished model that holds artworks, near enough to look at each artwork, to the place of every interior camera preset, to
 * every walk spawn and to both ends of every route of src/model/hunt/routes.ts. The world is the page's: the whole sequence's Timeline at t = N, its solid
 * pieces (`collisionMeshes`) in a `CollisionWorld` over three-mesh-bvh; the fill (src/walk/reach.ts) moves the real walker from place to place, and the
 * path to each place that meets a target is walked again from the spawn (`replay`), so a target counts only when that path walks end to end; a path
 * that strays from the fill's places does not count, and the fill stops once all are met.
 * Bound:
 * - Doors: the Hunt central arch's three doors (src/model/doors.ts) count as open, their leaves' meshes left out of the world, as a visitor opens them by
 *   E. Every other door counts as closed, its closed leaves in the world whether their material is solid or not: the locked doors (the links', the
 *   Bank's), and Weston's 1888 door into the Petrie Court, which opens (work unit 2, M2b) but is counted shut. So the Petrie Court must be reached without
 *   Weston's door, by the corridor from gallery 199.
 * - Grid: one place per 0.5 m cell and 0.3 m band of height; moves of one cell toward each of four neighbours' centres, at a run, each on from the
 *   walker's exact state at the place before (`Walker.save` and `restore`, never set down again), never off the ground and never a jump. A passage
 *   the walker passes only on some other line can be missed; a place the fill reaches, the walker reaches, as the replay shows.
 * - Where: inside the building's outline (src/model/site/footprint.ts) and the strip of the front steps and plaza on the axis (|X| ≤ 23.47 m, from the
 *   facade to 0.5 m short of the curb), so the fill walks neither the park nor the avenue.
 * - Met: an artwork when, from a place the fill reaches, the walker let go of the keys there comes to rest on the artwork's floor (feet within 0.6 m of its
 *   placement's level) with an eye (`Walker.eye()`, the eye the page draws from) whose look target, turned to one of the artwork's aims within the
 *   walker's ±85° of pitch, is that artwork: the walking eye's own query (src/walk/look.ts `lookTarget`, so within its 6 m reach and through untagged glass
 *   only) on the page's hit query (src/viewer/pick.ts), over the timeline's pieces and the door layer's stand-ins and doorways registered as the page
 *   registers them, the doors as the fill counts them. At rest it moves under 1 mm a second with its eye within 1 mm of where it settles, 1.6 m over its
 *   feet, within 2 s of physics and on the ground at every step on the way; a walker that leaves the ground, as in a fall, or does not rest is
 *   refused there. The check is made again, with the same helper, from the replay's walker at that place, in the state that walk left it in. The aims
 *   are the middle of each of its pieces' own boxes, its object's first, then five more points of the object's: a quarter and three quarters up,
 *   toward the front and either side. A preset is met when an eye stands within 1 m of its camera; a spawn or a route's end when feet stand within
 *   0.5 m of it in plan and 0.3 m of its level.
 * - Each space with artworks is stood in at the place of the preset its collection step frames, which stands inside it, so a space seen only through
 *   an opening from another is not passed.
 * - The fill takes up places nearest an unmet target first and stops once every target is met. Short of that it fills all it can, and each unmet target
 *   names the nearest place reached.
 * Red with the model of 691b8f7, before src/model/mmw/party-walls.ts opened ENGELHARD_PASSAGE and PETRIE_PASSAGE: both courts as spaces, the Engelhard
 * Court's 8 artworks, the Petrie Court's 10, the int-engelhard-north and int-petrie-court presets and R6's end, each artwork's nearest place across the wall
 * it sat behind (156,533 places in 22.5 s, every other target met). Red again with ENGELHARD_PASSAGE, the passage from gallery 374, alone walled up
 * (the court, its 8, its preset, R6's end; 166,500 places) and with PETRIE_PASSAGE, the one from Exhibition Gallery 199, alone (the court, its 10,
 * its preset; 172,282 places). Green, it stops at about 62,500 places in about 16 s (17 s at 670f8cc; 9 s with the box rule below, on the same
 * machine), and walks the 123 targets' paths again and looks again from them in 0.8 s.
 * Review 12 of work unit 2 found two holes in the gate of 69cfa11, each given its regression: each move began with `Walker.place`, which over a gap
 * the walker had bridged set it on the floor below with no fall (F40; src/walk/reach.test.ts, the groove: 288 places on the closed floor at 69cfa11); and
 * the sight line was a 2 cm capsule taken as clear when nothing pushed it, so a line through the middle of a wall, whose faces pushed it opposite ways and
 * whose crossing the triangle distance does not see, read clear (F41; that sight line, src/walk/sight.ts, went with the box rule in review 17).
 * Review 17 found the gate of 0defda0 measuring distance and sight to an artwork's combined box (its box within 6 m and a clear line to it), which
 * can hold empty space: it took object 458998 as seen from an eye whose nearest tagged surface was 6.368 m away (F44). An artwork is now met only
 * where the look target finds it; the fixture at the end, an L of two slabs whose box's corner lies 0.99 m from the eye and each slab 10.5 m off, is
 * met by the old rule and not by this one.
 * Review 18 found that gate, as at 1f3d7c9, casting from feet + 1.6 m, an eye the walker never has where it moves: `Walker.eye()` lags a physics step
 * behind the feet and eases out of stair snaps, and from the recorded states of nine of the places it accepted, the look missed (bowl 44745's nearest
 * surface 6.00012 m from the real eye; F51). An artwork is now looked at from where the walker comes to rest; the second fixture, a walker running
 * away from a slab that is 5.8 m off at the place and 6.1 m off where it stops, is met by the eye at feet + 1.6 m and not by the one it rests with.
 * Review 19 found that helper, as at 2600751, taking rest as a speed under 1 mm a second alone: a wall that stopped a walker just after a stair snap
 * left its eye easing, 22.7 cm under where it settles (F52), and a walker let go before a drop fell, landed and was taken as resting (F53). The last
 * two fixtures, a 0.3 m step before a parapet under a beam and an edge over a floor 0.6 m down, are met by that helper and not by this one.
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
import { BODY, MOTION, NO_INPUT, WALKER_STATE_SIZE, Walker } from '../walk/walker.js';
import { entryOf, stepArtworks } from './collection/place.js';
import { SPACES_A } from './collection/spaces-a.js';
import { SPACES_B } from './collection/spaces-b.js';
import { DOORS, doorById } from './doors.js';
import { CURB_WEST_Z, STEPS_HALF_WIDTH } from './frame.js';
import { ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6, ROUTE_R7 } from './hunt/routes.js';
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
  /** Whether feet at (x, y, z), of `walker` as it stands there (to be read or copied, never moved), meet it. */
  readonly met: (x: number, y: number, z: number, walker: Walker) => boolean;
}

let world: CollisionWorld;
/** The page's hit query over the finished model (src/main.ts): what the walking eye's look target runs; and a walker in the same world to try things with. */
let hit: HitFn;
let probe: Walker;
let fill: Reach;
let targets: readonly Target[] = [];
let unmet: Set<Target>;
/** Each met target's place, and how far the walk again from the spawn strayed from the fill's path to it (metres; Infinity for a fall). */
const metBy = new Map<Target, number>();
const strayed = new Map<Target, number>();
/** Each artwork met in the fill whose check failed from the replay's walker at its place. */
const unseen = new Set<Target>();
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

/** At most this long a walker let go of the keys may take to come to rest, seconds of physics; from a run it rests in about 0.6 s, a stair snap's ease included. */
const REST_SECONDS = 2;
/** At rest a walker moves under REST_SPEED metres a second and its eye stands within REST_EYE metres of where it settles, 1.6 m over its feet. */
const REST_SPEED = 1e-3;
const REST_EYE = 1e-3;
/** How far a walker coasts from a run once let go (5 m/s for 0.07 s), and a stair's step it may take on the way, metres. */
const COAST = MOTION.run * MOTION.groundTau + BODY.step;
const state = new Float64Array(WALKER_STATE_SIZE);
const seen = new Vector3();
const settled = new Vector3();

/**
 * `into` in `walker`'s state, let go of the keys and stepped until it rests, as a visitor stops to look: moving under REST_SPEED with its eye within
 * REST_EYE of where it settles, on the ground at every step. Null where it leaves the ground on the way, a fall the fill never takes (review 19, F53),
 * or does not come to rest within REST_SECONDS; a speed of nought with the eye still easing out of a stair snap is not rest (F52).
 */
function rest(walker: Walker, into: Walker): Walker | null {
  walker.save(state);
  into.restore(state);
  for (let k = 0; k < REST_SECONDS / MOTION.fixedStep; k += 1) {
    into.update(MOTION.fixedStep, NO_INPUT);
    if (!into.onGround) return null;
    const { x, y, z } = into.feet;
    if (into.velocity.length() < REST_SPEED && into.eye(seen).distanceTo(settled.set(x, y + BODY.eye, z)) < REST_EYE) return into;
  }
  return null;
}

/**
 * The target of artwork `id` on floor `floor`, of `pieces`: met where the walker at a place, let go of the keys, rests on its floor with an eye whose look
 * target, turned to one of its aims, is it. `view` gives the hit query and a walker to rest in, in the world the walker walks.
 */
function artworkTarget(name: string, id: string, floor: number, pieces: readonly Piece[], view: () => { readonly query: HitFn; readonly probe: Walker }): Target {
  const box = new Box3();
  for (const { geometry, matrix } of pieces) {
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    box.union((geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix));
  }
  const centre = box.getCenter(new Vector3());
  const aims = aimsOf(pieces);
  const eye = new Vector3();
  const near = new Vector3();
  return {
    group: 'artwork',
    name,
    x: centre.x,
    z: centre.z,
    radius: LOOK_REACH.artwork + Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
    level: floor,
    met: (x, y, z, walker) => {
      // Where it rests lies within a coast of the place: too far off there, it cannot be in reach at rest, which spares the coast and the casts.
      if (Math.abs(y - floor) > FLOOR + COAST || box.distanceToPoint(near.set(x, y + EYE, z)) > LOOK_REACH.artwork + COAST) return false;
      const { query, probe: into } = view();
      const still = rest(walker, into);
      if (still === null || Math.abs(still.feet.y - floor) > FLOOR) return false;
      still.eye(eye);
      // A piece within the look's reach needs the box within it, which costs no cast.
      return box.distanceToPoint(eye) <= LOOK_REACH.artwork && labels(query, eye, aims, id);
    },
  };
}

function artworkTargets(): Target[] {
  return [...SPACES_A, ...SPACES_B].flatMap((def) => {
    const pieces = stepArtworks(def).pieces;
    return def.placements.map((placement, k): Target => artworkTarget(`${def.space}: ${String(placement.id)} (${entryOf(placement.id).title.slice(0, 40)})`, String(placement.id), placement.floor, pieces[k] ?? [], () => ({ query: hit, probe })));
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
  const routes = [ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6, ROUTE_R7].flatMap((r) => {
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
  probe = new Walker(world, floorY);
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
    stop: (place, x, y, z, walker) => {
      for (const t of byCell.get(planKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) {
        if (!unmet.has(t) || !t.met(x, y, z, walker)) continue;
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
  // From the replay's walker at each artwork's place, in the state that walk left it in, the artwork is looked for again.
  const metAt = [...metBy];
  const offs = replay(world, floorY, start.feet[0], start.feet[1], start.feet[2], spawnYaw(start), fill, ends, (k, walker) => {
    const [t, place] = metAt[k] ?? [];
    if (t?.group !== 'artwork' || place === undefined) return;
    const [x, y, z] = fill.at(place);
    if (!t.met(x, y, z, walker)) unseen.add(t);
  });
  const offOf = new Map(ends.map((place, k) => [place, offs[k] ?? Number.POSITIVE_INFINITY]));
  for (const [t, place] of metBy) {
    const off = offOf.get(place) ?? Number.POSITIVE_INFINITY;
    if (off > 1e-6) strayed.set(t, off);
    if (off > 1e-6 || unseen.has(t)) unmet.add(t);
  }
  replayMs = performance.now() - replayed;
}, 300_000);

/** An unmet target, with the nearest place the fill reached, or how far the walk again strayed from the path that met it. */
function describeMiss(t: Target): string {
  const off = strayed.get(t);
  if (off !== undefined) return `${t.name}: met at place ${String(metBy.get(t))}, but its path walked again from the spawn strays ${off.toFixed(3)} m from it`;
  if (unseen.has(t)) return `${t.name}: met at place ${String(metBy.get(t))} in the fill, but not from the replay's walker there`;
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

describe('an artwork met by the look target from where the walker rests, not by its box nor from feet + 1.6 m (reviews 17 and 18, F44 and F51)', () => {
  const cube = new BoxGeometry(1, 1, 1);
  const stone = new MeshStandardMaterial({ name: 'stone' });
  const bronze = new MeshStandardMaterial({ name: 'bronze' });
  /** A box from `min` to `max`, world metres. */
  const block = ([x0, y0, z0]: readonly [number, number, number], [x1, y1, z1]: readonly [number, number, number]): Piece => ({ geometry: cube, matrix: new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0, y1 - y0, z1 - z0)) });
  /** A slab 2 m high standing on the floor, centred on (x, z), `w` across X and `d` across Z. */
  const slab = (x: number, z: number, w: number, d: number): Piece => block([x - w / 2, 0, z - d / 2], [x + w / 2, 2, z + d / 2]);
  /** A floor 40 m square, its top at 0. */
  const GROUND: readonly Piece[] = [block([-20, -1, -20], [20, 0, 20])];

  /** `blocks` in stone with `slabs` among them as one artwork, A, meant on level `floor`: its target, a walker in its walk world and the hit query. */
  function site(slabs: readonly Piece[], floor = 0, blocks: readonly Piece[] = GROUND): { readonly target: Target; readonly walker: Walker; readonly query: HitFn } {
    const timeline = new Timeline([{ id: 'site', chapter: CHAPTERS[0].id, title: 'site', motion: { kind: 'rise' }, build(kit) {
      for (const { geometry, matrix } of blocks) kit.add(geometry, stone, matrix);
      for (const { geometry, matrix } of slabs) kit.addTagged(geometry, bronze, matrix, { kind: 'artwork', id: 'A' });
    } }]);
    timeline.evaluate(1);
    const bvhs = new GeometryBvhs();
    const walls = new CollisionWorld(bvhs);
    walls.build(collisionMeshes(timeline.steps, 1));
    const picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), bvhs, -1, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
    const query: HitFn = (ray, q) => picker.hit(ray, q);
    const into = new Walker(walls, -1);
    return { target: artworkTarget('the fixture', 'A', floor, slabs, () => ({ query, probe: into })), walker: new Walker(walls, -1), query };
  }

  it('is not met where its box’s corner is within 6 m of the eye and its pieces are not, and is met before a piece of it (F44)', () => {
    // An L of two slabs 10 m long, one artwork; its box is the 10 m square they bound, empty but for them.
    const slabs = [slab(5, 0.1, 10, 0.2), slab(0.1, 5, 0.2, 10)];
    const { target, walker } = site(slabs);
    // Feet at (10.7, 0, 10.7), at rest: the eye 0.99 m from the box's corner, which the gate of 0defda0 took as within reach, and 10.5 m from either slab.
    walker.place(10.7, 0, 10.7, 0);
    expect(new Box3(new Vector3(0, 0, 0), new Vector3(10, 2, 10)).distanceToPoint(walker.eye()), 'the box’s corner').toBeCloseTo(0.99, 2);
    expect(target.met(10.7, 0, 10.7, walker), 'its box in reach, its pieces not').toBe(false);
    walker.place(5, 0, 4, 0);
    expect(target.met(5, 0, 4, walker), '3.8 m before a slab').toBe(true);
    expect(site(slabs, 0.7).target.met(5, 0, 4, walker), 'but on another floor').toBe(false);
  });

  it('is looked at from where the walker comes to rest, with its own eye: not met by a walker running away from it out of reach, which feet + 1.6 m met (F51)', () => {
    const slabs = [slab(0, 0.1, 10, 0.2)];
    const { target, walker, query } = site(slabs);
    // From 3 m before the slab, a run straight away from it (+Z) until the feet pass 5.95 m: the place, moving at a run.
    walker.place(0, 0, 3, Math.PI);
    for (let k = 0; k < 240 && walker.feet.z < 5.95; k += 1) walker.update(MOTION.fixedStep, { forward: 1, right: 0, run: true });
    const { x, y, z } = walker.feet;
    expect(walker.velocity.length(), 'at a run').toBeCloseTo(MOTION.run, 1);
    expect(labels(query, new Vector3(x, y + EYE, z), aimsOf(slabs), 'A'), 'from feet + 1.6 m at the place, as the gate of 1f3d7c9 looked: 5.8 m off').toBe(true);
    expect(target.met(x, y, z, walker), 'let go there, it rests a coast on, 6.1 m off').toBe(false);
    expect(walker.feet.z, 'and the walker it was given is not moved').toBe(z);
    // Standing still at the same place, it is met.
    walker.place(x, y, z, Math.PI);
    expect(target.met(x, y, z, walker), 'at rest there').toBe(true);
  });

  it('is not met from a walker the wall has stopped while its eye still eases up from a stair snap, but from its settled eye (review 19, F52)', () => {
    // A 0.3 m step just before a parapet 1.2 m high under a beam from 1.8 m: an opening 0.6 m tall over the parapet, through which a slab 2.9 m on is seen
    // from an eye under 1.8 m; the walker's settles 1.9 m over the step, where the beam hides the slab.
    const slabs = [block([-1, 1.3, -3.1], [1, 1.7, -2.9])];
    const { target, walker, query } = site(slabs, 0.3, [...GROUND, block([-3, 0, -0.45], [3, 0.3, 0]), block([-3, 0, -0.65], [3, 1.2, -0.45]), block([-3, 1.8, -0.65], [3, 3, -0.45])]);
    // Run up the step into the parapet until it stops the walker: snapped up 0.3 m a few hundredths of a second before, its eye still eases.
    walker.place(0, 0, 2.5, 0);
    for (let k = 0; k < 240 && (k < 10 || walker.velocity.length() >= REST_SPEED); k += 1) walker.update(MOTION.fixedStep, { forward: 1, right: 0, run: true });
    const { x, y, z } = walker.feet;
    const eye = walker.eye();
    expect([y, walker.velocity.length()], 'on the step, stopped by the parapet').toEqual([expect.closeTo(0.3, 6), expect.closeTo(0, 3)]);
    expect(y + EYE - eye.y, 'its eye still under its settled height').toBeGreaterThan(0.15);
    expect(labels(query, eye, aimsOf(slabs), 'A'), 'from that easing eye, through the opening').toBe(true);
    // Red with rest taken as a speed under 1 mm a second alone, as at 2600751: it took that eye and met the slab.
    expect(target.met(x, y, z, walker), 'from the eye it settles with, the beam hides it').toBe(false);
  });

  it('is not met where letting go of the keys carries the walker off an edge, though it lands where it would be met (review 19, F53)', () => {
    // An upper floor, its top at 0, ending at Z 0 over a lower floor 0.6 m down, more than a step, with a slab 2.9 m on, on the lower floor's level.
    const slabs = [block([-1, -0.6, -3.1], [1, 1.4, -2.9])];
    const floors = [block([-5, -1, 0], [5, 0, 10]), block([-5, -1.6, -10], [5, -0.6, 0])];
    const { target, walker, query } = site(slabs, -0.6, floors);
    // A run toward the edge, let go 0.25 m before it: the walker coasts about 0.35 m, off the edge, and falls.
    walker.place(0, 0, 3, 0);
    for (let k = 0; k < 240 && walker.feet.z > 0.25; k += 1) walker.update(MOTION.fixedStep, { forward: 1, right: 0, run: true });
    const { x, y, z } = walker.feet;
    expect([y, walker.velocity.length()], 'on the upper floor at a run').toEqual([expect.closeTo(0, 6), expect.closeTo(MOTION.run, 1)]);
    // Landed and at rest down there, the slab is in view.
    const after = site(slabs, -0.6, floors).walker;
    after.place(x, -0.6, -0.3, 0);
    expect(labels(query, after.eye(), aimsOf(slabs), 'A'), 'from the lower floor where it lands').toBe(true);
    // Red with a fall on the way to rest allowed, as at 2600751: it landed, rested and met the slab.
    expect(target.met(x, y, z, walker), 'let go there, it would fall: refused').toBe(false);
  });
});
