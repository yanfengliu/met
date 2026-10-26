/**
 * The timeline (docs/design/spec.md, Timeline position and Determinism): builds every step once, then shows the scene at any `t` in [0, N].
 *
 * State at `t` is a pure function of `t`. Per instance slot: a piece at rest or hidden holds its final matrix and white; a moving piece holds
 * its motion matrix and tint at its own progress. `mesh.count` is the number of pieces that have started (slots are in arrival order).
 * Caching: a step whose local progress did not change is skipped, and within a step only the pieces moving before or after are rewritten.
 * Per evaluation the cost is O(steps) plus the pieces in motion plus a binary search per mesh of each changed step.
 * Piece tags (`Kit.addTagged`) are kept per instance slot for `tagOf`; they are fixed when the step is built and are not state at `t`.
 *
 * Bound: determinism holds for everything this class writes (instance matrices, colours, counts, mesh visibility, light intensities);
 * it says nothing about GPU upload timing, which three.js does from the update ranges recorded here.
 */
import { Box3, Group, Matrix4, SpotLight, Vector3 } from 'three';
import type { InstancedMesh, Material, PointLight } from 'three';

import { batchPieces, boxOf, setCullBounds } from './batch.js';
import { collectStep } from './kit.js';
import { lightRamp, startBox, writeMotionParams, writeMovingMatrix, writeTint } from './motion.js';
import type { PieceBox } from './motion.js';
import { staggerKeys, windowsFromKeys } from './stagger.js';
import type { Motion, PieceTag, StepDef } from './types.js';

/** docs/design/spec.md, Kit: at most 8 step lights in the whole sequence. */
export const MAX_LIGHTS = 8;

export interface BuiltStep {
  readonly def: StepDef;
  readonly index: number;
  /** Holds this step's meshes and lights; always visible (meshes hide themselves), so the scene's light count never changes. */
  readonly group: Group;
  readonly meshes: readonly InstancedMesh[];
  readonly lights: readonly (PointLight | SpotLight)[];
  /** World bounds of this step's pieces at their final matrices. */
  readonly bounds: Box3;
  readonly pieceCount: number;
  /** Per mesh, each instance slot's tag (`Kit.addTagged`, null where untagged), or null for a mesh with no tagged piece. Not timeline state: it never changes with t. */
  readonly tags: readonly (readonly (PieceTag | null)[] | null)[];
}

/** One piece of a step as it stands once the step is complete (`Timeline.restingPieces`). */
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
  /** Triangles drawn per frame at `t = N`, counting every instance. */
  readonly triangles: number;
  readonly lights: number;
}

interface StepState {
  f: number;
  readonly kind: Motion['kind'];
  /** Everything below is in arrival order. */
  readonly start: Float64Array;
  readonly end: Float64Array;
  readonly mesh: Int32Array;
  readonly slot: Int32Array;
  readonly finals: Float64Array;
  readonly params: Float64Array;
  /** Per mesh, the window starts of its slots (non-decreasing). */
  readonly meshStarts: readonly Float64Array[];
  readonly baseIntensity: readonly number[];
}

/** First index in non-decreasing `values` whose value is above `x` (`strict`) or at least `x`. */
function search(values: Float64Array, x: number, strict: boolean): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const v = values[mid] ?? 0;
    if (strict ? v <= x : v < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function clamp01(x: number): number {
  return x <= 0 ? 0 : x >= 1 ? 1 : x;
}

function pieceBox(box: Box3): PieceBox {
  return { minX: box.min.x, minY: box.min.y, minZ: box.min.z, maxX: box.max.x, maxY: box.max.y, maxZ: box.max.z };
}

export class Timeline {
  readonly root = new Group();
  readonly steps: readonly BuiltStep[];
  readonly n: number;
  /** Union of every step's bounds. */
  readonly bounds = new Box3();
  /** Union of the bounds of shadow-casting meshes: what the sun's shadow camera must cover. */
  readonly casterBounds = new Box3();
  /** Every material any piece uses: the viewer gives each the section-cut plane. */
  readonly materials: ReadonlySet<Material>;
  private readonly states: StepState[] = [];
  /** The tags of every mesh with a tagged piece, by mesh (`tagOf`). */
  private readonly tagged = new Map<InstancedMesh, readonly (PieceTag | null)[]>();
  private current = 0;

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
    this.n = steps.length;
    this.materials = materials;
  }

  /** The position last evaluated. */
  get t(): number {
    return this.current;
  }

  /**
   * The tag `kit.addTagged` gave the piece in slot `instance` of `mesh` (docs/design/spec.md, Build-step API: Piece tags), or null for an untagged
   * piece, a slot past the mesh or a mesh this timeline did not build. Tags are not timeline state: they never change with t.
   */
  tagOf(mesh: InstancedMesh, instance: number): PieceTag | null {
    return this.tagged.get(mesh)?.[instance] ?? null;
  }

  /** Shows the scene at `t` (clamped to [0, N]). Returns whether anything changed. */
  evaluate(t: number): boolean {
    if (Number.isNaN(t)) throw new Error('Timeline.evaluate: t is NaN; pass a number in [0, N].');
    const clamped = Math.min(Math.max(t, 0), this.n);
    let changed = false;
    this.states.forEach((state, i) => {
      const f = clamp01(clamped - i);
      if (f === state.f) return;
      const step = this.steps[i];
      if (step === undefined) return;
      this.updateStep(step, state, f);
      changed = true;
    });
    this.current = clamped;
    return changed;
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
    return { steps: this.n, pieces, meshes, triangles, lights };
  }

  /**
   * Every piece of step `index` (0-based) as it stands once the step is complete, whatever t is now: its mesh, its world box and its final matrix,
   * in arrival order. It reads the final matrices kept for rest positions, never the meshes' current ones, and writes nothing the scene shows.
   */
  restingPieces(index: number): RestingPiece[] {
    const step = this.steps[index];
    const state = this.states[index];
    if (step === undefined || state === undefined) throw new Error(`Timeline.restingPieces: there is no step ${String(index)}; steps run from 0 to ${String(this.n - 1)}.`);
    const matrix = new Matrix4();
    return Array.from(state.mesh, (m, j) => {
      const geometry = step.meshes[m]?.geometry;
      if (geometry === undefined) throw new Error(`Timeline.restingPieces: step "${step.def.id}" piece ${String(j)} names mesh ${String(m)} of ${String(step.meshes.length)}.`);
      if (geometry.boundingBox === null) geometry.computeBoundingBox();
      const elements = state.finals.slice(j * 16, j * 16 + 16);
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
    const centre = bounds.getCenter(new Vector3());

    const inputs = boxes.map((box, i) => {
      const c = box.getCenter(new Vector3());
      return { cx: c.x, cy: c.y, cz: c.z, order: pieces[i]?.order ?? i };
    });
    const keys = staggerKeys(def.stagger ?? 'order', inputs, centre.x, centre.z);
    const windows = windowsFromKeys(keys);
    const arrival = Int32Array.from(pieces.keys()).sort((a, b) => (windows.start[a] ?? 0) - (windows.start[b] ?? 0) || a - b);
    const { meshes, meshOf, slotOf } = batchPieces(def.id, pieces, arrival);

    const count = pieces.length;
    const start = new Float64Array(count);
    const end = new Float64Array(count);
    const mesh = new Int32Array(count);
    const slot = new Int32Array(count);
    const finals = new Float64Array(count * 16);
    const params = new Float64Array(count * 3);
    const meshStarts = meshes.map((m) => new Float64Array(m.instanceMatrix.count));
    const finalBoxes = meshes.map(() => new Box3());
    const cullBoxes = meshes.map(() => new Box3());
    const tags = meshes.map((): (PieceTag | null)[] | null => null);
    arrival.forEach((pieceIndex, j) => {
      const piece = pieces[pieceIndex];
      const box = boxes[pieceIndex];
      if (piece === undefined || box === undefined) return;
      const m = meshOf[pieceIndex] ?? 0;
      const s = slotOf[pieceIndex] ?? 0;
      start[j] = windows.start[pieceIndex] ?? 0;
      end[j] = windows.end[pieceIndex] ?? 1;
      mesh[j] = m;
      slot[j] = s;
      finals.set(piece.matrix.elements, j * 16);
      const pb = pieceBox(box);
      writeMotionParams(def.motion, pb, params, j * 3);
      const starts = meshStarts[m];
      if (starts !== undefined) starts[s] = start[j] ?? 0;
      finalBoxes[m]?.union(box);
      cullBoxes[m]?.union(box).union(boxOf(startBox(def.motion.kind, pb, params, j * 3)));
      const target = meshes[m];
      if (target !== undefined) {
        // Canonical rest values: hidden and landed pieces both hold the final matrix and white.
        target.instanceMatrix.array.set(piece.matrix.elements, s * 16);
        if (piece.tag !== null) (tags[m] ??= new Array<PieceTag | null>(target.instanceMatrix.count).fill(null))[s] = piece.tag;
      }
    });
    tags.forEach((list, i) => {
      const m = meshes[i];
      if (list !== null && m !== undefined) this.tagged.set(m, list);
    });

    const group = new Group();
    group.name = def.id;
    for (const piece of pieces) materials.add(piece.material);
    meshes.forEach((m, i) => {
      setCullBounds(m, cullBoxes[i] ?? bounds);
      if (m.castShadow) this.casterBounds.union(finalBoxes[i] ?? bounds);
      group.add(m);
    });
    const baseIntensity = lights.map((light) => light.intensity);
    for (const light of lights) {
      light.intensity = 0;
      light.visible = true;
      group.add(light);
      if (light instanceof SpotLight && light.target.parent === null) group.add(light.target);
    }
    this.states.push({ f: 0, kind: def.motion.kind, start, end, mesh, slot, finals, params, meshStarts, baseIntensity });
    return { def, index, group, meshes, lights, bounds, pieceCount: count, tags };
  }

  private updateStep(step: BuiltStep, state: StepState, f: number): void {
    const before = state.f;
    const lo0 = search(state.end, before, true);
    const hi0 = search(state.start, before, false);
    const lo1 = search(state.end, f, true);
    const hi1 = search(state.start, f, false);
    const touchedMin = step.meshes.map(() => Number.POSITIVE_INFINITY);
    const touchedMax = step.meshes.map(() => -1);
    const touch = (m: number, s: number): void => {
      if (s < (touchedMin[m] ?? 0)) touchedMin[m] = s;
      if (s > (touchedMax[m] ?? 0)) touchedMax[m] = s;
    };
    // Pieces that were moving and no longer are: back to their canonical rest values.
    for (let j = lo0; j < hi0; j += 1) {
      if (j >= lo1 && j < hi1) continue;
      const m = state.mesh[j] ?? 0;
      const s = state.slot[j] ?? 0;
      const target = step.meshes[m];
      if (target === undefined) continue;
      target.instanceMatrix.array.set(state.finals.subarray(j * 16, j * 16 + 16), s * 16);
      target.instanceColor?.array.fill(1, s * 3, s * 3 + 3);
      touch(m, s);
    }
    // Pieces moving now.
    for (let j = lo1; j < hi1; j += 1) {
      const m = state.mesh[j] ?? 0;
      const s = state.slot[j] ?? 0;
      const target = step.meshes[m];
      if (target === undefined) continue;
      const a = state.start[j] ?? 0;
      const b = state.end[j] ?? 1;
      const p = (f - a) / (b - a);
      writeMovingMatrix(state.kind, p, state.finals, j * 16, state.params, j * 3, target.instanceMatrix.array as Float32Array, s * 16);
      if (target.instanceColor !== null) writeTint(p, target.instanceColor.array as Float32Array, s * 3);
      touch(m, s);
    }
    step.meshes.forEach((target, m) => {
      const visible = search(state.meshStarts[m] ?? new Float64Array(), f, false);
      target.count = visible;
      target.visible = visible > 0;
      const lo = touchedMin[m] ?? Number.POSITIVE_INFINITY;
      const hi = touchedMax[m] ?? -1;
      if (hi >= lo) {
        target.instanceMatrix.addUpdateRange(lo * 16, (hi - lo + 1) * 16);
        target.instanceMatrix.needsUpdate = true;
        target.instanceColor?.addUpdateRange(lo * 3, (hi - lo + 1) * 3);
        if (target.instanceColor !== null) target.instanceColor.needsUpdate = true;
      }
    });
    step.lights.forEach((light, i) => {
      light.intensity = (state.baseIntensity[i] ?? 0) * lightRamp(f);
    });
    state.f = f;
  }
}
