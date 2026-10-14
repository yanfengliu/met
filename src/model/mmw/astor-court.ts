/**
 * The Astor Court (gallery 217), a Ming scholar's garden court on the north end pavilion's second floor, finished in 1981 (interior.md, The Astor Court: NYT
 * 12 June 1981, CSM 7 July 1981), under a pyramidal skylight by Kevin Roche John Dinkeloo (NYT 17 January 1979, via Wikipedia).
 * Plan (map, world frame): the courtyard X 112.55..131.55 by Z −24.5..−10.95 on the floor at LEVEL_2_NORTH; the Ming Room (gallery 218) north of it to X 140.1.
 * The map's walls round it leave a 1.7 m opening in the south wall (Z −14.65..−12.95), the moon gate, and a 2.1 m door into the Ming Room (Z −18.7..−16.6).
 * Layout ("Nature Within Walls", pp. 9, 15): a half-pavilion on the west wall, a covered walk along the east side, a small pool in the south-west corner, and the
 * Ming Room at the north end with a south-facing porch. Heights and spacings E, by eye from the Met's published views; colours in materials.ts.
 */
import { CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { hippedSkylight, MeshBuilder } from '../lib/index.js';
import { palette } from '../palette.js';
import { END_ROOF_Y, LEVEL_2_NORTH, SLAB } from './dims.js';
import { mmwMaterials } from './materials.js';
import { merged } from './merge.js';
import { addBox, placed, UNIT_BOX } from './shapes.js';
import { ASTOR_COURT } from './wings.js';

const [X0, Z0, X1, Z1] = ASTOR_COURT;
const Y = LEVEL_2_NORTH;
const WALL_TOP = END_ROOF_Y - SLAB;
/** The partitions round the court are 0.45 m thick, centred on the map's lines: their court faces stand 0.225 m inside the court's rectangle. */
const FACE = 0.225;
const GATE = { z: -13.8, radius: 1.2 } as const;
const MING_DOOR = { z0: -18.7, z1: -16.6 } as const;
/** The tiled coping that caps the garden's white walls, and the height of the doorways' lintels. */
const COPING_Y = Y + 4.6;
const LINTEL_Y = Y + 3.0;

const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 10);

/** A matrix from a position, a rotation about Y and a scale. */
function at(x: number, y: number, z: number, rotationY = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY), new Vector3(sx, sy, sz));
}

/** A box in world corners as a matrix for UNIT_BOX. */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Matrix4 {
  return at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, x1 - x0, y1 - y0, z1 - z0);
}

let gateCache: BufferGeometry | null = null;

/** The moon gate's white wall panel: 3.4 m wide and as tall as the coping, with a round opening; front toward +Z, turned to face the court when placed. */
function moonGatePanel(): BufferGeometry {
  if (gateCache !== null) return gateCache;
  const b = new MeshBuilder();
  const w = 1.7;
  const h = COPING_Y - Y;
  const r = GATE.radius;
  const cy = r + 0.05;
  const hole: [number, number][] = [];
  const steps = 32;
  for (let k = 0; k < steps; k += 1) {
    const a = (2 * Math.PI * k) / steps;
    hole.push([r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const outline: [number, number][] = [
    [-w, 0],
    [w, 0],
    [w, h],
    [-w, h],
  ];
  const t = 0.12;
  b.planar(outline, [hole.slice().reverse()], new Vector3(0, 0, t), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
  b.planar(outline.map(([x, y]) => [x, -y] as const), [hole.map(([x, y]) => [x, -y] as const).reverse()], new Vector3(0, 0, -t), new Vector3(1, 0, 0), new Vector3(0, -1, 0));
  // The opening's reveal and a grey stone ring round it.
  for (let k = 0; k < steps; k += 1) {
    const p = hole[k] ?? [0, 0];
    const q = hole[(k + 1) % steps] ?? [0, 0];
    // Wound so the reveal faces the opening's centre.
    b.polygon([new Vector3(q[0], q[1], t), new Vector3(q[0], q[1], -t), new Vector3(p[0], p[1], -t), new Vector3(p[0], p[1], t)]);
  }
  gateCache = b.build();
  return gateCache;
}

let ringCache: BufferGeometry | null = null;

/** The moon gate's grey stone surround: a flat ring 0.18 m wide standing 0.04 m proud of the panel. */
function gateRing(): BufferGeometry {
  if (ringCache !== null) return ringCache;
  const b = new MeshBuilder();
  const r0 = GATE.radius;
  const r1 = GATE.radius + 0.18;
  const steps = 32;
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let k = 0; k < steps; k += 1) {
    const a = (2 * Math.PI * k) / steps;
    outer.push([r1 * Math.cos(a), r0 + 0.05 + r1 * Math.sin(a)]);
    inner.push([r0 * Math.cos(a), r0 + 0.05 + r0 * Math.sin(a)]);
  }
  b.planar(outer, [inner.slice().reverse()], new Vector3(0, 0, 0.16), new Vector3(1, 0, 0), new Vector3(0, 1, 0));
  ringCache = b.build();
  return ringCache;
}

/** Paving, the moon gate, lintels over the openings, the tiled coping round the walls and lattice windows in them. */
function buildFloorWalls(kit: Kit): void {
  addBox(kit, mmwMaterials.pavingGrey, X0 + FACE, Y, Z0 + FACE, X1 - FACE, Y + 0.05, Z1 - FACE, 0);
  // The moon gate in the south wall, on the court side of the map's opening, facing north (+X) into the court.
  const gateMatrix = placed(X0 + FACE + 0.13, Y, GATE.z, Math.PI / 2);
  kit.add(moonGatePanel(), palette.plaster, gateMatrix, 1);
  kit.add(gateRing(), mmwMaterials.pavingGrey, gateMatrix, 1);
  // Lintels closing the map's full-height openings above the doorways: the gate's and the Ming Room's.
  addBox(kit, palette.plaster, X0 - FACE, COPING_Y, -14.65, X0 + FACE, WALL_TOP, -12.95, 2);
  addBox(kit, palette.plaster, X1 - FACE, LINTEL_Y, MING_DOOR.z0, X1 + FACE, WALL_TOP, MING_DOOR.z1, 2);
  // The tiled coping: a grey tile eave 0.38 m proud round the court's three garden walls.
  const coping = merged('astor-coping', [
    [UNIT_BOX, box(X0 + FACE, COPING_Y, Z0 + FACE, X1 - FACE, COPING_Y + 0.14, Z0 + FACE + 0.38)],
    [UNIT_BOX, box(X0 + FACE, COPING_Y, Z1 - FACE - 0.38, X1 - FACE, COPING_Y + 0.14, Z1 - FACE)],
    [UNIT_BOX, box(X0 + FACE, COPING_Y, Z0 + FACE + 0.38, X0 + FACE + 0.38, COPING_Y + 0.14, Z1 - FACE - 0.38)],
  ]);
  kit.add(coping, mmwMaterials.tileGrey, placed(0, 0, 0), 3);
  // Lattice "leak windows" in the west and east walls, in timber.
  const lattice = latticeWindow();
  for (const x of [115.0, 126.5]) kit.add(lattice, mmwMaterials.timber, placed(x, Y + 1.6, Z0 + FACE, 0), 4);
  for (const x of [117.5, 125.0]) kit.add(lattice, mmwMaterials.timber, placed(x, Y + 1.6, Z1 - FACE, Math.PI), 4);
}

let latticeCache: BufferGeometry | null = null;

/** A square lattice window 1.2 m across: a frame and a grid of thin bars, front toward +Z, origin at its bottom centre. */
function latticeWindow(): BufferGeometry {
  if (latticeCache !== null) return latticeCache;
  const b = new MeshBuilder();
  const s = 1.2;
  const f = 0.1;
  b.box([-s / 2, 0, 0], [s / 2, f, 0.08]);
  b.box([-s / 2, s - f, 0], [s / 2, s, 0.08]);
  b.box([-s / 2, f, 0], [-s / 2 + f, s - f, 0.08]);
  b.box([s / 2 - f, f, 0], [s / 2, s - f, 0.08]);
  for (let k = 1; k < 6; k += 1) {
    const u = -s / 2 + f + ((s - 2 * f) * k) / 6;
    b.box([u - 0.015, f, 0.02], [u + 0.015, s - f, 0.06]);
    const v = f + ((s - 2 * f) * k) / 6;
    b.box([-s / 2 + f, v - 0.015, 0.02], [s / 2 - f, v + 0.015, 0.06]);
  }
  latticeCache = b.build();
  return latticeCache;
}

/** A tiled lean-to roof from a wall line down to a column line, with a thick fascia; one geometry in world coordinates. */
function leanTo(b: MeshBuilder, ax: number, az: number, bx: number, bz: number, out: readonly [number, number], depth: number, high: number, low: number): void {
  const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);
  const [ox, oz] = out;
  const top = [v(ax, high, az), v(bx, high, bz)];
  const eave = [v(ax + ox * depth, low, az + oz * depth), v(bx + ox * depth, low, bz + oz * depth)];
  const t = 0.18;
  const [ta, tb] = top as [Vector3, Vector3];
  const [ea, eb] = eave as [Vector3, Vector3];
  const quad = [ta, tb, eb, ea];
  // Face it upward whichever way the wall runs.
  const n = new Vector3().subVectors(tb, ta).cross(new Vector3().subVectors(ea, ta));
  b.polygon(n.y >= 0 ? quad : quad.slice().reverse());
  const under = quad.map((p) => p.clone().setY(p.y - t));
  b.polygon(n.y >= 0 ? under.slice().reverse() : under);
  const fascia = [ea, eb, eb.clone().setY(eb.y - t), ea.clone().setY(ea.y - t)];
  const fn = new Vector3().subVectors(eb, ea).cross(new Vector3(0, -1, 0));
  b.polygon(fn.x * ox + fn.z * oz >= 0 ? fascia : fascia.slice().reverse());
}

/** A hipped tile roof over a rectangle [x0, z0, x1, z1] at eave height y with the given rise; its ridge runs the long way. */
function hipInto(b: MeshBuilder, x0: number, z0: number, x1: number, z1: number, y: number, rise: number): void {
  const v = (x: number, yy: number, z: number): Vector3 => new Vector3(x, yy, z);
  const alongX = x1 - x0 >= z1 - z0;
  const half = alongX ? (z1 - z0) / 2 : (x1 - x0) / 2;
  const top = y + rise;
  const r0 = alongX ? v(x0 + half, top, (z0 + z1) / 2) : v((x0 + x1) / 2, top, z0 + half);
  const r1 = alongX ? v(x1 - half, top, (z0 + z1) / 2) : v((x0 + x1) / 2, top, z1 - half);
  const c = [v(x0, y, z1), v(x1, y, z1), v(x1, y, z0), v(x0, y, z0)];
  const [c0, c1, c2, c3] = c as [Vector3, Vector3, Vector3, Vector3];
  if (alongX) {
    b.polygon([c0, c1, r1, r0]);
    b.polygon([c2, c3, r0, r1]);
    b.polygon([c1, c2, r1]);
    b.polygon([c3, c0, r0]);
  } else {
    b.polygon([c1, c2, r0, r1]);
    b.polygon([c3, c0, r1, r0]);
    b.polygon([c0, c1, r1]);
    b.polygon([c2, c3, r0]);
  }
  // Underside, flat at the eaves, so the roof reads from below.
  b.polygon([c3.clone().setY(y - 0.12), c2.clone().setY(y - 0.12), c1.clone().setY(y - 0.12), c0.clone().setY(y - 0.12)]);
}

let roofsCache: BufferGeometry | null = null;

/** Every tile roof of the court in one geometry: the covered walk's lean-to, the half-pavilion's hip and the Ming Room porch's lean-to. */
function tileRoofs(): BufferGeometry {
  if (roofsCache !== null) return roofsCache;
  const b = new MeshBuilder();
  // Covered walk along the east wall, 2.0 m deep.
  leanTo(b, X0 + FACE, Z1 - FACE, X1 - FACE, Z1 - FACE, [0, -1], 2.3, Y + 3.5, Y + 2.85);
  // Half-pavilion against the west wall, centred at X 118.6, 4.4 m wide and 2.8 m deep.
  hipInto(b, 116.2, Z0 + FACE, 121.0, Z0 + FACE + 3.1, Y + 3.4, 1.5);
  // The Ming Room's porch along its south front.
  leanTo(b, X1 - FACE, Z0 + FACE, X1 - FACE, Z1 - FACE, [-1, 0], 2.1, Y + 4.3, Y + 3.5);
  roofsCache = b.build();
  return roofsCache;
}

/** Timber columns of the walk, the half-pavilion and the Ming Room porch, their beams and low railings, and the Ming Room's lattice front. */
function buildWalkPavilion(kit: Kit): void {
  const posts: [number, number, number][] = [];
  for (let k = 0; k <= 7; k += 1) posts.push([X0 + 1.0 + (k * (X1 - X0 - 2.0)) / 7, Z1 - FACE - 2.1, 2.85]);
  for (const x of [116.4, 120.8]) posts.push([x, Z0 + FACE + 2.95, 3.4]);
  for (const z of [Z0 + 1.2, -20.3, -15.2, Z1 - 1.2]) posts.push([X1 - FACE - 1.95, z, 3.5]);
  posts.forEach(([x, z, h], i) => { kit.add(CYLINDER, mmwMaterials.timber, at(x, Y + h / 2, z, 0, 0.24, h, 0.24), i); });
  // Beams under the eaves, low railings between the walk's posts, and the Ming Room's lattice doors and windows on its front wall.
  const timber = merged('astor-timber', [
    [UNIT_BOX, box(X0 + 0.8, Y + 2.7, Z1 - FACE - 2.22, X1 - 0.8, Y + 2.85, Z1 - FACE - 1.98)],
    [UNIT_BOX, box(X0 + 1.0, Y + 0.45, Z1 - FACE - 2.16, X1 - 1.0, Y + 0.55, Z1 - FACE - 2.04)],
    [UNIT_BOX, box(116.3, Y + 3.25, Z0 + FACE + 2.85, 120.9, Y + 3.4, Z0 + FACE + 3.05)],
    [UNIT_BOX, box(X1 - FACE - 2.05, Y + 3.35, Z0 + 1.0, X1 - FACE - 1.85, Y + 3.5, Z1 - 1.0)],
    ...[0, 1, 2, 3, 4, 5].map((k): [BufferGeometry, Matrix4] => [UNIT_BOX, box(X1 - FACE - 0.1, Y + 0.15, Z0 + 1.8 + k * 1.75, X1 - FACE, Y + 3.2, Z0 + 1.8 + k * 1.75 + 0.12)]),
    [UNIT_BOX, box(X1 - FACE - 0.1, Y + 3.2, Z0 + 1.6, X1 - FACE, Y + 3.35, Z1 - 1.6)],
  ]);
  kit.add(timber, mmwMaterials.timber, placed(0, 0, 0), 20);
  const lattice = latticeWindow();
  for (const z of [-22.1, -20.35, -14.95, -13.2]) kit.add(lattice, mmwMaterials.timber, placed(X1 - FACE, Y + 1.0, z, -Math.PI / 2), 21);
  kit.add(tileRoofs(), mmwMaterials.tileGrey, placed(0, 0, 0), 22);
}

const ROCK = new IcosahedronGeometry(1, 1);

/** Taihu rocks round the pool and along the west wall, the pool with its stone curb, bamboo and shrubs. */
function buildGarden(kit: Kit): void {
  const pool = { x0: 113.1, z0: Z0 + FACE + 0.3, x1: 116.0, z1: -21.4 } as const;
  addBox(kit, palette.water, pool.x0, Y + 0.05, pool.z0, pool.x1, Y + 0.12, pool.z1, 0);
  const curb = merged('astor-pool-curb', [
    [UNIT_BOX, box(pool.x0 - 0.2, Y + 0.05, pool.z0 - 0.2, pool.x1 + 0.2, Y + 0.3, pool.z0)],
    [UNIT_BOX, box(pool.x0 - 0.2, Y + 0.05, pool.z1, pool.x1 + 0.2, Y + 0.3, pool.z1 + 0.2)],
    [UNIT_BOX, box(pool.x0 - 0.2, Y + 0.05, pool.z0, pool.x0, Y + 0.3, pool.z1)],
    [UNIT_BOX, box(pool.x1, Y + 0.05, pool.z0, pool.x1 + 0.2, Y + 0.3, pool.z1)],
  ]);
  kit.add(curb, mmwMaterials.pavingGrey, placed(0, 0, 0), 0);
  // Rocks: one lumpy geometry, each placed with its own size and turn.
  const rocks = [
    [113.2, -21.0, 0.9, 1.4, 0.8, 0.3], [114.6, -20.7, 0.7, 0.9, 0.6, 1.2], [116.6, -22.6, 0.8, 1.8, 0.7, 2.1],
    [112.9, -17.6, 0.6, 1.1, 0.7, 0.8], [122.6, -23.4, 0.9, 2.1, 0.6, 1.7], [124.0, -23.5, 0.6, 1.2, 0.5, 0.4],
    [127.6, -23.2, 0.8, 1.5, 0.7, 2.6], [129.4, -22.9, 0.5, 0.8, 0.5, 1.9], [128.6, -14.7, 0.5, 0.7, 0.5, 0.9],
  ] as const;
  rocks.forEach(([x, z, sx, sy, sz, turn], i) => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), turn).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.35 * i));
    kit.add(ROCK, mmwMaterials.rock, new Matrix4().compose(new Vector3(x, Y + sy * 0.55, z), q, new Vector3(sx, sy, sz)), 10 + i);
  });
  // Bamboo stems in the south-east corner and shrubs by the rocks.
  for (let k = 0; k < 9; k += 1) {
    const x = 113.6 + (k % 3) * 0.45 + (k > 4 ? 0.2 : 0);
    const z = -12.3 - Math.floor(k / 3) * 0.4;
    const h = 3.6 + (k % 4) * 0.5;
    kit.add(CYLINDER, palette.foliage, at(x, Y + h / 2, z, 0, 0.07, h, 0.07), 20);
  }
  for (const [x, z, s] of [[113.9, -12.8, 1.3], [115.2, -18.9, 0.9], [121.8, -22.8, 0.8], [126.2, -22.9, 0.9]] as const) {
    kit.add(ROCK, palette.foliage, at(x, Y + s * 0.9 + 1.1, z, 0, s, s, s), 21);
  }
}

/** The pyramidal skylight over the whole court (KRJDA): a glazed hip on the court's curb, its ridge along the court's length. */
function buildSkylight(kit: Kit): void {
  const glass = hippedSkylight({ width: Z1 - Z0, length: X1 - X0, pitch: 30, curbHeight: 0.35, bays: 8 });
  const m = placed((X0 + X1) / 2, END_ROOF_Y + 0.5, (Z0 + Z1) / 2, Math.PI / 2);
  kit.add(glass.frame, palette.metalDark, m, 0);
  kit.add(glass.glass, palette.glass, m, 0);
}

const VIEW = { kind: 'box', min: [X0, Y, Z0], max: [X1 + 8.5, Y + 6, Z1] } as const;

export const astorCourtSteps: readonly StepDef[] = [
  {
    id: 'astor-court-floor-walls',
    chapter: 'roche-north-1980',
    year: '1981',
    title: 'Pave the Astor Court and cut its moon gate',
    detail: 'A Ming scholar\'s garden court on the north pavilion\'s second floor: grey paving, white walls under grey tile copings, a round moon gate from the south.',
    motion: { kind: 'rise', distance: 2 },
    stagger: 'order',
    focus: VIEW,
    build: buildFloorWalls,
  },
  {
    id: 'astor-court-walk-pavilion',
    chapter: 'roche-north-1980',
    year: '1981',
    title: 'Raise the walk, half-pavilion and Ming Room',
    detail: 'Timber columns and tile roofs: a covered walk along the east wall, a half-pavilion on the west wall and the Ming Room\'s porch at the north end.',
    motion: { kind: 'drop', distance: 3 },
    stagger: 'order',
    focus: VIEW,
    build: buildWalkPavilion,
  },
  {
    id: 'astor-court-garden',
    chapter: 'roche-north-1980',
    year: '1981',
    title: 'Set the rocks, pool and bamboo',
    detail: 'Taihu rocks round a small pool in the south-west corner, more along the west wall, bamboo by the moon gate.',
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: VIEW,
    build: buildGarden,
  },
  {
    id: 'astor-court-skylight',
    chapter: 'roche-north-1980',
    year: '1981',
    title: 'Close the court under its pyramid skylight',
    detail: 'Kevin Roche and John Dinkeloo\'s pyramidal skylight covers the whole court, filling the roof opening left over it since 1913.',
    motion: { kind: 'drop', distance: 5 },
    stagger: 'none',
    focus: { kind: 'preset', id: 'aerial-ne' },
    build: buildSkylight,
  },
];

