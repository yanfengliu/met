/**
 * The Sackler Wing (Kevin Roche John Dinkeloo and Associates, begun 1974, opened 27 September 1978) and the Temple of Dendur, chapter `roche-north-1980`.
 * Order (docs/research/history.md section 7, interior.md "Proposed interior build steps"): foundations, the limestone end walls, the gallery floor, the granite
 * platform, the pool, the gate and the temple, the sloping stone back wall, then the glass: the sloped north wall, the hung ceiling and the glazed roof.
 * The McKim, Mead & White blocks own the walls on X 118.0 and Z −41.3 (exterior.md section 2); floors and roofs here run up to those lines.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';

import { stairFlight } from '../lib/index.js';
import type { Kit, StepDef } from '../../build/types.js';
import { SACKLER_NORTH_FACE_X } from '../frame.js';
import { palette } from '../palette.js';
import { FINE_BLOCK, seeded } from './masonry.js';
import { areaMaterials } from './materials.js';
import {
  BACK_WALL_LEAN_DEG,
  BACK_WALL_Z,
  COPING_HEIGHT,
  DAIS,
  DAIS_STEPS,
  DAIS_Y,
  DENDUR_FLOOR_Y,
  GATE_SLABS,
  GATE_WIDTH,
  GATE_Z,
  PLATFORM,
  PLATFORM_Y,
  POOL,
  POOL_WATER_Y,
  SACKLER_BLOCK,
  SACKLER_FOOTING_Y,
  SACKLER_ROOF_Y,
  SACKLER_TOWER,
  SACKLER_TOWER_TOP_Y,
  SIDE_STEPS,
  TEMPLE_AXIS_X,
  TEMPLE_BASE,
  TERRACE,
} from './plan.js';
import { BAY_LINES, addCeiling, addGlassWall, addRoof, glassX } from './sackler-glass.js';
import { boxAt } from './shapes.js';
import { addGate, addTempleCrown, addTempleWalls, flagstones } from './temple.js';

const CHAPTER = 'roche-north-1980';
/** The structural deck under the paving, and the pool's lowered floor. */
const DECK_TOP = DENDUR_FLOOR_Y - 0.1;
const POOL_FLOOR_Y = POOL_WATER_Y - 0.45;
const { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 } = SACKLER_BLOCK;

type Rect = readonly [number, number, number, number];

/** The pool in plan (x0, x1, z0, z1): the south arm, the north arm and the main basin, each run out to the block lines. */
const POOL_RECTS: readonly Rect[] = [
  [X0, POOL.armSouthMaxX, POOL.armMinZ, POOL.basinMinZ],
  [POOL.armNorthMinX, POOL.maxX, POOL.armMinZ, POOL.basinMinZ],
  [X0, POOL.maxX, POOL.basinMinZ, Z1],
];
/** The deck at walkway level: the block less the pool. */
const DECK_RECTS: readonly Rect[] = [
  [X0, X1, Z0, POOL.armMinZ],
  [POOL.armSouthMaxX, POOL.armNorthMinX, POOL.armMinZ, POOL.basinMinZ],
  [POOL.maxX, X1, POOL.armMinZ, Z1],
];

/** Calls `cell` for each panel of `rect` cut into pieces about `size` metres square. */
function panels(rect: Rect, size: number, cell: (x0: number, x1: number, z0: number, z1: number) => void): void {
  const [x0, x1, z0, z1] = rect;
  const nx = Math.max(1, Math.round((x1 - x0) / size));
  const nz = Math.max(1, Math.round((z1 - z0) / size));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) cell(x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx, z0 + ((z1 - z0) * k) / nz, z0 + ((z1 - z0) * (k + 1)) / nz);
}

function foundations(kit: Kit): void {
  // The mat, the park-side retaining walls and a column grid carrying the deck over the service level and garage.
  panels([X0, X1, Z0, Z1], 9, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.concrete, [x0, SACKLER_FOOTING_Y - 0.6, z0], [x1, SACKLER_FOOTING_Y, z1]); });
  boxAt(kit, areaMaterials.concrete, [X1 - 0.9, SACKLER_FOOTING_Y, Z0], [X1, DECK_TOP - 0.4, Z1]);
  boxAt(kit, areaMaterials.concrete, [SACKLER_TOWER.minX, SACKLER_FOOTING_Y, Z0], [X1 - 0.9, DECK_TOP - 0.4, Z0 + 0.9]);
  for (const x of [124.0, 130.0, 136.0, 142.0, 148.0]) {
    for (const line of BAY_LINES) {
      const z = Math.min(Math.max(line, Z0 + 0.4), Z1 - 0.4);
      boxAt(kit, areaMaterials.concrete, [x - 0.35, SACKLER_FOOTING_Y, z - 0.35], [x + 0.35, DECK_TOP - 0.4, z + 0.35]);
    }
  }
  for (const rect of DECK_RECTS) panels(rect, 7, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.concrete, [x0, DECK_TOP - 0.4, z0], [x1, DECK_TOP, z1]); });
  for (const rect of POOL_RECTS) panels(rect, 7, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.concrete, [x0, POOL_FLOOR_Y - 0.4, z0], [x1, POOL_FLOOR_Y, z1]); });
}

function endWalls(kit: Kit): void {
  // The limestone tower closing the glass wall's west end: park faces on the block lines, inner walls behind the leaning back wall.
  const { minX, maxX, minZ } = SACKLER_TOWER;
  const top = SACKLER_TOWER_TOP_Y;
  const back = SACKLER_TOWER.maxZ;
  boxAt(kit, palette.limestone, [maxX - 1.2, DECK_TOP - 0.4, minZ], [maxX, top, back]);
  boxAt(kit, palette.limestone, [minX, DECK_TOP - 0.4, minZ], [maxX - 1.2, top, minZ + 1.2]);
  boxAt(kit, palette.limestone, [minX, DECK_TOP - 0.4, minZ + 1.2], [minX + 0.8, top, back]);
  boxAt(kit, palette.limestone, [minX + 0.8, SACKLER_ROOF_Y - 0.6, back - 0.8], [maxX - 1.2, top, back]);
  // Coping round the tower's parapet and a plinth course along its park faces.
  boxAt(kit, palette.limestoneDark, [maxX - 1.3, top, minZ - 0.1], [maxX + 0.1, top + 0.3, back]);
  boxAt(kit, palette.limestoneDark, [minX, top, minZ - 0.1], [maxX - 1.3, top + 0.3, minZ + 1.3]);
  boxAt(kit, palette.limestoneDark, [maxX - 0.02, DENDUR_FLOOR_Y - 0.3, minZ - 0.02], [maxX + 0.12, DENDUR_FLOOR_Y + 0.9, back]);
  boxAt(kit, palette.limestoneDark, [minX, DENDUR_FLOOR_Y - 0.3, minZ - 0.12], [maxX + 0.12, DENDUR_FLOOR_Y + 0.9, minZ + 0.02]);
}

function floor(kit: Kit): void {
  // Walkways round the platform: the north walk along the glass and the strips beside the platform's long sides.
  const walks: readonly Rect[] = [
    [POOL.maxX, glassX(DENDUR_FLOOR_Y) - 1.1, BAY_LINES[0] ?? Z0, Z1],
    [PLATFORM.maxX, POOL.maxX, BAY_LINES[0] ?? Z0, POOL.armMinZ],
    [X0, PLATFORM.minX, BAY_LINES[0] ?? Z0, POOL.armMinZ],
  ];
  for (const rect of walks) panels(rect, 1.6, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.galleryFloor, [x0 + 0.006, DECK_TOP, z0 + 0.006], [x1 - 0.006, DENDUR_FLOOR_Y, z1 - 0.006]); });
}

function platform(kit: Kit): void {
  const { minX, maxX, minZ, maxZ } = PLATFORM;
  // The body in granite-faced lifts: down to the pool floor where the pool wraps the terrace, to the deck elsewhere.
  for (const [z0, z1] of [[minZ, -86.0], [-86.0, -77.0], [-77.0, TERRACE.minZ]] as const) boxAt(kit, areaMaterials.platformGranite, [minX, DECK_TOP, z0], [maxX, PLATFORM_Y - 0.08, z1]);
  for (const [z0, z1] of [[TERRACE.minZ, -59.5], [-59.5, maxZ]] as const) boxAt(kit, areaMaterials.platformGranite, [minX, POOL_FLOOR_Y, z0], [maxX, PLATFORM_Y - 0.08, z1]);
  // Polished stone paving on top, as on the walkways (P4).
  panels([minX, maxX, minZ, maxZ], 2.25, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.galleryFloor, [x0 + 0.008, PLATFORM_Y - 0.08, z0 + 0.008], [x1 - 0.008, PLATFORM_Y, z1 - 0.008]); });
  // The coping round the terrace: east, south and north bands and their short returns by the gate.
  const c = TERRACE.coping;
  const top = PLATFORM_Y + COPING_HEIGHT;
  boxAt(kit, palette.granite, [minX, PLATFORM_Y, maxZ - c], [maxX, top, maxZ + 0.05]);
  boxAt(kit, palette.granite, [minX - 0.05, PLATFORM_Y, TERRACE.minZ], [minX + c, top, maxZ - c]);
  boxAt(kit, palette.granite, [maxX - c, PLATFORM_Y, TERRACE.minZ], [maxX + 0.05, top, maxZ - c]);
  boxAt(kit, palette.granite, [minX + c, PLATFORM_Y, TERRACE.minZ], [TERRACE.returnSouthX, top, TERRACE.returnZ]);
  boxAt(kit, palette.granite, [TERRACE.returnNorthX, PLATFORM_Y, TERRACE.minZ], [maxX - c, top, TERRACE.returnZ]);
  // The temple's dais, a step higher again, with short flights down to the terrace at the gate's two ends.
  const s0 = DAIS.minX + DAIS_STEPS.width;
  const s1 = DAIS.maxX - DAIS_STEPS.width;
  boxAt(kit, areaMaterials.platformGranite, [DAIS.minX, PLATFORM_Y - 0.08, DAIS.minZ], [DAIS.maxX, DAIS_Y - 0.06, DAIS_STEPS.minZ]);
  boxAt(kit, areaMaterials.platformGranite, [s0, PLATFORM_Y - 0.08, DAIS_STEPS.minZ], [s1, DAIS_Y - 0.06, DAIS.maxZ]);
  panels([DAIS.minX, DAIS.maxX, DAIS.minZ, TEMPLE_BASE.maxZ], 2.25, (x0, x1, z0, z1) => { boxAt(kit, areaMaterials.galleryFloor, [x0 + 0.008, DAIS_Y - 0.06, z0 + 0.008], [x1 - 0.008, DAIS_Y, z1 - 0.008]); });
  const daisFlight = stairFlight({ width: DAIS_STEPS.width, steps: 4, riser: (DAIS_Y - PLATFORM_Y) / 4, tread: (DAIS.maxZ - DAIS_STEPS.minZ) / 4, nosing: 0.015 });
  for (const x of [DAIS.minX + DAIS_STEPS.width / 2, DAIS.maxX - DAIS_STEPS.width / 2]) kit.add(daisFlight.steps, palette.granite, new Matrix4().makeTranslation(x, PLATFORM_Y, DAIS.maxZ));
  // Side flights up the platform's long sides: six risers each, climbing north from the south walk and south from the north walk.
  const length = SIDE_STEPS.maxZ - SIDE_STEPS.minZ;
  const zMid = (SIDE_STEPS.minZ + SIDE_STEPS.maxZ) / 2;
  for (const [foot, turn, run] of [
    [SIDE_STEPS.south[0], -Math.PI / 2, SIDE_STEPS.south[1] - SIDE_STEPS.south[0]],
    [SIDE_STEPS.north[1], Math.PI / 2, SIDE_STEPS.north[1] - SIDE_STEPS.north[0]],
  ] as const) {
    const flight = stairFlight({ width: length, steps: 6, riser: (PLATFORM_Y - DENDUR_FLOOR_Y) / 6, tread: run / 6, nosing: 0.015 });
    kit.add(flight.steps, palette.granite, new Matrix4().compose(new Vector3(foot, DENDUR_FLOOR_Y, zMid), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), turn), new Vector3(1, 1, 1)));
  }
}

function pool(kit: Kit): void {
  // Kerbs on the pool's outer edges and the east end, the granite face of the terrace down to the pool floor, then the water.
  boxAt(kit, areaMaterials.platformGranite, [X0, POOL_FLOOR_Y, POOL.armMinZ], [X0 + 0.3, DENDUR_FLOOR_Y, Z1]);
  boxAt(kit, areaMaterials.platformGranite, [POOL.maxX - 0.3, POOL_FLOOR_Y, POOL.armMinZ], [POOL.maxX, DENDUR_FLOOR_Y, Z1]);
  boxAt(kit, areaMaterials.platformGranite, [X0 + 0.3, POOL_FLOOR_Y, Z1 - 0.3], [POOL.maxX - 0.3, DENDUR_FLOOR_Y, Z1]);
  for (const [x0, x1] of [[X0 + 0.3, POOL.armSouthMaxX], [POOL.armNorthMinX, POOL.maxX - 0.3]] as const) boxAt(kit, areaMaterials.platformGranite, [x0, POOL_FLOOR_Y, POOL.armMinZ], [x1, DENDUR_FLOOR_Y, POOL.armMinZ + 0.3]);
  const water: readonly Rect[] = [
    [X0 + 0.3, POOL.armSouthMaxX, POOL.armMinZ + 0.3, POOL.basinMinZ],
    [POOL.armNorthMinX, POOL.maxX - 0.3, POOL.armMinZ + 0.3, POOL.basinMinZ],
    [X0 + 0.3, POOL.maxX - 0.3, POOL.basinMinZ, Z1 - 0.3],
  ];
  for (const [x0, x1, z0, z1] of water) boxAt(kit, palette.water, [x0, POOL_FLOOR_Y, z0], [x1, POOL_WATER_Y, z1]);
}

function gate(kit: Kit): void {
  const y = PLATFORM_Y + 0.15;
  const hx = GATE_WIDTH / 2;
  flagstones(kit, GATE_SLABS.minX, TEMPLE_AXIS_X - hx, GATE_SLABS.minZ, GATE_SLABS.maxZ, y, 0.15, 51);
  flagstones(kit, TEMPLE_AXIS_X + hx, GATE_SLABS.maxX, GATE_SLABS.minZ, GATE_SLABS.maxZ, y, 0.15, 53);
  addGate(kit, new Matrix4().makeTranslation(TEMPLE_AXIS_X, y, GATE_Z));
}

function temple(kit: Kit): void {
  // The old flagstones of the forecourt on the dais, between the gate and the temple; the temple's base course; then the temple.
  const y = DAIS_Y + 0.15;
  flagstones(kit, DAIS.minX, DAIS.maxX, TEMPLE_BASE.maxZ, DAIS_STEPS.minZ, DAIS_Y + 0.04, 0.12, 61);
  flagstones(kit, DAIS.minX + DAIS_STEPS.width, DAIS.maxX - DAIS_STEPS.width, DAIS_STEPS.minZ, DAIS.maxZ, DAIS_Y + 0.04, 0.12, 63);
  boxAt(kit, areaMaterials.oldPaving, [TEMPLE_BASE.minX, DAIS_Y - 0.05, TEMPLE_BASE.minZ], [TEMPLE_BASE.maxX, y, TEMPLE_BASE.maxZ]);
  const frame = new Matrix4().makeTranslation(TEMPLE_AXIS_X, y, (TEMPLE_BASE.minZ + TEMPLE_BASE.maxZ) / 2);
  addTempleWalls(kit, frame);
  addTempleCrown(kit, frame);
}

function backWall(kit: Kit): void {
  // Ashlar courses leaning back like a cliff face, each block sheared by the lean; the north end follows the glass.
  const lean = Math.tan((BACK_WALL_LEAN_DEG * Math.PI) / 180);
  const heights = [0.82, 0.82, 1.24];
  const thickness = 1.0;
  const rand = seeded(71);
  const top = SACKLER_ROOF_Y + 0.4;
  let yb = DECK_TOP - 0.4;
  for (let k = 0; yb < top - 0.05; k++) {
    const yt = Math.min(yb + (heights[k % 3] ?? 0.82), top);
    const end = glassX(yt) - 0.15;
    let x = X0 - rand() * 1.6;
    while (x < end - 0.05) {
      const a = Math.max(x, X0);
      const b = Math.min(x + 1.8 + 0.9 * rand(), end);
      x = b;
      if (b - a < 0.1) continue;
      const shear = new Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, 0, -lean, 1, 0, 0, 0, 0, 1);
      const zFace = BACK_WALL_Z - (yb - DENDUR_FLOOR_Y) * lean;
      const m = new Matrix4().makeTranslation((a + b) / 2, yb, zFace - thickness / 2).multiply(shear).multiply(new Matrix4().compose(new Vector3(0, (yt - yb) / 2, 0), new Quaternion(), new Vector3(b - a - 0.006, yt - yb - 0.006, thickness)));
      kit.add(FINE_BLOCK, areaMaterials.ashlar, m);
    }
    yb = yt;
  }
  // Rough-hewn pale blocks at the platform's west end, down to the walkways at its corners: the foot of the "cliff".
  for (let x = PLATFORM.minX; x < PLATFORM.maxX - 0.2; ) {
    const w = Math.min(1.1 + rand(), PLATFORM.maxX - x);
    const h = 0.8 + 0.6 * rand();
    boxAt(kit, areaMaterials.roughStone, [x + 0.02, PLATFORM_Y, BACK_WALL_Z + 0.02], [x + w - 0.02, PLATFORM_Y + h, BACK_WALL_Z + 1.3 + 0.7 * rand()]);
    if (rand() < 0.6) boxAt(kit, areaMaterials.roughStone, [x + 0.15, PLATFORM_Y + h, BACK_WALL_Z + 0.05], [x + w - 0.2 * rand() - 0.1, PLATFORM_Y + h + 0.4 + 0.5 * rand(), BACK_WALL_Z + 0.8 + 0.4 * rand()]);
    x += w;
  }
  for (const [x0, x1] of [[X0, PLATFORM.minX], [PLATFORM.maxX, POOL.maxX]] as const) {
    boxAt(kit, areaMaterials.roughStone, [x0, DENDUR_FLOOR_Y, BACK_WALL_Z + 0.02], [x1, PLATFORM_Y + 1.25, BACK_WALL_Z + 2.4]);
    boxAt(kit, areaMaterials.roughStone, [x0 + 0.1, DENDUR_FLOOR_Y, BACK_WALL_Z + 2.4], [x1 - 0.1, PLATFORM_Y + 0.55, BACK_WALL_Z + 4.6]);
  }
}

function towerRoof(kit: Kit): void {
  const { minX, maxX, minZ } = SACKLER_TOWER;
  boxAt(kit, palette.roofLead, [minX + 0.8, SACKLER_TOWER_TOP_Y - 0.6, minZ + 1.2], [maxX - 1.2, SACKLER_TOWER_TOP_Y - 0.3, -98.5]);
}

const year = (y: number): string => String(y);

export const sacklerSteps: readonly StepDef[] = [
  {
    id: 'sackler-foundations',
    chapter: CHAPTER,
    year: year(1975),
    title: 'Sackler Wing foundations and deck',
    detail: 'A concrete mat, retaining walls on the park side and a column grid carry the gallery deck over a service level and garage (Aldred 1978).',
    motion: { kind: 'rise' },
    stagger: 'x',
    build: foundations,
  },
  {
    id: 'sackler-walls',
    chapter: CHAPTER,
    year: year(1976),
    title: 'Limestone end walls of the Sackler Wing',
    detail: 'A limestone tower closes the west end of the coming glass wall, its park faces on the building line.',
    motion: { kind: 'grow' },
    stagger: 'z',
    build: endWalls,
  },
  {
    id: 'dendur-floor',
    chapter: CHAPTER,
    year: year(1977),
    title: 'Lay the gallery floor',
    detail: 'Stone paving for the walkways round the platform, along the glass and beside its long sides.',
    motion: { kind: 'pop' },
    stagger: 'radial',
    weight: 0.8,
    build: floor,
  },
  {
    id: 'dendur-platform',
    chapter: CHAPTER,
    year: year(1977),
    title: 'Granite platform, the ancient quay',
    detail: 'A granite-faced platform a metre high stands for the quay on the Nile, with side flights, a paved terrace and a coping to sit on.',
    motion: { kind: 'rise' },
    stagger: '-z',
    build: platform,
  },
  {
    id: 'dendur-pool',
    chapter: CHAPTER,
    year: year(1977),
    title: 'Fill the reflecting pool',
    detail: 'The pool wraps the terrace on three sides and fills the east end, suggesting the Nile before the temple.',
    motion: { kind: 'grow' },
    stagger: 'none',
    weight: 0.7,
    build: pool,
  },
  {
    id: 'dendur-gate',
    chapter: CHAPTER,
    year: year(1978),
    title: 'Re-erect the gate of the Temple of Dendur',
    detail: 'The 8 m sandstone gate goes up course by course on its old paving, a winged sun disk on its cornice.',
    motion: { kind: 'drop', distance: 1.5 },
    stagger: 'y',
    weight: 1.2,
    build: gate,
  },
  {
    id: 'dendur-temple',
    chapter: CHAPTER,
    year: year(1978),
    title: 'Re-erect the Temple of Dendur',
    detail: 'Eleven courses of Nubian sandstone, carved about 15 BC: the pronaos of two columns, then the vestibule and sanctuary, under cavetto cornices.',
    motion: { kind: 'drop', distance: 1.2 },
    stagger: 'y',
    weight: 2,
    focus: { kind: 'preset', id: 'int-dendur-se' },
    build: temple,
  },
  {
    id: 'dendur-back-wall',
    chapter: CHAPTER,
    year: year(1978),
    title: 'The sloping stone back wall',
    detail: 'A wall of pale ashlar leans back behind the temple like the cliffs at Dendur, rough blocks at its foot.',
    motion: { kind: 'grow' },
    stagger: 'y',
    build: backWall,
  },
  {
    id: 'dendur-glass-wall',
    chapter: CHAPTER,
    year: year(1978),
    title: 'The sloped glass wall facing the park',
    detail: 'Stippled glass on white steel fins leans in from the park: the "outdoor glass display case" Thomas Hoving promised.',
    motion: { kind: 'slide', from: [14, 0, 0] },
    stagger: 'z',
    weight: 1.2,
    focus: { kind: 'preset', id: 'ref-park-north' },
    build: addGlassWall,
  },
  {
    id: 'dendur-ceiling',
    chapter: CHAPTER,
    year: year(1978),
    title: 'Hang the stippled glass ceiling',
    detail: 'A flat ceiling of stippled glass panels hangs 16 m over the walkways, diffusing the daylight with the wall.',
    motion: { kind: 'drop', distance: 4 },
    stagger: 'z',
    build: addCeiling,
  },
  {
    id: 'sackler-roof',
    chapter: CHAPTER,
    year: year(1978),
    title: 'The Sackler Wing glass roof',
    detail: 'Steel girders and ten glazed ridges close the wing; the end tower gets its roof. The wing opened on 27 September 1978.',
    motion: { kind: 'drop' },
    stagger: 'z',
    build(kit) {
      addRoof(kit);
      towerRoof(kit);
    },
  },
];

/** Exported for the tests: the block lines this file builds up to. */
export const SACKLER_LINES = { southX: X0, northX: SACKLER_NORTH_FACE_X, westZ: Z0, eastZ: Z1 } as const;
