/**
 * Materials of the site area that the shared palette does not have, each defined once here (docs/design/spec.md, Batching).
 * Colours are sRGB as photographed or judged from the reference images of docs/research/exterior-images.md (the 2018 orthophoto and the Hałun 2023 view);
 * flat ground surfaces opt out of shadow casting like the palette's ground materials, and water jets are transparent, so they never cast shadows.
 */
import { Color, MeshStandardMaterial } from 'three';

function surface(name: string, colour: string, roughness: number, castShadow: boolean, metalness = 0): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
  if (!castShadow) material.userData['castShadow'] = false;
  return material;
}

const jet = new MeshStandardMaterial({ name: 'siteJet', color: new Color('#eef5f8'), roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false });
jet.userData['castShadow'] = false;

export const siteMaterials = Object.freeze({
  /** Graded earth under the streets and drives before they are paved. */
  bareGround: surface('siteBareGround', '#857a69', 1, false),
  /** The cut faces of the building excavation round the footprint. */
  excavation: surface('siteExcavation', '#6b5b49', 1, false),
  /** The building pad: a concrete slab at the bottom of the excavation. */
  pad: surface('sitePad', '#b9ae98', 0.95, false),
  /** Manhattan schist outcrops: dark grey with a faint sheen (King of Hearts 2013, the park north of the American Wing). */
  schist: surface('siteSchist', '#5f5c58', 0.8, true),
  /** Retaining walls of the drives and the park's perimeter wall: grey ashlar. */
  wallStone: surface('siteWallStone', '#8a847a', 0.9, true),
  /** Lane markings, crosswalk bars and stop lines. */
  paint: surface('sitePaint', '#e6e4dd', 0.7, false),
  /** Park paths: the light asphalt of the orthophoto. */
  pathAsphalt: surface('sitePathAsphalt', '#7b7974', 0.95, false),
  /** The 2014 plaza's light granite paving (Schneider 2019, dry). */
  plazaGranite: surface('sitePlazaGranite', '#a7a39b', 0.75, false),
  /** The fountains' dark granite squares (Hałun 2023). */
  darkGranite: surface('siteDarkGranite', '#3b3d3e', 0.4, false),
  /** Fountain jets: clear water. Transparent, so it never casts shadows. */
  jet,
  /** The red angular parasols over the benches (orthophoto 2018, both end pavilions). */
  parasolRed: surface('siteParasolRed', '#c3302a', 0.6, true),
  /** Decomposed granite under the grove trees (orthophoto 2018). */
  gravel: surface('siteGravel', '#958f85', 1, false),
  /** The front steps' treads: lighter than the risers (palette granite), as the granite reads in Schneider 2019 with the treads lit and the risers in shade. */
  stepTread: surface('siteStepTread', '#b4afa5', 0.7, true),
  /** A deeper green for some park crowns. */
  foliageDeep: surface('siteFoliageDeep', '#3d5f2a', 0.9, true),
  /** A second, yellower foliage green, so the park's trees are not all one colour. */
  foliageLight: surface('siteFoliageLight', '#5b7f34', 0.9, true),
  /** The dark glossy evergreen of the southern magnolias by the steps (Hałun 2023). */
  foliageDark: surface('siteFoliageDark', '#2e4a26', 0.7, true),
});
