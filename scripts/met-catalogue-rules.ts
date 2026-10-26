/**
 * The catalogue's rules, free of disk, network and browser (scripts/met-catalogue.ts runs them; scripts/met-catalogue.test.ts checks them): a record of
 * The Met's Collection API (https://metmuseum.github.io/, Object) checked and turned into one catalogue entry, with the colour statistics of its decoded
 * image. The rules are written out in docs/research/collection.md (Measurements, Kinds, Colours); a change here changes that section in the same commit.
 * No run-time import, so Node loads this file as it is.
 */
import type { ArtDisplay, ArtKind, CatalogueEntry, ColourSource, Pick, Size, SizeSource, SpacePicks } from '../src/model/collection/types.js';

export const API_OBJECTS = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';
/** The sampler bins a decoded image into SAMPLER_BINS × SAMPLER_BINS cells; a frame's grid is GRID × GRID of them. */
export const SAMPLER_BINS = 64;
export const GRID = 8;
/** Objects whose largest dimension is under this stand in a vitrine (metres). */
export const VITRINE_BELOW = 0.6;
/** A frame's depth when the record gives none: canvas or panel on its stretcher (metres). */
export const FRAME_DEPTH = 0.05;

/** The fields of an object record the script reads. */
export interface MetRecord {
  readonly objectID: number;
  readonly accessionNumber: string;
  readonly title: string;
  readonly artistDisplayName: string;
  readonly culture: string;
  readonly objectDate: string;
  readonly medium: string;
  readonly objectName: string;
  readonly classification: string;
  readonly department: string;
  readonly GalleryNumber: string;
  readonly creditLine: string;
  readonly objectURL: string;
  readonly isPublicDomain: boolean;
  readonly primaryImageSmall: string;
  readonly dimensions: string;
  readonly measurements: readonly MetMeasurement[] | null;
  readonly metadataDate: string;
}

export interface MetMeasurement {
  readonly elementName: string;
  readonly elementDescription: string | null;
  readonly elementMeasurements: Readonly<Record<string, number>>;
}

const STRING_FIELDS = ['accessionNumber', 'title', 'artistDisplayName', 'culture', 'objectDate', 'medium', 'objectName', 'classification', 'department', 'GalleryNumber', 'creditLine', 'objectURL', 'primaryImageSmall', 'dimensions', 'metadataDate'] as const;

/** The record in `text`, the body the API returned for object `id`; throws, naming the object and the field, if it is not a usable record. */
export function parseRecord(text: string, id: number): MetRecord {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`Object ${String(id)}: the API returned a body that is not JSON (${text.slice(0, 80)}); fetch it again, or drop the pick.`);
  }
  if (typeof value !== 'object' || value === null) throw new Error(`Object ${String(id)}: the API returned ${JSON.stringify(value)}, not an object record.`);
  const record = value as Record<string, unknown>;
  if (record['objectID'] !== id) throw new Error(`Object ${String(id)}: the record's objectID is ${JSON.stringify(record['objectID'])}; expected ${String(id)}.`);
  for (const field of STRING_FIELDS) {
    if (typeof record[field] !== 'string') throw new Error(`Object ${String(id)}: field ${field} is ${JSON.stringify(record[field])}, not a string; the record format may have changed.`);
  }
  if (typeof record['isPublicDomain'] !== 'boolean') throw new Error(`Object ${String(id)}: field isPublicDomain is not a boolean.`);
  const measurements = record['measurements'];
  if (measurements !== null && !Array.isArray(measurements)) throw new Error(`Object ${String(id)}: field measurements is neither null nor a list.`);
  return value as MetRecord;
}

// --- Measurements -----------------------------------------------------------------------------------------------------------------------

type Axis = 'h' | 'w' | 'd';
type Partial3 = Partial<Record<Axis, number>>;

/** An element that measures the object without its frame, base or mount ("without base", "Overall (without frame)"). */
const PROPER = /\bwithout (?:a |its )?(?:frame|base|pedestal|mount|stand|plinth)\b/i;
/** An element that measures something other than the object itself: a frame, pedestal, base, mount, stand, case, foot or display. */
const NOT_THE_OBJECT = /\b(?:frame|framed|pedestal|base|mount|stand|case|foot|plinth|display)\b/i;
const SPATIAL = ['Height', 'Width', 'Depth', 'Length', 'Diameter'] as const;

const cmToM = (cm: number): number => Math.round(cm * 10) / 1000;
const label = (e: MetMeasurement): string => `${e.elementName}${e.elementDescription === null ? '' : ` (${e.elementDescription})`}`;
const spatial = (e: MetMeasurement): boolean => SPATIAL.some((k) => Number.isFinite(e.elementMeasurements[k]));

/** Height, width and depth of one element: Width else Diameter across, Depth else Length else Diameter front to back. */
function axesOf(e: MetMeasurement): Partial3 {
  const m = e.elementMeasurements;
  const out: Partial3 = {};
  const put = (axis: Axis, cm: number | undefined): void => {
    if (cm !== undefined && Number.isFinite(cm) && out[axis] === undefined) out[axis] = cmToM(cm);
  };
  put('h', m['Height']);
  put('w', m['Width']);
  put('w', m['Diameter']);
  put('d', m['Depth']);
  put('d', m['Length']);
  put('d', m['Diameter']);
  return out;
}

/**
 * The element that measures the object (docs/research/collection.md, Measurements). Of the elements with a spatial measurement, those that name a frame,
 * pedestal, base, mount, stand, case, foot or display are left out, unless they measure the object without one ("without base"). Of those left, the
 * first that holds of: 'Overall' with no description; one without its frame or base; 'Overall' with a description; one whose description says
 * overall; the first. Axes it lacks are taken from the others left, in order (records that give height and width as separate 'Other' elements).
 */
export function objectElement(measurements: readonly MetMeasurement[] | null): { readonly element: string; readonly axes: Partial3 } | null {
  const candidates = (measurements ?? []).filter((e) => spatial(e) && (PROPER.test(label(e)) || !NOT_THE_OBJECT.test(label(e))));
  const chosen =
    candidates.find((e) => e.elementName === 'Overall' && e.elementDescription === null) ??
    candidates.find((e) => PROPER.test(label(e))) ??
    candidates.find((e) => e.elementName === 'Overall') ??
    candidates.find((e) => /overall/i.test(e.elementDescription ?? '')) ??
    candidates[0];
  if (chosen === undefined) return null;
  const axes = axesOf(chosen);
  for (const other of candidates) {
    if (other === chosen) continue;
    const more = axesOf(other);
    for (const axis of ['h', 'w', 'd'] as const) if (axes[axis] === undefined && more[axis] !== undefined) axes[axis] = more[axis];
  }
  return { element: label(chosen), axes };
}

/** An element whose name matches `pattern` and gives all three axes (a pedestal), or height and width (a frame). */
function namedElement(measurements: readonly MetMeasurement[] | null, pattern: RegExp): Partial3 | null {
  const e = (measurements ?? []).find((m) => pattern.test(label(m)) && !PROPER.test(label(m)) && spatial(m));
  return e === undefined ? null : axesOf(e);
}

const DIMENSION_LABEL = /^\s*(?:as mounted,?\s*)?(H|W|D|L|Diam)\.\s*(?:as mounted\s*)?[^;()]*?\((\d+(?:\.\d+)?)\s*cm\)/i;
const WEIGHT_LABEL = /^\s*(?:as mounted,?\s*)?Wt\./i;

/**
 * Height, width and depth from a record's dimensions text, for records whose measurements give no height: the leading run of segments (split on ';')
 * that each start with H., W., D., L., Diam. or Wt., each value read from its '(… cm)'; it stops at the first other segment, where a record goes on
 * to measure its parts ('helmet (a); H. …').
 */
export function dimensionsFromText(text: string): Partial3 {
  const out: Partial3 = {};
  for (const segment of text.split(';')) {
    if (WEIGHT_LABEL.test(segment)) continue;
    const match = DIMENSION_LABEL.exec(segment);
    if (match === null) break;
    const cm = Number(match[2]);
    const key = (match[1] ?? '').toLowerCase();
    const axes: readonly Axis[] = key === 'h' ? ['h'] : key === 'w' ? ['w'] : key === 'diam' ? ['w', 'd'] : ['d'];
    for (const axis of axes) if (out[axis] === undefined) out[axis] = cmToM(cm);
  }
  return out;
}

/** Width and depth of a kind where the record gives only its height (and perhaps one of them): an estimate, marked so. */
function estimate(kind: ArtKind, axis: 'w' | 'd', h: number, w: number | undefined, d: number | undefined): number {
  const r = (x: number): number => Math.round(x * 1000) / 1000;
  if (axis === 'w') {
    if (kind === 'figure' && d !== undefined && d > h) return r(0.3 * d);
    const ratio: Record<ArtKind, number> = { figure: 0.38, bust: 0.75, vessel: 0.62, slab: 0.8, frame: 0.8, plinth: 0.7 };
    return r(ratio[kind] * h);
  }
  if (kind === 'frame') return FRAME_DEPTH;
  if (kind === 'vessel' && w !== undefined) return w;
  if (kind === 'slab') return r(0.12 * h);
  const ratio: Record<ArtKind, number> = { figure: 0.3, bust: 0.55, vessel: 0.62, slab: 0.12, frame: 0, plinth: 0.7 };
  return r(ratio[kind] * h);
}

export interface SizeResult {
  readonly size: Size;
  readonly sizeFrom: { readonly h: SizeSource; readonly w: SizeSource; readonly d: SizeSource };
  readonly element: string;
  readonly pedestal?: Size;
  readonly framed?: { readonly h: number; readonly w: number };
}

/** Smallest and largest dimension a placeholder may take, in metres. */
const MIN_M = 0.005;
const MAX_M = 25;

/** The object's size by the rules of docs/research/collection.md (Measurements); throws, naming the object, when no height can be found or a value is implausible. */
export function sizeOf(record: MetRecord, kind: ArtKind, pick: Pick): SizeResult {
  const from = objectElement(record.measurements);
  let axes: Partial3 = { ...(from?.axes ?? {}) };
  const sources: Partial<Record<Axis, SizeSource>> = {};
  for (const axis of ['h', 'w', 'd'] as const) if (axes[axis] !== undefined) sources[axis] = 'measurements';
  let element = from?.element ?? 'none';
  if (axes.h === undefined) {
    const text = dimensionsFromText(record.dimensions);
    if (text.h !== undefined) {
      axes = text;
      for (const axis of ['h', 'w', 'd'] as const) if (axes[axis] !== undefined) sources[axis] = 'dimensions';
      element = 'dimensions text';
    }
  }
  for (const axis of ['h', 'w', 'd'] as const) {
    const value = pick.size?.[axis];
    if (value !== undefined) {
      axes[axis] = value;
      sources[axis] = 'pick';
    }
  }
  const h = axes.h;
  if (h === undefined) {
    throw new Error(`Object ${String(record.objectID)} ("${record.title}"): no height in its measurements or its dimensions text ("${record.dimensions.slice(0, 80)}"); give one in its pick (size.h, with the reason).`);
  }
  const w = axes.w ?? estimate(kind, 'w', h, undefined, axes.d);
  const d = axes.d ?? estimate(kind, 'd', h, w, undefined);
  const size = { h, w, d };
  for (const [axis, value] of Object.entries(size)) {
    if (!(Number.isFinite(value) && value >= MIN_M && value <= MAX_M)) {
      throw new Error(`Object ${String(record.objectID)} ("${record.title}"): its ${axis} of ${String(value)} m is outside ${String(MIN_M)}..${String(MAX_M)} m; check the record's measurements and correct it in the pick.`);
    }
  }
  const pedestalAxes = namedElement(record.measurements, /\bpedestal\b/i);
  const framedAxes = namedElement(record.measurements, /\bframed?\b/i);
  return {
    size,
    sizeFrom: { h: sources.h ?? 'estimate', w: sources.w ?? 'estimate', d: sources.d ?? 'estimate' },
    element,
    ...(pedestalAxes?.h !== undefined && pedestalAxes.w !== undefined && pedestalAxes.d !== undefined ? { pedestal: { h: pedestalAxes.h, w: pedestalAxes.w, d: pedestalAxes.d } } : {}),
    ...(kind === 'frame' && framedAxes?.h !== undefined && framedAxes.w !== undefined ? { framed: { h: framedAxes.h, w: framedAxes.w } } : {}),
  };
}

// --- Kinds ------------------------------------------------------------------------------------------------------------------------------

const VESSEL = /\b(vase|jar|bowl|amphora|krater|hydria|kylix|vessel|ewer|basin|urn|cup|lekythos|pitcher|bottle|dish|plate|tureen|censer|incense burner)\b/;
const BUST = /(^head\b|\bbust\b)/;
const SLAB = /\b(relief|stela|stele|plaque|panel|slab|lintel|shield|akroterion|tapestry|textile)\b/;
const BLOCK = /\b(capital|column|chest|sarcophagus|coffin|drum|canoe|chariot|mastaba)\b/;
const FIGURE = /\b(statue|statuette|figure|group|sculpture|sphinx|lion|crab|deity|armor|armour|garniture|pole)\b/;
const STATUE_NAME = /^(statue|statuette|figure|group)\b/;

/**
 * The placeholder form from the object name and classification (docs/research/collection.md, Kinds), the title only for a figure: a painting is a
 * frame; an armour for a man is a figure and a piece of one a slab; an object named a statue, statuette, figure or group is a figure, whatever it holds;
 * then vessels, busts (named a bust, or a head), reliefs and panels, blocks and figures, in that order; anything else is a block.
 */
export function kindOf(record: MetRecord): ArtKind {
  const name = record.objectName.toLowerCase();
  const text = `${name} ${record.classification.toLowerCase()}`;
  if (record.classification === 'Paintings' || /\b(painting|altarpiece|triptych|diptych)\b/.test(name)) return 'frame';
  if (/^armor\b/i.test(record.classification)) return /\b(armor|armour|garniture|rennzeug)\b/.test(name) ? 'figure' : 'slab';
  if (STATUE_NAME.test(name)) return 'figure';
  if (VESSEL.test(text)) return 'vessel';
  if (BUST.test(name)) return 'bust';
  if (SLAB.test(text)) return 'slab';
  if (BLOCK.test(text)) return 'plinth';
  if (FIGURE.test(`${text} ${record.title.toLowerCase()}`)) return 'figure';
  return 'plinth';
}

/** How the placeholder is shown: frames on a wall, slabs from 0.6 m on a wall, objects under 0.6 m in a vitrine, the rest on a plinth. */
export function displayOf(kind: ArtKind, size: Size): ArtDisplay {
  if (kind === 'frame') return 'wall';
  const largest = Math.max(size.h, size.w, size.d);
  if (largest < VITRINE_BELOW) return 'vitrine';
  return kind === 'slab' ? 'wall' : 'plinth';
}

// --- Colours ----------------------------------------------------------------------------------------------------------------------------

/** A decoded image binned by the sampler: per bin (row-major, top row first) the sums of its pixels' sRGB values and their count. */
export interface Bins {
  readonly width: number;
  readonly height: number;
  readonly n: number;
  readonly sums: readonly number[];
  readonly counts: readonly number[];
}

type Rgb = readonly [number, number, number];

export function hex([r, g, b]: Rgb): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function meanOf(bins: Bins, keep: (i: number, j: number) => boolean): { readonly rgb: Rgb; readonly pixels: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let pixels = 0;
  for (let j = 0; j < bins.n; j++) {
    for (let i = 0; i < bins.n; i++) {
      if (!keep(i, j)) continue;
      const k = j * bins.n + i;
      r += bins.sums[k * 3] ?? 0;
      g += bins.sums[k * 3 + 1] ?? 0;
      b += bins.sums[k * 3 + 2] ?? 0;
      pixels += bins.counts[k] ?? 0;
    }
  }
  return pixels === 0 ? { rgb: [0, 0, 0], pixels } : { rgb: [r / pixels, g / pixels, b / pixels], pixels };
}

function binMean(bins: Bins, i: number, j: number): Rgb | null {
  const k = j * bins.n + i;
  const count = bins.counts[k] ?? 0;
  return count === 0 ? null : [(bins.sums[k * 3] ?? 0) / count, (bins.sums[k * 3 + 1] ?? 0) / count, (bins.sums[k * 3 + 2] ?? 0) / count];
}

/** Bins of the middle of the image, where the object stands: the middle half across and three quarters up; and the border, two bins deep along the top and sides (an object often stands on, or is cut by, the bottom edge). */
const inMiddle = (n: number, i: number, j: number): boolean => i >= n / 4 && i < (3 * n) / 4 && j >= n / 8 && j < (7 * n) / 8;
const onBorder = (n: number, i: number, j: number): boolean => i < 2 || j < 2 || i >= n - 2;
/** A bin is the backdrop's when its colour lies this near (Euclidean, 0..255 a channel) to the colour of any bin of the border. */
const BACKDROP = 30;
/** The object must hold at least this share of the middle's pixels; else the whole middle stands for it. */
const OBJECT_SHARE = 0.05;
const luminance = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const distance = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The object's sRGB colour in its image (docs/research/collection.md, Colours). The backdrop is every colour the border shows, gradients and
 * shadows included; the object is the bins of the image's middle whose colour lies more than BACKDROP from each of them (the whole middle when they
 * hold under OBJECT_SHARE of it), and its colour is the mean of the brighter half of their pixels, near the colour it shows in light. A painting's or
 * a relief's colour is the whole image's mean: photographed face on, it fills its image.
 */
export function meanColour(bins: Bins, kind: ArtKind): string {
  if (kind === 'frame' || kind === 'slab') return hex(meanOf(bins, () => true).rgb);
  const n = bins.n;
  const all = Array.from({ length: n * n }, (_, k) => ({ c: binMean(bins, k % n, Math.floor(k / n)), w: bins.counts[k] ?? 0, i: k % n, j: Math.floor(k / n) })).flatMap((b) => (b.c === null || b.w === 0 ? [] : [{ ...b, c: b.c }]));
  const backdrop = all.filter((b) => onBorder(n, b.i, b.j)).map((b) => b.c);
  const middle = all.filter((b) => inMiddle(n, b.i, b.j));
  const object = middle.filter((b) => backdrop.every((c) => distance(c, b.c) > BACKDROP));
  const weight = (list: readonly { w: number }[]): number => list.reduce((sum, b) => sum + b.w, 0);
  const chosen = [...(weight(object) >= OBJECT_SHARE * weight(middle) ? object : middle)].sort((p, q) => luminance(q.c) - luminance(p.c));
  const half = weight(chosen) / 2;
  let taken = 0;
  let [r, g, bl] = [0, 0, 0];
  for (const bin of chosen) {
    if (taken >= half) break;
    const w = Math.min(bin.w, half - taken);
    r += bin.c[0] * w;
    g += bin.c[1] * w;
    bl += bin.c[2] * w;
    taken += w;
  }
  return taken === 0 ? hex(meanOf(bins, () => true).rgb) : hex([r / taken, g / taken, bl / taken]);
}

/** A frame's GRID × GRID cells, row by row from the top: each the mean of its bins' pixels. */
export function gridColours(bins: Bins): string[] {
  const per = bins.n / GRID;
  const out: string[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      out.push(hex(meanOf(bins, (i, j) => Math.floor(i / per) === col && Math.floor(j / per) === row).rgb));
    }
  }
  return out;
}

/** Fallback colours (sRGB) by the first medium word that matches, for records without a public-domain image. */
export const MEDIUM_COLOURS: readonly (readonly [RegExp, string])[] = [
  [/\b(gilt|gilded|gold)\b/i, '#b8954a'],
  [/\b(bronze|brass|copper)\b/i, '#6f5434'],
  [/\bsilver\b/i, '#b9bcbd'],
  [/\b(steel|iron)\b/i, '#7d8287'],
  [/\b(marble|alabaster)\b/i, '#ddd7cb'],
  [/\b(granite|basalt|diorite|greywacke)\b/i, '#5e5a57'],
  [/\b(limestone|sandstone)\b/i, '#c2ab86'],
  [/\b(terracotta|earthenware)\b/i, '#b06a45'],
  [/\b(porcelain|stoneware|ceramic)\b/i, '#e4e2da'],
  [/\bwood\b/i, '#76563a'],
  [/\b(oil|tempera|canvas)\b/i, '#6a5a43'],
  [/\bplaster\b/i, '#e8e3d8'],
];

/** Fallback colours by kind, when no medium word matches. */
export const KIND_COLOURS: Readonly<Record<ArtKind, string>> = { figure: '#d6d0c4', bust: '#d6d0c4', vessel: '#cfc7b6', slab: '#cbc3b4', frame: '#6a5a43', plinth: '#b9b1a3' };

export function fallbackColour(medium: string, kind: ArtKind): { readonly colour: string; readonly from: ColourSource } {
  const hit = MEDIUM_COLOURS.find(([pattern]) => pattern.test(medium));
  return hit === undefined ? { colour: KIND_COLOURS[kind], from: 'kind' } : { colour: hit[1], from: 'medium' };
}

// --- Entries ----------------------------------------------------------------------------------------------------------------------------

/** What the script knows about one object when it builds its entry. */
export interface EntryInput {
  readonly record: MetRecord;
  readonly pick: Pick;
  readonly space: SpacePicks;
  /** The day the record was fetched (YYYY-MM-DD) and the SHA-256 of the response body, hex. */
  readonly fetched: string;
  readonly sha256: string;
  /** The image sampled, when the record is public domain and has one. */
  readonly image?: { readonly url: string; readonly sha256: string; readonly bins: Bins };
}

/** Throws unless the record's GalleryNumber is one of its space's, or the pick overrides it to exactly that value. */
export function checkGallery(record: MetRecord, pick: Pick, space: SpacePicks): void {
  const gallery = record.GalleryNumber;
  if (space.galleries.includes(gallery) || pick.gallery?.value === gallery) return;
  const override = pick.gallery === undefined ? '' : ` (its pick overrides the gallery to "${pick.gallery.value}")`;
  throw new Error(
    `Object ${String(record.objectID)} ("${record.title}") has GalleryNumber "${gallery}", but space ${space.id} shows galleries ${space.galleries.join(', ')}${override}: it may have moved or gone off view; choose another object, or override the gallery in its pick with the reason.`,
  );
}

/** Whether a record's image may be sampled: public domain and with an image (docs/research/collection.md, Colours). */
export function sampleable(record: MetRecord): boolean {
  return record.isPublicDomain && record.primaryImageSmall !== '';
}

/** One catalogue entry for one picked object (docs/research/collection.md); throws, naming the object, on a gallery mismatch or an unusable size. */
export function catalogueEntry(input: EntryInput): CatalogueEntry {
  const { record, pick, space } = input;
  checkGallery(record, pick, space);
  const kind = pick.kind?.value ?? kindOf(record);
  const sized = sizeOf(record, kind, pick);
  const display = pick.display?.value ?? displayOf(kind, sized.size);
  if (input.image !== undefined && !sampleable(record)) throw new Error(`Object ${String(record.objectID)}: an image was sampled for a record that is not public domain or has none; sample only sampleable records.`);
  const fallback = fallbackColour(record.medium, kind);
  const colour = input.image === undefined ? fallback.colour : meanColour(input.image.bins, kind);
  return {
    id: record.objectID,
    space: space.id,
    accession: record.accessionNumber,
    title: record.title,
    maker: record.artistDisplayName !== '' ? record.artistDisplayName : record.culture,
    date: record.objectDate,
    medium: record.medium,
    objectName: record.objectName,
    classification: record.classification,
    department: record.department,
    gallery: record.GalleryNumber,
    creditLine: record.creditLine,
    url: record.objectURL,
    publicDomain: record.isPublicDomain,
    kind,
    kindFrom: pick.kind === undefined ? 'name' : 'pick',
    display,
    displayFrom: pick.display === undefined ? 'rule' : 'pick',
    size: sized.size,
    sizeFrom: sized.sizeFrom,
    element: sized.element,
    ...(sized.pedestal === undefined ? {} : { pedestal: sized.pedestal }),
    ...(sized.framed === undefined ? {} : { framed: sized.framed }),
    colour,
    ...(kind === 'frame' && input.image !== undefined ? { grid: gridColours(input.image.bins) } : {}),
    colourFrom: input.image === undefined ? fallback.from : 'image',
    source: { url: `${API_OBJECTS}${String(record.objectID)}`, fetched: input.fetched, metadataDate: record.metadataDate.slice(0, 10), sha256: input.sha256.slice(0, 16) },
    ...(input.image === undefined ? {} : { image: { url: input.image.url, sha256: input.image.sha256.slice(0, 16), width: input.image.bins.width, height: input.image.bins.height } }),
  };
}
