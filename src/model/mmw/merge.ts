/**
 * Merged geometries: parts that always arrive together in one material (a window's frame and bars, a pilaster with its attic pier, an archivolt with its keystone,
 * a front's three swept mouldings) become one geometry, so each costs one instanced mesh instead of several (the area's budget is 160 meshes).
 * Cached by key: the same key always returns the same object, which keeps instancing intact. Parts that are all sheets (glass panes) make a sheet
 * (../lib/sheet.ts); every other merge is of closed solids.
 */
import type { BufferGeometry, Matrix4 } from 'three';

import { isSheet, MeshBuilder, sheet } from '../lib/index.js';

const store = new Map<string, BufferGeometry>();

/** One geometry from `parts` (each placed by its matrix, or as is), cached under `key`. */
export function merged(key: string, parts: readonly (readonly [BufferGeometry, Matrix4?])[]): BufferGeometry {
  const hit = store.get(key);
  if (hit !== undefined) return hit;
  const b = new MeshBuilder();
  for (const [geometry, matrix] of parts) b.append(geometry, matrix);
  const built = parts.length > 0 && parts.every(([geometry]) => isSheet(geometry)) ? sheet(b.build()) : b.build();
  store.set(key, built);
  return built;
}
