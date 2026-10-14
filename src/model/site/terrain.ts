/**
 * Chapter `site`, the earthworks: the park's terrain and the graded street band (history.md section 1, `site-terrain`), and the building pad (`site-pad`).
 * The ground stops exactly on the footprint's outline (footprint.ts) and drops in earth faces to the pad, which lies under every block's lowest floor
 * (grid.ts PAD_Y), so the walls built in later chapters stand in the excavation and their floors cover the pad.
 */
import { Matrix4 } from 'three';

import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { groundGeometry } from './grid.js';
import { siteMaterials } from './materials.js';

const IDENTITY = new Matrix4();

export const terrainStep: StepDef = {
  id: 'site-terrain',
  chapter: 'site',
  title: 'Shape the ground',
  detail: 'The park rises 2 to 9 m west of the avenue; the street band is graded and the footprint excavated to the ground floor.',
  motion: { kind: 'grow' },
  stagger: 'order',
  weight: 1.5,
  focus: { kind: 'preset', id: 'aerial-ne' },
  build(kit) {
    const g = groundGeometry();
    kit.add(g.grass, palette.grass, IDENTITY, 0);
    kit.add(g.bare, siteMaterials.bareGround, IDENTITY, 0);
    kit.add(g.walls, siteMaterials.wallStone, IDENTITY, 0);
    kit.add(g.curbs, siteMaterials.granite, IDENTITY, 0);
    kit.add(g.cuts, siteMaterials.excavation, IDENTITY, 0);
  },
};

export const padStep: StepDef = {
  id: 'site-pad',
  chapter: 'site',
  title: 'Lay the building pad',
  detail: 'A concrete pad marks the footprint of every wing to come, below the ground floor of the 1902 front.',
  motion: { kind: 'rise', distance: 1.5 },
  focus: { kind: 'preset', id: 'aerial-ne' },
  build(kit) {
    kit.add(groundGeometry().pad, siteMaterials.pad, IDENTITY);
  },
};
