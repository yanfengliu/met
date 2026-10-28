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
 * leaves its meshes out, so trees stay whole instead of showing cut-coloured crowns. Of the other meshes it draws only the pieces the plane passes
 * through (src/viewer/cap-pass.ts), so a piece under the cut never shows its back in the cut colour, however close its faces or coarse the depth buffer.
 * Transparent meshes are left out, and so are sheets, surfaces with no inside (src/model/lib/sheet.ts, `capsMesh`). Every other piece is closed along
 * vertical lines and has an inside behind each upright face (src/model/closure.test.ts), so a cut through it, seen straight down, shows the cut colour
 * across its whole section where its faces look out, never what lies below. A part wound inside out (two builders', an open finding the spec names)
 * leaves no back face there for this pass and shows its lit inner faces instead.
 * Bound: a piece may still be open sideways (a wall's end run into another, a face left out where two parts meet) or hold a two-sided membrane (a
 * channel's end against a reveal), so a slanted view can see out of its section where it meets no back face, and the back of a membrane the plane
 * passes through shows the cut colour while the cut is on. On a piece the plane passes through, the bias lets a back face win over a front face of that piece less than CAP_DEPTH_BIAS steps in front of
 * it: along an edge where the two meet, a sliver about 0.03 px wide (a rare antialiasing sample of the cut colour), and across a part of the piece thinner
 * than that, which needs a near plane far closer than what is in view (4 steps are 0.4 to 15 mm in the floor views and close-ups, 8 cm 100 m away with
 * the near plane at 3 cm).
 */
import { BackSide, Color, MeshBasicMaterial, Plane, Vector3 } from 'three';
import type { Material, Mesh } from 'three';

import { isSheet } from '../model/lib/sheet.js';

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

/** Whether the cap pass draws `mesh`: one of several materials, or of one `cappedBySection` takes, unless its geometry is a sheet, with no inside to show. */
export function capsMesh(mesh: Mesh): boolean {
  return !isSheet(mesh.geometry) && (Array.isArray(mesh.material) || cappedBySection(mesh.material));
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
