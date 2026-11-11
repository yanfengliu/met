/**
 * Types of the collection on view (docs/design/spec.md, Collection; docs/research/collection.md): the picks a person chooses (picks.ts), the catalogue
 * scripts/met-catalogue.ts writes from The Met's Collection API (catalogue.ts), and the placements the spaces' steps build from both. The catalogue
 * holds two kinds of entry: an object the collection's steps build a placeholder of (`PlaceholderEntry`), and a fit-out piece that is itself an object
 * of the collection, which its space's own steps build (`FitOutEntry`: its record alone, for its card).
 * Data only. picks.ts and catalogue.ts import nothing else at run time, so the script, run by Node's own TypeScript support, can load them.
 */

/** The form a placeholder takes: a standing or recumbent figure, a bust, a vessel, a relief or panel, a painting in its frame, or a block. */
export type ArtKind = 'figure' | 'bust' | 'vessel' | 'slab' | 'frame' | 'plinth';

/** How a placeholder is shown: raised on a plinth, in a vitrine (objects under 0.6 m), hung on a wall (frames, and slabs from 0.6 m), or on the floor. */
export type ArtDisplay = 'plinth' | 'vitrine' | 'wall' | 'floor';

/** One choice made in a pick, with the reason a reader can check. */
export interface Override<T> {
  readonly value: T;
  readonly reason: string;
}

/** Metres; a pick sets a dimension the record lacks or gets wrong, and says why. */
export interface SizeOverride {
  readonly h?: number;
  readonly w?: number;
  readonly d?: number;
  readonly reason: string;
}

/** One object chosen for a space, by The Met's object ID; every override is optional and carries its reason. */
export interface Pick {
  readonly id: number;
  readonly kind?: Override<ArtKind>;
  readonly display?: Override<ArtDisplay>;
  readonly size?: SizeOverride;
  /** Accepts a record whose GalleryNumber is not one of the space's galleries (the value it must have instead). */
  readonly gallery?: Override<string>;
}

/** A space of the model and the objects chosen for it. A record must name one of `galleries` (its GalleryNumber) unless its pick overrides it. */
export interface SpacePicks {
  readonly id: string;
  readonly title: string;
  readonly galleries: readonly string[];
  /** The objects the space's collection step builds placeholders of: five to twelve. */
  readonly picks: readonly Pick[];
  /**
   * The space's fit-out pieces that are themselves objects of the collection (the Temple of Dendur in its hall, Diana in her court): the space's own
   * build steps make each at its real form, so no placeholder is built for it, and the catalogue keeps its record alone, for its card. Such a pick
   * takes no kind or display, and gives, with its reason, each dimension its record does not measure.
   */
  readonly fitOut?: readonly Pick[];
}

/** Where a dimension came from: the record's measurements, its dimensions text, the kind's proportions (an estimate), or the pick. */
export type SizeSource = 'measurements' | 'dimensions' | 'estimate' | 'pick';

/** Where a colour came from: the object's public-domain image, or a fallback by medium or by kind (docs/research/collection.md). */
export type ColourSource = 'image' | 'medium' | 'kind';

/** Height, width (across, as shown) and depth (front to back), in metres. */
export interface Size {
  readonly h: number;
  readonly w: number;
  readonly d: number;
}

/** What the catalogue keeps of every object, and all the artwork's card shows: The Met's CC0 metadata for it, its size and where each came from. */
export interface ObjectRecord {
  readonly id: number;
  readonly space: string;
  readonly accession: string;
  readonly title: string;
  /** The artist's display name, else the culture, else ''. */
  readonly maker: string;
  readonly date: string;
  readonly medium: string;
  readonly objectName: string;
  readonly classification: string;
  readonly department: string;
  /** The record's GalleryNumber, as given. */
  readonly gallery: string;
  readonly creditLine: string;
  /** The object's page on metmuseum.org (for labels; never fetched by the page). */
  readonly url: string;
  readonly publicDomain: boolean;
  readonly size: Size;
  readonly sizeFrom: { readonly h: SizeSource; readonly w: SizeSource; readonly d: SizeSource };
  /** The measurement element the size came from, e.g. 'Overall', or 'dimensions text'. */
  readonly element: string;
  /** Provenance: the API URL, the day it was fetched, the record's metadataDate and the first 16 hex digits of the SHA-256 of the response body. */
  readonly source: { readonly url: string; readonly fetched: string; readonly metadataDate: string; readonly sha256: string };
}

/** An object the collection's steps build a placeholder of: its record, and the placeholder's derived form, display, size and colour. */
export interface PlaceholderEntry extends ObjectRecord {
  readonly kind: ArtKind;
  /** 'name': derived from the object name and classification; 'pick': the pick's override. */
  readonly kindFrom: 'name' | 'pick';
  readonly display: ArtDisplay;
  readonly displayFrom: 'rule' | 'pick';
  /** The record's pedestal element, when it gives one: the plinth then takes its size. */
  readonly pedestal?: Size;
  /** The record's framed element (height and width), when it gives one: the frame then takes its size. */
  readonly framed?: { readonly h: number; readonly w: number };
  /** sRGB '#rrggbb': the mean colour of the object in its image, or the fallback. */
  readonly colour: string;
  /** Frames only: 8 × 8 sRGB cells of the image, row by row from the top. */
  readonly grid?: readonly string[];
  readonly colourFrom: ColourSource;
  /** The image sampled, when there was one: its URL, the first 16 hex digits of the SHA-256 of its bytes, and its size in pixels. */
  readonly image?: { readonly url: string; readonly sha256: string; readonly width: number; readonly height: number };
}

/**
 * A fit-out piece that is itself an object of the collection (picks.ts `fitOut`): its record alone. Its space's own build steps make it at its real
 * form and tag its pieces with its object ID (src/model/collection/fit-out.ts), so no placeholder is built: it has no kind, no colour and no sampled
 * image, and its size is the record's, never an estimate by kind (`sizeFrom` is `measurements`, `dimensions` or `pick`).
 */
export interface FitOutEntry extends ObjectRecord {
  /** Told from a placeholder by this: shown as its space's fit-out builds it. */
  readonly display: 'fit-out';
}

/** One object of the catalogue: a placeholder's entry or a fit-out piece's record, told apart by `display`. */
export type CatalogueEntry = PlaceholderEntry | FitOutEntry;

/** The catalogue file's own provenance. */
export interface CatalogueSource {
  readonly api: string;
  readonly licence: string;
  readonly generated: string;
  readonly script: string;
  readonly sampler: string;
}
