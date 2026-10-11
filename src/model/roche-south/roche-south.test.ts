/**
 * The Roche south area, headless (src/build/kit.ts collectStep, src/build/timeline.ts Timeline): its step ids, titles and chapters, that every
 * vertex of every piece lies in the area's blocks, its budget, and no NaN.
 * Bounds of what green proves: containment is checked on every vertex of every placed geometry against the union of the four block polygons of
 * docs/research/exterior.md section 2 (src/model/roche-south/blocks.ts), with the brief's 0.3 m tolerance, so a piece may cross between two of
 * this area's own blocks but not into another area's; it says nothing about which of the area's blocks a piece belongs to. Budgets are the brief's
 * (450,000 triangles counting instances, 150 instanced meshes, 1 step light), counted by Timeline.stats() on this area's steps alone.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { BLOCK_TOLERANCE, BLOCKS } from './blocks.js';
import { lehmanSteps, rocheSouthSteps } from './index.js';
import { within, type P2 } from './poly.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALL: readonly StepDef[] = [...lehmanSteps, ...rocheSouthSteps];
const POLYGONS = Object.values(BLOCKS);

function inArea(p: P2): boolean {
  return POLYGONS.some((polygon) => within(polygon, p, BLOCK_TOLERANCE));
}

describe('roche-south steps', () => {
  it('have unique kebab-case ids, titles of at most 48 characters, details of at most 200 and their chapters', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail ?? '').length > 200).map((s) => s.id)).toEqual([]);
    expect(lehmanSteps.every((s) => s.chapter === 'roche-steps-lehman-1975')).toBe(true);
    expect(rocheSouthSteps.every((s) => s.chapter === 'roche-south-1990')).toBe(true);
  });

  it('build the Lehman Wing in the order the brief gives: foundations, walls, court, stairs, ring walls, and the pyramid last', () => {
    const ids = lehmanSteps.map((s) => s.id);
    const order = ['lehman-foundations', 'lehman-walls', 'lehman-court-floor', 'lehman-court-stairs', 'lehman-ring-walls', 'lehman-pyramid'].map((id) => ids.indexOf(id));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ids[ids.length - 1]).toBe('lehman-pyramid');
  });

  it('place every vertex inside the area blocks, finite', () => {
    const outside: string[] = [];
    const v = new Vector3();
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, index) => {
        const position = piece.geometry.getAttribute('position');
        for (let k = 0; k < position.count; k++) {
          v.fromBufferAttribute(position, k).applyMatrix4(piece.matrix);
          if (![v.x, v.y, v.z].every(Number.isFinite) || !inArea([v.x, v.z]) || v.y < -30 || v.y > 120) {
            outside.push(`${step.id} piece ${String(index)} vertex (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
            break;
          }
        }
      });
    }
    expect(outside.slice(0, 20)).toEqual([]);
  });

  it('stay within 450,000 triangles, 150 instanced meshes and 1 step light, with no NaN matrix', () => {
    const timeline = new Timeline(ALL);
    const stats = timeline.stats();
    expect(stats.triangles).toBeLessThanOrEqual(450_000);
    expect(stats.meshes).toBeLessThanOrEqual(150);
    expect(stats.lights).toBeLessThanOrEqual(1);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
  });
});
