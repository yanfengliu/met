/**
 * Materials of the site area that the shared palette does not have, each defined once here (docs/design/spec.md, Batching).
 * Colours are sRGB as photographed or judged from the reference images of docs/research/exterior-images.md (the 2018 orthophoto and the Hałun 2023 view);
 * flat ground surfaces opt out of shadow casting like the palette's ground materials, and water jets are transparent, so they never cast shadows.
 * Landscape opts out of the section cut (`userData.sectionCut === false`, src/viewer/section-cut.ts): only the building is cut, so everything the site
 * builds as landscape stays whole: trees, ground, streets, paths, rocks, walls, fences, lamps, benches, fountains and the plaza's furniture. Where the
 * building uses a palette material too (granite, dark metal, wood, glass, water, sidewalk paving, foliage, bark), the site takes its own copy, so the
 * building's courts, pools and roof garden stay cut with the building. Only the building's own works stay cut here: the excavation faces, the pad and
 * the front steps' treads (src/model/site/steps.ts builds those steps with the palette's granite and metal).
 */
import { Color, MeshStandardMaterial } from 'three';
import type { Material } from 'three';

import { palette } from '../palette.js';

function surface(name: string, colour: string, roughness: number, castShadow: boolean, metalness = 0): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
  if (!castShadow) material.userData['castShadow'] = false;
  return material;
}

/** Marks `material` as landscape the section cut leaves whole. */
function uncut<T extends Material>(material: T): T {
  material.userData['sectionCut'] = false;
  return material;
}

/** A copy of a palette material for the site's own landscape, under its own name. */
function landscapeCopy<T extends Material>(source: T, name: string): T {
  const material = source.clone();
  material.name = name;
  return uncut(material);
}

const jet = new MeshStandardMaterial({ name: 'siteJet', color: new Color('#eef5f8'), roughness: 0.15, metalness: 0, transparent: true, opacity: 0.7, depthWrite: false });
jet.userData['castShadow'] = false;

export const siteMaterials = Object.freeze({
  /** Graded earth under the streets and drives before they are paved. */
  bareGround: uncut(surface('siteBareGround', '#857a69', 1, false)),
  /** The cut faces of the building excavation round the footprint: the building's works, so cut. */
  excavation: surface('siteExcavation', '#6b5b49', 1, false),
  /** The building pad: a concrete slab at the bottom of the excavation; the building's works, so cut. */
  pad: surface('sitePad', '#b9ae98', 0.95, false),
  /** Manhattan schist outcrops: dark grey with a faint sheen (King of Hearts 2013, the park north of the American Wing). */
  schist: uncut(surface('siteSchist', '#5f5c58', 0.8, true)),
  /** Retaining walls of the drives and the park's perimeter wall: grey ashlar. */
  wallStone: uncut(surface('siteWallStone', '#8a847a', 0.9, true)),
  /** Lane markings, crosswalk bars and stop lines. */
  paint: uncut(surface('sitePaint', '#e6e4dd', 0.7, false)),
  /** The roadway's gutters along the curbs, darker than the lanes. */
  gutter: uncut(surface('siteGutter', '#454b4e', 0.9, false)),
  /** The frosted globes of the park's cast-iron lamp posts. */
  lampGlobe: uncut(surface('siteLampGlobe', '#f1eee4', 0.35, true)),
  /** Park paths: the light asphalt of the orthophoto. */
  pathAsphalt: uncut(surface('sitePathAsphalt', '#7b7974', 0.95, false)),
  /** The 2014 plaza's granite paving: a cool mid grey, about 0.7 of the limestone's lightness in Schneider 2019 (paving #7c7f84 by columns #bdb5a8). */
  plazaGranite: uncut(surface('sitePlazaGranite', '#979a9d', 0.75, false)),
  /** The fountains' dark granite squares (Hałun 2023). */
  darkGranite: uncut(surface('siteDarkGranite', '#3b3d3e', 0.4, false)),
  /** Fountain jets: clear water. Transparent, so it never casts shadows. */
  jet: uncut(jet),
  /** The red angular parasols over the benches (orthophoto 2018, both end pavilions). */
  parasolRed: uncut(surface('siteParasolRed', '#c3302a', 0.6, true)),
  /** Decomposed granite under the grove trees (orthophoto 2018). */
  gravel: uncut(surface('siteGravel', '#958f85', 1, false)),
  /** The front steps' treads, a shade lighter than the risers (palette granite); Schneider 2019 reads the flight at #716c65..#84827b by columns #bdb5a8. */
  stepTread: surface('siteStepTread', '#a39e94', 0.7, true),
  /** The site's tree crowns, shrubs and hedges: the palette's foliage, as landscape. */
  foliage: landscapeCopy(palette.foliage, 'siteFoliage'),
  /** The site's tree trunks: the palette's bark, as landscape. */
  bark: landscapeCopy(palette.bark, 'siteBark'),
  /** Curbs, plaza kerbs and benches: the palette's granite, as landscape. */
  granite: landscapeCopy(palette.granite, 'siteGranite'),
  /** Fences, lamp posts, bench frames, parasol masts, tables, chairs and light poles: the palette's dark metal, as landscape. */
  metalDark: landscapeCopy(palette.metalDark, 'siteMetalDark'),
  /** Park bench seats: the palette's wood, as landscape. */
  wood: landscapeCopy(palette.wood, 'siteWood'),
  /** The lenses of the plaza's light poles: the palette's glass, as landscape. */
  glass: landscapeCopy(palette.glass, 'siteGlass'),
  /** The plaza fountains' water: the palette's water, as landscape; the building's pools keep the palette's, which is cut. */
  water: landscapeCopy(palette.water, 'siteWater'),
  /** The avenue's sidewalks: the palette's paving, as landscape. */
  sidewalk: landscapeCopy(palette.sidewalk, 'siteSidewalk'),
  /** A deeper green for some park crowns. */
  foliageDeep: uncut(surface('siteFoliageDeep', '#3d5f2a', 0.9, true)),
  /** A second, yellower foliage green, so the park's trees are not all one colour. */
  foliageLight: uncut(surface('siteFoliageLight', '#5b7f34', 0.9, true)),
  /** The dark glossy evergreen of the southern magnolias by the steps (Hałun 2023). */
  foliageDark: uncut(surface('siteFoliageDark', '#2e4a26', 0.7, true)),
});
