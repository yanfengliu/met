/**
 * Fit-out pieces that are themselves objects of The Met's collection (docs/design/spec.md, Collection: Fit-out pieces; docs/research/collection.md,
 * Fit-out pieces): the Temple of Dendur with its gate, Saint-Gaudens's Diana, Tiffany's loggia from Laurelton Hall and the choir screen from the
 * Cathedral of Valladolid. Each is built at its real form by its area's own steps, not by the collection's, so no placeholder is built for it:
 * picks.ts lists it under its space's `fitOut`, the catalogue keeps its record alone (catalogue.ts, display "fit-out"), and its builder adds its
 * pieces through `artworkKit`, which tags each with its Met object ID as a placeholder's pieces are tagged (place.ts `artworkTag`). So the look
 * target and an orbit-view click find it as they find a placeholder, and the page shows its card (Collection: Labels).
 * An artwork's tag splits no mesh (src/build/batch.ts keeps only doors apart): a tagged piece batches and draws as it did untagged, which
 * src/model/collection/fit-out.test.ts holds on the real steps.
 */
import type { Kit } from '../../build/types.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { DAIS_Y, PLATFORM_Y } from '../roche-north/plan.js';
import { CATALOGUE } from './catalogue.js';
import { artworkTag } from './place.js';
import type { FitOutEntry } from './types.js';

/** The Met's object IDs of the fit-out pieces (picks.ts `fitOut`), by the names their builders use. */
export const FIT_OUT = { templeOfDendur: 547802, diana: 11998, laureltonLoggia: 133, choirScreen: 201926 } as const;

/** The catalogue's record of fit-out piece `id`, or a throw naming it and the fix. */
export function fitOutEntryOf(id: number): FitOutEntry {
  const entry = CATALOGUE.find((e) => e.id === id);
  if (entry?.display !== 'fit-out') {
    const held = entry === undefined ? 'holds no record of it' : `holds it as a placeholder of ${entry.space}`;
    throw new Error(`Object ${String(id)} is built as a fit-out piece, but src/model/collection/catalogue.ts ${held}; list it under its space's fitOut in picks.ts and regenerate (npm run met-catalogue -- --fit-out).`);
  }
  return entry;
}

/**
 * A kit that adds every piece as a piece of the fit-out artwork `id`: `add` becomes `addTagged` with the artwork's tag, the piece's geometry,
 * material and matrix as given, so a builder written for a plain kit builds the same pieces, tagged. A piece the builder tags itself (a door's
 * leaf) keeps its own tag, and lights pass through. Throws unless the catalogue holds a fit-out record for `id`, so no piece is tagged with an
 * ID the page has no card for.
 */
export function artworkKit(kit: Kit, id: number): Kit {
  const tag = artworkTag(fitOutEntryOf(id).id);
  return {
    add(geometry, material, matrix) {
      kit.addTagged(geometry, material, matrix, tag);
    },
    addTagged(geometry, material, matrix, own) {
      kit.addTagged(geometry, material, matrix, own);
    },
    light(light) {
      kit.light(light);
    },
  };
}

/** One built part of a fit-out piece: the step that adds its pieces, and where a visitor stands to look at it. */
export interface FitOutPart {
  /** For messages: what the part is. */
  readonly name: string;
  /** The id of the build step that adds this part's pieces, each tagged with the piece's object ID. */
  readonly step: string;
  /** The level of the floor a visitor stands on before it, world metres. */
  readonly floor: number;
}

/** A fit-out piece of the collection as the model builds it: its Met object ID and its parts. */
export interface FitOutPiece {
  readonly id: number;
  readonly parts: readonly FitOutPart[];
}

/**
 * Every fit-out piece and the steps that build it, for the tests that hold its tags, its card and the way to it. The temple and its gate are one
 * record, built by two steps: the gate is looked at from the terrace before it, the temple from the forecourt on its dais.
 */
export const FIT_OUT_PIECES: readonly FitOutPiece[] = [
  {
    id: FIT_OUT.templeOfDendur,
    parts: [
      { name: 'the gate of the Temple of Dendur', step: 'dendur-gate', floor: PLATFORM_Y },
      { name: 'the Temple of Dendur', step: 'dendur-temple', floor: DAIS_Y },
    ],
  },
  { id: FIT_OUT.diana, parts: [{ name: 'Diana on her pedestal', step: 'engelhard-sculpture', floor: MAIN_FLOOR_Y }] },
  { id: FIT_OUT.laureltonLoggia, parts: [{ name: 'the loggia from Laurelton Hall', step: 'engelhard-loggia', floor: MAIN_FLOOR_Y }] },
  { id: FIT_OUT.choirScreen, parts: [{ name: 'the choir screen from Valladolid', step: 'medieval-hall-choir-screen', floor: MAIN_FLOOR_Y }] },
];
