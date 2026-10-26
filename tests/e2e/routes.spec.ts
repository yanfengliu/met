/**
 * The public routes of plan docs/work/1_first-person-walk (M2, M2b), walked through real input on the finished building. Walk mode is entered as a visitor
 * enters it (the F key, or the view menu's "Walk from the Great Hall"); then only held keys (W, A, S, D, Shift) and mouse drags move the walker, and its
 * eye is read from the read-only `window.__met.walk` on every frame or two. The routes are src/model/hunt/routes.ts's plan lines, whose segments run
 * along an axis or at 45° to one: facing along an axis, W, S, A or D walks a straight segment and two of them a diagonal one; drags turn the walker.
 * R1: from the plaza spawn up the front steps, through the central doors (level behind them), round the information desk at X 4.3 into the nave,
 * ending on the Great Hall floor. R2: from the Great Hall spawn to the desk, round it, up the Grand Staircase over its landing to the second floor and
 * a few metres into the cross hall, then turned round and back down to the hall floor. R3: from the Great Hall spawn north through the Egyptian
 * galleries and the seam into the Temple of Dendur hall, along its east and north walkways to beside the platform. R4: from the Great Hall spawn south
 * past the desk, through the seam and the Greek galleries into the Leon Levy and Shelby White Court. R5 (work unit 2, M1): from the Great Hall spawn, as
 * R2, up the Grand Staircase, across the cross hall and through its doorway into gallery 600. The walking itself is ./route-walk.ts.
 * Bound: a held key is let go once the eye passes the turn it walks to, early by the walker's coasting distance (src/walk/walker.ts, MOTION); at a
 * corner the walker then comes to rest and, if it coasted on more than 0.25 m (the keys can go up late when the machine is loaded), walks back onto the
 * corner at a walk. It rests 0.8 to 1.5 m past the end of a diagonal last leg (R1's), whose sideways motion builds up late. A leg that makes no
 * progress for 1.5 s fails with where the walker stands. The walk is read at every frame, recorded in the page, and each leg's end and each corner's
 * stop are watched there, so the keys change one round trip after the frame that passes them; the test's own polling slows under load until samples
 * at a run lie metres apart and a stop comes a metre late. Each test's one deadline is its timeout, 120 s times the CPU throttle (MET_CPU_THROTTLE,
 * tests/e2e/helpers.ts `throttle`), as long frames past the page's 0.1 s cap slow the walk against the wall clock. Heights are read where the eye has
 * eased out of the last stair snap. Frames of the doorways,
 * the passages, the stair's landing and each arrival go to each test's output folder for a person to inspect; nothing here judges them.
 */
import { expect, test } from '@playwright/test';

import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { INNER_EAST_Z } from '../../src/model/core/layout.js';
import { CROSS_HALL_BACK_Z, CROSS_HALL_FRONT_Z, EXT_NORTH_X, EXT_SOUTH_X, HALL_WEST_Z, HALL_X, NAVE_MID_Z, SCREEN_Z, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { GALLERY_600_MID_Z, reversed, ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5 } from '../../src/model/hunt/routes.js';
import { STAIR_LANDING_Y } from '../../src/model/hunt/stair.js';
import { ROMAN_COURT } from '../../src/model/mmw/wings.js';
import { DENDUR_FLOOR_Y, PLATFORM, SACKLER_BLOCK } from '../../src/model/roche-north/plan.js';
import { BODY } from '../../src/walk/walker.js';
import { expectWalkingBudget, open, throttle, throttleRate, walkingBudget, watchErrors } from './helpers.js';
import { airborne, between, face, fmt, legs, MINUS_X, MINUS_Z, off, PLUS_X, PLUS_Z, walk, walkFromGreatHall, walking } from './route-walk.js';
import type { Sample, XZ } from './route-walk.js';

/** The passages R3 and R4 take: the seam walls on X +49.4 and −49.7, the map's door from gallery 130 into the Dendur hall, and the court's opening. */
const SEAM_NORTH_X = EXT_NORTH_X;
const SEAM_SOUTH_X = EXT_SOUTH_X;
const DENDUR_DOOR_X = 114.36;
const COURT_DOOR_X = -99.36;
const EYE = BODY.eye;

test.describe('walk routes through real input', () => {
  test.setTimeout(120_000 * throttleRate());
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('R1: from the plaza up the front steps, through the central doors and round the desk onto the Great Hall floor', async ({ page }) => {
    const started = Date.now();
    const f = await open(page, '');
    await throttle(page);
    expect(f.t, 'the finished building').toBe(f.n);
    await page.keyboard.press('KeyF');
    const start = await walking(page);
    expect(await page.evaluate(() => window.__met?.walk.spawn), 'walk mode starts on the plaza').toBe('plaza');
    const samples: Sample[] = [start];
    const end = await walk(page, 'R1', legs(ROUTE_R1.points, MINUS_Z), samples, [
      { name: 'r1-doorway-outside', when: (eye) => eye[2] <= 2.6 },
      { name: 'r1-doorway-inside', when: (eye) => eye[2] <= WALL_BACK_Z + 0.5 },
    ]);
    const report = `R1 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(Math.abs(end.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: eye height off the main floor's`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(Math.abs(end.eye[0]) < HALL_X && end.eye[2] < WALL_BACK_Z && end.eye[2] > HALL_WEST_Z, `${report}: inside the Great Hall`).toBe(true);
    // Through the middle of the central doorway, level behind the doors (past 0.6 m, where the eye has eased out of the three steps), north of the desk.
    const doorway = between(samples, SCREEN_Z + 0.3, SCREEN_Z - 0.3);
    expect(doorway.length, 'samples in the central doorway').toBeGreaterThan(0);
    expect(Math.max(...doorway.map((s) => Math.abs(s.eye[0]))), 'metres off the axis in the doorway').toBeLessThan(0.3);
    const behind = between(samples, SCREEN_Z - 0.6, WALL_BACK_Z - 0.3);
    expect(behind.length, 'samples between the doors and the hall').toBeGreaterThan(0);
    expect(off(behind, MAIN_FLOOR_Y + EYE, 0.1), 'eyes off the main floor between the doors and the hall').toEqual([]);
    const desk = between(samples, NAVE_MID_Z + 0.5, NAVE_MID_Z - 0.5);
    expect(desk.length > 0 && desk.every((s) => s.eye[0] > 3.43), 'past the desk (3.08 m round, on the axis) on its north side').toBe(true);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
  });

  test('R2: from the Great Hall up the Grand Staircase over its landing to the second floor, a few metres on, and back down', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    const samples: Sample[] = [start];
    // Down the nave to beside the desk, turned to face the staircase, round the desk as R1 goes, and up R2.
    const [deskX, besideFrom] = ROUTE_R1.points[2] ?? [0, 0];
    const besideTo = ROUTE_R1.points[3]?.[1] ?? 0;
    expect(spawn.feet[2] < besideFrom && spawn.feet[2] > besideTo, 'the spawn faces the stretch where R1 passes the desk').toBe(true);
    await walk(page, 'R2 to the desk', legs([[spawn.feet[0], spawn.feet[2]], [deskX, spawn.feet[2]]], MINUS_X), samples);
    await face(page, 0);
    const up: XZ[] = [[deskX, spawn.feet[2]], ...ROUTE_R1.points.slice(3), ...ROUTE_R2.points.slice(1)];
    const top = await walk(page, 'R2 up', legs(up, MINUS_Z), samples, [{ name: 'r2-landing', when: (eye) => eye[2] <= (STAIR_MID_FRONT_Z + STAIR_MID_BACK_Z) / 2 }]);
    await page.screenshot({ path: test.info().outputPath('r2-arrival.png') });
    // Heights from 1.4 m past the end of a flight, where the eye has eased out of its snaps (about 0.1 s, src/walk/walker.ts).
    expect(airborne(samples), 'eyes where the walker was off the ground on the way up').toEqual([]);
    const landing = between(samples, STAIR_MID_FRONT_Z - 1.4, STAIR_MID_BACK_Z + 0.5);
    expect(landing.length, 'samples on the landing').toBeGreaterThan(0);
    expect(off(landing, STAIR_LANDING_Y + EYE, 0.05), 'eyes off the landing').toEqual([]);
    const upstairs = between(samples, STAIR_TOP_Z - 2, top.eye[2]);
    expect(off(upstairs, SECOND_FLOOR_Y + EYE, 0.05), 'eyes off the second floor').toEqual([]);
    const zs = upstairs.map((s) => s.eye[2]);
    expect(Math.max(...zs) - Math.min(...zs), 'metres walked on the second floor').toBeGreaterThan(4);
    expect(Math.abs(top.eye[1] - (SECOND_FLOOR_Y + EYE)), `arrival: the eye at ${fmt(top.eye)}`).toBeLessThan(0.03);
    expect(top.onGround).toBe(true);
    // Turned round by drags, back down to the hall floor.
    const round = await face(page, Math.PI);
    expect(round.look[2], 'facing +Z after the turn').toBeGreaterThan(0.99);
    await page.screenshot({ path: test.info().outputPath('r2-arrival-back.png') });
    const down: Sample[] = [];
    const back = await walk(page, 'R2 down', legs(reversed(ROUTE_R2).points, PLUS_Z), down);
    const report = `R2 in ${((Date.now() - started) / 1000).toFixed(1)} s: up to ${fmt(top.eye)}, back to ${fmt(back.eye)}`;
    console.log(report);
    expect(airborne(down), `${report}: eyes where the walker was off the ground on the way down`).toEqual([]);
    expect(Math.abs(back.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: back on the main floor`).toBeLessThan(0.03);
    expect(back.onGround, report).toBe(true);
    expect(back.eye[2] > HALL_WEST_Z && back.eye[2] < WALL_BACK_Z, `${report}: back in the Great Hall`).toBe(true);
  });

  test('R5: from the Great Hall up the Grand Staircase, across the cross hall and through its doorway into gallery 600, and back out', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    const samples: Sample[] = [start];
    // As R2 goes to the stair, then on along the axis through the cross hall's back wall into gallery 600.
    const [deskX] = ROUTE_R1.points[2] ?? [0, 0];
    await walk(page, 'R5 to the desk', legs([[spawn.feet[0], spawn.feet[2]], [deskX, spawn.feet[2]]], MINUS_X), samples);
    await face(page, 0);
    const up: XZ[] = [[deskX, spawn.feet[2]], ...ROUTE_R1.points.slice(3), ...ROUTE_R5.points.slice(1)];
    const end = await walk(page, 'R5', legs(up, MINUS_Z), samples, [{ name: 'r5-doorway', when: (eye) => eye[2] <= CROSS_HALL_BACK_Z + 2.5 }]);
    await page.screenshot({ path: test.info().outputPath('r5-arrival.png') });
    const report = `R5 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    const doorway = between(samples, CROSS_HALL_BACK_Z + 0.5, INNER_EAST_Z - 0.5);
    expect(doorway.length, 'samples in the doorway and its passage').toBeGreaterThan(0);
    expect(off(doorway, SECOND_FLOOR_Y + EYE, 0.05), 'eyes off the second floor in the doorway').toEqual([]);
    expect(Math.abs(end.eye[1] - (SECOND_FLOOR_Y + EYE)), `${report}: on the second floor`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(end.eye[2] < INNER_EAST_Z && end.eye[2] > GALLERY_600_MID_Z - 2.5 && Math.abs(end.eye[0]) < 3, `${report}: in gallery 600`).toBe(true);
    // Turned round, back out through the doorway into the cross hall: no dead end.
    await face(page, Math.PI);
    const out = await walk(page, 'R5 out', legs([[0, GALLERY_600_MID_Z], [0, CROSS_HALL_FRONT_Z - 1.5]], PLUS_Z), samples);
    expect(out.eye[2] > CROSS_HALL_BACK_Z && out.eye[2] < CROSS_HALL_FRONT_Z, `${report}; back in the cross hall at ${fmt(out.eye)}`).toBe(true);
  });

  test('R3: from the Great Hall through the Egyptian galleries into the Temple of Dendur hall, to beside the platform', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    expect(ROUTE_R3.points[0], 'R3 starts at the Great Hall spawn').toEqual([spawn.feet[0], spawn.feet[2]]);
    const samples: Sample[] = [start];
    // Turned north by drags, through the galleries to the hall's east walkway, then turned west down the north walkway by the glass.
    await face(page, -Math.PI / 2);
    await walk(page, 'R3 to the Dendur hall', legs(ROUTE_R3.points.slice(0, 9), PLUS_X), samples, [
      { name: 'r3-seam-north', when: (eye) => eye[0] >= SEAM_NORTH_X - 6.5 },
      { name: 'r3-dendur-door', when: (eye) => eye[0] >= DENDUR_DOOR_X - 4 && eye[2] < -35 },
    ]);
    await face(page, 0);
    await page.screenshot({ path: test.info().outputPath('r3-dendur-walkway.png') });
    const end = await walk(page, 'R3 along the north walkway', legs(ROUTE_R3.points.slice(8), MINUS_Z), samples);
    await page.screenshot({ path: test.info().outputPath('r3-arrival.png') });
    const report = `R3 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    const seam = samples.filter((s) => s.eye[0] >= SEAM_NORTH_X - 1.2 && s.eye[0] <= SEAM_NORTH_X);
    expect(seam.length, 'samples in the north seam wall').toBeGreaterThan(0);
    expect(off(seam, MAIN_FLOOR_Y + EYE, 0.05), 'eyes off the main floor in the seam wall').toEqual([]);
    expect(Math.abs(end.eye[1] - (DENDUR_FLOOR_Y + EYE)), `${report}: on the Dendur walkway`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    expect(end.eye[0] > SACKLER_BLOCK.minX && end.eye[2] < SACKLER_BLOCK.maxZ, `${report}: inside the Sackler Wing`).toBe(true);
    expect(end.eye[0] - PLATFORM.maxX < 4 && end.eye[2] < PLATFORM.maxZ, `${report}: beside the platform`).toBe(true);
    // The frame budget walking on along the walkway with the look target on, in the glazed hall round the temple (unthrottled only: it is this machine's).
    if (throttleRate() === 1) expectWalkingBudget(await walkingBudget(page), 'in the Temple of Dendur hall');
  });

  test('R4: from the Great Hall past the desk through the Greek galleries into the Leon Levy and Shelby White Court', async ({ page }) => {
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    expect(ROUTE_R4.points[0], 'R4 starts at the Great Hall spawn').toEqual([spawn.feet[0], spawn.feet[2]]);
    const samples: Sample[] = [start];
    // The spawn faces south (−X), the way R4 goes.
    const end = await walk(page, 'R4', legs(ROUTE_R4.points, MINUS_X), samples, [
      { name: 'r4-seam-south', when: (eye) => eye[0] <= SEAM_SOUTH_X + 7 },
      { name: 'r4-court-door', when: (eye) => eye[0] <= COURT_DOOR_X + 4 },
    ]);
    await page.screenshot({ path: test.info().outputPath('r4-arrival.png') });
    const report = `R4 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end.eye)}`;
    console.log(report);
    expect(airborne(samples), 'eyes where the walker was off the ground').toEqual([]);
    const seam = samples.filter((s) => s.eye[0] >= SEAM_SOUTH_X && s.eye[0] <= SEAM_SOUTH_X + 1.2);
    expect(seam.length, 'samples in the south seam wall').toBeGreaterThan(0);
    expect(off(seam, MAIN_FLOOR_Y + EYE, 0.05), 'eyes off the main floor in the seam wall').toEqual([]);
    const [x0, z0, x1, z1] = ROMAN_COURT;
    expect(end.eye[0] > x0 && end.eye[0] < x1 && end.eye[2] > z0 && end.eye[2] < z1, `${report}: inside the court`).toBe(true);
    expect(Math.abs(end.eye[1] - (ROUTE_R4.endY + EYE)), `${report}: on the court's floor`).toBeLessThan(0.03);
    expect(end.onGround, report).toBe(true);
    // The frame budget walking on into the court with the look target on (unthrottled only: it is this machine's).
    if (throttleRate() === 1) expectWalkingBudget(await walkingBudget(page), 'in the Leon Levy and Shelby White Court');
  });
});
