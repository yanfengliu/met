/**
 * Timeline: determinism over seeded random histories, rest positions, batching rules and step lights (docs/design/spec.md, Timeline position, Determinism, Batching).
 * Bound: the synthetic fixture crosses all 5 motions with all 8 staggers; the determinism check also runs on whatever src/build/sequence.ts exports.
 * Snapshots compare raw float32 bytes of every instance matrix and colour, plus counts, mesh visibility and light intensities; a fresh evaluation is a new Timeline evaluated once.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, PointLight } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from './chapters.js';
import { Player, SPEEDS } from './player.js';
import { SEQUENCE } from './sequence.js';
import { firstDifference, fixtureSteps, random, snapshot } from './testing.js';
import { MAX_LIGHTS, Timeline } from './timeline.js';
import type { StepDef } from './types.js';

function fresh(steps: readonly StepDef[], t: number): Timeline {
  const timeline = new Timeline(steps);
  timeline.evaluate(t);
  return timeline;
}

type Operation = (player: Player, rand: () => number) => void;

const OPERATIONS: readonly Operation[] = [
  (p) => { p.playForward(); },
  (p) => { p.playBackward(); },
  (p) => { p.pause(); },
  (p) => { p.togglePlay(); },
  (p) => { p.stepForward(); },
  (p) => { p.stepBack(); },
  (p, r) => { p.scrub(r() * p.n); },
  (p, r) => { p.scrub(Math.round(r() * p.n)); },
  (p) => { p.toStart(); },
  (p) => { p.toEnd(); },
  (p, r) => { p.setSpeed(SPEEDS[Math.floor(r() * SPEEDS.length)] ?? 1); },
];

/** Runs a seeded history on `timeline` and checks it against fresh evaluations at `checkpoints` random moments and at the end. */
function checkHistory(steps: readonly StepDef[], seed: number, operations: number, checkpoints: number): void {
  const rand = random(seed);
  const timeline = new Timeline(steps);
  const player = new Player(steps.map((s) => s.weight ?? 1));
  const checkAt = new Set(Array.from({ length: checkpoints }, () => Math.floor(rand() * operations)));
  for (let i = 0; i < operations; i += 1) {
    OPERATIONS[Math.floor(rand() * OPERATIONS.length)]?.(player, rand);
    const ticks = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < ticks; k += 1) {
      player.tick(rand() * rand() * 2);
      timeline.evaluate(player.t);
    }
    if (checkAt.has(i) || i === operations - 1) {
      const difference = firstDifference(snapshot(timeline), snapshot(fresh(steps, player.t)));
      expect(difference, `seed ${String(seed)}, operation ${String(i)}, t = ${String(player.t)}`).toBeNull();
    }
  }
}

describe('timeline determinism', () => {
  const steps = fixtureSteps();

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('matches a fresh evaluation after random history %i of the fixture', (seed) => {
    checkHistory(steps, seed, 60, 6);
  });

  it.each([11, 12, 13])('matches a fresh evaluation after random history %i of the real sequence', (seed) => {
    checkHistory(SEQUENCE, seed, 40, 2);
  });

  it('gives the same state at t whether reached forward, backward or by a jump', () => {
    const forward = new Timeline(steps);
    for (let t = 0; t <= 17.3; t += 0.05) forward.evaluate(t);
    forward.evaluate(17.3);
    const backward = new Timeline(steps);
    backward.evaluate(steps.length);
    for (let t = steps.length; t >= 17.3; t -= 0.07) backward.evaluate(t);
    backward.evaluate(17.3);
    const jump = fresh(steps, 17.3);
    expect(firstDifference(snapshot(forward), snapshot(jump))).toBeNull();
    expect(firstDifference(snapshot(backward), snapshot(jump))).toBeNull();
  });

  it('stepping back from the end to 0 leaves an empty site', () => {
    const timeline = new Timeline(steps);
    for (let t = steps.length; t >= 0; t -= 0.3) timeline.evaluate(t);
    timeline.evaluate(0);
    expect(firstDifference(snapshot(timeline), snapshot(new Timeline(steps)))).toBeNull();
    expect(timeline.steps.flatMap((s) => s.meshes).every((m) => m.count === 0 && !m.visible)).toBe(true);
  });
});

describe('timeline rest positions', () => {
  const steps = fixtureSteps();

  it.each([0, 1, 7, 20, 39, 40])('at t = %i steps 1..t are complete and the rest are hidden', (k) => {
    const timeline = fresh(steps, k);
    for (const step of timeline.steps) {
      const complete = step.index < k;
      for (const mesh of step.meshes) {
        expect(mesh.count, mesh.name).toBe(complete ? mesh.instanceMatrix.count : 0);
        expect(mesh.visible, mesh.name).toBe(complete);
        expect(Array.from(mesh.instanceColor?.array ?? []).every((c) => c === 1), `${mesh.name} colours`).toBe(true);
      }
    }
  });

  it('puts every piece exactly on its final matrix at f = 1 and shows none at f = 0', () => {
    const before = new Timeline(steps);
    const finals = snapshot(before);
    const done = fresh(steps, steps.length);
    const after = snapshot(done);
    // Hidden and landed slots hold the same canonical bytes; only counts and visibility differ.
    finals.meshes.forEach((mesh, i) => {
      expect(Buffer.from(after.meshes[i]?.matrices ?? []).equals(Buffer.from(mesh.matrices)), mesh.name).toBe(true);
      expect(mesh.count).toBe(0);
    });
  });

  it('moves pieces strictly inside a step and tints them', () => {
    const timeline = fresh(steps, 12.5);
    const step = timeline.steps[12];
    expect(step).toBeDefined();
    const meshes = step?.meshes ?? [];
    expect(meshes.some((m) => m.count > 0)).toBe(true);
    expect(meshes.some((m) => Array.from(m.instanceColor?.array ?? []).some((c) => c !== 1))).toBe(true);
  });
});

describe('batching', () => {
  const cube = new BoxGeometry(1, 1, 1);
  const otherCube = new BoxGeometry(1, 1, 1);
  const a = new MeshStandardMaterial();
  const b = new MeshStandardMaterial();
  const at = (x: number): Matrix4 => new Matrix4().makeTranslation(x, 0, 0);
  const step = (id: string, build: StepDef['build']): StepDef => ({ id, chapter: CHAPTERS[0].id, title: id, motion: { kind: 'pop' }, build });

  it('makes one InstancedMesh per (geometry, material) object pair within a step, by identity, never by value', () => {
    const timeline = new Timeline([
      step('one', (kit) => {
        kit.add(cube, a, at(0));
        kit.add(cube, a, at(2));
        kit.add(cube, b, at(4));
        kit.add(otherCube, a, at(6));
        kit.add(cube, a, at(8));
      }),
    ]);
    const meshes = timeline.steps[0]?.meshes ?? [];
    expect(meshes.map((m) => [m.geometry === cube ? 'cube' : 'other', m.material === a ? 'a' : 'b', m.instanceMatrix.count])).toEqual([
      ['cube', 'a', 3],
      ['cube', 'b', 1],
      ['other', 'a', 1],
    ]);
  });

  it('never shares a mesh between steps, even for the same geometry and material', () => {
    const timeline = new Timeline([step('one', (kit) => { kit.add(cube, a, at(0)); }), step('two', (kit) => { kit.add(cube, a, at(1)); })]);
    const [first, second] = timeline.steps;
    expect(first?.meshes[0]).not.toBe(second?.meshes[0]);
    expect(first?.group.children).toContain(first?.meshes[0]);
    expect(second?.group.children).not.toContain(first?.meshes[0]);
  });

  it('stores instances in arrival order, so the visible ones are a prefix', () => {
    const timeline = new Timeline([{ ...step('xs', (kit) => { for (const x of [5, 1, 4, 2, 3]) kit.add(cube, a, at(x)); }), stagger: 'x' }]);
    const mesh = timeline.steps[0]?.meshes[0];
    const xs = Array.from({ length: 5 }, (_, i) => mesh?.instanceMatrix.array[i * 16 + 12]);
    expect(xs).toEqual([1, 2, 3, 4, 5]);
    timeline.evaluate(0.5);
    expect(mesh?.count).toBeGreaterThan(0);
    expect(mesh?.count).toBeLessThan(5);
  });

  it('turns off shadow casting for transparent materials and for userData.castShadow === false', () => {
    const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.3 });
    const lawn = new MeshStandardMaterial();
    lawn.userData['castShadow'] = false;
    const timeline = new Timeline([step('mats', (kit) => { kit.add(cube, a, at(0)); kit.add(cube, glass, at(1)); kit.add(cube, lawn, at(2)); })]);
    expect(timeline.steps[0]?.meshes.map((m) => m.castShadow)).toEqual([true, false, false]);
  });

  it('rejects a step with no piece and a NaN matrix, naming the step', () => {
    expect(() => new Timeline([step('empty', () => undefined)])).toThrow(/Step "empty": build\(\) added no piece/);
    const nan = new Matrix4().makeTranslation(Number.NaN, 0, 0);
    expect(() => new Timeline([step('nan', (kit) => { kit.add(cube, a, nan); })])).toThrow(/Step "nan": piece 0 has a non-finite matrix element/);
  });

  it(`caps step lights at ${String(MAX_LIGHTS)} in the whole sequence`, () => {
    const lit = (count: number): StepDef[] =>
      Array.from({ length: count }, (_, i) =>
        step(`lit-${String(i)}`, (kit) => {
          kit.add(cube, a, at(i));
          kit.light(new PointLight(0xffffff, 10, 5, 2));
        }),
      );
    expect(new Timeline(lit(MAX_LIGHTS)).stats().lights).toBe(MAX_LIGHTS);
    expect(() => new Timeline(lit(MAX_LIGHTS + 1))).toThrow(/adds 9 step lights, more than the 8 allowed/);
    const shadowing = new PointLight(0xffffff, 10, 5, 2);
    shadowing.castShadow = true;
    expect(() => new Timeline([step('shadow', (kit) => { kit.add(cube, a, at(0)); kit.light(shadowing); })])).toThrow(/Step "shadow": light 0 casts shadows/);
  });
});

describe('step lights', () => {
  it('ramp from 0 before their step to full intensity once it is complete, and stay visible so the light count never changes', () => {
    const steps = fixtureSteps();
    const timeline = new Timeline(steps);
    const step = timeline.steps[3];
    const light = step?.lights[0];
    expect(light?.intensity).toBe(0);
    expect(light?.visible).toBe(true);
    timeline.evaluate(3.5);
    expect(light?.intensity).toBeGreaterThan(0);
    expect(light?.intensity).toBeLessThan(50);
    timeline.evaluate(4);
    expect(light?.intensity).toBe(50);
    timeline.evaluate(2);
    expect(light?.intensity).toBe(0);
    expect(light?.visible).toBe(true);
  });
});
