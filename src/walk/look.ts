/**
 * The look target (docs/design/spec.md, Walk mode: Look target), the one way doors and labels find what the visitor looks at: the nearest tagged piece
 * (src/build/types.ts, `PieceTag`) on the eye's ray within its kind's reach, found by the page's hit query (src/viewer/pick.ts, `ModelPicker.hit`),
 * which passes through untagged glass and water but stops at any other surface, a tagged one it does not accept included, so a wall or a closed
 * door, glazed or not, hides what is behind it. A closed door's doorway, a box over its leaves and the gaps between and round them that the door layer
 * registers with the hit query alone (src/viewer/doorways.ts), is the door's, so the ray finds a closed door anywhere in its doorway, its leaves' 8 mm meeting line
 * included (work unit 2, review 17, F46).
 * Walk mode runs it every walking frame and again whenever something reads the target, so an action reads the target as the view stands then.
 */
import { Ray } from 'three';
import type { Vector3 } from 'three';

import type { PieceTag } from '../build/types.js';
import type { HitQuery, PickHit } from '../viewer/pick.js';

/** How far from the eye each kind of tagged piece can be looked at, metres: a door at arm's reach and a step, an artwork across a gallery. */
export const LOOK_REACH: Readonly<Record<PieceTag['kind'], number>> = Object.freeze({ door: 2, artwork: 6 });

/** The query the walking eye runs: through untagged transparent pieces, walls and tagged pieces out of reach blocking, for a tagged piece within its kind's reach. */
export const LOOK_QUERY: HitQuery = Object.freeze({
  throughTransparent: true,
  far: Math.max(...Object.values(LOOK_REACH)),
  accept: (tag: PieceTag | null, distance: number): boolean => tag !== null && distance <= LOOK_REACH[tag.kind],
});

/** The page's hit query (src/viewer/pick.ts `ModelPicker.hit`), or a stand-in with the same contract. */
export type HitFn = (ray: Ray, query: HitQuery) => PickHit | null;

/** What the eye looks at: a tagged piece's kind and id, its distance from the eye in metres, and the drawn instance the ray met. */
export interface LookTarget {
  readonly kind: PieceTag['kind'];
  readonly id: string;
  readonly distance: number;
  readonly hit: PickHit;
}

const ray = new Ray();

/** The look target from `eye` along the unit `look`, or null when no tagged piece is in reach there. */
export function lookTarget(hit: HitFn, eye: Vector3, look: Vector3): LookTarget | null {
  ray.origin.copy(eye);
  ray.direction.copy(look);
  const found = hit(ray, LOOK_QUERY);
  if (found?.tag == null) return null;
  return { kind: found.tag.kind, id: found.tag.id, distance: found.distance, hit: found };
}
