/**
 * Builders for the McKim, Mead & White fronts (facade-layout.ts): the wall masses bay by bay, the windows and doors in them, the orders (Tuscan pilaster strips on
 * the links and the end facades, the giant Corinthian order on the pavilion fronts) with the archivolts, keystones and attic piers, and the horizontal mouldings
 * (water table, main entablature, crowning cornice with modillions and dentils, antefix cresting) swept along each front's face line.
 * Two height tiers (dims.ts): the links' crowning cornice stops against the end pavilion's seam wall, an attic storey under the pavilion's, which returns along it.
 * Build order: `order` is the bay's index along its front, so a step's pieces arrive along the facade.
 */
import { Matrix4 } from 'three';
import type { BufferGeometry } from 'three';

import type { Kit } from '../../build/types.js';
import { architraveProfile, along, corniceProfile, corniceRun, friezeProfile, moulding, pilaster, stackProfiles } from '../lib/index.js';
import { palette } from '../palette.js';
import {
  ARCH_CROWN_Y,
  ARCH_SILL_Y,
  ARCH_WIDTH,
  BASE_WINDOW_SILL_Y,
  CORNICE_PROJECTION,
  CRESTING_SPACING,
  END_TIER,
  ENTABLATURE_TOP_Y,
  ENTABLATURE_Y,
  GIANT_PILASTER_PROJECTION,
  GIANT_PILASTER_WIDTH,
  NICHE_CROWN_Y,
  NICHE_WIDTH,
  PARTY_WALL,
  PILASTER_PROJECTION,
  PILASTER_WIDTH,
  WATER_TABLE_Y,
} from './dims.js';
import { antefix, archBay, archWindow, baseWindowUnit, crownKeystone, doorBay, endBay, linkDoor, nicheArchivolt, pier, WALL_FOOT_Y, windowArchivolt } from './facade-parts.js';
import { frontPath, linesPath, pilasterStations, placedBays, tierGroups } from './facade-layout.js';
import type { Front, Run } from './facade-layout.js';
import { merged } from './merge.js';
import { addFacadeBox, boxMatrix, onFacade, UNIT_BOX } from './shapes.js';

/** How far the arched windows' frames sit back from the wall face, metres. */
const WINDOW_REVEAL = 0.42;
/** How far the base windows and doors sit back. */
const BASE_REVEAL = 0.32;
/** Pilaster height: water table to the main entablature. */
const PILASTER_HEIGHT = ENTABLATURE_Y - WATER_TABLE_Y;

/**
 * The wall masses: one module per window bay, piers scaled to their width (with the run's corner extensions), all rising from the foot to their tier's cornice top;
 * and the end pavilion's seam wall over the link's roof, a party wall's depth inside the pavilion.
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
  addFacadeBox(kit, palette.limestone, seam.line, 0, seam.line.length, seam.foot, END_TIER.top, -PARTY_WALL, 0, seam.where === 'before' ? 0 : placedBays(front).length);
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

/** A pilaster of the run's order with its attic pier up to its tier's crowning cornice, as one geometry; origin at its foot on the water table, on the wall face. */
function pilasterOf(r: Run): { readonly width: number; readonly geometry: BufferGeometry } | null {
  if (r.order === 'none') return null;
  const giant = r.order === 'giant';
  const width = giant ? GIANT_PILASTER_WIDTH : PILASTER_WIDTH;
  const shaft = pilaster({ order: giant ? 'corinthian' : 'doric', width, projection: giant ? GIANT_PILASTER_PROJECTION : PILASTER_PROJECTION, height: PILASTER_HEIGHT, fluted: false });
  const pier = boxMatrix(-width / 2, ENTABLATURE_TOP_Y - WATER_TABLE_Y, 0, width / 2, r.tier.corniceY - WATER_TABLE_Y, 0.12);
  return { width, geometry: merged(`front-pilaster-${r.order}-${r.tier.name}`, [[shaft], [UNIT_BOX, pier]]) };
}

/** The orders: pilasters with their attic piers above, and each arch's archivolt and keystone (one geometry each). */
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

/** The main entablature's section: architrave and frieze proud of the giant pilasters, under a plain cornice. */
const ENTABLATURE_PROFILE = stackProfiles([
  architraveProfile({ height: 0.5, projection: 0.32 }),
  friezeProfile({ height: 0.55, projection: 0.3 }),
  corniceProfile({ height: ENTABLATURE_TOP_Y - ENTABLATURE_Y - 1.05, projection: 0.8, modillions: false, dentils: false }),
]);

/**
 * The horizontal lines: water table and main entablature round the whole front, and per tier the crowning cornice with modillions and dentils, the antefix
 * cresting on it and the parapet's coping (the pavilion's along its seam too).
 */
export function buildFrontCornices(kit: Kit, front: Front): void {
  const groups = tierGroups(front).map((g) => ({ ...g, crown: corniceRun({ path: linesPath(g.lines, g.tier.corniceY), height: g.tier.top - g.tier.corniceY, projection: CORNICE_PROJECTION }) }));
  const lines = merged('front-mouldings-' + front.name, [
    [moulding({ profile: 'string-course', path: frontPath(front, WATER_TABLE_Y - 0.42), height: 0.42, projection: 0.26 })],
    [moulding({ profile: ENTABLATURE_PROFILE, path: frontPath(front, ENTABLATURE_Y) })],
    ...groups.map((g): [BufferGeometry] => [g.crown.moulding]),
  ]);
  kit.add(lines, palette.limestone, new Matrix4(), 0);
  const cresting = antefix();
  groups.forEach(({ tier, lines: faces, crown }, gi) => {
    const modillion = crown.modillion;
    if (modillion !== undefined) crown.modillions.forEach((m, i) => { kit.add(modillion, palette.limestone, m, 3 + gi + Math.floor(i / 8)); });
    const dentil = crown.dentil;
    if (dentil !== undefined) crown.dentils.forEach((m, i) => { kit.add(dentil, palette.limestone, m, 3 + gi + Math.floor(i / 32)); });
    along(linesPath(faces, tier.corniceY), CRESTING_SPACING, { outward: CORNICE_PROJECTION * 0.62, y: tier.top - tier.corniceY }).forEach((m, i) => {
      kit.add(cresting, palette.limestone, m, 3 + gi + Math.floor(i / 6));
    });
    // The parapet's coping behind the cresting, along every face of the tier.
    faces.forEach((line, i) => {
      const r = front.runs.find((x) => x.line === line);
      addFacadeBox(kit, palette.limestoneDark, line, -(r?.extendStart ?? 0), line.length + (r?.extendEnd ?? 0), tier.top, tier.top + 0.35, -0.95, -0.35, 2 + gi + i);
    });
  });
}
