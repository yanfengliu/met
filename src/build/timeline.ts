/**
 * The timeline (docs/design/spec.md, Build-step API): every step of the sequence, in the order the building grew, built once into instanced meshes that
 * hold each piece at its final matrix. Nothing it builds changes afterwards: every mesh shows all its pieces, and every step light shines at its own
 * intensity. Piece tags (`Kit.addTagged`) are kept per instance slot for `tagOf`.
 */
import { Box3, Group, Matrix4, SpotLight } from 'three';
import type { InstancedMesh, Material, PointLight } from 'three';

import { batchPieces, setCullBounds } from './batch.js';
import { collectStep } from './kit.js';
import type { PieceTag, StepDef } from './types.js';

/** docs/design/spec.md, Kit: at most 8 step lights in the whole sequence. */
export const MAX_LIGHTS = 8;

export interface BuiltStep {
  readonly def: StepDef;
  readonly index: number;
  /** Holds this step's meshes and lights. */
  readonly group: Group;
  readonly meshes: readonly InstancedMesh[];
  readonly lights: readonly (PointLight | SpotLight)[];
  /** World bounds of this step's pieces at their final matrices. */
  readonly bounds: Box3;
  readonly pieceCount: number;
  /** Per mesh, each instance slot's tag (`Kit.addTagged`, null where untagged), or null for a mesh with no tagged piece. */
  readonly tags: readonly (readonly (PieceTag | null)[] | null)[];
}

/** One piece of a step where it stands (`Timeline.restingPieces`). */
export interface RestingPiece {
  /** Its mesh: an index into the step's `meshes`. */
  readonly mesh: number;
  /** Its world bounding box at its final matrix. */
  readonly box: Box3;
  /** Its final world matrix, 16 numbers in column-major order (a copy). */
  readonly matrix: Float64Array;
}

export interface TimelineStats {
  readonly steps: number;
  readonly pieces: number;
  readonly meshes: number;
  /** Triangles drawn per frame, counting every instance. */
  readonly triangles: number;
  readonly lights: number;
}

/** Each step's pieces as `kit.add` gave them: their mesh and their final matrices, in the order they were added. */
interface Placed {
  readonly mesh: Int32Array;
  readonly finals: Float64Array;
}

export class Timeline {
  readonly root = new Group();
  readonly steps: readonly BuiltStep[];
  /** Union of every step's bounds. */
  readonly bounds = new Box3();
  /** Union of the bounds of shadow-casting meshes: what the sun's shadow camera must cover. */
  readonly casterBounds = new Box3();
  /** Every material any piece uses: the viewer gives each the section-cut plane. */
  readonly materials: ReadonlySet<Material>;
  private readonly placed: Placed[] = [];
  /** The tags of every mesh with a tagged piece, by mesh (`tagOf`). */
  private readonly tagged = new Map<InstancedMesh, readonly (PieceTag | null)[]>();

  constructor(defs: readonly StepDef[]) {
    this.root.name = 'model';
    const materials = new Set<Material>();
    const steps: BuiltStep[] = [];
    let lightTotal = 0;
    defs.forEach((def, index) => {
      const built = this.buildStep(def, index, materials);
      lightTotal += built.lights.length;
      steps.push(built);
      this.root.add(built.group);
      this.bounds.union(built.bounds);
    });
    if (lightTotal > MAX_LIGHTS) {
      const owners = steps.filter((s) => s.lights.length > 0).map((s) => `${s.def.id} (${String(s.lights.length)})`);
      throw new Error(`The sequence adds ${String(lightTotal)} step lights, more than the ${String(MAX_LIGHTS)} allowed (docs/design/spec.md, Kit): ${owners.join(', ')}; remove ${String(lightTotal - MAX_LIGHTS)}.`);
    }
    this.steps = steps;
    this.materials = materials;
  }

  /**
   * The tag `kit.addTagged` gave the piece in slot `instance` of `mesh` (docs/design/spec.md, Build-step API: Piece tags), or null for an untagged
   * piece, a slot past the mesh or a mesh this timeline did not build.
   */
  tagOf(mesh: InstancedMesh, instance: number): PieceTag | null {
    return this.tagged.get(mesh)?.[instance] ?? null;
  }

  stats(): TimelineStats {
    let triangles = 0;
    let meshes = 0;
    let pieces = 0;
    let lights = 0;
    for (const step of this.steps) {
      pieces += step.pieceCount;
      lights += step.lights.length;
      for (const mesh of step.meshes) {
        meshes += 1;
        const geometry = mesh.geometry;
        const vertices = geometry.index !== null ? geometry.index.count : geometry.getAttribute('position').count;
        triangles += Math.floor(vertices / 3) * mesh.instanceMatrix.count;
      }
    }
    return { steps: this.steps.length, pieces, meshes, triangles, lights };
  }

  /**
   * Every piece of step `index` (0-based) where it stands: its mesh, its world box and its final matrix, in the order the step added them. It reads the
   * final matrices kept at construction, never the meshes', and writes nothing the scene shows.
   */
  restingPieces(index: number): RestingPiece[] {
    const step = this.steps[index];
    const placed = this.placed[index];
    if (step === undefined || placed === undefined) throw new Error(`Timeline.restingPieces: there is no step ${String(index)}; steps run from 0 to ${String(this.steps.length - 1)}.`);
    const matrix = new Matrix4();
    return Array.from(placed.mesh, (m, j) => {
      const geometry = step.meshes[m]?.geometry;
      if (geometry === undefined) throw new Error(`Timeline.restingPieces: step "${step.def.id}" piece ${String(j)} names mesh ${String(m)} of ${String(step.meshes.length)}.`);
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      const elements = placed.finals.slice(j * 16, j * 16 + 16);
      return { mesh: m, box: (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix.fromArray(elements)), matrix: elements };
    });
  }

  private buildStep(def: StepDef, index: number, materials: Set<Material>): BuiltStep {
    const { pieces, lights } = collectStep(def);
    const boxes = pieces.map((piece, i) => {
      const geometry = piece.geometry;
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      const box = (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
      if (![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)) {
        throw new Error(`Step "${def.id}": piece ${String(i)} has a non-finite or empty world bounding box; its geometry needs finite positions.`);
      }
      return box;
    });
    const bounds = new Box3();
    for (const box of boxes) bounds.union(box);

    const { meshes, meshOf, slotOf } = batchPieces(def.id, pieces);
    const count = pieces.length;
    const mesh = new Int32Array(count);
    const finals = new Float64Array(count * 16);
    const meshBoxes = meshes.map(() => new Box3());
    const tags = meshes.map((): (PieceTag | null)[] | null => null);
    pieces.forEach((piece, j) => {
      const m = meshOf[j] ?? 0;
      const s = slotOf[j] ?? 0;
      mesh[j] = m;
      finals.set(piece.matrix.elements, j * 16);
      meshBoxes[m]?.union(boxes[j] ?? bounds);
      const target = meshes[m];
      if (target === undefined) return;
      target.instanceMatrix.array.set(piece.matrix.elements, s * 16);
      if (piece.tag !== null) (tags[m] ??= new Array<PieceTag | null>(target.instanceMatrix.count).fill(null))[s] = piece.tag;
    });
    tags.forEach((list, i) => {
      const m = meshes[i];
      if (list !== null && m !== undefined) this.tagged.set(m, list);
    });

    const group = new Group();
    group.name = def.id;
    for (const piece of pieces) materials.add(piece.material);
    meshes.forEach((m, i) => {
      setCullBounds(m, meshBoxes[i] ?? bounds);
      if (m.castShadow) this.casterBounds.union(meshBoxes[i] ?? bounds);
      group.add(m);
    });
    for (const light of lights) {
      group.add(light);
      if (light instanceof SpotLight && light.target.parent === null) group.add(light.target);
    }
    this.placed.push({ mesh, finals });
    return { def, index, group, meshes, lights, bounds, pieceCount: count, tags };
  }
}
