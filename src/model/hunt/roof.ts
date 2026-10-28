/**
 * Hunt wing, the roofs (1901–1902), last: the Great Hall's low hipped roof with its long glazed skylight over the three domes, the wings' flat roofs behind
 * their parapets with a glazed hip skylight each, and the flat roofs of the galleries behind the hall with the Grand Staircase's pitched roof.
 * Evidence: exterior.md R1 (skylight X ±22, Z −23.5..−10.7; wing skylights X ±34..±44, Z −29..−2) and the 2018 orthophoto viewed at zoom 19;
 * the roof stays below the sight line over the cresting from Fifth Avenue (S7 shows only sky above it); ridge at GREAT_HALL_RIDGE_Y.
 */
import * as THREE from 'three';

import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { GREAT_HALL_RIDGE_Y } from '../frame.js';
import { hippedSkylight, MeshBuilder, ridgeSkylight } from '../lib/index.js';
import { ATTIC_BACK_Z, BACK_Z, CROSS_HALL_FRONT_Z, EXT_FACE_Z, EXT_NORTH_X, EXT_PARAPET_Y, EXT_SOUTH_X, EXT_WALL_T, HALL_END_WALL_X, HALL_WEST_WALL_Z } from './dims.js';
import { at, box } from './shapes.js';
import { STAIR_HALL_OUTER_X, STAIR_WALL_TOP_Y } from './stair.js';
import { HALL_EAVES_Y } from './walls.js';

/** The hall roof's flat top round the skylight's curb (exterior.md R1), above the domes' oculi (Y 26.7); the glazed lantern rises to GREAT_HALL_RIDGE_Y. */
const CURB = { x: 22.8, z0: -24.3, z1: -9.9, y: 28.0, height: 0.35 } as const;
/** Flat roofs of the wings and of the galleries behind the hall. */
export const WING_ROOF_Y = EXT_PARAPET_Y - 1.4;
export const GALLERY_ROOF_Y = 20.5;

/** The lead skin's thickness over the hall roof's plaster, and the whole roof's, metres. */
const LEAD = 0.05;
const ROOF_DEPTH = 0.3;
/** The lead fascia's width at the eaves, metres. */
const FASCIA = 0.02;

/**
 * A hipped roof from the eaves rectangle up to an inner flat rectangle (a frustum of four planes), open in the middle for the skylight curb:
 * the lead skin and, under it to 0.3 m below the top, the plastered slab seen from the hall's upper spaces, as two geometries (two materials), each
 * closed along vertical lines. Under the skin at the eaves a lead fascia, a closed band FASCIA wide, runs the roof's depth, so the eaves show lead;
 * round the opening each shows its own.
 */
const hallRoof = (() => {
  let made: { top: THREE.BufferGeometry; under: THREE.BufferGeometry } | undefined;
  return (): { top: THREE.BufferGeometry; under: THREE.BufferGeometry } => {
    if (made !== undefined) return made;
    const e = { x0: -HALL_END_WALL_X - 0.4, x1: HALL_END_WALL_X + 0.4, z0: HALL_WEST_WALL_Z - 0.4, z1: ATTIC_BACK_Z, y: HALL_EAVES_Y };
    const t = { x0: -CURB.x, x1: CURB.x, z0: CURB.z0, z1: CURB.z1, y: CURB.y };
    const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
    // The eaves' and the opening's corners, each loop running round the same way.
    const outer = [v(e.x0, e.y, e.z1), v(e.x1, e.y, e.z1), v(e.x1, e.y, e.z0), v(e.x0, e.y, e.z0)];
    const inner = [v(t.x0, t.y, t.z1), v(t.x1, t.y, t.z1), v(t.x1, t.y, t.z0), v(t.x0, t.y, t.z0)];
    /** The slab between `drop0` and `drop1` under the roof's top: four sloping planes over and under, each wound to face out, the rim round the opening, and at the eaves one down to `eaves`, or none. */
    const slab = (drop0: number, drop1: number, eaves: number | null): THREE.BufferGeometry => {
      const b = new MeshBuilder();
      const lower = (p: THREE.Vector3, drop: number): THREE.Vector3 => p.clone().setY(p.y - drop);
      for (let k = 0; k < 4; k += 1) {
        const [o0, o1] = [outer[k] ?? v(0, 0, 0), outer[(k + 1) % 4] ?? v(0, 0, 0)];
        const [i0, i1] = [inner[k] ?? v(0, 0, 0), inner[(k + 1) % 4] ?? v(0, 0, 0)];
        b.polygon([lower(o0, drop0), lower(o1, drop0), lower(i1, drop0), lower(i0, drop0)]);
        b.polygon([lower(o0, drop1), lower(i0, drop1), lower(i1, drop1), lower(o1, drop1)]);
        if (eaves !== null) b.polygon([lower(o0, eaves), lower(o1, eaves), lower(o1, drop0), lower(o0, drop0)]);
        b.polygon([lower(i0, drop0), lower(i1, drop0), lower(i1, drop1), lower(i0, drop1)]);
      }
      return b.build();
    };
    // The fascia's inner edge, a fraction of the way up the hips that keeps its narrowest side FASCIA wide.
    const run = Math.min(...[0, 1, 2, 3].flatMap((k) => [Math.abs((inner[k]?.x ?? 0) - (outer[k]?.x ?? 0)), Math.abs((inner[k]?.z ?? 0) - (outer[k]?.z ?? 0))]));
    const inward = (k: number): THREE.Vector3 => (outer[k] ?? v(0, 0, 0)).clone().lerp(inner[k] ?? v(0, 0, 0), FASCIA / run);
    const top = new MeshBuilder();
    top.append(slab(0, LEAD, LEAD));
    const lower = (p: THREE.Vector3, drop: number): THREE.Vector3 => p.clone().setY(p.y - drop);
    for (let k = 0; k < 4; k += 1) {
      const [o0, o1] = [outer[k] ?? v(0, 0, 0), outer[(k + 1) % 4] ?? v(0, 0, 0)];
      const [n0, n1] = [inward(k), inward((k + 1) % 4)];
      // Its top under the skin, its bottom level with the slab's, its outer face at the eaves and its inner face, each wound to face out.
      top.polygon([lower(o0, LEAD), lower(o1, LEAD), lower(n1, LEAD), lower(n0, LEAD)]);
      top.polygon([lower(o0, ROOF_DEPTH), lower(n0, ROOF_DEPTH), lower(n1, ROOF_DEPTH), lower(o1, ROOF_DEPTH)]);
      top.polygon([lower(o0, ROOF_DEPTH), lower(o1, ROOF_DEPTH), lower(o1, LEAD), lower(o0, LEAD)]);
      top.polygon([lower(n0, LEAD), lower(n1, LEAD), lower(n1, ROOF_DEPTH), lower(n0, ROOF_DEPTH)]);
    }
    made = { top: top.build(), under: slab(LEAD, ROOF_DEPTH, null) };
    return made;
  };
})();

/** The Grand Staircase's lead roof: each slope's depth, measured plumb, and its gable ends' thickness, metres. */
const SLOPE_DEPTH = 0.2;
const GABLE_END = 0.3;

/**
 * The Grand Staircase's pitched lead roof on its curb, `width` across the ridge (X) and `length` along it (Z), from `curb` up at `pitch` degrees, as the
 * ridge skylight whose frame it shares: two slopes SLOPE_DEPTH deep from the curb's top to the ridge, closed at the ends by gables GABLE_END thick. The
 * attic under the slopes stays open, so a cut through the roof shows its slopes and gables in section over the vault, as a real roof's would.
 */
function leadGable(width: number, length: number, pitch: number, curb: number): THREE.BufferGeometry {
  const key = [width, length, pitch, curb].join('|');
  const known = gables.get(key);
  if (known !== undefined) return known;
  const b = new MeshBuilder();
  const [hx, hz] = [width / 2, length / 2];
  const slope = Math.tan((pitch * Math.PI) / 180);
  const top = curb + hx * slope;
  // The underside: the slopes SLOPE_DEPTH lower, meeting the curb's top `inset` in from the eaves; the gables' inner faces at ±`inner`.
  const [under, inset, inner] = [top - SLOPE_DEPTH, SLOPE_DEPTH / slope, hz - GABLE_END];
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  // The outer slopes and gable triangles, facing out.
  b.polygon([v(hx, curb, hz), v(hx, curb, -hz), v(0, top, -hz), v(0, top, hz)]);
  b.polygon([v(-hx, curb, -hz), v(-hx, curb, hz), v(0, top, hz), v(0, top, -hz)]);
  b.polygon([v(-hx, curb, hz), v(hx, curb, hz), v(0, top, hz)]);
  b.polygon([v(hx, curb, -hz), v(-hx, curb, -hz), v(0, top, -hz)]);
  // On the curb: each slope's foot along the whole length, and each gable's between them, facing down.
  b.polygon([v(hx - inset, curb, -hz), v(hx, curb, -hz), v(hx, curb, hz), v(hx - inset, curb, hz)]);
  b.polygon([v(-hx, curb, -hz), v(-hx + inset, curb, -hz), v(-hx + inset, curb, hz), v(-hx, curb, hz)]);
  b.polygon([v(-hx + inset, curb, inner), v(hx - inset, curb, inner), v(hx - inset, curb, hz), v(-hx + inset, curb, hz)]);
  b.polygon([v(-hx + inset, curb, -hz), v(hx - inset, curb, -hz), v(hx - inset, curb, -inner), v(-hx + inset, curb, -inner)]);
  // The attic between the gables: the slopes' undersides and the gables' inner faces, facing into it.
  b.polygon([v(hx - inset, curb, -inner), v(hx - inset, curb, inner), v(0, under, inner), v(0, under, -inner)]);
  b.polygon([v(-hx + inset, curb, inner), v(-hx + inset, curb, -inner), v(0, under, -inner), v(0, under, inner)]);
  b.polygon([v(hx - inset, curb, inner), v(-hx + inset, curb, inner), v(0, under, inner)]);
  b.polygon([v(-hx + inset, curb, -inner), v(hx - inset, curb, -inner), v(0, under, -inner)]);
  const made = b.build();
  gables.set(key, made);
  return made;
}
const gables = new Map<string, THREE.BufferGeometry>();

export const roofSteps: readonly StepDef[] = [
  {
    id: 'hunt-roof',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Close the roofs and the hall skylights',
    detail: "A low hipped roof closes over the Great Hall's domes round a long glazed skylight; the wings and the galleries behind get flat roofs with skylights, and the building opens in December 1902.",
    motion: { kind: 'drop', distance: 8 },
    stagger: 'order',
    weight: 1.2,
    build(kit) {
      // Flat roofs first: the wings (inside their parapets) and the galleries behind the hall round the stair hall: plaster ceilings under a lead skin.
      const flat = (x0: number, z0: number, x1: number, z1: number, top: number): void => {
        box(kit, palette.plaster, [x0, top - 0.4, z0], [x1, top - 0.05, z1], 0);
        box(kit, palette.roofLead, [x0, top - 0.05, z0], [x1, top, z1], 0);
      };
      flat(EXT_SOUTH_X + 1.2, HALL_WEST_WALL_Z, -HALL_END_WALL_X, EXT_FACE_Z - EXT_WALL_T, WING_ROOF_Y);
      flat(HALL_END_WALL_X, HALL_WEST_WALL_Z, EXT_NORTH_X - 1.2, EXT_FACE_Z - EXT_WALL_T, WING_ROOF_Y);
      flat(EXT_SOUTH_X + 1.2, BACK_Z, -STAIR_HALL_OUTER_X, HALL_WEST_WALL_Z, GALLERY_ROOF_Y);
      flat(STAIR_HALL_OUTER_X, BACK_Z, EXT_NORTH_X - 1.2, HALL_WEST_WALL_Z, GALLERY_ROOF_Y);
      flat(-STAIR_HALL_OUTER_X, BACK_Z, STAIR_HALL_OUTER_X, CROSS_HALL_FRONT_Z - 0.8, GALLERY_ROOF_Y);
      // The Grand Staircase's pitched lead roof over its barrel vault, from the hall's west wall to the stair hall's end wall.
      const length = HALL_WEST_WALL_Z - CROSS_HALL_FRONT_Z + 0.8;
      const stair = ridgeSkylight({ width: 2 * STAIR_HALL_OUTER_X + 0.4, length, pitch: 28, curbHeight: 0.3, bays: 8 });
      const at0 = at(0, STAIR_WALL_TOP_Y, HALL_WEST_WALL_Z - length / 2);
      kit.add(stair.frame, palette.roofLead, at0, 1);
      kit.add(leadGable(2 * STAIR_HALL_OUTER_X + 0.4, length, 28, 0.3), palette.roofLead, at0, 1);
      // The wings' glazed hip skylights (R1).
      const wing = hippedSkylight({ width: 10, length: 24, pitch: 30, curbHeight: 0.5, bays: 8 });
      for (const s of [-1, 1]) {
        const m = at(s * 39, WING_ROOF_Y, -16, 0);
        kit.add(wing.frame, palette.metalDark, m, 2);
        kit.add(wing.glass, palette.glass, m, 2);
      }
      // The Great Hall: the hipped roof, its curb and the long skylight over the domes.
      kit.add(hallRoof().top, palette.roofLead, new THREE.Matrix4(), 3);
      kit.add(hallRoof().under, palette.plaster, new THREE.Matrix4(), 3);
      // Pitched so its ridge meets GREAT_HALL_RIDGE_Y over a half-width of 7.2 m.
      const pitch = (Math.atan((GREAT_HALL_RIDGE_Y - CURB.y - CURB.height) / ((CURB.z1 - CURB.z0) / 2)) * 180) / Math.PI;
      const sky = hippedSkylight({ width: CURB.z1 - CURB.z0, length: 2 * CURB.x, pitch, curbHeight: CURB.height, bays: 12 });
      const m = at(0, CURB.y, (CURB.z0 + CURB.z1) / 2, Math.PI / 2);
      kit.add(sky.frame, palette.metalDark, m, 4);
      kit.add(sky.glass, palette.glass, m, 4);
    },
  },
];
