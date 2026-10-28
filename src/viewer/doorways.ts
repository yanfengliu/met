/**
 * The doorways of the closed doors, for the picker alone (docs/design/spec.md, Doors: Use; work unit 2, review 17, F46). A door's leaves stand 4 mm off
 * their frame and sill, and a pair's meet 8 mm apart (src/model/lib/window.ts `LEAF_GAP`), so the eye's one ray can pass between them: from the plaza
 * spawn, walked straight at the middle door, it looked through the meeting line and found no door. Each door has a box over its closed leaves and those
 * gaps, in its unit's frame, which stands while the door is built and closed where it stands (a locked door whenever it is built) and is gone while it
 * opens, stands open or closes, so the eye looks through the doorway a door opened. The boxes are one InstancedMesh for the page to register with the
 * picker (src/viewer/pick.ts `register`), tagged with their doors; it is in no scene, so no camera draws it, and nothing else reads it: no shadow, no cap
 * pass, no collision. Walls in front still hide a box, as they hide the leaves, and the section cut passes through it above the cut, as through them.
 * Bound: a box covers its door's closed pieces' boxes, which for a door unit's leaves is the opening its frame leaves them; it holds a door's pieces
 * placed at one matrix, as a door unit's are, or at matrices that move each other's boxes rigidly.
 */
import { Box3, BoxGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { PieceTag } from '../build/types.js';
import { LEAF_GAP } from '../model/lib/window.js';

/** One door as the doorways need it: its tag, and its closed pieces, each a geometry at its final world matrix. */
export interface DoorwayOf {
  readonly tag: PieceTag;
  readonly pieces: readonly { readonly geometry: BufferGeometry; readonly matrix: Matrix4 }[];
}

const unit = new BoxGeometry(1, 1, 1);
unit.computeBoundingBox();
const material = new MeshBasicMaterial({ name: 'doorway' });
const corner = new Vector3();
const toFirst = new Matrix4();

export class Doorways {
  /** The boxes standing now, packed from slot 0: the mesh the page registers with the picker. */
  readonly mesh: InstancedMesh;
  /** Each door's box as a matrix of the unit cube, in the order given. */
  private readonly boxes: readonly Matrix4[];
  private readonly tags: readonly PieceTag[];
  private readonly standing: PieceTag[] = [];

  constructor(doors: readonly DoorwayOf[]) {
    this.tags = doors.map((d) => d.tag);
    this.boxes = doors.map((d) => doorwayBox(d));
    this.mesh = new InstancedMesh(unit, material, Math.max(1, doors.length));
    this.mesh.name = 'doorways';
    this.mesh.matrixAutoUpdate = false;
    // Bounds over every box, for the picker's first test of the mesh: a superset of those standing at any time.
    this.boxes.forEach((m, k) => { this.mesh.setMatrixAt(k, m); });
    this.mesh.count = doors.length;
    this.mesh.computeBoundingSphere();
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  /** Stands the box of each door `closed(k)` says is closed where it stands (door k in the order given), and of no other. */
  update(closed: (k: number) => boolean): void {
    this.standing.length = 0;
    this.boxes.forEach((m, k) => {
      const tag = this.tags[k];
      if (tag === undefined || !closed(k)) return;
      this.mesh.setMatrixAt(this.standing.length, m);
      this.standing.push(tag);
    });
    this.mesh.count = this.standing.length;
    this.mesh.visible = this.standing.length > 0;
  }

  /** The door of the box in slot `instance`, or null for an empty slot. */
  tagOf(instance: number): PieceTag | null {
    return this.standing[instance] ?? null;
  }
}

/**
 * The matrix taking the unit cube onto door `door`'s doorway: the box over its pieces' boxes in the first piece's frame, grown by LEAF_GAP across (X)
 * and up and down (Y), the gaps a door unit's leaves keep from their frame, sill and transom bar, then placed by that piece's matrix.
 */
function doorwayBox(door: DoorwayOf): Matrix4 {
  const first = door.pieces[0];
  if (first === undefined) throw new Error(`Doorways: door "${door.tag.id}" has no piece; give the closed pieces its step places (src/viewer/doors.ts).`);
  toFirst.copy(first.matrix).invert();
  const box = new Box3();
  for (const { geometry, matrix } of door.pieces) {
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    const own = geometry.boundingBox ?? new Box3();
    const into = new Matrix4().multiplyMatrices(toFirst, matrix);
    for (let c = 0; c < 8; c += 1) box.expandByPoint(corner.set((c & 1) !== 0 ? own.max.x : own.min.x, (c & 2) !== 0 ? own.max.y : own.min.y, (c & 4) !== 0 ? own.max.z : own.min.z).applyMatrix4(into));
  }
  box.expandByVector(new Vector3(LEAF_GAP, LEAF_GAP, 0));
  const size = box.getSize(new Vector3());
  return first.matrix.clone().multiply(new Matrix4().compose(box.getCenter(new Vector3()), new Quaternion(), size));
}
