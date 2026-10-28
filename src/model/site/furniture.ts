/**
 * Plaza furniture of 2014 (exterior.md [P9], [P10]), built locally from boxes because the library's bench and lamp are the Central Park cast-iron kinds:
 * backless granite benches (OSM bench nodes: backrest=no), the red angular cantilevered parasols over them (Spatial Affairs Bureau; the 2018 orthophoto
 * shows them as red trapezoids 4.5 m wide and 6 m deep), café tables and chairs for the groves (30 and 120, [P7]), and slim light poles (L'Observatoire).
 * Origins at the base centre, +Z toward Fifth Avenue; sizes are estimates (E). Every piece is a closed solid but the pole's lens, a sheet (../lib/sheet.ts).
 */
import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { MeshBuilder, sheet } from '../lib/index.js';

function built(make: (b: MeshBuilder) => void): BufferGeometry {
  const b = new MeshBuilder();
  make(b);
  return b.build();
}

/** A granite bench 3 m long and 0.6 deep with a 0.45 m seat on two plinths. */
export const BENCH: BufferGeometry = built((b) => {
  b.box([-1.5, 0.33, -0.3], [1.5, 0.45, 0.3]);
  b.box([-1.25, 0, -0.24], [-0.95, 0.33, 0.24]);
  b.box([0.95, 0, -0.24], [1.25, 0.33, 0.24]);
});

/** The parasol's steel mast and arm: a post at the back (−Z) and an arm along the canopy's underside. */
export const PARASOL_MAST: BufferGeometry = built((b) => {
  b.box([-0.08, 0, -2.95], [0.08, 3.3, -2.79]);
  const from = b.vertexCount;
  b.box([-0.05, -0.05, 0], [0.05, 0.05, 5.6]);
  // The arm rises from the mast top toward the front edge, under the canopy.
  b.transform(from, new Matrix4().makeRotationX(-Math.atan2(0.5, 5.6)).setPosition(0, 3.25, -2.87));
});

/** The canopy: a thin trapezoid, 3.6 m wide at the back and 4.6 m at the front over 5.8 m, tipped up 5° toward the street. */
export const PARASOL_CANOPY: BufferGeometry = built((b) => {
  const back = -2.9;
  const front = 2.9;
  const lift = (z: number): number => 3.3 + ((z - back) / (front - back)) * 0.5;
  const top = [new Vector3(-1.8, lift(back) + 0.06, back), new Vector3(-2.3, lift(front) + 0.06, front), new Vector3(2.3, lift(front) + 0.06, front), new Vector3(1.8, lift(back) + 0.06, back)];
  const bottom = top.map((p) => p.clone().setY(p.y - 0.06));
  b.polygon(top);
  b.polygon([...bottom].reverse());
  for (let k = 0; k < 4; k += 1) {
    const a = top[k] ?? new Vector3();
    const c = top[(k + 1) % 4] ?? a;
    const d = bottom[(k + 1) % 4] ?? a;
    const e = bottom[k] ?? a;
    b.polygon([e, d, c, a]);
  }
});

/** A café table: a round top 0.7 m across at 0.74 m on a pedestal. */
export const TABLE: BufferGeometry = built((b) => {
  const top: Vector3[] = [];
  for (let k = 0; k < 10; k += 1) top.push(new Vector3(0.35 * Math.cos((2 * Math.PI * k) / 10), 0.74, -0.35 * Math.sin((2 * Math.PI * k) / 10)));
  b.polygon(top);
  b.grid([top.map((p) => p.clone().setY(0.71)), top], { wrapU: true });
  b.polygon(top.map((p) => p.clone().setY(0.71)).reverse());
  b.box([-0.03, 0.03, -0.03], [0.03, 0.71, 0.03]);
  b.box([-0.25, 0, -0.25], [0.25, 0.03, 0.25]);
});

/** A café chair facing +Z: seat at 0.45 m, back to 0.85 m, four legs. */
export const CHAIR: BufferGeometry = built((b) => {
  b.box([-0.21, 0.42, -0.2], [0.21, 0.45, 0.2]);
  b.box([-0.21, 0.45, -0.22], [0.21, 0.85, -0.19]);
  for (const x of [-0.19, 0.17]) for (const z of [-0.18, 0.16]) b.box([x, 0, z], [x + 0.025, 0.42, z + 0.025]);
});

/** A slim light pole 6 m tall with a flat head (the metal), and the head's lens (the light). */
export const POLE: BufferGeometry = built((b) => {
  b.box([-0.07, 0, -0.07], [0.07, 6.0, 0.07]);
  b.box([-0.12, 6.0, -0.35], [0.12, 6.12, 0.35]);
});
export const POLE_LENS: BufferGeometry = sheet(
  built((b) => {
    b.polygon([new Vector3(-0.1, 5.995, -0.32), new Vector3(0.1, 5.995, -0.32), new Vector3(0.1, 5.995, 0.32), new Vector3(-0.1, 5.995, 0.32)]);
  }),
);
