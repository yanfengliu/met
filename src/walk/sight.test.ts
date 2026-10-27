/**
 * Lines of sight (src/walk/sight.ts) on a fixture built through the page's own collision path: a floor and a wall 0.8 m thick and 3 m high centred on
 * X 0. A line through the wall's middle is blocked: the check of 69cfa11, a 2 cm capsule pushed out of what it meets (`CollisionWorld.resolveCapsule`),
 * read it clear, as the wall's faces pushed it opposite ways and the pushes cancelled (work unit 2, review 12, F41). Lines near a face or the wall's top
 * keep 2 cm of clearance.
 * Bound: one axis-aligned wall; the real model is looked through in src/model/reach.test.ts.
 */
import { BoxGeometry, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../build/chapters.js';
import { Timeline } from '../build/timeline.js';
import type { Kit } from '../build/types.js';
import { GeometryBvhs } from './bvh-cache.js';
import { collisionMeshes } from './collision.js';
import { SightLines } from './sight.js';

const cube = new BoxGeometry(1, 1, 1);
const stone = new MeshStandardMaterial({ name: 'stone' });

function block(kit: Kit, min: readonly [number, number, number], max: readonly [number, number, number]): void {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  kit.add(cube, stone, new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0, y1 - y0, z1 - z0)));
}

function sight(): SightLines {
  const timeline = new Timeline([
    {
      id: 'wall',
      chapter: CHAPTERS[0].id,
      title: 'wall',
      motion: { kind: 'rise' },
      build(kit) {
        block(kit, [-6, -0.2, -6], [6, 0, 6]);
        block(kit, [-0.4, 0, -5], [0.4, 3, 5]);
      },
    },
  ]);
  timeline.evaluate(1);
  return new SightLines(collisionMeshes(timeline.steps, 1), new GeometryBvhs());
}

const v = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

describe('lines of sight', () => {
  const lines = sight();

  it('are blocked through the middle of a 0.8 m wall, and through it off its middle', () => {
    expect(lines.clear(v(-2, 1.6, 0.2), v(2, 1.6, 0.2), 0.02)).toBe(false);
    expect(lines.clear(v(-2, 1.6, 0.2), v(3, 1.2, -1), 0.02)).toBe(false);
  });

  it('are clear on one side of the wall, and over it', () => {
    expect(lines.clear(v(-3, 1.6, 0.2), v(-0.5, 1.6, 2), 0.02)).toBe(true);
    expect(lines.clear(v(-2, 3.5, 0.2), v(2, 3.5, 0.2), 0.02)).toBe(true);
  });

  it('keep their clearance from a face and from the wall’s top', () => {
    expect(lines.clear(v(-3, 1.6, 0), v(-0.41, 1.6, 0), 0.02), 'ending 1 cm from the face').toBe(false);
    expect(lines.clear(v(-3, 1.6, 0), v(-0.43, 1.6, 0), 0.02), 'ending 3 cm from it').toBe(true);
    expect(lines.clear(v(-2, 3.01, 0), v(2, 3.01, 0), 0.02), '1 cm over the top').toBe(false);
    expect(lines.clear(v(-2, 3.03, 0), v(2, 3.03, 0), 0.02), '3 cm over it').toBe(true);
  });
});
