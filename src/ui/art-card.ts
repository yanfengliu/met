/**
 * The artwork's card (docs/design/spec.md, Collection: Labels): the label of the placeholder the walking eye looks at, or the one clicked in the orbit
 * view, from its catalogue entry (src/model/collection/catalogue.ts): its title; its maker (the artist or the culture, as the record gives it) and its
 * date; its medium; its gallery and its size, the values the record does not measure named as estimated; its page on metmuseum.org, as a plain link that
 * opens a new tab and is never prefetched; and the CC0 credit for The Met's collection data. While the pointer is locked to the walking view it says how
 * to reach the link. Which artwork shows is src/viewer/art-label.ts's; the timeline's step label is src/ui/label.ts, a different thing.
 */
import type { CatalogueEntry, SizeSource } from '../model/collection/types.js';
import { el, setAttr, setText } from './dom.js';

/** What the card shows for one artwork. */
export interface ArtCardContent {
  /** The Met's object ID, as its pieces' tag gives it. */
  readonly id: string;
  readonly title: string;
  /** The artist or the culture as the record gives it, or null for a record that names neither (the card then shows the date alone). */
  readonly maker: string | null;
  readonly date: string;
  readonly medium: string;
  /** "Gallery 600". */
  readonly gallery: string;
  /** Height by width by depth in centimetres, followed by the axes the record does not measure: "H 164 × W 103 × D 343 cm, width estimated". */
  readonly size: string;
  /** The object's page on metmuseum.org. */
  readonly url: string;
}

/** The credit for the data every card shows (docs/research/collection.md, Source and licence). */
export const ART_CREDIT = 'Object data: The Met Open Access, CC0';
/** What the card says while the pointer is locked to the walking view, where the link cannot be clicked. */
export const LOCKED_HINT = 'Esc frees the pointer to open the link.';

/** Centimetres from metres, to the millimetre the catalogue keeps: 1.64 → "164", 0.245 → "24.5". */
function centimetres(metres: number): string {
  return String(Math.round(metres * 1000) / 10);
}

const AXES = [['h', 'H', 'height'], ['w', 'W', 'width'], ['d', 'D', 'depth']] as const;
/** A value the record does not measure: the kind's proportions (the catalogue's `estimate`) or a pick's stand-in (`pick`, with its reason in picks.ts). */
const estimated = (source: SizeSource): boolean => source === 'estimate' || source === 'pick';

/** The size line: "H 164 × W 103 × D 343 cm", then which values are estimated ("width estimated", "width and depth estimated", "all estimated"). */
export function sizeText(entry: Pick<CatalogueEntry, 'size' | 'sizeFrom'>): string {
  const values = AXES.map(([axis, letter]) => `${letter} ${centimetres(entry.size[axis])}`).join(' × ');
  const guessed = AXES.filter(([axis]) => estimated(entry.sizeFrom[axis])).map(([, , name]) => name);
  if (guessed.length === 0) return `${values} cm`;
  if (guessed.length === AXES.length) return `${values} cm, all estimated`;
  return `${values} cm, ${guessed.join(' and ')} estimated`;
}

/** The card of one catalogue entry. */
export function cardContent(entry: CatalogueEntry): ArtCardContent {
  return Object.freeze({
    id: String(entry.id),
    title: entry.title,
    maker: entry.maker === '' ? null : entry.maker,
    date: entry.date,
    medium: entry.medium,
    gallery: `Gallery ${entry.gallery}`,
    size: sizeText(entry),
    url: entry.url,
  });
}

/** The card's element and its parts, synced every frame, touching the DOM only when what it shows changes. */
export class ArtCard {
  readonly element: HTMLElement;
  private readonly title: HTMLElement;
  private readonly maker: HTMLElement;
  private readonly sep: HTMLElement;
  private readonly date: HTMLElement;
  private readonly medium: HTMLElement;
  private readonly gallery: HTMLElement;
  private readonly size: HTMLElement;
  private readonly link: HTMLAnchorElement;
  private readonly hint: HTMLElement;
  private shown: ArtCardContent | null = null;

  constructor() {
    this.title = el('h2', { className: 'met-art-title', testid: 'art-title' });
    this.maker = el('span', { testid: 'art-maker' });
    this.sep = el('span', { text: ' · ', attrs: { 'aria-hidden': 'true' } });
    this.date = el('span', { testid: 'art-date' });
    this.medium = el('span', { testid: 'art-medium' });
    this.gallery = el('span', { testid: 'art-gallery' });
    this.size = el('p', { className: 'met-art-line met-art-dim', testid: 'art-size' });
    // A plain anchor: the browser opens it in a new tab when it is clicked, and nothing fetches it before (no prefetch or preload hint).
    this.link = el('a', { className: 'met-art-link', testid: 'art-link', text: 'View on metmuseum.org', attrs: { target: '_blank', rel: 'noopener noreferrer' } });
    this.hint = el('p', { className: 'met-art-hint', testid: 'art-hint', text: LOCKED_HINT });
    this.hint.hidden = true;
    this.element = el('section', { className: 'met-art-card', testid: 'art-card', attrs: { 'aria-label': 'Artwork label' } }, [
      this.title,
      el('p', { className: 'met-art-line' }, [this.maker, this.sep, this.date]),
      el('p', { className: 'met-art-line met-art-dim' }, [this.medium, el('span', { text: ' · ', attrs: { 'aria-hidden': 'true' } }), this.gallery]),
      this.size,
      el('p', { className: 'met-art-foot' }, [this.link, el('span', { className: 'met-art-credit', testid: 'art-credit', text: ART_CREDIT })]),
      this.hint,
    ]);
    this.element.hidden = true;
  }

  /** Shows `content`, or hides the card for null; `locked`: the pointer is locked to the walking view, so the card says how to reach its link. */
  sync(content: ArtCardContent | null, locked: boolean): void {
    if (content !== this.shown) {
      this.shown = content;
      if (content !== null) this.fill(content);
    }
    if (this.element.hidden !== (content === null)) this.element.hidden = content === null;
    const hint = content === null || !locked;
    if (this.hint.hidden !== hint) this.hint.hidden = hint;
  }

  private fill(c: ArtCardContent): void {
    setText(this.title, c.title);
    setText(this.maker, c.maker ?? '');
    this.maker.hidden = c.maker === null;
    this.sep.hidden = c.maker === null;
    setText(this.date, c.date);
    setText(this.medium, c.medium);
    setText(this.gallery, c.gallery);
    setText(this.size, c.size);
    setAttr(this.link, 'href', c.url);
    setAttr(this.link, 'aria-label', `${c.title} on metmuseum.org (opens in a new tab)`);
  }
}
