/**
 * Headless checks of the McKim, Mead & White area (src/model/mmw/): its step ids, chapters, titles and details; every vertex of every piece inside this area's
 * blocks; its budget; and finite matrices.
 * Blocks: the coordinator's assignment (docs/research/exterior.md section 2): mmw-north-e, -h, -f, mmw-south-j, -k. A vertex may lie up to 0.3 m outside them.
 * Exterior-moulding rule (coordinator, 2026-10-11): cornices, string courses, sills, mouldings and their modillions and dentils may reach 1.5 m beyond the exterior
 * faces (the fronts' runs in facade-layout.ts); walls never. The pieces the rule covers are those buildFrontCornices and buildFrontOrders add (cornices, entablature,
 * water table, cresting, and the pilasters' moulded bases and capitals), collected below by geometry.
 * Budget (coordinator): at most 500,000 triangles counting instances, 160 instanced meshes and 1 step light over all four exports.
 * Bound: geometry is built in Node without WebGL; the check is on vertex positions, so a face between two in-bounds vertices is not checked separately.
 */
import { Box3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { CHAPTERS } from '../../build/chapters.js';
import { collectStep } from '../../build/kit.js';
import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import type { Kit, StepDef } from '../../build/types.js';
import { SACKLER_GLASS_TOP_Y } from '../frame.js';
import { AW_PARAPET_Y } from '../roche-north/american.js';
import { KRAVIS_ROOF_Y } from '../roche-south/kravis.js';
import { RF_ROOF_Y } from '../roche-south/rockefeller.js';
import { MeshBuilder } from '../lib/builder.js';
import { partVolumes } from '../lib/facing.js';
import { buildFrontCornices, buildFrontOrders } from './facade.js';
import { FRONTS } from './facade-layout.js';
import { extrudeOutline } from './facade-parts.js';
import { normalOf } from './shapes.js';
import { astorCourt1981Steps, greekRomanCourt2007Steps, mmwSteps, northWallsRaised1978Steps, southWallsRaised1990Steps } from './index.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALL: readonly StepDef[] = [...mmwSteps, ...greekRomanCourt2007Steps, ...northWallsRaised1978Steps, ...astorCourt1981Steps, ...southWallsRaised1990Steps];

type Rect = readonly [number, number, number, number];
/** The five blocks as rectangles [x0, z0, x1, z1]; mmw-north-f is the union of two. */
const BLOCKS: readonly Rect[] = [
  [49.4, -38.5, 88.6, -2.0],
  [88.6, -41.3, 153.1, 9.8],
  [49.4, -96.0, 118.0, -41.3],
  [49.4, -41.3, 88.6, -38.5],
  [-88.1, -69.0, -49.7, -1.9],
  [-151.5, -38.5, -88.1, 9.9],
];
const OVERSTEP = 0.3;
const MOULDING_REACH = 1.5;

const inside = (rects: readonly Rect[], x: number, z: number, pad: number): boolean => rects.some(([x0, z0, x1, z1]) => x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad);

/** Bands 1.5 m deep in front of every exterior face, and the squares off their corners. */
const MOULDING_ZONES: readonly Rect[] = FRONTS.flatMap((front) =>
  front.runs.flatMap((r) => {
    const [nx, nz] = normalOf(r.line.facing);
    const ax = r.line.x;
    const az = r.line.z;
    const bx = ax + r.line.dir[0] * r.line.length;
    const bz = az + r.line.dir[1] * r.line.length;
    const ox = nx * MOULDING_REACH;
    const oz = nz * MOULDING_REACH;
    const band: Rect = [Math.min(ax, bx, ax + ox, bx + ox), Math.min(az, bz, az + oz, bz + oz), Math.max(ax, bx, ax + ox, bx + ox), Math.max(az, bz, az + oz, bz + oz)];
    const corner = (x: number, z: number): Rect => [x - MOULDING_REACH, z - MOULDING_REACH, x + MOULDING_REACH, z + MOULDING_REACH];
    return [band, corner(ax, az), corner(bx, bz)];
  }),
);

/** The geometries the exterior-moulding rule covers. */
function mouldingGeometries(): Set<BufferGeometry> {
  const found = new Set<BufferGeometry>();
  const kit: Kit = { add: (geometry) => found.add(geometry), addTagged: (geometry) => found.add(geometry), light: () => undefined };
  for (const front of FRONTS) {
    buildFrontCornices(kit, front);
    buildFrontOrders(kit, front);
  }
  return found;
}

describe('mmw steps', () => {
  it('have unique kebab-case ids, titles of at most 48 characters and details of at most 200', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => `${s.id}: ${s.title}`)).toEqual([]);
    expect(ALL.filter((s) => s.detail === undefined || s.detail.length === 0 || s.detail.length > 200).map((s) => `${s.id}: ${String(s.detail?.length)}`)).toEqual([]);
  });

  it('name the chapter each export is composed into, and every step gives its year', () => {
    expect(mmwSteps.length).toBeGreaterThan(0);
    expect(mmwSteps.filter((s) => s.chapter !== 'mckim-mead-white-1926').map((s) => s.id)).toEqual([]);
    expect(greekRomanCourt2007Steps.filter((s) => s.chapter !== 'koch-plaza-2014' || s.year !== '2007').map((s) => s.id)).toEqual([]);
    expect(northWallsRaised1978Steps.map((s) => `${s.id} ${s.chapter} ${String(s.year)}`)).toEqual(['mmw-north-walls-raised roche-north-1980 1978–1980']);
    expect(astorCourt1981Steps.filter((s) => s.chapter !== 'roche-north-1980').map((s) => s.id)).toEqual([]);
    expect(astorCourt1981Steps.map((s) => `${s.id} ${String(s.year)}`)).toEqual([
      'astor-court-floor-walls 1981',
      'astor-court-walk-pavilion 1981',
      'astor-court-garden 1981',
      'astor-court-skylight 1981',
    ]);
    expect(southWallsRaised1990Steps.filter((s) => s.chapter !== 'roche-south-1990').map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => s.year === undefined).map((s) => s.id)).toEqual([]);
    expect(CHAPTERS.some((c) => c.id === 'mckim-mead-white-1926')).toBe(true);
  });

  it('are all composed into the sequence, each wall raise first in the chapter of the wings it rises against', () => {
    // The south raise sat uncomposed and the Rockefeller and Kravis top galleries showed sky over +17.7 (coordinator, 2026-10-13).
    const ids = SEQUENCE.map((s) => s.id);
    expect(ALL.filter((s) => !ids.includes(s.id)).map((s) => s.id)).toEqual([]);
    const first = (chapter: string): number => SEQUENCE.findIndex((s) => s.chapter === chapter);
    expect(ids.indexOf('mmw-north-walls-raised')).toBe(first('roche-north-1980'));
    expect(ids.indexOf('mmw-south-walls-raised')).toBe(first('roche-south-1990'));
  });

  it('put the roofs and skylights after the walls and interiors of their campaign', () => {
    const ids = mmwSteps.map((s) => s.id);
    const last = (pattern: RegExp): number => ids.reduce((at, id, i) => (pattern.test(id) ? i : at), -1);
    const first = (pattern: RegExp): number => ids.findIndex((id) => pattern.test(id));
    expect(first(/roofs?$|vault/)).toBeGreaterThan(last(/walls$|galleries$|court-(?!vault)/));
  });
});

describe('mmw pieces', () => {
  const mouldings = mouldingGeometries();

  it('lie inside the blocks, mouldings within 1.5 m of the exterior faces, with finite matrices', () => {
    const outside: string[] = [];
    const v = new Vector3();
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, i) => {
        expect(piece.matrix.elements.every(Number.isFinite)).toBe(true);
        const position = piece.geometry.getAttribute('position');
        const moulding = mouldings.has(piece.geometry);
        for (let k = 0; k < position.count; k += 1) {
          v.fromBufferAttribute(position, k).applyMatrix4(piece.matrix);
          if (inside(BLOCKS, v.x, v.z, OVERSTEP)) continue;
          if (moulding && inside(MOULDING_ZONES, v.x, v.z, 0)) continue;
          outside.push(`${step.id} piece ${String(i)} vertex (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`);
          return;
        }
      });
    }
    expect(outside.slice(0, 12)).toEqual([]);
  });

  it('the vertex check fails a piece pushed outside the blocks', () => {
    const geometry = [...mouldings][0];
    expect(geometry).toBeDefined();
    const far = new Matrix4().makeTranslation(0, 0, 40);
    const position = geometry?.getAttribute('position');
    const v = new Vector3();
    let any = false;
    for (let k = 0; k < (position?.count ?? 0); k += 1) {
      if (position === undefined) break;
      v.fromBufferAttribute(position, k).applyMatrix4(far);
      if (!inside(BLOCKS, v.x, v.z, OVERSTEP) && !inside(MOULDING_ZONES, v.x, v.z, 0)) any = true;
    }
    expect(any).toBe(true);
  });

  it('stay within 500,000 triangles, 160 instanced meshes and 1 step light', () => {
    const stats = new Timeline(ALL).stats();
    expect(stats.triangles).toBeLessThanOrEqual(500_000);
    expect(stats.meshes).toBeLessThanOrEqual(160);
    expect(stats.lights).toBeLessThanOrEqual(1);
  });
});

describe('mmw shared walls', () => {
  /**
   * Each wall this area builds on a line shared with a newer, taller wing must reach that wing's roof once raised, or the newer wing's top-floor rooms see sky
   * over the old coping (the Dendur hall and the Engelhard Court did, 2026-10-13). The neighbours' heights are read from their own modules, so a change there
   * fails here. Bound: the built pieces of this area's exports, walls found by their boxes inside the wall's 0.8 m plan strip; it cannot see whether
   * src/build/sequence.ts composes every export (it composes all five since 2026-10-13).
   */
  const LINES: readonly { readonly name: string; readonly strip: Rect; readonly roof: number }[] = [
    { name: 'Sackler on X 118', strip: [117.2, -96.0, 118.0, -41.3], roof: SACKLER_GLASS_TOP_Y },
    { name: 'Sackler on Z -41.3', strip: [118.0, -41.3, 153.13, -40.5], roof: SACKLER_GLASS_TOP_Y },
    { name: 'American Wing on Z -96', strip: [49.4, -96.0, 118.0, -95.2], roof: AW_PARAPET_Y },
    { name: 'Rockefeller on X -88.1', strip: [-88.1, -69.0, -87.3, -38.5], roof: RF_ROOF_Y },
    { name: 'Rockefeller on Z -38.5', strip: [-151.61, -38.5, -88.1, -37.7], roof: RF_ROOF_Y },
    { name: 'Kravis on Z -69', strip: [-88.1, -69.0, -49.7, -68.2], roof: KRAVIS_ROOF_Y },
  ];

  it("reach each newer neighbour's roof on every shared line", () => {
    const boxes = ALL.flatMap((step) =>
      collectStep(step).pieces.map((piece) => {
        piece.geometry.computeBoundingBox();
        return (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
      }),
    );
    const short = LINES.flatMap(({ name, strip: [x0, z0, x1, z1], roof }) => {
      const along = Math.max(x1 - x0, z1 - z0);
      const walls = boxes.filter((b) => b.min.x >= x0 - 0.1 && b.max.x <= x1 + 0.1 && b.min.z >= z0 - 0.1 && b.max.z <= z1 + 0.1 && Math.max(b.max.x - b.min.x, b.max.z - b.min.z) >= along - 0.2);
      const top = Math.max(-Infinity, ...walls.map((b) => b.max.y));
      return top >= roof ? [] : [`${name}: wall top ${top.toFixed(2)} under the roof at ${roof.toFixed(2)}`];
    });
    expect(short).toEqual([]);
  });
});

describe('mmw parts', () => {
  it('extrude an outline either way round to one solid facing out, as the armour court gables need (clockwise, they faced in)', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [4, 0],
      [2, 3],
    ];
    for (const outline of [triangle, [...triangle].reverse()]) {
      const b = new MeshBuilder();
      extrudeOutline(b, outline, 0.5);
      expect(partVolumes(b.build(), new Vector3(0, 1, 0)).map((part) => Number(part.volume.toFixed(6)))).toEqual([3]);
    }
  });
});
