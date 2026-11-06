/**
 * The Roche south area, headless (src/build/kit.ts collectStep, src/build/timeline.ts Timeline): its step ids, titles and chapters, that every
 * vertex of every piece lies in the area's blocks, its budget, and no NaN.
 * Bounds of what green proves: containment is checked on every vertex of every placed geometry against the union of the four block polygons of
 * docs/research/exterior.md section 2 (src/model/roche-south/blocks.ts), with the brief's 0.3 m tolerance, so a piece may cross between two of
 * this area's own blocks but not into another area's; it says nothing about which of the area's blocks a piece belongs to. Budgets are the brief's
 * (450,000 triangles counting instances, 150 instanced meshes, 1 step light), counted by Timeline.stats() on this area's steps alone. A prism over an
 * outline that touches itself covers its top and bottom once each, by the summed areas of their faces: a notch pinched off at a point, and the Lehman
 * roof's outline, whose opening meets its edge.
 * The Petrie Court's south wall (work units 24 and 25; kravis.ts COURT_DOORWAYS, courtOpenings, courtColumns): the café's opening and the floor map's
 * eight doors, nine doorways paired about Weston's door, the café's with the eighth door and the fourth door with itself, each pair's middles' mean within
 * 5 cm of its axis (the fourth door's own middle is 4.5 cm east of it) and their widths within 5 cm, the five narrow ones arched and the four wide ones
 * square-headed, and a window over each arched door; a round column in the middle of each wide doorway, within 5 cm, paired about the door too, each
 * built in the court's step as one piece standing on the court's floor up to its doorway's head, in the middle of the wall's thickness, within 1 cm;
 * and a grid of lines at most 0.1 m apart through each doorway and window, 5 cm in from its outline (a round head's arc too) and from each column's
 * widest, its base's plinth, from 0.5 m out in the court to 0.5 m behind the wall, meets no piece of any step of the sequence (src/build/sequence.ts),
 * so nothing stands in them but the columns. Red with the wall cut with its six openings of before work unit 24 (the wall itself in all eight doors and
 * five windows), with a post 0.2 m square standing 0.1 m behind the wall in the second door, as the end of a partition square to the wall would (a grid
 * of 9 lines to a side missed it), with the wall cut without the café's opening (the wall in the café's bays), with the café's column 0.6 m off its
 * doorway's middle (the column check: not in its middle), with the first door's column declared and not built (the column check: not built), and
 * with the first door declared with no column (the pairing: the first and seventh doors not alike).
 * Bound: lines 0.1 m apart miss a piece thinner than that between them, and nothing past 0.5 m behind the wall or before it in the court is looked at;
 * within a column's widest, its plinth's half side and 5 cm either side of its middle, no line is cast, and the column there is read only by its box.
 */
import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { SEQUENCE } from '../../build/sequence.js';
import { WESTON_DOOR } from '../core/weston-facade.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { segmentMeets, worldTriangles } from '../lib/check.js';
import { BLOCK_TOLERANCE, BLOCKS } from './blocks.js';
import { lehmanSteps, rocheSouthSteps } from './index.js';
import { COURT_DOORS, COURT_DOORWAYS, COURT_WALL, COURT_X0, courtColumns, courtOpenings, type CourtDoor } from './kravis.js';
import { ROOF_OUTLINE } from './lehman-plan.js';
import { signedArea2, within, type P2 } from './poly.js';
import { prism } from './shapes.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALL: readonly StepDef[] = [...lehmanSteps, ...rocheSouthSteps];
const POLYGONS = Object.values(BLOCKS);

function inArea(p: P2): boolean {
  return POLYGONS.some((polygon) => within(polygon, p, BLOCK_TOLERANCE));
}

/** The plan areas a geometry's faces looking up and looking down cover, summed over its triangles, square metres. */
function faceAreas(geometry: BufferGeometry): { up: number; down: number } {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  let [up, down] = [0, 0];
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    const corner = (j: number): number => (index === null ? j : index.getX(j));
    a.fromBufferAttribute(position, corner(k));
    b.fromBufferAttribute(position, corner(k + 1));
    c.fromBufferAttribute(position, corner(k + 2));
    const y = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).y / 2;
    if (y > 1e-12) up += y;
    else if (y < -1e-12) down -= y;
  }
  return { up, down };
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

  it("cover a prism's top and bottom once where its outline touches itself: a notch pinched off at a point, and the Lehman roof", () => {
    const notched: P2[] = [[0, 0], [4, 0], [4, 4], [2, 4], [3, 3], [2, 2], [1, 3], [2, 4], [0, 4]];
    for (const [outline, area] of [
      [notched, 14],
      [ROOF_OUTLINE, Math.abs(signedArea2(ROOF_OUTLINE)) / 2],
    ] as const) {
      const { up, down } = faceAreas(prism(outline, [], 0, 1));
      expect(up, 'the top').toBeCloseTo(area, 2);
      expect(down, 'the bottom').toBeCloseTo(area, 2);
    }
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

describe("the Petrie Court's south wall (work units 24 and 25)", () => {
  it("has the café's opening and the floor map's eight doors paired about Weston's door, the narrow ones arched under a window each", () => {
    expect(COURT_DOORS.length).toBe(8);
    expect(COURT_DOORWAYS.map((d) => d.name)).toEqual(['the café', ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => `door ${String(k)}`)]);
    const doorway = (k: number): CourtDoor => {
      const d = COURT_DOORWAYS[k];
      if (d === undefined) throw new Error(`no doorway ${String(k)}`);
      return d;
    };
    const middle = (k: number): number => (doorway(k).z0 + doorway(k).z1) / 2;
    const width = (k: number): number => doorway(k).z1 - doorway(k).z0;
    for (let k = 0; k < 9; k++) {
      const pair = `${doorway(k).name} and ${doorway(8 - k).name}`;
      expect(Math.abs((middle(k) + middle(8 - k)) / 2 - WESTON_DOOR.z), `${pair} about the door`).toBeLessThan(0.05);
      expect(Math.abs(width(k) - width(8 - k)), `${pair} as wide`).toBeLessThan(0.05);
      expect(doorway(k).arched, `${pair} alike headed`).toBe(doorway(8 - k).arched);
      expect(doorway(k).column === null, `${pair} alike columned`).toBe(doorway(8 - k).column === null);
    }
    expect(COURT_DOORWAYS.map((d) => d.arched)).toEqual([false, false, true, true, true, true, true, false, false]);
    const windows = courtOpenings().filter((o) => o.sill > 0);
    expect(windows.map((o) => o.name)).toEqual([2, 3, 4, 5, 6].map((k) => `window over door ${String(k)}`));
  });

  it('has a round column in the middle of each wide doorway, paired about the door, built on the floor up to the head in the middle of the wall', () => {
    const columns = courtColumns();
    expect(columns.map((c) => c.name)).toEqual(['the café', 'door 1', 'door 7', 'door 8']);
    for (const c of columns) {
      const d = COURT_DOORWAYS.find((w) => w.name === c.name);
      expect(Math.abs(c.z - ((d?.z0 ?? 0) + (d?.z1 ?? 0)) / 2), `${c.name}'s column in its middle`).toBeLessThan(0.05);
      expect(d?.arched, `${c.name} square-headed`).toBe(false);
    }
    for (let k = 0; k < columns.length; k++) {
      const [a, b] = [columns[k], columns[columns.length - 1 - k]];
      expect(Math.abs(((a?.z ?? 0) + (b?.z ?? 0)) / 2 - WESTON_DOOR.z), `${a?.name ?? ''}'s and ${b?.name ?? ''}'s columns about the door`).toBeLessThan(0.05);
    }
    const court = SEQUENCE.find((s) => s.id === 'petrie-court');
    if (court === undefined) throw new Error('no petrie-court step');
    const head = courtOpenings().find((o) => o.name === 'the café')?.crown ?? 0;
    const boxes = collectStep(court).pieces.map((piece) => {
      const g = piece.geometry;
      if (g.boundingBox === null) g.computeBoundingBox();
      return (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
    });
    for (const c of columns) {
      const built = boxes.filter((b) => Math.abs((b.min.z + b.max.z) / 2 - c.z) < 0.01 && Math.abs((b.min.x + b.max.x) / 2 - c.x) < 0.01 && b.max.z - b.min.z < 2);
      expect(built.length, `${c.name}'s column built once`).toBe(1);
      const [box] = built;
      expect([box?.min.y, box?.max.y].map((y) => (y ?? 0) - MAIN_FLOOR_Y), `${c.name}'s column from the floor to the head`).toEqual([expect.closeTo(0, 2), expect.closeTo(head, 2)]);
      expect([(box?.max.x ?? 0) - (box?.min.x ?? 0), (box?.max.z ?? 0) - (box?.min.z ?? 0)], `${c.name}'s column as wide as its plinth`).toEqual([expect.closeTo(2 * c.half, 2), expect.closeTo(2 * c.half, 2)]);
      expect(Math.abs(c.x - (COURT_X0 - COURT_WALL / 2)), `${c.name}'s column in the middle of the wall`).toBeLessThan(0.01);
    }
  });

  it('is open through every doorway and window, beside its column, from 0.5 m out in the court to 0.5 m behind the wall, past every piece of the sequence', () => {
    const openings = courtOpenings();
    const columns = courtColumns();
    /** Whether a line at world Z `z` through opening `name` passes within 5 cm of its column's widest. */
    const byColumn = (name: string, z: number): boolean => columns.some((c) => c.name === name && Math.abs(z - c.z) < c.half + 0.05);
    const from = COURT_X0 + 0.5;
    const length = COURT_WALL + 1.0;
    const along = new Vector3(-1, 0, 0);
    /** The lines' greatest spacing, metres. */
    const SPACING = 0.1;
    const problems = new Set<string>();
    for (const step of SEQUENCE) {
      collectStep(step).pieces.forEach((piece, i) => {
        const g = piece.geometry;
        if (g.boundingBox === null) g.computeBoundingBox();
        const box = (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        if (box.min.x > from || box.max.x < from - length) return;
        const near = openings.filter((o) => box.max.z > o.z0 && box.min.z < o.z1 && box.max.y > MAIN_FLOOR_Y + o.sill && box.min.y < MAIN_FLOOR_Y + o.crown);
        if (near.length === 0) return;
        const triangles = worldTriangles(g, piece.matrix);
        for (const o of near) {
          // Only the piece's triangles whose boxes reach the lines' slab through the opening.
          const slab = new Box3(new Vector3(from - length, MAIN_FLOOR_Y + o.sill, o.z0), new Vector3(from, MAIN_FLOOR_Y + o.crown, o.z1));
          const reaching = triangles.filter((t) => new Box3().setFromPoints(t).intersectsBox(slab));
          if (reaching.length === 0) continue;
          const [mid, half] = [(o.z0 + o.z1) / 2, (o.z1 - o.z0) / 2 - 0.05];
          const [nz, ny] = [o.z1 - o.z0, o.crown - o.sill].map((span) => Math.ceil((span - 0.1) / SPACING) + 1) as [number, number];
          for (let iz = 0; iz < nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
              const z = o.z0 + 0.05 + ((o.z1 - o.z0 - 0.1) * iz) / (nz - 1);
              const y = o.sill + 0.05 + ((o.crown - o.sill - 0.1) * iy) / (ny - 1);
              if (y > o.spring && (z - mid) ** 2 + (y - o.spring) ** 2 > half ** 2) continue;
              if (byColumn(o.name, z)) continue;
              const origin = new Vector3(from, MAIN_FLOOR_Y + y, z);
              if (reaching.some(([a, b, c]) => segmentMeets(origin, along, length, a, b, c))) problems.add(`${step.id} piece ${String(i)} (${piece.material.name}) in ${o.name}`);
            }
          }
        }
      });
    }
    expect([...problems]).toEqual([]);
  });
});
