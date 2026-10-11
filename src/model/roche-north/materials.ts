/**
 * Materials of the Roche north area that the shared palette lacks, each defined once (docs/design/spec.md, Batching).
 * Colours are the suggested bases of docs/research/interior.md ("The Temple of Dendur", "The Charles Engelhard Court"), read from photographs P4 and P5.
 * Glass never casts shadows: it is transparent. Water comes from the shared palette.
 * Single-pane glass is double-sided, as the parts library's glazing expects.
 */
import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

function stone(name: string, colour: string, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness: 0 });
}

function sheet(name: string, colour: string, opacity: number, roughness: number): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({ name, color: new Color(colour), roughness, metalness: 0, transparent: true, opacity, depthWrite: false, side: DoubleSide, envMapIntensity: 1.2 });
  material.userData['castShadow'] = false;
  return material;
}

export const areaMaterials = Object.freeze({
  /** The Sackler's stippled north glass: clear enough to see the park through, milky in the light (Aramco World 1980; P4). */
  stippledGlass: sheet('rn-stippledGlass', '#c9d6de', 0.4, 0.12),
  /** The hung stippled glass ceiling, a diffuser: interior.md suggests #c9ccc4. */
  ceilingGlass: sheet('rn-ceilingGlass', '#d4d8d0', 0.9, 0.55),
  /** Clear glazing seen from inside and out: roofs, the west curtain wall, balcony fronts. */
  clearGlass: sheet('rn-clearGlass', '#b4c6d2', 0.24, 0.05),
  /** White-painted steel: the Sackler mullions and fins, the Engelhard Court's tubular roof frame (interior.md: #d8dcdc and #f0efec). */
  whiteSteel: new MeshStandardMaterial({ name: 'rn-whiteSteel', color: new Color('#eeede9'), roughness: 0.45, metalness: 0.1 }),
  /** The same white steel above the Sackler's stippled ceiling, which diffuses the sun, so its bars and girders cast no stripes on the gallery. */
  whiteSteelDiffused: (() => {
    const material = new MeshStandardMaterial({ name: 'rn-whiteSteelDiffused', color: new Color('#eeede9'), roughness: 0.45, metalness: 0.1 });
    material.userData['castShadow'] = false;
    return material;
  })(),
  /** The Dendur back wall's light ashlar (interior.md: #b2aca2). */
  ashlar: stone('rn-ashlar', '#b9b1a3', 0.9),
  /** The grey granite facing of the Dendur platform and pool walls (interior.md: #5a524c, lifted toward the lit photographs). */
  platformGranite: stone('rn-platformGranite', '#7a716a', 0.55),
  /** The Dendur gallery floor (interior.md: #8e7d70; P4 reads lighter in daylight). */
  galleryFloor: stone('rn-galleryFloor', '#a69584', 0.45),
  /** Worn sandstone flagstones of the gate and forecourt, lighter than the temple's walls (Haklai 2012). */
  oldPaving: stone('rn-oldPaving', '#b9a68a', 0.9),
  /** Rough-hewn pale blocks at the platform's west end, suggesting the cliff (P4). */
  roughStone: stone('rn-roughStone', '#c9c1b2', 0.95),
  /** Grey-white marble of the Branch Bank facade (interior.md: #c8c8c4). */
  bankMarble: stone('rn-bankMarble', '#cfcfca', 0.6),
  /** White marble sculpture and pedestals in the court (P5). */
  whiteMarble: stone('rn-whiteMarble', '#ecebe6', 0.4),
  /** Verdigris cast-iron lamp standards (interior.md: #3d5a4a by eye). */
  verdigris: new MeshStandardMaterial({ name: 'rn-verdigris', color: new Color('#3f5e4d'), roughness: 0.55, metalness: 0.5 }),
  /** Saint-Gaudens' Diana, gilded (interior.md: #c49a4a by eye). */
  gilt: new MeshStandardMaterial({ name: 'rn-gilt', color: new Color('#c9a050'), roughness: 0.3, metalness: 1 }),
  /** Favrile glass of the Tiffany loggia's capitals: iridescent blue-green (Met API object 133). */
  favrile: new MeshStandardMaterial({ name: 'rn-favrile', color: new Color('#3f8a8f'), roughness: 0.22, metalness: 0.55 }),
  /** Concrete of foundations and structural slabs, below the finishes. */
  concrete: stone('rn-concrete', '#9a958c', 0.92),
  /** Interior plaster partitions of the period rooms. */
  roomPlaster: stone('rn-roomPlaster', '#e6ded0', 0.92),
  /** The 1924 wing's plain buff walls above the bank facade (P5: a light wall behind the facade). */
  buffWall: stone('rn-buffWall', '#ddd3c2', 0.9),
});
