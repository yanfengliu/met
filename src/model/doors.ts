/**
 * The model's doors (docs/design/spec.md, Doors): each door's stable id, what it is and whether it is locked. A door is one doorway's leaves, the pair
 * or the one leaf of src/model/lib/window.ts `doorUnit`, which a build places closed (`DoorParts.leaf`, and `leafGlass` for a glazed door) through
 * `kit.addTagged` with the door's tag (`doorTag`); the frame and the fanlight are no part of the door. The page's door layer (src/viewer/doors.ts) turns an
 * unlocked door's leaves about their hinges; a locked door stays shut whatever is asked of it.
 * Doors that open: the three doorways of the Hunt central arch, the Fifth Avenue entrance (src/model/hunt/arches.ts). Their leaves are passable, as the
 * fixed glazing there was, until the walk's collision follows the leaves (work unit 2, M2b). Locked, and solid: the McKim, Mead & White links' doors
 * (src/model/mmw/facade.ts) over a drop of 2.9 m behind them, and the Branch Bank's door in the Engelhard Court (src/model/roche-north/bank.ts) over one
 * of 0.65 m (work unit 2 audit). Weston's 1888 door into the Petrie Court stays a solid, closed piece with no tag until M2b makes it a door with its
 * collision. Gallery doorways are open portals and have no leaves.
 */
import type { PieceTag } from '../build/types.js';

export interface DoorInfo {
  /** Stable and unique, kebab-case: tests and `window.__met.doors` name it. */
  readonly id: string;
  /** What the door is, for people reading the code and the facts. */
  readonly name: string;
  /** A locked door never opens, by any input or query. */
  readonly locked: boolean;
}

export const DOORS: readonly DoorInfo[] = Object.freeze(
  [
    { id: 'hunt-entrance-south', name: 'Fifth Avenue entrance, the central arch, south doorway', locked: false },
    { id: 'hunt-entrance-middle', name: 'Fifth Avenue entrance, the central arch, middle doorway', locked: false },
    { id: 'hunt-entrance-north', name: 'Fifth Avenue entrance, the central arch, north doorway', locked: false },
    { id: 'mmw-north-link', name: "the north link's door on the plaza", locked: true },
    { id: 'mmw-south-link', name: "the south link's door, the 81st Street entrance", locked: true },
    { id: 'bank', name: 'the Branch Bank door in the Engelhard Court', locked: true },
  ].map((door) => Object.freeze(door)),
);

/** The door with id `id`, or undefined. */
export function doorById(id: string): DoorInfo | undefined {
  return DOORS.find((door) => door.id === id);
}

/** The tag a build gives every closed-leaf piece of door `id` (`kit.addTagged`); an id that names no door fails, naming the doors there are. */
export function doorTag(id: string): PieceTag {
  if (doorById(id) === undefined) throw new Error(`doorTag: "${id}" names no door of src/model/doors.ts; use one of ${DOORS.map((d) => d.id).join(', ')}.`);
  return Object.freeze({ kind: 'door', id });
}
