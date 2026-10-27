/**
 * The walls this area builds on lines it shares with newer wings (the coordinator's rule: the older block builds the shared wall): the north end pavilion's and
 * the Morgan wing's walls against the Sackler Wing (1978) and the American Wing (1980), and the south wings' walls against the Rockefeller (1982) and Kravis (1990)
 * wings. They stood as outside walls until those wings closed round them. Plain ashlar with a coping, PARTY_WALL thick, outer face on the block line.
 * Where a newer wing rose higher than the old roof beside it, the shared wall was carried up past the new roof: the raises below, built in steps of the newer
 * wings' chapters, so the walls keep their 1910 and 1926 heights until then. Without them the Dendur hall, the Engelhard Court and the Rockefeller and Kravis
 * galleries show sky between the old coping and their roofs (seen from inside, 2026-10-13).
 */
import type { Kit } from '../../build/types.js';
import { wall } from '../lib/index.js';
import { palette } from '../palette.js';
import { END_PARAPET_Y, KRAVIS_LINE_TOP_Y, LEVEL_1, LEVEL_2_NORTH, LINK_TIER, MORGAN_ROOF_Y, PARTY_WALL, SLAB } from './dims.js';
import { WALL_FOOT_Y } from './facade-parts.js';
import { COURT_WALL, COURT_X0 } from '../roche-south/kravis.js';
import { addBox, placed } from './shapes.js';

/** A passage through a party wall: from `a` to `b` along its line (world X or Z), between heights `y0` and `y1`. */
export interface Passage {
  readonly a: number;
  readonly b: number;
  readonly y0: number;
  readonly y1: number;
}

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
  readonly passages?: readonly Passage[];
}

/** A shared wall carried up: the wall it stands on, and the new coping's top. */
interface Raise {
  readonly wall: Party;
  readonly top: number;
}

/** The Morgan wing's walls stop a parapet above its lower roof. */
const MORGAN_PARAPET_Y = MORGAN_ROOF_Y + 1.0;

/** E: a doorway's height through a party wall, as the Kravis Wing's main-floor doorways (roche-south/kravis.ts); the map gives none. */
const DOORWAY_HEIGHT = 4.0;

/**
 * The way from Arms and Armor into the Engelhard Court (work unit 2, M4): the map's corridor X 72.56..74.86 from gallery 374 to the court's east walk, with
 * a door at each end, through this wall on Z −96.0 (interior.md, The Charles Engelhard Court). Without it nothing on the main floor reached the American Wing.
 * Like the Dendur east walk's, the opening stands in the wall from its own campaign.
 */
export const ENGELHARD_PASSAGE: Passage = { a: 72.56, b: 74.86, y0: LEVEL_1, y1: LEVEL_1 + DOORWAY_HEIGHT };

/** D: the map's corridor from Exhibition Gallery 199 into gallery 549 is X −63.80..−62.03, 1.77 m wide (interior.md, Other skylit volumes). */
const PETRIE_CORRIDOR_WIDTH = 1.77;

/**
 * The way from the Greek and Roman galleries into the Petrie Court's wing (work unit 2, M4): the map's corridor from Exhibition Gallery 199 to the east end
 * of gallery 549, whose doors open into the court (interior.md, Other skylit volumes). The map's corridor lies 4.2 m east of this block line, where its 549
 * and court run on to; here it opens through this wall on Z −69.0, as wide as on the map, its north side on the south face of the court's limestone wall
 * (roche-south/kravis.ts; 0.22 m south of the map's), so that wall is not cut. It does not need Weston's 1888 door, which opens (work unit 2, M2b) but which reach.test.ts counts shut.
 */
export const PETRIE_PASSAGE: Passage = { a: COURT_X0 - COURT_WALL - PETRIE_CORRIDOR_WIDTH, b: COURT_X0 - COURT_WALL, y0: LEVEL_1, y1: LEVEL_1 + DOORWAY_HEIGHT };

const SACKLER_X118: Party = { x0: 118.0, z0: -96.0, x1: 118.0, z1: -41.3, out: '+x', top: MORGAN_PARAPET_Y };
const AMERICAN_Z96: Party = { x0: 49.4, z0: -96.0, x1: 118.0, z1: -96.0, out: '-z', top: MORGAN_PARAPET_Y, passages: [ENGELHARD_PASSAGE] };
const ROCKEFELLER_X88: Party = { x0: -88.1, z0: -69.0, x1: -88.1, z1: -38.5, out: '-x', top: LINK_TIER.top };
const KRAVIS_Z69: Party = { x0: -88.1, z0: -69.0, x1: -49.7, z1: -69.0, out: '-z', top: LINK_TIER.top, passages: [PETRIE_PASSAGE] };

/**
 * The Temple of Dendur hall runs on past this block line, to Z −35.7 (exterior.md [K3], the roche-north modeller): on the main floor its east walkway lies inside
 * the end pavilion here, and the map draws no wall on Z −41.3 from the hall's south side (X 118.07) to the foot of its glass wall (X 151.95, interior.md, The
 * Temple of Dendur). The wall stands open there under the pavilion's second floor, the way into the hall from the Egyptian galleries.
 */
const DENDUR_EAST_WALK: Passage = { a: 118.07, b: 151.95, y0: LEVEL_1, y1: LEVEL_2_NORTH - SLAB };

/** North campaign: against the Sackler Wing (Z −41.3 and X 118.0) and the American Wing (Z −96.0). */
export const NORTH_PARTY: readonly Party[] = [{ x0: 118.0, z0: -41.3, x1: 153.13, z1: -41.3, out: '-z', top: END_PARAPET_Y, passages: [DENDUR_EAST_WALK] }, SACKLER_X118, AMERICAN_Z96];

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

/**
 * A run of the wall from `y0` up to `y1` with `passages` cut through it, as one wall of the parts library: turned so its front is the outer face, on the line.
 * In the wall's own frame x then runs toward +X or +Z for an outer face looking +Z or −X, and the other way for −Z or +X.
 */
function addOpenedWall(kit: Kit, p: Party, passages: readonly Passage[], y0: number, y1: number, order: number): void {
  const alongX = p.out === '-z' || p.out === '+z';
  const lo = alongX ? Math.min(p.x0, p.x1) : Math.min(p.z0, p.z1);
  const hi = alongX ? Math.max(p.x0, p.x1) : Math.max(p.z0, p.z1);
  const mid = (lo + hi) / 2;
  const turn = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[p.out];
  const sign = p.out === '+z' || p.out === '-x' ? 1 : -1;
  const openings = passages.map((s) => ({ x: sign * ((s.a + s.b) / 2 - mid), y: s.y0 - y0, width: Math.abs(s.b - s.a), height: s.y1 - s.y0 }));
  const geometry = wall({ width: hi - lo, height: y1 - y0, thickness: PARTY_WALL, openings });
  kit.add(geometry, palette.limestone, alongX ? placed(mid, y0, p.z0, turn) : placed(p.x0, y0, mid, turn), order);
}

/** A run of the wall from `y0` up to a dark coping 0.3 m deep at `top`, overhanging 5 cm, with any of its passages that fall in that height. */
function addWall(kit: Kit, p: Party, y0: number, top: number, order: number): void {
  const [x0, x1, z0, z1] = plan(p);
  const passages = (p.passages ?? []).filter((s) => s.y0 < top - 0.3 && s.y1 > y0);
  if (passages.length === 0) addBox(kit, palette.limestone, x0, y0, z0, x1, top - 0.3, z1, order);
  else addOpenedWall(kit, p, passages, y0, top - 0.3, order);
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
