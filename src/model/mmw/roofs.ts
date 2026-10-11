/**
 * Roofs of the McKim, Mead & White blocks as they stand today, read from the NYC orthophoto 2018 (ref-plan-ortho, docs/research/exterior-images.md #9),
 * viewed rotated into the grid frame with this area's blocks overlaid (2026-10-11):
 * - north link: flat deck, a brown roof strip over the front galleries, a gridded skylight over gallery 208 (X 62.5..75.8, Z −23.8..−10.0) and light well (3);
 * - north end pavilion: flat deck round the Astor Court (whose 1981 skylight fills its opening), a glazed ridge over the front range (Z −2.7..+8.6) and the back strip;
 * - Morgan wing: a lower deck round the Arms and Armor Court's gabled clerestory roof, a field of glazed ridges over X 100..117 and light well (5), rooftop plant;
 * - south link: flat deck, glazed ridges over the front range and gallery 153 (X −83.0..−56.6, Z −18.6..−13.7), light well (1) and the mechanical penthouse (exterior.md R6);
 * - south end pavilion: a hipped metal roof from the parapet up to the curb of the Roman court's skylight, whose glass is the 2007 step's.
 * Light wells: exterior.md section 2, open from the floor below to the sky, lined with walls.
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder, ridgeSkylight } from '../lib/index.js';
import { palette } from '../palette.js';
import { LEVEL_2_FRONT, LEVEL_2_NORTH, MORGAN_ROOF_Y, ROOF_Y, SLAB, SOUTH_HIP_RISE } from './dims.js';
import { mmwMaterials } from './materials.js';
import { merged } from './merge.js';
import { addBox, placed } from './shapes.js';
import { ARMOR_COURT, ASTOR_COURT, ROMAN_WELL, subtract, WINGS } from './wings.js';
import type { Rect } from './wings.js';

/** The Arms and Armor Court's clerestory and gabled roof: wider than the court along X, over its end galleries (orthophoto X 52.2..99.5, Z −87..−72). */
export const ARMOR_ROOF: Rect = [52.2, ARMOR_COURT[1], 99.5, ARMOR_COURT[3]];

const NORTH_SKYLIGHT_208: Rect = [62.5, -23.8, 75.8, -10.0];
const NORTH_FRONT_RANGE: Rect = [49.4, -10.95, 88.6, -3.2];
const NORTH_PAVILION_RIDGE: Rect = [90.5, -2.7, 151.4, 8.4];
const NORTH_PAVILION_BACK: Rect = [100.0, -40.5, 151.9, -33.5];
const MORGAN_RIDGES: Rect = [100.0, -95.2, 117.2, -41.3];
const SOUTH_SKYLIGHT_153: Rect = [-83.0, -18.6, -56.6, -13.7];
const SOUTH_FRONT_RANGE: Rect = [-87.5, -10.0, -50.0, -3.4];
const SOUTH_PENTHOUSE: Rect = [-87.3, -68.2, -62.0, -41.0];

const WELL_WALL = 0.4;

function deck(kit: Kit, material: Material, rects: readonly Rect[], holes: readonly Rect[], top: number, order: number): void {
  for (const rect of rects) for (const [x0, z0, x1, z1] of subtract(rect, holes)) addBox(kit, material, x0, top - SLAB, z0, x1, top, z1, order);
}

/** Walls round a light well or opening, from `y0` to `y1`, standing just inside its edges. */
function lining(kit: Kit, [x0, z0, x1, z1]: Rect, y0: number, y1: number, order: number): void {
  const t = WELL_WALL;
  addBox(kit, palette.limestone, x0, y0, z0, x1, y1, z0 + t, order);
  addBox(kit, palette.limestone, x0, y0, z1 - t, x1, y1, z1, order);
  addBox(kit, palette.limestone, x0, y0, z0 + t, x0 + t, y1, z1 - t, order);
  addBox(kit, palette.limestone, x1 - t, y0, z0 + t, x1, y1, z1 - t, order);
}

/** A glazed ridge over a rectangle, its ridge along X or Z, standing on the deck at `y`. */
interface Ridge {
  readonly rect: Rect;
  readonly y: number;
  readonly alongX: boolean;
  readonly pitch: number;
}

/** A step's glazed ridges as one frame geometry and one glass geometry (one instanced mesh each), placed in world coordinates. */
function ridges(kit: Kit, key: string, list: readonly Ridge[], order: number): void {
  const frames: [BufferGeometry, Matrix4][] = [];
  const panes: [BufferGeometry, Matrix4][] = [];
  for (const { rect: [x0, z0, x1, z1], y, alongX, pitch } of list) {
    const across = alongX ? z1 - z0 : x1 - x0;
    const length = alongX ? x1 - x0 : z1 - z0;
    const bays = Math.max(2, Math.round(length / 2.4));
    const g = ridgeSkylight({ width: across, length, pitch, bays, curbHeight: 0.35 });
    const m = placed((x0 + x1) / 2, y, (z0 + z1) / 2, alongX ? Math.PI / 2 : 0);
    frames.push([g.frame, m]);
    panes.push([g.glass, m]);
  }
  const identity = new Matrix4();
  kit.add(merged(key + '-frames', frames), palette.metalDark, identity, order);
  kit.add(merged(key + '-glass', panes), palette.glass, identity, order);
}

const wing = (block: string): (typeof WINGS)[number] => {
  const found = WINGS.find((w) => w.block === block);
  if (found === undefined) throw new Error(`roofs: no wing for block "${block}"; wings.ts names north-e, north-h, north-f, south-j and south-k.`);
  return found;
};
const interior = (block: string): readonly Rect[] => wing(block).storeys.find((s) => s.level === '1')?.slab ?? [];

/** The north campaign's roofs (the Arms and Armor Court's clerestory roof is its own step). */
export function buildNorthRoofs(kit: Kit): void {
  const e = interior('north-e');
  const well3 = wing('north-e').lightWells[0]?.rect;
  const eHoles = [NORTH_SKYLIGHT_208, NORTH_FRONT_RANGE, ...(well3 === undefined ? [] : [well3])];
  deck(kit, mmwMaterials.roofDeck, e, eHoles, ROOF_Y, 0);
  deck(kit, palette.roofLead, [NORTH_FRONT_RANGE], [], ROOF_Y + 0.25, 1);
  if (well3 !== undefined) lining(kit, well3, LEVEL_2_FRONT, ROOF_Y + 0.6, 3);

  const h = interior('north-h');
  deck(kit, mmwMaterials.roofDeck, h, [ASTOR_COURT, NORTH_PAVILION_RIDGE, NORTH_PAVILION_BACK], ROOF_Y, 10);
  deck(kit, mmwMaterials.roofDeck, [NORTH_PAVILION_RIDGE, NORTH_PAVILION_BACK], [], ROOF_Y - 0.6, 11);
  lining(kit, ASTOR_COURT, ROOF_Y - SLAB, ROOF_Y + 0.5, 14);

  const f = interior('north-f');
  const well5 = wing('north-f').lightWells[0]?.rect;
  deck(kit, mmwMaterials.roofDeck, f, [ARMOR_ROOF, MORGAN_RIDGES, ...(well5 === undefined ? [] : [well5])], MORGAN_ROOF_Y, 20);
  deck(kit, mmwMaterials.roofDeck, [MORGAN_RIDGES], [], MORGAN_ROOF_Y - 0.4, 21);
  const count = 13;
  const [rx0, rz0, rx1, rz1] = MORGAN_RIDGES;
  const pitchWidth = (rz1 - rz0) / count;
  ridges(
    kit,
    'north-ridges',
    [
      { rect: NORTH_SKYLIGHT_208, y: ROOF_Y, alongX: false, pitch: 16 },
      { rect: NORTH_PAVILION_RIDGE, y: ROOF_Y - 0.6, alongX: true, pitch: 24 },
      { rect: NORTH_PAVILION_BACK, y: ROOF_Y - 0.6, alongX: true, pitch: 26 },
      ...Array.from({ length: count }, (_, k): Ridge => ({ rect: [rx0, rz0 + k * pitchWidth, rx1, rz0 + (k + 1) * pitchWidth], y: MORGAN_ROOF_Y - 0.4, alongX: true, pitch: 32 })),
    ],
    22,
  );
  if (well5 !== undefined) lining(kit, well5, LEVEL_2_NORTH, MORGAN_ROOF_Y + 0.6, 40);
  // Steps up from the Morgan wing's lower deck to the link's and the pavilion's.
  addBox(kit, palette.limestone, 49.4, MORGAN_ROOF_Y - SLAB, -38.5, 88.6, ROOF_Y + 0.6, -37.9, 41);
  addBox(kit, palette.limestone, 88.6, MORGAN_ROOF_Y - SLAB, -41.3, 118.0, ROOF_Y + 0.6, -40.7, 41);
  // Rooftop plant over the auditorium and the court's north end (orthophoto).
  for (let k = 0; k < 6; k += 1) addBox(kit, mmwMaterials.plant, 55.5 + k * 4.0, MORGAN_ROOF_Y, -49.0, 58.3 + k * 4.0, MORGAN_ROOF_Y + 2.2, -43.5, 42);
  for (const [x, z] of [[88.5, -62.5], [93.5, -62.5], [88.5, -55.5], [93.5, -55.5]] as const) addBox(kit, mmwMaterials.plant, x - 2.2, MORGAN_ROOF_Y, z - 2.2, x + 2.2, MORGAN_ROOF_Y + 1.6, z + 2.2, 43);
}

/** The south end pavilion's hipped roof: four slopes from the eave rectangle at `y0` up to the opening's rectangle at `y0 + rise`, with undersides and edges. */
function hipRing(outer: Rect, inner: Rect, y0: number, rise: number): MeshBuilder {
  const b = new MeshBuilder();
  const t = 0.3;
  const [ox0, oz0, ox1, oz1] = outer;
  const [ix0, iz0, ix1, iz1] = inner;
  const y1 = y0 + rise;
  const o = [new Vector3(ox0, y0, oz1), new Vector3(ox1, y0, oz1), new Vector3(ox1, y0, oz0), new Vector3(ox0, y0, oz0)];
  const i = [new Vector3(ix0, y1, iz1), new Vector3(ix1, y1, iz1), new Vector3(ix1, y1, iz0), new Vector3(ix0, y1, iz0)];
  const down = (v: Vector3): Vector3 => v.clone().setY(v.y - t);
  for (let k = 0; k < 4; k += 1) {
    const a = o[k] ?? new Vector3();
    const c = o[(k + 1) % 4] ?? new Vector3();
    const ia = i[k] ?? new Vector3();
    const ic = i[(k + 1) % 4] ?? new Vector3();
    // Top slope (counter-clockwise seen from above), underside, the eave's edge facing out, the opening's edge facing in.
    b.polygon([a, c, ic, ia]);
    b.polygon([down(ia), down(ic), down(c), down(a)]);
    b.polygon([down(a), down(c), c, a]);
    b.polygon([ia, ic, down(ic), down(ia)]);
  }
  return b;
}

let southHip: ReturnType<MeshBuilder['build']> | null = null;

/** The south campaign's roofs. */
export function buildSouthRoofs(kit: Kit): void {
  const j = interior('south-j');
  const well1 = wing('south-j').lightWells[0]?.rect;
  deck(kit, mmwMaterials.roofDeck, j, [SOUTH_SKYLIGHT_153, SOUTH_FRONT_RANGE, ...(well1 === undefined ? [] : [well1])], ROOF_Y, 0);
  deck(kit, mmwMaterials.roofDeck, [SOUTH_SKYLIGHT_153, SOUTH_FRONT_RANGE], [], ROOF_Y - 0.5, 1);
  ridges(
    kit,
    'south-ridges',
    [
      { rect: SOUTH_SKYLIGHT_153, y: ROOF_Y - 0.5, alongX: true, pitch: 28 },
      { rect: SOUTH_FRONT_RANGE, y: ROOF_Y - 0.5, alongX: true, pitch: 22 },
    ],
    2,
  );
  if (well1 !== undefined) lining(kit, well1, LEVEL_2_FRONT, ROOF_Y + 0.6, 4);
  const [px0, pz0, px1, pz1] = SOUTH_PENTHOUSE;
  addBox(kit, mmwMaterials.plant, px0, ROOF_Y, pz0, px1, ROOF_Y + 3.6, pz1, 5);
  addBox(kit, palette.roofLead, px0 - 0.2, ROOF_Y + 3.6, pz0 - 0.2, px1 + 0.2, ROOF_Y + 3.9, pz1 + 0.2, 6);

  // The end pavilion: a flat strip on the link's side, then the hipped roof round the court's opening.
  addBox(kit, mmwMaterials.roofDeck, -89.3, ROOF_Y - SLAB, -37.7, -88.1, ROOF_Y, -3.1, 10);
  const outer: Rect = [-150.41, -37.7, -89.3, 8.65];
  southHip ??= hipRing(outer, ROMAN_WELL, ROOF_Y + 0.4, SOUTH_HIP_RISE).build();
  kit.add(southHip, palette.roofLead, placed(0, 0, 0), 11);
  // The second-floor galleries' ceiling under the hip, open over the court's light well.
  deck(kit, mmwMaterials.roofDeck, [outer], [ROMAN_WELL], ROOF_Y, 10);
  // Lining the well up to the hip's opening, its inner faces flush with the second floor's well walls (0.225 m inside the line).
  const [wx0, wz0, wx1, wz1] = ROMAN_WELL;
  const grow = WELL_WALL - 0.225;
  lining(kit, [wx0 - grow, wz0 - grow, wx1 + grow, wz1 + grow], ROOF_Y - SLAB, ROOF_Y + 0.4 + SOUTH_HIP_RISE, 12);
}
