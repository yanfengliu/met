/**
 * The Medieval Sculpture Hall (interior.md, "The Medieval Sculpture Hall"; gallery 305): Otto R. Eggers's hall of 1936-39 inside Vaux's central hall,
 * X ±14.2, Z −117.7..−83.3. Two rows of compound piers (the floor map's 14 columns at X ±7.02, the end ones half-piers) in six bays of 5.65 m, pointed
 * arcades to the aisles under the second-floor galleries, a clerestory of round-headed windows and a groin vault in white plaster (photo P8,
 * int-medieval-hall-east), and a marble floor in a white-and-black pattern (Heckscher p. 18, as quoted in interior.md). Heights are estimates
 * (interior.md: the hall's height was not found; the 15.85 m choir screen bounds it from below).
 */
import { Color, PointLight, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall, voussoirRing } from './arches.js';
import {
  HALL_ARCADE_RISE,
  HALL_ARCADE_SPRING,
  HALL_CLERESTORY_SILL_Y,
  HALL_NAVE_ROOF_EAVES_Y,
  HALL_NAVE_WALL,
  HALL_PIER,
  HALL_PIER_X,
  HALL_PIER_Z,
  HALL_VAULT_SPRING_Y,
  L1,
  L2,
  ROOF_Y,
  SLAB,
  VAUX_HALL_EAST_Z,
  VAUX_HALL_WEST_Z,
  VAUX_OCULUS_Y,
} from './constants.js';
import { INTERIOR, NAVE_OUTER_X } from './layout.js';
import { core } from './materials.js';
import { FACING, addBox, halfCylinder, keyOf, memo, placed, runsBetween } from './shapes.js';
import { END_DOOR, SIDE_BAY, SIDE_LINES } from './vaux-shell.js';

const [AX0, , AX1] = INTERIOR.a;
/** Inner face of the nave walls: the vault's springing line. */
const NAVE_INNER_X = HALL_PIER_X - HALL_NAVE_WALL / 2;
const BAY_CENTRES: readonly number[] = HALL_PIER_Z.slice(0, -1).map((z, i) => (z + (HALL_PIER_Z[i + 1] ?? z)) / 2);
const CLERESTORY = { width: 1.8, height: 3.6 } as const;

/** Marble floor: a checker of white marble and dark slate over the whole hall, laid from its centre. */
export function hallFloor(kit: Kit): void {
  const nx = 20;
  const nz = 25;
  const dx = (AX1 - AX0) / nx;
  const dz = (VAUX_HALL_EAST_Z - VAUX_HALL_WEST_Z) / nz;
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x = AX0 + i * dx;
      const z = VAUX_HALL_WEST_Z + k * dz;
      addBox(kit, (i + k) % 2 === 0 ? palette.marbleFloor : core.slate, x + 0.004, L1 - 0.06, z + 0.004, x + dx - 0.004, L1, z + dz - 0.004);
    }
  }
}

/**
 * A compound pier: square core on a base, a half-column on each face to the arcade's springing and, toward the nave, a half shaft to the vault. Front +Z =
 * the nave. The shafts stand against the core's faces rather than in it, so no part of the pier overlaps another.
 */
function pier(): BufferGeometry {
  return memo('hallPier', () => {
    const b = new MeshBuilder();
    const h = HALL_PIER / 2;
    b.box([-h - 0.15, 0, -h - 0.15], [h + 0.15, 0.45, h + 0.15]);
    b.box([-h, 0.45, -h], [h, HALL_ARCADE_SPRING, h]);
    b.box([-h - 0.12, HALL_ARCADE_SPRING, -h - 0.12], [h + 0.12, HALL_ARCADE_SPRING + 0.35, h + 0.12]);
    const shaft = halfCylinder(6);
    const put = (x: number, z: number, yaw: number, r: number, y0: number, y1: number): void => {
      b.append(shaft, placed(x, y0, z, yaw, [2 * r, y1 - y0, 2 * r]));
    };
    for (const [x, z, yaw] of [
      [h, 0, FACING.north],
      [-h, 0, FACING.south],
      [0, -h, FACING.west],
    ] as const) {
      put(x, z, yaw, 0.22, 0.45, HALL_ARCADE_SPRING);
    }
    // The nave shaft rises past the arcade to carry the vault's transverse rib.
    put(0, h, FACING.east, 0.28, 0.45, HALL_VAULT_SPRING_Y - L1);
    b.box([-0.42, HALL_VAULT_SPRING_Y - L1 - 0.4, h - 0.3], [0.42, HALL_VAULT_SPRING_Y - L1, h + 0.42]);
    return b.build();
  });
}

/** Both rows of piers, the nave shafts turned to the nave. */
export function hallPiers(kit: Kit): void {
  const geometry = pier();
  HALL_PIER_Z.forEach((z, i) => {
    kit.add(geometry, palette.limestone, placed(-HALL_PIER_X, L1, z, FACING.north), i);
    kit.add(geometry, palette.limestone, placed(HALL_PIER_X, L1, z, FACING.south), i);
  });
}

/** Pointed arcades between the piers, with moulded arch rings on both faces, and a string course at the second floor. */
export function hallArcades(kit: Kit): void {
  const span = SIDE_BAY - HALL_PIER;
  const panel = openWall({ width: SIDE_BAY, height: L2 - L1, thickness: HALL_NAVE_WALL, holes: [{ head: 'pointed', y: 0, width: span, height: HALL_ARCADE_SPRING + HALL_ARCADE_RISE, rise: HALL_ARCADE_RISE }], openEnds: true });
  const ring = voussoirRing({ head: 'pointed', span, rise: HALL_ARCADE_RISE, band: 0.32, count: 15, projection: 0.07, parity: 'all' });
  BAY_CENTRES.forEach((z, i) => {
    for (const [x, out] of [
      [-HALL_PIER_X, -1],
      [HALL_PIER_X, 1],
    ] as const) {
      const face = x + (out * HALL_NAVE_WALL) / 2;
      const facing = out < 0 ? FACING.south : FACING.north;
      kit.add(panel, palette.limestone, placed(face, L1, z, facing), i);
      kit.add(ring, palette.limestone, placed(face, L1 + HALL_ARCADE_SPRING, z, facing), i);
      kit.add(ring, palette.limestone, placed(x - (out * HALL_NAVE_WALL) / 2, L1 + HALL_ARCADE_SPRING, z, out < 0 ? FACING.north : FACING.south), i);
    }
  });
  for (const x of [-NAVE_INNER_X, NAVE_INNER_X]) addBox(kit, palette.limestone, x, L2 - 0.35, VAUX_HALL_WEST_Z, x - Math.sign(x) * 0.16, L2, VAUX_HALL_EAST_Z, 6);
}

/**
 * One groin-vault bay: a semicircular barrel across the nave (radius R) crossed by a transverse vault of the same crown over a bay `b` long.
 * Origin at the bay's centre on the springing plane. The intrados faces down; the extrados, `t` above it, faces up.
 */
function groinBay(R: number, b: number, t: number): BufferGeometry {
  return memo(`groin:${keyOf(R, b, t)}`, () => {
    const out = new MeshBuilder();
    const nu = 12;
    const ns = 9;
    const lift = (y: number, top: boolean): number => (top ? y + t : y);
    const cells: ((u: number, s: number, top: boolean) => Vector3)[] = [
      (u, s, top) => new Vector3(u * s * R, lift(Math.sqrt(Math.max(0, R * R - (u * s * R) ** 2)), top), (s * b) / 2),
      (u, s, top) => new Vector3(u * s * R, lift(Math.sqrt(Math.max(0, R * R - (u * s * R) ** 2)), top), (-s * b) / 2),
      (u, s, top) => new Vector3(s * R, lift(R * Math.sqrt(Math.max(0, 1 - (u * s) ** 2)), top), (u * s * b) / 2),
      (u, s, top) => new Vector3(-s * R, lift(R * Math.sqrt(Math.max(0, 1 - (u * s) ** 2)), top), (u * s * b) / 2),
    ];
    for (const cell of cells) {
      for (const top of [false, true]) {
        const rows: Vector3[][] = [];
        for (let j = 0; j <= ns; j++) rows.push(Array.from({ length: nu + 1 }, (_, i) => cell(-1 + (2 * i) / nu, j / ns, top)));
        // Pick the winding from a sample cell: intrados faces down, extrados up.
        const j0 = Math.floor(ns / 3);
        const p = rows[j0]?.[nu / 2] ?? new Vector3();
        const pu = rows[j0]?.[nu / 2 + 1] ?? new Vector3();
        const pv = rows[j0 + 1]?.[nu / 2] ?? new Vector3();
        const n = new Vector3().crossVectors(pu.clone().sub(p), pv.clone().sub(p));
        const towardAxis = new Vector3(-p.x, R * 0.5 - p.y, 0);
        const facesIn = n.dot(towardAxis) > 0;
        out.grid(rows, { flip: top ? facesIn : !facesIn });
      }
    }
    return out.build();
  });
}

/** The nave walls over the arcades with their clerestory windows, the groin vault and its transverse ribs, plaster on the end walls, and the hall's light. */
export function hallClerestoryVault(kit: Kit): void {
  const panel = openWall({
    width: SIDE_BAY,
    height: HALL_NAVE_ROOF_EAVES_Y - L2,
    thickness: HALL_NAVE_WALL,
    holes: [{ head: 'round', y: HALL_CLERESTORY_SILL_Y - L2, width: CLERESTORY.width, height: CLERESTORY.height }],
    openEnds: true,
  });
  // Above the gallery roofs the clerestory is faced in brick like the rest of the old building.
  const skin = openWall({
    width: SIDE_BAY,
    height: HALL_NAVE_ROOF_EAVES_Y - ROOF_Y,
    thickness: 0.04,
    holes: [{ head: 'round', y: HALL_CLERESTORY_SILL_Y - ROOF_Y, width: CLERESTORY.width, height: CLERESTORY.height }],
    openEnds: true,
  });
  const win = windowUnit({ width: CLERESTORY.width, height: CLERESTORY.height, shape: 'arch', cols: 2, rows: 3 });
  BAY_CENTRES.forEach((z, i) => {
    for (const [out, facing] of [
      [-1, FACING.south],
      [1, FACING.north],
    ] as const) {
      const face = out * NAVE_OUTER_X;
      kit.add(panel, palette.limestone, placed(face, L2, z, facing), i);
      kit.add(skin, palette.brick, placed(face + out * 0.04, ROOF_Y, z, facing), i);
      const w = placed(face - out * 0.3, HALL_CLERESTORY_SILL_Y, z, facing);
      kit.add(win.frame, palette.metalDark, w, i + 1);
      kit.add(win.bars, palette.metalDark, w, i + 1);
      kit.add(win.glass, palette.glass, w, i + 1);
    }
  });
  // The short ends of the nave walls between the last piers and the end walls.
  for (const out of [-1, 1]) {
    addBox(kit, palette.limestone, out * NAVE_INNER_X, L2, VAUX_HALL_WEST_Z, out * NAVE_OUTER_X, HALL_NAVE_ROOF_EAVES_Y, HALL_PIER_Z[0], 0);
    addBox(kit, palette.limestone, out * NAVE_INNER_X, L2, HALL_PIER_Z[6], out * NAVE_OUTER_X, HALL_NAVE_ROOF_EAVES_Y, VAUX_HALL_EAST_Z, 0);
  }
  const vault = groinBay(NAVE_INNER_X, SIDE_BAY, 0.25);
  BAY_CENTRES.forEach((z, i) => {
    kit.add(vault, core.hallPlaster, placed(0, HALL_VAULT_SPRING_Y, z), 8 + i);
  });
  const rib = voussoirRing({ head: 'round', span: 2 * (NAVE_INNER_X - 0.42), band: 0.42, count: 21, projection: 0.6, parity: 'all', back: true });
  HALL_PIER_Z.forEach((z, i) => {
    const zz = i === 0 ? z + 0.1 : i === HALL_PIER_Z.length - 1 ? z - 0.7 : z - 0.3;
    kit.add(rib, palette.limestone, placed(0, HALL_VAULT_SPRING_Y, zz), 14 + i);
  });
  endWallLinings(kit);
  aisleLinings(kit);
  const light = new PointLight(new Color('#ffe6c4'), 420, 48, 2);
  light.position.set(0, 15.5, (VAUX_HALL_WEST_Z + VAUX_HALL_EAST_Z) / 2);
  light.castShadow = false;
  kit.light(light);
}

/** Plaster on the nave's part of the end walls above the roofs (the walls below are plastered throughout), and the balconies at the second floor. */
function endWallLinings(kit: Kit): void {
  const t = 0.05;
  const archivolt = voussoirRing({ head: 'round', span: END_DOOR.width, band: 0.5, count: 15, projection: 0.16, parity: 'all' });
  const upper = openWall({ width: 2 * NAVE_INNER_X, height: HALL_NAVE_ROOF_EAVES_Y - ROOF_Y, thickness: t, holes: [{ head: 'circle', y: VAUX_OCULUS_Y - 1.2 - ROOF_Y, width: 2.4, height: 2.4 }] });
  for (const [z, facing, dir] of [
    [VAUX_HALL_WEST_Z + t, FACING.east, 1],
    [VAUX_HALL_EAST_Z - t, FACING.west, -1],
  ] as const) {
    kit.add(upper, core.hallPlaster, placed(0, ROOF_Y, z, facing), 21);
    // The doorway's moulded archivolt, and a balcony: a solid stone parapet on corbels across the opening at the second floor.
    kit.add(archivolt, palette.limestone, placed(0, L1 + END_DOOR.height - END_DOOR.width / 2, z, facing), 22);
    const z0 = z;
    const z1 = z + dir * 0.9;
    addBox(kit, palette.limestone, -3.3, L2 - 0.25, Math.min(z0, z1), 3.3, L2, Math.max(z0, z1), 22);
    addBox(kit, palette.limestone, -3.3, L2, z1 - dir * 0.15, 3.3, L2 + 1.0, z1, 22);
    for (const x of [-2.6, -0.9, 0.9, 2.6]) addBox(kit, palette.limestone, x - 0.18, L2 - 0.8, Math.min(z0, z1), x + 0.18, L2 - 0.25, Math.max(z0, z1 - dir * 0.3), 22);
  }
}

/** Plaster on the aisles' outer walls (block A's side walls, brick in 1880), round the doors the floor map shows into the wings. */
function aisleLinings(kit: Kit): void {
  const doors: Readonly<Record<'south' | 'north', readonly number[]>> = { south: [5, 6], north: [4, 5, 6] };
  for (const [side, x] of [
    ['south', AX0],
    ['north', AX1],
  ] as const) {
    const gaps = doors[side].map((i) => {
      const z = ((SIDE_LINES[i] ?? 0) + (SIDE_LINES[i + 1] ?? 0)) / 2;
      return [z - 1.4, z + 1.4] as const;
    });
    for (const [z0, z1] of runsBetween(VAUX_HALL_WEST_Z, VAUX_HALL_EAST_Z, gaps)) addBox(kit, palette.limestone, x, L1, z0, x + (side === 'south' ? 0.05 : -0.05), L2 - SLAB, z1, 3);
  }
}
