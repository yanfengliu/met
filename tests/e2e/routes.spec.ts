/**
 * The public routes of src/model/hunt/routes.ts walked both ways through real input on the finished building, with the doors, passages, pool, dais and
 * artworks on their way (docs/design/spec.md, Walk mode and Doors; work unit 2, integration). Walk mode is entered as a visitor enters it (the F key, or
 * the view menu's "Walk from the Great Hall"); then only held keys (W, A, S, D, Shift) and mouse drags move and turn the walker, E uses the door it looks
 * at, and its eye is read from the read-only `window.__met.walk` at every frame (./route-walk.ts). Three walks, each on one page from one entry:
 * - R1, R2 and R5 out and back: from the plaza spawn up the front steps on the axis, straight at the central arch's middle door, closed and solid,
 *   whose prompt says "E Open" from 1.9 m out and which holds the walker a body's radius before its leaves while W stays held at a walk; E, looking
 *   straight on, swings it into the building; through it, and from the entrance bay, clear of the leaves' sweep, turned back onto an open leaf, "E
 *   Close" and E shuts it behind; round Roche's desk on R1 to the nave's west side and on as R5 goes, up the Grand Staircase on R2's line over its
 *   landing and across the cross hall through its doorway into gallery 600, where Tiepolo's Triumph of Marius's card shows; turned round, back out
 *   through the doorway, down the stair and up the nave to the hall's east end, then on at a walk straight at the shut door until its leaves hold the
 *   walker: "E Open" from 1.9 m out, and E swings it out toward the plaza, away from the walker; out through it, and from before it, clear of the
 *   sweep, onto an open leaf, "E Close" and E shuts it behind; down the front steps to R1's start. At every frame drawn the card and the door prompt never both show, each only with its own kind of look
 *   target, with frames of the prompt alone before and after the card and of the card alone (review 7, F30).
 * - R3, the Temple of Dendur hall and R6 out and back: R3 from the Great Hall spawn to beside the platform; up the north side flight onto the platform,
 *   then aimed by drags and at a walk toward the Sphinx of Hatshepsut until its card shows within 6 m, and turned away until it goes; onto the terrace,
 *   up the dais's north flight onto the forecourt, into the gate's passage on the forecourt's level and back, across the forecourt and down its south
 *   flight; on the gate's axis from the terrace into the rail before its riser, which holds the walker on the terrace; down the side flight to the
 *   walkway; R3 back, stepping on the way into the pool's north arm, down one step onto its floor, and out again; where R6 leaves R3, R6 through the
 *   Arms and Armor galleries and the passage from gallery 374 into the Engelhard Court; at a walk toward Ruth Gleaning until its card shows, and turned
 *   away; R6 back, and the way the two share back to the spawn.
 * - R4 and R7 out and back, with Weston's door: R4 from the Great Hall spawn into the Leon Levy and Shelby White Court; R4 back to gallery 153's south
 *   door; R7 through it, Exhibition Gallery 199, the corridor through the party wall into gallery 549 and the court wall's opening into the Petrie Court,
 *   to Weston's door's axis; walked straight at, the door, closed and solid, shows "E Open" from 1.9 m out and holds the walker before its leaves, and
 *   E swings it into wing B; through it into gallery 529, and there, clear of the sweep, onto an open leaf, "E Close" and E shuts it, then straight at
 *   it, "E Open" and E swings it open again toward the walker, the one way it opens; back through it into the court; R7 back to gallery 153; and the
 *   way the two share back to the spawn.
 * At the ends of R3 and R4, unthrottled, the walking frame budget is measured walking on and then running back.
 * Bound: a held key is let go once the eye passes the turn it walks to, early by what the walker covers after: its coast (src/walk/walker.ts, MOTION) and
 * its speed times the release lag learnt in the page (./route-keys.ts); at a corner it comes to rest within 0.25 m of it along its stopping axis, walking onto it at a walk, or
 * fails. A leg making no progress for 1.5 s fails with where the walker stands; legs' ends and corners' stops are watched in the page at every frame. A
 * door is used from where its leaf, open or shut, lies within 1.8 m and the body clear of its sweep (./route-places.ts `standOff`), or held at its closed
 * leaves, walked at at a walk, so with frames capped at 0.1 s the frames within the prompt's 1.9 m number at least 7 under any load. Each test's one
 * deadline is its timeout, times the CPU throttle (MET_CPU_THROTTLE, tests/e2e/helpers.ts `throttle`), as long frames past the page's 0.1 s cap slow the
 * walk against the wall clock. Heights are read where the eye has eased out of the last stair snap. On the Dendur forecourt the walker walks, its stop coasting 0.14 m
 * to a run's 0.35 m, as the south flight lies 0.76 m in from the dais's 0.79 m side (at 4× a run's late stop walked off it). Doors' leaves come from the
 * finished model built in the test's process (./route-places.ts); Weston's raised panels stand 18 mm proud of their stiles, so a walker held where it
 * meets one stands that much farther out. Artworks' boxes come from the collection's placements (./labels-helpers.ts). Frames of the doorways,
 * passages, the stair's landing and each arrival go to each test's output folder for a person to inspect; nothing here judges them.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { INNER_EAST_Z } from '../../src/model/core/layout.js';
import { CROSS_HALL_BACK_Z, EXT_NORTH_X, EXT_SOUTH_X, HALL_WEST_Z, HALL_X, NAVE_MID_Z, SCREEN_Z, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { COURT_OPENING_Z, GALLERY_600_MID_Z, reversed, ROUTE_R1, ROUTE_R3, ROUTE_R4, ROUTE_R5, ROUTE_R6, ROUTE_R7, WESTON_APPROACH } from '../../src/model/hunt/routes.js';
import { STAIR_LANDING_Y } from '../../src/model/hunt/stair.js';
import { MORGAN, PARTY_WALL } from '../../src/model/mmw/dims.js';
import { ENGELHARD_PASSAGE, PETRIE_PASSAGE } from '../../src/model/mmw/party-walls.js';
import { ROMAN_COURT } from '../../src/model/mmw/wings.js';
import { COURT, DAIS, DAIS_STEPS, DENDUR_FLOOR_Y, GATE_RAIL, GATE_SLABS, GATE_THRESHOLD, PLATFORM, PLATFORM_Y, POOL, POOL_FLOOR_Y, SACKLER_BLOCK, TEMPLE_AXIS_X, TERRACE } from '../../src/model/roche-north/plan.js';
import { COURT_WALL, COURT_X0 } from '../../src/model/roche-south/kravis.js';
import { BODY } from '../../src/walk/walker.js';
import { expectWalkingBudget, open, throttle, throttleRate, walkingBudget, watchErrors } from './helpers.js';
import { TRIUMPH } from './labels-helpers.js';
import { approach, clearOfSwing, doorPlan, leafPoint, lineUp, promptOnApproach, screenMark, screens, screensSince, standOff, watchScreens } from './route-places.js';
import type { Screen } from './route-places.js';
import { airborne, along, between, doorFacts, doorIs, entranceLeaves, face, fmt, into, legs, looksAt, MIDDLE_DOOR, MINUS_X, MINUS_Z, off, PLUS_X, PLUS_Z, toward, walk, walkFromGreatHall, walking } from './route-walk.js';
import type { Facing, Sample, XZ } from './route-walk.js';

const EYE = BODY.eye;
/** The passages R3 and R4 take: the seam walls on X +49.4 and −49.7, the map's door from gallery 130 into the Dendur hall, and the court's opening. */
const SEAM_NORTH_X = EXT_NORTH_X;
const SEAM_SOUTH_X = EXT_SOUTH_X;
const DENDUR_DOOR_X = 114.36;
const COURT_DOOR_X = -99.36;
/** Where R1 comes back into the Great Hall's east end on its way out, before it walks on at the door: 0.4 m inside the hall's east wall, on the axis. */
const BAY_Z = WALL_BACK_Z - 0.4;
/** R3's north walkway by the glass (its last leg's line), and the line 3.5 m in from the end of the platform's north side flight (Z −86.98..−68.54). */
const WALKWAY_X = ROUTE_R3.points.at(-1)?.[0] ?? 150.3;
const FLIGHT_Z = -72;
/** On the platform between the gate slabs' north end and the terrace's north return, the way onto the terrace; the terrace's line 2.84 m off the slabs. */
const STRIP_X = (GATE_SLABS.maxX + TERRACE.returnNorthX) / 2;
const TERRACE_Z = GATE_SLABS.maxZ + 2.84;
/** The dais's short flights at the gate's two ends, the forecourt's line 1.5 m past their heads, and the middle of the gate's passage. */
const NORTH_FLIGHT_X = DAIS.maxX - DAIS_STEPS.width / 2;
const SOUTH_FLIGHT_X = DAIS.minX + DAIS_STEPS.width / 2;
const FORECOURT_Z = DAIS_STEPS.minZ - 1.5;
const PASSAGE_Z = (GATE_THRESHOLD.minZ + GATE_THRESHOLD.maxZ) / 2;
/** The middle of the pool's north arm, between the terrace's coping and the north walkway. */
const POOL_X = (POOL.armNorthMinX + POOL.maxX) / 2;
const POOL_Z = (POOL.armMinZ + POOL.basinMinZ) / 2;
/** Where R6 leaves R3 (R6's fourth point, on R3's leg east through gallery 101), R6's end, and where R7 leaves R4 (gallery 153's south door). */
const JUNCTION: XZ = ROUTE_R6.points[3] ?? [50.18, -6.335];
const R6_END: XZ = ROUTE_R6.points.at(-1) ?? [72, -110];
const DOOR_153: XZ = ROUTE_R7.points[5] ?? [-67.325, NAVE_MID_Z];
/** The artworks approached: the Sphinx of Hatshepsut on the Dendur terrace, and Saint-Gaudens's Ruth Gleaning in the Engelhard Court (src/model/collection/spaces-a.ts). */
const SPHINX = 544442;
const RUTH = 11952;
/** The yaw that faces the level direction `d` (src/walk/walker.ts: yaw 0 faces −Z), and that direction reversed. */
const yawFor = (d: Facing): number => Math.atan2(-d[0], -d[1]);
const reverse = (d: Facing): Facing => [-d[0], -d[1]];
/** Samples whose eye lies between `x0` and `x1` in X. */
const acrossX = (samples: readonly Sample[], x0: number, x1: number): Sample[] => samples.filter((s) => s.eye[0] >= Math.min(x0, x1) && s.eye[0] <= Math.max(x0, x1));

test.describe('walk routes both ways through real input', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('R1, R2 and R5 out and back: through the closed central door, up the Grand Staircase into gallery 600, and back out onto the plaza, the door opened by E and shut behind both ways; the card and the prompt never at once', async ({ page }) => {
    test.setTimeout(240_000 * throttleRate());
    const started = Date.now();
    const f = await open(page, '');
    await throttle(page);
    expect(f.t, 'the finished building').toBe(f.n);
    expect(f.doors.find((d) => d.id === MIDDLE_DOOR), 'the middle door at load').toMatchObject({ state: 'closed', angle: 0, built: true });
    await page.keyboard.press('KeyF');
    const start = await walking(page);
    expect(await page.evaluate(() => window.__met?.walk.spawn), 'walk mode starts on the plaza').toBe('plaza');
    await watchScreens(page);
    const door = entranceLeaves();
    const plan = doorPlan(MIDDLE_DOOR);
    const inward: Sample[] = [start];
    // R1 in: up the front steps on the axis at a run to 2 m before the doors, then at a walk straight at the middle door's meeting stiles: its leaves hold it.
    await walk(page, 'R1 to the doors', legs([...ROUTE_R1.points.slice(0, 1), [0, door.front + 2]], MINUS_Z), inward, [{ name: 'r1-doorway-outside', z: [null, 2.6] }]);
    const toDoor = await screenMark(page);
    const stopped = await into(page, ['KeyW'], MINUS_Z, -(door.front + BODY.radius + 0.1), inward, 10_000 * throttleRate());
    // Walking straight at the closed door, from 1.9 m out until its leaves hold the walker, its prompt says "E Open" (final review, F46).
    const coming = promptOnApproach(await screensSince(page, toDoor), plan, 'front', 'E Open');
    expect(coming.near, 'frames walking at the closed door within 1.9 m of its leaves').toBeGreaterThan(5);
    expect(coming.apart.slice(0, 5), `frames walking straight at the closed door with no "E Open" (${String(coming.apart.length)} of ${String(coming.near)})`).toEqual([]);
    const stop = door.front + BODY.radius;
    expect(Math.abs(stopped.eye[2] - stop), `held at ${fmt(stopped.eye)} by the closed leaves, their front face at Z ${door.front.toFixed(3)}, a body's radius before it Z ${stop.toFixed(3)}`).toBeLessThan(0.01);
    // Pushed on the pair's 8 mm gap, the body slides a few centimetres along the leaves before it rests (4.8 cm here), as along any wall it pushes on.
    expect(Math.abs(stopped.eye[0]), `held before the middle of the pair at ${fmt(stopped.eye)}`).toBeLessThan(0.1);
    expect(await doorFacts(page, MIDDLE_DOOR), 'the door that held it').toMatchObject({ state: 'closed', angle: 0 });
    await page.screenshot({ path: test.info().outputPath('r1-door-held.png') });
    // Still looking straight ahead: "E Open", and E opens the door.
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn into the building, away from the walker').toBe(90);
    // Into the entrance bay, clear of the leaves' swing with a leaf, open or shut, in reach; turned back onto the open right leaf: E shuts the door.
    await face(page, 0);
    const bayIn = await walk(page, 'R1 through the doorway', legs([[0, stopped.eye[2]], standOff(plan, 'back')], MINUS_Z), inward);
    await page.screenshot({ path: test.info().outputPath('r1-doorway-inside.png') });
    expect(clearOfSwing(bayIn.eye, plan), `metres the body at ${fmt(bayIn.eye)} keeps clear of all the leaves sweep (${plan.reach.toFixed(3)} m about each hinge)`).toBeGreaterThan(0);
    await face(page, toward(bayIn.eye, 0.62, door.back - 0.3));
    await looksAt(page, MIDDLE_DOOR, 'E Close');
    await page.keyboard.press('KeyE');
    expect(await doorIs(page, MIDDLE_DOOR, 'closed'), 'shut behind the walker').toMatchObject({ state: 'closed', angle: 0 });
    await page.screenshot({ path: test.info().outputPath('r1-door-shut.png') });
    // Turned into the hall again, on along R1 down the nave and round the desk to the nave's west side, where it stops, and on as R5 goes (R2's line):
    // up the Grand Staircase over its landing, across the cross hall and through its doorway into gallery 600, facing the Triumph of Marius.
    await face(page, 0);
    const top = await walk(page, 'R1 and R5', legs([[0, bayIn.eye[2]], ...ROUTE_R1.points.slice(1), ...ROUTE_R5.points.slice(1)], MINUS_Z), inward, [
      { name: 'r2-landing', z: [null, (STAIR_MID_FRONT_Z + STAIR_MID_BACK_Z) / 2] },
      { name: 'r5-doorway', z: [null, CROSS_HALL_BACK_Z + 2.5] },
    ]);
    await page.waitForFunction((id) => window.__met?.label?.id === id, String(TRIUMPH), { polling: 'raf', timeout: 5000 * throttleRate() });
    await page.screenshot({ path: test.info().outputPath('r5-arrival.png') });
    const nave = ROUTE_R5.points[0] ?? [0, -24.7];
    const r1 = `R1 in ${((Date.now() - started) / 1000).toFixed(1)} s, held by the closed door at ${fmt(stopped.eye)}, R5 to ${fmt(top.eye)}`;
    console.log(r1);
    expectThroughTheDoorway(inward, 'R1 in');
    const west = between(inward, nave[1] + 0.5, HALL_WEST_Z + 0.5).filter((s) => Math.abs(s.eye[0]) < 3);
    expect(west.length, `${r1}: samples from the nave's west side, where R1 ends and R2 and R5 begin, to the hall's west end`).toBeGreaterThan(0);
    expect(off(west, MAIN_FLOOR_Y + EYE, 0.03), `${r1}: eyes off the Great Hall's floor at the nave's west side`).toEqual([]);
    // Heights from 1.4 m past the end of a flight, where the eye has eased out of its snaps (about 0.1 s, src/walk/walker.ts).
    expect(off(between(inward, STAIR_MID_FRONT_Z - 1.4, STAIR_MID_BACK_Z + 0.5), STAIR_LANDING_Y + EYE, 0.05), `${r1}: eyes off the landing`).toEqual([]);
    expect(off(between(inward, STAIR_TOP_Z - 2, top.eye[2]), SECOND_FLOOR_Y + EYE, 0.05), `${r1}: eyes off the second floor, the cross hall's doorway and its passage`).toEqual([]);
    expect(between(inward, CROSS_HALL_BACK_Z + 0.5, INNER_EAST_Z - 0.5).length, `${r1}: samples in the doorway and its passage`).toBeGreaterThan(0);
    expect(Math.abs(top.eye[1] - (SECOND_FLOOR_Y + EYE)), `${r1}: on the second floor`).toBeLessThan(0.03);
    expect(top.eye[2] < INNER_EAST_Z && top.eye[2] > GALLERY_600_MID_Z - 2.5 && Math.abs(top.eye[0]) < 3, `${r1}: in gallery 600`).toBe(true);
    // R5 and R2 back, then R1 back: turned round by drags, out through the doorway, down the stair, round the desk and up the nave to the entrance bay.
    await face(page, Math.PI);
    const outward: Sample[] = [];
    const fromHall = await screenMark(page);
    const bay = await walk(page, 'R5 and R1 back', legs([...reversed(ROUTE_R5).points, ...reversed(ROUTE_R1).points.slice(1, -1), [0, BAY_Z]], PLUS_Z), outward, [{ name: 'r5-doorway-back', z: [INNER_EAST_Z + 0.5, null] }]);
    const r5back = `R5 back from gallery 600 and R1 back to ${fmt(bay.eye)}`;
    expect(off(between(outward, GALLERY_600_MID_Z, STAIR_TOP_Z - 0.5), SECOND_FLOOR_Y + EYE, 0.05), `${r5back}: eyes off the second floor, the doorway and the cross hall`).toEqual([]);
    expect(between(outward, CROSS_HALL_BACK_Z + 0.5, INNER_EAST_Z - 0.5).length, `${r5back}: samples in the doorway and its passage`).toBeGreaterThan(0);
    expect(off(between(outward, STAIR_MID_BACK_Z + 1.4, STAIR_MID_FRONT_Z - 0.5), STAIR_LANDING_Y + EYE, 0.05), `${r5back}: eyes off the landing`).toEqual([]);
    expect(off(between(outward, HALL_WEST_Z, nave[1] + 0.5), MAIN_FLOOR_Y + EYE, 0.05), `${r5back}: eyes off the Great Hall's floor from the stair's foot to the nave's west side`).toEqual([]);
    expectInTheHall(bay, r5back);
    // Still shut as it came up the nave; on at a walk straight at it until its leaves hold the walker: "E Open" from 1.9 m out, and E, every time,
    // swings it out toward the plaza, away from the walker (review 20, F54: a door found open was taken as it stood).
    expect(await doorFacts(page, MIDDLE_DOOR), 'still shut as the walker comes back to it').toMatchObject({ state: 'closed', angle: 0 });
    const atDoor = await into(page, ['KeyW'], PLUS_Z, door.back - BODY.radius - 0.1, outward, 10_000 * throttleRate());
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    const going = promptOnApproach(await screensSince(page, fromHall), plan, 'back', 'E Open');
    expect(going.near, 'frames walking up the nave at the closed door within 1.9 m of its leaves').toBeGreaterThan(5);
    expect(going.apart.slice(0, 5), `frames walking up the nave at the closed door with no "E Open" (${String(going.apart.length)} of ${String(going.near)})`).toEqual([]);
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn out toward the plaza, away from the walker inside').toBe(-90);
    // Out through the doorway to before it, clear of the leaves' sweep; turned back onto the open right leaf: "E Close", and E shuts it behind.
    await face(page, Math.PI);
    const outside = await walk(page, 'R1 back through the doorway', legs([[0, atDoor.eye[2]], standOff(plan, 'front')], PLUS_Z), outward);
    await page.screenshot({ path: test.info().outputPath('r1-back-doorway-outside.png') });
    expect(clearOfSwing(outside.eye, plan), `metres the body at ${fmt(outside.eye)} keeps clear of all the leaves sweep`).toBeGreaterThan(0);
    await face(page, toward(outside.eye, ...leafPoint(plan, 'open', 'front')));
    await looksAt(page, MIDDLE_DOOR, 'E Close');
    await page.keyboard.press('KeyE');
    expect(await doorIs(page, MIDDLE_DOOR, 'closed'), 'shut behind the walker, from the plaza side').toMatchObject({ state: 'closed', angle: 0 });
    await face(page, Math.PI); // turned to the plaza again, down the front steps to where R1 began
    const plaza0 = ROUTE_R1.points[0] ?? [0, 25];
    const plaza = await walk(page, 'R1 back onto the plaza', legs([lineUp(outside, plaza0), plaza0], PLUS_Z), outward);
    await page.screenshot({ path: test.info().outputPath('r1-back-arrival.png') });
    const r1back = `R1 back to ${fmt(plaza.eye)}; the walk in ${((Date.now() - started) / 1000).toFixed(1)} s`;
    console.log(r1back);
    expect(Math.abs(plaza.eye[1] - (ROUTE_R1.startY + EYE)), `${r1back}: eye height off the plaza's at R1's start`).toBeLessThan(0.03);
    expect(plaza.onGround, r1back).toBe(true);
    expect(Math.hypot(plaza.eye[0] - plaza0[0], plaza.eye[2] - plaza0[1]), `${r1back}: metres from R1's start`).toBeLessThan(1);
    expectThroughTheDoorway(outward, 'R1 back');
    // At every frame drawn, the card and the door prompt never both showed, each only with its own kind of look target (review 7, F30).
    const all = await screens(page, true);
    const both = all.flatMap((s, i) => (s.card && s.prompt ? [`frame ${String(i)}: the card and the prompt "${s.words}" both show, target ${String(s.kind)}`] : []));
    expect(both.slice(0, 5), `frames where the card and the door prompt both show (${String(both.length)})`).toEqual([]);
    const promptOnly = (s: Screen): boolean => s.prompt && !s.card;
    const firstCard = all.findIndex((s) => s.card);
    const lastCard = all.length - 1 - [...all].reverse().findIndex((s) => s.card);
    console.log(`the card and the prompt: ${String(all.length)} frames; the prompt alone in ${String(all.slice(0, firstCard).filter(promptOnly).length)} before the card and ${String(all.slice(lastCard + 1).filter(promptOnly).length)} after it, the card alone in ${String(all.filter((s) => s.card && !s.prompt).length)}`);
    expect(firstCard, 'the card shows in gallery 600').toBeGreaterThan(-1);
    expect(all.slice(0, firstCard).some(promptOnly), 'frames with the prompt and no card before the card').toBe(true);
    expect(all.slice(lastCard + 1).some(promptOnly), 'frames with the prompt and no card after the card').toBe(true);
    expect(all.some((s) => s.card && !s.prompt), 'frames with the card and no prompt').toBe(true);
    expect(all.filter((s) => s.prompt).every((s) => s.kind === 'door' && /^E (Open|Close)$/.test(s.words)), 'the prompt only with a door under the crosshair, saying E Open or E Close').toBe(true);
    expect(all.filter((s) => s.card).every((s) => s.kind === 'artwork'), 'the card only with an artwork under the crosshair').toBe(true);
  });

  test('R3, the Temple of Dendur hall and R6 out and back: the pool stepped into and out of, the dais crossed by its flights, the gate entered from the forecourt and its rail met from the terrace, two artworks approached', async ({ page }) => {
    test.setTimeout(600_000 * throttleRate()); // 210 s here unthrottled (verify, 2026-10-27; 276 s on a loaded machine), 8.5 to 10.6 min at 4×
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    const home0: XZ = [spawn.feet[0], spawn.feet[2]];
    expect([ROUTE_R3.points[0], ROUTE_R6.points[0]], 'R3 and R6 start at the Great Hall spawn').toEqual([home0, home0]);
    const samples: Sample[] = [start];
    // R3 out: turned north by drags, through the galleries to the hall's east walkway, then turned west down the north walkway by the glass.
    await face(page, -Math.PI / 2);
    await walk(page, 'R3 to the Dendur hall', legs(ROUTE_R3.points.slice(0, 9), PLUS_X), samples, [
      { name: 'r3-seam-north', x: [SEAM_NORTH_X - 6.5, null] },
      { name: 'r3-dendur-door', x: [DENDUR_DOOR_X - 4, null], z: [null, -35] },
    ]);
    await face(page, 0);
    await page.screenshot({ path: test.info().outputPath('r3-dendur-walkway.png') });
    const end3 = await walk(page, 'R3 along the north walkway', legs(ROUTE_R3.points.slice(8), MINUS_Z), samples);
    await page.screenshot({ path: test.info().outputPath('r3-arrival.png') });
    const r3 = `R3 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end3.eye)}`;
    console.log(r3);
    expectOnTheMainFloor(acrossX(samples, SEAM_NORTH_X - 1.2, SEAM_NORTH_X), `${r3}: the north seam wall`);
    expect(Math.abs(end3.eye[1] - (DENDUR_FLOOR_Y + EYE)), `${r3}: on the Dendur walkway`).toBeLessThan(0.03);
    expect(end3.onGround, r3).toBe(true);
    expect(end3.eye[0] > SACKLER_BLOCK.minX && end3.eye[2] < SACKLER_BLOCK.maxZ && end3.eye[0] - PLATFORM.maxX < 4 && end3.eye[2] < PLATFORM.maxZ, `${r3}: in the Sackler Wing beside the platform`).toBe(true);
    // The frame budget with the look target on, in the glazed hall, walking on along the walkway and running back (unthrottled only: it is this machine's).
    if (throttleRate() === 1) {
      expectWalkingBudget(await walkingBudget(page), 'in the Temple of Dendur hall');
      await face(page, Math.PI);
      expectWalkingBudget(await walkingBudget(page, true), 'in the Temple of Dendur hall, at a run');
    }
    await dendurHall(page, samples);
    // R3 back, facing south: up the north walkway with a step into the pool's north arm and out again, then the way R3 came, to where R6 leaves it.
    await face(page, Math.PI / 2);
    const pool: Sample[] = [];
    await walk(page, 'into the pool and out', legs([[WALKWAY_X, FLIGHT_Z], [WALKWAY_X, POOL_Z], [POOL_X, POOL_Z], [WALKWAY_X, POOL_Z]], MINUS_X), pool, [{ name: 'dendur-pool', x: [null, POOL_X + 0.3] }]);
    // The water begins inside a 0.3 m kerb at the walkway's level (src/model/roche-north/sackler.ts). Past it the feet step down onto the pool's floor
    // at once and the eye eases after them over about 0.1 s, half a metre at a run, so its height is read where the walker stops in the arm.
    const inPool = pool.filter((s) => s.eye[0] < POOL.maxX - 0.3 - BODY.radius);
    expect(inPool.length, 'samples with the body over the pool’s water').toBeGreaterThan(0);
    const deepest = inPool.reduce((a, b) => (b.eye[0] < a.eye[0] ? b : a));
    expect(Math.abs(deepest.eye[1] - (POOL_FLOOR_Y + EYE)), `stopped in the pool’s north arm at ${fmt(deepest.eye)}: metres off the eye over its floor, a step under the walkway`).toBeLessThan(0.02);
    expect(Math.min(...inPool.map((s) => s.eye[1])) - (POOL_FLOOR_Y + EYE), 'metres the eye came over the pool floor’s level, never under it').toBeGreaterThan(-0.02);
    expect(off(pool.slice(-5), DENDUR_FLOOR_Y + EYE, 0.03), 'eyes off the walkway once out of the pool').toEqual([]);
    samples.push(...pool);
    const turn = await walk(page, 'R3 back to where R6 leaves it', legs([[WALKWAY_X, POOL_Z], ...reversed(ROUTE_R3).points.slice(1, 7), JUNCTION], MINUS_X), samples);
    expect(Math.abs(turn.eye[1] - (MAIN_FLOOR_Y + EYE)), `R3 back to ${fmt(turn.eye)}: on the main floor`).toBeLessThan(0.03);
    // R6 out from there, facing west: through the Arms and Armor galleries and the passage from gallery 374 into the Engelhard Court.
    await face(page, 0);
    const wall = MORGAN.z0 + PARTY_WALL;
    const out6: Sample[] = [];
    const end6 = await walk(page, 'R6 into the Engelhard Court', legs([JUNCTION, ...ROUTE_R6.points.slice(4)], MINUS_Z), out6, [{ name: 'r6-passage', x: [ENGELHARD_PASSAGE.a - 2, null], z: [null, wall + 2.5] }]);
    await page.screenshot({ path: test.info().outputPath('r6-arrival.png') });
    const r6 = `R6 to ${fmt(end6.eye)}`;
    expectThroughThePassage(out6, r6);
    expect(end6.eye[0] > COURT.minX && end6.eye[0] < COURT.maxX && end6.eye[2] > COURT.minZ && end6.eye[2] < COURT.maxZ, `${r6}: inside the court`).toBe(true);
    expect(Math.abs(end6.eye[1] - (ROUTE_R6.endY + EYE)), `${r6}: on the court's floor`).toBeLessThan(0.03);
    samples.push(...out6);
    // Ruth Gleaning, 8 m east of R6's end: approached until its card shows, and turned away from, facing west; then back to R6's end.
    await approach(page, RUTH, 0, 'the Engelhard Court', samples);
    await walk(page, 'back to R6’s end', legs([lineUp(await walking(page), R6_END), R6_END], MINUS_Z), samples);
    // R6 back, facing east, and on the way R3 and R6 share back to the Great Hall spawn.
    await face(page, Math.PI);
    const back6: Sample[] = [];
    const at6 = await walk(page, 'R6 back', legs(reversed(ROUTE_R6).points.slice(0, -3), PLUS_Z), back6);
    expectThroughThePassage(back6, `R6 back to ${fmt(at6.eye)}`);
    samples.push(...back6);
    await face(page, Math.PI / 2);
    const shared: Sample[] = [];
    const home = await walk(page, 'R3 and R6 back to the spawn', legs(reversed(ROUTE_R6).points.slice(-4), MINUS_X), shared);
    const report = `R3, the Dendur hall and R6 out and back in ${((Date.now() - started) / 1000).toFixed(1)} s, ending at ${fmt(home.eye)}`;
    console.log(report);
    expectOnTheMainFloor(acrossX(shared, SEAM_NORTH_X - 1.2, SEAM_NORTH_X), `${report}: the north seam wall, back`);
    samples.push(...shared);
    expect(Math.abs(home.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: on the main floor`).toBeLessThan(0.03);
    expect(Math.hypot(home.eye[0] - home0[0], home.eye[2] - home0[1]), `${report}: metres from the Great Hall spawn`).toBeLessThan(1);
    expect(airborne(samples), `${report}: eyes where the walker was off the ground`).toEqual([]);
  });

  test('R4 and R7 out and back: into the Leon Levy and Shelby White Court, and through Exhibition Gallery 199 and the corridor into the Petrie Court and through Weston’s door both ways, opened by E', async ({ page }) => {
    test.setTimeout(420_000 * throttleRate()); // 124 to 138 s here unthrottled (verify, 2026-10-27), about 5 min at 4×
    const started = Date.now();
    const { start, spawn } = await walkFromGreatHall(page);
    const home0: XZ = [spawn.feet[0], spawn.feet[2]];
    expect(ROUTE_R4.points[0], 'R4 starts at the Great Hall spawn').toEqual(home0);
    expect(ROUTE_R7.points.slice(0, 5), 'R7 starts as R4 goes').toEqual(ROUTE_R4.points.slice(0, 5));
    expect(await doorFacts(page, 'weston'), 'Weston’s door at load').toMatchObject({ state: 'closed', angle: 0, locked: false, built: true });
    const samples: Sample[] = [start];
    // R4 out: the spawn faces south (−X), the way R4 goes.
    const end4 = await walk(page, 'R4', legs(ROUTE_R4.points, MINUS_X), samples, [
      { name: 'r4-seam-south', x: [null, SEAM_SOUTH_X + 7] },
      { name: 'r4-court-door', x: [null, COURT_DOOR_X + 4] },
    ]);
    await page.screenshot({ path: test.info().outputPath('r4-arrival.png') });
    const r4 = `R4 in ${((Date.now() - started) / 1000).toFixed(1)} s, ending with the eye at ${fmt(end4.eye)}`;
    console.log(r4);
    expectOnTheMainFloor(acrossX(samples, SEAM_SOUTH_X, SEAM_SOUTH_X + 1.2), `${r4}: the south seam wall`);
    const [x0, z0, x1, z1] = ROMAN_COURT;
    expect(end4.eye[0] > x0 && end4.eye[0] < x1 && end4.eye[2] > z0 && end4.eye[2] < z1, `${r4}: inside the court`).toBe(true);
    expect(Math.abs(end4.eye[1] - (ROUTE_R4.endY + EYE)), `${r4}: on the court's floor`).toBeLessThan(0.03);
    // The frame budget with the look target on, walking on into the court and then running back east, clear of its basin (unthrottled only).
    if (throttleRate() === 1) {
      expectWalkingBudget(await walkingBudget(page), 'in the Leon Levy and Shelby White Court');
      await face(page, -Math.PI / 2);
      expectWalkingBudget(await walkingBudget(page, true), 'in the Leon Levy and Shelby White Court, at a run');
    }
    // R4 back, facing north, to gallery 153's south door, where R7 leaves it.
    await face(page, -Math.PI / 2);
    await walk(page, 'R4 back to gallery 153’s south door', legs([lineUp(await walking(page), DOOR_153), DOOR_153], PLUS_X), samples, [{ name: 'r4-court-door-back', x: [COURT_DOOR_X - 2, null] }]);
    // R7 out, facing west: through the door, Exhibition Gallery 199, the corridor and gallery 549, and into the Petrie Court to Weston's door's axis.
    await face(page, 0);
    const out7: Sample[] = [];
    const end7 = await walk(page, 'R7 into the Petrie Court', legs(ROUTE_R7.points.slice(5), MINUS_Z), out7, [
      { name: 'r7-corridor', x: [PETRIE_PASSAGE.a - 1, null], z: [null, -67.5] },
      { name: 'r7-court-opening', x: [COURT_X0 - COURT_WALL - 1.5, null], z: [null, -90] },
    ]);
    const r7 = `R7 to ${fmt(end7.eye)}`;
    expectThroughThePetrieWay(out7, r7);
    expect(Math.hypot(end7.eye[0] - WESTON_APPROACH[0], end7.eye[2] - WESTON_APPROACH[1]), `${r7}: metres from Weston's door's axis 3.5 m out`).toBeLessThan(0.5);
    expect(Math.abs(end7.eye[1] - (MAIN_FLOOR_Y + EYE)), `${r7}: on the court's floor`).toBeLessThan(0.03);
    samples.push(...out7);
    await westonDoor(page, samples);
    // R7 back, facing east, from the court through gallery 549, the corridor and Exhibition Gallery 199 to gallery 153; then R4 and R7 back together.
    await face(page, Math.PI);
    const back7: Sample[] = [];
    const at153 = await walk(page, 'R7 back to gallery 153', legs(reversed(ROUTE_R7).points.slice(0, 6), PLUS_Z), back7, [{ name: 'r7-corridor-back', x: [null, PETRIE_PASSAGE.b + 1], z: [-70.5, null] }]);
    expectThroughThePetrieWay(back7, `R7 back to ${fmt(at153.eye)}`);
    samples.push(...back7);
    await face(page, -Math.PI / 2);
    const shared: Sample[] = [];
    const home = await walk(page, 'R4 and R7 back to the spawn', legs(reversed(ROUTE_R7).points.slice(5), PLUS_X), shared);
    const report = `R4 and R7 out and back in ${((Date.now() - started) / 1000).toFixed(1)} s, ending at ${fmt(home.eye)}`;
    console.log(report);
    expectOnTheMainFloor(acrossX(shared, SEAM_SOUTH_X, SEAM_SOUTH_X + 1.2), `${report}: the south seam wall, back`);
    samples.push(...shared);
    expect(Math.abs(home.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: on the main floor`).toBeLessThan(0.03);
    expect(Math.hypot(home.eye[0] - home0[0], home.eye[2] - home0[1]), `${report}: metres from the Great Hall spawn`).toBeLessThan(1);
    expect(airborne(samples), `${report}: eyes where the walker was off the ground`).toEqual([]);
  });
});

/** Back on the Great Hall floor, inside the hall. */
function expectInTheHall(s: Sample, report: string): void {
  expect(Math.abs(s.eye[1] - (MAIN_FLOOR_Y + EYE)), `${report}: eye height off the main floor's`).toBeLessThan(0.03);
  expect(s.onGround, report).toBe(true);
  expect(Math.abs(s.eye[0]) < HALL_X && s.eye[2] < WALL_BACK_Z && s.eye[2] > HALL_WEST_Z, `${report}: inside the Great Hall`).toBe(true);
}

/** Through the middle of the central doorway, level behind the doors (past 0.6 m, where the eye has eased out of the three steps), north of the desk; never off the ground. */
function expectThroughTheDoorway(samples: readonly Sample[], way: string): void {
  const doorway = between(samples, SCREEN_Z + 0.3, SCREEN_Z - 0.3);
  expect(doorway.length, `${way}: samples in the central doorway`).toBeGreaterThan(0);
  expect(Math.max(...doorway.map((s) => Math.abs(s.eye[0]))), `${way}: metres off the axis in the doorway`).toBeLessThan(0.3);
  const behind = between(samples, SCREEN_Z - 0.6, WALL_BACK_Z - 0.3);
  expect(behind.length, `${way}: samples between the doors and the hall`).toBeGreaterThan(0);
  expect(off(behind, MAIN_FLOOR_Y + EYE, 0.1), `${way}: eyes off the main floor between the doors and the hall`).toEqual([]);
  const desk = between(samples, NAVE_MID_Z + 0.5, NAVE_MID_Z - 0.5);
  expect(desk.length > 0 && desk.every((s) => s.eye[0] > 3.43), `${way}: past the desk (3.08 m round, on the axis) on its north side`).toBe(true);
  expect(airborne(samples), `${way}: eyes where the walker was off the ground`).toEqual([]);
}

/** Samples on the main floor's level in a seam wall the walk crosses. */
function expectOnTheMainFloor(seam: readonly Sample[], where: string): void {
  expect(seam.length, `${where}: samples in it`).toBeGreaterThan(0);
  expect(off(seam, MAIN_FLOOR_Y + EYE, 0.05), `${where}: eyes off the main floor in it`).toEqual([]);
}

/** Through the passage from gallery 374 into the Engelhard Court, on the main floor's level. */
function expectThroughThePassage(samples: readonly Sample[], where: string): void {
  const passage = between(samples, MORGAN.z0 - 0.5, MORGAN.z0 + PARTY_WALL + 0.5).filter((s) => s.eye[0] > ENGELHARD_PASSAGE.a && s.eye[0] < ENGELHARD_PASSAGE.b);
  expect(passage.length, `${where}: samples in the passage`).toBeGreaterThan(0);
  expect(off(passage, MAIN_FLOOR_Y + EYE, 0.05), `${where}: eyes off the main floor in the passage`).toEqual([]);
}

/** Through the corridor in the party wall on Z −69.0 and the court wall's opening into the Petrie Court, on the main floor's level. */
function expectThroughThePetrieWay(samples: readonly Sample[], where: string): void {
  const corridor = between(samples, -69 - 0.5, -69 + PARTY_WALL + 0.5).filter((s) => s.eye[0] > PETRIE_PASSAGE.a && s.eye[0] < PETRIE_PASSAGE.b);
  expect(corridor.length, `${where}: samples in the corridor`).toBeGreaterThan(0);
  expect(off(corridor, MAIN_FLOOR_Y + EYE, 0.05), `${where}: eyes off the main floor in the corridor`).toEqual([]);
  const opening = acrossX(samples, COURT_X0 - COURT_WALL - 0.5, COURT_X0 + 0.5).filter((s) => Math.abs(s.eye[2] - COURT_OPENING_Z) < 1.8);
  expect(opening.length, `${where}: samples in the court wall's opening`).toBeGreaterThan(0);
  expect(off(opening, MAIN_FLOOR_Y + EYE, 0.05), `${where}: eyes off the main floor in the opening`).toEqual([]);
}

/**
 * The Temple of Dendur hall from R3's end: up the platform's north side flight; at a walk toward the sphinx until its card shows; onto the terrace, up the
 * dais's north flight, into the gate's passage and back, across the forecourt and down its south flight; into the rail on the gate's axis; back down the
 * side flight to the walkway, where it ends on FLIGHT_Z facing west (yaw 0). Every frame goes into `samples`.
 */
async function dendurHall(page: Page, samples: Sample[]): Promise<void> {
  await face(page, 0);
  const onto = await walk(page, 'up onto the platform', legs([[WALKWAY_X, (await walking(page)).eye[2]], [WALKWAY_X, FLIGHT_Z], [STRIP_X, FLIGHT_Z]], MINUS_Z), samples);
  expect(Math.abs(onto.eye[1] - (PLATFORM_Y + EYE)), `on the platform at ${fmt(onto.eye)}`).toBeLessThan(0.03);
  await approach(page, SPHINX, Math.PI / 2, 'the Temple of Dendur hall', samples);
  const dais: Sample[] = [];
  const terrace: XZ = [STRIP_X, TERRACE_Z];
  const northHead: XZ = [NORTH_FLIGHT_X, FORECOURT_Z];
  const southHead: XZ = [SOUTH_FLIGHT_X, FORECOURT_Z];
  // Onto the terrace and up the north flight at a run; on the forecourt at a walk, whose stop coasts 0.14 m to a run's 0.35 m: the south flight's line
  // lies 0.76 m in from the dais's side, which drops 0.79 m to the platform, and the passage ends at the gate's riser (at 4×, a run's late stop at the
  // south flight walked off the dais). Down the south flight and along the terrace at a run again.
  await walk(page, 'up the dais’s north flight', legs([lineUp(await walking(page), terrace), terrace, [NORTH_FLIGHT_X, TERRACE_Z], northHead], MINUS_X), dais);
  const passage = await walk(page, 'into the gate’s passage', legs([northHead, [TEMPLE_AXIS_X, FORECOURT_Z], [TEMPLE_AXIS_X, PASSAGE_Z]], MINUS_X, 'walk'), dais);
  await page.screenshot({ path: test.info().outputPath('dendur-gate-passage.png') });
  expect(passage.eye[2] > GATE_THRESHOLD.minZ + 0.5 && passage.eye[2] < GATE_THRESHOLD.maxZ && Math.abs(passage.eye[0] - TEMPLE_AXIS_X) < 0.5, `in the gate's passage at ${fmt(passage.eye)}`).toBe(true);
  await walk(page, 'across the forecourt', legs([[TEMPLE_AXIS_X, passage.eye[2]], [TEMPLE_AXIS_X, FORECOURT_Z], southHead], MINUS_X, 'walk'), dais);
  const down = await walk(page, 'down the dais’s south flight', legs([southHead, [SOUTH_FLIGHT_X, TERRACE_Z], [TEMPLE_AXIS_X, TERRACE_Z]], MINUS_X), dais);
  // On the forecourt and in the passage, on their one level, from 1 m past the north flight to 1 m before the south one.
  const forecourt = dais.filter((s) => s.eye[2] < DAIS_STEPS.minZ - 1 || (Math.abs(s.eye[0] - TEMPLE_AXIS_X) < 0.5 && s.eye[2] < GATE_THRESHOLD.maxZ)).filter((s) => s.eye[0] < NORTH_FLIGHT_X - 1 && s.eye[0] > SOUTH_FLIGHT_X + 1);
  expect(forecourt.length, 'samples on the forecourt and in the passage').toBeGreaterThan(0);
  expect(off(forecourt, GATE_THRESHOLD.topY + EYE, 0.03), 'eyes off the forecourt’s level on it and in the passage').toEqual([]);
  expect(Math.abs(down.eye[1] - (PLATFORM_Y + EYE)), `back on the terrace at ${fmt(down.eye)}`).toBeLessThan(0.03);
  samples.push(...dais);
  // On the gate's axis from the terrace, W held: the rail before the riser holds the walker on the terrace.
  await face(page, 0);
  const rail: Sample[] = [];
  const held = await into(page, ['KeyW'], MINUS_Z, -(GATE_RAIL.z + BODY.radius + 0.3), rail, 10_000 * throttleRate());
  await page.screenshot({ path: test.info().outputPath('dendur-gate-rail.png') });
  expect(held.eye[2] > GATE_RAIL.z + BODY.radius - 0.1 && held.eye[2] < GATE_RAIL.z + BODY.radius + 0.3, `held before the rail (Z ${GATE_RAIL.z.toFixed(2)}) at ${fmt(held.eye)}`).toBe(true);
  expect(Math.max(...rail.map((s) => s.eye[1])) - (PLATFORM_Y + EYE), 'metres the eye rose over the terrace’s level, held at the rail').toBeLessThan(0.01);
  samples.push(...rail);
  const walkway = await walk(page, 'back down to the walkway', legs([[TEMPLE_AXIS_X, held.eye[2]], [TEMPLE_AXIS_X, TERRACE_Z], terrace, [STRIP_X, FLIGHT_Z], [WALKWAY_X, FLIGHT_Z]], MINUS_Z), samples);
  expect(Math.abs(walkway.eye[1] - (DENDUR_FLOOR_Y + EYE)), `back on the walkway at ${fmt(walkway.eye)}`).toBeLessThan(0.03);
}

/**
 * Weston's door from R7's end in the Petrie Court: walked straight at along its axis, closed and solid, it shows "E Open" from 1.9 m out and holds the
 * walker a body's radius before its leaves while W stays held, and E, looking straight on, swings it into wing B; through it into gallery 529, to where
 * the walker stands clear of the leaves' sweep yet within reach of a leaf open and closed (./route-places.ts `standOff`): turned onto an open leaf, "E
 * Close" and E shuts it; turned straight at it, "E Open" and E swings it open again toward the walker, the one way it opens; back through it to R7's
 * end. Every frame goes into `samples`.
 */
async function westonDoor(page: Page, samples: Sample[]): Promise<void> {
  const door = doorPlan('weston');
  const into529 = reverse(door.normal);
  const across: Facing = [-door.normal[1], door.normal[0]];
  // Turned to face the door along its axis, and walked straight at it with W held, as a visitor walks up to it: "E Open" from 1.9 m out (F46).
  await face(page, yawFor(into529));
  await watchScreens(page);
  const held = await into(page, ['KeyW'], into529, -(door.front + BODY.radius + 0.1), samples, 10_000 * throttleRate());
  const coming = promptOnApproach(await screens(page, true), door, 'front', 'E Open');
  expect(coming.near, 'frames walking at the closed door within 1.9 m of its leaves').toBeGreaterThan(5);
  expect(coming.apart.slice(0, 5), `frames walking straight at Weston's closed door with no "E Open" (${String(coming.apart.length)} of ${String(coming.near)})`).toEqual([]);
  // A body's radius before the leaves: before their stiles' face, or their raised panels' where it meets one.
  const out = along(held.eye, door.normal) - BODY.radius;
  expect(out > door.front - 0.01 && out < door.frontmost + 0.01, `held at ${fmt(held.eye)} by the closed leaves, a body's radius before their face (${door.front.toFixed(3)} at the stiles, ${door.frontmost.toFixed(3)} at the panels): ${out.toFixed(3)}`).toBe(true);
  expect(Math.abs(along(held.eye, across) - along([door.middle[0], 0, door.middle[1]], across)), `held inside the doorway at ${fmt(held.eye)}`).toBeLessThan(door.leaf.width - BODY.radius);
  await page.screenshot({ path: test.info().outputPath('weston-held.png') });
  await looksAt(page, 'weston', 'E Open');
  await page.keyboard.press('KeyE');
  expect((await doorIs(page, 'weston', 'open')).angle, 'a quarter turn into wing B, away from the walker').toBe(90);
  await face(page, yawFor(into529));
  const room = standOff(door, 'back');
  const through: Sample[] = [];
  const inside = await walk(page, 'through Weston’s door into gallery 529', legs([lineUp(held, room), room], into529), through);
  await page.screenshot({ path: test.info().outputPath('weston-529.png') });
  expect(clearOfSwing(inside.eye, door), `metres the body at ${fmt(inside.eye)} keeps clear of all the leaves sweep (${door.reach.toFixed(3)} m about each hinge)`).toBeGreaterThan(0);
  expect(along(inside.eye, door.normal), `in gallery 529 at ${fmt(inside.eye)}, a metre past the leaves' back face`).toBeLessThan(door.back - 1);
  await face(page, toward(inside.eye, ...leafPoint(door, 'open', 'back')));
  await looksAt(page, 'weston', 'E Close');
  await page.keyboard.press('KeyE');
  expect(await doorIs(page, 'weston', 'closed'), 'shut from gallery 529').toMatchObject({ state: 'closed', angle: 0 });
  // Turned to face the closed door along its axis, straight on: "E Open".
  await face(page, yawFor(door.normal));
  await looksAt(page, 'weston', 'E Open');
  await page.keyboard.press('KeyE');
  expect((await doorIs(page, 'weston', 'open')).angle, 'open again into wing B, toward the walker, the one way it opens').toBe(90);
  await face(page, yawFor(door.normal));
  const court = await walk(page, 'back through Weston’s door into the court', legs([lineUp(inside, WESTON_APPROACH), WESTON_APPROACH], door.normal), through);
  // Through the doorway both ways on the main floor's level, but for the door frame's 8 cm sill.
  const doorway = through.filter((s) => along(s.eye, door.normal) < door.front + 0.3 && along(s.eye, door.normal) > door.back - 0.3);
  expect(doorway.length, 'samples in Weston’s doorway').toBeGreaterThan(0);
  expect(off(doorway, MAIN_FLOOR_Y + EYE + 0.04, 0.05), 'eyes off the main floor in the doorway, its 8 cm sill aside').toEqual([]);
  expect(Math.abs(court.eye[1] - (MAIN_FLOOR_Y + EYE)), `back in the court at ${fmt(court.eye)}`).toBeLessThan(0.03);
  samples.push(...through);
}
