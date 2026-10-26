/**
 * Materials of the collection (docs/design/spec.md, Collection). Every artwork of a step shares one material, so its pieces batch by form whatever their
 * colours: the material's vertex shader finds which artwork an instance is by the instance's plan position (the translation of its matrix, which no
 * motion this module's steps use moves in X or Z) in a small table of the step's artworks, and takes that artwork's colour, roughness and metalness, and
 * for a painting's canvas its 8 × 8 colour grid on the front face. The table is a float DataTexture read with texelFetch; the timeline's own instance
 * colour (the arrival tint) still multiplies it. Colours are the catalogue's sRGB values, converted to linear for the table.
 * Rows: 0 holds each artwork's plan position (x, z); 1 its linear colour; 2 its roughness, metalness and the first row of its grid (−1 for none);
 * from row 3, 8 rows of 8 cells per painting, top row first.
 * Bound: an instance takes the colour of the artwork nearest it in plan, so two artworks of one step must stand apart in plan (the placement test checks
 * 5 cm or more); the shadow, cap and pick passes do not read the table, and need no colour.
 */
import { Color, DataTexture, FloatType, MeshStandardMaterial, NearestFilter, RGBAFormat } from 'three';

/** One artwork as its material draws it. */
export interface ArtSurface {
  /** Where its object piece stands in plan: the translation of the piece's matrix, X and Z. */
  readonly x: number;
  readonly z: number;
  /** sRGB '#rrggbb'. */
  readonly colour: string;
  /** 64 sRGB cells, row by row from the top, for a painting's canvas. */
  readonly grid?: readonly string[];
  readonly roughness: number;
  readonly metalness: number;
}

/** The most artworks one step's material holds (the shader's loop bound). */
export const MAX_ARTWORKS = 64;
const GRID = 8;

/** The table the shader reads: a float RGBA texture as wide as the step has artworks (at least 8), 3 rows plus 8 for each painting. */
export function artTable(surfaces: readonly ArtSurface[]): DataTexture {
  if (surfaces.length === 0 || surfaces.length > MAX_ARTWORKS) throw new Error(`artTable: a step holds 1 to ${String(MAX_ARTWORKS)} artworks; got ${String(surfaces.length)}.`);
  const width = Math.max(GRID, surfaces.length);
  const painted = surfaces.filter((s) => s.grid !== undefined);
  const height = 3 + GRID * painted.length;
  const data = new Float32Array(width * height * 4);
  const set = (col: number, row: number, values: readonly number[]): void => {
    data.set(values, (row * width + col) * 4);
  };
  const linear = (hex: string): number[] => {
    const c = new Color(hex);
    return [c.r, c.g, c.b, 1];
  };
  let next = 3;
  surfaces.forEach((s, i) => {
    set(i, 0, [s.x, s.z, 0, 1]);
    set(i, 1, linear(s.colour));
    let gridRow = -1;
    if (s.grid !== undefined) {
      if (s.grid.length !== GRID * GRID) throw new Error(`artTable: a painting's grid has ${String(GRID * GRID)} cells; artwork ${String(i)} has ${String(s.grid.length)}.`);
      gridRow = next;
      s.grid.forEach((cell, k) => {
        set(k % GRID, gridRow + Math.floor(k / GRID), linear(cell));
      });
      next += GRID;
    }
    set(i, 2, [s.roughness, s.metalness, gridRow, 0]);
  });
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const VERTEX_PARS = /* glsl */ `
uniform highp sampler2D artTable;
uniform int artCount;
varying vec3 vArtColour;
varying vec2 vArtSurface;
flat varying int vArtGrid;
varying vec3 vArtLocal;
`;

const VERTEX_MAIN = /* glsl */ `
#ifdef USE_INSTANCING
  vec4 artOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#else
  vec4 artOrigin = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
#endif
  int artBest = 0;
  float artNearest = 1e30;
  for (int i = 0; i < ${String(MAX_ARTWORKS)}; i++) {
    if (i >= artCount) break;
    vec2 artKey = texelFetch(artTable, ivec2(i, 0), 0).xy - artOrigin.xz;
    float artDistance = dot(artKey, artKey);
    if (artDistance < artNearest) {
      artNearest = artDistance;
      artBest = i;
    }
  }
  vArtColour = texelFetch(artTable, ivec2(artBest, 1), 0).rgb;
  vec4 artSurface = texelFetch(artTable, ivec2(artBest, 2), 0);
  vArtSurface = artSurface.xy;
  vArtGrid = int(artSurface.z);
  vArtLocal = position;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform highp sampler2D artTable;
varying vec3 vArtColour;
varying vec2 vArtSurface;
flat varying int vArtGrid;
varying vec3 vArtLocal;
`;

const FRAGMENT_COLOUR = /* glsl */ `
  vec3 artColour = vArtColour;
  if (vArtGrid >= 0 && vArtLocal.z > 0.499) {
    int artCol = clamp(int(floor((vArtLocal.x + 0.5) * 8.0)), 0, 7);
    int artRow = 7 - clamp(int(floor(vArtLocal.y * 8.0)), 0, 7);
    artColour = texelFetch(artTable, ivec2(artCol, vArtGrid + artRow), 0).rgb;
  }
  diffuseColor.rgb *= artColour;
`;

/**
 * The material of one step's artworks: white, its colour, roughness and metalness taken per instance from the table (see the header). All such materials
 * share one shader program; each has its own table.
 */
export function artMaterial(name: string, surfaces: readonly ArtSurface[]): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ name, color: new Color(1, 1, 1), roughness: 0.6, metalness: 0 });
  const table = artTable(surfaces);
  material.onBeforeCompile = (shader) => {
    shader.uniforms['artTable'] = { value: table };
    shader.uniforms['artCount'] = { value: surfaces.length };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_COLOUR}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = vArtSurface.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = vArtSurface.y;');
  };
  material.customProgramCacheKey = () => 'met-collection-art-1';
  return material;
}

/** The plinths and vitrine bases: a painted, pale stone-grey finish. */
export const plinthMaterial = new MeshStandardMaterial({ name: 'collectionPlinth', color: new Color('#d3cfc6'), roughness: 0.85, metalness: 0 });

/** The gilt frames of the paintings. */
export const giltMaterial = new MeshStandardMaterial({ name: 'collectionGilt', color: new Color('#a8843f'), roughness: 0.35, metalness: 0.9 });

/** The vitrines' glass: clear, never casting shadows (transparent), solid to a walker. */
export const vitrineGlass = (() => {
  const material = new MeshStandardMaterial({ name: 'collectionVitrineGlass', color: new Color('#dfe8ea'), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false });
  material.userData['castShadow'] = false;
  return material;
})();

/** Roughness and metalness of an object by its medium (the first word that matches): metals shine, glazed ceramics gleam, paint and stone are matte. */
export function finishOf(medium: string, kind: string): { readonly roughness: number; readonly metalness: number } {
  const m = medium.toLowerCase();
  if (kind === 'frame') return { roughness: 0.78, metalness: 0 };
  if (/\b(gilt|gilded|gold|silver)\b/.test(m)) return { roughness: 0.32, metalness: 0.85 };
  if (/\b(bronze|brass|copper)\b/.test(m)) return { roughness: 0.4, metalness: 0.7 };
  if (/\b(steel|iron)\b/.test(m)) return { roughness: 0.3, metalness: 0.8 };
  if (/\b(porcelain|glaze|glazed|stoneware)\b/.test(m)) return { roughness: 0.22, metalness: 0 };
  if (/\b(marble|alabaster)\b/.test(m)) return { roughness: 0.42, metalness: 0 };
  if (/\b(terracotta|earthenware)\b/.test(m)) return { roughness: 0.82, metalness: 0 };
  if (/\bwood\b/.test(m)) return { roughness: 0.66, metalness: 0 };
  return { roughness: 0.72, metalness: 0 };
}
