/**
 * The section cut's materials (src/viewer/section-cut.ts): only the building is cut. Over the whole sequence's materials, `attach` gives every material
 * a building step uses the cut plane with shadow clipping, and none to the materials the site marks as landscape (`userData.sectionCut === false`):
 * the trees' foliage and bark, the ground, paths, rocks and walls of the park. The cap pass leaves landscape and transparent meshes out.
 * Building steps are those of every area but the site's arrays (src/model/site/index.ts).
 * Bound: the planes `attach` hands out, without WebGL; what the GPU draws is checked by eye in the cut-aerial-ne and cut-top captures.
 */
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../build/kit.js';
import { SEQUENCE } from '../build/sequence.js';
import { palette } from '../model/palette.js';
import { frontSteps1970, plaza2014Steps, siteSteps } from '../model/site/index.js';
import { siteMaterials } from '../model/site/materials.js';
import { cappedBySection, cutBySection, SectionCut } from './section-cut.js';

const SITE_STEPS = new Set([...siteSteps, ...frontSteps1970, ...plaza2014Steps].map((s) => s.id));

/** The site's landscape: what must stay whole. */
const LANDSCAPE: Readonly<Record<string, Material>> = {
  'site foliage': siteMaterials.foliage,
  'site bark': siteMaterials.bark,
  'deep foliage': siteMaterials.foliageDeep,
  'light foliage': siteMaterials.foliageLight,
  'magnolia foliage': siteMaterials.foliageDark,
  grass: palette.grass,
  asphalt: palette.asphalt,
  'bare ground': siteMaterials.bareGround,
  'path asphalt': siteMaterials.pathAsphalt,
  gravel: siteMaterials.gravel,
  'plaza granite': siteMaterials.plazaGranite,
  schist: siteMaterials.schist,
  'retaining walls': siteMaterials.wallStone,
};

function materialsOf(building: boolean): Set<Material> {
  const out = new Set<Material>();
  for (const step of SEQUENCE) if (SITE_STEPS.has(step.id) !== building) for (const piece of collectStep(step).pieces) out.add(piece.material);
  return out;
}

describe('section cut materials', () => {
  const cut = new SectionCut();
  const building = materialsOf(true);
  const site = materialsOf(false);
  cut.attach([...building, ...site]);

  it('gives no clipping plane, and no shadow clipping, to the site landscape', () => {
    for (const [name, material] of Object.entries(LANDSCAPE)) {
      expect(site.has(material), `${name} is used by the site`).toBe(true);
      expect(cutBySection(material), `${name} opts out of the cut`).toBe(false);
      expect(material.clippingPlanes ?? [], `${name}: clipping planes`).toEqual([]);
      expect(material.clipShadows, `${name}: shadow clipping`).toBe(false);
    }
  });

  it('gives every material a building step uses the cut plane with shadow clipping', () => {
    expect(building.size).toBeGreaterThan(20);
    const uncut = [...building].filter((m) => m.clippingPlanes?.length !== 1 || m.clippingPlanes[0] !== cut.plane || !m.clipShadows).map((m) => m.name);
    expect(uncut, 'building materials the cut would not clip').toEqual([]);
    // The courts and the roof garden use the palette's foliage and bark, so those stay cut; the site's trees have their own.
    for (const material of [palette.foliage, palette.bark, palette.limestone, palette.brick, palette.glass]) expect(building.has(material) && cutBySection(material), material.name).toBe(true);
  });

  it('leaves landscape and transparent meshes out of the cap pass, and caps the rest', () => {
    for (const [name, material] of Object.entries(LANDSCAPE)) expect(cappedBySection(material), name).toBe(false);
    expect(cappedBySection(palette.glass)).toBe(false);
    expect(cappedBySection(palette.limestone)).toBe(true);
    expect(cappedBySection(palette.foliage)).toBe(true);
  });
});
