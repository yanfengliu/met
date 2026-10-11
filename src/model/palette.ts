/**
 * Shared materials (docs/design/spec.md, Batching): builders take materials from here, never cloning one per piece, so equal pieces batch into one InstancedMesh.
 * Owner: the engine creates; others request changes. Base colours come from docs/research/exterior.md section 8 ([C1]..[C7], photographed sRGB) and the
 * colour notes of docs/research/interior.md (suggested bases), as each entry says; limestone is calibrated so the sunlit Fifth Avenue front renders
 * near its photographed #E4E0D7 (see the handoff of the engine worker, 2026-10-11).
 * No texture is fetched. Shadows: a material with `userData.castShadow === false`, or any transparent one, never casts shadows (see `castsShadow` in src/build/batch.ts):
 * glass and water because they are clear, and the flat ground materials because a slab on the ground shades nothing and would only widen the sun's shadow camera.
 */
import { Color, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import type { Material } from 'three';

interface Surface {
  readonly colour: string;
  readonly roughness: number;
  readonly metalness?: number;
  /** False for flat ground surfaces; see the header. */
  readonly castShadow?: boolean;
}

function standard(name: string, surface: Surface): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    name,
    color: new Color(surface.colour),
    roughness: surface.roughness,
    metalness: surface.metalness ?? 0,
  });
  if (surface.castShadow === false) material.userData['castShadow'] = false;
  return material;
}

function glass(name: string, colour: string, opacity: number, roughness: number): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    name,
    color: new Color(colour),
    roughness,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: false,
    envMapIntensity: 1.4,
    specularIntensity: 1,
  });
  material.userData['castShadow'] = false;
  return material;
}

const marbleFloor = new MeshPhysicalMaterial({
  name: 'marbleFloor',
  // interior.md, Great Hall: floor field, suggested base #d8ccb0.
  color: new Color('#d8ccb0'),
  roughness: 0.24,
  metalness: 0,
  clearcoat: 0.35,
  clearcoatRoughness: 0.18,
});

const water = new MeshPhysicalMaterial({
  name: 'water',
  color: new Color('#2b4a52'),
  roughness: 0.05,
  metalness: 0,
  clearcoat: 0.6,
  clearcoatRoughness: 0.05,
});
water.userData['castShadow'] = false;

export const palette = Object.freeze({
  /** Indiana limestone, the Hunt and McKim, Mead & White facades: [C1] attic wall #E4E0D7 overcast, piers #D5D4CF, shafts #CBC8C2..#D0CBC4. */
  limestone: standard('limestone', { colour: '#d6d1c6', roughness: 0.82 }),
  /** Weathered or shaded limestone: plinths, string courses, cresting ([C3] weathered cresting #89857D). */
  limestoneDark: standard('limestoneDark', { colour: '#a29d93', roughness: 0.86 }),
  /** Grey granite: steps, pedestals, landing edges ([C2] #918B81, #8C867D). */
  granite: standard('granite', { colour: '#918b81', roughness: 0.66 }),
  /** Red brick of the 1880 Vaux building ([C7] about #9A4B3A; its granite bands are about #B9B4AA). */
  brick: standard('brick', { colour: '#9a4b3a', roughness: 0.9 }),
  /** Sandstone: the Temple of Dendur (interior.md, Dendur: suggested base #a07a58). */
  sandstone: standard('sandstone', { colour: '#a07a58', roughness: 0.85 }),
  /** Polished marble floors (the Great Hall). */
  marbleFloor,
  /** Light buff stone paving indoors (interior.md, Engelhard Court floor: suggested base #c4b8a0). */
  stoneFloor: standard('stoneFloor', { colour: '#c4b8a0', roughness: 0.6 }),
  /** Interior plaster walls and vaults (interior.md: Grand Staircase vault #e6dccb, Medieval Hall #dcd8d0, Arms and Armor vault #ece6da). */
  plaster: standard('plaster', { colour: '#e4dccd', roughness: 0.92 }),
  /** Clear glazing: skylights and park-side glass walls ([C6] blue-grey, about #6F8FA8 and #7A93A6 as seen). Never casts shadows. */
  glass: glass('glass', '#a9bccb', 0.3, 0.04),
  /** Tinted or dark glazing: door glazing ([C4] #3B4346). Never casts shadows. */
  glassDark: glass('glassDark', '#3b4346', 0.62, 0.06),
  /** Dark bronze-and-steel frames, grilles, railings ([C4] frames #3B4346, grilles near #2E3338). */
  metalDark: standard('metalDark', { colour: '#3b4346', roughness: 0.42, metalness: 0.85 }),
  /** Bronze doors, lamps, fittings. */
  bronze: standard('bronze', { colour: '#7a5a32', roughness: 0.38, metalness: 1 }),
  /** Roofs: brownish membrane or lead ([C6] about #8A7867). */
  roofLead: standard('roofLead', { colour: '#8a7867', roughness: 0.7, metalness: 0.1 }),
  /** Weathered copper (verdigris). */
  copperGreen: standard('copperGreen', { colour: '#6e9e89', roughness: 0.6, metalness: 0.1 }),
  /** Wood doors, benches, floors. */
  wood: standard('wood', { colour: '#8b5c39', roughness: 0.62 }),
  /** Fountain basins and pools. Never casts shadows. */
  water,
  /** Lawns. Never casts shadows. */
  grass: standard('grass', { colour: '#5a7a39', roughness: 1, castShadow: false }),
  /** Roadway ([C5] asphalt photographed #67757B in daylight; base darker). Never casts shadows. */
  asphalt: standard('asphalt', { colour: '#4f585c', roughness: 0.95, castShadow: false }),
  /** Sidewalk and plaza paving ([C5] sidewalk concrete photographed #787878; base lifted for the sunlit render). Never casts shadows. */
  sidewalk: standard('sidewalk', { colour: '#9a9895', roughness: 0.9, castShadow: false }),
  /** Tree crowns and hedges. */
  foliage: standard('foliage', { colour: '#46702e', roughness: 0.9 }),
  /** Tree trunks. */
  bark: standard('bark', { colour: '#4c3a2a', roughness: 1 }),
} satisfies Record<string, Material>);

export type PaletteName = keyof typeof palette;
