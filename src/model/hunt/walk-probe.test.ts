/**
 * The walk probe on fixtures (walk-probe.ts), checked before the route tests trust it: it climbs a step it can climb and stops at one it cannot, bridges a
 * gap narrower than its footprint and falls into a wider one, stops where the floor ends, and stops at a wall, a thin pane and a bar at chest height, while
 * it passes a bar over its head, a low rail and a pane whose material is passable. Each fixture is one step of boxes in a Timeline at t = N, on a floor
 * at Y 0 over a lower floor at Y −3, walked along +X from X 0 to 10 at Z 0.
 * Bound: axis-aligned boxes walked square on; the model's own geometry is walked in routes.test.ts.
 */
import { MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { Timeline } from '../../build/timeline.js';
import type { StepDef, Vec3 } from '../../build/types.js';
import { box } from './shapes.js';
import { Solids, walk, WALKER } from './walk-probe.js';
import type { Walk } from './walk-probe.js';

const stone = new MeshStandardMaterial({ name: 'stone' });
const open = new MeshStandardMaterial({ name: 'open' });
open.userData['solid'] = false;

type Block = readonly [Vec3, Vec3, Material?];

/** The walking floor in two parts with a gap of `gap` metres at X 4, over a floor 3 m lower. */
function floor(gap = 0): Block[] {
  const base: Block[] = [[[-1, -3.2, -2], [11, -3, 2]]];
  if (gap === 0) return [...base, [[-1, -0.2, -2], [11, 0, 2]]];
  return [...base, [[-1, -0.2, -2], [4, 0, 2]], [[4 + gap, -0.2, -2], [11, 0, 2]]];
}

/** The walker stops at the first 5 cm sample past the point where it first touches an obstacle. */
function stoppedAt(result: Walk, contact: number): void {
  expect(result.end.x, `stopped at X ${result.end.x.toFixed(3)}, touching at ${contact.toFixed(3)}`).toBeGreaterThanOrEqual(contact - 1e-9);
  expect(result.end.x, `stopped at X ${result.end.x.toFixed(3)}, touching at ${contact.toFixed(3)}`).toBeLessThanOrEqual(contact + 0.05 + 1e-9);
}

function walkOver(blocks: readonly Block[]): Walk {
  const step: StepDef = {
    id: 'probe-fixture',
    chapter: 'site',
    title: 'Probe fixture',
    motion: { kind: 'rise' },
    build(kit) {
      for (const [min, max, material] of blocks) box(kit, material ?? stone, min, max);
    },
  };
  const timeline = new Timeline([step]);
  timeline.evaluate(timeline.n);
  return walk(new Solids(timeline, { min: [-5, -5, -5], max: [15, 5, 5] }), [[0, 0], [10, 0]], 0);
}

describe('the walk probe', () => {
  it('climbs a 0.30 m block and comes down it, but stops at a 0.40 m one', () => {
    const low = walkOver([...floor(), [[4, 0, -2], [6, 0.3, 2]]]);
    expect(low.failure).toBeUndefined();
    expect(low.maxRise).toBeCloseTo(0.3, 5);
    expect(low.maxDrop).toBeCloseTo(0.3, 5);
    const high = walkOver([...floor(), [[4, 0, -2], [6, 0.4, 2]]]);
    expect(high.failure).toMatch(/^blocked at/);
    stoppedAt(high, 4 - WALKER.radius);
  });

  it('bridges a 0.5 m gap, falls into a 0.8 m one and stops where the floor ends', () => {
    expect(walkOver(floor(0.5)).failure).toBeUndefined();
    expect(walkOver(floor(0.8)).failure).toMatch(/^a drop of 3\.000 m/);
    expect(walkOver([[[-1, -0.2, -2], [6, 0, 2]]]).failure).toMatch(/^no solid surface under \(6\.3/);
  });

  it('stops at a wall, a 2 cm pane and a 5 cm bar 1.6 m up, where it first touches each', () => {
    const { radius: r, height: h } = WALKER;
    // The bar's lower edge at 1.6 m meets the top hemisphere (centre h − r up) at this plan distance from the walker's axis.
    const barReach = Math.sqrt(r * r - (1.6 - (h - r)) ** 2);
    for (const [obstacle, contact] of [
      [[[5, 0, -2], [5.3, 3, 2]], 5 - r],
      [[[5, 0, -2], [5.02, 3, 2]], 5 - r],
      [[[5, 1.6, -2], [5.05, 1.65, 2]], 5 - barReach],
    ] as const) {
      const result = walkOver([...floor(), obstacle]);
      expect(result.failure, JSON.stringify(obstacle)).toMatch(/^blocked at .*probe-fixture \/ stone/);
      stoppedAt(result, contact);
    }
  });

  it('passes a bar over its head, a 9 cm rail underfoot and a passable pane', () => {
    expect(walkOver([...floor(), [[5, 1.8, -2], [5.05, 1.85, 2]]]).failure).toBeUndefined();
    expect(walkOver([...floor(), [[5, 0, -2], [5.05, 0.09, 2]]]).failure).toBeUndefined();
    expect(walkOver([...floor(), [[5, 0, -2], [5.02, 3, 2], open]]).failure).toBeUndefined();
  });
});
