/**
 * The section cut (docs/design/spec.md, Product): one horizontal clipping plane that keeps y < cut, applied to every model material, shadows included,
 * so the upper floors it removes neither show nor shade the floors below. When off, the plane sits far above the model, so the number of clipping planes
 * (part of every shader) never changes and toggling never recompiles.
 * Cut walls read as solid: after the main pass, a second pass draws the model's back faces in one flat colour. Where the plane opens a closed solid the
 * camera sees the inside of its far faces, so the cut face of every wall and slab shows as a solid band, as in an architect's section (poché).
 * A far face can lie on another piece's face (a stair's underside on the floor under it, a flight's end on its landing): the two then reach the depth
 * buffer equal within a few of its 24-bit steps, rounded differently from triangle to triangle, and without help they z-fight in stripes or whole patches
 * that change with the smallest camera move (work unit 1, review 2, U7). The cap pass is drawn CAP_DEPTH_BIAS steps nearer, so it wins such ties.
 * Only the building is cut: a material with `userData.sectionCut === false` (the site's landscape: trees, ground, paths) gets no plane, and the cap pass
 * leaves its meshes out, so trees stay whole instead of showing cut-coloured crowns. It also leaves out each mesh whose bounds lie wholly under the
 * cut (src/viewer/viewer.ts), as nothing of it is cut, so a ceiling or roof surface far under a high cut does not show its back in the cut colour.
 * Bound: only closed meshes get a solid cut face; an open surface in a mesh the plane passes through, seen from behind, shows the cut colour too while
 * the cut is on. Transparent meshes are left out. Along an edge where a solid's front face meets its own back face, the bias lets the back face win a
 * sliver about 0.03 px wide, which shows as a rare antialiasing sample of the cut colour on that edge.
 */
import { BackSide, Color, MeshBasicMaterial, Plane, Vector3 } from 'three';
import type { Box3, Material } from 'three';

/** Plane constant while the cut is off: far above anything modelled. */
const OFF = 1e6;
export const CUT_COLOUR = new Color('#7b2f2a');
/**
 * Depth-buffer steps the cap pass is drawn nearer (polygon offset units, no slope factor). Measured on the Main floor view's flights close up: 1 step
 * left whole patches flipping between the cut colour and the floor, 2 and 3 left stripes where the Grand Staircase's lower flight meets its landing,
 * 4 left none. A slope factor would widen the sliver on every silhouette edge to about a pixel.
 */
export const CAP_DEPTH_BIAS = 4;

/** Whether the section cut clips `material`: every model material does unless it opts out with `userData.sectionCut === false`. */
export function cutBySection(material: Material): boolean {
  return material.userData['sectionCut'] !== false;
}

/** Whether the cap pass draws meshes of `material`: those the cut clips, except transparent ones (glass would show its back faces in the cut colour). */
export function cappedBySection(material: Material): boolean {
  return cutBySection(material) && !material.transparent;
}

/** Of `meshes` the cap pass draws, those it leaves out under a cut at `height`: each whose bounds (culling bounds, which hold every pose) lie wholly under it. */
export function wholeUnderCut<T extends { readonly boundingBox: Box3 | null }>(meshes: readonly T[], height: number): T[] {
  return meshes.filter((mesh) => mesh.boundingBox !== null && mesh.boundingBox.max.y <= height);
}

export class SectionCut {
  readonly plane = new Plane(new Vector3(0, -1, 0), OFF);
  readonly capMaterial = new MeshBasicMaterial({
    name: 'section-cap',
    color: CUT_COLOUR,
    side: BackSide,
    fog: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: -CAP_DEPTH_BIAS,
  });
  private on = false;
  private level = 0;

  constructor() {
    this.capMaterial.clippingPlanes = [this.plane];
  }

  /** Gives each material the cut clips the cut plane, and the others none; call before the first render so shaders compile with it. */
  attach(materials: Iterable<Material>): void {
    for (const material of materials) {
      const cut = cutBySection(material);
      material.clippingPlanes = cut ? [this.plane] : null;
      material.clipShadows = cut;
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
