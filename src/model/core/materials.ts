/**
 * Materials the core area needs beyond src/model/palette.ts, each created once and shared (docs/design/spec.md, Batching).
 * Colours: exterior.md [C7] (the Vaux front's granite bands about #B9B4AA), interior.md "The Medieval Sculpture Hall" (iron #1e1c1a, gilding #b08a3e,
 * walls and vault #dcd8d0), the Petrie Court photo (interior-images.md #33: Weston's light grey stone trim) and Heckscher's black-and-white
 * marble floor with red-slate borders (interior.md). Everything else comes from the palette.
 */
import { Color, DoubleSide, MeshStandardMaterial } from 'three';

import { palette } from '../palette.js';

function standard(name: string, colour: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
}

const screenIron = standard('core.screenIron', '#1e1c1a', 0.45, 0.8);

export const core = Object.freeze({
  /** The Vaux front's grey-white granite bands, voussoirs and trim ([C7] about #B9B4AA). */
  granite: standard('core.granite', '#b9b4aa', 0.72),
  /** Weston's light grey stone base, piers, arches and cornice (Petrie Court photo). */
  westonStone: standard('core.westonStone', '#c4c0b7', 0.78),
  /** The Medieval Sculpture Hall's plaster walls and vault (interior.md #dcd8d0). */
  hallPlaster: standard('core.hallPlaster', '#dcd8d0', 0.9),
  /** Dark marble and slate of the hall floor pattern. */
  slate: standard('core.slate', '#3d3b3a', 0.35),
  /** Wrought iron of the choir screen (interior.md #1e1c1a). */
  screenIron,
  /** Gilded friezes and cresting of the choir screen (interior.md #b08a3e). */
  gilt: standard('core.gilt', '#b08a3e', 0.32, 1),
  /** Rubble-stone and concrete foundations. */
  footing: standard('core.footing', '#7d776e', 0.95),
  /** Cast iron of Radford's frame, columns and stairs. */
  castIron: standard('core.castIron', '#34393b', 0.5, 0.7),
});

/** Glass that must read from both sides (skylight and laylight panes face one way). */
export const glassBoth = (() => {
  const material = palette.glass.clone();
  material.name = 'core.glassBoth';
  material.side = DoubleSide;
  material.userData['castShadow'] = false;
  return material;
})();
