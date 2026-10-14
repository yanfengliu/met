/**
 * The Arms and Armor Court (gallery 371), the central hall of the Morgan wing (Wing F), opened in March 1910 as the Wing of Decorative Arts; arms and armour
 * moved in in 1956; the architecture was restored in 1991 (interior.md, The Arms and Armor Court; Heckscher p. 48).
 * Plan (map, world frame): X 57.15..92.6 by Z −86.0..−72.8, open from the main floor to its vault over exactly its own footprint; doors in the long walls
 * (map gaps at X 65.9, 74.9, 83.8); an 8 m opening at each end with a pair of columns (X 57.17 and 92.59, Z −80.85 and −77.97); the end bays open to the
 * second-floor galleries as balconies, the north one carrying an organ case (P7).
 * Section: 67 ft (20.4 m) from the floor to the vault's crown (Heckscher p. 48): a plain, slightly stilted barrel vault springing from the court's cornice, pierced by
 * ten tall round-headed windows, five a side, about 7 m apart, rising from the cornice into the vault as lunettes (P7, viewed 2026-10-11). Gabled metal roof over it
 * (NYC orthophoto 2018: X 52.2..99.5).
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { balustrade, column, MeshBuilder, moulding, surround, wall, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { banner, chandelier, mountedArmour, organCase } from './armor-figures.js';
import { extrudeOutline } from './facade-parts.js';
import { lunetteVault } from './lunette-vault.js';
import { merged } from './merge.js';
import { LEVEL_1, LEVEL_2_NORTH, MORGAN_ROOF_Y, SLAB } from './dims.js';
import { mmwMaterials } from './materials.js';
import { ARMOR_ROOF } from './roofs.js';
import { addBox, inwardLoop, placed } from './shapes.js';
import { ARMOR_COURT } from './wings.js';

const [X0, Z0, X1, Z1] = ARMOR_COURT;
const CX = (X0 + X1) / 2;
const CZ = (Z0 + Z1) / 2;
const SPAN = Z1 - Z0;
const LENGTH = X1 - X0;
/** The vault: crown 20.4 m above the floor (Heckscher p. 48), springing just above the court's cornice. E: springing from P7's proportions. */
const VAULT_CROWN_Y = LEVEL_1 + 20.4;
const VAULT_SPRING_Y = MORGAN_ROOF_Y + 1.65;
const VAULT_RISE = VAULT_CROWN_Y - VAULT_SPRING_Y;
/** Clerestory: walls from the galleries' roof to the eaves; the windows' sills just above the springing, their heads rising into the vault (P7). E. */
const CLERESTORY_FOOT = MORGAN_ROOF_Y - SLAB;
const EAVES_Y = VAULT_SPRING_Y + 4.4;
const CLERESTORY_T = 0.8;
const WINDOW_WIDTH = 3.6;
const WINDOW_SILL = VAULT_SPRING_Y + 0.2;
const WINDOW_JAMB = VAULT_SPRING_Y + 1.6;
const WINDOW_HEIGHT = WINDOW_JAMB + WINDOW_WIDTH / 2 - WINDOW_SILL;
const WINDOWS = 5;
/** Steep enough that the roof's underside clears the vault everywhere. */
const ROOF_PITCH_DEG = 34;
/** The doors in the long walls (map gaps) and the end openings' column pairs (map columns). */
const DOOR_X = [65.9, 74.9, 83.8] as const;
const END_COLUMNS_Z = [-80.85, -77.97] as const;
const COLUMN_D = 0.7;
const COLUMN_H = LEVEL_2_NORTH - SLAB - 0.75 - LEVEL_1;

const windowX = (k: number): number => X0 + (LENGTH * (k + 0.5)) / WINDOWS;

function buildFloor(kit: Kit): void {
  addBox(kit, mmwMaterials.armorFloor, X0, LEVEL_1, Z0, X1, LEVEL_1 + 0.03, Z1, 0);
  // The low platform the procession rides on, along the court's axis.
  addBox(kit, mmwMaterials.armorPlatform, 61.5, LEVEL_1, CZ - 2.2, 88.5, LEVEL_1 + 0.32, CZ + 2.2, 1);
  addBox(kit, mmwMaterials.armorFloor, 61.8, LEVEL_1 + 0.32, CZ - 1.9, 88.2, LEVEL_1 + 0.36, CZ + 1.9, 1);
}

/** Column pairs in the end openings, door surrounds, the balconies' fascia and balustrades, and the impost cornice under the vault. */
function buildArcades(kit: Kit): void {
  const shaft = column({ order: 'ionic', diameter: COLUMN_D, height: COLUMN_H, fluted: false, detail: 'medium' });
  let order = 0;
  for (const x of [X0, X1]) {
    for (const z of END_COLUMNS_Z) {
      kit.add(shaft, palette.limestone, placed(x, LEVEL_1, z), order);
      order += 1;
    }
    // The beam over each end opening, carried by the columns.
    addBox(kit, palette.limestone, x - 0.45, LEVEL_1 + COLUMN_H, Z0 + 2.55, x + 0.45, LEVEL_2_NORTH - SLAB, Z1 - 2.6, order);
  }
  const door = surround({ width: 1.75, height: 4.2, head: 'cornice', trim: 0.3 });
  for (const x of DOOR_X) {
    kit.add(door, palette.limestone, placed(x, LEVEL_1, Z0), order);
    kit.add(door, palette.limestone, placed(x, LEVEL_1, Z1, Math.PI), order);
    order += 1;
  }
  // Inside the court the mouldings hang inward from a clockwise loop.
  const loop = (y: number): [number, number, number][] => inwardLoop(ARMOR_COURT, y);
  const identity = new Matrix4();
  const lines = merged('armor-court-mouldings', [
    [moulding({ profile: 'string-course', path: loop(LEVEL_2_NORTH - SLAB - 0.15), closed: true, height: 0.75, projection: 0.35 })],
    [moulding({ profile: 'cornice-plain', path: loop(VAULT_SPRING_Y - 0.6), closed: true, height: 0.6, projection: 0.5 })],
  ]);
  kit.add(lines, palette.limestone, identity, order + 1);
  // The end walls over the balconies, from the galleries' ceiling to the vault's springing.
  for (const x of [X0, X1]) addBox(kit, palette.plaster, x - 0.3, CLERESTORY_FOOT, Z0, x + 0.3, VAULT_SPRING_Y, Z1, order + 3);
  // Stone balustrades across both balconies on the second floor (P7: turned balusters at the far end).
  const rail = balustrade({ length: SPAN - 0.9, height: 1.05, balusterSpacing: 0.32 });
  const railStone = merged('armor-court-balustrade', [[rail.rail], [rail.plinth], [rail.posts]]);
  for (const [x, turn] of [[X0 + 0.25, -Math.PI / 2], [X1 - 0.25, Math.PI / 2]] as const) {
    const m = placed(x, LEVEL_2_NORTH, CZ, turn);
    kit.add(railStone, palette.limestone, m, order + 4);
    for (const b of rail.balusters) kit.add(rail.baluster, palette.limestone, m.clone().multiply(b), order + 4);
  }
}

/** The procession of mounted armours, the banners on the long walls, two ring chandeliers, glazed cases and the organ case on the north balcony. */
function buildParade(kit: Kit): void {
  const rider = mountedArmour();
  const dark = merged('armor-rider-dark', [[rider.horse], [rider.lance]]);
  const cloths = [mmwMaterials.clothRed, mmwMaterials.clothBlue];
  // A group in mid-court on the platform, facing south toward the court's entrance from the Great Hall side (P7).
  const turn = Math.PI;
  const riders = [[69.5, -1.1], [73.5, 1.0], [77.5, -0.9], [81.5, 1.1], [85.5, -0.3]] as const;
  riders.forEach(([x, dz], i) => {
    const m = placed(x, LEVEL_1 + 0.36, CZ + dz, turn);
    kit.add(dark, palette.metalDark, m, i);
    kit.add(rider.armour, mmwMaterials.steel, m, i);
    kit.add(rider.caparison, cloths[i % 2] ?? mmwMaterials.clothRed, m, i);
  });
  // Heraldic banners on long poles from both walls, at two heights, in three colours (P7).
  const flag = banner();
  const colours = [mmwMaterials.clothRed, mmwMaterials.clothGold, mmwMaterials.clothBlue];
  const count = 8;
  for (let k = 0; k < count; k += 1) {
    const x = X0 + (LENGTH * (k + 0.5)) / count;
    const y = LEVEL_2_NORTH + (k % 2 === 0 ? 3.6 : 2.4);
    for (const [z, side] of [[Z0, 0], [Z1, 1]] as const) {
      const m = placed(x, y, z, side === 0 ? 0 : Math.PI);
      kit.add(flag.pole, palette.bronze, m, 10 + k);
      kit.add(flag.cloth, colours[(k + side) % 3] ?? mmwMaterials.clothRed, m, 10 + k);
    }
  }
  // Two ring chandeliers hung from the vault's crown.
  const drop = VAULT_CROWN_Y - (LEVEL_1 + 11.5);
  const ring = chandelier(drop);
  for (const x of [CX - LENGTH / 4, CX + LENGTH / 4]) kit.add(ring, mmwMaterials.gilt, placed(x, VAULT_CROWN_Y, CZ), 20);
  // Glazed cases against the long walls, between the doors.
  const caseXs = [61.0, 70.4, 79.4, 88.4] as const;
  for (const x of caseXs) {
    for (const [z, out] of [[Z0, 1], [Z1, -1]] as const) {
      const z0 = z + out * 0.2;
      const z1 = z + out * 1.2;
      addBox(kit, palette.metalDark, x - 1.4, LEVEL_1, Math.min(z0, z1), x + 1.4, LEVEL_1 + 0.75, Math.max(z0, z1), 21);
      addBox(kit, palette.glass, x - 1.35, LEVEL_1 + 0.75, Math.min(z0, z1) + 0.05, x + 1.35, LEVEL_1 + 2.5, Math.max(z0, z1) - 0.05, 21);
    }
  }
  // The organ case on the north balcony, its back to the end wall.
  const organ = organCase();
  const m = placed(X1 + 0.3, LEVEL_2_NORTH, CZ, -Math.PI / 2);
  kit.add(organ.case, palette.wood, m, 22);
  kit.add(organ.pipes, mmwMaterials.gilt, m, 22);
}

/** The clerestory walls with their windows, the barrel vault and the gabled roof over the court. */
function buildVault(kit: Kit): void {
  const [rx0, , rx1] = ARMOR_ROOF;
  const width = rx1 - rx0;
  const centre = (rx0 + rx1) / 2;
  const openings = Array.from({ length: WINDOWS }, (_, k) => ({ shape: 'arch' as const, x: windowX(k) - centre, y: WINDOW_SILL - CLERESTORY_FOOT, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }));
  // One wall geometry serves both sides: the north side's is the south side's turned half round, so its windows mirror about the court's centre.
  const south = wall({ width, height: EAVES_Y - CLERESTORY_FOOT, thickness: CLERESTORY_T, openings });
  const north = wall({ width, height: EAVES_Y - CLERESTORY_FOOT, thickness: CLERESTORY_T, openings: openings.map((o) => ({ ...o, x: -o.x })) });
  kit.add(south, palette.limestone, placed(centre, CLERESTORY_FOOT, Z0), 0);
  kit.add(north, palette.limestone, placed(centre, CLERESTORY_FOOT, Z1, Math.PI), 0);
  // Gable end walls.
  for (const x of [rx0, rx1]) addBox(kit, palette.limestone, x - CLERESTORY_T / 2, CLERESTORY_FOOT, Z0 - CLERESTORY_T, x + CLERESTORY_T / 2, EAVES_Y, Z1 + CLERESTORY_T, 1);
  // Clerestory glazing, set back in the reveals; seen from the court, its fronts face in.
  const glazing = windowUnit({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT, shape: 'arch', cols: 3, rows: 2, frame: 0.1, bar: 0.05 });
  const glazingMetal = merged('armor-clerestory-metal', [[glazing.frame], [glazing.bars]]);
  for (let k = 0; k < WINDOWS; k += 1) {
    for (const [z, turn] of [[Z0 - 0.4, 0], [Z1 + 0.4, Math.PI]] as const) {
      const m = placed(windowX(k), WINDOW_SILL, z, turn);
      kit.add(glazingMetal, palette.metalDark, m, 2 + k);
      kit.add(glazing.glass, palette.glass, m, 2 + k);
    }
  }
  // The vault: plain and cream-white (P7; Robinson in 1910), pierced by the windows' lunettes.
  const vault = lunetteVault({ span: SPAN, rise: VAULT_RISE, length: LENGTH, windows: Array.from({ length: WINDOWS }, (_, k) => windowX(k) - CX), width: WINDOW_WIDTH, sill: WINDOW_SILL - VAULT_SPRING_Y, jamb: WINDOW_JAMB - VAULT_SPRING_Y });
  kit.add(vault, mmwMaterials.vaultCream, placed(CX, VAULT_SPRING_Y, CZ), 8);
  // Tympana closing the vault's ends over the end walls.
  const end = tympanum();
  kit.add(end, mmwMaterials.vaultCream, placed(X0, VAULT_SPRING_Y, CZ, Math.PI / 2), 8);
  kit.add(end, mmwMaterials.vaultCream, placed(X1, VAULT_SPRING_Y, CZ, -Math.PI / 2), 8);
  // Gabled metal roof from the eaves to a ridge along the court's axis, over limestone gables.
  const roof = gableRoof();
  kit.add(roof.roof, palette.roofLead, placed(0, 0, 0), 9);
  kit.add(roof.gables, palette.limestone, placed(0, 0, 0), 9);
}

let tympanumCache: BufferGeometry | null = null;

/** The half ellipse between the vault's springing line and its intrados, 0.4 m thick, front toward +Z; origin at the springing line's centre. */
function tympanum(): BufferGeometry {
  if (tympanumCache !== null) return tympanumCache;
  const w = SPAN / 2 + 0.02;
  const outline: [number, number][] = [];
  const steps = 24;
  for (let k = 0; k <= steps; k += 1) {
    const a = (Math.PI * k) / steps;
    outline.push([w * Math.cos(a), (VAULT_RISE + 0.02) * Math.sin(a)]);
  }
  const b = new MeshBuilder();
  extrudeOutline(b, outline, 0.4);
  tympanumCache = b.build();
  return tympanumCache;
}

let gableCache: { readonly roof: BufferGeometry; readonly gables: BufferGeometry } | null = null;

/** The court's gabled roof and its two gables, in world coordinates. */
function gableRoof(): { readonly roof: BufferGeometry; readonly gables: BufferGeometry } {
  gableCache ??= gableInto(ARMOR_ROOF[0] - 0.5, ARMOR_ROOF[2] + 0.5, Z0 - CLERESTORY_T - 0.6, Z1 + CLERESTORY_T + 0.6, EAVES_Y, ROOF_PITCH_DEG);
  return gableCache;
}

export const armorCourtSteps: readonly StepDef[] = [
  {
    id: 'armor-court-floor',
    chapter: 'mckim-mead-white-1926',
    year: '1910',
    title: 'Pave the Arms and Armor Court',
    detail: 'The court at the heart of the Morgan wing, opened in March 1910 as the Wing of Decorative Arts: a warm stone floor and a low platform down its axis.',
    motion: { kind: 'rise', distance: 2 },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-arms-armor-court' },
    build: buildFloor,
  },
  {
    id: 'armor-court-arcades',
    chapter: 'mckim-mead-white-1926',
    year: '1910',
    title: 'Frame the court with columns and doors',
    detail: 'Ionic column pairs in the end openings, framed doors into the side galleries, a string course at the balconies and a cornice under the vault.',
    motion: { kind: 'rise' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-arms-armor-court' },
    build: buildArcades,
  },
  {
    id: 'armor-court-parade',
    chapter: 'mckim-mead-white-1926',
    year: '1956',
    title: 'Ride in the equestrian parade',
    detail: 'Arms and armour moved into the court in 1956: mounted armours ride in procession under heraldic banners and ring chandeliers; an organ case fills the north balcony.',
    motion: { kind: 'slide', from: [-12, 0, 0] },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-arms-armor-court' },
    build: buildParade,
  },
];

export const armorCourtVaultStep: StepDef = {
  id: 'armor-court-vault',
  chapter: 'mckim-mead-white-1926',
  year: '1910',
  title: 'Vault the court under its clerestory',
  detail: 'Ten tall round-headed clerestory windows above the galleries light a cream coffered vault 20 m over the floor, under a gabled metal roof.',
  motion: { kind: 'drop', distance: 6 },
  stagger: 'y',
  build: buildVault,
};

/** A gabled roof: two slopes from eaves at `eaves` along z0 and z1 up to a ridge midway, between x0 and x1, with undersides; and the two gable walls under it. */
function gableInto(x0: number, x1: number, z0: number, z1: number, eaves: number, pitchDeg: number): { readonly roof: BufferGeometry; readonly gables: BufferGeometry } {
  const b = new MeshBuilder();
  const zm = (z0 + z1) / 2;
  const ridge = eaves + ((z1 - z0) / 2) * Math.tan((pitchDeg * Math.PI) / 180);
  const t = 0.25;
  const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);
  // Slopes, outside then underside.
  b.polygon([v(x0, eaves, z1), v(x1, eaves, z1), v(x1, ridge, zm), v(x0, ridge, zm)]);
  b.polygon([v(x1, eaves, z0), v(x0, eaves, z0), v(x0, ridge, zm), v(x1, ridge, zm)]);
  b.polygon([v(x0, ridge - t, zm), v(x1, ridge - t, zm), v(x1, eaves - t, z1), v(x0, eaves - t, z1)]);
  b.polygon([v(x1, ridge - t, zm), v(x0, ridge - t, zm), v(x0, eaves - t, z0), v(x1, eaves - t, z0)]);
  // Eave fascias and the slopes' raking edges at the ends.
  b.polygon([v(x0, eaves - t, z1), v(x1, eaves - t, z1), v(x1, eaves, z1), v(x0, eaves, z1)]);
  b.polygon([v(x1, eaves - t, z0), v(x0, eaves - t, z0), v(x0, eaves, z0), v(x1, eaves, z0)]);
  for (const [x, side] of [[x1, 1], [x0, -1]] as const) {
    const rake = [v(x, eaves - t, z1), v(x, eaves, z1), v(x, ridge, zm), v(x, ridge - t, zm)];
    b.polygon(side > 0 ? rake.reverse() : rake);
    const back = [v(x, eaves - t, z0), v(x, ridge - t, zm), v(x, ridge, zm), v(x, eaves, z0)];
    b.polygon(side > 0 ? back.reverse() : back);
  }
  // Gables: triangular walls on the clerestory's end walls, from the eaves to under the ridge.
  const g = new MeshBuilder();
  const inset = 0.5 + CLERESTORY_T / 2;
  for (const xc of [x0 + inset, x1 - inset]) {
    const outline: [number, number][] = [
      [z0 + 0.6, eaves - 0.01],
      [zm, ridge - t - 0.02],
      [z1 - 0.6, eaves - 0.01],
    ];
    const mark = g.vertexCount;
    extrudeOutline(g, outline.map(([z, y]) => [z, y] as const), CLERESTORY_T);
    g.transform(mark, new Matrix4().makeBasis(new Vector3(0, 0, 1), new Vector3(0, 1, 0), new Vector3(1, 0, 0)).setPosition(xc, 0, 0));
  }
  return { roof: b.build(), gables: g.build() };
}
