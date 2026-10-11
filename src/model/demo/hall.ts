/**
 * Temporary demo (src/model/demo/), chapter `demo-hall`: a stone hall 40 m by 45 m behind the origin, on a plinth, with a colonnade, lamps, a roof and a dome.
 * The hall floor is at y 1.5; its walls rise to 16.5. The floor step is the demo's big instanced mesh (1,020 tiles).
 */
import { Color, PointLight, SpotLight } from 'three';

import { palette } from '../palette.js';
import type { Kit, StepDef, Vec3 } from '../../build/types.js';
import { DOME, SHAFT, UNIT_BOX, UNIT_CYLINDER, UNIT_SPHERE, box, placed, standing } from './shapes.js';

const HALL_X = 20;
const HALL_FRONT = 0;
const HALL_BACK = -45;
const FLOOR_Y = 1.5;
const WALL = 1.25;
const WALL_TOP = 16.5;
const COURSE = 1.5;
const BLOCK = 2.5;
const TILE = 1.25;
const DOME_Z = -22;

/** A column on its base at `base`: plinth block, tapered shaft and capital, all with the same order. */
export function column(kit: Kit, base: Vec3, shaftHeight: number, radius: number, order: number): void {
  const [x, y, z] = base;
  standing(kit, UNIT_BOX, palette.granite, [x, y, z], [radius * 3, 0.5, radius * 3], order);
  standing(kit, SHAFT, palette.limestone, [x, y + 0.5, z], [radius * 2, shaftHeight, radius * 2], order);
  standing(kit, UNIT_BOX, palette.limestoneDark, [x, y + 0.5 + shaftHeight, z], [radius * 3.3, 0.6, radius * 3.3], order);
}

function wallRun(kit: Kit, axis: 'x' | 'z', fixed: [number, number], from: number, blocks: number, skip: (block: number, course: number) => boolean): void {
  for (let course = 0; course < (WALL_TOP - FLOOR_Y) / COURSE; course += 1) {
    const y0 = FLOOR_Y + course * COURSE;
    for (let block = 0; block < blocks; block += 1) {
      if (skip(block, course)) continue;
      const a = from + block * BLOCK;
      if (axis === 'x') box(kit, palette.limestone, [a, y0, fixed[0]], [a + BLOCK, y0 + COURSE, fixed[1]]);
      else box(kit, palette.limestone, [fixed[0], y0, a], [fixed[1], y0 + COURSE, a + BLOCK]);
    }
  }
}

export const hallSteps: readonly StepDef[] = [
  {
    id: 'demo-footings',
    chapter: 'demo',
    year: '1880',
    title: 'Pour the footings and plinth',
    detail: 'Seventy-two granite blocks make the plinth the hall stands on, poured row by row from the front.',
    motion: { kind: 'rise' },
    stagger: 'order',
    weight: 0.8,
    build(kit) {
      for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          const x = -HALL_X + col * 5;
          const z = HALL_FRONT - row * 5;
          box(kit, palette.granite, [x, -1.5, z - 5], [x + 5, FLOOR_Y, z]);
        }
      }
    },
  },
  {
    id: 'demo-floor',
    chapter: 'demo',
    year: '1880',
    title: 'Lay the marble floor',
    detail: 'A thousand and twenty marble tiles spread out from the centre of the hall.',
    motion: { kind: 'pop' },
    stagger: 'radial',
    weight: 1.5,
    build(kit) {
      const inner = HALL_X - WALL;
      for (let i = 0; i < 30; i += 1) {
        for (let k = 0; k < 34; k += 1) {
          const x = -inner + (i + 0.5) * TILE;
          const z = HALL_FRONT - WALL - (k + 0.5) * TILE;
          kit.add(UNIT_BOX, palette.marbleFloor, placed([x, FLOOR_Y + 0.03, z], [TILE - 0.05, 0.06, TILE - 0.05]));
        }
      }
    },
  },
  {
    id: 'demo-walls',
    chapter: 'demo',
    year: '1880',
    title: 'Raise the walls course by course',
    detail: 'Limestone blocks are laid in ten courses with a door, an opening to the wing and a row of windows, then the cornice.',
    motion: { kind: 'drop' },
    stagger: 'y',
    weight: 1.5,
    build(kit) {
      const door = (block: number, course: number): boolean => course < 4 && (block === 7 || block === 8);
      const opening = (block: number, course: number): boolean => course < 4 && block >= 6 && block <= 9;
      const windows = (block: number, course: number): boolean => (course === 5 || course === 6) && block % 2 === 1;
      wallRun(kit, 'x', [HALL_FRONT - WALL, HALL_FRONT], -HALL_X, 16, door);
      wallRun(kit, 'x', [HALL_BACK, HALL_BACK + WALL], -HALL_X, 16, opening);
      wallRun(kit, 'z', [-HALL_X, -HALL_X + WALL], HALL_BACK + WALL, 17, windows);
      wallRun(kit, 'z', [HALL_X - WALL, HALL_X], HALL_BACK + WALL, 17, windows);
      const c = 0.5;
      box(kit, palette.limestoneDark, [-HALL_X - c, WALL_TOP, HALL_FRONT - WALL], [HALL_X + c, WALL_TOP + 0.8, HALL_FRONT + c]);
      box(kit, palette.limestoneDark, [-HALL_X - c, WALL_TOP, HALL_BACK - c], [HALL_X + c, WALL_TOP + 0.8, HALL_BACK + WALL]);
      box(kit, palette.limestoneDark, [-HALL_X - c, WALL_TOP, HALL_BACK + WALL], [-HALL_X + WALL, WALL_TOP + 0.8, HALL_FRONT - WALL]);
      box(kit, palette.limestoneDark, [HALL_X - WALL, WALL_TOP, HALL_BACK + WALL], [HALL_X + c, WALL_TOP + 0.8, HALL_FRONT - WALL]);
    },
  },
  {
    id: 'demo-columns',
    chapter: 'demo',
    year: '1880',
    title: 'Stand the colonnade',
    detail: 'Two rows of seven columns grow from the floor, front to back.',
    motion: { kind: 'grow' },
    stagger: 'z',
    focus: { kind: 'preset', id: 'int-great-hall-floor-north' },
    build(kit) {
      let order = 0;
      for (const x of [-11, 11]) {
        for (let k = 0; k < 7; k += 1) {
          column(kit, [x, FLOOR_Y, -6 - k * 5], 9, 0.55, order);
          order += 1;
        }
      }
    },
  },
  {
    id: 'demo-lamps',
    chapter: 'demo',
    year: '1880',
    title: 'Hang the lamps and place the statue',
    detail: 'Three bronze lamps light the hall and a spotlight picks out the statue at its centre.',
    motion: { kind: 'pop' },
    stagger: 'order',
    weight: 0.8,
    focus: { kind: 'view', position: [0, 4, -4], target: [0, 6, -26] },
    build(kit) {
      const warm = new Color('#ffd7a1');
      [-10, -22, -34].forEach((z, order) => {
        standing(kit, UNIT_CYLINDER, palette.metalDark, [0, 10.6, z], [0.08, WALL_TOP - 10.6, 0.08], order);
        standing(kit, UNIT_SPHERE, palette.bronze, [0, 9.6, z], [1.2, 1.2, 1.2], order);
        const lamp = new PointLight(warm, 260, 22, 2);
        lamp.position.set(0, 9.2, z);
        kit.light(lamp);
      });
      standing(kit, UNIT_BOX, palette.granite, [0, FLOOR_Y, DOME_Z], [2.2, 1.6, 2.2], 3);
      standing(kit, UNIT_SPHERE, palette.bronze, [0, FLOOR_Y + 1.6, DOME_Z], [1.1, 2.6, 1.1], 3);
      const spot = new SpotLight(new Color('#fff1dc'), 900, 30, 0.32, 0.5, 2);
      spot.position.set(0, 15.5, DOME_Z + 3);
      spot.target.position.set(0, FLOOR_Y + 1.5, DOME_Z);
      kit.light(spot);
    },
  },
  {
    id: 'demo-roof',
    chapter: 'demo',
    year: '1880',
    title: 'Slide the roof panels in',
    detail: 'Eight lead roof panels slide in from the south, the northernmost first.',
    motion: { kind: 'slide', from: [-45, 0, 0] },
    stagger: '-x',
    build(kit) {
      for (let k = 0; k < 8; k += 1) {
        const x = -HALL_X + k * 5;
        box(kit, palette.roofLead, [x, WALL_TOP, HALL_BACK + 0.25], [x + 5, WALL_TOP + 0.6, HALL_FRONT - 0.25]);
      }
    },
  },
  {
    id: 'demo-dome',
    chapter: 'demo',
    year: '1880',
    title: 'Set the dome',
    detail: 'Drum, copper dome and lantern are lowered onto the roof together.',
    motion: { kind: 'drop' },
    stagger: 'none',
    weight: 0.8,
    build(kit) {
      const top = WALL_TOP + 0.6;
      standing(kit, UNIT_CYLINDER, palette.limestone, [0, top, DOME_Z], [14, 3, 14]);
      kit.add(DOME, palette.copperGreen, placed([0, top + 3, DOME_Z], [7, 5.6, 7]));
      standing(kit, UNIT_CYLINDER, palette.limestone, [0, top + 8.4, DOME_Z], [2, 2.4, 2]);
      standing(kit, UNIT_SPHERE, palette.copperGreen, [0, top + 10.8, DOME_Z], [2.2, 1.6, 2.2]);
    },
  },
];
