/**
 * The floor view's landscape filter (docs/design/spec.md, Page: Floor picker). The section cut leaves landscape whole (src/viewer/section-cut.ts), so
 * a floor view would still look through tree crowns and lamp tops that rise over the cut; instead the filter hides, whole, every landscape object
 * that rises above the cut.
 * - Landscape: a mesh whose material the section cut leaves whole (`cutBySection` false).
 * - Ground: a landscape piece at least GROUND_SPAN across both ways (the terrain, the merged park paths). It never hides; every other piece stands.
 * - Objects: pieces of one step with the same final matrix (a tree's trunk and crown, a lamp's post and globe), so the meshes they lie in hide
 *   together. A mesh with a standing piece hides when the highest standing piece of its group of meshes rises above the cut.
 * Like the cut, it is a view filter: it sets a hidden mesh's layer mask to none, so the camera neither draws it nor lets it cast a shadow, and it never
 * writes what the timeline writes (matrices, colours, counts, visibility). Which meshes hide depends on the cut alone, read from each piece's final
 * matrix (Timeline.restingPieces), whatever t is, so the scene at t stays a pure function of t and the floor.
 * Bound: it hides whole meshes, so one standing piece over the cut hides every piece of its mesh (all crowns of one tree species); an object whose
 * pieces have different matrices (the magnolias by the steps) can lose its crown alone.
 */
import type { Box3, InstancedMesh } from 'three';

import type { BuiltStep, RestingPiece } from '../build/timeline.js';
import { cutBySection } from './section-cut.js';

/** Landscape pieces at least this many metres across in both X and Z are ground; every tree crown, lamp, bench and rock is under 23 m. */
export const GROUND_SPAN = 30;

/** Whether a landscape piece with world box `box` is ground, which the floor view never hides. */
export function isGround(box: Box3): boolean {
  return box.max.x - box.min.x >= GROUND_SPAN && box.max.z - box.min.z >= GROUND_SPAN;
}

/** Meshes that hide together, and the top of their highest standing piece. */
interface Group {
  readonly meshes: readonly InstancedMesh[];
  readonly top: number;
}

/** Whether the floor view counts `mesh` as landscape: its material is one the section cut leaves whole. */
export function isLandscape(mesh: InstancedMesh): boolean {
  return !Array.isArray(mesh.material) && !cutBySection(mesh.material);
}

/** The landscape groups of one step: union-find over its meshes, joined by pieces with the same final matrix. */
function stepGroups(step: BuiltStep, pieces: readonly RestingPiece[]): Group[] {
  const landscape = step.meshes.map(isLandscape);
  const parent = step.meshes.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    parent[i] = root;
    return root;
  };
  const top = step.meshes.map(() => Number.NEGATIVE_INFINITY);
  const byMatrix = new Map<string, number>();
  for (const piece of pieces) {
    if (landscape[piece.mesh] !== true) continue;
    if (!isGround(piece.box)) top[piece.mesh] = Math.max(top[piece.mesh] ?? Number.NEGATIVE_INFINITY, piece.box.max.y);
    const key = piece.matrix.join(',');
    const other = byMatrix.get(key);
    if (other === undefined) byMatrix.set(key, piece.mesh);
    else parent[find(piece.mesh)] = find(other);
  }
  const groups = new Map<number, { meshes: InstancedMesh[]; top: number }>();
  step.meshes.forEach((mesh, i) => {
    const own = top[i] ?? Number.NEGATIVE_INFINITY;
    if (landscape[i] !== true) return;
    const root = find(i);
    const group = groups.get(root) ?? { meshes: [], top: Number.NEGATIVE_INFINITY };
    group.top = Math.max(group.top, own);
    // A mesh of ground pieces alone never hides, even when an object joins it to standing ones.
    if (own > Number.NEGATIVE_INFINITY) group.meshes.push(mesh);
    groups.set(root, group);
  });
  return [...groups.values()].filter((group) => group.meshes.length > 0);
}

export class FloorView {
  private readonly groups: Group[] = [];
  /** Each standing landscape mesh's own layer mask, which showing it again restores. */
  private readonly masks = new Map<InstancedMesh, number>();
  private height: number | null = null;
  private count = 0;

  /** `resting(i)` gives step i's pieces at rest (Timeline.restingPieces). */
  constructor(steps: readonly BuiltStep[], resting: (index: number) => readonly RestingPiece[]) {
    for (const step of steps) {
      if (!step.meshes.some(isLandscape)) continue;
      for (const group of stepGroups(step, resting(step.index))) {
        this.groups.push(group);
        for (const mesh of group.meshes) this.masks.set(mesh, mesh.layers.mask);
      }
    }
  }

  /** The cut the filter hides landscape above, or null when it hides none. */
  get cut(): number | null {
    return this.height;
  }

  /** How many landscape meshes it hides now. */
  get hidden(): number {
    return this.count;
  }

  /** Whether it hides `mesh` now. */
  hides(mesh: InstancedMesh): boolean {
    return this.masks.has(mesh) && mesh.layers.mask === 0;
  }

  /** Hides every standing landscape group rising above `height` and shows the rest; null shows them all. Returns whether any mesh changed. */
  apply(height: number | null): boolean {
    if (height !== null && !Number.isFinite(height)) throw new Error(`FloorView.apply: height ${String(height)} is not a finite number of metres or null.`);
    this.height = height;
    let changed = false;
    let count = 0;
    for (const group of this.groups) {
      const hide = height !== null && group.top > height;
      for (const mesh of group.meshes) {
        const mask = hide ? 0 : (this.masks.get(mesh) ?? 1);
        if (mesh.layers.mask !== mask) {
          mesh.layers.mask = mask;
          changed = true;
        }
        if (hide) count += 1;
      }
    }
    this.count = count;
    return changed;
  }
}
