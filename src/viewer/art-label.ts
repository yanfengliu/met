/**
 * Which artwork's card shows (docs/design/spec.md, Collection: Labels), by the artwork's tag (src/build/types.ts `PieceTag`, kind artwork, its Met
 * object ID). Walking, the look target decides (src/walk/look.ts): the card shows while the eye looks at an artwork within its reach and hides as soon as
 * it looks at anything else, so once Esc frees the pointer the view stands still and the card stays for the artwork in view while the visitor reaches
 * its link. In the orbit view a click decides: one whose ray (`ARTWORK_QUERY` through src/viewer/pick.ts `ModelPicker.hit`) meets an artwork shows
 * that artwork's card, any other click hides it, and so do Esc and a camera preset (review 6, F26). The card also hides once the camera draws none of
 * the artwork's pieces, as the picker counts a drawn piece: the build has taken them away, the section cut or a floor view's cut has removed them, or
 * they are on no layer the camera draws (F27). Entering or leaving walk mode hides it.
 * Pure state over what it is given: it reads the meshes' visibility, counts, layers, instance matrices and materials, and writes nothing of the scene.
 */
import { Box3, Matrix4 } from 'three';
import type { BufferGeometry, InstancedMesh, Layers } from 'three';

import type { BuiltStep } from '../build/timeline.js';
import type { PieceTag } from '../build/types.js';
import type { LookTarget } from '../walk/look.js';
import type { HitQuery, PickCut, PickHit } from './pick.js';
import { cutBySection } from './section-cut.js';

/**
 * The orbit view's click query: the nearest artwork piece along the pointer's ray, at any distance, through glass and water that are no artwork's;
 * any other surface stops the ray, a wall or a door, so an artwork hidden behind one is never labelled. A vitrine's glass is its artwork's own piece.
 */
export const ARTWORK_QUERY: HitQuery = Object.freeze({
  throughTransparent: true,
  accept: (tag: PieceTag | null): boolean => tag?.kind === 'artwork',
});

/** One piece of an artwork as a mesh draws it: the mesh and the instance slot. */
export interface ArtInstance {
  readonly mesh: InstancedMesh;
  readonly instance: number;
}

/** What the camera draws, as the picker reads it: the section cut, a floor view's included, and the camera's layers. */
export interface DrawnView {
  readonly cut: PickCut;
  readonly layers: Layers;
}

/** The instances of `step` that carry artwork `id`'s tag: every piece of the artwork (src/model/collection/place.ts tags them all). */
export function artworkInstances(step: BuiltStep, id: string): ArtInstance[] {
  const out: ArtInstance[] = [];
  step.meshes.forEach((mesh, m) => {
    step.tags[m]?.forEach((tag, instance) => {
      if (tag?.kind === 'artwork' && tag.id === id) out.push({ mesh, instance });
    });
  });
  return out;
}

const boxes = new WeakMap<BufferGeometry, Box3>();
const box = new Box3();
const matrix = new Matrix4();

/** A geometry's bounds, read from its positions once and kept, without touching the geometry. */
function boundsOf(geometry: BufferGeometry): Box3 {
  const known = boxes.get(geometry);
  if (known !== undefined) return known;
  const bounds = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as Parameters<Box3['setFromBufferAttribute']>[0]);
  boxes.set(geometry, bounds);
  return bounds;
}

/** Whether the camera draws some of `piece`: its mesh shown and on a drawn layer, its instance arrived, and, with the cut on, part of it under the cut. */
export function drawnPiece(piece: ArtInstance, view: DrawnView): boolean {
  const { mesh, instance } = piece;
  if (!mesh.visible || instance >= mesh.count || !mesh.layers.test(view.layers)) return false;
  const material = mesh.material;
  if (Array.isArray(material)) return false;
  if (!view.cut.enabled || !cutBySection(material)) return true;
  matrix.fromArray(mesh.instanceMatrix.array, instance * 16);
  return box.copy(boundsOf(mesh.geometry)).applyMatrix4(matrix).min.y < view.cut.height;
}

/** The artwork an orbit-view click shows, and all its pieces. */
interface Clicked {
  readonly id: string;
  readonly pieces: readonly ArtInstance[];
}

export class ArtLabel {
  /** The look target's artwork id, as walk mode last gave it. */
  private looked: string | null = null;
  /** The artwork the last orbit-view click met. */
  private clicked: Clicked | null = null;
  /** Whether the last frame was walking. */
  private walking = false;

  /**
   * `piecesOf` gives every piece of the artwork `id` whose piece a click met (`artworkInstances` over the hit mesh's step); by default, the piece met.
   */
  constructor(private readonly piecesOf: (hit: PickHit, id: string) => readonly ArtInstance[] = (hit) => [{ mesh: hit.mesh, instance: hit.instance }]) {}

  /** The Met object ID of the artwork whose card shows, or null: walking, the look target's; in the orbit view, the last click's. */
  get id(): string | null {
    return this.walking ? this.looked : (this.clicked?.id ?? null);
  }

  /** The walking eye's look target whenever walk mode gives a new one, or null (no tagged piece in reach, or walk mode preparing or off): a door shows no card. */
  look(target: LookTarget | null): void {
    this.looked = target?.kind === 'artwork' ? target.id : null;
  }

  /** An orbit-view click whose ray met `hit` under `ARTWORK_QUERY`: that artwork's card, or none when it met no artwork. Walking, clicks look instead. */
  click(hit: PickHit | null): void {
    if (this.walking) return;
    this.clicked = hit?.tag?.kind === 'artwork' ? { id: hit.tag.id, pieces: this.piecesOf(hit, hit.tag.id) } : null;
  }

  /** Esc or a camera preset: the orbit view's card hides. Walking, the card follows the eye, and Esc is the browser's, freeing the pointer. */
  dismiss(): void {
    this.clicked = null;
  }

  /**
   * Once a frame, `walking` while walk mode is on, with what the camera draws: entering walk mode drops an orbit click's card and leaving it the look
   * target's; in the orbit view the card hides once none of its artwork's pieces is drawn (`drawnPiece`).
   */
  frame(walking: boolean, view: DrawnView): void {
    if (walking) this.clicked = null;
    else this.looked = null;
    if (this.clicked !== null && !this.clicked.pieces.some((piece) => drawnPiece(piece, view))) this.clicked = null;
    this.walking = walking;
  }
}
