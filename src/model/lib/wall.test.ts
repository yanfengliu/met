/**
 * Walls with openings and rustication, arch elements, windows, doors and surrounds.
 * Bound: geometry arrays only; that openings read as cut through is also checked on gallery captures.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { archivolt, keystone, spandrel, voussoirs } from './arch.js';
import { attributeProblems, backfaceFraction, boxOf, boxProblems, centredProblems, invertedFraction, triangles } from './check.js';
import { surround } from './surround.js';
import { stripsAround, wall } from './wall.js';
import { doorUnit, windowUnit } from './window.js';

/** A wall with four openings is a few hundred triangles; banded rustication roughly doubles it. */
const WALL_BUDGET = 800;
const WINDOW_BUDGET = 600;
const SURROUND_BUDGET = 1_500;

function sound(geometry: THREE.BufferGeometry, name: string): void {
  expect(attributeProblems(geometry, name)).toEqual([]);
  expect(invertedFraction(geometry)).toBe(0);
}

/** True if a ray along −Z through (x, y) meets no triangle: the opening is open there. */
function openAt(geometry: THREE.BufferGeometry, x: number, y: number): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const ray = new THREE.Ray(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const count = index === null ? 0 : index.count / 3;
  for (let t = 0; t < count; t++) {
    a.fromBufferAttribute(position, index?.getX(t * 3) ?? 0);
    b.fromBufferAttribute(position, index?.getX(t * 3 + 1) ?? 0);
    c.fromBufferAttribute(position, index?.getX(t * 3 + 2) ?? 0);
    if (ray.intersectTriangle(a, b, c, false, hit) !== null) return false;
  }
  return true;
}

const OPENINGS = [
  { shape: 'arch' as const, x: -4.5, y: 0, width: 3, height: 6 },
  { shape: 'rect' as const, x: -0.5, y: 1.2, width: 1.6, height: 3 },
  { shape: 'segmental' as const, x: 2.6, y: 1.2, width: 1.8, height: 3.2 },
  { shape: 'arch' as const, x: 5.4, y: 1.5, width: 1.4, height: 3, depth: 0.35 },
];

describe('wall', () => {
  it('is sound, closed from every side, with its front at z = 0 and its foot at y = 0', () => {
    const geometry = wall({ width: 14, height: 9, thickness: 0.9, openings: OPENINGS });
    sound(geometry, 'wall');
    expect(backfaceFraction(geometry, 400)).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-7, 0, -0.9], max: [7, 9, 0] })).toEqual([]);
    expect(triangles(geometry)).toBeLessThanOrEqual(WALL_BUDGET);
  });

  it('cuts through-openings through, keeps blind niches closed, and leaves the wall solid elsewhere', () => {
    const geometry = wall({ width: 14, height: 9, thickness: 0.9, openings: OPENINGS });
    expect(openAt(geometry, -4.5, 5.5)).toBe(true); // inside the arch head
    expect(openAt(geometry, -0.5, 2)).toBe(true);
    expect(openAt(geometry, 2.6, 4.2)).toBe(true); // inside the segmental head
    expect(openAt(geometry, 5.4, 2.5)).toBe(false); // the niche has a back
    expect(openAt(geometry, -4.5, 6.2)).toBe(false); // above the arch's crown
    expect(openAt(geometry, 1.2, 2)).toBe(false);
  });

  it('banded rustication stays sound and closed, channels included', () => {
    const geometry = wall({ width: 12, height: 7.2, thickness: 0.9, rustication: {}, openings: [{ shape: 'arch', x: 0, y: 0, width: 3, height: 5.2 }] });
    sound(geometry, 'rusticated');
    expect(backfaceFraction(geometry, 400)).toBe(0);
    expect(triangles(geometry)).toBeLessThanOrEqual(WALL_BUDGET);
  });

  it('decomposes a band around holes into quads that cover only the solid', () => {
    const quads = stripsAround(-2, 2, 0, 2, [{ outline: [[-1, 0.5], [1, 0.5], [1, 1.5], [-1, 1.5]], depth: 1, minY: 0.5, maxY: 1.5 }]);
    const area = quads.reduce((sum, q) => {
      const [p0, p1, p2, p3] = q;
      return sum + 0.5 * Math.abs((p1[0] - p0[0] + p2[0] - p3[0]) * (p3[1] - p0[1]));
    }, 0);
    expect(area).toBeCloseTo(8 - 2, 9);
  });

  it('caches, and names what is wrong with an opening', () => {
    expect(wall({ width: 4, height: 3 })).toBe(wall({ width: 4, height: 3, thickness: 0.6, openings: [] }));
    expect(wall({ width: 4, height: 3 })).not.toBe(wall({ width: 4, height: 3.1 }));
    expect(() => wall({ width: 4, height: 3, openings: [{ x: 1.5, width: 2, height: 1 }] })).toThrow(/openings\[0\] .* reaches the wall's side/);
    expect(() => wall({ width: 6, height: 3, openings: [{ x: -1, width: 2, height: 1 }, { x: 0.5, width: 2, height: 1 }] })).toThrow(/overlap/);
  });

  it('refuses channels that reach the foot or the top, or overlap, naming the channels the wall would build', () => {
    const at = (start: number, stop: number, course = 1): Parameters<typeof wall>[0] => ({ width: 4, height: 2.1, thickness: 0.5, rustication: { course, joint: 0.1, depth: 0.05, start, stop } });
    expect(() => wall(at(0.03, 1.03)), 'past the foot').toThrow(/channels run from -0.02.* keep them above the wall's foot and below its top at 2.1 m/);
    expect(() => wall(at(0.05, 1.05)), 'its floor on the foot').toThrow(/channels run from 0 to/);
    expect(() => wall(at(1.05, 2.05)), 'its ceiling on the top').toThrow(/keep them above the wall's foot and below its top/);
    expect(() => wall(at(0.5, 0.5, 0.1)), 'a joint as tall as the course').toThrow(/rustication.joint 0.1 must be less than the course 0.1, or the channels overlap/);
    // The last joint built, not `stop`, bounds them: a stop past the top whose joints all lie under it builds.
    expect(wall(at(0.5, 2.2)), 'joints at 0.5 and 1.5 m').toBeDefined();
    expect(wall(at(1.5, 1.4)), 'no joint at all').toBeDefined();
  });
});

describe('arch elements', () => {
  it('archivolt, voussoirs, keystone and spandrels are sound and face the street', () => {
    const parts = { archivolt: archivolt({ span: 5 }), voussoirs: voussoirs({ span: 4 }), keystone: keystone({}), spandrel: spandrel({ span: 4 }) };
    for (const [name, geometry] of Object.entries(parts)) {
      sound(geometry, name);
      expect(backfaceFraction(geometry, 300, 7, { notFromBehind: true })).toBe(0);
      expect(boxOf(geometry).min[2]).toBeGreaterThanOrEqual(-1e-6);
    }
    const box = boxOf(archivolt({ span: 5, band: 0.6 }));
    // Sampled arcs land within a centimetre of the true extrados.
    expect(boxProblems(box, { min: [-3.1, 0, 0], max: [3.1, 3.1, undefined] }, 0.01)).toEqual([]);
    expect(centredProblems(box, 1e-3, 'archivolt', ['x'])).toEqual([]);
  });

  it('validates the arch and the stone count', () => {
    expect(() => archivolt({ span: 4, rise: 3 })).toThrow(/rise 3 is more than half the span 4/);
    expect(() => voussoirs({ span: 4, count: 12 })).toThrow(/odd number/);
    expect(archivolt({ span: 4 })).toBe(archivolt({ span: 4, rise: 2 }));
  });
});

describe('windows, doors and surrounds', () => {
  it.each(['rect', 'arch', 'segmental'] as const)('%s window: frame, bars and glass inside the opening, frame from z = −depth to 0', (shape) => {
    const unit = windowUnit({ width: 2, height: 3.5, shape });
    sound(unit.frame, 'frame');
    sound(unit.bars, 'bars');
    sound(unit.glass, 'glass');
    expect(backfaceFraction(unit.frame, 300)).toBe(0);
    expect(boxProblems(boxOf(unit.frame), { min: [-1, 0, -0.12], max: [1, 3.5, 0] }, 0.01)).toEqual([]);
    const glass = boxOf(unit.glass);
    expect(glass.min[2]).toBeCloseTo(-0.06, 6);
    expect(triangles(unit.frame) + triangles(unit.bars) + triangles(unit.glass)).toBeLessThanOrEqual(WINDOW_BUDGET);
    expect(windowUnit({ width: 2, height: 3.5, shape })).toBe(unit);
  });

  it('door: leaves inside the frame, fanlight glass in an arched head', () => {
    const door = doorUnit({ width: 2.4, height: 5, shape: 'arch' });
    sound(door.frame, 'frame');
    sound(door.leaf, 'leaf');
    expect(door.glass).toBeDefined();
    expect(backfaceFraction(door.leaf, 300)).toBe(0);
    expect(boxOf(door.leaf).max[1]).toBeLessThanOrEqual(5 - 1.2 + 1e-6);
    expect(doorUnit({ width: 1.8, height: 3, fanlight: false }).glass).toBeUndefined();
  });

  it.each(['none', 'cornice', 'triangular', 'segmental'] as const)('surround with a %s head is sound and projects toward +Z', (head) => {
    const geometry = surround({ width: 1.6, height: 3, head });
    sound(geometry, head);
    expect(backfaceFraction(geometry, 300, 7, { notFromBehind: true })).toBe(0);
    const box = boxOf(geometry);
    expect(box.min[2]).toBeGreaterThanOrEqual(-1e-6);
    expect(centredProblems(box, 1e-3, head, ['x'])).toEqual([]);
    expect(triangles(geometry)).toBeLessThanOrEqual(SURROUND_BUDGET);
  });

  it('names a window too small for its frame', () => {
    expect(() => windowUnit({ width: 0.2, height: 2 })).toThrow(/too narrow/);
  });
});
