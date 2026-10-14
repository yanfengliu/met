/**
 * Builders for the McKim, Mead & White fronts (facade-layout.ts): the wall masses bay by bay, the windows and doors in them, the orders (Tuscan pilaster strips on
 * the links, the giant Corinthian order on the end pavilions) with the archivolts, keystones and attic piers, and the horizontal mouldings swept along each
 * front's face line: the water table round the whole front, the links' main entablature and dentilled cornice, and the pavilions' architrave, frieze,
 * modillioned cornice and parapet coping ([E43], [E42]; dims.ts).
 * Two height tiers (dims.ts): the links' cornice stops against the end pavilion, whose cornice springs from its top and returns along the seam wall.
 * Build order: `order` is the bay's index along its front, so a step's pieces arrive along the facade.
 */
import { BoxGeometry, Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { architraveProfile, corniceProfile, corniceRun, friezeProfile, moulding, pilaster, stackProfiles } from '../lib/index.js';
import type { Profile } from '../lib/index.js';
import { palette } from '../palette.js';
import {
  ARCH_CROWN_Y,
  ARCH_SILL_Y,
  ARCH_WIDTH,
  BASE_WINDOW_SILL_Y,
  END_TIER,
  ENTABLATURE_TOP_Y,
  ENTABLATURE_Y,
  GIANT_PILASTER_PROJECTION,
  GIANT_PILASTER_WIDTH,
  NICHE_CROWN_Y,
  NICHE_WIDTH,
  PARAPET_COPING,
  PARTY_WALL,
  PILASTER_PROJECTION,
  PILASTER_WIDTH,
  WATER_TABLE_Y,
} from './dims.js';
import { archBay, archWindow, baseWindowUnit, crownKeystone, doorBay, endBay, linkDoor, nicheArchivolt, pier, WALL_FOOT_Y, windowArchivolt } from './facade-parts.js';
import { frontPath, linesPath, pilasterStations, placedBays, tierGroups } from './facade-layout.js';
import type { Front, Run } from './facade-layout.js';
import { merged } from './merge.js';
import { boxMatrix, onFacade, onLine, UNIT_BOX } from './shapes.js';
import type { FacadeLine } from './shapes.js';

/** How far the arched windows' frames sit back from the wall face, metres. */
const WINDOW_REVEAL = 0.42;
/** How far the base windows and doors sit back. */
const BASE_REVEAL = 0.32;
/** The copings and parapet pedestals: a geometry of their own, so the moulding check in mmw.test.ts (which lets mouldings overhang) covers them and no wall box. */
const TRIM_BOX: BufferGeometry = new BoxGeometry(1, 1, 1);

/** A box of TRIM_BOX on a facade: `a0..a1` along the line, `y0..y1` up, `o0..o1` out from the face. */
function addTrim(kit: Kit, line: FacadeLine, a0: number, a1: number, y0: number, y1: number, o0: number, o1: number, order: number): void {
  const [xa, za] = onLine(line, a0, o0);
  const [xb, zb] = onLine(line, a1, o1);
  kit.add(TRIM_BOX, palette.limestoneDark, boxMatrix(Math.min(xa, xb), y0, Math.min(za, zb), Math.max(xa, xb), y1, Math.max(za, zb)), order);
}

/**
 * The wall masses: one module per window bay, piers scaled to their width (with the run's corner extensions), all rising from the foot to their tier's wall top;
 * and the end pavilion's seam wall over the link's roof, a party wall's depth inside the pavilion, up to the parapet.
 */
export function buildFrontWalls(kit: Kit, front: Front): void {
  for (const placed of placedBays(front)) {
    const { run: r, bay, start, centre, index } = placed;
    if (bay.kind === 'pier') {
      const first = start === 0;
      const last = Math.abs(start + bay.width - r.line.length) < 1e-6;
      const a0 = first ? -r.extendStart : start;
      const a1 = last ? r.line.length + r.extendEnd : start + bay.width;
      if (a1 - a0 < 1e-6) continue;
      kit.add(pier(r.tier), palette.limestone, onFacade(r.line, (a0 + a1) / 2, WALL_FOOT_Y, 0, a1 - a0, 1, 1), index);
      continue;
    }
    const geometry = bay.kind === 'arch' || bay.kind === 'giant' ? archBay(r.tier) : bay.kind === 'door' ? doorBay(r.tier) : endBay(bay.width, r.tier);
    kit.add(geometry, palette.limestone, onFacade(r.line, centre, WALL_FOOT_Y), index);
  }
  const { seam } = front;
  const [x0, z0] = onLine(seam.line, 0, -PARTY_WALL);
  const [x1, z1] = onLine(seam.line, seam.line.length, 0);
  kit.add(UNIT_BOX, palette.limestone, boxMatrix(Math.min(x0, x1), seam.foot, Math.min(z0, z1), Math.max(x0, x1), END_TIER.wallTop, Math.max(z0, z1)), seam.where === 'before' ? 0 : placedBays(front).length);
}

/** Windows and doors: the bronze arched windows, the grilled base windows and the links' doors; each unit's metal is one merged geometry. */
export function buildFrontWindows(kit: Kit, front: Front): void {
  const arch = archWindow();
  const archMetal = merged('front-arch-window-metal', [[arch.frame], [arch.bars]]);
  const base = baseWindowUnit();
  const baseMetal = merged('front-base-window-metal', [[base.frame], [base.bars]]);
  const door = linkDoor();
  const doorBronze = merged('front-door-bronze', [[door.frame], [door.leaf]]);
  for (const { run: r, bay, centre, index } of placedBays(front)) {
    if (bay.kind === 'pier') continue;
    if (bay.kind !== 'end') {
      const m = onFacade(r.line, centre, ARCH_SILL_Y, -WINDOW_REVEAL);
      kit.add(archMetal, palette.metalDark, m, index);
      kit.add(arch.glass, palette.glassDark, m, index);
    }
    if (bay.kind === 'door') {
      const m = onFacade(r.line, centre, -0.4, -BASE_REVEAL);
      kit.add(doorBronze, palette.bronze, m, index);
      if (door.glass !== undefined) kit.add(door.glass, palette.glassDark, m, index);
    } else {
      const m = onFacade(r.line, centre, BASE_WINDOW_SILL_Y, -BASE_REVEAL);
      kit.add(baseMetal, palette.metalDark, m, index);
      kit.add(base.glass, palette.glassDark, m, index);
    }
  }
}

/**
 * A pilaster of the run's order as one geometry, origin at its foot on the water table, on the wall face: a Tuscan strip up to the links' main entablature with its
 * attic pier from the entablature to the crowning cornice, or a giant Corinthian pilaster up to the pavilions' architrave.
 */
function pilasterOf(r: Run): { readonly width: number; readonly geometry: BufferGeometry } | null {
  if (r.order === 'none') return null;
  if (r.order === 'giant') {
    const top = r.tier.architraveY ?? r.tier.corniceY;
    const shaft = pilaster({ order: 'corinthian', width: GIANT_PILASTER_WIDTH, projection: GIANT_PILASTER_PROJECTION, height: top - WATER_TABLE_Y, fluted: true });
    return { width: GIANT_PILASTER_WIDTH, geometry: merged(`front-pilaster-giant-${r.tier.name}`, [[shaft]]) };
  }
  const shaft = pilaster({ order: 'doric', width: PILASTER_WIDTH, projection: PILASTER_PROJECTION, height: ENTABLATURE_Y - WATER_TABLE_Y, fluted: false });
  const pierBox = boxMatrix(-PILASTER_WIDTH / 2, ENTABLATURE_TOP_Y - WATER_TABLE_Y, 0, PILASTER_WIDTH / 2, r.tier.corniceY - WATER_TABLE_Y, 0.12);
  return { width: PILASTER_WIDTH, geometry: merged(`front-pilaster-tuscan-${r.tier.name}`, [[shaft], [UNIT_BOX, pierBox]]) };
}

/** The orders: pilasters (with the Tuscan strips' attic piers), and each arch's archivolt and keystone (one geometry each). */
export function buildFrontOrders(kit: Kit, front: Front): void {
  let base = 0;
  for (const r of front.runs) {
    const p = pilasterOf(r);
    if (p !== null) {
      for (const at of pilasterStations(r, p.width / 2)) kit.add(p.geometry, palette.limestone, onFacade(r.line, at, WATER_TABLE_Y), base + Math.round(at / 5.2));
    }
    base += r.bays.length;
  }
  const key = crownKeystone();
  const lift = (y: number): Matrix4 => new Matrix4().makeTranslation(0, y, 0);
  const archTrim = merged('front-arch-trim', [[windowArchivolt()], [key, lift(ARCH_WIDTH / 2)]]);
  const nicheTrim = merged('front-niche-trim', [[nicheArchivolt()], [key, lift(NICHE_WIDTH / 2)]]);
  for (const { run: r, bay, centre, index } of placedBays(front)) {
    if (bay.kind === 'pier') continue;
    if (bay.kind === 'end') kit.add(nicheTrim, palette.limestone, onFacade(r.line, centre, NICHE_CROWN_Y - NICHE_WIDTH / 2), index);
    else kit.add(archTrim, palette.limestone, onFacade(r.line, centre, ARCH_CROWN_Y - ARCH_WIDTH / 2), index);
  }
}

/** The links' main entablature ([E43]): architrave 0.3, frieze 0.3 and a cornice of 0.55. */
const ENTABLATURE_PROFILE = stackProfiles([
  architraveProfile({ height: 0.3, projection: 0.2 }),
  friezeProfile({ height: 0.3, projection: 0.18 }),
  corniceProfile({ height: ENTABLATURE_TOP_Y - ENTABLATURE_Y - 0.6, projection: 0.6, modillions: false, dentils: false }),
]);

/** The pavilions' architrave and frieze over the giant capitals, in proportion 1 : 1.4 ([E42]), for a crowning entablature `height` tall. */
function friezeProfileOf(height: number): Profile {
  return stackProfiles([architraveProfile({ height: height * 0.42, projection: 0.34 }), friezeProfile({ height: height * 0.58, projection: 0.3 })]);
}

/**
 * The horizontal lines: the water table round the whole front and the main entablature along the links; per tier the crowning cornice (the links' with dentils,
 * the pavilions' with modillions and dentils over the architrave and frieze), and the copings: set back behind the links' cornice, over the pavilions' parapet
 * (along the seam too) with pedestals over the corner pilasters of the pavilion fronts.
 */
export function buildFrontCornices(kit: Kit, front: Front): void {
  const groups = tierGroups(front).map((g) => ({
    ...g,
    crown: corniceRun({ path: linesPath(g.lines, g.tier.corniceY), height: g.tier.top - g.tier.corniceY, projection: g.tier.projection, modillions: g.tier.modillions, dentils: true }),
  }));
  const links = front.runs.filter((r) => r.tier.architraveY === null).map((r) => r.line);
  const lines = merged('front-mouldings-' + front.name, [
    [moulding({ profile: 'string-course', path: frontPath(front, WATER_TABLE_Y - 0.42), height: 0.42, projection: 0.26 })],
    ...(links.length === 0 ? [] : [[moulding({ profile: ENTABLATURE_PROFILE, path: linesPath(links, ENTABLATURE_Y) })] as [BufferGeometry]]),
    ...groups.flatMap((g): [BufferGeometry][] => {
      const architraveY = g.tier.architraveY;
      if (architraveY === null) return [[g.crown.moulding]];
      // The architrave and frieze run along the pavilion's own faces; over the seam wall the link's roof hides them, so only the cornice returns there.
      const frieze = moulding({ profile: friezeProfileOf(g.tier.corniceY - architraveY), path: linesPath(g.runs.map((r) => r.line), architraveY) });
      return [[frieze], [g.crown.moulding]];
    }),
  ]);
  kit.add(lines, palette.limestone, new Matrix4(), 0);
  groups.forEach(({ tier, lines: faces, crown }, gi) => {
    const modillion = crown.modillion;
    if (modillion !== undefined) crown.modillions.forEach((m, i) => { kit.add(modillion, palette.limestone, m, 3 + gi + Math.floor(i / 8)); });
    const dentil = crown.dentil;
    if (dentil !== undefined) crown.dentils.forEach((m, i) => { kit.add(dentil, palette.limestone, m, 3 + gi + Math.floor(i / 32)); });
    faces.forEach((line, i) => {
      const r = front.runs.find((x) => x.line === line);
      const a0 = -(r?.extendStart ?? 0);
      const a1 = line.length + (r?.extendEnd ?? 0);
      // The links' coping stands back behind the cornice; the pavilions' caps the parapet and overhangs it a little.
      if (tier.architraveY === null) addTrim(kit, line, a0, a1, tier.top, tier.top + 0.35, -0.95, -0.35, 2 + gi + i);
      else addTrim(kit, line, a0, a1, tier.wallTop, tier.wallTop + PARAPET_COPING, -1.25, 0.12, 2 + gi + i);
    });
    // Pedestals on the parapet over the corner pilasters of a pavilion front ([E39]).
    for (const r of front.runs) {
      if (r.tier !== tier || !r.cornerPilasters) continue;
      const half = GIANT_PILASTER_WIDTH / 2 + 0.15;
      for (const at of [GIANT_PILASTER_WIDTH / 2, r.line.length - GIANT_PILASTER_WIDTH / 2]) addTrim(kit, r.line, at - half, at + half, tier.top, tier.wallTop, -0.2, 0.25, 4 + gi);
    }
  });
}
