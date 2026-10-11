/**
 * Temporary demo (src/model/demo/), chapter `site`: ground slabs and trees around the toy building.
 * Layout in the world frame: Fifth Avenue runs along +X at z 24 to 40; the toy hall stands at x -20..20, z -45..0; the glass wing behind it to z -75.
 */
import { palette } from '../palette.js';
import type { StepDef } from '../../build/types.js';
import { UNIT_CYLINDER, UNIT_SPHERE, box, seeded, standing } from './shapes.js';

const SITE_X = 110;

export const siteSteps: readonly StepDef[] = [
  {
    id: 'demo-ground',
    chapter: 'demo',
    year: '1872',
    title: 'Lay out the site',
    detail: 'The avenue, its sidewalks, the plaza and the lawn are laid as slabs, from the avenue westward.',
    motion: { kind: 'rise', distance: 1 },
    stagger: '-z',
    weight: 0.8,
    build(kit) {
      box(kit, palette.sidewalk, [-SITE_X, -0.3, 40], [SITE_X, 0.15, 46]);
      box(kit, palette.asphalt, [-SITE_X, -0.3, 24], [SITE_X, 0, 40]);
      box(kit, palette.sidewalk, [-SITE_X, -0.3, 0], [SITE_X, 0.15, 24]);
      box(kit, palette.grass, [-SITE_X, -0.3, -130], [SITE_X, 0.05, 0]);
    },
  },
  {
    id: 'demo-trees',
    chapter: 'demo',
    year: '1872',
    title: 'Plant the trees',
    detail: 'A row of street trees along the avenue and two rows on the lawn behind the building, planted from south to north.',
    motion: { kind: 'grow' },
    stagger: 'x',
    build(kit) {
      const random = seeded(1880);
      const positions: [number, number][] = [];
      for (let x = -95; x <= 95; x += 10) if (Math.abs(x) > 24) positions.push([x, 19]);
      for (const z of [-100, -115]) for (let x = -90; x <= 90; x += 15) positions.push([x, z]);
      positions.forEach(([x, z], order) => {
        const crown = 2.6 + random() * 0.8;
        const trunk = 3.6 + random() * 0.8;
        standing(kit, UNIT_CYLINDER, palette.bark, [x, 0, z], [0.5, trunk + crown * 0.5, 0.5], order);
        standing(kit, UNIT_SPHERE, palette.foliage, [x, trunk, z], [crown * 2, crown * 2.2, crown * 2], order);
      });
    },
  },
];
