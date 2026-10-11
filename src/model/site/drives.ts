/**
 * Chapter `site`: the two drive cuts beside the building (history.md section 1, `site-transverse-cuts`): the north service drive along the north face
 * down to the loading dock, and the south garage drive's loop with its planted island, both cut down to −2.2 at Z −34.5 ([F11]).
 * The terrain already holds their faces (grid.ts); this step paves them, caps the retaining walls and fences the north drive (OSM fence 739699912).
 */
import type { Kit, StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { DRIVE_NORTH, DRIVE_SOUTH, parkY, surfaceY } from './ground.js';
import type { Rect, Zone } from './ground.js';
import { CELLS, GRID_XS, GRID_ZS } from './grid.js';
import { siteMaterials } from './materials.js';
import { UNIT_BLOCK, UNIT_TILE, beamMatrix, blockMatrix, surfaceMatrix } from './tiles.js';

const COPING_WIDTH = 0.5;
const COPING_HEIGHT = 0.18;
/** The fence on the north drive's wall: posts every 2.5 m, 1.4 m tall, with a top and a bottom rail (E). */
const FENCE_HEIGHT = 1.4;
const FENCE_POST = 0.06;

/** Points along one side of a drive, on the grid lines, with the park's level just outside and the drive's just inside. */
function edge(rect: Rect, zone: Zone, along: 'x' | 'z', at: number, outward: number): { x: number; z: number; top: number; low: number }[] {
  const lines = along === 'z' ? GRID_ZS.filter((z) => z >= rect.z0 - 1e-6 && z <= rect.z1 + 1e-6) : GRID_XS.filter((x) => x >= rect.x0 - 1e-6 && x <= rect.x1 + 1e-6);
  return lines.map((v) => {
    const x = along === 'z' ? at : v;
    const z = along === 'z' ? v : at;
    const ox = along === 'z' ? outward * 0.05 : 0;
    const oz = along === 'z' ? 0 : outward * 0.05;
    return { x, z, top: parkY(x + ox, z + oz), low: surfaceY(zone, x - ox, z - oz) };
  });
}

/** A coping along a wall's top wherever the wall stands at least 0.3 m above the drive. */
function coping(kit: Kit, points: readonly { x: number; z: number; top: number; low: number }[]): void {
  for (let k = 1; k < points.length; k += 1) {
    const a = points[k - 1];
    const b = points[k];
    if (a === undefined || b === undefined || Math.min(a.top - a.low, b.top - b.low) < 0.3) continue;
    kit.add(UNIT_BLOCK, siteMaterials.wallStone, beamMatrix([a.x, a.top, a.z], [b.x, b.top, b.z], COPING_WIDTH, COPING_HEIGHT));
  }
}

function pave(kit: Kit, zone: Zone): void {
  for (const cell of CELLS) {
    if (cell.zone !== zone || cell.cut !== null) continue;
    kit.add(UNIT_TILE, palette.asphalt, surfaceMatrix(cell.x0, cell.x1, cell.z0, cell.z1, (x, z) => surfaceY(zone, x, z)));
  }
}

export const drivesStep: StepDef = {
  id: 'site-transverse-cuts',
  chapter: 'site',
  title: 'Cut the north and south drives',
  detail: 'The service drive along the north face and the garage loop on the south fall to 2.2 m below the avenue, between stone walls.',
  motion: { kind: 'rise', distance: 0.6 },
  stagger: '-z',
  build(kit) {
    pave(kit, 'driveNorth');
    pave(kit, 'driveSouth');
    const north = edge(DRIVE_NORTH, 'driveNorth', 'z', DRIVE_NORTH.x1, 1);
    coping(kit, north);
    coping(kit, edge(DRIVE_NORTH, 'driveNorth', 'x', DRIVE_NORTH.z0, -1));
    coping(kit, edge(DRIVE_SOUTH, 'driveSouth', 'z', DRIVE_SOUTH.x0, -1));
    coping(kit, edge(DRIVE_SOUTH, 'driveSouth', 'x', DRIVE_SOUTH.z0, -1));
    // The fence on the north wall, from the dock to the sidewalk (OSM 739699912 runs Z −33.3 to +12.3 at X +163).
    const fence = north.filter((p) => p.z <= 12.3 && p.top - p.low > 0.3);
    for (const p of fence) kit.add(UNIT_BLOCK, palette.metalDark, blockMatrix(p.x, p.top + COPING_HEIGHT, p.z, FENCE_POST, FENCE_HEIGHT, FENCE_POST));
    for (let k = 1; k < fence.length; k += 1) {
      const a = fence[k - 1];
      const b = fence[k];
      if (a === undefined || b === undefined) continue;
      for (const y of [0.15, FENCE_HEIGHT - 0.05]) {
        kit.add(UNIT_BLOCK, palette.metalDark, beamMatrix([a.x, a.top + COPING_HEIGHT + y, a.z], [b.x, b.top + COPING_HEIGHT + y, b.z], 0.04, 0.04));
      }
    }
  },
};
