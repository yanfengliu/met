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
 * square-headed, and a window over each arched door. A round Tuscan column in the middle of each wide doorway, within 5 cm, paired about the door too:
 * the library's column (src/model/lib/column.ts) at the map's 0.71 m, its geometry the very object the library gives for those parameters (it caches by
 * them), built once each in the court's step, centred within 1 cm of its place in the middle of the wall's thickness, from the floor to its own
 * doorway's head. The wall solid at the main floor, from 5 cm over the floor to 5 cm under the doorways' head, on a grid of lines at most 0.2 m apart
 * through it, along every stretch between its doorways and the court's ends, the pier between the first door and the café's opening and the wall west
 * of the café among them. And a grid of lines at most 0.1 m apart through each doorway and window, 5 cm in from its outline (a round head's arc too),
 * from 0.5 m out in the court to 0.5 m behind the wall, meets no piece of any step of the sequence (src/build/sequence.ts) but those columns, so
 * nothing else stands in them. Red with: the wall cut with its six openings of before work unit 24 (the wall itself in all eight doors and five
 * windows); a post 0.2 m square standing 0.1 m behind the wall in the second door, as the end of a partition square to the wall would (a grid of 9
 * lines to a side missed it); the wall cut without the café's opening (the wall in the café's bays); a post 0.2 m square and 3 m tall standing 0.3 m
 * behind the wall 0.45 m east of the café's column (the line cast; work unit 25, review 0); the café's column 0.6 m off its doorway's middle (the
 * column check: not in its middle); the first door's column declared and not built (not built); the first door declared with no column (the pairing:
 * the first and seventh doors not alike); the columns built as boxes as large as their plinths, and the column 1.0 m across (not the library's column
 * of 0.71 m); and the wall cut with an undeclared opening at Z −136.0..−132.5, 5.4 m tall (the solid wall).
 * Bound: lines 0.1 m apart through the doorways, and 0.2 m apart through the solid wall, miss a piece or a gap narrower than that between them; nothing
 * past 0.5 m behind the wall or before it in the court is looked at; the columns are read by their geometry and their boxes, not by lines.
 */
import { Box3, Vector3 } from 'three';
import type { BufferGeometry, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { SEQUENCE } from '../../build/sequence.js';
import { WESTON_DOOR } from '../core/weston-facade.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { segmentMeets, worldTriangles } from '../lib/check.js';
import { column } from '../lib/index.js';
import { BLOCK_TOLERANCE, BLOCKS } from './blocks.js';
import { lehmanSteps, rocheSouthSteps } from './index.js';
import { COURT_DOORS, COURT_DOORWAYS, COURT_ENDS_Z, COURT_WALL, COURT_X0, courtColumns, courtOpenings, type CourtColumn, type CourtDoor } from './kravis.js';
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

/**
 * The round Tuscan column the photographs and the map ask for in each wide doorway of the court's wall, as this test reads it: the library's Doric column,
 * unfluted on its Attic base, 0.71 m across and 5.4 m to its abacus. The library caches a column by its parameters, so a builder's column is this one
 * object only when it has these.
 */
const TUSCAN = column({ order: 'doric', diameter: 0.71, height: 5.4, fluted: false });

/** The Petrie Court's own step, its floor, its south wall, its columns and its coping. */
function courtStep(): StepDef {
  const step = SEQUENCE.find((s) => s.id === 'petrie-court');
  if (step === undefined) throw new Error('no petrie-court step');
  return step;
}

/** A piece's world box. */
function worldBox(geometry: BufferGeometry, matrix: Matrix4): Box3 {
  if (geometry.boundingBox === null) geometry.computeBoundingBox();
  return (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix);
}

/** Whether a world box stands centred on a column's place, within 1 cm in plan. */
function atColumn(box: Box3, c: CourtColumn): boolean {
  return Math.abs((box.min.z + box.max.z) / 2 - c.z) < 0.01 && Math.abs((box.min.x + box.max.x) / 2 - c.x) < 0.01;
}

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

  it("has a round Tuscan column of the map's 0.71 m in the middle of each wide doorway, paired about the door, built once from the floor to its head", () => {
    const columns = courtColumns();
    expect(columns.map((c) => c.name)).toEqual(['the café', 'door 1', 'door 7', 'door 8']);
    const openings = courtOpenings();
    for (const c of columns) {
      const d = COURT_DOORWAYS.find((w) => w.name === c.name);
      expect(Math.abs(c.z - ((d?.z0 ?? 0) + (d?.z1 ?? 0)) / 2), `${c.name}'s column in its middle`).toBeLessThan(0.05);
      expect(d?.arched, `${c.name} square-headed`).toBe(false);
      expect(c.half, `${c.name}'s column's widest, its plinth, 1.5 times 0.71 m across`).toBeCloseTo(0.75 * 0.71, 3);
      expect(Math.abs(c.x - (COURT_X0 - COURT_WALL / 2)), `${c.name}'s column in the middle of the wall`).toBeLessThan(0.01);
    }
    for (let k = 0; k < columns.length; k++) {
      const [a, b] = [columns[k], columns[columns.length - 1 - k]];
      expect(Math.abs(((a?.z ?? 0) + (b?.z ?? 0)) / 2 - WESTON_DOOR.z), `${a?.name ?? ''}'s and ${b?.name ?? ''}'s columns about the door`).toBeLessThan(0.05);
    }
    const tuscan = collectStep(courtStep()).pieces.filter((piece) => piece.geometry === TUSCAN).map((piece) => worldBox(piece.geometry, piece.matrix));
    expect(tuscan.length, "the court step's Tuscan columns").toBe(columns.length);
    for (const c of columns) {
      const built = tuscan.filter((b) => atColumn(b, c));
      expect(built.length, `${c.name}'s column built once in its place`).toBe(1);
      const [box] = built;
      const head = openings.find((o) => o.name === c.name)?.crown ?? 0;
      expect([box?.min.y, box?.max.y].map((y) => (y ?? 0) - MAIN_FLOOR_Y), `${c.name}'s column from the floor to its doorway's head`).toEqual([expect.closeTo(0, 2), expect.closeTo(head, 2)]);
    }
  });

  it("stands solid at the main floor along every stretch between its doorways and the court's ends, the café's pier and the wall west of it among them", () => {
    const triangles = collectStep(courtStep()).pieces.flatMap((piece) => worldTriangles(piece.geometry, piece.matrix));
    const [westEnd, eastEnd] = COURT_ENDS_Z;
    const stretches: (readonly [string, number, number])[] = [];
    let [z0, after] = [westEnd, "the court's west end"];
    for (const d of COURT_DOORWAYS) {
      stretches.push([`${after} to ${d.name}`, z0, d.z0]);
      [z0, after] = [d.z1, d.name];
    }
    stretches.push([`${after} to the court's east end`, z0, eastEnd]);
    expect(stretches.filter(([, a, b]) => b - a < 1).map(([name]) => name), 'stretches under 1 m').toEqual([]);
    const head = Math.min(...courtOpenings().filter((o) => o.sill === 0).map((o) => o.crown));
    const from = COURT_X0 + 0.5;
    const length = COURT_WALL + 1.0;
    const along = new Vector3(-1, 0, 0);
    /** The lines' greatest spacing, metres. */
    const SPACING = 0.2;
    const open: string[] = [];
    for (const [name, a, b] of stretches) {
      const slab = new Box3(new Vector3(from - length, MAIN_FLOOR_Y, a), new Vector3(from, MAIN_FLOOR_Y + head, b));
      const reaching = triangles.filter((t) => new Box3().setFromPoints(t).intersectsBox(slab));
      const [nz, ny] = [b - a, head].map((span) => Math.ceil((span - 0.1) / SPACING) + 1) as [number, number];
      for (let iz = 0; iz < nz; iz++) {
        for (let iy = 0; iy < ny; iy++) {
          const z = a + 0.05 + ((b - a - 0.1) * iz) / (nz - 1);
          const y = 0.05 + ((head - 0.1) * iy) / (ny - 1);
          const origin = new Vector3(from, MAIN_FLOOR_Y + y, z);
          if (!reaching.some(([p, q, r]) => segmentMeets(origin, along, length, p, q, r))) open.push(`${name} open at Z ${z.toFixed(2)}, ${y.toFixed(2)} m over the floor`);
        }
      }
    }
    expect(open.slice(0, 10)).toEqual([]);
  });

  it('is open through every doorway and window, from 0.5 m out in the court to 0.5 m behind the wall, past every piece of the sequence but its columns', () => {
    const openings = courtOpenings();
    const columns = courtColumns();
    const from = COURT_X0 + 0.5;
    const length = COURT_WALL + 1.0;
    const along = new Vector3(-1, 0, 0);
    /** The lines' greatest spacing, metres. */
    const SPACING = 0.1;
    const problems = new Set<string>();
    for (const step of SEQUENCE) {
      collectStep(step).pieces.forEach((piece, i) => {
        const g = piece.geometry;
        const box = worldBox(g, piece.matrix);
        if (box.min.x > from || box.max.x < from - length) return;
        // The court's columns stand in their doorways by design: leave out only a Tuscan column in its own place.
        if (step.id === 'petrie-court' && g === TUSCAN && columns.some((c) => atColumn(box, c))) return;
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
