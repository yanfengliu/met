/**
 * Hunt facade, the three great arches and the openings: archivolts and impost blocks on the wall face, the screens inside each arch (pilasters and two small
 * Ionic columns, the door entablature, the banner panel, the transom and the lunette's mullions), the railings on the landing, then all the glazing.
 * Evidence: S7 (Schneider 2019) at 1:1 (outer order 10.2 m, inner order 8.3 m springing at Y 13.3; screen members and heights), S10 (PerpetualTraveler 2022)
 * for the Ionic screen columns and the Greek-key door entablature.
 */
import * as THREE from 'three';

import type { Kit, StepDef } from '../../build/types.js';
import { doorTag } from '../doors.js';
import { palette } from '../palette.js';
import { PLINTH_WIDTH } from '../lib/column.js';
import { archivolt, barrelVault, columnParts, doorUnit, MeshBuilder, moulding, surround, windowUnit } from '../lib/index.js';
import type { DoorParts } from '../lib/window.js';
import {
  ARCH_CROWN_Y,
  ARCH_INNER_SPAN,
  ARCH_OUTER_SPAN,
  ARCH_SKIN,
  ARCH_SPRING_Y,
  ARCHIVOLT_BAND,
  BAY_X,
  EXT_FACE_Z,
  EXT_NORTH_X,
  EXT_SOUTH_X,
  IMPOST_H,
  IMPOST_W,
  LANDING,
  MAIN,
  PAIR_X,
  PAVILION_HALF,
  PEDESTAL_BASE_W,
  SCREEN_ENTABLATURE_TOP_Y,
  SCREEN_HEAD_Y,
  SCREEN_Z,
  TRANSOM_BOTTOM_Y,
  TRANSOM_TOP_Y,
  WALL_Z,
} from './dims.js';
import { hunt } from './materials.js';
import { at, box, lunetteGrille, UNIT_BOX } from './shapes.js';
import { EXT_WINDOW } from './walls.js';

const HALF = ARCH_INNER_SPAN / 2;
/** Screen members across the inner opening (S7 at 1:1): side pilasters 0.85 m, Ionic columns of 0.6 m at ±1.2, three equal openings of 1.8 m. */
const SCREEN_PILASTER = 0.85;
const SCREEN_COLUMN_X = 1.2;
const SCREEN_COLUMN_D = 0.6;
/** The screen's three openings across each arch, X spans about the arch's centre; in the central arch they are the entrance's doors (src/model/collection/placement.test.ts keeps clear of their swing). */
export const OPENINGS: readonly (readonly [number, number])[] = [
  [-HALF + SCREEN_PILASTER, -SCREEN_COLUMN_X - SCREEN_COLUMN_D / 2],
  [-SCREEN_COLUMN_X + SCREEN_COLUMN_D / 2, SCREEN_COLUMN_X - SCREEN_COLUMN_D / 2],
  [SCREEN_COLUMN_X + SCREEN_COLUMN_D / 2, HALF - SCREEN_PILASTER],
];
/** The doors of the central arch's three openings, from −X (src/model/doors.ts). */
const ENTRANCE_DOORS: readonly string[] = ['hunt-entrance-south', 'hunt-entrance-middle', 'hunt-entrance-north'];
/** Half the side of the screen columns' plinths (1.5 D square, src/model/lib/column.ts). */
const PLINTH_HALF = (PLINTH_WIDTH * SCREEN_COLUMN_D) / 2;
/** The gap the entrance's doors keep from the columns' plinths, and their depth (frame, bars and the bronze beside them), metres. */
const DOOR_CLEAR = 0.004;
const DOOR_DEPTH = 0.14;
/**
 * The entrance's doors stand behind the screen's columns, as at the building: S10 shows each opening's bronze frame in a stone reveal behind its column,
 * and S8 bronze beside the shafts' feet and stone beside their tapering tops. Each door's front face is 4 mm behind the columns' plinths and each door
 * 4 mm clear of them across, so no leaf meets a plinth however it swings (work unit 2, review 8, F31); bronze fills each opening on either side of its
 * door, piers behind the columns and the pilasters' backs close the screen down to the doors, and a lintel spans their heads.
 */
export const ENTRANCE_DOOR_Z = SCREEN_Z - PLINTH_HALF - DOOR_CLEAR;
export const ENTRANCE_DOOR_WIDTH = 2 * (SCREEN_COLUMN_X - PLINTH_HALF) - 2 * DOOR_CLEAR;
/**
 * The entrance doors' transom light, metres from its bar to the head: S8 (Haklai 2012, at full size) shows each opening's leaves up to a transom bar at
 * 119 of its 219 px (54%), a single fixed pane above; of the model's 4.79 m opening that leaves the leaves 2.60 m with the frame's sill.
 */
const ENTRANCE_TRANSOM = 2.1;
/** The entrance's door unit (src/model/lib/window.ts `doorUnit`): each opening's pair of glazed leaves in its bronze frame, under its transom light. */
export function entranceDoor(): DoorParts {
  return doorUnit({ width: ENTRANCE_DOOR_WIDTH, height: SCREEN_HEAD_Y - MAIN, leaves: 2, glazed: true, lights: 1, transom: ENTRANCE_TRANSOM, frame: 0.09, bar: 0.09, depth: DOOR_DEPTH });
}
/** Windows in the side arches stand on a solid base; the central arch has doors to the floor. */
const WINDOW_SILL_Y = MAIN + 1.1;
const SCREEN_D = 0.5;
/** Lunette mullion posts at ±1.0..1.5 m (S7: posts 0.5 m wide). */
const MULLION = { inner: 1.0, outer: 1.5 } as const;
/** The lunette grille (lunetteGrille's parameters) and the height of its base, the lunette's springing; it stands 0.1 m inside the intrados. */
export const LUNETTE_GRILLE = { span: ARCH_INNER_SPAN - 0.2, base: 0, cell: 0.42, bar: 0.05, depth: 0.06, y: TRANSOM_TOP_Y + 0.05 } as const;

const merged = new Map<string, { metal: THREE.BufferGeometry; glass: THREE.BufferGeometry }>();
/** A window unit's frame and bars as one metal geometry (they share a material, so one mesh), with its glass. */
function glazed(params: Parameters<typeof windowUnit>[0]): { metal: THREE.BufferGeometry; glass: THREE.BufferGeometry } {
  const key = JSON.stringify(params);
  const hit = merged.get(key);
  if (hit !== undefined) return hit;
  const unit = windowUnit(params);
  const b = new MeshBuilder();
  b.append(unit.frame);
  b.append(unit.bars);
  const made = { metal: b.build(), glass: unit.glass };
  merged.set(key, made);
  return made;
}

/** Height of the inner intrados above the springing at offset dx from the arch's centre. */
function intradosAt(dx: number): number {
  return Math.sqrt(Math.max(0, HALF * HALF - dx * dx));
}

/**
 * The coffered soffit of each arch's inner order, from just behind the outer order's face back to the screen (S10: deep coffers in the soffit), its shell
 * deep enough to hold them. Its front stands SOFFIT_SET back, so that the shell's outer face, wider than the wall's opening, lies in the wall, not in its face.
 */
const SOFFIT_SET = 0.01;
const SOFFIT_LENGTH = -SCREEN_Z - ARCH_SKIN - 0.05 - SOFFIT_SET;

function arch(kit: Kit, x: number, order: number): void {
  kit.add(archivolt({ span: ARCH_OUTER_SPAN, band: ARCHIVOLT_BAND, projection: 0.22 }), palette.limestone, at(x, ARCH_SPRING_Y, WALL_Z), order);
  const soffit = barrelVault({ span: ARCH_INNER_SPAN - 0.16, length: SOFFIT_LENGTH, thickness: 0.14, coffers: { across: 11, along: 1, depth: 0.1, rib: 0.16 } });
  kit.add(soffit, palette.limestone, at(x, ARCH_SPRING_Y, WALL_Z - ARCH_SKIN - SOFFIT_SET - SOFFIT_LENGTH / 2), order);
  const impost = moulding({
    profile: 'cornice-plain',
    path: [
      [-IMPOST_W / 2, 0, 0],
      [-IMPOST_W / 2, 0, 0.32],
      [IMPOST_W / 2, 0, 0.32],
      [IMPOST_W / 2, 0, 0],
    ],
    height: 0.42,
    projection: 0.16,
  });
  for (const s of [-1, 1]) {
    const cx = x + s * (ARCH_OUTER_SPAN / 2 + IMPOST_W / 2);
    box(kit, palette.limestone, [cx - IMPOST_W / 2, ARCH_SPRING_Y - IMPOST_H, WALL_Z], [cx + IMPOST_W / 2, ARCH_SPRING_Y - 0.42, WALL_Z + 0.32], order);
    kit.add(impost, palette.limestone, at(cx, ARCH_SPRING_Y - 0.42, WALL_Z), order);
  }
}

/** The stonework of one screen; `doors` leaves the openings down to the floor, otherwise a base under windows. */
function screen(kit: Kit, x: number, doors: boolean, order: number): void {
  const z0 = SCREEN_Z - SCREEN_D / 2;
  const z1 = SCREEN_Z + SCREEN_D / 2;
  for (const s of [-1, 1]) {
    const xa = x + s * HALF;
    const xb = x + s * (HALF - SCREEN_PILASTER);
    box(kit, palette.limestone, [Math.min(xa, xb), MAIN, z0], [Math.max(xa, xb), SCREEN_HEAD_Y, z1], order);
  }
  const ionic = columnParts({ order: 'ionic', diameter: SCREEN_COLUMN_D, height: SCREEN_HEAD_Y - MAIN, detail: 'low' });
  for (const s of [-1, 1]) {
    const m = at(x + s * SCREEN_COLUMN_X, MAIN, SCREEN_Z);
    if (ionic.base !== undefined) kit.add(ionic.base, palette.limestone, m, order);
    kit.add(ionic.shaft, palette.limestone, m, order);
    kit.add(ionic.capital, palette.limestone, m, order);
  }
  if (!doors) for (const [a, b] of OPENINGS) box(kit, palette.limestone, [x + a, MAIN, z0], [x + b, WINDOW_SILL_Y, z1], order);
  if (doors) {
    // Down to the doors' back face, behind the screen: the pilasters' backs, a pier behind each column, and a lintel over the doors' heads.
    const back = ENTRANCE_DOOR_Z - DOOR_DEPTH;
    for (const s of [-1, 1]) {
      const xa = x + s * HALF;
      const xb = x + s * (HALF - SCREEN_PILASTER);
      box(kit, palette.limestone, [Math.min(xa, xb), MAIN, back], [Math.max(xa, xb), SCREEN_HEAD_Y, z0], order);
      const pa = x + s * (SCREEN_COLUMN_X - SCREEN_COLUMN_D / 2);
      const pb = x + s * (SCREEN_COLUMN_X + SCREEN_COLUMN_D / 2);
      box(kit, palette.limestone, [Math.min(pa, pb), MAIN, back], [Math.max(pa, pb), SCREEN_HEAD_Y, SCREEN_Z - SCREEN_COLUMN_D / 2], order);
    }
    box(kit, palette.limestone, [x - HALF, SCREEN_HEAD_Y, back], [x + HALF, SCREEN_HEAD_Y + 0.5, z0 - 0.05], order);
  }
  // Door entablature (architrave, Greek-key frieze, cornice), the banner panel, the transom.
  box(kit, palette.limestone, [x - HALF, SCREEN_HEAD_Y, z0 - 0.05], [x + HALF, SCREEN_HEAD_Y + 0.5, z1 + 0.05], order);
  box(kit, palette.limestoneDark, [x - HALF, SCREEN_HEAD_Y + 0.5, z0], [x + HALF, SCREEN_ENTABLATURE_TOP_Y - 0.45, z1 + 0.02], order);
  box(kit, palette.limestone, [x - HALF, SCREEN_ENTABLATURE_TOP_Y - 0.45, z0 - 0.05], [x + HALF, SCREEN_ENTABLATURE_TOP_Y, z1 + 0.22], order);
  box(kit, palette.limestone, [x - HALF, SCREEN_ENTABLATURE_TOP_Y, z0 - 0.1], [x + HALF, TRANSOM_BOTTOM_Y, z1 - 0.12], order);
  box(kit, palette.limestone, [x - HALF, TRANSOM_BOTTOM_Y, z0 - 0.05], [x + HALF, TRANSOM_TOP_Y, z1 + 0.15], order);
  // Lunette mullion posts, up to the intrados.
  for (const s of [-1, 1]) {
    const top = ARCH_SPRING_Y + intradosAt(MULLION.inner);
    const xa = x + s * MULLION.inner;
    const xb = x + s * MULLION.outer;
    box(kit, palette.limestone, [Math.min(xa, xb), TRANSOM_TOP_Y, z0 + 0.1], [Math.max(xa, xb), top, z1 - 0.1], order);
  }
}

/** Railings on the landing in front of the side arches, between the pedestals (S7: a lattice of crossed bars). */
function railing(kit: Kit, x0: number, x1: number, order: number): void {
  const z = 3.2;
  const h = 1.1;
  const y0 = LANDING;
  box(kit, palette.metalDark, [x0, y0 + h - 0.06, z - 0.04], [x1, y0 + h, z + 0.04], order);
  box(kit, palette.metalDark, [x0, y0 + 0.08, z - 0.03], [x1, y0 + 0.13, z + 0.03], order);
  const bays = Math.max(1, Math.round((x1 - x0) / 1.6));
  const w = (x1 - x0) / bays;
  for (let k = 0; k <= bays; k++) box(kit, palette.metalDark, [x0 + k * w - 0.04, y0, z - 0.04], [x0 + k * w + 0.04, y0 + h, z + 0.04], order);
  const diagonal = Math.hypot(w, h - 0.2);
  const angle = Math.atan2(h - 0.2, w);
  for (let k = 0; k < bays; k++) {
    const cx = x0 + (k + 0.5) * w;
    for (const s of [-1, 1]) {
      const q = new THREE.Matrix4().compose(new THREE.Vector3(cx, y0 + 0.1 + (h - 0.2) / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s * angle), new THREE.Vector3(diagonal, 0.03, 0.03));
      kit.add(UNIT_BOX, palette.metalDark, q, order);
    }
  }
}

export const archSteps: readonly StepDef[] = [
  {
    id: 'hunt-arches',
    chapter: 'hunt-1902',
    year: '1900',
    title: 'Turn the three great arches',
    detail: 'Moulded archivolts and impost blocks frame the three arches; inside each, a screen of pilasters and two Ionic columns carries a Greek-key entablature, a panel and the lunette.',
    motion: { kind: 'drop', distance: 6 },
    stagger: 'order',
    build(kit) {
      BAY_X.forEach((x, i) => {
        arch(kit, x, i);
        screen(kit, x, x === 0, i);
      });
      // Railings between the pedestals, in front of the side arches.
      for (const s of [-1, 1]) {
        const a = s * (PAIR_X[2] + PEDESTAL_BASE_W / 2 + 0.1);
        const b = s * (PAIR_X[3] - PEDESTAL_BASE_W / 2 - 0.1);
        railing(kit, Math.min(a, b), Math.max(a, b), 3);
      }
    },
  },
  {
    id: 'hunt-windows',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Glaze the doors, lunettes and windows',
    detail: 'Bronze-framed glass doors fill the central arch, windows the side arches; square-latticed grilles cover the three lunettes, and the wings get their pedimented windows.',
    motion: { kind: 'slide', from: [0, 0, 2.5] },
    stagger: 'x',
    build(kit) {
      const lunette = windowUnit({ width: ARCH_INNER_SPAN, height: ARCH_CROWN_Y - (TRANSOM_TOP_Y - 0.25), shape: 'arch', cols: 1, rows: 1, frame: 0.1, depth: 0.12 });
      const g = LUNETTE_GRILLE;
      const grille = lunetteGrille(g.span, g.base, g.cell, g.bar, g.depth);
      for (const x of BAY_X) {
        const doors = x === 0;
        kit.add(lunette.frame, palette.metalDark, at(x, TRANSOM_TOP_Y - 0.25, SCREEN_Z - 0.05));
        kit.add(lunette.glass, palette.glassDark, at(x, TRANSOM_TOP_Y - 0.25, SCREEN_Z - 0.05));
        kit.add(grille, palette.metalDark, at(x, g.y, SCREEN_Z + 0.1));
        OPENINGS.forEach(([a, b], i) => {
          const width = b - a;
          const bottom = doors ? MAIN : WINDOW_SILL_Y;
          if (doors) {
            // The entrance's doors (src/model/doors.ts): in a bronze frame, a pair of glazed leaves, one tall pane each in a bronze frame, which open, under
            // a transom bar at 54% of the opening and a fixed transom light (S8, Haklai 2012, at full size), behind the columns (ENTRANCE_DOOR_Z) with
            // bronze filling the opening either side. The leaves are solid, held by the walk's collision where the door layer turns them
            // (src/walk/door-world.ts); the frame, the bronze beside it and the transom light are passable copies of the palette's, as the fixed glazing
            // before them was. The leaves' bronze casts no shadow, so their swing needs no shadow pass (hunt.doorLeafBronze).
            const cx = x + (a + b) / 2;
            const m = at(cx, bottom, ENTRANCE_DOOR_Z);
            const door = entranceDoor();
            const tag = doorTag(ENTRANCE_DOORS[i] ?? '');
            kit.add(door.frame, hunt.doorBronze, m);
            if (door.glass !== undefined) kit.add(door.glass, hunt.doorGlass, m);
            kit.addTagged(door.leaf, hunt.doorLeafBronze, m, tag);
            if (door.leafGlass !== undefined) kit.addTagged(door.leafGlass, hunt.doorLeafGlass, m, tag);
            for (const [inner, outer] of [[cx - ENTRANCE_DOOR_WIDTH / 2, x + a], [cx + ENTRANCE_DOOR_WIDTH / 2, x + b]] as const) {
              box(kit, hunt.doorBronze, [Math.min(inner, outer), bottom, ENTRANCE_DOOR_Z - DOOR_DEPTH], [Math.max(inner, outer), SCREEN_HEAD_Y, ENTRANCE_DOOR_Z]);
            }
            return;
          }
          const m = at(x + (a + b) / 2, bottom, SCREEN_Z + 0.07);
          const unit = glazed({ width, height: SCREEN_HEAD_Y - bottom, cols: 2, rows: 4, frame: 0.09, bar: 0.05, depth: 0.14 });
          kit.add(unit.metal, palette.bronze, m);
          kit.add(unit.glass, palette.glassDark, m);
        });
      }
      // The wings: two tall pedimented windows over two ground-floor windows each (S7 at the pavilion's ends).
      const tall = glazed({ width: EXT_WINDOW.width, height: EXT_WINDOW.height, cols: 2, rows: 4, frame: 0.09, bar: 0.04 });
      const ground = glazed({ width: EXT_WINDOW.groundWidth, height: EXT_WINDOW.groundHeight, cols: 2, rows: 2, frame: 0.07, bar: 0.04 });
      const aedicule = surround({ width: EXT_WINDOW.width, height: EXT_WINDOW.height, head: 'triangular', trim: 0.32, projection: 0.16, pitch: 20 });
      for (const [x0, x1] of [
        [EXT_SOUTH_X, -PAVILION_HALF],
        [PAVILION_HALF, EXT_NORTH_X],
      ] as const) {
        const cx = (x0 + x1) / 2;
        for (const s of [-1, 1]) {
          const x = cx + s * EXT_WINDOW.offset;
          kit.add(tall.metal, palette.bronze, at(x, EXT_WINDOW.sill, EXT_FACE_Z - 0.3));
          kit.add(tall.glass, palette.glassDark, at(x, EXT_WINDOW.sill, EXT_FACE_Z - 0.3));
          kit.add(aedicule, palette.limestone, at(x, EXT_WINDOW.sill, EXT_FACE_Z));
          kit.add(ground.metal, palette.bronze, at(x, EXT_WINDOW.groundSill, EXT_FACE_Z - 0.3));
          kit.add(ground.glass, palette.glassDark, at(x, EXT_WINDOW.groundSill, EXT_FACE_Z - 0.3));
        }
      }
    },
  },
];
