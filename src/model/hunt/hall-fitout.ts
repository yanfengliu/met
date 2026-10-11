/**
 * The Great Hall's fit-out: the flower arrangements in the four pedimented pier niches, pendant lanterns in the end bays (P2) and two warm lights,
 * and, from Kevin Roche's 1970 renovation, the round information desk with the tall arrangement in its central urn (P1).
 * Evidence: P1 (Daderot 2020) for the desk (about 6 m across, on the axis in the nave) and the niche flowers; P2 (TheCatalyst31 2025) for the lanterns.
 */
import * as THREE from 'three';

import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { lathe, MeshBuilder, ProfilePen, urn } from '../lib/index.js';
import { MAIN, NAVE_EAST_Z, NAVE_MID_Z, NAVE_WEST_Z, SECOND, SLAB } from './dims.js';
import { HALL_NICHE } from './hall.js';
import { hunt } from './materials.js';
import { at, scaled } from './shapes.js';

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

/** A rounded mass of flowers: a lumpy ellipsoid (deterministic ripple), origin at its bottom centre, `width` across and `height` tall. */
function bouquet(width: number, height: number): THREE.BufferGeometry {
  const b = new MeshBuilder();
  const rows: THREE.Vector3[][] = [];
  const nv = 9;
  const nu = 18;
  for (let j = 0; j <= nv; j++) {
    const phi = -Math.PI / 2 + (j / nv) * Math.PI;
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= nu; i++) {
      const theta = (i / nu) * Math.PI * 2;
      const ripple = 1 + 0.09 * Math.sin(5 * theta + 3 * phi) * Math.cos(3 * theta - 2 * phi);
      const r = (width / 2) * Math.cos(phi) * ripple;
      row.push(new THREE.Vector3(r * Math.cos(theta), height / 2 + (height / 2) * Math.sin(phi) * ripple, -r * Math.sin(theta)));
    }
    rows.push(row);
  }
  b.grid(rows);
  return b.build();
}

const nicheFlowers = lazy(() => bouquet(1.1, 1.5));
const deskFlowers = lazy(() => bouquet(1.3, 2.7));

/** The desk: a ring counter round a raised round core (P1), outer radius 3.0 m. */
const deskBody = lazy(() => {
  const pen = new ProfilePen(2.25, 0).to(3.0, 0).to(3.0, 1.0).to(2.25, 1.0).to(2.25, 0);
  const ring = lathe(pen.close(), { segments: 40 });
  const b = new MeshBuilder();
  b.append(ring);
  b.append(lathe(new ProfilePen(0, 0).to(0.95, 0).to(0.95, 1.55).to(0.8, 1.7).to(0, 1.7).open(), { segments: 24 }));
  return b.build();
});
const deskTop = lazy(() => lathe(new ProfilePen(2.15, 1.0).to(3.08, 1.0).to(3.08, 1.08).to(2.15, 1.08).to(2.15, 1.0).close(), { segments: 40 }));

/** A pendant lantern: an octagonal bronze cage round a lit globe, hung on a rod; origin at its top (the ceiling). */
const lanternFrame = lazy(() => {
  const b = new MeshBuilder();
  b.box([-0.03, -1.6, -0.03], [0.03, 0, 0.03]);
  const cage = new ProfilePen(0, -2.72).to(0.18, -2.7).to(0.4, -2.55).to(0.46, -2.0).to(0.34, -1.68).to(0, -1.6).open();
  b.append(lathe(cage, { segments: 8 }));
  return b.build();
});
const lanternGlobe = lazy(() => lathe(new ProfilePen(0, -2.6).to(0.36, -2.4).to(0.36, -1.9).to(0, -1.72).open(), { segments: 12 }));

export const fitoutSteps: readonly StepDef[] = [
  {
    id: 'great-hall-fitout',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Light and furnish the Great Hall',
    detail: 'Flowers fill the four pedimented niches of the centre piers, bronze lanterns hang in the end bays under the balcony, and warm light fills the hall.',
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-balcony-south' },
    build(kit) {
      const vase = urn({ height: 1.0, flowers: false, detail: 'low' });
      for (const [z, out] of [
        [NAVE_EAST_Z, 1],
        [NAVE_WEST_Z, -1],
      ] as const) {
        for (const x of [-8.64, 8.64]) {
          const zz = z + out * (HALL_NICHE.depth / 2);
          kit.add(vase.urn, palette.limestone, at(x, MAIN + HALL_NICHE.sill, zz), 0);
          kit.add(nicheFlowers(), hunt.flowers, at(x, MAIN + HALL_NICHE.sill + 0.85, zz), 0);
        }
      }
      for (const s of [-1, 1]) {
        for (const z of [NAVE_MID_Z - 2.0, NAVE_MID_Z + 2.0]) {
          const m = at(s * 28.2, SECOND - SLAB, z);
          kit.add(lanternFrame(), palette.bronze, m, 1);
          kit.add(lanternGlobe(), hunt.lanternGlow, m, 1);
        }
      }
      for (const x of [-13, 13]) {
        const light = new THREE.PointLight(new THREE.Color('#ffe2b8'), 650, 70, 2);
        light.position.set(x, 13.5, NAVE_MID_Z);
        kit.light(light);
      }
    },
  },
];

export const deskSteps: readonly StepDef[] = [
  {
    id: 'great-hall-desk',
    chapter: 'hunt-1902',
    year: '1970',
    title: 'Set the round information desk',
    detail: "Kevin Roche's 1970 renovation put a round information desk on the axis of the nave, a tall flower arrangement rising from the urn at its centre.",
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-balcony-south' },
    build(kit) {
      // P1 shows the desk on the camera's line down the middle of the nave.
      const z = NAVE_MID_Z;
      kit.add(deskBody(), hunt.hallStone, at(0, MAIN, z), 0);
      kit.add(deskTop(), palette.wood, at(0, MAIN, z), 0);
      const vase = urn({ height: 1.3, flowers: false, detail: 'medium' });
      kit.add(vase.urn, palette.limestone, at(0, MAIN + 1.7, z), 1);
      kit.add(deskFlowers(), hunt.flowers, scaled(0, MAIN + 1.7 + 1.15, z, 1, 1, 1), 2);
    },
  },
];
