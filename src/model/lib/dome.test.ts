/**
 * Domes, drums, pendentives and barrel vaults.
 * Bound: geometry arrays only; whether a saucer dome reads like the Great Hall's is judged on captures.
 */
import { Vector3 } from 'three';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { attributeProblems, backfaceFraction, boxOf, boxProblems, centredProblems, invertedFraction, triangles } from './check.js';
import { barrelVault, dome, drum, pendentives } from './dome.js';
import { inwardAlong } from './facing.js';

/** A 14 m saucer dome at medium detail: smooth enough at interior distances without dominating a step's budget. */
const DOME_BUDGET = 6_000;
const VAULT_BUDGET = 2_500;

function sound(geometry: THREE.BufferGeometry, name: string): void {
  expect(attributeProblems(geometry, name)).toEqual([]);
  expect(invertedFraction(geometry)).toBe(0);
}

/** The edges of `geometry`, its corners welded to 1 µm, that an odd number of its faces bear: none where every part meets the next edge to edge. */
function oddEdges(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const key = (j: number): string => [position.getX(j), position.getY(j), position.getZ(j)].map((v) => Math.round(v * 1e6)).join(',');
  const count = new Map<string, number>();
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    const corners = [0, 1, 2].map((i) => key(index === null ? k + i : index.getX(k + i)));
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % 3] ?? p;
      const edge = p < q ? `${p}|${q}` : `${q}|${p}`;
      count.set(edge, (count.get(edge) ?? 0) + 1);
    });
  }
  return [...count.values()].filter((n) => n % 2 === 1).length;
}

/**
 * The coffer floors of a vault whose inner face is a circle of `radius` about the Z axis, the floors `depth` farther out: the faces whose three corners
 * stand radius + depth from the axis. Each face is half a floor, split along a diagonal, so it spans its floor's width and length. Returns their number,
 * how many face away from the axis, the narrowest one's width on the inner face (the angle its corners span about the axis, times `radius`) and the
 * shortest one's length.
 */
function floorsOf(geometry: THREE.BufferGeometry, radius: number, depth: number): { faces: number; away: number; width: number; length: number } {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const found = { faces: 0, away: 0, width: Infinity, length: Infinity };
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    const [a, b, c] = [0, 1, 2].map((i) => new Vector3().fromBufferAttribute(position, index === null ? k + i : index.getX(k + i)));
    if (a === undefined || b === undefined || c === undefined || ![a, b, c].every((p) => Math.abs(Math.hypot(p.x, p.y) - radius - depth) < 1e-5)) continue;
    found.faces += 1;
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    if (normal.x * (a.x + b.x + c.x) + normal.y * (a.y + b.y + c.y) > 0) found.away += 1;
    const angles = [a, b, c].map((p) => Math.atan2(p.y, p.x));
    found.width = Math.min(found.width, (Math.max(...angles) - Math.min(...angles)) * radius);
    found.length = Math.min(found.length, Math.max(a.z, b.z, c.z) - Math.min(a.z, b.z, c.z));
  }
  return found;
}

/** The message `build` throws, or '' when it builds. */
function refusal(build: () => unknown): string {
  try {
    build();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return '';
}

describe('dome', () => {
  it('hemisphere: springs from y = 0, crown at radius + thickness, closed from every side', () => {
    const geometry = dome({ radius: 6, thickness: 0.4 });
    sound(geometry, 'dome');
    expect(backfaceFraction(geometry, 400)).toBe(0);
    const box = boxOf(geometry);
    expect(boxProblems(box, { min: [undefined, 0, undefined], max: [undefined, 6.4, undefined] }, 1e-3)).toEqual([]);
    expect(centredProblems(box, 0.01)).toEqual([]);
  });

  it('saucer with oculus and ribs, inside or out, stays sound and within budget', () => {
    for (const ribsInside of [false, true]) {
      const geometry = dome({ radius: 7, rise: 2.4, oculus: 1.4, ribs: { count: 12 }, ribsInside });
      sound(geometry, 'saucer');
      expect(backfaceFraction(geometry, 400)).toBe(0);
      expect(boxOf(geometry).min[1]).toBeCloseTo(0, 3);
      expect(triangles(geometry)).toBeLessThanOrEqual(DOME_BUDGET);
    }
  });

  it('drum: as tall as asked, outer radius at least radius + thickness', () => {
    const geometry = drum({ radius: 6, height: 3, thickness: 0.6 });
    sound(geometry, 'drum');
    expect(backfaceFraction(geometry, 300)).toBe(0);
    const box = boxOf(geometry);
    expect(box.max[1]).toBeCloseTo(3, 6);
    expect(box.max[0]).toBeGreaterThanOrEqual(6.6 - 0.02);
  });

  it('caches and validates', () => {
    expect(dome({ radius: 6 })).toBe(dome({ radius: 6, rise: 6, oculus: 0 }));
    expect(dome({ radius: 6 })).not.toBe(dome({ radius: 6, rise: 3 }));
    expect(() => dome({ radius: 4, rise: 5 })).toThrow(/rise 5 is more than the radius 4/);
  });
});

describe('pendentives', () => {
  it('rise from the bay corners at y = 0 to the dome ring at y = span / 2, inside the bay', () => {
    const geometry = pendentives({ span: 14 });
    sound(geometry, 'pendentives');
    // Rays that graze the arch edges meet facets of the sphere from behind; elsewhere every hit is a front face.
    expect(backfaceFraction(geometry, 400, 7, { notFromBelow: true })).toBeLessThan(0.12);
    expect(boxProblems(boxOf(geometry), { min: [-7, 0, -7], max: [7, 7, 7] }, 1e-3)).toEqual([]);
    expect(pendentives({ span: 14 })).toBe(geometry);
  });

  it("meet their spandrels edge to edge at every detail, the spandrels' arch on the curved faces' first row", () => {
    for (const detail of ['low', 'medium', 'high'] as const) expect(oddEdges(pendentives({ span: 14, detail })), `edges borne by an odd number of faces, ${detail}`).toBe(0);
  });
});

describe('barrel vault', () => {
  it('plain and coffered: springing at y = 0, along Z, closed from every side', () => {
    for (const coffers of [false as const, { across: 9, along: 8 }]) {
      const geometry = barrelVault({ span: 8, length: 12, thickness: 0.4, coffers });
      sound(geometry, 'vault');
      expect(backfaceFraction(geometry, 400)).toBe(0);
      expect(boxProblems(boxOf(geometry), { min: [-4.4, 0, -6], max: [4.4, 4.4, 6] }, 0.05)).toEqual([]);
      expect(triangles(geometry)).toBeLessThanOrEqual(VAULT_BUDGET);
    }
    expect(() => barrelVault({ span: 4, length: 3, rise: 3 })).toThrow(/more than half the span/);
  });

  it("refuses coffers whose floors or openings would stand out of the shell as pockets wound inside out, naming numbers that pass (review 0, F16; review 1)", () => {
    // The Hunt arches' soffit, 8.14 m across: its 0.1 m coffers in the 0.06 m shell it had stood 4 cm out of it.
    const hunt = { span: 8.14, length: 0.8, coffers: { across: 11, along: 1, depth: 0.1, rib: 0.16 } };
    expect(() => barrelVault({ ...hunt, thickness: 0.06 })).toThrow(
      /^barrelVault: thickness 0\.06 m lets the coffers' floors stand out of the shell's outer face, which runs along the chords of its facets, as pockets wound inside out \(coffers\.depth 0\.1 m, coffers\.rib 0\.16 m\); make thickness at least 0\.1074 m or coffers\.depth at most 0\.0527 m\.$/,
    );
    // A shell as thick as its coffers are deep is refused too, its facets' chords dipping toward the floors' corners; the numbers named both pass.
    expect(() => barrelVault({ ...hunt, thickness: 0.1 })).toThrow(/thickness at least 0\.1074 m/);
    // Each holds its coffers, read on lines along vertical apart from the refusal (review 2).
    for (const held of [barrelVault({ ...hunt, thickness: 0.1074 }), barrelVault({ ...hunt, thickness: 0.06, coffers: { ...hunt.coffers, depth: 0.0527 } })]) {
      expect(inwardAlong(held, new Vector3(0, 1, 0), 160)).toEqual({ lines: 0, worst: 0, at: null });
    }
    expect(inwardAlong(barrelVault({ ...hunt, thickness: 0.14 }), new Vector3(0, 1, 0), 160)).toEqual({ lines: 0, worst: 0, at: null });
    // Coffers whose floors' corners clear the facets above them by 18 mm build, though a corner under a facet's middle would not.
    const fits = barrelVault({ span: 4, length: 3, thickness: 0.1, detail: 'low', coffers: { across: 2, along: 1, depth: 0.08, rib: 0.01 } });
    expect(inwardAlong(fits, new Vector3(0, 1, 0), 200)).toEqual({ lines: 0, worst: 0, at: null });
    // Openings standing out of a shell thinner than its facets' sag (review 1): no depth helps, so the thickness alone is named.
    expect(() => barrelVault({ span: 4, length: 3, thickness: 0.03, detail: 'low', coffers: { across: 2, along: 1, depth: 0.001, rib: 0.8 } })).toThrow(
      /^barrelVault: thickness 0\.03 m lets the coffers' openings stand out .* make thickness at least 0\.0392 m\.$/,
    );
  });

  it('refuses ribs that leave a coffer no floor, naming a rib that passes: just short of where the floors close, read off vaults that build, they face the axis (work unit 9)', () => {
    const radius = 2;
    const depth = 0.05;
    // Ten cells across, 0.6283 m wide on the inner face, close their floors across, as in unit 7's F39 (Claude N8); ten along, 0.3 m long, along.
    for (const { across, along, side } of [
      { across: 10, along: 1, side: 'width' },
      { across: 2, along: 10, side: 'length' },
    ] as const) {
      const vault = (rib: number): THREE.BufferGeometry => barrelVault({ span: 2 * radius, length: 3, thickness: 0.3, coffers: { across, along, depth, rib } });
      // A floor's width and length fall in step with the rib, so two vaults that build give the rib at which the floors close.
      const floor = (rib: number): number => floorsOf(vault(rib), radius, depth)[side];
      const closing = 0.05 + (0.05 * floor(0.05)) / (floor(0.05) - floor(0.1));
      const short = floorsOf(vault(closing - 1e-4), radius, depth);
      expect([short.faces, short.away], side).toEqual([2 * across * along, 0]);
      expect(short[side], side).toBeGreaterThan(0);
      expect(short[side], side).toBeLessThan(2e-4);
      const message = refusal(() => vault(closing + 1e-4));
      expect(message, side).toMatch(/^barrelVault: coffers\.rib [\d.]+ m leaves the coffers no floor, their sides meeting or crossing: .*; make coffers\.rib at most [\d.]+ m\.$/);
      // The rib it names builds floors facing the axis, within 0.2 mm of where they close.
      const named = Number(/at most ([\d.]+) m\.$/.exec(message)?.[1]);
      expect(named, side).toBeGreaterThan(closing - 2e-4);
      const passes = floorsOf(vault(named), radius, depth);
      expect([passes.away, passes[side] > 0], side).toEqual([0, true]);
    }
    expect(() => barrelVault({ span: 4, length: 3, thickness: 0.3, coffers: { across: 10, along: 1, depth, rib: 0.5 } })).toThrow(
      /^barrelVault: coffers\.rib 0\.5 m leaves the coffers no floor, their sides meeting or crossing: a floor stands 0\.8 ribs in from each side of its cell, which is 0\.6283 m wide on the inner face and 3 m long; make coffers\.rib at most 0\.3926 m\.$/,
    );
  });
});
