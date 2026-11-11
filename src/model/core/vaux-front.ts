/**
 * The Vaux and Mould west front of 1880 (history.md section 2; exterior.md [K7] and section 9), facing the park at Z −138.3 and surviving inside the
 * Robert Lehman Wing (seen in int-lehman-pyramid-up): red brick over a ground storey of light rusticated stone with square-headed windows, five of
 * the 1880 arches (vaux-arch.ts) 5.8 m apart on the main floor, the entrance on the axis, and a string course, cornice and parapet over them.
 * References, each read at native size: Original_Met.jpg (about 1880, the front's north half beside its porch), 1880_Met_Museum.jpg (about 1900, the
 * whole front from the southwest) and the views from the Lehman Wing (Untapped New York 2026 and 2012; Forgotten New York 2023; Heckscher 1995, figs.
 * 105 and 107), exterior-images.md #49, #53, #60, #61, #62, #63 and #64; the floor map's doors through the front (exterior.md section 9). Trim may
 * project up to 1.5 m into the Lehman court (coordinator, 2026-10-11); walls do not.
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { MeshBuilder, moulding, windowUnit } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall, type Hole } from './arches.js';
import { A_HALF, COPING_TOP_Y, CORNICE_Y, L1, LG, PARAPET_Y, VAUX_ARCH_SPAN, VAUX_BAND, VAUX_BAY, VAUX_GROUND_HEIGHT, VAUX_GROUND_SILL, VAUX_HALL_EAST_Z, VAUX_HALL_WALL, VAUX_HALL_WEST_Z, VAUX_INNER_ORDER, VAUX_OCULUS, VAUX_OCULUS_Y, WEST_WALL, WEST_Z } from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, memo, placed, runsBetween } from './shapes.js';
import { CLEAR, COURSE, JOINT, LINTEL_Y, ORDER_PROUD, RUST_Y0, SILL_Y, SPRING_Y, archHoles, darkHead, lightHead } from './vaux-arch.js';

/** Foot of the walls, on the footings (constants FOOTING_Y + 1.0). */
export const WALL_BASE_Y = LG - 0.3;

/** World X of the front's five arches, the entrance on the axis, 5.8 m apart (constants.ts VAUX_BAY): five in #53, #60 and #64, two either side of the porch in #49 and #65. */
export const FRONT_ARCH_X = [-2, -1, 0, 1, 2].map((k) => k * VAUX_BAY);
/**
 * The arches that open to the main floor as doorways: the middle three, as today (#60, #61, #62; the floor map's doors at X −5.78, 0 and +5.76, each
 * about 2.3 m wide). The two beside the entrance join the Lehman Wing's main floor to gallery 521 (the owner's call, 2026-11-04: "Open both"); the
 * outer two hold windows.
 */
export const WEST_DOORWAY_X: readonly number[] = [-VAUX_BAY, 0, VAUX_BAY];
const doorway = (x: number): boolean => WEST_DOORWAY_X.includes(x);

/** The ground storey's windows (#53), on the joints of its courses (vaux-arch.ts). */
const GROUND_WIDTH = 2.2;
/** The central door into the ground floor (the floor map's, 2.31 m), as wide as before, its head on a joint. */
const DOOR_WIDTH = 2.2;
const DOOR_HEAD_Y = RUST_Y0 + 5 * COURSE;
const PROUD = 0.08;
/** The string course over the arches, under the cornice: its middle 1.85 m over the crowns in #53, read upright at #60's 6.3 m from the main floor to the springing. */
const STRING_Y = 15.9;

function frontHoles(): Hole[] {
  const holes: Hole[] = [];
  for (const x of FRONT_ARCH_X) {
    holes.push(...archHoles(x, WALL_BASE_Y, { sill: doorway(x) ? L1 : SILL_Y, through: true }));
    if (x === 0) holes.push({ x, y: LG - WALL_BASE_Y, width: DOOR_WIDTH, height: DOOR_HEAD_Y - LG });
    else holes.push({ x, y: LG + VAUX_GROUND_SILL - WALL_BASE_Y, width: GROUND_WIDTH, height: VAUX_GROUND_HEIGHT });
  }
  return holes;
}

/** The front's brick wall, 29 m across and 1.5 m thick, outer face on Z −138.3, from the footings to the parapet. */
export function westFrontWall(kit: Kit): void {
  const geometry = openWall({ width: 2 * A_HALF, height: PARAPET_Y - WALL_BASE_Y, thickness: WEST_WALL, holes: frontHoles() });
  kit.add(geometry, core.vauxBrick, placed(0, WALL_BASE_Y, WEST_Z, FACING.west));
}

/** A granite band across the front from y0 to y1, standing `proud` in front of the wall face (from `back` out), split round the gaps (world X ranges). */
function band(kit: Kit, y0: number, y1: number, order: number, gaps: readonly (readonly [number, number])[] = [], proud = PROUD, back = 0): void {
  for (const [x0, x1] of runsBetween(-A_HALF, A_HALF, gaps)) addBox(kit, core.granite, x0, y0, WEST_Z - back - proud, x1, y1, WEST_Z - back);
}

/** The ground storey's rustication: each course a face 6 cm proud and over it a block 4 cm prouder, short of the joint above it. */
function rustication(kit: Kit): void {
  for (let j = 0; j < 10; j++) {
    const y0 = RUST_Y0 + j * COURSE;
    const y1 = y0 + COURSE;
    const gaps = FRONT_ARCH_X.flatMap((x): [number, number][] => {
      const [h0, h1] = x === 0 ? [LG, DOOR_HEAD_Y] : [LG + VAUX_GROUND_SILL, LG + VAUX_GROUND_SILL + VAUX_GROUND_HEIGHT];
      const w = (x === 0 ? DOOR_WIDTH : GROUND_WIDTH) / 2;
      return y0 < h1 - 1e-6 && y1 > h0 + 1e-6 ? [[x - w, x + w]] : [];
    });
    band(kit, y0, y1, 1, gaps, 0.06);
    band(kit, y0, y1 - JOINT, 1, gaps, 0.04, 0.06);
  }
}

/** Granite bands and rustication, the jambs' inner order, the string course, cornice and coping; the arches' heads come with the openings. */
export function westFrontTrim(kit: Kit): void {
  band(kit, WALL_BASE_Y, RUST_Y0, 0, [], 0.12);
  rustication(kit);
  const doors = FRONT_ARCH_X.filter(doorway).map((x): [number, number] => [x - CLEAR / 2, x + CLEAR / 2]);
  band(kit, L1 - 0.2, L1 + 0.12, 2, doors);
  // The impost band runs across the whole front, over each opening as its lintel (#53, #60, #61).
  band(kit, LINTEL_Y, SPRING_Y, 4);
  for (const x of FRONT_ARCH_X) {
    const sill = doorway(x) ? L1 : SILL_Y;
    // A window stands over a light granite apron (#53, #61).
    if (!doorway(x)) addBox(kit, core.granite, x - VAUX_ARCH_SPAN / 2, L1 + 0.12, WEST_Z - 0.05, x + VAUX_ARCH_SPAN / 2, sill, WEST_Z);
    // The inner order runs down the jambs to the sill or the floor (#61).
    for (const side of [-1, 1]) {
      const edge = x + side * (CLEAR / 2);
      addBox(kit, core.granite, edge, sill, WEST_Z - ORDER_PROUD, edge + side * VAUX_INNER_ORDER, LINTEL_Y, WEST_Z);
    }
  }
  band(kit, STRING_Y, STRING_Y + VAUX_BAND, 6);
  const cornice = moulding({ profile: 'cornice-plain', path: [[-A_HALF, 0, 0], [A_HALF, 0, 0]], height: 0.8, projection: 0.6 });
  kit.add(cornice, core.granite, placed(0, CORNICE_Y, WEST_Z, FACING.west));
  addBox(kit, core.granite, -A_HALF, PARAPET_Y, WEST_Z - 0.1, A_HALF, COPING_TOP_Y, WEST_Z + WEST_WALL);
}

/**
 * The heads of the front's five arches, set with the openings (vaux.ts): light voussoirs, the inner order and the striped tympanum (#60, #61) as one piece;
 * the dark voussoirs, grey stone, never brick, in every colour photograph of the front, rock-faced where one is sharp enough to show it (#60 to #64), as
 * another; no hood round them (#53, #60, #61, #63, #64).
 */
export function westFrontHeads(kit: Kit): void {
  for (const x of FRONT_ARCH_X) {
    const at = placed(x, SPRING_Y, WEST_Z, FACING.west);
    kit.add(lightHead('west'), core.granite, at);
    kit.add(darkHead('west'), core.graniteDark, at);
  }
}

/** Windows in the front's arches that are not doorways and in the ground storey's four windows; and glass in the hall's two oculi. */
export function westFrontWindows(kit: Kit): void {
  const disc = cylinder(20);
  for (const z of [VAUX_HALL_WEST_Z - VAUX_HALL_WALL / 2, VAUX_HALL_EAST_Z + VAUX_HALL_WALL / 2]) {
    kit.add(disc, palette.glass, new Matrix4().makeTranslation(0, VAUX_OCULUS_Y, z).multiply(new Matrix4().makeRotationX(Math.PI / 2)).multiply(new Matrix4().makeScale(VAUX_OCULUS, 0.03, VAUX_OCULUS)));
  }
  const main = windowUnit({ width: CLEAR, height: LINTEL_Y - SILL_Y, cols: 2, rows: 2, frame: 0.1 });
  const ground = windowUnit({ width: GROUND_WIDTH, height: VAUX_GROUND_HEIGHT, cols: 2, rows: 2 });
  // Each window's frame and bars as one piece (the core's mesh budget).
  const metal = (name: string, parts: { readonly frame: BufferGeometry; readonly bars: BufferGeometry }): BufferGeometry =>
    memo(`vauxWindowMetal:${name}:${parts.frame.uuid}:${parts.bars.uuid}`, () => {
      const b = new MeshBuilder();
      b.append(parts.frame);
      b.append(parts.bars);
      return b.build();
    });
  const mainMetal = metal('main', main);
  const groundMetal = metal('ground', ground);
  for (const x of FRONT_ARCH_X) {
    if (x === 0) continue;
    const at = (y: number) => placed(x, y, WEST_Z + 0.4, FACING.west);
    if (!doorway(x)) {
      kit.add(mainMetal, palette.metalDark, at(SILL_Y));
      kit.add(main.glass, palette.glassDark, at(SILL_Y));
    }
    kit.add(groundMetal, palette.metalDark, at(LG + VAUX_GROUND_SILL));
    kit.add(ground.glass, palette.glassDark, at(LG + VAUX_GROUND_SILL));
  }
}
