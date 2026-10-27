/**
 * The door unit's leaves apart (src/model/lib/window.ts `doorUnit`, docs/design/spec.md, Doors): each leaf's geometry, hinge and swing; the closed
 * leaves (`leaf`, `leafGlass`) are exactly the leaves appended; `doorLeavesOf` finds them; a leaf turns about its hinge-side edge at the face it opens
 * round, toward the back for a positive turn, and stands 4 mm off its jamb a quarter turn open; and through its whole swing, either way, no leaf meets a
 * fixed part of its unit (its frame with the transom bar, its fanlight glass): review 5, F22, where the leaves passed 41 mm into the transom bar.
 * Bound: panelled and glazed units of one and two leaves, rectangular and arched, the model's door units among them; the swing is sampled every 2.5° by
 * exact triangle-triangle tests (three-mesh-bvh `intersectsGeometry`), so a graze shorter than a step between samples is not seen; positions to 1e-6 m.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { describe, expect, it } from 'vitest';

import { hingeTurn } from '../../viewer/doors.js';
import { doorLeavesOf, doorUnit } from './window.js';
import type { DoorHinge, DoorParams } from './window.js';

const positions = (g: BufferGeometry): number[] => Array.from(g.getAttribute('position').array);
const box = (g: BufferGeometry): Box3 => {
  if (g.boundingBox === null) g.computeBoundingBox();
  return (g.boundingBox ?? new Box3()).clone();
};
/** A leaf's turn by `angle` about its hinge, as the door layer draws it: about the back face's pivot opening toward the back, the front's toward the front. */
const turn = (hinge: DoorHinge, angle: number): Matrix4 => hingeTurn(new Vector3(...(angle < 0 ? hinge.front : hinge.back)), new Vector3(...hinge.axis), angle);
/** Every vertex of `g` turned by `angle` about its hinge. */
function turnedBox(g: BufferGeometry, hinge: DoorHinge, angle: number): Box3 {
  const m = turn(hinge, angle);
  const out = new Box3();
  const p = g.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < p.count; i += 1) out.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  return out;
}

/** The fixtures, and the model's units: Weston's (as the first), the links', the Bank's and the Fifth Avenue entrance's. */
const UNITS: readonly (readonly [string, DoorParams])[] = [
  ['panelled pair, arched, opening toward the back only (Weston)', { width: 2.6, height: 5, shape: 'arch', swing: 'back' }],
  ['panelled pair, transom (the links)', { width: 2, height: 3.4, leaves: 2, panels: 4 }],
  ['panelled pair, arched (the Bank)', { width: 1.9, height: 5.5, shape: 'arch', leaves: 2, panels: 3 }],
  ['glazed pair, no fanlight', { width: 1.8, height: 4.5, leaves: 2, glazed: true, lights: 3, fanlight: false, frame: 0.09, bar: 0.05, depth: 0.14 }],
  ['glazed pair under a tall transom light (the Fifth Avenue entrance)', { width: 1.8, height: 4.79, leaves: 2, glazed: true, lights: 1, transom: 2.1, frame: 0.09, bar: 0.09, depth: 0.14 }],
  ['one panelled leaf', { width: 1.1, height: 2.4, leaves: 1, fanlight: false }],
];

describe('door unit leaves', () => {
  it.each(UNITS)('%s: the closed leaves are its leaves appended, and doorLeavesOf finds each with its hinge', (_name, params) => {
    const door = doorUnit(params);
    const n = params.leaves ?? 2;
    expect(door.leaves).toHaveLength(n);
    expect(positions(door.leaf)).toEqual(door.leaves.flatMap((l) => positions(l.panel)));
    const parts = doorLeavesOf(door.leaf);
    expect(parts?.map((p) => p.geometry)).toEqual(door.leaves.map((l) => l.panel));
    expect(parts?.map((p) => p.hinge)).toEqual(door.leaves.map((l) => l.hinge));
    if (params.glazed === true) {
      const glass = door.leafGlass;
      if (glass === undefined) throw new Error('A glazed door has no leafGlass.');
      expect(positions(glass)).toEqual(door.leaves.flatMap((l) => (l.glass === undefined ? [] : positions(l.glass))));
      expect(doorLeavesOf(glass)?.map((p) => p.geometry)).toEqual(door.leaves.map((l) => l.glass));
    } else {
      expect(door.leafGlass).toBeUndefined();
      expect(door.leaves.every((l) => l.glass === undefined)).toBe(true);
    }
    expect(doorLeavesOf(door.frame)).toBeUndefined();
    expect(doorUnit(params)).toBe(door);
  });

  it.each(UNITS)('%s: each leaf turns about its hinge-side edge, toward the back for a positive turn, and stands 4 mm off its jamb a quarter turn open', (_name, params) => {
    const door = doorUnit(params);
    const n = params.leaves ?? 2;
    const w = params.width / 2 - (params.frame ?? 0.08);
    const t = params.thickness ?? 0.07;
    const zc = -(params.depth ?? 0.12) / 2;
    const reach = (2 * w) / n - 0.008;
    door.leaves.forEach((leaf, k) => {
      const left = k === 0;
      const edge = left ? -w + 0.004 : w - 0.004;
      const { back, front, axis } = leaf.hinge;
      expect(back, `leaf ${String(k)} opening back turns about its hinge-side edge at its back face`).toEqual([expect.closeTo(edge, 9), 0, expect.closeTo(zc - t / 2, 9)]);
      expect(front, 'and opening forward, at its front face').toEqual([expect.closeTo(edge, 9), 0, expect.closeTo(zc + t / 2, 9)]);
      expect(axis).toEqual([0, left ? 1 : -1, 0]);
      expect(leaf.swing).toEqual({ direction: params.swing ?? 'either', angle: Math.PI / 2 });
      // Closed, the leaf spans its share of the opening less 4 mm at each edge, from its hinge edge.
      const closed = box(leaf.panel);
      expect(closed.max.x - closed.min.x).toBeCloseTo(reach, 6);
      expect(left ? closed.min.x : closed.max.x).toBeCloseTo(edge, 6);
      // A quarter turn toward the back: the hinge edge in the back face's line, the free edge a leaf back of it, a thickness in from the hinge edge.
      const toBack = turnedBox(leaf.panel, leaf.hinge, Math.PI / 2);
      expect(toBack.max.z, 'a positive turn swings the leaf toward the back (−Z)').toBeCloseTo(zc - t / 2, 6);
      expect(toBack.min.z).toBeCloseTo(zc - t / 2 - reach, 6);
      const inner = left ? toBack.min.x - edge : edge - toBack.max.x;
      const outer = left ? toBack.max.x - edge : edge - toBack.min.x;
      expect(inner, 'no nearer the jamb than its hinge edge, but for its raised panels behind the frame').toBeGreaterThanOrEqual(-0.018 - 1e-6);
      expect(outer, 'a thickness (and its panels) in from it').toBeLessThanOrEqual(t + 0.018 + 1e-6);
      // A negative turn mirrors it toward the front.
      const toFront = turnedBox(leaf.panel, leaf.hinge, -Math.PI / 2);
      expect(toFront.min.z, 'a negative turn swings the leaf toward the front (+Z)').toBeCloseTo(zc + t / 2, 6);
      expect(toFront.max.z).toBeCloseTo(zc + t / 2 + reach, 6);
    });
  });

  it.each(UNITS)('%s: no leaf meets a fixed part of its unit anywhere in its swing, closed, part open or open, either way (review 5, F22)', (_name, params) => {
    const door = doorUnit(params);
    const fixed = [['frame', door.frame], ['fanlight glass', door.glass]] as const;
    const bvhs = fixed.flatMap(([name, g]) => (g === undefined ? [] : [[name, new MeshBVH(g)] as const]));
    const hits: string[] = [];
    door.leaves.forEach((leaf, k) => {
      for (const [role, part] of [['panel', leaf.panel], ['glass', leaf.glass]] as const) {
        if (part === undefined) continue;
        for (let degrees = -90; degrees <= 90; degrees += 2.5) {
          const m = turn(leaf.hinge, (degrees * Math.PI) / 180);
          for (const [name, bvh] of bvhs) if (bvh.intersectsGeometry(part, m)) hits.push(`leaf ${String(k)}'s ${role} meets the ${name} at ${degrees.toFixed(1)}°`);
        }
      }
    });
    expect(hits.slice(0, 6), `${String(hits.length)} poses where a leaf meets a fixed part`).toEqual([]);
  });

  it('turns a leaf about its hinge without moving the hinge line, by the hinge matrix the door layer uses', () => {
    const door = doorUnit({ width: 2.6, height: 5, shape: 'arch' });
    const leaf = door.leaves[1];
    if (leaf === undefined) throw new Error('No second leaf.');
    for (const angle of [0.3, 1, Math.PI / 2, -1.2]) {
      const pivot = new Vector3(...(angle < 0 ? leaf.hinge.front : leaf.hinge.back));
      const m = turn(leaf.hinge, angle);
      for (const y of [0, 1.7, 3.9]) {
        const on = new Vector3(pivot.x, y, pivot.z);
        expect(on.clone().applyMatrix4(m).distanceTo(on), `a point on the hinge line at y ${String(y)} stays put`).toBeLessThan(1e-9);
      }
      const off = new Vector3(pivot.x - 1, 2, pivot.z).applyMatrix4(m);
      expect(off.distanceTo(new Vector3(pivot.x, 2, pivot.z)), 'points keep their distance from the hinge').toBeCloseTo(1, 9);
    }
    expect(turn(leaf.hinge, 0).equals(new Matrix4()), 'a turn of 0 is no turn').toBe(true);
  });

  it('rejects a swing past the wall and leaves too narrow to hang, naming the part and the fix', () => {
    expect(() => doorUnit({ width: 2, height: 3, opens: 200 })).toThrow(/doorUnit: opens 200 turns a leaf past its wall; give at most 180 degrees/);
    expect(() => doorUnit({ width: 0.5, height: 3, leaves: 2, thickness: 0.12, frame: 0.05 })).toThrow(/doorUnit: each leaf is 0\.200 m wide, too narrow to hang on a 0\.12 m pivot/);
    expect(() => doorUnit({ width: 2, height: 3, swing: 'sideways' as never })).toThrow(/doorUnit: swing is "sideways"; use one of 'either', 'back', 'front'/);
    expect(() => doorUnit({ width: 2, height: 3, transom: 2.8 })).toThrow(/doorUnit: transom 2\.800 leaves the leaves 0\.040 m of a 3 m door; give a lower transom/);
  });

  it('hangs a rectangular door’s leaves under its transom light, `transom` tall from the bar to the head, 4 mm under the bar, over the sill and off the jambs, a pair 8 mm apart (review 8, F33)', () => {
    const door = doorUnit({ width: 1.8, height: 4.79, leaves: 2, glazed: true, lights: 1, transom: 2.1, frame: 0.09, bar: 0.09, depth: 0.14 });
    const bar = 4.79 - 0.09 - 2.1;
    for (const leaf of door.leaves) {
      expect(box(leaf.panel).max.y, 'a leaf’s top, 4 mm under the transom bar’s underside').toBeCloseTo(bar - 0.045 - 0.004, 6);
      expect(box(leaf.panel).min.y, 'its foot, 4 mm over the frame’s sill').toBeCloseTo(0.09 + 0.004, 6);
    }
    const [left, right] = door.leaves.map((leaf) => box(leaf.panel));
    if (left === undefined || right === undefined) throw new Error('Not a pair of leaves.');
    expect(left.min.x, 'the −X leaf, 4 mm off its jamb').toBeCloseTo(-0.9 + 0.09 + 0.004, 6);
    expect(right.max.x, 'the +X leaf, 4 mm off its jamb').toBeCloseTo(0.9 - 0.09 - 0.004, 6);
    expect(right.min.x - left.max.x, 'the pair 8 mm apart, 4 mm either side of the middle').toBeCloseTo(0.008, 6);
    const glass = door.glass;
    if (glass === undefined) throw new Error('No transom light.');
    expect(box(glass).min.y, 'the light from over its bar').toBeCloseTo(bar + 0.045, 6);
    expect(box(glass).max.y, 'to the frame’s head').toBeCloseTo(4.79 - 0.09, 6);
    expect(box(doorUnit({ width: 2, height: 3.4 }).leaf).max.y, 'by default a third of the width').toBeCloseTo(3.4 - 0.08 - 2 / 3 - 0.04 - 0.004, 6);
  });
});
