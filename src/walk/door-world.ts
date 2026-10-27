/**
 * The walk's collision with the doors (docs/design/spec.md, Doors: Walking): the static world (./collision.ts, built once per build, with every door's
 * leaves left out) and, for each door, a small world of its leaves' parts (a leaf's metal or panels, and its glass), posed where the door layer
 * (src/viewer/doors.ts) turns them about their hinges, a locked door's closed.
 * Each door's swing moves on in the walker's own fixed steps, before the body moves (`advance`). The way from where a door stands to where the step takes it
 * is tried against the body in poses no point of a leaf moves more than MARGIN apart along its arc: a door whose leaves would come inside the body holds
 * where it stands and waits, opening and closing alike, and its swing starts again from rest once the way is clear. A leaf turning away from a walker who
 * touches it goes on, so a walker pushing on a leaf that opens away follows it.
 * A leaf is a wall: never ground (`groundBelow`), and no part of the check of the walker after a build (`crossings`, src/walk/walker.ts `settle`), so the
 * walker is never lifted onto a door's top edge. Instead, after each such check, a door whose leaves meet the walker takes at once the first pose clear of
 * it of: open away from it, open toward it, closed (`release`); with none clear it opens away, and the walker is pushed out level (walker.ts `standClear`).
 * Bound: the body is the walker's whole capsule, feet to head; the leaves' matrices are rigid. Every pose a door takes, and so every pose drawn, keeps its
 * leaves out of the body; between two poses tried, at most MARGIN of travel of its parts' box corners apart (which bounds every point of the parts), a leaf
 * may pass at most MARGIN inside it. A door is held for its own leaves only, so one door never holds another.
 */
import { Box3, Line3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh } from 'three';

import type { BuiltStep } from '../build/timeline.js';
import type { GeometryBvhs } from './bvh-cache.js';
import { CollisionWorld, collisionMeshes } from './collision.js';
import type { GroundHit, LineCrossings } from './collision.js';
import { BODY } from './walker.js';
import type { WalkWorld } from './walker.js';

/** How far apart along their arcs a swing's poses are tried, metres. */
export const MARGIN = 0.01;
/** How far a leaf must stand inside the body for `release` to move its door: less is a walker leaning on it, metres. */
const INSIDE = 0.01;
/** An arc is at most this times its chord for a turn up to 180°, so a pose every MARGIN / ARC of chord is one every MARGIN of arc. */
const ARC = Math.PI / 2;

/** What the walk needs of the page's doors: src/viewer/doors.ts `DoorLayer` has it all. */
export interface MovingDoors {
  /** The timeline meshes of every door's leaves, the locked doors' too: the static world leaves them out, and the door world holds them. */
  readonly leafMeshes: ReadonlySet<InstancedMesh>;
  /** Each part of every door's leaves (a leaf's metal or panels and its glass; a locked door's closed pieces): its door's id and geometry, in a fixed order. */
  readonly parts: readonly { readonly door: string; readonly geometry: BufferGeometry }[];
  /** Part k's world matrix with its door `angle` radians open (positive toward its back), into `out`; a locked door's part stays where it is. */
  partMatrix(k: number, angle: number, out: Matrix4): Matrix4;
  /** Door `id`'s angle now, radians (0 for a locked door), or null while its step is incomplete and it is no part of the world. */
  angleOf(id: string): number | null;
  /** The angles door `id` rests at open, the one away from `from` (world metres) first: one for a door that opens one way, two for either, none for a locked door. */
  openAngles(id: string, from: Vector3): readonly number[];
  /** Moves the built doors' swings on by `seconds`; a door for which `clear(id, from, to)` is false holds where it stands and waits. */
  advance(seconds: number, clear: (id: string, from: number, to: number) => boolean): void;
  /** Puts door `id` at `angle` radians at once, still. */
  set(id: string, angle: number): void;
}

/**
 * The walk's world over `steps` at `t` as walk mode builds it (src/walk/walk-mode.ts): the static world of the steps complete at `t` without the moving
 * doors' closed leaves, and those doors where `doors` stands them now. For tests and tools that walk the model as the page does.
 */
export function walkWorld(steps: readonly BuiltStep[], t: number, doors: MovingDoors | null, cache: GeometryBvhs): DoorWorld {
  const walls = new CollisionWorld(cache);
  walls.build(collisionMeshes(steps, t, doors?.leafMeshes));
  const world = new DoorWorld(walls, doors, cache);
  world.refresh();
  return world;
}

interface DoorBody {
  readonly id: string;
  /** Its parts' indices in `MovingDoors.parts`; piece i of its world is part `parts[i]`. */
  readonly parts: readonly number[];
  readonly world: CollisionWorld;
  /** Each part's box corners, in its own frame. */
  readonly corners: readonly (readonly Vector3[])[];
  /** The angle its world stands at, or null while it is out of it. */
  posed: number | null;
}

export class DoorWorld implements WalkWorld {
  private readonly bodies: DoorBody[] = [];
  private readonly byId = new Map<string, DoorBody>();
  private readonly push = new Vector3();
  private readonly body = new Line3();
  private readonly matrix = new Matrix4();
  private readonly other = new Matrix4();
  private readonly a = new Vector3();
  private readonly b = new Vector3();

  constructor(
    /** The static world: every complete step's solid pieces but the doors' leaves (`leafMeshes`). */
    readonly walls: CollisionWorld,
    private readonly doors: MovingDoors | null,
    cache: GeometryBvhs,
  ) {
    const parts = doors?.parts ?? [];
    const ids = [...new Set(parts.map((p) => p.door))];
    for (const id of ids) {
      const mine = parts.flatMap((p, k) => (p.door === id ? [k] : []));
      const world = new CollisionWorld(cache);
      const geometries = mine.map((k) => parts[k]?.geometry).filter((g): g is BufferGeometry => g !== undefined);
      world.buildPieces(geometries);
      const corners = geometries.map((g) => {
        const box = g.boundingBox ?? new Box3();
        return [0, 1, 2, 3, 4, 5, 6, 7].map((c) => new Vector3((c & 1) !== 0 ? box.max.x : box.min.x, (c & 2) !== 0 ? box.max.y : box.min.y, (c & 4) !== 0 ? box.max.z : box.min.z));
      });
      const door: DoorBody = { id, parts: mine, world, corners, posed: null };
      this.bodies.push(door);
      this.byId.set(id, door);
    }
  }

  /** The timeline meshes the static world leaves out: every door's leaves (`collisionMeshes`). */
  get leafMeshes(): ReadonlySet<InstancedMesh> | undefined {
    return this.doors?.leafMeshes;
  }

  resolveCapsule(segment: Line3, radius: number, horizontal: boolean, out: Vector3): Vector3 {
    this.walls.resolveCapsule(segment, radius, horizontal, out);
    for (const door of this.bodies) if (door.posed !== null) out.add(door.world.resolveCapsule(segment, radius, horizontal, this.push));
    return out;
  }

  /** The static world's: a door's leaf is never ground. */
  groundBelow(x: number, y: number, z: number, length: number, hit: GroundHit): boolean {
    return this.walls.groundBelow(x, y, z, length, hit);
  }

  /** The static world's: a door's leaf is no part of the check after a build, which `release` makes for the doors. */
  crossings(x: number, z: number, bottom: number, top: number): readonly LineCrossings[] {
    return this.walls.crossings(x, z, bottom, top);
  }

  /** Poses each door's world where the door layer stands the door now, or takes it out while its step is incomplete. */
  refresh(): void {
    for (const door of this.bodies) this.pose(door, this.doors?.angleOf(door.id) ?? null);
  }

  /** One fixed step: each door's swing moves on by `seconds` where it stays clear of the body at `feet`, and waits where it would meet it. */
  advance(seconds: number, feet: Vector3): void {
    const doors = this.doors;
    if (doors === null) return;
    this.refresh();
    this.bodyAt(feet);
    doors.advance(seconds, (id, from, to) => this.swingClear(id, from, to));
  }

  /**
   * After the walker's place was checked (src/walk/walk-mode.ts): each door whose leaves stand more than INSIDE into the body at `feet` goes at once to
   * the first pose clear of it of open away from it, open toward it and closed, or with none clear opens away. Returns whether the body still meets a
   * leaf, which the caller then pushes it out of.
   */
  release(feet: Vector3): boolean {
    const doors = this.doors;
    if (doors === null) return false;
    this.refresh();
    this.bodyAt(feet);
    let stuck = false;
    for (const door of this.bodies) {
      if (door.posed === null || !door.world.meets(this.body, BODY.radius - INSIDE)) continue;
      const open = doors.openAngles(door.id, feet);
      const clear = [...open, 0].find((angle) => {
        this.pose(door, angle);
        return !door.world.meets(this.body, BODY.radius);
      });
      const angle = clear ?? open[0] ?? 0;
      this.pose(door, angle);
      doors.set(door.id, angle);
      if (clear === undefined) stuck = true;
    }
    return stuck;
  }

  /** Whether door `id`'s leaves, turned from `from` to `to` radians, stay clear of the body; its world stands at `to` if so, else at `from`. */
  private swingClear(id: string, from: number, to: number): boolean {
    const door = this.byId.get(id);
    if (door === undefined) return true;
    const poses = Math.max(1, Math.ceil((ARC * this.travel(door, from, to)) / MARGIN));
    for (let i = 1; i <= poses; i += 1) {
      this.pose(door, from + ((to - from) * i) / poses);
      if (door.world.meets(this.body, BODY.radius)) {
        this.pose(door, from);
        return false;
      }
    }
    return true;
  }

  /** The farthest any corner of the door's parts' boxes lies between its poses at `from` and `to`, metres: the chord of its arc. */
  private travel(door: DoorBody, from: number, to: number): number {
    const doors = this.doors;
    if (doors === null) return 0;
    let most = 0;
    door.parts.forEach((k, i) => {
      doors.partMatrix(k, from, this.matrix);
      doors.partMatrix(k, to, this.other);
      for (const c of door.corners[i] ?? []) most = Math.max(most, this.a.copy(c).applyMatrix4(this.matrix).distanceTo(this.b.copy(c).applyMatrix4(this.other)));
    });
    return most;
  }

  private pose(door: DoorBody, angle: number | null): void {
    if (angle === door.posed) return;
    const doors = this.doors;
    door.parts.forEach((k, i) => {
      door.world.move(i, angle === null || doors === null ? null : doors.partMatrix(k, angle, this.matrix));
    });
    door.posed = angle;
  }

  /** The body at `feet`: the walker's whole capsule, from its feet to its head. */
  private bodyAt(feet: Vector3): void {
    this.body.start.set(feet.x, feet.y + BODY.radius, feet.z);
    this.body.end.set(feet.x, feet.y + BODY.height - BODY.radius, feet.z);
  }
}
