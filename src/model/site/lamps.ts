/**
 * Chapter `site`: the park's cast-iron lamp posts along its paths and East Drive (the parts library's lamp post, a single acorn globe on a 4 m post),
 * and its benches (the library's park bench, cast-iron frames and wooden slats) where OpenStreetMap has bench nodes in the park ([S1]; Peel 2024 shows
 * them along Wallach Walk). Lamp spacing and offsets are estimates (E): about every 30 m beside the footpaths and 36 m beside the drive, on alternate sides.
 */
import { Matrix4 } from 'three';

import type { StepDef } from '../../build/types.js';
import { SITE_MAX_X, SITE_MIN_X, SITE_MIN_Z } from '../frame.js';
import { bench, lampPost } from '../lib/index.js';
import { footprintClearance } from './footprint.js';
import type { Point } from './footprint.js';
import { parkY, zoneAt } from './ground.js';
import { siteMaterials } from './materials.js';
import { EAST_DRIVE, FOOTPATHS } from './paths.js';

const LAMP = lampPost({ height: 4, detail: 'low' });
const BENCH = bench({ length: 2, detail: 'low' });

/** OSM bench nodes in the park within the site (world frame, 1 cm). */
const OSM_BENCHES: readonly Point[] = [
  [-198.57, -84.58], [-187.48, -86.38], [-132.72, -178.2], [-132.55, -185.33], [-120.96, -188.14], [-111.64, -244.34], [-49.93, -223.34], [-48.37, -232.38],
  [-73.28, -226.85], [-67.54, -219.39], [-57.35, -216.88], [-70.92, -236.07], [-56.51, -241.55], [-51.3, -238.16], [-11.45, -256.54],
];

/** The nearest point of any path to p, so a bench can face it. */
function nearestOnPaths(p: Point): Point {
  let best: Point = p;
  let bestD = Number.POSITIVE_INFINITY;
  for (const line of [EAST_DRIVE, ...FOOTPATHS]) {
    for (let k = 1; k < line.length; k += 1) {
      const a = line[k - 1] ?? p;
      const b = line[k] ?? a;
      const ex = b[0] - a[0];
      const ez = b[1] - a[1];
      const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez || 1)));
      const q: Point = [a[0] + t * ex, a[1] + t * ez];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
}

/** Points every `spacing` metres along a polyline, `offset` metres to alternate sides. */
function along(line: readonly Point[], spacing: number, offset: number): Point[] {
  const out: Point[] = [];
  let next = spacing / 2;
  let travelled = 0;
  let side = 1;
  for (let k = 1; k < line.length; k += 1) {
    const a = line[k - 1] ?? [0, 0];
    const b = line[k] ?? a;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 1e-9) continue;
    const ux = (b[0] - a[0]) / length;
    const uz = (b[1] - a[1]) / length;
    while (next <= travelled + length) {
      const s = next - travelled;
      out.push([a[0] + ux * s - uz * offset * side, a[1] + uz * s + ux * offset * side]);
      side = -side;
      next += spacing;
    }
    travelled += length;
  }
  return out;
}

const fits = ([x, z]: Point): boolean => x > SITE_MIN_X + 1 && x < SITE_MAX_X - 1 && z > SITE_MIN_Z + 1 && zoneAt(x, z) === 'park' && footprintClearance(x, z) > 3;

/** The lamp posts' positions. */
export const PARK_LAMPS: readonly Point[] = [...FOOTPATHS.flatMap((line) => along(line, 30, 2.7)), ...along(EAST_DRIVE, 36, 5.8)].filter(fits);

export const parkLampsStep: StepDef = {
  id: 'site-park-lamps',
  chapter: 'site',
  title: 'Set the park’s lamps and benches',
  detail: 'Cast-iron lamp posts with acorn globes line the paths and East Drive, and slatted benches face the walks.',
  motion: { kind: 'grow' },
  stagger: 'order',
  build(kit) {
    PARK_LAMPS.forEach(([x, z], k) => {
      const m = new Matrix4().makeTranslation(x, parkY(x, z) - 0.05, z);
      kit.add(LAMP.post, siteMaterials.metalDark, m, k);
      kit.add(LAMP.lamp, siteMaterials.lampGlobe, m, k);
    });
    OSM_BENCHES.filter(fits).forEach(([x, z], k) => {
      // The sitter (+Z) faces the nearest path.
      const [qx, qz] = nearestOnPaths([x, z]);
      const m = new Matrix4().makeRotationY(Math.atan2(qx - x, qz - z)).setPosition(x, parkY(x, z) - 0.03, z);
      kit.add(BENCH.frame, siteMaterials.metalDark, m, PARK_LAMPS.length + k);
      kit.add(BENCH.seat, siteMaterials.wood, m, PARK_LAMPS.length + k);
    });
  },
};
