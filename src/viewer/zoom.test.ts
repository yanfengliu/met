/**
 * One zoom step (src/viewer/zoom.ts, `dollyStep`) and the wheel's factor, on numbers only: toward a surface every step moves at least ZOOM.minStep
 * or a tenth of the way, the camera stops ZOOM.stop short of the surface along the pointer ray and keeps its view direction; over open sky it flies
 * on; out, it stops with the target ZOOM.maxDistance away; either bound gives way to the other direction.
 * Bound: the distance to the surface is given here; the page's pick (src/viewer/pick.ts) and real wheel input are in tests/e2e/zoom.spec.ts.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { ZOOM, dollyStep, wheelFactor } from './zoom.js';

const IN = 1 - ZOOM.notch;
const OUT = 1 / IN;

describe('dollyStep', () => {
  it('walks in to ZOOM.stop short of the surface, every step at least ZOOM.minStep or a tenth of the way, then stops', () => {
    let position = new Vector3(0, 0, 100);
    let target = new Vector3(0, 0, 0);
    const direction = new Vector3(0, 0, -1);
    const surface = 0;
    let steps = 0;
    for (;;) {
      const hit = position.z - surface;
      const next = dollyStep(position, target, direction, hit, IN);
      if (next === null) break;
      const moved = position.distanceTo(next.position);
      expect(moved, `step ${String(steps)} at ${hit.toFixed(3)} m`).toBeGreaterThanOrEqual(Math.min(Math.max(ZOOM.minStep, ZOOM.notch * hit), hit - ZOOM.stop) - 1e-9);
      // The target sits on the surface under the pointer, which the camera never comes closer to than ZOOM.stop.
      expect(next.target.z).toBeCloseTo(surface, 9);
      expect(next.position.z - surface).toBeGreaterThanOrEqual(ZOOM.stop - 1e-9);
      position = next.position;
      target = next.target;
      steps += 1;
      expect(steps).toBeLessThan(200);
    }
    expect(position.z).toBeCloseTo(surface + ZOOM.stop, 9);
    const back = dollyStep(position, target, direction, ZOOM.stop, OUT);
    expect(back?.position.distanceTo(position), 'one step out from the near bound').toBeGreaterThanOrEqual(ZOOM.minStep - 1e-9);
  });

  it('moves along the pointer ray and keeps the view direction when the pointer is off the axis', () => {
    const position = new Vector3(0, 10, 50);
    const target = new Vector3(0, 10, 0);
    const direction = new Vector3(0.3, -0.1, -1).normalize();
    const next = dollyStep(position, target, direction, 40, IN);
    if (next === null) throw new Error('no step');
    const moved = next.position.clone().sub(position).normalize();
    expect(moved.distanceTo(direction)).toBeLessThan(1e-9);
    const axis = next.target.clone().sub(next.position).normalize();
    expect(axis.distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-9);
  });

  it('flies on over open sky, keeping the target at least ZOOM.flyDepth ahead', () => {
    let position = new Vector3(0, 0, 0);
    let target = new Vector3(0, 0, -2);
    const direction = new Vector3(0, 0, -1);
    for (let k = 0; k < 20; k += 1) {
      const next = dollyStep(position, target, direction, null, IN);
      if (next === null) throw new Error(`step ${String(k)} over open sky stopped`);
      expect(position.distanceTo(next.position)).toBeGreaterThanOrEqual(ZOOM.minStep);
      expect(next.position.distanceTo(next.target)).toBeGreaterThanOrEqual(ZOOM.flyDepth - 1e-9);
      position = next.position;
      target = next.target;
    }
  });

  it('zooms out to ZOOM.maxDistance from the target, stops there, and zooms in again', () => {
    let position = new Vector3(0, 0, 50);
    let target = new Vector3(0, 0, 0);
    const direction = new Vector3(0, 0, -1);
    for (let k = 0; k < 100; k += 1) {
      const next = dollyStep(position, target, direction, null, OUT);
      if (next === null) break;
      expect(position.distanceTo(next.position)).toBeGreaterThanOrEqual(ZOOM.minStep - 1e-9);
      position = next.position;
      target = next.target;
    }
    expect(position.distanceTo(target)).toBeCloseTo(ZOOM.maxDistance, 6);
    expect(dollyStep(position, target, direction, null, OUT)).toBeNull();
    const back = dollyStep(position, target, direction, ZOOM.maxDistance, IN);
    expect(back?.position.distanceTo(position)).toBeGreaterThan(ZOOM.minStep);
  });
});

describe('wheelFactor', () => {
  it('zooms in by ZOOM.notch per notch of 100 pixels up and out by the inverse down, lines and pages scaled to pixels', () => {
    expect(wheelFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false })).toBeCloseTo(IN, 12);
    expect(wheelFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false })).toBeCloseTo(OUT, 12);
    expect(wheelFactor({ deltaY: -3, deltaMode: 1, ctrlKey: false })).toBeCloseTo(Math.pow(IN, 1.2), 12);
    expect(wheelFactor({ deltaY: 0, deltaMode: 0, ctrlKey: false })).toBe(1);
    expect(wheelFactor({ deltaY: -10, deltaMode: 0, ctrlKey: true })).toBeCloseTo(Math.pow(IN, 0.5), 12);
  });
});
