/**
 * The section cut (docs/design/spec.md, Product): one horizontal clipping plane that keeps y < cut, applied to every model material, shadows included,
 * so the upper floors it removes neither show nor shade the floors below. When off, the plane sits far above the model, so the number of clipping planes
 * (part of every shader) never changes and toggling never recompiles.
 * Cut walls read as solid: after the main pass, a second pass draws the model's back faces in one flat colour. Where the plane opens a closed solid the
 * camera sees the inside of its far faces, so the cut face of every wall and slab shows as a solid band, as in an architect's section (poché).
 * Bound: only closed meshes get a solid cut face; an open surface seen from behind shows the cut colour too while the cut is on. Transparent meshes are left out.
 */
import { BackSide, Color, MeshBasicMaterial, Plane, Vector3 } from 'three';
import type { Material } from 'three';

/** Plane constant while the cut is off: far above anything modelled. */
const OFF = 1e6;
export const CUT_COLOUR = new Color('#7b2f2a');

export class SectionCut {
  readonly plane = new Plane(new Vector3(0, -1, 0), OFF);
  readonly capMaterial = new MeshBasicMaterial({ name: 'section-cap', color: CUT_COLOUR, side: BackSide, fog: false, toneMapped: false });
  private on = false;
  private level = 0;

  constructor() {
    this.capMaterial.clippingPlanes = [this.plane];
  }

  /** Gives each material the cut plane; call before the first render so shaders compile with it. */
  attach(materials: Iterable<Material>): void {
    for (const material of materials) {
      material.clippingPlanes = [this.plane];
      material.clipShadows = true;
    }
  }

  get enabled(): boolean {
    return this.on;
  }

  /** The cut height in metres (kept while the cut is off). */
  get height(): number {
    return this.level;
  }

  set(enabled: boolean, height: number): void {
    if (!Number.isFinite(height)) throw new Error(`SectionCut.set: height ${String(height)} is not a finite number of metres.`);
    this.on = enabled;
    this.level = height;
    this.plane.constant = enabled ? height : OFF;
  }
}
