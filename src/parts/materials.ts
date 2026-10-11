/**
 * Gallery materials, one per role (entry.ts). These belong to the gallery only; the model's shared palette is src/model/palette.ts.
 * Stone is a warm grey limestone like the Hunt facade's Indiana limestone; glass is a tinted, slightly reflective pane drawn from both sides.
 */
import * as THREE from 'three';

import type { Role } from './entry.js';

function standard(color: number, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

const materials: Record<Role, THREE.Material> = {
  stone: standard(0xcfc6b4, 0.82),
  stoneDark: standard(0xa89f90, 0.85),
  granite: standard(0x8d8a86, 0.7),
  plaster: standard(0xefe9dc, 0.9),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc3cf, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
  frame: standard(0x3a3f44, 0.45, 0.6),
  metal: standard(0x2f3133, 0.5, 0.7),
  bronze: standard(0x5a4630, 0.45, 0.8),
  copper: standard(0x6f9e88, 0.6, 0.3),
  water: new THREE.MeshPhysicalMaterial({ color: 0x3f6f86, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.82 }),
  jet: new THREE.MeshPhysicalMaterial({ color: 0xe6f2f7, roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }),
  foliage: standard(0x4f6b35, 0.9),
  bark: standard(0x6a5a4a, 0.95),
  flowers: standard(0xc0475a, 0.8),
  wood: standard(0x8a6038, 0.7),
  lamp: standard(0xfff2cc, 0.3, 0, { emissive: 0xffe6a0, emissiveIntensity: 0.6 }),
};

export function materialFor(role: Role): THREE.Material {
  return materials[role];
}
