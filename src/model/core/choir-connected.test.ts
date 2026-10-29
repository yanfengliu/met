/**
 * The Valladolid choir screen holds together (docs/learning/gate-proofs.md, "A rebuilt ornament's joints can float with every gate green"): the screen
 * step's pieces as the kit gives them (src/model/core/choir-screen.ts), each placed by hand from measured heights, joined wherever two lie within 1 mm
 * by the exact distance between their world meshes (three-mesh-bvh `closestPointToGeometry`), form one group, and that group stands on the hall floor.
 * Bound: pieces within 1 mm count as joined, so a gap under 1 mm passes; a piece joins by its nearest point, so one touching by a corner counts as one
 * resting on a face; a piece's own parts are not read apart; the floor is the hall floor's level (`L1`) under the lowest piece, not the floor step.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { HitPointInfo } from 'three-mesh-bvh';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { L1 } from './constants.js';
import { medievalHallSteps } from './index.js';

/** Pieces nearer than this are joined (metres). */
const TOUCH = 0.001;
const STEP = 'medieval-hall-choir-screen';

interface WorldPiece {
  readonly index: number;
  readonly name: string;
  readonly geometry: BufferGeometry;
  readonly box: Box3;
  readonly bvh: MeshBVH;
}

const hitInfo = (): HitPointInfo => ({ point: new Vector3(), distance: 0, faceIndex: 0 });
const span = (box: Box3): string => (['x', 'y', 'z'] as const).map((a) => `${a} ${box.min[a].toFixed(3)}..${box.max[a].toFixed(3)}`).join(', ');

describe('the Valladolid choir screen', () => {
  it('is one group of pieces, each within 1 mm of another, standing on the hall floor', () => {
    const step = medievalHallSteps.find((s) => s.id === STEP);
    if (step === undefined) throw new Error(`No core step has the id "${STEP}"; the choir screen is built by src/model/core/later.ts.`);
    const pieces: WorldPiece[] = collectStep(step).pieces.map((p, index) => {
      const geometry = p.geometry.clone().applyMatrix4(p.matrix);
      geometry.computeBoundingBox();
      return { index, name: p.material.name, geometry, box: (geometry.boundingBox ?? new Box3()).clone(), bvh: new MeshBVH(geometry) };
    });
    // Union-find over the pieces, each pointing up its tree to its group's root.
    const up = pieces.map((_, i) => i);
    const root = (i: number): number => {
      let r = i;
      while ((up[r] ?? r) !== r) r = up[r] ?? r;
      up[i] = r;
      return r;
    };
    const same = new Matrix4();
    const [near, far] = [hitInfo(), hitInfo()];
    pieces.forEach((a, i) => {
      const reach = a.box.clone().expandByScalar(TOUCH);
      for (let j = i + 1; j < pieces.length; j += 1) {
        const b = pieces[j];
        if (b === undefined || !reach.intersectsBox(b.box) || root(i) === root(j)) continue;
        // The threshold only prunes the search by bounds: a nearest pair farther than it can still come back, so its distance is read.
        const hit = a.bvh.closestPointToGeometry(b.geometry, same, near, far, 0, TOUCH);
        if (hit !== null && hit.distance <= TOUCH) up[root(i)] = root(j);
      }
    });
    const groups = new Map<number, WorldPiece[]>();
    for (const p of pieces) groups.set(root(p.index), [...(groups.get(root(p.index)) ?? []), p]);
    const sorted = [...groups.values()].sort((g, h) => h.length - g.length);
    const apart = sorted.slice(1).map((g) => g.map((p) => `#${String(p.index)} (${p.name}) at ${span(p.box)}`).join('; '));
    expect(apart, `${String(sorted.length)} groups of the screen's ${String(pieces.length)} pieces; each listed group touches no other piece within 1 mm: move it onto what carries it`).toEqual([]);
    const lowest = Math.min(...pieces.map((p) => p.box.min.y));
    expect(lowest - L1, `the screen's lowest point stands ${(lowest - L1).toFixed(4)} m from the hall floor's level`).toBeCloseTo(0, 3);
  });
});
