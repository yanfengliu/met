/**
 * Materials of the Roche south area that the shared palette (src/model/palette.ts) lacks, each defined once and shared by every piece.
 * Colours: the Lehman pyramid's light grey steel is read by eye from photo P9 (docs/research/interior.md, Lehman Wing: steel #cfd2d4);
 * the roof garden's weathered teak deck from the 2019 roof-garden photograph (docs/research/exterior-images.md #44);
 * flat-roof grey from the 2018 orthophoto (exterior-images.md #9).
 * Glass and water cast no shadows: `glassClear` is transparent and flagged like the palette's glass.
 */
import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

function standard(name: string, colour: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
}

/**
 * Clear glazing rendered from both sides: the parts library's glazing gives single-sheet panes that must be seen from inside a court as well as
 * from the park. A little bluer and denser than the palette's glass (#a9bccb at 30 %), toward [C6]'s park-side glass walls (#7A93A6 as seen) and the
 * reflective look of the Rockefeller wall in photo ref-park-south.
 */
const glassClear = new MeshPhysicalMaterial({
  name: 'rocheSouthGlass',
  color: new Color('#93abbd'),
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
  envMapIntensity: 1.4,
  specularIntensity: 1,
  side: DoubleSide,
});
glassClear.userData['castShadow'] = false;

/**
 * The Rockefeller Wing's rebuilt wall (2025): triple glazing with a bird-safe frit, which in photo ref-park-south reads as pale blue and hides most of
 * the hall behind it. Shared look of the palette's glass, denser and paler.
 */
const glassFritted = new MeshPhysicalMaterial({
  name: 'rocheSouthGlassFritted',
  color: new Color('#a8bccb'),
  roughness: 0.12,
  metalness: 0,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  envMapIntensity: 1.6,
  specularIntensity: 1,
  side: DoubleSide,
});
glassFritted.userData['castShadow'] = false;

/** Diffusing laylight panels under the gallery skylights: opaque to the eye, seen from both sides, but letting the sun through (no shadow). */
const laylight = new MeshStandardMaterial({ name: 'rocheSouthLaylight', color: new Color('#ebece6'), roughness: 0.85, side: DoubleSide });
laylight.userData['castShadow'] = false;

export const mat = Object.freeze({
  glass: glassClear,
  glassFritted,
  /** Light grey painted steel of the Roche glazing frames (P9: #cfd2d4). */
  steel: standard('rocheSouthSteel', '#cfd2d4', 0.45, 0.55),
  /** Flat roof membrane and pavers, grey as in the orthophoto. */
  roof: standard('rocheSouthRoof', '#a7a49c', 0.9),
  /** Weathered teak decking of the Cantor Roof Garden. */
  deck: standard('rocheSouthDeck', '#958774', 0.85),
  /** Foundation concrete, below grade. */
  concrete: standard('rocheSouthConcrete', '#8b8882', 0.95),
  /** The opaque top row of the rebuilt Rockefeller glass wall (2025): white fritted spandrel panels. */
  spandrel: standard('rocheSouthSpandrel', '#d9dcda', 0.35, 0.05),
  laylight,
});
