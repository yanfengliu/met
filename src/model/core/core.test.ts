/**
 * Headless checks of the core area's steps (src/model/core/): ids, titles and chapters, every piece inside the core blocks, the area budget
 * (350,000 triangles counting instances, 130 instanced meshes, 1 step light; coordinator's assignment, 2026-10-11) and finite matrices.
 * `openWall` with each kind of hole and `holeLining` are closed, as is the Hunt's `archedPassage` (src/model/hunt/hunt.test.ts), and the faces they
 * stand on look down (`levelFaces`; red with `openWall`'s bottom or the passage's feet wound up). `openWall` refuses doors less than 1 mm apart,
 * touching or overlapping, on every call before its cache, and leaves each opening clear in its front and back faces, by their areas, by every
 * triangle clipped against each opening it leaves (no area more than 0.01 mm inside it), and by nine lines along Z through it (red with a crossing
 * pair taken: the front face 92.8 m² where it should cover 86.2 m²), whichever cache entry came first (red with a key that read a niche's depth as a
 * door's).
 * Bound: geometry is built in Node without WebGL, so counts and bounds are exact but nothing here looks at a rendered pixel.
 * Blocks: core-1880-a, core-1888-b and core-1894-c tile X −49.7..49.4, Z −138.3..−69.0 (exterior.md section 2). A piece may overstep that by
 * 0.3 m; trim (any non-brick piece) on the west face (into the Lehman court and the park) and on Weston's south face (into the Petrie Court)
 * may project up to 1.5 m (coordinator, 2026-10-11).
 */
import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { MeshBuilder } from '../lib/builder.js';
import { levelFaces, openAlong } from '../lib/check.js';
import { palette } from '../palette.js';
import { holeLining, holeOutline, openWall } from './arches.js';
import type { Hole } from './arches.js';
import { europeanPaintingsGlazing2023Steps, medievalHallSteps, vauxSteps, westonTuckermanSteps } from './index.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARRAYS: readonly (readonly [string, readonly StepDef[]])[] = [
  ['vaux-mould-1880', vauxSteps],
  ['weston-tuckerman-1894', westonTuckermanSteps],
  ['mckim-mead-white-1926', medievalHallSteps],
  ['koch-plaza-2014', europeanPaintingsGlazing2023Steps],
];
const ALL: readonly StepDef[] = ARRAYS.flatMap(([, steps]) => steps);
const BLOCKS = { x0: -49.7, x1: 49.4, z0: -138.3, z1: -69.0 } as const;
const SLACK = 0.3;
const TRIM = 1.5;
const BUDGET = { triangles: 350_000, meshes: 130, lights: 1 } as const;

describe('core steps', () => {
  it('have unique kebab-case ids, short titles and details, and name the chapter they are composed into', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
    for (const [chapter, steps] of ARRAYS) expect(steps.filter((s) => s.chapter !== chapter).map((s) => s.id)).toEqual([]);
    expect(vauxSteps.length).toBeGreaterThan(0);
  });

  it('keep every piece inside the core blocks (trim may reach into the Lehman and Petrie courts)', () => {
    const problems: string[] = [];
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, i) => {
        const g = piece.geometry;
        if (g.boundingBox === null) g.computeBoundingBox();
        const box = (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        const trim = piece.material !== palette.brick;
        const west = BLOCKS.z0 - box.min.z;
        const south = BLOCKS.x0 - box.min.x;
        const bad =
          box.max.x > BLOCKS.x1 + SLACK ||
          box.max.z > BLOCKS.z1 + SLACK ||
          west > (trim ? TRIM : SLACK) + 1e-6 ||
          south > (trim ? TRIM : SLACK) + 1e-6 ||
          box.min.y < -30 ||
          box.max.y > 60;
        if (bad) problems.push(`${step.id} piece ${String(i)} (${piece.material.name}): ${box.min.toArray().map((v) => v.toFixed(2)).join(', ')} to ${box.max.toArray().map((v) => v.toFixed(2)).join(', ')}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it('stay within the area budget with finite matrices', () => {
    const timeline = new Timeline(ALL);
    const stats = timeline.stats();
    expect(stats.triangles, 'triangles at t = N').toBeLessThanOrEqual(BUDGET.triangles);
    expect(stats.meshes, 'instanced meshes').toBeLessThanOrEqual(BUDGET.meshes);
    expect(stats.lights, 'step lights').toBeLessThanOrEqual(BUDGET.lights);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
    console.log(`core: ${String(stats.steps)} steps, ${String(stats.pieces)} pieces, ${String(stats.meshes)} meshes, ${String(stats.triangles)} triangles, ${String(stats.lights)} lights`);
  });
});

describe('the core walls and linings, closed along vertical lines (src/model/lib/check.ts openAlong; work unit 3, review 2, F14)', () => {
  const up = new Vector3(0, 1, 0);
  /** The faces a piece stands on at height `y`: there are some, and every one looks down. */
  const standsOn = (geometry: BufferGeometry, y: number): void => {
    const faces = levelFaces(geometry, y);
    expect(faces.length, `faces at y ${String(y)}`).toBeGreaterThan(0);
    expect(faces.filter((ny) => ny > -0.999), `faces at y ${String(y)} not looking down`).toEqual([]);
  };

  it('openWall: a door through it, a blind niche on its floor, windows of each head and a round window, with and without its ends', () => {
    const holes: Hole[] = [
      { x: -6, width: 1.6, height: 3 },
      { head: 'round', x: -3, width: 1.2, height: 2.5, depth: 0.2 },
      { head: 'segmental', x: 0, y: 1, width: 1, height: 2 },
      { head: 'pointed', x: 2, y: 1, width: 1, height: 2.5 },
      { x: 4.5, y: 1.2, width: 1, height: 2 },
      { head: 'circle', x: 6.5, y: 3, width: 1, height: 1 },
    ];
    for (const openEnds of [false, true]) {
      const wall = openWall({ width: 16, height: 6, thickness: 0.8, holes, openEnds });
      expect(openAlong(wall, up), `openEnds ${String(openEnds)}`).toBeNull();
      standsOn(wall, 0);
    }
  });

  /**
   * How many surfaces of `wall` the line along Z through (x, y) crosses, told apart by depth: a face's edges count, and faces meeting there at one depth
   * count once. Faces along Z (jambs, sills, heads) have no area seen along the line.
   */
  const across = (wall: BufferGeometry, x: number, y: number): number => {
    const position = wall.getAttribute('position');
    const index = wall.getIndex();
    const depths: number[] = [];
    for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
      const [a, b, c] = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, index === null ? k + j : index.getX(k + j)));
      if (a === undefined || b === undefined || c === undefined) continue;
      const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (Math.abs(area) < 1e-12) continue;
      const u = ((b.x - x) * (c.y - y) - (c.x - x) * (b.y - y)) / area;
      const v = ((c.x - x) * (a.y - y) - (a.x - x) * (c.y - y)) / area;
      if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) depths.push(u * a.z + v * b.z + (1 - u - v) * c.z);
    }
    return depths.sort((p, q) => p - q).filter((z, i) => i === 0 || z - (depths[i - 1] ?? 0) > 1e-6).length;
  };

  type Flat = readonly (readonly [number, number])[];
  const shoelace = (pts: Flat): number => Math.abs(pts.reduce((sum, p, i) => sum + p[0] * (pts[(i + 1) % pts.length]?.[1] ?? 0) - (pts[(i + 1) % pts.length]?.[0] ?? 0) * p[1], 0)) / 2;

  /** The triangles of `wall` in the plane z = `z` that look along `facing` (+1 or −1 on Z), seen along Z. */
  const facesIn = (wall: BufferGeometry, z: number, facing: number): Flat[] => {
    const position = wall.getAttribute('position');
    const index = wall.getIndex();
    const out: Flat[] = [];
    for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
      const [a, b, c] = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, index === null ? k + j : index.getX(k + j)));
      if (a === undefined || b === undefined || c === undefined || [a, b, c].some((p) => Math.abs(p.z - z) > 1e-6)) continue;
      if (Math.sign(new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).z) === facing) out.push([a, b, c].map((p) => [p.x, p.y] as const));
    }
    return out;
  };

  /**
   * The area of the face `tri` inside the convex `outline` (counter-clockwise) less a band `band` wide along its edges: none for a face that only meets
   * the opening's edge, rounding of float positions aside.
   */
  const inside = (tri: Flat, outline: Flat, band: number): number => {
    let poly: Flat = tri;
    outline.forEach(([px, py], i) => {
      const [qx, qy] = outline[(i + 1) % outline.length] ?? [px, py];
      const length = Math.hypot(qx - px, qy - py);
      if (length < 1e-12 || poly.length === 0) return;
      // How far a point lies inside the edge p → q, less the band (Sutherland–Hodgman against the edge moved in by the band).
      const depth = ([x, y]: readonly [number, number]): number => ((qx - px) * (y - py) - (qy - py) * (x - px)) / length - band;
      const kept: [number, number][] = [];
      poly.forEach((a, k) => {
        const b = poly[(k + 1) % poly.length] ?? a;
        const [da, db] = [depth(a), depth(b)];
        if (da >= 0) kept.push([a[0], a[1]]);
        if (da >= 0 !== db >= 0) kept.push([a[0] + ((b[0] - a[0]) * da) / (da - db), a[1] + ((b[1] - a[1]) * da) / (da - db)]);
      });
      poly = kept;
    });
    return poly.length < 3 ? 0 : shoelace(poly);
  };

  /**
   * What is wrong with the front and back faces of a `width` × `height` × `thickness` wall with `holes` on its base. Each face's area must be the wall's
   * less the openings it leaves (every hole on the front, the through holes on the back), within 1e-5 m², ten times the rounding measured. No triangle
   * of a face may reach into an opening it leaves, by more than 0.01 mm from the opening's edge, by any area at all. On nine lines along Z spread over
   * each opening, a door through the wall meets no surface, and a blind niche two: its back and the wall's.
   * Bound: a face that lies within 0.01 mm of an opening's edge is not seen.
   */
  const doorways = (wall: BufferGeometry, width: number, height: number, thickness: number, holes: readonly Hole[]): string[] => {
    const through = (h: Hole): boolean => h.depth === undefined || h.depth >= thickness;
    const problems: string[] = [];
    const sides = [
      { name: 'front', faces: facesIn(wall, 0, 1), leaves: holes },
      { name: 'back', faces: facesIn(wall, -thickness, -1), leaves: holes.filter(through) },
    ];
    for (const { name, faces, leaves } of sides) {
      const got = faces.reduce((sum, f) => sum + shoelace(f), 0);
      const want = width * height - leaves.reduce((sum, h) => sum + shoelace(holeOutline(h, 12)), 0);
      if (Math.abs(got - want) > 1e-5) problems.push(`the ${name} face covers ${got.toFixed(5)} m², where it should cover ${want.toFixed(5)}`);
      for (const h of leaves) {
        const outline = holeOutline(h, 12);
        const covered = faces.reduce((sum, f) => sum + inside(f, outline, 1e-5), 0);
        if (covered > 0) problems.push(`the ${name} face reaches ${covered.toExponential(2)} m² into the opening at x ${String(h.x)}`);
      }
    }
    for (const h of holes) {
      for (const dx of [-0.31, 0.04, 0.27]) {
        for (const fy of [0.22, 0.53, 0.76]) {
          const [x, y] = [(h.x ?? 0) + dx * h.width, fy * h.height];
          const met = across(wall, x, y);
          if (met !== (through(h) ? 0 : 2)) problems.push(`the line through (${x.toFixed(3)}, ${y.toFixed(3)}) in the opening at x ${String(h.x)} meets ${String(met)} surfaces`);
        }
      }
    }
    return problems;
  };

  /** `holes`' wall with one more face, the corners `pts` counter-clockwise seen from the front, in the front plane, or the back plane looking back. */
  const withFace = (holes: readonly Hole[], pts: Flat, back = false): BufferGeometry => {
    const b = new MeshBuilder();
    b.append(openWall({ width: 20, height: 5, thickness: 1, holes }));
    const corners = pts.map(([x, y]) => new Vector3(x, y, back ? -1 : 0));
    b.polygon(back ? corners.reverse() : corners);
    return b.build();
  };

  it("across counts a face whose edge runs through its line: a square's fan diagonal through its middle (review 4, F21)", () => {
    const square = new MeshBuilder();
    square.polygon([new Vector3(0, 0, 0), new Vector3(2, 0, 0), new Vector3(2, 2, 0), new Vector3(0, 2, 0)]);
    expect(across(square.build(), 1, 1)).toBe(1);
  });

  it('openWall: doors stand at least 1 mm apart, each opening clear in the front and back faces; doors that touch or overlap are refused (reviews 0 to 4, F2, F7, F11, F15, F17, F20)', () => {
    const apart: Hole[][] = [
      [{ x: -1.0005, width: 2, height: 3 }, { x: 1.0005, width: 2, height: 3 }],
      [{ x: 0, width: 2.2, height: 3 }, { x: 2.31, width: 2.4, height: 3 }],
      [{ head: 'round', x: -1.3, width: 2, height: 3 }, { head: 'pointed', x: 0.75, width: 2, height: 3.5 }],
      [{ head: 'round', x: -1.0005, width: 2, height: 3 }, { head: 'segmental', x: 1.0005, width: 2, height: 2.6, depth: 0.3 }],
    ];
    for (const holes of apart) {
      const wall = openWall({ width: 20, height: 5, thickness: 1, holes });
      expect(openAlong(wall, up), `doors at x ${holes.map((h) => String(h.x)).join(' and ')}`).toBeNull();
      expect(doorways(wall, 20, 5, 1, holes), `doors at x ${holes.map((h) => String(h.x)).join(' and ')}`).toEqual([]);
    }
    // Controls, each a face laid in a doorway of the pairs above, which must be found: across the first doorway; strips 20 µm and 3 µm wide up its
    // middle and one 49 µm tall across it (reviews 3 and 4); a post 33 µm wide in the back plane; and a triangle of 0.99 cm² under a round door's crown.
    const [first = [], , arched = []] = apart;
    const controls: [string, BufferGeometry, readonly Hole[]][] = [
      ['a face across the doorway', withFace(first, [[-2.0005, 0], [-0.0005, 0], [-0.0005, 3], [-2.0005, 3]]), first],
      ['a strip 20 µm wide', withFace(first, [[-1.00051, 0], [-1.00049, 0], [-1.00049, 3], [-1.00051, 3]]), first],
      ["a strip 3 µm wide, under the area check's tolerance", withFace(first, [[-1.0005015, 0], [-1.0004985, 0], [-1.0004985, 3], [-1.0005015, 3]]), first],
      ['a strip 49 µm tall', withFace(first, [[-2.0005, 1], [-0.0005, 1], [-0.0005, 1.000049], [-2.0005, 1.000049]]), first],
      ['a post 33 µm wide in the back plane', withFace(first, [[-1.0005165, 0], [-1.0004835, 0], [-1.0004835, 3], [-1.0005165, 3]], true), first],
      ['a triangle of 0.99 cm² under the crown', withFace(arched, [[-1.31, 2.98], [-1.29, 2.98], [-1.3, 2.9899]]), arched],
    ];
    for (const [what, wall, holes] of controls) expect(doorways(wall, 20, 5, 1, holes).length, `problems found with ${what}`).toBeGreaterThan(0);
    // Touching, touching with each sum rounded a little the other side (2.3 − 1.2 at 1.1), 0.5 mm apart, 1 cm over each other, and one inside the other.
    const refused: [Hole[], string][] = [
      [[{ x: -1, width: 2, height: 3 }, { x: 1, width: 2, height: 3 }], 'openWall: the doors at x -1 (2 wide) and x 1 (2 wide) touch; keep doors at least 1 mm apart.'],
      [[{ x: 0, width: 2.2, height: 3 }, { x: 2.3, width: 2.4, height: 3 }], 'the doors at x 0 (2.2 wide) and x 2.3 (2.4 wide) touch;'],
      [[{ x: 0, width: 2, height: 3 }, { x: 2.0005, width: 2, height: 3 }], 'stand 0.5 mm apart;'],
      [[{ x: 0, width: 2, height: 3 }, { x: 1.99, width: 2, height: 3 }], 'openWall: the doors at x 0 (2 wide) and x 1.99 (2 wide) overlap by 10 mm; keep doors at least 1 mm apart.'],
      [[{ x: 0, width: 6, height: 3 }, { x: 1, width: 2, height: 2 }], 'overlap by 2000 mm;'],
    ];
    for (const [holes, message] of refused) expect(() => openWall({ width: 20, height: 5, thickness: 1, holes })).toThrow(message);
  });

  it('openWall: checks its doors on every call, not only on the first of a cache key, which rounds to the millimetre (review 2, F12)', () => {
    // Both walls' keys read the second door at x 2.001.
    openWall({ width: 31, height: 5, thickness: 1, holes: [{ x: 0, width: 2, height: 3 }, { x: 2.0012, width: 2, height: 3 }] });
    expect(() => openWall({ width: 31, height: 5, thickness: 1, holes: [{ x: 0, width: 2, height: 3 }, { x: 2.0006, width: 2, height: 3 }] })).toThrow('stand 0.6 mm apart');
  });

  it('openWall: never serves a blind niche for a door through the wall, or the other way, whichever its cache saw first (review 3, F19)', () => {
    // Depths 0.9996 and 1 m round alike, but the first makes a niche in a 1 m wall and the second a door; each width is a cache key of its own.
    for (const [width, depths] of [[42, [0.9996, 1]], [43, [1, 0.9996]]] as const) {
      for (const depth of depths) {
        const holes: Hole[] = [{ x: 0, width: 2, height: 3, depth }];
        expect(doorways(openWall({ width, height: 5, thickness: 1, holes }), width, 5, 1, holes), `depth ${String(depth)} after ${String(depths[0])}`).toEqual([]);
      }
    }
  });

  it('holeLining, square and round', () => {
    const square = holeLining({ width: 2.4, height: 3.2 }, { width: 2, height: 3 }, 0.6);
    const round = holeLining({ head: 'round', y: 0.4, width: 2.4, height: 3.2 }, { head: 'round', y: 0.4, width: 2, height: 3 }, 0.6);
    expect(openAlong(square, up)).toBeNull();
    expect(openAlong(round, up)).toBeNull();
    standsOn(square, 0);
    standsOn(round, 0.4);
  });
});
