/**
 * Test helpers for the build engine (imported only by `*.test.ts`): a synthetic sequence that crosses every Motion kind with every Stagger,
 * a seeded random generator, and byte-exact snapshots of a timeline's scene state.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, PointLight, Quaternion, SphereGeometry, SpotLight, Vector3 } from 'three';

import { CHAPTERS } from './chapters.js';
import type { Timeline } from './timeline.js';
import type { Motion, Stagger, StepDef } from './types.js';

export const MOTIONS: readonly Motion[] = [
  { kind: 'rise' },
  { kind: 'drop', distance: 5 },
  { kind: 'grow' },
  { kind: 'pop' },
  { kind: 'slide', from: [4, 1, -6] },
];

export const STAGGERS: readonly Stagger[] = ['order', 'x', '-x', 'z', '-z', 'y', 'radial', 'none'];

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** One step per (motion, stagger) pair, each with composite pieces, two geometries, two materials and rotated, scaled matrices; two steps add lights. */
export function fixtureSteps(): StepDef[] {
  const chapter = CHAPTERS[0].id;
  const cube = new BoxGeometry(1, 1, 1);
  const ball = new SphereGeometry(0.5, 8, 6);
  const stone = new MeshStandardMaterial({ color: 0xbbbbbb });
  const metal = new MeshStandardMaterial({ color: 0x333333, metalness: 1 });
  const steps: StepDef[] = [];
  MOTIONS.forEach((motion, mi) => {
    STAGGERS.forEach((stagger, si) => {
      const index = steps.length;
      steps.push({
        id: `fixture-${motion.kind}-${stagger.replace('-', 'neg-')}`,
        chapter,
        title: `${motion.kind} / ${stagger}`,
        motion,
        stagger,
        weight: 0.5 + ((mi + si) % 4) * 0.5,
        build(kit) {
          const rand = random(1000 + index);
          for (let k = 0; k < 9; k += 1) {
            const position = new Vector3(rand() * 40 - 20, rand() * 10, rand() * 40 - 20);
            const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI);
            const scale = new Vector3(0.5 + rand() * 3, 0.5 + rand() * 4, 0.5 + rand() * 2);
            const matrix = new Matrix4().compose(position, rotation, scale);
            const order = Math.floor(k / 2);
            kit.add(cube, k % 3 === 0 ? metal : stone, matrix, order);
            if (k % 2 === 0) kit.add(ball, metal, matrix.clone().multiply(new Matrix4().makeTranslation(0, 0.75, 0)), order);
          }
          if (index === 3) {
            const light = new PointLight(0xffeedd, 50, 20, 2);
            light.position.set(0, 5, 0);
            kit.light(light);
          }
          if (index === 17) {
            const spot = new SpotLight(0xffffff, 80, 30, 0.4, 0.5, 2);
            spot.position.set(0, 12, 0);
            spot.target.position.set(0, 0, 3);
            kit.light(spot);
          }
        },
      });
    });
  });
  return steps;
}

/** The scene state a timeline shows: per mesh its count, visibility and the bytes of every instance matrix and colour; per light its intensity and visibility. */
export interface Snapshot {
  readonly meshes: readonly { readonly name: string; readonly count: number; readonly visible: boolean; readonly matrices: Uint8Array; readonly colours: Uint8Array }[];
  readonly lights: readonly { readonly step: string; readonly intensity: number; readonly visible: boolean }[];
}

function bytes(array: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }): Uint8Array {
  return new Uint8Array(array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength));
}

export function snapshot(timeline: Timeline): Snapshot {
  const meshes = timeline.steps.flatMap((step) =>
    step.meshes.map((mesh) => ({
      name: mesh.name,
      count: mesh.count,
      visible: mesh.visible,
      matrices: bytes(mesh.instanceMatrix.array as Float32Array),
      colours: bytes((mesh.instanceColor?.array ?? new Float32Array()) as Float32Array),
    })),
  );
  const lights = timeline.steps.flatMap((step) => step.lights.map((light) => ({ step: step.def.id, intensity: light.intensity, visible: light.visible })));
  return { meshes, lights };
}

/** The first difference between two snapshots, described, or null when they are byte-identical. */
export function firstDifference(a: Snapshot, b: Snapshot): string | null {
  if (a.meshes.length !== b.meshes.length) return `mesh count ${String(a.meshes.length)} vs ${String(b.meshes.length)}`;
  for (const [i, ma] of a.meshes.entries()) {
    const mb = b.meshes[i];
    if (mb === undefined) return `mesh ${String(i)} missing`;
    if (ma.count !== mb.count || ma.visible !== mb.visible) return `${ma.name}: count/visible ${String(ma.count)}/${String(ma.visible)} vs ${String(mb.count)}/${String(mb.visible)}`;
    const m = ma.matrices.findIndex((value, k) => value !== mb.matrices[k]);
    if (m !== -1 || ma.matrices.length !== mb.matrices.length) return `${ma.name}: instance matrix bytes differ at byte ${String(m)} (instance ${String(Math.floor(m / 64))})`;
    const c = ma.colours.findIndex((value, k) => value !== mb.colours[k]);
    if (c !== -1 || ma.colours.length !== mb.colours.length) return `${ma.name}: instance colour bytes differ at byte ${String(c)} (instance ${String(Math.floor(c / 12))})`;
  }
  for (const [i, la] of a.lights.entries()) {
    const lb = b.lights[i];
    if (lb?.intensity !== la.intensity || lb.visible !== la.visible) return `light ${String(i)} of step ${la.step}: ${String(la.intensity)} vs ${String(lb?.intensity)}`;
  }
  return null;
}
