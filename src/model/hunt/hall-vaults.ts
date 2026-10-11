/**
 * The Great Hall (1900–1902), arches, vaults and domes: transverse arches across the nave on the four pier lines, the long walls' arches with the balcony's
 * coffered barrel vaults behind them (LPC77: the balcony's vaults spring from the piers that carry the domes), the panelled pendentives, moulded rings and
 * three saucer domes with glazed crown oculi (Guastavino tile, Heckscher p. 36), and the end bays' arches with their painted half-domes.
 * Heights: P1 (Daderot 2020) at 1:1: arches spring at Y 14.0 and the transverse arches crown at 22.3; the end half-domes spring at 14.4 under arches of 13.1 m.
 */
import type { Kit, StepDef } from '../../build/types.js';
import { archivolt, barrelVault, dome, drum, oculusLight, pendentives, wall } from '../lib/index.js';
import { palette } from '../palette.js';
import { HALL_ARCH_SPRING_Y, HALL_WEST_Z, HALL_X, NAVE_EAST_Z, NAVE_MID_Z, NAVE_WEST_Z, PIER_W, PIER_X, WALL_BACK_Z } from './dims.js';
import { bayOpenings, PIER_DEPTH } from './hall.js';
import { hunt } from './materials.js';
import { at, box, halfDome, scaled } from './shapes.js';
import * as THREE from 'three';

const NAVE = NAVE_EAST_Z - NAVE_WEST_Z;
/** Clear width of each bay between the piers (14.68 m centre, 14.81 m sides): one value serves all three. */
const BAY = 14.75;
const SX = BAY / NAVE;
const TOP = 23.2;
const RING_Y = HALL_ARCH_SPRING_Y + NAVE / 2;
const RING_H = 0.9;
const DOME_RISE = 3.3;
const OCULUS = 2.3;
export const DOME_BASE_Y = RING_Y + RING_H;
/** The three domes' centres, south to north. */
export const DOME_X = [-17.345, 0, 17.345] as const;
/** The end half-domes (P1): arch span 13.1 m, springing at Y 14.4. */
const END = { span: 13.1, spring: 14.4 } as const;

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

const transverse = lazy(() =>
  wall({ width: NAVE + 2 * PIER_DEPTH, height: TOP - HALL_ARCH_SPRING_Y, thickness: PIER_W, openings: [{ shape: 'arch', x: 0, y: 0, width: NAVE, height: NAVE / 2 + 0.045 }] }),
);
const longitudinal = lazy(() => wall({ width: BAY + PIER_W, height: TOP - HALL_ARCH_SPRING_Y, thickness: 0.8, openings: [{ shape: 'arch', x: 0, y: 0, width: BAY, height: BAY / 2 + 0.045 }] }));
const balconyVault = lazy(() => barrelVault({ span: BAY, length: 6.25, thickness: 0.4, coffers: { across: 13, along: 4, depth: 0.09, rib: 0.16 } }));
const endArch = lazy(() => wall({ width: NAVE, height: TOP - HALL_ARCH_SPRING_Y, thickness: 0.6, openings: [{ shape: 'arch', x: 0, y: END.spring - HALL_ARCH_SPRING_Y, width: END.span, height: END.span / 2 + 0.05 }] }));

function arches(kit: Kit): void {
  const y = HALL_ARCH_SPRING_Y;
  // The transverse arches' coffered soffits (P2), a ring of coffers just inside each opening, its axis across the arch.
  const soffit = barrelVault({ span: NAVE - 0.2, length: PIER_W - 0.04, thickness: 0.08, coffers: { across: 15, along: 2, depth: 0.12, rib: 0.2 } });
  PIER_X.forEach((x, i) => {
    kit.add(transverse(), hunt.hallStone, at(x + PIER_W / 2, y, NAVE_MID_Z, Math.PI / 2), i);
    kit.add(soffit, hunt.hallStone, at(x, y + 0.045, NAVE_MID_Z, Math.PI / 2), i);
    const band = archivolt({ span: NAVE, band: 0.85, projection: 0.12 });
    kit.add(band, hunt.hallStone, at(x + PIER_W / 2, y + 0.045, NAVE_MID_Z, Math.PI / 2), i);
    kit.add(band, hunt.hallStone, at(x - PIER_W / 2, y + 0.045, NAVE_MID_Z, -Math.PI / 2), i);
  });
  const ring = archivolt({ span: BAY, band: 0.75, projection: 0.12 });
  bayOpenings().forEach(([a, b], i) => {
    const cx = (a + b) / 2;
    // The long walls' arches face the nave; behind each, the balcony's coffered vault runs back to the outer wall.
    kit.add(longitudinal(), hunt.hallStone, at(cx, y, NAVE_EAST_Z, Math.PI), 4 + i);
    kit.add(ring, hunt.hallStone, at(cx, y + 0.045, NAVE_EAST_Z, Math.PI), 4 + i);
    kit.add(balconyVault(), hunt.hallStone, at(cx, y, (NAVE_EAST_Z + WALL_BACK_Z) / 2), 4 + i);
    kit.add(longitudinal(), hunt.hallStone, at(cx, y, NAVE_WEST_Z), 4 + i);
    kit.add(ring, hunt.hallStone, at(cx, y + 0.045, NAVE_WEST_Z), 4 + i);
    kit.add(balconyVault(), hunt.hallStone, at(cx, y, (NAVE_WEST_Z + HALL_WEST_Z) / 2), 4 + i);
  });
}

function domes(kit: Kit): void {
  const pend = pendentives({ span: NAVE });
  const base = drum({ radius: NAVE / 2, height: RING_H, thickness: 0.65, cornice: true });
  const shell = dome({ radius: NAVE / 2, rise: DOME_RISE, thickness: 0.35, oculus: OCULUS });
  const light = oculusLight({ radius: OCULUS + 0.2, bars: 16, depth: 0.12 });
  // Height of the shell's inner surface at the oculus edge, where the glazed light sits.
  const rho = ((NAVE / 2) ** 2 + DOME_RISE ** 2) / (2 * DOME_RISE);
  const edge = DOME_RISE - rho + Math.sqrt(rho * rho - OCULUS * OCULUS);
  DOME_X.forEach((x, i) => {
    kit.add(pend, hunt.domeStone, scaled(x, HALL_ARCH_SPRING_Y, NAVE_MID_Z, SX, 1, 1), i);
    kit.add(base, hunt.domeStone, scaled(x, RING_Y, NAVE_MID_Z, SX, 1, 1), i);
    kit.add(shell, hunt.domeStone, scaled(x, DOME_BASE_Y, NAVE_MID_Z, SX, 1, 1), i);
    const m = scaled(x, DOME_BASE_Y + edge, NAVE_MID_Z, SX, 1, 1);
    kit.add(light.frame, palette.metalDark, m, i);
    kit.add(light.glass, palette.glass, m, i);
  });
}

function endVaults(kit: Kit): void {
  const face = 26.05 + PIER_W / 2;
  const depth = HALL_X - face - 0.6;
  const shell = halfDome(END.span / 2, 0.3, 28);
  for (const s of [-1, 1]) {
    // The arch framing the half-dome, behind the transverse arch, facing the nave.
    kit.add(endArch(), hunt.hallStone, at(s * face, HALL_ARCH_SPRING_Y, NAVE_MID_Z, s > 0 ? -Math.PI / 2 : Math.PI / 2), s > 0 ? 1 : 0);
    // The half-dome: its flat face on the arch's back, the shell flattened into the bay's depth.
    const m = new THREE.Matrix4().makeTranslation(s * (face + 0.6), END.spring + 0.05, NAVE_MID_Z);
    if (s > 0) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    m.multiply(new THREE.Matrix4().makeScale(depth / (END.span / 2), 1, 1));
    kit.add(shell, hunt.halfDome, m, s > 0 ? 1 : 0);
    // The end balcony's ceiling under the half-dome's springing (P1: a cornice over the balcony's cases), run on over the ends of both aisles.
    box(kit, hunt.hallStone, [s > 0 ? face : -HALL_X, HALL_ARCH_SPRING_Y, HALL_WEST_Z], [s > 0 ? HALL_X : -face, END.spring, WALL_BACK_Z], s > 0 ? 1 : 0);
  }
}

export const vaultSteps: readonly StepDef[] = [
  {
    id: 'great-hall-arches',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Turn the Great Hall arches and balcony vaults',
    detail: 'Round arches spring from the piers across the nave and along both long walls; behind the long-wall arches the balcony gets its coffered barrel vaults.',
    motion: { kind: 'drop', distance: 6 },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-floor-north' },
    build: arches,
  },
  {
    id: 'great-hall-domes',
    chapter: 'hunt-1902',
    year: '1901',
    title: 'Vault the three saucer domes',
    detail: "Guastavino's thin tile shells: panelled pendentives rise from the piers to a moulded ring in each bay, and a saucer dome closes over it round a glazed oculus.",
    motion: { kind: 'pop' },
    stagger: 'order',
    focus: { kind: 'preset', id: 'int-great-hall-floor-north' },
    build: domes,
  },
  {
    id: 'great-hall-end-vaults',
    chapter: 'hunt-1902',
    year: '1902',
    title: 'Close the end bays with half-domes',
    detail: 'At each end of the hall a second arch stands behind the last transverse arch, and a painted half-dome closes the shallow end bay above the balcony.',
    motion: { kind: 'drop', distance: 5 },
    stagger: 'x',
    focus: { kind: 'preset', id: 'int-great-hall-floor-north' },
    build: endVaults,
  },
];
