/**
 * The walls this area builds on lines it shares with newer wings (the coordinator's rule: the older block builds the shared wall): the north end pavilion's and
 * the Morgan wing's walls against the Sackler Wing (1978) and the American Wing (1980), and the south wings' walls against the Rockefeller (1982) and Kravis (1990)
 * wings. They stood as outside walls until those wings closed round them. Plain ashlar with a coping, PARTY_WALL thick, outer face on the block line.
 */
import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { END_PARAPET_Y, LINK_TIER, MORGAN_ROOF_Y, PARTY_WALL } from './dims.js';
import { WALL_FOOT_Y } from './facade-parts.js';
import { addBox } from './shapes.js';

/** One party wall: a line of the block outline and the side its outer face looks to. */
interface Party {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  /** The outward side: the wall's mass lies on the other side of the line. */
  readonly out: '+x' | '-x' | '+z' | '-z';
  /** Top of the coping. */
  readonly top: number;
}

/** North campaign: against the Sackler Wing (Z −41.3 and X 118.0) and the American Wing (Z −96.0). */
export const NORTH_PARTY: readonly Party[] = [
  { x0: 118.0, z0: -41.3, x1: 153.13, z1: -41.3, out: '-z', top: END_PARAPET_Y },
  // The Morgan wing's walls stop a parapet above its lower roof.
  { x0: 118.0, z0: -96.0, x1: 118.0, z1: -41.3, out: '+x', top: MORGAN_ROOF_Y + 1.0 },
  { x0: 49.4, z0: -96.0, x1: 118.0, z1: -96.0, out: '-z', top: MORGAN_ROOF_Y + 1.0 },
];

/** South campaign: against the Kravis Wing (Z −69.0) and the Rockefeller Wing (X −88.1 and Z −38.5). */
export const SOUTH_PARTY: readonly Party[] = [
  { x0: -88.1, z0: -69.0, x1: -49.7, z1: -69.0, out: '-z', top: LINK_TIER.top },
  { x0: -88.1, z0: -69.0, x1: -88.1, z1: -38.5, out: '-x', top: LINK_TIER.top },
  { x0: -151.61, z0: -38.5, x1: -88.1, z1: -38.5, out: '-z', top: END_PARAPET_Y },
];

/** The party walls, rising from the outer walls' foot to the parapet, with a dark coping. */
export function buildPartyWalls(kit: Kit, walls: readonly Party[], firstOrder: number): void {
  walls.forEach((p, i) => {
    const t = PARTY_WALL;
    const [x0, x1, z0, z1] =
      p.out === '-z' ? [p.x0, p.x1, p.z0, p.z0 + t] : p.out === '+z' ? [p.x0, p.x1, p.z0 - t, p.z0] : p.out === '+x' ? [p.x0 - t, p.x0, p.z0, p.z1] : [p.x0, p.x0 + t, p.z0, p.z1];
    addBox(kit, palette.limestone, x0, WALL_FOOT_Y, z0, x1, p.top - 0.3, z1, firstOrder + i);
    addBox(kit, palette.limestoneDark, x0 - 0.05, p.top - 0.3, z0 - 0.05, x1 + 0.05, p.top, z1 + 0.05, firstOrder + i);
  });
}
