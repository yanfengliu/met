/**
 * Gallery exhibits for mouldings, walls, arches, windows, doors, surrounds, domes and vaults, at the Met's scale:
 * the Hunt facade's entablature is about 3 m deep over 13 m columns, its three entrance arches about 5 m wide; the Great Hall's saucer domes span about 14 m.
 */
import * as THREE from 'three';

import { archivolt, keystone, spandrel, voussoirs } from '../model/lib/arch.js';
import type { V3 } from '../model/lib/builder.js';
import { corniceRun, entablature, moulding, type CorniceRun, type ProfileName } from '../model/lib/cornice.js';
import { barrelVault, dome, drum, pendentives } from '../model/lib/dome.js';
import { surround } from '../model/lib/surround.js';
import { wall } from '../model/lib/wall.js';
import { doorUnit, windowUnit } from '../model/lib/window.js';
import type { PartEntry, Piece, Role } from './entry.js';

const stone = (geometry: THREE.BufferGeometry, matrices?: readonly THREE.Matrix4[]): Piece => (matrices === undefined ? { geometry, role: 'stone' } : { geometry, role: 'stone', matrices });
const at = (x: number, y: number, z: number): THREE.Matrix4 => new THREE.Matrix4().makeTranslation(x, y, z);

/** A run's pieces, raised `lift` metres so its soffit and modillions can be seen from below. */
function runPieces(run: CorniceRun, lift = 0): Piece[] {
  const up = at(0, lift, 0);
  const raise = (matrices: readonly THREE.Matrix4[]): THREE.Matrix4[] => matrices.map((m) => up.clone().multiply(m));
  const pieces: Piece[] = [stone(run.moulding, [up])];
  if (run.modillion !== undefined && run.modillions.length > 0) pieces.push(stone(run.modillion, raise(run.modillions)));
  if (run.dentil !== undefined && run.dentils.length > 0) pieces.push(stone(run.dentil, raise(run.dentils)));
  return pieces;
}

/** An outside corner then a break forward (ressaut), as over the Hunt facade's coupled columns. */
const RESSAUT: readonly V3[] = [
  [-6, 0, -3],
  [-6, 0, 0],
  [-1.5, 0, 0],
  [-1.5, 0, 1.2],
  [1.5, 0, 1.2],
  [1.5, 0, 0],
  [6, 0, 0],
];

const profileEntries: PartEntry[] = (['architrave', 'frieze', 'cornice-plain', 'string-course', 'base', 'plinth', 'parapet-cap'] as const satisfies readonly ProfileName[]).map((profile) => ({
  id: `moulding-${profile}`,
  label: `${profile} profile, swept round a corner`,
  group: 'Mouldings',
  build: () => [
    stone(
      moulding({
        profile,
        path: [
          [-2, 0, -1.5],
          [-2, 0, 0],
          [2, 0, 0],
        ],
        height: profile === 'parapet-cap' ? 0.25 : 0.6,
      }),
    ),
  ],
}));

/** Pieces for a multi-material part record, each role painted per `roles`. */
const parts = (record: object, roles: Readonly<Record<string, Role>>, matrix?: THREE.Matrix4): Piece[] =>
  Object.entries(record as Record<string, unknown>).flatMap(([key, geometry]) =>
    geometry instanceof THREE.BufferGeometry ? [matrix === undefined ? { geometry, role: roles[key] ?? 'stone' } : { geometry, role: roles[key] ?? 'stone', matrices: [matrix] }] : [],
  );

const WINDOW_ROLES = { frame: 'frame', bars: 'frame', glass: 'glass', leaf: 'bronze' } as const;

export const architectureEntries: PartEntry[] = [
  {
    id: 'cornice-run',
    label: 'Modillion and dentil cornice with a ressaut',
    group: 'Mouldings',
    build: () => runPieces(corniceRun({ path: RESSAUT, height: 1.2 }), 4),
    closeups: { corner: { min: [-7, 3.7, -1], max: [-3, 5.4, 1.6] } },
  },
  {
    id: 'entablature-run',
    label: 'Corinthian entablature (architrave, frieze, cornice), 3.2 m',
    group: 'Mouldings',
    build: () => runPieces(entablature({ path: RESSAUT, height: 3.2 }), 4),
    closeups: { ressaut: { min: [-2.5, 4, -0.5], max: [2.5, 7.4, 3] } },
  },
  {
    id: 'cornice-loop',
    label: 'Cornice round a closed block (four convex corners)',
    group: 'Mouldings',
    build: () => [
      ...runPieces(
        corniceRun({
          path: [
            [-3, 0, 2],
            [3, 0, 2],
            [3, 0, -2],
            [-3, 0, -2],
          ],
          closed: true,
          height: 0.8,
        }),
      ),
    ],
  },
  ...profileEntries,
  {
    id: 'wall-openings',
    label: 'Wall with arched, rectangular and segmental openings and a blind niche',
    group: 'Walls',
    build: () => [
      stone(
        wall({
          width: 14,
          height: 9,
          thickness: 0.9,
          openings: [
            { shape: 'arch', x: -4.5, y: 0, width: 3, height: 6 },
            { shape: 'rect', x: -0.5, y: 1.2, width: 1.6, height: 3 },
            { shape: 'segmental', x: 2.6, y: 1.2, width: 1.8, height: 3.2 },
            { shape: 'arch', x: 5.4, y: 1.5, width: 1.4, height: 3, depth: 0.35 },
          ],
        }),
      ),
    ],
  },
  {
    id: 'wall-rusticated',
    label: 'Banded rusticated wall with an arched doorway and windows',
    group: 'Walls',
    build: () => [
      stone(
        wall({
          width: 12,
          height: 7.2,
          thickness: 0.9,
          rustication: { course: 0.6, joint: 0.06, depth: 0.05 },
          openings: [
            { shape: 'arch', x: 0, y: 0, width: 3, height: 5.2 },
            { shape: 'rect', x: -4, y: 1.5, width: 1.4, height: 2.6 },
            { shape: 'rect', x: 4, y: 1.5, width: 1.4, height: 2.6 },
          ],
        }),
      ),
    ],
  },
  {
    id: 'arch-bay',
    label: 'Arch bay: archivolt, keystone and spandrel panels over a 5 m arch',
    group: 'Arches',
    build: () => {
      const span = 5;
      const rise = 2.5;
      const band = 0.6;
      const height = 10.5;
      const pieces = [
        stone(wall({ width: 9, height, thickness: 0.8, openings: [{ shape: 'arch', x: 0, y: 0, width: span, height: 6.5 + rise }] })),
        stone(archivolt({ span, rise, band }), [at(0, 6.5, 0)]),
        stone(keystone({ width: 0.6, height: 1.2, projection: 0.35 }), [at(0, 6.5 + rise - 0.05, 0)]),
        stone(spandrel({ span, rise, band, width: 8.4, height: 3.7 }), [at(0, 6.5, 0)]),
      ];
      return pieces;
    },
    closeups: { head: { min: [-3.5, 6, 0], max: [3.5, 10.3, 0.6] } },
  },
  { id: 'arch-archivolt', label: 'Archivolt, round', group: 'Arches', build: () => [stone(archivolt({ span: 5 }))] },
  { id: 'arch-archivolt-segmental', label: 'Archivolt, segmental', group: 'Arches', build: () => [stone(archivolt({ span: 5, rise: 1.2 }))] },
  { id: 'arch-voussoirs', label: 'Voussoir ring with keystone', group: 'Arches', build: () => [stone(voussoirs({ span: 4, depth: 0.7, count: 15 }))] },
  { id: 'arch-keystone', label: 'Keystone', group: 'Arches', build: () => [stone(keystone({ width: 0.6 }))] },
  { id: 'arch-spandrel', label: 'Spandrel panels', group: 'Arches', build: () => [stone(spandrel({ span: 4 }))] },
  {
    id: 'window-arched',
    label: 'Arched window in its opening (frame, bars, glass)',
    group: 'Windows',
    build: () => {
      const w = 3.2;
      const h = 6.2;
      return [stone(wall({ width: 5, height: 8, thickness: 0.8, openings: [{ shape: 'arch', x: 0, y: 1, width: w, height: h }] })), ...parts(windowUnit({ width: w, height: h, shape: 'arch', cols: 3, rows: 3, frame: 0.1, depth: 0.14 }), WINDOW_ROLES, at(0, 1, -0.2))];
    },
    closeups: { head: { min: [-1.8, 4.5, -0.4], max: [1.8, 7.4, 0.2] } },
  },
  {
    id: 'window-rect',
    label: 'Rectangular sash window',
    group: 'Windows',
    build: () => parts(windowUnit({ width: 1.4, height: 2.6, cols: 2, rows: 3 }), WINDOW_ROLES),
  },
  {
    id: 'window-segmental',
    label: 'Segmental-head window',
    group: 'Windows',
    build: () => parts(windowUnit({ width: 1.6, height: 2.8, shape: 'segmental', cols: 2, rows: 3 }), WINDOW_ROLES),
  },
  {
    id: 'door-arched',
    label: 'Arched double door with fanlight',
    group: 'Windows',
    build: () => parts(doorUnit({ width: 2.6, height: 5, shape: 'arch' }), WINDOW_ROLES),
  },
  {
    id: 'door-rect',
    label: 'Panelled door with transom light',
    group: 'Windows',
    build: () => parts(doorUnit({ width: 1.8, height: 3.2, leaves: 2 }), WINDOW_ROLES),
  },
  {
    id: 'surround-triangular',
    label: 'Window surround: architrave, sill, triangular pediment',
    group: 'Windows',
    build: () => [stone(surround({ width: 1.6, height: 3, head: 'triangular' })), ...parts(windowUnit({ width: 1.6, height: 3, cols: 2, rows: 3 }), WINDOW_ROLES, at(0, 0, -0.06))],
  },
  {
    id: 'surround-segmental',
    label: 'Window surround: segmental pediment',
    group: 'Windows',
    build: () => [stone(surround({ width: 1.6, height: 3, head: 'segmental' })), ...parts(windowUnit({ width: 1.6, height: 3, cols: 2, rows: 3 }), WINDOW_ROLES, at(0, 0, -0.06))],
  },
  {
    id: 'surround-arched',
    label: 'Arched surround with a cornice head',
    group: 'Windows',
    build: () => [stone(surround({ width: 1.6, height: 3.2, shape: 'arch', head: 'cornice' }))],
  },
  { id: 'dome-hemisphere', label: 'Hemispherical dome on a drum', group: 'Domes and vaults', build: () => [stone(drum({ radius: 6, height: 3 })), stone(dome({ radius: 6, ribs: { count: 16 } }), [at(0, 3, 0)])] },
  {
    id: 'dome-saucer-bay',
    label: 'Saucer dome with oculus on pendentives (Great Hall bay, 14 m)',
    group: 'Domes and vaults',
    build: () => [stone(pendentives({ span: 14 })), stone(dome({ radius: 7, rise: 2.4, oculus: 1.4, thickness: 0.4 }), [at(0, 7, 0)])],
    closeups: { oculus: { min: [-4, 7, -4], max: [4, 10, 4] } },
  },
  { id: 'dome-saucer', label: 'Saucer dome with oculus and inside ribs', group: 'Domes and vaults', build: () => [stone(dome({ radius: 7, rise: 2.4, oculus: 1.4, ribs: { count: 12 }, ribsInside: true }))] },
  { id: 'vault-barrel', label: 'Barrel vault', group: 'Domes and vaults', build: () => [stone(barrelVault({ span: 8, length: 12 }))] },
  { id: 'vault-coffered', label: 'Coffered barrel vault', group: 'Domes and vaults', build: () => [stone(barrelVault({ span: 8, length: 12, coffers: { across: 9, along: 8, depth: 0.25, rib: 0.22 } }))] },
];
