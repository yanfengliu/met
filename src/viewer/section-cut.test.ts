/**
 * The section cut's materials (src/viewer/section-cut.ts): only the building is cut. `attach` runs over the whole sequence's materials; then every piece
 * the site builds as landscape (src/model/site/index.ts's siteSteps and plaza2014Steps) has a material with no plane, no shadow clipping and no cap
 * pass, except the building's own works there (the excavation faces and the pad); the park's and plaza's trees and the fountains are checked piece
 * by piece with no exception; and every material of a building step (every other step, the 1970 front steps included) gets the plane with shadow
 * clipping, so the building's courts, pools and roof garden stay cut. Which pieces the cap pass draws is src/viewer/cap-pass.test.ts.
 * Bound: the planes `attach` hands out, without WebGL; what the GPU draws is checked by eye in the cut-aerial-ne and cut-top captures, and the cut colour
 * a floor view shows by tests/e2e/floors.spec.ts.
 */
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../build/kit.js';
import { SEQUENCE } from '../build/sequence.js';
import type { StepDef } from '../build/types.js';
import { palette } from '../model/palette.js';
import { plaza2014Steps, siteSteps } from '../model/site/index.js';
import { siteMaterials } from '../model/site/materials.js';
import { cappedBySection, cutBySection, SectionCut } from './section-cut.js';

const LANDSCAPE_STEPS: readonly StepDef[] = [...siteSteps, ...plaza2014Steps];
const LANDSCAPE_IDS = new Set(LANDSCAPE_STEPS.map((s) => s.id));
/** The building's own works the site builds; they stay cut with the building. */
const WORKS = new Set<Material>([siteMaterials.excavation, siteMaterials.pad]);
/** The trees and fountains, which must stay whole in every piece. */
const WHOLE = ['site-trees-park', 'plaza-groves', 'plaza-grove-trees', 'plaza-allees', 'plaza-fountains', 'plaza-fountain-water'];
/**
 * Materials the site's landscape may share with the building, each with its reason. None today: the site takes its own copy of every material the
 * building also uses (src/model/site/materials.ts), so a landscape piece can never be cut, or a building piece left whole, through a shared material.
 */
const SHARED_WITH_BUILDING: ReadonlyMap<Material, string> = new Map();

interface Piece {
  readonly step: string;
  readonly index: number;
  readonly material: Material;
}

const pieces = (steps: readonly StepDef[]): Piece[] => steps.flatMap((step) => collectStep(step).pieces.map((p, index) => ({ step: step.id, index, material: p.material })));

/** Messages for pieces whose material the cut would clip or cap. */
const clipped = (list: readonly Piece[]): string[] =>
  list
    .filter(({ material }) => cutBySection(material) || (material.clippingPlanes?.length ?? 0) > 0 || material.clipShadows || cappedBySection(material))
    .map(({ step, index, material }) => `${step} piece ${String(index)} (${material.name})`);

describe('section cut materials', () => {
  const cut = new SectionCut();
  const site = pieces(LANDSCAPE_STEPS);
  const building = pieces(SEQUENCE.filter((s) => !LANDSCAPE_IDS.has(s.id)));
  cut.attach(new Set([...site, ...building].map((p) => p.material)));

  it('leaves every landscape piece the site builds whole, but for the building works', () => {
    expect(site.length).toBeGreaterThan(100);
    expect(clipped(site.filter((p) => !WORKS.has(p.material))), 'landscape pieces the cut would clip or cap').toEqual([]);
  });

  it('leaves the park and plaza trees and the fountains whole in every piece', () => {
    for (const id of WHOLE) {
      const own = site.filter((p) => p.step === id);
      expect(own.length, `pieces of ${id}`).toBeGreaterThan(0);
      expect(clipped(own), `${id}: pieces the cut would clip or cap`).toEqual([]);
    }
  });

  it("shares no material with the building, and never the palette's foliage or bark", () => {
    const buildingMaterials = new Set(building.map((p) => p.material));
    const shared = [...new Set(site.map((p) => p.material))].filter((m) => buildingMaterials.has(m) && !SHARED_WITH_BUILDING.has(m)).map((m) => m.name);
    expect(shared, 'materials the site landscape shares with the building').toEqual([]);
    const palettePlants = site.filter((p) => p.material === palette.foliage || p.material === palette.bark).map((p) => `${p.step} piece ${String(p.index)} (${p.material.name})`);
    expect(palettePlants, "site pieces on the palette's foliage or bark").toEqual([]);
  });

  it('gives every material a building step uses, and the building works, the cut plane with shadow clipping', () => {
    const materials = [...new Set([...building.map((p) => p.material), ...WORKS])];
    expect(materials.length).toBeGreaterThan(20);
    const uncut = materials.filter((m) => m.clippingPlanes?.length !== 1 || m.clippingPlanes[0] !== cut.plane || !m.clipShadows).map((m) => m.name);
    expect(uncut, 'building materials the cut would not clip').toEqual([]);
    // The courts, pools and roof garden use the palette's foliage, bark and water; the site's trees and fountains have their own.
    for (const material of [palette.foliage, palette.bark, palette.water, palette.granite, palette.limestone, palette.glass]) expect(cutBySection(material), material.name).toBe(true);
  });

  it('leaves landscape and transparent meshes out of the cap pass, and caps the rest', () => {
    expect(cappedBySection(siteMaterials.foliage)).toBe(false);
    expect(cappedBySection(siteMaterials.water)).toBe(false);
    expect(cappedBySection(palette.glass)).toBe(false);
    expect(cappedBySection(palette.limestone)).toBe(true);
    expect(cappedBySection(palette.water)).toBe(true);
  });
});
