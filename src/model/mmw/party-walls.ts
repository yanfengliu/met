/**
 * The walls this area builds on lines it shares with newer wings (the coordinator's rule: the older block builds the shared wall): the north end pavilion's and
 * the Morgan wing's walls against the Sackler Wing (1978) and the American Wing (1980), and the south wings' walls against the Rockefeller (1982) and Kravis (1990)
 * wings. They stood as outside walls until those wings closed round them. Plain ashlar with a coping, PARTY_WALL thick, outer face on the block line.
 * Where a newer wing rose higher than the old roof beside it, the shared wall was carried up past the new roof: the raises below, built in steps of the newer
 * wings' chapters, so the walls keep their 1910 and 1926 heights until then. Without them the Dendur hall, the Engelhard Court and the Rockefeller and Kravis
 * galleries show sky between the old coping and their roofs (seen from inside, 2026-10-13).
 */
import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { END_PARAPET_Y, KRAVIS_LINE_TOP_Y, LINK_TIER, MORGAN_ROOF_Y, PARTY_WALL } from './dims.js';
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

/** A shared wall carried up: the wall it stands on, and the new coping's top. */
interface Raise {
  readonly wall: Party;
  readonly top: number;
}

/** The Morgan wing's walls stop a parapet above its lower roof. */
const MORGAN_PARAPET_Y = MORGAN_ROOF_Y + 1.0;

const SACKLER_X118: Party = { x0: 118.0, z0: -96.0, x1: 118.0, z1: -41.3, out: '+x', top: MORGAN_PARAPET_Y };
const AMERICAN_Z96: Party = { x0: 49.4, z0: -96.0, x1: 118.0, z1: -96.0, out: '-z', top: MORGAN_PARAPET_Y };
const ROCKEFELLER_X88: Party = { x0: -88.1, z0: -69.0, x1: -88.1, z1: -38.5, out: '-x', top: LINK_TIER.top };
const KRAVIS_Z69: Party = { x0: -88.1, z0: -69.0, x1: -49.7, z1: -69.0, out: '-z', top: LINK_TIER.top };

/** North campaign: against the Sackler Wing (Z −41.3 and X 118.0) and the American Wing (Z −96.0). */
export const NORTH_PARTY: readonly Party[] = [{ x0: 118.0, z0: -41.3, x1: 153.13, z1: -41.3, out: '-z', top: END_PARAPET_Y }, SACKLER_X118, AMERICAN_Z96];

/** South campaign: against the Kravis Wing (Z −69.0) and the Rockefeller Wing (X −88.1 and Z −38.5). */
export const SOUTH_PARTY: readonly Party[] = [KRAVIS_Z69, ROCKEFELLER_X88, { x0: -151.61, z0: -38.5, x1: -88.1, z1: -38.5, out: '-z', top: END_PARAPET_Y }];

/**
 * 1978–1980: the Dendur hall's glass roof (frame.ts SACKLER_GLASS_TOP_Y 20.6) and the American Wing's parapet and Engelhard Court lean-to (21.4..21.5 at
 * Z −96, roche-north) stand over the Morgan wing's parapet; its walls rise to the north end pavilion's parapet, which the Sackler line already reaches.
 */
export const NORTH_RAISES: readonly Raise[] = [
  { wall: SACKLER_X118, top: END_PARAPET_Y },
  { wall: AMERICAN_Z96, top: END_PARAPET_Y },
];

/**
 * 1982–1990: the Rockefeller Wing's roof (19.6 under a 20.9 parapet, roche-south) and the Kravis Wing's (dims.ts KRAVIS_LINE_TOP_Y) stand over the south link's
 * cornice; the link's south wall rises to the south pavilion's parapet, which meets it at the corner (−88.1, −38.5), and its park wall to the Kravis parapet.
 */
export const SOUTH_RAISES: readonly Raise[] = [
  { wall: ROCKEFELLER_X88, top: END_PARAPET_Y },
  { wall: KRAVIS_Z69, top: KRAVIS_LINE_TOP_Y },
];

/** The wall's plan box [x0, x1, z0, z1]: its outer face on the line, PARTY_WALL deep on the inner side. */
function plan(p: Party): readonly [number, number, number, number] {
  const t = PARTY_WALL;
  if (p.out === '-z') return [p.x0, p.x1, p.z0, p.z0 + t];
  if (p.out === '+z') return [p.x0, p.x1, p.z0 - t, p.z0];
  if (p.out === '+x') return [p.x0 - t, p.x0, p.z0, p.z1];
  return [p.x0, p.x0 + t, p.z0, p.z1];
}

/** A run of the wall from `y0` up to a dark coping 0.3 m deep at `top`, overhanging 5 cm. */
function addWall(kit: Kit, p: Party, y0: number, top: number, order: number): void {
  const [x0, x1, z0, z1] = plan(p);
  addBox(kit, palette.limestone, x0, y0, z0, x1, top - 0.3, z1, order);
  addBox(kit, palette.limestoneDark, x0 - 0.05, top - 0.3, z0 - 0.05, x1 + 0.05, top, z1 + 0.05, order);
}

/** The party walls, rising from the outer walls' foot to the parapet, with a dark coping. */
export function buildPartyWalls(kit: Kit, walls: readonly Party[], firstOrder: number): void {
  walls.forEach((p, i) => {
    addWall(kit, p, WALL_FOOT_Y, p.top, firstOrder + i);
  });
}

/** The raised walls, from the old coping up to the new one; the old coping stays in the wall as a band. */
export function buildRaisedWalls(kit: Kit, raises: readonly Raise[]): void {
  raises.forEach(({ wall, top }, i) => {
    addWall(kit, wall, wall.top, top, i);
  });
}
