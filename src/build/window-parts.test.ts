/**
 * Window parts in the sequence (docs/design/spec.md, Build-step API, Composite pieces): wherever any role of a part from src/model/lib/window.ts
 * (a window's frame, bars and glass; a door's frame, leaf and glass) reaches the sequence, every other role does too, in the same step and at the
 * same world matrix, added by `kit.add` itself or merged into a geometry that is; in a step staggered by `order`, also with the same order.
 * Merges are followed through `MeshBuilder.append`, which every merge under src/model uses; parts and merges are recorded by wrapping `windowUnit`,
 * `doorUnit` and `MeshBuilder` before any model module loads.
 * Bound: a part none of whose roles reaches the sequence is not in the model and is not checked; a role with no triangles needs no placement;
 * matrices compare to 0.1 mm; a merge made other than through `MeshBuilder.append` is not followed; in a spatially staggered step each piece's
 * arrival key comes from its own bounds, so whether the roles arrive in the same rank is not checked.
 */
import type { BufferGeometry, Matrix4 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import type * as BuilderModule from '../model/lib/builder.js';
import type { MeshBuilder } from '../model/lib/builder.js';
import type * as WindowModule from '../model/lib/window.js';
import { collectStep } from './kit.js';
import { SEQUENCE } from './sequence.js';

type Appended = readonly (readonly [BufferGeometry, Matrix4 | undefined])[];

const record = vi.hoisted(() => ({
  /** Every part result, by identity (the part cache returns one object per parameter set). */
  parts: new Map<object, { readonly name: string; readonly params: unknown }>(),
  /** What each builder has appended so far. */
  appends: new Map<object, [BufferGeometry, Matrix4 | undefined][]>(),
  /** For each geometry a builder built, what it had appended by then. */
  built: new Map<BufferGeometry, Appended>(),
}));

vi.mock('../model/lib/builder.js', async (importOriginal) => {
  const real = await importOriginal<typeof BuilderModule>();
  const proto = real.MeshBuilder.prototype;
  const append = Reflect.get(proto, 'append');
  const build = Reflect.get(proto, 'build');
  Reflect.set(proto, 'append', function (this: MeshBuilder, source: MeshBuilder | BufferGeometry, matrix?: Matrix4): void {
    const geometry = source instanceof real.MeshBuilder ? source.build() : source;
    const list = record.appends.get(this) ?? [];
    list.push([geometry, matrix?.clone()]);
    record.appends.set(this, list);
    append.call(this, geometry, matrix);
  });
  Reflect.set(proto, 'build', function (this: MeshBuilder): BufferGeometry {
    const geometry = build.call(this);
    record.built.set(geometry, [...(record.appends.get(this) ?? [])]);
    return geometry;
  });
  return real;
});

vi.mock('../model/lib/window.js', async (importOriginal) => {
  const real = await importOriginal<typeof WindowModule>();
  return {
    ...real,
    windowUnit: (params: Parameters<typeof real.windowUnit>[0]) => {
      const parts = real.windowUnit(params);
      record.parts.set(parts, { name: 'windowUnit', params });
      return parts;
    },
    doorUnit: (params: Parameters<typeof real.doorUnit>[0]) => {
      const parts = real.doorUnit(params);
      record.parts.set(parts, { name: 'doorUnit', params });
      return parts;
    },
  };
});

interface Placement {
  readonly step: string;
  readonly matrix: Matrix4;
  /** The piece's order in a step staggered by order (where it is the arrival key), else null. */
  readonly order: number | null;
}

/** Every piece of every step, by geometry. */
function placements(): Map<BufferGeometry, Placement[]> {
  const out = new Map<BufferGeometry, Placement[]>();
  for (const step of SEQUENCE) {
    const byOrder = (step.stagger ?? 'order') === 'order';
    for (const p of collectStep(step).pieces) {
      const list = out.get(p.geometry) ?? [];
      list.push({ step: step.id, matrix: p.matrix, order: byOrder ? p.order : null });
      out.set(p.geometry, list);
    }
  }
  return out;
}

type Into = Map<BufferGeometry, (readonly [BufferGeometry, Matrix4 | undefined])[]>;

/** Where `geometry` ends up: its own placements plus those of every merge it was appended to, composed with the append's matrix. */
function reach(geometry: BufferGeometry, direct: Map<BufferGeometry, Placement[]>, into: Into, depth = 0): Placement[] {
  if (depth > 8) throw new Error('Merges nest more than 8 deep; is a merge appended into itself?');
  const merged = (into.get(geometry) ?? []).flatMap(([merge, matrix]) =>
    reach(merge, direct, into, depth + 1).map((p) => ({ ...p, matrix: matrix === undefined ? p.matrix : p.matrix.clone().multiply(matrix) })),
  );
  return [...(direct.get(geometry) ?? []), ...merged];
}

/**
 * Roles left out on purpose, each with its reason. Keep this list short: an entry hides that role of that part everywhere.
 * The Hunt lunettes are three lights between stone mullion posts behind a square-grid grille (docs/research/exterior.md, H11); the unit's own
 * transom and central spoke would put a bar in the middle light that the photographs (S7, S8, S10) do not show.
 */
const LEFT_OUT: readonly { readonly name: string; readonly role: string; readonly params: Readonly<Record<string, unknown>>; readonly step: string }[] = [
  { name: 'windowUnit', role: 'bars', params: { shape: 'arch', cols: 1, rows: 1, frame: 0.1, depth: 0.12 }, step: 'hunt-windows' },
];

function leftOut(name: string, role: string, params: unknown, steps: readonly string[]): boolean {
  const given = params as Readonly<Record<string, unknown>>;
  return LEFT_OUT.some((e) => e.name === name && e.role === role && Object.entries(e.params).every(([k, v]) => given[k] === v) && steps.every((s) => s === e.step));
}

const signature = (p: Placement): string => `${p.step}${p.order === null ? '' : ` order ${String(p.order)}`} at ${p.matrix.elements.map((v) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4)).join(',')}`;

const triangles = (g: BufferGeometry): number => (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;

describe('window parts', () => {
  it('place every role of a window or door wherever another role of it is placed', () => {
    const direct = placements();
    const into: Into = new Map();
    for (const [merge, appended] of record.built) {
      for (const [part, matrix] of appended) into.set(part, [...(into.get(part) ?? []), [merge, matrix] as const]);
    }
    const problems: string[] = [];
    let checked = 0;
    for (const [parts, { name, params }] of record.parts) {
      const roles = Object.entries(parts as Record<string, BufferGeometry>).filter(([, g]) => triangles(g) > 0);
      const placed = roles.map(([role, g]) => [role, reach(g, direct, into)] as const);
      const signed = placed.map(([role, list]) => [role, list.map(signature).sort()] as const);
      const [widestRole, reference] = signed.reduce((best, entry) => (entry[1].length > best[1].length ? entry : best), signed[0] ?? ['', []]);
      if (reference.length === 0) continue;
      checked += 1;
      const steps = [...new Set(placed.flatMap(([, list]) => list.map((p) => p.step)))];
      for (const [role, list] of signed) {
        if (list.length === reference.length && list.every((s, i) => s === reference[i])) continue;
        if (list.length === 0 && leftOut(name, role, params, steps)) continue;
        const differs = reference.find((s) => !list.includes(s)) ?? list.find((s) => !reference.includes(s)) ?? '(the same placements, different counts)';
        problems.push(`${name}(${JSON.stringify(params)}) ${role}: placed ${String(list.length)} times, its ${widestRole} ${String(reference.length)}; first difference: ${differs}`);
      }
    }
    expect(checked, 'window and door parts that reach the sequence').toBeGreaterThan(10);
    expect(problems).toEqual([]);
  });
});
