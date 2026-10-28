/**
 * Materials the core area needs beyond src/model/palette.ts, each created once and shared (docs/design/spec.md, Batching).
 * Colours: exterior.md [C7] (the Vaux front's granite bands about #B9B4AA and its dark voussoirs), interior.md "The Medieval Sculpture Hall" (iron
 * #1e1c1a, gilding #b08a3e, walls and vault #dcd8d0), the Petrie Court photo (interior-images.md #33: Weston's light grey stone trim) and Heckscher's
 * black-and-white marble floor with red-slate borders (interior.md). Everything else comes from the palette.
 */
import { Color, DoubleSide, MeshStandardMaterial } from 'three';
import type { Material } from 'three';

import { palette } from '../palette.js';

function standard(name: string, colour: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
}

const screenIron = standard('core.screenIron', '#1e1c1a', 0.45, 0.8);

/** A copy of a palette material under its own name, looking the same. */
function named<T extends Material>(source: T, name: string): T {
  const material = source.clone();
  material.name = name;
  return material;
}

/** `material`, casting no shadow (src/build/batch.ts `castsShadow`). */
function shadowless<T extends Material>(material: T): T {
  material.userData['castShadow'] = false;
  return material;
}

export const core = Object.freeze({
  /** The Vaux front's grey-white granite bands, voussoirs and trim ([C7] about #B9B4AA). */
  granite: standard('core.granite', '#b9b4aa', 0.72),
  /**
   * The rock-faced dark grey granite of the Vaux voussoirs that alternate with the light ones ([C7]): the light granite's colour times 0.72, which
   * renders at about 0.62 of the light granite seen from the Lehman court, as five photographs read the dark stones against the light, 0.63 on average.
   */
  graniteDark: standard('core.graniteDark', '#85827a', 0.85),
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
  /** Light aluminium of the gallery skylights and laylights (exterior.md [R2]: glass in aluminium frames; the 2018 orthophoto shows light frames). */
  aluminium: standard('core.aluminium', '#c3c7ca', 0.45, 0.6),
  /**
   * The wood of the 1888 door's leaves (weston-facade.ts), which open: the palette's wood, casting no shadow, so a swing's frames redraw no shadow map, as
   * with the Fifth Avenue entrance's leaves (docs/design/spec.md, Doors: No shadow from the leaves). Their shadow would fall only where there
   * is shade already: under the page's one sun (src/viewer/sun.ts, 76° off the facade's normal, from the east) the porch and the doorway's east reveal
   * shade all behind the leaves. Closed or a quarter turn open, no point of the floor and reveals behind the frame, of gallery 529's floor within 3.7 m
   * of the door or of its west wall is sunlit even without them (a probe through the finished model's casters, 2026-10-27).
   */
  westonDoorWood: shadowless(named(palette.wood, 'core.westonDoorWood')),
});

/** Glass that must read from both sides (skylight and laylight panes face one way). */
export const glassBoth = (() => {
  const material = palette.glass.clone();
  material.name = 'core.glassBoth';
  material.side = DoubleSide;
  material.userData['castShadow'] = false;
  return material;
})();
