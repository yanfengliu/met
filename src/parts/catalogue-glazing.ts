/**
 * Gallery exhibits for glazing, stairs and balustrades, at the Met's scale: the Great Hall's front steps are about 60 m wide; the Roche-Dinkeloo wings carry long ridge and pyramid skylights;
 * the Sackler Wing's park wall leans back; balustrades run along the McKim, Mead & White roof lines.
 */
import * as THREE from 'three';

import { balustrade } from '../model/lib/balustrade.js';
import { curtainWall, hippedSkylight, laylight, pyramidSkylight, ridgeSkylight, type Glazing } from '../model/lib/glazing.js';
import { stairFlight, stairLanding } from '../model/lib/stair.js';
import type { PartEntry, Piece } from './entry.js';

const glazed = (part: Glazing): Piece[] => [
  { geometry: part.frame, role: 'frame' },
  { geometry: part.glass, role: 'glass' },
];
const at = (x: number, y: number, z: number): THREE.Matrix4 => new THREE.Matrix4().makeTranslation(x, y, z);

function runPieces(run: ReturnType<typeof balustrade>): Piece[] {
  return [
    { geometry: run.rail, role: 'stone' },
    { geometry: run.plinth, role: 'stone' },
    { geometry: run.posts, role: 'stone' },
    { geometry: run.baluster, role: 'stone', matrices: run.balusters },
  ];
}

export const glazingEntries: PartEntry[] = [
  { id: 'glazing-ridge-skylight', label: 'Ridge skylight, 6 × 18 m', group: 'Glazing', build: () => glazed(ridgeSkylight({ width: 6, length: 18, bays: 9 })) },
  { id: 'glazing-hipped-skylight', label: 'Hipped skylight, 6 × 14 m', group: 'Glazing', build: () => glazed(hippedSkylight({ width: 6, length: 14, bays: 6 })) },
  { id: 'glazing-pyramid-skylight', label: 'Glass pyramid, 10 m', group: 'Glazing', build: () => glazed(pyramidSkylight({ width: 10, rise: 4, bars: 3 })) },
  { id: 'glazing-laylight', label: 'Laylight (seen from below), 8 × 12 m', group: 'Glazing', build: () => glazed(laylight({ width: 8, length: 12, cols: 4, rows: 6 })) },
  { id: 'glazing-curtain-wall', label: 'Curtain wall, vertical', group: 'Glazing', build: () => glazed(curtainWall({ width: 16, height: 10, cols: 8, rows: 5 })) },
  { id: 'glazing-curtain-wall-sloped', label: 'Sloped curtain wall (Sackler Wing park wall), 18°', group: 'Glazing', build: () => glazed(curtainWall({ width: 16, height: 12, cols: 8, rows: 6, slope: 18 })) },
  {
    id: 'stair-monumental',
    label: 'Monumental steps: flight, landing, flight, with cheek walls',
    group: 'Stairs',
    build: () => {
      const width = 20;
      const lower = stairFlight({ width, steps: 10, cheeks: { width: 0.9, height: 0.9 } });
      const upper = stairFlight({ width, steps: 8, cheeks: { width: 0.9, height: 0.9 } });
      const rise = 10 * 0.15;
      const run = 10 * 0.4;
      const landing = 3;
      const pieces: Piece[] = [
        { geometry: lower.steps, role: 'stone' },
        { geometry: stairLanding({ width: width + 1.8, depth: landing, thickness: rise }), role: 'stone', matrices: [at(0, rise, -run)] },
        { geometry: upper.steps, role: 'stone', matrices: [at(0, rise, -run - landing)] },
      ];
      if (lower.cheeks !== undefined) pieces.push({ geometry: lower.cheeks, role: 'stoneDark' });
      if (upper.cheeks !== undefined) pieces.push({ geometry: upper.cheeks, role: 'stoneDark', matrices: [at(0, rise, -run - landing)] });
      return pieces;
    },
    closeups: { nosings: { min: [8, 0, -2], max: [11, 1.6, 0.5] } },
  },
  { id: 'stair-flight', label: 'Straight flight, 12 steps', group: 'Stairs', build: () => [{ geometry: stairFlight({ width: 6, steps: 12 }).steps, role: 'stone' }] },
  { id: 'balustrade-run', label: 'Balustrade run, 8 m', group: 'Balustrades', build: () => runPieces(balustrade({ length: 8 })), closeups: { balusters: { min: [-1.5, 0, -0.3], max: [1.5, 1.1, 0.3] } } },
  {
    id: 'balustrade-loop',
    label: 'Balustrade round a closed roof terrace',
    group: 'Balustrades',
    build: () =>
      runPieces(
        balustrade({
          path: [
            [-5, 0, 3.5],
            [5, 0, 3.5],
            [5, 0, -3.5],
            [-5, 0, -3.5],
          ],
          closed: true,
        }),
      ),
  },
];
