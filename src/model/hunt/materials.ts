/**
 * Materials of the Hunt wing that the shared palette (src/model/palette.ts) does not have, each defined once so equal pieces batch (docs/design/spec.md, Batching).
 * Colours: the Great Hall's suggested bases in docs/research/interior.md (The Great Hall, Materials and colours; The Grand Staircase, Elements and colours).
 */
import { Color, MeshStandardMaterial } from 'three';

function stone(name: string, colour: string, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ name, color: new Color(colour), roughness, metalness: 0 });
}

export const hunt = Object.freeze({
  /** Warm-toned Indiana limestone of the Great Hall's walls and piers (suggested base #c8bca4). */
  hallStone: stone('huntHallStone', '#c8bca4', 0.84),
  /** Pendentives and the saucer domes (suggested base #c4b9a0). */
  domeStone: stone('huntDomeStone', '#cdc2a8', 0.88),
  /** The painted half-domes over the end bays (suggested base #b0663a). */
  halfDome: stone('huntHalfDome', '#b0663a', 0.8),
  /** The darker marble bands framing the floor's fields (Heckscher: strips of yellow marble). */
  floorBand: new MeshStandardMaterial({ name: 'huntFloorBand', color: new Color('#a8915f'), roughness: 0.3, metalness: 0 }),
  /** Grey stone of the Grand Staircase's walls and columns (suggested base #a8a49c). */
  stairStone: stone('huntStairStone', '#b4afa5', 0.8),
  /** Foundations and footings below grade. */
  concrete: stone('huntConcrete', '#8f8a82', 0.95),
  /** The flower arrangements in the pier niches and the desk urn. */
  flowers: stone('huntFlowers', '#b9878f', 0.9),
  /** Lantern globes, lit from within. */
  lanternGlow: new MeshStandardMaterial({ name: 'huntLanternGlow', color: new Color('#f3e2c0'), emissive: new Color('#ffd9a0'), emissiveIntensity: 0.9, roughness: 0.5 }),
});
