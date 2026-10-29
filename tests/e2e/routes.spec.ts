/**
 * The walk's doors, passages, stairs, pool, dais and artworks through real input on the finished building (docs/design/spec.md, Walk mode, Doors and
 * Collection: Labels), in two parts; walkability, every route walked both ways, is the headless walker's (src/model/hunt/routes.test.ts,
 * src/model/reach.test.ts). Only held keys (W, S, Shift), mouse drags, E and the view menu move the walker or act, and its eye is read from the
 * read-only `window.__met.walk` at every frame (./route-walk.ts, ./route-holds.ts).
 * - One short walk: from the plaza spawn (F) up the front steps on the axis, at a run and then at a walk, straight at the central arch's closed middle
 *   door, whose prompt says "E Open" at every frame from 1.9 m out (F46) and whose leaves hold the walker a body's radius before them; E, looking straight
 *   on, swings it into the building; through it, let go once clear of the leaves' sweep, turned back onto an open leaf, "E Close" and E shuts it behind.
 *   Then the view menu's top of the Grand Staircase and W down its upper flight onto the landing; turned round, up the flight and across the cross hall
 *   at a run, and into its doorway's passage at a walk toward Tiepolo's Triumph of Marius, in gallery 600, until its card shows; turned away. Then the
 *   view menu's plaza, the door still shut (F54), straight at it again, held, "E Open" from 1.9 m out and opened by E. At every frame drawn the card and
 *   the door prompt never both show, each only with its kind of look target, with frames of the prompt alone before and after the card and of the card
 *   alone (review 7, F30); the eye stands on the main floor behind the doors, on the landing and on the second floor into the doorway's passage.
 * - Fixed places, each a page placed by `spawn=x,y,z,tx,ty,tz` (src/walk/spawns.ts `placeOf`) looking at a fixed point, its view's picture written to
 *   the test's output folder for a person to inspect (nothing judges it), the walker checked to stand there on its floor: the middle door from the Great
 *   Hall (held, "E Open" from 1.9 m out, opened by E out toward the plaza, walked out, shut behind from before it); Weston's door from the Petrie Court
 *   (held, "E Open" from 1.9 m out, opened by E into wing B, walked through) and from gallery 529 with the doors open (shut by E, opened again by E toward
 *   the walker, walked back); R5's doorway into gallery 600; the Grand Staircase's landing; the Temple of Dendur's forecourt and the gate's passage on one
 *   level; the dais's south flight walked down; the rail before the gate's riser, which holds the walker on the terrace; the pool's north arm, stepped
 *   into to rest on its floor and out of again; and the Sphinx of Hatshepsut and Ruth Gleaning, each approached at a walk until its card shows within
 *   6 m and turned away. At each the card and the prompt follow the one look target, and the walker never leaves the ground (F55).
 * - Unthrottled, the walking frame budget at R3's end in the Temple of Dendur hall and at R4's in the Leon Levy and Shelby White Court, walking on and
 *   running back.
 * Red proofs: docs/learning/gate-proofs.md, "The walk through real input".
 * Bound: a held key is let go once the page sees the eye past a line, up to a frame's travel after it crosses (0.2 m at a walk and 0.5 m at a run, frames
 * capped at 0.1 s), and the walker goes on for its coast (0.14 m at a walk) and for as long as the release takes to reach the page. Where it rests is
 * bounded, not chosen: through the middle door, on the 1.33 m stretch where the body is clear of the leaves' sweep and an open leaf is in reach, so a
 * release up to 0.56 s late still rests where the door can be shut (./route-places.ts `useStretch`; at 4× throttle on 2026-10-29 the releases came
 * 0.005 to 0.12 s late), and a later one fails saying how far it went; through Weston's door, anywhere past the sweep, as gallery 529 is shut and opened
 * again from a place of its own; on the landing, 2.4 m on from the release to its far edge (1.0 s); in the gate's passage, 2.8 m on from it to the riser
 * (1.3 s); up the front steps, Shift up to 1.0 s late, so the last 1.9 m before the middle door are walked, at least 7 frames with frames capped at 0.1 s.
 * Elsewhere what holds the walker is a stop (the leaves, the rail, the pool arm's far wall) or open floor past the line. The middle door
 * is walked at on its axis and Weston's on its own, the artworks from 7.7 to 26 m off. Each test's deadline is its timeout times the CPU throttle
 * (MET_CPU_THROTTLE, tests/e2e/helpers.ts `throttle`), applied once the page has loaded; the holds' and the approaches' waits are bounded in the
 * test's process too (./route-holds.ts `inTime`), the turns by drags only by that deadline. Doors' leaves come from the finished model built in the test's process (./route-places.ts); artworks' boxes from the collection's
 * placements (./labels-helpers.ts).
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Vector3 } from 'three';

import type { Vec3 } from '../../src/build/types.js';
import { INNER_EAST_Z } from '../../src/model/core/layout.js';
import { MAIN_FLOOR_Y, SECOND_FLOOR_Y } from '../../src/model/frame.js';
import { CROSS_HALL_BACK_Z, SCREEN_Z, STAIR_MID_BACK_Z, STAIR_MID_FRONT_Z, STAIR_TOP_Z, WALL_BACK_Z } from '../../src/model/hunt/dims.js';
import { ROUTE_R3, ROUTE_R4, ROUTE_R6, WESTON_APPROACH } from '../../src/model/hunt/routes.js';
import { STAIR_LANDING_Y } from '../../src/model/hunt/stair.js';
import { DAIS, DAIS_STEPS, DENDUR_FLOOR_Y, GATE_RAIL, GATE_SLABS, GATE_THRESHOLD, PLATFORM_Y, POOL, POOL_FLOOR_Y, TEMPLE_AXIS_X, TERRACE } from '../../src/model/roche-north/plan.js';
import { BODY, MOTION } from '../../src/walk/walker.js';
import { expectWalkingBudget, open, openMenu, press, throttle, throttleRate, walkingBudget, watchErrors } from './helpers.js';
import { artworkBounds, TRIUMPH } from './labels-helpers.js';
import { approach, axisPoint, clearOfSwing, doorPlan, LOOK, outOf, promptOnApproach, screenMark, screensApart, screensSince, useStretch, watchScreens } from './route-places.js';
import type { DoorPlan, Screen } from './route-places.js';
import { holdPast, into, rest } from './route-holds.js';
import { airborne, along, between, doorFacts, doorIs, face, fmt, looksAt, MIDDLE_DOOR, MINUS_X, MINUS_Z, off, PLUS_X, PLUS_Z, record, toward, walking } from './route-walk.js';
import type { Facing, Sample, XZ } from './route-walk.js';
import { firstSurface } from './surface.js';

const EYE = BODY.eye;
/** How far a walk coasts once its keys go up (src/walk/walker.ts MOTION). */
const WALK_COAST = MOTION.walk * MOTION.groundTau;
/** The share of an open leaf's width, out from its hinge, the eye looks at to shut it: near its free edge, nearest a walker who walked through. */
const OPEN_SHARE = 0.9;
/** The Dendur hall's places: the dais's south flight's line; the middle of the gate's passage; the terrace's line 2.84 m off the gate slabs. */
const SOUTH_FLIGHT_X = DAIS.minX + DAIS_STEPS.width / 2;
const PASSAGE_Z = (GATE_THRESHOLD.minZ + GATE_THRESHOLD.maxZ) / 2;
const TERRACE_Z = GATE_SLABS.maxZ + 2.84;
/** R3's north walkway by the glass (its last leg's line), and the middle of the pool's north arm across it, between the terrace's coping and the walkway. */
const WALKWAY_X = ROUTE_R3.points.at(-1)?.[0] ?? 150.3;
const POOL_Z = (POOL.armMinZ + POOL.basinMinZ) / 2;
/** On the platform between the gate slabs' north end and the terrace's north return, the way onto the terrace toward the Sphinx. */
const STRIP_X = (GATE_SLABS.maxX + TERRACE.returnNorthX) / 2;
/** The artworks approached: the Sphinx of Hatshepsut on the Dendur terrace, and Saint-Gaudens's Ruth Gleaning in the Engelhard Court (src/model/collection/spaces-a.ts). */
const SPHINX = 544442;
const RUTH = 11952;
/** The yaw that faces the level direction `d` (src/walk/walker.ts: yaw 0 faces −Z). */
const yawFor = (d: Facing): number => Math.atan2(-d[0], -d[1]);
const alongXZ = (p: XZ, d: Facing): number => p[0] * d[0] + p[1] * d[1];

/** An artwork's box's middle, from the collection's placements. */
function artMiddle(id: number): Vec3 {
  const box = artworkBounds().get(id);
  if (box === undefined) throw new Error(`No artwork ${String(id)} among the collection's placements (src/model/collection/spaces-a.ts, spaces-b.ts).`);
  return box.getCenter(new Vector3()).toArray();
}

/**
 * Opens the finished building in walk mode at the place `feet` looking at `target` (`spawn=x,y,z,tx,ty,tz`, and `query` after it), slows it by the CPU throttle the run asks,
 * starts the page's records of frames and screens, writes a picture of the place's view, at its fixed angle, as `<name>.png` to the test's output
 * folder, and checks that the walker stands there at rest: within 1 cm across, its eye BODY.eye over the floor `feet` names within 2 cm, on the ground.
 */
async function openAt(page: Page, name: string, feet: Vec3, target: Vec3, query = ''): Promise<Sample> {
  const f = await open(page, `walk=1&spawn=${[...feet, ...target].map((v) => v.toFixed(4)).join(',')}${query}`);
  expect(f.warnings, `${name}: the page's warnings`).toEqual([]);
  await throttle(page);
  await walking(page);
  await watchScreens(page);
  await record(page);
  expect(await page.evaluate(() => window.__met?.walk.spawn), `${name}: placed by the query`).toBe('place');
  const at = await rest(page);
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
  expect(Math.hypot(at.eye[0] - feet[0], at.eye[2] - feet[2]), `${name}: metres across from the place, standing at ${fmt(at.eye)}`).toBeLessThan(0.01);
  expect(Math.abs(at.eye[1] - (feet[1] + EYE)), `${name}: metres off the eye over the floor, at ${fmt(at.eye)}`).toBeLessThan(0.02);
  expect(at.onGround, `${name}: on the ground`).toBe(true);
  return at;
}

/** At every frame drawn since the page's screen record began, the card and the prompt follow the one look target (F30); no recorded walking frame is off the ground. */
async function expectClean(page: Page, where: string, samples: Sample[]): Promise<void> {
  const frames = await screensSince(page);
  expect(frames.length, `${where}: frames in the page's screen record`).toBeGreaterThan(0);
  const apart = screensApart(frames);
  expect(apart.slice(0, 5), `${where}: frames that break the look target's rule (${String(apart.length)})`).toEqual([]);
  samples.push(...(await record(page)));
  expect(airborne(samples), `${where}: eyes where the walker was off the ground`).toEqual([]);
}

/**
 * Up the front steps from the plaza spawn, which stands on the entrance's axis facing the facade: W held straight at the middle door's closed leaves, with
 * Shift until the eye is 8 m out from them, so the walker walks the last 1.9 m even when Shift comes up 1.0 s late. From 1.9 m out until the leaves hold
 * the walker its prompt says "E Open" at every frame (final review, F46: on the axis the eye's ray runs between the pair's leaves), at least 7 frames
 * at a walk with frames capped at 0.1 s, and the leaves hold it a body's radius before them, before the middle of the pair.
 */
async function upToTheDoor(page: Page, door: DoorPlan, samples: Sample[], way: string): Promise<Sample> {
  const from = await screenMark(page);
  const held = await into(page, ['KeyW'], MINUS_Z, -(door.front + BODY.radius + 0.1), samples, 30_000 * throttleRate(), -(door.front + 8));
  const coming = promptOnApproach(await screensSince(page, from), door, 'front', 'E Open');
  expect(coming.near, `${way}: frames walking at the closed door within 1.9 m of its leaves`).toBeGreaterThan(5);
  expect(coming.apart.slice(0, 5), `${way}: frames walking straight at the closed door with no "E Open" (${String(coming.apart.length)} of ${String(coming.near)})`).toEqual([]);
  const stop = door.front + BODY.radius;
  expect(Math.abs(held.eye[2] - stop), `${way}: held at ${fmt(held.eye)} by the closed leaves, their front face at Z ${door.front.toFixed(3)}, a body's radius before it Z ${stop.toFixed(3)}`).toBeLessThan(0.01);
  // Pushed on the pair's 8 mm gap, the body slides a few centimetres along the leaves before it rests, as along any wall it pushes on.
  expect(Math.abs(held.eye[0]), `${way}: held before the middle of the pair at ${fmt(held.eye)}`).toBeLessThan(0.1);
  expect(await doorFacts(page, MIDDLE_DOOR), `${way}: the door that held it`).toMatchObject({ state: 'closed', angle: 0 });
  return held;
}

/**
 * Through door `door`, open toward `side`, from where the walker stands facing out of it that way: W held at a walk and let go once the eye passes where
 * the body comes clear of the leaves' sweep, less a walk's coast (./route-places.ts `useStretch`). At rest on that stretch, turned by drags onto the open
 * leaf near its free edge: "E Close", and E shuts it. Returns where the walker rests.
 */
async function throughAndShut(page: Page, door: DoorPlan, side: 'front' | 'back', samples: Sample[], way: string): Promise<Sample> {
  const out = outOf(door, side);
  const stretch = useStretch(door, side, OPEN_SHARE);
  const face0 = alongXZ(axisPoint(door, side, 0), out);
  const at = await holdPast(page, way, ['KeyW'], out, alongXZ(axisPoint(door, side, stretch.near - WALK_COAST), out), samples);
  const d = along(at.eye, out) - face0;
  const went = d - (stretch.near - WALK_COAST);
  expect(d >= stretch.near && d <= stretch.far, `${way}: at rest ${d.toFixed(2)} m out from the leaves at ${fmt(at.eye)}, where it can shut the door from ${stretch.near.toFixed(2)} to ${stretch.far.toFixed(2)} m out; it went on ${went.toFixed(2)} m past where W was let go, ${((went - WALK_COAST) / MOTION.walk).toFixed(2)} s of walking after its coast`).toBe(true);
  expect(clearOfSwing(at.eye, door), `${way}: metres the body at ${fmt(at.eye)} keeps clear of all the leaves sweep`).toBeGreaterThan(0);
  await face(page, toward(at.eye, ...stretch.leaf));
  await looksAt(page, door.id, 'E Close');
  await page.keyboard.press('KeyE');
  expect(await doorIs(page, door.id, 'closed'), `${way}: shut by E`).toMatchObject({ state: 'closed', angle: 0 });
  return at;
}

/** Through the middle of the central doorway, and level behind the doors (past 0.6 m, where the eye has eased out of the three steps); never off the ground. */
function expectThroughTheDoorway(samples: readonly Sample[], way: string): void {
  const doorway = between(samples, SCREEN_Z + 0.3, SCREEN_Z - 0.3);
  expect(doorway.length, `${way}: samples in the central doorway`).toBeGreaterThan(0);
  expect(Math.max(...doorway.map((s) => Math.abs(s.eye[0]))), `${way}: metres off the axis in the doorway`).toBeLessThan(0.3);
  const behind = between(samples, SCREEN_Z - 0.6, WALL_BACK_Z - 0.3);
  expect(behind.length, `${way}: samples between the doors and the hall`).toBeGreaterThan(0);
  expect(off(behind, MAIN_FLOOR_Y + EYE, 0.1), `${way}: eyes off the main floor between the doors and the hall`).toEqual([]);
  expect(airborne(samples), `${way}: eyes where the walker was off the ground`).toEqual([]);
}

/** Through Weston's doorway on the main floor's level, but for the door frame's 8 cm sill. */
function expectThroughWestonsDoorway(door: DoorPlan, samples: readonly Sample[]): void {
  const doorway = samples.filter((s) => along(s.eye, door.normal) < door.front + 0.3 && along(s.eye, door.normal) > door.back - 0.3);
  expect(doorway.length, 'samples in Weston’s doorway').toBeGreaterThan(0);
  expect(off(doorway, MAIN_FLOOR_Y + EYE + 0.04, 0.05), 'eyes off the main floor in the doorway, its 8 cm sill aside').toEqual([]);
}

/** Enters walk mode at spawn `id` by the view menu's "Walk from …", as a visitor does while walking. */
async function walkFrom(page: Page, id: string): Promise<Sample> {
  await openMenu(page, 'view-menu');
  await press(page, `walk-spawn-${id}`);
  const ms = 15_000 * throttleRate();
  await page.waitForFunction((s) => window.__met?.walk.spawn === s && !window.__met.walk.preparing && window.__met.walk.eye !== null, id, { timeout: ms }).catch(async () => {
    throw new Error(`The view menu's walk-spawn-${id} never put the walker at its spawn within ${String(ms)} ms: window.__met.walk.spawn is ${String(await page.evaluate(() => window.__met?.walk.spawn).catch(() => 'unread'))}.`);
  });
  return rest(page);
}

test.describe('the walk through real input', () => {
  let errors: { expectClean: () => void };
  test.beforeEach(({ page }) => {
    errors = watchErrors(page);
  });
  test.afterEach(() => {
    errors.expectClean();
  });

  test('one short walk: up the front steps straight at the closed middle door, held, opened by E and shut behind; a Grand Staircase flight and gallery 600’s Triumph of Marius; back at the door, still shut; the card and the prompt never at once', async ({ page }) => {
    test.setTimeout(150_000 * throttleRate());
    const started = Date.now();
    const f = await open(page, '');
    await throttle(page);
    expect(f.t, 'the finished building').toBe(f.n);
    expect(f.doors.find((d) => d.id === MIDDLE_DOOR), 'the middle door at load').toMatchObject({ state: 'closed', angle: 0, built: true });
    await page.keyboard.press('KeyF');
    const start = await walking(page);
    expect(await page.evaluate(() => window.__met?.walk.spawn), 'walk mode starts on the plaza').toBe('plaza');
    await watchScreens(page);
    await record(page);
    const door = doorPlan(MIDDLE_DOOR);
    const inward: Sample[] = [start];
    await upToTheDoor(page, door, inward, 'up the front steps');
    await page.screenshot({ path: test.info().outputPath('middle-door-held.png') });
    // Still looking straight ahead: "E Open", and E opens the door away from the walker; through it, and shut behind.
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn into the building, away from the walker').toBe(90);
    await throughAndShut(page, door, 'back', inward, 'through the middle door into the Great Hall');
    await page.screenshot({ path: test.info().outputPath('middle-door-shut-behind.png') });
    expectThroughTheDoorway(inward, 'in through the middle door');
    // One Grand Staircase flight: from its top, W down the upper flight, let go 0.5 m onto the landing (3 m deep), where the walker rests.
    const stair: Sample[] = [await walkFrom(page, 'second-floor')];
    const landing = await holdPast(page, 'down the Grand Staircase’s upper flight', ['KeyW'], PLUS_Z, STAIR_MID_BACK_Z + 0.5, stair);
    expect(landing.eye[2] > STAIR_MID_BACK_Z && landing.eye[2] < STAIR_MID_FRONT_Z, `at rest on the landing, at ${fmt(landing.eye)}`).toBe(true);
    expect(Math.abs(landing.eye[1] - (STAIR_LANDING_Y + EYE)), `the eye over the landing, at ${fmt(landing.eye)}`).toBeLessThan(0.01);
    // Turned round, up the flight and across the cross hall at a run, then into its doorway's passage (R5) at a walk toward the Triumph of Marius until its card shows.
    await face(page, 0);
    const climb: Sample[] = [];
    await approach(page, TRIUMPH, Math.PI, 'gallery 600', climb, 12);
    const top = climb.reduce((a, b) => (b.eye[2] < a.eye[2] ? b : a));
    // On the landing, where it rested, and from 2 m past the top of the flight, where the eye has eased out of its snaps (about 0.1 s, src/walk/walker.ts).
    const onLanding = between(climb, STAIR_MID_FRONT_Z - 1.4, STAIR_MID_BACK_Z + 0.5);
    expect(onLanding.length, 'samples on the landing').toBeGreaterThan(0);
    expect(off(onLanding, STAIR_LANDING_Y + EYE, 0.05), 'eyes off the landing').toEqual([]);
    expect(off(between(climb, STAIR_TOP_Z - 2, top.eye[2]), SECOND_FLOOR_Y + EYE, 0.05), 'eyes off the second floor, the cross hall’s doorway and its passage').toEqual([]);
    expect(between(climb, CROSS_HALL_BACK_Z - 0.5, INNER_EAST_Z + 0.5).length, `samples in the doorway's passage, the walk stopping at ${fmt(top.eye)}`).toBeGreaterThan(0);
    stair.push(...climb);
    // Back at the plaza by the view menu: the door shut behind is still shut (review 20, F54: a door found open was taken as it stood), held, and opened by E.
    const plaza = await walkFrom(page, 'plaza');
    expect(await doorFacts(page, MIDDLE_DOOR), 'still shut as the walker comes back to it').toMatchObject({ state: 'closed', angle: 0 });
    const back: Sample[] = [plaza];
    await upToTheDoor(page, door, back, 'back at the door');
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'opened again by E, into the building, away from the walker').toBe(90);
    console.log(`the short walk in ${((Date.now() - started) / 1000).toFixed(1)} s at ${String(throttleRate())}× CPU throttle`);
    // At every frame drawn, the card and the door prompt never both showed, each only with its own kind of look target (review 7, F30).
    const all = await screensSince(page);
    const promptOnly = (s: Screen): boolean => s.prompt && !s.card;
    const firstCard = all.findIndex((s) => s.card);
    const lastCard = all.length - 1 - [...all].reverse().findIndex((s) => s.card);
    console.log(`the card and the prompt: ${String(all.length)} frames; the prompt alone in ${String(all.slice(0, firstCard).filter(promptOnly).length)} before the card and ${String(all.slice(lastCard + 1).filter(promptOnly).length)} after it, the card alone in ${String(all.filter((s) => s.card && !s.prompt).length)}`);
    expect(firstCard, 'the card shows in gallery 600').toBeGreaterThan(-1);
    expect(all.slice(0, firstCard).some(promptOnly), 'frames with the prompt and no card before the card').toBe(true);
    expect(all.slice(lastCard + 1).some(promptOnly), 'frames with the prompt and no card after the card').toBe(true);
    expect(all.some((s) => s.card && !s.prompt), 'frames with the card and no prompt').toBe(true);
    await expectClean(page, 'the short walk', [...inward, ...stair, ...back]);
  });

  test('the middle door from the Great Hall: walked straight at, closed, "E Open" from 1.9 m out and held before its leaves; E swings it out toward the plaza; walked out and shut behind from before it', async ({ page }) => {
    test.setTimeout(60_000 * throttleRate());
    const door = doorPlan(MIDDLE_DOOR);
    await openAt(page, 'middle-door-from-the-hall', [0, MAIN_FLOOR_Y, door.back - 2.6], [0, MAIN_FLOOR_Y + EYE, door.middle[1]]);
    expect(await doorFacts(page, MIDDLE_DOOR), 'shut at load').toMatchObject({ state: 'closed', angle: 0, built: true });
    const samples: Sample[] = [];
    const from = await screenMark(page);
    const held = await into(page, ['KeyW'], PLUS_Z, door.back - BODY.radius - 0.1, samples, 15_000 * throttleRate());
    const coming = promptOnApproach(await screensSince(page, from), door, 'back', 'E Open');
    expect(coming.near, 'frames walking at the closed door within 1.9 m of its leaves').toBeGreaterThan(5);
    expect(coming.apart.slice(0, 5), `frames walking straight at the closed door with no "E Open" (${String(coming.apart.length)} of ${String(coming.near)})`).toEqual([]);
    expect(Math.abs(held.eye[2] - (door.back - BODY.radius)), `held at ${fmt(held.eye)} a body's radius behind the leaves' back face, Z ${door.back.toFixed(3)}`).toBeLessThan(0.01);
    await looksAt(page, MIDDLE_DOOR, 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, MIDDLE_DOOR, 'open')).angle, 'a quarter turn out toward the plaza, away from the walker inside').toBe(-90);
    const outside = await throughAndShut(page, door, 'front', samples, 'out through the middle door');
    await page.screenshot({ path: test.info().outputPath('middle-door-shut-from-outside.png') });
    const down = firstSurface(outside.eye, [0, -1, 0]);
    expect(Math.abs((down ?? Number.NaN) - EYE), `the eye ${(down ?? Number.NaN).toFixed(3)} m over the surface under it outside the doors, at ${fmt(outside.eye)}`).toBeLessThan(0.01);
    expectThroughTheDoorway(samples, 'out through the middle door');
    await expectClean(page, 'the middle door from the Great Hall', samples);
  });

  test('Weston’s door from the Petrie Court: walked straight at along its axis, closed and solid, "E Open" from 1.9 m out and held; E swings it into wing B, and the walker walks through into gallery 529', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    const door = doorPlan('weston');
    const into529 = outOf(door, 'back');
    const across: Facing = [-door.normal[1], door.normal[0]];
    await openAt(page, 'weston-door-from-the-court', [WESTON_APPROACH[0], MAIN_FLOOR_Y, WESTON_APPROACH[1]], [door.middle[0], MAIN_FLOOR_Y + EYE, door.middle[1]]);
    expect(await doorFacts(page, 'weston'), 'Weston’s door at load').toMatchObject({ state: 'closed', angle: 0, locked: false, built: true });
    const samples: Sample[] = [];
    const from = await screenMark(page);
    const held = await into(page, ['KeyW'], into529, -(door.front + BODY.radius + 0.1), samples, 15_000 * throttleRate());
    const coming = promptOnApproach(await screensSince(page, from), door, 'front', 'E Open');
    expect(coming.near, 'frames walking at the closed door within 1.9 m of its leaves').toBeGreaterThan(5);
    expect(coming.apart.slice(0, 5), `frames walking straight at Weston's closed door with no "E Open" (${String(coming.apart.length)} of ${String(coming.near)})`).toEqual([]);
    // A body's radius before the leaves: before their stiles' face, or their raised panels' (18 mm proud) where it meets one.
    const out = along(held.eye, door.normal) - BODY.radius;
    expect(out > door.front - 0.01 && out < door.frontmost + 0.01, `held at ${fmt(held.eye)} by the closed leaves, a body's radius before their face (${door.front.toFixed(3)} at the stiles, ${door.frontmost.toFixed(3)} at the panels): ${out.toFixed(3)}`).toBe(true);
    expect(Math.abs(along(held.eye, across) - alongXZ(door.middle, across)), `held inside the doorway at ${fmt(held.eye)}`).toBeLessThan(door.leaf.width - BODY.radius);
    await page.screenshot({ path: test.info().outputPath('weston-door-held.png') });
    await looksAt(page, 'weston', 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, 'weston', 'open')).angle, 'a quarter turn into wing B, away from the walker').toBe(90);
    // Through it into gallery 529, let go once the body is clear of the leaves' sweep: it rests in the gallery, wherever the release lets it.
    const clear = useStretch(door, 'back', OPEN_SHARE).near;
    const inside = await holdPast(page, 'through Weston’s door into gallery 529', ['KeyW'], into529, alongXZ(axisPoint(door, 'back', clear - WALK_COAST), into529), samples);
    expect(clearOfSwing(inside.eye, door), `metres the body at ${fmt(inside.eye)} keeps clear of all the leaves sweep`).toBeGreaterThan(0);
    expect(along(inside.eye, door.normal), `in gallery 529 at ${fmt(inside.eye)}, a metre past the leaves' back face`).toBeLessThan(door.back - 1);
    expect(Math.abs(inside.eye[1] - (MAIN_FLOOR_Y + EYE)), `on gallery 529's floor at ${fmt(inside.eye)}`).toBeLessThan(0.02);
    expectThroughWestonsDoorway(door, samples);
    await expectClean(page, 'Weston’s door from the court', samples);
  });

  test('Weston’s door from gallery 529, standing open (doors=open): shut by E on an open leaf, opened again by E straight on, toward the walker, and walked back through into the court', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    const door = doorPlan('weston');
    // On the axis in gallery 529, clear of the leaves' sweep, with the open leaf in reach and the closed door straight ahead within it.
    const stretch = useStretch(door, 'back', OPEN_SHARE);
    const [x, z] = axisPoint(door, 'back', (stretch.near + Math.min(stretch.far, LOOK)) / 2);
    await openAt(page, 'weston-door-from-529', [x, MAIN_FLOOR_Y, z], [stretch.leaf[0], MAIN_FLOOR_Y + EYE, stretch.leaf[1]], '&doors=open');
    expect(await doorFacts(page, 'weston'), 'open at load into wing B, its default with doors=open').toMatchObject({ state: 'open', angle: 90 });
    const samples: Sample[] = [];
    await looksAt(page, 'weston', 'E Close');
    await page.keyboard.press('KeyE');
    expect(await doorIs(page, 'weston', 'closed'), 'shut from gallery 529').toMatchObject({ state: 'closed', angle: 0 });
    // Turned to face it along its axis, straight on: "E Open", and E swings it toward the walker, the one way it opens; back through it into the court.
    await face(page, yawFor(door.normal));
    await looksAt(page, 'weston', 'E Open');
    await page.keyboard.press('KeyE');
    expect((await doorIs(page, 'weston', 'open')).angle, 'open again into wing B, toward the walker, the one way it opens').toBe(90);
    const court = await holdPast(page, 'back through Weston’s door into the court', ['KeyW'], door.normal, door.front + 1.5, samples);
    expect(Math.abs(court.eye[1] - (MAIN_FLOOR_Y + EYE)), `back in the court at ${fmt(court.eye)}`).toBeLessThan(0.02);
    expectThroughWestonsDoorway(door, samples);
    await expectClean(page, 'Weston’s door from gallery 529', samples);
  });

  test('R5’s doorway into gallery 600: the walker placed in it stands on the second floor', async ({ page }) => {
    test.setTimeout(30_000 * throttleRate());
    // In the middle of the cross hall's back wall, 0.8 m thick (src/model/hunt/stair.ts): a walled-up doorway would move the walker off its place.
    await openAt(page, 'r5-doorway', [0, SECOND_FLOOR_Y, CROSS_HALL_BACK_Z - 0.4], artMiddle(TRIUMPH));
    await expectClean(page, 'R5’s doorway', []);
  });

  test('the Grand Staircase’s landing: the walker placed on it stands on its level', async ({ page }) => {
    test.setTimeout(30_000 * throttleRate());
    await openAt(page, 'stair-landing', [0, STAIR_LANDING_Y, (STAIR_MID_FRONT_Z + STAIR_MID_BACK_Z) / 2], [0, SECOND_FLOOR_Y + EYE, CROSS_HALL_BACK_Z]);
    await expectClean(page, 'the landing', []);
  });

  test('the Temple of Dendur’s forecourt and the gate’s passage, on one level: walked into from the forecourt and back out', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    const level = GATE_THRESHOLD.topY + EYE;
    await openAt(page, 'dendur-forecourt', [TEMPLE_AXIS_X, GATE_THRESHOLD.topY, GATE_THRESHOLD.minZ - 1.5], [TEMPLE_AXIS_X, level, PASSAGE_Z]);
    const samples: Sample[] = [];
    // The passage is 3.5 m long and ends at the gate's riser: let go 0.6 m into it, the walker rests inside it.
    const passage = await holdPast(page, 'into the gate’s passage', ['KeyW'], PLUS_Z, GATE_THRESHOLD.minZ + 0.6, samples);
    await page.screenshot({ path: test.info().outputPath('dendur-gate-passage.png') });
    expect(passage.eye[2] > GATE_THRESHOLD.minZ + 0.5 && passage.eye[2] < GATE_THRESHOLD.maxZ && Math.abs(passage.eye[0] - TEMPLE_AXIS_X) < 0.5, `in the gate's passage at ${fmt(passage.eye)}`).toBe(true);
    const forecourt = await holdPast(page, 'back out onto the forecourt', ['KeyS'], MINUS_Z, -(GATE_THRESHOLD.minZ - 1), samples);
    expect(Math.abs(forecourt.eye[1] - level), `back on the forecourt at ${fmt(forecourt.eye)}`).toBeLessThan(0.02);
    expect(off(samples, level, 0.03), 'eyes off the forecourt’s level on it and in the passage').toEqual([]);
    await expectClean(page, 'the forecourt and the gate’s passage', samples);
  });

  test('the Temple of Dendur dais’s south flight, walked down from the forecourt onto the terrace', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    await openAt(page, 'dendur-south-flight', [SOUTH_FLIGHT_X, GATE_THRESHOLD.topY, DAIS_STEPS.minZ - 0.5], [SOUTH_FLIGHT_X, PLATFORM_Y + EYE, TERRACE_Z]);
    const samples: Sample[] = [];
    // Down onto the gate's flagstones, 0.15 m over the terrace, and on off them onto it.
    const terrace = await holdPast(page, 'down the dais’s south flight', ['KeyW'], PLUS_Z, GATE_SLABS.maxZ + 0.8, samples);
    expect(Math.abs(terrace.eye[1] - (PLATFORM_Y + EYE)), `on the terrace at ${fmt(terrace.eye)}`).toBeLessThan(0.02);
    await expectClean(page, 'the dais’s south flight', samples);
  });

  test('the Temple of Dendur gate’s rail: on the gate’s axis from the terrace, it holds the walker on the terrace before the riser', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    await openAt(page, 'dendur-gate-rail', [TEMPLE_AXIS_X, PLATFORM_Y, TERRACE_Z], [TEMPLE_AXIS_X, PLATFORM_Y + EYE, GATE_RAIL.z]);
    const samples: Sample[] = [];
    const held = await into(page, ['KeyW'], MINUS_Z, -(GATE_RAIL.z + BODY.radius + 0.3), samples, 15_000 * throttleRate());
    await page.screenshot({ path: test.info().outputPath('dendur-gate-rail-held.png') });
    expect(held.eye[2] > GATE_RAIL.z + BODY.radius - 0.1 && held.eye[2] < GATE_RAIL.z + BODY.radius + 0.3, `held before the rail (Z ${GATE_RAIL.z.toFixed(2)}) at ${fmt(held.eye)}`).toBe(true);
    expect(Math.max(...samples.map((s) => s.eye[1])) - (PLATFORM_Y + EYE), 'metres the eye rose over the terrace’s level, held at the rail').toBeLessThan(0.01);
    await expectClean(page, 'the gate’s rail', samples);
  });

  test('the Temple of Dendur pool’s north arm: stepped down into from the walkway to rest on its floor, and climbed out again', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    await openAt(page, 'dendur-pool-walkway', [WALKWAY_X, DENDUR_FLOOR_Y, POOL_Z], [POOL.armNorthMinX, DENDUR_FLOOR_Y + EYE, POOL_Z]);
    const samples: Sample[] = [];
    // Across the arm, 1.9 m wide, to its far side, the platform's 1.3 m wall, which holds the walker on the pool's floor.
    await into(page, ['KeyW'], MINUS_X, -(POOL.armNorthMinX + BODY.radius + 0.3), samples, 15_000 * throttleRate());
    const inPool = await rest(page);
    await page.screenshot({ path: test.info().outputPath('dendur-pool.png') });
    expect(inPool.eye[0] < POOL.maxX - 0.3 - BODY.radius, `the body over the pool's water, past its 0.3 m kerb, at ${fmt(inPool.eye)}`).toBe(true);
    expect(Math.abs(inPool.eye[1] - (POOL_FLOOR_Y + EYE)), `at rest in the pool’s north arm at ${fmt(inPool.eye)}: metres off the eye over its floor, a step under the walkway`).toBeLessThan(0.02);
    expect(Math.min(...samples.map((s) => s.eye[1])) - (POOL_FLOOR_Y + EYE), 'metres the eye came over the pool floor’s level, never under it').toBeGreaterThan(-0.02);
    // Walked back out with S, up the step onto the walkway (red with the pool 0.6 m deep: stuck in it).
    const walkway = await holdPast(page, 'out of the pool', ['KeyS'], PLUS_X, POOL.maxX + 0.6, samples);
    expect(Math.abs(walkway.eye[1] - (DENDUR_FLOOR_Y + EYE)), `back on the walkway at ${fmt(walkway.eye)}`).toBeLessThan(0.02);
    await expectClean(page, 'the pool', samples);
  });

  test('the Sphinx of Hatshepsut on the Dendur terrace: approached at a walk until its card shows within 6 m, and turned away', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    const samples: Sample[] = [];
    // On the strip 7.7 m before its box, which an approach needs farther off than the card's 6 m reach.
    const box = artworkBounds().get(SPHINX);
    await openAt(page, 'dendur-sphinx', [STRIP_X, PLATFORM_Y, (box?.min.z ?? Number.NaN) - 7.7], artMiddle(SPHINX));
    await approach(page, SPHINX, Math.PI / 2, 'the Temple of Dendur hall', samples);
    await expectClean(page, 'the Sphinx', samples);
  });

  test('Ruth Gleaning in the Engelhard Court: approached at a walk from R6’s end until its card shows within 6 m, and turned away', async ({ page }) => {
    test.setTimeout(45_000 * throttleRate());
    const [x, z] = ROUTE_R6.points.at(-1) ?? [72, -110];
    const samples: Sample[] = [];
    await openAt(page, 'engelhard-ruth', [x, ROUTE_R6.endY, z], artMiddle(RUTH));
    await approach(page, RUTH, 0, 'the Engelhard Court', samples);
    await expectClean(page, 'Ruth Gleaning', samples);
  });

  for (const [where, route, facing] of [['in the Temple of Dendur hall at R3’s end', ROUTE_R3, MINUS_Z], ['in the Leon Levy and Shelby White Court at R4’s end', ROUTE_R4, MINUS_X]] as const) {
    test(`the walking frame budget ${where}, walking on and running back, with the look target on`, async ({ page }) => {
      test.skip(throttleRate() > 1, 'the frame budget is this machine’s, unthrottled');
      test.setTimeout(45_000);
      const [x, z] = route.points.at(-1) ?? [0, 0];
      await openAt(page, `budget-${route.id}`, [x, route.endY, z], [x + facing[0] * 10, route.endY + EYE, z + facing[1] * 10]);
      expectWalkingBudget(await walkingBudget(page), where);
      await face(page, yawFor([-facing[0], -facing[1]]));
      expectWalkingBudget(await walkingBudget(page, true), `${where}, at a run`);
    });
  }
});
