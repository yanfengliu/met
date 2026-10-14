/**
 * Materials of the McKim, Mead & White area that the shared palette lacks, each defined once (docs/design/spec.md, Batching).
 * Colours are the suggested bases of docs/research/interior.md (Arms and Armor Court, Leon Levy and Shelby White Court) or, for the Astor Court, by eye from the
 * Met's published views of a Ming scholar's garden (white walls, grey tiles, dark timber, grey paving); confidence low-medium as each entry says.
 */
import { Color, DoubleSide, MeshStandardMaterial } from 'three';

function standard(name: string, colour: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness });
}

/**
 * A ceiling surface lit from below by the room's own bounce light: the scene's hemisphere light gives downward faces only its warm ground colour, so a vault in a
 * daylit court read dark brown. A dim emissive term of the surface's own colour stands in for the light its windows spill onto it. Interior use only.
 */
function ceiling(name: string, colour: string, bounce: number): MeshStandardMaterial {
  const material = standard(name, colour, 0.9);
  material.emissive = new Color(colour).multiplyScalar(bounce);
  return material;
}

/**
 * Drawn from both sides: the parts library's coffered barrel vault winds some coffer sides away from the room (reported in the handoff), which showed the roof
 * through the coffers. Remove once the library's winding is fixed.
 */
function twoSided(material: MeshStandardMaterial): MeshStandardMaterial {
  material.side = DoubleSide;
  return material;
}

export const mmwMaterials = Object.freeze({
  /** Greek and Roman court floor: dark polished marble (interior.md, P6: #2e3236). */
  marbleDark: standard('mmwMarbleDark', '#2e3236', 0.22),
  /** The court floor's central field of green marble (interior.md, P6: #2f4a3f). */
  marbleGreen: standard('mmwMarbleGreen', '#2f4a3f', 0.24),
  /** White marble inlay and borders (interior.md, P6: #dcd8cf). */
  marbleWhite: standard('mmwMarbleWhite', '#dcd8cf', 0.3),
  /** Dark grey pedestals (interior.md, P6: #5b5f63). */
  pedestalGrey: standard('mmwPedestalGrey', '#5b5f63', 0.5),
  /** Arms and Armor Court floor, warm brown (interior.md, P7: #a88a6a). */
  armorFloor: standard('mmwArmorFloor', '#a88a6a', 0.7),
  /** Flat plaster ceilings of the courts' porticoes, with the same bounce light as the vault. */
  ceilingPlaster: ceiling('mmwCeilingPlaster', '#e4dccd', 0.45),
  /** Arms and Armor Court vault, cream-white (interior.md, P7: vault #ece6da; Robinson 1910). */
  vaultCream: twoSided(ceiling('mmwVaultCream', '#ece6da', 0.62)),
  /** The low platform under the mounted figures (interior.md, P7: edge #4a3a2c). */
  armorPlatform: standard('mmwArmorPlatform', '#4a3a2c', 0.6),
  /** Polished plate armour, steel. */
  steel: standard('mmwSteel', '#b9bdc2', 0.28, 1),
  /** Horses' caparisons and the banners' red. */
  clothRed: standard('mmwClothRed', '#7d2622', 0.85),
  /** Banners' and caparisons' second colour. */
  clothBlue: standard('mmwClothBlue', '#2b3d66', 0.85),
  /** Banners' gold. */
  clothGold: standard('mmwClothGold', '#b8922c', 0.85),
  /** Gilt of the chandeliers and the organ case's pipes. */
  gilt: standard('mmwGilt', '#b08a3e', 0.35, 0.9),
  /** Astor Court: grey roof tiles of the half-pavilion, the walk and the Ming Room. */
  tileGrey: standard('mmwTileGrey', '#45494b', 0.75),
  /** Astor Court: dark lacquered nanmu timber of columns, beams and lattices. */
  timber: standard('mmwTimber', '#5a3324', 0.6),
  /** Astor Court: grey stone paving of the courtyard. */
  pavingGrey: standard('mmwPavingGrey', '#8f8b83', 0.85),
  /** Astor Court: grey Taihu rockery. */
  rock: standard('mmwRock', '#9a9890', 0.95),
  /** Flat roof decks: light grey membrane and pavers (NYC orthophoto 2018). */
  roofDeck: standard('mmwRoofDeck', '#a6a29a', 0.9),
  /** The north end pavilion's hipped tile roof over its south range (orthophoto: brown). */
  roofTile: standard('mmwRoofTile', '#8a5a46', 0.85),
  /** Rooftop plant and the south link's mechanical penthouse, painted metal (orthophoto: pale grey). */
  plant: standard('mmwPlant', '#b8bab8', 0.6, 0.2),
});
