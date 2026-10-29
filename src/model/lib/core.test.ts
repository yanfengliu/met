/**
 * The shared machinery under every part: cache keys, the mesh builder, profile rings, sweeps, lathes and `along`.
 * `MeshBuilder.grid`'s `flattest` split is read on a quad either way round, smooth and flat.
 * Bound: geometry is checked through its attribute arrays (finite, unit normals, winding agrees with normals, bounds); appearance is the gallery's job.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { along } from './along.js';
import { MeshBuilder } from './builder.js';
import type { GridOptions } from './builder.js';
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

describe('mesh builder grid', () => {
  // The diagonal two triangles of a one-quad grid share, by its ends' positions: from its first corner to its third, or from its second to its fourth.
  const diagonal = (rows: THREE.Vector3[][], options: GridOptions): string => {
    const builder = new MeshBuilder();
    builder.grid(rows, options);
    const geometry = builder.build();
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const key = (k: number): string => {
      const v = new THREE.Vector3().fromBufferAttribute(position, index?.getX(k) ?? k);
      return v.toArray().map((x) => x.toFixed(3)).join(',');
    };
    const seen = new Map<string, number>();
    for (let t = 0; t + 2 < (index?.count ?? position.count); t += 3) {
      for (const [p, q] of [[t, t + 1], [t + 1, t + 2], [t + 2, t]]) {
        const edge = [key(p ?? 0), key(q ?? 0)].sort().join(' ');
        seen.set(edge, (seen.get(edge) ?? 0) + 1);
      }
    }
    const shared = [...seen].filter(([, n]) => n === 2).map(([edge]) => edge);
    const [a, b, c, d] = [rows[0]?.[0], rows[0]?.[1], rows[1]?.[1], rows[1]?.[0]].map((v) => v?.toArray().map((x) => x.toFixed(3)).join(',') ?? '');
    return shared.length === 1 && shared[0] === [a, c].sort().join(' ') ? 'ac' : shared.length === 1 && shared[0] === [b, d].sort().join(' ') ? 'bd' : `none of them: ${shared.join('; ')}`;
  };

  it('splits each quad along the diagonal that folds it least when asked, smooth or flat, either way round, and as before when not', () => {
    const [a, b, d] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];
    // Its third corner raised, a quad folds least from its second corner to its fourth; its second corner raised, from its first to its third.
    const raisedC = [[a, b], [d, new THREE.Vector3(1, 1, 1)]];
    const raisedB = [[a, new THREE.Vector3(1, 0, 1)], [d, new THREE.Vector3(1, 1, 0)]];
    for (const flip of [false, true]) {
      for (const flat of [false, true]) {
        expect(diagonal(raisedC, { flip, flat }), `flip ${String(flip)}, flat ${String(flat)}`).toBe(flat && flip ? 'bd' : 'ac');
        expect(diagonal(raisedC, { flip, flat, flattest: true }), `flattest, flip ${String(flip)}, flat ${String(flat)}`).toBe('bd');
        expect(diagonal(raisedB, { flip, flat, flattest: true }), `flattest, flip ${String(flip)}, flat ${String(flat)}`).toBe('ac');
      }
    }
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
