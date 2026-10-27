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
 * of their leaves, and are for the page to register with the hit query, the zoom's pick (`tagOf`) and the cap pass. A swing takes SWING_SECONDS for a
 * full opening, eased, away from the walker; a door turned back mid-swing goes back from where it stands.
 * It never writes what the timeline owns (instance matrices, colours, counts, visibility of the timeline's meshes), only those meshes' layer masks and its
 * own stand-ins, so the scene the timeline gives at t is a pure function of t (src/viewer/doors.test.ts checks it against fresh timelines).
 * Bound: a door's pieces belong to one step; a door piece that is not a door unit's closed leaves fails at construction, naming the door and the step.
 */
import { Box3, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Sphere, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import { castsShadow } from '../build/batch.js';
import type { BuiltStep, RestingPiece } from '../build/timeline.js';
import type { PieceTag } from '../build/types.js';
import type { SwingingPart } from '../model/lib/window.js';

/** Seconds a door takes to swing from closed to fully open, or back. */
export const SWING_SECONDS = 0.7;

/** A door the layer knows: its id (the tag's) and whether it is locked (src/model/doors.ts). */
export interface DoorDef {
  readonly id: string;
  readonly locked: boolean;
}

/** The leaves a door's closed piece is made of, by its geometry (src/model/lib/window.ts `doorLeavesOf`). */
export type LeavesOf = (geometry: BufferGeometry) => readonly SwingingPart[] | undefined;

/** What the walking eye's prompt says for a door: how to open or close it, or that it is locked. */
export type DoorPrompt = 'E Open' | 'E Close' | 'Locked';

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

/** One door for `window.__met.doors` (src/viewer/facts.ts). */
export interface DoorFacts {
  readonly id: string;
  readonly state: DoorState;
  /** Degrees its leaves stand open: positive toward the door's back (−Z of its unit: into the building for an entrance), negative toward its front. */
  readonly angle: number;
  readonly locked: boolean;
  /**
   * Whether its step is complete, so the door can be used. While it is not, the timeline's closed leaf stands in its place, and `state` and `angle` are
   * what the door shows again when the step completes.
   */
  readonly built: boolean;
}

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
  /** The hinge in the unit's frame. */
  readonly pivot: Vector3;
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
  /** Signed radians open now (+ toward the back), and the swing under way: from, to, seconds into it and its length. */
  angle: number;
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

/** Smoothstep: eases in and out, 0 at 0 and 1 at 1. */
export function ease(p: number): number {
  const x = p <= 0 ? 0 : p >= 1 ? 1 : p;
  return x * x * (3 - 2 * x);
}

const scratch = new Matrix4();
const turn = new Matrix4();
const local = new Vector3();
const turned = new Vector3();

/** The turn of a leaf by `angle` radians about the hinge through `pivot` along the unit `axis`, in the leaf's unit frame: T(pivot) R T(−pivot). */
export function hingeTurn(pivot: Vector3, axis: Vector3, angle: number, out = new Matrix4()): Matrix4 {
  out.makeRotationAxis(axis, angle);
  turned.copy(pivot).applyMatrix4(out);
  return out.setPosition(pivot.x - turned.x, pivot.y - turned.y, pivot.z - turned.z);
}

export class DoorLayer {
  /** The stand-ins, for the scene. */
  readonly root = new Group();
  /** The stand-in meshes: the page registers them with the hit query, the zoom's pick and the cap pass. */
  readonly meshes: readonly InstancedMesh[];
  private readonly doors: Door[] = [];
  private readonly byId = new Map<string, Door>();
  private readonly standIns = new Map<InstancedMesh, StandIn>();

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
    for (const step of steps) {
      if (step.tags.every((t) => t === null)) continue;
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
          if (door.def.locked) return;
          const parts = leavesOf(mesh.geometry);
          const material = mesh.material;
          const matrix = matrices[m]?.[slot];
          if (parts === undefined || parts.length === 0 || Array.isArray(material) || matrix === undefined) {
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
          const leaf: Leaf = { door, base, pivot: new Vector3(...part.hinge.point), axis: new Vector3(...part.hinge.axis).normalize(), standIn };
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
  }

  /** The tag of the leaf drawn in slot `instance` of stand-in `mesh`, or null for a mesh not the layer's or an empty slot. */
  tagOf(mesh: InstancedMesh, instance: number): PieceTag | null {
    return this.standIns.get(mesh)?.drawn[instance]?.door.tag ?? null;
  }

  /**
   * Brings every door in line with the timeline at `t` and advances the swings under way by `seconds` (all at once when `instant`, as in capture mode).
   * Returns whether anything the layer draws or hides changed, so the page renders again and redraws the shadows.
   */
  sync(t: number, seconds: number, instant = false): boolean {
    let changed = false;
    for (const door of this.doors) {
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
      if (door.built && door.angle !== door.to) {
        door.elapsed += instant ? Number.POSITIVE_INFINITY : Math.max(0, seconds);
        const p = door.duration > 0 ? Math.min(1, door.elapsed / door.duration) : 1;
        door.angle = p >= 1 ? door.to : door.from + (door.to - door.from) * ease(p);
        changed = true;
      }
    }
    if (changed) this.draw();
    return changed;
  }

  /**
   * Opens door `id` away from `from` (the walker's eye, world metres), or closes it when it is open or opening. A door unknown, not yet built or locked
   * does nothing. Returns whether the door began to move.
   */
  use(id: string, from: Vector3 | null): boolean {
    const door = this.byId.get(id);
    if (door === undefined || !door.built || door.def.locked || door.leaves.length === 0) return false;
    this.swingTo(door, door.to !== 0 ? 0 : this.side(door, from) * door.open);
    return true;
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

  /** The door of `tag`, made on its first piece; a door with no definition or with pieces in two steps fails. */
  private door(tag: PieceTag, step: BuiltStep, known: ReadonlyMap<string, DoorDef>): Door {
    const found = this.byId.get(tag.id);
    if (found !== undefined) {
      if (found.step !== step.index) throw new Error(`Door "${tag.id}" has pieces in steps "${found.stepId}" and "${step.def.id}"; a door's pieces belong to one step, so they are built, used and reset together.`);
      return found;
    }
    const def = known.get(tag.id);
    if (def === undefined) throw new Error(`Door "${tag.id}" in step "${step.def.id}" is no door the layer knows; add it to src/model/doors.ts (known: ${[...known.keys()].join(', ')}).`);
    const door: Door = { def, tag, step: step.index, stepId: step.def.id, sources: [], masks: [], leaves: [], open: 0, direction: 'either', built: false, fresh: true, angle: 0, from: 0, to: 0, elapsed: 0, duration: 0 };
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
    // Bounds over every pose: a point turned about an axis through the pivot stays as far from the pivot as it was.
    const geometry = mesh.geometry;
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new Box3();
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => new Vector3((k & 1) !== 0 ? box.max.x : box.min.x, (k & 2) !== 0 ? box.max.y : box.min.y, (k & 4) !== 0 ? box.max.z : box.min.z));
    const all = new Box3();
    for (const leaf of standIn.leaves) {
      const reach = Math.max(...corners.map((c) => c.distanceTo(leaf.pivot)));
      all.union(new Sphere(leaf.pivot.clone(), reach).applyMatrix4(leaf.base).getBoundingBox(new Box3()));
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
    return local.z < leaf.pivot.z ? -1 : 1;
  }

  /** Writes the stand-ins: every built unlocked door's leaves at the base matrix times their turn, packed from slot 0. */
  private draw(): void {
    for (const standIn of this.standIns.values()) {
      const { mesh, drawn } = standIn;
      drawn.length = 0;
      for (const leaf of standIn.leaves) {
        if (!leaf.door.built) continue;
        scratch.copy(leaf.base).multiply(hingeTurn(leaf.pivot, leaf.axis, leaf.door.angle, turn));
        mesh.instanceMatrix.array.set(scratch.elements, drawn.length * 16);
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
