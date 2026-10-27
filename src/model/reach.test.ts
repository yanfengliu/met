/**
 * Reachability (work unit 2, M4; docs/design/spec.md, Walk mode: No trap, no dead end): from the walk mode's Great Hall spawn, the walk mode's own walker
 * walks to every space of the finished model that holds artworks, near enough to look at each artwork, to the place of every interior camera preset, to
 * every walk spawn and to both ends of every route of src/model/hunt/routes.ts. The world is the page's: the whole sequence's Timeline at t = N, its solid
 * pieces (`collisionMeshes`) in a `CollisionWorld` over three-mesh-bvh; the fill (src/walk/reach.ts) moves the real walker from place to place.
 * Bound:
 * - Doors: the Hunt central arch's three doors (src/model/doors.ts) count as open, their leaves' meshes left out of the world; at 691b8f7 those leaves are
 *   passable copies anyway, and M2b makes them solid and openable. Every other door counts as closed, its closed leaves in the world whether their
 *   material is solid or not: the locked doors (the links', the Bank's), and Weston's 1888 door into the Petrie Court, which the core builds as a solid
 *   closed piece with no tag until M2b makes it a door. So the Petrie Court must be reached without Weston's door, by the corridor from gallery 199.
 * - Grid: one place per 0.5 m cell and 0.3 m band of height; moves of one cell toward each of four neighbours' centres, at a run, never off the ground and
 *   never a jump. A passage the walker passes only on some other line can be missed; a place the fill reaches, the walker reaches.
 * - Where: inside the building's outline (src/model/site/footprint.ts) and the strip of the front steps and plaza on the axis (|X| ≤ 23.47 m, from the
 *   facade to 0.5 m short of the curb), so the fill walks neither the park nor the avenue.
 * - Met: an artwork when a place on its floor (feet within 0.6 m of its placement's level) has its eye, 1.6 m over the feet, within 6 m of the artwork's
 *   box (an artwork's look reach, src/walk/look.ts) and a 2 cm capsule from the eye to 5 cm short of the box meets no solid piece, glass included; a
 *   preset when an eye stands within 1 m of its camera; a spawn or a route's end when feet stand within 0.5 m of it in plan and 0.3 m of its level.
 * - Each space with artworks is stood in at the place of the preset its collection step frames, which stands inside it, so a space seen only through
 *   an opening from another is not passed.
 * - The fill takes up places nearest an unmet target first and stops once every target is met. Short of that it fills all it can, and each unmet target
 *   names the nearest place reached.
 * Red with the model of 691b8f7, before src/model/mmw/party-walls.ts opened ENGELHARD_PASSAGE and PETRIE_PASSAGE: the Engelhard Court's 8 artworks, the
 * Petrie Court's 10, the int-engelhard-north and int-petrie-court presets and R6's end, each artwork's nearest place across the wall it sat behind (156,597
 * places in 21 s, every other target met). Red again with ENGELHARD_PASSAGE alone walled up (the court's 8, its preset, R6's end) and with PETRIE_PASSAGE
 * alone (the court's 10, its preset). Green, it stops at about 63,000 places in 8 s.
 */
import { Box3, Line3, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { PRESETS } from '../viewer/presets.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import { LOOK_REACH } from '../walk/look.js';
import { reach } from '../walk/reach.js';
import type { Reach } from '../walk/reach.js';
import { SPAWNS, spawnById, spawnYaw } from '../walk/spawns.js';
import { BODY } from '../walk/walker.js';
import { entryOf, stepArtworks } from './collection/place.js';
import { SPACES_A } from './collection/spaces-a.js';
import { SPACES_B } from './collection/spaces-b.js';
import { doorById } from './doors.js';
import { CURB_WEST_Z, STEPS_HALF_WIDTH } from './frame.js';
import { ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6 } from './hunt/routes.js';
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
let fill: Reach;
let targets: readonly Target[] = [];
let unmet: Set<Target>;
let opened = 0;
let ms = 0;

const segment = new Line3();
const push = new Vector3();

/** Whether a 2 cm capsule from `eye` to 5 cm short of `to` meets no solid piece. */
function clear(eye: Vector3, to: Vector3): boolean {
  const d = eye.distanceTo(to);
  if (d < 0.1) return true;
  segment.start.copy(eye);
  segment.end.copy(to).addScaledVector(eye.clone().sub(to).normalize(), 0.05);
  world.resolveCapsule(segment, 0.02, false, push);
  return push.lengthSq() < 1e-12;
}

function artworkTargets(): Target[] {
  return [...SPACES_A, ...SPACES_B].flatMap((def) => {
    const pieces = stepArtworks(def).pieces;
    return def.placements.map((placement, k): Target => {
      const box = new Box3();
      for (const piece of pieces[k] ?? []) {
        piece.geometry.computeBoundingBox();
        box.union((piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix));
      }
      const centre = box.getCenter(new Vector3());
      const eye = new Vector3();
      const near = new Vector3();
      return {
        group: 'artwork',
        name: `${def.space}: ${String(placement.id)} (${entryOf(placement.id).title.slice(0, 40)})`,
        x: centre.x,
        z: centre.z,
        radius: LOOK_REACH.artwork + Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2,
        level: placement.floor,
        met: (x, y, z) => {
          if (Math.abs(y - placement.floor) > FLOOR) return false;
          eye.set(x, y + EYE, z);
          box.clampPoint(eye, near);
          return eye.distanceTo(near) <= LOOK_REACH.artwork && clear(eye, near);
        },
      };
    });
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
  world = new CollisionWorld(new GeometryBvhs());
  world.build([...new Set([...collisionMeshes(timeline.steps, timeline.n).filter((m) => !open.has(m)), ...closed])]);
  const floorY = Math.min(0, timeline.bounds.min.y) - 0.5;
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
    stop: (_, x, y, z) => {
      for (const t of byCell.get(planKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) if (unmet.has(t) && t.met(x, y, z)) unmet.delete(t);
      return unmet.size === 0;
    },
  });
  ms = performance.now() - began;
}, 300_000);

/** An unmet target, with the nearest place the fill reached. */
function describeMiss(t: Target): string {
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
    expect(fill.count, `places reached in ${(ms / 1000).toFixed(1)} s`).toBeGreaterThan(10_000);
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
