/**
 * Hunt facade, the crowning storey: the entablature breaking forward over each column pair (architrave, frieze, modillioned cornice) with a cornice-only run
 * over the arches between the breaks; the attic with its dentilled cornice and the mask-and-shell cresting; the four uncarved blocks on the breaks.
 * Evidence: S7 (Schneider 2019) at 1:1 (breaks 3.67 m from the capitals to Y 21.7, main run's dentils level with the breaks', the attic cornice at 25.7,
 * cresting peaks at 28.3, masks about 2.4 m apart; blocks 6.4 m wide on a 1.7 m plinth), S9 (Epicgenius 2023 #30) for the breaks' returns and the blocks' depth.
 */
import * as THREE from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { along, architraveProfile, corniceProfile, corniceRun, dentil, friezeProfile, MeshBuilder, modillion, moulding, stackProfiles, sweep, type V3 } from '../lib/index.js';
import { CORNICE_BANDS } from '../lib/profiles.js';
import { HUNT_ACROTERION_TOP_Y, HUNT_BLOCK_DEPTH, HUNT_BLOCK_PLINTH_TOP_Y, HUNT_BLOCK_TOP_Y } from '../frame.js';
import {
  ARCHITRAVE_TOP_Y,
  ATTIC_BACK_Z,
  ATTIC_CORNICE_H,
  ATTIC_TOP_Y,
  BREAK_FACE_Z,
  BREAK_HALF,
  COLUMN_TOP_Y,
  CORNICE_H,
  CORNICE_P,
  CORNICE_TOP_Y,
  EXT_BASE_TOP_Y,
  EXT_CORNICE_Y,
  EXT_FACE_Z,
  EXT_NORTH_X,
  EXT_ORDER_TOP_Y,
  EXT_SOUTH_X,
  FRIEZE_TOP_Y,
  PAIR_X,
  PAVILION_HALF,
  WALL_Z,
} from './dims.js';
import { at, box, roughPile } from './shapes.js';

interface Run {
  readonly moulding: THREE.BufferGeometry;
  readonly modillions: readonly THREE.Matrix4[];
  readonly dentils: readonly THREE.Matrix4[];
}

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

const M = CORNICE_BANDS.modillion;
const D = CORNICE_BANDS.dentil;
const MODILLION_LENGTH = (M.reach - M.d) * CORNICE_P;
const MODILLION_WIDTH = MODILLION_LENGTH / 3.2;
const DENTIL_H = (D.y1 - D.y0) * CORNICE_H;
const DENTIL_W = DENTIL_H / 1.6;

const modillionGeometry = lazy(() => modillion({ length: MODILLION_LENGTH, width: MODILLION_WIDTH, height: (M.y1 - M.y0) * CORNICE_H }));
const dentilGeometry = lazy(() => dentil({ width: DENTIL_W, height: DENTIL_H, depth: D.project * CORNICE_P }));

/** Full entablature section (architrave 0.95, frieze 0.95, cornice) and the cornice alone, for the breaks and the runs between them. */
const fullProfile = lazy(() =>
  stackProfiles([
    architraveProfile({ height: ARCHITRAVE_TOP_Y - COLUMN_TOP_Y, projection: 0.16 }),
    friezeProfile({ height: FRIEZE_TOP_Y - ARCHITRAVE_TOP_Y, projection: 0.03 }),
    corniceProfile({ height: CORNICE_H, projection: CORNICE_P }),
  ]),
);
const corniceOnly = lazy(() => corniceProfile({ height: CORNICE_H, projection: CORNICE_P }));

/** A run along `path` (at the section's foot): the swept section and its modillion and dentil placements, `below` metres of architrave and frieze under the cornice. */
function run(path: readonly V3[], below: number, full: boolean): Run {
  const moulding = sweep(full ? fullProfile() : corniceOnly(), path);
  const modillions = along(path, MODILLION_LENGTH * 1.15, { outward: M.d * CORNICE_P, y: below + M.y1 * CORNICE_H, margin: MODILLION_LENGTH + MODILLION_WIDTH, corners: true });
  const dentils = along(path, DENTIL_W * 1.55, { outward: D.d * CORNICE_P, y: below + D.y1 * CORNICE_H, margin: D.project * CORNICE_P + DENTIL_W });
  return { moulding, modillions, dentils };
}

/** The four breaks and the three runs between them, in local frames placed by translation (the outer breaks wrap the corners, so each side has its own). */
const pieces = lazy(() => {
  const below = FRIEZE_TOP_Y - COLUMN_TOP_Y;
  const inner = run(
    [
      [-BREAK_HALF, 0, WALL_Z],
      [-BREAK_HALF, 0, BREAK_FACE_Z],
      [BREAK_HALF, 0, BREAK_FACE_Z],
      [BREAK_HALF, 0, WALL_Z],
    ],
    below,
    true,
  );
  const outerSouth = run(
    [
      [-PAVILION_HALF, 0, EXT_FACE_Z],
      [-PAVILION_HALF, 0, BREAK_FACE_Z],
      [PAIR_X[0] + BREAK_HALF, 0, BREAK_FACE_Z],
      [PAIR_X[0] + BREAK_HALF, 0, WALL_Z],
    ],
    below,
    true,
  );
  const outerNorth = run(
    [
      [PAIR_X[3] - BREAK_HALF, 0, WALL_Z],
      [PAIR_X[3] - BREAK_HALF, 0, BREAK_FACE_Z],
      [PAVILION_HALF, 0, BREAK_FACE_Z],
      [PAVILION_HALF, 0, EXT_FACE_Z],
    ],
    below,
    true,
  );
  const half = (PAIR_X[2] - PAIR_X[1]) / 2 - BREAK_HALF;
  const between = run(
    [
      [-half, 0, WALL_Z],
      [half, 0, WALL_Z],
    ],
    0,
    false,
  );
  return { inner, outerSouth, outerNorth, between };
});

const trims = new Map<number, THREE.BufferGeometry>();
/** Each wing's swept mouldings merged into one geometry, built once per wing. */
function wingTrim(key: number, parts: () => THREE.BufferGeometry[]): THREE.BufferGeometry {
  const hit = trims.get(key);
  if (hit !== undefined) return hit;
  const b = new MeshBuilder();
  for (const g of parts()) b.append(g);
  const made = b.build();
  trims.set(key, made);
  return made;
}

function addRun(kit: Kit, r: Run, x: number, y: number, order: number): void {
  const place = at(x, y, 0);
  kit.add(r.moulding, palette.limestone, place, order);
  for (const m of r.modillions) kit.add(modillionGeometry(), palette.limestone, place.clone().multiply(m), order);
  for (const m of r.dentils) kit.add(dentilGeometry(), palette.limestone, place.clone().multiply(m), order);
}

/** One antefix of the cresting: a shell-crowned mask on a short neck, extruded 0.32 m, origin at its bottom centre on the attic cornice. */
const antefix = lazy(() => {
  const b = new MeshBuilder();
  const h = HUNT_ACROTERION_TOP_Y - ATTIC_TOP_Y;
  // A scalloped shell fanning out behind the mask (S7: masks with shell headdresses), on a short neck.
  const outline: [number, number][] = [
    [-0.26, 0],
    [0.26, 0],
    [0.3, 0.22 * h],
    [0.5, 0.36 * h],
  ];
  const steps = 18;
  for (let k = 1; k < steps; k++) {
    const a = (k / steps) * Math.PI;
    const scallop = 1 - 0.07 * Math.abs(Math.sin(k * Math.PI * 0.5));
    outline.push([0.66 * scallop * Math.cos(a), 0.4 * h + 0.6 * h * scallop * Math.sin(a)]);
  }
  outline.push([-0.5, 0.36 * h], [-0.3, 0.22 * h]);
  b.planar(outline, [], new THREE.Vector3(0, 0, 0.16), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  b.planar(outline.map(([x, y]) => [-x, y] as const), [], new THREE.Vector3(0, 0, -0.16), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));
  for (let k = 0; k < outline.length; k++) {
    const p = outline[k];
    const q = outline[(k + 1) % outline.length];
    if (p === undefined || q === undefined) continue;
    b.polygon([new THREE.Vector3(p[0], p[1], 0.16), new THREE.Vector3(p[0], p[1], -0.16), new THREE.Vector3(q[0], q[1], -0.16), new THREE.Vector3(q[0], q[1], 0.16)]);
  }
  // The mask: a low dome on the face.
  const mark = b.vertexCount;
  const rows: THREE.Vector3[][] = [];
  for (let j = 0; j <= 4; j++) {
    const phi = (j / 4) * (Math.PI / 2);
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      row.push(new THREE.Vector3(0.26 * Math.cos(phi) * Math.cos(theta), 0.32 * Math.cos(phi) * Math.sin(theta), 0.2 * Math.sin(phi)));
    }
    rows.push(row);
  }
  b.grid(rows);
  b.transform(mark, new THREE.Matrix4().makeTranslation(0, 0.5 * h, 0.16));
  return b.build();
});

/** The scrollwork between two antefixes (S7): a band rising to two volutes beside the masks and dipping between them, 0.24 m thick. Origin at its bottom centre. */
const scroll = lazy(() => {
  const b = new MeshBuilder();
  const top: [number, number][] = [];
  const n = 16;
  const w = 0.92;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const edge = Math.pow(Math.abs(Math.cos(Math.PI * t)), 0.6);
    top.push([-w + 2 * w * t, 0.22 + 0.62 * edge + 0.06 * Math.sin(t * Math.PI * 4)]);
  }
  const outline: [number, number][] = [[-w, 0], [w, 0], ...top.reverse()];
  b.planar(outline, [], new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  b.planar(outline.map(([x, y]) => [-x, y] as const), [], new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));
  for (let k = 0; k < outline.length; k++) {
    const p = outline[k];
    const q = outline[(k + 1) % outline.length];
    if (p === undefined || q === undefined) continue;
    b.polygon([new THREE.Vector3(p[0], p[1], 0.12), new THREE.Vector3(p[0], p[1], -0.12), new THREE.Vector3(q[0], q[1], -0.12), new THREE.Vector3(q[0], q[1], 0.12)]);
  }
  return b.build();
});

/** Antefix centres along the attic's front, symmetric about the axis, about 2.4 m apart (S7). */
function antefixX(): number[] {
  const out: number[] = [];
  const spacing = 2.4;
  const count = Math.floor((2 * PAVILION_HALF - 0.8) / spacing);
  const start = -((count - 1) * spacing) / 2;
  for (let k = 0; k < count; k++) out.push(start + k * spacing);
  return out;
}

export const entablatureSteps: readonly StepDef[] = [
  {
    id: 'hunt-entablature',
    chapter: 'hunt-1902',
    year: '1900',
    title: 'Set the entablature and its breaks',
    detail: 'The entablature breaks forward over each column pair and wraps the corners; between the breaks a modillioned cornice runs over the arches and the medallions.',
    motion: { kind: 'drop', distance: 5 },
    stagger: 'x',
    build(kit) {
      const p = pieces();
      addRun(kit, p.outerSouth, 0, COLUMN_TOP_Y, 0);
      addRun(kit, p.inner, PAIR_X[1], COLUMN_TOP_Y, 1);
      addRun(kit, p.inner, PAIR_X[2], COLUMN_TOP_Y, 2);
      addRun(kit, p.outerNorth, 0, COLUMN_TOP_Y, 3);
      for (const x of [(PAIR_X[0] + PAIR_X[1]) / 2, 0, (PAIR_X[2] + PAIR_X[3]) / 2]) addRun(kit, p.between, x, FRIEZE_TOP_Y, 4);
      // The wings: a string course over the rusticated base, the band and dentilled cornice the caryatids carry, and the crowning cornice at Y 20.7
      // that meets the McKim, Mead & White links' cornice with no jog.
      for (const [x0, x1, order] of [
        [EXT_SOUTH_X, -PAVILION_HALF, 0],
        [PAVILION_HALF, EXT_NORTH_X, 3],
      ] as const) {
        const line = (y: number): V3[] => [
          [x0, y, EXT_FACE_Z],
          [x1, y, EXT_FACE_Z],
        ];
        const order1 = corniceRun({ path: line(EXT_ORDER_TOP_Y - 0.75), height: 0.75, projection: 0.5, modillions: false, dentils: true });
        const crown = corniceRun({ path: line(EXT_CORNICE_Y - 0.9), height: 0.9, projection: 0.85, modillions: true, dentils: false });
        // The four swept mouldings of one wing share a material: one geometry, so one mesh.
        const trim = wingTrim(x0, () => [
          moulding({ profile: 'string-course', path: line(EXT_BASE_TOP_Y), height: 0.4, projection: 0.22 }),
          moulding({ profile: 'architrave', path: line(EXT_ORDER_TOP_Y - 1.2), height: 0.45, projection: 0.12 }),
          order1.moulding,
          crown.moulding,
        ]);
        kit.add(trim, palette.limestone, new THREE.Matrix4(), order);
        if (order1.dentil !== undefined) for (const m of order1.dentils) kit.add(order1.dentil, palette.limestone, m, order);
        if (crown.modillion !== undefined) for (const m of crown.modillions) kit.add(crown.modillion, palette.limestone, m, order);
      }
    },
  },
  {
    id: 'hunt-attic',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Build the attic and its cresting',
    detail: 'A plain attic storey rises over the cornice to a dentilled cornice, crowned by a cresting of masks and shells between scrolls.',
    motion: { kind: 'grow' },
    stagger: 'x',
    build(kit) {
      const corniceBottom = ATTIC_TOP_Y - ATTIC_CORNICE_H;
      box(kit, palette.limestone, [-PAVILION_HALF, CORNICE_TOP_Y, ATTIC_BACK_Z], [PAVILION_HALF, corniceBottom, WALL_Z]);
      const cornice = corniceRun({
        path: [
          [-PAVILION_HALF, corniceBottom, ATTIC_BACK_Z],
          [-PAVILION_HALF, corniceBottom, WALL_Z],
          [PAVILION_HALF, corniceBottom, WALL_Z],
          [PAVILION_HALF, corniceBottom, ATTIC_BACK_Z],
        ],
        height: ATTIC_CORNICE_H,
        projection: 0.5,
        modillions: false,
        dentils: true,
      });
      kit.add(cornice.moulding, palette.limestone, new THREE.Matrix4());
      if (cornice.dentil !== undefined) for (const m of cornice.dentils) kit.add(cornice.dentil, palette.limestone, m);
      // The cresting: a low base course, antefixes about 2.4 m apart and a scroll between each pair.
      box(kit, palette.limestoneDark, [-PAVILION_HALF + 0.1, ATTIC_TOP_Y, ATTIC_BACK_Z + 0.3], [PAVILION_HALF - 0.1, ATTIC_TOP_Y + 0.22, WALL_Z + 0.22]);
      const xs = antefixX();
      xs.forEach((x, i) => {
        kit.add(antefix(), palette.limestoneDark, at(x, ATTIC_TOP_Y + 0.22, WALL_Z + 0.02));
        const next = xs[i + 1];
        if (next !== undefined) kit.add(scroll(), palette.limestoneDark, at((x + next) / 2, ATTIC_TOP_Y + 0.22, WALL_Z + 0.02));
      });
    },
  },
  {
    id: 'hunt-blocks',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Hoist the four uncarved blocks',
    detail: 'Over each column pair a plinth and a stepped pile of rough limestone wait on the breaks: blocks left for sculpture groups of four great periods of art that were never carved.',
    motion: { kind: 'drop', distance: 6 },
    stagger: 'x',
    build(kit) {
      const depth = HUNT_BLOCK_DEPTH;
      const z0 = WALL_Z + 0.15;
      const pile = roughPile(5.3, depth - 0.25, HUNT_BLOCK_TOP_Y - HUNT_BLOCK_PLINTH_TOP_Y, 5);
      PAIR_X.forEach((x, i) => {
        box(kit, palette.limestone, [x - 3.2, CORNICE_TOP_Y, z0], [x + 3.2, HUNT_BLOCK_PLINTH_TOP_Y - 0.25, z0 + depth + 0.2], i);
        box(kit, palette.limestone, [x - 3.32, HUNT_BLOCK_PLINTH_TOP_Y - 0.25, z0 - 0.05], [x + 3.32, HUNT_BLOCK_PLINTH_TOP_Y, z0 + depth + 0.3], i);
        kit.add(pile, palette.limestone, at(x, HUNT_BLOCK_PLINTH_TOP_Y, z0 + depth / 2 + 0.05), i);
        box(kit, palette.limestone, [x - 0.85, HUNT_BLOCK_TOP_Y, z0 + 0.9], [x + 0.85, HUNT_BLOCK_TOP_Y + 0.9, z0 + depth - 0.6], i);
      });
    },
  },
];
