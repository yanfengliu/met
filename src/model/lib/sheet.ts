/**
 * Sheets (docs/design/spec.md, Build-step API: Solids and sheets): a geometry that is a surface with no inside, such as a glass pane, paving laid on the
 * ground, the terrain or a surface standing upright, which its builder declares with `sheet`. Every other geometry the walk or the section cut reads is
 * closed along vertical lines, crossed an even number of times by each (src/model/closure.test.ts). The walk reads no inside in a sheet, whatever its
 * crossings (src/walk/collision.ts `crossings`, src/walk/walker.ts `settle`), and the cut's cap pass leaves it out (src/viewer/section-cut.ts
 * `capsMesh`), so no cut shows the back of a sheet. The mark rides on the geometry object (`userData.sheet`), so a cached part declared once is a sheet
 * wherever it is placed.
 */
import type { BufferGeometry } from 'three';

/** Declares `geometry` a sheet and returns it. */
export function sheet<T extends BufferGeometry>(geometry: T): T {
  geometry.userData['sheet'] = true;
  return geometry;
}

/** Whether a builder declared `geometry` a sheet (`sheet`). */
export function isSheet(geometry: BufferGeometry): boolean {
  return geometry.userData['sheet'] === true;
}
