/**
 * The floor picker's floors (src/viewer/floors.ts): Ground, Main and Second at the frame's levels, then the roof garden; levels and cuts in order, each
 * cut over its floor and under the next one; no floor's cut slicing a slab of the real model; Page Up and Page Down order; the framing; the query.
 * Bound: slabs are building pieces whose world box is at most 1 m thick and at least 12 m² in plan, from the kit's own matrices; a slab drawn as part
 * of a thicker merged piece is not seen, and what a cut does to other pieces is judged in the floor captures.
 */
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../build/kit.js';
import { SEQUENCE } from '../build/sequence.js';
import { GROUND_FLOOR_Y, MAIN_FLOOR_Y, ROOF_GARDEN_Y, SECOND_FLOOR_Y } from '../model/frame.js';
import { ALL_FLOORS, FLOOR_CHOICES, FLOOR_ELEVATION_DEG, FLOORS, floorById, floorPose, floorStep, startFloor } from './floors.js';
import { cutBySection } from './section-cut.js';

/** The model's top: the highest point any piece reaches. */
function modelTop(): number {
  let top = Number.NEGATIVE_INFINITY;
  for (const step of SEQUENCE) {
    for (const piece of collectStep(step).pieces) {
      if (piece.geometry.boundingBox === null) piece.geometry.computeBoundingBox();
      top = Math.max(top, (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix).max.y);
    }
  }
  return top;
}

describe('floors', () => {
  it('lists Ground, Main and Second at the frame\'s levels, then the roof garden, from the lowest up, with unique kebab-case ids', () => {
    expect(FLOORS.map((f) => [f.id, f.level])).toEqual([
      ['ground', GROUND_FLOOR_Y],
      ['main', MAIN_FLOOR_Y],
      ['second', SECOND_FLOOR_Y],
      ['roof-garden', ROOF_GARDEN_Y],
    ]);
    for (const floor of FLOORS) {
      expect(floor.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(floor.label.length).toBeGreaterThan(0);
      expect(floor.name.length).toBeGreaterThan(floor.label.length - 1);
      expect(floorById(floor.id)).toBe(floor);
    }
    expect(FLOOR_CHOICES).toEqual([...FLOORS.map((f) => f.id), ALL_FLOORS]);
  });

  it('orders levels and cuts, each cut a storey over its own floor and under the next floor\'s level, the top one under the model\'s top', () => {
    const top = modelTop();
    FLOORS.forEach((floor, i) => {
      const next = FLOORS[i + 1];
      expect(floor.cut - floor.level, `${floor.id}: cut over its level`).toBeGreaterThan(1.7);
      expect(floor.cut, `${floor.id}: cut under the next floor's level or the model's top`).toBeLessThan(next?.level ?? top);
      if (next !== undefined) expect(next.cut, `${next.id} cut over ${floor.id}'s`).toBeGreaterThan(floor.cut);
      const { area } = floor;
      expect(area.maxX - area.minX).toBeGreaterThan(10);
      expect(area.maxZ - area.minZ).toBeGreaterThan(10);
    });
  });

  it('slices no slab of the model with any floor\'s cut, so no floor lies under a plate of the cut colour', () => {
    const sliced: string[] = [];
    for (const step of SEQUENCE) {
      for (const [k, piece] of collectStep(step).pieces.entries()) {
        const material = piece.material;
        if (!cutBySection(material) || material.transparent) continue;
        if (piece.geometry.boundingBox === null) piece.geometry.computeBoundingBox();
        const box = (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        if (box.max.y - box.min.y > 1 || (box.max.x - box.min.x) * (box.max.z - box.min.z) < 12) continue;
        for (const floor of FLOORS) {
          if (box.min.y < floor.cut && box.max.y > floor.cut) sliced.push(`${floor.id} cut ${String(floor.cut)} m slices ${step.id} piece ${String(k)} (${material.name}, ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)} m)`);
        }
      }
    }
    expect(sliced).toEqual([]);
  });

  it('steps up and down through the floors and All, All above the top floor, staying put at either end', () => {
    expect(floorStep(ALL_FLOORS, -1)).toBe('roof-garden');
    expect(floorStep('roof-garden', -1)).toBe('second');
    expect(floorStep('second', -1)).toBe('main');
    expect(floorStep('main', -1)).toBe('ground');
    expect(floorStep('ground', -1)).toBe('ground');
    expect(floorStep('ground', 1)).toBe('main');
    expect(floorStep('second', 1)).toBe('roof-garden');
    expect(floorStep('roof-garden', 1)).toBe(ALL_FLOORS);
    expect(floorStep(ALL_FLOORS, 1)).toBe(ALL_FLOORS);
    expect(floorStep('no-such-floor', -1)).toBe('roof-garden');
  });

  it('frames a floor from above at its elevation, keeping the orbit\'s horizontal direction, with the whole storey in view', () => {
    const aspect = 16 / 9;
    for (const floor of FLOORS) {
      for (const azimuth of [0.3, 2.0, -2.6, Math.PI]) {
        const from = { position: new Vector3(Math.cos(azimuth) * 80, 40, Math.sin(azimuth) * 80).add(new Vector3(5, 0, -60)), target: new Vector3(5, 0, -60) };
        const pose = floorPose(floor, from, aspect);
        const offset = pose.position.clone().sub(pose.target);
        expect(Math.atan2(offset.z, offset.x), `${floor.id} azimuth`).toBeCloseTo(azimuth, 9);
        expect(Math.atan2(offset.y, Math.hypot(offset.x, offset.z)) * (180 / Math.PI), `${floor.id} elevation`).toBeCloseTo(FLOOR_ELEVATION_DEG, 9);
        const camera = new PerspectiveCamera(pose.fov, aspect, 0.1, 1e5);
        camera.position.copy(pose.position);
        camera.lookAt(pose.target);
        camera.updateMatrixWorld();
        const { area } = floor;
        for (const x of [area.minX, area.maxX]) {
          for (const y of [floor.level, floor.cut]) {
            for (const z of [area.minZ, area.maxZ]) {
              const p = new Vector3(x, y, z).project(camera);
              expect(Math.max(Math.abs(p.x), Math.abs(p.y)), `${floor.id}: corner ${String(x)}, ${String(y)}, ${String(z)} in view`).toBeLessThanOrEqual(1 + 1e-9);
            }
          }
        }
      }
    }
    // Straight down there is no horizontal direction to keep; it frames from the north-east.
    const pose = floorPose(FLOORS[0] ?? (() => { throw new Error('no floors'); })(), { position: new Vector3(0, 100, 0), target: new Vector3(0, 0, 0) }, aspect);
    expect(Math.atan2(pose.position.z - pose.target.z, pose.position.x - pose.target.x)).toBeCloseTo(Math.PI / 4, 9);
  });

  it('starts on the query\'s floor, ignoring with a warning one that names no floor or comes with walk=1', () => {
    expect(startFloor(null, false)).toEqual({ floor: null, warning: null });
    expect(startFloor(ALL_FLOORS, false)).toEqual({ floor: null, warning: null });
    expect(startFloor('main', false)).toEqual({ floor: floorById('main'), warning: null });
    expect(startFloor('attic', false)).toEqual({ floor: null, warning: 'Query parameter floor="attic" names no floor; use one of ground, main, second, roof-garden, all. It is ignored.' });
    expect(startFloor('main', true)).toEqual({ floor: null, warning: 'Query parameter floor="main" takes effect only in the orbit view, and walk=1 starts in walk mode. It is ignored.' });
  });
});
