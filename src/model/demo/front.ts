/**
 * Temporary demo (src/model/demo/), chapters `demo-front` and `demo-wing`: a portico with steps in front of the toy hall, and a glass wing behind it.
 */
import { palette } from '../palette.js';
import type { StepDef } from '../../build/types.js';
import { column } from './hall.js';
import { PEDIMENT, UNIT_BOX, box, placed } from './shapes.js';

const TERRACE_Y = 1.5;
const PORTICO_Z = 3.5;
const WING_X = 25;
const WING_FRONT = -45;
const WING_BACK = -75;
const WING_TOP = 14;

export const frontSteps: readonly StepDef[] = [
  {
    id: 'demo-front-steps',
    chapter: 'demo',
    year: '1902',
    title: 'Build the terrace and front steps',
    detail: 'Five granite steps and a terrace slide in from the avenue, the lowest step first.',
    motion: { kind: 'slide', from: [0, 0, 25] },
    stagger: '-z',
    build(kit) {
      box(kit, palette.granite, [-21, 0, 0], [21, TERRACE_Y, 5.5]);
      for (let k = 0; k < 5; k += 1) box(kit, palette.granite, [-15, 0, 5.5 + k], [15, TERRACE_Y - 0.25 * (k + 1), 6.5 + k]);
    },
  },
  {
    id: 'demo-portico',
    chapter: 'demo',
    year: '1902',
    title: 'Raise the portico columns',
    detail: 'Eight columns in four pairs rise from below the terrace, from south to north.',
    motion: { kind: 'rise' },
    stagger: 'x',
    build(kit) {
      [-17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5].forEach((x, order) => {
        column(kit, [x, TERRACE_Y, PORTICO_Z], 12.4, 0.7, order);
      });
    },
  },
  {
    id: 'demo-pediment',
    chapter: 'demo',
    year: '1905',
    title: 'Set the entablature and pediment',
    detail: 'The entablature is lowered onto the columns, then the pediment onto the entablature.',
    motion: { kind: 'drop', distance: 8 },
    stagger: 'y',
    build(kit) {
      box(kit, palette.limestone, [-21, 15, -0.5], [21, 16.8, 5]);
      box(kit, palette.limestoneDark, [-21.4, 16.8, -0.5], [21.4, 17.3, 5.4]);
      kit.add(PEDIMENT, palette.limestone, placed([0, 17.3, 2.45], [42, 5, 5.9]));
    },
  },
];

export const wingSteps: readonly StepDef[] = [
  {
    id: 'demo-wing-frame',
    chapter: 'demo',
    year: '1975',
    title: 'Erect the steel frame',
    detail: 'A granite plinth and stone floor, then twenty-one steel columns and seven roof beams.',
    motion: { kind: 'grow' },
    stagger: 'order',
    build(kit) {
      box(kit, palette.granite, [-WING_X, 0, WING_BACK], [WING_X, 1.2, WING_FRONT], 0);
      box(kit, palette.stoneFloor, [-WING_X + 0.2, 1.2, WING_BACK + 0.2], [WING_X - 0.2, 1.5, WING_FRONT], 1);
      let order = 2;
      const post = (x: number, z: number): void => {
        kit.add(UNIT_BOX, palette.metalDark, placed([x, (1.5 + WING_TOP) / 2, z], [0.4, WING_TOP - 1.5, 0.4]), order);
        order += 1;
      };
      for (let x = -WING_X; x <= WING_X; x += 5) post(x, WING_BACK);
      for (let z = WING_BACK + 5; z < WING_FRONT; z += 5) {
        post(-WING_X, z);
        post(WING_X, z);
      }
      for (let z = WING_BACK; z <= WING_FRONT; z += 5) {
        kit.add(UNIT_BOX, palette.metalDark, placed([0, WING_TOP + 0.3, z], [2 * WING_X + 0.4, 0.6, 0.3]), order);
        order += 1;
      }
    },
  },
  {
    id: 'demo-wing-glass',
    chapter: 'demo',
    year: '1975',
    title: 'Glaze the curtain walls and roof',
    detail: 'Glass panes with steel transoms close the three open sides, then the glass roof, from south to north.',
    motion: { kind: 'slide', from: [0, 0, -15] },
    stagger: 'x',
    focus: { kind: 'box', min: [-30, 0, -80], max: [30, 16, -40] },
    build(kit) {
      let order = 0;
      const pane = (centre: [number, number, number], size: [number, number, number], transom: [number, number, number]): void => {
        kit.add(UNIT_BOX, palette.glass, placed(centre, size), order);
        kit.add(UNIT_BOX, palette.metalDark, placed([centre[0], centre[1] - size[1] / 2, centre[2]], transom), order);
        order += 1;
      };
      for (let row = 0; row < 3; row += 1) {
        const y = 1.5 + row * 4.15 + 2.075;
        for (let x = -WING_X + 2.5; x < WING_X; x += 5) pane([x, y, WING_BACK], [4.9, 4.05, 0.05], [5, 0.14, 0.18]);
        for (let z = WING_BACK + 2.5; z < WING_FRONT; z += 5) {
          pane([-WING_X, y, z], [0.05, 4.05, 4.9], [0.18, 0.14, 5]);
          pane([WING_X, y, z], [0.05, 4.05, 4.9], [0.18, 0.14, 5]);
        }
      }
      for (let x = -WING_X + 2.5; x < WING_X; x += 5) {
        for (let z = WING_BACK + 2.5; z < WING_FRONT; z += 5) {
          kit.add(UNIT_BOX, palette.glass, placed([x, WING_TOP + 0.65, z], [4.95, 0.05, 4.95]), order);
          order += 1;
        }
      }
    },
  },
];
