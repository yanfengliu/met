/**
 * Which artwork's card shows (docs/design/spec.md, Collection: Labels), by the artwork's tag (src/build/types.ts `PieceTag`, kind artwork, its Met
 * object ID). Walking, the look target decides (src/walk/look.ts): the card shows while the eye looks at an artwork within its reach and hides as soon as
 * it looks at anything else, so once Esc frees the pointer the view stands still and the card stays for the artwork in view while the visitor reaches
 * its link. In the orbit view a click decides: one whose ray (`ARTWORK_QUERY` through src/viewer/pick.ts `ModelPicker.hit`) meets an artwork shows
 * that artwork's card, any other click hides it, and so do Esc and the build taking the artwork away; entering or leaving walk mode hides it.
 * Pure state over what it is given: it reads a mesh's visibility and count, and writes nothing of the scene.
 */
import type { InstancedMesh } from 'three';

import type { PieceTag } from '../build/types.js';
import type { LookTarget } from '../walk/look.js';
import type { HitQuery, PickHit } from './pick.js';

/**
 * The orbit view's click query: the nearest artwork piece along the pointer's ray, at any distance, through glass and water that are no artwork's;
 * any other surface stops the ray, a wall or a door, so an artwork hidden behind one is never labelled. A vitrine's glass is its artwork's own piece.
 */
export const ARTWORK_QUERY: HitQuery = Object.freeze({
  throughTransparent: true,
  accept: (tag: PieceTag | null): boolean => tag?.kind === 'artwork',
});

/** The artwork a card is for, and the drawn instance that found it. */
interface Shown {
  readonly id: string;
  readonly mesh: InstancedMesh;
  readonly instance: number;
}

const artworkOf = (tag: PieceTag | null, mesh: InstancedMesh, instance: number): Shown | null => (tag?.kind === 'artwork' ? { id: tag.id, mesh, instance } : null);

export class ArtLabel {
  /** The look target's artwork, as walk mode last gave it. */
  private looked: Shown | null = null;
  /** The artwork the last orbit-view click met. */
  private clicked: Shown | null = null;
  /** Whether the last frame was walking. */
  private walking = false;

  /** The Met object ID of the artwork whose card shows, or null: walking, the look target's; in the orbit view, the last click's. */
  get id(): string | null {
    return (this.walking ? this.looked : this.clicked)?.id ?? null;
  }

  /** The walking eye's look target, whenever walk mode gives a new one (null in the orbit view, while it prepares and when it looks at no artwork). */
  look(target: LookTarget | null): void {
    this.looked = target === null ? null : artworkOf({ kind: target.kind, id: target.id }, target.hit.mesh, target.hit.instance);
  }

  /** An orbit-view click whose ray met `hit` under `ARTWORK_QUERY`: that artwork's card, or none when it met no artwork. Walking, clicks look instead. */
  click(hit: PickHit | null): void {
    if (this.walking) return;
    this.clicked = hit === null ? null : artworkOf(hit.tag, hit.mesh, hit.instance);
  }

  /** Esc: the orbit view's card hides; walking, the card follows the eye, and Esc is the browser's, freeing the pointer. */
  escape(): void {
    this.clicked = null;
  }

  /**
   * Once a frame, `walking` while walk mode is on: entering it drops an orbit click's card and leaving it the look target's; in the orbit view a card
   * whose artwork the build has taken away (its mesh hidden, or its instance past the mesh's count) hides.
   */
  frame(walking: boolean): void {
    if (walking) this.clicked = null;
    else this.looked = null;
    const c = this.clicked;
    if (c !== null && !(c.mesh.visible && c.instance < c.mesh.count)) this.clicked = null;
    this.walking = walking;
  }
}
