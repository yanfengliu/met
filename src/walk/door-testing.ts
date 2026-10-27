/**
 * Test support for the doors against the walker (imported only by `*.test.ts`): a fixture doorway from the real door pieces, the Fifth Avenue entrance's
 * door unit (src/model/hunt/arches.ts `entranceDoor`, its leaves tagged and in the entrance's materials) in a wall over a floor, and an oracle apart from the
 * walk's collision for how far the leaves keep out of the walker's body: each leaf triangle, posed by the door layer's matrices, against points every 5 cm
 * up the walker's axis (three's Triangle), so it can only read a gap wider than the exact one.
 */
import { BoxGeometry, Matrix4, Quaternion, Triangle, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';

import { CHAPTERS } from '../build/chapters.js';
import type { Kit, StepDef } from '../build/types.js';
import { doorTag } from '../model/doors.js';
import { entranceDoor } from '../model/hunt/arches.js';
import { hunt } from '../model/hunt/materials.js';
import { palette } from '../model/palette.js';
import type { DoorLayer } from '../viewer/doors.js';
import { BODY } from './walker.js';

export const FLOOR_Y = -1;
export const ID = 'hunt-entrance-middle';
const cube = new BoxGeometry(1, 1, 1);
/** The entrance's door unit, its depth (the frame's) and its half width, in the unit's frame (src/model/lib/window.ts). */
const UNIT = entranceDoor();
const DEPTH = 0.14;
const HALF = 0.746;

/** A box from `min` to `max`, in world metres. */
function block(kit: Kit, min: readonly number[], max: readonly number[], material: Material = palette.limestone): void {
  const [x0 = 0, y0 = 0, z0 = 0] = min;
  const [x1 = 0, y1 = 0, z1 = 0] = max;
  kit.add(cube, material, new Matrix4().compose(new Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Quaternion(), new Vector3(x1 - x0, y1 - y0, z1 - z0)));
}

const step = (id: string, build: (kit: Kit) => void): StepDef => ({ id, chapter: CHAPTERS[0].id, title: id, motion: { kind: 'rise' }, build });

/** A floor, a wall across Z with a doorway the door's width at its front face `z`, and the entrance's door in it: steps 0, 1 and 2, about (x, y, z). */
export function doorway(x = 0, y = 0, z = 0): StepDef[] {
  return [
    step('floor', (kit) => { block(kit, [x - 12, y - 0.2, z - 12], [x + 12, y, z + 12]); }),
    step('wall', (kit) => {
      block(kit, [x - 8, y, z - DEPTH], [x - HALF, y + 6, z]);
      block(kit, [x + HALF, y, z - DEPTH], [x + 8, y + 6, z]);
      block(kit, [x - HALF, y + 4.79, z - DEPTH], [x + HALF, y + 6, z]);
    }),
    step('door', (kit) => {
      const m = new Matrix4().makeTranslation(x, y, z);
      kit.add(UNIT.frame, hunt.doorBronze, m);
      if (UNIT.glass !== undefined) kit.add(UNIT.glass, hunt.doorGlass, m);
      kit.addTagged(UNIT.leaf, hunt.doorLeafBronze, m, doorTag(ID));
      if (UNIT.leafGlass !== undefined) kit.addTagged(UNIT.leafGlass, hunt.doorLeafGlass, m, doorTag(ID));
    }),
  ];
}

const triangle = new Triangle();
const point = new Vector3();
const closest = new Vector3();
const matrix = new Matrix4();

/** Each triangle of `geometry` placed by `m`, in world space. */
function* triangles(geometry: BufferGeometry, m: Matrix4): Generator<Triangle> {
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const count = index === null ? position.count : index.count;
  const vertex = (i: number, out: Vector3): Vector3 => out.fromBufferAttribute(position, index === null ? i : index.getX(i)).applyMatrix4(m);
  for (let i = 0; i + 2 < count; i += 3) {
    vertex(i, triangle.a);
    vertex(i + 1, triangle.b);
    vertex(i + 2, triangle.c);
    yield triangle;
  }
}

/** How far the door's leaves, where the layer stands them, keep outside the body at `feet`: metres from its axis less its radius, negative inside. */
export function gap(layer: DoorLayer, feet: Vector3): number {
  let least = Number.POSITIVE_INFINITY;
  layer.parts.forEach((part, k) => {
    const angle = layer.angleOf(part.door);
    if (angle === null) return;
    for (const tri of triangles(part.geometry, layer.partMatrix(k, angle, matrix))) {
      for (let h = BODY.radius; h <= BODY.height - BODY.radius + 1e-9; h += 0.05) {
        tri.closestPointToPoint(point.set(feet.x, feet.y + h, feet.z), closest);
        least = Math.min(least, closest.distanceTo(point));
      }
    }
  });
  return least - BODY.radius;
}
