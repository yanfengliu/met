/**
 * The door layer (docs/design/spec.md, Doors): the page's doors open and close without the timeline seeing it. A door's closed leaves are the timeline's
 * own pieces, tagged with the door (`Kit.addTagged`, src/model/doors.ts), in meshes of their own (src/build/batch.ts). Once the door's step is complete
 * (f = 1) the layer hides those meshes by their layer mask, a presentation filter like the floor view's, and draws each leaf apart (src/model/lib/window.ts
 * `doorLeavesOf`) in a stand-in mesh of its own at the closed piece's final matrix times the leaf's turn about its hinge.
 * Lifecycle: the first time its step completes, and again after the step has been taken away, a door takes its default state (closed, or open with
 * `doors=open`, into the building when no walker opens it). Whenever the step is incomplete (f < 1) the timeline's closed leaf takes over at once and the
 * door cannot be used, but it keeps its state, which it shows again at once when the step completes; when the timeline takes the step away (f = 0) its
 * state resets. A locked door is never hidden and never opens, whatever is asked (`doors=` included).
 * The stand-ins share the timeline's geometry and materials (so the section cut clips them as it clips the closed leaves), hold bounds over every pose
 * of their leaves, and are for the page to register with the hit query, the zoom's pick (`tagOf`) and the cap pass; with them it registers each closed
 * door's doorway, a box over its leaves and the gaps round them that no camera draws (./doorways.ts, `pickMeshes`). A swing takes SWING_SECONDS for a
 * full opening, eased, away from the walker; a door turned back mid-swing goes back from where it stands. Each sync says what the page draws again:
 * the frame, and the shadows too only when a door that changed has a mesh that casts one.
 * Walking, the walk's collision (src/walk/door-world.ts) holds every door's leaves as solids where they stand (`parts`, `partMatrix`: a door that opens
 * where it turns them, a locked one closed; the timeline's leaves left out of its static world: `leafMeshes`), and moves the swings on in its own physics
 * steps (`advance`), each door holding where its leaves would meet the walker and waiting until the way is clear; it puts a door that a build leaves in
 * the walker clear of it at once (`set`).
 * It never writes what the timeline owns (instance matrices, colours, counts, visibility of the timeline's meshes), only those meshes' layer masks and its
 * own stand-ins, so the scene the timeline gives at t is a pure function of t (src/viewer/doors.test.ts checks it against fresh timelines).
 * Bound: a door's pieces belong to one step; a door piece that is not a door unit's closed leaves, or that the step's resting pieces leave out, fails at
 * construction, naming the door, the step and the piece.
 */
import { Box3, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import { castsShadow } from '../build/batch.js';
import type { BuiltStep, RestingPiece } from '../build/timeline.js';
import type { PieceTag } from '../build/types.js';
import type { SwingingPart } from '../model/lib/window.js';
import { SWING_SECONDS, ease, hingeTurn } from './door-swing.js';
import { Doorways } from './doorways.js';
import type { DoorChange, DoorDef, DoorDrawn, DoorFacts, DoorPrompt, DoorState, LeavesOf } from './door-swing.js';

export { SWING_SECONDS, ease, hingeTurn } from './door-swing.js';
export type { DoorChange, DoorDef, DoorDrawn, DoorFacts, DoorPrompt, DoorState, LeavesOf } from './door-swing.js';

interface StandIn {
  readonly mesh: InstancedMesh;
  /** Every leaf this mesh can draw, in a fixed order; the drawn ones are packed from slot 0 (`drawn`). */
  readonly leaves: Leaf[];
  readonly drawn: Leaf[];
}

interface Leaf {
  readonly door: Door;
  /** The closed piece's final world matrix: the door unit's. */
  readonly base: Matrix4;
  /** The hinge in the unit's frame: the points it turns about opening toward the back and toward the front, and the axis. */
  readonly back: Vector3;
  readonly front: Vector3;
  readonly axis: Vector3;
  readonly standIn: StandIn;
}

interface Door {
  readonly def: DoorDef;
  readonly tag: PieceTag;
  readonly step: number;
  readonly stepId: string;
  /** The timeline's meshes of its closed leaves, and the layer masks they had. */
  readonly sources: InstancedMesh[];
  readonly masks: number[];
  readonly leaves: Leaf[];
  /** How far it opens at most (its leaves' swing), radians, and which way it may open. */
  open: number;
  direction: SwingingPart['swing']['direction'];
  /** Whether its step is complete (f = 1), and whether it has its default state still to take (at first, and after the step was taken away). */
  built: boolean;
  fresh: boolean;
  /** Whether any of its meshes, the timeline's or its stand-ins, casts a shadow, so its changes redraw the shadows. */
  casts: boolean;
  /** Signed radians open now (+ toward the back), and the swing under way: from, to, seconds into it and its length. */
  angle: number;
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

const scratch = new Matrix4();
const turn = new Matrix4();
const leafTurn = new Matrix4();
const local = new Vector3();
const turned = new Vector3();
const X_AXIS = new Vector3(1, 0, 0);
const column = new Vector3();

export class DoorLayer {
  /** The stand-ins, for the scene. */
  readonly root = new Group();
  /** The stand-in meshes: the page registers them with the hit query, the zoom's pick and the cap pass. */
  readonly meshes: readonly InstancedMesh[];
  /** What the page registers with the hit query and the zoom's pick: the stand-ins and the closed doors' doorways (./doorways.ts), which no camera draws. */
  readonly pickMeshes: readonly InstancedMesh[];
  /** The timeline meshes of every door's leaves, the locked doors' too: the walk's static world leaves them out, its door world holds them (src/walk/door-world.ts). */
  readonly leafMeshes: ReadonlySet<InstancedMesh>;
  /** Each part of every door's leaves, for the walk's collision: a leaf's metal or panels and its glass for a door that opens, a locked door's closed pieces. */
  readonly parts: readonly { readonly door: string; readonly geometry: BufferGeometry }[];
  private readonly doors: Door[] = [];
  private readonly byId = new Map<string, Door>();
  private readonly standIns = new Map<InstancedMesh, StandIn>();
  private readonly doorways: Doorways;
  /** The parts, in order: a leaf the door turns, or a locked door's piece fixed at its final matrix. */
  private readonly collidable: readonly { readonly door: Door; readonly leaf: Leaf | null; readonly base: Matrix4 }[];
  /** What the walk's steps changed since `takeChange` was last called. */
  private pending: DoorChange = 'none';

  /**
   * `steps` are the timeline's, `resting(i)` step i's pieces at rest (Timeline.restingPieces), `defs` the doors there are, `leavesOf` the leaves of a
   * closed piece's geometry, and `start` the state a door takes when its step completes (`doors=`; a locked door stays closed).
   */
  constructor(
    steps: readonly BuiltStep[],
    resting: (index: number) => readonly RestingPiece[],
    defs: readonly DoorDef[],
    leavesOf: LeavesOf,
    private readonly start: 'open' | 'closed' = 'closed',
  ) {
    this.root.name = 'doors';
    this.root.matrixAutoUpdate = false;
    const known = new Map(defs.map((d) => [d.id, d]));
    // Every leaf to draw, grouped by its geometry and material: one stand-in mesh each.
    const groups = new Map<BufferGeometry, Map<Material, { door: Door; base: Matrix4; part: SwingingPart }[]>>();
    const fixed: { door: Door; geometry: BufferGeometry; base: Matrix4 }[] = [];
    /** Each door's closed pieces at their final matrices, for its doorway. */
    const closed = new Map<Door, { geometry: BufferGeometry; matrix: Matrix4 }[]>();
    for (const step of steps) {
      // Only a step holding a door's pieces: an artwork's tags need nothing of the layer.
      if (!step.tags.some((list) => list?.some((tag) => tag?.kind === 'door') === true)) continue;
      const matrices = slotMatrices(step, resting(step.index));
      step.tags.forEach((tags, m) => {
        const mesh = step.meshes[m];
        if (tags === null || mesh === undefined) return;
        tags.forEach((tag, slot) => {
          if (tag?.kind !== 'door') return;
          const door = this.door(tag, step, known);
          if (!door.sources.includes(mesh)) {
            door.sources.push(mesh);
            door.masks.push(mesh.layers.mask);
          }
          const matrix = matrices[m]?.[slot];
          // Left out, a locked door's piece would be no part of the walk's door world, and a walker would pass through it shut (review 17, F47).
          if (matrix === undefined) throw new Error(`Door "${tag.id}": its piece in step "${step.def.id}" (mesh ${mesh.name}, instance ${String(slot)}) is none of the step's resting pieces, so the layer has no matrix to ${door.def.locked ? 'hold it shut at in the walk' : 'turn it from'}; pass each step's pieces at rest (Timeline.restingPieces) as \`resting\`.`);
          closed.set(door, [...(closed.get(door) ?? []), { geometry: mesh.geometry, matrix: new Matrix4().fromArray(matrix) }]);
          if (door.def.locked) {
            fixed.push({ door, geometry: mesh.geometry, base: new Matrix4().fromArray(matrix) });
            return;
          }
          const parts = leavesOf(mesh.geometry);
          const material = mesh.material;
          if (parts === undefined || parts.length === 0 || Array.isArray(material)) {
            throw new Error(`Door "${tag.id}": its piece in step "${step.def.id}" (mesh ${mesh.name}) is not a door unit's closed leaves, so it cannot be turned; place DoorParts.leaf or leafGlass of src/model/lib/window.ts doorUnit as it is, with one material.`);
          }
          const base = new Matrix4().fromArray(matrix);
          for (const part of parts) {
            const byMaterial = groups.get(part.geometry) ?? new Map<Material, { door: Door; base: Matrix4; part: SwingingPart }[]>();
            groups.set(part.geometry, byMaterial);
            byMaterial.set(material, [...(byMaterial.get(material) ?? []), { door, base, part }]);
            door.open = Math.max(door.open, part.swing.angle);
            door.direction = part.swing.direction;
          }
        });
      });
    }
    const meshes: InstancedMesh[] = [];
    for (const [geometry, byMaterial] of groups) {
      for (const [material, list] of byMaterial) {
        const standIn: StandIn = { mesh: new InstancedMesh(geometry, material, list.length), leaves: [], drawn: [] };
        for (const { door, base, part } of list) {
          const leaf: Leaf = { door, base, back: new Vector3(...part.hinge.back), front: new Vector3(...part.hinge.front), axis: new Vector3(...part.hinge.axis).normalize(), standIn };
          standIn.leaves.push(leaf);
          door.leaves.push(leaf);
        }
        this.setUp(standIn, meshes.length);
        meshes.push(standIn.mesh);
        this.standIns.set(standIn.mesh, standIn);
        this.root.add(standIn.mesh);
      }
    }
    this.meshes = meshes;
    this.doorways = new Doorways(this.doors.map((d) => ({ tag: d.tag, pieces: closed.get(d) ?? [] })));
    this.pickMeshes = [...meshes, this.doorways.mesh];
    for (const door of this.doors) door.casts = door.sources.some((m) => m.castShadow) || door.leaves.some((l) => l.standIn.mesh.castShadow);
    this.leafMeshes = new Set(this.doors.flatMap((d) => d.sources));
    const turning = this.doors.flatMap((d) => d.leaves.map((leaf) => ({ door: d, leaf, base: leaf.base, geometry: leaf.standIn.mesh.geometry })));
    const parts = [...turning, ...fixed.map((f) => ({ ...f, leaf: null }))];
    this.collidable = parts.map(({ door, leaf, base }) => ({ door, leaf, base }));
    this.parts = parts.map(({ door, geometry }) => Object.freeze({ door: door.def.id, geometry }));
  }

  /** The tag of the leaf drawn in slot `instance` of stand-in `mesh`, or of the doorway there (`pickMeshes`); null for a mesh not the layer's or an empty slot. */
  tagOf(mesh: InstancedMesh, instance: number): PieceTag | null {
    if (mesh === this.doorways.mesh) return this.doorways.tagOf(instance);
    return this.standIns.get(mesh)?.drawn[instance]?.door.tag ?? null;
  }

  /**
   * Brings every door in line with the timeline at `t` and advances the swings under way by `seconds` (all at once when `instant`, as in capture mode).
   * Returns what the page must draw again: nothing, the frame (`moved`), or the frame and the shadows (`shadows`), when a door that changed has a mesh
   * that casts a shadow.
   */
  sync(t: number, seconds: number, instant = false): DoorChange {
    let moved = false;
    let shadows = false;
    for (const door of this.doors) {
      let changed = false;
      const f = t - door.step;
      // Taken away: back to its default state when the step completes again.
      if (f <= 0 && !door.fresh) {
        this.reset(door);
        door.fresh = true;
        changed = true;
      }
      const built = f >= 1;
      if (built !== door.built) {
        door.built = built;
        changed = true;
        if (!door.def.locked) door.sources.forEach((mesh, i) => { mesh.layers.mask = built ? 0 : (door.masks[i] ?? 1); });
        // Incomplete: the timeline's closed leaf takes over at once, and the door keeps the state its swing was heading for.
        if (!built) this.settle(door);
        else if (door.fresh) {
          door.fresh = false;
          if (this.start === 'open' && !door.def.locked) this.swingTo(door, this.side(door, null) * door.open);
        }
      }
      if (door.built && door.angle !== door.to && (instant || seconds > 0)) {
        door.elapsed += instant ? Number.POSITIVE_INFINITY : Math.max(0, seconds);
        door.angle = this.swungTo(door, door.elapsed);
        changed = true;
      }
      moved ||= changed;
      shadows ||= changed && door.casts;
    }
    if (moved) this.draw();
    return shadows ? 'shadows' : moved ? 'moved' : 'none';
  }

  /**
   * Opens door `id` away from `from` (the walker's eye, world metres) from closed, or closes it when it is open or opening. A closing door, held by the
   * walker or not, turns back open on the side it stands on, away from what it was closing on: chosen from `from`, a door held between its leaves would
   * turn on through the walker (work unit 2, review 15, F43). A door unknown, not yet built or locked does nothing. Returns whether the door began to move.
   */
  use(id: string, from: Vector3 | null): boolean {
    const door = this.byId.get(id);
    if (door === undefined || !door.built || door.def.locked || door.leaves.length === 0) return false;
    const open = door.angle !== 0 ? Math.sign(door.angle) * door.open : this.side(door, from) * door.open;
    this.swingTo(door, door.to !== 0 ? 0 : open);
    return true;
  }

  /** Part k of `parts`: its world matrix with its door `angle` radians open (positive toward its back), into `out`, as the stand-ins draw it; a locked door's stays put. */
  partMatrix(k: number, angle: number, out: Matrix4): Matrix4 {
    const part = this.collidable[k];
    if (part === undefined) throw new Error(`DoorLayer.partMatrix: part ${String(k)} is none of the ${String(this.collidable.length)} parts of the doors; use an index into DoorLayer.parts.`);
    return part.leaf === null ? out.copy(part.base) : leafMatrix(part.leaf, angle, out);
  }

  /** Door `id`'s angle now, radians (0 for a locked door), or null while it is unknown or its step incomplete (it is then no part of the walk's door world). */
  angleOf(id: string): number | null {
    const door = this.byId.get(id);
    return door?.built === true ? door.angle : null;
  }

  /** The angles door `id` rests at open, the one away from `from` (world metres) first, as E would open it: one for a door that opens one way, two for either. */
  openAngles(id: string, from: Vector3): readonly number[] {
    const door = this.byId.get(id);
    if (door === undefined || door.def.locked || door.open === 0) return [];
    const away = this.side(door, from) * door.open;
    return door.direction === 'either' ? [away, -away] : [away];
  }

  /**
   * One physics step of the walk (src/walk/door-world.ts): every built door's swing moves on by `seconds` as `sync` moves it, but a door for which
   * `clear(id, from, to)` is false, its leaves meeting the walker on the way from `from` to `to` radians, holds where it stands and waits, its swing
   * starting again from rest there, so once the way is clear it eases off again toward where it was going. What it changed waits for `takeChange`.
   */
  advance(seconds: number, clear: (id: string, from: number, to: number) => boolean): void {
    let moved = false;
    for (const door of this.doors) {
      if (!door.built || door.angle === door.to) continue;
      const next = this.swungTo(door, door.elapsed + Math.max(0, seconds));
      if (clear(door.def.id, door.angle, next)) {
        door.elapsed += Math.max(0, seconds);
        door.angle = next;
        moved = true;
        this.note(door);
      } else {
        this.swingTo(door, door.to);
      }
    }
    if (moved) this.draw();
  }

  /** Puts built, unlocked door `id` at `angle` radians at once, still (src/walk/door-world.ts `release`). What it changed waits for `takeChange`. */
  set(id: string, angle: number): void {
    const door = this.byId.get(id);
    if (door === undefined || door.def.locked || !door.built || door.leaves.length === 0) return;
    this.settleAt(door, angle);
    this.note(door);
    this.draw();
  }

  /** What `advance` and `set` changed since the last call, for the page to draw again: nothing, the frame, or the frame and the shadows. */
  takeChange(): DoorChange {
    const change = this.pending;
    this.pending = 'none';
    return change;
  }

  /** What the prompt under the crosshair says for door `id`: null while it is unknown or its step incomplete. */
  prompt(id: string): DoorPrompt | null {
    const door = this.byId.get(id);
    if (door?.built !== true) return null;
    if (door.def.locked) return 'Locked';
    return door.to !== 0 ? 'E Close' : 'E Open';
  }

  /** Every door of the timeline: its id, state, angle in degrees, locked flag and whether it is built. */
  facts(): DoorFacts[] {
    return this.doors.map((door) => ({ id: door.def.id, state: stateOf(door), angle: (door.angle * 180) / Math.PI, locked: door.def.locked, built: door.built }));
  }

  /**
   * Every door as the meshes draw it now, read from them rather than from the doors' state: the angle its first leaf's stand-in matrix holds about the
   * leaf's hinge axis, or null while the timeline's closed leaves are on a drawn layer. Read right after a render, it is what that render drew.
   */
  drawn(): DoorDrawn[] {
    return this.doors.map((door) => {
      const leaf = door.leaves[0];
      if (leaf === undefined || door.sources.some((mesh) => mesh.layers.mask !== 0)) return { id: door.def.id, angle: null };
      const { mesh, drawn } = leaf.standIn;
      const slot = drawn.indexOf(leaf);
      if (!mesh.visible || slot < 0 || slot >= mesh.count) return { id: door.def.id, angle: Number.NaN };
      // The leaf's turn is the base's inverse times the drawn matrix; its angle about the axis, from where it takes the leaf's X axis.
      turn.copy(leaf.base).invert().multiply(scratch.fromArray(mesh.instanceMatrix.array, slot * 16));
      column.setFromMatrixColumn(turn, 0);
      const sin = leaf.axis.dot(turned.copy(X_AXIS).cross(column));
      return { id: door.def.id, angle: (Math.atan2(sin, column.x) * 180) / Math.PI };
    });
  }

  /** The door of `tag`, made on its first piece; a door with no definition or with pieces in two steps fails. */
  private door(tag: PieceTag, step: BuiltStep, known: ReadonlyMap<string, DoorDef>): Door {
    const found = this.byId.get(tag.id);
    if (found !== undefined) {
      if (found.step !== step.index) throw new Error(`Door "${tag.id}" has pieces in steps "${found.stepId}" and "${step.def.id}"; a door's pieces belong to one step, so they are built, used and reset together.`);
      return found;
    }
    const def = known.get(tag.id);
    if (def === undefined) throw new Error(`Door "${tag.id}" in step "${step.def.id}" is no door the layer knows; add it to src/model/doors.ts (known: ${[...known.keys()].join(', ')}).`);
    const door: Door = { def, tag, step: step.index, stepId: step.def.id, sources: [], masks: [], leaves: [], open: 0, direction: 'either', built: false, fresh: true, casts: false, angle: 0, from: 0, to: 0, elapsed: 0, duration: 0 };
    this.doors.push(door);
    this.byId.set(tag.id, door);
    return door;
  }

  private setUp(standIn: StandIn, index: number): void {
    const { mesh } = standIn;
    const material = mesh.material;
    mesh.name = `door-standin#${String(index)}`;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.castShadow = !Array.isArray(material) && castsShadow(material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.count = 0;
    mesh.visible = false;
    // Bounds over every pose: a point turned about an axis through a pivot stays as far from that pivot as it was, whichever way the leaf opens.
    const geometry = mesh.geometry;
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => new Vector3((k & 1) !== 0 ? box.max.x : box.min.x, (k & 2) !== 0 ? box.max.y : box.min.y, (k & 4) !== 0 ? box.max.z : box.min.z));
    const all = new Box3();
    for (const leaf of standIn.leaves) {
      for (const pivot of [leaf.back, leaf.front]) {
        const reach = Math.max(...corners.map((c) => c.distanceTo(pivot)));
        all.union(new Sphere(pivot.clone(), reach).applyMatrix4(leaf.base).getBoundingBox(new Box3()));
      }
    }
    mesh.boundingBox = all;
    mesh.boundingSphere = all.getBoundingSphere(new Sphere());
  }

  /** Back to closed and still, as the timeline's closed leaf. */
  private reset(door: Door): void {
    this.settleAt(door, 0);
  }

  /** At the end of the swing under way, still. */
  private settle(door: Door): void {
    this.settleAt(door, door.to);
  }

  private settleAt(door: Door, angle: number): void {
    door.angle = angle;
    door.from = angle;
    door.to = angle;
    door.elapsed = 0;
    door.duration = 0;
  }

  /** Where the swing under way stands `elapsed` seconds into it. */
  private swungTo(door: Door, elapsed: number): number {
    const p = door.duration > 0 ? Math.min(1, elapsed / door.duration) : 1;
    return p >= 1 ? door.to : door.from + (door.to - door.from) * ease(p);
  }

  /** Records that `door` moved, for `takeChange`. */
  private note(door: Door): void {
    this.pending = door.casts || this.pending === 'shadows' ? 'shadows' : 'moved';
  }

  /** Starts a swing from where the door stands to `target` radians, taking SWING_SECONDS for a full opening. */
  private swingTo(door: Door, target: number): void {
    door.from = door.angle;
    door.to = target;
    door.elapsed = 0;
    door.duration = door.open > 0 ? (SWING_SECONDS * Math.abs(target - door.angle)) / door.open : 0;
  }

  /** +1 to open toward the door's back, −1 toward its front: as its swing allows, else away from `from`, else toward the back. */
  private side(door: Door, from: Vector3 | null): 1 | -1 {
    if (door.direction === 'back') return 1;
    if (door.direction === 'front') return -1;
    const leaf = door.leaves[0];
    if (from === null || leaf === undefined) return 1;
    local.copy(from).applyMatrix4(scratch.copy(leaf.base).invert());
    // The leaf's mid-plane lies between its two faces' pivots.
    return local.z < (leaf.back.z + leaf.front.z) / 2 ? -1 : 1;
  }

  /** Writes the stand-ins (every built unlocked door's leaves at the base matrix times their turn, packed from slot 0) and stands the closed doors' doorways. */
  private draw(): void {
    this.doorways.update((k) => this.doors[k]?.built === true && this.doors[k].angle === 0);
    for (const standIn of this.standIns.values()) {
      const { mesh, drawn } = standIn;
      drawn.length = 0;
      for (const leaf of standIn.leaves) {
        if (!leaf.door.built) continue;
        mesh.instanceMatrix.array.set(leafMatrix(leaf, leaf.door.angle, scratch).elements, drawn.length * 16);
        drawn.push(leaf);
      }
      mesh.count = drawn.length;
      mesh.visible = drawn.length > 0;
      mesh.instanceMatrix.clearUpdateRanges();
      if (drawn.length > 0) mesh.instanceMatrix.addUpdateRange(0, drawn.length * 16);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/** A leaf's world matrix with its door `angle` radians open: opening toward the back it turns about its back face's edge, toward the front about its front face's. */
function leafMatrix(leaf: Leaf, angle: number, out: Matrix4): Matrix4 {
  return out.copy(leaf.base).multiply(hingeTurn(angle < 0 ? leaf.front : leaf.back, leaf.axis, angle, leafTurn));
}

function stateOf(door: Door): DoorState {
  if (!door.built || door.angle === door.to) return door.angle === 0 ? 'closed' : 'open';
  return Math.abs(door.to) > Math.abs(door.angle) ? 'opening' : 'closing';
}

/** Per mesh of `step`, each slot's final matrix (16 numbers), from its resting pieces in arrival order, whose order within a mesh is its slot order. */
function slotMatrices(step: BuiltStep, pieces: readonly RestingPiece[]): Float64Array[][] {
  const out: Float64Array[][] = step.meshes.map(() => []);
  for (const piece of pieces) out[piece.mesh]?.push(piece.matrix);
  return out;
}
