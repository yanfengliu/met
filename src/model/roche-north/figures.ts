/**
 * Stand-ins for the court's sculpture (no artworks are modelled beyond landmark objects; AGENTS.md non-goals): turned figures with arms, one merged geometry each.
 * - `STATUE`: a draped standing figure 1 m tall, arms at its sides, for the marbles round the Engelhard Court and the bronze fountain figures.
 * - `DIANA`: Saint-Gaudens' Diana (1892–93), 1 m tall: a slender figure on one foot on a ball, drawing a bow held out to her left (local −X).
 * Origin at the base centre, front +Z. Scale through the piece's matrix (Diana stands 101¾ in, 2.58 m: Met API object 11998).
 */
import type { BufferGeometry} from 'three';
import { CylinderGeometry, Matrix4, SphereGeometry, TorusGeometry, Vector3 } from 'three';

import { MeshBuilder, lathe } from '../lib/index.js';

/** Appends a tapering limb from `a` to `b` (radii ra, rb) to the builder. */
function limb(builder: MeshBuilder, a: readonly [number, number, number], b: readonly [number, number, number], ra: number, rb: number): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  const geometry = new CylinderGeometry(rb, ra, length, 6, 1, false).translate(0, length / 2, 0);
  const up = [0, 1, 0] as const;
  const axis = [dx / length, dy / length, dz / length] as const;
  // Rotate +Y onto the limb's axis.
  const cross = [up[1] * axis[2] - up[2] * axis[1], up[2] * axis[0] - up[0] * axis[2], up[0] * axis[1] - up[1] * axis[0]] as const;
  const sin = Math.hypot(...cross);
  const cos = axis[1];
  const m = new Matrix4();
  if (sin > 1e-9) m.makeRotationAxis(new Vector3(cross[0] / sin, cross[1] / sin, cross[2] / sin), Math.atan2(sin, cos));
  else if (cos < 0) m.makeRotationX(Math.PI);
  builder.append(geometry, new Matrix4().makeTranslation(a[0], a[1], a[2]).multiply(m));
}

export const STATUE: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.append(
    lathe(
      {
        closed: false,
        points: [
          [0, 0],
          [0.14, 0],
          [0.14, 0.04],
          [0.12, 0.06],
          [0.115, 0.3],
          [0.1, 0.48],
          [0.085, 0.58],
          [0.11, 0.72],
          [0.125, 0.77],
          [0.05, 0.81],
          [0.055, 0.84],
          [0.068, 0.9],
          [0.058, 0.96],
          [0, 0.99],
        ],
      },
      { segments: 10 },
    ),
  );
  for (const s of [-1, 1]) limb(b, [s * 0.13, 0.76, 0], [s * 0.15, 0.5, 0.03], 0.035, 0.028);
  return b.build();
})();

export const DIANA: BufferGeometry = (() => {
  const b = new MeshBuilder();
  b.append(new SphereGeometry(0.05, 10, 6).translate(0, 0.05, 0));
  b.append(
    lathe(
      {
        closed: false,
        points: [
          [0, 0.09],
          [0.025, 0.09],
          [0.035, 0.14],
          [0.045, 0.3],
          [0.06, 0.45],
          [0.075, 0.52],
          [0.058, 0.6],
          [0.07, 0.7],
          [0.075, 0.75],
          [0.026, 0.8],
          [0.04, 0.83],
          [0.045, 0.88],
          [0.036, 0.94],
          [0, 0.96],
        ],
      },
      { segments: 10 },
    ),
  );
  // The raised back leg, the bow arm held out to her left and the drawing arm bent back at the shoulder.
  limb(b, [0.03, 0.47, 0], [0.09, 0.3, -0.16], 0.04, 0.025);
  limb(b, [-0.07, 0.74, 0], [-0.42, 0.78, 0], 0.025, 0.018);
  limb(b, [0.07, 0.74, 0], [-0.12, 0.8, 0.04], 0.025, 0.018);
  // The bow: an arc in the vertical plane of the arrow, its grip in her outstretched hand and its limbs curving back toward her.
  b.append(new TorusGeometry(0.3, 0.008, 4, 16, Math.PI * 0.8), new Matrix4().makeTranslation(-0.14, 0.78, 0).multiply(new Matrix4().makeRotationZ(Math.PI * 0.6)));
  return b.build();
})();
