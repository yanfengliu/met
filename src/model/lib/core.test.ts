/**
 * The shared machinery under every part: cache keys, the mesh builder, profile rings, sweeps, lathes and `along`.
 * Bound: geometry is checked through its attribute arrays (finite, unit normals, winding agrees with normals, bounds); appearance is the gallery's job.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { along } from './along.js';
import { MeshBuilder } from './builder.js';
import { cached, canonical } from './cache.js';
import { attributeProblems, boxOf, boxProblems, invertedFraction, triangles } from './check.js';
import { ProfilePen, ringOf } from './profile.js';
import { lathe, sweep } from './sweep.js';

const square = new ProfilePen(0, 0).to(0.2, 0).to(0.2, 0.3).to(0, 0.3).close();

describe('cache keys', () => {
  it('ignores key order and undefined members and rounds float noise to a micrometre', () => {
    expect(canonical({ b: 1, a: [1, 2], c: undefined })).toBe(canonical({ a: [1, 2], b: 1 }));
    expect(canonical({ w: 0.1 + 0.2 })).toBe(canonical({ w: 0.3 }));
    expect(canonical({ w: 0.3 })).not.toBe(canonical({ w: 0.300002 }));
  });

  it('rejects a non-finite number and names it', () => {
    expect(() => canonical({ width: Number.NaN })).toThrow(/params\.width is NaN/);
  });

  it('builds once per key', () => {
    let builds = 0;
    const make = (w: number): object => cached('core-test', { w }, () => ({ built: ++builds }));
    expect(make(1)).toBe(make(1));
    expect(make(1)).not.toBe(make(2));
    expect(builds).toBe(2);
  });
});

describe('profile rings', () => {
  it('splits normals at a right angle and shares them on a gentle curve', () => {
    const ring = ringOf(square);
    expect(ring.verts).toHaveLength(8);
    expect(ring.edges).toHaveLength(4);
    const arc = new ProfilePen(0, 0).quarter(0.1, 0.1, true, 8).open();
    expect(ringOf(arc).verts).toHaveLength(9);
  });
});

describe('sweep', () => {
  it('carries a closed profile along an open path with outward fronts, caps and the right bounds', () => {
    const geometry = sweep(square, [
      [-1, 0, 0],
      [1, 0, 0],
    ]);
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-1, 0, 0], max: [1, 0.3, 0.2] })).toEqual([]);
  });

  it('mitres a closed counter-clockwise loop with the profile outside', () => {
    const loop = [
      [-1, 0, 1],
      [1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
    ] as const;
    const geometry = sweep(square, loop, { closed: true });
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-1.2, 0, -1.2], max: [1.2, 0.3, 1.2] })).toEqual([]);
    expect(triangles(geometry)).toBe(4 * 4 * 2);
  });

  it('refuses a bend tighter than the profile reaches across the path, which would fold the surface through itself', () => {
    // Clockwise seen from above, so the profile, 0.2 m across, runs inside: each corner's mitres take 0.2 m from both ends of a side.
    const loop = (side: number): [number, number, number][] => [
      [0, 0, 0],
      [side, 0, 0],
      [side, 0, side],
      [0, 0, side],
    ];
    expect(() => sweep(square, loop(0.3), { closed: true })).toThrow(/^sweep: the path bends too tightly for the profile at points 0 and 1: the profile's point 0\.2000 across the path runs 0\.1000 m back along that 0\.3000 m segment/);
    expect(() => sweep(square, loop(0.5), { closed: true })).not.toThrow();
  });
});

describe('lathe', () => {
  it('revolves a solid with closed poles and outward fronts', () => {
    const profile = new ProfilePen(0, 0).to(0.5, 0).to(0.5, 1).to(0, 1).close();
    const geometry = lathe(profile, { segments: 16 });
    expect(attributeProblems(geometry)).toEqual([]);
    expect(invertedFraction(geometry)).toBe(0);
    expect(boxProblems(boxOf(geometry), { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] }, 0.02)).toEqual([]);
  });
});

describe('mesh builder', () => {
  it('flips the winding of a mirrored copy so fronts stay in front', () => {
    const source = new MeshBuilder();
    source.box([0, 0, 0], [1, 1, 1]);
    const target = new MeshBuilder();
    target.append(source.build(), new THREE.Matrix4().makeScale(-1, 1, 1));
    expect(invertedFraction(target.build())).toBe(0);
  });
});

describe('along', () => {
  it('spreads items evenly between the margins with +Z pointing right of travel', () => {
    const matrices = along(
      [
        [0, 0, 0],
        [10, 0, 0],
      ],
      1,
      { margin: 0.5, outward: 0.2, y: 3 },
    );
    expect(matrices).toHaveLength(10);
    const p = new THREE.Vector3().setFromMatrixPosition(matrices[0] ?? new THREE.Matrix4());
    expect(p.toArray()).toEqual([0.5, 3, 0.2]);
    const z = new THREE.Vector3(0, 0, 1).transformDirection(matrices[0] ?? new THREE.Matrix4());
    expect(z.z).toBeCloseTo(1);
  });

  it('adds one item per interior corner on the bisector', () => {
    const matrices = along(
      [
        [0, 0, 0],
        [4, 0, 0],
        [4, 0, -4],
      ],
      1,
      { corners: true },
    );
    expect(matrices).toHaveLength(9);
  });
});
