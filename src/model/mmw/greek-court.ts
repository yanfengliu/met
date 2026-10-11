/**
 * The Leon Levy and Shelby White Court (gallery 162), the Roman court of the south end pavilion (Wing K): McKim, Mead & White finished it in 1926 (opened 6 April
 * 1926, Heckscher pp. 51–53); Kevin Roche's restoration reopened it on 20 April 2007 with a second storey and a raised skylight (interior.md).
 * Plan (map, world frame): the court with its porticoes X −139.25..−99.35 by Z −32.05..−2.5; a peristyle of 16 columns, rows at Z −24.93 and −10.27 with columns at
 * X −131.52, −126.75, −121.80, −116.86, −111.91, −107.15, the short rows at X −131.52 and −107.15 carrying two more at Z −20.10 and −15.10; two more columns in each end
 * opening (X −139.25, −99.37); a round basin about 3 m across at the centre (X −119.32, Z −17.6).
 * Order (P6, A. Balet 2008, viewed 2026-10-11): tall fluted Roman Doric columns on Attic bases under a full entablature; above it, the 2007 storey of Ionic half-columns
 * framing lattice-grilled windows; the floor dark polished stone with white inlay round a green marble field. Heights E from P6 against the 4.11 m main floor.
 */
import { CylinderGeometry, Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { column, hippedSkylight, lathe, MeshBuilder, moulding, ProfilePen } from '../lib/index.js';
import { palette } from '../palette.js';
import { LEVEL_1, LEVEL_2_FRONT, ROOF_Y, SLAB, SOUTH_HIP_RISE } from './dims.js';
import { extrudeOutline } from './facade-parts.js';
import { mmwMaterials } from './materials.js';
import { merged } from './merge.js';
import { addBox, placed } from './shapes.js';
import { inwardLoop } from './shapes.js';
import { ROMAN_COURT, ROMAN_WELL } from './wings.js';
import type { Rect } from './wings.js';

const [CX0, CZ0, CX1, CZ1] = ROMAN_COURT;
const ROW_X = [-131.52, -126.75, -121.8, -116.86, -111.91, -107.15] as const;
const ROW_Z = [-24.93, -10.27] as const;
const SHORT_Z = [-20.1, -15.1] as const;
const END_X = [-139.25, -99.37] as const;
const PX0 = ROW_X[0];
const PX1 = ROW_X[5];
const PZ0 = ROW_Z[0];
const PZ1 = ROW_Z[1];
const BASIN = { x: -119.32, z: -17.6, radius: 1.5 } as const;
/** Lower order: fluted Roman Doric, about 8.5 diameters (P6). E. */
const DORIC_D = 0.66;
const DORIC_H = 5.6;
const ENTABLATURE_H = 1.2;
const ENTABLATURE_TOP = LEVEL_1 + DORIC_H + ENTABLATURE_H;
/** The 2007 storey: Ionic half-columns on a low podium, under a lighter entablature. E. */
const PODIUM = 0.45;
const IONIC_D = 0.5;
const IONIC_H = 4.4;
const UPPER_ENTABLATURE = 0.8;
const UPPER_WALL = 0.45;
const SKYLIGHT_Y = ROOF_Y + 0.4 + SOUTH_HIP_RISE;

/** Every peristyle column's plan position: the two long rows and the short rows' intermediate columns. */
const PERISTYLE: readonly (readonly [number, number])[] = [...ROW_Z.flatMap((z) => ROW_X.map((x) => [x, z] as const)), ...[PX0, PX1].flatMap((x) => SHORT_Z.map((z) => [x, z] as const))];

/** The peristyle's column line, and that rectangle grown or shrunk by `d` (positive grows it, away from the court's centre). */
const COLUMN_LINE: Rect = [PX0, PZ0, PX1, PZ1];
const grow = ([x0, z0, x1, z1]: Rect, d: number): Rect => [x0 - d, z0 - d, x1 + d, z1 + d];

function buildFloor(kit: Kit): void {
  addBox(kit, mmwMaterials.marbleDark, CX0, LEVEL_1, CZ0, CX1, LEVEL_1 + 0.03, CZ1, 0);
  // The green field inside the peristyle, framed by a white band, and white inlay lines down the porticoes.
  addBox(kit, mmwMaterials.marbleGreen, PX0 + 1.4, LEVEL_1 + 0.03, PZ0 + 1.4, PX1 - 1.4, LEVEL_1 + 0.04, PZ1 - 1.4, 1);
  const w = 0.25;
  for (const [x0, z0, x1, z1] of [
    [PX0 + 1.0, PZ0 + 1.0, PX1 - 1.0, PZ0 + 1.0 + w],
    [PX0 + 1.0, PZ1 - 1.0 - w, PX1 - 1.0, PZ1 - 1.0],
    [PX0 + 1.0, PZ0 + 1.0, PX0 + 1.0 + w, PZ1 - 1.0],
    [PX1 - 1.0 - w, PZ0 + 1.0, PX1 - 1.0, PZ1 - 1.0],
    [CX0 + 1.2, CZ0 + 3.4, CX1 - 1.2, CZ0 + 3.4 + 0.12],
    [CX0 + 1.2, CZ1 - 3.4 - 0.12, CX1 - 1.2, CZ1 - 3.4],
  ] as const) addBox(kit, mmwMaterials.marbleWhite, x0, LEVEL_1 + 0.03, z0, x1, LEVEL_1 + 0.045, z1, 2);
}

/** The 1926 peristyle: twenty fluted Doric columns, the entablature round the court and over the end openings, and the porticoes' flat ceilings. */
function buildPeristyle(kit: Kit): void {
  const shaft = column({ order: 'doric', diameter: DORIC_D, height: DORIC_H, fluted: true });
  PERISTYLE.forEach(([x, z], i) => { kit.add(shaft, palette.limestone, placed(x, LEVEL_1, z), i); });
  END_X.forEach((x, k) => {
    SHORT_Z.forEach((z, j) => {
      kit.add(shaft, palette.limestone, placed(x, LEVEL_1, z), 20 + k * 2 + j);
    });
  });
  const top = LEVEL_1 + DORIC_H;
  const half = 0.45;
  // The entablature's beam round the peristyle and across the end openings.
  addBox(kit, palette.limestone, PX0 - half, top, PZ0 - half, PX1 + half, ENTABLATURE_TOP, PZ0 + half, 30);
  addBox(kit, palette.limestone, PX0 - half, top, PZ1 - half, PX1 + half, ENTABLATURE_TOP, PZ1 + half, 30);
  addBox(kit, palette.limestone, PX0 - half, top, PZ0 + half, PX0 + half, ENTABLATURE_TOP, PZ1 - half, 30);
  addBox(kit, palette.limestone, PX1 - half, top, PZ0 + half, PX1 + half, ENTABLATURE_TOP, PZ1 - half, 30);
  for (const x of END_X) addBox(kit, palette.limestone, x - half, top, -24.4, x + half, ENTABLATURE_TOP, -10.8, 30);
  // Its architrave, frieze and cornice mouldings on the court side.
  const identity = new Matrix4();
  const face = grow(COLUMN_LINE, -half);
  const lines = merged('roman-court-entablature', [
    [moulding({ profile: 'architrave', path: inwardLoop(face, top), closed: true, height: 0.42, projection: 0.06 })],
    [moulding({ profile: 'cornice-plain', path: inwardLoop(face, top + 0.82), closed: true, height: 0.38, projection: 0.34 })],
  ]);
  kit.add(lines, palette.limestone, identity, 31);
  // The porticoes' flat ceilings, from the beam to the court's walls.
  const y0 = ENTABLATURE_TOP - 0.25;
  for (const [x0, z0, x1, z1] of [
    [CX0, CZ0, CX1, PZ0 - half],
    [CX0, PZ1 + half, CX1, CZ1],
    [CX0, PZ0 - half, PX0 - half, PZ1 + half],
    [PX1 + half, PZ0 - half, CX1, PZ1 + half],
  ] as const) addBox(kit, mmwMaterials.ceilingPlaster, x0, y0, z0, x1, ENTABLATURE_TOP, z1, 32);
}

let basinCache: { readonly stone: BufferGeometry; readonly water: BufferGeometry } | null = null;

/** The round basin: a moulded marble bowl on a low step, its water 0.1 m under the rim. Origin at the floor under its centre. */
function basin(): { readonly stone: BufferGeometry; readonly water: BufferGeometry } {
  if (basinCache !== null) return basinCache;
  const r = BASIN.radius;
  const profile = new ProfilePen(0, 0)
    .to(r + 0.25, 0)
    .to(r + 0.25, 0.12)
    .to(r + 0.05, 0.14)
    .to(r + 0.05, 0.55)
    .to(r + 0.12, 0.6)
    .to(r + 0.12, 0.68)
    .to(r - 0.1, 0.68)
    .to(r - 0.1, 0.25)
    .to(0, 0.25)
    .open();
  const water = new CylinderGeometry(r - 0.11, r - 0.11, 0.02, 32);
  basinCache = { stone: lathe(profile, { segments: 40 }), water: merged('roman-court-water', [[water, new Matrix4().makeTranslation(0, 0.57, 0)]]) };
  return basinCache;
}

let pedestalStatue: BufferGeometry | null = null;

/** A white marble figure, standing: a simple draped column of stone 1.9 m tall with a head. Origin at its base. */
function statue(): BufferGeometry {
  if (pedestalStatue !== null) return pedestalStatue;
  const b = new MeshBuilder();
  const outline: [number, number][] = [
    [-0.24, 0],
    [0.24, 0],
    [0.22, 0.9],
    [0.26, 1.4],
    [0.17, 1.62],
    [0.1, 1.68],
    [0.12, 1.86],
    [0, 1.92],
    [-0.12, 1.86],
    [-0.1, 1.68],
    [-0.17, 1.62],
    [-0.26, 1.4],
    [-0.22, 0.9],
  ];
  extrudeOutline(b, outline, 0.32);
  pedestalStatue = b.build();
  return pedestalStatue;
}

/** The basin at the centre, and marble figures on dark pedestals round the peristyle (P6). */
function buildFountain(kit: Kit): void {
  const bowl = basin();
  kit.add(bowl.stone, mmwMaterials.marbleWhite, placed(BASIN.x, LEVEL_1, BASIN.z), 0);
  kit.add(bowl.water, palette.water, placed(BASIN.x, LEVEL_1, BASIN.z), 0);
  const figure = statue();
  const spots = [
    [-129.1, -22.4], [-124.2, -22.4], [-114.4, -22.4], [-109.5, -22.4],
    [-129.1, -12.8], [-124.2, -12.8], [-114.4, -12.8], [-109.5, -12.8],
    [-136.0, -28.5], [-102.6, -28.5], [-136.0, -6.0], [-102.6, -6.0],
  ] as const;
  spots.forEach(([x, z], i) => {
    addBox(kit, mmwMaterials.pedestalGrey, x - 0.45, LEVEL_1, z - 0.45, x + 0.45, LEVEL_1 + 1.15, z + 0.45, 1 + i);
    kit.add(figure, mmwMaterials.marbleWhite, placed(x, LEVEL_1 + 1.15, z, (i * Math.PI) / 3), 1 + i);
  });
}

let gridCache: BufferGeometry | null = null;

/** A square window's lattice grille: a frame and diagonal bars, 1.5 m square, front toward +Z, origin at its bottom centre (P6). */
function latticeGrille(): BufferGeometry {
  if (gridCache !== null) return gridCache;
  const b = new MeshBuilder();
  const s = 1.5;
  const f = 0.07;
  b.box([-s / 2, 0, -0.04], [s / 2, f, 0.04]);
  b.box([-s / 2, s - f, -0.04], [s / 2, s, 0.04]);
  b.box([-s / 2, f, -0.04], [-s / 2 + f, s - f, 0.04]);
  b.box([s / 2 - f, f, -0.04], [s / 2, s - f, 0.04]);
  // Diagonal bars both ways: the line x − y' = c (y' from the centre) crosses the square in a chord (2h − |c|)√2 long, centred at (c/2, −c/2); x + y' = c mirrors it.
  const bar = new CylinderGeometry(0.02, 0.02, 1, 4);
  const h = s / 2 - f;
  for (const c of [-0.9, -0.45, 0, 0.45, 0.9]) {
    const length = (2 * h - Math.abs(c)) * Math.SQRT2;
    if (length < 0.1) continue;
    for (const dir of [1, -1]) {
      const m = new Matrix4().makeTranslation(c / 2, s / 2 - (dir * c) / 2, 0).multiply(new Matrix4().makeRotationZ((-dir * Math.PI) / 4)).multiply(new Matrix4().makeScale(1, length, 1));
      b.append(bar, m);
    }
  }
  gridCache = b.build();
  return gridCache;
}

/** The 2007 storey: walls on the light well's line from the entablature to the second floor, Ionic half-columns over the Doric ones, grilled windows between, and an entablature. */
function buildUpperStorey(kit: Kit): void {
  const [wx0, wz0, wx1, wz1] = ROMAN_WELL;
  const t = UPPER_WALL / 2;
  const y0 = ENTABLATURE_TOP;
  const y1 = LEVEL_2_FRONT - SLAB;
  // Walls between the entablature and the second floor, straddling the well's line like the second floor's own.
  addBox(kit, palette.plaster, wx0 - t, y0, wz0 - t, wx1 + t, y1, wz0 + t, 0);
  addBox(kit, palette.plaster, wx0 - t, y0, wz1 - t, wx1 + t, y1, wz1 + t, 0);
  addBox(kit, palette.plaster, wx0 - t, y0, wz0 + t, wx0 + t, y1, wz1 - t, 0);
  addBox(kit, palette.plaster, wx1 - t, y0, wz0 + t, wx1 + t, y1, wz1 - t, 0);
  // Ionic half-columns on the walls' inner faces, over the Doric columns, on a podium band: their axes on the face, half embedded.
  const ionic = column({ order: 'ionic', diameter: IONIC_D, height: IONIC_H, fluted: false, detail: 'low' });
  const podiumTop = y0 + PODIUM;
  const [fx0, fz0, fx1, fz1] = grow(ROMAN_WELL, -t);
  let order = 10;
  for (const x of ROW_X) for (const z of [fz0, fz1]) kit.add(ionic, palette.limestone, placed(x, podiumTop, z), order++);
  for (const x of [fx0, fx1]) for (const z of SHORT_Z) kit.add(ionic, palette.limestone, placed(x, podiumTop, z), order++);
  const identity = new Matrix4();
  const face = grow(ROMAN_WELL, -t);
  const lines = merged('roman-court-upper', [
    [moulding({ profile: 'plinth', path: inwardLoop(face, y0), closed: true, height: PODIUM, projection: 0.12 })],
    [moulding({ profile: 'cornice-plain', path: inwardLoop(face, podiumTop + IONIC_H), closed: true, height: UPPER_ENTABLATURE, projection: 0.5 })],
  ]);
  kit.add(lines, palette.limestone, identity, 30);
  // Lattice-grilled windows midway between the half-columns on the long sides and the ends.
  const grille = latticeGrille();
  const sill = podiumTop + 0.9;
  for (let k = 0; k + 1 < ROW_X.length; k += 1) {
    const x = ((ROW_X[k] ?? 0) + (ROW_X[k + 1] ?? 0)) / 2;
    kit.add(grille, palette.metalDark, placed(x, sill, wz0 + t, 0), 40 + k);
    kit.add(grille, palette.metalDark, placed(x, sill, wz1 - t, Math.PI), 40 + k);
  }
  for (const z of [(PZ0 + SHORT_Z[0]) / 2, (SHORT_Z[0] + SHORT_Z[1]) / 2, (SHORT_Z[1] + PZ1) / 2]) {
    kit.add(grille, palette.metalDark, placed(wx0 + t, sill, z, Math.PI / 2), 50);
    kit.add(grille, palette.metalDark, placed(wx1 - t, sill, z, -Math.PI / 2), 50);
  }
}

/** The 2007 skylight over the light well, two storeys above the court: a glazed hip on the well's curb. */
function buildSkylight(kit: Kit): void {
  const [wx0, wz0, wx1, wz1] = ROMAN_WELL;
  const glass = hippedSkylight({ width: wz1 - wz0, length: wx1 - wx0, pitch: 16, curbHeight: 0.3, bays: 10 });
  const m = placed((wx0 + wx1) / 2, SKYLIGHT_Y, (wz0 + wz1) / 2, Math.PI / 2);
  kit.add(glass.frame, palette.metalDark, m, 0);
  kit.add(glass.glass, palette.glass, m, 0);
}

const VIEW = { kind: 'preset', id: 'int-greek-roman-court' } as const;

export const romanCourtSteps: readonly StepDef[] = [
  {
    id: 'greek-court-floor',
    chapter: 'mckim-mead-white-1926',
    year: '1926',
    title: 'Lay the Roman court\'s marble floor',
    detail: 'The court of the south end pavilion, opened on 6 April 1926: dark polished stone with white inlay round a green marble field.',
    motion: { kind: 'rise', distance: 1.5 },
    stagger: 'order',
    focus: VIEW,
    build: buildFloor,
  },
  {
    id: 'greek-court-peristyle',
    chapter: 'mckim-mead-white-1926',
    year: '1926',
    title: 'Raise the court\'s Doric peristyle',
    detail: 'Sixteen fluted Doric columns ring the court, two more stand in each end opening, under a full entablature over the porticoes\' flat ceilings.',
    motion: { kind: 'rise' },
    stagger: 'order',
    focus: VIEW,
    build: buildPeristyle,
  },
  {
    id: 'greek-court-fountain',
    chapter: 'mckim-mead-white-1926',
    year: '1926',
    title: 'Set the basin and the marbles',
    detail: 'A round marble basin at the centre of the peristyle and marble figures on dark pedestals in the porticoes.',
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: VIEW,
    build: buildFountain,
  },
];

export const greekCourt2007: readonly StepDef[] = [
  {
    id: 'greek-court-upper-storey',
    chapter: 'koch-plaza-2014',
    year: '2007',
    title: 'Add the Roman court\'s upper storey',
    detail: 'Kevin Roche\'s restoration, reopened 20 April 2007, raises the court a storey: Ionic half-columns over the Doric ones, framing grilled windows.',
    motion: { kind: 'rise' },
    stagger: 'order',
    focus: VIEW,
    build: buildUpperStorey,
  },
  {
    id: 'greek-court-skylight',
    chapter: 'koch-plaza-2014',
    year: '2007',
    title: 'Glaze the raised skylight',
    detail: 'The skylight, one storey above the court since 1926, rises another storey in 2007, making a two-storey skylit hall under the hipped roof.',
    motion: { kind: 'drop', distance: 5 },
    stagger: 'none',
    focus: { kind: 'preset', id: 'aerial-sw' },
    build: buildSkylight,
  },
];
