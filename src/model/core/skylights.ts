/**
 * Skylights and laylights of the second-floor picture galleries (interior.md, "Second-floor European Paintings galleries"; exterior.md [R2]).
 * Each gallery has a ridge skylight on a curb over an opening in its roof and a flat laylight under the opening at ceiling height. Frames are
 * unit boxes stretched along each bar and glass is a unit quad or triangle stretched over each pane, so every skylight of any size shares the
 * same few geometries: one instanced mesh per material per step. Frames arrive with the roofs; the glass arrives in 2023 (skylights-2023).
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder } from '../lib/index.js';
import { palette } from '../palette.js';
import { GALLERY_CEILING_Y, ROOF_Y, SKYLIGHT_CURB, SKYLIGHT_PITCH_DEG } from './constants.js';
import { ridgesOver, type Gallery, type Rect } from './layout.js';
import { core, glassBoth } from './materials.js';
import { UNIT_BOX, addBox } from './shapes.js';

const BAR = 0.07;
const BAR_DEPTH = 0.1;
const RAFTER_SPACING = 1.6;
const LAYLIGHT_SPACING = 1.25;
const CURB_WALL = 0.18;

/** A unit pane in the XZ plane (x and z ±0.5) facing +Y. */
const UNIT_PANE: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.polygon([new Vector3(-0.5, 0, 0.5), new Vector3(0.5, 0, 0.5), new Vector3(0.5, 0, -0.5), new Vector3(-0.5, 0, -0.5)]);
  return b.build();
})();

/** A unit gable pane in the XY plane, base x ±0.5 at y = 0, apex (0, 1), facing +Z. */
const UNIT_GABLE: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.polygon([new Vector3(-0.5, 0, 0), new Vector3(0.5, 0, 0), new Vector3(0, 1, 0)]);
  return b.build();
})();

/** A unit box stretched into a bar from `a` to `b`, `width` across and `depth` along `normal` (made perpendicular to the bar). */
export function barMatrix(a: Vector3, b: Vector3, width: number, depth: number, normal: Vector3): Matrix4 {
  const axis = b.clone().sub(a);
  const length = axis.length();
  axis.normalize();
  const n = normal.clone().addScaledVector(axis, -normal.dot(axis)).normalize();
  const side = new Vector3().crossVectors(axis, n).normalize();
  return new Matrix4().makeBasis(side.multiplyScalar(width), axis.multiplyScalar(length), n.multiplyScalar(depth)).setPosition(a);
}

/** A matrix taking the unit pane's x to `u`, its z to `v` and its normal to u × v, centred on `centre` (always right-handed). */
function paneMatrix(centre: Vector3, u: Vector3, v: Vector3): Matrix4 {
  const normal = new Vector3().crossVectors(v, u).normalize();
  // Columns: x → u, y → normal, z → v; det = u · (normal × v) > 0 when normal = v × u.
  return new Matrix4().makeBasis(u, normal, v).setPosition(centre);
}

interface Ridge {
  readonly rect: Rect;
  readonly alongX: boolean;
}

/** Eave, ridge and rafter points of one ridge skylight: `along` is the ridge direction, `across` points from the ridge to one eave. */
function ridgeFrame(ridge: Ridge): { base: number; rise: number; ends: [Vector3, Vector3]; half: Vector3; up: Vector3 } {
  const [x0, z0, x1, z1] = ridge.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const halfSpan = ridge.alongX ? (z1 - z0) / 2 : (x1 - x0) / 2;
  const rise = halfSpan * Math.tan((SKYLIGHT_PITCH_DEG * Math.PI) / 180);
  const base = ROOF_Y + SKYLIGHT_CURB;
  const ends: [Vector3, Vector3] = ridge.alongX ? [new Vector3(x0, base, cz), new Vector3(x1, base, cz)] : [new Vector3(cx, base, z0), new Vector3(cx, base, z1)];
  const half = ridge.alongX ? new Vector3(0, 0, halfSpan) : new Vector3(halfSpan, 0, 0);
  return { base, rise, ends, half, up: new Vector3(0, rise, 0) };
}

/** The curbs round a gallery's opening (roof material) and the bars of its ridge skylights (dark metal). */
export function skylightFrames(kit: Kit, gallery: Gallery, order: number): void {
  const o = gallery.opening;
  if (o === null) return;
  const [x0, z0, x1, z1] = o;
  const t = CURB_WALL;
  const y0 = ROOF_Y;
  const y1 = ROOF_Y + SKYLIGHT_CURB;
  addBox(kit, palette.roofLead, x0 - t, y0, z0 - t, x1 + t, y1, z0, order);
  addBox(kit, palette.roofLead, x0 - t, y0, z1, x1 + t, y1, z1 + t, order);
  addBox(kit, palette.roofLead, x0 - t, y0, z0, x0, y1, z1, order);
  addBox(kit, palette.roofLead, x1, y0, z0, x1 + t, y1, z1, order);
  const metal = core.aluminium;
  for (const ridge of ridgesOver(o)) {
    const { ends, half, up } = ridgeFrame(ridge);
    const [a, b] = ends;
    const length = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    const top0 = a.clone().add(up);
    const top1 = b.clone().add(up);
    kit.add(UNIT_BOX, metal, barMatrix(top0, top1, BAR * 1.5, BAR_DEPTH, new Vector3(0, 1, 0)), order);
    for (const side of [-1, 1]) {
      const off = half.clone().multiplyScalar(side);
      const slopeNormal = off.clone().normalize().multiplyScalar(up.y).add(new Vector3(0, half.length(), 0)).normalize();
      kit.add(UNIT_BOX, metal, barMatrix(a.clone().add(off), b.clone().add(off), BAR, BAR_DEPTH, slopeNormal), order);
      const rafters = Math.max(1, Math.round(length / RAFTER_SPACING));
      for (let k = 0; k <= rafters; k++) {
        const p = a.clone().addScaledVector(dir, (length * k) / rafters);
        kit.add(UNIT_BOX, metal, barMatrix(p.clone().add(off), p.clone().add(up), BAR, BAR_DEPTH, slopeNormal), order);
      }
    }
  }
}

/** The glass of a gallery's ridge skylights: two slopes and two gable ends each. */
export function skylightGlass(kit: Kit, gallery: Gallery, order: number): void {
  const o = gallery.opening;
  if (o === null) return;
  for (const ridge of ridgesOver(o)) {
    const { ends, half, up } = ridgeFrame(ridge);
    const [a, b] = ends;
    const along = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    for (const side of [-1, 1]) {
      const off = half.clone().multiplyScalar(side);
      // u runs from the eave up to the ridge, v along the ridge; the pane faces up and out.
      const u = up.clone().sub(off);
      const centre = mid.clone().add(off).addScaledVector(u, 0.5);
      const outward = off.clone().add(up);
      // paneMatrix's normal is v × u: keep `along` when along × u already points outward.
      const v = new Vector3().crossVectors(along, u).dot(outward) > 0 ? along.clone() : along.clone().negate();
      kit.add(UNIT_PANE, glassBoth, paneMatrix(centre, u, v), order);
    }
    for (const [end, sign] of [
      [a, -1],
      [b, 1],
    ] as const) {
      // Gable pane: base across the span, apex at the ridge, facing out along the ridge.
      const across = half.clone().multiplyScalar(2);
      const out = along.clone().normalize().multiplyScalar(sign);
      const basisX = across.clone();
      const basisY = up.clone();
      const z = new Vector3().crossVectors(basisX, basisY).normalize();
      const flip = z.dot(out) < 0 ? -1 : 1;
      const m = new Matrix4().makeBasis(basisX.multiplyScalar(flip), basisY, z.multiplyScalar(flip)).setPosition(end);
      kit.add(UNIT_GABLE, glassBoth, m, order);
    }
  }
}

/** The laylight frame: a flat grid of bars under the opening, at the ceiling. */
export function laylightFrame(kit: Kit, gallery: Gallery, order: number): void {
  const o = gallery.opening;
  if (o === null) return;
  const [x0, z0, x1, z1] = o;
  const y = GALLERY_CEILING_Y;
  const metal = core.aluminium;
  const nx = Math.max(1, Math.round((x1 - x0) / LAYLIGHT_SPACING));
  const nz = Math.max(1, Math.round((z1 - z0) / LAYLIGHT_SPACING));
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    addBox(kit, metal, x - BAR / 2, y, z0, x + BAR / 2, y + BAR_DEPTH, z1, order);
  }
  for (let k = 0; k <= nz; k++) {
    const z = z0 + ((z1 - z0) * k) / nz;
    addBox(kit, metal, x0, y, z - BAR / 2, x1, y + BAR_DEPTH, z + BAR / 2, order);
  }
}

/** The laylight's glass: one pane at the ceiling facing down into the gallery. */
export function laylightGlass(kit: Kit, gallery: Gallery, order: number): void {
  const o = gallery.opening;
  if (o === null) return;
  const [x0, z0, x1, z1] = o;
  const centre = new Vector3((x0 + x1) / 2, GALLERY_CEILING_Y + BAR_DEPTH / 2, (z0 + z1) / 2);
  kit.add(UNIT_PANE, glassBoth, paneMatrix(centre, new Vector3(x1 - x0, 0, 0), new Vector3(0, 0, -(z1 - z0))), order);
}
