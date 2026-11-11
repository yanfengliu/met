/**
 * Every piece of an artwork, for the orbit view's card (docs/design/spec.md, Collection: Labels; src/viewer/art-label.ts): a clicked artwork's card
 * stays while the camera draws any piece of it, so the page gives the label all of them, in whichever build steps add them. Most artworks are built
 * by one step (a placeholder with its plinth, frame and glass; Diana with her pedestal), but not every one: the Temple of Dendur and its gate are
 * one object of the collection built by two steps (src/model/collection/fit-out.ts), and a card that followed the clicked piece's step alone hid
 * once the cut had taken the temple, while the gate was still drawn (work unit 29, review 0, F1).
 */
import type { BuiltStep } from '../build/timeline.js';
import { artworkInstances } from './art-label.js';
import type { ArtInstance } from './art-label.js';
import type { PickHit } from './pick.js';

/**
 * The page's `piecesOf` for its ArtLabel (src/main.ts), over the built `steps`: every instance of any step that carries artwork `id`'s tag, in the
 * steps' order, whichever piece the click or the look met. The piece met is always among them: one that no step holds (a mesh the page adds beside
 * the timeline's; none carries an artwork's tag today) is added after the steps' own, so the pieces are never none.
 */
export function artworkPiecesIn(steps: readonly BuiltStep[]): (hit: PickHit, id: string) => readonly ArtInstance[] {
  return (hit, id) => {
    const pieces = steps.flatMap((step) => artworkInstances(step, id));
    return pieces.some((piece) => piece.mesh === hit.mesh && piece.instance === hit.instance) ? pieces : [...pieces, { mesh: hit.mesh, instance: hit.instance }];
  };
}
