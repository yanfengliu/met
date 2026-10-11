/**
 * Gallery exhibits for the classical orders. Sizes are the Met's: the Fifth Avenue facade's coupled Corinthian columns are about 1.3 m in diameter and 13 m tall on pedestals.
 */
import * as THREE from 'three';

import { atticBase, capital, column, columnParts, pedestal } from '../model/lib/column.js';
import { pilaster } from '../model/lib/pilaster.js';
import type { PartEntry, Piece } from './entry.js';

const D = 1.3;

function at(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z);
}

function stone(geometry: THREE.BufferGeometry, matrices?: readonly THREE.Matrix4[]): Piece {
  return matrices === undefined ? { geometry, role: 'stone' } : { geometry, role: 'stone', matrices };
}

const capitalBox = (diameter: number, height: number, capitalHeight: number): { min: [number, number, number]; max: [number, number, number] } => ({
  min: [-diameter, height - capitalHeight - 0.25 * diameter, -diameter],
  max: [diameter, height, diameter],
});

export const orderEntries: PartEntry[] = [
  {
    id: 'column-corinthian',
    label: 'Corinthian column, fluted (D 1.3 m)',
    group: 'Orders',
    build: () => [stone(column({ diameter: D }))],
    closeups: { capital: capitalBox(D, 10 * D, (7 / 6) * D), base: { min: [-D, 0, -D], max: [D, 1.2 * D, D] } },
  },
  {
    id: 'column-corinthian-plain',
    label: 'Corinthian column, plain shaft',
    group: 'Orders',
    build: () => [stone(column({ diameter: D, fluted: false }))],
  },
  {
    id: 'column-corinthian-coupled',
    label: 'Coupled Corinthian columns on a shared pedestal (Hunt facade)',
    group: 'Orders',
    build: () => {
      const ped = 2.4 * D;
      const parts = columnParts({ diameter: D });
      const placements = [at(-0.8 * D, ped, 0), at(0.8 * D, ped, 0)];
      return [stone(pedestal({ width: 3.2 * D, depth: 1.6 * D, height: ped })), ...[parts.base, parts.shaft, parts.capital].flatMap((g) => (g === undefined ? [] : [stone(g, placements)]))];
    },
    closeups: { capitals: { min: [-2 * D, 2.4 * D + 8.5 * D, -D], max: [2 * D, 2.4 * D + 10 * D, D] } },
  },
  {
    id: 'column-ionic',
    label: 'Ionic column',
    group: 'Orders',
    build: () => [stone(column({ order: 'ionic', diameter: D }))],
    closeups: { capital: capitalBox(D, 9 * D, 0.36 * D) },
  },
  {
    id: 'column-doric',
    label: 'Doric column (Roman, on an Attic base)',
    group: 'Orders',
    build: () => [stone(column({ order: 'doric', diameter: D }))],
    closeups: { capital: capitalBox(D, 8 * D, 0.5 * D) },
  },
  {
    id: 'column-on-pedestal',
    label: 'Corinthian column on a Vignola pedestal',
    group: 'Orders',
    build: () => [stone(column({ diameter: D, pedestal: true }))],
  },
  {
    id: 'capital-corinthian',
    label: 'Corinthian capital (high detail)',
    group: 'Orders',
    build: () => [stone(capital({ diameter: D, detail: 'high' }))],
  },
  {
    id: 'capital-corinthian-low',
    label: 'Corinthian capital (low detail)',
    group: 'Orders',
    build: () => [stone(capital({ diameter: D, detail: 'low' }))],
  },
  {
    id: 'base-attic',
    label: 'Attic base',
    group: 'Orders',
    build: () => [stone(atticBase({ diameter: D }))],
  },
  {
    id: 'pilaster-corinthian',
    label: 'Corinthian pilaster, fluted (W 1.2 m)',
    group: 'Orders',
    build: () => [stone(pilaster({ width: 1.2 }))],
    closeups: { capital: { min: [-1.2, 10.4, 0], max: [1.2, 12, 1] } },
  },
  {
    id: 'pilaster-ionic',
    label: 'Ionic pilaster',
    group: 'Orders',
    build: () => [stone(pilaster({ width: 1.2, order: 'ionic' }))],
  },
  {
    id: 'pilaster-doric',
    label: 'Doric pilaster, plain',
    group: 'Orders',
    build: () => [stone(pilaster({ width: 1.2, order: 'doric' }))],
  },
];
