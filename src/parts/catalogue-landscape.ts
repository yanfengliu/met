/**
 * Gallery exhibits for landscape, fittings and the Temple of Dendur's Egyptian elements, at real scale:
 * Fifth Avenue's London planes are 12 to 15 m; the 2014 Koch Plaza fountains are long granite basins about 30 × 9 m; the temple's gate is about 8 m tall.
 */
import * as THREE from 'three';

import { cavettoCorniceProfile, papyriformColumn, pylon } from '../model/lib/egyptian.js';
import { bench, lampPost, urn } from '../model/lib/fittings.js';
import { fountain, hedge, tree } from '../model/lib/landscape.js';
import { sweep } from '../model/lib/sweep.js';
import type { PartEntry, Piece, Role } from './entry.js';

/** Pieces for a role record, each role painted per `roles`. */
function pieces(record: object, roles: Readonly<Record<string, Role>>): Piece[] {
  return Object.entries(record as Record<string, unknown>).flatMap(([key, geometry]) => (geometry instanceof THREE.BufferGeometry ? [{ geometry, role: roles[key] ?? 'stone' }] : []));
}

const TREE = { trunk: 'bark', foliage: 'foliage' } as const;

export const landscapeEntries: PartEntry[] = [
  ...[0, 1, 2, 3].map((seed) => ({
    id: `landscape-tree-${String(seed)}`,
    label: `London plane, seed ${String(seed)}`,
    group: 'Landscape',
    build: () => pieces(tree({ height: 13, seed }), TREE),
  })),
  { id: 'landscape-tree-low', label: 'London plane, low detail', group: 'Landscape', build: () => pieces(tree({ height: 13, detail: 'low' }), TREE) },
  { id: 'landscape-hedge', label: 'Clipped hedge, 4 m', group: 'Landscape', build: () => [{ geometry: hedge({ length: 4, height: 1, width: 0.8 }), role: 'foliage' }] },
  {
    id: 'landscape-fountain',
    label: 'Plaza fountain basin with jets (30 × 9 m)',
    group: 'Landscape',
    build: () => pieces(fountain({}), { stone: 'granite', water: 'water', jets: 'jet' }),
    closeups: { coping: { min: [-15.2, 0, 3.5], max: [-11, 3, 4.7] } },
  },
  { id: 'fitting-urn', label: 'Stone urn with flowers', group: 'Fittings', build: () => pieces(urn({}), { urn: 'stone', flowers: 'flowers' }) },
  { id: 'fitting-lamp-post', label: 'Lamp post, single lantern', group: 'Fittings', build: () => pieces(lampPost({}), { post: 'metal', lamp: 'lamp' }) },
  { id: 'fitting-lamp-post-2', label: 'Lamp post, two arms', group: 'Fittings', build: () => pieces(lampPost({ arms: 2 }), { post: 'metal', lamp: 'lamp' }) },
  { id: 'fitting-bench', label: 'Park bench, 2 m', group: 'Fittings', build: () => pieces(bench({}), { frame: 'metal', seat: 'wood' }) },
  { id: 'egypt-pylon', label: 'Temple of Dendur gate: battered pylon with doorway', group: 'Egyptian', build: () => [{ geometry: pylon({ width: 5.2, height: 8, depth: 2, door: { width: 1.6, height: 4.5 } }), role: 'stone' }] },
  {
    id: 'egypt-cavetto-cornice',
    label: 'Cavetto cornice with torus, swept round a corner',
    group: 'Egyptian',
    build: () => [
      {
        geometry: sweep(cavettoCorniceProfile({ height: 0.9, projection: 0.65 }), [
          [-2.5, 0, -2],
          [-2.5, 0, 0],
          [2.5, 0, 0],
        ]),
        role: 'stone',
      },
    ],
  },
  { id: 'egypt-papyrus-bud', label: 'Papyriform column, closed bud', group: 'Egyptian', build: () => [{ geometry: papyriformColumn({ height: 6, diameter: 0.9 }), role: 'stone' }] },
  { id: 'egypt-papyrus-bell', label: 'Papyriform column, open bell', group: 'Egyptian', build: () => [{ geometry: papyriformColumn({ height: 6, diameter: 0.9, capital: 'bell' }), role: 'stone' }] },
];
