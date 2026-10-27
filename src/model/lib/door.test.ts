/**
 * The door unit's leaves apart (src/model/lib/window.ts `doorUnit`, docs/design/spec.md, Doors): each leaf's geometry, hinge and swing; the closed
 * leaves (`leaf`, `leafGlass`) are exactly the leaves appended; `doorLeavesOf` finds them; a leaf turned about its hinge pivots on its jamb, opens toward
 * the unit's back for a positive turn, and lies flush with its jamb a quarter turn open.
 * Bound: panelled and glazed units of one and two leaves, rectangular and arched; positions compare to 1e-6 m.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { hingeTurn } from '../../viewer/doors.js';
import { doorLeavesOf, doorUnit } from './window.js';
import type { DoorParams } from './window.js';

const positions = (g: BufferGeometry): number[] => Array.from(g.getAttribute('position').array);
const box = (g: BufferGeometry): Box3 => {
  if (g.boundingBox === null) g.computeBoundingBox();
  return (g.boundingBox ?? new Box3()).clone();
};
/** Every vertex of `g` turned by `angle` about its hinge. */
function turnedBox(g: BufferGeometry, point: readonly number[], axis: readonly number[], angle: number): Box3 {
  const m = hingeTurn(new Vector3(...point), new Vector3(...axis), angle);
  const out = new Box3();
  const p = g.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < p.count; i += 1) out.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  return out;
}

const UNITS: readonly (readonly [string, DoorParams])[] = [
  ['panelled pair, arched', { width: 2.6, height: 5, shape: 'arch' }],
  ['panelled pair, transom', { width: 2, height: 3.4, leaves: 2, panels: 4 }],
  ['glazed pair, no fanlight', { width: 1.8, height: 4.5, leaves: 2, glazed: true, lights: 3, fanlight: false, frame: 0.09, bar: 0.05, depth: 0.14 }],
  ['glazed pair under a tall transom light, as the Fifth Avenue entrance', { width: 1.8, height: 4.79, leaves: 2, glazed: true, lights: 1, transom: 2.1, frame: 0.09, bar: 0.09, depth: 0.14 }],
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

  it.each(UNITS)('%s: each leaf hangs from its jamb, opens toward the back for a positive turn and lies flush with the jamb a quarter turn open', (_name, params) => {
    const door = doorUnit(params);
    const n = params.leaves ?? 2;
    const w = params.width / 2 - (params.frame ?? 0.08);
    const t = params.thickness ?? 0.07;
    const zc = -(params.depth ?? 0.12) / 2;
    const leafWidth = (2 * w) / n;
    door.leaves.forEach((leaf, k) => {
      const left = k === 0;
      const { point, axis } = leaf.hinge;
      expect(point[0], `leaf ${String(k)}'s pivot, half a thickness in from its jamb`).toBeCloseTo(left ? -w + t / 2 : w - t / 2, 9);
      expect(point[2], 'in the leaf’s mid-plane').toBeCloseTo(zc, 9);
      expect(axis).toEqual([0, left ? 1 : -1, 0]);
      expect(leaf.swing).toEqual({ direction: params.swing ?? 'either', angle: Math.PI / 2 });
      // Closed, the leaf spans its share of the opening less 4 mm at each edge.
      const closed = box(leaf.panel);
      expect(closed.max.x - closed.min.x).toBeCloseTo(leafWidth - 0.008, 6);
      // A quarter turn toward the back: the free edge a leaf-width back from the pivot's line, the hinge edge 4 mm back of it.
      const back = turnedBox(leaf.panel, point, axis, Math.PI / 2);
      expect(back.max.z, 'a positive turn swings the leaf toward the back (−Z)').toBeCloseTo(zc + t / 2 - 0.004, 6);
      expect(back.min.z).toBeCloseTo(zc + t / 2 + 0.004 - leafWidth, 6);
      // Across the opening it lies against its jamb: from the jamb's face (raised panels 18 mm past it, inside the frame's reveal) to a thickness in.
      const inner = left ? back.min.x : -back.max.x;
      const outer = left ? back.max.x : -back.min.x;
      expect(inner, 'no further toward the jamb than its raised panels').toBeGreaterThanOrEqual(-w - 0.018 - 1e-6);
      expect(outer, 'a thickness (and its panels) in from the jamb').toBeLessThanOrEqual(-w + t + 0.018 + 1e-6);
      // A negative turn mirrors it toward the front.
      const front = turnedBox(leaf.panel, point, axis, -Math.PI / 2);
      expect(front.min.z, 'a negative turn swings the leaf toward the front (+Z)').toBeCloseTo(zc - t / 2 + 0.004, 6);
      expect(front.max.z).toBeCloseTo(zc - t / 2 - 0.004 + leafWidth, 6);
    });
  });

  it('turns a leaf about its hinge without moving the hinge line, by the hinge matrix the door layer uses', () => {
    const door = doorUnit({ width: 2.6, height: 5, shape: 'arch' });
    const leaf = door.leaves[1];
    if (leaf === undefined) throw new Error('No second leaf.');
    const pivot = new Vector3(...leaf.hinge.point);
    const axis = new Vector3(...leaf.hinge.axis);
    for (const angle of [0.3, 1, Math.PI / 2, -1.2]) {
      const m = hingeTurn(pivot, axis, angle);
      for (const y of [0, 1.7, 3.9]) {
        const on = new Vector3(pivot.x, y, pivot.z);
        expect(on.clone().applyMatrix4(m).distanceTo(on), `a point on the hinge line at y ${String(y)} stays put`).toBeLessThan(1e-9);
      }
      const off = new Vector3(pivot.x - 1, 2, pivot.z).applyMatrix4(m);
      expect(off.distanceTo(new Vector3(pivot.x, 2, pivot.z)), 'points keep their distance from the hinge').toBeCloseTo(1, 9);
    }
    expect(hingeTurn(pivot, axis, 0).equals(new Matrix4()), 'a turn of 0 is no turn').toBe(true);
  });

  it('rejects a swing past the wall and leaves too narrow to hang, naming the part and the fix', () => {
    expect(() => doorUnit({ width: 2, height: 3, opens: 200 })).toThrow(/doorUnit: opens 200 turns a leaf past its wall; give at most 180 degrees/);
    expect(() => doorUnit({ width: 0.5, height: 3, leaves: 2, thickness: 0.12, frame: 0.05 })).toThrow(/doorUnit: each leaf is 0\.200 m wide, too narrow to hang on a 0\.12 m pivot/);
    expect(() => doorUnit({ width: 2, height: 3, swing: 'sideways' as never })).toThrow(/doorUnit: swing is "sideways"; use one of 'either', 'back', 'front'/);
    expect(() => doorUnit({ width: 2, height: 3, transom: 2.8 })).toThrow(/doorUnit: transom 2\.800 leaves the leaves 0\.040 m of a 3 m door; give a lower transom/);
  });

  it('hangs a rectangular door’s leaves under its transom light, `transom` tall from the bar to the head', () => {
    const door = doorUnit({ width: 1.8, height: 4.79, leaves: 2, glazed: true, lights: 1, transom: 2.1, frame: 0.09, bar: 0.09, depth: 0.14 });
    const top = 4.79 - 0.09 - 2.1;
    for (const leaf of door.leaves) expect(box(leaf.panel).max.y, 'a leaf’s top, 4 mm under the transom bar').toBeCloseTo(top - 0.004, 6);
    const glass = door.glass;
    if (glass === undefined) throw new Error('No transom light.');
    expect(box(glass).min.y, 'the light from over its bar').toBeCloseTo(top + 0.045, 6);
    expect(box(glass).max.y, 'to the frame’s head').toBeCloseTo(4.79 - 0.09, 6);
    expect(box(doorUnit({ width: 2, height: 3.4 }).leaf).max.y, 'by default a third of the width').toBeCloseTo(3.4 - 0.08 - 2 / 3 - 0.004, 6);
  });
});
